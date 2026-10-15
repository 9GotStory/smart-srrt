# Smart SRRT — UX-R1/P7 Release Integration Evidence and Operator Checklist

**Baseline:** GitHub `main@4a4f81b0716ba30bb55410c38e2884b6c79843d0` after PR #144. This is the **start-of-P7 baseline**, not the final release candidate.  
**Code path:** Native24 multi-file Apps Script (7 server `.gs`, 16 HTML partials, `Index.html`); frozen legacy OneClick files remain untouched.  
**Deployment:** Existing TEST last **operator-confirmed Version 12**. No UX-R1/P2–P7 source is confirmed deployed there. Production **HOLD**.  
**Browser UAT:** **NOT RUN** for UX-R1/P4/P5/P6/P7. Prior TEST v12 Dashboard visual observations do not replace these cases.

## Evidence layers and sign-off authority

| Evidence layer | What may be recorded | Present status |
| --- | --- | --- |
| GitHub source | Exact main/PR HEAD SHA, changed paths, package dependencies and Native24 source list | P7-01 Candidate; review required |
| GitHub Actions | Actual workflow URL, Node/contract/full regression counts, staged byte parity, syntax/RPC and pinned assets | Record only after CI finishes at exact P7-01 HEAD |
| P6 offline preflight | `codeGate=PASS` with `releaseDecision=HOLD` | HOLD even when CI passes |
| Independent/technical review | Changed-file audit, privacy/auth/job invariants, findings, author-assisted reviewer limitation | P7-01 Technical Review pending final verdict |
| Browser TEST UAT | Keyboard/mobile/role/API behaviors against an approved isolated TEST deployment | **NOT RUN** |
| Protected backup + rollback rehearsal | Preserved previous code/version, test fixture, restoration access, owner and results | **NOT VERIFIED** for this new release candidate |
| TEST deployment authorization | Explicit, scoped Product Owner approval after checking exact candidate SHA | **NOT GRANTED** |
| Production release authorization | Separate Product Owner go/no-go after successful TEST UAT, review and backup evidence | **NOT GRANTED** |

## Current UI source inventory (verify against PR HEAD)

- **Five routes:** Dashboard `page-dashboard`, Records `page-records`, AI Reporter `page-reporter`, Admin `page-admin`, Public Library `page-library`.
- **Seven Admin workspaces:** overview, settings, users, master, areas, content, audit.
- **Fourteen dialogs:** `loginModal`, `recordModal`, `ownerModal`, `attachmentModal`, `eventActionModal`, `reportHistoryModal`, `reportNewConfirmModal`, `reportResultModal`, `reportCancelConfirmModal`, `reportReadinessModal`, `userModal`, `masterDataModal`, `areaModal`, `contentModal`.
- Global `reportTaskIndicator` is **not** a fifteenth modal.
- **Do not infer full accessibility compliance** from `role=dialog`, `aria-modal`, labels, responsive CSS or offline tests. Focus traps, focus return, Escape and screen-reader output require manual Browser verification.

## Offline release candidate commands

Run on the exact checked-out candidate commit, using Node/npm dependencies pinned by `package-lock.json`:

```bash
git rev-parse HEAD
npm ci
npm run build:check
npm run check:contracts
npm run release:preflight
npm test
```

The CI job also verifies package-stage byte parity. Record stdout, exit codes, number of tests and GitHub Actions URL. A passing `release:preflight` **must still say releaseDecision=HOLD**. Do not use `clasp push` or create Apps Script versions during offline verification.

## Browser acceptance matrix (only after separately authorized TEST source deployment)

All cases start **NOT RUN**. Use synthetic/approved test-only events; do not upload patient data or real credentials to GitHub evidence. Record browser/device, width in CSS pixels, operator, TEST version, result and sanitized failure details.

| Area | Critical scenarios | Status |
| --- | --- | --- |
| Public Dashboard | Public aggregate-only, no event rows/IDs, four Chart.js series, source filters, PNG chart capture; authorized table/exports separately | NOT RUN |
| Layout and responsive | Desktop 1440/1024, tablet 768, mobile 390/360; sidebar overlay, tab order, visible focus, text wrapping, reduced motion | NOT RUN |
| Records | EventID/Revision, 26 fields in 5 anchored sections, legacy values, stale revision/save errors and unsaved cancel | NOT RUN |
| Lifecycle | Close/reopen/void with deliberate reason, cancel, RBAC, closed-state actions, new Revision | NOT RUN |
| Owner + files | Correct event/Revision, active assignees, upload max 5MB, download/remove, stale response after Logout | NOT RUN |
| AI Reporter | Registry count verified vs unknown, one contextual G-33 button, readiness advisory, explicit history-only regeneration/consent | NOT RUN |
| AI Job | queued/running/finalizing/unknown/cancel-requested/cancelled/completed, recovery without duplicate Job/ReportID | NOT RUN |
| Admin | Seven workspaces, Manager vs Admin/Staff, read races after Logout, saved form errors, explicit repair/import/archive confirmation | NOT RUN |
| Public Library | Anonymous published-only cards, search/filter/empty state, safe external link opening and draft privacy | NOT RUN |
| Authentication | Login error/rate limit, disabled registration, pending approval, Enter-submit, close/logout during in-flight request, password clear | NOT RUN |
| All 14 dialogs | Title announced, Tab/Shift+Tab focus trap, Escape/Cancel, focus return, scroll lock, nesting and mobile clipping | NOT RUN |
| Browser Console | No uncaught errors, no secrets or health narrative in logs, actual Apps Script HTML Service behavior | NOT RUN |

Only mark `PASS` when a real Browser check at the recorded TEST source version supports it. Use the detailed [P4 checklist](./ux-r1-p4-event-uat.md) and [P5 checklist](./ux-r1-p5-reporter-uat.md) as additional cases.

## Go/no-go, rollback and scope discipline

1. **Source Gate:** Confirm PR exact HEAD, changed files, CI runs, Native24 package and ChatGPT technical review. An author-assisted review **is not an independent person/organization review**.
2. **TEST Gate (new approval required):** Identify existing TEST Apps Script project and currently deployed version; preserve `appsscript.json`, configuration, access controls and a tested restore path. Inventory sensitive-backed Sheets, template, reports, folders and backups before an authorized `clasp` operation. No Apps Script files/versions/deployments are changed by this P7 PR.
3. **Runtime Gate:** Manually execute UAT on isolated TEST with approved synthetic data. Record failed cases as GitHub Issues; classify privacy/RBAC/job duplication as blockers. Do **not** invoke real Gemini or production migrations by default.
4. **Rollback Gate:** Verify protected backup of previous working TEST source/deployment (operator-confirmed last v12; historical rollback version 11 must be reverified), manifest and access rights. Reverting source code cannot undo any already-executed server writes; do not overwrite Sheets/Drive without a separate reviewed data restore procedure.
5. **Production Gate:** Require explicit separate Product Owner authorization after acceptable TEST Browser evidence, critical findings closed, rollback verification, schema/report policy review, sanitized release record and known release SHA.

**Release decision for this document: HOLD.** This is an evidence plan and source-only integration change, not approval to push, version, migrate, email users or run Gemini.
