// UX-R1/P3-03B1: reproducible, pinned, offline Chart.js vendor preparation.
// This asset is deliberately NOT injected into GAS source in B1. B2 will
// integrate its identical bytes only after canvas/PNG safety gates are met.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const VERSION='4.5.1';
const PACKAGE=path.join(ROOT,'node_modules/chart.js/package.json');
const UMD=path.join(ROOT,'node_modules/chart.js/dist/chart.umd.min.js');
const OUTPUT=path.join(ROOT,'dist/vendor/chartjs-'+VERSION+'.html');
const MAX_BYTES=512*1024;

export function chartVendorBytes(root=ROOT){
  const vendorPackage=path.join(root,'node_modules/chart.js/package.json');
  const vendorUmd=path.join(root,'node_modules/chart.js/dist/chart.umd.min.js');
  if(!fs.existsSync(vendorPackage)||!fs.existsSync(vendorUmd)){
    throw Error('Chart.js dependency missing: npm ci --ignore-scripts from committed package-lock.json');
  }
  const info=JSON.parse(fs.readFileSync(vendorPackage,'utf8'));
  if(info.version!==VERSION)throw Error('Chart.js vendor version mismatch: expected '+VERSION);
  const code=fs.readFileSync(vendorUmd,'utf8')
    .replace(/\/\/# sourceMappingURL=[^\r\n]*/g,'').trim();
  const size=Buffer.byteLength(code,'utf8');
  if(size<50000||size>MAX_BYTES||/<\/script\b/i.test(code)){
    throw Error('Chart.js vendor is empty, oversized or unsafe for inline HTML script');
  }
  if(!/\bChart\b/.test(code))throw Error('Missing Chart.js UMD export marker');
  new vm.Script(code,{filename:'chart.umd.min.js'});
  return Buffer.from('<!-- Smart SRRT pinned Chart.js '+VERSION+' offline UMD -->\n'
    +'<script>\n'+code+'\n</script>\n','utf8');
}

export function chartVendorFingerprint(bytes=chartVendorBytes()){
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function main(){
  const command=process.argv[2];
  if(process.argv.length!==3||!['--write','--check'].includes(command)){
    throw Error('Usage: node tools/build-chartjs-offline-asset.mjs --write|--check');
  }
  const wanted=chartVendorBytes(),hash=chartVendorFingerprint(wanted);
  if(command==='--write'){
    fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
    fs.writeFileSync(OUTPUT,wanted);
  }else if(!fs.existsSync(OUTPUT)||!fs.readFileSync(OUTPUT).equals(wanted)){
    throw Error('CHART_VENDOR_DRIFT: generated asset differs from the pinned, locked Chart.js UMD');
  }
  console.log('UX-R1 CHART VENDOR PASS: '+VERSION+'; bytes='+wanted.length+
    '; sha256='+hash+'; mode='+command.slice(2)+'; VENDOR_ASSET_PREPARATION_ONLY');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main()}catch(e){console.error('UX-R1 CHART VENDOR FAIL: '+e.message);process.exitCode=1}
}
