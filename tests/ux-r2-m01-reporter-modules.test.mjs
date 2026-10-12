// UX-R2-M01-04: characterization of Native AI Reporter classic-script seams.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
import {nativeClientSource} from './helpers/native-current.mjs';

const ACTIONS='src/web/03i-client-report-actions.html';
const JOB='src/web/03j-client-report-job.html';
const GENERATION='src/web/03k-client-report-generation.html';
const FINAL='src/web/04-browser-app.html';
const ordered=()=>readOrderedClientScripts();
const code=(scripts,file)=>scripts.find(s=>s.path===file)?.code||'';

function offlineClient(){
  const calls=[],cells=new Map();
  const el=id=>{
    if(!cells.has(id))cells.set(id,{value:'',textContent:'',innerHTML:'',style:{display:''},
      classList:{add(){},remove(){},toggle(){},contains(){return false}},
      setAttribute(){},removeAttribute(){}});
    return cells.get(id);
  };
  const ctx=vm.createContext({
    console,
    google:{charts:{load(){}},script:{run:new Proxy({},{get(_target,name){calls.push(name);
      throw Error('Unexpected network RPC: '+name)}})}},
    localStorage:{getItem(){return null}},
    document:{readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return []}},
    setTimeout(){}
  });
  for(const script of ordered()){
    const body=script.path===FINAL?script.code.replace(/^\s*boot\(\);\s*$/m,''):script.code;
    new vm.Script(body,{filename:script.path}).runInContext(ctx,{timeout:2000});
  }
  return {ctx,calls,el};
}

test('M01-04 Reporter actions, job, generation load in fixed order before final Admin/bootstrap',()=>{
  const sources=GAS_HTML_SOURCES;
  const indexes=[ACTIONS,JOB,GENERATION,FINAL].map(name=>sources.indexOf(name));
  assert.ok(indexes.every(n=>n>=0));
  assert.deepEqual(indexes,[...indexes].sort((a,b)=>a-b));
  assert.ok(sources.indexOf('src/web/03h-client-event-records.html')<indexes[0]);
  const scripts=ordered();
  for(const [file,names] of [
    [ACTIONS,['renderReportReadinessModal','refreshReportSummaries','reportActionState','preflightFirstReportGeneration','handleReportAction']],
    [JOB,['reportJobTerminal','reportStageLabel','pollReportTask','confirmReportCancelRequest','recoverReportJob','runReportJobClient']],
    [GENERATION,['executeReport','makeReport','continueReportFromWarning']],
    [FINAL,['loadAdmin','saveSettings','renderLibrary']]
  ])for(const name of names)assert.match(code(scripts,file),new RegExp('(?:async )?function '+name+'\\('),file+' '+name);
  assert.doesNotMatch(code(scripts,FINAL),/function (?:makeReport|reportActionState|runReportJobClient)\(/);
  assert.equal(scripts.filter(s=>/^\s*boot\(\);\s*$/m.test(s.code)).length,1);
  assert.match(code(scripts,FINAL),/^\s*boot\(\);\s*$/m);
  assert.equal((nativeClientSource.match(/const REPORT_JOB_LOCAL_KEY=/g)||[]).length,1);
  assert.equal((nativeClientSource.match(/let reportSummaryRequest=/g)||[]).length,1);
  assert.equal((nativeClientSource.match(/function fileToBase64\(/g)||[]).length,2);
});

test('M01-04 shared Reporter globals preserve guest denial and fail-closed unknown mode',()=>{
  const h=offlineClient(),r=expr=>vm.runInContext(expr,h.ctx);
  assert.equal(r("typeof makeReport"),'function');
  assert.equal(r("typeof recoverReportJob"),'function');
  assert.equal(r("typeof reportJobTerminal"),'function');
  assert.equal(r("reportJobTerminal({status:'unknown'})"),true);
  assert.equal(r("reportJobTerminal({status:'running'})"),false);
  assert.equal(r("reportActionState('event-id',false).mode"),'verify');
  r("handleReportAction('event-id',null)");
  assert.match(h.el('toast').textContent,/ไม่มีสิทธิ์/);
  assert.deepEqual(h.calls,[],'Guest action cannot dispatch RPC');

  r("reportSummaryState={status:'ready',summaries:{'event-id':{count:0,invalidCount:0}}}");
  assert.equal(r("reportActionState('event-id',false).mode"),'generate');
  r("reportUnknownNeedsVerification=true");
  assert.equal(r("reportActionState('event-id',false).mode"),'verify');
  r("reportSummaryState={status:'ready',summaries:{'event-id':{count:1,invalidCount:0}}}");
  assert.equal(r("reportActionState('event-id',false).mode"),'history');
  r("reportUnknownNeedsVerification=false;reportJobCreateInFlight=true");
  assert.equal(r("reportActionState('event-id',false).mode"),'blocked');
  assert.deepEqual(h.calls,[],'Only synthetic local state used in characterization');
});

test('M01-04 Job mutation boundaries retain session and report duplication guards',()=>{
  const scripts=ordered();
  const action=code(scripts,ACTIONS),job=code(scripts,JOB),generation=code(scripts,GENERATION);
  for(const guard of [
    /session!==token/,/user!==currentUser/,/reportActionPreflightInFlight/,
    /getReportSummariesForEvents/,/reportSummaryState/
  ])assert.match(action,guard);
  assert.match(job,/getReportJobStatus/);
  assert.match(job,/reportUnknownNeedsVerification/);
  assert.match(job,/cancelReportJob/);
  assert.match(generation,/reportJobCreateRequest/);
  assert.match(generation,/createReportJob/);
  assert.match(generation,/getAIReportReadiness/);
  assert.match(generation,/reportGenerationInFlight/);
  assert.match(generation,/session!==token/);
  assert.doesNotMatch(code(scripts,FINAL),/createReportJob|runReportJob|cancelReportJob/);
});
