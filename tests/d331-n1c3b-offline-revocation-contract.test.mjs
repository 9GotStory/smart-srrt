// D331 N1-C3-B: VM-only, synthetic revocation security tests. NO Google.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const BOOT=read('src/server/00-bootstrap.gs');
const A=read('src/dengue/00-g1a-foundation.gs');
const B=read('src/dengue/03-n1b1-trusted-event-contract.gs');
const C=read('src/dengue/04-n1b2b-mock-trusted-adapter.gs');
const D=read('src/dengue/05-n1c3b-offline-revocation-contract.gs');
const MANIFEST=read('tools/native-sources.mjs');
const U='11111111-1111-4111-8111-111111111111';
const V='22222222-2222-4222-8222-222222222222';
const NOW=Date.parse('2026-10-17T00:00:00.000Z');
function api(){
  const ctx=vm.createContext({});
  vm.runInContext(BOOT+'\n'+A+'\n'+B+'\n'+C+'\n'+D,ctx,{
    filename:'offline-synthetic-d331-n1c3b.gs',timeout:2000});
  return ctx;
}
function row(){
  const r=Array.from({length:39},()=>'');
  r[5]='SYNTHETIC_DENGUE_ONLY';
  r[9]='002';r[10]='ตำบลจำลอง';r[11]='อำเภอจำลอง';r[12]='จังหวัดจำลอง';
  r[28]='หมู่บ้านจำลอง';r[29]='SYN-001';
  r[30]=U;r[31]=3;r[32]='active';r[38]='synthetic-user';
  return r;
}
function area(){
  return ['synthetic-area','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
    '002','หมู่บ้านจำลอง','SYN-001',true,'',''];
}
function sample(ctx){
  const s={
    syntheticOnly:true,simulatedFeatureEnabled:true,nowMs:NOW,
    latestRequestId:8,lastConsumedRequestId:7,
    currentSessionRevision:3,currentPolicyRevision:4,currentGrantRevision:5,
    session:{userId:'synthetic-user',status:'active',revision:3,authEpoch:6},
    policy:{revision:4,approved:true,revoked:false,
      validFromMs:NOW-20000,expiresAtMs:NOW+20000,
      labels:['SYNTHETIC_DENGUE_ONLY']},
    grants:[{grantId:'SYNTHETIC-GRANT-01',userId:'synthetic-user',
      revision:5,approved:true,revoked:false,
      validFromMs:NOW-20000,expiresAtMs:NOW+20000,
      capabilities:['dengue.case.read'],allowedAreaIds:['synthetic-area'],
      allowedEventIds:[U],policyRevision:4,sessionRevision:3}],
    revokedGrantIds:[],
    mainHeaders:Array.from(ctx.D331_N1B2B_MAIN_HEADERS_),
    areaHeaders:Array.from(ctx.D331_N1B2B_AREA_HEADERS_),
    mainRows:[row()],areaRows:[area()]
  };
  const q={eventId:U,operation:'dengue.case.read',requestId:8,
    authEpoch:6,sessionRevision:3,policyRevision:4,grantRevision:5};
  return {s,q};
}
const clone=o=>structuredClone(o);
function run(mutate=()=>{},mutateRequest=()=>{}){
  const ctx=api(),f=sample(ctx);
  mutate(f.s);mutateRequest(f.q);
  return JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(f.s,f.q)));
}
const DENY={simulationOnly:true,decision:'SIMULATED_DENY',code:'D331_SYNTHETIC_DENY'};
const ALLOW={simulationOnly:true,decision:'SIMULATED_ALLOW',code:'D331_SYNTHETIC_ONLY'};
function deny(fn,change=()=>{}){assert.deepEqual(run(fn,change),DENY);}

test('C3-B remains OFF, unregistered, non-callable, pure and three-file scoped',()=>{
  assert.match(A,/var D331_G1A_ENABLED = false;/);
  assert.doesNotMatch(MANIFEST,/05-n1c3b-offline-revocation-contract|03-n1b1-trusted-event|04-n1b2b-mock/);
  assert.doesNotMatch(D,/\b(?:SpreadsheetApp|PropertiesService|DriveApp|UrlFetchApp|CacheService|LockService|ScriptApp|getDb_|getSheet_|ensureSheet_|google\.script\.run|fetch\s*\(|XMLHttpRequest|localStorage)\b/);
  const declarations=[...D.matchAll(/\bfunction\s+(d331\w+)\s*\(/g)].map(m=>m[1]);
  assert.ok(declarations.length>=5);
  assert.ok(declarations.every(x=>x.endsWith('_')));
  assert.doesNotMatch(read('src/web/02-app-layout.html'),/page-dengue|data-page="dengue"/);
});
test('synthetic PASS is only marked metadata, never READY, bearer or patient data',()=>{
  assert.deepEqual(run(),ALLOW);
  const ctx=api(),{s,q}=sample(ctx);
  const result=ctx.d331N1c3bEvaluateOffline_(s,q);
  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.keys(result).sort().join(','),'code,decision,simulationOnly');
  assert.equal(JSON.stringify(result).includes(U),false);
  assert.equal(result.actionsEnabled,undefined);
});
test('T01 feature OFF, missing snapshot and unsupported simulation marker deny',()=>{
  deny(s=>{s.simulatedFeatureEnabled=false});
  deny(s=>{s.syntheticOnly=false});
  deny(s=>{delete s.syntheticOnly});
  deny(s=>{s.origin='server'});
  const ctx=api(),{q}=sample(ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(null,q))),DENY);
});
test('T04-T06 inactive/changed session, role injection or missing explicit grant deny',()=>{
  deny(s=>{s.session.status='revoked'});
  deny(s=>{s.session.status='pending'});
  deny(s=>{s.session.userId='other-user'});
  deny(s=>{s.session.role='Super Admin'});
  deny(s=>{s.grants=[]});
  deny(s=>{s.grants[0].userId='other-user'});
  deny(s=>{s.grants[0].capabilities=['view','edit']});
  deny(s=>{s.grants[0].capabilities=['dengue.case.write']});
  deny(s=>{s.grants[0].capabilities=['dengue.case.*']});
  deny(s=>{s.session.revision=4});
  deny(s=>{},q=>{q.userId='synthetic-user'});
  deny(s=>{},q=>{q.approvedGrant=true});
  deny(s=>{},q=>{q.role='Super Admin'});
});
test('T07-T09 expired/revoked/ambiguous grants and stale version or policy deny',()=>{
  deny(s=>{s.grants[0].approved=false});
  deny(s=>{s.grants[0].revoked=true});
  deny(s=>{s.revokedGrantIds=['SYNTHETIC-GRANT-01']});
  deny(s=>{s.grants[0].expiresAtMs=NOW});
  deny(s=>{s.grants[0].validFromMs=NOW+1});
  deny(s=>{s.grants[0].revision=4});
  deny(s=>{s.currentGrantRevision=6});
  deny(s=>{s.grants.push({...s.grants[0]})});
  deny(s=>{s.grants[0].policyRevision=3});
  deny(s=>{s.grants[0].sessionRevision=2});
  deny(s=>{s.policy.approved=false});
  deny(s=>{s.policy.revoked=true});
  deny(s=>{s.policy.revision=3});
  deny(s=>{s.currentPolicyRevision=5});
  deny(s=>{s.policy.expiresAtMs=NOW});
  deny(s=>{},q=>{q.policyRevision=3});
  deny(s=>{},q=>{q.grantRevision=4});
});
test('T08/T20 revoke after earlier synthetic readiness -> next operation denied',()=>{
  const ctx=api(),{s,q}=sample(ctx);
  const first=JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,q)));
  assert.deepEqual(first,ALLOW);
  s.revokedGrantIds=['SYNTHETIC-GRANT-01'];
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,q))),DENY);
  s.revokedGrantIds=[];s.grants[0].revoked=true;
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,q))),DENY);
  // Never treat a previous simulated success as a fresh authorization.
  q.readiness=first;
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,q))),DENY);
});
test('T10/T29 exact Area AND Event scope and absence of inheritance',()=>{
  deny(s=>{s.grants[0].allowedAreaIds=[]});
  deny(s=>{s.grants[0].allowedAreaIds=['*']});
  deny(s=>{s.grants[0].allowedAreaIds=['another-area']});
  deny(s=>{s.grants[0].allowedEventIds=[]});
  deny(s=>{s.grants[0].allowedEventIds=[V]});
  deny(s=>{s.grants[0].allowedEventIds=[U,U]});
  deny(s=>{s.grants[0].allowedEventIds=['*']});
  deny(s=>{s.mainRows[0][38]='synthetic-user';s.grants[0].allowedEventIds=[]});
  // Even a valid owner needs an explicit EventID AND AreaID grant.
});
test('T11-T13 exact headers, active Areas, duplicates, leading zeros',()=>{
  deny(s=>{s.mainHeaders[30]='DifferentEventID'});
  deny(s=>{s.areaHeaders[7]='Enabled'});
  deny(s=>{s.areaRows[0][7]='true'});
  deny(s=>{s.areaRows[0][7]=false});
  deny(s=>{s.areaRows.push(area())});
  deny(s=>{s.areaRows[0][0]='other-area'});
  deny(s=>{s.areaRows[0][4]=2});
  deny(s=>{s.areaRows[0][4]='2'});
  deny(s=>{s.areaRows[0][6]='SYN-1'});
  deny(s=>{s.areaRows[0][0]=''});
});
test('T14-T16 event uniqueness, status, owner, disease, revision fail closed',()=>{
  deny(s=>{s.mainRows=[]});
  deny(s=>{s.mainRows.push(row())});
  deny(s=>{s.mainRows[0][30]=V});
  deny(s=>{s.mainRows[0][31]='3'});
  deny(s=>{s.mainRows[0][32]='void'});
  deny(s=>{s.mainRows[0][32]='closed'});
  deny(s=>{s.mainRows[0][38]=''});
  deny(s=>{s.mainRows[0][38]='other-owner';s.grants[0].allowedEventIds=[]});
  deny(s=>{s.mainRows[0][5]='UNSIGNED_DISEASE'});
  deny(s=>{s.policy.labels=[]});
  deny(s=>{s.policy.labels=['SYNTHETIC_DENGUE_ONLY','SYNTHETIC_DENGUE_ONLY']});
  deny(s=>{s.mainRows[0]=s.mainRows[0].slice(0,-1)});
});
test('T17/T18/T24 forged READY/ENABLED/transport metadata or PHI rejects extra fields',()=>{
  deny(s=>{},q=>{q.state='READY'});
  deny(s=>{},q=>{q.state='ENABLED'});
  deny(s=>{},q=>{q.origin='server'});
  deny(s=>{},q=>{q.simulationOnly=true});
  deny(s=>{},q=>{q.allowedAreaIds=['synthetic-area']});
  deny(s=>{},q=>{q.patientName='PRIVATE_SENTINEL'});
  deny(s=>{s.signed=true});
  deny(s=>{s.providerKind='TRUSTED_SERVER'});
  deny(s=>{s.grants[0].signed=true});
  deny(s=>{s.policy.signed=true});
});
test('T19 stale requestId, replay, expired auth epoch or session switch deny',()=>{
  deny(s=>{},q=>{q.requestId=7});
  deny(s=>{s.lastConsumedRequestId=8});
  deny(s=>{s.latestRequestId=9});
  deny(s=>{},q=>{q.authEpoch=5});
  deny(s=>{s.session.authEpoch=7});
  deny(s=>{},q=>{q.sessionRevision=2});
  deny(s=>{s.currentSessionRevision=4});
  deny(s=>{s.session.userId='switched-user'});
});
test('T21/T28 malformed accessors, cycles and PHI exceptions never leak',()=>{
  const ctx=api(),{s,q}=sample(ctx);
  Object.defineProperty(s,'session',{get(){throw Error('PRIVATE_PATIENT_123');},enumerable:true});
  const result=JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,q));
  assert.deepEqual(JSON.parse(result),DENY);
  assert.doesNotMatch(result,/PRIVATE_PATIENT|synthetic-user|SYNTHETIC-GRANT|11111111/);
  const c=sample(ctx);c.s.grants[0].capabilities.push(c.s);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(c.s,c.q))),DENY);
  const p=sample(ctx);p.s.session.__proto__={isAdmin:true};
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(p.s,p.q))),ALLOW,
    'prototype-only untrusted claims are ignored; no role rights may be acquired');
  const q2=sample(ctx);Object.defineProperty(q2.s.grants[0],'__proto__',{
    value:{approved:true},enumerable:true});
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(q2.s,q2.q))),DENY);
});
test('T22-T23 write is unconditionally denied (no lock/ledger or DDL)',()=>{
  deny(s=>{},q=>{q.operation='dengue.case.write'});
  deny(s=>{s.grants[0].capabilities.push('dengue.case.write')},
    q=>{q.operation='dengue.case.write';q.expectedRevision=3});
  deny(s=>{},q=>{q.operation='dengue.case.delete'});
});
test('T30 stale grant revisions and revoke tombstones prevent rollback simulation',()=>{
  deny(s=>{s.currentGrantRevision=6});
  deny(s=>{s.revokedGrantIds=['SYNTHETIC-GRANT-01'];s.grants[0].revision=6;
    s.currentGrantRevision=6;});
});
test('Mutation after one evaluation does not change frozen returned outcome',()=>{
  const ctx=api(),{s,q}=sample(ctx);
  const first=ctx.d331N1c3bEvaluateOffline_(s,q);
  s.grants[0].revoked=true;s.mainRows[0][5]='PRIVATE_SENTINEL';
  assert.equal(first.decision,'SIMULATED_ALLOW');
  assert.equal(Object.isFrozen(first),true);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,q))),DENY);
});
