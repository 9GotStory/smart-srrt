import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {inspectNative33Candidate,verifyNativeBackup,preparePrivateStage}
 from '../tools/d331-p0-11-native33-package.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mainFile=path.join(ROOT,'tools','native-sources.mjs');
const read=file=>fs.readFileSync(path.join(ROOT,file));
const deny=f=>assert.throws(f,/D331_P011_PREPARATION_HOLD/);
function fixture(layout='NATIVE26'){
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'d331-p011-'));
 const remote=path.join(work,'remote');
 fs.mkdirSync(remote,{mode:0o700});
 const gs=layout==='NATIVE24'?GAS_SERVER_SOURCES.slice(0,7):GAS_SERVER_SOURCES;
 const html=layout==='NATIVE26'?GAS_HTML_SOURCES:
   GAS_HTML_SOURCES.filter(s=>!s.includes('03l-client-d331-status'));
 for(const source of [...gs,...html]){
   fs.copyFileSync(path.join(ROOT,source),path.join(remote,path.basename(source)));
 }
 const index=html.map(src=>"<?!= include('"+path.parse(src).name+"') ?>").join('');
 fs.writeFileSync(path.join(remote,'Index.html'),index);
 fs.writeFileSync(path.join(remote,'appsscript.json'),JSON.stringify({runtimeVersion:'V8'}));
 fs.writeFileSync(path.join(remote,'.clasp.json'),JSON.stringify({
  scriptId:'SYNTHETIC_SCRIPT_ID_012345678901234'
 }));
 return {work,remote,cleanup:()=>fs.rmSync(work,{recursive:true,force:true})};
}
test('current runtime is Native26; P011 returns an isolated 33-file candidate',()=>{
 const before=fs.readFileSync(mainFile);
 const status=inspectNative33Candidate();
 const after=fs.readFileSync(mainFile);
 assert.deepEqual(after,before);
 assert.deepEqual({...status.status},{
  preview:'NATIVE33_OFFLINE_READY',serverFiles:15,htmlFiles:18,
  candidateFiles:33,sourceFeature:'OFF',runtimeManifest:'UNCHANGED_NATIVE26',
  legacyGuardedDeploy:'UNCHANGED',rollbackMode:'BACKUP_ONLY_NO_AUTO_RESTORE',
  canPush:false,canUpdateDeployment:false,canEnableD331:false
 });
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(status.entries.size,33);
 assert.equal(new Set(status.serverPushOrder).size,15);
 assert.equal(status.serverPushOrder.at(-1),'13-p0-08-dev-readonly-preflight.gs');
});
test('candidate includes only seven approved D331 dependencies, exact byte parity',()=>{
 const result=inspectNative33Candidate();
 for(const filename of result.serverPushOrder){
  const source=filename==='00-g1a-foundation.gs'?
    'src/dengue/00-g1a-foundation.gs': filename.startsWith('0') &&
    /^(?:0[0-6])-/.test(filename)?'src/server/'+filename:
    'src/dengue/'+filename;
  assert.deepEqual(result.entries.get(filename),read(source));
 }
 assert.match(result.entries.get('Index.html').toString(),/03l-client-d331-status/);
});
test('wrong current server manifest or candidate list is rejected',()=>{
 deny(()=>inspectNative33Candidate({native:[...GAS_SERVER_SOURCES].reverse()}));
 deny(()=>inspectNative33Candidate({added:[]}));
});
test('feature activation or runtime source mutation rejects candidate',()=>{
 deny(()=>inspectNative33Candidate({read:name=>{
  const body=read(name);
  return name==='src/dengue/12-p0-07-guarded-dev-crud.gs'?
    Buffer.from(body.toString().replace('D331_P007_ENABLED_ = false',
      'D331_P007_ENABLED_ = true')):body;
 }}));
});
test('every known Native24/25/26 remote backup layout is allowed',()=>{
 for(const layout of ['NATIVE24','NATIVE25','NATIVE26']){
  const f=fixture(layout);
  try{
   const result=verifyNativeBackup(f.remote);
   assert.equal(result.layout,layout);
   assert.equal(result.canDeploy,false);
   assert.equal(result.remoteManifest,'V8_PRESERVED');
  }finally{f.cleanup();}
 }
});
test('a remote backup with unknown files must fail closed',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.remote,'unexpected.gs'),'injected');
  deny(()=>verifyNativeBackup(f.remote));
 }finally{f.cleanup();}
});
test('remote backup with missing file or altered Index template is denied',()=>{
 const f=fixture();
 try{
  fs.rmSync(path.join(f.remote,'03l-client-d331-status.html'));
  deny(()=>verifyNativeBackup(f.remote));
  fs.writeFileSync(path.join(f.remote,'03l-client-d331-status.html'),
   read('src/web/03l-client-d331-status.html'));
  fs.writeFileSync(path.join(f.remote,'Index.html'),'wrong index');
  deny(()=>verifyNativeBackup(f.remote));
 }finally{f.cleanup();}
});
test('remote backup cannot silently drift from reviewed inert D331 source bytes',()=>{
 const f=fixture();
 try{
  fs.appendFileSync(path.join(f.remote,'00-g1a-foundation.gs'),'\n// unexpected drift');
  deny(()=>verifyNativeBackup(f.remote));
 }finally{f.cleanup();}
});
test('missing or non-V8 remote manifest is denied',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.remote,'appsscript.json'),
    JSON.stringify({runtimeVersion:'DEPRECATED_ES5'}));
  deny(()=>verifyNativeBackup(f.remote));
 }finally{f.cleanup();}
});
test('backup with symlink or hardlinked entries is denied',()=>{
 const f=fixture();
 try{
  const file=path.join(f.remote,'03l-client-d331-status.html');
  fs.rmSync(file);
  fs.symlinkSync(path.join(ROOT,'src/web/03l-client-d331-status.html'),file);
  deny(()=>verifyNativeBackup(f.remote));
 }finally{f.cleanup();}
});
test('stage creation writes 34 private files and preserves remote manifest',()=>{
 const f=fixture('NATIVE26');
 try{
  const result=preparePrivateStage(f.work,{manifestFrom:path.join(f.remote,'appsscript.json')});
  assert.equal(result.stageFiles,34);
  assert.equal(result.remoteLayout,'NATIVE26');
  assert.equal(result.canDeploy,false);
  assert.deepEqual(fs.readFileSync(path.join(f.work,'stage','appsscript.json')),
    fs.readFileSync(path.join(f.remote,'appsscript.json')));
  const push=JSON.parse(fs.readFileSync(path.join(f.work,'file-push-order.json'),'utf8'));
  assert.equal(push.length,15);
  assert.equal(push[0],'stage/00-bootstrap.gs');
  assert.equal(push.at(-1),'stage/13-p0-08-dev-readonly-preflight.gs');
  deny(()=>preparePrivateStage(f.work,{manifestFrom:path.join(f.remote,'appsscript.json')}));
 }finally{f.cleanup();}
});
test('stage cannot be created inside the repository',()=>{
 const pathInRepo=ROOT;
 deny(()=>preparePrivateStage(pathInRepo,{manifestFrom:path.join(ROOT,'package.json')}));
});
test('stage validates remote backup before writing stage',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.remote,'unexpected.gs'),'x');
  deny(()=>preparePrivateStage(f.work,{manifestFrom:path.join(f.remote,'appsscript.json')}));
  assert.equal(fs.existsSync(path.join(f.work,'stage')),false);
 }finally{f.cleanup();}
});
test('guarded new shell explicitly prohibits --deploy before inspecting credentials',()=>{
 const sh=path.join(ROOT,'tools/deploy-d331-p011-preflight.sh');
 const result=spawnSync('bash',[sh,'--deploy'],{encoding:'utf8',cwd:ROOT,
  env:{PATH:process.env.PATH,HOME:os.tmpdir()}});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Only --preflight is supported/);
});
test('guarded preflight requires operator authorization before any Google request',()=>{
 const sh=path.join(ROOT,'tools/deploy-d331-p011-preflight.sh');
 const result=spawnSync('bash',[sh,'--preflight'],{encoding:'utf8',cwd:ROOT,
  env:{PATH:process.env.PATH,HOME:os.tmpdir()}});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/Explicit P011 read-only operator approval/);
});
test('guarded script contains no executable clasp push, deployment or rollback',()=>{
 const sh=fs.readFileSync(path.join(ROOT,'tools/deploy-d331-p011-preflight.sh'),'utf8');
 const executable=sh.split('\n').filter(x=>!/^\s*#/.test(x)).join('\n');
 assert.doesNotMatch(executable,/["$]CLASP"\s+(?:push|update-deployment|create-deployment)/);
 assert.doesNotMatch(executable,/\bclasp\s+(?:push|update-deployment|create-deployment)/);
 assert.doesNotMatch(executable,/\beval\b/);
 assert.match(executable,/sha256sum rollback-source-and-metadata\.tgz/);
 assert.match(executable,/SMART_SRRT_APPROVED_SOURCE_SHA/);
});
