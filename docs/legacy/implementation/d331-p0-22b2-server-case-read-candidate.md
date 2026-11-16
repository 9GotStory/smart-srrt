# Smart SRRT — D331 P0-22B2: guarded Event → Case read candidate

**Tracking:** [P0-22 #238](https://github.com/9GotStory/smart-srrt/issues/238)  
**Verified base:** `main@50e3c900a9c3b9702eb8619ce7706f223351c818` (P0-22B1 merged, CI 64/64 + 967/967).  
**Environment:** existing Development/Testing Web App Version 19 (owner-attested), one original Script + Deployment + Google Sheets from private #189. **No Production configured.**  
**Classification:** SOURCE-ONLY candidate, not a clinical-read authorization or a Deployment request.

## What is now implemented

This slice replaces the earlier *pure deny/mock-only approach* with a **real, bounded, internal server-side read algorithm**, exercised in Node VM using faithful mocked GAS session, Script Properties, Cache, SpreadsheetApp and source-defined schema. Its on-cloud behavior is **OFF and unregistered**.

- Private `d331P022b2ListCasesForEvent_(sessionToken,eventId)` in new `src/dengue/15-p0-22b2-case-read-integration.gs` (trailing underscore, **not a public `google.script.run` RPC**).
- **First:** `D331_G1A_ENABLED=false`, `D331_P003B_ENABLED_=false`, `D331_P022B2_ENABLED_=false`, `D331_P022B2_REVOCATION_APPROVED_=false` and an **empty** `D331_P022B2_APPROVED_FIELDS_=[]` deny *before any Google service* in checked-in source.
- **When and only when separately authorized in future source:** call existing `d331P003bAuthorizedContext_` with **only session token and canonical EventID**. This verifies current unique active user/session-v2, explicit pinned existing DEV Script Property/Spreadsheet, exact 3 original + 7 D331 headers, unique Event, current approved Dengue disease mapping and policy revision, exact active AreaID and current per-Event `dengue.case.read` grant. Do not use `getDb_`, `getSheet_`, `getUserByToken_` or first-hit Event helpers.
- Add **private** `recordStatus` to the server-created context so the new reader strictly requires `active`; the existing public `getDengueWorkspace` and private metadata-only result **remain unchanged**.
- For the scoped `DengueCases` table, bound the *total* scan to 10,000 rows, read **only EventID column** for index lookup, select **at most 100** matching rows, then read exactly the 16 existing v2 fields for those EventID matches. Reject duplicated CaseIDs, invalid revision/schema/scalar, wrong EventID, or VOID (policy unresolved); fail closed on any error. No cross-event full row reads.
- The output **candidate** is `{status:'READ_ONLY',eventId,revision,areaId,cases:[{caseId,caseRevision,caseStatus}],slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,canWrite:false,canEnable:false}`. These identifiers/status are **not yet privacy-approved for any live client**. No name, unit, clinical timestamps, evidence, attachment, grant, raw narrative or arbitrary column is projected.

## Five-domain review

| Area | Delivered in P0-22B2 source | Remaining gate |
| --- | --- | --- |
| Database | Original 7 D331 v2 tabs and 113 headers reused; source header/row validation and bounded indexed read | No patient rows, schema migration, Script Property change or live metadata access authorized. Current header binding and ownership need fresh custodian signoff |
| Backend GS | Private real query algorithm after P0-03B server authorization; no new public RPC; count-only P0-19 unaffected | Clinical policy, revocation guarantees and explicit future field release / registration / DEV deploy |
| UI/UX | Existing Records mock preview untouched; Web App 19 unchanged | Future selected EventID binding, loading/empty/error UI, responsive E2E (no live case UI now) |
| Security | Fail-closed source flags, current session/pinned DB/Event/Area/grant, strict scope, generic `D331_UNAVAILABLE`, bounded projection | Approved real grant issue/revoke-forward process, credential/ACL read attestations, PHI minimization and consent/retention review |
| Testing | Injected synthetic end-to-end GS-service reads, zero/one/other-event, off-before-service, expired/revoked/wrong grant/area/event, duplicates/VOID/malformed/bounds, original Native33 parity CI | Real isolated Development testing and browser UAT only after separate approvals, no real patient data |

### Important limitations — do not infer from synthetic PASS

1. Unit tests deliberately set server-side flags/approvals to invented synthetic conditions **inside an isolated VM**. No real grant, disease allowlist, provider, revocation journal, policy revision or consent/legal basis was created or validated.
2. The existing `d331P003bAuthorizedContext_` checks the current grant row, but the historical **R1 independent journal + R3 restore-quarantine remains DESIGN ONLY** (#213). The extra `D331_P022B2_REVOCATION_APPROVED_` default OFF must not be changed until a real approved revoke-forward control and stale-restore test exist.
3. Google Sheets have no transactional read snapshot; Event/grant revocation race and concurrent row edits cannot be considered solved by a unit test. A future deployment plan must explicitly address concurrent reading, authoritative grant validation, session invalidation, and denial on outages.
4. Clinical team has not approved exact eligible disease labels, closed/void semantics, timing anchors for 3h/3h/1d or 3-3-1 case classification; `NOT_EVALUATED` is mandatory. Clinical/Privacy signoff must specify a **versioned authorized list** of returning fields. This source must not be used for real data beforehand.
5. Test-only positive results **do not imply a real live case reader exists**. The reader is unregistered in `tools/native-sources.mjs`, hard OFF in source, and has no browser integration.

## Immutable restrictions and next gates

**This Draft PR:** exactly 4 changed files: one narrow private context field update in `src/dengue/09-p0-03b-dev-readonly-adapter.gs`, one new unregistered `src/dengue/15-p0-22b2-case-read-integration.gs`, one new `tests/d331-p0-22b2-server-case-read.test.mjs`, this document. **No** change to Native manifest, HTML, Script, Deployment or Google Sheets; **no** actual patient read/write; no CRUD, grants or clinical 3-3-1 calculation.

**Next step:** ChatGPT Independent Review and CI at exact SHA, then **separate Product Owner authorization for Source-only Merge**. Subsequent activation requires separately approved security/clinical/privacy/data decisions, original existing DEV target audit and specific rollout authorization. Neither Source Merge nor CI is a deployment approval. No repeat Deploy, production environment or new Google assets.

`P022B2_SOURCE_ONLY=REVIEW`; `P022B2_LIVE_CASE_READ=HOLD`; `P022B2_DEV_DEPLOY=HOLD`; `P022B2_MERGE=HOLD`; `D331=OFF`; `SHEETS_WRITES=NO`.
