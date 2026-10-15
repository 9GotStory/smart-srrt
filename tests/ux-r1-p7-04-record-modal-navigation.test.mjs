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
  for(const group of groups){
    assert.match(markup,new RegExp('<button type="button" onclick="jumpRecordGroup\\(\\\''+group+'\\\'\\)"[^>]*>'));
    assert.match(source,new RegExp('id="record-group-'+group+'"'));
  }
  assert.equal((markup.match(/onclick="jumpRecordGroup\('/g)||[]).length,5);
  assert.match(css,/#recordModal \.srrt-record-anchor-nav button\{/);
  assert.ok(generated.includes('#recordModal .srrt-record-anchor-nav button{'));
});

test('P7-04 section jump scrolls only Record modal and focuses target heading',()=>{
  const h=fixture();
  const before=h.element('in6').value='Synthetic unsaved draft';
  const oldToken=vm.runInContext('token',h.context);
  vm.runInContext('jumpRecordGroup("receive")',h.context);
  assert.equal(h.modal.scrollTop,364); // 100 + (300 - 20) - 16
  assert.equal(h.active().id,'record-heading-receive');
  assert.equal(h.active().options.preventScroll,true);
  assert.equal(h.element('in6').value,before);
  assert.equal(vm.runInContext('token',h.context),oldToken);
  assert.equal(h.navigated(),false);
});

test('P7-04 all sections work and invalid/closed/outside targets are no-ops',()=>{
  const h=fixture();
  for(const group of groups){
    h.modal.scrollTop=100;
    vm.runInContext('jumpRecordGroup('+JSON.stringify(group)+')',h.context);
    assert.equal(h.modal.scrollTop,364,group);
    assert.equal(h.active().id,'record-heading-'+group);
  }
  h.modal.scrollTop=100;
  vm.runInContext('jumpRecordGroup("unknown")',h.context);
  assert.equal(h.modal.scrollTop,100);
  h.modal.classList.remove('open');
  vm.runInContext('jumpRecordGroup("receive")',h.context);
  assert.equal(h.modal.scrollTop,100);
  h.modal.classList.add('open');
  h.modal.contains=()=>false;
  vm.runInContext('jumpRecordGroup("receive")',h.context);
  assert.equal(h.modal.scrollTop,100);
  assert.equal(h.navigated(),false);
});

test('P7-04 accessibility and Record save/revision scope remain unchanged',()=>{
  assert.match(source,/tabindex="-1" aria-labelledby="record-heading-/);
  assert.match(source,/Number\(el\('editRevision'\)\.value\|\|0\)/);
  assert.match(source,/function cancelRecordForm\(\)/);
  assert.match(source,/function recordDraftChanged\(\)/);
  assert.match(markup,/id="recordModal" role="dialog" aria-modal="true"/);
  assert.match(markup,/id="saveRecordBtn"/);
});
