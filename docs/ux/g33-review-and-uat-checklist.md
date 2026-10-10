# G-33 / Issue #66 — Review and browser UAT checklist

Date: 2026-10-09 (Asia/Bangkok)  
Status: **CANDIDATE ONLY; independent review and authorized test-site UAT PENDING**  
Draft PR: https://github.com/9GotStory/smart-srrt/pull/67  
Dependency: Draft PR #64 (integration baseline `2c8525ebfbf9f04eb4fa9d26f3e0ff01ed0b42a6`).

## Required independent code review before UAT

This checklist is **not** an independent review submission. The GitHub PR author/corrective implementer must not treat their own inspection or green CI as independent approval. Check the **exact reviewed SHA** against PR #67 HEAD.

- [ ] Compare the PR #67 diff only against the pinned integration baseline, not main; confirm PR #64, its accepted G-32 V8 branch and main are unchanged.
- [ ] Review G-27 authenticated history and G-33 summary RPC permissions, EventID allowlists, strict ReportRegistry headers and corrupt-record handling; ensure the public aggregate remains free of history metadata.
- [ ] Review `getReportSummariesForEvents` on zero, one, many, and **more than 500** visible EventIDs: one bounded server RPC per chunk, no per-Event N+1 RPC, no partial publishing after a later chunk fails. Consider the performance cost of scanning ReportRegistry/MainData once per chunk.
- [ ] Review browser asynchronous session switching/logout/refresh, stale callback suppression, history modal event identity, and G-32 recover-job status. A network failure or an `unknown` job must never cause implicit re-generation; **read-only existing registered report history must remain accessible**.
- [ ] Review `createReportJob` RPC during the window before its job pointer is returned: assert the UI permits **exactly one pending create call**; if response is lost or times out, preserve UNKNOWN / verify-only status until `getCurrentReportJob` explicitly confirms the server state. Test old-session callbacks cannot update the next user's job state. A rejected RPC is **not** proof that a job was never queued.
- [ ] Review explicit `สร้างรายงานฉบับใหม่` authorization, latest-history revalidation, duplicate-submit lock and cancellation/focus behavior. Generating a new report intentionally must be append-only; it must not erase a historical ReportID, overwrite a Doc or increment Event Revision.
- [ ] Review **fresh registry revalidation on the first-generation button**: when another user registered a report after the table loaded, clicking the old create label must redirect to viewing existing history rather than silently creating the next document. Recheck again after delayed G-26 readiness warnings; make sure intentional new-report consent from G-27 history survives the warning route without creating documents unintentionally.
- [ ] Review data attribute escaping and prove EventID cannot break an inline JS click handler. Check compact labels in both authenticated tables remain unambiguous (`สร้างรายงาน AI`).
- [ ] Review warnings for newer Event Revision, invalid Google Docs URL display, multiple history entries, malformed/duplicate registry rows and inaccessible old documents.
- [ ] Independently run `npm run build:check`, `npm run check:contracts`, `npm run release:preflight`, `npm test` with exit codes and report test count at **the current SHA**; classify `git diff --check` warnings truthfully, with any policy waivers explicit.
- [ ] Record every finding with severity, path:line, reproduction, correction owner and PASS/REWORK verdict. **No merge/deploy/migration approval follows solely from this review.**

## Browser UAT — execution requires separate operator permission

**Do not automatically operate Google Apps Script, real Sheets/Drive or Gemini from this checklist.** An authorized operator must first identify the correct existing *test-only* instance, confirm the approved revision and isolated mock data, backup and return path, data access rights, and whether report generation/Gemini usage is specifically permitted. Do not create a second test environment implicitly. Do not expose API keys, health narrative or document URLs in public GitHub evidence.

- [ ] Open authenticated Events table on desktop and mobile. **Exactly one** AI report action is visible per Event; **no standalone** `ประวัติรายงาน` button.
- [ ] Open AI Reporter table. The same one-button rule applies; compare controls for the same Event in both views.
- [ ] For Event with **confirmed no G-17 registry record**: button `สร้างรายงาน AI`; no automatic generation occurs on page load.
- [ ] Simulate a second authorized account registering the Event's first report after the first user's dashboard loads; the first user's stale `สร้างรายงาน AI` click must verify registry and switch to `ดูรายงาน`, not generate a second report.
- [ ] Keep a G-26 readiness-warning dialog open while a synthetic report is registered by another account; continuing must refuse implicit generation. A separately confirmed `สร้างรายงานฉบับใหม่` through G-27 history must preserve deliberate consent through the same warning path (use mocks; do not invoke Gemini).
- [ ] For Event with **one valid record**: `ดูรายงาน`; opens G-27 modal displaying report metadata and an appropriately validated Google Docs link.
- [ ] For Event with **multiple valid records**: `ดูรายงาน (N)`; modal lists previous independent ReportIDs in descending generation time, preserves older reports.
- [ ] When Event Revision advanced after report creation: show explanatory notice without deleting or pretending the original report was revised.
- [ ] `สร้างรายงานฉบับใหม่` exists **inside** the report modal, never as a second table action. Confirmation clearly promises a separate Google Doc/ReportID; Cancel/Escape/Tab and repeated-click behavior are predictable and accessible. **Do not click final generation approval unless Gemini test creation is separately authorized.**
- [ ] Test G-32 `queued/running/cancel_requested/finalizing` control display and reopening using approved test-only workflow or mocks. Existing cancellation and result indicators remain functional.
- [ ] Simulate **unknown/stale job**, failed `getCurrentReportJob`, and failed report registry summary requests with mocks (no actual AI calls): no button inadvertently creates a new report, and verified older reports can still be opened read-only.
- [ ] Test more than 500 EventIDs with a synthetic mocked list (if available); second-batch failure must not mark some Events `0 reports` incorrectly.
- [ ] Confirm role-based denial and logout/session switch prevent report metadata leaking to public view, and do not display stale previous-session callbacks.
- [ ] Confirm the test result status and link are correct; a failed/cancelled/unknown job is not falsely marked as a successful new registered document.

## Explicit gate record

```
REVIEW_SHA: <actual PR #67 HEAD reviewed>
INDEPENDENT_REVIEWER: <distinct reviewer or honestly "NOT DONE">
REVIEW_VERDICT: PASS | REWORK | PENDING
REGRESSION_TESTS: <command, count and exit status>
UAT_INSTANCE: <test-only reference, no sensitive IDs in public notes>
UAT_AUTHORIZED_BY: <operator identity, via approved channel>
BROWSER_UAT: PASS | FAIL | NOT_RUN
G33_RELEASE: HOLD
PR_67_MERGE: HOLD
PR_64_INTEGRATION_RELEASE: HOLD
HISTORICAL_P4_MIGRATION: HOLD
```

Implementation and automated test success are **not** permission to touch staging, production, Google Workspace, Gemini, or historical records. Review outcomes and user-authorized UAT must be recorded as separate gates.
