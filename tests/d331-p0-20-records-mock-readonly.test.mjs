// P0-20: prove existing Records screen can demonstrate P0-19 count DTO
// without any real Google/RPC access or enabling D331.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/web/03h-client-event-records.html');
const layout=read('src/web/02-app-layout.html');
const script=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'must test the real native Records script');
const id='a1111111-1111-4111-8111-111111111111';

function harness(){
 const elements=new Map();
 const el=key=>{
  if(!elements.has(key))elements.set(key,{
   id:key,hidden:key.includes('mock-panel')||key.includes('summary'),
   textContent:'',innerHTML:'',value:'',
   setAttribute(name,value){this[name]=value;},getAttribute(name){return this[name]},
   classList:{add(){},remove(){}}
  });
  return elements.get(key);
 };
 const calls=[];
 const ctx=vm.createContext({
  el,allData:[{eventId:id,revision:2,col6:'PRIVATE_EVENT_NAME'}],
  currentUser:{id:'synthetic-user',role:'Admin'},token:'TEST_ONLY_LOCAL_TOKEN',
  roleCanRecord:()=>true,
  uiSetSectionState:(sectionId,statusId,state,message)=>{
   calls.push(['state',state]);
   const section=el(sectionId),status=el(statusId);
   section['data-ui-state']=state;
   section['aria-busy']=String(state==='loading');
   status.textContent=message||'';
   return state;
  },
  gs:()=>{calls.push(['RPC']);throw Error('UNAUTHORIZED_RPC')},
  google:{script:{run:new Proxy({}, {get(){throw Error('UNAUTHORIZED_GOOGLE')}})}},
  Promise,Number,Object,Array,String,Error
 });
 new vm.Script(script,{filename:'src/web/03h-client-event-records.html'}).runInContext(ctx);
 return {ctx,calls,el,run:s=>vm.runInContext(s,ctx)};
}
const counts={cases:1,plans:1,actions:2,surveys:1,followups:0};
const response=(change={})=>({
 status:'READ_ONLY',eventId:id,revision:2,areaId:'synthetic-area',
 counts:{...counts},slaAssessment:'NOT_EVALUATED',
 clinicalPolicyApproved:false,canWrite:false,canEnable:false,...change
});
const plain=x=>JSON.parse(JSON.stringify(x));

test('P020 renders in existing Records, not new route or P018 inert preview',()=>{
 const rec=layout.indexOf('<section id="page-records"');
 const mock=layout.indexOf('id="d331-p020-mock-panel"');
 const next=layout.indexOf('<section id="page-reporter"');
 assert.ok(rec<mock&&mock<next);
 assert.match(layout,/id="d331-p020-mock-panel"[^>]*hidden/);
 assert.match(layout,/Mock-only · D331 OFF/);
 assert.match(layout,/ไม่อ่านข้อมูล Dengue ของเหตุการณ์นั้น/);
 assert.match(layout,/ไม่ใช่สถิติหรือผลการควบคุมโรคจริง/);
 assert.match(layout,/ไม่สามารถบันทึกหรือเปิดข้อมูลผู้ป่วย/);
 assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
 const preview=layout.slice(layout.indexOf('<details id="d331-p018-preview"'),layout.indexOf('</details>')+10);
 assert.equal((preview.match(/<button\b/g)||[]).length,2);
 assert.equal((preview.match(/<li>/g)||[]).length,5);
});
test('P020 supports existing P019 count DTO but rejects overbroad or clinical outcomes',()=>{
 const h=harness(),normalize=h.run('d331P020ValidateBackendDto_');
 assert.deepEqual(plain(normalize(response(),id)),counts);
 for(const invalid of [
  response({status:'SYNTHETIC_ONLY'}),response({canWrite:true}),
  response({clinicalPolicyApproved:true}),response({canEnable:true}),
  response({slaAssessment:'ON_TIME'}),response({eventId:'not-the-event'}),
  response({revision:0}),response({areaId:' other '}),
  response({patientName:'PRIVATE_NAME'}),
  response({counts:{...counts,cases:-1}}),
  response({counts:{...counts,followups:501}}),
  response({counts:{...counts,cases:'1'}}),
  response({counts:{...counts,patientData:'secret'}}),
  response({counts:{cases:1}})
 ])assert.throws(()=>normalize(invalid,id),/D331_P020_INVALID_DTO/);
 assert.deepEqual(h.calls,[]);
});
test('P020 selected authenticated Records opens synthetic five-stage summary only',async()=>{
 const h=harness();
 await h.run('openDengueP020Mock(0)');
 assert.equal(h.el('d331-p020-mock-panel').hidden,false);
 assert.equal(h.el('d331-p020-summary').hidden,false);
 assert.equal(h.el('d331-p020-summary')['data-ui-state'],'ready');
 for(const [key,n] of Object.entries(counts))
  assert.equal(h.el('d331-p020-'+key).textContent,String(n));
 assert.match(h.el('d331-p020-status').textContent,/ไม่ใช่ข้อมูลของเหตุการณ์จริง/);
 assert.ok(!JSON.stringify([...h.calls,...[...Object.values(counts)]]).includes('PRIVATE_EVENT_NAME'));
 assert.equal(h.calls.some(c=>c[0]==='RPC'),false);
 assert.deepEqual(h.calls.map(x=>x[1]),['loading','ready']);
});
test('P020 blocks unauthenticated/role-denied and invalid event selection',async()=>{
 for(const injected of [
  "currentUser=null","token=''","roleCanRecord=()=>false","allData=[]"
 ]){
  const h=harness();h.run(injected);
  await h.run('openDengueP020Mock(0)');
  assert.equal(h.el('d331-p020-mock-panel').hidden,true);
  assert.equal(h.calls.length,0);
 }
 const h=harness();
 for(const input of ['-1','NaN','1','"0"','({})','null']){
  await h.run('openDengueP020Mock('+input+')');
 }
 assert.equal(h.calls.length,0);
});
test('P020 duplicate-click fence and logout reset prevent stale repaint',async()=>{
 const h=harness();
 h.run('var p020Resolve;var p020Reads=0;d331P020MockRead_=()=>{p020Reads++;return new Promise(r=>{p020Resolve=r})}');
 const first=h.run('openDengueP020Mock(0)');
 await h.run('openDengueP020Mock(0)');
 assert.equal(h.run('p020Reads'),1);
 assert.equal(h.el('d331-p020-summary')['aria-busy'],'true');
 h.run("token='';currentUser=null;allData=[];renderTables()");
 assert.equal(h.el('d331-p020-mock-panel').hidden,true);
 assert.equal(h.el('d331-p020-summary')['data-ui-state'],'idle');
 h.run("p020Resolve({status:'SYNTHETIC_ONLY',counts:{cases:7,plans:7,actions:7,surveys:7,followups:7}})");
 await first;
 assert.equal(h.el('d331-p020-mock-panel').hidden,true);
 assert.equal(h.el('d331-p020-cases').textContent,'—');
 assert.deepEqual(h.calls.map(x=>x[1]),['loading','idle']);
});
test('P020 stale switch to different Records selection cannot display old counts',async()=>{
 const h=harness();
 h.run('var p020Resolve;d331P020MockRead_=()=>new Promise(r=>{p020Resolve=r})');
 const first=h.run('openDengueP020Mock(0)');
 h.run('d331P020Reset_()');
 h.run("allData=[{eventId:'b2222222-2222-4222-8222-222222222222',revision:1}]");
 h.run("p020Resolve({status:'SYNTHETIC_ONLY',counts:{cases:4,plans:4,actions:4,surveys:4,followups:4}})");
 await first;
 assert.equal(h.el('d331-p020-mock-panel').hidden,true);
 assert.equal(h.el('d331-p020-cases').textContent,'—');
});
test('P020 malformed/empty/rejected mock responses are generic and never leak',async()=>{
 const empty=harness();
 empty.run("d331P020MockRead_=()=>Promise.resolve({status:'SYNTHETIC_ONLY',counts:{cases:0,plans:0,actions:0,surveys:0,followups:0}})");
 await empty.run('openDengueP020Mock(0)');
 assert.equal(empty.el('d331-p020-summary')['data-ui-state'],'empty');
 const fail=harness();
 fail.run("d331P020MockRead_=()=>Promise.resolve({status:'READ_ONLY',patientName:'SECRET'})");
 await fail.run('openDengueP020Mock(0)');
 assert.equal(fail.el('d331-p020-summary')['data-ui-state'],'error');
 assert.equal(fail.el('d331-p020-summary').hidden,true);
 assert.ok(!fail.el('d331-p020-status').textContent.includes('SECRET'));
 const rejected=harness();
 rejected.run("d331P020MockRead_=()=>Promise.reject(new Error('PRIVATE_PATIENT_NAME'))");
 await rejected.run('openDengueP020Mock(0)');
 assert.equal(rejected.el('d331-p020-summary')['data-ui-state'],'error');
 assert.ok(!rejected.el('d331-p020-status').textContent.includes('PRIVATE'));
});
test('P020 no direct D331 RPC, write call, real EventID projection or flag switch',()=>{
 const start=source.indexOf('// P0-20: presentation-only adapter.');
 const end=source.indexOf('  function closeEventFlow',start);
 assert.ok(start>0&&end>start);
 const section=source.slice(start,end);
 assert.doesNotMatch(section,/\bgs\s*\(|google\.script|fetch\s*\(|SpreadsheetApp|PropertiesService|setProperty\s*\(/);
 assert.doesNotMatch(section,/\.appendRow\s*\(|\.setValues?\s*\(|getDengueWorkspace\s*\(/);
 const manifest=read('tools/native-sources.mjs');
 assert.doesNotMatch(manifest,/src\/dengue\/09-p0-03b-dev-readonly-adapter.gs/);
 assert.match(read('src/dengue/00-g1a-foundation.gs'),/D331_G1A_ENABLED = false/);
 assert.match(read('src/dengue/09-p0-03b-dev-readonly-adapter.gs'),/D331_P003B_ENABLED_ = false/);
 assert.match(read('src/dengue/12-p0-07-guarded-dev-crud.gs'),/D331_P007_ENABLED_ = false/);
});
