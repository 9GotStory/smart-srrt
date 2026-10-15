// UX-R1/P6-05 — Native24 Authentication UI and session lifecycle tests (synthetic only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const modal=read('src/web/03-modals.html'),auth=read('src/web/03c-client-auth.html'),css=read('src/styles/shared-ui.css');
function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject}
}
function fixture(){
  const nodes=new Map(),calls=[],toasts=[],saved=new Map();
  let focused='';
  const el=id=>{
    if(!nodes.has(id)){
      const classes=new Set(),attrs=new Map();
      const node={id,value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,
        style:{display:''},dataset:{},files:[],src:'',options:[],
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x)}},
        focus(){focused=id},setAttribute(k,v){attrs.set(k,String(v))},
        getAttribute(k){return attrs.get(k)||''},removeAttribute(k){attrs.delete(k)},
        querySelector(){return null},contains(){return false}
      };
      nodes.set(id,node)
    }
    return nodes.get(id)
  };
  const document={readyState:'loading',getElementById:el,
    addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},
    documentElement:{style:{setProperty(){}}},
    get activeElement(){return el('opener')}
  };
  const ctx=vm.createContext({
    document,localStorage:{
      getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},
    setInterval(){return 1},clearInterval(){},console
  });
  for(const {path,code} of readOrderedClientScripts()){
    const clean=path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(clean,{filename:path}).runInContext(ctx,{timeout:2500});
  }
  ctx.gs=(...args)=>{calls.push(args);return Promise.resolve(null)};
  ctx.toast=v=>toasts.push(String(v));
  ctx.loadDashboard=async()=>{};
  ctx.recoverReportJob=async()=>{};
  ctx.destroyDashboardCharts=()=>{}; // Isolated DOM has no Chart.js canvas APIs.
  return {ctx,el,calls,toasts,saved,getFocused:()=>focused}
}
function setting(h,allow){
  vm.runInContext('settings={ALLOW_SELF_REGISTER:'+JSON.stringify(allow?'true':'false')+'}',h.ctx)
}
test('P6-05 labelled Login/Registration forms, pending notice, keyboard submit and responsive styling',()=>{
  const authModal=modal.split('<div class="modal" id="loginModal"')[1].split('<div class="modal" id="recordModal"')[0];
  for(const id of ['loginEmail','loginPassword','regName','regEmail','regPass','regOrg','authLoginStatus',
    'authRegisterStatus','authLoginSubmitBtn','authRegisterSubmitBtn','authRegisterModeBtn'])
    assert.equal((authModal.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.match(authModal,/role="dialog" aria-modal="true" aria-labelledby="authDialogTitle"/);
  assert.match(authModal,/onsubmit="event.preventDefault\(\);doLogin\(\)"/);
  assert.match(authModal,/onsubmit="event.preventDefault\(\);register\(\)"/);
  assert.match(authModal,/สถานะรออนุมัติ/);
  assert.match(authModal,/role="status" aria-live="polite"/);
  assert.match(css,/srrt-auth-form\[hidden\]/);
});
test('P6-05 registration visibility follows public setting; disabled UI and direct calls never register',async()=>{
  const h=fixture();setting(h,false);
  vm.runInContext('openLogin()',h.ctx);
  assert.equal(h.el('authRegisterModeBtn').hidden,true);
  vm.runInContext("setAuthMode('register')",h.ctx);
  assert.equal(h.el('authRegisterForm').hidden,true);
  h.el('regName').value='Synthetic User';h.el('regEmail').value='test@example.org';
  h.el('regPass').value='Synthetic-Long-Password!';
  await vm.runInContext('register()',h.ctx);
  assert.equal(h.calls.length,0);
  assert.match(h.el('authRegisterStatus').textContent,/ปิดรับสมัคร/);
  setting(h,true);
  vm.runInContext('syncAuthRegistration();setAuthMode("register")',h.ctx);
  assert.equal(h.el('authRegisterModeBtn').hidden,false);
  assert.equal(h.el('authRegisterForm').hidden,false);
  assert.equal(h.el('authLoginForm').hidden,true);
  assert.equal(h.getFocused(),'regName');
});
test('P6-05 duplicate Login is a single RPC; failed auth clears secret but retains email',async()=>{
  const h=fixture();setting(h,true);
  vm.runInContext('openLogin()',h.ctx);
  h.el('loginEmail').value='synthetic@example.org';h.el('loginPassword').value='Fake-Password';
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const first=vm.runInContext('doLogin()',h.ctx),second=vm.runInContext('doLogin()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0][0],'login');
  assert.equal(h.calls[0][1].email,'synthetic@example.org');
  assert.equal(h.el('authLoginSubmitBtn').disabled,true);
  d.resolve({ok:false,message:'บัญชียังไม่พร้อมใช้งาน'});
  await Promise.all([first,second]);
  assert.equal(h.el('authLoginSubmitBtn').disabled,false);
  assert.match(h.el('authLoginStatus').textContent,/บัญชียังไม่พร้อมใช้งาน/);
  assert.equal(h.el('loginEmail').value,'synthetic@example.org');
  assert.equal(h.el('loginPassword').value,'');
  assert.equal(h.saved.size,0);
});
test('P6-05 valid Login transitions only after server confirmation and clears password',async()=>{
  const h=fixture();setting(h,false);
  vm.runInContext('openLogin()',h.ctx);
  h.el('loginEmail').value='synthetic@example.org';h.el('loginPassword').value='Fake-Password';
  h.ctx.gs=(...args)=>{h.calls.push(args);return Promise.resolve({ok:true,token:'server-session',user:{role:'Admin',name:'Synthetic',email:'synthetic@example.org'}})};
  await vm.runInContext('doLogin()',h.ctx);
  assert.equal(h.saved.get('SRRT_TOKEN'),'server-session');
  assert.equal(vm.runInContext('token',h.ctx),'server-session');
  assert.equal(vm.runInContext('currentUser.role',h.ctx),'Admin');
  assert.equal(h.el('loginPassword').value,'');
  assert.equal(h.el('loginModal').classList.contains('open'),false);
  assert.match(h.toasts.join(' '),/เข้าสู่ระบบสำเร็จ/);
  assert.equal(h.calls.length,1);
});
test('P6-05 stale success after closing Dialog cannot write token, toast or role',async()=>{
  const h=fixture();setting(h,true);
  vm.runInContext('openLogin()',h.ctx);
  h.el('loginEmail').value='a@example.org';h.el('loginPassword').value='Fake';
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const pending=vm.runInContext('doLogin()',h.ctx);
  vm.runInContext('closeAuthDialog()',h.ctx);
  d.resolve({ok:true,token:'stale-session',user:{role:'Manager',name:'Stale'}});
  await pending;
  assert.equal(h.saved.has('SRRT_TOKEN'),false);
  assert.equal(vm.runInContext('currentUser',h.ctx),null);
  assert.equal(h.el('authLoginSubmitBtn').disabled,false);
  assert.equal(h.el('loginPassword').value,'');
  assert.equal(h.toasts.length,0);
});
test('P6-05 registration stays pending; duplicate request guarded; no auto-login',async()=>{
  const h=fixture();setting(h,true);
  vm.runInContext('openLogin();setAuthMode("register")',h.ctx);
  h.el('regName').value='New User';h.el('regEmail').value='new@example.org';
  h.el('regPass').value='Synthetic-Long-Password!';h.el('regOrg').value='Synthetic Unit';
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const one=vm.runInContext('register()',h.ctx),two=vm.runInContext('register()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0][0],'registerUser');
  assert.equal(h.calls[0][1].org,'Synthetic Unit');
  assert.equal(h.el('authRegisterSubmitBtn').disabled,true);
  d.resolve('สมัครใช้งานเรียบร้อยแล้ว รอผู้ดูแลระบบอนุมัติ');
  await Promise.all([one,two]);
  assert.match(h.el('authRegisterStatus').textContent,/รอผู้ดูแลระบบอนุมัติ/);
  assert.equal(vm.runInContext('currentUser',h.ctx),null);
  assert.equal(h.saved.has('SRRT_TOKEN'),false);
  assert.equal(h.el('regPass').value,'');
  assert.equal(h.el('authRegisterSubmitBtn').disabled,false);
  assert.equal(h.calls.length,1);
});
test('P6-05 logout invalidates in-flight Login and does not clobber a later user',async()=>{
  const h=fixture();setting(h,true);
  vm.runInContext('openLogin()',h.ctx);
  h.el('loginEmail').value='old@example.org';h.el('loginPassword').value='Fake';
  const late=deferred(),logout=deferred();
  h.ctx.gs=(...args)=>{
    h.calls.push(args);
    if(args[0]==='login')return late.promise;
    if(args[0]==='logout')return logout.promise;
    return Promise.resolve({})
  };
  const oldLogin=vm.runInContext('doLogin()',h.ctx);
  const out=vm.runInContext('doLogout()',h.ctx);
  assert.equal(h.el('authLoginSubmitBtn').disabled,false);
  late.resolve({ok:true,token:'old-user-token',user:{role:'Manager'}});
  await oldLogin;
  assert.equal(vm.runInContext('token',h.ctx),'');
  assert.equal(h.saved.has('SRRT_TOKEN'),false);
  assert.equal(h.el('loginPassword').value,'');
  vm.runInContext('token="new-user-token";currentUser={role:"Admin",name:"New"}',h.ctx);
  logout.resolve(true);await out;
  assert.equal(vm.runInContext('token',h.ctx),'new-user-token');
  assert.equal(vm.runInContext('currentUser.name',h.ctx),'New');
});
test('P6-05 registration response after closing Dialog never paints success into newer session',async()=>{
  const h=fixture();setting(h,true);
  vm.runInContext('openLogin();setAuthMode("register")',h.ctx);
  h.el('regName').value='Fake';h.el('regEmail').value='fake@example.org';
  h.el('regPass').value='Fake-Password';
  const d=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return d.promise};
  const task=vm.runInContext('register()',h.ctx);
  vm.runInContext('closeAuthDialog()',h.ctx);
  d.resolve('สมัครใช้งานเรียบร้อยแล้ว');
  await task;
  assert.equal(h.el('authRegisterStatus').textContent,'');
  assert.equal(h.el('regPass').value,'');
  assert.equal(h.el('authRegisterSubmitBtn').disabled,false);
  assert.equal(h.calls.length,1);
});
