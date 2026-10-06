import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function context(){
  const ctx={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return ctx;
}

function functionBlock(name){
  const re=new RegExp('function\\s+'+name+'\\s*\\(');
  const m=re.exec(source);
  assert.ok(m,`missing function ${name}`);
  const start=m.index;
  const next=source.slice(start+1).search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start,next>=0?start+1+next:source.length);
}

test('P5 registers a lightweight report entity without changing Event columns',()=>{
  const ctx=context();
  assert.ok(Number(ctx.CONFIG.SCHEMA_VERSION)>=5);
  assert.equal(ctx.CONFIG.SHEETS.REPORTS,'ReportRegistry');
  assert.equal(ctx.MAIN_SCHEMA_HEADERS.length,48);
  assert.match(ctx.CONFIG.REPORT_PROMPT_VERSION,/^\d{4}\.\d{2}\.\d{2}-p5\./);
  assert.match(source,/\['ReportID','EventID','DocumentID','DocumentURL','GeneratedAt','GeneratedBy','Model','ApiVersion','PromptVersion','TemplateDocID','ReadinessWarnings','Status'\]/);
});

test('report readiness warns about incomplete source data but does not invent classifications',()=>{
  const ctx=context();
  const warnings=Array.from(ctx.getReportReadinessWarnings_({
    col15:'รอตรวจสอบ',
    col17:'รอดำเนินการ',
    col14:'',
    col19:''
  }));
  assert.deepEqual(warnings,[
    'ยังไม่ได้ยืนยันผลการตรวจสอบเหตุการณ์',
    'ยังไม่ได้สรุปเกณฑ์สอบสวนโรค',
    'ยังไม่มีรายละเอียดเหตุการณ์สำหรับใช้ร่างรายงาน',
    'ยังไม่ได้บันทึกการประเมินความเสี่ยงของทีมสอบสวน'
  ]);

  const readyWarnings=Array.from(ctx.getReportReadinessWarnings_({
    col15:'ตรวจสอบแล้วจริง',
    col17:'ไม่เข้าเกณฑ์',
    col14:'รายละเอียด',
    col19:'ความเสี่ยงต่ำ',
    col26:''
  }));
  assert.deepEqual(readyWarnings,[]);
});

test('report generation requires explicit acknowledgement when readiness warnings remain',()=>{
  const block=functionBlock('generateReportFromWeb');
  assert.match(block,/getReportReadinessWarnings_/);
  assert.match(block,/acknowledgeWarnings !== true/);
  assert.match(block,/CONFIG\.SHEETS\.REPORTS/);
  assert.match(block,/CONFIG\.REPORT_PROMPT_VERSION/);
  assert.match(block,/'generated'/);
  assert.match(block,/reportId:reportId,url:newDocFile\.getUrl\(\)/);
});

test('report registry remains linked and queryable by EventID',()=>{
  const block=functionBlock('listReportsForEvent');
  assert.match(block,/requireAuth_\(sessionToken, 'view'\)/);
  assert.match(block,/String\(r\[1\]\) === String\(eventId\)/);
  assert.match(block,/reportId:r\[0\]/);
  assert.match(block,/promptVersion:r\[8\]/);
  assert.match(block,/readinessWarnings:warnings/);
});

test('AI provenance records the actual successful model from Gemini fallback calls',()=>{
  const analyze=functionBlock('analyzeWithGemini_');
  const call=functionBlock('callGeminiForReport_');
  assert.match(call,/return \{text:text, modelName:currentModelInfo\.modelName, apiVersion:currentModelInfo\.apiVersion\}/);
  assert.match(analyze,/models:models/);
  assert.match(analyze,/apiVersions:apiVersions/);
  assert.doesNotMatch(analyze,/return finalText/);
});

test('report prompt keeps epidemiological classification and risk human-controlled',()=>{
  const ctx=context();
  const row=Array(48).fill('');
  row[2]='ผู้แจ้งทดสอบ';
  row[5]='โรคทดสอบ';
  row[6]='ผู้ป่วยรายเดี่ยว';
  row[16]='ไม่เข้าเกณฑ์';
  row[18]='ความเสี่ยงต่ำ';
  row[13]='รายละเอียดทดสอบ';
  row[20]='มาตรการทดสอบ';
  const prompt=ctx.buildReportPrompt_(row,'อำเภอทดสอบ');
  assert.match(prompt,/ประเภทเหตุการณ์ที่บันทึกในระบบ: ผู้ป่วยรายเดี่ยว/);
  assert.match(prompt,/การเข้าเกณฑ์สอบสวนโรคที่ทีมบันทึก: ไม่เข้าเกณฑ์/);
  assert.match(prompt,/ระดับความเสี่ยงที่ทีมบันทึก: ความเสี่ยงต่ำ/);
  assert.match(prompt,/AI ทำหน้าที่ช่วยร่างและเรียบเรียงรายงานเท่านั้น/);
  assert.match(prompt,/ห้ามแก้ไข ตัดสินใหม่ หรือยกระดับ/);
  assert.doesNotMatch(prompt,/ประเมินในระดับที่สูงกว่าหรือรุนแรงไว้ก่อน/);
  assert.doesNotMatch(prompt,/ระบุและฟันธงให้ชัดเจนว่าเหตุการณ์นี้จัดเป็น/);
});

test('Reporter UI performs readiness preflight and exposes Event report history',()=>{
  assert.match(html,/getReportReadiness/);
  assert.match(html,/generateReportFromWeb',token,eventId,acknowledge/);
  assert.match(html,/listReportsForEvent/);
  assert.match(html,/reportHistoryModal/);
  assert.match(html,/readinessWarnings/);
  assert.match(html,/AI ใช้เพื่อช่วยร่างรายงานเบื้องต้นเท่านั้น/);
  assert.doesNotMatch(html,/approveReport|reviewReport|signReport/);
});
