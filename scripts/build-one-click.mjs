import fs from 'node:fs';

const serverModules = [
  'src/server/00-config.gs',
  'src/server/01-bootstrap-installer.gs',
  'src/server/02-core-auth.gs',
  'src/server/03-event-dashboard.gs',
  'src/server/04-admin-governance.gs',
  'src/server/05-export-report.gs',
  'src/server/06-gemini.gs'
];

const webModules = [
  'src/web/00-head.html',
  'src/web/01-styles.html',
  'src/web/02-body.html',
  'src/web/03-app-script.html',
  'src/web/04-tail.html'
];

const targets = [
  {
    name: 'server',
    modules: serverModules,
    target: 'Code_Smart_SRRT_OneClick_v2026.09.08.1.gs'
  },
  {
    name: 'web',
    modules: webModules,
    target: 'Index_Smart_SRRT_OneClick.html'
  }
];

const check = process.argv.includes('--check');
let failed = false;

for (const item of targets) {
  const built = item.modules.map(path => fs.readFileSync(path, 'utf8')).join('');
  if (check) {
    const committed = fs.readFileSync(item.target, 'utf8');
    if (built !== committed) {
      console.error(`DRIFT: ${item.target} does not match modular source`);
      failed = true;
    } else {
      console.log(`PARITY PASS: ${item.name} -> ${item.target}`);
    }
  } else {
    fs.writeFileSync(item.target, built);
    console.log(`BUILT: ${item.target}`);
  }
}

if (failed) process.exit(1);
