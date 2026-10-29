import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

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
  const doc={readyState:'loading',activeElement:null,createElement(tag){return new Element(tag,doc);}};
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

function nativeHarness(role='Admin'){
  const elements=new Map(),calls=[];
  // DOM boundary: attribute records arrive in a microtask, before toggle tasks.
  const observers=new Set();
  class MutationObserver {
    constructor(callback){this.callback=callback;this.records=[];this.target=null;this.scheduled=false;}
    observe(target,options){this.target=target;this.options=options;observers.add(this);}
    takeRecords(){return this.records.splice(0);}
    disconnect(){observers.delete(this);this.records=[];this.target=null;}
    enqueue(target,oldValue){
      if(this.target!==target||!this.options.attributes||
         !this.options.attributeFilter.includes('open'))return;
      this.records.push({type:'attributes',target,attributeName:'open',
        oldValue:this.options.attributeOldValue?oldValue:null});
      if(this.scheduled)return;
      this.scheduled=true;
      queueMicrotask(()=>{
        this.scheduled=false;const records=this.takeRecords();
        if(records.length)this.callback(records,this);
      });
    }
  }
  const doc={readyState:'loading',activeElement:null,createElement(tag){return new Element(tag,doc);},
    getElementById(id){
      if(!elements.has(id)){
        const node=new Element('div',doc);node.id=id;node.value='';node.style={};node.dataset={};
        node.classList={add(){},remove(){},toggle(){},contains(){return false;}};
        node.options=[];node.getAttribute=key=>node.attrs[key]||'';
        node.removeAttribute=key=>delete node.attrs[key];node.querySelector=()=>null;
        elements.set(id,node);
      }
      return elements.get(id);
    },querySelectorAll(){return[];},querySelector(){return null;},addEventListener(){},
    documentElement:{style:{setProperty(){}}}};
  const ctx=vm.createContext({Promise,Date,document:doc,console,MutationObserver,
    localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    setTimeout(){},clearTimeout(){},setInterval(){return 1;},clearInterval(){}});
  for(const {path,code} of readOrderedClientScripts()){
    const script=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(script,{filename:path}).runInContext(ctx,{timeout:2500});
  }
  const run=script=>vm.runInContext(script,ctx);
  ctx.gs=(...args)=>{calls.push(args);return Promise.resolve(null);};
  ctx.loadDashboard=async()=>{};ctx.destroyDashboardCharts=()=>{};ctx.toast=()=>{};
  run('token="TEST-NATIVE-SESSION";currentUser={role:'+JSON.stringify(role)+',name:"Synthetic",email:"test@example.invalid"};');
  const root=doc.getElementById('d331-p018-preview'),region=doc.getElementById('d331-p024-region');
  let opened=false;
  Object.defineProperty(root,'open',{get:()=>opened,set(value){
    const oldValue=opened?'':null;opened=!!value;
    if(!opened&&oldValue===null)return;
    for(const observer of observers)observer.enqueue(root,oldValue);
  }});
  root.open=false;region.hidden=true;
  function nodes(predicate){
    const found=[];function walk(n){if(predicate(n))found.push(n);n.children.forEach(walk);}walk(region);return found;
  }
  const button=label=>nodes(n=>n.tagName==='button'&&n.textContent===label)[0];
  const field=label=>nodes(n=>n.attrs['aria-label']===label)[0];
  const open=value=>{root.open=value;root.fire('toggle');};
  const text=()=>nodes(()=>true).map(n=>n.textContent).join(' ');
  const episode=value=>{const input=field('EpisodeKey จำลอง');input.value=value;input.fire('input');};
  return {ctx,run,doc,root,region,nodes,button,field,open,text,episode,calls};
}

test('P0-31B S3 coalesced disclosure close/reopen starts from a fresh seed without saved Plans',async()=>{
  const h=nativeHarness();h.run('renderTables()');h.open(true);await settle();
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-40');
  h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
  assert.match(h.text(),/TEST-EP-40/);
  const previous=h.region.children[0];
  h.root.open=false;h.root.open=true;
  await settle();h.root.fire('toggle');await settle();
  assert.notEqual(h.region.children[0],previous,'close/reopen creates a new workspace');
  assert.match(h.text(),/ยังไม่มี Plan ตัวอย่าง/);
  assert.doesNotMatch(h.text(),/TEST-EP-40/);
  assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children[0].children[1].textContent,'1');
  assert.equal(h.calls.length,0);
});

test('P0-31B S3 coalesced disclosure close/reopen denies queued Case and Plan before observer delivery',async()=>{
  for(const type of ['Case','Plan']){
    const h=nativeHarness();let controller;
    const bridge=h.ctx.d331P023OfflineCaseWorkspace_.createRecordsBridge({
      root:h.root,region:h.region,
      session:()=>h.run('({token,user:currentUser,allowed:!!token&&!!roleCanRecord()})'),
      mountView:(root,options)=>{controller=h.ctx.d331P023OfflineCaseWorkspace_.mountComposed(root,options);return controller;}
    });
    bridge.connect();h.open(true);await settle();
    if(type==='Plan'){
      h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-41');
    }else h.button('แก้ไขตัวอย่าง').fire('click');
    const previous=controller;
    const retained=h.button(type==='Plan'?'บันทึก Plan ตัวอย่าง':'บันทึกแบบจำลอง');
    retained.fire('click');h.root.open=false;h.root.open=true;
    assert.throws(()=>previous.snapshot(),/SYNTHETIC_ONLY/,'old state is invalid before queued observer or save work');
    await settle();h.root.fire('toggle');
    const fresh=h.region.children[0];retained.fire('click');await settle();
    assert.equal(h.region.children[0],fresh,'retained controls cannot repaint the new lifetime');
    assert.equal(controller.snapshot().plans.plans.length,0);
    assert.equal(controller.snapshot().cases.cases[0].caseRevision,1);
    assert.equal(h.calls.length,0);bridge.dispose();
  }
});

test('P0-31B S3 actual registered Records uses composed Plan flow only for existing authorized roles',async()=>{
  for(const role of ['Staff','Admin','Manager','Super Admin']){
    const h=nativeHarness(role);h.run('renderTables()');
    assert.equal(h.region.children.length,0,'no startup mount');
    h.open(true);
    if(role==='Staff'){
      assert.equal(h.region.children.length,0);assert.equal(h.root.open,false);continue;
    }
    assert.ok(h.button('สร้าง Plan ตัวอย่าง'));
    h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-21');
    assert.equal(h.doc.activeElement,h.field('EpisodeKey จำลอง'));
    h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
    assert.match(h.text(),/TEST-EP-21/);assert.match(h.text(),/OPEN/);
    assert.equal(h.nodes(n=>n.tagName==='tbody')[1].children.length,1);
    assert.equal(h.calls.length,0);
  }
  const guest=nativeHarness();guest.run('token="";currentUser=null;renderTables()');guest.open(true);
  assert.equal(guest.region.children.length,0);
});

test('P0-31B S3 auth reconciliation clears both drafts immediately and fences queued Case/Plan after identity or permission change',async()=>{
  for(const kind of ['token','token-return','account','account-return','userReplacement','userId','email','allowed-role','permission','loss-return']){
    for(const type of ['Case','Plan']){
      const h=nativeHarness();h.run('renderTables()');h.open(true);
      if(type==='Plan'){
        h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-22');
      }else{
        h.button('เพิ่ม Case ตัวอย่าง').fire('click');
        const date=h.field('วันที่เริ่มป่วยจำลอง');date.value='2026-10-22';date.fire('input');
      }
      const originalUser=h.run('currentUser'),originalToken=h.run('token');
      const oldSave=h.button(type==='Plan'?'บันทึก Plan ตัวอย่าง':'บันทึกแบบจำลอง');oldSave.fire('click');
      if(kind==='token'||kind==='token-return')h.run('token="TEST-NEW-TOKEN"');
      if(kind==='account'||kind==='account-return')h.run('currentUser={role:"Admin",name:"Different synthetic account"}');
      if(kind==='userId')h.run('currentUser.userId="TEST-OTHER-USER-ID"');
      if(kind==='email')h.run('currentUser.email="different@example.invalid"');
      if(kind==='allowed-role')h.run('currentUser.role="Manager"');
      if(kind==='userReplacement')h.run('currentUser={...currentUser}');
      if(kind==='permission'||kind==='loss-return')h.run('currentUser.role="Staff"');
      h.run('updateAuthBox()');
      assert.equal(h.region.children.length,0,kind+' '+type+' clears synchronously');
      assert.equal(h.root.open,false);
      if(kind==='token-return'){h.ctx.restoredToken=originalToken;h.run('token=restoredToken;updateAuthBox()');}
      if(kind==='account-return'){h.ctx.restoredUser=originalUser;h.run('currentUser=restoredUser;updateAuthBox()');}
      if(kind==='loss-return')h.run('currentUser.role="Admin";updateAuthBox()');
      if(kind==='permission')h.run('currentUser.role="Admin";updateAuthBox()');
      h.open(true);const fresh=h.region.children[0];
      oldSave.fire('click');await settle();
      assert.equal(h.region.children[0],fresh,kind+' old completion does not repaint');
      assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children.length,1);
      assert.equal(h.nodes(n=>n.tagName==='tbody').length,1);
      assert.doesNotMatch(h.text(),/TEST-EP-22/);
      assert.equal(h.calls.length,0);
    }
  }
});

test('P0-31B S3 precommit fence sees closed disclosure and unreconciled token or permission loss',async()=>{
  for(const kind of ['close','token','permission']){
    for(const type of ['Case','Plan']){
      const h=nativeHarness();h.run('renderTables()');h.open(true);
      if(type==='Plan'){
        h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-23');
      }else{
        h.button('แก้ไขตัวอย่าง').fire('click');
        const field=h.field('Classification จำลอง');field.value='CONFIRMED';field.fire('input');
      }
      h.button(type==='Plan'?'บันทึก Plan ตัวอย่าง':'บันทึกแบบจำลอง').fire('click');
      if(kind==='close')h.root.open=false;
      if(kind==='token'||kind==='token-return')h.run('token="TEST-CHANGED-WITHOUT-REFRESH"');
      if(kind==='permission')h.run('currentUser.role="Staff"');
      await settle();
      assert.equal(h.region.children.length,0,kind+' '+type+' must clear before commit');
      h.run('currentUser.role="Admin";updateAuthBox()');h.open(true);
      assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children[0].children[1].textContent,'1');
      assert.equal(h.nodes(n=>n.tagName==='tbody').length,1);
    }
  }
});

test('P0-31B S3 logout invalidates pending saves synchronously before its existing RPC completes',async()=>{
  for(const type of ['Case','Plan']){
    const h=nativeHarness();h.run('renderTables()');h.open(true);
    if(type==='Plan'){
      h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-24');
    }else h.button('แก้ไขตัวอย่าง').fire('click');
    const retained=h.button(type==='Plan'?'บันทึก Plan ตัวอย่าง':'บันทึกแบบจำลอง');retained.fire('click');
    const logout=h.run('doLogout()');
    assert.equal(h.region.children.length,0);assert.equal(h.root.open,false);
    h.run('token="TEST-NEXT-SESSION";currentUser={role:"Admin"};updateAuthBox()');
    h.open(true);const fresh=h.region.children[0];retained.fire('click');
    await settle();await logout;
    assert.equal(h.region.children[0],fresh);
    assert.equal(h.nodes(n=>n.tagName==='tbody').length,1);
    assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children[0].children[1].textContent,'1');
    assert.equal(h.calls.filter(args=>args[0]==='logout').length,1);
    assert.equal(h.calls.some(args=>/Dengue|Case|Plan/i.test(args[0])),false);
  }
});

test('P0-31B S3 filtering preserves draft and fields while close/reopen resets both models and rejects old handlers',async()=>{
  const h=nativeHarness();h.run('renderTables()');h.open(true);
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-25');
  const input=h.field('EpisodeKey จำลอง');
  h.root.open=true;await settle(); // Same-value attribute writes are not a close.
  h.run('el("recordSearch").value="synthetic filter";renderTables();resetRecordFilters();renderTables()');
  assert.equal(h.field('EpisodeKey จำลอง'),input);assert.equal(input.value,'TEST-EP-25');
  assert.equal(h.root.listeners.toggle.length,2,'one existing count-preview and one Case/Plan bridge listener');
  const save=h.button('บันทึก Plan ตัวอย่าง');save.fire('click');
  h.open(false);assert.equal(h.region.children.length,0);
  h.open(true);const fresh=h.region.children[0];save.fire('click');await settle();
  assert.equal(h.region.children[0],fresh);
  assert.match(h.text(),/ยังไม่มี Plan ตัวอย่าง/);
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-26');
  h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
  h.button('แก้ไขตัวอย่าง').fire('click');
  const classification=h.field('Classification จำลอง');classification.value='CONFIRMED';classification.fire('input');
  h.button('บันทึกแบบจำลอง').fire('click');await settle();
  assert.match(h.text(),/TEST-EP-26/,'ordinary Case edits retain Plan linkage');
  assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children[0].children[1].textContent,'2');
  h.button('ล้างตัวอย่าง').fire('click');assert.doesNotMatch(h.text(),/TEST-EP-26/);
  assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children[0].children[1].textContent,'1');
});

test('P0-31B S3 registered bridge disposes models before commit on observed synthetic context changes and return',async()=>{
  for(const type of ['Case','Plan']){
    for(const context of [null,'REAL-EVENT-IS-NOT-A-SYNTHETIC-CONTEXT','return']){
      const h=nativeHarness();let event=EVENT,controller;
      const bridge=h.ctx.d331P023OfflineCaseWorkspace_.createRecordsBridge({
        root:h.root,region:h.region,
        session:()=>({token:'TEST-SYNTHETIC-SESSION',user:h.ctx.syntheticUser,allowed:true}),
        syntheticEvent:()=>event,
        mountView:(root,options)=>{controller=h.ctx.d331P023OfflineCaseWorkspace_.mountComposed(root,options);return controller;}
      });
      h.ctx.syntheticUser={role:'Admin'};
      bridge.connect();h.open(true);
      const previous=controller;
      if(type==='Plan'){
        h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-27');
      }else h.button('แก้ไขตัวอย่าง').fire('click');
      const save=h.button(type==='Plan'?'บันทึก Plan ตัวอย่าง':'บันทึกแบบจำลอง');save.fire('click');
      event=context==='return'?'FOREIGN-SYNTHETIC-CONTEXT':context;
      if(context==='return'){bridge.reconcile();event=EVENT;}
      await settle();
      assert.equal(h.region.children.length,0);
      assert.throws(()=>previous.snapshot(),/SYNTHETIC_ONLY/,'disposed models cannot expose or resurrect old state');
      event=EVENT;h.open(true);const fresh=h.region.children[0];save.fire('click');previous.reset();previous.dispose();await settle();
      assert.equal(h.region.children[0],fresh);
      assert.equal(controller.snapshot().plans.plans.length,0);
      assert.equal(controller.snapshot().cases.cases[0].caseRevision,1);
      bridge.dispose();h.open(false);h.open(true);
      assert.equal(h.region.children.length,0,'disposed bridge listeners cannot remount');
    }
  }
});

test('P0-31B S3 actual Records reset during queued Case/Plan save invalidates reused seed identities and old buttons',async()=>{
  for(const type of ['Case','Plan']){
    const h=nativeHarness();h.run('renderTables()');h.open(true);
    if(type==='Plan'){
      h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-28');
    }else h.button('แก้ไขตัวอย่าง').fire('click');
    const save=h.button(type==='Plan'?'บันทึก Plan ตัวอย่าง':'บันทึกแบบจำลอง');save.fire('click');
    h.button('ล้างตัวอย่าง').fire('click');const fresh=h.region.children[0];
    save.fire('click');await settle();
    assert.equal(h.region.children[0],fresh);
    assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children[0].children[1].textContent,'1');
    assert.match(h.text(),/ยังไม่มี Plan ตัวอย่าง/);assert.doesNotMatch(h.text(),/TEST-EP-28/);
  }
});

test('P0-31B S3 Native Plan validation/cancel/duplicate/busy states retain bounded errors and accessible controls',async()=>{
  const h=nativeHarness();h.run('renderTables()');h.open(true);
  h.button('สร้าง Plan ตัวอย่าง').fire('click');
  assert.match(h.text(),new RegExp(EVENT));assert.match(h.text(),new RegExp(CASE));
  h.episode('PRIVATE INVALID CONTENT');
  assert.equal(h.button('บันทึก Plan ตัวอย่าง').disabled,true);
  assert.match(h.text(),/EpisodeKey ไม่ถูกต้อง/);assert.doesNotMatch(h.text(),/PRIVATE INVALID CONTENT/);
  h.button('ยกเลิก Plan').fire('click');
  assert.equal(h.doc.activeElement,h.button('สร้าง Plan ตัวอย่าง'));
  assert.match(h.text(),/ยังไม่มี Plan ตัวอย่าง/);
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-29');
  const save=h.button('บันทึก Plan ตัวอย่าง');save.fire('click');save.fire('click');
  assert.equal(h.region.children[0].attrs['aria-busy'],'true');
  assert.equal(h.button('เพิ่ม Case ตัวอย่าง').disabled,true);await settle();
  assert.equal(h.nodes(n=>n.tagName==='tbody')[1].children.length,1);
  h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-29');
  h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
  assert.equal(h.nodes(n=>n.tagName==='tbody')[1].children.length,1);
  assert.match(h.text(),/ไม่สามารถดำเนินการตัวอย่างได้/);
  assert.equal(h.nodes(n=>n.attrs.role==='status'&&n.attrs['aria-live']==='polite').length,1);
  assert.equal(h.calls.length,0);
});

test('P0-31B S3 registered session bridge disposes model snapshots synchronously before queued commit',async()=>{
  for(const type of ['Case','Plan']){
    const h=nativeHarness();let controller;
    const bridge=h.ctx.d331P023OfflineCaseWorkspace_.createRecordsBridge({
      root:h.root,region:h.region,
      session:()=>h.run('({token,user:currentUser,allowed:!!token&&!!roleCanRecord()})'),
      mountView:(root,options)=>{controller=h.ctx.d331P023OfflineCaseWorkspace_.mountComposed(root,options);return controller;}
    });
    bridge.connect();h.open(true);
    h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-30');
    h.button('บันทึก Plan ตัวอย่าง').fire('click');await settle();
    assert.equal(controller.snapshot().plans.plans.length,1);
    if(type==='Case')h.button('แก้ไขตัวอย่าง').fire('click');
    else {h.button('สร้าง Plan ตัวอย่าง').fire('click');h.episode('TEST-EP-31');}
    h.button(type==='Case'?'บันทึกแบบจำลอง':'บันทึก Plan ตัวอย่าง').fire('click');
    const previous=controller;
    h.run('currentUser.role="Staff"');bridge.reconcile();
    assert.throws(()=>previous.snapshot(),/SYNTHETIC_ONLY/,'state is disposed synchronously, not only hidden');
    h.run('currentUser.role="Admin"');h.open(true);await settle();
    assert.equal(controller.snapshot().plans.plans.length,0);
    assert.equal(controller.snapshot().cases.cases[0].caseRevision,1);
  }
});
