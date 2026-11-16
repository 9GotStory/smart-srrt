# G-11 — Event Attachments Storage & Migration Contract

Scope: G-11 Event attachments backed by Google Drive  
Parent: G-19 close/reopen lifecycle  
Schema version: **4**

## Purpose

G-11 adds lightweight evidence attachments to an Event while preserving Smart SRRT's scope.

It does not create a generic document-management system.

## Persistent structures

### MainData

MainData remains unchanged from G-05:

- columns 1–38: existing Event/business + P1 metadata
- column 39: `OwnerUserID`

G-11 adds **no new MainData column**.

### EventAttachments sheet

G-11 adds one dedicated sheet:

`EventAttachments`

| Column | Header | Meaning |
|---:|---|---|
| 1 | AttachmentID | immutable UUID attachment identity |
| 2 | EventID | stable EventID reference |
| 3 | FileID | private Google Drive file ID |
| 4 | FileName | sanitized original display/download name |
| 5 | MimeType | validated allowed MIME type |
| 6 | SizeBytes | uploaded byte count |
| 7 | Description | optional description, max 500 chars |
| 8 | Status | `active` or `removed` |
| 9 | UploadedAt | upload time |
| 10 | UploadedBy | uploader email |
| 11 | RemovedAt | logical removal time |
| 12 | RemovedBy | removal actor email |
| 13 | RemoveReason | required logical removal reason |

Schema version moves from **3 -> 4**.

## Safe sheet claim

`ensureEventAttachmentSheet_()` is conflict-aware.

If an existing `EventAttachments` sheet is present:

- matching headers are accepted;
- blank expected headers are filled only if the column has no data below them;
- an unexpected nonblank header aborts migration;
- data under a blank header aborts migration.

The migration must not reinterpret or overwrite an unrelated existing sheet.

## Google Drive structure

Files are stored privately under:

`Smart SRRT system folder / เอกสารแนบเหตุการณ์ / <EventID>`

Only the stable EventID is used in the per-Event folder name.

Disease, location, patient details, narrative text, or other sensitive Event content is not placed in folder names.

The attachment root folder ID is stored as:

`ATTACHMENT_FOLDER_ID`

in SystemSettings and Script Properties.

## Privacy boundary

Attachment files are **not** set to:

`ANYONE_WITH_LINK`

and browser APIs do not need a Drive FileID or public Drive URL.

Browser operations use authenticated Apps Script RPC:

- `listEventAttachments()`
- `uploadEventAttachment()`
- `downloadEventAttachment()`
- `removeEventAttachment()`

Download returns authenticated file bytes as base64, which the browser converts to a local Blob for download.

This keeps Drive storage private from anonymous/public Dashboard clients.

## Permissions

### List / download

Requires authenticated `view`.

### Upload

Requires `edit`.

Therefore:

- Super Admin: yes
- Manager: yes
- Admin: yes
- Staff: no

### Remove

Requires `delete`.

Therefore:

- Super Admin: yes
- Manager: yes
- Admin: no
- Staff: no

## Closed and void Events

A `closed` Event:

- attachments remain listable/downloadable;
- new uploads are rejected;
- logical removal is rejected;
- reopening is required before attachment mutation.

A `void` Event is not reachable through normal attachment operations because Event lookup excludes void Events.

## File constraints

Maximum:

**5 MB per file**

Initial MIME allowlist:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Basic file signatures are checked server-side to reject obvious MIME/content mismatches.

Arbitrary HTML, JavaScript, executable, archive, and other unsupported file types are rejected.

## Upload integrity

Upload:

1. validates permission, MIME, size, signature and Event Revision;
2. rejects closed/void Event mutation;
3. creates a private Drive file;
4. writes active attachment metadata;
5. increments Event Revision;
6. updates legacy modifier/time fields;
7. writes `UPLOAD_EVENT_ATTACHMENT` AuditLogs entry.

If file creation succeeds but the metadata/write sequence throws, the newly created Drive file is moved to Trash as compensation.

## Download audit

Successful authenticated download writes:

`DOWNLOAD_EVENT_ATTACHMENT`

to AuditLogs.

Normal list APIs do not expose Drive FileID.

## Logical removal

Removal is intentionally non-destructive.

`removeEventAttachment()`:

- requires a reason;
- requires current expected Event Revision;
- changes attachment Status to `removed`;
- records RemovedAt / RemovedBy / RemoveReason;
- increments Event Revision;
- writes `REMOVE_EVENT_ATTACHMENT` AuditLogs entry;
- does **not** trash or delete the Drive file.

This preserves evidentiary material while removing it from normal Event attachment lists.

## Revision / concurrency

Upload and removal are Event mutations.

Both require the current Event Revision and increment it on success.

This prevents an attachment mutation from silently racing against Event edit, owner assignment, close/reopen, void, or another attachment mutation.

## Migration entry point

Explicit operator function:

`migrateG11EventAttachments()`

It:

1. creates/validates `EventAttachments`;
2. creates/recovers the attachment root folder;
3. stores `ATTACHMENT_FOLDER_ID`;
4. advances schema to at least version 4;
5. never downgrades a future higher schema version.

`migrateG05EventOwner()` remains scoped to schema version 3 and cannot claim v4.

## Rollback boundary

Rolling application code back does not require deleting the EventAttachments sheet or Drive files.

Preferred rollback:

- restore previous application code;
- retain `EventAttachments`;
- retain `ATTACHMENT_FOLDER_ID`;
- retain private Drive files.

Older code simply ignores the additional sheet/settings.

Do not delete files or the metadata sheet during routine code rollback.

## Operator verification

Before production deployment:

1. back up the Sheet;
2. run `migrateG11EventAttachments()`;
3. verify `EventAttachments` headers 1–13;
4. verify `SCHEMA_VERSION >= 4`;
5. verify `ATTACHMENT_FOLDER_ID` exists;
6. upload an allowed file to an active Event;
7. confirm Event Revision increments;
8. confirm file is not publicly shared;
9. list/download it through the Web App;
10. verify `UPLOAD_EVENT_ATTACHMENT` and `DOWNLOAD_EVENT_ATTACHMENT`;
11. logically remove it with a reason;
12. verify `REMOVE_EVENT_ATTACHMENT`, metadata status `removed`, and Drive file preservation;
13. verify closed Event allows read/download but blocks upload/remove;
14. verify a stale Revision is rejected.
