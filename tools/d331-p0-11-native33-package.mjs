#!/usr/bin/env node
/**
 * P0-11: OFFLINE Native33 candidate and exact remote-backup validator.
 * Runtime manifest and historic G-34 deploy script are NOT modified.
 * No Google APIs, clasp, push, deployment or live patient/data access.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGasMultiFileEntries,GAS_SERVER_SOURCES,GAS_HTML_SOURCES,
  gasIndexTemplate} from './build-apps-script-multifile.mjs';
import {CANDIDATE_D331_DEPENDENCIES,CURRENT_NATIVE_SERVER,
  inspectP010Candidate} from './d331-p0-10-runtime-readiness.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const EXPECTED_COUNT=33;
const REMOTE_ALLOWED=new Set(['.clasp.json','appsscript.json']);
const eq=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
  a.every((v,i)=>v===b[i]);
const deny=()=>{throw Error('D331_P011_PREPARATION_HOLD');};
const basename=s=>path.basename(s);
const oldGs=CURRENT_NATIVE_SERVER.slice(0,7).map(basename);
const oldHtml=GAS_HTML_SOURCES.filter(x=>!x.includes('03l-client-d331-status')).map(basename);
const native24=[...oldGs,...oldHtml,'Index.html'].sort();
const native25=[...native24,'00-g1a-foundation.gs'].sort();
const native26=[...native25,'03l-client-d331-status.html'].sort();

/** In-memory only. Syntactic source compatibility, NOT runtime authorization. */
export function inspectNative33Candidate({
 native=GAS_SERVER_SOURCES,html=GAS_HTML_SOURCES,
 added=CANDIDATE_D331_DEPENDENCIES,
 read=filename=>fs.readFileSync(path.join(ROOT,filename))
}={}){
 if(!eq(native,CURRENT_NATIVE_SERVER)||
    !eq(added,CANDIDATE_D331_DEPENDENCIES)||
    !eq(html,GAS_HTML_SOURCES)||html.length!==17)deny();
 // Requires a second, separate source-only validator to prove flags remain OFF.
 try{inspectP010Candidate({native,html,added,read:name=>read(name).toString('utf8')});}
 catch{deny();}
 const base=buildGasMultiFileEntries();
 if(base.size!==26)deny();
 const all=new Map(base);
 for(const filename of added){
   const name=basename(filename);
   if(!/^[\w-]+\.gs$/.test(name)||all.has(name))deny();
   let bytes;
   try{bytes=read(filename);}catch{deny();}
   if(!Buffer.isBuffer(bytes)||!bytes.length)deny();
   all.set(name,bytes);
 }
 if(all.size!==EXPECTED_COUNT||
    [...all.keys()].filter(x=>x.endsWith('.gs')).length!==15||
    [...all.keys()].filter(x=>x.endsWith('.html')).length!==18||
    all.get('Index.html')?.toString('utf8')!==gasIndexTemplate())deny();
 const order=[...native,...added].map(basename);
 if(new Set(order).size!==15)deny();
 return {status:Object.freeze({
   preview:'NATIVE33_OFFLINE_READY',serverFiles:15,htmlFiles:18,
   candidateFiles:33,sourceFeature:'OFF',
   runtimeManifest:'UNCHANGED_NATIVE26',legacyGuardedDeploy:'UNCHANGED',
   rollbackMode:'BACKUP_ONLY_NO_AUTO_RESTORE',
   canPush:false,canUpdateDeployment:false,canEnableD331:false
 }),entries:all,serverPushOrder:Object.freeze(order)};
}

/**
 * Whitelist and inspect the pulled remote source, metadata only.
 * Byte-compare pre-existing inert D331 foundation / status files where present.
 */
export function verifyNativeBackup(root,{read=fs.readFileSync,
    list=dir=>fs.readdirSync(dir),stat=fs.lstatSync}={}){
 const files=list(root);
 if(!Array.isArray(files)||files.some(n=>typeof n!=='string'||
    n.includes('/')||n.includes('\\')||n==='.'||n==='..'))deny();
 const actual=files.filter(x=>!REMOTE_ALLOWED.has(x)).sort();
 const matched=eq(actual,native24)?'NATIVE24':
   eq(actual,native25)?'NATIVE25':
   eq(actual,native26)?'NATIVE26':null;
 if(!matched)deny();
 const manifest=path.join(root,'appsscript.json');
 let data;
 try{data=JSON.parse(read(manifest,'utf8'));}catch{deny();}
 if(!data||data.runtimeVersion!=='V8')deny();
 for(const n of files){
   const p=path.join(root,n);
   const s=stat(p);
   if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<=0)deny();
 }
 const code=read(path.join(root,'00-bootstrap.gs'),'utf8');
 if(!/function\s+doGet\s*\(/.test(code)||
    !/function\s+include\s*\(/.test(code))deny();
 const expectedHtml=matched==='NATIVE26'?GAS_HTML_SOURCES:
   GAS_HTML_SOURCES.filter(x=>!x.includes('03l-client-d331-status'));
 const expectedIndex=expectedHtml.map(x=>
   "<?!= include('"+path.parse(x).name+"') ?>").join('');
 if(read(path.join(root,'Index.html'),'utf8').trim()!==expectedIndex)deny();
 const pin=name=>{
   const actualBytes=read(path.join(root,name));
   const approved=read(path.join(ROOT,'src',name==='00-g1a-foundation.gs'?
     'dengue/00-g1a-foundation.gs':'web/03l-client-d331-status.html'));
   if(!actualBytes.equals(approved))deny();
 };
 if(matched!=='NATIVE24')pin('00-g1a-foundation.gs');
 if(matched==='NATIVE26')pin('03l-client-d331-status.html');
 return Object.freeze({backup:'EXACT_REMOTE_LAYOUT_PASS',layout:matched,
   remoteManifest:'V8_PRESERVED',files:actual.length,
   rollback:'SOURCE_SNAPSHOT_ONLY',canDeploy:false});
}

/**
 * Write ONLY into an existing fresh private working root supplied by operator;
 * never write inside the Git repo. The staged manifest is an unmodified COPY.
 */
export function preparePrivateStage(work,{manifestFrom,read=fs.readFileSync}={}){
 if(typeof work!=='string'||!path.isAbsolute(work)||!manifestFrom)deny();
 const parent=fs.realpathSync(work),repo=fs.realpathSync(ROOT);
 if(parent===repo||parent.startsWith(repo+path.sep)||
    (fs.statSync(parent).mode&0o077)!==0)deny();
 const remote=path.join(parent,'remote');
 const report=verifyNativeBackup(remote);
 const manifest=read(path.join(remote,'appsscript.json'));
 const {entries,serverPushOrder,status}=inspectNative33Candidate();
 const stage=path.join(parent,'stage');
 if(fs.existsSync(stage))deny();
 fs.mkdirSync(stage,{mode:0o700});
 try{
   for(const [name,bytes] of entries){
     if(!/^[A-Za-z0-9_-]+\.(?:gs|html)$/.test(name))deny();
     fs.writeFileSync(path.join(stage,name),bytes,{flag:'wx',mode:0o600});
   }
   fs.writeFileSync(path.join(stage,'appsscript.json'),manifest,{flag:'wx',mode:0o600});
   const staged=fs.readdirSync(stage).sort();
   const expected=[...entries.keys(),'appsscript.json'].sort();
   if(!eq(staged,expected)||staged.length!==34||
      !fs.readFileSync(path.join(stage,'appsscript.json')).equals(manifest))deny();
   // Explicit rooted push order. Never derive it from readDir alphabetical order.
   fs.writeFileSync(path.join(parent,'file-push-order.json'),
     JSON.stringify(serverPushOrder.map(x=>'stage/'+x)),{flag:'wx',mode:0o600});
   return Object.freeze({status:'PRIVATE_NATIVE33_STAGE_PREPARED',
     stageFiles:staged.length,source:status.preview,remoteLayout:report.layout,
     canDeploy:false});
 }catch(e){
   // If a stage check fails, don't leave a misleading candidate.
   fs.rmSync(stage,{recursive:true,force:true});
   deny();
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   if(process.argv.length!==2)deny();
   const output=inspectNative33Candidate().status;
   for(const [key,value] of Object.entries(output))console.log(key+'='+value);
 }catch{
   console.error('P011=HOLD; NO_PUSH=YES; NO_DEPLOY=YES');
   process.exitCode=1;
 }
}
