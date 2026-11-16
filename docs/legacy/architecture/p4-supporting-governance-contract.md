# P4 — Supporting Governance Contract

Scope: G-11, G-21, G-24, G-29  
Schema version: 4

## Principle

P4 adds supporting evidence/governance capabilities only. It does not create a new approval workflow, document-management system, task system or automated destruction policy.

## G-11 — Event Attachments

### Registry

Sheet: `EventAttachments`

Fields:

1. AttachmentID
2. EventID
3. FileID
4. FileName
5. MimeType
6. FileSize
7. DriveUrl
8. Description
9. Status
10. CreatedAt
11. CreatedBy

### Storage

Files are stored inside a managed `เอกสารแนบเหตุการณ์` folder under the Smart SRRT system folder.

The folder ID is recorded as `ATTACHMENT_FOLDER_ID`.

### Privacy

Event attachments remain private in Drive.

Unlike the website logo, the attachment upload path does not enable link-public sharing.

Authenticated users download files through the application using a permission-checked RPC.

### Access

- list/download: `view`
- upload/archive: `edit`
- upload to CLOSED or VOID Event: rejected
- attachment archive: registry status becomes `archived`; Drive file is retained

### Limits

Maximum upload size: 5 MB.

Supported types are deliberately limited to common evidence/document formats:

- PDF
- PNG/JPEG/WEBP
- TXT/CSV
- DOC/DOCX
- XLS/XLSX

## G-21 — Audit Archive

Active sheet: `AuditLogs`  
Archive sheet: `AuditArchive`

Archive is explicit and requires the existing `audit` permission.

No automatic purge exists.

`archiveAuditLogs(sessionToken, olderThanDays)`:

1. identifies active audit rows older than the cutoff;
2. computes a deterministic archive key from the original row;
3. skips archive rows already carrying the same key;
4. appends previously unarchived rows to AuditArchive;
5. removes only those moved rows from active AuditLogs;
6. records an `ARCHIVE_AUDIT_LOGS` action in the active log.

ArchiveKey makes a retry after a partial append/delete failure duplicate-aware.

AuditArchive also records:

- ArchivedAt
- ArchivedBy

The archive action never deletes Drive files and never destroys the archived audit record.

## G-24 — MasterData CRUD

Supported types remain constrained to the existing application domains:

- surveillance
- disease_group
- event_type
- verify_status
- criteria
- risk
- content_category

Operations require the existing `master` permission.

Supported operations:

- list
- create
- update label/sort/active
- disable

Rules:

- Type and Value form the natural identity and cannot be renamed in-place.
- Historical MainData values are never rewritten.
- Duplicate Type/Value is rejected.
- blank Value/Label is rejected.
- the canonical `criteria / เข้าเกณฑ์` value cannot be disabled because server KPI semantics depend on it.

## G-29 — VisitLogs

The baseline header:

`Timestamp | Page | UserAgent`

was semantically incorrect because `logVisit_` stores request parameters in column 3.

P4 changes the header to:

`Timestamp | Page | RequestParams`

Existing VisitLogs row values are preserved.

The migration only changes C1 when it is blank or still named `UserAgent`.

## Migration

`migrateP4Governance()`:

- ensures EventAttachments exists;
- ensures AuditArchive exists;
- migrates the VisitLogs header;
- creates/repairs the private attachment folder;
- records ATTACHMENT_FOLDER_ID;
- advances SchemaVersion to at least 4.

MainData remains at 44 columns; P4 does not add another MainData column.

## UI

Authenticated Event rows expose an attachment control.

- view-capable users can list/download
- edit-capable users can upload/archive on an open Event
- CLOSED Events allow viewing/downloading but not adding files

Admin adds:

- limited MasterData management
- explicit Audit Archive action

## Non-goals

P4 does not implement:

- document approval/sign-off
- external DMS
- automatic deletion/retention timer
- arbitrary master-data type creation
- attachment public-link sharing
- task/SLA/escalation workflow
