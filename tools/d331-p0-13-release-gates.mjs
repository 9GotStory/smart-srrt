#!/usr/bin/env node
/**
 * P0-13: validate a PRIVATE, already prepared Native33 release package.
 * Read-only filesystem inspection. Does not call clasp, Google or mutate files.
 * Exact manifest order is the RELEASE CANDIDATE, not current Native26.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CURRENT_NATIVE_SERVER,CANDIDATE_D331_DEPENDENCIES}
  from './d331-p0-10-runtime-readiness.mjs';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from './native-sources.mjs';
import {inspectNative33Candidate,verifyNativeBackup}
  from './d331-p0-11-native33-package.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const IDENT=/^[A-Za-z0-9_-]{20,200}$/;
const SHA=/^[0-9a-f]{40}$/;
const no=()=>{throw Error('D331_P013_RELEASE_HOLD');};
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const read=(filename)=>fs.readFileSync(filename);
const text=(filename)=>fs.readFileSync(filename,'utf8');

export const D331_P013_NATIVE33_SERVER_ORDER=Object.freeze(
  [...CURRENT_NATIVE_SERVER,...CANDIDATE_D331_DEPENDENCIES]);
export const D331_P013_PUSH_ORDER=Object.freeze(
  D331_P013_NATIVE33_SERVER_ORDER.map(name=>'stage/'+path.basename(name)));

export function verifyP013Candidate(){
 const original=[...GAS_SERVER_SOURCES];
 if(!exact(original,[...CURRENT_NATIVE_SERVER]))no();
 const prepared=inspectNative33Candidate();
 const names=[...prepared.entries.keys()];
 if(prepared.entries.size!==33 ||
    !exact([...prepared.serverPushOrder],D331_P013_PUSH_ORDER.map(x=>x.slice(6))) ||
    names.filter(x=>x.endsWith('.gs')).length!==15 ||
    names.filter(x=>x.endsWith('.html')).length!==18 ||
    GAS_HTML_SOURCES.length!==17)no();
 return prepared;
}

/** Needs a P0-11 private preflight snapshot for the SAME exact source SHA. */
export function verifyP013PrivateSnapshot({work,sourceSha,scriptId,deploymentId}={}){
 if(typeof work!=='string'||!path.isAbsolute(work)||
    typeof sourceSha!=='string'||!SHA.test(sourceSha)||
    typeof scriptId!=='string'||!IDENT.test(scriptId)||
    typeof deploymentId!=='string'||!IDENT.test(deploymentId)||
    scriptId===deploymentId)no();
 let dir;
 try{dir=fs.realpathSync(work);}catch{no();}
 if(dir!==work||dir===ROOT||dir.startsWith(ROOT+path.sep))no();
 let stat;
 try{stat=fs.lstatSync(dir);}catch{no();}
 if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)no();

 const candidate=verifyP013Candidate();
 let backup;
 try{backup=verifyNativeBackup(path.join(dir,'remote'));}
 catch{no();}
 if(!['NATIVE24','NATIVE25','NATIVE26'].includes(backup.layout))no();
 if(text(path.join(dir,'source-sha.txt')).trim()!==sourceSha)no();

 const stage=path.join(dir,'stage'),files=fs.readdirSync(stage).sort();
 const expected=[...candidate.entries.keys(),'appsscript.json'].sort();
 if(!exact(files,expected)||files.length!==34)no();
 for(const [name,bytes] of candidate.entries){
   const filename=path.join(stage,name),s=fs.lstatSync(filename);
   if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||
      !read(filename).equals(bytes))no();
 }
 if(!read(path.join(stage,'appsscript.json')).equals(
   read(path.join(dir,'remote','appsscript.json'))))no();

 const pushOrder=JSON.parse(text(path.join(dir,'file-push-order.json')));
 if(!exact(pushOrder,D331_P013_PUSH_ORDER))no();
 const clasp=JSON.parse(text(path.join(dir,'.clasp.json')));
 if(clasp.scriptId!==scriptId||clasp.rootDir!=='stage'||
    !exact(clasp.filePushOrder,D331_P013_PUSH_ORDER))no();
 const deploymentList=text(path.join(dir,'deployments.before.txt'));
 const versionList=text(path.join(dir,'versions.before.txt'));
 if(!deploymentList.includes(deploymentId)||!versionList.trim())no();

 const archiveName='rollback-source-and-metadata.tgz';
 const archive=read(path.join(dir,archiveName));
 const digest=crypto.createHash('sha256').update(archive).digest('hex');
 const expectedDigest=text(path.join(dir,archiveName+'.sha256')).trim();
 if(expectedDigest!==digest+'  '+archiveName)no();
 if(!archive.length)no();
 return Object.freeze({
  package:'NATIVE33_EXACT_PRIVATE_STAGE_PASS',
  sourceShaMatch:'PASS',
  remoteBackup:backup.layout,
  backupArchiveSha256:'PASS',
  originalDeploymentListed:'PASS',
  previousDeploymentVersion:'MUST_BE_CONFIRMED_BY_OPERATOR',
  canDeployWithoutSeparateApproval:false,
  canUseClinicalData:false
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==2)no();
  const preview=verifyP013Candidate();
  console.log('P013_NATIVE33_SOURCE_CANDIDATE=PASS');
  console.log('SERVER_FILES='+preview.serverPushOrder.length);
  console.log('CAN_DEPLOY=NO; FEATURE_D331=OFF; GOOGLE_API_NOT_CALLED=YES');
 }catch{
  console.error('P013_NATIVE33_SOURCE_CANDIDATE=HOLD');
  process.exitCode=1;
 }
}
