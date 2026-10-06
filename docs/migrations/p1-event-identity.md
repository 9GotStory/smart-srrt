# P1 — Event Identity & Data Integrity Migration Contract

Scope: G-01, G-02, G-20  
Base: `main@96bf16ff7c5c0ccfb3bc7e1654826a839c77700d`

## Additive schema

The original MainData columns 1–30 remain in their existing order.

P1 appends:

| Column | Header | Meaning |
|---:|---|---|
| 31 | EventID | immutable UUID identity |
| 32 | Revision | optimistic concurrency revision |
| 33 | RecordStatus | `active` or `void` |
| 34 | CreatedAt | creation time for records created after P1 |
| 35 | CreatedBy | creator for records created after P1 |
| 36 | VoidedAt | void timestamp |
| 37 | VoidedBy | user email that voided the event |
| 38 | VoidReason | required reason |

Legacy rows intentionally keep CreatedAt/CreatedBy blank because the former schema does not preserve reliable original creation metadata.

## Migration behavior

`ensureEventIdentityData_`:

1. scans rows that contain a received date;
2. validates any existing EventID;
3. fails on malformed or duplicate nonblank EventID;
4. creates UUID only for blank EventID;
5. initializes blank Revision to 1;
6. initializes blank RecordStatus to `active`;
7. writes only columns 31–38;
8. is safe to rerun.

It must never silently replace a malformed/duplicate existing ID.

## Entry points

- `installSmartSRRTCore_()` performs the additive schema check/backfill as part of install/repair.
- `migrateP1EventIdentity()` is an explicit operator migration entry point and records SchemaVersion 2.

## Event mutation behavior

### Add
Creates:

- EventID UUID
- Revision 1
- RecordStatus active
- CreatedAt
- CreatedBy

### Update
Targets EventID, not row number.

When the browser supplies `expectedRevision`, a mismatch rejects the write and asks the user to refresh.

Successful update increments Revision.

### Delete action
The existing browser delete action becomes a non-destructive **void** operation.

It:

- requires a reason,
- preserves the physical row,
- increments Revision,
- sets RecordStatus=void,
- captures VoidedAt/VoidedBy/VoidReason,
- writes audit action `VOID_RECORD`.

Normal Dashboard/Event lists exclude void records.

## Report lookup

AI report generation resolves the selected event by EventID. Report registry/version governance remains P5 scope.

## Rollback boundary

Because P1 is additive, rolling code back to v2026.09.08.1 leaves columns 31–38 present but the old application ignores them.

However, Events voided in P1 are still physically present; an old version does not understand RecordStatus and could display them again. Therefore a code rollback after live void operations requires an explicit operational check.

## Required pre-production sequence

1. Backup the Google Sheet.
2. Apply candidate Code + Index in a non-production/staging copy.
3. Run `migrateP1EventIdentity()`.
4. Verify migration counts and no duplicate/malformed ID error.
5. Re-run migration and confirm zero new backfills.
6. Test add/edit/stale-edit/void/report.
7. Only then update the production Web App deployment.
