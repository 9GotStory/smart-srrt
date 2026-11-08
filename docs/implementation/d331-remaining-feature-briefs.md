# Smart SRRT — Dengue 3-3-1: Remaining Feature Briefs

**Repository path:** `docs/implementation/d331-remaining-feature-briefs.md`  
**Snapshot date:** 21 October 2026 (Asia/Bangkok)  
**Repository:** https://github.com/9GotStory/smart-srrt  
**Purpose:** Product-level **requirements backlog**, separated by feature, for **Claude Code + installed Matt Pocock Skills** to produce a detailed plan for **one feature at a time**. **THIS DOCUMENT IS NOT AN IMPLEMENTATION PLAN OR AUTHORIZATION.**

## 1. Verified baseline and interpretation

- `main@ae282e91831b1528598cb15213f1b4d890bf6cf3`: [PR #254](https://github.com/9GotStory/smart-srrt/pull/254) **squash merged** (P0-31A offline Case→Plan, 2 new files). Pre-merge CI [#39568661012](https://github.com/9GotStory/smart-srrt/actions/runs/39568661012) passed **64/64 contracts**, **1,033/1,033 regression**, including **7/7 P0-31A tests**. **Post-merge main CI has not yet been independently verified**; do not mark PASS without exact-SHA evidence.
- [PR #253](https://github.com/9GotStory/smart-srrt/pull/253): P0-30F0 offline CaseID/P1 strategy tests; still **OPEN/DRAFT, not merged** as of the snapshot. Review separately; it is **not** an implicit prerequisite to finishing mock-only UI.
- Last Product Owner-confirmed existing **Development Web App Version 20**. D331 **OFF**; browser UAT **8/8 PASS is for the mock-only existing DEV view**, not patient data or a functional D331 backend.
- Existing Google Sheets DEV workbook: earlier authorized setup of **seven D331 v2 tabs / 113 ordered headers**, but current live bindings, grants and real data authorization **have not been re-attested**. This historical header evidence is **not** permission to read/write rows.
- There is **no Production environment**. Reuse existing application/auth/Records screen/Apps Script project/DEV deployment/Google Sheets; restricted existing identifiers are recorded in [Issue #189](https://github.com/9GotStory/smart-srrt/issues/189), not repeated here.
- This backlog reflects *feature completion*, not absence of all code: some private GS CRUD/read candidates and offline mock implementations already exist. **Inspect and reuse** those sources rather than rebuilding them.

## 2. Functional goal and invariant boundaries

A user with explicitly authorized access should eventually be able to work through:

`Existing Event → Dengue Case → Investigation/Plan → Control Actions → Entomology (HI/CI) → Follow-ups → Approved 3-3-1 Assessment → Event/Dengue Summary`

The implementation should remain organized within the original five areas: **Database / Backend (Apps Script) / Frontend (UI/UX) / Security / Testing**. This is a **functional MVP**; avoid creating a separate application, database, standalone authentication or unnecessary journal/provider/cloud infrastructure.

**Permanent scope rules until separately approved:**

- Preserve **D331 OFF** and deny-default server permissions; synthetic fixtures must be visibly and technically distinct from real data.
- No PHI, real patient row reads, live Case CRUD, Script Property/ACL mutations, creation of grants, `clasp push`, DEV deployment or physical Google Sheets alterations merely because a source PR was merged.
- Preserve original Records behavior, Login/Logout, Native source manifest and unrelated AI Reporter/Public Library boundaries. Do not send patient/Case data to Gemini, public dashboard, logs, exports or external tools without distinct approval.
- Respect exact-HEAD review, scoped PR, pinned CI and **separate Product Owner approval for Merge and Deployment**. Do not treat general “continue” as standing authorization for live data.
- Policies D2/P1/P2/S1/S2/C1/C2 and verified DEV source/data binding remain **HOLD** until the accountable human provides a dated/versioned, scoped decision. The technical proposal `GLOBAL_IMMUTABLE` + `DENIED_REDESIGN` is **not an approved policy**.

## 3. Remaining feature register (requirements, not task breakdown)

These IDs are **document-local backlog labels**, **not GitHub Issue numbers**. Matt Skills should decide precise slices, sequencing, acceptance tests and code changes after inspecting the current source.

| ID | Feature | Current state | Expected capability | Dependence / gate |
| --- | --- | --- | --- | --- |
| **F01 / P0-31B** | Case→Plan mock UI and lifecycle | T1 composed UI plus T2 registered Records/Auth integration implemented with S1–S3 offline tests; exact Case/Plan mirrors, standalone partials unregistered | Existing Records disclosure offers synthetic Case→Plan preview with shared reset/session/disclosure fences | Source/offline complete: #261 merged, exact post-merge CI PASS and #257/#258/#259 CLOSED/completed on 29 October 2026; live data/deploy HOLD |
| **F02** | Event→Dengue Case real workflow | Read/create/explicit PATCH merged, canonical package OFF; separate synthetic DEV Version 22 UAT PASS on 4 November 2026 ([#238](https://github.com/9GotStory/smart-srrt/issues/238)) | Authenticated, Event-linked Case read and eventually mutation with proper revision/status | Real data: D2/P1/P2, Security, verified DEV binding; separate read/write gates |
| **F03** | Plans / investigation workflow | #269 source-only workflow + synthetic/offline S1–S3; private source unregistered and client separately OFF; no live Plans workflow | Plan per authorized Case/Event, responsible staff, status and revision | Depends on Case domain decisions and permitted backend access |
| **F04** | Control Actions | Source/schema candidates only | Log planned/in-progress/completed control activities, results, dates and evidence | Plan linkage, bounded rights and validations |
| **F05** | Entomology HI/CI | Schema/count contract exists; no functional user workflow | Record inspections and calculate transparent HI/CI from valid numerators/denominators | Survey rules and accepted reporting scope |
| **F06** | Follow-ups | Schema/workflow candidates only | Assign, complete and track follow-up checkpoints without losing history | Plan/Action linkage, checkpoint approval |
| **F07** | Clinical 3-3-1 rules / SLA | `NOT_EVALUATED`, no approved clinical clock | Correct timeliness/deadline/status based on approved policy | **Must** obtain signed C1/C2 clinical rules first |
| **F08** | Dengue dashboard + Development E2E | Only original dashboard and mock browser smoke pass | Privacy-safe summaries and complete authorized DEV workflow UAT | Data/permission/clinical gates and isolated DEV UAT approval |

### F01 / P0-31B — Synthetic Case → Plan in Records

**User outcome:** Within existing authenticated Records preview, an existing Records-authorized tester can create a synthetic Plan from an existing **synthetic** ACTIVE Case and clearly understand that no actual disease record is used.

**Acceptance intent:**
- Existing [P0-31A model](../../src/web/03n-client-d331-case-plan-offline.html) and P0-23/P0-25 Case mock remain the source of truth; no duplicate standalone mock framework.
- **Case reset/reseed**, Events context change, logout, permission loss, disclosure close and disposal clear/invalidate linked Plan state **and queued asynchronous saves**. A reused synthetic CaseID must not silently carry an old Plan.
- Loading/empty/error states, double-click protection, keyboard/mobile readability and regression of original Records behavior.
- Must remain MOCK ONLY; no registration of real GAS case/plan service, no Sheets IO, no clinical SLA status, no hidden real-person data.

**T1 source/offline evidence, 22 October 2026:** [#258](https://github.com/9GotStory/smart-srrt/issues/258) composes the existing Case and Plan models in a supplied offline root. ACTIVE Case selection, bounded EpisodeKey, save/cancel/list/empty/error/busy states and safe reset are covered through [S2 actual DOM actions](../../tests/d331-p0-31b-case-plan-records.test.mjs). [S1 model tests](../../tests/d331-p031a-offline-case-plan.test.mjs) cover read-only `resetGeneration()` independently of CaseRevision, saved/draft/queued Plan invalidation on Case reset/reseed, precommit validity checks and copy-out/validation. Ordinary Case edits preserve valid saved Plan linkage. Disposal, changed/invalid offline synthetic context, observed change-and-return, remount and retained handlers cannot revive old work. Field input/change updates validation, status and Save availability in place, preserving the focused field and pending Save/Cancel click targets. Invalid visible values disable Save without widening the bounded model contract or echoing input payloads.

The standalone offline composed entry is `d331P023OfflineCaseWorkspace_.mountComposed(root, {isValid, syntheticEvent})`; these optional local callbacks return a Boolean and the fixed synthetic EventID. Call `refresh()` when validity/context changes so a change-and-return is observed and latched. Neither callback supplies credentials or user profiles to domain models. Native Records now uses `mountComposed` inside its existing disclosure through the session bridge. Case and Plan scripts have separately identified exact mirrors in the already registered Records partial; standalone partials remain unregistered. Native26 is unchanged, D331 stays OFF and clinical status stays `NOT_EVALUATED`.

**T2 source/offline evidence, 22 October 2026:** [#259](https://github.com/9GotStory/smart-srrt/issues/259) reuses T1 in the registered Records/Auth source, loaded in manifest order by [S3 tests](../../tests/d331-p0-31b-case-plan-records.test.mjs). Only explicit disclosure opening by existing `Super Admin` / `Manager` / `Admin` roles mounts the composed workspace; Staff and guests remain denied. `updateAuthBox()` reconciles session identity and permission immediately without waiting for dashboard loading. The bridge passes only local validity/context callbacks into the workspace and rechecks before Case/Plan commit and repaint. Token/account/user-object replacement, in-place identity/role changes, observed loss-and-return, logout, disclosure close (including before its toggle event), disposal and observed synthetic context change-and-return invalidate both models, drafts, queued saves and DOM. Reopening starts from the fixed synthetic seed. Ordinary Records rerender/filter refresh preserves the draft and original controls, while repeated mounting keeps one bridge listener. Existing count-preview behavior and synchronous logout reset remain intact. Case reset, normal Case edits, Plan cancel/save/validation/duplicate/busy/error states and focus restoration also run through the registered UI offline.

The bridge exposes `reconcile()` for observed session/context changes and `dispose()` for detached disclosure owners; `refresh()` keeps its existing mount/preserve behavior. Session values remain in the bridge closure, outside domain models/DOM. Synthetic Event context is fixed in Native Records, with no real Records selection or Event binding. Optional offline `syntheticEvent` callback changes must be reconciled when observed to fence change-and-return.

**P2 correction, 29 October 2026:** The Records bridge observes the disclosure's `open` attribute with old values, so a close/reopen invalidates the prior lifetime even when the browser coalesces its queued `toggle` notification. Reconciliation and model validity checks drain pending mutation records before retaining a workspace or committing queued work. Disposal disconnects the observer. Existing S3 tests now model attribute-mutation microtasks independently from toggle delivery: saved Plans are cleared, old Case/Plan controllers and queued work are invalidated, and retained controls cannot affect the fresh seed. Same-value open writes and normal filtering preserve the current draft. Exact canonical/native mirrors remain required; these are offline tests, not Browser UAT or deployed evidence. The browser event and mutation-record contracts follow the [HTML details specification](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element) and [DOM MutationObserver specification](https://dom.spec.whatwg.org/#interface-mutationobserver).

**T1 start gate satisfied:** [PR #260](https://github.com/9GotStory/smart-srrt/pull/260) was independently reviewed at `2515b3395396ed7a67cf9f2957e55f9b0ced9dd7`, separately PO-approved and merged to `a46c2c18cac8423db2d23350a58b004b137b1863`; [post-merge CI](https://github.com/9GotStory/smart-srrt/actions/runs/39746229741) passed at that exact SHA before T2 started.

**F01 source/offline completion — 29 October 2026:** [PR #261](https://github.com/9GotStory/smart-srrt/pull/261) was independently reviewed at exact HEAD `39ed9409f7e8dc82a03adbbc33cfa571a45af8f3` against base `a46c2c18cac8423db2d23350a58b004b137b1863`, with Standards/Spec PASS and zero findings; the PO supplied the separate non-author ChatGPT review report and separately approved Merge. [Exact-head CI #40787548022](https://github.com/9GotStory/smart-srrt/actions/runs/40787548022) passed. Squash merge `f8418c200564da7b9ef9370d350ad890b6a910ca` has the approved base as its sole parent and the identical reviewed tree. [Post-merge main CI #40791741358](https://github.com/9GotStory/smart-srrt/actions/runs/40791741358) completed SUCCESS at that exact merge SHA. [Parent #257](https://github.com/9GotStory/smart-srrt/issues/257) and T1/T2 [#258](https://github.com/9GotStory/smart-srrt/issues/258)/[#259](https://github.com/9GotStory/smart-srrt/issues/259) are CLOSED/completed for the approved synthetic source/offline acceptance criteria.

**Still not verified / authorized:** Fake-DOM/VM evidence is not Browser UAT, deployed observation, real-data or clinical acceptance. D331 remains OFF and clinical NOT_EVALUATED; deployment, migration and data/privacy/security/binding gates remain separate HOLD gates. Broader #215/#238/#248 retain their own scope; #253 merged separately as a tests-only comparison, not D2/P1 policy approval.

**Planning gate:** Source-only and local/synthetic tests are permissible; any registration of new HTML in the Native package or actual DEV deployment needs its own reviewed change/authorization.

### F02 — Event → Dengue Case read / add / edit

**User outcome:** For an authorized Event, view linked Cases and ultimately add/edit them with explicit Server-side event/area/user checks, revision/conflict handling and correct empty/error states.

**Acceptance intent:**
- Reuse `src/dengue/15-p0-22b2-case-read-integration.gs` private reader, `src/dengue/09-p0-03b-dev-readonly-adapter.gs` and existing guarded CRUD candidate as appropriate, **not a second Case Reader**.
- Verify unique parent EventID, current session, AreaID/disease scope, case identity and status; do not authorize from client role or synthetic Case DTO.
- Separate **read-only** activation and later **writes** into distinct approval/test gates; no PHI until privacy field allowlist is approved.
- Avoid the existing reader’s broad CaseID+EventID cross-Event scan on a normal read unless expressly permitted by P1. Any redesign must preserve the approved D2 uniqueness semantics; event-scoped rows alone cannot prove global uniqueness.

**Planning gate:** See [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238) for D2 identity/lifecycle, P1 cross-Event scan, P2 disclosure, S1/S2 grants/revocation, disease allowlist, clinical ownership and DEV binding. Source-only tests may proceed, **real reads/writes may not**.

**F02-R approved source slice — 29 October 2026:** The PO selected F02 and approved its read-only integration plan and S1–S3, recorded in [#238](https://github.com/9GotStory/smart-srrt/issues/238), against `main@079fbadc30a70b46a6567e63b6d210990db094ad`. This is partial F02 source work, not completion of the read/add/edit feature. A narrow `listDengueCasesForEvent(sessionToken,eventId)` declaration in the existing core module delegates to the existing private reader only when its dependencies/approvals are available; default Native26 remains D331 OFF and denies before Google services. No changes to 09/15 reader policy, global CaseID checks, Native26 registration, Native33 package or schemas.

The separate Records read controller is outside the original synthetic mock bridge. It accepts only the versioned `D331_CASE_LIST_V1`/`READ_ONLY` candidate response, copies three candidate Case fields, binds result ownership to selected Event/revision and current session/identity, and clears stale content before context changes. Default `D331_F02_CASE_READ_AVAILABLE_` is false; no enabled read control or default dispatch. F01 synthetic Case→Plan remains isolated and unchanged. Disclosure open-attribute records fence coalesced close→reopen; immediate Auth/Records reconciliation, logout and explicit disposal invalidate pending reads. Existing-role UI visibility never substitutes for backend grants. Errors do not echo server payloads.

S1 tests run the actual public wrapper plus existing authorization/reader with synthetic GAS I/O. S2 loads actual registered classic scripts through the manifest helper and tests selection, safe states, malformed DTOs and context/disclosure races. S3 serializes an actual authorized synthetic server result into the actual registered client controller. Evidence lives in [server integration tests](../../tests/d331-p0-22b2-server-case-read.test.mjs) and [F02 client tests](../../tests/d331-f02-event-case-read.test.mjs); these are offline VM/fake-DOM checks, not Browser UAT. Exact-HEAD CI and independent review are separate PR evidence, and Merge requires separate PO approval.

**Remaining after F02-R:** choose accountable D2/P1/P2/S1/S2 and eligible disease decisions using #238; preserve the existing reader's global A:B scan HOLD and multi-step read-consistency caveat. Review any required reader redesign/registration with its own exact scope. Case add/edit, actual data binding, backend activation, permitted DEV fixtures/reads, Deploy and Browser UAT are later gates. Clinical SLA remains `NOT_EVALUATED`; no additional mock framework or authority/provider infrastructure is introduced by this slice.

**F02-W approved source slice — 29 October 2026:** The PO approved Case create / explicit PATCH / write-receipt scope and S1–S3 against `main@dc8575a564dbf18d7bd1211828d80c6b899c5042`, recorded in [#238](https://github.com/9GotStory/smart-srrt/issues/238). This branch adds `saveDengueCase` and `getDengueCaseWriteStatus` declarations in the existing core; default Native26 denies before services, and the private writer remains unregistered/OFF. No schema, grant, source registration or runtime activation change. Source/automated evidence is separate from full F02 operational acceptance.

The existing guarded writer supplies current session/Event/Area/disease/binding/write-grant checks under ScriptLock, revision conflicts and PENDING→domain→COMMITTED ordering. Shared private authorization supports read-only receipt lookup for the currently authorized request owner/Event/capability. A PENDING Case intent blocks a fresh request ID for that Event; interruptions remain reconciliation HOLD. Broad five-domain reads for FK validation remain a P1 privacy gate, and participating GAS locks do not protect against manual writers or make Sheets transactional.

Records reuses its F02-R Case list for immutable CaseID/revision selection. Create accepts only Classification/OnsetLocalDate/ReportingUnit/ReceivingUnit; explicit PATCH omits unselected fields and requires confirmation before clearing selected optional fields. No CaseStatus/VOID editing or clinical detail prefill. `D331_F02_CASE_WRITE_AVAILABLE_` stays false, with no default write/status dispatch. F01 synthetic models remain isolated.

The client allocates one request ID at Save, blocks duplicate submits and shows only a validated `D331_CASE_WRITE_V1` receipt. REPLAYED and `D331_CASE_WRITE_RECEIPT_V1` COMMITTED receipts assert no revision; an explicit read refresh retrieves the authoritative Case list. Unknown transport, malformed/foreign results, PENDING, NOT_FOUND and denied receipt reads never imply failed mutation or permit automatic replay/new intent. Uncertain Event request references stay in client memory across disclosure/context changes; private drafts and UI owners are invalidated on session/permission/Event changes, close/reopen, disposal and logout. Lost references after reload remain operator HOLD; no durable recovery store or cross-session exactly-once business-intent claim is added.

Offline tests use the actual public interfaces/private writer with synthetic GAS I/O, actual manifest-loaded Records/Auth scripts with fake DOM/RPC completions, and serialized actual server save/status/fresh-read results into the client. See [writer/S1/S3 tests](../../tests/d331-p0-07-guarded-dev-crud.test.mjs), [client/S2 tests](../../tests/d331-f02-case-write.test.mjs) and [RPC surface/default-denial tests](../../tests/gs-s1-operator-rpc-boundary.test.mjs). These checks do not constitute Browser UAT, deployed observation, P2 input/disclosure approval or clinical acceptance. Exact-HEAD CI and non-author review are PR evidence; Merge still needs separate PO approval. D331 OFF, clinical `NOT_EVALUATED`, data/privacy/security/clinical/binding/registration/Deploy gates remain HOLD.

**F02 synthetic DEV activation selected — 30 October 2026:** After F02-R/F02-W source merges, the PO requested enabling the existing Development app, confirmed all Event/health content is synthetic, and approved an eight-path activation plan with S1–S3 in [#238](https://github.com/9GotStory/smart-srrt/issues/238). The separate [DEV package/runbook](d331-f02-dev-activation.md) adds the missing private Case reader to the existing candidate dependencies, applies only checked synthetic-profile activation declarations, and preserves canonical Native26/old Native33 OFF. This supersedes the former blanket OFF restriction only for this reviewed synthetic candidate; no real-data/clinical ratification is inferred. The wrapper verifies the original target/manifest/private backup, rejects drift, compares pushed and immutable-version bytes, and updates only the existing deployment without automatic retry/rollback. Source review/CI/Merge precede actual deployment; the candidate's deployed/browser status is **NOT VERIFIED**. The settled DEV intent/data classification need not be requested again. #238 remains OPEN for broader F02/data/clinical acceptance, and F03–F08 are not started.

**F02 synthetic DEV Version 22 — 4 November 2026:** The date repair ([#268](https://github.com/9GotStory/smart-srrt/pull/268)) merged at `17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946` and the separate package updated the original deployment from Version21 to Version22. The bounded synthetic-only Browser UAT **passed** per the operator receipt at the top of [#238](https://github.com/9GotStory/smart-srrt/issues/238), superseding the Version21 FAIL and the NOT VERIFIED status above. #238 stays OPEN for real-data D2/P1/P2/S1/S2/C1/C2, clinical and broader F02 acceptance. See the [activation runbook result](d331-f02-dev-activation.md#version22-synthetic-dev-result--4-november-2026).

### F03 — Investigation / Plans

**User outcome:** Authorized staff can plan an investigation/control response against a Case/Event, set responsible staff, manage OPEN/CLOSED/VOID or other approved lifecycle, and see revision-safe changes.

**Acceptance intent:**
- Preserve parent-child linkage, especially `DenguePlans.EventID` and `TriggerCaseID` and integrity on Event/Case changes.
- Handle stale revision, duplicate operations, close/reopen and no-parent cases explicitly; surface meaningful busy/empty/error states.
- Draft model or test fixtures may be created without production rules. Do not infer that a Sheet header contract enforces relational foreign keys.

**Planning gate:** Linked CaseID policy and authorized plan DTO/write scope before real use.

**Source-only implementation evidence — 4 November 2026:** [#269](https://github.com/9GotStory/smart-srrt/issues/269) is the single scoped specification. Following its publication, the PO explicitly approved implementation, exact 14 paths and S1–S3 plus Commit/Push/Draft PR; stop for independent review after exact-HEAD CI. That later instruction supersedes the Issue's publication-time implementation HOLD only for this source/offline scope. No additional tickets or F04–F08 work is started.

The [private workflow](../../src/dengue/16-f03-plan-workflow.gs) reuses P0-03B current session/binding/Event/Area/Plan grants and P0-07 ScriptLock/ledger/prospective FK validation. Dedicated `D331_PLAN_LIST_V1`, `D331_PLAN_OWNERS_V1`, `D331_PLAN_WRITE_V1` and `D331_PLAN_WRITE_RECEIPT_V1` DTOs minimize disclosure. Read/assignee selection takes `{caseId, expectedEventRevision, expectedCaseRevision}`; save adds one immutable request ID, create/update mode and an allowlisted payload, with entity/revision only for updates. Caller authority and metadata are never accepted. Parent identity/revisions and Plan lifecycle are checked under the participating lock; tuple uniqueness includes CLOSED/VOID. Assignment rechecks Manager/Super Admin + `assign`, Plan-write grant and uniquely active same-scope recipient. It issues no grant. Close/void is blocked by nonterminal children; VOID is terminal and CLOSED only accepts explicit reopen. No child workflow, clinical clock or historical rewrite is introduced.

Registered Records/Auth code offers explicit Case selection and Plan operations only behind a separate false availability declaration. S1 uses actual public/private functions and synthetic GAS I/O, S2 actual manifest-loaded scripts/DOM actions, and S3 serialized actual server results into the registered client. The tests cover authority separation, linkage/uniqueness/revisions, assignment, lifecycle/child blockers, replay/PENDING/receipt uncertainty, explicit fresh reads, safe DTO/error rendering and session/disclosure/context ownership. Ordinary Records refresh preserves drafts. Unknown Event requests remain memory-only reconciliation holds; lost references after reload need operator reconciliation. F01 mocks/mirrors and F02/date/receipt regressions are preserved.

**Remaining gates:** exact base/head, full checks and exact-HEAD CI are Draft PR evidence; `code-review` and separate PO Merge approval remain required. Default Native26/Native33, schema v7/D331 v2, frozen One-Click and F02 activation tooling are unchanged. F03 private source is unregistered/OFF; no Plan grant, allowed live fixture/binding, runtime activation, deployment or Browser UAT has been performed. F03 deployed behavior is **Not Verified**. Clinical `NOT_EVALUATED`; D2/P1/P2/S1/S2/C1/C2 and release/data gates remain separate. See [feature evidence](../features.md#d331-development-status), [S1/S3](../../tests/d331-f03-plan-workflow.test.mjs), [S2](../../tests/d331-f03-plan-records.test.mjs).

**P1 correction — 4 November 2026:** After author-assisted review found a public Plan mutation bypass of core RBAC, the PO approved a fix within the same 14 paths and S1–S3, followed by Commit/Push/Draft PR evidence and a stop for independent review. Under the existing writer lock, Plan create requires current core `create`, and every Plan update requires current core `edit`, in addition to the current Plan grant; reassignment retains its extra `assign` requirement. A valid grant or cached session cannot override a current role downgrade. Actual public-RPC S1 negatives cover Staff, downgrade, unchanged ledger/domain state, and role changes at lock acquisition. Positive cases cover Admin/Manager/Super Admin with grants and deny the same roles without grants. F01/F02 and the existing Case authorization remain unchanged. The correction does not authorize F03 activation, grants, Merge, Deploy or Browser UAT, and author checks do not replace non-author review at the updated HEAD.

**P1 system closure correction — 5 November 2026:** The PO separately authorized remediation of `SYSTEM_STATUS=closed` in #270 within the original 14 paths. Plan mutations check the current setting in the same pinned workbook and writer lock before replay/intent/domain work. The settings read verifies existing headers, reads bounded Key/Value rows and rejects ambiguous or unavailable storage without fallback/repair; normalization and blank/missing-key defaults follow core auth. S1 uses actual core authentication/settings functions with synthetic I/O to compare closed-system denial, tests every lifecycle/assignment mutation and lock-time changes, and retains read-only reconciliation. S3 verifies real server denial through registered Records without retry. This changes no grants, settings rows, schema, package registration or other domain authorization. Commit/Push/Draft PR plus exact-HEAD CI are authorized; stop for fresh non-author independent review afterward. F03 remains OFF/unregistered and Merge/activation/Deploy/Browser UAT remain separate gates.

**Code-review corrections — 8 November 2026:** After `code-review` of #270, the PO approved these fixes within the same 14 paths and S1–S3. A Plan `UNKNOWN` ledger row now holds the Event barrier like `PENDING`, and its owned receipt reports `UNKNOWN`; Case writes are unchanged. Plan create marks the EpisodeKey cell as plain text before writing the row, so a date- or number-like key stays text. Offline tests model that conversion; behavior on real Sheets is **Not Verified**. Assignees need current core `edit` plus Plan read and write grants. An assignee-list failure keeps the Plan list and actions usable and allows a retry, and the Void action has a Thai label. S1/S3 gained CLOSED/VOID uniqueness, CLOSED assignment, DTO rejection and stale read/receipt cases. Staff Case writes remain existing F02 behavior for a separate decision. F03 stays OFF/unregistered; Merge, activation, Deploy and Browser UAT remain separate gates.

### F04 — Control Actions

**User outcome:** Staff can register a control activity under the correct Plan/Event, assign it, track progress, completion time, outcome and acceptable evidence reference.

**Acceptance intent:**
- Explicit PLANNED/IN_PROGRESS/COMPLETED/CANCELLED transitions (or an approved revision), no accidental change to completed entries.
- Validate scope/area, required completion evidence/time, duplicate submissions and linked-Plan identity.
- Only show permitted evidence metadata to the current authorized user; retain clear mobile/loading/error behavior.

**Planning gate:** Approved Plan and Action rules, permissions, data fields. Prefer simulation first.

### F05 — Entomology / HI–CI

**User outcome:** Staff can record dated household/container inspections and see HI/CI with correct labels and handling of zero denominators or invalid counts.

**Acceptance intent:**
- Keep inspected and positive counts consistent (positive cannot exceed inspected) and validate Survey/Plan/Event/Area links.
- Clearly distinguish survey draft/final data, time period and area. Aggregates must use approved time/area denominator definitions; never invent missing values or silently show a compliant value.
- Exact GPS, household identifiers or sensitive geographic disclosure are outside the initial scope without approval.

**Planning gate:** Epidemiology/reporting definition and data granularity review before any real dashboard metrics.

### F06 — Follow-ups

**User outcome:** Staff can see due and completed checkpoints, record outcomes, link actions/surveys where relevant and avoid double completion/overwriting.

**Acceptance intent:**
- Model pending/in-progress/complete/skipped (subject to approved meaning), responsible person, due/completed timestamps and revision/duplicate-action conflicts.
- Do not hard-code the clinical meaning of Day0/3/7/14/21/28 or imply all checkpoints are mandated without review.
- Source-only mock/test flows may use **explicit fictional** clock values with a `NOT_EVALUATED` indicator.

**Planning gate:** Approved checkpoint lifecycle and later clinical policy for real deadlines.

### F07 — Approved 3-3-1 SLA engine

**User outcome:** Only after clinical sign-off, show when a Case/Event meets or misses the exact 3-3-1 obligations, with traceable source timestamps and not-evaluable states.

**Acceptance intent:**
- C1/C2 epidemiology owners must decide eligible Case/disease status, each 3-3-1 trigger and deadline, clock/timezone, exemptions, reclassification and late-arriving/corrected records.
- Evaluate from timestamped evidence, not arbitrary Boolean flags; identify missing, ambiguous or unapproved data as `NOT_EVALUATED`.
- Offline boundary and test matrix can precede approval; **no real PASS/FAIL status before clinical approval**.

**Planning gate:** Clinical sign-off is blocking for the operational SLA implementation.

### F08 — Dengue summaries, UI completion and Development UAT

**User outcome:** Authorized users can see meaningful Event/Area summary counts and follow the entire Event→Case→Plan→Action→Survey→Follow-up flow in existing DEV UI, including responsive behavior.

**Acceptance intent:**
- Privacy-safe aggregates (Case/Plan/action counts, progress, HI/CI, approved 3-3-1) with filters that respect server-authoritative Event/Area scope.
- Preserve original Smart SRRT pages, login/logout, Records, Dashboard, AI Reporter and Public Library; protect against unknown writes, stale responses, repeated clicks, errors and unauthorized navigation.
- Offline synthetic integration → separately approved trusted DEV test fixture, exact Script/Deployment/Workbook binding, backup/rollback → supervised DEV browser UAT and regression. Distinguish **CI PASS**, **owner browser UAT**, and **real-data authorization**.

**Planning gate:** No automatic activation/deployment; Product Owner explicitly approves DEV deployment separately, and an accountable custodian approves any allowed data access.

## 4. Dependencies that are **decisions**, not extra feature-development projects

| Gate | Accountable evidence required | State on this snapshot |
| --- | --- | --- |
| D2 CaseID and revision/VOID/parent lifecycle | Versioned Data Steward/records owner decision | HOLD |
| P1 cross-Event CaseID+EventID scan | Privacy Officer + Data Custodian scope | HOLD |
| P2 minimal Case DTO/PHI | Per-field purpose, role and disclosure approval | HOLD |
| S1/S2 Event grants and revocation/restore resistance | Approved practical authority and verifiable behavior | HOLD |
| C1/C2 clinical 3-3-1 definitions | Epidemiology-approved triggers, deadlines, exceptions, checkpoints | HOLD |
| Trusted DEV binding and limited data access | Exact current Apps Script ↔ Deployment ↔ original Workbook identity plus permitted fixture/rows | HOLD |

Use existing [#238](https://github.com/9GotStory/smart-srrt/issues/238), [#248](https://github.com/9GotStory/smart-srrt/issues/248), [#215](https://github.com/9GotStory/smart-srrt/issues/215), [#219](https://github.com/9GotStory/smart-srrt/issues/219). Do not create repetitive policy documents or expand historical R1/R3 design into a new infrastructure project merely to work on offline mock UI.

## 5. How Claude Code should use this backlog with Matt Skills

**The Product Owner explicitly wants Matt Skills to plan each feature. This backlog does not prescribe implementation files/tasks/architecture.**

1. Read this document; inspect current `main`, `CLAUDE.md`, `README.md`, existing source and the relevant GitHub Issue/PR. Reconcile later changes; this document is a dated snapshot, not a perpetual truth.
2. List the **actually installed** Matt Pocock Skills. Select the relevant skill(s), e.g. `codebase-design` for a codebase boundary or `domain-modeling` for case/plan semantics. **Do not assume uninstalled skill names or automatically invoke every skill**.
3. Take exactly **one PO-selected** feature brief at a time. Obtain the PO's next-feature selection before starting a new feature; check the register above and open PRs for what is complete or in review. Produce a proposed scoped implementation plan containing: current code evidence, intended user workflow, source/data boundaries, smallest coherent changes, acceptance/negative tests, dependencies/blocked decisions, CI verification, and the specific approval needed for the next action.
4. Explicitly separate **source-only/mock work that can progress now** from **live data and clinical steps blocked by human policy**. If a gate is blocked, do not invent permission or unnecessary substitute infrastructure; prepare only permitted mock/tests and identify the precise decision needed.
5. **Stop after presenting the plan for Product Owner review. Do not implement, create GitHub Issues, push, merge, deploy, read/write real Sheets or create grants in the same step.** First reconcile existing Issues to avoid duplicates.
6. **After the Product Owner approves that feature's plan**, create or update **one** scoped GitHub Issue with the agreed implementation scope, acceptance/negative tests, dependencies and explicit approval gates. Then implement that Issue with TDD and create a Draft PR and review its exact SHA/diff/CI with `code-review`. Merge and deployment require separate authorization.
7. When a feature is complete, update its brief with **actual evidence** and obtain the PO's next-feature selection; no giant multi-feature PR and no standing authorization.

### Suggested Claude Code instruction for the next PO-selected feature

```text
Project: Smart SRRT / 9GotStory/smart-srrt.
Read docs/implementation/d331-remaining-feature-briefs.md, the repo's CLAUDE.md/README.md, and current main/source history.
F01 / P0-31B is complete for synthetic source/offline delivery. Use the actually installed Matt Pocock Skills to PLAN only the next feature explicitly selected by the Product Owner. If no feature is selected, request that selection before starting. Select relevant skills rather than invoking every skill.
Produce a bounded, implementation-ready plan with evidence-backed current state, user workflow, minimal scope, source/test impact, feature-specific negative cases, precise acceptance criteria, CI, and all approval gates. Reuse completed F01 behavior and retain its lifecycle/session regressions where relevant.
Keep D331 OFF; use synthetic/offline data only. Do not edit files, commit, create a GitHub Issue or PR, enable any flag, read/write Google Sheets or deploy yet. Wait for Product Owner approval of the plan; then create/update a scoped GitHub Issue before implementation.
```

---

**Referenced GitHub evidence:** [PR #254](https://github.com/9GotStory/smart-srrt/pull/254), [PR #253](https://github.com/9GotStory/smart-srrt/pull/253), [Issue #215](https://github.com/9GotStory/smart-srrt/issues/215), [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238), [Issue #248](https://github.com/9GotStory/smart-srrt/issues/248), [Issue #219](https://github.com/9GotStory/smart-srrt/issues/219). This document is a scope proposal prepared from recorded repository/source and prior owner evidence; committing it to GitHub **does not approve clinical/privacy policy, authorize implementation or enable D331**.
