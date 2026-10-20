# Smart SRRT — P0-30A: Records → Case Read Offline Seam (source-only)

**Track:** [P0-29 Gap Analysis #248](https://github.com/9GotStory/smart-srrt/issues/248) · Parent [#215](https://github.com/9GotStory/smart-srrt/issues/215) · Case access and privacy [#238](https://github.com/9GotStory/smart-srrt/issues/238)  
**Baseline:** `main@f6988fb7f57b2aa1a16dc301c131f38f8a4c18d8`; existing owner-attested Development Web App **Version 20**, P0-28 mock-only Browser UAT **8/8 PASS**.  
**Change class:** SOURCE + NEGATIVE TESTS ONLY. No Merge, Deployment, remote credentials, Google Sheets operations, new Script/Deployment/Spreadsheet or Production.

## Scope and why this slice is deliberately small

The current original `Records` view already has the P0-25 synthetic Case list/form/add/edit/reset mirrored from unregistered `03m` into registered `03h-client-event-records.html`. It is **not** a connected clinical Case list. Existing `src/dengue/15-p0-22b2-case-read-integration.gs` contains a private **unregistered and OFF** server-side event-scoped reader candidate. This slice must not invent another server API or silently convert a fixture into real Case data.

P0-30A adds **one inert, explicitly offline Case-read state-machine seam to the same registered `03h`** (before the P0-25 exact mirror marker) and tests it through a fake Records disclosure/region and synthetic DTO. It is **not auto-mounted in the shipped Records view**. In particular, **neither real Event selection nor `google.script.run`, nor a transport callback is connected**. That separation intentionally prevents any real data from flowing to the browser prior to the distinct Data/Privacy/Security/Clinical approvals.

### Offline data contract

`d331P030aCaseReadSeam_.createController({root,region,session})` is strictly a client presentation/test seam. Its caller can explicitly `connect()`, `begin()` a ticket, then `accept(ticket,syntheticDTO)` or `fail(ticket)` in offline tests. No source code dispatches a network request. `remoteEnabled=false`. Real runtime never constructs this controller or registers a menu/route.

Only a **fixed synthetic Event UUID and `SYNTHETIC-AREA`** are accepted. A DTO must contain exactly `{status:'MOCK_ONLY',simulationOnly:true,eventId,areaId,cases,slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,canWrite:false}`. Every Case item must contain exactly `{caseId,caseRevision,caseStatus}` with an allowlisted synthetic ID form and `ACTIVE`; maximum 100, no duplicates, no extra fields. The source does **not** accept the backend candidate `status:'READ_ONLY'` or any live identifier. Validation failure renders only a generic `ERROR` without interpolating the rejected payload or leaking PHI.

States `UNAVAILABLE → LOADING → READY|EMPTY|ERROR` are rendered using DOM `textContent` (not HTML injection), with `aria-busy` and live status. Closing the disclosure, logout, permission drop, changed token or changed user-object identity invalidates the monotonic ticket, destroys the synthetic rows, and prevents older callbacks from resurrecting content. Duplicate `connect()` does not attach multiple listeners. A new opening does not automatically dispatch or replay a read; it stays UNAVAILABLE until explicit synthetic `begin()`.

## Five-area acceptance

| Area | This PR | Still explicitly HOLD |
| --- | --- | --- |
| Database | No change to original spreadsheet; no reads or writes; recognizes fixed fictional Event/Case identifiers only | Global CaseID policy, revision/VOID/lifecycle and schema custodian signoff |
| Backend GS | Does **not** change or register `15-p0-22b2`, P0-03B or P0-07; no new public RPC | Privacy-approved versioned Case read DTO, authorized grant, revocation and source binding |
| Frontend | Inert state/presentation seam resides in the **same registered Records file**; P0-25 mock exact mirror unchanged | Binding server-owned selected Event, real permission and transport to Cases; real loading/error UX |
| Security | Strict mock discriminant, exact keys, no patient fields, no authority claim, session/role/logout stale fencing, no transport code | Revocation R1/R3 operational proof, approved P1/P2 field privacy, CaseID cross-event scan signoff |
| Testing | New Node VM offline tests: default OFF, fake ready/empty/loading/error, malformed and unauthorized DTO, no service, logout/role/session/disclosure reset | Authorized real DEV test, Web App Browser UAT for live Case read, clinical 3-3-1 SLA evaluation |

## Non-regression and release gates

- `tools/native-sources.mjs` remains 8 GS + 17 HTML. Native33 packaging, candidate 15, `03l`, Google Sheet v2 rows/headers, UI styles and `03m` canonical mock remain **unchanged**.
- `tests/d331-p0-25-native26-case-mirror.test.mjs` must continue to prove exact P0-25 script/style parity. Keep the P0-30A seam **outside** the canonical mirror.
- `npm run check:contracts`, `npm test` and existing build/parity checks must pass on the PR's exact SHA. CI PASS alone does not authorize Merge.
- **Independent Review followed by distinct Product Owner source-only Merge approval** is mandatory. Any later Deployment requires a separately approved exact merged SHA and fresh bounded backup/preflight against existing DEV Web App Version 20 (or whichever version the owner verifies at that time). No automatic retry or remote rollback.
- D331 clinical/Privacy/Security/Data governance [#238](https://github.com/9GotStory/smart-srrt/issues/238) remains HOLD. Never flip `D331_G1A_ENABLED`, `D331_P003B_ENABLED_`, `D331_P022B2_ENABLED_`, `D331_P022B2_REVOCATION_APPROVED_`, approved fields, grants, or clinical SLA status from this slice.

```text
P030A_SCOPE=SOURCE_ONLY_INERT_RECORDS_SEAM
P030A_LIVE_RPC=NO
P030A_TRANSPORT=NO
P030A_BACKEND_READER_REGISTERED=NO
P030A_CASE_DTO=STRICT_SYNTHETIC_ONLY
P030A_D331_LIVE=OFF
P030A_GOOGLE_SHEETS_ACCESS=NO
P030A_REMOTE_DEPLOYMENT=NO
P030A_MERGE=HOLD_SEPARATE_PO_APPROVAL
```
