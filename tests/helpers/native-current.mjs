// Current Native source contract for regression tests.
// Intentionally does not import, read, assemble, or regenerate legacy One-Click.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../../tools/native-sources.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
export const nativeServer=GAS_SERVER_SOURCES.map(read).join('');
export const nativeHtml=GAS_HTML_SOURCES.map(read).join('');
export const nativeBrowser=read('src/web/04-browser-app.html');
