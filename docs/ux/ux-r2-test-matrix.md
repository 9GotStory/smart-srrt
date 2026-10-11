# Smart SRRT UX-R2 — Frontend Foundation Acceptance and Test Matrix

> **Status:** PROPOSED; documents verification requirements for **future authorized implementation**. This document does not claim tests were run or authorize changing a live Web App.
> **Baseline:** `main@47417922bb2dc4abb2ee07d41475e4b177aa5723` (UX-R1 docs already merged).
> **Related ADR:** [UX-R2-001](../architecture/ux-r2-frontend-foundation-adr.md) · [Design System](./design-system.md) · [Screen Specifications](./screen-specifications.md) · [Issue #76](https://github.com/9GotStory/smart-srrt/issues/76).

## 1. Scope and evidence labels

Use the following labels without conflating them:

- **DOC PASS:** source/links/scope of a documentation PR verified.
- **BUILD PASS:** local/CI deterministic compiler, existing One-Click and native multi-file build checks pass.
- **SYNTHETIC UX PASS:** a controlled test uses invented records, simulated `google.script.run` callbacks and chosen viewports; it does **not** prove production Apps Script functionality.
- **IFRAME COMPATIBILITY PASS:** separately approved technical sandbox smoke, using a test or synthetic environment. Not production-data UAT or real Gemini.
- **FUNCTIONAL UAT PASS:** only if explicitly approved and performed; not inferred from HTTP 200, tests or screenshots.
- **VISUAL DESIGN APPROVED:** Product Owner approves complete responsive screens/components. Two existing Figma desktop drafts plus offline prototype do not equal this gate.
- **DEPLOY PASS:** separately authorized Apps Script deployment plus exact Version/ID and post-deploy verification. No deployment under UX-R2 planning.

**Owner preference:** Do not introduce an unnecessary mandatory *offline Browser UAT* work item. Synthetic automated DOM/visual regression, unit and integration checks may be used as engineering evidence when implementing; any real browser/UAT against Apps Script remains separately approved. No real health records or real Gemini calls for UI testing.

## 2. Test scenarios by architectural seam

| ID | Gate | Fixture / action | Required result |
| --- | --- | --- | --- |
| B01 | BUILD | Fresh Node 24 `npm ci` from committed lockfile | Installs only exact reviewed dependencies; no lock drift |
| B02 | BUILD | `build-ui-assets --check` on clean branch | Read-only, deterministic, fails if compiled CSS differs from tracked `01-styles.html` |
| B03 | BUILD | `build-ui-assets --write` twice on synthetic checkout | Same SHA-256 bytes, no timestamps/ordering drift |
| B04 | BUILD | Run current `npm run build:check` after agreed CSS pipeline | One-Click HTML exact concatenate parity; fails when generated partial stale |
| B05 | BUILD | `npm run build:gas-multifile` + `npm run check:gas-multifile` | 7 .gs + 5 HTML partials + Index.html only (13 entries), same expansion bytes |
| B06 | BUILD | Existing G-30/G-34 tests and fixtures | Global RPC declarations and GAS V8 evaluation order unchanged |
| B07 | BUILD | Deliberately modify generated CSS/One-Click in temp tree | Check fails instead of auto-repairing/cross-writing |
| B08 | BUILD | Import allowed Tailwind classes and `@source` cases | All static class names emitted, dynamic fragments rejected/mapped |
| B09 | BUILD | Asset size/dependency/license/audit inventory | Evidence collected, approved budget later; no claims from source count alone |
| B10 | BUILD | Verify developer commands have no `clasp push` or installer | No live system mutation from build/test |
| I01 | ASSET | All Lucide manifest names and SVG subset | Known paths only; no external fetch, script, event handler or untrusted SVG |
| I02 | UI | Decorative/functional icons | Decorative `aria-hidden`; action controls have text/accessible name |
| I03 | UI | Old Font Awesome icon removal | Existing icon remains until replacement is visible; remove CDN only after no `fa-*` use |
| C01 | UI | Each four existing chart sources, synthetic public arrays | Same category labels/counts/order, no new data or false categories |
| C02 | UI | Authorized `allData` and public aggregate switched repeatedly | No private dataset re-used for anonymous charts; stale callbacks ignored |
| C03 | UI | Zero/one/many categories, long Thai names and missing data | Suitable bar/line/doughnut, accessible alternative, no phantom area |
| C04 | UI | Resize active and hidden chart, tab/view change | Correct layout, no leaks/duplicate Chart instances |
| C05 | UI | Capture PNG with and without authorized session | All chart canvases visible after render; public captures only aggregate `captureArea` |
| C06 | UI | Excel raw-export controls guest/Staff/Admin | Guest no raw export, authorized roles only according to server rules |
| R01 | UI | 5 pages at 360/390/768/1024/1440 CSS px and 200% zoom | No document-level horizontal overflow; deliberate table-only overflow labelled |
| R02 | UI | Mobile authorized Dashboard/Events/AI Reporter | Incident cards correspond to same filtered records; only one focusable primary action/Event |
| R03 | UI | Long Thai names/rows, keyboard and screen reader | Labels not clipped, table/cards navigable, status is not color-only |
| R04 | UI | `loginModal`, `recordModal`, report dialogs | Focus entry/containment/return; safe Escape/minimize behavior; no accidental job cancel |
| R05 | UI | Loading, empty, error, no-permission, unknown, closed-system | State-specific text and next action; retry never causes duplicate write |
| D01 | DOMAIN | 26 field values + area cascade + deprecated master values | No lost fields, no invented required/validation rules |
| D02 | DOMAIN | Concurrent editing `expectedRevision` mismatch | Reject stale write with safe recovery; no silent overwrite |
| D03 | DOMAIN | Verification, criterion, risk, investigation, lifecycle | Separate semantics, not collapsed into one colored badge |
| D04 | DOMAIN | Report registry already contains records | Main action opens registered history; new version requires explicit confirmation |
| D05 | DOMAIN | G-32 queued/finalizing/cancel/unknown job states | No duplicate active job; uncertainty does not show success or auto-retry |
| D06 | DOMAIN | Admin subsection navigation and dangerous actions | No repair/archive/import on load; explicit operator intent and RBAC |
| P01 | PRIVACY | Anonymous Dashboard | Aggregates only; no `MainData` rows, EventID, owner, attachment or private links |
| P02 | PRIVACY | Logout with pending authenticated RPC | Private rows/cards/canvas/report metadata cleared; old response not painted |
| P03 | PRIVACY | Dashboard public aggregate PNG | Allowed with no private event table or raw Excel attached |
| P04 | PRIVACY | Small public village categories | Avoid adding public event drill-down; unresolved privacy suppression is a separate backend decision |
| G01 | GOVERNANCE | Commit/PR and build metadata | Exact SHA, CI, file diff, scope and author-assisted ChatGPT technical review clearly recorded |
| G02 | GOVERNANCE | Product Owner merge approval | Merge occurs only after explicit authorization |
| G03 | GOVERNANCE | Future Apps Script deployment | Separate explicit approval; preserve existing deployment ID and backup/rollback |

## 3. Exact commands expected **only in future authorized implementation PR**

Current repository commands remain:

```bash
npm run build:check
npm run build:gas-multifile
npm run check:gas-multifile
npm run check:contracts
npm run release:preflight
npm test
```

A future implementation PR should *add*, in reviewed `package.json`, a read-only compiled-asset check such as `npm run check:ui-assets` and a deterministic writer such as `npm run build:ui-assets`, with clear command dependency ordering. Exact script names are proposals; do not treat them as available on current main.

The future CI would include `npm ci`, compiled asset `--check`, existing One-Click parity, deterministic GAS multifile packaging, contract/preflight/unit checks and synthetic UI checks. If requiring a reproducible build in an ephemeral checkout, ensure `src/web/01-styles.html` and committed One-Click artifacts are consistent *before* staging. `--check` must never modify source or emitted snapshots.

## 4. Source-data fixture matrix

| Fixture | Public/authorized | Expected |
| --- | --- | --- |
| No events in date range | Both | Four KPI zeros; no invented risk/disease segment; explanatory empty state |
| Only non-qualifying events | Both | `เข้าเกณฑ์=0`, investigated numerator=0, denominator stated |
| One qualifying event, missing `col26` | Both | Pending qualifying count=1; investigated=0 |
| Qualifying event with `col26` | Both | Investigation numerator increments; this is *not* AI report approval |
| Risk high but verification pending | Authorized and aggregates as allowed | Risk and verification shown separately; no global complete status |
| Previous AI report registered | Authorized report role | Open report/history, never implicit regeneration |
| Report job `unknown` after RPC timeout | Authorized report role | Verification/recovery path, no repeat Gemini call |
| Event `closed` and revision mismatch | Authorized editor | Edit is blocked; stale update rejected |
| Guest after Manager logout | Public | No incident cards, raw Excel controls or private report metadata |
| Village with long Thai name | Both where appropriate | Accessible chart/bar label or full tooltip; no overflow |
| 500+ events/report summaries | Authorized report role | Existing bounded summary batch semantics, no new per-row N+1 network requests |

## 5. Risk register and release thresholds

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Tailwind Preflight resets legacy form/modal defaults | High | Start with Preflight-off/opt-in prefix; compare screenshots and keyboard controls before later reset |
| CSS cascade layers fail to override legacy unlayered selectors | High | Explicit migrated component class boundaries + CSS computed-style regressions |
| Asset builder changes bytes without updating One-Click | High | Single asset owner; strict no-write check; G-30/G-34 parity |
| UMD bundle accidentally contains HTML closing script sequence | High | Scan and encode `</script>` correctly; HTML parse smoke |
| Chart.js canvas missing in html2canvas screenshot | High | Deterministic completion/animation-off capture proof |
| Duplicate DOM action when mobile card + desktop table coexist | High | Visibility/ARIA/focus test at breakpoint boundaries |
| EventID/session/RBAC leakage in UI after logout | Critical | Race guards, public/auth fixture tests; server RPC checks still authoritative |
| Report preflight/unknown status regressions | Critical | Retain G-26/G-32/G-33 tests with new client states |
| Unexpected npm version or bundle-size growth | Medium | Exact locks, audit and measured performance budget at implementation |
| Design not validated across all screens | Medium | Product Owner review before high-fidelity implementation; mark incomplete screens honestly |

No numerical performance thresholds have been approved. **Measure baseline** (HTML/CSS/JS bytes, initial paint, render time and chart memory) against current version first; propose budgets from observed measurements rather than claiming arbitrary PASS.

## 6. Release decision template

```text
UX_R2_IMPLEMENTATION_REVIEW=PASS|REWORK|BLOCKED
REVIEWER=ChatGPT technical review (author-assisted; not independent)
SOURCE_MAIN_BASE=<exact SHA>
CANDIDATE_HEAD=<exact SHA>
UI_ASSETS_CHECK=<status>
ONECLICK_PARITY=<status>
GAS_13_FILE_PARITY=<status>
CONTRACTS_PREFLIGHT_TESTS=<status>
PUBLIC_PRIVATE_UI=<status>
MOBILE_CARDS_AND_KEYBOARD=<status>
CHART_PNG_CAPTURE=<status>
DOCUMENTED_LIMITATIONS=<details>
PO_MERGE_AUTHORITY=REQUIRED
PO_APPS_SCRIPT_DEPLOY_AUTHORITY=REQUIRED_SEPARATELY
```

**For this documentation-only ADR PR**, only Source/Documentation Diff, relative-link audit, exact-head CI and ChatGPT Technical Review are applicable; all implementation/test cells must remain `NOT RUN` or `NOT APPLICABLE`. Do not use the prototype's self-contained CSS/SVG mock success as proof of installed Tailwind v4, Lucide or Chart.js.

## 7. Official references

- [Tailwind CSS v4 CLI](https://tailwindcss.com/docs/installation/tailwind-cli), [source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files), [Preflight](https://tailwindcss.com/docs/preflight)
- [Lucide](https://lucide.dev/guide/installation)
- [Chart.js integration](https://www.chartjs.org/docs/latest/getting-started/integration.html), [responsive](https://www.chartjs.org/docs/latest/configuration/responsive.html), [API](https://www.chartjs.org/docs/latest/developers/api.html)
- [Google Apps Script HTML Service](https://developers.google.com/apps-script/guides/html/best-practices)
