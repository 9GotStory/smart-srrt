import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/web/03m-client-d331-mvp01-offline.html',import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('../src/web/02-app-layout.html',import.meta.url),'utf8');
const native=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
const reader=fs.readFileSync(new URL('../src/dengue/15-p0-22b2-case-read-integration.gs',import.meta.url),'utf8');
function instance(){
 const begin=source.indexOf('<script>'),end=source.indexOf('</script>',begin);
 assert.ok(begin>0&&end>begin);
 const context=vm.createContext({Promise,Date});
 vm.runInContext(source.slice(begin+8,end),context,{timeout:1000});
 return context.d331P023OfflineCaseWorkspace_;
}
const plain=v=>JSON.parse(JSON.stringify(v));
function fail(fn){assert.throws(fn,/D331_P023_SYNTHETIC_ONLY/);}
class FakeElement{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attrs={};this.listeners={};this.textContent='';this.disabled=false;}
 appendChild(el){this.children.push(el);return el;}
 replaceChildren(...x){this.children=x;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){this.listeners[k]=fn;}
 fire(k){if(this.listeners[k])this.listeners[k]();}
}
function ui(){
 const doc={createElement(t){return new FakeElement(t,doc);}};
 const root=new FakeElement('root',doc);
 function find(pred){
  const found=[];
  function visit(x){if(pred(x))found.push(x);for(const ch of x.children)visit(ch);}
  visit(root);return found;
 }
 return {root,find};
}
const controls=(u)=>u.find(n=>n.tagName==='button').map(x=>({label:x.textContent,disabled:x.disabled}));
const button=(u,label)=>u.find(x=>x.tagName==='button'&&x.textContent===label)[0];

test('P0-24 integration candidate remains unregistered; existing Records/Login/P0-20 stay operational',()=>{
 assert.doesNotMatch(native,/03m-client-d331-mvp01-offline/);
 assert.match(layout,/id="d331-p024-region"/);
 assert.match(layout,/id="page-records"/);
 assert.match(layout,/id="d331-p018-preview"/);
 assert.match(layout,/id="d331-p020-region"/);
 assert.match(reader,/D331_P022B2_ENABLED_ = false/);
 assert.match(reader,/D331_P022B2_REVOCATION_APPROVED_ = false/);
 assert.match(reader,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
 assert.doesNotMatch(layout,/id="page-dengue"/);
 const code=source.slice(source.indexOf('<script>')+8,source.indexOf('  function createRecordsBridge'));
 assert.doesNotMatch(code,/google\.script|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|allData|currentUser|saveRecord\s*\(|appendRow|setValues?\s*\(|setProperty\s*\(/i);
 assert.match(source,/UNREGISTERED Records integration candidate/);
});

test('P0-23 starts with only a fixed fake Event and synthetic case; no clinical verdict',()=>{
 const m=instance().createModel(),s=plain(m.snapshot());
 assert.equal(s.kind,'SYNTHETIC_ONLY');
 assert.equal(s.cases.length,1);
 assert.equal(s.cases[0].caseRevision,1);
 assert.equal(s.cases[0].classification,'SUSPECTED');
 assert.equal(s.eventId,'00000000-0000-4000-8000-000000002300');
 assert.equal(s.slaAssessment,'NOT_EVALUATED');
 assert.equal(s.clinicalPolicyApproved,false);
 assert.equal(s.canWrite,false);
 assert.equal(s.canEnable,false);
 assert.equal(s.busy,false);
 assert.equal(s.draft,null);
});

test('P0-23 synthetic add validates form and increases cases only in memory',async()=>{
 const m=instance().createModel();
 m.beginAdd();
 fail(()=>m.beginAdd());
 fail(()=>m.save());
 fail(()=>m.setField('personName','SOME PATIENT'));
 fail(()=>m.setField('classification','PRIVATE'));
 fail(()=>m.setField('onsetLocalDate','2026-02-30'));
 fail(()=>m.setField('onsetLocalDate','2026-13-01'));
 m.setField('classification','PROBABLE');
 m.setField('onsetLocalDate','2026-10-19');
 const first=m.save();
 assert.equal(m.snapshot().busy,true);
 const second=await m.save();
 assert.equal(second.status,'BUSY');
 assert.equal((await first).status,'SYNTHETIC_SAVED');
 const s=plain(m.snapshot());
 assert.equal(s.cases.length,2);
 assert.equal(s.cases[1].caseId,'00000000-0000-4000-8000-000000002302');
 assert.equal(s.cases[1].caseRevision,1);
 assert.equal(s.cases[1].classification,'PROBABLE');
 assert.equal(s.cases[1].onsetLocalDate,'2026-10-19');
 assert.equal(s.busy,false);
 assert.equal(s.draft,null);
});

test('P0-23 in-memory edits keep immutable CaseID and increase revision',async()=>{
 const m=instance().createModel();
 const original=m.snapshot().cases[0].caseId;
 m.beginEdit(original);
 fail(()=>m.beginEdit(original));
 fail(()=>m.setField('caseId','another'));
 m.setField('classification','CONFIRMED');
 const result=await m.save();
 assert.equal(result.status,'SYNTHETIC_SAVED');
 const after=m.snapshot().cases[0];
 assert.equal(after.caseId,original);
 assert.equal(after.caseRevision,2);
 assert.equal(after.classification,'CONFIRMED');
 assert.equal(after.caseStatus,'ACTIVE');
 fail(()=>m.beginEdit('00000000-0000-4000-8000-000000000001'));
});

test('P0-23 cancel and reset clear draft and all synthetic edits',async()=>{
 const m=instance().createModel();
 m.beginAdd();m.setField('onsetLocalDate','2026-10-19');
 m.cancel();assert.equal(m.snapshot().cases.length,1);
 m.beginAdd();m.setField('onsetLocalDate','2026-10-18');
 await m.save();
 assert.equal(m.snapshot().cases.length,2);
 m.reset();
 const s=m.snapshot();
 assert.equal(s.cases.length,1);
 assert.equal(s.cases[0].caseRevision,1);
 assert.equal(s.draft,null);
 assert.equal(s.busy,false);
});

test('P0-23 reset invalidates a pending local save and cannot repaint stale case',async()=>{
 const m=instance().createModel();
 m.beginAdd();m.setField('onsetLocalDate','2026-10-19');
 const old=m.save();
 m.reset();
 const result=await old;
 assert.equal(result.status,'STALE');
 assert.equal(m.snapshot().cases.length,1);
 assert.equal(m.snapshot().busy,false);
});

test('P0-23 synthetic UI mounts in an explicit supplied root only',async()=>{
 const ui1=ui(),w=instance();
 const handle=w.mount(ui1.root);
 assert.equal(ui1.root.children.length,1);
 assert.ok(ui1.find(x=>x.textContent.includes('ตัวอย่างเท่านั้น')).length);
 assert.equal(ui1.find(x=>x.attrs['aria-busy']==='false').length,1);
 assert.equal(ui1.find(x=>x.tagName==='table').length,1);
 assert.ok(button(ui1,'เพิ่ม Case ตัวอย่าง'));
 assert.ok(button(ui1,'แก้ไขตัวอย่าง'));
 assert.equal(ui1.find(x=>x.textContent.includes('NOT_EVALUATED')).length,1);
 button(ui1,'เพิ่ม Case ตัวอย่าง').fire('click');
 assert.ok(button(ui1,'บันทึกแบบจำลอง').disabled);
 const date=ui1.find(x=>x.tagName==='input'&&x.type==='date')[0];
 assert.ok(date);
 date.value='2026-10-19';date.fire('change');
 assert.equal(button(ui1,'บันทึกแบบจำลอง').disabled,false);
 button(ui1,'บันทึกแบบจำลอง').fire('click');
 assert.equal(handle.snapshot().busy,true);
 assert.equal(ui1.root.children[0].attrs['aria-busy'],'true');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(handle.snapshot().cases.length,2);
 assert.equal(handle.snapshot().canWrite,false);
 handle.dispose();
 assert.equal(ui1.root.children.length,0);
});

test('P0-23 UI disables double save and never uses remote storage or patient fields',()=>{
 const v=instance();
 fail(()=>v.mount(null));
 const model=v.createModel();
 assert.deepEqual(Object.keys(plain(model.snapshot())).sort(),
  ['busy','canEnable','canWrite','cases','clinicalPolicyApproved','draft',
   'eventId','eventLabel','kind','notice','slaAssessment'].sort());
 const labels=source;
 assert.doesNotMatch(labels,/PatientName|NationalID|CitizenID|PasswordHash|realData|realSession|Gemini|AIReporter|reportPatient/);
 assert.equal(controls(ui()).length,0);
});
