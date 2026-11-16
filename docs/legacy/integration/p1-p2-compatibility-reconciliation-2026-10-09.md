# P1–P2 Compatibility Reconciliation & P3–P4 Gate Disposition

Date: 2026-10-09 (Asia/Bangkok)  
Status: **P1/P2 BEHAVIORAL REHEARSAL PASS; INTEGRATION / RELEASE HOLD**  
Branch: `integration/g32-v8-main-preflight-20261009` | Draft PR #64.  
Authority main `043ddeffcc7f937e967ade4a6078101b0f544f96`; accepted G-32 V8 `e1f3c920b2bde3497f0850f188fe1bd025929731`.

## 1. Evidence and restrictions

GitHub Actions [run 37887370869](https://github.com/9GotStory/smart-srrt/actions/runs/37887370869), candidate `ec6f78386e3ed3565d094a330dec344dc60735e9`:
- 261 Node tests; **246 PASS, 15 FAIL**, no skipped tests.
- Deterministic modular-to-One-Click byte parity PASS.
- Syntax/RPC/duplicate declaration verification PASS.
- Offline P6 release preflight PASS.
- **P1: all existing tests PASS. P2: all existing tests PASS; new authenticated/public behavior tests PASS.**
- Remaining failures: **P3 8, P4 7**, listed below.
- CI/release is **FAIL/HOLD**, not a PR approval, an accepted V8 replacement, or authorization to access real data.

All changes belong to the isolated integration branch. Accepted G-32 V8 staging and original branch are unchanged. No merge, release, Apps Script deployment, Google Sheets/Drive migration, or Gemini call authorized.

## 2. P1: Preserve Event identity/revision and strict MasterData

**Problem:** original P1 `updateRecord resolves by EventID and increments Revision` failed because the old fake sheet context did not provide `PropertiesService`, reached indirectly through new V8 `validateEventMasterData_` -> `getActiveMasterValueSets_` -> `getSheet_`.

**Change:** in `tests/p1-event-integrity.test.mjs`, provide an *empty MasterData sheet fixture* to `getSheet_` for this update test; do not replace or suppress `validateEventMasterData_`, authorization, optimistic concurrency or audit calls.

**New negative/positive regression:** another P1 test checks a nonallowlisted changed `col5` is REJECTED, Revision and audit do not change; then checks an active MasterData value is accepted, Revision increments exactly once, and UPDATE_RECORD audit is written. P1 originals remain present and executed.

**Boundary:** this mock validates in-memory logic only; a real workbook with invalid MasterData or user ACL remains a separate fixture and deployment gate.

## 3. P2: Actual KPI defect found and fixed in authenticated web app

**Defect:** authenticated Dashboard in `src/web/04-browser-app.html` (compiled `Index_Smart_SRRT_OneClick.html`) used `allData.filter(r=>r.col26).length`, counting non-criteria investigated dates as numerator and falling back to all events for the denominator when no exact criteria existed. The browser insight's pending count also used `!r.col26` and treated whitespace-only dates as present. A prior integration-only correction of the public backend had already fixed the server-side numerator/denominator; authenticated and public KPIs consequently diverged.

**Fix, integration branch ONLY:**
- Filter `qualifying=allData.filter(r=>isInvestigationCriteriaMet(r.col17))`.
- `criteria=qualifying.length`; `investigated=qualifying.filter(r=>String(r.col26||'').trim()!=='').length`.
- `rate=criteria?Math.round(investigated/criteria*100):0`; do not fall back to total events.
- Insight's `pending` counts only qualifying records with blank/whitespace investigation date.
- Change **both** modular web source and compiled One-Click HTML; deterministic artifact parity confirmed by CI.

**Behavioral tests:** `tests/integration-p2-auth-dashboard-parity.test.mjs` executes the actual extracted `updateDashboard` JavaScript against public/authenticated mock contexts, including nonqualifying dated events, 50% rate, zero eligible denominator, whitespace date, anonymous branch, private-data redaction and authenticated RPC `view` guard. Existing `tests/integration-p2-kpi-contract.test.mjs` guards the public backend. Existing `tests/g23-kpi-criteria.test.mjs` gained stricter positive assertions for exact-criteria numerator and whitespace dates rather than silently losing coverage.

**Legacy test reconciliation:** `tests/p2-privacy-kpi.test.mjs` retained all six test cases and test intent. Assertions now target `buildDashboardAggregate_` instead of retired `aggregateEventRows_`, top-level public fields vs retired `summary.insight/charts`, sorted `[label,count]` arrays vs retired chart dictionaries, and browser branch-gating for public/authenticated RPCs. A client Excel export remains available **only after login**, with a concrete `if(!currentUser)` permission guard; the former blanket assertion that the function must not exist was replaced with gating/privacy assertions. Tests still verify no EventID, reporter email or incident narrative leaks into a public summary.

**Review caution:** passing these behavioral tests does not independently prove every browser UI state or live Apps Script authorization; a separate independent review and staging approval are required before exposing the correction.

## 4. Remaining 15 failures: do NOT paper over with aliases or skipped tests

| Group | Remaining assertions | Material incompatibility / required disposition |
|---|---:|---|
| P3 Workflow | 8 | Main P3 44 columns (WorkflowStatus, OwnerAssignedAt, closure metadata 39–44), while v7 expects OwnerUserID at 39 and RecordStatus closed/active. Need approved data preservation and lifecycle mapping, equivalent owner/close/reopen revision/permission behavioral tests, read-only derived lifecycle/consistency warning review. |
| P4 Governance | 7 | P4 11-column attachment/archive status, MasterData legacy CRUD, VisitLogs RequestParams, AuditArchive inline and ArchiveKey vs V8 13-column attachment/removed, policy-locked master types, sanitized VisitLogs and external AuditID year archive. Need approved retention semantics, permissions and exact mapping, not legacy RPC aliases. |

Priority:
1. **P3 source-of-truth and data correctness:** do not adopt the old 44-column structure into v7, and do not auto-map CLOSED to RecordStatus without closure provenance; assure EventID, Revision, void/closed separation, owner safety, and current v7 permission `close_event`. Preserve historical close details off-runtime pending approved evidence location/retention.
2. **P3 behavioral tests (offline):** build independent mock tests for `deriveEventLifecycle_`, `getEventConsistencyWarnings_` (current v7 name/shape), permission enforcement, close/reopen reasons, revision/audit and immutable EventID before altering old test expectations.
3. **P4 security priority:** verify strict G-11 permissions `edit` upload vs `delete` remove, and expectedRevision/reason. P4 `archived` is NOT v7 `removed`.
4. **P4 audit and privacy:** verify G-21 external archive ID, copy/verify/delete and retention; P4 `AuditArchive` and `ArchiveKey` are not v7 archive storage. G-29 must not resume logging raw RequestParams.
5. **P4 UI & MasterData:** confirm actual RPC signatures and stricter semantic-locked type policy, preserve inactive legacy values. No unauthenticated FileID, DriveUrl, audit payload or request parameters in browser.
6. Only after substantive behavior is proven may legacy P3/P4 tests be refactored to **equivalent or stronger** assertions (keep test names/coverage trace). No forced green by skip/delete.

See [P4-to-v7 design and synthetic prototype](p4-to-v7-migration-design-2026-10-09.md), plus [preflight risk inventory](g32-v8-main-preflight-2026-10-09.md). The synthetic planner always returns HOLD and is not permitted to receive real patient/workbook data.

## 5. Review and release boundaries

**Review requests still unanswered:** PR #64 had no independent review submission or assigned reviewer when checked at the beginning of this round. New fixes after the earlier Gate 1.1 Review Request require a reviewer to pin the latest SHA; a prior request is not an approval. The author must not approve their own work.

**Next supported step:** independent review of P1/P2 fix and offline Gate 1.1, then P3 behavioral validation plus separate P4 governance/migration design reconciliation in the isolated branch. The 15 failing P3/P4 tests remain a hard HOLD for PR #64. No main merge, production/staging deployment or live workbook migration.
