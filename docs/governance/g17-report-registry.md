# G-17 — Lightweight AI Report Registry Contract

Scope: G-17 Lightweight report registry  
Parent: G-29 VisitLogs semantic cleanup  
Schema version: **7**

## Purpose

G-17 creates a durable registry for successfully generated AI-assisted preliminary investigation reports.

The registry provides traceability for:

- which Event produced the report;
- which Event revision was used as the source snapshot;
- which Google Doc was created;
- who generated it and when;
- which Gemini model/API version actually produced successful output;
- which prompt contract and template were used.

This is evidence and traceability only.

It is not a report approval, editing, replacement, or document-version workflow.

## Persistent structure

G-17 adds one dedicated sheet:

`ReportRegistry`

| Column | Header | Meaning |
|---:|---|---|
| 1 | ReportID | immutable UUID for the generated report record |
| 2 | EventID | stable source Event identity |
| 3 | SourceRevision | Event Revision read with the source snapshot |
| 4 | DocumentID | generated Google Doc file ID |
| 5 | DocumentURL | generated Google Doc URL |
| 6 | GeneratedAt | successful generation timestamp |
| 7 | GeneratedBy | authenticated generator email |
| 8 | GeminiModels | distinct successful Gemini model names in call order |
| 9 | GeminiApiVersions | distinct successful Gemini API versions in call order |
| 10 | PromptVersion | explicit report-prompt contract version |
| 11 | TemplateDocID | Google Docs template ID used |

MainData remains unchanged.

Schema moves:

**6 -> 7**

## Report identity

Each successfully registered report receives a new immutable UUID:

`ReportID`

The registry is append-only in G-17.

G-17 intentionally adds no:

- update registry operation;
- delete registry operation;
- replacement/version pointer;
- approval status.

Generating the same Event multiple times creates multiple independent ReportID rows. G-17 does not declare one of them “current” or replace older reports.

## Source Event snapshot

Before AI generation, the report flow resolves the Event by stable EventID and reads the current Event Revision.

That value is persisted as:

`SourceRevision`

The report content is generated from the Event row snapshot read at that point.

Creating a report does **not** mutate the Event and does not increment Event Revision.

This separates:

- Event data changes, which advance Revision; from
- report-generation evidence, which creates ReportRegistry rows.

## Prompt version

G-17 introduces the explicit application constant:

`REPORT_PROMPT_VERSION = 2026.10.06.1`

A successful registry row records that value.

Any future material prompt-contract change should advance the prompt version so generated reports remain traceable to the instructions used at creation time.

Prompt version is application metadata, not an approval/version-management workflow.

## Actual Gemini model metadata

The AI report is generated in two calls:

- sections 1–3;
- sections 4–6.

The existing Gemini client can retry/fallback across models and API versions.

Therefore G-17 does not merely record the initially selected model.

The successful-call path records the actual `currentModelInfo` that returned usable content.

A shared generation metadata collector gathers distinct successful:

- model names;
- API versions.

If both report parts use the same successful model/API version, one value is stored.

If fallback causes different successful models or API versions across the two parts, the distinct values are stored in successful-call order separated by:

` | `

This metadata describes what actually generated the report.

## Successful generation transaction

A report is considered successfully generated only after all mandatory steps succeed:

1. authenticate with existing `report` permission;
2. resolve EventID and source Revision;
3. generate AI analysis;
4. copy the configured report template;
5. replace report placeholders;
6. save and close the Google Doc;
7. append the ReportRegistry row;
8. write the `GENERATE_REPORT` AuditLogs entry;
9. return the generated Doc URL.

The registry is therefore part of the successful-generation contract, not a best-effort side effect.

## Orphan compensation

If a new Google Doc has been created but ReportRegistry append fails, the new Doc is moved to Trash.

This prevents an apparently generated operational report from remaining in the report folder without registry evidence.

The trashed Google Drive item remains recoverable under normal Drive behavior, but it is not returned to the user as a successful report.

No success AuditLog is written when registry creation fails.

## Audit

Successful generation writes:

`GENERATE_REPORT`

The Audit target is:

- TargetSheet: `ReportRegistry`
- TargetId: `ReportID`

The audit payload includes lightweight linkage evidence such as:

- EventID;
- SourceRevision;
- DocumentID;
- PromptVersion.

ReportRegistry remains the authoritative structured report-generation record.

## Permissions

G-17 does not introduce a new permission.

Generation continues to require existing:

`report`

permission.

The registry has no general editor API.

## Event linkage boundary

G-17 persists:

- EventID;
- SourceRevision.

That is sufficient registry-level linkage.

G-17 deliberately does **not** yet add:

- report count to Event rows;
- latest-report URL;
- report-history list in Event UI;
- “open reports for this Event” control.

Those Event-facing linkage features remain G-27.

## AI readiness boundary

G-17 does not decide whether Event data is sufficiently complete for report generation.

Readiness warnings/checks remain G-26.

G-17 records only reports that successfully pass through the current generation process.

## Safe sheet claim

`ensureReportRegistrySheet_()`:

- creates `ReportRegistry` if missing;
- writes the 11 expected headers;
- accepts the exact final schema idempotently;
- fills a blank expected header only when there is no data beneath that column;
- rejects unexpected nonblank headers;
- rejects hidden existing data under blank headers.

It does not reinterpret unrelated custom data.

## Migration entry point

Explicit migration:

`migrateG17ReportRegistry()`

It:

1. acquires ScriptLock;
2. creates/validates ReportRegistry;
3. advances schema to at least version 7;
4. reports existing registry-row count and prompt version;
5. never creates report records for historical Google Docs automatically;
6. never downgrades a future schema version.

Older migration floors remain independent:

- G-21 Audit retention -> at least 5
- G-29 VisitLogs -> at least 6
- G-17 ReportRegistry -> at least 7

## Existing historical reports

Pre-G-17 generated Google Docs cannot be reliably reconstructed into ReportRegistry automatically because the current system did not persist enough structured linkage/model/prompt evidence.

G-17 therefore does not guess or backfill historical report records.

Existing report files remain untouched.

Only reports generated by G-17-capable code receive complete registry evidence.

## Installer / repair

`installSmartSRRTCore_()` ensures the ReportRegistry sheet exists and reports its current row count.

Install/repair does not create synthetic report records and does not inspect/rewrite existing report documents.

## Rollback boundary

Routine code rollback should retain:

- ReportRegistry sheet;
- all registry rows;
- generated report Docs.

Older code can ignore the additional sheet.

Do not delete ReportRegistry during rollback because doing so would discard generation traceability.

Rolling back to pre-G-17 generation code would allow new reports to be created without registry evidence and is therefore not recommended once G-17 is adopted.

## Verification checklist

Before production release:

1. back up the primary database;
2. run `migrateG17ReportRegistry()`;
3. confirm the 11 ReportRegistry headers;
4. rerun migration and confirm idempotency;
5. confirm `SCHEMA_VERSION >= 7`;
6. generate a report from an Event;
7. confirm one new ReportID row exists;
8. confirm EventID and SourceRevision match the source Event snapshot;
9. confirm DocumentID/URL match the created Google Doc;
10. confirm GeneratedBy/GeneratedAt are populated;
11. confirm GeminiModels/GeminiApiVersions reflect successful calls;
12. confirm PromptVersion equals the configured report prompt version;
13. confirm TemplateDocID is recorded;
14. confirm Event Revision did not increment only because a report was generated;
15. confirm `GENERATE_REPORT` AuditLogs targets ReportRegistry/ReportID;
16. simulate registry append failure in staging and confirm the new Doc is not left as an operational orphan;
17. confirm no report-registry edit/delete endpoint exists.
