# G-34 Native24 — Existing TEST Web App Deployment Preflight

**Status:** implementation candidate in feature branch, **NOT MERGED, NOT DEPLOYED**.  
**Source baseline:** `main@0c89aec2e4a43bf2c9944401ca2fb5b1bd342e2d` (Chart.js Renderer PR #119 merged and post-merge CI passed).  
**Remote baseline, as reported by test operator:** **Existing isolated TEST Apps Script Project, Native24 code, Web App Version 11**, with backed-up prior deployment. The production release gate stays `HOLD`.

## Why this repair is necessary

`tools/deploy-g34-clasp.sh` originally recognized only legacy two-file and early Native13-file remote layouts before permitting a backup/preflight. The operator previously deployed the canonical **Native24** source layout to the **same existing TEST project/deployment** at Version 11. The old script therefore now rejects a valid current TEST source. **Do not work around the guard, bypass backup, change Script/Deployment IDs or create new deployments.**

## Exact scope of change

The source-only fix adds the *third* explicitly accepted remote backup layout: **7 canonical GS, 16 canonical HTML partials, and the generated `Index.html`**, matched by exact case-sensitive filename set. It enforces:

1. Existing `appsscript.json` has `runtimeVersion=V8`.
2. `00-bootstrap.gs` contains `doGet()` and `include()`.
3. The **16 trusted HTML partial includes** in the backed-up `Index.html` exactly equal the current canonical order and exclude unknown, missing, duplicate and re-ordered includes.
4. Every expected file is a nonempty regular file.
5. Any other `.gs` / `.html` file or a missing expected source fails closed.

Preserved pre-existing gates: exact approved Source HEAD and `origin/main`, clean `main`, clasp v3, allowed Git origin, repo-external timestamped private backup, remote V8 manifest identity preserved in stage, existing Deployment ID in remote inventory, version inventory before the write, ordered GS `filePushOrder`, fixed 25-file stage allowlist (**24 Native files + the preserved manifest**), read-only `--preflight`, and a distinct `SMART_SRRT_CONFIRM_DEPLOY` matching the exact source SHA for `--deploy`.

## Offline test cases and operator acceptance

- The existing Legacy2 / Native13 backup checks still pass and deny malformed layouts.
- Synthetic Native24 passes only if the filename set, V8 runtime, bootstrap entrypoints, nonempty sources, exact Index include order and source shape all match. Negative cases cover missing/unknown files, missing/duplicate/re-ordered Index includes, invalid V8, invalid bootstrap and empty source.
- `bash -n`, Native 24 build/stage parity, all contract tests, regression suite and P6 code gate remain mandatory.
- **This PR does not execute `clasp`, read any TEST IDs, connect to Sheets/Drive, mutate a Script Project, create a version or update a Deployment.** Even after this PR merges, the operator must separately obtain TEST-only preflight authority and run `--preflight` first, then review the latest timestamped remote backup and existing v11 rollback version before requesting approval for a future `--deploy`.
- A valid operator preflight should display `BACKED_UP_NATIVE_24_LAYOUT=PASS`, `SOURCE_ENTRYPOINTS=PASS`, `REMOTE_MANIFEST_V8=PASS`, `STAGE=PASS (24 files + preserved manifest; ordered script files)`, `SCRIPT_AND_EXISTING_DEPLOYMENT_VERIFIED=PASS`, and `PREFLIGHT=PASS`. Those markers do **not** mean a deploy occurred.
- A future TEST deployment must use only synthetic/test Sheets, Drive and Docs, retain the prior immutable **v11** deployment for rollback, and independently verify existing `/exec` URL, Chart.js canvases, PNG, responsive UI, guest/public aggregate privacy, signed-in role behavior and Console errors. No installer, migration or Gemini report is part of this procedure.
- Do not change Production while `releaseDecision=HOLD`.

## Approval boundaries

**Current task approval** authorizes PR #119 merge and technical development of this repair, **not** merge of the repair itself and **not** a TEST deploy. Explicit separate Product Owner approval is required for each subsequent Merge and TEST remote write. Real Chrome/Apps Script iframe UAT is still not verified by offline CI.
