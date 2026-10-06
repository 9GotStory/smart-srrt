import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){this.sheet=sheet;this.row=row;this.col=col;this.numRows=numRows;this.numCols=numCols}
  _ensure(){
    while(this.sheet.rows.length < this.row-1+this.numRows)this.sheet.rows.push([]);
    const needed=Math.max(this.sheet.maxCols,this.col-1+this.numCols);
    this.sheet.maxCols=needed;
    for(const r of this.sheet.rows)while(r.length<needed)r.push('');
  }
  getValues(){this._ensure();return Array.from({length:this.numRows},(_,ri)=>Array.from({length:this.numCols},(_,ci)=>this.sheet.rows[this.row-1+ri]?.[this.col-1+ci]??''))}
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>v instanceof Date?v.toISOString():v===null||v===undefined?'':String(v)))}
  getValue(){return this.getValues()[0][0]}
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this}
  setValues(values){this._ensure();for(let r=0;r<this.numRows;r++)for(let c=0;c<this.numCols;c++)this.sheet.rows[this.row-1+r][this.col-1+c]=values[r][c];return this}
  clearContent(){this._ensure();for(let r=0;r<this.numRows;r++)for(let c=0;c<this.numCols;c++)this.sheet.rows[this.row-1+r][this.col-1+c]='';return this}
}

class FakeSheet {
  constructor(rows,maxCols=48){this.maxCols=maxCols;this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x})}
  getLastRow(){return this.rows.length}
  getLastColumn(){return this.maxCols}
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
}

function eventRow(id='11111111-1111-4111-8111-111111111111'){
  const r=Array(48).fill('');
  r[1]='2569-10-06';
  r[14]='ตรวจสอบแล้วจริง';
  r[16]='เข้าเกณฑ์';
  r[25]='2569-10-06';
  r[30]=id;
  r[31]=1;
  r[32]='active';
  r[38]='open';
  return r;
}

function context(){
  const ctx={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return ctx;
}

function lockStub(){return {getScriptLock:()=>({waitLock(){},releaseLock(){}})}}

test('P3 schema appends lifecycle metadata after P1 columns',()=>{
  const ctx=context();
  assert.equal(ctx.SCHEMA_VERSION, undefined);
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'3');
  assert.equal(ctx.MAIN_HEADERS.length,30);
  assert.equal(ctx.EVENT_META_HEADERS.length,8);
  assert.deepEqual(Array.from(ctx.WORKFLOW_META_HEADERS),[
    'WorkflowStatus','OwnerUserID','AssignedAt','AssignedBy','ClosedAt','ClosedBy','CloseReason','ReopenedAt','ReopenedBy','ReopenReason'
  ]);
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,48);
  assert.equal(ctx.WORKFLOW_META_COL.WORKFLOW_STATUS,39);
  assert.equal(ctx.WORKFLOW_META_COL.REOPEN_REASON,48);
});

test('legacy lifecycle migration defaults only blank workflow status and is idempotent',()=>{
  const ctx=context();
  const sheet=new FakeSheet([Array(48).fill(''),eventRow(),eventRow('22222222-2222-4222-8222-222222222222')]);
  sheet.rows[1][38]='';
  sheet.rows[2][38]='in_progress';
  const first=ctx.ensureEventLifecycleData_(sheet);
  assert.equal(first.initializedWorkflowStatus,1);
  assert.equal(sheet.rows[1][38],'open');
  assert.equal(sheet.rows[2][38],'in_progress');
  const second=ctx.ensureEventLifecycleData_(sheet);
  assert.equal(second.initializedWorkflowStatus,0);
});

test('lifecycle migration rejects unknown status',()=>{
  const ctx=context();
  const row=eventRow(); row[38]='waiting_magic';
  const sheet=new FakeSheet([Array(48).fill(''),row]);
  assert.throws(()=>ctx.ensureEventLifecycleData_(sheet),/WorkflowStatus ไม่ถูกต้อง/);
});

test('consistency warnings are advisory and exact',()=>{
  const ctx=context();
  assert.deepEqual(Array.from(ctx.getEventConsistencyWarnings_({col15:'รอตรวจสอบ',col17:'รอดำเนินการ',col26:''})),[
    'ยังไม่ได้ยืนยันผลการตรวจสอบเหตุการณ์',
    'ยังไม่ได้สรุปเกณฑ์สอบสวนโรค'
  ]);
  assert.deepEqual(Array.from(ctx.getEventConsistencyWarnings_({col15:'ตรวจสอบแล้วจริง',col17:'เข้าเกณฑ์',col26:''})),[
    'เหตุการณ์เข้าเกณฑ์แต่ยังไม่ได้ระบุวันที่ลงสอบสวนโรค'
  ]);
  assert.deepEqual(Array.from(ctx.getEventConsistencyWarnings_({col15:'ตรวจสอบแล้วจริง',col17:'ไม่เข้าเกณฑ์',col26:''})),[]);
});

test('assign owner validates active user, moves open to in_progress and increments revision',()=>{
  const ctx=context();
  const row=eventRow();
  const sheet=new FakeSheet([Array(48).fill(''),row]);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.findUserByEmail_=()=>({userId:'user-2',email:'staff@example.test',status:'active'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...a)=>audits.push(a);
  ctx.LockService=lockStub();
  const msg=ctx.assignEventOwner('t',row[30],'staff@example.test',1);
  assert.match(msg,/มอบหมาย/);
  assert.equal(sheet.rows[1][39],'user-2');
  assert.equal(sheet.rows[1][38],'in_progress');
  assert.equal(sheet.rows[1][31],2);
  assert.equal(audits[0][1],'ASSIGN_EVENT_OWNER');
});

test('closed Event rejects normal update',()=>{
  const ctx=context();
  const row=eventRow(); row[38]='closed';
  const sheet=new FakeSheet([Array(48).fill(''),row]);
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=()=>{};
  ctx.LockService=lockStub();
  assert.throws(()=>ctx.updateRecord('t',row[30],{col2:'2569-10-07'},1),/ปิดแล้ว/);
});

test('close requires override when warnings remain',()=>{
  const ctx=context();
  const row=eventRow(); row[14]='รอตรวจสอบ'; row[16]='รอดำเนินการ'; row[25]='';
  const sheet=new FakeSheet([Array(48).fill(''),row]);
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=()=>{};
  ctx.LockService=lockStub();
  assert.throws(()=>ctx.closeEvent('t',row[30],1,'ปิดทดสอบ',''),/Override/);
  assert.equal(sheet.rows[1][38],'open');
  const msg=ctx.closeEvent('t',row[30],1,'ปิดทดสอบ','ยอมรับคำเตือนเพื่อทดสอบ');
  assert.match(msg,/ปิดเหตุการณ์/);
  assert.equal(sheet.rows[1][38],'closed');
  assert.equal(sheet.rows[1][31],2);
  assert.equal(sheet.rows[1][43],'admin@example.test');
  assert.equal(sheet.rows[1][44],'ปิดทดสอบ');
});

test('reopen clears current close fields and records reopen evidence',()=>{
  const ctx=context();
  const row=eventRow(); row[31]=2; row[38]='closed'; row[42]='old-date'; row[43]='admin@example.test'; row[44]='done';
  const sheet=new FakeSheet([Array(48).fill(''),row]);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...a)=>audits.push(a);
  ctx.LockService=lockStub();
  const msg=ctx.reopenEvent('t',row[30],2,'พบข้อมูลใหม่');
  assert.match(msg,/เปิดเหตุการณ์อีกครั้ง/);
  assert.equal(sheet.rows[1][38],'open');
  assert.equal(sheet.rows[1][42],'');
  assert.equal(sheet.rows[1][43],'');
  assert.equal(sheet.rows[1][44],'');
  assert.equal(sheet.rows[1][46],'manager@example.test');
  assert.equal(sheet.rows[1][47],'พบข้อมูลใหม่');
  assert.equal(sheet.rows[1][31],3);
  assert.equal(audits[0][1],'REOPEN_EVENT');
});

test('lifecycle mutations reject stale revisions',()=>{
  const ctx=context();
  const row=eventRow(); row[31]=5;
  const sheet=new FakeSheet([Array(48).fill(''),row]);
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.findUserByEmail_=()=>({userId:'user-2',email:'staff@example.test',status:'active'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=()=>{};
  ctx.LockService=lockStub();
  assert.throws(()=>ctx.assignEventOwner('t',row[30],'staff@example.test',4),/ถูกแก้ไขจากผู้ใช้อื่นแล้ว/);
  assert.throws(()=>ctx.closeEvent('t',row[30],4,'close','override'),/ถูกแก้ไขจากผู้ใช้อื่นแล้ว/);
  assert.equal(sheet.rows[1][31],5);
});

test('browser exposes lightweight lifecycle controls without a workflow engine',()=>{
  assert.match(html,/assignEventOwner/);
  assert.match(html,/getEventCloseReadiness/);
  assert.match(html,/closeEvent/);
  assert.match(html,/reopenEvent/);
  assert.match(html,/workflowStatus/);
  assert.doesNotMatch(html,/\bSLA\b|\bescalation\b|task queue/i);
});
