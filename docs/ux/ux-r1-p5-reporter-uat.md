# Smart SRRT — UX-R1/P5 AI Reporter Integration & Browser UAT

**Coverage:** P5-01 AI Reporter worklist, P5-02 Readiness / Report History / Job Status dialogs, P5-03 integrated regression.  
**Source baseline:** `main@58eef56f352e24cf20ac2f810c02e2efbddbfbca` (after PR #132).  
**Environment:** TEST Version 12 is last operator-confirmed Apps Script version. P5 source changes **are not deployed**. Production **HOLD**.

## Evidence boundaries

- Automated tests are synthetic-only, offline Native24. Results come from the PR's exact GitHub Actions SHA after run. They must not be interpreted as proof of Google Docs creation or live Gemini report quality.
- **Browser TEST UAT: NOT RUN.** Requires separate owner authorization to deploy source to isolated TEST, and a real interactive Browser session. Never claim these checks PASS from CI alone.
- ReportRegistry is append-only. The presence of a registered document **does not mean** the report is human approved. AI-generated output is a draft requiring human epidemiological review.

## Browser TEST acceptance matrix

| Case | Steps | Expected |
|---|---|---|
| P5-01 / Search | Filter synthetic Event name, date, village; reset filter | Correct EventID matches; one primary G-33 button for each visible event |
| P5-01 / Register state | Compare confirmed none, 1+ ReportRegistry entries and unknown/invalid summary | Separate wording; unknown does not authorize new generation |
| P5-01 / Responsive | Check at 360, 390, 640 and desktop ≥1024 CSS px | One semantic table/card action, no duplicate tab stops, readable status |
| P5-02 / Readiness | Open a synthetic event with advisory warnings | Event context and warning count accurate; warning is not server authorization or human sign-off |
| P5-02 / History | Open pre-existing synthetic ReportRegistry entry | Correct version count, SourceRevision, document URL verification and stale-source warning |
| P5-02 / Consent | Select create-new inside History; cancel, confirm, stale revision | No silent duplicate; explicit G-33 / GS-S4 one-use consent; previous record retained |
| P5-02 / Job states | Simulated queued, preparing, running, finalizing, completed, failed, cancel_requested, cancelled, unknown | Active indicator and one primary action reflect G-32; completed is a draft, unknown is fail-closed |
| P5-03 / Job column | Follow one job on matching EventID, inspect second event | Read-only status updates independently; no new Gemini or ReportRegistry RPC caused by display |
| P5-03 / Session | Logout during pending summary, history fetch, job update or recovery | No stale private content, no old session job created, no unauthorized controls |
| G-32 / Cancellation | Open confirmation and cancel from safe test job | Explicit consent; duplicate submit blocked; cancel_requested not shown as completed |
| G-33 / Recovery | Disconnect/recover or force mocked unknown status without real AI billing | Verify status before any retry; no automatic regeneration |
| Browser UI | Use keyboard Tab / Shift-Tab / Escape, screen-reader labels, Chrome Console | Usable modal focus, no uncaught JS errors or private console leakage |

Record each case as `PASS`, `FAIL` or `NOT RUN`, with TEST deployment version, device/browser and sanitized observations. Create a bounded issue for failures; never include patient data, ReportID/Document URLs or credentials in public logs.

## No-deploy source-phase restriction

This P5-03 change must **not** call `clasp`, create a Google Apps Script version, write to Drive, call live Gemini, alter schema or migrate data. Browser UAT follows an independently authorized future TEST deployment. TEST v12 Dashboard visual checks previously passed, while Login/Logout/Console were still **NOT VERIFIED**, and no P4/P5 browser UAT has run.
