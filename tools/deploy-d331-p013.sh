#!/usr/bin/env bash
# P0-13: Existing Development Web App ONLY. No new project/deployment.
# Source-only tool; --deploy and --rollback-version require separate SHA-
# bound, operator-provided approvals. No execution is permitted by the PR.
set -Eeuo pipefail
umask 077

stop(){ echo "P013=HOLD; REASON=$1" >&2; exit 1; }
[[ $# -eq 1 ]] || stop 'EXACT_ONE_MODE_REQUIRED'
MODE="$1"
[[ "$MODE" == --verify || "$MODE" == --deploy ||
   "$MODE" == --rollback-version ]] || stop 'UNSUPPORTED_MODE'
REPO="${SMART_SRRT_REPO:-$HOME/dev/smart-srrt}"
SOURCE_SHA="${SMART_SRRT_APPROVED_SOURCE_SHA:-}"
SCRIPT_ID="${SMART_SRRT_SCRIPT_ID:-}"
DEPLOY_ID="${SMART_SRRT_DEPLOYMENT_ID:-}"
BACKUP="${SMART_SRRT_P013_PRIVATE_BACKUP_DIR:-}"
CLASP="${SMART_SRRT_CLASP:-clasp}"
[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || stop 'SOURCE_SHA_REQUIRED'
[[ "$SCRIPT_ID" =~ ^[A-Za-z0-9_-]{20,200}$ &&
   "$DEPLOY_ID" =~ ^[A-Za-z0-9_-]{20,200}$ &&
   "$SCRIPT_ID" != "$DEPLOY_ID" ]] || stop 'ORIGINAL_TARGET_REQUIRED'
[[ "$CLASP" =~ ^[A-Za-z0-9_./-]+$ ]] || stop 'INVALID_CLASP_PATH'
[[ -d "$REPO/.git" && -d "$BACKUP" ]] || stop 'REPO_AND_PRIVATE_BACKUP_REQUIRED'
for cmd in git node "$CLASP" cmp mktemp;do
 command -v "$cmd" >/dev/null || stop 'MISSING_BINARY'
done
[[ "$("$CLASP" --version 2>/dev/null)" =~ (^|[^0-9])3\. ]] ||
 stop 'CLASP3_REQUIRED'

# No deployment action is even reachable before a second, mode-specific
# Product Owner approval (SHA match and explicitly reviewed prior version).
case "$MODE" in
 --verify)
  [[ "${SMART_SRRT_P013_READONLY_APPROVED:-}" == YES ]] ||
    stop 'READONLY_APPROVAL_REQUIRED'
  ;;
 --deploy)
  [[ "${SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA:-}" == "$SOURCE_SHA" &&
     "${SMART_SRRT_P013_PRIOR_VERSION_REVIEWED:-}" == YES ]] ||
    stop 'SEPARATE_DEV_DEPLOY_APPROVAL_REQUIRED'
  ;;
 --rollback-version)
  [[ "${SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA:-}" == "$SOURCE_SHA" &&
     "${SMART_SRRT_P013_PRIOR_VERSION_REVIEWED:-}" == YES ]] ||
    stop 'SEPARATE_REMOTE_ROLLBACK_APPROVAL_REQUIRED'
  ;;
esac
if [[ "$MODE" != --verify ]];then
 [[ "${SMART_SRRT_P013_PRIOR_DEPLOYMENT_VERSION:-}" =~ ^[1-9][0-9]{0,7}$ ]] ||
   stop 'EXACT_PRIOR_DEPLOYMENT_VERSION_REQUIRED'
fi

cd "$REPO"
[[ "$(git branch --show-current)" == main ]] || stop 'MAIN_ONLY'
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || stop 'WORKTREE_DIRTY'
[[ "$(git remote get-url origin)" =~ (^|[/:])9GotStory/smart-srrt(\.git)?$ ]] ||
  stop 'WRONG_REPOSITORY'
git fetch --quiet origin main || stop 'REMOTE_MAIN_NOT_ATTESTED'
[[ "$(git rev-parse HEAD)" == "$SOURCE_SHA" &&
   "$(git rev-parse origin/main)" == "$SOURCE_SHA" ]] ||
   stop 'EXACT_SHA_MISMATCH'

# Source / data scope and private archive are checked in this isolated,
# READ-ONLY validator, which returns only status codes.
node --input-type=module - "$BACKUP" "$SOURCE_SHA" "$SCRIPT_ID" "$DEPLOY_ID" <<'NODE'
import {verifyP013PrivateSnapshot} from './tools/d331-p0-13-release-gates.mjs';
const [work,sourceSha,scriptId,deploymentId]=process.argv.slice(2);
const v=verifyP013PrivateSnapshot({work,sourceSha,scriptId,deploymentId});
if(v.package!=='NATIVE33_EXACT_PRIVATE_STAGE_PASS')throw Error('P013_HOLD');
NODE

if [[ "$MODE" == --verify ]];then
 echo "P013_PRIVATE_RELEASE_EVIDENCE=PASS; SOURCE_SHA=$SOURCE_SHA"
 echo 'NATIVE33=33_SOURCE_FILES; REMOTE_HEAD=UNCHANGED; DEPLOYMENT=UNCHANGED'
 echo 'CAN_DEPLOY=NO; D331_ENABLED=NO; NO_LIVE_CRUD=YES'
 exit 0
fi

# All clasp stdout/stderr stays in a restricted local directory, not the chat.
# Use the same ORIGINAL script/deployment; never run login/create-script.
if [[ "$MODE" == --deploy ]];then
 mkdir -m 0700 "$BACKUP/p013-remote-fresh"
 cp -- "$BACKUP/remote/.clasp.json" "$BACKUP/p013-remote-fresh/.clasp.json"
 (cd "$BACKUP/p013-remote-fresh" && "$CLASP" pull > "$BACKUP/p013-fresh-pull.log" 2>&1) ||
    stop 'FRESH_REMOTE_READ_FAILED_NO_PUSH'
 (cd "$BACKUP/p013-remote-fresh" &&
   "$CLASP" list-deployments > "$BACKUP/p013-fresh-deployments.txt" 2>&1 &&
   "$CLASP" list-versions > "$BACKUP/p013-fresh-versions.txt" 2>&1) ||
    stop 'FRESH_REMOTE_METADATA_FAILED_NO_PUSH'
 # Reject *any* change since the approved private backup, including file
 # additions/removals, manifest drift or deployment/version metadata.
 diff -qr --exclude=.clasp.json "$BACKUP/remote" "$BACKUP/p013-remote-fresh" >/dev/null ||
    stop 'REMOTE_SOURCE_DRIFT_NO_PUSH'
 cmp -s "$BACKUP/deployments.before.txt" "$BACKUP/p013-fresh-deployments.txt" ||
    stop 'REMOTE_DEPLOYMENT_DRIFT_NO_PUSH'
 cmp -s "$BACKUP/versions.before.txt" "$BACKUP/p013-fresh-versions.txt" ||
    stop 'REMOTE_VERSION_DRIFT_NO_PUSH'

 # Whole-project content replacement starts only after both independent gates.
 (cd "$BACKUP" && "$CLASP" show-file-status >p013-status-before.txt 2>&1) ||
    stop 'FILE_STATUS_FAILED_NO_PUSH'
 echo 'P013_REMOTE_MUTATION_STARTED=YES; DEPLOYMENT_UPDATE=NOT_YET_ATTEMPTED'
 (cd "$BACKUP" && "$CLASP" push >p013-push.log 2>&1) ||
    stop 'REMOTE_HEAD_PUSH_FAILED_RECONCILE_PRIVATE_BACKUP'
 echo 'P013_REMOTE_HEAD_PUSH=PASS; DEPLOYMENT_UPDATE=PENDING'
 # Existing Deployment ID, never a new deployment.
 (cd "$BACKUP" && "$CLASP" update-deployment "$DEPLOY_ID" \
   --description "Smart SRRT D331 OFF DEV $SOURCE_SHA" >p013-update.log 2>&1) ||
    stop 'DEPLOYMENT_UPDATE_UNKNOWN_HOLD_FOR_MANUAL_RECONCILIATION'
 (cd "$BACKUP" && "$CLASP" list-deployments >p013-deployments.after.txt 2>&1 &&
   "$CLASP" list-versions >p013-versions.after.txt 2>&1) ||
    stop 'DEPLOYMENT_UPDATED_POSTCHECK_FAILED'
 grep -Fq -- "$DEPLOY_ID" "$BACKUP/p013-deployments.after.txt" ||
    stop 'DEPLOYMENT_UPDATED_TARGET_NOT_LISTED'
 echo 'P013_EXISTING_DEV_DEPLOYMENT_UPDATE=REPORTED; BROWSER_UAT=NOT_TESTED'
 echo 'D331_ENABLED=NO; GOOGLE_SHEETS_WRITES=NO; PROD=NOT_CONFIGURED'
 exit 0
fi

# Restore the EXISTING deployment to an explicit PRIOR IMMUTABLE version.
# Deliberately does not overwrite mutable HEAD or use the backup to push
# old source automatically. This is separate from a complete source restore.
(cd "$BACKUP" && "$CLASP" list-deployments >p013-rollback-before.txt 2>&1 &&
 "$CLASP" list-versions >p013-rollback-versions.txt 2>&1) ||
 stop 'ROLLBACK_TARGET_METADATA_UNAVAILABLE'
grep -Fq -- "$DEPLOY_ID" "$BACKUP/p013-rollback-before.txt" ||
 stop 'ROLLBACK_EXISTING_DEPLOYMENT_NOT_FOUND'
# Version number was manually verified by the operator in original Deploy UI.
(cd "$BACKUP" && "$CLASP" update-deployment "$DEPLOY_ID" \
 --versionNumber "$SMART_SRRT_P013_PRIOR_DEPLOYMENT_VERSION" \
 --description "Smart SRRT DEV rollback approved $SOURCE_SHA" \
 >p013-rollback.log 2>&1) ||
 stop 'ROLLBACK_UPDATE_UNKNOWN_MANUAL_RECONCILIATION'
(cd "$BACKUP" && "$CLASP" list-deployments >p013-rollback-after.txt 2>&1) ||
 stop 'ROLLBACK_POSTCHECK_UNAVAILABLE'
grep -Fq -- "$DEPLOY_ID" "$BACKUP/p013-rollback-after.txt" ||
 stop 'ROLLBACK_EXISTING_DEPLOYMENT_NOT_LISTED'
echo 'P013_DEPLOYMENT_VERSION_REPOINT=REPORTED; REMOTE_HEAD_RESTORE=NOT_EXECUTED'
echo 'BROWSER_UAT=REQUIRED; GOOGLE_SHEETS_WRITES=NO'
