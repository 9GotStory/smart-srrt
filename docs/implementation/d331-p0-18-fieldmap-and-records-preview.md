# D331 P0-18 — Slice A + B: field mapping and Records preview

**Baseline:** `main@f4c3eb332f103e4fc2220b456098dc3f79d303d1` before P0-18 changes. **Scope:** Source-only design contract + static preview inside **existing Records**. This is **not** deployment approval or a functional Dengue 3-3-1 product.

## Slice A — Original Development Google Sheets, no new database

Read-only Google Sheets metadata and **row-1 headers only** were inspected on the original authorized Development workbook, without reading data rows. The workbook has **17 total tabs**: 10 original Smart SRRT plus seven D331. All **113/113** D331 header names and column positions match the source `D331_P002A_FIELDS_` v2 draft schema.

| Existing D331 tab | Headers | Form/workflow panel | Key / links |
| --- | ---: | --- | --- |
| `DengueCases` | 16 | Case / investigation | `CaseID`; `EventID` → `MainData.EventID` |
| `DenguePlans` | 15 | Control plan | `PlanID`; `EventID`, `TriggerCaseID` → `DengueCases.CaseID`, `AreaID` |
| `DengueControlActions` | 18 | Control actions | `ActionID`; `EventID`, `PlanID`, `StageKey`, `AreaID` |
| `DengueEntomology` | 16 | Larval survey / HI–CI | `SurveyID`; `EventID`, `PlanID`, `AreaID`, inspected/positive house and container counts |
| `DengueFollowups` | 16 | Follow-up | `FollowupID`; `EventID`, `PlanID`, optional `LinkedActionID` / `LinkedSurveyID` |
| `DengueRequestLedger` | 10 | Backend-only request journal | `RequestID`; `EventID`, `PrincipalID`, `Operation`, `PayloadDigest`, `Phase` |
| `D331AccessGrants` | 22 | Backend-only authorization | `GrantID`; `UserID`, `EventID`, `AreaID`, `Capability`, `State`, validity / revision |

Legacy binding anchors observed on header row: `MainData` **39 headers**, `EventID` column **31**, `Revision` column **32**, `RecordStatus` column **33**, `OwnerUserID` column **39**; `AreaMaster` 10 headers and `UserAccounts` 14. The D331 v2 schema remains `DRAFT_ONLY`, despite header parity.

**Relationship contract (implementation later):** `MainData.EventID` → `DengueCases.EventID` → `DenguePlans.TriggerCaseID` → `DengueControlActions.PlanID` / `DengueEntomology.PlanID` / `DengueFollowups.PlanID`; all children must bind to **the same trusted `EventID` and scoped `AreaID`**. `LinkedActionID` and `LinkedSurveyID` are optional cross-references, never global IDs across events. Server validation, not UI assertions, enforces this.

The UI's five panels deliberately omit `DengueRequestLedger` and `D331AccessGrants`: users should not manually edit journal/permission records from the workflow.

## Slice B — Embedded Records prototype

A native HTML `<details>` preview is embedded **below the existing Records list**, with a clear **ตัวอย่างเท่านั้น** marker and a synthetic `DEMO-001` label. Its five read-only steps are:

1. Case / investigation (DengueCases)
2. Control plan (DenguePlans)
3. Control measures (DengueControlActions)
4. Larval/vector survey (DengueEntomology)
5. Follow-up (DengueFollowups)

All displayed statuses are fixed examples, not real Event/Case/Area IDs, clinical records, summaries or calculated outcomes. Three timing placeholders deliberately state **รอยืนยันจุดเริ่มนับ**, not `on-time`, `overdue`, or a fabricated threshold calculation. Two illustrative action buttons remain `disabled` with `aria-disabled=true`. Native `<summary>` is keyboard operable without any client-side JS, and layout is mobile responsive.

This preview is **not attached to a selected real Records row**. A later authorized iteration will reuse the existing authenticated Records event context, avoiding unapproved exposure of patient details while D331 is still OFF.

## 3-3-1 clinical-policy decision register (unapproved)

Before SLA calculations or live status, the clinical/Product Owner must explicitly approve:
- Eligible disease labels and event status/classification for Dengue.
- Exact clock anchors and how 3h / 3h / 1d deadlines relate to detection, notification, receipt, field action, and `Plan.AnchorAtUTC`.
- `Asia/Bangkok` localization, timezone boundaries, late-entered/revised or missing timestamps, exemptions, reopen/void semantics.
- Area owner and whether 100-meter scope, survey checkpoint and follow-up day 3/7/14/21/28 are required, with their start anchors.
- Evidence required before calling a step done/on-time, revisions, and user role for case, plan, action, survey, follow-up approvals.

**Until approved, the backend must return `slaAssessment:'NOT_EVALUATED'`; no red/green compliance status or silent clinical assumptions.**

## Scope, security and tests

- No new top-level navigation page; five existing page IDs and their role guards remain unchanged.
- No `google.script.run`, `fetch`, new event handler, form, input, D331 RPC, new GS module, grant operation, clinical data read, Source flag, Google Sheet write or deployment.
- Canonical Native26 manifest and historical 33-file private release package **unchanged in topology**; original Web App remains deployed at prior approved Source SHA until a separate deployment gate.
- P0-18 tests must verify preview lies **inside** `#page-records`, contains five steps exactly, no exposed patient/request identifiers, disabled controls, no event callbacks/RPC, schema/source parity (7 tabs and 113 column keys), existing closed-world navigation, all D331 flags OFF, and old Contract/Regression tests all green.
- Retest original P0-16 eight-page smoke after any future separately authorized Development deployment.

**Decision:** This branch is **source-only**; do not Merge or Deploy without owner approval. Next independent slice: server-owned read-only DTO, authorization and explicit policy decision. Never treat this static preview as active D331.
