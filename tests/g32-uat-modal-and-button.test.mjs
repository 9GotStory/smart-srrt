import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../Index_Smart_SRRT_OneClick.html',import.meta.url),'utf8');
const start=html.indexOf('  const reportReadinessInFlight = new Set();');
const end=html.indexOf('  function exportClientExcel(){',start);
assert.ok(start>=0&&end>start,'G-32 browser report module must be present in built HTML');
const reportSource=html.slice(start,end);

function browserHarness(overrides={}){
  const events={},elements=new Map(),storage=new Map(),calls=[],toasts=[],reportButtons=[];
  const doc={
    activeElement:null,
    addEventListener(type,fn){events[type]=fn},
    querySelectorAll(selector){return selector==='button[data-report-event-id]'?reportButtons:[]}
  };
  function el(id){
    if(!elements.has(id)){
      const classes=new Set();
      const node={
        id,style:{display:''},innerHTML:'',textContent:'',href:'',disabled:false,
        value:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
          contains:x=>classes.has(x),toggle:(x,enabled)=>enabled?classes.add(x):classes.delete(x)},
        focus(){doc.activeElement=node},
        removeAttribute(attr){delete node[attr]},
      };
      elements.set(id,node);
    }
    return elements.get(id);
  }
  function registerReportButton(eventId,compact=false,id='create-ai-report'){
    const btn=el(id),attrs={'data-report-event-id':eventId,'data-report-compact':compact?'1':'0'};
    btn.getAttribute=k=>attrs[k]||null;
    btn.setAttribute=(k,v)=>{attrs[k]=String(v)};
    reportButtons.push(btn);
    return btn;
  }
  let nextTimer=0;
  const ctx={
    token:'test-session',currentUser:{userId:'actor'},
    document:doc,
    localStorage:{
      setItem(k,v){storage.set(k,String(v))},
      getItem:k=>storage.get(k)||null,
      removeItem:k=>storage.delete(k)
    },
    setInterval(){return ++nextTimer},clearInterval(){},
    el,
    escapeHtml:value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    openModal:id=>el(id).classList.add('open'),
    closeModal:id=>el(id).classList.remove('open'),
    toast:msg=>toasts.push(String(msg)),
    renderReportReadinessModal:(data,id)=>{calls.push(['readinessModal',data.level,id])},
    gs:async(fn,...args)=>{
      calls.push([fn,...args]);
      if(overrides[fn])return overrides[fn](...args);
      if(fn==='getAIReportReadiness')return {level:'ready'};
      if(fn==='createReportJob')return {id:'job-1',eventId:args[1],status:'queued',stage:'queued',message:''};
      if(fn==='runReportJob')return new Promise(()=>{});
      if(fn==='cancelReportJob')return {id:'job-1',eventId:'mock-event',status:'cancel_requested',stage:'gemini_1'};
      return null;
    },
  };
  el('reportResultLink').style.display='none';
  el('reportCancelConfirmBtn').innerHTML='ยืนยันยกเลิก';
  vm.createContext(ctx);
  vm.runInContext(reportSource,ctx,{filename:'report-task-script',timeout:1500});
  return {ctx,el,calls,toasts,events,registerReportButton};
}

test('G-32 V7 reporter action stays visibly active after job creation and opens existing task',async()=>{
  const h=browserHarness();
  const btn=h.registerReportButton('mock-event');
  btn.innerHTML='สร้างรายงาน AI';
  await h.ctx.makeReport('mock-event',btn);
  assert.match(btn.innerHTML,/รอเริ่มรายงาน · ดูสถานะ/,'must not appear idle while job is queued');
  assert.equal(btn.disabled,false,'same-job button reopens task');
  assert.equal(btn.getAttribute('aria-busy'),'true');
  assert.equal(btn.classList.contains('report-action-active'),true);
  assert.equal(h.el('reportTaskIndicator').style.display,'inline-flex');
  const before=h.calls.filter(c=>c[0]==='createReportJob').length;
  h.ctx.closeReportTaskModal();
  await h.ctx.makeReport('mock-event',btn);
  assert.equal(h.calls.filter(c=>c[0]==='createReportJob').length,before,'no duplicate job creation');
  assert.equal(h.el('reportResultModal').classList.contains('open'),true);
});

test('G-32 reporter button restores on readiness failure and warning path',async()=>{
  for(const response of ['error','warning']){
    const h=browserHarness({
      getAIReportReadiness:()=>response==='error'?Promise.reject(Error('readiness failed')):{level:'review'}
    });
    const btn=h.el('create-ai-report');
    btn.innerHTML='สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI';
    await h.ctx.makeReport('mock-event',btn);
    assert.equal(btn.innerHTML,'สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI');
    assert.equal(btn.disabled,false);
    assert.equal(h.calls.some(c=>c[0]==='readinessModal'),response==='warning');
  }
});

test('G-32 reporter button remains restored after backend cancellation reaches terminal state',async()=>{
  const h=browserHarness();
  const btn=h.registerReportButton('mock-event');
  btn.innerHTML='สร้างรายงาน AI';
  await h.ctx.makeReport('mock-event',btn);
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'cancel_requested',stage:'gemini_1'});
  assert.match(btn.innerHTML,/กำลังขอยกเลิก · ดูสถานะ/);
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'cancelled',stage:'cancelled'});
  assert.equal(btn.innerHTML,'สร้างรายงาน AI');
  assert.equal(btn.disabled,false);
  assert.match(h.el('reportResultStatus').textContent,/ยกเลิกการสร้างรายงานแล้ว/);
});

test('G-32 reporter button restores when createReportJob fails after readiness passed',async()=>{
  const h=browserHarness({createReportJob:()=>Promise.reject(Error('job creation failed'))});
  const btn=h.el('create-ai-report');
  const old='<i class="fa-solid fa-wand-magic-sparkles"></i> สร้างรายงาน AI';
  btn.innerHTML=old;
  await h.ctx.makeReport('mock-event',btn);
  assert.equal(btn.innerHTML,old);
  assert.equal(btn.disabled,false);
  assert.ok(h.toasts.some(s=>s.includes('เริ่มสร้างรายงานไม่สำเร็จ')));
});

test('G-32 event/report tables rebuild buttons with the current job status',()=>{
  const h=browserHarness();
  const normal=h.ctx.reportActionButton('mock-event',false);
  assert.match(normal,/>สร้างรายงาน AI<\/button>/);
  const compact=h.ctx.reportActionButton('mock-event',true);
  assert.match(compact,/>AI<\/button>/);
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'running',stage:'gemini_1'});
  const active=h.ctx.reportActionButton('mock-event',false);
  assert.match(active,/กำลังสร้างรายงาน · ดูสถานะ/);
  assert.match(active,/report-action-active/);
  assert.match(active,/aria-busy="true"/);
  assert.doesNotMatch(active,/ disabled/);
  const foreign=h.ctx.reportActionButton('different-event',true);
  assert.match(foreign,/มีงานรายงานอื่นอยู่/);
  assert.match(foreign,/ disabled/);
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'finalizing',stage:'finalizing'});
  assert.match(h.ctx.reportActionButton('mock-event',false),/กำลังบันทึก · ดูสถานะ/);
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'failed',stage:'failed'});
  assert.match(h.ctx.reportActionButton('mock-event',false),/>สร้างรายงาน AI<\/button>/);
});

test('G-32 status update restores both duplicate event actions when job ends',()=>{
  const h=browserHarness();
  const main=h.registerReportButton('mock-event',false,'report-page-action');
  const mini=h.registerReportButton('mock-event',true,'event-page-action');
  const other=h.registerReportButton('another-event',false,'other-action');
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'running',stage:'gemini_2'});
  assert.match(main.innerHTML,/กำลังสร้างรายงาน/);
  assert.match(mini.innerHTML,/ดูสถานะ/);
  assert.equal(other.disabled,true);
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'completed',stage:'completed',documentUrl:'https://docs.google.com/document/d/example/edit'});
  assert.equal(main.innerHTML,'สร้างรายงาน AI');
  assert.equal(mini.innerHTML,'AI');
  assert.equal(other.disabled,false);
  assert.equal(main.classList.contains('report-action-active'),false);
});

test('G-32 styled confirmation opens without sending cancellation; Back/Escape restores focus',async()=>{
  const h=browserHarness();
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'running',stage:'gemini_1'});
  h.ctx.cancelCurrentReportTask();
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),true);
  assert.equal(h.ctx.document.activeElement,h.el('reportCancelKeepBtn'));
  assert.equal(h.calls.filter(c=>c[0]==='cancelReportJob').length,0,'open modal is not an RPC');
  h.ctx.closeReportCancelConfirm();
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),false);
  assert.equal(h.ctx.document.activeElement,h.el('cancelReportJobBtn'));
  h.ctx.cancelCurrentReportTask();
  let prevented=false;
  h.events.keydown({key:'Escape',preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),false);
  assert.equal(h.calls.filter(c=>c[0]==='cancelReportJob').length,0);
});

test('G-32 confirmation invokes exactly one cancel RPC and remains open while submitting',async()=>{
  let resolveRPC;
  const h=browserHarness({cancelReportJob:()=>new Promise(resolve=>{resolveRPC=resolve})});
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'running',stage:'gemini_1'});
  h.ctx.cancelCurrentReportTask();
  const first=h.ctx.confirmReportCancelRequest();
  await h.ctx.confirmReportCancelRequest();
  assert.equal(h.calls.filter(c=>c[0]==='cancelReportJob').length,1);
  assert.equal(h.el('reportCancelConfirmBtn').disabled,true);
  assert.match(h.el('reportCancelConfirmBtn').textContent,/กำลังส่งคำขอยกเลิก/);
  let prevented=false;
  h.events.keydown({key:'Escape',preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),true,'cannot dismiss during RPC');
  resolveRPC({id:'job-1',eventId:'mock-event',status:'cancel_requested',stage:'gemini_1'});
  await first;
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),false);
  assert.match(h.el('reportResultStatus').textContent,/กำลังขอยกเลิก/);
  assert.equal(h.el('cancelReportJobBtn').disabled,true);
});

test('G-32 completion while confirmation open invalidates pending cancellation',()=>{
  const h=browserHarness();
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'running',stage:'gemini_1'});
  h.ctx.cancelCurrentReportTask();
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'completed',stage:'completed',documentUrl:'https://docs.google.com/document/d/fake-id/edit'});
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),false);
  assert.equal(h.el('cancelReportJobBtn').style.display,'none');
  assert.equal(h.el('reportResultLink').style.display,'inline-flex');
  assert.equal(h.el('closeReportJobBtn').innerHTML.includes('ทำงานต่อ'),false);
});

test('G-32 confirmation errors remain in themed modal and do not claim cancelled',async()=>{
  const h=browserHarness({cancelReportJob:()=>Promise.reject(Error('RPC lost'))});
  h.ctx.paintReportTask({id:'job-1',eventId:'mock-event',status:'running',stage:'gemini_1'});
  h.ctx.cancelCurrentReportTask();
  await h.ctx.confirmReportCancelRequest();
  assert.equal(h.el('reportCancelConfirmModal').classList.contains('open'),true);
  assert.match(h.el('reportCancelConfirmError').textContent,/ยังยืนยัน/);
  assert.equal(h.el('reportCancelConfirmBtn').disabled,false);
  assert.equal(h.el('reportResultStatus').textContent.includes('ยกเลิกการสร้างรายงานแล้ว'),false);
});

test('G-32 compiled UI is accessible and has no native cancel confirmation',()=>{
  assert.match(html,/id="reportCancelConfirmModal" role="alertdialog" aria-modal="true"/);
  assert.match(html,/aria-labelledby="reportCancelConfirmTitle" aria-describedby="reportCancelConfirmDescription"/);
  assert.match(html,/onclick="confirmReportCancelRequest\(\)"/);
  assert.match(html,/id="reportCancelKeepBtn"/);
  assert.match(html,/if\(reportCancelSubmitting\)return/);
  assert.doesNotMatch(reportSource,/if\(!confirm\(/);
});
