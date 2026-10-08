# P6 — Offline G-30 Review & Release Evidence Ledger

**Reviewed on:** 2026-10-08 (Asia/Bangkok)  
**Repository:** 9GotStory/smart-srrt  
**Issue:** #53  
**Draft PR:** #54  
**Compared base:** G-27 `feat/g27-event-report-history@3da49536cfdaf9bef3e368a202e3396b94751cbe`  
**Reviewed code head:** `68caeab3d14147ea2b9b0f5157e35ba9b05b49ed`

**Decision:** **CODE GATES PASS; PRODUCTION RELEASE NOT AUTHORIZED.**

This is an **offline code review and evidence inventory**, not independent human approval, not a live Google Apps Script runtime validation, and not a record of a successful migration or recovery drill.

## Read-only review observations

| Scope | Evidence | Offline result |
|---|---|---|
| Stacked lineage | G-17 PR #44 -> G-26 PR #50 -> G-27 PR #52 -> G-30 PR #54; base G-27 exact SHA above | Consistent and unmerged (Draft) at review time |
| Code change boundary | G-27 vs G-30 compare, first canonical server artifact modified with **21 deletions / 0 additions**, HTML artifact unchanged | PASS: deletion is only the earlier shadowed `forceGeminiModelAuto()` declaration |
| Development source | `src/server/` seven contiguous modules; `src/web/` five contiguous modules | PASS: two artifact assembly order lists are explicit |
| Artifact parity | `npm run build:check` on committed source, both artifact bytes compared | PASS |
| Contract & syntax tests | `npm run check:contracts` (7 cases) | PASS |
| Regression | `npm test` (146 cases) | PASS |
| Negative drift | Isolated temp fixture: mutation of compiled GS, mutation of CSS module, deletion of generated HTML; each must cause check failure; rebuilt artifact must restore parity; check must not alter a drifted artifact | PASS |
| Apps Script RPCs | 40 literal `gs('name')` targets, all resolve to top-level server declarations | PASS in static contract |
| Duplicate server functions | One shadowed `forceGeminiModelAuto()` removed; 154 top-level declarations left | PASS in static contract |
| Stored schema | G-17 ReportRegistry, schema v7; G-26/G-27 read-only/advisory interfaces retained | PASS in regression/contract checks |
| Actual Web App runtime | Google Apps Script staging deployment and authentication | **NOT RUN** |
| Data migration | Existing district dataset backup, migration, idempotency, header conflicts, restore verification | **NOT RUN** |
| Gemini / Google Docs / Drive | Real API authorization, template replacement, report registry/history links, access control | **NOT RUN** |
| Production deployment | Explicit Owner approval, change window, deployment and rollback | **NOT AUTHORIZED** |

## GitHub Actions evidence

**CI:** [Run #230](https://github.com/9GotStory/smart-srrt/actions/runs/37735623488), **SUCCESS**, on the reviewed code head.

- Byte-parity build: SUCCESS
- Syntax, duplicate declaration and RPC contracts: 7/7 PASS
- Complete regression: 146/146 PASS, 0 FAIL
- Compiled server SHA-256: `975e6b49bebf00a47331af567f1af0065aab3fb15f1d8c155af3fa8ad7ca5fbc`
- Compiled HTML SHA-256: `30474f2b4a88cda96b3449c02e80453283d501ca69eb7864145a204f448d969a`

These hashes identify development release *candidate bytes* and must be rechecked on the eventually approved and deployed SHA. They **do not** indicate a production release.

## Human-controlled follow-up evidence template

Complete the following only when staging execution is separately authorized; do **not** mark the tasks done based on this offline review.

| Gate | Operator/evidence reference | Status |
|---|---|---|
| Representative staging dataset chosen, privacy controls checked | ______ | NOT RUN |
| Initial live Apps Script deployment/version recorded | ______ | NOT RUN |
| Verified spreadsheet, configuration, Docs and Drive backups | ______ | NOT RUN |
| Baseline sheet/event/report counts and schema recorded | ______ | NOT RUN |
| Migration dry-run and per-version idempotent re-run | ______ | NOT RUN |
| EventID/Revision integrity and non-destructive void checks | ______ | NOT RUN |
| Public Dashboard cannot return private Event/ReportRegistry data | ______ | NOT RUN |
| RBAC denied/allowed RPCs, including report/readiness/history | ______ | NOT RUN |
| Gemini output, document template, registered reports and Docs link | ______ | NOT RUN |
| Rollback to previous Apps Script release and data recovery rehearsal | ______ | NOT RUN |
| Independent reviewer signature and Owner go/no-go | ______ | NOT RUN |

## Risks and decision

**Remaining release blockers are environmental and operational, not cleared by Node tests:** current installation inventory, reliable restricted backups, legacy data migration, Google Apps Script execution identity and quotas, Gemini/API behavior, actual Docs/Drive access, privacy checks, rollback rehearsal, and human acceptance.

Do not close #53 as accepted, merge any of the stacked Draft PRs, infer a deployed schema v7, or operate on production data from this evidence alone. The old divergent P6 PR #17 is **not** an approved merge source.

For the detailed step-by-step operator checklist see `docs/deployment/p6-release-readiness-checklist.md`.
