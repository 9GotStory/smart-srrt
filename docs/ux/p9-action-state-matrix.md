# UX-R1/P9 — Loading & Action-State Matrix

Source baseline: main 69fd4d75e78f4b75dab2fdb2dd96bf92b91de265; TEST v16. Audit 2026-10-16. Status: P9-01 candidate, not deployed. This document is an implementation contract based on reviewed Native24 frontend source.

## Inventory boundary

The client source contains **52 literal named gs() callsites** spread across Auth, Dashboard, Export, Events, AI Reporter and Admin. They include repeated calls to the same RPC, and exclude variable-name dispatch, FileReader, html2canvas, XLSX, rendering, timers and other local asynchronous work. The completion target is the **action-handler inventory below**, not a claim that 52 covers every interaction.

Legend: R-latest = latest request owns visible results; R-coalesce = avoid duplicate concurrent reads of the same key; W-lock = synchronous pending lock before first await; JOB = preserve existing authoritative Report Job state machine, including unknown; LOCAL = browser task. Feedback: B = button, S = bounded section/table, M = modal, J = persistent report job, I = inline text. No indiscriminate full-screen overlay.

## Action-state coverage matrix

| UI area | Action / RPC | Existing observation | Required feedback | Concurrency policy | Phase |
| --- | --- | --- | --- | --- | --- |
| Boot | getAppBoot / boot | auth epoch fences; no boot progress region | S+I startup/loading/error with safe retry | R-latest by session | P9-02 |
| Auth | login | pending flag, disabled submit, status | B+I checking/success/error | W-lock, auth epoch | P9-02 |
| Auth | registerUser | pending flag and status | B+I submitted vs approved clearly distinct | W-lock, auth epoch | P9-02 |
| Auth | logout | synchronously invalidates private session, server RPC later | B+I while signing out without delaying local revocation | W-lock logout; preserve invalidation | P9-02 |
| Dashboard | getDashboardData / getPublicDashboardData | loading/empty/error and request counter | B search/reset + S scoped status | R-latest; prevent stale display | P9-02 |
| Dashboard | synchronous filter selection, charts, KPI render | local work | no spinner for immediate input | LOCAL | P9-02 |
| Dashboard | exportClientExcel / XLSX | no pending lock | B only while preparing file | LOCAL single-flight | P9-02 |
| Dashboard | exportData / server Excel/PDF | unguarded async call | B+I progress/error/retry | R-coalesce per format; no duplicate file creation | P9-02 |
| Dashboard | captureDashboard / html2canvas | button disabled and session guards | B+I while capture is actually pending | LOCAL lock, dashboard request fence | P9-02 |
| Record list | search/status/disease/reset | local renderTables | counts only, no spinner | LOCAL | P9-03 |
| Record modal | addRecord / updateRecord | recordSaveInFlight and disabled save/cancel | B+M saving/result; draft retained on error | W-lock and EventID/Revision | P9-03 |
| Record modal | five tab switches / cascade | local, 26 form fields retained | no spinner for tab switch | LOCAL | P9-03 |
| Lifecycle | dynamic closeEvent / reopenEvent / deleteRecord / removeEventAttachment | confirmation modal + pending guard | B+M reason/submitting/error | W-lock, EventID/Revision, no blind retry | P9-03 |
| Owner | listAssignableEventOwners | inline loading but opener has no progress | B opener + I/M data loading | R-coalesce per EventID/session | P9-03 |
| Owner | assignEventOwner | ownerSavePending, disabled button | B+M+I | W-lock + revision | P9-03 |
| Attachments | listEventAttachments | loading list and request counter | S/M loading/empty/error/retry | R-latest EventID/session | P9-03 |
| Attachments | FileReader + uploadEventAttachment | pending guard, spinner, file validation | B+I encode/upload/refresh | W-lock + revision; no auto retry | P9-03 |
| Attachments | downloadEventAttachment + Blob | no download lock | B per file + I | R-coalesce per attachment | P9-03 |
| Attachments | request removal | lifecycle confirmation | B+M | W-lock, preserve reason/Revision | P9-03 |
| AI worklist | batched getReportSummariesForEvents | summary status/loading, action button state | S+B per worklist/row | R-latest | P9-04 |
| AI preflight | getReportSummariesForEvents single EventID | preflight Set guard | B+I per event | R-coalesce per EventID | P9-04 |
| AI readiness | getAIReportReadiness | in-flight Set, button spinner | B+M contextual readiness | R-coalesce; keep unknown lock | P9-04 |
| AI history | listReportsForEvent | modal loading/result text | M+I status/empty/error | R-latest by event/session | P9-04 |
| AI regenerate | listReportsForEvent + prepareReportRegeneration | confirmation lock + one-use consent | B+M verifying authoritative history | W-lock, never bypass consent | P9-04 |
| AI create | createReportJob + runReportJob | existing job-state machine | B+J queued/running/finalizing/unknown | JOB; never auto repeat uncertain create | P9-04 |
| AI status | getCurrentReportJob + getReportJobStatus | recovery + polling busy guard | J persistent status, no false success | JOB; unknown requires verification | P9-04 |
| AI cancel | cancelReportJob | submit lock and pending text | B+M+J cancel_requested != cancelled | JOB, no blind reissue | P9-04 |
| AI dismiss | dismissReportJob | best-effort RPC | nonblocking acknowledgment as appropriate | JOB, no unintended retry | P9-04 |
| Admin overview | getAnalytics + getInstallationStatus | loadAdmin fans out many concurrent reads | S distinct overview/installation loading | R-latest, admin epoch | P9-04 |
| Admin settings | getSystemSettings | shape guards but no scoped pending | S+I loading/error/retry | R-latest, admin session | P9-04 |
| Admin settings | saveSystemSettings + getAppBoot | form pending guard, disabled button | B+I saving/refresh/error | W-lock, admin epoch | P9-04 |
| Admin logo | FileReader + uploadLogo | pending guard + existing progress region | B+I encoding/uploading | W-lock, file validation | P9-04 |
| Admin repair | repairInstallation + getAppBoot | confirmation + adminBusy.repair | B+M verifying/unknown/result | W-lock; NEVER auto retry repair | P9-04 |
| Admin users | listUsers and search | userReadSeq latest guard | S table + B refresh + I | R-latest, optional debounce | P9-04 |
| Admin users | updateUser | save guard | B+M+I | W-lock; server RBAC | P9-04 |
| Admin master | getMasterDataAdmin | shape guard and cache | S table/controls | R-latest, admin epoch | P9-04 |
| Admin master | saveMasterDataItem + getAppBoot | save guard | B+M+I | W-lock; semantic policies unchanged | P9-04 |
| Admin areas | listAreas + search | areaReadSeq latest guard | S table + B refresh | R-latest | P9-04 |
| Admin areas | saveArea / deleteArea | guard + disable confirm | B+M+I | W-lock; no automatic retry | P9-04 |
| Admin areas | local XLSX parse + batched importAreas | adminBusy.import, consent, chunks | B+S stage and confirmed chunk count | W-lock across whole import; no automatic retry | P9-04 |
| Admin areas | getAppBoot / refreshAreas | after mutation | S refresh status | R-latest/admin epoch | P9-04 |
| Admin content | listContent | Array guard, toast | S loading/empty/error | R-latest/admin epoch | P9-04 |
| Admin content | saveContent + getAppBoot | per-form pending guard | B+M+I | W-lock, public-only privacy unchanged | P9-04 |
| Admin audit | listAuditLogs | Array guard, toast | S loading/empty/error | R-latest/admin epoch | P9-04 |
| Admin retention | getAuditRetentionStatus | status text | S status/read failure | R-latest/admin epoch | P9-04 |
| Admin archive | archiveAuditLogs | confirmation, adminBusy.archive | B+M+I verified counts; unknown on uncertain outcome | W-lock; NEVER auto retry archive | P9-04 |
| Public Library | boot getAppBoot, published-only content | shared boot, local renderLibrary | S only during boot | R-latest, guest privacy | P9-04 |
| Public Library | category/search/reset | synchronous local work | results/empty only: no spinner | LOCAL | P9-04 |
| Cross screen | five pages, seven workspaces, fourteen modals | mostly synchronous navigation | only indicate real pending I/O | preserve user focus/session isolation | P9-05 |

## P9-01 foundation API

- uiSetSectionState(sectionId,statusId,state,message) supports idle/loading/ready/success/empty/error/unknown, with real loading marked aria-busy=true. Distinguish an empty successful result from server failure and uncertain mutation.
- uiBeginAction(key,{buttonId,sectionId,statusId,pendingText}) acquires an exclusive key and associated button/section **synchronously before RPC**, or returns null for duplicate/busy. Options also accept DOM refs button/region/status. No global google.script.run interception.
- uiFinishAction(lease,state,message,{canEnable}) finishes only the live owner and restores the original trusted button markup. Unknown keeps its action button disabled until separate authoritative recovery; canEnable cannot override an unknown outcome. Callers with dynamic authorization must provide canEnable for other terminal states; status text is textContent, not HTML.
- uiInvalidateAction(lease) and uiInvalidateAllActions() reject stale completions. Later integration must wire per-session cleanup explicitly; they are not a replacement for existing auth/request/job guards.
- No auto retry of mutation, installer/repair, report create, archive, import, or unknown work. A frontend lease alone cannot prevent duplicates across tabs or devices; server RBAC, revision locks and idempotent job state remain authoritative.
- Accessible role=status, aria-live=polite, aria-busy controls; visual icon/skeleton and reduced-motion styling will be introduced with real callsite adoption (P9-02+). No arbitrary full-screen overlay.

## P9-01 source-only acceptance

1. Duplicate attempts return null before any RPC, independent actions can coexist.
2. One active lease owns each key, button, busy section **and shared status region**; stale completions never rewrite newer state.
3. Success/error/empty/unknown are distinct; unknown keeps its action button disabled until separate authoritative verification, while optional canEnable recomputes current permissions for other terminal outcomes.
4. Logout/session-related invalidation can release stale leases; no old result leakage.
5. Plain text status/ARIA; no fabricated progress, false success or busy-forever.
6. No change to existing business action handlers, source order, generated CSS or Google APIs in this candidate.

Release: require exact SHA + full CI + independent review + separate Product Owner Merge approval. TEST remains v16. Production HOLD.
