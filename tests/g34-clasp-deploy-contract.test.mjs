import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  assert.match(source, /"\\$CLASP" pull/);
  assert.match(source, /"\\$CLASP" push/);
  assert.match(source, /"\\$CLASP" update-deployment "\$DEPLOYMENT_ID"/);
  assert.doesNotMatch(source, /"\\$CLASP" create-deployment/);
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
