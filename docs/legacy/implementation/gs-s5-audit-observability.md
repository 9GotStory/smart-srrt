# GS-S5 — Audit Observability & Maintainability

**Status:** source-only candidate — **NOT merged / NOT deployed** (12 October 2026).  
**Base authority:** `main@64f4cc3ae319319bac3ceb0818aad26d149d3200` (GS-S4 post-merge GitHub Actions PASS).  
**Review boundary:** author-assisted ChatGPT Technical Review; not an independent security audit, live GAS smoke test or proof of full audit completeness.

## Problem and decision

`writeAudit_` previously suppressed all errors silently, even when AuditLogs `appendRow` failed. A business mutation or a generated Google Doc could already have committed, so throwing an audit transport error **after the fact** would encourage accidental re-execution and duplicate documents. The safe policy is:

1. An AuditLogs failure **does not reverse or change an already committed business result**.
2. The operator can see that AuditLogs writes have failed, without persisting patient details, passwords or raw exception content in telemetry.
3. The observability channel itself is explicitly **best effort**, not an exactly-once audit ledger or substitute for monitoring.

## Implementation

### Audit write outcome and a privacy-minimal health marker

`src/server/04-admin-and-audit.gs` retains the GS-S2 sanitized ten-column `AuditLogs` write. `writeAudit_` now returns `true` when `appendRow` succeeds or `false` if sanitize/transport/append fails. It **never throws because of an audit or telemetry failure**; legacy business callers may continue to ignore the return.

New private helpers: `auditHealthSafeLog_`, `readAuditWriteHealth_`, `recordAuditWriteOutcome_`. They record a bounded `SRRT_GS5_AUDIT_WRITE_HEALTH_V1` Script Property **only after a failed AuditLogs write or recovery from a previous failure**:

| Attribute | Content |
|---|---|
| `state` | `degraded` or `recovered` |
| `failureCount` | Advisory counter capped at 1,000,000, **not** an exactly-once metric |
| `lastFailureAt` | Server-side ISO timestamp |
| `lastRecoveryAt` | Server-side ISO timestamp, only if recovered |
| `lastFailureAction` | Strictly allowlisted operation code `[A-Z][A-Z0-9_]{0,63}`, else `UNCLASSIFIED` |

**Never store:** actor identity, email, patient name, EventID, target ID, document URL, model prompt, API key, password, raw Audit Before/After payload or `error.message`/`error.stack`. Apps Script `Logger` receives safe fixed-code `GS-S5 AUDIT_APPEND_FAILED`, `GS-S5 AUDIT_RECOVERED` or `GS-S5 HEALTH_STORE_UNAVAILABLE` messages with allowlisted action code only.

On a clean successful append without prior degraded state, no health property is written. A succeeding append after a recorded failure marks the state `recovered` and retains last-failure evidence. A subsequent failure changes it back to `degraded`. If Script Properties or Logger are themselves unavailable, an AuditLogs write failure **still cannot throw**, and an already successful append still returns `true`. No recursive AuditLogging is attempted.

**Important limitation:** a Script Properties write may be lost or race another execution's write. Because `writeAudit_` may run inside an existing `ScriptLock` critical section, GS-S5 does not acquire a nested lock: the counter and recovered state are *advisory only*. `unobserved` means **no known stored health marker**, not that all Audit writes succeeded. `unavailable` means a marker was unreadable/invalid or Script Properties could not be accessed. `recovered` means only that **a later individual AuditLogs write succeeded**, not that the missing earlier Audit record was replayed or reconstructed.

### Read-only Admin health display under existing permission

`getAuditRetentionStatus(sessionToken)` retains its existing `requireAuth_(sessionToken,'audit')` boundary and existing retention/archive fields. It **adds** `auditWriteHealth: readAuditWriteHealth_()` as a small nested metadata response. The existing Native Admin view `04-browser-app.html` shows a warning for `degraded`, a recovery message for `recovered`, or explicit `unobserved`/`unavailable` messages. Raw exception strings are never returned or rendered; server-derived metadata is allowlisted/escaped.

**No new public top-level RPC**, no admin menu redesign, no new Spreadsheet data columns, no schema migration, no changes to Archive row matching/deletion, no new infrastructure, no alert subscription, no external notifications.

### Critical G-32 report commit boundary

`05-reports-and-models.gs` already preserves success if `appendReportRegistry_` succeeded before `writeAudit_` failed. GS-S5 deliberately **does not alter this contract or the G-32 job state machine**. If the health marker cannot be written, a completed report remains completed. Automatic audit replay is **not** attempted, because it could introduce duplicates without an independent idempotency key and immutable recovery ledger.

## Source-only regression coverage

`tests/gs-s5-audit-observability.test.mjs` (Node VM with synthetic Sheets and Properties) covers:

- healthy write still produces an unchanged 10-column AuditLogs row without unnecessary health writes;
- Audit append failure yields a privacy-safe degraded marker and fixed-code console warning;
- repeated failure counts, recovered state and subsequent degradation;
- Script Properties and Logger failure do not become a business failure;
- malformed or sensitive health metadata is never trusted or rendered;
- arbitrary action text is reduced to `UNCLASSIFIED`;
- existing `audit` RBAC protects health when accessed through `getAuditRetentionStatus`;
- browser Admin text reflects degraded, recovered, unobserved, unavailable without raw exceptions.

It joins both `npm run check:contracts` and `npm test`. **Existing G-32 success-after-post-commit-audit-failure, GS-S2 credential redaction, G-21 Audit retention and G-33 session tests remain required.**

## Operator instructions and limitations

If Admin shows **degraded**, an authorized operator should inspect Apps Script **Executions** and spreadsheet access/quota/deployment configuration using their permitted privileges. Do not rerun the prior business operation just to repair AuditLogs; for AI reports check existing Report Registry/Job status first. Record a controlled incident note separately if evidence is needed. **The missing historical Audit entry is not automatically restored.** An owner's separate restricted decision is still required to assess pre-GS-S2 historical password exposure in AuditLogs, archives and backups.

An operator reading `unobserved` should **not** conclude audit delivery was proved. A durable external monitoring/alerting scheme, total-attempt denominators, concurrency-safe metrics and stronger telemetry may be considered in a separately reviewed future design. Clinical privacy/data minimization decisions are independent of this transport health marker.

## Release safety and approval gates

No One-Click, `tools/native-sources.mjs`, `tools/deploy-g34-clasp.sh`, `appsscript.json`, Registry/Schema v7, GS-S1/S2/S3/S4 logic, stored AuditLogs, archive sheets, patient records, credential data, Gemini API, Apps Script Properties in a real project, or production deployment are modified during this PR.

The 24 staged Native files must maintain byte parity (7 `.gs` + 16 HTML partials + generated Index), full regression/contract PASS, P6 `codeGate=PASS`, `releaseDecision=HOLD`. Require a separate explicit **Product Owner Merge approval** and, independently, a separately authorized real GAS rollout after other security release prerequisites.

**GS-S5 MERGE=HOLD / APPS SCRIPT DEPLOY=HOLD.**
