import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {CURRENT_NATIVE_SERVER,CANDIDATE_D331_DEPENDENCIES} from
 '../tools/d331-p0-10-runtime-readiness.mjs';
import {preparePrivateStage} from '../tools/d331-p0-11-native33-package.mjs';
import {
 D331_P013_NATIVE33_SERVER_ORDER,D331_P013_PUSH_ORDER,
 verifyP013Candidate,verifyP013PrivateSnapshot
} from '../tools/d331-p0-13-release-gates.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SCRIPT='SYNTHETIC_SCRIPT_ID_012345678901234';
const DEPLOY='SYNTHETIC_DEPLOYMENT_ID_012345678901234';
const SHA='a'.repeat(40);
const sh=path.join(ROOT,'tools/deploy-d331-p013.sh');
const check=(work)=>verifyP013PrivateSnapshot({
 work,scriptId:SCRIPT,deploymentId:DEPLOY,sourceSha:SHA
});
const hold=(fn)=>assert.throws(fn,/D331_P013_RELEASE_HOLD/);
function fixture(){
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-p013-'));
 const remote=path.join(work,'remote');
 fs.mkdirSync(remote,{mode:0o700});
 for(const src of [...CURRENT_NATIVE_SERVER,...GAS_HTML_SOURCES]){
  fs.copyFileSync(path.join(ROOT,src),path.join(remote,path.basename(src)));
 }
 fs.writeFileSync(path.join(remote,'Index.html'),
  GAS_HTML_SOURCES.map(s=>"<?!= include('"+path.parse(s).name+"') ?>").join(''));
 fs.writeFileSync(path.join(remote,'appsscript.json'),
  JSON.stringify({runtimeVersion:'V8'}));
 fs.writeFileSync(path.join(remote,'.clasp.json'),
  JSON.stringify({scriptId:SCRIPT,rootDir:'.'}));
 preparePrivateStage(work,{manifestFrom:path.join(remote,'appsscript.json')});
 const order=JSON.parse(fs.readFileSync(path.join(work,'file-push-order.json'),'utf8'));
 fs.writeFileSync(path.join(work,'.clasp.json'),
  JSON.stringify({scriptId:SCRIPT,rootDir:'stage',filePushOrder:order}));
 fs.writeFileSync(path.join(work,'deployments.before.txt'),
  'Existing web app: '+DEPLOY+' \n');
 fs.writeFileSync(path.join(work,'versions.before.txt'),'version 18\n');
 fs.writeFileSync(path.join(work,'source-sha.txt'),SHA+'\n');
 const archive='rollback-source-and-metadata.tgz';
 const args=['-czf',path.join(work,archive),'-C',work,
  'remote','deployments.before.txt','versions.before.txt','source-sha.txt'];
 const tar=spawnSync('tar',args,{encoding:'utf8',timeout:10000});
 assert.equal(tar.status,0,tar.stderr);
 const digest=crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(work,archive))).digest('hex');
 fs.writeFileSync(path.join(work,archive+'.sha256'),digest+'  '+archive+'\n');
 return {work,remote,cleanup:()=>fs.rmSync(work,{recursive:true,force:true})};
}
test('Native33 release manifest is isolated from canonical Native26 until approved',()=>{
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.deepEqual([...D331_P013_NATIVE33_SERVER_ORDER],
  [...CURRENT_NATIVE_SERVER,...CANDIDATE_D331_DEPENDENCIES]);
 assert.equal(D331_P013_NATIVE33_SERVER_ORDER.length,15);
 assert.equal(D331_P013_PUSH_ORDER.length,15);
 assert.equal(D331_P013_PUSH_ORDER[0],'stage/00-bootstrap.gs');
 assert.equal(D331_P013_PUSH_ORDER.at(-1),
  'stage/13-p0-08-dev-readonly-preflight.gs');
 const p=verifyP013Candidate();
 assert.equal(p.entries.size,33);
 assert.equal(p.status.canPush,false);
 assert.equal(p.status.canUpdateDeployment,false);
 assert.equal(p.status.canEnableD331,false);
});
test('sealed Native33 local snapshot and checksum PASS as read-only proof',()=>{
 const f=fixture();
 try{
  const original=fs.readFileSync(path.join(f.work,'stage','Index.html'));
  const result=check(f.work);
  assert.equal(result.package,'NATIVE33_EXACT_PRIVATE_STAGE_PASS');
  assert.equal(result.sourceShaMatch,'PASS');
  assert.equal(result.backupArchiveSha256,'PASS');
  assert.equal(result.originalDeploymentListed,'PASS');
  assert.equal(result.canDeployWithoutSeparateApproval,false);
  assert.deepEqual(fs.readFileSync(path.join(f.work,'stage','Index.html')),original);
 }finally{f.cleanup();}
});
test('snapshot from another reviewed source commit is rejected',()=>{
 const f=fixture();
 try{fs.writeFileSync(path.join(f.work,'source-sha.txt'),'b'.repeat(40));
  hold(()=>check(f.work));}finally{f.cleanup();}
});
test('tampered stage, staged manifest, or source code bytes are denied',()=>{
 for(const tamper of [
  (work)=>fs.appendFileSync(path.join(work,'stage','00-bootstrap.gs'),'//drift'),
  (work)=>fs.writeFileSync(path.join(work,'stage','appsscript.json'),
    JSON.stringify({runtimeVersion:'DEPRECATED_ES5'})),
  (work)=>fs.writeFileSync(path.join(work,'stage','rogue.gs'),'x')
 ]){
  const f=fixture();
  try{tamper(f.work);hold(()=>check(f.work));}finally{f.cleanup();}
 }
});
test('tampered rollback archive and SHA256 ledger are denied',()=>{
 for(const tamper of [
  (work)=>fs.appendFileSync(path.join(work,'rollback-source-and-metadata.tgz'),'tamper'),
  (work)=>fs.writeFileSync(path.join(work,'rollback-source-and-metadata.tgz.sha256'),'0'.repeat(64))
 ]){
  const f=fixture();
  try{tamper(f.work);hold(()=>check(f.work));}finally{f.cleanup();}
 }
});
test('wrong or missing deployment binding denied without fallback',()=>{
 const f=fixture();
 try{
  hold(()=>verifyP013PrivateSnapshot({work:f.work,sourceSha:SHA,
   scriptId:SCRIPT,deploymentId:'OTHER_DEPLOYMENT_ID_1234567890123456'}));
  fs.rmSync(path.join(f.work,'versions.before.txt'));
  hold(()=>check(f.work));
 }finally{f.cleanup();}
});
test('wrong file-push order or project Script ID denied',()=>{
 for(const tamper of [
  (work)=>fs.writeFileSync(path.join(work,'file-push-order.json'),
    JSON.stringify(['stage/not-approved.gs'])),
  (work)=>fs.writeFileSync(path.join(work,'.clasp.json'),
    JSON.stringify({scriptId:'WRONG_SCRIPT_ID_12345678901234567',
      rootDir:'stage',filePushOrder:D331_P013_PUSH_ORDER}))
 ]){
  const f=fixture();
  try{tamper(f.work);hold(()=>check(f.work));}finally{f.cleanup();}
 }
});
test('unknown remote source layout blocks regardless of validated stage',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.remote,'unexpected.gs'),'function rogue(){}');
  hold(()=>check(f.work));
 }finally{f.cleanup();}
});
test('operator-only release tool rejects all unknown modes without network',()=>{
 for(const bad of ['--push','--release','--create-deployment','--rollback']){
  const p=spawnSync('bash',[sh,bad],{encoding:'utf8',timeout:3000,
   env:{PATH:process.env.PATH,HOME:os.tmpdir()}});
  assert.notEqual(p.status,0);
  assert.match(p.stderr,/UNSUPPORTED_MODE/);
 }
});
test('real deployment and rollback require two distinct SHA-specific human approvals',()=>{
 const source=fs.readFileSync(sh,'utf8');
 assert.match(source,/SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA/);
 assert.match(source,/SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA/);
 assert.match(source,/SMART_SRRT_P013_PRIOR_DEPLOYMENT_VERSION/);
 assert.match(source,/SMART_SRRT_P013_PRIOR_VERSION_REVIEWED/);
 assert.match(source,/SMART_SRRT_P013_PRIVATE_BACKUP_DIR/);
 assert.match(source,/verifyP013PrivateSnapshot/);
 assert.match(source,/FRESH_REMOTE_SOURCE_DRIFT|REMOTE_SOURCE_DRIFT_NO_PUSH/);
 assert.match(source,/--versionNumber/);
 assert.match(source,/POST_DEPLOYMENT_DRIFT_NO_ROLLBACK/);
 assert.match(source,/NO_VERIFIED_POST_DEPLOY_BASELINE_MANUAL_RECONCILIATION_REQUIRED/);
 const executable=source.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n');
 assert.doesNotMatch(executable,/\bclasp\s+(?:create-deployment|create-script)/);
 assert.doesNotMatch(executable,/\bclasp\s+(?:delete-deployment|delete-script)/);
 assert.doesNotMatch(executable,/\bclasp\s+login\b/);
});
test('release does not register a new public D331 RPC or change legacy deploy tool',()=>{
 const manifest=fs.readFileSync(path.join(ROOT,'tools/native-sources.mjs'),'utf8');
 const old=fs.readFileSync(path.join(ROOT,'tools/deploy-g34-clasp.sh'),'utf8');
 assert.doesNotMatch(manifest,/12-p0-07-guarded-dev-crud/);
 assert.doesNotMatch(manifest,/13-p0-08-dev-readonly-preflight/);
 assert.doesNotMatch(old,/d331-p0-13/);
});


function operatorFixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-p013-operator-'));
 const bin=path.join(base,'bin'),repo=path.join(base,'repo'),backup=path.join(base,'backup');
 fs.mkdirSync(bin);fs.mkdirSync(path.join(repo,'.git'),{recursive:true});fs.mkdirSync(backup);
 const calls=path.join(base,'calls.txt'),clasp=path.join(bin,'mock-clasp');
 fs.writeFileSync(clasp,'#!/bin/sh\nprintf "%s\\n" "$*" >> "$MOCK_CLASP_CALLS"\nif [ "$1" = "--version" ]; then echo "3.3.0";exit 0;fi\nexit 98\n',{mode:0o700});
 const defaults={
  PATH:bin+path.delimiter+process.env.PATH,
  HOME:base,MOCK_CLASP_CALLS:calls,
  SMART_SRRT_REPO:repo,SMART_SRRT_P013_PRIVATE_BACKUP_DIR:backup,
  SMART_SRRT_APPROVED_SOURCE_SHA:SHA,SMART_SRRT_SCRIPT_ID:SCRIPT,
  SMART_SRRT_DEPLOYMENT_ID:DEPLOY,SMART_SRRT_CLASP:clasp,
  SMART_SRRT_P013_READONLY_APPROVED:'',
  SMART_SRRT_P013_PRIOR_VERSION_REVIEWED:'',
  SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA:'',
  SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA:'',
  SMART_SRRT_P013_PRIOR_DEPLOYMENT_VERSION:''
 };
 return {
  run: (mode,extra={})=>spawnSync('bash',[sh,mode],{
   encoding:'utf8',timeout:5000,env:{...defaults,...extra}
  }),
  calls:()=>fs.existsSync(calls)?fs.readFileSync(calls,'utf8').trim():'',
  cleanup:()=>fs.rmSync(base,{recursive:true,force:true})
 };
}


test('operator --verify denies without explicit read-only approval before git or cloud',()=>{
 const fake=operatorFixture();
 try{
  const r=fake.run('--verify',{SMART_SRRT_P013_READONLY_APPROVED:''});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/READONLY_APPROVAL_REQUIRED/);
  assert.equal(fake.calls(),'--version');
 }finally{fake.cleanup();}
});
test('operator --deploy denies without a separate exact-SHA approval before git or cloud',()=>{
 const fake=operatorFixture();
 try{
  for(const e of [
   {SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA:''},
   {SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA:'b'.repeat(40)},
   {SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA:SHA,SMART_SRRT_P013_PRIOR_VERSION_REVIEWED:'NO'}
  ]){
   const r=fake.run('--deploy',e);
   assert.notEqual(r.status,0);
   assert.match(r.stderr,/SEPARATE_DEV_DEPLOY_APPROVAL_REQUIRED/);
   assert.ok(fake.calls().split('\n').every(x=>x==='--version'));
  }
 }finally{fake.cleanup();}
});
test('operator --rollback-version denies without its own independent exact-SHA approval',()=>{
 const fake=operatorFixture();
 try{
  for(const e of [
   {SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA:''},
   {SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA:'b'.repeat(40)},
   {SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA:SHA,SMART_SRRT_P013_PRIOR_VERSION_REVIEWED:'NO'}
  ]){
   const r=fake.run('--rollback-version',e);
   assert.notEqual(r.status,0);
   assert.match(r.stderr,/SEPARATE_REMOTE_ROLLBACK_APPROVAL_REQUIRED/);
   assert.ok(fake.calls().split('\n').every(x=>x==='--version'));
  }
 }finally{fake.cleanup();}
});
test('missing or fabricated prior deployment version denies before any git fetch or cloud action',()=>{
 const fake=operatorFixture();
 try{
  for(const mode of ['--deploy','--rollback-version']){
   for(const version of ['', '0', 'abc', '10;rm', '999999999']){
    const r=fake.run(mode,{
     SMART_SRRT_P013_PRIOR_VERSION_REVIEWED:'YES',
     SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA:SHA,
     SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA:SHA,
     SMART_SRRT_P013_PRIOR_DEPLOYMENT_VERSION:version
    });
    assert.notEqual(r.status,0);
    assert.match(r.stderr,/EXACT_PRIOR_DEPLOYMENT_VERSION_REQUIRED/);
    assert.ok(fake.calls().split('\n').every(x=>x==='--version'));
   }
  }
 }finally{fake.cleanup();}
});


test('P0-14 P011 exact-SHA marker writes one actual LF byte and round-trips for P013',()=>{
 const script=fs.readFileSync(path.join(ROOT,'tools/deploy-d331-p011-preflight.sh'),'utf8');
 const commands=script.split('\n').filter(s=>s.startsWith("printf ")&&s.includes('source-sha.txt'));
 assert.equal(commands.length,1,'exactly one source SHA marker writer');
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-p014-marker-'));
 try{
  const run=spawnSync('bash',['-c',commands[0]],{
   encoding:'utf8',timeout:3000,
   env:{PATH:process.env.PATH,WORK:work,APPROVED_SHA:SHA}
  });
  assert.equal(run.status,0,run.stderr);
  const bytes=fs.readFileSync(path.join(work,'source-sha.txt'));
  assert.deepEqual(bytes,Buffer.from(SHA+'\n','utf8'),
   'the exact SHA marker must end in LF (0a), not literal backslash-n (5c 6e)');
  assert.equal(bytes.toString('utf8').trim(),SHA);
 }finally{fs.rmSync(work,{recursive:true,force:true});}
});
