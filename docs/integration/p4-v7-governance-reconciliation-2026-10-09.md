# P4 Governance Reconciliation — Schema v7 Contract and Migration HOLD

Date: 2026-10-09 (Asia/Bangkok)  
Branch: `integration/g32-v8-main-preflight-20261009` | Draft PR #64  
Authority baseline: main `043ddeffcc7f937e967ade4a6078101b0f544f96`; accepted G-32 V8 `e1f3c920b2bde3497f0850f188fe1bd025929731`.

## Decision scope

**V7 runtime compatibility tests are now green, but the P4 v4 workbook has NOT been migrated or approved for migration.** Distinguish (1) behavior of fresh or already-v7 workbooks; (2) preserving historical records in a P4 workbook; and (3) integration release approval. A green Node suite proves neither historical-data preservation nor a successful end-to-end deployment/UAT.

The original eight P4 test cases are **retained and executed** in `tests/p4-governance-current.test.mjs` with exact v7 behavioral assertions. Five misleading historical test descriptions were renamed to reflect what is actually being tested; nothing was skipped/deleted. The earlier v4-only expectations for `WorkflowStatus` column 39, `migrateVisitLogHeader_`, `archiveEventAttachment`, `auditArchiveKey_`, mutable `MASTER_TYPES`, or same-workbook `AuditArchive` are **not** restored to the accepted v7 runtime as unsecured aliases.

## P4-v4 to V7 behavior mapping and blocking decisions

| Domain | Main P4-v4 contract | V7 contract now tested | Historical data gate |
|---|---|---|---|
| MainData | 44 columns with `WorkflowStatus` at 39, Owner at 40, closure evidence 41–44 | First 38 canonical business/P1 columns, `OwnerUserID` at column 39, `RecordStatus` active/closed/void, strict conflict refusal by G05 | Preserve legacy owner/closure time/actor/reason in a restricted immutable ledger. **No 44→39 in-place installer call.** |
| VisitLogs | `Timestamp,Page,RequestParams` with potentially sensitive historic query text | `Timestamp,EntryPoint,LegacyRequestParams`; G29 can rename old `UserAgent` headers **but rejects P4 `RequestParams`**; new `logVisit_` writes `doGet` with blank parameters | Stop, retain original evidence securely until privacy/retention decision. Never emit raw params to logs, dashboards, GitHub issues or v7 newly captured visits. |
| EventAttachments | 11 columns; `FileSize,DriveUrl,CreatedAt/By`; `archived` via `edit` | 13 columns; `SizeBytes,UploadedAt/By,RemovedAt/By/RemoveReason`, active/removed with `view` read, `edit` upload, `delete` removal + nonblank reason/current Revision | `archived` is **not** `removed`; preserve original Drive URL/file IDs and history under restricted ACL. No auto-removal or silent role broadening. |
| MasterData | P4 CRUD allowing value/active state modifications in older areas | `MASTER_DATA_POLICIES`, immutable Type/Value identity, `criteria` and `verify_status` locked against create/deactivation, `master` permission required | Reconcile noncanonical legacy values and inactive references explicitly; never change semantic KPI vocabulary simply to satisfy old assertions. |
| Audit | 9-column `AuditLogs` with inline `AuditArchive` and content-derived `ArchiveKey` | 10-column `AuditLogs` with immutable row-level UUID `AuditID`; retention-bound **external** year spreadsheet; verify row before source deletion | Historical inline archive provenance, multiplicity, ArchiveKey mapping, restricted archive ACL, retention and restart ledger remain **unapproved**. `AuditID` is not the historical `ArchiveKey`. |
| Browser | P4 admin `archiveEventAttachment`, `archiveAuditUi` | V7 `removeEventAttachment`, `loadMasterDataAdmin`, `saveMasterDataItem`, `archiveAuditLogs` and `loadAuditRetentionStatus` | Preserve auth boundaries; never expose the former P4 RPC methods as weaker compatibility aliases. |

## Substantive G21 defect found and fixed on Integration only

The accepted staging G21 `archiveAuditLogsCore_` previously relied on **membership of AuditID in the destination archive year sheet** when deciding if a row was already copied and whether to delete the corresponding source. A destination row with identical AuditID but different payload could therefore be mistaken for a successfully archived source.

**Integration-only correction:**
1. `getAuditArchiveIds_` now loads a per-AuditID index of complete **10-cell rows** rather than a Boolean membership map. It rejects malformed and duplicate destination AuditIDs.
2. `auditArchiveRowMatches_` checks **all ten column values** with strict equality for scalar cells and exact millisecond equality for valid Date cells. A Date-vs-string timestamp mismatch fails closed instead of silently normalizing a different representation.
3. If a destination already holds an AuditID, the source candidate is skipped as an already archived row **only if its entire row matches**. Same ID + different content => throw before any source deletion.
4. After copy, source rows are deletable **only after an independent destination reread** confirms complete row equality for every candidate. Missing/malformed/mismatching entries => stop before source deletion.
5. Retention window, current `audit` authorization, year archive layout, source-delete order, audit logging and all other G21 decisions remain unchanged.

Affected canonical files:
- `src/server/04-admin-and-audit.gs`
- deterministically assembled `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs`

**Regression tests** in `tests/g21-audit-retention.test.mjs`:
- Reject same AuditID + modified `After` payload; original active row and audit log remain unchanged.
- Reject duplicate or malformed destination AuditID; no source deletion.
- Verify strict typed equality including Date values.
- Reject tampered destination reread after an otherwise successful append; preserve source rows.

This corrects the verification of **existing v7 AuditID archives**, not a P4 historical-data migration. **Independent review is mandatory** before any deployment or real archive operation.

## P4 test coverage and fail-closed checks

All eight original P4 tests remain present but now exercise v7 contracts:
1. MainData 38+owner placement, schema v7, EventAttachment 13 columns and conflicting P4 column 39 refusal.
2. Supported G29 `UserAgent` header rename preserves historical values; actual P4 `RequestParams` header is rejected unchanged; new `logVisit_` leaves request parameters blank.
3. Attachment upload remains private and bounded to supported MIME/file signatures and 5 MB.
4. Exact `view` for list/download, `edit` for upload, `delete` for removal with reason/Revision, and denied requests fail before data access.
5. Immutable MasterData Type/Value, canonical criteria policy and negative tests for forbidden create, deactivate and rename, plus an allowed label/order update and audit.
6. External year archive retention and full source/destination row verification, admin `audit` permission and retention 90–3650 bounds.
7. Backfilling stable, unique UUID AuditIDs for two identical legacy 9-field audit rows; rerun does not replace generated IDs. This is **not** content-hash `ArchiveKey` equivalence.
8. Browser's v7 governance endpoints and protected backend operations; no `ANYONE_WITH_LINK` or weakened P4 RPC aliases.

Existing G11, G21, G24 and G29 suites remain intact, including long-running audit copy/verify/delete, permission and privacy coverage. New G21 checks above guard a previously untested data-loss pathway.

## Gate status and outstanding evidence

**Latest code candidate:** `ed42c2add2d74c5bec8d838882b2d61d53b98668`. GitHub Actions [run 37888756365](https://github.com/9GotStory/smart-srrt/actions/runs/37888756365) verified **268 tests / 268 PASS / 0 FAIL**, zero skipped; deterministic One-Click, syntax/RPC and offline P6 checks PASS. The eight original P4 test cases remain executed under accurate v7 descriptions, and all four new G21 audit archive integrity tests PASS. Later documentation-only commits do not change that code candidate but require their own CI verification before claiming full HEAD status.

**Still BLOCKED (not addressed by green tests):**
- No endorsed P4 44-column source snapshot manifest, historical date normalization or dual-read mapping.
- No approved restricted evidence store, ACL, retention/deletion approval or immutable preservation of P4 closure fields and attachment Drive URLs.
- P4 `AuditArchive` `ArchiveKey` not cryptographically linked to v7 synthetic allocations; audit lineage, duplicates, archive-year placement and data residency unresolved.
- No target-copy partial-write resume/restore proof; an in-memory deterministic synthetic transformation is insufficient to claim migration idempotency.
- No safe handling plan for P4 historical VisitLogs raw `RequestParams` or manual privacy retention approval.
- No independent reviewer PASS, no dedicated staging verification of new frontend KPI, P3 warnings or G21 archive check, and no human merge/deploy gate approval.

**Hard conclusion: P1–P4 automated behavior reconciliation candidate, NOT data migration acceptance or release approval.** Draft PR #64 remains Draft/HOLD. Do **not** run installer/migrations or archive against real Google Sheets/Drive, issue Gemini calls, deploy to the accepted G-32 V8 staging or production, or merge into main.

Independent reviewer should pin final SHA, inspect original vs current G21 byte-level preservation, compare P4 snapshot mapping/policies with the [Gate 1 migration design](p4-to-v7-migration-design-2026-10-09.md), rerun tests and return explicit PASS/REWORK for behavior plus separate **HOLD** for migration/release until human decisions are documented.
