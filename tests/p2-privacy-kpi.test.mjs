import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

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

function functionBlock(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const match = re.exec(source);
  assert.ok(match, `missing function ${name}`);
  const start = match.index;
  const tail = source.slice(start + 1);
  const next = tail.search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next >= 0 ? start + 1 + next : source.length);
}

test('criteria KPI uses exact canonical equality', () => {
  const ctx = makeContext();
  assert.equal(ctx.isCriteriaMet_('เข้าเกณฑ์'), true);
  assert.equal(ctx.isCriteriaMet_(' เข้าเกณฑ์ '), true);
  assert.equal(ctx.isCriteriaMet_('ไม่เข้าเกณฑ์'), false);
  assert.equal(ctx.isCriteriaMet_('รอดำเนินการ'), false);
});

test('investigated KPI is a subset of exact criteria events', () => {
  const ctx = makeContext();
  const rows = [
    {col17:'เข้าเกณฑ์', col26:'2569-10-01', col5:'โรค A', col6:'A', col19:'ความเสี่ยงต่ำ', col29:'หนึ่ง', col10:'1', col2:'2569-10-01'},
    {col17:'ไม่เข้าเกณฑ์', col26:'2569-10-02', col5:'โรค A', col6:'B', col19:'ความเสี่ยงต่ำ', col29:'สอง', col10:'2', col2:'2569-10-02'},
    {col17:'เข้าเกณฑ์', col26:'', col5:'โรค B', col6:'C', col19:'ความเสี่ยงสูง', col29:'หนึ่ง', col10:'1', col2:'2569-10-03'}
  ];
  const summary = ctx.buildDashboardSummary_(rows);
  assert.equal(summary.kpi.events, 3);
  assert.equal(summary.kpi.criteria, 2);
  assert.equal(summary.kpi.investigated, 1);
  assert.equal(summary.kpi.pendingInvestigation, 1);
  assert.equal(summary.kpi.investigationRate, 50);
});

test('public dashboard summary contains aggregates only', () => {
  const ctx = makeContext();
  const rows = [{
    col2:'2569-10-01',
    col5:'โรค A',
    col6:'เหตุการณ์ลับ',
    col10:'1',
    col14:'รายละเอียดที่ไม่ควรออก public payload',
    col17:'เข้าเกณฑ์',
    col19:'ความเสี่ยงต่ำ',
    col26:'',
    col27:'recorder@example.test',
    col29:'หมู่บ้านทดสอบ',
    eventId:'11111111-1111-4111-8111-111111111111',
    revision:4,
    recordStatus:'active'
  }];
  const summary = ctx.buildDashboardSummary_(rows);
  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /รายละเอียดที่ไม่ควรออก public payload/);
  assert.doesNotMatch(serialized, /recorder@example\.test/);
  assert.doesNotMatch(serialized, /11111111-1111-4111-8111-111111111111/);
  assert.doesNotMatch(serialized, /"col14"/);
  assert.doesNotMatch(serialized, /"eventId"/);
  assert.equal(summary.kpi.events, 1);
  assert.equal(summary.insight.topDisease, 'เหตุการณ์ลับ');
});

test('raw Event RPC requires view permission while public RPC returns summary', () => {
  const publicBlock = functionBlock('getDashboardData');
  const eventBlock = functionBlock('getEventData');
  assert.match(publicBlock, /buildDashboardSummary_/);
  assert.doesNotMatch(publicBlock, /return\s+getFilteredEventRows_/);
  assert.match(eventBlock, /requireAuth_\(sessionToken, 'view'\)/);
  assert.match(eventBlock, /getFilteredEventRows_\(filter \|\| \{\}\)/);
});

test('browser obtains Event rows only for an authenticated user', () => {
  assert.match(html, /dashboardSummary=await gs\('getDashboardData',filter\)/);
  assert.match(html, /allData=currentUser\?await gs\('getEventData',token,filter\):\[\]/);
  assert.match(html, /dashboardPublicOnlyNote/);
  assert.match(html, /dashboardPrivateEvents/);
  assert.doesNotMatch(html, /\.includes\('เข้าเกณฑ์'\)/);
  assert.doesNotMatch(html, /indexOf\('เข้าเกณฑ์'\)/);
});

test('client Event export has an authentication guard', () => {
  const marker = 'function exportClientExcel()';
  const start = html.indexOf(marker);
  assert.notEqual(start, -1);
  const block = html.slice(start, start + 900);
  assert.match(block, /if\(!currentUser\)\{openLogin\(\);return\}/);
});

test('server export reads authenticated private Event rows, not public dashboard payload', () => {
  const block = functionBlock('exportData');
  assert.match(block, /requireAuth_\(sessionToken, 'export'\)/);
  assert.match(block, /getFilteredEventRows_\(\{\}\)/);
  assert.doesNotMatch(block, /getDashboardData\(/);
});
