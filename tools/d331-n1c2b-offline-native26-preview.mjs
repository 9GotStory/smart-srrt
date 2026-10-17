#!/usr/bin/env node
/**
 * D331 N1-C2B/C2C-A: deterministic, strictly OFFLINE Native26 source-shape check.
 * Does not stage or generate files, import Google clients, execute Apps Script,
 * modify the current Native26 source manifest, access data or deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from './native-sources.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const STATUS='src/web/03l-client-d331-status.html';
const FOUNDATION='src/dengue/00-g1a-foundation.gs';
const LAYOUT='src/web/02-app-layout.html';
const AUTH='src/web/03c-client-auth.html';
const FINAL='src/web/04-browser-app.html';
const EXPECTED_STATUS_BLOB='0b0ab1342ec1caf7fd049ec7c62887965451954e';
const EXPECTED_FOUNDATION_BLOB='916ca88f76fc5a9b3b7f20bd6037d3aa58a6f97d';
const PAGE_ORDER=Object.freeze(['dashboard','records','reporter','admin','library']);
const EXPECTED_SERVER=Object.freeze([
  'src/server/00-bootstrap.gs',
  'src/server/01-schema-and-db.gs',
  'src/server/02-auth-and-attachments.gs',
  'src/server/03-events-and-dashboard.gs',
  'src/server/04-admin-and-audit.gs',
  'src/server/05-reports-and-models.gs',
  'src/server/06-gemini-and-prompts.gs',
  FOUNDATION
]);
const EXPECTED_HTML=Object.freeze([
  'src/web/00-document-head.html',
  'src/web/01-styles.html',
  LAYOUT,
  'src/web/03-modals.html',
  'src/web/03a-dashboard-mobile.html',
  'src/web/03b-client-core.html',
  AUTH,
  'src/web/03d-client-dashboard.html',
  'src/web/03e-client-dashboard-export.html',
  'src/web/03f-client-event-controls.html',
  'src/web/03g-client-event-history.html',
  'src/web/03h-client-event-records.html',
  'src/web/03i-client-report-actions.html',
  'src/web/03j-client-report-job.html',
  'src/web/03k-client-report-generation.html',
  STATUS,
  FINAL
]);
function deny(){throw new Error('D331_N1C2B_OFFLINE_PREVIEW_DENIED');}
function sameList(a,b){
  return Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
}
function blobHash(content){
  const bytes=Buffer.from(content,'utf8');
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function stringSource(readSource,name){
  let content;
  try{content=readSource(name);}catch{deny();}
  if(typeof content!=='string'||content.length===0||content.length>350000)deny();
  return content;
}
function expectedCandidateOrder(){
  return Object.freeze([...EXPECTED_HTML]);
}
/**
 * Pure read-only in-memory compatibility check. Optional injectable sources/order support
 * synthetic negative tests; none is a real Google or deployment attestation.
 */
export function inspectOfflineNative26({
  serverSources=GAS_SERVER_SOURCES,
  htmlSources=GAS_HTML_SOURCES,
  candidateOrder=expectedCandidateOrder(),
  readSource=name=>fs.readFileSync(path.join(ROOT,name),'utf8')
}={}){
  if(!sameList(serverSources,EXPECTED_SERVER)||!sameList(htmlSources,EXPECTED_HTML)||
     !sameList(candidateOrder,expectedCandidateOrder()))deny();
  if(candidateOrder.length!==17||new Set(candidateOrder).size!==17||
     candidateOrder.at(-2)!==STATUS||candidateOrder.at(-1)!==FINAL)deny();
  // Pin both OFF-only pieces to already-reviewed Git blob bytes. A separate
  // review/approval is required before changing their contents.
  const d331=stringSource(readSource,STATUS);
  const foundation=stringSource(readSource,FOUNDATION);
  if(blobHash(d331)!==EXPECTED_STATUS_BLOB ||
     blobHash(foundation)!==EXPECTED_FOUNDATION_BLOB ||
     !foundation.includes('var D331_G1A_ENABLED = false;'))deny();
  const layout=stringSource(readSource,LAYOUT);
  const auth=stringSource(readSource,AUTH);
  const final=stringSource(readSource,FINAL);
  const pages=[...layout.matchAll(/id="page-([^"]+)"/g)].map(x=>x[1]);
  const menu=[...layout.matchAll(/data-page="([^"]+)"/g)].map(x=>x[1]);
  if(!sameList(pages,PAGE_ORDER)||!sameList(menu,PAGE_ORDER))deny();
  if(!auth.includes("!['dashboard','records','reporter','admin','library'].includes(page)")||
     !auth.includes("!roleCanRecord()")||!auth.includes("!roleCanManage()"))deny();
  if(layout.includes('page-dengue')||layout.includes('data-page="dengue"')||
     !final.trimEnd().endsWith('</html>'))deny();
  // This is a *candidate Index string in memory*, never a file. Stage, clasp,
  // Script Properties, runtime calls and real user/clinical data are absent.
  const candidateIndex=candidateOrder.map(name=>
    "<?!= include('"+path.parse(name).name+"') ?>").join('');
  // Compare the registered inert Native26 source with the historical Native25 layout.
  const currentIndex=htmlSources.filter(name=>name!==STATUS).map(name=>
    "<?!= include('"+path.parse(name).name+"') ?>").join('');
  if(candidateIndex===currentIndex||candidateIndex.includes('\n')||
     candidateIndex.split("<?!= include('").length!==18 ||
     currentIndex.split("<?!= include('").length!==17)deny();
  const expectedBefore="<?!= include('03k-client-report-generation') ?>";
  const indexPos=candidateIndex.indexOf("<?!= include('03l-client-d331-status') ?>");
  if(indexPos<=candidateIndex.indexOf(expectedBefore)||
     indexPos>=candidateIndex.indexOf("<?!= include('04-browser-app') ?>"))deny();
  // Only aggregate flags/counts, no file paths, Google IDs or patient records.
  return Object.freeze({
    localCandidateStructure:'PASS',
    candidateCount:26,
    candidateServerFiles:8,
    candidateHtmlPartials:17,
    currentNativeCount:26,
    currentLiveSourceManifest:'NATIVE26_INERT_SOURCE_ONLY',
    d331Feature:'OFF',
    newD331PageRegistered:false,
    actualGoogleBinding:'NOT_ATTESTED',
    authorizationForStageOrDeploy:'HOLD'
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==2)deny();
    inspectOfflineNative26();
    console.log('D331_N1C2B_OFFLINE_NATIVE26_CANDIDATE=PASS');
    console.log('NATIVE26_MANIFEST=INERT_SOURCE_ONLY; D331_FEATURE=OFF');
    console.log('D331_GOOGLE_BINDING=NOT_ATTESTED; D331_STAGE_DEPLOY=HOLD');
  }catch{
    // Never print user-controlled source, identifiers, paths or exception text.
    console.error('D331_N1C2B_OFFLINE_NATIVE26_CANDIDATE=FAIL');
    console.error('D331_GOOGLE_BINDING=NOT_ATTESTED; D331_STAGE_DEPLOY=HOLD');
    process.exitCode=2;
  }
}
