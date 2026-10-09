# G-33 / Issue #66 — One AI report action per Event

Date: 2026-10-09 (Asia/Bangkok)  
Status: **Implementation candidate on isolated stacked branch; CI PASS; independent review / UAT / release HOLD**  
Branch: `feat/issue-66-single-report-action`  
Base: `integration/g32-v8-main-preflight-20261009` at `2c8525ebfbf9f04eb4fa9d26f3e0ff01ed0b42a6` (Draft PR #64)

## Product decision

Both authenticated Event and AI Reporter tables expose **one report action per row**. Remove the separate per-row `ประวัติรายงาน` button without removing the authenticated G-27 history modal or prior report records.

| Grounded state | Primary action |
| --- | --- |
| Confirmed zero registered reports | `สร้างรายงาน AI` (compact `AI` in Event list) |
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
- Browser performs one summary RPC for a visible authenticated Event table (no per-row N+1); reloads after server-confirmed job completion and dashboard refresh. Session/request nonce prevents stale async summary from replacing a later login/refresh.
- An `unknown` execution state is **not** interpreted as a failure; the UI refuses implicit regeneration and continues to show verification guidance. The persistent job system and permissions stay the final server authority.

## Acceptance tests / verification

- G-27 test updated to assert two consolidated table actions without standalone history buttons.
- Existing G-32 test harness retains in-flight, cancelled, failed, completion and same/other-event behavior; successful completion requires registry summary reconciliation.
- New `tests/g33-single-report-action.test.mjs` covers empty/one/many summaries, timestamp/source revision selection, missing schema, malformed/duplicate/invalid registry rows, permission and 500-ID guard, one batched RPC, fail-closed browser state and the G-27 modal/new-report confirmation structure.
- `npm run build:check` checks exact modular-to-One-Click server and HTML parity.
- `npm run check:contracts`, `npm run release:preflight` and `npm test` must pass at the **final PR HEAD**.
- **No live Apps Script/Google Sheets/Gemini/test-workbook operation or deployment** was done for this implementation. Actual browser accessibility/mobile UAT, operator checks and final independent review are still required before release.

## Dependency and release boundary

This is **a new stacked Draft PR targeting the integration branch**, not a change to reviewed PR #64, main or the separately accepted G-32 V8 branch. Its upstream baseline is still Draft and its release/migration gates are still HOLD. This candidate may be technically green without any authority to merge, migrate real historical P4 records, or deploy staging/production.

Issue #66 may be considered *implemented in a review candidate* once CI is green; retain the Issue open pending independent technical review, user-approved test UAT and subsequent separately authorized release decisions.
