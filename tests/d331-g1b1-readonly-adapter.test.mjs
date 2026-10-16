import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const A = fs.readFileSync(new URL('../src/dengue/00-g1a-foundation.gs',import.meta.url),'utf8');
const B = fs.readFileSync(new URL('../src/dengue/01-g1b1-readonly-adapter.gs',import.meta.url),'utf8');
const MANIFEST = fs.readFileSync(new URL('../tools/native-sources.mjs',import.meta.url),'utf8');
const U='11111111-1111-4111-8111-111111111111';
const V='22222222-2222-4222-8222-222222222222';

function api() {
  const context=vm.createContext({});
  vm.runInContext(A+'\n'+B,context,{filename:'d331-g1b1-synthetic'});
  return context;
}
function snapshot(a) {
  const tables=Object.fromEntries(Object.entries(a.D331_G1A_SCHEMAS).map(([k,v])=>[k,{
    headers:[...v],rowCount:0
  }]));
  return {moduleSchemaVersion:1,tables};
}
function reader(data,tracker={}) {
  return {
    listTableNames() {
      tracker.list=(tracker.list||0)+1;
      return ['MainData','UserAccounts',...Object.keys(data.tables)];
    },
    readModuleVersion() {tracker.version=(tracker.version||0)+1;return data.moduleSchemaVersion;},
    readTableHeaders(name) {
      (tracker.headers??=[]).push(name);
      if (!Object.hasOwn(data.tables,name)) throw new Error('attempted PII read');
      return data.tables[name].headers;
    },
    readTableRowCount(name) {
      (tracker.counts??=[]).push(name);
      return data.tables[name].rowCount;
    }
  };
}
function mainRow(overrides={}) {
  const row=Array.from({length:39},(_,i)=>i<30?'PRIVATE-EVENT-DATA':'');
  row[30]=U;row[31]=1;row[32]='active';row[38]='owner-1';
  for(const [k,v] of Object.entries(overrides)) row[Number(k)]=v;
  return row;
}

test('B1 added library is deliberately not staged in Native 24 files',()=>{
  assert.doesNotMatch(MANIFEST,/src\/dengue\/01-g1b1-readonly-adapter\.gs/);
  assert.doesNotMatch(MANIFEST,/src\/dengue\/00-g1a-foundation\.gs/);
  assert.match(MANIFEST,/src\/server\/06-gemini-and-prompts\.gs/);
});

test('offline library contains no Google Apps Script service or mutation calls',()=>{
  assert.doesNotMatch(B,/\b(?:SpreadsheetApp|PropertiesService|LockService|DriveApp|UrlFetchApp|ScriptApp|GmailApp)\s*\./);
  assert.doesNotMatch(B,/\b(?:getDb_|ensureSheet_|installSmartSRRT|setValues|appendRow|deleteRow|insertSheet)\s*\(/);
  assert.doesNotMatch(B,/google\.script\.run/);
});

test('preview insists on G1A dependency, but performs no top-level script work',()=>{
  const sandbox=vm.createContext({});
  vm.runInContext(B,sandbox);
  assert.equal(sandbox.D331_B1_PREVIEW_VERSION,1);
  assert.throws(()=>sandbox.d331B1PreviewSchema_({moduleSchemaVersion:1,tables:{}}),/D331_B1_CONTRACTS_MISSING/);
});

test('seven provisional G1A candidate table schemas match but never approve apply',()=>{
  const a=api();
  const result=a.d331B1PreviewSchema_(snapshot(a));
  assert.equal(result.summary.expectedTables,7);
  assert.equal(result.summary.presentTables,7);
  assert.equal(result.summary.matchingTables,7);
  assert.equal(result.summary.observedDataRows,0);
  assert.equal(result.candidateHeadersMatch,true);
  assert.equal(result.status,'HOLD');
  assert.equal(result.canApply,false);
  assert.equal(result.canEnable,false);
  assert.equal(result.inspectedDataRows,false);
  assert.equal(result.requiresOperatorApproval,true);
});

test('mock read-only reader sees only known table headers and row counts',()=>{
  const a=api(), data=snapshot(a), calls={};
  data.tables.DengueCases.rowCount=6;
  const result=a.d331B1PreviewFromReader_(reader(data,calls));
  assert.equal(result.summary.observedDataRows,6);
  assert.equal(calls.list,1);
  assert.equal(calls.version,1);
  assert.equal(calls.headers.length,7);
  assert.equal(calls.counts.length,7);
  assert.ok(calls.headers.every(v=>Object.hasOwn(a.D331_G1A_SCHEMAS,v)));
});

test('reader cannot skip one of the four required read-only methods',()=>{
  const a=api();
  for (const broken of [{},null,{listTableNames(){}},{
    listTableNames(){return []},readModuleVersion(){return 1},
    readTableHeaders(){return []}
  }]) {
    assert.throws(()=>a.d331B1ReadSnapshot_(broken),/D331_B1_READER_REQUIRED/);
  }
});

test('underlying reader errors never leak patient or database identifiers',()=>{
  const a=api(), data=snapshot(a);
  const r=reader(data);
  r.readTableHeaders=()=>{throw new Error('PATIENT-SECRET-1234 spreadsheet-id-SECRET');};
  assert.throws(()=>a.d331B1PreviewFromReader_(r),e=>{
    assert.equal(e.message,'D331_B1_READ_FAILED');
    assert.doesNotMatch(e.message,/PATIENT|spreadsheet/);
    return true;
  });
});

test('missing table and uninitialized version create safe HOLD findings',()=>{
  const a=api(), data=snapshot(a);
  data.moduleSchemaVersion=null;
  delete data.tables.DengueFollowups;
  const result=a.d331B1PreviewSchema_(data);
  assert.equal(result.status,'HOLD');
  assert.equal(result.summary.missingTables,1);
  assert.ok(result.findings.some(f=>f.code==='MISSING_TABLE'&&f.table==='DengueFollowups'));
  assert.ok(result.findings.some(f=>f.code==='SCHEMA_VERSION_MISMATCH'));
});

test('wrong header order is rejected; result does not echo private header text',()=>{
  const a=api(), data=snapshot(a);
  data.tables.DengueCases.headers.reverse();
  data.tables.DengueCases.headers[0]='PrivatePatientName';
  const result=a.d331B1PreviewSchema_(data);
  assert.equal(result.candidateHeadersMatch,false);
  assert.ok(result.findings.some(f=>f.code==='HEADER_MISMATCH'&&f.table==='DengueCases'));
  assert.doesNotMatch(JSON.stringify(result),/PrivatePatientName/);
});

test('duplicate, blank and trailing extra candidate columns fail closed',()=>{
  const a=api();
  const dup=snapshot(a);
  dup.tables.DenguePlans.headers[1]=dup.tables.DenguePlans.headers[0];
  assert.ok(a.d331B1PreviewSchema_(dup).findings.some(f=>f.code==='DUPLICATE_HEADER'));
  const blank=snapshot(a);
  blank.tables.DenguePlans.headers[1]='';
  assert.equal(a.d331B1PreviewSchema_(blank).summary.conflictingTables,1);
  const extra=snapshot(a);
  extra.tables.DenguePlans.headers.push('Unexpected');
  assert.equal(a.d331B1PreviewSchema_(extra).summary.conflictingTables,1);
});

test('populated header conflict triggers distinct risk without reading a cell',()=>{
  const a=api(),data=snapshot(a);
  data.tables.DengueEntomology.headers[0]='PatientSecret';
  data.tables.DengueEntomology.rowCount=100;
  const r=a.d331B1PreviewSchema_(data);
  assert.ok(r.findings.some(x=>x.code==='POPULATED_CONFLICT'&&x.table==='DengueEntomology'));
  assert.equal(r.summary.observedDataRows,100);
  assert.doesNotMatch(JSON.stringify(r),/PatientSecret/);
});

test('unrelated application tables do not become Dengue tables or trigger writes',()=>{
  const a=api(),data=snapshot(a),calls={};
  const r=a.d331B1PreviewFromReader_(reader(data,calls));
  assert.equal(r.summary.expectedTables,7);
  assert.equal(r.findings.length,0);
  assert.ok(!calls.headers.includes('MainData'));
  assert.ok(!calls.headers.includes('UserAccounts'));
});

test('malformed snapshots and unsafe row counters are rejected',()=>{
  const a=api();
  for(const invalid of [null,{},[],{tables:{}},{
    moduleSchemaVersion:'1',tables:{}
  },{moduleSchemaVersion:-1,tables:{}},
  {moduleSchemaVersion:2**53,tables:{}}]) {
    assert.throws(()=>a.d331B1PreviewSchema_(invalid),/D331_B1_INVALID_SNAPSHOT/);
  }
  const huge=snapshot(a);
  huge.tables.DengueCases.rowCount=2**53;
  assert.throws(()=>a.d331B1PreviewSchema_(huge),/D331_B1_INVALID_SNAPSHOT/);
});

test('reader refuses duplicate or malformed table names without fetching rows',()=>{
  const a=api(),data=snapshot(a);
  const r=reader(data);
  r.listTableNames=()=>['DengueCases','DengueCases'];
  assert.throws(()=>a.d331B1ReadSnapshot_(r),/D331_B1_READ_FAILED/);
  r.listTableNames=()=>[''];
  assert.throws(()=>a.d331B1ReadSnapshot_(r),/D331_B1_READ_FAILED/);
});

test('reader fails closed on unsafe counts and does not return underlying errors',()=>{
  const a=api(),data=snapshot(a);
  const r=reader(data);
  r.readTableRowCount=()=>NaN;
  assert.throws(()=>a.d331B1ReadSnapshot_(r),/D331_B1_READ_FAILED/);
  r.readTableRowCount=()=>-1;
  assert.throws(()=>a.d331B1ReadSnapshot_(r),/D331_B1_READ_FAILED/);
});

test('synthetic MainData projection uses col31 ID, col32 revision, col33 status, col39 owner',()=>{
  const a=api(), row=mainRow();
  const result=a.d331B1ProjectEvent_(row);
  assert.equal(result.eventId,U);
  assert.equal(result.revision,1);
  assert.equal(result.recordStatus,'active');
  assert.equal(result.ownerUserId,'owner-1');
  assert.equal(result.areaId,null);
  assert.equal(result.eligibleDisease,false);
  assert.equal(result.authorizationReady,false);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE-EVENT-DATA/);
});

test('forged but syntactically valid AreaID proof does not authorize an event',()=>{
  const a=api();
  const result=a.d331B1ProjectEvent_(mainRow(),{
    verified:true,eventId:U,areaId:'area-1'
  });
  assert.equal(result.areaEvidenceAvailable,true);
  assert.equal(result.areaId,null);
  assert.equal(result.eligibleDisease,false);
  assert.equal(result.authorizationReady,false);
  assert.throws(()=>a.d331Authorize_({
    active:true,userId:'owner-1',capabilities:['dengue.case.read'],
    allowedAreaIds:['area-1'],allowedEventIds:[U]
  },result,'dengue.case.read',false),/D331_FORBIDDEN/);
});

test('event foreign evidence, missing evidence and void status remain closed',()=>{
  const a=api();
  const wrong=a.d331B1ProjectEvent_(mainRow(),{
    verified:true,eventId:V,areaId:'area-1'
  });
  assert.equal(wrong.areaEvidenceAvailable,false);
  assert.equal(wrong.areaId,null);
  const voided=a.d331B1ProjectEvent_(mainRow({32:'void'}));
  assert.equal(voided.recordStatus,'void');
  assert.equal(voided.authorizationReady,false);
  const closed=a.d331B1ProjectEvent_(mainRow({32:'closed'}));
  assert.equal(closed.recordStatus,'closed');
  assert.equal(closed.authorizationReady,false);
});

test('invalid ID, revision, status or undersized MainData row are refused',()=>{
  const a=api();
  for(const row of [
    [],mainRow({30:'TEST-DENGUE-001'}),mainRow({31:2**53}),
    mainRow({31:'1'}),mainRow({32:''}),
    mainRow({32:'unknown'}),mainRow({38:'  user  '}),
    mainRow({38:123})
  ]) assert.throws(()=>a.d331B1ProjectEvent_(row),/D331_B1_INVALID_EVENT/);
});

test('MainData projection never creates an authorization grant or patient DTO',()=>{
  const a=api(),row=mainRow({34:'sensitive-created-by',27:'secret-notes'});
  const result=a.d331B1ProjectEvent_(row,{verified:true,eventId:U,areaId:'a'});
  const txt=JSON.stringify(result);
  assert.doesNotMatch(txt,/sensitive|secret|PRIVATE-EVENT-DATA|patient/i);
  assert.equal(result.authorizationReady,false);
});
