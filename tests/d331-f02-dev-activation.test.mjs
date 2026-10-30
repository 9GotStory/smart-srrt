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
const profile=(more={})=>({version:1,environment:'DEVELOPMENT_ONLY',dataClass:'SYNTHETIC_ONLY',
 sourceSha:SHA,scriptId:SCRIPT,deploymentId:DEPLOY,spreadsheetId:DB,priorVersion:20,
 diseaseLabels:['SYNTHETIC_DENGUE_ONLY'],policyRevision:'SYNTHETIC_F02_DEV_20261030_V1',
 caseFields:['CaseID','CaseRevision','CaseStatus'],...more});
const expected=p=>Object.fromEntries(['sourceSha','scriptId','deploymentId','spreadsheetId','priorVersion'].map(k=>[k,p[k]]));
const hold=fn=>assert.throws(fn,/D331_F02_DEV_HOLD/);

test('F02 DEV package includes actual reader and activates only the separate synthetic candidate',async()=>{
 const {inspectF02DevPackage}=await import(MODULE);
 const p=inspectF02DevPackage(profile());
 assert.equal(p.entries.size,34);assert.equal(p.serverPushOrder.length,16);
 assert.equal(p.serverPushOrder.at(-1),'15-p0-22b2-case-read-integration.gs');
 const ctx=vm.createContext({});
 for(const n of p.serverPushOrder)vm.runInContext(p.entries.get(n).toString(),ctx,{filename:n});
 assert.equal(ctx.D331_G1A_ENABLED,true);assert.equal(ctx.D331_P003B_ENABLED_,true);
 assert.equal(ctx.D331_P007_ENABLED_,true);assert.equal(ctx.D331_P022B2_ENABLED_,true);
 assert.equal(ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_,DB);
 assert.equal(ctx.D331_P002A_APPROVAL_,'DRAFT_ONLY');
 assert.equal(typeof ctx.listDengueCasesForEvent,'function');
 assert.equal(typeof ctx.saveDengueCase,'function');
 assert.equal(typeof ctx.getDengueCaseWriteStatus,'function');
 assert.throws(()=>ctx.saveDengueCase('no-session','not-an-event',{}),/D331_WRITE_UNAVAILABLE/);
 assert.match(p.entries.get('03h-client-event-records.html').toString(),/D331_F02_CASE_WRITE_AVAILABLE_ = true/);
 assert.match(inspectNative33Candidate().entries.get('00-g1a-foundation.gs').toString(),/D331_G1A_ENABLED = false/);
 assert.equal(inspectNative33Candidate().entries.size,33);
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
test('F02 DEV fresh private stage binds exact profile/SHA/backup and preserves original manifest',async()=>{
 const {prepareF02DevStage,verifyF02DevStage}=await import(MODULE),f=snapshot(),p=profile();
 try{
  assert.equal(prepareF02DevStage({work:f.work,profile:p,expected:expected(p)}).sourceFiles,34);
  const result=verifyF02DevStage({work:f.work,expected:expected(p)});
  assert.equal(result.sourceFiles,34);assert.equal(result.manifestPreserved,true);
  assert.deepEqual(fs.readFileSync(path.join(f.work,'f02-stage/appsscript.json')),fs.readFileSync(path.join(f.remote,'appsscript.json')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.work,'f02.clasp.json'))).filePushOrder.length,16);
  hold(()=>prepareF02DevStage({work:f.work,profile:p,expected:expected(p)}));
  assert.equal(fs.readFileSync(path.join(f.work,'stage/00-g1a-foundation.gs'),'utf8').includes('D331_G1A_ENABLED = false'),true);
 }finally{f.cleanup();}
});

test('F02 DEV stage rejects changed target/SHA/version, source/manifest/config drift and unsafe files',async()=>{
 const {prepareF02DevStage,verifyF02DevStage}=await import(MODULE);
 const changes=[
  f=>fs.appendFileSync(path.join(f.work,'f02-stage/03-events-and-dashboard.gs'),'//tamper'),
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
 'show 6257851296e949e88777c4a8e86aa83c9d22a399:'*) cat '${ROOT}/'"\${2#*:}";;
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
 if(mode==='snapshot-inventory-drift'&&process.cwd().endsWith('immutable-prior'))text=text.replace('@21','@22');
 if(fs.existsSync(path.join(w,'updated.flag')))text=active?
  text.replace('@21 - Existing synthetic DEV','@22 - F02 synthetic DEV'):
  text.replace('@20 - Existing synthetic DEV','@21 - F02 synthetic DEV');
 if(mode==='deployment-drift'&&process.cwd().endsWith('fresh'))text=text.replace('@20','@19');
 if(mode==='pre-update-drift'&&process.cwd().endsWith('immutable')&&!fs.existsSync(path.join(w,'updated.flag')))text=text.replace('@20','@19');
 if(mode==='wrong-post-version'&&fs.existsSync(path.join(w,'updated.flag')))text=text.replace('@21','@22');
 process.stdout.write(text);process.exit(0);
}
if(a[0]==='list-versions'){process.stdout.write(process.env.F02_TEST_ACTIVE_REMOTE?'21 - Previous F02 DEV\\n':fs.readFileSync(path.join(w,'versions.before.txt'),'utf8'));process.exit(0);}
if(a.includes('push')){process.exit(mode==='push-unknown'?8:0);}
if(a[0]==='--json'&&a[1]==='show-file-status'){
 let filesToPush=fs.readdirSync(path.join(w,'f02-stage')).map(n=>'f02-stage/'+n);
 if(mode==='selected-missing')filesToPush=filesToPush.filter(n=>!n.endsWith('/03-events-and-dashboard.gs'));
 console.log(JSON.stringify({filesToPush,untrackedFiles:[]}));process.exit(0);
}
if(a[0]==='--json'&&a[1]==='create-version'){
 if(mode==='version-unknown')process.exit(8);
 console.log(JSON.stringify({versionNumber:mode==='invalid-version'?20:active?22:21}));process.exit(0);
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


test('F02 DEV adds no public server declarations and keeps unrelated bytes canonical',async()=>{
 const {inspectF02DevPackage}=await import(MODULE),p=inspectF02DevPackage(profile()),base=inspectNative33Candidate();
 const publicNames=entries=>[...entries].filter(([n])=>n.endsWith('.gs')).flatMap(([,b])=>
  [...b.toString().matchAll(/^function\s+(\w+)\s*\(/gm)].map(m=>m[1]).filter(n=>!n.endsWith('_'))).sort();
 assert.deepEqual(publicNames(p.entries),publicNames(base.entries));
 const changed=new Set(['00-g1a-foundation.gs','09-p0-03b-dev-readonly-adapter.gs',
  '12-p0-07-guarded-dev-crud.gs','03h-client-event-records.html']);
 for(const [name,bytes] of base.entries)if(!changed.has(name))assert.deepEqual(p.entries.get(name),bytes,name);
 const client=p.entries.get('03h-client-event-records.html').toString();
 const canonical=base.entries.get('03h-client-event-records.html').toString()
  .replace('var D331_F02_CASE_READ_AVAILABLE_ = false;','var D331_F02_CASE_READ_AVAILABLE_ = true;')
  .replace('var D331_F02_CASE_WRITE_AVAILABLE_ = false;','var D331_F02_CASE_WRITE_AVAILABLE_ = true;');
 assert.equal(client,canonical); // only the two approved availability declarations change
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

async function activeOperatorFixture(){
 const {prepareF02DevStage}=await import(MODULE),f=operatorFixture();
 const previous=profile({sourceSha:'6257851296e949e88777c4a8e86aa83c9d22a399'});
 fs.writeFileSync(path.join(f.work,'source-sha.txt'),previous.sourceSha+'\n');
 const archive='rollback-source-and-metadata.tgz';
 assert.equal(spawnSync('tar',['-czf',path.join(f.work,archive),'-C',f.work,
  'remote','deployments.before.txt','versions.before.txt','source-sha.txt']).status,0);
 fs.chmodSync(path.join(f.work,archive),0o600);
 fs.writeFileSync(path.join(f.work,archive+'.sha256'),
  createHash('sha256').update(fs.readFileSync(path.join(f.work,archive))).digest('hex')+'  '+archive+'\n');
 prepareF02DevStage({work:f.work,profile:previous,expected:expected(previous)});
 const attempt=path.join(f.work,'f02-release-attempt');fs.mkdirSync(attempt,{mode:0o700});
 const inventory=fs.readFileSync(path.join(f.work,'deployments.before.txt'),'utf8').replace('@20','@21');
 for(const [name,text] of Object.entries({'state.txt':'SOURCE_AND_DEPLOYMENT_VERIFIED\n',
  'version.created.json':'{"versionNumber":21}', 'deployments.after.txt':inventory}))
  fs.writeFileSync(path.join(attempt,name),text,{mode:0o600});
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-f02-active-'));fs.chmodSync(work,0o700);
 const input=path.join(f.work,'next-profile.json');
 fs.writeFileSync(input,JSON.stringify(profile({priorVersion:21})),{mode:0o600});
 const extra={SMART_SRRT_F02_PRIVATE_BACKUP_DIR:work,SMART_SRRT_F02_PROFILE:input,
  SMART_SRRT_F02_PRIOR_VERSION:'21',SMART_SRRT_F02_PREVIOUS_WORK:f.work,
  F02_TEST_ACTIVE_REMOTE:path.join(f.work,'f02-stage'),F02_TEST_INVENTORY:path.join(attempt,'deployments.after.txt')};
 return {work,previousWork:f.work,run:(mode,more={})=>f.run(mode,{...extra,...more}),calls:f.calls,
  cleanup:()=>{fs.rmSync(work,{recursive:true,force:true});f.cleanup();}};
}
test('F02 active previous package is freshly backed up and the next exact candidate updates only its existing deployment',async()=>{
 const f=await activeOperatorFixture();try{
  const r=f.run('--snapshot');assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/ACTIVE_PREVIOUS_PACKAGE_BACKUP_VERIFIED/);
  assert.ok(f.calls().every(c=>!['push','create-version','update-deployment'].includes(c.args[0])));
  assert.ok(f.calls().filter(c=>c.args[0]!=='--version').every(c=>c.project&&c.ignore===path.join(f.work,'snapshot.claspignore')));
  const pulls=f.calls().filter(c=>c.args[0]==='pull');assert.equal(pulls.length,2);
  assert.deepEqual(pulls[1].args,['pull','--versionNumber','21']);
  assert.equal(f.run('--prepare').status,0);
  const deploy=f.run('--deploy');assert.equal(deploy.status,0,deploy.stderr);
  assert.match(deploy.stdout,/DEPLOYMENT_VERSION=22/);
  assert.equal(f.calls().filter(c=>c.args[0]==='push').length,1);
  const update=f.calls().find(c=>c.args[0]==='update-deployment');
  assert.equal(update.args[1],DEPLOY);assert.equal(update.args[update.args.indexOf('--versionNumber')+1],'22');
 }finally{f.cleanup();}
});
test('F02 active snapshot refuses wrong prior evidence, live/immutable drift and later archive tampering without cloud mutation',async()=>{
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
