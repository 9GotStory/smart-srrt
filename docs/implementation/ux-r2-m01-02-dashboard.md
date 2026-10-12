# UX-R2-M01-02 — Dashboard Native Modularization

**Status:** source-only implementation candidate, not merged or deployed.
**Base:** `main@94ac315f0c7eab542902000c6c0212cd9c342374` (M01-01, PR #89).
**Review:** ChatGPT Technical Review (author-assisted; not independent).

## Scope and exact code-transfer boundaries

- `src/web/03d-client-dashboard.html`: existing filter cascades, session-gated dashboard loading and request-race guard, KPI and public vs. authenticated aggregate branches, insight functions and Google Charts rendering. Copied from the beginning of prior `04-browser-app.html` through `monthRows()` without editing function bodies.
- `src/web/03e-client-dashboard-export.html`: existing client XLSX export, authenticated server export invocation, and dashboard PNG capture. These function declarations previously appeared immediately before `loadAdmin()`; they now load before the event/report/admin script with no change to the function bodies or invocation signatures.
- `src/web/04-browser-app.html`: retains incident and owner functions, attachments, Report History, AI Reporter Job/Recovery/Unknown-state/Single-action guards and administration, the final **single `boot()` call**, and closing HTML tags.
- `src/web/03b-client-core.html` and `03c-client-auth.html` are unchanged. `tools/native-sources.mjs` includes core → auth → dashboard → dashboard-export → browser. All JavaScript stays in ordered **classic** script tags, sharing one global lexical realm. No ES module, browser bundler or new RPC introduced.

New Native stage: **18 files** = 7 server `.gs` + 10 HTML partials + generated `Index.html`. The deterministic HTML Service include and exact stage-byte contract remain mandatory.

## Browser behavior preserved

- Guests call only `getPublicDashboardData` and consume server aggregates. In guest mode `allData=[]` and no private Event rows are rendered. The authenticated branch calls `getDashboardData` with token and filters. Old response callbacks are ignored across filter, logout, and login changes.
- `dashboardLoadRequest` remains a single shared lexical binding; the logout flow in `03c-client-auth.html` invalidates it as before.
- KPI qualifying-case denominator, investigation-date handling, missing-data messaging and field/area cascades are unchanged.
- Four Google Charts visualizations and their input data are unchanged. **The planned Google Charts → Chart.js change is a separate future UX-R2-04a–d approval, not part of M01-02.**
- XLSX export retains explicit guest guard; server export relies on existing authenticated backend contract; screenshot uses existing html2canvas.
- The shared `villageLabel` / `locationLabel` helpers move with the Dashboard while Event rendering retains cross-partial access to the same functions.
- G26/G32/G33 reporter logic, schema v7, EventID/Revision, RBAC, ownership and attachments are untouched.

## Test/contract updates

Existing G-32/G-33 report harnesses now delimit reporter code at the **unchanged start of `loadAdmin()`**, rather than at an exporter that moved into its dedicated partial. The manifest-derived test-only `nativeBrowser` view now includes **all client partials from `03b-client-core` onward**, so subsequent Native extractions cannot silently disappear from legacy source-level tests. The native release inspector and operator-only staged-file allowlist require both new partials. G-30/G-34/dashboard tests assert the new 18-file/10-partial layout and ordered template includes. A new synthetic VM test covers shared global bindings, public aggregates versus authenticated rows, Google Charts, guest-blocked XLSX export and single final bootstrap.

Review acceptance:
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

Offline CI/code PASS is not an Apps Script HTML Service/Browser UAT pass or production release approval. P6 `releaseDecision=HOLD` remains binding. Frozen One-Click blobs and production Web App @10 remain unchanged. `tools/deploy-g34-clasp.sh` allowlist is edited **as static source only**; the script, `clasp`, migrations, installer, Workspace and Gemini calls are not executed. Product Owner must approve any merge separately; merge still does not authorize deployment.
