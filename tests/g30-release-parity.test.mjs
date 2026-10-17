import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {inspectNativeRelease,expectedNativeFiles,expectedNativeIndex} from '../tools/native-release-inspection.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=()=>inspectNativeRelease(root);
const {server,html}=snapshot();

test('G-30 current release uses the ordered Native 26-file inert manifest and exact stage bytes',()=>{
  const data=snapshot();
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,17);
  assert.equal(expectedNativeFiles().length,26);
  assert.equal(expectedNativeIndex().match(/include\('/g).length,17);
  assert.equal(data.artifacts.length,26,'Native stage must be prepared by CI before contract tests');
  assert.deepEqual(data.checks.filter(x=>x.status!=='PASS'),[]);
  assert.ok(html.includes('srrtDashboardCards'),'native-only responsive module missing');
});

test('G-30 staged Native source checks are read-only; source and extra stage drift fail closed',()=>{
  const files=[...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES].map(p=>path.join(root,p))
    .concat(expectedNativeFiles().map(p=>path.join(root,'dist/apps-script',p)));
  const before=files.map(p=>[fs.statSync(p).mtimeMs,fs.statSync(p).size]);
  assert.deepEqual(snapshot().checks.filter(x=>x.status!=='PASS'),[]);
  assert.deepEqual(files.map(p=>[fs.statSync(p).mtimeMs,fs.statSync(p).size]),before);

  // Only test in a temporary root; no changes to checked-in or generated source.
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'smart-srrt-native-g30-'));
  try{
    for(const source of [...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES]){
      const dest=path.join(fixture,source);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(path.join(root,source),dest);
    }
    fs.symlinkSync(path.join(root,'node_modules'),path.join(fixture,'node_modules'),'dir');
    const stage=path.join(fixture,'dist/apps-script');
    fs.mkdirSync(stage,{recursive:true});
    for(const name of expectedNativeFiles()){
      fs.copyFileSync(path.join(root,'dist/apps-script',name),path.join(stage,name));
    }
    assert.deepEqual(inspectNativeRelease(fixture).checks.filter(x=>x.status!=='PASS'),[]);
    const changedSource=path.join(fixture,GAS_HTML_SOURCES[2]);
    fs.appendFileSync(changedSource,'\n<!-- native source drift -->');
    const changed=inspectNativeRelease(fixture);
    assert.ok(changed.checks.some(x=>x.id==='native-stage:'+path.basename(GAS_HTML_SOURCES[2])&&x.status==='FAIL'));
    fs.copyFileSync(path.join(root,GAS_HTML_SOURCES[2]),changedSource);
    fs.writeFileSync(path.join(stage,'rogue.html'),'unexpected');
    assert.ok(inspectNativeRelease(fixture).checks.some(x=>x.id==='native-stage-names'&&x.status==='FAIL'));
    fs.rmSync(path.join(stage,'rogue.html'));
    fs.rmSync(path.join(stage,'Index.html'));
    assert.ok(inspectNativeRelease(fixture).checks.some(x=>x.id==='native-stage:Index.html'&&x.status==='FAIL'));
  }finally{fs.rmSync(fixture,{recursive:true,force:true});}
});

test('G-30 all current Native server modules and inline browser scripts parse',()=>{
  for(const source of GAS_SERVER_SOURCES){
    assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,source),'utf8'),{filename:source}));
  }
  let checked=0;
  for(const source of GAS_HTML_SOURCES){
    const text=fs.readFileSync(path.join(root,source),'utf8');
    for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
      if(/\bsrc\s*=/.test(match[1]))continue;
      assert.doesNotThrow(()=>new vm.Script(match[2],{filename:source}));
      checked++;
    }
  }
  assert.ok(checked>=2,'browser script and native Dashboard card script must parse');
});

test('G-30 has no duplicate top-level server functions',()=>{
  const names=[...server.matchAll(/^function\s+([\w$]+)\s*\(/gm)].map(x=>x[1]);
  const seen=new Set(),duplicates=[];
  for(const name of names){if(seen.has(name))duplicates.push(name);seen.add(name);}
  assert.ok(names.length>=150,'unexpected loss of server functions');
  assert.deepEqual(duplicates,[]);
  assert.equal(names.filter(n=>n==='forceGeminiModelAuto').length,1);
  assert.match(server,/function forceGeminiModelStable\(\)\s*\{\s*requireTrustedOperator_\('forceGeminiModelStable'\);\s*return forceGeminiModelAuto\(\);/);
  assert.match(server,/function forceGeminiModelAuto\(\)[\s\S]*?sheet\.getRange\(i \+ 1, 3\)\.setValue/);
});

test('G-30 literal RPC targets in all Native HTML resolve on Native server',()=>{
  const names=new Set([...server.matchAll(/^function\s+([\w$]+)\s*\(/gm)].map(x=>x[1]));
  const targets=[...new Set([...html.matchAll(/\bgs\(\s*['"]([\w$]+)['"]/g)].map(x=>x[1]))];
  assert.ok(targets.length>=40,'unexpected loss of browser RPCs');
  assert.deepEqual(targets.filter(x=>!names.has(x)),[]);
  assert.match(server,/function getPublicDashboardData\(/);
  assert.match(server,/function listReportsForEvent\(/);
  assert.match(server,/function getAIReportReadiness\(/);
});

test('G-30 Native server preserves schema v7, history and report authorization contracts',()=>{
  assert.match(server,/SCHEMA_VERSION:\s*'7'/);
  assert.match(server,/var REPORT_REGISTRY_HEADERS = \[/);
  assert.match(server,/function listReportsForEvent\(sessionToken, eventId\)/);
  assert.match(server,/function getAIReportReadiness\(sessionToken, eventId\)/);
  assert.match(html,/id="reportHistoryModal"/);
  assert.match(server,/function generateReportFromWeb\(sessionToken, eventId\)/);
  assert.doesNotMatch(server,/function migrateG30/);
});
