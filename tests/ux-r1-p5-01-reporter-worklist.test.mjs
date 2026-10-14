// UX-R1/P5-01: AI Reporter list is a single private, state-labelled worklist.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/web/02-app-layout.html');
const source=read('src/web/03h-client-event-records.html');
const actions=read('src/web/03i-client-report-actions.html');
const css=read('src/styles/shared-ui.css');

function fixture(){
  const nodes=new Map();
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{
      id,value:'',innerHTML:'',textContent:'',disabled:false,style:{display:''},
      classList:{add(){},remove(){},contains(){return false}},focus(){},setAttribute(){},removeAttribute(){}
    });
    return nodes.get(id)
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},console
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path}).runInContext(ctx,{timeout:3000})
  }
  return {ctx,el}
}
function seed(h,role='Admin'){
  vm.runInContext('token="synthetic";currentUser={role:'+JSON.stringify(role)+'};allData=['+
    '{eventId:"A",col2:"2569-10-10",col5:"กลุ่มโรคหนึ่ง",col6:"เหตุการณ์หนึ่ง",col29:"บ้านเหนือ",recordStatus:"active"},'+
    '{eventId:"B",col2:"2569-10-12",col5:"กลุ่มโรคสอง",col6:"เหตุการณ์สอง",col29:"บ้านใต้",recordStatus:"active"},'+
    '{eventId:"C",col2:"2569-10-13",col5:"กลุ่มโรคสาม",col6:"เหตุการณ์สาม",col29:"บ้านกลาง",recordStatus:"active"}]',h.ctx)
}
test('P5-01 canonical table has search, registry filter, mobile cards and human review warning',()=>{
  const section=page.split('<section id="page-reporter"')[1].split('</section>')[0];
  for(const id of ['reportSearch','reportRegistryFilter','reportResultSummary','reportBody'])
    assert.match(section,new RegExp('id="'+id+'"'));
  assert.match(section,/รายงานที่ AI สร้างเป็น/);
  assert.match(section,/ต้องตรวจทานโดยเจ้าหน้าที่/);
  assert.equal((section.match(/id="reportBody"/g)||[]).length,1);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/srrt-reporter-table td::before/);
  assert.match(source,/roleCanRecord\(\)\?reportActionButton\(r.eventId\|\|'',false\)/);
  assert.doesNotMatch(source,/reportHistoryNewBtn.*onclick="handleReportAction/);
});
test('P5-01 registry filter distinguishes unverified, registered and confirmed none',()=>{
  const h=fixture();seed(h);
  vm.runInContext('reportSummaryState={status:"ready",summaries:{A:{count:1,invalidCount:0},B:{count:0,invalidCount:0},C:{count:1,invalidCount:2}}}',h.ctx);
  assert.equal(vm.runInContext('reportRegistryDisplay("A").kind',h.ctx),'registered');
  assert.equal(vm.runInContext('reportRegistryDisplay("B").kind',h.ctx),'none');
  assert.equal(vm.runInContext('reportRegistryDisplay("C").kind',h.ctx),'unverified');
  h.el('reportRegistryFilter').value='unverified';
  vm.runInContext('renderReporterWorklist()',h.ctx);
  assert.match(h.el('reportBody').innerHTML,/เหตุการณ์สาม/);
  assert.doesNotMatch(h.el('reportBody').innerHTML,/เหตุการณ์สอง/);
  assert.equal(h.el('reportResultSummary').textContent,'แสดง 1 จาก 3 เหตุการณ์');
  h.el('reportRegistryFilter').value='registered';
  vm.runInContext('renderReporterWorklist()',h.ctx);
  assert.match(h.el('reportBody').innerHTML,/มีรายงานในทะเบียน 1 ฉบับ/);
  assert.match(h.el('reportBody').innerHTML,/data-report-event-id="A"/);
  assert.equal((h.el('reportBody').innerHTML.match(/class="btn green report-action-btn/g)||[]).length,1);
  h.el('reportSearch').value='บ้านใต้';h.el('reportRegistryFilter').value='';
  vm.runInContext('renderReporterWorklist()',h.ctx);
  assert.match(h.el('reportBody').innerHTML,/เหตุการณ์สอง/);
  assert.doesNotMatch(h.el('reportBody').innerHTML,/เหตุการณ์หนึ่ง/);
});
test('P5-01 summary error and unknown remain fail-closed verify, never generate',()=>{
  const h=fixture();seed(h);
  vm.runInContext('reportSummaryState={status:"error",summaries:{}};reportUnknownNeedsVerification=true',h.ctx);
  vm.runInContext('renderReporterWorklist()',h.ctx);
  assert.match(h.el('reportBody').innerHTML,/ยังไม่ยืนยันสถานะทะเบียน/);
  assert.doesNotMatch(h.el('reportBody').innerHTML,/>สร้างรายงาน AI</);
  assert.match(h.el('reportBody').innerHTML,/ตรวจสอบสถานะรายงาน/);
});
test('P5-01 guest and reset clear private report worklist without RPC',()=>{
  const h=fixture();seed(h);
  h.el('reportSearch').value='บ้านใต้';
  vm.runInContext('renderReporterWorklist()',h.ctx);
  vm.runInContext('currentUser=null;allData=[];renderTables()',h.ctx);
  assert.equal(h.el('reportBody').innerHTML,'');
  assert.equal(h.el('reportSearch').value,'');
  assert.equal(h.el('reportRegistryFilter').value,'');
  assert.equal(h.el('reportResultSummary').textContent,'');
});
test('P5-01 readiness and report action state remain source-owned; no new report RPC',()=>{
  assert.match(source,/reportReadinessBadge\(r\)/);
  assert.match(actions,/function reportActionState\(eventId,compact\)/);
  assert.match(actions,/function reportActionButton\(eventId,compact\)/);
  assert.match(actions,/if\(typeof renderReporterWorklist==='function'\)renderReporterWorklist\(\)/);
  assert.doesNotMatch(source,/gs\('(?:runReportJob|createReportJob|generateReportFromWeb)'/);
});
