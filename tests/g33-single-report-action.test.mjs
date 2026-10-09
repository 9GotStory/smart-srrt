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
  assert.match(h.ctx.reportActionButton(EVENT,false),/ดูรายงาน \(2\).*ตรวจสอบงานค้าง/);
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

test('G33 failed G32 recovery refuses to infer no job even when registry count is zero',async()=>{
  const h=clientHarness();
  h.setStub(fn=>{
    if(fn==='getReportSummariesForEvents')return {summaries:{[EVENT]:{count:0,latestSourceRevision:0,invalidCount:0}}};
    if(fn==='getCurrentReportJob')throw Error('network dropped during recovery');
    throw Error('unexpected RPC '+fn);
  });
  await h.ctx.refreshReportSummaries();
  assert.match(h.ctx.reportActionButton(EVENT,false),/สร้างรายงาน AI/);
  await h.ctx.recoverReportJob();
  assert.match(h.ctx.reportActionButton(EVENT,false),/ตรวจสอบสถานะรายงาน/);
  await h.ctx.makeReport(EVENT,{innerHTML:'สร้างรายงาน AI',disabled:false});
  assert.equal(h.calls.some(c=>c[0]==='getAIReportReadiness'||c[0]==='createReportJob'),false,
    'failed job recovery MUST block implicit regeneration');
  assert.ok(h.toasts.some(s=>String(s).includes('งานรายงานเดิม')));

  h.setStub(fn=>{
    if(fn==='getCurrentReportJob')return null; // explicitly verified no current job
    if(fn==='getReportSummariesForEvents')return {summaries:{[EVENT]:{count:0,latestSourceRevision:0,invalidCount:0}}};
    throw Error('unexpected RPC '+fn);
  });
  await h.ctx.recoverReportJob();
  assert.match(h.ctx.reportActionButton(EVENT,false),/สร้างรายงาน AI/,
    'authenticated successful no-job verification can restore the available action');
});

test('G33 over 500 Events uses two bounded report-summary batches, not N+1 RPC calls',async()=>{
  const h=clientHarness();
  const ids=[EVENT,...Array.from({length:500},(_,i)=>
    '00000000-0000-4000-8000-'+String(i).padStart(12,'0'))];
  h.ctx.allData=ids.map(eventId=>({eventId,revision:1}));
  h.setStub((fn,session,batch)=>{
    assert.equal(fn,'getReportSummariesForEvents');
    assert.equal(session,'authorized');
    assert.ok(batch.length>0&&batch.length<=500);
    return {summaries:Object.fromEntries(batch.map(eventId=>
      [eventId,{count:0,latestSourceRevision:0,invalidCount:0}]))};
  });
  await h.ctx.refreshReportSummaries();
  const requests=h.calls.filter(c=>c[0]==='getReportSummariesForEvents');
  assert.deepEqual(requests.map(c=>c[2].length),[500,1]);
  assert.match(h.ctx.reportActionButton(ids[500],false),/สร้างรายงาน AI/);
  assert.equal(h.toasts.length,0);
});

test('G33 failed later summary batch never publishes incomplete counts',async()=>{
  const h=clientHarness();
  const ids=[EVENT,...Array.from({length:500},(_,i)=>
    '00000000-0000-4000-8000-'+String(i).padStart(12,'0'))];
  h.ctx.allData=ids.map(eventId=>({eventId,revision:1}));
  let batchNo=0;
  h.setStub((fn,session,batch)=>{
    if(fn!=='getReportSummariesForEvents')throw Error('unexpected RPC');
    batchNo++;
    if(batchNo===2)throw Error('second batch failed');
    return {summaries:Object.fromEntries(batch.map(eventId=>
      [eventId,{count:0,latestSourceRevision:0,invalidCount:0}]))};
  });
  await h.ctx.refreshReportSummaries();
  assert.equal(batchNo,2);
  assert.match(h.ctx.reportActionButton(EVENT,false),/ตรวจสอบสถานะรายงาน/,
    'first successful batch cannot masquerade as complete verified history');
  assert.equal(h.calls.some(c=>c[0]==='createReportJob'),false);
});

test('G33 report action never interpolates EventID into executable onclick JavaScript',()=>{
  const h=clientHarness();
  const dangerous=EVENT+"' onmouseover='alert(123)";
  const markup=h.ctx.reportActionButton(dangerous,false);
  assert.match(markup,/onclick="handleReportAction\(this\.dataset\.reportEventId,this\)"/);
  assert.doesNotMatch(markup,/handleReportAction\(["']/);
  assert.ok(html.includes("escapeHtml(eventId||'')"),'EventID data attribute remains HTML escaped');
  assert.ok(!html.includes("JSON.stringify(eventId||'')"),'no inline executable EventID serialization');
});

test('G33 rejects obsolete dashboard loads across filters and sessions',async()=>{
  const sourceStart=html.indexOf('  let dashboardLoadRequest=0;');
  const sourceEnd=html.indexOf('  function resetFilter(){',sourceStart);
  assert.ok(sourceStart>0&&sourceEnd>sourceStart);
  const requests=[],visible=[];
  const ctx={
    token:'session-a',currentUser:{role:'Admin'},reportSummaryRequest:0,
    reportSummaryState:{status:'idle',summaries:{}},
    dashboardSummary:null,allData:[],areas:[{province:'demo'}],
    el:()=>({value:''}),
    gs:(name,session)=>new Promise(resolve=>requests.push({name,session,resolve})),
    updateDashboard:()=>visible.push('updated'),
    renderTables:()=>visible.push('rendered'),
    setupDashboardFilters:()=>visible.push('filters'),
    refreshReportSummaries:()=>{visible.push('summary')},
    roleCanRecord:()=>true,
    toast:msg=>visible.push('error:'+msg)
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(sourceStart,sourceEnd),ctx,{filename:'dashboard-request-guard.js'});
  const first=ctx.loadDashboard();
  const second=ctx.loadDashboard();
  assert.equal(requests.length,2);
  requests[1].resolve([{eventId:'new'}]);
  await second;
  requests[0].resolve([{eventId:'old'}]);
  await first;
  assert.equal(ctx.allData[0].eventId,'new','older filter result cannot replace a newer one');
  assert.equal(visible.filter(x=>x==='rendered').length,1);

  const before=visible.length;
  const third=ctx.loadDashboard();
  ctx.token='session-b';ctx.currentUser=null;
  requests[2].resolve([{eventId:'old-user-private'}]);
  await third;
  assert.equal(ctx.allData.some(r=>r.eventId==='old-user-private'),false);
  assert.equal(visible.length,before,'stale response never renders under a different user');
});

test('G33 first-create action rechecks registry and redirects to history when another user already reported',async()=>{
  const h=clientHarness();
  vm.runInContext('reportSummaryState={status:"ready",summaries:{"'+EVENT+'":{count:0,invalidCount:0,latestSourceRevision:0}}}',h.ctx);
  let created=0;
  h.ctx.makeReport=async()=>{created++};
  h.setStub((name,token,eventIds)=>{
    assert.equal(name,'getReportSummariesForEvents');
    assert.equal(token,'authorized');
    assert.deepEqual(Array.from(eventIds),[EVENT]);
    return {summaries:{[EVENT]:{count:1,invalidCount:0,latestSourceRevision:4}}};
  });
  await h.ctx.preflightFirstReportGeneration(EVENT,{innerHTML:'สร้างรายงาน AI'});
  assert.equal(created,0,'stale zero cannot implicitly generate the second report');
  assert.match(h.ctx.reportActionButton(EVENT,false),/ดูรายงาน/);
  assert.ok(h.toasts.some(s=>String(s).includes('มีรายงานที่ลงทะเบียนแล้ว')));
  assert.equal(h.calls.filter(c=>c[0]==='getReportSummariesForEvents').length,1);
});

test('G33 preflight allows exactly one verified zero-report create after preventing double click',async()=>{
  const h=clientHarness();
  vm.runInContext('reportSummaryState={status:"ready",summaries:{"'+EVENT+'":{count:0,invalidCount:0,latestSourceRevision:0}}}',h.ctx);
  let release;
  let generated=0;
  h.ctx.makeReport=async()=>{generated++};
  h.setStub(()=>new Promise(resolve=>{release=resolve}));
  const one=h.ctx.preflightFirstReportGeneration(EVENT,{innerHTML:'สร้างรายงาน AI'});
  const two=h.ctx.preflightFirstReportGeneration(EVENT,{innerHTML:'สร้างรายงาน AI'});
  await two;
  assert.match(h.ctx.reportActionButton(EVENT,false),/กำลังตรวจทะเบียนรายงาน/);
  assert.equal(h.calls.filter(c=>c[0]==='getReportSummariesForEvents').length,1);
  release({summaries:{[EVENT]:{count:0,invalidCount:0,latestSourceRevision:0}}});
  await one;
  assert.equal(generated,1);
});

test('G33 first-generation fail closed on registry error or stale refresh callback',async()=>{
  const h=clientHarness();
  const seed='reportSummaryState={status:"ready",summaries:{"'+EVENT+'":{count:0,invalidCount:0,latestSourceRevision:0}}}';
  vm.runInContext(seed,h.ctx);
  let generated=0;
  h.ctx.makeReport=async()=>{generated++};
  h.setStub(()=>{throw Error('temporary registry outage')});
  await h.ctx.preflightFirstReportGeneration(EVENT,{innerHTML:'สร้างรายงาน AI'});
  assert.equal(generated,0);
  assert.match(h.ctx.reportActionButton(EVENT,false),/ตรวจสอบสถานะรายงาน/);
  assert.ok(h.toasts.some(s=>String(s).includes('ยังยืนยันทะเบียนรายงานไม่ได้')));

  vm.runInContext(seed,h.ctx);
  let release;
  h.setStub(()=>new Promise(resolve=>{release=resolve}));
  const inFlight=h.ctx.preflightFirstReportGeneration(EVENT,{innerHTML:'สร้างรายงาน AI'});
  vm.runInContext('++reportSummaryRequest',h.ctx);
  release({summaries:{[EVENT]:{count:0,invalidCount:0,latestSourceRevision:0}}});
  await inFlight;
  assert.equal(generated,0,'old request cannot trigger generation under refreshed dashboard');
});
