# UX-R2-M01-04 — AI Reporter Native Modularization

**Status:** Unmerged candidate source only. No Apps Script deployment or production mutation.  
**Authority:** `main@83fc3de669774f5d0d7cfb33bc1ceb650184f35f` following M01-03 PR #91 post-merge PASS.  
**Review:** ChatGPT Technical Review (author-assisted; not independent).  

## Exact contiguous source transfer

The original Reporter JS prefix of `src/web/04-browser-app.html` moves **without modifying any business function, global state declaration, or guard**, into three new ordered classic-script partials:

1. `src/web/03i-client-report-actions.html` — Report readiness dialog, the report state/summary registry, batched summary fetch, per-Event button state, existing-report preflight, user actions and button refresh. Preserves session/race guards and "history/verify" precedence under unknown state.
2. `src/web/03j-client-report-job.html` — Job terminal-state classification, status labels, progress modal, polling, cancel/confirm requests, recovery and retry, `runReportJobClient`. Preserves G-32/G-33 cancel/unknown/session fencing.
3. `src/web/03k-client-report-generation.html` — `executeReport`, `makeReport`, AI readiness and warning continuation. Preserves explicit regeneration consent and the sole authorized job create/run flow.
4. `src/web/04-browser-app.html` — Admin settings, users, areas, master data, content, audit, Library, final single `boot()`, `</script></body></html>`. Its original duplicated `fileToBase64` function remains untouched.

All code remains **classic** `<script>` in `Google Apps Script HTML Service`. The runtime global lexical environment is shared across partials; **no ES modules**, dynamic loading, or changed `google.script.run` contracts are introduced. Reconstructing the original JS source by concatenating the three extracted function blocks followed by remaining 04 at original positions must be exactly **44,779 bytes**, byte-for-byte identical to the prior source.

Native stage: **24 files = 7 server `.gs` + 16 HTML partials + 1 generated Index.html**. Manifest order is core/auth/dashboard/export/event owner/history/records/**report actions → job → generation**/final Admin/bootstrap. The operator-only `tools/deploy-g34-clasp.sh` allowlist is **static source updated only; it MUST NOT execute in this PR**.

## Safety contracts and regression

- Preserve Report Registry schema v7 and canonical 11 columns, EventID/Revision, verified Event ownership and case criteria, RBAC, guest aggregate-only privacy, and existing Event attachments/history.
- Preserve G-26/G-32/G-33 one report action, existing-report preflight, safe URL policy, private job state, pending in-flight lock, warning/confirmation, cancel_requested/finalizing/unknown handling, no silent duplicate creation, logout/login stale-completion suppression, and cross-session guards on polling/dispatch and `finally` clean-up.
- Legacy G-32 and G-33 source harnesses must consume **`nativeClientSource`** (manifest-derived **JavaScript only**) instead of slicing HTML with `</script><script>` seams. Do **not** weaken behavioral assertions or remove tests.
- Update G30/G34 Native release gates, P6 indirectly via manifest, order inspector, stage allowlist, and docs; new synthetic VM tests validate global variable access, guest report denial, unknown-state/duplicate protection, exact order and one late `boot()`.
- No changes to `src/server/**`, One-Click artifacts, `appsscript.json`, data/schema migrations, Chart.js scope, auth policy, AWS/Cloud configuration, live Gemini or deployment.

## Verification required at exact HEAD

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

Read-only P6: `codeGate=PASS`, `releaseDecision=HOLD` expected. CI passing verifies synthetic/contract source behavior, **not** real HTML Service/browser UAT. A separate Product Owner approval is required for Merge; merging does not authorize clasp/App Script @10 deployment. No installer, migration, clasp, live Google Workspace, model requests, or production mutations are permitted.

### Next scope

M01-05 final stabilization/hygiene and cross-file review, only after a separate owner direction. Keep any known `fileToBase64` duplicate behavior characterized and unchanged until an explicitly authorized cleanup with dedicated tests.
