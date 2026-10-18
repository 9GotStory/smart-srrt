#!/usr/bin/env node
/**
 * D331 P0-09 — READ-ONLY existing Apps Script deployment verification.
 *
 * Runs exactly one authenticated clasp 3.x GET-only list-deployments command.
 * No clasp login, pull, push, create, deploy, run, or Script Property writes.
 * Prints STATUS FLAGS ONLY: never prints identifiers, OAuth tokens or raw API.
 *
 * Property -> Spreadsheet binding CANNOT be verified by deployments.list.
 * Report that gate as NOT_ATTESTED until existing Apps Script Project Settings
 * is independently inspected. Does not activate D331 or authorize writes.
 */
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const IDENT=/^[A-Za-z0-9_-]{20,200}$/;
export const COMMAND=Object.freeze(['list-deployments','--json']);
const MAX_OUTPUT=256*1024;
function deny(code){throw new Error(code);}
export function summarizeDeploymentJson(raw,{scriptId,deploymentId}={}){
  if(typeof scriptId!=='string'||!IDENT.test(scriptId)||
     typeof deploymentId!=='string'||!IDENT.test(deploymentId)||
     scriptId===deploymentId || typeof raw!=='string'||
     raw.length<2||raw.length>MAX_OUTPUT)deny('INVALID_INPUT');
  let response;
  try{response=JSON.parse(raw);}catch{deny('INVALID_CLASP_JSON');}
  // Strict shape: not every clasp version supports JSON list-deployments.
  // Unknown shape is HOLD (never parse arbitrary human-readable lines).
  const ds=Array.isArray(response)?response:response?.deployments;
  if(!Array.isArray(ds)||ds.length>500)deny('UNSUPPORTED_CLASP_RESPONSE');
  const selected=[];
  const ids=new Set();
  for(const d of ds){
    if(!d||typeof d!=='object'||Array.isArray(d)||
       typeof d.deploymentId!=='string'||!IDENT.test(d.deploymentId)||
       !d.deploymentConfig||d.deploymentConfig.scriptId!==scriptId||
       !Array.isArray(d.entryPoints))deny('INVALID_DEPLOYMENT_DATA');
    if(ids.has(d.deploymentId))deny('DUPLICATE_DEPLOYMENT_ID');
    ids.add(d.deploymentId);
    if(d.deploymentId===deploymentId)selected.push(d);
  }
  const target=selected[0];
  const webapp=!!target&&target.entryPoints.some(x=>
    x&&x.entryPointType==='WEB_APP');
  return Object.freeze({
    scriptDeploymentQuery:'PASS',
    expectedDeploymentInScript:target?'PASS':'FAIL',
    targetWebApp:target?(webapp?'PASS':'FAIL'):'UNKNOWN',
    scriptPropertyDbBinding:'NOT_ATTESTED',
    permissionGrant:'NOT_TESTED',
    liveCrud:'NOT_TESTED',
    d331Activation:'HOLD'
  });
}
function approvedEnv(env){
  if(env.SMART_SRRT_P009_READONLY_APPROVED!=='YES')deny('HUMAN_GATE_REQUIRED');
  const scriptId=env.SMART_SRRT_SCRIPT_ID,deploymentId=env.SMART_SRRT_DEPLOYMENT_ID;
  if(!IDENT.test(scriptId||'')||!IDENT.test(deploymentId||'')||
      scriptId===deploymentId)deny('MISSING_CANONICAL_IDENTIFIERS');
  return {scriptId,deploymentId};
}
export function inspectExistingRuntime({
 env=process.env,
 runner=(exe,args)=>execFileSync(exe,args,{
   encoding:'utf8',timeout:20000,maxBuffer:MAX_OUTPUT,
   stdio:['ignore','pipe','pipe'],shell:false
 })
}={}){
  const ids=approvedEnv(env);
  const executable=env.SMART_SRRT_CLASP||'clasp';
  if(typeof executable!=='string'||executable.length>256||
     !/^[A-Za-z0-9_./-]+$/.test(executable))deny('INVALID_CLASP_COMMAND');
  let version;
  try{version=runner(executable,['--version']);}
  catch{deny('CLASP_UNAVAILABLE');}
  if(typeof version!=='string'||!/\b3\.\d+\.\d+\b/.test(version))
    deny('CLASP_3_REQUIRED');
  let raw;
  try{
    raw=runner(executable,[COMMAND[0],ids.scriptId,COMMAND[1]]);
  }catch{deny('CLASP_DEPLOYMENTS_GET_FAILED');}
  return summarizeDeploymentJson(raw,ids);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==3||process.argv[2]!=='--read-only'){
    console.log('P009_STATUS=HOLD; ERROR=EXPLICIT_READONLY_FLAG_REQUIRED');
    process.exitCode=2;
  }else{
    try{
      const result=inspectExistingRuntime();
      for(const [k,v] of Object.entries(result))console.log(k+'='+v);
      if(result.expectedDeploymentInScript!=='PASS'||result.targetWebApp!=='PASS')
        process.exitCode=1;
    }catch(e){
      const codes=new Set([
        'HUMAN_GATE_REQUIRED','MISSING_CANONICAL_IDENTIFIERS',
        'INVALID_CLASP_COMMAND','CLASP_UNAVAILABLE','CLASP_3_REQUIRED',
        'CLASP_DEPLOYMENTS_GET_FAILED','INVALID_CLASP_JSON',
        'UNSUPPORTED_CLASP_RESPONSE','INVALID_DEPLOYMENT_DATA',
        'DUPLICATE_DEPLOYMENT_ID','INVALID_INPUT'
      ]);
      console.log('P009_STATUS=HOLD');
      console.log('P009_ERROR_CLASS='+
        (codes.has(e?.message)?e.message:'UNKNOWN'));
      console.log('scriptPropertyDbBinding=NOT_ATTESTED');
      console.log('liveCrud=NOT_TESTED');
      process.exitCode=1;
    }
  }
}
