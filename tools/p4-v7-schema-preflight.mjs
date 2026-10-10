/**
 * Read-only, pure P1–P4 -> G-32 V8 Schema v7 preflight.
 *
 * THIS IS NOT A MIGRATION: callers supply header snapshots; this module never
 * reads or modifies Google Sheets, Drive, Apps Script, or production state.
 * Unknown layouts block rather than guessing column positions.
 */
export const P4_MAIN_TAIL=[
  'WorkflowStatus','OwnerUserID','OwnerAssignedAt',
  'ClosedAt','ClosedBy','CloseReason'
];
export const V7_EVENT_ATTACHMENT_HEADERS=[
  'AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes',
  'Description','Status','UploadedAt','UploadedBy','RemovedAt',
  'RemovedBy','RemoveReason'
];
export const P4_EVENT_ATTACHMENT_HEADERS=[
  'AttachmentID','EventID','FileID','FileName','MimeType','FileSize',
  'DriveUrl','Description','Status','CreatedAt','CreatedBy'
];
export const V7_VISIT_HEADERS=['Timestamp','EntryPoint','LegacyRequestParams'];
export const G29_LEGACY_VISIT_HEADERS=['Timestamp','Page','UserAgent'];
export const P4_VISIT_HEADERS=['Timestamp','Page','RequestParams'];

const clean=v=>String(v??'').trim();
const match=(actual,expected)=>expected.every((v,i)=>clean(actual[i])===v);
const result=(kind,details)=>({kind,...details});

export function assessP4ToV7Headers({main=[],attachments=[],visits=[],auditArchive=[]}={}){
  const mainHeaders=main.map(clean);
  const attachmentHeaders=attachments.map(clean);
  const visitHeaders=visits.map(clean);
  const auditHeaders=auditArchive.map(clean);
  const findings=[];
  const push=(id,severity,message)=>findings.push({id,severity,message});

  let mainLayout='absent';
  if(mainHeaders.length){
    if(mainHeaders[38]==='OwnerUserID' && !mainHeaders[39]){
      mainLayout='g7-v7';
    } else if(match(mainHeaders.slice(38,44),P4_MAIN_TAIL)){
      mainLayout='p4-v4';
      push('P4_MAIN_OWNER_OFFSET','block',
        'P4 OwnerUserID is column 40 while G-32 V8 expects column 39; preserve all legacy workflow/closure columns in a reviewed mapping.');
    } else if(!mainHeaders[38] && mainHeaders.length>=38){
      mainLayout='p1-base';
      push('MAIN_OWNER_NOT_PROVISIONED','review',
        'No event-owner column yet: verify which additive owner migration applies before changing a workbook.');
    } else {
      mainLayout='unknown';
      push('MAIN_SCHEMA_UNRECOGNIZED','block',
        'MainData columns 39+ are not a recognized P4 or Schema v7 layout. Do not reposition owner data by assumption.');
    }
  }

  let attachmentLayout='absent';
  if(attachmentHeaders.length){
    if(match(attachmentHeaders,V7_EVENT_ATTACHMENT_HEADERS)){
      attachmentLayout='g7-v7';
    } else if(match(attachmentHeaders,P4_EVENT_ATTACHMENT_HEADERS)){
      attachmentLayout='p4-v4';
      push('P4_ATTACHMENT_COLUMN_MAP','block',
        'P4 FileSize/DriveUrl/Status/CreatedAt/CreatedBy positions differ from v7 SizeBytes/Description/Status/UploadedAt/UploadedBy/Removed*.');
      push('P4_ATTACHMENT_ARCHIVE_SEMANTICS','block',
        'P4 archived status is NOT v7 removed status. Preserve history and require a reviewed retention and audit policy.');
    } else {
      attachmentLayout='unknown';
      push('ATTACHMENT_SCHEMA_UNRECOGNIZED','block',
        'Unrecognized attachment headers; do not invoke G-11 migration against this tab.');
    }
  }

  let visitLayout='absent';
  if(visitHeaders.length){
    if(match(visitHeaders,V7_VISIT_HEADERS))visitLayout='g7-v7';
    else if(match(visitHeaders,G29_LEGACY_VISIT_HEADERS)){
      visitLayout='g29-legacy';
      push('VISIT_G29_LEGACY','review',
        'G-29 migration recognizes Timestamp/Page/UserAgent but a data retention/privacy review is still required.');
    } else if(match(visitHeaders,P4_VISIT_HEADERS)){
      visitLayout='p4-v4';
      push('P4_VISIT_HEADER_UNSUPPORTED','block',
        'P4 RequestParams header is not recognized by existing G-29 VisitLogs migration. Review whether cells retain raw parameters.');
    } else {
      visitLayout='unknown';
      push('VISIT_SCHEMA_UNRECOGNIZED','block',
        'VisitLogs header layout unknown; fail closed rather than reinterpreting request metadata.');
    }
  }

  let auditLayout='absent';
  if(auditHeaders.length){
    if(auditHeaders[0]==='ArchiveKey' && auditHeaders.includes('ArchivedAt')){
      auditLayout='p4-inline-archive';
      push('P4_AUDIT_ARCHIVE_STORAGE','block',
        'P4 uses a same-workbook AuditArchive tab keyed by ArchiveKey; G-21 uses an AuditID-backed external archive. Preserve both ledgers until independently reconciled.');
    } else {
      auditLayout='unknown';
      push('AUDIT_ARCHIVE_SCHEMA_UNRECOGNIZED','block',
        'Unknown AuditArchive tab headers; archive records must not be silently discarded.');
    }
  }

  return result('p4-to-v7-offline-preflight',{
    targetSchema:7,
    layouts:{main:mainLayout,attachments:attachmentLayout,visits:visitLayout,auditArchive:auditLayout},
    hasBlockingLayouts:findings.some(f=>f.severity==='block'),
    requiresReview:findings.length>0,
    automatedMigrationAuthorized:false, // The scanner NEVER authorizes data mutation.
    findings
  });
}
