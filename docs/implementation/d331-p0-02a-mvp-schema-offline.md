# P0-02A — Offline MVP Schema Contract (DRAFT)

**Baseline:** `main@80ddbb6cd3c93e42b0348e6357f60428d9ae1308` · **Scope:** source-only, synthetic-only, no new physical Google Sheets, no runtime registration, no PR merge or deployment authorization.

Candidate v2: 6 domain tables + separate Option A authorization table; `DengueContainers` deferred to P1. Field names, types and requiredness transcribed from the P0-02 Field-by-Field Schema Review of 17 October 2026.

| Proposed tab | Ordered headers |
| --- | ---: |
| `DengueCases` | 16 |
| `DenguePlans` | 15 |
| `DengueControlActions` | 18 |
| `DengueEntomology` | 16 |
| `DengueFollowups` | 16 |
| `DengueRequestLedger` | 10 |
| `D331AccessGrants` | 22 |
| **Total** | **113** |

Only `src/dengue/07-p0-02a-mvp-schema-contract.gs` owns proposed 113 field triples. It is **unregistered**, has only underscore-suffixed pure functions, and exposes no publicly callable Google Apps Script RPC. It is NOT approved production schema or an installer. Native `D331_G1A_ENABLED=false`, its separate provisional 7-domain schema v1, global MainData schema v7, manifests and UI remain unchanged.

`d331P002aInspect_` takes only offline metadata; it returns `HOLD`, `canApply=false`, `canEnable=false`, `inspectedDataRows=false` even for matching headers. `d331P002aValidateSyntheticRow_` checks scalar shapes and limited lifecycle dependencies but **not** authoritative parent/FK, real grant authority, disease eligibility, clinician-approved clock, real row security, lock/ledger commit proof or migration safety. Enum vocabularies including RevocationReasonCode are provisional testing candidates, not adopted policy. `DengueRequestLedger.UpdatedAtUTC` vs G1-A `UpdatedAt` is an explicit unresolved breaking schema difference.

**Later distinct gates:** validate 113 fields with Product/Data/Clinical/Privacy/Security owners; verify existing DEV binding privately under #189; independent DDL + backup/rollback approval; trusted Server Auth/Event/Area read/write; clinical 3-3-1 time policy; Development browser E2E; Independent SHA/diff/CI and separate merge/deploy authority.

Tests: `node --test tests/d331-p0-02a-mvp-schema-contract.test.mjs`, then `npm test`. No PHI/IDs/secrets appear in fixtures.
