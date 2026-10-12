# RR-03 — KDF Benchmark and Login Abuse Evidence Template

**Prepared:** 2026-10-12 (Asia/Bangkok)  
**Companion plan:** [RR-03 KDF and Login Abuse Readiness](../implementation/rr-03-kdf-login-abuse-readiness.md).  
**Baseline source:** `main@044b3f40474abc3a8eb53e80a16d2b0186104a75`.  
**All runtime outcomes:** `NOT_RUN`; **no Apps Script execution, user data, Script Properties or Workspace project was accessed**.  
**Privacy rule:** record pseudonymous case identifiers, **no passwords, salts, hashes, account email, access tokens, patient narratives, actual Script IDs or deployment URLs**. Restricted evidence references live outside GitHub.

## 1. Authorization and measurement context — unfilled by design

| Evidence field | Status / placeholder | Responsible future decision |
| --- | --- | --- |
| Product Owner non-production benchmark approval | **NOT_GRANTED** | Scope, identity, allowed test volume, start/stop gate |
| Approved GitHub source SHA | `NOT_SELECTED` | Exact source and build parity |
| Actual non-production project isolation | **NOT_VERIFIED** | Staging owner/ID in restricted vault only |
| Approved test-only diagnostic wrapper | **NOT_CREATED** | Security review of bounded, non-public entrypoint |
| Manifest runtime, OAuth and access | **NOT_INSPECTED** | RR-02, private test-project inventory |
| PBKDF2 implementation work factor | `12000` (source only) | R03 review against modern guidance; no unilateral edits |
| Work factor security approval | **NOT_GRANTED** | Product Owner/security reviewer |
| Login UX thresholds | **PROPOSED_NOT_APPROVED** | Draft P95 5s single / 10s at 5 concurrent |
| Trial sample budget and concurrency tiers | **NOT_APPROVED** | Staged / rate-bounded consent |
| Sanitized error-classification schema | **NOT_APPROVED** | No raw exception or account contents |
| Restricted log/evidence custodian | `UNASSIGNED` | Encrypted / least-access location outside GitHub |
| Reviewer separation | **NOT_ASSIGNED** | Author-assisted if same author |

## 2. KDF runtime results (all NOT_RUN)

| Case | Execution tier | Valid samples | P50 (ms) | P95 (ms) | Max (ms) | Errors | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KD-01 standalone 12k HMAC and format | Single synthetic | 0 | — | — | — | — | **NOT_RUN** |
| KD-02 correct/incorrect PBKDF2 login | Single synthetic | 0 | — | — | — | — | **NOT_RUN** |
| KD-03 successful legacy-to-PBKDF2 migration | Single synthetic | 0 | — | — | — | — | **NOT_RUN** |
| KD-04 dual-verifier `pause` rollback build | Separately approved staging artifact | 0 | — | — | — | — | **NOT_RUN** |
| KD-05 synthetic registration/owner reset | Synthetic only | 0 | — | — | — | — | **NOT_RUN** |
| KD-06a login at 1 concurrent client | Approved staging | 0 | — | — | — | — | **NOT_RUN** |
| KD-06b login at 2 concurrent clients | Approved staging | 0 | — | — | — | — | **NOT_RUN** |
| KD-06c login at 5 concurrent clients | Approved staging | 0 | — | — | — | — | **NOT_RUN** |
| KD-07 malformed/bounded rounds | Synthetic only | 0 | — | — | — | — | **NOT_RUN** |
| KD-08 known/unknown/inactive response classes | Synthetic only | 0 | — | — | — | — | **NOT_RUN** |

**Measurement quality:** record warm-up count, exception count, device/runtime context, call-level elapsed time, load overlap, cutoffs and sample size. P95 must not be presented as reliable from 5 trials; P99 must not be claimed from fewer than 100 independent trials. No fabricated timings based on Node `crypto` mocks. Stop any case that runs over the draft 30-second safety checkpoint or encounters quota/authorization anomalies; the benchmark itself is not a production load test.

**Provisional performance proposal only:** P95 end-to-end login <=5s at 1 client, <=10s at 5 clients, 0 known semantic/quota errors. Product Owner must approve or revise BEFORE running; satisfying these targets is not enough to sign off 12k-round KDF security.

## 3. Login abuse threat outcomes (all NOT_VERIFIED for real Apps Script)

| Finding | Source-supported description | Target disposition | Live result |
| --- | --- | --- | --- |
| AB-01 per-account failed attempt cap | 5 / 900s cached per normalized email | Evaluate support/lockout and authenticated recovery | **NOT_RUN** |
| AB-02 multi-account spray | No trusted global/per-client control | Approve MFA / identity / trusted ingress + audience | **NOT_RUN** |
| AB-03 early cache eviction | Cache is best-effort, not durable | Choose enforceable admission or layered defense | **NOT_RUN** |
| AB-04 parallel pre-check and write | Counter lock does not cover entire verify | Source race tests and chosen atomic admission design | **NOT_RUN** |
| AB-05 computational saturation | 12k HMAC per PBKDF2 verify | Quota/load guard & signal with sanitized telemetry | **NOT_RUN** |
| AB-06 known/unknown/inactive distinctions | Timing difference and status-specific denial | Uniform error/response review | **NOT_RUN** |
| AB-07 lockout abuse | Attackers could deny legitimate sign-in | Support strategy without password downgrades | **NOT_RUN** |
| AB-08 confidential audits | GS-S2 redacts new writes; historical R05 remains | No credentials in monitoring; separate R05 review | **NOT_RUN** |
| AB-09 ingress/access context | Deployment identity/permissions not observed | RR-02 environment proof before control claims | **NOT_RUN** |
| AB-10 privileged access | Authentication not yet supplemented with verified MFA | Security owner decision on privileged/clinical access | **NOT_RUN** |

## 4. Corrective development test plan — NOT IMPLEMENTED

Before implementation obtain explicit scope and architecture approval; then create separate PR with synthetic AB-T01 through AB-T09 and full exact-head CI. Never turn a demonstration of a current bypass into an unsupported claim of prevention.

| Test group | Required artifact later | Current status |
| --- | --- | --- |
| AB-T01–T03 counter / spraying / cache eviction | Synthetic deterministic verifier and mock Cache | **NOT_IMPLEMENTED** |
| AB-T04 concurrency admission and atomicity | Controllable mock scheduler / lock instrumentation | **NOT_IMPLEMENTED** |
| AB-T05 status and timing discrepancy | Public RPC response oracle under synthetic fixtures | **NOT_IMPLEMENTED** |
| AB-T06–T07 KDF failure / malformed format / rollback | Synthetic KDF and strict session/revocation tests | **NOT_IMPLEMENTED** |
| AB-T08–T09 redacted audit and legitimate-user support | Contract tests with no private records | **NOT_IMPLEMENTED** |

## 5. Go/No-go risk disposition

| Gate | Decision now | Evidence required to close |
| --- | --- | --- |
| RR-03 source-only planning | **PENDING_PR_REVIEW** | Documentation-only exact-head CI + separate Product Owner Merge approval |
| R03 latency/quota | **HOLD / NOT_RUN** | Approved Google staging benchmark and accepted latency/error evidence |
| R03 verifier security | **HOLD / NOT_APPROVED** | Approved modern password storage or managed identity strategy compatible with RR-01 |
| R04 admission/anti-abuse | **HOLD / NOT_IMPLEMENTED** | Approved trust perimeter + corrective tests and non-production validation |
| RR-01 & RR-02 live checks | **HOLD / NOT_RUN** | Isolated rollback/identity/manifest evidence |
| R05–R08 | **HOLD / OPEN** | Separate risk dispositions |
| Production deployment | **HOLD / NOT_AUTHORIZED** | Every blocking risk closed plus a separate go/no-go |

**End-state for this PR:** `SOURCE_ANALYSIS=DOCUMENTED` does not imply `R03=PASS`, `R04=PASS`, a tested Auth architecture or permission to run Google APIs. No `clasp push`, `update-deployment`, staging creation, login traffic or credential access is permitted.
