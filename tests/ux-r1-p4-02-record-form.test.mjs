// UX-R1/P4-02 — native incident form grouping and unsaved-change contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read = name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const markup=read('src/web/03-modals.html');
const records=read('src/web/03h-client-event-records.html');
const auth=read('src/web/03c-client-auth.html');
const css=read('src/styles/shared-ui.css');

function fixture(){
  const elements=new Map();
  const el=id=>{
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{
        id,value:'',innerHTML:'',textContent:'',disabled:false,options:[],
        style:{display:''},dataset:{},
        classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
        focus(){},setAttribute(){},removeAttribute(){}
      });
    }
    return elements.get(id);
  };
  const context=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){}},
    localStorage:{getItem(){return null},removeItem(){},setItem(){}},
    google:{script:{run:{}}},
    setTimeout(){},console,confirm:()=>true
  });
  for(const item of readOrderedClientScripts()){
    const code=item.path==='src/web/04-browser-app.html'
      ?item.code.replace(/^\s*boot\(\);\s*$/m,''):item.code;
    new vm.Script(code,{filename:item.path}).runInContext(context,{timeout:2000});
  }
  return {context,el};
}

test('P4-02 one dialog, five accessible tabs and preserved Record controls',()=>{
  assert.match(markup,/id="recordModal" role="dialog" aria-modal="true" aria-labelledby="recordTitle"/);
  assert.match(markup,/id="recordForm" class="srrt-record-form"/);
  assert.match(markup,/onclick="cancelRecordForm\(\)"/);
  assert.match(markup,/id="recordDraftStatus"[^>]*role="status"/);
  assert.equal((markup.match(/id="recordForm"/g)||[]).length,1);
  assert.match(markup,/class="srrt-record-tabs" role="tablist"/);
  for(const name of ['receive','place','verify','investigate','review']){
    assert.ok(markup.includes(`role="tab" id="record-tab-${name}" aria-controls="record-group-${name}"`),name);
    assert.ok(markup.includes(`onclick="selectRecordTab('${name}')"`),name);
  }
  assert.match(css,/#recordModal \.srrt-record-section/);
});

test('P4-02 all 26 persisted field keys render once and preserve original colN mapping',()=>{
  const {context,el}=fixture();
  vm.runInContext('buildRecordForm()',context);
  const built=el('recordForm').innerHTML;
  const cols=vm.runInContext('fields.map(f=>f[0])',context);
  assert.equal(cols.length,26);
  for(const col of cols){
    assert.equal((built.match(new RegExp('id="in'+col+'"','g'))||[]).length,1,'field duplicate/missing '+col);
    assert.match(built,new RegExp('<label for="in'+col+'">'));
  }
  const grouped=vm.runInContext('recordFieldGroups.flatMap(g=>g.keys)',context);
  assert.equal(new Set(grouped).size,26);
  assert.deepEqual(new Set(grouped),new Set(cols));
  assert.match(built,/id="record-group-review"/);
  assert.match(records,/data\['col'\+f\[0\]\]/);
  assert.match(records,/Number\(el\('editRevision'\)\.value\|\|0\)/);
});

test('P4-02 cancel warns only when edited and leaves the modal open on refusal',()=>{
  const {context,el}=fixture();
  vm.runInContext('currentUser={role:"Admin",name:"Tester"};buildRecordForm();openRecordForm("add")',context);
  let confirmations=0;
  context.confirm=()=>{confirmations++;return false;};
  vm.runInContext('cancelRecordForm()',context);
  assert.equal(confirmations,0);
  assert.equal(el('recordModal').classList.contains('open'),false);
  vm.runInContext('openRecordForm("add")',context);
  el('in6').value='changed';
  vm.runInContext('cancelRecordForm()',context);
  assert.equal(confirmations,1);
  assert.equal(el('recordModal').classList.contains('open'),true);
  context.confirm=()=>true;
  vm.runInContext('cancelRecordForm()',context);
  assert.equal(el('recordModal').classList.contains('open'),false);
});

test('P4-02 save prevents duplicate RPC and keeps revision; logout invalidates private form',async()=>{
  const {context,el}=fixture();
  vm.runInContext('currentUser={role:"Admin",name:"Tester"};token="session";buildRecordForm();openRecordForm("add")',context);
  el('in6').value='Synthetic test event';
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const calls=[];
  context.gs=(...args)=>{calls.push(args);return pending;};
  context.loadDashboard=async()=>{};
  const first=vm.runInContext('saveRecord()',context);
  const second=vm.runInContext('saveRecord()',context);
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'addRecord');
  assert.equal(calls[0][2].col6,'Synthetic test event');
  assert.equal(el('saveRecordBtn').disabled,true);
  vm.runInContext('cancelRecordForm()',context);
  assert.equal(el('recordModal').classList.contains('open'),true);
  release('Saved');
  await Promise.all([first,second]);
  assert.equal(el('recordModal').classList.contains('open'),false);
  assert.equal(el('saveRecordBtn').disabled,false);
  vm.runInContext('openRecordForm("add")',context);
  el('in6').value='Private draft';
  vm.runInContext('currentUser=null;token="";discardRecordFormOnLogout()',context);
  assert.equal(el('in6').value,'');
  assert.equal(el('recordModal').classList.contains('open'),false);
  assert.match(auth,/discardRecordFormOnLogout\(\)/);
});
