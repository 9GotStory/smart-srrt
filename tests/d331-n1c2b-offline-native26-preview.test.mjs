import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inspectOfflineNative26} from '../tools/d331-n1c2b-offline-native26-preview.mjs';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TOOL=path.join(REPO,'tools/d331-n1c2b-offline-native26-preview.mjs');
const SOURCE=fs.readFileSync(TOOL,'utf8');
const STATUS='src/web/03l-client-d331-status.html';
const FOUNDATION='src/dengue/00-g1a-foundation.gs';
const LAYOUT='src/web/02-app-layout.html';
const AUTH='src/web/03c-client-auth.html';
const FINAL='src/web/04-browser-app.html';
const realSource=file=>fs.readFileSync(path.join(REPO,file),'utf8');
function mutated(file,replacement){
  return {readSource:p=>p===file?replacement:realSource(p)};
}
function reject(args){
  assert.throws(()=>inspectOfflineNative26(args),/D331_N1C2B_OFFLINE_PREVIEW_DENIED/);
}

test('N1-C2B historical memory preview remains read-only after inert Native26 source registration',()=>{
  const first=inspectOfflineNative26(),second=inspectOfflineNative26();
  assert.deepEqual(first,second);
  assert.deepEqual(first,{
    localCandidateStructure:'PASS',candidateCount:26,candidateServerFiles:8,
    candidateHtmlPartials:17,currentNativeCount:26,
    currentLiveSourceManifest:'NATIVE26_INERT_SOURCE_ONLY',d331Feature:'OFF',
    newD331PageRegistered:false,actualGoogleBinding:'NOT_ATTESTED',
    authorizationForStageOrDeploy:'HOLD'
  });
  assert.equal(Object.isFrozen(first),true);
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,17);
  assert.equal(GAS_HTML_SOURCES.includes(STATUS),true);
});
test('in-memory candidate never mutates manifest, current page or deployment stage',()=>{
  const before=fs.readFileSync(path.join(REPO,'tools/native-sources.mjs'));
  const deploy=fs.readFileSync(path.join(REPO,'tools/deploy-g34-clasp.sh'));
  const layout=realSource(LAYOUT);
  inspectOfflineNative26();
  assert.deepEqual(fs.readFileSync(path.join(REPO,'tools/native-sources.mjs')),before);
  assert.deepEqual(fs.readFileSync(path.join(REPO,'tools/deploy-g34-clasp.sh')),deploy);
  assert.equal(realSource(LAYOUT),layout);
  assert.doesNotMatch(layout,/page-dengue|data-page="dengue"/);
  assert.doesNotMatch(SOURCE,/\b(?:google\.script\.run|SpreadsheetApp|DriveApp|PropertiesService|UrlFetchApp|googleapis|clasp|writeFileSync|mkdirSync|rmSync|spawnSync|execSync)\s*\(/);
});
test('wrong candidate partial order, duplicate, extra, missing or forged manifest DENY',()=>{
  const correct=[...GAS_HTML_SOURCES];
  assert.equal(inspectOfflineNative26().candidateCount,26);
  reject({candidateOrder:correct.filter(x=>x!==STATUS)});
  reject({candidateOrder:[...GAS_HTML_SOURCES,STATUS]});
  reject({candidateOrder:[STATUS,...GAS_HTML_SOURCES]});
  reject({candidateOrder:[...GAS_HTML_SOURCES.slice(0,-1),STATUS,STATUS]});
  reject({candidateOrder:[...correct,STATUS]});
  reject({candidateOrder:[...correct.slice(0,-1)]});
  reject({htmlSources:[...GAS_HTML_SOURCES.slice(1)]});
  reject({htmlSources:[...GAS_HTML_SOURCES,STATUS]});
  reject({htmlSources:[STATUS,...GAS_HTML_SOURCES.slice(1)]});
  reject({serverSources:[...GAS_SERVER_SOURCES.slice(1)]});
  reject({serverSources:[...GAS_SERVER_SOURCES.slice(0,-1),STATUS]});
});
test('pinned N1-C1 UX bytes reject enabling actions or introducing RPC/PHI',()=>{
  const src=realSource(STATUS);
  reject(mutated(STATUS,src.replace('button.disabled=true;','button.disabled=false;')));
  reject(mutated(STATUS,src+'\n<script>google.script.run.listPatients()</script>'));
  reject(mutated(STATUS,src.replace('ไม่มีรายการที่สามารถแสดงได้','ชื่อผู้ป่วยจริง')));
  reject(mutated(STATUS,'<script>function ready(){}</script>'));
});
test('pinned G1-A foundation rejects feature enable and even benign unreviewed drift',()=>{
  const src=realSource(FOUNDATION);
  assert.match(src,/var D331_G1A_ENABLED = false;/);
  reject(mutated(FOUNDATION,src.replace('var D331_G1A_ENABLED = false;',
     'var D331_G1A_ENABLED = true;')));
  reject(mutated(FOUNDATION,src+'\n// unapproved modification'));
});
test('five-page closed-world route and navigation can never silently gain Dengue link',()=>{
  const src=realSource(LAYOUT);
  reject(mutated(LAYOUT,src.replace('id="page-dashboard"',
    'id="page-dengue"')));
  reject(mutated(LAYOUT,src.replace('data-page="records"',
    'data-page="dengue"')));
  reject(mutated(LAYOUT,src.replace('data-page="records"',
    'data-page="dengue-ready"')));
  const auth=realSource(AUTH);
  reject(mutated(AUTH,auth.replace("!['dashboard','records','reporter','admin','library'].includes(page)",
    "false")));
  reject(mutated(AUTH,auth.replace('!roleCanRecord()','false')));
  reject(mutated(AUTH,auth.replace('!roleCanManage()','false')));
});
test('last Native browser partial must remain the exact close of complete HTML',()=>{
  const src=realSource(FINAL);
  assert.match(src,/<\/body>\s*<\/html>\s*$/);
  reject(mutated(FINAL,src.replace('</html>','<div></div>')));
  reject(mutated(FINAL,''));
  reject({readSource:()=>null});
  reject({readSource:()=>{throw new Error('PHI_SHOULD_NOT_LOG');}});
});
test('CLI fails safely on arguments and successful output contains no source or Google IDs',()=>{
  const good=spawnSync(process.execPath,[TOOL],{cwd:REPO,encoding:'utf8'});
  assert.equal(good.status,0,good.stderr);
  assert.match(good.stdout,/D331_N1C2B_OFFLINE_NATIVE26_CANDIDATE=PASS/);
  assert.match(good.stdout,/NATIVE26_MANIFEST=INERT_SOURCE_ONLY; D331_FEATURE=OFF/);
  assert.match(good.stdout,/D331_STAGE_DEPLOY=HOLD/);
  assert.doesNotMatch(good.stdout+good.stderr,/<script|scriptId|spreadsheetId|AKfycb|patient|\.gs\n/);
  const bad=spawnSync(process.execPath,[TOOL,'--deploy'],{cwd:REPO,encoding:'utf8'});
  assert.equal(bad.status,2);
  assert.match(bad.stderr,/D331_N1C2B_OFFLINE_NATIVE26_CANDIDATE=FAIL/);
  assert.doesNotMatch(bad.stdout+bad.stderr,/AKfycb|PHI_SHOULD_NOT_LOG|\/home\/|\.json/);
});
