# P1 — Staging Data-Migration Evidence

Date: 2026-10-06  
Scope: G-01 / G-02 / G-20 data schema

## Fixture

A native Google Sheets staging workbook was created from the repository/Drive `Mocking Data.xlsx` fixture.

A separate native backup copy was created before any migration write.

No production Smart SRRT spreadsheet was modified.

## Pre-migration state

- rows including header: 18
- event rows with nonblank received date: 17
- columns: 30
- headers A:AD matched the v2026.09.08.1 MainData contract

## Migration exercise

The staging sheet was renamed to `MainData` and the P1 additive metadata shape was applied:

31. EventID
32. Revision
33. RecordStatus
34. CreatedAt
35. CreatedBy
36. VoidedAt
37. VoidedBy
38. VoidReason

Results:

- 17/17 Event rows received a unique UUID-format EventID
- 17/17 Revision initialized to 1
- 17/17 RecordStatus initialized to `active`
- legacy CreatedAt remained blank
- legacy CreatedBy remained blank
- VoidedAt / VoidedBy / VoidReason remained blank
- second-pass backfill candidates: 0

## Preservation verification

The backup workbook A1:AD18 and migrated staging workbook A1:AD18 were compared cell-by-cell after normalizing omitted trailing blanks.

Result:

**PASS — 0 value differences across the original 30 columns.**

The first comparison appeared unequal because the Sheets values API omitted trailing blank cells differently between the two ranges. A normalized 18 x 30 comparison confirmed zero actual cell-value changes.

## Native-sheet verification

- final grid width: 38 columns
- metadata header order: PASS
- metadata header styling: readable, bold white text on the existing header color
- EventID format/uniqueness: PASS
- Revision values: PASS
- RecordStatus values: PASS

## Limits of this evidence

This exercise validates the **data-level migration contract** using a native Google Sheet and the official mock dataset.

It does **not** execute the Apps Script function `migrateP1EventIdentity()` itself because the connected Drive/Sheets tooling cannot edit or run an Apps Script project.

Therefore final P1 merge still requires an Apps Script staging smoke test:

1. attach/copy the candidate Code + Index into a disposable Apps Script project bound to a staging Sheet;
2. run `migrateP1EventIdentity()`;
3. rerun and verify zero new backfills;
4. test add/edit/stale-edit/void/report through the Web App;
5. confirm the original 30 business columns remain unchanged.

## Gate status

- Code/static checks: PASS
- Automated tests: PASS at last successful candidate before final patch; latest CI must be green before merge
- Native Google Sheets data migration: PASS
- Live Apps Script runtime: PENDING

Do not merge P1 solely from this document until the live Apps Script runtime smoke gate is recorded.
