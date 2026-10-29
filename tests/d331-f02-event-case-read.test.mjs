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
function harness({enabled=false,role='Admin'}={}){
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
 const ctx=vm.createContext({document:doc,Promise,Date,MutationObserver,
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
 if(enabled)run('D331_F02_CASE_READ_AVAILABLE_=true;'); // isolated source flag, never an RPC argument
 const api=()=>ctx.d331F02CaseRead_;
 const text=()=>{const a=[];function walk(n){a.push(n.textContent);n.children.forEach(walk);}walk(root);return a.join('|');};
 const open=id=>api().select(id);
 const snapshot=()=>JSON.parse(JSON.stringify(api().snapshot()));
 return {ctx,doc,root,requests,run,api,open,text,snapshot};
}
function dto(overrides={}){return {contractVersion:'D331_CASE_LIST_V1',status:'READ_ONLY',
 eventId:EVENT,revision:3,areaId:'area-A',
 cases:[{caseId:CASE,caseRevision:1,caseStatus:'ACTIVE'}],
 slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,canWrite:false,canEnable:false,...overrides};}

test('F02-R default availability OFF never dispatches on selection or Records refresh',()=>{
 const h=harness();
 h.open(EVENT);h.run('renderTables()');h.run('updateAuthBox()');
 assert.equal(h.requests.length,0);
 assert.equal(h.snapshot().status,'UNAVAILABLE');
 assert.equal(h.root.hidden,true);
 assert.doesNotMatch(h.text(),new RegExp(CASE));
});

test('F02-R selected Event reads once, shows loading then validated Cases, empty and safe errors',async()=>{
 const h=harness({enabled:true});
 h.open(EVENT);h.open(EVENT);
 assert.equal(h.requests.length,1);
 assert.deepEqual(h.requests[0].args,['listDengueCasesForEvent','SYNTHETIC_SESSION',EVENT]);
 assert.equal(h.snapshot().status,'LOADING');
 assert.equal(h.root.attrs['aria-busy'],'true');
 h.requests[0].resolve(dto());await settle();
 assert.equal(h.snapshot().status,'READY');assert.match(h.text(),new RegExp(CASE));
 assert.equal(h.root.attrs['aria-busy'],'false');
 h.open(EVENT);h.requests[1].resolve(dto({cases:[]}));await settle();
 assert.equal(h.snapshot().status,'EMPTY');assert.match(h.text(),/ไม่มี Case/);
 h.open(EVENT);h.requests[2].reject(new Error('PRIVATE_PATIENT_SENTINEL'));await settle();
 assert.equal(h.snapshot().status,'ERROR');assert.doesNotMatch(h.text(),/PRIVATE_PATIENT_SENTINEL/);
});

test('F02-R wire interface rejects mock, foreign, malformed, duplicate and extra-field responses',async()=>{
 for(const value of [null,dto({contractVersion:'WRONG'}),dto({status:'MOCK_ONLY'}),
  dto({eventId:OTHER}),dto({revision:2}),dto({areaId:''}),dto({canWrite:true}),
  dto({canEnable:true}),dto({clinicalPolicyApproved:true}),dto({slaAssessment:'PASS'}),
  dto({PatientName:'PRIVATE_SENTINEL'}),dto({cases:[{caseId:CASE,caseRevision:0,caseStatus:'ACTIVE'}]}),
  dto({cases:[{caseId:CASE,caseRevision:1,caseStatus:'VOID'}]}),
  dto({cases:[{caseId:CASE,caseRevision:1,caseStatus:'ACTIVE',PatientName:'PRIVATE_SENTINEL'}]}),
  dto({cases:[dto().cases[0],dto().cases[0]]}),dto({cases:'PRIVATE_SENTINEL'})]){
  const h=harness({enabled:true});h.open(EVENT);h.requests[0].resolve(value);await settle();
  assert.equal(h.snapshot().status,'ERROR');assert.equal(h.snapshot().cases.length,0);
  assert.doesNotMatch(h.text(),/PRIVATE_SENTINEL/);
 }
});

test('F02-R A→B→A ignores old successes and failures without clearing a newer request',async()=>{
 const h=harness({enabled:true});h.open(EVENT);h.open(OTHER);h.open(EVENT);
 assert.equal(h.requests.length,3);assert.doesNotMatch(h.text(),new RegExp(CASE));
 h.requests[0].resolve(dto());h.requests[1].reject(new Error('OLD_PRIVATE_ERROR'));await settle();
 assert.equal(h.snapshot().status,'LOADING');assert.equal(h.snapshot().cases.length,0);
 h.requests[2].resolve(dto());await settle();assert.equal(h.snapshot().status,'READY');
 h.run('renderTables()');assert.equal(h.snapshot().status,'READY');
});

test('F02-R observed identity, permission and Event changes clear results before any late completion',async()=>{
 for(const mutate of ['token="OTHER_SESSION"','currentUser={...currentUser}',
  'currentUser.email="other@example.invalid"','currentUser.userId="other-user"',
  'currentUser.role="Staff"','allData[0].revision=4','allData[0].recordStatus="closed"',
  'allData.push({...allData[0]})','D331_F02_CASE_READ_AVAILABLE_=false']){
  const h=harness({enabled:true});h.open(EVENT);h.requests[0].resolve(dto());await settle();
  h.run(mutate+';updateAuthBox();renderTables();');
  assert.equal(h.root.hidden,true,mutate);assert.equal(h.snapshot().cases.length,0);
 }
 const h=harness({enabled:true});h.open(EVENT);
 h.run('currentUser.role="Staff";updateAuthBox();currentUser.role="Admin";updateAuthBox();');
 assert.equal(h.root.hidden,true);
 h.requests[0].resolve(dto());await settle();assert.equal(h.snapshot().status,'UNAVAILABLE');
});

test('F02-R disclosure close→reopen cannot retain data or revive queued work even before observer delivery',async()=>{
 const h=harness({enabled:true});h.open(EVENT);h.requests[0].resolve(dto());await settle();
 h.root.open=false;h.root.open=true;
 assert.equal(h.snapshot().cases.length,0);assert.equal(h.root.hidden,true);
 h.open(EVENT);const old=h.requests[1];h.root.open=false;h.root.open=true;
 h.open(EVENT);assert.equal(h.requests.length,3);
 old.resolve(dto());await settle();assert.equal(h.snapshot().status,'LOADING');
 h.requests[2].resolve(dto());await settle();assert.equal(h.snapshot().status,'READY');
});

test('F02-R close/dispose clears data and restores focus only on explicit close',async()=>{
 const h=harness({enabled:true}),opener=h.doc.createElement('button');
 h.api().select(EVENT,opener);h.requests[0].resolve(dto());await settle();
 const close=h.root.children.find(n=>n.textContent==='ปิดรายการ Case');
 assert.equal(h.doc.activeElement,close);close.fire('click');
 assert.equal(h.root.hidden,true);assert.equal(h.doc.activeElement,opener);
 h.open(EVENT);h.api().dispose();h.requests[1].resolve(dto());await settle();
 assert.equal(h.snapshot().cases.length,0);assert.equal(h.root.hidden,true);
 h.open(EVENT);close.fire('click');assert.equal(h.snapshot().status,'LOADING');
});

test('F02-R Records exposes EventID-based read controls only with candidate availability and existing roles',()=>{
 for(const role of ['Staff','Guest']){
  const h=harness({enabled:true,role});h.run('renderTables()');h.open(EVENT);
  assert.equal(h.requests.length,0);
  assert.doesNotMatch(h.doc.getElementById('recordBody').innerHTML,/ดู Case/);
 }
 const off=harness();off.run('renderTables()');
 assert.doesNotMatch(off.doc.getElementById('recordBody').innerHTML,/ดู Case/);
 const h=harness({enabled:true});h.run('renderTables()');
 assert.match(h.doc.getElementById('recordBody').innerHTML,/ดู Case/);
 assert.ok(h.doc.getElementById('recordBody').innerHTML.includes("select('"+EVENT+"',this)"));
 h.run('allData[0].recordStatus="closed";renderTables();');
 assert.ok(!h.doc.getElementById('recordBody').innerHTML.includes("select('"+EVENT+"',this)"));
});

test('F02-R logout clears Case state synchronously while server logout and an old read remain pending',async()=>{
 const h=harness({enabled:true});h.open(EVENT);
 h.run('doLogout()');
 assert.equal(h.root.hidden,true);assert.equal(h.snapshot().cases.length,0);
 h.requests[0].resolve(dto());await settle();
 assert.equal(h.snapshot().status,'UNAVAILABLE');assert.equal(h.root.hidden,true);
 assert.equal(h.requests.at(-1).args[0],'logout');
 h.requests.at(-1).resolve(null);await settle();
});

test('F02-R a detached disclosure cannot retain data or dispatch another read',async()=>{
 const h=harness({enabled:true});h.open(EVENT);h.root.isConnected=false;
 h.requests[0].resolve(dto());await settle();
 assert.equal(h.snapshot().status,'UNAVAILABLE');assert.equal(h.root.hidden,true);
 h.open(EVENT);assert.equal(h.requests.length,1);
});
