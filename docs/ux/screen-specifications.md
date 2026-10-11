# Smart SRRT — UX-R1 Screen Specifications & Acceptance Matrix

> **Status:** PROPOSED / DESIGN ONLY. This is a map of all existing user-facing surfaces, not a declaration that the redesign has shipped.
> **Verified source baseline:** `main@1c5e9e2bf0dbb04e6d82fff049d5b4a5123c74bf`, 11 October 2026.
> **Existing screens:** five top-level `page-*` sections in `src/web/02-app-layout.html`; 13 modal containers in `src/web/03-modals.html`.
> **Behavior authority:** `src/web/04-browser-app.html`, `docs/features.md`, current tests, server-side RBAC and G-33 UX rules.
> See [Redesign plan](./ui-ux-redesign-plan.md) and [Design system](./design-system.md).

## 1. Shared navigation and information architecture

**Primary navigation (preserve stable page values/IDs unless a separately reviewed refactor updates all client tests):**

| Page / selector | Public | Authorized user | Functional purpose |
| --- | --- | --- | --- |
| `dashboard` / `page-dashboard` | Aggregate only | Aggregate/KPIs plus authorized raw event table | Surveillance overview |
| `records` / `page-records` | Hidden | Roles with record-create/edit entitlement only in current nav | Incident record management |
| `reporter` / `page-reporter` | Hidden | Roles with reporting entitlement only in current nav | Preliminary AI investigation report |
| `admin` / `page-admin` | Hidden | Manager/Super Admin | Admin operations |
| `library` / `page-library` | Public content | Public content | Announcements/guidance |

**Important:** `Staff` currently can view/export authenticated data but cannot create/edit/report; the redesigned UX must avoid promising Staff a write screen. Menu visibility never replaces server-side permissions.

### Shared desktop wireframe (conceptual, not implemented)

```text
+------------------------+---------------------------------------------------------+
| Smart SRRT logo/title  | Page title + contextual description         user/actions|
| Dashboard              +---------------------------------------------------------+
| Events                 | Filter/search/action bar                                |
| AI preliminary report  +------------------+------------------+-------------------+
| Admin (authorized)     | Main content: KPIs, charts, data, or form               |
| Library                |                                                     ... |
| Session / sign out     | Inline loading/empty/error + contextual support         |
+------------------------+---------------------------------------------------------+
```

**Mobile:** top-bar title + accessible menu button, overlay drawer, one-column content, fixed-width data columns only inside scrollable table containers. Keep context and primary action visible, but do not use persistent bottom banners that obscure report dialog actions. Sidebar active page announces current location and `aria-current` or equivalent semantic cue. Skip-to-content target and visible keyboard focus.

## 2. Dashboard (`page-dashboard`)

**Goal:** understand event load, qualifying incidents, investigation completion and time/place distribution without violating public/private data boundaries.

### Proposed layout
1. Clear page title with time period and area context; one filter disclosure/toolbar for start/end date, province → district → subdistrict → village, Search and Reset.
2. Four KPIs: `kpiTotal`, `kpiCriteria`, `kpiInvestigated`, `kpiRate`, plus concise denominator explanation for the rate.
3. Smart Insight (`smartInsight`) with explicit no-data/error and summary language that does not over-interpret sparse groups.
4. Charts: villages (`barChart`), monthly trend (`lineChart`), disease groups (`pieDisease`), risk (`pieRisk`). Show zero, absent and loading without phantom segments.
5. Authenticated event list `eventDetailPanel` / `eventBody`: identity/date/area/status/owner/verification/criteria/risk/attachments/actions as permitted, with export controls. Anonymous users see `publicAggregateNotice` instead.
6. Dashboard image export (`captureArea`) and Excel export should remain discoverable without altering permissions or revealing rows.

**Proposed interaction:** Filter changes do not implicitly mix requests; explicit Search applies current selection, Reset restores default and reloads. While a request is pending, show a meaningful local state; late request from old filter, logout or session mode must not repaint data. Provide chart accessible alternative or small data table.

**Acceptance:** same KPI values and definitions for identical synthetic input; 4 charts correspond to existing authorized/public arrays; public cannot see raw event table/Excel data exports/private details; aggregate-only Dashboard PNG capture remains available; Chart.js capture PNG shows actual charts; responsive layouts at defined widths; `getPublicDashboardData` still contains aggregate only.

## 3. Record management (`page-records`)

**Goal:** locate and update an epidemiological event with minimal ambiguity and no accidental data loss.

**Layout:** search/filter block as allowed by available data; structured table (`recordBody`) showing receipt date, disease/event, village/area, lifecycle, owner, recorder, attachments and permitted actions; one visible `เพิ่มข้อมูลใหม่` action for authorized editors.

**Entry/edit form** (`recordModal`, preserving `buildRecordForm`, `openRecordForm`, `saveRecord`): present grouped sections rather than one unstructured wall:
- 1. **รับแจ้ง:** date received, notifier, surveillance type, event/disease and event type.
- 2. **สถานที่และเวลา:** onset, province, district, subdistrict, village number/name/code, incident location.
- 3. **รายละเอียดและตรวจสอบ:** narrative, verification status and method, criteria determination, risk and notified parties.
- 4. **มาตรการและการสอบสวน:** investigation type, decision/date, actions and action date.
- 5. **Review before save:** highlighted missing/contradictory fields, summary and permission-specific action.

Groups are visual; do not change underlying `col2 ... col30` mapping or server schema. If a stepper is later approved, preserve edit review of all fields and do not silently drop values hidden between steps.

**Acceptance:** EventID/Revision retained, required/optional semantics unchanged, explicit error if expectedRevision is stale, disabled while save request in flight, no duplicate submit, accessible labels and clear backend validation, warnings advisory unless the current server enforces otherwise. Existing close/reopen/void, owner assignment and attachments remain separate guarded actions.

## 4. AI preliminary report (`page-reporter`)

**Goal:** operator immediately knows whether a report exists and what the single safe next action is for each event.

**Information order:** event identity + area/date → readiness summary → registered report state/history → exactly **one contextual primary report action** per row → persistent job status and available resulting document.

**Suggested labels (must be reconciled with existing G-33 state machine and approved Thai copy):**

| Effective state | UX presentation | Safety |
| --- | --- | --- |
| No registered report, permission granted | `สร้างรายงานด้วย AI` | Readiness first; warn about unsupported/missing facts |
| Registered report exists | `เปิดรายงานล่าสุด` + history | Never create a new report from click on existing report |
| Explicit new-report request | Separate `สร้างรายงานฉบับใหม่` flow after history and confirmation | Old registry record retained, new version appended |
| Queued/running | `กำลังสร้างรายงาน...` with stage/status and option to minimize window | Duplicate start disabled; restoring view does not start a second job |
| Cancelling/cancelled | Distinct labelled status and safely available actions | No false success; only server-confirmed cancelled |
| Unknown/recovery pending | `ยังไม่ยืนยันผลการสร้างรายงาน` with recover/status path | Do not claim report succeeded or automatically retry as a new job |
| Failed | Error + whether it is safe to retry; explicit operator action | No silent retry/extra Gemini calls |

**Acceptance:** G-17 registry append-only, G-26 advisory readiness, G-27 report history, G-32 job states and one-active-job control, G-33 single primary action, safe URL verification, logout/session race tests and no duplicate AI invocation. All automated tests use mocked report jobs and synthetic events only. Human review of generated draft remains mandatory.

## 5. Admin (`page-admin`)

**Goal:** move from a very long page to navigable **in-page workspaces** while retaining the same server APIs and authority.

| Proposed workspace | Existing UI anchors | UX requirements | Risk checks |
| --- | --- | --- | --- |
| Overview / install status | `akUsers`, `akActive`, `akAreas`, `akEvents`, `installStatus` | Compact KPI + current install state, separate repair command with confirmation | `repairSystem()` must never run on load/tab click |
| Settings & branding | `set_*`, `logoFile`, `adminLogoPreview` | Organize identity, theme, system-open/closed and integration settings, save confirmation, file validation | Secrets masked; never put API key into logs, telemetry or unsafe preview |
| Users & access | `userBody`, `userSearch`, `userModal` | Search/filter, clear roles/account state, status and reset-password affordances | Mutations Manager/Super Admin only |
| MasterData | `masterTypeFilter`, `masterSearch`, `masterDataBody`, `masterDataModal` | Explain Type policy; protected criteria/verify statuses obvious | Preserve controlled enumerations and validation |
| AreaMaster & import | `areaBody`, `areaSearch`, `areaImportFile`, `areaModal` | Hierarchy, CSV/XLSX preview/validation, no accidental duplicate import | Import is a mutation and requires explicit operator action |
| Notices/content | `contentAdminList`, `contentModal` | Draft/published state, preview, category and safe link validation | Content visibility and URL handling retained |
| Audit & retention | `auditBody`, `auditRetentionStatus`, `archiveAuditBtn` | Separate read-only audit exploration from archive control | Archive requires explicit confirmation; copy/verify guard unchanged |

**Loading:** Current `loadAdmin()` loads several datasets via `Promise.allSettled`. Proposed tabs can lazily fetch on first view, provided the implementation preserves auth, error and stale-session guards and does **not** add hidden write operations. A pending Admin subrequest must not leak after logout.

**Acceptance:** each admin subsection reachable from keyboard, correct role-gated visibility and server permission, no unintended writes on tab change, accurate loading/failure states, safe import/repair/archive confirmation.

## 6. Notices, guidelines and manuals (`page-library`)

**Goal:** make trusted reference material easy to scan/find.

**Layout:** simple page heading → optional category and search tools using currently available content fields → publication cards for title/description/category/action. No invented approval workflow or external CMS. Empty state differentiates no published content and search with no results.

**Acceptance:** public list shows only content currently allowed for anonymous users; external links have explicit purpose, safe URL handling and appropriate `target`/`rel`; long Thai titles wrap; no new exposure of draft content.

## 7. Authentication, session and global feedback

- **Login** (`loginModal`): visible labels, input types, password reveal if approved (must not affect storage), submitting/invalid/unavailable states, keyboard focus and role-relevant next route.
- **Registration:** only if `ALLOW_SELF_REGISTER=true`; explain that new accounts are pending approval (not auto-authorized).
- **Session banner/auth box:** distinguish signed-out/public vs signed-in, show allowed navigation; remove private cached UI immediately on logout, and ignore callbacks from earlier tokens.
- **Closed-system banner:** current `closedBox` means recording/report actions closed while Dashboard remains readable; preserve precise communication.
- **Status feedback:** accessible toast/status and action-specific inline error; failures must not be rendered as success.

## 8. Existing modal inventory — all 13 surfaces

The following IDs are observed in `src/web/03-modals.html`. All must be reviewed, even if the visible HTML is moved to shared components later.

| ID | Purpose / critical UX requirement |
| --- | --- |
| `loginModal` | Login + optional registration, status and focus |
| `recordModal` | Add/edit event; multi-section field navigation and unsaved changes |
| `ownerModal` | Assign/reassign owner; only eligible active users and expectedRevision |
| `attachmentModal` | Add/view/remove files, upload progress, document privacy |
| `reportHistoryModal` | Read-only history, latest report and optional explicit new report path |
| `reportNewConfirmModal` | High-friction deliberate new report confirmation; no silent recreation |
| `reportResultModal` | Job progress, minimize/restore, cancel request, result link only after verified registration |
| `reportCancelConfirmModal` | Explicit cancellation, no false terminal status |
| `reportReadinessModal` | Advisory warnings and human decision to continue |
| `userModal` | Role/status/user edits, password reset control |
| `masterDataModal` | Policy-controlled enum fields, active flag and validation |
| `areaModal` | Village/area fields, code and status |
| `contentModal` | Announcement/guideline categories, description, URL, draft/published |

**Common dialog acceptance:** semantic dialog title, keyboard entry, focus trap and return, Escape behavior defined per pending operation, nested dialog z-index test, no overlay scroll-through, no auto-mutating close, readable mobile height/scroll region and confirmation copy matched to server action. Include floating `reportTaskIndicator` as a **separate global control** (not a fourteenth modal).

## 9. Proposed UI component/test coverage mapping

| Shared component | Pages & surfaces using it | Contract test ideas |
| --- | --- | --- |
| `AppShell` / `NavItem` | All five pages, role-dependent nav | Active-state, mobile drawer, stale session, no unauthorized links |
| `FilterBar` | Dashboard, records where data supports it, admin tables | Selected filters survive redraw, clear filters, late requests ignored |
| `MetricCard` | Dashboard, admin overview | Number formatting, definition and denominators, zero vs no-data |
| `ChartPanel` | Dashboard four widgets | Same series, empty handling, text/table alternative, PNG export |
| `DataTable` / responsive record rows | Dashboard authorized view, records, reporter, admin | Role-specific actions, keyboard headers, overflow and mobile |
| `FormField` / `FormSection` | Record, user, master, area, content, settings, login | Label, error, required info, locale, async lock, focus |
| `StatusBadge` / `InlineNotice` | Risk, lifecycle, readiness, report job, closed system | Textual state, contrast and no color-only signal |
| `ConfirmDialog` | New report, cancel, close/reopen/void, archive/repair | Confirmation cannot be bypassed and no duplicate write |
| `Toast` / `AsyncState` | Entire application | Correct success/error/unknown, ARIA live, old-session callbacks dropped |

**Names are design vocabulary, not implemented modules.** A shared template/renderer is permitted, but avoid inventing framework APIs that do not exist in the current repo.

## 10. Core acceptance journey matrix (synthetic/offline first)

| Case | Initial state | Expected outcome |
| --- | --- | --- |
| J01 Public first load | No token | Aggregate KPIs/charts and library only; no row details |
| J02 Dashboard filter race | Change dates quickly | Only newest results shown; no stale chart or count |
| J03 Dashboard export | Public synthetic aggregates and authorized event dataset, tested separately | Public aggregate PNG includes Chart.js canvases only; authenticated PNG also works; raw Excel export remains permission-gated |
| J04 Staff view | Staff token | No record/report/admin mutation affordances; allowed read/export semantics retained |
| J05 Revision collision | Event changed by another user | Save rejected with actionable reload; no overwrite |
| J06 Owner & attachment | Authorized event | Owner/attachment changes audited and permission-checked |
| J07 Close/reopen/void | Confirmed mutation with reason | Lifecycle and revision maintained; cancel leaves state untouched |
| J08 First report | No registered report | One primary start action, readiness review before actual start |
| J09 Existing report | One or more registered reports | Primary action opens latest registered doc; never implicitly regenerates |
| J10 Report job progress | Running/unknown/cancelled mock | Status distinctions clear; no duplicate start or false completion |
| J11 Session logout mid-request | Pending authenticated response | Private rows/report metadata are not repainted |
| J12 Admin high-risk action | Visit Overview/Audit | No installer/archive automatically invoked |
| J13 Admin import | Invalid/duplicate synthetic area data | Validation visible and no accidental mass mutation |
| J14 Responsive and keyboard | 360/390/768/1024/1440 px | Navigation, modal, form and chart are usable |
| J15 Broken asset network | Font/icon/chart dependency blocked | Graceful failure/fallback; never silently misstate data or submission result |

**Test scope:** Visual regression snapshots, programmatic keyboard/dialog contract tests, chart synthetic data checks, existing Node tests. A browser-verified GAS deployment against test/synthetic data is a separate permission gate; no automatic live Google Workspace, patient records or Gemini report runs.

## 11. Copy glossary and interaction consistency

Proposed Thai-first labels to standardize in design review, while preserving official domain status values:

| Concept | Suggested visible label | Avoid |
| --- | --- | --- |
| Dashboard entry | `ภาพรวมสถานการณ์` | Unexplained "Analytics" |
| Qualifying events | `เข้าเกณฑ์สอบสวนโรค` | "สอบสวนแล้ว" as a synonym |
| Investigation completed marker | `ลงสอบสวนโรคแล้ว` | Claiming completion for events without date |
| Report page heading | `สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI` | Treating drafts as automatically approved reports |
| Report unknown | `ยังไม่สามารถยืนยันผลการสร้างรายงาน` | "สำเร็จ" on missing registry |
| Report draft link | `เปิดร่างรายงาน` | "รับรองรายงาน" without human review |
| Event status | `สถานะเหตุการณ์` | Mixing lifecycle and risk classification |
| System closed | `ปิดการบันทึกและสร้างรายงานชั่วคราว` | "ระบบไม่พร้อมใช้งาน" when Dashboard is still readable |

## 12. Product-fit corrections: operational wireframes and safe interaction specs

These directions supersede any **generic chart-first** or **forced wizard-stepper** interpretation of the initial wireframes. They are design proposals grounded in the current server/browser contract. Visual Figma QA remains NOT VERIFIED.

### 12.1 Dashboard: two distinct experiences, one data contract

**Public dashboard:**

```text
[Smart SRRT / ภาพรวมสถานการณ์ • ข้อมูลสถิติรวม]
[พื้นที่: จังหวัด → อำเภอ → ตำบล → หมู่บ้าน] [ช่วงวันที่] [ค้นหา]
[เหตุการณ์ทั้งหมด] [เข้าเกณฑ์สอบสวน] [ลงสอบสวนแล้ว] [อัตราตามเกณฑ์]
[คำอธิบายนิยามตัวชี้วัด + ขอบเขต/ช่วงเวลาข้อมูล]
[แนวโน้มรายเดือน] [จำนวนเหตุการณ์ตามพื้นที่]
[กลุ่มโรค] [ระดับความเสี่ยง]   [ข้อควรระวังการตีความข้อมูลสรุป]
[บันทึกภาพ Dashboard สรุป]       (NO raw events/IDs/raw Excel export)
```

**Authenticated officer dashboard:** same four KPI calculations and filters; add an **operational follow-up strip** derived only from authorized `allData` and current `col17/col26` semantics. Display explicit labels such as **เข้าเกณฑ์และยังไม่ระบุวันที่ลงสอบสวน** and scope of filter, rather than an invented algorithm that "predicts" risk. Put searchable/sortable (where implemented) event worklist **before the long chart gallery**. Use a compact top chart row, make remaining charts secondary and accessible by section anchors. Staff can view/export data but must never see create/edit/report action controls without permission.

**Public PNG export note:** the existing public `captureDashboard()` control is inside `captureArea` and captures the aggregate KPI/insight/chart region, whereas raw Excel buttons are within `eventDetailPanel` and are hidden from anonymous users. Retain safe public capture of aggregate information; prevent capture/export of private incident rows.

**Data caution:** a public `byVillage` bar is itself a potentially sparse aggregate. Do not infer patient identity or add tiny-group drill-down, direct links to individual event rows, or named patient-level alerts. Privacy/small-cell policy requires a separate backend decision, not a UI-only switch.

**KPI copy:** `ลงสอบสวนโรคแล้ว` means qualifying records (`col17` == `เข้าเกณฑ์`) with investigation date `col26`, **not** signed-off investigations or completed AI reports. Display numerator/denominator near the rate. If no qualifying events, show a meaningful `0 / 0` explanation, not a fake 100% completion.

### 12.2 Event form: one page, five anchored groups (not a new workflow engine)

Actual current `fields[]` contains **26 declared fields**. Preserve their `colN` mapping, including unusual source order. Group them visually, without changing the stored schema:

| Group | Existing source field IDs | Operator-oriented heading |
| --- | --- | --- |
| Receive & classify | `in2,in3,in4,in5,in6,in7` | รับแจ้งและจำแนกเหตุการณ์ |
| Place & onset | `in9,in8,in13,in12,in11,in10,in29,in30` | เวลาและสถานที่เกิดเหตุ |
| Verify & assess | `in14,in15,in16,in17,in19,in20,in23` | รายละเอียด การตรวจสอบ และความเสี่ยง |
| Investigate & respond | `in18,in24,in26,in21,in22` | การสอบสวนและมาตรการ |
| Final review | **No additional persisted fields** | ตรวจทาน / คำเตือน / บันทึกหรือยกเลิก |

Avoid making the source-mapped `in*` keys user-facing. Keep users free to switch among sections and scroll, with sticky Save/Cancel region only where it does not obscure mobile inputs. The step indicator in the early Figma draft is **not a mandatory validation wizard**.

Important current logic to preserve: area selects cascade; deprecated MasterData values may appear as disabled/inactive legacy options while editing existing records; closed events cannot be edited until reopened; expectedRevision mismatch must offer reload without silent overwrite; consistency warnings are advisory and must not be disguised as a server-imposed required field. Bind each label to its input and mark required only after checking actual server validation rules.

### 12.3 Event statuses: do not collapse five different classifications

| Dimension | Current source | Proposed UI presentation |
| --- | --- | --- |
| ตรวจสอบข้อเท็จจริง | `col15` + `col16` | Verification status, method/detail |
| เข้าเกณฑ์สอบสวน | `col17` | Criterion decision, not same as investigation |
| การลงสอบสวน | `col24`, `col26` | Investigation decision and date, not report approval |
| ความเสี่ยง | `col19` | Risk label with textual level |
| สถานะเหตุการณ์ | `recordStatus`, `eventLifecycle` | Lifecycle derived from data plus closed/void |
| สถานะร่างรายงาน AI | ReportRegistry/G-32 job state | Separate report lifecycle, including unknown/cancel |

Risk red/yellow/green must **never** be used as the sole cue for lifecycle or verification. Avoid converting any of these into one generic `status` badge.

### 12.4 AI report: emphasize trustworthy action and job certainty

The report page should use **event name/date/area** as context; show readiness reason and registry state in a compact summary and exactly one primary action. A successful job is not equivalent to a **human-reviewed clinical/epidemiological report**. Show draft warning near registered link.

```text
[สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI]
[ค้นหาเหตุการณ์...] [ตัวกรองเฉพาะข้อมูลที่มีจริง]
[เหตุการณ์] [ความพร้อม] [ประวัติรายงาน] [การดำเนินการหลัก]
[ตัวอย่างเหตุการณ์] [มีข้อควรตรวจ] [2 ฉบับ] [ดูรายงาน (2)]
                         (สร้างฉบับใหม่ทำผ่าน History + Confirm)
[Job: รอเริ่ม / กำลังสร้าง / กำลังบันทึก / ยกเลิก / ยังไม่ทราบผล]
[ข้อความเตือน: AI ทำร่างรายงาน ต้องตรวจทานก่อนนำไปใช้]
```

For `unknown` status do not use reassuring spinner alone; provide a meaningful **ตรวจสอบสถานะก่อนสร้างซ้ำ** action. Minimize/restore the job dialog without triggering another report, maintain the floating task indicator's keyboard reachability, and honor `reportSummaryState` fail-closed behavior.

### 12.5 Admin: in-page workspaces and explicit dangerous-action boundaries

Use a left subnav or segmented secondary tabs inside the existing Admin page. **Overview is not an action hub:** installation status is read-only; `repairSystem` must require a deliberate labeled action and confirmation. Separate archive and import from all navigation or background loads. Use explicit loading/error/permission states when switching subviews.

On Mobile, avoid presenting all seven sections at once. Use a section picker while keeping the currently selected state obvious and readable. Users without `Manager`/`Super Admin` permission must not have access to Admin data regardless of display changes.

### 12.6 Design mockup validity and review

- Existing **Figma frames**: only Dashboard desktop + Events desktop (working draft); **no screenshot-based visual QA** due Starter-plan Figma MCP limit. Do not label them as approved high-fidelity UI.
- Figma nodes currently use **Noto Sans Thai**; running site loads **Prompt**. Match Prompt or explicitly approve/test substitution (line breaks and card heights will shift).
- Every Figma screen contains a visible **ข้อมูลตัวอย่างเพื่อการออกแบบ** marker; illustrative counts, locations and events are synthetic and not live SRRT evidence.
- A real release design must add the other three primary screens, mobile/tablet states and the 13 existing dialogs, or document precise reusable component mappings.
- No misleading illustration of automatic AI fact verification, report sign-off, notifications or clinical diagnosis, because those features are not supported.

## 13. Responsive prototype refinement and design gate (UX-R1.1)

**Source of observation:** offline UX prototype with *synthetic-only* incident rows and report states; screenshot inspection of the first mock mobile dashboard revealed horizontal scrolling of event/workflow tables that obscured high-value status labels and primary buttons.

### 13.1 Design correction — mobile record cards

At widths **360–640 CSS px**, replace the *visual presentation* of the Dashboard authorized follow-up table, Event Management table and AI Reporter table with vertically stacked semantic **incident cards**. At desktop/tablet widths above 640 CSS px, continue to use the existing information-dense tables unless a usability check suggests otherwise. This is a visual/DOM representation choice, not a separate dataset or backend API.

| Surface | Card header and context | Required statuses | Primary action |
| --- | --- | --- | --- |
| Authenticated Dashboard worklist | Event title and receipt date | Area, verification, criteria and investigation/date indicator | View event details (role-gated) |
| Event Management | Event and date/area | Verification, criteria, risk and lifecycle; owner/attachments if the source view currently includes them | View/edit according to server role and closed/revision state |
| AI Reporter | Event and area/date context | Readiness, registered-report count and job status, including unknown/blocked | Exactly **one** state-driven G-33 report action |

Do **not** hide missing data dimensions when converting rows to cards; if a field exists in the current table, the mobile representation must provide an equally accessible view. A desktop table may remain in the DOM as the **canonical semantic source**; prevent duplicate focusable actions or screen-reader duplicate content through carefully reviewed hidden/inert behavior, and ensure client-side filtering affects both presentations. Never clone stale buttons from previous-session rows.

**Public guests must not receive these authenticated cards**; visitors receive aggregate-only KPIs and accessible aggregate chart summaries. Switching user/session mid-request must clear the cards exactly like authorized raw table rows.

### 13.2 Prototype UX-R1.1 verification (not production UAT)

A separate browser-openable, standalone mock was refined after reviewing the mobile screenshots. Changes made **only in the conversational prototype, not in GitHub production code**:

- Dashboard, Events and AI Reporter receive mobile incident cards with status labels and accessible text/action buttons; desktop tables preserved.
- Event search synchronizes with mock mobile cards.
- Long Thai KPI labels receive additional room to wrap at narrow widths.
- Used local Chromium + Playwright `set_content` with viewports **360, 390, 768, 1440 CSS px**.
- All five top-level views were navigable; Events mock filter, seven Admin subsection navigation example (Audit selected), Library empty-search state, Public aggregate mode and report card visibility were checked.
- Observed in this smoke run: **no uncaught page JavaScript exception** and **no document-level horizontal overflow** at those four widths.

**Unverified:** pixel-by-pixel QA of every dialog, all 26 actual persisted form inputs, genuine Chart.js, actual Tailwind v4 compiled output, Apps Script IFRAME, server-side RBAC, keyboard/screen-reader accessibility conformance and real Google Workspace operations. The mock uses local sample charts, synthetic data and hand-authored CSS; it is **not** an approved production implementation.

### 13.3 Required future implementation acceptance

- Card/table parity for the same EventID, selected filters, active session and role.
- `Tab` reaches **one** actionable report button per Event in either layout, never duplicate hidden buttons.
- Date/criteria/investigation/risk/lifecycle remain semantically distinct with labelled statuses.
- Filters, zero-result state, long disease names, long Thai village names, screen zoom and modal focus are verified by deterministic UI checks plus human visual review.
- Preserve server permission, expectedRevision, one-active-report-job and unknown-state defenses independent of responsive mode.
- Retest image/Excel export only after Chart.js is implemented, with clear public-private data scopes.

## 14. Design review checklist and boundaries

- [ ] Confirm all 5 pages, 7 Admin workspaces, 13 modals and report indicator have mockups at desktop/tablet/mobile or a documented reuse pattern.
- [ ] Confirm code-specific IDs, event flows and authorization match current `src/web/*` + `docs/features.md`.
- [ ] Confirm no new fields, schemas, status values, backend calls or permissions are invented as already shipped.
- [ ] Review interactive/success/error/empty/loading states with synthetic content and Thai text at real wrapping lengths.
- [ ] Review privacy of public aggregates and small counts; do not promise anonymity that has not been assessed.
- [ ] Review AI report primary action, warning, prior-report history, cancellation and unknown state against G-32/G-33 tests.
- [ ] Record accessibility and mobile visual review results separately from unit/contract tests.
- [ ] Record owner-requested ChatGPT Technical Review (not distinct-author), then obtain Product Owner go/no-go for Phase P2 implementation, with separate merge/deploy gates.

**Current release disposition:** This file is a **planning deliverable only**. No frontend changes, external dependencies, Apps Script deployment, migrated records or real AI calls have been made by preparing it.
