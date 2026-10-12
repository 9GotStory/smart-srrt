// Read-only Native release inspector. No One-Click dependency or file writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GAS_SERVER_SOURCES, GAS_HTML_SOURCES } from './native-sources.mjs';

export const NATIVE_STAGE_DIR = 'dist/apps-script';

export function expectedNativeFiles() {
  const names=[...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES].map(p=>path.basename(p));
  if (names.length!==new Set(names).size || names.includes('Index.html')) {
    throw new Error('Native manifest contains duplicated or reserved filenames');
  }
  return [...names,'Index.html'];
}

export function expectedNativeIndex() {
  return GAS_HTML_SOURCES.map(p=>"<?!= include('"+path.parse(p).name+"') ?>").join('');
}

export function inspectNativeRelease(root) {
  const checks=[],sources=new Map(),artifacts=[],expected=expectedNativeFiles();
  const add=(id,pass,detail)=>checks.push({id,status:pass?'PASS':'FAIL',detail});
  for(const source of [...GAS_SERVER_SOURCES,...GAS_HTML_SOURCES]){
    const name=path.basename(source);
    try { sources.set(name,fs.readFileSync(path.join(root,source))); }
    catch(e){add('source:'+name,false,'Missing or unreadable Native source: '+(e.code||'ERROR'));}
  }
  sources.set('Index.html',Buffer.from(expectedNativeIndex(),'utf8'));
  const stage=path.join(root,NATIVE_STAGE_DIR);
  let present=[];
  try{present=fs.readdirSync(stage).sort();}
  catch(e){add('native-stage-names',false,'Missing/unreadable Native stage: '+(e.code||'ERROR'));}
  if(present.length){
    const match=JSON.stringify(present)===JSON.stringify([...expected].sort());
    add('native-stage-names',match,'Native stage must have exactly '+expected.length+' manifest files, no extras');
  }
  for(const filename of expected){
    const authored=sources.get(filename);
    let staged=null;
    try{staged=fs.readFileSync(path.join(stage,filename));}
    catch(e){add('native-stage:'+filename,false,'Missing/unreadable staged file: '+(e.code||'ERROR'));}
    if(staged){
      const match=Boolean(authored)&&staged.equals(authored);
      add('native-stage:'+filename,match,match?'Staged bytes equal canonical Native source':'Staged Native bytes differ from source');
      artifacts.push({path:NATIVE_STAGE_DIR+'/'+filename,sha256:crypto.createHash('sha256').update(staged).digest('hex'),bytes:staged.length});
    }
  }
  const server=GAS_SERVER_SOURCES.map(p=>sources.get(path.basename(p))?.toString('utf8')||'').join('');
  const html=GAS_HTML_SOURCES.map(p=>sources.get(path.basename(p))?.toString('utf8')||'').join('');
  const template=sources.get('Index.html').toString('utf8');
  add('native-index-template',template===expectedNativeIndex()&&template.includes("include('03a-dashboard-mobile')") &&
    template.indexOf("include('03a-dashboard-mobile')") < template.indexOf("include('03b-client-core')") &&
    template.indexOf("include('03b-client-core')") < template.indexOf("include('03c-client-auth')") &&
    template.indexOf("include('03c-client-auth')") < template.indexOf("include('04-browser-app')"),
    'Native Index must reflect ordered trusted HTML manifest');
  add('native-template-trust',GAS_HTML_SOURCES.every(p=>!sources.get(path.basename(p))?.includes(Buffer.from('<?'))),
    'Native HTML partials must not contain untrusted Apps Script template execution');
  add('native-html-complete',html.trimEnd().endsWith('</html>')&&html.includes('srrtDashboardCards'),
    'Native HTML expansion must include current module and closing document');
  return {checks,artifacts,server,html,expectedFiles:expected,template};
}
