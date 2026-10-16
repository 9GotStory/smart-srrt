# Smart SRRT UX-R1/P9-05 — Integration Review and TEST Browser UAT Gate

**Review date:** 2026-10-16 (ICT)
**Issue:** #165, Parent #156
**Source baseline:** `main@c1bfae1470339a48ac177d8cb93bba92ddfed6bc`
**Source status:** Integration code candidate, **not deployed**
**TEST:** last confirmed v16. **Production: HOLD**.

## Gate boundary

P9-01 through P9-04 were squash-merged with individual Exact SHA and post-merge CI; P9-05 is a separate **source-only / Draft PR** review of interactions. The current integration test simulates client-side DOM and RPC callbacks. Neither passing Node/VM tests nor CSS parity is a successful live Apps Script Browser UAT.

No runtime deployment, Production action, real data, Gemini calls, schema/installer/migration/repair or privileged clasp operations are authorized by this document. No unconditional standing Merge authorization.

## Review findings and source corrections

| Finding | Risk | P9-05 correction | Evidence target |
|---|---|---|---|
| F-01 Inline HTML handlers interpolated JSON-stringified `attachmentId` within a single-quoted attribute | Quote-containing identifiers could break the attribute boundary and introduce HTML injection | Keep attachment identity in `data-attachment-id` after `escapeHtml()`; handlers read `this.dataset.attachmentId`. Existing `downloadAttachment`/`removeAttachment` RPC and RBAC semantics unchanged | Synthetic hostile-ID rendering test including apostrophes, quotes, ampersand and angle brackets |
| F-02 AI Reporter summary/history `aria-busy` and live status could outlive logout even though private callbacks were fenced | Stale/misleading progress after local session invalidation | Reset only reporter worklist/history status during synchronous logout; existing request/session invalidation is still authoritative | Concurrent Admin + AI summaries + History reads resolved out of order after logout; no old private data/status |
| F-03 Loading glyph `fa-spin` retained animation under user preference to reduce motion | Motion-sensitivity/accessibility gap | Add `prefers-reduced-motion: reduce` rule in canonical `src/styles/dashboard-ui.css`, with checked generated `src/web/01-styles.html` byte parity | Offline asset drift check, responsive CSS inspection |

## Coverage / integration contracts

| Surface | Source/Synthetic checks | Browser UAT pending |
|---|---|---|
| Boot / Auth | startup pending/retry; duplicate Login/Register; synchronous private Logout and late callback fences | offline RPC failure, focus return, accessible announcements |
| Dashboard / Export | latest-request filters, coalesced reads, blocked duplicate export/capture, unknown Google Drive file outcome | live Loading and real mobile keyboard gestures without generating real files |
| Records / Event lifecycle | submit guard, preserved draft, EventID/Revision, reason/confirmation, unknown blocks retry | real keyboard focus and closed-event read-only states |
| Owners / Attachments | concurrent Owner/Admin states independent; attachment list latest/empty/error, escape hostile ID, download per-item guard | modal mobile width, file input/load feedback, focus trapping |
| AI Reporter | report registry batching, history live status, G32/G33 unknown job and regeneration consent preserved, cancel unknown not repeated | job progress/unknown text and focus without calling Gemini |
| Admin: Overview / Settings / Users / Master / Areas / Content / Audit | seven workspace panels, Tab/Arrow/Home/End, session/epoch and per-read latest wins, independent save locks, repair/archive/import fail closed | touch/keyboard, blocked duplicate high-impact actions via **synthetic or isolated test doubles only** |
| Public Library | published-only; synchronous Search/Category/Reset, no RPC and no spinner | mobile card/empty/links focus |
| Shared UX / CSS | contextual `role=status`, polite live status, `aria-busy`; 560px/980px responsive source; reduced-motion CSS | browser a11y tree, 320–390px / 768px / 1366px, zoom 200%, prefers-reduced-motion |

## Release-independent Browser UAT checklist (not executed)

1. Obtain **separate** Product Owner authorization identifying exact main SHA, guarded existing TEST deployment/script ID and rollback snapshot; confirm Production is untouched.
2. Run TEST-only preflight: source/manifest/native ordered parity, backup, deployment target and rollback; **no installer/migration/real-data writes or Gemini**.
3. Use read-only/synthetic fixtures and permitted isolated users; test guest, record user and Manager boundaries. Do not submit repair, archive, import, document creation or actual attachment mutation against live data.
4. Capture Browser observations by viewport: mobile 390 × 844 and 320px narrow, tablet 768 × 1024, desktop 1366 × 768; keyboard-only Tab/Shift+Tab/Escape/Arrow/Home/End; role/status live announcements and reduced-motion preference.
5. Test offline/timeout using safe client-mocked RPC, not real production failures: pending, empty, error, ambiguous unknown, duplicate, logout, stale response, page/tab change. Confirm that an unresolved server-side write is **not** automatically retried.
6. Record PASS/FAIL with sanitized screenshots or synthetic logs, Exact SHA and deployment target, then separately authorize any eventual release. Leave #156/#165 open until all required Browser UAT and Human Gates are accepted.

## Known constraints / residual risks

- UI single-flight/unknown leases are client-scoped. They **cannot guarantee server idempotency across tabs, devices, or reloads**. Any ambiguous write needs independently verified authoritative server state before resubmitting.
- No real Browser UAT, assistive technology observation, mobile-device run or Apps Script TEST deploy is claimed here.
- Code-level source tests validate behavior under synthetic DOMs/RPCs; they do not prove actual screen-reader spoken output.
- No automatic inference of server-side success from an RPC timeout or failure. G32 Report Job, EventID/Revision, RBAC and Regeneration Consent remain authoritative.

**Recommendation:** Independent Source Review and exact-SHA CI first; request separate Product Owner **Merge-only** approval if PASS. TEST deploy and Browser UAT are different, explicit Human Gates. **Production HOLD**.
