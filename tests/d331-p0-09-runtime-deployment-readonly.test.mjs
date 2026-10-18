import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizeDeploymentJson,inspectExistingRuntime} from
 '../tools/d331-p0-09-runtime-deployment-readonly.mjs';

const SCRIPT='SYNTHETIC_SCRIPT_ID_012345678901234';
const DEPLOY='SYNTHETIC_DEPLOYMENT_ID_0987654321';
const OTHER='SYNTHETIC_DEPLOYMENT_ID_0123012345';
const env={
 SMART_SRRT_P009_READONLY_APPROVED:'YES',
 SMART_SRRT_SCRIPT_ID:SCRIPT,
 SMART_SRRT_DEPLOYMENT_ID:DEPLOY
};
function deployment(id=DEPLOY,scriptId=SCRIPT,webapp=true){
 return {
  deploymentId:id,
  deploymentConfig:{scriptId,versionNumber:42},
  entryPoints:webapp?[{entryPointType:'WEB_APP',webApp:{url:'https://example.invalid/'}}]:
    [{entryPointType:'EXECUTION_API'}]
 };
}
function raw(ds){return JSON.stringify({deployments:ds});}
function simulate({out=raw([deployment()]),e=env,version='3.9.0',throwOn}={}){
 const calls=[];
 const runner=(bin,args)=>{
  calls.push({bin,args});
  if(throwOn===args[0])throw Error('SECRET_OPAQUE_PRIVATE_TOKEN');
  return args[0]==='--version'?version:out;
 };
 return {result:()=>inspectExistingRuntime({env:e,runner}),calls};
}
test('P0-09 is not Apps Script Native source or an RPC',()=>{
 const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/d331-p0-09-runtime-deployment-readonly/);
 const source=fs.readFileSync(
  new URL('../tools/d331-p0-09-runtime-deployment-readonly.mjs',import.meta.url),'utf8')
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\/\/[^\n]*/g,'');
 for(const forbidden of [
  'clasp push','clasp pull','clasp deploy','clasp login',
  'create-deployment','delete-deployment','setProperty(','appendRow('
 ])assert.equal(source.includes(forbidden),false,forbidden);
});
test('valid existing script and Web App deployment PASS only narrow binding',()=>{
 const s=simulate();
 const out=s.result();
 assert.deepEqual(out,{
  scriptDeploymentQuery:'PASS',
  expectedDeploymentInScript:'PASS',
  targetWebApp:'PASS',
  scriptPropertyDbBinding:'NOT_ATTESTED',
  permissionGrant:'NOT_TESTED',
  liveCrud:'NOT_TESTED',
  d331Activation:'HOLD'
 });
 assert.deepEqual(s.calls.map(c=>c.args),[
  ['--version'],['list-deployments',SCRIPT,'--json']
 ]);
});
test('strictly no deploy or create child commands',()=>{
 const {result,calls}=simulate({out:raw([deployment(),deployment(OTHER)])});
 assert.equal(result().expectedDeploymentInScript,'PASS');
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>['--version','list-deployments'].includes(c.args[0])));
});
test('expected deployment missing is FAIL, never auto-selects another',()=>{
 const out=summarizeDeploymentJson(raw([deployment(OTHER)]),
  {scriptId:SCRIPT,deploymentId:DEPLOY});
 assert.equal(out.expectedDeploymentInScript,'FAIL');
 assert.equal(out.targetWebApp,'UNKNOWN');
 assert.equal(out.liveCrud,'NOT_TESTED');
});
test('matching deployment without WEB_APP is FAIL',()=>{
 const out=summarizeDeploymentJson(raw([deployment(DEPLOY,SCRIPT,false)]),
  {scriptId:SCRIPT,deploymentId:DEPLOY});
 assert.equal(out.expectedDeploymentInScript,'PASS');
 assert.equal(out.targetWebApp,'FAIL');
});
test('wrong parent script ID is denied',()=>{
 assert.throws(()=>summarizeDeploymentJson(
  raw([deployment(DEPLOY,'WRONG_SCRIPT_ID_012345678901')]),
  {scriptId:SCRIPT,deploymentId:DEPLOY}),/INVALID_DEPLOYMENT_DATA/);
});
test('malformed JSON or human-readable fallback is never considered verified',()=>{
 for(const response of ['not-json','{','{"data":[]}',
    '{"deployments":{}}','null'])
  assert.throws(()=>summarizeDeploymentJson(response,{
   scriptId:SCRIPT,deploymentId:DEPLOY}));
});
test('duplicate deployment IDs are rejected',()=>{
 assert.throws(()=>summarizeDeploymentJson(raw([
  deployment(),deployment(DEPLOY)
 ]),{scriptId:SCRIPT,deploymentId:DEPLOY}),/DUPLICATE_DEPLOYMENT_ID/);
});
test('pinned existing Script and Deployment IDs must be provided',()=>{
 for(const e of [
  {...env,SMART_SRRT_SCRIPT_ID:''},
  {...env,SMART_SRRT_DEPLOYMENT_ID:''},
  {...env,SMART_SRRT_DEPLOYMENT_ID:SCRIPT},
  {...env,SMART_SRRT_P009_READONLY_APPROVED:'NO'}
 ]) {
  const s=simulate({e});
  assert.throws(()=>s.result());
  assert.equal(s.calls.length,0);
 }
});
test('disallowed binary path/shell injection is rejected without invoking clasp',()=>{
 const s=simulate({e:{...env,SMART_SRRT_CLASP:'clasp;rm -rf /'}});
 assert.throws(()=>s.result(),/INVALID_CLASP_COMMAND/);
 assert.equal(s.calls.length,0);
});
test('clasp 2.x is rejected before cloud request',()=>{
 const s=simulate({version:'2.15.0'});
 assert.throws(()=>s.result(),/CLASP_3_REQUIRED/);
 assert.deepEqual(s.calls.map(c=>c.args),[['--version']]);
});
test('only read-only GET failure yields status-safe error class, no token',()=>{
 const s=simulate({throwOn:'list-deployments'});
 assert.throws(()=>s.result(),/CLASP_DEPLOYMENTS_GET_FAILED/);
 assert.deepEqual(s.calls.map(c=>c.args),[
  ['--version'],['list-deployments',SCRIPT,'--json']
 ]);
});
test('never treats the current spreadsheet Script Property as attested',()=>{
 const output=summarizeDeploymentJson(raw([deployment()]),{
  scriptId:SCRIPT,deploymentId:DEPLOY});
 assert.equal(output.scriptPropertyDbBinding,'NOT_ATTESTED');
 assert.equal(output.permissionGrant,'NOT_TESTED');
 assert.equal(output.d331Activation,'HOLD');
 assert.equal(JSON.stringify(output).includes(SCRIPT),false);
 assert.equal(JSON.stringify(output).includes(DEPLOY),false);
});
