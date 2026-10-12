// Current Native source contract for regression tests.
// Intentionally does not import, read, assemble, or regenerate legacy One-Click.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAS_SERVER_SOURCES,GAS_HTML_SOURCES} from '../../tools/native-sources.mjs';
import {readOrderedClientScripts} from './native-client.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
export const nativeServer=GAS_SERVER_SOURCES.map(read).join('');
export const nativeHtml=GAS_HTML_SOURCES.map(read).join('');
// Compatibility source for existing VM/regex harnesses; derived from the ordered
// Native browser partials, never from frozen One-Click or from a single old file.
export const nativeBrowser='<script>'+readOrderedClientScripts()
  .filter(part=>['src/web/03b-client-core.html','src/web/03c-client-auth.html','src/web/04-browser-app.html'].includes(part.path))
  .map(part=>part.code).join('\n')+'</script>\n</body>\n</html>';

// New canonical ordered client view; preserve nativeBrowser for existing tests.
export const nativeClientScripts=readOrderedClientScripts();
export const nativeClientSource=nativeClientScripts.map(script=>script.code).join('\n');
