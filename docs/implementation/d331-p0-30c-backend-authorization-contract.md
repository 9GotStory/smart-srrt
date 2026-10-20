# Smart SRRT — P0-30C Backend Case Read Contract & Authorization Audit

**Tracking:** [P0-29 #248](https://github.com/9GotStory/smart-srrt/issues/248) · [P0-22 Case/Privacy/Security #238](https://github.com/9GotStory/smart-srrt/issues/238) · parent [#215](https://github.com/9GotStory/smart-srrt/issues/215).  
**Exact base:** `main@b218a4fa450b7ae7f54d98ae295ab8195a7067e4`, last Product Owner-verified existing Development Web App **Version 20**. No Production.  
**Classification:** Source-only **audit + tests**, no new Backend module, RPC, Live Case data access, deployment or cloud mutation.

## Summary

P0-30A/P0-30B already put *unmounted* mock-only client contracts in the existing Records `03h`. The server side already has a private, unregistered candidate `d331P022b2ListCasesForEvent_(sessionToken,eventId)` in `src/dengue/15-p0-22b2-case-read-integration.gs`. It delegates server authentication/grant to the existing P0-03B `d331P003bAuthorizedContext_` (`09-p0-03b-dev-readonly-adapter.gs`).

**P0-30C does not write a second Case reader.** It audits these exact two existing backend sources, extends their existing Node VM mocked-GAS negative test matrix, and records why the real backend DTO cannot be passed directly to the synthetic-only UI without a **new separate authorization and design decision**.

## 1. Exact Event → Case backend contract already present (NOT approved live)

### Request and authorization order

Current candidate accepts **only** `(sessionToken,eventId)`. The EventID is a **selector supplied by caller**, not proof of permission. Current source implements:

1. **No-services hard-OFF gate**: `D331_G1A_ENABLED`, `D331_P003B_ENABLED_`, `D331_P022B2_ENABLED_`, `D331_P022B2_REVOCATION_APPROVED_` all must be `true`, plus an exact three-field ordered `D331_P022B2_APPROVED_FIELDS_`. Actual source defaults to **OFF, empty list**.
2. **Pinned existing Google Sheets binding**: P0-03B requires a separately approved existing spreadsheet ID matching the runtime Script Property `DATABASE_SPREADSHEET_ID`, no mutating `getDb_()` fallback. Real existing identifiers remain only in private Issue #189; do not copy them.
3. **Exact headers before patient rows**: MainData 39, UserAccounts 14, AreaMaster 10, and seven D331 v2 tabs; no automatic schema changes.
4. **Session v2/current user**: verify cached signed/credential-tagged session against one unique active current UserID, with no trust in browser-supplied Role or UserID.
5. **Unique trusted Event and Area**: resolve canonical EventID, revision, active status, eligible exact disease label and one authorized Area. Avoid legacy rowNumber/first-hit identity.
6. **Exact scoped `dengue.case.read` grant**: matching unique active UserID+EventID+AreaID+Capability with approved policy revision, approval separation, validity, expiry and revocation checks. A user having Administrator/Staff role alone **cannot** grant Case access.
7. **Only after those checks**, the private Case reader checks `DengueCases` header, scans bounded global **CaseID+EventID A:B** (maximum 10,000 rows) for unique IDs, and reads at most 100 matching full 16-field rows for the *authorized* Event. Reject malformed/duplicate IDs, non-ACTIVE/VOID and index/detail identifier drift; project only three **test-only** Case fields. Return generic `D331_UNAVAILABLE` on any denial.

The global A:B cross-Event identifier scan is a **candidate**, not an authorized practice: Data Steward identity decision and Privacy Officer explicit purpose/permission are still HOLD. Google Sheets **does not** provide a transactional snapshot across authorization, scan and selected detail reads. R1 independent revocation journal + R3 restore quarantine remain **design-only**, not operationally attested.

### Current private candidate DTO (test-only, never public)

```js
{
  status: 'READ_ONLY',
  eventId: '<trusted server Event UUID>',
  revision: 3,
  areaId: '<server-resolved AreaID>',
  cases: [
    {caseId:'<test-only UUID>',caseRevision:1,caseStatus:'ACTIVE'}
  ],
  slaAssessment: 'NOT_EVALUATED',
  clinicalPolicyApproved: false,
  canWrite: false,
  canEnable: false
}
```

No PatientName/CitizenID, raw Case row, notes, grant, credential, narrative, diagnosis, timeline, analytics, Public Library, AI Reporter, prompts, exports or attachments may be added by inference. **Even CaseID is potentially sensitive**, and the three keys above do not yet have privacy signoff. The existing `getDengueWorkspace` function is a **count-only**, presently OFF RPC and **cannot substitute for a Case list**.

## 2. Client contract separation (P0-30A/B)

The current unmounted Records client `d331P030aCaseReadSeam_` requires `status:'MOCK_ONLY'`, `simulationOnly:true`, a **fixed fictional** Event UUID and `SYNTHETIC-AREA`, fake Case UUIDs, and `NOT_EVALUATED`. P0-30B only permits a fixed `SYNTHETIC_SELECTED_EVENT_V1` revision-1 active Event. It deliberately **rejects** the current backend candidate's `READ_ONLY` and real EventID/AreaID. This is the correct safety boundary; **do not relax it** merely to make a successful Browser demo. Browser-side selection, role checks and mock tokens do not prove real `dengue.case.read` permissions.

A future, separately authorized real-data path would need a **distinct explicitly designed** server-owned, privacy-approved DTO and an authenticated server RPC; only then can a UI state machine be bound to an actual Records-selected Event. Do not silently reinterpret the P0-30A/B fake fixture as live data.

## 3. P0-30C exact change scope and test evidence

**Only two changes** proposed:
- Extend `tests/d331-p0-22b2-server-case-read.test.mjs` with six P0-30C tests, using **existing** VM/mocked GAS fixture. Tests exercise: default/partial OFF before any service, scoped unique grant vs Admin role, stale session/credentials/closed or duplicate Event before Case rows, workbook/header mismatch before Case rows, backend `READ_ONLY` DTO rejected by both browser mock validators, backend private reader unregistered/no public Case list RPC/no writes.
- Add this documentation. **No change to** `src/dengue/09-`, `15-`, `src/web/03h`, `tools/native-sources.mjs`, P0-25 synthetic editor, 7 D331 tabs, approved fields, Script Properties, credentials or Deployment.

The offline tests temporarily set feature flags `true` **inside isolated VM only** to exercise negative and artificial positive cases. This does **not** create grants or approve real Case data. Expected CI: Contracts (64), prior Regression (1,020) plus six new tests (1,026 total); verify actual run logs rather than infer PASS.

## 4. Five-domain HOLDs before any real Event→Case reading

| Domain | Confirmed source-level groundwork | Owner/operational gate still HOLD |
| --- | --- | --- |
| Database | Existing Google Sheets v2 seven-tab header contract and Event/Case relation; bounded reader candidate | Global vs scoped CaseID identity, VOID/revision/concurrency, fresh authorized read-only binding evidence |
| Backend GS | One existing internal candidate and P0-03B server-owned auth context; no new RPC necessary yet | Approve exact case list need and minimal DTO, explicit source registration/public wrapper **separately** |
| Records UI/UX | Synthetic P0-25 plus inert P0-30A/B, safe status/stale state handling | Real Event selection, auth-denied/empty/error behaviour only after server and privacy approval; no preview promotion |
| Security + Privacy + Clinical | Current session/Area/Event/grant checks in source; hard OFF; `NOT_EVALUATED` | Privacy P1/P2, Security S1/S2 & R1/R3 operational evidence, Clinical C1 exact disease mapping and C2 3h/3h/1d clock anchors |
| Testing | Full offline test matrix, prior owner-reported v20 mock UAT 8/8 | Credentialed isolated DEV E2E and scoped Data Steward-approved synthetic/cloud-read test only by **separate Product Owner approval** |

**Stop criteria:** Any attempted real `DengueCases` patient-row read, new public Case RPC, changing static flags/field list, writing/issuing `D331AccessGrants`, editing Google Sheets, changing Script Properties, or `clasp push`/Deployment is **outside P0-30C**. Stop and obtain a separately scoped authorization; do not broaden this PR.

## 5. Review / release discipline

CI PASS on the exact PR head + independent review are mandatory; **separate Product Owner authorization** before Source-only Merge. Even if merged, **existing Development Web App Version 20** remains unchanged until a fresh, separately approved guarded deployment. No automatic rollback, no new Script/Deployment/Spreadsheet and no Production.

```text
P030C_SCOPE=EXISTING_BACKEND_AUTH_CONTRACT_AUDIT_TESTS
P030C_BACKEND_IMPLEMENTATION_CHANGED=NO
P030C_CASE_RPC_REGISTERED=NO
P030C_LIVE_CASE_READ=NO
P030C_CLIENT_MOCK_PROMOTION=BLOCKED
P030C_SHEETS_READ_WRITE=NO
P030C_DEPLOY=NO
P030C_D331=OFF
P030C_MERGE=HOLD_SEPARATE_PO_APPROVAL
```
