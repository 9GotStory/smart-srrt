# G-24 — Limited MasterData Administration Contract

Scope: G-24 Limited MasterData administration  
Parent: G-21 Audit retention  
Schema version: **5 (unchanged)**

## Purpose

G-24 adds a bounded Admin surface for the existing `MasterData` sheet.

The objective is to let district administrators maintain operational lookup values without turning MasterData into a generic taxonomy/schema engine and without breaking lifecycle/KPI semantics.

No new sheet, MainData column, or schema-version bump is required.

## Supported Type allowlist

Only these Types are recognized by the G-24 administration API:

| Type | Meaning | Policy |
|---|---|---|
| `surveillance` | การเฝ้าระวัง | user-manageable |
| `disease_group` | กลุ่มโรค | user-manageable |
| `event_type` | ประเภทเหตุการณ์ | user-manageable |
| `verify_status` | สถานะการตรวจสอบ | system-semantic |
| `criteria` | เกณฑ์สอบสวนโรค | system-semantic |
| `risk` | ระดับความเสี่ยง | user-manageable |
| `content_category` | หมวดหมู่ประกาศ/คู่มือ | user-manageable |

Any other Type is rejected server-side.

The Admin UI is not the security boundary.

## Identity

Existing MasterData identity is:

`Type + Value`

For an existing item:

- Type is immutable;
- Value is immutable;
- Label may be changed;
- SortOrder may be changed;
- Active may be changed only when the Type policy permits it.

There is no rename operation for Value.

To replace an operational Value, create the intended new Value (where the Type allows creation) and soft-disable the old Value.

Historical data is not rewritten.

## User-manageable Types

These Types allow:

- creation of a new Value;
- Label edits;
- SortOrder edits;
- activation/deactivation.

Types:

- `surveillance`
- `disease_group`
- `event_type`
- `risk`
- `content_category`

Create rejects duplicate Value keys within the same Type using trimmed, case-insensitive comparison.

## System-semantic Types

These Types are used directly by application logic:

- `verify_status`
- `criteria`

G-03/G-04 derive lifecycle/consistency from canonical verification and criteria Values.

G-23 KPI semantics depend on exact `criteria` Value matching.

Therefore G-24 does **not** allow:

- new Values for these Types;
- deactivation of their canonical Values;
- Type/Value rename.

It allows only:

- Label change;
- SortOrder change.

This preserves stable machine semantics while permitting presentation/order adjustment.

## No physical delete

G-24 intentionally adds no:

- `deleteMasterData`
- `removeMasterData`

endpoint.

User-manageable items are retired through:

`Active = false`

The row remains in MasterData for auditability and operational recovery.

## Historical-value preservation

A disabled Value is removed from active MasterData returned for new selection.

Server-side validation also prevents a new Event or a changed master-backed field from using an inactive/unknown Value.

For Event update, an inactive/legacy Value remains valid only when that field is unchanged from the stored row.

For ContentLibrary:

- new content must use an active `content_category`;
- changing an existing category must select an active category;
- an existing inactive/legacy category may be preserved when left unchanged.

It is **not** removed from historical Event or Content records.

When editing an existing Event whose saved master-backed Value is no longer active, the browser temporarily injects:

`[เลิกใช้งาน] <stored value>`

into that edit form.

This allows the user to preserve the historical value instead of silently converting it to blank.

The temporary option is not part of the active choices for a newly created Event.

The same behavior applies to an existing ContentLibrary category whose `content_category` Value is disabled.

## Content category

Before G-24, the Content editor used a free-text category input.

G-24 changes the editor to an active MasterData-backed selection:

`content_category`

Existing legacy categories that are not active in MasterData remain visible as temporary historical options during edit.

G-24 does not rewrite historical ContentLibrary categories.

## Usage visibility

The Admin surface reports how many stored records currently reference each Value.

Mappings:

| Type | Source |
|---|---|
| `surveillance` | MainData col4 |
| `disease_group` | MainData col5 |
| `event_type` | MainData col7 |
| `verify_status` | MainData col15 |
| `criteria` | MainData col17 |
| `risk` | MainData col19 |
| `content_category` | ContentLibrary col2 |

Usage count includes stored historical references.

Usage does not hard-block deactivation of a user-manageable Type because deactivation affects future selection only and does not destroy those references.

## Permissions

G-24 uses the existing `master` permission.

Current roles:

- Super Admin: allowed
- Manager: allowed
- Admin: not allowed
- Staff: not allowed

Both the list-management API and save API require this permission.

## Server validation

`saveMasterDataItem()` validates:

- mode is `create` or `update`;
- Type is allowlisted;
- Value is nonblank and max 120 characters;
- Label is nonblank and max 160 characters;
- SortOrder is an integer 1–9999;
- Type policy permits creation/deactivation;
- duplicate Type/Value does not already exist;
- update identity matches the original Type/Value.

Client controls are convenience only; server rules are authoritative.

## Audit

Create writes:

`CREATE_MASTER_DATA`

Update writes:

`UPDATE_MASTER_DATA`

Audit TargetId:

`<Type>:<Value>`

The before/after payload preserves Label, SortOrder, Active and identity values.

Because physical deletion does not exist, no delete audit action exists.

## Schema / migration

No migration is required.

Schema stays:

**v5**

Existing MasterData structure remains:

- Type
- Value
- Label
- SortOrder
- Active
- UpdatedAt
- UpdatedBy

G-24 only adds policy-aware API/UI behavior over this established structure.

## Rollback

Routine rollback to pre-G-24 code requires no data migration.

MasterData rows created through G-24 remain valid under the existing schema.

Disabled rows remain compatible with the existing `getMasterData()` behavior.

Historical Event/Content data is not rewritten by G-24, so no data reversal is needed.

## Verification checklist

Before production release:

1. login as Manager/Super Admin;
2. confirm only the seven allowlisted Types appear;
3. create a Value under a user-manageable Type;
4. verify duplicate creation is rejected;
5. update Label/SortOrder without changing Type/Value;
6. soft-disable the Value;
7. verify it disappears from a new Event selection;
8. verify an old Event containing it can still be edited without losing the stored value;
9. verify ContentLibrary behaves the same for a disabled legacy category;
10. verify a new `criteria` or `verify_status` Value cannot be created;
11. verify canonical `criteria` / `verify_status` Values cannot be disabled;
12. verify no hard-delete MasterData operation exists;
13. verify usage counts reflect stored references;
14. verify CREATE/UPDATE MasterData audit entries are written;
15. verify Admin/Staff cannot call MasterData administration APIs.
