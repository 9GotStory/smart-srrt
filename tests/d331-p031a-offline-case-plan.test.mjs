import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAS_HTML_SOURCES,GAS_SERVER_SOURCES} from '../tools/native-sources.mjs';

const read = p => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source = read('src/web/03n-client-d331-case-plan-offline.html');
const canonical = read('src/web/03m-client-d331-mvp01-offline.html');
const extract = s => {
  const match=s.match(/<script>\n([\s\S]*?)\n<\/script>/);
  assert.ok(match,'expected one offline script');return match[1];
};
const EVENT='00000000-0000-4000-8000-000000002300';
const CASE='00000000-0000-4000-8000-000000002301';
function harness(){
  const context=vm.createContext({Promise,Date});
  new vm.Script(extract(canonical)).runInContext(context,{timeout:1000});
  new vm.Script(extract(source)).runInContext(context,{timeout:1000});
  const cases=context.d331P023OfflineCaseWorkspace_.createModel();
  return {cases,plans:context.d331P031aOfflineCasePlan_.createModel(cases),context};
}

test('P0-31A remains UNREGISTERED and has no network, GAS, persistence or real-data binding',()=>{
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,17);
  assert.equal(GAS_HTML_SOURCES.includes('src/web/03n-client-d331-case-plan-offline.html'),false);
  assert.doesNotMatch(source,/google\.script|SpreadsheetApp|PropertiesService|XMLHttpRequest|WebSocket|\bfetch\s*\(|localStorage|sessionStorage|allData|\bgetDb_\s*\(/);
  assert.match(source,/SYNTHETIC_PLAN_ONLY/);
  assert.match(source,/NOT_EVALUATED/);
});

test('P0-31A uses the existing synthetic Case seed and creates an event-linked mock Plan',async()=>{
  const h=harness();
  assert.equal(h.cases.snapshot().cases[0].caseId,CASE);
  h.plans.beginPlan(EVENT,CASE);
  h.plans.setEpisodeKey('TEST-EP-1');
  const saving=h.plans.save();
  assert.equal(h.plans.snapshot().busy,true);
  assert.equal((await h.plans.save()).status,'BUSY');
  assert.equal((await saving).status,'SYNTHETIC_PLAN_SAVED');
  const state=h.plans.snapshot();
  assert.equal(state.plans.length,1);
  assert.equal(state.plans[0].eventId,EVENT);
  assert.equal(state.plans[0].triggerCaseId,CASE);
  assert.equal(state.plans[0].episodeKey,'TEST-EP-1');
  assert.equal(state.plans[0].planStatus,'OPEN');
  assert.equal(state.plans[0].planRevision,1);
  assert.equal(state.canEnable,false);
  assert.equal(state.canWrite,false);
  assert.equal(state.canReadPatientData,false);
  assert.equal(state.slaAssessment,'NOT_EVALUATED');
});

test('P0-31A denies foreign event, unknown/invalid/VOID Case references and invalid episode',()=>{
  const h=harness();
  for(const [event,caseId] of [
    ['00000000-0000-4000-8000-000000002399',CASE],
    [EVENT,'00000000-0000-4000-8000-000000002399'],
    [EVENT,'00000000-0000-4000-8000-000000002300'],
    [EVENT,'patient-case-id']
  ])assert.throws(()=>h.plans.beginPlan(event,caseId),/SYNTHETIC_ONLY/);
  h.plans.beginPlan(EVENT,CASE);
  for(const episode of ['real case','TEST-EP-9999','TEST-EP-1\nINJECT'])
    assert.throws(()=>h.plans.setEpisodeKey(episode),/SYNTHETIC_ONLY/);
  assert.throws(()=>h.plans.save(),/SYNTHETIC_ONLY/);
  const voidSource={snapshot:()=>({...h.cases.snapshot(),
    cases:[{...h.cases.snapshot().cases[0],caseStatus:'VOID'}]}),reset:()=>{}};
  const voidPlans=h.context.d331P031aOfflineCasePlan_.createModel(voidSource);
  assert.throws(()=>voidPlans.beginPlan(EVENT,CASE),/SYNTHETIC_ONLY/);
  assert.throws(()=>h.context.d331P031aOfflineCasePlan_.createModel({snapshot:()=>({status:'READ_ONLY'}),reset:()=>{}}),/SYNTHETIC_ONLY/);
});

test('P0-31A duplicate Plan for same Case/Episode is denied; copy-out cannot mutate state',async()=>{
  const h=harness();
  h.plans.beginPlan(EVENT,CASE);
  h.plans.setEpisodeKey('TEST-EP-2');
  assert.equal((await h.plans.save()).status,'SYNTHETIC_PLAN_SAVED');
  const view=h.plans.snapshot();view.plans[0].episodeKey='tampered';
  assert.equal(h.plans.snapshot().plans[0].episodeKey,'TEST-EP-2');
  h.plans.beginPlan(EVENT,CASE);h.plans.setEpisodeKey('TEST-EP-2');
  assert.throws(()=>h.plans.save(),/SYNTHETIC_ONLY/);
  h.plans.cancel();
});

test('P0-31A reset invalidates queued asynchronous saves without resurrecting rows',async()=>{
  const h=harness();
  h.plans.beginPlan(EVENT,CASE);h.plans.setEpisodeKey('TEST-EP-3');
  const old=h.plans.save();h.plans.reset();
  assert.equal((await old).status,'STALE');
  assert.equal(h.plans.snapshot().plans.length,0);
  assert.equal(h.plans.snapshot().busy,false);
});

test('P0-31A dispose clears draft and queued save and blocks any later operation',async()=>{
  const h=harness();
  h.plans.beginPlan(EVENT,CASE);h.plans.setEpisodeKey('TEST-EP-4');
  const old=h.plans.save();h.plans.dispose();
  assert.equal((await old).status,'STALE');
  assert.throws(()=>h.plans.snapshot(),/SYNTHETIC_ONLY/);
  assert.throws(()=>h.plans.beginPlan(EVENT,CASE),/SYNTHETIC_ONLY/);
});

test('P0-31A never upgrades a Case mock to an authorized read, clinical or write DTO',()=>{
  const h=harness();
  const out=h.plans.snapshot();
  assert.equal(out.kind,'SYNTHETIC_PLAN_ONLY');
  assert.equal(out.clinicalPolicyApproved,false);
  assert.equal(out.canWrite,false);
  assert.equal(out.canEnable,false);
  assert.equal(out.canReadPatientData,false);
  assert.equal(out.slaAssessment,'NOT_EVALUATED');
  assert.equal(out.plans.length,0);
});
