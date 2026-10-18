import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const paths=[
 '../src/server/00-bootstrap.gs',
 '../src/dengue/00-g1a-foundation.gs',
 '../src/dengue/03-n1b1-trusted-event-contract.gs',
 '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
 '../src/dengue/09-p0-03b-dev-readonly-adapter.gs',
 '../src/dengue/10-p0-05-v2-schema-compat.gs',
 '../src/dengue/11-p0-06-offline-workflow-engine.gs',
 '../src/dengue/12-p0-07-guarded-dev-crud.gs'
];
const sources=paths.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const uid=n=>n.toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111';
const EVENT=uid(99);
const TOKEN='11111111-1111-4111-8111-111111111111.22222222-2222-4222-8222-222222222222';
const DB='MOCK_VALID_DEV_SHEET_ID_0123456789012';
const POLICY='TEST-POLICY-1';
const NOW='2026-10-18T00:00:00.000Z';
const TAG='a'.repeat(64);
const kinds=['case','plan','action','survey','followup'];
function scriptCtx(){
 const ctx=vm.createContext({});
 sources.forEach((s,i)=>vm.runInContext(s,ctx,{filename:paths[i]}));
 ctx.sessionCredentialTag_=h=>h==='TEST_ONLY_HASH'?TAG:'b'.repeat(64);
 ctx.passwordConstantEqual_=(a,b)=>a===b;
 return ctx;
}
function grantRow(ctx,cap,i){
 const obj={
   SchemaVersion:1,GrantID:'grant-'+i,UserID:'user-1',
   Capability:cap,AreaID:'area-A',EventID:EVENT,State:'ACTIVE',
   ValidFromUTC:'2025-01-01T00:00:00.000Z',
   ExpiresAtUTC:'2090-01-01T00:00:00.000Z',
   GrantRevision:1,PolicyRevision:POLICY,
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
 const ctx=scriptCtx();
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
  return {tryLock:()=>!options.lockFails,releaseLock:()=>{trace.release++;}};
 }};
 ctx.Utilities={DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
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
 assert.match(sources.at(-1),/D331_P007_ENABLED_ = false/);
 assert.match(sources[1],/D331_G1A_ENABLED = false/);
 assert.match(sources[4],/D331_P003B_ENABLED_ = false/);
 assert.match(sources.at(-1),/LockService.getScriptLock\(\)/);
 assert.doesNotMatch(sources.at(-1),/\.deleteRow\(|deleteSheet\(|getDb_\(/);
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
