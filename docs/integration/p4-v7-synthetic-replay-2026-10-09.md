# Gate 1.3 — P4→v7 Synthetic Partial-Copy Recovery Rehearsal

Date: 2026-10-09 (Asia/Bangkok)  
Branch: `integration/g32-v8-main-preflight-20261009` — Draft PR #64  
Implementation tested at: `06d99ee130777c7510f547085e2038671167043d`  
Baseline: main `043ddeffcc7f937e967ade4a6078101b0f544f96`; approved G32 V8 `e1f3c920b2bde3497f0850f188fe1bd025929731`.

**Verdict: SYNTHETIC IN-MEMORY REPLAY TEST PASS; INDEPENDENT REVIEW / LIVE MIGRATION / DEPLOYMENT HOLD.**

## 1. Purpose and exact boundary

The migration design's `partial_copy_recovery` gate needs evidence that an interrupted write can restart without lost, duplicated or changed data. This first rehearsal only proves a much narrower property: **the proposed synthetic candidate can be copied to a disposable in-memory target, interrupted at any row boundary, and deterministically reassembled without duplicate target rows**.

It is **not** a Google Sheets migration, not a real backup/restore exercise, not evidence of native typed-cell round trips or ACLs, not a validation of the P4 archival lineage, and **not** sufficient to mark the `partial_copy_recovery` readiness gate `reviewed`. No real data, Drive, Sheets, Apps Script, Gemini, network or filesystem operations were executed by this module.

Two new files:

- `tools/p4-v7-synthetic-replay.mjs`
- `tests/integration-p4-v7-synthetic-replay.test.mjs`

The first imports only `node:crypto` and the existing synthetic planner's schema constants. It has no CLI writer, runnable migration, environment access or authorization path. The second constructs mock P4 headers and **synthetic fake events/files/audits** entirely in test memory.

## 2. Scope of the disposable copy

| Dataset | Rehearsal action | Explicitly excluded |
|---|---|---|
| MainData | Validate fixed v7 39-column header, EventID, Revision, status and strict source snapshot checksum; replay candidate prefix | Real source migration, historical P4 ClosedAt/By/Reason evidence storage, Google Sheets native Dates |
| EventAttachments | Validate v7 13-column header, active attachment IDs and EventID foreign references | Any P4 `archived` attachment, Drive upload/download, original evidence store |
| AuditLogs | Validate v7 10-column header, unique synthetic UUID AuditIDs and planner ledger; replay full rows | Legacy inline `AuditArchive`, true P4 content ArchiveKey provenance, external year archive |
| AuditArchive / VisitLogs | **Never copied** | All historical archived audits, RequestParams or privacy-restricted history; any nonempty unresolved history blocks the rehearsal |

This is a rehearsal of **three synthetic target tables only**. It does not claim migration coverage for the excluded datasets, closure metadata or cross-system document references.

## 3. Algorithm and safety invariants

1. Only the existing planner's proposal `kind='SYNTHETIC_OFFLINE_PROPOSAL'` with `status='HOLD'`, synthetic snapshot marker, `realDataAllowed:false`, `migrationAuthorized:false`, `externalWritesPerformed:false`, **zero findings**, verified `candidateDigest` and no legacy Archive/Visit rows is accepted. The synthetic marker is an **honor-system input assertion**, not reliable patient-data detection.
2. All rows must have the exact v7 field count, scalar cell types and exact fixed headers. Reject duplicate EventID/AttachmentID/AuditID and orphan attachment EventID. A stale or forged audit UUID ledger is refused.
3. The target must have the purpose-specific `SMART_SRRT_SYNTHETIC_DISPOSABLE_TARGET_V1` marker and match the exact `snapshotId`, `sourceDigest` and `candidateDigest`. It must contain only the exact three tables, with no extra rows and only **ordered prefixes** of the approved candidate. Earlier tables must be complete before a later one may contain rows.
4. `replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:N})` first validates **the entire input**, clones the target and appends at most N rows in memory. If rows remain, it returns `phase:'interrupted'` with a synthetic partial target. Re-invocation skips only rows already matching in exact position/content; mismatched ID/content/header/schema/order **throws before any new write**. A resumed result returns `phase:'preview_complete'`, meaning only an in-memory preview.
5. No callable output grants real access: results always say `status:'HOLD'`, `migrationAuthorized:false`, `realDataAllowed:false`, `externalWritesPerformed:false`, `independentReviewSatisfied:false`.
6. Returned `target` **contains all synthetic candidate cells**; tests ensure the separately constructed evidence summary has only counts/checksums. Never serialize a target containing real data into GitHub Actions logs or tickets.
7. This design does **not** model concurrent writers, non-atomic Google Sheets range writes, Drive operations, audit side effects, durable disk recovery, authentication, hidden sheet fields, formula/effective values, spreadsheet locale/timezone or partial destination schema creation. Those are independent future gates.

## 4. Deterministic test evidence

[GitHub Actions run 37893200166](https://github.com/9GotStory/smart-srrt/actions/runs/37893200166) at implementation SHA `06d99ee130777c7510f547085e2038671167043d`:

- **298 total tests / 298 PASS / 0 FAIL**, zero skipped (20 new isolated synthetic replay tests).
- Deterministic modular-to-One-Click byte parity PASS.
- Syntax/RPC/duplicate-declaration checks PASS.
- Offline P6 release preflight PASS.
- Regression tests for P1–P4, G11, G21, G24, G29 and existing G32 retain PASS.

New tests cover: empty target, full copy and invariants, interruption at 0 and at **every** row prefix of a 6-row fixture, resume and replay without duplication, exact-end interruption, repeated idempotence, restart from a new disposable empty target, tampered Event/Audit/Attachment payload despite matching ID, duplicate/extra rows, reversed row order, cross-table ordering violation, mixed snapshot/user/fingerprint, header/schema/date type, modified candidate digest, archived audit/attachment/VisitLogs fail-closed, tampered synthetic audit ledger, bad interruption options, no external calls and non-content evidence summary.

**Interpretation:** these tests demonstrate that the toy in-memory replay algorithm enforces its own strict prefix/cell checks. They do not prove production migration safety or validate recovered Google Sheets data.

## 5. Independent review and next gate

An **independent reviewer other than the implementer** must inspect the exact tested SHA, replay algorithm and fixture design; verify no weakened contract or skipped tests and independently replay tests. Reviewer output must include REVIEW_SHA, exact files and test commands, PASS/REWORK findings with code lines, and a separate statement that **the full `partial_copy_recovery` readiness gate remains HOLD** until target persistence, realistic partial failure, ACL, proof of immutable original backup and restoration are verified in an independently approved, disposable environment.

Before any real-data handling, the following decisions remain open:

- Authorized P4 source identity, immutable backup, verified restore, typed Google Sheet Date handling and target tenancy/ACL.
- P4 closure and OwnerAssignedAt legacy metadata retention; archived attachment ≠ removed.
- ArchiveKey/AuditID multiplicity, original AuditArchive lineage and external year archive policy.
- Historical VisitLogs raw RequestParams retention/redaction; prohibition on renewed query capture.
- Non-atomic range writes, cross-resource failures, partial applied writes, restore of original/target after interrupted migration, and source-to-target identity/hash proofs.
- New frontend KPI/P3 warning/G21 audit-integrity independent review and separately authorized staging UAT.
- Reviewer sign-off and final authorized operator human release/migration decision.

## 6. Hard release boundary

**Migration Readiness: HOLD.** Draft PR #64 stays Draft until the independent evidence and human gates are satisfied. No merging into main, live Google Workspace read/export/write, Apps Script installer/migrations/archiving, Drive document mutations, Gemini calls, staging/production deploy, data migration or restoration is authorized by this rehearsal.

Related: [Readiness 15-gate checklist](p4-v7-migration-readiness-2026-10-09.md), [P4 migration design](p4-to-v7-migration-design-2026-10-09.md), [P4 v7 governance reconciliation](p4-v7-governance-reconciliation-2026-10-09.md).
