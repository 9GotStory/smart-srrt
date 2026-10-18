import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(ROOT,file),'utf8');
const layout=read('src/web/02-app-layout.html');
const css=read('src/web/01-styles.html');
const source=read('src/dengue/07-p0-02a-mvp-schema-contract.gs');
const doc=read('docs/implementation/d331-p0-18-fieldmap-and-records-preview.md');
const names=[
 'DengueCases','DenguePlans','DengueControlActions','DengueEntomology',
 'DengueFollowups','DengueRequestLedger','D331AccessGrants'
];
const expectedCounts=[16,15,18,16,16,10,22];

function preview(html=layout){
 const begin=html.indexOf('<details id="d331-p018-preview"');
 const records=html.indexOf('<section id="page-records"');
 const reporter=html.indexOf('<section id="page-reporter"');
 assert.ok(begin>records&&begin<reporter,'preview must remain inside existing Records view');
 const end=html.indexOf('</details>',begin);
 assert.ok(end>begin&&end<reporter,'must close preview before Reporter');
 const section=html.slice(begin,end+'</details>'.length);
 assert.equal((section.match(/<details\b/g)||[]).length,1);
 return section;
}
function reject(html){
 assert.throws(()=>validatePreview(html),/P018_PREVIEW_DENY/);
}
function validatePreview(html){
 try {
  const content=preview(html);
  if(!content.includes('<summary')||!content.includes('ตัวอย่างเท่านั้น')||
     !content.includes('DEMO-001')||
     (content.match(/<li>/g)||[]).length!==5||
     (content.match(/<button\b/g)||[]).length!==2||
     (content.match(/<button\b[^>]*\bdisabled\b[^>]*aria-disabled="true"/g)||[]).length!==2||
     /\b(?:onclick|onchange|oninput|onload)\s*=|<script|<form|<input|<textarea|<select|<a\s|\bgoogle\.script\b|\bfetch\s*\(|\b(?:gs|saveRecord|openRecordForm)\s*\(/i.test(content)||
     content.includes('page-dengue')||content.includes('data-page="dengue"')||
     content.includes('PatientID')||content.includes('PasswordHash')||
     content.includes('dengue.case.write'))throw Error('unsafe preview');
  return content;
 }catch{throw Error('P018_PREVIEW_DENY');}
}

test('P018 preview belongs strictly to existing authenticated Records and no new page',()=>{
 const p=validatePreview(layout);
 assert.match(p,/id="d331-p018-preview"/);
 for(const section of ['dashboard','records','reporter','admin','library']){
  assert.equal((layout.match(new RegExp('id="page-'+section+'"','g'))||[]).length,1);
 }
 assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
 assert.ok(layout.indexOf('id="d331-p018-preview"')>layout.indexOf('id="recordBody"'));
});
test('P018 five domain panels in correct order and excludes journal/access management',()=>{
 const p=validatePreview(layout);
 for(const term of ['สอบสวนผู้ป่วย','วางแผนควบคุมโรค',
  'ดำเนินมาตรการ','สำรวจลูกน้ำยุงลาย','ติดตามผล']){
  assert.ok(p.indexOf(term)>0,term);
 }
 assert.ok(p.indexOf('สอบสวนผู้ป่วย')<p.indexOf('วางแผนควบคุมโรค'));
 assert.ok(p.indexOf('วางแผนควบคุมโรค')<p.indexOf('ดำเนินมาตรการ'));
 assert.ok(p.indexOf('ดำเนินมาตรการ')<p.indexOf('สำรวจลูกน้ำยุงลาย'));
 assert.ok(p.indexOf('สำรวจลูกน้ำยุงลาย')<p.indexOf('ติดตามผล'));
 assert.doesNotMatch(p,/D331AccessGrants|DengueRequestLedger/);
});
test('P018 preview is a readable but inert native details prototype',()=>{
 const p=validatePreview(layout);
 assert.match(p,/<summary\s+class=/);
 assert.match(p,/ไม่มีการเชื่อมกับ EventID จริง/);
 assert.match(p,/ไม่ใช่ข้อมูลผู้ป่วยหรือผลการสอบสวนจริง/);
 assert.match(p,/รอยืนยันจุดเริ่มนับ/);
 assert.match(p,/ยังไม่มีการคำนวณเส้นตาย/);
 assert.equal((p.match(/<button\b[^>]*\bdisabled\b/g)||[]).length,2);
 assert.doesNotMatch(p,/status:\s*PASS|overdue|ON_TIME|APPROVED_POLICY/);
});
test('P018 preview fails closed when event handlers, inputs, or enabled controls appear',()=>{
 const p=preview(layout);
 reject(layout.replace('id="d331-p018-preview"', 'id="d331-p018-preview" onclick="saveRecord()"'));
 reject(layout.replace('<button type="button" disabled aria-disabled="true">',
    '<button type="button" aria-disabled="false">'));
 reject(layout.replace('DEMO-001', '<input name="patientName">'));
 reject(layout.replace('ตัวอย่างเท่านั้น','ใช้งานจริง'));
 assert.equal(validatePreview(layout),p);
});
test('P018 v2 schema field names map exactly 7 existing Sheets / 113 headers',()=>{
 const prefix='var D331_P002A_FIELDS_ = ';
 const begin=source.indexOf(prefix),end=source.indexOf('var D331_P002A_ENUMS_',begin);
 assert.ok(begin>0&&end>begin);
 const declaration=source.slice(begin,end);
 const context=vm.createContext({});
 new vm.Script(declaration).runInContext(context,{timeout:1000});
 const fields=context.D331_P002A_FIELDS_;
 assert.deepEqual(Object.keys(fields),names);
 assert.deepEqual(names.map(name=>fields[name].length),expectedCounts);
 assert.equal(names.reduce((total,name)=>total+fields[name].length,0),113);
 for(const tab of names){
  const headers=fields[tab].map(field=>field[0]);
  assert.equal(new Set(headers).size,headers.length,'duplicate field in '+tab);
  assert.ok(doc.includes('`'+tab+'`'),'missing mapping in document: '+tab);
 }
 assert.match(doc,/DRAFT_ONLY/);
 assert.match(doc,/MainData\.EventID/);
 assert.match(doc,/DenguePlans\.TriggerCaseID/);
 assert.match(doc,/DengueControlActions\.PlanID/);
});
test('P018 3-3-1 clinical SLA deliberately unapproved and not evaluated',()=>{
 assert.match(doc,/clinical.policy|clinical-policy/);
 assert.match(doc,/NOT_EVALUATED/);
 assert.match(preview(),/ช่วง 3 ชั่วโมงแรก/);
 assert.match(preview(),/ช่วง 3 ชั่วโมงถัดไป/);
 assert.match(preview(),/ช่วง 1 วัน/);
 assert.doesNotMatch(preview(),/\b(?:PASS|FAIL|OVERDUE|COMPLIANT)\b/);
});
test('P018 responsive design stays scoped to Records preview and supports focus',()=>{
 assert.match(css,/\.app #page-records \.srrt-d331-preview/);
 assert.match(css,/\.srrt-d331-preview__toggle:focus-visible/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/grid-template-columns:repeat\(auto-fit/);
});
test('P018 preserves current Native26 topology and all three D331 source feature gates OFF',()=>{
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.equal(GAS_HTML_SOURCES.includes('src/web/03l-client-d331-status.html'),true);
 assert.match(read('src/dengue/00-g1a-foundation.gs'),/var D331_G1A_ENABLED = false;/);
 assert.match(read('src/dengue/09-p0-03b-dev-readonly-adapter.gs'),
   /var D331_P003B_ENABLED_ = false;/);
 assert.match(read('src/dengue/12-p0-07-guarded-dev-crud.gs'),
   /var D331_P007_ENABLED_ = false;/);
 assert.match(read('src/dengue/07-p0-02a-mvp-schema-contract.gs'),
   /var D331_P002A_APPROVAL_ = 'DRAFT_ONLY';/);
 assert.doesNotMatch(preview(),/\b(?:gs|google\.script|SpreadsheetApp|fetch)\s*\(/);
});
