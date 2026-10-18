#!/usr/bin/env node
/**
 * P0-10 — PRIVATE OFFLINE runtime integration readiness check.
 * Build a candidate LOAD ORDER in memory. NEVER register candidate GAS sources
 * in tools/native-sources.mjs, stage, deploy, call Google, enable flags or write.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from './native-sources.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const CURRENT_NATIVE_SERVER=Object.freeze([
  'src/server/00-bootstrap.gs',
  'src/server/01-schema-and-db.gs',
  'src/server/02-auth-and-attachments.gs',
  'src/server/03-events-and-dashboard.gs',
  'src/server/04-admin-and-audit.gs',
  'src/server/05-reports-and-models.gs',
  'src/server/06-gemini-and-prompts.gs',
  'src/dengue/00-g1a-foundation.gs'
]);
export const CANDIDATE_D331_DEPENDENCIES=Object.freeze([
  'src/dengue/03-n1b1-trusted-event-contract.gs',
  'src/dengue/07-p0-02a-mvp-schema-contract.gs',
  'src/dengue/09-p0-03b-dev-readonly-adapter.gs',
  'src/dengue/10-p0-05-v2-schema-compat.gs',
  'src/dengue/11-p0-06-offline-workflow-engine.gs',
  'src/dengue/12-p0-07-guarded-dev-crud.gs',
  'src/dengue/13-p0-08-dev-readonly-preflight.gs'
]);
export const EXPECTED_D331_SHEETS=Object.freeze([
  'DengueCases','DenguePlans','DengueControlActions',
  'DengueEntomology','DengueFollowups','DengueRequestLedger','D331AccessGrants'
]);
function fail(){throw new Error('D331_P010_READINESS_HOLD');}
function identical(a,b){
  return Array.isArray(a)&&a.length===b.length&&
    a.every((item,index)=>item===b[index]);
}
function declarations(source){
  // Check GAS top-level global function and var collisions across the full
  // proposed package; comments excluded so README text isn't executable.
  const stripped=source
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/^\s*\/\/.*$/gm,'');
  return [...stripped.matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)\b/gm)]
    .map(m=>m[1]);
}
function readSource(pathname){
  return fs.readFileSync(path.resolve(ROOT,pathname),'utf8');
}

/**
 * Pure, bounded analysis of the *candidate*, not a deployable build.
 * Always return canStage/canDeploy/canWrite=false, even for a valid preview.
 */
export function inspectP010Candidate({
 native=GAS_SERVER_SOURCES,
 html=GAS_HTML_SOURCES,
 added=CANDIDATE_D331_DEPENDENCIES,
 read=readSource
}={}){
  if(!identical(native,CURRENT_NATIVE_SERVER) ||
     !identical(added,CANDIDATE_D331_DEPENDENCIES) ||
     !identical(html,GAS_HTML_SOURCES) ||
     html.length!==17 || native.length!==8 || added.length!==7) fail();
  const candidate=[...native,...added];
  if(new Set(candidate).size!==15)fail();
  const symbols=new Map();
  const sandbox=vm.createContext({});
  for(const filename of candidate){
    let source;
    try{source=read(filename);}catch{fail();}
    if(typeof source!=='string'||!source.trim()||source.length>350000)fail();
    for(const name of declarations(source)){
      if(symbols.has(name))fail();
      symbols.set(name,filename);
    }
    if(added.includes(filename)){
      const publicFns=[...source.matchAll(/^function\s+(\w+)\s*\(/gm)]
        .map(m=>m[1]).filter(name=>!name.endsWith('_'));
      if(publicFns.length>0)fail();
    }
    try{
      // Evaluate only global declarations and literal initializers. Any
      // top-level SpreadsheetApp / PropertiesService call must fail.
      new vm.Script(source,{filename}).runInContext(sandbox,{timeout:1000});
    }catch{fail();}
  }
  try{
    const schema=vm.runInContext('d331P002aNames_()',sandbox);
    if(!identical(schema,EXPECTED_D331_SHEETS)||
       !identical(vm.runInContext('D331_P005_V2_TABS_',sandbox),EXPECTED_D331_SHEETS))
      fail();
    const tables=vm.runInContext(
      'D331_P006_TABLES_.map(function(t){return t[1]})',sandbox);
    if(!identical(tables,EXPECTED_D331_SHEETS.slice(0,5)))fail();
    const kinds=vm.runInContext(
      'Object.keys(D331_P007_KIND_).map(function(k){return D331_P007_KIND_[k].sheet})',
      sandbox);
    if(!identical(kinds,EXPECTED_D331_SHEETS.slice(0,5)))fail();
    if(vm.runInContext('D331_G1A_ENABLED',sandbox)!==false||
       vm.runInContext('D331_P003B_ENABLED_',sandbox)!==false||
       vm.runInContext('D331_P007_ENABLED_',sandbox)!==false||
       vm.runInContext('D331_P002A_APPROVAL_',sandbox)!=='DRAFT_ONLY'||
       vm.runInContext('D331_P003B_APPROVED_DEV_SPREADSHEET_ID_',sandbox)!==''||
       vm.runInContext('D331_P003B_APPROVED_DISEASE_LABELS_.length',sandbox)!==0||
       vm.runInContext('D331_P003B_APPROVED_POLICY_REVISION_',sandbox)!=='')
      fail();
    // Every internal path must reject by DEFAULT even when a caller has
    // syntactically valid-looking IDs. No Google service is available here.
    for(const expr of [
      "d331P003bReadOnly_('', '')",
      "d331P007Operate_('', '', {})",
      'd331P008CheckHeaders_()'
    ]){
      try{vm.runInContext(expr,sandbox,{timeout:1000});fail();}
      catch(e){if(e?.message==='D331_P010_READINESS_HOLD')throw e;}
    }
  }catch{fail();}
  return Object.freeze({
    result:'OFFLINE_SOURCE_ORDER_PASS',
    currentRegisteredServerCount:8,
    candidateAdditionalServerCount:7,
    hypotheticalServerCount:15,
    runtimeManifest:'UNCHANGED',
    htmlManifest:'UNCHANGED',
    schema:'V2_DRAFT',
    dengueFlags:'OFF',
    clinicalPolicy:'NOT_APPROVED',
    operatorBinding:'OWNER_VISUAL_PASS_API_NOT_ATTESTED',
    grantsAndLiveCrud:'NOT_TESTED',
    canStage:false,canDeploy:false,canWrite:false
  });
}
if(process.argv[1]&&import.meta.url===fileURLToPath(import.meta.url) &&
   process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const status=inspectP010Candidate();
    Object.entries(status).forEach(([key,value])=>{
      console.log(key+'='+value);
    });
  }catch{
    console.log('P010=HOLD; D331_FLAGS=OFF; CAN_DEPLOY=NO');
    process.exitCode=1;
  }
}
