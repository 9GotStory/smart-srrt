#!/usr/bin/env node
/**
 * D331 N1-C2B — SOURCE-ONLY, IN-MEMORY Native26 preview.
 * Never registered, staged, pushed or deployed. Never accesses Google/PHI.
 * Real Native25 source, deployment allowlist and all app pages remain unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES,
  buildGasMultiFileEntries} from './build-apps-script-multifile.mjs';

const SELF=fileURLToPath(import.meta.url);
const ROOT=path.resolve(path.dirname(SELF),'..');
const D331_PARTIAL='src/web/03l-client-d331-status.html';
const LAST_HTML='src/web/04-browser-app.html';
const LAYOUT_NAME='02-app-layout.html';
const D331_NAME=path.basename(D331_PARTIAL);
const FIVE=Object.freeze(['dashboard','records','reporter','admin','library']);
const DISABLED_SECTION=[
  '    <!-- N1-C2B OFFLINE PREVIEW ONLY: not shipped, routable or visible -->',
  '    <section id="page-dengue" class="section" hidden inert aria-hidden="true" aria-label="Dengue 3-3-1 ยังไม่เปิดใช้งาน">',
  '      <div id="d331-status-root"></div>',
  '    </section>'
].join('\n')+'\n';
const DENIED='D331_N1C2B_PREVIEW_DENIED';

function deny(){throw new Error(DENIED);}
function exactNames(actual,expected){
  if(actual.length!==expected.length || actual.some((x,i)=>x!==expected[i]))deny();
}
function count(text,needle){return text.split(needle).length-1;}
function template(sources){
  return sources.map(source=>"<?!= include('"+path.parse(source).name+"') ?>").join('');
}
function part(base,name){
  const value=base.get(name);
  if(!Buffer.isBuffer(value))deny();
  return value.toString('utf8');
}
function validateCanonicalBaseline(entries){
  if(!(entries instanceof Map) || entries.size!==25 ||
     GAS_SERVER_SOURCES.length!==8||GAS_HTML_SOURCES.length!==16 ||
     GAS_HTML_SOURCES.at(-1)!==LAST_HTML||
     GAS_HTML_SOURCES.includes(D331_PARTIAL) ||
     entries.has(D331_NAME))deny();
  const actual=[...entries.keys()].sort();
  const expected=[...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES]
    .map(x=>path.basename(x)).concat('Index.html').sort();
  exactNames(actual,expected);
  if(part(entries,'Index.html')!==template(GAS_HTML_SOURCES))deny();
  const g1=part(entries,'00-g1a-foundation.gs');
  if(!/\bvar D331_G1A_ENABLED = false;/.test(g1) ||
     /\bD331_G1A_ENABLED\s*=\s*true\b/.test(g1))deny();
  const layout=part(entries,LAYOUT_NAME);
  const pages=[...layout.matchAll(/<section id="page-([^"]+)" class="section(?: active)?"/g)]
    .map(m=>m[1]);
  exactNames(pages,FIVE);
  const nav=[...layout.matchAll(/\bdata-page="([^"]+)"/g)].map(m=>m[1]);
  exactNames(nav,FIVE);
  if(layout.includes('id="page-dengue"') || layout.includes('data-page="dengue"') ||
     count(layout,'  </main>\n')!==1)deny();
  const auth=part(entries,'03c-client-auth.html');
  if(!auth.includes("!['dashboard','records','reporter','admin','library'].includes(page)") ||
     !auth.includes("!roleCanRecord()") ||
     !auth.includes("!roleCanManage()"))deny();
  const final=part(entries,path.basename(LAST_HTML));
  if(!/<\/script>\s*<\/body>\s*<\/html>\s*$/.test(final) ||
     count(final,'  boot();')!==1)deny();
  return layout;
}

/** Validate a synthetic preview against the unchanged current Native25 source. */
export function verifyD331Native26Preview(preview){
  if(!preview || typeof preview!=='object'||!(preview.entries instanceof Map) ||
     !Array.isArray(preview.htmlSources)||!Buffer.isBuffer(preview.renderedHtml))deny();
  const canonical=buildGasMultiFileEntries();
  const layout=validateCanonicalBaseline(canonical);
  const index=GAS_HTML_SOURCES.indexOf(LAST_HTML);
  if(index!==GAS_HTML_SOURCES.length-1)deny();
  const htmlSources=[...GAS_HTML_SOURCES.slice(0,index),D331_PARTIAL,LAST_HTML];
  exactNames(preview.htmlSources,htmlSources);
  const expectedNames=[...GAS_SERVER_SOURCES,...htmlSources]
    .map(x=>path.basename(x)).concat('Index.html').sort();
  exactNames([...preview.entries.keys()].sort(),expectedNames);
  if(preview.entries.size!==26 || preview.htmlSources.length!==17)deny();
  for(const [name,bytes] of canonical){
    if(!Buffer.isBuffer(preview.entries.get(name)))deny();
    if(name==='Index.html'){
      if(part(preview.entries,name)!==template(htmlSources))deny();
    }else if(name===LAYOUT_NAME){
      const expected=layout.replace('  </main>\n',DISABLED_SECTION+'  </main>\n');
      if(part(preview.entries,name)!==expected)deny();
    }else if(!bytes.equals(preview.entries.get(name)))deny();
  }
  const candidate=fs.readFileSync(path.join(ROOT,D331_PARTIAL));
  if(!candidate.length||!candidate.equals(preview.entries.get(D331_NAME)))deny();
  const fragment=candidate.toString('utf8');
  if(!fragment.includes('d331N1cStatusWorkspace_')||
     !fragment.includes("return render(root,'OFF')") ||
     !fragment.includes('button.disabled=true') ||
     /(?:google\.script\.run|SpreadsheetApp|PropertiesService|fetch\s*\(|XMLHttpRequest)/.test(fragment))deny();
  const rendered=Buffer.concat(htmlSources.map(src=>preview.entries.get(path.basename(src))));
  if(!rendered.equals(preview.renderedHtml))deny();
  const html=rendered.toString('utf8');
  if(!html.trimEnd().endsWith('</html>') ||
     count(html,'id="page-dengue"')!==1 ||
     count(html,'id="d331-status-root"')!==1||
     html.includes('data-page="dengue"')||
     count(html,'<section id="page-dengue" class="section" hidden inert aria-hidden="true"')!==1||
     html.indexOf('d331N1cStatusWorkspace_')>html.lastIndexOf('  boot();'))deny();
  return Object.freeze({
    state:'PREVIEW_ONLY',
    originalNativeFiles:25,
    previewNativeFiles:26,
    registeredInRealManifest:false,
    patientAccess:false,
    runtimeEnabled:false,
    deploymentAllowed:false
  });
}

/** Make an isolated in-memory candidate only. Does not write files. */
export function buildD331Native26Preview(){
  const canonical=buildGasMultiFileEntries();
  const layout=validateCanonicalBaseline(canonical);
  const index=GAS_HTML_SOURCES.indexOf(LAST_HTML);
  const htmlSources=[...GAS_HTML_SOURCES.slice(0,index),D331_PARTIAL,LAST_HTML];
  const entries=new Map([...canonical].map(([name,bytes])=>[name,Buffer.from(bytes)]));
  entries.set(LAYOUT_NAME,Buffer.from(
    layout.replace('  </main>\n',DISABLED_SECTION+'  </main>\n'),'utf8'));
  entries.set(D331_NAME,fs.readFileSync(path.join(ROOT,D331_PARTIAL)));
  entries.set('Index.html',Buffer.from(template(htmlSources),'utf8'));
  const renderedHtml=Buffer.concat(htmlSources.map(src=>entries.get(path.basename(src))));
  const preview={htmlSources,entries,renderedHtml};
  verifyD331Native26Preview(preview);
  return preview;
}

if(process.argv[1]&&path.resolve(process.argv[1])===SELF){
  try{
    if(process.argv.length!==2)deny();
    const preview=buildD331Native26Preview();
    verifyD331Native26Preview(preview);
    console.log('D331_N1C2B_NATIVE26_PREVIEW=PASS');
    console.log('D331_NATIVE25_MANIFEST=UNCHANGED; PREVIEW=IN_MEMORY_ONLY');
    console.log('D331_FEATURE=OFF; D331_RUNTIME=HOLD; DEPLOY=HOLD');
  }catch{
    console.error('D331_N1C2B_NATIVE26_PREVIEW=FAIL');
    console.error('D331_FEATURE=OFF; D331_RUNTIME=HOLD; DEPLOY=HOLD');
    process.exitCode=2;
  }
}
