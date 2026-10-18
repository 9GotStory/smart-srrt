#!/usr/bin/env bash
# P0-11: OPERATOR ONLY. Bounded READ-ONLY remote backup + PRIVATE Native33 stage.
# NEVER push, update/create deployment, modify Google data, or auto-restore.
set -Eeuo pipefail
umask 077

stop() { echo "P011=HOLD: $1" >&2; exit 1; }
[[ $# -eq 1 && "$1" == "--preflight" ]] ||
  stop 'Only --preflight is supported; --deploy and --rollback are NOT authorized'
[[ "${SMART_SRRT_P011_APPROVED_READONLY:-}" == "YES" ]] ||
  stop 'Explicit P011 read-only operator approval required'

REPO="${SMART_SRRT_REPO:-$HOME/dev/smart-srrt}"
APPROVED_SHA="${SMART_SRRT_APPROVED_SOURCE_SHA:-}"
SCRIPT_ID="${SMART_SRRT_SCRIPT_ID:-}"
DEPLOY_ID="${SMART_SRRT_DEPLOYMENT_ID:-}"
CLASP="${SMART_SRRT_CLASP:-clasp}"

[[ "$APPROVED_SHA" =~ ^[0-9a-f]{40}$ ]] || stop 'Missing exact approved SHA'
[[ "$SCRIPT_ID" =~ ^[A-Za-z0-9_-]{20,200}$ &&
   "$DEPLOY_ID" =~ ^[A-Za-z0-9_-]{20,200}$ &&
   "$SCRIPT_ID" != "$DEPLOY_ID" ]] || stop 'Original target identifiers missing'
[[ -d "$REPO/.git" ]] || stop 'Missing original Git checkout'
[[ "$CLASP" =~ ^[A-Za-z0-9_./-]+$ ]] || stop 'Invalid clasp executable'
for bin in git node "$CLASP" tar sha256sum mktemp realpath; do
  command -v "$bin" >/dev/null || stop 'Missing required operator binary'
done
[[ "$("$CLASP" --version 2>/dev/null)" =~ (^|[^0-9])3\. ]] ||
  stop 'Only clasp v3 supported'

cd "$REPO"
[[ "$(git branch --show-current)" == "main" ]] || stop 'Checkout main first'
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || stop 'Tracked worktree is dirty'
[[ "$(git remote get-url origin)" =~ (^|[/:])9GotStory/smart-srrt(\.git)?$ ]] ||
  stop 'Unexpected Git remote'
git fetch --quiet origin main || stop 'Unable to verify remote main'
[[ "$(git rev-parse HEAD)" == "$APPROVED_SHA" &&
   "$(git rev-parse origin/main)" == "$APPROVED_SHA" ]] ||
  stop 'Source SHA mismatch: no operation performed'

node tools/d331-p0-10-runtime-readiness.mjs >/dev/null ||
  stop 'Native26 source preview and feature OFF gate failed'
node tools/d331-p0-11-native33-package.mjs >/dev/null ||
  stop 'Native33 candidate preparation gate failed'

REPO_REAL="$(realpath "$REPO")"
BACKUP_ROOT="$(realpath -m "${SMART_SRRT_BACKUP_ROOT:-$HOME/.local/share/smart-srrt/p011-private-backups}")"
[[ "$BACKUP_ROOT" != "$REPO_REAL" &&
   "$BACKUP_ROOT" != "$REPO_REAL/"* ]] ||
  stop 'Backup root must be outside Git checkout'
mkdir -p -m 0700 "$BACKUP_ROOT"
[[ ! -L "$BACKUP_ROOT" ]] || stop 'Backup root must not be a symlink'
WORK="$(mktemp -d "$BACKUP_ROOT/p011-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXXXX")"
mkdir -m 0700 "$WORK/remote"
export SMART_SRRT_SCRIPT_ID="$SCRIPT_ID"

# Credentials come from the operator's ALREADY authenticated clasp user.
# .clasp files are private and do not enter the tracked repository.
node - "$WORK/remote/.clasp.json" <<'NODE'
const fs=require('fs');
fs.writeFileSync(process.argv[2],
  JSON.stringify({scriptId:process.env.SMART_SRRT_SCRIPT_ID,rootDir:'.',
    scriptExtensions:['.gs'],htmlExtensions:['.html']}),'utf8');
NODE

# Make a full, recoverable local source snapshot BEFORE preparing a 33-file stage.
(cd "$WORK/remote" && "$CLASP" pull >"$WORK/pull.log" 2>&1) ||
  stop 'Remote backup pull failed; inspect private backup, no write'
(cd "$WORK/remote" && "$CLASP" list-deployments >"$WORK/deployments.before.txt" 2>"$WORK/deployments.err") ||
  stop 'Unable to inspect existing deployment; no write'
(cd "$WORK/remote" && "$CLASP" list-versions >"$WORK/versions.before.txt" 2>"$WORK/versions.err") ||
  stop 'Unable to inspect versions; no write'
grep -Fq -- "$DEPLOY_ID" "$WORK/deployments.before.txt" ||
  stop 'Expected original deployment not found; no write'

node --input-type=module - "$WORK" <<'NODE'
import {verifyNativeBackup,preparePrivateStage} from './tools/d331-p0-11-native33-package.mjs';
import fs from 'node:fs';
const work=process.argv[2];
const remote=verifyNativeBackup(work+'/remote');
const result=preparePrivateStage(work,{manifestFrom:work+'/remote/appsscript.json'});
if(remote.backup!=='EXACT_REMOTE_LAYOUT_PASS'||
   result.stageFiles!==34 || result.canDeploy!==false)
  throw Error('P011_GATE_HOLD');
// Generate a private clasp configuration for future review, not execution.
const pushOrder=JSON.parse(fs.readFileSync(work+'/file-push-order.json','utf8'));
if(pushOrder.length!==15||new Set(pushOrder).size!==15)throw Error('P011_PUSH_ORDER_INVALID');
fs.writeFileSync(work+'/.clasp.json',JSON.stringify({
  scriptId:process.env.SMART_SRRT_SCRIPT_ID,
  rootDir:'stage',scriptExtensions:['.gs'],htmlExtensions:['.html'],
  filePushOrder:pushOrder
}),{flag:'wx',mode:0o600});
NODE

# Immutable-in-practice local evidence: raw pulled files + original versions and
# deployment inventory. Snapshot and SHA256 are for MANUAL rollback planning.
tar -czf "$WORK/rollback-source-and-metadata.tgz" -C "$WORK" \
  remote deployments.before.txt versions.before.txt ||
  stop 'Cannot package private rollback evidence'
(cd "$WORK" && sha256sum rollback-source-and-metadata.tgz \
  >rollback-source-and-metadata.tgz.sha256) ||
  stop 'Cannot checksum private rollback evidence'

# Offline restore drill: extract only into the private backup workspace, then
# verify every restored file byte-for-byte against the original pulled copy.
mkdir -m 0700 "$WORK/restore-check"
tar -xzf "$WORK/rollback-source-and-metadata.tgz" -C "$WORK/restore-check" ||
  stop 'Local rollback archive extraction failed'
node --input-type=module - "$WORK" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import {verifyNativeBackup} from './tools/d331-p0-11-native33-package.mjs';
const work=process.argv[2];
verifyNativeBackup(path.join(work,'restore-check','remote'));
function compareTree(a,b){
 const filesA=fs.readdirSync(a).sort(),filesB=fs.readdirSync(b).sort();
 if(JSON.stringify(filesA)!==JSON.stringify(filesB))throw Error('ROLLBACK_FILE_SET');
 for(const file of filesA){
  const x=path.join(a,file),y=path.join(b,file);
  if(!fs.readFileSync(x).equals(fs.readFileSync(y)))throw Error('ROLLBACK_BYTES');
 }
}
compareTree(path.join(work,'remote'),path.join(work,'restore-check','remote'));
for(const name of ['deployments.before.txt','versions.before.txt']){
 if(!fs.readFileSync(path.join(work,name)).equals(
   fs.readFileSync(path.join(work,'restore-check',name))))throw Error('ROLLBACK_METADATA');
}
NODE
(cd "$WORK" && sha256sum --check --status rollback-source-and-metadata.tgz.sha256) ||
  stop 'Rollback SHA256 check failed'
rm -rf -- "$WORK/restore-check"

echo "P011=READONLY_PREPARED; SOURCE_SHA=$APPROVED_SHA"
echo 'NATIVE33_STAGE=PRIVATE_ONLY; ORIGINAL_REMOTE_BACKUP=PASS'
echo 'ROLLBACK_ARCHIVE_SHA256=PASS; LOCAL_RESTORE_DRILL=PASS; REMOTE_RESTORE_NOT_EXECUTED=YES'
echo 'CLASP_PUSH=NO; DEPLOYMENT_CHANGE=NO; SHEET_WRITES=NO; D331_ENABLED=NO'
echo "PRIVATE_BACKUP_DIR=$WORK"
echo 'P011_DEPLOY=HOLD; review scope, rollback, policy and explicit DEV approval separately'
