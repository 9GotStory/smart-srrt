# P3 Workflow Reconciliation — Schema v7 (Integration Only)

Date: 2026-10-09 (Asia/Bangkok)  
Status: **TEST EVIDENCE PASS / INDEPENDENT REVIEW PENDING / RELEASE HOLD**  
Scope: G-32 V8 Schema v7 integration branch `integration/g32-v8-main-preflight-20261009`; Draft PR #64.  
Reference: main P3/P4 `043ddeffcc7f937e967ade4a6078101b0f544f96` and accepted V8 `e1f3c920b2bde3497f0850f188fe1bd025929731`.

## 1. Confirmed baseline incompatibility (no silent migration)

| Main P3 Schema v4 | V8 Schema v7 | Resolution in integration rehearsal |
|---|---|---|
| MainData 44 columns; WorkflowStatus at 39, OwnerUserID at 40, closure metadata 41–44 | 38 main/meta columns, plus OwnerUserID at 39 | Preserve v7 runtime; enforce strict `ensureEventOwnerSchema_` refusal when col39 is occupied by WorkflowStatus/nonblank legacy cells. Never alias source column 39 to OwnerUserID. |
| WorkflowStatus `OPEN/IN_PROGRESS/CLOSED/VOID`, persisted | `RecordStatus` `active/closed/void` + derived read-only lifecycle codes | Verify derived `received/verification_pending/criteria_pending/criteria_not_met/investigation_required/investigated/closed/voided` behavior. Conversion of historical workflow/closure values remains **unapproved** until separate secure mapping. |
| ClosedAt / ClosedBy / CloseReason stored in MainData | No dedicated closure metadata runtime columns | Preserve legacy closure evidence in a separately approved restricted package; preserve historical audit, never invent timestamps/actors. |
| `closeEvent` authorized via `edit`; `reopenEvent` no reason required | Both require `close_event`, nonblank reason, current expectedRevision, and audit | Preserve stricter V8 policy; regression verifies auth, reasons, stale revision refusal, row/ID integrity, status and Revision increment exactly once. |
| `findActiveUserById_` plus P3 owner assignment | `listAssignableEventOwners`, `findUserById_`, `assignEventOwner` with `assign` permission | Test active, edit-capable directory filtering; reject inactive/noneditor owners and stale revisions; unchanged owner is idempotent with no audit/revision increment; closed Event owner edit refused. |

**No migration implementation** is authorized or added by this work. The P4-to-v7 synthetic planner is not a workbook converter.

## 2. Substantive behavior restoration: P3 consistency warnings

The old P3 `getEventConsistencyWarnings_` included three nonblocking consistency notices for a sample with `col17='ไม่เข้าเกณฑ์'`, `col24='ลงสอบสวน'`, investigation date present and `col22` present while `col21` was empty.

The V8 `deriveEventConsistencyWarnings_` returned one of these but omitted two important checks. Reintroduced the following **advisory warnings** in the isolated integration source:
- `INVESTIGATION_FLAG_WITHOUT_CRITERIA`: investigation marked performed when criteria are not `เข้าเกณฑ์`.
- `MEASURES_DATE_WITHOUT_DETAILS`: `col22` has a measures date but `col21` lacks measures details.

The existing V8 `CRITERIA_NOT_MET_BUT_INVESTIGATED` remains. Void records still produce no advisory inconsistencies; consistent records produce none. Warnings are nonblocking and do not change write permissions, EventID, Revision or health-event values.

Changed exact files:
- `src/server/03-events-and-dashboard.gs` (canonical modular backend)
- `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` (compiled artifact, deterministic parity verified)

## 3. Test reconciliation and added behavioral regressions

Original `tests/p3-workflow.test.mjs` **retained all eight named tests** and refactored their assertions to the actual canonical V8 API:
1. v7 owner and identity schema: 39 columns, preserved first 38; no P3 WorkflowStatus runtime column.
2. Real `deriveEventLifecycle_` codes/labels and noninvented closure semantics (legacy closedAt alone must not mark closed).
3. Actual `deriveEventConsistencyWarnings_` 3 warnings, code/message fields; no warning for void or consistent record.
4. Idempotent `ensureEventOwnerSchema_` on correctly initialized v7 header; reject WorkflowStatus collision and nonblank cells under a blank column-39 header.
5. Active/edit-capable owner directory; reject inactive and noneditor accounts; `assign` permission enforced.
6. Close/reopen mutation: exact EventID, unchanged physical row, Revision 1→2→3, record status active→closed→active, full audit action and reason; require `close_event`.
7. Missing reason, stale Revision, closed mutation refusal and void lifecycle remain separate; no retrospective reopen of void record.
8. Browser owner/lifecycle controls and role checks exist, without adding a task subsystem.

**Three additional direct behavioral tests**:
- `assignEventOwner` denies inactive/noneditable owner and stale Revision, accepts active editable account and writes exactly one revision/audit, and does nothing on unchanged owner.
- `assignEventOwner` refuses closed events and denied `assign` permission without mutation.
- `closeEvent/reopenEvent` requires explicit `close_event` permission and rejects stale revisions without unintended mutation.

These tests use in-memory synthetic FakeSheet/FakeRange and VM source execution, not Google services or patient data. They do NOT independently certify real Google authorization, security review or release readiness.

## 4. CI evidence

Candidate implementation SHA `e1d9f1edc3707f307202351395faf158e96b8f92`.  
[GitHub Actions run 37887921987](https://github.com/9GotStory/smart-srrt/actions/runs/37887921987):

| Check | Result |
|---|---|
| Node complete suite | **264 total / 257 PASS / 7 FAIL**, zero skipped |
| All eight refactored P3 original tests | **PASS** |
| Three new P3 owner/permissions/revision tests | **PASS** |
| P1 / P2 integration suite | PASS |
| Deterministic One-Click parity | PASS |
| Syntax / RPC / duplicate declarations | PASS |
| Offline P6 release preflight | PASS |
| Remaining blockers | **Seven original P4 Governance failures** |

Overall CI status **FAIL**, because P4 old/current governance semantic differences have not been reconciled. P3 **test evidence** has passed, but is not an **Independent Review PASS** or migration authorization.

## 5. Next-stage gate and explicit prohibitions

**P3 independent review gate:** reviewer other than the implementation author must inspect the exact final integration SHA, source/test scope, permissions, conservation of EventID/Revision/row state, and nonblocking warnings; execute tests and issue per-finding PASS or REWORK. Source/target historical closure preservation needs a separate reviewed storage/retention decision.

**P4 Governance remains HOLD (seven legacy test failures)**:
- 44-column legacy MainData vs 39-column v7: immutable historical evidence design pending approval.
- VisitLogs P4 Page/RequestParams vs v7 EntryPoint/LegacyRequestParams, no parameter-harvesting or unreviewed historical purge.
- Legacy archive attachment (edit/archived) vs v7 removal (delete/removed, reason, revision).
- MasterData P4 mutability vs v7 restricted canonical criteria/verify statuses and inactive legacy values.
- Inline P4 AuditArchive/ArchiveKey vs external G-21 year archive/AuditID; retention/copy-verify-delete provenance.
- Browser governance RPC changes; never add unsecured compatibility aliases solely to satisfy old tests.

**Release decision:** **HOLD**, Draft PR #64 remains Draft. No merge to main, no staging/production deploy, no Apps Script installer, no real Google Sheets/Drive work, no Gemini calls, no live-data import. Accepted V8 staging UAT and source PR #60 remain untouched.
