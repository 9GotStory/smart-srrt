import {nativeServer,nativeHtml,nativeBrowser} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const web=fs.readFileSync(new URL('../src/web/04-browser-app.html',import.meta.url),'utf8');
const compiled=nativeHtml;
const server=nativeServer;
function browserDashboard(rows, summary=null, loggedIn=true) {
  const start=web.indexOf('function updateDashboard(){');
  const end=web.indexOf('function makePublicInsight(',start);
  const match=web.match(/function isInvestigationCriteriaMet\(value\)\{[^\n]*\}/);
  assert.ok(start>=0 && end>start && match,'browser helper boundaries are intact');
  const elements=new Map();
  const ctx={
    currentUser:loggedIn?{role:'Manager'}:null,allData:rows,dashboardSummary:summary,
    el:id=>{
      if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:''});
      return elements.get(id);
    },
    makeInsight:()=>'',makePublicInsight:()=>'',drawCharts:()=>{},
    String,Math,Number,Array,Boolean,Object
  };
  vm.createContext(ctx);
  vm.runInContext(match[0]+'\n'+web.slice(start,end),ctx);
  ctx.updateDashboard();
  return Object.fromEntries([...elements].map(([id,v])=>[id,v.textContent]));
}
const row=(criteria,date,extra={})=>({
  col2:'2569-10-01',col5:'กลุ่มทดสอบ',col6:'โรคทดสอบ',
  col17:criteria,col26:date,col29:'หมู่ทดสอบ',col19:'ต่ำ',...extra
});
test('authenticated browser excludes non-criteria investigation dates',()=>{
  const r=browserDashboard([row('เข้าเกณฑ์',''),row('ไม่เข้าเกณฑ์','2569-10-02'),row('รอดำเนินการ','2569-10-03')]);
  assert.deepEqual([r.kpiTotal,r.kpiCriteria,r.kpiInvestigated,r.kpiRate],[3,1,0,'0%']);
});
test('authenticated browser exact-criteria rate matches backend aggregate',()=>{
  const r=browserDashboard([row('เข้าเกณฑ์','2569-10-01'),row('เข้าเกณฑ์',''),row('ไม่เข้าเกณฑ์','2569-10-03')]);
  assert.deepEqual([r.kpiTotal,r.kpiCriteria,r.kpiInvestigated,r.kpiRate],[3,2,1,'50%']);
});
test('no qualifying cases never fall back to all-case denominator',()=>{
  const r=browserDashboard([row('ไม่เข้าเกณฑ์','2569-10-01'),row('รอดำเนินการ','2569-10-02')]);
  assert.deepEqual([r.kpiTotal,r.kpiCriteria,r.kpiInvestigated,r.kpiRate],[2,0,0,'0%']);
});
test('blank and whitespace investigation dates are pending, not investigated',()=>{
  const r=browserDashboard([row('เข้าเกณฑ์',' '),row('เข้าเกณฑ์','')]);
  assert.deepEqual([r.kpiCriteria,r.kpiInvestigated,r.kpiRate],[2,0,'0%']);
  assert.ok(web.includes("String(r.col26||'').trim()===''"));
});
test('anonymous browser consumes only public aggregates',()=>{
  const r=browserDashboard([row('เข้าเกณฑ์','2569-10-01',{eventId:'secret-event'})],
    {kpi:{events:7,criteria:4,investigated:1,investigationRate:25}},false);
  assert.deepEqual([r.kpiTotal,r.kpiCriteria,r.kpiInvestigated,r.kpiRate],[7,4,1,'25%']);
  const load=web.slice(web.indexOf('async function loadDashboard(){'),web.indexOf('function resetFilter(){'));
  assert.match(load,/const response=hasUser\s*\?await gs\('getDashboardData',session,filter\)\s*:await gs\('getPublicDashboardData',filter\)/);
  assert.match(load,/if\(request!==dashboardLoadRequest\|\|session!==token\|\|hasUser!==!!currentUser\)return/);
  assert.match(load,/if\(hasUser\)\{allData=response;dashboardSummary=null\}/);
  assert.match(load,/else\{allData=\[\];dashboardSummary=response\}/);
});
test('compiled One-Click preserves correct KPI expression',()=>{
  const declaration="const investigated=qualifying.filter(r=>String(r.col26||'').trim()!=='').length;";
  assert.equal(web.includes(declaration),true);
  assert.equal(compiled.includes(declaration),true);
  assert.equal(compiled.includes('investigated=allData.filter(r=>r.col26).length'),false);
});
test('server public RPC aggregates while private RPC requires view permission',()=>{
  const ctx={console,Logger:{log(){}},Math};
  vm.createContext(ctx);
  vm.runInContext(server,ctx,{filename:'Code.gs'});
  const rows=[row('เข้าเกณฑ์','2569-10-01',{eventId:'synthetic-secret-event',col14:'synthetic-private-narrative'})];
  const checks=[];
  ctx.getFilteredEventRows_=()=>rows;
  ctx.requireAuth_=(token,permission)=>{checks.push([token,permission]);if(token!=='ok')throw Error('unauthenticated');return {email:'u@example.invalid'}};
  ctx.enrichEventOwners_=x=>x;ctx.enrichEventAttachments_=x=>x;
  assert.throws(()=>ctx.getDashboardData('bad',{}),/unauthenticated/);
  assert.equal(ctx.getDashboardData('ok',{})[0].eventId,'synthetic-secret-event');
  const pub=ctx.getPublicDashboardData({});
  assert.equal(pub.kpi.events,1);
  assert.equal(pub.kpi.investigated,1);
  assert.equal(JSON.stringify(pub).includes('synthetic-secret-event'),false);
  assert.equal(JSON.stringify(pub).includes('synthetic-private-narrative'),false);
  assert.deepEqual(JSON.parse(JSON.stringify(checks)),[['bad','view'],['ok','view']]);
});
