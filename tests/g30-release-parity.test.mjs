import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ONE_CLICK_TARGETS, assembleOneClick, checkOneClick } from '../tools/build-one-click.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(root, ONE_CLICK_TARGETS[0].target), 'utf8');
const html = fs.readFileSync(path.join(root, ONE_CLICK_TARGETS[1].target), 'utf8');

test('G-30 modules assemble byte-for-byte into both One-Click artifacts', () => {
  assert.equal(ONE_CLICK_TARGETS.length, 2);
  for (const entry of ONE_CLICK_TARGETS) {
    assert.ok(entry.sources.length >= 5);
    assert.ok(checkOneClick(entry.target).matches, entry.target);
    assert.deepEqual(assembleOneClick(entry.target), fs.readFileSync(path.join(root, entry.target)));
  }
});

test('G-30 --check is a non-writing release parity gate', () => {
  const before = ONE_CLICK_TARGETS.map(x=>fs.statSync(path.join(root,x.target)).mtimeMs);
  const result = spawnSync(process.execPath, ['tools/build-one-click.mjs', '--check'], {cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal((result.stdout.match(/PARITY PASS:/g)||[]).length,2);
  assert.deepEqual(ONE_CLICK_TARGETS.map(x=>fs.statSync(path.join(root,x.target)).mtimeMs), before);
});

test('G-30 server and inline browser JavaScript parse', () => {
  assert.doesNotThrow(() => new vm.Script(server, {filename:'Code.gs'}));
  const browser = html.split('<script>')[1]?.split('</script>')[0] ?? '';
  assert.ok(browser.length > 0);
  assert.doesNotThrow(() => new vm.Script(browser, {filename:'Index.html'}));
});

test('G-30 has no duplicate global server function declarations', () => {
  const names = [...server.matchAll(/^function\s+([\w$]+)\s*\(/gm)].map(x=>x[1]);
  const seen = new Set(), duplicates = [];
  for (const name of names) { if (seen.has(name)) duplicates.push(name); seen.add(name); }
  assert.ok(names.length >= 150, 'unexpected loss of server functions');
  assert.deepEqual(duplicates, []);
  assert.equal(names.filter(name=>name==='forceGeminiModelAuto').length,1);
  assert.match(server,/function forceGeminiModelStable\(\)\s*\{\s*return forceGeminiModelAuto\(\);/);
  assert.match(server,/function forceGeminiModelAuto\(\)[\s\S]*?sheet\.getRange\(i \+ 1, 3\)\.setValue/);
});

test('G-30 all browser RPC targets resolve to a server function', () => {
  const names = new Set([...server.matchAll(/^function\s+([\w$]+)\s*\(/gm)].map(x=>x[1]));
  const targets = [...new Set([...html.matchAll(/\bgs\(\s*['"]([\w$]+)['"]/g)].map(x=>x[1]))];
  assert.ok(targets.length >= 40, 'unexpected loss of browser RPC targets');
  assert.deepEqual(targets.filter(x=>!names.has(x)), []);
  assert.match(server,/function getPublicDashboardData\(/);
  assert.match(server,/function listReportsForEvent\(/);
  assert.match(server,/function getAIReportReadiness\(/);
});

test('G-30 preserves schema v7 and G-17/G-26/G-27 contracts', () => {
  assert.match(server,/SCHEMA_VERSION:\s*'7'/);
  assert.match(server,/var REPORT_REGISTRY_HEADERS = \[/);
  assert.match(server,/function listReportsForEvent\(sessionToken, eventId\)/);
  assert.match(server,/function getAIReportReadiness\(sessionToken, eventId\)/);
  assert.match(html,/id="reportHistoryModal"/);
  assert.match(server,/function generateReportFromWeb\(sessionToken, eventId\)/);
  assert.doesNotMatch(server,/function migrateG30/);
});
