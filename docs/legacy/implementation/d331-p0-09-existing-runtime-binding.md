# Smart SRRT Dengue 3-3-1 — P0-09 Existing Runtime Binding Verification

**Date:** 18 Oct 2026 · **Scope:** Read-only existing Apps Script project/deployment lookup and operator binding attestation. **Not** a D331 release, property write, test-grant issuance, patient read, CRUD write, or deploy.

## Baseline and assets

Use the **same** old Script ID, Deployment ID and Google Sheets ID stored privately in [Issue #189](https://github.com/9GotStory/smart-srrt/issues/189). The Product Owner has already confirmed Development/Testing shares the existing assets and **Production is not configured**. Do not invent identifiers, copy them into a public issue, create a new project or force a new deployment.

**Read-only evidence already collected:** 17 original + new tabs are present in the existing shared Development sheet; seven v2 Dengue tabs have 113/113 ordered headers and no recorded row-2 contents, from connected Google Sheets API. GitHub `main@0d1c29b827d7c9fd0606eff4f6e8e6250363d414` has source-only CRUD/Preflight already merged; unregistered new GAS sources and all D331 feature switches remain off.

## P0-09 operator run (same Fedora environment with already authorized clasp v3)

The repository contains the existing `tools/h0-e2-deployments-readonly.mjs` for explicit OAuth-token-based GET inspection. **P0-09 does not need a token pasted or exposed:** the new `tools/d331-p0-09-runtime-deployment-readonly.mjs` uses the operator's **already logged-in `clasp`** to perform *only* `clasp --version` and `clasp list-deployments <existing-script-id> --json`. No Auth changes, script pull/push, Google Sheets mutations or remote function runs. The command compares the expected Deployment ID to results in memory and prints **only coarse status values**. Unknown/unsupported JSON shape, access failure or command changes produce HOLD.

From the checked-out repository and authenticated operator account:

```bash
cd /home/thanakorn/dev/smart-srrt
git fetch origin main
git switch feature/d331-p0-09-runtime-deployment-readonly-check
# Use the same private environment references already used by the
# existing guarded clasp script, without printing/pasting raw IDs:
# SMART_SRRT_SCRIPT_ID and SMART_SRRT_DEPLOYMENT_ID
export SMART_SRRT_P009_READONLY_APPROVED=YES
node tools/d331-p0-09-runtime-deployment-readonly.mjs --read-only
```

**Important:** The script does **not** auto-extract IDs from GitHub Issue #189; the operator must already have those environment variables privately configured. Never post raw IDs, console history containing secrets, `.clasprc.json`, access tokens, full deployment output, screenshots with patient information, or property values. Use a private local secrets facility rather than placing IDs in tracked files. Do not treat an error from clasp as permission to re-login or modify credentials without operator consent.

**Expected status-only results:**
```text
scriptDeploymentQuery=PASS
expectedDeploymentInScript=PASS
targetWebApp=PASS
scriptPropertyDbBinding=NOT_ATTESTED
permissionGrant=NOT_TESTED
liveCrud=NOT_TESTED
d331Activation=HOLD
```

The script can establish that the existing Deployment ID is listed under the existing Script ID via a read-only authenticated Apps Script deployment listing. It **cannot** establish which Spreadsheet the Apps Script runtime Script Property references, and it cannot verify session, grants, code version, browser UAT or 3-3-1 clinical policy. Google documents `projects.deployments.list` as a GET endpoint with `script.deployments.readonly` scope. `clasp` 3.x publishes `list-deployments` and a global JSON output option.

## Property and data confirmation (existing Apps Script UI, no code execution)

The only remaining Script Property fact is a visual read-only comparison within the **same existing project**:

1. **Project Settings → Script properties:** confirm `DATABASE_SPREADSHEET_ID` is present, and matches privately the exact existing Development spreadsheet recorded in Issue #189. Return only `DB_PROPERTY_PRESENT=PASS/FAIL/UNKNOWN` and `DB_PROPERTY_MATCHES_CANDIDATE=PASS/FAIL/UNKNOWN`; do not edit a property.
2. **Deploy → Manage deployments:** verify the existing Web App selected by the read-only check has the expected deployment access/owner. Do not edit or create deployments.
3. **No D331 live data write:** current grants registry is empty. A synthetic user, synthetic event in MainData and a narrow approved grant plus clinical disease allowlist/policy must be established under a distinct scoped gate before DEV CRUD execution. Do not borrow a patient's event or set D331 flags as part of verification.

## Next human gate and recovery

- `P0-09 SCRIPT_DEPLOYMENT=PASS` is only a read-only attestation; real `DB_PROPERTY_MATCHES_CANDIDATE=PASS` remains a **separate** operator fact.
- Before real Development CRUD: independently review GAS source order / Native registration, current deploy code, current account/grant scope, vector control timing, test data setup, spreadsheet date/number serialization, request ledger PENDING handling and rollback/restore. Do not claim Mock regression CI equals browser UAT.
- If the runtime check returns HOLD, stop and report only status classes. No auto repairs, token extraction, property edits, re-deploy, new scripts, grants or writes.
- P0-09 PR is **source-only** and requires separate Product Owner approval for Merge. Any Dev TEST deployment and synthetic write needs separate approval after full readiness.
