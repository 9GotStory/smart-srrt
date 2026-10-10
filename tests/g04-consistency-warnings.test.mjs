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

function codes(ctx, fields = {}) {
  return Array.from(ctx.deriveEventConsistencyWarnings_({
    recordStatus: fields.recordStatus ?? 'active',
    col15: fields.verification ?? '',
    col17: fields.criteria ?? '',
    col24: fields.investigationDecision ?? '',
    col26: fields.investigationDate ?? ''
  })).map(w => w.code);
}

test('G-04 returns no warnings for ordinary consistent states', () => {
  const ctx = makeContext();

  assert.deepEqual(codes(ctx), []);
  assert.deepEqual(codes(ctx, {verification:'รอตรวจสอบ'}), []);
  assert.deepEqual(codes(ctx, {
    verification:'ตรวจสอบแล้วจริง',
    criteria:'เข้าเกณฑ์',
    investigationDecision:'ลงสอบสวน',
    investigationDate:'2569-10-06'
  }), []);
  assert.deepEqual(codes(ctx, {
    verification:'ตรวจสอบแล้วจริง',
    criteria:'ไม่เข้าเกณฑ์',
    investigationDecision:'ไม่ลงสอบสวน'
  }), []);
});

test('G-04 detects verification contradictions', () => {
  const ctx = makeContext();

  assert.ok(codes(ctx, {
    verification:'ตรวจสอบแล้วไม่จริง',
    criteria:'เข้าเกณฑ์'
  }).includes('VERIFY_FALSE_BUT_CRITERIA_MET'));

  assert.ok(codes(ctx, {
    verification:'ตรวจสอบแล้วไม่จริง',
    investigationDate:'2569-10-06'
  }).includes('VERIFY_FALSE_BUT_INVESTIGATED'));
});

test('G-04 detects investigation-date contradictions with criteria', () => {
  const ctx = makeContext();

  assert.ok(codes(ctx, {
    criteria:'ไม่เข้าเกณฑ์',
    investigationDate:'2569-10-06'
  }).includes('CRITERIA_NOT_MET_BUT_INVESTIGATED'));

  assert.ok(codes(ctx, {
    criteria:'รอดำเนินการ',
    investigationDate:'2569-10-06'
  }).includes('CRITERIA_PENDING_BUT_INVESTIGATED'));
});

test('G-04 detects exact investigation-decision contradictions', () => {
  const ctx = makeContext();

  assert.ok(codes(ctx, {
    investigationDecision:'ไม่ลงสอบสวน',
    investigationDate:'2569-10-06'
  }).includes('NO_INVESTIGATION_BUT_DATE_SET'));

  assert.ok(codes(ctx, {
    investigationDecision:'ลงสอบสวน'
  }).includes('INVESTIGATION_MARKED_WITHOUT_DATE'));

  assert.ok(codes(ctx, {
    criteria:'เข้าเกณฑ์',
    investigationDecision:'ไม่ลงสอบสวน'
  }).includes('CRITERIA_MET_BUT_NO_INVESTIGATION'));
});

test('G-04 does not interpret arbitrary legacy col24 free text as a decision', () => {
  const ctx = makeContext();

  assert.deepEqual(codes(ctx, {
    criteria:'เข้าเกณฑ์',
    investigationDecision:'สสอ.เมืองอุดรธานี'
  }), []);

  assert.deepEqual(codes(ctx, {
    investigationDecision:'SRRT รพ.สต.หนองนาคำ',
    investigationDate:'2569-10-06'
  }), []);
});

test('G-04 suppresses workflow warnings for voided records', () => {
  const ctx = makeContext();

  assert.deepEqual(codes(ctx, {
    recordStatus:'void',
    verification:'ตรวจสอบแล้วไม่จริง',
    criteria:'เข้าเกณฑ์',
    investigationDecision:'ไม่ลงสอบสวน',
    investigationDate:'2569-10-06'
  }), []);
});

test('rowToObject exposes warnings as derived metadata only', () => {
  const ctx = makeContext();
  const row = Array(38).fill('');
  row[1] = '2569-10-06';
  row[14] = 'ตรวจสอบแล้วไม่จริง';
  row[16] = 'เข้าเกณฑ์';
  row[30] = '22222222-2222-4222-8222-222222222222';
  row[31] = 1;
  row[32] = 'active';

  const obj = ctx.rowToObject_(row);

  assert.ok(Array.isArray(obj.eventConsistencyWarnings));
  assert.ok(obj.eventConsistencyWarnings.some(w => w.code === 'VERIFY_FALSE_BUT_CRITERIA_MET'));
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length, 38);
});

test('G-04 remains soft: add/update do not block on consistency warnings', () => {
  const addBlock = source.match(/function addRecord[\s\S]*?(?=\nfunction )/)?.[0] ?? '';
  const updateBlock = source.match(/function updateRecord[\s\S]*?(?=\nfunction )/)?.[0] ?? '';

  assert.doesNotMatch(addBlock, /deriveEventConsistencyWarnings_/);
  assert.doesNotMatch(updateBlock, /deriveEventConsistencyWarnings_/);
  assert.doesNotMatch(addBlock, /VERIFY_FALSE_BUT|CRITERIA_NOT_MET_BUT|NO_INVESTIGATION_BUT/);
  assert.doesNotMatch(updateBlock, /VERIFY_FALSE_BUT|CRITERIA_NOT_MET_BUT|NO_INVESTIGATION_BUT/);
});

test('authenticated tables render server-derived warning badge', () => {
  assert.match(html, /function consistencyWarningBadge\(r\)/);
  assert.match(html, /eventConsistencyWarnings/);
  const uses = html.match(/consistencyWarningBadge\(r\)/g) ?? [];
  assert.ok(uses.length >= 3);
});
