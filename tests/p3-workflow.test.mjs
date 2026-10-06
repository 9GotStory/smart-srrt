import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){Object.assign(this,{sheet,row,col,numRows,numCols});}
  _ensure(){
    while(this.sheet.rows.length<this.row-1+this.numRows)this.sheet.rows.push([]);
    for(const r of this.sheet.rows)while(r.length<this.sheet.maxCols)r.push('');
  }
  getValues(){this._ensure();return Array.from({length:this.numRows},(_,ri)=>Array.from({length:this.numCols},(_,ci)=>this.sheet.rows[this.row-1+ri]?.[this.col-1+ci]??''));}
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>v instanceof Date?v.toISOString():v==null?'':String(v)));}
  getValue(){return this.getValues()[0][0];}
  getDisplayValue(){return this.getDisplayValues()[0][0];}
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this;}
  setValues(vals){this._ensure();for(let r=0;r<this.numRows;r++)for(let c=0;c<this.numCols;c++)this.sheet.rows[this.row-1+r][this.col-1+c]=vals[r][c];return this;}
  clearContent(){this._ensure();for(let r=0;r<this.numRows;r++)for(let c=0;c<this.numCols;c++)this.sheet.rows[this.row-1+r][this.col-1+c]='';return this;}
}
class FakeSheet {
  constructor(rows,maxCols=44){
    this.maxCols=maxCols;
    this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x});
  }
  getLastRow(){return this.rows.length}
  getLastColumn(){return this.maxCols}
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getRange(r,c,nr=1,nc=1){return new FakeRange(this,r,c,nr,nc)}
  getDataRange(){return this.getRange(1,1,this.rows.length,this.maxCols)}
}

function makeContext(){
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite,Utilities:{getUuid:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}};
  vm.createContext(context);vm.runInContext(source,context);return context;
}
function row(){
  const r=Array(44).fill('');
  r[1]='2569-10-06';
  r[30]='11111111-1111-4111-8111-111111111111';
  r[31]=1;r[32]='active';
  return r;
}

test('P3 schema appends workflow metadata after the P1 prefix',()=>{
  const ctx=makeContext();
  assert.equal(ctx.MAIN_HEADERS.length,30);
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,44);
  assert.deepEqual(Array.from(ctx.EVENT_META_HEADERS).slice(8),[
    'WorkflowStatus','OwnerUserID','OwnerAssignedAt','ClosedAt','ClosedBy','CloseReason'
  ]);
  assert.equal(ctx.EVENT_META_COL.WORKFLOW_STATUS,39);
  assert.equal(ctx.EVENT_META_COL.CLOSE_REASON,44);
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'3');
});

test('workflow derivation stays lightweight and distinguishes void/closed/progress/open',()=>{
  const ctx=makeContext();
  assert.equal(ctx.deriveWorkflowStatus_({recordStatus:'void'}),'VOID');
  assert.equal(ctx.deriveWorkflowStatus_({recordStatus:'active',closedAt:'2026-10-06'}),'CLOSED');
  assert.equal(ctx.deriveWorkflowStatus_({recordStatus:'active',col17:'เข้าเกณฑ์'}),'IN_PROGRESS');
  assert.equal(ctx.deriveWorkflowStatus_({recordStatus:'active'}),'OPEN');
});

test('consistency rules warn rather than hard-fail normal SRRT field combinations',()=>{
  const ctx=makeContext();
  const warnings=ctx.getEventConsistencyWarnings_({
    col17:'ไม่เข้าเกณฑ์',
    col24:'ลงสอบสวน',
    col26:'2569-10-06',
    col21:'',
    col22:'2569-10-06',
    workflowStatus:'IN_PROGRESS'
  });
  assert.equal(warnings.length,3);
  assert.ok(warnings.some(x=>x.includes('วันที่ลงสอบสวน')));
  assert.ok(warnings.some(x=>x.includes('ระบุว่าลงสอบสวน')));
  assert.ok(warnings.some(x=>x.includes('วันที่ดำเนินมาตรการ')));
});

test('workflow migration initializes blank status idempotently',()=>{
  const ctx=makeContext();
  const header=Array(44).fill('');
  const r=row();
  r[16]='เข้าเกณฑ์';
  const sheet=new FakeSheet([header,r]);
  const first=ctx.ensureWorkflowData_(sheet);
  assert.equal(first.initializedWorkflow,1);
  assert.equal(sheet.rows[1][38],'IN_PROGRESS');
  const second=ctx.ensureWorkflowData_(sheet);
  assert.equal(second.initializedWorkflow,0);
  assert.equal(sheet.rows[1][38],'IN_PROGRESS');
});

test('active owner lookup accepts active users and rejects inactive users',()=>{
  const ctx=makeContext();
  const users=new FakeSheet([
    ['UserID','ชื่อ-สกุล','Email','PasswordHash','Role','Status'],
    ['u-active','Active User','active@example.test','','Admin','active'],
    ['u-blocked','Blocked User','blocked@example.test','','Staff','blocked']
  ],14);
  ctx.getSheet_=()=>users;
  assert.equal(ctx.findActiveUserById_('u-active').name,'Active User');
  assert.throws(()=>ctx.findActiveUserById_('u-blocked'),/ไม่ได้อยู่ในสถานะ active/);
  assert.throws(()=>ctx.findActiveUserById_('missing'),/ไม่พบผู้รับผิดชอบ/);
});

test('close and reopen preserve the row, increment revision and audit lifecycle actions',()=>{
  const ctx=makeContext();
  const r=row();
  r[16]='เข้าเกณฑ์';
  r[38]='IN_PROGRESS';
  const sheet=new FakeSheet([Array(44).fill(''),r]);
  const audits=[];
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...a)=>audits.push(a);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const id=r[30];
  const rowsBefore=sheet.getLastRow();
  assert.match(ctx.closeEvent('token',id,'ดำเนินการครบแล้ว',1),/ปิดเหตุการณ์/);
  assert.equal(sheet.getLastRow(),rowsBefore);
  assert.equal(sheet.rows[1][31],2);
  assert.equal(sheet.rows[1][38],'CLOSED');
  assert.ok(sheet.rows[1][41] instanceof Date);
  assert.equal(sheet.rows[1][42],'admin@example.test');
  assert.equal(sheet.rows[1][43],'ดำเนินการครบแล้ว');
  assert.equal(audits[0][1],'CLOSE_EVENT');

  assert.match(ctx.reopenEvent('token',id,2),/เปิดเหตุการณ์อีกครั้ง/);
  assert.equal(sheet.getLastRow(),rowsBefore);
  assert.equal(sheet.rows[1][31],3);
  assert.equal(sheet.rows[1][38],'IN_PROGRESS');
  assert.equal(sheet.rows[1][41],'');
  assert.equal(sheet.rows[1][42],'');
  assert.equal(sheet.rows[1][43],'');
  assert.equal(audits[1][1],'REOPEN_EVENT');
});

test('closed Event blocks normal update while void remains a separate disposition',()=>{
  assert.match(source,/currentWorkflow === 'CLOSED'/);
  assert.match(source,/setValue\('VOID'\)/);
  assert.match(source,/function closeEvent\(/);
  assert.match(source,/function reopenEvent\(/);
});

test('browser exposes owner and lifecycle controls without adding a task subsystem',()=>{
  assert.match(html,/ผู้รับผิดชอบหลัก/);
  assert.match(html,/closeEventUi/);
  assert.match(html,/reopenEventUi/);
  assert.match(html,/consistencyWarnings/);
  assert.doesNotMatch(html,/taskId|TaskID|SLA|escalation/i);
});
