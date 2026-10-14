// P3-03B2: build-time substitution only; never a runtime Chart.js CDN.
import {chartVendorBytes} from './build-chartjs-offline-asset.mjs';

export const CHART_VENDOR_PLACEHOLDER='<!-- SMART_SRRT_CHARTJS_VENDOR_INLINED_AT_BUILD -->';
export const CHART_VENDOR_HTML_SOURCE='src/web/00-document-head.html';

export function compileNativeHtmlFragment(source,authored,root){
  if(source!==CHART_VENDOR_HTML_SOURCE)return Buffer.isBuffer(authored)?authored:Buffer.from(authored);
  const content=Buffer.isBuffer(authored)?authored.toString('utf8'):String(authored);
  if(content.split(CHART_VENDOR_PLACEHOLDER).length!==2){
    throw Error('Native Chart.js vendor placeholder missing or duplicated');
  }
  // chartVendorBytes checks exact package version, script termination and parses UMD.
  const vendor=chartVendorBytes(root).toString('utf8');
  if(vendor.includes('<?'))throw Error('Chart vendor contains Apps Script template syntax');
  return Buffer.from(content.replace(CHART_VENDOR_PLACEHOLDER,vendor),'utf8');
}
