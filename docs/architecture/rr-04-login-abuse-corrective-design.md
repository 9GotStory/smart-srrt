# RR-04 — Login Abuse Protection Corrective Design

**Prepared:** 2026-10-12 (Asia/Bangkok)  
**GitHub source baseline:** `main@fa9624803e45e3085b886a53338f72b8b6a0d873` (RR-03 PR #105 merged; post-merge CI SUCCESS, 64 contracts / 423 regressions, Native 24-file parity, P6 `codeGate=PASS` / `releaseDecision=HOLD`).  
**Classification:** **DESIGN PROPOSAL ONLY**. No authentication source changes, new server services, scripts, tests, tokens, Google projects, real account inspection, staging/production invocation or deployment.  
**Review:** ChatGPT author-assisted Technical Review, **not an independent security assessment**.  
**Decision:** `R04=OPEN`; `APPS_SCRIPT_DEPLOYMENT=HOLD`. RR-03 KDF feasibility R03 is also OPEN.

## 1. Exact current state and uncovered entrypoints

At the specified GitHub SHA, `src/server/02-auth-and-attachments.gs` implements:
- `login(payload)`: normalize email with `trim().toLowerCase()`, reject email longer than 254 and password longer than 128, get a per-email ScriptCache counter, then load a user from the `UserAccounts` Sheet and verify SHA-256 or versioned PBKDF2. On failed verification, obtain `ScriptLock` **after verification**, increment the cache failure counter and return generic invalid credentials. When the prior cached failure count is at least five, return a distinguishable temporary-block message. A correct password on a pending/disabled account returns status-specific text. A successful active login can migrate legacy SHA-256 under RR-01 default `auto`, clear the counter, mint a bound session, record LastLogin and write sanitized Audit.
- `authFailureCount_`: `String(raw||0)`-style numeric interpretation means a missing/evicted CacheService key becomes **zero attempts**; invalid count returns the limit. The cache duration is 900 seconds and writes serialize **only failure counter updates**, not the first admission check or PBKDF2 work.
- `registerUser(payload)`: when self-registration is enabled, distinguish duplicate emails by `อีเมลนี้มีในระบบแล้ว`; new eligible input causes 12,000-HMAC PBKDF2 generation, Sheet append, then Audit. The registration endpoint **does not share a pre-KDF global admission limiter** and also can reveal whether an email is registered. Its required policy and queueing are separately decision-gated.
- `getUserByToken_`: reloads current user and a credential-tagged session; legitimate session invalidation must be preserved. GS-S1 privileged operator RPCs are governed by a different Google active+effective-identity guard and must never be expanded to unauthenticated clients.

**Source-only risk finding:** guessing one email is partly slowed, but a burst can read the same pre-lock count, incur repeated expensive KDFs, and later accumulate failures; cache eviction can erase failure history. One guess each across many addresses is not stopped by an email-only counter. Existing distinct response timing and registration messages can reveal account existence/status. A growing or global lockout control can itself create denial-of-service, especially on Apps Script quotas. **None of these statements imply measured exploitability on the live Web App, which has not been assessed.**

## 2. Trust boundaries and non-negotiable invariants

1. A browser value (IP header, User-Agent, device ID, Google active email, requested role, CAPTCHA outcome or token not cryptographically verified at the server) is **not** a trusted client identity. The existing HTML `google.script.run` endpoint must not be assumed to traverse any proposed proxy. An independently approved, enforced ingress/identity design must prove **no direct Apps Script bypass** before a proxy rate-limit claim is accepted.
2. All credential verification and session issuance remain **server-side**. Keep existing GS-S1 operator authorization, GS-S2 redaction, GS-S3 dual verifiers, RR-01 rollback compatibility, GS-S4 regeneration consent, GS-S5 audit controls, Guest Dashboard aggregate boundary and ReportRegistry semantics.
3. A failure of the **authoritative** admission/ledger service must not silently allow an unbounded PBKDF2 attempt or mint a session. Fail closed with a generic, transient service-unavailable response. Avoid logging passwords, hashes, salts, tokens or full usernames.
4. Do not place a ScriptLock around the PBKDF2 computation. Shared lock acquisition, ledger mutation and release must be short and bounded. An authorized admission **must be reserved atomically before** expensive KDF; post-verification accounting must not clobber newer attempts.
5. Authentication state rollback is **not** an automatic code rollback. Never deploy an old SHA-only login to accounts that may contain PBKDF2; never restore an outdated UserAccounts/password spreadsheet to "unlock" users.
6. Protect valid users from an attacker-triggered **site-wide lockout**. A global breaker can deny all users; its capacity, cool-down and authorized override/recovery channel are human-reviewed operational policies, not arbitrary constants. Critical accounts require a separately approved support route, not a secret bypass in a public RPC.
7. Source-only fixes cannot close R04 until the chosen control is proven durable/atomic within its actual trust boundary and synthetically staged. No new infrastructure, managed identity, schema, OAuth scopes, IP collection or secret property is approved by this design.

## 3. Architecture decision — options, trade-offs, and recommendation

| Option | What it can prove after proper implementation | Open limitations and costs | RR-04 disposition |
| --- | --- | --- | --- |
| **A — Managed Google/organizational identity with MFA, authenticated-only private features** | Provider-backed identity controls, MFA and access policies; less bespoke password verifier exposure; may allow guest Aggregate Dashboard to remain separately public | Significant UX, identity-to-role mapping, shared-/exec architecture, Google account coverage, migration, policy, quotas and rollout/rollback; never assume a Google Web App config alone grants safe actor identity | **Preferred strategic direction**, needs separate Architecture Decision and owner-approved migration |
| **B — Enforced trusted ingress + managed rate limiter/identity upstream** | Cross-account/global policy, audited traffic metadata and potential abuse detection | Apps Script public `/exec` or `google.script.run` may remain directly reachable and bypass the proxy; cannot claim protection without access topology/caller authenticity proof. Adds an owned service | **Conditional**, reject until bypass-resistant end-to-end design verified |
| **C — Apps Script authoritative stateful admission** (restricted ledger + lock; per-account and bounded global budget) | Can make **some per-script admission decisions** atomic and durable in an isolated, approved environment, before KDF; supports deterministic concurrency tests | A ledger on Sheets/Properties costs quota/I/O, stores pseudonymous sensitive metadata, can grow without bound, and global caps risk attacker-triggered denial. Does **not** reliably identify IP/device, and **does not by itself** solve distributed spraying or KDF work factor | **Conditional interim** only for tightly limited rollout; requires explicit store/capacity/recovery/retention design and non-production evidence |
| **D — ScriptCache-only counter refactor** | Can improve opportunistic throttling and UX, and avoid some same-account races with careful lock usage | Cache eviction is permitted; cannot guarantee durable attempt reservation, cross-account coverage or failure tracking | **Not sufficient to close R04** |
| **E — Front-end CAPTCHA/hiding buttons only** | Minor friction, if properly server-verified | Bypassable via direct RPC and can harm accessibility; weak against targeted attacks | **Not an authoritative defense** |

**Recommendation:** Do not implement a standalone CacheService patch and label R04 resolved. First approve target audience/trust boundary: **restricted staff via managed identity/MFA (A) is preferred** for a public-health system. If a staged interim GAS password flow is necessary, treat (C) as *defense in depth only* and keep **R04=HOLD** until a separate strong admission/identity control is proven. The Product Owner must choose A/B/C and the rollout population in a subsequent Human Gate. This design PR chooses **no deployment or infrastructure**.

## 4. Conditional option C — atomic pre-KDF admission protocol (NOT IMPLEMENTED)

This is a **review target, not paste-ready production pseudocode**. A future source patch may use it only after storage/retention, volume and lock quota decisions are approved:

1. Normalize bounded public input; derive a stable, non-reversible **keyed pseudonym** for the account inside a reviewed server boundary (do not write email, plain SHA(email), or the pepper/secret to public evidence). Define pepper key custody and rotation; no new Script Property change is permitted now. Unknown and known accounts must use the same admission policy.
2. Acquire a short `ScriptLock` for an **atomic** store transaction; load durable, expiry-aware account attempts and bounded global windows; reserve a single inflight attempt with an opaque test-safe reservation ID and expiry **before** any PBKDF2 call. Validate counter format, server clock, capacity, version and concurrent reservation limits. If lock/store unavailable, at quota, inconsistent or ambiguous => **deny without verification**; release lock promptly.
3. Outside the lock, look up the account and perform exactly one bounded verifier attempt. Authenticate only if correct, active, role policy satisfied and RR-01 mode valid; legacy upgrade must keep compare-and-swap. Unknown-user timing uniformity requires a **bounded dummy-verifier strategy** chosen only after R03 cost review; never add 12,000 HMACs to all unknown requests before passing admission.
4. Reacquire the short lock and **finalize by the exact reservation ID**. Record failure/success without overwriting later attempts; enforce limits for concurrent already-reserved attempts. A success may forgive a bounded account failure history only if no intervening attempt would be erased, based on a monotonic version/reconciliation rule. Any failed finalization must deny token issuance and trigger a controlled remediation path; do not automatically grant access because password verification succeeded.
5. Issue a session and update LastLogin/Audit **only after** successful admission-finalization and all existing account/role checks. Record at most coarse `ALLOWED`, `DENIED`, `BLOCKED`, `THROTTLE_BACKEND_ERROR` counters; no credential/identifier payloads. Define behavior for crash after finalize but before session creation (attempt consumed; no token minted).
6. Use expiry derived from **server time**, bounded lease cleanup and a finite-capacity retention policy. Enforce sliding/rolling windows as specified by tests, not an unstable cache TTL or blindly extending lockout on every rejected request. Do not delete unexpired rows to make storage available; **stop new admissions** if capacity/recovery is unsafe. Account support must require authenticated privileged workflow separately.
7. Apply a separately reviewed **registration admission rule before KDF** and uniform duplicate-account public result when self-registration is allowed; verify the semantics and side effects of duplicate submission/races and abuse of email uniqueness. Consider keeping self-registration disabled for restricted release if authorized; do not flip production settings here.

**Storage and concurrency warning:** A Google Sheet append/read/update is not inherently one atomic transaction; `ScriptLock` serializes cooperating executions in one script, not external editors, jobs or projects. A candidate backing store must prove all writers honor the same lock, obtain bounded atomicity/compensation under partial failures, avoid per-attempt unbounded row growth and address recovery from stalled inflight leases. Do **not** choose PropertiesService just because it is available: item/storage and daily quota limits plus Script Property secrecy and restore semantics require review. A key naming convention is not a security boundary without protected key material and access policy.

**State machine to validate:** `IDLE -> RESERVED -> (VERIFIED_SUCCESS | VERIFIED_FAILURE | UNAVAILABLE) -> FINALIZED -> SESSION_CREATED or DENIED`; `EXPIRED/INTERRUPTED` reservations must be reconciled without double-grant or disappearing failed-attempt liability. "Correct password" does not override failed admission or incomplete finalization.

## 5. Required public error and privacy contract

- Treat unknown email, wrong password, suspended/pending account and blocked admission with an **approved generic outward authentication response**. A service outage may use a generic retry-later class without account-specific information, but it must not reveal whether a real account was found. Registration should not disclose duplicate-account existence through public responses. Product Owner approves exact Thai UX copy, accessibility and private support route later.
- Consistent response *strings alone* do **not** eliminate observable differences in timing, Google service failures, lock contention, account creation or HTTP/RPC exception type. Measure a **bounded** side-channel treatment in isolated synthetic staging after R03 benchmark; avoid allocating unlimited PBKDF2 work as naive delay.
- Do not write raw email, passwords, hash material, session tokens, full IP addresses, failed request bodies or health data to AuditLogs/GitHub. Any retention, privacy notice, operator access, queryable account-abuse evidence or new Script Properties must pass R05/R08 policy and separate authorization.

## 6. RR-04 acceptance criteria and future implementation slices

**Proposed sequencing (each code slice requires new Product Owner approval, PR and exact-head tests):**

- **C0 — Source contract/tests only:** map every unauthenticated entrypoint (`login`, `registerUser`, related recovery/privileged RPC), freeze public RPC inventory, add synthetic counter/Cache eviction/concurrency *RED* tests, document current failure signatures without publishing real account material.
- **C1 — Generic outward denial and registration contract:** unify denial/status/duplicate copy and normalizable error shape, while preserving role/approval semantics and no-credential Audit. Avoid implementing dummy KDF/timing padding before its cost is verified.
- **C2 — Chosen authoritative admission mechanism:** only after A/B/C architecture approval, implement atomic pre-KDF reserve/finalize and storage/service fail-closed semantics; preserve GS-S3/RR-01, PBKDF2 and bound sessions. No new public privileged RPCs.
- **C3 — Observable/operable recovery:** bounded aggregate metrics, authorized support unlock, lifecycle/retention/capacity and crash reconciliation; restricted audit policy and staged test-only fixtures.
- **C4 — RR-02/RR-03 staging verification:** external-user and staff context, trusted ingress if chosen, 1/2/5-client safe load after consent, real KDF latency and rollback/restore; *R04 remains OPEN until evidence and Product Owner decision*.

**Synthetic criteria** (details and owners in [RR-04 Decision and Test Matrix](../release/rr-04-login-abuse-decision-matrix-2026-10-12.md)):

| ID | Required assertion |
| --- | --- |
| RR04-T01 | Five failed attempts in a 15-minute test window and a sixth denied **before KDF**; both known/unknown users follow the policy without output enumeration |
| RR04-T02 | Simulated CacheService eviction and malformed counter data **cannot alone** reopen a protected admission in the chosen architecture |
| RR04-T03 | Deterministic simultaneous reservations for the same account never exceed an approved capacity; no shared ScriptLock held across PBKDF2 |
| RR04-T04 | Rotating account identifiers cannot evade a selected **enforceable** global/admission policy; absent trusted perimeter must be classified UNSOLVED |
| RR04-T05 | Authenticated but pending/disabled and unknown/wrong accounts share approved outward denial semantics; timing exposure measured only in separate staging |
| RR04-T06 | A failed lock, ledger read/write, quota or reservation finalization issues **no session**, preserving failure evidence and not overwriting newer attempts |
| RR04-T07 | Valid migrated PBKDF2 and legacy SHA-256 credentials preserve GS-S3/RR-01 `auto` and emergency `pause` dual-verifier semantics |
| RR04-T08 | Failed/successful auth results keep GS-S2/GS-S5 Audit free of credentials and full identifiers; GS-S1 operator RPC remains guarded |
| RR04-T09 | Self-registration duplicate/racing requests have approved generic response and admission occurs **before** any new PBKDF2 generation |
| RR04-T10 | An attacker cannot indefinitely lock all legitimate accounts via global breaker/lockout; availability and support policy is owner-approved |
| RR04-T11 | Successful login and password reset/session revocation remain correct under races; LastLogin and session are not created on failed finalization |
| RR04-T12 | Guest Aggregate Dashboard still works as designed, while all authenticated patient/Event/Report routes continue to require server-side RBAC |

**Exit:** This **design document** may be merged as documentation once exact-HEAD CI and Product Owner Merge approval pass. It **does not authorize code changes or storage/identity redesign**, does **not** close R03/R04, and **does not lift** R01–R08 or `APPS_SCRIPT_DEPLOYMENT=HOLD`.

## 7. Sources and cross-references

- [RR-03 KDF/abuse analysis](rr-03-kdf-login-abuse-readiness.md); [RR-01 rollback constraints](rr-01-authentication-rollback-compatibility.md); [RR-02 staging isolation](rr-02-operator-manifest-preflight.md)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — generic outward responses, throttling and lockout DoS risks
- [OWASP Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html) — MFA and layered controls for credential stuffing/spraying
- [OWASP 2025 A07 Authentication Failures](https://top10.owasp.org/2025/A07_2025-Authentication_Failures/) — prefer mature authentication, safe session practices
- [Google Apps Script CacheService](https://developers.google.com/apps-script/reference/cache/cache-service) — expiration is not guaranteed
- [Google Apps Script Properties](https://developers.google.com/apps-script/guides/properties) and [quotas](https://developers.google.com/apps-script/guides/services/quotas) — separate data-store and execution constraints
