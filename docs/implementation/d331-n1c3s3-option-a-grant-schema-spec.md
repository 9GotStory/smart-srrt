# D331 N1-C3-S3 — Option A Offline Grant Schema Specification (PROPOSED)

**Status:** Proposed, design-only, not approved physical DDL or usable grant authority. **Decision source:** Product Owner design selection in [Issue #213](https://github.com/9GotStory/smart-srrt/issues/213#issuecomment-6233400492); parent #203; DEV/TEST target #189. **Baseline for this documentation slice:** `main@1afe08292da60884f76b62fee2ff568fb1361845`, recheck GitHub before any merge. **No Production exists.** No Google or Apps Script access was used to write this design.

## 1. Decision scope and authority

Option A is **selected for DESIGN**: a dedicated `D331AccessGrants` tab inside the **same existing Smart SRRT Development/Testing Spreadsheet**. It is separate from `UserAccounts` and must never be treated as an extension of generic Staff/Manager/Admin/Super Admin roles. The seven separately proposed D331 domain tabs (Cases, Plans, ControlActions, Entomology, Containers, Followups, RequestLedger) remain unmodified; `D331AccessGrants` would be a **distinct eighth provisional D331 tab** if physical DDL is later authorized.

**Not approved:** physical sheet creation, exact ordered header adoption, Script/Sheet binding read, ACL adjustments, grant issuance or revocation, schema apply/migration, PHI, authenticated RPC, Live status, Event read/write, Native26 manifest edit, Deploy or `D331_G1A_ENABLED` toggle. This document is a candidate for accountable Security/Data/DDL review, **not** a signed access-control model.

Existing `UserAccounts` has raw `UserID` as its first header, whereas offline D331 functions refer to internal `userId`. The future exact join, allowable encoding, uniqueness and inactive-user rules must be verified and approved by the Data/Auth owners. No principal may be inferred from a name, role, free-text area, client-supplied object or browser state.

## 2. Logical grant granularity — deliberately conservative

**Candidate invariant:** one immutable GrantID for one `UserID × Capability × AreaID × EventID` tuple. Each grant has an exact nonempty `AreaID` **AND** an exact nonempty `EventID` UUID. These scopes are an **intersection**, never a union or wildcard. A user wishing to access more than one event requires independently approved grants, unless a future alternative explicit policy is separately signed.

- No `*`, empty scope, owner-only fallback, user-area text conversion, Admin bypass, prefix match, disease synonym inference or `read`-from-`write` inheritance.
- A GrantID may occur **once across all rows**, including revoked history. Duplicate IDs or simultaneously active matching tuples fail closed and require custodian reconciliation without any privilege being implied.
- Proposal intentionally rejects area-wide automatic access. If authorized operations later demand broader scope, request a new Security/Clinical/Data Human Gate **before** changing the model.
- `ACTIVE` merely means a candidate grant row passes *its own* fields; it **never** proves current UserAccounts session, eligibility policy, Event ownership, raw MainData headers, AreaMaster Active, legal/privacy basis or safe server origin.
- A Spreadsheet editor with direct access may bypass application-level checks. The Sheet is **not** a row-level security boundary. A future trusted server must reauthorize every sensitive operation and enforce independently approved document ACLs.

## 3. Proposed physical header ordering (22 columns; NOT approved)

The following v1 header order is **for offline review/test specification only**; naming, field types, number of columns, nullable behavior and privacy classification require signed review before any creation.

| # | Proposed header | Logical meaning and conservative rule |
| --- | --- | --- |
| 1 | `SchemaVersion` | Integer `1` for this *candidate* shape; reject unknown version rather than silently coercing |
| 2 | `GrantID` | Immutable unique opaque grant identifier; never use a user ID or patient identifier as the grant key |
| 3 | `UserID` | Exact approved reference to existing `UserAccounts.UserID`; cannot be supplied as trusted identity by browser |
| 4 | `Capability` | Single exact capability; examples `dengue.case.read` and `dengue.case.write` remain **provisional**, no wildcards |
| 5 | `AreaID` | Exact approved unique active `AreaMaster.AreaID`; blank/wildcard/ambiguous denied |
| 6 | `EventID` | Exactly one canonical UUID with one matching active MainData row; no empty or wildcard |
| 7 | `State` | One of `PENDING`, `ACTIVE`, `REVOKED`; no stored `EXPIRED` that could later become ACTIVE |
| 8 | `ValidFromUTC` | Explicit UTC lower bound; server clock must be ≥ this value |
| 9 | `ExpiresAtUTC` | Explicit UTC exclusive upper bound; server clock must be < this value |
| 10 | `GrantRevision` | Positive monotonic integer for this grant; stale revisions denied |
| 11 | `PolicyRevision` | Approved policy revision reference; absence/drift denied |
| 12 | `RequestedByUserID` | Accountable initiating actor, not automatically authorizer |
| 13 | `RequestedAtUTC` | Creation/request timestamp; preserve immutable request provenance |
| 14 | `ApprovedByUserID` | Independent approved authorizer, not the recipient; unresolved if same person as issuer is permissible |
| 15 | `ApprovedAtUTC` | Authorized transition timestamp; required for ACTIVE |
| 16 | `IssuedByUserID` | Accountable actor for activation; no client-controlled issuance |
| 17 | `IssuedAtUTC` | Time the grant became ACTIVE; set once |
| 18 | `UpdatedAtUTC` | Last controlled transition time, monotonic under approved policy |
| 19 | `RevokedByUserID` | Independent accountable revocation actor; required for REVOKED |
| 20 | `RevokedAtUTC` | Terminal revocation time; required for REVOKED |
| 21 | `RevocationReasonCode` | Bounded non-PHI reason enum to be approved; never narrative patient details |
| 22 | `MutationID` | Unique idempotency/reconciliation reference; durability + global uniqueness design still pending |

**Physical invariants to sign before use:** exact UTF-8 header names/order; allowlist for `Capability` and `RevocationReasonCode`; raw `UserID`/`AreaID` encoding and allowable characters; exact UUID case policy; UTC timestamp parsing and maximum duration; consistency of blank fields at PENDING vs ACTIVE vs REVOKED; uniqueness, duplicate-tuple policy and version bounds; treatment of imported legacy values; minimum spreadsheet editor privileges. No assumptions that a Spreadsheet has foreign keys, isolation levels, compare-and-swap or multi-sheet ACID semantics.

### Candidate record validation (for future OFFLINE tests only)

- Reject missing, unexpected, reordered or duplicate column names and incorrect column count. Reject unknown schema version, wrong scalar type, `NaN`, numeric coercion, blank ID, duplicate GrantID and ambiguous/cyclic data.
- Parse UTC instants only in an exact owner-signed canonical representation (proposed `YYYY-MM-DDTHH:mm:ss.sssZ`); no locale coercion. `ValidFromUTC < ExpiresAtUTC`; expired, future-not-yet-valid and untrusted server clock **DENY**.
- `PENDING` must never authorize; `ACTIVE` needs nonempty independently approved actor provenance, supported policy revision and no revocation; `REVOKED` is terminal even when a restored/duplicated row still shows ACTIVE.
- An exact `EventID`, current active/unique `AreaID`, clinically signed disease code, strict MainData 39 header order, `OwnerUserID`, record status/revision, grant capability and nonrevoked current user session must **all** pass at the separate future request boundary.
- Missing grant, conflicting or duplicate grant rows, unverified owner, unknown backend outcome or stale snapshot result in **DENY**, not fallback to generic `view/edit` or an administrator role.
- No real credentials, Script/Deployment/Spreadsheet IDs, PHI, username or ACL values belong in GitHub tests, logs or fixtures.

## 4. Status projections, no permission promotion

| Grant state or fault | Grant row interpretation | Real private operations TODAY |
| --- | --- | --- |
| ABSENT or PENDING | No issued right | DENY |
| ACTIVE but missing approved policy/session/Area/Event/Clinical/Privacy authority | Not enough evidence | DENY |
| ACTIVE, expired/not-yet-valid | Invalid at operation time | DENY |
| REVOKED or tombstoned | Permanently superseded for this GrantID | DENY |
| Duplicate grant, missing issuer/approver, stale revision, restored state inconsistent with high-water authority | Ambiguous or compromised | DENY |
| Any synthetic C3-B `SIMULATED_ALLOW` or client S2 `OFF/POLICY_HOLD/ERROR` envelope | Test/display artifacts only | DENY |

Even a future signed ACTIVE row would not open D331 until *all* independent Security/Data/Clinical/Privacy, DDL, #189 DEV binding, Live RPC, Event access and release gates have separately passed.

## 5. Derived artifacts and traceability

- [Revocation, Recovery, Security and DDL Gate Specification](./d331-n1c3s3-option-a-revocation-security-gates.md) carries the state machine, stale-backup threat, monotonic anchor choices, safe migration and negative test matrix.
- [N1-C3-S3 Issue #213](https://github.com/9GotStory/smart-srrt/issues/213) is the primary owner-selection and planning record; [grant ADR](./d331-n1c3a-revocable-grants-adr.md) and [C3-C0 approval matrix](./d331-n1c3c0-grant-decision-and-approval-matrix.md) remain historical source artifacts. Their pre-selection A/B/C/D undecided status is superseded **only for the choice of design option**; all risk/owner signoffs remain in force.
- Unregistered synthetic C3-B evaluator (`src/dengue/05-n1c3b-offline-revocation-contract.gs`), S2 denial composer (`src/dengue/06-n1c3s2-deny-only-readiness-envelope.gs`), C2C-B status client and tests **are not changed by this docs-only slice**.
- No Production. The original DEV/Testing identifiers stay in restricted #189 and **must not be requested again**. Its actual live binding attestation is still a narrow HOLD for real integration, not a blocker for this offline document.

## 6. Human Gate summary

**G-SPEC:** this document may be reviewed and source-merged only after exact-SHA PR scope + contract CI and **separate Product Owner Merge approval**; docs merge is *not* DDL authorization.

**G-SECURITY/DATA/PRIVACY/CLINICAL:** approve actual issuer/approver, grant lifetime, exact user/area/event/capability semantics, disease and PHI controls, revoke-forward durability, recovery and audit.

**G-TARGET/DDL:** verify already-known existing DEV binding #189 without unsafe `getDb_()` fallback, then separate physical eighth-tab DDL, backup/rollback + recovery drill and direct-editor ACL decision.

**G-RUNTIME:** independent server identity and policy/grant authority, then distinct status RPC, Event read, Event write/ledger and deployment approvals. All remain **HOLD**. `D331_G1A_ENABLED=false`.
