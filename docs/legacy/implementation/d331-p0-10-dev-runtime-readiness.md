# Smart SRRT D331 — P0-10 Development Runtime Integration Readiness

**Baseline:** `main@b7ef5d54c794b8d0effa7ca32f3f5add5b4d3b74` · **Deployment:** none in P0-10 · **Environment:** existing shared Development/Testing Apps Script, Web App and Google Sheet in private [Issue #189](https://github.com/9GotStory/smart-srrt/issues/189); no Production configured.

## Five-area readiness

| Area | Evidence and action |
| --- | --- |
| Database | Original 17-tab Development Sheet available; seven D331 v2 headers 113/113 matched previously. Do not create or migrate another sheet. |
| Backend (GS) | Preview only the seven **additional** server source dependencies needed by Dengue: trusted event, schema v2, read adapter, 7-tab compatibility, five-domain workflow, guarded CRUD, header preflight. Full candidate = **existing 8 registered + 7**; do not change Native manifest yet. |
| Frontend UI/UX | Preserve existing Smart SRRT menu/layout and HTML registry. No new D331 RPC or browser client action. |
| Security | Check duplicate global functions, dependency/schema order, all disabled flags, no approved clinical policy, no preconfigured allowlist or DB ID in source. Default entrypoints must fail closed without Google services. |
| Testing | Add offline full Apps Script global-load check, activation-negative tests and mock CLI. Existing GitHub CI regression required, **not a claim of real DEV UAT**. |

## Actual source preparation

`tools/d331-p0-10-runtime-readiness.mjs` builds a **strict in-memory preview**. The current Native8 app consists of seven `src/server` GS modules plus the existing inert `src/dengue/00-g1a-foundation.gs`. The additional files are, in order:

1. `src/dengue/03-n1b1-trusted-event-contract.gs`
2. `src/dengue/07-p0-02a-mvp-schema-contract.gs`
3. `src/dengue/09-p0-03b-dev-readonly-adapter.gs`
4. `src/dengue/10-p0-05-v2-schema-compat.gs`
5. `src/dengue/11-p0-06-offline-workflow-engine.gs`
6. `src/dengue/12-p0-07-guarded-dev-crud.gs`
7. `src/dengue/13-p0-08-dev-readonly-preflight.gs`

The validator checks all 15 source files can parse and initialize together **without Google APIs**, no duplicate top-level declarations, no new public browser-callable function name in the 7 modules, and existing five domain/7-tab schema mapping remains consistent. No future Native deployment file is generated or staged. The CLI prints status fields only (never environment IDs).

P0-10 must retain:
`D331_G1A_ENABLED=false`; `D331_P003B_ENABLED_=false`; `D331_P007_ENABLED_=false`; `D331_P002A_APPROVAL_='DRAFT_ONLY'`; `D331_P003B_APPROVED_DEV_SPREADSHEET_ID_=''`; empty disease labels and policy revision. P0-10's `OFFLINE_SOURCE_ORDER_PASS` means only **syntactic/global compatibility and fail-closed**. It always returns `canStage:false`, `canDeploy:false`, `canWrite:false`.

## Why real DEV writes are still blocked

Product Owner has confirmed through **visual read-only inspection** that the original Script ID, Deployment, Script Property presence and spreadsheet binding all match, recorded in Issue #189. This is **owner-reported PASS**, not a separate Apps Script API attestation. There is no technical basis to create new scripts or ask again for the same identifiers.

The shared D331AccessGrants table has no grants; no approved synthetic user or eligible synthetic MainData event has been provisioned. Backend P0-07 has mock 5-domain CRUD tests, but no live Data serialization/revision or real ScriptLock / Request Ledger reconciliation proof. The v2 schema is still source-labelled `DRAFT_ONLY`, and clinically approved disease mapping and authoritative 3-3-1 time origins are absent. Keep all writes on HOLD, especially for real patient records.

## Next bounded Integration step (separate authorization)

After P0-10 source-only Merge and explicit Development execution approval:
- Verify the built Native package order with the new 7 dependencies and updated Native size. The existing `tools/deploy-g34-clasp.sh` has a fixed historical 8-server-file ordering and backup allowlists, **so it is NOT currently a safe deploy path for a 15-server source package**. A separate guarded deploy-tool adaptation and backup/rollback scope review are mandatory; do not invoke the current script to push the candidate.
- Verify Apps Script editor/existing Deployment source version and existing cached Login semantics. Authorize a **synthetic-only** operator/user/event and narrow 5-domain grant with expiry, not a real case/grant borrowed from live rows.
- Dry-run as staged DEV-only source with feature flags still off. Test header preflight independently before considering real synthetic create/update; no public RPC until server authorization and client workflow tested.
- Then conduct a bounded synthetic case → plan → action → survey → followup test, verify exact RequestID replay and PENDING/COMMITTED journaling plus date/number formats in actual Google Sheets, browser loading/error states, and no changes to the original clinical dataset. Halt on mismatched rows, orphan links, unexpected records or stuck PENDING; never silently retry or overwrite.
- Confirm medically reviewed 3-3-1 origin/endpoints and remaining UI/UX explicitly, before clinical deadline evaluation.

This PR is **source-only**, and does not authorize Merge, Native registration, grant issuance, feature enablement, staging, clasp push, deployment or live Google data access.
