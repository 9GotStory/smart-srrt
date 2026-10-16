// P9-04: offline Native24 UI state ownership; synthetic RPC only, no live Apps Script.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function fixture(){
  const elements=new Map(),calls=[],toasts=[];
  function el(id){
    if(!elements.has(id)){
      const attrs=new Map(),classes=new Set();
      elements.set(id,{
        id,value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,isConnected:true,
        style:{display:''},dataset:{},options:[],files:[],
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),
          toggle(k,on){if(on)classes.add(k);else classes.delete(k)},
        },
        setAttribute(k,v){attrs.set(k,String(v))},getAttribute:k=>attrs.get(k)||null,
        removeAttribute:k=>attrs.delete(k),focus(){}
      });
    }
    return elements.get(id);
  }
  const context=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return[]},
      querySelector(){return null},createElement(){return {dataset:{},style:{}}}},
    window:{_contentRows:[]},console,setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},confirm:()=>false
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'?
      code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path}).runInContext(context,{timeout:3000});
  }
  context.gs=(name,...args)=>{const d=deferred();calls.push({name,args,...d});return d.promise};
  context.toast=v=>toasts.push(String(v));
  return {context,el,calls,toasts,read:expr=>vm.runInContext(expr,context)};
}
function login(h,role='Manager'){h.read('token="synthetic-session";currentUser={role:'+JSON.stringify(role)+'};allData=[]')}
test('P9-04 Admin user read is scoped, accessible, latest-wins and distinguishes empty',async()=>{
  const h=fixture();login(h);
  h.el('userSearch').value='old';
  const a=h.read('loadUsers()');
  assert.equal(h.calls[0].name,'listUsers');
  assert.match(h.el('adminUsersReadStatus').textContent,/กำลังโหลด/);
  assert.equal(h.el('adminUsersReadStatus').getAttribute('aria-busy'),'true');
  h.el('userSearch').value='new';
  const b=h.read('loadUsers()');
  h.calls[1].resolve([{userId:'U2',name:'LATEST',email:'latest@example.invalid'}]);
  await b;
  h.calls[0].resolve([{userId:'U1',name:'OLD',email:'old@example.invalid'}]);
  await a;
  assert.match(h.el('userBody').innerHTML,/LATEST/);
  assert.doesNotMatch(h.el('userBody').innerHTML,/OLD/);
  assert.equal(h.el('adminUsersReadStatus').getAttribute('aria-busy'),'false');
  assert.equal(h.el('adminUsersReadStatus').getAttribute('data-ui-state'),'ready');
  const c=h.read('loadUsers()');h.calls[2].resolve([]);await c;
  assert.equal(h.el('adminUsersReadStatus').getAttribute('data-ui-state'),'empty');
});
test('P9-04 Admin session reset invalidates private statuses and ignores late result',async()=>{
  const h=fixture();login(h);
  const pending=h.read('loadContentAdmin()');
  assert.equal(h.el('adminContentReadStatus').getAttribute('aria-busy'),'true');
  h.read('token="";currentUser=null;resetAdminPrivate()');
  h.calls[0].resolve([{title:'PRIVATE',status:'draft'}]);
  await pending;
  assert.equal(h.el('contentAdminList').innerHTML,'');
  assert.equal(h.el('adminContentReadStatus').textContent,'');
  assert.equal(h.el('adminContentReadStatus').getAttribute('aria-busy'),'false');
});
test('P9-04 six Admin list payloads preserve null-as-error and valid empty state',async()=>{
  const h=fixture();login(h);
  const scenarios=[
    ['loadSettings','adminSettingsReadStatus',[]],
    ['loadMasterDataAdmin','adminMasterReadStatus',{items:[],types:[]}],
    ['loadAreasAdmin','adminAreasReadStatus',[]],
    ['loadContentAdmin','adminContentReadStatus',[]],
    ['loadAudit','adminAuditReadStatus',[]]
  ];
  for(const [fn,status,result] of scenarios){
    const p=h.read(fn+'()');const rpc=h.calls.at(-1);rpc.resolve(result);await p;
    assert.equal(h.el(status).getAttribute('data-ui-state'),'empty',fn);
    const failure=h.read(fn+'()');h.calls.at(-1).resolve(null);await failure;
    assert.equal(h.el(status).getAttribute('data-ui-state'),'error',fn);
  }
});
test('P9-04 report summaries expose loading/error and do not infer absent registry',async()=>{
  const h=fixture();login(h,'Admin');
  h.read('allData=[{eventId:"E1",revision:1,col6:"Synthetic"}]');
  const a=h.read('refreshReportSummaries()');
  assert.equal(h.calls[0].name,'getReportSummariesForEvents');
  assert.equal(h.el('reportBody').getAttribute('aria-busy'),'true');
  h.calls[0].reject(Error('offline'));
  await a;
  assert.equal(h.el('reportBody').getAttribute('data-ui-state'),'error');
  assert.equal(h.read('reportSummaryState.status'),'error');
  const b=h.read('refreshReportSummaries()');
  h.calls[1].resolve({summaries:{E1:{count:0,invalidCount:0}}});
  await b;
  assert.equal(h.read('reportSummaryState.status'),'ready');
  assert.equal(h.el('reportBody').getAttribute('aria-busy'),'false');
  assert.match(h.el('reportRegistryLoadStatus').textContent,/1 เหตุการณ์/);
});
test('P9-04 report history marks bounded loading/empty and never paints a stale session',async()=>{
  const h=fixture();login(h,'Admin');
  h.read('allData=[{eventId:"E1",col6:"Synthetic",col2:"2569-10-16"}]');
  const request=h.read('openEventReportHistoryByIndex(0)');
  assert.equal(h.calls[0].name,'listReportsForEvent');
  assert.equal(h.el('reportHistoryList').getAttribute('aria-busy'),'true');
  h.calls[0].resolve({count:0,currentRevision:1,reports:[]});
  await request;
  assert.equal(h.el('reportHistoryList').getAttribute('data-ui-state'),'empty');
  const old=h.read('openEventReportHistoryByIndex(0)');
  h.read('token="";currentUser=null;reportHistoryRequest++;');
  h.calls[1].resolve({count:1,reports:[{reportId:'PRIVATE'}]});
  await old;
  assert.doesNotMatch(h.el('reportHistoryList').innerHTML,/PRIVATE/);
});
test('P9-04 public Library filters remain purely local and exclude drafts',()=>{
  const h=fixture();h.read('currentContent=[{title:"Public manual",status:"published",category:"Guide",url:"https://example.invalid/manual"},{title:"Private draft",status:"draft",category:"Internal"}]');
  h.read('renderLibrary()');
  assert.match(h.el('libraryList').innerHTML,/Public manual/);
  assert.doesNotMatch(h.el('libraryList').innerHTML,/Private draft/);
  h.el('librarySearch').value='not-a-match';h.read('renderLibrary()');
  h.read('resetLibraryFilters()');
  assert.equal(h.calls.length,0,'public Library filter/reset must not dispatch RPC or spinner');
});
