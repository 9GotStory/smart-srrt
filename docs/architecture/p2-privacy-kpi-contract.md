# P2 — Privacy Boundary & KPI Correctness

Scope: G-22, G-23

## Public contract

Anonymous users may receive only:

- public settings
- active area/master data already intended for public filters
- published content
- aggregate Dashboard payloads

Anonymous users must not receive:

- raw MainData rows
- EventID
- Revision
- recorder email
- narrative/event detail rows
- client-generated Excel built from raw events

## RPC split

### getPublicDashboardData(filter)

No login required.

Returns only:

- KPI counts
- aggregate chart maps
- top-category insight values
- pending criteria count

It does not return event rows.

### getDashboardData(sessionToken, filter)

Requires `view` permission.

Returns Event rows for authenticated record/report workflows.

## KPI canonical rules

`เข้าเกณฑ์สอบสวนโรค` is counted only when:

```
trim(col17) === 'เข้าเกณฑ์'
```

Therefore `ไม่เข้าเกณฑ์` and `รอดำเนินการ` never count as criteria met.

`investigated` means an Event that:

1. is exactly `เข้าเกณฑ์`; and
2. has a nonblank investigation date (col26).

`investigationRate` is:

```
investigated criteria events / criteria-met events
```

When there are zero criteria-met events, the rate is 0%.

## Browser behavior

- Dashboard KPI/charts always render from the aggregate server payload.
- Anonymous users have no raw event list or raw Excel action.
- After login, raw rows are loaded with the authenticated RPC.
- After logout, raw rows are cleared and Dashboard returns to aggregate-only mode.
- Server export remains permission-protected.

## Deferred

This phase does not address:

- orphan export file lifecycle
- full auth redesign
- session-store redesign
- lifecycle/ownership workflow
- report registry
