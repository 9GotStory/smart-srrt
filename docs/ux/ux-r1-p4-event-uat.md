# Smart SRRT — UX-R1/P4 Event Management Integration & Browser UAT

**Scope:** P4-01 Event worklist, P4-02 incident form, P4-03 Owner / Attachments / Lifecycle confirmations, P4-04 focused integration.  
**Baseline:** `main@8f1c5dc2c63c4a53d4d6f70b85a16ca8db4c794e` after PR #126; P4-04 PR is not yet merged.  
**Environment:** TEST Apps Script existing deployment **Version 12** is the last operator-confirmed deployment before P4 changes; P4 changes are **not deployed**. Production remains **HOLD**.

## Evidence categories

- **Automated:** GitHub Actions Native24 parity, pinned Chart.js/Tailwind checks, contracts, P6 offline gate, full `npm test`, and P4 integration tests. Record the exact PR head SHA, run URL, and test counts when executed.
- **Manual Browser UAT: NOT RUN.** No live Google RPC, login or browser console outcome is claimed by CI; the checklist below is for an operator after a separately authorized future TEST deployment.
- **Privacy:** use synthetic TEST events/attachments; do not paste Script IDs, deployment URLs, patient data, API secrets, or screenshots containing identifiers into issues or CI logs.

## Browser checklist (mark each PASS / FAIL / NOT RUN with sanitized evidence)

| Case | Procedure on existing TEST /exec after separate deployment authorization | Expected |
|---|---|---|
| P4-01 / list | Sign in as authorized test account; search by text and village, filter disease and active/closed, Reset, no matches | Result count and EventID mapping remain correct; no mutation to unrelated rows |
| P4-01 / cards | Inspect 360, 390, 640 and desktop ≥1024 CSS px | Same data and one set of keyboard-focusable actions; labels and status columns legible; no horizontal body overflow |
| P4-02 / groups | Create a synthetic incident; navigate five anchors; test Province → Amphoe → Tambon → Village cascade | All 26 fields present exactly once; original meanings and date values preserved |
| P4-02 / edit | Edit a known synthetic EventID/Revision, include legacy MasterData value if available | Saves exactly one expected Event; stale Revision error preserves draft; save error does not silently discard data |
| P4-02 / cancel | Change a field, choose Cancel/Stay/Discard, repeat without any edits | Warns only for unsaved changes; successful save closes without discard prompt |
| P4-03 / roles | Admin vs Manager and guest; active vs closed event | Manager-only owner/lifecycle actions; no forbidden controls; server still enforces RBAC |
| P4-03 / lifecycle | Close, reopen, void synthetic events; test blank reason, Cancel, Confirm and stale Revision | No RPC for blank/cancel; no repeated submission; correct action and audit reason; closed stays read-only |
| P4-03 / owner | Open assignee list, select user, clear assignment, trigger backend error | Selected EventID/Revision correct, errors visible, no false success |
| P4-03 / attachments | Open empty list, upload accepted synthetic PDF/PNG under 5MB, try over-5MB and bad selection, download and remove with reason | Count, list, upload/download/read-only rules and error state correct |
| P4-04 / session | Logout or switch account while Owner list / Attachment list / upload / download / confirmation is in flight | No private DOM repaint, post-logout download, stale toast or unauthorized follow-up action |
| P4-04 / accessibility | Keyboard Tab / Shift-Tab / Enter / Escape in action modal and forms; inspect focus return | Dialog labels, actionable focus, consent and cancellation are usable |
| Login & Console | Login, Logout, refresh and direct navigation on desktop/mobile; inspect browser DevTools Console | Valid session behavior; no uncaught client JS error or sensitive console output |

**Known TEST v12 gap:** prior Dashboard Browser UAT reported 5 visual checks PASS, but **Login / Logout and Console Error check was NOT VERIFIED**; that earlier result does not close the new P4 integration cases.

## Recording result

For each browser case record `PASS|FAIL|NOT RUN`, device/browser, test deployment version, and a short **sanitized** observation. Every FAIL becomes a bounded GitHub Issue with steps to reproduce and expected/actual behavior. Do not paste patient information. CI-only PASS must not be promoted to Browser UAT PASS.

## Release boundaries

P4-04 is source/test/documentation development. No new Apps Script version, `clasp push`, deployment update, schema migration, production change or live Gemini invocation is authorized. TEST Version 12 is not updated by GitHub Merge. The historical rollback Version 11 is retained as previously operator-confirmed; current remote state must be checked separately only if a future deployment is authorized.
