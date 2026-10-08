# P6 — Migration, release readiness and rollback checklist

**Status: Checklist only, not release approval.** No Google Apps Script staging or production runtime smoke has been executed as part of G-30.

## 1. Source/CI preflight

- [ ] Confirm stacked ancestry and accepted commits through G-17 PR #44, G-26 PR #50, G-27 PR #52 and current G-30 PR, including P1–P4 ancestors.
- [ ] Review changes and confirm parent heads have not unexpectedly moved.
- [ ] Run `npm run build:check` on the intended release commit; generated source must exactly match both committed One-Click files.
- [ ] Run `npm run check:contracts` and `npm test`. GitHub Actions must pass all parity, RPC, syntax, privacy, functional and migration regression suites.
- [ ] Verify no credentials, personal details, production IDs, or API keys were committed.
- [ ] Record exact Git SHA and SHA-256 of the two approved release artifacts.

## 2. Existing installation inventory and backups — human gate

- [ ] Record the actual deployed Apps Script version, deployment ID, Google Sheet schema level, template/folder IDs, configuration, users and permission boundaries.
- [ ] Take a protected, verified backup of **all** relevant Google Sheets, Drive attachments, generated reports, templates and application configuration. Verify restoration access.
- [ ] Preserve copies of the previous two working One-Click source files and deployment settings; designate rollback owner.
- [ ] Document expected Event row counts, metadata and report registry row counts before migration.

## 3. Staging migration and full runtime smoke — deferred

- [ ] Prepare restricted-access non-production copies of representative legacy installations.
- [ ] Apply existing conflict-guarded, idempotent migrations in dependency order: P1 Event identity; G-05 owner; G-11 attachments; G-21 audit retention; G-29 VisitLogs; G-17 ReportRegistry.
- [ ] Stop on conflict, record failure evidence and avoid destructive repair or unreviewed repeated writes.
- [ ] Verify stable EventID, correct Revision/closed/void behavior, data preservation, rollback and safe migration reruns.
- [ ] Smoke-test anonymous public dashboard versus authenticated Event data; user roles; CRUD/concurrency; close/reopen; owner; attachments and downloads; export; G-04; G-26 readiness warnings/continue path; Gemini report generation; Google Docs template formatting; G-17 registry; G-27 Event history/links; AuditLogs; error paths.
- [ ] Verify existing legacy records and older unregistered reports are not falsely reconstructed.
- [ ] Compare the One-Click deployment output against the approved GitHub source and capture staging screenshots/logs without private event content.

**Passing CI does not satisfy these live runtime checks.**

## 4. Human production go/no-go

- [ ] Obtain independent review and explicit Product Owner approval for merge and deployment **after** staging evidence is reviewed.
- [ ] Freeze approved SHAs, rerun required CI and take a final backup.
- [ ] Arrange maintenance/communications if necessary; apply migrations under the existing safeguards.
- [ ] Deploy only approved One-Click files; verify report generation, file access, privacy, migration state and critical workflows.
- [ ] Record completed runtime UAT and decision in a release record.

## 5. Recovery

- [ ] Stop writes or rollout on failure; document exact error and last successful step.
- [ ] For code regressions, restore previous Apps Script source/deployment without touching preserved user data.
- [ ] For database migration errors, follow the tested migration-specific data restore and reconcile any post-backup writes; do **not** blindly overwrite live sheets.
- [ ] Verify EventID/Revision, attached files, registered reports, audit trail, user access, template settings and Google Docs links after restore.
- [ ] Retain incident evidence and ensure no sensitive public log output.

**This G-30 branch performs no live migration, Google Workspace mutation, automatic merge or production deployment.**
