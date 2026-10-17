# Smart SRRT — P0-03B Development Read-only Backend Integration (source-only)

**Baseline:** `main@a6eb358ce3bb9a6d77cf7df0bdd90a61de2407b3` · **Status:** candidate, NOT live authorization or deployment. **Environment:** existing Smart SRRT Apps Script + Google Sheets Development only; no Production configured.

## Objective
Prepare the **real Google Apps Script read-only API boundary** while keeping all runtime and data untouched. Source is private `src/dengue/09-p0-03b-dev-readonly-adapter.gs`, unregistered in `tools/native-sources.mjs`. Tests inject mocked `PropertiesService`, `SpreadsheetApp`, and `CacheService`; no connected Google Sheets or patient rows were read.

| Five focus areas | This slice |
|---|---|
| Database | Reuse same configured `DATABASE_SPREADSHEET_ID`; compare with separately approved explicit DEV ID; require exact existing headers and Option A proposed grant tab; no tab creation or mutation |
| Backend (GS) | Prepare private `d331P003bReadOnly_` with strict UserAccounts session-v2, MainData EventID, AreaMaster and grant composition; return only event ID, revision, area ID and read mode |
| Frontend | No change in this slice; existing Smart SRRT page integration remains subsequent task |
| Security | No generic view/edit/Admin shortcut; exact unique active user/Event/Area, distinct active grant, policy revision, grant time window; denial uses `D331_UNAVAILABLE` |
| Testing | Synthetic GAS-service mock positive/negative, plus existing CI regressions; no DEV browser E2E claimed |

## Bounded mechanics
1. Both `D331_G1A_ENABLED` and `D331_P003B_ENABLED_` are false in source. Additional `D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=''`, `D331_P003B_APPROVED_DISEASE_LABELS_=[]`, `D331_P003B_APPROVED_POLICY_REVISION_=''` keep the operation unavailable.
2. No `getDb_()`, `getSheet_()`, `getUserByToken_()`, `findEventRowById_()`, fallback active spreadsheet, installer, writer, `setProperty` or audit write. Existing helpers could create metadata or accept first-match events; new reader does not.
3. **If separately enabled through approved source changes after binding + clinical/grant review**, read explicit DEV ID from a pinned approved source value, then read existing Script Property without mutating it. A missing/mismatched configured ID denies before opening a database.
4. Check all 39 MainData, 14 UserAccounts, 10 AreaMaster and 22 proposed D331AccessGrants ordered headers. The latter Sheet does not exist/has not been authorized for creation — **real reads therefore cannot succeed today**.
5. Rehydrate session-v2 token from existing CacheService, compare against the current uniquely matched UserAccounts password-verifier tag and active status, no browser-provided user/role. Search entire EventID and UserID columns for uniqueness before reading selected raw rows; reject duplicate IDs.
6. Validate event disease using an owner-approved exact allowlist, status/revision, unique active AreaID, and an exact nonexpired explicit per-user/EventID/capability grant. Read-only operation only — no mutation or COMMITTED ledger entries.
7. Return only `{eventId,revision,areaId,mode:'read'}`. All read/validation errors use generic `D331_UNAVAILABLE`.

## Limitations and gates
- This is a **candidate** for Development integration, not deployed or real-world tested. The mocked services do not establish provenance of a live spreadsheet, validity of Thai disease labels, spreadsheet editor security, legal basis, restoration/revocation semantics, concurrency guarantees or actual user permission.
- No physical `D331AccessGrants` tab was created. The initial policy and grant schema remain design candidates; they do not grant any person access.
- User data and the existing Script/Deployment/Spreadsheet IDs remain restricted to GitHub Issue #189; do not duplicate in source/test/docs or ask the owner to resend.
- Google Sheets lack database transaction/FK/row-level ACL semantics; future writes need lock, Revision/idempotency and audited rollback, separately approved.
- Before any actual Development read: verify Script↔Deployment↔Spreadsheet mapping with the already supplied identifiers, independently approved exact disease labels, real grant issuance/authorization, bounded data access and privacy review, followed by explicit authorization to modify Native source registration and deploy Development.
- No Production and no Production gate; do not invent one.

## Verification
`node --test tests/d331-p0-03b-dev-readonly-adapter.test.mjs`, `npm run check:contracts`, `npm test`, `npm run build:check`.

**Merge Human Gate:** A source-only PR can be merged after exact-SHA Independent Review, CI and Product Owner's separate approval. A merge never authorizes real spreadsheet access, DDL or deploy.
