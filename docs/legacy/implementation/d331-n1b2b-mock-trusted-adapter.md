# D331 N1-B2B — Mock Trusted Server Adapter (Offline Synthetic Only)

**Authority:** Product Owner instructed to proceed with N1-B2B after #184 docs-only merge. **Issue:** #185; parent architecture #183. **Baseline:** `main@c72ea0eef74f6e39f6230b95195ffd8edf8cfff7`.

## Implementation and non-goals

`src/dengue/04-n1b2b-mock-trusted-adapter.gs` simulates the future trusted authorization flow with an **injected in-memory synthetic test driver**. It is deliberately **NOT registered in Native25**. The current `D331_G1A_ENABLED=false` flag stays unchanged. Existing N1-B1 source remains unregistered and no public GAS RPC was added. None of the new functions can read from Google Apps Script, create Sheets, persist state or expose patient records.

The mock returns `simulationOnly:true` and `decision:'SIMULATED_ALLOW'`. These are never operational permissions; an attacker could forge the injected driver, so **do not install, export or invoke this adapter as a live authorizer**. The `kind` and `binding.target` checks are synthetic harness assertions, not signatures or proof of real-source identity.

## Mock flow

1. Validate injected method names and explicitly marked synthetic-only target; unknown or non-synthetic target is denied **before** fetching a session or patient-like row.
2. Validate strict `MainData` **39 columns** and `AreaMaster` **10 columns**, exact names and positions matching current Native source, not UI `rowToObject_`.
3. Check in-memory current session user is active. Role (including `Super Admin`) grants no D331 rights.
4. Check explicitly approved synthetic clinical policy: nonempty unique disease labels, version, start and expiry. No real clinical Dengue labels are approved.
5. Check approved nonrevoked synthetic per-user grant: version, user binding, explicit capabilities/areas/optional EventIDs, start and expiry.
6. Scan the bounded synthetic `MainData` raw rows and require **exactly one** matching canonical UUID. Do not reuse legacy first-match `findEventRowById_`.
7. Check bounded `AreaMaster` rows, strict boolean `Active=true`, unique scoped area, village code and full geography through N1-B1. Deny ambiguity.
8. Invoke N1-B1 `d331N1bAuthorizeOffline_` and G1-A revision rules. Exact write Revision, active-only parent for simulated write.
9. Return only EventID, Revision, AreaID, requested operation/mode and the unmistakable simulation markers. **No PHI, narrative, owner identity, grant object or raw data**.

The mock is intentionally synchronous and has no write method or network capability. Future live operations need a *different* trusted adapter, not just registration of this file.

## Source/tests

New files:

- `src/dengue/04-n1b2b-mock-trusted-adapter.gs`
- `tests/d331-n1b2b-mock-trusted-adapter.test.mjs`
- `docs/implementation/d331-n1b2b-mock-trusted-adapter.md` (this file)

Synthetic test matrix: offline/unregistered invariant; header parity to Bootstrap; positive read and simulated write; invalid/injected request; wrong target and source; missing methods; unknown/expired policy; inactive/revoked/expired grant; malformed/duplicate EventID; inactive/duplicate/ambiguous area; mismatch AreaID/owner; closed/void event; stale expected Revision; no unsafe I/O reached on early denial.

Recommended checks: `npm run check:contracts`, `npm test`, Native build/parity, P6 preflight remains **HOLD**. CI **cannot prove** authority of any live DEV environment.

## Known limitations and explicit next gates

- **B2C existing DEV metadata:** private verification of actual Script/Spreadsheet ID, owner and ACL under a separately authorized, genuinely read-only mechanism. `getDb_()` fallback can write Script Properties; it must not be used. No verification was attempted here.
- **B2D runtime:** requires an independently trusted server-owned provider, current session revalidation, exact header/unique event/area reads, properly signed/managed clinical disease policy, D331 grants with approval/revocation, careful logging/PHI minimization and a deployment gate. Merely supplying a `source` object in a public RPC is inherently insecure.
- **Schema:** seven D331 physical tabs are still provisional, and a grant registry may imply an eighth tab; requires an explicit Product Owner DDL decision.
- **Data semantics:** old MainData owner, village code and AreaMaster Active types may not satisfy strict checks; no automatic repairs or coercions.
- **Clinical/Privacy:** disease labels, legal basis, sensitive fields, retention, export and Gemini use require separate approvals. None are enabled.
- **Future writes:** need lock-bound revision/grant/status recheck, idempotency and reconciliation, database backup/rollback and exact DEV target; the mock write result is **not** a write.
- **Current boundaries:** no PR Merge without separate approval, no `clasp`, no TEST/Production deploy, no live sheet reads, no schema apply, no D331 feature flag change.

**Gate summary:** `B2B_SOURCE_ONLY` for review; `B2C/B2D/DDL/TEST/PROD=HOLD`.