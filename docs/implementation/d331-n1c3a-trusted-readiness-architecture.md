# D331 N1-C3-A — Trusted Readiness Architecture (DESIGN ONLY)

**Issue:** #203 · **Exact baseline:** `main@735d9529047a5b8bf1e1f4f8114006216194e909` · **Predecessor:** #200 / PRs #201–#202.  
**Classification:** proposed future server trust boundary; this document authorizes **zero** runtime, Cloud, data or schema actions. No Production exists.

## Non-negotiable existing state

- One **existing** Smart SRRT Native Apps Script and existing DEV Spreadsheet, never a separate application, login, or database. Native26 consists of **8 GS + 17 HTML partials + generated Index**; actual navigation remains five pages. The D331 HTML partial is registered but **not mounted** or navigable.
- `D331_G1A_ENABLED=false`. No clinical policy, grant provider, D331 RPC, patient DTO or D331 physical migration is active.
- N1-C2C-B's V1 status envelope `{version,requestId,state,issuedAtMs,expiresAtMs}` is **synthetic and deny-only**. `OFF/AUTH_REQUIRED/POLICY_HOLD/NO_GRANT/ERROR` are allowed server-denial concepts; `LOADING` is client-only and `READY/ENABLED` are rejected. Even a syntactically valid envelope is **not** evidence of server authenticity.
- The unregistered `src/dengue/03-n1b1-trusted-event-contract.gs` and `04-n1b2b-mock-trusted-adapter.gs` are offline evaluators, not source/provenance attestations; mock providers are caller-forgeable.
- Existing `getUserByToken_` transitively reaches `getDb_`, which may persist a Script Property when `DATABASE_SPREADSHEET_ID` is missing. No real read-only identity inspection may use this path until a separately approved safe pinned reader exists. Likewise, do not reuse first-match EventID or permissive AreaMaster Active logic as D331 authority.
- Actual DEV Script↔Deployment↔Spreadsheet binding is pending #187/#189, not verified by CI or a private evidence file alone.

## Trust boundaries: status-only vs patient/event operations

**This is a proposed future sequence, NOT deployed code.** Not all actors exist or are authorized yet.

```text
Existing browser                 Existing GAS server                        Existing pinned DEV store
  |                                   |                                             |
  | [future authenticated request]    |                                             |
  |---- opaque session + correlation -->|-- feature gate (OFF => fixed DENY)          |
  |                                   |-- attested target and explicit-ID guard   X--| (HOLD #189)
  |                                   |-- revalidate current session/revocation  X--| (HOLD)
  |                                   |-- independently approved policy/grants   X--| (HOLD)
  |                                   |-- check expiry, revision, user scope     X--| (HOLD)
  |<--- status-only deny ----------------|                                             |
  |     NO authority for record access  |                                             |
  |                                   |                                             |
  | [future separate Event operation]  |                                             |
  |---- opaque token, UUID, operation ->|-- repeat ALL gates, regardless of readiness|
  |                                   |-- strict MainData EventID uniqueness    X--| (HOLD)
  |                                   |-- validate 39 raw headers, owner,status X--| (HOLD)
  |                                   |-- unique active AreaMaster 10 cols      X--| (HOLD)
  |                                   |-- disease + per-user grant intersection X--| (HOLD)
  |                                   |-- if write, recheck under lock + ledger X--| (HOLD)
  |<--- generic denial (today) ---------|                                             |
```

A server-origin response is established by an authenticated server execution using independently verified target identity, current server-owned session and policy/grant provider. **No browser-provided signature, object, `origin:"server"`, UI role or `simulationOnly:true` can attest that origin.** A status response is advisory and **never** a bearer token or reusable Event-access permit. A future server must independently re-authorize each private request, including grant revocation since readiness.

## Proposed closed-world call contract — conceptual, not callable

| Dimension | Design requirement / current default |
| --- | --- |
| Transport | Future explicit GAS private RPC only after separate Product Owner, security, clinical, privacy and DEV-target gates; **none registered now** |
| Browser request fields | Existing opaque session token + server-bounded opaque request correlation; for a later Event endpoint, canonical EventID UUID + fixed operation allowlist; expectedRevision only for separately approved writes |
| Forbidden browser authority | `userId`, role, grant/capability list, allowed AreaID/EventID, disease labels, owner identity, raw MainData/AreaMaster rows, Script/Spreadsheet IDs, arbitrary method/collection |
| Status-only response | Closed versioned, bounded timestamp and request correlation, **deny states only until formally changed**; no grants, patient fields, target IDs, row counts, coordinates, attachments or token |
| Unknown/error outcome | Generic `D331_UNAVAILABLE` or `D331_FORBIDDEN` internally mapped to safe UI deny; no detailed authorization failure, patient ID, exact area or underlying exception rendered |
| Privacy/audit | PHI-free category, policy/grant version identifiers only if approved as nonsensitive; no raw token, person name, disease notes or query body in logs |
| Lifetime | Short bounded expiry from current source V1: 60 s maximum window; exact skew/replay tolerance needs security approval; expiry never extends grant/session validity |
| Revocation | Compare authoritative grant and policy revision plus current account/session state **per sensitive request**. Client auth/request epochs cancel stale display only; never replace backend revocation |
| Optimistic UI | Never enable patient actions from a readiness reply, generic user role or locally cached grant. Keep no D331 route or menu today |

**Fail-closed ordering:** feature OFF → deny before any DB access; after a separately approved rollout, verify explicit pinned target/binding without side effects **before** any transitive getDb/helper call → server-current session → policy and grant at approved source → strict Event/area/owner/revision/status projection → capability/scope → minimal response. If identity target, policy/grant or headers are unverifiable: DENY, no repair, no fallback.

## Source-of-authority versus verification evidence

1. **Repository/CI:** proves only reviewed bytes, unit behavior, Native26 parity and no unauthorized file drift; never proves Cloud deployment or current grants.
2. **Offline signed/redacted custodian report:** may describe observations; not an attested connection. It cannot itself issue rights.
3. **Future live metadata read:** only after explicit #189 Product Owner approval with responsible custodian, exact existing DEV IDs/ACL and read-only access proven; no patient rows or Script Property mutation.
4. **Future authoritative request:** independent server-side session revocation, signed/versioned policy and current grant with approved backing, exact raw row source and bounded DTO. No read until all Human Gates pass.
5. **Future deployment:** independently approved TEST stage with backup/rollback and release SHA; no standing approval from Docs merge.

## State/invalidation requirements

- `OFF` remains mandatory while `D331_G1A_ENABLED=false`; absence of a live provider is not `READY`.
- User logs out, logs in again, changes token/identity/role, or local auth epoch advances → synchronously clear status, pending lease and private cache; late replies discarded. Any status derived from outdated server grant/policy revision must be refused on future live request.
- Invalid/extra-field/expired/unsupported response, replayed correlation, disclosure-prone error or unknown server condition → a generic deny UI with permanently disabled actions.
- Browser `aria-busy`, `aria-live` and Thai static `textContent` remain accessibility/display concerns, **not authorization**.

## Human gates and cross-references

- [Grant ADR](./d331-n1c3a-revocable-grants-adr.md), [Decision Register](./d331-n1c3a-decision-register.md), [Threat / Negative Matrix](./d331-n1c3a-threat-negative-tests.md).
- Prior approved source-only evidence: [C2C-B](./d331-n1c2c-b-offline-readiness-session.md), [trusted boundary B2A](./d331-n1b2a-trusted-server-adapter-design.md), [legacy B2 decision register](./d331-n1b2a-decision-register.md).
- C3-B pure offline evaluator requires a **new** Product Owner implementation authorization and separate Draft PR. Live DEV binding, grant storage and RPC each need their own gates. **Clinical/Privacy/DDL/DEV/TEST/Runtime all HOLD**.
