// UX-R1/P7-01 — source-grounded final integration checks, no GAS/network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../tools/native-sources.mjs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=read('src/web/02-app-layout.html'),dialogs=read('src/web/03-modals.html');
const clientAuth=read('src/web/03c-client-auth.html'),events=read('src/web/03h-client-event-records.html');
const reporter=read('src/web/03i-client-report-actions.html'),job=read('src/web/03j-client-report-job.html');
const library=read('src/web/04-browser-app.html');
const release=read('docs/ux/ux-r1-p7-release-integration-checklist.md');

const PAGE_IDS=['dashboard','records','reporter','admin','library'];
const MODAL_IDS=[
  'loginModal','recordModal','ownerModal','attachmentModal','eventActionModal',
  'reportHistoryModal','reportNewConfirmModal','reportResultModal','reportCancelConfirmModal',
  'reportReadinessModal','userModal','masterDataModal','areaModal','contentModal'
];
const ADMIN_MODAL_IDS=['userModal','masterDataModal','areaModal','contentModal'];
const WORKSPACES=['overview','settings','users','master','areas','content','audit'];

test('P7-01 Native25 uses 8 GS, 16 ordered native HTML and one Index; legacy OneClick untouched',()=>{
  assert.equal(GAS_SERVER_SOURCES.length,8);
  assert.equal(GAS_HTML_SOURCES.length,16);
  assert.equal(GAS_SERVER_SOURCES.length+GAS_HTML_SOURCES.length+1,25);
  assert.equal(GAS_HTML_SOURCES[0],'src/web/00-document-head.html');
  assert.equal(GAS_HTML_SOURCES.at(-1),'src/web/04-browser-app.html');
  assert.ok(GAS_HTML_SOURCES.includes('src/web/03-modals.html'));
  assert.ok(GAS_HTML_SOURCES.includes('src/web/03c-client-auth.html'));
  assert.ok(GAS_HTML_SOURCES.includes('src/web/03j-client-report-job.html'));
});
test('P7-01 five existing pages have one nav target each, seven Admin workspaces',()=>{
  const ids=[...layout.matchAll(/<section id="page-([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(ids,PAGE_IDS);
  for(const page of PAGE_IDS)
    assert.equal((layout.match(new RegExp('data-page="'+page+'"','g'))||[]).length,1,page);
  assert.equal((layout.match(/role="tabpanel"/g)||[]).length,7);
  for(const key of WORKSPACES){
    assert.equal((layout.match(new RegExp('id="admin-workspace-'+key+'"','g'))||[]).length,1);
    assert.equal((layout.match(new RegExp('id="admin-tab-'+key+'"','g'))||[]).length,1);
  }
  assert.match(clientAuth,/page==='admin'&&!roleCanManage\(\)/);
  assert.match(clientAuth,/page==='library'\)renderLibrary\(\)/);
  assert.match(layout,/id="page-dashboard" class="section active"/);
});
test('P7-01 all fourteen native dialogs are uniquely identified and have semantic labels',()=>{
  const found=[...dialogs.matchAll(/<div class="modal(?: [^"]*)?" id="([^"]+)"([^>]*)>/g)];
  assert.equal(found.length,14);
  assert.deepEqual(found.map(m=>m[1]),MODAL_IDS);
  assert.equal(new Set(found.map(m=>m[1])).size,14);
  for(const match of found){
    const id=match[1],attrs=match[2];
    assert.match(attrs,/role="(?:dialog|alertdialog)"/,id);
    assert.match(attrs,/aria-modal="true"/,id);
    const label=attrs.match(/aria-labelledby="([^"]+)"/);
    assert.ok(label,id+' must expose a visible dialog heading');
    assert.equal((dialogs.match(new RegExp('id="'+label[1]+'"','g'))||[]).length,1,
      id+' heading ID must be unique');
  }
  assert.equal((dialogs.match(/id="reportTaskIndicator"/g)||[]).length,1);
  assert.ok(!MODAL_IDS.includes('reportTaskIndicator'),'indicator is not a modal');
  assert.match(dialogs,/id="eventActionModal" role="alertdialog"/);
});
test('P7-01 all Admin dialog input controls (except hidden identity) have associated labels',()=>{
  for(const id of ADMIN_MODAL_IDS){
    const start=dialogs.indexOf('<div class="modal" id="'+id+'"');
    assert.ok(start>=0,id+' is present');
    const end=dialogs.indexOf('</div></div>',start);
    assert.ok(end>start,id+' is bounded');
    const fragment=dialogs.slice(start,end);
    const controls=[...fragment.matchAll(/<(?:input|select|textarea)\b([^>]*\bid="([^"]+)"[^>]*)>/g)]
      .filter(m=>!m[1].includes('type="hidden"')).map(m=>m[2]);
    assert.ok(controls.length>=4,id+' has editable fields');
    for(const field of controls){
      assert.equal((fragment.match(new RegExp('<label for="'+field+'">','g'))||[]).length,1,
        id+' must label '+field);
    }
  }
});
test('P7-01 page and dialog IDs never collide across canonical visible markup',()=>{
  const ids=[...((layout+'\n'+dialogs).matchAll(/\bid="([A-Za-z][A-Za-z0-9_-]*)"/g))].map(x=>x[1]);
  const duplicates=ids.filter((value,i)=>ids.indexOf(value)!==i);
  assert.deepEqual([...new Set(duplicates)],[]);
});
test('P7-01 critical cross-phase single-action, guest and logout invariants retain their owners',()=>{
  assert.match(events,/renderReporterWorklist\(\)/);
  assert.match(events,/roleCanRecord\(\)\?reportActionButton\(r.eventId\|\|'',false\)/);
  assert.match(reporter,/function reportActionButton\(eventId,compact\)/);
  assert.match(job,/function reportJobTerminal\(job\)/);
  assert.match(clientAuth,/\+\+reportJobCreateRequest/);
  assert.match(clientAuth,/reportUnknownNeedsVerification=false/);
  assert.match(clientAuth,/token='';localStorage.removeItem\('SRRT_TOKEN'\)/);
  assert.match(clientAuth,/resetAdminPrivate\(\)/);
  assert.match(library,/function publicLibraryItems\(\)/);
  assert.match(library,/function safeLibraryUrl\(raw\)/);
  assert.match(library,/function adminCurrent\(ctx\)/);
  assert.match(clientAuth,/function canSelfRegister\(\)/);
  assert.match(clientAuth,/function authResultCurrent\(epoch,startToken,startUser\)/);
});
test('P7-01 anonymous Library navigation remains read-only and Admin navigation role-gated',()=>{
  const nodes=new Map(),requests=[],toasts=[];
  const el=id=>{
    if(!nodes.has(id)){
      const values=new Set();
      nodes.set(id,{
        id,value:'',innerHTML:'',textContent:'',hidden:false,style:{display:''},
        dataset:{},getAttribute(){return null},setAttribute(){},removeAttribute(){},
        classList:{add:v=>values.add(v),remove:v=>values.delete(v),
          contains:v=>values.has(v),toggle:(v,yes)=>yes?values.add(v):values.delete(v)},
        focus(){},contains(){return false}
      });
    }
    return nodes.get(id);
  };
  const nav=PAGE_IDS.map(page=>{const v=el('nav-'+page);v.dataset.page=page;return v});
  const doc={
    readyState:'loading',getElementById:el,addEventListener(){},
    querySelectorAll(sel){
      if(sel==='.section')return PAGE_IDS.map(page=>el('page-'+page));
      if(sel==='.nav button')return nav;
      if(sel==='td[data-report-job-event-id]')return [];
      return []
    },
    querySelector(sel){return sel==='[data-page="dashboard"]'?nav[0]:null},
    activeElement:null
  };
  const context=vm.createContext({
    document:doc,localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},URL,console,setTimeout(){}
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path})
      .runInContext(context,{timeout:3000})
  }
  context.gs=(...args)=>{requests.push(args);throw Error('navigation must not call RPC')};
  context.toast=msg=>toasts.push(String(msg));
  vm.runInContext('token="";currentUser=null;currentContent=[{title:"ประกาศทดสอบ",category:"ประกาศ",url:"https://example.org/doc"}]',context);
  vm.runInContext("showPage('library',null)",context);
  assert.equal(el('page-library').classList.contains('active'),true);
  assert.match(el('libraryList').innerHTML,/ประกาศทดสอบ/);
  assert.equal(requests.length,0);
  vm.runInContext("showPage('admin',null)",context);
  assert.equal(el('page-admin').classList.contains('active'),false);
  assert.match(toasts.join(' '),/สิทธิ์ไม่เพียงพอ/);
  assert.equal(requests.length,0);
});
test('P7-01 release document never mistakes CI for live Browser/rollback approval',()=>{
  for(const required of ['Native24','14','NOT RUN','TEST','Version 12','Production','HOLD',
    '360','390','768','1024','1440','Gemini','Logout','ReportRegistry','Rollback Gate','releaseDecision=HOLD'])
    assert.ok(release.includes(required),'release guide missing '+required);
  assert.match(release,/separate Product Owner authorization/);
  assert.match(release,/An author-assisted review/);
  assert.match(release,/Do not use `clasp push`/);
});
