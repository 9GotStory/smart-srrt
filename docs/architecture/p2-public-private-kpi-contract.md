# P2 — Public/Private Data Boundary & KPI Contract

Scope: G-22, G-23  
Stacked on P1 Event identity work.

## Public contract

`getDashboardData(filter)` is public and returns **aggregate-only** data.

It may return:

- KPI counts/rates
- chart category labels and counts
- non-record-level insight values derived from aggregates

It must not return:

- EventID
- Revision
- Event narrative/detail
- recorder identity
- physical row identity
- complete Event rows

The public Dashboard remains useful without exposing the Event dataset.

## Authenticated Event contract

`getEventData(sessionToken, filter)` requires `view` permission before returning Event-level rows.

Browser behavior:

- anonymous: Dashboard summary/charts only
- authenticated: Dashboard summary plus Event list according to role
- Event-level client/server export requires authentication

The internal storage reader is `getFilteredEventRows_`; the trailing underscore keeps it an internal Apps Script helper rather than a browser RPC.

## Canonical KPI rules

### Events

All active, non-void Events within the selected filters.

### Criteria

Count only when:

`trim(col17) === "เข้าเกณฑ์"`

Substring matching is forbidden because `ไม่เข้าเกณฑ์` contains the same text fragment.

### Investigated

An Event counts as investigated for Dashboard completeness only when:

1. it is exactly `เข้าเกณฑ์`, and
2. investigation date (col26) is nonblank.

Therefore:

`investigated <= criteria`

### Investigation rate

`round(investigated / criteria * 100)`

If criteria = 0, rate = 0.

### Pending investigation

`criteria - investigated`

## Single-source-of-truth rule

Canonical Dashboard KPI and chart aggregation is computed on the server.

The browser renders the aggregate contract and must not reimplement criteria/investigation logic.

## Deliberate non-goals

P2 does not:

- replace authentication/session architecture
- change password hashing
- implement MFA
- move Gemini secrets
- change XFrame/CSP
- change Event workflow/lifecycle

Those remain separate security/governance workstreams.
