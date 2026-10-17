import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const rootDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(rootDir,'src/web/03l-client-d331-status.html');
const code=fs.readFileSync(file,'utf8');
const found=code.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(found,'Offline D331 view script must exist');
const context=vm.createContext({});
vm.runInContext(found[1],context,{timeout:1000});
const ui=context.d331N1cStatusWorkspace_;

class SyntheticElement{
  constructor(tag,doc){
    this.tagName=tag;
    this.ownerDocument=doc;
    this.childNodes=[];
    this.attributes={};
    this.textContent='';
    this.className='';
    this.disabled=false;
  }
  appendChild(child){this.childNodes.push(child);return child;}
  replaceChildren(...children){this.childNodes=children;}
  setAttribute(key,val){this.attributes[key]=String(val);}
  getAttribute(key){return this.attributes[key]??null;}
}
const documentStub={createElement(tag){return new SyntheticElement(tag,documentStub);}};
function root(){return new SyntheticElement('section',documentStub);}
function descendants(node){
  return [node,...node.childNodes.flatMap(descendants)];
}
function statusText(node){
  return descendants(node).filter(n=>n.getAttribute('role')==='status').map(n=>n.textContent);
}
function buttons(node){return descendants(node).filter(n=>n.tagName==='button');}

test('D331 UX source registered inertly but still has no page, route or feature',()=>{
  const manifest=fs.readFileSync(path.join(rootDir,'tools/native-sources.mjs'),'utf8');
  const foundation=fs.readFileSync(path.join(rootDir,'src/dengue/00-g1a-foundation.gs'),'utf8');
  const layout=fs.readFileSync(path.join(rootDir,'src/web/02-app-layout.html'),'utf8');
  assert.match(manifest,/03l-client-d331-status/);
  assert.doesNotMatch(manifest,/03-n1b1-trusted|04-n1b2b-mock/);
  assert.doesNotMatch(layout,/03l-client-d331-status|page-dengue|data-page="dengue"/);
  assert.match(foundation,/var D331_G1A_ENABLED = false;/);
  assert.ok(code.includes('Inert Native26 source partial'));
});
test('unknown/forged/client READY state fails closed to OFF',()=>{
  for(const invalid of ['READY','ENABLED','__proto__','constructor','',null,
      undefined,{},[],{state:'READY'},'<img src=x onerror=alert(1)>']){
    const n=root();
    const outcome=ui.render(n,invalid);
    assert.equal(outcome.state,'OFF');
    assert.equal(outcome.actionsEnabled,false);
    assert.equal(outcome.patientDataRendered,false);
    assert.equal(n.getAttribute('aria-busy'),'false');
    assert.deepEqual(buttons(n).map(b=>b.disabled),[true,true]);
  }
});
test('all seven static allowed UX states retain disabled controls and sanitized fixed status',()=>{
  const expected=['OFF','AUTH_REQUIRED','POLICY_HOLD','NO_GRANT',
    'LOADING','EMPTY','ERROR'];
  for(const state of expected){
    const n=root(),output=ui.render(n,state);
    assert.equal(output.state,state);
    assert.equal(output.actionsEnabled,false);
    assert.equal(output.patientDataRendered,false);
    assert.equal(buttons(n).length,2);
    assert.ok(buttons(n).every(b=>b.disabled&&b.getAttribute('aria-disabled')==='true'));
    assert.ok(buttons(n).every(b=>b.getAttribute('type')==='button'));
    assert.equal(statusText(n).length,1);
    assert.equal(statusText(n)[0].length>0,true);
    assert.equal(descendants(n).filter(x=>x.getAttribute('aria-live')==='polite').length,1);
  }
});
test('LOADING has aria-busy and accessible neutral skeleton; resets clear loading',()=>{
  const n=root();
  ui.render(n,'LOADING');
  assert.equal(n.getAttribute('aria-busy'),'true');
  assert.equal(descendants(n).filter(x=>x.className==='srrt-d331-workspace__skeleton').length,1);
  assert.equal(descendants(n).filter(x=>x.getAttribute('aria-hidden')==='true').length,1);
  ui.render(n,'ERROR');
  assert.equal(n.getAttribute('aria-busy'),'false');
  assert.equal(descendants(n).filter(x=>x.className==='srrt-d331-workspace__skeleton').length,0);
});
test('rerender and reset clear prior state without duplicated headings, cards or actions',()=>{
  const n=root();
  for(let i=0;i<12;i++){
    ui.render(n,i%2?'NO_GRANT':'AUTH_REQUIRED');
    assert.equal(descendants(n).filter(x=>x.tagName==='h2').length,1);
    assert.equal(descendants(n).filter(x=>x.tagName==='section').length,2);
    assert.equal(buttons(n).length,2);
  }
  assert.equal(ui.reset(n).state,'OFF');
  assert.equal(n.childNodes.length,1);
  assert.equal(buttons(n).length,2);
  assert.equal(statusText(n)[0].includes('ยังไม่เปิดใช้งาน'),true);
});
test('no patient input, HTML injection, RPC, auth mutation or Google/Apps Script API',()=>{
  assert.doesNotMatch(code,/\b(?:google\.script|SpreadsheetApp|DriveApp|PropertiesService|ScriptApp|UrlFetchApp|fetch\s*\(|XMLHttpRequest|innerHTML|insertAdjacentHTML|localStorage|sessionStorage|onclick\s*=|addEventListener\s*\()/i);
  const raw='SECRET_PATIENT_ABC_123';
  const n=root();
  const state={toString(){throw new Error('untrusted object stringified');},patientName:raw};
  assert.equal(ui.render(n,state).state,'OFF');
  assert.equal(JSON.stringify(n).includes(raw),false);
  assert.ok(descendants(n).every(x=>x.textContent!==raw));
});
test('no DOM mutation before explicitly injected root and no unexpected hooks',()=>{
  assert.deepEqual(Object.keys(context).sort(),['d331N1cStatusWorkspace_']);
  assert.deepEqual(Object.keys(ui).sort(),['closedReadiness','createOfflineController','invalidateSession','knownState','render','reset']);
  assert.throws(()=>ui.render(null,'OFF'),/D331_N1C_INVALID_ROOT/);
  assert.throws(()=>ui.render({replaceChildren(){}},'OFF'),/D331_N1C_INVALID_ROOT/);
});
