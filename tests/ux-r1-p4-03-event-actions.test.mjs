// UX-R1/P4-03: explicit operator confirmation without changed server RPCs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const markup=read('src/web/03-modals.html'),owner=read('src/web/03f-client-event-controls.html'),record=read('src/web/03h-client-event-records.html'),auth=read('src/web/03c-client-auth.html');

function fixture(){
  const els=new Map(),rpc=[];
  let focused=null;
  const el=id=>{
    if(!els.has(id)){
      const states=new Set();
      els.set(id,{
        id,value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,
        style:{display:''},dataset:{},
        classList:{add:x=>states.add(x),remove:x=>states.delete(x),contains:x=>states.has(x)},
        focus(){focused=id},setAttribute(){},removeAttribute(){}
      });
    }
    return els.get(id);
  };
  const document={readyState:'loading',getElementById:el,addEventListener(){},get activeElement(){return {focus(){}}}};
  const ctx=vm.createContext({document,localStorage:{getItem(){return null},setItem(){},removeItem(){}},google:{script:{run:{}}},setTimeout(){},console});
  for(const script of readOrderedClientScripts()){
    new vm.Script(script.path==='src/web/04-browser-app.html'?script.code.replace(/^\s*boot\(\);\s*$/m,''):script.code,{filename:script.path}).runInContext(ctx,{timeout:2500})
  }
  ctx.gs=(...args)=>{rpc.push(args);return Promise.resolve('ยืนยันแล้ว')};
  ctx.loadDashboard=async()=>{};
  return {ctx,el,rpc,getFocus:()=>focused};
}
test('P4-03 one labelled reason dialog and two attachment labels exist',()=>{
  assert.match(markup,/id="eventActionModal" role="alertdialog" aria-modal="true"/);
  assert.match(markup,/id="eventActionReason"[^>]*maxlength="500"/);
  for(const name of ['ownerEventContext','ownerSaveStatus','attachmentEventContext','attachmentListStatus'])
    assert.match(markup,new RegExp('id="'+name+'"'));
  for(const name of ['attachmentFile','attachmentDescription'])
    assert.match(markup,new RegExp('<label for="'+name+'">'));
  assert.match(record,/function closeEventFlow\(eventId,revision\)/);
  assert.match(record,/function reopenEventFlow\(eventId,revision\)/);
  assert.match(owner,/function removeAttachment\(attachmentId\)/);
  assert.match(auth,/invalidateEventActionUi\(\)/);
});
test('P4-03 close/reopen/void preserve reason and expected Revision',async()=>{
  const {ctx,el,rpc}=fixture();
  vm.runInContext('token="test";currentUser={role:"Manager"};allData=[{eventId:"E1",revision:4,recordStatus:"active",col6:"เหตุการณ์ทดสอบ"}]',ctx);
  vm.runInContext("closeEventFlow('E1',4)",ctx);
  assert.equal(el('eventActionModal').classList.contains('open'),true);
  assert.equal(el('eventActionError').hidden,true);
  await vm.runInContext('confirmEventAction()',ctx);
  assert.equal(rpc.length,0,'blank reason must block');
  assert.equal(el('eventActionError').hidden,false);
  el('eventActionReason').value='ปิดเพื่อตรวจสอบ';
  await vm.runInContext('confirmEventAction()',ctx);
  assert.equal(rpc[0][0],'closeEvent');
  assert.equal(rpc[0][1],'test');
  assert.equal(rpc[0][2],'E1');
  assert.equal(rpc[0][3],'ปิดเพื่อตรวจสอบ');
  assert.equal(rpc[0][4],4);
  vm.runInContext('allData[0].recordStatus="closed"',ctx);
  vm.runInContext("reopenEventFlow('E1',4)",ctx);
  el('eventActionReason').value='พบข้อมูลใหม่';
  await vm.runInContext('confirmEventAction()',ctx);
  assert.equal(rpc[1][0],'reopenEvent');
  assert.equal(rpc[1][4],4);
  vm.runInContext('allData[0].recordStatus="active"',ctx);
  vm.runInContext("deleteEvent('E1',4)",ctx);
  el('eventActionReason').value='เหตุการณ์ซ้ำ';
  await vm.runInContext('confirmEventAction()',ctx);
  assert.equal(rpc[2][0],'deleteRecord');
  assert.equal(rpc[2][4],4);
});
test('P4-03 attachment removal is manager gated, revision-safe, and cancellation causes no RPC',async()=>{
  const {ctx,el,rpc}=fixture();
  vm.runInContext('token="test";currentUser={role:"Manager"};allData=[{eventId:"E1",revision:4,recordStatus:"active"}]',ctx);
  el('attachmentEventId').value='E1';el('attachmentRevision').value='4';el('attachmentClosed').value='0';
  vm.runInContext("removeAttachment('A1')",ctx);
  vm.runInContext('cancelEventAction()',ctx);
  assert.equal(rpc.length,0);
  vm.runInContext("removeAttachment('A1')",ctx);
  el('eventActionReason').value='ไฟล์แนบผิด';
  await vm.runInContext('confirmEventAction()',ctx);
  assert.equal(rpc[0][0],'removeEventAttachment');
  assert.equal(rpc[0][2],'A1');
  assert.equal(rpc[0][3],'ไฟล์แนบผิด');
  assert.equal(rpc[0][4],4);
  vm.runInContext('currentUser={role:"Admin"}',ctx);
  vm.runInContext("removeAttachment('A1')",ctx);
  assert.equal(el('eventActionModal').classList.contains('open'),false);
  assert.equal(rpc.length,1);
});
test('P4-03 explicit session invalidation disarms open event action without RPC',async()=>{
  const {ctx,el,rpc}=fixture();
  vm.runInContext('token="test";currentUser={role:"Manager"};allData=[{eventId:"E1",revision:4,recordStatus:"active"}]',ctx);
  vm.runInContext("closeEventFlow('E1',4)",ctx);
  el('eventActionReason').value='ปิดทดสอบ';
  vm.runInContext('token="";currentUser=null;invalidateEventActionUi()',ctx);
  await vm.runInContext('confirmEventAction()',ctx);
  assert.equal(el('eventActionModal').classList.contains('open'),false);
  assert.equal(el('eventActionReason').value,'');
  assert.equal(rpc.length,0);
});
