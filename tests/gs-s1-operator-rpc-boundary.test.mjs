// GS-S1: source-only security contracts. No Apps Script or external services are contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const server=()=>GAS_SERVER_SOURCES.map(name=>({name,code:read(name)}));
const GATED=["installSmartSRRT","setupDatabase","resetSuperAdminPassword","showDatabaseInfo","migrateG05EventOwner","migrateG11EventAttachments","migrateG21AuditRetention","migrateG29VisitLogs","migrateG17ReportRegistry","migrateP1EventIdentity","clearGeminiModelCache","listAvailableGeminiModels","testGeminiConnection","forceGeminiModelAuto","forceGeminiModelStable"];
const EXPECTED_PUBLIC=["addRecord","archiveAuditLogs","archiveAuditLogsFromSheetMenu","assignEventOwner","cancelReportJob","clearGeminiModelCache","closeEvent","createReportJob","deleteArea","deleteRecord","dismissReportJob","doGet","downloadEventAttachment","exportData","forceGeminiModelAuto","forceGeminiModelStable","generateReportFromWeb","getAIReportReadiness","getAnalytics","getAppBoot","getAreaMaster","getAuditRetentionStatus","getCurrentReportJob","getDashboardData","getInstallationStatus","getMasterData","getMasterDataAdmin","getPublicDashboardData","getPublishedContent","getReportJobStatus","getReportSummariesForEvents","getSystemSettings","importAreas","include","installSmartSRRT","listAreas","listAssignableEventOwners","listAuditLogs","listAvailableGeminiModels","listContent","listEventAttachments","listReportsForEvent","listUsers","login","logout","migrateG05EventOwner","migrateG11EventAttachments","migrateG17ReportRegistry","migrateG21AuditRetention","migrateG29VisitLogs","migrateP1EventIdentity","onOpen","registerUser","removeEventAttachment","reopenEvent","repairInstallation","resetSuperAdminPassword","runReportJob","saveArea","saveContent","saveMasterDataItem","saveSystemSettings","setupDatabase","showDatabaseInfo","testGeminiConnection","updateRecord","updateUser","uploadEventAttachment","uploadLogo"];
const DENIAL=/ไม่ได้กำหนดผู้ปฏิบัติการ|ไม่มีสิทธิ์ดำเนินการบำรุงรักษา/;

function makeContext({configured='',active='',effective=''}={}){
  const calls={properties:[],html:[],stage:0};
  const ctx=vm.createContext({
    console,
    PropertiesService:{getScriptProperties(){
      calls.properties.push('getScriptProperties');
      return {getProperty(key){
        calls.properties.push('getProperty:'+key);
        return key==='GS_TRUSTED_OPERATOR_EMAIL'?configured:null;
      }};
    }},
    Session:{
      getActiveUser(){return {getEmail(){return active}}},
      getEffectiveUser(){return {getEmail(){return effective}}}
    },
    HtmlService:{createHtmlOutputFromFile(file){
      calls.html.push(file);
      return {getContent(){return 'partial:'+file}};
    }},
    LockService:{getScriptLock(){
      calls.stage++;
      throw new Error('REACHED_MUTATION_BODY');
    }}
  });
  server().forEach(({name,code})=>
    new vm.Script(code,{filename:name}).runInContext(ctx,{timeout:2000}));
  return {ctx,calls};
}

test('GS-S1 public server function declaration surface is explicit and frozen',()=>{
  const publicNames=server().flatMap(({code})=>
    [...code.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)]
      .map(match=>match[1]).filter(name=>!name.endsWith('_'))).sort();
  assert.deepEqual(publicNames,EXPECTED_PUBLIC,
    'new callable server function must be explicitly reviewed for RPC authorization');
  assert.equal(new Set(publicNames).size,publicNames.length,'top-level RPC name collision');
  for(const name of GATED){
    const code=server().find(({code})=>new RegExp('^function '+name+'\\s*\\(' ,'m').test(code))?.code;
    assert.ok(code,'missing privileged entrypoint: '+name);
    assert.match(code,new RegExp('function '+name+'\\(\\) \\{\\n  requireTrustedOperator_\\(\\x27'+name+'\\x27\\);'),
      'privileged maintenance must check authority before side effects: '+name);
  }
  const bootstrap=read('src/server/00-bootstrap.gs');
  assert.match(bootstrap,/function requireTrustedOperator_\(operation\)/);
  assert.match(bootstrap,/GS_TRUSTED_OPERATOR_EMAIL/);
  assert.match(bootstrap,/Session\.getActiveUser\(\)\.getEmail\(\)/);
  assert.match(bootstrap,/Session\.getEffectiveUser\(\)\.getEmail\(\)/);
});

test('GS-S1 unconfigured, blank or mismatched Google identities deny all 15 operator RPCs before mutation',()=>{
  for(const options of [
    {configured:'',active:'operator@example.org',effective:'operator@example.org'},
    {configured:'not-an-email',active:'operator@example.org',effective:'operator@example.org'},
    {configured:'operator@example.org',active:'',effective:'operator@example.org'},
    {configured:'operator@example.org',active:'untrusted@example.org',effective:'operator@example.org'},
    {configured:'operator@example.org',active:'operator@example.org',effective:'untrusted@example.org'},
    {configured:'operator@example.org',active:'operator@example.org',effective:''},
    {configured:'operator@example.org;other@example.org',active:'operator@example.org',effective:'operator@example.org'}
  ]){
    const {ctx,calls}=makeContext(options);
    for(const name of GATED){
      assert.throws(()=>vm.runInContext(name+'()',ctx,{timeout:2000}),DENIAL,
        name+' denied for '+JSON.stringify(options));
    }
    assert.equal(calls.stage,0,'no privileged downstream lock or mutation before authorization');
    assert.deepEqual(calls.html,[],'no HTML reading from denied operator call');
    assert.ok(calls.properties.every(x=>
      x==='getScriptProperties'||x==='getProperty:GS_TRUSTED_OPERATOR_EMAIL'),
      'authorization must not touch any other Script Properties');
  }
});

test('GS-S1 configured matching active AND effective owner identity allows intended operator path',()=>{
  const {ctx,calls}=makeContext({
    configured:' Operator@Example.ORG ',active:'operator@example.org',
    effective:'OPERATOR@EXAMPLE.ORG'
  });
  assert.equal(vm.runInContext("requireTrustedOperator_('operator-test')",ctx),true);
  // A migration is a privileged operation: use a synthetic fail sentinel
  // at the very first business service call and never run any real migration.
  assert.throws(()=>vm.runInContext('migrateG05EventOwner()',ctx),
    /REACHED_MUTATION_BODY/);
  assert.equal(calls.stage,1,'authorization passed before reaching stubbed business code');
});

test('GS-S1 doGet include() can read only explicitly manifested Native HTML partials',()=>{
  const {ctx,calls}=makeContext();
  const approved=GAS_HTML_SOURCES.map(s=>path.parse(s).name);
  for(const file of approved){
    const result=vm.runInContext('include('+JSON.stringify(file)+')',ctx);
    assert.equal(result,'partial:'+file);
  }
  for(const invalid of ['Index','../Code','00-bootstrap','05-reports-and-models',
    'constructor','__proto__','toString','',null,0,{},['00-document-head']]){
    const arg=JSON.stringify(invalid);
    assert.throws(()=>vm.runInContext('include('+arg+')',ctx),/ไม่อนุญาตให้โหลดไฟล์ HTML นี้/);
  }
  assert.deepEqual(calls.html,approved,'invalid include never touched HTML Service');
});

test('GS-S1 intended public login, guest dashboard and protected application RPCs remain unrenamed',()=>{
  const {ctx}=makeContext();
  for(const name of ['doGet','include','login','logout','registerUser','getAppBoot',
    'getPublicDashboardData','getDashboardData','addRecord','updateRecord',
    'listReportsForEvent','getReportSummariesForEvents','createReportJob',
    'getReportJobStatus','cancelReportJob','runReportJob']){
    assert.equal(vm.runInContext('typeof '+name,ctx),'function',name);
    assert.ok(EXPECTED_PUBLIC.includes(name));
  }
  assert.equal(vm.runInContext('typeof requireTrustedOperator_',ctx),'function');
  assert.ok(!EXPECTED_PUBLIC.includes('requireTrustedOperator_'));
});
