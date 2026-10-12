# Smart SRRT — Security Release Readiness Review (GS-RR01)

**Review date:** 2026-10-12 (Asia/Bangkok)  
**Repository:** `9GotStory/smart-srrt`  
**Reviewed SOURCE baseline:** `main@7a8e2efeab239bac9bf708ed1e86f28b710f6726` after GS-S5 squash merge, PR #99  
**Code evidence:** [Actions #38205839537](https://github.com/9GotStory/smart-srrt/actions/runs/38205839537), `60/60` Contract, `419/419` Full Regression, deterministic Native `24/24` file byte parity, offline `P6 codeGate=PASS`, `releaseDecision=HOLD`  
**RELEASE_DECISION:** **HOLD** — no authorization to deploy, migrate, repair, create reports, modify Script Properties, or touch historical AuditLogs.  
**Review type:** source/documents/read-only public references; ChatGPT author-assisted review, **NOT** independent security audit / live Apps Script UAT / penetration test.

## 1. Exact evidence boundary

The GitHub `main` source contains GS-S1 through GS-S5; **source merge and CI PASS are not production rollout**. No current live `/exec` version, script/deployment IDs, `executeAs`, `access`, OAuth scopes, real UserAccounts, Google Sheet schema, Gemini credentials, Google Docs, Drive folders, or Apps Script execution traces have been inspected by this review. No real Script Properties or actual deployment were changed. Any documents written before these merges that say “source candidate not merged” are historical; the latest GitHub PR/commit state controls **source status**, while **Deployment=HOLD** remains authoritative.

Runtime source is canonical `src/server/*.gs` (7 modules), `src/web/*.html` (16 partials), plus deterministic generated `Index.html`: **24 Native files**, not historical 13/14/16/18/21-file builds. `dist/apps-script/` is generated/untracked. Frozen One-Click files are compatibility/rollback reference **but not a proven working rollback against migrated user records**. No additional container, server, database or deployment target is authorized here.

## 2. Gate summary (GO/NO-GO)

| Gate | Requirement and verified current position | Status |
| --- | --- | --- |
| RR-00 | Latest approved source, 24-file parity, contracts/full tests, P6 source checks. Source SHA and CI above are verified; rerun on the eventual release SHA. | **SOURCE PASS; reverify on release SHA** |
| RR-01 | Read-only target inventory: immutable deployed version, access/executeAs, current Source layout, V8, manifest/scopes, script/deployment authority, staging separation and intended rollout URL. Not provided or inspected. | **BLOCKED — evidence missing** |
| RR-02 | GS-S1 operator: an explicitly approved `GS_TRUSTED_OPERATOR_EMAIL` identity must match BOTH active and effective Google identity in authorized maintenance context; check deny paths in isolated non-production Apps Script, never infer trust from execute-as owner alone. | **BLOCKED — runtime identity unverified** |
| RR-03 | GS-S3 PBKDF2 performance **and password security**: benchmark 12k-round Utilities HMAC and login latency under realistic concurrency; resolve undersized work factor with an approved design, preferably managed identity. Verify lockout/CacheService best-effort limitations. | **BLOCKED — performance and password security decision** |
| RR-04 | **Migration-safe rollback:** rollback image must authenticate PBKDF2-migrated users, or there must be a separately authorized, tested credential-recovery procedure. Frozen One-Click cannot satisfy this requirement unchanged. | **BLOCKED — incompatible legacy verifier** |
| RR-05 | GS-S2 privacy: owner-restricted review of exposure risk in *existing* AuditLogs, archive spreadsheets, exports and backups, with preservation, retention, rotation and access controls. No existing data examined here. | **BLOCKED — restricted assessment pending** |
| RR-06 | Non-production isolated end-to-end fixtures: public/role privacy, old SHA-256 login → PBKDF2 upgrade, new account/admin reset, session expiry/revocation, RBAC and failed login paths, Event CRUD, lifecycle, Report Registry, GS-S4 consent/unknown, Docs/Drive/Gemini, GS-S5 Audit degraded/recovered status. | **BLOCKED — live UAT missing** |
| RR-07 | Backup restore, scoped deployment preflight, old and new Source/Manifest/V8 file order, exact SHA, separation of mutable HEAD and immutable deployment, recovery from partial clasp push/update failures. | **BLOCKED — recovery rehearsal missing** |
| RR-08 | Separate Product Owner GO/NO-GO decision supported by evidence, operators named, change window and rollback ownership, redacted record of sign-off. | **HOLD — not requested or granted** |

**Policy:** All gates RR-01 through RR-08 are mandatory. CI `SUCCESS` and `P6 codeGate=PASS` can **never** change `RELEASE_DECISION=HOLD` automatically. Missing, ambiguous or contradicted evidence is **HOLD**, not presumed PASS.

## 3. Critical finding RR-F01: credential-verifier rollback incompatibility

**Source-confirmed (not hypothetical):**

- Legacy frozen `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` uses `hashPassword_()` = single SHA-256 hex; its `login` compares `user.passwordHash !== hashPassword_(password)`.
- GS-S3 `src/server/01-schema-and-db.gs` stores `pbkdf2-sha256$12000$<salt>$<hash>` for newly registered/reset accounts; `src/server/02-auth-and-attachments.gs` **rewrites** a legacy SHA-256 password hash after the user's first successful login (`upgradeLegacyPassword_`), with no schema-version discriminator in the old code.
- Therefore restoring the frozen One-Click deployment source **after accounts have migrated** makes those migrated and newly created accounts **unable to authenticate**, even if the Google Sheet and all clinical/report data remain untouched.
- The legacy cached session format also differs (old plain email vs new JSON v2 session with verifier tag), so caching is *not* a safe way around rollback.

**Severity: RELEASE BLOCKER (P0 for deployment compatibility).** No real accounts were migrated in this review; the future failure is directly implied by the two source contracts.

**Acceptable closure options (choose, implement and verify separately):**
1. **Preferred:** a vetted, immutable *rollback-compatible* deployment version that can read both 64-hex SHA-256 and PBKDF2 verifier formats, does not reverse migrations, has safe session semantics and is exercised in isolated staging with newly created/migrated fixture accounts; **or**
2. an owner-approved restricted recovery/credential-reset and continuity procedure, including affected-account count, identity verification, user notice, maintenance window and reconciliation/backup constraints, tested without production credentials.

Never “downgrade” PBKDF2 hashes to unsalted SHA-256, export plaintext passwords, silently reset live accounts, or assume a pre-rollout source/Drive backup alone proves recoverability. Keep data preservation and credential rollback as **separate** acceptance checks.

## 4. Critical finding RR-F02: KDF work factor and real GAS runtime latency

GS-S3 source runs `Utilities.computeHmacSha256Signature` **12,000 times per PBKDF2 verifier**, including new password creation, successful legacy upgrade and every login with a PBKDF2-formatted hash. Existing 12k parameter is a **transitional source choice**, not a validated security or performance optimum.

- OWASP Password Storage Cheat Sheet recommends **PBKDF2-HMAC-SHA256 ≥600,000 iterations** in its FIPS-140 use case (which is **50 times** the current 12,000 rounds). This does not automatically mean 600k will be feasible on Apps Script; it means current 12k cannot be treated as established modern-strength protection.
- Google's Apps Script published limits include **6 minutes per execution**, Script Properties **9 KB/value, 500 KB/store**, plus service quotas. Runtime availability and latency must be **measured in real isolated GAS V8**, not inferred from the Node VM's `crypto` mock.
- Capturing only a single fast success is insufficient; measure p50/p95 login, incorrect-password attempt on an existing PBKDF2 account, legacy first-login upgrade, registration/reset, 5 failed-logins lock, quotas at realistic concurrency, and failure/timeout behavior. Record environment, exact SHA, configuration, number of runs, timestamps and **non-secret timing only**.
- Resolve the **password security** decision, not only latency: review managed OAuth/Google/Workspace identity provider versus feasible adaptive KDF in GAS, and mitigate cache-eviction / account-lockout DoS and distributed credential spraying. Do not lower the work factor merely to pass a latency test.

**Status: HOLD.** No external measured Apps Script timings are available.

Official references: <https://developers.google.com/apps-script/reference/utilities/utilities>, <https://developers.google.com/apps-script/guides/services/quotas>, <https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/Password_Storage_Cheat_Sheet.md>.

## 5. Identity, data, report and observability boundaries

### RR-F03 — GS-S1 operator identity / deployment authority
The 15 public maintenance/migration/Gemini diagnostic wrappers now require `GS_TRUSTED_OPERATOR_EMAIL` and matching nonblank active/effective Google emails. In an execute-as-owner Web App, `Session.getEffectiveUser()` can be the deployment owner while `getActiveUser()` may be blank. **Fail closed**; verify which contexts legitimately allow Spreadsheet editor maintenance without granting authority to browser clients. Document `executeAs` and `access` from deployment configuration, but redact account identifiers and project IDs from public PRs. Do not “fix” a blank active identity by using `getEffectiveUser()` alone. The preexisting public `archiveAuditLogsFromSheetMenu` uses a separate Google email→application RBAC route; verify its intended access boundary explicitly in staging rather than assuming all maintenance functions share the new guard. Similarly `repairInstallation(sessionToken)` is a session-authenticated `settings` action, not a GS-S1 operator-only action; confirm expected business authority.

Google reference: <https://developers.google.com/apps-script/guides/web>, <https://developers.google.com/apps-script/reference/base/session>.

### RR-F04 — AuditLogs and historical exposure
GS-S2 sanitizes recognizable credentials **for new audit writes**; it does not redact historic rows, archives, exports or backups. GS-S5 advisory health is privacy-minimal and does **not** certify that every operation has an audit row. An owner-authorized restricted review is needed before any live credential rotation, retention/archival action or data deletion. Never put historical AuditLog contents in public GitHub issues/PRs or CI logs.

### RR-F05 — AI Reporter and source switching
GS-S4 checks event/report registry state and consumes owner/Event/revision-bound one-use consent under existing G-32 ScriptLock; it **cannot prove a human clicked confirmation**. A timeout/`unknown` job may already have generated a Google Doc. Stage explicit tests for duplicate prevention, generated Doc ID, current revision, cancellation, registry commit, and recovery after stale job pointers **without using patient data**. Preserve successful Report Registry commit even if GS-S5 Audit append fails; do not rerun report generation simply to repair an audit gap.

### RR-F06 — Deployment source and rollback state
`tools/deploy-g34-clasp.sh` is an **operator-only script** requiring exact approved SHA, staging output 24 files + the preserved live `appsscript.json`, a private backup, clasp v3 and separate `SMART_SRRT_CONFIRM_DEPLOY` for write. `--preflight` is not a live runtime test; it **does** read the remote Apps Script source and create a sensitive local backup, so it requires separately authorized operator/secure storage context. `--deploy` **mutates the remote editable HEAD and updates an existing immutable deployment**; never execute it for this review. Its verified legacy layout allowlist includes `Code.gs` or `รหัส.gs` with `Index.html`. Other actual layouts must STOP for human review, not silent deletion. Existing deployment URL and previous immutable version must be proven recoverable; after any PBKDF2 account migration the **old source version alone is not a complete rollback**.

Read detailed procedure: [G-34 Native Deployment Candidate](g34-native-multifile-apps-script.md). Historical 14-file/One-Click instructions in older sections are superseded by 24-file Native manifest.

## 6. Safe evidence sequence and accountable decisions

### Stage A — now: read-only source and public documentation

Record `SOURCE_SHA`, exact CI run URL, changed file manifest, P6 result, open GS-S1..S5 docs, and all unresolved gates. This has been done at the reviewed source baseline. No operator login, Script Properties read, Apps Script API invocation or Live Backend access was performed.

### Stage B — separate isolated staging authorization

An authorized operator creates a **distinct GAS project**, distinct synthetic Sheets/Drive/Docs and controlled test accounts; no production credentials, patient data, legacy Script ID, or active Web App deployment ID are copied. Verify V8, original/approved OAuth scopes and the full ordered Native package. Use [GS Runtime Evidence Template](gs-runtime-evidence-template.md) to record *redacted* findings. Benchmark RR-F02 and verify GS-S1 identities, login/rollback RR-F01, GS-S4/G32 Report Registry behavior and GS-S5 health.

### Stage C — restricted production inventory and recovery rehearsal

Obtain separate owner authorization for a **read-only** inventory of current active deployment, actual access/executeAs, code/manifest, controlled backups, Sheet/Drive/Doc metadata and source divergence. Protect private backups outside GitHub. Verify restore ability and credentials/data compatibility. Any migration, reset or archive remains a **separate write approval**. **Do not include real tokens, project IDs, user emails or patient content in this review.**

### Stage D — formal release decision

Before a Go decision: all RR gates PASS on a **specific immutable candidate SHA**, independent review of remaining critical security blockers, source/runtime UAT evidence, recovery rehearsal, operator approval and rollback test. Run exact SHA CI again; approve an explicit deployment change with its own scope; distinguish source commit approval, preparation preflight approval, source push, and immutable deployment update. Confirm the existing URL/deployment only after separately authorized cutover. Any missing evidence or sign-off: **HOLD**.

## 7. Current decision and next tasks

**SOURCE_REVIEW=PASS; RUNTIME_EVIDENCE=NOT_VERIFIED; CREDENTIAL_ROLLBACK=BLOCKED; PASSWORD_WORK_FACTOR=BLOCKED; RELEASE_DECISION=HOLD.**

The recommended next **code** task is a separate focused design/PR resolving RR-F01 rollback-compatible authentication and RR-F02 the KDF/identity-provider decision *before* live staging or release approval. Documentation and tests can be merged separately without authorizing production. Runtime and historical audit evidence are not fabricated or marked successful.

This review creates no background task, automated monitor, production migration or deployment.
