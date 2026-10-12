# RR-02 — Sanitized Non-production Verification Evidence Template

**Created:** 2026-10-12 (Asia/Bangkok)  
**Scope:** A blank collection template for a future **separately approved** read-only metadata inventory and isolated staging verification.  
**Related plan:** [RR-02 Operator/Manifest Preflight](../implementation/rr-02-operator-manifest-preflight.md).  
**Status on creation:** **ALL CASES NOT_RUN; NOTHING VERIFIED ON A LIVE GOOGLE PROJECT**.  
**Approval state:** GitHub documentation PR approval does **not** approve non-production Apps Script work, `clasp`, reading live project metadata, real account access, or production deployment.

## 1. Evidence header (fill only after an authorized event)

| Field | Value now | Rule for future filling |
| --- | --- | --- |
| Evidence bundle ID | `UNASSIGNED` | Use opaque ticket, not actual Script ID |
| Product Owner staging approval reference | `NONE` | Required before project creation, editor login or test |
| Approval scope and expiry | `NOT_SET` | Explicitly restrict allowed access, assets and APIs |
| Operator (restricted record reference) | `UNASSIGNED` | Do not publish the real Google address |
| Reviewer (separate if available) | `UNASSIGNED` | Technical review by the author must be labeled author-assisted |
| Execution timestamp / timezone | `NOT_RUN` | Use ISO 8601 and Asia/Bangkok |
| Immutable GitHub SHA | `NOT_SELECTED` | Must match the separately approved candidate |
| Staging published version | `NOT_DEPLOYED` | Record immutable version in restricted bundle |
| Existing live /exec identity | `NOT_INSPECTED` | Live metadata inspection requires its own approval |
| Actual Script ID / Deployment ID | `RESTRICTED_NOT_COLLECTED` | Hold full values in restricted evidence, never in GitHub |
| Evidence vault reference | `UNASSIGNED` | Access controlled; verify backup and retention |
| Last result | `NOT_RUN` | Only PASS after signed-off evidence |

## 2. Operator identity and context matrix

For each execution, record a **synthetic** actor alias and context (`EDITOR_MANUAL`, `SHEET_MENU`, `STAGING_DEV`, `STAGING_EXEC`), observed identity availability as **blank/matching/mismatching** without copying addresses, expected outcome and actual guard-only outcome. Never call mutating privileged functions merely to prove the operator check.

| Case | Context (later) | Expected | Actual | Side effects? | Restricted reference |
| --- | --- | --- | --- | --- | --- |
| OP-01 missing operator config | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-02 invalid/multiple config | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-03 active user blank | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-04 active user mismatched | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-05 effective user mismatched/blank | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-06 both match, guard-only safe sentinel | `NOT_SET` | ALLOW_GUARD_ONLY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-07 anonymous/blank Web App identity | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |
| OP-08 ordinary app user/operator RPC | `NOT_SET` | DENY | **NOT_RUN** | NOT_OBSERVED | NONE |

**Pass interpretation:** Denied means no downstream mutation or privileged reading. OP-06 must stop at an approved *non-mutating* diagnostic boundary. If active-user availability prevents a safe positive test, enter `NOT_TESTABLE` and keep R02 OPEN; do not override operator restrictions.

## 3. Manifest and deployment read-only inventory (future Gate B/C)

| Item | Expected verification | Current result | Evidence handling |
| --- | --- | --- | --- |
| Environment separation | Staging distinct from production | **NOT_RUN** | Restricted asset map |
| Project and deployer authority | Approved test owners/operators only | **NOT_RUN** | Aliases, private account reference |
| Source and deployed version mapping | Exact source/HEAD vs immutable `/exec`; label `/dev` | **NOT_RUN** | Opaque deployment record |
| `appsscript.json` | Actual backing manifest retained with verified restore | **NOT_RUN** | Private manifest, not GitHub |
| `runtimeVersion` | V8 | **NOT_RUN** | Public-safe boolean |
| `webapp.access` | Explicitly approved enum for each staging version | **NOT_RUN** | Enum may be in restricted record |
| `webapp.executeAs` | Explicitly approved `USER_DEPLOYING` or `USER_ACCESSING` | **NOT_RUN** | No inferred identity |
| Published entrypoint | Matches version/executeAs/access under test | **NOT_RUN** | Restricted deployment metadata |
| OAuth scopes | Actual approved minimum scopes; change detection | **NOT_RUN** | Restricted scope diff, never token |
| Operator property | Configured only for approved test operator | **NOT_RUN** | Presence/format/match booleans, not email |
| Native source and execution order | 7 GS + 16 HTML partials + generated Index | **NOT_RUN** | Exact SHA and parity report |
| Source + manifest restore | Restore independently proven | **NOT_RUN** | Protected immutable backup |
| Auth-compatible rollback target | Supports SHA-256 & PBKDF2 plus security controls | **NOT_RUN** | Version/ref, no passwords |
| Quota and KDF feasibility | Separate R03 threshold and timing evidence | **NOT_RUN** | Aggregate timings, no credentials |

The G-34 `--preflight` script contacts the target and pulls remote source/manifest into a private local backup. **Do not execute it merely to fill this template.** It must be approved separately even though it does not deploy.

## 4. Isolated synthetic integration case record (future Gate D)

| Case | Outcome | Stop if |
| --- | --- | --- |
| ST-01 staging asset/identity isolation | **NOT_RUN** | Any production ID or real record referenced |
| ST-02 dual-verifier login, rollback, session revocation | **NOT_RUN** | Legacy downgrade or unauthorized session |
| ST-03 operator/RBAC, public aggregate privacy | **NOT_RUN** | Unauthorized access or patient-like details disclosed |
| ST-04 report consent, job idempotency, failure paths | **NOT_RUN** | Duplicate report/unknown state accepted |
| ST-05 audit redaction, failure/recovery, small cell policy | **NOT_RUN** | Credentials appear in audit or disclosure |
| ST-06 immutable staging rollback and backup restore | **NOT_RUN** | Restore cannot retain current hashes/data |
| ST-07 failure/stop criteria and incident capture | **NOT_RUN** | Scope, identity, OAuth or isolation drift |

For each case attach a **private** record with: case ID, exact tested source SHA, staging version, environment class, synthetic fixture ID, steps/results (no user contents), denial/side-effect assertion, timestamp, evaluator and decision. A CI PASS is **not** a substitute for this runtime record.

## 5. Outcome and decision block

| Gate | Current verdict | Minimum evidence to upgrade |
| --- | --- | --- |
| RR-02 plan authored | IN_PROGRESS (until PR reviewed/approved/merged) | Docs-only exact-HEAD CI and Product Owner merge approval |
| R02 operator identity | **OPEN / NOT_RUN** | Full safe OP matrix on approved staging and separate deployment metadata |
| R06 OAuth/deployment/rollback | **OPEN / NOT_RUN** | Authenticated restricted inventory, version/manifest consistency and verified restore |
| R07 isolated integration | **OPEN / NOT_RUN** | Approved synthetic ST evidence and no privacy/identity failures |
| R01 live rollback rehearsal | **OPEN / NOT_RUN** | Tested dual-verifier compatible version, never pre-GS-S3 |
| R03 KDF and R04 rate-limit | **OPEN / NOT_RUN** | Approved real Apps Script benchmark and abuse-control decision |
| R05 historical audit / R08 privacy | **OPEN / NOT_RUN** | Restricted owner/DPO findings; not part of this plan |
| Production readiness | **HOLD** | R01–R08 formally closed + separate release Human Gate |

**Decision:** `SOURCE_RR02_PLAN=PENDING_PR_REVIEW`, `LIVE_EVIDENCE=NOT_RUN`, `APPS_SCRIPT_DEPLOYMENT=HOLD`. Do not populate any cell with `PASS` based solely on source review or guessed environment facts. Do not post source backups, secrets, personal data, actual Script Property values or deployment identifiers to public GitHub.
