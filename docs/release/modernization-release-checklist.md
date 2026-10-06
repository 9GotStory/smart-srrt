# Smart SRRT — Modernization Release Checklist

Use this checklist after the stacked P1–P6 work is accepted for release.

## 1. Stack integrity

- [ ] P1 Event identity/data integrity reviewed
- [ ] P2 privacy/KPI reviewed
- [ ] P3 lightweight lifecycle reviewed
- [ ] P4 supporting governance reviewed
- [ ] P5 report/AI governance reviewed
- [ ] P6 modular source/release parity reviewed
- [ ] stacked PR base/head relationships are clean
- [ ] no unintended files appear in each phase diff

## 2. Automated gate

Run:

`npm run verify`

Required:

- [ ] build parity PASS
- [ ] server syntax PASS
- [ ] browser syntax PASS
- [ ] duplicate function count = 0
- [ ] missing browser RPC target count = 0
- [ ] all P1–P5 tests PASS

## 3. Version gate

Before release:

- [ ] choose the new AppVersion using the existing `YYYY.MM.DD.N` convention
- [ ] update `CONFIG.VERSION`
- [ ] update the release-artifact header to the same version
- [ ] run `npm run build`
- [ ] run `npm run verify`
- [ ] set release notes with AppVersion + SchemaVersion
- [ ] state migration required: yes/no

Do not bump the version merely for an unreleased Draft branch.

## 4. Data migration gate

Before production migration:

- [ ] create a current production Google Sheet backup
- [ ] record production spreadsheet ID and current App/Schema version
- [ ] test migration on a disposable/current-data copy
- [ ] run migration twice and verify second pass is idempotent
- [ ] verify EventID uniqueness
- [ ] verify legacy MainData columns 1–30 are preserved
- [ ] verify additive lifecycle/governance/report sheets
- [ ] verify VisitLogs header correction
- [ ] record rollback boundary

## 5. Staging Web App gate

Required smoke checks:

- [ ] anonymous Dashboard receives aggregate-only data
- [ ] login/session
- [ ] Event add
- [ ] Event edit
- [ ] stale edit rejection
- [ ] owner assignment
- [ ] close warning/override
- [ ] reopen
- [ ] void and stale-void rejection
- [ ] Event attachment upload/list/disable
- [ ] controlled MasterData update
- [ ] Audit archive on staging-old fixtures
- [ ] report readiness warning
- [ ] report generation
- [ ] ReportRegistry Event linkage
- [ ] generated report opens correctly
- [ ] existing public/library/admin pages remain functional

## 6. Privacy/security release checks

The Group A/B modernization does not automatically close every security hardening item.

Before production, explicitly review at least:

- [ ] Gemini API key is not exposed to unauthorized browser users
- [ ] public endpoints return no raw Event dataset
- [ ] attachment Drive permissions match organization policy
- [ ] external content URLs are scheme-validated
- [ ] frame/embed policy is intentional
- [ ] authentication/password policy is accepted for the release
- [ ] session behavior is accepted for the release

Any intentionally deferred item must be documented as a known limitation.

## 7. Production deployment

- [ ] update code from verified release artifacts
- [ ] run required migration/repair
- [ ] verify migration summary
- [ ] publish/update Web App deployment while preserving intended URL
- [ ] verify production public Dashboard
- [ ] verify authenticated login and one read-only Event lookup
- [ ] do not use sensitive production data for AI smoke unless explicitly appropriate

## 8. Release evidence

Record:

- AppVersion
- SchemaVersion
- commit SHA
- tag/release
- included Gap IDs
- migration output
- CI run
- staging evidence
- production verification
- rollback notes

## 9. Deferred scope

Do not quietly add these during release:

- Team/SLA/escalation/notification engine
- Patient/Contact/Lab entities
- Outbreak entity model
- task/project-management workflow
- report approval/version tree
- external database/backend rewrite
