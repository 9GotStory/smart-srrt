# Smart SRRT D331 — P0-30D CaseID, Privacy & Security Decision Gates

**Date:** 20 October 2026 (ICT)  
**Source baseline:** `main@d041fd27ce9d3974eaeff6ece7fd3703125fd84a` — P0-30C merged, [post-merge CI #39391491653](https://github.com/9GotStory/smart-srrt/actions/runs/39391491653) PASS (64 Contracts / 1,026 Regression).  
**Deployment:** Last Product Owner-confirmed **existing Development Web App Version 20**; not advanced by source-only merges. **No Production**.  
**Status:** **REVIEW PACKET ONLY / ALL LIVE-CASE GATES HOLD.** No owner signature, data/PHI approval, live access, credential, new tab, Script Property mutation or deployment is represented by this document.

## 1. Why P0-30D exists

P0-30A and P0-30B established only **unmounted, strictly synthetic** Records Event→Case seams; P0-30C independently checked the existing internal candidate reader against mocked-GAS negative cases. The real backend `src/dengue/15-p0-22b2-case-read-integration.gs` is **unregistered**, hard OFF and not callable as a public Case-list RPC. Its `READ_ONLY` test-only projection is deliberately incompatible with the UI `MOCK_ONLY` DTO. Existing `getDengueWorkspace` is count-only and OFF.

There is **no missing second server reader to build now**. The limiting factors are unresolved decisions about:
- **D2:** whether CaseID is globally unique/immutable or only Event-scoped, how revision, VOID, orphan parent and concurrent edits are handled;
- **P1/P2:** whether a scoped user may indirectly cause a cross-Event identifier scan and which minimal Case fields may be returned at all;
- **S1/S2:** how per-Event rights are issued, independently approved, revoked and verified after a restored stale workbook.

The choice to use **Option A** grant backing and **R1 independent journal + R3 restore quarantine** was recorded in [Issue #213](https://github.com/9GotStory/smart-srrt/issues/213) as a **design baseline only**. This does **not** select a provider or prove that a restore cannot resurrect rights. New implementation of an independent journal is **outside this five-area D331 MVP source review**. If such proof remains unavailable, live Case reads remain OFF; do not waive it based on passing offline tests.

## 2. Exact source-backed findings (not operational attestation)

| Existing source | Confirmed behavior | Limit that it cannot prove |
| --- | --- | --- |
| `src/dengue/07-p0-02a-mvp-schema-contract.gs` | Seven v2 D331 table contracts (including `D331AccessGrants`); 16-field `DengueCases`; `D331_P002A_APPROVAL_='DRAFT_ONLY'` | A schema contract or historical header inventory is **not** current workbook binding, signed Case lifecycle or grant authority |
| `src/dengue/09-p0-03b-dev-readonly-adapter.gs` | `D331_P003B_ENABLED_=false`; approved spreadsheet/disease labels/policy revision empty; unique current user/active Event/Area and `dengue.case.read` grant are checked in the private mocked candidate | Missing source approvals remain HOLD; current session/role does not grant access; grant table state alone has no independently trusted revoke-forward evidence |
| `src/dengue/15-p0-22b2-case-read-integration.gs` | Unregistered private reader; `ENABLED_=false`, approved fields `[]`, `REVOCATION_APPROVED_=false`. Before reading Cases it checks the server context. It scans at most 10,000 `DengueCases` `CaseID+EventID` identifiers, rejects globally repeated CaseID, then reads up to 100 matching Event cases and projects three test-only fields. Generic denial; `NOT_EVALUATED` | Cross-Event A:B scan is **not yet approved**. A source-level two-stage index/detail drift check is **not an atomic Google Sheets transaction**. `CaseID`, `CaseRevision`, `CaseStatus` are **not privacy-approved** for browser display |
| `tests/d331-p0-22b2-server-case-read.test.mjs` plus P0-30C | Synthetic VM tests confirm disabled flags deny before Google-service mocks, scoped grant over role, stale/duplicate/invalid Event, wrong binding/headers, invalid rows, and that `READ_ONLY` is rejected by P0-30A/B | Tests temporarily enable flags **inside the VM**; they **do not** exercise live Script properties, real Sheets rows, real revocations, external provider, or authenticated browser Case access |
| `docs/implementation/d331-p0-22e-caseid-privacy-clinical-decision-record.md` and [#238](https://github.com/9GotStory/smart-srrt/issues/238) | Earlier accountable decision matrix D2/P1/P2/S1/S2/C1/C2/D1/T1; its statuses remain HOLD | This P0-30D document **does not supersede any decision** or make the named decision-maker's sign-off |

**Environment-evidence caution:** Historic metadata reported 17 tabs (seven D331 v2 tabs / 113 ordered headers), but older Option A design text in #213 says a grant tab had not yet been created. These statements refer to **different stages**, and neither is a fresh independently attested current workbook inventory. Before any live-read gate, the custodian must reconcile dated physical tab/ACL/header evidence **without any patient-row read or mutation** and record a versioned status-only attestation in restricted evidence.

## 3. Required decision register — all defaults HOLD/DENY

A signature must be an **explicit scoped decision by the accountable owner**, with date, decision version, exact evidence link (private where necessary), exclusions and expiry/review trigger. **Code, test fixtures, GitHub PR merge, admin role or Product Owner authorization to write documentation is not equivalent to any sign-off below.**

| Gate | Accountable decision-maker | Choice needed (no assumed default) | Sufficient acceptance evidence | If not approved |
| --- | --- | --- | --- | --- |
| **D2-1 CaseID identity** | Data Steward / D331 data custodian | `GLOBAL_IMMUTABLE` **or** `EVENT_SCOPED` **or** `HOLD`. Exact canonical ID version; uniqueness over ACTIVE/VOID and historical/imported cases | Versioned rule with synthetic counterexamples: duplicate IDs same/different Events, lowercase format, historical corrections, migration treatment | **HOLD** Case reader; if EVENT_SCOPED, redesign existing global scan/uniqueness tests first |
| **D2-2 lifecycle** | Data Steward + SRRT workflow owner | Event closed/reopened; Case `ACTIVE/VOID`, `CaseRevision`, orphan Event; concurrent update/TOCTOU, unknown partial reads | State/transition table and fail-closed cases; revision agreement / read consistency accepted limits, no claim of atomicity | HOLD Case read/Case write; `NOT_EVALUATED` SLA |
| **P1 cross-Event A:B scan** | Privacy Officer + Data Custodian | `APPROVE_SCOPED_BACKEND_SCAN` **or** `DENY_REDESIGN` **or** `HOLD`. **Separate** from D2-1 global uniqueness | Written purpose/necessity/proportionality, actor/role/Event scope, alternate strategy assessment, identifiers touched, redaction/logging/retention and access audit | **No cross-Event A:B scan**; if denied, source & tests must be redesigned to a privacy-approved algorithm before any live read |
| **P2 minimal Case-list DTO** | Privacy Officer + SRRT data owner | Exact fields and meaning of `CaseID`, `CaseRevision`, `CaseStatus`; per-user purpose, display/storage/export policy; allow only versioned selection or HOLD | Explicit field-by-field table, user/Area/Event limits, data minimization and denial shape, no AI Reporter/Gemini/Public Library/prompt/log/attachment leakage | No real Case identifiers/status to browser; mock stays separate |
| **S1 issuance / grant lifecycle** | Security/Auth owner + Operations custodian | Exact `dengue.case.read` issuer, independent approver, revoker/auditor, recipient restrictions, expiry, separation of duties, reissue semantics | Versioned per-Event/Area/UserID/capability map and negative misuse cases (including Admin without grant), actor identity and health/audit response | No grants issued, no live Case read; roles alone never suffice |
| **S2 revoke-forward / restore** | Security owner + independent Operations/restore custodian | Chosen R1+R3 design **operationally instantiated and attested**, independent from restored grant sheet; provider/ACL/key custody/reconcile owner defined | Before/after **isolated test only under new authorization**: revoke → stale backup restore → quarantine → no reauthorization; outage/unavailable journal/mismatch/race fail closed. Evidence has PHI-free receipts | `D331_P022B2_REVOCATION_APPROVED_` stays false; no live Case read |

### Decision separation and non-bypass rules

1. **D2 GLOBAL does not grant P1 scan permission.** Even if CaseID must be globally unique, that does not authorize every event-scoped user request to scan identifiers of other Events.
2. **P1 scan approval does not imply P2 disclosure.** The server touching A:B for an approved purpose does not make CaseID eligible for browser, logs, exports or AI.
3. **P2 approval does not imply S1 grant or S2 revocation.** Identity/authorization must be re-evaluated server-side per operation; browser/client claims never establish access.
4. **Option A and R1+R3 selected designs do not prove operation.** `RevokedAtUTC` in the same restorable workbook, mock `SIMULATED_ALLOW`, passing VM tests or a local backup restore drill cannot serve as independent durable revocation evidence.
5. **No silent public endpoint.** A future P0-22B2 read transport must have its own server contract/auth surface review and separate explicit implementation + merge + DEV deployment approvals.
6. **No live clinical SLA inference.** C1 exact dengue labels and C2 official 3h/3h/1-day event-clock rules are separate signoffs; return `NOT_EVALUATED` until clinically approved.

## 4. Privacy-aware architectural branch on P1

**Path A: P1 APPROVED with D2 GLOBAL.** Keep the current bounded 10,000-row A:B identifier scan *only after signed purpose, trusted current session, scoped Event+Area+Grant, and independently trusted revocation evidence*. Existing 100-case cap and index/detail drift check remain insufficient as proof of atomicity or release safety. A fresh security/privacy review must verify service visibility, audit minimization and runtime performance before integration.

**Path B: P1 DENIED.** The existing P0-22B2 implementation is **not fit for live use**; a source change must replace the cross-Event scan with a Data Steward-approved integrity mechanism that does not disclose/scan other Events on normal user Case-read requests. Do **not** simply delete global duplicate detection or switch uniqueness to Event-scoped: that would silently change the domain rule. Proposed alternate approaches (e.g. dedicated integrity verification by a separately authorized custodian during controlled maintenance, or separately approved precomputed integrity state) require their **own** design, operational proof and privacy assessment. No alternative is pre-approved here.

**Path C: P1 HOLD or D2 undecided.** No implementation of real Event→Case browser read and no live Case scan, even on DEV. Continue offline source/tests and use mock-only v20.

## 5. Offline negative evidence to require in the *next authorized source implementation*

These are **acceptance scenarios**, not claims that operational/cloud tests were run in P0-30D:

| Scenario | Expected behavior |
| --- | --- |
| B01 no/invalid token, inactive account, duplicate Event, wrong Area/closed Event | `D331_UNAVAILABLE` before Case content, no PHI |
| B02 Staff/Admin with no `dengue.case.read`, wrong Event/Area grant, wrong policy | DENY, no implicit role elevation |
| B03 grant revoked or expired; duplicate active tuple; self-approval | DENY; no first-match/merge permissions |
| B04 independent R1 journal offline/missing, unknown revocation proof | DENY and quarantine; **not** `ALLOW` via same-Sheet state |
| B05 restore stale workbook snapshot containing previously ACTIVE revoked grant | DENY until independent R1 evidence reconciled under R3 quarantine; requires real operational attestation |
| B06 P1 is DENIED/HOLD but cross-Event A:B scan attempted | DENY before the global scan; change design before activation |
| B07 CaseID collision across Events, orphan, VOID, stale Case/Event revision, edit between index/details | DENY according to versioned D2 lifecycle decision; preserve concurrency caveat |
| B08 wrong/pending DTO policy or unapproved `CaseID` exposure, PHI in logs/AI/export | DENY, redact, no browser detail |
| B09 Test UI `MOCK_ONLY` DTO mistaken for authorized backend `READ_ONLY` | DENY; never promote synthetic state/credentials |
| B10 binding mismatch, restored earlier schema, missing/ambiguous D331 grant tab | DENY before case read; no fallback/auto-create |

For each case, produce a synthetic-only local proof first; any actual cloud-read/isolated restore or authority drill requires separately approved operator identities, exact private DEV target, clean backup/isolation plan, audit receipt and a STOP procedure. No test may reuse patient records.

## 6. Five-domain release dependency map

- **Database:** D2-1/D2-2 signed + current original 39/14/10 and seven D331 headers / owner identity status-only attested; no new Google Sheets assumed.
- **Backend GS:** one private existing candidate; no duplicate reader; B1 approved minimal read-only DTO and server endpoint design only **after** Security/Privacy; flags remain OFF.
- **Frontend Records:** P0-25 mock visible v20; P0-30A/B unmounted code merged in GitHub; real Event selection requires server-authoritative context and separate approval. No extra D331 page or login.
- **Security/Privacy:** P1/P2/S1/S2 and R1/R3 provider/restore gates, distinct signed scope, no implicit Admin role; until then no service.
- **Testing:** existing offline 64 Contracts / 1,026 Regression from P0-30C source Merge. **No** authenticated DEV Case read/PHI negative E2E completed. Future isolated UAT must separately verify normal Records regressions and denied requests, after signoff.

### Ordered work without expanding scope

1. **P0-30D (this PR):** Publish **decision-ready documentation only**, independent readback of exact main/PR SHA and CI. No source implementation, configuration, physical schema or cloud changes.
2. **Decision handoff in Issue #238:** Record each accountable owner’s explicit status and evidence. A Product Owner can ask for the decision packet but cannot replace Privacy/Security/Data/Clinical attestation merely by approving a source merge.
3. **If P1 denied or D2 identity differs:** create a **separate source-only redesign issue/PR** for the current `15-` candidate with negative tests; keep unregistered/OFF.
4. **If all relevant live read decisions pass:** separately review B1 private reader transport and case-list DTO plus P0-30A/B UI boundary; source-only → independent CI/review → separate Product Owner merge → separate authorized guarded DEV deploy → isolated UAT. No automatic permission escalations or reads.

## 7. Sign-off template (copy to Issue #238 *only by accountable approvers*)

```text
P030D_DATA_D2_IDENTITY=HOLD|GLOBAL_IMMUTABLE|EVENT_SCOPED
P030D_DATA_D2_LIFECYCLE=HOLD|SIGNED_VERSIONED
P030D_PRIVACY_P1_CROSS_EVENT_SCAN=HOLD|APPROVED_SCOPED|DENIED_REDESIGN
P030D_PRIVACY_P2_CASE_DTO=HOLD|APPROVED_VERSIONED
P030D_SECURITY_S1_GRANT_LIFECYCLE=HOLD|OPERATIVE_PASS
P030D_SECURITY_S2_RESTORE_REVOCATION=HOLD|OPERATIVE_PASS
P030D_D1_EXISTING_DEV_BINDING=HOLD|ATTESTED_METADATA_ONLY
P030D_C1_DENGUE_LABELS=HOLD|SIGNED_VERSIONED
P030D_C2_331_CLOCKS=HOLD|SIGNED_VERSIONED
P030D_LIVE_READ=NOT_AUTHORIZED
DECISION_ROLE=<accountable function, no personal identity in public logs>
DECISION_REVISION=<approved document ID / date>
EVIDENCE_LOCATION=<restricted reference, no credentials/patient data>
```

A status of `SIGNED_VERSIONED`, `APPROVED_SCOPED` or `OPERATIVE_PASS` must include supporting evidence and approved operational scope; writing those words in a code comment or PR does not constitute approval.

## 8. P0-30D status

```text
P030D_BASE_SHA=d041fd27ce9d3974eaeff6ece7fd3703125fd84a
P030D_REVIEW_TYPE=SOURCE_ONLY_DOCS
P030D_CASEID_GLOBAL_POLICY=HOLD
P030D_CROSS_EVENT_SCAN_PRIVACY=HOLD
P030D_CASE_DTO_PRIVACY=HOLD
P030D_GRANT_LIFECYCLE=HOLD
P030D_R1_R3_DESIGN=SELECTED_ONLY_NOT_OPERATIVE
P030D_REVOCATION_RESTORE_PROOF=HOLD
P030D_SOURCE_FLAGS=OFF_UNCHANGED
P030D_REAL_CASE_READ=NO
P030D_GOOGLE_SHEETS_ACCESS=NO
P030D_DEV_WEB_APP_VERSION=20_LAST_OWNER_ATTESTED
P030D_DEPLOY=NO
P030D_MERGE=REQUIRES_SEPARATE_PRODUCT_OWNER_APPROVAL
```

**Sources and dependencies:** [P0-22E policy packet](./d331-p0-22e-caseid-privacy-clinical-decision-record.md), [P0-22D2 CaseID candidate](./d331-p0-22d2-case-id-integrity.md), [P0-30C backend audit](./d331-p0-30c-backend-authorization-contract.md), [#213 R1/R3 design-only](https://github.com/9GotStory/smart-srrt/issues/213), [#238 policy decisions](https://github.com/9GotStory/smart-srrt/issues/238), [#248 five-area workstream](https://github.com/9GotStory/smart-srrt/issues/248).
