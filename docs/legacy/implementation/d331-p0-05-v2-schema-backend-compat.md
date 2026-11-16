# Smart SRRT Dengue 3-3-1 — P0-05 Schema v2 Backend Compatibility

**Environment:** original shared Development/Testing Smart SRRT Apps Script, Deployment and Google Sheets (Issue #189). No Production configured.

**Baseline:** `main@6164394a2a8e2fef68a011c3be0ae68bfb0ce122`; **scope:** source-only, tests-only. Physical empty 7-tab schema creation was independently completed and header-verified in [Issue #219](https://github.com/9GotStory/smart-srrt/issues/219).

## Objective and change

Previously merged P0-03B read-only candidate checked the parent MainData, UserAccounts, AreaMaster and `D331AccessGrants` headers. Now enforce **all seven physical Dengue v2 header contracts** before the existing read-only adapter can evaluate session/event/grant, without reading any other Dengue data rows.

- `src/dengue/10-p0-05-v2-schema-compat.gs`: pure internal seven-tab header gate. Reuse `d331P002aNames_()` and `d331P002aHeaders_()` as the **single source of truth**, pin v2 and exact tab names/order. Require existing sheets and exact populated header length/order. `getLastColumn()` measures the populated last column, so extra **unused physical grid columns** are not treated as schema drift; unexpected populated trailing header columns are denied.
- `src/dengue/09-p0-03b-dev-readonly-adapter.gs`: replace the single grant-header probe with the seven-tab gate; the same grant sheet is then used as before. No change to patient DTO, grant mutation, or public entrypoints.
- `tests/d331-p0-03b-dev-readonly-adapter.test.mjs`: mock all seven empty tabs and verify missing/reordered/extra/invalid seven-tab headers fail closed before session use, plus positive v2 read-only mock.

## The five focus areas

| Area | Current result |
| --- | --- |
| Database | Existing 7 tabs + 113 exact headers already created and verified; no additional DDL in this PR |
| Backend GS | New internal v2 compatibility gate (seven sheets), reuses existing disabled DEV read-only adapter |
| Frontend UI/UX | No changes; integrating D331 into the same Smart SRRT UI is future work |
| Security | Existing feature flags OFF; no new login, grants, real-user access, policy activation or write paths |
| Testing | Synthetic mocked `SpreadsheetApp` headers and negative cases; CI full regression; no DEV clinical/browser workflow claim |

## Remaining gates

Both `D331_G1A_ENABLED=false` and `D331_P003B_ENABLED_=false` remain unchanged in source. The v2 contract, P0-03B adapter and P0-05 gate are **not registered** in `tools/native-sources.mjs`; this PR does **not** grant them runtime reachability. Even successful offline authorization fixtures return no real patient access. The grant sheet is empty and policy/version, actual Script-Deployment-Property attestation and real grant issuance remain unresolved.

Before registering a real DEV RPC, separately approve explicit binding, disease mapping and timings, user/area/event grant administration, protected session recheck, minimized PHI, safe transactions/idempotency for future write operations, and DEV browser E2E. Do not infer that merged offline helper source can run in the deployed Native code.

**Testing:** `node --test tests/d331-p0-03b-dev-readonly-adapter.test.mjs`, full `npm test`, existing GitHub Actions CI. Merge requires separate Product Owner approval after Independent Review. No spreadsheet reads/writes, runtime registration, deployment, or live patient data work is authorized by this PR.
