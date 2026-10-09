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
  const events={},elements=new Map(),storage=new Map(),calls=[],toasts=[];
  const doc={
    activeElement:null,
    addEventListener(type,fn){events[type]=fn}
  };
  function el(id){
    if(!elements.has(id)){
      const classes=new Set();
      const node={
        id,style:{display:''},innerHTML:'',textContent:'',href:'',disabled:false,
        value:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
        focus(){doc.activeElement=node},
        removeAttribute(attr){delete node[attr]},
      };
      elements.set(id,node);
    }
    return elements.get(id);
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
  return {ctx,el,calls,toasts,events};
}

test('G-32 V5 regression: ready branch always restores original reporter button after job creation',async()=>{
  const h=browserHarness();
  const btn=h.el('create-ai-report');
  const original='<i class="fa-solid fa-wand-magic-sparkles"></i> สร้างรายงาน AI';
  btn.innerHTML=original;
  await h.ctx.makeReport('mock-event',btn);
  assert.equal(btn.innerHTML,original,'not stuck at กำลังตรวจข้อมูล');
  assert.equal(btn.disabled,false);
  assert.equal(h.el('reportTaskIndicator').style.display,'inline-flex');
  assert.ok(h.calls.some(c=>c[0]==='createReportJob'));
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
