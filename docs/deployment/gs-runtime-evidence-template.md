# GS Runtime Evidence Template — ISOLATED STAGING ONLY

**Template, NOT runtime evidence. All fields default to NOT_RUN / UNVERIFIED.**  
See [GS Security Release Readiness Review (GS-RR01)](gs-security-release-readiness-2026-10-12.md).  
Do **not** commit this document with actual credentials, Script IDs, deployment IDs, personal data, patient/event narratives, raw AuditLogs, OAuth tokens, API keys or privileged log files. Store sensitive run details in separately approved access-controlled evidence storage; public PRs get **non-sensitive verdicts only**.

## A. Authority and environment

| Field | Evidence to record | Current |
| --- | --- | --- |
| Product Owner permission for **isolated staging** | Approval date, permitted scope | NOT_REQUESTED |
| Source | Exact 40-character Git SHA, matching official GitHub Actions run | NOT_RUN |
| Apps Script runtime | Independent staging project, V8, source stage 7 GS + 16 partials + generated Index, absence of duplicate functions | NOT_RUN |
| Safe test assets | Synthetic users, data and separate synthetic Sheets/Drive/Docs/Template; no production IDs/credentials | NOT_RUN |
| Manifest | Scope inventory (sanitized), `executeAs`, `access` (no secrets), owner context | NOT_RUN |
| Reproducibility | Sanitized outcome file hash, reviewer, date/time zone, run count | NOT_RUN |

## B. Tests — capture safe pass/fail and times ONLY

| Gate | Isolated verification, including negative tests | Result |
| --- | --- | --- |
| RR-01 | Current deployment metadata known; staging project cannot reach production Sheets/Drive/Script Properties; project manifest and source file order verified | NOT_RUN |
| RR-02 | `GS_TRUSTED_OPERATOR_EMAIL` set in **staging only** by authorized owner; correct active+effective Google identity accepted in editor maintenance context; wrong, blank, execute-as-owner only, and browser routes denied. No live installer/migration exercised | NOT_RUN |
| RR-03 | KDF p50/p95 and max times over repeated representative samples on GAS V8: new hash, valid PBKDF2 login, invalid existing PBKDF2 login, legacy first-login upgrade, password reset, 5 failures and short/concurrent load; capture quota/errors with no raw passwords | NOT_RUN |
| RR-03 security decision | Signed design on work factor or managed identity; attack/availability analysis of per-email cache lockout and credential spraying | NOT_RUN |
| RR-04 | Synthetic legacy 64-hex hash logs in and auto-upgrades, sessions behave as expected, then **rollback-compatible build** can authenticate the migrated account and preserve its status/data | NOT_RUN |
| RR-04 negative | Frozen legacy One-Click **cannot** verify PBKDF2; record as a verified incompatibility in synthetic staging, not a candidate rollback | NOT_RUN |
| RR-05 | Authorized restricted historical audit exposure analysis plan approved; no raw old Audit exported to GitHub; remediation decision/rotation sign-off tracked privately | NOT_RUN |
| RR-06 | Anonymous aggregate privacy and app roles; Event CRUD/revision/concurrent edit/owner; attachments and downloads; close/reopen/void; full Report Registry and GS-S4 new-report-consent flow, expired token, cross-owner/invalid Event, unknown-job reconciliation, Docs/Gemini synthetic/staging key | NOT_RUN |
| RR-06 | GS-S5 Audit append failure then recovery visible only to `audit` privileged users; completed Google Doc and ReportRegistry remain completed; no audit data or secrets in telemetry/execution logs | NOT_RUN |
| RR-07 | Exported source + preserved manifest + restricted backup integrity; restore old code on **pre-migration fixture**, restore compatible code on **post-PBKDF2 fixture**; IDs/URLs/version rollbacks controlled; test partial push/update error procedure | NOT_RUN |
| RR-08 | Exact candidate SHA, all critical gates reviewed, independent assessment, explicit separate owner release decision and rollout/rollback operators | NOT_APPROVED |

## C. Performance evidence record (no credentials)

| Scenario | Runs | p50 ms | p95 ms | Max ms | Timeouts/quota errors | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| New PBKDF2 password hash | NOT_RUN | — | — | — | — | HOLD |
| Valid existing PBKDF2 login | NOT_RUN | — | — | — | — | HOLD |
| Invalid existing PBKDF2 login | NOT_RUN | — | — | — | — | HOLD |
| First verified legacy-login upgrade | NOT_RUN | — | — | — | — | HOLD |
| New account registration/admin password reset | NOT_RUN | — | — | — | — | HOLD |
| Five failed logins and concurrent requests | NOT_RUN | — | — | — | — | HOLD |

Record timings and quotas alongside environmental configuration and work factor; do not invent threshold values or claim that an offline Node VM substitutes for GAS measurements. A password KDF at 12k rounds is a transitional design that requires **independent security review**, even if it runs quickly.

## D. Incident and rollback rehearsal

Record, without private data: exact source/deployment versions, immutable backup location reference (redacted), version/manifest verification, who could authorize restore, application/data/identity continuity, and recovery from `clasp push` success plus `update-deployment` failure. Confirm both **pre-migration** and **post-migration** authentication. Never write a live PasswordHash backward to SHA-256 as a rollback workaround.

## E. GO / HOLD sign-off — requires independent approvals

| Decision | Required sign-off / evidence | State |
| --- | --- | --- |
| Isolated staging authorization | Owner scope/date | PENDING |
| RR-F01 rollback-compatible authentication solution | Technical review and verified staging | BLOCKED |
| RR-F02 KDF/identity solution | Performance + security evidence | BLOCKED |
| GS-S1 operator identity | Active/effective runtime evidence | PENDING |
| GS-S2 historical audit exposure plan | Restricted privacy owner | PENDING |
| Data/Docs/Gemini regression and backup recovery | Staging UAT and restore proof | PENDING |
| Security review | Independent review with findings disposition | PENDING |
| Production deploy | Separate Product Owner **explicit** approval | **HOLD** |

**Final decision: RELEASE_DECISION=HOLD.** Filling this template or merging its documentation is **not** a deployment instruction.
