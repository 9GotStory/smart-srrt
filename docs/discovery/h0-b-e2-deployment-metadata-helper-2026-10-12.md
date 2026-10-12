# H0-B E2 — Operator-run GET-only Deployments Metadata Helper

**Date:** 2026-10-12 (Asia/Bangkok)  
**Planning baseline:** `main@4ab00cf355884feab52f96d34240832d0983ef5f`; [Issue #110](https://github.com/9GotStory/smart-srrt/issues/110).  
**Authorization:** OFFLINE DEVELOPMENT ONLY. Creating/reviewing this helper is **not permission** to connect to a real Google project. `E1=BLOCKED/NOT_RUN`, `E2=BLOCKED/NOT_RUN`, `ADR_AUTH_01=PROPOSED`, `APPS_SCRIPT_DEPLOYMENT=HOLD`.

## Why this isolated helper exists

The connected ChatGPT Google Drive plugin is not Google Workspace Admin and does not expose the Apps Script Deployments API. The former H0-B procedure requires an approved human custodian and actual deployment evidence; [Google's deployments.list REST API](https://developers.google.com/apps-script/api/reference/rest/v1/projects.deployments/list) can retrieve deployment metadata through a **GET-only** request with already-authorized `script.deployments.readonly` scope. The response includes deployment IDs, descriptions and live URLs, which must **never be pasted into a public issue**.

`tools/h0-e2-deployments-readonly.mjs` is a **separate Node 24 operator helper**, not a Google Apps Script `.gs` file and not part of the Native stage. It does **not** change authentication, users, Script Properties, Apps Script source, manifest, deployment or publication. It never executes a GAS function. Tests are fully synthetic and inject fake `fetch` responses; no actual Google API request is made in GitHub CI.

## Operator prerequisites (all required; not currently satisfied)

1. Named Product Owner separately approves the **exact Apps Script project class**, authorized operator, metadata-only request, permitted existing OAuth identity, and restricted evidence custodian. Record this privately. Neither Issue #110 nor this PR supplies those rights.
2. The designated operator already has a valid OAuth 2 access token authorized for **`https://www.googleapis.com/auth/script.deployments.readonly`**. Do **not** mint or request new broader scopes for this task without a separate permission approval. Never insert a token into command-line arguments, PR comments, GitHub Actions secrets/logs, shell history or chat.
3. Operator personally confirms project identity and intended published deployment **outside GitHub**. The Script ID and expected Deployment ID are provided only in ephemeral local environment variables on the operator's trusted machine; the helper does not discover them from Google Drive or local `.clasp.json`.
4. Run from a private operator terminal, not CI/Cloud Shell with session recording enabled. Treat terminal and process environment as sensitive; other privileged local processes may inspect environment variables.

## Safe operator sequence — **example ONLY after explicit Human Gate**

On a trusted, authorized Linux shell (never paste actual input values into GitHub or chat):

```bash
# Source code must first be on an exact reviewed and approved local SHA.
# Prompting avoids putting secret values in the command line or shell history.
read -rs -p 'Authorized Apps Script ID: ' H0_E2_SCRIPT_ID; printf '\n'
read -rs -p 'Existing readonly OAuth access token: ' H0_E2_ACCESS_TOKEN; printf '\n'
read -rs -p 'Expected Deployment ID (optional; Enter if unknown): ' H0_E2_EXPECTED_DEPLOYMENT_ID; printf '\n'
export H0_E2_SCRIPT_ID H0_E2_ACCESS_TOKEN H0_E2_EXPECTED_DEPLOYMENT_ID
H0_E2_APPROVED_READONLY=YES H0_E2_TARGET_CONFIRMED=YES \
  node tools/h0-e2-deployments-readonly.mjs --approved-readonly
unset H0_E2_SCRIPT_ID H0_E2_ACCESS_TOKEN H0_E2_EXPECTED_DEPLOYMENT_ID
```

If interrupted, **unset the environment variables immediately**. Do not enable shell `set -x` or store raw API JSON. The helper's printed evidence omits deployment IDs, Script IDs, names, email addresses, descriptions, URLs, token, and raw page tokens. It returns only category enums, boolean classes and coarse `ZERO/ONE/TWO_TO_FIVE/SIX_OR_MORE` counts. Prefer capture to a restricted evidence store **after** authorized operator privacy review. If expected deployment ID is omitted, no specific deployment is considered matched; `expected_deployment_present=UNKNOWN`.

### Fail-closed constraints

- CLI without `--approved-readonly` returns `BLOCKED` **without any network access**.
- Requires both `H0_E2_APPROVED_READONLY=YES` and `H0_E2_TARGET_CONFIRMED=YES`; missing project ID or token also stops before network.
- Hardcoded host: `https://script.googleapis.com`, path `/v1/projects/{scriptId}/deployments`, HTTP `GET` only. Does not invoke `clasp`, GAS functions, project source or manifest APIs, POST/PATCH/PUT/DELETE. Does not follow redirects. Pages limited to 10, 50 rows per page, with a fixed timeout and cycle detection.
- 401/403, unknown enums, malformed response, network exceptions and pagination anomalies **do not generate a PASS**. Errors are reduced to stable, non-sensitive codes. If API returns unknown/ambiguous fields, outputs `UNKNOWN` or `BLOCKED`.
- `e2_result=METADATA_ONLY_OPERATOR_REVIEW_REQUIRED` is **not proof** the project was authorized, that all exposed deployments were identified, that effective live OAuth/ACL worked, or that MFA is enforced. It is a metadata classification for operator review only.

### Scope limitations

E1 Google Workspace 2-Step Verification policy coverage remains **manual, authorized Workspace Admin-only**. E2 `deployments.list` does not enumerate `appsscript.json` `oauthScopes`, Script Properties, source, Google account active/effective identity, Sheet/Drive ownership, report access or live HTML RPC behavior; E3/E4/RR-02 require separate approvals. The tool may classify multiple Web Apps as `MIXED`; it must not guess which /exec is serving Smart SRRT if the deployment ID has not been confirmed. Historic deployments may remain exposed and require an additional verified inventory.

## Synthetic verification (offline)

Run `node --test tests/h0-e2-deployments-readonly.test.mjs` to exercise public enums, unknown deployment targeting, 2-page mocked GET behavior, strict Human Gates, accidental sensitive-data leakage, malformed/unauthorized API and pagination failures. The test suite runs via existing `npm test` because it is under `tests/*.test.mjs`.

**No real Google requests were made to develop, test or document this helper.** `H0_B_E1=BLOCKED`, `H0_B_E2=BLOCKED`, `R01_R08=OPEN`, `APPS_SCRIPT_DEPLOYMENT=HOLD`. This branch/PR must not be Merged without a separate owner authorization.
