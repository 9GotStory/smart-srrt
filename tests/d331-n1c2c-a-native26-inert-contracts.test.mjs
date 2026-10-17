// C2C-A: inert Native26 release topology; synthetic tests only, no remote access.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {buildGasMultiFileEntries,gasIndexTemplate,verifyGasMultiFileParity} from '../tools/build-apps-script-multifile.mjs';
import {expectedNativeFiles} from '../tools/native-release-inspection.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const STATUS='src/web/03l-client-d331-status.html';
const release=fs.readFileSync(path.join(ROOT,'tools/deploy-g34-clasp.sh'),'utf8');
const layout=fs.readFileSync(path.join(ROOT,'src/web/02-app-layout.html'),'utf8');
const auth=fs.readFileSync(path.join(ROOT,'src/web/03c-client-auth.html'),'utf8');
const status=fs.readFileSync(path.join(ROOT,STATUS),'utf8');
const foundation=fs.readFileSync(path.join(ROOT,'src/dengue/00-g1a-foundation.gs'),'utf8');
const stageCode=release.match(/node - "\$WORK\/stage" "\$WORK\/remote\/appsscript\.json" <<'NODE'\n([\s\S]*?)\nNODE/)?.[1];

test('Native26 source is exact 8+17+Index and status-only UI cannot mount or enable',()=>{
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,17);
  assert.equal(expectedNativeFiles().length,26);
  assert.deepEqual(GAS_HTML_SOURCES.slice(-3),[
    'src/web/03k-client-report-generation.html',STATUS,'src/web/04-browser-app.html'
  ]);
  const entries=buildGasMultiFileEntries();
  assert.equal(entries.size,26);
  assert.equal(verifyGasMultiFileParity(entries),true);
  assert.equal(gasIndexTemplate().match(/include\('/g).length,17);
  assert.equal((gasIndexTemplate().match(/include\('03l-client-d331-status'\)/g)||[]).length,1);
  assert.ok(gasIndexTemplate().indexOf("include('03l-client-d331-status')")<
    gasIndexTemplate().indexOf("include('04-browser-app')"));
  assert.match(status,/button\.disabled=true;/);
  assert.match(foundation,/var D331_G1A_ENABLED = false;/);
  assert.doesNotMatch(status,/\bgoogle\.script\.run\b|SpreadsheetApp|PropertiesService|onload=|onclick=/);
  assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
  assert.match(auth,/!\['dashboard','records','reporter','admin','library'\]\.includes\(page\)/);
  assert.equal(GAS_SERVER_SOURCES.some(x=>/03-n1b1|04-n1b2b/.test(x)),false);
});
function stageFixture(change=()=>{}){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-c2c-a-stage-'));
  try{
    const stage=path.join(folder,'stage'),remote=path.join(folder,'remote');
    fs.mkdirSync(stage);fs.mkdirSync(remote);
    for(const filename of expectedNativeFiles()){
      const contents=filename==='Index.html'?gasIndexTemplate():'// inert synthetic content';
      fs.writeFileSync(path.join(stage,filename),contents);
    }
    const scriptManifest='{"runtimeVersion":"V8"}';
    const original=path.join(remote,'appsscript.json');
    fs.writeFileSync(original,scriptManifest);
    fs.writeFileSync(path.join(stage,'appsscript.json'),scriptManifest);
    change({stage,original,remote});
    return spawnSync(process.execPath,['-',stage,original],{input:stageCode,encoding:'utf8'});
  }finally{fs.rmSync(folder,{recursive:true,force:true})}
}
test('Native26 guarded stage is exact, manifest-preserving and denies mutated stage files',()=>{
  assert.ok(stageCode);
  const okay=stageFixture();
  assert.equal(okay.status,0,okay.stderr);
  assert.match(okay.stdout,/STAGE=PASS \(26 files \+ preserved manifest/);
  const bad=[
    ({stage})=>fs.writeFileSync(path.join(stage,'rogue.html'),'hello'),
    ({stage})=>fs.rmSync(path.join(stage,'03l-client-d331-status.html')),
    ({stage})=>fs.writeFileSync(path.join(stage,'03l-client-d331-status.html'),''),
    ({stage})=>fs.writeFileSync(path.join(stage,'Index.html'),
      gasIndexTemplate().replace("include('03l-client-d331-status')","include('rogue')")),
    ({stage})=>fs.writeFileSync(path.join(stage,'Index.html'),
      gasIndexTemplate().replace("include('03l-client-d331-status')","include('04-browser-app')")),
    ({stage})=>fs.writeFileSync(path.join(stage,'appsscript.json'),'{"runtimeVersion":"DEPRECATED_ES5"}')
  ];
  for(const mutation of bad){
    const run=stageFixture(mutation);
    assert.notEqual(run.status,0,'stage mutation must fail');
    assert.doesNotMatch(run.stdout,/STAGE=PASS/);
  }
});
test('no deployment authority or runtime patient/API access implied by source registration',()=>{
  assert.match(release,/SMART_SRRT_CONFIRM_DEPLOY/);
  assert.match(release,/BACKED_UP_NATIVE_26_LAYOUT=PASS/);
  assert.match(release,/BACKED_UP_NATIVE_25_LAYOUT=PASS/);
  assert.match(release,/BACKED_UP_NATIVE_24_LAYOUT=PASS/);
  assert.match(release,/BACKED_UP_NATIVE_13_LAYOUT=PASS/);
  assert.doesNotMatch(release,/create-deployment|create-project/);
  assert.doesNotMatch(status,/\bgetDb_\(|\bgetUserByToken_\(|\bgs\s*\(/);
});
