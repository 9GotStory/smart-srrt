import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const paths=[
  '../src/dengue/00-g1a-foundation.gs',
  '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
  '../src/dengue/11-p0-06-offline-workflow-engine.gs'
];
const sources=paths.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const context=vm.createContext({});
sources.forEach((src,i)=>vm.runInContext(src,context,{filename:paths[i]}));
const uid=n=>n.toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111';
const EVENT=uid(99);
const NOW='2026-10-18T00:00:00.000Z';
const AREA='area-A';

function row(sheet,override={}){
 const spec=Array.from(context.d331P002aSpec_(sheet));
 return spec.map(([name,type,needed],i)=>{
  if(Object.hasOwn(override,name))return override[name];
  if(needed!=='Y')return '';
  if(type==='UUID')return uid(100+i);
  if(type==='UTC')return NOW;
  if(type==='Date')return '2026-10-18';
  if(type==='Int+')return 1;
  if(type==='UInt')return 0;
  if(type==='UserID')return 'synthetic-user';
  if(type==='AreaID')return AREA;
  if(type==='Text')return 'TEST-ONLY-NOT-AUTHORIZED';
  if(type==='Opaque')return 'TEST-REF';
  if(type==='SHA256')return 'a'.repeat(64);
  if(type==='Enum'){
   const allowed=context.D331_P002A_SCOPED_ENUMS_[sheet]?.[name]||
     context.D331_P002A_ENUMS_[name];
   assert.ok(allowed?.length, 'enum '+name);
   return allowed[0];
  }
  throw Error('Unexpected '+type);
 });
}
const cases=(o={})=>row('DengueCases',{
 CaseID:uid(1),EventID:EVENT,CaseStatus:'ACTIVE',Classification:'SUSPECTED',
 ...o
});
const plans=(o={})=>row('DenguePlans',{
 PlanID:uid(2),EventID:EVENT,TriggerCaseID:uid(1),
 PlanStatus:'OPEN',PolicyVersion:'TEST-POLICY-NOT-APPROVED',AreaID:AREA,
 ...o
});
const actions=(o={})=>row('DengueControlActions',{
 ActionID:uid(3),EventID:EVENT,PlanID:uid(2),
 ActionStatus:'COMPLETED',StageKey:'DAY_3',ActivityType:'LARVAL_CONTROL',
 ScopeCode:'COMMUNITY',AreaID:AREA,CompletedAtUTC:NOW,OutcomeCode:'DONE',
 ...o
});
const surveys=(o={})=>row('DengueEntomology',{
 SurveyID:uid(4),EventID:EVENT,PlanID:uid(2),AreaID:AREA,
 SurveyStatus:'FINAL',CheckpointKey:'DAY_3',SurveyedAtUTC:NOW,
 ScopeCode:'COMMUNITY',HousesInspected:10,HousesPositive:2,
 ContainersInspected:20,ContainersPositive:4,
 ...o
});
const followups=(o={})=>row('DengueFollowups',{
 FollowupID:uid(5),EventID:EVENT,PlanID:uid(2),
 CheckpointKey:'DAY_3',FollowupStatus:'COMPLETE',DueAtUTC:NOW,
 CompletedAtUTC:NOW,OutcomeCode:'DONE',
 LinkedActionID:uid(3),LinkedSurveyID:uid(4),
 ...o
});
function snapshot(override={}){
 return {schemaVersion:2,eventId:EVENT,areaId:AREA,
  cases:[cases()],plans:[plans()],actions:[actions()],
  surveys:[surveys()],followups:[followups()],...override};
}
function evaluate(s){return JSON.parse(JSON.stringify(context.d331P006EvaluateOffline_(s)));}
function denied(s){assert.throws(()=>evaluate(s),/^Error: D331_P006_WORKFLOW_DENIED$/);}

test('P0-06 only pure, private offline GS source; native feature remains disabled',()=>{
 const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/11-p0-06-offline-workflow-engine/);
 assert.match(fs.readFileSync(new URL('../src/dengue/00-g1a-foundation.gs',import.meta.url),'utf8'),
  /D331_G1A_ENABLED = false/);
 const src=sources.at(-1).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(src,/\b(?:SpreadsheetApp|PropertiesService|CacheService|DriveApp|LockService|ScriptApp|UrlFetchApp|google)\b/);
 assert.match(src,/SYNTHETIC_WORKFLOW_ONLY/);
 assert.doesNotMatch(src,/function\s+(?!d331\w+_)\w+\s*\(/);
});
test('complete synthetic five-table workflow validates relationships and percentages',()=>{
 const output=evaluate(snapshot());
 assert.deepEqual(output,{
  status:'SYNTHETIC_WORKFLOW_ONLY',canWrite:false,canEnable:false,
  clinicalPolicyApproved:false,
  counts:{cases:1,plans:1,actions:1,surveys:1,followups:1},
  surveyMetrics:[{checkpoint:'DAY_3',scope:'COMMUNITY',hiPercent:20,ciPercent:20}],
  slaAssessment:'NOT_EVALUATED'
 });
});
test('empty five-domain snapshot yields zero workflow, never permission to write',()=>{
 const output=evaluate(snapshot({cases:[],plans:[],actions:[],surveys:[],followups:[]}));
 assert.deepEqual(output.counts,{cases:0,plans:0,actions:0,surveys:0,followups:0});
 assert.deepEqual(output.surveyMetrics,[]);
 assert.equal(output.canWrite,false);
});
test('surveys with zero houses/containers give UNKNOWN rather than zero',()=>{
 const out=evaluate(snapshot({surveys:[surveys({
   HousesInspected:0,HousesPositive:0,ContainersInspected:0,ContainersPositive:0
 })]}));
 assert.equal(out.surveyMetrics[0].hiPercent,null);
 assert.equal(out.surveyMetrics[0].ciPercent,null);
});
test('only the zero-denominator index is unknown',()=>{
 const out=evaluate(snapshot({surveys:[surveys({
   HousesInspected:0,HousesPositive:0,ContainersInspected:8,ContainersPositive:2
 })]}));
 assert.equal(out.surveyMetrics[0].hiPercent,null);
 assert.equal(out.surveyMetrics[0].ciPercent,25);
});
test('duplicate identity in every domain is rejected',()=>{
 for(const key of ['cases','plans','actions','surveys','followups']){
  const s=snapshot();s[key].push([...s[key][0]]);
  denied(s);
 }
});
test('orphan plan cannot reference absent CaseID',()=>{
 denied(snapshot({plans:[plans({TriggerCaseID:uid(90)})]}));
 denied(snapshot({cases:[]}));
});
test('plan with OPEN status cannot point to voided trigger case',()=>{
 denied(snapshot({cases:[cases({CaseStatus:'VOID'})]}));
});
test('orphan action, survey or followup cannot reference nonexistent PlanID',()=>{
 denied(snapshot({actions:[actions({PlanID:uid(90)})]}));
 denied(snapshot({surveys:[surveys({PlanID:uid(90)})]}));
 denied(snapshot({followups:[followups({PlanID:uid(90)})]}));
});
test('cross-event data never attaches to requested event',()=>{
 denied(snapshot({cases:[cases({EventID:uid(88)})]}));
 denied(snapshot({plans:[plans({EventID:uid(88)})]}));
 denied(snapshot({actions:[actions({EventID:uid(88)})]}));
 denied(snapshot({surveys:[surveys({EventID:uid(88)})]}));
 denied(snapshot({followups:[followups({EventID:uid(88)})]}));
});
test('cross-area plan, activity and survey are denied',()=>{
 denied(snapshot({plans:[plans({AreaID:'area-B'})]}));
 denied(snapshot({actions:[actions({AreaID:'area-B'})]}));
 denied(snapshot({surveys:[surveys({AreaID:'area-B'})]}));
});
test('followup linked activity and survey must exist and belong to same plan',()=>{
 denied(snapshot({followups:[followups({LinkedActionID:uid(80)})]}));
 denied(snapshot({followups:[followups({LinkedSurveyID:uid(80)})]}));
 const other=plans({PlanID:uid(8)});
 denied(snapshot({plans:[plans(),other],actions:[actions({PlanID:uid(8)})]}));
 denied(snapshot({plans:[plans(),other],surveys:[surveys({PlanID:uid(8)})]}));
});
test('invalid survey numerator > denominator or negative counts rejected',()=>{
 denied(snapshot({surveys:[surveys({HousesInspected:3,HousesPositive:4})]}));
 denied(snapshot({surveys:[surveys({ContainersInspected:1,ContainersPositive:2})]}));
 denied(snapshot({surveys:[surveys({HousesInspected:-1})]}));
 denied(snapshot({surveys:[surveys({HousesInspected:'10'})]}));
});
test('incomplete completed activity, followup or FINAL survey rejected',()=>{
 denied(snapshot({actions:[actions({CompletedAtUTC:''})]}));
 denied(snapshot({followups:[followups({OutcomeCode:''})]}));
 denied(snapshot({surveys:[surveys({SurveyedAtUTC:''})]}));
});
test('invalid schema and unrecognized client supplied authority denied',()=>{
 denied(snapshot({schemaVersion:1}));
 denied(snapshot({eventId:'legacy-event'}));
 denied(snapshot({areaId:''}));
 denied({...snapshot(),role:'Super Admin'});
 denied({...snapshot(),approvedGrant:{approved:true}});
 denied({...snapshot(),clinicalPolicy:{signed:true}});
 denied({...snapshot(),timerThresholdHours:3});
});
test('malformed rows, unavailable groups and 501-row cap fail closed',()=>{
 denied(snapshot({surveys:null}));
 denied(snapshot({plans:undefined}));
 denied(snapshot({cases:[[uid(1)]]}));
 denied(snapshot({cases:Array.from({length:501},()=>cases())}));
});
test('no patient narrative, user, event ID, reference or clinical SLA leaks',()=>{
 const s=snapshot({actions:[actions({EvidenceRef:'PRIVATE_TEST_REFERENCE'})]});
 const out=JSON.stringify(evaluate(s));
 for(const token of [EVENT,AREA,'synthetic-user','PRIVATE_TEST_REFERENCE',
   'TEST-POLICY-NOT-APPROVED','on_time','breach']){
  assert.equal(out.includes(token),false,token);
 }
 assert.ok(out.includes('NOT_EVALUATED'));
});
