// UX-R1/P7-04: TEST v13 blank-panel regression caused by fragment anchors inside HtmlService.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const markup=read('src/web/03-modals.html');
const source=read('src/web/03h-client-event-records.html');
const css=read('src/styles/shared-ui.css');
const generated=read('src/web/01-styles.html');
const head=read('src/web/00-document-head.html');
const groups=['receive','place','verify','investigate','review'];

function fixture(){
  const nodes=new Map();
  let active=null;
  let locationChanged=false;
  function element(id){
    if(!nodes.has(id)){
      const classes=new Set();
      const n={id,scrollTop:0,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,
        style:{display:''},dataset:{},options:[],
        classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},
        getBoundingClientRect(){return {top:0}},contains(){return false},
        focus(options){active={id,options}},setAttribute(){},removeAttribute(){}
      };
      nodes.set(id,n);
    }
    return nodes.get(id);
  }
  const context=vm.createContext({
    document:{readyState:'loading',getElementById:element,addEventListener(){}},
    window:{location:{set href(_){locationChanged=true}}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},console,
    confirm:()=>true
  });
  for(const {path,code} of readOrderedClientScripts()){
    const script=path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(script,{filename:path}).runInContext(context,{timeout:3000});
  }
  const modal=element('recordModal');
  modal.classList.add('open');
  modal.scrollTop=100;
  modal.getBoundingClientRect=()=>({top:20});
  element('recordForm').contains=node=>groups.some(g=>node===element('record-group-'+g));
  modal.contains=node=>groups.some(g=>node===element('record-group-'+g));
  for(const group of groups){
    const section=element('record-group-'+group);
    section.getBoundingClientRect=()=>({top:300});
    element('record-heading-'+group);
  }
  return {context,element,modal,active:()=>active,navigated:()=>locationChanged};
}

test('P7-04 record section actions are buttons, not iframe-escaping href fragments',()=>{
  assert.match(head,/<base target="_top">/);
  assert.doesNotMatch(markup,/<a\s+href="#record-group-/);
  const h=fixture();
  vm.runInContext('buildRecordForm()',h.context);
  const actualForm=h.element('recordForm').innerHTML;
  assert.match(markup,/role="tablist"/);
  for(const group of groups){
    assert.ok(markup.includes('role="tab" id="record-tab-'+group+'"'),group);
    assert.ok(markup.includes('onclick="selectRecordTab(\''+group+'\')"'),group);
    assert.ok(actualForm.includes('id="record-group-'+group+'"'),group+' generated section');
  }
  assert.equal((markup.match(/onclick="selectRecordTab\('/g)||[]).length,5);
  assert.match(css,/#recordModal \.srrt-record-tabs button\{/);
  assert.ok(generated.includes('#recordModal .srrt-record-tabs button{'));
});

test('P7-04 Record tab selection remains in modal and preserves unsaved data',()=>{
  const h=fixture();
  const before=h.element('in6').value='Synthetic unsaved draft';
  const oldToken=vm.runInContext('token',h.context);
  vm.runInContext('selectRecordTab("receive",true)',h.context);
  assert.equal(h.modal.scrollTop,0);
  assert.equal(h.active().id,'record-tab-receive');
  assert.equal(h.element('in6').value,before);
  assert.equal(vm.runInContext('token',h.context),oldToken);
  assert.equal(h.navigated(),false);
});

test('P7-04 five tabs have no iframe routing and invalid/closed/outside targets no-op',()=>{
  const h=fixture();
  for(const group of groups){
    h.modal.scrollTop=100;
    vm.runInContext('selectRecordTab('+JSON.stringify(group)+',true)',h.context);
    assert.equal(h.modal.scrollTop,0,group);
    assert.equal(h.active().id,'record-tab-'+group);
  }
  h.modal.scrollTop=100;
  vm.runInContext('selectRecordTab("unknown")',h.context);
  assert.equal(h.modal.scrollTop,100);
  h.modal.classList.remove('open');
  vm.runInContext('selectRecordTab("receive")',h.context);
  assert.equal(h.modal.scrollTop,100);
  h.modal.classList.add('open');
  h.element('recordForm').contains=()=>false;
  vm.runInContext('selectRecordTab("receive")',h.context);
  assert.equal(h.modal.scrollTop,100);
  assert.equal(h.navigated(),false);
});

test('P7-04 accessibility and Record save/revision scope remain unchanged',()=>{
  assert.ok(source.includes('id="record-heading-${group.id}" tabindex="-1"'));
  assert.match(source,/Number\(el\('editRevision'\)\.value\|\|0\)/);
  assert.match(source,/function cancelRecordForm\(\)/);
  assert.match(source,/function recordDraftChanged\(\)/);
  assert.match(markup,/id="recordModal" role="dialog" aria-modal="true"/);
  assert.match(markup,/id="saveRecordBtn"/);
});
