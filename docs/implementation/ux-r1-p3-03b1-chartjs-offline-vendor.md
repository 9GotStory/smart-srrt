# UX-R1/P3-03B1 — Pin Chart.js, Reproducible Offline Vendor Artifact

**Status:** implementation candidate in feature branch, **NOT MERGED / NOT DEPLOYED**.  
**Base:** `main@34e4160ccdee344fd605ba91870c287d42ed7357` (UX-R1/P3-03A PR #117 post-merge 453/453 CI).  
**Next:** P3-03B2 renderer/canvas/export migration only after this package/build foundation passes independent release gates.

## Change description

The current TEST Web App v11 and the canonical Native 24-file source continue to use Google Charts for all four Dashboard charts. P3-03B1 **does not switch renderers** and does not insert Chart.js into any deployed HTML source. It introduces a pinned, offline vendor artifact build that can be consumed and independently verified by the later renderer migration.

1. Pin `chart.js@4.5.1` in project dev dependencies (used for **build**, not a runtime npm install), and lock the Chart.js package + its `@kurkle/color@0.3.4` dependency with exact npm package integrity records. The UMD build is licensed under MIT. Do not use runtime jsDelivr, unpkg, CDNJS or package CDN tags for Chart.js.
2. `tools/build-chartjs-offline-asset.mjs` reads the UMD file under the **locked** local `node_modules`, checks the exact version, bounds the source size, rejects a premature HTML close tag, syntax-checks the vendor with `vm.Script`, and wraps it in a deterministic inline HTML `<script>`. Logs the generated artifact's SHA-256.
3. `npm run build:chart-asset` writes only `dist/vendor/chartjs-4.5.1.html`; `npm run check:chart-asset` checks **byte-for-byte parity without writing**. The `dist/vendor` generated directory is gitignored. The installed lockfile is the only external network dependency at build time.
4. Existing GitHub Actions `npm ci --ignore-scripts` CI now performs those write+check steps **before** CSS/Native/contract tests.
5. Four synthetic tests guard npm pin/integrity, stable inline HTML, tamper detection and unchanged Native runtime.

## Critical boundaries

- **No Native 24-file manifest changes**, no changes to `src/web/**` HTML/JS/CSS, no changes to GS server code, no Apps Script push/deployment, no affected old Web App URL or Script ID.
- Existing P3-03A accessible aggregate tables remain available. Public visitors still consume `getPublicDashboardData` aggregate arrays only; current logged-in Dashboard uses its previously authorized rows.
- Bundling to `dist/vendor` is **not a deployment**. P3-03B2 must explicitly place the audited identical bytes in GAS HTML Service in a deterministic order, handle Chart.js `Chart` lifecycle/redraw/resize, map four existing aggregate series into horizontal bar/line/doughnut/doughnut charts, retain zero/loading/error states and data-table parity, and remove Google Charts only after verified acceptance.
- Desktop/mobile + 200% zoom browser UAT and real html2canvas PNG of four completed Chart.js canvases remain **NOT VERIFIED**. If any cannot be demonstrated, retain Google Charts rather than claiming migration complete.
- Frozen One-Click files remain unmodified, production release `HOLD`, TEST Web App remains v11 until separate release authorization.

## Review gates

Require exact PR SHA, scope, reproducible `npm ci` from lock, Chart.js asset Build/Check, Native 24-file parity, 64 contracts, full regression, P6 `codeGate=PASS`, `releaseDecision=HOLD`. CI cannot substitute for visual or real Apps Script HTML IFRAME UAT. Merge and any TEST deployment require separate explicit Product Owner approvals.
