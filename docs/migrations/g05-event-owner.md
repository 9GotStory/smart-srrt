# G-05 — Event Owner Schema v3 Migration Contract

Scope: G-05 Event owner / assigned user  
Parent: G-04 soft consistency warnings

## Additive schema

G-05 preserves MainData columns 1–38 unchanged and appends exactly one column:

| Column | Header | Meaning |
|---:|---|---|
| 39 | OwnerUserID | stable `UserAccounts.UserID` of the primary Event owner |

`OwnerUserID` is optional. A blank value means the Event has no assigned owner.

Names, email addresses, role and organization are **not duplicated** into MainData. They are resolved from UserAccounts when authenticated Event rows are read.

Schema version moves from **2 → 3**.

## Safe column claim

`ensureEventOwnerSchema_()` claims column 39 only when safe.

It aborts if:

1. column 39 already has a nonblank header other than `OwnerUserID`; or
2. column 39 has a blank header but contains any existing row data.

The migration must not overwrite or reinterpret custom installation data.

Columns 1–38 are not moved, rewritten or re-ordered by this migration.

## Entry points

- `installSmartSRRTCore_()` ensures the v3 owner column during install/repair.
- `migrateG05EventOwner()` is the explicit operator migration entry point.
- `migrateP1EventIdentity()` remains a P1 migration and guarantees only schema version 2. It never downgrades a database already at a higher schema version.

## Assignment model

One Event has at most one primary owner.

Assignment:

- stores only `OwnerUserID`;
- accepts only an active UserAccounts user with Event `edit` permission;
- may be cleared back to blank;
- requires the Event's current expected Revision;
- rejects stale revisions;
- increments Event Revision on change;
- updates the legacy last-modifier/time fields;
- writes AuditLogs action `ASSIGN_EVENT_OWNER`.

There is no automatic assignment.

## Permissions

Only:

- Super Admin
- Manager

have the dedicated `assign` permission.

Admin and Staff can see the resolved owner in authenticated Event views but cannot change assignment.

Assignment is treated as an Event mutation and is unavailable while `SYSTEM_STATUS=closed`.

## Owner account changes

MainData keeps the stable UserID reference.

If the account name, email, role or organization changes, current authenticated views resolve the latest account details automatically.

If a referenced UserID no longer resolves, the Event remains readable and the UI identifies the owner account as missing rather than deleting or replacing the stored reference.

## Rollback boundary

Rolling application code back to schema-v2-aware code leaves column 39 present. Older code ignores it.

Do not physically remove column 39 as part of a routine code rollback because doing so would discard owner assignments.

If rollback is required, keep the column and restore application code only.

## Operator sequence

1. Back up the database Sheet.
2. Run `migrateG05EventOwner()` or install/repair on staging.
3. Confirm MainData column 39 header is exactly `OwnerUserID`.
4. Confirm existing rows have blank owner values unless deliberately assigned.
5. Confirm `SCHEMA_VERSION=3`.
6. Test assign, reassign, clear, and stale-revision rejection.
7. Verify `ASSIGN_EVENT_OWNER` in AuditLogs.
8. Deploy to production only after the stacked parent changes are accepted.
