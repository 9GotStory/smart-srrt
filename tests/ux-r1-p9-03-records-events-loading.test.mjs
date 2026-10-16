// P9-03 isolated Native24 synthetic regression: never calls live Apps Script or Drive.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject};
}
function fixture(){
  const elements=new Map(),calls=[],toasts=[],downloads=[],storage=new Map();
  const el=id=>{
    if(!elements.has(id)){
      const attrs=new Map(),classes=new Set();
      elements.set(id,{id,value:'',innerHTML:'<i>original</i>',textContent:'',disabled:false,
        hidden:false,isConnected:true,style:{display:''},dataset:{},files:[],
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},
        setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k)||null,
        removeAttribute:k=>attrs.delete(k),focus(){},options:[]});
    }
    return elements.get(id);
  };
  const document={readyState:'loading',getElementById:el,addEventListener(){},
    activeElement:null,documentElement:{style:{setProperty(){}}},
    createElement:()=>({dataset:{},click(){downloads.push('clicked')},remove(){}}),
    body:{appendChild(){}}};
  const ctx=vm.createContext({document,console,confirm:()=>true,setTimeout(){},clearTimeout(){},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
      removeItem:k=>storage.delete(k)},
    google:{script:{run:{}}},URL:{createObjectURL(){downloads.push('blob');return'blob:synthetic'},
      revokeObjectURL(){}},Blob,Uint8Array,atob:()=>''});
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'?
      code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path}).runInContext(ctx,{timeout:3000});
  }
  ctx.toast=x=>toasts.push(String(x));
  ctx.gs=(name,...args)=>{const request=deferred();calls.push({name,args,...request});return request.promise};
  ctx.loadDashboard=async()=>{};
  return {ctx,el,calls,toasts,downloads};
}
function login(h,role='Manager'){
  vm.runInContext('token="SYN";currentUser={role:'+JSON.stringify(role)+',name:"Synthetic"}',h.ctx);
}
function records(h){
  vm.runInContext('allData=[{eventId:"E1",revision:2,col6:"Synthetic Event",recordStatus:"active"}]',h.ctx);
}
async function microtasks(){await Promise.resolve();await Promise.resolve()}
test('P9-03 record create is single-flight; ambiguous rejection stays unknown and draft survives',async()=>{
  const h=fixture();login(h,'Admin');records(h);
  vm.runInContext('buildRecordForm();openRecordForm("add")',h.ctx);
  h.el('in6').value='synthetic-draft';
  const first=vm.runInContext('saveRecord()',h.ctx);
  const duplicate=vm.runInContext('saveRecord()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'addRecord');
  assert.equal(h.el('saveRecordBtn').getAttribute('aria-busy'),'true');
  assert.match(h.el('recordSaveStatus').textContent,/กำลังบันทึก/);
  h.calls[0].reject(new Error('ambiguous transport timeout'));
  await Promise.all([first,duplicate]);
  assert.equal(h.el('saveRecordBtn').disabled,true);
  assert.match(h.el('recordSaveStatus').textContent,/ไม่ทราบผล/);
  assert.equal(h.el('in6').value,'synthetic-draft');
  await vm.runInContext('saveRecord()',h.ctx);
  assert.equal(h.calls.length,1,'unknown must not dispatch a second create');
  vm.runInContext('token="";currentUser=null;discardRecordFormOnLogout()',h.ctx);
  assert.equal(h.el('saveRecordBtn').disabled,false,'later sessions must not inherit disabled private controls');
  assert.equal(h.el('recordSaveStatus').textContent,'');
});
test('P9-03 lifecycle reason and Revision preserved; failure cannot double-dispatch',async()=>{
  const h=fixture();login(h);records(h);
  vm.runInContext("closeEventFlow('E1',2)",h.ctx);
  h.el('eventActionReason').value='เหตุผลทดสอบ';
  const first=vm.runInContext('confirmEventAction()',h.ctx);
  const duplicate=vm.runInContext('confirmEventAction()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'closeEvent');
  assert.equal(h.calls[0].args[3],2);
  assert.equal(h.el('eventActionConfirmBtn').disabled,true);
  h.calls[0].reject(new Error('unknown completion'));
  await Promise.all([first,duplicate]);
  assert.match(h.el('eventActionStatus').textContent,/สถานะยังไม่ยืนยัน/);
  assert.equal(h.el('eventActionConfirmBtn').disabled,true);
  vm.runInContext('cancelEventAction();closeEventFlow("E1",2)',h.ctx);
  assert.equal(h.el('eventActionConfirmBtn').disabled,true,'same unknown command must stay locked');
  assert.match(h.el('eventActionStatus').textContent,/ยังยืนยันผลคำสั่งเดิมไม่ได้/);
  await vm.runInContext('confirmEventAction()',h.ctx);
  assert.equal(h.calls.length,1);
  vm.runInContext('cancelEventAction();deleteEvent("E1",2)',h.ctx);
  assert.equal(h.el('eventActionConfirmBtn').disabled,false,'different operation remains available');
});
test('P9-03 owner chooser coalesces same row, shows pending and ignores old session result',async()=>{
  const h=fixture();login(h);records(h);
  const opener=h.el('ownerRowBtn');
  const one=vm.runInContext('openOwnerModal(0,document.getElementById("ownerRowBtn"))',h.ctx);
  const two=vm.runInContext('openOwnerModal(0,document.getElementById("ownerRowBtn"))',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'listAssignableEventOwners');
  assert.equal(opener.disabled,true);
  h.calls[0].resolve([{userId:'s-1',name:'Synthetic Private',role:'Admin'}]);
  await Promise.all([one,two]);
  assert.equal(opener.disabled,false);
  assert.equal(h.el('ownerModal').classList.contains('open'),true);
  const nonButton=h.el('nonButton');
  nonButton.tagName='BODY';
  h.ctx.document.activeElement=nonButton;
  const third=vm.runInContext('openOwnerModal(0)',h.ctx);
  assert.equal(nonButton.disabled,false,'owner action must not disable document body');
  assert.equal(nonButton.innerHTML,'<i>original</i>','owner action must never replace body markup');
  vm.runInContext('token="";currentUser=null;invalidateEventActionUi()',h.ctx);
  h.calls[1].resolve([{userId:'hidden',name:'NEVER DISPLAY',role:'Admin'}]);
  await third;
  assert.doesNotMatch(h.el('ownerUserId').innerHTML,/NEVER DISPLAY/);
});
test('P9-03 owner assignment pending and unknown do not permit resending',async()=>{
  const h=fixture();login(h);records(h);
  h.el('ownerEventId').value='E1';h.el('ownerRevision').value='2';
  h.el('ownerUserId').value='s-1';
  const one=vm.runInContext('saveEventOwner()',h.ctx);
  const two=vm.runInContext('saveEventOwner()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'assignEventOwner');
  assert.equal(h.calls[0].args[3],2);
  h.calls[0].reject(new Error('ambiguous write'));
  await Promise.all([one,two]);
  assert.equal(h.el('saveOwnerBtn').disabled,true);
  assert.match(h.el('ownerSaveStatus').textContent,/ผลยังไม่ยืนยัน/);
  await vm.runInContext('saveEventOwner()',h.ctx);
  assert.equal(h.calls.length,1);
});
test('P9-03 attachment list identical read coalesces and distinguishes empty/error',async()=>{
  const h=fixture();login(h,'Admin');
  h.el('attachmentEventId').value='E1';
  const first=vm.runInContext('loadAttachmentList()',h.ctx);
  const second=vm.runInContext('loadAttachmentList()',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(h.el('attachmentList').getAttribute('aria-busy'),'true');
  h.calls[0].resolve([]);
  await Promise.all([first,second]);
  assert.equal(h.el('attachmentList').getAttribute('data-ui-state'),'empty');
  const retry=vm.runInContext('loadAttachmentList()',h.ctx);
  assert.equal(h.calls.length,2);
  h.calls[1].reject(new Error('offline'));
  await retry;
  assert.equal(h.el('attachmentList').getAttribute('data-ui-state'),'error');
});
test('P9-03 changed attachment Revision wins and old read cannot clear newer pending state',async()=>{
  const h=fixture();login(h,'Admin');
  h.el('attachmentEventId').value='E1';h.el('attachmentRevision').value='2';
  const first=vm.runInContext('loadAttachmentList()',h.ctx);
  h.el('attachmentRevision').value='3';
  const second=vm.runInContext('loadAttachmentList()',h.ctx);
  assert.equal(h.calls.length,2);
  h.calls[0].resolve([]);
  await first;
  assert.equal(h.el('attachmentList').getAttribute('aria-busy'),'true');
  h.calls[1].resolve([{attachmentId:'A1',fileName:'new.pdf',sizeBytes:2}]);
  await second;
  assert.equal(h.el('attachmentList').getAttribute('data-ui-state'),'ready');
  assert.match(h.el('attachmentList').innerHTML,/new.pdf/);
});
test('P9-03 upload separates local read error from unknown server commit',async()=>{
  const h=fixture();login(h,'Admin');records(h);
  h.el('attachmentEventId').value='E1';h.el('attachmentRevision').value='2';
  h.el('attachmentClosed').value='0';
  h.el('attachmentFile').files=[{name:'synthetic.pdf',size:2,type:'application/pdf'}];
  vm.runInContext("openModal('attachmentModal')",h.ctx);
  h.ctx.fileToBase64=async()=>{throw Error('bad read')};
  await vm.runInContext('uploadAttachment()',h.ctx);
  assert.equal(h.calls.length,0);
  assert.equal(h.el('uploadAttachmentBtn').disabled,false);
  h.ctx.fileToBase64=async()=> 'YQ==';
  const first=vm.runInContext('uploadAttachment()',h.ctx);
  await microtasks();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'uploadEventAttachment');
  h.calls[0].reject(new Error('ambiguous server response'));
  await first;
  assert.equal(h.el('uploadAttachmentBtn').disabled,true);
  assert.match(h.el('attachmentUploadStatus').textContent,/ยังยืนยันผลอัปโหลดไม่ได้/);
  await vm.runInContext('uploadAttachment()',h.ctx);
  assert.equal(h.calls.length,1,'unknown must not create a second upload');
  vm.runInContext("closeModal('attachmentModal')",h.ctx);
  const reopened=vm.runInContext('openAttachmentModal(0)',h.ctx);
  assert.equal(h.el('uploadAttachmentBtn').disabled,true,
    'reopening the same Event/Revision must show unknown instead of allowing retry');
  assert.match(h.el('attachmentUploadStatus').textContent,/ยังยืนยันผลอัปโหลดก่อนหน้าไม่ได้/);
  h.calls[1].resolve([]);
  await reopened;
});
test('P9-03 download same file uses one RPC and stale logout never makes Blob',async()=>{
  const h=fixture();login(h,'Admin');
  h.el('attachmentEventId').value='E1';
  const button=h.el('downloadBtn');
  const one=vm.runInContext('downloadAttachment("A1",document.getElementById("downloadBtn"))',h.ctx);
  const two=vm.runInContext('downloadAttachment("A1",document.getElementById("downloadBtn"))',h.ctx);
  assert.equal(h.calls.length,1);
  assert.equal(button.disabled,true);
  vm.runInContext('token="";currentUser=null;invalidateEventActionUi()',h.ctx);
  h.calls[0].resolve({base64:'YQ==',fileName:'secret.pdf',mimeType:'application/pdf'});
  await Promise.all([one,two]);
  assert.deepEqual(h.downloads,[]);
});
