import {nativeServer,nativeHtml,nativeBrowser} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = nativeServer;
const html = nativeHtml;

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){this.sheet=sheet;this.row=row;this.col=col;this.numRows=numRows;this.numCols=numCols}
  _ensure(){
    const need=this.row-1+this.numRows;
    while(this.sheet.rows.length<need)this.sheet.rows.push([]);
    for(const r of this.sheet.rows)while(r.length<this.sheet.maxCols)r.push('');
  }
  getValues(){this._ensure();return Array.from({length:this.numRows},(_,ri)=>Array.from({length:this.numCols},(_,ci)=>this.sheet.rows[this.row-1+ri]?.[this.col-1+ci]??''))}
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>v instanceof Date?v.toISOString():String(v??'')))}
  getValue(){return this.getValues()[0][0]}
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this}
  setValues(values){this._ensure();for(let ri=0;ri<this.numRows;ri++)for(let ci=0;ci<this.numCols;ci++)this.sheet.rows[this.row-1+ri][this.col-1+ci]=values[ri][ci];return this}
}
class FakeSheet {
  constructor(rows,maxCols=39){this.maxCols=maxCols;this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x})}
  getLastRow(){return this.rows.length}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
}

function makeContext(){
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite,Utilities:{getUuid:()=> '99999999-9999-4999-8999-999999999999'}};
  vm.createContext(context);vm.runInContext(source,context);return context;
}
function eventRow(status='active',revision=1){
  const row=Array(39).fill('');
  row[1]='2569-10-06';
  row[30]='55555555-5555-4555-8555-555555555555';
  row[31]=revision;
  row[32]=status;
  return row;
}

test('G-19 extends RecordStatus validation with closed without schema expansion',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array(39).fill(''),eventRow('closed',1)],39);
  const summary=ctx.ensureEventIdentityData_(sheet);
  assert.equal(summary.backfilledIds,0);
  assert.equal(summary.initializedRevision,0);
  assert.equal(summary.initializedStatus,0);
  assert.ok(Number(ctx.CONFIG.SCHEMA_VERSION) >= 3);
  assert.equal(ctx.EVENT_OWNER_COL,39);
});

test('G-19 lifecycle treats closed as an explicit operational state',()=>{
  const ctx=makeContext();
  assert.equal(ctx.deriveEventLifecycle_({recordStatus:'closed',col26:'2569-10-06'}).code,'closed');
  assert.equal(ctx.deriveEventLifecycle_({recordStatus:'closed',col26:'2569-10-06'}).label,'ปิดเหตุการณ์แล้ว');
  assert.equal(ctx.deriveEventLifecycle_({recordStatus:'void',col26:'2569-10-06'}).code,'voided');
});

test('closeEvent transitions active to closed, increments revision and audits reason',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array(39).fill(''),eventRow('active',4)],39);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.findEventRowById_=()=>2;
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const msg=ctx.closeEvent('token','55555555-5555-4555-8555-555555555555','ดำเนินการครบถ้วน',4);

  assert.match(msg,/ปิดเหตุการณ์เรียบร้อยแล้ว/);
  assert.equal(sheet.rows[1][32],'closed');
  assert.equal(sheet.rows[1][31],5);
  assert.equal(sheet.rows[1][26],'manager@example.test');
  assert.ok(sheet.rows[1][27] instanceof Date);
  assert.equal(audits[0][1],'CLOSE_EVENT');
  assert.match(audits[0][5],/ดำเนินการครบถ้วน/);
});

test('reopenEvent transitions closed to active, increments revision and audits reason',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array(39).fill(''),eventRow('closed',5)],39);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.findEventRowById_=()=>2;
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const msg=ctx.reopenEvent('token','55555555-5555-4555-8555-555555555555','มีข้อมูลใหม่ต้องตรวจสอบ',5);

  assert.match(msg,/เปิดเหตุการณ์อีกครั้งเรียบร้อยแล้ว/);
  assert.equal(sheet.rows[1][32],'active');
  assert.equal(sheet.rows[1][31],6);
  assert.equal(audits[0][1],'REOPEN_EVENT');
  assert.match(audits[0][5],/มีข้อมูลใหม่ต้องตรวจสอบ/);
});

test('close and reopen both require a nonblank reason and expected revision',()=>{
  const ctx=makeContext();
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  assert.throws(()=>ctx.closeEvent('token','id','',1),/เหตุผลในการปิดเหตุการณ์/);
  assert.throws(()=>ctx.reopenEvent('token','id','',1),/เหตุผลในการเปิดเหตุการณ์อีกครั้ง/);
  assert.throws(()=>ctx.closeEvent('token','id','เหตุผล'),/ไม่พบ Revision/);
  assert.throws(()=>ctx.reopenEvent('token','id','เหตุผล'),/ไม่พบ Revision/);
});

test('close/reopen reject stale revision even when target state already matches',()=>{
  const ctx=makeContext();
  const closedSheet=new FakeSheet([Array(39).fill(''),eventRow('closed',7)],39);
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.getSheetByIdOrName_=()=>closedSheet;
  ctx.findEventRowById_=()=>2;
  ctx.writeAudit_=()=>{};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  assert.throws(
    ()=>ctx.closeEvent('token','55555555-5555-4555-8555-555555555555','เหตุผล',6),
    /ถูกแก้ไขจากผู้ใช้อื่นแล้ว/
  );

  const activeSheet=new FakeSheet([Array(39).fill(''),eventRow('active',9)],39);
  ctx.getSheetByIdOrName_=()=>activeSheet;
  assert.throws(
    ()=>ctx.reopenEvent('token','55555555-5555-4555-8555-555555555555','เหตุผล',8),
    /ถูกแก้ไขจากผู้ใช้อื่นแล้ว/
  );
});

test('closed events reject normal edit and owner reassignment server-side',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array(39).fill(''),eventRow('closed',3)],39);
  ctx.requireAuth_=(_token,action)=>({email:'manager@example.test',role:'Manager',status:'active',action});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.getDb_=()=>({});
  ctx.ensureEventOwnerSchema_=()=>sheet;
  ctx.findEventRowById_=()=>2;
  ctx.findUserById_=()=>({userId:'1',name:'Owner',role:'Admin',status:'active'});
  ctx.writeAudit_=()=>{};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  assert.throws(
    ()=>ctx.updateRecord('token','55555555-5555-4555-8555-555555555555',{col2:'2569-10-07'},3),
    /ถูกปิดแล้ว/
  );
  assert.throws(
    ()=>ctx.assignEventOwner('token','55555555-5555-4555-8555-555555555555','1',3),
    /ถูกปิดแล้ว/
  );
});

test('G-19 uses a dedicated manager-level permission and system-close mutation guard',()=>{
  const ctx=makeContext();
  assert.equal(ctx.hasPermission_('Super Admin','close_event'),true);
  assert.equal(ctx.hasPermission_('Manager','close_event'),true);
  assert.equal(ctx.hasPermission_('Admin','close_event'),false);
  assert.equal(ctx.hasPermission_('Staff','close_event'),false);
  assert.match(source,/\['create','edit','delete','report','assign','close_event'\]/);
});

test('closed Events remain in normal datasets while void Events remain excluded',()=>{
  const block=source.match(/function getFilteredEventRows_[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(block,/recordStatus \|\| 'active'\)\.toLowerCase\(\) !== 'void'/);
  assert.doesNotMatch(block,/!== 'closed'/);
});

test('AI report lookup remains allowed for closed Events',()=>{
  const reportBlock=source.match(/function generateReportFromWeb[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(reportBlock,/findEventRowById_\(sheet, eventId, false\)/);
  assert.doesNotMatch(reportBlock,/status === 'closed'/);
});

test('G-19 browser exposes separate close, reopen and void controls',()=>{
  assert.match(html,/function closeEventFlow\(eventId,revision\)/);
  assert.match(html,/function reopenEventFlow\(eventId,revision\)/);
  assert.match(html,/gs\('closeEvent'/);
  assert.match(html,/gs\('reopenEvent'/);
  assert.match(html,/ปิดเหตุการณ์/);
  assert.match(html,/เปิดใหม่/);
  assert.match(html,/deleteEvent/);
  assert.match(html,/status==='closed'/);
});
