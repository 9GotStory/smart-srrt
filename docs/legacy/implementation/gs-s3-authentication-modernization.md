# GS-S3 — Authentication Modernization

**Status:** Source-only candidate, not merged or deployed (2026-10-12).  
**Base:** `main@22ee59e10d1dc79b72c0846413d6793cb2eb8f10`, GS-S2 Post-Merge CI PASS.  
**Review:** ChatGPT, author-assisted; no independent security review or live environment benchmarking.

## Goal and migration rule

Improve the old single-pass, unsalted SHA-256 verifier without forcing every account to reset its password. All legitimate legacy password verifiers remain recognizable. **Only a successful legacy login** migrates that specific user's verifier using a race-safe compare-and-swap; unknown, incorrect and inactive accounts never migrate. There is no bulk migration or read of production credentials.

This is an incremental modernization of a home-grown login system, **not a claim that Apps Script is an ideal high-assurance identity provider**. Prefer managed identity if feasible in the long term.

## Password verifier format

- **Old**: 64 lowercase hex chars of SHA-256(password). Accepted for login *only* through the legacy verifier path; never emitted for a new user, admin password change, install or recovery.
- **New**: `pbkdf2-sha256$12000$<64-hex salt>$<64-hex derived key>`.
- Salt is derived from **two independently generated UUIDs** and is unique per newly hashed password; HMAC-SHA256, 32-byte derived key, standard PBKDF2 block 1 with XOR of all `U` iterations. `Utilities.computeHmacSha256Signature(byte[],byte[])` is the supported Google Apps Script API.
- New registrations and administrator password changes require **12–128 characters**. Legacy shorter passwords are accepted only for successful migration; no surprise reset. Newly generated system/operator passwords now use 24 random hexadecimal digits following `SRRT-`, rather than eight.
- Malformed or unknown password hash versions reject authentication; stored iteration counts are bounded to 10,000–120,000 to avoid unbounded computation from damaged rows. String comparison scans all characters to avoid early-character equality exits.
- **Rollout performance gate:** 12,000 HMAC rounds is a transitional value chosen for Apps Script feasibility, *not* a contemporary maximum-strength recommendation. Benchmark latency and execution quotas on a non-production Apps Script project and review a stronger work factor / identity-provider migration **before** authorizing production deployment. Do not silently lower the rounds to pass a smoke test.

## Session binding

- The existing browser-visible session token remains opaque, random, UUID-based and stored by the client; no password digest or privilege token is sent to the browser.
- New server CacheService entries store JSON with a version, user ID and a SHA-256 tag of the current stored password verifier. `getUserByToken_` reloads the current user row for each request and **rejects inactive users** or changes in the stored verifier.
- A password reset/change therefore invalidates all existing server sessions for that user at their next request without enumerating cache keys.
- Legacy cache entries holding only the email are **not accepted after this code is deployed**; users with old sessions will need to log in again. Cache TTL retains its maximum six-hour bound, but cache eviction may end sessions earlier.
- Role/status modifications are read on every authorized RPC; `requireAuth_` continues enforcing RBAC.

## Login abuse controls

- A 15-minute **per-normalized-email** failure counter in ScriptCache, key derived as SHA-256(email) (not the raw address), limits the account to five failures. Incorrect and unknown emails receive the same response. The next attempt after the limit gets a generic temporary-block message; a successful login clears the counter.
- `LockService` serializes counter updates; unavailable locking fails closed instead of silently skipping enforcement.
- This is **best-effort**, because Apps Script CacheService may evict entries early, and no trusted client IP or upstream global abuse-control service is available from this code. This control does **not** guarantee resistance to credential spraying across many addresses. Require real per-client/perimeter controls or managed authentication before a production security sign-off.
- No raw passwords, hash values or failed-login bodies are added to AuditLogs. GS-S2 audit redaction remains in force.

## Code scope and dependency

| File | GS-S3 changes |
| --- | --- |
| `src/server/01-schema-and-db.gs` | Versioned password hash, legacy verifier, salted PBKDF2, input policy, constant-time-style comparison, new session-cache format, stronger initial credential |
| `src/server/02-auth-and-attachments.gs` | Session credential binding, guarded legacy migration, per-email login failure counter, login and new registration policy |
| `src/server/03-events-and-dashboard.gs` | Validate admin password changes before profile mutations and write new hash; GS-S2 audit metadata unchanged |
| `src/server/00-bootstrap.gs` | Longer random password for privileged operator recovery |

This source patch preserves the current 7 GS + 16 HTML + generated Index **24-file** Native stage, application role/action policies, existing Report Registry schema v7, G-32 Job safeguards and GS-S1 trusted operator boundary. It does not change the HTML login UX, user database schema, old One-Click artifacts, `tools/native-sources.mjs`, `tools/deploy-g34-clasp.sh`, appscript manifest or deployment.

## Offline verification

`tests/gs-s3-authentication-modernization.test.mjs` uses Node `crypto` only as a **test double** for Google Utilities byte-array HMAC, verifying the actual GAS PBKDF2 implementation in a shared VM with synthetic Spreadsheet/Cache/Lock objects. Covers salted uniqueness and invalid formats, correct/wrong legacy login, compare-and-swap migration, pending accounts, failure lockout, cached-session credential invalidation and disabled users, registration policy and failure-denial under lock contention. Existing GS-S2 tests are updated to stub the new password policy.

Add GS-S3 to `check:contracts` and full `npm test`; require exact-head CI PASS including 24-file parity, P6 `codeGate=PASS` and `releaseDecision=HOLD`.

## Mandatory rollout checks not performed

Before any separate deployment approval: measure actual Apps Script `Utilities.computeHmacSha256Signature` cost at 12k rounds, test full sign-in and legacy one-time migration in a non-production GAS project; verify account-role/session revocation on browser, concurrent logins/locking and CacheService quotas; verify trusted GS-S1 operator property with active/effective user policy, and design rate limiting at a trusted gateway. Do **not** log or inspect real credentials to validate this change.

**No production UserAccounts rows, Script Properties, Sheets, Google Workspace/Gemini APIs, installer, recovery functions, historical AuditLogs, clasp or Web App deployment are accessed or mutated by the PR.** Source tests alone cannot certify security of an actual deployed Apps Script instance.

**MERGE=HOLD until owner approval. DEPLOYMENT=HOLD.** GS-S4 server-side duplicate-report consent and GS-S5 observability remain separately gated.
