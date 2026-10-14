// UX-R1/P5-02: human-readable report modal state without mutation-policy changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('src/web/03-modals.html'),auth=read('src/web/03c-client-auth.html'),jobSource=read('src/web/03j-client-report-job.html');
function fixture(){
  const elements=new Map(),calls=[];
  const el=id=>{
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{id,value:'',textContent:'',innerHTML:'',disabled:false,hidden:false,
        dataset:{},style:{display:''},href:'',
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
        setAttribute(name,v){this[name]=v},removeAttribute(name){delete this[name]},
        focus(){}
      });
    }
    return elements.get(id)
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){},
      querySelectorAll(){return[]}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},
    setInterval(){return 7},clearInterval(){},console
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path}).runInContext(ctx,{timeout:3000})
  }
  ctx.gs=(...args)=>{calls.push(args);return Promise.resolve({reports:[],count:0,currentRevision:3})};
  return {ctx,el,calls}
}
test('P5-02 dialogs expose meaningful labels, context, human-review warning and status region',()=>{
  for(const [id,title] of [
    ['reportHistoryModal','reportHistoryTitle'],['reportReadinessModal','reportReadinessTitle'],
    ['reportResultModal','reportResultTitle']
  ])assert.match(html,new RegExp('id="'+id+'" role="dialog" aria-modal="true" aria-labelledby="'+title+'"'));
  for(const id of ['reportHistoryEventContext','reportReadinessEventContext','reportJobStateNote'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/รายงาน AI เป็นเพียงฉบับร่าง/);
  assert.match(html,/aria-busy="false"/);
  assert.match(auth,/el\('reportHistoryList'\)\.innerHTML=''/);
});
test('P5-02 readiness uses authorized event context and keeps warnings advisory',()=>{
  const h=fixture();
  vm.runInContext('token="session";currentUser={role:"Admin"};allData=[{eventId:"E1",col6:"ข้อมูลตัวอย่าง",col2:"2569-10-14"}]',h.ctx);
  vm.runInContext('renderReportReadinessModal({level:"limited",warningCount:1,warnings:[{severity:"core",message:"ควรเพิ่มข้อเท็จจริง"}]},"E1")',h.ctx);
  assert.match(h.el('reportReadinessEventContext').textContent,/ข้อมูลตัวอย่าง/);
  assert.match(h.el('reportReadinessSummary').innerHTML,/คำเตือน 1 รายการ/);
  assert.match(h.el('reportReadinessWarnings').innerHTML,/ควรเพิ่มข้อเท็จจริง/);
  assert.equal(h.calls.length,0);
});
test('P5-02 history context and list remain read-only; no regeneration RPC',async()=>{
  const h=fixture();
  vm.runInContext('token="session";currentUser={role:"Admin"};allData=[{eventId:"E2",col6:"เหตุการณ์จำลอง",col2:"2569-10-13",revision:3}]',h.ctx);
  await vm.runInContext('openEventReportHistoryByIndex(0)',h.ctx);
  assert.match(h.el('reportHistoryEventContext').textContent,/เหตุการณ์จำลอง/);
  assert.match(h.el('reportHistorySummary').textContent,/จำนวนรายงาน 0 รายการ/);
  assert.equal(h.el('reportHistoryNewBtn').style.display,'none');
  assert.deepEqual(h.calls.map(x=>x[0]),['listReportsForEvent']);
});
test('P5-02 job state descriptions distinguish uncertain, queued, cancelled and completed',()=>{
  const h=fixture(),ctx=h.ctx;
  const statuses=['queued','preparing','running','finalizing','cancel_requested','cancelled','failed','unknown','completed'];
  const notes=statuses.map(status=>vm.runInContext('reportJobStateDescription({status:'+JSON.stringify(status)+'})',ctx));
  assert.equal(new Set(notes).size,statuses.length-1); // preparing and running share the same ongoing note
  assert.match(notes[statuses.indexOf('unknown')],/ห้ามสั่งสร้างรายงานซ้ำ/);
  assert.match(notes[statuses.indexOf('cancel_requested')],/อาจยังดำเนินอยู่/);
  assert.match(notes[statuses.indexOf('completed')],/ตรวจทานร่าง/);
  vm.runInContext('updateReportJobStatePresentation({status:"unknown"})',ctx);
  assert.equal(h.el('reportJobStateNote').dataset.reportStatus,'unknown');
  assert.equal(h.el('reportTaskIndicator')['aria-busy'],'false');
  vm.runInContext('updateReportJobStatePresentation({status:"queued"})',ctx);
  assert.equal(h.el('reportTaskIndicator')['aria-busy'],'true');
  assert.match(jobSource,/function reportJobStateDescription\(job\)/);
  assert.equal(h.calls.length,0);
});
test('P5-02 status text derives from native state; no new API invocations',()=>{
  assert.match(jobSource,/updateReportJobStatePresentation\(job\)/);
  assert.match(jobSource,/updateReportJobStatePresentation\(activeReportJob\)/);
  assert.doesNotMatch(jobSource,/gs\('(?:createReportJob|runReportJob|generateReportFromWeb)'/);
});
