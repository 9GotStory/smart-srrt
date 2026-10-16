import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE = fs.readFileSync(new URL('../src/dengue/00-g1a-foundation.gs', import.meta.url), 'utf8');
function api() {
  const context = vm.createContext({Date, Number, Object, Array, String, RegExp, Error, isFinite});
  vm.runInContext(SOURCE, context, {filename:'00-g1a-foundation.gs'});
  return context;
}
const U='11111111-1111-4111-8111-111111111111';
const V='22222222-2222-4222-8222-222222222222';
const W='33333333-3333-4333-8333-333333333333';
const DIGEST='a'.repeat(64);
const request={requestId:V,principalId:'synthetic-user',operation:'dengue.case.write',payloadDigest:DIGEST};
function principal(overrides={}) {
  return {active:true,userId:'u1',capabilities:['dengue.case.read','dengue.survey.write'],
    allowedAreaIds:['area-1'],allowedEventIds:[U],...overrides};
}
function event(overrides={}) {
  return {eventId:U,ownerUserId:'u2',areaId:'area-1',
    recordStatus:'active',eligibleDisease:true,...overrides};
}

test('G1-A stays unregistered: current runtime still has 24 native files',()=>{
  const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(manifest,/src\/dengue\/00-g1a-foundation\.gs/);
  assert.match(manifest,/src\/server\/06-gemini-and-prompts\.gs/);
});

test('feature flag is false and fails closed even with a supplied config',()=>{
  const a=api();
  assert.equal(a.D331_G1A_ENABLED,false);
  assert.throws(()=>a.d331FeatureGuard_({enabled:true}),/D331_FEATURE_DISABLED/);
});

test('UUID check accepts canonical v4 and rejects prototypes/legacy event IDs',()=>{
  const a=api();
  assert.equal(a.d331IsUuid_(U),true);
  for(const value of ['',null,12,'TEST-UDN-2569-001','00000000-0000-0000-0000-000000000000',
    '__proto__','11111111111111111111111111111111']) {
    assert.equal(a.d331IsUuid_(value),false);
    assert.throws(()=>a.d331RequireUuid_(value),/D331_INVALID_ID/);
  }
  assert.equal(a.d331RequireUuid_(U.toUpperCase()),U);
});

test('revision must be a positive integer and is independently compared',()=>{
  const a=api();
  for(const value of [0,-1,1.5,'1',NaN,Infinity,null]) {
    assert.throws(()=>a.d331RequireRevision_(value),/D331_INVALID_REVISION/);
  }
  assert.equal(a.d331CheckRevision_(4,4),true);
  assert.throws(()=>a.d331CheckRevision_(4,5),/D331_STALE_REVISION/);
});

test('ISO instants round-trip strictly and impossible dates fail',()=>{
  const a=api();
  assert.equal(a.d331IsoInstant_('2026-10-16T09:00:00Z'),'2026-10-16T09:00:00.000Z');
  assert.equal(a.d331IsoInstant_('2026-10-16T09:00:00.5Z'),'2026-10-16T09:00:00.500Z');
  assert.equal(a.d331IsoInstant_(new Date('2026-10-16T09:00:00Z')),'2026-10-16T09:00:00.000Z');
  for(const value of ['2026-02-30T09:00:00Z','2026-10-16','16/10/2569',
    '2026-10-16T09:00:00+07:00','2026-10-16T24:00:00Z','2026-10-16T09:00:00.1234Z',new Date(NaN)]) {
    assert.throws(()=>a.d331IsoInstant_(value),/D331_INVALID_DATE/);
  }
});

test('local date requires real Gregorian calendar date, not BE or UTC+7 coercion',()=>{
  const a=api();
  assert.equal(a.d331LocalDate_('2026-10-16'),'2026-10-16');
  for(const value of ['2026-02-29','2026-13-16','16-10-2026','2569-10-16',null]) {
    assert.throws(()=>a.d331LocalDate_(value),/D331_INVALID_LOCAL_DATE/);
  }
});

test('HI/CI use exact numerator/denominator, zero denominator becomes null',()=>{
  const a=api();
  assert.equal(a.d331CountPair_(0,0).percent,null);
  assert.equal(a.d331CountPair_(10,0).percent,0);
  assert.equal(a.d331CountPair_(10,2).percent,20);
  for(const [n,p] of [[0,1],[2,3],[-1,0],[2,-1],[1.1,1],
    [Infinity,2],[NaN,1],['5',1],[3,'1'],[Number.MAX_SAFE_INTEGER+1,0]]) {
    assert.throws(()=>a.d331CountPair_(n,p),/D331_INVALID_COUNTS/);
  }
});

test('weighted aggregate is not mean of percentages and guards overflow',()=>{
  const a=api();
  const x=a.d331AggregateCounts_([{scopeKey:'round-1',inspected:10,positive:1},{scopeKey:'round-1',inspected:2,positive:2}],'round-1');
  assert.equal(x.inspected,12); assert.equal(x.positive,3); assert.equal(x.percent,25);
  assert.equal(a.d331AggregateCounts_([],'round-1').percent,null);
  assert.throws(()=>a.d331AggregateCounts_([{scopeKey:'round-1',inspected:Number.MAX_SAFE_INTEGER,positive:0},
    {scopeKey:'round-1',inspected:1,positive:0}],'round-1'),/D331_INVALID_COUNTS/);
});

test('schema inspector is pure, exact, and never repairs sheets',()=>{
  const a=api();
  const existing=Object.fromEntries(Object.entries(a.D331_G1A_SCHEMAS).map(([k,v])=>[k,[...v]]));
  assert.equal(a.d331InspectHeaders_(existing,1).valid,true);
  existing.DenguePlans[0]='EventID';
  assert.equal(a.d331InspectHeaders_(existing,1).valid,false);
  assert.equal(existing.DenguePlans[0],'EventID');
  delete existing.DengueFollowups;
  const result=a.d331InspectHeaders_(existing,1);
  assert.ok(result.problems.includes('DengueFollowups:MISSING'));
  assert.ok(result.problems.includes('DenguePlans:HEADER_MISMATCH'));
});

test('typed PlanID/SurveyID/FollowupID scope binding fails closed',()=>{
  const a=api();
  const parentPlan={EventID:U,PlanID:V}, parentSurvey={EventID:U,SurveyID:W};
  assert.equal(a.d331BindScopedEntity_(U,parentPlan,{EventID:U,PlanID:V},'PlanID','PlanID'),true);
  assert.equal(a.d331BindScopedEntity_(U,parentSurvey,{EventID:U,SurveyID:W},'SurveyID','SurveyID'),true);
  assert.throws(()=>a.d331BindScopedEntity_(U,parentSurvey,{EventID:U,SurveyID:V},'SurveyID','SurveyID'),/D331_FOREIGN_CHILD/);
  assert.throws(()=>a.d331BindScopedEntity_(U,parentSurvey,{EventID:V,SurveyID:W},'SurveyID','SurveyID'),/D331_FOREIGN_CHILD/);
  assert.throws(()=>a.d331BindScopedEntity_(U,{EventID:W,FollowupID:V},{EventID:U,FollowupID:V},'FollowupID','FollowupID'),/D331_FOREIGN_CHILD/);
  assert.throws(()=>a.d331BindScopedEntity_(U,parentSurvey,{EventID:U,SurveyID:W},'__proto__','SurveyID'),/D331_FOREIGN_CHILD/);
});

test('schema version, enumerations and aggregation scope are validated',()=>{
  const a=api();
  assert.equal(a.d331InspectHeaders_(a.D331_G1A_SCHEMAS,0).valid,false);
  assert.equal(a.d331InspectHeaders_(a.D331_G1A_SCHEMAS).valid,false);
  assert.equal(a.d331RequireEnum_('pending',['pending','complete']),'pending');
  assert.throws(()=>a.d331RequireEnum_('unknown',['pending','complete']),/D331_INVALID_ENUM/);
  assert.throws(()=>a.d331AggregateCounts_([{scopeKey:'a',inspected:2,positive:1},{scopeKey:'b',inspected:1,positive:0}],'a'),/D331_MIXED_SCOPE/);
  assert.throws(()=>a.d331AggregateCounts_([{scopeKey:'a',inspected:2,positive:1}]),/D331_INVALID_COUNTS/);
});

test('DTO only allows named primitive fields and serializes Date',()=>{
  const a=api();
  const record={eventId:U,updatedAt:new Date('2026-10-16T09:00:00Z'),
    count:0,caseName:'SENSITIVE',nested:{caseName:'SENSITIVE'}};
  const dto=a.d331PrimitiveDto_(record,['eventId','updatedAt','count']);
  assert.equal(dto.eventId,U);
  assert.equal(dto.updatedAt,'2026-10-16T09:00:00.000Z');
  assert.equal(dto.count,0);
  assert.equal(dto.caseName,undefined);
  assert.equal(Object.getPrototypeOf(dto),null);
  assert.throws(()=>a.d331PrimitiveDto_(record,['nested']),/D331_INVALID_DTO/);
  assert.throws(()=>a.d331PrimitiveDto_({n:Infinity},['n']),/D331_INVALID_DTO/);
  assert.throws(()=>a.d331PrimitiveDto_(record,['__proto__']),/D331_INVALID_DTO/);
});

test('RBAC and owner/area/event guard fail closed for every missing boundary',()=>{
  const a=api();
  assert.equal(a.d331Authorize_(principal(),event(),'dengue.case.read',false),true);
  assert.equal(a.d331Authorize_(principal(),event(),'dengue.survey.write',true),true);
  for(const [p,e,cap,write] of [
    [null,event(),'dengue.case.read',false],
    [principal({active:false}),event(),'dengue.case.read',false],
    [principal({capabilities:['view']}),event(),'dengue.case.read',false],
    [principal({allowedAreaIds:[]}),event(),'dengue.case.read',false],
    [principal({allowedEventIds:[]}),event(),'dengue.case.read',false],
    [principal(),event({eligibleDisease:false}),'dengue.case.read',false],
    [principal(),event({recordStatus:'void'}),'dengue.case.read',false],
    [principal(),event({recordStatus:'unknown'}),'dengue.case.read',false],
    [principal(),event({recordStatus:'closed'}),'dengue.survey.write',true],
    [principal(),event({eventId:W}),'dengue.case.read',false],
    [principal(),event(),'view',false]
  ]) assert.throws(()=>a.d331Authorize_(p,e,cap,write),/D331_FORBIDDEN/);
  assert.equal(a.d331Authorize_(principal(),event({recordStatus:'closed'}),'dengue.case.read',false),true);
});

test('explicit child relationship checks reject foreign EventID/PlanID',()=>{
  const a=api();
  const plan={eventId:U,planId:V};
  assert.equal(a.d331BindChild_(U,{eventId:U,planId:V},plan),true);
  for(const [c,p] of [
    [{eventId:W,planId:V},plan],
    [{eventId:U,planId:W},plan],
    [{eventId:U,planId:V},{eventId:W,planId:V}],
    [{eventId:U,planId:V},{eventId:U,planId:'TEST'}]
  ]) assert.throws(()=>a.d331BindChild_(U,c,p),/D331_FOREIGN_CHILD/);
});

test('request ledger forbids replay with changed digest, identity or operation',()=>{
  const a=api();
  assert.equal(a.d331RequestDecision_(null,request).decision,'reserve');
  assert.equal(a.d331RequestDecision_({...request,phase:'PENDING'},request).decision,'reconcile');
  assert.equal(a.d331RequestDecision_({...request,phase:'UNKNOWN'},request).decision,'reconcile');
  assert.equal(a.d331RequestDecision_({...request,phase:'COMMITTED'},request).decision,'replay');
  for(const field of ['payloadDigest','principalId','operation','requestId']) {
    const other={...request,[field]:field==='payloadDigest'?'b'.repeat(64):field==='requestId'?W:field==='operation'?'dengue.plan.write':'other'};
    assert.throws(()=>a.d331RequestDecision_({...request,phase:'COMMITTED'},other),/D331_IDEMPOTENCY_CONFLICT/);
  }
  assert.throws(()=>a.d331RequestDecision_({...request,phase:'FAILED'},request),/D331_INVALID_LEDGER_STATE/);
});

test('injected ambiguous write remains UNKNOWN and is never blind-retried',()=>{
  const a=api();
  const reserved={...request,phase:'PENDING'};
  const writer=()=>{throw new Error('network after business write');};
  let result;
  try{writer();}catch{result=a.d331LedgerTransition_(reserved,'AMBIGUOUS');}
  assert.equal(result.phase,'UNKNOWN');
  assert.equal(a.d331RequestDecision_(result,request).decision,'reconcile');
  assert.throws(()=>a.d331LedgerTransition_(result,'COMMIT'),/D331_RECONCILIATION_REQUIRED/);
  assert.throws(()=>a.d331LedgerTransition_(result,'RECONCILED_COMMIT'),/D331_RECONCILIATION_REQUIRED/);
  const reconciled=a.d331LedgerTransition_(result,'RECONCILED_COMMIT','AUTHORITATIVE_MATCH');
  assert.equal(reconciled.phase,'COMMITTED');
  assert.equal(a.d331RequestDecision_(reconciled,request).decision,'replay');
});

test('legacy fixture remap preserves known FK and rejects missing or duplicate IDs',()=>{
  const a=api();
  const ids={'TEST-DENGUE-001':U,'TEST-DENGUE-002':V};
  const mapped=a.d331SyntheticIdMap_(Object.keys(ids),key=>ids[key]);
  assert.equal(a.d331SyntheticFk_(mapped,'TEST-DENGUE-001'),U);
  assert.throws(()=>a.d331SyntheticFk_(mapped,'TEST-DENGUE-999'),/D331_UNKNOWN_FIXTURE_FK/);
  assert.throws(()=>a.d331SyntheticIdMap_(['TEST-DENGUE-001','TEST-DENGUE-001'],()=>U),/D331_INVALID_FIXTURE/);
  assert.throws(()=>a.d331SyntheticIdMap_(['TEST-A','TEST-B'],()=>U),/D331_INVALID_FIXTURE/);
});
