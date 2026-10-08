import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server=fs.readFileSync(new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs',import.meta.url),'utf8');
const browser=fs.readFileSync(new URL('../Index_Smart_SRRT_OneClick.html',import.meta.url),'utf8');
const eventId='11111111-1111-4111-8111-111111111111';
const chosen={modelName:'models/gemini-3.8-flash',apiVersion:'v1'};

function harness(handler){
  const map=new Map(), calls=[];
  const user1={userId:'user-one',email:'test1@example.test',role:'Super Admin'};
  const user2={userId:'user-two',email:'test2@example.test',role:'Super Admin'};
  const ctx={
    Logger:{log(){}},
    Utilities:{getUuid:()=> '77777777-7777-4777-8777-777777777777',sleep(){}},
    LockService:{getScriptLock(){return {tryLock:()=>true,releaseLock(){}}}},
    PropertiesService:{getScriptProperties(){return {
      getProperty:k=>map.get(k)||null,
      setProperty:(k,v)=>map.set(k,String(v)),
      deleteProperty:k=>map.delete(k),
      getProperties:()=>Object.fromEntries(map)
    }}},
    CacheService:{getScriptCache(){return {get:()=>null,put(){},remove(){}}}},
    UrlFetchApp:{fetch(url,opts){calls.push({url,opts});return handler?.(ctx,url,opts,calls.length)??{
      getResponseCode:()=>200,
      getContentText:()=>JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'sample test'}]}}]})
    }}}
  };
  vm.createContext(ctx);
  vm.runInContext(server,ctx,{filename:'Code.gs'});
  ctx.requireAuth_=(token,perm)=>{
    assert.equal(perm,'report');
    if(token==='u1')return user1;
    if(token==='u2')return user2;
    throw Error('Access denied');
  };
  const row=Array(38).fill('');
  row[5]='Mock disease';
  ctx.getSheetByIdOrName_=()=>({getRange(rowNum,col,rows,cols){
    if(col===ctx.EVENT_META_COL.REVISION)return {getValue:()=>1};
    return {getDisplayValues:()=>[row]};
  }});
  ctx.findEventRowById_=(sheet,id,includeVoid)=>{assert.equal(id,eventId);assert.equal(includeVoid,false);return 2};
  ctx.getSettingsMap_=()=>({TEMPLATE_DOC_ID:'template-test',REPORT_FOLDER_ID:'folder-test',GEMINI_API_KEY:'fake-key',GEMINI_MODEL:'models/gemini-3.8-flash'});
  ctx.findGeminiModelInList_=()=>chosen;
  ctx.buildReportPromptPart_=(data,where,part)=> 'PROMPT '+part;
  ctx.DriveApp={getFileById(){throw Error('No Doc should be created in cancellation tests')}};
  return {ctx,map,calls};
}
function create(h,token='u1'){return h.ctx.createReportJob(token,eventId)}
function claim(h,jobId,token='u1'){
  // A running fixture without calling Gemini.
  const key='SRRT_G32_JOB_'+jobId;
  const job=JSON.parse(h.map.get(key));
  job.status='running';
  h.map.set(key,JSON.stringify(job));
  return job;
}

test('G-32 creates a private queued job and returns same job to same owner without duplicates',()=>{
  const h=harness();
  const a=create(h), b=create(h);
  assert.equal(a.id,b.id);
  assert.equal(a.status,'queued');
  assert.equal(h.map.get('SRRT_G32_ACTIVE'),a.id);
  assert.ok(!JSON.stringify(a).includes('fake-key'));
  assert.ok(!JSON.stringify(a).includes('test1@example.test'));
  assert.throws(()=>create(h,'u2'),/กำลังทำงาน/);
});

test('G-32 owner-only status and cancel denies another authenticated user',()=>{
  const h=harness();
  const job=create(h);
  assert.throws(()=>h.ctx.getReportJobStatus('u2',job.id),/ไม่มีสิทธิ์/);
  assert.throws(()=>h.ctx.cancelReportJob('u2',job.id),/ไม่มีสิทธิ์/);
  assert.throws(()=>h.ctx.dismissReportJob('u2',job.id),/ไม่มีสิทธิ์/);
  assert.equal(h.ctx.getReportJobStatus('u1',job.id).status,'queued');
  assert.equal(h.ctx.getCurrentReportJob('u2'),null);
});

test('G-32 cancel while queued stops before any Gemini call or document',()=>{
  const h=harness(),job=create(h);
  assert.equal(h.ctx.cancelReportJob('u1',job.id).status,'cancelled');
  assert.equal(h.ctx.cancelReportJob('u1',job.id).status,'cancelled');
  assert.equal(h.ctx.runReportJob('u1',job.id).status,'cancelled');
  assert.equal(h.calls.length,0);
  assert.equal(h.map.has('SRRT_G32_ACTIVE'),false);
});

test('G-32 cancelling while Gemini 1 request blocks is acknowledged at next safe checkpoint',()=>{
  let reportId;
  const h=harness((ctx,url)=>{
    assert.match(url,/models\/gemini-3\.8-flash:generateContent/);
    const pending=ctx.cancelReportJob('u1',reportId);
    assert.equal(pending.status,'cancel_requested');
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:'section one'}]}}]})};
  });
  reportId=create(h).id;
  const output=h.ctx.runReportJob('u1',reportId);
  assert.equal(output.status,'cancelled');
  assert.equal(h.calls.length,1,'must never send section two');
  assert.equal(h.map.has('SRRT_G32_ACTIVE'),false);
  assert.equal(h.ctx.getReportJobStatus('u1',reportId).status,'cancelled');
});

test('G-32 cancel requested during blocking 503 is recorded cancelled without retry',()=>{
  let reportId;
  const h=harness((ctx,url)=>{
    ctx.cancelReportJob('u1',reportId);
    return {getResponseCode:()=>503,getContentText:()=>JSON.stringify({error:{message:'high demand'}})};
  });
  reportId=create(h).id;
  const result=h.ctx.runReportJob('u1',reportId);
  assert.equal(result.status,'cancelled');
  assert.equal(h.calls.length,1);
});

test('G-32 finalizing and completed cannot be mislabelled cancelled',()=>{
  const h=harness(),job=create(h);
  claim(h,job.id);
  h.ctx.reportJobCheckpoint_(job.id,'finalizing');
  const tooLate=h.ctx.cancelReportJob('u1',job.id);
  assert.equal(tooLate.status,'finalizing');
  const completed=h.ctx.finalizeReportJob_(job.id,'completed','https://docs.google.com/document/d/example/edit','done');
  assert.equal(completed.status,'completed');
  assert.equal(h.ctx.cancelReportJob('u1',job.id).status,'completed');
  assert.equal(completed.documentUrl,'https://docs.google.com/document/d/example/edit');
  assert.equal(h.ctx.dismissReportJob('u1',job.id).status,'completed');
  assert.equal(h.ctx.getCurrentReportJob('u1'),null);
  assert.equal(h.ctx.getReportJobStatus('u1',job.id).status,'completed','history remains until retention');
});

test('G-32 cancelling between requests prevents any future Gemini HTTP calls',()=>{
  const h=harness(), job=create(h);
  claim(h,job.id);
  assert.equal(h.ctx.cancelReportJob('u1',job.id).status,'cancel_requested');
  assert.throws(()=>h.ctx.reportJobCheckpoint_(job.id,'gemini_2'),/REPORT_JOB_CANCELLED/);
  assert.equal(h.calls.length,0);
  const state=h.ctx.finalizeReportJob_(job.id,'failed','','cancelled');
  assert.equal(state.status,'cancelled');
});

test('G-32 state tracking distinguishes success from HTTP 503 and uses bounded request wait',()=>{
  const h=harness(()=>({getResponseCode:()=>503,getContentText:()=>JSON.stringify({error:{message:'high demand'}})}));
  const job=create(h);
  const state=h.ctx.runReportJob('u1',job.id);
  assert.equal(state.status,'failed');
  assert.match(state.message,/503/);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].opts.timeoutSeconds,110);
  assert.equal(h.ctx.getReportJobStatus('u1',job.id).status,'failed');
});


test('G-32 two successful Gemini 3.8 parts create one Doc, registry entry and success audit',()=>{
  const h=harness(),job=create(h);
  let copies=0,registry=0,audits=0,trashed=0;
  h.ctx.DriveApp={
    getFileById(){return {makeCopy(){
      copies++;
      return {getId:()=> 'doc-test-id',
        getUrl:()=> 'https://docs.google.com/document/d/doc-test-id/edit',
        setTrashed(){trashed++;}};
    }}},
    getFolderById(){return {}}
  };
  h.ctx.DocumentApp={openById(){return {getBody(){return {replaceText(){}}},saveAndClose(){}}}};
  h.ctx.replacePlaceholderWithParagraphs_=()=>{};
  h.ctx.appendReportRegistry_=()=>{registry++};
  h.ctx.writeAudit_=()=>{audits++};
  const output=h.ctx.runReportJob('u1',job.id);
  assert.equal(output.status,'completed');
  assert.equal(output.documentUrl,'https://docs.google.com/document/d/doc-test-id/edit');
  assert.equal(copies,1);
  assert.equal(registry,1);
  assert.equal(audits,1);
  assert.equal(trashed,0);
  assert.equal(h.calls.length,2);
  assert.ok(h.calls.every(x=>x.url.includes('models/gemini-3.8-flash:generateContent')));
  assert.equal(h.map.has('SRRT_G32_ACTIVE'),false);
});

test('G-32 cancel during second Gemini request blocks Docs and report registry commit',()=>{
  let jobId,docs=0,registry=0;
  const h=harness((ctx,url,opts,n)=>{
    if(n===2)ctx.cancelReportJob('u1',jobId);
    return {
      getResponseCode:()=>200,
      getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:'sample'}]}}]})
    };
  });
  jobId=create(h).id;
  h.ctx.DriveApp={getFileById(){docs++;throw Error('unexpected document')}};
  h.ctx.appendReportRegistry_=()=>{registry++};
  const result=h.ctx.runReportJob('u1',jobId);
  assert.equal(result.status,'cancelled');
  assert.equal(h.calls.length,2);
  assert.equal(docs,0);
  assert.equal(registry,0);
});

test('G-32 rejects stale direct generation RPC without job credentials',()=>{
  const h=harness();
  assert.throws(()=>h.ctx.generateReportFromWeb('u1',eventId),/G-32/);
  const job=create(h);
  assert.throws(()=>h.ctx.generateReportFromWeb('u1',eventId,job.id,'bad-nonce'),/ไม่สามารถใช้สิทธิ์/);
  assert.equal(h.calls.length,0);
});

test('G-32 UI has task minimize, reopen, cancel and recovered terminal state, not fake immediate success',()=>{
  for(const s of ['id="reportTaskIndicator"','id="cancelReportJobBtn"','id="dismissReportJobBtn"',
    'closeReportTaskModal()','cancelCurrentReportTask()',"gs('createReportJob'", "gs('runReportJob'",
    "gs('getReportJobStatus'", "gs('getCurrentReportJob'", "gs('cancelReportJob'",
    'reopenReportTask()', 'localStorage.setItem(REPORT_JOB_LOCAL_KEY', 'setInterval(']){
    assert.ok(browser.includes(s),s);
  }
  assert.match(browser,/job\.status==='cancel_requested'/);
  assert.match(browser,/REPORT_TERMINAL_STATES=new Set/);
  assert.match(browser,/if\(!confirm\('/);
  assert.doesNotMatch(browser,/onclick="closeModal\('reportResultModal'\)"/);
  assert.doesNotMatch(browser,/google\.script\.host\.close/);
});
