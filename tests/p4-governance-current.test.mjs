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
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
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
  assert.equal(ctx.MAIN_HEADERS.length,30);
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,38);
  assert.equal(ctx.EVENT_OWNER_COL,39);
  assert.equal(ctx.EVENT_OWNER_HEADER,'OwnerUserID');
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
  assert.equal(ctx.CONFIG.SHEETS.ATTACHMENTS,'EventAttachments');
  assert.equal(ctx.CONFIG.SHEETS.AUDIT,'AuditLogs');
  assert.equal(ctx.CONFIG.SHEETS.VISITS,'VisitLogs');
  assert.equal(Object.hasOwn(ctx.CONFIG.SHEETS,'AUDIT_ARCHIVE'),false);
  assert.deepEqual(Array.from(ctx.AUDIT_HEADERS).slice(-1),['AuditID']);
  assert.equal(ctx.AUDIT_COL.AUDIT_ID,10);
  assert.equal(ctx.EVENT_ATTACHMENT_HEADERS.length,13);
  assert.equal(ctx.EVENT_ATTACHMENT_COL.REMOVE_REASON,13);
  // Legacy P4 col39 remains a hard conflict; v7 must never reinterpret it as owner.
  const main=new FakeSheet([[...ctx.MAIN_SCHEMA_HEADERS,'WorkflowStatus'],[...Array(38).fill(''),'IN_PROGRESS']],39);
  assert.throws(()=>ctx.ensureEventOwnerSchema_({getSheetByName:()=>main}),/คอลัมน์ 39/);
});

test('VisitLogs migration renames only the misleading header and preserves rows',()=>{
  const ctx=makeContext();
  const privateParams='{"token":"historical-synthetic-secret"}';
  const safeLegacy=new FakeSheet([
    ['Timestamp','Page','UserAgent'],
    ['2026-10-06','doGet',privateParams]
  ],3);
  const ss={getSheetByName:()=>safeLegacy};
  const first=ctx.ensureVisitLogSchema_(ss);
  assert.equal(first.migratedLegacyHeaders,true);
  assert.deepEqual(safeLegacy.rows[0],['Timestamp','EntryPoint','LegacyRequestParams']);
  assert.equal(safeLegacy.rows[1][2],privateParams);
  assert.equal(ctx.ensureVisitLogSchema_(ss).migratedLegacyHeaders,false);
  // An actual P4 RequestParams header is not a recognized G29 legacy header.
  // Refuse without modifying the old row or silently leaking/erasing it.
  const p4=new FakeSheet([['Timestamp','Page','RequestParams'],['2026-10-06','doGet',privateParams]],3);
  const before=JSON.stringify(p4.rows);
  assert.throws(()=>ctx.ensureVisitLogSchema_({getSheetByName:()=>p4}),/ไม่ใช่ schema ที่รองรับ/);
  assert.equal(JSON.stringify(p4.rows),before);
  const events=new FakeSheet([['Timestamp','EntryPoint','LegacyRequestParams']],3);
  ctx.getSheet_=(name)=>{assert.equal(name,ctx.CONFIG.SHEETS.VISITS);return events;};
  ctx.logVisit_({parameter:{token:'synthetic-private'}});
  assert.equal(events.rows[1][1],'doGet');
  assert.equal(events.rows[1][2],'');
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
  const find=name=>source.match(new RegExp('function '+name+'\\([\\s\\S]*?(?=\\nfunction )'))?.[0]??'';
  const list=find('listEventAttachments');
  const download=find('downloadEventAttachment');
  const upload=find('uploadEventAttachment');
  const remove=find('removeEventAttachment');
  assert.match(list,/requireAuth_\(sessionToken, 'view'\)/);
  assert.match(download,/requireAuth_\(sessionToken, 'view'\)/);
  assert.match(upload,/requireAuth_\(sessionToken, 'edit'\)/);
  assert.match(remove,/requireAuth_\(sessionToken, 'delete'\)/);
  assert.match(remove,/if \(!reason\) throw/);
  assert.match(remove,/expected !== currentRevision/);
  assert.match(remove,/REMOVE_EVENT_ATTACHMENT/);
  assert.doesNotMatch(source,/function archiveEventAttachment\(/);
  const ctx=makeContext(),denied=[];
  ctx.requireAuth_=(_token,perm)=>{denied.push(perm);throw Error('access denied');};
  assert.throws(()=>ctx.listEventAttachments('bad','no-id'),/access denied/);
  assert.throws(()=>ctx.downloadEventAttachment('bad','no-id'),/access denied/);
  assert.throws(()=>ctx.uploadEventAttachment('bad','no-id',{},1),/access denied/);
  assert.throws(()=>ctx.removeEventAttachment('bad','no-id','reason',1),/access denied/);
  assert.deepEqual(denied,['view','view','edit','delete']);
});

test('MasterData CRUD protects type/value identity and canonical criteria KPI value',()=>{
  const ctx=makeContext();
  assert.equal(ctx.MASTER_DATA_POLICIES.criteria.semanticLocked,true);
  assert.equal(ctx.MASTER_DATA_POLICIES.criteria.allowCreate,false);
  assert.equal(ctx.MASTER_DATA_POLICIES.criteria.allowDeactivate,false);
  assert.equal(ctx.MASTER_DATA_POLICIES.verify_status.semanticLocked,true);
  const master=new FakeSheet([
    ['Type','Value','Label','SortOrder','Active','UpdatedAt','UpdatedBy'],
    ['criteria','เข้าเกณฑ์','เข้าเกณฑ์',1,true,'','']
  ],7),audit=[];
  ctx.requireAuth_=(_token,perm)=>{assert.equal(perm,'master');return {email:'admin@example.test',role:'Admin'};};
  ctx.getSheet_=name=>{assert.equal(name,ctx.CONFIG.SHEETS.MASTER);return master;};
  ctx.writeAudit_=(...args)=>audit.push(args);
  const input={mode:'update',type:'criteria',value:'เข้าเกณฑ์',originalType:'criteria',originalValue:'เข้าเกณฑ์',label:'เข้าเกณฑ์สอบสวน',sortOrder:2,active:true};
  assert.throws(()=>ctx.saveMasterDataItem('token',{...input,mode:'create',value:'custom'}),/ไม่อนุญาตให้สร้าง/);
  assert.throws(()=>ctx.saveMasterDataItem('token',{...input,active:false}),/ไม่อนุญาตให้ปิดใช้งาน/);
  assert.throws(()=>ctx.saveMasterDataItem('token',{...input,value:'custom'}),/ไม่อนุญาตให้เปลี่ยน Type หรือ Value/);
  assert.equal(master.rows[1][1],'เข้าเกณฑ์');
  assert.equal(audit.length,0);
  assert.match(ctx.saveMasterDataItem('token',input),/บันทึก MasterData/);
  assert.equal(master.rows[1][1],'เข้าเกณฑ์');
  assert.equal(master.rows[1][2],'เข้าเกณฑ์สอบสวน');
  assert.equal(master.rows[1][3],2);
  assert.equal(audit[0][1],'UPDATE_MASTER_DATA');
});

test('audit archive is explicit, retention-preserving and idempotency-aware',()=>{
  const archive=source.match(/function archiveAuditLogs\([\s\S]*?(?=\nfunction )/)?.[0]??'';
  const core=source.match(/function archiveAuditLogsCore_\([\s\S]*?(?=\nfunction )/)?.[0]??'';
  const index=source.match(/function getAuditArchiveIds_\([\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(archive,/requireAuth_\(sessionToken, 'audit'\)/);
  assert.match(archive,/archiveAuditLogsCore_\(user\)/);
  assert.match(core,/getAuditRetentionDays_\(\)/);
  assert.match(core,/auditTimestampToDate_/);
  assert.match(core,/ensureAuditArchiveYearSheet_/);
  assert.match(core,/getAuditArchiveIds_/);
  assert.match(core,/auditArchiveRowMatches_/);
  assert.match(core,/deleteAuditSourceRows_/);
  assert.match(core,/ARCHIVE_AUDIT_LOGS/);
  assert.match(index,/AuditID ซ้ำ/);
  assert.doesNotMatch(core,/setTrashed\s*\(/);
  const ctx=makeContext();
  ctx.requireAuth_=()=>{throw Error('audit access denied');};
  assert.throws(()=>ctx.archiveAuditLogs('bad'),/audit access denied/);
  ctx.getSettingsMap_=()=>({AUDIT_RETENTION_DAYS:'1'});
  assert.equal(ctx.getAuditRetentionDays_(),90);
  ctx.getSettingsMap_=()=>({AUDIT_RETENTION_DAYS:'99999'});
  assert.equal(ctx.getAuditRetentionDays_(),3650);
});

test('audit archive key is deterministic for the same row',()=>{
  const ctx=makeContext();
  assert.equal(ctx.AUDIT_COL.AUDIT_ID,10);
  let next=0;
  ctx.Utilities.getUuid=()=>`00000000-0000-4000-8000-${String(++next).padStart(12,'0')}`;
  const old=['2026-01-01','admin@example.test','Admin','UPDATE_RECORD','MainData','event-id','before','after',''];
  const first=[...old],second=[...old];
  const sheet=new FakeSheet([[...ctx.AUDIT_HEADERS.slice(0,9)],first,second],9);
  const ss={getSheetByName:()=>sheet};
  const firstPass=ctx.ensureAuditSchema_(ss);
  assert.equal(firstPass.backfilledIds,2);
  assert.equal(sheet.rows[0][9],'AuditID');
  assert.notEqual(sheet.rows[1][9],sheet.rows[2][9]);
  assert.deepEqual(sheet.rows[1].slice(0,9),old);
  assert.deepEqual(sheet.rows[2].slice(0,9),old);
  const ids=sheet.rows.slice(1).map(x=>x[9]);
  const again=ctx.ensureAuditSchema_(ss);
  assert.equal(again.backfilledIds,0);
  assert.deepEqual(sheet.rows.slice(1).map(x=>x[9]),ids);
  // V7 AuditID denotes row identity, NOT content-derived P4 ArchiveKey.
  assert.equal(typeof ctx.auditArchiveKey_,'undefined');
});

test('browser exposes governance controls only in authenticated/admin surfaces',()=>{
  assert.match(html,/openAttachmentModal/);
  assert.match(html,/uploadEventAttachment/);
  assert.match(html,/downloadEventAttachment/);
  assert.match(html,/removeEventAttachment/);
  assert.match(html,/loadMasterDataAdmin/);
  assert.match(html,/getMasterDataAdmin/);
  assert.match(html,/saveMasterDataItem/);
  assert.match(html,/archiveAuditLogs/);
  assert.match(html,/loadAuditRetentionStatus/);
  assert.match(html,/if\(!currentUser\)\{el\('eventBody'\)\.innerHTML='';/);
  assert.match(source,/function getAuditRetentionStatus\(sessionToken\) \{\s*requireAuth_\(sessionToken, 'audit'\)/);
  assert.doesNotMatch(html,/ANYONE_WITH_LINK/);
  assert.doesNotMatch(html,/archiveEventAttachment/);
});
