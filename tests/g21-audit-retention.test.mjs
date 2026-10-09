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
    const needed=this.row-1+this.numRows;
    while(this.sheet.rows.length<needed)this.sheet.rows.push([]);
    for(const r of this.sheet.rows)while(r.length<this.sheet.maxCols)r.push('');
  }
  getValues(){
    this._ensure();
    return Array.from({length:this.numRows},(_,ri)=>Array.from({length:this.numCols},(_,ci)=>this.sheet.rows[this.row-1+ri]?.[this.col-1+ci]??''));
  }
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>v instanceof Date?v.toISOString():String(v??'')))}
  getValue(){return this.getValues()[0][0]}
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this}
  setValues(values){
    this._ensure();
    for(let ri=0;ri<this.numRows;ri++)for(let ci=0;ci<this.numCols;ci++)this.sheet.rows[this.row-1+ri][this.col-1+ci]=values[ri][ci];
    return this;
  }
  setFontWeight(){return this}
}
class FakeSheet {
  constructor(rows=[],maxCols=10,name='AuditLogs'){
    this.maxCols=maxCols;this.name=name;
    this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x});
  }
  getName(){return this.name}
  setName(v){this.name=v;return this}
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getLastRow(){return this.rows.length}
  getLastColumn(){return this.maxCols}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
  appendRow(row){const x=[...row];this.maxCols=Math.max(this.maxCols,x.length);while(x.length<this.maxCols)x.push('');this.rows.push(x);return this}
  deleteRows(start,count){this.rows.splice(start-1,count)}
  setFrozenRows(){return this}
}
class FakeSpreadsheet {
  constructor(sheets=[]){this.sheets=sheets;this.id='archive-spreadsheet-id';this.name='DB'}
  getSheetByName(name){return this.sheets.find(s=>s.name===name)||null}
  insertSheet(name){const s=new FakeSheet([],26,name);this.sheets.push(s);return s}
  getSheets(){return this.sheets}
  getId(){return this.id}
  getName(){return this.name}
}

function makeContext(){
  let seq=0;
  const context={
    console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite,
    Utilities:{
      getUuid:()=> {
        seq++;
        return `aaaaaaaa-aaaa-4aaa-8aaa-${String(seq).padStart(12,'0')}`;
      },
      formatDate:(d,_tz,fmt)=>{
        const date=d instanceof Date?d:new Date(d);
        if(fmt==='yyyy')return String(date.getUTCFullYear());
        return date.toISOString().replace('T',' ').slice(0,19);
      }
    },
    Session:{
      getScriptTimeZone:()=> 'UTC',
      getActiveUser:()=>({getEmail:()=> 'manager@example.test'})
    }
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context;
}
function auditHeader9(){return ['Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint']}
function auditHeader10(){return [...auditHeader9(),'AuditID']}
function auditRow(ts,id=''){
  return [ts,'user@example.test','Manager','UPDATE_RECORD','MainData','event-1','','','',''+id];
}

test('G-21 schema v5 appends AuditID without changing prior audit columns',()=>{
  const ctx=makeContext();
  assert.ok(Number(ctx.CONFIG.SCHEMA_VERSION) >= 5);
  assert.equal(ctx.CONFIG.DEFAULT_AUDIT_RETENTION_DAYS,365);
  assert.deepEqual(Array.from(ctx.AUDIT_HEADERS),[
    'Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint','AuditID'
  ]);
  assert.equal(ctx.AUDIT_COL.AUDIT_ID,10);
});

test('ensureAuditSchema backfills legacy AuditID idempotently',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([
    auditHeader9(),
    auditRow(new Date('2025-01-01T00:00:00Z')).slice(0,9),
    auditRow(new Date('2025-02-01T00:00:00Z')).slice(0,9)
  ],9);
  const ss={getSheetByName:()=>sheet,insertSheet:()=>{throw new Error('unexpected')}};

  const first=ctx.ensureAuditSchema_(ss);
  assert.equal(sheet.getMaxColumns(),10);
  assert.equal(sheet.rows[0][9],'AuditID');
  assert.equal(first.rows,2);
  assert.equal(first.backfilledIds,2);
  assert.match(sheet.rows[1][9],/^[0-9a-f-]{36}$/);
  const ids=[sheet.rows[1][9],sheet.rows[2][9]];

  const second=ctx.ensureAuditSchema_(ss);
  assert.equal(second.backfilledIds,0);
  assert.deepEqual([sheet.rows[1][9],sheet.rows[2][9]],ids);
});

test('ensureAuditSchema rejects malformed or duplicate existing AuditID',()=>{
  const ctx=makeContext();

  const malformed=new FakeSheet([
    auditHeader10(),
    auditRow(new Date('2025-01-01T00:00:00Z'),'not-a-uuid')
  ],10);
  assert.throws(()=>ctx.ensureAuditSchema_({getSheetByName:()=>malformed}),/AuditID ไม่ถูกต้อง/);

  const id='11111111-1111-4111-8111-111111111111';
  const duplicate=new FakeSheet([
    auditHeader10(),
    auditRow(new Date('2025-01-01T00:00:00Z'),id),
    auditRow(new Date('2025-02-01T00:00:00Z'),id)
  ],10);
  assert.throws(()=>ctx.ensureAuditSchema_({getSheetByName:()=>duplicate}),/AuditID ซ้ำ/);
});

test('ensureAuditSchema refuses header conflicts instead of reinterpreting data',()=>{
  const ctx=makeContext();
  const header=auditHeader10();header[4]='CustomTarget';
  const sheet=new FakeSheet([header,auditRow(new Date('2025-01-01T00:00:00Z'),'11111111-1111-4111-8111-111111111111')],10);
  assert.throws(()=>ctx.ensureAuditSchema_({getSheetByName:()=>sheet}),/ใช้หัวข้อ/);
});

test('writeAudit appends immutable AuditID as column 10',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([auditHeader10()],10);
  ctx.getSheet_=()=>sheet;

  ctx.writeAudit_(
    {email:'manager@example.test',role:'Manager'},
    'TEST_ACTION','MainData','event-1','','{}'
  );

  assert.equal(sheet.rows.length,2);
  assert.equal(sheet.rows[1][1],'manager@example.test');
  assert.equal(sheet.rows[1][3],'TEST_ACTION');
  assert.match(sheet.rows[1][9],/^[0-9a-f-]{36}$/);
});

test('retention days defaults to 365 and is bounded to 90..3650',()=>{
  const ctx=makeContext();

  ctx.getSettingsMap_=()=>({});
  assert.equal(ctx.getAuditRetentionDays_(),365);

  ctx.getSettingsMap_=()=>({AUDIT_RETENTION_DAYS:'1'});
  assert.equal(ctx.getAuditRetentionDays_(),90);

  ctx.getSettingsMap_=()=>({AUDIT_RETENTION_DAYS:'99999'});
  assert.equal(ctx.getAuditRetentionDays_(),3650);

  ctx.getSettingsMap_=()=>({AUDIT_RETENTION_DAYS:'730'});
  assert.equal(ctx.getAuditRetentionDays_(),730);
});

test('retention status counts only parseable rows older than cutoff and preserves malformed timestamps',()=>{
  const ctx=makeContext();
  const now=Date.now();
  const old=new Date(now-400*24*60*60*1000);
  const recent=new Date(now-10*24*60*60*1000);
  const sheet=new FakeSheet([
    auditHeader10(),
    auditRow(old,'11111111-1111-4111-8111-111111111111'),
    auditRow(recent,'22222222-2222-4222-8222-222222222222'),
    auditRow('not-a-date','33333333-3333-4333-8333-333333333333')
  ],10);

  ctx.requireAuth_=()=>({role:'Manager'});
  ctx.getDb_=()=>({});
  ctx.ensureAuditSchema_=()=>({sheet,rows:3,backfilledIds:0});
  ctx.getAuditRetentionDays_=()=>365;
  ctx.getSettingsMap_=()=>({AUDIT_ARCHIVE_SPREADSHEET_ID:'archive-id'});

  const status=ctx.getAuditRetentionStatus('token');
  assert.equal(status.activeRows,3);
  assert.equal(status.eligibleRows,1);
  assert.equal(status.malformedTimestampRows,1);
  assert.equal(status.retentionDays,365);
});

test('archive core copies missing AuditIDs, verifies archive, then deletes verified source rows',()=>{
  const ctx=makeContext();
  const now=Date.now();
  const old1=new Date(now-500*24*60*60*1000);
  const old2=new Date(now-450*24*60*60*1000);
  const recent=new Date(now-10*24*60*60*1000);
  const id1='11111111-1111-4111-8111-111111111111';
  const id2='22222222-2222-4222-8222-222222222222';
  const id3='33333333-3333-4333-8333-333333333333';
  const sourceSheet=new FakeSheet([
    auditHeader10(),
    auditRow(old1,id1),
    auditRow(old2,id2),
    auditRow(recent,id3),
    auditRow('bad-date','44444444-4444-4444-8444-444444444444')
  ],10);
  const archiveYear=new FakeSheet([
    auditHeader10(),
    auditRow(old1,id1)
  ],10,'Y2025');
  const archiveSs=new FakeSpreadsheet([archiveYear]);
  const audits=[];

  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.getDb_=()=>({});
  ctx.ensureAuditSchema_=()=>({sheet:sourceSheet,rows:4,backfilledIds:0});
  ctx.getAuditRetentionDays_=()=>365;
  ctx.ensureAuditArchiveSpreadsheet_=()=>archiveSs;
  ctx.ensureAuditArchiveYearSheet_=()=>archiveYear;
  ctx.getSheet_=()=>new FakeSheet([['Key','Value','Description','UpdatedAt','UpdatedBy']],5,'SystemSettings');
  ctx.upsertSettingDirect_=()=>{};
  ctx.PropertiesService={getScriptProperties:()=>({setProperty(){}})};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  ctx.writeAudit_=(...args)=>audits.push(args);

  const result=ctx.archiveAuditLogsCore_({email:'manager@example.test',role:'Manager'});
  assert.equal(result.eligibleRows,2);
  assert.equal(result.newlyArchivedRows,1);
  assert.equal(result.removedFromActiveRows,2);
  assert.equal(result.malformedTimestampRows,1);

  const archiveIds=archiveYear.rows.slice(1).map(r=>r[9]).sort();
  assert.deepEqual(archiveIds,[id1,id2].sort());

  const remainingIds=sourceSheet.rows.slice(1).map(r=>r[9]);
  assert.deepEqual(remainingIds,[id3,'44444444-4444-4444-8444-444444444444']);
  assert.equal(audits[0][1],'ARCHIVE_AUDIT_LOGS');
});

test('archive rerun with no eligible rows does not create archive work or delete active rows',()=>{
  const ctx=makeContext();
  const recent=new Date(Date.now()-5*24*60*60*1000);
  const sheet=new FakeSheet([
    auditHeader10(),
    auditRow(recent,'11111111-1111-4111-8111-111111111111')
  ],10);

  ctx.getDb_=()=>({});
  ctx.ensureAuditSchema_=()=>({sheet,rows:1,backfilledIds:0});
  ctx.getAuditRetentionDays_=()=>365;
  ctx.getSettingsMap_=()=>({AUDIT_ARCHIVE_SPREADSHEET_ID:'archive-id'});
  ctx.ensureAuditArchiveSpreadsheet_=()=>{throw new Error('archive should not be opened')};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const result=ctx.archiveAuditLogsCore_({email:'manager@example.test',role:'Manager'});
  assert.equal(result.eligibleRows,0);
  assert.equal(result.removedFromActiveRows,0);
  assert.equal(sheet.rows.length,2);
});

test('archive helper is private and archive operation has no scheduler side effects',()=>{
  const archiveHelper=source.match(/function getAuditArchiveSpreadsheet_[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(archiveHelper,/SpreadsheetApp\.create/);
  assert.match(archiveHelper,/moveTo\(systemFolder\)/);
  assert.doesNotMatch(archiveHelper,/ANYONE_WITH_LINK|setSharing\s*\(/);
  assert.doesNotMatch(source,/ScriptApp\.newTrigger|timeBased\(\)/);
});

test('G-21 migration is schema-floor safe and older migrations remain scoped',()=>{
  const g21=source.match(/function migrateG21AuditRetention[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const g11=source.match(/function migrateG11EventAttachments[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const g05=source.match(/function migrateG05EventOwner[\s\S]*?(?=\nfunction )/)?.[0]??'';

  assert.match(g21,/Math\.max\(existingSchemaVersion, 5\)/);
  assert.match(g11,/Math\.max\(existingSchemaVersion, 4\)/);
  assert.match(g05,/Math\.max\(existingSchemaVersion, 3\)/);
});

test('web settings cannot mutate retention or archive identity through generic settings save',()=>{
  const save=source.match(/function saveSystemSettings[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(save,/AUDIT_ARCHIVE_SPREADSHEET_ID/);
  assert.match(save,/AUDIT_RETENTION_DAYS/);
});

test('Admin UI exposes retention status and explicit archive action only',()=>{
  assert.match(html,/id="auditRetentionStatus"/);
  assert.match(html,/id="archiveAuditBtn"/);
  assert.match(html,/function loadAuditRetentionStatus\(\)/);
  assert.match(html,/function archiveAuditNow\(\)/);
  assert.match(html,/getAuditRetentionStatus/);
  assert.match(html,/archiveAuditLogs/);
  assert.doesNotMatch(html,/setInterval\([^\n]*archiveAudit|setTimeout\([^\n]*archiveAudit/);
});

test('archive refuses equal AuditID with different payload and never deletes source',()=>{
  const ctx=makeContext();
  const id='11111111-1111-4111-8111-111111111111';
  const old=new Date(Date.now()-500*24*60*60*1000);
  const original=auditRow(old,id);
  const altered=[...original];altered[7]='tampered-content';
  const active=new FakeSheet([auditHeader10(),original],10,'AuditLogs');
  const stored=new FakeSheet([auditHeader10(),altered],10,'YArchive');
  let auditWrites=0;
  ctx.getDb_=()=>({});
  ctx.ensureAuditSchema_=()=>({sheet:active,rows:1,backfilledIds:0});
  ctx.getAuditRetentionDays_=()=>365;
  ctx.ensureAuditArchiveSpreadsheet_=()=>new FakeSpreadsheet([stored]);
  ctx.ensureAuditArchiveYearSheet_=()=>stored;
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  ctx.writeAudit_=()=>auditWrites++;
  assert.throws(()=>ctx.archiveAuditLogsCore_({email:'manager@example.test',role:'Manager'}),/ข้อมูลไม่ตรงกัน/);
  assert.equal(active.rows.length,2);
  assert.deepEqual(active.rows[1],original);
  assert.equal(stored.rows.length,2);
  assert.equal(auditWrites,0);
});

test('archive refuses duplicated or malformed destination AuditID before source deletion',()=>{
  const ctx=makeContext();
  const id='11111111-1111-4111-8111-111111111111';
  const old=new Date(Date.now()-500*24*60*60*1000);
  const row=auditRow(old,id);
  const active=new FakeSheet([auditHeader10(),row],10);
  const stored=new FakeSheet([auditHeader10(),row,[...row]],10,'YArchive');
  ctx.getDb_=()=>({});
  ctx.ensureAuditSchema_=()=>({sheet:active,rows:1,backfilledIds:0});
  ctx.getAuditRetentionDays_=()=>365;
  ctx.ensureAuditArchiveSpreadsheet_=()=>new FakeSpreadsheet([stored]);
  ctx.ensureAuditArchiveYearSheet_=()=>stored;
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  assert.throws(()=>ctx.archiveAuditLogsCore_({email:'manager@example.test',role:'Manager'}),/AuditID ซ้ำ/);
  assert.equal(active.rows.length,2);
  stored.rows.splice(2,1);
  stored.rows[1][9]='invalid-id';
  assert.throws(()=>ctx.archiveAuditLogsCore_({email:'manager@example.test',role:'Manager'}),/AuditID ไม่ถูกต้อง/);
  assert.equal(active.rows.length,2);
});

test('archive row verification matches complete typed content including Date semantics',()=>{
  const ctx=makeContext();
  const ts=new Date('2025-01-01T00:00:00Z');
  const a=auditRow(ts,'11111111-1111-4111-8111-111111111111');
  assert.equal(ctx.auditArchiveRowMatches_(a,[...a]),true);
  assert.equal(ctx.auditArchiveRowMatches_(a,[...a.slice(0,7),'different',...a.slice(8)]),false);
  assert.equal(ctx.auditArchiveRowMatches_(a,[ts.toISOString(),...a.slice(1)]),false);
  assert.equal(ctx.auditArchiveRowMatches_(a,[new Date(ts.getTime()),...a.slice(1)]),true);
});
