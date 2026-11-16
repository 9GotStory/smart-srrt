# D331 N1-C3-S3 — Option A Offline Revocation, Recovery and Security/DDL Gates

**Status:** Proposed design and acceptance specification ONLY. See [proposed 22-column Option A grant table](./d331-n1c3s3-option-a-grant-schema-spec.md). **Source decision:** [Issue #213](https://github.com/9GotStory/smart-srrt/issues/213) Product Owner selected Option A solely as a *design baseline* for the existing Smart SRRT Development/Testing Spreadsheet. Parent #203, existing DEV evidence #189 remain OPEN. No Production exists.

## 1. Non-negotiable security boundary

- A Spreadsheet tab is storage, **not** a trusted issuer or per-row permission system. Future D331 access requires a separately approved server-owned active principal, authenticated session/revocation check, approved grant registry, current security-policy revision, unique matching Area/Event, signed clinical eligibility and privacy/data authority **per operation**.
- The client/offline UI is **not** an authorization source. S1's `SIMULATED_ALLOW` is an unregistered mock; S2's `OFF/POLICY_HOLD/ERROR` is a display denial. Neither may issue/restore grants, change action availability, produce a patient DTO or authorize actual Event operations.
- Legacy `Admin`/`Super Admin` and global `view/edit` do not automatically issue or inherit `dengue.case.*` rights. A single grant atom covers one specific `UserID + Capability + AreaID + EventID` only; exact Area **AND** Event intersection.
- Feature is OFF: `D331_G1A_ENABLED=false`. Even a logically valid grant row is not a runtime permission in current Development/Testing. No live Apps Script entrypoint, Script/Sheet read, Google API, DDL, grant mutation, schema creation, browser route or deployment is authorized here.
- The Option A tab would be the **eighth proposed D331 tab** in the *existing* DEV/Testing DB, in addition to seven previously planned domain tabs. No eighth tab currently confirmed, created, or authorized. The source/documentation does not read the live DB.

## 2. Proposed grant state machine — **NOT IMPLEMENTED**

`ABSENT → PENDING → ACTIVE → REVOKED` is a **candidate** lifecycle only; final state rules, capabilities, actors, time windows and source-of-authority must be signed first. The same immutable `GrantID` cannot be reactivated after terminal revocation. An expired ACTIVE grant is *derived ineligible at read time*; expiration is not an editable stored state.

| Transition / condition | Proposed guard | Candidate result | Failure result |
| --- | --- | --- | --- |
| ABSENT → PENDING | New unique GrantID + tuple; approved requester/actor; bounded timestamp; no accidental duplication | PENDING, no access | Reject/no row |
| PENDING → ACTIVE | Independent non-self approver, current verified issuer, signed capability/Area/Event policy, nonexpired window, expected GrantRevision, durable mutation receipt, audit health | ACTIVE but still not a live right without every per-operation check | No elevation; fail closed/UNKNOWN reconciliation |
| ACTIVE → REVOKED | Authorized revoker, monotonic revision, durable terminal tombstone, revoke-forward anchor and audit evidence | REVOKED forever for that GrantID; new issuance requires a new ID/approval | **No safe allow**; deny grant until recovered |
| PENDING → REVOKED | Cancel request or terminally reject, traceable actor and reason | REVOKED, never ACTIVE | Deny |
| REVOKED → ACTIVE/PENDING | Forbidden (even after rollback/restore) | No transition | Reject and alert PHI-free incident category |
| ACTIVE + now before ValidFrom / at or after ExpiresAt | Trusted server time, strict exclusive expiry | Derived DENY, do not mutate row simply to hide expiry | Deny |
| ACTIVE + session/policy/Area/Event/clinical/privacy/audit/target outage | Current required authority unavailable/stale/inconsistent | Derived DENY | No fallback or cached ALLOW |

**Separation of duties:** recipient cannot be their own issuer/approver; no user can rely solely on a role to elevate their scope. Whether `IssuedByUserID` and `ApprovedByUserID` may coincide is an **explicit Security decision**, not silently permitted. The role names shown in repository bootstrap are not proof of authority for a D331 grant lifecycle.

**Reissue rule:** a revoked grant is never edited back into an active grant. A completely new GrantID, new independent review, fresh currently approved policy and exact scope are required. Any future proposed ability to partially reduce privileges or transfer ownership must be separately designed and signed.

## 3. Revocation race and current-read protocol — requirements, not callable code

A future operation must validate the original configured DEV binding and an authoritative active session **without** fallback/mutation, then prove current grant and revocation state at the trust boundary. A possible future sequence, *only after all owner approvals*:

`REQUEST → [feature switch] → [pinned identity and guarded source] → [server-current session] → [current policy + clinical + privacy authority] → [revoke-forward anchor available] → [unique grant + tombstone + revision] → [unique active AreaID and EventID, strict MainData 39 columns] → [exact capability/scope] → [deny or minimal authorized action]`

- **Every sensitive read:** independently re-evaluate current grant revision, current policy revision, expiry, session status and revoke-forward evidence. A prior readiness envelope, cached allowance or old controller epoch is never a bearer permit.
- **Every write or grant transition:** separately approved lock protocol and expected revision check, durable idempotency marker and reconciliation for UNKNOWN partial results. The existing `RequestLedger` is only a *provisional separate domain tab*, and must not be silently assumed to be a grant ledger or an atomic cross-sheet transaction.
- **Concurrent revoke vs read:** lock order, atomic-read semantics and acceptance tests must ensure reads cannot be authorized from a snapshot invalidated by a committed revoke. If the guarantee cannot be established with Sheets + Apps Script execution locks + direct editor limitations, **DENY** and redesign.
- **Duplication:** two active rows for a GrantID or a tuple, or disagreement between revoked status and high-water authority, causes DENY; do not union permissions or pick the first row.
- **Audit health:** design an allow/deny-relevant PHI-free outcome and failure policy. A best-effort generic `AuditLogs` append is **not** proof that a security-sensitive revocation committed. If required audit durability cannot be proven, fail closed.
- **Error handling:** no tokens, patient names, grant list, Site IDs, spreadsheet IDs or underlying exception text in user-facing errors or issue logs. Security event evidence belongs with an access-controlled custodian under separately approved retention.

## 4. Stale-backup resurrection — hard STOP until solved

**Critical threat:** If `D331AccessGrants` (or an entire Spreadsheet) is restored from a pre-revocation snapshot, an old `ACTIVE` row can reappear. A `RevokedAtUTC` field **within that same restored snapshot is insufficient** to prevent the former permission from returning.

### Candidate countermeasures requiring a separate owner decision

| Candidate | Benefit | Risk / owner signoff |
| --- | --- | --- |
| R1 — Independent append-only revocation/tombstone anchor outside the rollback domain | Can prove which GrantID/revision was revoked even when the grant sheet is restored | New trust/custody/availability/access-control and backup lifecycle; architecture may need separate approval, never implicitly add a new service |
| R2 — Independent monotonic high-water grant/policy epoch, durable across all restores | Rejects restored snapshots with a lower epoch | Must prove **independent** durable source, no overwrite of high-water, rollback-fencing, grant identity binding, and check on every sensitive operation |
| R3 — Controlled restore quarantine with externally preserved signed revocation manifest | Can reconcile restored data while keeping access OFF | Requires independent trusted evidence, human release gate and complete grant re-validation; no availability until verified |
| R4 — Only same-sheet tombstones or same-snapshot backups | Simplest | **REJECT for safe activation**: rollback restores stale ACTIVE and erased tombstones together |

**Required invariant:** `currentGrantRevision ≤ trustedHighWater` is NOT sufficient by itself, because equal/older snapshots may lack a subsequent revoke. The check must prove **no known terminal revocation is missing**, e.g. independently anchored tombstone membership or trusted exact version/epoch binding and complete custody. The exact algorithm, hash/signature scheme, recovery proof and continuity during a network outage are **UNDECIDED**.

**Recovery default:** on restore, evidence loss, epoch regression, signature mismatch, missing independent anchor, ambiguous grant state, audit outage or interrupted write, quarantine every D331 grant and set authorization to DENY until accountable owner approves a documented safe reconciliation. Do not auto-repair, backfill or reactivate a restored grant; do not assume a backup file is authoritative just because an operator controls it.

## 5. Change management and DDL/backup design

1. **Owner registry:** Product Owner selects Option A as design direction (complete); Security/Auth defines exact issuer/approver/revoker and capability authority; Data Owner signs UserID/AreaID/EventID identity and unique/active rules; Clinical Owner signs disease/3-3-1 eligibility; Privacy signs legal basis, retention and PHI-free audit; DDL/Operations/DEV custodian signs physical header order, ACL, backups/recovery and rollback-proof revocation mechanism. These signatures are **not recorded** by this docs-only slice.
2. **Physical tab proposal:** `D331AccessGrants` would be separate from `UserAccounts` and provisional seven domain tables. Final 22-column header candidate (see companion document) is **not automatically a migration schema**. No auto-create via `ensureSheet_()`; no `getDb_()`-based read-only preflight because it may set Script Properties and use an active Spreadsheet fallback.
3. **Existing DEV identity:** use the *already supplied* Script/Deployment/Spreadsheet IDs in restricted #189. Actual Script Property → Spreadsheet and Script → Deployment technical relationship remains a **narrow live-binding HOLD**, not a reason to freeze offline Docs-only work. Use previously authorized non-mutating custodian inspection where genuinely needed before actual Cloud changes; do not ask for IDs again.
4. **Preflight:** later explicit read-only scope approval, exact pinned target, actual owner/ACL, raw sheet-name/header inventory, row-free source checks, backup status, PHI-free evidence, no mutation. Existing 39/10 mock header checks do not attest Google live configuration.
5. **Migration:** only with separate Product Owner DDL authorization and exact reviewed SHA: lock planned changes, immutable prechange backup/checksum, schema version validation, non-clobber creation if approved, idempotent apply strategy, audit, dry-run/diff, post-apply verify and separately approved rollback drill.
6. **Rollback/recovery:** no old grant snapshot may reenable a revoked ID. Distinct revoke-forward anchor, quarantine and owner-controlled reconciliation are prerequisites; do not silently restore grants or issue new ones.
7. **Operations:** minimum practical editor permissions, no employee self-approval, current server auth source, data retention, incident handling, revoke SLA and monitor health all await signoff. A Sheets worksheet is not equivalent to row-level access control.

## 6. Proposed offline adversarial acceptance matrix (planning ONLY)

| ID | Adversarial fixture / condition | Expected deny-only result |
| --- | --- | --- |
| A01 | Grant missing, PENDING, expired or not yet valid | DENY |
| A02 | Revoked ID, terminal tombstone, or revoked→ACTIVE attempt | DENY |
| A03 | Restored old ACTIVE row while an independent revoke exists | DENY; quarantine until reconciliation |
| A04 | High-water anchor missing/rolled back/unavailable or inconsistent | DENY even with a valid-looking row |
| A05 | Duplicate GrantID / duplicate active tuple / stale policy or grant revision | DENY; no first-match or union |
| A06 | Recipient self-approves, unverified issuer or generic Admin claim | DENY |
| A07 | Forged browser `userId`, grant, `origin:'server'`, signed flag or S1 synthetic ALLOW | DENY |
| A08 | Empty/wildcard/wrong AreaID or EventID, wrong owner, leading-zero coercion | DENY |
| A09 | MainData 39 header drift/duplicate EventID; AreaMaster 10 header drift/nonboolean Active | DENY |
| A10 | Unsigned Dengue disease eligibility, absent privacy basis, PHI in logs or errors | DENY; no PHI exported |
| A11 | Grant revoke race vs read/write, lock failure, UNKNOWN partial mutation/retry | DENY and reconcile, never blind retry |
| A12 | User logout/token change, revoked account or expired session with cached readiness | DENY |
| A13 | Future backup restore drift or DDL/ACL/Script Property target mismatch | HOLD/DENY; no fallback, no auto-create |
| A14 | Offline test-only `SIMULATED_ALLOW` or denial composer result provided to server/client | No usable right, readiness never authorizes Event operation |
| A15 | `getDb_()`, `ensureSheet_()` or direct Spreadsheet editor bypass proposed as read-only attestation | STOP; not an approved safe path |

**No A01–A15 case is claimed as executed by creating this document.** Future offline tests should use invented IDs, simulated clocks, synthetic area/event values, isolated in-memory snapshots and actual reviewed pure contracts only. No live Script/Spreadsheet IDs or patients/PHI.

## 7. Human Gates and release stops

| Gate | Scope and owner | Current result |
| --- | --- | --- |
| **A — Design direction** | Product Owner selection of Option A only | **APPROVED FOR DESIGN** in #213 |
| **B — Offline document review/merge** | Exact two new Markdown files, independent review, source CI, **separate Product Owner Merge approval** | Current PR work only, no Merge approval implied |
| **C — Security + Data** | Exact principal mapping, issuer/approver/revoker, capability vocabulary, Area/Event scope, revocation anchor proof, ACL/actor rules | HOLD |
| **D — Clinical + Privacy** | Disease label policy, eligibility, lawful basis/consent as applicable, PHI min/retention, audit and export/AI exclusions | HOLD |
| **E — Live DEV binding #189** | Existing target actual Script/Deployment/property/Spreadsheet relationship and trusted non-mutating read | HOLD for live integration |
| **F — DDL / grant registry apply** | Exact v1 physical headers, backup/restore, guardrails, eighth sheet migration and rollback-proof revive prevention | HOLD |
| **G — Status-only authenticated RPC** | New independent approval, authenticated server provider and provenance, deny-only by default | OFF / HOLD |
| **H — Event read / Event write / Deployment** | Separately scoped case operations, lock/ledger, privacy and clinical approval, exact deployment SHA + rollback | HOLD |

**Current STOP line:** `GRANT_BACKING_DESIGN=OPTION_A_SELECTED_BY_PRODUCT_OWNER`; `GRANT_BACKING_OPERATIONAL=NOT_APPROVED`; `EIGHTH_D331_TAB=NOT_CREATED_OR_VERIFIED`; `REVOKE_FORWARD_ANCHOR=UNDECIDED`; `CLINICAL=HOLD`; `PRIVACY=HOLD`; `DDL=HOLD`; `LIVE_RPC=OFF`; `DEPLOY=NO`; `D331_G1A_ENABLED=false`. Keep Issues #189 and #203 OPEN; #213 is the active docs/design work item. No Production exists, no new target, no Google API, no sheet/Schema Apply, no grant mutation and no Native Manifest change.
