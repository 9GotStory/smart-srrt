import {nativeServer,nativeHtml,nativeBrowser} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = nativeServer;
const html = nativeHtml;

function makeContext() {
  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Array,
    Object,
    RegExp,
    Error,
    isFinite
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test('raw Event RPC requires authentication and public RPC is aggregate-only', () => {
  assert.match(source, /function getDashboardData\(sessionToken, filter\)/);
  assert.match(source, /requireAuth_\(sessionToken, 'view'\)/);
  assert.match(source, /function getPublicDashboardData\(filter\)/);

  const publicBlock = source.match(/function getPublicDashboardData[\s\S]*?(?=\nfunction )/)?.[0] ?? '';
  assert.match(publicBlock, /buildDashboardAggregate_/);
  assert.doesNotMatch(publicBlock, /rowToObject_/);
  assert.doesNotMatch(publicBlock, /return\s+getFilteredEventRows_/);
});

test('browser chooses aggregate public dashboard and authenticated raw rows', () => {
  const loader = html.match(/async function loadDashboard\(\)\{[\s\S]*?(?=\n  function resetFilter\()/)?.[0] ?? '';
  assert.match(loader,/const response=hasUser\s*\?await gs\('getDashboardData',session,filter\)\s*:await gs\('getPublicDashboardData',filter\)/);
  assert.match(loader,/if\(request!==dashboardLoadRequest\|\|session!==token\|\|hasUser!==!!currentUser\)return/);
  assert.match(loader,/if\(hasUser\)\{allData=response;dashboardSummary=null\}/);
  assert.match(loader,/else\{allData=\[\];dashboardSummary=response\}/);
  assert.match(html, /function exportClientExcel\(\)\{\s*if\(!currentUser\)/);
  assert.match(html, /if\(!currentUser\)\{el\('eventBody'\)\.innerHTML='';/);
});

test('criteria matching is exact and does not count ไม่เข้าเกณฑ์', () => {
  const ctx = makeContext();
  const rows = [
    {col17:'เข้าเกณฑ์', col26:'2026-10-01', col5:'A', col6:'โรค A', col19:'ต่ำ', col29:'บ้าน 1', col2:'2569-10-01'},
    {col17:'เข้าเกณฑ์', col26:'', col5:'A', col6:'โรค A', col19:'ต่ำ', col29:'บ้าน 1', col2:'2569-10-02'},
    {col17:'ไม่เข้าเกณฑ์', col26:'2026-10-03', col5:'B', col6:'โรค B', col19:'สูง', col29:'บ้าน 2', col2:'2569-10-03'},
    {col17:'รอดำเนินการ', col26:'2026-10-04', col5:'B', col6:'โรค B', col19:'สูง', col29:'บ้าน 2', col2:'2569-10-04'}
  ];

  const summary = ctx.buildDashboardAggregate_(rows);
  assert.equal(summary.kpi.events,4);
  assert.equal(summary.kpi.criteria,2);
  assert.equal(summary.kpi.investigated,1);
  assert.equal(summary.kpi.pendingCriteria,1);
  assert.equal(summary.kpi.investigationRate,50);
});

test('investigated KPI numerator is a subset of exact criteria rows', () => {
  const ctx=makeContext();
  const rows=[
    {col17:'ไม่เข้าเกณฑ์',col26:'2569-10-01'},
    {col17:'รอดำเนินการ',col26:'2569-10-01'},
    {col17:'เข้าเกณฑ์',col26:''}
  ];
  const summary=ctx.buildDashboardAggregate_(rows);
  assert.equal(summary.kpi.criteria,1);
  assert.equal(summary.kpi.investigated,0);
  assert.equal(summary.kpi.investigationRate,0);
});

test('public aggregate contains counts/insight only, not raw Event fields or EventID', () => {
  const ctx=makeContext();
  const rows=[
    {
      col2:'2569-10-01',
      col5:'โรคติดต่อ',
      col6:'ไข้หวัดใหญ่',
      col14:'รายละเอียดลับ',
      col17:'เข้าเกณฑ์',
      col19:'ความเสี่ยงต่ำ',
      col26:'',
      col27:'user@example.test',
      col29:'ทดสอบ',
      eventId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      revision:2,
      recordStatus:'active'
    }
  ];
  const summary=ctx.buildDashboardAggregate_(rows);
  const json=JSON.stringify(summary);
  assert.doesNotMatch(json,/รายละเอียดลับ/);
  assert.doesNotMatch(json,/user@example\.test/);
  assert.doesNotMatch(json,/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);
  assert.equal(summary.kpi.events,1);
  assert.equal(summary.topDisease,'ไข้หวัดใหญ่');
});

test('aggregate chart payloads are map-shaped and deterministic', () => {
  const ctx=makeContext();
  const rows=[
    {col2:'2569-10-02',col5:'B',col6:'โรค B',col17:'เข้าเกณฑ์',col19:'สูง',col29:'หมู่ 2'},
    {col2:'2569-10-01',col5:'A',col6:'โรค A',col17:'เข้าเกณฑ์',col19:'ต่ำ',col29:'หมู่ 1'},
    {col2:'2569-10-01',col5:'A',col6:'โรค A',col17:'ไม่เข้าเกณฑ์',col19:'ต่ำ',col29:'หมู่ 1'}
  ];
  const summary=ctx.buildDashboardAggregate_(rows);
  assert.deepEqual(JSON.parse(JSON.stringify(summary.byDiseaseGroup)),[['A',2],['B',1]]);
  assert.deepEqual(JSON.parse(JSON.stringify(summary.byRisk)),[['ต่ำ',2],['สูง',1]]);
  assert.deepEqual(JSON.parse(JSON.stringify(summary.byMonth)),[['2569-10',3]]);
  assert.equal(summary.topDisease,'โรค A');
  assert.equal(summary.topVillage,'บ้านหมู่ 1');
});
