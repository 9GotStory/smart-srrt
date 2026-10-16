# D331-G1-A — Offline Native Backend Foundation

**Issue:** #169 (parent #168)  
**Baseline:** `main@25e9c1a34a00760f0b0d336c79c97781f5f83fb0`  
**Scope:** Product Owner approved source-only implementation; **Merge and deployment not authorized**.

## Candidate files and intentional isolation

- `src/dengue/00-g1a-foundation.gs`: Apps Script-compatible **pure-function proposal**. It is intentionally **not** listed in `tools/native-sources.mjs`, and has no top-level RPC, installer, migration, Google Sheet or external calls.
- `tests/d331-g1a-native-foundation.test.mjs`: Node built-in test runner, synthetic-only and negative boundary tests; run with `node --test tests/d331-g1a-native-foundation.test.mjs`.
- The existing **7 GS + 16 HTML partial + generated Index = 24-file** Native runtime, trusted `include()` allowlist, frozen One-Click snapshots, `MainData` columns and `SCHEMA_VERSION=7` remain unchanged.

**Warning:** This is not an operational Dengue 3-3-1 module. None of its functions are accessible from the Web App. No clinical SLA, follow-up scheduling, GPS, patient data read/write, export or role permission changes are implemented.

## Contracts

1. Canonical UUID, positive revision, strict Gregorian local date and UTC instant parsing. Thai Buddhist year conversions belong at an explicit UI boundary.
2. HI/CI numerator and denominator are safe nonnegative integers; positive count cannot exceed inspected; zero denominator is `null` (not surveyed), and aggregate rates sum comparable numerators/denominators.
3. Non-mutating prospective 7-sheet header inspector only, with **feature flag OFF**. No `ensureSheet_`, `installSmartSRRTCore_`, `SpreadsheetApp` or schema write path.
4. Explicit `dengue.*.read/write` capability paired with the matching boolean action mode, nonempty active principal ID, canonical EventID + owner/event membership + jurisdiction rule. A generic `view` or a mismatched read/write call never authorizes patient access; existing roles are not modified.
5. EventID/PlanID parent-child binding (an existing PlanID on a child **requires** a verified parent), separate safe-integer revision comparison, and rejection of empty principal IDs and non-boolean write modes. The future RPC must always load principal and event from trusted server state before calling these pure guards.
6. Primitive-only field-projected DTO. This only serializes preapproved fields; it **does not decide which PII fields may be disclosed**.
7. Ledger RequestID + EventID + principal + operation + payload-digest binding and PENDING → UNKNOWN ambiguity handling. **G1-A cannot mark COMMITTED, even if a caller supplies a proof string.** A future G1-B durable writer must independently read the authoritative business row and verify request identity, digest and persisted outcome before allowing reconciliation. G1-A may interpret a COMMITTED ledger row but cannot create one. This is not a durable ledger writer or a guarantee of multi-sheet atomicity.
8. Synthetic `TEST-*` ID mapping with unique generated UUIDs and checked foreign keys. Never import legacy XLSX into actual `MainData`.

## Explicitly held for later gates

- G1-B: physical Google Sheets, installer/versioned migration, true ledger persistence + lock/recovery, case RPCs, D331 activation, patient-level field model and approved authorization mapping.
- Clinical/epidemiology: 3-3-1 policy time anchors, Day0/checkpoints and 100m/200m applicability.
- Privacy: data minimization, retention, location precision, audit/export policy.
- TEST deployment, Production deployment, PR Merge and clinical use.

## Test evidence & reviewer instructions

Run `npm run check:contracts`, `npm test`, `npm run build:check` on the branch; inspect the actual generated file list and ensure legacy One-Click unchanged. Check the new tests specifically for fail-closed behavior with foreign child IDs, closed/void/unknown status, active permissions, bogus dates/IDs, HI/CI invalid counts, stale revisions and UNKNOWN writes.

A superficial pass of new tests does **not** establish production idempotency, Apps Script runtime behavior, patient-privacy compliance or field effectiveness. Request an independent exact-SHA code review. **Do not Merge or Deploy without further Product Owner authorization.**
