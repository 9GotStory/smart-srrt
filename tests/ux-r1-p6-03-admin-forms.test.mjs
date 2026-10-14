// UX-R1/P6-03: Admin mutations retain payloads, are single-flight and session-safe.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('src/web/04-browser-app.html'),layout=read('src/web/02-app-layout.html'),modals=read('src/web/03-modals.html');
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function fixture(){
  const nodes=new Map(),calls=[],toasts=[];
  const el=id=>{
    if(!nodes.has(id)){
      const classes=new Set(),attrs=new Map();
      nodes.set(id,{id,value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,
        files:[],style:{display:''},dataset:{},options:[],
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x)}},
        setAttribute(k,v){attrs.set(k,String(v))},getAttribute(k){return attrs.get(k)||''},removeAttribute(k){attrs.delete(k)},focus(){}
      })
    }
    return nodes.get(id)
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return[]},querySelector(){return null}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},console,confirm:()=>true
  });
  for(const {path,code} of readOrderedClientScripts()){
    const c=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(c,{filename:path}).runInContext(ctx,{timeout:3000})
  }
  ctx.gs=(...args)=>{calls.push(args);return Promise.resolve('Saved')};
  ctx.toast=value=>toasts.push(String(value));
  return {ctx,el,calls,toasts}
}
function login(h,session='A',role='Manager'){
  vm.runInContext('token='+JSON.stringify(session)+';currentUser={role:'+JSON.stringify(role)+'}',h.ctx)
}
function logout(h){
  vm.runInContext('token="";currentUser=null;resetAdminPrivate()',h.ctx)
}
test('P6-03 one named submit button per form; mutations retain canonical RPC names',()=>{
  for(const id of ['adminSaveSettingsBtn','adminUploadLogoBtn'])
    assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  for(const id of ['adminSaveUserBtn','adminSaveAreaBtn','adminSaveMasterBtn','adminSaveContentBtn'])
    assert.equal((modals.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  for(const rpc of ['saveSystemSettings','uploadLogo','saveArea','deleteArea','updateUser','saveMasterDataItem','saveContent'])
    assert.match(app,new RegExp("gs\\('"+rpc+"',ctx\\.token"));
  assert.match(app,/resetAdminFormState\(\)/);
});
test('P6-03 User save is one RPC; delayed result after logout does not close a new form',async()=>{
  const h=fixture();login(h);
  h.el('uId').value='U1';h.el('uName').value='Synthetic user';
  h.el('uPassword').value='synthetic-only';
  vm.runInContext("openModal('userModal')",h.ctx);
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const first=vm.runInContext('saveUser()',h.ctx);
  const second=vm.runInContext('saveUser()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0][0],'updateUser');
  assert.equal(h.calls[0][1],'A');
  assert.equal(h.calls[0][2],'U1');
  assert.equal(h.calls[0][3].newPassword,'synthetic-only');
  assert.equal(h.el('adminSaveUserBtn').disabled,true);
  logout(h);login(h,'B');
  h.el('uName').value='New session';
  vm.runInContext("openModal('userModal')",h.ctx);
  d.resolve('saved old user');
  await Promise.all([first,second]);
  assert.equal(h.el('uName').value,'New session');
  assert.equal(h.el('userModal').classList.contains('open'),true);
  assert.equal(h.el('adminSaveUserBtn').disabled,false);
  assert.equal(h.toasts.length,0);
  assert.equal(h.calls.length,1,'no follow-up refresh with new token')
});
test('P6-03 failed save retains form and re-enables button; no false success',async()=>{
  const h=fixture();login(h);
  vm.runInContext("openModal('areaModal')",h.ctx);
  h.el('aVillage').value='Synthetic village';
  h.ctx.gs=(...args)=>{h.calls.push(args);return Promise.reject(Error('Synthetic rejection'))};
  await vm.runInContext('saveAreaItem()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0][0],'saveArea');
  assert.equal(h.calls[0][2].village,'Synthetic village');
  assert.equal(h.el('areaModal').classList.contains('open'),true);
  assert.equal(h.el('aVillage').value,'Synthetic village');
  assert.equal(h.el('adminSaveAreaBtn').disabled,false);
  assert.match(h.toasts.join(' '),/Synthetic rejection/)
});
test('P6-03 Guest and Staff cannot submit any Admin form, even by direct function call',async()=>{
  const h=fixture();
  const fns=['saveSettings','uploadLogoFile','saveUser','saveAreaItem','saveMasterDataAdminItem','saveContentItem'];
  for(const mode of ['guest','Staff']){
    if(mode==='Staff')login(h,'staff','Staff');
    for(const name of fns)await vm.runInContext(name+'()',h.ctx)
  }
  assert.equal(h.calls.length,0);
  assert.equal(h.toasts.length,0)
});
test('P6-03 Settings save after logout makes no follow-up getAppBoot request',async()=>{
  const h=fixture();login(h);
  h.el('set_APP_NAME').value='Synthetic SRRT';
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const run=vm.runInContext('saveSettings()',h.ctx);
  assert.equal(h.calls[0][0],'saveSystemSettings');
  assert.equal(h.calls[0][2].find(x=>x.key==='APP_NAME').value,'Synthetic SRRT');
  logout(h);
  d.resolve('old settings saved');
  await run;
  assert.deepEqual(h.calls.map(([name])=>name),['saveSystemSettings']);
  assert.equal(h.toasts.length,0)
});
test('P6-03 MasterData save retains canonical identity and stops stale boot refresh',async()=>{
  const h=fixture();login(h);
  h.el('mdMode').value='update';
  h.el('mdOriginalType').value='sample';
  h.el('mdOriginalValue').value='identity';
  h.el('mdType').value='sample';h.el('mdValue').value='identity';
  h.el('mdLabel').value='Edited';h.el('mdSort').value='2';h.el('mdActive').value='true';
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const run=vm.runInContext('saveMasterDataAdminItem()',h.ctx);
  assert.equal(h.calls[0][0],'saveMasterDataItem');
  assert.equal(h.calls[0][2].originalValue,'identity');
  assert.equal(h.calls[0][2].sortOrder,2);
  logout(h);d.resolve('saved');
  await run;
  assert.equal(h.calls.length,1);
  assert.equal(h.toasts.length,0)
});
test('P6-03 Logo encoding callback after logout never uploads with new session',async()=>{
  const h=fixture();login(h);
  h.el('logoFile').files=[{name:'test.png',type:'image/png',size:16}];
  const d=deferred();h.ctx.fileToBase64=()=>d.promise;
  const run=vm.runInContext('uploadLogoFile()',h.ctx);
  assert.equal(h.el('adminUploadLogoBtn').disabled,true);
  logout(h);login(h,'B');
  d.resolve('dGVzdA==');
  await run;
  assert.equal(h.calls.filter(([name])=>name==='uploadLogo').length,0);
  assert.equal(h.el('adminUploadLogoBtn').disabled,false)
});
test('P6-03 Content save does not repaint private library after a session change',async()=>{
  const h=fixture();login(h);
  h.el('cId').value='C1';h.el('cTitle').value='Synthetic notice';
  const d=deferred();h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const run=vm.runInContext('saveContentItem()',h.ctx);
  assert.equal(h.calls[0][0],'saveContent');
  assert.equal(h.calls[0][2].title,'Synthetic notice');
  logout(h);d.resolve('old update');
  await run;
  assert.equal(h.calls.length,1);
  assert.equal(h.el('libraryList').innerHTML,'');
  assert.equal(h.toasts.length,0)
});
