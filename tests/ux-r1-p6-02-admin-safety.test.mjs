// UX-R1/P6-02 — Admin private-response races and explicit high-impact mutation guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const source=fs.readFileSync(new URL('../src/web/04-browser-app.html',import.meta.url),'utf8');
function deferred(){
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
  return {promise,resolve,reject}
}
function fixture(){
  const nodes=new Map(),calls=[],messages=[],confirmations=[];
  let allow=false;
  const el=id=>{
    if(!nodes.has(id)){
      const states=new Set(),attrs=new Map();
      nodes.set(id,{
        id,value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,style:{display:''},dataset:{},files:[],
        classList:{add:x=>states.add(x),remove:x=>states.delete(x),contains:x=>states.has(x),toggle(x,on){if(on)states.add(x);else states.delete(x)}},
        setAttribute(k,v){attrs.set(k,v)},getAttribute(k){return attrs.get(k)||''},removeAttribute(k){attrs.delete(k)},focus(){}
      })
    }
    return nodes.get(id)
  };
  const context=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return[]}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},setTimeout(){},clearTimeout(){},console,
    confirm(question){confirmations.push(String(question));return allow},
    XLSX:{read(){return {Sheets:{sheet:{}},SheetNames:['sheet']}},utils:{sheet_to_json(){return[]}}}
  });
  for(const {path,code} of readOrderedClientScripts()){
    const script=path==='src/web/04-browser-app.html'?code.replace(/^\s*boot\(\);\s*$/m,''):code;
    new vm.Script(script,{filename:path}).runInContext(context,{timeout:2500});
  }
  context.gs=(...args)=>{calls.push(args);return Promise.resolve(null)};
  context.toast=message=>messages.push(String(message));
  return {context,el,calls,messages,confirmations,setAllow:v=>allow=v}
}
function signIn(h,role='Manager',session='A'){
  vm.runInContext('token='+JSON.stringify(session)+';currentUser={role:'+JSON.stringify(role)+'}',h.context)
}
function logout(h){
  vm.runInContext('token="";currentUser=null;resetAdminPrivate()',h.context)
}
const dataRow={province:'แพร่',amphoe:'สอง',tambon:'บ้านกลาง',moo:1,village:'ตัวอย่าง'};
test('P6-02 every Admin read response is fenced by role/session and avoids private repaint',async()=>{
  const h=fixture();signIn(h);
  const pending=[];
  h.context.gs=(...args)=>{h.calls.push(args);const d=deferred();pending.push({name:args[0],d});return d.promise};
  const readNames=['loadAdmin','loadInstallStatus','loadSettings','loadMasterDataAdmin',
    'loadAreasAdmin','loadUsers','loadContentAdmin','loadAudit','loadAuditRetentionStatus'];
  const works=readNames.map(name=>vm.runInContext(name+'()',h.context));
  assert.equal(pending.length,readNames.length);
  h.el('set_GEMINI_API_KEY').value='synthetic-credential';
  logout(h);
  for(const item of pending){
    const data={
      getAnalytics:{kpi:{users:8,activeUsers:7,events:4}},
      getInstallationStatus:{version:42,spreadsheetName:'PRIVATE',areas:7},
      getSystemSettings:[{key:'GEMINI_MODEL',value:'PRIVATE'}],
      getMasterDataAdmin:{items:[],types:[]},
      listAreas:[dataRow],listUsers:[{name:'PRIVATE',email:'private@example.test'}],
      listContent:[{title:'PRIVATE',category:'draft',status:'draft'}],
      listAuditLogs:[{email:'private@example.test',action:'PRIVATE'}],
      getAuditRetentionStatus:{activeRows:1,eligibleRows:0}
    }[item.name];
    item.d.resolve(data);
  }
  await Promise.all(works);
  for(const id of ['userBody','areaBody','masterDataBody','contentAdminList','auditBody','installStatus','auditRetentionStatus'])
    assert.equal(h.el(id).innerHTML,'',id);
  assert.equal(h.el('set_GEMINI_API_KEY').value,'');
  assert.equal(h.messages.length,0);
  assert.equal(h.calls.some(([name])=>name==='repairInstallation'||name==='archiveAuditLogs'),false);
});
test('P6-02 overlapping User/Area search keeps most recent request',async()=>{
  const h=fixture();signIn(h);
  const waiting=[];
  h.context.gs=(...args)=>{h.calls.push(args);const d=deferred();waiting.push(d);return d.promise};
  h.el('userSearch').value='older';
  const a=vm.runInContext('loadUsers()',h.context);
  h.el('userSearch').value='newer';
  const b=vm.runInContext('loadUsers()',h.context);
  waiting[1].resolve([{name:'LATEST',email:'latest@example.test'}]);
  waiting[0].resolve([{name:'STALE',email:'stale@example.test'}]);
  await Promise.all([a,b]);
  assert.match(h.el('userBody').innerHTML,/LATEST/);
  assert.doesNotMatch(h.el('userBody').innerHTML,/STALE/);
  h.el('areaSearch').value='old';
  const c=vm.runInContext('loadAreasAdmin()',h.context);
  h.el('areaSearch').value='new';
  const d=vm.runInContext('loadAreasAdmin()',h.context);
  waiting[3].resolve([{...dataRow,village:'LATEST VILLAGE'}]);
  waiting[2].resolve([{...dataRow,village:'STALE VILLAGE'}]);
  await Promise.all([c,d]);
  assert.match(h.el('areaBody').innerHTML,/LATEST VILLAGE/);
  assert.doesNotMatch(h.el('areaBody').innerHTML,/STALE VILLAGE/);
});
test('P6-02 repair/archive need Manager consent and run at most once while pending',async()=>{
  const h=fixture();signIn(h,'Staff');h.setAllow(true);
  await vm.runInContext('repairSystem()',h.context);
  await vm.runInContext('archiveAuditNow()',h.context);
  assert.equal(h.calls.length,0);
  signIn(h);
  h.setAllow(false);
  await vm.runInContext('repairSystem()',h.context);
  await vm.runInContext('archiveAuditNow()',h.context);
  assert.equal(h.calls.length,0);
  h.setAllow(true);
  const one=deferred(),two=deferred();
  h.context.gs=(...args)=>{
    h.calls.push(args);
    if(args[0]==='repairInstallation')return one.promise;
    if(args[0]==='archiveAuditLogs')return two.promise;
    return Promise.resolve({})
  };
  const repair=vm.runInContext('repairSystem()',h.context);
  const archive=vm.runInContext('archiveAuditNow()',h.context);
  await Promise.all([vm.runInContext('repairSystem()',h.context),vm.runInContext('archiveAuditNow()',h.context)]);
  assert.deepEqual(h.calls.map(([name])=>name).sort(),['archiveAuditLogs','repairInstallation']);
  logout(h);
  one.resolve('repaired');two.resolve({removedFromActiveRows:12});
  await Promise.all([repair,archive]);
  assert.equal(h.calls.length,2,'no follow-up after logout');
  assert.equal(h.messages.length,0,'no stale success toast');
  assert.match(h.confirmations.join(' '),/Archive Audit/);
});
test('P6-02 import explicitly confirms validated row count; cancelled import writes none',async()=>{
  const h=fixture();signIn(h);
  const rows=[dataRow,{...dataRow,moo:2,village:'example2'}];
  h.context.XLSX.utils.sheet_to_json=()=>rows;
  const input={files:[{arrayBuffer:async()=>new Uint8Array([1,2]).buffer}],value:'synthetic.xlsx'};
  h.setAllow(false);
  await vm.runInContext('importAreaFile',h.context)(input);
  assert.match(h.confirmations[0],/2 แถว/);
  assert.equal(h.calls.filter(([name])=>name==='importAreas').length,0);
  assert.equal(input.value,'');
});
test('P6-02 import stops subsequent 200-row chunks if logout occurs during first batch',async()=>{
  const h=fixture();signIn(h);h.setAllow(true);
  const rows=Array.from({length:201},(_,i)=>({...dataRow,moo:i+1}));
  h.context.XLSX.utils.sheet_to_json=()=>rows;
  const first=deferred();
  h.context.gs=(...args)=>{h.calls.push(args);return args[0]==='importAreas'?first.promise:Promise.resolve({})};
  const input={files:[{arrayBuffer:async()=>new Uint8Array([1,2]).buffer}],value:'test.xlsx'};
  const running=vm.runInContext('importAreaFile',h.context)(input);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls.filter(([name])=>name==='importAreas').length,1);
  assert.equal(h.calls[0][2].length,200);
  logout(h);
  first.resolve('imported');
  await running;
  assert.equal(h.calls.filter(([name])=>name==='importAreas').length,1);
  assert.equal(h.messages.length,0);
});
test('P6-02 existing Admin high-impact RPC and G33 logout boundaries stay owned by core',()=>{
  assert.match(source,/function adminCurrent\(ctx\)/);
  assert.match(source,/gs\('repairInstallation',ctx.token\)/);
  assert.match(source,/gs\('archiveAuditLogs',ctx.token\)/);
  assert.match(source,/gs\('importAreas',ctx.token,mapped.slice\(i,i\+200\)\)/);
  assert.doesNotMatch(source,/autoRepair|autoArchive/);
});

test('R-07 Admin load uses only Boolean configuration metadata and never maps stored or legacy secrets',async()=>{
  for(const [isConfigured,status] of [[true,/ตั้งค่าแล้ว/],[false,/ยังไม่ได้ตั้งค่า/],[undefined,/ไม่สามารถยืนยัน/],['true',/ไม่สามารถยืนยัน/]]){
    const h=fixture();signIn(h);
    vm.runInContext('settings={GEMINI_API_KEY:"SYNTHETIC_CACHED_SECRET"}',h.context);
    h.context.gs=()=>Promise.resolve([
      {key:'APP_NAME',value:'Synthetic name'},
      {key:'GEMINI_API_KEY',value:'SYNTHETIC_LEGACY_RAW_SECRET',isConfigured}
    ]);
    await vm.runInContext('loadSettings()',h.context);
    assert.equal(h.el('set_GEMINI_API_KEY').value,'');
    assert.match(h.el('set_GEMINI_API_KEY').placeholder,status);
    assert.equal(vm.runInContext('Object.hasOwn(settings,"GEMINI_API_KEY")',h.context),false);
    assert.doesNotMatch(vm.runInContext('JSON.stringify(settings)',h.context),/SYNTHETIC.*SECRET/);
    assert.equal(h.el('set_APP_NAME').value,'Synthetic name');
    assert.equal(h.messages.length,0);
  }
});

test('R-07 private reset removes secret input, configured hint and any legacy cached secret',async()=>{
  const h=fixture();signIn(h);
  h.context.gs=()=>Promise.resolve([{key:'GEMINI_API_KEY',value:'',isConfigured:true}]);
  await vm.runInContext('loadSettings()',h.context);
  h.el('set_GEMINI_API_KEY').value='SYNTHETIC_TYPED_SECRET';
  vm.runInContext('settings.GEMINI_API_KEY="SYNTHETIC_CACHED_SECRET"',h.context);
  logout(h);
  assert.equal(h.el('set_GEMINI_API_KEY').value,'');
  assert.equal(h.el('set_GEMINI_API_KEY').placeholder,'');
  assert.equal(vm.runInContext('Object.hasOwn(settings,"GEMINI_API_KEY")',h.context),false);
});

test('R-07 stale settings responses cannot restore configuration hints or overwrite the new session draft',async()=>{
  for(const changeSession of [false,true]){
    const h=fixture();signIn(h);
    const old=deferred();let requests=0;
    h.context.gs=()=>++requests===1?old.promise:Promise.resolve([{key:'GEMINI_API_KEY',value:'',isConfigured:false}]);
    const pending=vm.runInContext('loadSettings()',h.context);
    if(changeSession){logout(h);signIn(h,'Manager','B')}
    await vm.runInContext('loadSettings()',h.context);
    h.el('set_GEMINI_API_KEY').value='SYNTHETIC_NEW_SESSION_DRAFT';
    old.resolve([{key:'GEMINI_API_KEY',value:'SYNTHETIC_OLD_RESPONSE',isConfigured:true}]);
    await pending;
    assert.equal(h.el('set_GEMINI_API_KEY').value,'SYNTHETIC_NEW_SESSION_DRAFT');
    assert.match(h.el('set_GEMINI_API_KEY').placeholder,/ยังไม่ได้ตั้งค่า/);
    assert.equal(vm.runInContext('Object.hasOwn(settings,"GEMINI_API_KEY")',h.context),false);
    assert.equal(h.messages.length,0);
  }
});
