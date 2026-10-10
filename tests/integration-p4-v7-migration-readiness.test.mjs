import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assessP4V7MigrationReadiness, READINESS_KIND, READINESS_GATES
} from '../tools/p4-v7-migration-readiness.mjs';

const valid=()=>({kind:READINESS_KIND,checks:{}});
const fakeDigest='a'.repeat(64);
const run=checks=>assessP4V7MigrationReadiness({kind:READINESS_KIND,checks});

test('readiness inventory includes every preservation, privacy, recovery and approval obligation',()=>{
  assert.equal(READINESS_GATES.length,15);
  assert.equal(new Set(READINESS_GATES.map(g=>g.id)).size,15);
  assert.ok(['snapshot','recovery','schema','privacy','audit','integrity','validation','approval']
    .every(group=>READINESS_GATES.some(g=>g.area===group)));
});
test('empty or partially supplied metadata remains HOLD with no Google or real-data authority',()=>{
  const a=assessP4V7MigrationReadiness(valid());
  assert.equal(a.status,'HOLD');
  assert.equal(a.summary.missing,15);
  assert.equal(a.migrationAuthorized,false);
  assert.equal(a.realDataExportAuthorized,false);
  assert.equal(a.googleWorkspaceMutationAuthorized,false);
  assert.equal(a.stagingDeploymentAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.independentApprovalVerified,false);
  assert.equal(a.openGateIds.length,15);
});
test('submitted evidence digest is only an unverified metadata claim',()=>{
  const a=run({source_manifest:{state:'submitted',evidenceDigest:fakeDigest}});
  assert.deepEqual(a.summary,{missing:14,submitted:1,reviewed:0});
  assert.ok(a.openGateIds.includes('source_manifest'));
  assert.equal(a.migrationAuthorized,false);
  assert.equal(JSON.stringify(a).includes(fakeDigest),false);
});
test('even 15 self-claimed reviewed gates do not authorize migration, merge, staging or data export',()=>{
  const checks=Object.fromEntries(READINESS_GATES.map(g=>[g.id,{state:'reviewed',evidenceDigest:fakeDigest}]));
  const a=run(checks);
  assert.deepEqual(a.summary,{missing:0,submitted:0,reviewed:15});
  assert.deepEqual(a.openGateIds,[]);
  assert.equal(a.status,'HOLD');
  assert.equal(a.independentApprovalVerified,false);
  assert.equal(a.cannotAuthorizeViaThisTool,true);
  for (const field of ['migrationAuthorized','realDataExportAuthorized','googleWorkspaceMutationAuthorized','stagingDeploymentAuthorized','mergeAuthorized'])
    assert.equal(a[field],false);
});
test('unknown and nonmetadata keys fail closed instead of being ignored',()=>{
  assert.throws(()=>assessP4V7MigrationReadiness({kind:READINESS_KIND,checks:{},data:[]}),/INVALID_INPUT/);
  assert.throws(()=>run({unknown_gate:{state:'reviewed',evidenceDigest:fakeDigest}}),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:{state:'reviewed',evidenceDigest:fakeDigest,reviewerEmail:'secret@example.test'}}),/INVALID_INPUT/);
});
test('actual workbook contents and request payloads cannot be supplied as gate input',()=>{
  assert.throws(()=>run({source_manifest:{state:'submitted',evidenceDigest:fakeDigest,rows:[['patient'] ]}}),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:{state:'submitted',evidenceDigest:fakeDigest,requestParams:'token'}}),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:['sensitive']}),/INVALID_INPUT/);
});
test('missing digest, invalid digest or invalid status is rejected',()=>{
  assert.throws(()=>run({source_manifest:{state:'reviewed'}}),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:{state:'reviewed',evidenceDigest:'not-a-hash'}}),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:{state:'verified',evidenceDigest:fakeDigest}}),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:{state:'missing',evidenceDigest:fakeDigest}}),/INVALID_INPUT/);
});
test('unknown kind, array inputs, null inputs and malformed subobjects fail closed',()=>{
  assert.throws(()=>assessP4V7MigrationReadiness(),/INVALID_INPUT/);
  assert.throws(()=>assessP4V7MigrationReadiness({kind:'production',checks:{}}),/INVALID_INPUT/);
  assert.throws(()=>assessP4V7MigrationReadiness({kind:READINESS_KIND,checks:[]}),/INVALID_INPUT/);
  assert.throws(()=>assessP4V7MigrationReadiness(null),/INVALID_INPUT/);
  assert.throws(()=>run({source_manifest:null,partial_copy_recovery:undefined}),/INVALID_INPUT/);
});
test('no arbitrary digest, sheet identifier or input free text is returned to logs',()=>{
  const b=run({audit_archive_lineage:{state:'reviewed',evidenceDigest:'c'.repeat(64)}});
  assert.equal(JSON.stringify(b).includes('c'.repeat(64)),false);
  assert.deepEqual(Object.keys(b.claimsOnly[0]).sort(),['area','criterion','id','state']);
});
test('checker has no Apps Script, Google Workspace, network, subprocess or writable file dependency',()=>{
  const s=fs.readFileSync(new URL('../tools/p4-v7-migration-readiness.mjs',import.meta.url),'utf8');
  for(const phrase of ['DriveApp.','SpreadsheetApp.','UrlFetchApp.','google.script.run','fetch(','exec(','writeFile(','createFile('])
    assert.equal(s.includes(phrase),false);
  assert.doesNotMatch(s,/from\s+['"](?:node:(?:fs|http|https|child_process|net)|googleapis)/);
});
