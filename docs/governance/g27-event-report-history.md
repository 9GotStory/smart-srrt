# G-27 — Event-linked AI report history

Scope: G-27 only, stacked on G-26 (Draft PR #50).
Parent: G-17 append-only ReportRegistry.
Schema: **v7 unchanged**.

## Purpose and source of truth

G-27 makes registered Google Docs reports discoverable from authenticated Event and AI Reporter views. The sole persistent source is G-17 ReportRegistry (11 columns); the relationship is immutable EventID, never a sheet row number. Multiple reports are separate generation records. SourceRevision identifies the Event snapshot, not a document replacement/version chain.

There is no Google Drive folder scan, guessed backfill of pre-G-17 documents, new database field/sheet, Event Revision mutation, approval, editing, deletion, report replacement pointer, or audit record for history reads. G-17 generation and G-26 advisory readiness remain unchanged.

## Authenticated server API

**listReportsForEvent(sessionToken, eventId)**:

1. Requires the existing report permission using requireAuth_. Unauthenticated users and view-only Staff cannot access this endpoint.
2. Resolves the current non-void Event using findEventRowById_ with includeVoided=false. Closed Events remain readable.
3. Reads ReportRegistry without creating or repairing it; missing registry or non-v7 headers produces a clear error rather than a misleading empty result.
4. Reads only the existing 11 columns; filters rows by exact EventID.
5. Skips malformed or duplicate ReportID / blank DocumentID entries for that Event and reports invalidCount. These rows are never changed or deleted.
6. Sorts valid GeneratedAt Date timestamps descending, falling back to append order for ties or undated entries. Undated entries appear after valid dates.
7. Returns strings and numbers safe to serialize through Google Apps Script; Date objects are converted to ISO strings.

**Response contract:**

| Field | Description |
| --- | --- |
| eventId | Queried EventID |
| currentRevision | Current Event Revision |
| recordStatus | active or closed |
| count | Valid registered reports for this Event |
| latest | Newest report, or null |
| invalidCount | Invalid or duplicate matching rows skipped |
| reports[] | Newest-first read-only report records |

Each report contains reportId, sourceRevision, documentURL, generatedAt, generatedBy, geminiModels, geminiApiVersions, promptVersion.

DocumentURL is exposed only if the host/path is a Google Docs document URL containing the same stored DocumentID. Malformed, unrelated or untrusted URLs return as an empty string while the report remains visible. Google Docs continues to enforce its own file-sharing rules.

## UI contract

The authenticated Event and Reporter views show a **ประวัติรายงาน** button for existing report-capable roles. Clicking queries latest registry history on demand and opens a modal listing:

- report count, current Revision and latest generation date;
- each report's generated date, generator, SourceRevision, ReportID, Gemini models/API and prompt version;
- safe link to its generated Google Doc, or missing-link guidance;
- an empty history state and notice that historical pre-G-17 documents are not inferred.

The UI escapes untrusted strings and uses rel=noopener noreferrer on external links. Private registry data is not included in the public dashboard and is not cached in MainData or a dedicated sheet.

## Edge cases and boundaries

- **Zero reports:** count zero, latest null, empty reports array.
- **Legacy/migrated Event:** relies on EventID and does not demand other fields be complete.
- **Closed Event:** reading is permitted; the Event remains closed.
- **Voided Event:** rejected by existing EventID lookup.
- **Pre-G-17 documents:** excluded; no artificial registration.
- **Missing registry or conflicting headers:** explicit error; no auto-migration on a read.
- **Corrupt/duplicate matching rows:** skipped and counted; no destructive repair.
- **No generic report administration:** this is read-only per-Event history, not a workflow, approval, e-signature, or version tree.

## Tests and deployment

Run npm test, check all existing regression suites and GitHub Actions. G-27 tests cover empty/multiple/out-of-order/other-Event data, permissions, closed Event, malformed rows, malicious document URLs, missing registry/schema, JSON-safe dates, read-only behavior and modal safety.

The live Apps Script staging smoke test remains deferred by Product Owner direction. GitHub Actions success is not equivalent to live Google Docs or Apps Script verification. No production deployment or stacked PR merge without human authorization.

No schema migration is needed. Rollback means reverting G-27 code/UI/doc changes only; G-17 registry rows remain untouched.
