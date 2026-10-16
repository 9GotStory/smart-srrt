import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {MAIN_HEADERS,AREA_HEADERS,evaluateOfflineEvidence,
  loadPrivateEvidence} from '../tools/d331-b2c-offline-dev-metadata-preflight.mjs';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TOOL=path.join(REPO,'tools/d331-b2c-offline-dev-metadata-preflight.mjs');
const SOURCE=fs.readFileSync(TOOL,'utf8');
const MAIN_SHA='8b36a22cd2ce3d1584d4ed38190bc6dfb2ea7d41';
const CLOCK=Date.parse('2026-10-17T00:00:00.000Z');
function sample(){
  return {
    format:'D331_B2C_PRIVATE_METADATA_V1',
    sourceSha:MAIN_SHA,
    observedAt:'2026-10-17T00:00:00.000Z',
    script:{
      expectedDevId:'DEV-SCRIPT-AAAAAAAAAAAA',
      observedId:'DEV-SCRIPT-AAAAAAAAAAAA',
      expectedDeploymentId:'DEV-DEPLOY-AAAAAAAAAAAA',
      observedDeploymentId:'DEV-DEPLOY-AAAAAAAAAAAA',
      deploymentParentScriptId:'DEV-SCRIPT-AAAAAAAAAAAA',
      knownProdScriptIds:['PROD-SCRIPT-BBBBBBBBBBBB'],
      knownTestScriptIds:['TEST-SCRIPT-CCCCCCCCCCCC'],
      knownProdDeploymentIds:['PROD-DEPLOY-BBBBBBBBBBBB'],
      knownTestDeploymentIds:['TEST-DEPLOY-CCCCCCCCCCCC']
    },
    database:{
      expectedDevId:'DEV-SHEET-AAAAAAAAAAAA',
      observedId:'DEV-SHEET-AAAAAAAAAAAA',
      scriptPropertyId:'DEV-SHEET-AAAAAAAAAAAA',
      propertyPresent:true,
      mimeType:'application/vnd.google-apps.spreadsheet',
      ownerReviewedAsDev:true,
      aclReviewedAsDev:true,
      knownProdSpreadsheetIds:['PROD-SHEET-BBBBBBBBBBBB'],
      knownTestSpreadsheetIds:['TEST-SHEET-CCCCCCCCCCCC']
    },
    headers:{main:[...MAIN_HEADERS],areas:[...AREA_HEADERS]},
    readScope:{metadataOnly:true,patientRowsRead:false,
      propertyMutated:false,spreadsheetMutated:false,scriptMutated:false}
  };
}
const evaluate=(e,nowMs=CLOCK)=>evaluateOfflineEvidence(e,{expectedSourceSha:MAIN_SHA,nowMs});
function deny(modify){
  const e=sample();modify(e);
  assert.throws(()=>evaluate(e),/D331_B2C_EVIDENCE_DENIED/);
}
function privateTempFile(text,mode=0o600){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d331-b2c-synthetic-'));
  const file=path.join(dir,'private.json');
  fs.writeFileSync(file,text,{mode});
  fs.chmodSync(file,mode);
  return {dir,file,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}

test('B2C checker is offline only and leaves Native25 + feature OFF',()=>{
  const manifest=fs.readFileSync(path.join(REPO,'tools/native-sources.mjs'),'utf8');
  const foundation=fs.readFileSync(path.join(REPO,'src/dengue/00-g1a-foundation.gs'),'utf8');
  assert.doesNotMatch(manifest,/src\/dengue\/0[34]-n1b/);
  assert.match(manifest,/src\/dengue\/00-g1a-foundation\.gs/);
  assert.match(foundation,/var D331_G1A_ENABLED = false;/);
  assert.doesNotMatch(SOURCE,/\b(?:SpreadsheetApp|DriveApp|PropertiesService|LockService|ScriptApp|UrlFetchApp)\s*(?:\.|\[)/);
  assert.doesNotMatch(SOURCE,/from ['"](?:googleapis|@google\/|node:https|node:http)/);
});
test('exact main and area header arrays match 39 source-defined MainData columns',()=>{
  const ctx=vm.createContext({});
  const bootstrap=fs.readFileSync(path.join(REPO,'src/server/00-bootstrap.gs'),'utf8');
  vm.runInContext(bootstrap,ctx);
  assert.deepEqual([...MAIN_HEADERS],[...ctx.MAIN_HEADERS,...ctx.EVENT_META_HEADERS,ctx.EVENT_OWNER_HEADER]);
  assert.equal(MAIN_HEADERS.length,39);
  assert.equal(AREA_HEADERS.length,10);
  assert.deepEqual([...AREA_HEADERS],['AreaID','จังหวัด','อำเภอ','ตำบล','หมู่',
    'ชื่อหมู่บ้าน','รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy']);
});
test('synthetic positive evidence checks locally but DOES NOT attest actual Google DEV',()=>{
  const result=evaluate(sample());
  assert.deepEqual(result,{localEvidenceStructure:'PASS',claimedEnvironment:'DEV',
    actualCloudIdentity:'NOT_VERIFIED',authorizationForLiveOperations:'HOLD'});
  assert.equal(Object.keys(result).some(x=>/id|owner|email|patient/i.test(x)),true); // status keys only
  assert.equal(JSON.stringify(result).includes('DEV-SHEET'),false);
});
test('reject missing/wrong source SHA, unknown fields, malformed timestamps and stale capture',()=>{
  deny(e=>e.sourceSha='0'.repeat(40));
  deny(e=>e.sourceSha='SHORT');
  deny(e=>e.format='BAD');
  deny(e=>e.patientRecord={name:'SYNTHETIC_PERSON'});
  deny(e=>delete e.database);
  deny(e=>e.observedAt='2026-10-16');
  deny(e=>e.observedAt='2026-10-14T00:00:00.000Z');
  deny(e=>e.observedAt='2026-10-17T00:00:01.000Z');
  deny(e=>e.observedAt='2026-02-30T00:00:00.000Z');
  assert.throws(()=>evaluateOfflineEvidence(sample(),{expectedSourceSha:'notsha',nowMs:CLOCK}),
    /D331_B2C_EVIDENCE_DENIED/);
});
test('reject arbitrary alternate script/deployment identity, mismatched parent and same IDs',()=>{
  deny(e=>e.script.expectedDevId='OTHER-SCRIPT-AAAAAAAAAAA');
  deny(e=>e.script.observedDeploymentId='OTHER-DEPLOY-AAAAAAAAAAA');
  deny(e=>e.script.deploymentParentScriptId='OTHER-SCRIPT-AAAAAAAAAAA');
  deny(e=>e.script.expectedDeploymentId=e.script.expectedDevId);
  deny(e=>e.script.observedId=e.script.observedDeploymentId);
  deny(e=>e.script.knownProdScriptIds=[e.script.expectedDevId]);
  deny(e=>e.script.knownTestScriptIds=[e.script.expectedDevId]);
  deny(e=>e.script.knownProdDeploymentIds=[e.script.expectedDeploymentId]);
  deny(e=>e.script.knownTestDeploymentIds=[e.script.expectedDeploymentId]);
  deny(e=>e.script.knownProdScriptIds=[]);
  deny(e=>e.script.knownTestScriptIds=[]);
  deny(e=>e.script.knownProdScriptIds=['same-isolation-id-AAAAA']);
  deny(e=>e.script.knownTestScriptIds=['same-isolation-id-AAAAA']);
  deny(e=>e.script.knownProdScriptIds=['PROD-SCRIPT-BBBBBBBBBBBB','PROD-SCRIPT-BBBBBBBBBBBB']);
  deny(e=>e.script.unexpectedSource='UNCHECKED');
});
test('reject script property fallback, Production/TEST database alias, owner and ACL gaps',()=>{
  deny(e=>e.database.propertyPresent=false);
  deny(e=>e.database.scriptPropertyId='OTHER-SHEET-AAAAAAAAAAAA');
  deny(e=>e.database.observedId='OTHER-SHEET-AAAAAAAAAAAA');
  deny(e=>e.database.expectedDevId='OTHER-SHEET-AAAAAAAAAAAA');
  deny(e=>e.database.knownProdSpreadsheetIds=[e.database.expectedDevId]);
  deny(e=>e.database.knownTestSpreadsheetIds=[e.database.expectedDevId]);
  deny(e=>e.database.knownProdSpreadsheetIds=[]);
  deny(e=>e.database.ownerReviewedAsDev=false);
  deny(e=>e.database.aclReviewedAsDev=false);
  deny(e=>e.database.mimeType='text/plain');
  deny(e=>e.database.unapprovedOwnerEmail='foo@invalid.test');
});
test('reject exact 39/10 header mismatch, reordered/duplicate/extra and claim PHI row read',()=>{
  deny(e=>e.headers.main.pop());
  deny(e=>e.headers.main[30]='OtherEventID');
  deny(e=>e.headers.main[38]='VoidReason');
  deny(e=>e.headers.main.push('PatientName'));
  deny(e=>e.headers.areas.reverse());
  deny(e=>e.headers.areas[7]='active');
  deny(e=>e.headers.areas=[]);
  deny(e=>e.headers.patients=['DATA']);
  deny(e=>e.readScope.patientRowsRead=true);
  deny(e=>e.readScope.metadataOnly=false);
  deny(e=>e.readScope.propertyMutated=true);
  deny(e=>e.readScope.spreadsheetMutated=true);
  deny(e=>e.readScope.scriptMutated=true);
  deny(e=>e.readScope.secret='TOKEN');
});
test('private evidence file is required outside repo, owner-only and not symlink',()=>{
  const v=privateTempFile(JSON.stringify(sample()));
  try{
    assert.deepEqual(loadPrivateEvidence(v.file),sample());
    const link=path.join(v.dir,'linked.json');
    fs.symlinkSync(v.file,link);
    assert.throws(()=>loadPrivateEvidence(link),/D331_B2C_EVIDENCE_DENIED/);
    fs.chmodSync(v.file,0o644);
    assert.throws(()=>loadPrivateEvidence(v.file),/D331_B2C_EVIDENCE_DENIED/);
    assert.throws(()=>loadPrivateEvidence('relative.json'),/D331_B2C_EVIDENCE_DENIED/);
    assert.throws(()=>loadPrivateEvidence(path.join(REPO,'package.json')),
      /D331_B2C_EVIDENCE_DENIED/);
  }finally{v.cleanup();}
});
test('CLI never prints private Script/Sheet identifiers and never claims Cloud PASS',()=>{
  const v=privateTempFile(JSON.stringify({...sample(),observedAt:new Date().toISOString()}));
  try{
    const p=spawnSync(process.execPath,[TOOL,'--private-file',v.file,
      '--expected-source-sha',MAIN_SHA],{encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
    assert.match(p.stdout,/B2C_PRIVATE_EVIDENCE_SHAPE=PASS/);
    assert.match(p.stdout,/B2C_ACTUAL_DEV_CLOUD_IDENTITY=NOT_VERIFIED/);
    assert.match(p.stdout,/B2C_LIVE_ACCESS=HOLD/);
    assert.doesNotMatch(p.stdout,/DEV-SCRIPT-|DEV-SHEET-|PROD-SHEET-|TEST-SHEET-/);
    const corrupted=privateTempFile(JSON.stringify({...sample(),
      sourceSha:'0'.repeat(40),observedAt:new Date().toISOString(),
      secret:'SYNTHETIC_SECRET_NEVER_LOG'}));
    try{
      const bad=spawnSync(process.execPath,[TOOL,'--private-file',corrupted.file,
        '--expected-source-sha',MAIN_SHA],{encoding:'utf8'});
      assert.equal(bad.status,2);
      assert.match(bad.stderr,/B2C_PRIVATE_EVIDENCE_SHAPE=FAIL/);
      assert.doesNotMatch(bad.stdout+bad.stderr,/SYNTHETIC_SECRET_NEVER_LOG|DEV-SHEET-|private.json/);
    }finally{corrupted.cleanup();}
  }finally{v.cleanup();}
});
