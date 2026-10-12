import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  GAS_SERVER_SOURCES, GAS_HTML_SOURCES, buildGasMultiFileEntries,
  gasIndexTemplate, renderGasIndexOffline, verifyGasMultiFileParity
} from '../tools/build-apps-script-multifile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('G-34 native Apps Script release is 7 .gs + 8 HTML partials + Index.html', () => {
  const entries = buildGasMultiFileEntries();
  assert.equal(GAS_SERVER_SOURCES.length,7);
  assert.equal(GAS_HTML_SOURCES.length,8);
  assert.equal(entries.size,16);
  assert.deepEqual([...entries.keys()].filter(name => name.endsWith('.gs')).length,7);
  assert.deepEqual([...entries.keys()].filter(name => name.endsWith('.html')).length,9);
  assert.deepEqual([...entries.keys()].filter(name => name.endsWith('.gs')).sort(),
    GAS_SERVER_SOURCES.map(x => path.basename(x)).sort());
  assert.ok(entries.has('Index.html'));
  assert.ok(verifyGasMultiFileParity(entries));
});

test('G-34 server sources parse individually, without changing existing global RPC names', () => {
  const entries = buildGasMultiFileEntries();
  for (const name of [...entries.keys()].filter(x => x.endsWith('.gs'))) {
    assert.doesNotThrow(() => new vm.Script(entries.get(name).toString('utf8'), {filename:name}));
  }
  const merged = Buffer.concat(GAS_SERVER_SOURCES.map(x => entries.get(path.basename(x))));
  assert.equal(merged.length,GAS_SERVER_SOURCES.reduce((n,p)=>n+fs.statSync(path.join(ROOT,p)).size,0));
  assert.ok(!merged.includes(Buffer.from('ONE_CLICK_TARGETS')),'Native compiled server must not contain Legacy builder tokens');
  assert.match(merged.toString('utf8'),/function doGet\(e\)/);
  assert.match(merged.toString('utf8'),/HtmlService\.createTemplateFromFile\('Index'\)\.evaluate\(\)/);
  assert.match(merged.toString('utf8'),/function include\(filename\)/);
});

test('G-34 server modules initialize in the explicit order in a shared V8-like context', () => {
  const entries=buildGasMultiFileEntries();
  const context=vm.createContext({});
  for (const source of GAS_SERVER_SOURCES) {
    const file=path.basename(source);
    assert.doesNotThrow(() => new vm.Script(entries.get(file).toString('utf8'), {filename:file})
      .runInContext(context, {timeout:2000}), file);
  }
  assert.equal(context.CONFIG.VERSION,'2026.09.08.1');
  assert.equal(context.CONFIG.SCHEMA_VERSION,'7');
  for (const api of ['doGet','include','getDashboardData','getPublicDashboardData','login','createReportJob','listReportsForEvent']) {
    assert.equal(typeof context[api],'function',api+' missing from shared Apps Script global scope');
  }
});

test('G-34 trusted template expands HTML partials in exact original order and bytes', () => {
  const entries = buildGasMultiFileEntries();
  const template = gasIndexTemplate();
  assert.equal(entries.get('Index.html').toString('utf8'),template);
  assert.equal((template.match(/<\?!= include\('/g)||[]).length,8);
  assert.ok(!template.includes('\n'),'Index expansion should add no bytes');
  assert.deepEqual(renderGasIndexOffline(entries),
    Buffer.concat(GAS_HTML_SOURCES.map(source=>entries.get(path.basename(source)))));
  assert.match(template,/03a-dashboard-mobile/);
  for (const filename of GAS_HTML_SOURCES) {
    assert.doesNotMatch(entries.get(path.basename(filename)).toString('utf8'),/<\?(?:=|!=|\s)/);
  }
  const browser = entries.get('04-browser-app.html').toString('utf8');
  assert.doesNotThrow(() => new vm.Script(browser.split('<script>')[1].split('</script>')[0]));
});

test('G-34 CLI writes only an isolated deterministic package; check is read-only and detects drift', () => {
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'smart-srrt-g34-'));
  try {
    fs.mkdirSync(path.join(fixture,'tools'),{recursive:true});
    fs.writeFileSync(path.join(fixture,'package.json'),JSON.stringify({type:'module'}));
    for (const file of ['build-apps-script-multifile.mjs','native-sources.mjs']) {
      fs.copyFileSync(path.join(ROOT,'tools',file),path.join(fixture,'tools',file));
    }
    for (const src of [...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES]) {
      fs.mkdirSync(path.dirname(path.join(fixture,src)),{recursive:true});
      fs.copyFileSync(path.join(ROOT,src),path.join(fixture,src));
    }
    // Native fixture deliberately excludes both frozen One-Click files.
    const run=flag => spawnSync(process.execPath,
      [path.join(fixture,'tools','build-apps-script-multifile.mjs'),flag],
      {cwd:fixture,encoding:'utf8'});
    assert.equal(run('--check').status,1,'check should refuse missing output');
    let done=run('--write');
    assert.equal(done.status,0,done.stderr);
    const output=path.join(fixture,'dist','apps-script');
    assert.equal(fs.readdirSync(output).length,1+GAS_SERVER_SOURCES.length+GAS_HTML_SOURCES.length);
    const before=fs.statSync(path.join(output,'Index.html')).mtimeMs;
    assert.equal(run('--check').status,0,'new package should verify');
    assert.equal(fs.statSync(path.join(output,'Index.html')).mtimeMs,before,'check must not write');
    fs.appendFileSync(path.join(output,'01-styles.html'),'\n<!-- drift -->');
    assert.equal(run('--check').status,1,'check must detect altered HTML');
    assert.equal(run('--write').status,0,'write must restore output from canonical source');
    assert.equal(run('--check').status,0);
    fs.writeFileSync(path.join(output,'unused.html'),'stale');
    assert.equal(run('--check').status,1,'check must reject extra files');
    assert.equal(run('--write').status,0,'write must clear stale generated content');
    assert.equal(run('--check').status,0);

    // Native-only sources, not frozen One-Click, govern source provenance.
    fs.appendFileSync(path.join(fixture,'src','server','00-bootstrap.gs'),'\n// native source change\n');
    assert.equal(run('--check').status,1,'stale server stage must reject source change');
    assert.equal(run('--write').status,0,'write can explicitly stage changed native server');
    assert.equal(run('--check').status,0);
    fs.appendFileSync(path.join(fixture,'src','web','03a-dashboard-mobile.html'),'\n<!-- native only source drift -->');
    assert.equal(run('--check').status,1,'native Dashboard partial source change must fail check');
    assert.equal(run('--write').status,0);
    assert.equal(run('--check').status,0,'re-staged native package matches sources');
  } finally {
    fs.rmSync(fixture,{recursive:true,force:true});
  }
});
