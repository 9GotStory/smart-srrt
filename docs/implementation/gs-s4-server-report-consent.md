# GS-S4 — Server-side Report Regeneration Consent

**Status:** source-only candidate (not merged, not deployed), 12 October 2026.  
**Base:** `main@4cb18cee7db1e814b6d4c85fc395d5a363b19c06` (GS-S3 Post-Merge PASS).  
**Review:** ChatGPT (author-assisted, not independent).

## Risk closed in source

Previously the UI consulted `getReportSummariesForEvents`, displayed a confirmation dialog in G-27 history, and called `createReportJob(sessionToken,eventId)`. However the server create endpoint did not independently check existing registered reports or require authenticated regeneration consent, permitting a direct RPC caller (or stale UI) to create a second document without the intended history confirmation.

**GS-S4 adds a short-lived server-issued, owner/Event/registry-bound one-use consent capability**. The client never chooses the consent value and cannot authorize regeneration with a plain `true` Boolean.

## Two-step contract

1. The authenticated user with `report` permission opens G-27 report history and clicks explicit *Create new report* confirmation.
2. On that confirmed UI action, after the existing read-only history check, call **`prepareReportRegeneration(sessionToken,eventId)`**. This new public RPC authenticates again, obtains the authoritative G-27 `listReportsForEvent` snapshot and refuses unregistered/invalid histories or void Events. It creates a random UUID capability under `SRRT_GS4_REGEN_*` in Script Properties, tied to the owner ID, EventID, existing registry count, latest ReportID, current Event Revision and server creation time.
3. Only the capability ID (and EventID) is returned to the browser. The actual proof contents remain private on the server. The capability expires after **five minutes** and is consumed **once**, under the same ScriptLock as the accepted job creation.
4. Browser threads the capability through `makeReport` and `executeReport`. If the readiness modal shows warnings, the pending capability survives only for that intended continuation and is cleared as soon as create dispatch begins. Logout clears it, and existing G-33 session/request fences protect responses from old sessions.
5. **`createReportJob(sessionToken,eventId,regenerationConsentId)`** rechecks the G-27 history **inside the G-32 global job-slot lock**. It allows a first report only if the authoritative registry has zero valid rows and no invalid matching rows. Once an existing report is registered, create requires the unexpired capability from the *same user and Event* and exactly the *same registry count, latest ReportID and current Event Revision*. Missing, reused, forged, wrong-user, wrong-Event, stale or corrupted proof fails closed before queuing work.
6. Existing G-32 behavior is retained: the same owner and same Event can recover the same active job idempotently; a second job for a different Event/owner must not receive an unrelated job. An unresolved `unknown` job is not silently converted to a new job even after G-32 clears its **active pointer**: the durable recent job records are inspected before accepting another job for that Event. This intentionally remains a manual-reconciliation hold until the existing 24-hour job retention expires.

**Note:** A public browser RPC cannot cryptographically prove that a human physically clicked a button. The server enforces the **authorized two-step intent and fresh report history**, not an unsforgeable human gesture. A malicious authenticated user with legitimate `report` permission could call both public endpoints programmatically. This is a business-consent gate, not a substitute for a formal approval workflow or independent user-interaction proof.

## Trust boundaries and operational semantics

- Source of truth is the existing **schema-v7 ReportRegistry** read by `listReportsForEvent`. No report-history data copied into MainData, no ReportRegistry migration/repair on a read and no new spreadsheet columns.
- Consent records contain only internal owner ID, EventID, report count, ReportID, Revision and timestamp—**no clinical narrative, password, token, Gemini prompt or API key**.
- Consent records are temporary Script Properties, not report records or login sessions. Expired proofs are removed opportunistically when another consent is prepared; a held invalid proof is never accepted and consumed proof is deleted when a job is accepted.
- The global ScriptLock protects the job-slot reservation and registry snapshot check against concurrent **createReportJob** calls. It cannot make an external manual spreadsheet edit atomic with Apps Script, and it does not prove the generated document's historical existence beyond the existing registry schema.
- A job finishing `unknown` may have produced a document; GS-S4 refuses recreating from the unresolved **active** job pointer, but later manual reconciliation of unknown jobs is still a separate operational concern. G-32 report cancellation, ownership, nonce, finalization, Report Registry commit and post-commit audit behavior remain unchanged.
- First-report UI continues read-only preflight; the new server-side check is authoritative if that browser state is stale.

## Files and tests

Runtime sources: `05-reports-and-models.gs`, `03g-client-event-history.html`, `03i-client-report-actions.html`, `03k-client-report-generation.html` and `03c-client-auth.html`.

Regression: new `tests/gs-s4-report-regeneration-consent.test.mjs` verifies first report, explicit duplicate consent, forged/missing/reused capabilities, cross-account/Event access, Registry count/latest/Revision drift, malformed history, expiry, no unauthenticated access, same-owner same-Event idempotency, mismatched job scope and unknown fail-closed. Update the G-32 offline harness to simulate the existing empty ReportRegistry and GS-S1 frozen public RPC surface with this one new authenticated endpoint; wire the new tests into `check:contracts` and full `npm test`.

Native architecture remains 7 GS + 16 HTML partials + generated Index, **24 files**. The manifest, deployment script, frozen One-Click, Schema v7, EventID/Revision, GS-S1 through GS-S3 identity and credential protections remain in force.

## Verification and release gates

Run GitHub Actions on the **exact PR HEAD**: Native build and staged-byte parity, UI assets, updated contracts, full regression and offline P6 `codeGate=PASS` with `releaseDecision=HOLD`. Tests use simulated identities, PropertiesService, Sheets and LockService—**not a real deployed GAS or live Gemini call**.

No user credentials, clinical records, actual Report Registry, existing jobs, Script Properties, Apps Script deployment, `clasp`, One-Click or Production Backend are accessed or mutated.

**GS-S4 MERGE=HOLD until separate Product Owner approval. APPS SCRIPT DEPLOYMENT=HOLD independently of Merge.** Future GS-S5 concerns Audit failure observability and maintenance/performance reviews; Apps Script deployment readiness also requires GS-S1 operator identity, GS-S3 non-production KDF benchmarking and historical GS-S2 audit exposure decisions.
