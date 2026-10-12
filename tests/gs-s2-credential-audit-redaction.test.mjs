// GS-S2: security regression tests for credential-safe AuditLogs payloads.
// Runs entirely in Node vm with inert Sheets/Google service stubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const events=file('src/server/03-events-and-dashboard.gs');
const audit=file('src/server/04-admin-and-audit.gs');
const initialRow=[
  'user-1','Original User','user@example.org','LEGACY_DIGEST_DO_NOT_LOG',
  'Staff','active','Office','Tambon','District','Phrae','created','approver',
  'approved','lastLogin'
];

function sandbox(){
  const users=[['UserID','Name','Email','PasswordHash','Role','Status'],[...initialRow]];
  const written=[],actions=[];
  const userSheet={
    getDataRange(){return {getValues(){return users.map(row=>[...row]);}};},
    getRange(row,col){
      return {setValue(value){users[row-1][col-1]=value;actions.push({row,col});}};
    }
  };
  const auditSheet={appendRow(row){written.push(row)}};
  const state=vm.createContext({
    console,
    CONFIG:{SHEETS:{USERS:'UserAccounts',AUDIT:'AuditLogs'}},
    requireAuth_(_token,action){assert.equal(action,'users');return {email:'admin@example.org',role:'Super Admin'};},
    getSheet_(name){if(name==='UserAccounts')return userSheet;if(name==='AuditLogs')return auditSheet;throw Error('Unexpected sheet: '+name);},
    hashPassword_(secret){return 'HASH:'+secret;},
    Utilities:{getUuid(){return 'audit-id-1';}}
  });
  new vm.Script(events,{filename:'03-events-and-dashboard.gs'}).runInContext(state);
  new vm.Script(audit,{filename:'04-admin-and-audit.gs'}).runInContext(state);
  const run=(expression)=>vm.runInContext(expression,state,{timeout:1500});
  return {run,users,written,actions,state};
}

test('GS-S2 UPDATE_USER audit excludes plaintext newPassword and old/stored hash',()=>{
  const {run,users,written}=sandbox();
  run("updateUser('admin-session','user-1',{newPassword:'S3cret!new-password-sentinel',role:'Admin',status:'active',org:'New Office'})");
  assert.equal(written.length,1,'one user-update audit row');
  assert.equal(users[1][3],'HASH:S3cret!new-password-sentinel',
    'actual user password update must retain original business behavior');
  assert.equal(users[1][4],'Admin');
  const row=written[0];
  assert.equal(row[3],'UPDATE_USER');
  assert.equal(row[4],'UserAccounts');
  assert.equal(row[5],'user-1');
  const text=JSON.stringify(row);
  for(const forbidden of ['S3cret!new-password-sentinel','LEGACY_DIGEST_DO_NOT_LOG','HASH:S3cret!new-password-sentinel'])
    assert.equal(text.includes(forbidden),false,'credential escaped to AuditLogs: '+forbidden);
  assert.deepEqual(JSON.parse(row[6]),{role:'Staff',status:'active'});
  assert.deepEqual(JSON.parse(row[7]),{
    changedFields:['role','status','org'],role:'Admin',status:'active',passwordChanged:true
  });
});

test('GS-S2 UPDATE_USER without password preserves safe change summary and role context',()=>{
  const {run,written,users}=sandbox();
  run("updateUser('admin-session','user-1',{name:'New Name',tambon:'New Tambon'})");
  assert.equal(users[1][3],'LEGACY_DIGEST_DO_NOT_LOG');
  assert.equal(users[1][1],'New Name');
  assert.equal(written.length,1);
  assert.deepEqual(JSON.parse(written[0][6]),{role:'Staff',status:'active'});
  assert.deepEqual(JSON.parse(written[0][7]),{
    changedFields:['name','tambon'],role:'Staff',status:'active',passwordChanged:false
  });
  assert.doesNotMatch(JSON.stringify(written),/LEGACY_DIGEST_DO_NOT_LOG/);
});

test('GS-S2 audit sink recursively redacts nested and serialized credential keys',()=>{
  const {run,written}=sandbox();
  run("writeAudit_({email:'admin@example.org',role:'Admin'},'TEST','SystemSettings','test-id',JSON.stringify({apiKey:'CANARY_API_123',nested:{password:'CANARY_PASSWORD_456',sessionToken:'CANARY_SESSION_789',safe:'ok'},array:[{authorization:'Bearer CANARY_BEARER_012'}]}),JSON.stringify({operation:'updated',values:{private_key:'CANARY_PRIVATE_321',log:'password=CANARY_TEXT_654&note=ok'}}))");
  assert.equal(written.length,1);
  const text=JSON.stringify(written[0]);
  for(const v of ['CANARY_API_123','CANARY_PASSWORD_456','CANARY_SESSION_789',
    'CANARY_BEARER_012','CANARY_PRIVATE_321','CANARY_TEXT_654'])
    assert.equal(text.includes(v),false,'structured secret leaked: '+v);
  const before=JSON.parse(written[0][6]),after=JSON.parse(written[0][7]);
  assert.equal(before.apiKey,'[REDACTED]');
  assert.equal(before.nested.safe,'ok');
  assert.equal(before.nested.password,'[REDACTED]');
  assert.equal(before.array[0].authorization,'[REDACTED]');
  assert.equal(after.values.private_key,'[REDACTED]');
  assert.match(after.values.log,/password=\[REDACTED\]/);
});

test('GS-S2 legacy UserAccounts row and raw authorization text cannot reach audit',()=>{
  const {run,written}=sandbox();
  run("writeAudit_({email:'owner@example.org',role:'Manager'},'UPDATE_USER','UserAccounts','user-1',JSON.stringify(['id','name','email','LEGACY_ROW_HASH','Staff','active']),'Authorization: Bearer LIVE_TOKEN_XYZ and api_key=SECRET_KEY_XYZ')");
  assert.equal(written.length,1);
  assert.equal(JSON.parse(written[0][6])[3],'[REDACTED]');
  assert.equal(JSON.stringify(written).includes('LEGACY_ROW_HASH'),false);
  assert.equal(JSON.stringify(written).includes('LIVE_TOKEN_XYZ'),false);
  assert.equal(JSON.stringify(written).includes('SECRET_KEY_XYZ'),false);
});

test('GS-S2 preserves normal non-secret Event audit metadata and stable record columns',()=>{
  const {run,written}=sandbox();
  run("writeAudit_({email:'staff@example.org',role:'Admin'},'CLOSE_EVENT','MainData','event-id',JSON.stringify({recordStatus:'active'}),JSON.stringify({recordStatus:'closed',reason:'completed'}))");
  assert.equal(written.length,1);
  assert.equal(written[0].length,10);
  assert.equal(written[0][3],'CLOSE_EVENT');
  assert.equal(written[0][5],'event-id');
  assert.deepEqual(JSON.parse(written[0][6]),{recordStatus:'active'});
  assert.deepEqual(JSON.parse(written[0][7]),{recordStatus:'closed',reason:'completed'});
});

test('GS-S2 no fallback to unsafe raw audit payload when append fails',()=>{
  const {run,written,state}=sandbox();
  state.getSheet_=()=>({appendRow(){throw Error('simulated audit outage')}});
  run("writeAudit_({email:'admin@example.org',role:'Manager'},'UPDATE_USER','UserAccounts','user-1',JSON.stringify({password:'SENSITIVE'}),'newPassword: SENSITIVE_2')");
  assert.equal(written.length,0,'never retry unsafe payload on audit failure');
  assert.match(audit,/sanitizeAuditPayload_\(beforeValue, targetSheet\)/);
  assert.match(audit,/sanitizeAuditPayload_\(afterValue, targetSheet\)/);
  assert.doesNotMatch(events,/JSON\.stringify\(patch\)/,
    'no raw user-update patch may be persisted in audit');
});
