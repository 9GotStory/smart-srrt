import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const EVENT='00000000-0000-4000-8000-000000002300';
const CASE='00000000-0000-4000-8000-000000002301';
class Element {
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];
    this.textContent='';this.attrs={};this.listeners={};this.disabled=false;}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  fire(name){for(const fn of this.listeners[name]??[])fn();}
  focus(){this.ownerDocument.activeElement=this;}
}
function harness(){
  const doc={activeElement:null,createElement(tag){return new Element(tag,doc);}};
  const root=new Element('div',doc),ctx=vm.createContext({Promise,Date});
  for(const path of ['03m-client-d331-mvp01-offline.html','03n-client-d331-case-plan-offline.html']){
    const script=read('src/web/'+path).match(/<script>\n([\s\S]*?)\n<\/script>/)[1];
    new vm.Script(script).runInContext(ctx);
  }
  const state={valid:true,event:EVENT};
  const options={isValid:()=>state.valid,syntheticEvent:()=>state.event};
  const mount=()=>ctx.d331P023OfflineCaseWorkspace_.mountComposed(root,options);
  const controller=mount();
  function nodes(predicate){
    const found=[];function walk(n){if(predicate(n))found.push(n);n.children.forEach(walk);}walk(root);return found;
  }
  const button=label=>nodes(n=>n.tagName==='button'&&n.textContent===label)[0];
  const field=label=>nodes(n=>n.attrs['aria-label']===label)[0];
  const text=()=>nodes(()=>true).map(n=>n.textContent).join(' ');
  function episode(value){const input=field('EpisodeKey จำลอง');input.value=value;input.fire('change');}
  return {root,doc,ctx,state,mount,controller,nodes,button,field,text,episode};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('P0-31B supplied offline UI selects a synthetic Case, cancels and saves a bounded Plan',async()=>{
  const h=harness();
  assert.match(h.text(),/ยังไม่มี Plan ตัวอย่าง/);
  assert.match(h.text(),/D331 OFF/);
  h.button('สร้าง Plan ตัวอย่าง').fire('click');
  assert.equal(h.controller.snapshot().plans.draft.triggerCaseId,CASE);
  assert.match(h.text(),new RegExp(EVENT));
  assert.match(h.text(),new RegExp(CASE));
  assert.equal(h.doc.activeElement,h.field('EpisodeKey จำลอง'));
  h.button('ยกเลิก Plan').fire('click');
  assert.equal(h.controller.snapshot().plans.plans.length,0);
  assert.equal(h.doc.activeElement,h.button('สร้าง Plan ตัวอย่าง'));
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-1');
  const save=h.button('บันทึก Plan ตัวอย่าง');save.fire('click');save.fire('click');
  assert.equal(h.controller.snapshot().plans.busy,true);
  assert.equal(h.root.children[0].attrs['aria-busy'],'true');
  await settle();
  const saved=h.controller.snapshot().plans.plans;
  assert.equal(saved.length,1);assert.equal(saved[0].eventId,EVENT);
  assert.equal(saved[0].triggerCaseId,CASE);assert.equal(saved[0].planStatus,'OPEN');
  assert.equal(saved[0].planRevision,1);
  assert.match(h.text(),/TEST-EP-1/);
  assert.equal(h.doc.activeElement,h.button('สร้าง Plan ตัวอย่าง'));
});

test('P0-31B reset while Plan save is queued leaves a fresh seed and ignores retained handlers',async()=>{
  const h=harness();
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-2');
  const save=h.button('บันทึก Plan ตัวอย่าง');save.fire('click');
  h.controller.reset();
  const fresh=h.root.children[0];save.fire('click');
  await settle();
  assert.equal(h.root.children[0],fresh,'old completion must not repaint fresh lifetime');
  assert.equal(h.controller.snapshot().plans.plans.length,0);
  assert.equal(h.controller.snapshot().plans.draft,null);
  assert.equal(h.controller.snapshot().cases.cases[0].caseRevision,1);
});

test('P0-31B invalid context, validity loss and change-return deny queued commits and old mounts',async()=>{
  for(const kind of ['invalid','foreign','permission','return','dispose']){
    const h=harness();
    h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-3');
    const retained=h.button('บันทึก Plan ตัวอย่าง');retained.fire('click');
    if(kind==='dispose')h.controller.dispose();
    else if(kind==='permission')h.state.valid=false;
    else h.state.event=kind==='invalid'?null:'00000000-0000-4000-8000-000000002399';
    if(kind==='return'){
      h.controller.refresh();h.state.event=EVENT;
    }
    await settle();
    assert.equal(h.root.children.length,0,kind);
    assert.throws(()=>h.controller.snapshot(),/SYNTHETIC_ONLY/,kind);
    h.state.valid=true;h.state.event=EVENT;
    const next=h.mount(),fresh=h.root.children[0];
    retained.fire('click');h.controller.reset();h.controller.dispose();
    await settle();
    assert.equal(h.root.children[0],fresh,kind);
    assert.equal(next.snapshot().plans.plans.length,0,kind);
  }
});

test('P0-31B Case queued save also checks validity before commit and never repaints a reset mount',async()=>{
  for(const action of ['reset','invalid','dispose']){
    const h=harness();h.button('เพิ่ม Case ตัวอย่าง').fire('click');
    const date=h.field('วันที่เริ่มป่วยจำลอง');date.value='2026-10-20';date.fire('change');
    h.button('บันทึกแบบจำลอง').fire('click');
    if(action==='reset')h.controller.reset();
    if(action==='invalid')h.state.valid=false;
    if(action==='dispose')h.controller.dispose();
    const fresh=h.root.children[0];await settle();
    if(action==='reset'){
      assert.equal(h.root.children[0],fresh);
      assert.equal(h.controller.snapshot().cases.cases.length,1);
    }else assert.equal(h.root.children.length,0);
  }
});

test('P0-31B remounting the same supplied root fences its previous queued save and handlers',async()=>{
  const h=harness();h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-4');
  const retained=h.button('บันทึก Plan ตัวอย่าง');retained.fire('click');
  const next=h.mount(),fresh=h.root.children[0];
  retained.fire('click');await settle();
  assert.equal(h.root.children[0],fresh);
  assert.equal(next.snapshot().plans.plans.length,0);
  assert.throws(()=>h.controller.snapshot(),/SYNTHETIC_ONLY/);
});

test('P0-31B Case UI retains add/edit/cancel, prevents overlapping drafts and safely resets queued Case work',async()=>{
  const h=harness();const original=h.controller.snapshot().cases.cases[0].caseId;
  h.button('เพิ่ม Case ตัวอย่าง').fire('click');
  assert.equal(h.button('สร้าง Plan ตัวอย่าง').disabled,true);
  h.button('ยกเลิก').fire('click');
  assert.equal(h.controller.snapshot().cases.cases.length,1);
  h.button('เพิ่ม Case ตัวอย่าง').fire('click');
  const date=h.field('วันที่เริ่มป่วยจำลอง');date.value='2026-10-21';date.fire('change');
  h.button('บันทึกแบบจำลอง').fire('click');await settle();
  assert.equal(h.controller.snapshot().cases.cases.length,2);
  h.button('แก้ไขตัวอย่าง').fire('click');
  const select=h.field('Classification จำลอง');select.value='CONFIRMED';select.fire('change');
  h.button('บันทึกแบบจำลอง').fire('click');await settle();
  const saved=h.controller.snapshot().cases.cases[0];
  assert.equal(saved.caseId,original);assert.equal(saved.caseRevision,2);
  assert.equal(saved.classification,'CONFIRMED');
  h.button('สร้าง Plan ตัวอย่าง').fire('click');
  assert.equal(h.button('เพิ่ม Case ตัวอย่าง').disabled,true);
  assert.equal(h.button('แก้ไขตัวอย่าง').disabled,true);
  h.button('ยกเลิก Plan').fire('click');
  h.button('แก้ไขตัวอย่าง').fire('click');h.button('บันทึกแบบจำลอง').fire('click');
  assert.ok(h.button('ล้างตัวอย่าง'),'safe reset remains reachable during queued Case work');
  h.button('ล้างตัวอย่าง').fire('click');const fresh=h.root.children[0];await settle();
  assert.equal(h.root.children[0],fresh);
  assert.equal(h.controller.snapshot().cases.cases.length,1);
  assert.equal(h.controller.snapshot().cases.cases[0].caseRevision,1);
});

test('P0-31B UI errors are bounded, duplicate save adds nothing, and model snapshots copy out',async()=>{
  const h=harness();h.button('สร้าง Plan ตัวอย่าง').fire('click');
  h.episode('private payload');
  assert.match(h.text(),/EpisodeKey ไม่ถูกต้อง/);assert.doesNotMatch(h.text(),/private payload/);
  assert.equal(h.button('บันทึก Plan ตัวอย่าง').disabled,true);
  h.episode('TEST-EP-9');h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
  const snapshot=h.controller.snapshot();snapshot.cases.cases[0].classification='UNKNOWN';
  snapshot.plans.plans[0].episodeKey='tampered';
  assert.equal(h.controller.snapshot().cases.cases[0].classification,'SUSPECTED');
  assert.equal(h.controller.snapshot().plans.plans[0].episodeKey,'TEST-EP-9');
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-9');
  h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
  assert.equal(h.controller.snapshot().plans.plans.length,1);
  assert.match(h.text(),/ไม่สามารถดำเนินการตัวอย่างได้/);
  assert.equal(h.nodes(n=>n.attrs.role==='status'&&n.attrs['aria-live']==='polite').length,1);
  for(const state of [h.controller.snapshot().cases,h.controller.snapshot().plans]){
    assert.equal(state.canEnable,false);assert.equal(state.canWrite,false);
    assert.equal(state.clinicalPolicyApproved,false);assert.equal(state.slaAssessment,'NOT_EVALUATED');
  }
  assert.equal(h.controller.snapshot().plans.canReadPatientData,false);
  assert.ok(h.nodes(n=>n.className==='srrt-d331-p023__table').length>=2);
});

test('P0-31B cancelling a Plan returns keyboard focus to its selected Case action',async()=>{
  const h=harness();h.button('เพิ่ม Case ตัวอย่าง').fire('click');
  const date=h.field('วันที่เริ่มป่วยจำลอง');date.value='2026-10-22';date.fire('change');
  h.button('บันทึกแบบจำลอง').fire('click');await settle();
  const actions=()=>h.nodes(n=>n.tagName==='button'&&n.textContent==='สร้าง Plan ตัวอย่าง');
  actions()[1].fire('click');
  assert.equal(h.controller.snapshot().plans.draft.triggerCaseId,'00000000-0000-4000-8000-000000002302');
  h.button('ยกเลิก Plan').fire('click');
  assert.equal(h.doc.activeElement,actions()[1]);
});

test('P0-31B typing and blur preserve the original Episode field and Save/Cancel click targets',async()=>{
  for(const action of ['save','cancel']){
    const h=harness();h.button('สร้าง Plan ตัวอย่าง').fire('click');
    const input=h.field('EpisodeKey จำลอง');
    const save=h.button('บันทึก Plan ตัวอย่าง'),cancel=h.button('ยกเลิก Plan');
    input.value='TEST-EP-11';input.fire('input');
    assert.equal(save.disabled,false,'typing a valid Episode enables the original Save before blur');
    assert.equal(h.field('EpisodeKey จำลอง'),input);
    const target=action==='save'?save:cancel;target.focus();input.fire('change');
    assert.equal(h.doc.activeElement,target,'blur must not steal keyboard focus');
    assert.equal(h.button('บันทึก Plan ตัวอย่าง'),save);
    assert.equal(h.button('ยกเลิก Plan'),cancel);
    target.fire('click');await settle();
    assert.equal(h.controller.snapshot().plans.draft,null);
    assert.equal(h.controller.snapshot().plans.plans.length,action==='save'?1:0);
  }
});

test('P0-31B Case date and classification edits preserve keyboard focus and original click controls',async()=>{
  for(const field of ['date','classification']){
    for(const action of ['save','cancel']){
      const h=harness();h.button('แก้ไขตัวอย่าง').fire('click');
      const input=h.field(field==='date'?'วันที่เริ่มป่วยจำลอง':'Classification จำลอง');
      const save=h.button('บันทึกแบบจำลอง'),cancel=h.button('ยกเลิก');
      input.value=field==='date'?'2026-10-22':'CONFIRMED';input.fire('input');
      const target=action==='save'?save:cancel;target.focus();input.fire('change');
      assert.equal(h.doc.activeElement,target,'Case field change must preserve Tab/click focus');
      assert.equal(h.field(field==='date'?'วันที่เริ่มป่วยจำลอง':'Classification จำลอง'),input);
      assert.equal(h.button('บันทึกแบบจำลอง'),save);
      assert.equal(h.button('ยกเลิก'),cancel);
      target.fire('click');await settle();
      const state=h.controller.snapshot().cases;
      assert.equal(state.draft,null);
      assert.equal(state.cases[0].caseRevision,action==='save'?2:1);
      if(action==='save')assert.equal(state.cases[0][field==='date'?'onsetLocalDate':'classification'],input.value);
    }
  }
  const h=harness();h.button('เพิ่ม Case ตัวอย่าง').fire('click');
  const input=h.field('วันที่เริ่มป่วยจำลอง'),save=h.button('บันทึกแบบจำลอง');
  input.value='2026-10-22';input.fire('input');
  assert.equal(save.disabled,false,'Case date input enables Save before blur');
});

test('P0-31B invalid visible edits disable Save without replacing fields or saving an earlier valid value',async()=>{
  const h=harness();h.button('สร้าง Plan ตัวอย่าง').fire('click');
  const episode=h.field('EpisodeKey จำลอง'),save=h.button('บันทึก Plan ตัวอย่าง');
  episode.value='TEST-EP-12';episode.fire('input');assert.equal(save.disabled,false);
  episode.value='private invalid payload';episode.fire('input');
  assert.equal(h.field('EpisodeKey จำลอง'),episode);
  assert.equal(episode.value,'private invalid payload');assert.equal(save.disabled,true);
  assert.equal(episode.attrs['aria-invalid'],'true');
  assert.doesNotMatch(h.text(),/private invalid payload/);
  save.fire('click');await settle();assert.equal(h.controller.snapshot().plans.plans.length,0);
  episode.value='TEST-';episode.fire('input');assert.equal(save.disabled,true);
  episode.value='TEST-EP-13';episode.fire('input');assert.equal(save.disabled,false);
  save.focus();episode.fire('change');save.fire('click');await settle();
  assert.equal(h.controller.snapshot().plans.plans[0].episodeKey,'TEST-EP-13');
  for(const field of ['วันที่เริ่มป่วยจำลอง','Classification จำลอง']){
    h.button('แก้ไขตัวอย่าง').fire('click');
    const input=h.field(field),caseSave=h.button('บันทึกแบบจำลอง');
    input.value='invalid private value';input.fire('input');
    assert.equal(caseSave.disabled,true);assert.equal(h.field(field),input);
    assert.doesNotMatch(h.text(),/invalid private value/);
    caseSave.fire('click');await settle();
    assert.equal(h.controller.snapshot().cases.cases[0].caseRevision,1);
    h.button('ยกเลิก').fire('click');
  }
});
