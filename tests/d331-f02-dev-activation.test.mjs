import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectNative33Candidate,preparePrivateStage} from '../tools/d331-p0-11-native33-package.mjs';
import {GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MODULE=new URL('../tools/d331-f02-dev-package.mjs',import.meta.url);
const SCRIPT='SYNTHETIC_SCRIPT_ID_012345678901234';
const DEPLOY='SYNTHETIC_DEPLOY_ID_012345678901234';
const DB='SYNTHETIC_WORKBOOK_ID_012345678901234';
const SHA='a'.repeat(40);
// Deployed Version 22 source (from Version 21) and the retired Version 21 frontier.
const V22_SHA='17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946',OLD_F02_SHA='6257851296e949e88777c4a8e86aa83c9d22a399';
const profile=(more={})=>({version:1,environment:'DEVELOPMENT_ONLY',dataClass:'SYNTHETIC_ONLY',
 sourceSha:SHA,scriptId:SCRIPT,deploymentId:DEPLOY,spreadsheetId:DB,priorVersion:20,
 diseaseLabels:['SYNTHETIC_DENGUE_ONLY'],policyRevision:'SYNTHETIC_F02_DEV_20261030_V1',
 caseFields:['CaseID','CaseRevision','CaseStatus'],...more});
const expected=p=>Object.fromEntries(['sourceSha','scriptId','deploymentId','spreadsheetId','priorVersion'].map(k=>[k,p[k]]));
const hold=fn=>assert.throws(fn,/D331_F02_DEV_HOLD/);
const READER='15-p0-22b2-case-read-integration.gs',PLANS='16-f03-plan-workflow.gs',RECORDS='03h-client-event-records.html';
const PLAN_RPCS=['listDenguePlansForEvent','listAssignableDenguePlanOwners','saveDenguePlan','getDenguePlanWriteStatus'];
const CLIENT_FLAGS=['D331_F02_CASE_READ_AVAILABLE_','D331_F02_CASE_WRITE_AVAILABLE_','D331_F03_PLANS_AVAILABLE_'];
const plain=value=>JSON.parse(JSON.stringify(value));
function loadServer(files){
 const ctx=vm.createContext({});
 for(const [file,code] of files)vm.runInContext(code,ctx,{filename:file});
 return ctx;
}
function evaluated(entries,order){
 const server=loadServer(order.map(n=>[n,entries.get(n).toString()])),client=vm.createContext({});
 for(const [,code] of entries.get(RECORDS).toString().matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi))
  vm.runInContext(code,client,{filename:RECORDS});
 return {server,client};
}

test('F03 DEV S1 candidate appends the Plan workflow after the Case reader and switches on only the separate package',async()=>{
 const {inspectF02DevPackage}=await import(MODULE);
 const p=inspectF02DevPackage(profile());
 assert.equal(p.entries.size,35);assert.equal(p.serverPushOrder.length,17);
 assert.deepEqual(p.serverPushOrder.slice(-2),[READER,PLANS]);
 const {server,client}=evaluated(p.entries,p.serverPushOrder);
 for(const flag of ['D331_G1A_ENABLED','D331_P003B_ENABLED_','D331_P007_ENABLED_','D331_P022B2_ENABLED_',
  'D331_P022B2_REVOCATION_APPROVED_','D331_F03_ENABLED_','D331_F03_SCOPE_APPROVED_'])assert.equal(server[flag],true,flag);
 assert.equal(server.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_,DB);
 assert.deepEqual(plain(server.D331_P003B_APPROVED_DISEASE_LABELS_),['SYNTHETIC_DENGUE_ONLY']);
 assert.equal(server.D331_P003B_APPROVED_POLICY_REVISION_,'SYNTHETIC_F02_DEV_20261030_V1');
 assert.deepEqual(plain(server.D331_P022B2_APPROVED_FIELDS_),['CaseID','CaseRevision','CaseStatus']);
 assert.equal(server.D331_P002A_APPROVAL_,'DRAFT_ONLY');
 for(const name of ['listDengueCasesForEvent','saveDengueCase','getDengueCaseWriteStatus',...PLAN_RPCS])
  assert.equal(typeof server[name],'function',name);
 assert.throws(()=>server.saveDengueCase('no-session','not-an-event',{}),/D331_WRITE_UNAVAILABLE/);
 assert.throws(()=>server.saveDenguePlan('no-session','not-an-event',{}),/D331_WRITE_UNAVAILABLE/);
 for(const flag of CLIENT_FLAGS)assert.equal(client[flag],true,flag);
});

test('F03 DEV S1 Native33 inspection keeps 33 files, no Plan workflow and every declaration OFF',()=>{
 const base=inspectNative33Candidate();
 assert.equal(base.entries.size,33);assert.equal(base.entries.has(READER),false);assert.equal(base.entries.has(PLANS),false);
 const {server,client}=evaluated(base.entries,base.serverPushOrder);
 for(const flag of ['D331_G1A_ENABLED','D331_P003B_ENABLED_','D331_P007_ENABLED_'])assert.equal(server[flag],false,flag);
 assert.equal(server.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_,'');
 assert.equal(server.D331_F03_ENABLED_,undefined);assert.equal(server.D331_F03_SCOPE_APPROVED_,undefined);
 for(const flag of CLIENT_FLAGS)assert.equal(client[flag],false,flag);
});

test('F02 DEV profile rejects non-synthetic, broad, malformed and credential-bearing activation',async()=>{
 const {inspectF02DevPackage}=await import(MODULE);
 for(const patch of [{dataClass:'REAL_DATA'},{environment:'PRODUCTION'},{version:2},
  {sourceSha:'main'},{spreadsheetId:SCRIPT},{scriptId:'bad'},
  {priorVersion:0},{priorVersion:'20'},{diseaseLabels:['ไข้เลือดออก']},
  {caseFields:['CaseID','PatientName']},{policyRevision:'APPROVED_CLINICAL'},
  {sessionToken:'PRIVATE_SENTINEL'},{password:'PRIVATE_SENTINEL'}])hold(()=>inspectF02DevPackage(profile(patch)));
});

function snapshot(){
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-f02-dev-'));fs.chmodSync(work,0o700);
 const remote=path.join(work,'remote');fs.mkdirSync(remote,{mode:0o700});
 const p=inspectNative33Candidate();
 for(const [name,bytes] of p.entries)fs.writeFileSync(path.join(remote,name),bytes,{mode:0o600});
 fs.writeFileSync(path.join(remote,'appsscript.json'),'{"runtimeVersion":"V8","timeZone":"Asia/Bangkok"}\n',{mode:0o600});
 fs.writeFileSync(path.join(remote,'.clasp.json'),JSON.stringify({scriptId:SCRIPT,rootDir:'.',scriptExtensions:['.gs'],htmlExtensions:['.html']}),{mode:0o600});
 preparePrivateStage(work,{manifestFrom:path.join(remote,'appsscript.json')});
 const order=JSON.parse(fs.readFileSync(path.join(work,'file-push-order.json')));
 fs.writeFileSync(path.join(work,'.clasp.json'),JSON.stringify({scriptId:SCRIPT,rootDir:'stage',filePushOrder:order}),{mode:0o600});
 fs.writeFileSync(path.join(work,'source-sha.txt'),SHA+'\n',{mode:0o600});
 fs.writeFileSync(path.join(work,'deployments.before.txt'),'Found 2 deployments.\n- '+DEPLOY+' @20 - Existing synthetic DEV\n- SYNTHETIC_HEAD_ID_012345678901234 @HEAD\n',{mode:0o600});
 fs.writeFileSync(path.join(work,'versions.before.txt'),'20 - Existing synthetic DEV\n',{mode:0o600});
 const archive='rollback-source-and-metadata.tgz';
 const r=spawnSync('tar',['-czf',path.join(work,archive),'-C',work,'remote','deployments.before.txt','versions.before.txt','source-sha.txt'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 fs.chmodSync(path.join(work,archive),0o600);
 const hash=createHash('sha256').update(fs.readFileSync(path.join(work,archive))).digest('hex');
 fs.writeFileSync(path.join(work,archive+'.sha256'),hash+'  '+archive+'\n',{mode:0o600});
 return {work,remote,cleanup:()=>fs.rmSync(work,{recursive:true,force:true})};
}
test('F03 DEV S1 fresh private stage binds exact profile/SHA/backup and preserves original manifest',async()=>{
 const {prepareF02DevStage,verifyF02DevStage}=await import(MODULE),f=snapshot(),p=profile();
 try{
  assert.equal(prepareF02DevStage({work:f.work,profile:p,expected:expected(p)}).sourceFiles,35);
  const result=verifyF02DevStage({work:f.work,expected:expected(p)});
  assert.equal(result.sourceFiles,35);assert.equal(result.manifestPreserved,true);
  assert.equal(fs.readdirSync(path.join(f.work,'f02-stage')).length,36);
  assert.deepEqual(fs.readFileSync(path.join(f.work,'f02-stage/appsscript.json')),fs.readFileSync(path.join(f.remote,'appsscript.json')));
  const order=JSON.parse(fs.readFileSync(path.join(f.work,'f02.clasp.json'))).filePushOrder;
  assert.equal(order.length,17);assert.deepEqual(order.slice(-2),['f02-stage/'+READER,'f02-stage/'+PLANS]);
  hold(()=>prepareF02DevStage({work:f.work,profile:p,expected:expected(p)}));
  assert.equal(fs.readFileSync(path.join(f.work,'stage/00-g1a-foundation.gs'),'utf8').includes('D331_G1A_ENABLED = false'),true);
 }finally{f.cleanup();}
});

test('F03 DEV S1 stage rejects changed target/SHA/version, source/manifest/config drift and unsafe files',async()=>{
 const {prepareF02DevStage,verifyF02DevStage}=await import(MODULE);
 const changes=[
  f=>fs.appendFileSync(path.join(f.work,'f02-stage/03-events-and-dashboard.gs'),'//tamper'),
  f=>fs.appendFileSync(path.join(f.work,'f02-stage/'+PLANS),'//tamper'),
  f=>fs.writeFileSync(path.join(f.work,'f02-stage/appsscript.json'),'{"runtimeVersion":"V8","oauthScopes":["changed"]}'),
  f=>fs.writeFileSync(path.join(f.work,'f02-stage/extra.gs'),'x'),
  f=>fs.writeFileSync(path.join(f.work,'f02.clasp.json'),'{}'),
  f=>fs.chmodSync(path.join(f.work,'f02-profile.json'),0o644),
  f=>fs.writeFileSync(path.join(f.work,'f02.claspignore'),'**/03-events-and-dashboard.gs'),
  f=>fs.appendFileSync(path.join(f.work,'rollback-source-and-metadata.tgz'),'tamper'),
  f=>{fs.unlinkSync(path.join(f.work,'f02-stage/00-bootstrap.gs'));fs.symlinkSync(path.join(f.remote,'00-bootstrap.gs'),path.join(f.work,'f02-stage/00-bootstrap.gs'));}
 ];
 for(const change of changes){const f=snapshot(),p=profile();try{
  prepareF02DevStage({work:f.work,profile:p,expected:expected(p)});change(f);
  hold(()=>verifyF02DevStage({work:f.work,expected:expected(p)}));
 }finally{f.cleanup();}}
 const f=snapshot(),p=profile();try{
  for(const patch of [{sourceSha:'b'.repeat(40)},{priorVersion:21},{scriptId:DB},{spreadsheetId:SCRIPT}])
   hold(()=>prepareF02DevStage({work:f.work,profile:p,expected:{...expected(p),...patch}}));
  assert.equal(fs.existsSync(path.join(f.work,'f02-stage')),false);
 }finally{f.cleanup();}
});

// S2: the prepared stage's server bytes with synthetic Google services; no real workbook, session or grant.
const uid=n=>n.toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111';
const EVENT=uid(99),TAG=createHash('sha256').update('TEST_ONLY_HASH').digest('hex');
const ADMIN=uid(1)+'.'+uid(2),MANAGER=uid(3)+'.'+uid(4),NO_PLAN=uid(5)+'.'+uid(6);
let stagedServer;
async function stagedServerFiles(){
 if(!stagedServer){
  const {prepareF02DevStage}=await import(MODULE),f=snapshot(),p=profile();
  try{
   prepareF02DevStage({work:f.work,profile:p,expected:expected(p)});
   stagedServer=JSON.parse(fs.readFileSync(path.join(f.work,'f02.clasp.json'))).filePushOrder
    .map(file=>[file,fs.readFileSync(path.join(f.work,file),'utf8')]);
  }finally{f.cleanup();}
 }
 return stagedServer;
}
function syntheticGoogle(ctx){
 const trace={opens:0};let uuids=0,grants=0;
 const headers={MainData:[...ctx.MAIN_HEADERS,...ctx.EVENT_META_HEADERS,'OwnerUserID'],
  UserAccounts:[...ctx.D331_P003B_USER_HEADERS_],AreaMaster:[...ctx.D331_P003B_AREA_HEADERS_],
  SystemSettings:['Key','Value','Description','UpdatedAt','UpdatedBy']};
 for(const name of ctx.D331_P005_V2_TABS_)headers[name]=[...ctx.d331P002aHeaders_(name)];
 const event=Array(39).fill('');
 Object.assign(event,{5:'SYNTHETIC_DENGUE_ONLY',9:'2',10:'ตำบลจำลอง',11:'อำเภอจำลอง',12:'จังหวัดจำลอง',
  28:'หมู่บ้านจำลอง',29:'SYN-001',30:EVENT,31:3,32:'active',38:'admin-1'});
 const user=(id,role)=>[id,'ผู้ทดสอบจำลอง',id+'@example.invalid','TEST_ONLY_HASH',role,'active','','','','','','','',''];
 const grant=(userId,capability)=>{grants++;const g={SchemaVersion:1,GrantID:'grant-'+grants,UserID:userId,
  Capability:capability,AreaID:'area-A',EventID:EVENT,State:'ACTIVE',ValidFromUTC:'2025-01-01T00:00:00.000Z',
  ExpiresAtUTC:'2090-01-01T00:00:00.000Z',GrantRevision:1,PolicyRevision:'SYNTHETIC_F02_DEV_20261030_V1',
  RequestedByUserID:'issuer-1',RequestedAtUTC:'2025-01-01T00:00:00.000Z',ApprovedByUserID:'approver-1',
  ApprovedAtUTC:'2025-01-02T00:00:00.000Z',IssuedByUserID:'issuer-1',IssuedAtUTC:'2025-01-02T00:00:00.000Z',
  UpdatedAtUTC:'2025-01-02T00:00:00.000Z',RevokedByUserID:'',RevokedAtUTC:'',RevocationReasonCode:'',
  MutationID:uid(200+grants)};return headers.D331AccessGrants.map(h=>g[h]);};
 const tester=['dengue.case.read','dengue.plan.read','dengue.plan.write'];
 const rows={MainData:[event],SystemSettings:[['SYSTEM_STATUS','open','','','']],
  UserAccounts:[user('admin-1','Admin'),user('manager-1','Manager'),user('no-plan-1','Admin')],
  AreaMaster:[['area-A','จังหวัดจำลอง','อำเภอจำลอง','ตำบลจำลอง','2','หมู่บ้านจำลอง','SYN-001',true,'','']],
  D331AccessGrants:[...tester.map(c=>grant('admin-1',c)),...tester.map(c=>grant('manager-1',c)),
   grant('no-plan-1','dengue.case.read')]};
 // Models Sheets turning date- and number-like text into values unless the cell is formatted as text.
 function coerce(name,column,text){
  if(name==='DengueCases'&&column==='OnsetLocalDate'||name==='DenguePlans'&&column==='EpisodeKey'){
   if(/^\d{4}-\d{2}-\d{2}$/.test(text))return new Date(text+'T00:00:00+07:00');
   if(name==='DenguePlans'&&/^\d+$/.test(text))return Number(text);
  }
  return text;
 }
 function sheet(name){
  const grid=[headers[name],...(rows[name]||[])],plainText=new Set();
  const store=(value,row,col)=>typeof value==='string'&&!plainText.has(row+':'+col)?
   coerce(name,headers[name][col-1],value):value;
  return {grid,getLastColumn:()=>grid[0].length,getLastRow:()=>grid.length,
   getParent:()=>({getId:()=>DB,getSpreadsheetTimeZone:()=>'Asia/Bangkok'}),
   getDataRange:()=>({getValues:()=>grid.map(r=>r.slice())}),
   getRange:(row,col,height,width)=>({
    getValues:()=>grid.slice(row-1,row-1+height).map(r=>r.slice(col-1,col-1+width)),
    setNumberFormat(format){
     for(let i=0;i<height;i++)for(let j=0;j<width;j++)if(format==='@')plainText.add((row+i)+':'+(col+j));
     return this;
    },
    setValues(matrix){matrix.forEach((values,i)=>values.forEach((v,j)=>{grid[row-1+i][col-1+j]=store(v,row+i,col+j);}));}
   }),
   insertRowAfter(after){assert.equal(after,grid.length);grid.push(headers[name].map(()=>''));},
   appendRow(values){grid.push(values.map((v,j)=>store(v,grid.length+1,j+1)));}
  };
 }
 const sheets=Object.fromEntries(Object.keys(headers).map(name=>[name,sheet(name)]));
 const sessions={[ADMIN]:'admin-1',[MANAGER]:'manager-1',[NO_PLAN]:'no-plan-1'};
 const services={
  SpreadsheetApp:{openById(id){assert.equal(id,DB);trace.opens++;return {getId:()=>DB,getSheetByName:n=>sheets[n]||null};}},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='DATABASE_SPREADSHEET_ID'?DB:null})},
  CacheService:{getScriptCache:()=>({get(key){const id=sessions[key.slice('srrt_session_'.length)];
   return id?JSON.stringify({v:2,id,tag:TAG}):null;}})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
   computeDigest:(alg,text)=>[...createHash('sha256').update(text).digest()],
   formatDate:(date,timeZone)=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),
   getUuid:()=>uid(1000+(++uuids))}};
 return {sheets,trace,grant,install:target=>Object.assign(target,services)};
}
// The existing synthetic Case came from the F02 round, whose Case-write grant has since lapsed.
function seedCase(ctx,google){
 const caseWrite=google.grant('admin-1','dengue.case.write'),grants=google.sheets.D331AccessGrants.grid;
 grants.push(caseWrite);
 const created=ctx.saveDengueCase(ADMIN,EVENT,{mode:'create',requestId:uid(700),expectedEventRevision:3,
  payload:{Classification:'SUSPECTED',OnsetLocalDate:'2026-10-17'}});
 grants.splice(grants.indexOf(caseWrite),1);
 return {caseId:created.caseId,expectedEventRevision:3,expectedCaseRevision:1};
}
async function activatedStage(){
 const ctx=loadServer(await stagedServerFiles()),google=syntheticGoogle(ctx);
 google.install(ctx);
 return {ctx,google,selection:seedCase(ctx,google)};
}
const createPlan=(selection,requestId,key)=>({mode:'create',requestId,expectedEventRevision:3,
 caseId:selection.caseId,expectedCaseRevision:1,payload:{TriggerCaseID:selection.caseId,EpisodeKey:key}});

test('F03 DEV S2 activated stage lists, creates and reads back Plans with ordinary, date-like and numeric keys',async()=>{
 const {ctx,google,selection}=await activatedStage();
 const list=()=>plain(ctx.listDenguePlansForEvent(ADMIN,EVENT,selection));
 assert.deepEqual(list().plans,[]);
 const created=['EP-ORDINARY','2026-11-08','12345'].map((key,i)=>
  plain(ctx.saveDenguePlan(ADMIN,EVENT,createPlan(selection,uid(710+i),key))));
 for(const result of created){assert.equal(result.status,'CREATED');assert.equal(result.revision,1);}
 assert.deepEqual(list().plans.map(p=>[p.episodeKey,p.planStatus,p.planRevision,p.responsibleUserId]),[
  ['EP-ORDINARY','OPEN',1,'admin-1'],['2026-11-08','OPEN',1,'admin-1'],['12345','OPEN',1,'admin-1']]);
 assert.deepEqual(plain(ctx.getDenguePlanWriteStatus(ADMIN,EVENT,uid(711))),{contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',
  eventId:EVENT,requestId:uid(711),status:'COMMITTED',planId:created[1].planId});
 const ledger=google.sheets.DengueRequestLedger.grid.length;
 assert.throws(()=>ctx.saveDenguePlan(ADMIN,EVENT,createPlan(selection,uid(720),'2026-11-08')),/D331_WRITE_UNAVAILABLE/);
 assert.equal(google.sheets.DengueRequestLedger.grid.length,ledger);
});

test('F03 DEV S2 activated stage lets only a Manager list eligible assignees and reassign a Plan',async()=>{
 const {ctx,selection}=await activatedStage();
 const plan=plain(ctx.saveDenguePlan(ADMIN,EVENT,createPlan(selection,uid(710),'EP-A'))).planId;
 assert.throws(()=>ctx.listAssignableDenguePlanOwners(ADMIN,EVENT,selection),/D331_UNAVAILABLE/);
 assert.deepEqual(plain(ctx.listAssignableDenguePlanOwners(MANAGER,EVENT,selection)).owners,
  [{userId:'admin-1'},{userId:'manager-1'}]);
 const moved=plain(ctx.saveDenguePlan(MANAGER,EVENT,{mode:'update',requestId:uid(730),expectedEventRevision:3,
  caseId:selection.caseId,expectedCaseRevision:1,entityId:plan,expectedEntityRevision:1,
  payload:{ResponsibleUserID:'manager-1'}}));
 assert.equal(moved.status,'UPDATED');assert.equal(moved.revision,2);
 assert.deepEqual(plain(ctx.listDenguePlansForEvent(MANAGER,EVENT,selection)).plans.map(p=>[p.planId,p.planRevision,p.responsibleUserId]),
  [[plan,2,'manager-1']]);
});

test('F03 DEV S2 activated stage refuses all four Plan RPCs without Plan grants and writes nothing',async()=>{
 const {ctx,google,selection}=await activatedStage();
 ctx.saveDenguePlan(ADMIN,EVENT,createPlan(selection,uid(710),'EP-A'));
 const before=plain(google.sheets);
 assert.throws(()=>ctx.listDenguePlansForEvent(NO_PLAN,EVENT,selection),/D331_UNAVAILABLE/);
 assert.throws(()=>ctx.listAssignableDenguePlanOwners(NO_PLAN,EVENT,selection),/D331_UNAVAILABLE/);
 assert.throws(()=>ctx.saveDenguePlan(NO_PLAN,EVENT,createPlan(selection,uid(740),'EP-B')),/D331_WRITE_UNAVAILABLE/);
 assert.throws(()=>ctx.getDenguePlanWriteStatus(NO_PLAN,EVENT,uid(710)),/D331_WRITE_UNAVAILABLE/);
 assert.deepEqual(plain(google.sheets),before);
});

test('F03 DEV S2 Native33 assembly refuses all four Plan RPCs on the same synthetic workbook',async()=>{
 const {google,selection}=await activatedStage(),base=inspectNative33Candidate();
 const native33=loadServer(base.serverPushOrder.map(n=>[n,base.entries.get(n).toString()]));
 google.install(native33);
 const opens=google.trace.opens,before=plain(google.sheets);
 assert.throws(()=>native33.listDenguePlansForEvent(ADMIN,EVENT,selection),/D331_UNAVAILABLE/);
 assert.throws(()=>native33.listAssignableDenguePlanOwners(MANAGER,EVENT,selection),/D331_UNAVAILABLE/);
 assert.throws(()=>native33.saveDenguePlan(ADMIN,EVENT,createPlan(selection,uid(750),'EP-B')),/D331_WRITE_UNAVAILABLE/);
 assert.throws(()=>native33.getDenguePlanWriteStatus(ADMIN,EVENT,uid(700)),/D331_WRITE_UNAVAILABLE/);
 assert.equal(google.trace.opens,opens);assert.deepEqual(plain(google.sheets),before);
});
test('F02 DEV wrapper denies missing authorization and unsupported actions before cloud I/O',()=>{
 const script=path.join(ROOT,'tools/deploy-d331-f02-dev.sh');
 for(const mode of ['--deploy','--prepare','--verify','--rollback','--create-deployment']){
  const r=spawnSync('bash',[script,mode],{encoding:'utf8',env:{PATH:process.env.PATH,HOME:os.tmpdir()}});
  assert.notEqual(r.status,0);assert.match(r.stderr,/F02_DEV=HOLD/);
 }
});

function operatorFixture(){
 const f=snapshot(),bin=path.join(f.work,'bin');fs.mkdirSync(bin,{mode:0o700});
 const calls=path.join(f.work,'calls.jsonl');
 fs.writeFileSync(path.join(bin,'git'),`#!/bin/sh
case "$*" in
 'branch --show-current') echo main;;
 'status --porcelain') :;;
 'remote get-url origin') echo https://github.com/9GotStory/smart-srrt.git;;
 'fetch --quiet origin main') :;;
 'rev-parse HEAD'|'rev-parse origin/main') echo ${SHA};;
 'show ${V22_SHA}:'*|'show ${OLD_F02_SHA}:'*) cat '${ROOT}/'"\${2#*:}";;
 *) exit 97;;
esac
`,{mode:0o700});
 const clasp=path.join(bin,'clasp');
 fs.writeFileSync(clasp,`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
const a=process.argv.slice(2),w=process.env.SMART_SRRT_F02_PRIVATE_BACKUP_DIR;
const at=a.indexOf('--project');const project=at<0?null:a[at+1];if(at>=0)a.splice(at,2);
const ig=a.indexOf('--ignore');const ignore=ig<0?null:a[ig+1];if(ig>=0)a.splice(ig,2);
fs.appendFileSync(process.env.F02_TEST_CALLS,JSON.stringify({args:a,project,ignore,cwd:process.cwd()})+'\\n');
if(a[0]==='--version'){console.log(process.env.F02_TEST_CLASP_VERSION||'3.4.1');process.exit(0);}
const mode=process.env.F02_TEST_FAILURE;
const active=process.env.F02_TEST_ACTIVE_REMOTE;
if(a[0]==='pull'){
 let from=active||path.join(w,'remote');
 if(process.cwd().includes('post-push')||process.cwd().includes('immutable'))from=path.join(w,'f02-stage');
 if(process.cwd().includes('immutable-prior'))from=active||from;
 for(const n of fs.readdirSync(from)){if(n!=='.clasp.json')fs.copyFileSync(path.join(from,n),path.join(process.cwd(),n));}
 if(mode==='remote-drift'&&process.cwd().endsWith('fresh'))fs.appendFileSync('00-bootstrap.gs','//drift');
 if(mode==='pushed-drift'&&process.cwd().endsWith('post-push'))fs.appendFileSync('00-bootstrap.gs','//drift');
 if(mode==='immutable-drift'&&process.cwd().endsWith('immutable'))fs.appendFileSync('00-bootstrap.gs','//drift');
 if(mode==='prior-source-drift'&&process.cwd().endsWith('remote'))fs.appendFileSync('00-bootstrap.gs','//drift');
 if(mode==='prior-immutable-drift'&&process.cwd().endsWith('immutable-prior'))fs.appendFileSync('00-bootstrap.gs','//drift');
 process.exit(0);
}
if(a[0]==='list-deployments'){
 let text=fs.readFileSync(process.env.F02_TEST_INVENTORY||path.join(w,'deployments.before.txt'),'utf8');
 if(mode==='snapshot-inventory-drift'&&process.cwd().endsWith('immutable-prior'))text=text.replace('@22','@23');
 if(fs.existsSync(path.join(w,'updated.flag')))text=active?
  text.replace('@22 - Existing synthetic DEV','@23 - F02 synthetic DEV'):
  text.replace('@20 - Existing synthetic DEV','@21 - F02 synthetic DEV');
 if(mode==='deployment-drift'&&process.cwd().endsWith('fresh'))text=text.replace('@20','@19');
 if(mode==='pre-update-drift'&&process.cwd().endsWith('immutable')&&!fs.existsSync(path.join(w,'updated.flag')))text=text.replace('@20','@19');
 if(mode==='wrong-post-version'&&fs.existsSync(path.join(w,'updated.flag')))text=text.replace('@21','@22');
 process.stdout.write(text);process.exit(0);
}
if(a[0]==='list-versions'){process.stdout.write(process.env.F02_TEST_ACTIVE_REMOTE?'22 - Previous F02 DEV\\n':fs.readFileSync(path.join(w,'versions.before.txt'),'utf8'));process.exit(0);}
if(a.includes('push')){process.exit(mode==='push-unknown'?8:0);}
if(a[0]==='--json'&&a[1]==='show-file-status'){
 let filesToPush=fs.readdirSync(path.join(w,'f02-stage')).map(n=>'f02-stage/'+n);
 if(mode==='selected-missing')filesToPush=filesToPush.filter(n=>!n.endsWith('/03-events-and-dashboard.gs'));
 console.log(JSON.stringify({filesToPush,untrackedFiles:[]}));process.exit(0);
}
if(a[0]==='--json'&&a[1]==='create-version'){
 if(mode==='version-unknown')process.exit(8);
 console.log(JSON.stringify({versionNumber:mode==='invalid-version'?20:active?23:21}));process.exit(0);
}
if(a[0]==='update-deployment'){
 if(mode==='update-unknown')process.exit(8);
 fs.writeFileSync(path.join(w,'updated.flag'),'yes');process.exit(0);
}
process.exit(97);
`,{mode:0o700});
 const profilePath=path.join(f.work,'input-profile.json');fs.writeFileSync(profilePath,JSON.stringify(profile()),{mode:0o600});
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,
  SMART_SRRT_REPO:ROOT,SMART_SRRT_CLASP:clasp,SMART_SRRT_SCRIPT_ID:SCRIPT,SMART_SRRT_DEPLOYMENT_ID:DEPLOY,
  SMART_SRRT_F02_SPREADSHEET_ID:DB,SMART_SRRT_APPROVED_SOURCE_SHA:SHA,
  SMART_SRRT_F02_PRIVATE_BACKUP_DIR:f.work,SMART_SRRT_F02_PROFILE:profilePath,
  SMART_SRRT_F02_PRIOR_VERSION:'20',SMART_SRRT_F02_DEV_APPROVED_SHA:SHA,
  SMART_SRRT_F02_READONLY_APPROVED:'YES',F02_TEST_CALLS:calls};
 return {...f,env,run:(mode,more={})=>spawnSync('bash',[path.join(ROOT,'tools/deploy-d331-f02-dev.sh'),mode],
  {encoding:'utf8',timeout:60000,env:{...env,...more}}),
  calls:()=>fs.existsSync(calls)?fs.readFileSync(calls,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)):[]};
}
test('F02 DEV S3 actual wrapper prepares, checks drift, pushes, verifies immutable source and updates existing version',()=>{
 const f=operatorFixture();try{
  const prep=f.run('--prepare');assert.equal(prep.status,0,prep.stderr);
  assert.equal(f.calls().filter(x=>x.args.includes('push')).length,0);
  const r=f.run('--deploy');assert.equal(r.status,0,r.stderr);
  const calls=f.calls(),names=calls.map(c=>c.args.join(' '));
  assert.equal(names.filter(n=>n==='push').length,1);
  assert.equal(names.filter(n=>n.startsWith('update-deployment ')).length,1);
  const update=calls.find(c=>c.args[0]==='update-deployment');
  assert.equal(update.project,path.join(f.work,'f02.clasp.json'));
  assert.equal(update.args[1],DEPLOY);assert.equal(update.args[update.args.indexOf('--versionNumber')+1],'21');
  const pushAt=names.indexOf('push'),versionAt=names.findIndex(n=>n.startsWith('--json create-version'));
  const immutableAt=calls.findIndex(c=>c.args[0]==='pull'&&c.args.includes('--versionNumber'));
  const updateAt=names.findIndex(n=>n.startsWith('update-deployment'));
  assert.ok(pushAt>names.indexOf('list-versions'));assert.ok(versionAt>pushAt);
  assert.ok(immutableAt>versionAt&&updateAt>immutableAt);
  assert.equal(calls[immutableAt].args.at(-1),'21');
  assert.match(r.stdout,/DEPLOYMENT_VERSION=21/);
  assert.doesNotMatch(r.stdout,new RegExp(SCRIPT+'|'+DEPLOY+'|'+DB));
  const before=f.calls().length;assert.notEqual(f.run('--deploy').status,0);
  assert.equal(f.calls().length,before+1); // local clasp --version only; no mutation retry
 }finally{f.cleanup();}
});

test('F02 DEV S3 refusal before push and uncertain mutation phases never trigger a retry or rollback',()=>{
 const cases=[['selected-missing',0,0],['remote-drift',0,0],['deployment-drift',0,0],['push-unknown',1,0],
  ['pushed-drift',1,0],['version-unknown',1,0],['immutable-drift',1,0],
  ['pre-update-drift',1,0],['invalid-version',1,0],['update-unknown',1,1],['wrong-post-version',1,1]];
 for(const [failure,pushes,updates] of cases){const f=operatorFixture();try{
  assert.equal(f.run('--prepare').status,0);
  const r=f.run('--deploy',{F02_TEST_FAILURE:failure});assert.notEqual(r.status,0,failure);
  assert.match(r.stderr,/F02_DEV=HOLD/);
  let calls=f.calls();assert.equal(calls.filter(c=>c.args[0]==='push').length,pushes,failure);
  assert.equal(calls.filter(c=>c.args[0]==='update-deployment').length,updates,failure);
  assert.ok(!calls.some(c=>/rollback|create-deployment|delete|login/.test(c.args[0])));
  const count=calls.filter(c=>c.args[0]==='push'||c.args[0]==='update-deployment').length;
  assert.notEqual(f.run('--deploy').status,0);
  calls=f.calls();assert.equal(calls.filter(c=>c.args[0]==='push'||c.args[0]==='update-deployment').length,count);
  const state=fs.readFileSync(path.join(f.work,'f02-release-attempt/state.txt'),'utf8').trim();
  assert.notEqual(state,'SOURCE_AND_DEPLOYMENT_VERIFIED');
 }finally{f.cleanup();}}
});
test('F02 DEV S3 exact authorization, source SHA and prior version are required before cloud I/O',()=>{
 for(const extra of [{SMART_SRRT_F02_READONLY_APPROVED:''},
  {SMART_SRRT_APPROVED_SOURCE_SHA:'b'.repeat(40)}, {SMART_SRRT_F02_PRIOR_VERSION:'0'},
  {SMART_SRRT_F02_SPREADSHEET_ID:SCRIPT},{F02_TEST_CLASP_VERSION:'3.4.2'}]){
  const f=operatorFixture();try{
   const r=f.run('--prepare',extra);assert.notEqual(r.status,0);
   assert.ok(f.calls().every(c=>c.args[0]==='--version'));
   assert.equal(fs.existsSync(path.join(f.work,'f02-stage')),false);
  }finally{f.cleanup();}
 }
 const f=operatorFixture();try{
  assert.equal(f.run('--prepare').status,0);
  assert.notEqual(f.run('--deploy',{SMART_SRRT_F02_DEV_APPROVED_SHA:''}).status,0);
  assert.ok(f.calls().every(c=>c.args[0]==='--version'));
 }finally{f.cleanup();}
});


test('F03 DEV S1 adds no public server declarations and changes canonical bytes only by the declared substitutions',async()=>{
 const {inspectF02DevPackage}=await import(MODULE),p=inspectF02DevPackage(profile()),base=inspectNative33Candidate();
 const publicNames=entries=>[...entries].filter(([n])=>n.endsWith('.gs')).flatMap(([,b])=>
  [...b.toString().matchAll(/^function\s+(\w+)\s*\(/gm)].map(m=>m[1]).filter(n=>!n.endsWith('_'))).sort();
 assert.deepEqual(publicNames(p.entries),publicNames(base.entries));
 // Every file: the F02-only Version 22 bytes, plus the Plan module with its two declarations
 // and the client's third availability declaration.
 const want=version22Entries(profile());
 want.set(PLANS,Buffer.from(fs.readFileSync(path.join(ROOT,'src/dengue',PLANS),'utf8')
  .replace('var D331_F03_ENABLED_ = false;','var D331_F03_ENABLED_ = true;')
  .replace('var D331_F03_SCOPE_APPROVED_ = false;','var D331_F03_SCOPE_APPROVED_ = true;')));
 want.set(RECORDS,Buffer.from(want.get(RECORDS).toString()
  .replace('var D331_F03_PLANS_AVAILABLE_ = false;','var D331_F03_PLANS_AVAILABLE_ = true;')));
 assert.deepEqual([...p.entries.keys()].sort(),[...want.keys()].sort());
 for(const [name,bytes] of want)assert.deepEqual(p.entries.get(name),bytes,name);
});


test('F02 DEV refuses corrupted copied clasp config before any cloud read or stage creation',async()=>{
 const {prepareF02DevStage}=await import(MODULE);
 for(const patch of [{scriptId:DB},{rootDir:'../../outside'},
  {scriptExtensions:['.js']},{rootDir:'/tmp'},{filePushOrder:['outside.gs']}]){
  const f=operatorFixture();try{
   const config=JSON.parse(fs.readFileSync(path.join(f.remote,'.clasp.json')));
   fs.writeFileSync(path.join(f.remote,'.clasp.json'),JSON.stringify({...config,...patch}));
   hold(()=>prepareF02DevStage({work:f.work,profile:profile(),expected:expected(profile())}));
   const r=f.run('--prepare');assert.notEqual(r.status,0);
   assert.ok(f.calls().every(c=>c.args[0]==='--version'));
   assert.equal(fs.existsSync(path.join(f.work,'f02-stage')),false);
  }finally{f.cleanup();}
 }
});

test('F02 DEV rejects backup files that no longer match the checksummed rollback archive',async()=>{
 const {prepareF02DevStage}=await import(MODULE);
 for(const change of [
  f=>fs.appendFileSync(path.join(f.remote,'00-bootstrap.gs'),'//unsealed backup drift'),
  f=>fs.appendFileSync(path.join(f.work,'versions.before.txt'),'unsealed version metadata'),
  f=>fs.writeFileSync(path.join(f.remote,'appsscript.json'),'{"runtimeVersion":"V8","timeZone":"UTC"}')
 ]){
  const f=snapshot();try{change(f);
   hold(()=>prepareF02DevStage({work:f.work,profile:profile(),expected:expected(profile())}));
  }finally{f.cleanup();}
 }
});

test('F02 DEV pins effective CLI project/ignore and checks selected files before push',()=>{
 const f=operatorFixture();try{
  assert.equal(f.run('--prepare').status,0);
  fs.writeFileSync(path.join(f.work,'.claspignore'),'**/03-events-and-dashboard.gs\n');
  const r=f.run('--deploy',{clasp_config_project:'/tmp/SYNTHETIC_WRONG_PROJECT.json',clasp_config_ignore:'/tmp/SYNTHETIC_WRONG_IGNORE'});
  assert.equal(r.status,0,r.stderr);
  const calls=f.calls().filter(c=>c.args[0]!=='--version');
  assert.ok(calls.every(c=>c.project&&c.ignore===path.join(f.work,'f02.claspignore')));
  const selected=calls.findIndex(c=>c.args.includes('show-file-status'));
  const push=calls.findIndex(c=>c.args[0]==='push');assert.ok(selected>=0&&selected<push);
 }finally{f.cleanup();}
});

test('F02 active-package snapshot mode requires prior sealed release evidence and never mutates cloud',()=>{
 const f=operatorFixture();try{
  const r=f.run('--snapshot');
  assert.notEqual(r.status,0);assert.doesNotMatch(r.stderr,/UNSUPPORTED_MODE/);
  assert.ok(f.calls().every(c=>c.args[0]==='--version'));
 }finally{f.cleanup();}
});

// Version 22 as deployed: Native33 plus the Case reader, with only the F02 declarations ON.
function version22Entries(p){
 const entries=new Map(inspectNative33Candidate().entries);
 entries.set(READER,fs.readFileSync(path.join(ROOT,'src/dengue',READER)));
 const adapter='09-p0-03b-dev-readonly-adapter.gs';
 for(const [name,before,after] of [
  ['00-g1a-foundation.gs','var D331_G1A_ENABLED = false;','var D331_G1A_ENABLED = true;'],
  [adapter,'var D331_P003B_ENABLED_ = false;','var D331_P003B_ENABLED_ = true;'],
  [adapter,"var D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = '';",'var D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = "'+p.spreadsheetId+'";'],
  [adapter,'var D331_P003B_APPROVED_DISEASE_LABELS_ = [];','var D331_P003B_APPROVED_DISEASE_LABELS_ = ["SYNTHETIC_DENGUE_ONLY"];'],
  [adapter,"var D331_P003B_APPROVED_POLICY_REVISION_ = '';",'var D331_P003B_APPROVED_POLICY_REVISION_ = "'+p.policyRevision+'";'],
  ['12-p0-07-guarded-dev-crud.gs','var D331_P007_ENABLED_ = false;','var D331_P007_ENABLED_ = true;'],
  [READER,'var D331_P022B2_ENABLED_ = false;','var D331_P022B2_ENABLED_ = true;'],
  [READER,'var D331_P022B2_APPROVED_FIELDS_ = [];','var D331_P022B2_APPROVED_FIELDS_ = ["CaseID","CaseRevision","CaseStatus"];'],
  [READER,'var D331_P022B2_REVOCATION_APPROVED_ = false;','var D331_P022B2_REVOCATION_APPROVED_ = true;'],
  [RECORDS,'var D331_F02_CASE_READ_AVAILABLE_ = false;','var D331_F02_CASE_READ_AVAILABLE_ = true;'],
  [RECORDS,'var D331_F02_CASE_WRITE_AVAILABLE_ = false;','var D331_F02_CASE_WRITE_AVAILABLE_ = true;']])
  entries.set(name,Buffer.from(entries.get(name).toString().replace(before,after)));
 return entries;
}
// The retained Version 22 release workspace (sealed F02-only stage, profile and receipts) and a
// candidate profile. Overrides describe wrong prior evidence for the frontier checks.
async function activeOperatorFixture({previous:previousPatch={},created=22,candidate:candidatePatch={}}={}){
 const f=operatorFixture(),sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
 const previous=profile({sourceSha:V22_SHA,priorVersion:21,...previousPatch});
 const stage=path.join(f.work,'f02-stage');fs.mkdirSync(stage,{mode:0o700});
 const entries=version22Entries(previous),files={};
 entries.set('appsscript.json',fs.readFileSync(path.join(f.remote,'appsscript.json')));
 for(const [name,bytes] of entries){fs.writeFileSync(path.join(stage,name),bytes,{mode:0o600});files[name]=sha256(bytes);}
 fs.writeFileSync(path.join(f.work,'f02-profile.json'),JSON.stringify(previous),{mode:0o600});
 fs.writeFileSync(path.join(f.work,'f02-seal.json'),JSON.stringify({sourceSha:previous.sourceSha,
  profileSha256:sha256(JSON.stringify(previous)),files}),{mode:0o600});
 const attempt=path.join(f.work,'f02-release-attempt');fs.mkdirSync(attempt,{mode:0o700});
 const inventory=fs.readFileSync(path.join(f.work,'deployments.before.txt'),'utf8').replace('@20','@'+created);
 for(const [name,text] of Object.entries({'state.txt':'SOURCE_AND_DEPLOYMENT_VERIFIED\n',
  'version.created.json':JSON.stringify({versionNumber:created}),'deployments.after.txt':inventory}))
  fs.writeFileSync(path.join(attempt,name),text,{mode:0o600});
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-f03-active-'));fs.chmodSync(work,0o700);
 const candidate=profile({priorVersion:22,...candidatePatch}),input=path.join(f.work,'next-profile.json');
 fs.writeFileSync(input,JSON.stringify(candidate),{mode:0o600});
 const extra={SMART_SRRT_F02_PRIVATE_BACKUP_DIR:work,SMART_SRRT_F02_PROFILE:input,
  SMART_SRRT_F02_PRIOR_VERSION:String(candidate.priorVersion),SMART_SRRT_F02_PREVIOUS_WORK:f.work,
  F02_TEST_ACTIVE_REMOTE:stage,F02_TEST_INVENTORY:path.join(attempt,'deployments.after.txt')};
 return {work,previousWork:f.work,run:(mode,more={})=>f.run(mode,{...extra,...more}),calls:f.calls,
  cleanup:()=>{fs.rmSync(work,{recursive:true,force:true});f.cleanup();}};
}
test('F03 DEV S3 Version 22 is freshly backed up and the candidate updates only its existing deployment to Version 23',async()=>{
 const f=await activeOperatorFixture();try{
  const r=f.run('--snapshot');assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/ACTIVE_PREVIOUS_PACKAGE_BACKUP_VERIFIED/);
  assert.ok(f.calls().every(c=>!['push','create-version','update-deployment'].includes(c.args[0])));
  assert.ok(f.calls().filter(c=>c.args[0]!=='--version').every(c=>c.project&&c.ignore===path.join(f.work,'snapshot.claspignore')));
  const pulls=f.calls().filter(c=>c.args[0]==='pull');assert.equal(pulls.length,2);
  assert.deepEqual(pulls[1].args,['pull','--versionNumber','22']);
  const backup=fs.readdirSync(path.join(f.work,'immutable-prior'));
  assert.equal(backup.length,36);assert.equal(backup.includes(PLANS),false); // 34 F02 files, manifest, .clasp.json
  const prep=f.run('--prepare');assert.equal(prep.status,0,prep.stderr);assert.match(prep.stdout,/SOURCE_FILES=35/);
  const deploy=f.run('--deploy');assert.equal(deploy.status,0,deploy.stderr);
  assert.match(deploy.stdout,/DEPLOYMENT_VERSION=23/);
  const selected=JSON.parse(fs.readFileSync(path.join(f.work,'f02-release-attempt/selected-files.json'))).filesToPush;
  assert.equal(selected.length,36);
  for(const name of [PLANS,READER,'appsscript.json'])assert.ok(selected.includes('f02-stage/'+name),name);
  assert.equal(f.calls().filter(c=>c.args[0]==='push').length,1);
  const updates=f.calls().filter(c=>c.args[0]==='update-deployment');assert.equal(updates.length,1);
  assert.equal(updates[0].args[1],DEPLOY);assert.equal(updates[0].args[updates[0].args.indexOf('--versionNumber')+1],'23');
  assert.doesNotMatch(r.stdout+prep.stdout+deploy.stdout,new RegExp(SCRIPT+'|'+DEPLOY+'|'+DB));
 }finally{f.cleanup();}
});
test('F03 DEV S1 snapshot accepts only Version 22 from 17975ff and refuses other prior evidence before any cloud read',async()=>{
 for(const [reason,wrong] of Object.entries({
  'old 6257851 frontier':{previous:{sourceSha:OLD_F02_SHA,priorVersion:20},created:21,candidate:{priorVersion:21}},
  'previous source':{previous:{sourceSha:OLD_F02_SHA}},
  'previous prior version':{previous:{priorVersion:20}},
  'candidate prior version':{created:23,candidate:{priorVersion:23}},
  'target script':{previous:{scriptId:'SYNTHETIC_OTHER_SCRIPT_0123456789'}},
  'target deployment':{previous:{deploymentId:'SYNTHETIC_OTHER_DEPLOY_0123456789'}},
  'workbook':{previous:{spreadsheetId:'SYNTHETIC_OTHER_WORKBOOK_012345678'}},
  'disease label':{previous:{diseaseLabels:['SYNTHETIC_OTHER_ONLY']}},
  'Case fields':{previous:{caseFields:['CaseID','CaseRevision']}},
  'policy revision':{previous:{policyRevision:'SYNTHETIC_F02_DEV_OTHER_V1'}}})){
  const f=await activeOperatorFixture(wrong);try{
   const r=f.run('--snapshot');assert.notEqual(r.status,0,reason);
   assert.match(r.stderr,/PRIOR_RELEASE_EVIDENCE_INVALID_NO_CLOUD_READ/,reason);
   assert.ok(f.calls().every(c=>c.args[0]==='--version'),reason);
   assert.deepEqual(fs.readdirSync(f.work),[],reason);
  }finally{f.cleanup();}
 }
});
test('F03 DEV S3 active snapshot refuses wrong prior evidence, live/immutable drift and later archive tampering without cloud mutation',async()=>{
 for(const failure of ['prior-profile','prior-seal','prior-source-drift','prior-immutable-drift','snapshot-inventory-drift','archive-drift']){
  const f=await activeOperatorFixture();try{
   if(failure==='prior-profile'){
    const file=path.join(f.previousWork,'f02-profile.json'),p=JSON.parse(fs.readFileSync(file));
    p.sourceSha='b'.repeat(40);fs.writeFileSync(file,JSON.stringify(p));
   }
   if(failure==='prior-seal')fs.writeFileSync(path.join(f.previousWork,'f02-seal.json'),'{}');
   const r=f.run('--snapshot',{F02_TEST_FAILURE:failure});
   if(failure==='archive-drift'){
    assert.equal(r.status,0,r.stderr);
    fs.appendFileSync(path.join(f.work,'rollback-source-and-metadata.tgz'),'tampered');
    assert.notEqual(f.run('--prepare').status,0);
   }else assert.notEqual(r.status,0,failure);
   const calls=f.calls();assert.ok(calls.every(c=>!c.args.some(a=>['push','create-version','update-deployment'].includes(a))));
   if(failure.startsWith('prior-')&&!failure.endsWith('drift'))assert.ok(calls.every(c=>c.args[0]==='--version'));
   assert.equal(fs.existsSync(path.join(f.work,'f02-stage')),false);
  }finally{f.cleanup();}
 }
});
