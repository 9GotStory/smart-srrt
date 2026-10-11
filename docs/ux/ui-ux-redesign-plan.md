# Smart SRRT — UX-R1 Whole-System UI/UX Redesign Plan

> **Status:** PROPOSED / PLANNING ONLY — requires Independent Review and Product Owner acceptance before implementation.
> **Repository/source baseline:** `9GotStory/smart-srrt` at `main@1c5e9e2bf0dbb04e6d82fff049d5b4a5123c74bf` (11 October 2026).
> **Runtime evidence at planning time:** Operator-confirmed Apps Script Native Multi-file, existing Web App deployment version @10, 7 server `.gs` + 5 HTML partials + `Index.html`; HTTP 200. **Not** a full authenticated functional UAT result.
> **Authority:** `AGENTS.md`, `README.md`, `docs/features.md`, current `src/web/*`, current `src/server/*`, current `tests/*`.
> **Companion specifications:** [Design system](./design-system.md) · [Screen specifications](./screen-specifications.md).

## 1. Product objective and non-goals

Upgrade the entire Smart SRRT user experience into a coherent, modern, Thai-first epidemiological surveillance interface. Prioritize comprehension, data quality, faster event entry/review, accessible operational feedback, safe AI-report actions, and mobile/tablet usability. The project is **not** merely a reskin: information architecture, content language, responsive behavior, empty/loading/error states, navigation and interaction design are in scope.

**Approved direction for planning (not yet code authority):** Tailwind CSS **v4**, **Lucide-style SVG icons**, and **Chart.js 4.x**, with existing vanilla JavaScript / `google.script.run` and Google Apps Script HTML Service retained. Keep build-time assets deterministic, pinned, reproducible and compatible with the existing Apps Script iframe; no runtime Tailwind Play CDN.

**Out of scope absent a separate architecture/product decision:** React/Vue rewrite, new Node backend, database/schema migration, role/permission changes, public disclosure expansion, ReportRegistry/Gemini behavior changes, changing live deployment URL/ID, creating/deleting health records, invoking installers/repairs/archive, or extending AI generation functionality. P4→v7 historical migration remains HOLD.

## 2. Evidence-based current inventory

Source of truth is `src/web/02-app-layout.html`, `03-modals.html`, `04-browser-app.html`, `01-styles.html` plus `docs/features.md`. Present implementation: 5 top-level sections (`dashboard`, `records`, `reporter`, `admin`, `library`), 13 modals, globally defined client functions, inline `onclick` handlers, custom legacy CSS, Font Awesome, and Google Charts (column/line/two doughnuts). The HTML shell also loads xlsx and html2canvas. Do not describe any proposed UX as already implemented.

| Current surface | Existing behavior to preserve | Redesign focus | Priority |
| --- | --- | --- | --- |
| Public/auth Dashboard | Public aggregate only vs authorized raw event tables; four KPI definitions; area/date filters; chart and image/Excel export | Clear hierarchy, compact cascading filters, four accessible charts, KPI explanations, responsive authorized event table, honest empty/error states | P1 |
| Record list and record entry/edit | Revision-checked mutation; EventID; conditional fields; lifecycle warnings; owner, attachments, close/reopen/void | Search/filter/sort, form sections, field/help/error states, unsaved-change safeguards, smaller-screen form usability | P1 |
| AI preliminary investigation report | One primary action per Event (G-33), G-26 readiness, G-17 registry, G-27 history, G-32 job polling/unknown/cancel, verified link opening | Explicit current report state and safe primary action, visible progress/restore, clear duplicate-report confirmation, errors that do not claim completion | P1 |
| Admin | Admin analytics, installation status and repair action, app settings/logo, MasterData, AreaMaster CSV/XLSX import, users, content, audit retention/history/archive | In-page subsection navigation, separated read/write affordances, high-risk action confirmation, responsive data tables | P2 |
| Public content library | Published notices/guides/manuals | Search/category filtering, readable responsive content cards, accessible external links | P2 |
| Auth/session | Login, optional registration and pending status; 4 RBAC roles; logout cleanup | Clear login and pending/error handling; privacy-safe view transitions; focus flow | P1 |
| Global dialogs and messages | 13 existing modals; toast; persistent AI job indicator | Standard modal focus/return, status/live region, loading and confirmation patterns without altering action semantics | P1 |

**Admin information architecture (proposed as in-page tabs, not new privileged API routes):** Overview & installation (read-only status, repair explicit), Settings & branding, Users & permissions, MasterData, AreaMaster & imports, Notices/library content, Audit & retention. Preserve current server permission checks; hiding a section is not authorization.

## 3. User roles and critical journeys

1. **Public visitor:** open dashboard → select date/location → understand aggregate KPI, chart and limitations → optionally read public guidance. No raw event rows, IDs, owner, file links or narrative.
2. **Authorized data-entry user:** sign in → find eligible event → add/update incident fields → see validation/consistency warning → save with expected revision → locate owner/attachments if authorized. Staff currently has view/export but not create/edit; UI must match current permission matrix.
3. **Manager:** locate event → review lifecycle → assign owner → close/reopen/void with appropriate reason and revision guard → verify action feedback.
4. **AI report operator:** locate authorized event → inspect readiness/registered reports → use exactly one contextual primary action → read job progress/cancellation/uncertainty → open registered report, or explicitly confirm creating a new version.
5. **System manager:** switch among admin workspaces, maintain master/area/users/settings safely and inspect audit metadata; no repair/archive triggered by navigation or automatic loading.

## 4. Phases, dependencies and acceptance gates

| Phase | Scope and concrete deliverable | Dependency / exit gate |
| --- | --- | --- |
| UX-R1/P1 — Discovery & design | This plan, component tokens, all screen & modal inventory, IA, representative responsive wireframes, task flows and acceptance matrix | Documents independently reviewed and PO accepted; no code changes |
| UX-R1/P2 — Tooling & shared shell | Pin Tailwind v4 / Lucide assets / Chart.js 4; deterministic, offline-capable front-end build output; shared layout, navigation, controls, typography, focus and toast | Native 13-file GAS staging and One-Click parity updated by explicit ADR; no asset runtime dependency that breaks Apps Script; smoke with synthetic data |
| UX-R1/P3 — Dashboard | Filters, KPI display, 4 charts, insight, authorized event table, export/image interactions | Same values/labels/privacy per source contracts; chart image capture verified; offline tests and visual snapshots |
| UX-R1/P4 — Events/forms | Record list, sections, validation, owner, attachment, lifecycle dialogs | EventID/revision, RBAC, mutation consent and warning tests; keyboard form path |
| UX-R1/P5 — AI report | List, action states, readiness/history, job indicator, cancellation/unknown state | G-17/G-26/G-27/G-32/G-33 regression checks; **no live Gemini** in automated checks |
| UX-R1/P6 — Admin/auth/library | Seven admin subsections, login/register, library, supporting dialogs | RBAC, file-import, settings, audit/retention action safety; public-only isolation |
| UX-R1/P7 — Integration/release | Full CSS/JS and 13-file parity, security/accessibility/responsive regression, release guide, rollback verification | Distinct-author independent review; PO merge authorization; separate staging and production deployment authorizations |

**Recommended delivery order:** P1 → P2 shared shell → P3 dashboard → P4 event management → P5 AI reporter → P6 remaining surfaces → P7 integration. Split each implementation phase into reviewable PRs; do not deploy after each PR by default.

## 5. Invariants that all implementers must protect

- **Public privacy:** `getPublicDashboardData` is aggregate-only. Never expose `MainData`, `EventID`, `Revision`, narratives, reporter identities, URLs or private report metadata on anonymous surfaces. Small-cell disclosure risk currently exists: do not claim that grouped numbers are fully anonymous or add a more granular drill-down without privacy review.
- **Role boundaries:** current permission matrix remains authoritative on server; UI shows permitted actions only but still relies on server authorization. Prevent session-switch/logout stale requests from repainting private data.
- **KPI semantics:** investigations count only qualifying events (`col17 === เข้าเกณฑ์`) having an investigation date (`col26`). Do not silently replace Dashboard definitions with admin analytics counts.
- **Event writes:** UUID EventID, expectedRevision concurrency, soft void, owner assignment, close/reopen reasons, non-destructive attachment policy remain unchanged.
- **AI report controls:** ReportRegistry append-only, distinct historical versions, one contextual primary action, explicit new-report confirmation, one active job and unknown/cancel state behavior preserved. Never infer success from an incomplete callback.
- **GAS deployment:** preserve V8, manifest/scopes, project/deployment identity, existing URL, deterministic source order and review of generated `Index.html` partial inclusion. Source/build parity must include compiled styles/scripts; no manual editing of generated Apps Script source.
- **No live side effects:** tests may use synthetic/mock data only; never run repair/install/migration/archive/real Gemini on live data as part of UI work.

## 6. Quality and usability acceptance matrix

| Area | Measurable verification target | Evidence method |
| --- | --- | --- |
| Responsive | 360, 390, 768, 1024, 1440 px; no horizontal page overflow except intentionally scrollable tables; 200% zoom remains usable | Browser/device screenshots, scroll and keyboard inspection |
| Accessibility | Target WCAG 2.2 AA: meaningful labels, visible focus, keyboard navigation, modal focus containment/restoration, status live regions, 4.5:1 normal text contrast / 3:1 relevant UI and large text | Automated a11y lint plus manual keyboard and contrast audit |
| State consistency | Loading / empty / permission denied / error / stale response / successful save clearly differentiated | Deterministic mocked client tests |
| Charts | Legend/title/tooltips/table fallback convey same aggregates; labels and data not indicated by color alone; resize and capture image work | Synthetic chart fixture + DOM/canvas tests and approved browser check |
| Core flows | One report action per Event; no duplicate mutation; unsaved-change warning where applicable; RBAC and revision failures preserved | Existing test suite + new contract tests |
| Release | `npm run build:check`, `npm run build:gas-multifile`, `npm run check:gas-multifile`, `npm run check:contracts`, `npm run release:preflight`, `npm test` all PASS on candidate; exact SHA verified | CI + independent reviewer record |

Performance budgets (bundle bytes, loading/fetch and interaction latency) must be **measured against an as-is baseline** before setting pass/fail numbers; do not invent a performance PASS without real instrumentation. Chart and icon assets should be tree-shaken and avoid unnecessary network requests.

## 7. Architecture questions to resolve in P2 before coding

1. **Tailwind compilation/output owner:** choose a build stage where CSS is compiled from an authored input stylesheet, injected into the existing `01-styles.html` HTML partial and committed/checked through a deterministic canonical build without requiring a new runtime CSS file. Confirm if the emitted file is generated vs authored; update source parity tests and build commands accordingly. Preserve the 13-file Apps Script contract unless separately approved.
2. **Icon packaging:** use a pinned Lucide SVG source + allowlisted icons; decide build-time inline SVG / local sprite / safe renderer. Never insert user data as trusted SVG HTML. No emoji glyphs as application icon replacements.
3. **Chart implementation:** migrate the 4 Google Charts widgets one by one to pinned Chart.js 4; use the existing client aggregate format, preserve zero-data handling, image export, iframe compatibility, and no public row disclosure. Review whether Chart.js UMD can be safely bundled inline in existing HTML partials.
4. **CSS migration strategy:** initially bridge legacy selectors, then remove obsolete legacy rules after screenshots + tests. Tailwind class detection must see template and dynamically built HTML classes; use explicit static classes or safe source declarations. No uncontrolled runtime class concatenation.
5. **GAS packaging/quota:** inspect actual bundled output size, inlined assets, HTML Service response, file-size quotas, V8 evaluation order, CSP/iframe behavior and production-equivalent staging. A passing Node build does not prove deployability.

## 8. Editable Figma wireframe working draft (not approved)

A new [Smart SRRT UX-R1 Figma Design file](https://www.figma.com/design/5NXcUVOhKVw2SRVxxNmZ03) was created as a **non-production visual working draft** on 11 October 2026.

- **Authored so far:** editable desktop Dashboard and Record/Event Management wireframes, with Thai labels, SVG-style navigation icons and explicitly synthetic sample values.
- **Not yet authored:** AI preliminary report, Admin workspaces, Library, mobile/tablet variants, detailed 13-dialog designs.
- **Visual QA status:** **NOT VERIFIED**. Figma MCP Starter-plan tool-call limit interrupted the screenshot/visual review; the two created frames must be opened and inspected in Figma before acceptance. Do not claim they meet visual/accessibility criteria.
- **Typeface note:** product source currently loads Prompt; draft Figma nodes use Noto Sans Thai because the available Figma font list permitted it. Font choice requires visual approval before implementation.
- **No implementation authority:** this Figma file is a design aid; it does not change current GAS source, @10 deployment, Chart.js/Tailwind dependencies, API calls, or migration data.
- **Next:** resume screen authoring when Figma edit access is available, then perform a visual review and complete the design acceptance checklist.

## 9. Governance and immediate next actions

This PR is **documentation-only**. It proposes a UX baseline and does not authorize dependencies, code changes, GitHub merge, Apps Script push, schema migration or production UAT. Next: independent reviewer checks that the inventory matches the real source and that no feature is misrepresented; Product Owner accepts/adjusts design direction. Then open a separately approved implementation issue for P2 with a concrete build/asset ADR and dependency/version verification.

**Source links:** [app layout](../../src/web/02-app-layout.html), [modal inventory](../../src/web/03-modals.html), [browser behavior](../../src/web/04-browser-app.html), [head & current dependencies](../../src/web/00-document-head.html), [current styles](../../src/web/01-styles.html), [G-33 UX contract](./g33-single-report-action.md), [G-34 deployment](../deployment/g34-native-multifile-apps-script.md).

**External reference docs (verify versions again during P2):** [Tailwind v4 CLI](https://tailwindcss.com/docs/installation/tailwind-cli), [Chart.js responsiveness](https://www.chartjs.org/docs/latest/configuration/responsive.html), [Lucide accessibility](https://lucide.dev/guide/accessibility), [Google Apps Script HTML Service best practices](https://developers.google.com/apps-script/guides/html/best-practices).
