import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base=read('src/dengue/00-g1a-foundation.gs');
const adapter=read('src/dengue/09-p0-03b-dev-readonly-adapter.gs');
const schema=read('src/dengue/07-p0-02a-mvp-schema-contract.gs');
const crud=read('src/dengue/12-p0-07-guarded-dev-crud.gs');
const layout=read('src/web/02-app-layout.html');
const records=read('src/web/03h-client-event-records.html');
const native=read('tools/native-sources.mjs');
const contract=read('docs/implementation/d331-p0-22a-event-case-readonly-contract.md');

test('P0-22A: fail-closed server and draft-only flags remain hard OFF',()=>{
  assert.match(base,/\bD331_G1A_ENABLED\s*=\s*false\b/);
  assert.match(adapter,/\bD331_P003B_ENABLED_\s*=\s*false\b/);
  assert.match(adapter,/\bD331_P003B_APPROVED_DEV_SPREADSHEET_ID_\s*=\s*''/);
  assert.match(adapter,/\bD331_P003B_APPROVED_DISEASE_LABELS_\s*=\s*\[\]/);
  assert.match(adapter,/\bD331_P003B_APPROVED_POLICY_REVISION_\s*=\s*''/);
  assert.match(schema,/\bD331_P002A_APPROVAL_\s*=\s*'DRAFT_ONLY'/);
  assert.match(crud,/\bD331_P007_ENABLED_\s*=\s*false\b/);
});

test('P0-22A: current RPC is only count summary, not a patient detail API',()=>{
  assert.match(adapter,/function getDengueWorkspace\(sessionToken,eventId\)/);
  assert.match(adapter,/if\s*\(D331_G1A_ENABLED!==true\|\|D331_P003B_ENABLED_!==true\)/);
  const rpc=adapter.slice(adapter.indexOf('function getDengueWorkspace('));
  assert.match(rpc,/d331P003bAuthorizedContext_\(sessionToken,eventId\)/);
  assert.match(rpc,/counts:counts/);
  assert.match(rpc,/slaAssessment:'NOT_EVALUATED'/);
  assert.match(rpc,/canWrite:false,canEnable:false/);
  assert.doesNotMatch(rpc,/patientName|address|password|SpreadsheetApp|google\.script|setValues?|appendRow|insertSheet/i);
  assert.doesNotMatch(adapter,/function listDengueCasesForEvent\s*\(/);
});

test('P0-22A: original mock stays Records-only and the F02 read interface remains OFF',()=>{
  assert.match(layout,/<details id="d331-p018-preview"/);
  assert.match(layout,/id="d331-p020-region"[^>]*hidden/);
  assert.match(layout,/Mock-only · D331 OFF/);
  assert.match(records,/d331P020PreviewBridge_\.mount\(\)/);
  assert.doesNotMatch(layout,/data-page="dengue"|id="page-dengue"/);
  assert.match(records,/var D331_F02_CASE_READ_AVAILABLE_ = false;/);
  assert.doesNotMatch(native,/src\/dengue\/09-p0-03b-dev-readonly-adapter\.gs/);
});

test('P0-22A: readable design names exact five domains and keeps clinical scope unsigned',()=>{
  assert.match(contract,/DengueCases/);
  for(const value of ['Database','GS backend','UI\/UX','Security','Testing','D331_UNAVAILABLE','NOT_EVALUATED','P022_REAL_CASE_READ=HOLD']) assert.ok(contract.includes(value),value);
  assert.match(contract,/no patient data read without explicit authority/i);
});
