# Smart SRRT — D331 P0-22A Event → Case Read-only Contract (source-only)

**Tracking:** [P0-22 Issue #238](https://github.com/9GotStory/smart-srrt/issues/238) · **Baseline:** `main@6681f6fa2d1e761e4ff9235f6510cbe6400f9f5b` · **Current DEV Web App:** Version 19 (owner-attested; NOT changed by this slice).

## Outcome of this bounded slice

Freeze a **reviewable, fail-closed design and negative test boundary** for **Event → Dengue Case read-only** inside existing Smart SRRT Records. **Do not implement a real clinical data retrieval endpoint in P0-22A**: policy, current grant backing and privacy clearance do not yet authorize any patient row access. Keep `D331_G1A_ENABLED=false`, `D331_P003B_ENABLED_=false`, `D331_P007_ENABLED_=false`, `D331_P002A_APPROVAL_='DRAFT_ONLY'`.

The existing P0-19 `getDengueWorkspace(sessionToken,eventId)` is **count-only**, fail-closed and protected by server-side session/Event/Area/grant checks. The P0-20 preview is **mock-only** and does not call it. **Neither** endpoint nor mock is permission to read `DengueCases` data rows.

## Five domains — concrete P0-22A acceptance matrix

| Domain | Current baseline verified in repository / owner reports | P0-22A deliverable | Still needs distinct owner gate |
| --- | --- | --- | --- |
| Database | Original DEV workbook has owner-reported 7 D331 empty v2 tabs, 113 headers (Issue #219); Issue #231/#P0-18 documents canonical `DengueCases` 16 fields; current cloud contents/binding not reattested here | Define `MainData.EventID` ↔ `DengueCases.EventID` and safe record/row boundaries without reading real rows | Fresh owner-approved header and Script Property attestations; clinical row privacy authorization |
| GS backend | P0-19 has `getDengueWorkspace` aggregate-only; source guard OFF | Specify a **future separate** event-scoped list/detail operation and per-request authorization order; no new public function now | Bound real event access, approved clinical field projection, formal runtime gate |
| UI/UX | P0-20 `#d331-p018-preview` under Records and `Mock-only · D331 OFF` passed owner UAT at Web App v19 | Retain one Records event-context UI pattern: closed default, loading/empty/error, identity change reset, no extra sidebar | Actual event-to-case binding, handling sensitive data on screen and mobile UAT |
| Security | P0-03B source rechecks session v2/current account and per-Event grant; Option A grant storage design selected in #213; v2 physical tabs reported created #219 | Strict deny-before-data-read checklist, DTO allowlist and negative tests; no browser privilege claims | Signed clinical/Area/event/owner/grant/custody decisions and real revocation authority |
| Testing | Existing synthetic GAS mocked tests / P0-20 offline tests and P0-21 browser UAT | New static negative guard/regression tests; CI at exact candidate SHA | Owner-approved isolated synthetic DEV read-only E2E; subsequent Browser UAT |

## Future API proposal — **NOT implemented, NOT callable**

The **future** `listDengueCasesForEvent(sessionToken, eventId)` is **only a proposed shape**, not an authorized callable RPC. Request contains **exactly** session token + canonical lower-case UUID EventID; no browser-supplied user, role, area, clinical policy, grant, table or header names. A future single-case read would additionally require a canonical CaseID and repeat *every* server gate. No delegation from a previous `getDengueWorkspace` response; no mutable per-client bearer readiness or cached grant.

**Server sequence for each future request (fail closed, no fallback):**

1. Hard feature gates OFF => generic `D331_UNAVAILABLE` **before any Apps Script service**.
2. Verify explicit existing DEV Script↔Deployment↔Script Property↔Spreadsheet binding, **without** `getDb_()`, `getSheet_()`, `getUserByToken_()` or legacy first-hit Event lookups.
3. Validate strict ordered `MainData` 39, `UserAccounts` 14, `AreaMaster` 10, `DengueCases` 16 and relevant v2 schema + grant headers; refuse absent/extra/reordered populated headers.
4. Revalidate nonexpired session-v2 against **current unique active UserID**; refuse duplicates, removed users, invalid credential verifier and role shortcuts.
5. Resolve **unique** MainData EventID, active/not-closed/not-void event, trusted revision and owner/area; resolve one exact active AreaID preserving leading-zero codes; refuse duplicate/ambiguous records.
6. Require approved exact eligible Dengue disease labels/policy revision, approved privacy field scope, active **exact UserID + EventID + AreaID + `dengue.case.read`** grant with nonexpired validity and verified current revocation policy. **No broad Staff/Manager/Admin role authorization.**
7. **Only then**, read a bounded `DengueCases` set for that EventID; validate unique CaseID, same parent EventID, positive CaseRevision, status and applicable FK/status policy; no arbitrary query or dataset enumeration. Reject malformed rows, mismatched parent, excessive scan/output, races or unverifiable revocation.
8. Return only owner/clinical/privacy-approved data-minimized fields; **deny by default while allowed field list is unsigned**. Always return `slaAssessment:'NOT_EVALUATED'`; `canWrite:false`, `canEnable:false`. Generic failure, no record existence or grant details in errors.

**DTO field decision is intentionally a HOLD:** Synthetic fixture contracts may include `CaseID`, `CaseRevision` and `CaseStatus` as **proposed internal keys only**. Do not claim these fields are approved for real-client return. Patient name, birth date, address, phone, attachments, raw clinical notes, location details, user/approver/grant/ledger fields, password/session token, narrative/evidence and Google identifiers are **never allowed by inference**. Returning even pseudonymous case identifiers needs a privacy/data-owner decision. No bare `SELECT *`-like projection.

## Failure / negative tests (offline)

- Disabled flags deny prior to any simulated `SpreadsheetApp`, `PropertiesService` or `CacheService` call.
- Unknown, malformed, uppercase or duplicate EventID; missing/closed/void Event, wrong disease, mismatched AreaID, stale parent Revision: deny.
- Missing or stale Session, inactive user, duplicate UserID, swapped account: deny.
- Missing/duplicate/revoked/expired/overbroad grants or revoked-after-readiness, wrong operation/policy: deny.
- Wrong schema/headers, unsigned projection fields, unexpected row columns, cross-Event CaseID, duplicate CaseID or 500+ matches: deny; avoid existence/PHI leakage and row reads preauthorization.
- No real API is mounted and P0-20 client never makes real RPC; teardown on Logout/epoch change; existing Records and original UAT must not regress.
- No actual 3h/3h/1d clinical timing or overdue status, no write/CRUD or Google Sheets changes.

## Bounded implementation sequence and Human Gates

**P0-22A (this Draft PR):** exactly one contract document plus one offline structural guard test. CI and Independent Review; **Merge requires separate Product Owner approval**.

**P0-22B:** distinct authorized source-only GS implementation of minimal server-authorized case-read DTO and synthetic offline tests **after clinical/privacy/security/data decisions**. No automatic real runtime enablement or Deployment from a source PR. Option A physical tab existence is not grant issuance or revocation authority; R1+R3 remains design-only in #213.

**P0-22C:** separately approved existing-DEV read-only cloud preflight + bounded synthetic E2E + Browser UAT, then separate Merge/Deploy gates. No patient data read without explicit authority. Future CRUD is P0-24+, not this slice.

**Immutable boundaries:** no new app, login, deployment, spreadsheet, provider or Production; no live D331 feature, data row read, grant, schema change, migration, `clasp`, push/rollback or Google Sheet write. Preserve original private IDs in #189 only. Version 19 remains the currently owner-attested Web App version.

`P022A_SOURCE_CONTRACT=REVIEWABLE` · `P022_REAL_CASE_READ=HOLD` · `P022_MERGE=HOLD` · `P022_DEPLOY=HOLD` · `D331=OFF`
