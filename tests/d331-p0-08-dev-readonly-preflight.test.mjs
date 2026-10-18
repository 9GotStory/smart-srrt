import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sources=[
 '../src/server/00-bootstrap.gs',
 '../src/dengue/00-g1a-foundation.gs',
 '../src/dengue/07-p0-02a-mvp-schema-contract.gs',
 '../src/dengue/09-p0-03b-dev-readonly-adapter.gs',
 '../src/dengue/10-p0-05-v2-schema-compat.gs',
 '../src/dengue/13-p0-08-dev-readonly-preflight.gs'
];
const contents=sources.map(p=>fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const ID='SYNTHETIC_DEV_SPREADSHEET_ID_01234567890';
function setup(options={}) {
 const ctx=vm.createContext({});
 contents.forEach((src,i)=>vm.runInContext(src,ctx,{filename:sources[i]}));
 const headers={
   MainData:Array.from(ctx.MAIN_HEADERS).concat(
    Array.from(ctx.EVENT_META_HEADERS),[ctx.EVENT_OWNER_HEADER]),
   UserAccounts:Array.from(ctx.D331_P003B_USER_HEADERS_),
   AreaMaster:Array.from(ctx.D331_P003B_AREA_HEADERS_)
 };
 for(const tab of Array.from(ctx.D331_P005_V2_TABS_))
   headers[tab]=Array.from(ctx.d331P002aHeaders_(tab));
 const trace={propertyReads:0,opens:0,headerReads:[],rowReads:0,writes:0,locks:0};
 const sheets={};
 for(const [name,original] of Object.entries(headers)){
   if(options.missing===name)continue;
   const h=name===options.badHeader?[...original].reverse():original;
   const populated=name===options.extraHeader?[...h,'Unexpected']:h;
   sheets[name]={
     getLastRow:()=>options.simulatedPopulatedRows?400:1,
     getLastColumn:()=>populated.length,
     getRange:(row,col,height,width)=>{
       trace.headerReads.push({name,row,col,height,width});
       if(row!==1||height!==1)trace.rowReads++;
       return {getValues:()=>[populated.slice(col-1,col-1+width)]};
     }
   };
 }
 const spreadsheet={getId:()=>options.openedId??ID,
   getSheetByName:name=>sheets[name]||null};
 ctx.PropertiesService={getScriptProperties:()=>({
  getProperty:name=>{
    assert.equal(name,'DATABASE_SPREADSHEET_ID');
    trace.propertyReads++;
    return Object.hasOwn(options,'propertyValue')?options.propertyValue:ID;
  },
  setProperty:()=>{trace.writes++;throw Error('Unexpected Script Property write');}
 })};
 ctx.SpreadsheetApp={
   openById:id=>{
     assert.equal(id,ID);trace.opens++;
     return spreadsheet;
   },
   getActiveSpreadsheet:()=>{throw Error('Forbidden spreadsheet fallback')},
   flush:()=>{trace.writes++;throw Error('Unexpected flush')}
 };
 ctx.LockService={getScriptLock:()=>{trace.locks++;throw Error('Unexpected lock')}};
 ctx.D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=options.expectedId??ID;
 // All source-level feature controls remain OFF for this read-only gate.
 return {ctx,trace,run:()=>ctx.d331P008CheckHeaders_()};
}
function deny(options){
 const s=setup(options);
 assert.throws(()=>s.run(),/D331_DEV_PREFLIGHT_UNAVAILABLE/);
 assert.equal(s.trace.rowReads,0);
 assert.equal(s.trace.writes,0);
 assert.equal(s.trace.locks,0);
 return s;
}
test('P0-08 internal helper is unregistered and D331 feature remains OFF',()=>{
 const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/13-p0-08-dev-readonly-preflight/);
 assert.match(contents[1],/D331_G1A_ENABLED = false/);
 assert.match(contents[3],/D331_P003B_ENABLED_ = false/);
 assert.match(contents[5],/D331_P008_DEV_PREFLIGHT_ONLY_ = true/);
 assert.doesNotMatch(contents[5],/function\s+d331P008CheckHeaders\(/);
 const stripped=contents[5].replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 for(const forbidden of ['getDb_(', 'setProperty(', 'appendRow(','.setValues(','.setValue(',
   'getActiveSpreadsheet(','.getLastRow() > 1','getUserByToken_(']){
   assert.equal(stripped.includes(forbidden),false,forbidden);
 }
});
test('checks all 10 exact headers from same pinned original DEV sheet, never data rows',()=>{
 const s=setup();
 const out=JSON.parse(JSON.stringify(s.run()));
 assert.deepEqual(out,{
  status:'DEV_SCHEMA_HEADERS_PASS',existingHeadersChecked:3,
  dengueHeadersChecked:7,headersChecked:10,readDataRows:false,
  scriptDeploymentBinding:'NOT_ATTESTED',sessionAndGrants:'NOT_TESTED',
  canWrite:false,canEnable:false,canDeploy:false
 });
 assert.equal(s.trace.propertyReads,1);
 assert.equal(s.trace.opens,1);
 assert.equal(s.trace.headerReads.length,10);
 assert.equal(s.trace.rowReads,0);
 assert.equal(s.trace.writes,0);
 assert.equal(s.trace.locks,0);
 assert.ok(s.trace.headerReads.every(x=>x.row===1&&x.height===1));
});
test('missing approved DEV spreadsheet identifier denies before Google service calls',()=>{
 const s=deny({expectedId:''});
 assert.equal(s.trace.propertyReads,0);
 assert.equal(s.trace.opens,0);
});
test('mismatched configured Script Property fails before opening Spreadsheet',()=>{
 const s=deny({propertyValue:'WRONG_VALUE'});
 assert.equal(s.trace.propertyReads,1);
 assert.equal(s.trace.opens,0);
});
test('wrong spreadsheet object identifier fails before reading headers',()=>{
 const s=deny({openedId:'ANOTHER_ID'});
 assert.equal(s.trace.headerReads.length,0);
});
test('missing each of 10 required tabs fails closed',()=>{
 const s=setup();
 const names=['MainData','UserAccounts','AreaMaster',...Array.from(s.ctx.D331_P005_V2_TABS_)];
 assert.equal(names.length,10);
 names.forEach(name=>deny({missing:name}));
});
test('wrong ordered headers in any of ten tabs are rejected',()=>{
 const s=setup();
 const names=['MainData','UserAccounts','AreaMaster',...Array.from(s.ctx.D331_P005_V2_TABS_)];
 names.forEach(name=>deny({badHeader:name}));
});
test('extra populated header columns in every v2 tab are rejected',()=>{
 const s=setup();
 Array.from(s.ctx.D331_P005_V2_TABS_).forEach(name=>deny({extraHeader:name}));
});
test('schema version mismatch fails closed without reading records',()=>{
 const s=setup();
 s.ctx.D331_P002A_SCHEMA_VERSION_=1;
 assert.throws(()=>s.run(),/D331_DEV_PREFLIGHT_UNAVAILABLE/);
 assert.equal(s.trace.rowReads,0);
});

test('missing or blank Script Property fails before opening spreadsheet',()=>{
 for(const value of [null,'']){
  const s=deny({propertyValue:value});
  assert.equal(s.trace.propertyReads,1);
  assert.equal(s.trace.opens,0);
 }
});
test('preflight reads no clinical records when existing tabs report populated rows',()=>{
 const s=setup({simulatedPopulatedRows:true});
 assert.equal(s.run().status,'DEV_SCHEMA_HEADERS_PASS');
 assert.equal(s.trace.headerReads.length,10);
 assert.equal(s.trace.rowReads,0);
 assert.equal(s.trace.writes,0);
});
