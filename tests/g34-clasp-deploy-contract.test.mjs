import {expectedNativeFiles} from '../tools/native-release-inspection.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(ROOT, 'tools', 'deploy-g34-clasp.sh');
const source = fs.readFileSync(scriptPath, 'utf8');

test('G-34 operator clasp script parses as Bash and contains no embedded project IDs', () => {
  const result = spawnSync('bash', ['-n', scriptPath], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.ok(source.startsWith('#!/usr/bin/env bash\n'));
  assert.doesNotMatch(source, /AKfycb[A-Za-z0-9_-]{15,}/);
  assert.doesNotMatch(source, /(?:gh[opsu]_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{35})/);
});

test('G-34 clasp deployment is explicitly gated and keeps manifest and existing deployment ID', () => {
  assert.match(source, /SMART_SRRT_APPROVED_SOURCE_SHA/);
  assert.match(source, /SMART_SRRT_CONFIRM_DEPLOY/);
  assert.match(source, /git rev-parse origin\/main/);
  assert.match(source, /--preflight/);
  assert.match(source, /--deploy/);
  assert.match(source, /clasp 3\.x/);
  assert.match(source, /"\$CLASP" pull/);
  assert.match(source, /"\$CLASP" push/);
  assert.match(source, /"\$CLASP" update-deployment "\$DEPLOYMENT_ID"/);
  assert.doesNotMatch(source, /"\$CLASP" create-deployment/);
  assert.match(source, /fs\.readFileSync\(oldManifest\)/);
  assert.match(source, /filePushOrder/);
  assert.match(source, /BACKUP_ROOT/);
  assert.match(source, /REMOTE_MANIFEST_V8=PASS/);
});

test('G-34 script fails closed before any network operation without explicitly approved SHA and IDs', () => {
  const env = {...process.env, SMART_SRRT_APPROVED_SOURCE_SHA:'', SMART_SRRT_SCRIPT_ID:'', SMART_SRRT_DEPLOYMENT_ID:''};
  const run = spawnSync('bash', [scriptPath, '--deploy'], {cwd:ROOT, env, encoding:'utf8'});
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /STOP: Set SMART_SRRT_APPROVED_SOURCE_SHA/);
});


const legacyBackupCheck = source.match(/node - "\$WORK\/remote" <<'NODE'\n([\s\S]*?)\nNODE/);
test('G-34 legacy backup gate accepts exactly one Code.gs or Thai รหัส.gs and checks entrypoints', () => {
  assert.ok(legacyBackupCheck, 'Missing inline backup-validation code');
  function runFixture(serverName, code, options={}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g34-clasp-layout-'));
    try {
      fs.writeFileSync(path.join(root, 'appsscript.json'),
        JSON.stringify({runtimeVersion:options.v8===false?'DEPRECATED_ES5':'V8'}));
      fs.writeFileSync(path.join(root, 'Index.html'), '<html></html>');
      fs.writeFileSync(path.join(root, serverName), code);
      if (options.extra) fs.writeFileSync(path.join(root, options.extra), 'function unrelated() {}');
      return spawnSync(process.execPath, ['-', root], {input:legacyBackupCheck[1], encoding:'utf8'});
    } finally {
      fs.rmSync(root, {recursive:true, force:true});
    }
  }
  const expectedCode = 'function doGet(e) {}\nfunction include(filename) {}\n';
  for (const legacyName of ['Code.gs', 'รหัส.gs']) {
    const run=runFixture(legacyName,expectedCode);
    assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout, /BACKED_UP_LEGACY_LAYOUT=PASS/);
    assert.ok(run.stdout.includes('LEGACY_SERVER_FILE='+legacyName));
  }
  const unknown=runFixture('main.gs',expectedCode);
  assert.notEqual(unknown.status,0,'Unknown server name must fail');
  assert.match(unknown.stderr,/Expected Index\.html with exactly one legacy/);
  const duplicate=runFixture('รหัส.gs',expectedCode,{extra:'Code.gs'});
  assert.notEqual(duplicate.status,0,'Duplicate server files must fail');
  const unknownExtra=runFixture('Code.gs',expectedCode,{extra:'extra.html'});
  assert.notEqual(unknownExtra.status,0,'Unknown HTML file must fail');
  const wrongCode=runFixture('รหัส.gs','function unrelated() {}');
  assert.notEqual(wrongCode.status,0,'Wrong source shape must fail');
  assert.match(wrongCode.stderr,/expected doGet\/include entrypoints/);
  const oldRuntime=runFixture('รหัส.gs',expectedCode,{v8:false});
  assert.notEqual(oldRuntime.status,0,'Non-V8 runtime must fail');
});

test('G-34 future clasp stage allowlist matches canonical Native manifest (14 + preserved appsscript.json)',()=>{
  const match=source.match(/const expected = \[([\s\S]*?)\]\.sort\(\);/);
  assert.ok(match,'Guarded clasp stage allowlist missing');
  const names=[...match[1].matchAll(/'([^']+\.(?:gs|html|json))'/g)].map(x=>x[1]).sort();
  assert.deepEqual(names,[...expectedNativeFiles(),'appsscript.json'].sort(),
    'Clasp allowlist drifted from approved canonical Native manifest');
  assert.match(source,/REMOTE_MANIFEST_V8=PASS/);
  assert.match(source,/fs\.readFileSync\(oldManifest\)/);
  assert.match(source,/SMART_SRRT_CONFIRM_DEPLOY/);
  assert.ok(source.includes('"$CLASP" update-deployment "$DEPLOYMENT_ID"'));
});

const native13Files = [
  '00-bootstrap.gs', '01-schema-and-db.gs', '02-auth-and-attachments.gs',
  '03-events-and-dashboard.gs', '04-admin-and-audit.gs', '05-reports-and-models.gs',
  '06-gemini-and-prompts.gs', '00-document-head.html', '01-styles.html',
  '02-app-layout.html', '03-modals.html', '04-browser-app.html', 'Index.html'
];
const native13Partials = [
  '00-document-head', '01-styles', '02-app-layout', '03-modals', '04-browser-app'
];
function native13BackupFixture(options={}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g34-native-13-layout-'));
  try {
    fs.writeFileSync(path.join(root, 'appsscript.json'),
      JSON.stringify({runtimeVersion:options.v8===false?'DEPRECATED_ES5':'V8'}));
    for (const name of native13Files) {
      if (name === options.missing) continue;
      let body = '// native 13 pre-upgrade source fixture\n';
      if (name === '00-bootstrap.gs') body = options.badEntrypoints
        ? 'function doGet(e) {}\n'
        : 'function doGet(e) {}\nfunction include(filename) {}\n';
      if (name === 'Index.html') body = (options.badIndex
        ? native13Partials.slice(0,-1)
        : native13Partials).map(partial =>
          "<?!= include('" + partial + "') ?>"
        ).join('');
      fs.writeFileSync(path.join(root,name),body);
    }
    if (options.extra) fs.writeFileSync(path.join(root,options.extra),'// unexpected');
    return spawnSync(process.execPath,['-',root],{
      input:legacyBackupCheck[1],encoding:'utf8',
    });
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
}
test('G-34 recognizes exactly the previously deployed Native 13-file layout and checks V8/entrypoints/index', () => {
  assert.equal(native13Files.length,13);
  const pass = native13BackupFixture();
  assert.equal(pass.status,0,pass.stderr);
  assert.match(pass.stdout,/BACKED_UP_NATIVE_13_LAYOUT=PASS/);
  assert.match(pass.stdout,/SOURCE_ENTRYPOINTS=PASS/);
  assert.match(pass.stdout,/REMOTE_MANIFEST_V8=PASS/);
});
test('G-34 Native 13 backup gate denies missing, unknown, duplicate, malformed and non-V8 layouts', () => {
  const negatives = [
    [{missing:'04-browser-app.html'}, /exact known 13-file Native/],
    [{extra:'Code.gs'}, /exact known 13-file Native/],
    [{extra:'rogue.html'}, /exact known 13-file Native/],
    [{extra:'99-other.gs'}, /exact known 13-file Native/],
    [{badEntrypoints:true}, /expected doGet\/include entrypoints/],
    [{badIndex:true}, /missing a known partial include/],
    [{v8:false}, /runtimeVersion must be V8/],
  ];
  for (const [opts,reason] of negatives) {
    const run=native13BackupFixture(opts);
    assert.notEqual(run.status,0,JSON.stringify(opts)+' must stop before push');
    assert.match(run.stderr,reason,JSON.stringify(opts));
    assert.doesNotMatch(run.stdout,/BACKED_UP_NATIVE_13_LAYOUT=PASS/);
  }
});


function native24BackupFixture(options={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'g34-native-24-layout-'));
  try{
    fs.writeFileSync(path.join(root,'appsscript.json'),
      JSON.stringify({runtimeVersion:options.v8===false?'DEPRECATED_ES5':'V8'}));
    const nativeFiles=options.layout25 ? expectedNativeFiles() :
      expectedNativeFiles().filter(name=>name!=='00-g1a-foundation.gs');
    const canonicalIndex=nativeFiles.filter(x=>x.endsWith('.html')&&x!=='Index.html')
      .map(x=>path.parse(x).name);
    assert.equal(canonicalIndex.length,16);
    const canonicalOrder=[
      '00-document-head','01-styles','02-app-layout','03-modals',
      '03a-dashboard-mobile','03b-client-core','03c-client-auth',
      '03d-client-dashboard','03e-client-dashboard-export',
      '03f-client-event-controls','03g-client-event-history',
      '03h-client-event-records','03i-client-report-actions',
      '03j-client-report-job','03k-client-report-generation','04-browser-app'
    ];
    assert.deepEqual(canonicalIndex.sort(),[...canonicalOrder].sort());
    let parts=canonicalOrder;
    if(options.indexReorder)parts=[...parts.slice(1),parts[0]];
    if(options.indexMissing)parts=parts.filter(x=>x!==options.indexMissing);
    if(options.indexDuplicate)parts=[...parts,parts[0]];
    for(const name of nativeFiles){
      if(name===options.missing)continue;
      let content='// known pre-existing Native24 source\n';
      if(name==='00-g1a-foundation.gs') {
        // The legitimate remote Native25 bytes must exactly match the
        // separately checked-out source at the approved main SHA.
        content=fs.readFileSync(path.join(ROOT,'src/dengue/00-g1a-foundation.gs'),'utf8');
        if(options.badD331)content=content.replace(
          'var D331_G1A_ENABLED = false;',
          'var D331_G1A_ENABLED = true;');
        if(options.d331Tail)content+=options.d331Tail;
      }
      if(name==='00-bootstrap.gs')content=options.badEntrypoints
        ? 'function doGet(e) {}\n'
        : 'function doGet(e) {}\nfunction include(filename) {}\n';
      if(name==='Index.html')content=parts.map(p=>
        "<?!= include('"+p+"') ?>").join('');
      if(name===options.empty)content='';
      fs.writeFileSync(path.join(root,name),content);
    }
    if(options.extra)fs.writeFileSync(path.join(root,options.extra),'// rogue');
    return spawnSync(process.execPath,['-',root],{
      input:legacyBackupCheck[1],encoding:'utf8'
    });
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('G-34 Native24 v11 backup preflight recognizes exact file and ordered Index include topology',()=>{
  const run=native24BackupFixture();
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/BACKED_UP_NATIVE_24_LAYOUT=PASS/);
  assert.match(run.stdout,/SOURCE_ENTRYPOINTS=PASS/);
  assert.match(run.stdout,/REMOTE_MANIFEST_V8=PASS/);
  assert.doesNotMatch(run.stdout,/BACKED_UP_NATIVE_13_LAYOUT=PASS/);
});
test('G-34 Native24 rejects unknown, missing, duplicate and malformed backups before push',()=>{
  const cases=[
    [{missing:'03i-client-report-actions.html'},/exact known 24-file Native layout/],
    [{missing:'Index.html'},/exact known 24-file Native layout/],
    [{extra:'extra.gs'},/exact known 24-file Native layout/],
    [{extra:'rogue.html'},/exact known 24-file Native layout/],
    [{extra:'Code.gs'},/exact known 24-file Native layout/],
    [{indexMissing:'03d-client-dashboard'},/Index template missing, extra, reordered or untrusted/],
    [{indexReorder:true},/Index template missing, extra, reordered or untrusted/],
    [{indexDuplicate:true},/Index template missing, extra, reordered or untrusted/],
    [{badEntrypoints:true},/expected doGet\/include entrypoints/],
    [{v8:false},/runtimeVersion must be V8/],
    [{empty:'03e-client-dashboard-export.html'},/empty or invalid source/],
  ];
  for(const [options,message] of cases){
    const r=native24BackupFixture(options);
    assert.notEqual(r.status,0,JSON.stringify(options)+' must fail closed');
    assert.match(r.stderr,message,JSON.stringify(options));
    assert.doesNotMatch(r.stdout,/BACKED_UP_NATIVE_24_LAYOUT=PASS/);
  }
});
test('G-34 new Native24 backup gate does not weaken deploy approval, rollback evidence or exact staged file guard',()=>{
  assert.match(source,/BACKED_UP_NATIVE_24_LAYOUT=PASS/);
  assert.match(source,/expectedIndex = native24Partials\.map/);
  assert.match(source,/index\.trim\(\) !== expectedIndex/);
  assert.ok(source.includes('"$CLASP" list-deployments > "$WORK/deployments.before.txt"'));
  assert.ok(source.includes('"$CLASP" list-versions > "$WORK/versions.before.txt"'));
  assert.ok(source.includes('"$CLASP" show-file-status'));
  assert.match(source,/PREFLIGHT=PASS; remote source and deployment unchanged/);
  assert.match(source,/SMART_SRRT_CONFIRM_DEPLOY/);
  assert.ok(source.includes('"$CLASP" update-deployment "$DEPLOYMENT_ID"'));
  assert.doesNotMatch(source,/create-deployment|create-project/);
  const staged=source.match(/const expected = \[([\s\S]*?)\]\.sort\(\);/);
  assert.ok(staged);
  const names=[...staged[1].matchAll(/'([^']+\.(?:gs|html|json))'/g)].map(x=>x[1]).sort();
  assert.deepEqual(names,[...expectedNativeFiles(),'appsscript.json'].sort());
});

test('G-34 N1-A accepts only exact inert Native25 backup and rejects unsafe variants',()=>{
  const ok=native24BackupFixture({layout25:true});
  assert.equal(ok.status,0,ok.stderr);
  assert.match(ok.stdout,/BACKED_UP_NATIVE_25_LAYOUT=PASS/);
  assert.match(ok.stdout,/SOURCE_ENTRYPOINTS=PASS/);
  assert.match(ok.stdout,/REMOTE_MANIFEST_V8=PASS/);
  // A Native25 backup minus the new G1-A file is exactly the *historical*
  // Native24 layout and MUST remain accepted as a preserved prior version.
  const old=native24BackupFixture({layout25:true,missing:'00-g1a-foundation.gs'});
  assert.equal(old.status,0,old.stderr);
  assert.match(old.stdout,/BACKED_UP_NATIVE_24_LAYOUT=PASS/);
  for(const bad of [
    {extra:'rogue.gs'},
    {badD331:true},
    {d331Tail:'\nD331_G1A_ENABLED = true;\n'},
    {d331Tail:"\nSpreadsheetApp['openById']('SYNTHETIC-NOT-REAL');\n"},
    {d331Tail:'\ngetDb_();\n'},
    {d331Tail:'\n// unrelated source drift must also stop\n'},
    {v8:false},
    {indexDuplicate:true}
  ]){
    const r=native24BackupFixture({...bad,layout25:true});
    assert.notEqual(r.status,0,JSON.stringify(bad));
    assert.doesNotMatch(r.stdout,/BACKED_UP_NATIVE_25_LAYOUT=PASS/);
    if(bad.badD331||bad.d331Tail)assert.match(
      r.stderr,/Native25 D331 source differs from exact approved main bytes/);
  }
});
