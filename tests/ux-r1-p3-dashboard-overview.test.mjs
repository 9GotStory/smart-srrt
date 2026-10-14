import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeHtml} from './helpers/native-current.mjs';

const read = p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const layout=read('src/web/02-app-layout.html');
const css=read('src/styles/dashboard-ui.css');
const output=read('src/web/01-styles.html');
const dashboard=layout.slice(layout.indexOf('<section id="page-dashboard"'),
  layout.indexOf('<section id="page-records"'));

test('UX-R1/P3-01 preserves Dashboard DOM identifiers and all four chart/KPI sources',()=>{
  for(const id of ['captureArea','startDate','endDate','filterProvince','filterAmphoe',
    'filterTambon','filterVillage','kpiTotal','kpiCriteria','kpiInvestigated',
    'kpiRate','smartInsight','barChart','lineChart','pieDisease','pieRisk',
    'publicAggregateNotice','eventDetailPanel','eventBody']){
    assert.equal((dashboard.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'Missing or duplicate Dashboard ID: '+id);
  }
  assert.equal((dashboard.match(/class="card kpi"/g)||[]).length,4);
  assert.equal((dashboard.match(/class="card srrt-dashboard-chart"/g)||[]).length,4);
  assert.match(dashboard,/class="grid charts"/);
  assert.match(dashboard,/class="grid kpis"/);
  assert.match(dashboard,/class="card insight srrt-dashboard-insight"/);
});

test('UX-R1/P3-01 retains manual filter actions, cascading controls and privacy boundaries',()=>{
  assert.match(dashboard,/class="filter card"/);
  assert.match(dashboard,/onchange="updateDashboardAreaFilters\('province'\)"/);
  assert.match(dashboard,/onchange="updateDashboardAreaFilters\('amphoe'\)/);
  assert.match(dashboard,/onchange="updateDashboardAreaFilters\('tambon'\)/);
  for(const fn of ['loadDashboard()','resetFilter()','captureDashboard()',
    'exportClientExcel()',"exportServerFile('xlsx')"]){
    assert.ok(dashboard.includes('onclick="'+fn+'"'),'existing action lost: '+fn);
  }
  for(const id of ['startDate','endDate','filterProvince','filterAmphoe','filterTambon','filterVillage'])
    assert.match(dashboard,new RegExp('<label class="srrt-dashboard-field">[\\s\\S]*?id="'+id+'"'));
  const capture=dashboard.slice(dashboard.indexOf('<div id="captureArea">'),
    dashboard.indexOf('<div id="publicAggregateNotice"'));
  assert.ok(!capture.includes('id="eventDetailPanel"'),
    'Image capture region must not contain private event rows');
  assert.ok(!capture.includes('id="eventBody"'),
    'Image capture region must not contain private event rows');
  assert.ok(dashboard.indexOf('id="eventDetailPanel"')>
    dashboard.indexOf('id="publicAggregateNotice"'));
  assert.match(dashboard,/id="eventBody"/);
});

test('UX-R1/P3-01 clarifies investigation KPIs without inventing new states or datasets',()=>{
  assert.match(dashboard,/รายการเข้าเกณฑ์ที่ระบุวันที่ลงสอบสวน/);
  assert.match(dashboard,/สัดส่วนที่ลงสอบสวนต่อรายการเข้าเกณฑ์/);
  assert.match(dashboard,/กำหนดเงื่อนไข แล้วกดค้นหา/);
  assert.doesNotMatch(dashboard,/อนุมัติรายงาน|รายงานผ่านการรับรอง|ปิดเหตุการณ์ทั้งหมด/);
  assert.equal((layout.match(/<section id="page-/g)||[]).length,5);
});

test('UX-R1/P3-01 isolates CSS in a deterministic, mobile-friendly Native stylesheet',()=>{
  assert.match(css,/UX-R1\/P3-01/);
  assert.match(css,/\.app #page-dashboard \.srrt-dashboard-filter-fields/);
  assert.match(css,/\.app #page-dashboard \.grid\.kpis/);
  assert.match(css,/\.app #page-dashboard \.grid\.charts/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.doesNotMatch(css,/<script|<\/style|@import/i);
  assert.ok(output.includes(css));
  assert.match(output,/UX-R1 Dashboard UI/);
  assert.ok(nativeHtml.includes(dashboard));
  assert.ok(nativeHtml.includes(output));
});
