# Smart SRRT Dengue 3-3-1 — P0-11 Native33 Package & Guarded Preflight

**Date:** 18 Oct 2026 · **Existing Development/Testing:** reuse original Apps Script + Deployment + Google Sheets, recorded privately in [Issue #189](https://github.com/9GotStory/smart-srrt/issues/189). **Production not configured.** **Baseline main:** `5d4d36789b2375ccdb1bf0cbb285514d75f60d06`.

## Scope (only agreed five priorities)

- **Database:** no creation/migration of tables; 17 original Development tabs preserved, seven Dengue v2 tables as previously verified.
- **Backend (GS):** candidate **Native33** = existing 8 GS + 7 D331 dependencies + 17 HTML partials + Index = **33 files**; unchanged 26-file runtime Native manifest. Flags G1A/P003B/P007 remain OFF, clinical schema `DRAFT_ONLY`, no hard-coded spreadsheet ID or disease allowlist.
- **Frontend:** existing five Smart SRRT menus and inert Dengue status partial unchanged; no new RPC or UI enablement.
- **Security:** exact SHA and safe backup gates. No CRUD Session/Grant issued, no OAuth copied to GitHub, no external Script Property access.
- **Testing:** offline package/binding, known remote layouts, buffer parity, private local backup and rollback snapshot preflight. Not a live Development CRUD or deployment test.

## Files

- `tools/d331-p0-11-native33-package.mjs` — creates an **in-memory Native33 candidate** from the canonical Native26 builder + seven vetted backend GS files; checks exact order, global declarations, OFF gates and bytes via the prior P0-10 validator. It can **write a private local stage only** beneath a fresh user-owned backup directory. Source manifest and frozen One-Click unchanged.
- `tools/deploy-d331-p011-preflight.sh` — new dedicated **operator-only `--preflight`**, no `--deploy`/auto rollback mode. Exact git main SHA and repo origin, pre-existing authenticated clasp v3, original Script/Deployment IDs, read-only clasp **pull**, list deployments and versions, exact Native24/25/26 remote content checks, private Native33 stage and original `appsscript.json` byte preservation. Creates a private rollback source/deployment/version archive with SHA256, then performs a **local-only archive extraction drill** and byte-for-byte comparison of all backed-up source/metadata before returning PASS.
- `tests/d331-p0-11-native33-preflight.test.mjs` — synthetic source manifest, negative flag/ordering, exact backup layouts and shell no-execution gates.

**No edits** to `tools/native-sources.mjs`, `tools/deploy-g34-clasp.sh`, original existing GS/HTML files, Script Properties, the existing Google assets or any Development deployment. Old guarded deployment utility remains unchanged and **must not** be used to release Native33. This P0-11 feature adds no live deploy command.

## Operator-only usage — NOT authorized by this source-only PR

Only after a separate Product Owner read-only execution approval, on the existing Fedora operator account where `clasp` is already logged in, privately set `SMART_SRRT_SCRIPT_ID`, `SMART_SRRT_DEPLOYMENT_ID` and `SMART_SRRT_APPROVED_SOURCE_SHA` (do not paste IDs or tokens to GitHub). Checkout the EXACT separately approved main SHA and invoke:

```bash
SMART_SRRT_P011_APPROVED_READONLY=YES \
  bash tools/deploy-d331-p011-preflight.sh --preflight
```

The script makes **read-only** Google calls through `clasp pull`, `list-deployments` and `list-versions`. It does create private **local** backup and stage files with owner-restricted permissions. No `push`, no `update-deployment`, no spreadsheet edits. The backup archive and SHA256 live in the printed private backup directory outside Git; raw IDs, secrets, pull output and remote inventories are NEVER published in GitHub or model responses.

**Rollback reality:** The archive is a snapshot containing the entire pulled remote source (including the original Apps Script manifest), existing deployment inventory and version list. The current deployment is untouched, so no rollback is required for this preflight. The local extraction and byte-parity drill proves archive contents can be recovered **locally**, not that remote Apps Script deployment rollback would succeed. The archive must not be replayed automatically. Before any future approved DEV push, verify that the backup can be extracted to a private path and that the intended original deployment version can be repointed safely by the operator. Never infer rollback success from merely creating a `.tgz` file.

## Hard hold before real Development CRUD

Owner visual Script/Deployment/DB binding facts are all PASS in Issue #189; API attestation remains separately unperformed. The following are not yet approved: source manifest promotion Native26 → Native33, new production-like package deployment to shared Development, real Script Properties reads via a deployed GAS helper, D331 grants and clinical disease/timing policy, synthetic user/event creation, 5-table writing, and browser UI UAT. Do not reuse real patient EventIDs or issue grants as an incidental preflight side effect.

P0-11 is limited to source preparation and offline tests. **PASS does not approve Merge, live `clasp` preflight, any stage push, deployment, feature enablement or clinical/data writes.** The next step is a separately approved and reviewed controlled Development exercise after Native33 manifest promotion and guarded actual deploy+rollback have a verified plan.
