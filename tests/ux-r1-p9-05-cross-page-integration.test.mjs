// P9-05 source-only integration tests. No real GAS/Drive/Gemini/network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function deferred(){
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject};
}
function fixture(){
  const nodes=new Map(),calls=[],notices=[],storage=new Map(),events={};
  let active=null;
  function el(id){
    if(!nodes.has(id)){
      const attributes=new Map(),classes=new Set();
      nodes.set(id,{
        id,tagName:'BUTTON',value:'',innerHTML:'<i>Original icon</i>',
        textContent:'',hidden:false,disabled:false,isConnected:true,src:'',files:[],
        style:{display:''},dataset:{},options:[],tabIndex:0,
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
          contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x)}},
        setAttribute:(k,v)=>attributes.set(k,String(v)),
        getAttribute:k=>attributes.get(k)||null,removeAttribute:k=>attributes.delete(k),
        focus(){active=this},contains(){return false},querySelectorAll(){return[]}
      });
    }
    return nodes.get(id);
  }
  const document={
    readyState:'loading',getElementById:el,
    querySelectorAll(){return[]},querySelector(){return null},
    addEventListener:(event,cb)=>{(events[event]??=[]).push(cb)},
    documentElement:{style:{setProperty(){}}},
    createElement:()=>({dataset:{},style:{},click(){},remove(){}}),
    body:{appendChild(){}},
    get activeElement(){return active}
  };
  const ctx=vm.createContext({document,console,window:{_contentRows:[]},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
      removeItem:k=>storage.delete(k)},google:{script:{run:{}}},
    confirm:()=>true,setTimeout(){},clearTimeout(){},setInterval(){return 1},clearInterval(){},
    Blob,Uint8Array,atob:()=>''});
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path})
      .runInContext(ctx,{timeout:3000});
  }
  ctx.gs=(name,...args)=>{const d=deferred();calls.push({name,args,...d});return d.promise};
  ctx.toast=m=>notices.push(String(m));
  ctx.loadDashboard=async()=>{};
  ctx.renderTables=()=>{};
  ctx.destroyDashboardCharts=()=>{};
  return {ctx,el,calls,notices,events,storage,
    run:s=>vm.runInContext(s,ctx),active:()=>active};
}
function signIn(h,session='syn-A'){
  h.run('token='+JSON.stringify(session)+';currentUser={role:"Manager",name:"Synthetic",email:"syn@example.invalid"};allData=[{eventId:"E1",revision:2,col6:"Synthetic"}]');
}
test('P9-05 five pages/seven admin workspaces retain bounded statuses and keyboard navigation',()=>{
  const layout=read('src/web/02-app-layout.html');
  for(const id of ['page-dashboard','page-records','page-reporter','page-admin','page-library',
    'reportRegistryLoadStatus','adminAnalyticsStatus','adminSettingsReadStatus',
    'adminUsersReadStatus','adminMasterReadStatus','adminAreasReadStatus',
    'adminContentReadStatus','adminAuditReadStatus','adminRepairStatus','adminImportStatus']){
    assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  for(const p of ['overview','settings','users','master','areas','content','audit']){
    assert.match(layout,new RegExp('id="admin-tab-'+p+'"'));
    assert.match(layout,new RegExp('id="admin-workspace-'+p+'"'));
  }
  const h=fixture();signIn(h);
  h.run("applyAdminWorkspace('overview')");
  let prevented=0;
  h.ctx.handleAdminWorkspaceKeys({key:'ArrowRight',preventDefault(){prevented++}});
  assert.equal(prevented,1);
  assert.equal(h.el('admin-tab-settings').getAttribute('aria-selected'),'true');
  assert.equal(h.el('admin-workspace-settings').hidden,false);
  h.ctx.handleAdminWorkspaceKeys({key:'End',preventDefault(){prevented++}});
  assert.equal(h.el('admin-tab-audit').getAttribute('aria-selected'),'true');
  assert.equal(h.active(),h.el('admin-tab-audit'));
});
test('P9-05 concurrent Admin and reporter reads lose ownership on logout; no private repaint',async()=>{
  const h=fixture();signIn(h);
  const users=h.run('loadUsers()');
  const summaries=h.run('refreshReportSummaries()');
  const history=h.run('openEventReportHistoryByIndex(0)');
  assert.deepEqual(h.calls.map(x=>x.name),['listUsers','getReportSummariesForEvents','listReportsForEvent']);
  assert.equal(h.el('adminUsersReadStatus').getAttribute('aria-busy'),'true');
  assert.equal(h.el('reportBody').getAttribute('aria-busy'),'true');
  assert.equal(h.el('reportHistoryList').getAttribute('aria-busy'),'true');
  const logout=h.run('doLogout()');
  assert.equal(h.calls[3].name,'logout');
  assert.equal(h.run('token'),'');
  assert.equal(h.el('reportBody').getAttribute('aria-busy'),'false');
  assert.equal(h.el('reportHistoryList').getAttribute('aria-busy'),'false');
  assert.equal(h.el('reportRegistryLoadStatus').textContent,'');
  assert.equal(h.el('reportRegistryLoadStatus').hidden,true);
  h.calls[0].resolve([{name:'PRIVATE USER',email:'private@example.invalid'}]);
  h.calls[1].resolve({summaries:{E1:{count:99,invalidCount:0}}});
  h.calls[2].resolve({count:1,reports:[{reportId:'PRIVATE REPORT'}]});
  await Promise.all([users,summaries,history]);
  assert.doesNotMatch(h.el('userBody').innerHTML,/PRIVATE USER/);
  assert.doesNotMatch(h.el('reportHistoryList').innerHTML,/PRIVATE REPORT/);
  assert.equal(h.run('reportSummaryState.status'),'idle');
  h.calls[3].resolve(true);
  await logout;
});
test('P9-05 independent Owner/Admin saves can run together; unknown blocks both without global lock',async()=>{
  const h=fixture();signIn(h);
  h.el('ownerEventId').value='E1';h.el('ownerRevision').value='2';
  h.el('ownerUserId').value='U1';
  h.el('uId').value='U2';h.el('uName').value='Synthetic user';
  const owner=h.run('saveEventOwner()');
  const admin=h.run('saveUser()');
  await Promise.all([h.run('saveEventOwner()'),h.run('saveUser()')]);
  assert.deepEqual(h.calls.map(x=>x.name),['assignEventOwner','updateUser']);
  assert.equal(h.el('saveOwnerBtn').getAttribute('aria-busy'),'true');
  assert.equal(h.el('adminSaveUserBtn').getAttribute('aria-busy'),'true');
  h.calls[0].reject(new Error('ambiguous owner update'));
  h.calls[1].reject(new Error('ambiguous admin write'));
  await Promise.all([owner,admin]);
  assert.equal(h.el('saveOwnerBtn').disabled,true);
  assert.equal(h.el('adminSaveUserBtn').disabled,true);
  assert.match(h.el('ownerSaveStatus').textContent,/ผลยังไม่ยืนยัน/);
  assert.match(h.el('adminUserWriteStatus').textContent,/ไม่สามารถยืนยันผล/);
  await Promise.all([h.run('saveEventOwner()'),h.run('saveUser()')]);
  assert.equal(h.calls.length,2,'neither unknown write may resubmit');
});
test('P9-05 attachment IDs never become executable inline attribute source',async()=>{
  const h=fixture();signIn(h);
  h.el('attachmentEventId').value='E1';h.el('attachmentRevision').value='2';
  h.el('attachmentClosed').value='0';
  const work=h.run('loadAttachmentList()');
  assert.equal(h.calls[0].name,'listEventAttachments');
  const suspicious='id\'" onmouseover="alert(1) & <script>';
  h.calls[0].resolve([{attachmentId:suspicious,fileName:'Safe synthetic file',sizeBytes:2}]);
  await work;
  const markup=h.el('attachmentList').innerHTML;
  assert.match(markup,/data-attachment-id="/);
  assert.match(markup,/&#39;/);
  assert.match(markup,/&quot;/);
  assert.match(markup,/&amp;/);
  assert.match(markup,/&lt;script&gt;/);
  assert.match(markup,/onclick="downloadAttachment\(this\.dataset\.attachmentId,this\)"/);
  assert.match(markup,/onclick="removeAttachment\(this\.dataset\.attachmentId\)"/);
  assert.doesNotMatch(markup,/onclick='downloadAttachment\(/);
  assert.doesNotMatch(markup,/onmouseover="alert\(1\)"/);
});
test('P9-05 synchronous Record/AI/Library filters do not dispatch RPC or progress overlay',()=>{
  const h=fixture();signIn(h);
  h.run('allData=[];currentContent=[{title:"Public",status:"published",category:"Guide"}]');
  h.run('renderLibrary();resetLibraryFilters();renderReporterWorklist();resetReporterFilters();renderTables();resetRecordFilters()');
  assert.equal(h.calls.length,0);
  const css=read('src/web/01-styles.html');
  assert.match(css,/@media\s*\(max-width:\s*560px\)/);
  assert.match(css,/@media\s*\(max-width:\s*980px\)/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.app \.fa-spin,\.app \.fa-pulse\s*\{\s*animation:\s*none!important/);
  const native=read('src/web/03b-client-core.html');
  assert.match(native,/status\.textContent=String\(message\|\|''\)/);
  assert.doesNotMatch(native,/document\.body\.classList\.add\(['"]loading/);
});
test('P9-05 unknown action lease requires authoritative release and does not forge success',()=>{
  const h=fixture();
  h.el('integrationBtn').innerHTML='<b>Submit</b>';
  const lease=h.run("uiBeginAction('integration:mutation',{buttonId:'integrationBtn',statusId:'integrationStatus',pendingText:'กำลังบันทึก...'})");
  assert.ok(lease);
  assert.equal(h.el('integrationBtn').getAttribute('aria-busy'),'true');
  h.run("uiFinishAction(uiPendingActions.get('integration:mutation'),'unknown','ผลยังไม่แน่ชัด')");
  assert.equal(h.el('integrationBtn').disabled,true);
  assert.equal(h.run("uiBeginAction('integration:mutation',{buttonId:'integrationBtn'})"),null);
  assert.equal(h.run("uiUnverifiedActionKeys.has('integration:mutation')"),true);
  assert.equal(h.run("uiConfirmActionResult('integration:mutation')"),true);
  assert.equal(h.el('integrationBtn').disabled,true,'manual verification never auto-clicks or re-enables');
  assert.match(h.el('integrationStatus').textContent,/ผลยังไม่แน่ชัด/);
});
