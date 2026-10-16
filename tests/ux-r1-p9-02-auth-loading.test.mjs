// UX-R1/P9-02 Auth and Boot loading safety — isolated synthetic GAS client.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function deferred(){
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject}
}
function fixture(){
  const nodes=new Map(),calls=[],messages=[],stored=new Map();
  const el=id=>{
    if(!nodes.has(id)){
      const attrs=new Map(),classes=new Set();
      nodes.set(id,{id,innerHTML:'<i>icon</i> เดิม',textContent:'',value:'',src:'',disabled:false,
        hidden:false,isConnected:true,style:{display:''},dataset:{},
        setAttribute(k,v){attrs.set(k,String(v))},getAttribute(k){return attrs.get(k)||null},
        removeAttribute(k){attrs.delete(k)},focus(){},contains(){return false},
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),
          contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k)}}});
    }return nodes.get(id)
  };
  const doc={readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return[]},
    querySelector(){return null},documentElement:{style:{setProperty(){}}},
    activeElement:el('opener')};
  const ctx=vm.createContext({
    document:doc,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),
      removeItem:k=>stored.delete(k)},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},setInterval(){return 1},clearInterval(){},console
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path}).runInContext(ctx,{timeout:2500});
  }
  ctx.gs=(name,...args)=>{const d=deferred();calls.push({name,args,...d});return d.promise};
  ctx.toast=m=>messages.push(String(m));
  ctx.loadDashboard=async()=>{};
  ctx.recoverReportJob=async()=>{};
  ctx.renderTables=()=>{};
  ctx.destroyDashboardCharts=()=>{};
  ctx.buildRecordForm=()=>{};
  ctx.setupDashboardFilters=()=>{};
  return {ctx,el,calls,messages,stored};
}
test('P9-02 Boot shows initial status then accessible retry on server failure',async()=>{
  const h=fixture();
  const first=vm.runInContext('boot()',h.ctx);
  assert.equal(h.calls[0].name,'getAppBoot');
  assert.equal(h.el('appBootStatus').hidden,false);
  assert.match(h.el('appBootStatus').textContent,/กำลังเตรียมระบบ/);
  h.calls[0].reject(new Error('synthetic backend failed'));
  await first;
  assert.match(h.el('appBootStatus').textContent,/ไม่สามารถเริ่มต้นระบบ/);
  assert.equal(h.el('appBootRetryBtn').hidden,false);
  const retry=vm.runInContext('boot()',h.ctx);
  assert.equal(h.calls.length,2);
  h.calls[1].resolve({settings:{},master:{},areas:[],content:[],user:null});
  await retry;
  assert.equal(h.el('appBootStatus').hidden,true);
  assert.equal(h.el('appBootRetryBtn').hidden,true);
});
test('P9-02 Login pending text blocks duplicate RPC and restores actionable error',async()=>{
  const h=fixture();
  vm.runInContext('openLogin()',h.ctx);
  h.el('loginEmail').value='synthetic@example.invalid';
  h.el('loginPassword').value='fake';
  const first=vm.runInContext('doLogin()',h.ctx),second=vm.runInContext('doLogin()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.el('authLoginSubmitBtn').disabled,true);
  assert.equal(h.el('authLoginSubmitBtn').getAttribute('aria-busy'),'true');
  assert.match(h.el('authLoginSubmitBtn').textContent,/กำลังตรวจสอบ/);
  h.calls[0].resolve({ok:false,message:'บัญชียังไม่พร้อม'});
  await Promise.all([first,second]);
  assert.equal(h.el('authLoginSubmitBtn').disabled,false);
  assert.equal(h.el('authLoginSubmitBtn').getAttribute('aria-busy'),'false');
  assert.match(h.el('authLoginStatus').textContent,/บัญชียังไม่พร้อม/);
});
test('P9-02 Logout invalidates private session synchronously and locks repeated logout',async()=>{
  const h=fixture();
  vm.runInContext('token="SYN-SESSION";currentUser={role:"Manager",name:"SYN"}',h.ctx);
  const first=vm.runInContext('doLogout()',h.ctx),second=vm.runInContext('doLogout()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'logout');
  assert.equal(vm.runInContext('token',h.ctx),'');
  assert.equal(vm.runInContext('currentUser',h.ctx),null);
  assert.match(h.el('sessionActivityStatus').textContent,/กำลังยืนยัน/);
  h.calls[0].resolve(true);
  await Promise.all([first,second]);
  assert.match(h.el('sessionActivityStatus').textContent,/ออกจากระบบเรียบร้อย/);
  assert.equal(vm.runInContext('authLogoutPending',h.ctx),false);
});
test('P9-02 late Logout callback never clears a newer Login or private UI',async()=>{
  const h=fixture();
  vm.runInContext('token="OLD";currentUser={role:"Manager",name:"Old"}',h.ctx);
  const pending=vm.runInContext('doLogout()',h.ctx);
  vm.runInContext('token="NEW";currentUser={role:"Admin",name:"New"}',h.ctx);
  h.calls[0].resolve(true);
  await pending;
  assert.equal(vm.runInContext('token',h.ctx),'NEW');
  assert.equal(vm.runInContext('currentUser.name',h.ctx),'New');
  assert.equal(h.el('sessionActivityStatus').textContent,'');
});
test('P9-02 UX markup remains outside private screenshot and uses plain status regions',()=>{
  const layout=read('src/web/02-app-layout.html');
  for(const id of ['appBootStatus','appBootRetryBtn','sessionActivityStatus']){
    assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  }
  assert.ok(layout.indexOf('id="appBootStatus"')<layout.indexOf('id="captureArea"'));
  assert.match(layout,/id="appBootStatus"[^>]*role="status" aria-live="polite"/);
});
