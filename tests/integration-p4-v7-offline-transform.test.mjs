import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planSyntheticP4ToV7,SYNTHETIC_KIND,P4_MAIN,P4_AUDIT,P4_ARCHIVE} from '../tools/p4-v7-offline-transform.mjs';
import {P4_EVENT_ATTACHMENT_HEADERS,P4_VISIT_HEADERS} from '../tools/p4-v7-schema-preflight.mjs';

const event='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const attachment='33333333-3333-4333-8333-333333333333';
const date='2026-10-08T10:30:00+07:00';
const actor='user@example.invalid';
const codes=p=>p.findings.map(f=>f.code);
function record(id=event) {
  const r=Array(44).fill('');
  r[30]=id;r[31]=2;r[32]='active';r[33]=date;r[34]=actor;
  r[38]='OPEN';r[39]='owner-1';return r;
}
const file=(status='active')=>[attachment,event,'synthetic-file-id','mock.pdf','application/pdf',12,
  'https://example.invalid/private','synthetic description',status,date,actor];
const audit=()=>[date,actor,'Manager','SYNTHETIC_ACTION','MainData',event,'','',''];
function sample(){
  return {kind:SYNTHETIC_KIND,syntheticOnly:true,snapshotId:'synthetic-proof-v1',
    headers:{main:[...P4_MAIN],attachments:[...P4_EVENT_ATTACHMENT_HEADERS],
      audit:[...P4_AUDIT],auditArchive:[...P4_ARCHIVE],visits:[...P4_VISIT_HEADERS]},
    rows:{main:[record()],attachments:[file()],audit:[audit()],auditArchive:[],visits:[]},
    users:[{userId:'owner-1',active:true}]};
}
test('synthetic-only marker, exact headers, scalar-only row cells',()=>{
  const a=sample();a.syntheticOnly=false;
  assert.throws(()=>planSyntheticP4ToV7(a),/FIXTURE_ONLY/);
  const b=sample();b.headers.main[38]='OwnerUserID';
  assert.throws(()=>planSyntheticP4ToV7(b),/HEADERS/);
  const c=sample();c.rows.main[0][0]={not:'allowed'};
  assert.throws(()=>planSyntheticP4ToV7(c),/ROWS/);
});
test('strict P4-v4 -> v7 layout map preserves EventID Revision Owner and attachment fields',()=>{
  const s=sample(),p=planSyntheticP4ToV7(s);
  assert.equal(p.status,'HOLD');
  assert.equal(p.migrationAuthorized,false);
  assert.equal(p.externalWritesPerformed,false);
  assert.equal(p.candidate.main.headers.length,39);
  assert.deepEqual(p.candidate.main.rows[0].slice(0,38),s.rows.main[0].slice(0,38));
  assert.equal(p.candidate.main.rows[0][38],'owner-1');
  assert.deepEqual(p.candidate.attachments.rows[0].slice(5,8),[12,'synthetic description','active']);
  assert.deepEqual(p.candidate.attachments.rows[0].slice(10),['','','']);
  assert.equal(p.candidate.audit.rows[0].length,10);
  assert.deepEqual(p.findings,[]);
});
test('CLOSED maps only with closure evidence, retains legacy history and Revision',()=>{
  const s=sample(),r=s.rows.main[0];
  r[38]='CLOSED';r[41]=date;r[42]=actor;r[43]='synthetic reason';
  const p=planSyntheticP4ToV7(s);
  assert.equal(p.candidate.main.rows[0][32],'closed');
  assert.equal(p.candidate.main.rows[0][31],2);
  assert.equal(p.legacyEvidence.workflow[0].closeReason,'synthetic reason');
  assert.equal(p.findings.length,0);
  r[43]='';
  const q=planSyntheticP4ToV7(s);
  assert.ok(codes(q).includes('CLOSED_INCOMPLETE'));
  assert.equal(q.candidate.main.rows[0][32],'active');
});
test('void must be consistent and original disposition evidence kept',()=>{
  const s=sample(),r=s.rows.main[0];
  r[32]='void';r[38]='VOID';r[35]=date;r[36]=actor;r[37]='synthetic';
  assert.equal(planSyntheticP4ToV7(s).candidate.main.rows[0][32],'void');
  r[37]='';
  assert.ok(codes(planSyntheticP4ToV7(s)).includes('VOID_CONTRADICTION'));
});
test('duplicates, missing/inactive owners and invalid revisions block, never repaired',()=>{
  const s=sample();s.rows.main.push(record());s.rows.main[0][31]=0;s.users[0].active=false;
  const p=planSyntheticP4ToV7(s),cs=codes(p);
  assert.ok(cs.includes('EVENT_ID'));
  assert.ok(cs.includes('REVISION'));
  assert.ok(cs.includes('OWNER_INACTIVE_OR_MISSING'));
  assert.equal(p.candidate.main.rows[0][38],'owner-1');
});
test('P4 archived attachment is not silently relabeled as V8 removed',()=>{
  const s=sample();s.rows.attachments[0][8]='archived';
  const p=planSyntheticP4ToV7(s);
  assert.ok(codes(p).includes('ARCHIVED_ATTACHMENT_POLICY_OPEN'));
  assert.equal(p.candidate.attachments.rows.length,0);
  assert.equal(p.legacyEvidence.attachments[0].status,'archived');
});
test('orphan attachment, invalid bytes, and unknown status block',()=>{
  const s=sample();s.rows.attachments[0][1]=other;s.rows.attachments[0][5]='12KB';s.rows.attachments[0][8]='deleted';
  const cs=codes(planSyntheticP4ToV7(s));
  assert.ok(cs.includes('ORPHAN_ATTACHMENT'));
  assert.ok(cs.includes('FILE_SIZE_INVALID'));
  assert.ok(cs.includes('ATTACHMENT_STATUS_UNKNOWN'));
});
test('duplicate audit text gets two distinct stable synthetic UUIDs',()=>{
  const s=sample();s.rows.audit.push(audit());
  const p=planSyntheticP4ToV7(s);
  assert.notEqual(p.candidate.audit.rows[0][9],p.candidate.audit.rows[1][9]);
  assert.equal(p.auditIdentityLedger.length,2);
});
test('P4 archived audit holds external policy and preserves provenance',()=>{
  const s=sample(),r=audit();r[5]=other;
  s.rows.auditArchive.push(['synthetic-key',...r,date,actor]);
  const p=planSyntheticP4ToV7(s);
  assert.ok(codes(p).includes('ARCHIVE_EXTERNAL_YEAR_POLICY_OPEN'));
  assert.equal(p.candidate.auditArchive.externalWriteAuthorized,false);
  assert.equal(p.legacyEvidence.auditArchive[0].archiveKey,'synthetic-key');
});
test('duplicate archive key, active/archive ambiguity and invalid date block',()=>{
  const s=sample();
  s.rows.auditArchive.push(['same',...audit(),date,actor],['same',...audit(),date,actor]);
  const cs=codes(planSyntheticP4ToV7(s));
  assert.ok(cs.includes('ARCHIVE_KEY_DUPLICATE_OR_BLANK'));
  assert.ok(cs.includes('AUDIT_ACTIVE_ARCHIVE_AMBIGUITY'));
  const t=sample();t.rows.audit[0][0]='invalid';
  t.rows.auditArchive.push(['key',...audit(),'bad',actor]);
  const dc=codes(planSyntheticP4ToV7(t));
  assert.ok(dc.includes('AUDIT_TIMESTAMP'));
  assert.ok(dc.includes('ARCHIVE_PROVENANCE'));
});
test('historical P4 RequestParams is only in private evidence, not public diagnostics or target',()=>{
  const s=sample();s.rows.visits.push([date,'doGet','SYNTHETIC_PRIVATE_PARAM']);
  const p=planSyntheticP4ToV7(s);
  assert.ok(codes(p).includes('HISTORICAL_REQUEST_PRIVACY_POLICY_OPEN'));
  assert.equal(p.candidate.visits.rows.length,0);
  assert.equal(p.legacyEvidence.visits[0].originalCells[2],'SYNTHETIC_PRIVATE_PARAM');
  assert.doesNotMatch(JSON.stringify(p.findings),/SYNTHETIC_PRIVATE_PARAM/);
  const t=sample();t.rows.visits.push([date,'unknown','']);
  assert.ok(codes(planSyntheticP4ToV7(t)).includes('VISIT_ENTRY_POINT_UNKNOWN'));
});
test('offline rerun is fully deterministic and nonmutating',()=>{
  const s=sample(),before=structuredClone(s),first=planSyntheticP4ToV7(s),next=planSyntheticP4ToV7(s);
  assert.deepEqual(first,next);
  assert.deepEqual(s,before);
});
test('changed snapshot invalidates synthetic audit identity ledger and source digest',()=>{
  const s=sample(),first=planSyntheticP4ToV7(s);
  s.rows.main[0][5]='synthetic changed label';
  const next=planSyntheticP4ToV7(s);
  assert.notEqual(first.sourceDigest,next.sourceDigest);
  assert.notEqual(first.auditIdentityLedger[0].syntheticAuditId,next.auditIdentityLedger[0].syntheticAuditId);
});
test('source code contains no Google or network runtime invocation',()=>{
  const s=fs.readFileSync(new URL('../tools/p4-v7-offline-transform.mjs',import.meta.url),'utf8');
  for(const name of ['DriveApp.','SpreadsheetApp.','UrlFetchApp.','PropertiesService.','google.script.run','fetch('])
    assert.equal(s.includes(name),false);
});

test('invalid ISO calendar dates cannot be silently normalized',()=>{
  const s=sample();
  s.rows.audit[0][0]='2026-02-30T10:00:00+07:00';
  assert.ok(codes(planSyntheticP4ToV7(s)).includes('AUDIT_TIMESTAMP'));
  s.rows.audit[0][0]='2026-02-28T10:00:00+07:00';
  assert.equal(codes(planSyntheticP4ToV7(s)).includes('AUDIT_TIMESTAMP'),false);
});
test('user status changes invalidate snapshot fingerprint and synthetic identity allocations',()=>{
  const s=sample(),before=planSyntheticP4ToV7(s);
  s.users[0].active=false;
  const after=planSyntheticP4ToV7(s);
  assert.notEqual(before.sourceDigest,after.sourceDigest);
  assert.notEqual(before.auditIdentityLedger[0].syntheticAuditId,after.auditIdentityLedger[0].syntheticAuditId);
  assert.ok(codes(after).includes('OWNER_INACTIVE_OR_MISSING'));
});
