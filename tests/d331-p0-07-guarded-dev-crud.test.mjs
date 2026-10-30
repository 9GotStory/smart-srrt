import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {inspectF02DevPackage} from '../tools/d331-f02-dev-package.mjs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const paths=[
 '../src/server/00-bootstrap.gs',
 '../src/server/01-schema-and-db.gs',
 '../src/dengue/00-g1a-foundation.gs',
 '../src/dengue/03-n1b1-trusted-event-contract.gs',
 '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
 '../src/dengue/09-p0-03b-dev-readonly-adapter.gs',
 '../src/dengue/10-p0-05-v2-schema-compat.gs',
 '../src/dengue/11-p0-06-offline-workflow-engine.gs',
 '../src/dengue/12-p0-07-guarded-dev-crud.gs',
 '../src/server/03-events-and-dashboard.gs'
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
function scriptCtx(options={}){
 const ctx=vm.createContext({});
 if(options.devPackage){
  const p=inspectF02DevPackage({version:1,environment:'DEVELOPMENT_ONLY',dataClass:'SYNTHETIC_ONLY',
   sourceSha:'a'.repeat(40),scriptId:'SYNTHETIC_SCRIPT_ID_012345678901234',
   deploymentId:'SYNTHETIC_DEPLOY_ID_012345678901234',spreadsheetId:DB,priorVersion:20,
   diseaseLabels:['SYNTHETIC_DENGUE_ONLY'],policyRevision:'SYNTHETIC_F02_DEV_FIXTURE',
   caseFields:['CaseID','CaseRevision','CaseStatus']});
  for(const name of p.serverPushOrder)vm.runInContext(p.entries.get(name).toString(),ctx,{filename:name});
 }else sources.forEach((s,i)=>vm.runInContext(s,ctx,{filename:paths[i]}));
 return ctx;
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
 return {name,grid,
  getLastColumn(){return grid[0].length;},
  getLastRow(){return grid.length;},
  getRange(row,col,height,width){
   trace.reads.push([name,row,col,height,width]);
   return {
    getValues(){return grid.slice(row-1,row-1+height)
      .map(r=>r.slice(col-1,col-1+width));},
    setValues(matrix){
      if(options.failCommit&&name==='DengueRequestLedger'&&
         matrix[0][5]==='COMMITTED')throw Error('Simulated ledger commit failure');
      assert.equal(matrix.length,height);
      assert.ok(matrix.every(r=>r.length===width));
      for(let i=0;i<matrix.length;i++){
       for(let j=0;j<width;j++)grid[row+i-1][col+j-1]=matrix[i][j];
      }
      trace.writes.push({sheet:name,type:'setValues'});
    }
   };
  },
  appendRow(row){
    if(options.failDomain&&name===options.failDomain)
      throw Error('Simulated post-ledger domain failure');
    assert.equal(row.length,headers.length);
    grid.push(row.slice());
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
  UserAccounts:[['user-1','ชื่อจำลอง','fixture@example.invalid',
   'TEST_ONLY_HASH','Staff','active','','','','','','','','']],
  AreaMaster:[['area-A','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง',
   '2','หมู่บ้านจำลอง','SYN-001',true,'','']],
  D331AccessGrants:options.devPackage?['dengue.case.read','dengue.case.write'].map((cap,i)=>
    grantRow(ctx,cap,i+1,'SYNTHETIC_F02_DEV_FIXTURE')):kinds.map((kind,i)=>grantRow(ctx,
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
  return {tryLock:()=>!options.lockFails,releaseLock:()=>{trace.release++;}};
 }};
 ctx.Utilities={DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
  computeDigest:(alg,s)=>{
    assert.equal(alg,'SHA_256');
    return [...createHash('sha256').update(s).digest()];
  },
  getUuid:()=>{trace.uuids++;return uid(100+trace.uuids);}
 };
 if(!options.devPackage){
 ctx.D331_G1A_ENABLED=options.featureFlag??true;
 ctx.D331_P003B_ENABLED_=options.readFlag??true;
 ctx.D331_P007_ENABLED_=options.writeFlag??true;
 ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=options.approvedId??DB;
 ctx.D331_P003B_APPROVED_DISEASE_LABELS_=['SYNTHETIC_DENGUE_ONLY'];
 ctx.D331_P003B_APPROVED_POLICY_REVISION_=POLICY;
 }
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
function seedChain(s){
 const c=s.run('case','create',basicCase());
 const p=s.run('plan','create',{TriggerCaseID:c.entityId,EpisodeKey:'EP1'});
 const a=s.run('action','create',basicAction(p.entityId));
 const e=s.run('survey','create',basicSurvey(p.entityId));
 const f=s.run('followup','create',{PlanID:p.entityId,CheckpointKey:'DAY_3',
   DueAtUTC:NOW,LinkedActionID:a.entityId,LinkedSurveyID:e.entityId});
 return {c,p,a,e,f};
}

test('P0-07 production source stays private/unregistered/flags disabled',()=>{
 const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/12-p0-07-guarded-dev-crud/);
 assert.match(sources.at(-2),/D331_P007_ENABLED_ = false/);
 assert.match(sources[2],/D331_G1A_ENABLED = false/);
 assert.match(sources[5],/D331_P003B_ENABLED_ = false/);
 assert.match(sources.at(-2),/LockService.getScriptLock\(\)/);
 assert.doesNotMatch(sources.at(-2),/\.deleteRow\(|deleteSheet\(|getDb_\(/);
});
test('feature OFF stops before any Google service / lock access',()=>{
 const x=setup({writeFlag:false});
 deny(()=>x.run('case','create',basicCase()));
 assert.equal(x.trace.locks,0);
 assert.equal(x.trace.writes.length,0);
});
test('five-domain CREATE from trusted session/real contract shapes',()=>{
 const s=setup();const out=seedChain(s);
 for(const [key,expected] of Object.entries({c:'case',p:'plan',
   a:'action',e:'survey',f:'followup'})){
  assert.equal(out[key].status,'CREATED');
  assert.equal(out[key].kind,expected);
 }
 assert.equal(s.sheets.DengueCases.grid.length,2);
 assert.equal(s.sheets.DenguePlans.grid.length,2);
 assert.equal(s.sheets.DengueControlActions.grid.length,2);
 assert.equal(s.sheets.DengueEntomology.grid.length,2);
 assert.equal(s.sheets.DengueFollowups.grid.length,2);
 assert.equal(s.sheets.DengueRequestLedger.grid.length,6);
 assert.equal(s.sheets.DengueRequestLedger.grid[1][5],'COMMITTED');
 assert.equal(s.trace.locks,5);
 assert.equal(s.trace.release,5);
});
test('all five workflow entities support guarded UPDATE with revision',()=>{
 const s=setup();const {c,p,a,e,f}=seedChain(s);
 const statuses=[
  ['case',c,{Classification:'PROBABLE'}],
  ['plan',p,{PlanStatus:'CLOSED'}],
  ['action',a,{ActionStatus:'COMPLETED',OutcomeCode:'DONE'}],
  ['survey',e,{SurveyStatus:'FINAL'}],
  ['followup',f,{FollowupStatus:'COMPLETE',OutcomeCode:'DONE'}]
 ];
 for(const [kind,entity,payload] of statuses){
  const result=s.run(kind,'update',payload,{
    entityId:entity.entityId,expectedEntityRevision:1});
  assert.equal(result.status,'UPDATED');
  assert.equal(result.revision,2);
 }
 assert.equal(s.sheets.DengueRequestLedger.grid.length,11);
});
test('same RequestID replay is safe and creates no duplicate domain row',()=>{
 const s=setup(),id=uid(400);
 const command={requestId:id};
 const first=s.run('case','create',basicCase(),command);
 const writes=s.trace.writes.length;
 const second=s.run('case','create',basicCase(),command);
 assert.equal(second.status,'REPLAYED');
 assert.equal(second.entityId,first.entityId);
 assert.equal(s.trace.writes.length,writes);
 assert.equal(s.sheets.DengueCases.grid.length,2);
});
test('same request ID with different payload is rejected before writes',()=>{
 const s=setup(),req={requestId:uid(401)};
 s.run('case','create',basicCase(),req);
 const writes=s.trace.writes.length;
 deny(()=>s.run('case','create',{Classification:'CONFIRMED'},req));
 assert.equal(s.trace.writes.length,writes);
});
test('ledger commit failure preserves PENDING and forbids replay',()=>{
 const s=setup({failCommit:true}),req={requestId:uid(410)};
 deny(()=>s.run('case','create',basicCase(),req));
 assert.equal(s.sheets.DengueCases.grid.length,2);
 assert.equal(s.sheets.DengueRequestLedger.grid[1][5],'PENDING');
 const count=s.trace.writes.length;
 deny(()=>s.run('case','create',basicCase(),req));
 assert.equal(s.trace.writes.length,count);
 assert.equal(s.trace.release,2);
});
test('domain append failure after PENDING forbids retry',()=>{
 const s=setup({failDomain:'DengueCases'}),req={requestId:uid(412)};
 deny(()=>s.run('case','create',basicCase(),req));
 assert.equal(s.sheets.DengueCases.grid.length,1);
 assert.equal(s.sheets.DengueRequestLedger.grid[1][5],'PENDING');
 deny(()=>s.run('case','create',basicCase(),req));
});
test('stale domain revision fails without pending ledger intent',()=>{
 const s=setup();const out=s.run('case','create',basicCase());
 const n=s.trace.writes.length;
 deny(()=>s.run('case','update',{Classification:'CONFIRMED'},{
  entityId:out.entityId,expectedEntityRevision:2}));
 assert.equal(s.trace.writes.length,n);
});
test('stale MainData event revision fails before any write',()=>{
 const s=setup();deny(()=>s.run('case','create',basicCase(),{
  expectedEventRevision:4}));
 assert.equal(s.trace.writes.length,0);
});
test('invalid or unauthorized payload ownership fields rejected before locks',()=>{
 const s=setup();
 for(const payload of [{CreatedByUserID:'attacker'}, {EventID:EVENT},
  {CaseID:uid(22)}, {Classification:'=HYPERLINK("evil")'}]){
  deny(()=>s.run('case','create',payload));
 }
 assert.equal(s.trace.locks,0);
});
test('missing grant and missing/wrong schema block all writes',()=>{
 const x=setup();x.sheets.D331AccessGrants.grid.splice(1);
 deny(()=>x.run('case','create',basicCase()));
 assert.equal(x.trace.writes.length,0);
 const y=setup({missingTab:'DengueFollowups'});
 deny(()=>y.run('case','create',basicCase()));
 assert.equal(y.trace.writes.length,0);
 const z=setup({scrambleTab:'DenguePlans'});
 deny(()=>z.run('case','create',basicCase()));
 assert.equal(z.trace.writes.length,0);
});
test('pinning DB ID and lock failure prevent write',()=>{
 for(const opts of [{configuredId:null},{approvedId:''},
  {actualId:'OTHER_SHEET_ID_VALID_123456789'},
  {lockFails:true}]){
  const s=setup(opts);
  deny(()=>s.run('case','create',basicCase()));
  assert.equal(s.trace.writes.length,0);
 }
});
test('FK references must exist; action cannot be created without plan',()=>{
 const s=setup();
 deny(()=>s.run('plan','create',{TriggerCaseID:uid(7),EpisodeKey:'EP1'}));
 deny(()=>s.run('action','create',basicAction(uid(22))));
 deny(()=>s.run('survey','create',basicSurvey(uid(23))));
 deny(()=>s.run('followup','create',{
  PlanID:uid(24),CheckpointKey:'DAY_3',DueAtUTC:NOW}));
 assert.equal(s.trace.writes.length,0);
});
test('survey count guards deny numerator greater than denominator',()=>{
 const s=setup(),c=s.run('case','create',basicCase());
 const p=s.run('plan','create',{TriggerCaseID:c.entityId,EpisodeKey:'EP1'});
 const writes=s.trace.writes.length;
 deny(()=>s.run('survey','create',{...basicSurvey(p.entityId),HousesPositive:11}));
 assert.equal(s.trace.writes.length,writes);
});
test('terminal state and illegal status transition cannot be overwritten',()=>{
 const s=setup(),c=s.run('case','create',basicCase());
 const updated=s.run('case','update',{CaseStatus:'VOID'},
  {entityId:c.entityId,expectedEntityRevision:1});
 assert.equal(updated.revision,2);
 deny(()=>s.run('case','update',{Classification:'CONFIRMED'},
  {entityId:c.entityId,expectedEntityRevision:2}));
 const c2=s.run('case','create',basicCase());
 deny(()=>s.run('case','update',{CaseStatus:'ACTIVE'},
  {entityId:c2.entityId,expectedEntityRevision:1}));
});
test('closed event cannot receive new D331 write even with active grant',()=>{
 const s=setup({eventStatus:'closed'});
 deny(()=>s.run('case','create',basicCase()));
 assert.equal(s.trace.writes.length,0);
});
test('no user-supplied role, grants, due clock policy or hard delete operations',()=>{
 const s=setup();
 deny(()=>s.run('case','delete',{}, {entityId:uid(99)}));
 deny(()=>s.run('case','create',basicCase(),{role:'admin'}));
 deny(()=>s.run('case','create',basicCase(),{approvedGrant:true}));
 deny(()=>s.run('followup','create',{
   PlanID:uid(11),CheckpointKey:'DAY_3'}));
 assert.equal(s.trace.writes.length,0);
});

test('F02-W public source interfaces deny OFF before any services',()=>{
 const s=setup({featureFlag:false});
 assert.equal(typeof s.ctx.saveDengueCase,'function');
 assert.equal(typeof s.ctx.getDengueCaseWriteStatus,'function');
 assert.throws(()=>s.ctx.saveDengueCase(TOKEN,EVENT,{}),/D331_WRITE_UNAVAILABLE/);
 assert.throws(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(450)),/D331_WRITE_UNAVAILABLE/);
 assert.equal(s.trace.locks,0);assert.equal(s.trace.opens,0);
});
test('F02-W unresolved PENDING Case intent also blocks a different request ID',()=>{
 for(const opts of [{failDomain:'DengueCases'},{failCommit:true}]){
  const s=setup(opts);
  deny(()=>s.run('case','create',basicCase(),{requestId:uid(451)}));
  const n=s.trace.writes.length;
  deny(()=>s.run('case','create',basicCase(),{requestId:uid(452)}));
  assert.equal(s.trace.writes.length,n);
 }
});
const plain=value=>JSON.parse(JSON.stringify(value));
const caseCommand=(more={})=>({mode:'create',requestId:uid(460),expectedEventRevision:3,
 payload:{Classification:'SUSPECTED',ReportingUnit:'SYNTHETIC_UNIT'},...more});
test('F02-W actual save/create, explicit patch, replay and authorized receipt disclose only identity',()=>{
 const s=setup(),c=caseCommand();
 const first=plain(s.ctx.saveDengueCase(TOKEN,EVENT,c));
 assert.deepEqual(first,{contractVersion:'D331_CASE_WRITE_V1',eventId:EVENT,requestId:c.requestId,
  status:'CREATED',caseId:uid(101),revision:1});
 const replay=plain(s.ctx.saveDengueCase(TOKEN,EVENT,c));
 assert.deepEqual(replay,{contractVersion:'D331_CASE_WRITE_V1',eventId:EVENT,requestId:c.requestId,
  status:'REPLAYED',caseId:first.caseId});
 const patch=caseCommand({mode:'update',requestId:uid(461),entityId:first.caseId,
  expectedEntityRevision:1,payload:{Classification:'PROBABLE'}});
 assert.equal(s.ctx.saveDengueCase(TOKEN,EVENT,patch).revision,2);
 const row=s.ctx.d331P007Object_('DengueCases',s.sheets.DengueCases.grid[1]);
 assert.equal(row.ReportingUnit,'SYNTHETIC_UNIT');
 const before=s.trace.writes.length;
 assert.deepEqual(plain(s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,c.requestId)),{
  contractVersion:'D331_CASE_WRITE_RECEIPT_V1',eventId:EVENT,requestId:c.requestId,
  status:'COMMITTED',caseId:first.caseId});
 assert.deepEqual(plain(s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(462))),{
  contractVersion:'D331_CASE_WRITE_RECEIPT_V1',eventId:EVENT,requestId:uid(462),status:'NOT_FOUND'});
 assert.equal(s.trace.writes.length,before);
});

test('F02-W public command excludes other domains/status/identity, bad values and stale/no-op writes',()=>{
 const s=setup(),first=s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand());
 const n=s.trace.writes.length;
 for(const cmd of [caseCommand({kind:'plan'}),caseCommand({role:'Admin'}),
  caseCommand({payload:{CaseStatus:'VOID'}}),caseCommand({payload:{EventID:EVENT}}),
  caseCommand({payload:{CaseID:uid(33)}}),caseCommand({payload:{CreatedByUserID:'user-1'}}),
  caseCommand({payload:{Classification:'=1+1'}}),caseCommand({payload:{ReportingUnit:'-1+1'}}),
  caseCommand({payload:{ReportingUnit:5}}),caseCommand({payload:{Classification:'NOPE'}}),
  caseCommand({payload:{OnsetLocalDate:'2026-02-30'}}),caseCommand({payload:{ReceivingUnit:'x'.repeat(257)}}),
  caseCommand({payload:{ReportingUnit:' leading'}}),caseCommand({payload:{}}),
  caseCommand({mode:'delete'}),caseCommand({expectedEventRevision:4}),
  caseCommand({mode:'update',entityId:first.caseId,expectedEntityRevision:2,payload:{Classification:'PROBABLE'}}),
  caseCommand({mode:'update',entityId:first.caseId,expectedEntityRevision:1,payload:{Classification:'SUSPECTED'}})]){
  deny(()=>s.ctx.saveDengueCase(TOKEN,EVENT,{...cmd,requestId:uid(480)}));
  assert.equal(s.trace.writes.length,n);
 }
});
function changeGrant(s,key,value){const h=Array.from(s.ctx.d331P002aHeaders_('D331AccessGrants'));
 s.sheets.D331AccessGrants.grid[1][h.indexOf(key)]=value;}
test('F02-W both operations reauthorize current session/user/Event/Area/grant and binding',()=>{
 const changes=[s=>{s.ctx.CacheService.getScriptCache=()=>({get:()=>null});},
  s=>{s.sheets.UserAccounts.grid[1][3]='CHANGED_HASH';},
  s=>{s.sheets.UserAccounts.grid[1][5]='inactive';},
  s=>{s.sheets.UserAccounts.grid.push(s.sheets.UserAccounts.grid[1].slice());},
  s=>{s.sheets.MainData.grid.push(s.sheets.MainData.grid[1].slice());},
  s=>{s.sheets.MainData.grid[1][32]='closed';},s=>{s.sheets.MainData.grid[1][32]='void';},
  s=>{s.sheets.MainData.grid[1][5]='UNAPPROVED_DISEASE';},
  s=>{s.sheets.AreaMaster.grid[1][7]=false;},
  s=>{s.sheets.AreaMaster.grid.push(s.sheets.AreaMaster.grid[1].slice());},
  s=>{s.sheets.D331AccessGrants.grid.splice(1);},
  s=>{s.sheets.D331AccessGrants.grid.push(s.sheets.D331AccessGrants.grid[1].slice());},
  s=>changeGrant(s,'State','REVOKED'),s=>changeGrant(s,'ExpiresAtUTC','2020-01-01T00:00:00.000Z'),
  s=>changeGrant(s,'ApprovedByUserID','user-1'),s=>changeGrant(s,'PolicyRevision','OTHER'),
  s=>changeGrant(s,'AreaID','area-B'),s=>changeGrant(s,'EventID',uid(7)),
  s=>{s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:()=>null});}];
 for(const change of changes){
  const s=setup();s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand());change(s);
  const n=s.trace.writes.length;
  deny(()=>s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand({requestId:uid(481)})));
  deny(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(460)));
  assert.equal(s.trace.writes.length,n);
 }
});
test('F02-W receipt lookup rejects foreign owner/Event/capability, duplicate or malformed ledger',()=>{
 for(const [index,value] of [[1,uid(8)],[2,'user-2'],[3,'dengue.plan.write'],[6,'PLAN'],[7,'bad-id'],[5,'BOGUS']]){
  const s=setup();s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand());
  s.sheets.DengueRequestLedger.grid[1][index]=value;
  deny(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(460)));
 }
 const s=setup();s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand());
 s.sheets.DengueRequestLedger.grid.push(s.sheets.DengueRequestLedger.grid[1].slice());
 deny(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(460)));
 for(const id of ['',null,{},'bad-id',uid(460).toUpperCase()])
  deny(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,id));
});
test('F02-W interrupted server writes expose only PENDING and retain Event barrier',()=>{
 for(const opts of [{failDomain:'DengueCases'},{failCommit:true}]){
  const s=setup(opts);deny(()=>s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand()));
  assert.deepEqual(plain(s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(460))),{
   contractVersion:'D331_CASE_WRITE_RECEIPT_V1',eventId:EVENT,requestId:uid(460),status:'PENDING'});
  const n=s.trace.writes.length;deny(()=>s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand({requestId:uid(482)})));
  assert.equal(s.trace.writes.length,n);
 }
});


// S3 uses the same actual writer fixture and manifest-loaded client. Only DOM/RPC I/O is synthetic.
function writeClient(){
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
  'D331_F02_CASE_READ_AVAILABLE_=true;D331_F02_CASE_WRITE_AVAILABLE_=true;',ctx);
 const root=doc.getElementById('d331-f02-write-region');
 function walk(n){return [n,...n.children.flatMap(walk)];}
 return {ctx,requests,click(label){const n=walk(root).find(n=>n.tagName==='button'&&n.textContent===label);
   assert.ok(n,label);assert.ok(!n.disabled);n.fire('click');},
  fill(id,value){const n=walk(root).find(n=>n.id===id);assert.ok(n);n.value=value;n.fire('input');},
  text:()=>walk(root).map(n=>n.textContent).join('|')};
}
test('F02-W S3 serialized actual server save/status/read results cross the registered client boundary',async()=>{
 for(const opts of [{},{failCommit:true},{failDomain:'DengueCases'}]){
  const s=setup(opts);
  vm.runInContext(fs.readFileSync(new URL('../src/dengue/15-p0-22b2-case-read-integration.gs',import.meta.url),'utf8'),s.ctx);
  s.ctx.D331_P022B2_ENABLED_=true;s.ctx.D331_P022B2_REVOCATION_APPROVED_=true;
  s.ctx.D331_P022B2_APPROVED_FIELDS_=['CaseID','CaseRevision','CaseStatus'];
  const grant=grantRow(s.ctx,'dengue.case.read',20);s.sheets.D331AccessGrants.grid.push(grant);
  const h=writeClient(),settle=()=>new Promise(resolve=>setImmediate(resolve));
  async function respond(){const req=h.requests.at(-1),[name,...args]=req.args;
   try{req.resolve(plain(s.ctx[name](...plain(args))));}catch(e){req.reject(new Error(e.message));}
   await settle();}
  h.ctx.d331F02CaseRead_.select(EVENT);await respond();
  h.click('เพิ่ม Case');h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');await respond();
  if(opts.failCommit||opts.failDomain){
   assert.match(h.text(),/ยังไม่ทราบผล/);h.click('ตรวจสอบสถานะคำขอ');await respond();
   assert.match(h.text(),/ยังไม่ทราบผล/);assert.doesNotMatch(h.text(),/PayloadDigest|TEST_ONLY_HASH/);
  }else assert.match(h.text(),/ยืนยันการบันทึก/);
  h.click('อ่านรายการ Case ใหม่');await respond();
  const read=plain(h.ctx.d331F02CaseRead_.snapshot());
  assert.equal(read.status,opts.failDomain?'EMPTY':'READY');
  assert.equal(read.cases.length,opts.failDomain?0:1);
  if(!opts.failDomain)assert.deepEqual(read.cases,[{caseId:uid(101),caseRevision:1,caseStatus:'ACTIVE'}]);
  if(opts.failCommit||opts.failDomain)assert.match(h.text(),/ยังไม่ทราบผล/);
  assert.equal(h.requests.filter(r=>r.args[0]==='saveDengueCase').length,1);
 }
});

test('F02-W partial dependencies and missing approval pins deny before services',()=>{
 for(const mutation of [s=>{s.ctx.d331P003bSessionUser_=undefined;},s=>{s.ctx.d331P005RequireSevenSheets_=undefined;},
  s=>{s.ctx.d331N1bAuthorizeOffline_=undefined;},s=>{s.ctx.d331P002aValidateSyntheticRow_=undefined;},
  s=>{s.ctx.D331_P003B_APPROVED_POLICY_REVISION_='';},s=>{s.ctx.D331_P003B_APPROVED_DISEASE_LABELS_=[];},
  s=>{s.ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_='';},s=>{s.ctx.D331_P003B_ENABLED_=false;}]){
  const s=setup();mutation(s);
  deny(()=>s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand()));
  deny(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(460)));
  assert.equal(s.trace.locks,0);assert.equal(s.trace.properties,0);assert.equal(s.trace.opens,0);
 }
});


test('F02 DEV S2 actual activated package reads/creates/PATCHes/status with narrow current grants',()=>{
 const s=setup({devPackage:true});
 const read=()=>plain(s.ctx.listDengueCasesForEvent(TOKEN,EVENT));
 assert.equal(read().cases.length,0);
 const created=plain(s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand()));
 assert.equal(created.status,'CREATED');assert.equal(created.revision,1);
 assert.deepEqual(read().cases,[{caseId:created.caseId,caseRevision:1,caseStatus:'ACTIVE'}]);
 const updated=plain(s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand({mode:'update',requestId:uid(490),
  entityId:created.caseId,expectedEntityRevision:1,payload:{Classification:'PROBABLE'}})));
 assert.equal(updated.revision,2);assert.equal(read().cases[0].caseRevision,2);
 const receipt=plain(s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(490)));
 assert.deepEqual(receipt,{contractVersion:'D331_CASE_WRITE_RECEIPT_V1',eventId:EVENT,
  requestId:uid(490),status:'COMMITTED',caseId:created.caseId});
 const n=s.trace.writes.length;
 deny(()=>s.run('plan','create',{TriggerCaseID:created.caseId,EpisodeKey:'EP1'}));
 assert.equal(s.trace.writes.length,n);
});
test('F02 DEV S2 actual package denies binding drift and revoked grants for both read and write',()=>{
 for(const change of [s=>{s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:()=>null});},
  s=>{s.sheets.D331AccessGrants.grid.splice(1);},s=>{s.sheets.MainData.grid[1][32]='closed';}]){
  const s=setup({devPackage:true});change(s);
  assert.throws(()=>s.ctx.listDengueCasesForEvent(TOKEN,EVENT),/D331_UNAVAILABLE/);
  deny(()=>s.ctx.saveDengueCase(TOKEN,EVENT,caseCommand()));
  deny(()=>s.ctx.getDengueCaseWriteStatus(TOKEN,EVENT,uid(490)));
  assert.equal(s.trace.writes.length,0);
 }
});
