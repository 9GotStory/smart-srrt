import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Historical, frozen archive evidence only. These files are NOT current source
// of truth, and no test may rebuild them or compare their bytes to Native source.
const FROZEN = Object.freeze({
  'Code_Smart_SRRT_OneClick_v2026.09.08.1.gs':'e762751ff5da5813f7c64c104b67d545378f1608',
  'Index_Smart_SRRT_OneClick.html':'ba4e0aeb5fdb0b1434320c351f32ed877a96d51d',
});
function gitBlob(bytes){
  const header=Buffer.from('blob '+bytes.length+'\0','utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}
test('Frozen One-Click archives retain exactly their approved Git blob identities',()=>{
  for(const [filename,sha] of Object.entries(FROZEN)){
    assert.equal(gitBlob(fs.readFileSync(new URL('../'+filename,import.meta.url))),sha,filename+' changed; restore archive, NEVER regenerate it');
  }
});
test('Current Native inspector and release preflight have no One-Click source dependency',()=>{
  for(const file of ['tools/native-release-inspection.mjs','tools/p6-release-preflight.mjs','tests/g30-release-parity.test.mjs','tools/build-apps-script-multifile.mjs']){
    const src=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.doesNotMatch(src,/from ['"][^'"]*build-one-click\.mjs['"]/,'Legacy One-Click import in '+file);
    assert.doesNotMatch(src,/ONE_CLICK_TARGETS/,'Legacy release dependency in '+file);
  }
});
