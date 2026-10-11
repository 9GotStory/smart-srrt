import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES,buildGasMultiFileEntries,renderGasIndexOffline} from '../tools/build-apps-script-multifile.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(ROOT,'src/web/03a-dashboard-mobile.html'),'utf8');
const manifest=fs.readFileSync(path.join(ROOT,'tools/native-sources.mjs'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));

test('R2-03 native source is canonical, One-Click is frozen and not an active build target',()=>{
  assert.equal(GAS_SERVER_SOURCES.length,7);
  assert.equal(GAS_HTML_SOURCES.length,6);
  assert.equal(buildGasMultiFileEntries().size,14);
  assert.equal(path.basename(GAS_HTML_SOURCES[4]),'03a-dashboard-mobile.html');
  assert.equal(path.basename(GAS_HTML_SOURCES.at(-1)),'04-browser-app.html');
  assert.ok(renderGasIndexOffline(buildGasMultiFileEntries()).includes(Buffer.from('srrtDashboardCards')));
  assert.match(pkg.scripts.build,/build:gas-multifile/);
  assert.doesNotMatch(pkg.scripts.build,/one.click|OneClick|build-one-click/i);
  assert.doesNotMatch(pkg.scripts['build:check'],/one.click|build-one-click/i);
  assert.ok(!fs.readFileSync(path.join(ROOT,'tools/build-apps-script-multifile.mjs'),'utf8').includes('ONE_CLICK_TARGETS'));
  assert.doesNotMatch(manifest,/ONE_CLICK_TARGETS|build-one-click/);
});

test('R2-03 component has separately parsed and stable compact CSS/JS',()=>{
  assert.ok(html.length<6000,'component is too large; split separate native partials instead');
  assert.equal((html.match(/<style>/g)||[]).length,1);
  assert.equal((html.match(/<script>/g)||[]).length,1);
  const script=html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(()=>new vm.Script(script));
  for(const text of ['eventBody','eventDetailPanel','srrtDashboardCards','currentUser','MutationObserver','col24','col26','aria-expanded']){
    assert.ok(script.includes(text),'missing mobile card invariant: '+text);
  }
  assert.doesNotMatch(script,/google\.script\.run|\bgs\s*\(/,'new private RPC is prohibited');
  assert.doesNotMatch(script,/\.innerHTML\s*=|insertAdjacentHTML/,'use safe textContent/DOM methods for incident narratives');
});

test('R2-03 old One-Click files remain committed historical, not updated from native partial list',()=>{
  const legacy=fs.readFileSync(path.join(ROOT,'Index_Smart_SRRT_OneClick.html'),'utf8');
  const native=renderGasIndexOffline(buildGasMultiFileEntries()).toString('utf8');
  assert.ok(native.includes('srrtDashboardCards'));
  assert.ok(!legacy.includes('03a-dashboard-mobile'),'frozen One-Click should NOT acquire native UI');
  assert.ok(native.length>legacy.length);
  assert.ok(legacy.trimEnd().endsWith('</html>'));
});

test('R2-03 synthetic role switch clears private mobile cards and retains one table action path',()=>{
  let onChange,selected=null,attached=null;
  function element(tag='div'){
    const classes=new Set(),callbacks={},attrs={};
    return {tag,children:[],classList:{add:x=>classes.add(x),contains:x=>classes.has(x),toggle:(x,v)=>{if(v)classes.add(x);else classes.delete(x)}},
      dataset:{},textContent:'',id:'',parentNode:null,cells:[],
      setAttribute:(a,v)=>{attrs[a]=String(v)},getAttribute:a=>attrs[a],
      append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},
      querySelectorAll(q){return q==='button[data-show-event-table]'?this.children.flatMap(card=>card.children.filter(x=>x.tag==='button')):[]},
      addEventListener:(type,cb)=>{callbacks[type]=cb},click(){callbacks.click?.()},
      focus(){selected=this}
    };
  }
  const tr=element('tr');
  tr.cells=['11 ต.ค. 2569','ไข้เลือดออก','บ้านตัวอย่าง','กำลังติดตาม','ผู้รับผิดชอบ','ตรวจสอบแล้ว','เข้าเกณฑ์','สูง','ไฟล์แนบ','ดำเนินการ'].map(s=>({textContent:s}));
  const table=element('div');table.closest=()=>table;
  const parent={insertBefore(cards){attached=cards}};
  table.parentNode=parent;
  const body=element('tbody');body.querySelectorAll=()=>[tr];body.closest=()=>table;
  const panel=element('div');
  const document={readyState:'complete',createElement:element,getElementById:id=>({eventBody:body,eventDetailPanel:panel,srrtDashboardCards:attached}[id]||null)};
  class Observer{constructor(cb){onChange=cb}observe(){}}
  const ctx={document,MutationObserver:Observer,currentUser:null,allData:[]};
  vm.createContext(ctx);
  const browserSource=html.split('<script>')[1].split('</script>')[0];
  vm.runInContext(browserSource,ctx,{timeout:1000});
  assert.equal(attached.children.length,0,'guest must not receive row cards');
  ctx.currentUser={role:'Staff'};
  ctx.allData=[{col24:'ลงสอบสวน',col26:'2569-10-11'}];
  onChange();
  assert.equal(attached.children.length,1);
  const card=attached.children[0];
  const action=card.children.find(x=>x.tag==='button');
  assert.ok(action,'card must disclose existing authorized table');
  assert.equal(card.children[0].textContent,'ไข้เลือดออก');
  assert.equal(action.getAttribute('aria-expanded'),'false');
  action.click();
  assert.equal(table.classList.contains('srrt-mobile-table-expanded'),true);
  assert.equal(action.getAttribute('aria-expanded'),'true');
  assert.equal(selected,tr,'original authorized row should receive focus');
  assert.ok(!card.children.some(x=>String(x.textContent).includes('สร้างรายงาน AI')),'mobile must not clone report action');
  ctx.currentUser=null;ctx.allData=[];onChange();
  assert.equal(attached.children.length,0,'logout must clear all private cards');
});
