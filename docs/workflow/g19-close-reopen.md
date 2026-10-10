# G-19 — Event Close / Reopen Lifecycle Contract

Scope: G-19 close / reopen lifecycle  
Parent: G-05 Event owner assignment  
Schema version: **3 (unchanged)**

## Purpose

G-19 adds a reversible operational closure state without creating another workflow column or a generic workflow engine.

It reuses the existing P1 `RecordStatus` field.

## RecordStatus values

| Value | Meaning | Normal lists/statistics |
|---|---|---|
| `active` | Event is operationally open | included |
| `closed` | Event work is closed/read-only until reopened | included |
| `void` | Event is cancelled/non-destructively deleted | excluded from normal Event lists |

`closed` and `void` are deliberately different.

Closing an Event means the work is considered complete for now. Voiding means the Event record should no longer participate in normal operational views.

## Close

`closeEvent(sessionToken, eventId, reason, expectedRevision)`

Contract:

- Super Admin / Manager only through `close_event` permission;
- nonblank reason required;
- valid expected Revision required;
- stale Revision rejected even when the Event is already closed;
- transition `active -> closed`;
- Revision increments by one;
- legacy last-modifier/time fields are updated;
- AuditLogs records `CLOSE_EVENT` and the reason.

Closing does not delete or clear investigation data, owner assignment, EventID, report data, or any legacy business field.

## Closed Event behavior

A closed Event:

- remains readable;
- remains included in Dashboard/statistical counts;
- derives lifecycle `closed / ปิดเหตุการณ์แล้ว`;
- cannot be edited through `updateRecord()`;
- cannot have its owner reassigned;
- can still be used to generate an AI report;
- can still be voided as a distinct later disposition;
- can be reopened.

G-04 consistency warnings remain visible on closed records because closure does not imply that legacy field combinations are internally consistent.

## Reopen

`reopenEvent(sessionToken, eventId, reason, expectedRevision)`

Contract:

- Super Admin / Manager only;
- nonblank reason required;
- valid expected Revision required;
- stale Revision rejected even when the Event is already active;
- transition `closed -> active`;
- Revision increments by one;
- legacy last-modifier/time fields are updated;
- AuditLogs records `REOPEN_EVENT` and the reason.

A void Event cannot be reopened through this operation.

## Permission and system status

Dedicated permission:

- Super Admin: `close_event`
- Manager: `close_event`
- Admin: none
- Staff: none

Close/reopen is an Event mutation and obeys global `SYSTEM_STATUS`. When the whole system is closed for mutations, Event close/reopen is unavailable too.

## UI

For manager-level users:

- active Event: show **ปิดเหตุการณ์**
- closed Event: show **เปิดใหม่**
- **ยกเลิก** remains a separate void action

For closed Events:

- normal Edit control is not offered;
- owner assignment control is not offered;
- AI report remains available.

Server-side checks remain authoritative even if a stale/modified browser attempts a forbidden operation.

## Migration

No data migration or new column is required.

Existing `active` and `void` rows remain valid.

The existing Event identity validation is extended to accept `closed`.

## Rollback boundary

Rolling code back to a version that only understands `active|void` while rows contain `closed` is **not safe** without operational handling.

Preferred rollback:

1. keep a backup;
2. do not delete or rewrite closed rows automatically;
3. either deploy code that understands `closed`, or explicitly reopen/translate affected Events based on an approved operator decision before using older validation code.

Never map `closed` to `void` automatically because the business meaning is different.

## Verification

Before production release:

1. close an active Event;
2. confirm Revision increments and `CLOSE_EVENT` audit exists;
3. confirm normal edit and owner reassignment are rejected while closed;
4. confirm Dashboard still includes the Event;
5. confirm AI report remains callable;
6. reopen it;
7. confirm Revision increments and `REOPEN_EVENT` audit exists;
8. verify stale close/reopen requests are rejected;
9. verify void remains separate.
