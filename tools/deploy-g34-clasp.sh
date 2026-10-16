#!/usr/bin/env bash
# G-34: Operator-only, guarded clasp 3.x migration to native Apps Script files.
# This script is NOT invoked by CI; it NEVER creates a new Deployment ID.
set -Eeuo pipefail
umask 077

MODE="${1:---preflight}"
[[ $# -le 1 && ( "$MODE" == --preflight || "$MODE" == --deploy ) ]] || { echo 'Usage: bash tools/deploy-g34-clasp.sh [--preflight|--deploy]' >&2; exit 2; }
fail() { echo "STOP: $*" >&2; exit 1; }
REPO="${SMART_SRRT_REPO:-$HOME/dev/smart-srrt}"
APPROVED_SHA="${SMART_SRRT_APPROVED_SOURCE_SHA:-}"
SCRIPT_ID="${SMART_SRRT_SCRIPT_ID:-}"
DEPLOYMENT_ID="${SMART_SRRT_DEPLOYMENT_ID:-}"
CLASP="${SMART_SRRT_CLASP:-clasp}"

[[ "$APPROVED_SHA" =~ ^[0-9a-f]{40}$ ]] || fail 'Set SMART_SRRT_APPROVED_SOURCE_SHA to the exact approved 40-char main commit (not a short SHA).'
[[ -n "$SCRIPT_ID" && -n "$DEPLOYMENT_ID" && "$SCRIPT_ID" != "$DEPLOYMENT_ID" ]] || fail 'Set distinct SMART_SRRT_SCRIPT_ID and SMART_SRRT_DEPLOYMENT_ID.'
[[ -d "$REPO/.git" ]] || fail "Repository not found: $REPO"
for executable in git node npm "$CLASP"; do command -v "$executable" >/dev/null || fail "Missing command: $executable"; done
[[ "$("$CLASP" --version 2>&1)" =~ (^|[^0-9])3\. ]] || fail 'Requires clasp v3.x; check clasp --version.'

cd "$REPO"
[[ "$(git branch --show-current)" == main ]] || fail 'Run from main, not a feature branch or detached HEAD.'
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail 'Tracked local changes found; stash or commit first.'
ORIGIN_URL="$(git remote get-url origin)"
[[ "$ORIGIN_URL" =~ (^|[/:])9GotStory/smart-srrt(\.git)?$ ]] || fail 'Origin is not 9GotStory/smart-srrt.'
git fetch --quiet origin main
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
[[ "$LOCAL_SHA" == "$APPROVED_SHA" && "$REMOTE_SHA" == "$APPROVED_SHA" ]] || fail "Exact SHA mismatch: local=$LOCAL_SHA origin/main=$REMOTE_SHA approved=$APPROVED_SHA"

echo "SOURCE_SHA=$APPROVED_SHA"
npm run build:gas-multifile
npm run check:gas-multifile
npm run build:check
npm run check:contracts
npm run release:preflight
npm test

BACKUP_ROOT="${SMART_SRRT_BACKUP_ROOT:-$HOME/.local/share/smart-srrt/g34-clasp-backups}"
BACKUP_ROOT="$(realpath -m "$BACKUP_ROOT")"
REPO_REAL="$(realpath "$REPO")"
[[ "$BACKUP_ROOT" != "$REPO_REAL" && "$BACKUP_ROOT" != "$REPO_REAL/"* ]] || fail 'Backups must live outside the Git repository.'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$BACKUP_ROOT/$STAMP-$$"
mkdir -p "$WORK/remote" "$WORK/stage"
export SMART_SRRT_SCRIPT_ID="$SCRIPT_ID"
node - "$WORK/remote/.clasp.json" "$WORK/.clasp.json" <<'NODE'
const fs = require('fs');
const [remote, local] = process.argv.slice(2);
const scriptId = process.env.SMART_SRRT_SCRIPT_ID;
const ordered = ['00-bootstrap.gs', '01-schema-and-db.gs', '02-auth-and-attachments.gs',
  '03-events-and-dashboard.gs', '04-admin-and-audit.gs', '05-reports-and-models.gs',
  '06-gemini-and-prompts.gs', '00-g1a-foundation.gs'];
const base = {scriptId, scriptExtensions:['.gs'], htmlExtensions:['.html']};
fs.writeFileSync(remote, JSON.stringify({...base, rootDir:'.'}, null, 2)+'\n');
fs.writeFileSync(local, JSON.stringify({...base, rootDir:'stage', filePushOrder:ordered.map(x=>'stage/'+x)}, null, 2)+'\n');
NODE

# Backup the live mutable source, actual manifest, versions, and deployments BEFORE write.
(cd "$WORK/remote" && "$CLASP" pull > "$WORK/pull.log" 2>&1) || fail "Remote pull failed; no push. See $WORK/pull.log"
[[ -f "$WORK/remote/appsscript.json" ]] || fail 'Remote manifest missing in backup. No push.'
node - "$WORK/remote" <<'NODE'
const fs = require('fs'), path = require('path'), root = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(path.join(root,'appsscript.json'), 'utf8'));
if (manifest.runtimeVersion !== 'V8') throw new Error('Remote Apps Script runtimeVersion must be V8');
const actual = fs.readdirSync(root).filter(x=>/\.(gs|html)$/.test(x)).sort();
const legacyLayouts = [
  ['Code.gs', 'Index.html'],
  ['Index.html', 'รหัส.gs']
];
const native13Layout = [
  '00-bootstrap.gs', '01-schema-and-db.gs', '02-auth-and-attachments.gs',
  '03-events-and-dashboard.gs', '04-admin-and-audit.gs', '05-reports-and-models.gs',
  '06-gemini-and-prompts.gs', '00-document-head.html', '01-styles.html',
  '02-app-layout.html', '03-modals.html', '04-browser-app.html',
  'Index.html'
].sort();
const native24Partials = [
  '00-document-head','01-styles','02-app-layout','03-modals',
  '03a-dashboard-mobile','03b-client-core','03c-client-auth',
  '03d-client-dashboard','03e-client-dashboard-export',
  '03f-client-event-controls','03g-client-event-history',
  '03h-client-event-records','03i-client-report-actions',
  '03j-client-report-job','03k-client-report-generation','04-browser-app'
];
const native24Layout = [
  '00-bootstrap.gs','01-schema-and-db.gs','02-auth-and-attachments.gs',
  '03-events-and-dashboard.gs','04-admin-and-audit.gs',
  '05-reports-and-models.gs','06-gemini-and-prompts.gs',
  ...native24Partials.map(name=>name+'.html'),'Index.html'
];
if (native24Layout.length !== 24) throw new Error('Invalid Native24 expected layout');
// Retain the exact Native24 pre-deploy backup gate, while also recognizing
// the subsequently staged inert 25-file N1-A layout for future preflights.
const native25Layout = [...native24Layout, '00-g1a-foundation.gs'];
if (native25Layout.length !== 25) throw new Error('Invalid Native25 expected layout');
const sameNames = expected =>
  JSON.stringify(actual) === JSON.stringify(expected.slice().sort());
const isLegacy = legacyLayouts.some(sameNames);
const isNative13 = sameNames(native13Layout);
const isNative24 = sameNames(native24Layout);
const isNative25 = sameNames(native25Layout);
if (!isLegacy && !isNative13 && !isNative24 && !isNative25) {
  throw new Error('Expected Index.html with exactly one legacy Code.gs or รหัส.gs; exact known 13-file Native layout; or exact known 24-file Native layout; or exact known 25-file Native layout; found: '+JSON.stringify(actual));
}
const server = (isNative13 || isNative24 || isNative25) ? '00-bootstrap.gs' : actual.find(x => x.endsWith('.gs'));
const code = fs.readFileSync(path.join(root, server), 'utf8');
if (!/\bfunction\s+doGet\s*\(/.test(code) || !/\bfunction\s+include\s*\(/.test(code)) {
  throw new Error('Known server does not contain expected doGet/include entrypoints; inspect private backup before proceeding');
}
if (isNative13) {
  const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
  const trustedPartials = [
    '00-document-head','01-styles','02-app-layout','03-modals','04-browser-app'
  ];
  if (!trustedPartials.every(name =>
    index.includes("include('"+name+"')") ||
    index.includes('include("'+name+'")'))) {
    throw new Error('Native 13-file Index template missing a known partial include');
  }
}
if (isNative24 || isNative25) {
  // TEST v11 was deployed from the canonical Native 24-file index template.
  // Require exactly all sixteen ordered includes, not just substring presence.
  const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
  const expectedIndex = native24Partials.map(name=>"<?!= include('"+name+"') ?>").join('');
  if (index.trim() !== expectedIndex) {
    throw new Error('Native 24-file Index template missing, extra, reordered or untrusted includes');
  }
  for (const filename of (isNative25 ? native25Layout : native24Layout)) {
    if (!fs.statSync(path.join(root,filename)).isFile() ||
        fs.statSync(path.join(root,filename)).size === 0) {
      throw new Error('Native 24-file backup contains an empty or invalid source: '+filename);
    }
  }
}
if (isNative25) {
  const d331 = fs.readFileSync(path.join(root, '00-g1a-foundation.gs'), 'utf8');
  // Fast-fail known unsafe source layouts before any source push or deployment.
  if (!/^var D331_G1A_ENABLED = false;$/m.test(d331) ||
      /\b(?:SpreadsheetApp|DriveApp|PropertiesService|LockService|ScriptApp|UrlFetchApp)\s*\./.test(d331)) {
    throw new Error('Native25 D331 feature flag or service boundary not safe');
  }
}
const layoutLabel=isNative25?'BACKED_UP_NATIVE_25_LAYOUT=PASS':
  isNative24?'BACKED_UP_NATIVE_24_LAYOUT=PASS':
  isNative13?'BACKED_UP_NATIVE_13_LAYOUT=PASS':
  'BACKED_UP_LEGACY_LAYOUT=PASS; LEGACY_SERVER_FILE='+server;
console.log(layoutLabel+'; SOURCE_ENTRYPOINTS=PASS; REMOTE_MANIFEST_V8=PASS');
NODE
(cd "$WORK/remote" && "$CLASP" list-deployments > "$WORK/deployments.before.txt") || fail 'Cannot list remote deployments.'
(cd "$WORK/remote" && "$CLASP" list-versions > "$WORK/versions.before.txt") || fail 'Cannot list remote versions.'
grep -Fq -- "$DEPLOYMENT_ID" "$WORK/deployments.before.txt" || fail 'Deployment ID is not present under Script ID. No push.'

cp -a dist/apps-script/. "$WORK/stage/"
cp -- "$WORK/remote/appsscript.json" "$WORK/stage/appsscript.json"
node - "$WORK/stage" "$WORK/remote/appsscript.json" <<'NODE'
const fs = require('fs'), path = require('path');
const [stage, oldManifest] = process.argv.slice(2);
const expected = [
  '00-bootstrap.gs','01-schema-and-db.gs','02-auth-and-attachments.gs',
  '03-events-and-dashboard.gs','04-admin-and-audit.gs','05-reports-and-models.gs',
  '06-gemini-and-prompts.gs','00-g1a-foundation.gs',
  '00-document-head.html','01-styles.html',
  '02-app-layout.html','03-modals.html','03a-dashboard-mobile.html',
  '03b-client-core.html','03c-client-auth.html','03d-client-dashboard.html',
  '03e-client-dashboard-export.html','03f-client-event-controls.html',
  '03g-client-event-history.html','03h-client-event-records.html',
  '03i-client-report-actions.html','03j-client-report-job.html',
  '03k-client-report-generation.html','04-browser-app.html',
  'Index.html','appsscript.json'].sort();
const actual = fs.readdirSync(stage).sort();
if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Wrong stage file set: '+JSON.stringify(actual));
if(!fs.readFileSync(path.join(stage,'appsscript.json')).equals(fs.readFileSync(oldManifest))) {
  throw new Error('Manifest was modified in the staged package');
}
console.log('STAGE=PASS (25 files + preserved manifest; ordered script files)');
NODE
(cd "$WORK" && "$CLASP" show-file-status > "$WORK/files.before.txt") || fail 'Cannot inspect proposed clasp file push.'

echo "BACKUP_DIR=$WORK"
echo 'SCRIPT_AND_EXISTING_DEPLOYMENT_VERIFIED=PASS'
if [[ "$MODE" == --preflight ]]; then
  echo 'PREFLIGHT=PASS; remote source and deployment unchanged.'
  echo 'Review backup, approved SHA, and target IDs before a separate --deploy invocation.'
  exit 0
fi

# A separate explicit operator action is required even after preflight.
[[ "${SMART_SRRT_CONFIRM_DEPLOY:-}" == "$APPROVED_SHA" ]] || fail 'Set SMART_SRRT_CONFIRM_DEPLOY to the exact approved source SHA for --deploy.'
(cd "$WORK" && "$CLASP" push) || fail "clasp push failed; remote mutable HEAD may need recovery from $WORK/remote"
echo 'REMOTE_HEAD_PUSH=PASS; existing deployment not updated yet.'
(cd "$WORK" && "$CLASP" update-deployment "$DEPLOYMENT_ID" -d "Smart SRRT G-34 main@$APPROVED_SHA") || fail "Deployment update failed; inspect $WORK and existing deployment before retry."
(cd "$WORK/remote" && "$CLASP" list-deployments > "$WORK/deployments.after.txt") || fail 'Deployment updated; verification query failed.'
grep -Fq -- "$DEPLOYMENT_ID" "$WORK/deployments.after.txt" || fail 'Existing Deployment ID missing after update.'
(cd "$WORK/remote" && "$CLASP" list-versions > "$WORK/versions.after.txt") || fail 'Deployment updated; cannot list versions.'
echo "EXISTING_DEPLOYMENT_UPDATED=PASS; BACKUP_DIR=$WORK"
echo 'Verify existing /exec URL and rollback readiness. No installer, migrations or Gemini report requested.'
