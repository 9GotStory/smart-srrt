import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){
    this.sheet=sheet;this.row=row;this.col=col;this.numRows=numRows;this.numCols=numCols;
  }
  _ensure(){
    const need=this.row-1+this.numRows;
    while(this.sheet.rows.length<need)this.sheet.rows.push([]);
    for(const r of this.sheet.rows)while(r.length<this.sheet.maxCols)r.push('');
  }
  getValues(){
    this._ensure();
    return Array.from({length:this.numRows},(_,ri)=>
      Array.from({length:this.numCols},(_,ci)=>this.sheet.rows[this.row-1+ri]?.[this.col-1+ci]??'')
    );
  }
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>v instanceof Date?v.toISOString():String(v??'')))}
  getValue(){return this.getValues()[0][0]}
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this}
  setValues(values){
    this._ensure();
    for(let ri=0;ri<this.numRows;ri++)for(let ci=0;ci<this.numCols;ci++){
      this.sheet.rows[this.row-1+ri][this.col-1+ci]=values[ri][ci];
    }
    return this;
  }
}
class FakeSheet {
  constructor(rows=[],maxCols=13){
    this.maxCols=maxCols;
    this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x});
  }
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getLastRow(){return this.rows.length}
  getLastColumn(){return this.maxCols}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
  appendRow(row){const x=[...row];this.maxCols=Math.max(this.maxCols,x.length);while(x.length<this.maxCols)x.push('');this.rows.push(x);return this}
}
class FakeSpreadsheet {
  constructor(sheet=null){this.sheet=sheet}
  getSheetByName(){return this.sheet}
  insertSheet(){this.sheet=new FakeSheet([],26);return this.sheet}
}

function makeContext(){
  const context={
    console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite,
    Utilities:{
      getUuid:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      base64Decode:s=>Array.from(Buffer.from(s,'base64')),
      base64Encode:bytes=>Buffer.from(bytes).toString('base64'),
      newBlob:(bytes,mimeType,name)=>({bytes,mimeType,name}),
      formatDate:value=>String(value)
    },
    Session:{getScriptTimeZone:()=> 'Asia/Bangkok'}
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context;
}
function mainEventRow(status='active',revision=4){
  const row=Array(39).fill('');
  row[1]='2569-10-06';
  row[30]='11111111-1111-4111-8111-111111111111';
  row[31]=revision;
  row[32]=status;
  return row;
}
function attachmentRow(status='active'){
  return [
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'drive-file-id',
    'หลักฐาน.pdf',
    'application/pdf',
    9,
    'เอกสารทดสอบ',
    status,
    '2026-10-06 17:00:00',
    'admin@example.test',
    '',
    '',
    ''
  ];
}

test('G-11 schema v4 adds only a dedicated attachment sheet contract',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'4');
  assert.equal(ctx.CONFIG.SHEETS.ATTACHMENTS,'EventAttachments');
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,38);
  assert.equal(ctx.EVENT_OWNER_COL,39);
  assert.deepEqual(Array.from(ctx.EVENT_ATTACHMENT_HEADERS),[
    'AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes','Description',
    'Status','UploadedAt','UploadedBy','RemovedAt','RemovedBy','RemoveReason'
  ]);
  assert.equal(ctx.EVENT_ATTACHMENT_HEADERS.length,13);
});

test('attachment sheet claim is idempotent and refuses conflicting existing data',()=>{
  const ctx=makeContext();
  const header=Array.from(ctx.EVENT_ATTACHMENT_HEADERS);
  const clean=new FakeSheet([header],13);
  const ss=new FakeSpreadsheet(clean);
  assert.equal(ctx.ensureEventAttachmentSheet_(ss),clean);
  assert.deepEqual(clean.rows[0].slice(0,13),header);
  assert.equal(ctx.ensureEventAttachmentSheet_(ss),clean);

  const badHeader=[...header];badHeader[2]='CustomFileColumn';
  const conflictHeader=new FakeSheet([badHeader],13);
  assert.throws(
    ()=>ctx.ensureEventAttachmentSheet_(new FakeSpreadsheet(conflictHeader)),
    /ใช้หัวข้อ/
  );

  const blankHeader=[...header];blankHeader[5]='';
  const data=Array(13).fill('');data[5]=123;
  const conflictData=new FakeSheet([blankHeader,data],13);
  assert.throws(
    ()=>ctx.ensureEventAttachmentSheet_(new FakeSpreadsheet(conflictData)),
    /มีข้อมูลเดิม/
  );
});

test('G-11 MIME allowlist and file signatures reject disguised content',()=>{
  const ctx=makeContext();
  assert.equal(ctx.attachmentMimeAllowed_('application/pdf'),true);
  assert.equal(ctx.attachmentMimeAllowed_('image/jpeg'),true);
  assert.equal(ctx.attachmentMimeAllowed_('image/png'),true);
  assert.equal(ctx.attachmentMimeAllowed_('image/webp'),true);
  assert.equal(ctx.attachmentMimeAllowed_('text/html'),false);
  assert.equal(ctx.attachmentMimeAllowed_('application/javascript'),false);

  assert.equal(ctx.validateAttachmentMagic_(Array.from(Buffer.from('%PDF-test')),'application/pdf'),true);
  assert.equal(ctx.validateAttachmentMagic_([0xff,0xd8,0xff,0x00],'image/jpeg'),true);
  assert.equal(ctx.validateAttachmentMagic_([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],'image/png'),true);
  assert.equal(ctx.validateAttachmentMagic_(Array.from(Buffer.from('<html>')),'application/pdf'),false);
});

test('upload creates private metadata, increments Event Revision and audits without public sharing',()=>{
  const ctx=makeContext();
  const main=new FakeSheet([Array(39).fill(''),mainEventRow('active',4)],39);
  const attachments=new FakeSheet([Array.from(ctx.EVENT_ATTACHMENT_HEADERS)],13);
  const audits=[];
  let createdFileName='';
  const fakeFile={
    getId:()=> 'drive-file-id-new',
    setTrashed:()=>{}
  };

  ctx.requireAuth_=()=>({email:'admin@example.test',role:'Admin',status:'active'});
  ctx.getDb_=()=>({});
  ctx.getSheetByIdOrName_=()=>main;
  ctx.findEventRowById_=()=>2;
  ctx.ensureEventAttachmentSheet_=()=>attachments;
  ctx.getEventAttachmentFolder_=()=>({
    createFile:blob=>{createdFileName=blob.name;return fakeFile}
  });
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const pdf=Buffer.from('%PDF-test');
  const result=ctx.uploadEventAttachment(
    'token',
    '11111111-1111-4111-8111-111111111111',
    {
      name:'../หลักฐาน?.pdf',
      mimeType:'application/pdf',
      base64:pdf.toString('base64'),
      description:'เอกสารประกอบ'
    },
    4
  );

  assert.equal(result.revision,5);
  assert.equal(main.rows[1][31],5);
  assert.equal(attachments.rows.length,2);
  assert.equal(attachments.rows[1][0],'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(attachments.rows[1][1],'11111111-1111-4111-8111-111111111111');
  assert.equal(attachments.rows[1][2],'drive-file-id-new');
  assert.equal(attachments.rows[1][7],'active');
  assert.equal(attachments.rows[1][9],'admin@example.test');
  assert.ok(createdFileName.startsWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa_'));
  assert.equal(audits[0][1],'UPLOAD_EVENT_ATTACHMENT');

  const uploadBlock=source.match(/function uploadEventAttachment[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.doesNotMatch(uploadBlock,/ANYONE_WITH_LINK|setSharing\s*\(/);
});

test('attachment list excludes removed records and does not expose Drive FileID',()=>{
  const ctx=makeContext();
  const active=attachmentRow('active');
  const removed=attachmentRow('removed');removed[0]='33333333-3333-4333-8333-333333333333';
  const sheet=new FakeSheet([Array.from(ctx.EVENT_ATTACHMENT_HEADERS),active,removed],13);
  const main=new FakeSheet([Array(39).fill(''),mainEventRow()],39);

  ctx.requireAuth_=()=>({email:'viewer@example.test',role:'Staff',status:'active'});
  ctx.getSheetByIdOrName_=()=>main;
  ctx.findEventRowById_=()=>2;
  ctx.getDb_=()=>({getSheetByName:()=>sheet});

  const list=ctx.listEventAttachments('token','11111111-1111-4111-8111-111111111111');
  assert.equal(list.length,1);
  assert.equal(list[0].attachmentId,'22222222-2222-4222-8222-222222222222');
  assert.equal(Object.hasOwn(list[0],'fileId'),false);

  const listBlock=source.match(/function listEventAttachments[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.doesNotMatch(listBlock,/fileId\s*:/);
});

test('private download is authenticated, audited, and returns content rather than a Drive URL',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array.from(ctx.EVENT_ATTACHMENT_HEADERS),attachmentRow('active')],13);
  const main=new FakeSheet([Array(39).fill(''),mainEventRow()],39);
  const audits=[];
  const bytes=Array.from(Buffer.from('%PDF-test'));

  ctx.requireAuth_=()=>({email:'viewer@example.test',role:'Staff',status:'active'});
  ctx.getSheet_=(name)=>{assert.equal(name,'EventAttachments');return sheet};
  ctx.getSheetByIdOrName_=()=>main;
  ctx.findEventRowById_=()=>2;
  ctx.DriveApp={getFileById:id=>{
    assert.equal(id,'drive-file-id');
    return {
      getName:()=> 'stored.pdf',
      getBlob:()=>({getBytes:()=>bytes,getContentType:()=> 'application/pdf'})
    };
  }};
  ctx.writeAudit_=(...args)=>audits.push(args);

  const result=ctx.downloadEventAttachment('token','22222222-2222-4222-8222-222222222222');
  assert.equal(result.fileName,'หลักฐาน.pdf');
  assert.equal(result.mimeType,'application/pdf');
  assert.equal(Buffer.from(result.base64,'base64').toString(),'%PDF-test');
  assert.equal(Object.hasOwn(result,'fileId'),false);
  assert.equal(Object.hasOwn(result,'url'),false);
  assert.equal(audits[0][1],'DOWNLOAD_EVENT_ATTACHMENT');
});

test('remove is logical, revision-safe and preserves the Drive file',()=>{
  const ctx=makeContext();
  const metadata=new FakeSheet([Array.from(ctx.EVENT_ATTACHMENT_HEADERS),attachmentRow('active')],13);
  const main=new FakeSheet([Array(39).fill(''),mainEventRow('active',5)],39);
  const audits=[];

  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.getDb_=()=>({});
  ctx.ensureEventAttachmentSheet_=()=>metadata;
  ctx.getSheetByIdOrName_=()=>main;
  ctx.findEventRowById_=()=>2;
  ctx.writeAudit_=(...args)=>audits.push(args);
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};

  const result=ctx.removeEventAttachment(
    'token',
    '22222222-2222-4222-8222-222222222222',
    'แนบผิดเหตุการณ์',
    5
  );

  assert.equal(result.revision,6);
  assert.equal(metadata.rows[1][7],'removed');
  assert.equal(metadata.rows[1][11],'manager@example.test');
  assert.equal(metadata.rows[1][12],'แนบผิดเหตุการณ์');
  assert.equal(main.rows[1][31],6);
  assert.equal(audits[0][1],'REMOVE_EVENT_ATTACHMENT');

  const removeBlock=source.match(/function removeEventAttachment[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.doesNotMatch(removeBlock,/setTrashed\s*\(|DriveApp\.getFileById/);
});

test('closed Events allow attachment reading but reject attachment mutation',()=>{
  const ctx=makeContext();
  const main=new FakeSheet([Array(39).fill(''),mainEventRow('closed',5)],39);
  const attachments=new FakeSheet([Array.from(ctx.EVENT_ATTACHMENT_HEADERS),attachmentRow('active')],13);

  ctx.requireAuth_=(_token,action)=>({email:'manager@example.test',role:'Manager',status:'active',action});
  ctx.getDb_=()=>({});
  ctx.getSheetByIdOrName_=()=>main;
  ctx.findEventRowById_=()=>2;
  ctx.ensureEventAttachmentSheet_=()=>attachments;
  ctx.getEventAttachmentFolder_=()=>({createFile:()=>{throw new Error('must not create')}});
  ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  ctx.writeAudit_=()=>{};

  const pdf=Buffer.from('%PDF-test');
  assert.throws(
    ()=>ctx.uploadEventAttachment('token','11111111-1111-4111-8111-111111111111',{
      name:'a.pdf',mimeType:'application/pdf',base64:pdf.toString('base64')
    },5),
    /ถูกปิดแล้ว/
  );
  assert.throws(
    ()=>ctx.removeEventAttachment('token','22222222-2222-4222-8222-222222222222','เหตุผล',5),
    /ถูกปิดแล้ว/
  );
});

test('attachment counts enrich authenticated rows using active metadata only',()=>{
  const ctx=makeContext();
  const a=attachmentRow('active');
  const b=attachmentRow('active');b[0]='33333333-3333-4333-8333-333333333333';
  const c=attachmentRow('removed');c[0]='44444444-4444-4444-8444-444444444444';
  const sheet=new FakeSheet([Array.from(ctx.EVENT_ATTACHMENT_HEADERS),a,b,c],13);
  ctx.getDb_=()=>({getSheetByName:()=>sheet});

  const rows=[{eventId:'11111111-1111-4111-8111-111111111111'}];
  const out=ctx.enrichEventAttachments_(rows);
  assert.equal(out[0].attachmentCount,2);
});

test('G-11 migration is schema-floor safe and G-05 migration remains scoped to v3',()=>{
  const g11=source.match(/function migrateG11EventAttachments[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const g05=source.match(/function migrateG05EventOwner[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(g11,/Math\.max\(existingSchemaVersion, 4\)/);
  assert.match(g05,/Math\.max\(existingSchemaVersion, 3\)/);
  assert.doesNotMatch(g05,/CONFIG\.SCHEMA_VERSION/);
});

test('G-11 browser provides private attachment workflow without Drive URLs',()=>{
  assert.match(html,/id="attachmentModal"/);
  assert.match(html,/accept="\.pdf,\.jpg,\.jpeg,\.png,\.webp,\.docx,\.xlsx"/);
  assert.match(html,/function openAttachmentModal\(i\)/);
  assert.match(html,/function uploadAttachment\(\)/);
  assert.match(html,/function downloadAttachment\(attachmentId\)/);
  assert.match(html,/function removeAttachment\(attachmentId\)/);
  assert.match(html,/downloadEventAttachment/);
  assert.match(html,/roleCanManage\(\)&&!closed/);
  assert.doesNotMatch(html,/drive\.google\.com\/file|ANYONE_WITH_LINK/);
});
