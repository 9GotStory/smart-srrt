#!/usr/bin/env node
/**
 * D331 N1-B2C-A — LOCAL, OFFLINE evidence shape/isolation comparison only.
 * Does NOT contact Google, validate attestation provenance, access Script
 * Properties, authenticate an owner, or prove an actual DEV environment.
 * Never export as Apps Script, register as D331 RPC, deploy or read PHI.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MODULE_PATH=fileURLToPath(import.meta.url);
const REPO_ROOT=fs.realpathSync(path.resolve(path.dirname(MODULE_PATH),'..'));
const FORMAT='D331_B2C_PRIVATE_METADATA_V2';
const MIME='application/vnd.google-apps.spreadsheet';
const IDENT=/^[A-Za-z0-9_-]{15,200}$/;
const SHA=/^[0-9a-f]{40}$/;

export const MAIN_HEADERS=Object.freeze([
  'ลำดับ','วันรับแจ้ง','ผู้แจ้งข่าว/หน่วยงานที่แจ้ง','การเฝ้าระวัง','กลุ่มโรค',
  'โรค/ภัย/เหตุการณ์','ประเภทเหตุการณ์','สถานที่เกิดเหตุ','วันที่เริ่มป่วย',
  'หมู่','ตำบล','อำเภอ','จังหวัด','รายละเอียดเหตุการณ์','การตรวจสอบ',
  'วิธีการตรวจสอบ','เข้าเกณฑ์สอบสวนโรค','ประเภทการสอบสวนโรค',
  'ประเมินความเสี่ยงแจ้งเตือน','หน่วยงานแจ้งเตือน','การดำเนินการตามมาตรการ',
  'วันที่ดำเนินการตามมาตรการ','หน่วยงานรับแจ้ง','ลงสอบสวนโรค',
  'หมายเหตุ','วันที่ลงสอบสวนโรค','ผู้บันทึก','วันที่บันทึก/แก้ไขล่าสุด',
  'ชื่อหมู่บ้าน','รหัสหมู่บ้าน','EventID','Revision','RecordStatus',
  'CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason','OwnerUserID'
]);
export const AREA_HEADERS=Object.freeze([
  'AreaID','จังหวัด','อำเภอ','ตำบล','หมู่','ชื่อหมู่บ้าน',
  'รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy'
]);

const SCRIPT_KEYS=[
  'expectedDevId','observedId','expectedDeploymentId','observedDeploymentId',
  'deploymentParentScriptId','knownProdScriptIds','knownTestScriptIds',
  'knownProdDeploymentIds','knownTestDeploymentIds'
];
const DATABASE_KEYS=[
  'expectedDevId','observedId','scriptPropertyId','propertyPresent',
  'mimeType','ownerReviewedAsDev','aclReviewedAsDev',
  'knownProdSpreadsheetIds','knownTestSpreadsheetIds'
];
function deny() {throw new Error('D331_B2C_EVIDENCE_DENIED');}
function recordWithKeys(value,keys) {
  if (!value || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype ||
      Object.keys(value).length!==keys.length ||
      keys.some(key=>!Object.hasOwn(value,key))) deny();
}
function id(value){if(typeof value!=='string'||!IDENT.test(value))deny();return value;}
function ids(values,requireNonEmpty){
  if(!Array.isArray(values)||values.length>100 ||
     (requireNonEmpty && values.length<1))deny();
  const seen=new Set();
  for(const value of values){id(value);if(seen.has(value))deny();seen.add(value);}
  return seen;
}
function equalHeaders(actual,wanted){
  if(!Array.isArray(actual)||actual.length!==wanted.length ||
     actual.some((v,i)=>v!==wanted[i]))deny();
}
function compareIdSet(expected,observed,foreignA,foreignB,testingSeparate){
  const e=id(expected),o=id(observed);
  // The Product Owner confirmed that there is NO Production. Nonempty
  // Production IDs are contradictory, and made-up placeholders are forbidden.
  const prod=ids(foreignA,false),test=ids(foreignB,testingSeparate);
  if(prod.size!==0 || (testingSeparate===false && test.size!==0) ||
     e!==o || test.has(e))deny();
}
function evidenceInstant(value){
  if(typeof value!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))deny();
  const n=Date.parse(value);
  if(!Number.isFinite(n)||new Date(n).toISOString()!==value)deny();
  return n;
}

/**
 * An entirely local comparison of *untrusted* privately captured metadata.
 * Returning localShapeOk NEVER signifies Cloud DEV identity verification.
 */
export function evaluateOfflineEvidence(evidence,{expectedSourceSha,nowMs=Date.now()}={}){
  if(typeof expectedSourceSha!=='string'||!SHA.test(expectedSourceSha)||
     !Number.isFinite(nowMs))deny();
  recordWithKeys(evidence,['format','sourceSha','observedAt','environment',
    'script','database','headers','readScope']);
  if(evidence.format!==FORMAT||evidence.sourceSha!==expectedSourceSha)deny();
  const age=nowMs-evidenceInstant(evidence.observedAt);
  if(age<0||age>24*60*60*1000)deny();

  // All flags are untrusted operator claims; even a local PASS does not
  // verify a live Script Property, Deployment or owner identity.
  recordWithKeys(evidence.environment,['productionStatus','testingTopology']);
  if(evidence.environment.productionStatus!=='NOT_CONFIGURED' ||
     !['SHARED_DEVELOPMENT_TESTING','SEPARATE_TEST'].includes(evidence.environment.testingTopology))deny();
  const testingSeparate=evidence.environment.testingTopology==='SEPARATE_TEST';
  const s=evidence.script,d=evidence.database;
  recordWithKeys(s,SCRIPT_KEYS);
  recordWithKeys(d,DATABASE_KEYS);
  compareIdSet(s.expectedDevId,s.observedId,
    s.knownProdScriptIds,s.knownTestScriptIds,testingSeparate);
  compareIdSet(s.expectedDeploymentId,s.observedDeploymentId,
    s.knownProdDeploymentIds,s.knownTestDeploymentIds,testingSeparate);
  if(id(s.deploymentParentScriptId)!==s.observedId ||
     s.observedId===s.observedDeploymentId)deny();
  compareIdSet(d.expectedDevId,d.observedId,
    d.knownProdSpreadsheetIds,d.knownTestSpreadsheetIds,testingSeparate);
  if(d.propertyPresent!==true||id(d.scriptPropertyId)!==d.observedId||
     d.observedId===s.observedId||d.observedId===s.observedDeploymentId||
     d.mimeType!==MIME||
     d.ownerReviewedAsDev!==true||d.aclReviewedAsDev!==true)deny();

  recordWithKeys(evidence.headers,['main','areas']);
  equalHeaders(evidence.headers.main,MAIN_HEADERS);
  equalHeaders(evidence.headers.areas,AREA_HEADERS);
  recordWithKeys(evidence.readScope,['metadataOnly','patientRowsRead',
    'propertyMutated','spreadsheetMutated','scriptMutated']);
  const scope=evidence.readScope;
  if(scope.metadataOnly!==true||scope.patientRowsRead!==false||
    scope.propertyMutated!==false||scope.spreadsheetMutated!==false||
    scope.scriptMutated!==false)deny();
  return Object.freeze({
    localEvidenceStructure:'PASS',
    claimedEnvironment:'DEV',
    actualCloudIdentity:'NOT_VERIFIED',
    authorizationForLiveOperations:'HOLD'
  });
}
export function loadPrivateEvidence(filename,{repositoryRoot=REPO_ROOT}={}){
  if(typeof filename!=='string'||!path.isAbsolute(filename))deny();
  const root=fs.realpathSync(repositoryRoot);
  const statLink=fs.lstatSync(filename);
  if(statLink.isSymbolicLink()||!statLink.isFile())deny();
  const full=fs.realpathSync(filename);
  if(full===root||full.startsWith(root+path.sep))deny();
  const st=fs.statSync(full);
  // Owner-only private evidence; never print or commit the identifiers.
  if((st.mode&0o077)!==0||st.size<=0||st.size>32768)deny();
  let evidence;try{evidence=JSON.parse(fs.readFileSync(full,'utf8'));}catch{deny();}
  return evidence;
}
function cli(){
  // Only a local private file is read. NO Google or subprocess calls.
  try{
    if(process.argv.length!==6||process.argv[2]!=='--private-file'||
      process.argv[4]!=='--expected-source-sha')deny();
    const evidence=loadPrivateEvidence(process.argv[3]);
    evaluateOfflineEvidence(evidence,{expectedSourceSha:process.argv[5]});
    console.log('B2C_PRIVATE_EVIDENCE_SHAPE=PASS');
    console.log('B2C_ACTUAL_DEV_CLOUD_IDENTITY=NOT_VERIFIED');
    console.log('B2C_GOOGLE_API=NOT_CALLED; B2C_LIVE_ACCESS=HOLD');
    console.log('D331_FEATURE=OFF; DDL_TEST=HOLD; PRODUCTION=NOT_CONFIGURED');
  }catch {
    // Fail-closed and NO attacker-controlled exception text, paths, IDs,
    // patient information, headers or account details printed.
    console.error('B2C_PRIVATE_EVIDENCE_SHAPE=FAIL');
    console.error('B2C_ACTUAL_DEV_CLOUD_IDENTITY=NOT_VERIFIED');
    console.error('B2C_GOOGLE_API=NOT_CALLED; B2C_LIVE_ACCESS=HOLD');
    process.exitCode=2;
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===MODULE_PATH)cli();
