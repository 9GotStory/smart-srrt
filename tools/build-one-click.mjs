import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ONE_CLICK_TARGETS = [
  { target:'Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', sources:[
    'src/server/00-bootstrap.gs',
    'src/server/01-schema-and-db.gs',
    'src/server/02-auth-and-attachments.gs',
    'src/server/03-events-and-dashboard.gs',
    'src/server/04-admin-and-audit.gs',
    'src/server/05-reports-and-models.gs',
    'src/server/06-gemini-and-prompts.gs',
  ] },
  { target:'Index_Smart_SRRT_OneClick.html', sources:[
    'src/web/00-document-head.html',
    'src/web/01-styles.html',
    'src/web/02-app-layout.html',
    'src/web/03-modals.html',
    'src/web/04-browser-app.html',
  ] },
];

export function assembleOneClick(target) {
  const entry = ONE_CLICK_TARGETS.find(x => x.target === target);
  if (!entry) throw new Error('Unknown One-Click target: ' + target);
  return Buffer.concat(entry.sources.map(p => fs.readFileSync(path.join(ROOT, p))));
}

export function checkOneClick(target) {
  const expected = assembleOneClick(target);
  const filename = path.join(ROOT, target);
  if (!fs.existsSync(filename)) return {matches:false,actual:null,expected};
  const actual = fs.readFileSync(filename);
  return {matches:actual.equals(expected),actual,expected};
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--check','--write'].includes(args[0]))) {
    throw new Error('Usage: node tools/build-one-click.mjs [--check|--write]');
  }
  const check = args[0] === '--check';
  let mismatches = 0;
  for (const entry of ONE_CLICK_TARGETS) {
    const state = checkOneClick(entry.target);
    if (check && !state.matches) {
      console.error('DRIFT: ' + entry.target + ' differs from modular source. Run npm run build and commit both artifacts.');
      mismatches++;
      continue;
    }
    if (!check) fs.writeFileSync(path.join(ROOT, entry.target), state.expected);
    const hash = crypto.createHash('sha256').update(state.expected).digest('hex');
    console.log((check ? 'PARITY PASS: ' : 'BUILT: ') + entry.target + ' sha256=' + hash);
  }
  if (mismatches) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
