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
  '06-gemini-and-prompts.gs'];
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
if (JSON.stringify(actual) !== JSON.stringify(['Code.gs','Index.html'])) {
  throw new Error('Expected only legacy Code.gs and Index.html, found: '+JSON.stringify(actual));
}
console.log('BACKED_UP_LEGACY_LAYOUT=PASS; REMOTE_MANIFEST_V8=PASS');
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
  '06-gemini-and-prompts.gs','00-document-head.html','01-styles.html',
  '02-app-layout.html','03-modals.html','04-browser-app.html',
  'Index.html','appsscript.json'].sort();
const actual = fs.readdirSync(stage).sort();
if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Wrong stage file set: '+JSON.stringify(actual));
if(!fs.readFileSync(path.join(stage,'appsscript.json')).equals(fs.readFileSync(oldManifest))) {
  throw new Error('Manifest was modified in the staged package');
}
console.log('STAGE=PASS (13 files + preserved manifest; ordered script files)');
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
