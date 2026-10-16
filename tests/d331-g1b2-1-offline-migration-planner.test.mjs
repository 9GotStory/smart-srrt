import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const PATH = '../src/dengue/';
const G1A = fs.readFileSync(new URL(PATH+'00-g1a-foundation.gs',import.meta.url),'utf8');
const B1 = fs.readFileSync(new URL(PATH+'01-g1b1-readonly-adapter.gs',import.meta.url),'utf8');
const B2 = fs.readFileSync(new URL(PATH+'02-g1b2-1-offline-migration-planner.gs',import.meta.url),'utf8');
const MANIFEST = fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');

function api(){const ctx=vm.createContext({});vm.runInContext(G1A+'\n'+B1+'\n'+B2,ctx);return ctx;}
function snapshot(a,missing=[]){
  const tables=Object.fromEntries(Object.entries(a.D331_G1A_SCHEMAS)
    .filter(([key])=>!missing.includes(key))
    .map(([key,headers])=>[key,{headers:[...headers],rowCount:0}]));
  return {moduleSchemaVersion:1,tables};
}
function preview(a,s){return a.d331B1PreviewSchema_(s);}
function environment(extra={}){
  return {targetClass:'ISOLATED_TEST',datasetClass:'SYNTHETIC_ONLY',featureEnabled:false,...extra};
}
function plan(a,s,ctx=environment()){return a.d331B2BuildPlan_(preview(a,s),ctx);}
const missingNames=['DengueCases','DenguePlans','DengueControlActions',
  'DengueEntomology','DengueContainers','DengueFollowups','DengueRequestLedger'];

test('B2 offline planner deliberately excluded from GAS runtime manifest',()=>{
  assert.doesNotMatch(MANIFEST,/src\/dengue\/02-g1b2-1-offline-migration-planner\.gs/);
  assert.doesNotMatch(MANIFEST,/src\/dengue\/0[01]-g1/);
});
test('no service APIs, writes, installer, deployment or live adapter in B2',()=>{
  assert.doesNotMatch(B2,/\b(?:SpreadsheetApp|PropertiesService|LockService|DriveApp|UrlFetchApp|ScriptApp)\s*\./);
  assert.doesNotMatch(B2,/\b(?:getDb_|ensureSheet_|installSmartSRRT|appendRow|setValues|insertSheet|deleteSheet)\s*\(/);
  assert.doesNotMatch(B2,/google\.script\.run/);
});
test('without G1A contracts the offline planner fails closed',()=>{
  const isolated=vm.createContext({});
  vm.runInContext(B2,isolated);
  assert.throws(()=>isolated.d331B2BuildPlan_({},environment()),/D331_B2_MISSING_CONTRACT/);
});
test('all 7 missing tables produce description-only candidate steps',()=>{
  const a=api(),r=plan(a,snapshot(a,missingNames));
  assert.equal(r.summary.present,0);
  assert.equal(r.summary.missing,7);
  assert.equal(r.candidateSteps.length,7);
  assert.equal(r.candidateSteps[0].kind,'DESCRIBE_MISSING_TABLE');
  assert.ok(r.candidateSteps.every(s=>s.executed===false));
  assert.equal(r.operationExecuted,false);
  assert.equal(r.canApply,false);
});
test('exact candidate headers never constitute approved physical DDL',()=>{
  const a=api(),r=plan(a,snapshot(a));
  assert.equal(r.status,'HOLD');
  assert.equal(r.summary.matching,7);
  assert.equal(r.candidateSteps.length,0);
  assert.equal(r.candidateDDLApproved,false);
  assert.equal(r.canApply,false);
  assert.equal(r.canEnable,false);
  assert.equal(r.canReadLive,false);
  assert.equal(r.canBackup,false);
  assert.equal(r.canRestore,false);
});
test('plan contains fixed blockers even in the apparently clean TEST scenario',()=>{
  const a=api(),r=plan(a,snapshot(a));
  for(const b of ['DDL_NOT_APPROVED','OPERATOR_GATE_NOT_VERIFIED',
    'TARGET_IDENTITY_NOT_ATTESTED','BACKUP_NOT_VERIFIED',
    'CLINICAL_PRIVACY_SIGNOFF_PENDING','RUNTIME_INTEGRATION_NOT_APPROVED']){
    assert.ok(r.blockers.includes(b));
  }
});
test('populated header conflict blocks migration, never returns raw header text',()=>{
  const a=api(),s=snapshot(a);
  s.tables.DengueCases.headers[0]='PRIVATE_PATIENT_NAME_12345';
  s.tables.DengueCases.rowCount=37;
  const r=plan(a,s);
  assert.equal(r.canApply,false);
  assert.ok(r.blockers.includes('HEADER_CONFLICT'));
  assert.ok(r.blockers.includes('POPULATED_CONFLICT'));
  assert.ok(r.blockers.includes('EXISTING_ROWS_REQUIRE_REVIEW'));
  assert.doesNotMatch(JSON.stringify(r),/PRIVATE_PATIENT_NAME_12345/);
});
test('missing and conflicted tables never produce write operations',()=>{
  const a=api(),s=snapshot(a,['DengueCases','DenguePlans']);
  s.tables.DengueFollowups.headers[1]='WRONG';
  const r=plan(a,s);
  assert.equal(r.candidateSteps.length,2);
  assert.equal(r.summary.conflicting,1);
  assert.ok(r.candidateSteps.every(x=>x.kind==='DESCRIBE_MISSING_TABLE'));
  assert.equal(r.operationExecuted,false);
});
test('PRODUCTION target is blocked and receives no candidate steps',()=>{
  const a=api(),r=plan(a,snapshot(a,missingNames),environment({targetClass:'PRODUCTION'}));
  assert.ok(r.blockers.includes('TARGET_NOT_ISOLATED_TEST'));
  assert.equal(r.candidateSteps.length,0);
  assert.equal(r.canApply,false);
  assert.equal(r.canReadLive,false);
});
test('missing dataset provenance is blocked (never assume TEST is synthetic)',()=>{
  const a=api(),r=plan(a,snapshot(a,missingNames),environment({datasetClass:'UNKNOWN'}));
  assert.ok(r.blockers.includes('DATASET_NOT_PROVEN_SYNTHETIC'));
  assert.equal(r.candidateSteps.length,0);
});
test('enabled feature flag always blocks even an isolated synthetic preview',()=>{
  const a=api(),r=plan(a,snapshot(a,missingNames),environment({featureEnabled:true}));
  assert.ok(r.blockers.includes('FEATURE_ENABLED'));
  assert.equal(r.candidateSteps.length,0);
  assert.equal(r.canEnable,false);
});
test('context rejects passwords, real target identifiers, approval claims',()=>{
  const a=api(),p=preview(a,snapshot(a));
  for(const context of [
    environment({spreadsheetId:'PRIVATE-SPREADSHEET-ID'}),
    environment({scriptId:'PRIVATE-SCRIPT-ID'}),
    environment({operatorApproved:true}),
    environment({backupVerified:true}),
    environment({secret:'private-token'}),
    environment({featureEnabled:'false'}),
    null
  ]){
    assert.throws(()=>a.d331B2BuildPlan_(p,context),e=>{
      assert.equal(e.message,'D331_B2_INVALID_CONTEXT');
      assert.doesNotMatch(e.message,/PRIVATE|token|SPREADSHEET/);
      return true;
    });
  }
});
test('schema version missing or unexpectedly newer blocks',()=>{
  const a=api();
  for(const version of [null,2,40]){
    const s=snapshot(a);s.moduleSchemaVersion=version;
    const r=plan(a,s);
    assert.ok(r.blockers.includes('SCHEMA_VERSION_MISMATCH'));
    assert.equal(r.canApply,false);
  }
});
test('unsafe or untrusted preview attempts to authorize apply are rejected',()=>{
  const a=api(),valid=preview(a,snapshot(a));
  for(const patch of [
    {canApply:true},{canEnable:true},{status:'READY'},
    {inspectedDataRows:true},{requiresOperatorApproval:false},
    {contract:'FAKE'}, {candidateHeadersMatch:false}
  ]){
    assert.throws(()=>a.d331B2BuildPlan_({...valid,...patch},environment()),
      /D331_B2_INVALID_PREVIEW/);
  }
});
test('corrupt preview count identities and overflow are rejected',()=>{
  const a=api(),valid=preview(a,snapshot(a));
  for(const sum of [
    {...valid.summary,expectedTables:8},
    {...valid.summary,presentTables:6},
    {...valid.summary,matchingTables:10},
    {...valid.summary,observedDataRows:Number.MAX_SAFE_INTEGER+1},
    {...valid.summary,conflictingTables:-1}
  ]){
    assert.throws(()=>a.d331B2BuildPlan_({...valid,summary:sum},environment()),
      /D331_B2_INVALID_PREVIEW/);
  }
});
test('unknown or duplicate findings are rejected rather than echoed',()=>{
  const a=api(),valid=preview(a,snapshot(a,['DengueCases']));
  for(const findings of [
    [{code:'PII',table:'DengueCases'}],
    [{code:'MISSING_TABLE',table:'unknown-private-table'}],
    [{code:'MISSING_TABLE',table:'DengueCases'}, {code:'MISSING_TABLE',table:'DengueCases'}],
    [{code:'SCHEMA_VERSION_MISMATCH',table:'DengueCases'}]
  ]){
    assert.throws(()=>a.d331B2BuildPlan_({...valid,findings},environment()),
      /D331_B2_INVALID_PREVIEW/);
  }
});
test('contradictory missing-table finding cannot invent a migration proposal',()=>{
  const a=api(),valid=preview(a,snapshot(a));
  const forged={...valid,candidateHeadersMatch:false,
    findings:[{code:'MISSING_TABLE',table:'DenguePlans'}]};
  assert.throws(()=>a.d331B2BuildPlan_(forged,environment()),
    /D331_B2_INVALID_PREVIEW/);
});
test('schema-version mismatch must be represented in sanitized findings',()=>{
  const a=api(),valid=preview(a,snapshot(a));
  const forged={...valid,observedSchemaVersion:99};
  assert.throws(()=>a.d331B2BuildPlan_(forged,environment()),
    /D331_B2_INVALID_PREVIEW/);
  const opposite={...valid,candidateHeadersMatch:false,
    findings:[{code:'SCHEMA_VERSION_MISMATCH'}]};
  assert.throws(()=>a.d331B2BuildPlan_(opposite,environment()),
    /D331_B2_INVALID_PREVIEW/);
});
test('populated conflicts must have matching header conflicts and real row counts',()=>{
  const a=api(),valid=preview(a,snapshot(a));
  for(const forged of [
    {...valid,candidateHeadersMatch:false,
      findings:[{code:'POPULATED_CONFLICT',table:'DengueCases'}]},
    {...valid,candidateHeadersMatch:false,
      findings:[{code:'HEADER_MISMATCH',table:'DengueCases'}]},
    {...valid,candidateHeadersMatch:false,
      findings:[{code:'MISSING_TABLE',table:'DengueCases'},
        {code:'HEADER_MISMATCH',table:'DengueCases'}]}
  ]){
    assert.throws(()=>a.d331B2BuildPlan_(forged,environment()),
      /D331_B2_INVALID_PREVIEW/);
  }
});

test('plan comparison detects a changed synthetic row count as stale',()=>{
  const a=api(),s=snapshot(a),p=plan(a,s);
  const now=snapshot(a);
  now.tables.DengueCases.rowCount=1;
  const result=a.d331B2ComparePlan_(p,preview(a,now));
  assert.equal(result.changed,true);
  assert.equal(result.result,'STALE_REVIEW_REQUIRED');
  assert.equal(result.canApply,false);
});
test('plan comparison detects a changed missing-table set as stale',()=>{
  const a=api(),p=plan(a,snapshot(a,['DengueCases']));
  const result=a.d331B2ComparePlan_(p,preview(a,snapshot(a,['DenguePlans'])));
  assert.equal(result.changed,true);
  assert.equal(result.canEnable,false);
});
test('comparison of unchanged previews never authorizes apply or attestation',()=>{
  const a=api(),s=snapshot(a),p=plan(a,s);
  const out=a.d331B2ComparePlan_(p,preview(a,s));
  assert.equal(out.changed,false);
  assert.equal(out.result,'SYNTHETIC_MATCH_UNVERIFIED');
  assert.equal(out.canApply,false);
});
test('planner and comparison never return any secrets or original context',()=>{
  const a=api(),s=snapshot(a);
  s.tables.DengueFollowups.headers[0]='PATIENT_NAME_DO_NOT_ECHO';
  const r=plan(a,s);
  const string=JSON.stringify(r);
  assert.doesNotMatch(string,/PATIENT_NAME_DO_NOT_ECHO|PRIVATE_SPREADSHEET|PRIVATE_SCRIPT|password/i);
  assert.equal(r.source,'UNTRUSTED_SYNTHETIC_PREVIEW');
});
test('simulated partial interruption never creates, deletes or restores data',()=>{
  const a=api(),p=plan(a,snapshot(a,missingNames));
  for(const after of [0,1,3,7]){
    const out=a.d331B2SimulateInterruption_(p,after);
    assert.equal(out.status,'HOLD');
    assert.equal(out.observedOutcome,'UNKNOWN_SYNTHETIC');
    assert.equal(out.manualReconciliationRequired,true);
    assert.equal(out.operationExecuted,false);
    assert.equal(out.rollbackAuthorized,false);
    assert.equal(out.canDelete,false);
    assert.equal(out.canApply,false);
  }
});
test('invalid simulated failure position and forged executable plan are denied',()=>{
  const a=api(),p=plan(a,snapshot(a,['DengueCases']));
  for(const after of [-1,2,3,NaN,'1',2**53]){
    assert.throws(()=>a.d331B2SimulateInterruption_(p,after),
      /D331_B2_INVALID_SIMULATION/);
  }
  assert.throws(()=>a.d331B2SimulateInterruption_({...p,canApply:true},0),
    /D331_B2_INVALID_SIMULATION/);
});
test('comparison refuses caller-forged executable plan',()=>{
  const a=api(),s=snapshot(a),p=plan(a,s);
  for(const patch of [{canApply:true},{status:'SUCCESS'},{contract:'FAKE'}, {comparisonKey:null}]){
    assert.throws(()=>a.d331B2ComparePlan_({...p,...patch},preview(a,s)),
      /D331_B2_INVALID_PLAN/);
  }
});
test('NO schema apply, backup, restore, permission or clinical SLA helpers are defined',()=>{
  const a=api();
  for(const symbol of ['d331B2Apply_','d331B2Backup_','d331B2Restore_',
    'd331B2Enable_','d331B2ReadPatients_','d331B2ComputeSla_']){
    assert.equal(typeof a[symbol],'undefined');
  }
});
