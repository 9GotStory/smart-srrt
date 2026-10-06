import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function context(){
  const ctx={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return ctx;
}

function functionBlock(name){
  const re=new RegExp('function\\s+'+name+'\\s*\\(');
  const m=re.exec(source);
  assert.ok(m,`missing function ${name}`);
  const start=m.index;
  const next=source.slice(start+1).search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start,next>=0?start+1+next:source.length);
}

class HeaderRange {
  constructor(sheet,row,col){this.sheet=sheet;this.row=row;this.col=col}
  getValue(){return this.sheet.cells[`${this.row}:${this.col}`]??''}
  setValue(v){this.sheet.cells[`${this.row}:${this.col}`]=v;return this}
}
class HeaderSheet {
  constructor(header){this.cells={'1:3':header}}
  getRange(row,col){return new HeaderRange(this,row,col)}
}

test('P4 declares supporting governance sheets without changing the 48-column Event schema',()=>{
  const ctx=context();
  assert.ok(Number(ctx.CONFIG.SCHEMA_VERSION)>=4);
  assert.equal(ctx.CONFIG.SHEETS.ATTACHMENTS,'EventAttachments');
  assert.equal(ctx.CONFIG.SHEETS.AUDIT_ARCHIVE,'AuditArchive');
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,48);
  assert.equal(ctx.MAX_ATTACHMENT_BYTES,undefined);
  assert.equal(ctx.CONFIG.MAX_ATTACHMENT_BYTES,10*1024*1024);
});

test('VisitLogs schema corrects legacy UserAgent header to Parameters',()=>{
  const ctx=context();
  const legacy=new HeaderSheet('UserAgent');
  ctx.ensureVisitLogsSchema_(legacy);
  assert.equal(legacy.cells['1:3'],'Parameters');
  const current=new HeaderSheet('Parameters');
  ctx.ensureVisitLogsSchema_(current);
  assert.equal(current.cells['1:3'],'Parameters');
});

test('visit parameter redaction masks likely secrets and bounds ordinary values',()=>{
  const ctx=context();
  const long='x'.repeat(700);
  const safe=ctx.redactVisitParams_({
    page:'dashboard',
    token:'abc',
    password:'pw',
    apiKey:'secret',
    session_id:'sid',
    q:long
  });
  assert.equal(safe.page,'dashboard');
  assert.equal(safe.token,'[REDACTED]');
  assert.equal(safe.password,'[REDACTED]');
  assert.equal(safe.apiKey,'[REDACTED]');
  assert.equal(safe.session_id,'[REDACTED]');
  assert.equal(safe.q.length,500);
});

test('MasterData CRUD is limited to known types',()=>{
  const ctx=context();
  for(const type of ['surveillance','disease_group','event_type','verify_status','criteria','risk','content_category']){
    assert.equal(ctx.isAllowedMasterType_(type),true);
  }
  assert.equal(ctx.isAllowedMasterType_('arbitrary_schema'),false);
});

test('attachment MIME allowlist is narrow and excludes executable/script content',()=>{
  const ctx=context();
  assert.equal(ctx.isAllowedAttachmentMime_('application/pdf'),true);
  assert.equal(ctx.isAllowedAttachmentMime_('image/jpeg'),true);
  assert.equal(ctx.isAllowedAttachmentMime_('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),true);
  assert.equal(ctx.isAllowedAttachmentMime_('text/html'),false);
  assert.equal(ctx.isAllowedAttachmentMime_('application/javascript'),false);
  assert.equal(ctx.isAllowedAttachmentMime_('application/x-msdownload'),false);
});

test('attachment RPC contracts require auth and soft-disable instead of deleting Drive evidence',()=>{
  const list=functionBlock('listEventAttachments');
  const upload=functionBlock('uploadEventAttachment');
  const disable=functionBlock('disableEventAttachment');
  assert.match(list,/requireAuth_\(sessionToken, 'view'\)/);
  assert.match(upload,/requireAuth_\(sessionToken, 'edit'\)/);
  assert.match(upload,/MAX_ATTACHMENT_BYTES/);
  assert.doesNotMatch(upload,/ANYONE_WITH_LINK|setSharing/);
  assert.match(disable,/requireAuth_\(sessionToken, 'edit'\)/);
  assert.match(disable,/setValue\(false\)/);
  assert.doesNotMatch(disable,/setTrashed|deleteRow|removeFile/);
});

test('audit archival copies evidence before deleting active rows and is explicit/manual',()=>{
  const block=functionBlock('archiveAuditLogs');
  assert.match(block,/requireAuth_\(sessionToken, 'audit'\)/);
  assert.match(block,/days < 30 \|\| days > 3650/);
  const writePos=block.indexOf('.setValues(output)');
  const flushPos=block.indexOf('SpreadsheetApp.flush()');
  const deletePos=block.indexOf('active.deleteRow');
  assert.ok(writePos>=0 && flushPos>writePos && deletePos>flushPos);
  assert.match(block,/ARCHIVE_AUDIT_LOGS/);
  assert.doesNotMatch(source,/ScriptApp\.newTrigger\([^)]*archiveAuditLogs/);
});

test('P4 browser exposes only lightweight attachment, MasterData and manual archive controls',()=>{
  assert.match(html,/uploadEventAttachment/);
  assert.match(html,/listEventAttachments/);
  assert.match(html,/disableEventAttachment/);
  assert.match(html,/listMasterDataAdmin/);
  assert.match(html,/saveMasterDataItem/);
  assert.match(html,/disableMasterDataItem/);
  assert.match(html,/archiveAuditLogs/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.doesNotMatch(html,/attachment workflow|document approval|retention scheduler/i);
});
