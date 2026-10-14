# UX-R1/P3-03A — Dashboard Chart Accessibility & Chart.js Migration Gate

**Status:** source-only feature-branch candidate — NOT MERGED / NOT DEPLOYED.  
**Exact baseline:** `main@40ad8cbf5c686edbe838de6e9fe15c953a0588ee` (P3-02 PR #116 merged, postmerge CI 448/448).  
**Next planned step:** UX-R1/P3-03B, pinned offline Chart.js 4.5.1 UMD bundled in the canonical Native build with verified screenshot/PNG export.

## Why a two-part migration

The UX-R1 design specifies pinned Chart.js v4, **no runtime CDN for chart assets**, public aggregate-only data for guests, unchanged signed-in KPIs, and a real Chart.js canvas PNG export validation before removal of Google Charts. Chart.js [v4.5.1](https://github.com/chartjs/Chart.js/releases/tag/v4.5.1) has the UMD `dist/chart.umd.min.js` build, but a reliable offline Native bundling/byte-integrity path and a GAS IFRAME screenshot/export acceptance test need to be established before replacing an operational chart renderer. In this focused slice we avoid introducing an unverified runtime chart dependency or claiming Chart.js was deployed.

## What this slice delivers

- Each existing chart (`barChart`, `lineChart`, `pieDisease`, `pieRisk`) now has a keyboard-accessible expandable **data table alternative** in the existing `captureArea`. It uses the **exact same chart aggregation array** already passed to Google Charts. No separate data fetch, raw-row calculation or public-private branch was added to the alternative.
- `renderDashboardChartData(id,arr)` uses only trusted static element names and DOM `textContent` to render text; it does **not** use `innerHTML`, chart labels as HTML, `google.script.run`, or new Event IDs or narratives. The existing chart `draw(id,type,arr,opt)` invokes it before rendering.
- Empty data (header-only / all zero or nonpositive values) is handled as a neutral explanatory message. No artificial category `['-',0]` is sent to the renderer to pretend a sector/column exists.
- Scoped CSS provides visible focus to `<summary>`, bounded scrolling, readable captions, properly labelled row and column headers, and small-screen overflow control.
- The existing deterministic `build-ui-assets` composes the updated authored `src/styles/dashboard-ui.css` into `src/web/01-styles.html` without changing the Native 24-file manifest, Tailwind v4, Google Charts, server-side GAS, Google Apps Script deployment IDs or frozen One-Click.
- Synthetic tests cover the guest-shared aggregate chart series, safe treatment of HTML-like data labels, truthful empty charts, exact DOM IDs, CSS parity and no changes to image capture workflow.

## P3-03B acceptance gate: move to Chart.js only when ready

1. Lock **exact chart.js version and supply-chain integrity** in `package-lock.json`; inspect MIT notices and ensure no network asset fetch occurs in the deployed page.
2. Write reproducible `npm ci` → bundle → `npm run build:check` pipeline with SHA/byte-parity checks for Chart.js UMD; maintain the existing Native file order and 24-source-file structure or explicitly review a new manifest count. Do not alter historical One-Click.
3. Create one chart adapter for current aggregate series. Render horizontal village bars, monthly lines and disease/risk doughnuts; maintain labels, counts, denominators, loading/empty/error states and lifecycle destroy/redraw/resize under session/request guards.
4. Preserve both guest aggregate-only and signed-in derived chart values; never put signed-in raw event data into public responses, HTML source or anonymous chart/table alternatives.
5. Verify html2canvas PNG capture contains **all four completed Chart.js canvases** at desktop and mobile sizes, including pixel-density/IFRAME conditions and after filter reloads; ensure chart animations are stopped/completed before capture. Prove that no private worklist or EventID appears inside `captureArea`.
6. Conduct browser visual/UAT with **synthetic-only** events at 360, 390, 768, 1024 and 1440px and 200% zoom; screen-reader and keyboard review, especially long Thai labels.
7. Retire the Google Charts loader only after the actual four-chart and PNG parity gates pass. No new backend mutations, AI jobs, installer/repair or production deploy.

## Review & release

This PR is **not a Chart.js migration completion**; it makes the four charts legible without relying on graphics alone and prepares a safe boundary for a subsequent renderer PR. Its automated/synthetic checks cannot assert a browser screenshot/real export PASS. The same ChatGPT authors and reviews this branch (author-assisted technical review, not separate-author review). Explicit Product Owner approval is required for Merge and a separate authorization for isolated TEST Apps Script deployment. TEST remains v11; PRODUCTION=HOLD.
