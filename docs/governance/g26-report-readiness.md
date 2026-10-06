# G-26 — AI Report Readiness Warning Contract

Scope: G-26 AI report readiness warnings  
Parent: G-17 lightweight report registry  
Schema version: **7 (unchanged)**

## Purpose

G-26 adds a lightweight preflight before AI report generation.

The purpose is to warn the user when source Event data is incomplete or internally inconsistent enough to reduce report quality.

It does **not** create a hard workflow gate.

The system remains an AI-assisted draft generator and may still generate a report after the user explicitly accepts the warnings.

## No persistent readiness state

G-26 adds no:

- new MainData column;
- new sheet;
- readiness percentage;
- readiness score;
- persisted status;
- Event mutation;
- Event Revision increment.

Schema therefore remains:

**v7**

Readiness is derived at request time from the current Event snapshot.

## Server preflight

Authenticated RPC:

`getReportReadiness(sessionToken, eventId)`

Permission:

`report`

The function:

1. resolves the Event by stable EventID;
2. reads the current Event row;
3. derives readiness warnings;
4. returns the current Event identity/revision and warning result;
5. performs no persistence or AuditLogs write.

Response:

- `eventId`
- `revision`
- `recordStatus`
- `status`
- `warningCount`
- `warnings[]`

Each warning contains:

- `code`
- `category`
- `field`
- `message`

## Readiness status

G-26 deliberately does not compute a numeric score.

Status is qualitative:

### ready

No readiness warnings.

### review

Only report-quality/context or consistency warnings exist.

The report can still be useful, but the operator should review the listed gaps.

### limited

At least one core report-context warning exists.

The report is still allowed, but the generated draft will have material source-data limitations.

## Core report context

These fields are treated as core because they materially define the basic report subject:

### Received date

MainData col2.

Warning:

`MISSING_RECEIVED_DATE`

### Disease / Event

MainData col6.

Warning:

`MISSING_DISEASE_EVENT`

### Location context

At least one usable location value must exist among the existing report/location fields:

- col8 — สถานที่เกิดเหตุ
- col29 — ชื่อหมู่บ้าน
- col10 — หมู่
- col11 — ตำบล
- col12 — อำเภอ
- col13 — จังหวัด

Warning:

`MISSING_LOCATION_CONTEXT`

### Event details

MainData col14.

Warning:

`MISSING_EVENT_DETAILS`

If any core warning exists, status becomes `limited`.

## Report-quality context

These warnings do not make status `limited` by themselves.

### Reporter / source

MainData col3.

Warning:

`MISSING_REPORTER`

### Onset/start date

MainData col9.

Warning:

`MISSING_ONSET_DATE`

### Verification

MainData col15.

Blank or canonical `รอตรวจสอบ` is treated as not yet ready for high-quality report context.

Warning:

`MISSING_OR_PENDING_VERIFICATION`

### Investigation criteria

MainData col17.

Blank or canonical `รอดำเนินการ` produces:

`MISSING_OR_PENDING_CRITERIA`

### Coordination agency

The report prompt uses both notifying and receiving agency context.

A warning is emitted only when both are blank:

- col20 — หน่วยงานแจ้งเตือน
- col23 — หน่วยงานรับแจ้ง

Warning:

`MISSING_COORDINATION_AGENCY`

This avoids creating duplicate/noisy warnings when at least one coordinating agency is known.

### Control measures

MainData col21.

Warning:

`MISSING_CONTROL_MEASURES`

### Investigation decision/date

Investigation-decision warnings are context-specific.

They are evaluated when the Event is already classified as meeting investigation criteria.

If col24 is blank:

`MISSING_INVESTIGATION_DECISION`

If col26 is blank:

`MISSING_INVESTIGATION_DATE`

An Event that does not meet investigation criteria is not warned merely because investigation decision/date are blank.

## G-04 consistency warnings

G-26 reuses the existing:

`deriveEventConsistencyWarnings_()`

contract.

Every G-04 warning is surfaced in readiness as:

`CONSISTENCY_<existing-code>`

with category:

`consistency`

Examples include:

- verification says false while criteria says investigation required;
- criteria not met but investigation date exists;
- investigation marked completed without a date.

G-26 does not create a second competing consistency-rules engine.

## Browser flow

The existing AI button flow now performs:

1. open the blank report window synchronously;
2. show “กำลังตรวจสอบความพร้อมของข้อมูล...”;
3. call `getReportReadiness()`;
4. if there are zero warnings, generate immediately;
5. if warnings exist, show the operator a confirmation list;
6. if cancelled, close the blank window and stop;
7. if confirmed, continue the existing report-generation call;
8. generated report handling remains unchanged.

The report window is opened before asynchronous preflight so normal browser popup behavior remains compatible with the existing workflow.

## Soft-warning boundary

G-26 is intentionally advisory.

`generateReportFromWeb()` does **not** call:

- `getReportReadiness()`; or
- `deriveReportReadiness_()`.

Therefore direct authenticated report generation remains possible even when warnings exist.

This is intentional and prevents G-26 from silently becoming a hard workflow block.

If a future requirement calls for mandatory prerequisites, that must be designed and approved separately.

## Relationship to G-17

G-17 remains responsible for:

- ReportID;
- EventID;
- SourceRevision;
- Google Doc identity/URL;
- generator/time;
- actual Gemini model/API metadata;
- prompt version;
- template identity.

G-26 does not add readiness columns to ReportRegistry.

A report generated after warning acknowledgement is registered exactly like any other successful report.

## Closed Events

Closed Events remain eligible for AI report generation under G-19.

G-26 may still display missing/inconsistent source-data warnings for a closed Event.

Closure itself is not a readiness failure.

## Void Events

Void Events are not available through normal report generation because Event lookup excludes void records.

G-26 does not change that boundary.

## Audit

Readiness preflight does not write AuditLogs.

Only successful report generation continues to write the existing G-17 `GENERATE_REPORT` audit event.

This prevents repeated warning checks from creating unnecessary operational audit noise.

## Rollback

G-26 adds no persistent data.

Rollback only requires restoring the previous application/UI code.

No data migration or cleanup is necessary.

## Verification checklist

Before production release:

1. open an Event with complete report data and confirm readiness status `ready`;
2. blank a core field in staging and confirm status `limited`;
3. restore core fields but leave a quality field incomplete and confirm status `review`;
4. set verification to `รอตรวจสอบ` and confirm a soft warning;
5. set criteria to `รอดำเนินการ` and confirm a soft warning;
6. verify missing investigation decision/date is warned only when criteria is met;
7. create a G-04 inconsistent Event and confirm consistency warning reuse;
8. cancel the browser confirmation and confirm Gemini/report generation is not called;
9. accept the warning and confirm the report still generates;
10. confirm successful generation creates the normal G-17 ReportRegistry row;
11. confirm Event Revision does not change due to readiness preflight;
12. confirm preflight writes no AuditLogs entry;
13. confirm schema remains v7.
