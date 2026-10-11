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

function lifecycle(ctx, fields = {}) {
  return ctx.deriveEventLifecycle_({
    recordStatus: fields.recordStatus ?? 'active',
    col15: fields.verification ?? '',
    col17: fields.criteria ?? '',
    col24: fields.investigationFlag ?? '',
    col26: fields.investigationDate ?? ''
  });
}

test('G-03 lifecycle derives the expected stage from existing evidence', () => {
  const ctx = makeContext();

  assert.equal(lifecycle(ctx).code, 'received');
  assert.equal(lifecycle(ctx, {verification:'รอตรวจสอบ'}).code, 'verification_pending');
  assert.equal(lifecycle(ctx, {verification:'ตรวจสอบแล้วไม่จริง'}).code, 'verification_rejected');
  assert.equal(lifecycle(ctx, {verification:'ตรวจสอบแล้วจริง'}).code, 'criteria_pending');
  assert.equal(lifecycle(ctx, {criteria:'รอดำเนินการ'}).code, 'criteria_pending');
  assert.equal(lifecycle(ctx, {criteria:'ไม่เข้าเกณฑ์'}).code, 'criteria_not_met');
  assert.equal(lifecycle(ctx, {criteria:'เข้าเกณฑ์'}).code, 'investigation_required');
  assert.equal(lifecycle(ctx, {investigationDate:'2569-10-06'}).code, 'investigated');
  assert.equal(lifecycle(ctx, {recordStatus:'void'}).code, 'voided');
});

test('G-03 lifecycle precedence follows strongest downstream evidence', () => {
  const ctx = makeContext();

  assert.equal(
    lifecycle(ctx, {
      verification:'ตรวจสอบแล้วไม่จริง',
      criteria:'เข้าเกณฑ์'
    }).code,
    'investigation_required'
  );

  assert.equal(
    lifecycle(ctx, {
      verification:'ตรวจสอบแล้วไม่จริง',
      criteria:'ไม่เข้าเกณฑ์',
      investigationDate:'2569-10-06'
    }).code,
    'investigated'
  );

  assert.equal(
    lifecycle(ctx, {
      recordStatus:'void',
      criteria:'เข้าเกณฑ์',
      investigationDate:'2569-10-06'
    }).code,
    'voided'
  );
});

test('G-03 deliberately ignores legacy col24 as authoritative lifecycle evidence', () => {
  const ctx = makeContext();

  assert.equal(
    lifecycle(ctx, {investigationFlag:'สสอ.เมืองอุดรธานี'}).code,
    'received'
  );
  assert.equal(
    lifecycle(ctx, {investigationFlag:'ลงสอบสวน'}).code,
    'received'
  );
  assert.equal(
    lifecycle(ctx, {investigationFlag:'ไม่ลงสอบสวน', criteria:'เข้าเกณฑ์'}).code,
    'investigation_required'
  );
});

test('rowToObject exposes derived lifecycle without adding persisted schema columns', () => {
  const ctx = makeContext();
  const row = Array(38).fill('');
  row[1] = '2569-10-06';
  row[16] = 'เข้าเกณฑ์';
  row[30] = '11111111-1111-4111-8111-111111111111';
  row[31] = 1;
  row[32] = 'active';

  const obj = ctx.rowToObject_(row);

  assert.equal(obj.eventLifecycle, 'investigation_required');
  assert.equal(obj.eventLifecycleLabel, 'รอสอบสวน');
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length, 38);
});

test('authenticated Event and Record tables display server-derived lifecycle', () => {
  assert.match(html, /<th>สถานะเหตุการณ์<\/th>/);
  assert.match(html, /function lifecycleBadge\(r\)/);
  assert.match(html, /r\.eventLifecycleLabel/);
  assert.match(html, /\$\{lifecycleBadge\(r\)\}/);
});
