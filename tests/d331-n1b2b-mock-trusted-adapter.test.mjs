import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const BOOT = fs.readFileSync(new URL('../src/server/00-bootstrap.gs',import.meta.url),'utf8');
const A = fs.readFileSync(new URL('../src/dengue/00-g1a-foundation.gs',import.meta.url),'utf8');
const B = fs.readFileSync(new URL('../src/dengue/03-n1b1-trusted-event-contract.gs',import.meta.url),'utf8');
const C = fs.readFileSync(new URL('../src/dengue/04-n1b2b-mock-trusted-adapter.gs',import.meta.url),'utf8');
const U='11111111-1111-4111-8111-111111111111';
const V='22222222-2222-4222-8222-222222222222';
const NOW='2026-10-17T00:00:00.000Z';
function api() {
  const ctx=vm.createContext({});
  vm.runInContext(BOOT+'\n'+A+'\n'+B+'\n'+C,ctx,{filename:'synthetic-d331-n1b2b.gs'});
  return ctx;
}
function mainRow(){
  const row=Array.from({length:39},()=>'');
  row[5]='SYNTHETIC_DENGUE_ONLY';
  row[9]='2'; row[10]='ตำบลจำลอง'; row[11]='อำเภอจำลอง';
  row[12]='จังหวัดจำลอง'; row[28]='หมู่บ้านจำลอง'; row[29]='SYN-001';
  row[30]=U; row[31]=3; row[32]='active'; row[38]='user-1';
  return row;
}
function areaRow(){
  return ['area-A','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
    '2','หมู่บ้านจำลอง','SYN-001',true,'',''];
}
function grant(){
  return {grantId:'TEST-D331-GRANT-1',approved:true,revoked:false,
    revision:1,userId:'user-1',capabilities:['dengue.case.read','dengue.case.write'],
    allowedAreaIds:['area-A'],allowedEventIds:[],
    validFrom:'2026-01-01T00:00:00.000Z',expiresAt:'2027-01-01T00:00:00.000Z'};
}
function policy(){
  return {policyId:'TEST-D331-POLICY-1',revision:1,approved:true,
    labels:['SYNTHETIC_DENGUE_ONLY'],
    validFrom:'2026-01-01T00:00:00.000Z',expiresAt:'2027-01-01T00:00:00.000Z'};
}
function build(ctx,options={}){
  const calls=[];
  const owns=(name)=>Object.hasOwn(options,name);
  function choose(name,fallback){return owns(name)?options[name]:fallback;}
  const snapshot={
    kind:choose('kind',ctx.D331_N1B2B_MOCK_KIND_),
    binding:()=>choose('binding',{kind:ctx.D331_N1B2B_MOCK_KIND_,
      target:'SYNTHETIC-MEMORY-ONLY'}),
    clock:()=>choose('clock',NOW),
    session:()=>choose('session',{userId:'user-1',status:'active',role:'Staff'}),
    mainHeaders:()=>choose('mainHeaders',Array.from(ctx.D331_N1B2B_MAIN_HEADERS_)),
    areaHeaders:()=>choose('areaHeaders',Array.from(ctx.D331_N1B2B_AREA_HEADERS_)),
    diseasePolicy:()=>choose('policy',policy()),
    grant:(userId)=>{assert.equal(userId,'user-1');return choose('grant',grant());},
    mainRows:()=>choose('mainRows',[mainRow()]),
    areaRows:()=>choose('areaRows',[areaRow()])
  };
  for(const method of ['binding','clock','session','mainHeaders','areaHeaders',
    'diseasePolicy','grant','mainRows','areaRows']){
    const original=snapshot[method];
    snapshot[method]=(...args)=>{calls.push(method);return original(...args);};
  }
  return {source:snapshot,calls};
}
function run(overrides={},request={eventId:U,operation:'dengue.case.read'}){
  const ctx=api();
  const {source,calls}=build(ctx,overrides);
  const value=ctx.d331N1b2bSimulate_(source,request);
  return {value:JSON.parse(JSON.stringify(value)),calls};
}
function deny(overrides,pattern=/D331_/,request){
  assert.throws(()=>run(overrides,request),pattern);
}

test('B2B remains entirely offline and unregistered with private-only functions',()=>{
  const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(manifest,/src\/dengue\/0[34]-n1b/);
  assert.match(manifest,/src\/dengue\/00-g1a-foundation\.gs/);
  assert.match(A,/var D331_G1A_ENABLED = false;/);
  assert.doesNotMatch(C,/\b(?:SpreadsheetApp|DriveApp|PropertiesService|ScriptApp|LockService|UrlFetchApp|getDb_|getSheet_|ensureSheet_)\b/);
  const declared=[...C.matchAll(/\bfunction\s+(d331\w+)\s*\(/g)].map(x=>x[1]);
  assert.ok(declared.length>=5);
  assert.ok(declared.every(x=>x.endsWith('_')));
});
test('mock full header contracts match existing Native MainData and AreaMaster anchors',()=>{
  const ctx=api();
  assert.deepEqual(Array.from(ctx.D331_N1B2B_MAIN_HEADERS_),
    [...Array.from(ctx.MAIN_HEADERS),...Array.from(ctx.EVENT_META_HEADERS),'OwnerUserID']);
  assert.deepEqual(Array.from(ctx.D331_N1B2B_AREA_HEADERS_),
    ['AreaID','จังหวัด','อำเภอ','ตำบล','หมู่','ชื่อหมู่บ้าน',
      'รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy']);
});
test('positive synthetic read returns only explicitly marked simulated metadata',()=>{
  const {value,calls}=run();
  assert.deepEqual(value,{simulationOnly:true,decision:'SIMULATED_ALLOW',
    eventId:U,revision:3,areaId:'area-A',operation:'dengue.case.read',mode:'read'});
  assert.deepEqual(calls,['binding','clock','mainHeaders','areaHeaders','session',
    'diseasePolicy','grant','mainRows','areaRows']);
  assert.equal('patientName' in value,false);
  assert.equal('ownerUserId' in value,false);
});
test('mock write decision has no persistence side effect, requires exact revision',()=>{
  const {value,calls}=run({}, {eventId:U,operation:'dengue.case.write',expectedRevision:3});
  assert.equal(value.simulationOnly,true);
  assert.equal(value.decision,'SIMULATED_ALLOW');
  assert.equal(value.mode,'write');
  assert.equal(calls.filter(x=>x==='mainRows').length,1);
});
test('rejects injected methods, missing synthetic binding and non-synthetic targets',()=>{
  deny({kind:'OTHER'},/D331_MOCK_SOURCE_REQUIRED/);
  deny({binding:{kind:'OTHER',target:'SYNTHETIC-MEMORY-ONLY'}},/D331_MOCK_TARGET_UNVERIFIED/);
  deny({binding:{kind:'D331_SYNTHETIC_TEST_ONLY_V1',target:'EXISTING-DEV'}},
    /D331_MOCK_TARGET_UNVERIFIED/);
  const ctx=api(); const {source,calls}=build(ctx);
  delete source.session;
  assert.throws(()=>ctx.d331N1b2bSimulate_(source,{eventId:U,operation:'dengue.case.read'}),
    /D331_MOCK_SOURCE_REQUIRED/);
  assert.deepEqual(calls,[]);
});
test('invalid request and spoofed client security inputs stop before connector calls',()=>{
  const bad=[
    {eventId:'bad',operation:'dengue.case.read'},
    {eventId:U,operation:'dengue.case.export'},
    {eventId:U,operation:'dengue.case.write'},
    {eventId:U,operation:'dengue.case.write',expectedRevision:'3'},
    {eventId:U,operation:'dengue.case.read',expectedRevision:3},
    {eventId:U,operation:'dengue.case.read',approvedGrant:grant()},
    {eventId:U,operation:'dengue.case.read',allowedAreaIds:['area-A']},
    {eventId:U,operation:'dengue.case.read',userId:'user-1'},
    {eventId:U,operation:'dengue.case.read',mainRow:mainRow()},
    {eventId:V.toUpperCase(),operation:'dengue.case.read'}
  ];
  for(const request of bad){
    const ctx=api(); const {source,calls}=build(ctx);
    assert.throws(()=>ctx.d331N1b2bSimulate_(source,request),/D331_MOCK_INVALID_REQUEST/);
    assert.deepEqual(calls,[]);
  }
});
test('strict headers deny missing, swapped, extra, incorrect and duplicate positions',()=>{
  const ctx=api(),mh=Array.from(ctx.D331_N1B2B_MAIN_HEADERS_);
  const ah=Array.from(ctx.D331_N1B2B_AREA_HEADERS_);
  const wrong=[mh.slice(0,-1), [...mh].reverse(),[...mh,'Injected'],
    [...mh.slice(0,30),'WrongID',...mh.slice(31)],
    [...mh.slice(0,38),'VoidReason'], // duplicate last header
  ];
  for(const mainHeaders of wrong)deny({mainHeaders},/D331_MOCK_HEADER_INVALID/);
  for(const areaHeaders of [[],ah.slice(1),[...ah,'Extra'],ah.map((x,i)=>i===7?'active':x)]){
    deny({areaHeaders},/D331_MOCK_HEADER_INVALID/);
  }
});
test('revoked/inactive user and invalid grants are denied without implicit role rights',()=>{
  for(const session of [null,{userId:'user-1',status:'pending',role:'Super Admin'},
    {userId:' user-1',status:'active',role:'Admin'}]){
    deny({session},/D331_MOCK_SESSION_DENIED/);
  }
  for(const g of [null, {...grant(),approved:false}, {...grant(),revoked:true},
    {...grant(),revision:0},{...grant(),userId:'different'},
    {...grant(),capabilities:['view','edit']},{...grant(),allowedAreaIds:['area-B']},
    {...grant(),validFrom:'2026-10-18T00:00:00.000Z'},
    {...grant(),expiresAt:NOW}]){
    deny({grant:g},/D331_/);
  }
  // Even a Super Admin gets no Dengue capabilities without explicit grant.
  deny({session:{userId:'user-1',status:'active',role:'Super Admin'},
    grant:null},/D331_MOCK_GRANT_UNAVAILABLE/);
});
test('no signed synthetic clinical policy or expired/mismatched policy means deny',()=>{
  for(const p of [null,{}, {...policy(),approved:false},
    {...policy(),labels:[]}, {...policy(),labels:['โรคติดต่อนำโดยแมลง']},
    {...policy(),labels:['SYNTHETIC_DENGUE_ONLY','SYNTHETIC_DENGUE_ONLY']},
    {...policy(),expiresAt:NOW},{...policy(),validFrom:'2027-01-01T00:00:00.000Z'},
    {...policy(),revision:0}]){
    deny({policy:p},/D331_/);
  }
});
test('event scanner rejects zero, duplicate, malformed and oversize mock rows',()=>{
  deny({mainRows:[]},/D331_MOCK_EVENT_UNRESOLVED/);
  deny({mainRows:[mainRow(),mainRow()]},/D331_MOCK_EVENT_UNRESOLVED/);
  deny({mainRows:[mainRow().slice(1)]},/D331_MOCK_EVENT_UNRESOLVED/);
  deny({mainRows:[{eventId:U}]},/D331_MOCK_EVENT_UNRESOLVED/);
  deny({mainRows:Array.from({length:1001},()=>mainRow())},/D331_MOCK_EVENT_UNRESOLVED/);
  const wrong=mainRow();wrong[30]=V;
  deny({mainRows:[wrong]},/D331_MOCK_EVENT_UNRESOLVED/);
});
test('strict AreaMaster rejects wrong, inactive, duplicate and invalid rows',()=>{
  deny({areaRows:[]},/D331_AREA_UNRESOLVED/);
  deny({areaRows:[areaRow(),areaRow()]},/D331_AREA_UNRESOLVED/);
  deny({areaRows:[{id:'area-A'}]},/D331_MOCK_AREA_UNRESOLVED/);
  deny({areaRows:[areaRow().slice(1)]},/D331_MOCK_AREA_UNRESOLVED/);
  for(const v of ['true',1,false,null]){
    const a=areaRow();a[7]=v;
    deny({areaRows:[a]},/D331_AREA_UNRESOLVED/);
  }
  const b=areaRow();b[6]='SYN-1';
  deny({areaRows:[b]},/D331_AREA_UNRESOLVED/);
  const c=areaRow();c[0]='area-B';
  deny({areaRows:[c]},/D331_FORBIDDEN/);
});
test('void and closed parent writes, stale revisions and missing owner reject',()=>{
  for(const value of ['void','',null]){
    const row=mainRow();row[32]=value;
    deny({mainRows:[row]},/D331_/);
  }
  const closed=mainRow();closed[32]='closed';
  assert.equal(run({mainRows:[closed]}).value.mode,'read');
  deny({mainRows:[closed]},/D331_FORBIDDEN/,
    {eventId:U,operation:'dengue.case.write',expectedRevision:3});
  for(const revision of [2,4]){
    deny({},/D331_STALE_REVISION/,
      {eventId:U,operation:'dengue.case.write',expectedRevision:revision});
  }
  const row=mainRow();row[38]='';
  deny({mainRows:[row]},/D331_UNTRUSTED_CONTEXT/);
});
test('AreaID, ownership and capability remain scoped in simulated grants',()=>{
  const row=mainRow();row[38]='other-user';
  deny({mainRows:[row]},/D331_FORBIDDEN/);
  const g={...grant(),allowedEventIds:[U]};
  assert.equal(run({mainRows:[row],grant:g}).value.decision,'SIMULATED_ALLOW');
  deny({grant:{...grant(),capabilities:['dengue.case.read']}},/D331_FORBIDDEN/,
    {eventId:U,operation:'dengue.case.write',expectedRevision:3});
  deny({mainRows:[row],grant:{...g,allowedAreaIds:['area-B']}},/D331_FORBIDDEN/);
});
test('failed target/header checks do not fetch session, policy or event records',()=>{
  const ctx=api();
  const {source,calls}=build(ctx,{binding:{kind:ctx.D331_N1B2B_MOCK_KIND_,target:'wrong'}});
  assert.throws(()=>ctx.d331N1b2bSimulate_(source,{eventId:U,operation:'dengue.case.read'}),
    /D331_MOCK_TARGET_UNVERIFIED/);
  assert.deepEqual(calls,['binding']);
  const invalid=build(ctx,{mainHeaders:[]});
  assert.throws(()=>ctx.d331N1b2bSimulate_(invalid.source,{eventId:U,operation:'dengue.case.read'}),
    /D331_MOCK_HEADER_INVALID/);
  assert.deepEqual(invalid.calls,['binding','clock','mainHeaders']);
});
