# Smart SRRT — Native Multi-file Google Apps Script Deployment (G-34)

**Current canonical source:** `main@7a8e2efeab239bac9bf708ed1e86f28b710f6726` verified 2026-10-12.  
**State:** **SOURCE CI PASS; APPS SCRIPT DEPLOYMENT HOLD**. GitHub code is not proof of what the existing deployed `/exec` version runs.  
**Review & blocking release gates:** [GS Security Release Readiness](../release/gs-security-release-readiness-2026-10-12.md).

This document supersedes earlier G-34 / UX-R2 statements that referred to 13, 14, 16, 18 or 21 Native files. Those counts belong to earlier development snapshots; **do not copy an older list into a release or invoke an old deployment instruction**.

## Current package and source authority

Use `tools/native-sources.mjs` as the authoritative ordered manifest. The generated, untracked `dist/apps-script/` contains **24 files**: seven server `.gs`, sixteen HTML partials, and one generated `Index.html`.

**7 server scripts, in required canonical order:**

```text
00-bootstrap.gs
01-schema-and-db.gs
02-auth-and-attachments.gs
03-events-and-dashboard.gs
04-admin-and-audit.gs
05-reports-and-models.gs
06-gemini-and-prompts.gs
```

**16 HTML partials, ordered by the manifest (in addition to Index.html):**

```text
00-document-head.html
01-styles.html
02-app-layout.html
03-modals.html
03a-dashboard-mobile.html
03b-client-core.html
03c-client-auth.html
03d-client-dashboard.html
03e-client-dashboard-export.html
03f-client-event-controls.html
03g-client-event-history.html
03h-client-event-records.html
03i-client-report-actions.html
03j-client-report-job.html
03k-client-report-generation.html
04-browser-app.html
```

`Index.html` is a **generated, small include template**. These partials intentionally contain fragments of a single HTML page; do not wrap them separately, reorder them or keep a second monolithic Index. Apps Script projects have all these files at their project root, not nested in `src/server` or `src/web`.

**The real project's preserved `appsscript.json` is a *25th staged entry*, separate from the 24 generated files.** Keep the actual manifest's V8 runtime, OAuth scopes and settings; neither `appsscript.json`, `.clasp.json`, API keys nor project credentials are committed/generated as release source. The two root One-Click files are **frozen historical rollback references**, not a second build target and not a file to co-deploy with the Native scripts.

## Safe, source-only commands (do not modify Apps Script)

```bash
cd /home/thanakorn/dev/smart-srrt
git fetch origin main
git switch main
git pull --ff-only origin main
npm run build
npm run build:check
npm run check:contracts
npm test
npm run release:preflight
```

The local `npm run build` creates/updates **generated untracked local files**; it does not push to Apps Script. The read-only inspection phase checks source/staged parity, 24-file manifest, P6 source gates, contract and regression coverage. P6 deliberately returns `codeGate=PASS`, `releaseDecision=HOLD` even when everything passes. GitHub Actions is source-only. **Do not run any of these commands inside a live Apps Script editor.**

## Non-production prerequisites before considering an operator preflight

Obtain separate Product Owner approval for a **synthetic, isolated GAS test project** and confirm:

1. Which Google account truly owns/deploys the current test/live project; verify the Web App `executeAs`, access mode, exact Deployment ID vs Script ID, V8 runtime and actual OAuth scopes **privately**.
2. GS-S1 `GS_TRUSTED_OPERATOR_EMAIL` must be provisioned only by an authorized editor in that isolated project before permitted maintenance; both `Session.getActiveUser().getEmail()` **and** `Session.getEffectiveUser().getEmail()` must match. Missing identities fail closed. Never bypass this check or run a real reset/migration just to test it.
3. Benchmark GS-S3 PBKDF2-HMAC-SHA256 **12,000 HMAC iterations** and one-time legacy login upgrade under the actual Apps Script execution limits. Use only synthetic accounts, no real hashes/passwords in logs. The per-account CacheService throttle is best-effort and not a perimeter-level defense.
4. Verify GS-S4 current Registry/Revision consent and G-32 job cancellation, `unknown` reconciliation and exactly-once document registry commit with synthetic events. Confirm GS-S5 AuditLogs failure warning and non-secret telemetry using controlled synthetic inputs. Review GS-S2 historical audit exposure only under a separate restricted authorization.
5. Resolve or explicitly disposition the release finding that authenticated `getSystemSettings()` returns raw values (including potentially a `GEMINI_API_KEY`) to users with `settings` role; assess the `ALLOWALL` frame policy and guest aggregate privacy. The readiness review currently classifies this as **BLOCKER/HOLD**, not release-ready.
6. Confirm Script Properties capacity/concurrency, native 24-file compilation, rollback of the exact prior immutable Web App version, and private protected backups. Do not mix test documents, Gemini credentials or Sheets with real records.

Official references: <https://developers.google.com/apps-script/guides/web>, <https://developers.google.com/apps-script/reference/base/session>, <https://developers.google.com/apps-script/guides/services/quotas>, <https://developers.google.com/apps-script/reference/utilities/utilities>.

## Existing, guarded operator-only `clasp` script

`tools/deploy-g34-clasp.sh` is the **source-authoritative** operator script. GitHub Actions does not run it. It requires `clasp 3.x`, a clean exact approved `main` checkout, distinct Script and existing Deployment IDs, and an out-of-repository backup directory.

In a separately authorized, verified environment the operator sets **private environment variables**, without posting values in GitHub:

- `SMART_SRRT_APPROVED_SOURCE_SHA` — exact 40-character `main` SHA, approved specifically for the target release (not automatically the latest commit).
- `SMART_SRRT_SCRIPT_ID` — target Apps Script Script ID.
- `SMART_SRRT_DEPLOYMENT_ID` — pre-existing Web App Deployment ID.
- Optional `SMART_SRRT_REPO`, `SMART_SRRT_BACKUP_ROOT`, `SMART_SRRT_CLASP` — approved paths/executable.

**Preflight is itself a separate, operator-approved read/backup operation:**

```bash
bash tools/deploy-g34-clasp.sh --preflight
```

The script rechecks exact SHA and offline gates, uses `clasp pull` **read-only against remote** to privately back up the existing editable source, manifest, version and deployment metadata, validates the existing legacy project file layout **`Code.gs` + `Index.html` or `รหัส.gs` + `Index.html`**, confirms V8 and existing Deployment ID, prepares **24 Native files plus the unmodified pulled manifest**, and inspects file status. It **does not push or update deployments** in `--preflight` mode. A previous read-only encounter with the Thai legacy filename is recorded; the filename alone does **not** certify feature parity or runtime readiness.

Only after a **second, distinct, explicit Product Owner deployment GO** with exact source SHA/target and verified backup/rollback may an operator use:

```bash
# This is a future operator-only command, NOT authorization to execute now.
# SMART_SRRT_CONFIRM_DEPLOY must match the separately approved exact SHA.
bash tools/deploy-g34-clasp.sh --deploy
```

The script pushes a native source package and attempts `clasp update-deployment` **against the same existing Deployment ID**. Remote **editable HEAD** and the currently **published immutable deployment version** are distinct. A partial result (push succeeded, deployment update failed) requires inspection, not automatic retry. Preserve the previous immutable version, source/manifest backup and recovery evidence; avoid duplicate legacy global code in the new active editable source.

Never run installer, `migrate*`, reset Super Admin, archive data, repair installation or real Gemini/Google Docs generation as part of deployment/preflight. Rollback or cleanup on a deployed project requires separate authorization, not inference from this document.

## Evidence and governance

- [GS Architecture Review](../architecture/gs-architecture-review-2026-10-12.md)
- [GS-S1…GS-S5 implementation records](../implementation/)
- [Current GS Security Release Readiness Review](../release/gs-security-release-readiness-2026-10-12.md)
- [Native source manifest](../../tools/native-sources.mjs) and [guarded operator script](../../tools/deploy-g34-clasp.sh)
- Historical UX-R2/G-34 migration notes remain useful for development provenance, **not** as current file-count or release authority.

**GO/NO-GO: HOLD.** A successful GitHub Merge or CI run does not modify or authorize the existing Google Apps Script `/exec` deployment.
