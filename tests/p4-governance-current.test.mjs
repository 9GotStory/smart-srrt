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
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this;}
  setValues(vals){this._ensure();for(let r=0;r<this.numRows;r++)for(let c=0;c<this.numCols;c++)this.sheet.rows[this.row-1+r][this.col-1+c]=vals[r][c];return this;}
}
class FakeSheet {
  constructor(rows,maxCols=12){this.maxCols=maxCols;this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x});}
  getLastRow(){return this.rows.length}
  getDataRange(){return this.getRange(1,1,this.rows.length,this.maxCols)}
  getRange(r,c,nr=1,nc=1){return new FakeRange(this,r,c,nr,nc)}
  appendRow(row){const x=[...row];while(x.length<this.maxCols)x.push('');this.rows.push(x);return this}
  deleteRow(rowNumber){this.rows.splice(rowNumber-1,1)}
}

function makeContext(){
  const context={
    console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite,
    Utilities:{
      DigestAlgorithm:{SHA_256:'SHA_256'},
      Charset:{UTF_8:'UTF_8'},
      computeDigest:(_alg,text)=>{
        const out=Array(32).fill(0),bytes=Array.from(Buffer.from(String(text)));
        bytes.forEach((v,i)=>{out[i%32]=(out[i%32]+v+i)%256});
        return out.map(v=>v>127?v-256:v);
      },
      base64Decode:s=>Array.from(Buffer.from(String(s),'base64')),
      base64Encode:b=>Buffer.from(b).toString('base64'),
      getUuid:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    }
  };
  vm.createContext(context);vm.runInContext(source,context);return context;
}

test('P4 schema keeps MainData at 44 columns and adds governance sheets instead',()=>{
  const ctx=makeContext();
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,44);
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'4');
  assert.equal(ctx.CONFIG.SHEETS.ATTACHMENTS,'EventAttachments');
  assert.equal(ctx.CONFIG.SHEETS.AUDIT_ARCHIVE,'AuditArchive');
  assert.equal(ctx.EVENT_META_COL.CLOSE_REASON,44);
});

test('VisitLogs migration renames only the misleading header and preserves rows',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([
    ['Timestamp','Page','UserAgent'],
    ['2026-10-06','doGet','{"foo":"bar"}']
  ],3);
  assert.equal(ctx.migrateVisitLogHeader_(sheet),true);
  assert.equal(sheet.rows[0][2],'RequestParams');
  assert.equal(sheet.rows[1][2],'{"foo":"bar"}');
  assert.equal(ctx.migrateVisitLogHeader_(sheet),false);
});

test('attachment upload path is private and has a bounded allowlist',()=>{
  const block=source.match(/function uploadEventAttachment[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.doesNotMatch(block,/setSharing|ANYONE_WITH_LINK/);
  assert.match(block,/MAX_ATTACHMENT_BYTES/);
  assert.match(source,/MAX_ATTACHMENT_BYTES:\s*5\s*\*\s*1024\s*\*\s*1024/);
  assert.match(source,/application\/pdf/);
  assert.match(source,/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
});

test('attachment list/download requires view and upload/archive requires edit',()=>{
  const list=source.match(/function listEventAttachments[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const download=source.match(/function downloadEventAttachment[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const upload=source.match(/function uploadEventAttachment[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const archive=source.match(/function archiveEventAttachment[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(list,/requireAuth_\(sessionToken, 'view'\)/);
  assert.match(download,/requireAuth_\(sessionToken, 'view'\)/);
  assert.match(upload,/requireAuth_\(sessionToken, 'edit'\)/);
  assert.match(archive,/requireAuth_\(sessionToken, 'edit'\)/);
});

test('MasterData CRUD protects type/value identity and canonical criteria KPI value',()=>{
  assert.match(source,/var MASTER_TYPES = \[/);
  const save=source.match(/function saveMasterItem[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const disable=source.match(/function disableMasterItem[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(save,/Type และ Value ของรายการเดิมเปลี่ยนไม่ได้/);
  assert.match(save,/value === 'เข้าเกณฑ์' && !active/);
  assert.match(disable,/value === 'เข้าเกณฑ์'/);
  assert.match(save,/requireAuth_\(sessionToken, 'master'\)/);
});

test('audit archive is explicit, retention-preserving and idempotency-aware',()=>{
  const block=source.match(/function archiveAuditLogs[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(block,/requireAuth_\(sessionToken, 'audit'\)/);
  assert.match(block,/olderThanDays/);
  assert.match(block,/auditArchiveKey_/);
  assert.match(block,/existingKeys/);
  assert.match(block,/archive\.getRange/);
  assert.match(block,/active\.deleteRow/);
  assert.match(block,/ARCHIVE_AUDIT_LOGS/);
  assert.doesNotMatch(block,/setTrashed|DriveApp/);
});

test('audit archive key is deterministic for the same row',()=>{
  const ctx=makeContext();
  const row=['2026-01-01','a@example.test','Admin','UPDATE_RECORD','MainData','id','before','after',''];
  assert.equal(ctx.auditArchiveKey_(row),ctx.auditArchiveKey_(row));
  assert.notEqual(ctx.auditArchiveKey_(row),ctx.auditArchiveKey_([...row.slice(0,7),'different','']));
});

test('browser exposes governance controls only in authenticated/admin surfaces',()=>{
  assert.match(html,/openAttachmentModal/);
  assert.match(html,/uploadEventAttachment/);
  assert.match(html,/downloadEventAttachment/);
  assert.match(html,/archiveEventAttachment/);
  assert.match(html,/loadMasterAdmin/);
  assert.match(html,/archiveAuditUi/);
  assert.doesNotMatch(html,/ANYONE_WITH_LINK/);
});
