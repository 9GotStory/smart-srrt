# P3 — Lightweight Event Lifecycle Contract

Scope: G-03, G-04, G-05, G-19  
SchemaVersion: 3

## Design principle

Smart SRRT gets a **small operational lifecycle**, not a workflow engine.

The system continues to support real SRRT work rather than forcing users through artificial project-management steps.

## Record disposition vs operational lifecycle

These are intentionally separate.

### RecordStatus

- `active`
- `void`

`void` means the record itself was invalidated/cancelled but retained for audit.

### WorkflowStatus

- `open`
- `in_progress`
- `closed`

`closed` means the Event is valid but operational follow-up is complete.

A closed Event is not deleted and is not the same as void.

## Additive schema

P3 appends columns 39–48 after the P1 metadata:

| Column | Header |
|---:|---|
| 39 | WorkflowStatus |
| 40 | OwnerUserID |
| 41 | AssignedAt |
| 42 | AssignedBy |
| 43 | ClosedAt |
| 44 | ClosedBy |
| 45 | CloseReason |
| 46 | ReopenedAt |
| 47 | ReopenedBy |
| 48 | ReopenReason |

Legacy Event rows receive only `WorkflowStatus=open`. No owner/close/reopen history is fabricated.

## Ownership

`assignEventOwner`:

- requires `edit`
- resolves the supplied email to an existing active user
- stores canonical `OwnerUserID`
- records AssignedAt/AssignedBy
- changes `open → in_progress`
- increments Revision
- rejects stale Revision
- rejects assignment while closed

Owner name/email returned to authenticated clients is derived from UserAccounts rather than duplicated into MainData.

## Consistency warnings

Before close, the server checks only a small set of high-value consistency conditions:

- verification blank or `รอตรวจสอบ`
- investigation criteria blank or `รอดำเนินการ`
- exact criteria `เข้าเกณฑ์` but investigation date blank

These are warnings, not a rigid workflow.

## Close

`closeEvent`:

- requires `edit`
- requires expected Revision
- requires close reason
- calculates warnings server-side
- if warnings exist, requires an explicit override reason
- records ClosedAt/ClosedBy/CloseReason
- increments Revision
- writes `CLOSE_EVENT` audit

Normal Event editing is rejected while WorkflowStatus is closed.

## Reopen

`reopenEvent`:

- requires `edit`
- requires expected Revision
- requires reopen reason
- changes WorkflowStatus to `open`
- clears current closure fields
- records ReopenedAt/ReopenedBy/ReopenReason
- increments Revision
- writes `REOPEN_EVENT` audit

Historical close/reopen actions remain in AuditLogs.

## UI

The existing Records page gains only:

- workflow status
- current owner
- Assign
- Close
- Reopen

No task queue, checklist engine, SLA timer or escalation subsystem is introduced.

## Migration

`migrateSmartSRRTSchema()` becomes the current operator migration entry point.

The older `migrateP1EventIdentity()` name remains as a backward-compatible alias.

Migration remains additive and idempotent.
