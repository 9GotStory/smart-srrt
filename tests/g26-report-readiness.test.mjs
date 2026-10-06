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
    revision:7,
    recordStatus:'active',
    col2:'06/10/2569',
    col3:'รพ.สต.ทดสอบ',
    col6:'ไข้เลือดออก',
    col8:'บ้านทดสอบ',
    col9:'05/10/2569',
    col10:'1',
    col11:'ตำบลทดสอบ',
    col12:'อำเภอทดสอบ',
    col13:'จังหวัดทดสอบ',
    col14:'พบผู้ป่วยสงสัย 1 ราย',
    col15:'ตรวจสอบแล้วจริง',
    col17:'เข้าเกณฑ์',
    col19:'ความเสี่ยงปานกลาง',
    col20:'สสอ.ทดสอบ',
    col21:'ลงพื้นที่สอบสวนและควบคุมโรค',
    col23:'รพ.สต.ทดสอบ',
    col24:'ลงสอบสวน',
    col26:'06/10/2569',
    col29:'ทดสอบ',
    eventConsistencyWarnings:[]
  };
}

test('G-26 adds no persistent schema and remains schema v7',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
  assert.doesNotMatch(source,/REPORT_READINESS_HEADERS|ReadinessSheet|ReportReadinessSheet/);
});

test('complete Event returns ready with no warnings',()=>{
  const ctx=makeContext();
  const result=ctx.deriveReportReadiness_(completeEvent());
  assert.equal(result.status,'ready');
  assert.equal(result.canGenerate,true);
  assert.equal(result.warningCount,0);
  assert.equal(result.importantCount,0);
  assert.equal(result.recommendedCount,0);
  assert.deepEqual(Array.from(result.warnings),[]);
});

test('important warnings cover core prompt/template source fields',()=>{
  const ctx=makeContext();
  const e=completeEvent();
  e.col2='';e.col3='';e.col6='';e.col8='';e.col10='';e.col11='';e.col12='';e.col13='';e.col29='';e.col14='';
  const result=ctx.deriveReportReadiness_(e);
  const codes=Array.from(result.warnings,w=>w.code);
  assert.equal(result.status,'review_recommended');
  assert.equal(result.canGenerate,true);
  for(const code of [
    'MISSING_RECEIVED_DATE',
    'MISSING_REPORTER',
    'MISSING_DISEASE_EVENT',
    'MISSING_LOCATION',
    'MISSING_EVENT_DETAIL'
  ]) assert.ok(codes.includes(code),code);
  assert.equal(result.importantCount,5);
});

test('recommended warnings cover current report inputs without blocking generation',()=>{
  const ctx=makeContext();
  const e=completeEvent();
  e.col9='';e.col15='';e.col17='';e.col19='';e.col20='';e.col21='';e.col23='';
  const result=ctx.deriveReportReadiness_(e);
  const codes=Array.from(result.warnings,w=>w.code);
  for(const code of [
    'MISSING_ONSET_DATE',
    'MISSING_VERIFICATION',
    'MISSING_CRITERIA',
    'MISSING_RISK',
    'MISSING_ALERT_AGENCY',
    'MISSING_RECEIVE_AGENCY',
    'MISSING_CONTROL_MEASURES'
  ]) assert.ok(codes.includes(code),code);
  assert.equal(result.canGenerate,true);
  assert.ok(result.recommendedCount>=7);
});

test('location is considered present when structured area fields exist even if free-text place is blank',()=>{
  const ctx=makeContext();
  const e=completeEvent();
  e.col8='';
  const result=ctx.deriveReportReadiness_(e);
  assert.equal(result.warnings.some(w=>w.code==='MISSING_LOCATION'),false);
});

test('investigation date warning appears when investigation is marked performed',()=>{
  const ctx=makeContext();
  const e=completeEvent();
  e.col26='';
  const result=ctx.deriveReportReadiness_(e);
  assert.equal(result.warnings.filter(w=>w.message==='ระบุว่าลงสอบสวนแล้ว แต่ยังไม่มีวันที่ลงสอบสวนโรค').length,1);
  assert.ok(result.warnings.some(w=>w.code==='MISSING_INVESTIGATION_DATE'));
});

test('G-04 consistency warnings are surfaced as important readiness warnings',()=>{
  const ctx=makeContext();
  const e=completeEvent();
  e.eventConsistencyWarnings=[{
    code:'CRITERIA_NOT_MET_BUT_INVESTIGATED',
    message:'ไม่เข้าเกณฑ์สอบสวนโรค แต่มีวันที่ลงสอบสวนโรค'
  }];
  const result=ctx.deriveReportReadiness_(e);
  const warning=result.warnings.find(w=>w.code==='CONSISTENCY_CRITERIA_NOT_MET_BUT_INVESTIGATED');
  assert.ok(warning);
  assert.equal(warning.severity,'important');
  assert.equal(result.canGenerate,true);
});

test('readiness RPC requires report permission and returns Event source metadata',()=>{
  const ctx=makeContext();
  const row=Array(39).fill('');
  row[1]='06/10/2569';
  row[2]='หน่วยงานแจ้ง';
  row[5]='โรคทดสอบ';
  row[7]='สถานที่';
  row[13]='รายละเอียด';
  row[30]='11111111-1111-4111-8111-111111111111';
  row[31]=12;
  row[32]='active';

  let action='';
  ctx.requireAuth_=(_token,a)=>{action=a;return {role:'Admin'}};
  ctx.getSheetByIdOrName_=()=>({
    getRange:()=>({getDisplayValues:()=>[row]})
  });
  ctx.findEventRowById_=()=>2;
  ctx.rowToObject_=r=>({
    eventId:r[30],
    revision:Number(r[31]),
    recordStatus:r[32],
    col2:r[1],col3:r[2],col6:r[5],col8:r[7],col14:r[13],
    eventLifecycle:'received',
    eventLifecycleLabel:'รับแจ้งแล้ว',
    eventConsistencyWarnings:[]
  });

  const result=ctx.getReportReadiness('token','11111111-1111-4111-8111-111111111111');
  assert.equal(action,'report');
  assert.equal(result.eventId,'11111111-1111-4111-8111-111111111111');
  assert.equal(result.sourceRevision,12);
  assert.equal(result.promptVersion,'2026.10.06.1');
  assert.equal(result.canGenerate,true);
});

test('actual report generation remains non-blocking and does not call readiness as a hard gate',()=>{
  const block=source.match(/function generateReportFromWeb[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.doesNotMatch(block,/getReportReadiness|deriveReportReadiness_|review_recommended|warningCount/);
  assert.match(block,/requireAuth_\(sessionToken, 'report'\)/);
});

test('browser checks readiness first, shows warnings, and still offers explicit generation',()=>{
  assert.match(html,/id="reportReadinessModal"/);
  assert.match(html,/getReportReadiness/);
  assert.match(html,/function renderReportReadiness\(readiness\)/);
  assert.match(html,/function proceedReportGeneration\(\)/);
  assert.match(html,/สร้างรายงานต่อ/);
  assert.match(html,/คำเตือนนี้เป็นตัวช่วยตรวจข้อมูลเท่านั้น/);
  assert.match(html,/if\(readiness&&Array\.isArray\(readiness\.warnings\)&&readiness\.warnings\.length\)/);
  assert.match(html,/await runReportGeneration\(eventId,btn,w\)/);
});

test('G-26 does not add readiness score, approval, or mandatory checklist state',()=>{
  assert.doesNotMatch(source,/readinessScore|readinessPercent|approvalStatus|mandatoryChecklist/i);
  assert.doesNotMatch(html,/readinessScore|readinessPercent|approvalStatus|mandatoryChecklist/i);
});
