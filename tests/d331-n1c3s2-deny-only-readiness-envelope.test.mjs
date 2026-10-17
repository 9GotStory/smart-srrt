// D331 N1-C3-S2 — actual offline GS composer vs actual Native26 client contract.
// Node-only fixtures, not an Apps Script test deployment, RPC or trusted issuer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const SOURCE=read('src/dengue/06-n1c3s2-deny-only-readiness-envelope.gs');
const PARTIAL=read('src/web/03l-client-d331-status.html');
const MANIFEST=read('tools/native-sources.mjs');
const LAYOUT=read('src/web/02-app-layout.html');
const FOUNDATION=read('src/dengue/00-g1a-foundation.gs');
const MOCK=read('src/dengue/05-n1c3b-offline-revocation-contract.gs');
const STATUS_SCRIPT=PARTIAL.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(STATUS_SCRIPT,'real Native26 readiness implementation missing');
const ALLOW={simulationOnly:true,decision:'SIMULATED_ALLOW',code:'D331_SYNTHETIC_ONLY'};
const DENY={simulationOnly:true,decision:'SIMULATED_DENY',code:'D331_SYNTHETIC_DENY'};
const U='11111111-1111-4111-8111-111111111111';
const NOW=Date.parse('2026-10-17T00:00:00.000Z');

function composer(){
  const ctx=vm.createContext({});
  new vm.Script(SOURCE,{filename:'unregistered-s2-offline-only.gs'})
    .runInContext(ctx,{timeout:1000});
  assert.equal(typeof ctx.d331N1c3s2ComposeDenyOnly_,'function');
  return ctx;
}
function client(){
  const ctx=vm.createContext({});
  new vm.Script(STATUS_SCRIPT[1],{filename:'existing-native26-status.js'})
    .runInContext(ctx,{timeout:1000});
  return ctx.d331N1cStatusWorkspace_;
}
function c3b(){
  const ctx=vm.createContext({});
  vm.runInContext([
    read('src/server/00-bootstrap.gs'),FOUNDATION,
    read('src/dengue/03-n1b1-trusted-event-contract.gs'),
    read('src/dengue/04-n1b2b-mock-trusted-adapter.gs'),MOCK
  ].join('\n'),ctx,{filename:'unregistered-c3b-synthetic-only.gs',timeout:2000});
  return ctx;
}
function syntheticC3bAllow(ctx){
  const row=Array.from({length:39},()=>'');
  row[5]='SYNTHETIC_DENGUE_ONLY';
  row[9]='002';row[10]='ตำบลจำลอง';row[11]='อำเภอจำลอง';row[12]='จังหวัดจำลอง';
  row[28]='หมู่บ้านจำลอง';row[29]='SYN-001';
  row[30]=U;row[31]=3;row[32]='active';row[38]='synthetic-user';
  const s={
    syntheticOnly:true,simulatedFeatureEnabled:true,nowMs:NOW,
    latestRequestId:8,lastConsumedRequestId:7,
    currentSessionRevision:3,currentPolicyRevision:4,currentGrantRevision:5,
    session:{userId:'synthetic-user',status:'active',revision:3,authEpoch:6},
    policy:{revision:4,approved:true,revoked:false,
      validFromMs:NOW-20000,expiresAtMs:NOW+20000,labels:['SYNTHETIC_DENGUE_ONLY']},
    grants:[{grantId:'SYNTHETIC-GRANT-01',userId:'synthetic-user',
      revision:5,approved:true,revoked:false,
      validFromMs:NOW-20000,expiresAtMs:NOW+20000,
      capabilities:['dengue.case.read'],allowedAreaIds:['synthetic-area'],
      allowedEventIds:[U],policyRevision:4,sessionRevision:3}],
    revokedGrantIds:[],
    mainHeaders:Array.from(ctx.D331_N1B2B_MAIN_HEADERS_),
    areaHeaders:Array.from(ctx.D331_N1B2B_AREA_HEADERS_),
    mainRows:[row],
    areaRows:[['synthetic-area','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
      '002','หมู่บ้านจำลอง','SYN-001',true,'','']]
  };
  const request={eventId:U,operation:'dengue.case.read',requestId:8,
    authEpoch:6,sessionRevision:3,policyRevision:4,grantRevision:5};
  return JSON.parse(JSON.stringify(ctx.d331N1c3bEvaluateOffline_(s,request)));
}
const plain=x=>x===null?null:JSON.parse(JSON.stringify(x));
function valid(id=1,reason='OFF',now=Date.now()){
  return {requestId:id,nowMs:now,reason};
}
class Node{
  constructor(tag,doc){
    this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes=new Map();
    this.disabled=false;this.textContent='';this.className='';
  }
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this.attributes.set(k,String(v));}
  getAttribute(k){return this.attributes.get(k);}
}
const doc={createElement(tag){return new Node(tag,doc);}};
const walk=n=>[n,...n.children.flatMap(walk)];
const buttons=n=>walk(n).filter(x=>x.tagName==='button');
const display=n=>walk(n).filter(x=>x.getAttribute('role')==='status')
  .map(x=>x.textContent).join(' ');
function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject};
}
function controllerFixture(ui){
  const root=new Node('section',doc),work=[],done=[],cancel=[];
  let user={role:'Manager'},token='SYNTHETIC_SESSION',authEpoch=5;
  const adapters={
    readSession(){return {token,user,authEpoch};},
    requestMock(id){const item=deferred();work.push({id,...item});return item.promise;},
    beginAction(key,options){return {key,options};},
    finishAction(lease,state,message,options){
      done.push({lease,state,enabled:options.canEnable()});
    },
    invalidateAction(lease){cancel.push(lease);}
  };
  const instance=ui.createOfflineController(root,adapters);
  return {root,instance,work,done,cancel,logout(){ui.invalidateSession();},
    switchToken(){token='NEW_SYNTHETIC_SESSION';},
    switchUser(){user={role:'Manager'};},
    switchRole(){user.role='Super Admin';},
    switchEpoch(){authEpoch++;}};
}
function inactive(f){
  assert.deepEqual(buttons(f.root).map(b=>b.disabled),[true,true]);
  assert.deepEqual(buttons(f.root).map(b=>b.getAttribute('aria-disabled')),['true','true']);
  assert.ok(f.done.every(x=>x.enabled===false));
  assert.doesNotMatch(display(f.root),/synthetic-user|SYNTHETIC-GRANT|PRIVATE_SENTINEL/);
}
test('S2 stays unregistered, private functions only, Native26 OFF and no I/O',()=>{
  assert.match(FOUNDATION,/var D331_G1A_ENABLED = false;/);
  assert.match(MANIFEST,/03l-client-d331-status\.html/);
  assert.doesNotMatch(MANIFEST,/06-n1c3s2-deny-only-readiness-envelope|05-n1c3b-offline-revocation-contract/);
  assert.doesNotMatch(LAYOUT,/page-dengue|data-page="dengue"/);
  assert.doesNotMatch(SOURCE,/\b(?:SpreadsheetApp|PropertiesService|ScriptApp|DriveApp|UrlFetchApp|LockService|CacheService|getDb_|getUserByToken_|google\.script\.run|fetch\s*\(|XMLHttpRequest|Date\.now\s*\(|Math\.random\s*\(|process\.|require\s*\(|import\s+)\b/);
  assert.doesNotMatch(SOURCE,/SIMULATED_ALLOW|d331N1c3bEvaluateOffline_/);
  const names=[...SOURCE.matchAll(/\bfunction\s+(d331\w+)\s*\(/g)].map(x=>x[1]);
  assert.deepEqual(names,['d331N1c3s2SafeInput_','d331N1c3s2ComposeDenyOnly_']);
  assert.ok(names.every(x=>x.endsWith('_')));
  const c=composer();
  assert.equal(typeof c.d331N1c3s2SafeInput_,'function');
});
test('S2 absent reason defaults OFF, exact v1 data and fixed 30s lease',()=>{
  const c=composer(),ui=client(),now=Date.now();
  const reply=c.d331N1c3s2ComposeDenyOnly_({requestId:1,nowMs:now});
  assert.deepEqual(plain(reply),{
    version:1,requestId:1,state:'OFF',issuedAtMs:now,expiresAtMs:now+30000
  });
  assert.equal(Object.isFrozen(reply),true);
  assert.deepEqual(Object.keys(reply).sort(),
    ['expiresAtMs','issuedAtMs','requestId','state','version']);
  assert.equal(ui.closedReadiness(reply,1,now),'OFF');
});
test('S2 only OFF/POLICY_HOLD/ERROR are interoperable with actual Native26 validator',()=>{
  const c=composer(),ui=client(),now=Date.now();
  for(const [i,state] of ['OFF','POLICY_HOLD','ERROR'].entries()){
    const reply=c.d331N1c3s2ComposeDenyOnly_(valid(i+1,state,now));
    assert.equal(ui.closedReadiness(reply,i+1,now),state);
    assert.equal(ui.closedReadiness(reply,i+2,now),'ERROR','requestId must match');
    assert.equal(ui.closedReadiness(reply,i+1,now+30000),'ERROR','expired');
    assert.ok(!Object.keys(reply).some(k=>/user|grant|script|sheet|role/i.test(k)));
  }
});
test('S2 unknown, deferred or privilege states never generate valid envelope',()=>{
  const c=composer();
  for(const reason of ['AUTH_REQUIRED','NO_GRANT','READY','ENABLED','LOADING',
    'SIMULATED_ALLOW','SIMULATED_DENY','view','Super Admin','',null,{},[]]){
    assert.equal(c.d331N1c3s2ComposeDenyOnly_(valid(1,reason)),null);
  }
});
test('S2 malformed scalar clocks/request IDs, overflow and wrong keys reject',()=>{
  const c=composer(),now=Date.now();
  const attacks=[
    null,undefined,[],0,'NO_GRANT',{},{requestId:1},
    {nowMs:now},{requestId:1,nowMs:now,reason:'OFF',enabled:true},
    {requestId:1,nowMs:now,patientName:'PRIVATE_SENTINEL'},
    {requestId:0,nowMs:now},{requestId:-1,nowMs:now},
    {requestId:1.5,nowMs:now},{requestId:1000000001,nowMs:now},
    {requestId:NaN,nowMs:now},{requestId:Infinity,nowMs:now},
    {requestId:'1',nowMs:now},{requestId:1,nowMs:'1000'},
    {requestId:1,nowMs:0},{requestId:1,nowMs:NaN},
    {requestId:1,nowMs:Infinity},{requestId:1,nowMs:1.5},
    {requestId:1,nowMs:Number.MAX_SAFE_INTEGER-29999}
  ];
  for(const a of attacks)assert.equal(c.d331N1c3s2ComposeDenyOnly_(a),null);
});
test('S2 accessors, proxies, symbols, pollution, unexpected fields fail safely',()=>{
  const c=composer(),now=Date.now();
  const getter={requestId:1,nowMs:now};
  Object.defineProperty(getter,'reason',{enumerable:true,
    get(){throw Error('PRIVATE_SENTINEL');}});
  const proxy=new Proxy({requestId:1,nowMs:now},{ownKeys(){throw Error('PRIVATE_SENTINEL')}});
  const withSymbol={requestId:1,nowMs:now,[Symbol('PRIVATE_SENTINEL')]:1};
  const withProto=Object.create(null);
  Object.defineProperty(withProto,'__proto__',{enumerable:true,value:{ready:true}});
  withProto.requestId=1;withProto.nowMs=now;
  for(const attack of [getter,proxy,withSymbol,withProto,new Date(now)]){
    assert.equal(c.d331N1c3s2ComposeDenyOnly_(attack),null);
  }
  const inherited=Object.create({role:'Super Admin',allowedAreaIds:['*']});
  inherited.requestId=1;inherited.nowMs=now;
  const result=c.d331N1c3s2ComposeDenyOnly_(inherited);
  assert.equal(result?.state,'OFF','prototype-only role must have no effect');
});
test('S2 actual C3-B mock ALLOW and DENY are not admissible composer input',()=>{
  const c=composer(),ui=client(),api=c3b(),now=Date.now();
  const allow=syntheticC3bAllow(api);
  const deny=plain(api.d331N1c3bEvaluateOffline_(null,null));
  assert.deepEqual(allow,ALLOW,'exercise genuine existing evaluator allow branch');
  assert.deepEqual(deny,DENY);
  for(const mock of [allow,deny]){
    assert.equal(c.d331N1c3s2ComposeDenyOnly_(mock),null);
    assert.equal(ui.closedReadiness(mock,1,now),'ERROR');
    assert.equal(c.d331N1c3s2ComposeDenyOnly_({...valid(1),...mock}),null);
  }
  for(const forged of [
    {...valid(1,'OFF',now),origin:'server'},
    {...valid(1,'OFF',now),signed:true},
    {...valid(1,'OFF',now),role:'Super Admin'},
    {...valid(1,'OFF',now),allowedAreaIds:['*']},
    {...valid(1,'OFF',now),canRead:true},
    {...valid(1,'OFF',now),simulationOnly:true},
    {...valid(1,'OFF',now),ready:true}
  ])assert.equal(c.d331N1c3s2ComposeDenyOnly_(forged),null);
});
test('S2 valid server-oriented denial can only repaint disabled buttons via actual controller',async()=>{
  const c=composer(),ui=client(),f=controllerFixture(ui);
  assert.equal(f.work.length,0,'controller must never autostart');
  assert.equal(buttons(f.root).length,0,'status remains unmounted');
  const pending=f.instance.check();
  assert.equal(f.work.length,1);
  assert.equal(await f.instance.check(),false,'no duplicate concurrent request');
  const reply=c.d331N1c3s2ComposeDenyOnly_(valid(f.work[0].id,'POLICY_HOLD'));
  f.work[0].resolve(reply);
  assert.equal(await pending,'POLICY_HOLD');
  assert.match(display(f.root),/อยู่ระหว่างทบทวน/);
  assert.equal(f.done.length,1);
  assert.equal(f.done[0].enabled,false);
  inactive(f);
  f.instance.dispose();
});
test('S2 stale reply after logout or token/user/role/epoch change never repaints',async()=>{
  const c=composer(),ui=client();
  for(const mutate of [
    f=>f.logout(),f=>f.switchToken(),f=>f.switchUser(),
    f=>f.switchRole(),f=>f.switchEpoch()
  ]){
    const f=controllerFixture(ui),pending=f.instance.check();
    const previous=c.d331N1c3s2ComposeDenyOnly_(valid(f.work[0].id,'POLICY_HOLD'));
    mutate(f);
    f.work[0].resolve(previous);
    assert.equal(await pending,false);
    assert.equal(f.done.length,0);
    assert.equal(f.cancel.length,1);
    assert.match(display(f.root),/ยังไม่เปิดใช้งาน/);
    inactive(f);
    f.instance.dispose();
  }
});
test('S2 request replay, expiry and injected secrets are rejected by actual client',async()=>{
  const c=composer(),ui=client();
  for(const payload of [
    reply=>({...reply,requestId:2}),
    reply=>({...reply,expiresAtMs:Date.now()-1}),
    reply=>({...reply,patientName:'PRIVATE_SENTINEL'}),
    reply=>({...reply,state:'READY'}),
    reply=>({...reply,state:'ENABLED'}),
    reply=>({...reply,signed:true})
  ]){
    const f=controllerFixture(ui),pending=f.instance.check();
    const validReply=c.d331N1c3s2ComposeDenyOnly_(valid(1,'ERROR'));
    f.work[0].resolve(payload(validReply));
    assert.equal(await pending,'ERROR');
    assert.equal(f.done.length,1);
    inactive(f);
    f.instance.dispose();
  }
});
test('S2 immutable output and no exception echo, error paths keep client inert',async()=>{
  const c=composer(),ui=client(),now=Date.now();
  const input=valid(3,'POLICY_HOLD',now);
  const result=c.d331N1c3s2ComposeDenyOnly_(input);
  input.reason='READY';input.nowMs=0;
  assert.equal(result.state,'POLICY_HOLD');
  assert.equal(result.issuedAtMs,now);
  assert.equal(Object.isFrozen(result),true);
  assert.equal(c.d331N1c3s2ComposeDenyOnly_(new Proxy({},{
    getOwnPropertyDescriptor(){throw Error('PRIVATE_SENTINEL');},
    ownKeys(){return ['requestId','nowMs'];}
  })),null);
  const f=controllerFixture(ui),pending=f.instance.check();
  f.work[0].reject(Error('PRIVATE_SENTINEL'));
  assert.equal(await pending,'ERROR');
  inactive(f);
  f.instance.dispose();
});
