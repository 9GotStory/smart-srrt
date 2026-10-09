import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessP4ToV7Headers, P4_MAIN_TAIL, V7_EVENT_ATTACHMENT_HEADERS,
  P4_EVENT_ATTACHMENT_HEADERS, V7_VISIT_HEADERS, P4_VISIT_HEADERS,
  G29_LEGACY_VISIT_HEADERS
} from '../tools/p4-v7-schema-preflight.mjs';
import fs from 'node:fs';

const mainSource=fs.readFileSync(new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs',import.meta.url),'utf8');
const normalPrefix=Array.from({length:38},(_,n)=>n<30?'legacy-business-'+n:'legacy-event-meta-'+n);
const p4Archive=[
  'ArchiveKey','Timestamp','UserEmail','Role','Action','TargetSheet',
  'TargetId','Before','After','IpHint','ArchivedAt','ArchivedBy'
];
const inspect=overrides=>assessP4ToV7Headers({
  main:[...normalPrefix,'OwnerUserID'],attachments:V7_EVENT_ATTACHMENT_HEADERS,
  visits:V7_VISIT_HEADERS,...overrides
});
const ids=x=>x.findings.map(f=>f.id);

test('V7 canonical header snapshots are compatible but never authorize migration',()=>{
  const a=inspect({});
  assert.deepEqual(a.layouts,{
    main:'g7-v7',attachments:'g7-v7',visits:'g7-v7',auditArchive:'absent'
  });
  assert.equal(a.hasBlockingLayouts,false);
  assert.equal(a.automatedMigrationAuthorized,false);
  assert.equal(a.findings.length,0);
});

test('P4 main 44-column workflow/owner placement blocks v7 column 39 assumption',()=>{
  const a=inspect({main:[...normalPrefix,...P4_MAIN_TAIL]});
  assert.equal(a.layouts.main,'p4-v4');
  assert.ok(ids(a).includes('P4_MAIN_OWNER_OFFSET'));
  assert.equal(a.hasBlockingLayouts,true);
  assert.equal(a.automatedMigrationAuthorized,false);
});

test('P4 attachment 11-column schema blocks new G11 13-column positional mapping',()=>{
  const a=inspect({attachments:P4_EVENT_ATTACHMENT_HEADERS});
  assert.equal(a.layouts.attachments,'p4-v4');
  assert.ok(ids(a).includes('P4_ATTACHMENT_COLUMN_MAP'));
  assert.ok(ids(a).includes('P4_ATTACHMENT_ARCHIVE_SEMANTICS'));
  assert.equal(a.hasBlockingLayouts,true);
});

test('P4 archived attachments cannot silently masquerade as v7 removed attachments',()=>{
  const a=inspect({attachments:P4_EVENT_ATTACHMENT_HEADERS});
  const finding=a.findings.find(x=>x.id==='P4_ATTACHMENT_ARCHIVE_SEMANTICS');
  assert.match(finding.message,/NOT v7 removed/);
});

test('P4 VisitLogs RequestParams header is not silently accepted by G29',()=>{
  const a=inspect({visits:P4_VISIT_HEADERS});
  assert.equal(a.layouts.visits,'p4-v4');
  assert.ok(ids(a).includes('P4_VISIT_HEADER_UNSUPPORTED'));
  assert.equal(a.hasBlockingLayouts,true);
});

test('G29 known legacy Page/UserAgent has explicit review, not automatic migration',()=>{
  const a=inspect({visits:G29_LEGACY_VISIT_HEADERS});
  assert.equal(a.layouts.visits,'g29-legacy');
  assert.equal(a.hasBlockingLayouts,false);
  assert.equal(a.requiresReview,true);
  assert.equal(a.automatedMigrationAuthorized,false);
});

test('P4 same-workbook AuditArchive is a separate archive ledger, not equivalent G21',()=>{
  const a=inspect({auditArchive:p4Archive});
  assert.equal(a.layouts.auditArchive,'p4-inline-archive');
  assert.ok(ids(a).includes('P4_AUDIT_ARCHIVE_STORAGE'));
  assert.equal(a.hasBlockingLayouts,true);
});

test('unrecognized v7 owner and attachment headers fail closed',()=>{
  const a=inspect({
    main:[...normalPrefix,'DifferentOwner','OwnerUserID'],
    attachments:['AttachmentID','EventID','FileID','FileName','MimeType','FileSize','Wrong']
  });
  assert.ok(ids(a).includes('MAIN_SCHEMA_UNRECOGNIZED'));
  assert.ok(ids(a).includes('ATTACHMENT_SCHEMA_UNRECOGNIZED'));
  assert.equal(a.hasBlockingLayouts,true);
});

test('Scanner is pure and does not mutate input header arrays',()=>{
  const main=[...normalPrefix,...P4_MAIN_TAIL];
  const att=[...P4_EVENT_ATTACHMENT_HEADERS];
  const snapshot=JSON.stringify({main,att});
  const a=inspect({main,attachments:att});
  assert.equal(a.hasBlockingLayouts,true);
  assert.equal(JSON.stringify({main,att}),snapshot);
});

test('Source-of-truth v7 contract still pins schema and G11 owner guard',()=>{
  assert.match(mainSource,/SCHEMA_VERSION:\s*'7'/);
  assert.match(mainSource,/var EVENT_OWNER_COL\s*=\s*39;/);
  assert.match(mainSource,/var EVENT_ATTACHMENT_HEADERS\s*=\s*\[/);
  assert.match(mainSource,/function ensureEventOwnerSchema_\(/);
  assert.match(mainSource,/function ensureEventAttachmentSheet_\(/);
});
