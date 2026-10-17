# D331 N1-C3-A — Threat Model, Negative Test Matrix and Release Gates

**Classification:** design/test plan only, Issue #203, \`main@735d9529047a5b8bf1e1f4f8114006216194e909\`. No executable test added by C3-A. A proposed synthetic PASS cannot attest Cloud authority. No Production exists.

## Assets and trust boundaries

- **Assets:** session/token validity; signed/versioned disease eligibility; D331 grant life cycle; current AreaID/EventID/Owner/Revision, patient PHI, logs/exports, target Script↔Spreadsheet binding and rollback evidence.
- **Untrusted inputs:** every browser object/role/scope/READY claim; stale callbacks; caller-created injected mock provider; mere local test fixtures and self-reported Cloud metadata; arbitrary sheet name, EventID, requestId, patient DTO and grant record.
- **Future trusted facts (all currently pending):** verified existing DEV Script/Deployment/property/owner/ACL; a server-current active UserAccounts session; approved independent clinical policy; approved, nonrevoked per-user grants; exact 39/10 raw headers/unique active AreaID/EventID; security/clinical/privacy/DDL-approved operations. **No such complete chain exists today**.
- **Unsafe paths to forbid in read-only preflight:** \`getDb_\` with active-spreadsheet fallback/property mutation, \`ensureSheet_\`, installer/repair, \`findEventRowById_\` first match, permissive \`getAreaMaster()\` Active parsing and client \`rowToObject_\` coercion.

## Mandatory denial cases

**Each row is a FUTURE negative acceptance test.** Use synthetic memory data only until separately authorized. Expected outcome for every adversarial case is **DENY/no private data/no enabling/no unsafe I/O**; UI errors are generic.

| ID | Adversarial input / race | Required check | Future fixture / observation |
| --- | --- | --- | --- |
| T01 | Feature OFF or denied by policy | Do not evaluate live D331 data | Zero external reads, \`OFF\` |
| T02 | Unknown/broken Script–Deployment–Spreadsheet ID or wrong owner/ACL | Explicit pinned DEV binding before data | No fallback/property change |
| T03 | Blank \`DATABASE_SPREADSHEET_ID\` | Never use active Spreadsheet / \`getDb_\` | Zero property writes |
| T04 | Missing/revoked/expired session; token replaced during call | Current server session each request | Auth-deny and stale UI discarded |
| T05 | Client supplies \`userId\`, generic role, faux Super Admin, grants or \`origin:'server'\` | Server owns issuer/identity/capability | Reject without trusting claims |
| T06 | No grant or self-issued grant despite Admin role | Explicit approved per-user grant only | Deny even with global \`view/edit\` |
| T07 | Grant expired, revoked, malformed, mismatched user or duplicate grant ID | Live version, expiry and revocation | Deny all operations |
| T08 | Grant revoked between readiness and Event operation | Reauthorize private request at execution | Old readiness cannot unlock |
| T09 | Grant/policy revision drift or stale cache | Current signed version / invalidate | Deny, not stale allow |
| T10 | Wrong AreaID, wrong EventID, wildcard, empty/ambiguous scope | Intersection, no inferred privileges | Deny despite valid role |
| T11 | AreaMaster wrong 10 headers, \`Active='true'\` string, blank/inactive | Exact boolean + header check | Deny |
| T12 | Duplicate or ambiguous active AreaID/location | Strict unique full scan | No first-match permit |
| T13 | Village code \`001\` vs numeric \`1\`, name fuzziness | Preserve approved leading zeros / no fuzzy coercion | Deny mismatched scope |
| T14 | MainData missing/wrong 39-header order, duplicate EventID | Exact headers / unique event UUID | Deny |
| T15 | Missing \`OwnerUserID\`, display-only Revision, closed/void parent | Raw data and status/revision checks | Deny; no auto-backfill |
| T16 | Unsigned clinical code, broad mosquito group, unknown synonym | Empty allowlist until explicit signoff | Deny diagnosis inference |
| T17 | Browser claims \`READY\`, \`ENABLED\`, \`LOADING\` as server state | V1 deny-only closed schema | Generic \`ERROR\`, disabled controls |
| T18 | Unsupported response version, extra patient fields, expired timestamp, bad requestId | Strict envelope/time/correlation | Generic deny, no PHI rendering |
| T19 | Late callback after logout, login, role/identity/epoch switch | Client action lease + epoch fencing | Old result never repaints / no duplicate action |
| T20 | Grant revoked while cached browser status still visible | Mandatory server enforcement | No read permitted; stale UI harmless |
| T21 | Query/export/log exception contains PHI, IDs or token | Redact before output and audit | Generic status only |
| T22 | Invalid write Revision, parent closed, reused idempotency key/digest conflict | Fresh lock-bound recheck + ledger | No write/duplicate/unknown-success inference |
| T23 | Future multiple Sheets mutate and one fails | No cross-sheet ACID assumption | Recovery/UNKNOWN plan; never auto retry |
| T24 | Mock provider claims server provenance or synthetic test passes | Mock **never** becomes live authority | No public RPC, no capability |
| T25 | Misconfigured deployment, unsupported Native index/file drift | Exact approved SHA + staged manifest/rollback | Release abort before clasp push |
| T26 | Schema unknown/new eighth grants tab without DDL approval | No migration or auto-\`ensureSheet_\` | 0 creates/changes |
| T27 | Security/audit backing unavailable or permission check fails | Fail closed, minimal observability | Deny, PHI-free category only |
| T28 | Credential/session token in issue, logs, stack trace, URL | Sensitive-data redaction and custody | No secrets in artifacts |
| T29 | Empty EventID allowlist interpreted as wildcard | Owner/scope semantics signed first; default deny | Empty cannot expand privilege |
| T30 | Grant rollback restores revoked permission | Monotonic revoke-forward version/tombstone policy | Former grant remains denied |

## Test layers: what can actually be proven

| Layer | Safe assertion | Cannot claim |
| --- | --- | --- |
| L0 Docs-only (C3-A) | Decision traceability, negative coverage and HOLD list | Any executable security proof |
| L1 Future unregistered offline pure evaluator (C3-B) | Shape/logic rejects forged, expired or revoked synthetic inputs; no Google methods | Live authentication, issuer or real grant provenance |
| L2 Future authorized read-only DEV target preflight (#189) | Verified metadata under explicit named custody if evidence is genuine | Patient authorization or DDL approval |
| L3 Future server-only private endpoint tests | Current session/grant/policy verification and data minimization under trusted adapters | Full rollout or every clinical policy unless signed |
| L4 Future isolated TEST Release/UAT | Target-specific role/no-PHI/accessibility/rollback checks | Production readiness; none exists |

## Proposed immutable integration/release controls

1. Record exact baseline and all transitive source dependencies. C3-A changes **Markdown only**; any changed \`.gs\`, \`.html\`, JS, manifest, CI, lockfile, secret, Script/Sheet or release script means **STOP / scope drift**.
2. Under separate C3-B approval: no new public RPC or native manifest registration; run synthetic/negative tests and compare exact candidate SHA/CI.
3. Before any future real metadata access: fresh explicit Product Owner and custodian sign-off, existing DEV identity/owner/ACL checks, declared *read-only* method list, prove absence of fallback/mutation, log only sanitized status. Do not treat self-generated evidence as server proof.
4. Before any future DDL: approved exact operational schema (seven tables **provisional**), explicit decision on grants backing/eighth table, isolated backup and reversible apply plan, no \`ensureSheet_\` fallback.
5. Before any future live D331 RPC or private data: signed policy/grants/privacy/clinical/AreaID, server-only current session and revocation, strict headers, exact event uniqueness, negative test replay and no PHI logs.
6. Before any future TEST deployment: Product Owner exact source SHA, approved existing DEV target and separated TEST identity, verified Native26 source/Index V8, stage whitelist/backup/version inventory, rollback and explicit human confirmation. No Production exists.
7. On any unknown/error/partial rollback: **HOLD**, no auto promotion, no re-enable; address stale grants/revocation and require a fresh Human Gate.

## Review checklist for PR

- [ ] All four C3-A Markdown files referenced and bounded to issue #203.
- [ ] All B2-D01–D10 explicitly crosswalked and their sign-off state **not invented**.
- [ ] G1-B0 D01–D15 exact label mapping clearly pending verification; no guessed endorsements.
- [ ] Explicit grant storage options and possible eighth-table DDL conflict.
- [ ] Status-only readiness never authorizes private read, write, export, AI or geolocation.
- [ ] Negative matrix covers forged browser principal/scope, row identity, revoked grants, privacy leakage, unknown writes, rollback and Script Property mutation.
- [ ] Canonical baseline & **docs-only** Git Tree scope, CI green; ChatGPT Independent Review; separate Product Owner Merge permission.
- [ ] \`D331_G1A_ENABLED=false\`, no Apps Script/Google API or deployment.
