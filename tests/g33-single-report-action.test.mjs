import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server=fs.readFileSync(new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../Index_Smart_SRRT_OneClick.html',import.meta.url),'utf8');
const EVENT='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const REPORT_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REPORT_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reportStart=html.indexOf('  const reportReadinessInFlight = new Set();');
const reportEnd=html.indexOf('  function exportClientExcel(){',reportStart);

function makeRow(id,eventId,revision,date,docId='doc-a') {
  return [id,eventId,revision,docId,'https://docs.google.com/document/d/'+docId+'/edit',
    date,'member@example.test','gemini-3.8-flash','v1beta','2026.10.06.1','template'];
}
function serverHarness(rows=[],config={}) {
  const ctx={console,Date,Math,Number,String,Array,Object,RegExp,JSON,Error,isFinite};
  vm.createContext(ctx);
  vm.runInContext(server,ctx,{timeout:5000});
  let writes=0,registryReads=0,eventsRead=0,authActions=[];
  let headers=Array.from(ctx.REPORT_REGISTRY_HEADERS);
  if(config.badHeaders) headers[0]='bad';
  const registry=config.missingRegistry?null:{
    getLastRow:()=>rows.length+1,
    getLastColumn:()=>11,
    getRange:(r)=>{
      registryReads++;
      return r===1?{getDisplayValues:()=>[headers]}:{getValues:()=>rows};
    },
    appendRow(){writes++;throw Error('unexpected write')},
    setValues(){writes++;throw Error('unexpected write')}
  };
  ctx.requireAuth_=(token,action)=>{
    authActions.push(action);
    if(token!=='authorized')throw Error('unauthorized');
    return {email:'member@example.test'};
  };
  ctx.getFilteredEventRows_=()=>{
    eventsRead++;
    return[{eventId:EVENT},{eventId:OTHER}];
  };
  ctx.getDb_=()=>({getSheetByName:()=>registry});
  return {ctx,metrics:()=>({writes,registryReads,eventsRead,authActions})};
}

test('G33 summary returns exact per-Event counts and newest SourceRevision in one registry read',()=>{
  const h=serverHarness([
    makeRow(REPORT_A,EVENT,2,new Date('2026-10-01T02:00:00Z')),
    makeRow(REPORT_B,EVENT,4,new Date('2026-10-08T02:00:00Z'),'doc-b'),
    makeRow('cccccccc-cccc-4ccc-8ccc-cccccccccccc',OTHER,3,new Date('2026-10-09T02:00:00Z'))
  ]);
  const v=h.ctx.getReportSummariesForEvents('authorized',[EVENT,OTHER,EVENT]);
  assert.deepEqual(JSON.parse(JSON.stringify(v)),{summaries:{
    [EVENT]:{count:2,latestSourceRevision:4,invalidCount:0},
    [OTHER]:{count:1,latestSourceRevision:3,invalidCount:0}
  }});
  assert.equal(h.metrics().registryReads,2,'header + single data range; no per-Event registry RPC');
  assert.equal(h.metrics().eventsRead,1);
  assert.equal(h.metrics().writes,0);
  assert.deepEqual(h.metrics().authActions,['report']);
});

test('G33 empty valid registry is explicitly zero, not inferred from missing schema',()=>{
  const h=serverHarness();
  assert.equal(h.ctx.getReportSummariesForEvents('authorized',[EVENT]).summaries[EVENT].count,0);
  assert.throws(()=>serverHarness([],{missingRegistry:true}).ctx.getReportSummariesForEvents('authorized',[EVENT]),/migration G-17/);
  assert.throws(()=>serverHarness([],{badHeaders:true}).ctx.getReportSummariesForEvents('authorized',[EVENT]),/schema v7/);
});

test('G33 refuses malformed ReportID, duplicate history and missing revision instead of claiming zero',()=>{
  for(const rows of [
    [makeRow('not-uuid',EVENT,3,new Date())],
    [makeRow(REPORT_A,EVENT,2,new Date()),makeRow(REPORT_A,EVENT,3,new Date())],
    [makeRow(REPORT_A,EVENT,0,new Date())],
    [makeRow(REPORT_A,EVENT,3,new Date(),'')]
  ]) {
    const h=serverHarness(rows);
    assert.throws(()=>h.ctx.getReportSummariesForEvents('authorized',[EVENT]),/ไม่สมบูรณ์/);
    assert.equal(h.metrics().writes,0);
  }
});

test('G33 only returns requested IDs, with permission and batch bounds before report reads',()=>{
  const h=serverHarness([makeRow(REPORT_A,OTHER,2,new Date())]);
  assert.equal(h.ctx.getReportSummariesForEvents('authorized',[EVENT]).summaries[EVENT].count,0);
  assert.throws(()=>h.ctx.getReportSummariesForEvents('not-authorized',[EVENT]),/unauthorized/);
  assert.throws(()=>h.ctx.getReportSummariesForEvents('authorized',['not-uuid']),/EventID/);
  assert.throws(()=>h.ctx.getReportSummariesForEvents('authorized',Array(501).fill(EVENT)),/500/);
  assert.equal(h.metrics().writes,0);
  assert.doesNotMatch(server.slice(server.indexOf('function getPublicDashboardData'),server.indexOf('function isInvestigationCriteriaMet_')),/ReportRegistry|getReportSummariesForEvents/);
});

test('G33 browser removes both duplicate history buttons while preserving the history modal and consent',()=>{
  const render=html.match(/function renderTables\(\)\{[\s\S]*?(?=\n  function buildRecordForm)/)?.[0]??'';
  assert.equal((render.match(/reportActionButton\(r\.eventId/g)||[]).length,2);
  assert.doesNotMatch(render,/ประวัติรายงาน<\/button>/);
  assert.match(html,/id="reportHistoryNewBtn"/);
  assert.match(html,/id="reportNewConfirmModal" role="alertdialog"/);
  assert.match(html,/function confirmNewReportFromHistory\(\)/);
  assert.match(html,/gs\('listReportsForEvent',session,eventId\)/);
  assert.match(html,/ข้อมูลเหตุการณ์มีการปรับปรุงหลังสร้างรายงานล่าสุด/);
});

function clientHarness() {
  const elements=new Map(),calls=[],toasts=[],buttons=[];
  const document={querySelectorAll:s=>s==='button[data-report-event-id]'?buttons:[],addEventListener(){}};
  function el(id) {
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{id,style:{display:'none'},innerHTML:'',textContent:'',disabled:false,removeAttribute(){},
        classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n),
          toggle:(n,on)=>on?classes.add(n):classes.delete(n)}});
    }
    return elements.get(id);
  }
  let stub=()=>({summaries:{[EVENT]:{count:0,latestSourceRevision:0,invalidCount:0}}});
  const ctx={
    console,document,token:'authorized',currentUser:{role:'Admin'},
    allData:[{eventId:EVENT,revision:5}],el,roleCanRecord:()=>true,
    toast:x=>toasts.push(x),openModal:id=>calls.push(['openModal',id]),
    closeModal:id=>calls.push(['closeModal',id]),
    escapeHtml:x=>String(x),
    localStorage:{setItem(){},removeItem(){}},
    gs:async(fn,...args)=>{calls.push([fn,...args]);return stub(fn,...args)},
    setInterval(){return 1},clearInterval(){}
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(reportStart,reportEnd),ctx,{timeout:1500});
  return {ctx,calls,toasts,el,setStub:fn=>{stub=fn}};
}

test('G33 button states are history-first, not permanent regenerate',()=>{
  assert.ok(reportStart>0&&reportEnd>reportStart);
  const h=clientHarness();
  const seed=x=>vm.runInContext('reportSummaryState='+JSON.stringify({status:'ready',summaries:{[EVENT]:x}}),h.ctx);
  seed({count:0,invalidCount:0});
  assert.match(h.ctx.reportActionButton(EVENT,false),/>สร้างรายงาน AI<\/button>/);
  seed({count:1,invalidCount:0,latestSourceRevision:4});
  assert.match(h.ctx.reportActionButton(EVENT,false),/>.*ดูรายงาน<\/button>/);
  seed({count:3,invalidCount:0,latestSourceRevision:5});
  assert.match(h.ctx.reportActionButton(EVENT,false),/ดูรายงาน \(3\)/);
  vm.runInContext("reportSummaryState={status:'error',summaries:{}}",h.ctx);
  assert.match(h.ctx.reportActionButton(EVENT,false),/ตรวจสอบสถานะรายงาน/);
  assert.doesNotMatch(h.ctx.reportActionButton(EVENT,false),/สร้างรายงาน AI/);
  h.ctx.paintReportTask({id:'job-x',eventId:EVENT,status:'unknown',stage:'unknown'});
  assert.match(h.ctx.reportActionButton(EVENT,false),/ตรวจสอบสถานะรายงาน/);
  seed({count:2,invalidCount:0,latestSourceRevision:4});
  assert.match(h.ctx.reportActionButton(EVENT,false),/ดูรายงาน \\(2\\).*ตรวจสอบงานค้าง/);
  assert.doesNotMatch(h.ctx.reportActionButton(EVENT,false),/สร้างรายงาน AI/);
});

test('G33 loads a single authenticated batch summary and does not create reports on transient errors',async()=>{
  const h=clientHarness();
  h.setStub((fn,session,ids)=> {
    if(fn==='getReportSummariesForEvents')return {summaries:{[EVENT]:{count:2,invalidCount:0,latestSourceRevision:3}}};
    throw Error('unexpected method');
  });
  await h.ctx.refreshReportSummaries();
  assert.equal(h.calls.filter(x=>x[0]==='getReportSummariesForEvents').length,1);
  assert.match(h.ctx.reportActionButton(EVENT,false),/ดูรายงาน \(2\)/);
  h.setStub(()=>{throw Error('no network')});
  await h.ctx.refreshReportSummaries();
  assert.match(h.ctx.reportActionButton(EVENT,false),/ตรวจสอบสถานะรายงาน/);
  assert.equal(h.calls.some(x=>x[0]==='createReportJob'),false);
  assert.ok(h.toasts.some(x=>String(x).includes('ตรวจสอบประวัติ')));
});
