# D331 N1-C3-S1 — Offline Revocation-to-Readiness Non-Promotion Contract

**Issue:** #209 · **Parent:** #203 · **Source implementation baseline:** `main@73a112cbb004807fef8fbabebc5f609fd7ee8f92`  
**Status:** Proposed Source-only Node VM cross-contract verification. **Never live authorization, Google attestation, permission, rollout or deployment.** Smart SRRT uses its original existing Development/Testing installation; **Production does not exist**. Do not request DEV Script/Deployment/Spreadsheet IDs again: the Product Owner-confirmed references are held in restricted Issue #189, not this document.

## Scope and isolation

Exactly two new files in this slice:

1. `tests/d331-n1c3-s1-readiness-nonpromotion.test.mjs` — Node `node:test` integration suite reads and executes the **actual unmodified** C2C-B script from `src/web/03l-client-d331-status.html` and the **actual unregistered** C3-B function `d331N1c3bEvaluateOffline_` with its original pure dependencies in separate in-memory `vm` contexts. Only synthetic snapshot, mocked DOM and manually resolved promises are used.
2. This document records the test contract, adversarial mapping, evidence limits and Human Gates.

Do **not** edit `src/web`, `src/dengue`, `src/server`, `tools/native-sources.mjs`, native layout, auth hooks, One-Click, production/TEST deploy scripts, CI config, existing tests/docs or source flag. No source registration, auto-run, actual route, DOM mounting, HTTP/RPC, Apps Script, `clasp`, Google API, Spreadsheet, Script Properties, real session, real grant, patient row, PHI, schema apply or storage write.

## Actual interface exercised

- C3-B offline simulated decision: `{simulationOnly:true,decision:'SIMULATED_ALLOW',code:'D331_SYNTHETIC_ONLY'}` or fixed `SIMULATED_DENY`, from the **real implementation**, using an isolated mock 39-column MainData row, 10-column AreaMaster row, synthetic active session, mock policy and one explicit mock grant. The expected `SIMULATED_ALLOW` is intentionally reached at least once; this is **not** a trusted principal/grant provider.
- C2C-B `closedReadiness(reply,requestId,now)` permits exactly five **deny-only** states `OFF`, `AUTH_REQUIRED`, `POLICY_HOLD`, `NO_GRANT` and `ERROR` and exactly five fields `version,requestId,state,issuedAtMs,expiresAtMs`. Its action controllers are **synthetic injected adapters**, never a real backend or a D331 page.
- The test **directly feeds** the actual C3-B decision to the actual C2C-B validator and controller and expects `ERROR`. A simulated adversary trying to convert mock permission into `READY`/`ENABLED` or a response with forged `origin:'server'`, `signed:true`, `role:'Super Admin'`, grant/AreaID/PHI/canRead extras likewise fails closed.
- A **separate** explicitly defined, test-only mapping of an actual C3-B `SIMULATED_DENY` to a synthetic `NO_GRANT` / other valid denial envelope illustrates permissible **display-only denial**, never promotion, issuance, delegation, an RPC or data access. It is not a recommended future live adapter.
- C2C-B's own `readSession()` mock is a callback-invalidation fence, **not current trusted server identity**. All client state is untrusted if reused in a live path. Server authorization must be independently designed and approved before any real endpoint.

## Threat-to-test traceability

| Test case | Cross-contract proof | Out of scope |
| --- | --- | --- |
| S1-01: source boundaries | Native26 status partial registered but unmounted; five current routes, G1-A OFF and C3-B unregistered; mock never auto-requests | A production/release attestation |
| S1-02: direct mock ALLOW | Real C3-B `SIMULATED_ALLOW` is rejected by real C2C-B envelope and async controller; buttons disabled | Cryptographic server provenance |
| S1-03: forged readiness | `READY`, `ENABLED`, `LOADING`, forged `origin`, `signed`, role, area, PHI and extra capability claims cannot promote synthetic success | Real user/grant ownership or public RPC |
| S1-04: deny-only display | Real C3-B `SIMULATED_DENY` can only be displayed as a deliberately constructed status-only denial; fixed buttons remain disabled | Real clinical/no-grant decisions |
| S1-05: revoke/policy drift | Fresh C3-B re-evaluation denies revoked ID or changed policy revision; prior mock ALLOW is invalid as readiness; no cached UI privilege | Grant storage transaction / eventual consistency |
| S1-06: logout invalidation | Real `invalidateSession()` discards late synthetic ALLOW; no repainted success, no action enabled | True server token/session revocation |
| S1-07: identity change | Token, user identity object, role, auth epoch and null principal reject stale async callback | Authentication issuer / device/session binding |
| S1-08: duplicates/replay | Only one request per lease; stale requestId, expiration, excessive TTL, field injection and incorrect version rejected | Cross-device replay or server clock skew |
| S1-09: exception safety | Injected secret-bearing failure does not appear in UI, all buttons disabled | Live logs, storage, audit or PHI redaction |

The tests must call the real `d331N1c3bEvaluateOffline_` in the C3-B script and the real `closedReadiness` / `createOfflineController` from Native26. Merely mocking their return values would **not** satisfy acceptance. The two contexts intentionally do not share any trusted source state. Synthetic success only exercises logic; it never becomes a D331 permission.

## Mandatory negative security boundaries

- A fake `simulationOnly`, `signed:true` or `origin:'server'` field does **not** attest Google, Script/Deployment/DB identity or actual server origin. The readiness envelope itself has no live authenticity proof.
- Even actual valid-looking denial reply data says nothing about current server grant status; the current UI cannot become `READY` or enable any patient read/write control.
- Grant/session/policy/event/area truth must later be derived from approved server sources **at operation time**. Revocation after any readiness display must still deny actual access. Separate grant backing and revoke-forward restore/locking remain undecided.
- All fixture names and codes are synthetic only. Source tests never read #189's private ID values, Google-owned metadata, any real token, Script Properties or patient data. Tests print no full snapshot or sensitive thrown errors.
- The previous native preview Draft PR #197 is **not** a source or release baseline: current canonical Native26 already registers the inert partial. #197 is still a distinct stale Draft PR and cannot be implicitly merged/closed here.
- Running Node CI does not prove real owner/ACL/property, clinical Dengue definition or legitimate per-user AreaID/EventID grant. `SIMULATED_ALLOW` must never be treated as `READY`, `ENABLED`, server-issued readiness or a bearer capability.

## Verification and release gates

**Pre-PR:** approved exact source baseline, two new files absent, current parent #203 and #189 open, branch created from exact source SHA.  
**Candidate review:** verify PR metadata, patch, actual Git trees/blobs, two-added-file scope, tests really evaluate both original contracts, full source CI (contracts, regression and Native26 parity). ChatGPT Independent Review then **separate Product Owner Squash Merge authorization**. Do not auto-merge or close #209 before that authorization and post-merge checks.

**Held:** actual Script property/Deployment attestation at #189 for future live target integration; B2-D01 clinical eligibility and AreaID policy, B2-D02/03/07 revocable grant registry and possible eighth sheet/DDL decision, B2-D08 privacy, C3-D01–D10 real server authority/readiness, PHI reads/writes, request ledger, DEV/TEST deployment, Native Manifest changes, and feature toggle. Keep #189 and #203 **OPEN**. No Production exists.

`D331_G1A_ENABLED=false`; `GOOGLE_API=NOT_PERFORMED`; `LIVE_RPC=OFF`; `DDL=HOLD`; `GRANTS=NONE_APPROVED`; `CLINICAL=HOLD`; `PRIVACY=HOLD`; `DEPLOY=NOT_AUTHORIZED`.
