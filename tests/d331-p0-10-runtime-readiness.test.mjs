import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 inspectP010Candidate,CURRENT_NATIVE_SERVER,
 CANDIDATE_D331_DEPENDENCIES,EXPECTED_D331_SHEETS
} from '../tools/d331-p0-10-runtime-readiness.mjs';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

const load=pathname=>fs.readFileSync(new URL('../'+pathname,import.meta.url),'utf8');
const replace=(file,callback)=>pathname=>
  pathname===file?callback(load(pathname)):load(pathname);
const hold=opts=>assert.throws(()=>inspectP010Candidate(opts),
  /D331_P010_READINESS_HOLD/);
test('P0-10 existing native source order is unchanged',()=>{
 assert.deepEqual([...GAS_SERVER_SOURCES],[...CURRENT_NATIVE_SERVER,...CANDIDATE_D331_DEPENDENCIES]);
 assert.equal(GAS_SERVER_SOURCES.length,15);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.ok(GAS_HTML_SOURCES.at(-1).endsWith('04-browser-app.html'));
 assert.equal(GAS_SERVER_SOURCES.includes('src/dengue/12-p0-07-guarded-dev-crud.gs'),true);
 assert.equal(GAS_SERVER_SOURCES.includes('src/dengue/13-p0-08-dev-readonly-preflight.gs'),true);
});
test('candidate source set is only seven ordered dependencies, no historical v1 modules',()=>{
 assert.deepEqual([...CANDIDATE_D331_DEPENDENCIES],[
  'src/dengue/03-n1b1-trusted-event-contract.gs',
  'src/dengue/07-p0-02a-mvp-schema-contract.gs',
  'src/dengue/09-p0-03b-dev-readonly-adapter.gs',
  'src/dengue/10-p0-05-v2-schema-compat.gs',
  'src/dengue/11-p0-06-offline-workflow-engine.gs',
  'src/dengue/12-p0-07-guarded-dev-crud.gs',
  'src/dengue/13-p0-08-dev-readonly-preflight.gs'
 ]);
 assert.equal(new Set(CANDIDATE_D331_DEPENDENCIES).size,7);
});
test('full Apps Script global load preview passes without Google services',()=>{
 const result=inspectP010Candidate();
 assert.deepEqual({...result},{
  result:'OFFLINE_SOURCE_ORDER_PASS',
  currentRegisteredServerCount:8,candidateAdditionalServerCount:7,
  hypotheticalServerCount:15,runtimeManifest:'REGISTERED_NATIVE33_SOURCE_ONLY',
  htmlManifest:'UNCHANGED',schema:'V2_DRAFT',dengueFlags:'OFF',
  clinicalPolicy:'NOT_APPROVED',
  operatorBinding:'OWNER_VISUAL_PASS_API_NOT_ATTESTED',
  grantsAndLiveCrud:'NOT_TESTED',
  canStage:false,canDeploy:false,canWrite:false
 });
});
test('schema v2 must maintain exactly seven ordered table names',()=>{
 assert.deepEqual([...EXPECTED_D331_SHEETS],[
  'DengueCases','DenguePlans','DengueControlActions',
  'DengueEntomology','DengueFollowups','DengueRequestLedger',
  'D331AccessGrants'
 ]);
});
test('missing required candidate file blocks in-memory preview',()=>{
 const file=CANDIDATE_D331_DEPENDENCIES[3];
 hold({read:p=>p===file?undefined:load(p)});
});
test('a proposed historical preview source change is rejected',()=>{
 hold({native:[...GAS_SERVER_SOURCES,'src/dengue/09-p0-03b-dev-readonly-adapter.gs']});
 hold({native:[...GAS_SERVER_SOURCES].reverse()});
});
test('an omitted, duplicated or reordered candidate dependency is rejected',()=>{
 hold({added:CANDIDATE_D331_DEPENDENCIES.slice(0,-1)});
 hold({added:[...CANDIDATE_D331_DEPENDENCIES.slice(0,-1),CANDIDATE_D331_DEPENDENCIES[0]]});
 hold({added:[...CANDIDATE_D331_DEPENDENCIES].reverse()});
});
test('global top-level symbol collision with legacy Smart SRRT source blocks',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[0],
  src=>src+'\nvar CONFIG = {};\n')});
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[0],
  src=>src+'\nfunction getDb_() {}\n')});
});
test('unexpected browser-callable global function blocks',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[2],
  src=>src+'\nfunction releaseDengueRecords() {return [];}\n')});
});
test('top-level network, Drive or Sheets invocation is denied in VM',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[3],
  src=>src+'\nSpreadsheetApp.openById("EXTERNAL");\n')});
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[3],
  src=>src+'\nPropertiesService.getScriptProperties();\n')});
});
test('accidental enablement of foundation read or write gate is denied',()=>{
 hold({read:replace('src/dengue/00-g1a-foundation.gs',
  src=>src.replace('D331_G1A_ENABLED = false','D331_G1A_ENABLED = true'))});
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[2],
  src=>src.replace('D331_P003B_ENABLED_ = false','D331_P003B_ENABLED_ = true'))});
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[5],
  src=>src.replace('D331_P007_ENABLED_ = false','D331_P007_ENABLED_ = true'))});
});
test('clinical policy approval, allowlist or policy revision drift blocks',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[1],
  src=>src.replace("D331_P002A_APPROVAL_ = 'DRAFT_ONLY'","D331_P002A_APPROVAL_ = 'ACTIVE'"))});
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[2],
  src=>src.replace('D331_P003B_APPROVED_DISEASE_LABELS_ = []',
    "D331_P003B_APPROVED_DISEASE_LABELS_ = ['DENGUE']"))});
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[2],
  src=>src.replace("D331_P003B_APPROVED_POLICY_REVISION_ = ''",
    "D331_P003B_APPROVED_POLICY_REVISION_ = 'TEST'"))});
});
test('unexpected DB binding configured in source blocks preview',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[2],
  src=>src.replace("D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = ''",
    "D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = 'NONAUTHORITATIVE_TEST'"))});
});
test('schema tab count drift blocks even when all sources parse',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[4],
  src=>src.replace("['followups','DengueFollowups','FollowupID']",
    "['followups','DengueCases','FollowupID']"))});
});
test('source syntax error blocks without changing manifests',()=>{
 hold({read:replace(CANDIDATE_D331_DEPENDENCIES[6],
  src=>src+'\nfunction invalid (\n')});
});
test('candidate performs no reads, writes, deployment or registration',()=>{
 const manifestBefore=load('tools/native-sources.mjs');
 inspectP010Candidate();
 const manifestAfter=load('tools/native-sources.mjs');
 assert.equal(manifestAfter,manifestBefore);
 assert.ok(inspectP010Candidate().canDeploy===false);
});
