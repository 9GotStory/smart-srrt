import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const records=read('src/web/03h-client-event-records.html');
const layout=read('src/web/02-app-layout.html');
const backend=read('src/dengue/09-p0-03b-dev-readonly-adapter.gs');
const start=records.indexOf('  var d331P020PreviewBridge_=(function(){');
const end=records.indexOf('</script>',start);
assert.ok(start>0&&end>start,'must execute the real P0-20 source');
function factory(){
 const ctx=vm.createContext({Promise});
 vm.runInContext(records.slice(start,end),ctx,{timeout:1000});
 return ctx.d331P020PreviewBridge_;
}
function harness({request,user=true}={}){
 const bridge=factory(),listeners=[];
 const root={open:false,addEventListener(name,fn){listeners.push({name,fn});}};
 const ids=['d331-p020-region','d331-p020-status',
  ...['cases','plans','actions','surveys','followups'].map(k=>'d331-p020-'+k)];
 const nodes=new Map(ids.map(id=>[id,{textContent:'',hidden:true}]));
 const states=[];
 const auth={token:user?'SYNTHETIC_TOKEN_ONLY':'',user:user?{id:'mock'}:null,allowed:user};
 let calls=0;
 const ctrl=bridge.createOfflineController({
  root,lookup:id=>nodes.get(id)||null,session:()=>({...auth}),
  request:()=>{calls++;return request?request():Promise.resolve({
   status:'READ_ONLY',eventId:'e0000000-0000-4000-8000-000000000020',
   areaId:'SYNTHETIC-AREA',revision:1,
   counts:{cases:1,plans:1,actions:2,surveys:0,followups:0},
   slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
   canWrite:false,canEnable:false
  });},
  setState:(name,message)=>{states.push({name,message});}
 });
 function toggle(open){root.open=open;for(const e of listeners)e.fn();}
 const count=key=>nodes.get('d331-p020-'+key).textContent;
 return {bridge,ctrl,root,nodes,auth,states,toggle,count,
  calls:()=>calls,listeners};
}
const tick=async()=>{await new Promise(resolve=>setImmediate(resolve));};

test('P0-20 embeds a *hidden* count-only result beneath existing Records only',()=>{
 const recordsOpen=layout.indexOf('<section id="page-records"'),
  reporter=layout.indexOf('<section id="page-reporter"'),
  region=layout.indexOf('id="d331-p020-region"');
 assert.ok(region>recordsOpen&&region<reporter);
 assert.ok(region>layout.indexOf('id="d331-p018-preview"'));
 const segment=layout.slice(region,layout.indexOf('</section>',region));
 assert.match(segment,/aria-busy="false" hidden/);
 assert.match(segment,/role="status" aria-live="polite"/);
 assert.equal((segment.match(/<dd id="d331-p020-/g)||[]).length,5);
 assert.doesNotMatch(segment,/<button\b|<input\b|<form\b|<script\b|onclick=|onchange=|<a\s/i);
 assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
});
test('P0-20 controller starts closed and renders five synthetic counts after loading',async()=>{
 const h=harness();h.ctrl.connect();h.ctrl.connect();
 assert.equal(h.listeners.length,1);
 assert.equal(h.calls(),0);
 h.toggle(true);
 assert.equal(h.states.at(-1).name,'loading');
 assert.equal(h.nodes.get('d331-p020-region').hidden,false);
 await tick();
 assert.equal(h.states.at(-1).name,'ready');
 assert.equal(h.calls(),1);
 assert.deepEqual(['cases','plans','actions','surveys','followups'].map(h.count),
  ['1','1','2','0','0']);
 assert.match(h.states.at(-1).message,/ตัวอย่าง/);
 h.ctrl.refresh();h.ctrl.refresh();await tick();
 assert.equal(h.calls(),1,'same session must not refetch/repaint indefinitely');
});
test('P0-20 guest cannot start mock request even by forging toggle',async()=>{
 const h=harness({user:false});h.ctrl.connect();
 h.toggle(true);await tick();
 assert.equal(h.calls(),0);
 assert.equal(h.nodes.get('d331-p020-region').hidden,true);
 assert.equal(h.count('cases'),'—');
});
test('P0-20 closing preview clears displayed and pending model',async()=>{
 const h=harness();h.ctrl.connect();h.toggle(true);await tick();
 assert.equal(h.count('cases'),'1');
 h.toggle(false);
 assert.equal(h.count('cases'),'—');
 assert.equal(h.nodes.get('d331-p020-region').hidden,true);
 h.toggle(true);await tick();
 assert.equal(h.calls(),2);
});
test('P0-20 logout/session change fences late mock response and clears identifiers',async()=>{
 let resolveFirst;const response=new Promise(resolve=>resolveFirst=resolve);
 const h=harness({request:()=>response});
 h.ctrl.connect();h.toggle(true);await tick();
 assert.equal(h.calls(),1);
 h.auth.token='';h.auth.user=null;h.auth.allowed=false;
 h.ctrl.reset();
 assert.equal(h.root.open,false);
 assert.equal(h.count('cases'),'—');
 resolveFirst({status:'READ_ONLY',eventId:'e0000000-0000-4000-8000-000000000020',
  areaId:'SYNTHETIC-AREA',revision:1,
  counts:{cases:50,plans:50,actions:50,surveys:50,followups:50},
  slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
  canWrite:false,canEnable:false});
 await tick();
 assert.equal(h.count('cases'),'—');
 assert.notEqual(h.states.at(-1).name,'ready');
});
test('P0-20 changed account while pending cannot repaint or regain permission',async()=>{
 let done;const waiting=new Promise(resolve=>done=resolve);
 const h=harness({request:()=>waiting});h.ctrl.connect();h.toggle(true);await tick();
 h.auth.user={id:'another-user'};h.auth.token='OTHER_SESSION';
 h.ctrl.refresh();assert.equal(h.count('actions'),'—');
 done({status:'READ_ONLY',eventId:'e0000000-0000-4000-8000-000000000020',
   areaId:'SYNTHETIC-AREA',revision:1,
   counts:{cases:9,plans:9,actions:9,surveys:9,followups:9},
   slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
   canWrite:false,canEnable:false});
 await tick();
 assert.equal(h.count('actions'),'—');
});
test('P0-20 fail-closed bad DTO and failed mock request yield non-leaking error',async()=>{
 const normal={
  status:'READ_ONLY',eventId:'e0000000-0000-4000-8000-000000000020',
  areaId:'SYNTHETIC-AREA',revision:1,
  counts:{cases:0,plans:0,actions:0,surveys:0,followups:0},
  slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
  canWrite:false,canEnable:false
 };
 const b=factory();
 for(const invalid of [
  {...normal,eventId:'REAL_PATIENT_EVENT'},
  {...normal,counts:{...normal.counts,cases:-1}},
  {...normal,counts:{...normal.counts,cases:501}},
  {...normal,canWrite:true},
  {...normal,clinicalPolicyApproved:true},
  {...normal,slaAssessment:'ON_TIME'},
  {...normal,user:{name:'PRIVATE_PATIENT'}},
  null,
  {}
 ])assert.throws(()=>b.validateMock(invalid),/D331_P020_MOCK_INVALID/);
 for(const request of [()=>Promise.resolve({...normal,counts:{cases:1}}),
  ()=>Promise.reject(Error('PRIVATE_PATIENT_SECRET'))]){
  const h=harness({request});h.ctrl.connect();h.toggle(true);await tick();
  assert.equal(h.states.at(-1).name,'error');
  assert.ok(!h.states.at(-1).message.includes('PRIVATE_PATIENT_SECRET'));
  assert.equal(h.count('cases'),'—');
 }
});
test('P0-20 new bridge never calls GS/RPC, fetch, local storage or live event data',()=>{
 const code=records.slice(start,end).replace(/\/\*[\s\S]*?\*\//g,'')
   .replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(code,/\b(?:google\.script|\bgs\s*\(|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|allData|SpreadsheetApp|PropertiesService|setProperty|appendRow|setValues?|PatientID|PasswordHash)/i);
 assert.match(records,/if\(!currentUser\)\{d331P020PreviewBridge_\.reset\(\)/);
 assert.match(records,/d331P020PreviewBridge_\.mount\(\)/);
 assert.match(backend,/function getDengueWorkspace\(sessionToken,eventId\)/);
 assert.match(backend,/slaAssessment:'NOT_EVALUATED'/);
 assert.match(backend,/D331_P003B_ENABLED_ = false/);
 assert.match(read('src/dengue/00-g1a-foundation.gs'),/D331_G1A_ENABLED = false/);
 assert.match(read('src/dengue/12-p0-07-guarded-dev-crud.gs'),/D331_P007_ENABLED_ = false/);
});
