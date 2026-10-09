# P4→v7 Migration Readiness Gate — Metadata-Only HOLD Matrix

Date: 2026-10-09 (Asia/Bangkok)  
Repository: `9GotStory/smart-srrt`  
Branch: `integration/g32-v8-main-preflight-20261009` (Draft PR #64, no merge)  
Authority: main `043ddeffcc7f937e967ade4a6078101b0f544f96`; accepted G-32 V8 `e1f3c920b2bde3497f0850f188fe1bd025929731`.

## 1. Exact decision boundary

**The P1–P4 v7 automated compatibility suite PASS does not authorize historical P4 workbook migration.** The original production P4 workbook includes additional Workflow/Owner/Close evidence, historical archived attachments, same-workbook AuditArchive and potentially sensitive RequestParams that have no automatic 1:1 v7 equivalents.

This document records **what a separately appointed independent reviewer and authorized operator must verify**, not a self-awarded review. No external reviewer has signed off on Draft PR #64 at creation time.

| Decision | Status |
|---|---|
| Automated P1–P4 v7 compatibility | PASS (last code candidate before this tool: `42f0555548cce75b2ed3d696b0a21cf8c939aee0`, 268/268) |
| Metadata-only readiness-tool unit suite | PASS (initial tool/test commit: `533521929a894b0457cdfb91916d41643a72280d`, 278/278) |
| Independently accepted design and migration spec | **NOT VERIFIED** |
| Authorized live P4 data export or access | **NOT AUTHORIZED** |
| Authorized P4→v7 data mutation/migration | **NOT AUTHORIZED** |
| Accepted G-32 staging changes, production deployment or main merge | **NOT AUTHORIZED** |

## 2. Metadata-only readiness gate list

The new module `tools/p4-v7-migration-readiness.mjs` defines exactly these 15 gates, all requiring externally auditable evidence. Initial state is **not submitted to the checker** unless a metadata digest is provided. “Missing” in the checker means *no admissible proof was provided in that evaluation*, not necessarily that no investigation or artifact exists in the repository.

| Gate ID | Required evidence and acceptance constraint | Responsible sign-off |
|---|---|---|
| `source_manifest` | Approved P4 source identity, all exact headers and typed row counts, original snapshot checksum | Data custodian + reviewer |
| `typed_source_cells` | Native Sheets dates/timezones/numbers/booleans normalized losslessly; no guessed historical timestamps | Migration engineer + reviewer |
| `immutable_backup` | Restricted, verified read-only original and successful isolated restore proof | Data custodian + operator |
| `mapping_review` | Independent 44→39/11→13 mapping and identity/Revision/count/hash proofs | Reviewer |
| `closure_evidence_policy` | OwnerAssignedAt/ClosedAt/By/Reason immutable restricted evidence, retention and actor provenance | Data custodian / privacy approver |
| `archived_attachment_policy` | Decision for `archived` ≠ `removed`; no fabricated deletion actor/reason/date | Business owner + privacy approver |
| `audit_archive_lineage` | Legacy ArchiveKey and duplicate lineage to unique AuditID, external year storage, verification | Audit custodian + reviewer |
| `legacy_visitlogs_privacy` | Authorized private retention or approved purge of old RequestParams; no new raw query logging | Privacy approver |
| `evidence_acl_retention` | Storage tenancy/ACL, encryption/access policy, retention/erasure, least privilege | Security + privacy approver |
| `snapshot_integrity` | Per-sheet before/after identities, cross-reference, no orphan/lost/duplicated audit or attachment | Independent reviewer |
| `synthetic_rehearsal` | Two deterministic synthetic-only runs with no real patient/workbook data | Independent reviewer |
| `partial_copy_recovery` | Inject partial write into disposable target; verify restart/replay/restore without loss/duplicates | Reviewer + recovery operator |
| `staging_uat` | Independently approved staging-only UI/auth/KPI/report tests, without mutating accepted staging early | Product owner + reviewer |
| `independent_review` | Separate reviewer, exact SHA, scoped findings, rerun evidence and recorded verdict | Independent reviewer |
| `operator_approval` | Explicit last human approval *after* all applicable policy, security and recovery gates | Authorized operator |

**Manual policy decisions cannot be satisfied by a Node.js assertion or by the same author setting a boolean.** A green CI must never be treated as privacy, backup, operator approval, audit provenance or real-data handling authority.

## 3. Tool contract, use, and limitations

`assessP4V7MigrationReadiness({kind, checks})` is a **pure metadata-only function**. It neither loads nor modifies Google Sheets, Drive, operational data, or repository files. It has no server action, cron, CLI flag or API call that can release a migration.

Example input containing **only non-sensitive metadata**, shown for contract explanation:

```js
import { READINESS_KIND, assessP4V7MigrationReadiness } from './tools/p4-v7-migration-readiness.mjs';

const assessment = assessP4V7MigrationReadiness({
  kind: READINESS_KIND,
  checks: {
    // All values are examples, not endorsements.
    // A digest identifies a prior restricted evidence artifact without embedding its contents.
    source_manifest: { state: 'submitted', evidenceDigest: 'a'.repeat(64) }
  }
});
// assessment.status === 'HOLD'
// assessment.migrationAuthorized === false
// assessment.realDataExportAuthorized === false
```

The only recognized gate states are `missing`, `submitted`, `reviewed`. Non-missing states require a 64-hex evidence digest. The checker allows **only** gate ID, state and hash metadata; rejects unexpected fields (especially workbook rows, URLs and request parameters); and returns only predefined criteria/states, never the supplied digest. It does **not** verify the cryptographic origin, custody, author or substantive sufficiency of that digest. A caller may falsely claim `reviewed`.

Even if **every gate is self-reported as `reviewed`**, the result deliberately remains:
- `status='HOLD'`
- `independentApprovalVerified=false`
- `migrationAuthorized=false`
- `realDataExportAuthorized=false`
- `googleWorkspaceMutationAuthorized=false`
- `stagingDeploymentAuthorized=false`
- `mergeAuthorized=false`.

This is a structured inventory, **not** an approval mechanism and **not** a security boundary. The tool cannot infer whether a human is authorized. No actual use with patient/operational data is permitted.

## 4. Risk disposition and next authorized work

### Allowed without a migration authorization
- Independent source review on the existing pinned GitHub candidate; compare v4 main and v7 accepted staging contracts.
- Local mock-only destructive-failure/replay rehearsal using synthetic fixtures on a disposable in-memory target, never an actual workbook.
- Add negative regression tests for typed dates, inactive owners, archived attachments, AuditID collisions and privacy constraints without using real data.
- Independently inspect the G21 archive integrity fix in `src/server/04-admin-and-audit.gs`, including strict typed-row comparison and post-copy verification.
- Produce **redacted metadata-only** reviewer reports without source rows, file URLs, request query strings or patient identifiers.

### Human decisions and reviews still required before any real-data operation
- Exact authorized source and data residency; backup and a formally reviewed restore runbook.
- Secure restricted destination evidence storage and retention for legacy P4 metadata, archived files and AuditArchive.
- A signed mapping and historical lineage policy for `CLOSED`, `VOID`, archive and VisitLogs rows; typed Google Sheets cell normalization.
- A verified partial-write replay, including cases where destination has matching ID but different content, and independent backup recovery proof.
- Assigned independent reviewer decision on the **current** PR HEAD, dedicated authorized staging UAT, and written operator approval.

**Stop condition:** Any absent, inconsistent, self-reported-only or disputed item keeps Migration Readiness **HOLD**. Do not call `installSmartSRRT()`, migrations, `archiveAuditLogs`, Drive/Sheets export/write/cleanup, Gemini API, deploy staging/prod or merge PR #64 into main under this checklist. The accepted V8 source and staging remain unchanged.

See [Migration Design](p4-to-v7-migration-design-2026-10-09.md), [P4 v7 behavioral reconciliation](p4-v7-governance-reconciliation-2026-10-09.md) and [full Integration Preflight](g32-v8-main-preflight-2026-10-09.md).
