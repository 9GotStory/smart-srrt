// UX-R1/P7-02 — native V8-like focused keyboard contracts; no real GAS/browser assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const core=read('src/web/03b-client-core.html');
const styles=read('src/styles/shared-ui.css');
const release=read('docs/ux/ux-r1-p7-release-integration-checklist.md');
const adminIds=['userModal','masterDataModal','areaModal','contentModal'];
function fixture(){
  const nodes=new Map(),listeners={},calls=[],toasts=[];
  let active=null,openStack=[];
  function node(id){
    if(!nodes.has(id)){
      const set=new Set(),attr=new Map();
      const n={id,value:'',hidden:false,disabled:false,tabIndex:0,isConnected:true,
        innerHTML:'',textContent:'',style:{display:''},dataset:{},
        classList:{add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,yes)=>yes?set.add(x):set.delete(x)},
        setAttribute(k,v){attr.set(k,String(v))},getAttribute(k){return attr.get(k)||null},
        removeAttribute:k=>attr.delete(k),focus(){active=n},
        closest(){return null},querySelectorAll(){return n.controls||[]},
        querySelector(){return null}
      };
      nodes.set(id,n);
    }
    return nodes.get(id)
  }
  const doc={
    readyState:'loading',getElementById:node,addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
    querySelectorAll(sel){return sel==='.modal.open'?openStack.filter(n=>n.classList.contains('open')):[]},
    querySelector(){return null},
    get activeElement(){return active}
  };
  const ctx=vm.createContext({
    document:doc,localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},console,setTimeout(){},clearTimeout(){},URL
  });
  for(const {path,code} of readOrderedClientScripts()){
    const source=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(source,{filename:path}).runInContext(ctx,{timeout:3000})
  }
  ctx.gs=(...args)=>{calls.push(args);throw Error('No RPC in keyboard tests')};
  ctx.toast=v=>toasts.push(String(v));
  const focusable=id=>node(id);
  function press(key,shiftKey=false){
    let prevented=false;
    const e={key,shiftKey,preventDefault(){prevented=true}};
    for(const fn of listeners.keydown||[])fn(e);
    return prevented
  }
  const setStack=(...ids)=>{openStack=ids.map(node)};
  return {ctx,node,press,setStack,focusable,getActive:()=>active,calls,toasts}
}
function prepAdmin(h,id){
  const opener=h.node('opener-'+id),first=h.node(id+'-first'),last=h.node(id+'-last');
  h.node(id).controls=[first,last];
  opener.focus();h.setStack(id);
  vm.runInContext('openModal('+JSON.stringify(id)+')',h.ctx);
  return {opener,first,last}
}
test('P7-02 scoped dialog keyboard layer does not intercept Report/Record/AI dialogs',()=>{
  const h=fixture();
  h.node('recordModal').classList.add('open');h.setStack('recordModal');
  assert.equal(h.press('Tab'),false);
  assert.equal(h.press('Escape'),false);
  assert.match(core,/const keyboardDialogIds=\['loginModal','userModal','masterDataModal','areaModal','contentModal'\]/);
  assert.doesNotMatch(core.match(/const keyboardDialogIds=\[[^\]]+\]/)?.[0]||'',/reportCancelConfirmModal|eventActionModal/);
  assert.equal(h.calls.length,0);
});
test('P7-02 all four Admin edit dialogs focus a field, wrap Tab/Shift+Tab and restore opener on close',()=>{
  for(const id of adminIds){
    const h=fixture(),{opener,first,last}=prepAdmin(h,id);
    assert.equal(h.getActive(),first,id+' initial focus');
    last.focus();
    assert.equal(h.press('Tab'),true,id+' forward trap');
    assert.equal(h.getActive(),first);
    first.focus();
    assert.equal(h.press('Tab',true),true,id+' backward trap');
    assert.equal(h.getActive(),last);
    assert.equal(h.press('Escape'),true,id+' Escape consumed');
    assert.equal(h.node(id).classList.contains('open'),false);
    assert.equal(h.getActive(),opener,id+' focus return');
    assert.equal(h.calls.length,0);
  }
});
test('P7-02 save-pending Admin dialogs cannot be dismissed by Escape',()=>{
  const h=fixture(),{last}=prepAdmin(h,'userModal');
  vm.runInContext('adminFormSavePending.user={session:"synthetic"}',h.ctx);
  assert.equal(h.press('Escape'),true);
  assert.equal(h.node('userModal').classList.contains('open'),true);
  last.focus();assert.equal(h.press('Tab'),true);
  vm.runInContext('delete adminFormSavePending.user',h.ctx);
  assert.equal(h.press('Escape'),true);
  assert.equal(h.node('userModal').classList.contains('open'),false);
  assert.equal(h.calls.length,0);
});
test('P7-02 nested specialized confirmation wins keyboard events over underlying Admin dialog',()=>{
  const h=fixture();prepAdmin(h,'areaModal');
  h.node('eventActionModal').classList.add('open');
  h.setStack('areaModal','eventActionModal');
  assert.equal(h.press('Tab'),false);
  assert.equal(h.node('areaModal').classList.contains('open'),true);
  // Specialized Event action handler consumes Escape, not our Admin handler.
  assert.equal(h.press('Escape'),true);
  assert.equal(h.node('areaModal').classList.contains('open'),true);
  // Preserve specialized handling even when its markup is earlier in DOM order.
  h.node('eventActionModal').classList.add('open');
  h.setStack('eventActionModal','areaModal');
  assert.equal(h.press('Tab'),false);
  assert.equal(h.press('Escape'),true);
  assert.equal(h.node('areaModal').classList.contains('open'),true);
  assert.equal(h.calls.length,0);
});
test('P7-02 Login Escape routes through auth cancellation and erases secrets',()=>{
  const h=fixture(),opener=h.node('loginOpener'),
    field=h.node('loginEmail'),last=h.node('authCloseBtn');
  h.node('loginModal').controls=[field,last];
  opener.focus();h.setStack('loginModal');
  vm.runInContext('settings={ALLOW_SELF_REGISTER:"false"};openLogin()',h.ctx);
  assert.equal(h.getActive(),field);
  h.node('loginPassword').value='SYNTHETIC_ONLY';
  last.focus();assert.equal(h.press('Tab'),true);
  assert.equal(h.getActive(),field);
  field.focus();assert.equal(h.press('Tab',true),true);
  assert.equal(h.getActive(),last);
  assert.equal(h.press('Escape'),true);
  assert.equal(h.node('loginModal').classList.contains('open'),false);
  assert.equal(h.node('loginPassword').value,'');
  assert.equal(h.getActive(),opener);
  assert.equal(h.calls.length,0);
});
test('P7-02 hidden fields and disabled buttons are skipped in Tab containment',()=>{
  const h=fixture(),{first,last}=prepAdmin(h,'contentModal');
  const hidden=h.node('content-hidden');hidden.hidden=true;
  const disabled=h.node('content-disabled');disabled.disabled=true;
  h.node('contentModal').controls=[first,hidden,disabled,last];
  last.focus();assert.equal(h.press('Tab'),true);
  assert.equal(h.getActive(),first);
  first.focus();assert.equal(h.press('Tab',true),true);
  assert.equal(h.getActive(),last);
});
test('P7-02 Admin private logout clears saved focus opener references',()=>{
  const h=fixture();prepAdmin(h,'masterDataModal');
  vm.runInContext('resetAdminFormState()',h.ctx);
  assert.equal(h.node('masterDataModal').classList.contains('open'),false);
  assert.equal(vm.runInContext('adminDialogOpeners.size',h.ctx),0);
  assert.equal(h.calls.length,0);
});
test('P7-02 layout remains responsive and Browser UAT remains unverified',()=>{
  assert.match(styles,/#userModal \.modal-box/);
  assert.match(styles,/#loginModal \.modal-box/);
  assert.match(styles,/@media\(max-width:560px\)/);
  assert.match(release,/All 14 dialogs/);
  assert.match(release,/P7-02 adds scoped source-level keyboard guards/);
  assert.match(release,/NOT RUN/);
  assert.match(release,/Production \*\*HOLD\*\*/);
});
