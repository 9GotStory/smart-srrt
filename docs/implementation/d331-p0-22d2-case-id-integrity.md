# Smart SRRT — D331 P0-22D2: global CaseID integrity and read-drift guard

**Parent:** [P0-22 Issue #238](https://github.com/9GotStory/smart-srrt/issues/238)  
**Source baseline:** `main@c494d7e9e5cbc284389c613ffc17554b492c6f8c`  
**Target environment:** Reuse original Apps Script, original existing Development Web App deployment (Version 19 is the last Product Owner-attested version), original Google Sheets (17 existing tabs), and original Smart SRRT Login/Records. No new asset.

## Focused problem and change

The P0-22B2 unregistered and hard-disabled candidate previously scanned only `DengueCases.EventID` across the bounded table, then read full 16-field rows for the requested Event. That correctly excluded other Events' clinical detail, but a **CaseID duplicated on another Event** was not detectable; an index-to-detail edit changing CaseID could also go undetected.

**This source-only hardening** changes only the private candidate reader and its offline tests:
1. After the existing server-owned authenticated session/Area/Event/capability/eligibility checks, read only **CaseID and EventID columns (A:B)** of the bounded table (at most 10,000 rows) for a *whole-table identity uniqueness check*. Do not read the clinical columns for other Events.
2. Reject any blank/noncanonical/uppercase/non-UUID CaseID or parent EventID, and reject any globally duplicated CaseID (including duplicates confined to other Events) using a null-prototype lookup. **Fail closed with generic `D331_UNAVAILABLE`.**
3. Enforce the already present **100 Event-matched Case maximum**. Record selected row plus originally observed CaseID; only then fetch 16 fields for the selected Event's rows. Verify **both** CaseID and EventID still match the index snapshot; otherwise deny. The existing v2 scalar/status/revision validation and minimal synthetic DTO remain.
4. Preserve generic error behavior and privacy field minimization; the candidate never projects another Event's CaseID, unit, patient details, grant, or clinical timeline. No new routes, public RPCs, frontend buttons, sheet writes or permission changes.

## Five-domain acceptance

| Domain | Source-only evidence | Outstanding release gate |
| --- | --- | --- |
| Database | Original `DengueCases` 16-column schema retained; whole-table index uses only A:B and bounded rows. Existing real 10 critical header rows were independently matched (MainData 39, UserAccounts 14, AreaMaster 10; all 7 D331 sheets 113 headers) under D1 | Data steward must agree that **CaseID is globally unique**, approve limited cross-Event identifier scans, assess expected dataset size, and validate live provenance and concurrency |
| Backend GS | Private P0-22B2 reader performs null-prototype global duplicate check and index/read identity comparison; changes only in unregistered source file | D331 OFF and no clinical/private-field/race authority exists; current Script↔Deployment↔Property still needs separate technical evidence |
| Frontend UI/UX | Original Records Mock-only D331 preview and original login untouched | Future Event selection and list UI, loading/error, privacy-masked details remain separate |
| Security | Fail-closed malformed/duplicate Case IDs even on another Event; no cross-event PHI fetch, generic denial | Full service-level revocation, current session security, legal/privacy approval of cross-event identifier lookup, concurrency and stale-restore handling remain HOLD |
| Testing | Existing Node VM mocks now verify global collisions, malformed IDs, synthetic index/detail edit, denied cross-Event clinical reads, default OFF and legacy regression | No live Sheets patient rows read; no actual D331 Cloud E2E or Browser UAT |

### Explicit limitations

- This is **not** a final data-model identity decision. Global CaseID uniqueness is a conservative **candidate guard** pending data-owner sign-off. Collision with any unrelated Event causes generic denial.
- Google Sheets has no transactionally consistent snapshot across operations. Comparing selected CaseID/EventID catches specific simulated edits between index and selected detail reads, **not** all concurrent edits or a revoked grant during a read. Do not call this concurrency-safe.
- `CaseID` and `EventID` may be sensitive identifiers. Proposed future server-only cross-event A:B scan **requires Privacy and Security sign-off before live data**; their values are never returned for unrelated Events or logged.
- Same first-party resources only. Last owner-attested DEV Version 19 is unchanged. There is no Production installation.

## Human gate

This PR is **Source-only**. All related Apps Script files remain **unregistered**, all D331/real-grant/revocation switches **OFF**, and approved read-field list blank. **Do not Merge until a separate Product Owner authorization**, and do not enable live D331 or deploy from the Merge. The D1 live Script↔Deployment↔Script Property check and Clinical C1/C2, Privacy P1, Security S1/S2, and final D2 case identity/concurrency approval remain independent HOLDs.

`P022D2_SOURCE_ONLY=REVIEW` · `D331=OFF` · `P022_REAL_CASE_READ=HOLD` · `MERGE=HOLD` · `DEPLOY=NO` · `SHEETS_WRITES=NO`
