// UX-R1/P4-01: filtered Event rows preserve original allData indices and privacy.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const layout=fs.readFileSync(new URL('../src/web/02-app-layout.html',import.meta.url),'utf8');
const records=fs.readFileSync(new URL('../src/web/03h-client-event-records.html',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/web/03c-client-auth.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles/shared-ui.css',import.meta.url),'utf8');

function fixture(){
  const nodes=new Map();
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{
      value:'',innerHTML:'',textContent:'',disabled:false,style:{display:''},
      classList:{add(){},remove(){},contains(){return false}},
      setAttribute(){},removeAttribute(){},focus(){}
    });
    return nodes.get(id);
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){}},
    localStorage:{getItem(){return null},removeItem(){},setItem(){}},
    google:{script:{run:{}}},
    setTimeout(){},console
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path})
      .runInContext(ctx,{timeout:2000});
  }
  return {ctx,el};
}

test('P4-01 UI has one Event table with search/filter/reset and responsive card CSS',()=>{
  const page=layout.split('<section id="page-records"')[1].split('</section>')[0];
  for(const id of ['recordSearch','recordStatusFilter','recordDiseaseFilter','recordResultSummary','recordBody'])
    assert.match(page,new RegExp('id="'+id+'"'));
  assert.match(page,/class="srrt-record-table"/);
  assert.match(page,/oninput="renderTables\(\)"/);
  assert.match(page,/onclick="resetRecordFilters\(\)"/);
  assert.equal((page.match(/id="recordBody"/g)||[]).length,1);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/content:attr\(data-label\)/);
  assert.match(records,/visibleRecords\.map\(\(\{r,i\}\)=>/);
  assert.match(auth,/currentUser=null;allData=\[\];dashboardSummary=null;.*invalidateEventActionUi\(\);discardRecordFormOnLogout\(\);renderTables\(\)/);
});

test('P4-01 search, disease and status filter return original event indices',()=>{
  const {ctx,el}=fixture();
  vm.runInContext("currentUser={role:'Staff',name:'Tester'}",ctx);
  vm.runInContext("allData=[{eventId:'E1',col5:'ไข้หวัดใหญ่',col6:'กลุ่ม A',col29:'บ้านเหนือ',recordStatus:'active'},{eventId:'E2',col5:'ไข้เลือดออก',col6:'กลุ่ม B',col29:'บ้านใต้',recordStatus:'closed'},{eventId:'E3',col5:'ไข้เลือดออก',col6:'กลุ่ม C',col29:'บ้านกลาง',recordStatus:'active'}]",ctx);
  vm.runInContext('updateRecordFilterOptions()',ctx);
  assert.match(el('recordDiseaseFilter').innerHTML,/ไข้เลือดออก/);
  el('recordSearch').value='บ้านกลาง';
  assert.equal(JSON.stringify(vm.runInContext('filteredRecordEntries().map(x=>x.i)',ctx)),'[2]');
  el('recordSearch').value='';
  el('recordStatusFilter').value='closed';
  assert.equal(JSON.stringify(vm.runInContext('filteredRecordEntries().map(x=>x.i)',ctx)),'[1]');
  el('recordStatusFilter').value='';
  el('recordDiseaseFilter').value='ไข้เลือดออก';
  assert.equal(JSON.stringify(vm.runInContext('filteredRecordEntries().map(x=>x.i)',ctx)),'[1,2]');
});

test('P4-01 guest filter is empty and logout clearing removes private filter values',()=>{
  const {ctx,el}=fixture();
  vm.runInContext("allData=[{eventId:'PRIVATE',col5:'private-group'}];currentUser=null",ctx);
  el('recordSearch').value='PRIVATE';
  el('recordDiseaseFilter').value='private-group';
  assert.equal(JSON.stringify(vm.runInContext('filteredRecordEntries()',ctx)),'[]');
  vm.runInContext('clearRecordFilters()',ctx);
  assert.equal(el('recordSearch').value,'');
  assert.equal(el('recordDiseaseFilter').value,'');
  assert.doesNotMatch(el('recordDiseaseFilter').innerHTML,/private-group/);
});
