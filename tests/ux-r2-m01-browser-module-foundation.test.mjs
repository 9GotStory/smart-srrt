// M01-00: tests the intended ordered-classic-script boundary before source extraction.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {readOrderedClientScripts,readInlineHandlerCalls} from './helpers/native-client.mjs';
import {nativeClientScripts,nativeClientSource,nativeBrowser} from './helpers/native-current.mjs';

test('M01-00 reads every inline classic script from the canonical ordered manifest',()=>{
  const scripts=readOrderedClientScripts();
  assert.deepEqual(scripts,nativeClientScripts);
  assert.equal(nativeClientSource,scripts.map(s=>s.code).join('\n'));
  assert.ok(scripts.length>=2,'Dashboard mobile and browser scripts must be present');
  assert.ok(scripts.some(s=>s.path==='src/web/03a-dashboard-mobile.html'));
  assert.equal(scripts.at(-1).path,'src/web/04-browser-app.html');
  assert.ok(GAS_HTML_SOURCES.indexOf('src/web/03a-dashboard-mobile.html')<
    GAS_HTML_SOURCES.indexOf('src/web/04-browser-app.html'));
  // Existing test suites still consume the monolithic snapshot during incremental migration.
  assert.ok(nativeBrowser.startsWith('<script>'));
  const boots=scripts.filter(s=>/^\s*boot\(\);\s*$/m.test(s.code));
  assert.equal(boots.length,1,'one and only one client bootstrap');
  assert.equal(boots[0].path,'src/web/04-browser-app.html');
  for(const script of scripts){
    assert.doesNotThrow(()=>new vm.Script(script.code,{filename:script.path}));
  }
});

test('M01-00 current scripts expose existing markup handlers in a shared classic global scope',()=>{
  const scripts=readOrderedClientScripts();
  const listeners=[];
  const context=vm.createContext({
    document:{readyState:'loading',addEventListener:(name,callback)=>listeners.push(name)},
    google:{charts:{load(){} }},
    localStorage:{getItem(){return null}},
    console
  });
  for(const script of scripts){
    // Skip only the final network-triggering boot call: this is a source/scope
    // characterization test, not a live getAppBoot or authenticated browser test.
    const body=script.path==='src/web/04-browser-app.html'
      ?script.code.replace(/^\s*boot\(\);\s*$/m,'')
      :script.code;
    new vm.Script(body,{filename:script.path}).runInContext(context,{timeout:2000});
  }
  const handlers=readInlineHandlerCalls();
  assert.ok(handlers.length>=40,'unexpected loss of markup event handlers');
  for(const {path:source,name} of handlers){
    assert.equal(vm.runInContext('typeof '+name,context),'function',
      source+' references missing global handler '+name);
  }
  assert.equal(vm.runInContext('currentUser===null && Array.isArray(allData)',context),true);
  assert.ok(listeners.includes('DOMContentLoaded'),'native Dashboard observer registration missing');
  assert.ok(listeners.includes('keydown'),'existing keyboard listeners missing');
  // This known duplicate declaration is an existing behavior to characterize
  // before any extraction, not a license for new cross-file name collisions.
  assert.equal((nativeBrowser.match(/^\s*function fileToBase64\(/gm)||[]).length,2);
});

test('M01-00 multiple classic scripts share globals and depend on manifest order',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'srrt-m01-client-'));
  const sources=['src/web/00-client-core.html','src/web/01-client-feature.html','src/web/02-client-boot.html'];
  try{
    for(const src of sources)fs.mkdirSync(path.dirname(path.join(dir,src)),{recursive:true});
    fs.writeFileSync(path.join(dir,sources[0]),
      '<script>function core(){return "shared-"} const clientSeed="value";</script>');
    fs.writeFileSync(path.join(dir,sources[1]),
      '<script>const featureValue=core()+clientSeed;function inlineTarget(){return featureValue}</script>');
    fs.writeFileSync(path.join(dir,sources[2]),
      '<script>window.output=inlineTarget();</script></body></html>');
    const ordered=readOrderedClientScripts({root:dir,htmlSources:sources});
    const run=scripts=>{
      const ctx=vm.createContext({window:{}});
      for(const s of scripts)new vm.Script(s.code).runInContext(ctx);
      return ctx.window.output;
    };
    assert.equal(run(ordered),'shared-value');
    const wrong=readOrderedClientScripts({root:dir,htmlSources:[sources[1],sources[0],sources[2]]});
    assert.throws(()=>run(wrong),/core is not defined/);
    fs.writeFileSync(path.join(dir,sources[1]),'<script type="module">export const x=1;</script>');
    assert.throws(()=>readOrderedClientScripts({root:dir,htmlSources:sources}),/classic JavaScript/);
    fs.writeFileSync(path.join(dir,sources[1]),'<script defer>const x=1;</script>');
    assert.throws(()=>readOrderedClientScripts({root:dir,htmlSources:sources}),/Non-deterministic/);
    fs.writeFileSync(path.join(dir,sources[1]),'<script>const x=1;');
    assert.throws(()=>readOrderedClientScripts({root:dir,htmlSources:sources}),/Unclosed or malformed/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('M01-00 baseline has no top-level function name collision between Native client files',()=>{
  const origins=new Map();
  for(const script of readOrderedClientScripts()){
    // Two-space indentation is the existing browser convention; this is a
    // conservative collision signal, not an AST/global-binding authority.
    for(const match of script.code.matchAll(/^\s{2}(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)){
      const name=match[1],prior=origins.get(name);
      if(prior&&prior!==script.path)assert.fail(name+' declared in '+prior+' and '+script.path);
      origins.set(name,script.path);
    }
  }
});

test('M01-01 splits core and authentication before feature scripts without changing their globals',()=>{
  const scripts=readOrderedClientScripts();
  const files=scripts.map(script=>script.path);
  const mobile=files.indexOf('src/web/03a-dashboard-mobile.html');
  const core=files.indexOf('src/web/03b-client-core.html');
  const auth=files.indexOf('src/web/03c-client-auth.html');
  const browser=files.indexOf('src/web/04-browser-app.html');
  const dashboard=files.indexOf('src/web/03d-client-dashboard.html');
  const exporter=files.indexOf('src/web/03e-client-dashboard-export.html');
  const controls=files.indexOf('src/web/03f-client-event-controls.html');
  const history=files.indexOf('src/web/03g-client-event-history.html');
  const records=files.indexOf('src/web/03h-client-event-records.html');
  assert.ok(mobile>=0&&mobile<core&&core<auth&&auth<dashboard&&dashboard<exporter&&exporter<controls&&controls<history&&history<records&&records<browser,'Native include ordering changed');
  const coreCode=scripts[core].code,authCode=scripts[auth].code,browserCode=scripts[browser].code;
  assert.match(coreCode,/let token=localStorage\.getItem\('SRRT_TOKEN'\)/);
  assert.match(coreCode,/function gs\(fn,\.\.\.args\)/);
  assert.match(coreCode,/function roleCanRecord\(\)/);
  assert.match(coreCode,/const fields=\[/);
  assert.match(authCode,/function showPage\(page,btn\)/);
  assert.match(authCode,/async function boot\(\)/);
  assert.match(authCode,/async function doLogout\(\)/);
  assert.match(authCode,/async function register\(\)/);
  const dashboardCode=scripts[files.indexOf('src/web/03d-client-dashboard.html')].code;
  const exportCode=scripts[files.indexOf('src/web/03e-client-dashboard-export.html')].code;
  assert.match(dashboardCode,/function setupDashboardFilters\(\)/);
  assert.match(dashboardCode,/function drawCharts\(\)/);
  assert.match(exportCode,/function exportClientExcel\(\)/);
  assert.match(exportCode,/function captureDashboard\(\)/);
  assert.doesNotMatch(browserCode,/function setupDashboardFilters\(\)|function exportClientExcel\(\)/);
  assert.match(browserCode,/^\s*boot\(\);\s*$/m);
  assert.doesNotMatch(coreCode+authCode,/\b(?:createReportJob|runReportJob|generateReportFromWeb)\s*\(/);
  assert.doesNotMatch(browserCode,/\blet token\s*=/);
  assert.equal((nativeClientSource.match(/^\s*function fileToBase64\(/gm)||[]).length,2);
  // A browser-style shared lexical environment across separate script tags:
  const ctx=vm.createContext({document:{readyState:'loading',addEventListener(){}},
    google:{charts:{load(){}}},localStorage:{getItem(){return null}}});
  for(const script of scripts){
    const code=script.path===files[browser]?script.code.replace(/^\s*boot\(\);\s*$/m,''):script.code;
    new vm.Script(code,{filename:script.path}).runInContext(ctx,{timeout:2000});
  }
  assert.equal(vm.runInContext('typeof token',ctx),'string');
  assert.equal(vm.runInContext('typeof doLogout',ctx),'function');
  assert.equal(vm.runInContext('roleCanRecord()',ctx),null);
});
