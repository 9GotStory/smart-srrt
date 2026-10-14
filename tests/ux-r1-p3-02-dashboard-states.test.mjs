import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const dashboard=read('src/web/03d-client-dashboard.html');
const layout=read('src/web/02-app-layout.html');
const auth=read('src/web/03c-client-auth.html');
const css=read('src/styles/dashboard-ui.css');
const generated=read('src/web/01-styles.html');
const begin=dashboard.indexOf('  let dashboardLoadRequest=0;');
const end=dashboard.indexOf('  function resetFilter(){',begin);
assert.ok(begin>=0&&end>begin,'Dashboard request/state function boundaries moved');
const script=dashboard.slice(begin,end);

function fixture() {
  const nodes=new Map(),requests=[],renders=[],toasts=[];
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{
      id,hidden:false,disabled:false,textContent:'',value:'',
      attrs:{},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]}
    });
    return nodes.get(id);
  };
  const ctx=vm.createContext({
    el,token:'',currentUser:null,areas:[{province:'ทดสอบ'}],
    allData:[],dashboardSummary:null,reportSummaryRequest:0,
    reportSummaryState:{status:'idle',summaries:{}},
    isInvestigationCriteriaMet:value=>String(value||'').trim()==='เข้าเกณฑ์',
    roleCanRecord:()=>false,
    updateDashboard:()=>renders.push('dashboard'),
    renderTables:()=>renders.push('tables'),
    toast:message=>toasts.push(String(message)),
    gs:(name,...args)=>new Promise((resolve,reject)=>requests.push({name,args,resolve,reject})),
    console
  });
  new vm.Script(script,{filename:'dashboard-state-fragment.js'}).runInContext(ctx);
  return {ctx,el,nodes,requests,renders,toasts};
}

test('P3-02 mounts safe live status and restricted follow-up strictly outside captureArea',()=>{
  const dash=layout.slice(layout.indexOf('<section id="page-dashboard"'),
    layout.indexOf('<section id="page-records"'));
  assert.match(dash,/id="dashboardLoadStatus"[^>]*role="status" aria-live="polite"/);
  assert.match(dash,/id="dashboardCaptureBtn"[^>]*onclick="captureDashboard\(\)"/);
  assert.match(dash,/id="dashboardFollowupSummary"[^>]*role="status" aria-live="polite"/);
  assert.ok(dash.indexOf('id="dashboardLoadStatus"')<dash.indexOf('id="eventDetailPanel"'));
  assert.ok(dash.indexOf('id="dashboardFollowupSummary"')>dash.indexOf('id="eventDetailPanel"'));
  assert.ok(dash.indexOf('id="dashboardFollowupSummary"')>dash.indexOf('id="publicAggregateNotice"'));
  assert.ok(dash.indexOf('</div>\n      <div id="publicAggregateNotice"')>dash.indexOf('id="captureArea"'),
    'private event controls must remain outside aggregate image capture');
  assert.equal((dash.match(/id="eventBody"/g)||[]).length,1);
  assert.ok(css.includes('#eventDetailPanel[hidden]{display:none !important}'),
    'explicit hidden override is needed for the role-controlled inline display style');
  assert.ok(generated.includes(css));
});

test('P3-02 pending, empty and success states never imply an old filter is current',async()=>{
  const f=fixture();
  const pending=f.ctx.loadDashboard();
  assert.equal(f.el('dashboardLoadStatus').hidden,false);
  assert.match(f.el('dashboardLoadStatus').textContent,/กำลังโหลดข้อมูล/);
  assert.equal(f.el('dashboardCaptureBtn').disabled,true);
  assert.equal(f.el('eventDetailPanel').hidden,true);
  assert.equal(f.el('page-dashboard').attrs['data-dashboard-state'],'loading');
  assert.equal(f.requests[0].name,'getPublicDashboardData');
  f.requests[0].resolve({kpi:{events:0},byVillage:[],byMonth:[],byDiseaseGroup:[],byRisk:[]});
  await pending;
  assert.equal(f.el('page-dashboard').attrs['data-dashboard-state'],'empty');
  assert.match(f.el('dashboardLoadStatus').textContent,/ไม่มีเหตุการณ์/);
  assert.equal(f.el('eventDetailPanel').hidden,false);
  assert.equal(f.el('dashboardCaptureBtn').disabled,false);
  assert.equal(f.ctx.allData.length,0);
  assert.deepEqual(f.renders,['dashboard','tables']);

  const ready=f.ctx.loadDashboard();
  f.requests[1].resolve({kpi:{events:4},byVillage:[],byMonth:[],byDiseaseGroup:[],byRisk:[]});
  await ready;
  assert.equal(f.el('page-dashboard').attrs['data-dashboard-state'],'ready');
  assert.equal(f.el('dashboardLoadStatus').hidden,true);
  assert.equal(f.el('dashboardLoadStatus').textContent,'');
});

test('P3-02 stale authenticated response cannot overwrite newer request or follow-up status',async()=>{
  const f=fixture();
  f.ctx.token='tokenA';f.ctx.currentUser={role:'Staff'};
  const first=f.ctx.loadDashboard();
  f.ctx.token='tokenB';
  const second=f.ctx.loadDashboard();
  assert.equal(f.requests[0].name,'getDashboardData');
  assert.equal(f.requests[1].name,'getDashboardData');
  f.requests[1].resolve([
    {col17:'เข้าเกณฑ์',col26:'',col6:'ข้อมูลจำลอง'},
    {col17:'เข้าเกณฑ์',col26:'2026-10-14',col6:'ข้อมูลจำลอง'},
    {col17:'ไม่เข้าเกณฑ์',col26:'',col6:'ข้อมูลจำลอง'}
  ]);
  await second;
  assert.equal(f.el('page-dashboard').attrs['data-dashboard-state'],'ready');
  assert.match(f.el('dashboardFollowupSummary').textContent,/1 จาก 2 รายการ/);
  f.requests[0].resolve([{col17:'เข้าเกณฑ์',col26:'',col6:'stale'}]);
  await first;
  assert.equal(f.ctx.allData.length,3,'late response must not replace accepted dataset');
  assert.match(f.el('dashboardFollowupSummary').textContent,/1 จาก 2 รายการ/);
  assert.deepEqual(f.renders,['dashboard','tables']);
});

test('P3-02 errors remain visible and prevent capture or stale private worklist presentation',async()=>{
  const f=fixture();
  f.ctx.currentUser={role:'Manager'};
  const pending=f.ctx.loadDashboard();
  f.requests[0].reject(new Error('private backend diagnostic details'));
  await pending;
  assert.equal(f.el('page-dashboard').attrs['data-dashboard-state'],'error');
  assert.match(f.el('dashboardLoadStatus').textContent,/ไม่สามารถโหลดข้อมูล/);
  assert.doesNotMatch(f.el('dashboardLoadStatus').textContent,/private backend diagnostic/);
  assert.equal(f.el('dashboardCaptureBtn').disabled,true);
  assert.equal(f.el('eventDetailPanel').hidden,true);
  assert.equal(f.renders.length,0);
  assert.equal(f.toasts.length,1,'existing toast feedback retained');
  assert.match(auth,/if\(typeof setDashboardViewState==='function'\)setDashboardViewState\('loading'\)/,
    'logout must hide private Dashboard view before awaiting its network callback');
});

test('P3-02 empty charts show truthful text instead of a fictional zero-count category',()=>{
  const start=dashboard.indexOf('  function renderDashboardChartData(id,arr){');
  const stop=dashboard.indexOf('  function monthRows(){',start);
  assert.ok(start>0&&stop>start);
  const target={textContent:'',children:[],replaceChildren(...children){this.children=children}};
  const ctx=vm.createContext({
    el:()=>target,
    document:{createElement:tag=>({tag,className:'',textContent:''})},
    google:{visualization:{
      arrayToDataTable:()=>{throw Error('empty chart must not call chart library')},
      ColumnChart:class{constructor(){throw Error('empty chart must not initialize chart')}}
    }}
  });
  vm.runInContext(dashboard.slice(start,stop),ctx);
  ctx.draw('barChart','ColumnChart',[['หมู่บ้าน','จำนวน']],{});
  assert.equal(target.children.length,1);
  assert.match(target.children[0].textContent,/ไม่มีข้อมูลสำหรับกราฟนี้/);
  assert.ok(css.includes('srrt-dashboard-chart-empty'));
});
