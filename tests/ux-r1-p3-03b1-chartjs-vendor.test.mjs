import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chartVendorBytes,chartVendorFingerprint} from '../tools/build-chartjs-offline-asset.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json'),'utf8'));
const expected='4.5.1';
const chartSha='sha512-GIjfiT9dbmHRiYi6Nl2yFCq7kkwdkp1W/lp2J99rX0yo9tgJGn3lKQATztIjb5tVtevcBtIdICNWqlq5+E8/Pw==';
const kurkleSha='sha512-M5UknZPHRu3DEDWoipU6sE8PdkZ6Z/S+v4dD+Ke8IaNlpdSQah50lz1KtcFBa2vsdOnwbbnxJwVM4wty6udA5w==';

test('P3-03B1 Chart.js 4.5.1 and transitives pinned with npm integrity, not CDN',()=>{
  assert.equal(pkg.devDependencies['chart.js'],expected);
  assert.equal(lock.packages[''].devDependencies['chart.js'],expected);
  assert.equal(lock.packages['node_modules/chart.js'].version,expected);
  assert.equal(lock.packages['node_modules/chart.js'].integrity,chartSha);
  assert.equal(lock.packages['node_modules/@kurkle/color'].version,'0.3.4');
  assert.equal(lock.packages['node_modules/@kurkle/color'].integrity,kurkleSha);
  assert.equal(pkg.scripts['build:chart-asset'],'node tools/build-chartjs-offline-asset.mjs --write');
  assert.equal(pkg.scripts['check:chart-asset'],'node tools/build-chartjs-offline-asset.mjs --check');
});

test('P3-03B1 reproducible Chart.js UMD asset is well-formed inline-only HTML',()=>{
  const a=chartVendorBytes(),b=chartVendorBytes(),text=a.toString('utf8');
  assert.deepEqual(a,b,'repeated local builds differ');
  assert.match(text,/^<!-- Smart SRRT pinned Chart\.js 4\.5\.1 offline UMD -->/);
  assert.equal((text.match(/<script>/g)||[]).length,1);
  assert.equal((text.match(/<\/script>/g)||[]).length,1);
  assert.doesNotMatch(text,/<script[^>]+src=|https?:\/\/(?:cdn|cdnjs|unpkg|jsdelivr)/i);
  assert.ok(a.length>50000&&a.length<512*1024,'unexpected Chart.js build size');
  new vm.Script(text.slice(text.indexOf('<script>')+8,text.lastIndexOf('</script>')));
  assert.equal(chartVendorFingerprint(a),crypto.createHash('sha256').update(a).digest('hex'));
});

test('P3-03B1 --check is strict read-only and catches tampering in an isolated checkout',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'smart-srrt-chart-vendor-'));
  try{
    fs.mkdirSync(path.join(tmp,'tools'),{recursive:true});
    fs.copyFileSync(path.join(ROOT,'tools/build-chartjs-offline-asset.mjs'),
      path.join(tmp,'tools/build-chartjs-offline-asset.mjs'));
    fs.writeFileSync(path.join(tmp,'package.json'),'{"type":"module"}\n','utf8');
    fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(tmp,'node_modules'),'dir');
    const run=opt=>spawnSync(process.execPath,[path.join(tmp,'tools/build-chartjs-offline-asset.mjs'),opt],
      {cwd:tmp,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
    assert.notEqual(run('--check').status,0,'missing artifact must fail closed');
    const built=run('--write');assert.equal(built.status,0,built.stderr);
    const artifact=path.join(tmp,'dist/vendor/chartjs-'+expected+'.html');
    const correct=fs.readFileSync(artifact);
    const before=fs.statSync(artifact).mtimeMs;
    const checked=run('--check');assert.equal(checked.status,0,checked.stderr);
    assert.equal(fs.statSync(artifact).mtimeMs,before,'--check must be read-only');
    fs.appendFileSync(artifact,'\n/* tamper */');
    assert.notEqual(run('--check').status,0,'tampered vendor must fail closed');
    assert.equal(run('--write').status,0);
    assert.deepEqual(fs.readFileSync(artifact),correct);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('P3-03B1 does not alter current Apps Script Native HTML or its Google Charts runtime',()=>{
  const html=fs.readFileSync(path.join(ROOT,'src/web/00-document-head.html'),'utf8');
  const native=fs.readFileSync(path.join(ROOT,'tools/native-sources.mjs'),'utf8');
  const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/tests.yml'),'utf8');
  assert.equal(html.includes('www.gstatic.com/charts/loader.js'),false);
  assert.match(html,/SMART_SRRT_CHARTJS_VENDOR_INLINED_AT_BUILD/);
  assert.doesNotMatch(html,/<script[^>]+chart\.umd|chart\.js@/i);
  assert.match(native,/src\/web\/03d-client-dashboard\.html/);
  assert.doesNotMatch(native,/chartjs-vendor/);
  assert.ok(workflow.includes('npm run build:chart-asset'));
  assert.ok(workflow.includes('npm run check:chart-asset'));
});
