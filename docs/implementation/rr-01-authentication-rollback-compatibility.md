# RR-01 — Authentication Rollback Compatibility (Source-Only)

**Date:** 2026-10-12 (Asia/Bangkok)  
**Base:** `main@5e879c6ef6f0c799fec67cd41a7a592ffb99c7ac` (PR #102 merged; post-merge CI PASS).  
**Classification:** source-only compatibility design and synthetic validation; **not live rollback validation or deployment authorization**.  
**Review:** ChatGPT author-assisted Technical Review, **not independent security review**.  
**Apps Script deployment:** **HOLD**.

## 1. Why a naive rollback is prohibited

GS-S3 introduced versioned salted `pbkdf2-sha256$12000$<salt>$<digest>` password verifiers. Successful logins of old SHA-256 accounts transparently migrate the stored verifier with a guarded compare-and-swap. New accounts and administrator password changes also store PBKDF2. Pre-GS-S3 Apps Script code accepts only the 64-hex SHA-256 format. **Deploying pre-GS-S3 source after any PBKDF2 verifier exists can lock out accounts.** Neither a source-only code rollback nor restoration of an old credential spreadsheet is a safe substitute for a designed recovery plan.

**Forbidden:** revert to pre-GS-S3 authentication, replace PBKDF2 with SHA-256, bulk reset users, copy/hash/export actual passwords, modify historical AuditLogs or source One-Click artifacts, or quietly restore an older `UserAccounts` snapshot. A code release and a data rollback are separate, explicitly approved operations.

## 2. Proposed compatibility release

The current `src/server/01-schema-and-db.gs` remains authoritative for **both legacy SHA-256 and versioned PBKDF2 verification**. RR-01 adds a source-pinned `AUTH_LEGACY_UPGRADE_MODE_` in `src/server/02-auth-and-attachments.gs`:

| Mode | Existing legacy SHA-256 login | Existing PBKDF2 login | Automatic legacy rewrite | New account/reset hash |
| --- | --- | --- | --- | --- |
| `auto` (**default**) | Allowed if correct and active | Allowed if correct and active | Yes, guarded compare-and-swap | PBKDF2 |
| `pause` (**emergency compatible rollback candidate**) | Allowed if correct and active | Allowed if correct and active | **No** | PBKDF2 |
| Unknown/invalid | Fail closed for otherwise valid active login | Fail closed for otherwise valid active login | No | No login permitted |

Both modes preserve rate-control checks, role/status restrictions, GS-S3 credential-bound cache sessions and revocation, existing GS-S1 trusted Google operator restrictions, GS-S2 credential-safe audit writes, GS-S4 report consent and GS-S5 audit telemetry. **Only automatic upgrade of already-legacy credentials is paused.** `pause` is a temporary *incident response* option and prolongs weak SHA-256-at-rest exposure; it is not an acceptable permanent production security setting.

The mode is a reviewed source literal, **not** a browser-provided flag, RPC argument or mutable Script Property. To switch it, create a separate reviewed branch and release artifact containing the single deliberate literal change and all present safety protections. No remote mutation is part of RR-01. `auto` is the only default committed to this PR.

## 3. Safe release/rollback decision matrix

1. **Before any GS-S3 deployment:** the last actually deployed source must be inventoried and backed up by an authorized operator. Never assume a GitHub merge equals GAS deployment. RR-01 source passing CI does not qualify an untested release for production.
2. **After PBKDF2 migration could have occurred:** a pre-GS-S3 executable is **not a permitted authentication rollback target**, even if code compiled or its last Actions run was green.
3. **If an approved new version needs emergency rollback:** prefer the **last independently verified and backed-up deployment artifact that already supports both formats** and preserves currently required authorization/report controls. If none exists, choose a *forward-fixed* compatible release (potentially a source-pinned `pause` build) after isolated tests and an explicit Human Gate. Do not pretend a suitable live artifact currently exists.
4. **If KDF failure itself is the incident:** `pause` does **not** solve PBKDF2 verification latency or failures; both old/new format login paths still depend on real Apps Script KDF performance for PBKDF2 accounts. Contain the incident, preserve data, and use a separately approved vetted identity/recovery method. Do **not** downgrade stored hashes.
5. **When restoring normal operation:** a reviewed `auto` release resumes guarded upgrade *on successful legacy login only*. Existing PBKDF2 verifiers stay unchanged. Sessions bound to prior password verifiers are invalidated when the verifier changes; users may need to sign in again.

## 4. Synthetic acceptance criteria

`tests/gs-s3-authentication-modernization.test.mjs` covers the original GS-S3 cases plus RR-01 cases:

- Simulate an `auto` release upgrading one synthetic user, then a fresh `pause` release against **the same stored migrated digest**; both migrated and never-migrated active users can log in.
- In `pause`, correct legacy login never mutates the PasswordHash cell; a new synthetic registration is still PBKDF2; wrong passwords fail and audit records carry no credentials.
- Switching back to `auto` migrates a legacy user exactly once, leaves a migrated verifier stable and invalidates its prior credential-tagged session.
- Invalid source mode fails closed before a session, account update or AuditLog entry; disabled and pending users remain denied.

Run offline: `npm run check:contracts`, `npm test`, Native 24-file build/parity, and P6 source-only preflight. Record exact PR head, file allowlist and GitHub CI. These are *synthetic regression checks*, not a performance benchmark, Workspace identity proof or production account validation.

## 5. Operational rehearsal requirements before lifting R01 HOLD

An authorized Product Owner must separately approve **non-production** Apps Script tests and capture sanitized results for:

- Reproducible immutable source/package SHA, `appsscript.json` / OAuth / `executeAs` / access mode and staging version; backup/restore drill and rollback deployment ID/version.
- An isolated synthetic `UserAccounts` sheet containing both hash formats and **no copied production passwords**, using first login, migrated login, emergency `pause`, and `auto` recovery scenarios.
- Real Apps Script PBKDF2 latency and quotas (R03), per-account throttling and race/lock behavior (R04), session invalidation and denial of pending/disabled users.
- GS-S1 privileged RPC denial, GS-S2 secret-safe Audit writing, GS-S4 report-regeneration consent, GS-S5 Audit failure/health invariants, and controlled rollback from a real staging version.
- Human approval of the exact candidate SHA and recovery owner, including a plan for irrecoverable authentication failure that never requires downgrading hashes.

**R01 status after source tests: SOURCE COMPATIBILITY CANDIDATE ONLY — LIVE EXIT CRITERIA OPEN.** R02–R08 remain blocking, and `APPS_SCRIPT_DEPLOYMENT=HOLD` regardless of CI status.

## 6. Strict boundaries

- Native `src/` remains canonical; seven `.gs` server files plus 16 HTML partials and generated `Index.html` remain unchanged in topology. Frozen One-Click files stay unmodified.
- This PR does not run `clasp push`, `update-deployment`, installer, migration, Google services, Gemini, production Sheets/Drive, or modify Script Properties and account credentials.
- No production release, staging experiment or PR merge occurs without **new explicit Product Owner approval**.
