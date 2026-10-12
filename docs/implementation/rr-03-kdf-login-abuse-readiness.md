# RR-03 — Password KDF Feasibility and Login Abuse Protection

**Date:** 2026-10-12 (Asia/Bangkok)  
**Source baseline:** `main@044b3f40474abc3a8eb53e80a16d2b0186104a75` (RR-02 PR #104 squash merged; post-merge CI SUCCESS: 64 contract / 423 regression, 24 Native files, P6 `codeGate=PASS`, `releaseDecision=HOLD`).  
**Scope:** Source-only risk analysis, benchmark specification, threat model, and future verification decisions. **No Apps Script benchmark, staging project, deployment, access to credentials, or authenticated Google service calls took place.**  
**Review classification:** ChatGPT author-assisted Technical Review, not independent security validation.  
**Decision:** `R03=OPEN`, `R04=OPEN`, `APPS_SCRIPT_DEPLOYMENT=HOLD`.

## 1. Verified implementation facts vs unknown runtime evidence

| Dimension | Observed at exact GitHub baseline | Not verified / limitation |
| --- | --- | --- |
| Hash writer | `src/server/01-schema-and-db.gs`: `PASSWORD_KDF_ROUNDS_=12000`; `hashPassword_` emits `pbkdf2-sha256$12000$<64-hex salt>$<64-hex key>` with 32-byte derived key | 12,000 is not a security-approved work factor for modern broad/public use |
| Implementation | `passwordKdf_` performs **12,000 sequential** `Utilities.computeHmacSha256Signature` calls, XORing results | Node `crypto` VM mock does **not** measure real Google Apps Script service overhead, user experience, or quotas |
| Stored verifier reader | `verifyPassword_` accepts legacy 64-hex SHA-256 and versioned PBKDF2 10,000–120,000 iterations, refusing malformed/out-of-bounds | Ability to parse a 120,000-round value does **not** establish it is performant or acceptable for untrusted stored content |
| Migration & rollback | GS-S3 upgrades legacy credentials only after correct login; RR-01 `AUTH_LEGACY_UPGRADE_MODE_='auto'` is current default; `pause` exists only as a future separately reviewed source option | Neither `pause` nor rollback to old code solves real PBKDF2 verification latency; cannot downgrade hashes |
| Throttle | `src/server/02-auth-and-attachments.gs`: email-normalized, SHA-256-keyed ScriptCache failure counter; 5 failures / 900 sec; `LockService` serializes **counter updates**, lock unavailable fails closed | No guaranteed account/global/IP gate; CacheService may evict entries; initial count check and costly verifier run occur outside counter lock |
| Login messages | Unknown/wrong credentials get generic denial, but inactive known user receives `บัญชียังไม่พร้อมใช้งาน สถานะ: ...` after successful password verification | Distinct responses and known-vs-unknown computation may create account/status or timing side channels; threat treatment required |
| GitHub CI | Synthetic GS-S3/RR-01 Node VM tests and 24-file parity pass at baseline | No direct Apps Script KDF benchmark, production abuse measurement, concurrent browser execution, managed identity or MFA validation |

**Security comparison:** OWASP Password Storage Cheat Sheet currently recommends **PBKDF2-HMAC-SHA256 with 600,000 iterations** where PBKDF2 is used (especially for FIPS-sensitive needs), compared with this project's **12,000**. This is a **50× iteration-count gap**, not an inferred 50× wall-clock prediction or a license to raise the GAS implementation blindly. OWASP generally prefers Argon2id where available and recommends a unique salt. Do **not** increase or decrease KDF rounds, alter hash encodings or rewrite real credentials under RR-03.

**Platform evidence:** Google's Apps Script quotas page, last updated **2026-09-03**, lists 6 min / execution; 30 simultaneous executions / user; 1,000 / script; subject to change and account-specific quotas. Those are **upper limits, not throughput or security guarantees**. CacheService documentation states expirations are suggestions; under pressure entries may disappear earlier, with roughly 1,000-item cache capacity and retention priority. Application rate limiting therefore cannot rely on CacheService as its sole trusted perimeter.

Primary references:
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
- [Google Apps Script Cache](https://developers.google.com/apps-script/reference/cache/cache)
- [Google Apps Script Utilities HMAC](https://developers.google.com/apps-script/reference/utilities/utilities)

## 2. R03 — Real Apps Script benchmark protocol (DESIGN ONLY)

**Gate before execution:** Product Owner separately approves a disposable, independently identifiable **non-production** Apps Script project and synthetic-only fixtures. Follow RR-02 environment, manifest, OAuth and operator gates. No copied UserAccounts, Script Properties, real passwords/hashes or production Sheet IDs. An isolated staging project may be used only after this separate approval.

**Instrumentation design (not implemented or run):** In an authorized non-production project, use a temporary, non-public, editor-only benchmark wrapper in a separately reviewed test script. It must generate synthetic passwords and salts in memory and invoke the *actual* `passwordKdf_`, `hashPassword_`, and `verifyPassword_` source; for end-to-end timings use isolated synthetic `UserAccounts` fixtures and real staging `CacheService`/`LockService` only. Capture `Date.now()` wall time around each operation (not just per-iteration). Never log password inputs, hashes, salts, emails, Session tokens, Script Properties, stack traces containing secrets, row content or service responses. Output **durations, result categories, iteration-count label, effective execution environment class, error codes sanitized to stable enums, version and sample counts only**. Use pseudonyms / private vault references for operator and project IDs. Avoid exposing a public callable benchmark endpoint, or a function that returns raw credentials.

**Cases** (use an isolated, bounded cohort, independent samples and a source-pinned work factor):

| ID | Case | Minimum measurement |
| --- | --- | --- |
| KD-01 | Standalone PBKDF2 `hashPassword_` / `passwordKdf_` | Single operation total, 12,000 HMAC calls, no I/O, output format validation, elapsed ms |
| KD-02 | Existing PBKDF2 login, correct and incorrect synthetic passwords | Full `login` wall time, `verifyPassword_` time, service and quota errors, counts |
| KD-03 | Legacy SHA-256 successful login with `auto` | Verification time, PBKDF2 upgrade cost and compare-and-swap lock/writes, session invalidation |
| KD-04 | Legacy SHA-256 login in separately source-reviewed `pause` candidate | Correct login without hash rewrite, PBKDF2 account still passes; emergency **test-only** compatibility |
| KD-05 | New synthetic registration and owner-authorized synthetic reset | Full KDF, Sheet/cache/lock timing and new hash format, no real accounts |
| KD-06 | Concurrent **synthetic** logins at 1, 2 and 5 parallel clients | Per-tier latency, P50/P95/max, failure rate, contention, quota/lock errors; no traffic against production |
| KD-07 | Malformed/very high but syntactically allowed verifier, wrong credentials | Fail-closed and bounded execution; do **not** generate unbounded rounds from caller-controlled data |
| KD-08 | Paired known/unknown/disabled synthetic accounts | Status/timing response classification without exposing account details; record enumeration risk |

**Safe sampling sequence:** first run **one** operation and stop on exception or unsafe duration; then up to **3 warm-up** and **5 measured samples** per sequential case. Do not automatically retry service exceptions. Only after reviewing early results may the owner explicitly authorize a separate expanded set of **at least 20 valid samples** per case/tier for provisional P95 (small-N percentiles are unstable); randomized order and clearly label warm-up/exclusions. Stagger batches, apply conservative quota budget and cap total test traffic; if any run approaches **30 seconds**, pause the benchmark and review costs before continuing. Five concurrent synthetic logins is an experimental tier, not proof of resistance to distributed attacks. Do not claim valid P99 from fewer than 100 independent samples.

**Proposed operational thresholds — DRAFT for Product Owner approval, NOT platform facts:**
- Standalone KDF or full login must never approach the 6-minute platform deadline; any individual login **over 30 seconds**, Apps Script quota error, unexpected account mutation or identity/scope drift => immediate **STOP / FAIL pending review**.
- At 1 concurrent synthetic client, target **P95 end-to-end login <= 5 seconds**; at 5 clients, target **P95 <= 10 seconds**, with **zero** authentication/permission or quota failures in the controlled sample. These are proposed UX/SLO decision thresholds, **not guaranteed feasible in GAS**.
- Compare paired wrong/correct, legacy migration, newly registered, and PBKDF2 paths and capture worst-case behavior. A target must not be relaxed without explicit owner approval; a measured P95 needs a sufficient sample size and clear measurement method.
- Passing latency does **not** imply a secure KDF: the 12k-vs-600k gap remains a separate security disposition. Reject production readiness if offline password-guessing resistance is inadequate, **even with a fast login**.

**Decision after measurement:** if either runtime or strength is unacceptable, propose separately approved **managed identity with MFA** or a security-reviewed KDF architecture rather than selecting an arbitrary weaker iteration count. Such a change is an Architecture/Identity decision with migration, RBAC, rollback, privacy and user impact; **no new infrastructure or identity provider is authorized here**.

## 3. R04 — Login abuse threat model and limitations

| ID | Threat / invariant | Current behavior or gap | Required disposition before public/broad production |
| --- | --- | --- | --- |
| AB-01 | Repeated guessing of one account | Cached per-email 5/900s counter slows some attempts | Test lockout, recovery, reset/eviction under concurrency; do not claim guarantee |
| AB-02 | Password spraying across many accounts | Separate email cache keys provide **no global request threshold** | Restrict audience/roles; managed IdP + MFA and/or trusted ingress protection with cross-account detection, explicit owner choice |
| AB-03 | Cache eviction / service failure | Entries may disappear early; `get` null effectively reopens counter | Test controlled eviction/exception; choose durable or trusted perimeter controls if release needs an enforceable cap |
| AB-04 | Parallel bursts race | Pre-check occurs outside `markAuthFailure_` lock; cost-heavy verify precedes counter update | Source tests with deterministic interleaving; design pre-KDF admission control; don't hold script-wide lock during expensive KDF indiscriminately |
| AB-05 | Denial-of-service via costly KDF | PBKDF2 verification consumes 12k synchronous HMAC operations; attackers can target many existing accounts | Bounded entry/concurrency, observability, approved cloud/identity-layer abuse safeguards before broad exposure |
| AB-06 | Account/status enumeration | Unknown user skips KDF; valid password on pending/disabled returns status-specific text | Uniform external errors across unknown/wrong/inactive; timing assessment; do not echo status details to anonymous client; preserve needed internal audit safely |
| AB-07 | Lockout abuse of legitimate accounts | Attackers can intentionally trigger 5 failures and 15-minute denial if cache persists | Owner-approved recovery / user support / graduated controls without bypass or unsafe resets |
| AB-08 | Sensitive logs and telemetry | GS-S2 redacts new audit writes; historical exposure R05 still open | Record bounded aggregate outcomes only, no email/password/hash/session token/IP unless source & policy allow a protective controlled service |
| AB-09 | Guest/Web App access context | Web App access/`executeAs` and caller identity not verified on production | R02 gates: no assumption of reliable IP, Google actor email or trusted browser metadata from a public Apps Script HTML request |
| AB-10 | Privileged session compromise | Role-bound actions still require `requireAuth_`, GS-S1 operator guard protects maintenance RPCs | Require MFA/managed access decision for privileged users; tests for credential/session revocation and no bypass |

**Important distinctions:**
- Client-side CAPTCHA, hidden buttons, a single-user lockout counter, and optional JavaScript checks are not a reliable substitute for a **server-side trusted perimeter**, MFA or a reviewed identity provider.
- A front-end-only or unverified proxy layer is not automatically enforceable for an Apps Script Web App; document actual ingress/control topology before claiming account, IP, global or per-device enforcement.
- Keep GS-S1, GS-S2, RR-01, GS-S4, GS-S5 and Report Registry safeguards intact during any future Auth fix. Never reset/downgrade real credentials, log raw hash material, widen access or bypass audit to satisfy test thresholds.
- Global ScriptLock is not automatically a safe rate limiter: holding it during serial KDF would penalize legitimate traffic and may increase denial-of-service. A design should separate admission, bounded verification, and failure accounting.

## 4. Future source-only acceptance tests (not implemented in this planning PR)

Design a dedicated **RR-03 corrective implementation PR** only after Product Owner approves the selected defense architecture. Its synthetic test matrix must include:

- AB-T01: same-email five bad attempts then blocked, generic error independent of account existence, no uncontrolled retries.
- AB-T02: rotating synthetic target emails (password spraying) demonstrates current *coverage gap*, not false protection.
- AB-T03: forced CacheService eviction and malformed counter values, verifying documented fail-open/fail-closed behavior; decide and assert trusted perimeter fallback.
- AB-T04: deterministic parallel first-attempt ordering (race where several verifications start with the same count), enforce admission in selected fix.
- AB-T05: active/pending/disabled/unknown users return an approved generic error; verify no account-status disclosure in public RPC.
- AB-T06: synthetic expensive KDF failures, lock contention and quota-like exceptions cannot create sessions or weaken hashes.
- AB-T07: wrong PBKDF2 password / out-of-range encoded work factor fails, mixed SHA-256/PBKDF2 accounts still authenticate in RR-01-compatible rollback.
- AB-T08: new audit/telemetry never leaks credentials or row identities; post-login session revocation and RBAC preserved.
- AB-T09: lockout support / anti-denial-of-service is safe for legitimate users and does not rely on untrusted client IP or browser state.

No extra NPM package, source mutation, new server RPC, live GAS benchmark wrapper, deploy script, cloud gateway or Google project is created by **this RR-03 planning PR**. Future source changes require a new separate issue/PR and exact-head CI.

## 5. Approval and outcome matrix

| Stage | Exit evidence | State at drafting |
| --- | --- | --- |
| RR-03 desk review | Source findings, official references, approved document PR, exact-head CI | `IN_PROGRESS` until reviewed and merged |
| R03 benchmarking | Separately approved isolated GAS project; bounded KD-01–KD-08 measurements; Product Owner accepts thresholds | `NOT_RUN / HOLD` |
| R03 KDF security | Approved verifier strength or managed identity strategy, migration/rollback compatibility and credential handling | `OPEN / HOLD` |
| R04 abuse defenses | Approved audience, trusted perimeter/MFA choice, synthetic AB tests and controlled staging verification | `OPEN / HOLD` |
| Other release blockers | RR-01/02 live rehearsal, historical audit R05, manifest and privacy R06–R08 | `OPEN / HOLD` |
| Production deployment | Explicit separate approval after all R01–R08 disposed | `NOT_AUTHORIZED` |

See [RR-03 evidence template](../release/rr-03-kdf-login-abuse-evidence-2026-10-12.md). **A green GitHub CI and a published plan are not Apps Script runtime evidence, and cannot change `APPS_SCRIPT_DEPLOYMENT=HOLD`.**
