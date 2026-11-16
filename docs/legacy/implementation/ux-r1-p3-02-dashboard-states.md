# UX-R1/P3-02 — Dashboard Loading, Empty, Error & Authorized Follow-up States

**Status:** source-only feature branch candidate — NOT MERGED / NOT DEPLOYED.  
**Base:** `main@9f7c575ae80791a53317da8f42647e319e4fbe5f` (PR #115, P3-01 Dashboard Overview post-merge CI PASS).  
**Reference:** [Screen Specifications](../ux/screen-specifications.md), [UX-R1 Plan](../ux/ui-ux-redesign-plan.md), [P3-01](./ux-r1-p3-01-dashboard-overview.md).

## Why this slice exists

P3-01 established a clearer Dashboard filter/KPI/Chart layout, but loading or failed requests could still leave the previous filter's results visibly presented as if current. This PR introduces a live status model that distinguishes **loading**, **empty**, **error** and **ready**. It also adds an authorization-scoped, text-only operational follow-up summary for qualifying events without an investigation date.

## Changed surfaces

- `src/web/02-app-layout.html`: add an accessible `role=status` and `aria-live=polite` element next to the filters, give the existing Dashboard PNG button a stable DOM ID, and add an authorized event-worklist heading + follow-up text **inside** the existing `eventDetailPanel` (outside `captureArea`).
- `src/web/03d-client-dashboard.html`: add `setDashboardViewState(state)` and `refreshDashboardFollowupSummary()` around **existing**, token/request/mode-scoped `loadDashboard()`. Guard malformed RPC responses as errors rather than interpreting them as zero. Clear prior pending follow-up message on load/errors. Use neutral, static UI text for failed requests (existing transient toast remains). On no chart data, display plain text rather than inventing a zero-slice/chart category.
- `src/web/03c-client-auth.html`: synchronously hide previous Dashboard data when a user logs out, before any awaited server RPC returns. Preserves all existing sign-out token invalidation and session guards.
- `src/styles/dashboard-ui.css`: scoped status, error, empty chart and authorized worklist patterns. Hide stale KPI/chart/private event table while loading/error; honor the explicit `hidden` attribute even with prior role-specific inline `display`. No new global CSS.
- `src/web/01-styles.html`: reproducible Native CSS artifact composed from the same existing CSS build, unchanged Tailwind version/assets.
- `tests/ux-r1-p3-02-dashboard-states.test.mjs`: synthetic guest/authorized requests, out-of-order RPCs, pending count, failed fetch, screenshot gating and no-data chart tests.

## Preserved boundaries

1. **Guest-only aggregates:** `getPublicDashboardData` continues returning only public aggregate data; guests never receive raw `eventBody`, `eventDetailPanel` or new private follow-up numbers. We never copy event-identifying values into the new status element.
2. **Report/investigation meaning:** pending follow-up counts only `col17 === 'เข้าเกณฑ์'` with **blank trimmed `col26`**. This is an operational data-completeness cue, not a clinical approval or automatic alert engine.
3. **No stale success:** successful rendering and state transitions happen only after request ID + token + auth-mode guards. Failed loads do not claim success or keep old Dashboard figures visibly current; no-data is not an error.
4. **No new data mutation:** existing filter Search/Reset, CSS, KPI definitions, four Google Charts, chart DOM IDs, PDF/PNG and Excel workflows, authenticated Event/AI report actions, Google Apps Script server, Script/Deployment IDs and schema are unchanged. Actual PNG export is disabled during loading/error to avoid stale or incomplete images.
5. **No silent navigation/permission changes:** unchanged five top-level page keys, existing per-role visibility and server permission checks, mobile card mirroring and One-Click frozen source.

## Verification & remaining gates

Required: exact commit CI, `npm run build:check`, Native 24-file parity, all offline contract/regression tests, P6 `codeGate=PASS` with intentional `releaseDecision=HOLD`, authorization-specific simulated late-request test. Browser/screenshot checks at 360/390/768/1024/1440px and 200% zoom **have not been performed** and remain TEST UAT tasks. Existing static `Google Charts` remains; Chart.js migration is a separate later PR because chart capture, public aggregates, responsive rendering and resize behavior must be independently proven.

**Product Owner gate:** PR Merge requires separate explicit approval. A Merge does not authorize `clasp push` or `update-deployment`. Isolated TEST Apps Script Version 11 remains as-is until a separately authorized TEST deploy; Production HOLD.
