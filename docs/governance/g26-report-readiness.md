# G-26 — AI Report Readiness Warning Contract

Scope: G-26 AI report readiness warnings  
Parent: G-17 Lightweight report registry  
Schema version: **7 (unchanged)**

## Purpose

G-26 helps users review Event data before generating an AI-assisted preliminary investigation report.

It is deliberately advisory.

It does not introduce an approval workflow, readiness score, mandatory checklist, or hard generation gate.

## Readiness states

The server computes one of two states:

- `ready` — no readiness warnings were found
- `review_recommended` — one or more warnings were found

Every non-void Event that is otherwise eligible for the existing report operation returns:

`canGenerate = true`

Warnings therefore mean:

**ควรตรวจข้อมูลก่อน**

not:

**ห้ามสร้างรายงาน**

## Persistence

Readiness is computed on demand from the current Event row.

G-26 adds:

- no new sheet;
- no new MainData column;
- no readiness status field;
- no Event mutation;
- no Event Revision increment.

Schema remains:

**v7**

## Important warnings

The following source data is classified as important because it directly affects the report title/template or core narrative:

- received date — MainData col2
- reporter / notifying source — col3
- disease / event — col6
- location — derived from col8 and structured area fields
- event details — col14

Missing location is raised only when both the free-text location and structured geographic fields are absent.

## Recommended warnings

The following fields are advisory completeness checks because the current AI prompt uses them or they materially improve the resulting report:

- onset date — col9
- verification result — col15
- investigation criteria — col17
- risk assessment — col19
- alerting agency — col20
- control measures — col21
- receiving agency — col23
- investigation date — col26 when col24 says investigation was performed

These remain warnings only.

The report prompt already contains fallback language for incomplete source data and therefore G-26 does not invent missing values.

## Consistency warnings

G-26 reuses G-04 Event consistency warnings.

Examples include:

- verification says the event is false but investigation criteria is met;
- investigation date exists despite criteria/status combinations that conflict;
- investigation is marked as performed but no investigation date exists.

G-04 warnings are surfaced as:

`severity = important`

inside the readiness result.

When a readiness-specific warning and a G-04 warning have the same human-readable message, G-26 emits it once rather than duplicating the warning.

## Server API

Authenticated RPC:

`getReportReadiness(sessionToken, eventId)`

requires the existing:

`report`

permission.

The response contains:

- EventID
- SourceRevision
- current Event lifecycle
- prompt version
- readiness status
- canGenerate
- warning counts
- warning list

This RPC does not call Gemini and does not create a Google Doc.

## Hard-gate boundary

The authoritative report function:

`generateReportFromWeb()`

does **not** call `getReportReadiness()` or `deriveReportReadiness_()`.

It does not reject an Event because:

- status is `review_recommended`;
- warningCount is nonzero;
- an important/recommended readiness warning exists.

This separation is intentional.

The readiness layer assists the operator; it does not redefine report authorization or workflow.

Existing hard requirements such as authentication, report permission, valid Event lookup, Gemini configuration, template configuration, and successful registry creation remain unchanged.

## Browser flow

When the user clicks an AI report button:

1. the browser opens a temporary blank report window to preserve popup permission;
2. calls `getReportReadiness()`;
3. if there are no warnings, generation continues normally;
4. if warnings exist, the temporary window is closed;
5. a readiness modal lists the warnings;
6. the user can choose:
   - **กลับไปตรวจข้อมูล**
   - **สร้างรายงานต่อ**
7. if the user chooses to continue, a fresh report window is opened from that explicit click and normal generation begins.

## Warning presentation

Warnings use two presentation levels:

### สำคัญ

Used for:

- missing core report source data;
- G-04 consistency contradictions.

### แนะนำ

Used for:

- useful but non-blocking completeness fields.

No percentage, score, traffic-light threshold, or approval badge is calculated.

This avoids turning advisory completeness into a false formal quality metric.

## Closed Events

G-19 permits report generation from a closed Event.

G-26 follows that boundary.

A closed Event may receive readiness warnings and may still proceed to generation.

G-26 does not require reopening merely to create a report.

## Void Events

Void Events remain excluded by the existing stable Event lookup used by the report/readiness RPC.

G-26 does not redefine that boundary.

## Relationship to G-17

G-17 remains responsible for successful generated-report evidence:

- ReportID
- EventID
- SourceRevision
- Google Doc
- model/API metadata
- prompt version

G-26 runs before generation to advise the user.

It does not write into ReportRegistry.

If the user proceeds, G-17 handles the normal successful-generation transaction.

## Relationship to G-27

G-27 will later expose generated ReportRegistry records back on Event-facing UI.

G-26 does not add report-history links/counts.

## Audit

Simply checking readiness does not write AuditLogs because it is a read-only diagnostic operation.

If the user proceeds and a report is successfully generated, the existing G-17 `GENERATE_REPORT` audit applies.

## Rollback

G-26 has no persistent migration.

Routine rollback requires no data conversion.

Removing G-26-capable UI/API simply removes the advisory pre-generation review; ReportRegistry and generated reports remain unchanged.

## Verification checklist

Before production release:

1. choose a complete Event and confirm readiness returns `ready`;
2. confirm no-warning flow generates normally;
3. remove/blank core staging data and confirm important warnings appear;
4. blank recommended fields and confirm recommended warnings appear;
5. create a G-04 contradictory Event and confirm the consistency warning appears;
6. confirm duplicate investigation-date warning is not shown twice;
7. confirm the warning modal allows returning without generation;
8. confirm **สร้างรายงานต่อ** still generates the report;
9. confirm direct `generateReportFromWeb()` does not hard-block on readiness;
10. confirm readiness check does not modify Event Revision;
11. confirm no readiness state is persisted;
12. confirm schema remains v7.
