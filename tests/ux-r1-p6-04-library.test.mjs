// UX-R1/P6-04: public-only reference Library filters and safe external links.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/web/02-app-layout.html');
const source=read('src/web/04-browser-app.html');
const css=read('src/styles/shared-ui.css');
function fixture(){
  const nodes=new Map(),calls=[];
  const el=id=>{
    if(!nodes.has(id)){
      const classes=new Set();
      nodes.set(id,{
        id,value:'',textContent:'',innerHTML:'',disabled:false,style:{display:''},
        classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
        focus(){},setAttribute(){},removeAttribute(){}
      })
    }
    return nodes.get(id)
  };
  const ctx=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return[]}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},URL,console
  });
  for(const {path,code} of readOrderedClientScripts()){
    const safe=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(safe,{filename:path}).runInContext(ctx,{timeout:2500})
  }
  ctx.gs=(...args)=>{calls.push(args);throw Error('unexpected Library RPC')};
  return {ctx,el,calls}
}
function seed(h,data){
  vm.runInContext('token="";currentUser=null;currentContent='+JSON.stringify(data),h.ctx)
}
const samples=[
  {id:'1',title:'ประกาศการเฝ้าระวังโรค',category:'ประกาศ',description:'แนวทางเฝ้าระวังระดับพื้นที่',url:'https://example.org/notice'},
  {id:'2',title:'คู่มือ SRRT',category:'คู่มือ',description:'เอกสารการสอบสวนโรค',url:'https://example.org/manual'},
  {id:'3',title:'เอกสารไม่พร้อมเผยแพร่',category:'คู่มือ',status:'draft',description:'ข้อมูลภายใน',url:'https://example.org/draft'}
];
test('P6-04 one public Library has accessible filters, result status and responsive cards',()=>{
  const section=page.split('<section id="page-library"')[1].split('</section>')[0];
  for(const id of ['librarySearch','libraryCategory','libraryResetBtn','libraryResults','libraryList'])
    assert.equal((section.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.match(section,/role="search" aria-label="ค้นหาประกาศและคู่มือ"/);
  assert.match(section,/aria-live="polite"/);
  assert.match(css,/srrt-library-grid/);
  assert.match(css,/@media\(max-width:720px\)/);
});
test('P6-04 anonymous users can filter published titles, descriptions and categories with zero RPC',()=>{
  const h=fixture();seed(h,samples);
  vm.runInContext('renderLibrary()',h.ctx);
  assert.match(h.el('libraryResults').textContent,/แสดง 2 จาก 2/);
  assert.match(h.el('libraryList').innerHTML,/ประกาศการเฝ้าระวังโรค/);
  assert.match(h.el('libraryList').innerHTML,/คู่มือ SRRT/);
  assert.doesNotMatch(h.el('libraryList').innerHTML,/เอกสารไม่พร้อมเผยแพร่/);
  assert.match(h.el('libraryCategory').innerHTML,/value="คู่มือ"/);
  h.el('librarySearch').value='สอบสวนโรค';
  vm.runInContext('renderLibrary()',h.ctx);
  assert.match(h.el('libraryList').innerHTML,/คู่มือ SRRT/);
  assert.doesNotMatch(h.el('libraryList').innerHTML,/ประกาศการเฝ้าระวังโรค/);
  h.el('librarySearch').value='';
  h.el('libraryCategory').value='ประกาศ';
  vm.runInContext('renderLibrary()',h.ctx);
  assert.match(h.el('libraryList').innerHTML,/ประกาศการเฝ้าระวังโรค/);
  assert.doesNotMatch(h.el('libraryList').innerHTML,/คู่มือ SRRT/);
  assert.equal(h.calls.length,0);
});
test('P6-04 reset and distinct empty states do not invoke server or expose drafts',()=>{
  const h=fixture();seed(h,samples);
  h.el('librarySearch').value='not-found-phrase';
  vm.runInContext('renderLibrary()',h.ctx);
  assert.match(h.el('libraryList').innerHTML,/ไม่พบเอกสารที่ตรงกับคำค้นหา/);
  assert.match(h.el('libraryResults').textContent,/แสดง 0 จาก 2/);
  vm.runInContext('resetLibraryFilters()',h.ctx);
  assert.equal(h.el('librarySearch').value,'');
  assert.equal(h.el('libraryCategory').value,'');
  assert.match(h.el('libraryResults').textContent,/แสดง 2 จาก 2/);
  seed(h,[samples[2]]);
  vm.runInContext('renderLibrary()',h.ctx);
  assert.match(h.el('libraryList').innerHTML,/ยังไม่มีประกาศหรือคู่มือที่เผยแพร่/);
  assert.match(h.el('libraryResults').textContent,/แสดง 0 จาก 0/);
  assert.equal(h.calls.length,0);
});
test('P6-04 links have safe scheme, rel protections and explicit accessible purpose',()=>{
  const h=fixture();seed(h,[
    {title:'เอกสาร HTTPS',category:'คู่มือ',url:'https://example.org/doc'},
    {title:'เอกสาร HTTP',category:'ประกาศ',url:'http://example.org/info'},
    {title:'ลิงก์อันตราย',category:'คู่มือ',url:'javascript:alert(1)'},
    {title:'ลิงก์แบบมีรหัสผ่าน',category:'คู่มือ',url:'https://user:pass@example.org/'},
    {title:'ไม่มีเอกสารแนบ',category:'คู่มือ',url:''}
  ]);
  vm.runInContext('renderLibrary()',h.ctx);
  const html=h.el('libraryList').innerHTML;
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,2);
  assert.match(html,/href="https:\/\/example.org\/doc"/);
  assert.match(html,/href="http:\/\/example.org\/info"/);
  assert.doesNotMatch(html,/href="javascript:/);
  assert.doesNotMatch(html,/href="https:\/\/user:pass/);
  assert.match(html,/aria-label="เปิดเอกสารภายนอก: เอกสาร HTTPS"/);
  assert.equal((html.match(/ไม่มีลิงก์เอกสารที่เปิดได้/g)||[]).length,3);
});
test('P6-04 escapes hostile title/category/description and URL attributes',()=>{
  const h=fixture();
  seed(h,[{
    title:'<img src=x onerror=alert(1)>',category:'หมวด" onclick="bad()',
    description:'<script>alert(2)</script>',url:'https://example.org/?q=" onmouseover="bad'
  }]);
  vm.runInContext('renderLibrary()',h.ctx);
  const html=h.el('libraryList').innerHTML;
  assert.doesNotMatch(html,/<img src=x|<script>|<option[^>]+onclick=|href="[^"]*" onmouseover=/);
  assert.match(html,/&lt;img/);
  assert.match(html,/&lt;script/);
  assert.equal(h.calls.length,0);
});
test('P6-04 published-only server contract remains unchanged; public Library makes no RPC',()=>{
  const helper=source.match(/function publicLibraryItems\(\)\{[\s\S]*?(?=\n  function safeLibraryUrl)/)?.[0]||'';
  const renderer=source.match(/function renderLibrary\(\)\{[\s\S]*?(?=\n  boot\(\);)/)?.[0]||'';
  assert.match(helper,/published/);
  assert.match(renderer,/publicLibraryItems\(\)/);
  assert.doesNotMatch(renderer,/\bgs\(|getAppBoot\(/);
  assert.match(renderer,/safeLibraryUrl\(item.url\)/);
  assert.match(renderer,/escapeHtml\(item.description/);
});
