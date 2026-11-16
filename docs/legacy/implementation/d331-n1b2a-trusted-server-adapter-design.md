# D331 N1-B2A — Trusted Server Adapter & Policy Boundary (Design only)

**Parent:** #178 · **Gate:** #183 · **Baseline:** `main@663126b7d5220f2ef74a6d88683eb36a504cb441`  
**Artifact classification:** Source-grounded architecture, threat model and verification requirements — **NO runnable adapter, policy, schema or Google operation is authorized**.

## Architecture decision: one existing Smart SRRT application

Dengue 3-3-1 belongs in the **existing** Smart SRRT Native Apps Script and the **existing DEV** database, linked by `MainData.EventID`. Do not create an additional Apps Script project, independent database, login system or production deployment.

N1-A placed only the *pure* G1-A foundation in Native25; `D331_G1A_ENABLED=false`. N1-B1 (`src/dengue/03-n1b1-trusted-event-contract.gs`) is already merged **as offline source**, but is **not** registered in `tools/native-sources.mjs`, has no callable RPC and does not verify provenance. N1-B2A does not alter this state.

## Verified source audit and risky existing helpers

| Existing source / location | Observed behavior | Consequence for future D331 authorization |
| --- | --- | --- |
| `src/server/02-auth-and-attachments.gs` `getUserByToken_` | Validates cached token v2, verifier tag and current active user from UserAccounts via `findUserById_` | Reuse semantics, but its current lookup calls `getSheet_` -> `getDb_` and must **not** be invoked in an unverified read-only identity preflight |
| `src/server/01-schema-and-db.gs` `getDb_` | If `DATABASE_SPREADSHEET_ID` absent, falls back to active spreadsheet and **sets Script Properties** | Prohibited for D331 identity/metadata read-only preflight; use an explicitly pinned, side-effect-free new reader only after target owner/ACL gate |
| `getSheetByIdOrName_` | Falls back to sheet name when configured ID does not resolve | Unacceptable for trusted D331 data source; reject ID mismatch instead of silent fallback |
| `findEventRowById_` | Returns the *first* EventID match and may default blank status to active | D331 must reject **zero or multiple matching rows**, missing status or malformed Revision |
| `rowToObject_`, `getEventMetaFromRow_` | Browser-oriented DTO projection; several blank values normalized to defaults | D331 must use raw header-verified rows and strict types; browser DTO is not authorization evidence |
| `src/server/03-events-and-dashboard.gs` `getAreaMaster()` | Removes rows marked `false`/`inactive` but may admit blank or other Active representations | **Not** a D331 authorization source. Require exact headers, boolean `true`, unique match and duplicate-ID scan |
| `UserAccounts` user profile | `userId`, status and role; user location is human-entered text | Role `Staff/Manager/Admin/Super Admin` and `view/edit` are NOT D331 grants; text province/tambon is NOT trusted AreaID |
| `MainData` schema | Disease col6; village number 10; tambon/district/province 11–13; village name/code 29/30; EventID 31; Revision 32; Status 33; OwnerUserID 39 | Strict 39-column row, valid UUID and Revision, exact disease allowlist, active/closed semantics; no auto-backfill of missing owner/code |
| `AreaMaster` schema | Exactly ten named columns, `AreaID`, location 2–7, `Active` col8 | Check complete header, exact village code (including leading zeros), active boolean, unique AreaID, no guessed/derived locality |

**Schema caveat:** `MAIN_SCHEMA_HEADERS` is the 30 + 8 baseline; the owner header is added separately at column 39. A trusted D331 header inspector must compare the actual 39 names in order, including `OwnerUserID`, and reject duplicates/extra conflicting populated columns rather than invoking `ensureEventOwnerSchema_`.

## Security boundary, proposed future call sequence (not executable)

```text
[Future authenticated, explicitly authorized D331 private request]
  -> feature switch must be approved and ON (today OFF -> DENY)
  -> verify operator-authorized existing DEV Script / database binding (private evidence)
  -> read current explicit DATABASE_SPREADSHEET_ID without fallback or setProperty
  -> open only the pinned DEV database under approved read scope
  -> validate UserAccounts, MainData, AreaMaster AND policy/grant headers
  -> rehydrate current token -> current UserAccounts identity + revocation
  -> read approved and versioned disease policy from trusted server store
  -> read approved, current, versioned per-user capability and AreaID grants
  -> find EventID by exact UUID; require exactly one row (duplicate => DENY)
  -> strict MainData 39-column raw-row projection + status/revision
  -> match exactly one active AreaMaster location; reject duplicate AreaID
  -> d331N1bAuthorizeOffline_(trusted snapshots ...), still only a pure evaluator
  -> return minimum authorized metadata, never PHI by default
  -> for any write: entirely separate gate, recheck under lock + idempotency
```

**Order matters.** A user token read helper, settings reader, log/audit writer or helper that transitively calls `getDb_` must not run before the existing DEV identity and read-only binding gate. A new **explicit-ID reader** is needed for later stages; do not retrofit a read-only capability by merely wrapping unsafe helpers in `try/catch`.

The authoritative reader shall refuse any unknown/empty ScriptID–Spreadsheet ID binding, any previously unapproved owner/ACL, mismatched header/order/duplicates, missing privilege, stale policy/grant, or unexpected data type. No silent migration, repair, `SpreadsheetApp.getActiveSpreadsheet()` fallback, or `getSettingsMap_()` fallback in an identity gate.

## Request / response contract proposal for future review

- **Input permitted from browser:** opaque existing session token; canonical EventID string; requested *fixed* known D331 operation (from an internal allowlist); expected Revision on an approved **write** operation only.
- **Input prohibited from browser:** userId, role, principal, allowedAreaIds, approved disease list, grant payload, ownerUserId, raw MainData row, AreaMaster rows, arbitrary target Sheet/Script IDs, dynamic capability keys.
- **Internal authoritative inputs:** verified UserAccounts row/session, verified MainData and AreaMaster raw sheets, separately approved signed/versioned disease/grant policy. Source attribution must be tested; passing objects to a pure helper does not establish trust.
- **Read-only authorized output (future):** bounded DTO with `eventId`, `revision`, `areaId` and coarse state/capability; **no patient name, address, narrative, report, attachment, coordinates or access token**. No unfiltered `MainData` list.
- **Error to caller:** generic `D331_UNAVAILABLE` / `D331_FORBIDDEN` without leaking which patient/EventID, area or grant matched. Private audit records code/category only, not raw payload, token, patient data or URL.
- **No public RPC in N1-B2A** and none shall be registered until separately approved with privacy review, UX/session cancellation semantics and non-production UAT.

## Suggested minimal state model, not an approved schema

Every decision is **DENY** unless all these facts are proven simultaneously:

```text
verifiedExistingDevTarget
AND featureApprovedAndEnabled
AND verifiedVersionedDiseasePolicy
AND activeCurrentSessionUser
AND effectiveExplicitNonExpiredD331Grant
AND exactUniqueMainDataEvent
AND validParentStatus
AND exactUniqueActiveAreaMasterAreaID
AND eventOwnerOrExplicitEventScope
AND requestedD331CapabilityPresent
AND (read OR (write AND activeParent AND matchingRevisionUnderLock))
```

Grant storage **is not selected**: a new `D331AccessGrants` Sheet would enlarge the previously proposed seven D331 tabs; adding fields to `UserAccounts` changes its existing schema; storing full ACL JSON in Script Properties has complexity/size/administrative risks. This is a Product Owner / security / DDL choice, not something N1-B2A silently decides. Disease policy storage is similarly unapproved. Until source and lifecycle are signed, both policy and grants are considered **absent**.

## Threat model & fail-closed acceptance

| Threat | Required defense | Synthetic negative case |
| --- | --- | --- |
| TEST/DEV accidentally points to Production | Independent binding/owner/ACL evidence; explicit ID only; no active Spreadsheet fallback | wrong ScriptID/Spreadsheet ID, missing binding |
| Unauthorized role-based data access | Explicit per-user D331 grant + current session recheck | Staff, Admin or Super Admin with no grant DENY |
| Forged scope via browser UserAccounts/profile | Server-owned grant and AreaMaster exact match | `province`, `AreaID`, capability injected from client |
| Missing/ambiguous disease policy | Versioned approved exact labels/code mapping | empty policy, insect-borne group, synonym not approved |
| Duplicate EventID | Require exactly 1 source row | two matching EventIDs; first-match helper prohibited |
| Duplicate, inactive or ambiguous AreaMaster | Entire scope checked; exact headers, normalized only by approved rule, boolean active | duplicated AreaID, duplicated location, inactive/blank/typed Active |
| Cell coercion/leading-zero village codes | Explicit approved canonicalization; reject uncertainty | `2` vs `02`, village code `001` vs `1`, whitespace |
| Missing owner / old revision / void/closed event | Strict unmodified MainData snapshot and Revision | blank OwnerUserID; Revision as display string; void read; closed write |
| Read/authorization race | Recheck current grant/event state on sensitive operation; write lock | revoke grant/close event between check and write |
| Idempotency/ambiguous write | Separate D331 ledger gate; no duplicate mutation after UNKNOWN | reused RequestID conflicting digest; incomplete commit |
| PHI leakage | Safe minimal DTO, generic error/audit redaction, no Gemini/exports | anonymous, wrong area, wrong grant, stale client callback |
| Unauthorized schema/Property mutation | No `getDb_` fallback or `ensureSheet_`/installer/audit writes | absent property: 0 writes, 0 creates |
| Partial policy deploy | Strong version agreement + explicit feature state, fail closed | mismatched policy revisions / missing valid grant |
| Stale session request after logout | Server revocation and client stale-response guard | logout before callback; no private repaint |

## Test and evidence requirements for later B2-B/B2-C

1. Synthetic fixture tests for every row above, including header-exact comparisons, duplicate ID scans and in-memory grant revocation. Record no PHI or raw Google IDs in GitHub.
2. Source contract checks prove `03-n1b1-trusted-event-contract.gs` and any future B2 adapter **remain unregistered** during Source-only work, no new public RPC or Google side effect.
3. Existing CI build, security, duplicate RPC, Native25 staging/regression must remain green. Green tests do **not** verify live DEV identity.
4. For any eventual **read-only** Cloud preflight, obtain specific Product Owner authorization and a responsible custodian; identify the existing DEV script/db and rollback/evidence custody. Raw IDs, patient data, tokens, and private settings stay outside GitHub.
5. Any write, D331 physical 7-tab migration, clinical policy enablement, TEST deployment or Production promotion needs a **separate** Human Gate and exact SHA.

## Exit from N1-B2A design gate

- [x] Grounded server call chain and identified mutable helper pitfalls.
- [x] Defined strict trusted-source order, explicit DEV DB binding, duplicate and header rules.
- [x] Defined a minimal DTO and denial/error behavior.
- [x] Threat/negative-test matrix and unresolved decisions documented.
- [ ] Sign disease mapping and revocation policy.
- [ ] Approve grant storage/access/expiry scheme and its potential DDL implications.
- [ ] Approve exact AreaID binding semantics (including data types / leading zeros).
- [ ] Verify existing DEV target privately before ANY cloud access.
- [ ] Authorize future N1-B2B mock-only implementation separately.

**Status:** B2A design source ready for review; B2B/B2C/B2D HOLD; `D331_G1A_ENABLED=false`; existing TEST and Production untouched.