import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

class FakeRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  _ensure() {
    const targetRows = this.row - 1 + this.numRows;
    while (this.sheet.rows.length < targetRows) this.sheet.rows.push([]);
    for (const r of this.sheet.rows) {
      while (r.length < this.sheet.maxCols) r.push('');
    }
  }
  getValues() {
    this._ensure();
    return Array.from({length:this.numRows}, (_,ri) =>
      Array.from({length:this.numCols}, (_,ci) =>
        this.sheet.rows[this.row - 1 + ri]?.[this.col - 1 + ci] ?? ''
      )
    );
  }
  getDisplayValues() {
    return this.getValues().map(row => row.map(v => {
      if (v instanceof Date) return v.toISOString();
      return v === null || v === undefined ? '' : String(v);
    }));
  }
  setValues(values) {
    this._ensure();
    assert.equal(values.length, this.numRows);
    for (let ri=0; ri<this.numRows; ri++) {
      assert.equal(values[ri].length, this.numCols);
      for (let ci=0; ci<this.numCols; ci++) {
        this.sheet.rows[this.row - 1 + ri][this.col - 1 + ci] = values[ri][ci];
      }
    }
    return this;
  }
  getValue() { return this.getValues()[0][0]; }
  setValue(value) {
    this._ensure();
    this.sheet.rows[this.row - 1][this.col - 1] = value;
    return this;
  }
}

class FakeSheet {
  constructor(rows, maxCols = 38) {
    this.maxCols = maxCols;
    this.rows = rows.map(r => {
      const x = [...r];
      while (x.length < maxCols) x.push('');
      return x;
    });
  }
  getLastRow() { return this.rows.length; }
  getLastColumn() {
    let last=0;
    for (const row of this.rows) {
      for (let i=row.length-1;i>=0;i--) {
        if (row[i] !== '' && row[i] !== null && row[i] !== undefined) {
          last=Math.max(last,i+1); break;
        }
      }
    }
    return Math.max(last,1);
  }
  getMaxColumns() { return this.maxCols; }
  insertColumnsAfter(_after, count) {
    this.maxCols += count;
    for (const row of this.rows) while (row.length < this.maxCols) row.push('');
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return new FakeRange(this, row, col, numRows, numCols);
  }
}

function makeRow(receivedDate = '2569-10-06') {
  const row = Array(38).fill('');
  row[1] = receivedDate;
  return row;
}

function makeContext(uuidStart = 1) {
  let seq = uuidStart;
  const uuid = () => {
    const tail = String(seq++).padStart(12,'0');
    return `00000000-0000-4000-8000-${tail}`;
  };
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
    isFinite,
    Utilities: { getUuid: uuid }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test('source and browser contracts use EventID rather than rowNumber for Event operations', () => {
  assert.match(source, /function updateRecord\(sessionToken, eventId, formData, expectedRevision\)/);
  assert.match(source, /function deleteRecord\(sessionToken, eventId, voidReason, expectedRevision\)/);
  assert.match(source, /function generateReportFromWeb\(sessionToken, eventId(?:, [A-Za-z_$][\w$]*)*\)/);
  assert.match(source, /function findEventRowById_/);
  const deleteBlock = source.match(/function deleteRecord[\s\S]*?(?=\nfunction )/)?.[0] ?? '';
  assert.doesNotMatch(deleteBlock, /deleteRow\s*\(/);
  assert.doesNotMatch(html, /\browNumber\b/);
  assert.match(html, /editEventId/);
  assert.match(html, /deleteEvent\(eventId,revision\)/);
  assert.match(html, /makeReport\(eventId,btn\)/);
});

test('P1 schema is additive after the legacy 30 business columns', () => {
  const ctx = makeContext();
  assert.equal(ctx.MAIN_HEADERS.length, 30);
  assert.deepEqual(
    Array.from(ctx.EVENT_META_HEADERS),
    ['EventID','Revision','RecordStatus','CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason']
  );
  assert.ok(ctx.MAIN_SCHEMA_HEADERS.length >= 38);
  assert.deepEqual(
    Array.from(ctx.MAIN_SCHEMA_HEADERS.slice(0, 38)),
    [...Array.from(ctx.MAIN_HEADERS), ...Array.from(ctx.EVENT_META_HEADERS)]
  );
  assert.equal(ctx.EVENT_META_COL.EVENT_ID, 31);
  assert.equal(ctx.EVENT_META_COL.VOID_REASON, 38);
});

test('legacy Event migration backfills identity idempotently without inventing CreatedAt/CreatedBy', () => {
  const ctx = makeContext();
  const header = Array(38).fill('');
  const sheet = new FakeSheet([header, makeRow(), makeRow('2569-10-07')]);

  const first = ctx.ensureEventIdentityData_(sheet);
  assert.equal(first.backfilledIds, 2);
  assert.equal(first.initializedRevision, 2);
  assert.equal(first.initializedStatus, 2);

  const ids = [sheet.rows[1][30], sheet.rows[2][30]];
  assert.ok(ids.every(id => ctx.isUuid_(id)));
  assert.notEqual(ids[0], ids[1]);
  assert.equal(sheet.rows[1][31], 1);
  assert.equal(sheet.rows[1][32], 'active');
  assert.equal(sheet.rows[1][33], '');
  assert.equal(sheet.rows[1][34], '');

  const second = ctx.ensureEventIdentityData_(sheet);
  assert.equal(second.backfilledIds, 0);
  assert.equal(second.initializedRevision, 0);
  assert.equal(second.initializedStatus, 0);
  assert.deepEqual([sheet.rows[1][30], sheet.rows[2][30]], ids);
});

test('migration rejects duplicate EventID instead of silently replacing it', () => {
  const ctx = makeContext();
  const id='11111111-1111-4111-8111-111111111111';
  const a=makeRow(), b=makeRow('2569-10-07');
  a[30]=id; a[31]=1; a[32]='active';
  b[30]=id; b[31]=1; b[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),a,b]);
  assert.throws(() => ctx.ensureEventIdentityData_(sheet), /EventID ซ้ำ/);
});

test('migration rejects malformed nonblank EventID', () => {
  const ctx = makeContext();
  const a=makeRow();
  a[30]='not-a-uuid'; a[31]=1; a[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),a]);
  assert.throws(() => ctx.ensureEventIdentityData_(sheet), /EventID รูปแบบไม่ถูกต้อง/);
});

test('updateRecord resolves by EventID and increments Revision', () => {
  const ctx = makeContext();
  const id='22222222-2222-4222-8222-222222222222';
  const row=makeRow();
  row[30]=id; row[31]=2; row[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),row]);
  const audits=[];
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const msg=ctx.updateRecord('token',id,{col2:'2569-10-08',col6:'โรคทดสอบ'},2);
  assert.match(msg,/อัปเดต/);
  assert.equal(sheet.rows[1][31],3);
  assert.equal(sheet.rows[1][1],'2569-10-08');
  assert.equal(sheet.rows[1][5],'โรคทดสอบ');
  assert.equal(audits[0][1],'UPDATE_RECORD');
  assert.equal(audits[0][3],id);
});

test('updateRecord rejects stale Revision', () => {
  const ctx = makeContext();
  const id='33333333-3333-4333-8333-333333333333';
  const row=makeRow();
  row[30]=id; row[31]=4; row[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),row]);
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=()=>{};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  assert.throws(
    () => ctx.updateRecord('token',id,{col2:'2569-10-08'},3),
    /ถูกแก้ไขจากผู้ใช้อื่นแล้ว/
  );
  assert.equal(sheet.rows[1][31],4);
});

test('deleteRecord voids the Event and preserves the physical row', () => {
  const ctx = makeContext();
  const id='44444444-4444-4444-8444-444444444444';
  const row=makeRow();
  row[30]=id; row[31]=1; row[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),row]);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const beforeRows=sheet.getLastRow();
  const msg=ctx.deleteRecord('token',id,'ข้อมูลซ้ำ',1);
  assert.match(msg,/ยกเลิก/);
  assert.equal(sheet.getLastRow(),beforeRows);
  assert.equal(sheet.rows[1][31],2);
  assert.equal(sheet.rows[1][32],'void');
  assert.equal(sheet.rows[1][36],'manager@example.test');
  assert.equal(sheet.rows[1][37],'ข้อมูลซ้ำ');
  assert.equal(audits[0][1],'VOID_RECORD');
  assert.equal(audits[0][3],id);
  assert.throws(()=>ctx.findEventRowById_(sheet,id,false),/ถูกยกเลิกแล้ว/);
  assert.equal(ctx.findEventRowById_(sheet,id,true),2);
});

test('rowToObject exposes stable metadata but not physical rowNumber', () => {
  const ctx=makeContext();
  const id='55555555-5555-4555-8555-555555555555';
  const row=makeRow();
  row[30]=id; row[31]=7; row[32]='active';
  const obj=ctx.rowToObject_(row);
  assert.equal(obj.eventId,id);
  assert.equal(obj.revision,7);
  assert.equal(obj.recordStatus,'active');
  assert.equal(Object.hasOwn(obj,'rowNumber'),false);
  assert.equal(Object.hasOwn(obj,'createdBy'),false);
  assert.equal(Object.hasOwn(obj,'voidedBy'),false);
  assert.equal(Object.hasOwn(obj,'voidReason'),false);
});

test('updateRecord requires expected Revision', () => {
  const ctx = makeContext();
  const id='66666666-6666-4666-8666-666666666666';
  const row=makeRow();
  row[30]=id; row[31]=2; row[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),row]);
  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=()=>{};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  assert.throws(
    () => ctx.updateRecord('token',id,{col2:'2569-10-08'}),
    /ไม่พบ Revision/
  );
  assert.equal(sheet.rows[1][31],2);
});

test('deleteRecord rejects a stale or missing Revision before voiding', () => {
  const ctx = makeContext();
  const id='77777777-7777-4777-8777-777777777777';
  const row=makeRow();
  row[30]=id; row[31]=3; row[32]='active';
  const sheet=new FakeSheet([Array(38).fill(''),row]);
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheetByIdOrName_=()=>sheet;
  ctx.writeAudit_=()=>{};
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  assert.throws(
    () => ctx.deleteRecord('token',id,'ข้อมูลซ้ำ'),
    /ไม่พบ Revision/
  );
  assert.throws(
    () => ctx.deleteRecord('token',id,'ข้อมูลซ้ำ',2),
    /ถูกแก้ไขจากผู้ใช้อื่นแล้ว/
  );
  assert.equal(sheet.rows[1][31],3);
  assert.equal(sheet.rows[1][32],'active');
});
