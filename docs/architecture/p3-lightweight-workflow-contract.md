# P3 — Lightweight Workflow, Owner & Close/Reopen

Scope: G-03, G-04, G-05, G-19

## Design principle

Smart SRRT does not become a generic workflow engine.

Existing epidemiological fields remain authoritative for operational detail. P3 adds only a lightweight lifecycle layer for coordination, ownership and closure.

## Additive schema

Columns 1–38 are unchanged.

P3 appends:

| Column | Header | Meaning |
|---:|---|---|
| 39 | WorkflowStatus | OPEN / IN_PROGRESS / CLOSED / VOID |
| 40 | OwnerUserID | optional active UserAccounts.UserID |
| 41 | OwnerAssignedAt | latest assignment timestamp |
| 42 | ClosedAt | explicit closure timestamp |
| 43 | ClosedBy | closing user email |
| 44 | CloseReason | required closure reason |

Schema version: 3.

## Lifecycle semantics

### VOID
Derived from P1 `RecordStatus=void`.

Void is a data-disposition/audit state and is distinct from normal closure.

### CLOSED
Explicit action only.

Requires:

- edit permission
- current Revision
- nonblank reason

A CLOSED Event cannot be edited through the normal Event update path until reopened.

### OPEN / IN_PROGRESS
These are synchronized from existing SRRT progress fields.

If no progress field is populated, status is OPEN.

If verification, criteria, risk, investigation, control-measure or related progress data exists, status is IN_PROGRESS.

This intentionally avoids a rigid workflow engine.

## Consistency warnings

P3 warns instead of blocking normal field updates for non-destructive inconsistencies.

Current warnings include:

- investigation date exists but criteria is not exactly `เข้าเกณฑ์`
- `ลงสอบสวน` is selected but criteria is not exactly `เข้าเกณฑ์`
- measure date exists without measure detail
- CLOSED metadata is incomplete

Warnings are returned only with authenticated raw Event rows. They are not included in the public aggregate Dashboard contract.

## Owner

Owner is optional.

The owner selector is backed by active UserAccounts records only.

Rules:

- inactive/missing users cannot be assigned
- reassignment/clear is auditable
- OwnerUserID is not a task, queue or SLA
- no notification/escalation subsystem is created

## Close / Reopen

### Close

- keeps the Event row
- increments Revision
- stores ClosedAt / ClosedBy / CloseReason
- sets WorkflowStatus=CLOSED
- writes CLOSE_EVENT audit

### Reopen

- keeps the Event row
- increments Revision
- clears the current closure metadata
- derives OPEN or IN_PROGRESS from existing Event progress fields
- writes REOPEN_EVENT audit containing the previous closure metadata

Historical closure evidence therefore remains in AuditLogs even though current closure fields are cleared.

## Migration

`migrateP3Workflow()`:

1. ensures schema columns 39–44 exist;
2. preserves P1 identity metadata;
3. initializes blank WorkflowStatus from each legacy Event;
4. leaves Owner and closure metadata blank;
5. is idempotent;
6. advances SCHEMA_VERSION to at least 3.

Legacy business data is not rewritten.

## Non-goals

P3 does not implement:

- tasks
- SLA
- escalation
- notifications
- case/contact/outbreak entities
- project management
- approval workflow engine
