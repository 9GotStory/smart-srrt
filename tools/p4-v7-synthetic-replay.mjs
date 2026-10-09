/**
 * In-memory partial-copy/crash/replay rehearsal. SYNTHETIC FIXTURES ONLY.
 * Never run on real records or a real workbook. No FS, network, Apps Script,
 * Google Drive, destination writer, deployment, or release-authorizing path.
 * "preview_complete" describes a disposable memory target, NOT migration.
 */
import {createHash} from 'node:crypto';
import {V7_MAIN, P4_AUDIT} from './p4-v7-offline-transform.mjs';

export const SYNTHETIC_TARGET_KIND='SMART_SRRT_SYNTHETIC_DISPOSABLE_TARGET_V1';
const NAMES=['main','attachments','audit'];
const ATTACHMENT_HEADERS=[
  'AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes','Description',
  'Status','UploadedAt','UploadedBy','RemovedAt','RemovedBy','RemoveReason'
];
const EXPECTED={
  main:V7_MAIN,
  attachments:ATTACHMENT_HEADERS,
  audit:[...P4_AUDIT,'AuditID']
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[0-9a-f]{64}$/i;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=code=>{throw new Error('SYNTHETIC_RECOVERY_'+code);};
function object(x,keys,code) {
  if(!x||typeof x!=='object'||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)fail(code);
  if(Object.keys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(x,k)))fail(code);
}
const scalar=x=>x===null||typeof x==='string'||typeof x==='boolean'||(typeof x==='number'&&Number.isFinite(x));
function table(t,name,expectedRows) {
  object(t,['headers','rows'],'TABLE_SHAPE');
  const heads=EXPECTED[name];
  if(!Array.isArray(t.headers)||t.headers.length!==heads.length||
     !t.headers.every((x,i)=>x===heads[i]))fail('SCHEMA_MISMATCH');
  if(!Array.isArray(t.rows)||t.rows.some(r=>!Array.isArray(r)||
      r.length!==heads.length||!r.every(scalar)))fail('ROW_SHAPE');
  if(expectedRows && t.rows.length!==expectedRows.length)fail('COUNT_MISMATCH');
}
function planCheck(plan) {
  if(!plan||plan.kind!=='SYNTHETIC_OFFLINE_PROPOSAL'||plan.status!=='HOLD'||
     plan.migrationAuthorized!==false||plan.realDataAllowed!==false||
     plan.externalWritesPerformed!==false||
     typeof plan.snapshotId!=='string'||!/^synthetic-[A-Za-z0-9_-]{1,64}$/.test(plan.snapshotId)||
     typeof plan.sourceDigest!=='string'||!HEX.test(plan.sourceDigest)||
     typeof plan.candidateDigest!=='string'||!HEX.test(plan.candidateDigest))fail('FIXTURE_ONLY');
  if(!Array.isArray(plan.findings)||plan.findings.length!==0)fail('SOURCE_HOLDS');
  if(!plan.candidate||typeof plan.candidate!=='object'||
     Object.keys(plan.candidate).sort().join('|')!==
       ['main','attachments','audit','auditArchive','visits'].sort().join('|'))fail('CANDIDATE_SHAPE');
  if(sha(plan.candidate)!==plan.candidateDigest)fail('CANDIDATE_DIGEST');
  if(!plan.legacyEvidence||!Array.isArray(plan.legacyEvidence.auditArchive)||
     !Array.isArray(plan.legacyEvidence.visits)||
     plan.legacyEvidence.auditArchive.length||plan.legacyEvidence.visits.length)fail('UNRESOLVED_HISTORY');
  for(const name of NAMES)table(plan.candidate[name],name);
  if(!plan.candidate.auditArchive||!Array.isArray(plan.candidate.auditArchive.rows)||
     plan.candidate.auditArchive.rows.length||
     plan.candidate.auditArchive.externalWriteAuthorized!==false||
     !plan.candidate.visits||!Array.isArray(plan.candidate.visits.rows)||
     plan.candidate.visits.rows.length)fail('UNRESOLVED_HISTORY');
  if(!plan.counts||!plan.counts.candidate||
     NAMES.some(n=>plan.counts.candidate[n]!==plan.candidate[n].rows.length))fail('COUNT_MISMATCH');
  const eventIds=new Set(),attachmentIds=new Set(),auditIds=new Set();
  for(const r of plan.candidate.main.rows) {
    if(typeof r[30]!=='string'||!UUID.test(r[30])||eventIds.has(r[30])||
       !Number.isSafeInteger(r[31])||r[31]<1||!['active','closed','void'].includes(r[32]))fail('EVENT_IDENTITY');
    eventIds.add(r[30]);
  }
  for(const r of plan.candidate.attachments.rows) {
    if(typeof r[0]!=='string'||!UUID.test(r[0])||attachmentIds.has(r[0])||
       !eventIds.has(r[1])||r[7]!=='active')fail('ATTACHMENT_IDENTITY');
    attachmentIds.add(r[0]);
  }
  for(const r of plan.candidate.audit.rows) {
    if(typeof r[9]!=='string'||!UUID.test(r[9])||auditIds.has(r[9]))fail('AUDIT_IDENTITY');
    auditIds.add(r[9]);
  }
  if(!Array.isArray(plan.auditIdentityLedger)||
     plan.auditIdentityLedger.length!==plan.candidate.audit.rows.length||
     plan.auditIdentityLedger.some((r,i)=>r.sheet!=='audit'||r.rowNumber!==i+2||
       r.syntheticAuditId!==plan.candidate.audit.rows[i][9]))fail('AUDIT_LEDGER');
}
export function createSyntheticDisposableTarget(plan) {
  planCheck(plan);
  return {
    kind:SYNTHETIC_TARGET_KIND,
    snapshotId:plan.snapshotId,
    sourceDigest:plan.sourceDigest,
    candidateDigest:plan.candidateDigest,
    sheets:Object.fromEntries(NAMES.map(n=>[n,{headers:[...EXPECTED[n]],rows:[]}]))
  };
}
function rowMatches(a,b) {
  return a.length===b.length&&a.every((cell,i)=>Object.is(cell,b[i]));
}
function targetCheck(plan,target) {
  object(target,['kind','snapshotId','sourceDigest','candidateDigest','sheets'],'TARGET_SHAPE');
  if(target.kind!==SYNTHETIC_TARGET_KIND||target.snapshotId!==plan.snapshotId||
     target.sourceDigest!==plan.sourceDigest||target.candidateDigest!==plan.candidateDigest)fail('SNAPSHOT_MISMATCH');
  object(target.sheets,NAMES,'SHEET_SET');
  let previousComplete=true;
  for(const name of NAMES) {
    const t=target.sheets[name],expected=plan.candidate[name];
    table(t,name);
    if(t.rows.length>expected.rows.length)fail('TARGET_EXTRA_ROWS');
    if(!previousComplete&&t.rows.length)fail('NONPREFIX_REPLAY');
    for(let i=0;i<t.rows.length;i++)if(!rowMatches(t.rows[i],expected.rows[i]))fail('TARGET_CONFLICT');
    previousComplete=t.rows.length===expected.rows.length;
  }
}
function report(target,phase,newWrites,alreadyPresent) {
  const count=Object.fromEntries(NAMES.map(n=>[n,target.sheets[n].rows.length]));
  const contentHashes=Object.fromEntries(NAMES.map(n=>[n,sha(target.sheets[n])]));
  return {
    kind:'SMART_SRRT_SYNTHETIC_REPLAY_RESULT_V1',
    phase,
    status:'HOLD',
    migrationAuthorized:false,
    realDataAllowed:false,
    externalWritesPerformed:false,
    independentReviewSatisfied:false,
    sourceDigest:target.sourceDigest,
    candidateDigest:target.candidateDigest,
    targetDigest:sha(target.sheets),
    counts:count,
    tableDigests:contentHashes,
    appendedRows:newWrites,
    reusedRows:alreadyPresent,
    // Carries synthetic rows only. Never log this object with real operational data.
    target
  };
}
export function replaySyntheticPartialCopy(plan,target,options={}) {
  planCheck(plan);
  targetCheck(plan,target);
  object(options, Object.keys(options),'OPTIONS_SHAPE');
  if(Object.keys(options).some(k=>k!=='interruptAfterWrites'))fail('OPTIONS_SHAPE');
  const limit=Object.hasOwn(options,'interruptAfterWrites')?options.interruptAfterWrites:Infinity;
  if(limit!==Infinity&&(!Number.isSafeInteger(limit)||limit<0))fail('OPTIONS_SHAPE');
  const copy={
    kind:target.kind,snapshotId:target.snapshotId,
    sourceDigest:target.sourceDigest,candidateDigest:target.candidateDigest,
    sheets:Object.fromEntries(NAMES.map(n=>[n,{
      headers:[...target.sheets[n].headers],
      rows:target.sheets[n].rows.map(r=>[...r])
    }]))
  };
  let appended=0,reused=0;
  for(const name of NAMES) {
    const expected=plan.candidate[name].rows;
    const existing=copy.sheets[name].rows;
    reused+=existing.length;
    while(existing.length<expected.length) {
      if(appended>=limit)return report(copy,'interrupted',appended,reused);
      existing.push([...expected[existing.length]]);
      appended++;
    }
  }
  return report(copy,'preview_complete',appended,reused);
}
