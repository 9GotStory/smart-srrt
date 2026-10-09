# G-32 — Report job tracking and cooperative cancellation

## Authority and boundaries

This adds owner-only task tracking and cancellation to the existing **G-31 Gemini 3.8 Flash ONLY** reporter, stacked on Draft PR #58. This is **not deployed** and must not be merged or promoted without separate review and test-site approval. Test-only existing Schema v7 and the Word-derived report template remain unchanged. **No installer, database migration, new Sheet, or Gemini test invocation** is needed to review this implementation.

## UI expectations

- **ปิดหน้าต่าง · ทำงานต่อ** hides only the modal. The RPC keeps running while the app page remains open, with a fixed status indicator that reopens the same job.
- The status indicator remains visible on success/failure until the user acknowledges it; the safe Docs link is displayed only after a server-confirmed `completed` status.
- **ยกเลิกการสร้าง** asks confirmation, sends `cancelReportJob` and displays `cancel_requested` while a Gemini request is still blocking. **Cancelled** only means the backend reached a checkpoint and stopped.
- A full tab close/reload does **not** guarantee the script survives browser disconnect. `getCurrentReportJob` / `getReportJobStatus` recover persisted last-known states for the same authenticated user. Unknown/stale execution states are never labelled success or cancellation. The user should inspect G-27 history before rerunning an uncertain task.
- This is not a general purpose background queue, push notification system, or scheduled persistent worker. Long-running RPCs remain constrained by Apps Script quotas and execution time.

## Server and safety model

- `PropertiesService.getScriptProperties()` maintains small report-job metadata (random UUID, EventID, opaque owner ID, state, timestamps, sanitized result URL/message). No API keys, prompts, health narrative, session tokens or raw model responses are stored.
- Every public RPC calls `requireAuth_(sessionToken,'report')` and status/cancel actions enforce exact matching owner ID and email. `createReportJob` checks non-void Event identity.
- A script-level lock protects state changes. **Only one report-generation job runs at a time across this Apps Script project** to prevent interleaving commits and heavy Gemini use under low free-tier limits. Same-owner repeated `createReportJob` returns the existing active job instead of making a second job.
- States: `queued`, `running`, `cancel_requested`, `finalizing`, `completed`, `cancelled`, `failed`, `unknown`. Stale non-terminal jobs are marked `unknown` after ~8 minutes. Job property retention ~24h and lazy cleanup on next creation; ReportRegistry is independent and remains append-only.
- Cancel is accepted while queued (instant stop) or running (pending until the next safe checkpoint). It cannot immediately interrupt `UrlFetchApp.fetch`; during `finalizing` or after `completed`, the server denies cancellation and preserves the report.
- Cooperative checkpoints precede/bisect the two model calls and start of document finalization. Only `models/gemini-3.8-flash` may run. `timeoutSeconds:110` caps the **per-call URL Fetch wait** according to Google Apps Script documentation, though wall-clock timing may vary and this is not an HTTP abort API.
- Once finalization begins, the job is committed to finishing or failing. Source document compensation and append-only ReportRegistry from G-17/G-31 remain authoritative.

## Deployment / acceptance gates

- Unit tests use fake PropertiesService/LockService/CacheService/UrlFetch, including permission denial, repeat start, queued cancellation, in-flight pending cancel, 503, one model only, late finalization, recovery UI and one-click parity.
- GitHub Actions build parity, complete node tests, syntax/RPC consistency and offline P6 preflight must pass.
- Human review security/race conditions and capacity assumptions before approving any manual overwrite of existing **test-only** `Code.gs` + `Index.html` and update of original `/exec` deployment. Existing V4 stays unchanged pending approval.
- Human UAT (one mock event, no repeated Gemini submissions): hide/reopen, observe task indicator, request cancellation while Gemini is processing, confirm terminal outcome with Execution logs and ReportRegistry. No claim that external API calls can be retroactively unbilled or forcibly terminated.

## Known limitations / follow-on review

- Script Properties have documented storage limits; this is a lightweight serialized task ledger, not high-throughput queue infrastructure.
- Client polling provides approximate stage statuses and does not imply percent completion.
- G-32 **rejects** legacy direct `generateReportFromWeb` calls without a server-only execution nonce. A previously opened V4 browser tab must be refreshed after the approved V5 deployment; stale legacy calls fail explicitly rather than creating uncancellable reports. The private nonce is never returned to the browser and cannot be reused after a job leaves `running`.
- Script instance termination may leave a stale `unknown` job until next status read. Do not infer absence of a registered document from an unknown client state; always use G-27 history.

## G-32 follow-up code review — 2026-10-08

This follow-up reviewed the stacked Draft PR with the original G-31 and P6 invariants. Code review findings and corrective tests:

1. **Authorization before mutation:** `reportJobOwned_` now validates the authenticated user ID before invoking stale-job expiry. Regression simulates a different user knowing an expired job UUID; the foreign user cannot release the active slot or alter status.
2. **Minimal ownership metadata:** the script-level ledger stores internal owner ID and EventID, but no account email, session token, prompt, API key or raw health narrative. These identifiers still require restricted Apps Script project access and retention discipline.
3. **Post-commit truthfulness:** once the new Google Doc and append-only ReportRegistry have committed, failure to write the success Audit row is logged as an explicit operational warning (with ReportID) without returning false report failure and inviting an accidental duplicate. **Operations must investigate and repair any missing Audit entry through a separately reviewed recovery process**; success of the Doc does not prove Audit completeness.
4. **Auth-safe client recovery:** a refreshed or relogged-in browser queries the authenticated server-owned `getCurrentReportJob` pointer rather than trusting a last-used localStorage ID from another user. It validates that the login session did not change while waiting for RPC.
5. **Job retention:** expired user pointers are cleaned after their backing job expires. Terminal job history in ReportRegistry remains independent of the temporary ScriptProperties tracking ledger.

The expanded offline test suite includes each above boundary. This is code inspection and mocked regression evidence, **not** a live cancellation test or a review by a separate human reviewer. Independent security review and owner-authorized V5 test deployment remain outstanding.

## G-32 V5 UAT corrective UX follow-up — 2026-10-09

The owner confirmed V5 minimize/reopen/cancel UAT **PASS** but identified two UX regressions:
- Native browser `confirm()` appeared instead of a branded cancellation confirmation.
- The Reporter page's AI report action stayed labelled `กำลังตรวจข้อมูล` after cancellation.

The corrective candidate (on this **Draft PR #60**, not yet deployed) replaces only the report-cancellation confirmation with an accessible `role="alertdialog"` / `aria-modal="true"` themed modal, keyboard Escape/Tab handling, explicit back/confirm buttons, in-flight RPC double-submit protection, and appropriate failure feedback. It restores the original Reporter button markup and enabled state unconditionally in `makeReport()`'s `finally` block, while long-running server state continues through the existing task chip. Other unrelated browser confirm dialogs remain out of scope.

Regression tests drive the actual extracted One-Click report browser code under a mocked DOM and simulate ready, warnings, failure to create job, terminal cancellation, confirmation back/escape, duplicate confirmation while pending, completed/late-terminal state and cancellation transport error.

**Existing V5 remains unchanged** until the Product Owner separately approves an updated test-only deployment (next version, expected V6). No spreadsheet migration, installer, manual Gemini retry or PR merge is authorized by these source fixes.