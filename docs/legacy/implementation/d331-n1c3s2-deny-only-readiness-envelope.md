# D331 N1-C3-S2 — Unregistered Deny-Only Readiness Envelope Contract

**Issue:** #211 · **Parent:** #203 · **Implementation baseline:** `main@740138bffc860d028a0bfc17fe0eda774d44866c`  
**Scope:** Source-only design and synthetic Node tests. **No authenticated issuer, Apps Script deployment, RPC, Google API, Sheet/Script Property access, PHI access, grant storage, schema apply, Native Manifest change or D331 runtime activation.** Production has not been configured; use the existing owner-confirmed Development/Testing targets referenced privately in Issue #189. Do not ask for or copy those identifiers.

## Exact three-file implementation

- `src/dengue/06-n1c3s2-deny-only-readiness-envelope.gs`: unregistered, side-effect-free formatter with only private helper/function names ending in `_`. It has no services, storage, credentials, time source, provider lookup, patient access or public GAS entrypoint.
- `tests/d331-n1c3s2-deny-only-readiness-envelope.test.mjs`: actual new GAS formatter executed via isolated Node VM; actual existing Native26 `src/web/03l-client-d331-status.html` `closedReadiness` and `createOfflineController` run in another Node VM and fake DOM. Actual unregistered C3-B evaluator is also loaded to test that its synthetic decision cannot be fed into the formatter or C2C-B as authorization.
- This Markdown document defines the bounded contract, negative tests, dependency proof limits, and approval gates.

No other files may change. In particular, `tools/native-sources.mjs`, `src/server`, `src/web`, older `src/dengue` sources, tests, release/stage/backup scripts, CI and native manifest remain as-is. The existing Native26 layout is **8 GS + 17 HTML partials + generated Index**; the D331 status partial is registered in source order but **unmounted and inert**, with no new D331 route and `D331_G1A_ENABLED=false`.

## Contract / deny-only semantics

The pure function `d331N1c3s2ComposeDenyOnly_(input)` accepts ONLY these own, enumerable, ordinary data-only fields in a test-local JavaScript object:

| Field | Allowed values | Authority supplied by |
| --- | --- | --- |
| `requestId` | Safe integer from 1 through 1,000,000,000; positive, bounded correlation | Offline injected fixture only |
| `nowMs` | Safe integer milliseconds greater than zero and no more than MAX_SAFE_INTEGER minus 30,000 | Offline injected clock only |
| `reason` | Optional. Exactly `OFF`, `POLICY_HOLD`, or `ERROR`; omitted means `OFF` | Offline injected denial choice only |

Every other own key is forbidden, including prototype-pollution keys, symbols, `userId`, role, token, grant, AreaID, EventID, patient fields, source IDs, `origin:'server'`, `signed:true`, `simulationOnly` and mock capability fields. Accessor properties, throwing proxies, nonobjects, arrays, cyclic/extra fields and malformed clocks/reasons are rejected. Inherited claims are ignored and cannot modify the output. The function does not inspect any real user/session/provider and **must not be exposed to browser-supplied arguments or wired to an RPC**.

An accepted test-local input produces exactly these five own fields:

`{version:1,requestId:[bounded integer],state:'OFF'|'POLICY_HOLD'|'ERROR',issuedAtMs:[injected nowMs],expiresAtMs:[injected nowMs + 30000]}`

The reply is frozen. The TTL is a constant 30 seconds, below the existing C2C-B maximum 60 seconds. It is a **synthetic display denial only**, never a signature, identity proof, bearer capability, current session check or grant. If the input is absent/invalid/unsafe, **return `null`**, not a plausible live authorization or exception text. If valid correlation/clock is present but `reason` is absent, emit default `OFF`; this is the only default state. No `READY`/`ENABLED`/`LOADING` is accepted or produced. Existing C2C-B client knows `AUTH_REQUIRED` and `NO_GRANT`, but this formatter **intentionally defers producing those states** until a separately approved authenticated session/grant source exists.

**Subtlety:** a browser client accepting a five-field denial format proves *shape compatibility only*. This formatter has no trust source. Even an accepted `POLICY_HOLD` reply does not claim a real policy has been read or signed. Rendering `ERROR` or `OFF` grants no patient actions, and caller-chosen `reason` cannot be promoted to a live authorization by using it inside a future GAS entrypoint.

## Threat / test evidence table

| Scenario | Required synthetic assertion | Operational claim NOT established |
| --- | --- | --- |
| S2-01 native/source isolation | S2 unregistered, all helpers end `_`, feature OFF, no route, no real services | Live server callable contract |
| S2-02 default input | Request+clock only outputs exact frozen OFF v1 with 30-sec TTL | Real backend health |
| S2-03 valid denial states | OFF/POLICY_HOLD/ERROR round-trip through **real C2C-B validator** | Real policy/session/grant decision |
| S2-04 forbidden states | AUTH_REQUIRED/NO_GRANT deferred, READY/ENABLED/LOADING and arbitrary values → null | Authentication result |
| S2-05 invalid identifiers/time | Missing/out-of-range/NaN/Infinity/overflow/extra keys → null | Live clock attestation |
| S2-06 forged accessors/proxy/prototype | Throwing getters/proxies/symbols and own pollution reject; inherited admin role cannot elevate | Cryptographic input integrity |
| S2-07 real C3-B synthetic output | Real C3-B SIMULATED_ALLOW and SIMULATED_DENY do **not** become S2 or C2C-B readiness; forged provenance rejected | Real revoke persistence |
| S2-08 asynchronous UI denial | Actual C2C-B offline controller renders only fixed denial and two disabled controls; no automatic RPC | Deployed browser UAT |
| S2-09 stale callbacks | Logout, token/user/role/epoch changes discard in-flight denial reply; no action enabled | Live token revocation |
| S2-10 malformed client response | Replay/request-ID mismatch, expiration, secret extras, READY/ENABLED → generic ERROR/disabled | Live response signature |
| S2-11 immutability/exception | Frozen output, no exception leaks, failed adapter returns generic deny | Real audit or PHI redaction |

The Node VM uses synthetic users, row headers and events **only** to reach a controlled existing C3-B branch. No real data, credentials or IDs from #189 may appear in source, fixtures, CI or this file. Full repository CI includes the existing contract/native parity checks; a passing source build is not an actual Google identity/owner/ACL/property or runtime attestation.

## Future architecture gates (not authorized by this implementation)

1. **Existing DEV binding (#189):** Product Owner already supplied the canonical Development/Testing identifiers. For a future *live* server operation, independently inspect the actual Script → Deployment and Script Property → Spreadsheet relationship under the already scoped, approved non-mutating operator procedure. Do not ask for IDs again; do not call `getDb_()` (it may set a property when missing), active Spreadsheet/name fallback or a repair installer.
2. **Current server session:** Future security design must separately approve a safe server-validated active/revoked user session. Browser identity, role, `origin:'server'` or an offline fixture never establishes trust.
3. **Grant/policy decisions:** Options A/B/C/D from C3-A/C3-C0 remain **undecided**; any potential eighth `D331AccessGrants` tab is an independent DDL Human Gate. Approved revocation/issuer, AreaID/EventID intersection, disease-code eligibility, clinical and privacy/PHI processing must be signed by their accountable authorities before any real grant or Event access.
4. **Status-only RPC:** Distinct Product Owner/security approval for a **new authenticated server-owned** status endpoint, private pinned source, no PHI and independent per-operation server reauthorization. No client readiness response is ever a permission for case/event read/write.
5. **Real operations and deployment:** Any real Event reads, writes, ledger, storage/schema, DEV/TEST UAT or release require separate exact-SHA approvals and explicit rollback. No Production currently exists.

## Human Gate / scope freeze

**Authorized for Issue #211:** exactly these three new source-only files, isolated Branch + Draft PR, exact base/head Git Tree and full CI, ChatGPT Independent Review. **Not authorized:** Squash Merge without a fresh Product Owner decision, any Google API/clasp/metadata/patient row read, property mutation, DDL, grant storage mutation, Live RPC, real session, Native Manifest change or Deploy.

**Current truth:** `D331_G1A_ENABLED=false` · `ACTUAL_DEV_PROPERTY_ATTESTATION=PENDING_FOR_LIVE` · `GRANTS=UNDECIDED` · `CLINICAL=HOLD` · `PRIVACY=HOLD` · `DDL=HOLD` · `LIVE_RPC=OFF` · `DEPLOY=NOT_AUTHORIZED`. Keep Issue **#189 and #203 OPEN**. A future Merge must pass a *separate* Product Owner exact-HEAD gate and Post-Merge Git Tree/CI before closing #211.
