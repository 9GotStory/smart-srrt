import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = path.join(ROOT, 'src/styles/legacy.css');
const TAILWIND = path.join(ROOT, 'src/styles/tailwind.css');
const TARGET = path.join(ROOT, 'src/web/01-styles.html');
const BIN = path.join(ROOT, 'node_modules/.bin/tailwindcss');

export function buildUiStyles() {
  if (!fs.existsSync(BIN)) {
    throw new Error('Tailwind CLI missing. Run npm ci from the committed lockfile.');
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-srrt-ux-r2-'));
  try {
    const compiled = path.join(temp, 'tailwind.css');
    const cli = spawnSync(BIN, ['-i', TAILWIND, '-o', compiled, '--minify'], {
      cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024,
    });
    if (cli.error || cli.status !== 0) {
      throw new Error('Tailwind compilation failed: ' + (cli.error?.message || cli.stderr || 'exit ' + cli.status).trim());
    }
    const css = fs.readFileSync(compiled, 'utf8').trim();
    if (!css || !css.includes('tw')) throw new Error('Tailwind output is empty or lacks prefixed utilities');
    if (css.toLowerCase().includes('</style')) throw new Error('Unsafe HTML style terminator in CSS output');
    const legacy = fs.readFileSync(LEGACY, 'utf8');
    return Buffer.from('<style>' + legacy + '\n/* UX-R2 Tailwind CSS v4: prefixed, Preflight disabled */\n' + css + '\n</style>', 'utf8');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function main() {
  const option = process.argv[2];
  if (process.argv.length !== 3 || !['--write', '--check'].includes(option)) {
    throw new Error('Usage: node tools/build-ui-assets.mjs --write|--check');
  }
  const expected = buildUiStyles();
  if (option === '--write') {
    fs.writeFileSync(TARGET, expected);
  } else if (!fs.existsSync(TARGET) || !fs.readFileSync(TARGET).equals(expected)) {
    throw new Error('UI ASSETS DRIFT: src/web/01-styles.html differs from authored src/styles/*.css. Run npm run build:ui-assets and commit it with One-Click HTML.');
  }
  console.log('UX-R2 UI ASSETS PASS: ' + expected.length + ' bytes; mode=' + option.slice(2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error('UX-R2 UI ASSETS FAIL: ' + error.message); process.exitCode = 1; }
}
