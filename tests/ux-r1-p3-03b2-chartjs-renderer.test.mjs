import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildGasMultiFileEntries,renderGasIndexOffline} from '../tools/build-apps-script-multifile.mjs';
import {chartVendorBytes} from '../tools/build-chartjs-offline-asset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const dash=read('src/web/03d-client-dashboard.html');
const exp=read('src/web/03e-client-dashboard-export.html');
function node(tag='div'){return {tag,children:[],attrs:{},textContent:'',appendChild(x){this.children.push(x)},replaceChildren(...x){this.children=x},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},click(){this.clicked=true}};}
function fixture(){
  const nodes=new Map(),instances=[];
  const el=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
  const Chart=class {
    constructor(canvas,config){this.canvas=canvas;this.config=config;this.dead=false;instances.push(this)}
    destroy(){this.dead=true} stop(){this.stopped=true} update(mode){this.updated=mode}
  };
  const ctx=vm.createContext({Chart,el,document:{createElement:node},settings:{},
    allData:[],dashboardSummary:null,currentUser:null,token:'',dashboardLoadRequest:1,
    toast(){},requestAnimationFrame:fn=>fn(),console,
    html2canvas:async target=>{assert.equal(target,el('captureArea'));
      assert.ok(instances.filter(x=>!x.dead).every(x=>x.stopped&&x.updated==='none'));
      return {toDataURL:()=> 'data:image/png;base64,c3ludGhldGlj'};}
  });
  const begin=dash.indexOf('  const dashboardChartInstances=new Map();');
  const end=dash.indexOf('  function monthRows(){',begin);
  const helper=read('src/web/03b-client-core.html').match(/function isInvestigationCriteriaMet\(value\)\{[^\n]+\}/)[0];
  const a=dash.indexOf('  function villageLabel(r){'),b=dash.indexOf('  function updateDashboard(){',a);
  assert.ok(begin>0&&end>begin&&a>0&&b>a);
  vm.runInContext(helper+'\n'+dash.slice(a,b)+dash.slice(begin,end),ctx);
  const core=read('src/web/03b-client-core.html');
  const from=core.indexOf('  const uiPendingActions=new Map();');
  const to=core.indexOf('  function toast(msg)',from);
  assert.ok(from>0&&to>from);
  vm.runInContext(core.slice(from,to),ctx);
  vm.runInContext(exp.slice(exp.indexOf('  async function captureDashboard(){'),exp.lastIndexOf('</script>')),ctx);
  return {ctx,el,instances};
}
test('P3-03B2 25-file stage contains pinned inline UMD before Dashboard scripts',()=>{
  const entries=buildGasMultiFileEntries();
  assert.equal(entries.size,25);
  const head=entries.get('00-document-head.html').toString('utf8'),vendored=chartVendorBytes().toString('utf8');
  assert.ok(head.includes(vendored));assert.ok(head.length>200000);
  assert.ok(!head.includes('SMART_SRRT_CHARTJS_VENDOR_INLINED_AT_BUILD'));
  assert.ok(renderGasIndexOffline(entries).toString('utf8').indexOf(vendored)
    <renderGasIndexOffline(entries).toString('utf8').indexOf('function drawCharts(){'));
  assert.doesNotMatch(read('src/web/00-document-head.html'),/www\.gstatic\.com\/charts/);
});
test('P3-03B2 guest aggregates render exactly four appropriate Chart.js types',()=>{
  const f=fixture();
  vm.runInContext("dashboardSummary={byVillage:[['บ้าน ก',6]],byMonth:[['2026-10',6]],byDiseaseGroup:[['กลุ่ม ก',6]],byRisk:[['ต่ำ',6]]};allData=[{eventId:'PRIVATE_SENTINEL'}];drawCharts();",f.ctx);
  assert.deepEqual(f.instances.map(x=>x.config.type),['bar','line','doughnut','doughnut']);
  assert.equal(f.instances[0].config.options.indexAxis,'y');
  assert.equal(f.instances[0].config.options.animation,false);
  assert.deepEqual(Array.from(f.instances[0].config.data.labels),['บ้าน ก']);
  assert.deepEqual(Array.from(f.instances[0].config.data.datasets[0].data),[6]);
  assert.ok(!JSON.stringify(f.instances.map(x=>x.config)).includes('PRIVATE_SENTINEL'));
  assert.equal(f.el('barChartTable').children[0].tag,'table');
});
test('P3-03B2 chart redraw destroys previous instance; empty does not invent data',()=>{
  const f=fixture();
  f.ctx.draw('barChart','bar',[['หมู่บ้าน','จำนวน'],['บ้าน ก',2]]);
  const old=f.instances[0];f.ctx.draw('barChart','bar',[['หมู่บ้าน','จำนวน'],['บ้าน ข',3]]);
  assert.equal(old.dead,true);assert.equal(f.instances.length,2);
  f.ctx.draw('barChart','bar',[['หมู่บ้าน','จำนวน']]);
  assert.equal(f.instances[1].dead,true);
  assert.equal(f.el('barChart').children[0].tag,'p');
  assert.match(f.el('barChartTable').textContent,/ไม่มีข้อมูล/);
});
test('P3-03B2 logout disposal removes retained private charts and accessible tables',()=>{
  const f=fixture();
  f.ctx.draw('pieRisk','doughnut',[['ความเสี่ยง','จำนวน'],['synthetic-private-status',3]]);
  assert.equal(f.el('pieRiskTable').children.length,1);
  const instance=f.instances[0];
  f.ctx.destroyDashboardCharts(true);
  assert.equal(instance.dead,true);
  assert.equal(f.el('pieRisk').children.length,0);
  assert.equal(f.el('pieRiskTable').children.length,0);
  assert.match(read('src/web/03c-client-auth.html'),/destroyDashboardCharts\(true\)/);
});
test('P3-03B2 PNG capture stops animations and checks the request/session boundary',async()=>{
  const f=fixture();
  f.ctx.draw('barChart','bar',[['หมู่บ้าน','จำนวน'],['บ้าน ก',3]]);
  f.el('page-dashboard').attrs['data-dashboard-state']='ready';
  await f.ctx.captureDashboard();
  assert.equal(f.instances[0].stopped,true);assert.equal(f.instances[0].updated,'none');
  assert.match(exp,/html2canvas\(el\('captureArea'\)/);
  assert.ok(exp.includes("request!==dashboardLoadRequest||session!==token"));
});
test('P3-03B2 removes Google Charts without reintroducing a runtime Chart.js CDN',()=>{
  assert.doesNotMatch(dash,/google\.visualization|google\.charts|ColumnChart|PieChart/);
  assert.doesNotMatch(read('src/web/03b-client-core.html'),/google\.charts/);
  assert.doesNotMatch(read('src/web/03c-client-auth.html'),/google\.charts/);
  assert.doesNotMatch(read('src/web/00-document-head.html'),/chart\.js@|unpkg\.com\/chart|cdn\.jsdelivr\.net\/npm\/chart/);
  assert.match(read('src/styles/dashboard-ui.css'),/P3-03B2/);
});
