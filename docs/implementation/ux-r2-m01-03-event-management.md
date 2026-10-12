# UX-R2-M01-03 — Event Management Native Modularization

**Status:** implementation candidate, unmerged and not deployed.  
**Base:** `main@b2241ab2c838756f4e38b9836c5d3ca15864d9bd` (UX-R2-M01-02 PR #90).  
**Review:** ChatGPT Technical Review (author-assisted; not independent).

## Functional and source boundaries

The first contiguous 26,789 bytes of the prior `src/web/04-browser-app.html` JavaScript body move without altering any function body, control-flow branch or original ordering into three standalone, ordered, **classic inline-script** partials:

- `03f-client-event-controls.html`: lifecycle/risk/consistency badges, Event Owner selection/assignment, attachment list/upload/download/removal, and original `fileToBase64` helper.
- `03g-client-event-history.html`: G-27 Event-specific report history, request/session invalidation guards, explicit new-report confirmation, modal focus trapping and keyboard handlers. This module calls existing G-32 Report Job helpers but does not redefine them.
- `03h-client-event-records.html`: Report readiness badge, Event close/reopen controls, private Event/Record/Reporter table rendering, 26-field dynamic incident form, area cascade, date conversions, and Event create/edit/void calls with existing EventID/Revision arguments.
- `04-browser-app.html` retains the G-26/G-32/G-33 Report Generation/Job state machine, Admin, Library, the one final `boot()` call, and document closing tags. No HTML Service, charting-library or JavaScript module system changes.

`tools/native-sources.mjs` now orders core → auth → dashboard → exports → event controls → history → records → reporter/admin/bootstrap. All scripts execute in the same browser global lexical environment. The two existing `fileToBase64` declarations (attachment/Admin) remain intentionally unchanged; resolving them is out of scope.

Native stage becomes **21 files**, comprising **7 server `.gs` + 13 HTML partials + 1 generated `Index.html`**. Release inspector and `tools/deploy-g34-clasp.sh` static allowlist track the exact new filenames. The latter is **edited but never run**.

## Security and business-contract invariants

- No changes to authorization, guest aggregate-only Dashboard, EventID/Revision concurrency, close/reopen/void status, RBAC for owner and attachments, Owner/Attachment RPC names, Report Registry schema v7, field keys (26), audit retention, or report-history authentication.
- No changes to login/logout session invalidation, G-27 report-history race/focus rules, G-26/G-32/G-33 readiness/confirmation/single-report-action/recovery/cancel/unknown-state behavior. The legacy G-33 combined cross-partial source harness must evaluate **JavaScript code only** via `nativeClientSource` rather than HTML text with literal `</script>` tags.
- Tests for all HTML inline handlers, script order, one bootstrap, global lexical access, private guest suppression, and offline stage parity remain mandatory.
- Only canonical `src/web/` client HTML, Native build inspection/allowlist source, regression tests, and associated documentation change. **No `src/server/**` or One-Click edits.**

## Verification and decision gates

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check:ui-assets
npm run build:gas-multifile
npm run build:check
npm run check:gas-multifile
npm run check:contracts
npm run release:preflight
npm test
```

A passing CI is source/synthetic VM/read-only release evidence only; it is **not** actual Apps Script HTML Service Browser UAT or production release evidence. P6 must remain `releaseDecision=HOLD`. Product Owner separately authorizes Merge. **No clasp, live Google Workspace/Gemini, migration, installer, deployment or production mutation** is authorized by this phase.

### Next phase

UX-R2-M01-04 Reporter state machine modularization, if approved independently; safety invariants must remain covered and exact source reconstruction checked.
