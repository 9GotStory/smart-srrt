// GS-S3: offline credential, legacy migration, throttle and session security.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=[
  'src/server/01-schema-and-db.gs',
  'src/server/02-auth-and-attachments.gs',
  'src/server/03-events-and-dashboard.gs'
];
const toSigned=bytes=>[...bytes].map(n=>n>127?n-256:n);
function harness(){
  const rows=[['UserID','Name','Email','PasswordHash','Role','Status'],
    ['u-1','Legacy Operator','owner@example.org','','Super Admin','active','','','','',new Date(),'','',null],
    ['u-2','Pending Member','pending@example.org','','Staff','pending','','','','',new Date(),'','',null]];
  const cache=new Map(),audit=[],mutations=[],locks={tries:0,releases:0};
  let noLock=false;
  const users={
    getDataRange(){return {getValues(){return rows.map(r=>[...r])}}},
    getRange(row,col){return {
      getValue(){return rows[row-1][col-1]},
      setValue(value){rows[row-1][col-1]=value;mutations.push({row,col,value})}
    }},
    appendRow(row){rows.push([...row]);mutations.push({append:true})}
  };
  const context=vm.createContext({
    console,Date,Math,JSON,
    CONFIG:{ROLES:{STAFF:'Staff'},SHEETS:{USERS:'UserAccounts',AUDIT:'AuditLogs'}},
    CacheService:{getScriptCache(){return {
      get(key){return cache.has(key)?cache.get(key).value:null},
      put(key,value,ttl){cache.set(key,{value,ttl})},
      remove(key){cache.delete(key)}
    }}},
    LockService:{getScriptLock(){return {
      tryLock(){locks.tries++;return !noLock},
      releaseLock(){locks.releases++}
    }}},
    Utilities:{
      Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},
      getUuid:()=>crypto.randomUUID(),
      newBlob(input){return {getBytes(){return toSigned(Buffer.from(String(input),'utf8'))}}},
      computeDigest(_alg,input){return toSigned(crypto.createHash('sha256').update(String(input),'utf8').digest())},
      computeHmacSha256Signature(input,key){
        const toBuf=bytes=>Buffer.from(bytes.map(x=>x&255));
        return toSigned(crypto.createHmac('sha256',toBuf(key)).update(toBuf(input)).digest());
      }
    },
    getSheet_(name){if(name==='UserAccounts')return users;throw Error('Unexpected Sheet '+name)},
    getSettingsMap_:()=>({ALLOW_SELF_REGISTER:'true'}),
    // Match the actual GS-S2 writeAudit_ sink: actor email and role only.
    // Caller user objects contain PasswordHash but are never serialized in AuditLogs.
    writeAudit_(actor,action,sheet,id,before,after){
      audit.push({actorEmail:actor.email,actorRole:actor.role,action,sheet,id,before,after});
    }
  });
  server.forEach(f=>new vm.Script(source(f),{filename:f}).runInContext(context,{timeout:2000}));
  // Top-level GAS function declarations supersede preseeded VM stubs. Rebind
  // the test-only sheet/settings boundaries AFTER evaluating all source parts.
  context.getSheet_=name=>{if(name==='UserAccounts')return users;throw Error('Unexpected Sheet '+name)};
  context.getSettingsMap_=()=>({ALLOW_SELF_REGISTER:'true'});
  const run=expr=>vm.runInContext(expr,context,{timeout:12000});
  run("PASSWORD_KDF_ROUNDS_=12000");
  rows[1][3]=run("legacyPasswordHash_('LegacyPassword2026!')");
  rows[2][3]=run("legacyPasswordHash_('PendingPassword2026!')");
  return {context,run,rows,cache,audit,mutations,locks,setLocked:x=>{noLock=x}};
}

test('GS-S3 salted PBKDF2 verifier differs per account and rejects bad/corrupt forms',()=>{
  const s=harness();
  const a=s.run("hashPassword_('StrongRandom2026!')"),b=s.run("hashPassword_('StrongRandom2026!')");
  assert.match(a,/^pbkdf2-sha256\$12000\$[0-9a-f]{64}\$[0-9a-f]{64}$/);
  assert.notEqual(a,b,'salt must vary for identical passwords');
  s.context.__stored=a;
  assert.equal(s.run("verifyPassword_('StrongRandom2026!',__stored).ok"),true);
  assert.equal(s.run("verifyPassword_('incorrect',__stored).ok"),false);
  for(const malformed of ["invalid","pbkdf2-sha256$999999$"+'1'.repeat(64)+"$"+'2'.repeat(64),
    "pbkdf2-sha256$1$"+'1'.repeat(64)+"$"+'2'.repeat(64)]){
    s.context.__bad=malformed;
    assert.equal(s.run("verifyPassword_('StrongRandom2026!',__bad).ok"),false);
  }
});

test('GS-S3 legacy SHA256 user migrates only on verified successful login',()=>{
  const s=harness(),before=s.rows[1][3];
  assert.match(before,/^[0-9a-f]{64}$/);
  const bad=s.run("login({email:'owner@example.org',password:'incorrect'})");
  assert.equal(bad.ok,false);
  assert.equal(s.rows[1][3],before,'bad password cannot migrate or change a row');
  const result=s.run("login({email:'OWNER@Example.org',password:'LegacyPassword2026!'})");
  assert.equal(result.ok,true);
  assert.equal(result.user.role,'Super Admin');
  assert.match(s.rows[1][3],/^pbkdf2-sha256\$12000\$/);
  assert.equal(s.run("getUserByToken_("+JSON.stringify(result.token)+").userId"),'u-1');
  assert.equal(s.audit.length,1,'no audit for password attempts or migration plaintext');
  assert.doesNotMatch(JSON.stringify(s.audit),/LegacyPassword2026!|pbkdf2-sha256|[a-f0-9]{64}/);
  assert.equal(s.run("verifyPassword_('LegacyPassword2026!',"+JSON.stringify(s.rows[1][3])+").ok"),true);
});

test('GS-S3 correct password is rate-limited after five failures without account enumeration',()=>{
  const s=harness();
  for(let i=0;i<5;i++){
    const email=i%2?'owner@example.org':'owner@example.org';
    assert.equal(s.run("login({email:'"+email+"',password:'invalid'})").ok,false);
  }
  const denied=s.run("login({email:'owner@example.org',password:'LegacyPassword2026!'})");
  assert.equal(denied.ok,false);
  assert.match(denied.message,/หลายครั้งเกินไป/);
  assert.match(s.rows[1][3],/^[0-9a-f]{64}$/,'lockout must not alter verifier');
  const entries=[...s.cache.values()].filter(v=>v.ttl===900);
  assert.ok(entries.length>=1&&entries.every(v=>Number(v.value)<=5));
  assert.equal(s.run("login({email:'unknown@example.org',password:'invalid'}).message"),
    'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  assert.equal(s.run("login({email:'owner@example.org',password:'invalid'}).ok"),false);
});

test('GS-S3 pending accounts cannot mint sessions or silently upgrade legacy hashes',()=>{
  const s=harness(),before=s.rows[2][3];
  const result=s.run("login({email:'pending@example.org',password:'PendingPassword2026!'})");
  assert.equal(result.ok,false);
  assert.equal(s.rows[2][3],before);
  assert.equal([...s.cache.keys()].some(key=>key.startsWith('srrt_session_')),false);
});

test('GS-S3 session binds user ID and current hash; reset, disable, fake and old token deny',()=>{
  const s=harness();
  const logged=s.run("login({email:'owner@example.org',password:'LegacyPassword2026!'})");
  assert.ok(logged.ok);
  const token=logged.token;
  assert.equal(s.run("getUserByToken_("+JSON.stringify(token)+").userId"),'u-1');
  s.cache.set('srrt_session_'+crypto.randomUUID()+'.'+crypto.randomUUID(),{value:'owner@example.org',ttl:21600});
  assert.equal(s.run("getUserByToken_('attacker-controlled')"),null);
  s.rows[1][3]=s.run("hashPassword_('NewPasswordFromReset2026!')");
  assert.equal(s.run("getUserByToken_("+JSON.stringify(token)+")"),null,
    'credential change revokes previous session without cache key enumeration');
  const newLogin=s.run("login({email:'owner@example.org',password:'NewPasswordFromReset2026!'})");
  assert.equal(newLogin.ok,true);
  s.rows[1][5]='disabled';
  assert.equal(s.run("getUserByToken_("+JSON.stringify(newLogin.token)+")"),null);
});

test('GS-S3 new registration and administrator password changes enforce stronger policy',()=>{
  const s=harness();
  const weak=()=>s.run("registerUser({name:'New Staff',email:'new@example.org',password:'short'})");
  assert.throws(weak,/12-128/);
  assert.equal(s.rows.length,3);
  const registered=s.run("registerUser({name:'New Staff',email:'new@example.org',password:'StrongRegistration2026!'})");
  assert.match(registered,/สมัครใช้งานเรียบร้อย/);
  assert.equal(s.rows.length,4);
  assert.match(s.rows[3][3],/^pbkdf2-sha256\$12000\$/);
  assert.equal(s.rows[3][5],'pending');
  // Existing admin update still requires role authorization; synthetic direct validator.
  assert.throws(()=>s.run("validateNewPassword_('too-short')"),/12-128/);
  assert.equal(s.run("validateNewPassword_('StrongAdminReset2026!')"),undefined);
});

test('GS-S3 blocked migration on concurrent password change never overwrites newer hash',()=>{
  const s=harness();
  // Simulate another operator writing a different credential after verification,
  // before compare-and-swap checks the sheet row.
  s.context.__user=s.run("findUserByEmail_('owner@example.org')");
  s.rows[1][3]=s.run("hashPassword_('ConcurrentReset2026!')");
  const before=s.rows[1][3];
  assert.equal(s.run("upgradeLegacyPassword_(__user,'LegacyPassword2026!')"),false);
  assert.equal(s.rows[1][3],before);
});

test('GS-S3 login throttling fails closed if script lock unavailable',()=>{
  const s=harness();
  s.setLocked(true);
  assert.throws(()=>s.run("login({email:'owner@example.org',password:'wrong'})"),/ไม่พร้อมใช้งาน/);
  assert.equal(s.rows[1][3],s.run("legacyPasswordHash_('LegacyPassword2026!')"));
  assert.equal(s.locks.releases,0,'no release of unacquired lock');
});

test('GS-S3 empty/oversize login input cannot create sessions or scan users',()=>{
  const s=harness();
  assert.equal(s.run("login({email:'',password:''}).ok"),false);
  assert.equal(s.run("login({email:'user@example.org',password:'x'.repeat(129)}).ok"),false);
  assert.equal(s.cache.size,0);
});
