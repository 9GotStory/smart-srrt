import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const HTML_PATH = new URL('../Index_Smart_SRRT_OneClick.html', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){this.sheet=sheet;this.row=row;this.col=col;this.numRows=numRows;this.numCols=numCols}
  _ensure(){
    const needed=this.row-1+this.numRows;
    while(this.sheet.rows.length<needed)this.sheet.rows.push([]);
    for(const r of this.sheet.rows)while(r.length<this.sheet.maxCols)r.push('');
  }
  getValues(){
    this._ensure();
    return Array.from({length:this.numRows},(_,ri)=>Array.from({length:this.numCols},(_,ci)=>this.sheet.rows[this.row-1+ri]?.[this.col-1+ci]??''));
  }
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>String(v??'')))}
  setValues(values){
    this._ensure();
    for(let ri=0;ri<this.numRows;ri++)for(let ci=0;ci<this.numCols;ci++)this.sheet.rows[this.row-1+ri][this.col-1+ci]=values[ri][ci];
    return this;
  }
  setValue(v){this._ensure();this.sheet.rows[this.row-1][this.col-1]=v;return this}
}
class FakeSheet {
  constructor(rows=[],maxCols=7){this.maxCols=maxCols;this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x})}
  getDataRange(){return new FakeRange(this,1,1,this.rows.length||1,this.maxCols)}
  getLastRow(){return this.rows.length}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
  appendRow(row){const x=[...row];this.maxCols=Math.max(this.maxCols,x.length);while(x.length<this.maxCols)x.push('');this.rows.push(x);return this}
}

function makeContext(){
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite};
  vm.createContext(context);vm.runInContext(source,context);return context;
}

function masterHeader(){return ['Type','Value','Label','SortOrder','Active','UpdatedAt','UpdatedBy']}

test('G-24 keeps schema v5 and allowlists exactly the supported MasterData types',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'5');
  assert.deepEqual(Object.keys(ctx.MASTER_DATA_POLICIES).sort(),[
    'content_category','criteria','disease_group','event_type','risk','surveillance','verify_status'
  ].sort());
});

test('criteria and verify_status are semantic-locked while ordinary types remain user-manageable',()=>{
  const ctx=makeContext();
  for(const type of ['criteria','verify_status']){
    const p=ctx.MASTER_DATA_POLICIES[type];
    assert.equal(p.semanticLocked,true);
    assert.equal(p.allowCreate,false);
    assert.equal(p.allowDeactivate,false);
  }
  for(const type of ['surveillance','disease_group','event_type','risk','content_category']){
    const p=ctx.MASTER_DATA_POLICIES[type];
    assert.equal(p.semanticLocked,false);
    assert.equal(p.allowCreate,true);
    assert.equal(p.allowDeactivate,true);
  }
});

test('unknown MasterData Type is rejected server-side',()=>{
  const ctx=makeContext();
  assert.throws(()=>ctx.getMasterPolicy_('custom_type'),/ไม่ได้รับอนุญาต/);
});

test('usage count maps supported types to the intended source columns',()=>{
  const ctx=makeContext();
  const mainRows=[
    Array(30).fill(''),
    Array(30).fill(''),
    Array(30).fill('')
  ];
  mainRows[1][3]='EBS';
  mainRows[2][3]='EBS';
  mainRows[1][16]='เข้าเกณฑ์';
  mainRows[2][16]='ไม่เข้าเกณฑ์';
  const contentRows=[
    ['ContentID','Category'],
    ['1','ประกาศ'],
    ['2','ประกาศ'],
    ['3','คู่มือ']
  ];
  const main=new FakeSheet(mainRows,30);
  const content=new FakeSheet(contentRows,2);
  ctx.getSheetByIdOrName_=()=>main;
  ctx.getSheet_=name=>{
    if(name==='ContentLibrary')return content;
    throw new Error('unexpected sheet '+name);
  };

  assert.equal(ctx.countMasterDataUsage_('surveillance','EBS'),2);
  assert.equal(ctx.countMasterDataUsage_('criteria','เข้าเกณฑ์'),1);
  assert.equal(ctx.countMasterDataUsage_('content_category','ประกาศ'),2);
});

test('create is allowed only for user-manageable types and emits audit',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([
    masterHeader(),
    ['disease_group','เดิม','เดิม',1,true,'','']
  ],7);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheet_=()=>sheet;
  ctx.writeAudit_=(...args)=>audits.push(args);

  const msg=ctx.saveMasterDataItem('token',{
    mode:'create',
    type:'disease_group',
    value:'โรคทดสอบ',
    label:'โรคทดสอบ',
    sortOrder:9,
    active:true
  });
  assert.match(msg,/เพิ่ม MasterData/);
  assert.equal(sheet.rows.length,3);
  assert.equal(sheet.rows[2][0],'disease_group');
  assert.equal(sheet.rows[2][1],'โรคทดสอบ');
  assert.equal(audits[0][1],'CREATE_MASTER_DATA');

  assert.throws(()=>ctx.saveMasterDataItem('token',{
    mode:'create',
    type:'criteria',
    value:'ค่าใหม่',
    label:'ค่าใหม่',
    sortOrder:4,
    active:true
  }),/ไม่อนุญาตให้สร้าง Value ใหม่/);
});

test('case-insensitive duplicate Value is rejected within the same Type',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([
    masterHeader(),
    ['event_type','Cluster','Cluster',1,true,'','']
  ],7);
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheet_=()=>sheet;
  ctx.writeAudit_=()=>{};

  assert.throws(()=>ctx.saveMasterDataItem('token',{
    mode:'create',
    type:'event_type',
    value:' cluster ',
    label:'Duplicate',
    sortOrder:2,
    active:true
  }),/มี MasterData Type\/Value นี้อยู่แล้ว/);
});

test('update preserves immutable Type+Value and allows label/sort changes',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([
    masterHeader(),
    ['risk','ความเสี่ยงต่ำ','ต่ำ',1,true,'old','old@example.test']
  ],7);
  const audits=[];
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheet_=()=>sheet;
  ctx.writeAudit_=(...args)=>audits.push(args);

  const msg=ctx.saveMasterDataItem('token',{
    mode:'update',
    originalType:'risk',
    originalValue:'ความเสี่ยงต่ำ',
    type:'risk',
    value:'ความเสี่ยงต่ำ',
    label:'ความเสี่ยงระดับต่ำ',
    sortOrder:2,
    active:false
  });
  assert.match(msg,/บันทึก MasterData/);
  assert.equal(sheet.rows[1][0],'risk');
  assert.equal(sheet.rows[1][1],'ความเสี่ยงต่ำ');
  assert.equal(sheet.rows[1][2],'ความเสี่ยงระดับต่ำ');
  assert.equal(sheet.rows[1][3],2);
  assert.equal(sheet.rows[1][4],false);
  assert.equal(audits[0][1],'UPDATE_MASTER_DATA');

  assert.throws(()=>ctx.saveMasterDataItem('token',{
    mode:'update',
    originalType:'risk',
    originalValue:'ความเสี่ยงต่ำ',
    type:'risk',
    value:'เปลี่ยน key',
    label:'x',
    sortOrder:1,
    active:true
  }),/ไม่อนุญาตให้เปลี่ยน Type หรือ Value/);
});

test('semantic types cannot be deactivated',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([
    masterHeader(),
    ['criteria','เข้าเกณฑ์','เข้าเกณฑ์',1,true,'','']
  ],7);
  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager'});
  ctx.getSheet_=()=>sheet;
  ctx.writeAudit_=()=>{};

  assert.throws(()=>ctx.saveMasterDataItem('token',{
    mode:'update',
    originalType:'criteria',
    originalValue:'เข้าเกณฑ์',
    type:'criteria',
    value:'เข้าเกณฑ์',
    label:'เข้าเกณฑ์',
    sortOrder:1,
    active:false
  }),/ไม่อนุญาตให้ปิดใช้งาน/);
});

test('soft-disabled values disappear from new selections but historical sheet values are untouched',()=>{
  const ctx=makeContext();
  const masterSheet=new FakeSheet([
    masterHeader(),
    ['disease_group','A','กลุ่ม A',1,false,'',''],
    ['disease_group','B','กลุ่ม B',2,true,'','']
  ],7);
  ctx.getSheet_=()=>masterSheet;

  const result=ctx.getMasterData();
  assert.deepEqual(Array.from(result.disease_group,o=>o.value),['B']);
  assert.equal(masterSheet.rows[1][1],'A');
});


test('new Event selections must use active MasterData while unchanged legacy values remain editable',()=>{
  const ctx=makeContext();
  const masterSheet=new FakeSheet([
    masterHeader(),
    ['disease_group','ACTIVE','Active',1,true,'',''],
    ['disease_group','OLD','Old',2,false,'',''],
    ['surveillance','EBS','EBS',1,true,'',''],
    ['event_type','TYPE','Type',1,true,'',''],
    ['verify_status','รอตรวจสอบ','รอตรวจสอบ',1,true,'',''],
    ['criteria','เข้าเกณฑ์','เข้าเกณฑ์',1,true,'',''],
    ['risk','ความเสี่ยงต่ำ','ความเสี่ยงต่ำ',1,true,'','']
  ],7);
  ctx.getSheet_=()=>masterSheet;

  assert.doesNotThrow(()=>ctx.validateEventMasterData_({
    col4:'EBS',col5:'ACTIVE',col7:'TYPE',col15:'รอตรวจสอบ',col17:'เข้าเกณฑ์',col19:'ความเสี่ยงต่ำ'
  },null));

  assert.throws(()=>ctx.validateEventMasterData_({col5:'OLD'},null),/ไม่อยู่ใน MasterData ที่เปิดใช้งาน/);

  const before=Array(30).fill('');
  before[4]='OLD';
  assert.doesNotThrow(()=>ctx.validateEventMasterData_({col5:'OLD'},before));
  assert.throws(()=>ctx.validateEventMasterData_({col5:'UNKNOWN'},before),/ไม่อยู่ใน MasterData ที่เปิดใช้งาน/);
});

test('record and content save paths enforce active MasterData server-side',()=>{
  const add=source.match(/function addRecord[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const update=source.match(/function updateRecord[\s\S]*?(?=\nfunction )/)?.[0]??'';
  const content=source.match(/function saveContent[\s\S]*?(?=\nfunction )/)?.[0]??'';

  assert.match(add,/validateEventMasterData_\(formData \|\| \{\}, null\)/);
  assert.match(update,/validateEventMasterData_\(formData \|\| \{\}, before\)/);
  assert.match(content,/isActiveMasterValue_\('content_category', category\)/);
  assert.match(content,/category !== existingCategory/);
});

test('MasterData admin computes usage map once per admin load',()=>{
  const block=source.match(/function getMasterDataAdmin[\s\S]*?(?=\nfunction )/)?.[0]??'';
  assert.match(block,/var usageMap = buildMasterDataUsageMap_\(\)/);
  assert.match(block,/countMasterDataUsage_\(type, value, usageMap\)/);
});

test('G-24 does not add a hard-delete MasterData endpoint',()=>{
  assert.doesNotMatch(source,/function\s+(?:delete|remove)MasterData/);
  assert.doesNotMatch(html,/deleteMasterData|removeMasterData/);
});

test('Admin UI preserves disabled historical values when editing Event and Content',()=>{
  assert.match(html,/\[เลิกใช้งาน\]/);
  assert.match(html,/dataset\.legacy='true'/);
  assert.match(html,/f\[2\]\.startsWith\('select:'\)/);
  assert.match(html,/function populateContentCategoryOptions\(selected\)/);
  assert.match(html,/<select class="input" id="cCategory"/);
});

test('Admin UI exposes only policy-backed MasterData editing',()=>{
  assert.match(html,/id="masterDataBody"/);
  assert.match(html,/id="masterDataModal"/);
  assert.match(html,/getMasterDataAdmin/);
  assert.match(html,/saveMasterDataItem/);
  assert.match(html,/Type นี้ผูกกับ business semantics ของระบบ/);
});
