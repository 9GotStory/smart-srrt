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

test('G-34 native Apps Script release is 7 .gs + 5 HTML partials + Index.html', () => {
  const entries = buildGasMultiFileEntries();
  assert.equal(GAS_SERVER_SOURCES.length,7);
  assert.equal(GAS_HTML_SOURCES.length,5);
  assert.equal(entries.size,13);
  assert.deepEqual([...entries.keys()].filter(name => name.endsWith('.gs')).length,7);
  assert.deepEqual([...entries.keys()].filter(name => name.endsWith('.html')).length,6);
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
  assert.deepEqual(merged,fs.readFileSync(path.join(ROOT,'Code_Smart_SRRT_OneClick_v2026.09.08.1.gs')));
  assert.match(merged.toString('utf8'),/function doGet\(e\)/);
  assert.match(merged.toString('utf8'),/HtmlService\.createTemplateFromFile\('Index'\)\.evaluate\(\)/);
  assert.match(merged.toString('utf8'),/function include\(filename\)/);
});

test('G-34 trusted template expands HTML partials in exact original order and bytes', () => {
  const entries = buildGasMultiFileEntries();
  const template = gasIndexTemplate();
  assert.equal(entries.get('Index.html').toString('utf8'),template);
  assert.equal((template.match(/<\?!= include\('/g)||[]).length,5);
  assert.ok(!template.includes('\n'),'Index expansion should add no bytes');
  assert.deepEqual(renderGasIndexOffline(entries),
    fs.readFileSync(path.join(ROOT,'Index_Smart_SRRT_OneClick.html')));
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
    for (const file of ['build-apps-script-multifile.mjs','build-one-click.mjs']) {
      fs.copyFileSync(path.join(ROOT,'tools',file),path.join(fixture,'tools',file));
    }
    for (const src of [...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES]) {
      fs.mkdirSync(path.dirname(path.join(fixture,src)),{recursive:true});
      fs.copyFileSync(path.join(ROOT,src),path.join(fixture,src));
    }
    for (const artifact of ['Code_Smart_SRRT_OneClick_v2026.09.08.1.gs','Index_Smart_SRRT_OneClick.html']) {
      fs.copyFileSync(path.join(ROOT,artifact),path.join(fixture,artifact));
    }
    const run=flag => spawnSync(process.execPath,
      [path.join(fixture,'tools','build-apps-script-multifile.mjs'),flag],
      {cwd:fixture,encoding:'utf8'});
    assert.equal(run('--check').status,1,'check should refuse missing output');
    let done=run('--write');
    assert.equal(done.status,0,done.stderr);
    const output=path.join(fixture,'dist','apps-script');
    assert.equal(fs.readdirSync(output).length,13);
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

    // Strong provenance gate: never claim package parity when source drifted
    // from either committed legacy release artifact.
    fs.appendFileSync(path.join(fixture,'src','server','00-bootstrap.gs'),'\n// uncommitted source drift\n');
    const parityReject = run('--write');
    assert.equal(parityReject.status,1,'source drift from committed artifact must reject the build');
    assert.match(parityReject.stderr,/differs from committed One-Click artifact/);
    fs.copyFileSync(path.join(ROOT,'src','server','00-bootstrap.gs'),
      path.join(fixture,'src','server','00-bootstrap.gs'));
    fs.appendFileSync(path.join(fixture,'src','web','01-styles.html'),'\n<!-- source drift -->');
    const htmlReject = run('--check');
    assert.equal(htmlReject.status,1,'HTML drift from committed artifact must reject check');
    assert.match(htmlReject.stderr,/HTML partial expansion differs from committed One-Click artifact/);
  } finally {
    fs.rmSync(fixture,{recursive:true,force:true});
  }
});
