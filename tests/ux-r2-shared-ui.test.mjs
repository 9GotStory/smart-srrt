import {nativeHtml} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const layout=fs.readFileSync(new URL('../src/web/02-app-layout.html',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('../src/web/04-browser-app.html',import.meta.url),'utf8');
const sharedCSS=fs.readFileSync(new URL('../src/styles/shared-ui.css',import.meta.url),'utf8');
const buildHTML=nativeHtml;

function fixtureClassList(initial=[]){
  const state=new Set(initial);
  return {state,add:key=>state.add(key),remove:key=>state.delete(key),contains:key=>state.has(key),toggle:(key,on)=>on?state.add(key):state.delete(key)};
}
function node(dataset={},initial=[]){
  const attrs=new Map();
  return {dataset,classList:fixtureClassList(initial),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k)??null};
}

test('R2-02 keeps 5 page roles/handlers and mounts pinned inline Lucide SVGs without public row leaks',()=>{
  const nav=layout.slice(layout.indexOf('<div class="nav"'),layout.indexOf('<div class="auth-card"'));
  const pages=[...nav.matchAll(/data-page="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(pages,['dashboard','records','reporter','admin','library']);
  assert.deepEqual([...nav.matchAll(/data-lucide="([^"]+)"/g)].map(x=>x[1]),['layout-dashboard','clipboard-list','file-text','settings','book-open']);
  for(const page of pages)assert.ok(nav.includes(`onclick="showPage('${page}',this)"`),'missing handler for '+page);
  assert.match(nav,/data-page="dashboard" aria-current="page"/);
  assert.match(nav,/class="auth-only" data-page="reporter"/);
  assert.match(nav,/class="manager-only" data-page="admin"/);
  assert.ok(!/class="fa-solid/.test(nav),'navigation must not rely on Font Awesome after limited migration');
  assert.match(layout,/id="mainContent" tabindex="-1"/);
  assert.match(layout,/class="srrt-skip-link"/);
  assert.match(layout,/id="openSidebarBtn"[^>]*aria-expanded="false"/);
  for(const id of ['eventBody','recordBody','reportBody']){
    assert.match(layout,new RegExp('<table aria-label="[^"<>]+">[\\s\\S]*?<tbody id="'+id+'"'));
  }
  assert.match(layout,/class="brand tw:flex tw:items-center tw:gap-4"/);
  assert.equal((layout.match(/class="srrt-icon"/g)||[]).length,6);
  assert.ok(!/<script|<foreignObject|onload=/.test(nav));
});

test('R2-02 navigation updates aria-current without redefining business routing',()=>{
  const a=script.indexOf('  function showPage(page,btn){');
  const b=script.indexOf('  function applyTheme(){',a);
  assert.ok(a>0&&b>a);
  const pages=['dashboard','records','reporter','admin','library'];
  const buttons=pages.map((page,i)=>node({page},i===0?['active']:[]));
  buttons[0].setAttribute('aria-current','page');
  const sections=pages.map((page,i)=>node({},i===0?['active']:[]));
  const map=new Map(pages.map((p,i)=>['page-'+p,sections[i]]));
  const calls=[];
  const ctx={document:{querySelectorAll:q=>q==='.section'?sections:buttons},el:id=>map.get(id),toggleSidebar:s=>calls.push(['sidebar',s]),loadAdmin:()=>calls.push('admin'),renderLibrary:()=>calls.push('library'),renderTables:()=>calls.push('tables')};
  vm.createContext(ctx);
  vm.runInContext(script.slice(a,b),ctx,{timeout:1000});
  ctx.showPage('library',buttons[4]);
  assert.equal(buttons[0].getAttribute('aria-current'),null);
  assert.equal(buttons[4].getAttribute('aria-current'),'page');
  assert.equal(sections[4].classList.contains('active'),true);
  assert.equal(sections[0].classList.contains('active'),false);
  assert.deepEqual(calls,[['sidebar',false],'library']);
  ctx.showPage('records',buttons[1]);
  assert.equal(buttons[1].getAttribute('aria-current'),'page');
  assert.equal(buttons[4].getAttribute('aria-current'),null);
  assert.ok(calls.includes('tables'));
});

test('R2-02 mobile disclosure reflects expanded state, Escape dismissal and focus return',()=>{
  const a=script.indexOf('  function toggleSidebar(show){');
  const b=script.indexOf('  function escapeHtml(v)',a);
  assert.ok(a>0&&b>a);
  const current=node({page:'dashboard'},['active']),sidebar=node(),overlay=node(),trigger=node();
  let focused=null;
  const document={activeElement:null,addEventListener:(t,cb)=>{if(t==='keydown')focused=cb}};
  current.focus=()=>{document.activeElement=current};
  trigger.focus=()=>{document.activeElement=trigger};
  sidebar.querySelector=()=>current;
  sidebar.contains=el=>el===current;
  const elements={sidebar,overlay,openSidebarBtn:trigger};
  const ctx={document,window:{matchMedia:()=>({matches:true})},el:id=>elements[id]};
  vm.createContext(ctx);
  vm.runInContext(script.slice(a,b),ctx,{timeout:1000});
  ctx.toggleSidebar(true);
  assert.equal(sidebar.classList.contains('open'),true);
  assert.equal(trigger.getAttribute('aria-expanded'),'true');
  assert.equal(document.activeElement,current);
  assert.equal(typeof focused,'function');
  focused({key:'Escape'});
  assert.equal(sidebar.classList.contains('open'),false);
  assert.equal(trigger.getAttribute('aria-expanded'),'false');
  assert.equal(document.activeElement,trigger);
});

test('R2-02 preserves shared visual keyboard CSS and identical modular/One-Click page markup',()=>{
  assert.match(sharedCSS,/srrt-skip-link:focus-visible/);
  assert.match(sharedCSS,/nav button:focus-visible/);
  assert.ok(sharedCSS.includes('.table-wrap[role="region"]:focus-visible'));
  assert.ok(sharedCSS.includes('.sidebar:not(.open)'));
  assert.match(sharedCSS,/prefers-reduced-motion:reduce/);
  assert.ok(buildHTML.includes(layout),'built One-Click must contain exact updated layout partial');
  assert.ok(buildHTML.includes('UX-R2 shared UI'),'compiled output must include shared scoped CSS');
});
