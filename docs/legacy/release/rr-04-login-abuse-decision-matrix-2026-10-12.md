# RR-04 — Decision Record and Synthetic Acceptance Test Matrix

**Date:** 2026-10-12 (Asia/Bangkok)  
**Reference:** [RR-04 Corrective Design](../architecture/rr-04-login-abuse-corrective-design.md).  
**Exact source baseline:** `main@fa9624803e45e3085b886a53338f72b8b6a0d873`.  
**Document status:** DRAFT / SOURCE-ONLY. No live tests or authenticated services were accessed.  
**Release:** `MERGE=HOLD` until separately approved; `R04=OPEN`; `R03=OPEN`; `APPS_SCRIPT_DEPLOYMENT=HOLD`.

## 1. Pending Product Owner architecture choice — NOT DECIDED

| Decision ID | Question | Candidate responses | Selected / evidence |
| --- | --- | --- | --- |
| AR-01 | Is the application private staff-only, mixed guest+staff, or anonymous authenticated membership? | Restricted / mixed / public (requires explicit access analysis) | **UNDECIDED** |
| AR-02 | Which primary authenticated identity boundary is enforceable? | A managed identity+MFA (preferred) / B verified upstream identity+rate limiter / C restricted temporary GAS password path with independent protections | **UNDECIDED** |
| AR-03 | Can the direct GAS `/exec` / HTML Service RPC be reached without the selected boundary? | Prove all paths, including bookmarked/shared URLs and direct RPC | **NOT_VERIFIED** |
| AR-04 | Can one abuse ledger store atomically reserve attempts before PBKDF2? | Design bounded durable state, short lock and recovery; prove partial-failure correctness in tests | **NOT_DESIGNED OR PROVEN** |
| AR-05 | What per-account/global budgets and lockout recovery are acceptable? | DoS-safe thresholds, sliding window, in-flight limit, private authenticated support channel | **NOT_APPROVED** |
| AR-06 | Where are pseudonymous abuse keys and optional signing/pepper managed? | Operator/owner security custody with rotation; no GitHub, no leaked Script Property | **NOT APPROVED** |
| AR-07 | What Registration policy is approved? | Disabled for restricted rollout, or rate-limited proofed path with uniform duplicate response | **NOT_APPROVED** |
| AR-08 | Does production expose sensitive patient/Event data to non-MFA credentials? | Require owner/DPO evaluation of policy and minimum authentication strength | **NOT ASSESSED** |
| AR-09 | How to preserve rollback after auth changes? | Retain dual-verifier-capable known-good artifact, RR-01 `auto`/`pause` semantics, tested synthetic recovery | **NOT REHEARSED** |

**Current recommendation:** favor **A** for privileged public-health workflows; if a temporary Apps Script password rollout is pursued, **C remains an interim defense-in-depth measure**, not proof of cross-account spraying protection. Never mark a specific option **APPROVED** based only on a documentation merge.

## 2. Required independent review evidence (empty template)

| Field | Current value | Documentation rule |
| --- | --- | --- |
| Architecture decision owner | `UNASSIGNED` | Separate human Product Owner |
| Authenticated boundary owner | `UNASSIGNED` | Who can actually enforce gate |
| Patient-data policy review / DPO | `NOT_RUN` | No patient data copied to PR |
| Threat model review (technical) | `AUTHOR_ASSISTED_ONLY` | Explicitly mark if independent reviewer unavailable |
| Proposed Auth source PR | `NONE` | Separate from RR-04 design PR |
| Synthetic fixtures and tests | `NOT_CREATED` | No real usernames/passwords, tokens or hashes |
| Live Apps Script benchmark approval | `NOT_GRANTED` | R03/RR-02 separate Human Gate |
| Live Apps Script benchmark result | `NOT_RUN` | No fabricated timing/capacity |
| Existing Script ID / deployment / access policy | `NOT_INSPECTED` | Full identifiers in restricted evidence only |
| R04 release disposition | **OPEN / HOLD** | Cannot close from code parity |
| R03 KDF feasibility/strength | **OPEN / HOLD** | 12k PBKDF2 and GAS quotas unresolved |
| Apps Script Production Deployment | **HOLD** | Must require separate approval |

## 3. Next corrective implementation PR acceptance criteria

**All cases below are designed, not implemented or executed**. For concurrency cases, use a deterministic synthetic clock and controlled scheduler to simulate interleavings rather than hoping that nondeterministic parallel Node tests trigger a race.

| Case | Mock setup / attack intent | Invariant to assert | Outcome now |
| --- | --- | --- | --- |
| RR04-T01 | 6 guesses in 15 minutes against known and unknown synthetic user | 6th denied before KDF; outward responses follow approved uniform policy; no unapproved session | **NOT_RUN** |
| RR04-T02 | Evict, corrupt and omit CacheService keys; simulate backend timeout | Authoritative attempts do not vanish; unavailable backend denies; no fallback to cache=0 as authority | **NOT_RUN** |
| RR04-T03 | Schedule 5 concurrent same-user admissions around lock acquisition | Bounded reserved attempts before verification; no overshoot; script lock not held through KDF | **NOT_RUN** |
| RR04-T04 | Rotate synthetic emails across distinct accounts | Selected global/enforced ingress admission cannot be bypassed; if not enforceable report **UNSOLVED** | **NOT_RUN** |
| RR04-T05 | Known wrong, unknown, pending, disabled, blocked, failed service | No username/status enumeration via approved outward response schema; synthetic timing risk recorded separately | **NOT_RUN** |
| RR04-T06 | Inject failure on reserve/finalize/lock/persistence and interrupt execution | Fail closed, no token/LastLogin, no stale counter overwrite; orphaned reservations reconciled | **NOT_RUN** |
| RR04-T07 | Stored SHA-256, PBKDF2 and malformed hash; set RR-01 mode auto/pause | Dual verifier and session revocation preserved; never hash downgrade or legacy-only rollback | **NOT_RUN** |
| RR04-T08 | Failure, lockout and successful login with mock Audit | Redacted stable event class only; no email/hash/password/token/health narrative | **NOT_RUN** |
| RR04-T09 | Parallel duplicate `registerUser`, registration-burst and bad input | Admit before expensive hash; bound attempts; no public duplicate-email disclosure; no duplicate active accounts | **NOT_RUN** |
| RR04-T10 | Malicious repeated use of global breaker, lockout and support pathway | Legitimate-user availability degradation bounded and approved; no public bypass/unlock | **NOT_RUN** |
| RR04-T11 | Password reset during admitted verification; another failure after success | No lost newer failure, no session on failed finalize, bounded success reconciliation, old session revoked | **NOT_RUN** |
| RR04-T12 | Exercise anonymous Dashboard, Guest, Event, Report, operator RPC | Guest aggregate boundary and all existing RBAC/GS-S1–S5 controls remain | **NOT_RUN** |

**Operational rehearsal needed beyond tests:** Approved RR-02 isolated Apps Script staging, RR-03 actual KDF wall-time under 1/2/5 synthetic clients, service quota/capacity behavior, observability with scrubbed data, restore/recovery, and direct-GAS bypass investigation. Cannot infer these from GitHub Node tests.

## 4. Implementation slice planning

| Slice | Allowed future work after fresh approval | Required completion gate |
| --- | --- | --- |
| C0 | RED tests plus current state model / RPC inventory | Synthetic regression contract, no source behavior changes |
| C1 | Uniform outward login/registration denial design and tests | UX/product agreement on generic Thai errors and recovery |
| C2 | Approved A/B/C authority boundary with *pre-KDF* atomic admission where relevant | Exact source diff + durable-state failure and concurrency tests |
| C3 | Retention, storage capacity, redacted security signals, non-public support | DPO/owner retention decision, privacy and denial-of-service tests |
| C4 | Separately approved non-production validation, RR-01 recovery / RR-02 identity / RR-03 latency | Signed Human Gate; only then R04 may be reassessed |

### Readiness summary

`RR04_DESIGN_ONLY=PREPARED`  
`RR04_SOURCE_FIX=NOT_IMPLEMENTED`  
`RR04_SYNTHETIC_TESTS=NOT_IMPLEMENTED`  
`R04_RUNTIME_PROOF=NOT_RUN`  
`R04_DECISION=OPEN`  
`R03_DECISION=OPEN`  
`R01_TO_R08_RELEASE=HOLD`  
`APPS_SCRIPT_DEPLOYMENT=HOLD`

Do not reinterpret this artifact as release authorization. No new Google Apps Script project, `clasp` command, real user account, Script Property, source or Production data was accessed or changed.
