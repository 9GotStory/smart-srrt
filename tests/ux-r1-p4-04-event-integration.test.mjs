// P4-04: end-to-end Native24 UI boundary tests with synthetic events and deferred RPC.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const layout=read('src/web/02-app-layout.html');
const dialogs=read('src/web/03-modals.html');
function deferred(){
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
  return {promise,resolve,reject};
}
function fixture(){
  const nodes=new Map(), calls=[],toasts=[],downloads=[];
  let active=null;
  const el=id=>{
    if(!nodes.has(id)){
      const states=new Set();
      const node={id,value:'',innerHTML:'',textContent:'',hidden:false,disabled:false,
        style:{display:''},options:[],dataset:{},
        classList:{add:x=>states.add(x),remove:x=>states.delete(x),contains:x=>states.has(x)},
        setAttribute(){},removeAttribute(){},focus(){active=node}};
      nodes.set(id,node)
    }
    return nodes.get(id)
  };
  const document={
    readyState:'loading',getElementById:el,addEventListener(){},
    get activeElement(){return active},
    createElement(){return {dataset:{},click(){downloads.push('download')},remove(){}}},
    body:{appendChild(){}}
  };
  const ctx=vm.createContext({
    document,localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},console,
    URL:{createObjectURL(){downloads.push('blob');return 'blob:local-test'},revokeObjectURL(){}},
    Blob,Uint8Array,atob:()=>'',confirm:()=>true
  });
  for(const {path,code} of readOrderedClientScripts()){
    const clean=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(clean,{filename:path}).runInContext(ctx,{timeout:3000})
  }
  ctx.toast=message=>toasts.push(String(message));
  ctx.gs=(...args)=>{calls.push(args);return Promise.resolve('TEST OK')};
  ctx.loadDashboard=async()=>{};
  return {ctx,el,calls,toasts,downloads};
}
const sample=[
  {eventId:'E-A',revision:2,col2:'2569-10-12',col6:'เหตุการณ์ A',col29:'บ้านเหนือ',recordStatus:'active'},
  {eventId:'E-B',revision:3,col2:'2569-10-13',col6:'เหตุการณ์ B',col29:'บ้านใต้',recordStatus:'closed'},
  {eventId:'E-C',revision:7,col2:'2569-10-14',col6:'เหตุการณ์ C',col29:'บ้านกลาง',recordStatus:'active'}
];
function signedIn(h,role='Manager'){
  h.ctx.token='test-session';
  h.ctx.currentUser={role};
  h.ctx.allData=sample.map(r=>({...r}));
}
test('P4-04 list → filtered original index → edit form → update RPC retains EventID/Revision',async()=>{
  const h=fixture();
  signedIn(h);
  vm.runInContext('buildRecordForm()',h.ctx);
  h.el('recordSearch').value='บ้านกลาง';
  vm.runInContext('renderTables()',h.ctx);
  const row=h.el('recordBody').innerHTML;
  assert.match(row,/เหตุการณ์ C/);
  assert.doesNotMatch(row,/เหตุการณ์ A|เหตุการณ์ B/);
  assert.match(row,/openRecordForm\('edit',2\)/);
  vm.runInContext("openRecordForm('edit',2)",h.ctx);
  assert.equal(h.el('editEventId').value,'E-C');
  assert.equal(h.el('editRevision').value,'7');
  assert.equal(h.el('in2').value,'2026-10-14');
  h.el('in6').value='Synthetic corrected event';
  await vm.runInContext('saveRecord()',h.ctx);
  const rpc=h.calls.find(([name])=>name==='updateRecord');
  assert.equal(rpc[1],'test-session');
  assert.equal(rpc[2],'E-C');
  assert.equal(rpc[3].col6,'Synthetic corrected event');
  assert.equal(rpc[3].col2,'2569-10-14');
  assert.equal(rpc[4],7);
  assert.equal(h.el('recordModal').classList.contains('open'),false);
});
test('P4-04 role and closed-event controls stay separate; void/reopen require manager',()=>{
  const h=fixture();
  signedIn(h,'Admin');
  vm.runInContext('renderTables()',h.ctx);
  const admin=h.el('recordBody').innerHTML;
  assert.match(admin,/openRecordForm\('edit',0\)/);
  assert.doesNotMatch(admin,/closeEventFlow\(/);
  assert.doesNotMatch(admin,/reopenEventFlow\(/);
  signedIn(h,'Manager');
  vm.runInContext('renderTables()',h.ctx);
  const manager=h.el('recordBody').innerHTML;
  assert.match(manager,/closeEventFlow\("E-A",2\)/);
  assert.match(manager,/reopenEventFlow\("E-B",3\)/);
  assert.doesNotMatch(manager,/openRecordForm\('edit',1\)/);
  const start=h.calls.length;
  vm.runInContext("closeEventFlow('E-B',3)",h.ctx);
  assert.equal(h.el('eventActionModal').classList.contains('open'),false);
  assert.equal(h.calls.length,start);
});
test('P4-04 session invalidation before attachment base64 completes stops upload RPC',async()=>{
  const h=fixture();signedIn(h,'Admin');
  h.el('attachmentEventId').value='E-C';
  h.el('attachmentRevision').value='7';
  h.el('attachmentClosed').value='0';
  h.el('attachmentDescription').value='synthetic file';
  h.el('attachmentFile').files=[{name:'synthetic.pdf',size:30,type:'application/pdf'}];
  vm.runInContext("openModal('attachmentModal')",h.ctx);
  const file=deferred();
  h.ctx.fileToBase64=()=>file.promise;
  const action=vm.runInContext('uploadAttachment()',h.ctx);
  assert.equal(h.el('uploadAttachmentBtn').disabled,true);
  vm.runInContext("token='';currentUser=null;invalidateEventActionUi()",h.ctx);
  file.resolve('YQ==');
  await action;
  assert.equal(h.calls.filter(([name])=>name==='uploadEventAttachment').length,0);
  assert.equal(h.el('uploadAttachmentBtn').disabled,false);
  assert.equal(h.el('attachmentList').innerHTML,'');
  assert.equal(h.toasts.length,0);
});
test('P4-04 session invalidation after upload RPC suppresses stale UI and refresh',async()=>{
  const h=fixture();signedIn(h,'Admin');
  h.el('attachmentEventId').value='E-C';
  h.el('attachmentRevision').value='7';
  h.el('attachmentClosed').value='0';
  h.el('attachmentFile').files=[{name:'synthetic.png',size:30,type:'image/png'}];
  vm.runInContext("openModal('attachmentModal')",h.ctx);
  h.ctx.fileToBase64=async()=> 'YQ==';
  const network=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return network.promise};
  let refreshes=0;
  h.ctx.loadDashboard=async()=>{refreshes++};
  const action=vm.runInContext('uploadAttachment()',h.ctx);
  await Promise.resolve();await Promise.resolve();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0][0],'uploadEventAttachment');
  assert.equal(h.calls[0][1],'test-session');
  assert.equal(h.calls[0][2],'E-C');
  assert.equal(h.calls[0][4],7);
  vm.runInContext("token='';currentUser=null;invalidateEventActionUi()",h.ctx);
  network.resolve({message:'uploaded',revision:8});
  await action;
  assert.equal(refreshes,0);
  assert.equal(h.toasts.length,0);
  assert.equal(h.el('attachmentRevision').value,'7');
});
test('P4-04 stale authorized file download cannot create Blob after logout',async()=>{
  const h=fixture();signedIn(h,'Admin');
  const network=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return network.promise};
  const action=vm.runInContext("downloadAttachment('A1')",h.ctx);
  assert.equal(h.calls[0][0],'downloadEventAttachment');
  vm.runInContext("token='';currentUser=null;invalidateEventActionUi()",h.ctx);
  network.resolve({base64:'YQ==',fileName:'secret.pdf',mimeType:'application/pdf'});
  await action;
  assert.deepEqual(h.downloads,[]);
  assert.deepEqual(h.toasts,[]);
});
test('P4-04 owner/list requests from an old session cannot repopulate private modals',async()=>{
  const h=fixture();signedIn(h,'Manager');
  const owner=deferred();
  h.ctx.gs=(...args)=>{h.calls.push(args);return owner.promise};
  const action=vm.runInContext('openOwnerModal(2)',h.ctx);
  vm.runInContext("token='';currentUser=null;invalidateEventActionUi()",h.ctx);
  owner.resolve([{userId:'u1',name:'PRIVATE OWNER',role:'Admin'}]);
  await action;
  assert.equal(h.el('ownerModal').classList.contains('open'),false);
  assert.doesNotMatch(h.el('ownerUserId').innerHTML,/PRIVATE OWNER/);
  signedIn(h,'Admin');
  h.ctx.gs=(...args)=>{h.calls.push(args);return Promise.resolve([{attachmentId:'A1',fileName:'PRIVATE DOCUMENT'}])};
  h.el('attachmentEventId').value='E-C';
  const load=vm.runInContext('loadAttachmentList()',h.ctx);
  vm.runInContext("token='';currentUser=null;invalidateEventActionUi()",h.ctx);
  await load;
  assert.equal(h.el('attachmentList').innerHTML,'');
});
test('P4-04 manual UAT spec distinguishes offline PASS from browser NOT RUN',()=>{
  const doc=read('docs/ux/ux-r1-p4-event-uat.md');
  for(const token of ['P4-01','P4-02','P4-03','TEST Version 12','NOT RUN','360','390','640','Login','Console','EventID','Revision','RBAC'])
    assert.ok(doc.includes(token),'missing UAT descriptor '+token);
  for(const id of ['recordBody','recordForm','ownerModal','attachmentModal','eventActionModal'])
    assert.ok(layout.includes('id="'+id+'"')||dialogs.includes('id="'+id+'"'));
});
