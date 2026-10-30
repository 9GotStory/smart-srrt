#!/usr/bin/env bash
# Existing synthetic-only DEV target. No automatic rollback or mutation retry.
set -Eeuo pipefail
umask 077
stop(){ echo "F02_DEV=HOLD; REASON=$1" >&2; exit 1; }
[[ $# -eq 1 ]] || stop EXACT_ONE_MODE_REQUIRED
MODE="$1"
[[ "$MODE" == --prepare || "$MODE" == --verify || "$MODE" == --deploy ]] || stop UNSUPPORTED_MODE
SOURCE_SHA="${SMART_SRRT_APPROVED_SOURCE_SHA:-}"
[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || stop SOURCE_SHA_REQUIRED
if [[ "$MODE" == --deploy ]];then
 [[ "${SMART_SRRT_F02_DEV_APPROVED_SHA:-}" == "$SOURCE_SHA" ]] || stop DEV_APPROVAL_REQUIRED
else
 [[ "${SMART_SRRT_F02_READONLY_APPROVED:-}" == YES ]] || stop READONLY_APPROVAL_REQUIRED
fi
REPO="${SMART_SRRT_REPO:-$HOME/dev/smart-srrt}"
WORK="${SMART_SRRT_F02_PRIVATE_BACKUP_DIR:-}"
CLASP="${SMART_SRRT_CLASP:-clasp}"
SCRIPT_ID="${SMART_SRRT_SCRIPT_ID:-}"
DEPLOY_ID="${SMART_SRRT_DEPLOYMENT_ID:-}"
[[ "$SCRIPT_ID" =~ ^[A-Za-z0-9_-]{20,200}$ && "$DEPLOY_ID" =~ ^[A-Za-z0-9_-]{20,200}$ ]] || stop ORIGINAL_TARGET_REQUIRED
[[ "${SMART_SRRT_F02_PRIOR_VERSION:-}" =~ ^[1-9][0-9]{0,7}$ ]] || stop PRIOR_VERSION_REQUIRED
[[ "$CLASP" =~ ^[A-Za-z0-9_./-]+$ && -d "$WORK" ]] || stop PRIVATE_WORKSPACE_REQUIRED
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO" || stop REPOSITORY_REQUIRED
[[ "$(pwd -P)" == "$TOOL_ROOT" ]] || stop TOOL_SOURCE_REPOSITORY_MISMATCH
for cmd in git node "$CLASP" diff cmp mkdir cp;do command -v "$cmd" >/dev/null || stop MISSING_BINARY;done
[[ "$("$CLASP" --version 2>/dev/null)" =~ ^3\. ]] || stop CLASP3_REQUIRED
[[ "$(git branch --show-current)" == main ]] || stop MAIN_ONLY
[[ -z "$(git status --porcelain)" ]] || stop WORKTREE_DIRTY
[[ "$(git remote get-url origin)" =~ (^|[/:])9GotStory/smart-srrt(\.git)?$ ]] || stop WRONG_REPOSITORY
git fetch --quiet origin main || stop REMOTE_MAIN_UNAVAILABLE
[[ "$(git rev-parse HEAD)" == "$SOURCE_SHA" && "$(git rev-parse origin/main)" == "$SOURCE_SHA" ]] || stop SOURCE_SHA_MISMATCH
GATE="$TOOL_ROOT/tools/d331-f02-dev-package.mjs"
if [[ "$MODE" == --prepare || "$MODE" == --verify ]];then
 node "$GATE" "$MODE" || stop PRIVATE_STAGE_INVALID
 exit 0
fi
node "$GATE" --verify || stop PRIVATE_STAGE_INVALID
# mkdir is the single-attempt lock. Never clear it or repeat a mutation on failure.
ATTEMPT="$WORK/f02-release-attempt"
mkdir -m 0700 "$ATTEMPT" || stop ATTEMPT_EXISTS_RECONCILE_NO_RETRY
state(){ printf '%s\n' "$1" > "$ATTEMPT/state.txt"; }
state PRE_PUSH_READS
mkdir -m 0700 "$ATTEMPT/fresh"
cp -- "$WORK/remote/.clasp.json" "$ATTEMPT/fresh/.clasp.json"
(cd "$ATTEMPT/fresh" && "$CLASP" pull >"$ATTEMPT/fresh-pull.log" 2>&1 &&
 "$CLASP" list-deployments >"$ATTEMPT/deployments.fresh.txt" 2>"$ATTEMPT/deployments.fresh.err" &&
 "$CLASP" list-versions >"$ATTEMPT/versions.fresh.txt" 2>"$ATTEMPT/versions.fresh.err") || stop FRESH_READ_FAILED_NO_PUSH
diff -qr --exclude=.clasp.json "$WORK/remote" "$ATTEMPT/fresh" >/dev/null || stop SOURCE_DRIFT_NO_PUSH
cmp -s "$WORK/deployments.before.txt" "$ATTEMPT/deployments.fresh.txt" || stop DEPLOYMENT_DRIFT_NO_PUSH
cmp -s "$WORK/versions.before.txt" "$ATTEMPT/versions.fresh.txt" || stop VERSION_DRIFT_NO_PUSH
node "$GATE" --verify || stop STAGE_DRIFT_NO_PUSH
state PUSH_STARTED
(cd "$WORK" && "$CLASP" --project "$WORK/f02.clasp.json" push >"$ATTEMPT/push.log" 2>&1) || stop PUSH_OUTCOME_UNKNOWN_RECONCILE
state PUSH_REPORTED
mkdir -m 0700 "$ATTEMPT/post-push"
cp -- "$WORK/remote/.clasp.json" "$ATTEMPT/post-push/.clasp.json"
(cd "$ATTEMPT/post-push" && "$CLASP" pull >"$ATTEMPT/post-push-pull.log" 2>&1) || stop POST_PUSH_READ_FAILED
node "$GATE" --check-pushed || stop PUSHED_BYTES_UNVERIFIED
state VERSION_CREATE_STARTED
(cd "$WORK" && "$CLASP" --project "$WORK/f02.clasp.json" --json create-version "F02 synthetic DEV $SOURCE_SHA" \
 >"$ATTEMPT/version.created.json" 2>"$ATTEMPT/version.created.err") || stop VERSION_OUTCOME_UNKNOWN_RECONCILE
NEW_VERSION="$(node "$GATE" --new-version)" || stop VERSION_RESULT_INVALID
export SMART_SRRT_F02_NEW_VERSION="$NEW_VERSION"
state VERSION_REPORTED
mkdir -m 0700 "$ATTEMPT/immutable"
cp -- "$WORK/remote/.clasp.json" "$ATTEMPT/immutable/.clasp.json"
(cd "$ATTEMPT/immutable" && "$CLASP" pull --versionNumber "$NEW_VERSION" >"$ATTEMPT/immutable-pull.log" 2>&1 &&
 "$CLASP" list-deployments >"$ATTEMPT/deployments.pre-update.txt" 2>"$ATTEMPT/deployments.pre-update.err") || stop IMMUTABLE_READ_FAILED
node "$GATE" --check-immutable || stop IMMUTABLE_BYTES_UNVERIFIED
cmp -s "$WORK/deployments.before.txt" "$ATTEMPT/deployments.pre-update.txt" || stop DEPLOYMENT_DRIFT_NO_UPDATE
state DEPLOYMENT_UPDATE_STARTED
(cd "$WORK" && "$CLASP" --project "$WORK/f02.clasp.json" update-deployment "$DEPLOY_ID" --versionNumber "$NEW_VERSION" \
 --description "F02 synthetic DEV $SOURCE_SHA" >"$ATTEMPT/update.log" 2>&1) || stop DEPLOYMENT_OUTCOME_UNKNOWN_RECONCILE
state DEPLOYMENT_UPDATE_REPORTED
(cd "$ATTEMPT/immutable" && "$CLASP" list-deployments >"$ATTEMPT/deployments.after.txt" 2>"$ATTEMPT/deployments.after.err") || stop POST_UPDATE_READ_FAILED
node "$GATE" --check-final || stop POST_UPDATE_INVENTORY_UNVERIFIED
state SOURCE_AND_DEPLOYMENT_VERIFIED
printf 'F02_DEV=SOURCE_AND_DEPLOYMENT_VERIFIED; DEPLOYMENT_VERSION=%s; BROWSER_UAT=NOT_VERIFIED\n' "$NEW_VERSION"
