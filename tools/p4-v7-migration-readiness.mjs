/**
 * P4 -> v7 migration: metadata-only human gate inventory.
 *
 * Deliberately incapable of authorizing execution. Does NOT parse workbook
 * contents, patient/operational records, Apps Script settings, or real files.
 * A submitted/reviewed status is a CLAIM, not an independently verified fact.
 * This pure function is not a migration CLI or a release automation.
 */
export const READINESS_KIND = 'SMART_SRRT_P4_V7_METADATA_GATE_CHECKLIST_V1';
const GATE_FIELDS = ['state', 'evidenceDigest'];
const STATES = new Set(['missing', 'submitted', 'reviewed']);
export const READINESS_GATES = Object.freeze([
  Object.freeze({id:'source_manifest', area:'snapshot', criterion:'Pinned P4 workbook identity, exact per-sheet header/row manifest and source checksum'}),
  Object.freeze({id:'typed_source_cells', area:'snapshot', criterion:'Native Google Sheets Date/time/number/boolean cell export and lossless normalization proof'}),
  Object.freeze({id:'immutable_backup', area:'recovery', criterion:'Verified read-only source backup with restore evidence and operator-controlled destination'}),
  Object.freeze({id:'mapping_review', area:'schema', criterion:'Field-level 44-to-39 mapping, 11-to-13 attachment mapping, identity and count/hash reconciliation approved'}),
  Object.freeze({id:'closure_evidence_policy', area:'privacy', criterion:'Immutable OwnerAssignedAt, ClosedAt/By/Reason preservation, ACL and retention decision'}),
  Object.freeze({id:'archived_attachment_policy', area:'privacy', criterion:'Human-approved treatment of P4 archived attachment status without inventing v7 removal history'}),
  Object.freeze({id:'audit_archive_lineage', area:'audit', criterion:'Legacy AuditArchive ArchiveKey provenance, duplicates, AuditID identity ledger and year placement verified'}),
  Object.freeze({id:'legacy_visitlogs_privacy', area:'privacy', criterion:'Authorized retention and secure treatment of historical RequestParams with no new query collection'}),
  Object.freeze({id:'evidence_acl_retention', area:'privacy', criterion:'Restricted legacy evidence storage, data minimization, audit access and retention/erasure policy approved'}),
  Object.freeze({id:'snapshot_integrity', area:'integrity', criterion:'All source and candidate counts, hashes, EventID/Revision, owner, document and archive relations verified'}),
  Object.freeze({id:'synthetic_rehearsal', area:'recovery', criterion:'Two identical synthetic-only offline dry-run outputs with audited exceptions'}),
  Object.freeze({id:'partial_copy_recovery', area:'recovery', criterion:'Isolated disposable-target failure injection, restart/replay and no-duplication proof'}),
  Object.freeze({id:'staging_uat', area:'validation', criterion:'Authorized isolated staging validation of privacy/auth/browser/API and exact G32 report contract'}),
  Object.freeze({id:'independent_review', area:'approval', criterion:'Independent reviewer pins code SHA, independently re-runs checks and signs off findings'}),
  Object.freeze({id:'operator_approval', area:'approval', criterion:'Explicit authorized operator decision after backup, policy, replay and independent review'})
]);
const IDS = new Set(READINESS_GATES.map(x=>x.id));
const DIGEST=/^[a-f0-9]{64}$/i;
function bad() {throw new Error('P4_V7_READINESS_METADATA_ONLY_INVALID_INPUT');}
function exactKeys(o, allowed) {
  if(o===null || typeof o!=='object' || Array.isArray(o) || Object.getPrototypeOf(o)!==Object.prototype) bad();
  if(Object.keys(o).some(k=>!allowed.includes(k))) bad();
}
export function assessP4V7MigrationReadiness(input={}) {
  exactKeys(input, ['kind','checks']);
  if(input.kind!==READINESS_KIND)bad();
  if(input.checks===undefined)bad();
  exactKeys(input.checks, [...IDS]);
  const reported=[];
  for (const gate of READINESS_GATES) {
    const item=Object.hasOwn(input.checks,gate.id)?input.checks[gate.id]:null;
    if(item!==null){
      exactKeys(item,GATE_FIELDS);
      if(!STATES.has(item.state))bad();
      if(item.state==='missing' && Object.hasOwn(item,'evidenceDigest'))bad();
      if(item.state!=='missing' && (typeof item.evidenceDigest!=='string' || !DIGEST.test(item.evidenceDigest)))bad();
    }
    const state=item===null?'missing':item.state;
    // No arbitrary evidence text, secrets, URLs, workbook IDs or row values are returned.
    reported.push({id:gate.id,area:gate.area,state,criterion:gate.criterion});
  }
  const missing=reported.filter(x=>x.state==='missing');
  const submitted=reported.filter(x=>x.state==='submitted');
  const reviewed=reported.filter(x=>x.state==='reviewed');
  return {
    kind:'SMART_SRRT_P4_V7_READINESS_REPORT_V1',
    status:'HOLD',
    assessmentIsSelfReported:true,
    independentApprovalVerified:false,
    migrationAuthorized:false,
    realDataExportAuthorized:false,
    googleWorkspaceMutationAuthorized:false,
    stagingDeploymentAuthorized:false,
    mergeAuthorized:false,
    cannotAuthorizeViaThisTool:true,
    reportedGateCount:READINESS_GATES.length,
    summary:{missing:missing.length,submitted:submitted.length,reviewed:reviewed.length},
    openGateIds:[...missing,...submitted].map(x=>x.id),
    // "reviewed" only means caller provided the text claim, not genuine sign-off.
    claimsOnly:reported,
    nextRequiredAction:'Independent human review plus approved migration plan; never execute through this checker'
  };
}
