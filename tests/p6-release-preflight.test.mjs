import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {expectedNativeFiles,NATIVE_STAGE_DIR} from '../tools/native-release-inspection.mjs';
import {runOfflinePreflight} from '../tools/p6-release-preflight.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const nativeSources=[...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES];

function isolatedFixture(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smart-srrt-p6-native-'));
  for(const source of nativeSources){
    const dest=path.join(temp,source);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(path.join(root,source),dest);
  }
  const stage=path.join(temp,NATIVE_STAGE_DIR);
  fs.mkdirSync(stage,{recursive:true});
  for(const name of expectedNativeFiles()){
    fs.copyFileSync(path.join(root,NATIVE_STAGE_DIR,name),path.join(stage,name));
  }
  return temp;
}

test('P6 Native offline preflight is PASS for code, but release authorization stays HOLD',()=>{
  const report=runOfflinePreflight();
  assert.equal(report.mode,'READ_ONLY_SOURCE_INSPECTION');
  assert.equal(report.codeGate,'PASS',JSON.stringify(report.checks.filter(x=>x.status!=='PASS')));
  assert.equal(report.releaseDecision,'HOLD');
  assert.equal(report.schemaVersion,7);
  assert.equal(report.artifacts.length,14);
  assert.equal(report.migrationOrder.length,6);
  assert.deepEqual(report.migrationOrder.map(x=>x.schemaFloor),[2,3,4,5,6,7]);
  assert.ok(report.migrationOrder.every(x=>x.execution==='NOT_RUN'&&x.dryRun===false));
  assert.ok(report.artifacts.every(x=>x.path.startsWith('dist/apps-script/')&&/^[0-9a-f]{64}$/.test(x.sha256)));
  assert.ok(report.humanGates.length>=5);
  for(const id of ['native-stage-names','native-index-template','native-template-trust','native-html-complete','installer-side-effects']){
    assert.ok(report.checks.some(x=>x.id===id&&x.status==='PASS'),id);
  }
});

test('P6 CLI prints machine-readable Native evidence without credentials and rejects arguments',()=>{
  const command=spawnSync(process.execPath,['tools/p6-release-preflight.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(command.status,0,command.stderr);
  const parsed=JSON.parse(command.stdout);
  assert.equal(parsed.codeGate,'PASS');
  assert.equal(parsed.releaseDecision,'HOLD');
  assert.equal(parsed.artifacts.length,14);
  assert.doesNotMatch(command.stdout,/GEMINI_API_KEY\s*[:=]\s*['"][^'"]+/);
  const invalid=spawnSync(process.execPath,['tools/p6-release-preflight.mjs','--write'],{cwd:root,encoding:'utf8'});
  assert.equal(invalid.status,2);
  assert.equal(invalid.stdout,'');
});

test('P6 Native preflight does not mutate any source or staged bytes',()=>{
  const all=[...nativeSources.map(p=>path.join(root,p)),...expectedNativeFiles().map(p=>path.join(root,NATIVE_STAGE_DIR,p))];
  const before=all.map(p=>[fs.statSync(p).mtimeMs,fs.statSync(p).size]);
  assert.equal(runOfflinePreflight().codeGate,'PASS');
  assert.deepEqual(all.map(p=>[fs.statSync(p).mtimeMs,fs.statSync(p).size]),before);
});

test('P6 fails closed on missing Native stage or stale staged output, without rebuilding',()=>{
  const tmp=isolatedFixture();
  try{
    const staged=path.join(tmp,NATIVE_STAGE_DIR,'Index.html');
    fs.rmSync(staged);
    let result=runOfflinePreflight(tmp);
    assert.equal(result.codeGate,'FAIL');
    assert.ok(result.checks.some(x=>x.id==='native-stage:Index.html'&&x.status==='FAIL'));
    assert.equal(fs.existsSync(staged),false);
    fs.copyFileSync(path.join(root,NATIVE_STAGE_DIR,'Index.html'),staged);
    fs.appendFileSync(path.join(tmp,GAS_HTML_SOURCES[2]),'\n<!-- synthetic authorized Native change -->');
    result=runOfflinePreflight(tmp);
    assert.equal(result.codeGate,'FAIL');
    assert.ok(result.checks.some(x=>x.id==='native-stage:'+path.basename(GAS_HTML_SOURCES[2])&&x.status==='FAIL'));
    assert.equal(result.releaseDecision,'HOLD');
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('P6 migration floor change fails even with perfectly matching Native staged bytes',()=>{
  const tmp=isolatedFixture();
  try{
    const source=path.join(tmp,'src/server/01-schema-and-db.gs');
    const staged=path.join(tmp,NATIVE_STAGE_DIR,'01-schema-and-db.gs');
    const before=fs.readFileSync(source,'utf8');
    assert.ok(before.includes('Math.max(existingSchemaVersion, 7)'));
    const changed=before.replace('Math.max(existingSchemaVersion, 7)','Math.max(existingSchemaVersion, 6)');
    fs.writeFileSync(source,changed);
    fs.writeFileSync(staged,changed);
    const report=runOfflinePreflight(tmp);
    assert.equal(report.codeGate,'FAIL');
    assert.ok(report.checks.some(x=>x.id==='migration:migrateG17ReportRegistry'&&x.status==='FAIL'));
    assert.ok(report.checks.some(x=>x.id==='native-stage:01-schema-and-db.gs'&&x.status==='PASS'));
    assert.equal(report.releaseDecision,'HOLD');
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('P6 catches lost report permission despite byte-perfect Native stage',()=>{
  const scenarios=[
    {fn:'getAIReportReadiness',check:'readiness-report-auth'},
    {fn:'generateReportFromWeb',check:'generation-report-auth'}
  ];
  for(const scenario of scenarios){
    const tmp=isolatedFixture();
    try{
      const name='05-reports-and-models.gs';
      const source=path.join(tmp,'src/server',name);
      const original=`function ${scenario.fn}(sessionToken, eventId) {
  ${scenario.fn==='generateReportFromWeb'?'var user = ':''}requireAuth_(sessionToken, 'report');`;
      const altered=`function ${scenario.fn}(sessionToken, eventId) {
  // synthetic permission regression only`;
      const text=fs.readFileSync(source,'utf8');
      assert.equal(text.split(original).length-1,1,'fixture anchor '+scenario.fn);
      const changed=text.replace(original,altered);
      fs.writeFileSync(source,changed);
      fs.writeFileSync(path.join(tmp,NATIVE_STAGE_DIR,name),changed);
      const report=runOfflinePreflight(tmp);
      assert.equal(report.codeGate,'FAIL',scenario.fn);
      assert.ok(report.checks.some(x=>x.id===scenario.check&&x.status==='FAIL'));
      assert.ok(report.checks.some(x=>x.id==='native-stage:'+name&&x.status==='PASS'));
      assert.equal(report.releaseDecision,'HOLD');
    }finally{fs.rmSync(tmp,{recursive:true,force:true});}
  }
});

test('P6 retains privacy, void identity and report registry compensation boundaries',()=>{
  const report=runOfflinePreflight();
  for(const id of ['privacy-boundary','report-history-auth','report-history-void','readiness-report-auth',
      'readiness-void-boundary','generation-report-auth','generation-void-boundary','generation-registry-commit']){
    assert.ok(report.checks.some(x=>x.id===id&&x.status==='PASS'),id);
  }
  assert.equal(report.releaseDecision,'HOLD');
});
