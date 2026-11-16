# D331 N1-C3-C0 — Revocable Grants Decision & Approval Matrix (UNDECIDED)

**Issue:** #207 · **Parent:** #203 · **Approved planning baseline:** `main@076b924d27090c491476a50d47c9b1f0a921b241`  
**Document type:** proposed decision package, not an accepted Architecture Decision Record. **All live grant/policy/DDL/security/clinical/privacy decisions remain unsigned/HOLD.** No grant is issued or stored, and there is no Production installation.

## 1. Scope, dependencies and source-of-authority rule

- C3-A [Revocable Grants ADR](./d331-n1c3a-revocable-grants-adr.md) lists A/B/C/D options but selects **none**. C3-B [Offline Contract](./d331-n1c3b-offline-revocation-contract.md) models in-memory revocation; `SIMULATED_ALLOW` proves only a synthetic path and **is not a real grant**.
- Actual existing DEV binding and owner/ACL evidence is the responsibility of **#187/#189**, **not this issue**; real Cloud read-only checks require a separate explicit approval. [DEV Evidence Gates](./d331-n1c3c0-dev-binding-evidence-gates.md) defines conditions, not an attestation.
- The existing standard roles (Staff, Manager, Admin, Super Admin) and global view/edit do **not** imply D331 privileges. Browser claims, human-entered area descriptions and a readiness status must never issue rights.
- Current clinical allowlist is **empty**, grant registry is **absent**, storage choice **not made**, privacy/data policy **not signed**, and `D331_G1A_ENABLED=false`. Operational access remains **DENY** regardless of a test or CI result.

## 2. Options for authoritative grant backing — NO CHOICE MADE

| Candidate from C3-A ADR | Possible benefits | Risk and tradeoff requiring assessment | Approval requirements | Current disposition |
| --- | --- | --- | --- | --- |
| **A. Separate `D331AccessGrants` tab** in the existing DEV Spreadsheet | Separate versioned grant identity, auditable issuance/revocation, fewer changes to existing auth rows | Potential **eighth** D331 physical table vs **seven** provisional domain tables; sheet ACLs, racing reads/revokes, backup/restore, lock/monotonic tombstones, schema version and safe migration | Security + Data Owner + Product Owner + DDL + DEV custodian; physical schema and rollback separately | **UNDECIDED / DDL HOLD** |
| **B. Extend `UserAccounts`** | Identity and grant close together | Changes shared login/auth schema; mixed credential/grant lifecycle; accidental role inheritance; migration and regression burden; revocation and audit versioning | Security + DDL + auth owner + Product Owner; separate migration and tests | **UNDECIDED / DDL HOLD** |
| **C. Independent policy/ACL service** | Policy isolation, potential stronger audit/revocation | Extra service/provider not in approved native architecture; credential, availability, attestation, new storage and operational costs; requires explicit architecture deviation | Product Owner + Security + operations + privacy + architecture, then exact provider approval | **NOT AUTHORIZED** |
| **D. Script Properties ACL JSON** | Avoids creating a tab superficially | Size, mutability, audit and revocation risks; known `getDb_` Script Property fallback hazard; not an appropriate default source of authority | Requires exceptional security/architecture risk acceptance; no exemption signed | **NOT SELECTED / NOT ENDORSED** |

The outcome may only be recorded **after** named decision-makers review alternatives, security lifecycle, actual DEV binding, DDL impact, backup/rollback and ownership. A recommendation in a design document is **not** selection, nor does selection itself authorize schema apply or a live grant.

## 3. Proposed grant model — requirements awaiting signature

| Property / invariant | Proposed strict safe rule | Decision owner | Default |
| --- | --- | --- | --- |
| Issuer and approver | Identifiable authority, separate from recipient; prevent self-grant and unreviewed role escalation; choose dual-control/equivalent approval | Product Owner + Security | No issuer; no grants |
| Principal | Exact currently active server-side UserAccounts ID + current revoked-session check; no browser-supplied identity as authority | Security + auth owner | DENY |
| Capabilities | Closed namespace, e.g. `dengue.case.read` and `dengue.case.write` as **examples only**; no wildcards or generic view/edit; read does not follow automatically from write | Security + clinical owner | Empty |
| Area scope | Exact unique active AreaID, boolean Active, preserving leading-zero village codes and exact header sources | Data Owner | Empty |
| Event scope and owner | Exact EventID with unique MainData record, explicit bounded allowedEventIds, owner/event eligibility; define empty list semantics. Conservative future default: empty EventID list grants **nothing** | Security + Data Owner | Empty |
| Scope composition | Require **intersection** of capability, AreaID and EventID plus owner/explicit Event scope; never union fallback/unknown location | Security | DENY |
| Grant issuance | Unique grantId, accountable approver, exact principal, policy revision, validFrom/expiresAt, monotonic version, issued/revoked actor and reason code | Security + operations | No grants |
| Expiration / revocation | Read current version on every sensitive request; revocation/tombstone never undone by stale restored backup; define maximal invalidation latency and outage-deny policy | Security + operations | DENY |
| Audit | PHI-free category and bounded non-sensitive correlation; separately approved access/retention and handling when audit storage is unavailable | Privacy + Security | No live logging or rights |
| Exceptional access | No admin/Super Admin override by default, emergency workflow only after a separately signed policy and audit design | Product Owner + clinical/privacy | DENY |
| Writes | Lock-bound recheck of current parent status, Revision, grant, policy and RequestLedger; UNKNOWN reconciliation; no claim of multi-sheet ACID | Backend owner + operations + Security | WRITE HOLD |
| Error response | Fixed generic code, no patient/area/grant/user/token/source IDs, no rights information leak | Privacy + Security | Generic DENY |

### Approval record required before changing any status

For **each** decision ID: include exact versioned decision, permitted operations/area semantics, accountable authority (not invented), alternatives/reasons, issue reference, effective time/expiry, evidence custodian and private evidence hash or restricted pointer, dependency SHA, rollback/revoke-forward plan, tested failure modes and signed acceptance status. GitHub should contain only a sanitized decision status and link to an access-controlled evidence custodian when permitted, **not raw IDs, owner ACL details, employee identity, credentials or PHI**.

## 4. Existing B2 and C3 Human Decision crosswalk

| Decision ID(s) | Needed answer/evidence | Proposed responsible role | Current state / cannot infer |
| --- | --- | --- | --- |
| **B2-D01** | Exact versioned Dengue labels/codes, synonyms, exclusions, effective date in MainData col 6 | Epidemiology / clinical reviewer | **CLINICAL HOLD**; empty allowlist |
| **B2-D02–D03, B2-D07** | Grant storage, approved revoker/issuer, lifecycle, possible eighth table and DDL | Security + Product Owner + DDL | **SECURITY / DDL HOLD**; none selected |
| **B2-D04–D05** | AreaID/leading-zero normalization, owner/Revision/status/legacy rows and migration policy | Data Owner + migration owner | **DATA HOLD**; no coercion/backfill |
| **B2-D06, B2-D10** | Real existing DEV Script/Deployment/Spreadsheet property and owner/ACL read-only evidence | DEV custodian + Product Owner under **#189** | **DEV BINDING HOLD**; never duplicate Cloud checks |
| **B2-D08** | Legal basis/consent handling, minimization, retention, export, geo, attachment and AI/Gemini transfer | Privacy + clinical owner | **PRIVACY HOLD**; no PHI/read/export/AI |
| **B2-D09** | Scope of earlier synthetic injected mock permission | Product Owner | Source-only precedent **does not** grant live execution |
| **C3-D01–D02** | Authenticated, server-issued status-only readiness, target/session provenance and denial | Product Owner + Security + DEV custodian | **LIVE RPC HOLD** |
| **C3-D03–D04** | Backing option A/B/C/D, operation vocabulary, AreaID/EventID scope and inheritance | Product Owner + Security + Data + DDL | **GRANTS/DDL HOLD** |
| **C3-D05–D07** | Expiry/replay/revocation races, private evidence, PHI-free errors/audit | Security + DEV custodian + Privacy | **SECURITY/PRIVACY HOLD** |
| **C3-D08–D10** | UX enablement policy, rollback/UNKNOWN write safety, exact-SHA release target and UAT | Product Owner + clinical + operations | **RUNTIME/TEST/WRITE HOLD** |
| **G1-B0 D01–D15** | Obtain the **canonical source titles** and verified owner decisions from #171 before associating specific IDs | Product Owner + G1 design owner | **UNMAPPED / HOLD**; no invented mapping |

No cell in this matrix is a signed approval. #189 and Parent #203 should remain OPEN; C3-C0 docs merge (if later authorized) does not resolve them.

## 5. Approver and dependency map — separate stages

| Gate | Owner(s) who must explicitly authorize it | Evidence and conditions | Current permission |
| --- | --- | --- | --- |
| **C3-C0 Docs-only** | Product Owner (source authoring and, **separately**, PR Merge) + ChatGPT Independent Reviewer | Exactly **two new Markdown files**, exact SHA/base, Git Tree, CI; no code or API | Only Docs-only implementation approved; **Merge pending separate gate** |
| **C3-C1 real target metadata** | #189 Product Owner + accountable DEV custodian, independent reviewer | Exact private target/method read-only allowlist, no mutation, current owner/ACL/property/headers, redacted result; separate scope sign-off | **HOLD** |
| **C3-C2 policy sign-offs / registry design** | Security + Data Owner + Product Owner + DDL + clinical/privacy where relevant | Approved A/B/C/D record, version/issuer/revoker and clinical/AreaID/privacy decisions; no self-grant | **HOLD** |
| **DDL/storage implementation** | Product Owner + DDL/migration owner + security/operations | Exact schema, potential eighth tab, audited backup/recovery/rollback and isolated target; distinct change authorization | **HOLD** |
| **C3-C3 status-only Live RPC** | Product Owner + Security + clinical/privacy as applicable | Proven server-owned binding and current revocable grant/policy, fixed minimal envelope, auth/current-session checks, deny-only until separately approved; no Event read | **HOLD** |
| **Event read** | Separate Product Owner, Security, clinical/privacy and data owner gates | Strict 39/10 source headers, eligible disease, current grant, unique active Area/Event, minimized DTO and real negative tests | **HOLD** |
| **Event write / grant mutation** | Separate Product Owner, security, DDL and operations gate | Lock + Revision/Idempotency ledger, revocation freshness, partial-failure reconciliation and backup | **HOLD** |
| **DEV/TEST Release & UAT** | Product Owner + target custodian + release owner | Exact SHA, stage/manifest, identity, backup/rollback, scoped operator UAT and separate deployment approval | **HOLD** |

## 6. Proposed negative-decision checklist (planning, not executed tests)

1. Forged browser `userId`, grant, `allowedAreaIds`, `allowedEventIds`, role or `origin:'server'` **must not** establish rights.
2. Missing, expired, duplicate, superseded or revoked grant; denied area/event; unknown operation; source policy revision disagreement → **DENY**.
3. Ambiguous owner, AreaMaster duplicate or non-boolean Active, leading-zero coercion, MainData duplicate EventID or missing 39th OwnerUserID → **DENY**.
4. A prior readiness response, synthetic `SIMULATED_ALLOW` or stale session cache does not bypass per-operation checks.
5. Grant revoked between readiness and Event access (or restored stale backup resurrects old grant) → **DENY**, not cached ALLOW.
6. Clinical labels not approved or privacy basis/retention/export/AI unknown → **DENY**, no PHI access.
7. Missing Cloud binding, side-effect-free reader, grant backing, audit custody or DDL owner → **STOP**, no auto-repair or silent eighth sheet.
8. Write races, stale Revision and ambiguous ledger outcome → **WRITE HOLD**, no blind retry.

These are future policy/test acceptance requirements; they are **not** evidence of Cloud, clinical or runtime test execution.

## 7. C3-C0 sign-off and delivery status

**Authorized now:** write only this Markdown file and [DEV Binding Evidence Gates](./d331-n1c3c0-dev-binding-evidence-gates.md), create an isolated branch and Draft PR, verify Base/HEAD/Git Tree/CI and complete a ChatGPT Independent Review.

**Not authorized:** PR Merge (separate Product Owner decision), API/Google/Apps Script/clasp calls, grants creation/revocation, `UserAccounts` edits, patient/metadata reads, Script Property changes, DDL apply, Live RPC, Native Manifest changes, DEV/TEST Deploy or enabling `D331_G1A_ENABLED`. No Production exists.

**Current:** `GRANT_BACKING=UNDECIDED`; `GRANT_ISSUER=NOT_APPROVED`; `GRANTS=EMPTY`; `CLINICAL=HOLD`; `PRIVACY=HOLD`; `DEV_BINDING=NOT_ATTESTED`; `DDL=HOLD`; `LIVE_RPC=OFF`; `DEPLOY=NOT_AUTHORIZED`; `D331_G1A_ENABLED=false`. #189 and #203 remain OPEN.
