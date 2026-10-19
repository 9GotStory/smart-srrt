import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('src/web/03m-client-d331-mvp01-offline.html');
const layout=read('src/web/02-app-layout.html');
const records=read('src/web/03h-client-event-records.html');
const mockRead=read('src/web/03h-client-event-records.html');
const reader=read('src/dengue/15-p0-22b2-case-read-integration.gs');
const tags=src.slice(src.indexOf('<script>')+8,src.lastIndexOf('</script>'));

class FakeElement {
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];
    this.textContent='';this.hidden=false;this.open=false;this.disabled=false;
    this.attrs={};this.listeners={};}
  appendChild(x){this.children.push(x);return x;}
  replaceChildren(...x){this.children=x;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}
  fire(event){for(const fn of this.listeners[event]??[])fn();}
}
function dom(){
  const doc={createElement(tag){return new FakeElement(tag,doc);}};
  const detail=new FakeElement('details',doc), region=new FakeElement('section',doc);
  region.hidden=true;
  function find(pred){
    const result=[];
    function walk(node){if(pred(node))result.push(node);
      node.children.forEach(walk);}
    walk(region);return result;
  }
  return {doc,detail,region,find,
    button(label){return find(n=>n.tagName==='button'&&n.textContent===label)[0];}};
}
function setup(){
 const ctx=vm.createContext({Promise,Date});
 vm.runInContext(tags,ctx,{timeout:1000});
 const api=ctx.d331P023OfflineCaseWorkspace_;
 const ui=dom();
 const auth={token:'MOCK_LOGIN_TOKEN',user:{role:'Staff'},allowed:true};
 let mounts=0;
 const bridge=api.createRecordsBridge({
  root:ui.detail,region:ui.region,
  session:()=>({...auth}),
  mountView:node=>{mounts++;return api.mount(node);}
 });
 return {...ui,api,auth,bridge,mounts:()=>mounts,
   toggle(open){ui.detail.open=open;ui.detail.fire('toggle');}};
}

test('P0-24 leaves the locked Native26 release manifest unchanged and mock bridge unregistered',()=>{
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.equal(GAS_HTML_SOURCES.filter(s=>s.endsWith('03m-client-d331-mvp01-offline.html')).length,0);
 assert.ok(GAS_HTML_SOURCES.includes('src/web/03h-client-event-records.html'));
 assert.ok(GAS_HTML_SOURCES.includes('src/web/04-browser-app.html'));
 assert.match(src,/UNREGISTERED Records integration candidate/);
 assert.ok(!GAS_SERVER_SOURCES.some(s=>s.includes('p0-22b2')));
 assert.match(reader,/D331_P022B2_ENABLED_ = false/);
 assert.match(reader,/D331_P022B2_REVOCATION_APPROVED_ = false/);
 assert.match(reader,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
 const recordsStart=layout.indexOf('<section id="page-records"');
 const reporterStart=layout.indexOf('<section id="page-reporter"');
 const host=layout.indexOf('id="d331-p024-region"');
 assert.ok(host>recordsStart&&host<reporterStart);
 assert.ok(host>layout.indexOf('id="d331-p020-region"'));
 assert.ok(host<layout.indexOf('</details>',layout.indexOf('id="d331-p018-preview"')));
 assert.match(layout.slice(host,host+210),/hidden/);
 assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
 assert.match(layout,/Mock-only · D331 OFF/);
 assert.match(records,/d331P024RecordsMockBridge_\.mount\(\)/);
 assert.match(records,/d331P024RecordsMockBridge_\.reset\(\)/);
 assert.match(records,/d331P020PreviewBridge_\.mount\(\)/);
 assert.match(records,/d331P020PreviewBridge_\.reset\(\)/);
});

test('P0-24 isolated guest role/session does not mount a synthetic form',()=>{
 const h=setup();
 h.auth.allowed=false;
 h.bridge.connect();h.toggle(true);
 assert.equal(h.mounts(),0);
 assert.equal(h.detail.open,false);
 assert.equal(h.region.hidden,true);
 assert.equal(h.region.children.length,0);
 h.auth.allowed=true;h.bridge.refresh();
 assert.equal(h.mounts(),0,'guest cannot cause implicit mock mount');
 h.toggle(true);assert.equal(h.mounts(),1);
 assert.equal(h.region.hidden,false);
});

test('P0-24 mounts on explicit existing Records disclosure, not repeated renders',()=>{
 const h=setup();
 h.bridge.connect();h.bridge.connect();h.bridge.refresh();
 assert.equal(h.mounts(),0);
 assert.equal(h.detail.listeners.toggle.length,1);
 h.toggle(true);
 assert.equal(h.mounts(),1);
 assert.ok(h.button('เพิ่ม Case ตัวอย่าง'));
 h.button('เพิ่ม Case ตัวอย่าง').fire('click');
 assert.ok(h.button('บันทึกแบบจำลอง'));
 h.bridge.refresh();h.bridge.refresh();
 assert.equal(h.mounts(),1);
 assert.ok(h.button('ยกเลิก'),'refresh must preserve in-progress draft');
 assert.equal(h.region.hidden,false);
 assert.equal(h.find(n=>n.textContent.includes('D331 OFF')).length,1);
});

test('P0-24 closing preview disposes synthetic Case UI and reopens fresh',async()=>{
 const h=setup();h.bridge.connect();h.toggle(true);
 h.button('เพิ่ม Case ตัวอย่าง').fire('click');
 const date=h.find(n=>n.tagName==='input'&&n.type==='date')[0];
 date.value='2026-10-19';date.fire('change');
 h.button('บันทึกแบบจำลอง').fire('click');
 h.toggle(false);
 assert.equal(h.region.hidden,true);
 assert.equal(h.region.children.length,0);
 await new Promise(resolve=>setImmediate(resolve));
 h.toggle(true);
 assert.equal(h.mounts(),2);
 const table=h.find(n=>n.tagName==='tbody')[0];
 assert.equal(table.children.length,1,'no mock draft may survive closing');
});

test('P0-24 logout, role drop and account change fence and clear mock state',()=>{
 for(const mutate of [
  a=>{a.token='';a.user=null;a.allowed=false;},
  a=>{a.token='ANOTHER_TOKEN';a.user={role:'Staff'};},
  a=>{a.allowed=false;}
 ]){
  const h=setup();h.bridge.connect();h.toggle(true);
  h.button('เพิ่ม Case ตัวอย่าง').fire('click');
  mutate(h.auth);
  h.bridge.refresh();
  assert.equal(h.detail.open,false);
  assert.equal(h.region.hidden,true);
  assert.equal(h.region.children.length,0);
  h.bridge.refresh();assert.equal(h.mounts(),1);
 }
});

test('P0-24 failed synthetic renderer clears region and closes no external resource',()=>{
 const h=dom();
 const api=setup().api;
 const bridge=api.createRecordsBridge({
  root:h.detail,region:h.region,
  session:()=>({allowed:true,token:'LOCAL_ONLY',user:{role:'Staff'}}),
  mountView:()=>{throw new Error('PRIVATE_INTERNAL_EXAMPLE');}
 });
 bridge.connect();h.detail.open=true;h.detail.fire('toggle');
 assert.equal(h.region.hidden,true);
 assert.equal(h.region.children.length,0);
});

test('P0-24 mock bridge cannot access PHI, RPC or overwrite current Records logic',()=>{
 const core=tags.slice(0,tags.indexOf('  function createRecordsBridge'));
 assert.doesNotMatch(core,/google\.script|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|allData|currentUser|PatientName|PasswordHash|appendRow|setValues?\s*\(/i);
 assert.doesNotMatch(tags,/\b(?:google\.script|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|allData|saveRecord\s*\(|appendRow|setValues?\s*\(|setProperty\s*\()/i);
 assert.doesNotMatch(tags,/\b(?:getDengueWorkspace|listDengueCasesForEvent|d331P022b2ListCasesForEvent_)\s*\(/);
 assert.match(src,/NOT_EVALUATED/);
 assert.match(src,/D331 OFF/);
 assert.match(mockRead,/if\(!currentUser\)d331P020PreviewBridge_\.reset\(\);/);
 assert.ok(!layout.includes('id="page-dengue"'));
});
