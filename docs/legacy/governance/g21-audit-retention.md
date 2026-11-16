# G-21 — Audit Retention & Archive Contract

Scope: G-21 Audit retention / archival policy  
Parent: G-11 Event attachments  
Schema version: **5**

## Purpose

G-21 bounds the operational `AuditLogs` sheet without discarding historical audit evidence.

The design keeps recent logs in the primary Smart SRRT database and archives older logs into a separate private Google Spreadsheet under the Smart SRRT system folder.

This is deliberately lightweight. It does not introduce a SIEM, external log pipeline, WORM store, or scheduled background job.

## Active retention policy

Default active retention:

**365 days**

Setting:

`AUDIT_RETENTION_DAYS`

Runtime safety bounds:

- minimum: 90 days
- maximum: 3650 days

Values outside this range are clamped at runtime.

Malformed or unparseable timestamps are **never auto-archived**. They remain in the primary AuditLogs sheet for operator review.

## Audit identity

Existing AuditLogs columns 1–9 remain unchanged:

1. Timestamp
2. UserEmail
3. Role
4. Action
5. TargetSheet
6. TargetId
7. Before
8. After
9. IpHint

G-21 appends:

10. `AuditID`

`AuditID` is an immutable UUID used to make archive operations idempotent.

Legacy audit rows with data but no AuditID are backfilled during migration.

Migration rejects:

- malformed existing AuditID values;
- duplicate AuditID values;
- unexpected AuditLogs headers;
- hidden existing data under a blank legacy header.

## Schema version

Schema moves from **4 -> 5**.

MainData remains unchanged.

EventAttachments remains unchanged.

Older migration entry points keep their own schema floors:

- P1 Event identity -> at least 2
- G-05 Event owner -> at least 3
- G-11 Event attachments -> at least 4
- G-21 Audit retention -> at least 5

No older migration may claim v5.

## Archive storage

One private Google Spreadsheet is used per Smart SRRT installation.

Default name:

`Smart SRRT Audit Archive - <database name>`

Location:

`Smart SRRT system folder / Smart SRRT Audit Archive - <database name>`

Protected setting:

`AUDIT_ARCHIVE_SPREADSHEET_ID`

The archive spreadsheet is not publicly shared.

Archive rows are split by calendar year into sheets named:

`Y2025`, `Y2026`, etc.

Each yearly sheet uses the same 10-column Audit schema.

## Operator model

Archival is explicit, not hidden.

Available operator surfaces:

- Admin page button: **Archive รายการเก่า**
- Google Sheets menu: **จัดเก็บ Audit เก่า**

No time-driven trigger is created.

This keeps the one-click Apps Script deployment model simple and avoids unexpected destructive-looking maintenance in the background.

## Authorization

Web archive operation requires existing `audit` permission.

Current roles with `audit` permission:

- Super Admin
- Manager

Admin and Staff cannot archive AuditLogs.

Google Sheets menu archival additionally resolves the active Google account to a Smart SRRT user and requires:

- matching account email;
- user status `active`;
- `audit` permission.

If the Google account identity cannot be verified, the operator must use the authenticated Admin page instead.

## Archive transaction model

The archive process follows:

**copy -> verify -> delete source**

Detailed sequence:

1. acquire ScriptLock;
2. validate / backfill AuditID schema;
3. calculate retention cutoff;
4. select only rows with valid timestamps older than the cutoff;
5. group candidates by year;
6. open/create the yearly archive sheet;
7. read existing archived AuditIDs;
8. append only missing AuditIDs;
9. re-read archive AuditIDs;
10. verify every source candidate now exists in archive;
11. delete only verified source rows;
12. persist the archive spreadsheet ID;
13. write an `ARCHIVE_AUDIT_LOGS` summary event to active AuditLogs.

Source deletion never happens before archive verification succeeds.

## Partial-failure recovery

The archive process is designed for safe reruns.

If a prior run:

- copied rows but failed before source deletion, or
- deleted only some source ranges before stopping,

the next run sees already archived AuditIDs and does not append duplicates.

After re-verification, remaining matching source rows may be removed safely.

This is why AuditID is required.

## Source-row deletion

Verified source rows are deleted from highest row number downward in contiguous groups.

This avoids row-number shifts affecting lower deletion ranges.

Only rows selected by the current retention cutoff and verified in the archive are removed.

## Archive summary audit

A successful archive run writes:

`ARCHIVE_AUDIT_LOGS`

into the active AuditLogs sheet.

The summary records:

- retention days;
- cutoff timestamp;
- eligible row count;
- newly archived row count;
- removed-from-active row count;
- malformed timestamp row count.

The summary itself is a normal Audit row and can later be archived when it ages past the retention threshold.

## Admin status

`getAuditRetentionStatus()` reports:

- active AuditLogs row count;
- effective retention days;
- number of rows currently eligible for archive;
- malformed timestamp row count;
- current cutoff timestamp;
- oldest valid active timestamp;
- archive spreadsheet ID.

The Admin page displays the operational counts but does not provide full archive-search functionality.

## Generic settings protection

The generic web settings editor cannot modify:

- `AUDIT_ARCHIVE_SPREADSHEET_ID`
- `AUDIT_RETENTION_DAYS`

This prevents accidental archive redirection or unsafe retention changes through the normal settings form.

The seeded retention value is preserved on install/repair rather than overwritten each time.

## Migration entry point

Explicit migration function:

`migrateG21AuditRetention()`

It:

1. validates / creates AuditLogs schema;
2. backfills missing AuditID values;
3. preserves existing retention setting if already present;
4. creates or recovers the private archive spreadsheet;
5. stores `AUDIT_ARCHIVE_SPREADSHEET_ID`;
6. advances schema to at least v5;
7. never archives rows automatically.

Migration and archival are separate operations.

## Installation / repair

`installSmartSRRTCore_()` now:

- ensures AuditLogs v5 schema;
- backfills legacy AuditID values when needed;
- seeds the default retention policy only if not already configured;
- creates or recovers the archive spreadsheet;
- preserves an existing archive identity;
- stores the archive Spreadsheet ID in Settings and Script Properties.

Repair does not automatically archive old logs.

## Rollback boundary

Routine code rollback must not delete:

- AuditLogs column 10;
- archived yearly sheets;
- the archive spreadsheet;
- `AUDIT_ARCHIVE_SPREADSHEET_ID`.

Older application code that reads only columns 1–9 can ignore AuditID safely.

If rolling back to code that writes only 9 audit columns, existing archived evidence remains intact. Future new rows may lack AuditID until G-21-capable code is restored and migration is rerun.

Do not merge archive data back into the primary database automatically during rollback.

## Verification checklist

Before production release:

1. back up the primary database;
2. run `migrateG21AuditRetention()`;
3. confirm AuditLogs column 10 is `AuditID`;
4. confirm every legacy nonblank audit row has a unique valid UUID;
5. rerun migration and confirm zero AuditID backfills;
6. confirm `SCHEMA_VERSION >= 5`;
7. confirm retention defaults to 365 days unless an existing valid setting is preserved;
8. confirm archive spreadsheet is inside the Smart SRRT system folder and remains private;
9. prepare staging audit rows older/newer than the cutoff;
10. include one malformed timestamp row;
11. run archive;
12. confirm only old valid rows moved;
13. confirm malformed/recent rows remain active;
14. confirm archive yearly sheets contain the moved AuditIDs;
15. confirm source rows were deleted only after verification;
16. rerun archive and confirm no duplicate archive rows;
17. confirm `ARCHIVE_AUDIT_LOGS` was written;
18. confirm Admin/Staff cannot invoke archive;
19. confirm no Apps Script time-driven trigger was created.
