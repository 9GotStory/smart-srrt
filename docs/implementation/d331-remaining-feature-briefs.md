# Smart SRRT — Dengue 3-3-1: Remaining Feature Briefs

**Repository path:** `docs/implementation/d331-remaining-feature-briefs.md`  
**Snapshot date:** 21 October 2026 (Asia/Bangkok)  
**Repository:** https://github.com/9GotStory/smart-srrt  
**Purpose:** Product-level **requirements backlog**, separated by feature, for **Codex + installed Matt Pocock Skills** to produce a detailed plan for **one feature at a time**. **THIS DOCUMENT IS NOT AN IMPLEMENTATION PLAN OR AUTHORIZATION.**

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
- Respect exact-HEAD review, scoped PR, pinned CI, independent review and **separate Product Owner approval for Merge and Deployment**. Do not treat general “continue” as standing authorization for live data.
- Policies D2/P1/P2/S1/S2/C1/C2 and verified DEV source/data binding remain **HOLD** until the accountable human provides a dated/versioned, scoped decision. The technical proposal `GLOBAL_IMMUTABLE` + `DENIED_REDESIGN` is **not an approved policy**.

## 3. Remaining feature register (requirements, not task breakdown)

These IDs are **document-local backlog labels**, **not GitHub Issue numbers**. Matt Skills should decide precise slices, sequencing, acceptance tests and code changes after inspecting the current source.

| ID | Feature | Current state | Expected capability | Dependence / gate |
| --- | --- | --- | --- | --- |
| **F01 / P0-31B** | Case→Plan mock UI and lifecycle | T1 composed UI plus T2 registered Records/Auth integration implemented with S1–S3 offline tests; exact Case/Plan mirrors, standalone partials unregistered | Existing Records disclosure offers synthetic Case→Plan preview with shared reset/session/disclosure fences | T2 exact-HEAD CI, independent review and separate PO merge gate remain; live data/deploy HOLD |
| **F02** | Event→Dengue Case real workflow | Case list/add/edit mocked; private reader/CRUD candidates OFF | Authenticated, Event-linked Case read and eventually mutation with proper revision/status | D2/P1/P2, Security, verified DEV binding; separate read/write gates |
| **F03** | Plans / investigation workflow | Synthetic Plan model exists; no live Plans workflow | Plan per authorized Case/Event, responsible staff, status and revision | Depends on Case domain decisions and permitted backend access |
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

**Incomplete / not verified:** F01 source and S1–S3 automated offline integration are implemented. T2 exact-HEAD CI, separate independent review, PO merge approval and post-merge verification are later gates; parent [#257](https://github.com/9GotStory/smart-srrt/issues/257) remains open pending them. Fake-DOM/VM evidence is not Browser UAT, deployed observation, real-data or clinical acceptance. Deployment and data/clinical authorization remain separate HOLD gates.

**Planning gate:** Source-only and local/synthetic tests are permissible; any registration of new HTML in the Native package or actual DEV deployment needs its own reviewed change/authorization.

### F02 — Event → Dengue Case read / add / edit

**User outcome:** For an authorized Event, view linked Cases and ultimately add/edit them with explicit Server-side event/area/user checks, revision/conflict handling and correct empty/error states.

**Acceptance intent:**
- Reuse `src/dengue/15-p0-22b2-case-read-integration.gs` private reader, `src/dengue/09-p0-03b-dev-readonly-adapter.gs` and existing guarded CRUD candidate as appropriate, **not a second Case Reader**.
- Verify unique parent EventID, current session, AreaID/disease scope, case identity and status; do not authorize from client role or synthetic Case DTO.
- Separate **read-only** activation and later **writes** into distinct approval/test gates; no PHI until privacy field allowlist is approved.
- Avoid the existing reader’s broad CaseID+EventID cross-Event scan on a normal read unless expressly permitted by P1. Any redesign must preserve the approved D2 uniqueness semantics; event-scoped rows alone cannot prove global uniqueness.

**Planning gate:** See [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238) for D2 identity/lifecycle, P1 cross-Event scan, P2 disclosure, S1/S2 grants/revocation, disease allowlist, clinical ownership and DEV binding. Source-only tests may proceed, **real reads/writes may not**.

### F03 — Investigation / Plans

**User outcome:** Authorized staff can plan an investigation/control response against a Case/Event, set responsible staff, manage OPEN/CLOSED/VOID or other approved lifecycle, and see revision-safe changes.

**Acceptance intent:**
- Preserve parent-child linkage, especially `DenguePlans.EventID` and `TriggerCaseID` and integrity on Event/Case changes.
- Handle stale revision, duplicate operations, close/reopen and no-parent cases explicitly; surface meaningful busy/empty/error states.
- Draft model or test fixtures may be created without production rules. Do not infer that a Sheet header contract enforces relational foreign keys.

**Planning gate:** Linked CaseID policy and authorized plan DTO/write scope before real use.

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

## 5. How Codex should use this backlog with Matt Skills

**The Product Owner explicitly wants Matt Skills to plan each feature. This backlog does not prescribe implementation files/tasks/architecture.**

1. Read this document; inspect current `main`, applicable `AGENTS.md`, `README.md`, existing source and the relevant GitHub Issue/PR. Reconcile later changes; this document is a dated snapshot, not a perpetual truth.
2. List the **actually installed** Matt Pocock Skills. Select the relevant skill(s), e.g. `codebase-design` for a codebase boundary or `domain-modeling` for case/plan semantics. **Do not assume uninstalled skill names or automatically invoke every skill**.
3. Take exactly **one** feature brief at a time, starting with **F01/P0-31B**. Produce a proposed scoped implementation plan containing: current code evidence, intended user workflow, source/data boundaries, smallest coherent changes, acceptance/negative tests, dependencies/blocked decisions, CI verification, and the specific approval needed for the next action.
4. Explicitly separate **source-only/mock work that can progress now** from **live data and clinical steps blocked by human policy**. If a gate is blocked, do not invent permission or unnecessary substitute infrastructure; prepare only permitted mock/tests and identify the precise decision needed.
5. **Stop after presenting the plan for Product Owner review. Do not implement, create GitHub Issues, push, merge, deploy, read/write real Sheets or create grants in the same step.** First reconcile existing Issues to avoid duplicates.
6. **After the Product Owner approves that feature's plan**, create or update **one** scoped GitHub Issue with the agreed implementation scope, acceptance/negative tests, dependencies and explicit approval gates. Then implement that Issue with TDD and create a Draft PR for ChatGPT independent review of exact SHA/diff/CI. Merge and deployment require separate authorization.
7. When a feature is complete, update its brief with **actual evidence** and move to the next feature; no giant multi-feature PR and no standing authorization.

### Suggested initial Codex instruction (copy verbatim)

```text
Project: Smart SRRT / 9GotStory/smart-srrt.
Read docs/implementation/d331-remaining-feature-briefs.md, the repo's AGENTS.md/README.md where available, and current main/source history.
Use the actually installed Matt Pocock Skills to PLAN F01 / P0-31B only. Select relevant skills rather than invoking every skill.
Produce a bounded, implementation-ready plan with evidence-backed current state, user workflow, minimal scope, source/test impact, negative cases (especially Case reset/reseed -> Plan stale state, logout, close, queued saves), precise acceptance criteria, CI, and all approval gates.
Keep D331 OFF; use synthetic/offline data only. Do not edit files, commit, create a GitHub Issue or PR, enable any flag, read/write Google Sheets or deploy yet. Wait for Product Owner approval of the plan; then create/update a scoped GitHub Issue before implementation.
```

---

**Referenced GitHub evidence:** [PR #254](https://github.com/9GotStory/smart-srrt/pull/254), [PR #253](https://github.com/9GotStory/smart-srrt/pull/253), [Issue #215](https://github.com/9GotStory/smart-srrt/issues/215), [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238), [Issue #248](https://github.com/9GotStory/smart-srrt/issues/248), [Issue #219](https://github.com/9GotStory/smart-srrt/issues/219). This document is a scope proposal prepared from recorded repository/source and prior owner evidence; committing it to GitHub **does not approve clinical/privacy policy, authorize implementation or enable D331**.