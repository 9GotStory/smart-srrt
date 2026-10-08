import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ONE_CLICK_TARGETS } from '../tools/build-one-click.mjs';
import { runOfflinePreflight } from '../tools/p6-release-preflight.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function isolatedFixture() {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smart-srrt-p6-preflight-'));
  for(const entry of ONE_CLICK_TARGETS) {
    const paths=[entry.target,...entry.sources];
    for(const item of paths) {
      const out=path.join(temp,item);
      fs.mkdirSync(path.dirname(out),{recursive:true});
      fs.copyFileSync(path.join(root,item),out);
    }
  }
  return temp;
}

test('P6 offline preflight reports code PASS but never release authorization',()=>{
  const report=runOfflinePreflight();
  assert.equal(report.mode,'READ_ONLY_SOURCE_INSPECTION');
  assert.equal(report.codeGate,'PASS',JSON.stringify(report.checks.filter(x=>x.status!=='PASS')));
  assert.equal(report.releaseDecision,'HOLD');
  assert.equal(report.schemaVersion,7);
  assert.equal(report.artifacts.length,2);
  assert.equal(report.migrationOrder.length,6);
  assert.deepEqual(report.migrationOrder.map(x=>x.schemaFloor),[2,3,4,5,6,7]);
  assert.ok(report.migrationOrder.every(x=>x.execution==='NOT_RUN' && x.dryRun===false));
  assert.ok(report.artifacts.every(x=>/^[0-9a-f]{64}$/.test(x.sha256)));
  assert.ok(report.humanGates.length>=5);
  assert.ok(report.checks.some(x=>x.id==='installer-side-effects'&&x.status==='PASS'));
});

test('P6 preflight CLI returns a stable, machine-readable, non-secret report',()=>{
  const command=spawnSync(process.execPath,['tools/p6-release-preflight.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(command.status,0,command.stderr);
  const parsed=JSON.parse(command.stdout);
  assert.equal(parsed.codeGate,'PASS');
  assert.equal(parsed.releaseDecision,'HOLD');
  assert.equal(parsed.artifacts.length,2);
  assert.doesNotMatch(command.stdout,/GEMINI_API_KEY\s*[:=]\s*['"][^'"]+/);
  const invalid=spawnSync(process.execPath,['tools/p6-release-preflight.mjs','--write'],{cwd:root,encoding:'utf8'});
  assert.equal(invalid.status,2);
  assert.equal(invalid.stdout,'');
});

test('P6 preflight is read-only on checked-in build artifacts',()=>{
  const paths=ONE_CLICK_TARGETS.flatMap(x=>[x.target,...x.sources]).map(x=>path.join(root,x));
  const before=paths.map(x=>[fs.statSync(x).mtimeMs,fs.statSync(x).size]);
  const report=runOfflinePreflight();
  assert.equal(report.codeGate,'PASS');
  const after=paths.map(x=>[fs.statSync(x).mtimeMs,fs.statSync(x).size]);
  assert.deepEqual(after,before);
});

test('P6 preflight fails closed on a missing compiled artifact and does not rebuild',()=>{
  const tmp=isolatedFixture();
  try {
    const missing=path.join(tmp,ONE_CLICK_TARGETS[0].target);
    fs.unlinkSync(missing);
    const report=runOfflinePreflight(tmp);
    assert.equal(report.codeGate,'FAIL');
    assert.ok(report.checks.some(c=>c.id==='artifact:'+ONE_CLICK_TARGETS[0].target&&c.status==='FAIL'));
    assert.equal(report.releaseDecision,'HOLD');
    assert.equal(fs.existsSync(missing),false);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('P6 preflight rejects a mutated migration floor even if build parity is preserved',()=>{
  const tmp=isolatedFixture();
  try {
    const moduleFile=path.join(tmp,'src/server/01-schema-and-db.gs');
    const script=path.join(tmp,ONE_CLICK_TARGETS[0].target);
    const old='Math.max(existingSchemaVersion, 7)';
    const replacement='Math.max(existingSchemaVersion, 6)';
    for(const file of [moduleFile,script]){
      const source=fs.readFileSync(file,'utf8');
      assert.ok(source.includes(old));
      fs.writeFileSync(file,source.replace(old,replacement));
    }
    const report=runOfflinePreflight(tmp);
    assert.equal(report.codeGate,'FAIL');
    assert.ok(report.checks.some(x=>x.id==='migration:migrateG17ReportRegistry'&&x.status==='FAIL'));
    assert.ok(report.checks.some(x=>x.id==='artifact:'+ONE_CLICK_TARGETS[0].target&&x.status==='PASS'));
    assert.equal(report.releaseDecision,'HOLD');
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
