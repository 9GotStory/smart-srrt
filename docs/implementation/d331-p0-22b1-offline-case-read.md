# Smart SRRT — P0-22B1: deny-only case-read boundary + synthetic projection

**Tracking:** [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238) · baseline `main@0b20b9dfd4a2370cd28d0cabde3fca8db9c15a9f` · original DEV Web App Version **19** (owner attestation). This is a **source-only Draft PR**, not a live D331 data access approval.

## Decision: an offline-first backend slice, NOT premature live integration

P0-22A #239 merged its event→case read-only contract; P0-22B was planned to implement a minimal internal case-read boundary after clinical/privacy/security decisions. Those substantive approvals are **still missing**. This first bounded P0-22B1 implements a **permanently deny-only private server stub** plus **pure synthetic row validation/projection** that cannot read a real patient. It does not purport to complete P0-22B's future authenticated case read.

- **Database:** Leave seven existing empty v2 D331 tabs + 113 headers (#219) and original data untouched. Synthetic `DengueCases` row check uses the exact 16-field `d331P002aHeaders_()`/draft scalar validation, and requires a FIXED synthetic EventID and at most two FIXED synthetic CaseIDs. No SpreadsheetApp access.
- **Backend GS:** Add **unregistered** `src/dengue/14-p0-22b1-offline-case-read.gs` with `d331P022bListCasesForEvent_()` (private, terminal deny) and `d331P022bOfflineCases_()` (pure offline synthetic checker). Hard `D331_P022B_ENABLED_=false`, blank field-policy approval. **Even if all four flags/policy checks are force-set to pass, the stub still always denies**. No top-level public `listDengueCasesForEvent`, no actual `getDengueWorkspace` modification.
- **Frontend UI/UX:** Original Records P0-20 collapsible preview remains mock-only, with the existing five-step layout, no real EventID click, no case list or clinical detail UI. Version 19 unchanged.
- **Security:** The synthetic kind is forgeable and **never proves trusted server origin, session, grant or patient access**. Source-only row validator cannot validate live grant revocation. Any future live reader must independently perform per-request server session-v2, current active unique user, original exact DEV binding, eligible disease policy, exact EventID and AreaID, current approved revocable `dengue.case.read` grant, current Event status/revision, minimum privacy-approved DTO, generic errors, and bounded PHI-safe audit. Option A/R1+R3 (#213) is DESIGN ONLY; the physical grant header tab is not an active grant provider.
- **Testing:** New `tests/d331-p0-22b1-offline-case-read.test.mjs` exercises hard-OFF before Google services, forged flags still deny, two-row synthetic positive, empty state, duplicate/cross-event/mismatched status/revision/schema/extra-column negative cases, and Native manifest isolation. Existing contracts/full regression remain mandatory.

### Internal offline DTO (not permission for real-client output)

Only FIXED fictional EventID/CaseID, `CaseRevision`, `CaseStatus`, fixed synthetic AreaID, `simulationOnly:true`, `slaAssessment:'NOT_EVALUATED'`, `canWrite:false`, `canEnable:false` are returned by the **offline mock helper**. Test rows may contain other synthetic fields, but the helper never emits them. Even the identifiers/status proposed here are **NOT approved PHI-safe projections for a real user**.

### Strict human gates still open for P0-22B2

1. Approved eligible Dengue labels/diagnosis interpretation, active/closed/void semantics and 3-3-1 clinical timestamps (do not assume rules).
2. Data/Privacy approval for **specific fields** in a real case list/detail DTO and appropriate legal basis; PHI should not flow into public library, logs, AI Reporter or Gemini.
3. Security signoff on current active session, per-event/area grant issuance/revocation, deny-on-outage, current Source Script Property binding and ownership; static flags and Option A design are insufficient.
4. Future separate source implementation of **actual** private server-authorized case reader with full negative tests; never turn off guards or promote this synthetic fixture to real authority.
5. Later separate Product Owner approval for Source Merge; then dedicated DEV preflight and a **new** exact-SHA Deployment Gate plus isolated synthetic Browser UAT. No standing authorization.

### Acceptance this slice

Exactly three **new** files (one GS private unregistered module, one offline test, one implementation note). No edits to existing code, config, build manifest, UI, flags, Docs patient data or Google environment. `D331=OFF` / `P022B_REAL_CASE_READ=HOLD` / `P022B1_SOURCE_ONLY=REVIEW` / `P022B1_MERGE=HOLD` / `P022B1_DEPLOY=HOLD` / `SHEETS_WRITES=NO`.
