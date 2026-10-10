import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../Index_Smart_SRRT_OneClick.html',import.meta.url),'utf8');
const EVENT='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const ID_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ID_C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function context(){
  const ctx={console,Date,Math,Number,String,Array,Object,RegExp,JSON,Error,isFinite};
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return ctx;
}
function registryRow(reportId, eventId, date, doc='DOC-123', url=null){
  return [reportId,eventId,4,doc,url===null?'https://docs.google.com/document/d/'+doc+'/edit':url,date,'staff@example.test','gemini-test','v1beta','2026.10.06.1','template'];
}
function setup(rows, options={}){
  const ctx=context();
  let authAction='', lookedUpVoided=null, writes=0;
  const headers=Array.from(ctx.REPORT_REGISTRY_HEADERS);
  if(options.badHeader)headers[0]='BrokenID';
  const registry=options.missingRegistry?null:{
    getLastRow(){return rows.length+1;},
    getLastColumn(){return 11;},
    getRange(row,col,numRows,numCols){
      if(row===1)return{getDisplayValues(){return[headers]}};
      return {getValues(){return rows}};
    },
    appendRow(){writes++;throw Error('unexpected registry write');}
  };
  const main={
    getRange(row,col){
      return{getValue(){return col===ctx.EVENT_META_COL.REVISION?7:'closed'}};
    }
  };
  ctx.requireAuth_=(token,action)=>{
    authAction=action;
    if(token!=='authorized')throw new Error('unauthorized');
    return {email:'staff@example.test'};
  };
  ctx.getSheetByIdOrName_=()=>main;
  ctx.findEventRowById_=(sheet,eventId,includeVoided)=>{
    lookedUpVoided=includeVoided;
    assert.equal(sheet,main);
    assert.equal(eventId,EVENT);
    return 2;
  };
  ctx.getDb_=()=>({getSheetByName(name){
    assert.equal(name,'ReportRegistry');
    return registry;
  }});
  return{ctx,metrics:()=>({authAction,lookedUpVoided,writes})};
}
function read(rows, options={}){
  const {ctx,metrics}=setup(rows,options);
  return {value:ctx.listReportsForEvent('authorized',EVENT),metrics:metrics()};
}
function block(name){
  const match=new RegExp('function\\s+'+name+'\\s*\\(').exec(source);
  assert.ok(match,'function '+name+' present');
  const start=match.index, next=source.slice(start+1).search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start,next<0?source.length:start+1+next);
}

test('G-27 reads authenticated Event history with no extra schema',()=>{
  const {value,metrics}=read([]);
  assert.equal(context().CONFIG.SCHEMA_VERSION,'7');
  assert.equal(value.eventId,EVENT);
  assert.equal(value.currentRevision,7);
  assert.equal(value.recordStatus,'closed');
  assert.equal(value.count,0);
  assert.equal(value.latest,null);
  assert.equal(value.invalidCount,0);
  assert.deepEqual(Array.from(value.reports),[]);
  assert.equal(metrics.authAction,'report');
  assert.equal(metrics.lookedUpVoided,false);
  assert.equal(metrics.writes,0);
});

test('multiple reports are linked by EventID and sorted by actual generation time',()=>{
  const rows=[
    registryRow(ID_A,EVENT,new Date('2026-10-01T05:00:00Z'),'DOCA'),
    registryRow(ID_B,EVENT,new Date('2026-10-08T05:00:00Z'),'DOCB'),
    registryRow(ID_C,EVENT,new Date('2026-10-03T05:00:00Z'),'DOCC'),
    registryRow('dddddddd-dddd-4ddd-8ddd-dddddddddddd',OTHER,new Date('2026-10-10T05:00:00Z'),'DOCX')
  ];
  const {value}=read(rows);
  assert.equal(value.count,3);
  assert.deepEqual(Array.from(value.reports).map(x=>x.reportId),[ID_B,ID_C,ID_A]);
  assert.equal(value.latest.reportId,ID_B);
  assert.equal(value.latest.documentURL,'https://docs.google.com/document/d/DOCB/edit');
  assert.equal(value.latest.generatedAt,'2026-10-08T05:00:00.000Z');
  assert.equal(value.latest.sourceRevision,4);
  assert.equal(value.latest.generatedBy,'staff@example.test');
  assert.equal(value.latest.promptVersion,'2026.10.06.1');
  assert.equal(JSON.stringify(value).includes('DOCX'),false);
});

test('invalid or duplicate ReportID rows cannot multiply the count',()=>{
  const rows=[
    registryRow(ID_A,EVENT,new Date('2026-10-01T05:00:00Z')),
    registryRow(ID_A,EVENT,new Date('2026-10-02T05:00:00Z')),
    registryRow('invalid-id',EVENT,new Date('2026-10-03T05:00:00Z')),
    registryRow(ID_B,EVENT,new Date('2026-10-04T05:00:00Z'),'DOCB','javascript:alert(1)')
  ];
  const {value}=read(rows);
  assert.equal(value.count,2);
  assert.equal(value.invalidCount,2);
  assert.equal(value.latest.reportId,ID_B);
  assert.equal(value.latest.documentURL,'');
});

test('a forged cross-document URL is not exposed to the browser',()=>{
  const {value}=read([registryRow(ID_A,EVENT,new Date('2026-10-01T05:00:00Z'),'DOC-A','https://docs.google.com/document/d/OTHER/edit')]);
  assert.equal(value.count,1);
  assert.equal(value.reports[0].documentURL,'');
});

test('invalid timestamps sort behind genuine dates and preserve append tie ordering',()=>{
  const rows=[
    registryRow(ID_A,EVENT,'unknown','DOCA'),
    registryRow(ID_B,EVENT,new Date('2026-10-05T00:00:00Z'),'DOCB'),
    registryRow(ID_C,EVENT,'unknown','DOCC')
  ];
  const {value}=read(rows);
  assert.deepEqual(Array.from(value.reports).map(x=>x.reportId),[ID_B,ID_C,ID_A]);
  assert.equal(value.reports[1].generatedAt,'unknown');
});

test('mismatched schema or absent registry fails loudly, with no implicit migration',()=>{
  const bad=setup([],{badHeader:true});
  assert.throws(()=>bad.ctx.listReportsForEvent('authorized',EVENT),/schema v7/);
  const absent=setup([],{missingRegistry:true});
  assert.throws(()=>absent.ctx.listReportsForEvent('authorized',EVENT),/migration G-17/);
  assert.equal(absent.metrics().writes,0);
});

test('unauthenticated users fail before Event or report history data is read',()=>{
  const {ctx}=setup([]);
  assert.throws(()=>ctx.listReportsForEvent('',EVENT),/unauthorized/);
  assert.match(block('listReportsForEvent'),/requireAuth_\(sessionToken, 'report'\)/);
});

test('closed Event remains readable while void status is rejected by lookup',()=>{
  const {value,metrics}=read([registryRow(ID_A,EVENT,new Date('2026-10-08T04:00:00Z'))]);
  assert.equal(value.recordStatus,'closed');
  assert.equal(value.count,1);
  assert.equal(metrics.lookedUpVoided,false);
});

test('G-27 endpoint has no persistence, event mutation, AI call, or registry creation',()=>{
  const r=block('listReportsForEvent');
  assert.doesNotMatch(r,/appendRow|setValue|setValues|writeAudit_|analyzeWithGemini_|ensureReportRegistrySheet_/);
  assert.match(r,/findEventRowById_\(main, eventId, false\)/);
  const g=block('generateReportFromWeb');
  assert.match(g,/appendReportRegistry_/);
  assert.doesNotMatch(g,/listReportsForEvent/);
  assert.equal(context().REPORT_REGISTRY_HEADERS.length,11);
});

test('Event and Reporter views have read-only history controls without public rendering',()=>{
  assert.match(html,/id="reportHistoryModal"/);
  assert.match(html,/function openEventReportHistoryByIndex\(index\)/);
  assert.match(html,/gs\('listReportsForEvent',authToken,eventId\)/);
  const render=html.match(/function renderTables\(\)\{[\s\S]*?(?=\n  function buildRecordForm)/)?.[0]??'';
  assert.match(render,/el\('eventBody'\)\.innerHTML=allData\.map/);
  assert.match(render,/el\('reportBody'\)\.innerHTML=allData\.map/);
  assert.equal((render.match(/openEventReportHistoryByIndex/g)||[]).length,0,
    'standalone history buttons must be removed from both tables');
  assert.equal((render.match(/reportActionButton\(r\.eventId/g)||[]).length,2,
    'one report action per table');
  assert.match(html,/function handleReportAction\(eventId,btn\)/);
  assert.match(html,/id="reportHistoryNewBtn"/);
  assert.match(html,/id="reportNewConfirmModal"/);
  assert.match(html,/if\(!currentUser\|\|!roleCanRecord\(\)/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.match(html,/escapeHtml\(url\)/);
  assert.match(html,/escapeHtml\(r\.generatedBy\|\|'-'\)/);
  assert.match(html,/ยังไม่มีรายงานที่ลงทะเบียนสำหรับเหตุการณ์นี้/);
  assert.match(html,/รายงานล่าสุด/);
});

test('public dashboard response stays unrelated to private report registry',()=>{
  const p=block('getPublicDashboardData');
  assert.doesNotMatch(p,/ReportRegistry|listReportsForEvent|reportHistory/);
});

test('inline browser JavaScript parses without executing the UI',()=>{
  const script=html.split('<script>')[1]?.split('</script>')[0]??'';
  assert.ok(script.trim().length>0);
  assert.doesNotThrow(()=>new vm.Script(script,{filename:'Index_Smart_SRRT_OneClick.html'}));
});
