import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../Index_Smart_SRRT_OneClick.html',import.meta.url),'utf8');
const EVENT='11111111-1111-4111-8111-111111111111';

// The report/history module: shared state, the new-report confirmation, both
// keydown listeners and the G-32 job machinery (same markers as the G-32/G-33 suites).
const moduleStart=html.indexOf('  // G-27: Report history is fetched on demand, never from public aggregates.');
const moduleEnd=html.indexOf('  function exportClientExcel(){',moduleStart);
assert.ok(moduleStart>0&&moduleEnd>moduleStart,'G-33 browser report module must be present in built HTML');
const reportSource=html.slice(moduleStart,moduleEnd);

// The production logout function, evaluated into the same context so it shares
// the report module's state instead of a reimplementation.
const logoutStart=html.indexOf('  async function doLogout(){');
const logoutEnd=html.indexOf('  async function register(){',logoutStart);
assert.ok(logoutStart>0&&logoutEnd>logoutStart,'production doLogout must be present in built HTML');
const logoutSource=html.slice(logoutStart,logoutEnd);

function logoutHarness(){
  const elements=new Map(),calls=[],toasts=[],listeners={},storage=new Map(),pageCalls=[];
  const deferred={};
  const doc={
    activeElement:null,
    addEventListener(type,fn){(listeners[type]=listeners[type]||[]).push(fn)},
    querySelectorAll:()=>[],
    querySelector:()=>null
  };
  function el(id){
    if(!elements.has(id)){
      const classes=new Set();
      const node={id,style:{display:''},innerHTML:'',textContent:'',href:'',disabled:false,value:'',
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),
          toggle:(x,enabled)=>enabled?classes.add(x):classes.delete(x)},
        focus(){doc.activeElement=node},removeAttribute(attr){delete node[attr]}};
      elements.set(id,node);
    }
    return elements.get(id);
  }
  storage.set('SRRT_TOKEN','session-a');
  storage.set('SRRT_G32_REPORT_JOB_ID','job-old');
  const ctx={
    console,document:doc,
    token:'session-a',currentUser:{role:'Admin',email:'a@example.test'},
    allData:[{eventId:EVENT,revision:3}],dashboardSummary:null,areas:[],
    dashboardLoadRequest:0,
    el,toast:msg=>toasts.push(String(msg)),
    openModal:id=>el(id).classList.add('open'),
    closeModal:id=>el(id).classList.remove('open'),
    escapeHtml:x=>String(x??''),
    roleCanRecord:()=>true,
    updateAuthBox:()=>pageCalls.push('updateAuthBox'),
    showPage:()=>pageCalls.push('showPage'),
    loadDashboard:async()=>{calls.push(['loadDashboard',ctx.token])},
    localStorage:{setItem(k,v){storage.set(k,String(v))},getItem:k=>storage.get(k)??null,removeItem:k=>storage.delete(k)},
    setInterval:()=>1,clearInterval(){},
    gs:(fn,...args)=>{
      calls.push([fn,...args]);
      return deferred[fn]?deferred[fn](...args):Promise.resolve(null);
    }
  };
  vm.createContext(ctx);
  vm.runInContext(reportSource,ctx,{filename:'g33-report-module',timeout:1500});
  vm.runInContext(logoutSource,ctx,{filename:'g33-logout-function',timeout:1500});
  const read=expression=>vm.runInContext(expression,ctx);
  return {
    ctx,el,calls,toasts,pageCalls,storage,read,
    on:(fn,impl)=>{deferred[fn]=impl},
    active:()=>doc.activeElement,
    setActive:node=>{doc.activeElement=node},
    fire:(type,event)=>{(listeners[type]||[]).forEach(fn=>fn(event))}
  };
}

function seedHistoryFocusTarget(h){
  vm.runInContext("reportSummaryState={status:'ready',summaries:{"+JSON.stringify(EVENT)+
    ":{count:1,latestSourceRevision:2,invalidCount:0}}};reportHistoryEventId="+JSON.stringify(EVENT),h.ctx);
  h.el('reportHistoryModal').classList.add('open');
  const opener=h.el('reportHistoryNewBtn');
  opener.style.display='inline-flex';
  opener.focus();
  return opener;
}

test('G33 R1 logout invalidates the session before a pending readiness callback can create or run a report',async()=>{
  const h=logoutHarness();
  const pending={};
  h.on('getAIReportReadiness',()=>new Promise(resolve=>{pending.readiness=resolve}));
  h.on('logout',()=>new Promise(resolve=>{pending.logout=resolve}));
  const btn=h.el('report-action');
  btn.innerHTML='สร้างรายงาน AI';
  const readiness=h.ctx.makeReport(EVENT,btn);
  const logout=h.ctx.doLogout();
  assert.deepEqual(h.calls.map(call=>call[0]),['getAIReportReadiness','logout'],
    'logout starts while the readiness response is still pending');
  assert.equal(h.calls[1][1],'session-a','the logout RPC keeps only the previous token');
  assert.equal(h.ctx.token,'');
  assert.equal(h.ctx.currentUser,null);
  assert.equal(h.storage.has('SRRT_TOKEN'),false,'local credentials are dropped synchronously');
  assert.equal(h.storage.has('SRRT_G32_REPORT_JOB_ID'),false);
  pending.readiness({level:'ready'});
  await readiness;
  pending.logout(undefined);
  await logout;
  assert.equal(h.calls.filter(call=>call[0]==='createReportJob').length,0,
    'zero new createReportJob calls after logout initiation');
  assert.equal(h.calls.filter(call=>call[0]==='runReportJob').length,0,
    'zero new runReportJob calls after logout initiation');
  assert.equal(h.el('reportResultModal').classList.contains('open'),false,
    'a stale readiness callback cannot reopen report modals');
  assert.equal(h.el('reportReadinessModal').classList.contains('open'),false);
  assert.equal(h.el('reportTaskIndicator').style.display,'none');
  assert.ok(h.calls.some(call=>call[0]==='loadDashboard'&&call[1]===''),
    'the public dashboard reload still completes once the logout RPC settles');
});

test('G33 R1 a stale create callback cannot dispatch run or unlock the next session after logout',async()=>{
  const h=logoutHarness();
  let resolveCreateA;
  h.on('createReportJob',()=>new Promise(resolve=>{resolveCreateA=resolve}));
  const createA=h.ctx.executeReport(EVENT,h.el('report-action-a'));
  const logout=h.ctx.doLogout();
  // A newer login starts before the stale create resolves.
  h.ctx.token='session-b';
  h.ctx.currentUser={role:'Admin',email:'b@example.test'};
  let resolveCreateB;
  h.on('createReportJob',()=>new Promise(resolve=>{resolveCreateB=resolve}));
  const createB=h.ctx.executeReport(EVENT,h.el('report-action-b'));
  assert.equal(h.read('reportJobCreateInFlight'),true);
  resolveCreateA({id:'old-job',eventId:EVENT,status:'queued',stage:'queued'});
  await createA;
  await logout;
  assert.equal(h.read('reportJobCreateInFlight'),true,
    'a stale finally cannot clear the newer session create lock');
  assert.equal(h.read('activeReportJob'),null,'a stale job pointer never claims the new session');
  assert.equal(h.calls.some(call=>call[0]==='loadDashboard'),
    false,'the completing logout must not navigate the newer session');
  resolveCreateB({id:'new-job',eventId:EVENT,status:'queued',stage:'queued'});
  await createB;
  assert.deepEqual(h.calls.filter(call=>call[0]==='runReportJob'),[['runReportJob','session-b','new-job']],
    'only the live session may kick a run RPC');
  assert.equal(h.read('activeReportJob').id,'new-job');
});

test('G33 R1 queued-job recovery still kicks runReportJob in-session and stops after logout',async()=>{
  const live=logoutHarness();
  live.on('getCurrentReportJob',()=>Promise.resolve({id:'job-r',eventId:EVENT,status:'queued',stage:'queued'}));
  await live.ctx.recoverReportJob();
  assert.deepEqual(live.calls.filter(call=>call[0]==='runReportJob'),[['runReportJob','session-a','job-r']],
    'existing G-32 recovery semantics are preserved for a live session');

  const stale=logoutHarness();
  let resolveRecovery;
  stale.on('getCurrentReportJob',()=>new Promise(resolve=>{resolveRecovery=resolve}));
  const recovery=stale.ctx.recoverReportJob();
  const logout=stale.ctx.doLogout();
  resolveRecovery({id:'job-r2',eventId:EVENT,status:'queued',stage:'queued'});
  await recovery;
  await logout;
  assert.equal(stale.calls.filter(call=>call[0]==='runReportJob').length,0,
    'no run RPC may be dispatched after logout begins');
  assert.equal(stale.read('reportUnknownNeedsVerification'),false,
    'a stale recovery result cannot flip the logout-cleared verification gate');
  assert.equal(stale.read('activeReportJob'),null);
});

test('G33 R1 a warning continuation neither dispatches nor mutates UI after logout',async()=>{
  const h=logoutHarness();
  h.ctx.renderReportReadinessModal({level:'review',warningCount:2,warnings:[]},EVENT);
  assert.equal(h.el('reportReadinessModal').classList.contains('open'),true);
  let resolveRegistry;
  h.on('getReportSummariesForEvents',()=>new Promise(resolve=>{resolveRegistry=resolve}));
  const continuation=h.ctx.continueReportFromWarning();
  const logout=h.ctx.doLogout();
  assert.equal(h.el('reportReadinessModal').classList.contains('open'),false,
    'logout closes a leftover readiness dialog');
  resolveRegistry({summaries:{[EVENT]:{count:0,latestSourceRevision:0,invalidCount:0}}});
  await continuation;
  await logout;
  assert.equal(h.calls.filter(call=>call[0]==='createReportJob'||call[0]==='runReportJob').length,0);
  const callsBefore=h.calls.length;
  await h.ctx.continueReportFromWarning();
  assert.equal(h.calls.length,callsBefore,
    'a leftover continue control dispatches nothing once logged out');
});

test('G33 R2 Back and Escape close the confirmation and restore focus to the history opener',()=>{
  const h=logoutHarness();
  const opener=seedHistoryFocusTarget(h);
  h.ctx.requestNewReportFromHistory();
  assert.equal(h.el('reportNewConfirmModal').classList.contains('open'),true);
  assert.equal(h.active(),h.el('reportNewConfirmBackBtn'),'opening moves focus into the dialog');
  h.ctx.cancelNewReportFromHistory();
  assert.equal(h.el('reportNewConfirmModal').classList.contains('open'),false);
  assert.equal(h.active(),opener,'Back returns keyboard focus to the visible history control');

  opener.focus();
  h.ctx.requestNewReportFromHistory();
  let prevented=false;
  h.fire('keydown',{key:'Escape',preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(h.el('reportNewConfirmModal').classList.contains('open'),false);
  assert.equal(h.active(),opener,'Escape returns keyboard focus to the history view');
});

test('G33 R2 focus restoration never targets hidden or disabled controls and falls back visibly',()=>{
  const hidden=logoutHarness();
  const hiddenOpener=seedHistoryFocusTarget(hidden);
  hidden.ctx.requestNewReportFromHistory();
  hiddenOpener.style.display='none';
  hidden.ctx.cancelNewReportFromHistory();
  assert.equal(hidden.el('reportNewConfirmModal').classList.contains('open'),false);
  assert.equal(hidden.active(),hidden.el('reportHistoryCloseBtn'),
    'a hidden opener is replaced by a visible history fallback');
  assert.notEqual(hidden.active(),hiddenOpener);

  const disabled=logoutHarness();
  const disabledOpener=seedHistoryFocusTarget(disabled);
  disabled.ctx.requestNewReportFromHistory();
  disabledOpener.disabled=true;
  disabled.ctx.cancelNewReportFromHistory();
  assert.notEqual(disabled.active(),disabledOpener,'focus never returns to a disabled control');
  assert.equal(disabled.active(),disabled.el('reportHistoryCloseBtn'));

  const missing=logoutHarness();
  const fallback=seedHistoryFocusTarget(missing);
  missing.setActive(null);
  missing.ctx.requestNewReportFromHistory();
  missing.ctx.cancelNewReportFromHistory();
  assert.equal(missing.active(),fallback,
    'without a saved opener the visible new-report button is the target');
});

test('G33 R2 logout and history dismissal prevent focus restoration into stale views',async()=>{
  const dismissed=logoutHarness();
  const dismissedOpener=seedHistoryFocusTarget(dismissed);
  dismissed.ctx.requestNewReportFromHistory();
  dismissed.el('reportHistoryModal').classList.remove('open');
  dismissed.ctx.cancelNewReportFromHistory();
  assert.equal(dismissed.el('reportNewConfirmModal').classList.contains('open'),false);
  assert.notEqual(dismissed.active(),dismissedOpener,'no focus into a dismissed view');
  assert.notEqual(dismissed.active(),dismissed.el('reportHistoryCloseBtn'));

  const loggedOut=logoutHarness();
  const loggedOutOpener=seedHistoryFocusTarget(loggedOut);
  loggedOut.ctx.requestNewReportFromHistory();
  await loggedOut.ctx.doLogout();
  assert.equal(loggedOut.el('reportNewConfirmModal').classList.contains('open'),false,
    'logout closes a pending confirmation');
  loggedOut.ctx.cancelNewReportFromHistory();
  assert.notEqual(loggedOut.active(),loggedOutOpener,'a logged-out view never receives focus');
  assert.notEqual(loggedOut.active(),loggedOut.el('reportHistoryCloseBtn'));
});

test('G33 R2 Tab trap, duplicate-submit protection and explicit regeneration remain intact',async()=>{
  const h=logoutHarness();
  seedHistoryFocusTarget(h);
  h.ctx.requestNewReportFromHistory();
  h.el('reportNewConfirmBtn').focus();
  let prevented=false;
  h.fire('keydown',{key:'Tab',preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(h.active(),h.el('reportNewConfirmBackBtn'),'Tab stays inside the dialog');
  h.fire('keydown',{key:'Tab',shiftKey:true,preventDefault(){}});
  assert.equal(h.active(),h.el('reportNewConfirmBtn'),'Shift+Tab wraps back inside the dialog');

  let resolveVerify;
  h.on('listReportsForEvent',()=>new Promise(resolve=>{resolveVerify=resolve}));
  const confirm=h.ctx.confirmNewReportFromHistory();
  h.ctx.confirmNewReportFromHistory();
  assert.equal(h.calls.filter(call=>call[0]==='listReportsForEvent').length,1,
    'duplicate submits reuse the single pending registry recheck');
  h.fire('keydown',{key:'Escape',preventDefault(){}});
  assert.equal(h.el('reportNewConfirmModal').classList.contains('open'),true,
    'Escape cannot dismiss a submitting confirmation');
  resolveVerify({count:1,invalidCount:0,currentRevision:3,reports:[]});
  await confirm;
  assert.equal(h.el('reportNewConfirmBtn').disabled,false,'the same session re-enables the dialog');
  assert.equal(h.read('pendingReportExplicitRegeneration'),true,
    'explicit regeneration consent is preserved through the readiness warning');
  assert.equal(h.el('reportHistoryModal').classList.contains('open'),false);
});

test('G33 R1/R2 corrective markers are present in the canonical One-Click UI',()=>{
  assert.ok(html.indexOf('const logoutToken=token')<html.indexOf("token='';localStorage.removeItem('SRRT_TOKEN')"),
    'local session invalidation is synchronous at logout entry');
  assert.match(html,/function restoreNewReportConfirmFocus\(\)/);
  assert.match(html,/id="reportHistoryCloseBtn"/);
  assert.match(html,/if\(!currentUser\|\|!token\)return;\n    if\(reportUnknownNeedsVerification/);
});

test('G33 R1 run-failure warning stays in its own session across logout and re-login',async()=>{
  const settle=async(rounds=6)=>{for(let i=0;i<rounds;i++)await new Promise(resolve=>setImmediate(resolve))};
  // Unchanged live session: a transport-failed run still warns against re-creating.
  const live=logoutHarness();
  live.on('createReportJob',()=>Promise.resolve({id:'job-a',eventId:EVENT,status:'queued',stage:'queued'}));
  live.on('runReportJob',()=>Promise.reject(new Error('transport dropped')));
  live.on('getReportJobStatus',()=>Promise.reject(new Error('status lookup dropped')));
  await live.ctx.executeReport(EVENT,live.el('live-action'));
  await settle();
  assert.ok(live.toasts.some(msg=>msg.includes('ตรวจสอบคำขอไม่สำเร็จ')),
    'the unchanged live session keeps its fail-closed warning');
  assert.equal(live.calls.filter(call=>call[0]==='runReportJob').length,1);

  // Logout during the recovery await, no re-login: no stale warning.
  const loggedOut=logoutHarness();
  let rejectRunA,resolvePollA;
  loggedOut.on('runReportJob',()=>new Promise((resolve,reject)=>{rejectRunA=reject}));
  loggedOut.on('getReportJobStatus',()=>new Promise(resolve=>{resolvePollA=resolve}));
  loggedOut.read('activeReportJob={id:"job-a",eventId:'+JSON.stringify(EVENT)+',status:"running"}');
  const runA=loggedOut.ctx.runReportJobClient('job-a','session-a');
  rejectRunA(new Error('transport failed'));
  await settle();
  assert.ok(resolvePollA,'the catch entered its status-recovery await before logout');
  const logoutA=loggedOut.ctx.doLogout();
  const toastsBefore=loggedOut.toasts.length;
  resolvePollA({id:'job-a',eventId:EVENT,status:'running',stage:'gemini_1'});
  await runA;
  await logoutA;
  assert.equal(loggedOut.toasts.length,toastsBefore,
    'no run-failure warning may appear after logout without re-login');
  assert.equal(loggedOut.read('activeReportJob'),null);

  // Re-login with a different job during the same await: the next session's UI stays intact.
  const next=logoutHarness();
  let rejectRunB,resolvePollB;
  next.on('runReportJob',()=>new Promise((resolve,reject)=>{rejectRunB=reject}));
  next.on('getReportJobStatus',()=>new Promise(resolve=>{resolvePollB=resolve}));
  next.read('activeReportJob={id:"job-a",eventId:'+JSON.stringify(EVENT)+',status:"running"}');
  const runB=next.ctx.runReportJobClient('job-a','session-a');
  rejectRunB(new Error('transport failed'));
  await settle();
  const logoutB=next.ctx.doLogout();
  next.ctx.token='session-b';
  next.ctx.currentUser={role:'Admin',email:'b@example.test'};
  next.read('activeReportJob={id:"job-b",eventId:'+JSON.stringify(EVENT)+',status:"running"}');
  next.el('reportTaskStatus').textContent='SESSION_B_STATUS';
  const before=next.toasts.length;
  resolvePollB({id:'job-a',eventId:EVENT,status:'running',stage:'gemini_1'});
  await runB;
  await logoutB;
  assert.equal(next.toasts.length,before,
    'an old run-failure catch cannot warn the next session');
  assert.equal(next.ctx.token,'session-b');
  assert.equal(next.read('activeReportJob.id'),'job-b');
  assert.equal(next.el('reportTaskStatus').textContent,'SESSION_B_STATUS');
  assert.equal(next.calls.filter(call=>call[0]==='runReportJob').length,1,
    'backend execution semantics unchanged: one kick, no extra dispatch');
});
