import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const SOURCE=fs.readFileSync(new URL('../src/dengue/07-p0-02a-mvp-schema-contract.gs',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(SOURCE,ctx);
const names=['DengueCases','DenguePlans','DengueControlActions','DengueEntomology','DengueFollowups','DengueRequestLedger','D331AccessGrants'];
const widths=[16,15,18,16,16,10,22];
const uuid='11111111-1111-4111-8111-111111111111';
const instant='2026-10-17T00:00:00.000Z';
const fields=n=>Array.from(ctx.D331_P002A_FIELDS_[n]).map(f=>Array.from(f));
const headers=()=>Object.fromEntries(names.map(n=>[n,Array.from(ctx.d331P002aHeaders_(n))]));
function row(n){
 return fields(n).map(([key,type,req])=>{
   if(req!=='Y')return '';
   if(type==='UUID')return uuid;
   if(type==='Int+')return 1;
   if(type==='UInt')return 0;
   if(type==='UTC')return key==='ExpiresAtUTC'?'2027-10-17T00:00:00.000Z':instant;
   if(type==='Date')return '2026-10-17';
   if(type==='SHA256')return 'a'.repeat(64);
   if(type==='Enum'){
     const scoped=ctx.D331_P002A_SCOPED_ENUMS_[n];
     const allowed=scoped&&scoped[key]?scoped[key]:ctx.D331_P002A_ENUMS_[key];
     return Array.from(allowed)[0];
   }
   return 'synthetic-only';
 });
}
function set(n,r,k,v){r[fields(n).findIndex(x=>x[0]===k)]=v;}
test('unregistered source has private-only functions, no runtime integration or Google services',()=>{
 assert.doesNotMatch(manifest,/07-p0-02a-mvp-schema-contract\.gs/);
 assert.match(manifest,/00-g1a-foundation\.gs/);
 assert.doesNotMatch(SOURCE,/\b(?:SpreadsheetApp|DriveApp|PropertiesService|LockService|ScriptApp|UrlFetchApp|getDb_|getSheet_|ensureSheet_)\s*(?:\.|\()/);
 assert.ok([...SOURCE.matchAll(/function\s+(d331\w+)\s*\(/g)].every(m=>m[1].endsWith('_')));
 assert.equal(ctx.D331_P002A_APPROVAL_,'DRAFT_ONLY');
});
test('versioned 6 domain + 1 grant fields; P1 container omitted',()=>{
 assert.equal(ctx.D331_P002A_SCHEMA_VERSION_,2);
 assert.deepEqual(Array.from(ctx.d331P002aNames_()),names);
 assert.deepEqual(names.map(n=>fields(n).length),widths);
 assert.equal(widths.reduce((a,b)=>a+b,0),113);
 assert.throws(()=>ctx.d331P002aHeaders_('DengueContainers'),/UNKNOWN_SHEET/);
 assert.throws(()=>ctx.d331P002aHeaders_('__proto__'),/UNKNOWN_SHEET/);
 assert.equal(fields('DenguePlans').find(f=>f[0]==='TriggerCaseID')[1],'UUID');
 assert.equal(fields('DengueRequestLedger').at(-1)[0],'UpdatedAtUTC');
});
test('exact metadata-only snapshot always HOLD, cannot apply or enable',()=>{
 const good=ctx.d331P002aInspect_({schemaVersion:2,headers:headers()});
 assert.equal(good.validDraftShape,true);
 assert.equal(good.status,'HOLD');assert.equal(good.canApply,false);
 assert.equal(good.canEnable,false);assert.equal(good.inspectedDataRows,false);
 assert.equal(ctx.d331P002aInspect_({schemaVersion:1,headers:headers()}).validDraftShape,false);
 assert.throws(()=>ctx.d331P002aInspect_({schemaVersion:2,headers:{},patientRows:[]}),/INVALID_SNAPSHOT/);
});
test('missing/duplicate/reordered/extra headers and unknown sheet fail closed',()=>{
 for(const mutation of [
  h=>{delete h.DenguePlans;},h=>h.DengueCases.reverse(),
  h=>{h.DengueCases[1]=h.DengueCases[0];},h=>{h.DengueContainers=['ContainerID'];},
  h=>h.DengueCases.push('Extra')
 ]){
  const h=headers();mutation(h);
  assert.equal(ctx.d331P002aInspect_({schemaVersion:2,headers:h}).validDraftShape,false);
 }
});
test('all 113 synthetic shapes parse; invalid width and required value reject',()=>{
 for(const n of names){
  assert.equal(ctx.d331P002aValidateSyntheticRow_(n,row(n)).approved,false);
  assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,row(n).slice(1)),/ROW_WIDTH/);
 }
 const n='DenguePlans',r=row(n);set(n,r,'PolicyVersion','');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/REQUIRED:PolicyVersion/);
});
test('UUID, UserID, timestamp and BE date refuse coercion',()=>{
 const n='DengueCases',r=row(n);
 for(const val of [uuid.toUpperCase(),'TEST-CASE-1']){
  set(n,r,'CaseID',val);assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:CaseID/);
 }
 set(n,r,'CaseID',uuid);set(n,r,'CreatedByUserID',1001);
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:CreatedByUserID/);
 set(n,r,'CreatedByUserID','synthetic-only');
 for(const val of ['2026-02-30T10:00:00.000Z','2026-10-17T10:00:00+07:00',new Date(instant)]){
  set(n,r,'DetectedAtUTC',val);
  assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:DetectedAtUTC/);
 }
 set(n,r,'DetectedAtUTC','');set(n,r,'OnsetLocalDate','2569-10-17');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:OnsetLocalDate/);
});
test('entomology counts enforce integer and positive<=inspected',()=>{
 const n='DengueEntomology',r=row(n);
 set(n,r,'HousesInspected',10);set(n,r,'HousesPositive',2);
 set(n,r,'ContainersInspected',20);set(n,r,'ContainersPositive',1);
 assert.equal(ctx.d331P002aValidateSyntheticRow_(n,r).approved,false);
 set(n,r,'HousesPositive',11);assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID_COUNTS/);
 set(n,r,'HousesPositive',2);set(n,r,'ContainersPositive','1');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:ContainersPositive/);
});
test('completed activity/followup and final survey demand operational timestamp',()=>{
 let n='DengueControlActions',r=row(n);set(n,r,'ActionStatus','COMPLETED');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INCOMPLETE_ACTION/);
 set(n,r,'CompletedAtUTC',instant);set(n,r,'OutcomeCode','DONE');
 assert.equal(ctx.d331P002aValidateSyntheticRow_(n,r).approved,false);
 n='DengueFollowups';r=row(n);set(n,r,'FollowupStatus','COMPLETE');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INCOMPLETE_FOLLOWUP/);
 n='DengueEntomology';r=row(n);set(n,r,'SurveyStatus','FINAL');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INCOMPLETE_SURVEY/);
});
test('ledger COMMITTED draft lacks proof; pending status is not authorization',()=>{
 const n='DengueRequestLedger',r=row(n);set(n,r,'Phase','COMMITTED');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/UNPROVEN_COMMIT/);
 set(n,r,'EntityType','CASE');set(n,r,'EntityID',uuid);
 assert.equal(ctx.d331P002aValidateSyntheticRow_(n,r).approved,false);
});
test('same-named enums must be scoped to their actual sheet',()=>{
 let n='DengueFollowups',r=row(n);
 set(n,r,'CheckpointKey','DAY_0');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:CheckpointKey/);
 n='DengueEntomology';r=row(n);set(n,r,'ScopeCode','PATIENT_HOME');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:ScopeCode/);
 n='DengueControlActions';r=row(n);set(n,r,'OutcomeCode','NOT_APPLICABLE');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID:OutcomeCode/);
});
test('grants require ordered window and provenance, never confer permission',()=>{
 const n='D331AccessGrants',r=row(n);
 set(n,r,'SchemaVersion',2);
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/GRANT_SCHEMA_VERSION/);
 set(n,r,'SchemaVersion',1);
 set(n,r,'ExpiresAtUTC','2026-10-16T00:00:00.000Z');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/INVALID_GRANT_WINDOW/);
 set(n,r,'ExpiresAtUTC','2027-10-17T00:00:00.000Z');set(n,r,'State','ACTIVE');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/GRANT_PROVENANCE/);
 set(n,r,'State','REVOKED');
 assert.throws(()=>ctx.d331P002aValidateSyntheticRow_(n,r),/REVOKE_PROVENANCE/);
});
