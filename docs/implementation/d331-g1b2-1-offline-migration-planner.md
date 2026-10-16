# D331-G1-B2-1 — Offline Synthetic Migration Planner

**Status:** Product Owner authorized **source-only B2-1**, not any TEST read/apply.  
**Parent:** [Issue #173](https://github.com/9GotStory/smart-srrt/issues/173)  
**Baseline:** `main@aeed365341b64b574b5f59fc3bbef35724b5761f`  
**Scope:** one new pure GS-compatible library, one Node synthetic test and this document. G1-A and G1-B1 remain unchanged.

## Hard isolation

The planner lives at `src/dengue/02-g1b2-1-offline-migration-planner.gs` and is **NOT** included in `tools/native-sources.mjs`. No deployed Apps Script RPC, SpreadsheetApp, DriveApp, PropertiesService, LockService, real Google Sheets reader, installer, migration writer, backup operation, rollback or clinical/patient data access exists here.

The planner only accepts the **sanitized** object returned by G1-B1 `d331B1PreviewSchema_` / `d331B1ReadPreview_` and a small synthetic context:
`{targetClass:'ISOLATED_TEST',datasetClass:'SYNTHETIC_ONLY',featureEnabled:false}`.
The caller is *untrusted*. A string reading `ISOLATED_TEST` is NOT sufficient attestation of an actual environment. Inputs containing real target identifiers, tokens, signatures, approval booleans, patient records or unknown metadata are rejected. No actual TEST or Production environment has been inspected.

## Functions and contracts

- `d331B2BuildPlan_(preview,context)` validates the sanitized G1-B1 shape, fixed table names, schema version, safe integer counts, recognized finding codes and mutually consistent summary counts. It emits **only** fixed blocker codes, aggregate metadata, and candidate `DESCRIBE_MISSING_TABLE` steps; **never** instructions that execute sheet changes.
- Every plan emits `status:'HOLD'`, `candidateDDLApproved:false`, `canReadLive:false`, `canBackup:false`, `canApply:false`, `canRestore:false`, `canEnable:false`, and `operationExecuted:false`. Clean candidate headers never authorize migration.
- `d331B2ComparisonKey_` is only a deterministic **synthetic change-detector based on whitelisted metadata**. It is **not a cryptographic digest, signed preflight, versioned lock, environment attestation or evidence of authority**.
- `d331B2ComparePlan_(plan, freshPreview)` flags stale snapshots for human review, and returns `canApply:false` even if unchanged.
- `d331B2SimulateInterruption_(plan,atStep)` models UNKNOWN outcomes at 0..N **descriptive** steps and requires manual reconciliation. It **does not run** any write, create, delete, backup or restore.
- A future B2-2/B2-3 integration needs a separately authorized, exact-target, operator-attested **live** preflight, migration version/DDL approval, strict Script Lock and header/schema-version recheck, verifiable TEST backup, bounded audit and recovery. Never rely on this pure helper's output as permission.

## Candidate schema limitations

The 7 G1-A header arrays are placeholders only, not clinical/privacy-approved operational DDL. Neither a version-1 match nor 0 rows makes them suitable to apply. No global `CONFIG.SCHEMA_VERSION` changes. No existing `MainData`, `EventAttachments`, `UserAccounts` or `AuditLogs` column modifications.

## Verification

Run:
```sh
node --test tests/d331-g1b2-1-offline-migration-planner.test.mjs
npm run check:contracts
npm test
npm run build:check
```

Synthetic negative test matrix covers wrong/Production target label, missing synthetic provenance, enabled feature, secret-bearing context, unknown/higher module version, header conflict on populated table, missing tables, count overflow, malformed preview/attestation claims, changed/stale key, interruption at 0/1/3/7 descriptive steps, forged executable plan, and zero availability of apply/backup/restore helpers.

## Future gated stages

- **B2-2:** metadata-only read of a separately authorized isolated TEST target. Must identify exact Script/Spreadsheet and forbid Script Property fallback before any connection. *NOT AUTHORIZED.*
- **B2-3:** actual additive isolated TEST schema apply after signed physical DDL, verified backup, safe operator/lock/fingerprint process and explicit separate Product Owner authorization. *NOT AUTHORIZED.*
- **B2-4:** restore drill and post-apply validation, separately authorized. *NOT AUTHORIZED.*
- **G1-B3/G2:** patient-level records, retention, role/AreaID mapping, clinical 3-3-1 anchors and follow-ups. *HOLD.*
- **PR Merge / Apps Script TEST push / Production Deploy:** all require separate decisions. Never infer deploy approval from CI or source merge.
