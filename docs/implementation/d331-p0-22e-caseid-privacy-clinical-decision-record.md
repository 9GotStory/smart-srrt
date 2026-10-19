# Smart SRRT — P0-22E: Decision-ready gates for Event → Dengue Case reads

**Document classification:** Source-only review proposal. **No medical, privacy, security or operational sign-off is implied.**  
**Tracking:** [P0-22 Issue #238](https://github.com/9GotStory/smart-srrt/issues/238), [P0-22D2 merged PR #242](https://github.com/9GotStory/smart-srrt/pull/242)  
**Exact inspected base:** `main@54eeb2634ff43c1b3a3534562e3fcfb263226bf6` (post-merge CI 64/64 contracts, 980/980 regression).  
**Environment constraint:** reuse *all existing* original Smart SRRT Apps Script, Deployment, Google Sheets, Login and Records. Last **owner-attested** DEV Web App is **Version 19**; no Production environment exists. Never duplicate canonical private IDs from Issue #189 here.

## One-page disposition

**Source/test implementation:** P0-22D2 PASS **source-only**. **Live read approval:** HOLD.

The guarded `src/dengue/15-p0-22b2-case-read-integration.gs` is not registered in `tools/native-sources.mjs`. `D331_G1A_ENABLED`, `D331_P003B_ENABLED_`, `D331_P022B2_ENABLED_` and `D331_P022B2_REVOCATION_APPROVED_` all remain **false**, and `D331_P022B2_APPROVED_FIELDS_=[]`. Only synthetic tests forced them true inside an isolated Node VM; no operational access was granted.

The now-implemented candidate reads **CaseID + EventID** for at most **10,000** `DengueCases` rows *after* server authorization; it rejects duplicate CaseID anywhere in that table, then fetches full 16-column data for at most **100** rows matching one authorized Event, validates the original CaseID + EventID pair and returns only `caseId`, `caseRevision`, `caseStatus` under a synthetic candidate DTO. All cross-event identifiers are excluded from the response. **This is not a real privacy approval for the A:B scan or for any displayed CaseID.** No real patient row has been examined for this review.

### Five-domain decision table

| Domain / Gate | Explicit question for accountable owner | Current source-backed evidence | Decision / acceptance evidence required |
| --- | --- | --- | --- |
| **Database D2-1** | Is `CaseID` a globally unique and immutable v4-style UUID across **all** Events, including VOID cases? Or is identity event-scoped? | Current candidate enforces global uniqueness and canonical UUID for every Case row; field contract has `CaseID` and `EventID` as separate required columns | **HOLD**. Data steward selects exactly one rule, defines legacy duplicate/orphan handling, lifecycle and migration implications, approves a version/date. If not global, revise source and tests before Merge of any follow-on implementation |
| **Database D2-2** | Are `CaseRevision`, Event revision/status, `CaseStatus='VOID'`, orphan Case/Event and concurrent edits handled consistently? | Selected Case rows validated, VOID denied, index/detail ID drift denied; Google Sheets cannot provide atomic snapshot/revocation on its own | **HOLD**. Data steward defines revision and VOID semantics, parent lifecycle, stale read and concurrent update acceptance. Do not claim the current guard eliminates all time-of-check/time-of-use races |
| **Backend B1** | Is an authorized Event-scoped case *list* needed first (versus case detail)? What exact result/empty/error contract is approved? | Private case-list reader, `getDengueWorkspace` remains count-only; all runtime flags OFF | **HOLD**. Approve minimal DTO version and server authority. Do not add a new public RPC, register the candidate, change flags or expose Case detail before separate review |
| **UI/UX U1** | Where will an approved case list live within current Records and how will loading/empty/error be shown? | Existing P0-20 Mock-only Records preview, no live Case list; owner requires original UI | **HOLD**. Retain one original Records flow, no parallel app or Login. Test mobile/desktop with synthetic-only content after authorization |
| **Privacy P1** | May a normal event-authorized user cause a global **CaseID/EventID** scan of *other* Events, even though those identifiers are not returned? | Current candidate scans A:B across the bounded sheet for uniqueness; identifiers are potentially linkable sensitive case data | **HOLD**. Privacy officer and data custodian approve purpose, lawful basis, necessity, authorized server actor, role/event scope, retention/logging, and this exact cross-event scan **or reject it and require redesign** |
| **Privacy P2** | May a scoped `CaseID`, `CaseRevision`, `CaseStatus` be returned to a user? | These 3 fields are **test-only** candidate, not privacy-approved; `CaseID` could link to a sensitive record | **HOLD**. Sign off an exact field-by-field DTO, users/roles/scopes and no default exposure in Public Library, AI Reporter, prompts/Gemini, exports, logs or attachments |
| **Security S1** | Who can grant, approve, expire, revoke and audit `dengue.case.read` for an **exact EventID and AreaID**? | Existing P0-03B source validates session-v2/user/current exact Event+Area and an active grant row; physical `D331AccessGrants` tab from #219 does not itself issue grants | **HOLD**. Security custodian signs operational grant lifecycle, separation of duties, revoker/auditor responsibility, expiry, deny-on-outage, and audit redaction. Role alone (including Admin) never implies grant |
| **Security S2** | What prevents a revoked permission from reappearing after a stale restore? | #213 selected **R1 independent revocation journal + R3 restore quarantine**, **design only**; neither provider nor runtime attestation exists | **HOLD**. Independent operational evidence + negative restore/outage tests before changing `D331_P022B2_REVOCATION_APPROVED_` |
| **Clinical C1** | Which *exact current source-system disease labels/codes* qualify as Dengue, and what happens on reclassification or closed/void cases? | `D331_P003B_APPROVED_DISEASE_LABELS_=[]`, policy revision blank | **HOLD**. SRRT/clinical owner provides versioned exact labels/mapping for existing MainData/MasterData, classification and exclusions. Never infer local codes from public national guide |
| **Clinical C2** | What are the official **3-3-1** clock anchors, actions, end stamps, time zone, exclusions and deadlines for this service in 2569? | `slaAssessment='NOT_EVALUATED'`, no clinically signed clock contract. General DDC fiscal-2569 guidance mentions measure 3-3-1 | **HOLD**. Clinical owner signs separate 3h/3h/1-day steps, time anchors, cutoffs, reopens and correction handling. No SLA `PASS/FAIL` computations until signed |
| **Testing T1 / D1** | Is the *existing* Script ↔ Deployment ↔ Script Property ↔ verified Workbook binding proven, and may isolated synthetic DEV read be performed? | Direct metadata/read-only Google Sheets row-1 check previously showed original 3 critical headers 39/14/10, all 7 D331 headers 113/113, total 17 tabs; original Web App Version 19 owner-attested. Google connector cannot attest live Apps Script Script Properties/Deployment | **HOLD** for Script/Deployment/Property status-only attestation and **separate owner authorization** for any cloud synthetic reading or deployment; do not repeat private IDs or create new resources |

## Specific owner decisions — ready to record in Issue #238

**Minimum set of human approvals** (record status, role, dated policy revision, referenced private evidence; no patient identifiers):

1. **Data Steward:** `D2_GLOBAL_CASE_ID=APPROVE_GLOBAL|REQUIRE_EVENT_SCOPED|HOLD`; `D2_LIFECYCLE_REVISION=PASS|HOLD`. A decision to allow global UUIDs is a **domain identity rule**; it is not itself permission for every app user to scan all Events.
2. **Privacy Officer + Data Custodian:** `P1_CROSS_EVENT_AB_SCAN=APPROVED|DENIED|HOLD`; `P2_CASE_LIST_DTO_FIELDS=APPROVED_VERSIONED|HOLD` and per-role/per-event purpose/retention/logging review. Default is **DENY**.
3. **Clinical SRRT Lead:** `C1_DENGUE_LABELS=APPROVED_VERSIONED|HOLD` and `C2_331_CLOCKS=APPROVED_VERSIONED|HOLD`. In particular specify: notification time **from what event**, first three-hour intervention **from what receipt**, one-day control action completion timestamp, delay exceptions, and `Asia/Bangkok` clock policy.
4. **Security + Operations:** `S1_GRANT_LIFECYCLE=OPERATIVE_PASS|HOLD`; `S2_REVOCATION_RESTORE=OPERATIVE_PASS|HOLD`, with real *separate* evidence — not passing synthetic source tests.
5. **Existing DEV Custodian:** `D1_SCRIPT_DEPLOYMENT_PROPERTY=PASS|HOLD` after status-only original project UI check; `T1_ISOLATED_DEV_READ=NOT_AUTHORIZED` until Product Owner separately authorizes it. The instruction **“use all original assets”** establishes target reuse, not live property proof.

## External clinical sources (REFERENCE ONLY; not owner sign-off)

- DDC strategy page linking **FY2569 disease prevention/control operational guideline**: https://ddc.moph.go.th/dsp/pagecontent.php?dept=dsp&page=1492
- FY2569 DDC public text edition mentioning Dengue **3-3-1**: https://fliphtml5.com/wkqqv/dbkx/
- Historical MOPH communication giving an operational 3-hour / 3-hour / 1-day illustration: https://pr.moph.go.th/online/index/news/124181

**Do not use these sources to auto-populate local 2569 MainData disease labels or specific SLA anchors.** Provincial/district instruction and accountable clinical sign-off control the exact software rules.

## Acceptance, not release

**This P0-22E file** is a single docs-only review packet; it makes **no changes** to GS, HTML, runtime registration, policy, grants, Google Sheets, Apps Script project, deployment or any data. Existing Source-only tests remain mandatory. A later policy approval/implementation must go through its own scoped source tests, Independent Review, separate Product Owner Merge approval, and separate DEV Deployment Gate.

`P022E_DOCUMENTED=REVIEW` · `D2=HOLD_POLICY` · `PRIVACY=HOLD` · `CLINICAL=HOLD` · `SECURITY=HOLD` · `D1_BINDING=PARTIAL_PASS_HOLD` · `D331=OFF` · `LIVE_PATIENT_READ=NO` · `MERGE=HOLD` · `DEPLOY=NO` · `SHEETS_WRITES=NO`
