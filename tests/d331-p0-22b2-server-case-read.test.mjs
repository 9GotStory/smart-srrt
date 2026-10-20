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
 '../src/dengue/10-p0-05-v2-schema-compat.gs',
 '../src/dengue/15-p0-22b2-case-read-integration.gs'
];
const sources=paths.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
const EVENT='e1111111-1111-4111-8111-111111111111';
const OTHER='e2222222-2222-4222-8222-222222222222';
const CASE='a1111111-1111-4111-8111-111111111111';
const CASE2='a2222222-2222-4222-8222-222222222222';
const TOKEN='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
const DB='MOCK_DEV_DB_ID_0123456789012345678';
const TAG='a'.repeat(64);
const POLICY='SYNTHETIC_TEST_POLICY';

function eventRow(status='active'){
 const r=Array(39).fill('');
 r[5]='SYNTHETIC_DENGUE_ONLY';r[9]='2';r[10]='ตำบลจำลอง';
 r[11]='อำเภอจำลอง';r[12]='จังหวัดจำลอง';r[28]='หมู่บ้านจำลอง';
 r[29]='SYN-001';r[30]=EVENT;r[31]=3;r[32]=status;r[38]='owner-1';
 return r;
}
function userRow(){
 return ['user-1','ชื่อจำลอง','nobody@example.invalid','TEST_ONLY_HASH',
  'Staff','active','หน่วยงานจำลอง','','','','','','',''];
}
function areaRow(){
 return ['area-A','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
  '2','หมู่บ้านจำลอง','SYN-001',true,'',''];
}
function caseRow(id=CASE,event=EVENT,status='ACTIVE'){
 return [
  id,event,1,status,'SUSPECTED','2026-10-19',
  '2026-10-19T00:00:00.000Z','2026-10-19T01:00:00.000Z',
  '2026-10-19T02:00:00.000Z','TEST_UNIT_A','TEST_UNIT_B',
  '2026-10-19T03:00:00.000Z','SYNTHETIC_AUTHOR',
  '2026-10-19T03:00:00.000Z','SYNTHETIC_AUTHOR',
  'b1111111-1111-4111-8111-111111111111'
 ];
}
function grant(ctx,opts={}){
 const vals={SchemaVersion:1,GrantID:'SYNTHETIC-GRANT',
  UserID:'user-1',Capability:'dengue.case.read',AreaID:'area-A',
  EventID:EVENT,State:'ACTIVE',
  ValidFromUTC:'2025-01-01T00:00:00.000Z',
  ExpiresAtUTC:'2090-01-01T00:00:00.000Z',GrantRevision:1,
  PolicyRevision:POLICY,RequestedByUserID:'issuer-1',
  RequestedAtUTC:'2025-01-01T00:00:00.000Z',
  ApprovedByUserID:'approver-1',ApprovedAtUTC:'2025-01-02T00:00:00.000Z',
  IssuedByUserID:'issuer-1',IssuedAtUTC:'2025-01-02T00:00:00.000Z',
  UpdatedAtUTC:'2025-01-02T00:00:00.000Z',
  RevokedByUserID:'',RevokedAtUTC:'',RevocationReasonCode:'',
  MutationID:'b2222222-2222-4222-8222-222222222222',...opts};
 return Array.from(ctx.d331P002aHeaders_('D331AccessGrants'),name=>vals[name]);
}
function setup(opts={}){
 const ctx=vm.createContext({});
 for(let i=0;i<sources.length;i++)vm.runInContext(sources[i],ctx,{filename:paths[i]});
 const trace={service:0,reads:[],writes:0,opens:0,cache:0,properties:0};
 const originalFlags={base:ctx.D331_G1A_ENABLED,
  backend:ctx.D331_P003B_ENABLED_,reader:ctx.D331_P022B2_ENABLED_,
  revocation:ctx.D331_P022B2_REVOCATION_APPROVED_,
  fields:Array.from(ctx.D331_P022B2_APPROVED_FIELDS_)};
 ctx.sessionCredentialTag_=s=>s==='TEST_ONLY_HASH'?TAG:'b'.repeat(64);
 ctx.passwordConstantEqual_=(a,b)=>a===b;
 const headers={
  MainData:Array.from(ctx.MAIN_HEADERS).concat(Array.from(ctx.EVENT_META_HEADERS),['OwnerUserID']),
  UserAccounts:Array.from(ctx.D331_P003B_USER_HEADERS_),
  AreaMaster:Array.from(ctx.D331_P003B_AREA_HEADERS_)
 };
 for(const name of Array.from(ctx.D331_P005_V2_TABS_))
   headers[name]=Array.from(ctx.d331P002aHeaders_(name));
 if(opts.badHeader){
  headers[opts.badHeader]=headers[opts.badHeader].slice().reverse();
 }
 const data={
  MainData:opts.mainRows??[eventRow()],
  UserAccounts:opts.userRows??[userRow()],
  AreaMaster:opts.areaRows??[areaRow()],
  DengueCases:opts.cases??[caseRow(),caseRow(CASE2,OTHER)]
 };
 data.D331AccessGrants=opts.grants??[grant(ctx)];
 const tables={};
 for(const [name,h] of Object.entries(headers)){
  if(name===opts.missingSheet)continue;
  const rows=[h,...(data[name]??[])];
  tables[name]={
   getLastRow(){return rows.length;},
   getLastColumn(){return rows.reduce((n,r)=>Math.max(n,r.length),0);},
   getRange(row,col,height,width){
    trace.reads.push({name,row,col,height,width});
    return {getValues:()=>{
      // An authorized test-only concurrent edit occurs after the identity
      // scan, just before the selected Case is read in full.
      if(name==='DengueCases'&&row>1&&col===1&&width===16&&
         opts.caseRowMutation){
        const change=opts.caseRowMutation;
        if(Object.hasOwn(change,'caseId'))rows[row-1][0]=change.caseId;
        if(Object.hasOwn(change,'eventId'))rows[row-1][1]=change.eventId;
      }
      return rows.slice(row-1,row-1+height)
        .map(r=>r.slice(col-1,col-1+width));
    }};
   }
  };
 }
 const ss={
  getId:()=>opts.actualDb??DB,
  getSheetByName:name=>tables[name]??null
 };
 ctx.PropertiesService={
  getScriptProperties(){
   trace.service++;return {getProperty(name){
    trace.properties++;assert.equal(name,'DATABASE_SPREADSHEET_ID');
    return Object.hasOwn(opts,'dbProperty')?opts.dbProperty:DB;
   }};
  }
 };
 ctx.SpreadsheetApp={openById(id){
  trace.service++;trace.opens++;assert.equal(id,DB);return ss;
 }};
 ctx.CacheService={getScriptCache(){trace.service++;return {get(key){
  trace.cache++;assert.equal(key,'srrt_session_'+TOKEN);
  return Object.hasOwn(opts,'session')?opts.session:JSON.stringify({v:2,id:'user-1',tag:TAG});
 }};}};
 ctx.D331_G1A_ENABLED=opts.baseFlag??true;
 ctx.D331_P003B_ENABLED_=opts.backendFlag??true;
 ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=opts.approvedDb??DB;
 ctx.D331_P003B_APPROVED_DISEASE_LABELS_=opts.diseases??['SYNTHETIC_DENGUE_ONLY'];
 ctx.D331_P003B_APPROVED_POLICY_REVISION_=opts.policy??POLICY;
 ctx.D331_P022B2_ENABLED_=opts.readerFlag??true;
 ctx.D331_P022B2_REVOCATION_APPROVED_=opts.revocationFlag??true;
 ctx.D331_P022B2_APPROVED_FIELDS_=Object.hasOwn(opts,'fields')?opts.fields:[
  'CaseID','CaseRevision','CaseStatus'
 ];
 return {ctx,trace,originalFlags,
  read:()=>ctx.d331P022b2ListCasesForEvent_(
   opts.sessionToken??TOKEN,opts.eventId??EVENT)};
}
const plain=x=>JSON.parse(JSON.stringify(x));
function assertDeny(opts={},beforeDomain=false){
 const x=setup(opts);
 assert.throws(x.read,/^Error: D331_UNAVAILABLE$/);
 if(beforeDomain){
  assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1).length,0);
 }
 return x;
}

test('P0-22B2 is source-flag OFF and unregistered in native runtime',()=>{
 const x=setup();
 assert.deepEqual(x.originalFlags,{
  base:false,backend:false,reader:false,revocation:false,fields:[]
 });
 assert.doesNotMatch(manifest,/15-p0-22b2-case-read-integration\.gs/);
 assert.doesNotMatch(manifest,/09-p0-03b-dev-readonly-adapter\.gs/);
 const src=sources.at(-1).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(src,/function\s+listDengueCasesForEvent\(/);
 assert.doesNotMatch(src,/getDb_\(|getUserByToken_\(|\.setValues?\s*\(|\.appendRow\s*\(|\.insertSheet\s*\(|\.setProperty\s*\(/);
});

test('P0-22B2 default and missing source approvals block before services',()=>{
 for(const opts of [
  {baseFlag:false},{backendFlag:false},{readerFlag:false},
  {revocationFlag:false},{fields:[]},
  {fields:['CaseID','CaseStatus','CaseRevision']},
  {fields:['CaseID','CaseRevision','CaseStatus','PatientName']}
 ]){
  const x=assertDeny(opts,true);
  assert.equal(x.trace.service,0);
  assert.equal(x.trace.reads.length,0);
 }
});

test('P0-22B2 server-authorized synthetic Event -> Case projection is bounded',()=>{
 const x=setup();
 const out=plain(x.read());
 assert.deepEqual(out,{
  status:'READ_ONLY',eventId:EVENT,revision:3,areaId:'area-A',
  cases:[{caseId:CASE,caseRevision:1,caseStatus:'ACTIVE'}],
  slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
  canWrite:false,canEnable:false
 });
 const scans=x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1);
 assert.equal(scans.length,2);
 assert.deepEqual(scans.map(x=>({row:x.row,col:x.col,width:x.width})),[
  {row:2,col:1,width:2},{row:2,col:1,width:16}
 ]);
 for(const forbidden of ['TEST_UNIT_A','TEST_UNIT_B','SYNTHETIC_AUTHOR',
  'TEST_ONLY_HASH','SYNTHETIC-GRANT','PatientName'])
  assert.ok(!JSON.stringify(out).includes(forbidden),forbidden);
});
test('P0-22B2 authorized event with zero cases returns empty summary',()=>{
 const x=setup({cases:[]});
 assert.deepEqual(plain(x.read().cases),[]);
 assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1).length,0);
});
test('P0-22B2 rejects invalid identity, event/area/grant before any case data',()=>{
 const u=userRow();u[5]='inactive';
 const a=areaRow();a[7]=false;
 const g=setup().ctx;
 for(const opts of [
  {session:null},{sessionToken:'fake'},
  {userRows:[u]},{userRows:[userRow(),userRow()]},
  {mainRows:[]},{mainRows:[eventRow(),eventRow()]},
  {mainRows:[eventRow('void')]},
  {areaRows:[]},{areaRows:[a]},
  {grants:[]},{grants:[grant(g,{State:'REVOKED',RevokedByUserID:'reviewer-1',
    RevokedAtUTC:'2026-10-19T00:00:00.000Z',RevocationReasonCode:'ACCESS_REMOVED'})]},
  {grants:[grant(g,{AreaID:'area-other'})]},
  {grants:[grant(g,{Capability:'dengue.case.write'})]},
  {grants:[grant(g,{ExpiresAtUTC:'2026-01-01T00:00:00.000Z'})]},
  {diseases:[]},{policy:''},{dbProperty:null},
  {actualDb:'DIFFERENT_SHEET_ID_123456789012345'},
  {badHeader:'DengueCases'},
  {eventId:OTHER}
 ]) assertDeny(opts,true);
});
test('P0-22B2 prohibits VOID cases, duplicate CaseIDs and malformed data',()=>{
 const badRev=caseRow();badRev[2]=0;
 const wrongWidth=caseRow();wrongWidth.push('PRIVATE');
 const badStatus=caseRow(CASE,EVENT,'VOID');
 const badDate=caseRow();badDate[5]='2026-19-42';
 for(const cases of [
  [caseRow(),caseRow()],
  [badRev],[wrongWidth],[badStatus],[badDate]
 ])assertDeny({cases},false);
});
test('P0-22B2 excludes other Events without reading their clinical fields',()=>{
 const x=setup({cases:[caseRow(CASE2,OTHER)]});
 assert.deepEqual(plain(x.read().cases),[]);
 assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1&&r.width===16).length,0);
});
test('D2: reject duplicate CaseID across different Events before any case detail',()=>{
 const x=assertDeny({cases:[caseRow(CASE,EVENT),caseRow(CASE,OTHER)]});
 assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1&&r.width===16).length,0);
 const y=assertDeny({cases:[caseRow(CASE,OTHER),caseRow(CASE,OTHER)]});
 assert.equal(y.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1&&r.width===16).length,0);
});

test('D2: reject malformed identifiers in other Events and never fetch PHI',()=>{
 const cases=[
  caseRow(CASE,EVENT),
  caseRow(CASE2,OTHER)
 ];
 for(const bad of [
  {index:0,value:'MALFORMED'},
  {index:1,value:'MALFORMED'},
  {index:0,value:CASE2.toUpperCase()},
  {index:1,value:OTHER.toUpperCase()},
  {index:0,value:''},
  {index:1,value:''}
 ]){
  const corrupted=cases.map(x=>x.slice());
  corrupted[1][bad.index]=bad.value;
  const x=assertDeny({cases:corrupted});
  assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1&&r.width===16).length,0);
 }
});

test('D2: detect CaseID or EventID drift between index and detail reads',()=>{
 for(const mutation of [
  {caseId:CASE2},
  {eventId:OTHER}
 ]){
  const x=assertDeny({cases:[caseRow(CASE,EVENT)],caseRowMutation:mutation});
  assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1&&r.width===16).length,1);
 }
});

test('D2: index is only CaseID+EventID; no cross-event detailed reads',()=>{
 const x=setup({cases:[caseRow(CASE,EVENT),caseRow(CASE2,OTHER)]});
 const result=plain(x.read());
 assert.equal(result.cases.length,1);
 const reads=x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1);
 assert.deepEqual(reads.map(r=>({row:r.row,col:r.col,width:r.width})),[
  {row:2,col:1,width:2},{row:2,col:1,width:16}
 ]);
 assert.equal(reads.filter(r=>r.row===3&&r.width===16).length,0);
});

test('P0-22B2 rejects unbounded scans and excessive cases',()=>{
 const huge=Array.from({length:10001},()=>caseRow(CASE2,OTHER));
 const many=Array.from({length:101},()=>caseRow(CASE,EVENT));
 assertDeny({cases:huge});
 const x=assertDeny({cases:many});
 assert.equal(x.trace.reads.filter(r=>r.name==='DengueCases'&&r.row>1&&r.width===16).length,0);
});
test('P0-22B2 retains count-only public P0-19 and source-only Records UI',()=>{
 const adapter=sources.find((_,i)=>paths[i].includes('09-p0-03b'));
 assert.match(adapter,/function getDengueWorkspace\(sessionToken,eventId\)/);
 const layout=fs.readFileSync(new URL('../src/web/02-app-layout.html',import.meta.url),'utf8');
 assert.match(layout,/Mock-only · D331 OFF/);
 const records=fs.readFileSync(new URL('../src/web/03h-client-event-records.html',import.meta.url),'utf8');
 assert.match(records,/d331P020PreviewBridge_\.mount\(\)/);
});


// P0-30C: exact source-only backend authorization/DTO boundary audit.
// Uses the EXISTING P0-22B2 VM harness and temporary in-memory flags only.
// This does NOT authorize actual grants, patient reads, public RPC or release.
test('P0-30C: all OFF/unsigned read gates deny before any Google service even with valid synthetic request',()=>{
 const candidates=[
  {baseFlag:false},{backendFlag:false},{readerFlag:false},
  {revocationFlag:false},{fields:[]},{fields:['CaseID','CaseStatus','CaseRevision']},
  {fields:['CaseID','CaseRevision','CaseStatus','PatientName']},
  {fields:null}
 ];
 for(const opts of candidates){
  const x=assertDeny(opts,true);
  assert.equal(x.trace.service,0);
  assert.equal(x.trace.properties,0);
  assert.equal(x.trace.cache,0);
  assert.equal(x.trace.opens,0);
  assert.equal(x.trace.reads.length,0);
  assert.equal(x.trace.writes,0);
 }
});

test('P0-30C: per-Event grant authorization requires active unique approved scope, not account role alone',()=>{
 const g=setup().ctx;
 const admin=userRow();admin[4]='Administrator';
 for(const opts of [
  {userRows:[admin],grants:[]},
  {grants:[grant(g,{ApprovedByUserID:'user-1'})]},
  {grants:[grant(g,{PolicyRevision:'DIFFERENT_POLICY'})]},
  {grants:[grant(g,{AreaID:'other-area'})]},
  {grants:[grant(g,{EventID:OTHER})]},
  {grants:[grant(g,{Capability:'dengue.case.write'})]},
  {grants:[grant(g,{State:'REVOKED',RevokedAtUTC:'2026-10-01T00:00:00.000Z',RevokedByUserID:'reviewer-1',RevocationReasonCode:'ACCESS_REMOVED'})]},
  {grants:[grant(g),grant(g,{GrantID:'SYNTHETIC-GRANT-2'})]},
  {grants:[grant(g,{ValidFromUTC:'2099-01-01T00:00:00.000Z'})]},
  {grants:[grant(g,{ExpiresAtUTC:'2026-01-01T00:00:00.000Z'})]}
 ]){
  const x=assertDeny(opts,true);
  assert.equal(x.trace.writes,0);
  assert.equal(x.trace.reads.some(t=>t.name==='DengueCases'&&t.row>1),false);
 }
});

test('P0-30C: expired/changed credentials and absent/duplicate Event deny before clinical Case row access',()=>{
 const changedUser=userRow();changedUser[3]='CHANGED_HASH';
 const disabledUser=userRow();disabledUser[5]='inactive';
 for(const opts of [
  {session:null},{session:JSON.stringify({v:1,id:'user-1',tag:TAG})},
  {session:JSON.stringify({v:2,id:'other-user',tag:TAG})},
  {session:JSON.stringify({v:2,id:'user-1',tag:'b'.repeat(64)})},
  {userRows:[changedUser]},{userRows:[disabledUser]},
  {userRows:[userRow(),userRow()]},
  {mainRows:[]},{mainRows:[eventRow(),eventRow()]},
  {mainRows:[eventRow('closed')]},{mainRows:[eventRow('void')]},
  {eventId:OTHER},{eventId:EVENT.toUpperCase()},{eventId:'invalid'}
 ]){
  const x=assertDeny(opts,true);
  assert.equal(x.trace.reads.some(t=>t.name==='DengueCases'&&t.row>1),false);
 }
});

test('P0-30C: pin and header mismatch deny before Case data, with generic error',()=>{
 for(const opts of [
  {dbProperty:null},{approvedDb:''},
  {actualDb:'DIFFERENT_DEV_DATABASE_0123456789'},
  {badHeader:'MainData'},{badHeader:'UserAccounts'},
  {badHeader:'AreaMaster'},{badHeader:'DengueCases'},
  {badHeader:'D331AccessGrants'},
  {missingSheet:'DengueCases'},{missingSheet:'D331AccessGrants'}
 ]){
  const x=assertDeny(opts,true);
  assert.equal(x.trace.reads.some(t=>t.name==='DengueCases'&&t.row>1),false);
 }
});

test('P0-30C: test-only READ_ONLY candidate DTO is structurally incompatible with P0-30A/B browser mock',()=>{
 const x=setup();
 const dto=plain(x.read());
 assert.deepEqual(Object.keys(dto).sort(),[
  'areaId','canEnable','canWrite','cases','clinicalPolicyApproved',
  'eventId','revision','slaAssessment','status'
 ].sort());
 assert.deepEqual(Object.keys(dto.cases[0]).sort(),
  ['caseId','caseRevision','caseStatus'].sort());
 assert.equal(dto.status,'READ_ONLY');
 assert.equal(dto.slaAssessment,'NOT_EVALUATED');
 assert.equal(dto.clinicalPolicyApproved,false);
 assert.equal(dto.canWrite,false);
 assert.equal(dto.canEnable,false);
 const records=fs.readFileSync(new URL('../src/web/03h-client-event-records.html',import.meta.url),'utf8');
 const a=records.slice(records.indexOf('// P0-30A: inert Records Case-read state seam.'),
  records.indexOf('// P0-30A END'));
 const b=records.slice(records.indexOf('// P0-30B: source-only Event-selection contract'),
  records.indexOf('// P0-30B END'));
 assert.ok(a.startsWith('// P0-30A:')&&b.startsWith('// P0-30B:'));
 const client=vm.createContext({});
 vm.runInContext(a,client);
 vm.runInContext(b,client);
 assert.throws(()=>client.d331P030aCaseReadSeam_.validateSynthetic(dto),
  /D331_P030A_MOCK_ONLY/);
 assert.throws(()=>client.d331P030bSelectedEventCaseContract_.validateSelection({
  kind:'SYNTHETIC_SELECTED_EVENT_V1',simulationOnly:true,
  eventId:dto.eventId,areaId:dto.areaId,revision:dto.revision,
  recordStatus:'active'
 }),/D331_P030B_SYNTHETIC_ONLY/);
 assert.doesNotMatch(a+b,/\bgoogle\.script\.run\b|\bfetch\s*\(|\bgetDengueWorkspace\s*\(/);
});

test('P0-30C: original private server Case reader stays unregistered and cannot be a public Case RPC',()=>{
 const original=sources.at(-1);
 assert.match(original,/function d331P022b2ListCasesForEvent_\(sessionToken,eventId\)/);
 assert.doesNotMatch(manifest,/15-p0-22b2-case-read-integration\.gs/);
 assert.doesNotMatch(original,/function\s+listDengueCasesForEvent\s*\(/);
 assert.match(original,/D331_P022B2_REVOCATION_APPROVED_ = false/);
 assert.match(original,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
 const adapter=sources.find((_,i)=>paths[i].includes('09-p0-03b'));
 const pub=adapter.slice(adapter.indexOf('function getDengueWorkspace('));
 assert.match(pub,/counts:counts/);
 assert.doesNotMatch(pub,/cases:cases|return\s+\{[^]*?PatientName/);
 assert.doesNotMatch(original,/getDb_\(|getUserByToken_\(|\.setValues?\s*\(|\.appendRow\s*\(|\.setProperty\s*\(/);
});
