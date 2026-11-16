# Smart SRRT — P0-07 Guarded Development CRUD (Source-only)

**Baseline:** `main@49ee43ddce560c5c04b85e44477bf90261ca8b4f`; **Environment:** existing shared Smart SRRT Development Apps Script + original Spreadsheet (GitHub Issue #189). **No Production configured.** All five D331 domain tabs, request ledger and grants physically exist with v2 headers from P0-04 (Issue #219), but this code is NOT deployed.

## Scope by agreed five areas

| Area | Deliverable |
| --- | --- |
| Database | Reuse existing 7 D331 tabs; no DDL, grants created or changes to original 10 Smart SRRT tabs |
| Backend (GS) | `d331P007Operate_` (internal only): guarded create/update of Case, Plan, Action, Survey, Followup; terminal/void-style statuses instead of irreversible delete |
| Frontend | No UI or client RPC yet; retain existing Smart SRRT navigation/Login |
| Security | Feature OFF, exact pinned DEV DB, session-v2 rehydrated from existing CacheService + unique active UserAccounts, strict MainData EventID/Revision/active status/AreaMaster, current matching explicit grant, no role-based fallback |
| Testing | Mock GAS/Sheets with positive/negative write, lock and ledger cases; full CI. Real Development API/clinical workflow not tested. |

## Write contract

`d331P007Operate_(sessionToken, eventId, command)`, underscore-suffixed internal GAS function only, accepts `{kind,mode,requestId,expectedEventRevision,payload}` and for updates additionally `{entityId,expectedEntityRevision}`. `kind` is one of `case/plan/action/survey/followup`, `mode=create/update`. All entity IDs, actor IDs, area, policy version, creation/modification stamps and Request Ledger entries are generated from server state; caller is limited to exact per-operation payload fields. There is **no public route** or irreversible delete. Terminal lifecycle/status changes are only allowed under controlled transitions; attempted modifications after terminal states are rejected. MainData and AreaMaster are never written by P0-07.

A valid operation requires these gates, in order: feature/source toggles → strict command shape → `LockService.getScriptLock().tryLock` → pinned Script Property / explicit Spreadsheet ID equality → exact existing MainData, UserAccounts, AreaMaster + 7 v2 table headers → actual cached Session v2 verified against current active user → unique EventID/active record/Revision → current distinct active exact EventID/AreaID/capability grant with expiry and policy revision → ledger uniqueness/digest replay check → validated existing five-domain rows and prospective FK snapshot via P0-06 → write.

**Idempotent write order:** append a `PENDING` ledger row containing request ID, digest, user/event/capability → append or update one domain row → set ledger `COMMITTED` with entity ID/type. A replay of the same `COMMITTED` request ID and matching digest returns `REPLAYED` without domain writes. A `PENDING` / `UNKNOWN` request ID or mismatched digest is denied. **Sheets is not transactional**: if domain or ledger write throws after PENDING is persisted, the request intentionally remains blocked until operator reconciliation; do not auto retry, delete PENDING, synthesize a COMMITTED receipt or roll back without evidence. Google Sheets manual edits or nonparticipating writers do not honor ScriptLock; this implementation is a bounded DEV candidate, not transactional proof.

**Schema rules:** maintain per-entity Revision, LastMutationID, EventID and parent PlanID links; server-issued timestamp and owner identities; P0-02A typed row and lifecycle checks; P0-06 five-domain Event/Area/FK prospective validation. Action and followup completion timestamps and final entomology survey timestamps are set by the server on transition. Count-positive > count-inspected fails; HI/CI policy remains unchanged. Followup `DueAtUTC` is required user-entered scheduling data under an authorized grant, NOT a signed clinical 3-3-1 computed deadline; no on-time/late judgment.

## Hard limitations / human gates

- Canonical source keeps `D331_G1A_ENABLED=false`, `D331_P003B_ENABLED_=false`, `D331_P007_ENABLED_=false`, clinical disease allowlist and explicit DEV ID empty. `src/dengue/12-p0-07-guarded-dev-crud.gs` is deliberately **not** in `tools/native-sources.mjs`: no runtime API or production/DEV write was activated by this PR.
- No real patient records were read. Mocked Session, grant, Spreadsheet, LockService and Utilities only; no actual spreadsheet modifications, Script Properties mutation or Deploy.
- Real full user-permission, disease code, clinical 3-3-1 clocks, conflict resolution, real concurrency across other Apps Script writers, Google Sheets number/date serializations, manual row edit protections, audit/retention, per-entity administrative policy and browser UAT require separate Development gate before a live write.
- Current P0-07 is C/R/U oriented (the earlier P0-03B read-only adapter offers authorized read metadata); **hard delete is intentionally unsupported** for surveillance records. Terminal statuses `VOID`, `CLOSED`, `CANCELLED`, `SKIPPED` handle supported lifecycle changes. Not every entity supports VOID, per actual v2 enum schema.
- As implemented, `tryLock` is an advisory Apps Script lock, not a true database transaction; a failure after ledger PENDING is conservatively held. Never expose it to clients without verified backend authorization and a safe reconciler.
- Future separate gates: Independent Review at Exact SHA, source-only Merge approval, verify Script↔Deployment↔Spreadsheet binding, clinical/policy approvals, grants management, native source dependency registration, controlled DEV test data writes, actual browser UAT. No Production exists.

**Validation commands:** `node --test tests/d331-p0-07-guarded-dev-crud.test.mjs`, `npm run check:contracts`, `npm test`, existing GitHub Actions CI. This change does not request a deployment.
