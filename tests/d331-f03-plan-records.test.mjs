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
 function disclosure(root){let opened=false;
 Object.defineProperty(root,'open',{get:()=>opened,set(value){
  const before=opened;opened=!!value;
  if(before!==opened)for(const o of observers)o.enqueue(root,before?'':null);
 }});return root;}
 const root=disclosure(doc.getElementById('d331-f02-region'));
 const planRoot=disclosure(doc.getElementById('d331-f03-region'));
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
 return {ctx,doc,root,planRoot,requests,run,api,open,text,snapshot,writer,writeRoot,button,input,click,fill};
}
function dto(overrides={}){return {contractVersion:'D331_CASE_LIST_V1',status:'READ_ONLY',
 eventId:EVENT,revision:3,areaId:'area-A',
 cases:[{caseId:CASE,caseRevision:1,caseStatus:'ACTIVE'}],
 slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,canWrite:false,canEnable:false,...overrides};}



const PLAN='b1111111-1111-4111-8111-111111111111';
function walk(n){return [n,...n.children.flatMap(walk)];}
function ptext(h){return walk(h.planRoot).map(n=>n.textContent).join('|');}
function pbutton(h,label){return walk(h.planRoot).find(n=>n.tagName==='button'&&n.textContent===label);}
function pclick(h,label){const n=pbutton(h,label);assert.ok(n,label);assert.equal(n.disabled,false,label);n.fire('click');}
function pfill(h,id,value){const n=walk(h.planRoot).find(n=>n.id===id);assert.ok(n,id);n.value=value;n.fire('input');}
async function casesReady(h){h.open(EVENT);h.requests.at(-1).resolve(dto());await settle();}
function planDto(more={}){return {contractVersion:'D331_PLAN_LIST_V1',eventId:EVENT,revision:3,
 caseId:CASE,caseRevision:1,areaId:'area-A',plans:[],...more};}
function selectPlan(h){const b=walk(h.root).find(n=>n.tagName==='button'&&n.textContent==='ดู Plans '+CASE);
 assert.ok(b);b.fire('click');}
test('F03 S2 default OFF mounts no Plan controls and dispatches zero Plan RPCs',async()=>{
 const h=harness({enabled:true});await casesReady(h);
 assert.equal(typeof h.ctx.d331F03Plans_,'object');
 h.run('updateAuthBox();renderTables();');
 assert.equal(h.planRoot.hidden,true);
 assert.equal(walk(h.root).find(n=>n.textContent==='ดู Plans '+CASE),undefined);
 assert.equal(h.requests.length,1);
});

test('F03 S2 explicit Case action loads scoped Plans with empty/denied/error and strict DTO checks',async()=>{
 const h=harness({enabled:true});h.run('D331_F03_PLANS_AVAILABLE_=true;');await casesReady(h);
 selectPlan(h);assert.match(ptext(h),/กำลังโหลด Plans/);
 assert.deepEqual(JSON.parse(JSON.stringify(h.requests.at(-1).args)),['listDenguePlansForEvent','SYNTHETIC_SESSION',EVENT,
  {caseId:CASE,expectedEventRevision:3,expectedCaseRevision:1}]);
 selectPlan(h);assert.equal(h.requests.length,2);
 h.requests.at(-1).resolve(planDto());await settle();assert.match(ptext(h),/ไม่มี Plan/);
 assert.equal(h.planRoot.getAttribute('aria-busy'),'false');
 for(const value of [planDto({patient:'PRIVATE_SENTINEL'}),planDto({caseRevision:2}),
  planDto({plans:[{planId:PLAN,triggerCaseId:CASE,episodeKey:'EP1',planRevision:1,planStatus:'OPEN',responsibleUserId:'user-1',email:'PRIVATE_SENTINEL'}]})]){
  pclick(h,'อ่านรายการ Plan ใหม่');h.requests.at(-1).resolve(value);await settle();
  assert.match(ptext(h),/ไม่สามารถยืนยัน/);assert.doesNotMatch(ptext(h),/PRIVATE_SENTINEL/);
 }
 pclick(h,'อ่านรายการ Plan ใหม่');h.requests.at(-1).reject(Error('D331_UNAVAILABLE'));await settle();
 assert.match(ptext(h),/ยังไม่เปิด|ไม่มีสิทธิ์/);
 pclick(h,'ปิด Plans');assert.equal(h.planRoot.hidden,true);
});

async function plansReady(h,plans=[]){await casesReady(h);selectPlan(h);
 h.requests.at(-1).resolve(planDto({plans}));await settle();}
function planRow(more={}){return {planId:PLAN,triggerCaseId:CASE,episodeKey:'EP1',planRevision:1,
 planStatus:'OPEN',responsibleUserId:'user-1',...more};}
function writeReceipt(more={}){return {contractVersion:'D331_PLAN_WRITE_V1',eventId:EVENT,requestId:CASE,
 status:'CREATED',planId:PLAN,revision:1,...more};}
test('F03 S2 create/cancel/save uses one immutable request and explicit fresh read after validated receipt',async()=>{
 const h=harness({enabled:true});h.run('D331_F03_PLANS_AVAILABLE_=true;');await plansReady(h);
 let ids=0;h.ctx.crypto.randomUUID=()=>{ids++;return CASE;};
 pclick(h,'เพิ่ม Plan');pfill(h,'d331-f03-episode','EP1');
 const input=walk(h.planRoot).find(n=>n.id==='d331-f03-episode');
 assert.equal(h.doc.activeElement,input);assert.equal(pbutton(h,'บันทึก Plan').disabled,false);
 h.run('updateAuthBox();renderTables();');assert.equal(walk(h.planRoot).find(n=>n.id==='d331-f03-episode'),input);
 pclick(h,'ยกเลิก');assert.equal(ids,0);assert.equal(h.requests.length,2);
 pclick(h,'เพิ่ม Plan');pfill(h,'d331-f03-episode','EP1');pclick(h,'บันทึก Plan');
 assert.equal(ids,1);assert.equal(pbutton(h,'บันทึก Plan').disabled,true);
 assert.deepEqual(JSON.parse(JSON.stringify(h.requests.at(-1).args)),['saveDenguePlan','SYNTHETIC_SESSION',EVENT,{
  mode:'create',requestId:CASE,expectedEventRevision:3,caseId:CASE,expectedCaseRevision:1,
  payload:{TriggerCaseID:CASE,EpisodeKey:'EP1'}}]);
 h.requests.at(-1).resolve(writeReceipt());await settle();
 assert.match(ptext(h),/ยืนยันการบันทึก/);assert.equal(h.requests.length,3);
 assert.equal(h.doc.activeElement.getAttribute('role'),'status');
 pclick(h,'อ่านรายการ Plan ใหม่');assert.equal(h.requests.at(-1).args[0],'listDenguePlansForEvent');
 h.requests.at(-1).resolve(planDto({plans:[planRow()]}));await settle();
 assert.match(ptext(h),/EP1/);assert.match(ptext(h),/ผู้รับผิดชอบ user-1/);
});

test('F03 S2 explicit lifecycle and eligible owner selection submit only the selected revision-safe action',async()=>{
 const h=harness({enabled:true,role:'Manager'});h.run('D331_F03_PLANS_AVAILABLE_=true;');await plansReady(h,[planRow()]);
 pclick(h,'ปิด Plan '+PLAN);assert.match(ptext(h),/ยืนยัน.*CLOSED/);pclick(h,'บันทึก Plan');
 let cmd=JSON.parse(JSON.stringify(h.requests.at(-1).args[3]));
 assert.deepEqual(cmd,{mode:'update',requestId:CASE,expectedEventRevision:3,caseId:CASE,expectedCaseRevision:1,
  entityId:PLAN,expectedEntityRevision:1,payload:{PlanStatus:'CLOSED'}});
 h.requests.at(-1).resolve(writeReceipt({status:'UPDATED',revision:2}));await settle();pclick(h,'อ่านรายการ Plan ใหม่');
 h.requests.at(-1).resolve(planDto({plans:[planRow({planStatus:'CLOSED',planRevision:2})]}));await settle();
 assert.equal(pbutton(h,'Void Plan '+PLAN),undefined);pclick(h,'เปิด Plan อีกครั้ง '+PLAN);pclick(h,'ยกเลิก');
 pclick(h,'เปิด Plan อีกครั้ง '+PLAN);pclick(h,'บันทึก Plan');
 h.requests.at(-1).resolve(writeReceipt({status:'UPDATED',revision:3}));await settle();pclick(h,'อ่านรายการ Plan ใหม่');
 h.requests.at(-1).resolve(planDto({plans:[planRow({planRevision:3})]}));await settle();
 pclick(h,'เลือกผู้รับผิดชอบ '+PLAN);
 assert.equal(h.requests.at(-1).args[0],'listAssignableDenguePlanOwners');
 h.requests.at(-1).resolve({contractVersion:'D331_PLAN_OWNERS_V1',eventId:EVENT,revision:3,caseId:CASE,caseRevision:1,
  areaId:'area-A',owners:[{userId:'user-1'},{userId:'user-2'}]});await settle();
 pfill(h,'d331-f03-owner','user-2');pclick(h,'บันทึก Plan');
 cmd=JSON.parse(JSON.stringify(h.requests.at(-1).args[3]));
 assert.deepEqual(cmd.payload,{ResponsibleUserID:'user-2'});assert.equal(cmd.expectedEntityRevision,3);
});

test('F03 S2 unknown/PENDING/NOT_FOUND/denial and malformed receipts retain Event hold without retry',async()=>{
 for(const value of [null,writeReceipt({patient:'PRIVATE_SENTINEL'}),writeReceipt({eventId:OTHER}),
  writeReceipt({planId:'bad-id'}),writeReceipt({revision:2}),writeReceipt({status:'REPLAYED'})]){
  const h=harness({enabled:true});h.run('D331_F03_PLANS_AVAILABLE_=true;');await plansReady(h);
  pclick(h,'เพิ่ม Plan');pfill(h,'d331-f03-episode','EP2');pclick(h,'บันทึก Plan');
  h.requests.at(-1).resolve(value);await settle();assert.match(ptext(h),/ยังไม่ทราบผล/);
  assert.equal(pbutton(h,'เพิ่ม Plan'),undefined);assert.doesNotMatch(ptext(h),/PRIVATE_SENTINEL/);
  for(const status of ['NOT_FOUND','PENDING','UNKNOWN','DENIED']){
   pclick(h,'ตรวจสอบสถานะคำขอ');
   if(status==='DENIED')h.requests.at(-1).reject(Error('PRIVATE_SENTINEL'));
   else h.requests.at(-1).resolve({contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',eventId:EVENT,requestId:CASE,status});
   await settle();assert.match(ptext(h),/ยังไม่ทราบผล/);
  }
  pclick(h,'ตรวจสอบสถานะคำขอ');h.requests.at(-1).resolve({contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',eventId:EVENT,
   requestId:CASE,status:'COMMITTED',planId:PLAN});await settle();
  assert.match(ptext(h),/ยืนยันการบันทึก/);assert.doesNotMatch(walk(h.planRoot).find(n=>n.getAttribute('role')==='status').textContent,/Revision \d/);
  assert.equal(h.requests.filter(r=>r.args[0]==='saveDenguePlan').length,1);
 }
});

test('F03 S2 context/session/disclosure/disposal fences late reads, assignees and saves including change-and-return',async()=>{
 const changes=[h=>h.run('token="OTHER";updateAuthBox();token="SYNTHETIC_SESSION";updateAuthBox();'),
  h=>h.run('currentUser={...currentUser};updateAuthBox();'),
  h=>h.run('currentUser.userId="user-2";updateAuthBox();currentUser.userId="user-1";updateAuthBox();'),
  h=>h.run('currentUser.role="Staff";updateAuthBox();currentUser.role="Manager";updateAuthBox();'),
  h=>h.run('allData[0].revision=4;renderTables();allData[0].revision=3;renderTables();'),
  h=>{h.planRoot.open=false;h.planRoot.open=true;h.run('renderTables();');},
  h=>{h.root.open=false;h.root.open=true;h.run('renderTables();');},
  h=>h.ctx.d331F03Plans_.dispose(),h=>h.run('doLogout();'),
  h=>h.open(OTHER)];
 for(const kind of ['read','owners','write'])for(const change of changes){
  const h=harness({enabled:true,role:'Manager'});h.run('D331_F03_PLANS_AVAILABLE_=true;');await casesReady(h);selectPlan(h);
  if(kind!=='read'){
   h.requests.at(-1).resolve(planDto({plans:[planRow()]}));await settle();
   if(kind==='owners')pclick(h,'เลือกผู้รับผิดชอบ '+PLAN);
   else{pclick(h,'เพิ่ม Plan');pfill(h,'d331-f03-episode','EP2');pclick(h,'บันทึก Plan');}
  }
  const old=h.requests.at(-1);change(h);assert.equal(h.planRoot.hidden,true,kind);
  old.resolve(kind==='write'?writeReceipt():kind==='read'?planDto():{
   contractVersion:'D331_PLAN_OWNERS_V1',eventId:EVENT,revision:3,caseId:CASE,caseRevision:1,areaId:'area-A',owners:[{userId:'user-2'}]});
  await settle();assert.equal(h.planRoot.hidden,true,kind);
 }
});

test('F03 S2 detached controls, invalid EpisodeKey and stale handlers cannot submit a fresh draft',async()=>{
 const h=harness({enabled:true});h.run('D331_F03_PLANS_AVAILABLE_=true;');await plansReady(h);
 pclick(h,'เพิ่ม Plan');const oldInput=walk(h.planRoot).find(n=>n.id==='d331-f03-episode'),oldSave=pbutton(h,'บันทึก Plan');
 pclick(h,'ยกเลิก');pclick(h,'เพิ่ม Plan');oldInput.value='EP1';oldInput.fire('input');oldSave.fire('click');
 assert.equal(h.requests.length,2);assert.equal(pbutton(h,'บันทึก Plan').disabled,true);
 for(const value of ['',' ','=1','-1','EP1 ','x'.repeat(257)]){
  pfill(h,'d331-f03-episode',value);assert.equal(pbutton(h,'บันทึก Plan').disabled,true);
 }
 pfill(h,'d331-f03-episode','EP2');h.ctx.crypto.randomUUID=()=>{throw Error('PRIVATE_SENTINEL');};pclick(h,'บันทึก Plan');
 assert.equal(h.requests.length,2);assert.doesNotMatch(ptext(h),/PRIVATE_SENTINEL/);
 h.planRoot.isConnected=false;pbutton(h,'บันทึก Plan').fire('click');assert.equal(h.requests.length,2);
 assert.equal(h.planRoot.hidden,true);
});

test('F03 S2 focus enters read status, cancel returns to status and close restores the Case action',async()=>{
 const h=harness({enabled:true});h.run('D331_F03_PLANS_AVAILABLE_=true;');await casesReady(h);
 const opener=walk(h.root).find(n=>n.textContent==='ดู Plans '+CASE);opener.fire('click');
 assert.equal(h.doc.activeElement.getAttribute('role'),'status');
 h.requests.at(-1).resolve(planDto());await settle();pclick(h,'เพิ่ม Plan');pclick(h,'ยกเลิก');
 assert.equal(h.doc.activeElement.getAttribute('role'),'status');
 pclick(h,'ปิด Plans');assert.equal(h.doc.activeElement,opener);
});

test('F03 S2 Case change preserves uncertain Event hold and late success cannot unblock the fresh context',async()=>{
 const h=harness({enabled:true});h.run('D331_F03_PLANS_AVAILABLE_=true;');h.open(EVENT);
 const cases=[{caseId:CASE,caseRevision:1,caseStatus:'ACTIVE'},{caseId:PLAN,caseRevision:2,caseStatus:'ACTIVE'}];
 h.requests.at(-1).resolve(dto({cases}));await settle();selectPlan(h);h.requests.at(-1).resolve(planDto());await settle();
 pclick(h,'เพิ่ม Plan');pfill(h,'d331-f03-episode','EP2');pclick(h,'บันทึก Plan');const old=h.requests.at(-1);
 walk(h.root).find(n=>n.textContent==='ดู Plans '+PLAN).fire('click');
 const fresh=h.requests.at(-1);old.resolve(writeReceipt());await settle();
 fresh.resolve(planDto({caseId:PLAN,caseRevision:2}));await settle();
 assert.match(ptext(h),/ยังไม่ทราบผล/);assert.equal(pbutton(h,'เพิ่ม Plan'),undefined);
 h.run('currentUser={email:"other@example.invalid",role:"Admin"};updateAuthBox();');
 h.open(EVENT);h.requests.at(-1).resolve(dto({cases}));await settle();selectPlan(h);h.requests.at(-1).resolve(planDto());await settle();
 assert.match(ptext(h),/ยังไม่ทราบผล/);assert.equal(pbutton(h,'ตรวจสอบสถานะคำขอ'),undefined);
 assert.doesNotMatch(ptext(h),new RegExp('คำขอ '+CASE));
});

test('F03 S2 replay receipt carries no guessed revision and malformed assignee DTO never becomes a form',async()=>{
 const h=harness({enabled:true,role:'Manager'});h.run('D331_F03_PLANS_AVAILABLE_=true;');await plansReady(h);
 pclick(h,'เพิ่ม Plan');pfill(h,'d331-f03-episode','EP1');pclick(h,'บันทึก Plan');
 const replay=writeReceipt({status:'REPLAYED'});delete replay.revision;h.requests.at(-1).resolve(replay);await settle();
 assert.match(ptext(h),/ต้องอ่านรายการใหม่เพื่อยืนยัน Revision/);
 pclick(h,'อ่านรายการ Plan ใหม่');h.requests.at(-1).resolve(planDto({plans:[planRow()]}));await settle();
 pclick(h,'เลือกผู้รับผิดชอบ '+PLAN);h.requests.at(-1).resolve({contractVersion:'D331_PLAN_OWNERS_V1',eventId:EVENT,
  revision:3,caseId:CASE,caseRevision:1,areaId:'area-A',owners:[{userId:'user-2',email:'PRIVATE_SENTINEL'}]});await settle();
 assert.match(ptext(h),/ไม่สามารถยืนยัน/);assert.equal(pbutton(h,'บันทึก Plan'),undefined);assert.doesNotMatch(ptext(h),/PRIVATE_SENTINEL/);
});
