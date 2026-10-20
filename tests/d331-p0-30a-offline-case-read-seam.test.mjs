import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAS_HTML_SOURCES,GAS_SERVER_SOURCES} from '../tools/native-sources.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const records=read('src/web/03h-client-event-records.html');
const canonical=read('src/web/03m-client-d331-mvp01-offline.html');
const backend=read('src/dengue/15-p0-22b2-case-read-integration.gs');
const layout=read('src/web/02-app-layout.html');
const beginMark='// P0-30A: inert Records Case-read state seam.';
const endMark='// P0-30A END';
const begin=records.indexOf(beginMark),end=records.indexOf(endMark,begin);
assert.ok(begin>0&&end>begin,'must use the exact registered 03h P0-30A source');
const code=records.slice(begin,end);
const EVENT='00000000-0000-4000-8000-000000002300';
const AREA='SYNTHETIC-AREA';
const CASE_1='00000000-0000-4000-8000-000000002301';
const CASE_2='00000000-0000-4000-8000-000000002302';
const dto=(cases=[])=>({status:'MOCK_ONLY',simulationOnly:true,eventId:EVENT,areaId:AREA,
 cases,slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,canWrite:false});
const item=(caseId=CASE_1)=>({caseId,caseRevision:1,caseStatus:'ACTIVE'});
class Element {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.hidden=true;
   this.open=false;this.textContent='';this.children=[];this.attrs={};this.listeners={};}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(...children){this.children=children;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 fire(k){for(const fn of this.listeners[k]??[])fn();}
}
function harness(){
 const doc={createElement(tag){return new Element(tag,doc);}};
 const root=new Element('details',doc),region=new Element('section',doc);
 const auth={token:'TOKEN_SYNTHETIC_ONLY',user:{role:'Staff'},allowed:true};
 const ctx=vm.createContext({});
 new vm.Script(code,{filename:'P0-30A Records seam'}).runInContext(ctx,{timeout:1000});
 const api=ctx.d331P030aCaseReadSeam_;
 const controller=api.createController({
   root,region,session:()=>({token:auth.token,user:auth.user,allowed:auth.allowed})
 });
 const snapshot=()=>JSON.parse(JSON.stringify(controller.snapshot()));
 const text=()=>{let words=[];function walk(node){words.push(node.textContent);
   for(const child of node.children)walk(child);}walk(region);return words.join('|');};
 const toggle=open=>{root.open=open;root.fire('toggle');};
 return {api,controller,root,region,auth,snapshot,text,toggle};
}
test('P0-30A remains native registered in original Records, not a new route or case RPC',()=>{
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.ok(GAS_HTML_SOURCES.includes('src/web/03h-client-event-records.html'));
 assert.equal(GAS_HTML_SOURCES.includes('src/web/03m-client-d331-mvp01-offline.html'),false);
 assert.equal((records.match(/<script>/g)||[]).length,1);
 assert.ok(records.indexOf(endMark)<records.indexOf('// P0-25: exact synthetic JS mirror'));
 assert.match(backend,/D331_P022B2_ENABLED_ = false/);
 assert.match(backend,/D331_P022B2_REVOCATION_APPROVED_ = false/);
 assert.match(backend,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
 assert.match(layout,/id="d331-p018-preview"/);
 assert.match(layout,/id="d331-p024-region"/);
 assert.match(canonical,/UNREGISTERED Records integration candidate/);
 assert.doesNotMatch(code,/\b(?:google\.script|SpreadsheetApp|PropertiesService|CacheService|localStorage|sessionStorage|XMLHttpRequest|WebSocket|fetch\s*\(|allData|getDengueWorkspace|d331P022b2ListCasesForEvent_|setValues?\s*\(|appendRow\s*\()/);
 assert.equal((code.match(/createController/g)||[]).length>0,true);
});
test('P0-30A is inert by default: no DOM, no network, no request execution',()=>{
 const h=harness();assert.equal(h.api.remoteEnabled,false);
 assert.equal(h.region.hidden,true);assert.equal(h.region.children.length,0);
 assert.equal(h.snapshot().status,'UNAVAILABLE');
 assert.equal(h.controller.begin(),null);
 h.controller.connect();h.controller.connect();
 assert.equal(h.root.listeners.toggle.length,1);
 assert.equal(h.root.open,false);
 assert.equal(h.region.children.length,0);
});
test('P0-30A explicit synthetic Records disclosure has LOADING→EMPTY and stable labels',async()=>{
 const h=harness();h.controller.connect();h.toggle(true);
 const ticket=h.controller.begin();assert.equal(ticket,2);
 assert.equal(h.region.attrs['aria-busy'],'true');
 assert.match(h.text(),/กำลังโหลดข้อมูล Case จำลอง/);
 assert.match(h.text(),/Mock-only · D331 OFF/);
 await Promise.resolve().then(()=>assert.equal(h.controller.accept(ticket,dto([])),true));
 assert.equal(h.snapshot().status,'EMPTY');
 assert.equal(h.region.attrs['aria-busy'],'false');
 assert.match(h.text(),/ไม่มี Case จำลอง/);
 assert.equal(h.snapshot().cases.length,0);
 assert.equal(h.snapshot().canWrite,false);
 assert.equal(h.snapshot().slaAssessment,'NOT_EVALUATED');
});
test('P0-30A mocked case DTO READY is data minimized and never enables write',()=>{
 const h=harness();h.controller.connect();h.toggle(true);
 const ticket=h.controller.begin();
 assert.equal(h.controller.accept(ticket,dto([item(CASE_1),item(CASE_2)])),true);
 assert.equal(h.snapshot().status,'READY');
 assert.equal(h.snapshot().cases.length,2);
 assert.equal(h.region.children.length,1);
 assert.equal(h.snapshot().remoteEnabled,false);
 assert.match(h.text(),/Revision 1/);
 assert.match(h.text(),/NOT_EVALUATED/);
 assert.equal(h.controller.accept(ticket,dto([])),false,'same-ticket replay denied');
 assert.equal(h.snapshot().status,'READY');
});
test('P0-30A rejects malformed, cross-event, PHI, duplicate and false-permission DTOs',()=>{
 const mutations=[
   d=>({...d,eventId:'e0000000-0000-4000-8000-000000000099'}),
   d=>({...d,status:'READ_ONLY'}),
   d=>({...d,simulationOnly:false}),
   d=>({...d,canWrite:true}),
   d=>({...d,clinicalPolicyApproved:true}),
   d=>({...d,slaAssessment:'ON_TIME'}),
   d=>({...d,PatientName:'sensitive'}),
   d=>({...d,cases:[{...item(),patientName:'no'}]}),
   d=>({...d,cases:[item(),item()]}),
   d=>({...d,cases:[item('00000000-0000-4000-8000-000000000001')]}),
   d=>({...d,cases:[{...item(),caseStatus:'VOID'}]}),
   d=>({...d,cases:[{...item(),caseRevision:0}]}),
   d=>({...d,cases:Array.from({length:101},(_,i)=>item())})
 ];
 for(const mutate of mutations){
   const h=harness();h.controller.connect();h.toggle(true);
   const ticket=h.controller.begin();
   assert.equal(h.controller.accept(ticket,mutate(dto([item()]))),false);
   assert.equal(h.snapshot().status,'ERROR');
   assert.equal(h.snapshot().cases.length,0);
   assert.match(h.text(),/ไม่สามารถอ่านข้อมูลจำลองได้/);
   assert.doesNotMatch(h.text(),/sensitive|PatientName/);
 }
});
test('P0-30A ignores stale async resolution after disclosure close, never reopens',async()=>{
 const h=harness();h.controller.connect();h.toggle(true);
 const ticket=h.controller.begin();
 h.toggle(false);h.toggle(true);
 assert.equal(h.controller.accept(ticket,dto([item()])),false);
 assert.equal(h.snapshot().status,'UNAVAILABLE');
 assert.equal(h.region.children.length,1); // static unavailable state on explicit reopen
 const fresh=h.controller.begin();
 assert.notEqual(fresh,ticket);
 assert.equal(h.controller.accept(ticket,dto([item()])),false);
 await Promise.resolve().then(()=>assert.equal(h.controller.accept(fresh,dto([item()])),true));
 assert.equal(h.snapshot().status,'READY');
});
test('P0-30A logout and account/role change revoke current ticket and clear fake content',()=>{
 const changes=[h=>{h.auth.allowed=false;},h=>{h.auth.token='OTHER_TOKEN';},
   h=>{h.auth.user={role:'Staff'};},h=>{h.auth.token='';}];
 for(const change of changes){
   const h=harness();h.controller.connect();h.toggle(true);
   const ticket=h.controller.begin();change(h);
   assert.equal(h.controller.accept(ticket,dto([item()])),false);
   assert.equal(h.snapshot().status,'UNAVAILABLE');
   assert.equal(h.root.open,false);
   assert.equal(h.region.hidden,true);
   assert.equal(h.region.children.length,0);
   assert.doesNotMatch(JSON.stringify(h.snapshot()),/OTHER_TOKEN|TOKEN_SYNTHETIC_ONLY/);
 }
});
test('P0-30A failed synthetic read is generic error; reset prevents late result resurrection',()=>{
 const h=harness();h.controller.connect();h.toggle(true);
 const ticket=h.controller.begin();assert.equal(h.controller.fail(ticket),true);
 assert.equal(h.snapshot().status,'ERROR');
 assert.equal(h.region.attrs['aria-busy'],'false');
 assert.equal(h.controller.fail(ticket),false);
 const other=h.controller.begin();h.controller.reset();
 assert.equal(h.controller.accept(other,dto([item()])),false);
 assert.equal(h.region.hidden,true);assert.equal(h.region.children.length,0);
});
