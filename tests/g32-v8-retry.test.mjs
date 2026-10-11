import {nativeServer,nativeHtml,nativeBrowser} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=nativeServer;
const eventId='11111111-1111-4111-8111-111111111111';
const response=code=>({
  getResponseCode:()=>code,
  getContentText:()=>JSON.stringify(code===200
    ? {candidates:[{finishReason:'STOP',content:{parts:[{text:'mock report section'}]}}]}
    : {error:{code,message:'unavailable'}})
});

function make({codes=[200,200],durations=[],onFetch,onSleep}={}){
  const props=new Map(),fetches=[],sleeps=[],logs=[],stats={docs:0,registry:0,audit:0};
  let now=1000000;
  const ctx={
    Date:class extends Date{static now(){return now}},
    Logger:{log:x=>logs.push(String(x))},
    Utilities:{getUuid:()=> '77777777-7777-4777-8777-777777777777',
      sleep(ms){sleeps.push(ms);now+=ms;onSleep?.(ctx)}},
    LockService:{getScriptLock(){return {tryLock:()=>true,releaseLock(){}}}},
    PropertiesService:{getScriptProperties(){return {
      getProperty:k=>props.get(k)||null,
      setProperty:(k,v)=>props.set(k,String(v)),
      deleteProperty:k=>props.delete(k),
      getProperties:()=>Object.fromEntries(props)
    }}},
    CacheService:{getScriptCache(){return {get:()=>null,put(){},remove(){}}}},
    UrlFetchApp:{fetch(url,opts){
      const i=fetches.length;
      const prompt=JSON.parse(opts.payload).contents[0].parts[0].text;
      fetches.push({url,opts,prompt});
      if(onFetch)onFetch(ctx,i);
      now+=durations[i]||10;
      return response(codes[i]??200);
    }}
  };
  vm.createContext(ctx);
  vm.runInContext(source,ctx,{filename:'Code.gs'});
  ctx.requireAuth_=(token,permission)=>{assert.equal(permission,'report');assert.equal(token,'u1');
    return {userId:'actor',email:'mock@example.test',role:'Super Admin'}};
  const row=Array(38).fill('');row[5]='mock disease';
  ctx.getSheetByIdOrName_=()=>({getRange(num,col){return col===ctx.EVENT_META_COL.REVISION
    ? {getValue:()=>1}:{getDisplayValues:()=>[row]}}});
  ctx.findEventRowById_=(sheet,id,includeVoid)=>{assert.equal(id,eventId);assert.equal(includeVoid,false);return 2};
  ctx.getSettingsMap_=()=>({TEMPLATE_DOC_ID:'mock-template',REPORT_FOLDER_ID:'mock-folder',
    GEMINI_API_KEY:'mock-secret',GEMINI_MODEL:'models/gemini-3.8-flash'});
  ctx.findGeminiModelInList_=()=>({modelName:'models/gemini-3.8-flash',apiVersion:'v1'});
  ctx.buildReportPromptPart_=(row,location,part)=>'PROMPT '+part;
  ctx.DriveApp={
    getFileById:()=>({makeCopy(){stats.docs++;return {
      getId:()=> 'mock-document',getUrl:()=> 'https://docs.google.com/document/d/mock-document/edit',
      setTrashed(){throw Error('unexpected trash')}
    }}}),
    getFolderById:()=>({})
  };
  ctx.DocumentApp={openById:()=>({getBody:()=>({replaceText(){}}),saveAndClose(){}})};
  ctx.replacePlaceholderWithParagraphs_=()=>{};
  ctx.appendReportRegistry_=()=>{stats.registry++};
  ctx.writeAudit_=()=>{stats.audit++};
  const job=ctx.createReportJob('u1',eventId);
  return {ctx,props,fetches,sleeps,logs,stats,job,run(){return ctx.runReportJob('u1',job.id)}};
}
function pinned(h){
  assert.ok(h.fetches.every(f=>f.url.includes('models/gemini-3.8-flash:generateContent')));
  assert.ok(h.fetches.every(f=>f.opts.timeoutSeconds<=110&&f.opts.timeoutSeconds>=15));
  assert.ok(h.sleeps.every(ms=>ms>=1500&&ms<=3000));
  assert.ok(!h.logs.join(' ').includes('mock-secret'));
}
test('V8 503 then 200 for part 1 retries only that part, creates one report',()=>{
  const h=make({codes:[503,200,200]});
  assert.equal(h.run().status,'completed');
  assert.deepEqual(h.fetches.map(f=>f.prompt),['PROMPT 1-3','PROMPT 1-3','PROMPT 4-6']);
  assert.deepEqual([h.stats.docs,h.stats.registry,h.stats.audit],[1,1,1]);
  assert.equal(h.sleeps.length,1);pinned(h);
});
test('V8 200 then 503 then 200 for part 2 preserves part 1, creates one report',()=>{
  const h=make({codes:[200,503,200]});
  assert.equal(h.run().status,'completed');
  assert.deepEqual(h.fetches.map(f=>f.prompt),['PROMPT 1-3','PROMPT 4-6','PROMPT 4-6']);
  assert.deepEqual([h.stats.docs,h.stats.registry,h.stats.audit],[1,1,1]);
  assert.equal(h.sleeps.length,1);pinned(h);
});
test('V8 repeated 503 on part 1 fails closed after two requests',()=>{
  const h=make({codes:[503,503]});
  const result=h.run();
  assert.equal(result.status,'failed');assert.match(result.message,/503/);
  assert.equal(h.fetches.length,2);assert.equal(h.sleeps.length,1);
  assert.deepEqual([h.stats.docs,h.stats.registry,h.stats.audit],[0,0,0]);
  assert.equal(h.props.has('SRRT_G32_ACTIVE'),false);
  pinned(h);
});
test('V8 repeated 503 on part 2 does not redo part 1 or write report',()=>{
  const h=make({codes:[200,503,503]});
  const result=h.run();
  assert.equal(result.status,'failed');assert.match(result.message,/503/);
  assert.deepEqual(h.fetches.map(f=>f.prompt),['PROMPT 1-3','PROMPT 4-6','PROMPT 4-6']);
  assert.deepEqual([h.stats.docs,h.stats.registry,h.stats.audit],[0,0,0]);
  pinned(h);
});
test('V8 429, 400 and 500 remain no-retry failures',()=>{
  for(const code of [429,400,500]){
    const h=make({codes:[code]});
    assert.equal(h.run().status,'failed');
    assert.equal(h.fetches.length,1);assert.equal(h.sleeps.length,0);
  }
});
test('V8 cancellation when first HTTP 503 arrives prevents wait and retry',()=>{
  let jobId;
  const h=make({codes:[503],onFetch(ctx){ctx.cancelReportJob('u1',jobId)}});
  jobId=h.job.id;
  assert.equal(h.run().status,'cancelled');
  assert.equal(h.fetches.length,1);assert.equal(h.sleeps.length,0);
  assert.equal(h.stats.docs,0);
});
test('V8 cancellation during retry sleep is checked before another fetch',()=>{
  let jobId;
  const h=make({codes:[503,200],onSleep(ctx){ctx.cancelReportJob('u1',jobId)}});
  jobId=h.job.id;
  assert.equal(h.run().status,'cancelled');
  assert.equal(h.fetches.length,1);assert.equal(h.sleeps.length,1);
  assert.equal(h.stats.docs,0);assert.equal(h.stats.registry,0);
});
test('V8 503 with exhausted execution budget skips retry and never commits',()=>{
  const h=make({codes:[503],durations:[205000]});
  const result=h.run();
  assert.equal(result.status,'failed');assert.match(result.message,/503/);
  assert.equal(h.fetches.length,1);assert.equal(h.sleeps.length,0);
  assert.equal(h.stats.docs,0);
  assert.ok(h.logs.some(s=>s.includes('retry skipped: time budget')));
});
test('V8 retry timeout is bounded by remaining total execution budget',()=>{
  const h=make({codes:[503,200,200],durations:[95000]});
  assert.equal(h.run().status,'completed');
  assert.equal(h.fetches[0].opts.timeoutSeconds,110);
  assert.ok(h.fetches[1].opts.timeoutSeconds<110);
  pinned(h);
});
