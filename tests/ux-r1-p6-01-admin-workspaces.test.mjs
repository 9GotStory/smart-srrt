// UX-R1/P6-01 — seven role-gated, purely presentational Admin workspaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const layout=read('src/web/02-app-layout.html');
const admin=read('src/web/04-browser-app.html');
const auth=read('src/web/03c-client-auth.html');
const css=read('src/styles/shared-ui.css');
const keys=['overview','settings','users','master','areas','content','audit'];
function fixture(){
 const nodes=new Map(),calls=[],toasts=[];
 let focused='';
 const el=id=>{
   if(!nodes.has(id)){
     const c=new Set(),attrs=new Map();
     const node={id,value:'',hidden:false,innerHTML:'',textContent:'',tabIndex:-1,style:{display:''},
       dataset:{},classList:{add:v=>c.add(v),remove:v=>c.delete(v),contains:v=>c.has(v),toggle(v,on){if(on)c.add(v);else c.delete(v)}},
       setAttribute(k,v){attrs.set(k,v)},getAttribute(k){return attrs.get(k)||''},removeAttribute(k){attrs.delete(k)},focus(){focused=id}};
     nodes.set(id,node);
   }
   return nodes.get(id)
 };
 const doc={readyState:'loading',getElementById:el,addEventListener(){},
   querySelectorAll(){return[]},querySelector(){return null}};
 const ctx=vm.createContext({document:doc,
   localStorage:{getItem(){return null},setItem(){},removeItem(){}},
   google:{script:{run:new Proxy({}, {get(_t,name){calls.push(name);throw Error('unexpected RPC '+name)}})}},
   setTimeout(){},console});
 for(const {path,code} of readOrderedClientScripts()){
   const clean=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
   new vm.Script(clean,{filename:path}).runInContext(ctx,{timeout:2500});
 }
 ctx.toast=msg=>toasts.push(String(msg));
 return {ctx,el,calls,toasts,getFocused:()=>focused}
}
test('P6-01 seven Admin tabpanels, mobile selector and unchanged deliberate mutations',()=>{
  assert.equal((layout.match(/role="tabpanel"/g)||[]).length,7);
  assert.equal((layout.match(/role="tab" aria-controls=/g)||[]).length,7);
  for(const key of keys){
    for(const id of ['admin-tab-'+key,'admin-workspace-'+key])
      assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
    assert.match(layout,new RegExp('<option value="'+key+'">'));
  }
  for(const action of ['repairSystem()','saveSettings()','importAreaFile(this)','archiveAuditNow()','saveMasterDataAdminItem()'])
    assert.ok((layout+admin).includes(action),'must preserve explicit action '+action);
  assert.match(css,/srrt-admin-workspace\[hidden\]/);
});
test('P6-01 selecting workspaces is read-only and shares state with mobile picker',()=>{
  const h=fixture();vm.runInContext('currentUser={role:"Manager"}',h.ctx);
  for(const key of keys){
    vm.runInContext('switchAdminWorkspace('+JSON.stringify(key)+')',h.ctx);
    assert.equal(h.el('adminWorkspacePicker').value,key);
    assert.equal(h.el('admin-workspace-'+key).hidden,false);
    assert.equal(h.el('admin-tab-'+key).getAttribute('aria-selected'),'true');
    assert.equal(h.el('admin-tab-'+key).tabIndex,0);
    for(const other of keys.filter(x=>x!==key))assert.equal(h.el('admin-workspace-'+other).hidden,true);
  }
  assert.deepEqual(h.calls,[],'tab changes must send zero backend requests');
});
test('P6-01 Arrow, Home and End select one tab and move focus without mutation',()=>{
 const h=fixture();vm.runInContext('currentUser={role:"Manager"};resetAdminWorkspace()',h.ctx);
 const run=key=>vm.runInContext('handleAdminWorkspaceKeys({key:'+JSON.stringify(key)+',preventDefault(){}})',h.ctx);
 run('End');assert.equal(h.getFocused(),'admin-tab-audit');
 run('ArrowRight');assert.equal(h.getFocused(),'admin-tab-overview');
 run('Home');assert.equal(h.getFocused(),'admin-tab-overview');
 run('ArrowLeft');assert.equal(h.getFocused(),'admin-tab-audit');
 assert.equal(h.calls.length,0);
});
test('P6-01 guests cannot open or switch Admin and logout resets workspace',()=>{
 const h=fixture();
 vm.runInContext('switchAdminWorkspace("audit")',h.ctx);
 assert.equal(h.el('admin-tab-audit').getAttribute('aria-selected'),'');
 vm.runInContext("showPage('admin',null)",h.ctx);
 assert.match(h.toasts.join(' '),/สิทธิ์ไม่เพียงพอ/);
 assert.equal(h.calls.length,0);
 vm.runInContext('currentUser={role:"Manager"};switchAdminWorkspace("settings")',h.ctx);
 vm.runInContext('currentUser=null;resetAdminWorkspace()',h.ctx);
 assert.equal(h.el('adminWorkspacePicker').value,'overview');
 assert.equal(h.el('admin-workspace-settings').hidden,true);
 assert.match(auth,/resetAdminWorkspace\(\)/);
});
test('P6-01 seven original datasets remain in canonical Admin page, not cloned',()=>{
 const ids=['akUsers','installStatus','set_GEMINI_API_KEY','userBody','masterDataBody','areaBody','contentAdminList','auditBody','archiveAuditBtn','areaImportFile'];
 for(const id of ids)assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(admin,/await Promise\.allSettled\(\[loadSettings\(\),loadInstallStatus\(\),loadMasterDataAdmin\(\)/);
 assert.doesNotMatch(admin.match(/function switchAdminWorkspace\(key\)\{[\s\S]*?\n  \}/)?.[0]||'',/\bgs\(/);
});
