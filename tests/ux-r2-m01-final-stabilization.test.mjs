// M01-05: source-only stabilization gate for the entire Native multi-file browser.
// Deliberately excludes real Apps Script, Workspace, Gemini, network or deployment actions.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {buildGasMultiFileEntries,renderGasIndexOffline} from '../tools/build-apps-script-multifile.mjs';
import {readOrderedClientScripts,readInlineHandlerCalls} from './helpers/native-client.mjs';

const CLIENT=[
  '03a-dashboard-mobile',
  '03b-client-core',
  '03c-client-auth',
  '03d-client-dashboard',
  '03e-client-dashboard-export',
  '03f-client-event-controls',
  '03g-client-event-history',
  '03h-client-event-records',
  '03i-client-report-actions',
  '03j-client-report-job',
  '03k-client-report-generation',
  '04-browser-app',
].map(name=>'src/web/'+name+'.html');
const FINAL=CLIENT.at(-1);

function assertClientTopology(manifest,scripts){
  assert.equal(GAS_SERVER_SOURCES.length,7,'approved Native server manifest size changed');
  assert.deepEqual(manifest.slice(-CLIENT.length),CLIENT,
    'Core → Auth → Dashboard → Event → Reporter → Admin order changed');
  assert.deepEqual(scripts.map(script=>script.path),CLIENT,
    'each Native browser partial must contain exactly one ordered inline classic script');
  const boots=scripts.flatMap(script=>
    [...script.code.matchAll(/^\s*boot\(\);\s*$/gm)].map(()=>script.path));
  assert.deepEqual(boots,[FINAL],'boot must appear once, only in the final Admin script');

  // Deliberately characterize, rather than silently "fix", the historical
  // attachment/Admin duplicate, whose later declaration currently wins.
  const origins=new Map(),duplicates=[];
  for(const script of scripts){
    for(const match of script.code.matchAll(/^\s{2}(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)){
      const name=match[1],previous=origins.get(name);
      if(previous)duplicates.push({name,previous,current:script.path});
      origins.set(name,script.path);
    }
  }
  assert.deepEqual(duplicates,[{
    name:'fileToBase64',
    previous:'src/web/03f-client-event-controls.html',
    current:FINAL
  }],'unexpected global function overwrite across classic script tags');

  const joined=scripts.map(s=>s.code).join('\n');
  assert.equal([...joined.matchAll(/^\s{2}let\s+reportJobCreateInFlight=[^;\n]*,\s*reportJobCreateRequest=/gm)].length,1,
    'Report Job create request fence must remain a single shared lexical binding');
  for(const binding of ['token','dashboardLoadRequest','reportSummaryRequest',
    'reportUnknownNeedsVerification','reportHistoryRequest']){
    const count=[...joined.matchAll(new RegExp('^\\s{2}(?:let|const)\\s+'
      +binding+'\\b','gm'))].length;
    assert.equal(count,1,'critical shared binding duplicated or missing: '+binding);
  }
}

function sharedBrowser(scripts){
  const listeners=[],calls=[],elements=new Map();
  const el=id=>{
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{id,value:'',textContent:'',innerHTML:'',style:{display:''},
        classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),
          contains:name=>classes.has(name),toggle(){}},
        setAttribute(){},removeAttribute(){}});
    }
    return elements.get(id);
  };
  const context=vm.createContext({
    console,
    document:{readyState:'loading',getElementById:el,
      addEventListener:(name,handler)=>listeners.push({name,handler}),
      querySelectorAll(){return []}},
    google:{charts:{load(){}},script:{run:new Proxy({},{
      get(_target,name){calls.push(String(name));throw Error('unexpected live RPC: '+String(name))}
    })}},
    localStorage:{getItem(){return null}},setTimeout(){}
  });
  for(const script of scripts){
    // The real final boot performs a server RPC. Check global initialization
    // and declarations without calling any live service.
    const code=script.path===FINAL
      ?script.code.replace(/^\s*boot\(\);\s*$/m,'')
      :script.code;
    new vm.Script(code,{filename:script.path})
      .runInContext(context,{timeout:2000});
  }
  return {context,calls,listeners,el};
}

function assertHandlers(context,handlers){
  for(const {path,name} of handlers){
    assert.equal(vm.runInContext('typeof '+name,context),'function',
      'missing inline HTML callback '+name+' referenced by '+path);
  }
}

test('M01-05 Native 24-file topology is exact and globally collision-characterized',()=>{
  const scripts=readOrderedClientScripts();
  assert.equal(GAS_HTML_SOURCES.length,16);
  assertClientTopology(GAS_HTML_SOURCES,scripts);
  const entries=buildGasMultiFileEntries();
  assert.equal(entries.size,24);
  assert.deepEqual(renderGasIndexOffline(entries),
    Buffer.concat(GAS_HTML_SOURCES.map(source=>
      entries.get(source.split('/').at(-1)))));
  const final=entries.get('04-browser-app.html').toString('utf8');
  assert.match(final,/<\/script>\s*<\/body>\s*<\/html>\s*$/);
  for(const file of CLIENT.slice(0,-1)){
    const source=entries.get(file.split('/').at(-1)).toString('utf8');
    assert.doesNotMatch(source,/<\/body>|<\/html>|<\?/,file);
  }
});

test('M01-05 all Native classic scripts initialize together without RPC before boot',()=>{
  const scripts=readOrderedClientScripts();
  assertClientTopology(GAS_HTML_SOURCES,scripts);
  const {context,calls,listeners}=sharedBrowser(scripts);
  assert.deepEqual(calls,[],'module initialization must be network-free before boot');
  assert.ok(listeners.some(e=>e.name==='DOMContentLoaded'));
  assert.ok(listeners.some(e=>e.name==='keydown'));
  assert.equal(vm.runInContext('token',context),'');
  assert.equal(vm.runInContext('currentUser===null && allData.length===0',context),true);
  assert.equal(vm.runInContext('roleCanRecord()',context),null);
  for(const name of ['gs','doLogout','loadDashboard','drawCharts','renderTables',
    'openOwnerModal','openEventReportHistoryByIndex','saveRecord',
    'reportActionState','handleReportAction','makeReport','recoverReportJob',
    'runReportJobClient','confirmReportCancelRequest','loadAdmin','boot']){
    assert.equal(vm.runInContext('typeof '+name,context),'function',name);
  }
});

test('M01-05 all authored HTML inline handlers resolve to shared globals',()=>{
  const scripts=readOrderedClientScripts();
  const {context,calls}=sharedBrowser(scripts);
  const handlers=readInlineHandlerCalls({htmlSources:GAS_HTML_SOURCES});
  assert.ok(handlers.length>=40,'HTML callback count unexpectedly reduced');
  assertHandlers(context,handlers);
  assert.deepEqual(calls,[],'callback lookup must not send network requests');
});

test('M01-05 Report Registry unknown-state stays fail-closed and guest actions send no RPC',()=>{
  const {context,calls,el}=sharedBrowser(readOrderedClientScripts());
  const run=source=>vm.runInContext(source,context);
  assert.equal(run("reportActionState('event-1',false).mode"),'verify');
  run("handleReportAction('event-1',null)");
  assert.match(el('toast').textContent,/ไม่มีสิทธิ์/);
  assert.deepEqual(calls,[]);
  run("reportSummaryState={status:'ready',summaries:{'event-1':{count:0,invalidCount:0}}}");
  assert.equal(run("reportActionState('event-1',false).mode"),'generate');
  run('reportUnknownNeedsVerification=true');
  assert.equal(run("reportActionState('event-1',false).mode"),'verify');
  run("reportSummaryState={status:'ready',summaries:{'event-1':{count:1,invalidCount:0}}}");
  assert.equal(run("reportActionState('event-1',false).mode"),'history');
  run('reportUnknownNeedsVerification=false;reportJobCreateInFlight=true');
  assert.equal(run("reportActionState('event-1',false).mode"),'blocked');
  assert.equal(run("reportJobTerminal({status:'unknown'})"),true);
  assert.deepEqual(calls,[]);
});

test('M01-05 negative mutations are rejected: order, boot, collision and broken handler',()=>{
  const scripts=readOrderedClientScripts();
  const swapped=[...GAS_HTML_SOURCES];
  const index=swapped.indexOf('src/web/03j-client-report-job.html');
  [swapped[index],swapped[index+1]]=[swapped[index+1],swapped[index]];
  assert.throws(()=>assertClientTopology(swapped,scripts),/order changed/);
  const duplicateBoot=scripts.map(s=>s.path!=='src/web/03k-client-report-generation.html'
    ?s:{...s,code:s.code+'\n  boot();'});
  assert.throws(()=>assertClientTopology(GAS_HTML_SOURCES,duplicateBoot),/boot must appear once/);
  const duplicateFunction=scripts.map(s=>s.path!==FINAL
    ?s:{...s,code:s.code+'\n  function makeReport(){}'});
  assert.throws(()=>assertClientTopology(GAS_HTML_SOURCES,duplicateFunction),/function overwrite/);
  const {context}=sharedBrowser(scripts);
  assert.throws(()=>assertHandlers(context,[{path:'fixture.html',name:'missingNativeCallback'}]),
    /missing inline HTML callback/);
});
