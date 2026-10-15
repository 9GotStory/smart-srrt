// UX-R1/P8-01 — independent Record tab panels and keyboard contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const markup=read('src/web/03-modals.html');
const records=read('src/web/03h-client-event-records.html');
const css=read('src/styles/shared-ui.css');
const compiled=read('src/web/01-styles.html');
const groups=['receive','place','verify','investigate','review'];

function fixture(){
  const nodes=new Map();
  let focused='';
  let navigated=0;
  let calls=0;
  function el(id){
    if(!nodes.has(id)){
      const classes=new Set();
      const attrs=new Map();
      nodes.set(id,{
        id,hidden:false,tabIndex:0,scrollTop:0,value:'',textContent:'',innerHTML:'',
        options:[],disabled:false,style:{display:''},dataset:{},
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},
        focus(){focused=id;},
        setAttribute(k,v){attrs.set(k,String(v));},
        getAttribute(k){return attrs.get(k)||null;},
        removeAttribute(k){attrs.delete(k);},
        contains(){return false;}
      });
    }
    return nodes.get(id);
  }
  const context=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){}},
    window:{location:{set href(_){navigated++}}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},
    setTimeout(){},clearTimeout(){},console,confirm:()=>true
  });
  for(const item of readOrderedClientScripts()){
    const script=item.path==='src/web/04-browser-app.html'
      ?item.code.replace(/^\s*boot\(\);\s*$/m,''):item.code;
    new vm.Script(script,{filename:item.path}).runInContext(context,{timeout:2000});
  }
  el('recordForm').contains=element=>groups.some(id=>element===el('record-group-'+id));
  vm.runInContext('buildRecordForm()',context);
  el('recordModal').classList.add('open');
  vm.runInContext('selectRecordTab("receive")',context);
  context.gs=()=>{calls++;throw Error('Unexpected RPC in tab selection')};
  return {context,el,focused:()=>focused,navigated:()=>navigated,calls:()=>calls};
}

function checkOnlyActive(h,active){
  for(const id of groups){
    const selected=id===active;
    assert.equal(h.el('record-tab-'+id).getAttribute('aria-selected'),String(selected),id+' aria-selected');
    assert.equal(h.el('record-tab-'+id).tabIndex,selected?0:-1,id+' tabindex');
    assert.equal(h.el('record-group-'+id).hidden,!selected,id+' panel hidden');
  }
}

test('P8-01 five true tabs, panels and CSS parity; no fragment anchors',()=>{
  assert.match(markup,/role="tablist" aria-label="หัวข้อข้อมูลเหตุการณ์"/);
  assert.match(markup,/onkeydown="handleRecordTabKeys\(event\)"/);
  assert.doesNotMatch(markup,/<a\s+href="#record-group-/);
  for(const id of groups){
    assert.ok(markup.includes('role="tab" id="record-tab-'+id+'" aria-controls="record-group-'+id+'"'),id);
    assert.ok(markup.includes('onclick="selectRecordTab(\''+id+'\')"'),id);
  }
  assert.equal((markup.match(/role="tab"/g)||[]).length,5);
  assert.match(css,/#recordModal \.srrt-record-section\[hidden\]\{display:none!important\}/);
  assert.match(css,/#recordModal \.srrt-record-tabs button\[aria-selected="true"\]/);
  assert.match(css,/overflow-x:auto/);
  assert.ok(compiled.includes('#recordModal .srrt-record-section[hidden]{display:none!important}'));
  assert.ok(compiled.includes('#recordModal .srrt-record-tabs button[aria-selected="true"]'));
  const h=fixture();
  const built=h.el('recordForm').innerHTML;
  assert.equal((built.match(/role="tabpanel"/g)||[]).length,5);
  assert.equal((built.match(/tabindex="0"/g)||[]).length,5);
  for(const id of groups){
    assert.ok(built.includes('id="record-group-'+id+'" role="tabpanel" aria-labelledby="record-tab-'+id+'"'),id);
  }
  const cols=vm.runInContext('fields.map(f=>f[0])',h.context);
  assert.equal(cols.length,26);
  for(const col of cols)assert.equal((built.match(new RegExp('id="in'+col+'"','g'))||[]).length,1,'persisted col'+col);
});

test('P8-01 each tab hides four panels, preserves all 26 controls, values, draft and URL',()=>{
  const h=fixture();
  const html=h.el('recordForm').innerHTML;
  const token=vm.runInContext('token',h.context);
  h.el('in6').value='Synthetic disease event';
  h.el('in11').value='Synthetic tambon';
  for(const id of groups){
    h.el('recordModal').scrollTop=81;
    vm.runInContext('selectRecordTab('+JSON.stringify(id)+')',h.context);
    checkOnlyActive(h,id);
    assert.equal(h.el('recordModal').scrollTop,0);
    assert.equal(h.el('recordForm').innerHTML,html,'must not rebuild controls');
    assert.equal(h.el('in6').value,'Synthetic disease event');
    assert.equal(h.el('in11').value,'Synthetic tambon');
  }
  assert.equal(vm.runInContext('recordDraftChanged()',h.context),true);
  assert.equal(vm.runInContext('token',h.context),token);
  assert.equal(h.calls(),0);
  assert.equal(h.navigated(),0);
});

test('P8-01 ArrowLeft/ArrowRight/Home/End wrap, select and focus tab',()=>{
  const h=fixture();
  const press=(key,origin)=>{
    let prevented=0;
    h.context.tabKeyEvent={key,target:h.el('record-tab-'+origin),preventDefault(){prevented++}};
    vm.runInContext('handleRecordTabKeys(tabKeyEvent)',h.context);
    return prevented;
  };
  assert.equal(press('ArrowLeft','receive'),1);
  checkOnlyActive(h,'review');
  assert.equal(h.focused(),'record-tab-review');
  assert.equal(press('ArrowRight','review'),1);
  checkOnlyActive(h,'receive');
  assert.equal(h.focused(),'record-tab-receive');
  assert.equal(press('End','receive'),1);
  checkOnlyActive(h,'review');
  assert.equal(press('Home','review'),1);
  checkOnlyActive(h,'receive');
  assert.equal(press('Tab','receive'),0);
  checkOnlyActive(h,'receive');
  assert.equal(press('ArrowRight','not-a-tab'),0);
  checkOnlyActive(h,'receive');
  assert.equal(h.navigated(),0);
});

test('P8-01 invalid ID, closed modal and non-member panels have no effects',()=>{
  const h=fixture();
  h.el('recordModal').scrollTop=71;
  vm.runInContext('selectRecordTab("invalid",true)',h.context);
  assert.equal(h.el('recordModal').scrollTop,71);
  checkOnlyActive(h,'receive');
  h.el('recordModal').classList.remove('open');
  vm.runInContext('selectRecordTab("place",true)',h.context);
  assert.equal(h.el('recordModal').scrollTop,71);
  checkOnlyActive(h,'receive');
  h.el('recordModal').classList.add('open');
  h.el('recordForm').contains=()=>false;
  vm.runInContext('selectRecordTab("place",true)',h.context);
  assert.equal(h.el('recordModal').scrollTop,71);
  checkOnlyActive(h,'receive');
  assert.equal(h.calls(),0);
  assert.equal(h.navigated(),0);
});

test('P8-01 opening another Record starts first tab and unsaved cancellation still warns',()=>{
  const h=fixture();
  vm.runInContext('currentUser={name:"Synthetic",role:"Admin"};token="test-session"',h.context);
  vm.runInContext('selectRecordTab("review")',h.context);
  checkOnlyActive(h,'review');
  vm.runInContext('openRecordForm("add")',h.context);
  checkOnlyActive(h,'receive');
  h.el('in6').value='Synthetic unsaved record';
  vm.runInContext('selectRecordTab("investigate")',h.context);
  assert.equal(h.el('in6').value,'Synthetic unsaved record');
  let warned=0;
  h.context.confirm=()=>{warned++;return false;};
  vm.runInContext('cancelRecordForm()',h.context);
  assert.equal(warned,1);
  assert.equal(h.el('recordModal').classList.contains('open'),true);
  assert.equal(h.el('in6').value,'Synthetic unsaved record');
  assert.match(records,/Number\(el\('editRevision'\)\.value\|\|0\)/);
  assert.equal(h.calls(),0);
});
