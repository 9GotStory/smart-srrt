import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAS_HTML_SOURCES,GAS_SERVER_SOURCES} from '../tools/native-sources.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const native=read('src/web/03h-client-event-records.html');
const nativeStyles=read('src/web/01-styles.html');
const canonical=read('src/web/03m-client-d331-mvp01-offline.html');
const canonicalPlan=read('src/web/03n-client-d331-case-plan-offline.html');
const layout=read('src/web/02-app-layout.html');
const records=read('src/web/03h-client-event-records.html');
const reader=read('src/dengue/15-p0-22b2-case-read-integration.gs');
const canonicalCss=canonical.match(/<style>\n([\s\S]*?)\n<\/style>/)?.[1];
const canonicalJs=canonical.match(/<script>\n([\s\S]*?)\n<\/script>/)?.[1];
const cssMark='/* P0-25: exact synthetic CSS mirror of unregistered P0-23/P0-24 source. */\n';
const jsMark='// Standalone 03m source and native 03h mirror are parity-tested; no D331 RPC.\n';
const extract=(s,a,end)=>{
 const start=s.indexOf(a);
 assert.ok(start>=0,'missing native mirror start');
 const finish=s.indexOf(end,start+a.length);
 assert.ok(finish>start,'missing native mirror end');
 return s.slice(start+a.length,finish);
};
class Element {
 constructor(name,doc){this.tagName=name;this.ownerDocument=doc;this.children=[];
  this.attrs={};this.listeners={};this.textContent='';this.hidden=true;this.open=false;this.disabled=false;}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(...children){this.children=children;}
 setAttribute(key,val){this.attrs[key]=val;}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 fire(name){for(const f of this.listeners[name]??[])f();}
}
function harness(){
 const doc={createElement(tag){return new Element(tag,doc);}};
 const details=new Element('details',doc),region=new Element('section',doc);
 const auth={token:'SYNTHETIC_SESSION',user:{role:'Staff'},allow:true};
 const lookup=id=>id==='d331-p018-preview'?details:id==='d331-p024-region'?region:null;
 const ctx=vm.createContext({Promise,Date,el:lookup,token:auth.token,
  currentUser:auth.user,roleCanRecord:()=>auth.allow});
 const code=native.match(/<script>\n([\s\S]*?)\n<\/script>/)?.[1];
 assert.ok(code);
 new vm.Script(code,{filename:'03h-client-event-records.html'}).runInContext(ctx,{timeout:1500});
 function nodes(pred){
  const found=[];
  function walk(node){if(pred(node))found.push(node);node.children.forEach(walk);}
  walk(region);return found;
 }
 const button=label=>nodes(n=>n.tagName==='button'&&n.textContent===label)[0];
 const open=state=>{details.open=state;details.fire('toggle');};
 return {ctx,details,region,auth,nodes,button,open,bridge:ctx.d331P024RecordsMockBridge_};
}

test('P0-25 keeps Native26 canonical: exactly eight GS and seventeen HTML with no new module',()=>{
 assert.equal(GAS_SERVER_SOURCES.length,8);
 assert.equal(GAS_HTML_SOURCES.length,17);
 assert.ok(GAS_HTML_SOURCES.includes('src/web/03h-client-event-records.html'));
 assert.equal(GAS_HTML_SOURCES.some(x=>x.includes('03m-client-d331-mvp01-offline')),false);
 assert.equal((native.match(/<style>/g)||[]).length,0);
 assert.equal((nativeStyles.match(/<style>/g)||[]).length,1);
 assert.equal((native.match(/<script>/g)||[]).length,1);
 assert.match(reader,/D331_P022B2_ENABLED_ = false/);
 assert.match(reader,/D331_P022B2_REVOCATION_APPROVED_ = false/);
 assert.match(reader,/D331_P022B2_APPROVED_FIELDS_ = \[\]/);
 assert.ok(layout.includes('id="d331-p024-region"'));
 assert.ok(records.includes('d331P024RecordsMockBridge_.mount()'));
 assert.ok(records.includes('d331P024RecordsMockBridge_.reset()'));
 assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
});

test('P0-25 registered style/script are exact mirrors of separate canonical offline mock source',()=>{
 assert.equal(typeof canonicalCss,'string');
 assert.equal(typeof canonicalJs,'string');
 assert.equal(extract(nativeStyles,cssMark,'\n\n/* UX-R1 Dashboard UI */'),canonicalCss);
 assert.equal(extract(native,jsMark,'\n</script>'),canonicalJs);
 const planJs=canonicalPlan.match(/<script>\n([\s\S]*?)\n<\/script>/)?.[1];
 assert.equal(typeof planJs,'string');
 assert.equal(extract(native,'// P0-31B: exact Plan mirror begins.\n','\n// P0-31B: exact Plan mirror ends.'),planJs);
 assert.equal(GAS_HTML_SOURCES.some(x=>x.includes('03n-client-d331-case-plan-offline')),false);
 assert.doesNotMatch(planJs,/google\.script|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|allData|setValues?\s*\(|appendRow\s*\(/i);
 assert.doesNotMatch(canonicalJs,/google\.script|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|allData|setValues?\s*\(|appendRow\s*\(/i);
 assert.match(canonicalJs,/SYNTHETIC_ONLY/);
 assert.match(canonicalJs,/NOT_EVALUATED/);
});

test('P0-25 Native26 registered module initializes without mounting or RPC',()=>{
 const h=harness();
 assert.equal(typeof h.bridge.mount,'function');
 assert.equal(h.region.children.length,0);
 assert.equal(h.region.hidden,true);
 h.bridge.mount();
 assert.equal(h.region.children.length,0);
 assert.equal(h.region.hidden,true);
});

test('P0-25 only explicit authenticated Records preview opening shows local synthetic Case form',()=>{
 const h=harness();h.bridge.mount();
 h.open(true);
 assert.equal(h.region.hidden,false);
 assert.ok(h.button('เพิ่ม Case ตัวอย่าง'));
 assert.ok(h.button('แก้ไขตัวอย่าง'));
 assert.ok(h.button('สร้าง Plan ตัวอย่าง'),'T2 composes the exact Plan model into existing Records');
 assert.equal(h.nodes(n=>n.tagName==='table').length,1);
 assert.equal(h.nodes(n=>n.textContent.includes('ตัวอย่างเท่านั้น · D331 OFF')).length,1);
 assert.equal(h.nodes(n=>n.textContent.includes('NOT_EVALUATED')).length,1);
 h.bridge.mount();h.bridge.mount();
 assert.equal(h.details.listeners.toggle.length,1);
 assert.equal(h.region.children.length,1);
});

test('P0-25 guest cannot open; logout clears visible fake Case and active draft',()=>{
 const h=harness();h.ctx.token='';h.ctx.currentUser=null;h.bridge.mount();h.open(true);
 assert.equal(h.details.open,false);
 assert.equal(h.region.children.length,0);
 h.ctx.token=h.auth.token;h.ctx.currentUser=h.auth.user;
 h.open(true);assert.ok(h.button('เพิ่ม Case ตัวอย่าง'));
 h.button('เพิ่ม Case ตัวอย่าง').fire('click');
 assert.ok(h.button('ยกเลิก'));
 h.ctx.token='';h.ctx.currentUser=null;
 h.bridge.reset();
 assert.equal(h.details.open,false);
 assert.equal(h.region.hidden,true);
 assert.equal(h.region.children.length,0);
});

test('P0-25 drop of Records role or changed account disposes local mock and requires reopening',()=>{
 for(const change of [
  h=>{h.auth.allow=false;},
  h=>{h.ctx.token='NEW_ACCOUNT_TOKEN';h.ctx.currentUser={role:'Staff'};}
 ]){
  const h=harness();h.bridge.mount();h.open(true);
  h.button('เพิ่ม Case ตัวอย่าง').fire('click');
  change(h);h.bridge.mount();
  assert.equal(h.region.children.length,0);
  assert.equal(h.details.open,false);
  assert.equal(h.region.hidden,true);
 }
});

test('P0-25 real native Case UI can add/edit a fake Case and resets across close',async()=>{
 const h=harness();h.bridge.mount();h.open(true);
 h.button('เพิ่ม Case ตัวอย่าง').fire('click');
 assert.equal(h.button('บันทึกแบบจำลอง').disabled,true);
 const d=h.nodes(n=>n.tagName==='input'&&n.type==='date')[0];
 d.value='2026-10-19';d.fire('change');
 const save=h.button('บันทึกแบบจำลอง');
 assert.equal(save.disabled,false);
 save.fire('click');
 assert.equal(h.region.children[0].attrs['aria-busy'],'true');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children.length,2);
 assert.equal(h.region.children[0].attrs['aria-busy'],'false');
 h.button('แก้ไขตัวอย่าง').fire('click');
 const select=h.nodes(n=>n.tagName==='select')[0];select.value='CONFIRMED';select.fire('change');
 h.button('บันทึกแบบจำลอง').fire('click');
 await new Promise(resolve=>setImmediate(resolve));
 const rows=h.nodes(n=>n.tagName==='tbody')[0].children;
 assert.equal(rows[0].children[1].textContent,'2');
 assert.equal(rows[0].children[2].textContent,'CONFIRMED');
 h.open(false);
 assert.equal(h.region.children.length,0);
 h.open(true);
 assert.equal(h.nodes(n=>n.tagName==='tbody')[0].children.length,1);
});

test('P0-25 native runtime source has no unauthorized case API, PHI export or extra routes',()=>{
 const script=extract(native,jsMark,'\n</script>');
 assert.doesNotMatch(script,/\bgoogle\.script\.run\b|\bgetDb_\s*\(|\bgs\s*\(|\bfetch\s*\(|\bSpreadsheetApp\b|\bPropertiesService\b/);
 assert.doesNotMatch(script,/\b(?:getDengueWorkspace|d331P022b2ListCasesForEvent_)\s*\(/);
 assert.doesNotMatch(script,/\b(?:PatientName|CitizenID|PasswordHash|NationalID)\b/);
 assert.match(script,/D331 OFF/);
 assert.equal((script.match(/\bboot\(\);/g)||[]).length,0);
});
