# D331 P0-19 — Guarded read-only Backend Workspace (source-only)

**Base:** `main@b6b7f9ab26d74d66a7f531bc89b3a763c6cf52d7`  
**Scope:** Reuse one existing Native33 internal Backend GS module, keep existing native manifest, original Development database, UI and Web App unchanged. **No Deployment or Google Sheet operations** from this PR.

## Purpose

Implement one real Apps Script **RPC contract that remains disabled until separately approved**, so a future Dengue screen can retrieve a bounded, server-authorized event **workflow count summary**. It is not a clinical case read endpoint and not a production-ready approval of D331.

`getDengueWorkspace(sessionToken,eventId)` is a top-level callable GAS function inside `src/dengue/09-p0-03b-dev-readonly-adapter.gs`, which is already included in the separately staged Native33 internal dependency chain. It remains unreachable to a successful caller while `D331_G1A_ENABLED=false` and `D331_P003B_ENABLED_=false`. No frontend calls were added.

## Five focus areas

| Area | Contract / test |
| --- | --- |
| **Database** | Original `DATABASE_SPREADSHEET_ID` must equal the separately approved DEV Spreadsheet ID; all 10 source headers revalidated against existing D331 v2 / legacy schema; no new sheet, property change or row write. Only EventID **column B** of each of the five domain tabs is read after authorization. Domain sheets cap at 10,000 rows and event count 500; fail closed above limits. This is a **count-only** preview and is not field/relationship data validation. |
| **Backend (GS)** | Reuse internal `d331P003bAuthorizedContext_` to enforce session, current unique active user, trusted event, disease allowlist, exact AreaID and per-event `dengue.case.read` grant. Preserve existing `d331P003bReadOnly_` response; new public `getDengueWorkspace` returns only counts/status without spreadsheet handles. |
| **Frontend** | P0-18 static 5-step Records preview remains unchanged; it does **not** call new RPC or expose any real EventID. UI-to-RPC binding is a later separately reviewed slice. |
| **Security** | Server accepts only `sessionToken,eventId`; never trust browser role/area/grant/policy. Deny before domain data reads if OFF, expired session, invalid event/area/disease or grant, mismatched spreadsheet or headers. Do not project narratives, names, direct patient/case/plan IDs, password, raw grants, ledger rows, evidence references or raw domain rows. All exceptions map to generic `D331_UNAVAILABLE`. |
| **Testing** | Synthetic mocked GAS session/Sheets positive, OFF pre-service deny, wrong event/policy/user/grant/area deny, bounded rows and volume, non-leakage, and all existing Native26+Native33 CI regressions. No authenticated live Google test, synthetic writes or deployment. |

## RPC success DTO — only after future explicit server approvals

```js
{
  status: 'READ_ONLY',
  eventId: '<server-validated requested EventID>',
  revision: 3,
  areaId: '<server-validated area>',
  counts: {cases:0, plans:0, actions:0, surveys:0, followups:0},
  slaAssessment: 'NOT_EVALUATED',
  clinicalPolicyApproved: false,
  canWrite: false,
  canEnable: false
}
```

No SLA compliance calculations; 3h / 3h / 1d anchors and approved disease labels/policy revision are still unresolved. This response provides aggregate counts for an already-authorized event, not full case detail, timeline or clearance for any read of clinical records. Even when source is installed on GAS, default OFF flags block the entire RPC before any Google service access.

## Review and deployment gates

1. CI and ChatGPT Independent Review must pass at exact head.
2. Explicit owner **source-only Merge** approval remains separate.
3. Source-only Merge **does not update existing Web App**; actual Development deployment needs its own approval and new exact-SHA read-only backup/preflight.
4. Before even a read-only D331 runtime enablement: product/clinical owner must explicitly approve eligible disease labels, policy revision, AccessGrants authorization and data-minimization scope. The current feature stays **OFF**, `D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=''`, disease list empty, policy revision empty; do not add grants.
5. No clinical/patient row scans, synthetic row writes, CRUD, D331 UI enablement or Production (not configured) authorized.

**Remaining gaps for real usable D331:** authenticated UI read binding, per-record DTO and FK lifecycle checks, clinically approved 3-3-1 timing, authorized synthetic test EventID/grant for E2E. This is a narrow/backend-first step, not a reason to redesign recovery mechanisms.
