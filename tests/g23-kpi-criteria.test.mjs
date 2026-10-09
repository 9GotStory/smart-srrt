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

function eventRow(criteria, investigatedDate = '') {
  return {
    col2: '2569-10-06',
    col5: 'โรคติดต่อทางเดินหายใจ',
    col6: 'เหตุการณ์ทดสอบ',
    col10: '1',
    col17: criteria,
    col19: 'ความเสี่ยงต่ำ',
    col26: investigatedDate,
    col29: 'ทดสอบ'
  };
}

test('canonical criteria predicate uses exact semantic match', () => {
  const ctx = makeContext();

  assert.equal(ctx.isInvestigationCriteriaMet_('เข้าเกณฑ์'), true);
  assert.equal(ctx.isInvestigationCriteriaMet_(' เข้าเกณฑ์ '), true);

  assert.equal(ctx.isInvestigationCriteriaMet_('ไม่เข้าเกณฑ์'), false);
  assert.equal(ctx.isInvestigationCriteriaMet_('รอดำเนินการ'), false);
  assert.equal(ctx.isInvestigationCriteriaMet_('เข้าเกณฑ์เพิ่มเติม'), false);
  assert.equal(ctx.isInvestigationCriteriaMet_(''), false);
  assert.equal(ctx.isInvestigationCriteriaMet_(null), false);
});

test('dashboard aggregate counts only exact เข้าเกณฑ์ rows', () => {
  const ctx = makeContext();
  const rows = [
    eventRow('เข้าเกณฑ์', '2569-10-06'),
    eventRow('ไม่เข้าเกณฑ์'),
    eventRow('รอดำเนินการ'),
    eventRow('เข้าเกณฑ์')
  ];

  const result = ctx.buildDashboardAggregate_(rows);

  assert.equal(result.kpi.events, 4);
  assert.equal(result.kpi.criteria, 2);
  assert.equal(result.kpi.investigated, 1);
  assert.equal(result.kpi.pendingCriteria, 1);
  assert.equal(result.kpi.investigationRate, 50);
});

test('all server KPI paths use the canonical predicate', () => {
  assert.match(
    source,
    /var meetsCriteria = isInvestigationCriteriaMet_\(r\.col17\);/
  );
  assert.match(
    source,
    /criteria: data\.filter\(function\(r\)\{return isInvestigationCriteriaMet_\(r\.col17\);\}\)\.length/
  );

  assert.doesNotMatch(source, /indexOf\(['"]เข้าเกณฑ์['"]\)/);
  assert.doesNotMatch(source, /includes\(['"]เข้าเกณฑ์['"]\)/);
});

test('authenticated browser KPI and insight use exact criteria semantics', () => {
  assert.match(
    html,
    /function isInvestigationCriteriaMet\(value\)\{return String\(value\|\|''\)\.trim\(\)===['"]เข้าเกณฑ์['"]\}/
  );
  assert.match(
    html,
    /const qualifying=allData\.filter\(r=>isInvestigationCriteriaMet\(r\.col17\)\)/
  );
  assert.match(
    html,
    /const investigated=qualifying\.filter\(r=>String\(r\.col26\|\|''\)\.trim\(\)!==''\)\.length/
  );
  // Whitespace-only dates are pending; the old !r.col26 check missed them.
  assert.match(
    html,
    /pending=allData\.filter\(r=>isInvestigationCriteriaMet\(r\.col17\)&&String\(r\.col26\|\|''\)\.trim\(\)===''\)\.length/
  );

  assert.doesNotMatch(html, /includes\(['"]เข้าเกณฑ์['"]\)/);
  assert.doesNotMatch(html, /indexOf\(['"]เข้าเกณฑ์['"]\)/);
});
