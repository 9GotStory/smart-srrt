import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const parts=[
  '../src/dengue/00-g1a-foundation.gs',
  '../src/dengue/03-n1b1-trusted-event-contract.gs',
  '../src/dengue/04-n1b2b-mock-trusted-adapter.gs',
  '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
  '../src/dengue/08-p0-03-offline-trusted-boundary.gs'
];
const content=parts.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const ctx=vm.createContext({});
content.forEach((s,i)=>vm.runInContext(s,ctx,{filename:parts[i]}));
const UUID='a1111111-1111-4111-8111-111111111111';
const MUTATION='b2222222-2222-4222-8222-222222222222';
const NOW='2026-10-18T00:00:00.000Z';
const POLICY='TEST-D331-POLICY-1';
const kind=ctx.D331_P003_SOURCE_KIND_;
function eventRow(){
  const row=Array.from({length:39},()=>'');
  row[5]='SYNTHETIC_DENGUE_ONLY';
  row[9]='2';row[10]='ตำบลจำลอง';row[11]='อำเภอจำลอง';
  row[12]='จังหวัดจำลอง';row[28]='หมู่บ้านจำลอง';row[29]='SYN-001';
  row[30]=UUID;row[31]=3;row[32]='active';row[38]='user-2';
  return row;
}
function areaRow(){return ['area-A','จังหวัดจำลอง','อำเภอจำลอง',
  'ตำบลจำลอง','2','หมู่บ้านจำลอง','SYN-001',true,'',''];}
function grantRow(overrides={}){
  const g={
    SchemaVersion:1,GrantID:'TEST-GRANT-1',UserID:'user-1',
    Capability:'dengue.case.read',AreaID:'area-A',EventID:UUID,
    State:'ACTIVE',ValidFromUTC:'2026-01-01T00:00:00.000Z',
    ExpiresAtUTC:'2027-01-01T00:00:00.000Z',GrantRevision:1,
    PolicyRevision:POLICY,RequestedByUserID:'issuer-1',
    RequestedAtUTC:'2026-01-01T00:00:00.000Z',
    ApprovedByUserID:'approver-1',ApprovedAtUTC:'2026-01-02T00:00:00.000Z',
    IssuedByUserID:'issuer-1',IssuedAtUTC:'2026-01-02T00:00:00.000Z',
    UpdatedAtUTC:'2026-01-02T00:00:00.000Z',
    RevokedByUserID:'',RevokedAtUTC:'',RevocationReasonCode:'',
    MutationID:MUTATION,...overrides
  };
  return Array.from(ctx.d331P002aHeaders_('D331AccessGrants'),h=>g[h]);
}
function policy(){return {simulationOnly:true,approved:true,version:POLICY,
  labels:['SYNTHETIC_DENGUE_ONLY'],
  validFrom:'2026-01-01T00:00:00.000Z',expiresAt:'2027-01-01T00:00:00.000Z'};}
function bundle(overrides={}){
  const value=(name,defaultVal)=>Object.hasOwn(overrides,name)?overrides[name]:defaultVal;
  return {kind:value('kind',kind),
    binding:()=>value('binding',{kind,target:'SYNTHETIC-MEMORY-ONLY'}),
    clock:()=>value('clock',NOW),
    session:()=>value('session',{userId:'user-1',status:'active',role:'Staff'}),
    mainHeaders:()=>value('mainHeaders',Array.from(ctx.D331_N1B2B_MAIN_HEADERS_)),
    areaHeaders:()=>value('areaHeaders',Array.from(ctx.D331_N1B2B_AREA_HEADERS_)),
    grantHeaders:()=>value('grantHeaders',Array.from(ctx.d331P002aHeaders_('D331AccessGrants'))),
    mainRows:()=>value('mainRows',[eventRow()]),
    areaRows:()=>value('areaRows',[areaRow()]),
    grantRows:()=>value('grantRows',[grantRow()]),
    diseasePolicy:()=>value('diseasePolicy',policy())
  };
}
function simulate(overrides={},request={eventId:UUID,operation:'dengue.case.read'}){
  return JSON.parse(JSON.stringify(ctx.d331P003Simulate_(bundle(overrides),request)));
}
function denied(overrides={},request){
  assert.throws(()=>simulate(overrides,request),/^Error: D331_P003_DENIED$/);
}
test('P0-03 is unregistered, synthetics only, no public RPC or Google services',()=>{
  const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
  const s=content.at(-1);
  assert.doesNotMatch(manifest,/08-p0-03-offline-trusted-boundary/);
  assert.match(manifest,/src\/dengue\/00-g1a-foundation\.gs/);
  assert.doesNotMatch(s,/\b(?:SpreadsheetApp|DriveApp|PropertiesService|LockService|ScriptApp|UrlFetchApp|getDb_|getSheet_|ensureSheet_)\s*(?:\.|\()/);
  assert.ok([...s.matchAll(/function\s+(d331\w+)\s*\(/g)].every(x=>x[1].endsWith('_')));
  assert.match(content[0],/D331_G1A_ENABLED = false/);
});
test('mock current session + one exact grant + unique event returns minimal metadata',()=>{
  assert.deepEqual(simulate(),{
    simulationOnly:true,decision:'SIMULATED_ALLOW',eventId:UUID,
    revision:3,areaId:'area-A',operation:'dengue.case.read',mode:'read'
  });
});
test('write requires matched grant capability and revision, never persists',()=>{
  const request={eventId:UUID,operation:'dengue.case.write',expectedRevision:3};
  const g=grantRow({Capability:'dengue.case.write'});
  assert.equal(simulate({grantRows:[g]},request).mode,'write');
  denied({grantRows:[g]},{...request,expectedRevision:2});
  denied({},{...request});
  assert.throws(()=>simulate({},{eventId:UUID,operation:'dengue.case.read',expectedRevision:3}),/INVALID_REQUEST/);
});
test('wrong binding, missing mock driver and injected request authority deny',()=>{
  denied({binding:{kind,target:'PRODUCTION'}});
  denied({kind:'WRONG_KIND'});
  assert.throws(()=>simulate({},{eventId:UUID,operation:'dengue.case.read',userId:'user-1'}),/INVALID_REQUEST/);
  assert.throws(()=>simulate({},{eventId:UUID,operation:'dengue.case.read',approvedGrant:{}}),/INVALID_REQUEST/);
  assert.throws(()=>simulate({},{eventId:'TEST-CASE',operation:'dengue.case.read'}),/INVALID_REQUEST/);
  assert.throws(()=>simulate({},{eventId:UUID,operation:'dengue.survey.read'}),/INVALID_REQUEST/);
});
test('session revoked, user mismatch and admin role without grant deny',()=>{
  denied({session:null});
  denied({session:{userId:'user-1',status:'inactive',role:'Staff'}});
  denied({session:{userId:'other',status:'active',role:'Super Admin'}});
  denied({grantRows:[],session:{userId:'user-1',status:'active',role:'Super Admin'}});
});
test('clinical policy must be exact synthetic, nonexpired and unforgeably scoped',()=>{
  denied({diseasePolicy:{...policy(),labels:['ไข้เลือดออก']}});
  denied({diseasePolicy:{...policy(),approved:false}});
  denied({diseasePolicy:{...policy(),expiresAt:NOW}});
  denied({diseasePolicy:{...policy(),simulationOnly:false}});
  const r=eventRow();r[5]='โรคอื่น';denied({mainRows:[r]});
});
test('EventID must be unique; absent, duplicate, or legacy placeholders deny',()=>{
  denied({mainRows:[]});
  denied({mainRows:[eventRow(),eventRow()]});
  const r=eventRow();r[30]='TEST-LEGACY-ID';denied({mainRows:[r]});
});
test('strict MainData, AreaMaster and grant headers deny drift',()=>{
  const h=Array.from(ctx.D331_N1B2B_MAIN_HEADERS_);h[30]='EventNumber';
  denied({mainHeaders:h});
  const a=Array.from(ctx.D331_N1B2B_AREA_HEADERS_);a.reverse();
  denied({areaHeaders:a});
  const g=Array.from(ctx.d331P002aHeaders_('D331AccessGrants'));g.push('Extra');
  denied({grantHeaders:g});
});
test('fake, duplicate, inactive or wrong AreaID denies',()=>{
  denied({areaRows:[]});
  denied({areaRows:[areaRow(),areaRow()]});
  const a=areaRow();a[7]='true';denied({areaRows:[a]});
  denied({grantRows:[grantRow({AreaID:'area-B'})]});
});
test('grant missing, revoked, expired, wrong event/capability and policy denies',()=>{
  denied({grantRows:[]});
  denied({grantRows:[grantRow({State:'REVOKED',RevokedByUserID:'admin-2',RevokedAtUTC:NOW,RevocationReasonCode:'ACCESS_REMOVED'})]});
  denied({grantRows:[grantRow({ExpiresAtUTC:NOW})]});
  denied({grantRows:[grantRow({EventID:MUTATION})]});
  denied({grantRows:[grantRow({Capability:'dengue.case.write'})]});
  denied({grantRows:[grantRow({PolicyRevision:'TEST-D331-POLICY-2'})]});
});
test('invalid or duplicate GrantID, duplicate active scope, bad approval denies',()=>{
  denied({grantRows:[grantRow(),grantRow()]});
  denied({grantRows:[grantRow(),grantRow({GrantID:'TEST-GRANT-2'})]});
  denied({grantRows:[grantRow({ApprovedByUserID:'user-1'})]});
  denied({grantRows:[grantRow({ApprovedAtUTC:''})]});
  denied({grantRows:[grantRow({SchemaVersion:2})]});
});
test('closed parent only permits read, void never, stale revision write denied',()=>{
  const closed=eventRow();closed[32]='closed';
  assert.equal(simulate({mainRows:[closed]}).mode,'read');
  denied({mainRows:[closed],grantRows:[grantRow({Capability:'dengue.case.write'})]},
    {eventId:UUID,operation:'dengue.case.write',expectedRevision:3});
  const voided=eventRow();voided[32]='void';denied({mainRows:[voided]});
});
test('result and errors never disclose user, grant, patient narrative or token',()=>{
  const r=eventRow();r[13]='PRIVATE_PHI_NARRATIVE_SHOULD_NOT_LEAK';
  const value=simulate({mainRows:[r]});
  assert.equal(JSON.stringify(value).includes('PRIVATE_PHI'),false);
  assert.equal(JSON.stringify(value).includes('TEST-GRANT-1'),false);
  assert.equal(JSON.stringify(value).includes('user-1'),false);
  try { simulate({grantRows:[]}); assert.fail('missing denial'); }
  catch(e){assert.equal(e.message,'D331_P003_DENIED');}
});
