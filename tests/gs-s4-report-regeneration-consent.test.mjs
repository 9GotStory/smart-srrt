// GS-S4: report regeneration requires owner/Event/registry-bound server consent.
// All scenarios run offline with inert PropertiesService, Registry and ScriptLock.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('src/server/05-reports-and-models.gs');
const generation=read('src/web/03k-client-report-generation.html');
const history=read('src/web/03g-client-event-history.html');
const actions=read('src/web/03i-client-report-actions.html');
const auth=read('src/web/03c-client-auth.html');
const E1='11111111-1111-4111-8111-111111111111';
const E2='22222222-2222-4222-8222-222222222222';
const R1='33333333-3333-4333-8333-333333333333';
const R2='44444444-4444-4444-8444-444444444444';
const user1={userId:'user-1',email:'owner@example.test',role:'Admin'};
const user2={userId:'user-2',email:'other@example.test',role:'Admin'};
function harness(){
  const props=new Map(),reads=[],writes=[],locks={tried:0,released:0};
  const state={count:0,invalidCount:0,currentRevision:1,recordStatus:'active',latest:null};
  const ctx={
    console,Date,JSON,
    Utilities:{getUuid:()=>crypto.randomUUID()},
    LockService:{getScriptLock(){return {tryLock(){locks.tried++;return true;},releaseLock(){locks.released++;}}}},
    PropertiesService:{getScriptProperties(){return {
      getProperty:key=>props.has(key)?props.get(key):null,
      setProperty(key,value){writes.push({kind:'set',key});props.set(key,String(value))},
      deleteProperty(key){writes.push({kind:'delete',key});props.delete(key)},
      getProperties(){return Object.fromEntries(props)}
    }}}
  };
  vm.createContext(ctx);
  new vm.Script(server,{filename:'05-reports-and-models.gs'}).runInContext(ctx,{timeout:2000});
  ctx.isUuid_=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));
  ctx.requireAuth_=(session,perm)=>{
    assert.equal(perm,'report');
    if(session==='s1')return user1;
    if(session==='s2')return user2;
    throw Error('UNAUTHORIZED');
  };
  ctx.getSheetByIdOrName_=()=>({});
  ctx.findEventRowById_=(_sheet,id,includeVoid)=>{
    assert.ok(id===E1||id===E2,'invalid fixture event');
    assert.equal(includeVoid,false);
    return 2;
  };
  ctx.listReportsForEvent=(session,eventId)=>{
    ctx.requireAuth_(session,'report');
    reads.push({session,eventId});
    return {eventId,currentRevision:state.currentRevision,
      recordStatus:state.recordStatus,count:state.count,
      invalidCount:state.invalidCount,latest:state.latest,
      reports:state.count?[state.latest]:[]};
  };
  const historyCount=(count=1,latest=R1,revision=1)=>{
    state.count=count;state.invalidCount=0;state.currentRevision=revision;
    state.latest=count?{reportId:latest,sourceRevision:revision}:null;
  };
  return {ctx,props,reads,writes,locks,state,historyCount,
    prepare:(s='s1',e=E1)=>ctx.prepareReportRegeneration(s,e),
    create:(s='s1',e=E1,proof='')=>ctx.createReportJob(s,e,proof)};
}
test('GS-S4 no history authorizes only a first report; fake consent or premature prepare denied',()=>{
  const h=harness();
  assert.throws(()=>h.prepare(),/ยังไม่มีรายงานเดิม/);
  assert.throws(()=>h.create('s1',E1,R1),/ทะเบียนรายงานเปลี่ยนแปลง/);
  assert.equal(h.props.size,0);
  const job=h.create();
  assert.equal(job.status,'queued');
  assert.equal(job.eventId,E1);
  assert.equal(h.props.get('SRRT_G32_ACTIVE'),job.id);
  assert.equal(h.locks.tried,h.locks.released);
});
test('GS-S4 existing registered report refuses missing, forged and unrelated consent',()=>{
  const h=harness();h.historyCount();
  assert.throws(()=>h.create(),/กรุณายืนยัน/);
  assert.throws(()=>h.create('s1',E1,crypto.randomUUID()),/ไม่พร้อมใช้งาน/);
  assert.throws(()=>h.create('s1',E1,'true'),/กรุณายืนยัน/);
  assert.equal([...h.props.keys()].filter(k=>k.startsWith('SRRT_G32_JOB_')).length,0);
  assert.equal(h.props.has('SRRT_G32_ACTIVE'),false);
});
test('GS-S4 explicit authenticated confirmation yields a one-use token consumed by job creation',()=>{
  const h=harness();h.historyCount(2,R1,6);
  const proof=h.prepare();
  assert.equal(proof.eventId,E1);
  assert.match(proof.consentId,/^[0-9a-f-]{36}$/);
  const key='SRRT_GS4_REGEN_'+proof.consentId;
  assert.equal(JSON.parse(h.props.get(key)).sourceRevision,6);
  const job=h.create('s1',E1,proof.consentId);
  assert.equal(job.status,'queued');
  assert.equal(h.props.has(key),false);
  assert.equal(h.props.get('SRRT_G32_ACTIVE'),job.id);
  assert.deepEqual(h.reads.map(x=>x.eventId),[E1,E1]);
  h.ctx.cancelReportJob('s1',job.id);
  assert.throws(()=>h.create('s1',E1,proof.consentId),/ไม่พร้อมใช้งาน/);
});
test('GS-S4 consent from another authenticated account or different Event is rejected',()=>{
  const h=harness();h.historyCount();
  const proof=h.prepare('s1',E1);
  assert.throws(()=>h.create('s2',E1,proof.consentId),/หมดอายุหรือทะเบียนรายงานเปลี่ยนแปลง/);
  assert.throws(()=>h.create('s1',E2,proof.consentId),/หมดอายุหรือทะเบียนรายงานเปลี่ยนแปลง/);
  assert.equal(h.props.has('SRRT_GS4_REGEN_'+proof.consentId),true,'denial must not consume owner proof');
  const job=h.create('s1',E1,proof.consentId);
  assert.equal(job.eventId,E1);
});
test('GS-S4 concurrent registry changes or Event Revision drift fail closed at create',()=>{
  for(const drift of [
    s=>s.count++,
    s=>s.latest={reportId:R2},
    s=>s.currentRevision++,
    s=>s.invalidCount=1,
    s=>s.recordStatus='void'
  ]){
    const h=harness();h.historyCount(1,R1,1);
    const proof=h.prepare();
    drift(h.state);
    assert.throws(()=>h.create('s1',E1,proof.consentId));
    assert.equal(h.props.has('SRRT_G32_ACTIVE'),false);
  }
});
test('GS-S4 expired or malformed consent and corrupt registry never mint a job',()=>{
  const h=harness();h.historyCount();
  const proof=h.prepare();
  const key='SRRT_GS4_REGEN_'+proof.consentId;
  const record=JSON.parse(h.props.get(key));
  record.createdAt=Date.now()-6*60*1000;
  h.props.set(key,JSON.stringify(record));
  assert.throws(()=>h.create('s1',E1,proof.consentId),/หมดอายุ/);
  h.props.set(key,'{broken');
  assert.throws(()=>h.create('s1',E1,proof.consentId),/ไม่ถูกต้อง/);
  h.state.invalidCount=1;
  assert.throws(()=>h.prepare(),/ยังยืนยันทะเบียนรายงาน/);
});
test('GS-S4 an active job is idempotent only for same owner AND same Event',()=>{
  const h=harness();const first=h.create();
  assert.equal(h.create('s1',E1).id,first.id);
  assert.throws(()=>h.create('s1',E2),/กำลังทำงาน/);
  assert.throws(()=>h.create('s2',E1),/กำลังทำงาน/);
  assert.equal([...h.props.keys()].filter(k=>k.startsWith('SRRT_G32_JOB_')).length,1);
});
test('GS-S4 unknown result cannot be used to generate a second report silently',()=>{
  const h=harness();const job=h.create();
  const key='SRRT_G32_JOB_'+job.id;
  const state=JSON.parse(h.props.get(key));
  state.createdAt=Date.now()-9*60*1000;
  h.props.set(key,JSON.stringify(state));
  assert.throws(()=>h.create(),/ยังไม่สามารถยืนยันผลคำขอรายงานก่อนหน้า/);
  assert.equal(JSON.parse(h.props.get(key)).status,'unknown');
  assert.equal(h.props.has('SRRT_G32_ACTIVE'),false,'G-32 clears stale active pointer');
  assert.throws(()=>h.create('s1',E1),/ยังมีงานรายงานสถานะไม่แน่นอน/,
    'subsequent retries cannot bypass cleared pointer');
  assert.throws(()=>h.create('s2',E1),/ยังมีงานรายงานสถานะไม่แน่นอน/,
    'a different account cannot regenerate the same unresolved event');
  assert.equal([...h.props.keys()].filter(k=>k.startsWith('SRRT_G32_JOB_')).length,1);
});
test('GS-S4 consent cannot be minted without report authorization or with void Event',()=>{
  const h=harness();h.historyCount();
  assert.throws(()=>h.prepare('bad',E1),/UNAUTHORIZED/);
  assert.throws(()=>h.create('bad',E1),/UNAUTHORIZED/);
  h.state.recordStatus='void';
  assert.throws(()=>h.prepare(),/ยังยืนยันทะเบียนรายงาน/);
  assert.equal([...h.props.keys()].filter(k=>k.startsWith('SRRT_GS4_REGEN_')).length,0);
});
test('GS-S4 browser confirmation and warning paths pass server-issued consent through to create',()=>{
  assert.match(history,/gs\('prepareReportRegeneration',session,eventId\)/);
  assert.match(history,/await makeReport\(eventId,button,proof\.consentId\)/);
  assert.match(generation,/gs\('createReportJob',session,eventId,String\(regenerationConsentId\|\|''\)\)/);
  assert.match(generation,/executeReport\(eventId,btn,allowExistingReport\)/);
  assert.match(generation,/pendingReportRegenerationConsentId=String\(allowExistingReport\|\|''\)/);
  assert.match(generation,/await executeReport\(eventId,button,regenerationConsentId\)/);
  assert.match(actions,/let pendingReportRegenerationConsentId=''/);
  assert.match(auth,/pendingReportRegenerationConsentId='';/);
  assert.doesNotMatch(generation,/createReportJob',session,eventId\);/);
  assert.match(server,/function reportConsentRegistryState_\(sessionToken, eventId\)/);
  assert.match(server,/listReportsForEvent\(sessionToken, eventId\)/);
});
