import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

// P0-30F0 is a TEST-ONLY choice matrix, not a reader, permission provider,
// release plan, privacy approval or alternative integrity implementation.
// Both choice branches use fictional data and ALWAYS return canEnable:false.
const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const privateReader=read('src/dengue/15-p0-22b2-case-read-integration.gs');
const serverAuth=read('src/dengue/09-p0-03b-dev-readonly-adapter.gs');
const records=read('src/web/03h-client-event-records.html');
const decisions=read('docs/implementation/d331-p0-30d-caseid-privacy-security-decision-gates.md');

const EVENT_A='e1111111-1111-4111-8111-111111111111';
const EVENT_B='e2222222-2222-4222-8222-222222222222';
const CASE_1='a1111111-1111-4111-8111-111111111111';
const CASE_2='a2222222-2222-4222-8222-222222222222';
const fixtureRows=()=>[
  {caseId:CASE_1,eventId:EVENT_A,caseStatus:'ACTIVE',privateField:'DO_NOT_EXPOSE'},
  {caseId:CASE_2,eventId:EVENT_B,caseStatus:'ACTIVE',privateField:'DO_NOT_EXPOSE'}
];

// Offline trace deliberately NEVER returns identifiers, grants or records.
// "globalRows" models the existing A:B scan. "scopedRows" represents a
// hypothetical separately approved Event-scoped index, NOT Google Sheets.
function simulate({d2='HOLD',p1='HOLD',globalRows=fixtureRows(),
  scopedRows=[fixtureRows()[0]],target=EVENT_A}={}){
  const result=(kind,readAcross=0,selected=0)=>Object.freeze({
    simulationOnly:true,canEnable:false,canReadPatientData:false,
    kind,globalCrossEventIdentifiersRead:readAcross,syntheticMatches:selected
  });
  if(!['GLOBAL_IMMUTABLE','EVENT_SCOPED'].includes(d2)||
      !['APPROVED_SCOPED','DENIED_REDESIGN'].includes(p1))
    return result('DECISION_HOLD');
  if(d2==='GLOBAL_IMMUTABLE'&&p1==='APPROVED_SCOPED'){
    // Policy-approved IN TEST ONLY: mirrors bounded identity scan *shape*,
    // not session/auth scope, cloud access or operational permission.
    if(!Array.isArray(globalRows)||globalRows.length>10000)
      return result('GLOBAL_BOUNDS_HOLD');
    const seen=new Set();let other=0,matches=0;
    for(const item of globalRows){
      if(!item||typeof item.caseId!=='string'||
          typeof item.eventId!=='string'||seen.has(item.caseId))
        return result('GLOBAL_INTEGRITY_DENY',other,matches);
      seen.add(item.caseId);
      if(item.eventId===target)matches++;
      else other++;
    }
    return result('CURRENT_GLOBAL_SCAN_REQUIRES_SEPARATE_LIVE_APPROVAL',other,matches);
  }
  // Neither an unapproved GLOBAL uniqueness claim nor an ordinary user's
  // cross-Event scan can be justified by filtering a whole workbook.
  // Only fictional current-Event rows are handed to this branch.
  if(!Array.isArray(scopedRows)||scopedRows.length>100)
    return result('SCOPED_BOUNDS_HOLD');
  const seen=new Set();let count=0;
  for(const item of scopedRows){
    if(!item||item.eventId!==target||typeof item.caseId!=='string'||
        seen.has(item.caseId)||item.caseStatus!=='ACTIVE')
      return result('SCOPED_INTEGRITY_DENY');
    seen.add(item.caseId);count++;
  }
  if(d2==='GLOBAL_IMMUTABLE')
    return result('MISSING_TRUSTED_GLOBAL_INTEGRITY_PROOF',0,count);
  if(p1==='APPROVED_SCOPED')
    return result('REASSESS_CROSS_EVENT_SCAN_NECESSITY',0,count);
  return result('EVENT_SCOPED_REDESIGN_REQUIRES_OWNER_SIGNOFF',0,count);
}

test('P0-30F0 asserts current private Case Reader stays hard OFF/unregistered',()=>{
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,17);
  assert.ok(!GAS_SERVER_SOURCES.includes('src/dengue/15-p0-22b2-case-read-integration.gs'));
  assert.match(privateReader,/D331_P022B2_ENABLED_ = false/);
  assert.match(privateReader,/D331_P022B2_REVOCATION_APPROVED_ = false/);
  assert.match(privateReader,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
  assert.match(serverAuth,/D331_P003B_ENABLED_ = false/);
  assert.match(serverAuth,/D331_P003B_APPROVED_DISEASE_LABELS_ = \[\]/);
  assert.match(privateReader,/sheet\.getRange\(2,1,count,2\)\.getValues\(\)/);
  assert.match(privateReader,/function d331P022b2ListCasesForEvent_\(/);
  assert.doesNotMatch(privateReader,/function listDengueCasesForEvent\(/);
  assert.match(records,/SYNTHETIC_SELECTED_EVENT_V1/);
  assert.match(records,/MOCK_ONLY/);
});

test('P0-30F0 no D2 and P1 decisions means HOLD; no code may assume signed policy',()=>{
  for(const input of [
    {},{d2:'GLOBAL_IMMUTABLE'},{p1:'DENIED_REDESIGN'},
    {d2:'EVENT_SCOPED',p1:'HOLD'},{d2:'UNKNOWN',p1:'APPROVED_SCOPED'},
    {d2:'GLOBAL_IMMUTABLE',p1:'approved'}
  ]){
    const out=simulate(input);
    assert.equal(out.kind,'DECISION_HOLD');
    assert.equal(out.canEnable,false);
    assert.equal(out.globalCrossEventIdentifiersRead,0);
  }
  assert.match(decisions,/P030D_DATA_D2=HOLD/);
  assert.match(decisions,/P030D_PRIVACY_P1=HOLD/);
});

test('P0-30F0 existing GLOBAL + approved-scan alternative touches other Event IDs',()=>{
  const out=simulate({d2:'GLOBAL_IMMUTABLE',p1:'APPROVED_SCOPED'});
  assert.equal(out.kind,'CURRENT_GLOBAL_SCAN_REQUIRES_SEPARATE_LIVE_APPROVAL');
  assert.equal(out.globalCrossEventIdentifiersRead,1);
  assert.equal(out.syntheticMatches,1);
  assert.equal(out.canEnable,false);
  assert.ok(!JSON.stringify(out).includes(EVENT_B));
  assert.ok(!JSON.stringify(out).includes(CASE_2));
  assert.ok(!JSON.stringify(out).includes('DO_NOT_EXPOSE'));
});

test('P0-30F0 global collision in a different Event fails, also under an approved simulated scan',()=>{
  const rows=fixtureRows();
  rows[1].caseId=CASE_1;
  const out=simulate({d2:'GLOBAL_IMMUTABLE',p1:'APPROVED_SCOPED',globalRows:rows});
  assert.equal(out.kind,'GLOBAL_INTEGRITY_DENY');
  assert.equal(out.canReadPatientData,false);
});

test('P0-30F0 global identity plus P1 scan DENIED has no global proof and never widens access',()=>{
  const rows=fixtureRows();
  rows[1].caseId=CASE_1; // collision in another Event, not visible to scoped fixture
  const out=simulate({d2:'GLOBAL_IMMUTABLE',p1:'DENIED_REDESIGN',
    globalRows:rows,scopedRows:[rows[0]]});
  assert.equal(out.kind,'MISSING_TRUSTED_GLOBAL_INTEGRITY_PROOF');
  assert.equal(out.globalCrossEventIdentifiersRead,0);
  assert.equal(out.canEnable,false);
});

test('P0-30F0 EVENT_SCOPED alternative needs coordinated key redesign, not global policy drift',()=>{
  const ok=simulate({d2:'EVENT_SCOPED',p1:'DENIED_REDESIGN'});
  assert.equal(ok.kind,'EVENT_SCOPED_REDESIGN_REQUIRES_OWNER_SIGNOFF');
  assert.equal(ok.canEnable,false);
  const invalid=simulate({d2:'EVENT_SCOPED',p1:'DENIED_REDESIGN',
    scopedRows:[fixtureRows()[0],fixtureRows()[0]]});
  assert.equal(invalid.kind,'SCOPED_INTEGRITY_DENY');
  const cross=simulate({d2:'EVENT_SCOPED',p1:'DENIED_REDESIGN',
    scopedRows:[fixtureRows()[1]]});
  assert.equal(cross.kind,'SCOPED_INTEGRITY_DENY');
});

test('P0-30F0 EVENT_SCOPED + cross-Event P1 approval still requires necessity review',()=>{
  const out=simulate({d2:'EVENT_SCOPED',p1:'APPROVED_SCOPED'});
  assert.equal(out.kind,'REASSESS_CROSS_EVENT_SCAN_NECESSITY');
  assert.equal(out.globalCrossEventIdentifiersRead,0);
  assert.equal(out.canEnable,false);
});

test('P0-30F0 bounded/invalid scenarios are denied and disclose no synthetic private fields',()=>{
  const overGlobal=simulate({d2:'GLOBAL_IMMUTABLE',p1:'APPROVED_SCOPED',
    globalRows:Array.from({length:10001},()=>fixtureRows()[0])});
  assert.equal(overGlobal.kind,'GLOBAL_BOUNDS_HOLD');
  const overScoped=simulate({d2:'EVENT_SCOPED',p1:'DENIED_REDESIGN',
    scopedRows:Array.from({length:101},()=>fixtureRows()[0])});
  assert.equal(overScoped.kind,'SCOPED_BOUNDS_HOLD');
  const badScoped=simulate({d2:'EVENT_SCOPED',p1:'DENIED_REDESIGN',
    scopedRows:[{...fixtureRows()[0],caseStatus:'VOID'}]});
  assert.equal(badScoped.kind,'SCOPED_INTEGRITY_DENY');
  for(const out of [overGlobal,overScoped,badScoped]){
    assert.deepEqual(Object.keys(out).sort(),[
      'simulationOnly','canEnable','canReadPatientData','kind',
      'globalCrossEventIdentifiersRead','syntheticMatches'].sort());
    assert.equal(out.canEnable,false);
    assert.equal(out.canReadPatientData,false);
    assert.equal(JSON.stringify(out).includes('DO_NOT_EXPOSE'),false);
  }
});
