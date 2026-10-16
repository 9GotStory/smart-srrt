# D331 N1-B2C-A — Existing DEV Metadata Preflight, Offline Evidence Gate

**Parent:** #183 · **Issue:** #187 · **Baseline:** `main@8b36a22cd2ce3d1584d4ed38190bc6dfb2ea7d41`  
**Operational scope:** continue integrating Dengue 3-3-1 inside the **existing Smart SRRT DEV**; do not create another Apps Script or Spreadsheet. This PR only checks **privately captured metadata** locally. No Google API or Apps Script remote read was performed, and it deliberately **cannot establish actual Google provenance**.

## What the new preflight does

`tools/d331-b2c-offline-dev-metadata-preflight.mjs` reads one locally held, absolute-path JSON file outside the Git repository and refuses symlinks, non-owner-only file permissions and oversized files. It validates the **shape and internal consistency** of operator/custodian-observed metadata. It does not automatically collect or authenticate that metadata.

The local check requires:

- Approved exact source SHA and evidence observed in the last 24 hours, in canonical UTC.
- Observed DEV Script ID == custodian-pinned DEV Script ID; observed DEV Deployment ID == pinned DEV Deployment ID; deployment's parent Script ID matches. Known Production and TEST Script/Deployment IDs are required and must not overlap.
- `DATABASE_SPREADSHEET_ID` Script Property **explicitly present**, and its value == observed DEV Spreadsheet ID == pinned DEV Spreadsheet ID. No active-sheet fallback. Known Production and TEST Spreadsheet IDs are required and must not overlap.
- Metadata reports expected Google Sheets MIME type and custodian-reviewed DEV owner and access permissions. These are **claims** until independently verified with an approved real read-only inspection.
- **Exact** MainData 39 headers (including EventID col31, Revision col32, RecordStatus col33 and OwnerUserID col39) and AreaMaster 10 headers. Missing, extra, swapped, duplicate or mistyped names are DENY. Header-only capture; **no patient rows**.
- Attested metadata-only execution: no patient row read, Script Property mutation, Spreadsheet mutation or Script mutation. Again, file claims alone do not prove the absence of side effects.

The comparator uses only Node built-ins and local files. It does **not** import Google clients, run `clasp`, spawn external tools, call `getDb_()`, `getSheetByIdOrName_()`, `ensureSheet_()` or modify the native manifest, D331 permissions, source or deployment.

## Private evidence schema (field names only)

```text
format: D331_B2C_PRIVATE_METADATA_V1
sourceSha: approved 40-char main SHA
observedAt: canonical UTC ISO instant
script:
  expectedDevId, observedId
  expectedDeploymentId, observedDeploymentId, deploymentParentScriptId
  knownProdScriptIds[], knownTestScriptIds[]
  knownProdDeploymentIds[], knownTestDeploymentIds[]
database:
  expectedDevId, observedId, scriptPropertyId, propertyPresent
  mimeType, ownerReviewedAsDev, aclReviewedAsDev
  knownProdSpreadsheetIds[], knownTestSpreadsheetIds[]
headers: main[39] and areas[10] exact source header arrays
readScope:
  metadataOnly=true, patientRowsRead=false
  propertyMutated=false, spreadsheetMutated=false, scriptMutated=false
```

**Do not create an evidence file with guessed IDs, invented operator attestations or patient data.** Capture these fields in the responsible custodian's restricted workspace only after explicit permission for the read-only Google identity/header checks. The comparator does not have network access and cannot produce real evidence on its own.

## Offline invocation (after genuine private capture)

```bash
# On authorized Fedora operator host. Private evidence is NEVER committed.
chmod 600 /secure/private/d331-b2c-dev-metadata.json
node tools/d331-b2c-offline-dev-metadata-preflight.mjs \
  --private-file /secure/private/d331-b2c-dev-metadata.json \
  --expected-source-sha <EXACT_APPROVED_MAIN_SHA>
```

Only redacted, status-only output is allowed:

```text
B2C_PRIVATE_EVIDENCE_SHAPE=PASS
B2C_ACTUAL_DEV_CLOUD_IDENTITY=NOT_VERIFIED
B2C_GOOGLE_API=NOT_CALLED; B2C_LIVE_ACCESS=HOLD
D331_FEATURE=OFF; DDL_TEST_PRODUCTION=HOLD
```

The `PASS` above means only *locally supplied evidence passed consistency checks*; it **does not** prove the evidence is authentic, that DEV is isolated, or that any live authorization/migration/deploy may proceed. A failure prints only generic status codes and exits 2; it must never log identifiers, usernames, tokens, paths or PHI.

## Why the existing helpers are not used

Source inspection proved `getDb_()` may invoke `props.setProperty('DATABASE_SPREADSHEET_ID',...)` if the property is missing, `getSheetByIdOrName_()` silently falls back by name, `findEventRowById_()` accepts the first duplicate, and `getAreaMaster()` has loose Active semantics. None can establish a trusted D331 authorization path or verified environment identity. The B2C-A local check also does not claim it does.

## Gate sequence

1. **B2C-A (this PR):** source-only Node local consistency check, synthetic fixtures and documentation → exact-SHA CI and security review → **separate Product Owner approval before Merge**.
2. **B2C-B (separately authorized live read-only capture):** an identified DEV custodian independently verifies Script/Deployment IDs, expected DB Script Property, Spreadsheet owner/ACL and precise headers via a constrained, audited, genuine Google **read-only** workflow. Do not read patient rows or use fallbacks/installer. Private target IDs stay outside GitHub. If owner, isolation or property is unknown, stop.
3. **B2C-C / B2D (future):** only after positive live identity and clinical/grant/Area/PHI policy decisions; source/runtime adapters separately reviewed; any physical seven D331 tables, TEST release and Production still separately gated.

**Current status:** `N1_B2C_LOCAL_EVIDENCE_TOOL=SOURCE_ONLY`, `N1_B2C_REAL_DEV_TARGET=NOT_VERIFIED`, `D331_FEATURE=OFF`, `B2D/DDL/TEST/PRODUCTION=HOLD`.

## Security test matrix

Valid synthetic 39/10 headers and cross-environment metadata; wrong source SHA; stale/future timestamps; wrong Script/Deployment/Sheet relation; known PROD/TEST overlap; missing/duplicate known IDs; missing Script Property; unreviewed Owner/ACL; misleading MIME; extra PHI fields; wrong/reordered/duplicate/extra headers; claimed mutation or patient-row reads; private evidence in repo, symlink, weak file permissions; safe stdout redaction.

The tests create only temporary **synthetic** files outside the Git worktree. No Google account, Script or real patient data is touched.