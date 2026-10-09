# Smart SRRT P4 -> G-32 V8 / Schema v7: data-compatibility design

Date: 2026-10-09 (Asia/Bangkok)  
Status: **GATE 1 DESIGN CANDIDATE / REVIEW REQUIRED / NO MIGRATION AUTHORIZED**  
Scope: read-only source-to-target field mapping, evidence-preservation requirements, offline fixtures, migration execution proposal.  
Owner decision: preserve accepted G-32 V8 (Schema v7) and necessary P1-P4 behavior; no merge/deploy/production/staging data mutation.

## 0. Version pins, provenance, and decision boundary

| Authority | Commit/ref |
|---|---|
| Source baseline P1-P4, main | 043ddeffcc7f937e967ade4a6078101b0f544f96 |
| Accepted G-32 V8 | e1f3c920b2bde3497f0850f188fe1bd025929731 |
| Integration rehearsal starting point | eed59cf2eb889a5eeabe7e8cc2eafbd36c09e720 |
| Review surface | Draft PR #64, integration/g32-v8-main-preflight-20261009 |
| Earlier risk inventory | docs/integration/g32-v8-main-preflight-2026-10-09.md |
| Existing offline header preflight | tools/p4-v7-schema-preflight.mjs; tests/integration-p4-v7-preflight.test.mjs |

Evidence from pinned code (line links below):
- main Code.gs defines MainData 30 business columns + 14 P1/P3 metadata columns (31-44); Schema v4.
- V8 src/server/00-bootstrap.gs defines the same first 38 columns, **OwnerUserID at 39 only**, the 13-column attachments, 10-column AuditLogs and 3-column VisitLogs.
- V8 ensureEventOwnerSchema_ rejects an occupied/nonmatching column 39. V8 attachment and visit guards likewise reject conflicting headers.
- **The already UAT-accepted v7 staging workbook is not a P4 migration target.** This design covers *hypothetical or discovered P4/v4 installations* only; never combine their data into staging automatically.
- There is currently no reviewed P4-to-v7 transformation implementation. The existing header scanner is a read-only classifier, NOT a migration or permission to run one.

Sources:
- https://github.com/9GotStory/smart-srrt/blob/043ddeffcc7f937e967ade4a6078101b0f544f96/Code_Smart_SRRT_OneClick_v2026.09.08.1.gs
- https://github.com/9GotStory/smart-srrt/blob/e1f3c920b2bde3497f0850f188fe1bd025929731/src/server/00-bootstrap.gs
- https://github.com/9GotStory/smart-srrt/blob/e1f3c920b2bde3497f0850f188fe1bd025929731/src/server/01-schema-and-db.gs
- https://github.com/9GotStory/smart-srrt/blob/e1f3c920b2bde3497f0850f188fe1bd025929731/src/server/02-auth-and-attachments.gs
- https://github.com/9GotStory/smart-srrt/blob/e1f3c920b2bde3497f0850f188fe1bd025929731/src/server/04-admin-and-audit.gs

## 1. Hard invariants and non-goals

**Hard invariants (failure -> BLOCK, never silently repair):**
1. No writes to live P4 source, accepted v7 staging, production, Google Sheets, Drive, Apps Script, or Gemini during Gate 1/offline rehearsals.
2. No automatic invocation of installSmartSRRTCore_, migrateP4Governance, migrateG05EventOwner, migrateG11EventAttachments, migrateG21AuditRetention, migrateG29VisitLogs, migrateG17ReportRegistry, or any other installer/migration on existing real workbooks.
3. No re-key of P1 EventID or AttachmentID; preserve positive integer Revision exactly. Duplicate/malformed identity, source-target collisions, missing referenced Events, unknown headers, and invalid state combinations abort before any proposed target writes.
4. Do not infer semantic equivalence from positional columns or similarly named functions; map by validated header and supported layout. Preserve the v7 schema shape rather than modifying the accepted V8 runtime to accept P4 columns.
5. Retain historical closure/owner timestamps, attachment archive state/DriveUrl and audit archive metadata in an immutable, access-controlled legacy evidence package **until a separate data-retention decision**. Do not expose these to public Dashboard or report payloads.
6. Never synthesize historical actor, reason, time, file upload, AuditID-to-ArchiveKey identity or ReportID to make a row look complete. New migration technical IDs are recorded as *generated migration identities*, not historical events.
7. Preserve V8 authorization, revision/concurrency, model pinning, report job ownership/cancellation, 503-only bounded retry and append-only ReportRegistry protections. No weak legacy RPC aliases.
8. Migration design must be independently reviewed and future real-world migration requires an **additional explicit human approval**, fresh backup, operator runbook, staged copy verification and separate cutover approval.

**Non-goals:** changing V8 staging UAT code/data; importing P4 data into existing populated v7 staging; automatic purge of historical query parameters; restoring legacy inline Archive as the new v7 archive; weakening permissions; adding new runtime MainData closure columns; production release/merge.

## 2. MainData field-level conversion design (P3/P4 -> v7)

The first 30 business columns and P1 identity/meta columns 31-38 keep their canonical positions and values.

| Source P4 column / field | v7 destination or treatment | Rule |
|---|---|---|
| 1-30 / existing epidemiological business columns | 1-30 same field positions | Preserve cell value/type exactly, including blanks; no data reinterpretation. Validate header positions. |
| 31 EventID | 31 EventID | Preserve immutable UUID. Nonblank malformed/duplicate UUID -> BLOCK. |
| 32 Revision | 32 Revision | Preserve positive integer; missing/invalid -> BLOCK for existing identified event. |
| 33 RecordStatus | 33 RecordStatus | Keep void as void. See workflow reconciliation below for CLOSED/active. Conflicts -> BLOCK. |
| 34 CreatedAt, 35 CreatedBy | 34-35 | Preserve without inventing provenance. |
| 36 VoidedAt, 37 VoidedBy, 38 VoidReason | 36-38 | Preserve all void evidence unchanged; validate against RecordStatus. |
| 39 WorkflowStatus | NO direct v7 column | Preserve value in restricted legacy evidence keyed by EventID; use only for reviewed lifecycle mapping. |
| 40 OwnerUserID | 39 OwnerUserID | Move only after exact header validation, noncollision, and referenced UserAccounts check. Preserve missing/inactive owner IDs in evidence; do not auto-create/activate a user. |
| 41 OwnerAssignedAt | legacy evidence | Preserve original raw value and timestamp fidelity (including timezone/format). Do not falsify current assignment time. |
| 42 ClosedAt | legacy evidence | Preserve original closure timestamp verbatim. |
| 43 ClosedBy | legacy evidence | Preserve original actor verbatim. |
| 44 CloseReason | legacy evidence | Preserve original reason verbatim. |

**Lifecycle reconciliation proposal (requires review):**
- Source RecordStatus=void -> target void; WorkflowStatus must be VOID/consistent or exception; keep void metadata; never reopen implicitly.
- Source WorkflowStatus=CLOSED with nonvoid RecordStatus -> target RecordStatus=closed only if closure metadata and revision are coherent, otherwise BLOCK and manual review; do not fabricate CloseReason/ClosedBy/ClosedAt.
- Source WorkflowStatus=OPEN or IN_PROGRESS with RecordStatus=active -> target active, with original workflow classification kept in legacy evidence (V8 derives read-only stage from epidemiological fields).
- Empty or unrecognized WorkflowStatus, inconsistent active/void/closed pairs, and ambiguous source already-closed fields -> BLOCK/manual resolution; no inferred change.
- Preserve existing historical CLOSE_EVENT/REOPEN_EVENT Audit records; never invent additional user close/reopen events as part of conversion.
- V8 write-side close/reopen uses permission close_event and RecordStatus, rather than P4 edit permission and WorkflowStatus. Separate authorization and UI behavioral tests are mandatory.

**Identity and collision checks:** EventID unique within source; no duplicate target EventID; owner reference resolution against a verified UserAccounts snapshot; no AppScript mutation by a header scanner. If a source owner is inactive/missing, preserve full evidence and route exception to the operator, not to an invented active account.

**Proposed legacy evidence format** (design proposal, NOT implemented or location-approved): a restricted, immutable snapshot of 39-44 per EventID with snapshot identifier, source sheet/tab metadata, source row ordinal, raw typed cells, normalized digest and mapping decision/error; separate from v7 application tables. Storage, ACL, operator access and retention require explicit approval. No patient narratives or emails in GitHub, test fixtures, CI artifacts or public logs.

## 3. EventAttachments field-level conversion design

| P4 source (11 columns) | V8 target (13 columns) | Mapping rule |
|---|---|---|
| 1 AttachmentID | 1 AttachmentID | Exact immutable UUID; unique. |
| 2 EventID | 2 EventID | Exact FK; must identify one migrated/existing authorized Event. |
| 3 FileID | 3 FileID | Preserve private Drive file ID; offline manifest only; never move, copy or expose live file. |
| 4 FileName | 4 FileName | Preserve display name in historical records; future V8 uploads use sanitizer/signature validation. |
| 5 MimeType | 5 MimeType | Preserve existing MIME truth; unsupported historical types require review, not rewrite or fabricated extension. |
| 6 FileSize | 6 SizeBytes | Require finite, nonnegative, appropriately bounded numeric byte count; do not guess units if ambiguous. |
| 7 DriveUrl | no public v7 column | Retain in restricted legacy evidence only; verify FileID/URL relation if operator-approved in a later live gate. |
| 8 Description | 7 Description | Preserve; flag >500 characters for compatibility review rather than truncate historical text. |
| 9 Status | 8 Status | active -> active after checks; archived -> **unresolved** (no automatic alias to removed). Unknown -> BLOCK. |
| 10 CreatedAt | 9 UploadedAt | Preserve timestamp as the only documented original upload timestamp; do not invent timezone/precision. |
| 11 CreatedBy | 10 UploadedBy | Preserve actor as historical value. |
| no P4 equivalents | 11 RemovedAt, 12 RemovedBy, 13 RemoveReason | Blank for active rows. For archived rows, no reliable P4 removal actor/reason/timestamp exists: BLOCK automatic V8 conversion and preserve evidence separately. |

**Archived attachments decision is OPEN:** source P4 archive is a status-only, edit-permission operation with no reason or Event Revision bump; V8 removal is delete-permission, reason- and revision-bound, and explicitly audits remove metadata. Therefore archived != removed. Do not manufacture REMOVE_EVENT_ATTACHMENT or increment Event Revision retrospectively. Decide whether to keep legacy archived entries in a restricted separately retrievable evidence ledger or to establish a reviewed nonsemantic presentation adapter; no automatic conversion.

**Security and storage:** v7 list/download may expose only active items through authenticated view RPC. Do not leak DriveUrl/FileID through browser payload. Do not change Drive file sharing. V8 upload MIME allowlist differs from P4 (legacy TXT/CSV/DOC/XLS may exist), so grandfather historic evidence in the protected archive pending policy. New uploads retain V8 5 MB, signature checks and expectedRevision. Never delete/trash historic Drive files during conversion. Validate IDs, counts, statuses and referential integrity offline before a later authorized Drive existence check.

## 4. AuditLogs and AuditArchive reconciliation design

**Verified structures:**
- P4 active AuditLogs uses 9 columns: Timestamp, UserEmail, Role, Action, TargetSheet, TargetId, Before, After, IpHint.
- P4 AuditArchive is same-workbook and has 12 columns: ArchiveKey, the above 9 audit fields, ArchivedAt, ArchivedBy.
- V8 active AuditLogs uses the 9 base fields + AuditID (10); the G-21 external private spreadsheet uses calendar-year sheets named Y2025, Y2026, etc., with the same 10-column audit schema.

**Mapping proposal:**
1. Preserve the original 9 audit fields exactly from both active and archived P4 sources.
2. Allocate new distinct UUID AuditIDs only under an approved offline migration ledger, with stable mapping keyed by snapshot ID + source collection + source row identity. Reuse the same allocated ID on a rerun. A raw-row-content hash alone is NOT a unique audit identity: byte-identical legacy audit rows are possible.
3. Preserve P4 ArchiveKey, ArchivedAt, ArchivedBy and source workbook/sheet trace in restricted immutable legacy provenance. Treat P4 archived rows as *already archived legacy evidence*, not as recent active logs. Do not copy them into active AuditLogs and archive again without an explicit duplicate-resolution policy.
4. In any later approved copy-to-v7 rehearsal, only put retained active rows in new v7 active AuditLogs and historical archived rows in new protected external archive after confirming exact field and ID counts. Do not rewrite accepted staging archive.
5. Detect records present in both active P4 and P4 Archive due to partial failure by combining ArchiveKey computation, row provenance and multiplicity. Do not simply dedupe by identical text/hash, nor claim one-to-one ArchiveKey identity. Ambiguous duplicate classification -> BLOCK.
6. Store/prove external archive year partition based on the original parsed event Timestamp; malformed dates -> exception ledger and human resolution, no invented year.
7. The V8 production archive flow is copy -> verify -> delete only verified source rows. No source deletion belongs to this offline mapping design.

**Retention and audit:** retain V8 permission audit, default 365-day active retention with bounded settings, no scheduled archival; no generic UI editing of archive ID. Do not treat an earlier legacy archive operation as a new v7 Archive operation. No silent destruction of evidence. Keep fresh rollback snapshots of the external Archive, Settings and Active Audit.

## 5. VisitLogs privacy/semantic mapping

| P4 source | v7 label | Proposed handling |
|---|---|---|
| Timestamp | Timestamp | Preserve value/type. |
| Page | EntryPoint | Preserve literal data after verifying meaning; unknown values -> manual review rather than changing them to doGet. |
| RequestParams | LegacyRequestParams | **Historical sensitive payload**. Keep exact content only in access-controlled backup/evidence pending privacy/retention decision. Whether copies retain the field in v7 target requires explicit approval; never emit values to CI/output/log. |

The existing V8 G-29 ensureVisitLogSchema_ recognizes Timestamp/Page/UserAgent or its final headers; it does NOT accept P4 Timestamp/Page/RequestParams. Do not relabel P4 header in place via V8 migration.

New v7 visits must remain Timestamp/doGet/blank, never log query parameter values. A separate retention/redaction policy must determine whether original historical RequestParams are copied forward, quarantined or eventually deleted; that decision is **not** part of this design gate.

## 6. Proposed offline-only transformation architecture (not implemented)

**Inputs:** manually prepared synthetic fixtures or later approved read-only export of a *separate* P4 installation. No connector/API access to the live workbook is authorized here. Input manifest must include source pinned schema, header arrays, exact typed row snapshots, unique snapshot ID, per-sheet counts and hashes, attachment FileID manifest, UserAccounts reference set, active/archived Audit partitions, and metadata on the extraction time/actor.

**Phases:**
1. Freeze source/target version pins and run strict header scanner. Identify whether source is P1/P3/P4/v7/unknown. Unknown or mixed -> BLOCK. Do not infer version purely from SCHEMA_VERSION setting.
2. Validate source IDs, stable row keys, duplicate/missing references, date parseability, owner statuses, event lifecycle coherence, attachment Status/MIME/byte sizes, Audit archive provenance and expected SourceRevision/ReportRegistry boundaries.
3. Build typed, immutable read-only legacy evidence set; draft a field-by-field mapping ledger for every transformed field, unresolved decision and generated migration UUID (if later authorized).
4. Pure transformation of **synthetic fixtures** into a fresh, isolated empty target model; refuse existing populated target/different schema. No Apps Script/Drive/Sheets writes.
5. Validate target schema EXACTLY v7, uniqueness and referential integrity, equality of preserved source fields, lifecycle expected states, aggregate counts and no public data leakage.
6. Re-run the same transformation from the same snapshot/ledger: IDs, result rows and digests must be identical; a simulated mid-copy failure must reconcile without duplicates.
7. Independent code/security review of the pure converter, fixture coverage, anonymized evidence and rollback; no migration/runbook authorization automatically follows.
8. Later **separate human approval only**: one-time backup, isolated Google Workspace test copy, read-only discovery, restricted staged target, verification and controlled cutover with independent sign-off. Production and UAT staging remain untouched until separately authorized.

**No runtime schema extension** is granted by this proposal. Where P4 fields have no v7 column, preserving full evidence is a release requirement, not an instruction to add public/live columns to V8.

## 7. Required fixture and regression matrix

| ID | Fixture / behavior | Expected result |
|---|---|---|
| M01 | Canonical v7 already present | No conversion; do not overwrite accepted staging |
| M02 | Exact P4 44-header MainData | Correctly classify and BLOCK naive owner offset |
| M03 | P4 OPEN and IN_PROGRESS with valid owner | Active target proposal; preserve original workflow/time in evidence |
| M04 | CLOSED with complete valid closure metadata | Closed target proposal + full legacy metadata retained |
| M05 | VOID Event and inconsistent VOID/RecordStatus combination | Consistent void preserved; contradictory state BLOCK |
| M06 | Owner missing/inactive and duplicate EventID | Preserve evidence + BLOCK unauthorized assignment/duplicate |
| M07 | Existing EventID/Revision unchanged | Byte/logical equality proof; no revision increments |
| A01 | 11-column P4 active attachment | Correct field-based mapping to v7 13-column candidate |
| A02 | P4 archived attachment and unknown Status | Unresolved/BLOCK; no fabricated RemovedAt/By/Reason |
| A03 | P4 FileSize/DriveUrl and long description | Preserve legacy values, validate size, protect URL; no truncation |
| A04 | Historical unsupported MIME; stale/orphan EventID | Evidence retained/exception; never auto-upload or reparent |
| U01 | P4 9-field AuditLogs to 10-field v7 | Preserved fields and stable unique generated AuditID ledger |
| U02 | Legacy AuditArchive 12-field records | Provenance retained; external archive not silently assumed |
| U03 | Duplicate raw audit rows and partial archive copy | Multiplicity preserved; unknown duplicates BLOCK |
| U04 | Malformed Audit timestamp and rerun | No invented year/identity, repeatable errors and IDs |
| V01 | Legacy P4 VisitLogs RequestParams | BLOCK direct G-29 rename, no payload disclosure |
| V02 | New v7 log entries | doGet and empty LegacyRequestParams; no query storage |
| S01 | Unknown/blank header over populated cells | Fail closed with no mutation |
| S02 | Interrupted transformation/restart on same snapshot | Deterministic output, no duplicate IDs or lost evidence |
| S03 | Public Dashboard/redaction on synthetic migrated rows | No private EventID, source narration, FileID, DriveUrl or legacy query values |
| S04 | All counts/hashes, identities, owner/status/audit links | Match validated manifest; unresolved issue => HOLD |

Tests must use **synthetic, non-patient** fixtures and mock data only. No Gemini calls. Existing P1-P4 tests must not be removed or skipped merely to produce a green suite; replace implementation-shape assertions only with demonstrably equivalent behavioral regression coverage approved in independent review.

## 8. Evidence bundle and acceptance / stop conditions

A future proposed migration rehearsal must produce, at minimum:
- SOURCE_SNAPSHOT_ID, pinned main/V8/integration SHAs, target fingerprint, export tool/version, operator/date and signature.
- BEFORE/AFTER header inventory for each sheet with source/target counts, typed-row and sorted logical-row hashes; identity/revision/owner integrity checks.
- Complete field-mapping ledger, quarantined exceptions with *redacted* identifiers, generated AuditID ledger, archival provenance inventory, Drive FileID **hashes** rather than sensitive raw file references in shared logs.
- Evidence of zero lost Events, no duplicate EventID/AttachmentID/AuditID, no unverifiable changes to ReportRegistry/Doc IDs, preservation of lifecycle, legacy attachment status and Audit history.
- Two consecutive equivalent dry-runs; simulated partial failure and replay; documented restoration exercise on disposable copies.
- Static/dynamic authorization boundaries, frontend RPC and G-30 one-click parity tests.
- Independent review and explicit operator human gate before *any* real Google Workspace read/export or mutation.

**STOP / HOLD:**
- P4 and v7 layouts mixed in one workbook or unknown nonblank header.
- Data in column 39 collides with OwnerUserID or source column 40 cannot be resolved.
- Missing/duplicate IDs, invalid Revision, orphan attachment, unresolved owner or CLOSED/VOID contradiction.
- Legacy archived attachment/audit identity ambiguity; historical query values without approved privacy handling.
- Unknown date/byte-size semantics, unsupported output shape, row count/hash mismatch, public data exposure.
- Any need to mutate accepted V8 staging, call Gemini, overwrite an existing target, force-push existing PRs, merge main, deploy production, or run an unreviewed migration.

## 9. Decision register and next stage

| Decision | Proposed outcome | Review status |
|---|---|---|
| Runtime data schema | v7, do not alter accepted V8 shape | Design proposal |
| Workflow/closure history | Restricted immutable legacy evidence, EventID-linked | Open: storage ACL + retention |
| Source CLOSED mapping | RecordStatus=closed only with coherent evidence | Open: mapping approval |
| P4 archived attachment | Do not alias to removed | Hard HOLD until policy |
| P4 AuditArchive | Preserve original ledger, independently map to v7 AuditIDs | Open: durable identity/duplicates |
| P4 VisitLogs RequestParams | Protect historical raw data, prevent new collection | Open: privacy/retention |
| Migration implementation | Pure offline converter and mocks first | Not implemented |
| Apps Script/Google Sheets migration | Separate later operator-approved runbook only | NOT AUTHORIZED |
| Merge to main / staging / production deploy | Independent gates | HOLD |

**Next allowed step:** independent review of this design; then build a *pure offline fixture-based transformation prototype* on the isolated integration branch only. A green schema scanner alone cannot authorize an actual migration.

**Scope of this commit:** design documentation only. No application source, tests, installer, or external data modified.
