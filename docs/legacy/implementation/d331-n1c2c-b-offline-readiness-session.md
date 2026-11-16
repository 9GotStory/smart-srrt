# D331 N1-C2C-B — Offline Readiness Contract and Session Fence

**Issue:** #200 · **Parent:** #178/#183 · **C2C-A:** PR #201 merged.
**Exact base:** `main@d0fcc2344c2832bab48c02a3e76df1d3fdd5868b`.
**Approval:** Source-only implementation only. No Merge/Google API/Schema Apply/DEV TEST Deploy/Runtime Activation.

## Implementation and boundaries

- `03l-client-d331-status.html` remains a **Native26 inert, unmounted status partial**. Its `closedReadiness` defines a **prospective** version 1, deny-only, minimal status response shape (`version,requestId,state,issuedAtMs,expiresAtMs`). Allowed server-deny statuses: `OFF`, `AUTH_REQUIRED`, `POLICY_HOLD`, `NO_GRANT`, `ERROR`; `LOADING` is strictly local. Unknown, `READY`, `ENABLED`, `EMPTY`, extra fields, expired/out-of-window responses and malformed envelopes resolve to generic `ERROR`. No clinical/patient/user/grant/scope fields are allowed in this envelope.
- The *browser cannot establish server origin from this shape alone*. It is a **data-format and UI fence, not cryptographic proof, authenticated grant or backend implementation**. A later separately signed backend contract must hydrate the current server session on each real request, verify revocable scoped D331 grants, clinical disease policy and privacy/DDL/target gates before providing actual readiness. It must not trust client `role`, `token`, `requestId` or an untrusted `origin:'server'` claim as authority.
- `createOfflineController(root,adapters)` is a **synthetic-only injected harness**. It does not connect to `gs()`, Google, or real event data; never mounts itself or performs any automatic request. The injected `requestMock` and local identity snapshot exist only for test scenarios. No active navigation/UI route or real-data RPC is introduced.
- A transient in-memory fence compares existing client `authRequestEpoch`, token, `currentUser` object identity and role, plus D331 request/session epoch; duplicates are denied. A new boot identity, successful login, or synchronous logout invalidates prior synthetic requests before they can repaint, and invalidates their existing `uiBeginAction/uiFinishAction/uiInvalidateAction` lease. A real revoked grant must separately invalidate on server; client-side epochs **cannot replace server-side revocation**.
- Rendering remains `textContent`-only with fixed Thai messages, `aria-busy`/`aria-live`, mobile layout and permanently disabled controls. Raw errors, PHI, patient details, coordinates, or export/AI transfer never render.

## Verification

CI source-only tests exercise injected synthetic payloads including unknown/forged privileges, expired responses, duplicate calls, stale resolution after logout, re-login, role change, token switch, identity change, epoch increment, rejected promise, and all permanently disabled controls. The earlier exact-byte C2B source hash is refreshed to reviewed partial bytes; no changes to manifest, Build, Stage, Deploy or DDL. Five existing sidebar pages remain exact.

## Human HOLD gates

**Still not authorized:** Live readiness RPC, genuine server-issued response, D331 grant administration/AreaID/EventID scope, clinical mapping, legal basis/PHI consent/retention/export, D331 physical schema, Script/Deployment/Spreadsheet identity attestation, real UAT or any deployment. Smart SRRT remains development-only with no Production. New D331 patient access is denied by default and `D331_G1A_ENABLED=false`.

**Workflow:** Issue #200 → C2C-B Branch → Draft PR → Exact SHA/Scope/CI → ChatGPT Independent Source Review → separate Product Owner Merge authorization → Post-Merge Git Tree/CI. C2C-B completion is not a release decision.
