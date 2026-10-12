// UX-R2-M01-03: event, history, owner and attachments retain one global classic-script realm.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
import {nativeClientSource,nativeHtml} from './helpers/native-current.mjs';

const OWNER='src/web/03f-client-event-controls.html';
const HISTORY='src/web/03g-client-event-history.html';
const RECORDS='src/web/03h-client-event-records.html';
const FINAL='src/web/04-browser-app.html';

function fixture(){
  const elements=new Map(),rpc=[],listeners=[],opened=[];
  const el=id=>{
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{id,value:'',textContent:'',innerHTML:'',disabled:false,
        style:{display:''},classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),
          contains:s=>classes.has(s)},focus(){},setAttribute(){},removeAttribute(){}});
    }
    return elements.get(id);
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener:(name,fn)=>listeners.push({name,fn})},
    localStorage:{getItem(){return null}},
    google:{charts:{load(){}},script:{run:new Proxy({},{get(_,name){rpc.push(name);throw Error('Unexpected live RPC: '+name)}})}},
    setTimeout(){},console
  });
  for(const source of readOrderedClientScripts()){
    const code=source.path===FINAL?source.code.replace(/^\s*boot\(\);\s*$/m,''):source.code;
    new vm.Script(code,{filename:source.path}).runInContext(ctx,{timeout:2000});
  }
  return {ctx,el,rpc,listeners,opened};
}

test('M01-03 Native manifest preserves event-to-report ordering and final single boot',()=>{
  const positions=[OWNER,HISTORY,RECORDS,FINAL].map(x=>GAS_HTML_SOURCES.indexOf(x));
  assert.ok(positions.every(x=>x>=0));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  assert.ok(GAS_HTML_SOURCES.indexOf('src/web/03e-client-dashboard-export.html')<positions[0]);
  const scripts=readOrderedClientScripts();
  const at=name=>scripts.find(s=>s.path===name)?.code||'';
  for(const [module,functions] of [
    [OWNER,['riskBadge','openOwnerModal','saveEventOwner','openAttachmentModal','loadAttachmentList','uploadAttachment','removeAttachment']],
    [HISTORY,['openEventReportHistoryByIndex','requestNewReportFromHistory','confirmNewReportFromHistory']],
    [RECORDS,['renderTables','buildRecordForm','openRecordForm','saveRecord','deleteEvent','closeEventFlow','reopenEventFlow']]
  ])for(const fn of functions)assert.match(at(module),new RegExp('(?:async )?function '+fn+'\\('),module+': '+fn);
  assert.match(at('src/web/03i-client-report-actions.html'),/function renderReportReadinessModal\(/);
  assert.match(at('src/web/03j-client-report-job.html'),/async function recoverReportJob\(/);
  assert.match(at('src/web/03k-client-report-generation.html'),/async function executeReport\(/);
  assert.doesNotMatch(at(FINAL),/function (?:renderReportReadinessModal|recoverReportJob|executeReport)\(/);
  assert.doesNotMatch(at(FINAL),/function (?:renderTables|buildRecordForm|openEventReportHistoryByIndex)\(/);
  assert.equal((nativeClientSource.match(/^\s*function fileToBase64\(/gm)||[]).length,2,
    'the pre-existing duplicate is retained for later explicit treatment');
  assert.equal(scripts.filter(s=>/^\s*boot\(\);\s*$/m.test(s.code)).length,1);
  assert.match(at(FINAL),/^\s*boot\(\);\s*$/m);
  assert.ok(nativeHtml.indexOf('function renderTables()')<nativeHtml.indexOf('function renderReportReadinessModal('));
});

test('M01-03 guest Event tables and private history/owner/attachment entrypoints remain closed',async()=>{
  const h=fixture();
  vm.runInContext('renderTables()',h.ctx);
  for(const id of ['eventBody','recordBody','reportBody'])assert.equal(h.el(id).innerHTML,'');
  vm.runInContext("allData=[{eventId:'private-event-id',revision:2,recordStatus:'active'}]",h.ctx);
  await vm.runInContext('openOwnerModal(0)',h.ctx);
  await vm.runInContext('openEventReportHistoryByIndex(0)',h.ctx);
  await vm.runInContext('openAttachmentModal(0)',h.ctx);
  assert.equal(h.rpc.length,0,'guest must not call any owner/attachment/history RPC');
  assert.equal(h.el('loginModal').classList.contains('open'),true);
  assert.match(h.el('toast').textContent,/สิทธิ์|ไม่มีสิทธิ์/);
});

test('M01-03 shared EventID/Revision fields and single reactive state remain across scripts',()=>{
  const h=fixture();
  const result=vm.runInContext(`({
    fields:fields.map(x=>x[0]),owner:typeof openOwnerModal,history:typeof openEventReportHistoryByIndex,
    attachment:typeof openAttachmentModal,records:typeof saveRecord,
    report:typeof recoverReportJob,historyRequest:reportHistoryRequest,
    dashboardRequest:dashboardLoadRequest
  })`,h.ctx);
  assert.equal(result.fields.length,26);
  assert.equal(new Set(result.fields).size,26);
  for(const key of ['owner','history','attachment','records','report'])assert.equal(result[key],'function');
  assert.equal(result.historyRequest,0);
  assert.equal(result.dashboardRequest,0);
  assert.ok(h.listeners.some(x=>x.name==='keydown'),'history keyboard handlers must still register');
  assert.equal(h.rpc.length,0,'initializing modules must not trigger live RPCs');
});
