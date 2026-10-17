# D331 N1-C3-A — Security, Clinical and Operational Decision Register

**Scope:** Issue #203 docs-only · **Base:** `main@735d9529047a5b8bf1e1f4f8114006216194e909`.  
**This is an inventory / proposed decision framework, NOT signatures.** Every unverified entry remains **HOLD**. Source-only prior merges do not endorse any clinical, grant, DDL or Cloud target decision. Evidence and owner names are intentionally not invented.

## Existing authoritative crosswalk: B2-D01–D10 (#183)

| Legacy ID | Decision still requiring named authority | Proposed responsible role | Current evidence/answer | Gate |
| --- | --- | --- | --- | --- |
| B2-D01 | Exact Dengue diagnosis labels/codes, synonyms, exclusions, version and effective dates (MainData col6) | Epidemiology / clinical approver | No signed eligible set; empty allowlist | CLINICAL HOLD |
| B2-D02 | Authoritative per-user grant registry, grant issuer, revoker and lifecycle | Security + Product Owner | No backing selected; no grants | SECURITY HOLD |
| B2-D03 | New `D331AccessGrants` tab vs alternate backing; seven provisional D331 tabs impact | DDL owner + Product Owner | Eighth table **not** approved | DDL HOLD |
| B2-D04 | Exact `AreaID`, village code / leading-zero preservation, active boolean and uniqueness | Data Owner | No signed canonicalization; exact/deny only | DATA HOLD |
| B2-D05 | Legacy owner, village code, Revision and void/closed row semantics | Data/Migration Owner | Unknown/blank denied, no backfill | MIGRATION HOLD |
| B2-D06 | Verified **existing DEV** Script–Deployment–Spreadsheet ID/ACL/property and non-Production classification | DEV custodian + Product Owner | #187/#189 remain actual binding HOLD; no Google read performed here | DEV BINDING HOLD |
| B2-D07 | Per-user operation privileges, allowed Area/Event, issue/expiry/revoke/audit | Security approver | No signed grant policy or inheritance | SECURITY HOLD |
| B2-D08 | Legal basis/consent, data minimization, retention, export, geolocation and Gemini/AI | Privacy + clinical owner | No PHI transfer or export permission | PRIVACY HOLD |
| B2-D09 | Permitted synthetic injected B2-B source-only simulations | Product Owner | Earlier source-only mock merged; **no** runtime/trusted-origin approval from that | MOCK-ONLY DONE; LIVE HOLD |
| B2-D10 | Exact read-only metadata fields, observer, owner custody and non-mutating API access | Product Owner + DEV custodian | Offline tool exists; **real Cloud access not authorized** | CLOUD READ HOLD |

## G1-B0 decision families (#171, #168, #169)

Issue #171 says **D01–D15 remain open**, but its available description does **not** publish a canonical title-to-number mapping. **Do not invent one.** An accountable owner must link the original register and map D01–D15 verbatim before marking any item signed.

| Crosswalk subject from #171 | Intended accountable approver | Missing decision / future evidence | Gate |
| --- | --- | --- | --- |
| Domain: EventID → cases/plans/control/entomology/containers/followups | Product Owner + clinical/data owner | Physical ordered headers, FK identity, child revision, lifecycle; proposed **7 tabs** only | DESIGN / DDL HOLD |
| Permission and PHI matrix | Security + privacy | Per-field read/write/export/geo decisions and legal basis | SECURITY / PRIVACY HOLD |
| Request ledger / idempotency | Backend + Security | RequestID/principal/operation/digest, lock, UNKNOWN reconciliation; no multi-sheet ACID assumption | WRITE HOLD |
| Migration and rollback | DEV operator + DDL owner | exact-target preflight, backup, additive migration, restore drill | CLOUD / DDL HOLD |
| Audit safety | Privacy + operations | redact PHI, audit failure policy, retention and custodian | PRIVACY HOLD |
| Clinical 3-3-1 policy | Public-health/epidemiology | Day0, timing anchors, late cases, 100m/200m, survey KPIs, versioning | CLINICAL HOLD |
| Parent status, Event ownership and closed/void lifecycle | Data Owner + Security | 39-column raw MainData, exact EventID, status/revision and owner | DATA HOLD |
| Source release and TEST gate | Product Owner + operations | 26-file parity, explicit approved SHA, rollback, non-production proof | RELEASE HOLD |

**G1 D01–D15 crosswalk status:** `CANONICAL_ID_TITLES=NOT_VERIFIED`; `OWNER_SIGNOFF=NONE_RECORDED`. The headings above are documented topic families, **not** asserted numbering or approvals. Record accepted/denied/waived with evidence only after owner review.

## New C3 decisions that must not be silently resolved

| ID | Question | Options/default | Approver | State |
| --- | --- | --- | --- | --- |
| C3-D01 | Status-only live RPC admissible before patient DTO? | Current **no live RPC**; proposed future authenticated deny-only status | Product Owner + Security | HOLD |
| C3-D02 | How to authenticate issuer and prevent forged client claims? | Pinned DEV target + verified current server session/grants; no client signature shortcut | Security + DEV custodian | HOLD |
| C3-D03 | Grant storage (ADR A/B/C/D), schema owner and backup | None selected; no grant | Product Owner + Security + DDL | HOLD |
| C3-D04 | Exact operation namespace, inheritance and scope-intersection rules | No inheritance, exact-match + deny; vocabulary not signed | Security + clinical owner | HOLD |
| C3-D05 | Token and grant invalidation, TTL, replay, policy mismatch and cache | Reauthorize each sensitive request; no trusted cache | Security + operations | HOLD |
| C3-D06 | Evidence/attestation chain for #187/#189 actual DEV metadata | Private custodian evidence, no Google API yet | DEV custodian + Product Owner | HOLD |
| C3-D07 | Redaction and audit safety under failure | Generic PHI-free deny; no rows/token in logs | Privacy + Security | HOLD |
| C3-D08 | D331 UX access and status progression | Five pages only, feature OFF, no D331 action enabled | Product Owner + Clinical + Security | HOLD |
| C3-D09 | Operational recovery: revoke-forward restore / UNKNOWN writes | No write; require version/lock/ledger approval | Operations + Security + DDL | HOLD |
| C3-D10 | Test, rollout and rollback release gates | CI source-only ≠ target/release permission; separate TEST authorization | Product Owner + operations | HOLD |

## Human-signature evidence record (blank until genuinely approved)

For each decision, future *restricted* custody records must contain: stable ID; exact version; decision text and alternatives; approver role/authority; effective date/expiry; system/policy revision; evidence hash or private custodian pointer; test coverage; rollback requirements; exceptions/revocation; explicit gate status. GitHub stores **only non-sensitive status and redacted evidence IDs**; no token, raw script/deployment/spreadsheet ID, operator email, PHI or ACL list. Approval records cannot be replaced by CI status, assistant recommendations or the mere existence of this register.

## Gate dependency order (not authorization)

1. C3-A design review and **separate Product Owner docs-only Merge gate**.
2. Named owner decisions / signatures for target, disease, grants, AreaID and privacy. Unresolved = HOLD.
3. Later separately approved C3-B unregistered **pure offline** evaluator (no I/O).
4. Separately approved #189 **real read-only identity** attestation, without unsafe `getDb_`/fallback or patient rows.
5. Independently approved DDL/grant backing with backup/rollback, then authenticated server status-only RPC, then a different sensitive Event read gate, then a different write gate with lock/ledger, then TEST deploy/UAT gate.

**STOP:** C3-A has no source, Schema, Google, data, TEST or runtime approval. `D331_G1A_ENABLED=false`, `LIVE_RPC=OFF`, `CLINICAL=HOLD`, `GRANTS=HOLD`, `PRIVACY=HOLD`, `DDL=HOLD`.
