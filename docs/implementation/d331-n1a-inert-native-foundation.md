# D331-N1-A — Inert Native Foundation Registration (SOURCE ONLY)

**Baseline:** `main@cc38d9cc1cfe2e2805faea60cf9963e64a5bc308`  
**Parent:** [D331-N1 Issue #178](https://github.com/9GotStory/smart-srrt/issues/178)  
**Approval scope:** Source-only PR candidate, not Merge or Google Apps Script deployment.

## Implementation
1. Register **only** `src/dengue/00-g1a-foundation.gs` after the existing 7 GS modules in `tools/native-sources.mjs`. This produces **8 GS + 16 HTML partials + generated Index = 25 Native source files**, vs prior Native24. Existing G1-A code remains pure with `D331_G1A_ENABLED=false`, no deployed Dengue RPCs, no SpreadsheetApp/DriveApp/PropertiesService/LockService/ScriptApp/UrlFetchApp references.
2. `src/dengue/01-g1b1-readonly-adapter.gs` and `src/dengue/02-g1b2-1-offline-migration-planner.gs` remain **outside** Native. N1-A **does not** deploy the migration planner or enable row/cell access.
3. Align `tools/deploy-g34-clasp.sh` staged exact file allowlist and GS file push order to Native25, while preserving the known Native24 remote backup gate. Add a separate exact Native25 backup guard (V8, known file list, Index include order, entrypoints and **byte-exact G1-A match to the pinned/clean approved-main source**). This replaces bypassable feature/service regex heuristics: any Native25 G1-A source drift fails closed, including later feature reassignment or bracket-style Google API use. Historic Native24 remains allowed as a distinct known backup layout. Legitimate prior Native25 with different bytes must receive an explicit reviewed compatibility gate before future deployment. This is only a static source change; the script is **not executed against Google** and still requires exact source SHA, backups, existing deployment and explicit separate deploy confirmation.
4. Update pre-existing contract tests for new Native source count and add fixture tests rejecting unsafe Native25 backups, missing D331 file, rogue file, wrong V8, and altered feature flag.
5. Unchanged: `CONFIG.SCHEMA_VERSION='7'`, `MainData` 39-column layout, EventID/Revision/Owner, Auth, RBAC, UI, Gemini, ReportRegistry, Scripts Properties, Google Docs/Drive, actual Sheets, existing TEST v17, Production.

## Exact pending gates
- **N1-A Draft PR:** source + CI + independent review on exact SHA. Do **NOT** merge until separate Product Owner authorization.
- **N1-B:** trusted D331 capability, authoritative disease/AreaID/owner lookup, strict Event FK and child revision; generic `view` is not an adequate PII permission. Later separate Source-only PR.
- **N1-C:** new Dengue UI in existing Sidebar, default hidden/disabled and requires verified server capability, loading/session/unknown-state guards; later separate Source-only PR.
- **N1-D:** signed physical DDL for seven tables, not G1-A provisional 7-table header sketches; later design/review.
- **N1-E:** confirm the **existing DEV** Spreadsheet/Script identity, permissions, backup, synthetic-only test footprint, no unintended Production binding, then separately authorize any live read / schema apply. Do not call `getDb_()` (writes property on fallback), `ensureSheet_()` (can create/modify sheets), or installer during read-only preflight.
- **N1-F:** any guarded TEST deployment, browser UAT, clinical/privacy enablement and eventual Production require distinct approvals. No source merge automatically deploys.

## Required verification
```bash
npm ci --ignore-scripts
npm run build
npm run check:contracts
npm test
npm run build:check
npm run release:preflight
```

The offline P6 release gate must still return **HOLD**, regardless of all code checks passing. Existing One-Click root files are frozen and untouched.

## No-action attestation
No `clasp`, Apps Script `push`, `pull` or `update-deployment`; no Google Sheets/Drive/Workspace read/write; no backup/restore, migration, schema creation, Script Property change, user/PHI read, Gemini call, TEST deploy or Production deploy. A GitHub Actions green status only proves tested source and packaging, not that the corresponding code is currently running on TEST.
