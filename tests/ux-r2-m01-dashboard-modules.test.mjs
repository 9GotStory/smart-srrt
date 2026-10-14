// UX-R2-M01-02: dashboard partials are classic-script scope peers, not new RPC clients.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
import {nativeHtml} from './helpers/native-current.mjs';

const DASH='src/web/03d-client-dashboard.html';
const EXPORT='src/web/03e-client-dashboard-export.html';
const FINAL='src/web/04-browser-app.html';

function fixture(){
  const cells=new Map(),charts=[],workbooks=[],downloads=[];
  const cell=id=>{
    if(!cells.has(id))cells.set(id,{id,textContent:'',innerHTML:'',value:'',style:{},
      classList:{add(){},remove(){},contains(){return false}},
      children:[],replaceChildren(...items){this.children=items}});
    return cells.get(id);
  };
  const makeChart=class{
    constructor(canvas,config){
      this.canvas=canvas;this.config=config;
      charts.push({type:config.type,rows:[[config.data.datasets[0].label||'','จำนวน'],
        ...config.data.labels.map((label,i)=>[label,config.data.datasets[0].data[i]])],
        options:config.options});
    }
    stop(){}
    update(){}
    destroy(){}
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',addEventListener(){},getElementById:cell,
      createElement:tag=>({tag,children:[],setAttribute(){},appendChild(x){this.children.push(x)},replaceChildren(...x){this.children=x},textContent:''})},
    localStorage:{getItem(){return null}},
    Chart:makeChart,google:{script:{run:{}}},
    XLSX:{utils:{book_new:()=>({sheets:[]}),json_to_sheet:rows=>rows,
      book_append_sheet:(wb,rows,name)=>wb.sheets.push({rows,name})},
      writeFile:(wb,name)=>workbooks.push({wb,name})},
    setTimeout(){},console
  });
  const scripts=readOrderedClientScripts();
  for(const source of scripts){
    const code=source.path===FINAL?source.code.replace(/^\s*boot\(\);\s*$/m,''):source.code;
    new vm.Script(code,{filename:source.path}).runInContext(ctx,{timeout:2000});
  }
  return {ctx,cells,charts,workbooks,downloads,cell};
}

test('M01-02 dashboard and exports load in the manifest order before the final single boot',()=>{
  const paths=GAS_HTML_SOURCES;
  const start=paths.indexOf('src/web/03c-client-auth.html');
  assert.deepEqual(paths.slice(start,start+3),[
    'src/web/03c-client-auth.html',DASH,EXPORT
  ]);
  assert.ok(paths.indexOf(EXPORT)<paths.indexOf(FINAL),
    'later Event partials may appear between Dashboard exports and final bootstrap');
  const scripts=readOrderedClientScripts();
  assert.ok(scripts.find(s=>s.path===DASH).code.includes('function drawCharts()'));
  assert.ok(scripts.find(s=>s.path===EXPORT).code.includes('function exportClientExcel()'));
  assert.ok(scripts.find(s=>s.path===EXPORT).code.includes('function captureDashboard()'));
  assert.doesNotMatch(scripts.find(s=>s.path===FINAL).code,/function (?:setupDashboardFilters|drawCharts|exportClientExcel|captureDashboard)\(/);
  assert.equal(scripts.filter(s=>/^\s*boot\(\);\s*$/m.test(s.code)).length,1);
  assert.ok(nativeHtml.indexOf('function drawCharts()')<nativeHtml.indexOf('function riskBadge(v)'));
});

test('M01-02 guest KPI/charts use public aggregates while signed-in view uses private rows',()=>{
  const {ctx,charts,cell}=fixture();
  vm.runInContext(`dashboardSummary={kpi:{events:7,criteria:4,investigated:1,investigationRate:25,pendingCriteria:3},
    topDisease:'ทดสอบ',topVillage:'บ้านทดสอบ',byVillage:[['บ้าน A',7]],
    byMonth:[['2026-10',7]],byDiseaseGroup:[['กลุ่ม A',7]],byRisk:[['สูง',7]]};
    allData=[{eventId:'PRIVATE-001',col17:'เข้าเกณฑ์',col26:'2026-10-01'}];
    updateDashboard();`,ctx);
  assert.deepEqual([cell('kpiTotal').textContent,cell('kpiCriteria').textContent,
    cell('kpiInvestigated').textContent,cell('kpiRate').textContent],[7,4,1,'25%']);
  assert.equal(charts.length,4);
  assert.equal(charts[0].rows[1][0],'บ้าน A');
  assert.ok(!JSON.stringify(charts).includes('PRIVATE-001'));
  vm.runInContext(`currentUser={role:'Admin'};allData=[
      {col2:'2026-10-01',col5:'โรค A',col6:'เหตุ A',col17:'เข้าเกณฑ์',col26:'2026-10-02',col19:'ต่ำ'},
      {col2:'2026-10-02',col5:'โรค B',col6:'เหตุ B',col17:'ไม่เข้าเกณฑ์',col26:'2026-10-02',col19:'สูง'}
    ];dashboardSummary=null;updateDashboard();`,ctx);
  assert.deepEqual([cell('kpiTotal').textContent,cell('kpiCriteria').textContent,
    cell('kpiInvestigated').textContent,cell('kpiRate').textContent],[2,1,1,'100%']);
  assert.equal(charts.length,8);
});

test('M01-02 client workbook export remains guest-blocked and includes only signed-in rows',()=>{
  const {ctx,workbooks,cell}=fixture();
  vm.runInContext('exportClientExcel()',ctx);
  assert.equal(workbooks.length,0);
  assert.match(cell('toast').textContent,/เข้าสู่ระบบ/);
  vm.runInContext(`currentUser={role:'Admin'};allData=[{col2:'2026-10-01',
    col6:'เหตุการณ์ทดสอบ',col14:'private-text',col17:'เข้าเกณฑ์'}];
    exportClientExcel();`,ctx);
  assert.equal(workbooks.length,1);
  assert.equal(workbooks[0].wb.sheets[0].name,'SRRT_Data');
  assert.equal(workbooks[0].wb.sheets[0].rows.length,1);
  assert.equal(workbooks[0].wb.sheets[0].rows[0]['รายละเอียด'],'private-text');
});
