# Smart SRRT — P0-26: Existing DEV Web App Mock-only Deployment Readiness

**Status:** PREPARATION COMPLETE (source evidence); **DEPLOYMENT EXECUTION = HOLD**.  
**Source baseline:** `main@6961de507e2dcc03c1aaf92000f1ed4eacffe0f4` (P0-25 Squash merged, [post-merge CI 39357223047](https://github.com/9GotStory/smart-srrt/actions/runs/39357223047) success: 64/64 contracts; 1003/1003 regression; 8/8 P0-25 tests).  
**Scope:** DEV/TEST **existing** Smart SRRT Apps Script, **existing** Web App Deployment, **existing** Google Spreadsheet, login, Records. No Production environment. This file is a *documentation-only readiness gate*, not permission to run a deploy.

## 1. Exact safe feature scope

P0-25 placed a **purely synthetic, in-memory** Event→Case list/add/edit demo within the **existing Records disclosure** `d331-p018-preview`, in host `d331-p024-region`, using already-registered `src/web/03h-client-event-records.html` and generated `01-styles.html` (authored `src/styles/shared-ui.css`). The unregistered canonical `03m-client-d331-mvp01-offline.html` has exact style/script parity tests. No new page, module registration, backend API, grant, patient-Case reader or persistent storage is activated.

`tools/native-sources.mjs` is still **8 GS + 17 HTML** (26 files including Index), and `src/web/03l-client-d331-status.html` remains byte-for-byte unchanged. The D331 server-side case reader is **UNREGISTERED**; `D331_P022B2_ENABLED_=false`, `D331_P022B2_REVOCATION_APPROVED_=false`, `D331_P022B2_APPROVED_FIELDS_=[]`. The UI declares `slaAssessment='NOT_EVALUATED'`; it does **not** assert 3-3-1 compliance.

**What a separately deployed DEV build would change:** eligible existing Records UI users can open the clearly-labelled **Mock-only / D331 OFF** Case demo; synthetic add/edit modifies browser memory only and is reset on preview close/account/logout. **What must not change:** real Event/Case reads, Google Sheets, current login/roles/grants, Public Library, AI Reporter, report prompts/exports, clinical policy, and any new Production or Google assets.

## 2. Evidence matrix — keep owner attestation distinct from independent API evidence

| Gate | Finding | Required next proof / stop rule |
| --- | --- | --- |
| P025 code, Release & CI | **PASS**: exact merged `main`; 64/64 Contract, 1003/1003 full regression including mock interaction/parity; no Native26 topology change | Recheck `main`/CI SHA immediately before any operator action; if HEAD moved, **HOLD** and re-review |
| Existing Script ID / Deployment ID / DB Script Property | **PASS OWNER-REPORTED VISUAL**, from [private Issue #189](https://github.com/9GotStory/smart-srrt/issues/189), 18 Oct 2026: `SCRIPT_ID_MATCH`, `DEPLOYMENT_IN_EXISTING_SCRIPT`, `DB_PROPERTY_PRESENT`, `DB_PROPERTY_MATCHES_CANDIDATE` all PASS | Do **not** ask again for existing IDs, include them in this document, or mislabel operator's UI attestation as an independently queried Apps Script API |
| Independent existing-Deployment API metadata | **NOT PERFORMED** | Optional narrowly authorized read-only `clasp list-deployments --json` via existing `tools/d331-p0-09-runtime-deployment-readonly.mjs`, status-only output. Unknown API shape/permissions are **HOLD**, not a reason to switch Scripts |
| DB spreadsheet metadata | **PASS (previous bounded read)**: 17 tabs total; MainData 39/39, UserAccounts 14/14, AreaMaster 10/10; seven Dengue tabs 113/113 ordered headers; no patient rows read | Do not repeat patient-row access, grant creation or metadata modifications merely for UI mock deployment |
| Existing Deployment current version / backup / rollback | **HOLD OPERATOR PREFLIGHT**. Last operator-attested DEV Web App **Version 19**; not freshly read from live Deployment API | Inspect existing deployment inventory/current version and verify old immutable version, backup root and restore/rollback route before any update. No assumption of a successful backup until actual output is recorded |
| Security / Privacy / Clinical / CaseID policy | **HOLD FOR LIVE D331**. Mock UI uses only existing Records *visibility* role; not D331 authorization | No real EventID, case-read, grants, revocation, patient DTO, clinical labels, SLA, Google Sheets CRUD, production release |

## 3. Two distinct operator steps — do not conflate read-only status with deployment approval

**A. Optional Script↔Deployment GET-only attestation (not run during P0-26).** In the *existing authorized operator environment*, with privately configured `SMART_SRRT_SCRIPT_ID` and `SMART_SRRT_DEPLOYMENT_ID`, and only with its own read-only approval:

```bash
cd /home/thanakorn/dev/smart-srrt
git switch main
git fetch --quiet origin main
git pull --ff-only origin main
test "$(git rev-parse HEAD)" = "6961de507e2dcc03c1aaf92000f1ed4eacffe0f4" || exit 1
export SMART_SRRT_P009_READONLY_APPROVED=YES
node tools/d331-p0-09-runtime-deployment-readonly.mjs --read-only
```

This is **GET-only** and reports no raw identifiers. It cannot inspect the DB Script Property; that fact is already owner-reported from the existing project settings. Do **not** run `clasp login`, alter auth, create a new project, or change Script Properties in response to failure. Return **only** status flags such as `scriptDeploymentQuery`, `expectedDeploymentInScript`, `targetWebApp`, `scriptPropertyDbBinding`. If any returned identity status is FAIL/UNKNOWN, STOP. If no private operator environment is present, record `API_ATTESTATION=NOT_PERFORMED`, not PASS.

**B. Existing G-34 source/backup preflight (NOT EXECUTED in this review).** This is a **separate owner-authorized operator run**, not identical to A. Existing `tools/deploy-g34-clasp.sh --preflight` validates exact approved `main`, clean checkout, clasp v3, origin, local/offline tests and Native26 stage; it then performs *read-only remote* `clasp pull` into a **local private timestamped backup**, lists deployments/versions, verifies the current V8 manifest, expected parent Deployment, source/Index allowlist and a repo-external rollback snapshot. It makes **no remote push or deployment update** in this mode.

It requires exact `SMART_SRRT_APPROVED_SOURCE_SHA`, `SMART_SRRT_SCRIPT_ID`, `SMART_SRRT_DEPLOYMENT_ID` privately set and independent authorization to access remote source. Its preflight evidence is **not yet available**; do not claim `PREFLIGHT=PASS` from source tests. The only acceptable eventual output is status-only:
```text
SOURCE_SHA=<exact approved main SHA>
BACKED_UP_NATIVE_26_LAYOUT=PASS
SOURCE_ENTRYPOINTS=PASS
REMOTE_MANIFEST_V8=PASS
STAGE=PASS (26 files + preserved manifest; ordered script files)
SCRIPT_AND_EXISTING_DEPLOYMENT_VERIFIED=PASS
PREFLIGHT=PASS; remote source and deployment unchanged
BACKUP_VERIFIED=PASS (separate operator inspection)
ROLLBACK_TARGET_VERIFIED=PASS (separate operator inspection)
```

Never paste IDs, tokens, patient data, private backup paths, raw `clasp pull` contents, `deployments.before.txt` or full Script Properties into an Issue/chat. Retain backup and deployment/version evidence privately. If the old Script remote is **not** recognized as a known exact Native26/25/24/13/legacy layout, **STOP and review separately**; do not weaken guardrails.

**Do not run `--deploy` now.** That mode calls `clasp push` and `clasp update-deployment` on the existing deployment, requiring a **new explicit approval** with approved exact SHA and separately provided `SMART_SRRT_CONFIRM_DEPLOY`. Never use `create-deployment`; do not update a different Deployment ID. A successful preflight does **not** itself grant deployment permission.

## 4. Browser UAT — future DEV-only, mock-only after separately approved existing-Deployment update

In the same, explicitly selected existing DEV `/exec` deployment, confirm expected version and baseline first; use only already-authorized test login/roles and the fixed in-browser fake Cases. Do not invoke any real Dengue Google Sheets CRUD to validate a mock.

| Test | Acceptance evidence (PASS / FAIL / NOT_RUN) |
| --- | --- |
| 1. Login / Logout | Existing login/logout intact; no new login or route. On logout synthetic draft/Case UI is cleared |
| 2. Existing Records | Existing list/filter/detail/actions unchanged; current Records permissions and loading remain intact |
| 3. Mock disclosure | Within Records open existing `Dengue 3-3-1` preview; visible **Mock-only / D331 OFF** label; no clinical claim |
| 4. Add/edit fake Case | Local Case list, add, form validation, edit, revision increment and Cancel/Reset all work; **no actual EventID or patient fields** |
| 5. Pending state | While fake save is pending, spinner/status or text shows work and duplicate submission is prevented |
| 6. Session fencing | Close/reopen preview and logout/account/role change invalidate drafts and stale asynchronous save |
| 7. Dashboard/Reporter/Admin/Library | Original charts, reports, admin and public content regressions PASS; fake Cases do not appear in reports or exports |
| 8. Responsive / security smoke | Mobile and desktop readable; no live Dengue RPC; D331 actual reader OFF, no mutation to real Google Sheets; no visible patient identifiers |

**Browser UAT is NOT RUN.** The Node VM/fake DOM tests and current GitHub CI are not evidence of an updated running Web App. Stop on unexpected network/RPC to Dengue handlers, changes to real data, wrong deployment/version, auth regressions, JS errors, or unexpected feature flags. Capture only redacted PASS/FAIL and synthetic screenshots.

## 5. Rollback and handoff format

Before any later authorized change, record the existing Deployment version and immutable rollback option plus validated backup/restore source, operator owner and isolated release SHA. On any failed browser smoke or remote update, **HOLD**, stop all further writes, preserve logs/backup privately, and restore the **same existing Deployment ID** to the owner-verified prior version using the separately approved recovery procedure. `tools/deploy-g34-clasp.sh` **does not auto-rollback**, and a preflight backup does not prove rollback has been tested.

Status-only handoff for [MVP parent #215](https://github.com/9GotStory/smart-srrt/issues/215) and [Case policy #238](https://github.com/9GotStory/smart-srrt/issues/238):

```text
P026_SOURCE_SHA=6961de507e2dcc03c1aaf92000f1ed4eacffe0f4
P026_SOURCE_CI=PASS_64_1003
P026_NATIVE_MANIFEST=UNCHANGED_8GS_17HTML
P026_EXISTING_BINDING=OWNER_VISUAL_PASS
P026_INDEPENDENT_APPS_SCRIPT_API=NOT_PERFORMED
P026_OPERATOR_REMOTE_PREFLIGHT=NOT_RUN
P026_BACKUP_ROLLBACK_ATTESTATION=HOLD
P026_BROWSER_UAT=NOT_RUN
P026_D331_LIVE_DATA=OFF
P026_GOOGLE_SHEETS_WRITES=NO
P026_DEV_DEPLOY=NO
P026_DEPLOY_AUTHORIZATION=NOT_GRANTED
P026_READINESS=PARTIAL_PASS_HOLD
```

**Product Owner approval gates remain separate:** (1) docs-only Source Merge of this plan; (2) read-only/backup preflight on the existing operator machine; (3) explicit scoped existing-DEV Deployment update; (4) Browser UAT. None grants live D331 Patient CRUD or clinical/privacy/security policy approval.
