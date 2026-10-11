# Smart SRRT — Native Multi-file Google Apps Script Deployment Candidate (G-34)

**Status (10 Oct 2026):** GitHub implementation candidate / offline verification only. **Not yet deployed to Google Apps Script.** Keep the existing deployed Web App and its current version unchanged until a separately approved release gate.

## Decision and boundary

The preferred future Apps Script project is **native multi-file**, not a single 180 KB `Code_...OneClick.gs` + 127 KB `Index_...OneClick.html` source paste. Canonical editing remains in `src/server/` and `src/web/` in GitHub. A deterministic build exports 13 files, with no new framework, database, services, or runtime dependencies. This package deliberately retains current interfaces, report behavior, Google Sheet schema v7, and the existing `doGet` implementation.

The prior One-Click artifacts remain **legacy compatibility/rollback evidence** until the multi-file Apps Script candidate has been independently reviewed, tested, and explicitly authorized. Do not delete One-Click root artifacts from GitHub or edit the live deployment as part of building this package.

## Native Apps Script project layout

**Server files (7; Apps Script type: Script):**

| Apps Script file | Canonical GitHub source |
| --- | --- |
| `00-bootstrap.gs` | `src/server/00-bootstrap.gs` |
| `01-schema-and-db.gs` | `src/server/01-schema-and-db.gs` |
| `02-auth-and-attachments.gs` | `src/server/02-auth-and-attachments.gs` |
| `03-events-and-dashboard.gs` | `src/server/03-events-and-dashboard.gs` |
| `04-admin-and-audit.gs` | `src/server/04-admin-and-audit.gs` |
| `05-reports-and-models.gs` | `src/server/05-reports-and-models.gs` |
| `06-gemini-and-prompts.gs` | `src/server/06-gemini-and-prompts.gs` |

**HTML files (6; Apps Script type: HTML):**

| Apps Script file | Source |
| --- | --- |
| `Index.html` | Generated, minimal template; **must replace** the old monolithic `Index.html` |
| `00-document-head.html` | `src/web/00-document-head.html` |
| `01-styles.html` | `src/web/01-styles.html` |
| `02-app-layout.html` | `src/web/02-app-layout.html` |
| `03-modals.html` | `src/web/03-modals.html` |
| `04-browser-app.html` | `src/web/04-browser-app.html` |

Apps Script's editor shows an HTML file as `Index` / `00-document-head` with the `.html` extension, and all 7 Script files have the `.gs` extension. The files are **at one Apps Script project level**, not in `src/` folders. Do **not** add a second `Code.gs` containing any of the same declarations.

**Project manifest is separate from these 13 source files.** The generated distribution deliberately does **not** contain `appsscript.json`, `.clasp.json`, or OAuth credentials. Back up and preserve the actual staging/existing project's `appsscript.json` (especially its `runtimeVersion`, `oauthScopes`, web app and exception-logging settings) rather than guessing new scopes or overwriting its manifest. Ensure the project uses the `V8` runtime before validating. A fresh Apps Script project needs a legitimate manifest from that project; do not copy another district's project identifiers, settings or authorization context.

**V8 execution order is a release precondition.** Arrange the seven Script files in the explicit `00`→`06` order above in the Apps Script editor/project. Do not assume that alphabetic names alone guarantee the runtime evaluation order. Apps Script executes project Script files in a shared global scope, and top-level initialization can depend on the order. For a future `clasp` flow, pin its `filePushOrder` explicitly rather than trusting defaults. This is based on the [official V8 runtime guidance](https://developers.google.com/apps-script/guides/v8-runtime). The existing Node syntax/parity tests do not verify the real Apps Script evaluation order.

The new `Index.html` is a trusted source-only include template. Its complete content is:

```html
<?!= include('00-document-head') ?><?!= include('01-styles') ?><?!= include('02-app-layout') ?><?!= include('03-modals') ?><?!= include('04-browser-app') ?>
```

The existing `doGet` in `00-bootstrap.gs` already uses `HtmlService.createTemplateFromFile('Index').evaluate()`; its existing `include(filename)` calls `HtmlService.createHtmlOutputFromFile(filename).getContent()`. No function needs to be renamed and no replacement `doGet` is required. The force-print syntax `<?!= ... ?>` is used **only for trusted, version-controlled HTML fragments**; never pass unsanitized user text to it.

**HTML partials are intentional fragments.** Their `<head>`, `</head>`, `<body>`, `</body>`, `<style>`, and `<script>` tags span different source files. Do not load them individually as pages, insert extra wrappers, or reorder them.

## Build and verify locally (offline only)

```bash
npm run build:gas-multifile
npm run check:gas-multifile
npm run build:check
npm test
```

The first command creates a **generated, untracked** `dist/apps-script/` directory containing exactly 13 files. This is the source for copying into an Apps Script project. The second command checks that each generated file matches its canonical source, detects stale/missing/extra files, and **directly compares** the ordered server bytes and simulated expansion of `Index.html` with both *committed* One-Click artifact files. It is read-only and rejects source-to-artifact drift.

`npm run build:check` independently verifies that the **committed** One-Click compatibility artifacts still match the sources. Tests also verify basic JavaScript syntax, server RPC visibility and unchanged HTML byte sequence. These are **offline checks**, not real Apps Script editor/compiler/runtime, template rendering, Google Workspace, permissions or deployed Web App verification.

## Safe rehearsal and migration into Apps Script

1. **Back up** the existing Apps Script source, **`appsscript.json` manifest and OAuth scope configuration**, project/deployment identifiers and current deployment version; preserve the current live Web App URL. Work in a **separate staging project with synthetic data** first, not a copy pointing to live patient/event Sheets, Drive assets or Gemini credentials. Compare staging and target V8 runtime/manifest settings without propagating production credentials.
2. In the staging Apps Script project, add the 7 `.gs` files and 6 HTML files from `dist/apps-script/`. The `Index` HTML file is only the tiny include template. **Do not keep the old monolithic `Code` or full `Index` alongside them**: this would produce duplicated server declarations or the wrong HTML view.
3. Save the complete set, then verify editor acceptance and template rendering. Confirm `doGet` produces a page; check function names, server-side RPC, authentication/authorization, public aggregate privacy behavior, EventID/Revision, ReportRegistry history and report action rendering against approved test fixtures. Do not run installers or migrations just to test the split.
4. Confirm scope/rollback and obtain explicit **Product Owner approval to update the existing Apps Script project**. During the controlled cutover, first preserve an independently restorable backup/version of the existing `Code` and `Index`; then **replace**, not coexist with, the monolithic server code by the seven ordered `.gs` files and the full `Index` by the six HTML files. Removing legacy *source files from the active editable project* is necessary to prevent duplicate global functions; retaining the **backup / previous immutable deployment version** is the rollback mechanism. Confirm no duplicate functions and no missing partials before creating a new deployment version.
5. **Deployment is a separate authorization.** If approved, publish a **new version of the existing deployment** rather than creating an unrelated URL; verify its expected behavior and preserve a rollback route to the previous immutable deployment version. The source conversion itself must not run `installSmartSRRT()`, `repairInstallation()`, `migrate*()`, `archiveAuditLogs()`, or real Gemini report generation.
6. After the approved live verification, retain the immutable prior deployment version, the backed-up monolithic source and Git release evidence for rollback/audit until the retention decision is separately approved. **Do not leave a duplicate One-Click server file in the active Apps Script source** after cutover. Historical P4→v7 data migration remains **HOLD** and is not part of this work.

**Important:** A successful build or GitHub merge does not propagate files to Google Apps Script. There is no connected Apps Script deployment/editing action in this workflow; project changes must be carried out through an independently authorized operator process.

### Guarded clasp 3.x operator workflow (script committed, not executed)

The repository includes [`tools/deploy-g34-clasp.sh`](../../tools/deploy-g34-clasp.sh) for a **separately approved operator action on Fedora**. This tool is **not** called by GitHub Actions, and merely committing or merging it does **not** authorize or perform any Apps Script deployment. Current G-34 runtime validation/cutover is still pending.

Required inputs (set in the operator's terminal, **never commit values to GitHub**):

- `SMART_SRRT_APPROVED_SOURCE_SHA` — exact 40-character `main` SHA, reviewed and approved **separately** for deployment; script rejects a moving/unreviewed `main`.
- `SMART_SRRT_SCRIPT_ID` — target Apps Script project's Script ID (Project Settings).
- `SMART_SRRT_DEPLOYMENT_ID` — **existing** Web App Deployment ID (not Script ID).
- Optional: `SMART_SRRT_REPO` (default `~/dev/smart-srrt`), `SMART_SRRT_BACKUP_ROOT` (defaults outside Git), `SMART_SRRT_CLASP`.

Run only after authenticating clasp 3.x on the operator's machine and collecting an explicit **deployment approval** (separate from approval to merge this script):

```bash
cd /home/thanakorn/dev/smart-srrt
git fetch origin main
git switch main
git pull --ff-only origin main
# Export the three target values above from separately verified records;
# do not paste project IDs or tokens into GitHub, issues, or CI logs.
bash tools/deploy-g34-clasp.sh --preflight
```

**Preflight does not push or update deployments.** It checks exact local/remote SHA, source parity, contracts and offline tests; pulls the current source/manifest into a private local backup; requires V8 and exactly `Index.html` plus one recognized legacy server file — `Code.gs` **or** its observed Thai-named counterpart `รหัส.gs`; also verifies the server contains `doGet` and `include` entrypoints, and validates the **existing** deployment ID; prepares precisely 7 ordered `.gs`, 5 HTML partials, one `Index.html`, plus the **unchanged pulled `appsscript.json`**. Extra remote script/HTML files stop the migration (no silent deletion). Inspect the backup and the proposed file-status report.

Only after a separate explicit go/no-go decision, the operator may set `SMART_SRRT_CONFIRM_DEPLOY` to the same approved SHA and run `bash tools/deploy-g34-clasp.sh --deploy`. The script rechecks all gates, runs `clasp push` (replaces remote editable source), then `clasp update-deployment` against the existing ID (new immutable version / same Web App URL). The pushed editable HEAD and the deployed immutable version are **distinct**: a push success followed by update failure requires investigation, not an automatic retry.

**Localized legacy file-name recovery (2026-10-11):** A read-only `clasp pull` from the existing test project returned `Index.html` + `รหัส.gs`. This name differs from the previously assumed `Code.gs`, so the original `--preflight` correctly stopped **before any remote write**. The guarded script now recognizes either exact legacy layout; it still stops for duplicate or unknown script/HTML files, missing `doGet`/`include`, or a non-V8 manifest. Recognition of a legacy filename is **not** confirmation of live source parity or deployment readiness. Keep the private pulled backup and inspect any source divergence separately before approving `--deploy`. No script IDs, deployment IDs or credentials are stored in the repository.

Preflight does **not** validate live Apps Script execution or verify real health data, Google Docs, Gemini, or the actual Web App. This script deliberately does **not** run Installer, Repair, Archive, Migration or Report generation. Keep all local backup output, `.clasp.json`, authorizations and manifest outside GitHub. The first actual cutover must also satisfy the staging/synthetic-data and human approval gates described above. See [clasp 3.x commands and filePushOrder](https://github.com/google/clasp#project-settings-file-claspjson).



## Why this approach

- Smaller editable files in Google Apps Script, matching GitHub source one-for-one.
- No duplicated application implementation in the repository beyond the existing backward-compatible One-Click artifacts.
- Exact HTML order retained; no new browser scripts or different server API.
- Zero persistent-data schema changes; no new secrets, data import or external API.
- Offline consistency remains testable; staged Apps Script behavior remains an **explicit unverified gate**.

**Authority:** `AGENTS.md`, `README.md`, `tools/build-apps-script-multifile.mjs`, existing `docs/architecture/g30-canonical-modular-release.md` and `docs/governance/migration-version-release-policy.md`. Official Google Apps Script docs: [HTML templates](https://developers.google.com/apps-script/guides/html/templates), [HTML Service](https://developers.google.com/apps-script/guides/html), [Multiple server files and project import/export](https://developers.google.com/apps-script/guides/import-export).
