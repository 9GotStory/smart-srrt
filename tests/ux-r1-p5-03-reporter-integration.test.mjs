// UX-R1/P5-03: Reporter/G-32/G-33 UI integration, synthetic-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const layout=read('src/web/02-app-layout.html');
const recordScript=read('src/web/03h-client-event-records.html');
const actions=read('src/web/03i-client-report-actions.html');
const jobScript=read('src/web/03j-client-report-job.html');
function fixture(){
  const elements=new Map(),calls=[],toasts=[],statusCells=[];
  const el=id=>{
    if(!elements.has(id)){
      const classes=new Set();
      const node={id,value:'',textContent:'',innerHTML:'',disabled:false,hidden:false,style:{display:''},
        dataset:{},href:'',
        classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
        setAttribute(name,value){this[name]=value},removeAttribute(name){delete this[name]},
        getAttribute(name){return this[name]||''},focus(){}
      };
      elements.set(id,node);
    }
    return elements.get(id)
  };
  const document={
    readyState:'loading',getElementById:el,addEventListener(){},
    querySelectorAll(selector){return selector==='td[data-report-job-event-id]'?statusCells:[]},
    activeElement:null
  };
  const ctx=vm.createContext({document,
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},setInterval(){return 123},clearInterval(){},console
  });
  for(const {path,code} of readOrderedClientScripts()){
    const sanitized=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(sanitized,{filename:path}).runInContext(ctx,{timeout:3000})
  }
  ctx.gs=(...args)=>{calls.push(args);return Promise.resolve({reports:[],count:0,currentRevision:2})};
  ctx.toast=message=>toasts.push(String(message));
  return {ctx,el,calls,toasts,statusCells}
}
function seed(h){
 vm.runInContext(`token="synthetic-session";currentUser={role:"Admin",name:"Synthetic"};allData=[
   {eventId:"E-1",col2:"2569-10-12",col6:"เหตุการณ์แรก",col29:"บ้านหนึ่ง",recordStatus:"active"},
   {eventId:"E-2",col2:"2569-10-13",col6:"เหตุการณ์สอง",col29:"บ้านสอง",recordStatus:"active"}];
   reportSummaryState={status:"ready",summaries:{"E-1":{count:1,invalidCount:0},"E-2":{count:0,invalidCount:0}}};`,h.ctx);
}
test('P5-03 AI report table has one non-action Job Status column and 7-cell empty state',()=>{
  const section=layout.split('<section id="page-reporter"')[1].split('</section>')[0];
  assert.match(section,/<th>ทะเบียนรายงาน<\/th><th>สถานะงาน AI<\/th><th>การดำเนินการหลัก<\/th>/);
  assert.match(recordScript,/data-report-job-event-id/);
  assert.match(recordScript,/colspan="7"/);
});
test('P5-03 history first with one contextual report action per event and no regeneration RPC',async()=>{
  const h=fixture();seed(h);
  vm.runInContext('renderReporterWorklist()',h.ctx);
  const markup=h.el('reportBody').innerHTML;
  assert.equal((markup.match(/data-report-event-id=/g)||[]).length,2);
  assert.equal((markup.match(/data-report-job-event-id=/g)||[]).length,2);
  assert.match(markup,/มีรายงานในทะเบียน 1 ฉบับ/);
  assert.match(markup,/ยังไม่มีรายงานในทะเบียน/);
  assert.match(markup,/ดูรายงาน/);
  const before=h.calls.length;
  vm.runInContext("handleReportAction('E-1',null)",h.ctx);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(h.calls.slice(before).map(x=>x[0]),['listReportsForEvent']);
  assert.equal(h.el('reportHistoryModal').classList.contains('open'),true);
  assert.equal(h.calls.filter(x=>x[0]==='createReportJob'||x[0]==='prepareReportRegeneration').length,0);
});
test('P5-03 queued, uncertain, cancelled, completed and unrelated job statuses remain distinct',()=>{
  const h=fixture();seed(h);
  const get=id=>vm.runInContext('reportJobWorklistLabel('+JSON.stringify(id)+')',h.ctx);
  assert.match(get('E-1'),/ไม่มีงานสร้างรายงาน/);
  vm.runInContext('activeReportJob={id:"J-1",eventId:"E-1",status:"queued",stage:"queued"}',h.ctx);
  assert.match(get('E-1'),/รอเริ่ม/);
  assert.match(get('E-2'),/เหตุการณ์อื่น/);
  vm.runInContext('activeReportJob.status="unknown";reportUnknownNeedsVerification=true',h.ctx);
  assert.match(get('E-1'),/ไม่สามารถยืนยันผล/);
  assert.match(get('E-2'),/ยังไม่ยืนยันสถานะงานก่อนหน้า/);
  vm.runInContext('activeReportJob.status="cancelled";reportUnknownNeedsVerification=false',h.ctx);
  assert.match(get('E-1'),/ยกเลิกการสร้างรายงานแล้ว/);
  vm.runInContext('activeReportJob.status="completed"',h.ctx);
  assert.match(get('E-1'),/ต้องตรวจทาน/);
  assert.doesNotMatch(get('E-1'),/อนุมัติแล้ว/);
  assert.equal(h.calls.length,0);
});
test('P5-03 G-32 worklist status refresh changes text only; no job dispatch',()=>{
  const h=fixture();seed(h);
  const fakeCell={
    textContent:'',getAttribute(name){return name==='data-report-job-event-id'?'E-1':''}
  };
  h.statusCells.push(fakeCell);
  vm.runInContext('activeReportJob={id:"J-2",eventId:"E-1",status:"queued",stage:"queued"};refreshReportActionButtons()',h.ctx);
  assert.match(fakeCell.textContent,/รอเริ่ม/);
  assert.equal(h.calls.length,0);
  vm.runInContext('activeReportJob.status="unknown";reportUnknownNeedsVerification=true;refreshReportActionButtons()',h.ctx);
  assert.match(fakeCell.textContent,/ไม่สามารถยืนยันผล/);
  assert.equal(h.calls.length,0);
  assert.match(actions,/updateReporterJobStatusCells\(\)/);
  assert.match(jobScript,/function reportStageLabel\(job\)/);
});
test('P5-03 logout or unverified registry never offers implicit regeneration',()=>{
  const h=fixture();seed(h);
  vm.runInContext('reportSummaryState={status:"error",summaries:{}};reportUnknownNeedsVerification=true;renderReporterWorklist()',h.ctx);
  assert.match(h.el('reportBody').innerHTML,/ตรวจสอบสถานะรายงาน/);
  assert.doesNotMatch(h.el('reportBody').innerHTML,/>สร้างรายงาน AI<\/button>/);
  h.el('reportSearch').value='บ้านหนึ่ง';
  vm.runInContext('token="";currentUser=null;allData=[];renderTables()',h.ctx);
  assert.equal(h.el('reportBody').innerHTML,'');
  assert.equal(h.el('reportSearch').value,'');
  assert.equal(h.el('reportResultSummary').textContent,'');
  assert.equal(h.calls.length,0);
});
test('P5-03 Browser UAT protocol explicitly unverified; no live mutation',()=>{
  const doc=read('docs/ux/ux-r1-p5-reporter-uat.md');
  for(const token of ['P5-01','P5-02','P5-03','NOT RUN','TEST Version 12','360','390','640','G-33','G-32','ReportRegistry','Gemini','Console','Logout'])
    assert.ok(doc.includes(token),'missing '+token);
});
