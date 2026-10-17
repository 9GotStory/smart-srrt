// D331 N1-C3-S1: cross-contract NEGATIVE integration. Native26 UI + unregistered
// C3-B evaluator are loaded as-is in independent Node VM contexts. Never live.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const STATUS=read('src/web/03l-client-d331-status.html');
const LAYOUT=read('src/web/02-app-layout.html');
const AUTH=read('src/web/03c-client-auth.html');
const MANIFEST=read('tools/native-sources.mjs');
const FOUNDATION=read('src/dengue/00-g1a-foundation.gs');
const CONTRACT=read('src/dengue/05-n1c3b-offline-revocation-contract.gs');
const U='11111111-1111-4111-8111-111111111111';
const NOW=Date.parse('2026-10-17T00:00:00.000Z');
const DENY={simulationOnly:true,decision:'SIMULATED_DENY',code:'D331_SYNTHETIC_DENY'};
const ALLOW={simulationOnly:true,decision:'SIMULATED_ALLOW',code:'D331_SYNTHETIC_ONLY'};
const extract=STATUS.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(extract,'actual Native26 status partial must contain its script');

function engine(){
  const context=vm.createContext({});
  vm.runInContext([
    read('src/server/00-bootstrap.gs'),FOUNDATION,
    read('src/dengue/03-n1b1-trusted-event-contract.gs'),
    read('src/dengue/04-n1b2b-mock-trusted-adapter.gs'),CONTRACT
  ].join('\n'),context,{filename:'c3-s1-synthetic-contracts.gs',timeout:2000});
  return context;
}
function workspace(){
  const context=vm.createContext({});
  new vm.Script(extract[1],{filename:'c3-s1-native26-status.js'})
    .runInContext(context,{timeout:1000});
  return context.d331N1cStatusWorkspace_;
}
function eventRow(){
  const r=Array.from({length:39},()=>'');
  r[5]='SYNTHETIC_DENGUE_ONLY';
  r[9]='002';r[10]='ตำบลจำลอง';r[11]='อำเภอจำลอง';r[12]='จังหวัดจำลอง';
  r[28]='หมู่บ้านจำลอง';r[29]='SYN-001';
  r[30]=U;r[31]=3;r[32]='active';r[38]='synthetic-user';
  return r;
}
const areaRow=()=>['synthetic-area','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
  '002','หมู่บ้านจำลอง','SYN-001',true,'',''];
function snapshot(api){
  const s={
    syntheticOnly:true,simulatedFeatureEnabled:true,nowMs:NOW,
    latestRequestId:8,lastConsumedRequestId:7,
    currentSessionRevision:3,currentPolicyRevision:4,currentGrantRevision:5,
    session:{userId:'synthetic-user',status:'active',revision:3,authEpoch:6},
    policy:{revision:4,approved:true,revoked:false,validFromMs:NOW-20000,
      expiresAtMs:NOW+20000,labels:['SYNTHETIC_DENGUE_ONLY']},
    grants:[{grantId:'SYNTHETIC-GRANT-01',userId:'synthetic-user',
      revision:5,approved:true,revoked:false,validFromMs:NOW-20000,
      expiresAtMs:NOW+20000,capabilities:['dengue.case.read'],
      allowedAreaIds:['synthetic-area'],allowedEventIds:[U],
      policyRevision:4,sessionRevision:3}],
    revokedGrantIds:[],
    mainHeaders:Array.from(api.D331_N1B2B_MAIN_HEADERS_),
    areaHeaders:Array.from(api.D331_N1B2B_AREA_HEADERS_),
    mainRows:[eventRow()],areaRows:[areaRow()]
  };
  const q={eventId:U,operation:'dengue.case.read',requestId:8,authEpoch:6,
    sessionRevision:3,policyRevision:4,grantRevision:5};
  return {s,q};
}
const plain=x=>JSON.parse(JSON.stringify(x));
const evaluate=(api,f)=>plain(api.d331N1c3bEvaluateOffline_(f.s,f.q));
function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject};
}
class FakeNode{
  constructor(tag,doc){
    this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes=new Map();
    this.textContent='';this.disabled=false;this.className='';
  }
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key);}
}
const doc={createElement(tag){return new FakeNode(tag,doc);}};
const descendants=node=>[node,...node.children.flatMap(descendants)];
const buttons=node=>descendants(node).filter(x=>x.tagName==='button');
const status=node=>descendants(node).filter(x=>x.getAttribute('role')==='status')
  .map(x=>x.textContent).join(' ');
const denyReply=(requestId,state='POLICY_HOLD',now=Date.now())=>({
  version:1,requestId,state,issuedAtMs:now-1000,expiresAtMs:now+1000
});
function fixture(ui){
  const root=new FakeNode('section',doc),work=[],leases=[],invalidated=[],finished=[];
  let authEpoch=3,token='SYNTHETIC_ONLY_SESSION',user={role:'Manager'};
  const adapters={
    readSession(){return {authEpoch,token,user};},
    requestMock(requestId){
      const pending=deferred();work.push({requestId,...pending});
      return pending.promise;
    },
    beginAction(key,options){const lease={key,options};leases.push(lease);return lease;},
    finishAction(lease,state,message,options){
      finished.push({lease,state,message,enabled:options.canEnable()});
    },
    invalidateAction(lease){invalidated.push(lease);}
  };
  const controller=ui.createOfflineController(root,adapters);
  return {root,controller,work,leases,invalidated,finished,
    setToken(x){token=x;},setUser(x){user=x;},setRole(x){user.role=x;},
    incEpoch(){authEpoch++;}};
}
function neverEnabled(f){
  assert.equal(f.root.getAttribute('aria-busy'),'false');
  assert.deepEqual(buttons(f.root).map(b=>b.disabled),[true,true]);
  assert.deepEqual(buttons(f.root).map(b=>b.getAttribute('aria-disabled')),['true','true']);
  assert.ok(f.finished.every(x=>x.enabled===false));
  assert.doesNotMatch(status(f.root),/SYNTHETIC-GRANT|PRIVATE_SENTINEL|synthetic-user|SYNTHETIC_ONLY_SESSION/);
}
function finish(f){neverEnabled(f);f.controller.dispose();}
test('S1 source boundaries: use real Native26 and unregistered C3-B, no mount/RPC',()=>{
  assert.match(FOUNDATION,/var D331_G1A_ENABLED = false;/);
  assert.match(MANIFEST,/03l-client-d331-status\.html/);
  assert.doesNotMatch(MANIFEST,/05-n1c3b-offline-revocation-contract|03-n1b1-trusted-event|04-n1b2b-mock/);
  assert.doesNotMatch(LAYOUT,/page-dengue|data-page="dengue"/);
  assert.doesNotMatch(AUTH,/\bgetD331Readiness\b|\bgetD331Grants\b/);
  assert.doesNotMatch(STATUS,/\b(?:google\.script\.run|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest)\b/);
  assert.doesNotMatch(CONTRACT,/\b(?:SpreadsheetApp|PropertiesService|DriveApp|UrlFetchApp|LockService|google\.script\.run|fetch\s*\(|XMLHttpRequest)\b/);
  const ui=workspace(),api=engine(),f=fixture(ui);
  assert.equal(typeof api.d331N1c3bEvaluateOffline_,'function');
  assert.equal(f.work.length,0,'no automatic request');
  assert.equal(buttons(f.root).length,0,'never auto-mount UI');
  f.controller.dispose();
});
test('S1 actual synthetic ALLOW is not a C2C-B readiness envelope or bearer right',async()=>{
  const ui=workspace(),api=engine(),sample=snapshot(api),first=evaluate(api,sample);
  assert.deepEqual(first,ALLOW,'actual C3-B implementation must take allow branch');
  assert.equal(ui.closedReadiness(first,1,Date.now()),'ERROR');
  const f=fixture(ui),pending=f.controller.check();
  assert.equal(f.work.length,1);
  f.work[0].resolve(first); // direct cross-contract feed, never an approved adapter
  assert.equal(await pending,'ERROR');
  assert.match(status(f.root),/ไม่สามารถตรวจสอบ/);
  assert.equal(f.finished.length,1);
  finish(f);
});
test('S1 synthetic success cannot be promoted by forged READY, origin, role or claims',async()=>{
  const ui=workspace(),api=engine(),base=evaluate(api,snapshot(api));
  assert.deepEqual(base,ALLOW);
  const now=Date.now();
  const attacks=[
    {...denyReply(1,'READY',now)},
    {...denyReply(1,'ENABLED',now)},
    {...denyReply(1,'LOADING',now)},
    {...denyReply(1,'NO_GRANT',now),simulationOnly:true,decision:base.decision},
    {...denyReply(1,'POLICY_HOLD',now),origin:'server',signed:true},
    {...denyReply(1,'NO_GRANT',now),role:'Super Admin',allowedAreaIds:['*']},
    {...denyReply(1,'NO_GRANT',now),canRead:true,patientName:'PRIVATE_SENTINEL'},
    {...base,state:'READY',version:1,requestId:1,
      issuedAtMs:now-1000,expiresAtMs:now+1000}
  ];
  for(const forged of attacks){
    const f=fixture(ui),pending=f.controller.check();
    f.work[0].resolve(forged);
    assert.equal(await pending,'ERROR');
    assert.equal(f.finished.length,1);
    finish(f);
  }
  const f=snapshot(api);
  f.s.origin='server';
  assert.deepEqual(evaluate(api,f),DENY,'forged provider provenance rejected at C3-B');
});
test('S1 actual mock DENY may render only fixed deny-only UI, never enable',async()=>{
  const ui=workspace(),api=engine(),sample=snapshot(api);
  sample.s.revokedGrantIds=['SYNTHETIC-GRANT-01'];
  assert.deepEqual(evaluate(api,sample),DENY);
  for(const state of ['OFF','AUTH_REQUIRED','POLICY_HOLD','NO_GRANT','ERROR']){
    const f=fixture(ui),pending=f.controller.check();
    // A synthetic test driver MAY choose a DENY-only envelope, not authorize.
    f.work[0].resolve(denyReply(1,state));
    assert.equal(await pending,state);
    assert.equal(f.finished.length,1);
    finish(f);
  }
});
test('S1 grant revoke/policy drift after allow rejects next evaluation and old reply',async()=>{
  const ui=workspace(),api=engine(),sample=snapshot(api);
  const initial=evaluate(api,sample);
  assert.deepEqual(initial,ALLOW);
  const f=fixture(ui),pending=f.controller.check();
  sample.s.revokedGrantIds.push('SYNTHETIC-GRANT-01');
  assert.deepEqual(evaluate(api,sample),DENY,'must re-evaluate at operation time');
  f.work[0].resolve(initial); // an older result cannot satisfy readiness contract
  assert.equal(await pending,'ERROR');
  neverEnabled(f);
  sample.s.revokedGrantIds=[];sample.s.currentPolicyRevision=5;
  assert.deepEqual(evaluate(api,sample),DENY,'stale policy does not reauthorize');
  const second=f.controller.check();
  assert.equal(f.work.length,2);
  f.work[1].resolve(denyReply(2,'POLICY_HOLD'));
  assert.equal(await second,'POLICY_HOLD');
  finish(f);
});
test('S1 logout/session invalidation discards in-flight simulated success',async()=>{
  const ui=workspace(),api=engine(),sample=snapshot(api);
  const first=evaluate(api,sample);
  assert.deepEqual(first,ALLOW);
  const f=fixture(ui),pending=f.controller.check();
  ui.invalidateSession(); // actual Native26 logout hook
  assert.equal(f.root.getAttribute('aria-busy'),'false');
  assert.equal(f.invalidated.length,1);
  sample.s.grants[0].revoked=true;
  assert.deepEqual(evaluate(api,sample),DENY);
  f.work[0].resolve(first);
  assert.equal(await pending,false,'stale callback cannot even repaint an ERROR');
  assert.equal(f.finished.length,0);
  assert.match(status(f.root),/ยังไม่เปิดใช้งาน/);
  finish(f);
});
test('S1 token, user, role and auth-epoch swaps reject old mock callback',async()=>{
  const api=engine(),sample=snapshot(api),previous=evaluate(api,sample);
  assert.deepEqual(previous,ALLOW);
  for(const mutate of [
    f=>f.setToken('OTHER_SYNTHETIC_SESSION'),
    f=>f.setUser({role:'Manager'}),
    f=>f.setRole('Super Admin'),
    f=>f.incEpoch(),
    f=>f.setUser(null)
  ]){
    const ui=workspace(),f=fixture(ui),pending=f.controller.check();
    mutate(f);
    f.work[0].resolve(previous);
    assert.equal(await pending,false);
    assert.equal(f.finished.length,0);
    assert.equal(f.invalidated.length,1);
    assert.match(status(f.root),/ยังไม่เปิดใช้งาน/);
    finish(f);
  }
});
test('S1 duplicate, replay, expiry, excessive TTL and private fields all deny',async()=>{
  const ui=workspace(),api=engine(),sample=snapshot(api);
  assert.deepEqual(evaluate(api,sample),ALLOW);
  const now=Date.now();
  const rejected=[
    {...denyReply(2,'NO_GRANT',now)}, // request 1, stale/out of order
    {...denyReply(1,'NO_GRANT',now),expiresAtMs:now},
    {...denyReply(1,'NO_GRANT',now),expiresAtMs:now+65000},
    {...denyReply(1,'NO_GRANT',now),patientName:'PRIVATE_SENTINEL'},
    {...denyReply(1,'NO_GRANT',now),grantRevision:5},
    {...denyReply(1,'NO_GRANT',now),approvedGrant:sample.s.grants[0]},
    {...denyReply(1,'NO_GRANT',now),version:2}
  ];
  for(const reply of rejected){
    const f=fixture(ui),pending=f.controller.check();
    assert.equal(await f.controller.check(),false,'no duplicate requests');
    assert.equal(f.work.length,1,'only one mock transport call');
    f.work[0].resolve(reply);
    assert.equal(await pending,'ERROR');
    finish(f);
  }
});
test('S1 failures do not echo tokens/PHI or activate controls or grant read access',async()=>{
  const ui=workspace(),api=engine(),sample=snapshot(api);
  const f=fixture(ui),pending=f.controller.check();
  const broken=evaluate(api,sample);
  assert.deepEqual(broken,ALLOW);
  f.work[0].reject(Error('PRIVATE_SENTINEL: synthetic secret'));
  assert.equal(await pending,'ERROR');
  assert.doesNotMatch(status(f.root),/PRIVATE_SENTINEL/);
  neverEnabled(f);
  assert.equal(ui.closedReadiness({...denyReply(1),userId:'synthetic-user'},1,Date.now()),'ERROR');
  assert.deepEqual(evaluate(api,{s:{...sample.s,simulatedFeatureEnabled:false},q:sample.q}),DENY);
  finish(f);
});
