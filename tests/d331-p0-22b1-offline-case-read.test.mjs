import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const foundation=read('src/dengue/00-g1a-foundation.gs');
const schema=read('src/dengue/07-p0-02a-mvp-schema-contract.gs');
const adapter=read('src/dengue/09-p0-03b-dev-readonly-adapter.gs');
const p022b=read('src/dengue/14-p0-22b1-offline-case-read.gs');
const native=read('tools/native-sources.mjs');
const layout=read('src/web/02-app-layout.html');
const browser=read('src/web/03h-client-event-records.html');
const eventId='e0000000-0000-4000-8000-000000000022';
const c1='a0000000-0000-4000-8000-000000000022';
const c2='a0000000-0000-4000-8000-000000000023';
const baseSnapshot=()=>({kind:'D331_P022B_SYNTHETIC_ONLY_V1',eventId,areaId:'SYNTHETIC-AREA',revision:3});
const row=(id=c1)=>{
  // Precisely 16 v2 fields. No real EventID, patient record, or Google service.
  return [
    id,eventId,1,'ACTIVE','SUSPECTED','2026-10-19',
    '2026-10-19T00:00:00.000Z','2026-10-19T01:00:00.000Z',
    '2026-10-19T02:00:00.000Z','TEST_ONLY_SOURCE','TEST_ONLY_RECEIVER',
    '2026-10-19T03:00:00.000Z','SYNTHETIC_USER',
    '2026-10-19T03:00:00.000Z','SYNTHETIC_USER',
    'b0000000-0000-4000-8000-000000000022'
  ];
};
function setup(){
  const ctx=vm.createContext({});
  for(const content of [foundation,schema,p022b]) vm.runInContext(content,ctx);
  return ctx;
}
const plain=v=>JSON.parse(JSON.stringify(v));

test('P0-22B1 default-live case reader DENIES before any service calls',()=>{
  const ctx=setup();
  let calls=0;
  for(const name of ['SpreadsheetApp','PropertiesService','CacheService']){
    Object.defineProperty(ctx,name,{get(){calls++;throw Error('MUST_NOT_CALL_SERVICE');}});
  }
  ctx.D331_P003B_ENABLED_=false;
  assert.equal(ctx.D331_P022B_ENABLED_,false);
  assert.equal(ctx.D331_P022B_APPROVED_FIELD_POLICY_,'');
  for(const args of [
    ['TEST_TOKEN',eventId],
    [null,null],
    [{role:'Super Admin',grants:['dengue.case.read']},eventId]
  ]) assert.throws(()=>ctx.d331P022bListCasesForEvent_(...args),/^Error: D331_UNAVAILABLE$/);
  assert.equal(calls,0);
});

test('P0-22B1 forged ON flags/field decision cannot activate real case read',()=>{
  const ctx=setup();
  ctx.D331_G1A_ENABLED=true;
  ctx.D331_P003B_ENABLED_=true;
  ctx.D331_P022B_ENABLED_=true;
  ctx.D331_P022B_APPROVED_FIELD_POLICY_='APPROVED_BY_SEPARATE_GATE';
  assert.throws(()=>ctx.d331P022bListCasesForEvent_('FAKE',eventId),/D331_UNAVAILABLE/);
});

test('P0-22B1 fixed synthetic cases project identity-only DTO, no PHI',()=>{
  const ctx=setup();
  const out=plain(ctx.d331P022bOfflineCases_(baseSnapshot(),[row(),row(c2)]));
  assert.deepEqual(out,{
    simulationOnly:true,status:'READ_ONLY_MOCK',eventId,revision:3,
    areaId:'SYNTHETIC-AREA',
    cases:[
      {caseId:c1,caseRevision:1,caseStatus:'ACTIVE'},
      {caseId:c2,caseRevision:1,caseStatus:'ACTIVE'}
    ],
    slaAssessment:'NOT_EVALUATED',canWrite:false,canEnable:false
  });
  const serialized=JSON.stringify(out);
  for(const value of ['SYNTHETIC_USER','TEST_ONLY_SOURCE','TEST_ONLY_RECEIVER',
                      'OnsetLocalDate','PasswordHash','PatientName'])
    assert.ok(!serialized.includes(value),value);
  assert.deepEqual(plain(ctx.d331P022bOfflineCases_(baseSnapshot(),[])).cases,[]);
});

test('P0-22B1 rejects every forged source, wrong Event/Case and duplicate',()=>{
  const ctx=setup();
  const deny=(snapshot,rows)=>assert.throws(
    ()=>ctx.d331P022bOfflineCases_(snapshot,rows),/^Error: D331_UNAVAILABLE$/
  );
  deny({...baseSnapshot(),kind:'SERVER'},[row()]);
  deny({...baseSnapshot(),allow:true},[row()]);
  deny({...baseSnapshot(),areaId:'REAL-AREA'},[row()]);
  deny({...baseSnapshot(),revision:4},[row()]);
  deny({...baseSnapshot(),eventId:'e0000000-0000-4000-8000-000000000099'},[row()]);
  deny(null,[row()]);deny(baseSnapshot(),null);
  deny(baseSnapshot(),[row(),row()]);
  deny(baseSnapshot(),[row(),row(c2),row(c1)]);
  const other=row();other[1]='e0000000-0000-4000-8000-000000000099';
  deny(baseSnapshot(),[other]);
  deny(baseSnapshot(),[row('f0000000-0000-4000-8000-000000000099')]);
  const badRev=row();badRev[2]=0;deny(baseSnapshot(),[badRev]);
  const badStatus=row();badStatus[3]='COMPLETED';deny(baseSnapshot(),[badStatus]);
  const wrongWidth=row();wrongWidth.push('EXTRA_PATIENT');deny(baseSnapshot(),[wrongWidth]);
  const badColumn=row();badColumn[5]='2026-13-48';deny(baseSnapshot(),[badColumn]);
  const malformed=row();malformed[0]='';deny(baseSnapshot(),[malformed]);
});

test('P0-22B1 stays unregistered and does not alter deployed P0-19/P0-20 boundaries',()=>{
  assert.doesNotMatch(native,/14-p0-22b1-offline-case-read\.gs/);
  assert.doesNotMatch(native,/09-p0-03b-dev-readonly-adapter\.gs/);
  assert.match(foundation,/D331_G1A_ENABLED\s*=\s*false/);
  assert.match(adapter,/D331_P003B_ENABLED_\s*=\s*false/);
  assert.match(adapter,/function getDengueWorkspace\(sessionToken,eventId\)/);
  assert.match(layout,/Mock-only · D331 OFF/);
  assert.match(browser,/d331P020PreviewBridge_\.mount\(\)/);
  assert.doesNotMatch(p022b,/SpreadsheetApp|PropertiesService|CacheService|google\.script\.run|function listDengueCasesForEvent\(/);
  assert.doesNotMatch(p022b,/setValues|appendRow|insertSheet|deleteRow|setProperty/);
});
