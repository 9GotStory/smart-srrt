import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const paths=[
 '../src/server/00-bootstrap.gs',
 '../src/dengue/00-g1a-foundation.gs',
 '../src/dengue/03-n1b1-trusted-event-contract.gs',
 '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
 '../src/dengue/09-p0-03b-dev-readonly-adapter.gs',
 '../src/dengue/10-p0-05-v2-schema-compat.gs'
];
const sources=paths.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const ID='a1111111-1111-4111-8111-111111111111';
const MUT='b2222222-2222-4222-8222-222222222222';
const TOKEN='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
const SPREADSHEET='MOCK_VALID_DEV_SHEET_ID_0123456789012';
const TAG='a'.repeat(64);
const POLICY='TEST-POLICY-1';
function eventRow(){
 const r=Array.from({length:39},()=>'');
 r[5]='SYNTHETIC_DENGUE_ONLY';r[9]='2';r[10]='ตำบลจำลอง';
 r[11]='อำเภอจำลอง';r[12]='จังหวัดจำลอง';r[28]='หมู่บ้านจำลอง';
 r[29]='SYN-001';r[30]=ID;r[31]=3;r[32]='active';r[38]='user-2';
 return r;
}
function userRow(){
 return ['user-1','ชื่อจำลอง','test-only@example.invalid','TEST_ONLY_HASH',
   'Staff','active','หน่วยงานจำลอง','','','','','','',''];
}
function areaRow(){
 return ['area-A','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
    '2','หมู่บ้านจำลอง','SYN-001',true,'',''];
}
function grant(ctx,override={}){
 const g={
  SchemaVersion:1,GrantID:'TEST-GRANT-1',UserID:'user-1',
  Capability:'dengue.case.read',AreaID:'area-A',EventID:ID,
  State:'ACTIVE',ValidFromUTC:'2025-01-01T00:00:00.000Z',
  ExpiresAtUTC:'2090-01-01T00:00:00.000Z',GrantRevision:1,
  PolicyRevision:POLICY,RequestedByUserID:'issuer-1',
  RequestedAtUTC:'2025-01-01T00:00:00.000Z',
  ApprovedByUserID:'approver-1',ApprovedAtUTC:'2025-01-02T00:00:00.000Z',
  IssuedByUserID:'issuer-1',IssuedAtUTC:'2025-01-02T00:00:00.000Z',
  UpdatedAtUTC:'2025-01-02T00:00:00.000Z',
  RevokedByUserID:'',RevokedAtUTC:'',RevocationReasonCode:'',
  MutationID:MUT,...override
 };
 return Array.from(ctx.d331P002aHeaders_('D331AccessGrants'),h=>g[h]);
}
function sheet(grid,trace){
 const arr=grid.map(r=>[...r]);
 return {
  getLastColumn:()=>arr[0]?.length||0,
  getLastRow:()=>arr.length,
  getRange(row,col,height,width){
   trace.ranges.push([row,col,height,width]);
   return {getValues:()=>arr.slice(row-1,row-1+height)
      .map(r=>r.slice(col-1,col-1+width))};
  }
 };
}
function setup(options={}){
 const trace={props:0,opens:0,cache:0,ranges:[]};
 const ctx=vm.createContext({});
 sources.forEach((s,i)=>vm.runInContext(s,ctx,{filename:paths[i]}));
 ctx.sessionCredentialTag_=h=>h==='TEST_ONLY_HASH'?TAG:'b'.repeat(64);
 ctx.passwordConstantEqual_=(a,b)=>a===b;
 const h={
  MainData:Array.from(ctx.MAIN_HEADERS).concat(Array.from(ctx.EVENT_META_HEADERS),['OwnerUserID']),
  UserAccounts:Array.from(ctx.D331_P003B_USER_HEADERS_),
  AreaMaster:Array.from(ctx.D331_P003B_AREA_HEADERS_),
  D331AccessGrants:Array.from(ctx.d331P002aHeaders_('D331AccessGrants'))
 };
 for(const name of Array.from(ctx.D331_P005_V2_TABS_)){
  h[name]=Array.from(ctx.d331P002aHeaders_(name));
 }
 const rows={
  MainData:options.mainRows??[eventRow()],
  UserAccounts:options.userRows??[userRow()],
  AreaMaster:options.areaRows??[areaRow()],
  D331AccessGrants:options.grantRows??[grant(ctx)]
 };
 // A selected Event is the ONLY permitted join key; no real rows are read
 // by these mocks. The five domain Sheet EventID columns are index 2.
 for(const name of ['DengueCases','DenguePlans','DengueControlActions',
                    'DengueEntomology','DengueFollowups']){
  rows[name]=options.domainRows?.[name]??[];
 }
 if(options.headers)Object.assign(h,options.headers);
 const sheets={};
 for(const [name,headers] of Object.entries(h)){
   if(options.missingSheet===name)continue;
   sheets[name]=sheet([headers,...(rows[name]??[])],trace);
 }
 const props={getProperty(k){
   trace.props++;
   assert.equal(k,'DATABASE_SPREADSHEET_ID');
   return Object.hasOwn(options,'propertyId')?options.propertyId:SPREADSHEET;
 }};
 const mockDb={getId:()=>options.actualDatabaseId??SPREADSHEET,
  getSheetByName:n=>sheets[n]||null};
 ctx.PropertiesService={getScriptProperties:()=>props};
 ctx.SpreadsheetApp={openById:id=>{
  trace.opens++;
  assert.equal(id,SPREADSHEET);
  return mockDb;
 }};
 ctx.CacheService={getScriptCache:()=>({
  get:key=>{
   trace.cache++;
   assert.equal(key,'srrt_session_'+TOKEN);
   return Object.hasOwn(options,'session')?options.session:
     JSON.stringify({v:2,id:'user-1',tag:TAG});
  }
 })};
 ctx.D331_G1A_ENABLED=options.baseFlag??true;
 ctx.D331_P003B_ENABLED_=options.devFlag??true;
 ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=options.approvedId??SPREADSHEET;
 ctx.D331_P003B_APPROVED_DISEASE_LABELS_=options.diseaseLabels??['SYNTHETIC_DENGUE_ONLY'];
 ctx.D331_P003B_APPROVED_POLICY_REVISION_=options.policyRevision??POLICY;
 return {ctx,trace,read:(event=ID,token=TOKEN)=>ctx.d331P003bReadOnly_(token,event),
  workspace:(event=ID,token=TOKEN)=>ctx.getDengueWorkspace(token,event)};
}
function deny(options={},message='D331_UNAVAILABLE'){
 const state=setup(options);
 assert.throws(()=>state.read(),new RegExp(message));
 return state;
}
test('P0-03B remains unregistered, private-only, feature OFF in source',()=>{
 const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
 const src=sources[paths.indexOf('../src/dengue/09-p0-03b-dev-readonly-adapter.gs')];
 assert.doesNotMatch(manifest,/09-p0-03b-dev-readonly-adapter/);
 assert.match(src,/D331_P003B_ENABLED_ = false/);
 assert.match(src,/D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = ''/);
 assert.match(sources[1],/D331_G1A_ENABLED = false/);
 assert.ok([...src.matchAll(/function\s+(d331\w+)\s*\(/g)].every(x=>x[1].endsWith('_')));
 for(const banned of ['setProperty(','.appendRow(','.setValue(','.setValues(',
   'getActiveSpreadsheet(', 'getDb_(', 'getSheet_(', 'getUserByToken_(',
   'findEventRowById_(']){
   // The deprecated helper names are mentioned in a comment, not invoked.
   const cleaned=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
   assert.ok(!cleaned.includes(banned),banned);
 }
});
test('default gate refuses before ANY Apps Script service access',()=>{
 const x=setup({baseFlag:false});
 assert.throws(()=>x.read(),/D331_UNAVAILABLE/);
 assert.equal(x.trace.props,0);assert.equal(x.trace.opens,0);assert.equal(x.trace.cache,0);
 const y=setup({devFlag:false});
 assert.throws(()=>y.read(),/D331_UNAVAILABLE/);
 assert.equal(y.trace.props,0);assert.equal(y.trace.opens,0);
});
test('explicit DEV binding and active current session yield minimal read-only metadata',()=>{
 const x=setup();
 assert.deepEqual(JSON.parse(JSON.stringify(x.read())),
   {eventId:ID,revision:3,areaId:'area-A',mode:'read'});
 assert.equal(x.trace.props,1);assert.equal(x.trace.opens,1);
 assert.equal(x.trace.cache,1);
 assert.ok(x.trace.ranges.some(x=>x[1]===31&&x[3]===1),
   'scan only EventID column before selected event raw row');
});
test('missing/mismatched approved/configured/actual DB ID never auto repairs',()=>{
 for(const o of [{approvedId:''},{propertyId:null},
   {propertyId:'ANOTHER_VALID_SPREADSHEET_ID_0123456789'},
   {actualDatabaseId:'MISMATCHED_DB_ID_012345678901234'}]){
  const x=deny(o);
  if(o.approvedId==='')assert.equal(x.trace.props,0);
  assert.ok(x.trace.opens<=1);
 }
});
test('no current session, expired cache, bad tag and duplicate UserID deny',()=>{
 for(const o of [{session:null},{session:JSON.stringify({v:1,id:'user-1',tag:TAG})},
   {session:JSON.stringify({v:2,id:'user-1',tag:'b'.repeat(64)})},
   {userRows:[userRow(),userRow()]},
   {userRows:[userRow().map((v,i)=>i===5?'inactive':v)]},
   {userRows:[]}])deny(o);
});
test('no grant Sheet and missing/scrambled/extra headers deny',()=>{
 deny({missingSheet:'D331AccessGrants'});
 deny({headers:{MainData:['EventID']}});
 const a=setup();const expected=Array.from(a.ctx.D331_P003B_AREA_HEADERS_).reverse();
 deny({headers:{AreaMaster:expected}});
 const g=Array.from(a.ctx.d331P002aHeaders_('D331AccessGrants'));g.push('Unexpected');
 deny({headers:{D331AccessGrants:g}});
});
test('unique EventID, exact valid Revision and actual disease mandatory',()=>{
 deny({mainRows:[]});
 deny({mainRows:[eventRow(),eventRow()]});
 const r=eventRow();r[5]='OTHER_DISEASE';deny({mainRows:[r]});
 const s=eventRow();s[31]='3';deny({mainRows:[s]});
 const v=eventRow();v[32]='void';deny({mainRows:[v]});
});
test('active, unique, location-exact AreaMaster required',()=>{
 deny({areaRows:[]});
 deny({areaRows:[areaRow(),areaRow()]});
 const a=areaRow();a[7]='true';deny({areaRows:[a]});
 const other=areaRow();other[0]='area-A';other[6]='SYN-002';
 deny({areaRows:[areaRow(),other]});
});
test('revoked, absent, duplicated, stale-policy, wrong event/area grant deny',()=>{
 const c=setup().ctx;
 deny({grantRows:[]});
 deny({grantRows:[grant(c),grant(c)]});
 deny({grantRows:[grant(c),grant(c,{GrantID:'TEST-GRANT-2'})]});
 deny({grantRows:[grant(c,{EventID:MUT})]});
 deny({grantRows:[grant(c,{AreaID:'other'})]});
 deny({grantRows:[grant(c,{PolicyRevision:'TEST-POLICY-OLD'})]});
 deny({grantRows:[grant(c,{State:'REVOKED',RevokedByUserID:'admin-2',
   RevokedAtUTC:'2026-01-01T00:00:00.000Z',
   RevocationReasonCode:'ACCESS_REMOVED'})]});
 deny({grantRows:[grant(c,{ExpiresAtUTC:'2026-01-01T00:00:00.000Z'})]});
});
test('no owner fallback, no unapproved clinical labels, no role-based bypass',()=>{
 const r=eventRow();r[38]='';deny({mainRows:[r]});
 deny({diseaseLabels:[]});
 deny({policyRevision:''});
 const u=userRow();u[4]='Super Admin';deny({userRows:[u],grantRows:[]});
});
test('invalid input, patient narrative and errors never leak private data',()=>{
 const a=setup();
 assert.throws(()=>a.read('TEST-LEGACY-ID'),/D331_UNAVAILABLE/);
 assert.throws(()=>a.read(ID,'bad-token'),/D331_UNAVAILABLE/);
 const r=eventRow();r[13]='PRIVATE_PATIENT_NAME_SHOULD_NOT_LEAK';
 const b=setup({mainRows:[r]});
 const result=JSON.stringify(b.read());
 assert.ok(!result.includes('PRIVATE_PATIENT_NAME'));
 assert.ok(!result.includes('user-1'));
 assert.ok(!result.includes('TEST-GRANT-1'));
 const c=setup({mainRows:[]});
 try{c.read();assert.fail('must deny');}catch(e){assert.equal(e.message,'D331_UNAVAILABLE');}
});

test('P0-05 exact seven-tab v2 contract is exercised before any Event/Session rows',()=>{
 const state=setup();
 const names=Array.from(state.ctx.D331_P005_V2_TABS_);
 assert.deepEqual(names,[
  'DengueCases','DenguePlans','DengueControlActions',
  'DengueEntomology','DengueFollowups',
  'DengueRequestLedger','D331AccessGrants'
 ]);
 const expected=names.map(name=>Array.from(state.ctx.d331P002aHeaders_(name)).length);
 assert.deepEqual(expected,[16,15,18,16,16,10,22]);
 assert.equal(expected.reduce((a,b)=>a+b,0),113);
 assert.equal(state.read().mode,'read');
 // All seven D331 tabs are read by row 1 only; only the authority/grant
 // tab can subsequently be used for data-row reads.
 assert.equal(state.trace.ranges.filter(range=>range[0]===1).length,10);
});
test('missing, extra or reordered headers in any of seven D331 tabs fail closed',()=>{
 const ctx=setup().ctx;
 for(const name of Array.from(ctx.D331_P005_V2_TABS_)){
  deny({missingSheet:name});
  const headers=Array.from(ctx.d331P002aHeaders_(name));
  const modified=[...headers]; modified[0]='RenamedHeader';
  deny({headers:{[name]:modified}});
  const reversed=[...headers].reverse();
  deny({headers:{[name]:reversed}});
  const extra=[...headers,'Unexpected'];
  deny({headers:{[name]:extra}});
 }
});
test('v2 schema version mismatch denies before session lookup',()=>{
 const state=setup();
 state.ctx.D331_P002A_SCHEMA_VERSION_=1;
 assert.throws(()=>state.read(),/D331_UNAVAILABLE/);
 assert.equal(state.trace.cache,0);
});


test('P0-19 public workspace RPC remains flag-CLOSED before any service',()=>{
 for(const setting of [{baseFlag:false},{devFlag:false}]){
  const x=setup(setting);
  assert.throws(()=>x.workspace(),/D331_UNAVAILABLE/);
  assert.equal(x.trace.props,0);
  assert.equal(x.trace.opens,0);
  assert.equal(x.trace.cache,0);
  assert.equal(x.trace.ranges.length,0);
 }
});
test('P0-19 trusted per-event read DTO has counts only and no clinical SLA',()=>{
 const rows={
  DengueCases:[['case-1',ID,'PRIVATE_PATIENT_NAME'],['case-2',MUT,'OTHER_EVENT']],
  DenguePlans:[['plan-1',ID],['plan-2',MUT]],
  DengueControlActions:[['action-1',ID]],
  DengueEntomology:[['survey-1',ID],['survey-2',ID]],
  DengueFollowups:[['followup-1',MUT]]
 };
 const x=setup({domainRows:rows});
 const out=JSON.parse(JSON.stringify(x.workspace()));
 assert.deepEqual(out,{
  status:'READ_ONLY',eventId:ID,revision:3,areaId:'area-A',
  counts:{cases:1,plans:1,actions:1,surveys:2,followups:0},
  slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
  canWrite:false,canEnable:false
 });
 assert.equal(x.trace.props,1);assert.equal(x.trace.opens,1);
 assert.equal(x.trace.cache,1);
 // Domain data reads never fetch patient narratives, area/user columns,
 // ledger or grant record projections for the response.
 assert.equal(x.trace.ranges.filter(r=>r[1]===2&&r[3]===1).length,5);
 assert.ok(x.trace.ranges.every(r=>r[0]===1 ||r[1]===1||r[3]===1||r[2]===1));
 assert.ok(!JSON.stringify(out).includes('PRIVATE_PATIENT_NAME'));
 assert.ok(!JSON.stringify(out).includes('OTHER_EVENT'));
 assert.ok(!JSON.stringify(out).includes('TEST-GRANT-1'));
});
test('P0-19 no-data event returns five zero counts without a write',()=>{
 const x=setup();
 assert.deepEqual(JSON.parse(JSON.stringify(x.workspace().counts)),
  {cases:0,plans:0,actions:0,surveys:0,followups:0});
 assert.ok(x.trace.ranges.every(r=>r[0]===1||r[3]===1||r[2]===1));
});
test('P0-19 authorization denial precedes any five-domain data read',()=>{
 for(const options of [
  {grantRows:[]},{session:null},{policyRevision:''},
  {diseaseLabels:[]},{mainRows:[]},
  {approvedId:''},{baseFlag:false},{devFlag:false}
 ]){
  const x=setup(options);
  assert.throws(()=>x.workspace(),/D331_UNAVAILABLE/);
  const broad=x.trace.ranges.filter(r=>r[0]===2&&r[1]===2);
  assert.equal(broad.length,0,'must not read domain event columns before grant');
 }
});
test('P0-19 invalid event token/area/disease never becomes an access shortcut',()=>{
 const other=eventRow();other[5]='OTHER_DISEASE';
 for(const [o,event,token] of [
  [{},'bogus',TOKEN],[{},ID,'bad-token'],
  [{mainRows:[other]},ID,TOKEN],
  [{areaRows:[]},ID,TOKEN]
 ]){
  const x=setup(o);
  assert.throws(()=>x.workspace(event,token),/D331_UNAVAILABLE/);
  assert.equal(x.trace.ranges.filter(r=>r[0]===2&&r[1]===2).length,0);
 }
});
test('P0-19 rejects unbounded domain scans and event overcount without fallback',()=>{
 const huge=Array.from({length:10001},()=>['case',MUT]);
 const many=Array.from({length:501},()=>['case',ID]);
 for(const rows of [huge,many]){
  const x=setup({domainRows:{DengueCases:rows}});
  assert.throws(()=>x.workspace(),/D331_UNAVAILABLE/);
 }
});
test('P0-19 does not project domain cell details or permit mutation APIs',()=>{
 const source=sources[paths.indexOf('../src/dengue/09-p0-03b-dev-readonly-adapter.gs')]
   .replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 assert.match(source,/function getDengueWorkspace\(sessionToken,eventId\)/);
 assert.match(source,/d331P003bAuthorizedContext_\(sessionToken,eventId\)/);
 assert.doesNotMatch(source,/\.appendRow\s*\(|\.setValues?\s*\(|\.insertRows?\s*\(|\.deleteRows?\s*\(/);
 assert.doesNotMatch(source,/\.getDataRange\s*\(|getActiveSpreadsheet\s*\(/);
 assert.doesNotMatch(source,/Logger\.log\(|console\.log\(|JSON\.stringify\(rows\)/);
});
