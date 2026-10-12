# UX-R2-M01-05 — Final Native Multi-file Stabilization

**Status:** source-only stabilization candidate; **not merged, not deployed**.  
**Approved starting point:** `main@0f7ee1b094fa39a7261692eafd313b8ec7df3f81` (M01-04 PR #92; post-merge 374/374 regressions).  
**Independent-review caveat:** author and reviewer are the same ChatGPT; this is an author-assisted technical review.

## Architecture checked (immutable runtime baseline)

Native Apps Script stage contains **24 files**: seven server `.gs`, sixteen HTML partials and one generated `Index.html`. Its HTML Service include order is canonical in `tools/native-sources.mjs`. The generated index has exact ordered include directives and no extra bytes. The module responsibilities are:

| Native HTML source | Responsibility |
| --- | --- |
| `00-document-head` → `03-modals` | Document shell, CSS, layout and modal markup |
| `03a-dashboard-mobile` | Mobile dashboard progressive enhancement |
| `03b-client-core` | Shared client state, transport, escaping, roles and form metadata |
| `03c-client-auth` | Login, logout, authentication UI and boot definition |
| `03d-client-dashboard` | Public aggregates, authenticated filtered records, KPI, Google Charts |
| `03e-client-dashboard-export` | XLSX, server export and dashboard image capture |
| `03f-client-event-controls` | Event lifecycle badges, owner and attachment operations |
| `03g-client-event-history` | G-27 authenticated report history and regeneration consent |
| `03h-client-event-records` | Event tables/forms, EventID + Revision edits, close/reopen/void |
| `03i-client-report-actions` | Registry summaries, readiness, button and first-generation preflight |
| `03j-client-report-job` | G-32/G-33 Job status, polling, cancellation, recovery and run dispatch |
| `03k-client-report-generation` | Readiness verification, create/run dispatch and warning continuation |
| `04-browser-app` | Admin/Library and the only final `boot()`, followed by closing HTML tags |

The script bodies are classic `<script>` (not `type="module"`) in one shared global lexical environment. **Do not reorder imports by alphabetical sorting or move `boot()`**: Event and Reporter scripts depend on their prior global bindings. Older One-Click output is historical and frozen; never regenerate it as part of Native maintenance.

## M01-05 changes (read-only checks; no runtime implementation edits)

- New `tests/ux-r2-m01-final-stabilization.test.mjs` makes the **approved exact Native client order** and 24-file architecture an explicit contract.
- Runs all client JavaScript in a shared VM (omitting only the terminal network-starting `boot()`) and checks that initialization is **network-free** and expected global functions/inline HTML handlers resolve.
- Asserts **one bootstrap call**, **one copy of each critical report/session fence**, and **exactly one characterized legacy global duplicate** (`fileToBase64` from `03f` and `04`).
- Characterizes unchanged **guest rejection**, summary-based first-generation eligibility, registered-report history precedence, unknown-state fail-closed behavior and create-in-flight lock without contacting Google services.
- Negative fixtures intentionally reorder Reporter partials, insert another boot, add a colliding function and reference an unknown HTML callback; each must fail. This is a test of the gate itself, not a production mutation.
- `package.json` wires this test into `npm run check:contracts`, so both contract and full regression workflows execute the gate. Canonical runtime HTML/CSS/GS and the deployment script are **unchanged**.

## Release and security invariants

- **Guest/public:** only aggregates; no private event rows or report creation without login.
- **Event writes:** preserve RBAC, EventID/Revision, ownership and immutable audit semantics.
- **AI Reporter:** preserve G-26/G-27/G-32/G-33 registry/source-revision, single-action, explicit regeneration, no silent duplicate, cancellation and unknown-state fail-closed, session/logout fences.
- **Server:** schema v7, Script properties, Gemini/API invocation, report registration, audit and attachment behavior unchanged.
- **Artifacts:** frozen One-Click `.gs`/`.html` Git blobs unchanged; production Apps Script `@10` remains untouched. No `clasp`, installer, migration, Apps Script API, Workspace or Gemini mutation.

### Required validation

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

CI must pass the **exact PR head SHA**, Native staged bytes, all contract/regression tests and P6 `codeGate=PASS` with intentional `releaseDecision=HOLD`. Author-assisted code/source review is not actual Apps Script HTML Service/browser UAT. **Merge requires a separate Product Owner approval. Merge does not authorize any Apps Script deployment.**

### Non-blocking future maintenance (NOT part of M01-05)

The two preexisting `fileToBase64` top-level function declarations currently share the same lexical realm, and the later `04` definition overrides the earlier one. The test freezes this behavior until a *separately scoped, behavior-characterized cleanup* is authorized. Further changes to charts, UI, and deployment must be handled under their own gates. After approved Merge and Post-Merge CI, M01-00 through M01-05 can be marked **source-modularization complete**; production remains unmodified until an explicit deployment decision.
