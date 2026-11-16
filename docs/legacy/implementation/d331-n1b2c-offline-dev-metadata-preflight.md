# D331 N1-B2C — Development-only Metadata Preflight (V2)

**Change Issue:** #190 · **Parent:** #189, #187, #183 · **Source baseline:** `main@6843367c3824f118743a302ba9a5caef789e5285`

## Corrected environment assumption

The Product Owner confirmed **Smart SRRT is still in development; Production does not exist**. No Production Google Script, Deployment or Spreadsheet identifiers are expected, and **no fake IDs should be entered** to satisfy a checker.

Smart SRRT Dengue 3-3-1 remains in the **existing Development/Testing Apps Script and Spreadsheet**, not a new sandbox and not a separate Production installation. A Development installation may share the same Script/Deployment/Spreadsheet for testing. This does not authorize a release.

## What changed (Source-only)

The offline private-evidence format is now `D331_B2C_PRIVATE_METADATA_V2`. V1 is **rejected** rather than silently translated; private evidence must be collected anew under this explicit Development-only schema. The checker remains **Node-only**, reads a local owner-only (`0600`) private JSON outside the repository, never contacts Google and never validates the authenticity of its operator-supplied observations.

The new mandatory `environment` object is:

```json
{
  "productionStatus": "NOT_CONFIGURED",
  "testingTopology": "SHARED_DEVELOPMENT_TESTING"
}
```

The `testingTopology` may instead be `SEPARATE_TEST` **only if** a genuinely separate, independently established TEST identity exists.

- **Production not configured:** `knownProdScriptIds`, `knownProdDeploymentIds`, `knownProdSpreadsheetIds` must be **empty arrays**. Omitting these fields, inserting placeholder values, or reporting `productionStatus: CONFIGURED/UNKNOWN` fails closed.
- **Shared Development/Testing:** `knownTestScriptIds`, `knownTestDeploymentIds`, `knownTestSpreadsheetIds` must also be **empty arrays**. A shared installation is explicitly declared rather than fabricated as an isolated TEST.
- **Separate TEST:** all three `knownTest*` arrays must be nonempty, unique, valid IDs that do not equal the observed Development Script/Deployment/Spreadsheet. Known TEST identifiers are required only when `testingTopology=SEPARATE_TEST`.
- **Still mandatory:** exact expected-vs-observed existing Script ID, Deployment ID, parent Script ID; explicitly present `DATABASE_SPREADSHEET_ID` property and exact DEV Spreadsheet binding; valid Google Sheets MIME, custodian-reviewed owner/ACL; canonical MainData **39/39** and AreaMaster **10/10** header order; observation time within 24 hours and exact approved Source SHA; no PHI row reads and no property/script/sheet mutation; safe file ownership and fully redacted stdout.

All metadata in this file, including the operator's assertion that Production does not exist, is **self-reported**. Passing the offline tool is not a Google attestation. The connected Google Drive check previously confirmed a matching staging spreadsheet's headers, but **did not verify Apps Script Script Properties or Script→Deployment→Spreadsheet binding**.

## Private V2 evidence fields (no real identifiers in Git)

```text
format: D331_B2C_PRIVATE_METADATA_V2
sourceSha: approved exact SHA of the intended source
observedAt: canonical UTC ISO instant
environment:
  productionStatus: NOT_CONFIGURED
  testingTopology: SHARED_DEVELOPMENT_TESTING | SEPARATE_TEST
script:
  expectedDevId, observedId
  expectedDeploymentId, observedDeploymentId, deploymentParentScriptId
  knownProdScriptIds: [] (required empty)
  knownProdDeploymentIds: [] (required empty)
  knownTestScriptIds: [] if shared; otherwise actual distinct IDs
  knownTestDeploymentIds: [] if shared; otherwise actual distinct IDs
database:
  expectedDevId, observedId, scriptPropertyId, propertyPresent
  mimeType, ownerReviewedAsDev, aclReviewedAsDev
  knownProdSpreadsheetIds: [] (required empty)
  knownTestSpreadsheetIds: [] if shared; otherwise actual distinct IDs
headers:
  main: exact 39 source headers
  areas: exact 10 source headers
readScope:
  metadataOnly: true
  patientRowsRead: false
  propertyMutated: false
  spreadsheetMutated: false
  scriptMutated: false
```

**No guessed ID or fake operator review flag is acceptable.** Keep the private file outside the repository, never paste raw credentials/IDs/patient data in GitHub. Actual Script Property values require separate, genuine read-only evidence from the existing Apps Script project.

## Usage (only with genuine privately captured evidence)

```bash
chmod 600 /secure/private/d331-b2c-dev-metadata.json
node tools/d331-b2c-offline-dev-metadata-preflight.mjs \
  --private-file /secure/private/d331-b2c-dev-metadata.json \
  --expected-source-sha <EXACT_APPROVED_SOURCE_SHA>
```

Status-only response on locally consistent evidence:

```text
B2C_PRIVATE_EVIDENCE_SHAPE=PASS
B2C_ACTUAL_DEV_CLOUD_IDENTITY=NOT_VERIFIED
B2C_GOOGLE_API=NOT_CALLED; B2C_LIVE_ACCESS=HOLD
D331_FEATURE=OFF; DDL_TEST=HOLD; PRODUCTION=NOT_CONFIGURED
```

A failure returns code 2, prints no file contents, identifiers, account names, private paths or user-supplied fields, and preserves `B2C_LIVE_ACCESS=HOLD`.

## What is not changed

- Existing `getDb_()` may implicitly write `DATABASE_SPREADSHEET_ID`; it is **not** called by the tool.
- Existing `getSheetByIdOrName_()` can silently fall back to name; not used as a D331 target identity check.
- `findEventRowById_()` returns the first match; D331 runtime still requires a separately implemented duplicate check.
- `getAreaMaster()` uses permissive Active filtering; no D331 permission is derived from it.
- **No Native25 registration, public RPC, patient data access, Apps Script API, `clasp`, migration, database repair, TEST deploy or Production activity.**
- `D331_G1A_ENABLED=false` and offline N1-B1/N1-B2B remain unregistered.

## Review and human gates

1. **N1-B2C corrective:** this PR updates only the checker, its tests and its documentation, and must pass exact-SHA CI and adversarial review before **separate Product Owner Merge approval**.
2. **Actual DEV binding:** existing Script/Deployment/Spreadsheet and `DATABASE_SPREADSHEET_ID` relationship is **still NOT_VERIFIED**; collect independent real evidence without reading patient rows or writing Script Properties. No need for Production IDs.
3. **D331 Runtime, DDL and Testing:** independently approved grants, clinical disease policy, AreaID semantics, private-data handling, runtime security and test rollout remain gated. No deployment is implied by fixing an offline checker.

**Expected tests:** Development-only shared mode succeeds with zero fake Production/TEST IDs, separate TEST with real distinct IDs succeeds, unknown/omitted modes fail, contradictory Production IDs fail, cross-boundary ID mismatch fails, old V1 evidence fails, strict header/mutation/redaction checks remain green.