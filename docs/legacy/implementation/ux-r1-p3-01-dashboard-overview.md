# UX-R1/P3-01 — Dashboard Overview & Information Hierarchy

**Status:** feature-branch source candidate, NOT MERGED or DEPLOYED.  
**Baseline:** `main@228017ee547eaf6f30bf8e1a06d9ad94b9ba6fd7` (UX-R1/P2-01 Shared Shell merged and post-merge CI passed).  
**Reference:** [UX-R1 plan](../ux/ui-ux-redesign-plan.md), [Design system](../ux/design-system.md), [Screen specifications](../ux/screen-specifications.md).

## Purpose

Start the visually observable Dashboard redesign without conflating new visual structure with changed epidemiological data logic. TEST Web App v11 is still on the prior approved Native 24-file deployed source. This PR does not alter the GAS backend, current Google Charts library, role permissions, source spreadsheet or AI report behavior.

## Changes

- `src/web/02-app-layout.html` — Thai-first Dashboard introduction, structured six-field filter panel, user-triggered Search/Reset/PNG export, KPI section with explanatory definitions, calm Smart Insight panel, chart section labels and four visually unified chart containers. Retain the exact existing IDs, KPI/chart containers, events table, public aggregate privacy notice, actions, and native function callbacks.
- `src/styles/dashboard-ui.css` — standalone authored Dashboard-only design module, scoped under `#page-dashboard`. 1200/980/640/560px layout behavior for KPI grids, filters and charts; no external fonts/icons/scripts added.
- `tools/build-ui-assets.mjs` — deterministic composition `legacy.css → shared-ui.css → dashboard-ui.css → pinned prefixed Tailwind v4 CSS`. The only deployed HTML style output remains `src/web/01-styles.html` and no new GAS partial is introduced.
- `src/web/01-styles.html` — tracked generated CSS updated to byte-match the canonical asset composition.
- `tests/ux-r2-ui-assets.test.mjs` — synthetic checkout copies dashboard CSS before validating build/write/check and no drift.
- `tests/ux-r1-p3-dashboard-overview.test.mjs` — four synthetic tests for unchanged IDs/callbacks, filter label hierarchy, KPI semantics, image capture privacy and Native CSS parity.

## Preserved behavior and explicit non-goals

- Original `captureArea` still encloses **aggregate KPI, insight and charts only**. The protected `eventDetailPanel`, raw `eventBody` and private Excel exports remain outside it. Guest `publicAggregateNotice` behavior and server-side RBAC are unchanged.
- Four KPIs use the existing functions/formulae. “ลงสอบสวนโรคแล้ว” refers to qualified incidents with an investigation date, not a signed-off report.
- Four chart containers (`barChart`, `lineChart`, `pieDisease`, `pieRisk`) retain Google Charts for this first P3 slice; moving to Chart.js is a separate later, behavior-verified slice, including PNG export capture and public-only data validation.
- Authenticated event queue is **not** yet moved before charts: this would change the `captureArea` public/private boundary and must be designed separately rather than silently drawing private rows into Dashboard PNG export.
- No new Backend GS API, Spreadsheet/Drive writes, user-data mutation, interactive table sorting, live data analytics, install/repair/archive, Gemini jobs or deployment.
- Existing One-Click historical artifacts remain frozen.

## Verification

Static build/CI: `npm run build:check`, `npm run build:gas-multifile`, `npm run check:gas-multifile`, `npm run check:contracts`, `npm run release:preflight`, `npm test`. Verify full 24-file Native staging, `codeGate=PASS`, `releaseDecision=HOLD`. Synthetic test success is **not visual/browser UAT**. Real screenshot, Thai font wraps, mobile filters, chart loading/empty states, permissions, 200% zoom, and PNG rendering still require a separately approved TEST UAT.

**Review state:** author-assisted technical review is not an independent visual or security certification. Squash Merge and any TEST deployment need separate Product Owner approvals. Production remains HOLD.
