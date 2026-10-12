// Test-only Native client source reader. Never builds a release or touches One-Click.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAS_HTML_SOURCES} from '../../tools/native-sources.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

export function readOrderedClientScripts({root=ROOT,htmlSources=GAS_HTML_SOURCES}={}){
  if(!Array.isArray(htmlSources)||!htmlSources.length)throw new Error('Native HTML manifest is empty');
  const seen=new Set(),scripts=[];
  for(const source of htmlSources){
    const name=path.basename(source);
    if(!source.endsWith('.html')||seen.has(name))throw new Error('Duplicate/invalid Native HTML source: '+source);
    seen.add(name);
    const html=fs.readFileSync(path.join(root,source),'utf8');
    const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
    if(tags.length!==[...html.matchAll(/<script\b/gi)].length){
      throw new Error('Unclosed or malformed script element: '+source);
    }
    tags.forEach((match,index)=>{
      const attrs=match[1];
      if(/(?:^|\s)(?:async|defer)(?=\s|=|$)/i.test(attrs)){
        throw new Error('Non-deterministic client script ordering: '+source);
      }
      const type=attrs.match(/(?:^|\s)type\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
      if(type&&!['text/javascript','application/javascript'].includes(type)){
        throw new Error('Native client script must use classic JavaScript: '+source);
      }
      if(/\bsrc\s*=/.test(attrs))return; // Existing document-head CDN scripts are external.
      scripts.push({path:source,index,code:match[2]});
    });
  }
  return scripts;
}

export function readInlineHandlerCalls({root=ROOT,htmlSources=['src/web/02-app-layout.html','src/web/03-modals.html']}={}){
  const calls=[];
  for(const source of htmlSources){
    const html=fs.readFileSync(path.join(root,source),'utf8');
    for(const match of html.matchAll(/\bon[a-z]+\s*=\s*(["'])(.*?)\1/gi)){
      const name=match[2].trim().match(/^([A-Za-z_$][\w$]*)\s*\(/)?.[1];
      if(name)calls.push({path:source,name});
    }
  }
  return calls;
}
