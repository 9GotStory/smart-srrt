import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const paths=[
 '../src/server/00-bootstrap.gs',
 '../src/server/01-schema-and-db.gs',
 '../src/server/02-auth-and-attachments.gs',
 '../src/dengue/00-g1a-foundation.gs',
 '../src/dengue/03-n1b1-trusted-event-contract.gs',
 '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
 '../src/dengue/09-p0-03b-dev-readonly-adapter.gs',
 '../src/dengue/10-p0-05-v2-schema-compat.gs',
 '../src/dengue/11-p0-06-offline-workflow-engine.gs',
 '../src/dengue/12-p0-07-guarded-dev-crud.gs',
 '../src/server/03-events-and-dashboard.gs',
 '../src/dengue/16-f03-plan-workflow.gs'
];
const sources=paths.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const uid=n=>n.toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111';
const EVENT=uid(99);
const TOKEN='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
const DB='MOCK_VALID_DEV_SHEET_ID_0123456789012';
const POLICY='TEST-POLICY-1';
const NOW='2026-10-18T00:00:00.000Z';
const TAG=createHash('sha256').update('TEST_ONLY_HASH').digest('hex');
const kinds=['case','plan','action','survey','followup'];
function scriptCtx(){
 const ctx=vm.createContext({});sources.forEach((s,i)=>vm.runInContext(s,ctx,{filename:paths[i]}));return ctx;
}
function grantRow(ctx,cap,i,policy=POLICY){
 const obj={
   SchemaVersion:1,GrantID:'grant-'+i,UserID:'user-1',
   Capability:cap,AreaID:'area-A',EventID:EVENT,State:'ACTIVE',
   ValidFromUTC:'2025-01-01T00:00:00.000Z',
   ExpiresAtUTC:'2090-01-01T00:00:00.000Z',
   GrantRevision:1,PolicyRevision:policy,
   RequestedByUserID:'issuer-1',RequestedAtUTC:'2025-01-01T00:00:00.000Z',
   ApprovedByUserID:'approver-1',ApprovedAtUTC:'2025-01-02T00:00:00.000Z',
   IssuedByUserID:'issuer-1',IssuedAtUTC:'2025-01-02T00:00:00.000Z',
   UpdatedAtUTC:'2025-01-02T00:00:00.000Z',
   RevokedByUserID:'',RevokedAtUTC:'',RevocationReasonCode:'',
   MutationID:uid(200+i)
 };
 return Array.from(ctx.d331P002aHeaders_('D331AccessGrants'),h=>obj[h]);
}
function mkSheet(name,headers,rows,trace,options){
 const grid=[headers.slice(),...rows.map(r=>r.slice())];
 const formats=new Map();
 const stored=(value,column,row)=>{
  if(typeof value!=='string')return value;
  if(options.coerceCaseDates&&name==='DengueCases'&&column===5&&/^\d{4}-\d{2}-\d{2}$/.test(value))
   return new Date(value+'T00:00:00+07:00');
  // Models Sheets parsing date- or number-like strings unless the cell is plain text.
  if(options.coercePlanText&&name==='DenguePlans'&&column===3&&formats.get(row+':'+(column+1))!=='@'){
   if(/^\d{4}-\d{2}-\d{2}$/.test(value))return new Date(value+'T00:00:00+07:00');
   if(/^\d+$/.test(value))return Number(value);
  }
  return value;
 };
 return {name,grid,
  getDataRange(){return {getValues:()=>grid.map(r=>r.slice())};},
  getParent(){return {getId:()=>DB,getSpreadsheetTimeZone:()=>options.timeZone??'Asia/Bangkok'};},
  getLastColumn(){return grid[0].length;},
  getLastRow(){return grid.length;},
  getRange(row,col,height,width){
   trace.reads.push([name,row,col,height,width]);
   return {
    getValues(){return grid.slice(row-1,row-1+height)
      .map(r=>r.slice(col-1,col-1+width));},
    setNumberFormat(format){
      for(let i=0;i<height;i++)for(let j=0;j<width;j++)formats.set((row+i)+':'+(col+j),format);
      return this;
    },
    setValues(matrix){
      if(options.failCommit&&name==='DengueRequestLedger'&&
         matrix[0][5]==='COMMITTED')throw Error('Simulated ledger commit failure');
      assert.equal(matrix.length,height);
      assert.ok(matrix.every(r=>r.length===width));
      for(let i=0;i<matrix.length;i++){
       for(let j=0;j<width;j++)grid[row+i-1][col+j-1]=stored(matrix[i][j],col+j-1,row+i);
      }
      trace.writes.push({sheet:name,type:'setValues'});
    }
   };
  },
  insertRowAfter(after){
    if(options.failDomain&&name===options.failDomain)
      throw Error('Simulated post-ledger domain failure');
    assert.equal(after,grid.length);
    grid.push(headers.map(()=>''));
  },
  appendRow(row){
    if(options.failDomain&&name===options.failDomain)
      throw Error('Simulated post-ledger domain failure');
    assert.equal(row.length,headers.length);
    grid.push(row.map((value,column)=>stored(value,column,grid.length+1)));
    trace.writes.push({sheet:name,type:'appendRow'});
  }
 };
}
function setup(options={}){
 const ctx=scriptCtx(options);
 const trace={locks:0,release:0,opens:0,properties:0,cache:0,
   reads:[],writes:[],uuids:0};
 const headers={
  MainData:Array.from(ctx.MAIN_HEADERS).concat(Array.from(ctx.EVENT_META_HEADERS),['OwnerUserID']),
  UserAccounts:Array.from(ctx.D331_P003B_USER_HEADERS_),
  SystemSettings:['Key','Value','Description','UpdatedAt','UpdatedBy'],
  AreaMaster:Array.from(ctx.D331_P003B_AREA_HEADERS_)
 };
 for(const name of Array.from(ctx.D331_P005_V2_TABS_))
  headers[name]=Array.from(ctx.d331P002aHeaders_(name));
 const main=Array(39).fill('');
 main[5]='SYNTHETIC_DENGUE_ONLY';main[9]='2';main[10]='ตำบลจำลอง';
 main[11]='อำเภอจำลอง';main[12]='จังหวัดจำลอง';
 main[28]='หมู่บ้านจำลอง';main[29]='SYN-001';
 main[30]=EVENT;main[31]=3;main[32]=options.eventStatus??'active';
 main[38]='user-2';
 const data={
  MainData:[main],
  SystemSettings:[['SYSTEM_STATUS','open','','','']],
  UserAccounts:[['user-1','ชื่อจำลอง','fixture@example.invalid',
   'TEST_ONLY_HASH',options.role??'Admin','active','','','','','','','','']],
  AreaMaster:[['area-A','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
   '2','หมู่บ้านจำลอง','SYN-001',true,'','']],
  D331AccessGrants:kinds.map((kind,i)=>grantRow(ctx,
    ctx.D331_P007_KIND_[kind].capability,i+1)),
  DengueRequestLedger:[],
  DengueCases:[],DenguePlans:[],DengueControlActions:[],
  DengueEntomology:[],DengueFollowups:[]
 };
 const sheets={};
 for(const [name,header] of Object.entries(headers))
  if(name!==options.missingTab)
   sheets[name]=mkSheet(name,options.scrambleTab===name?
     [...header].reverse():header,data[name]||[],trace,options);
 const ss={getId:()=>options.actualId??DB,getSheetByName:n=>sheets[n]||null};
 ctx.SpreadsheetApp={openById:id=>{
   assert.equal(id,DB);trace.opens++;return ss;
 }};
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:key=>{
  trace.properties++;assert.equal(key,'DATABASE_SPREADSHEET_ID');
  return Object.hasOwn(options,'configuredId')?options.configuredId:DB;
 }})};
 ctx.CacheService={getScriptCache:()=>({get:key=>{
  trace.cache++;
  assert.equal(key,'srrt_session_'+TOKEN);
  return JSON.stringify({v:2,id:'user-1',tag:TAG});
 }})};
 ctx.LockService={getScriptLock:()=>{
  trace.locks++;
  return {tryLock:()=>{if(options.onLock)options.onLock();return !options.lockFails;},
   releaseLock:()=>{trace.release++;}};
 }};
 ctx.Utilities={DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
  formatDate:(date,timeZone,pattern)=>{
   assert.equal(pattern,'yyyy-MM-dd');
   const p=new Intl.DateTimeFormat('en',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(date);const value=type=>p.find(x=>x.type===type).value;
   return value('year')+'-'+value('month')+'-'+value('day');
  },
  computeDigest:(alg,s)=>{
    assert.equal(alg,'SHA_256');
    return [...createHash('sha256').update(s).digest()];
  },
  getUuid:()=>{trace.uuids++;return uid(100+trace.uuids);}
 };
 ctx.D331_G1A_ENABLED=options.featureFlag??true;
 ctx.D331_P003B_ENABLED_=options.readFlag??true;
 ctx.D331_P007_ENABLED_=options.writeFlag??true;
 ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=options.approvedId??DB;
 ctx.D331_P003B_APPROVED_DISEASE_LABELS_=['SYNTHETIC_DENGUE_ONLY'];
 ctx.D331_P003B_APPROVED_POLICY_REVISION_=POLICY;
 ctx.D331_F03_ENABLED_=options.planFlag??true;
 ctx.D331_F03_SCOPE_APPROVED_=options.planApproval??true;
 sheets.D331AccessGrants.grid.push(grantRow(ctx,'dengue.plan.read',30));
 return {ctx,trace,sheets,
  run:(kind,mode,payload={},more={})=>
    JSON.parse(JSON.stringify(ctx.d331P007Operate_(TOKEN,EVENT,{
      kind,mode,requestId:uid(300+trace.uuids+trace.writes.length),
      expectedEventRevision:3,payload,...more
    })))
 };
}
function deny(fn){assert.throws(fn,/D331_WRITE_UNAVAILABLE/);}
function basicCase(){return {Classification:'SUSPECTED',OnsetLocalDate:'2026-10-17'};}
function basicAction(planId){return {PlanID:planId,StageKey:'DAY_3',
 ActivityType:'LARVAL_CONTROL',ScopeCode:'COMMUNITY'};}
function basicSurvey(planId){return {PlanID:planId,CheckpointKey:'DAY_3',
 ScopeCode:'COMMUNITY',HousesInspected:10,HousesPositive:2,
 ContainersInspected:20,ContainersPositive:4};}
const plain=value=>JSON.parse(JSON.stringify(value));
const request=(caseId,more={})=>({caseId,expectedEventRevision:3,expectedCaseRevision:1,...more});
const planCommand=(caseId,more={})=>({...request(caseId),mode:'create',requestId:uid(800),
 payload:{TriggerCaseID:caseId,EpisodeKey:'EP1'},...more});
function makeCase(s){return s.ctx.saveDengueCase(TOKEN,EVENT,{mode:'create',requestId:uid(799),
 expectedEventRevision:3,payload:basicCase()}).caseId;}
test('F03 S1 current Staff with a Plan grant cannot create through the public RPC',()=>{
 const s=setup();s.sheets.UserAccounts.grid[1][4]='Admin';const c=makeCase(s);
 s.sheets.UserAccounts.grid[1][4]='Staff';
 const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
 const grants=plain(s.sheets.D331AccessGrants.grid);
 assert.equal(s.ctx.hasPermission_('Staff','create'),false);
 assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,writes);
 assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
 assert.deepEqual(plain(s.sheets.D331AccessGrants.grid),grants);
 assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans,[]);
});
test('F03 S1 closed system denies public Plan create just as actual core auth does',()=>{
 const s=setup(),c=makeCase(s);s.sheets.SystemSettings.grid[1][1]='closed';
 const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
 assert.throws(()=>s.ctx.requireAuth_(TOKEN,'create'),/ระบบถูกปิด/);
 assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,writes);
 assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
 assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans,[]);
});
test('F03 S1 duplicate SYSTEM_STATUS cannot hide a later closed value',()=>{
 const s=setup(),c=makeCase(s);
 s.sheets.SystemSettings.grid.push(['SYSTEM_STATUS','closed','','','']);
 const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
 assert.throws(()=>s.ctx.requireAuth_(TOKEN,'create'),/ระบบถูกปิด/);
 assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,writes);
 assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
});
test('F03 S1 settings normalization and default-open behavior match actual core auth',()=>{
 for(const value of ['closed','CLOSED','Closed','open','OPEN','',null,'missing']){
  const s=setup(),c=makeCase(s);
  if(value==='missing')s.sheets.SystemSettings.grid.splice(1);
  else s.sheets.SystemSettings.grid[1][1]=value;
  const closed=typeof value==='string'&&value.toLowerCase()==='closed';
  if(closed){
   const writes=s.trace.writes.length;
   assert.throws(()=>s.ctx.requireAuth_(TOKEN,'create'),/ระบบถูกปิด/);
   assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)),/D331_WRITE_UNAVAILABLE/);
   assert.equal(s.trace.writes.length,writes);
  }else{
   assert.equal(s.ctx.requireAuth_(TOKEN,'create').role,'Admin');
   assert.equal(s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).status,'CREATED');
  }
 }
});
test('F03 S1 Plan status reads use the already pinned workbook without fallback or repair',()=>{
 const s=setup(),c=makeCase(s);s.trace.opens=0;s.trace.properties=0;s.trace.reads.length=0;
 const settings=plain(s.sheets.SystemSettings.grid);
 assert.equal(s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).status,'CREATED');
 assert.equal(s.trace.opens,1);assert.equal(s.trace.properties,1);
 assert.deepEqual(s.trace.reads.filter(r=>r[0]==='SystemSettings'),[
  ['SystemSettings',1,1,1,5],['SystemSettings',2,1,1,2]]);
 assert.deepEqual(plain(s.sheets.SystemSettings.grid),settings);
});
test('F03 S1 missing/malformed/unbounded settings and failed reads deny before Plan writes',()=>{
 for(const change of [s=>{delete s.sheets.SystemSettings;},
  s=>{s.sheets.SystemSettings.grid[0].reverse();},
  s=>{s.sheets.SystemSettings.getLastRow=()=>502;},
  s=>{s.sheets.SystemSettings.getRange=()=>({getValues:()=>{throw Error('PRIVATE_SETTINGS_FAILURE');}});},
  s=>{s.sheets.SystemSettings.grid.push(s.sheets.SystemSettings.grid[1].slice());}]){
  const s=setup(),c=makeCase(s),writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
  change(s);
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)),/^Error: D331_WRITE_UNAVAILABLE$/);
  assert.equal(s.trace.writes.length,writes);assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
 }
});
test('F03 S1 default OFF or missing approval/dependency denies all four RPCs before services',()=>{
 for(const options of [{planFlag:false},{planApproval:false},{}]){
  const s=setup(options);if(!Object.keys(options).length)s.ctx.d331P007Authorize_=undefined;
  for(const [name,args] of [['listDenguePlansForEvent',[{}]],['listAssignableDenguePlanOwners',[{}]],
   ['saveDenguePlan',[{}]],['getDenguePlanWriteStatus',[uid(800)]]]){
   assert.equal(typeof s.ctx[name],'function');
   assert.throws(()=>s.ctx[name](TOKEN,EVENT,...args),/D331_(?:WRITE_)?UNAVAILABLE/);
  }
  assert.equal(s.trace.opens,0);assert.equal(s.trace.locks,0);
 }
});

test('F03 S1 scoped Plan read is empty then returns only allowlisted linkage/owner/status',()=>{
 const s=setup(),c=makeCase(s);
 assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))),{
  contractVersion:'D331_PLAN_LIST_V1',eventId:EVENT,revision:3,caseId:c,caseRevision:1,
  areaId:'area-A',plans:[]});
 const p=s.run('plan','create',{TriggerCaseID:c,EpisodeKey:'EP1'});
 assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans,[{
  planId:p.entityId,triggerCaseId:c,episodeKey:'EP1',planRevision:1,planStatus:'OPEN',responsibleUserId:'user-1'}]);
 const n=s.trace.writes.length;
 for(const selection of [request(c,{expectedEventRevision:2}),request(c,{expectedCaseRevision:2}),
  request(uid(13)),request(c,{role:'Super Admin'})])
  assert.throws(()=>s.ctx.listDenguePlansForEvent(TOKEN,EVENT,selection),/D331_UNAVAILABLE/);
 s.sheets.D331AccessGrants.grid.splice(-1);
 assert.throws(()=>s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c)),/D331_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,n);
});

test('F03 S1 create/replay/receipt and immutable linkage use server-owned revision and creator',()=>{
 const s=setup(),c=makeCase(s),cmd=planCommand(c);
 const created=plain(s.ctx.saveDenguePlan(TOKEN,EVENT,cmd));
 assert.deepEqual(created,{contractVersion:'D331_PLAN_WRITE_V1',eventId:EVENT,requestId:uid(800),
  status:'CREATED',planId:uid(102),revision:1});
 const n=s.trace.writes.length;
 assert.deepEqual(plain(s.ctx.saveDenguePlan(TOKEN,EVENT,cmd)),{
  contractVersion:'D331_PLAN_WRITE_V1',eventId:EVENT,requestId:uid(800),status:'REPLAYED',planId:created.planId});
 assert.deepEqual(plain(s.ctx.getDenguePlanWriteStatus(TOKEN,EVENT,uid(800))),{
  contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',eventId:EVENT,requestId:uid(800),status:'COMMITTED',planId:created.planId});
 assert.equal(s.trace.writes.length,n);
 const p=plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans[0];
 assert.equal(p.responsibleUserId,'user-1');assert.equal(p.planStatus,'OPEN');
 for(const command of [planCommand(c,{requestId:uid(801)}),
  planCommand(c,{payload:{TriggerCaseID:c,EpisodeKey:'CHANGED'}}),
  planCommand(c,{payload:{TriggerCaseID:c,EpisodeKey:'EP2',ResponsibleUserID:'other'}}),
  planCommand(c,{caseId:uid(7)}),planCommand(c,{kind:'case'}),
  planCommand(c,{expectedCaseRevision:2}),planCommand(c,{expectedEventRevision:2}),
  planCommand(c,{payload:{TriggerCaseID:c,EpisodeKey:'=1'}})]){
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,command),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,n);
 }
});

function updatePlan(s,c,p,payload,revision,requestId=uid(820+revision)){
 return s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{mode:'update',requestId,
  entityId:p,expectedEntityRevision:revision,payload}));
}
test('F03 S1 system write freeze blocks lifecycle and assignment but retains read-only receipts',()=>{
 for(const payload of [{PlanStatus:'CLOSED'},{PlanStatus:'OPEN'},{PlanStatus:'VOID'},
  {ResponsibleUserID:'user-2'}]){
  const s=setup(),c=makeCase(s),command=planCommand(c),p=s.ctx.saveDenguePlan(TOKEN,EVENT,command).planId;
  let revision=1;
  if(payload.PlanStatus==='OPEN'){updatePlan(s,c,p,{PlanStatus:'CLOSED'},1);revision=2;}
  if(payload.ResponsibleUserID){s.sheets.UserAccounts.grid[1][4]='Manager';addOwner(s);}
  const before=plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans;
  const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
  const grants=plain(s.sheets.D331AccessGrants.grid);
  s.sheets.SystemSettings.grid[1][1]='closed';
  assert.throws(()=>s.ctx.requireAuth_(TOKEN,payload.ResponsibleUserID?'assign':'edit'),/ระบบถูกปิด/);
  assert.throws(()=>updatePlan(s,c,p,payload,revision,uid(1300)),/D331_WRITE_UNAVAILABLE/);
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,command),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,writes);
  assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
  assert.deepEqual(plain(s.sheets.D331AccessGrants.grid),grants);
  assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans,before);
  assert.equal(s.ctx.getDenguePlanWriteStatus(TOKEN,EVENT,command.requestId).status,'COMMITTED');
  assert.equal(s.trace.writes.length,writes);
 }
});
test('F03 S1 system closure is read after acquiring the participating writer lock',()=>{
 for(const update of [false,true]){
  const options={},s=setup(options),c=makeCase(s);
  const p=update?s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId:null;
  const command=update?planCommand(c,{mode:'update',requestId:uid(1301),entityId:p,
   expectedEntityRevision:1,payload:{PlanStatus:'CLOSED'}}):planCommand(c);
  const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
  options.onLock=()=>{s.sheets.SystemSettings.grid[1][1]='closed';};
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,command),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,writes);assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
 }
 const options={},s=setup(options),c=makeCase(s);s.sheets.SystemSettings.grid[1][1]='closed';
 options.onLock=()=>{s.sheets.SystemSettings.grid[1][1]='open';};
 assert.equal(s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).status,'CREATED');
});
test('F03 S1 role downgrade keeps the Plan grant but denies every public update before writes',()=>{
 for(const payload of [{PlanStatus:'CLOSED'},{PlanStatus:'OPEN'},{PlanStatus:'VOID'},
  {ResponsibleUserID:'user-2'}]){
  const s=setup(),c=makeCase(s),command=planCommand(c);
  const p=s.ctx.saveDenguePlan(TOKEN,EVENT,command).planId;let revision=1;
  if(payload.PlanStatus==='OPEN'){
   updatePlan(s,c,p,{PlanStatus:'CLOSED'},1);revision=2;
  }
  if(payload.ResponsibleUserID){addOwner(s);s.sheets.UserAccounts.grid[1][4]='Manager';}
  const before=plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans;
  const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
  const grants=plain(s.sheets.D331AccessGrants.grid);
  s.sheets.UserAccounts.grid[1][4]='Staff'; // same session, unchanged credential and grants
  assert.equal(s.ctx.hasPermission_('Staff','edit'),false);
  assert.throws(()=>updatePlan(s,c,p,payload,revision,uid(1100)),/D331_WRITE_UNAVAILABLE/);
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,command),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,writes);
  assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
  assert.deepEqual(plain(s.sheets.D331AccessGrants.grid),grants);
  assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans,before);
 }
});
test('F03 S1 public mutations use the role observed after acquiring the writer lock',()=>{
 for(const mode of ['create','update']){
  const options={},s=setup(options),c=makeCase(s);
  const p=mode==='update'?s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId:null;
  const command=mode==='create'?planCommand(c):planCommand(c,{mode:'update',requestId:uid(1101),
   entityId:p,expectedEntityRevision:1,payload:{PlanStatus:'CLOSED'}});
  const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
  const before=plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans;
  const locks=s.trace.locks,releases=s.trace.release;
  options.onLock=()=>{s.sheets.UserAccounts.grid[1][4]='Staff';};
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,command),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.locks,locks+1);assert.equal(s.trace.release,releases+1);
  assert.equal(s.trace.writes.length,writes);
  assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
  assert.deepEqual(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans,before);
 }
 const options={},s=setup(options),c=makeCase(s);s.sheets.UserAccounts.grid[1][4]='Staff';
 options.onLock=()=>{s.sheets.UserAccounts.grid[1][4]='Admin';};
 assert.equal(s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).status,'CREATED');
});
test('F03 S1 Admin/Manager/Super Admin need both core permissions and current Plan grants',()=>{
 for(const role of ['Admin','Manager','Super Admin']){
  const s=setup({role}),c=makeCase(s),command=planCommand(c);
  assert.equal(s.ctx.hasPermission_(role,'create'),true);assert.equal(s.ctx.hasPermission_(role,'edit'),true);
  const created=s.ctx.saveDenguePlan(TOKEN,EVENT,command);
  assert.equal(created.status,'CREATED');assert.equal(created.revision,1);
  assert.equal(s.ctx.saveDenguePlan(TOKEN,EVENT,command).status,'REPLAYED');
  assert.equal(updatePlan(s,c,created.planId,{PlanStatus:'CLOSED'},1).revision,2);
  assert.equal(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c)).plans[0].planStatus,'CLOSED');
  const grant=s.sheets.D331AccessGrants.grid.findIndex(r=>r[3]==='dengue.plan.write');
  s.sheets.D331AccessGrants.grid.splice(grant,1);
  const writes=s.trace.writes.length,ledger=plain(s.sheets.DengueRequestLedger.grid);
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{requestId:uid(1102),
   payload:{TriggerCaseID:c,EpisodeKey:'EP2'}})),/D331_WRITE_UNAVAILABLE/);
  assert.throws(()=>updatePlan(s,c,created.planId,{PlanStatus:'OPEN'},2),/D331_WRITE_UNAVAILABLE/);
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,command),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,writes);assert.deepEqual(plain(s.sheets.DengueRequestLedger.grid),ledger);
 }
});
test('F03 S1 explicit close/reopen/void rejects stale/no-op/terminal/child conflicts without cascades',()=>{
 const s=setup(),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
 const action=s.run('action','create',basicAction(p));
 let n=s.trace.writes.length;
 assert.throws(()=>updatePlan(s,c,p,{PlanStatus:'CLOSED'},1),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,n);
 s.run('action','update',{ActionStatus:'COMPLETED',OutcomeCode:'DONE'},
  {entityId:action.entityId,expectedEntityRevision:1});
 assert.equal(updatePlan(s,c,p,{PlanStatus:'CLOSED'},1).revision,2);
 n=s.trace.writes.length;
 assert.throws(()=>updatePlan(s,c,p,{PlanStatus:'VOID'},2),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,n);
 assert.equal(updatePlan(s,c,p,{PlanStatus:'OPEN'},2).revision,3);
 n=s.trace.writes.length;
 for(const [payload,rev] of [[{PlanStatus:'OPEN'},3],[{PlanStatus:'CLOSED'},2],
  [{TriggerCaseID:uid(17)},3],[{EpisodeKey:'NEW'},3]]){
  assert.throws(()=>updatePlan(s,c,p,payload,rev),/D331_WRITE_UNAVAILABLE/);assert.equal(s.trace.writes.length,n);
 }
 assert.equal(updatePlan(s,c,p,{PlanStatus:'VOID'},3).revision,4);
 assert.throws(()=>updatePlan(s,c,p,{PlanStatus:'OPEN'},4),/D331_WRITE_UNAVAILABLE/);
 assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{requestId:uid(860)})),/D331_WRITE_UNAVAILABLE/);
 assert.equal(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans[0].planStatus,'VOID');
 assert.equal(s.sheets.DengueCases.grid[1][2],1);assert.equal(s.sheets.DengueControlActions.grid[1][Array.from(s.ctx.d331P002aHeaders_('DengueControlActions')).indexOf('ActionStatus')],'COMPLETED');
});

test('F03 S1 an EpisodeKey stays reserved across OPEN, CLOSED and VOID for new request IDs',()=>{
 for(const end of ['OPEN','CLOSED','VOID']){
  const s=setup(),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
  if(end!=='OPEN')updatePlan(s,c,p,{PlanStatus:end},1);
  const n=s.trace.writes.length;
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{requestId:uid(1402)})),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,n);
 }
});
test('F03 S1 a CLOSED Plan accepts only reopen, so assignment denies without writes',()=>{
 const s=setup({role:'Manager'}),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
 addOwner(s);updatePlan(s,c,p,{PlanStatus:'CLOSED'},1);const n=s.trace.writes.length;
 assert.throws(()=>updatePlan(s,c,p,{ResponsibleUserID:'user-2'},2,uid(1403)),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,n);
});

function addOwner(s,id='user-2'){
 const row=s.sheets.UserAccounts.grid[1].slice();row[0]=id;row[1]='ชื่อจำลองผู้รับผิดชอบ';
 s.sheets.UserAccounts.grid.push(row);
 for(const [capability,i] of [['dengue.plan.read',41],['dengue.plan.write',40]]){
  const grant=grantRow(s.ctx,capability,i);grant[2]=id;s.sheets.D331AccessGrants.grid.push(grant);
 }
}
test('F03 S1 assignment resolves eligible current Plan writers and enforces role+assign authority',()=>{
 const s=setup(),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
 addOwner(s);const n=s.trace.writes.length;
 assert.throws(()=>s.ctx.listAssignableDenguePlanOwners(TOKEN,EVENT,request(c)),/D331_UNAVAILABLE/);
 assert.throws(()=>updatePlan(s,c,p,{ResponsibleUserID:'user-2'},1),/D331_WRITE_UNAVAILABLE/);
 s.sheets.UserAccounts.grid[1][4]='Manager';
 assert.deepEqual(plain(s.ctx.listAssignableDenguePlanOwners(TOKEN,EVENT,request(c))),{
  contractVersion:'D331_PLAN_OWNERS_V1',eventId:EVENT,revision:3,caseId:c,caseRevision:1,
  areaId:'area-A',owners:[{userId:'user-1'},{userId:'user-2'}]});
 assert.equal(s.trace.writes.length,n);
 const grants=plain(s.sheets.D331AccessGrants.grid);
 assert.equal(updatePlan(s,c,p,{ResponsibleUserID:'user-2'},1).revision,2);
 assert.equal(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans[0].responsibleUserId,'user-2');
 assert.deepEqual(plain(s.sheets.D331AccessGrants.grid),grants);
 for(const mutate of [x=>{x.sheets.UserAccounts.grid[2][5]='inactive';},
  x=>{x.sheets.UserAccounts.grid.push(x.sheets.UserAccounts.grid[2].slice());},
  x=>{x.sheets.D331AccessGrants.grid.at(-1)[4]='area-B';},
  x=>{x.sheets.D331AccessGrants.grid.at(-1)[5]=uid(10);},
  x=>{x.sheets.D331AccessGrants.grid.pop();}]){
  const x=setup(),cc=makeCase(x),pp=x.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(cc)).planId;
  addOwner(x);x.sheets.UserAccounts.grid[1][4]='Super Admin';mutate(x);
  const before=x.trace.writes.length;
  assert.throws(()=>updatePlan(x,cc,pp,{ResponsibleUserID:'user-2'},1),/D331_WRITE_UNAVAILABLE/);
  assert.equal(x.trace.writes.length,before);
 }
});

function addCandidate(s,id,role,capabilities){
 const row=s.sheets.UserAccounts.grid[1].slice();row[0]=id;row[4]=role;s.sheets.UserAccounts.grid.push(row);
 capabilities.forEach((capability,i)=>{const grant=grantRow(s.ctx,capability,60+i);grant[2]=id;
  s.sheets.D331AccessGrants.grid.push(grant);});
}
test('F03 S1 assignees need current core edit plus Plan read and write grants',()=>{
 for(const [role,capabilities] of [['Staff',['dengue.plan.read','dengue.plan.write']],
  ['Admin',['dengue.plan.write']],['Admin',['dengue.plan.read']]]){
  const s=setup({role:'Manager'}),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
  addCandidate(s,'user-3',role,capabilities);
  assert.deepEqual(plain(s.ctx.listAssignableDenguePlanOwners(TOKEN,EVENT,request(c))).owners,[{userId:'user-1'}]);
  const n=s.trace.writes.length;
  assert.throws(()=>updatePlan(s,c,p,{ResponsibleUserID:'user-3'},1),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,n);
 }
 const s=setup({role:'Manager'}),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
 addCandidate(s,'user-3','Admin',['dengue.plan.read','dengue.plan.write']);
 assert.deepEqual(plain(s.ctx.listAssignableDenguePlanOwners(TOKEN,EVENT,request(c))).owners,
  [{userId:'user-1'},{userId:'user-3'}]);
 assert.equal(updatePlan(s,c,p,{ResponsibleUserID:'user-3'},1).revision,2);
});

test('F03 S1 PENDING before/after domain write blocks fresh IDs and exposes truthful minimal receipt',()=>{
 for(const failure of ['domain','commit']){
  const opts={},s=setup(opts),c=makeCase(s),cmd=planCommand(c);
  if(failure==='domain')opts.failDomain='DenguePlans';else opts.failCommit=true;
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,cmd),/D331_WRITE_UNAVAILABLE/);
  const writes=s.trace.writes.length;
  assert.deepEqual(plain(s.ctx.getDenguePlanWriteStatus(TOKEN,EVENT,cmd.requestId)),{
   contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',eventId:EVENT,requestId:cmd.requestId,status:'PENDING'});
  for(const id of [cmd.requestId,uid(899)])assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,
   {...cmd,requestId:id,payload:{TriggerCaseID:c,EpisodeKey:'EP2'}}),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,writes);
  assert.equal(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans.length,failure==='domain'?0:1);
 }
});

test('F03 S1 UNKNOWN ledger phase blocks fresh IDs and exposes a truthful minimal receipt',()=>{
 const opts={failDomain:'DenguePlans'},s=setup(opts),c=makeCase(s),cmd=planCommand(c);
 assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,cmd),/D331_WRITE_UNAVAILABLE/);
 s.sheets.DengueRequestLedger.grid.at(-1)[5]='UNKNOWN';delete opts.failDomain;
 const writes=s.trace.writes.length;
 assert.deepEqual(plain(s.ctx.getDenguePlanWriteStatus(TOKEN,EVENT,cmd.requestId)),{
  contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',eventId:EVENT,requestId:cmd.requestId,status:'UNKNOWN'});
 for(const id of [cmd.requestId,uid(1400)])assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,
  {...cmd,requestId:id,payload:{TriggerCaseID:c,EpisodeKey:'EP2'}}),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,writes);
});

test('F03 S1 date-like and numeric EpisodeKeys stay text through later reads and writes',()=>{
 for(const key of ['2026-11-08','12345']){
  const s=setup({coercePlanText:true}),c=makeCase(s);
  const p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{payload:{TriggerCaseID:c,EpisodeKey:key}}));
  assert.equal(p.status,'CREATED');
  assert.equal(s.sheets.DenguePlans.grid[1][3],key);
  assert.equal(plain(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c))).plans[0].episodeKey,key);
  assert.equal(updatePlan(s,c,p.planId,{PlanStatus:'CLOSED'},1).revision,2);
  assert.equal(s.sheets.DenguePlans.grid[1][3],key);
  assert.equal(s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{requestId:uid(1401),
   payload:{TriggerCaseID:c,EpisodeKey:'EP2'}})).status,'CREATED');
 }
});

test('F03 S1 every operation reauthorizes current session/Event/Area/Plan grant and original binding',()=>{
 const grantChange=(s,key,value)=>{const hs=Array.from(s.ctx.d331P002aHeaders_('D331AccessGrants'));
  for(const row of s.sheets.D331AccessGrants.grid.slice(1))
   if(row[3].startsWith('dengue.plan.'))row[hs.indexOf(key)]=value;};
 const changes=[s=>{s.ctx.CacheService.getScriptCache=()=>({get:()=>null});},
  s=>{s.sheets.UserAccounts.grid[1][3]='CHANGED';},s=>{s.sheets.UserAccounts.grid[1][5]='inactive';},
  s=>{s.sheets.UserAccounts.grid.push(s.sheets.UserAccounts.grid[1].slice());},
  s=>{s.sheets.MainData.grid.push(s.sheets.MainData.grid[1].slice());},
  s=>{s.sheets.MainData.grid[1][32]='closed';},s=>{s.sheets.MainData.grid[1][5]='OTHER_DISEASE';},
  s=>{s.sheets.AreaMaster.grid[1][7]=false;},s=>{s.sheets.AreaMaster.grid.push(s.sheets.AreaMaster.grid[1].slice());},
  s=>{for(let i=s.sheets.D331AccessGrants.grid.length-1;i>0;i--)if(s.sheets.D331AccessGrants.grid[i][3].startsWith('dengue.plan.'))s.sheets.D331AccessGrants.grid.splice(i,1);},
  s=>grantChange(s,'ExpiresAtUTC','2020-01-01T00:00:00.000Z'),s=>grantChange(s,'PolicyRevision','OTHER'),
  s=>grantChange(s,'AreaID','area-B'),s=>grantChange(s,'EventID',uid(10)),
  s=>{s.sheets.D331AccessGrants.grid.push(s.sheets.D331AccessGrants.grid.at(-1).slice());},
  s=>{s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:()=>null});}];
 for(const change of changes){
  const s=setup(),c=makeCase(s);s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c));
  s.sheets.UserAccounts.grid[1][4]='Manager';change(s);const n=s.trace.writes.length;
  for(const [name,arg] of [['listDenguePlansForEvent',request(c)],['listAssignableDenguePlanOwners',request(c)],
   ['saveDenguePlan',planCommand(c,{requestId:uid(901),payload:{TriggerCaseID:c,EpisodeKey:'EP2'}})],
   ['getDenguePlanWriteStatus',uid(800)]])assert.throws(()=>s.ctx[name](TOKEN,EVENT,arg),/D331_(?:WRITE_)?UNAVAILABLE/);
  assert.equal(s.trace.writes.length,n);
 }
});

test('F03 S1 foreign owner/Event/capability and ambiguous/malformed receipt ledger deny',()=>{
 for(const [index,value] of [[1,uid(8)],[2,'user-2'],[3,'dengue.case.write'],[6,'CASE'],[7,'bad-id'],[5,'INVALID']]){
  const s=setup(),c=makeCase(s);s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c));
  s.sheets.DengueRequestLedger.grid.at(-1)[index]=value;
  assert.throws(()=>s.ctx.getDenguePlanWriteStatus(TOKEN,EVENT,uid(800)),/D331_WRITE_UNAVAILABLE/);
 }
 const s=setup(),c=makeCase(s);s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c));
 s.sheets.DengueRequestLedger.grid.push(s.sheets.DengueRequestLedger.grid.at(-1).slice());
 assert.throws(()=>s.ctx.getDenguePlanWriteStatus(TOKEN,EVENT,uid(800)),/D331_WRITE_UNAVAILABLE/);
});

test('F03 S1 missing dependencies deny before any service, including assignee/receipt dependencies',()=>{
 for(const dependency of ['d331P003bPlanOwner_','d331P007WriteStatus_','hasPermission_']){
  const s=setup();s.ctx[dependency]=undefined;
  for(const [name,arg] of [['listDenguePlansForEvent',{}],['listAssignableDenguePlanOwners',{}],
   ['saveDenguePlan',{}],['getDenguePlanWriteStatus',uid(800)]])
   assert.throws(()=>s.ctx[name](TOKEN,EVENT,arg),/D331_(?:WRITE_)?UNAVAILABLE/);
  assert.equal(s.trace.opens,0);assert.equal(s.trace.locks,0);
 }
});

function planClient(){
 const nodes=new Map(),requests=[];
 const doc={readyState:'loading',createElement:tag=>makeNode(tag),
  getElementById:id=>{if(!nodes.has(id))nodes.set(id,makeNode('div'));return nodes.get(id);},
  querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},documentElement:{style:{setProperty(){}}}};
 function makeNode(tag){return {tagName:tag,ownerDocument:doc,children:[],hidden:true,value:'',style:{},
  textContent:'',attrs:{},listeners:{},classList:{add(){},remove(){},toggle(){}},
  appendChild(n){this.children.push(n);return n;},replaceChildren(...n){this.children=n;},
  setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},removeEventListener(){},
  fire(k){for(const fn of this.listeners[k]||[])fn();},focus(){doc.activeElement=this;}};}
 const ctx=vm.createContext({document:doc,Promise,Date,crypto:{randomUUID:()=>uid(499)},
  MutationObserver:class {observe(){} takeRecords(){return [];} disconnect(){}},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
 for(const {path,code} of readOrderedClientScripts())
  vm.runInContext(path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code,ctx);
 ctx.gs=(...args)=>new Promise((resolve,reject)=>requests.push({args,resolve,reject}));
 vm.runInContext('token='+JSON.stringify(TOKEN)+';currentUser={userId:"user-1",role:"Admin"};'+
  'allData='+JSON.stringify([{eventId:EVENT,revision:3,recordStatus:'active'}])+';'+
  'D331_F02_CASE_READ_AVAILABLE_=true;D331_F02_CASE_WRITE_AVAILABLE_=true;D331_F03_PLANS_AVAILABLE_=true;',ctx);
 const root=doc.getElementById('d331-f03-region');
 function walk(n){return [n,...n.children.flatMap(walk)];}
 return {ctx,requests,select(){const n=walk(doc.getElementById('d331-f02-region')).find(n=>n.tagName==='button'&&n.textContent.startsWith('ดู Plans '));assert.ok(n);n.fire('click');},click(label){const n=walk(root).find(n=>n.tagName==='button'&&n.textContent===label);
   assert.ok(n,label);assert.ok(!n.disabled);n.fire('click');},
  fill(id,value){const n=walk(root).find(n=>n.id===id);assert.ok(n);n.value=value;n.fire('input');},
  text:()=>walk(root).map(n=>n.textContent).join('|')};
}

test('F03 S3 serialized actual server outputs drive registered Records create/receipt/fresh-read without optimistic revision',async()=>{
 for(const failure of ['none','domain','commit','closed']){
  const options={},s=setup(options),c=makeCase(s);
  vm.runInContext(fs.readFileSync(new URL('../src/dengue/15-p0-22b2-case-read-integration.gs',import.meta.url),'utf8'),s.ctx);
  s.ctx.D331_P022B2_ENABLED_=true;s.ctx.D331_P022B2_REVOCATION_APPROVED_=true;
  s.ctx.D331_P022B2_APPROVED_FIELDS_=['CaseID','CaseRevision','CaseStatus'];
  s.sheets.D331AccessGrants.grid.push(grantRow(s.ctx,'dengue.case.read',50));
  const h=planClient(),settle=()=>new Promise(resolve=>setImmediate(resolve));
  s.sheets.UserAccounts.grid[1][4]='Manager';vm.runInContext('currentUser.role="Manager";',h.ctx);
  let nextRequest=500;h.ctx.crypto.randomUUID=()=>uid(nextRequest++);
  async function respond(){const req=h.requests.at(-1),[name,...args]=req.args;
   try{req.resolve(plain(s.ctx[name](...plain(args))));}catch(e){req.reject(Error(e.message));}await settle();}
  h.ctx.d331F02CaseRead_.select(EVENT);await respond();h.select();await respond();assert.match(h.text(),/ไม่มี Plan/);
  h.click('เพิ่ม Plan');h.fill('d331-f03-episode','EP-S3');
  if(failure==='domain')options.failDomain='DenguePlans';if(failure==='commit')options.failCommit=true;
  if(failure==='closed')s.sheets.SystemSettings.grid[1][1]='closed';
  const beforeSave=s.trace.writes.length;
  h.click('บันทึก Plan');await respond();
  if(failure==='closed')assert.equal(s.trace.writes.length,beforeSave);
  assert.match(h.text(),failure==='none'?/ยืนยันการบันทึก/:/ยังไม่ทราบผล/);
  if(failure!=='none'){h.click('ตรวจสอบสถานะคำขอ');await respond();assert.match(h.text(),/ยังไม่ทราบผล/);}
  h.click('อ่านรายการ Plan ใหม่');await respond();
  assert.match(h.text(),failure==='domain'||failure==='closed'?/ไม่มี Plan/:/EP-S3/);
  if(failure!=='none')assert.match(h.text(),/ยังไม่ทราบผล/);
  assert.equal(h.requests.filter(r=>r.args[0]==='saveDenguePlan').length,1);
  assert.doesNotMatch(h.text(),/PayloadDigest|TEST_ONLY_HASH|example.invalid/);
  if(failure==='none'){
   const p=s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c)).plans[0].planId;
   for(const action of ['ปิด Plan ','เปิด Plan อีกครั้ง ']){
    h.click(action+p);h.click('บันทึก Plan');await respond();assert.match(h.text(),/ยืนยันการบันทึก/);
    h.click('อ่านรายการ Plan ใหม่');await respond();
   }
   addOwner(s);h.click('เลือกผู้รับผิดชอบ '+p);await respond();h.fill('d331-f03-owner','user-2');
   h.click('บันทึก Plan');await respond();h.click('อ่านรายการ Plan ใหม่');await respond();
   assert.match(h.text(),/ผู้รับผิดชอบ user-2/);assert.match(h.text(),/Revision 4/);
  }
 }
});

async function s3Selected(){
 const s=setup(),c=makeCase(s);
 vm.runInContext(fs.readFileSync(new URL('../src/dengue/15-p0-22b2-case-read-integration.gs',import.meta.url),'utf8'),s.ctx);
 s.ctx.D331_P022B2_ENABLED_=true;s.ctx.D331_P022B2_REVOCATION_APPROVED_=true;
 s.ctx.D331_P022B2_APPROVED_FIELDS_=['CaseID','CaseRevision','CaseStatus'];
 s.sheets.D331AccessGrants.grid.push(grantRow(s.ctx,'dengue.case.read',50));
 s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{payload:{TriggerCaseID:c,EpisodeKey:'EP-S3'}}));
 const h=planClient(),settle=()=>new Promise(resolve=>setImmediate(resolve));
 const serve=req=>plain(s.ctx[req.args[0]](...plain(req.args.slice(1))));
 h.ctx.d331F02CaseRead_.select(EVENT);h.requests.at(-1).resolve(serve(h.requests.at(-1)));await settle();
 h.select();return {h,settle,serve};
}
test('F03 S3 tampered actual server Plan lists are rejected by the registered client',async()=>{
 for(const change of [v=>{v.patient='PRIVATE_SENTINEL';},v=>{v.plans[0].email='PRIVATE_SENTINEL';},
  v=>{v.eventId=uid(12);},v=>{v.caseRevision=2;},v=>{v.plans[0].triggerCaseId=uid(13);}]){
  const {h,settle,serve}=await s3Selected(),req=h.requests.at(-1),value=serve(req);
  change(value);req.resolve(value);await settle();
  assert.match(h.text(),/ไม่สามารถยืนยัน/);assert.doesNotMatch(h.text(),/EP-S3|PRIVATE_SENTINEL/);
 }
 const {h,settle,serve}=await s3Selected(),req=h.requests.at(-1);
 req.resolve(serve(req));await settle();assert.match(h.text(),/EP-S3/);
});
test('F03 S3 a late actual server read cannot complete a newer Plan read',async()=>{
 const {h,settle,serve}=await s3Selected(),stale=h.requests.at(-1),value=serve(stale);
 h.click('ปิด Plans');h.select();const fresh=h.requests.at(-1);assert.notEqual(fresh,stale);
 stale.resolve(value);await settle();
 assert.match(h.text(),/กำลังโหลด Plans/);assert.doesNotMatch(h.text(),/EP-S3/);
 fresh.resolve(serve(fresh));await settle();assert.match(h.text(),/EP-S3/);
});
test('F03 S3 a late actual server receipt cannot clear the uncertain hold of a newer owner',async()=>{
 const {h,settle,serve}=await s3Selected(),read=h.requests.at(-1);
 read.resolve(serve(read));await settle();
 h.click('เพิ่ม Plan');h.fill('d331-f03-episode','EP-LATE');h.click('บันทึก Plan');
 const save=h.requests.at(-1),receipt=serve(save);
 h.click('ปิด Plans');h.select();const fresh=h.requests.at(-1);
 save.resolve(receipt);await settle();
 assert.doesNotMatch(h.text(),/ยืนยันการบันทึก/);
 fresh.resolve(serve(fresh));await settle();
 assert.match(h.text(),/ยังไม่ทราบผล/);assert.equal(h.requests.filter(r=>r.args[0]==='saveDenguePlan').length,1);
});

test('F03 S1 Plan reader never reads foreign Event full Plan/Case rows',()=>{
 const s=setup(),c=makeCase(s);s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c));
 const foreignCase=s.sheets.DengueCases.grid[1].slice();foreignCase[0]=uid(700);foreignCase[1]=uid(701);
 s.sheets.DengueCases.grid.push(foreignCase);
 const foreignPlan=s.sheets.DenguePlans.grid[1].slice();foreignPlan[0]=uid(702);foreignPlan[1]=uid(701);foreignPlan[2]=uid(700);
 s.sheets.DenguePlans.grid.push(foreignPlan);s.trace.reads.length=0;
 assert.equal(s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c)).plans.length,1);
 for(const [name,row,col,height,width] of s.trace.reads){
  if(['DenguePlans','DengueCases'].includes(name)&&row>1&&width>3){
   assert.equal(row,2);assert.equal(height,1);assert.equal(col,1);
  }
 }
});

test('F03 S1 ambiguous stored Plan tuple is not silently repaired or mutated',()=>{
 const s=setup(),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
 const duplicate=s.sheets.DenguePlans.grid[1].slice();duplicate[0]=uid(950);s.sheets.DenguePlans.grid.push(duplicate);
 const n=s.trace.writes.length;
 assert.throws(()=>updatePlan(s,c,p,{PlanStatus:'CLOSED'},1),/D331_WRITE_UNAVAILABLE/);
 assert.throws(()=>s.ctx.listDenguePlansForEvent(TOKEN,EVENT,request(c)),/D331_UNAVAILABLE/);
 assert.equal(s.trace.writes.length,n);
});

test('F03 S1 all child kinds block close/void until terminal, preserving child identities and history',()=>{
 for(const kind of ['survey','followup'])for(const end of ['CLOSED','VOID']){
  const s=setup(),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
  const child=s.run(kind,'create',kind==='survey'?basicSurvey(p):{PlanID:p,CheckpointKey:'DAY_3',DueAtUTC:NOW});
  const n=s.trace.writes.length;
  assert.throws(()=>updatePlan(s,c,p,{PlanStatus:end},1),/D331_WRITE_UNAVAILABLE/);assert.equal(s.trace.writes.length,n);
  s.run(kind,'update',kind==='survey'?{SurveyStatus:'FINAL'}:{FollowupStatus:'COMPLETE',OutcomeCode:'DONE'},
   {entityId:child.entityId,expectedEntityRevision:1});
  const sheet=s.sheets[kind==='survey'?'DengueEntomology':'DengueFollowups'],before=plain(sheet.grid);
  assert.equal(updatePlan(s,c,p,{PlanStatus:end},1).revision,2);assert.deepEqual(plain(sheet.grid),before);
 }
});

test('F03 S1 missing/duplicate/foreign/VOID Case and changed Plan scope fail before durable mutation',()=>{
 const changes=[s=>{s.sheets.DengueCases.grid.splice(1);},
  s=>{s.sheets.DengueCases.grid.push(s.sheets.DengueCases.grid[1].slice());},
  s=>{s.sheets.DengueCases.grid[1][1]=uid(4000);},
  s=>{s.sheets.DengueCases.grid[1][2]=2;},
  s=>{s.sheets.DengueCases.grid[1][3]='VOID';},
  s=>{s.sheets.DenguePlans.grid[1][7]='area-B';},
  s=>{s.sheets.DenguePlans.grid[1][2]=uid(4001);}];
 for(const change of changes){
  const s=setup(),c=makeCase(s),p=s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c)).planId;
  updatePlan(s,c,p,{PlanStatus:'CLOSED'},1);change(s);const n=s.trace.writes.length;
  assert.throws(()=>updatePlan(s,c,p,{PlanStatus:'OPEN'},2),/D331_WRITE_UNAVAILABLE/);
  assert.throws(()=>s.ctx.saveDenguePlan(TOKEN,EVENT,planCommand(c,{requestId:uid(4002),
   payload:{TriggerCaseID:c,EpisodeKey:'EP2'}})),/D331_WRITE_UNAVAILABLE/);
  assert.equal(s.trace.writes.length,n);
 }
});
