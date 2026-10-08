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

- `PropertiesService.getScriptProperties()` maintains small report-job metadata (random UUID, EventID, owner ID/email, state, timestamps, sanitized result URL/message). No API keys, prompts, health narrative, session tokens or raw model responses are stored.
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
- A previously opened V4 browser tab may still use the old RPC until refreshed. Check whether legacy `generateReportFromWeb` direct calls should be sunset in a separately reviewed compatibility gate.
- Script instance termination may leave a stale `unknown` job until next status read. Do not infer absence of a registered document from an unknown client state; always use G-27 history.
