#!/usr/bin/env node
// Separate synthetic-only DEV candidate. Canonical Native26 and Native33 stay OFF.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyP013PrivateSnapshot} from './d331-p0-13-release-gates.mjs';
import {inspectNative33Candidate} from './d331-p0-11-native33-package.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const no=()=>{throw Error('D331_F02_DEV_HOLD');};
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const FIELDS=['CaseID','CaseRevision','CaseStatus'];
const PROFILE_KEYS=['version','environment','dataClass','sourceSha','scriptId','deploymentId',
 'spreadsheetId','priorVersion','diseaseLabels','policyRevision','caseFields'].sort();
function validateProfile(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||!exact(Object.keys(p).sort(),PROFILE_KEYS)||
    p.version!==1||p.environment!=='DEVELOPMENT_ONLY'||p.dataClass!=='SYNTHETIC_ONLY'||
    typeof p.sourceSha!=='string'||!/^[a-f0-9]{40}$/.test(p.sourceSha)||
    !['scriptId','deploymentId','spreadsheetId'].every(k=>typeof p[k]==='string'&&/^[A-Za-z0-9_-]{20,200}$/.test(p[k]))||
    new Set([p.scriptId,p.deploymentId,p.spreadsheetId]).size!==3||
    !Number.isSafeInteger(p.priorVersion)||p.priorVersion<1||p.priorVersion>99999999||
    !exact(p.diseaseLabels,['SYNTHETIC_DENGUE_ONLY'])||!exact(p.caseFields,FIELDS)||
    typeof p.policyRevision!=='string'||!/^SYNTHETIC_F02_DEV_[A-Z0-9_]{1,64}$/.test(p.policyRevision))no();
 return JSON.parse(JSON.stringify(p));
}
export function inspectF02DevPackage(profile){
 try{
  const p=validateProfile(profile),base=inspectNative33Candidate();
  const entries=new Map(base.entries);
  const reader='15-p0-22b2-case-read-integration.gs';
  entries.set(reader,fs.readFileSync(path.join(ROOT,'src/dengue',reader)));
  function replace(name,before,after){
   const text=entries.get(name)?.toString('utf8');
   if(typeof text!=='string'||text.split(before).length!==2)no();
   entries.set(name,Buffer.from(text.replace(before,after),'utf8'));
  }
  replace('00-g1a-foundation.gs','var D331_G1A_ENABLED = false;','var D331_G1A_ENABLED = true;');
  const adapter='09-p0-03b-dev-readonly-adapter.gs';
  replace(adapter,'var D331_P003B_ENABLED_ = false;','var D331_P003B_ENABLED_ = true;');
  replace(adapter,"var D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = '';",'var D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = '+JSON.stringify(p.spreadsheetId)+';');
  replace(adapter,'var D331_P003B_APPROVED_DISEASE_LABELS_ = [];','var D331_P003B_APPROVED_DISEASE_LABELS_ = '+JSON.stringify(p.diseaseLabels)+';');
  replace(adapter,"var D331_P003B_APPROVED_POLICY_REVISION_ = '';",'var D331_P003B_APPROVED_POLICY_REVISION_ = '+JSON.stringify(p.policyRevision)+';');
  replace('12-p0-07-guarded-dev-crud.gs','var D331_P007_ENABLED_ = false;','var D331_P007_ENABLED_ = true;');
  replace(reader,'var D331_P022B2_ENABLED_ = false;','var D331_P022B2_ENABLED_ = true;');
  replace(reader,'var D331_P022B2_APPROVED_FIELDS_ = [];','var D331_P022B2_APPROVED_FIELDS_ = '+JSON.stringify(p.caseFields)+';');
  // Synthetic exercise only; real-data revocation/clinical approval is not asserted.
  replace(reader,'var D331_P022B2_REVOCATION_APPROVED_ = false;','var D331_P022B2_REVOCATION_APPROVED_ = true;');
  const client='03h-client-event-records.html';
  replace(client,'var D331_F02_CASE_READ_AVAILABLE_ = false;','var D331_F02_CASE_READ_AVAILABLE_ = true;');
  replace(client,'var D331_F02_CASE_WRITE_AVAILABLE_ = false;','var D331_F02_CASE_WRITE_AVAILABLE_ = true;');
  const serverPushOrder=Object.freeze([...base.serverPushOrder,reader]);
  if(entries.size!==34||serverPushOrder.length!==16)no();
  return {entries,serverPushOrder,profile:p};
 }catch{no();}
}

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function privateDirectory(work){
 if(typeof work!=='string'||!path.isAbsolute(work)||fs.realpathSync(work)!==work||
    work===ROOT||work.startsWith(ROOT+path.sep))no();
 const s=fs.lstatSync(work);
 if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)no();
 return work;
}
function privateFile(name){
 const s=fs.lstatSync(name);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&0o077)!==0)no();
 return fs.readFileSync(name);
}
function boundProfile(profile,expected){
 const p=validateProfile(profile),keys=['sourceSha','scriptId','deploymentId','spreadsheetId','priorVersion'];
 if(!expected||!exact(Object.keys(expected).sort(),keys.slice().sort())||
    keys.some(k=>expected[k]!==p[k]))no();
 return p;
}
function verifyBackup(work,p){
 const remoteConfig=JSON.parse(privateFile(path.join(work,'remote/.clasp.json')));
 const expectedConfig={scriptId:p.scriptId,rootDir:'.',scriptExtensions:['.gs'],htmlExtensions:['.html']};
 if(!exact(Object.keys(remoteConfig).sort(),Object.keys(expectedConfig).sort())||
    Object.keys(expectedConfig).some(k=>!exact(remoteConfig[k],expectedConfig[k])))no();
 verifyP013PrivateSnapshot({work,sourceSha:p.sourceSha,scriptId:p.scriptId,deploymentId:p.deploymentId});
 verifyArchiveContents(work);
 const rows=deploymentRows(fs.readFileSync(path.join(work,'deployments.before.txt'),'utf8'));
 if(rows.get(p.deploymentId)?.version!==String(p.priorVersion))no();
}
// Read archive members to stdout only; never extract untrusted paths into the filesystem.
function verifyArchiveContents(work){
 const archive=path.join(work,'rollback-source-and-metadata.tgz');
 const stat=fs.lstatSync(archive);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.uid!==process.getuid()||stat.size>32*1024*1024)no();
 const metadata=['deployments.before.txt','versions.before.txt','source-sha.txt'];
 const members=[...fs.readdirSync(path.join(work,'remote')).map(n=>'remote/'+n),...metadata];
 const env={...process.env,LC_ALL:'C',TAR_OPTIONS:''};
 function tar(args,encoding){
  const r=spawnSync('tar',args,{encoding,env,timeout:10000,maxBuffer:2*1024*1024});
  if(r.error||r.status!==0)no();return r.stdout;
 }
 const names=tar(['-tzf',archive],'utf8').trim().split('\n');
 if(!exact(names.slice().sort(),['remote/',...members].sort()))no();
 const types=tar(['-tvzf',archive],'utf8').trim().split('\n').map(line=>line[0]);
 if(types.length!==names.length||types.some((t,i)=>t!==(names[i]==='remote/'?'d':'-')))no();
 for(const member of members){
  const bytes=privateFile(path.join(work,member));
  if(!tar(['-xOzf',archive,'--',member],undefined).equals(bytes))no();
 }
}
export function prepareF02DevStage({work,profile,expected}={}){
 try{
  privateDirectory(work);const p=boundProfile(profile,expected);verifyBackup(work,p);
  const {entries,serverPushOrder}=inspectF02DevPackage(p);
  for(const name of ['f02-stage','f02-profile.json','f02-seal.json','f02.clasp.json','f02.claspignore'])
   if(fs.existsSync(path.join(work,name)))no();
  const stage=path.join(work,'f02-stage');fs.mkdirSync(stage,{mode:0o700});
  const manifest=fs.readFileSync(path.join(work,'remote/appsscript.json'));
  const sealed={sourceSha:p.sourceSha,profileSha256:digest(Buffer.from(JSON.stringify(p))),files:{}};
  for(const [name,bytes] of [...entries,['appsscript.json',manifest]]){
   fs.writeFileSync(path.join(stage,name),bytes,{flag:'wx',mode:0o600});sealed.files[name]=digest(bytes);
  }
  const config={scriptId:p.scriptId,rootDir:'f02-stage',scriptExtensions:['.gs'],htmlExtensions:['.html'],
   filePushOrder:serverPushOrder.map(n=>'f02-stage/'+n)};
  fs.writeFileSync(path.join(work,'f02.claspignore'),'',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(work,'f02-profile.json'),JSON.stringify(p),{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(work,'f02.clasp.json'),JSON.stringify(config),{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(work,'f02-seal.json'),JSON.stringify(sealed),{flag:'wx',mode:0o600});
  return verifyF02DevStage({work,expected});
 }catch{no();}
}
export function verifyF02DevStage({work,expected}={}){
 try{
  privateDirectory(work);
  const p=boundProfile(JSON.parse(privateFile(path.join(work,'f02-profile.json'))),expected);verifyBackup(work,p);
  const {entries,serverPushOrder}=inspectF02DevPackage(p);
  if(privateFile(path.join(work,'f02.claspignore')).length!==0)no();
  const stage=privateDirectory(path.join(work,'f02-stage'));
  const names=[...entries.keys(),'appsscript.json'].sort();
  if(!exact(fs.readdirSync(stage).sort(),names))no();
  const sealed=JSON.parse(privateFile(path.join(work,'f02-seal.json')));
  if(sealed.sourceSha!==p.sourceSha||sealed.profileSha256!==digest(Buffer.from(JSON.stringify(p)))||
     !exact(Object.keys(sealed.files).sort(),names))no();
  const config=JSON.parse(privateFile(path.join(work,'f02.clasp.json')));
  if(!exact(config,{scriptId:p.scriptId,rootDir:'f02-stage',scriptExtensions:['.gs'],htmlExtensions:['.html'],
     filePushOrder:serverPushOrder.map(n=>'f02-stage/'+n)}))no();
  entries.set('appsscript.json',fs.readFileSync(path.join(work,'remote/appsscript.json')));
  for(const [name,bytes] of entries){
   const actual=privateFile(path.join(stage,name));
   if(!actual.equals(bytes)||digest(actual)!==sealed.files[name])no();
  }
  return Object.freeze({package:'F02_SYNTHETIC_DEV_EXACT_STAGE_PASS',sourceFiles:34,manifestPreserved:true});
 }catch{no();}
}

// Parse clasp's bounded inventory, including HEAD; never select the highest version.
function deploymentRows(text){
 const rows=new Map();let count=null;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();if(!line)continue;
  const header=/^Found (\d+) deployments?\.$/.exec(line);
  if(header){if(count!==null)no();count=Number(header[1]);continue;}
  const m=/^- ([A-Za-z0-9_-]{20,200}) @(HEAD|[1-9][0-9]{0,7})(?:\s.*)?$/.exec(line);
  if(!m||rows.has(m[1]))no();rows.set(m[1],{version:m[2],line});
 }
 if(!rows.size||(count!==null&&count!==rows.size))no();return rows;
}
function verifyRemoteCopy(work,profile,folder){
 const dir=privateDirectory(path.join(work,'f02-release-attempt',folder));
 const stage=path.join(work,'f02-stage'),names=fs.readdirSync(stage).sort();
 if(!exact(fs.readdirSync(dir).filter(n=>n!=='.clasp.json').sort(),names))no();
 const config=JSON.parse(privateFile(path.join(dir,'.clasp.json')));
 if(config.scriptId!==profile.scriptId||config.rootDir!=='.')no();
 for(const name of names)if(!privateFile(path.join(dir,name)).equals(privateFile(path.join(stage,name))))no();
}
function cli(){
 const mode=process.argv[2];if(process.argv.length!==3)no();
 const env=process.env,work=env.SMART_SRRT_F02_PRIVATE_BACKUP_DIR;
 const expected={sourceSha:env.SMART_SRRT_APPROVED_SOURCE_SHA,scriptId:env.SMART_SRRT_SCRIPT_ID,
  deploymentId:env.SMART_SRRT_DEPLOYMENT_ID,spreadsheetId:env.SMART_SRRT_F02_SPREADSHEET_ID,
  priorVersion:Number(env.SMART_SRRT_F02_PRIOR_VERSION)};
 if(mode==='--prepare'){
  const profile=JSON.parse(privateFile(env.SMART_SRRT_F02_PROFILE));
  prepareF02DevStage({work,profile,expected});
  console.log('F02_DEV=PRIVATE_STAGE_PREPARED; SOURCE_FILES=34; REMOTE_WRITES=NO');return;
 }
 verifyF02DevStage({work,expected});
 const profile=JSON.parse(privateFile(path.join(work,'f02-profile.json')));
 if(mode==='--verify'){console.log('F02_DEV=EXACT_PRIVATE_STAGE_PASS');return;}
 if(mode==='--check-selected'){
  const selected=JSON.parse(privateFile(path.join(work,'f02-release-attempt/selected-files.json')));
  const names=fs.readdirSync(path.join(work,'f02-stage')).map(n=>'f02-stage/'+n).sort();
  if(!Array.isArray(selected.filesToPush)||!exact(selected.filesToPush.slice().sort(),names))no();
  return;
 }
 if(mode==='--check-pushed'){verifyRemoteCopy(work,profile,'post-push');return;}
 if(mode==='--check-immutable'){verifyRemoteCopy(work,profile,'immutable');return;}
 if(mode==='--new-version'){
  const result=JSON.parse(privateFile(path.join(work,'f02-release-attempt/version.created.json')));
  const version=result.versionNumber;
  if(!Number.isSafeInteger(version)||version<=profile.priorVersion||version>99999999)no();
  console.log(String(version));return;
 }
 if(mode==='--check-final'){
  const version=Number(env.SMART_SRRT_F02_NEW_VERSION);
  if(!Number.isSafeInteger(version)||version<=profile.priorVersion)no();
  const before=deploymentRows(fs.readFileSync(path.join(work,'deployments.before.txt'),'utf8'));
  const after=deploymentRows(privateFile(path.join(work,'f02-release-attempt/deployments.after.txt')).toString());
  if(!exact([...before.keys()].sort(),[...after.keys()].sort())||
     after.get(profile.deploymentId)?.version!==String(version))no();
  for(const [id,row] of before)if(id!==profile.deploymentId&&after.get(id).line!==row.line)no();
  return;
 }
 no();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{cli();}catch{console.error('D331_F02_DEV_HOLD');process.exitCode=1;}
}
