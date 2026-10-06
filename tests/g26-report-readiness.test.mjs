import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function makeContext(){
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(context);
  vm.runInContext(source,context);
  return context;
}

function fnBlock(src,name){
  const marker='function '+name+'(';
  const start=src.indexOf(marker);
  if(start<0)return '';
  const next=src.indexOf('\nfunction ',start+marker.length);
  return src.slice(start,next>=0?next:src.length);
}

function completeEvent(){
  return {
    eventId:'11111111-1111-4111-8111-111111111111',
    revision:7,
    recordStatus:'active',
    col2:'06/10/2569',
    col3:'รพ.สต.ทดสอบ',
    col6:'ไข้เลือดออก',
    col8:'บ้านทดสอบ',
    col9:'05/10/2569',
    col10:'1',
    col11:'ทดสอบ',
    col12:'เมือง',
    col13:'แพร่',
    col14:'พบผู้ป่วยสงสัย 1 ราย',
    col15:'ตรวจสอบแล้วจริง',
    col17:'เข้าเกณฑ์',
    col20:'สสอ.ทดสอบ',
    col21:'ลงพื้นที่สอบสวนและควบคุมโรค',
    col23:'รพ.สต.ทดสอบ',
    col24:'ลงสอบสวน',
    col26:'06/10/2569',
    col29:'ทดสอบ'
  };
}

test('G-26 keeps schema v7 and introduces no readiness persistence',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
  assert.doesNotMatch(source,/REPORT_READINESS|ReadinessStatus|readiness_status/i);
});

test('complete Event is ready with no warnings',()=>{
  const ctx=makeContext();
  const out=ctx.deriveReportReadiness_(completeEvent());
  assert.equal(out.status,'ready');
  assert.equal(out.warningCount,0);
  assert.deepEqual(Array.from(out.warnings),[]);
});

test('missing core report context yields limited without blocking semantics',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col2='';
  event.col6='';
  event.col8='';
  event.col10='';
  event.col11='';
  event.col12='';
  event.col13='';
  event.col29='';
  event.col14='';

  const out=ctx.deriveReportReadiness_(event);
  assert.equal(out.status,'limited');
  const codes=Array.from(out.warnings,w=>w.code);
  assert.ok(codes.includes('MISSING_RECEIVED_DATE'));
  assert.ok(codes.includes('MISSING_DISEASE_EVENT'));
  assert.ok(codes.includes('MISSING_LOCATION_CONTEXT'));
  assert.ok(codes.includes('MISSING_EVENT_DETAILS'));
  assert.ok(out.warnings.every(w=>['core','quality','consistency'].includes(w.category)));
});

test('missing quality context yields review when core context exists',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col3='';
  event.col9='';
  event.col15='';
  event.col20='';
  event.col23='';
  event.col21='';
  event.col24='';

  const out=ctx.deriveReportReadiness_(event);
  assert.equal(out.status,'review');
  const codes=Array.from(out.warnings,w=>w.code);
  assert.ok(codes.includes('MISSING_REPORTER'));
  assert.ok(codes.includes('MISSING_ONSET_DATE'));
  assert.ok(codes.includes('MISSING_OR_PENDING_VERIFICATION'));
  assert.ok(codes.includes('MISSING_COORDINATION_AGENCY'));
  assert.ok(codes.includes('MISSING_CONTROL_MEASURES'));
  assert.ok(codes.includes('MISSING_INVESTIGATION_DECISION'));
});

test('pending verification is a soft review warning',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col15='รอตรวจสอบ';

  const out=ctx.deriveReportReadiness_(event);
  assert.equal(out.status,'review');
  assert.ok(out.warnings.some(w=>w.code==='MISSING_OR_PENDING_VERIFICATION'));
});

test('investigation decision warning is context-specific to criteria-met Events',()=>{
  const ctx=makeContext();

  const notMet=completeEvent();
  notMet.col17='ไม่เข้าเกณฑ์';
  notMet.col24='';
  notMet.col26='';
  const notMetOut=ctx.deriveReportReadiness_(notMet);
  assert.equal(notMetOut.warnings.some(w=>w.code==='MISSING_INVESTIGATION_DECISION'),false);
  assert.equal(notMetOut.warnings.some(w=>w.code==='MISSING_INVESTIGATION_DATE'),false);

  const met=completeEvent();
  met.col24='';
  const metOut=ctx.deriveReportReadiness_(met);
  assert.ok(metOut.warnings.some(w=>w.code==='MISSING_INVESTIGATION_DECISION'));
});

test('pending criteria warns and criteria-met without investigation date warns',()=>{
  const ctx=makeContext();

  const pending=completeEvent();
  pending.col17='รอดำเนินการ';
  const pendingOut=ctx.deriveReportReadiness_(pending);
  assert.ok(pendingOut.warnings.some(w=>w.code==='MISSING_OR_PENDING_CRITERIA'));
  assert.equal(pendingOut.warnings.some(w=>w.code==='MISSING_INVESTIGATION_DATE'),false);

  const met=completeEvent();
  met.col26='';
  const metOut=ctx.deriveReportReadiness_(met);
  assert.ok(metOut.warnings.some(w=>w.code==='MISSING_INVESTIGATION_DATE'));
});

test('G-04 consistency warnings are surfaced as report readiness warnings',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col15='ตรวจสอบแล้วไม่จริง';
  event.col17='เข้าเกณฑ์';

  const out=ctx.deriveReportReadiness_(event);
  const warning=out.warnings.find(w=>w.code==='CONSISTENCY_VERIFY_FALSE_BUT_CRITERIA_MET');
  assert.ok(warning);
  assert.equal(warning.category,'consistency');
});

test('getReportReadiness requires report permission and returns current Event identity only',()=>{
  const ctx=makeContext();
  const row=Array(38).fill('');
  row[1]='06/10/2569';
  row[2]='ผู้แจ้ง';
  row[5]='ไข้เลือดออก';
  row[7]='พื้นที่';
  row[8]='05/10/2569';
  row[13]='รายละเอียด';
  row[14]='ตรวจสอบแล้วจริง';
  row[16]='เข้าเกณฑ์';
  row[19]='สสอ.';
  row[20]='มาตรการ';
  row[22]='รพ.สต.';
  row[23]='ลงสอบสวน';
  row[25]='06/10/2569';
  row[30]='11111111-1111-4111-8111-111111111111';
  row[31]=7;
  row[32]='active';

  let authAction='';
  ctx.requireAuth_=(_token,action)=>{authAction=action;return {role:'Manager'}};
  ctx.getSheetByIdOrName_=()=>({
    getRange:()=>({getDisplayValues:()=>[row]})
  });
  ctx.findEventRowById_=()=>2;

  const out=ctx.getReportReadiness('token','11111111-1111-4111-8111-111111111111');
  assert.equal(authAction,'report');
  assert.equal(out.eventId,'11111111-1111-4111-8111-111111111111');
  assert.equal(out.revision,7);
  assert.equal(out.recordStatus,'active');
  assert.equal(out.status,'ready');
});

test('readiness preflight has no mutation, persistence or audit side effect',()=>{
  const block=fnBlock(source,'getReportReadiness');
  assert.doesNotMatch(block,/appendRow|setValue|setValues|writeAudit_|setProperty|deleteRow|deleteRows/);

  const derive=fnBlock(source,'deriveReportReadiness_');
  assert.doesNotMatch(derive,/appendRow|setValue|setValues|writeAudit_|PropertiesService|DriveApp/);
});

test('report generation remains soft-gated and does not call readiness server-side',()=>{
  const generate=fnBlock(source,'generateReportFromWeb');
  assert.doesNotMatch(generate,/getReportReadiness|deriveReportReadiness_/);
  assert.match(generate,/analyzeWithGemini_/);
  assert.match(generate,/appendReportRegistry_/);
});

test('browser checks readiness before generation and lets the user continue or cancel',()=>{
  const makeReport=fnBlock(html,'makeReport');
  assert.match(makeReport,/getReportReadiness/);
  assert.match(makeReport,/confirm\(/);
  assert.match(makeReport,/generateReportFromWeb/);
  assert.ok(makeReport.indexOf('getReportReadiness') < makeReport.indexOf('generateReportFromWeb'));
  assert.match(makeReport,/if\(!proceed\)/);
  assert.match(makeReport,/w\.close\(\)/);
});

test('G-26 introduces no readiness score or percentage contract',()=>{
  const derive=fnBlock(source,'deriveReportReadiness_');
  assert.doesNotMatch(derive,/score|percentage|percent|%/i);
  assert.match(derive,/status: hasCoreWarning \? 'limited' : \(warnings\.length \? 'review' : 'ready'\)/);
});
