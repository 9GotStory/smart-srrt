# ADR UX-R2-001 — Frontend Foundation for Smart SRRT (Tailwind CSS v4 / Lucide / Chart.js)

- **Status:** PROPOSED — architecture decision for Product Owner review, **not implementation authority**
- **Date / baseline:** 2026-10-11, `9GotStory/smart-srrt@47417922bb2dc4abb2ee07d41475e4b177aa5723` (`main` after UX-R1 PR #75)
- **Tracking:** [Issue #76](https://github.com/9GotStory/smart-srrt/issues/76)
- **UX authority:** [Redesign plan](../ux/ui-ux-redesign-plan.md), [Design System](../ux/design-system.md), [Screen Specifications](../ux/screen-specifications.md), [UX-R2 test matrix](../ux/ux-r2-test-matrix.md)
- **Governance:** Product Owner uses **ChatGPT Technical Review** (author-assisted, not distinct-author independent review). Merge, implementation, and Apps Script deployment are separately approved gates.

## 1. Decision statement — recommended, not yet implemented

**Recommend a progressive enhancement of the current Google Apps Script HTML Service + vanilla JavaScript UI**, instead of adopting React/Vue or a new runtime backend. In the future implementation:

1. Build Tailwind CSS **v4 offline at development/CI time** into the **existing HTML partial** `src/web/01-styles.html`. Do **not** load Tailwind's Play CDN or rely on a deployed npm runtime.
2. Import only approved Lucide **static SVG assets** into a safe build-time icon manifest and render with controlled, trusted markup (no arbitrary user-supplied icon names/SVG). Preserve existing Font Awesome until each surface passes icon/label tests.
3. Introduce **Chart.js 4** in a separately controlled Dashboard migration, using a bundled/version-pinned browser build whose runtime behavior in Google Apps Script IFRAME has been proven first. Keep Google Charts temporarily as the current production behavior, and preserve `html2canvas` capture and role-gated Excel.
4. Retain **all 13 deployed source file names** and ordered partial expansion: 7 `.gs`, 5 HTML partials, and generated `Index.html`; preserve the existing external `appsscript.json`, script ID, deployment ID/URL and permission scopes. A build step may introduce *authored development files* without adding a new GAS source file.
5. Ship UI changes by small scope: shared shell/components → Dashboard filters/KPIs → one chart at a time → Events → AI Reporter → Admin/Library/Authentication → release gate. Keep role/data/business logic contracts unchanged.

The proposed stack improves consistent responsive design **without** conflating UX rework with a risky framework/backend migration.

## 2. Current, source-verified constraints

| Item | Current source contract | UX-R2 consequence |
| --- | --- | --- |
| Runtime HTML | `src/web/00-document-head.html` loads Prompt, Font Awesome 6.5.2, Google Charts, XLSX 0.18.5, html2canvas 1.4.1 over HTTPS. `01-styles.html` embeds legacy CSS. | Replace styles/icons/charts progressively. Do not remove dependencies before supported replacements pass. |
| Client logic | `02-app-layout.html`, `03-modals.html`, `04-browser-app.html` use `id`, inline handlers, `google.script.run` async, client session guards. | Preserve DOM hooks and request/session race defenses; avoid a wholesale renderer rewrite. |
| Source assembly | `tools/build-one-click.mjs`: exact Buffer.concat of seven server sources and five HTML sources; `tools/build-apps-script-multifile.mjs`: exact 13-file staged candidate and strict legacy parity. | CSS and Chart assets must resolve **before** canonical One-Click concatenation and GAS staging; no post-staging mutation or extra HTML partial without new authorized ADR. |
| Tests and CI | `tests/g30-release-parity.test.mjs`, `tests/g34-multifile-parity.test.mjs` enforce ordering, V8, template expansion and byte equality. GitHub Actions currently run Node 24; `package.json` has **no frontend npm deps/lockfile**. | Add dependency lockfile and explicit deterministic asset check; account for existing G-34 fixture that copies only current build tools/source. Do not break fixture by introducing hidden imports. |
| Auth/privacy | Public Dashboard `getPublicDashboardData` is aggregated; authenticated raw rows require `view`. Staff view/export; Admin create/edit/report; Manager/Super Admin manage additional actions. | Public aggregate PNG capture stays available; raw-event Excel/detail is private. UI gating never replaces server authorization. |
| Events and reporting | 26 form fields, expectedRevision guards, close/void/owner/attachments; G-32 unknown/cancel and G-33 one contextual report action per Event. | UI refactor must not infer successful report creation from an HTTP response or permit duplicate job requests. |

**Important test limitation:** passing Node/GAS package parity verifies *file construction*, not actual HTML Service iframe load, Chart canvas display or export PNG. Runtime preview against synthetic/no-patient data is a separate controlled gate. The deployed @10 app is not to be modified by UX-R2 planning.

## 3. Evaluated approaches and selected option

| Alternative | Pros | Reason for decision |
| --- | --- | --- |
| A — Tailwind Play CDN + global Lucide/Chart CDN | Quick prototype | **REJECT:** Tailwind compilation in browser is unsuitable as a production asset strategy; extra runtime network and version drift. |
| B — React/Vue SPA + GAS API rewrite | Rich component abstraction | **REJECT NOW:** increases API, auth and build complexity, no product requirement for a framework rewrite. |
| C — Build-time Tailwind v4, static SVG subset, pinned Chart.js, same GAS files | Incremental; deterministic; no runtime Tailwind processing | **RECOMMENDED**, conditioned on parity/iframe/size/security smoke gates. |
| D — Keep legacy CSS/Font Awesome/Google Charts permanently | No migration costs | **FALLBACK/ROLLBACK**, not target: cannot deliver consistent new Design System without accumulating fragile overrides. |

### CSS/build ownership choice

**Recommended owner:** authored `src/styles/ux-r2.css` (Tailwind directives/tokens) and an extracted `src/styles/legacy.css` (verbatim old CSS, once) are the inputs to a **deterministic asset builder** (proposed `tools/build-ui-assets.mjs`). Its output is the **tracked generated** `src/web/01-styles.html` with exactly one `<style> ... </style>` wrapper; do not directly edit this generated partial after setup.

- **Phase-2 first commit must demonstrate** that extracting/re-wrapping the *current* CSS produces byte-identical existing `src/web/01-styles.html` **before introducing Tailwind**, or explicitly treat any CSS whitespace diff as an expected reviewed change. Never claim current One-Click parity when compiled bytes changed without rebuilding and checking the tracked `Index_Smart_SRRT_OneClick.html`.
- `--check` mode generates into a temporary/in-memory buffer and **does not write tracked files**; compares expected bytes to committed partial. `--write` updates only the designated generated partial. Stable encoding, LF endings and a fixed CSS order are required; no timestamp/non-reproducible banner.
- Proposed task order: install exact pinned dev deps from `package-lock.json` (once approved), `build-ui-assets --write` → existing One-Click `--write` → existing GAS multifile `--write`; CI checks `build-ui-assets --check` → existing One-Click `--check` → build/check GAS package. Fail with specific drift message; do not auto-repair in CI.
- Update package script orchestration only in a **separately authorized implementation PR**, and update G-30/G-34 fixture tests if the tool dependency graph changes; their exact byte-parity contract must remain enforced.
- **Do not include generated `dist/apps-script/` in GitHub**; it stays a staged, ignored artifact. No need for an additional `.gs` or `.html` file in the deployed project.

### Tailwind v4 CSS compatibility choice

**Recommend an incremental, opt-in namespace** such as `prefix(tw)` (utility usage `tw:flex`, `tw:bg-...`) and **omit Tailwind Preflight reset initially** to protect the 9.7 KB existing stylesheet's control/section/modal layouts. Official v4 supports explicit theme/utilities imports and omitting `preflight.css`. Proposed authored input *concept*:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme) prefix(tw);
@import "tailwindcss/utilities.css" layer(utilities) prefix(tw) source(none);

@source "../web/02-app-layout.html";
@source "../web/03-modals.html";
@source "../web/04-browser-app.html";

@theme {
  --color-srrt-brand: #0f766e;
  --color-srrt-ink: #0f172a;
}
```

**Not copy/paste implementation:** the exact `prefix()`/`source()` directive order, relative path base and emitted CSS cascade must be compiled and tested against the pinned version before adoption. Existing unlayered legacy selectors can override layered utilities: ensure styles migrate by explicit component boundaries/cascade tests, **not** through global `!important` everywhere. The current design-system overview says `@import "tailwindcss"` (full Preflight) as a generic option; this ADR explicitly recommends *Preflight-off during initial compatibility phase*. Run a dedicated regression for date inputs, selects, dialogs, `.btn`, toast, sidebar, report action and reduced-motion before any Preflight reconsideration.

No runtime-composed class fragments such as `bg-\${color}-600`. Map variants to **complete literal** class strings and use `@source inline(...)` only for audited otherwise-undetected utilities. Source paths must exclude generated `Index`, One-Click, `dist/`, `node_modules/`, snapshots and test fixtures to prevent accidental class/bundle growth.

## 4. Library/version pin proposal (verified against registry listing 2026-10-11)

These are **candidate npm version pins for the first approved implementation PR**, not installed dependencies or a current lockfile. Reconfirm registry metadata, Node compatibility, integrity and licenses immediately before `npm ci`.

| Candidate | Suggested exact pin | Role | Boundary |
| --- | --- | --- | --- |
| `tailwindcss` | `4.3.3` | CSS compiler library | Dev/build only |
| `@tailwindcss/cli` | `4.3.3` | Tailwind CLI | Dev/build only; match Tailwind version |
| `lucide-static` | `1.55.0` | Approved SVG subset source | Build-time only; no entire icon pack loaded into browser |
| `chart.js` | `4.5.1` | Four Dashboard chart views | Browser bundle built/pinned, not Play CDN; delayed until chart phase |

**Registry evidence:** [tailwindcss](https://www.npmjs.com/package/tailwindcss), [@tailwindcss/cli](https://www.npmjs.com/package/@tailwindcss/cli), [lucide-static](https://www.npmjs.com/package/lucide-static), [chart.js](https://www.npmjs.com/package/chart.js). Exact dependencies should appear only in separately authorized `package.json` + committed `package-lock.json`, installed with `npm ci` on Node 24 in CI. Run dependency/audit/license and size checks prior to acceptance. If these versions are unavailable/incompatible at the implementation date, return to the Product Owner instead of silently upgrading to `latest`.

**External-doc lookup:** Context7 is named in `AGENTS.md` but a Context7 tool was not available in this planning session. Official vendor docs are linked below; *do not claim that Context7 was consulted*.

## 5. Lucide SVG policy (progressive migration)

- Source approved icon names from `lucide-static`, maintain an explicit allowlist/manifest, include only selected icons during build; no icon font, uncontrolled `innerHTML` from outside the manifest, or remote runtime icon retrieval.
- For dynamically rendered event/report actions, render icons by **trusted key** and pair with *textual button labels*. Decorative icons get `aria-hidden="true"`; icon-only controls require accessible names and keyboard focus. No emoji as functional navigation icons.
- Match current app theme/branding by using `currentColor` and CSS variables, not hardcoded per-page colors. Preserve existing status meaning without using color alone.
- Build verifies requested icon names exist in the pinned set and rejects unknown/invalid SVG. For safety, do not allow arbitrary inline `script`, event handlers, `foreignObject` or external SVG URLs.
- Migrate Font Awesome **per component**, then remove the external stylesheet only once no remaining `fa-*` usage exists in DOM/template code. Add a static guard for last removal.

## 6. Chart.js v4 adapter contract

Do not move chart semantics into new server APIs. Preserve:

| Existing id | Input | Future Chart.js adapter | Observable proof |
| --- | --- | --- | --- |
| `barChart` | Public `byVillage` / signed-in authorized village breakdown | labelled horizontal bar; long Thai place names | Same labels and counts, no extra public drilldown |
| `lineChart` | Public `byMonth` / signed-in month data | line, monthly scale as current categorical month labels (no new date adapter) | Matching order, 0/empty handling |
| `pieDisease` | Public `byDiseaseGroup` / signed-in `col5` | doughnut for few groups; labelled bar fallback for many | Same denominator, no reclassification |
| `pieRisk` | Public `byRisk` / signed-in `col19` | doughnut plus text alternative | Same legend and categories |

**Chart.js load boundary:** bundle a pinned browser distribution (UMD or a browser-safe custom bundle), validate that it executes before `drawCharts` in the current HTML split, and avoid adding a second `<script>` inside `04-browser-app.html` that would break the existing G-34 `split('<script>')[1]` parser test. Do not insert a `</script>` sequence into an inline JS payload without explicitly HTML-safe encoding. The former `google.visualization` global must not be removed before the Chart.js adapter passes. `google.script.run` callbacks, response permissions and stale-request rejection remain as-is.

**Canvas lifecycle:** create chart instances once per container, update or `destroy()` on replacement, `resize()` on change of parent width/visibility, and export only after rendering has settled (prefer deterministic `animation: false` when capturing). A Chart.js canvas needs a correctly sized relatively positioned parent. Provide textual alternative/table and no-data/error caption even when chart cannot render. Avoid purely color-coded risk categories.

**PNG/export contract:** `captureDashboard()` captures `captureArea` using html2canvas (currently public as well as authenticated). Validate PNG includes all rendered canvases and typography at 360/390/768/1440, and never includes private `eventDetailPanel` content for guests. Registered event Excel export remains role-gated. Both `Chart.toBase64Image()` and html2canvas can be useful, but the overall Dashboard composite capture is the existing user-facing contract.

## 7. Implementation slices (future PRs, not started)

| Slice | Proposal | Hard acceptance |
| --- | --- | --- |
| R2-01 | Dependency/asset architecture + reproducible CSS pipeline, **no visual changes** | Fresh `npm ci`, CSS check read-only, One-Click/GAS byte-parity, no unexpected UI changes |
| R2-02 | Shared shell & Lucide opt-in: tokens, nav, button/form/toast/dialog semantics | Public/auth states, keyboard, 360–1440 responsive, no missing old icon |
| R2-03 | Dashboard KPIs, filters, insights and mobile authorised cards | Same KPI/permission/request-race data with mock fixtures |
| R2-04a-d | Four charts one by one, final Google Charts removal only after parity & PNG | Synthetic data equality, Chart.js render/capture, public privacy |
| R2-05 | Event management grouped single form, desktop table/mobile cards | 26 fields, revision/owner/attachment/closed/void invariants |
| R2-06 | AI Reporter job/history/readiness interactions | G-26/G-32/G-33 one contextual action and uncertain state |
| R2-07 | Admin, Library, auth, full modal set & release matrix | Permission and dangerous-action confirmations; regression + controlled release |

Each implementation slice uses **ChatGPT Technical Review on exact head**, disclosing any author-assisted involvement, and an explicit Product Owner **merge** gate; actual GAS deploy is a *different* approval. Current tests may be augmented but not bypassed to conceal regressions.

## 8. Rollback, failure and recovery

- Preserve immutable G-34 @10 deployment as a verified operational reference. **No clasp operation in the ADR.**
- Rollback of a **future** CSS/icon/chart release should restore the previously approved source SHA and rebuilt deterministic 13-file package, then update the known existing deployment *only on explicit approval*. Retain the pre-cutover backup/source provenance; do not auto-repair a live workbook.
- Fallback on Chart.js failure is the current Google Charts implementation until its intentional removal is separately accepted, not silently changing API/KPI semantics.
- In a preflight failure, STOP: preserve log/commit hashes and use targeted corrective PR; do not edit generated output or production source ad hoc.
- Avoid a dependency on Figma availability for the **technical ADR**, but **do not mark high-fidelity visual design or accessibility as complete**. Two Figma desktop frames and the standalone offline prototype remain conceptual WIP.

## 9. Decision gates and next Product Owner action

**This ADR constitutes a recommended engineering baseline only.** To adopt it, first obtain ChatGPT author-assisted technical review of the **documentation PR** and explicit PO approval to Merge; then separately authorize implementation work under Issue #76. Proposed library version pins/CLI details require a **fresh install-and-build compatibility proof** before being treated as supported.

No `npm install`, lockfile, source edit, CI workflow edit, direct Google Script access, deployment, schema migration, report generation, credential use or patient-data processing is authorized or executed by publishing this ADR.

**Official technical references:**
- Tailwind [CLI installation](https://tailwindcss.com/docs/installation/tailwind-cli) · [class detection / `@source`](https://tailwindcss.com/docs/detecting-classes-in-source-files) · [Preflight and opt-out](https://tailwindcss.com/docs/preflight) · [v4 prefixed utilities](https://tailwindcss.com/docs/upgrade-guide)
- Chart.js [script-tag integration](https://www.chartjs.org/docs/latest/getting-started/integration.html) · [responsive](https://www.chartjs.org/docs/latest/configuration/responsive.html) · [API](https://www.chartjs.org/docs/latest/developers/api.html)
- Lucide [static icon package](https://lucide.dev/guide/installation) · [icon index](https://lucide.dev/icons)
- Google [HTML Service best practices](https://developers.google.com/apps-script/guides/html/best-practices) · [IFRAME restrictions](https://developers.google.com/apps-script/guides/html/restrictions)
