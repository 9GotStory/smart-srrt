import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs',import.meta.url),'utf8');

function run(rows){
  const ctx={Logger:{log(){}},console};
  vm.createContext(ctx);
  vm.runInContext(source,ctx,{filename:'Code.gs'});
  return ctx.buildDashboardAggregate_(rows);
}

const mock=(criteria,date,extra={})=>({
  col2:'2569-10-01',col5:'กลุ่มโรคทดสอบ',col6:'โรคทดสอบ',
  col17:criteria,col19:'ต่ำ',col26:date,col29:'หมู่บ้านทดสอบ',...extra
});

test('P2 preserved: investigation numerator cannot count non-criteria cases with dates',()=>{
  const k=run([
    mock('เข้าเกณฑ์',''),
    mock('ไม่เข้าเกณฑ์','2569-10-02'),
    mock('รอดำเนินการ','2569-10-03')
  ]).kpi;
  assert.equal(k.events,3);
  assert.equal(k.criteria,1);
  assert.equal(k.investigated,0);
  assert.equal(k.investigationRate,0);
  assert.equal(k.pendingCriteria,1);
});

test('P2 preserved: investigated cases must be a subset of exact criteria',()=>{
  const k=run([
    mock('เข้าเกณฑ์','2569-10-01'),
    mock('เข้าเกณฑ์',''),
    mock('ไม่เข้าเกณฑ์','2569-10-03')
  ]).kpi;
  assert.equal(k.criteria,2);
  assert.equal(k.investigated,1);
  assert.equal(k.investigationRate,50);
  assert.equal(k.pendingCriteria,1);
});

test('P2 preserved: no qualifying cases means investigated=0 and rate=0',()=>{
  const k=run([
    mock('ไม่เข้าเกณฑ์','2569-10-01'),
    mock('รอดำเนินการ','2569-10-02')
  ]).kpi;
  assert.equal(k.criteria,0);
  assert.equal(k.investigated,0);
  assert.equal(k.investigationRate,0);
});

test('P2 preserved: public aggregate does not leak raw EventID, reporter, or narrative',()=>{
  const sourceRow=mock('เข้าเกณฑ์','2569-10-01',{
    eventId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    col14:'รายละเอียดลับห้ามเผยแพร่',
    col27:'private@example.test'
  });
  const result=run([sourceRow]);
  const serialized=JSON.stringify(result);
  assert.doesNotMatch(serialized,/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);
  assert.doesNotMatch(serialized,/รายละเอียดลับห้ามเผยแพร่/);
  assert.doesNotMatch(serialized,/private@example\.test/);
  assert.equal(result.kpi.events,1);
});

test('P2 preserved: missing or whitespace investigation date is not investigated',()=>{
  const missing=mock('เข้าเกณฑ์','');
  delete missing.col26;
  const blank=mock('เข้าเกณฑ์','   ');
  const k=run([missing,blank]).kpi;
  assert.equal(k.criteria,2);
  assert.equal(k.investigated,0);
  assert.equal(k.pendingCriteria,2);
  assert.equal(k.investigationRate,0);
});
