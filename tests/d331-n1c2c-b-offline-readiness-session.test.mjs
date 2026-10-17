// D331 N1-C2C-B — synthetic readiness/session gate; never calls GAS or a real service.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const partial=fs.readFileSync(path.join(ROOT,'src/web/03l-client-d331-status.html'),'utf8');
const auth=fs.readFileSync(path.join(ROOT,'src/web/03c-client-auth.html'),'utf8');
const layout=fs.readFileSync(path.join(ROOT,'src/web/02-app-layout.html'),'utf8');
const foundation=fs.readFileSync(path.join(ROOT,'src/dengue/00-g1a-foundation.gs'),'utf8');
const match=partial.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'Native26 inert status script missing');
const ctx=vm.createContext({});
new vm.Script(match[1]).runInContext(ctx,{timeout:1000});
const ui=ctx.d331N1cStatusWorkspace_;

function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b});
  return {promise,resolve,reject};
}
class Node {
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];
    this.attributes=new Map();this.textContent='';this.disabled=false;this.className='';}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this.attributes.set(k,String(v));}
  getAttribute(k){return this.attributes.get(k);}
}
const doc={createElement(tag){return new Node(tag,doc)}};
const root=()=>new Node('section',doc);
const descendants=n=>[n,...n.children.flatMap(descendants)];
const buttons=n=>descendants(n).filter(x=>x.tagName==='button');
const statusText=n=>descendants(n).filter(x=>x.getAttribute('role')==='status').map(x=>x.textContent);
function fixture(){
  const node=root(),work=[],leases=[],invalidated=[],finished=[];
  let epoch=3,user={role:'Manager'},token='SYNTHETIC-SESSION';
  const session=()=>({authEpoch:epoch,token,user});
  const adapter={
    readSession:session,
    requestMock(id){const job=deferred();work.push({id,...job});return job.promise;},
    beginAction(key,options){const lease={key,options};leases.push(lease);return lease;},
    finishAction(lease,state,message,options){finished.push({lease,state,message,enabled:options.canEnable()});},
    invalidateAction(lease){invalidated.push(lease);}
  };
  const controller=ui.createOfflineController(node,adapter);
  return {node,work,leases,invalidated,finished,controller,session,
    setUser(v){user=v},setToken(v){token=v},incEpoch(){epoch++}};
}
const valid=(id,state='POLICY_HOLD',ms=Date.now())=>({
  version:1,requestId:id,state,issuedAtMs:ms-1000,expiresAtMs:ms+1000
});
const text=n=>statusText(n).join(' ');

test('C2C-B is inert and its only states have disabled controls and no live source APIs',()=>{
  assert.match(foundation,/var D331_G1A_ENABLED = false;/);
  assert.doesNotMatch(layout,/page-dengue|data-page="dengue"/);
  assert.doesNotMatch(partial,/\b(?:google\.script\.run|SpreadsheetApp|PropertiesService|UrlFetchApp|fetch\s*\(|XMLHttpRequest|innerHTML|insertAdjacentHTML|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(auth,/\bgetD331Readiness\b|\bgetD331Grants\b/);
  const f=fixture();
  assert.equal(f.work.length,0,'never autostart a reader');
  assert.equal(buttons(f.node).length,0,'never auto-mount a view');
  assert.equal(typeof ui.createOfflineController,'function');
  f.controller.dispose();
});

test('C2C-B strict v1 deny-only envelope, expiry, extra PHI, forbidden READY are ERROR',()=>{
  const id=7,now=Date.now(),closed=o=>ui.closedReadiness(o,id,now);
  for(const state of ['OFF','AUTH_REQUIRED','POLICY_HOLD','NO_GRANT','ERROR'])
    assert.equal(closed(valid(id,state,now)),state);
  const wrong=[
    null,{},[],{...valid(id,'READY',now)},{...valid(id,'ENABLED',now)},
    {...valid(id,'EMPTY',now)},{...valid(id,'LOADING',now)},
    {...valid(id,'POLICY_HOLD',now),userId:'FAKE'},
    {...valid(id,'POLICY_HOLD',now),allowedAreaIDs:['FAKE']},
    {...valid(id,'POLICY_HOLD',now),patientName:'PRIVATE_SENTINEL'},
    {...valid(id,'POLICY_HOLD',now),canRead:true},
    {...valid(id,'POLICY_HOLD',now),version:2},
    {...valid(id,'POLICY_HOLD',now),requestId:id+1},
    {...valid(id,'POLICY_HOLD',now),issuedAtMs:now+1},
    {...valid(id,'POLICY_HOLD',now),expiresAtMs:now},
    {...valid(id,'POLICY_HOLD',now),expiresAtMs:now+65000},
    {...valid(id,'POLICY_HOLD',now),issuedAtMs:NaN},
    {...valid(id,'POLICY_HOLD',now),expiresAtMs:Infinity},
    {get version(){throw Error('PRIVATE_SENTINEL');}}
  ];
  for(const payload of wrong)assert.equal(closed(payload),'ERROR');
});

test('C2C-B preview uses synthetic lease and accessible loading, never enables actions',async()=>{
  const f=fixture();
  const task=f.controller.check();
  assert.equal(f.work.length,1);
  assert.equal(f.work[0].id,1);
  assert.equal(await f.controller.check(),false,'duplicate must not call request');
  assert.equal(f.node.getAttribute('aria-busy'),'true');
  assert.match(text(f.node),/กำลังตรวจสอบ/);
  const btn=buttons(f.node);
  assert.deepEqual(btn.map(b=>b.disabled),[true,true]);
  f.work[0].resolve(valid(1,'NO_GRANT'));
  assert.equal(await task,'NO_GRANT');
  assert.match(text(f.node),/ไม่มีสิทธิ์/);
  assert.equal(f.node.getAttribute('aria-busy'),'false');
  assert.equal(f.finished.length,1);
  assert.equal(f.finished[0].enabled,false);
  assert.deepEqual(buttons(f.node).map(b=>b.disabled),[true,true]);
  f.controller.dispose();
});

test('C2C-B logout invalidation immediately resets, discards old response/lease',async()=>{
  const f=fixture();
  const pending=f.controller.check();
  assert.equal(f.node.getAttribute('aria-busy'),'true');
  ui.invalidateSession(); // hook called synchronously from native doLogout()
  assert.equal(f.node.getAttribute('aria-busy'),'false');
  assert.match(text(f.node),/ยังไม่เปิดใช้งาน/);
  assert.equal(f.invalidated.length,1);
  f.work[0].resolve(valid(1,'POLICY_HOLD'));
  assert.equal(await pending,false,'stale callback must never repaint');
  assert.match(text(f.node),/ยังไม่เปิดใช้งาน/);
  assert.equal(f.finished.length,0);
  f.controller.dispose();
});

test('C2C-B token switch, role mutation, user switch, auth epoch and error fail closed',async()=>{
  for(const mutate of [
    f=>f.setToken('SWITCHED'),
    f=>f.session().user.role='Other',
    f=>f.setUser({role:'Manager'}),
    f=>f.incEpoch(),
    f=>f.setUser(null)
  ]){
    const f=fixture(),pending=f.controller.check();
    mutate(f);
    f.work[0].resolve(valid(1,'POLICY_HOLD'));
    assert.equal(await pending,false,'stale session response must be discarded');
    assert.equal(f.finished.length,0);
    assert.equal(f.invalidated.length,1);
    assert.match(text(f.node),/ยังไม่เปิดใช้งาน/);
    assert.equal(f.node.getAttribute('aria-busy'),'false');
    // No terminal success/authorized data/controls may appear.
    assert.deepEqual(buttons(f.node).map(b=>b.disabled),[true,true]);
    f.controller.dispose();
  }
  const f=fixture(),one=f.controller.check();
  f.work[0].reject(new Error('PRIVATE_PATIENT_123'));
  assert.equal(await one,'ERROR');
  assert.match(text(f.node),/ไม่สามารถตรวจสอบ/);
  assert.doesNotMatch(text(f.node),/PRIVATE_PATIENT_123/);
  f.controller.dispose();
});

test('C2C-B invalid guest never requests; session invalidation hook precedes logout clear',async()=>{
  const f=fixture();f.setToken('');
  assert.equal(await f.controller.check(),false);
  assert.equal(f.work.length,0);
  assert.match(text(f.node),/กรุณาเข้าสู่ระบบ/);
  assert.equal(f.controller.dispose(),undefined);
  const pos=auth.indexOf('  async function doLogout(){');
  const clear=auth.indexOf("token='';localStorage.removeItem('SRRT_TOKEN')",pos);
  const hook=auth.indexOf("d331N1cStatusWorkspace_.invalidateSession()",pos);
  assert.ok(hook>pos&&hook<clear,'must synchronously invalidate before token clear');
  assert.ok((auth.match(/d331N1cStatusWorkspace_\.invalidateSession\(\)/g)||[]).length===3,
    'boot/login/logout each invalidate before new identity can repaint');
});

test('C2C-B malformed readiness and disposal deny repeat requests and action enablement',async()=>{
  const f=fixture(),pending=f.controller.check();
  f.work[0].resolve({...valid(1,'NO_GRANT'),secret:'PRIVATE_SENTINEL'});
  assert.equal(await pending,'ERROR');
  assert.equal(f.finished[0].enabled,false);
  assert.doesNotMatch(text(f.node),/PRIVATE_SENTINEL/);
  f.controller.dispose();
  assert.equal(await f.controller.check(),false);
});
