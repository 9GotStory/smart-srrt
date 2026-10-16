import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const A=fs.readFileSync(new URL('../src/dengue/00-g1a-foundation.gs',import.meta.url),'utf8');
const B=fs.readFileSync(new URL('../src/dengue/03-n1b1-trusted-event-contract.gs',import.meta.url),'utf8');
const U='11111111-1111-4111-8111-111111111111';
const V='22222222-2222-4222-8222-222222222222';
function api(){
  const c=vm.createContext({});
  vm.runInContext(A+'\n'+B,c,{filename:'d331-n1b1-synthetic.gs'});
  return c;
}
function raw(){
  const r=Array.from({length:39},()=> '');
  r[5]='DENGUE_APPROVED_SYNTHETIC';
  r[9]='2'; r[10]='ตำบลตัวอย่าง'; r[11]='อำเภอตัวอย่าง'; r[12]='จังหวัดตัวอย่าง';
  r[28]='บ้านตัวอย่าง'; r[29]='SYN-0102';
  r[30]=U;r[31]=3;r[32]='active';r[38]='user-owner';
  return r;
}
function master(){
  return ['area-A','จังหวัดตัวอย่าง','อำเภอตัวอย่าง','ตำบลตัวอย่าง',
    '2','บ้านตัวอย่าง','SYN-0102',true,'',''];
}
function user(){return {userId:'user-owner',status:'active',role:'Staff',province:'FORGED'};}
function grant(){return {approved:true,userId:'user-owner',
  capabilities:['dengue.case.read','dengue.case.write'],
  allowedAreaIds:['area-A'],allowedEventIds:[]};}
const authorize=(a,extras={})=>a.d331N1bAuthorizeOffline_(
  Object.hasOwn(extras,'user') ? extras.user : user(),Object.hasOwn(extras,'row') ? extras.row : raw(),Object.hasOwn(extras,'areas') ? extras.areas : [master()],
  Object.hasOwn(extras,'grant') ? extras.grant : grant(),Object.hasOwn(extras,'diseases') ? extras.diseases : ['DENGUE_APPROVED_SYNTHETIC'],
  Object.hasOwn(extras,'cap') ? extras.cap : 'dengue.case.read',Object.hasOwn(extras,'write') ? extras.write : false,extras.rev);

test('N1-B1 is offline-only and adds no public RPC or Google services',()=>{
  const manifest=fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(manifest,/src\/dengue\/03-n1b1-trusted-event-contract\.gs/);
  assert.match(manifest,/src\/dengue\/00-g1a-foundation\.gs/);
  assert.doesNotMatch(B,/\b(?:SpreadsheetApp|DriveApp|PropertiesService|ScriptApp|LockService|UrlFetchApp|getDb_|ensureSheet_|google\.script\.run)\b/);
  const functions=[...B.matchAll(/\bfunction\s+(d331\w+)\s*\(/g)].map(m=>m[1]);
  assert.ok(functions.length>=5);
  assert.ok(functions.every(n=>n.endsWith('_')));
  assert.match(A,/var D331_G1A_ENABLED = false;/);
});
test('approved synthetic context produces only non-patient metadata',()=>{
  const a=api();const result=JSON.parse(JSON.stringify(authorize(a)));
  assert.deepEqual(result,{eventId:U,revision:3,areaId:'area-A',
    capability:'dengue.case.read',mode:'read'});
  assert.equal(result.ownerUserId,undefined);
  assert.equal(result.disease,undefined);
});
test('missing grant and guessed role never confer Dengue capability',()=>{
  const a=api();
  for(const g of [null,{}, {...grant(),approved:false},
    {...grant(),userId:'other'},{...grant(),capabilities:['view','edit']},
    {...grant(),allowedAreaIds:[]},{...grant(),allowedAreaIds:['area-B']}]) {
    assert.throws(()=>authorize(a,{grant:g}),/D331_/);
  }
});
test('revoked inactive or mismatched users fail closed',()=>{
  const a=api();
  for(const u of [null,{...user(),status:'pending'},
    {...user(),status:'disabled'},{...user(),userId:'other'},
    {...user(),userId:' user-owner'}]){
    assert.throws(()=>authorize(a,{user:u}),/D331_/);
  }
});
test('missing, unapproved or ambiguous disease keys cannot become Dengue cases',()=>{
  const a=api();
  for(const diseases of [[],['อื่นๆ'],['โรคติดต่อนำโดยแมลง'],
    ['DENGUE_APPROVED_SYNTHETIC','DENGUE_APPROVED_SYNTHETIC']]){
    assert.throws(()=>authorize(a,{diseases}),/D331_/);
  }
  const r=raw();r[5]='DENGUE_UNKNOWN';
  assert.throws(()=>authorize(a,{row:r}),/D331_DISEASE_NOT_APPROVED/);
});
test('AreaMaster identity requires exact active unique full scope',()=>{
  const a=api();
  const candidates=[
    [],[[...master().slice(0,7),false,'','']],
    [[...master().slice(0,6),'WRONG-CODE',true,'','']],
    [{...master()}],
    [master(),master()],
    [master(),['area-A','จังหวัดอื่น','อำเภออื่น','ตำบลอื่น','9','บ้านอื่น','X',true,'','']],
  ];
  for(const areas of candidates){
    assert.throws(()=>authorize(a,{areas}),/D331_AREA_UNRESOLVED/);
  }
  for(const [idx,val] of [[9,'01'],[10,'ตำบลอื่น'],[11,'อำเภออื่น'],
    [12,'จังหวัดอื่น'],[28,'บ้านอื่น'],[29,'OTHER']]){
    const r=raw();r[idx]=val;
    assert.throws(()=>authorize(a,{row:r}),/D331_AREA_UNRESOLVED/);
  }
});
test('generic AreaMaster free text and UserAccounts locale cannot grant scope',()=>{
  const a=api();
  const r=raw();r[29]='SYN-0102';
  assert.throws(()=>authorize(a,{grant:{...grant(),allowedAreaIds:['ตำบลตัวอย่าง']}}),/D331_FORBIDDEN/);
  assert.throws(()=>authorize(a,{user:{...user(),tambon:'ตำบลตัวอย่าง'},
    grant:{...grant(),allowedAreaIds:['area-B']}}),/D331_FORBIDDEN/);
});
test('EventID, revision, status and owner must come from exact MainData layout',()=>{
  const a=api();
  const mutations=[
    r=>r.pop(),r=>r[30]='not-a-uuid',r=>r[31]=0,r=>r[31]='3',
    r=>r[32]='void',r=>r[32]='',r=>r[38]=''
  ];
  for(const mutate of mutations){
    const r=raw();mutate(r);
    assert.throws(()=>authorize(a,{row:r}),/D331_/);
  }
});
test('closed parent read may be authorized, but closed/void writes never are',()=>{
  const a=api();const r=raw();r[32]='closed';
  assert.equal(authorize(a,{row:r}).mode,'read');
  assert.throws(()=>authorize(a,{row:r,write:true,cap:'dengue.case.write',rev:3}),/D331_FORBIDDEN/);
  r[32]='void';
  assert.throws(()=>authorize(a,{row:r}),/D331_EVENT_UNRESOLVED/);
});
test('write requires exact revision and explicit write capability',()=>{
  const a=api();
  assert.equal(authorize(a,{write:true,cap:'dengue.case.write',rev:3}).mode,'write');
  for(const rev of [undefined,2,4,'3',0]){
    assert.throws(()=>authorize(a,{write:true,cap:'dengue.case.write',rev}),/D331_/);
  }
  assert.throws(()=>authorize(a,{write:true,cap:'dengue.case.read',rev:3}),/D331_FORBIDDEN/);
  assert.throws(()=>authorize(a,{cap:'dengue.case.write'}),/D331_FORBIDDEN/);
});
test('event owner or explicit event scope still requires the correct AreaID and capability',()=>{
  const a=api();
  const r=raw();r[38]='other-owner';
  assert.throws(()=>authorize(a,{row:r}),/D331_FORBIDDEN/);
  assert.equal(authorize(a,{row:r,grant:{...grant(),allowedEventIds:[U]}}).mode,'read');
  assert.throws(()=>authorize(a,{row:r,grant:{...grant(),allowedEventIds:[V]}}),/D331_FORBIDDEN/);
  assert.throws(()=>authorize(a,{row:r,grant:{...grant(),allowedEventIds:[U],allowedAreaIds:['other-area']}}),/D331_FORBIDDEN/);
});
