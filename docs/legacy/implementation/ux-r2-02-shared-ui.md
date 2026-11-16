# UX-R2-02 — Shared UI Shell and Navigation (incremental first slice)

**Status:** branch-only implementation candidate; **not merged and not deployed**.  
**Baseline:** `main@055677fba61e8df95f93776661386957bdb902de` (approved R2-01 Tailwind v4 foundation).  
**Tracking:** [Issue #80](https://github.com/9GotStory/smart-srrt/issues/80) · [R2-01 build](./ux-r2-01-build-foundation.md) · [UI/UX Screen Specifications](../ux/screen-specifications.md).

## What is changed

- Keeps **all five original** primary page keys (`dashboard`, `records`, `reporter`, `admin`, `library`), `page-*` section IDs, click handlers, public/authorized/manager-only navigation CSS classes and server permission checks. Does not add a route or rename a page.
- Replaces **only five sidebar navigation icons and the mobile menu icon** with **static, audited inline Lucide SVGs** sourced at the immutable public upstream commit [`lucide-icons/lucide@70562c1ee1c4fdcf736fe97bc893fb8511927934`](https://github.com/lucide-icons/lucide/tree/70562c1ee1c4fdcf736fe97bc893fb8511927934/icons). No `lucide-static` dependency, icon runtime CDN, user-controlled SVG or new Apps Script file. Other Font Awesome icons stay unchanged pending further visual review.
- Introduces an accessible **skip-to-main-content link**, semantic navigation landmark, labelled menu button with `aria-expanded`/`aria-controls`, keyboard Escape dismissal, focus entering/exiting the mobile drawer, and `aria-current="page"` synchronized by existing `showPage`.
- Adds **labels and focusable scroll regions to the three core read-only tables** (Dashboard operational events, Event Management, AI Reporter); no table rows/columns, EventID, report actions or protected content are rebuilt.
- Adds `src/styles/shared-ui.css` for focus-visible, skip-link, nav selected state and constrained mobile visibility. R2-01's **Preflight-off, `tw:`-prefixed Tailwind** remains; the three existing opt-in classes are included on the brand grouping. No global CSS reset, external runtime CSS or blanket widget rewrite.
- Adds the shared stylesheet into the deterministic CSS pipeline, then regenerates tracked `src/web/01-styles.html` and `Index_Smart_SRRT_OneClick.html`; G-34 still expands the **same 7 server .gs + 5 HTML partials + Index.html = 13** Apps Script files.
- Adds synthetic, offline Node tests covering source/page key parity, trusted static icons, nav `aria-current`, mobile menu Escape/focus, public/private navigation class boundaries, composed CSS and One-Click inclusion. `tests/ux-r2-ui-assets.test.mjs` fixture includes the new shared CSS source.

## Source ownership, no-change contract

| Surface | Allowed in R2-02 | Explicitly deferred |
| --- | --- | --- |
| Shared shell | Sidebar HTML/CSS icons, labelled landmark, focus-visible, responsive drawer behavior | Complete visual Figma redesign, header content/branding changes |
| Accessibility | `aria-current`, `aria-expanded`, skip link, keyboard Escape and three scrollable core tables | Comprehensive WCAG review, all 13 dialogs and all Admin tables |
| Tailwind CSS | Reuse pinned compiled `tw:` utilities; one additional authored shared stylesheet | Preflight reset, new framework, full component rewrite |
| Product logic | No new business logic; same `google.script.run`, table renderers and owner/report handlers | KPI formulas, event input validation, report job state, schema |
| External assets | Six Lucide SVGs vendored from immutable upstream commit | Replacing all Font Awesome, installing browser Lucide bundle or Chart.js |

## Verification and acceptance

Run only on the working PR branch or synthetic checkout:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check:ui-assets            # must be read-only
npm run build:check                # One-Click parity
npm run build:gas-multifile
npm run check:gas-multifile
npm run check:contracts
npm run release:preflight
npm test                           # includes UX-R2 shared UI synthetic tests
```

**Critical:** `npm run build` updates tracked generated assets and is deliberately excluded from read-only CI, which catches stale source. `dist/apps-script/` remains ignored. No `clasp` operation is authorized. The temporary `ux-r2-02-bootstrap.yml` used for regenerating deterministic assets on an isolated Node 24 GitHub runner **must be removed before PR merge**.

The synthetic Node tests verify source contracts and functions in a stubbed DOM. They **do not** assert complete visual QA, accessible screen-reader behavior in a real Apps Script iframe, user role enforcement by themselves, or a live deployment pass.

## Product and security gates

- Public Dashboard continues to expose aggregate data and public aggregate PNG; authenticated event table and raw Excel must remain protected.
- Staff is read/export only; Admin record/report actions; Manager/Super Admin have additional administration rights. This PR does not modify server permissions.
- G-26/G-32/G-33 AI report readiness/registry/one-action/unknown-job safeguards and expectedRevision are **not modified**.
- **ChatGPT Technical Review** is Product Owner-selected and author-assisted, **not independent**. Exact SHA, scopes and CI must be checked.
- **Merge of this PR requires explicit Product Owner approval.** R2-03 Dashboard and further UI changes are separate tasks.
- **Apps Script Deployment @10 remains untouched.** Deploying any R2-02 candidate requires an additional, explicit Product Owner authorization and runtime verification.

## Lucide provenance

| UI item | Pinned upstream SVG |
| --- | --- |
| Dashboard | `layout-dashboard.svg` |
| Records | `clipboard-list.svg` |
| AI Reporter | `file-text.svg` |
| Admin | `settings.svg` |
| Library | `book-open.svg` |
| Hamburger | `menu.svg` |

The original ISC/Feather attribution text is retained in [Lucide license notices](../licenses/lucide-LICENSE.txt).\n\nAll six paths are trusted static repository assets, copied into HTML at source authoring time, and marked `aria-hidden="true" focusable="false"`. Visible Thai navigation text supplies accessible names; there are no network requests for SVG at runtime.
