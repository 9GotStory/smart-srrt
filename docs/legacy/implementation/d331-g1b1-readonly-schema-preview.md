# D331-G1-B1 — Offline Read-only Adapter & Schema Preview

**Status:** Source-only candidate for Product Owner-approved G1-B1. NOT an operational release.  
**Parent:** #171 (G1-B0), #169 (G1-A)  
**Baseline:** main@90da51294aa2920b15725951ded6ad0219bbc385; recheck exact SHA at review.

## Files and hard boundaries

- `src/dengue/01-g1b1-readonly-adapter.gs`: pure source-only adapter for schema metadata inspection and synthetic MainData event metadata projection.
- `tests/d331-g1b1-readonly-adapter.test.mjs`: Node synthetic-only tests, negative failure cases, no Spreadsheet/Drive/Production.
- G1-A `src/dengue/00-g1a-foundation.gs` stays unchanged. Neither G1-A nor G1-B1 is included in `tools/native-sources.mjs`.
- No modification to existing Native 24-file stages, trusted `include()` allowlist, `MainData`, script properties, install/repair, audit, or One-Click sources.

## Preview interface — intentionally injected mock reader

`d331B1ReadPreview_(reader)` accepts exactly four read-only methods:
`listTableNames()`, `readModuleVersion()`, `readTableHeaders(knownName)`, `readTableRowCount(knownName)`.

The adapter only inspects seven known Dengue table names from **provisional G1-A headers**. It never reads data rows. Both `d331B1ReadPreview_(reader)` and `d331B1PreviewFromReader_(reader)` return sanitized preview classifications and counts, never raw headers or underlying reader errors. Reader failures are replaced with a generic `D331_B1_READ_FAILED` error to avoid exposing private text or IDs.

`d331B1PreviewSchema_(snapshot)` is pure. It detects missing tables, wrong/duplicate headers, schema-version mismatch, populated schema conflicts and malformed counts. Even when all candidate headers match, it returns `status:'HOLD'`, `canApply:false`, `canEnable:false`, `requiresOperatorApproval:true`. No live Google Sheets adapter exists in G1-B1.

**Do not treat these provisional headers as approved physical DDL**: fields for clinical activity, patient minimization, retention, plan episodes and idempotency details are not frozen.

## Event metadata adapter

`d331B1ProjectEvent_(mainRow)` extracts synthetic column 31 EventID, 32 Revision, 33 RecordStatus and 39 OwnerUserID. It deliberately does not include MainData columns 1–30 or other free-text/patient content. No evidence from callers is accepted: `areaEvidenceAvailable:false`, `areaId:null`, `eligibleDisease:false`, `authorizationReady:false` always. No browser RPC accepts or produces this DTO.

**Required for any future live adapter:** an approved, operator-gated read-only implementation that verifies the exact database ID without mutating Script Properties, scans only authorized metadata, and loads authoritative AreaID grants. A self-reported `verified:true` object is not security evidence; the synthetic projector ignores all such objects. All patient read/write functions stay disabled.

## Operational follow-on gates (still HOLD)

- G1-B2: actual isolated TEST spreadsheet schema migration / apply; backup, dry run, no-destructive preflight, rollback, explicit Product Owner approval.
- G1-B3: event-scoped permissions, approved personal data fields and retention, trusted RequestLedger persistence, durable row verification and audit integration.
- G2: epidemiology-approved Day0/3-3-1/area radius/follow-ups, UX and clinical reporting.
- Merge of this PR requires **a separate decision** after exact SHA and CI review. TEST/Production deployment is never authorized by the merge.

## Review verification

Run `node --test tests/d331-g1b1-readonly-adapter.test.mjs`, `npm run check:contracts`, `npm test`, `npm run build:check`. Compare against exact merge baseline. Verify all changes are **additive only**, no runtime manifest registration and no external service calls. Synthetic tests verify no row/cell contents or unexpected table names enter read paths; mutation facilities absent; all previews keep `canApply=false`. Passing Node tests does not establish live Google Apps Script integration, privacy compliance or migration readiness.
