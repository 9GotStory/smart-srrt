# UX-R2-02B — Shared Controls, Form Labels and Responsive Tables

**Status:** implementation candidate on `feat/ux-r2-02b-controls-forms-tables`, not merged, not deployed.  
**Source authority:** `main@6105edbf47e8cdc00aaf08020b83af650f9359e3` (R2-02 first shared-shell increment).  
**Tracking:** [Issue #82](https://github.com/9GotStory/smart-srrt/issues/82), [UX-R1 Screen Specifications](../ux/screen-specifications.md), [R2-01 Build Foundation](./ux-r2-01-build-foundation.md), [R2-02 Shared Shell](./ux-r2-02-shared-ui.md).

## Changes within this increment

1. **Record form:** add an explicit label association `<label for="inN">` to the 26 existing dynamic `fields[]` inputs in `buildRecordForm()`. The `inN` IDs, column list, input types, master options, area cascades, `expectedRevision` checks and submit behavior are unchanged.
2. **Dashboard:** give existing date/area controls accessible names; no filter semantics, RPC or KPI computation changes. Public Dashboard image capture remains available, and private raw event exports are still role-gated.
3. **Admin:** match the 15 existing setting/master fields with their labels, name upload/search controls and expose four existing Admin tables as **keyboard-focusable horizontal scroll regions** with accessible names. Together with R2-02's three main tables, there are exactly seven labelled regions; table rows, IDs, permissions and server operations do not change.
4. **Existing login and owner dialogs:** explicitly label the six login/registration inputs and the main owner select. No changes to submit methods, passwords, validation requirements, registration settings or dialog display logic. Full keyboard focus management of 13 modals is **not claimed or included**.
5. **CSS:** append scoped shared styling in `src/styles/shared-ui.css` for 44px button/select/input touch targets, focus visibility, disabled/hover, wrapping action groups, mobile panel headings and bounded scroll regions. Preserve existing legacy stylesheet and **Tailwind v4 prefixed utilities without Preflight**.
6. **Build/tests:** regenerate only the tracked CSS `src/web/01-styles.html` and derived `Index_Smart_SRRT_OneClick.html` using the existing deterministic asset/One-Click builder. No new Apps Script source files. Extend Node synthetic regression tests covering form IDs/labels, 7 table regions, actions, composed output and original G-30/G-34 parity.

## Review/verification contracts

| Area | Required evidence | Do not claim |
| --- | --- | --- |
| Form semantics | Original 26 distinct source fields and exact `inN` associations | All validation and full end-to-end browser UAT |
| Tables | 7 existing `tbody` IDs preserved, 7 named focusable scroll regions | Native mobile cards or responsive card-table parity |
| Controls | Labels and scoped CSS do not rename `onclick` or change required state | Every component fully redesigned |
| Build | `npm ci --ignore-scripts`, `npm run check:ui-assets`, `npm run build:check`, G-34 13-file check, `npm test`, `check:contracts`, `release:preflight` | Apps Script iframe runtime verification |
| Security | Server RBAC and user session boundaries left unchanged | Visual-only controls enforce permissions |
| Release | Exact PR SHA + CI + ChatGPT author-assisted technical review | Independent second-author approval |

Test on a synthetic checkout/CI and keep `--check` read-only. The new source stylesheet must be compiled and the exact One-Click HTML rebuilt before the final PR review. The existing deployment is **Apps Script @10**; no `clasp`, install/repair/migration, live records or Gemini operations are authorized for this work.

**Follow-on slices:** operational mobile incident cards, deeper component library/high-fidelity visual work, full dialog focus management, Chart.js migration and wider Lucide replacement are separately gated.

**Merge of the R2-02B PR requires explicit Product Owner authorization. Deploy requires another separate approval.**
