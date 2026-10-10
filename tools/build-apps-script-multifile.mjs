import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ONE_CLICK_TARGETS } from './build-one-click.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAS_OUTPUT_DIR = path.join(ROOT, 'dist', 'apps-script');
export const GAS_SERVER_SOURCES = Object.freeze([...ONE_CLICK_TARGETS[0].sources]);
export const GAS_HTML_SOURCES = Object.freeze([...ONE_CLICK_TARGETS[1].sources]);

function nameFromSource(source) {
  const name = path.basename(source);
  if (!/^[a-zA-Z0-9_-]+\.(gs|html)$/.test(name)) {
    throw new Error('Unsupported Apps Script file name: ' + name);
  }
  return name;
}

export function gasIndexTemplate() {
  // No extra whitespace: server-side expansion is byte-identical to the
  // existing concatenated HTML artifact. These are trusted source fragments.
  return GAS_HTML_SOURCES.map(source => {
    const file = path.parse(nameFromSource(source)).name;
    return "<?!= include('" + file + "') ?>";
  }).join('');
}

export function buildGasMultiFileEntries() {
  const entries = new Map();
  for (const source of [...GAS_SERVER_SOURCES, ...GAS_HTML_SOURCES]) {
    const name = nameFromSource(source);
    if (entries.has(name)) throw new Error('Duplicate GAS file: ' + name);
    entries.set(name, fs.readFileSync(path.join(ROOT, source)));
  }
  if (entries.has('Index.html')) throw new Error('Index.html name collision');
  entries.set('Index.html', Buffer.from(gasIndexTemplate(), 'utf8'));
  return entries;
}

export function renderGasIndexOffline(entries) {
  const template = entries.get('Index.html')?.toString('utf8');
  if (template !== gasIndexTemplate()) throw new Error('Index.html template drift');
  return Buffer.concat(GAS_HTML_SOURCES.map(source => {
    const name = nameFromSource(source);
    const bytes = entries.get(name);
    if (!Buffer.isBuffer(bytes)) throw new Error('Missing HTML partial: ' + name);
    return bytes;
  }));
}

export function verifyGasMultiFileParity(entries = buildGasMultiFileEntries()) {
  const expectedNames = [...GAS_SERVER_SOURCES, ...GAS_HTML_SOURCES].map(nameFromSource).concat('Index.html');
  if (entries.size !== expectedNames.length || expectedNames.some(name => !entries.has(name))) {
    throw new Error('Multi-file manifest does not match expected entries');
  }

  const server = Buffer.concat(GAS_SERVER_SOURCES.map(source => entries.get(nameFromSource(source))));
  const committedServer = fs.readFileSync(path.join(ROOT, ONE_CLICK_TARGETS[0].target));
  if (!server.equals(committedServer)) {
    throw new Error('Modular server differs from committed One-Click artifact');
  }
  const committedHtml = fs.readFileSync(path.join(ROOT, ONE_CLICK_TARGETS[1].target));
  if (!renderGasIndexOffline(entries).equals(committedHtml)) {
    throw new Error('HTML partial expansion differs from committed One-Click artifact');
  }
  return true;
}

function main() {
  const option = process.argv[2];
  if (!['--write', '--check'].includes(option) || process.argv.length !== 3) {
    throw new Error('Usage: node tools/build-apps-script-multifile.mjs --write|--check');
  }
  const entries = buildGasMultiFileEntries();
  verifyGasMultiFileParity(entries);
  if (option === '--write') {
    // Only generated content lives in this dedicated folder.
    fs.rmSync(GAS_OUTPUT_DIR, { recursive:true, force:true });
    fs.mkdirSync(GAS_OUTPUT_DIR, { recursive:true });
    for (const [filename,bytes] of entries) {
      fs.writeFileSync(path.join(GAS_OUTPUT_DIR, filename), bytes);
    }
  } else {
    const actual = fs.existsSync(GAS_OUTPUT_DIR) ? fs.readdirSync(GAS_OUTPUT_DIR).sort() : [];
    const expected = [...entries.keys()].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error('Multi-file output missing, extra files or stale names: run npm run build:gas-multifile');
    }
    for (const [filename, bytes] of entries) {
      if (!fs.readFileSync(path.join(GAS_OUTPUT_DIR, filename)).equals(bytes)) {
        throw new Error('Multi-file output drift: ' + filename);
      }
    }
  }
  console.log('GAS MULTIFILE PASS: ' + entries.size +
    ' files; server and HTML source parity verified; mode=' + option.slice(2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error('GAS MULTIFILE FAIL: ' + error.message); process.exitCode = 1; }
}
