# G-33 / Issue #66 — One AI report action per Event

Date: 2026-10-09 (Asia/Bangkok)  
Status: **Implementation candidate on isolated stacked branch; CI PASS; independent review / UAT / release HOLD**  
Branch: `feat/issue-66-single-report-action`  
Base: `integration/g32-v8-main-preflight-20261009` at `2c8525ebfbf9f04eb4fa9d26f3e0ff01ed0b42a6` (Draft PR #64)

## Product decision

Both authenticated Event and AI Reporter tables expose **one report action per row**. Remove the separate per-row `ประวัติรายงาน` button without removing the authenticated G-27 history modal or prior report records.

| Grounded state | Primary action |
| --- | --- |
| Confirmed zero registered reports | `สร้างรายงาน AI` in both authenticated tables |
| One registered report | `ดูรายงาน` opens G-27 modal |
| Several registered reports | `ดูรายงาน (N)` opens G-27 modal with all eligible reports |
| Same Event's G-32 job running / queued / cancel requested / finalizing | Retain detailed in-progress button and reopen behavior |
| Another Event's G-32 job active | Preserve existing disabled/busy control |
| Summary read pending/failed, registry corrupt, unknown job state | Show verification action; do not initiate generation from the primary button |

In the G-27 report modal, offer `สร้างรายงานฉบับใหม่` only if there are registered reports confirmed by the read-only endpoint. Display explicit confirmation that the new Google Doc / ReportID is append-only and old files remain. Revalidate existing report history before intentional new generation; apply existing G-26 readiness checks and G-32 server-guarded job creation.

The notice `ข้อมูลเหตุการณ์มีการปรับปรุงหลังสร้างรายงานล่าสุด` appears when current Event Revision exceeds latest SourceRevision. An unchanged revision does not prevent a deliberate new draft.

## Source of truth and data model

- **G-17 `ReportRegistry`** remains authoritative for registered, successfully generated reports. G-32 ScriptProperties jobs provide transient execution status, not report history.
- New read-only RPC `getReportSummariesForEvents(sessionToken, eventIds)` requires existing `report` permission and checks the requested EventIDs against the non-void authenticated Event universe.
- At most 500 requested EventIDs per batch. Server reads ReportRegistry header and rows once for the requested set; does not send raw registry rows, document URLs, source narrative, Prompt or Gemini content in summaries. Returns `{summaries: { [EventID]: {count, latestSourceRevision, invalidCount} }}`.
- Missing/wrong registry headers, invalid/duplicate matching ReportIDs, blank document IDs, unsupported SourceRevision and invalid Event identifiers cause a fail-closed error rather than fabricated zero reports. G-27 full history still performs its own URL safety validation.
- No `MainData` columns, new Sheet, v7 Schema migration, modification/deletion of existing registry rows or document replacement. Public dashboard remains unrelated to `ReportRegistry`.
- Browser performs one bounded report-summary RPC per group of up to 500 EventIDs (no per-row N+1); only publishes complete results after every batch succeeds. The summary is refreshed after server-confirmed completion and dashboard refresh. Request/session guards prevent stale responses across filters, logins, and logouts.
- A **first-generation** button click rechecks G-17 history for its EventID before starting G-26 readiness. If another user registered a report meanwhile, the action becomes `ดูรายงาน`, not unintended regeneration. Readiness warning continuation also rechecks registry to avoid a second unintentional report after a delayed confirmation.
- Deliberate `สร้างรายงานฉบับใหม่` from G-27 history carries explicit consent through the readiness-warning continuation, so a confirmed regeneration remains possible while prior reports are retained. All generation still goes through G-32 server job guards.
- EventID is never interpolated into executable `onclick` source: the escaped `data-report-event-id` attribute is read through `this.dataset.reportEventId`.
- An `unknown` execution state is **not** interpreted as a failure; the UI refuses implicit regeneration and continues to show verification guidance. The persistent job system and permissions stay the final server authority.
- Starting G-32 `createReportJob` is guarded by a **single in-flight client request lock**. While its RPC is pending the report control remains busy. If that RPC throws or times out, the page treats server acceptance as **unknown**, blocks all new create attempts, and requires an authenticated `getCurrentReportJob` recovery check before permitting another attempt. A stale previous-session callback must not alter a new session. This is additional browser protection, not a replacement for the existing G-32 server idempotency guard.

## Acceptance tests / verification

- G-27 test updated to assert two consolidated table actions without standalone history buttons.
- Existing G-32 test harness retains in-flight, cancelled, failed, completion and same/other-event behavior; successful completion requires registry summary reconciliation.
- New `tests/g33-single-report-action.test.mjs` covers empty/one/many summaries, SourceRevision ordering, malformed/duplicate registry rows, permission and 500-ID guard, 501+ Event batching and partial-failure, G-32 status uncertainty, stale dashboard/auth callbacks, safe EventID markup, fresh first-generation preflight, delayed warning consent, and G-27 explicit append-only report creation.
- GitHub Actions at code/test commit `7ac5a9f8433fe084812d2d03f49b9e99be180d79` passed **324/324 tests** on Node 24 with One-Click parity, contract and offline P6 preflight. The additional 3 regression cases cover simultaneous create calls, an uncertain network result and stale session callbacks. **Revalidate CI at the final PR HEAD**, including documentation-only commits.
- `npm run build:check` checks exact modular-to-One-Click server and HTML parity.
- `npm run check:contracts`, `npm run release:preflight` and `npm test` must pass at the **final PR HEAD**.
- **No live Apps Script/Google Sheets/Gemini/test-workbook operation or deployment** was done for this implementation. Actual browser accessibility/mobile UAT, operator checks and final independent review are still required before release.

## Dependency and release boundary

This is **a new stacked Draft PR targeting the integration branch**, not a change to reviewed PR #64, main or the separately accepted G-32 V8 branch. Its upstream baseline is still Draft and its release/migration gates are still HOLD. This candidate may be technically green without any authority to merge, migrate real historical P4 records, or deploy staging/production.

Issue #66 may be considered *implemented in a review candidate* once CI is green; retain the Issue open pending independent technical review, user-approved test UAT and subsequent separately authorized release decisions.
