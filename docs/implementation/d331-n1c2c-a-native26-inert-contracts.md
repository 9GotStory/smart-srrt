# D331 N1-C2C-A — Inert Native26 Source and Release Guards

**Issue:** #200 · **Predecessor:** #198/PR #199 (merged) · **Base:** `main@5d84b8334ef64a9d05c6fc97d4892c150c0e8426`
**Authorization:** Source-only implementation and Draft PR. No Production exists. No clasp, Google APIs, migrations, staging against a real target, or deployments.

## What changed
- Native25 becomes **Native26** (8 GS + 17 HTML partials + generated Index). Register only the reviewed inert `src/web/03l-client-d331-status.html` between `03k-client-report-generation.html` and final `04-browser-app.html`.
- Status partial has no auto-mount, route, sidebar button, enabled action, RPC or patient data. The existing `showPage()` five-route allowlist, auth/role boundaries and `D331_G1A_ENABLED=false` remain unchanged. No server adapter/grant or patient access is registered.
- Native build, release inspection, Index template and stage parity update as one change. Preserve both historical frozen One-Click files.
- Guarded operator script accepts trusted historical **13/24/25** backup shapes and exact Native26; checks ordered Index, known G1-A/Status bytes, nonempty source, V8 manifest, no unknown file and authenticated existing Deployment evidence before any source push. Future stage must contain exactly **26 files + preserved remote `appsscript.json`**, with exact ordered Index and nonempty native files.
- Historical N1-C1/C2A/C2B test assertions now assert source-only status registration but no exposed Dengue page/route; C2B inspector remains offline and read-only.

## Independent QA
Run `npm run build:gas-multifile && npm run check:gas-multifile && npm run check:contracts && npm test` on an isolated checkout. Synthetic negative tests reject unknown/missing/empty stage files, Index order/corruption, manifest mismatch, wrong backup layouts, source drift and UI activation. CI and Source Review must PASS at exact PR SHA. Generated `dist/` artifacts are not committed.

## HOLD — not authorized
D331 live readiness RPC, grants/revocation/AreaID authority, clinical disease mapping, PHI read/export/AI transfer, seven provisional physical tables and grant backing, Script Properties/Cloud identity verification, any Google operation, DEV/TEST deploy or nonexistent Production. All require their own security, clinical, privacy, DDL and Product Owner approvals. C2C-B Session/Readiness/UI routing is separate scope. **No Merge without separate exact-SHA approval.**
