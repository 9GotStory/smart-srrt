import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE_PATH = new URL('../Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', import.meta.url);
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

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
  getValue(){return this.getValues()[0][0]}
  setValues(values){
    this._ensure();
    for(let ri=0;ri<this.numRows;ri++)for(let ci=0;ci<this.numCols;ci++)this.sheet.rows[this.row-1+ri][this.col-1+ci]=values[ri][ci];
    return this;
  }
}
class FakeSheet {
  constructor(rows=[],maxCols=11){
    this.maxCols=maxCols;
    this.rows=rows.map(r=>{const x=[...r];while(x.length<maxCols)x.push('');return x});
  }
  getMaxColumns(){return this.maxCols}
  insertColumnsAfter(_after,count){this.maxCols+=count;for(const r of this.rows)while(r.length<this.maxCols)r.push('')}
  getLastRow(){return this.rows.length}
  getRange(row,col,numRows=1,numCols=1){return new FakeRange(this,row,col,numRows,numCols)}
  appendRow(row){const x=[...row];this.maxCols=Math.max(this.maxCols,x.length);while(x.length<this.maxCols)x.push('');this.rows.push(x);return this}
}
class FakeSpreadsheet {
  constructor(sheet=null){this.sheet=sheet}
  getSheetByName(){return this.sheet}
  insertSheet(){this.sheet=new FakeSheet([],26);return this.sheet}
}

function makeContext(){
  const context={
    console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,isFinite,
    Logger:{log(){}},
    Utilities:{
      getUuid:()=> '77777777-7777-4777-8777-777777777777',
      sleep(){}
    }
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context;
}

function fnBlock(name){
  const re=new RegExp('function\\s+'+name.replace(/[$]/g,'\\$&')+'\\s*\\(');
  const m=re.exec(source); if(!m)return '';
  const start=m.index;
  const next=source.slice(start+1).search(/\nfunction\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start,next>=0?start+1+next:source.length);
}

test('G-17 schema v7 defines append-only ReportRegistry contract',()=>{
  const ctx=makeContext();
  assert.equal(ctx.CONFIG.SCHEMA_VERSION,'7');
  assert.equal(ctx.CONFIG.SHEETS.REPORTS,'ReportRegistry');
  assert.equal(ctx.CONFIG.REPORT_PROMPT_VERSION,'2026.10.06.1');
  assert.deepEqual(Array.from(ctx.REPORT_REGISTRY_HEADERS),[
    'ReportID','EventID','SourceRevision','DocumentID','DocumentURL','GeneratedAt',
    'GeneratedBy','GeminiModels','GeminiApiVersions','PromptVersion','TemplateDocID'
  ]);
  assert.equal(ctx.REPORT_REGISTRY_HEADERS.length,11);
});

test('ReportRegistry sheet creation is idempotent and conflict-aware',()=>{
  const ctx=makeContext();
  const header=Array.from(ctx.REPORT_REGISTRY_HEADERS);
  const sheet=new FakeSheet([header],11);
  const ss=new FakeSpreadsheet(sheet);

  const first=ctx.ensureReportRegistrySheet_(ss);
  assert.equal(first.rows,0);
  assert.deepEqual(sheet.rows[0].slice(0,11),header);

  const second=ctx.ensureReportRegistrySheet_(ss);
  assert.equal(second.rows,0);

  const bad=[...header];bad[3]='CustomDocument';
  const conflict=new FakeSheet([bad,['x']],11);
  assert.throws(()=>ctx.ensureReportRegistrySheet_(new FakeSpreadsheet(conflict)),/ใช้หัวข้อ/);

  const blank=[...header];blank[4]='';
  const hidden=Array(11).fill('');hidden[4]='https://example.test/doc';
  const hiddenSheet=new FakeSheet([blank,hidden],11);
  assert.throws(()=>ctx.ensureReportRegistrySheet_(new FakeSpreadsheet(hiddenSheet)),/มีข้อมูลเดิม/);
});

test('appendReportRegistry writes the complete immutable evidence row',()=>{
  const ctx=makeContext();
  const sheet=new FakeSheet([Array.from(ctx.REPORT_REGISTRY_HEADERS)],11);
  ctx.getDb_=()=>({});
  ctx.ensureReportRegistrySheet_=()=>({sheet,rows:0});

  const when=new Date('2026-10-06T12:00:00Z');
  const reportId=ctx.appendReportRegistry_({
    reportId:'77777777-7777-4777-8777-777777777777',
    eventId:'11111111-1111-4111-8111-111111111111',
    sourceRevision:8,
    documentId:'doc-123',
    documentUrl:'https://docs.google.com/document/d/doc-123/edit',
    generatedAt:when,
    generatedBy:'manager@example.test',
    geminiModels:'models/gemini-a | models/gemini-b',
    geminiApiVersions:'v1beta | v1',
    promptVersion:'2026.10.06.1',
    templateDocId:'template-1'
  });

  assert.equal(reportId,'77777777-7777-4777-8777-777777777777');
  assert.equal(sheet.rows.length,2);
  assert.deepEqual(sheet.rows[1].slice(0,11),[
    '77777777-7777-4777-8777-777777777777',
    '11111111-1111-4111-8111-111111111111',
    8,
    'doc-123',
    'https://docs.google.com/document/d/doc-123/edit',
    when,
    'manager@example.test',
    'models/gemini-a | models/gemini-b',
    'v1beta | v1',
    '2026.10.06.1',
    'template-1'
  ]);
});

test('G-32 V8 bounded 503 retry fails without cross-model fallback or phantom metadata',()=>{
  const ctx=makeContext();
  const meta={models:[],apiVersions:[]};
  let calls=0;
  ctx.UrlFetchApp={fetch(url){
    calls++;
    assert.match(url,/\/models\/gemini-3\.8-flash:generateContent/);
    return {getResponseCode:()=>503,getContentText:()=>JSON.stringify({error:{message:'temporary'}})};
  }};
  assert.throws(()=>ctx.callGeminiForReport_('mock-key',
    {modelName:'models/gemini-3.8-flash',apiVersion:'v1'},'prompt','test',meta),/503/);
  assert.equal(calls,2,'one retry on the pinned model, no further model fallback');
  assert.deepEqual(meta.models,[]);
  assert.deepEqual(meta.apiVersions,[]);
});

function setupGenerationContext({registryFails=false}={}){
  const ctx=makeContext();
  const row=Array(38).fill('');
  row[1]='06/10/2569';
  row[5]='ไข้เลือดออก';
  row[7]='หมู่บ้านทดสอบ';
  row[28]='ทดสอบ';
  row[29]='54060001';

  const main={
    getRange(_row,col,_numRows,numCols){
      if(col===ctx.EVENT_META_COL.REVISION){
        return {getValue:()=>9};
      }
      if(col===1 && numCols===ctx.MAIN_SCHEMA_HEADERS.length){
        return {getDisplayValues:()=>[row]};
      }
      throw new Error('unexpected range '+col);
    }
  };

  let trashed=false;
  const file={
    getId:()=> 'doc-created',
    getUrl:()=> 'https://docs.google.com/document/d/doc-created/edit',
    setTrashed:v=>{trashed=!!v}
  };
  const body={replaceText(){}};
  const doc={getBody:()=>body,saveAndClose(){}};
  let registryRecord=null;
  const audits=[];

  ctx.requireAuth_=()=>({email:'manager@example.test',role:'Manager',status:'active'});
  ctx.getSheetByIdOrName_=()=>main;
  ctx.getSettingsMap_=()=>({TEMPLATE_DOC_ID:'template-doc',REPORT_FOLDER_ID:'report-folder'});
  ctx.findEventRowById_=()=>2;
  ctx.analyzeWithGemini_=(_row,_location,_settings,meta)=>{
    meta.models.push('models/gemini-actual');
    meta.apiVersions.push('v1beta');
    return 'ผลวิเคราะห์';
  };
  ctx.replacePlaceholderWithParagraphs_=()=>{};
  ctx.DriveApp={
    getFileById:id=>{
      assert.equal(id,'template-doc');
      return {makeCopy:()=>file};
    },
    getFolderById:id=>({id})
  };
  ctx.DocumentApp={openById:id=>{assert.equal(id,'doc-created');return doc}};
  ctx.appendReportRegistry_=record=>{
    registryRecord=record;
    if(registryFails)throw new Error('registry failed');
    return record.reportId;
  };
  ctx.writeAudit_=(...args)=>audits.push(args);

  // G-32 private job execution gate is mocked only for G-17 registry-contract tests.
  ctx.withReportJobLock_=(fn)=>fn({});
  ctx.reportJobOwned_=()=>({eventId:'11111111-1111-4111-8111-111111111111',status:'running',executionNonce:'fixture-nonce'});
  ctx.reportJobCheckpoint_=()=>{};
  return {ctx,get registryRecord(){return registryRecord},audits,get trashed(){return trashed}};
}

test('generateReportFromWeb registers EventID, source Revision, actual model metadata and prompt version',()=>{
  const env=setupGenerationContext();
  const url=env.ctx.generateReportFromWeb(
    'token',
    '11111111-1111-4111-8111-111111111111',
    'fixture-job','fixture-nonce'
  );

  assert.equal(url,'https://docs.google.com/document/d/doc-created/edit');
  assert.equal(env.registryRecord.eventId,'11111111-1111-4111-8111-111111111111');
  assert.equal(env.registryRecord.sourceRevision,9);
  assert.equal(env.registryRecord.documentId,'doc-created');
  assert.equal(env.registryRecord.generatedBy,'manager@example.test');
  assert.equal(env.registryRecord.geminiModels,'models/gemini-actual');
  assert.equal(env.registryRecord.geminiApiVersions,'v1beta');
  assert.equal(env.registryRecord.promptVersion,'2026.10.06.1');
  assert.equal(env.registryRecord.templateDocId,'template-doc');
  assert.equal(env.trashed,false);

  assert.equal(env.audits.length,1);
  assert.equal(env.audits[0][1],'GENERATE_REPORT');
  assert.equal(env.audits[0][2],'ReportRegistry');
  assert.equal(env.audits[0][3],'77777777-7777-4777-8777-777777777777');
});

test('registry failure compensates by trashing the newly created Doc and emits no success audit',()=>{
  const env=setupGenerationContext({registryFails:true});

  assert.throws(
    ()=>env.ctx.generateReportFromWeb('token','11111111-1111-4111-8111-111111111111','fixture-job','fixture-nonce'),
    /registry failed/
  );
  assert.equal(env.trashed,true);
  assert.equal(env.audits.length,0);
});

test('report generation does not mutate Event Revision merely for generating a report',()=>{
  const block=fnBlock('generateReportFromWeb');
  assert.match(block,/EVENT_META_COL\.REVISION\)\.getValue\(\)/);
  assert.doesNotMatch(block,/EVENT_META_COL\.REVISION\)\.setValue/);
});

test('G-17 remains append-only and defers Event-facing report UI to later work',()=>{
  assert.doesNotMatch(source,/function\s+(?:delete|remove|update)ReportRegistry/);
  assert.doesNotMatch(source,/function\s+listEventReports/);
  assert.doesNotMatch(source,/reportCount|latestReportUrl/);
});

test('G-17 migration advances only to schema floor 7 while G-29 remains floor 6',()=>{
  const g17=fnBlock('migrateG17ReportRegistry');
  const g29=fnBlock('migrateG29VisitLogs');

  assert.match(g17,/Math\.max\(existingSchemaVersion, 7\)/);
  assert.match(g29,/Math\.max\(existingSchemaVersion, 6\)/);
  assert.doesNotMatch(g29,/Math\.max\(existingSchemaVersion, 7\)/);
});
