import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES,
  buildGasMultiFileEntries} from '../tools/build-apps-script-multifile.mjs';
import {buildD331Native26Preview,
  verifyD331Native26Preview} from '../tools/d331-n1c2b-native26-preview.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PREVIEW_TOOL=fs.readFileSync(path.join(ROOT,'tools/d331-n1c2b-native26-preview.mjs'),'utf8');
function synth(){
  return buildD331Native26Preview();
}
function clone(value){
  return {htmlSources:[...value.htmlSources],
    entries:new Map([...value.entries].map(([k,v])=>[k,Buffer.from(v)])),
    renderedHtml:Buffer.from(value.renderedHtml)};
}
function reject(change){
  const v=clone(synth());
  change(v);
  assert.throws(()=>verifyD331Native26Preview(v),/D331_N1C2B_PREVIEW_DENIED/);
}

test('N1-C2B preview has exact 8 GS + 17 HTML + Index but live Native25 stays exact',()=>{
  const canonical=buildGasMultiFileEntries();
  const preview=synth();
  assert.equal(canonical.size,25);
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,16);
  assert.equal(preview.entries.size,26);
  assert.equal(preview.htmlSources.length,17);
  assert.equal(preview.htmlSources.at(-1),'src/web/04-browser-app.html');
  assert.equal(preview.htmlSources.at(-2),'src/web/03l-client-d331-status.html');
  assert.equal(GAS_HTML_SOURCES.includes('src/web/03l-client-d331-status.html'),false);
  assert.equal(canonical.has('03l-client-d331-status.html'),false);
  assert.equal(canonical.get('Index.html').toString('utf8').includes('03l-client-d331-status'),false);
  const inspected=verifyD331Native26Preview(preview);
  assert.equal(inspected.state,'PREVIEW_ONLY');
  assert.equal(inspected.originalNativeFiles,25);
  assert.equal(inspected.previewNativeFiles,26);
  assert.equal(inspected.registeredInRealManifest,false);
  assert.equal(inspected.deploymentAllowed,false);
});

test('preview alters only isolated layout and synthetic Index and one inert HTML partial',()=>{
  const original=buildGasMultiFileEntries();
  const before=new Map([...original].map(([k,v])=>[k,Buffer.from(v)]));
  const preview=synth();
  const after=buildGasMultiFileEntries();
  for(const [name,bytes] of before){
    assert.ok(bytes.equals(after.get(name)),'canonical bytes drifted: '+name);
    if(name!=='Index.html'&&name!=='02-app-layout.html'){
      assert.ok(bytes.equals(preview.entries.get(name)),'unapproved preview drift '+name);
    }
  }
  assert.ok(!before.get('02-app-layout.html').equals(preview.entries.get('02-app-layout.html')));
  assert.ok(!before.get('Index.html').equals(preview.entries.get('Index.html')));
  assert.ok(preview.entries.has('03l-client-d331-status.html'));
  assert.ok(!preview.entries.has('appsscript.json'),'only source fragments, not deployment artifacts');
});

test('hidden inert Dengue status root appears only in preview, five live routes stay unchanged',()=>{
  const preview=synth();
  const html=preview.renderedHtml.toString('utf8');
  const actualLayout=fs.readFileSync(path.join(ROOT,'src/web/02-app-layout.html'),'utf8');
  assert.doesNotMatch(actualLayout,/page-dengue|d331-status-root|data-page="dengue"/);
  assert.match(html,/<section id="page-dengue" class="section" hidden inert aria-hidden="true"/);
  assert.match(html,/<div id="d331-status-root"><\/div>/);
  assert.doesNotMatch(html,/data-page="dengue"/);
  const original=[...actualLayout.matchAll(/data-page="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(original,['dashboard','records','reporter','admin','library']);
  assert.equal(html.includes('โมดูล Dengue 3-3-1 ยังไม่เปิดใช้งาน'),true);
  assert.ok(html.trimEnd().endsWith('</html>'));
  assert.ok(html.indexOf('d331N1cStatusWorkspace_')<html.lastIndexOf('  boot();'));
});

test('preview-only Dengue renderer is dormant, actions always disabled and unknown => OFF',()=>{
  const v=synth();
  const html=v.entries.get('03l-client-d331-status.html').toString('utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script);
  const sandbox=vm.createContext({});
  new vm.Script(script[1]).runInContext(sandbox,{timeout:1000});
  const api=sandbox.d331N1cStatusWorkspace_;
  assert.equal(api.knownState('READY'),'OFF');
  assert.equal(api.knownState('ENABLED'),'OFF');
  assert.equal(api.knownState('LOADING'),'LOADING');
  assert.match(html,/button.disabled=true/);
  assert.equal(sandbox.currentUser,undefined);
  assert.equal(sandbox.token,undefined);
  assert.doesNotMatch(script[1],/google\.script\.run|SpreadsheetApp|PropertiesService/);
});

test('existing closed-world showPage cannot navigate to hidden preview Dengue route',()=>{
  const auth=fs.readFileSync(path.join(ROOT,'src/web/03c-client-auth.html'),'utf8');
  const start=auth.indexOf('  function showPage(page,btn){');
  const end=auth.indexOf('  function applyTheme(){',start);
  assert.ok(start>0&&end>start);
  const sections=['dashboard','records','reporter','admin','library','dengue'].map(id=>({
    id:'page-'+id,
    classList:{add(){},remove(){}}
  }));
  const calls=[];
  const context=vm.createContext({
    el:id=>sections.find(s=>s.id===id),
    document:{querySelectorAll:()=>{calls.push('query');return sections;}},
    roleCanRecord:()=>true,roleCanManage:()=>true,
    toggleSidebar:()=>calls.push('sidebar'),
    renderTables:()=>calls.push('tables'),
    renderLibrary:()=>calls.push('library'),
    loadAdmin:()=>calls.push('admin'),
    toast:()=>calls.push('toast'),
  });
  new vm.Script(auth.slice(start,end)).runInContext(context);
  vm.runInContext("showPage('dengue')",context);
  vm.runInContext("showPage('DENGUE')",context);
  vm.runInContext("showPage('__proto__')",context);
  assert.deepEqual(calls,[],'unregistered D331 route must be rejected before UI changes');
});

test('any mutated preview order, index, UI, or hidden fallback is rejected',()=>{
  reject(v=>v.htmlSources.splice(-2,1));
  reject(v=>v.htmlSources.splice(-2,2,'src/web/04-browser-app.html','src/web/03l-client-d331-status.html'));
  reject(v=>v.entries.set('Index.html',Buffer.from('UNAPPROVED')));
  reject(v=>v.entries.set('02-app-layout.html',Buffer.from(v.entries.get('02-app-layout.html').toString('utf8').replace(' hidden inert',''))));
  reject(v=>v.entries.set('03l-client-d331-status.html',Buffer.from('UNAPPROVED')));
  reject(v=>v.entries.set('00-g1a-foundation.gs',Buffer.from('var D331_G1A_ENABLED = true;')));
  reject(v=>v.entries.set('unauthorized.gs',Buffer.from('RPC')));
  reject(v=>v.entries.delete('03l-client-d331-status.html'));
  reject(v=>v.renderedHtml=Buffer.concat([v.renderedHtml,Buffer.from('extra')]));
  reject(v=>v.entries.set('04-browser-app.html',Buffer.from('boot();')));
});

test('preview tool contains no external operations or release script invocation',()=>{
  assert.doesNotMatch(PREVIEW_TOOL,/\b(?:node:child_process|node:http|node:https|https?:\/\/|googleapis|DriveApp|SpreadsheetApp|PropertiesService|ScriptApp|UrlFetchApp)\b/);
  assert.doesNotMatch(PREVIEW_TOOL,/\b(?:writeFileSync|appendFileSync|rmSync|mkdirSync|renameSync|spawnSync|execSync|fetch\s*\()\b/);
  assert.doesNotMatch(PREVIEW_TOOL,/SMART_SRRT_SCRIPT_ID|SMART_SRRT_DEPLOYMENT_ID|DATABASE_SPREADSHEET_ID/);
  const manifest=fs.readFileSync(path.join(ROOT,'tools/native-sources.mjs'),'utf8');
  const deploy=fs.readFileSync(path.join(ROOT,'tools/deploy-g34-clasp.sh'),'utf8');
  assert.doesNotMatch(manifest,/03l-client-d331-status/);
  assert.match(deploy,/Invalid Native25 expected layout/);
  assert.doesNotMatch(deploy,/native26Layout|Native26/i);
});
