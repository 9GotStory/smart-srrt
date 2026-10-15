// UX-R1/P8-02 — null Admin RPC payloads fail closed; Date-valued sheet cells are RPC-safe.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readOrderedClientScripts} from './helpers/native-client.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

function fixture(){
  const nodes=new Map(),notifications=[],calls=[];
  function el(id){
    if(!nodes.has(id)){
      const classes=new Set(),attrs=new Map();
      nodes.set(id,{
        id,value:'',textContent:'',innerHTML:'',disabled:false,hidden:false,files:[],
        style:{display:''},dataset:{},options:[],
        classList:{
          add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),
          toggle(k,on){if(on)classes.add(k);else classes.delete(k)}
        },
        setAttribute(k,v){attrs.set(k,v)},getAttribute(k){return attrs.get(k)||''},
        removeAttribute(k){attrs.delete(k)},focus(){}
      });
    }
    return nodes.get(id);
  }
  const context=vm.createContext({
    document:{readyState:'loading',getElementById:el,addEventListener(){},querySelectorAll(){return[]},querySelector(){return null}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},
    google:{script:{run:{}}},console,setTimeout(){},clearTimeout(){},confirm:()=>false
  });
  for(const {path,code} of readOrderedClientScripts()){
    new vm.Script(path==='src/web/04-browser-app.html'
      ?code.replace(/^\s*boot\(\);\s*$/m,''):code,{filename:path})
      .runInContext(context,{timeout:2500});
  }
  context.gs=(...args)=>{calls.push(args);return Promise.resolve(null)};
  context.toast=value=>notifications.push(String(value));
  vm.runInContext('token="synthetic-session";currentUser={role:"Manager",name:"Tester"}',context);
  return {context,el,notifications,calls};
}

test('P8-02 all six null Admin list endpoints report contract failure without changing caches',async()=>{
  const h=fixture();
  const endpoints=[
    ['loadSettings','getSystemSettings'],
    ['loadAreasAdmin','listAreas'],
    ['loadUsers','listUsers'],
    ['loadMasterDataAdmin','getMasterDataAdmin'],
    ['loadContentAdmin','listContent'],
    ['loadAudit','listAuditLogs']
  ];
  for(const [loader,rpc] of endpoints){
    await vm.runInContext(loader+'()',h.context);
    assert.equal(h.calls.at(-1)[0],rpc);
  }
  assert.equal(h.notifications.length,endpoints.length);
  assert.ok(h.notifications.every(msg=>!(/(?:forEach|\.map|undefined|TypeError)/i.test(msg))));
  assert.ok(h.notifications.every(msg=>/Server|Apps Script Executions/.test(msg)));
  for(const id of ['userBody','areaBody','masterDataBody','contentAdminList','auditBody'])
    assert.equal(h.el(id).innerHTML,'',id);
  assert.equal(vm.runInContext('Array.isArray(usersCache)',h.context),true);
  assert.equal(vm.runInContext('Array.isArray(areaAdminCache)',h.context),true);
  assert.equal(vm.runInContext('Array.isArray(masterAdminCache)',h.context),true);
  assert.equal(vm.runInContext('Array.isArray(masterTypePolicies)',h.context),true);
});

test('P8-02 valid empty array returns empty state rather than an error',async()=>{
  const h=fixture();
  h.context.gs=(name)=>Promise.resolve(name==='getMasterDataAdmin'?{items:[],types:[]}:[]);
  for(const loader of ['loadSettings','loadAreasAdmin','loadUsers',
    'loadMasterDataAdmin','loadContentAdmin','loadAudit']){
    await vm.runInContext(loader+'()',h.context);
  }
  assert.equal(h.notifications.length,0);
  assert.match(h.el('userBody').innerHTML,/ไม่มีข้อมูล/);
  assert.match(h.el('areaBody').innerHTML,/ยังไม่มีข้อมูลพื้นที่/);
  assert.match(h.el('masterDataBody').innerHTML,/ไม่พบข้อมูลมาตรฐาน/);
  assert.match(h.el('contentAdminList').innerHTML,/ยังไม่มีข้อมูล/);
  assert.match(h.el('auditBody').innerHTML,/ไม่มีข้อมูล/);
});

test('P8-02 invalid RPC does not overwrite a previously valid User cache',async()=>{
  const h=fixture();
  h.context.gs=()=>Promise.resolve([{userId:'SYN-1',name:'Synthetic Tester',email:'test@example.invalid',role:'Manager'}]);
  await vm.runInContext('loadUsers()',h.context);
  assert.match(h.el('userBody').innerHTML,/Synthetic Tester/);
  h.context.gs=()=>Promise.resolve(null);
  await vm.runInContext('loadUsers()',h.context);
  assert.match(h.el('userBody').innerHTML,/Synthetic Tester/);
  assert.equal(vm.runInContext('usersCache.length',h.context),1);
  vm.runInContext('currentUser=null;token="";resetAdminPrivate()',h.context);
  assert.equal(vm.runInContext('usersCache.length',h.context),0);
  assert.equal(h.el('userBody').innerHTML,'');
});

test('P8-02 Spreadsheet Date fields in Admin DTOs are serialized to ISO strings',()=>{
  const userCreated=new Date('2026-10-15T09:00:00.000Z');
  const lastLogin=new Date('2026-10-16T04:20:00.000Z');
  const areaUpdated=new Date('2026-10-14T08:30:00.000Z');
  const config={SHEETS:{USERS:'UserAccounts',AREAS:'AreaMaster',SETTINGS:'SystemSettings',CONTENT:'Content'}};
  const fake={
    UserAccounts:[[ 'id','name'],['U-1','Synthetic User','user@example.invalid','SECRET_HASH','Manager','active','Unit','','','',userCreated,'','',''+'' ]],
    AreaMaster:[['id','province'],['A-1','แพร่','สอง','บ้านกลาง',1,'หมู่บ้าน',5406,true,areaUpdated,'owner']],
    SystemSettings:[['key','value'],['APP_NAME','Smart SRRT','',areaUpdated,'test']],
    Content:[['id','category'],['C-1','news','Title','Content','https://example.invalid/','','published',1]]
  };
  fake.UserAccounts[1][13]=lastLogin;
  const scope=vm.createContext({
    CONFIG:config,
    requireAuth_(){return {role:'Manager'}},
    getSheet_(name){
      return {getDataRange(){return {getValues(){return fake[name]}}}};
    },
    console
  });
  new vm.Script(read('src/server/04-admin-and-audit.gs')).runInContext(scope,{timeout:2500});
  new vm.Script(read('src/server/03-events-and-dashboard.gs')).runInContext(scope,{timeout:2500});
  const user=vm.runInContext('listUsers("synthetic","")',scope)[0];
  const area=vm.runInContext('listAreas("synthetic","")',scope)[0];
  const setting=vm.runInContext('getSystemSettings("synthetic")',scope)[0];
  const content=vm.runInContext('listContent("synthetic")',scope)[0];
  assert.equal(user.created,userCreated.toISOString());
  assert.equal(user.lastLogin,lastLogin.toISOString());
  assert.equal(area.updatedAt,areaUpdated.toISOString());
  assert.equal(setting.updatedAt,areaUpdated.toISOString());
  assert.equal(content.title,'Title');
  assert.equal('passwordHash' in user,false);
  assert.equal(JSON.stringify(user).includes('SECRET_HASH'),false);
  assert.equal(JSON.stringify({user,area,setting,content}).includes('[object Date]'),false);
});

test('P8-02 raw Date objects and invalid DTO types cannot leak from new helper',()=>{
  const scope=vm.createContext({});
  new vm.Script(read('src/server/04-admin-and-audit.gs')).runInContext(scope);
  assert.equal(vm.runInContext('adminRpcSafeRows_([{x:4,flag:false,date:null}])[0].date',scope),'');
  assert.throws(()=>vm.runInContext('adminRpcSafeRows_([{unserializable:{nested:1}}])',scope),/ชนิดข้อมูล/);
  const app=read('src/web/04-browser-app.html');
  assert.match(app,/function requireAdminRows_/);
  assert.match(app,/usersCache=requireAdminRows_/);
  assert.match(app,/areaAdminCache=requireAdminRows_/);
  assert.match(app,/masterTypePolicies=policies/);
});
