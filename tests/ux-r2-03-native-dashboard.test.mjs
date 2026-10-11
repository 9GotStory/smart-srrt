import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES,buildGasMultiFileEntries,renderGasIndexOffline} from '../tools/build-apps-script-multifile.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(ROOT,'src/web/03a-dashboard-mobile.html'),'utf8');
const manifest=fs.readFileSync(path.join(ROOT,'tools/native-sources.mjs'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));

test('R2-03 native source is canonical, One-Click is frozen and not an active build target',()=>{
  assert.equal(GAS_SERVER_SOURCES.length,7);
  assert.equal(GAS_HTML_SOURCES.length,6);
  assert.equal(buildGasMultiFileEntries().size,14);
  assert.equal(path.basename(GAS_HTML_SOURCES[4]),'03a-dashboard-mobile.html');
  assert.equal(path.basename(GAS_HTML_SOURCES.at(-1)),'04-browser-app.html');
  assert.ok(renderGasIndexOffline(buildGasMultiFileEntries()).includes(Buffer.from('srrtDashboardCards')));
  assert.match(pkg.scripts.build,/build:gas-multifile/);
  assert.doesNotMatch(pkg.scripts.build,/one.click|OneClick|build-one-click/i);
  assert.doesNotMatch(pkg.scripts['build:check'],/one.click|build-one-click/i);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT,'tools/build-apps-script-multifile.mjs'),'utf8'),/ONE_CLICK_TARGETS|One_Click|One-Click artifact/);
  assert.doesNotMatch(manifest,/OneClick|oneClick/);
});

test('R2-03 component has separately parsed and stable compact CSS/JS',()=>{
  assert.ok(html.length<6000,'component is too large; split separate native partials instead');
  assert.equal((html.match(/<style>/g)||[]).length,1);
  assert.equal((html.match(/<script>/g)||[]).length,1);
  const script=html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(()=>new vm.Script(script));
  for(const text of ['eventBody','eventDetailPanel','srrtDashboardCards','currentUser','MutationObserver','col24','col26','aria-expanded']){
    assert.ok(script.includes(text),'missing mobile card invariant: '+text);
  }
  assert.doesNotMatch(script,/google\.script\.run|\bgs\s*\(/,'new private RPC is prohibited');
  assert.doesNotMatch(script,/\.innerHTML\s*=|insertAdjacentHTML/,'use safe textContent/DOM methods for incident narratives');
});

test('R2-03 old One-Click files remain committed historical, not updated from native partial list',()=>{
  const legacy=fs.readFileSync(path.join(ROOT,'Index_Smart_SRRT_OneClick.html'),'utf8');
  const native=renderGasIndexOffline(buildGasMultiFileEntries()).toString('utf8');
  assert.ok(native.includes('03a-dashboard-mobile'));
  assert.ok(!legacy.includes('03a-dashboard-mobile'),'frozen One-Click should NOT acquire native UI');
  assert.ok(native.length>legacy.length);
  assert.ok(legacy.endsWith('</html>'));
});
