import {nativeServer,nativeHtml,nativeBrowser} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = nativeServer;
const html = nativeHtml;

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
  constructor(rows,maxCols=39){
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
  const r=Array(39).fill('');
  r[1]='2569-10-06';
  r[30]='11111111-1111-4111-8111-111111111111';
  r[31]=1;r[32]='active';
  return r;
}


test('P3 schema appends workflow metadata after the P1 prefix',()=>{
  const ctx=makeContext();
  assert.equal(ctx.MAIN_HEADERS.length,30);
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,38);
  assert.deepEqual(Array.from(ctx.EVENT_META_HEADERS),[
    'EventID','Revision','RecordStatus','CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason'
  ]);
  assert.equal(ctx.EVENT_OWNER_HEADER,'OwnerUserID');
  assert.equal(ctx.EVENT_OWNER_COL,39);
  assert.equal(ctx.EVENT_META_COL.RECORD_STATUS,33);
  assert.equal(ctx.EVENT_META_COL.VOID_REASON,38);
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.includes('WorkflowStatus'),false);
});

test('workflow derivation stays lightweight and distinguishes void/closed/progress/open',()=>{
  const ctx=makeContext();
  const code=o=>ctx.deriveEventLifecycle_(o).code;
  assert.equal(code({recordStatus:'void',col26:'2026-10-06'}),'voided');
  assert.equal(code({recordStatus:'closed',col17:'เข้าเกณฑ์'}),'closed');
  assert.equal(code({recordStatus:'active',col17:'เข้าเกณฑ์',col26:'2026-10-06'}),'investigated');
  assert.equal(code({recordStatus:'active',col17:'เข้าเกณฑ์'}),'investigation_required');
  assert.equal(code({recordStatus:'active',col17:'ไม่เข้าเกณฑ์'}),'criteria_not_met');
  assert.equal(code({recordStatus:'active',col17:'รอดำเนินการ'}),'criteria_pending');
  assert.equal(code({recordStatus:'active',col15:'รอตรวจสอบ'}),'verification_pending');
  assert.equal(code({recordStatus:'active'}),'received');
  assert.equal(code({recordStatus:'active',closedAt:'2026-10-06'}),'received');
});

test('consistency rules warn rather than hard-fail normal SRRT field combinations',()=>{
  const ctx=makeContext();
  const evidence={col17:'ไม่เข้าเกณฑ์',col24:'ลงสอบสวน',col26:'2569-10-06',col21:'',col22:'2569-10-06'};
  const result=ctx.deriveEventConsistencyWarnings_(evidence);
  assert.equal(result.length,3);
  assert.deepEqual(Array.from(result,x=>x.code).sort(),[
    'CRITERIA_NOT_MET_BUT_INVESTIGATED','INVESTIGATION_FLAG_WITHOUT_CRITERIA','MEASURES_DATE_WITHOUT_DETAILS'
  ].sort());
  assert.ok(result.every(x=>typeof x.message==='string'&&x.message.trim()));
  assert.deepEqual(Array.from(ctx.deriveEventConsistencyWarnings_({recordStatus:'void',...evidence})),[]);
  assert.deepEqual(Array.from(ctx.deriveEventConsistencyWarnings_({col17:'เข้าเกณฑ์',col24:'ลงสอบสวน',col26:'2569-10-06'})),[]);
});

test('workflow migration initializes blank status idempotently',()=>{
  const ctx=makeContext();
  const validHeaders=[...Array.from(ctx.MAIN_SCHEMA_HEADERS),ctx.EVENT_OWNER_HEADER];
  const ss={getSheetByName:()=>sheet};
  const sheet=new FakeSheet([validHeaders,row()],39);
  const before=JSON.stringify(sheet.rows);
  assert.equal(ctx.ensureEventOwnerSchema_(ss),sheet);
  assert.equal(ctx.ensureEventOwnerSchema_(ss),sheet);
  assert.equal(JSON.stringify(sheet.rows),before);
  assert.equal(sheet.rows[0][38],'OwnerUserID');
  // Schema v4 WorkflowStatus must never be reinterpreted as a v7 OwnerUserID.
  sheet.rows[0][38]='WorkflowStatus';
  assert.throws(()=>ctx.ensureEventOwnerSchema_(ss),/คอลัมน์ 39/);
  sheet.rows[0][38]='';
  sheet.rows[1][38]='IN_PROGRESS';
  assert.throws(()=>ctx.ensureEventOwnerSchema_(ss),/มีข้อมูลเดิม/);
});

test('active owner lookup accepts active users and rejects inactive users',()=>{
  const ctx=makeContext();
  const users=new FakeSheet([
    ['UserID','Name','Email','PasswordHash','Role','Status'],
    ['u-active','Active User','active@example.test','','Admin','active'],
    ['u-blocked','Blocked User','blocked@example.test','','Admin','blocked'],
    ['u-staff','Staff User','staff@example.test','','Staff','active']
  ],14);
  ctx.getSheet_=name=>{assert.equal(name,ctx.CONFIG.SHEETS.USERS);return users;};
  const checks=[];
  ctx.requireAuth_=(_token,perm)=>{checks.push(perm);return {email:'manager@example.test',role:'Manager'};};
  const result=ctx.listAssignableEventOwners('token');
  assert.equal(result.length,1);
  assert.equal(result[0].userId,'u-active');
  assert.equal(result[0].status,'active');
  assert.equal(ctx.findUserById_('u-blocked').status,'blocked');
  assert.equal(ctx.findUserById_('missing'),null);
  assert.deepEqual(checks,['assign']);
  ctx.requireAuth_=()=>{throw Error('permission denied');};
  assert.throws(()=>ctx.listAssignableEventOwners('token'),/permission denied/);
});

test('close and reopen preserve the row, increment revision and audit lifecycle actions',()=>{
  const ctx=makeContext();
  const r=row();r[16]='เข้าเกณฑ์';
  const sheet=new FakeSheet([Array(39).fill(''),r],39);
  const audits=[],perm=[];
  ctx.requireAuth_=(_token,p)=>{perm.push(p);return {email:'manager@example.test',role:'Manager'};};
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...a)=>audits.push(a);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  const id=r[30],rowsBefore=sheet.getLastRow();
  assert.match(ctx.closeEvent('token',id,'ดำเนินการครบแล้ว',1),/ปิดเหตุการณ์/);
  assert.equal(sheet.getLastRow(),rowsBefore);
  assert.equal(sheet.rows[1][30],id);
  assert.equal(sheet.rows[1][31],2);
  assert.equal(sheet.rows[1][32],'closed');
  assert.equal(sheet.rows[1][38],'');
  assert.equal(audits[0][1],'CLOSE_EVENT');
  assert.equal(audits[0][3],id);
  assert.equal(JSON.parse(audits[0][5]).reason,'ดำเนินการครบแล้ว');
  assert.match(ctx.reopenEvent('token',id,'พบข้อมูลต้องแก้ไข',2),/เปิดเหตุการณ์อีกครั้ง/);
  assert.equal(sheet.getLastRow(),rowsBefore);
  assert.equal(sheet.rows[1][30],id);
  assert.equal(sheet.rows[1][31],3);
  assert.equal(sheet.rows[1][32],'active');
  assert.equal(audits[1][1],'REOPEN_EVENT');
  assert.equal(JSON.parse(audits[1][5]).reason,'พบข้อมูลต้องแก้ไข');
  assert.deepEqual(perm,['close_event','close_event']);
  assert.equal(audits.length,2);
});

test('closed Event blocks normal update while void remains a separate disposition',()=>{
  const ctx=makeContext(),r=row(),sheet=new FakeSheet([Array(39).fill(''),r],39),audit=[];
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.requireAuth_=(_token,permission)=>({email:'manager@example.test',role:'Manager'});
  ctx.writeAudit_=(...a)=>audit.push(a);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  const id=r[30];
  assert.throws(()=>ctx.reopenEvent('token',id,'',1),/กรุณาระบุเหตุผล/);
  assert.throws(()=>ctx.closeEvent('token',id,'',1),/กรุณาระบุเหตุผล/);
  assert.throws(()=>ctx.closeEvent('token',id,'reason',2),/ถูกแก้ไขจากผู้ใช้อื่น/);
  assert.equal(sheet.rows[1][31],1);
  assert.match(ctx.closeEvent('token',id,'close reason',1),/ปิดเหตุการณ์/);
  assert.throws(()=>ctx.updateRecord('token',id,{col6:'should not change'},2),/เหตุการณ์นี้ถูกปิดแล้ว/);
  assert.equal(sheet.rows[1][5],'');
  assert.match(ctx.deleteRecord('token',id,'void reason',2),/ยกเลิก/);
  assert.equal(sheet.rows[1][32],'void');
  assert.equal(sheet.rows[1][31],3);
  assert.equal(sheet.rows[1][37],'void reason');
  assert.throws(()=>ctx.reopenEvent('token',id,'try to reopen void',3),/ถูกยกเลิกแล้ว/);
  assert.equal(audit.length,2);
  assert.deepEqual(Array.from(audit,a=>a[1]),['CLOSE_EVENT','VOID_RECORD']);
});

test('browser exposes owner and lifecycle controls without adding a task subsystem',()=>{
  assert.match(html,/ผู้รับผิดชอบหลัก/);
  assert.match(html,/openOwnerModal/);
  assert.match(html,/assignEventOwner/);
  assert.match(html,/closeEventFlow/);
  assert.match(html,/reopenEventFlow/);
  assert.match(html,/consistencyWarningBadge/);
  assert.match(html,/roleCanManage\(\)/);
  assert.match(html,/if\(status==='closed'\)/);
  assert.doesNotMatch(source,/function\s+(?:create|save|update|delete)Task\s*\(/i);
  assert.doesNotMatch(source,/['"]TaskID['"]|['"]SLA['"]|['"]Escalation['"]/);
});

test('P3 owner assignment obeys assign permission, active/editable account, Revision and audit',()=>{
  const ctx=makeContext(),r=row(),id=r[30],s=new FakeSheet([[...ctx.MAIN_SCHEMA_HEADERS,ctx.EVENT_OWNER_HEADER],r],39);
  const users=new FakeSheet([
    ['UserID','Name','Email','PasswordHash','Role','Status'],
    ['u-active','Active','a@example.test','','Admin','active'],
    ['u-block','Blocked','b@example.test','','Admin','blocked'],
    ['u-staff','Staff','s@example.test','','Staff','active']
  ],14);
  const ss={getSheetByName:name=>name===ctx.CONFIG.SHEETS.MAIN?s:null};
  const audit=[],perms=[];
  ctx.getDb_=()=>ss;
  ctx.getSheetByIdOrName_=()=>s;
  ctx.getSheet_=name=>{assert.equal(name,ctx.CONFIG.SHEETS.USERS);return users;};
  ctx.requireAuth_=(_token,perm)=>{perms.push(perm);return {email:'manager@example.test',role:'Manager'};};
  ctx.hasPermission_=(role,permission)=>role==='Admin'&&permission==='edit';
  ctx.writeAudit_=(...args)=>audit.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  assert.throws(()=>ctx.assignEventOwner('token',id,'u-block',1),/active/);
  assert.throws(()=>ctx.assignEventOwner('token',id,'u-staff',1),/ไม่มีสิทธิ์/);
  assert.throws(()=>ctx.assignEventOwner('token',id,'u-active',2),/ถูกแก้ไขจากผู้ใช้อื่น/);
  assert.equal(s.rows[1][38],'');
  assert.equal(s.rows[1][31],1);
  assert.match(ctx.assignEventOwner('token',id,'u-active',1),/กำหนดผู้รับผิดชอบ/);
  assert.equal(s.rows[1][38],'u-active');
  assert.equal(s.rows[1][31],2);
  assert.equal(audit.length,1);
  assert.equal(audit[0][1],'ASSIGN_EVENT_OWNER');
  assert.equal(audit[0][3],id);
  assert.equal(JSON.parse(audit[0][5]).ownerUserId,'u-active');
  assert.match(ctx.assignEventOwner('token',id,'u-active',2),/ไม่เปลี่ยนแปลง/);
  assert.equal(s.rows[1][31],2);
  assert.equal(audit.length,1);
  assert.deepEqual(perms,['assign','assign','assign','assign','assign']);
});
test('P3 owner assignment cannot mutate a closed Event or bypass denied assign authorization',()=>{
  const ctx=makeContext(),r=row(),id=r[30];r[32]='closed';
  const s=new FakeSheet([[...ctx.MAIN_SCHEMA_HEADERS,ctx.EVENT_OWNER_HEADER],r],39);
  ctx.getDb_=()=>({getSheetByName:()=>s});
  ctx.getSheetByIdOrName_=()=>s;
  ctx.findUserById_=()=>({name:'Test',role:'Admin',status:'active'});
  ctx.hasPermission_=()=>true;
  ctx.requireAuth_=()=>{throw Error('assign forbidden');};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  assert.throws(()=>ctx.assignEventOwner('token',id,'u-active',1),/assign forbidden/);
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  assert.throws(()=>ctx.assignEventOwner('token',id,'u-active',1),/ถูกปิดแล้ว/);
  assert.equal(s.rows[1][31],1);
  assert.equal(s.rows[1][38],'');
});
test('P3 close/reopen require exact management permission and reject stale writes',()=>{
  const ctx=makeContext(),r=row(),id=r[30],sheet=new FakeSheet([Array(39).fill(''),r],39),audit=[];
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...args)=>audit.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  ctx.requireAuth_=(_token,perm)=>{assert.equal(perm,'close_event');throw Error('close_event forbidden');};
  assert.throws(()=>ctx.closeEvent('token',id,'reason',1),/close_event forbidden/);
  assert.throws(()=>ctx.reopenEvent('token',id,'reason',1),/close_event forbidden/);
  ctx.requireAuth_=(_token,perm)=>{assert.equal(perm,'close_event');return {email:'manager@example.test',role:'Manager'};};
  assert.throws(()=>ctx.closeEvent('token',id,'reason',2),/ถูกแก้ไขจากผู้ใช้อื่น/);
  assert.equal(sheet.rows[1][31],1);
  assert.match(ctx.closeEvent('token',id,'reason',1),/ปิดเหตุการณ์/);
  assert.throws(()=>ctx.reopenEvent('token',id,'reopen reason',1),/ถูกแก้ไขจากผู้ใช้อื่น/);
  assert.equal(sheet.rows[1][31],2);
  assert.equal(sheet.rows[1][32],'closed');
  assert.equal(audit.length,1);
});
