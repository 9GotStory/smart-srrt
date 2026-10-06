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
  constructor(rows,maxCols=38){this.maxCols=maxCols;this.rows=rows.map(r=>[...r])}
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getLastRow(){return this.rows.length}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
  appendRow(row){this.rows.push([...row]);this.maxCols=Math.max(this.maxCols,row.length)}
}
class FakeSpreadsheet {
  constructor(sheet){this.sheet=sheet}
  getSheetByName(){return this.sheet}
  insertSheet(){return this.sheet}
}

function makeContext(){
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(context);vm.runInContext(source,context);return context;
}

function eventRow(){
  const row=Array(39).fill('');
  row[1]='2569-10-06';
  row[30]='33333333-3333-4333-8333-333333333333';
  row[31]=4;
  row[32]='active';
  return row;
}

test('G-05 schema is additive at column 39 and bumps schema version to 3',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'3');
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,38);
  assert.equal(ctx.EVENT_OWNER_COL,39);
  assert.equal(ctx.EVENT_OWNER_HEADER,'OwnerUserID');
});

test('G-05 schema migration claims a clean column 39 idempotently',()=>{
  const ctx=makeContext();
  const header=Array(38).fill('');
  for(let i=0;i<ctx.MAIN_SCHEMA_HEADERS.length;i++)header[i]=ctx.MAIN_SCHEMA_HEADERS[i];
  const sheet=new FakeSheet([header,eventRow()],38);
  const ss=new FakeSpreadsheet(sheet);

  ctx.ensureEventOwnerSchema_(ss);
  assert.equal(sheet.getMaxColumns(),39);
  assert.equal(sheet.rows[0][38],'OwnerUserID');
  assert.equal(sheet.rows[1][38],'');

  ctx.ensureEventOwnerSchema_(ss);
  assert.equal(sheet.rows[0][38],'OwnerUserID');
});

test('G-05 schema migration refuses conflicting header or hidden existing data',()=>{
  const ctx=makeContext();

  const h1=Array(39).fill('');
  for(let i=0;i<ctx.MAIN_SCHEMA_HEADERS.length;i++)h1[i]=ctx.MAIN_SCHEMA_HEADERS[i];
  h1[38]='CustomColumn';
  const conflictHeader=new FakeSheet([h1,eventRow()],39);
  assert.throws(()=>ctx.ensureEventOwnerSchema_(new FakeSpreadsheet(conflictHeader)),/ถูกใช้งานด้วยหัวข้อ/);

  const h2=Array(39).fill('');
  for(let i=0;i<ctx.MAIN_SCHEMA_HEADERS.length;i++)h2[i]=ctx.MAIN_SCHEMA_HEADERS[i];
  const r2=eventRow();r2[38]='legacy custom value';
  const conflictData=new FakeSheet([h2,r2],39);
  assert.throws(()=>ctx.ensureEventOwnerSchema_(new FakeSpreadsheet(conflictData)),/มีข้อมูลเดิม/);
});

test('rowToObject exposes OwnerUserID as authenticated row metadata',()=>{
  const ctx=makeContext();
  const row=eventRow();
  row[38]='44444444-4444-4444-8444-444444444444';
  const obj=ctx.rowToObject_(row);
  assert.equal(obj.ownerUserId,'44444444-4444-4444-8444-444444444444');
});

test('owner enrichment resolves current account details without duplicating them in MainData',()=>{
  const ctx=makeContext();
  ctx.getUserDirectoryById_=()=>({
    '44444444-4444-4444-8444-444444444444':{
      userId:'44444444-4444-4444-8444-444444444444',
      name:'ผู้รับผิดชอบ',
      email:'owner@example.test',
      role:'Admin',
      status:'active',
      org:'หน่วยงานทดสอบ'
    }
  });
  const rows=[{ownerUserId:'44444444-4444-4444-8444-444444444444'}];
  const out=ctx.enrichEventOwners_(rows);
  assert.equal(out[0].ownerName,'ผู้รับผิดชอบ');
  assert.equal(out[0].ownerEmail,'owner@example.test');
  assert.equal(out[0].ownerRole,'Admin');
  assert.equal(out[0].ownerStatus,'active');
  assert.equal(out[0].ownerOrg,'หน่วยงานทดสอบ');
  assert.equal(out[0].ownerMissing,false);
});

test('assignable owner list includes only active users with edit permission',()=>{
  const ctx=makeContext();
  const values=[
    ['UserID','Name','Email','Hash','Role','Status','Org'],
    ['1','Manager','m@example.test','','Manager','active','A'],
    ['2','Admin','a@example.test','','Admin','active','B'],
    ['3','Staff','s@example.test','','Staff','active','C'],
    ['4','Blocked','b@example.test','','Admin','blocked','D']
  ];
  ctx.requireAuth_=()=>({role:'Manager',status:'active'});
  ctx.getSheet_=()=>({getDataRange:()=>({getValues:()=>values})});
  const out=ctx.listAssignableEventOwners('token');
  assert.deepEqual(Array.from(out,u=>u.userId).sort(),['1','2']);
});

test('assignEventOwner is revision-safe, audited, and increments Event Revision',()=>{
  const ctx=makeContext();
  const header=Array(39).fill('');
  const row=eventRow();
  const sheet=new FakeSheet([header,row],39);
  const audits=[];

  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.findUserById_=()=>({userId:'44444444-4444-4444-8444-444444444444',name:'Owner',role:'Admin',status:'active'});
  ctx.getDb_=()=>({});
  ctx.ensureEventOwnerSchema_=()=>sheet;
  ctx.findEventRowById_=()=>2;
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const msg=ctx.assignEventOwner('token','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444',4);
  assert.match(msg,/กำหนดผู้รับผิดชอบ/);
  assert.equal(sheet.rows[1][38],'44444444-4444-4444-8444-444444444444');
  assert.equal(sheet.rows[1][31],5);
  assert.equal(sheet.rows[1][26],'manager@example.test');
  assert.ok(sheet.rows[1][27] instanceof Date);
  assert.equal(audits[0][1],'ASSIGN_EVENT_OWNER');
  assert.equal(audits[0][3],'33333333-3333-4333-8333-333333333333');
});

test('assignEventOwner rejects stale revision before modifying ownership',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array(39).fill(''),eventRow()],39);
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.findUserById_=()=>({userId:'4',name:'Owner',role:'Admin',status:'active'});
  ctx.getDb_=()=>({});
  ctx.ensureEventOwnerSchema_=()=>sheet;
  ctx.findEventRowById_=()=>2;
  ctx.writeAudit_=()=>{};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  assert.throws(()=>ctx.assignEventOwner('token','33333333-3333-4333-8333-333333333333','4',3),/ถูกแก้ไขจากผู้ใช้อื่นแล้ว/);
  assert.equal(sheet.rows[1][38],'');
  assert.equal(sheet.rows[1][31],4);
});

test('assignment permission is manager-level and respects system closed state',()=>{
  const ctx=makeContext();
  assert.equal(ctx.hasPermission_('Super Admin','assign'),true);
  assert.equal(ctx.hasPermission_('Manager','assign'),true);
  assert.equal(ctx.hasPermission_('Admin','assign'),false);
  assert.equal(ctx.hasPermission_('Staff','assign'),false);
  assert.match(source,/\['create','edit','delete','report','assign'\]/);
});

test('G-05 browser exposes owner read-only and manager assignment controls',()=>{
  assert.match(html,/id="ownerModal"/);
  assert.match(html,/function openOwnerModal\(i\)/);
  assert.match(html,/function saveEventOwner\(\)/);
  assert.match(html,/listAssignableEventOwners/);
  assert.match(html,/assignEventOwner/);
  assert.match(html,/<th>ผู้รับผิดชอบ<\/th>/);
  assert.match(html,/roleCanManage\(\)\?[^\n]*openOwnerModal/);
});
