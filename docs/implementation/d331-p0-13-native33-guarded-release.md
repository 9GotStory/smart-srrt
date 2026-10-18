# Smart SRRT D331 — P0-13 Isolated Native33 Release Candidate and Guarded Development Release

**Date:** 18 October 2026. **Source baseline:** `main@51f2465b226d83d23a8c44f3c9eaa3b6474a046e`. **Original existing Development-only Script, Deployment and Spreadsheet:** restricted [Issue #189](https://github.com/9GotStory/smart-srrt/issues/189). Production **not configured**.

## Design decision from full-system regression

P0-13 initially trialed immediate promotion of the canonical `tools/native-sources.mjs` from 8 to 15 registered GS modules. The existing Native26 full regression includes explicit original 8-server-file assertions, historical Native24/25/26 backup preflight assertions and independently reviewed no-registration security contracts. The change would invalidate many tests and the original guarded deployment layout. **Rather than weakening those controls or deploying over the original app accidentally, the reviewed solution intentionally keeps the canonical Native26 manifest untouched.**

P0-13 prepares a **separate, exact Native33 release manifest**, reusing P0-10/P0-11 verified 15-file order. This is preparation for a separately approved Native33 cutover and does **not** itself register D331 in the current Web App.

## Five workstreams

| Workstream | P0-13 evidence / explicit hold |
| --- | --- |
| Database | Existing Development spreadsheet, 17 tabs, 7 Dengue v2 tabs/113 headers; **no table or patient row changes** |
| Backend (GS) | Private Native33 candidate: 15 GS, 17 HTML partials plus Index. Separate ordered file push contract, unchanged Native26 canonical runtime. D331 G1A/P003B/P007 flags OFF, v2 contract DRAFT_ONLY |
| Frontend | Original Smart SRRT five-page UI + inert Dengue status partial retained; no new D331 navigation, browser RPC, or enablement |
| Security | Existing Script/Deployment/DB binding visually verified by owner, read-only P0-12 preflight PASS. Release/rollback modes require explicit, separate, SHA-bound operator approvals; local source/backup SHA256, original manifest byte equality, remote drift detection before push |
| Testing | Full Native26 regression retained; new synthetic Native33 stage, corrupt package, archive, Script ID, Deployment ID, approval-negative tests. No live Google writes in CI |

## Artifacts

- `tools/d331-p0-13-release-gates.mjs`: exports explicit immutable 15-server-file order, checks exact **33 source file candidate** produced from current Native26 + seven pre-reviewed D331 dependencies, and checks a **private, original P0-11 remote backup/stage** against the *same SHA*, Script ID and existing Deployment ID. Validates local stage, exact original `appsscript.json`, `file-push-order.json`, `.clasp.json`, original remote Native24/25/26 whitelist, deployment/version inventories and local archive SHA256. Read-only.
- `tools/deploy-d331-p011-preflight.sh`: existing read-only preflight is extended to write the source SHA to a private `source-sha.txt` evidence file and include it in the local rollback archive before checksum/extraction drill. Older P0-12 evidence remains valid historically but is **not** accepted as a P0-13 deployment package.
- `tools/deploy-d331-p013.sh`: **operator-only** script with three explicit actions: `--verify` (local evidence only), `--deploy` (separately approved whole-project push followed by update of the **existing** Web App deployment), `--rollback-version` (separately approved repoint to the **previous immutable deployment version**, not a live source or Google Sheet restore). The script cannot create a new Script, Deployment or Spreadsheet. Both mutating modes are blocked without separate SHA-equal approvals, exact prior version, and a verified private backup.
- `tests/d331-p0-13-guarded-release.test.mjs`: synthetic read-only package validation, corrupt archives, wrong bindings, damaged stage and negative human gates.

**Important:** Google clasp v3 `push` replaces the entire Apps Script project content, not only seven newly added files. Native33 must therefore include original Smart SRRT files plus D331 files and **the original preserved Apps Script manifest**; a partial push would be unsafe. The official clasp 3.x README describes `update-deployment <deploymentId> --versionNumber <version>` for restoring a prior deployment version: https://github.com/google/clasp/blob/master/README.md .

## Operator execution policy — none of these commands are approved in this PR

**Prerequisites**: Source-only PR must pass CI/Independent Review/Merge, and operator must run fresh P0-11 `--preflight` against the exact approved *new main SHA* on original Fedora authenticated clasp v3 account to obtain a new private backup directory with `source-sha.txt`. Never reuse the P0-12 archive from the previous SHA as a release snapshot. Record original version number from the same existing Web App deployment using **Deploy → Manage deployments**, not by guessing or selecting the highest version.

The local-only P0-13 validation command, if separately approved:

```bash
# Use original restricted identifiers already known, never copy to GitHub.
export SMART_SRRT_APPROVED_SOURCE_SHA='<separately approved exact merged commit SHA>'
export SMART_SRRT_P013_PRIVATE_BACKUP_DIR='<new private P0-11 snapshot on Fedora>'
SMART_SRRT_P013_READONLY_APPROVED=YES \
  bash tools/deploy-d331-p013.sh --verify
```

A **future, independently authorized** Development deployment needs **both** `SMART_SRRT_P013_DEV_DEPLOY_APPROVED_SHA` equal to the checked exact main SHA and `SMART_SRRT_P013_PRIOR_VERSION_REVIEWED=YES` plus `SMART_SRRT_P013_PRIOR_DEPLOYMENT_VERSION` exact positive version, *before* `--deploy`. Operator-only secrets/IDs must remain outside GitHub. It also reads fresh remote source/deployment/version metadata and denies any drift from the reviewed private backup before `clasp push`. Once `push` starts, Apps Script mutable HEAD can change, so interrupted operations must **stop for manual reconciliation**; the tool does not blindly retry or claim atomic rollout.

A separate `--rollback-version` requires `SMART_SRRT_P013_DEV_ROLLBACK_APPROVED_SHA` equal to the reviewed main SHA, the same verified original version, and separate Product Owner authorization. It repoints the **existing Web App** only, and only if the current deployment inventory matches the sealed post-deployment inventory (otherwise HOLD for manual reconciliation). It **does not restore mutable HEAD**, restore patient data, or assert application-level success without a new browser UAT. The local archive extraction drill is not proof of remote recovery.

## Outstanding runtime/test blockers

Native33 candidate code may be syntactically loadable and source compatible; **it has not been deployed to Google Apps Script**. The seven D331 backend modules and the preflight helper remain *unregistered in current Native26*. Tests do not prove Session, real D331 grant, case/plan/action/survey/followup writes or HTTP/browser UI. D331 v2 remains `DRAFT_ONLY`, clinical 3-3-1 definitions and approved dengue disease allowlist are not final. There is no authorized synthetic user/event/grant for live writes. Keep all flags OFF and do not borrow real patient data. A future staged, separately authorized deployment can install **inert code first** and verify the original Smart SRRT UI/login before any independent synthetic CRUD activation proposal.

**Gate at PR #228:** Source-only Merge consideration only; no remote `clasp` execution, deployment, grant issuance, D331 activation or real Google Sheet writes are approved by this development work.
