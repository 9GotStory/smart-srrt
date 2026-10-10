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

The first command creates a **generated, untracked** `dist/apps-script/` directory containing exactly 13 files. This is the source for copying into an Apps Script project. The second command checks that each generated file matches its canonical source, detects stale/missing/extra files, and checks that the server concatenation and offline expansion of `Index.html` are equivalent to the previous One-Click packaging. It is read-only.

`npm run build:check` independently verifies that the **committed** One-Click compatibility artifacts still match the sources. Tests also verify basic JavaScript syntax, server RPC visibility and unchanged HTML byte sequence. These are **offline checks**, not real Apps Script editor/compiler/runtime, template rendering, Google Workspace, permissions or deployed Web App verification.

## Safe rehearsal and migration into Apps Script

1. **Back up** the existing Apps Script source, project/deployment identifiers and current deployment version; preserve the current live Web App URL. Work in a **separate staging project with synthetic data** first, not a copy pointing to live patient/event Sheets, Drive assets or Gemini credentials.
2. In the staging Apps Script project, add the 7 `.gs` files and 6 HTML files from `dist/apps-script/`. The `Index` HTML file is only the tiny include template. **Do not keep the old monolithic `Code` or full `Index` alongside them**: this would produce duplicated server declarations or the wrong HTML view.
3. Save the complete set, then verify editor acceptance and template rendering. Confirm `doGet` produces a page; check function names, server-side RPC, authentication/authorization, public aggregate privacy behavior, EventID/Revision, ReportRegistry history and report action rendering against approved test fixtures. Do not run installers or migrations just to test the split.
4. Confirm scope/rollback and obtain explicit **Product Owner approval to update the existing Apps Script project**. During the cutover, remove the monolithic server code and replace the full `Index` as part of one controlled source change. Confirm there are no duplicate function definitions and no missing HTML partials before saving/deploying.
5. **Deployment is a separate authorization.** If approved, publish a **new version of the existing deployment** rather than creating an unrelated URL; verify its expected behavior and preserve a rollback route to the previous immutable deployment version. The source conversion itself must not run `installSmartSRRT()`, `repairInstallation()`, `migrate*()`, `archiveAuditLogs()`, or real Gemini report generation.
6. Only when the live multi-file deployment is confirmed and the rollback gate is closed may the old One-Click **file inside the Apps Script project** be removed permanently; keep Git history / release evidence. Historical P4→v7 data migration remains **HOLD** and is not part of this work.

**Important:** A successful build or GitHub merge does not propagate files to Google Apps Script. There is no connected Apps Script deployment/editing action in this workflow; project changes must be carried out through an independently authorized operator process.

## Why this approach

- Smaller editable files in Google Apps Script, matching GitHub source one-for-one.
- No duplicated application implementation in the repository beyond the existing backward-compatible One-Click artifacts.
- Exact HTML order retained; no new browser scripts or different server API.
- Zero persistent-data schema changes; no new secrets, data import or external API.
- Offline consistency remains testable; staged Apps Script behavior remains an **explicit unverified gate**.

**Authority:** `AGENTS.md`, `README.md`, `tools/build-apps-script-multifile.mjs`, existing `docs/architecture/g30-canonical-modular-release.md` and `docs/governance/migration-version-release-policy.md`. Official Google Apps Script docs: [HTML templates](https://developers.google.com/apps-script/guides/html/templates), [HTML Service](https://developers.google.com/apps-script/guides/html), [Multiple server files and project import/export](https://developers.google.com/apps-script/guides/import-export).
