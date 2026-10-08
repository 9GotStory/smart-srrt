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

function completeEvent(){
  return {
    eventId:'11111111-1111-4111-8111-111111111111',
    revision:4,
    recordStatus:'active',
    col2:'2569-10-07',
    col3:'รพ.สต.ทดสอบ',
    col6:'ไข้เลือดออก',
    col8:'หมู่บ้านทดสอบ',
    col9:'2569-10-05',
    col14:'พบผู้ป่วยสงสัย 1 ราย ลงพื้นที่สอบสวนและประเมินสิ่งแวดล้อม',
    col15:'ตรวจสอบแล้วจริง',
    col17:'เข้าเกณฑ์',
    col19:'ปานกลาง',
    col20:'สสอ.ทดสอบ',
    col21:'ค้นหาผู้ป่วยเพิ่มเติมและกำจัดแหล่งเพาะพันธุ์ยุง',
    col23:'รพ.สต.ทดสอบ',
    col24:'ลงสอบสวน',
    col26:'2569-10-07',
    eventLifecycle:'investigated',
    eventConsistencyWarnings:[]
  };
}

function fnBlock(name){
  const re=new RegExp('function\\s+'+name.replace(/[$]/g,'\\$&')+'\\s*\\(');
  const m=re.exec(source);if(!m)return'';
  const start=m.index;
  const next=source.slice(start+1).search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start,next>=0?start+1+next:source.length);
}

test('G-26 does not change schema beyond G-17 v7',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
  assert.equal(ctx.CONFIG.SHEETS.REPORTS,'ReportRegistry');
});

test('complete report inputs derive ready with no warnings',()=>{
  const ctx=makeContext();
  const r=ctx.deriveAIReportReadiness_(completeEvent());

  assert.equal(r.level,'ready');
  assert.equal(r.canGenerate,true);
  assert.equal(r.warningCount,0);
  assert.equal(r.coreMissingCount,0);
  assert.equal(r.importantMissingCount,0);
  assert.equal(r.consistencyWarningCount,0);
});

test('missing important inputs derives review but remains generatable',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col3='';
  event.col9='';
  event.col21='';
  event.col20='';
  event.col23='';
  const r=ctx.deriveAIReportReadiness_(event);

  assert.equal(r.level,'review');
  assert.equal(r.canGenerate,true);
  assert.equal(r.coreMissingCount,0);
  assert.ok(r.importantMissingCount>=4);
  assert.ok(r.warnings.some(w=>w.code==='REPORT_REPORTER_MISSING'));
  assert.ok(r.warnings.some(w=>w.code==='REPORT_ONSET_DATE_MISSING'));
  assert.ok(r.warnings.some(w=>w.code==='REPORT_MEASURES_MISSING'));
  assert.ok(r.warnings.some(w=>w.code==='REPORT_AGENCY_MISSING'));
});

test('missing any core report input derives limited but never hard-blocks generation',()=>{
  const ctx=makeContext();
  const fields=[
    ['col2','REPORT_CORE_RECEIVED_DATE_MISSING'],
    ['col6','REPORT_CORE_EVENT_MISSING'],
    ['col14','REPORT_CORE_NARRATIVE_MISSING']
  ];
  for(const [field,code] of fields){
    const event=completeEvent();
    event[field]='';
    const r=ctx.deriveAIReportReadiness_(event);
    assert.equal(r.level,'limited');
    assert.equal(r.canGenerate,true);
    assert.ok(r.warnings.some(w=>w.code===code));
  }

  const event=completeEvent();
  event.col8='';event.col10='';event.col11='';event.col12='';event.col13='';event.col29='';
  const location=ctx.deriveAIReportReadiness_(event);
  assert.equal(location.level,'limited');
  assert.equal(location.canGenerate,true);
  assert.ok(location.warnings.some(w=>w.code==='REPORT_CORE_LOCATION_MISSING'));
});

test('geographic fields count as location even when free-text place is blank',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col8='';
  event.col11='ตำบลทดสอบ';
  const r=ctx.deriveAIReportReadiness_(event);

  assert.equal(r.warnings.some(w=>w.code==='REPORT_CORE_LOCATION_MISSING'),false);
  assert.equal(r.level,'ready');
});

test('G-04 consistency warnings are surfaced as report-readiness warnings',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.eventConsistencyWarnings=[
    {code:'NO_INVESTIGATION_BUT_DATE_SET',message:'ระบุว่าไม่ลงสอบสวน แต่มีวันที่ลงสอบสวนโรค'}
  ];
  const r=ctx.deriveAIReportReadiness_(event);

  assert.equal(r.level,'review');
  assert.equal(r.canGenerate,true);
  assert.equal(r.consistencyWarningCount,1);
  assert.ok(r.warnings.some(w=>
    w.code==='REPORT_CONSISTENCY_NO_INVESTIGATION_BUT_DATE_SET' &&
    w.severity==='consistency'
  ));
});

test('investigated events warn when investigation date is missing',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col26='';
  event.eventLifecycle='investigated';
  const r=ctx.deriveAIReportReadiness_(event);

  assert.equal(r.level,'review');
  assert.ok(r.warnings.some(w=>w.code==='REPORT_INVESTIGATION_DATE_MISSING'));
});

test('authenticated readiness RPC resolves the latest Event row and requires report permission',()=>{
  const ctx=makeContext();
  const row=Array(39).fill('');
  row[1]='2569-10-07';
  row[2]='รพ.สต.ทดสอบ';
  row[5]='ไข้เลือดออก';
  row[7]='หมู่บ้านทดสอบ';
  row[8]='2569-10-05';
  row[13]='รายละเอียดเหตุการณ์';
  row[14]='ตรวจสอบแล้วจริง';
  row[16]='เข้าเกณฑ์';
  row[18]='ปานกลาง';
  row[19]='สสอ.ทดสอบ';
  row[20]='มาตรการควบคุม';
  row[22]='รพ.สต.ทดสอบ';
  row[23]='ลงสอบสวน';
  row[25]='2569-10-07';
  row[30]='11111111-1111-4111-8111-111111111111';
  row[31]=4;
  row[32]='active';

  let authAction='';
  ctx.requireAuth_=(_token,action)=>{authAction=action;return{email:'admin@example.test'}};
  ctx.getSheetByIdOrName_=()=>({
    getRange:()=>({getDisplayValues:()=>[row]})
  });
  ctx.findEventRowById_=()=>2;

  const r=ctx.getAIReportReadiness('token','11111111-1111-4111-8111-111111111111');
  assert.equal(authAction,'report');
  assert.equal(r.level,'ready');
  assert.equal(r.canGenerate,true);
});

test('generation remains independent of readiness level and contains no hidden readiness hard gate',()=>{
  const generation=fnBlock('generateReportFromWeb');
  assert.doesNotMatch(generation,/getAIReportReadiness|deriveAIReportReadiness_|canGenerate|REPORT_CORE_/);
  assert.match(generation,/analyzeWithGemini_/);
  assert.match(generation,/appendReportRegistry_/);
});

test('authenticated Event rows expose lightweight readiness for badges',()=>{
  const rowToObject=fnBlock('rowToObject_');
  assert.match(rowToObject,/obj\.aiReportReadiness = deriveAIReportReadiness_\(obj\)/);
});

test('browser checks latest server readiness before generation and provides explicit continue path',()=>{
  assert.match(html,/id="reportReadinessModal"/);
  assert.match(html,/getAIReportReadiness/);
  assert.match(html,/function renderReportReadinessModal\(readiness,eventId\)/);
  assert.match(html,/function continueReportFromWarning\(\)/);
  assert.match(html,/สร้างรายงานต่อ/);
  assert.match(html,/กลับไปตรวจข้อมูล/);
  assert.match(html,/readiness&&readiness\.level==='ready'/);
  assert.match(html,/executeReport\(eventId,btn,probe\)/);
});

test('browser surfaces readiness badges without disabling AI report controls',()=>{
  assert.match(html,/function reportReadinessBadge\(r\)/);
  assert.match(html,/AI พร้อม/);
  assert.match(html,/AI ข้อมูลจำกัด/);
  assert.match(html,/AI ตรวจสอบ/);

  const render=html.match(/function renderTables\(\)[\s\S]*?(?=\n  function buildRecordForm)/)?.[0]??'';
  assert.match(render,/reportReadinessBadge\(r\)/);
  assert.match(render,/onclick='makeReport/);
  assert.doesNotMatch(render,/aiReportReadiness[^\n]{0,160}disabled/);
});

test('G-26 adds no readiness persistence or schema migration',()=>{
  assert.doesNotMatch(source,/['"](?:AIReportReadiness|ReportReadiness)['"]\s*:/);
  assert.doesNotMatch(source,/READINESS_(?:STATUS|LEVEL|WARNING)\s*:/);
  assert.doesNotMatch(source,/REPORT_REGISTRY_HEADERS[\s\S]{0,500}Readiness/);
  assert.doesNotMatch(source,/MAIN_HEADERS[\s\S]{0,500}Readiness/);
  assert.doesNotMatch(source,/function migrateG26/);
});

test('placeholder and explicit unknown values are treated as missing, not complete evidence',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col6='..........';
  event.col14='…';
  event.col3='ไม่ทราบ';
  event.col19='ไม่ระบุ';
  const rd=ctx.deriveAIReportReadiness_(event);
  assert.equal(rd.level,'limited');
  assert.equal(rd.canGenerate,true);
  for(const code of [
    'REPORT_CORE_EVENT_MISSING','REPORT_CORE_NARRATIVE_MISSING',
    'REPORT_REPORTER_MISSING','REPORT_RISK_MISSING'
  ]) assert.ok(rd.warnings.some(w=>w.code===code),code);
});

test('pending verification and investigation criteria generate advisory context warnings',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col15='รอตรวจสอบ';
  event.col17='รอดำเนินการ';
  const rd=ctx.deriveAIReportReadiness_(event);
  assert.equal(rd.level,'review');
  assert.equal(rd.canGenerate,true);
  assert.ok(rd.warnings.some(w=>w.code==='REPORT_VERIFICATION_PENDING'));
  assert.ok(rd.warnings.some(w=>w.code==='REPORT_CRITERIA_PENDING'));
});

test('blank verification, criteria and risk trigger warnings, not a report gate',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col15='';event.col17='';event.col19='';
  const rd=ctx.deriveAIReportReadiness_(event);
  assert.equal(rd.level,'review');
  assert.equal(rd.canGenerate,true);
  for(const code of ['REPORT_VERIFICATION_MISSING','REPORT_CRITERIA_MISSING','REPORT_RISK_MISSING']){
    assert.ok(rd.warnings.some(w=>w.code===code),code);
  }
});

test('G-04 investigation-date contradiction is not double-counted',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.col24='ลงสอบสวน';event.col26='';
  event.eventLifecycle='investigated';
  event.eventConsistencyWarnings=[{
    code:'INVESTIGATION_MARKED_WITHOUT_DATE',
    message:'ระบุว่าลงสอบสวนแล้ว แต่ยังไม่มีวันที่ลงสอบสวนโรค'
  }];
  const rd=ctx.deriveAIReportReadiness_(event);
  assert.ok(rd.warnings.some(w=>w.code==='REPORT_CONSISTENCY_INVESTIGATION_MARKED_WITHOUT_DATE'));
  assert.equal(rd.warnings.some(w=>w.code==='REPORT_INVESTIGATION_DATE_MISSING'),false);
  assert.equal(rd.consistencyWarningCount,1);
});

test('closed Event is still advisory-reportable and schema stays v7',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  event.recordStatus='closed';
  event.eventLifecycle='closed';
  event.col21='';
  const rd=ctx.deriveAIReportReadiness_(event);
  assert.equal(rd.canGenerate,true);
  assert.equal(rd.level,'review');
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
});

test('readiness response remains warning metadata only, without Event narrative or source values',()=>{
  const ctx=makeContext();
  const event=completeEvent();
  const rd=ctx.deriveAIReportReadiness_(event);
  assert.equal(Object.hasOwn(rd,'col14'),false);
  assert.equal(Object.hasOwn(rd,'sourceRow'),false);
  assert.equal(Object.hasOwn(rd,'details'),false);
  assert.equal(Object.hasOwn(rd,'recordStatus'),false);
  assert.deepEqual(Object.keys(rd).sort(),[
    'canGenerate','consistencyWarningCount','coreMissingCount','importantMissingCount','label','level','warningCount','warnings'
  ].sort());
});
