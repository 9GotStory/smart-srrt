# Smart SRRT — UX-R1 Design System (Tailwind v4 + Lucide + Chart.js)

> **Status:** PROPOSED DESIGN SPEC — no implementation or dependency install authorized by this document.
> **Planning source:** `main@1c5e9e2bf0dbb04e6d82fff049d5b4a5123c74bf`, 11 October 2026.
> **Related:** [Redesign plan](./ui-ux-redesign-plan.md) · [Screen specifications](./screen-specifications.md).
> **Framework constraint:** Google Apps Script HTML Service IFRAME with existing `google.script.run` / vanilla JS; current G-34 immutable @10 remains unchanged during planning.

## 1. Visual direction

Theme: *trustworthy public-health operations*. Calm teal/navy palette, white/neutral surfaces, clear text contrast, limited gradient decoration, generous but efficient spacing. Strong information hierarchy; measured visual density for data-entry work, not marketing-style oversized hero blocks. Thai-first labels, with English reserved for established terms (e.g. Dashboard, AI), metadata, and technical IDs when necessary.

No emoji in application navigation, table statuses, dialog headings or buttons. Use consistent **Lucide SVG icons**, but never rely solely on icons/color to communicate meaning. System logo/office identity and user-controlled theme colors must continue to be supported.

### Proposed token palette — design candidates only (contrast to be tested)

| Semantic token | Suggested value | Meaning |
| --- | --- | --- |
| `--brand-600` | `#0F766E` | Main actions / headings (existing default teal as compatibility anchor) |
| `--brand-700` | `#115E59` | High-contrast hover/selected |
| `--info-600` | `#2563EB` | Informational links / secondary navigation |
| `--warning-600` | `#B45309` | Pending/readiness warnings |
| `--danger-600` | `#B91C1C` | Destructive action / risk explanation |
| `--success-700` | `#15803D` | Confirmed non-critical success |
| `--surface` | `#FFFFFF` | Card/table/dialog |
| `--surface-muted` | `#F8FAFC` | Background / inactive areas |
| `--border` | `#E2E8F0` | Neutral outlines |
| `--text-primary` | `#0F172A` | Body/headings |
| `--text-secondary` | `#475569` | Support information |

Do **not** treat these as validated WCAG contrasts on every component/background. Test each foreground/background state. When Admin `PRIMARY_COLOR` or `SECONDARY_COLOR` overrides theme, derive hover/border/focus safely without trusting arbitrary colors for text-only indicators.

## 2. Typography, sizing and layout

- **Font:** Prompt with Thai and Latin glyphs; local/system fallback for font loading failure. Do not let third-party font failure block the app. Evaluate Noto Sans Thai only via separate visual signoff.
- **Type scale (proposal):** Page title 24–28 px desktop / 21–24 px mobile; section title 18–20 px; normal content 14–16 px; helper 12–14 px; KPI number 28–36 px. Keep primary data tables readable at 14 px where layout permits.
- **Space rhythm:** 4 px basis; 8/12/16/24/32 px major intervals. Shared containers use 16 px mobile / 24 px tablet / 28–32 px desktop.
- **Radius:** controls 10–12 px, cards 14–16 px, dialogs 16–20 px; reduce heavy shadows and excessive nested card borders.
- **Grid:** sidebar + fluid main on desktop; collapsible sidebar/drawer with overlay on mobile; use max-width where forms need focus, not a fixed content width for tables.
- **Breakpoints to inspect:** 360, 390, 768, 1024 and 1440 px. Never force large horizontal body overflow; scroll wide data tables inside a visibly labeled table region.
- **Touch:** aim for touch targets around 44×44 px in critical flows; avoid hover-only actions. Support 200% zoom.
- **Theme mode:** light-first, high contrast; do not add dark-mode switch until component audit and role-controlled theme overrides pass tests.

## 3. Tailwind CSS v4 integration contract (implementation proposal)

**Use locally pinned versions and compile at build time.** Tailwind v4 CLI requires `tailwindcss` plus `@tailwindcss/cli` as dev dependencies and a stylesheet with `@import "tailwindcss";`. Use `@theme` for explicit theme tokens and `@source` where scanner discovery misses GAS HTML fragment or JavaScript templates; do not use Tailwind Play CDN in deployed HTML.

Proposed responsibility graph:

```text
authored CSS + @theme + @source + app HTML/JS class inventory
              |
              v
         Tailwind v4 CLI
              |
              v
 compiled CSS (deterministic build artifact; no CDN request)
              |
              v
 existing GAS HTML partial: 01-styles.html (<style>compiled CSS</style>)
              |
              v
 existing Index.html server include expansion + source parity
              |
              v
 7 .gs + 5 partials + Index.html (13 source files, unchanged manifest)
```

**Critical unresolved build design decision:** Currently `src/web/01-styles.html` is committed canonical source, and `tools/build-one-click.mjs` / `tools/build-apps-script-multifile.mjs` require byte-for-byte concatenation parity. Before Phase P2 code, document whether `01-styles.html` is reproducibly generated from a new authored CSS source or whether compiled CSS is injected only into staged artifacts. Both paths require updates to the canonical build owner and integrity checks; do **not** silently write a generated file or add a sixth HTML partial while claiming G-34 parity.

**Potential implementation (requires ADR approval):** `src/styles/app.css` as authored CSS; build regenerates a tracked `src/web/01-styles.html` with stable `<style>...` wrapper; `build:check` validates generated content without modifying tracked files; existing One-Click builder then includes the same bytes. A single command order must enforce CSS generation → One-Click artifact checks → GAS multi-file generation. This is an **option**, not a decided implementation.

**Rules:** static full class literals for dynamically rendered client templates or exact `@source inline(...)` safelists; avoid `bg-\${color}` construction. Preserve legacy CSS only behind a planned bridge, audit selector precedence/reset effects and remove it progressively after per-screen tests. Test that input/select/file, date pickers, modal stacking and report-action button styles remain stable in the iframe. Do not inject user-supplied HTML into compiled CSS or unsafe SVG.

## 4. Lucide icon system

Use a **single pinned Lucide SVG source** and an explicit allowlist; decide build-time SVG embedding/registered client template in the P2 ADR (rather than scattering unrestricted CDN imports). Decorative icons should have `aria-hidden="true"`; functional controls must have visible label or an accessible name. A status icon always pairs with readable status text.

| Surface | Preferred icon concept | Semantic meaning |
| --- | --- | --- |
| Dashboard | `chart-no-axes-combined` | Surveillance overview |
| Events/recording | `clipboard-list` | Incident list and record |
| Preliminary AI report | `file-text` / `file-sparkles` (verify asset availability) | Report draft |
| Admin / settings | `settings` | System administration |
| Library | `book-open` | Notices and guidelines |
| Search / filter | `search`, `filter` | Search and narrow results |
| Add / edit | `plus`, `pencil` | New/edit event |
| Attachment | `paperclip` | File attached |
| Status | `circle-check`, `triangle-alert`, `circle-x`, `clock` | State with visible text |
| Refresh / loading | `refresh-cw`, `loader-circle` | Refresh / in progress |
| AI uncertainty | `circle-help` | Unknown state; not a success |

All names are **proposed**; verify existence in the pinned Lucide release before coding. Avoid icon-only destructive action buttons, non-semantic clickable `<div>` elements, or SVG markup built by concatenating untrusted data.

## 5. Chart.js v4 visualization contract

Replace **only the existing four Google Charts** and keep Dashboard data semantics intact. The chart adapter must consume the existing `getPublicDashboardData` aggregated arrays for visitors, and calculate the same currently used breakdowns from authorized `allData` after login. No privacy contract change.

| Existing container | Current chart | Proposed Chart.js output | Data/source invariant |
| --- | --- | --- | --- |
| `barChart` | ColumnChart villages | Horizontal bar (long Thai village labels), ordered and optional top-N only if explicitly marked | Public `byVillage` vs signed-in village count |
| `lineChart` | LineChart monthly | Line (monthly trend, zero/empty handling) | Public `byMonth` / signed-in month rows |
| `pieDisease` | Doughnut PieChart | Doughnut or accessible bar substitute for many disease groups | Public `byDiseaseGroup` / signed-in `col5` |
| `pieRisk` | Doughnut PieChart | Doughnut with direct text/legend | Public `byRisk` / signed-in `col19` |

Implementation requirements: Chart.js responsive container with explicit parent height and `maintainAspectRatio: false` if needed; dispose/resize chart instances on data/filter/page changes; stable color palette with non-color text labels; tooltip with count and denominator; long-label truncation with full tooltip; accessible text/table alternative for each chart; no misleading nonzero wedge for empty results. **No chart-derived data may appear to guests if it originated from authenticated raw records.**

**Dashboard image export is a release gate.** Existing `captureDashboard()` uses html2canvas of `captureArea`; Chart.js draws to canvas, so synthetic smoke must prove all canvases appear in the exported PNG after render completion, including at Retina/devicePixelRatio and with iframe constraints. Do not remove existing Google Charts until the equivalent capture and permission boundary pass. Excel exports (`exportClientExcel` / `exportServerFile`) must retain current role checks and workflow.

## 6. Shared component patterns and required states

| Component | Specification |
| --- | --- |
| App shell | Logo/title, sidebar nav with active state, contextual page heading, compact session controls, responsive drawer |
| Primary button | Clear verb, one dominant action per local context, disabled reason where appropriate, loading lock to prevent double-submits |
| Secondary/destructive button | Visually distinct; reasons/confirmations for destructive server actions; never use red only |
| Form field | Bound label, help text, required/optional indication, accessible validation error, keyboard and screen-reader focus |
| Select & dependent area fields | Preserve province → district → subdistrict → village semantics; show disabled/loading and correct reset behavior |
| Table | Search/sort only where supported by data, row-level actions, horizontal overflow, sticky header if safe, mobile summary view where practical |
| Badge/status | Text plus shape/icon; lifecycle/criteria/readiness/audit/job statuses must retain precise meaning |
| Modal | Named dialog, focus on open, keyboard containment, Esc only when safe, focus return to opener; close during pending AI job must not imply cancellation |
| Toast/alert | Error + next action, polite live region for non-critical updates, alert role only for important failures |
| Data chart | Title, time/area context, unit, tooltip, text alternative, empty/error/loading state |
| Loading | Skeleton only for bounded content areas; no infinite spinner without retry/status in report jobs |
| Empty state | Explain *why* empty (filter/no data/no permission/loading), propose a safe next action |
| Connection/API error | Retain displayed data only if safe, show retry; no accidental auto-resubmit of mutations |

## 7. Existing behavior / content language guardrails

- Keep current screen names and domain semantics; change Thai copy only with a reviewed glossary. Clearly distinguish `เข้าเกณฑ์`, `ลงสอบสวนโรคแล้ว`, `รอสอบสวน`, `ปิดเหตุการณ์`, and `ยกเลิก`.
- Don't call a successful `HTTP 200` a completed AI report; only registered status and verified URL justify that state.
- Avoid using "เผยแพร่" for internal document drafts; label generated AI output as **ร่างรายงาน ต้องตรวจทานโดยเจ้าหน้าที่**.
- Do not let chart/insight copy imply patient-level inference from sparse public aggregates. Add privacy notes or deliberate suppression only through separately approved server change.
- Admin dangerous buttons (`repairSystem`, `archiveAuditNow`, close/reopen/void, file removal) remain user-confirmed and are never triggered automatically by tab navigation.

## 8. Clinical-surveillance usability and component hierarchy (UX recheck)

**This system is an event-surveillance operations tool, not a generic analytics dashboard.** The design system must optimize data interpretation, field entry and safe follow-up before decoration.

1. **Action hierarchy:** one prominent contextual primary action; other operations secondary. Dashboard KPI cards are descriptive **not clickable** unless a real permission-checked destination/filtered view exists. Public cards never deep-link to private event rows.
2. **Operational work first:** for authenticated users put selected period/area, official KPI definitions, outstanding qualified investigation-date count and compact event worklist before optional charts. For anonymous users place aggregate trends and safety/context notices in the corresponding position, without raw-data leaks.
3. **Categorical charts:** long Thai village and group names favor labelled bars with common numeric baseline over multiple doughnuts. A doughnut can stay for a few interpretable proportions but must have counts, meaningful denominator and an accessible data-table alternative. Do **not** change `byVillage/byMonth/byDiseaseGroup/byRisk` semantics or public API.
4. **Precise status representation:** use separate tokens/badges for verification, criteria, investigation, risk, lifecycle and report job. **Do not derive a global green/red "completed" status** from one column. Typography must express status meaning even in monochrome.
5. **Form information density:** grouped anchored **single form**, not forced wizard. Preserve source 26 field mappings, area dependency and old MasterData values on edit; label actual inputs, errors and help, without inventing required-field logic. Respect mobile keyboard and fixed footer overlap.
6. **Report trust:** show "ร่างรายงาน ต้องตรวจทาน" near registered report links; a completed AI job is not a document approval. Unknown state is high visibility with explicit recovery; never auto-retry an expensive or mutating report command.
7. **Authorised vs public states:** design two variants of the same Dashboard shell, plus Staff vs Manager operation variants. Anonymous experience has no event IDs, actor identity, attachment or raw export.
8. **Figma review:** the initial 2 desktop editable drafts are **WIP and not visually verified**. They use Noto Sans Thai while source uses Prompt; **Prompt is the target font**. Mark all illustrative KPIs/events as sample content in every draft frame, then review Thai line wraps in 360/390 px widths before signoff.
9. **Accessibility:** all `button` and `a` targets must be actual semantic controls; after redesign dialogs need focus containment and restoration, with special handling for a report job that continues when its dialog is minimized. Form labels must use corresponding `for`/`id` (source currently builds bare `label` text). Tab focus must not reach hidden/offscreen nav sections.
10. **GAS-compatible interaction:** preserve stable DOM `id` and `data-*` hooks until a deliberately verified renderer migration; avoid wholesale replacement of all inline event handlers and charts in one change. Test `google.script.run` asynchronous state, IFRAME sandbox link targets, font and icon loading failures, and export while charts animate.

### Updated visualization priority (semantic before decorative)

| Surface | First screen / priority | Secondary content |
| --- | --- | --- |
| Public Dashboard | Period+area, 4 accurately defined KPIs, aggregate-only note and first trend | 3 remaining charts + published guidance |
| Authenticated Dashboard | Period+area, KPIs, explicit follow-up count and event queue/action list | Further chart gallery + exports |
| Event management | Search/filters, lifecycle/owner/last action, new event action, current relevant rows | Chart-free details, grouped record form |
| AI Reporter | Report registry state, one contextual action, visible running/unknown status | History, readiness detail and draft notice |
| Admin | Workspace nav, role scope and selected workspace heading | Only that workspace's cards/tables |
| Library | Published guidance, clear links and readable content | Category/search within published subset |

### Layout and loading verification

Do not load/chart-render every hidden section eagerly merely to fill a template. Prefer lazy UI rendering compatible with existing `showPage` and `loadAdmin` patterns, but preserve server permission and session-race defenses when introducing lazy loads. The same KPI and report action should not appear twice with contradictory states across pages.

In a synthetic browser check, compare **Dashboard anonymous and authenticated**, screen widths 360/390/768/1024/1440, long Thai case descriptions and empty tables, and report status `loading / ready / unknown / completed / cancelled`. Capture before/after UI snapshots only with mock data. Do not claim pass from CI alone.

## 9. Accessibility and test references

Target WCAG 2.2 AA for new components: keyboard-visible focus, 4.5:1 normal-text contrast, relevant 3:1 non-text contrast, semantic dialogs, meaningful icons, ARIA live updates and `prefers-reduced-motion` respect. Manual audit is necessary; do not label WCAG PASS based on static checks.

**Phase 2 proof required:** pinned dependency lockfile, deterministic CSS/icon/chart builds, HTML Service synthetic sandbox render, preserved source parity and smoke screenshot on narrow/wide viewports. Actual dependency versions must be recorded *when installed*, not guessed in this planning file.

**Official version-sensitive references (retrieved 11 Oct 2026, reconfirm before coding):**
- Tailwind v4 CLI: https://tailwindcss.com/docs/installation/tailwind-cli
- Tailwind source detection: https://tailwindcss.com/docs/detecting-classes-in-source-files
- Chart.js responsive sizing: https://www.chartjs.org/docs/latest/configuration/responsive.html
- Chart.js image API: https://www.chartjs.org/docs/latest/developers/api.html
- Lucide accessibility guidance: https://lucide.dev/guide/accessibility
- Apps Script HTML Service best practices: https://developers.google.com/apps-script/guides/html/best-practices
- Apps Script HTML Service sandbox: https://developers.google.com/apps-script/guides/html/restrictions

**Implementation authority:** This specification is a proposal. Separate Product Owner approval is required before dependencies, code changes, merge, Apps Script deployment, or live user-data UAT.
