# P4 — Supporting Governance Contract

Scope: G-11, G-21, G-24, G-29  
SchemaVersion: 4

## Principle

P4 adds supporting evidence/governance only. It does not add another operational workflow.

## Event attachments

A dedicated `EventAttachments` metadata sheet stores:

- AttachmentID
- EventID
- Drive FileID
- original file name
- MIME type
- byte size
- Drive URL
- Active flag
- upload actor/time
- disable actor/time

Files are stored in a dedicated `ไฟล์แนบเหตุการณ์` folder under the Smart SRRT system folder.

### Access model

The application does **not** call `ANYONE_WITH_LINK` for Event attachments.

The folder/file remains private according to Drive permissions. Organizations that need staff to open files directly must share the attachment folder with the authorized SRRT team through normal Google Drive permissions.

### Supported upload types

- PDF
- PNG/JPEG/WEBP
- TXT/CSV
- Word
- Excel

Maximum file size: 10 MB.

### Removal

P4 uses soft disable:

- metadata Active=false
- DisabledAt/DisabledBy recorded
- Drive file is not trashed automatically

This preserves evidence and avoids accidental destructive deletion.

## Audit retention

P4 adds `AuditArchive`.

`archiveAuditLogs(sessionToken, olderThanDays)` is a manual administrative operation:

1. validate retention threshold (30–3650 days);
2. identify old active AuditLogs;
3. copy them to AuditArchive with ArchivedAt;
4. flush the spreadsheet write;
5. delete only the successfully copied active rows, bottom-to-top;
6. write an `ARCHIVE_AUDIT_LOGS` audit entry.

There is intentionally no scheduled/destructive retention job in P4.

## MasterData administration

P4 exposes controlled administration for the existing MasterData model.

Allowed types only:

- surveillance
- disease_group
- event_type
- verify_status
- criteria
- risk
- content_category

Identity is the existing `Type + Value` pair.

Existing records may update:

- Label
- SortOrder
- Active

Disabling is soft. P4 does not introduce a generic schema/form-builder engine.

## VisitLogs semantics

The legacy third column was named `UserAgent`, but `logVisit_` actually stores request parameters.

P4 corrects the header to:

`Timestamp, Page, Parameters`

Existing legacy `UserAgent` header is renamed in-place; visit rows are not rewritten.

Before storing parameters:

- likely token/password/secret/API-key/session parameters are replaced with `[REDACTED]`;
- ordinary parameter values are bounded to 500 characters.

The system does not claim to capture a browser User-Agent when Apps Script does not provide one through the current request contract.

## Migration

`migrateSmartSRRTSchema()` ensures:

- EventAttachments
- AuditArchive
- corrected VisitLogs header

The installer also creates these resources for fresh installations.

MainData remains 48 columns from P3; P4 does not add new Event columns.
