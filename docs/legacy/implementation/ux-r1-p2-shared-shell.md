# UX-R1/P2-01 — Shared Operations Shell (First Redesign Slice)

**Status:** implementation candidate on feature branch; `NOT MERGED / NOT DEPLOYED`.  
**Approved source baseline:** `main@363c4cf93b64f12418b327500aa16de24ce4f731` (existing isolated TEST Apps Script Web App v11).  
**Scope:** first visual slice of [whole-system UX-R1 plan](../ux/ui-ux-redesign-plan.md), using [design system](../ux/design-system.md) and [screen specifications](../ux/screen-specifications.md).

## Why

The v11 TEST Deployment delivered the 24-file Native Apps Script architecture but deliberately retained a visually legacy Sidebar/Topbar and data views. Native Multi-file structure is not a finished visual redesign. This slice makes the common application frame visibly coherent before changing the data display or behavior of each of the five pages.

## Exact implementation boundaries

- **Sidebar:** neutral navy-teal operations panel, compact Thai category heading, clearer selected page contrast, restrained branding, readable guest/signed-in area and informational footer. Keep organization/logo/admin customization IDs unchanged: `logoImg`, `sideTitle`, `sideOrg`, `authBox`.
- **Navigation:** retain five `data-page` keys, existing `showPage(page,this)` callbacks, `auth-only` / `manager-only` role classes, six pinned inline Lucide SVGs and `aria-current` handling. No new entry points, role rules or pages.
- **Header:** introduce a small label for the operational workspace and a cleaner title/status area; retain editable `appName`, `appSubtitle`, `bannerText`, menu-trigger attributes and closed-system warning. Do not render dummy KPI, activity counts, live connection badges or user identity.
- **Shared presentation:** harmonize sidebar, heading, card, KPI, table-header and touch-target styling. New rules reside only in the authored `src/styles/shared-ui.css` and are composed deterministically into the generated `src/web/01-styles.html`. Existing Tailwind v4 prefixed build, legacy CSS and GS HTML include order are unchanged.
- **Responsive:** keep current mobile drawer, Escape/focus return, 980px drawer breakpoint, and 560px compact shell breakpoint. No new JavaScript or calls to `google.script.run`.
- **Out of scope:** Dashboard information hierarchy, Google Charts to Chart.js migration, Events form redesign, AI Reporter redesign, Admin tabs, Login/Modals, backend GS, schema, One-Click historical artifacts and any Apps Script write.

## Verification and explicit limitations

- Tests: `tests/ux-r1-p2-shared-shell.test.mjs`, existing R2 shared UI and role/navigation tests, deterministic CSS `build:check`, Native 24-file parity, full regression and P6 offline guard.
- **Not a visual approval:** GitHub Actions and synthetic tests cannot verify real screenshot layout, responsive overflow, focus order with assistive tech, custom-color contrast, offline third-party fonts or Apps Script iframe rendering. Before a future TEST deployment, inspect desktop and 360/390/768/1024/1440px views with synthetic/test data, confirm no duplicate report action, and verify all user-role pages.
- TEST v11 remains running from the previously approved deployment. No new `clasp push`, `clasp update-deployment`, new deployment ID, installer or Gemini job is authorized by this PR. Production remains HOLD.

## Next incremental slices

1. UX-R1/P3 — Dashboard operational overview and clearer filter/KPI/worklist/chart hierarchy.
2. UX-R1/P4 — Events table, entry/edit workflows and dialogs.
3. UX-R1/P5 — AI Reporter state-first UI with one primary contextual action.
4. UX-R1/P6 — Admin/Auth/Library layout and global modal patterns.
5. UX-R1/P7 — visual/accessibility/regression acceptance and separate TEST release review.
