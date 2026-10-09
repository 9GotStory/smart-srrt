/**
 * Offline-only, synthetic-fixture P4 -> v7 conversion PLANNER.
 * Not a migration; no API/Google calls, I/O, or approval to process real records.
 */
import {createHash} from 'node:crypto';
import {P4_MAIN_TAIL,P4_EVENT_ATTACHMENT_HEADERS,P4_VISIT_HEADERS} from './p4-v7-schema-preflight.mjs';

export const SYNTHETIC_KIND='SMART_SRRT_SYNTHETIC_P4_FIXTURE_ONLY';
const business=['ลำดับ','วันรับแจ้ง','ผู้แจ้งข่าว/หน่วยงานที่แจ้ง','การเฝ้าระวัง','กลุ่มโรค','โรค/ภัย/เหตุการณ์','ประเภทเหตุการณ์','สถานที่เกิดเหตุ','วันที่เริ่มป่วย','หมู่','ตำบล','อำเภอ','จังหวัด','รายละเอียดเหตุการณ์','การตรวจสอบ','วิธีการตรวจสอบ','เข้าเกณฑ์สอบสวนโรค','ประเภทการสอบสวนโรค','ประเมินความเสี่ยงแจ้งเตือน','หน่วยงานแจ้งเตือน','การดำเนินการตามมาตรการ','วันที่ดำเนินการตามมาตรการ','หน่วยงานรับแจ้ง','ลงสอบสวนโรค','หมายเหตุ','วันที่ลงสอบสวนโรค','ผู้บันทึก','วันที่บันทึก/แก้ไขล่าสุด','ชื่อหมู่บ้าน','รหัสหมู่บ้าน'];
const p1=['EventID','Revision','RecordStatus','CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason'];
export const P4_MAIN=[...business,...p1,...P4_MAIN_TAIL];
export const V7_MAIN=[...business,...p1,'OwnerUserID'];
export const P4_AUDIT=['Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint'];
export const P4_ARCHIVE=['ArchiveKey',...P4_AUDIT,'ArchivedAt','ArchivedBy'];
const v7Attachment=['AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes','Description','Status','UploadedAt','UploadedBy','RemovedAt','RemovedBy','RemoveReason'];
const v7Audit=[...P4_AUDIT,'AuditID'];
const v7Visit=['Timestamp','EntryPoint','LegacyRequestParams'];
const schemas={main:P4_MAIN,attachments:P4_EVENT_ATTACHMENT_HEADERS,audit:P4_AUDIT,auditArchive:P4_ARCHIVE,visits:P4_VISIT_HEADERS};
const kinds=Object.keys(schemas);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const isFilled=x=>x!==null&&String(x).trim()!=='';
const isTimestamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x));
const fail=code=>{throw new Error('SYNTHETIC_P4_V7_'+code);};
const safeCell=x=>x===null||typeof x==='string'||typeof x==='boolean'||(typeof x==='number'&&Number.isFinite(x));
function syntheticUuid(scope,source,index){
  // UUIDv5: source row ordinal + immutable whole-snapshot fingerprint; not historical audit identity.
  const h=createHash('sha1').update(Buffer.from('6ba7b8109dad11d180b400c04fd430c8','hex')).update(scope+'/'+source+'/'+index).digest();
  h[6]=(h[6]&15)|0x50;h[8]=(h[8]&63)|0x80;
  const s=h.subarray(0,16).toString('hex');
  return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);
}
export function planSyntheticP4ToV7(data){
  if(!data||data.kind!==SYNTHETIC_KIND||data.syntheticOnly!==true||typeof data.snapshotId!=='string'||!/^synthetic-[A-Za-z0-9_-]{1,64}$/.test(data.snapshotId))fail('FIXTURE_ONLY');
  if(!data.headers||!data.rows||!Array.isArray(data.users))fail('INPUT_SHAPE');
  if(Object.keys(data.headers).sort().join('|')!==[...kinds].sort().join('|')||
     Object.keys(data.rows).sort().join('|')!==[...kinds].sort().join('|'))fail('SHEET_SET');
  for(const kind of kinds){
    const headers=data.headers[kind],rows=data.rows[kind],expected=schemas[kind];
    if(!Array.isArray(headers)||headers.length!==expected.length||!headers.every((h,i)=>h===expected[i]))fail('HEADERS');
    if(!Array.isArray(rows)||rows.some(r=>!Array.isArray(r)||r.length!==expected.length||!r.every(safeCell)))fail('ROWS');
  }
  const users=new Map();
  for(const u of data.users){
    if(!u||typeof u.userId!=='string'||!isFilled(u.userId)||typeof u.active!=='boolean'||users.has(u.userId))fail('USERS');
    users.set(u.userId,u.active);
  }
  const fingerprint=hash(kinds.map(k=>[k,data.headers[k],data.rows[k]]));
  const idScope=data.snapshotId+'/'+fingerprint;
  const findings=[],events=new Set(),attachments=new Set(),archiveKeys=new Set(),auditContent=new Set();
  const issue=(code,sheet,index)=>findings.push({code,severity:'block',sheet,rowNumber:index+2});
  const legacy={workflow:[],attachments:[],auditArchive:[],visits:[]};
  const ledger=[],main=[],att=[],active=[],archive=[];
  data.rows.main.forEach((r,i)=>{
    const eventId=r[30],revision=r[31],status=r[32],wf=r[38],owner=r[39];
    if(typeof eventId!=='string'||!uuid.test(eventId)||events.has(eventId))issue('EVENT_ID','main',i);
    else events.add(eventId);
    if(!Number.isSafeInteger(revision)||revision<1)issue('REVISION','main',i);
    if(isFilled(owner)&&users.get(owner)!==true)issue('OWNER_INACTIVE_OR_MISSING','main',i);
    legacy.workflow.push({rowNumber:i+2,eventId,workflowStatus:wf,ownerAssignedAt:r[40],closedAt:r[41],closedBy:r[42],closeReason:r[43]});
    let mapped=status,w=String(wf).toUpperCase();
    if(status==='void'){
      if(w!=='VOID'||![35,36,37].every(n=>isFilled(r[n])))issue('VOID_CONTRADICTION','main',i);
    }else if(status==='active'&&w==='CLOSED'){
      if(!isTimestamp(r[41])||!isFilled(r[42])||!isFilled(r[43]))issue('CLOSED_INCOMPLETE','main',i);
      else mapped='closed';
    }else if(status==='active'&&(w==='OPEN'||w==='IN_PROGRESS')){
      if([41,42,43].some(n=>isFilled(r[n])))issue('OPEN_CLOSURE_CONFLICT','main',i);
    }else issue('WORKFLOW_UNKNOWN','main',i);
    main.push([...r.slice(0,32),mapped,...r.slice(33,38),owner]);
  });
  data.rows.attachments.forEach((r,i)=>{
    if(typeof r[0]!=='string'||!uuid.test(r[0])||attachments.has(r[0]))issue('ATTACHMENT_ID','attachments',i);
    else attachments.add(r[0]);
    if(!events.has(r[1]))issue('ORPHAN_ATTACHMENT','attachments',i);
    if(typeof r[2]!=='string'||!isFilled(r[2]))issue('FILE_ID_MISSING','attachments',i);
    if(!Number.isSafeInteger(r[5])||r[5]<0)issue('FILE_SIZE_INVALID','attachments',i);
    if(typeof r[7]!=='string'||r[7].length>500)issue('DESCRIPTION_UNSUPPORTED','attachments',i);
    if(r[8]==='archived')issue('ARCHIVED_ATTACHMENT_POLICY_OPEN','attachments',i);
    else if(r[8]!=='active')issue('ATTACHMENT_STATUS_UNKNOWN','attachments',i);
    legacy.attachments.push({rowNumber:i+2,attachmentId:r[0],eventId:r[1],fileId:r[2],driveUrl:r[6],status:r[8],createdAt:r[9],createdBy:r[10]});
    if(r[8]==='active')att.push([r[0],r[1],r[2],r[3],r[4],r[5],r[7],'active',r[9],r[10],'','','']);
  });
  data.rows.audit.forEach((r,i)=>{
    if(!isTimestamp(r[0]))issue('AUDIT_TIMESTAMP','audit',i);
    const id=syntheticUuid(idScope,'audit',i+2);
    active.push([...r,id]);ledger.push({sheet:'audit',rowNumber:i+2,syntheticAuditId:id});
    auditContent.add(hash(r));
  });
  data.rows.auditArchive.forEach((r,i)=>{
    if(!isFilled(r[0])||archiveKeys.has(r[0]))issue('ARCHIVE_KEY_DUPLICATE_OR_BLANK','auditArchive',i);
    else archiveKeys.add(r[0]);
    const original=r.slice(1,10);
    if(!isTimestamp(original[0]))issue('ARCHIVE_TIMESTAMP','auditArchive',i);
    if(!isTimestamp(r[10])||!isFilled(r[11]))issue('ARCHIVE_PROVENANCE','auditArchive',i);
    if(auditContent.has(hash(original)))issue('AUDIT_ACTIVE_ARCHIVE_AMBIGUITY','auditArchive',i);
    const id=syntheticUuid(idScope,'auditArchive',i+2);
    archive.push([...original,id]);ledger.push({sheet:'auditArchive',rowNumber:i+2,syntheticAuditId:id});
    legacy.auditArchive.push({rowNumber:i+2,archiveKey:r[0],archivedAt:r[10],archivedBy:r[11],syntheticAuditId:id});
    issue('ARCHIVE_EXTERNAL_YEAR_POLICY_OPEN','auditArchive',i);
  });
  data.rows.visits.forEach((r,i)=>{
    legacy.visits.push({rowNumber:i+2,originalCells:[...r]});
    if(r[1]!=='doGet')issue('VISIT_ENTRY_POINT_UNKNOWN','visits',i);
    issue('HISTORICAL_REQUEST_PRIVACY_POLICY_OPEN','visits',i);
  });
  // No P4 RequestParams copied to v7 before privacy authorization.
  const candidate={
    main:{headers:V7_MAIN,rows:main},
    attachments:{headers:v7Attachment,rows:att},
    audit:{headers:v7Audit,rows:active},
    auditArchive:{headers:v7Audit,rows:archive,externalWriteAuthorized:false},
    visits:{headers:v7Visit,rows:[]}
  };
  return {kind:'SYNTHETIC_OFFLINE_PROPOSAL',status:'HOLD',migrationAuthorized:false,
    realDataAllowed:false,externalWritesPerformed:false,
    snapshotId:data.snapshotId,sourceDigest:fingerprint,candidateDigest:hash(candidate),
    candidate,legacyEvidence:legacy,auditIdentityLedger:ledger,
    counts:{source:Object.fromEntries(kinds.map(k=>[k,data.rows[k].length])),
      candidate:{main:main.length,attachments:att.length,audit:active.length,auditArchive:archive.length,visits:0}},
    findings};
}
