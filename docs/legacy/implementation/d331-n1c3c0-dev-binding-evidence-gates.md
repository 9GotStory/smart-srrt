# D331 N1-C3-C0 — Existing DEV Binding Evidence & Human Gates

**Issue:** #207 · **Parent:** #203 · **Approved planning baseline:** `main@076b924d27090c491476a50d47c9b1f0a921b241`  
**Classification:** DOCS-ONLY / EVIDENCE DESIGN. This file is **not** a Google attestation, operator approval, API permission, security review sign-off, or a deployment/runbook authorization. Production has **not been configured** in this project.

## 1. Ownership and non-duplication

**Canonical owner of actual existing DEV Script → Deployment → Spreadsheet verification: #187 / #189.** C3-C0 defines dependencies and evidence acceptance rules only. It neither reopens a parallel target-verification path nor authorizes running the offline checker on private material, viewing restricted identifiers, connecting to Google APIs, reading a sheet header, invoking Apps Script, or changing an account/ACL.

The approved goal remains **one existing Smart SRRT DEV Apps Script and existing DEV Spreadsheet**, not a new sandbox, login, server, Spreadsheet or Production system. Known canonical identifiers belong in restricted custody and are **never recopied into GitHub docs/Issues/PRs/logs**. Whether a claimed existing binding is genuine remains unverified until the separate #189 gate is actually executed and independently reviewed.

| Layer | Evidence it can establish | Evidence it cannot establish | Current gate |
| --- | --- | --- | --- |
| Repository SHA + Native/contract CI | Exact reviewed source bytes and test behaviour | Live Script version, Google target identity, ACLs, permissions or clinical validity | Source checks only |
| `D331_B2C_PRIVATE_METADATA_V2` offline verifier | A locally provided private evidence object's structural and policy consistency; privacy-safe generic codes | Google origin, true Script Property, current permissions, real header values | Offline evidence is NOT Cloud attestation |
| Custodian-observed real DEV metadata | Only the exact fields actually observed by separately approved, read-only methods at a documented time | Durable permission, patient access or grant issuance; historical evidence can be stale | **#189 READ-ONLY HOLD** |
| Future server-owned authenticated checks | Current session, signed policy, grant revocation, target and row scope if authoritative stores have been approved and bound | Automatic approval from a status response, an offline fixture or a screenshot | SECURITY/CLINICAL/PRIVACY/DDL HOLD |
| Later TEST/release evidence | Exact staging/deployment version and UAT for an explicitly approved target | Production readiness or unstated future release authority | TEST/RELEASE HOLD |

## 2. Proposed *restricted* evidence manifest for #189, not permission to collect it

The actual collection method, scope, custodian, API allowlist and allowed observation time must be approved **inside #189 before any Google call**. Future evidence should be held outside the repository with custodian-only access, clear provenance, observation time, limited retention and an audit trail. Record only redacted outcome codes in GitHub.

| Private evidence category | Required check (when separately authorized) | Failure/unknown disposition |
| --- | --- | --- |
| Source environment | Identify existing DEV, explicitly record Production **not configured**, no dummy Production IDs; determine distinction from old TEST if one exists | Unknown environment → HOLD |
| Script identity | Expected vs actually observed existing Script ID and owner/account access; keep raw values private | Missing/ambiguous owner or mismatch → HOLD |
| Deployment identity | Expected vs observed deployment ID and parent Script ID; verified relation and current version | Mismatch, stale deployment or nonmatching script → HOLD |
| Pinned DB property | `DATABASE_SPREADSHEET_ID` property must be **explicitly set** and match the expected, observed DEV Spreadsheet exactly | Missing/wrong property → HOLD, **no active sheet fallback or repair** |
| Spreadsheet file metadata | Exact file ID match, Google Sheets MIME and custodian-reviewed owner/ACL, no inferred access from an accessible link | Access uncertain, owner/ACL disagreement → HOLD |
| Header-only scope | MainData **39 ordered columns**, including `OwnerUserID` at col 39; AreaMaster **10 ordered columns**, including exact `Active` header; reject duplicate/shifted headers | Only allowed after separate explicit **header-cell read** authority; no patient/event rows |
| Data access scope | Metadata only, and narrowly approved exact header cells if any; prohibited named ranges, values, sample rows, audit logs or patient exports | Any unexpected cell range or returned PHI → STOP and report sanitized incident |
| Side-effect-free execution | Enumerate exact permitted read methods and independently inspect transitive helpers; no property writes, Sheet create, installer, repair or audit writes | Any uncertain transitive side effect → STOP |

The prior V2 offline checker uses **owner-only, private evidence outside the Git worktree** and refuses V1/fake or incomplete snapshots. It is **not** authoritative Cloud evidence. In a development-only environment, missing Production IDs are represented by **empty lists**, not invented placeholders; the responsible custodian must still independently establish that the target is genuine DEV and not an unrecognized third-party or legacy TEST target.

### Dangerous existing helper paths

- `getDb_()` may fall back to the active spreadsheet and call `setProperty` when `DATABASE_SPREADSHEET_ID` is absent. **Do not use it** in metadata read-only preflight.
- `getUserByToken_()` can transitively call `getDb_()`; wrapping it in `try/catch` does not make it side-effect-free.
- `getSheetByIdOrName_()` may silently fall back to a sheet name. No guessed / name-only trusted binding.
- `ensureSheet_()`, repair/installers, schema backfill, `writeAudit_()` and migration scripts may write. **Never call** under a read-only gate.
- `findEventRowById_()` first-match and `getAreaMaster()` permissive Active types are **not** D331 authorizers. No row lookup at this phase.

A future read-only implementation must use explicitly pinned, audited, side-effect-free readers, reviewed as a **separate implementation approval**. Neither this document nor a passing CI authorizes such code.

## 3. Future #189 Preflight: specific Human Gate packet

Before **any** real metadata observation, the Product Owner and assigned DEV custodian must approve a bounded packet maintained privately:

1. **Target and evidence custodian:** approved existing DEV environment and explicit authorized observer, accountable access owner, named private evidence location, no passwords/tokens in tickets or code.
2. **Exact method and parameter allowlist:** read-only API operations with resource IDs held privately; separately list every metadata field and, if approved, the **only header-cell ranges**. All methods outside the list are DENY.
3. **Side-effect review:** static call graph showing no `getDb_` active fallback/`setProperty`, `SpreadsheetApp.getActiveSpreadsheet()`, `ensureSheet_`, installer, name fallback, repair, mutation or implicit access expansion.
4. **Observation constraints:** timestamp, minimal scope, bounded attempts, no credentials/evidence pasted into GitHub, no patient rows, no export/AI/PHI handling, exception sanitization and stop-on-unknown.
5. **Review separation:** custodian captures evidence; independent reviewer reconciles expected/observed provenance and security posture; reviewer cannot treat self-reported object fields as a signature.
6. **Stop/recovery plan:** API denied or unexpected metadata/header/ACL/mime/property mismatch → no retry with broadened scopes, no auto-migration, no property repair; report fixed sanitized code, revoke temporary read access as applicable, HOLD pending new decision.

**Not in scope now:** obtaining those approvals, invoking an API, reading the actual target, checking headers live, or issuing an attestation.

## 4. Evidence verdict vocabulary — prevent promotion by naming

| Code | Meaning / maximum claim | Does it enable D331? |
| --- | --- | --- |
| `C3C0_DESIGN_REVIEWED` | Markdown decision/evidence process was reviewed | **NO** |
| `OFFLINE_EVIDENCE_SHAPE_VALID` | Supplied private V2 evidence passed local format checks; source remains self-reported | **NO** |
| `REAL_DEV_METADATA_PENDING` | Real #189 read-only owner/ACL/property evidence not yet validated | **NO** |
| `REAL_DEV_METADATA_MISMATCH` | Bounded real check failed, if later approved/executed | **NO** |
| `REAL_DEV_METADATA_REVIEWED` | Would require separately approved real observation plus independent evidence review; **not issued by C3-C0** | **NO — not grant or policy approval** |
| `AUTHORIZATION_NOT_APPROVED` | No full trusted current server/grant/clinical/privacy chain | **NO** |

A future `REAL_DEV_METADATA_REVIEWED` state, if ever earned, **does not imply** `READY`, `ENABLED`, D331 patient access, grant authority, schema authority or release approval. Current status: `REAL_DEV_METADATA_PENDING` / HOLD.

## 5. Threat matrix / stop conditions

| Adversarial or accidental case | Required result |
| --- | --- |
| Forged/synthetic "verified" snapshot, stale V1 evidence, placeholder IDs, fake Production objects | NOT_ATTESTED; no promotion |
| Wrong deployment parent, missing property, wrong DB ID or owner/ACL, unknown mime | STOP, record fixed code, no data |
| Attempt to read MainData values instead of narrowly approved headers | STOP; no patient/row read |
| Calling `getDb_`, implicit active Spreadsheet, `ensureSheet_` or `setProperty` under "read-only" | STOP; no mutation |
| Logs/errors contain target ID, account identity, PHI or credential | Redact and protect evidence; do not publish |
| Existing DEV target unverified but C3-B mock says `SIMULATED_ALLOW` | Still HOLD; mock never grants rights |
| Additional rights, scope or methods requested after a failure | Require **fresh explicit** Product Owner authorization |

## 6. Exit criteria and successor gates

For C3-C0 **Docs-only**, only this process and the linked [Grant Decision / Approval Matrix](./d331-n1c3c0-grant-decision-and-approval-matrix.md) can be reviewed. Source-only PR: exactly **2 new Markdown files**; exact base/head Git Tree and CI; ChatGPT Independent Review; **separate Product Owner Merge approval**. There is no live metadata, API permission or new attestation.

After that, separately: #189 actual DEV identity read-only Human Gate; signed clinical/AreaID/privacy/grant owner decisions; chosen DDL and backup/rollback; server-owned status-only readiness RPC gate; later distinct Event read, write/ledger and DEV/TEST UAT. Parent #203 and #189 remain OPEN until their own evidence meets their independent gates.

**Current HOLD:** `D331_G1A_ENABLED=false`, `GOOGLE_API=NOT_PERFORMED`, `DEV_BINDING=NOT_ATTESTED`, `GRANTS=NONE_APPROVED`, `CLINICAL=HOLD`, `PRIVACY=HOLD`, `DDL=HOLD`, `LIVE_RPC=OFF`, `DEPLOY=NOT_AUTHORIZED`. No Production exists.
