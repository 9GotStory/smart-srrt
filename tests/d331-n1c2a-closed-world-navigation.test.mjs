import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const auth=fs.readFileSync(path.join(REPO,'src/web/03c-client-auth.html'),'utf8');
const layout=fs.readFileSync(path.join(REPO,'src/web/02-app-layout.html'),'utf8');
const manifest=fs.readFileSync(path.join(REPO,'tools/native-sources.mjs'),'utf8');
const d331=fs.readFileSync(path.join(REPO,'src/web/03l-client-d331-status.html'),'utf8');
const start=auth.indexOf('  function showPage(page,btn){');
const end=auth.indexOf('\n  function applyTheme(){',start);
assert.ok(start>0&&end>start,'must test the real canonical showPage code, not a copy');
const source=auth.slice(start,end);

function page(name){
  const classes=new Set();
  const attrs=new Map();
  return {
    id:'page-'+name,
    dataset:{page:name},
    classList:{
      add:x=>classes.add(x),
      remove:x=>classes.delete(x),
      contains:x=>classes.has(x)
    },
    setAttribute:(key,value)=>attrs.set(key,value),
    removeAttribute:key=>attrs.delete(key),
    getAttribute:key=>attrs.get(key)
  };
}
function harness({canRecord=false,canManage=false}={}){
  const pages=['dashboard','records','reporter','admin','library'];
  const nodes=new Map(pages.map(p=>['page-'+p,page(p)]));
  const navigation=pages.map(page);
  nodes.get('page-dashboard').classList.add('active');
  navigation[0].classList.add('active');
  navigation[0].setAttribute('aria-current','page');
  const calls=[];
  const ctx=vm.createContext({
    el:key=>nodes.get(key)||null,
    document:{querySelectorAll:selector=>{
      if(selector==='.section')return [...nodes.values()];
      if(selector==='.nav button')return navigation;
      throw Error('unexpected query: '+selector);
    }},
    roleCanRecord:()=>canRecord,
    roleCanManage:()=>canManage,
    toast:message=>calls.push(['toast',message]),
    toggleSidebar:flag=>calls.push(['sidebar',flag]),
    loadAdmin:()=>calls.push(['loadAdmin']),
    renderLibrary:()=>calls.push(['renderLibrary']),
    renderTables:()=>calls.push(['renderTables']),
    google:{script:{run:new Proxy({}, {get(){throw Error('unexpected RPC')}})}}
  });
  new vm.Script(source,{filename:'src/web/03c-client-auth.html'}).runInContext(ctx);
  return {ctx,nodes,navigation,calls,
    activePage:()=>[...nodes.values()].filter(n=>n.classList.contains('active')).map(n=>n.id),
    currentNav:()=>navigation.filter(n=>n.getAttribute('aria-current')==='page').map(n=>n.id)
  };
}
test('N1-C2A keeps five actual page sections, no Dengue nav or source registration',()=>{
  for(const id of ['dashboard','records','reporter','admin','library']){
    assert.match(layout,new RegExp('id="page-'+id+'"'));
    assert.match(layout,new RegExp('data-page="'+id+'"'));
  }
  assert.doesNotMatch(layout,/id="page-dengue"|data-page="dengue"/);
  assert.doesNotMatch(manifest,/03l-client-d331-status|03-n1b1-trusted-event|04-n1b2b-mock/);
  assert.match(d331,/D331 N1-C1: OFFLINE-ONLY/);
  const foundation=fs.readFileSync(path.join(REPO,'src/dengue/00-g1a-foundation.gs'),'utf8');
  assert.match(foundation,/var D331_G1A_ENABLED = false;/);
});
test('unknown, forged D331 and malformed navigation are rejected before DOM mutation',()=>{
  for(const bad of ['dengue','DENGUE','dengue:ready','__proto__','constructor',
    'patient','unknown',null,undefined,{},[],{toString(){throw Error('coercion');}}]){
    const h=harness({canRecord:true,canManage:true});
    vm.runInContext('showPage',h.ctx)(bad,page('dengue'));
    assert.deepEqual(h.activePage(),['page-dashboard']);
    assert.deepEqual(h.currentNav(),['page-dashboard']);
    assert.deepEqual(h.calls,[]);
  }
});
test('missing known target fails closed before removing current active state',()=>{
  const h=harness({canRecord:true});
  h.nodes.delete('page-library');
  vm.runInContext('showPage',h.ctx)('library');
  assert.deepEqual(h.activePage(),['page-dashboard']);
  assert.deepEqual(h.calls,[]);
});
test('guest cannot enter records/reporter/admin by calling showPage directly',()=>{
  const h=harness();
  for(const name of ['records','reporter','admin']){
    vm.runInContext('showPage',h.ctx)(name);
    assert.deepEqual(h.activePage(),['page-dashboard']);
    assert.deepEqual(h.currentNav(),['page-dashboard']);
  }
  assert.equal(h.calls.length,3);
  assert.ok(h.calls.every(x=>x[0]==='toast'));
});
test('known authorized routes preserve existing nav selection and loading side effects',()=>{
  const h=harness({canRecord:true,canManage:true});
  const fn=vm.runInContext('showPage',h.ctx);
  for(const name of ['records','reporter','admin','library','dashboard']){
    const before=h.calls.length;
    fn(name);
    assert.deepEqual(h.activePage(),['page-'+name]);
    assert.deepEqual(h.currentNav(),['page-'+name]);
    const side=h.calls.slice(before);
    assert.ok(side.some(x=>x[0]==='sidebar'));
    if(name==='admin')assert.ok(side.some(x=>x[0]==='loadAdmin'));
    if(name==='library')assert.ok(side.some(x=>x[0]==='renderLibrary'));
    if(name==='records'||name==='reporter')assert.ok(side.some(x=>x[0]==='renderTables'));
  }
});
test('forged button argument never becomes selected nav or adds an unauthorized page',()=>{
  const h=harness({canRecord:true,canManage:true});
  const rogue=page('dengue');
  vm.runInContext('showPage',h.ctx)('library',rogue);
  assert.equal(rogue.classList.contains('active'),false);
  assert.equal(rogue.getAttribute('aria-current'),undefined);
  assert.deepEqual(h.activePage(),['page-library']);
  assert.deepEqual(h.currentNav(),['page-library']);
});
test('no new RPC, client grants, patient fields, Script Properties or D331 hooks',()=>{
  assert.doesNotMatch(source,/\b(?:google\.script|gs\s*\(|fetch\s*\(|SpreadsheetApp|PropertiesService|localStorage|d331N1cStatusWorkspace_|D331_G1A_ENABLED)\b/);
  const h=harness({canRecord:true,canManage:true});
  vm.runInContext('showPage',h.ctx)('dengue');
  assert.deepEqual(h.calls,[]);
  assert.deepEqual(h.activePage(),['page-dashboard']);
});
