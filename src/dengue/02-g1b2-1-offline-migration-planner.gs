/**
 * D331 G1-B2-1 — pure, SYNTHETIC/OFFLINE migration *planning*, not execution.
 *
 * NO Google Apps Script services, persistence, installers, RPCs or side effects.
 * NEVER register this file in tools/native-sources.mjs without a new Human Gate.
 * Candidate G1-A headers are NOT approved operational database DDL.
 */
var D331_B2_PLANNER_VERSION = 1;

function d331B2Names_() {
  if (typeof D331_G1A_SCHEMAS === 'undefined' ||
      !D331_G1A_SCHEMAS || typeof D331_G1A_SCHEMAS !== 'object') {
    throw new Error('D331_B2_MISSING_CONTRACT');
  }
  return Object.keys(D331_G1A_SCHEMAS);
}
function d331B2SafeCount_(v) {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
}
function d331B2ValidatePreview_(preview) {
  var names = d331B2Names_();
  if (names.length !== 7 || !preview || typeof preview !== 'object' ||
      Array.isArray(preview) ||
      preview.contract !== 'D331-B1-PREVIEW-V1' ||
      preview.status !== 'HOLD' ||
      preview.canApply !== false || preview.canEnable !== false ||
      preview.inspectedDataRows !== false ||
      preview.requiresOperatorApproval !== true ||
      preview.expectedSchemaVersion !== D331_G1A_SCHEMA_VERSION ||
      !(preview.observedSchemaVersion === null ||
        d331B2SafeCount_(preview.observedSchemaVersion)) ||
      !preview.summary || typeof preview.summary !== 'object' ||
      !Array.isArray(preview.findings) || preview.findings.length > 30 ||
      typeof preview.candidateHeadersMatch !== 'boolean') {
    throw new Error('D331_B2_INVALID_PREVIEW');
  }
  var s = preview.summary;
  var fields = ['expectedTables','presentTables','missingTables','matchingTables',
    'conflictingTables','observedDataRows'];
  if (!fields.every(function(k){return d331B2SafeCount_(s[k]);}) ||
      s.expectedTables !== 7 || s.presentTables + s.missingTables !== 7 ||
      s.matchingTables + s.conflictingTables !== s.presentTables) {
    throw new Error('D331_B2_INVALID_PREVIEW');
  }
  var findings = [], seen = Object.create(null);
  preview.findings.forEach(function(f){
    if (!f || typeof f !== 'object' || Array.isArray(f) ||
        ['SCHEMA_VERSION_MISMATCH','MISSING_TABLE','HEADER_MISMATCH',
          'DUPLICATE_HEADER','POPULATED_CONFLICT'].indexOf(f.code) < 0) {
      throw new Error('D331_B2_INVALID_PREVIEW');
    }
    var code = f.code;
    var table = '';
    if (code !== 'SCHEMA_VERSION_MISMATCH') {
      if (typeof f.table !== 'string' || names.indexOf(f.table) < 0) {
        throw new Error('D331_B2_INVALID_PREVIEW');
      }
      table = f.table;
    } else if (Object.prototype.hasOwnProperty.call(f,'table')) {
      throw new Error('D331_B2_INVALID_PREVIEW');
    }
    var key = code + ':' + table;
    if (seen[key]) throw new Error('D331_B2_INVALID_PREVIEW');
    seen[key] = true;
    findings.push({code:code,table:table});
  });
  if (preview.candidateHeadersMatch !== (findings.length === 0)) {
    throw new Error('D331_B2_INVALID_PREVIEW');
  }
  // Never echo unapproved/unknown keys from caller-provided previews.
  return {
    observedVersion:preview.observedSchemaVersion,
    summary:{
      present:s.presentTables,missing:s.missingTables,matching:s.matchingTables,
      conflicting:s.conflictingTables,dataRows:s.observedDataRows
    },
    findings:findings
  };
}
function d331B2ValidateContext_(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new Error('D331_B2_INVALID_CONTEXT');
  }
  var allowed = ['targetClass','datasetClass','featureEnabled'];
  if (Object.keys(context).some(function(k){return allowed.indexOf(k) < 0;}) ||
      typeof context.targetClass !== 'string' ||
      typeof context.datasetClass !== 'string' ||
      typeof context.featureEnabled !== 'boolean') {
    // Do not accept real spreadsheet/script IDs, secrets or caller "approval".
    throw new Error('D331_B2_INVALID_CONTEXT');
  }
  return {
    isolated:context.targetClass === 'ISOLATED_TEST',
    synthetic:context.datasetClass === 'SYNTHETIC_ONLY',
    featureOff:context.featureEnabled === false
  };
}
/** This is NOT a signature, checksum, identity or concurrency/authorization proof. */
function d331B2ComparisonKey_(sanitized) {
  return JSON.stringify([
    sanitized.observedVersion,
    sanitized.summary.present,sanitized.summary.missing,
    sanitized.summary.matching,sanitized.summary.conflicting,
    sanitized.summary.dataRows,
    sanitized.findings.map(function(f){return [f.code,f.table];}).sort(function(a,b){
      return (a[0]+a[1]).localeCompare(b[0]+b[1]);
    })
  ]);
}
function d331B2BuildPlan_(preview, context) {
  var p = d331B2ValidatePreview_(preview);
  var env = d331B2ValidateContext_(context);
  var names = d331B2Names_();
  var blockers = [
    'DDL_NOT_APPROVED',
    'OPERATOR_GATE_NOT_VERIFIED',
    'TARGET_IDENTITY_NOT_ATTESTED',
    'BACKUP_NOT_VERIFIED',
    'CLINICAL_PRIVACY_SIGNOFF_PENDING',
    'RUNTIME_INTEGRATION_NOT_APPROVED'
  ];
  if (!env.isolated) blockers.push('TARGET_NOT_ISOLATED_TEST');
  if (!env.synthetic) blockers.push('DATASET_NOT_PROVEN_SYNTHETIC');
  if (!env.featureOff) blockers.push('FEATURE_ENABLED');
  if (p.observedVersion !== D331_G1A_SCHEMA_VERSION) blockers.push('SCHEMA_VERSION_MISMATCH');
  if (p.summary.conflicting) blockers.push('HEADER_CONFLICT');
  if (p.summary.dataRows) blockers.push('EXISTING_ROWS_REQUIRE_REVIEW');
  if (p.findings.some(function(f){return f.code==='POPULATED_CONFLICT';})) {
    blockers.push('POPULATED_CONFLICT');
  }
  var candidateSteps = [];
  if (env.isolated && env.synthetic && env.featureOff) {
    names.forEach(function(name) {
      if (p.findings.some(function(f){
        return f.code === 'MISSING_TABLE' && f.table === name;
      })) {
        candidateSteps.push({
          kind:'DESCRIBE_MISSING_TABLE',
          table:name,
          executed:false
        });
      }
    });
  }
  // Never return raw header text, target IDs, patient records or supplied context.
  return {
    contract:'D331-B2-OFFLINE-PLAN-V1',
    plannerVersion:D331_B2_PLANNER_VERSION,
    status:'HOLD',
    source:'UNTRUSTED_SYNTHETIC_PREVIEW',
    candidateDDLApproved:false,
    canReadLive:false,
    canBackup:false,
    canApply:false,
    canRestore:false,
    canEnable:false,
    operationExecuted:false,
    comparisonKey:d331B2ComparisonKey_(p),
    summary:p.summary,
    blockers:blockers,
    candidateSteps:candidateSteps
  };
}
/**
 * A comparison key is only a best-effort synthetic *change detector*.
 * Never use it in place of an authoritative, locked, signed target recheck.
 */
function d331B2ComparePlan_(plan, freshPreview) {
  if (!plan || plan.contract !== 'D331-B2-OFFLINE-PLAN-V1' ||
      plan.status !== 'HOLD' || plan.canApply !== false ||
      typeof plan.comparisonKey !== 'string') {
    throw new Error('D331_B2_INVALID_PLAN');
  }
  var fresh = d331B2ValidatePreview_(freshPreview);
  var changed = plan.comparisonKey !== d331B2ComparisonKey_(fresh);
  return {status:'HOLD',changed:changed,
    result:changed?'STALE_REVIEW_REQUIRED':'SYNTHETIC_MATCH_UNVERIFIED',
    canApply:false,canEnable:false};
}
/**
 * Fault-injection model only; it does not execute planned operations and
 * cannot declare a migration successful even when zero faults are modeled.
 */
function d331B2SimulateInterruption_(plan, atStep) {
  if (!plan || plan.contract !== 'D331-B2-OFFLINE-PLAN-V1' ||
      plan.status !== 'HOLD' || plan.canApply !== false ||
      !Array.isArray(plan.candidateSteps) ||
      !d331B2SafeCount_(atStep) || atStep > plan.candidateSteps.length) {
    throw new Error('D331_B2_INVALID_SIMULATION');
  }
  return {
    status:'HOLD',
    injectedAfterDescriptions:atStep,
    observedOutcome:'UNKNOWN_SYNTHETIC',
    manualReconciliationRequired:true,
    rollbackAuthorized:false,
    canApply:false,
    canDelete:false,
    operationExecuted:false
  };
}
