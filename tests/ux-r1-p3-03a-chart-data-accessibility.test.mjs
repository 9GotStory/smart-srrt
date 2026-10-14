import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nativeHtml} from './helpers/native-current.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/web/03d-client-dashboard.html');
const layout=read('src/web/02-app-layout.html');
const css=read('src/styles/dashboard-ui.css');
const head=read('src/web/00-document-head.html');
const exportSource=read('src/web/03e-client-dashboard-export.html');
const from=source.indexOf('  function renderDashboardChartData(id,arr){');
const to=source.indexOf('  function monthRows(){',from);
assert.ok(from>0&&to>from,'render adapter/Google Charts boundaries are required');

function element(tag){
  return {
    tag,children:[],textContent:'',className:'',scope:'',
    appendChild(child){this.children.push(child);return child},
    replaceChildren(...children){this.children=children}
  };
}
function fixture(){
  const nodes=new Map(),draws=[];
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,element('div'));
    return nodes.get(id);
  };
  const Chart=class{
    constructor(canvas,config){draws.push({canvas,config,rows:[
      [config.data.datasets[0].label,'จำนวน'],
      ...config.data.labels.map((label,i)=>[label,config.data.datasets[0].data[i]])
    ]});}
    destroy(){}
  };
  const ctx=vm.createContext({el,document:{createElement:element},Chart,settings:{},console});
  vm.runInContext(source.slice(from,to),ctx,{timeout:1000});
  return {ctx,el,draws};
}

test('P3-03A adds one labelled, keyboard-reachable table alternative per existing chart',()=>{
  const dashboard=layout.slice(layout.indexOf('<section id="page-dashboard"'),layout.indexOf('<section id="page-records"'));
  for(const [chart,table] of [
    ['barChart','barChartTable'],['lineChart','lineChartTable'],
    ['pieDisease','pieDiseaseTable'],['pieRisk','pieRiskTable']
  ]){
    assert.equal((dashboard.match(new RegExp('id="'+chart+'"','g'))||[]).length,1);
    assert.equal((dashboard.match(new RegExp('id="'+table+'"','g'))||[]).length,1);
    assert.ok(dashboard.indexOf('id="'+table+'"')>dashboard.indexOf('id="'+chart+'"'));
  }
  assert.equal((dashboard.match(/class="srrt-dashboard-chart-details"/g)||[]).length,4);
  assert.equal((dashboard.match(/<summary>ดูข้อมูลประกอบกราฟในรูปแบบตาราง<\/summary>/g)||[]).length,4);
  assert.ok(dashboard.indexOf('id="barChartTable"')<dashboard.indexOf('id="publicAggregateNotice"'));
  assert.ok(dashboard.indexOf('id="eventBody"')>dashboard.indexOf('id="publicAggregateNotice"'));
  assert.ok(nativeHtml.includes(dashboard),'Native output must contain accessible chart content');
});

test('P3-03A tabular alternative renders exactly existing public aggregate series',()=>{
  const f=fixture();
  const rows=[['หมู่บ้าน','จำนวน'],['บ้าน ก',7],['บ้าน ข',2]];
  f.ctx.draw('barChart','ColumnChart',rows,{legend:'none'});
  assert.equal(f.draws.length,1);
  assert.deepEqual(f.draws[0].rows,rows,'visible chart retains existing values');
  const tab=f.el('barChartTable').children[0];
  assert.equal(tab.tag,'table');
  assert.equal(tab.children[1].tag,'thead');
  assert.equal(tab.children[2].children.length,2);
  assert.equal(tab.children[2].children[0].children[0].textContent,'บ้าน ก');
  assert.equal(tab.children[2].children[0].children[1].textContent,'7');
  assert.equal(tab.children[2].children[1].children[0].textContent,'บ้าน ข');
  assert.equal(tab.children[2].children[1].children[1].textContent,'2');
});

test('P3-03A incident labels enter DOM via textContent, never HTML interpolation',()=>{
  const f=fixture();
  const label='<img src=x onerror=alert(1)>';
  f.ctx.draw('pieRisk','PieChart',[['ความเสี่ยง','จำนวน'],[label,1]],{pieHole:.42});
  const tab=f.el('pieRiskTable').children[0];
  assert.equal(tab.children[2].children[0].children[0].textContent,label);
  assert.doesNotMatch(source.slice(from,to),/\.innerHTML\s*=|insertAdjacentHTML|eval\(/);
  assert.ok(source.slice(from,to).includes('target.replaceChildren(table)'));
});

test('P3-03A zero/absent data never draw a fictional category or crash a data-table view',()=>{
  const f=fixture();
  for(const series of [[['กลุ่มโรค','จำนวน']],[['กลุ่มโรค','จำนวน'],['ไม่มีข้อมูล',0]]]){
    f.ctx.draw('pieDisease','PieChart',series,{pieHole:.42});
    assert.match(f.el('pieDisease').children[0].textContent,/ไม่มีข้อมูล/);
    assert.match(f.el('pieDiseaseTable').textContent,/ไม่มีข้อมูล/);
  }
  assert.equal(f.draws.length,0);
});

test('P3-03A does not introduce a CDN, new RPC, or change existing image export contract',()=>{
  assert.doesNotMatch(head,/www\\.gstatic\\.com\\/charts\\/loader\\.js/);
  assert.match(head,/SMART_SRRT_CHARTJS_VENDOR_INLINED_AT_BUILD/);
  assert.match(exportSource,/function captureDashboard\(\)/);
  assert.match(exportSource,/html2canvas\(el\('captureArea'\)/);
  assert.match(css,/srrt-dashboard-chart-details/);
  assert.match(css,/srrt-dashboard-data-table/);
  assert.match(css,/summary:focus-visible/);
  assert.match(source,/getPublicDashboardData/);
  assert.match(source,/getDashboardData/);
  assert.doesNotMatch(source.slice(from,to),/google\.script\.run|gs\(/);
});
