import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const EVENT='e1111111-1111-4111-8111-111111111111';
const OTHER='e2222222-2222-4222-8222-222222222222';
const CASE='a1111111-1111-4111-8111-111111111111';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
class Element {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];
  this.attrs={};this.listeners={};this.textContent='';this.hidden=true;this.disabled=false;
  this.style={};this.value='';this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 appendChild(n){this.children.push(n);return n;}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k]??null;}
 removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x!==fn);}
 fire(k){for(const fn of this.listeners[k]||[])fn();}
 focus(){this.ownerDocument.activeElement=this;}
}
function harness({enabled=false,write=false,role='Admin'}={}){
 const elements=new Map(),requests=[],observers=new Set();
 const doc={readyState:'loading',activeElement:null,
  createElement:tag=>new Element(tag,doc),
  getElementById(id){if(!elements.has(id))elements.set(id,new Element('div',doc));return elements.get(id);},
  querySelectorAll(){return[];},querySelector(){return null;},addEventListener(){},
  documentElement:{style:{setProperty(){}}}};
 class MutationObserver {
  constructor(fn){this.fn=fn;this.records=[];observers.add(this);}
  observe(target){this.target=target;}
  takeRecords(){const a=this.records;this.records=[];return a;}
  disconnect(){this.target=null;this.records=[];observers.delete(this);}
  enqueue(target,oldValue){if(this.target!==target)return;this.records.push({target,oldValue,attributeName:'open'});
   queueMicrotask(()=>{if(this.records.length)this.fn(this.takeRecords());});}
 }
 const root=doc.getElementById('d331-f02-region');let opened=false;
 Object.defineProperty(root,'open',{get:()=>opened,set(value){
  const before=opened;opened=!!value;
  if(before!==opened)for(const o of observers)o.enqueue(root,before?'':null);
 }});
 const ctx=vm.createContext({document:doc,Promise,Date,MutationObserver,crypto:{randomUUID:()=>CASE},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  setTimeout(){},clearTimeout(){},setInterval(){return 1;},clearInterval(){}});
 for(const {path,code} of readOrderedClientScripts())
  new vm.Script(path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path}).runInContext(ctx);
 const run=code=>vm.runInContext(code,ctx);
 ctx.gs=(...args)=>new Promise((resolve,reject)=>requests.push({args,resolve,reject}));
 ctx.toast=()=>{};ctx.loadDashboard=async()=>{};ctx.destroyDashboardCharts=()=>{};
 run('token="SYNTHETIC_SESSION";currentUser={userId:"user-1",role:'+JSON.stringify(role)+',email:"test@example.invalid"};');
 run('allData='+JSON.stringify([
  {eventId:EVENT,revision:3,recordStatus:'active'},
  {eventId:OTHER,revision:2,recordStatus:'active'}])+ ';');
 if(enabled)run('D331_F02_CASE_READ_AVAILABLE_=true;');
 if(write)run('D331_F02_CASE_WRITE_AVAILABLE_=true;'); // isolated source flag, never an RPC argument
 const api=()=>ctx.d331F02CaseRead_;
 const writer=()=>ctx.d331F02CaseWrite_;
 const writeRoot=doc.getElementById('d331-f02-write-region');
 function walk(n){return [n,...n.children.flatMap(walk)];}
 const button=label=>walk(writeRoot).find(n=>n.tagName==='button'&&n.textContent===label);
 const input=id=>walk(writeRoot).find(n=>n.id===id);
 const click=label=>{const b=button(label);assert.ok(b,label);assert.equal(b.disabled,false,label);b.fire('click');};
 const fill=(id,value)=>{const n=input(id);assert.ok(n,id);n.value=value;n.fire('input');};
 const text=()=>{const a=[];function walk(n){a.push(n.textContent);n.children.forEach(walk);}walk(root);return a.join('|');};
 const open=id=>api().select(id);
 const snapshot=()=>JSON.parse(JSON.stringify(api().snapshot()));
 return {ctx,doc,root,requests,run,api,open,text,snapshot,writer,writeRoot,button,input,click,fill};
}
function dto(overrides={}){return {contractVersion:'D331_CASE_LIST_V1',status:'READ_ONLY',
 eventId:EVENT,revision:3,areaId:'area-A',
 cases:[{caseId:CASE,caseRevision:1,caseStatus:'ACTIVE'}],
 slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,canWrite:false,canEnable:false,...overrides};}


async function ready(h){h.open(EVENT);h.requests[0].resolve(dto());await settle();}
function writeDto(more={}){return {contractVersion:'D331_CASE_WRITE_V1',eventId:EVENT,requestId:CASE,
 status:'CREATED',caseId:OTHER,revision:1,...more};}
function writeText(h){function walk(n){return [n.textContent,...n.children.flatMap(walk)];}return walk(h.writeRoot).join('|');}

test('F02-W default stays unavailable and never dispatches write/status',async()=>{
 const h=harness({enabled:true});await ready(h);
 assert.equal(typeof h.writer(),'object');
 assert.equal(h.writeRoot.hidden,true);assert.equal(h.requests.length,1);
 h.run('updateAuthBox();renderTables();');assert.equal(h.requests.length,1);
});
test('F02-W actual create form dispatches one immutable request and shows only its receipt',async()=>{
 const h=harness({enabled:true,write:true});await ready(h);
 h.click('เพิ่ม Case');h.fill('d331-f02-Classification','SUSPECTED');
 h.fill('d331-f02-ReportingUnit','SYNTHETIC_UNIT');
 h.click('บันทึก Case');
 assert.equal(h.requests.length,2);
 assert.deepEqual(JSON.parse(JSON.stringify(h.requests[1].args)),['saveDengueCase','SYNTHETIC_SESSION',EVENT,{
  mode:'create',requestId:CASE,expectedEventRevision:3,
  payload:{Classification:'SUSPECTED',OnsetLocalDate:'',ReportingUnit:'SYNTHETIC_UNIT',ReceivingUnit:''}}]);
 assert.equal(h.button('บันทึก Case').disabled,true);
 h.requests[1].resolve(writeDto());await settle();
 assert.match(writeText(h),/ยืนยันการบันทึก/);assert.match(writeText(h),new RegExp(OTHER));
 assert.equal(h.snapshot().cases.length,1);assert.equal(h.snapshot().cases[0].caseId,CASE);
 h.click('อ่านรายการ Case ใหม่');assert.equal(h.requests[2].args[0],'listDengueCasesForEvent');
});

test('F02-W explicit PATCH omits untouched fields and blank optional clears need confirmation',async()=>{
 const h=harness({enabled:true,write:true});await ready(h);
 h.click('แก้ไข Case '+CASE);assert.equal(h.button('บันทึก Case').disabled,true);
 const choose=h.input('d331-f02-select-ReportingUnit');choose.checked=true;choose.fire('change');
 assert.equal(h.button('บันทึก Case').disabled,true);
 h.input('d331-f02-confirm-clear').checked=true;h.input('d331-f02-confirm-clear').fire('change');
 h.click('บันทึก Case');
 assert.deepEqual(JSON.parse(JSON.stringify(h.requests[1].args[3])),{
  mode:'update',requestId:CASE,expectedEventRevision:3,payload:{ReportingUnit:''},entityId:CASE,expectedEntityRevision:1});
 h.requests[1].resolve(writeDto({status:'UPDATED',caseId:CASE,revision:2}));await settle();
 assert.match(writeText(h),/Revision 2/);
});
test('F02-W cancelled draft allocates no request and does not overwrite optional fields',async()=>{
 const h=harness({enabled:true,write:true});let uuids=0;h.ctx.crypto.randomUUID=()=>{uuids++;return CASE;};
 await ready(h);h.click('เพิ่ม Case');h.fill('d331-f02-Classification','SUSPECTED');
 h.click('ยกเลิก');assert.equal(h.requests.length,1);assert.equal(uuids,0);
 h.click('แก้ไข Case '+CASE);const choose=h.input('d331-f02-select-Classification');
 choose.checked=true;choose.fire('change');h.fill('d331-f02-Classification','PROBABLE');h.click('บันทึก Case');
 assert.deepEqual(JSON.parse(JSON.stringify(h.requests[1].args[3].payload)),{Classification:'PROBABLE'});
});
test('F02-W unknown transport and NOT_FOUND/PENDING/denial never unlock or retry a mutation',async()=>{
 const h=harness({enabled:true,write:true});await ready(h);
 h.click('เพิ่ม Case');h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');
 h.requests[1].reject(new Error('PRIVATE_SENTINEL'));await settle();
 assert.match(writeText(h),/ยังไม่ทราบผล/);assert.doesNotMatch(writeText(h),/PRIVATE_SENTINEL/);
 for(const status of ['NOT_FOUND','PENDING','UNKNOWN','DENIED']){
  h.click('ตรวจสอบสถานะคำขอ');const req=h.requests.at(-1);
  assert.deepEqual(req.args,['getDengueCaseWriteStatus','SYNTHETIC_SESSION',EVENT,CASE]);
  if(status==='DENIED')req.reject(Error('PRIVATE_SENTINEL'));
  else req.resolve({contractVersion:'D331_CASE_WRITE_RECEIPT_V1',eventId:EVENT,requestId:CASE,status});
  await settle();assert.equal(h.button('เพิ่ม Case'),undefined);assert.match(writeText(h),/ยังไม่ทราบผล/);
 }
 h.click('ตรวจสอบสถานะคำขอ');h.requests.at(-1).resolve({contractVersion:'D331_CASE_WRITE_RECEIPT_V1',
  eventId:EVENT,requestId:CASE,status:'COMMITTED',caseId:OTHER});await settle();
 assert.match(writeText(h),/ยืนยันการบันทึก/);assert.doesNotMatch(writeText(h),/Revision \d/);
 assert.equal(h.requests.filter(r=>r.args[0]==='saveDengueCase').length,1);
});
test('F02-W replay never guesses a revision; malformed receipts preserve unknown',async()=>{
 for(const value of [writeDto({status:'REPLAYED',revision:undefined}),writeDto({status:'REPLAYED'}),
  writeDto({revision:0}),writeDto({revision:2}),writeDto({eventId:OTHER}),writeDto({requestId:OTHER}),
  writeDto({caseId:'<PRIVATE_SENTINEL>'}),writeDto({patient:'PRIVATE_SENTINEL'}),writeDto({status:'COMMITTED'}),null]){
  // JSON transport omits undefined, just like actual GAS results.
  const wire=JSON.parse(JSON.stringify(value));
  const h=harness({enabled:true,write:true});await ready(h);
  h.click('เพิ่ม Case');h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');
  h.requests[1].resolve(wire);await settle();
  if(wire&&wire.status==='REPLAYED'&&!Object.hasOwn(wire,'revision')){
   assert.match(writeText(h),/ยืนยันการบันทึก/);assert.doesNotMatch(writeText(h),/Revision \d/);
  }else assert.match(writeText(h),/ยังไม่ทราบผล/);
  assert.doesNotMatch(writeText(h),/PRIVATE_SENTINEL/);
 }
});
test('F02-W stale draft controls cannot alter or submit a newer form',async()=>{
 const h=harness({enabled:true,write:true});await ready(h);h.click('เพิ่ม Case');
 const oldInput=h.input('d331-f02-Classification'),oldSave=h.button('บันทึก Case');
 h.click('ยกเลิก');h.click('เพิ่ม Case');
 oldInput.value='CONFIRMED';oldInput.fire('input');oldSave.fire('click');
 assert.equal(h.requests.length,1);assert.equal(h.button('บันทึก Case').disabled,true);
});
test('F02-W context changes fence late completion and keep uncertain Event blocked on return',async()=>{
 for(const change of ['token="OTHER_SESSION"','currentUser={...currentUser}',
  'currentUser.role="Staff"','currentUser.userId="user-2"',
  'allData[0].revision=4','allData[0].recordStatus="closed"']){
  const h=harness({enabled:true,write:true});await ready(h);h.click('เพิ่ม Case');
  h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');
  h.run(change+';updateAuthBox();renderTables();');
  assert.equal(h.writeRoot.hidden,true,change);
  h.requests[1].resolve(writeDto());await settle();assert.equal(h.writeRoot.hidden,true,change);
 }
 const h=harness({enabled:true,write:true});await ready(h);h.click('เพิ่ม Case');
 h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');
 h.open(OTHER);h.open(EVENT);h.requests[1].resolve(writeDto());
 h.requests.at(-1).resolve(dto());await settle();
 assert.match(writeText(h),/ยังไม่ทราบผล/);assert.equal(h.button('เพิ่ม Case'),undefined);
});

test('F02-W coalesced close/reopen, dispose and logout clear drafts and fence outstanding writes',async()=>{
 for(const close of [h=>{h.root.open=false;h.root.open=true;h.run('renderTables()');},
  h=>h.api().dispose(),h=>h.run('doLogout()')]){
  const h=harness({enabled:true,write:true});await ready(h);h.click('เพิ่ม Case');
  h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');close(h);
  assert.equal(h.writeRoot.hidden,true);
  h.requests[1].resolve(writeDto());await settle();assert.equal(h.writeRoot.hidden,true);
 }
});
test('F02-W detached write region, invalid values and unavailable UUID source dispatch nothing',async()=>{
 const h=harness({enabled:true,write:true});await ready(h);h.click('เพิ่ม Case');
 for(const classification of ['','INVALID','<script>']){
  h.fill('d331-f02-Classification',classification);assert.equal(h.button('บันทึก Case').disabled,true);
 }
 h.fill('d331-f02-Classification','SUSPECTED');
 for(const value of ['=1+1','-1+1',' x','x'.repeat(257)]){
  h.fill('d331-f02-ReportingUnit',value);assert.equal(h.button('บันทึก Case').disabled,true);
 }
 h.fill('d331-f02-ReportingUnit','');h.fill('d331-f02-OnsetLocalDate','2026-02-30');
 assert.equal(h.button('บันทึก Case').disabled,true);h.fill('d331-f02-OnsetLocalDate','');
 h.ctx.crypto.randomUUID=()=>{throw Error('PRIVATE_SENTINEL');};h.click('บันทึก Case');
 assert.equal(h.requests.length,1);assert.doesNotMatch(writeText(h),/PRIVATE_SENTINEL/);
 h.writeRoot.isConnected=false;h.button('บันทึก Case').fire('click');assert.equal(h.requests.length,1);
 assert.equal(h.writeRoot.hidden,true);
});

test('F02-W public user profiles without internal IDs never expose another account request reference',async()=>{
 const h=harness({enabled:true,write:true});h.run('delete currentUser.userId;');await ready(h);
 h.click('เพิ่ม Case');h.fill('d331-f02-Classification','SUSPECTED');h.click('บันทึก Case');
 h.requests[1].reject(Error());await settle();
 h.run('currentUser={email:"other@example.invalid",role:"Admin"};updateAuthBox();');
 h.open(EVENT);h.requests.at(-1).resolve(dto());await settle();
 assert.equal(h.button('ตรวจสอบสถานะคำขอ'),undefined);
 assert.doesNotMatch(writeText(h),new RegExp('คำขอ '+CASE));
 assert.match(writeText(h),/ยังไม่ทราบผล/);
});

test('F02-W focus stays on a usable edit selector and moves to receipt status after save',async()=>{
 const h=harness({enabled:true,write:true});await ready(h);h.click('แก้ไข Case '+CASE);
 assert.equal(h.doc.activeElement,h.input('d331-f02-select-Classification'));
 const choose=h.input('d331-f02-select-Classification');choose.checked=true;choose.fire('change');
 h.fill('d331-f02-Classification','PROBABLE');h.click('บันทึก Case');
 assert.equal(h.doc.activeElement.getAttribute('role'),'status');
 h.requests[1].resolve(writeDto({status:'UPDATED',caseId:CASE,revision:2}));await settle();
 assert.equal(h.doc.activeElement.getAttribute('role'),'status');
 assert.match(h.doc.activeElement.textContent,/ยืนยันการบันทึก/);
});
