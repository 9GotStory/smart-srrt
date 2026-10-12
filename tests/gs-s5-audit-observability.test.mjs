// GS-S5: audit transport observability is bounded, credential-free and
// must not change the result of previously committed operations.
// No real Google Apps Script, Spreadsheet or Script Properties are contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const audit=fs.readFileSync(path.join(root,'src/server/04-admin-and-audit.gs'),'utf8');
const browser=fs.readFileSync(path.join(root,'src/web/04-browser-app.html'),'utf8');
const HEALTH='SRRT_GS5_AUDIT_WRITE_HEALTH_V1';
function harness({auditFailure=false,propertyFailure=false,readFailure=false,loggerFailure=false}={}){
  const rows=[],properties=new Map(),logs=[],events=[];
  const state={auditFailure,propertyFailure,readFailure,loggerFailure};
  const ctx=vm.createContext({
    Date,JSON,console,
    CONFIG:{SHEETS:{AUDIT:'AuditLogs',USERS:'UserAccounts'}},
    Utilities:{getUuid:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
      formatDate:date=>new Date(date).toISOString()},
    Session:{getScriptTimeZone:()=> 'Asia/Bangkok'},
    Logger:{log(message){
      if(state.loggerFailure)throw Error('logger failed');
      logs.push(message);
    }},
    PropertiesService:{getScriptProperties(){
      return {
        getProperty(key){
          events.push({kind:'get',key});
          if(state.readFailure)throw Error('token=DO_NOT_EXPOSE_READ_ERR');
          return properties.get(key)??null;
        },
        setProperty(key,value){
          events.push({kind:'set',key});
          if(state.propertyFailure)throw Error('password=DO_NOT_EXPOSE_PROP_ERR');
          properties.set(key,String(value));
        }
      };
    }},
    getSheet_(sheetName){
      if(sheetName!=='AuditLogs')throw Error('unexpected Sheet');
      return {appendRow(row){
        if(state.auditFailure)throw Error('password=DO_NOT_EXPOSE_APPEND_ERR, Bearer MY_PRIVATE_TOKEN');
        rows.push(row);
      }};
    },
    requireAuth_(token,action){
      assert.equal(action,'audit');
      if(token!=='owner-session')throw Error('UNAUTHORIZED');
      return {email:'owner@example.test',role:'Manager'};
    }
  });
  new vm.Script(audit,{filename:'04-admin-and-audit.gs'}).runInContext(ctx,{timeout:2000});
  const run=s=>vm.runInContext(s,ctx,{timeout:1500});
  return {ctx,rows,properties,logs,events,state,run,
    write:(action='UPDATE_RECORD',after='{}')=>
      ctx.writeAudit_({email:'sensitive-user@example.test',role:'Admin'},
        action,'MainData','PATIENT_EVENT_ID_SECRET','',after)};
}
function snapshot(h){return h.properties.has(HEALTH)?JSON.parse(h.properties.get(HEALTH)):null}

test('GS-S5 clean append returns success and does not write health properties',()=>{
  const h=harness();
  assert.equal(h.write(),true);
  assert.equal(h.rows.length,1);
  assert.equal(h.rows[0].length,10);
  assert.equal(snapshot(h),null,'never write a health property for healthy baseline');
  assert.equal(h.ctx.readAuditWriteHealth_().state,'unobserved');
});

test('GS-S5 audit append failure returns false with bounded, non-secret durable warning',()=>{
  const h=harness({auditFailure:true});
  assert.equal(h.write('UPDATE_USER',JSON.stringify({newPassword:'DO_NOT_EXPOSE_NEW_PASSWORD'})),false);
  assert.equal(h.rows.length,0);
  const state=snapshot(h);
  assert.equal(state.state,'degraded');
  assert.equal(state.failureCount,1);
  assert.equal(state.lastFailureAction,'UPDATE_USER');
  assert.match(state.lastFailureAt,/^\d{4}-\d\d-\d\dT/);
  for(const secret of ['DO_NOT_EXPOSE_NEW_PASSWORD','DO_NOT_EXPOSE_APPEND_ERR',
    'MY_PRIVATE_TOKEN','PATIENT_EVENT_ID_SECRET','sensitive-user@example.test']){
    assert.equal(JSON.stringify(state).includes(secret),false,'health contains a secret '+secret);
    assert.equal(h.logs.join('\n').includes(secret),false,'Logger contains a secret '+secret);
  }
  assert.ok(h.logs.some(x=>x.includes('GS-S5 AUDIT_APPEND_FAILED')));
});

test('GS-S5 repeated failures counted advisory only and next successful append marks recovery',()=>{
  const h=harness({auditFailure:true});
  assert.equal(h.write('CREATE_RECORD'),false);
  assert.equal(h.write('UPDATE_RECORD'),false);
  assert.equal(snapshot(h).failureCount,2);
  h.state.auditFailure=false;
  assert.equal(h.write('GENERATE_REPORT'),true,
    'successful business/ReportRegistry post-commit must not be reversed');
  assert.equal(h.rows.length,1);
  const restored=snapshot(h);
  assert.equal(restored.state,'recovered');
  assert.equal(restored.failureCount,2);
  assert.match(restored.lastRecoveryAt,/^\d{4}-\d\d-\d\dT/);
  assert.equal(restored.lastFailureAction,'UPDATE_RECORD');
  assert.equal(h.ctx.readAuditWriteHealth_().state,'recovered');
  h.state.auditFailure=true;
  assert.equal(h.write('REOPEN_EVENT'),false);
  assert.equal(snapshot(h).state,'degraded');
  assert.equal(snapshot(h).failureCount,3);
  assert.equal(snapshot(h).lastRecoveryAt,'');
});

test('GS-S5 telemetry storage unavailable never throws or rolls back the append',()=>{
  const failed=harness({auditFailure:true,propertyFailure:true});
  assert.equal(failed.write('GENERATE_REPORT'),false);
  assert.equal(snapshot(failed),null);
  assert.equal(failed.rows.length,0);
  assert.ok(failed.logs.some(x=>x.includes('GS-S5 AUDIT_APPEND_FAILED')));
  assert.ok(failed.logs.some(x=>x.includes('GS-S5 HEALTH_STORE_UNAVAILABLE')));
  assert.doesNotMatch(failed.logs.join('\n'),/DO_NOT_EXPOSE/);
  const saved=harness({propertyFailure:true});
  assert.equal(saved.write('GENERATE_REPORT'),true);
  assert.equal(saved.rows.length,1,'observability failure cannot mutate write success');
});

test('GS-S5 missing PropertiesService and Logger or failed telemetry read fail safe',()=>{
  const h=harness({auditFailure:true,loggerFailure:true,readFailure:true});
  assert.equal(h.write('UPDATE_RECORD'),false);
  assert.equal(h.ctx.readAuditWriteHealth_().state,'unavailable');
  assert.equal(h.logs.length,0);
  const missing=harness({auditFailure:true});
  delete missing.ctx.PropertiesService;
  delete missing.ctx.Logger;
  assert.equal(missing.write(),false);
  assert.equal(missing.ctx.readAuditWriteHealth_().state,'unavailable');
});

test('GS-S5 malformed or malicious health property is treated as unavailable, never rendered raw',()=>{
  const h=harness();
  for(const data of ['{bad','{"state":"degraded","failureCount":0}',
    JSON.stringify({state:'degraded',failureCount:5,lastFailureAt:'sensitive health text',
      lastFailureAction:'PASSWORD=SECRET'})]){
    h.properties.set(HEALTH,data);
    assert.equal(h.ctx.readAuditWriteHealth_().state,'unavailable');
  }
  assert.equal(h.write('UPDATE_RECORD'),true);
  assert.equal(h.rows.length,1);
  assert.doesNotMatch(h.logs.join('\n'),/sensitive health text|PASSWORD=SECRET/);
});

test('GS-S5 health tracking action is allowlisted and never logs user action strings',()=>{
  const h=harness({auditFailure:true});
  const malicious='REPORT_BEARER token=SECRET_PASSWORD_123';
  assert.equal(h.write(malicious),false);
  assert.equal(snapshot(h).lastFailureAction,'UNCLASSIFIED');
  assert.ok(h.logs.some(x=>x.endsWith('action=UNCLASSIFIED')));
  assert.doesNotMatch(h.logs.join('\n'),/SECRET_PASSWORD_123/);
});

test('GS-S5 only authorized Audit role reads write health via existing retention status',()=>{
  const h=harness({auditFailure:true});
  h.write();
  const statusCode=audit.match(/function getAuditRetentionStatus\(sessionToken\)\s*\{([\s\S]*?)\n\}/)?.[1]||'';
  assert.match(statusCode,/requireAuth_\(sessionToken, 'audit'\)/);
  assert.match(statusCode,/auditWriteHealth:readAuditWriteHealth_\(\)/);
  h.ctx.getDb_=()=>({});
  h.ctx.ensureAuditSchema_=()=>({sheet:{
    getLastRow:()=>1,
    getRange(){throw Error('unexpected populated audit scan')}
  }});
  h.ctx.getAuditRetentionDays_=()=>365;
  h.ctx.getSettingsMap_=()=>({});
  assert.throws(()=>h.ctx.getAuditRetentionStatus('no-session'),/UNAUTHORIZED/);
  const allowed=h.ctx.getAuditRetentionStatus('owner-session');
  assert.equal(allowed.auditWriteHealth.state,'degraded');
  assert.equal(allowed.auditWriteHealth.failureCount,1);
  assert.equal(allowed.activeRows,0);
});

test('GS-S5 Admin renders degraded/recovered/unavailable health without raw error text',()=>{
  assert.match(browser,/s\.auditWriteHealth\|\|\{state:'unavailable'\}/);
  assert.match(browser,/health\.state==='degraded'/);
  assert.match(browser,/health\.state==='recovered'/);
  assert.match(browser,/health\.state==='unobserved'/);
  assert.match(browser,/escapeHtml\(health\.lastFailureAt\|\|/);
  assert.match(browser,/escapeHtml\(health\.lastFailureAction\|\|/);
  assert.match(browser,/Apps Script Executions/);
  assert.doesNotMatch(audit,/Logger\.log\(.*(?:error|e\.message|e\.stack)\)/i,
    'do not log potentially secret-bearing exceptions');
});
