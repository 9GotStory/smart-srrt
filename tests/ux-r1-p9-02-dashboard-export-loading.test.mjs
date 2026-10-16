// UX-R1/P9-02: contextual Dashboard, Export and Capture loading (synthetic, no Drive).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const dashboard=read('src/web/03d-client-dashboard.html');
const exported=read('src/web/03e-client-dashboard-export.html');
const core=read('src/web/03b-client-core.html');
const layout=read('src/web/02-app-layout.html');
function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject};
}
function fixture(){
  const nodes=new Map(),calls=[],toasts=[],workbooks=[],downloads=[];
  const el=id=>{
    if(!nodes.has(id)){
      const attrs=new Map();
      nodes.set(id,{id,innerHTML:'<b>เดิม</b>',textContent:'',value:'',disabled:false,hidden:false,isConnected:true,
        style:{},setAttribute(k,v){attrs.set(k,String(v))},getAttribute(k){return attrs.get(k)??null},
        removeAttribute(k){attrs.delete(k)}});
    }
    return nodes.get(id);
  };
  const ctx=vm.createContext({
    el,document:{getElementById:el,createElement:tag=>({
      tag,click(){downloads.push(tag)},setAttribute(){},remove(){}})},
    currentUser:null,token:'',authRequestEpoch:5,allData:[],dashboardSummary:null,areas:[{province:'SYN'}],
    settings:{APP_NAME:'Synthetic'},roleCanRecord:()=>false,
    reportSummaryRequest:0,reportSummaryState:{status:'idle',summaries:{}},
    updateDashboard(){},renderTables(){},toast:s=>toasts.push(String(s)),
    gs:(name,...args)=>{const d=deferred();calls.push({name,args,...d});return d.promise},
    XLSX:{utils:{book_new:()=>({sheets:[]}),json_to_sheet:rows=>rows,
      book_append_sheet:(wb,rows,name)=>wb.sheets.push({name,rows})},
      writeFile:(wb,name)=>workbooks.push({wb,name})},
    dashboardChartInstances:new Map(),html2canvas:async()=>({toDataURL:()=> 'data:image/png;base64,SYN'}),
    window:{open(){}},console
  });
  let from=core.indexOf('  const uiPendingActions=new Map();');
  let to=core.indexOf('  function toast(msg)',from);
  assert.ok(from>0&&to>from);
  vm.runInContext(core.slice(from,to),ctx);
  from=dashboard.indexOf('  let dashboardLoadRequest=0;');
  to=dashboard.indexOf('  function resetFilter(){',from);
  assert.ok(from>0&&to>from);
  vm.runInContext(dashboard.slice(from,to),ctx);
  vm.runInContext(exported.slice(exported.indexOf('  function exportClientExcel(){'),exported.lastIndexOf('</script>')),ctx);
  return {ctx,el,calls,toasts,workbooks,downloads};
}
test('P9-02 repeated identical Dashboard filter coalesces RPC and visible search pending state restores',async()=>{
  const f=fixture();
  const one=vm.runInContext('loadDashboard()',f.ctx);
  const two=vm.runInContext('loadDashboard()',f.ctx);
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].name,'getPublicDashboardData');
  assert.equal(f.el('dashboardSearchBtn').disabled,true);
  assert.equal(f.el('dashboardSearchBtn').getAttribute('aria-busy'),'true');
  assert.match(f.el('dashboardSearchBtn').textContent,/กำลังค้นหา/);
  assert.equal(f.el('page-dashboard').getAttribute('aria-busy'),'true');
  f.calls[0].resolve({kpi:{events:0},byVillage:[],byMonth:[],byRisk:[],byDiseaseGroup:[]});
  await Promise.all([one,two]);
  assert.equal(f.el('page-dashboard').getAttribute('data-dashboard-state'),'empty');
  assert.equal(f.el('dashboardSearchBtn').disabled,false);
  assert.equal(f.el('dashboardSearchBtn').getAttribute('aria-busy'),'false');
  assert.equal(f.el('dashboardSearchBtn').innerHTML,'<b>เดิม</b>');
});
test('P9-02 newer changed filter wins and late old response cannot clear new pending state',async()=>{
  const f=fixture(),one=vm.runInContext('loadDashboard()',f.ctx);
  f.el('startDate').value='2026-10-16';
  const two=vm.runInContext('loadDashboard()',f.ctx);
  assert.equal(f.calls.length,2);
  f.calls[0].resolve({kpi:{events:99}});
  await one;
  assert.equal(f.el('page-dashboard').getAttribute('data-dashboard-state'),'loading');
  assert.equal(f.el('dashboardSearchBtn').disabled,true);
  f.calls[1].resolve({kpi:{events:1},byVillage:[],byMonth:[],byRisk:[],byDiseaseGroup:[]});
  await two;
  assert.equal(f.el('page-dashboard').getAttribute('data-dashboard-state'),'ready');
  assert.equal(f.ctx.dashboardSummary.kpi.events,1);
});
test('P9-02 server Export is single-flight, returns safe Drive link without async popups',async()=>{
  const f=fixture();
  vm.runInContext('token="SYN";currentUser={role:"Manager"}',f.ctx);
  const one=vm.runInContext("exportServerFile('xlsx')",f.ctx);
  const two=vm.runInContext("exportServerFile('xlsx')",f.ctx);
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].name,'exportData');
  assert.equal(f.el('dashboardServerExportBtn').disabled,true);
  assert.match(f.el('dashboardExportStatus').textContent,/กำลังสร้าง/);
  f.calls[0].resolve({url:'https://docs.google.com/spreadsheets/d/SYNTHETIC_123/edit',message:'สร้างไฟล์แล้ว'});
  await Promise.all([one,two]);
  assert.equal(f.el('dashboardServerExportBtn').disabled,false);
  assert.equal(f.el('dashboardExportLink').hidden,false);
  assert.match(f.el('dashboardExportLink').href,/docs\.google\.com\/spreadsheets/);
  assert.match(f.el('dashboardExportStatus').textContent,/สำเร็จ/);
});
test('P9-02 uncertain server Export never blindly resubmits on second click',async()=>{
  const f=fixture();
  vm.runInContext('token="SYN";currentUser={role:"Manager"}',f.ctx);
  const first=vm.runInContext("exportServerFile('xlsx')",f.ctx);
  f.calls[0].reject(new Error('transient timeout'));
  await first;
  assert.equal(f.el('dashboardServerExportBtn').disabled,true);
  assert.match(f.el('dashboardExportStatus').textContent,/ยังไม่สามารถยืนยัน/);
  await vm.runInContext("exportServerFile('xlsx')",f.ctx);
  assert.equal(f.calls.length,1);
});
test('P9-02 local XLSX remains guest blocked and uses current authorized data only',()=>{
  const f=fixture();
  vm.runInContext('exportClientExcel()',f.ctx);
  assert.equal(f.workbooks.length,0);
  vm.runInContext('currentUser={role:"Manager"};allData=[{col2:"2026-10-16",col14:"synthetic-private"}]',f.ctx);
  vm.runInContext('exportClientExcel()',f.ctx);
  assert.equal(f.workbooks.length,1);
  assert.equal(f.workbooks[0].wb.sheets[0].rows[0]['รายละเอียด'],'synthetic-private');
  assert.equal(f.el('dashboardExcelBtn').disabled,false);
  assert.match(f.el('dashboardExportStatus').textContent,/เบราว์เซอร์/);
});
test('P9-02 Export/Capture status and export link remain outside dashboard image capture',()=>{
  const a=layout.indexOf('id="captureArea"');
  const b=layout.indexOf('id="publicAggregateNotice"',a);
  assert.ok(a>0&&b>a);
  const closing=layout.lastIndexOf('      </div>\n      <!-- Outside captureArea',b);
  assert.ok(closing>a);
  for(const id of ['dashboardExportStatus','dashboardExportLink','dashboardCaptureStatus']){
    assert.ok(layout.indexOf('id="'+id+'"')>closing,id+' must be after captureArea');
  }
  for(const id of ['appBootStatus','appBootRetryBtn','sessionActivityStatus','dashboardSearchBtn',
    'dashboardResetBtn','dashboardReporterRefreshBtn','dashboardExcelBtn','dashboardServerExportBtn'])
    assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});

test('P9-02 PNG capture locks repeated clicks, discards stale session, and never downloads private pixels',async()=>{
  const h=fixture(),image=deferred();
  const frames=[];
  h.ctx.html2canvas=target=>{
    frames.push(target);
    return image.promise;
  };
  h.el('page-dashboard').setAttribute('data-dashboard-state','ready');
  h.ctx.dashboardChartInstances.set('synthetic-chart',{stop(){},update(){}});
  const first=vm.runInContext('captureDashboard()',h.ctx);
  assert.equal(h.el('dashboardCaptureBtn').disabled,true);
  assert.match(h.el('dashboardCaptureBtn').textContent,/กำลังสร้างภาพ/);
  const second=vm.runInContext('captureDashboard()',h.ctx);
  assert.equal(frames.length,1);
  h.ctx.token='NEW-AUTH';
  h.ctx.dashboardLoadRequest++;
  image.resolve({toDataURL:()=>{throw Error('stale must not encode')}});
  await Promise.all([first,second]);
  assert.equal(h.downloads.length,0);
  assert.equal(h.el('dashboardCaptureBtn').getAttribute('aria-busy'),'false');
});
