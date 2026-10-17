# D331 N1-C3-A — Revocable Grants ADR (OPTIONS / DECISION PENDING)

**Status:** PROPOSED, **NOT ACCEPTED** · **Issue:** #203 · **Base:** `main@735d9529047a5b8bf1e1f4f8114006216194e909`  
**Decision owner:** Product Owner + Security/Data Owner + DEV custodian + DDL authority; privacy/clinical sign-off where capabilities expose PHI. This ADR does not select storage, create a grant or authorize any implementation.

## Context

Existing Smart SRRT roles `Staff/Manager/Admin/Super Admin`, global `view/edit`, and `UserAccounts` free-text area are insufficient for D331 patient privileges. Only approved **per-user, revocable, scoped, expiring, independently verified** D331 grants may permit future operations; until an authoritative registry is approved and verified, the entire D331 grant set is **empty**, including for Super Admin. C2C-B readiness remains deny-only and cannot upgrade grants.

## Proposed grant assertions (requirements; not a storage schema)

- **Principal:** exact current server-validated `UserAccounts.userId` and active token/session; deny inactive, revoked, unknown or ambiguous user. Never accept `userId`/role from browser.
- **Capability:** explicitly approved fixed lower-case namespace, initially only design examples `dengue.case.read` / `dengue.case.write`; each new operation (export, geo, AI, analytics, bulk) requires distinct policy approval and should otherwise be absent.
- **Scope:** approved `allowedAreaIds` and optionally exact `allowedEventIds`; server must intersect both, not union. Exact unique active AreaMaster ID; event owner or explicitly authorized event scope; no wildcard `*`, implicit district grants or inferred area text.
- **Time:** immutable `grantId`, independent monotonic `revision`, `validFrom`, `expiresAt`, explicit `revoked` + revocation time/reason category; all require current server-side checking. Any missing/malformed/duplicate/unknown field or version → DENY.
- **Provenance:** approval actor and authority distinct from recipient; issuer cannot self-escalate. Proposed dual control or equivalent evidence policy is a decision to sign, **not assumed to exist**.
- **Audit:** record PHI-free grant lifecycle event type, bounded non-sensitive correlation and version, accountable actor evidence in restricted custody; avoid raw token, patient/event narratives, complete area roster or public URL.
- **Race:** readiness is not a capability. Actual read rechecks current session/grant/policy; future write rechecks under lock immediately before mutation, with durable idempotency and reconciliation for UNKNOWN outcomes. No claim of multi-sheet ACID transactions.
- **Deletion/rollback:** revocations must not be undone by a code rollback or stale backup. Define migration and revoke-forward recovery before choosing storage; cache invalidation latency must have an approved maximum.
- **Failure mode:** no working registry, stale snapshot, ambiguous grant, audit health failure, duplicate IDs or corrupt version → DENY and alert the authorized operator via PHI-free status (no fallback to role).

## Storage alternatives — NO SELECTION MADE

| Candidate | Benefit | Blocker / risk | Gate |
| --- | --- | --- | --- |
| A. New `D331AccessGrants` Spreadsheet tab in **existing DEV database** | Independent table and revocation trail | **Potential eighth D331 tab** beyond seven provisional domain tables; schema, ACL, atomicity and backup/lifecycle design need signed DDL | Security + DDL + owner + rollback |
| B. Extend existing `UserAccounts` with scoped columns | Co-located user identity | Modifies existing shared auth schema, increases risk of accidental role inheritance, mixed account/grant lifecycles | Security + DDL + full regression + migration |
| C. External policy/ACL service | Better separation and lifecycle in principle | Conflicts with goal of minimal integrated environment unless approved; adds service, credentials, dependencies, identity proof and operational failures | New architecture/security/provider approval |
| D. Script Properties with ACL JSON | No added table superficially | Unsuitable as default: size, mutation/fallback and audit/revocation complexity; risk of privilege leakage, not endorsed | Reject as implementation candidate absent new explicit risk exception |

**No selection** is a prerequisite for C3-A docs merge; selecting a candidate requires explicit named security/data/DDL approvers and proof of existing DEV ownership. A future Product Owner decision must record why every rejected alternative is unacceptable.

## Grant authorization truth table (hypothetical future)

| Account / grant / target | Read | Write |
| --- | --- | --- |
| Super Admin + no explicit current grant | DENY | DENY |
| Active staff + exact read grant + unique eligible Event/Area/policy | Only after full server-side validation | DENY absent independent write grant |
| Active user + write grant only | DENY absent read grant (do not infer) | Still HOLD until separate write, lock, revision, parent status, ledger gates |
| Revoked/expired/duplicate grant, wrong AreaID/EventID | DENY | DENY |
| Clinical disease policy absent, unauthorized/ambiguous row | DENY | DENY |
| Forged grant from browser or preview mock | DENY | DENY |
| User logs out after readiness | DENY on fresh request | DENY on fresh request |

**Capability hierarchy (read implied by write?) — UNDECIDED.** Until signed, **no implication**; exact capability match only. AllowedEventIds empty semantics and owner override must be chosen and tested so empty never accidentally broadens scope.

## Reviewer questions requiring signed answers

1. Which of A–D is authoritative and who can **issue, revoke, restore, and audit** grants?
2. What are allowed operation strings, grant revision rules, scope intersection and empty EventID/AreaID semantics?
3. Is authorizer separation required, and how does a privileged operator request their own rights without self-grant?
4. What invalidation latency and outage behavior are acceptable when revocation is recorded but caches are stale?
5. What exact ownership/ACL/schema/header/backups guarantee safe storage and rollback?
6. What minimum non-PHI audit metadata and retention apply; how are partial failures handled?
7. Does the registry require a new eighth table, or an explicitly approved alternative?
8. Who signs clinical eligibility, privacy/legal basis and Event/Area ambiguity resolution before any personal data?

**Decision:** PENDING. `D331_GRANT_REGISTRY=NOT_APPROVED`, `GRANTS=EMPTY`, `D331_G1A_ENABLED=false`, `DDL=HOLD`, `TEST_DEPLOY=HOLD`.
