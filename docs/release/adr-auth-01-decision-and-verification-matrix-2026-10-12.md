# ADR-AUTH-01 — Decision Gate, Impact Matrix and Evidence Plan

**Date:** 2026-10-12 (Asia/Bangkok)  
**Companion:** [Managed Identity Transition ADR](../architecture/adr-auth-01-managed-identity-transition.md)  
**Exact source baseline:** `main@6dc50e6c886adec9b2cefa8af612e9f405b0a1ff`  
**Status:** **PROPOSED — NOT SELECTED / NOT APPROVED**. All Google Workspace, MFA, external-user, OIDC, data permission and Apps Script execution evidence: **NOT_COLLECTED**.  
**Scope:** source/documentation analysis only, no Cloud/Workspace/App Script call, no domain/real user/secret/PHI inventory, no change to current deployment.

## 1. Human decision register — must remain unselected on this PR

| Gate | Product decision needed | Candidate answer | Current disposition |
| --- | --- | --- | --- |
| AD-01 | Target audience and legal processing context | Internal organization / cross-agency / mixed anonymous public and staff | **UNDECIDED** |
| AD-02 | Organizational identity and MFA policy | A1 Google-managed account with **enforced MFA**, A2 separately validated OIDC identity, B external managed identity-aware backend, or C temporary legacy contingent | **A1 PREFERRED, NOT APPROVED** |
| AD-03 | External collaborators and users outside administered domain | Approved managed identities or clearly documented alternative/denial | **UNVERIFIED** |
| AD-04 | Separate anonymous Aggregate delivery | Minimal PUBLIC source/project or equivalent proven isolation, with no private RPCs; small-cell R08 gate | **NOT DESIGNED / NOT TESTED** |
| AD-05 | Private app execution and data ownership | `USER_ACCESSING` with own per-user OAuth/Drive permissions, or approved server-side verifier/service model | **UNVERIFIED** |
| AD-06 | Stable identity binding | `iss+sub` for verified OIDC, or trusted provisioned email-link with explicit limitation under Session-only, mapping to existing UserID | **NOT DECIDED** |
| AD-07 | Session protocol and revocation | New server-side managed identity v3 protocol, reject incompatible v2 password sessions | **NOT DESIGNED / NOT APPROVED** |
| AD-08 | Local login/registration in MFA-only rollout | Disable or isolate all legacy login, self-registration, recovery and password-session paths in private surface | **NOT APPROVED** |
| AD-09 | Existing report/AI/Drive/Docs workflow privileges | Least-privilege ACL and OAuth scope matrix; no wholesale data-sharing workaround | **NOT VERIFIED** |
| AD-10 | Operational cost/support and release authority | License, MFA recovery, access revocation, operator custody, backups and restricted DPO review | **NOT ASSIGNED** |
| AD-11 | Identity/architecture rollback boundary | Immutable managed-compliant target, version/manifest backup, v3 session/recovery, no SHA-only downgrade | **NOT REHEARSED** |
| AD-12 | Authorization for **H0 inventory only** | Separate Product Owner approval identifying read-only allowed metadata and access scope | **NOT GRANTED** |

**Meaning:** “A1 PREFERRED” is a technical recommendation based on expected risk; it is **not** a Product Owner architecture decision, not proof that an organization controls a Google Workspace domain or 2SV enforcement, and not permission to change deployment settings. **R05** elsewhere denotes historic AuditLogs/privacy; **ADR-AUTH-01 is a distinct architecture proposal**, not R05 closure.

## 2. Public, staff, operator and data boundary matrix

| Test surface | Identity requirement | Allowed after approval | Direct bypass condition to test | Evidence status |
| --- | --- | --- | --- | --- |
| PUBLIC aggregate project/artifact | Anonymous only for permitted, small-cell-safe stats | Sanitized aggregate view | Same project/script has any callable raw Event/Report/Settings/Users RPC; private Sheet readable | **NOT_RUN** |
| STAFF authenticated app | Enforced managed principal and bound, active UserID | Role-approved data and actions | `google.script.run` direct call, legacy v2 session, hidden button, alternative `/exec` | **NOT_RUN** |
| STAFF Google OAuth | Identity of actual data-accessing principal | Specifically authorized Sheets/Drive/Docs | User data access too broad, missing scopes, unapproved service principal | **NOT_RUN** |
| OPERATOR maintenance | GS-S1 trusted Google active **and** effective identity | Approved owner maintenance only | App role `Super Admin` treated as Google operator or empty-active fallback | **NOT_RUN** |
| REPORT and GEMINI | Same active UserID/RBAC + consent/job/registry guards | Synthetic report actions | Report role bypass, generated Doc owner/ACL change, unintended token transfer | **NOT_RUN** |
| DATA and AUDIT | Restricted custodianship and privacy review | Least privilege and integrity | Credential/person identifiers in public logs, loss of UserID/ownership linkage | **NOT_RUN** |

## 3. Test requirements for any separately approved implementation

| ID | Synthetic/offline precondition | Non-production runtime proof required | Now |
| --- | --- | --- | --- |
| ID-01 | Wrong/unverified Google ID token, empty active identity and wrong `aud`/`iss`/`exp`/`hd` deny | Authorized Google principal verification, negative tenant and blank-email cases | **NOT_RUN** |
| ID-02 | No email/role spoofing, unknown Google actor denied, no auto-provisioned active user | Real identity availability and MFA *policy* under approved test accounts | **NOT_RUN** |
| ID-03 | v2 password session rejected by managed-only path, v3 scoped binding and revocation | Parallel stale/new sessions, disable/reset and offboarding | **NOT_RUN** |
| ID-04 | Public package lacks protected RPC/source/config and private storage access | Anonymous direct RPC and alternate published URL bypass probes on isolated project | **NOT_RUN** |
| ID-05 | RBAC/account statuses bound to stable UserID; no direct Role claim | Staff/Manager/Admin tests with actual OAuth scopes and synthetic Sheets/Drive/Docs | **NOT_RUN** |
| ID-06 | Operator dual identity guard unchanged, all 15 public maintenance RPCs gated | Spreadsheet Menu/editor-only guard probe with *no actual mutating maintenance call* | **NOT_RUN** |
| ID-07 | Log/credential/privacy invariants for lost session/revoked identity | Synthetic revocation, session cache eviction, no sensitive error/log payload | **NOT_RUN** |
| ID-08 | UserID/EventID/Revision/OwnerUserID/ReportRegistry/Audit/Drive references preserved | Staging migration and independently restored managed-compliant artifact | **NOT_RUN** |
| ID-09 | Fail-closed external actor, lost MFA device and operator break-glass scenarios | Approved identity support policy and no hidden unauthenticated fallback | **NOT_RUN** |
| ID-10 | Native stage/parity, manifest V8, access/executeAs and release mode pinned to exact reviewed SHA | Authorized staging identity & data ACL smoke, Human deployment go/no-go | **NOT_RUN** |

No actual person, account, identity tenant, Script ID, OAuth token, Google Domain, patient record or Google Workspace settings may be pasted into a public issue, GitHub Actions log or this file. Future evidence uses pseudonyms, reviewed flags/conditions and restricted controlled references.

## 4. Mandatory H0 discovery inventory (future read-only authorization only)

| Discovery group | Read-only evidence (stored privately) | Forbidden at ADR merge |
| --- | --- | --- |
| Stakeholders & IdP | Group types, count bands, internal/external users, managed identity coverage and verified admin MFA policy | Creating Google users or modifying 2SV policy |
| Published deployment | Existing version/ID reference, real `appsscript.json`, `access`, `executeAs`, owner and published top-level RPC exposure | `clasp push`, `update-deployment`, Script Properties changes; unrestricted remote `clasp pull` |
| OAuth & data | Required Sheets/Drive/Docs/AI actions by actor, service ACL/ownership and whether `USER_ACCESSING` can work safely | Granting broad data shares, copying patient Sheets |
| Legacy user mapping | Schema contract, `UserID`/role/status linkage, existing ID type, lifecycle and dormant-account policy | Reading raw passwords/hashes, dumping UserAccounts in GitHub, bulk migration |
| Privacy boundaries | Public small-cell policy, anonymous direct RPC list and embedded UI `ALLOWALL` implications | Publishing new raw Event/Report endpoints |
| Safety & recovery | Named custodian, last immutable supported artifact, backup strategy and user/device recovery policy | Actual restore/migrate on production or downgrading SHA/PBKDF2 |

The `tools/deploy-g34-clasp.sh --preflight` operator script is **not a safe offline-only inspection**: it contacts remote Apps Script, pulls source/manifest and writes local private backups. It was **not** run and needs its own explicit restricted approval. `npm run release:preflight` is offline source inspection after generated staging files exist.

## 5. Release and review ledger

| Gate | Status on this PR |
| --- | --- |
| ADR source-only documentation | **PENDING PR/CI/REVIEW** |
| Product Owner adoption of A1/A2/B/C | **PENDING SEPARATE DECISION** |
| H0 inventory | **NOT AUTHORIZED / NOT_RUN** |
| New source, mapping or v3 session tests | **NOT_IMPLEMENTED** |
| Google staging/OAuth/direct-RPC proof | **NOT_RUN** |
| R01–R08 deployment blockers | **OPEN / HOLD** |
| `releaseDecision` | **HOLD** |
| `APPS_SCRIPT_DEPLOYMENT` | **HOLD** |
| Merge | **HOLD until explicit Product Owner approval** |

**Proposed next Human Gate:** after the docs PR is separately approved and merged, authorize *scoped H0 discovery only*, or revise the architecture recommendation. Do **not** begin identity migration or create Google Projects on the basis of this document.
