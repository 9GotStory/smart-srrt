# UX-R2-03B — Native Release Contracts and Regression Migration

**Status:** implementation candidate (PR pending, not deployed).  
**Base:** `main@60f6eca0300341879d227b25121cdb31af351439` · [Issue #86](https://github.com/9GotStory/smart-srrt/issues/86)  
**Authoritative deployment source:** `tools/native-sources.mjs` (7 .gs modules + 6 HTML partials + generated Index.html = 14 files).

## Why this migration is necessary

Native Multi-file has been canonical since R2-03, but older G-30/P6 and behavioral regression tests still read frozen One-Click files. When future Native components change, tests must evaluate the **actual Native release**, otherwise a stale archive may pass despite a regression in production-candidate source. The two original One-Click files remain historical evidence and **must never be rewritten to satisfy a test**.

## New read-only workflow

```text
src/server/00..06*.gs (7)  ─┐
src/web/*.html (6) ─────────┤→ tools/native-sources.mjs (ordered manifest)
                            └→ dist/apps-script/ (14 files, ignored)
                                   │
                 tools/native-release-inspection.mjs
                   ├─ source paths, expected names and Index include template
                   ├─ staged bytes and extra/missing file rejection
                   ├─ ordered server + expanded HTML source for G-30/P6
                   └─ per-file SHA-256 evidence → P6 offline preflight (HOLD)
```

**Implementation invariants:** no One-Click import in the current Native builder/G-30/P6; no `clasp`, network, workbook, installer, Gemini or live Apps Script invocation. A Native stage is created intentionally by `build:gas-multifile`; all subsequent `--check`, P6 and Node tests are **read-only**.

### Verification commands

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check:ui-assets
npm run build:gas-multifile
npm run build:check
npm run check:gas-multifile
npm run check:contracts
npm run release:preflight
npm test
```

The order matters: P6 and G-30 verify an **already staged** Native candidate and therefore *fail closed* when `dist/apps-script/` is missing, stale or has an extra file. They must never repair it automatically. `npm run build` continues to produce native assets and does not write One-Click.

### What changed

| Layer | New behavior |
| --- | --- |
| `tools/native-release-inspection.mjs` | Single, pure read-only Native source/stage inspector; validates 14 expected files, Index include ordering/trust, HTML completeness, staged bytes and SHA-256 |
| `tests/g30-release-parity.test.mjs` | Tests current Native source, browser script parsing, server RPC declarations, unique functions, schema/report contract and negative Native-only drift fixtures |
| `tools/p6-release-preflight.mjs` | Produces metadata for all 14 staged files, independently verifies Native manifest and byte integrity, then performs the same migration-lock, schema v7, installer-write, public privacy, report history/readiness/generation, orphan compensation and human HOLD checks |
| `tests/p6-release-preflight.test.mjs` | Exercises missing/changed Native stage and source, dangerous migration floor/report-permission regressions even when staged bytes match, CLI read-only mode and non-secret report |
| G-34 Native tests | Removes equality between *current* Native server modules and an archived One-Click file; keeps source ordering, V8 initialization, 14-file staging, template integrity and drift failures |
| `tests/helpers/native-current.mjs` + existing regression tests | Test suites for current Event, attachments, RBAC, KPI, AI, P4 governance, lifecycle, integration and shared UI now use canonical ordered Native source instead of archived One-Click |
| `tests/legacy-one-click-freeze.test.mjs` | Preserves Git **blob** identifiers of both archived files as a dedicated historical integrity test, not a release/current-source assertion |

**Immutable Git blobs:**

- `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` → `e762751ff5da5813f7c64c104b67d545378f1608`
- `Index_Smart_SRRT_OneClick.html` → `ba4e0aeb5fdb0b1434320c351f32ed877a96d51d`

A SHA-1 Git blob identity is checked over the original exact archived bytes, not against the latest Native output. Any future feature change that alters original server/HTML partials must **not** alter these archive blobs.

## Guarded clasp deployment remains operator-only

`tools/deploy-g34-clasp.sh` is **not invoked** by this PR. Its security contract remains: exact owner-approved `main` SHA, clean checkout, distinct existing Script/Deployment IDs, V8, operator-only clasp 3.x, remote backup/pull/manifest checks, 14-file stage allowlist, current deployment ID check, explicit separate `--deploy` confirmation and never creating a new deployment ID. Tests may inspect this script statically but must not call Google APIs.

## Release/UAT limitations and authorization

- **PASS in GitHub CI** means only source, staged bytes, synthetic tests and local read-only controls; **not** live Apps Script HTML Service, all-user-roles UAT, Google Docs/Gemini behavior, visual approval or a production release.
- Existing Apps Script Web App **@10 remains unchanged**. GitHub Merge and future production Deployment are **two separate Product Owner approvals**.
- AI investigative drafts still require human review; no real records or generation used for this migration.
- Review method: **ChatGPT Technical Review, author-assisted (not an independent second-author signoff)**.
