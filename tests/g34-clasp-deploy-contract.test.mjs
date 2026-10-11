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
