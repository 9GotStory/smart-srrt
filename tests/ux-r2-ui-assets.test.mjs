import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildUiStyles } from '../tools/build-ui-assets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = 'src/web/01-styles.html';

test('UX-R2 CSS output is deterministic, prefixed and keeps legacy rules', () => {
  const a = buildUiStyles(), b = buildUiStyles();
  assert.deepEqual(a,b,'repeated Tailwind compiler builds differ');
  const text = a.toString('utf8');
  assert.ok(text.startsWith('<style>') && text.endsWith('</style>'));
  assert.equal((text.match(/<style>/g)||[]).length,1);
  assert.equal(text.split('</style>').length-1,1);
  assert.ok(text.includes('UX-R2 Tailwind CSS v4'));
  assert.ok(text.includes('UX-R2 shared UI'));
  assert.ok(text.includes('.srrt-skip-link'),'shared a11y styles missing');
  assert.ok(text.includes(':root{'),'must preserve legacy custom properties');
  assert.ok(text.includes('tw\\:flex') || text.includes('tw\\\\:flex') || text.includes('tw:flex'),'prefixed probe class missing');
  assert.deepEqual(a,fs.readFileSync(path.join(ROOT,target)),'tracked CSS differs from reproducible build');
});

test('UX-R2 --check is read-only; generated CSS drift fails closed (synthetic checkout)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'smart-srrt-ui-build-test-'));
  try {
    for (const f of ['tools/build-ui-assets.mjs','src/styles/legacy.css','src/styles/shared-ui.css','src/styles/tailwind.css']) {
      fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true});
      fs.copyFileSync(path.join(ROOT,f),path.join(tmp,f));
    }
    fs.mkdirSync(path.join(tmp,'src/web'),{recursive:true});
    fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(tmp,'node_modules'),'dir');
    const run=arg=>spawnSync(process.execPath,[path.join(tmp,'tools/build-ui-assets.mjs'),arg],{cwd:tmp,encoding:'utf8',timeout:60000});
    assert.notEqual(run('--check').status,0,'missing generated CSS must fail');
    let built=run('--write');assert.equal(built.status,0,built.stderr);
    const expected=fs.readFileSync(path.join(tmp,target));
    assert.deepEqual(expected,fs.readFileSync(path.join(ROOT,target)));
    const before=fs.statSync(path.join(tmp,target)).mtimeMs;
    let checked=run('--check');assert.equal(checked.status,0,checked.stderr);
    assert.equal(fs.statSync(path.join(tmp,target)).mtimeMs,before,'--check unexpectedly wrote to file');
    fs.appendFileSync(path.join(tmp,target),'\\n/* drift */');
    assert.notEqual(run('--check').status,0,'changed generated CSS must be rejected');
    built=run('--write');assert.equal(built.status,0,built.stderr);
    assert.deepEqual(fs.readFileSync(path.join(tmp,target)),expected,'rebuild did not restore exact CSS bytes');
    fs.appendFileSync(path.join(tmp,'src/styles/legacy.css'),'\n/* synthetic source drift */\n');
    assert.notEqual(run('--check').status,0,'authored stylesheet drift must be detected');
  } finally {
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
