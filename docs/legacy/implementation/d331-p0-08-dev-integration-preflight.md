# Smart SRRT — P0-08 Development Integration Preflight

**Date:** 2026-10-18 · **Environment:** existing shared Development/Testing Smart SRRT Apps Script, Web App deployment and Google Sheets. No separate Production environment exists. Private canonical environment inventory: [Issue #189](https://github.com/9GotStory/smart-srrt/issues/189). Exact starting `main` SHA: `eaa29928b4dbcbf68b6aead2e87f116b1ba29d40`.

## Evidence collected directly (read-only)

1. Existing operator-designated native Google Sheets asset is accessible by the connected Google Drive account. File: **Smart SRRT P1 Staging - Mocking Data - 2026-10-06**. No IDs, credentials or private links are embedded in this document.
2. **17 existing tabs**, including ten original Smart SRRT tabs and seven Dengue 3-3-1 v2 tabs created in P0-04 (Issue #219).
3. All seven D331 header sequences match `src/dengue/07-p0-02a-mvp-schema-contract.gs`: **113/113 columns**, and bounded `A1:<last-column>2` reads returned no row 2 values on any of the seven.
4. P0-07 on `main` is source-only and its `D331_P007_ENABLED_` is false. It is **absent** from `tools/native-sources.mjs`. Google Drive alone **cannot attest** the actual Apps Script Script ID → Deployment ID parent relationship or current Script Property value. An accessible spreadsheet alone is not a live GAS backend test.
5. **No patient/event/user content rows were read, and no Sheets writes or Deploys were made in this preflight.**

## The P0-08 gated technical deliverable

`src/dengue/13-p0-08-dev-readonly-preflight.gs` adds one internal `d331P008CheckHeaders_()`, intentionally **not registered in Native manifest**, with these checks:

- Require a separately configured explicit Development Spreadsheet ID; never guess, fallback or create it.
- Compare the already configured existing `DATABASE_SPREADSHEET_ID` Script Property **read-only** to that pinned expected ID; reject mismatch before opening a spreadsheet.
- Open the existing database by exact ID; confirm its identity; check row-1 headers for existing `MainData` (39), `UserAccounts` (14), `AreaMaster` (10) and the seven v2 D331 tabs (113).
- Return a **status-only** result (no IDs or PHI), with `canWrite:false`, `canEnable:false`, `canDeploy:false`. No Session, grant, patient, domain data-row read or policy validation.

Offline `tests/d331-p0-08-dev-readonly-preflight.test.mjs` cover nominal and failure paths against mocked `PropertiesService` and `SpreadsheetApp`. CI in this PR cannot assert a real Apps Script runtime binding or exercise real user authentication.

## Next step for controlled Development-only synthetic CRUD

Actual `P0-07` writes **must remain HOLD** until the same old Apps Script project is verified **visually** in the editor and an intentionally bounded Development runtime package is authorized. Do not create a new script, deployment or spreadsheet. The Product Owner has confirmed all old resources must be reused, but that confirmation is not equivalent to API attestation. Owner/operator can verify in the existing project without executing code:

| Check (no raw ID copied to GitHub) | Evidence |
| --- | --- |
| `SCRIPT_ID_MATCH` | Project Settings → IDs agrees with private Issue #189 |
| `DEPLOYMENT_IN_EXISTING_SCRIPT` | Deploy → Manage deployments identifies existing Web App |
| `DB_PROPERTY_PRESENT` | Project Settings → Script properties includes `DATABASE_SPREADSHEET_ID` |
| `DB_PROPERTY_MATCHES_CANDIDATE` | Script Property equals verified Development Google Sheets |
| `TESTING_TOPOLOGY` | `SHARED_DEVELOPMENT_TESTING` as owner-designated and confirmed visually |

For a subsequently authorized synthetic write test: select an explicitly approved **synthetic EventID, synthetic user and narrowly scoped time-limited capability grant**; never borrow a real patient's EventID. Check private user account/session and disease mapping from the existing application. Record baseline row counts and ledger RequestIDs **without copying PHI into GitHub**, then run one `case` create followed by one exact RequestID replay (should not create a duplicate); optionally a staged plan/action/survey/followup chain. Verify each requested revision, each ledger PENDING→COMMITTED transition, and that five domain tables link to the same event/area. No global migrations, mass operations, notification side effects, public RPC or clinical deadline verdict.

**Failure/recovery rule:** if a RequestID remains PENDING, UNKNOWN or its ledger/domain disagree, **STOP**. Do not automatically delete, repeat with a new ID, promote to COMMITTED or overwrite domain data. Diagnose domain/ledger under the original developer account and retain a private evidence trail, then obtain operator approval for a specific reconciliation procedure. The 7-tab v2 Sheets database is not transactional; P0-07's ScriptLock only serializes writers that use that lock. Existing LIVE D331 grant registry is empty; do not issue a real grant as a side effect of this preflight.

**Remaining gate:** do not merge this source-only PR without separate Product Owner approval; future registration of P0-02A/P0-03B/P0-05/P0-06/P0-07/P0-08 dependency files, real DEV deploy, grant issuance, and writes require their own bounded authorization. Continue to prioritize the five agreed areas: Database, Backend, UI/UX, Security and Testing.
