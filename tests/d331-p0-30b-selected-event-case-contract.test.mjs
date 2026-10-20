import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const records=read('src/web/03h-client-event-records.html');
const layout=read('src/web/02-app-layout.html');
const canonical=read('src/web/03m-client-d331-mvp01-offline.html');
const backend=read('src/dengue/15-p0-22b2-case-read-integration.gs');
const aa=records.indexOf('// P0-30A: inert Records Case-read state seam.');
const ab=records.indexOf('// P0-30A END',aa);
const ba=records.indexOf('// P0-30B: source-only Event-selection contract');
const bb=records.indexOf('// P0-30B END',ba);
assert.ok(aa>0&&ab>aa&&ba>ab&&bb>ba,'review exactly the registered source seams');
const code=records.slice(aa,ab)+records.slice(ba,bb);
const EVENT='00000000-0000-4000-8000-000000002300';
const selection=()=>({kind:'SYNTHETIC_SELECTED_EVENT_V1',
  eventId:EVENT,areaId:'SYNTHETIC-AREA',recordStatus:'active',
  revision:1,simulationOnly:true});

class Element {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];
  this.attrs={};this.listeners={};this.textContent='';this.hidden=true;this.open=false;}
 appendChild(x){this.children.push(x);return x;}
 replaceChildren(...xs){this.children=xs;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 fire(k){for(const fn of this.listeners[k]??[])fn();}
}
function harness(){
 const doc={createElement(tag){return new Element(tag,doc);}};
 const details=new Element('details',doc),region=new Element('section',doc);
 const auth={token:'SYNTHETIC_SESSION',user:{role:'Staff'},allowed:true};
 let activeSelection=selection();
 const ctx=vm.createContext({});
 new vm.Script(code,{filename:'registered P0-30A and P0-30B seam'})
  .runInContext(ctx,{timeout:1000});
 const reader=ctx.d331P030aCaseReadSeam_;
 const api=ctx.d331P030bSelectedEventCaseContract_;
 const seam=reader.createController({root:details,region,session:()=>({
  token:auth.token,user:auth.user,allowed:auth.allowed})});
 const link=api.createOfflineLink({seam,selection:()=>activeSelection});
 function toggle(open){details.open=open;details.fire('toggle');}
 const snapshot=()=>JSON.parse(JSON.stringify(seam.snapshot()));
 const text=()=>{let a=[];function walk(x){a.push(x.textContent);
  for(const y of x.children)walk(y);}walk(region);return a.join('|');};
 return {api,reader,seam,link,details,region,auth,toggle,snapshot,text,
  setSelection:s=>{activeSelection=s;}};
}
test('P0-30B exactly retains Native26 topology, inert live read and original P0-25 mirror',()=>{
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.ok(GAS_HTML_SOURCES.includes('src/web/03h-client-event-records.html'));
 assert.ok(!GAS_HTML_SOURCES.includes('src/web/03m-client-d331-mvp01-offline.html'));
 assert.equal((records.match(/<script>/g)||[]).length,1);
 assert.equal((records.match(/<style>/g)||[]).length,0);
 assert.ok(records.indexOf('// P0-25: exact synthetic JS mirror')>bb);
 assert.ok(layout.includes('id="d331-p024-region"'));
 assert.ok(canonical.includes('UNREGISTERED Records integration candidate'));
 assert.match(backend,/D331_P022B2_ENABLED_ = false/);
 assert.match(backend,/D331_P022B2_REVOCATION_APPROVED_ = false/);
 assert.match(backend,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
 assert.doesNotMatch(code,/\b(?:google\.script|SpreadsheetApp|PropertiesService|CacheService|localStorage|sessionStorage|XMLHttpRequest|WebSocket|fetch\s*\(|allData|getDengueWorkspace\s*\(|d331P022b2ListCasesForEvent_\s*\(|setValues?\s*\(|appendRow\s*\()/);
 assert.doesNotMatch(records.slice(ba,bb),/\.mount\s*\(|\.connect\s*\(|\.run\s*\(/);
});
test('P0-30B only accepts fixed mock selection and strips caller object identity',()=>{
 const h=harness(),s=selection();
 const clean=h.api.validateSelection(s);
 assert.equal(clean.eventId,EVENT);
 assert.equal(clean.revision,1);
 assert.equal(clean.simulationOnly,true);
 assert.equal(Object.isFrozen(clean),true);
 assert.notEqual(clean,s);
 for(const invalid of [
  null,{},[],{...s,eventId:'e0000000-0000-4000-8000-000000000099'},
  {...s,revision:2},{...s,areaId:'540601'}, {...s,kind:'SERVER_VERIFIED'},
  {...s,recordStatus:'closed'},{...s,simulationOnly:false},
  {...s,UserID:'sensitive'}, {...s,grant:true},
  {...s,PatientName:'no'}, {...s,token:'no'}
 ]){
  assert.throws(()=>h.api.validateSelection(invalid),/D331_P030B_SYNTHETIC_ONLY/);
 }
});
test('P0-30B is not a live Records feature: default no mount, no loader, no RPC',()=>{
 const h=harness();
 assert.equal(h.link.remoteEnabled,false);
 assert.equal(h.link.realEventSelectionEnabled,false);
 assert.equal(h.api.remoteEnabled,false);
 assert.equal(h.snapshot().status,'UNAVAILABLE');
 assert.equal(h.region.children.length,0);
 assert.equal(h.region.hidden,true);
 assert.equal(h.details.listeners.toggle,undefined);
});
test('P0-30B joins synthetic Event selection with existing P0-30A seam without a backend request',async()=>{
 const h=harness();h.seam.connect();h.toggle(true);
 const result=h.link.preview();
 assert.equal(h.snapshot().status,'LOADING');
 assert.equal(h.region.attrs['aria-busy'],'true');
 assert.equal(await result,'MOCK_ONLY');
 assert.equal(h.snapshot().status,'READY');
 assert.equal(h.snapshot().cases.length,1);
 assert.equal(h.snapshot().canWrite,false);
 assert.equal(h.snapshot().slaAssessment,'NOT_EVALUATED');
 assert.equal(h.region.attrs['aria-busy'],'false');
 assert.match(h.text(),/Mock-only · D331 OFF/);
 assert.match(h.text(),/00000000-0000-4000-8000-000000002301/);
});
test('P0-30B cannot launch parallel preview requests or replay stale response',async()=>{
 const h=harness();h.seam.connect();h.toggle(true);
 const first=h.link.preview();
 assert.equal(await h.link.preview(),'BUSY');
 assert.equal(await first,'MOCK_ONLY');
 assert.equal(h.snapshot().cases.length,1);
 h.link.cancel();
 assert.equal(h.snapshot().status,'UNAVAILABLE');
 assert.equal(h.details.open,false);
});
test('P0-30B rejects real or altered selection before accepting any Case',async()=>{
 const h=harness();h.seam.connect();h.toggle(true);
 h.setSelection({...selection(),eventId:'f0000000-0000-4000-8000-000000000099'});
 assert.equal(await h.link.preview(),'DENIED');
 assert.equal(h.snapshot().cases.length,0);
 assert.equal(h.details.open,false);
 assert.equal(h.region.hidden,true);
});
test('P0-30B cancels pending result on changed selected Event context',async()=>{
 const h=harness();h.seam.connect();h.toggle(true);
 const pending=h.link.preview();
 h.setSelection({...selection(),revision:2});
 assert.equal(await pending,'DENIED');
 assert.equal(h.snapshot().status,'UNAVAILABLE');
 assert.equal(h.region.children.length,0);
 assert.equal(h.details.open,false);
 assert.doesNotMatch(h.text(),/00000000-0000-4000-8000-000000002301/);
});
test('P0-30B guards close/reopen and logout/role/token switches mid-flight',async()=>{
 const mutations=[
  h=>{h.toggle(false);h.toggle(true);},
  h=>{h.auth.token='';},
  h=>{h.auth.allowed=false;},
  h=>{h.auth.user={role:'Staff'};}
 ];
 for(const mutate of mutations){
  const h=harness();h.seam.connect();h.toggle(true);
  const pending=h.link.preview();
  mutate(h);
  const result=await pending;
  assert.ok(['STALE','DENIED'].includes(result),result);
  assert.equal(h.snapshot().cases.length,0);
  assert.notEqual(h.snapshot().status,'READY');
  assert.doesNotMatch(h.text(),/00000000-0000-4000-8000-000000002301/);
 }
});
test('P0-30B refuses fake seam authority and ignores injected transport functions',async()=>{
 const h=harness();
 assert.throws(()=>h.api.createOfflineLink({seam:{
  begin:()=>1,accept:()=>true,reset(){},snapshot:()=>({kind:'READ_ONLY',remoteEnabled:true,canWrite:true})
 },selection}),/D331_P030B_SYNTHETIC_ONLY/);
 let requests=0;
 const offline=h.api.createOfflineLink({seam:h.seam,selection,
  request(){requests++;throw new Error('unexpected transport');},
  rpc(){requests++;throw new Error('unexpected rpc');}
 });
 h.seam.connect();h.toggle(true);
 assert.equal(await offline.preview(),'MOCK_ONLY');
 assert.equal(requests,0);
});
