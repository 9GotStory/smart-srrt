# D331 N1-C3-B — Pure Offline Revocation & Authorization Contract

**Issue:** #205 · **Parent:** #203 · **Approved source-only starting baseline:** `main@87363aa68d9cfa6f1ab6168c5b3fb8fa50d50f67`.  
**Status:** IMPLEMENTATION CANDIDATE (OFFLINE SYNTHETIC ONLY). **No** authenticated server grant, policy sign-off, clinical label mapping, DDL, API, deployment, mutation or patient authorization is approved. Production does not exist.

## Files and isolation

Exactly three **new** files for C3-B:

1. `src/dengue/05-n1c3b-offline-revocation-contract.gs` — **unregistered** pure functions; every function name ends in `_`, no standalone Apps Script RPC; no Google APIs, runtime I/O, storage or writes.
2. `tests/d331-n1c3b-offline-revocation-contract.test.mjs` — Node VM injected, synthetic fixtures only.
3. This Markdown document — constraints, negative test traceability and HOLD gates.

The offline VM test explicitly loads existing pure G1-A, N1-B1 and N1-B2B sources (`00`, `03`, `04`) plus this new `05` from **local source text**. These are not added to `tools/native-sources.mjs`; Native26 remains **8 GS + 17 HTML + Index**, the existing five routes are unchanged, and `D331_G1A_ENABLED=false` remains unchanged. No existing source/manifest/build/stage/CI config is modified.

## API contract — never a live grant

`d331N1c3bEvaluateOffline_(syntheticSnapshot, syntheticRequest)` is a **synchronous**, pure, status-only *test evaluator*. It defensively copies own data-property JSON primitives/arrays/records; detects malformed values, cycles, symbols, accessors, sparse arrays, excessive data and unfamiliar keys, and never echoes exceptions. It does not read or mutate either input.

The **test harness**, not the browser or a GAS service, supplies a complete synthetic snapshot:

- `syntheticOnly:true`, `simulatedFeatureEnabled:true` are **fixture markers**, **NOT** an attestation or permission to flip `D331_G1A_ENABLED`.
- Injected `nowMs`, current simulated session revision/epoch, policy revision, grant revision and latest/previous request correlation. These are *untrusted in any real endpoint*.
- Exact version/revocation/expiry and userId match; approved synthetic grant must explicitly include `dengue.case.read` and nonempty, exact `allowedAreaIds` **AND** `allowedEventIds` intersecting the requested Event. No role-based fallback and no implicit read↔write privilege.
- Entire MainData **39-header** and AreaMaster **10-header** exact equality using the existing *unregistered* B2B fixture constants; match exactly one active EventID, strict Revision and OwnerUserID, unique active AreaID, exact string-coded village fields/leading zeros, matching synthetic disease label.
- Monotonic simulated `currentGrantRevision`/`currentPolicyRevision`/`currentSessionRevision` and `revokedGrantIds` must match the *current* input for **every** invocation. A previous mock readiness success is **not** accepted as proof on a later operation. No persisted cache is used; real replay protection and monotonic revocation require future **trusted server-owned state**.

The request allows **only** `eventId, operation, requestId, authEpoch, sessionRevision, policyRevision, grantRevision`. The only evaluated operation is `dengue.case.read` with an **explicit in-memory allow**. Any write, even with mock grant, is always **SIMULATED_DENY** pending independent clinical/privacy, lock, idempotency, ledger and physical DDL gates.

**Returned values (only three fixed literal fields; frozen):**

```json
{"simulationOnly":true,"decision":"SIMULATED_ALLOW","code":"D331_SYNTHETIC_ONLY"}
{"simulationOnly":true,"decision":"SIMULATED_DENY","code":"D331_SYNTHETIC_DENY"}
```

Both outputs are **non-operational**. No `READY`, `ENABLED`, authority token, patient field, Event/Area/user/grant ID or PHI can be returned. In particular, `SIMULATED_ALLOW` proves *only that a synthetic fixture exercised a branch of pure code*. Caller-controlled `origin:'server'`, `signed:true`, `approved:true`, `simulationOnly:true`, mock provider or role name is **never real source proof**. **Never register, export or invoke this evaluator as a real permission-checking service**.

## Negative-test mapping to C3-A T01–T30

| Threat IDs | Synthetic scope verified or documented | Evidence/remaining gate |
| --- | --- | --- |
| T01, T04–T09 | Synthetic feature OFF, session/status/epoch switch, role forging, no grant, expiry/revocation, policy/current-revision drift, multi-grant ambiguity and fresh recheck after revoke | Offline Node tests; **real server/registry attestation HOLD** |
| T10–T16 | Explicit AreaID/EventID intersection, nonempty grant Event scope, uniqueness/active Type, village leading zeros, exact 39/10 headers, unique EventID, Owner/Revision/status, mock diagnosis allowlist | Offline Node tests; **real Data Owner and Clinical sign-off HOLD** |
| T17–T20, T24 | Extra forged READY/ENABLED/source fields, correlation/replay/epoch mismatch, stale status must not grant authority | Offline Node tests; actual client network/race UAT **HOLD** |
| T21, T28 | Generic fixed response, PHI/token/accessor/error payload does not leak | Offline Node tests; live audit/log review **HOLD** |
| T29–T30 | Empty Event list cannot widen scope; revoked grant ID/tombstone or old grant/policy revision denies in synthetic snapshots | Offline Node tests; trusted rollback-proof revocation ledger **HOLD** |
| T02–T03 | Live Script–Deployment–Spreadsheet identity and Script Property read-only safety | **DEFERRED**: #187/#189 separate metadata Human Gate; **NOT tested against Google** |
| T22–T23 | Lock-based write revision and multi-sheet UNKNOWN reconciliation | **DEFERRED**: all simulated writes unconditionally denied; no write/ledger/ACID implementation |
| T25–T27 | Deployment tree/staging, DDL or live audit provider | **DEFERRED**: existing CI parity only; no real deployment/DDL/audit performed |

These groupings account for all **T01–T30**. "DEFERRED" means **not proven**, not PASS. The tests exercise only the applicable synthetic cases; CI PASS is not proof of server provenance, real revocation latency, grant custody or sensitive clinical correctness.

## Threat boundaries and critical known limitations

- All snapshots and revisions are supplied by the fixture. A malicious browser could forge them. The pure evaluator has **no trusted server origin**, is unregistered and MUST NOT be exposed to a client or wrapped in a public RPC.
- A client may lie about monotonic versions or omit revocation tombstones; there is no real ledger or server transaction. Production-grade revocation needs approved authenticated registry, replay protection and server rechecks. The mock's `simulatedFeatureEnabled:true` does **not** toggle real D331.
- Synthetic clinical labels are placeholders. No real Dengue diagnosis mapping, synonyms or Area ID normalization is accepted. Grant storage location (including possible **eighth** D331 Sheet tab) remains undecided in C3-A ADR.
- C3-B intentionally rejects ambiguous grants, empty Event grants, closed/void Event for its **read simulation**, and all writes; these are conservative mock constraints, **not approved clinical/business decisions**.
- Error and debug output is a single fixed code; no raw exception, token, account name, Script ID, Spreadsheet ID, grant ID or patient row.
- Existing DEV Cloud identity is not attested. `getDb_` and helpers that can fall back/mutate Script Properties are forbidden in any future read-only target preflight unless independently redesigned and approved.

## Review / Human Gates

- C3-B scope: **exactly three new files**, no existing-file modifications, Native Manifest, route, backend, feature flag, CI config, One-Click, clasp or deployment changes.
- Gate: new Branch + Draft PR, exact candidate/base SHA, actual diff/Git Tree scope, contracts + full regression + Native parity build, ChatGPT Independent Source Review; **separate Product Owner Merge authorization required**.
- Any later actual DEV binding access (#189), clinical policy, grant registry & DDL, privacy/PHI, server-issued readiness/Live RPC, patient data path, TEST deploy and runtime enablement are **separate HOLD gates**. Parent #203 remains OPEN.
- This implementation performs **zero Google API calls**, no Apps Script runtime execution, no Schema Apply and no D331 feature enablement.
