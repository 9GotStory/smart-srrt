# G-26 — AI Report Readiness Warning Contract

Scope: G-26 AI report readiness warnings  
Parent: G-17 Lightweight report registry  
Schema version: **7 (unchanged)**

## Purpose

G-26 helps users understand whether an Event has enough information for a useful AI-assisted preliminary report before generation.

Readiness is deliberately advisory. It checks for missing or pending information, not the correctness of clinical or epidemiological conclusions.

It does not become a mandatory data-completeness workflow, approval gate, or report-generation blocker.

The system remains able to generate a draft report from incomplete data using the existing prompt contract, which already requires missing information to be represented with placeholders or explicit limitations.

## Readiness levels

The derived readiness result has three levels:

| Level | Meaning | Generation |
|---|---|---|
| `ready` | no material readiness warnings | allowed |
| `review` | important gaps and/or consistency warnings exist | allowed after warning |
| `limited` | one or more core report inputs are missing | allowed after stronger warning |

Every readiness result returns:

`canGenerate: true`

G-26 must not change this into a hidden hard gate. 

Even when the level is `ready`, the result only means no warnings were found by these specific deterministic checks. It **does not certify completeness, correctness, or suitability for official publication**. AI-generated drafts require human review.

## Core report inputs

Missing core inputs produce `limited`.

### Received date

Source:

`MainData col2`

Reason:

The report background and event timeline depend on the received date. 

For every checked field, an empty value, only dots/ellipsis/dashes, or an explicit placeholder such as `ไม่ทราบ`, `ไม่ระบุ`, `ไม่มีข้อมูล`, or `ข้อมูลไม่ปรากฏ` counts as unavailable. This prevents placeholder text from creating misleading `ready` results.

Warning code:

`REPORT_CORE_RECEIVED_DATE_MISSING`

### Disease / event

Source:

`MainData col6`

Reason:

This is the report's primary subject.

Warning code:

`REPORT_CORE_EVENT_MISSING`

### Location

A location is considered available when at least one of the following is present:

- col8 — place/event location
- col10 — village number
- col11 — tambon
- col12 — amphoe
- col13 — province
- col29 — village name

Warning code when all are blank:

`REPORT_CORE_LOCATION_MISSING`

### Event / investigation narrative

Source:

`MainData col14`

Reason:

The AI prompt uses this as the main factual narrative for investigation analysis.

Warning code:

`REPORT_CORE_NARRATIVE_MISSING`

## Important report inputs

Missing important inputs produce `review` when no core input is missing.

### Reporter/source

Source: col3

Warning:

`REPORT_REPORTER_MISSING`

### Onset date

Source: col9

Warning:

`REPORT_ONSET_DATE_MISSING` 

### Verification result

Source: col15

Missing verification produces `REPORT_VERIFICATION_MISSING`; `รอตรวจสอบ` produces `REPORT_VERIFICATION_PENDING`.

### Risk assessment context

Source: col19

Missing risk context produces `REPORT_RISK_MISSING` so users can verify AI risk analysis against actual evidence rather than treat generated conclusions as recorded facts.

### Investigation criteria

Source: col17

Warning:

`REPORT_CRITERIA_MISSING` 

When col17 is `รอดำเนินการ`, warning `REPORT_CRITERIA_PENDING` is returned instead of treating the pending decision as completed.

### Control measures

Source: col21

Warning:

`REPORT_MEASURES_MISSING`

### Responsible/receiving agency context

At least one of:

- col20 — notified agency
- col23 — receiving agency

should be present.

Warning when both are blank:

`REPORT_AGENCY_MISSING`

### Investigation date

If the Event lifecycle indicates investigation has occurred or col24 explicitly says `ลงสอบสวน`, but col26 is blank:

`REPORT_INVESTIGATION_DATE_MISSING`

## Consistency warnings

G-26 reuses G-04 consistency warnings instead of creating a second contradictory-rule engine.

Each G-04 warning is surfaced as a readiness warning using:

`REPORT_CONSISTENCY_<G04_CODE>`

with severity:

`consistency` 

If G-04 already reports `INVESTIGATION_MARKED_WITHOUT_DATE`, G-26 suppresses its overlapping general investigation-date warning, preventing two warnings for one underlying inconsistency.

Examples include:

- criteria says not met but investigation date exists;
- verification rejected but investigation evidence exists;
- investigation decision contradicts investigation date.

Consistency warnings produce `review` unless a core missing field already makes the readiness level `limited`.

## Derived result shape

`deriveAIReportReadiness_(event)` returns:

- `level`
- `label`
- `canGenerate`
- `warningCount`
- `coreMissingCount`
- `importantMissingCount`
- `consistencyWarningCount`
- `warnings[]`

Each warning includes:

- `code`
- `severity`
- `field`
- `message`

The result is deterministic from the Event data supplied to the function.

No scoring model or probabilistic classifier is used.

## Authenticated Event rows

Authenticated Event rows expose:

`aiReportReadiness`

as derived metadata.

This enables lightweight status badges in the Event/report views.

Readiness is not persisted into MainData.

## Fresh pre-generation check

Browser badges are informational and may become stale as Event data changes.

Therefore pressing the AI report button does not rely solely on the readiness already present in `allData`.

The browser calls:

`getAIReportReadiness(sessionToken, eventId)`

immediately before generation.

The server:

1. requires existing `report` permission;
2. resolves the Event by stable EventID;
3. reads the latest current Event row;
4. derives readiness from that row;
5. returns the warning result.

This keeps the warning relevant to the current stored Event.

## Browser behavior

### Ready

If the latest server readiness is:

`ready`

the report proceeds normally.

### Review / limited

The browser opens the readiness modal and shows:

- readiness label;
- warning count;
- each warning grouped visually as core / important / consistency;
- a reminder that readiness is advisory.

The user can:

- **กลับไปตรวจข้อมูล** — stop and edit/check the Event; or
- **สร้างรายงานต่อ** — explicitly continue generation. 

The Reporter view shows the generation control only to roles already permitted to generate reports. Staff have no report action; server-side `report` authorization remains authoritative.

The continue path calls the normal:

`generateReportFromWeb()`

operation.

## No server-side readiness block

`generateReportFromWeb()` deliberately does not call:

- `getAIReportReadiness()`
- `deriveAIReportReadiness_()`

and does not reject based on:

- readiness level;
- warning count;
- `canGenerate`.

This is an explicit architectural boundary.

The readiness RPC is a pre-generation advisory UX, not an authorization or data-integrity gate.

Existing true generation requirements remain authoritative, such as:

- valid authenticated `report` permission;
- non-void Event lookup;
- configured template/report folder;
- configured usable Gemini API;
- successful AI/Doc/registry operations.

## Closed Events

G-19 allows AI report generation from closed Events.

G-26 does not change that rule.

A closed Event can still have readiness warnings and can still generate a report.

## Persistence

G-26 adds no:

- sheet;
- MainData column;
- ReportRegistry column;
- SystemSettings readiness state;
- migration.

Schema remains:

**v7**

Readiness is recalculated from current Event data whenever needed.

This prevents stale readiness state and avoids another synchronization problem.

## Relationship to ReportRegistry

G-17 records successfully generated reports.

G-26 does not add readiness fields to ReportRegistry.

The ReportRegistry remains focused on generation evidence:

- source Event;
- source Revision;
- generated document;
- generator/time;
- model/API;
- prompt/template metadata.

If future requirements require historical readiness evidence, that should be specified explicitly rather than silently expanding G-17.

## Relationship to G-27

G-26 does not add report-history linkage UI.

G-27 will use ReportRegistry to connect generated reports back to Events.

Readiness badges/warnings remain separate from report-history state.

## Popup behavior

The browser opens a temporary blank window on the original report-button click so successful ready-path generation does not get blocked by browser popup rules after asynchronous readiness checking.

If warnings are found, that temporary window is closed and the readiness modal is shown.

When the user explicitly selects **สร้างรายงานต่อ**, a new report window is opened from that direct user action.

## Rollback

G-26 has no persistent migration and therefore needs no data rollback.

Rolling back G-26 removes:

- readiness derived metadata;
- readiness RPC;
- badges;
- pre-generation warning modal.

Event data, ReportRegistry and generated reports remain unchanged.

## Verification checklist

Before production release:

1. open an Event with complete report inputs and confirm readiness is `ready`;
2. remove only an important field and confirm `review`;
3. remove a core field and confirm `limited`;
4. confirm every level returns `canGenerate=true`;
5. create a G-04 consistency contradiction and confirm it appears in readiness;
6. confirm geographic fields satisfy the location requirement even when free-text col8 is blank;
7. confirm the Event/report table shows a readiness badge;
8. change the Event after loading the page, then press AI and confirm the latest server readiness is used;
9. confirm `review/limited` opens the warning modal;
10. confirm **กลับไปตรวจข้อมูล** cancels generation;
11. confirm **สร้างรายงานต่อ** successfully reaches normal generation;
12. confirm `generateReportFromWeb()` contains no readiness hard gate;
13. confirm closed Events can still generate reports;
14. confirm schema remains v7 and no readiness persistence structure was added.
