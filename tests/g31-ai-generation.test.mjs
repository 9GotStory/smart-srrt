import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(root,'Code_Smart_SRRT_OneClick_v2026.09.08.1.gs'),'utf8');
const html = fs.readFileSync(path.join(root,'Index_Smart_SRRT_OneClick.html'),'utf8');

function scriptWithMocks(responseHandler) {
  const cache = new Map();
  const requests = [];
  const clock = {now:0};
  const context = {
    Logger:{log(){}},
    CacheService:{getScriptCache(){return {
      get(k){return cache.get(k)||null;},
      put(k,v){cache.set(k,v);},
      remove(k){cache.delete(k);}
    };}},
    UrlFetchApp:{fetch(url,options){requests.push({url,options});return responseHandler(url,options,clock);}},
    Utilities:{sleep(){}},
    Date:{now(){return clock.now;}}
  };
  vm.createContext(context);
  vm.runInContext(server,context,{filename:'Code.gs',timeout:2500});
  return {context,cache,requests,clock};
}
function response(code,data) {
  return {getResponseCode(){return code;},getContentText(){return JSON.stringify(data);}};
}
const chosen = {modelName:'models/gemini-3.8-flash',apiVersion:'v1'};

test('G-31 report selector ignores previously cached 3.5 and uses pinned 3.8 only',()=>{
  const {context,cache}=scriptWithMocks(()=>{throw Error('no fetch expected')});
  cache.set('GEMINI_AVAILABLE_MODEL','models/gemini-3.5-flash');
  cache.set('GEMINI_AVAILABLE_ENDPOINT','v1');
  let selections=0;
  context.findGeminiModelInList_=(key,name)=>{
    selections++;
    assert.equal(name,'models/gemini-3.8-flash');
    return chosen;
  };
  const first=context.resolveReportGeminiModelInfo_('mock-key');
  assert.equal(first.modelName,'models/gemini-3.8-flash');
  assert.equal(cache.get('GEMINI_AVAILABLE_MODEL'),'models/gemini-3.8-flash');
  const second=context.resolveReportGeminiModelInfo_('mock-key');
  assert.equal(second.modelName,'models/gemini-3.8-flash');
  assert.equal(selections,1,'repeat pinned model should use the cache');
});

test('G-31 report selector fails closed if Gemini 3.8 is unavailable',()=>{
  const {context}=scriptWithMocks(()=>{throw Error('no fetch expected')});
  context.findGeminiModelInList_=()=>({modelName:'models/gemini-3.7-flash',apiVersion:'v1'});
  assert.equal(context.resolveReportGeminiModelInfo_('mock-key'),null);
});

test('G-31 HTTP 503 makes exactly one request to Gemini 3.8, never attempts fallback',()=>{
  const {context,requests}=scriptWithMocks(()=>response(503,{error:{message:'High demand'}}));
  assert.throws(()=>context.callGeminiForReport_('mock-key',chosen,'prompt','part1',{}),/503/);
  assert.equal(requests.length,1);
  assert.match(requests[0].url,/\/v1\/models\/gemini-3\.8-flash:generateContent/);
  assert.doesNotMatch(requests[0].url,/gemini-3\.[567]-flash/);
});

test('G-31 HTTP 429 has clear error and does not retry',()=>{
  const {context,requests}=scriptWithMocks(()=>response(429,{error:{message:'Quota exceeded'}}));
  assert.throws(()=>context.callGeminiForReport_('mock-key',chosen,'prompt','part1',{}),/429/);
  assert.equal(requests.length,1);
});

test('G-31 rejects non-pinned model before sending any HTTP request',()=>{
  const {context,requests}=scriptWithMocks(()=>response(200,{}));
  assert.throws(()=>context.callGeminiForReport_('mock-key',{modelName:'models/gemini-3.7-flash',apiVersion:'v1'},'prompt','part1',{}),/Gemini 3\.8 Flash/);
  assert.equal(requests.length,0);
});

test('G-31 produces both report sections using Gemini 3.8 only',()=>{
  const {context,requests}=scriptWithMocks(()=>response(200,{
    candidates:[{finishReason:'STOP',content:{parts:[{text:'Sample test report section'}]}}]
  }));
  context.findGeminiModelInList_=()=>chosen;
  context.buildReportPromptPart_=(rows,location,section)=>'PROMPT '+section;
  const meta={models:[],apiVersions:[]};
  const result=context.analyzeWithGemini_([],'test place',{GEMINI_API_KEY:'mock-key',GEMINI_MODEL:'AUTO'},meta);
  assert.match(result,/Sample test report section/);
  assert.equal(requests.length,2,'two sequential sections, no fallback attempts');
  assert.ok(requests.every(x=>x.url.includes('/models/gemini-3.8-flash:generateContent')));
  assert.deepEqual(Array.from(meta.models),['models/gemini-3.8-flash']);
  assert.deepEqual(Array.from(meta.apiVersions),['v1']);
});

test('G-31 does not start second AI section after slow successful first response',()=>{
  const {context,requests,clock}=scriptWithMocks((url,opts,t)=>{
    t.now+=130000;
    return response(200,{candidates:[{content:{parts:[{text:'part one'}]}}]});
  });
  context.findGeminiModelInList_=()=>chosen;
  context.buildReportPromptPart_=(rows,location,part)=>part;
  assert.throws(()=>context.analyzeWithGemini_([],'place',{GEMINI_API_KEY:'mock-key'},{}),/ยุติก่อนเริ่มส่วนที่สอง/);
  assert.equal(requests.length,1);
  assert.equal(clock.now,130000);
});

test('G-31 browser presents persistent result link, no popup redirect, and in-flight guards',()=>{
  assert.match(html,/id="reportResultModal"/);
  assert.match(html,/id="reportResultStatus"[^>]+aria-live="polite"/);
  assert.match(html,/id="reportResultLink"/);
  assert.match(html,/reportGenerationInFlight = new Set\(\)/);
  assert.match(html,/reportGenerationInFlight\.size > 0/);
  assert.match(html,/reportReadinessInFlight\.size > 0/);
  assert.match(html,/showReportGenerationStatus\('สร้างรายงานสำเร็จแล้ว/);
  assert.match(html,/showReportGenerationStatus\('สร้างรายงานไม่สำเร็จ:/);
  assert.match(html,/docs\\\.google\\\.com/);
  assert.doesNotMatch(html,/w\.location\s*=/);
  assert.doesNotMatch(html,/const probe\s*=\s*window\.open/);
});

test('G-31 One-Click server has only the pinned report path',()=>{
  assert.match(server,/var REPORT_GEMINI_MODEL = 'models\/gemini-3\.8-flash'/);
  assert.match(server,/var modelInfo = resolveReportGeminiModelInfo_\(apiKey\)/);
  assert.doesNotMatch(server,/function getGeminiRetryModelQueue_\(/);
  assert.doesNotMatch(server,/fallback to next model/);
  assert.match(server,/requireAuth_\(sessionToken, 'report'\)/);
  assert.match(server,/appendReportRegistry_\(/);
});
