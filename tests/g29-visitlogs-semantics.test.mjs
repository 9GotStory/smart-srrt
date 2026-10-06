import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

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
  setValues(values){
    this._ensure();
    for(let ri=0;ri<this.numRows;ri++)for(let ci=0;ci<this.numCols;ci++)this.sheet.rows[this.row-1+ri][this.col-1+ci]=values[ri][ci];
    return this;
  }
}
class FakeSheet {
  constructor(rows=[],maxCols=3){
    this.maxCols=maxCols;
    this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x});
  }
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getLastRow(){return this.rows.length}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
  appendRow(row){const x=[...row];this.maxCols=Math.max(this.maxCols,x.length);while(x.length<this.maxCols)x.push('');this.rows.push(x);return this}
}
class FakeSpreadsheet {
  constructor(sheet=null){this.sheet=sheet}
  getSheetByName(){return this.sheet}
  insertSheet(){this.sheet=new FakeSheet([],26);return this.sheet}
}

function makeContext(){
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(context);
  vm.runInContext(source,context);
  return context;
}

function fnBlock(name){
  const re=new RegExp('function\\s+'+name.replace(/[$]/g,'\\$&')+'\\s*\\(');
  const m=re.exec(source); if(!m)return '';
  const start=m.index;
  const next=source.slice(start+1).search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start,next>=0?start+1+next:source.length);
}

test('G-29 schema v6 defines honest VisitLogs headers',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'6');
  assert.deepEqual(Array.from(ctx.VISIT_HEADERS),['Timestamp','EntryPoint','LegacyRequestParams']);
  assert.deepEqual(Array.from(ctx.VISIT_LEGACY_HEADERS),['Timestamp','Page','UserAgent']);
});

test('legacy VisitLogs headers migrate in place while row values are preserved',()=>{
  const ctx=makeContext();
  const legacyPayload='{"token":"legacy-example","foo":"bar"}';
  const rows=[
    ['Timestamp','Page','UserAgent'],
    [new Date('2026-01-01T00:00:00Z'),'doGet',legacyPayload],
    [new Date('2026-01-02T00:00:00Z'),'doGet','{}']
  ];
  const sheet=new FakeSheet(rows,3);
  const beforeRows=sheet.rows.slice(1).map(r=>[r[0],r[1],r[2]]);
  const ss=new FakeSpreadsheet(sheet);

  const first=ctx.ensureVisitLogSchema_(ss);
  assert.equal(first.rows,2);
  assert.equal(first.migratedLegacyHeaders,true);
  assert.deepEqual(sheet.rows[0].slice(0,3),['Timestamp','EntryPoint','LegacyRequestParams']);
  assert.equal(sheet.rows[1][2],legacyPayload);
  assert.deepEqual(sheet.rows.slice(1).map(r=>[r[0],r[1],r[2]]),beforeRows);

  const second=ctx.ensureVisitLogSchema_(ss);
  assert.equal(second.rows,2);
  assert.equal(second.migratedLegacyHeaders,false);
  assert.deepEqual(sheet.rows[0].slice(0,3),['Timestamp','EntryPoint','LegacyRequestParams']);
});

test('VisitLogs migration rejects unknown/conflicting headers',()=>{
  const ctx=makeContext();

  const bad=new FakeSheet([
    ['Timestamp','Page','RealUserAgent'],
    [new Date('2026-01-01T00:00:00Z'),'doGet','Mozilla/5.0']
  ],3);
  assert.throws(()=>ctx.ensureVisitLogSchema_(new FakeSpreadsheet(bad)),/ไม่ใช่ schema ที่รองรับ/);

  const hidden=new FakeSheet([
    ['Timestamp','','UserAgent'],
    [new Date('2026-01-01T00:00:00Z'),'doGet','{}']
  ],3);
  assert.throws(()=>ctx.ensureVisitLogSchema_(new FakeSpreadsheet(hidden)),/หัวข้อว่าง/);
});

test('new visit logging stores only timestamp + entry point and leaves legacy params blank',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([['Timestamp','EntryPoint','LegacyRequestParams']],3);
  ctx.getSheet_=name=>{
    assert.equal(name,'VisitLogs');
    return sheet;
  };

  ctx.logVisit_({parameter:{token:'must-not-be-stored',q:'secret'}});
  assert.equal(sheet.rows.length,2);
  assert.ok(sheet.rows[1][0] instanceof Date);
  assert.equal(sheet.rows[1][1],'doGet');
  assert.equal(sheet.rows[1][2],'');
});

test('new visit logger does not inspect or serialize request parameters',()=>{
  const logVisit=fnBlock('logVisit_');
  const doGet=fnBlock('doGet');

  assert.doesNotMatch(logVisit,/\.parameter|parameters|JSON\.stringify|UserAgent|userAgent|Session|getActiveUser|token|email|ip/i);
  assert.match(logVisit,/appendRow\(\[new Date\(\), 'doGet', ''\]\)/);
  assert.match(doGet,/logVisit_\(\);/);
  assert.doesNotMatch(doGet,/logVisit_\(e\)/);
});

test('installer uses the semantic VisitLogs guard instead of recreating legacy headers',()=>{
  const installer=fnBlock('installSmartSRRTCore_');
  assert.match(installer,/var visitMigration = ensureVisitLogSchema_\(ss\)/);
  assert.doesNotMatch(installer,/\['Timestamp','Page','UserAgent'\]/);
  assert.match(installer,/VisitLogs: rows/);
});

test('G-29 migration advances only to schema floor 6 while G-21 remains floor 5',()=>{
  const g29=fnBlock('migrateG29VisitLogs');
  const g21=fnBlock('migrateG21AuditRetention');

  assert.match(g29,/Math\.max\(existingSchemaVersion, 6\)/);
  assert.match(g21,/Math\.max\(existingSchemaVersion, 5\)/);
  assert.doesNotMatch(g21,/Math\.max\(existingSchemaVersion, 6\)/);
});

test('G-29 adds no visitor analytics or fingerprinting subsystem',()=>{
  const logVisit=fnBlock('logVisit_');
  assert.doesNotMatch(logVisit,/user.?agent|remote.?addr|ip.?address|fingerprint|session.?id|email|query/i);
  assert.doesNotMatch(source,/function\s+(?:trackVisitor|trackPageView|identifyVisitor)\s*\(/i);
  assert.doesNotMatch(source,/ScriptApp\.newTrigger[^\n]*Visit|timeBased\(\)[\s\S]{0,300}Visit/i);
});
