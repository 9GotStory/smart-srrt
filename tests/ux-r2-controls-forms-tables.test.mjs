import {nativeHtml,nativeClientSource} from './helpers/native-current.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=read('src/web/02-app-layout.html');
const dialogs=read('src/web/03-modals.html');
const app=nativeClientSource;
const css=read('src/styles/shared-ui.css');
const built=nativeHtml;

test('R2-02B labels all 26 existing incident fields without rewriting their controls',()=>{
  const start=app.indexOf('const fields=[');
  const end=app.indexOf('];',start);
  assert.ok(start>=0 && end>start,'canonical fields[] must exist');
  const values=[...app.slice(start,end).matchAll(/\[\s*(\d+)\s*,/g)].map(x=>Number(x[1]));
  assert.equal(values.length,26,'original incident field count changed');
  assert.equal(new Set(values).size,26,'duplicate incident field key');
  assert.ok(app.includes('<label for="${id}">${escapeHtml(f[1])}</label>${input}'),
    'all dynamic labels must point to existing inN input IDs');
  assert.ok(app.includes("id='in'+f[0]"),'field input naming must remain stable');
  assert.ok(app.includes('refreshRecordAreaOptions()'),'area cascade must remain');
});

test('R2-02B preserves 7 data tables and adds semantic keyboard scroll regions',()=>{
  assert.equal((layout.match(/<table\b/g)||[]).length,7,'unexpected new/removal of table');
  assert.equal((layout.match(/class="table-wrap" role="region" tabindex="0" aria-label=/g)||[]).length,7);
  const ids=['eventBody','recordBody','reportBody','masterDataBody','areaBody','userBody','auditBody'];
  for(const id of ids){
    const before=layout.slice(0,layout.indexOf('<tbody id="'+id+'"'));
    assert.ok(before.includes('role="region" tabindex="0" aria-label='),id+' missing region');
    assert.match(layout,new RegExp('<tbody id="'+id+'"'));
  }
});

test('R2-02B labels Dashboard filters, Admin controls and existing login fields',()=>{
  const controls=['startDate','endDate','filterProvince','filterAmphoe','filterTambon','filterVillage','areaSearch','userSearch','logoFile','areaImportFile'];
  for(const id of controls){
    assert.match(layout,new RegExp('id="'+id+'" aria-label="[^"]+"'));
  }
  const adminIds=['set_APP_NAME','set_APP_SUBTITLE','set_ORG_NAME','set_CONTACT_INFO','set_BANNER_TEXT','set_PRIMARY_COLOR','set_SECONDARY_COLOR','set_SYSTEM_STATUS','set_ALLOW_SELF_REGISTER','set_GEMINI_API_KEY','set_GEMINI_MODEL','set_TEMPLATE_DOC_ID','set_REPORT_FOLDER_ID','masterTypeFilter','masterSearch'];
  for(const id of adminIds)assert.ok(layout.includes('<label for="'+id+'">'),'missing static Admin label for '+id);
  for(const id of ['loginEmail','loginPassword','regName','regEmail','regPass','regOrg','ownerUserId']){
    assert.match(dialogs,new RegExp('<label class="srrt-field-label" for="'+id+'">'));
    assert.ok(dialogs.includes('id="'+id+'"'),'existing form input missing: '+id);
  }
  assert.ok(!layout.includes('required="true"'),'must not change mandatory field policy');
});

test('R2-02B shared control CSS keeps explicit focus, adaptive action group and table scroll',()=>{
  for(const selector of ['.btn:hover:not(:disabled)','.srrt-action-group','.table-wrap[role="region"]','.form-grid>.fg','.srrt-field-label','@media(max-width:560px)']){
    assert.ok(css.includes(selector), 'missing shared CSS: '+selector);
  }
  assert.ok(layout.includes('class="srrt-action-group"'));
  assert.ok(built.includes(layout),'One-Click HTML must contain exact layout');
  assert.ok(built.includes(dialogs),'One-Click HTML must contain exact modal markup');
  for(const file of ['03b-client-core.html','03c-client-auth.html','04-browser-app.html']){
    assert.ok(built.includes(read('src/web/'+file)),'Native HTML must include '+file);
  }
  assert.ok(built.includes('UX-R2-02B'),'One-Click HTML must contain compiled shared CSS');
});

test('R2-02B protects public capture, private exports and one-action reporter IDs',()=>{
  for(const action of ['onclick="captureDashboard()"','onclick="exportClientExcel()"','onclick="exportServerFile(\'xlsx\')"']){
    assert.ok(layout.includes(action),'existing Dashboard action disappeared: '+action);
  }
  assert.ok(layout.includes('id="publicAggregateNotice"'));
  assert.ok(layout.includes('id="eventDetailPanel"'));
  assert.ok(layout.includes('id="reportBody"'));
  assert.ok(app.includes('function roleCanRecord()'));
});
