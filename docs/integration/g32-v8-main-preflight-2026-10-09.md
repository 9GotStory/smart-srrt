# G-32 V8 / main — isolated GitHub integration preflight

Date: 2026-10-09 (Asia/Bangkok)  
State: **INTEGRATION NOT YET PERFORMED — MERGE GATE HOLD**

## Scope and pinned authority

This file records a **read-only integration assessment** and the baseline for later
conflict resolution. The integration branch originated at the then-current `main`
commit. **Creating this file does not bring feature source code into main or into
the integration branch.**

| Role | Ref / authority | Pin |
|---|---|---|
| Base at preflight | `main` | `043ddeffcc7f937e967ade4a6078101b0f544f96` |
| Isolated work branch | `integration/g32-v8-main-preflight-20261009` | initially pinned to base commit |
| Accepted staging V8 code | G-32 Draft PR #60, `feat/g32-report-background-cancel` | `e1f3c920b2bde3497f0850f188fe1bd025929731` |
| G-31 dependency | Draft PR #58 | `5ff4c8e2a23d0f84ebe45954f5f47fa8abe62cc5` |
| G-30 dependency | Draft PR #54 | `71717b14a0b678b922e3fe660dc496a351fc15e3` |

G-32 V8 test-only Apps Script deployment was confirmed by the owner. The positive
end-to-end UAT produced one six-section Google Doc, a matching ReportRegistry
entry and a matching GENERATE_REPORT audit. The owner explicitly accepted the
generated **mock** document; Issue #63 was closed as completed. V8's HTTP-503
retry branch was mock-tested but **not** exercised during the successful live
generation (both section calls returned HTTP 200 on first attempt).

Verified V8 CI: https://github.com/9GotStory/smart-srrt/actions/runs/37880517289
(197/197 regression tests PASS; deterministic One-Click parity PASS;
offline `codeGate=PASS`, `releaseDecision=HOLD`).

## Branch topology: two distinct historical feature lanes

**G-chain: 16 stacked Draft PRs**, in dependency order:

`#24 G-22 → #26 G-23 → #28 G-03 → #30 G-04 → #32 G-05 →
#34 G-19 → #36 G-11 → #38 G-21 → #40 G-24 → #42 G-29 →
#44 G-17 → #50 G-26 → #52 G-27 → #54 G-30 → #58 G-31 → #60 G-32`

Separate **P-chain: 5 stacked Draft PRs**, not an ancestor of the G-chain:

`#7 P2 → #9 P3 → #11 P4 → #13 P5 → #17 P6`

Do **not** merge both lanes blindly or assume 21 PRs form a single queue.
Do not close, rebase, retarget or force-push existing feature PRs as part of this
preflight without a separate review.

## Confirmed divergence and conflict-risk matrix

GitHub compare `main...feat/g32-report-background-cancel` at assessment:
**diverged**, G-32 side **180 commits ahead**, **4 behind**;
merge base `96bf16ff7c5c0ccfb3bc7e1654826a839c77700d`.
These counts describe ancestry, not a count of conflicts.

The four commits unique to `main` include P1–P4 governance/workflow
changes. The latest main P4 commit `043ddeff` specifically introduces
private Event attachments, AuditArchive, limited MasterData CRUD, and
VisitLogs semantic migration. The G-chain has distinct, overlapping G-11,
G-21, G-24 and G-29 implementations. **Feature equivalence and data/schema
semantics must be reviewed independently; conflict markers alone cannot
identify silent regressions.**

| Overlap | `main` evidence | G-chain evidence | Gate before combining |
|---|---|---|---|
| One-Click backend | `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` changed in main P1–P4 | V8 compiled `Code.gs` changed through G-32 | reconcile modular source first; rebuild One-Click from modules; do not copy one side blindly |
| Browser UI | `Index_Smart_SRRT_OneClick.html` changed in main P1–P4 | G-32 background-job, cancellation and action-state UI | compare both user workflows; preserve auth/accessibility and runtime callbacks |
| Attachments + privacy | main P4 supports private Event attachments | G-11 + G-22 | verify ownership/access policy, download guards and storage metadata |
| Audit + retention | main P4 AuditArchive behavior | G-21 + G-17 report Audit | compare schema floor, archive identity, idempotency and audit writes |
| MasterData governance | main P4 limited CRUD | G-24 | permission matrix, validation and safe authorization |
| VisitLogs semantics | main P4 migration | G-29 | avoid duplicate migrations and preserve existing staging data |
| Runtime config and test policy | main `package.json`, `.github/workflows/tests.yml`, P1–P4 tests | G-30 deterministic build/check/preflight and G-31/G-32 tests | maintain the full union of required tests and release gates |

Observed file-level source pins:
- main `Code.gs` blob `8a1ee478e17e2fc33a948aa5243d61b2ba82c25a`;
  main `Index.html` blob `8eaa2d0d3fff482006807386636abe45899cc515`.
- accepted V8 `Code.gs` blob `8e369a7d03d72aeb1db8ffa72efb009ed6a44c8c`;
  V8 `Index.html` blob `370bbb0567777ccdda2369a23c9e35e65245195c`.
- main workflow only runs push for main/feat/fix/chore branches and pull requests.
  Merely pushing `integration/**` does **not** assure CI. A later **Draft
  integration PR** will be needed for PR-triggered full CI checks once code
  integration is ready for review.

## Static function-inventory evidence (additional read-only comparison)

Both the `main` and accepted V8 complete One-Click files were fetched at
the pinned revisions and top-level named `function <name>(...)` signatures
compared. The inventory is a **warning signal**, not a proof that any missing
name is an unmet user requirement or that functions with the same name are
semantically equivalent.

| One-Click file | Named functions only in main | Named functions only in V8 |
|---|---:|---:|
| `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` | **25** | **76** |
| `Index_Smart_SRRT_OneClick.html` | **16** | **53** |

Important **main-only** examples (exact names from the current P1–P4 artifact):
- Backend: `migrateP4Governance`, `migrateVisitLogHeader_`,
  `listMasterItems`, `saveMasterItem`, `disableMasterItem`,
  `archiveEventAttachment`, `auditArchiveKey_`,
  `getEventConsistencyWarnings_`, `deriveWorkflowStatus_`.
- Browser: `loadAttachmentsUi`, `uploadAttachmentUi`,
  `archiveAttachmentUi`, `loadMasterAdmin`,
  `saveMasterAdmin`, `archiveAuditUi`, `closeEventUi`,
  `reopenEventUi`.

Examples of **V8-only** counterparts include
`migrateG11EventAttachments`, `migrateG21AuditRetention`,
`migrateG29VisitLogs`, `getMasterDataAdmin`, `saveMasterDataItem`,
`removeEventAttachment`, `loadAttachmentList`,
`renderReportReadinessModal`, `createReportJob`, and the
`reportTask` controls.

**Consequences:** A naive copy-over of the V8 release artifacts would
definitely remove main-only function *names*, even though some behaviors may
have equivalent implementations under renamed G-chain APIs. Do not perform
this kind of replacement; compare each overlapping behavior and caller
contract first, including P4 exposed RPC names. If a name is still called in
current `main` UI/API, preserve it or explicitly migrate all its callers
and corresponding tests in the isolated integration candidate.

## Verified schema and API semantics — hard integration gate

Static code inspection at the pinned revisions found **actual incompatible
interface/migration boundaries**, beyond function-name differences:

| Contract | `main` P1–P4 | Accepted V8 G-chain | Required reconciliation |
|---|---|---|---|
| Schema constant | `CONFIG.SCHEMA_VERSION: '4'` | `CONFIG.SCHEMA_VERSION: '7'` | never downgrade a staging v7 workbook; establish one monotonic, idempotent migration ledger and compatibility rules |
| MasterData RPC | `listMasterItems(sessionToken,type)`, `saveMasterItem(sessionToken,item)`, `disableMasterItem(...)` | `getMasterDataAdmin(...)`, `saveMasterDataItem(sessionToken,item)`, policy-bound handling | preserve UI RPC callers and permission/policy semantics before deprecating the old names |
| Attachment changes | `archiveEventAttachment(sessionToken,attachmentId)` plus P4 archive workflow | `removeEventAttachment(sessionToken,attachmentId,removeReason,expectedRevision)` and revision/role checks | do **not** equate archive with removal; explicitly reconcile retention, authorization and audit requirements |
| Migration entry | `migrateP4Governance`, `migrateVisitLogHeader_` | `migrateG11EventAttachments`, `migrateG21AuditRetention`, `migrateG29VisitLogs` | compare headers, schema version guards, idempotency and data preservation using fixtures without mutating staging |
| Audit archiving UI | `archiveAuditUi()` calling `archiveAuditLogs(token,days)` | G-21 retention/archive administration under different UI/flow | keep audit retention secure and avoid silently removing P4 user workflow |

These differences show that **a simple overwrite or merge accepting only one
side can silently break callers or data contracts.** No application code
integration should proceed until there is an explicit compatibility decision
for the above behaviors. The staging workbook's current schema and the
accepted V8 runtime must **not** be migrated or altered during this phase.

## Ordered execution plan, each gate independently verifiable

1. **Freeze bases** — re-fetch the current remote `main` and all PR head SHAs;
   stop if any ref moved, and update this plan before cherry-picking or merging.
2. **Reconcile overlap before merging** — compare P1–P4 and G-22/G-11/G-21/
   G-24/G-29 behaviors and schemas; explicitly decide which contracts are
   authoritative, especially around privileged data and migrations.
3. **Rehearse only on the isolated branch** — execute a local isolated
   three-way merge into this branch or carefully scoped changes. Record
   conflicts and decisions. Keep all original PRs and staging deployment
   untouched. A clean Git merge alone is **not** acceptance.
4. **Preserve canonical modular build** — reconcile `src/server/*`,
   `src/web/*`, package scripts, and workflow. Run `npm run build` and
   `npm run build:check`; verify that both One-Click artifacts match
   the modular sources byte-for-byte.
5. **Test contracts before human review** — Node full suite; P1–P4
   auth/privacy/governance, G-chain regression tests, G-30 release
   parity, G-31 pinned model, G-32 job ownership/terminal semantics/503-only
   bounded retry/no duplicate reports; offline release preflight.
   No real Gemini calls and no Apps Script installer/migration as part
   of automated integration.
6. **Independent review** — produce source diff, conflict-resolution matrix,
   explicit feature preservation evidence and a Draft integration PR to
   `main` for CI/review. Treat any missing live platform or deployment
   verification as an open gate, not implicit PASS.
7. **Human approval for merge** — no merge of this branch, #60, #58,
   ancestor feature PRs or the P-chain until specifically authorized.
   Production promotion, migrations, Google Sheets changes and templates
   require **separate** approval.

## Explicit stop conditions

- `main` or pinned G-32 V8 source changed unexpectedly.
- Any merge resolution replaces or drops P1–P4 privacy/schema contracts
  without a documented decision.
- Deterministic source-to-One-Click parity fails.
- Auth/accessibility, idempotency, ReportRegistry/Audit or data-migration
  tests regress.
- An integration step requires Google Workspace mutation, another Gemini
  request, production deployment, or merging an unreviewed PR.

**Current state:** Only a new isolated branch and this governance/preflight
document exist. **No application source integration yet; no claim of
integration CI PASS.** Staging V8 acceptance remains valid and independent.

## Rehearsal 1: isolated v7 source import and CI evidence (2026-10-09)

**Branch and Draft PR:** `integration/g32-v8-main-preflight-20261009`,
[Draft PR #64](https://github.com/9GotStory/smart-srrt/pull/64) → `main`.
A snapshot of 50 V8 app/module/test/build/document paths was imported
**only into the isolated preflight branch**, while original P1–P4
`main` tests and P1–P4 docs were preserved. This is an **incomplete
compatibility candidate**, not a merge decision or staging deployment.

**CI run:** https://github.com/9GotStory/smart-srrt/actions/runs/37883220420
`FAIL`: 219 Node tests: **197 PASS / 22 FAIL**; G-30 modular-to-One-Click
byte parity PASS; 7/7 contract tests PASS; offline release code check PASS.
A failing integration rehearsal is useful evidence, NOT an approved release.

Test-group failures:
- **P1 1:** legacy updateRecord fixture is missing `PropertiesService` because
  V8 uses additional server/job/config guards. Reconcile test harness and
  required authorization checks; do not simply delete the fixture.
- **P2 6:** original `aggregateEventRows_` helper and exact public browser
  expressions differ from V8's `buildDashboardAggregate_` architecture.
  Revalidate public aggregate-only data boundary, criteria exactness and
  private EventID suppression with behavioral tests.
- **P3 8:** main P3's 44-column workflow/owner metadata and
  `deriveWorkflowStatus_`/`ensureWorkflowData_` API differ from
  V8's G-03/G-04/G-05/G-19 lifecycle/status model.
  Preserve EventID/Revision semantics and reject schema-offset collisions.
- **P4 7:** P4's archive, MasterData, VisitLogs, Attachment and UI RPC shapes
  differ from V8's stricter G-series contracts.
  Tests that assert the legacy spelling/API must not be satisfied by unsafe
  aliases that bypass V8's permissions, revision checks, retention policy,
  or data redaction.

**Crucial evidence from actual pinned source (not inferred):**
- Main P3/P4 MainData columns 39–44:
  `WorkflowStatus, OwnerUserID, OwnerAssignedAt, ClosedAt, ClosedBy, CloseReason`.
  **G-32 V8 expects `OwnerUserID` at column 39**. G-05's
  `ensureEventOwnerSchema_` correctly throws on a nonempty header collision,
  rather than guessing a column mapping. A P4→v7 data conversion must not run
  without explicit mapping, verification and backup.
- Main P4 `EventAttachments` **11 columns**:
  `AttachmentID, EventID, FileID, FileName, MimeType, FileSize, DriveUrl,
  Description, Status, CreatedAt, CreatedBy`. V8 G-11 **13 columns**:
  `AttachmentID, EventID, FileID, FileName, MimeType, SizeBytes, Description,
  Status, UploadedAt, UploadedBy, RemovedAt, RemovedBy, RemoveReason`.
  Column 6 and all later positional meanings differ, and P4 `archived`
  must not be confused with V8 `removed`. Existing G-11 header
  validation rejects nonmatching populated headers.
- Main P4 VisitLogs `Timestamp, Page, RequestParams` versus V8 G-29
  `Timestamp, EntryPoint, LegacyRequestParams`; G-29 recognizes older
  `Timestamp, Page, UserAgent` but **not** the P4 `RequestParams` variant.
  V8 must not re-label columns containing sensitive raw request values
  without review/redaction.
- P4's `AuditArchive` is inside the primary workbook, with an
  `ArchiveKey` scheme. G-21 uses an external Audit archive keyed
  by `AuditID`; these are not interchangeable stores.

**Safeguard added:** a pure offline scanner,
`tools/p4-v7-schema-preflight.mjs`, plus
`tests/integration-p4-v7-preflight.test.mjs` (10 mock tests).
The scanner accepts header arrays only, performs **no** Google Workspace
reads/writes, reports version/offset conflicts and never authorizes
migration. It does not modify the Apps Script server or automatically
convert workbook data. A real migration needs separate design, fixtures,
backups, operator approval and post-migration verification.

**Current integration state:** intentionally **HOLD**. P1–P4 legacy tests
remain in place and can fail; do not remove/skip or silently rewrite them
to create a false green CI. Resolve behavioral and migration differences
with independent review and equivalent v7 regression coverage before
marking Draft PR #64 ready, merging, or altering the accepted staging V8.

## Rehearsal 2: criteria-scoped P2 KPI correction — 2026-10-09

**Functional regression found and corrected only on the isolated integration
branch:** accepted V8's `buildDashboardAggregate_` originally incremented
`investigated` for *any* event with a nonempty `col26`, regardless of the
exact `col17 === 'เข้าเกณฑ์'` predicate; the numerator could therefore
include ineligible events, unlike the P2 public-KPI contract. When there
were no qualifying events, the existing fallback used all event rows as
the denominator; that also conflicted with the P2 criteria-scoped rate.

**Integration-only correction:**
- Count `investigated` **only inside the `meetsCriteria` branch**,
  using a trimmed, nonempty investigation-date value.
- Keep `pendingCriteria` as qualifying events without a date.
- Compute `investigationRate = round(investigated / criteria * 100)`
  when `criteria > 0`, otherwise `0`.
- Preserve the existing V8 public aggregate *shape*: no EventID, private
  reporter data or investigation narrative in the aggregate.

**Regression evidence:** added
`tests/integration-p2-kpi-contract.test.mjs` (**5 tests**) with
ineligible dated records, qualifying denominator, no qualifying events,
missing/whitespace dates and no private data leakage.
Earlier added `tests/integration-p4-v7-preflight.test.mjs` (**10 tests**)
continues to pass. One-Click server regenerated byte-for-byte from the
seven modular server sources; frontend artifact unchanged.

**Latest combined CI:** https://github.com/9GotStory/smart-srrt/actions/runs/37883789256
reports **234 tests / 212 PASS / 22 FAIL**, same **22 untouched legacy
P1–P4 compatibility mismatches** as before. All **15 new P2/schema tests
PASS**; existing G-30, G-31 and G-32 regression tests remain passing;
deterministic One-Click parity PASS. This is **NOT** full Integration PASS
because 22 legacy failures remain unresolved.

**Do not deploy this isolated KPI fix to the operator's test-only V8
Apps Script** until independent review, P1–P4 reconciliation,
and a separate deployment authorization. The verified staging positive-path
UAT for the *unchanged* V8 release remains historical evidence, but
does not implicitly validate this later integration-only KPI correction.

## Gate 1: P4 to Schema v7 migration design — 2026-10-09

**Design-only candidate:** [P4 -> v7 data-preserving field map and offline test matrix](p4-to-v7-migration-design-2026-10-09.md).

The design covers MainData 39-44 owner/lifecycle collision, P4 11-field versus V8 13-field attachments, separate P4 AuditArchive versus G-21 external archive/AuditID, and P4 VisitLogs RequestParams versus G-29 privacy-clean headers. It includes typed field mapping, synthetic fixture cases, idempotent identity ledger requirements, archival provenance, rollback/stop gates and unresolved policy decisions.

**Gate status: DESIGN CANDIDATE — INDEPENDENT REVIEW REQUIRED.** This is not an implementation, a completed migration rehearsal, permission to alter real workbooks, or an Integration CI PASS. Existing 22 P1-P4 compatibility test failures remain open. The accepted V8 staging UAT, G-32 PR #60 and main remain untouched; Draft PR #64 remains HOLD. Application source, build artifacts and regression tests are unchanged by this Gate 1 documentation work.

## Rehearsal 3: synthetic P4-to-v7 transformation proposal — 2026-10-09

**Prototype scope:** `tools/p4-v7-offline-transform.mjs` and `tests/integration-p4-v7-offline-transform.test.mjs` added solely to this isolated integration branch, based on [Gate 1.1 design](p4-to-v7-migration-design-2026-10-09.md). This is a pure, synthetic-only planning function that always returns `status=HOLD` and `migrationAuthorized=false`. It does not invoke Google Workspace, modify the accepted staging application, or perform any migration.

The prototype's exact P4 header checks, 44-to-39 MainData proposal, 11-to-13 active Attachment mapping, Archive evidence preservation, UUIDv5 mock-only Audit identity allocations, VisitLogs privacy HOLD and deterministic snapshot fingerprint are subject to an **independent security and data-preservation review**. Synthetic marking is **not** a way to sanitize real patient data; do not pass real data to this library or log its candidate/evidence output. There is no approved historical-data storage, partial-copy replay, or operator migration implementation.

**CI evidence on candidate commit** `e4922a4a78300fa390d7fca1dfdf9d328b3dc242`:
[GitHub Actions run 37886446376](https://github.com/9GotStory/smart-srrt/actions/runs/37886446376) — **250 tests: 228 PASS / 22 FAIL**. All **16 new synthetic offline tests PASS**; G-30 deterministic One-Click byte parity, syntax/RPC contracts and offline P6 preflight PASS. The **same 22 pre-existing P1-P4 regressions** remain unresolved. The run is overall FAIL. Doc-only commits after this SHA require their own workflow verification.

**Decision: INTEGRATION HOLD.** Draft PR #64 remains Draft; no merge into main, no deploy, no migration or change to v7 staging, no Gemini calls, and no PR #60 modification. Next gate is independent review and behavioral P1-P4 reconciliation, not applying this proposal to a workbook.

## Rehearsal 4: P1/P2 behavioral reconciliation — 2026-10-09

**Detailed evidence:** [P1/P2 compatibility reconciliation and P3/P4 blockers](p1-p2-compatibility-reconciliation-2026-10-09.md).

**New integration-only defect correction:** in the logged-in web Dashboard, `investigated` previously counted dated but nonqualifying cases and `investigationRate` used a nonqualifying total-event fallback for zero qualifying cases. The frontend insight also misclassified whitespace-only investigation dates as present. Updated both `src/web/04-browser-app.html` and the deterministically compiled `Index_Smart_SRRT_OneClick.html` to match the already corrected public server KPI formula. Seven new browser/RPC behavioral tests PASS.

**P1:** completed old `updateRecord` fixture with legitimate empty MasterData mock, keeping validation active; added a negative/positive MasterData validation test (both invalid blocked and active value accepted with Revision/audit). All P1 assertions PASS.

**P2:** retained six original P2 tests with revised V8 API/result-shape assertions backed by independent browser/server behavioral regression tests. Strengthened G-23 static assertion rather than making it permissive. All P2 assertions PASS; including public aggregate-only redaction and authenticated-only raw data/export.

**CI evidence:** [GitHub Actions run 37887370869](https://github.com/9GotStory/smart-srrt/actions/runs/37887370869) on `ec6f78386e3ed3565d094a330dec344dc60735e9` — **261 tests / 246 PASS / 15 FAIL**; One-Click parity, syntax/RPC and offline release preflight PASS. The remaining **15 = P3 8 + P4 7**, not ignored. Overall Integration CI FAIL; P3/P4 semantics and migration are unapproved. Documentation-only follow-up commits need their own CI run.

**Review/merge boundary:** all fixes in Draft PR #64 only; accepted G-32 V8 UAT and main untouched; no Google Workspace interaction, migration, deployment, or Gemini calls. Independent reviewer has not given PASS. Preserve HOLD; no readiness transition or merge.
