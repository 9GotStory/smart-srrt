# Smart SRRT — P0-30B: Selected Event → Case Read Offline Contract (source-only)

**Tracking:** [P0-29 #248](https://github.com/9GotStory/smart-srrt/issues/248), [P0-22 Case/security decisions #238](https://github.com/9GotStory/smart-srrt/issues/238). **Baseline:** `main@db412050247ac5ef99d2b8b4901a01b00288e5f1`, existing owner-attested DEV Web App **Version 20**. **No Production exists.**

## Purpose and non-goals

Following P0-30A (source-only merged), prepare a **narrow, independently testable selection contract** between an Event candidate and the existing P0-30A read-state seam, **without linking any real Event row, exposing a real Case reader, or promoting a client selection to server authority**. Preserve the P0-25 synthetic Case editor as is. No new route, Script, Deployment, Spreadsheet, live RPC, grant, patient data read/write, or clinical timing decision.

A source-only `d331P030bSelectedEventCaseContract_` IIFE is inserted in the existing registered `src/web/03h-client-event-records.html` **after** P0-30A and **before** the exact P0-25 mirror. It remains **unmounted**: no automatic controller, navigation item, event-row button or `google.script.run` invocation. Native26 and Native33 source/package topology remain unchanged. The original P0-25 mirror in `03h` and canonical unregistered `03m` are untouched.

## Strict synthetic source contract

Only a fixed, fictional selection is accepted:

```js
{
  kind: 'SYNTHETIC_SELECTED_EVENT_V1',
  simulationOnly: true,
  eventId: '00000000-0000-4000-8000-000000002300',
  revision: 1,
  areaId: 'SYNTHETIC-AREA',
  recordStatus: 'active'
}
```

The validator checks exactly six keys and returns an immutable, sanitized copy. It denies any different EventID/Area/Revision, closed event, extra role, grant, token, PHI or other attributes. The token/user/permissions are never carried within the selected Event contract. This fixed envelope is **not** a trusted server-sourced Event selection, authorization grant or clinical event. The client cannot authorize D331 from this shape.

`createOfflineLink({selection,seam})` accepts an existing **P0-30A mock seam controller** (whose snapshot must be `MOCK_ONLY`, `remoteEnabled:false`, `canWrite:false`) and an injected synthetic selection callback only for offline tests. The resulting `preview()` uses the existing seam's `begin()` and `accept(ticket,dto)`; the DTO is a **fixed internal fake Case** accepted by P0-30A's strict mock-only validator. No network provider, event read, transport or case-read API may be injected/used. The returned `remoteEnabled` and `realEventSelectionEnabled` are `false` and this link is not mounted by application startup.

An async microtask makes the `LOADING` state observable in deterministic tests, then revalidates the selected Event **before** accepting the fixed fixture. Duplicate concurrent preview is `BUSY`; stale, closed/reopened or changed-session responses are denied by the P0-30A seam ticket/session fences. An invalid or changed selection resets and closes the preview, leaving no Case content. Data is browser-memory-only, nonclinical and `slaAssessment:NOT_EVALUATED`.

## Future real interface proposal — NOT implemented or callable

A future authorized front-end handler could *request* an Event-scoped Case list using `sessionToken,eventId` only. Its browser-provided `eventId` is an **untrusted selector**, not evidence of authentication, Record status, AreaID, disease, grants, owner or Event Revision. The **server** must rederive current Event/Area/Revision, authenticate a current session/user, verify a separately approved disease mapping/policy revision, active Event-specific `dengue.case.read` grant and operational revocation, enforce case identity, bounded read and privacy-approved fields, then return a versioned minimal DTO. Such a new public RPC/registration and clinical/privacy/security approvals are separate future work. Existing private `src/dengue/15-p0-22b2-case-read-integration.gs` remains **unregistered and hard OFF**; `getDengueWorkspace` is only count-only and disabled.

### Five-area gates

| Area | P0-30B source acceptance | Separate unresolved gate for real Case read |
| --- | --- | --- |
| Database | Reuse original EventID and CaseID schema vocabulary; **no Sheet calls** | Data Steward global vs Event-scoped CaseID policy, revision/VOID, read drift and owner-approved headers |
| Backend GS | No new Case API, no registering `15-p0-22b2`; P0-30A seam reused | Server authorization + approved exact response DTO and lifecycle |
| Frontend UI/UX | Test fake Event selection to existing P0-30A `LOADING → READY`, no actual UI mount | Actual selected Records event context, error/empty/denied UX and redaction after approvals |
| Security | Only fixed fiction, strict six-key projection, no authority inferred, stale/logout fences | Security grant creation/revocation, R1/R3 operational proof; Privacy-approved CaseID/fields, especially global A:B scan |
| Testing | New Node VM positive and negative cases, existing P0-25 mirror/regression and Native26 topology CI | Authorized DEV read E2E, consented scoped test grant and release/UAT after separate approvals |

**Clinical:** Exact dengue disease labels and 3h/3h/1d clocks have not been signed. Do not compute or display on-time/overdue; leave `NOT_EVALUATED`.

## Release / scope policy

- `npm run check:contracts`, `npm test`, generated build parity and exact-SHA GitHub CI are required.
- Independent Review and **separate Product Owner source-only Merge approval** are required; a passing PR does not auto-Merge.
- Merging has **no Apps Script effect**; Development Web App remains v20 pending a **new explicit guarded Deployment approval**. No rollout is implied by this source work.
- No change to `tools/native-sources.mjs`, Apps Script GS module dependencies, existing 7 D331 Google Sheets, real data, Script Properties, D331 feature flags or clinical/privacy/security grants.

```text
P030B=SOURCE_ONLY_MOCK_SELECTION_CONTRACT
P030B_RUNTIME_MOUNT=NO
P030B_REAL_EVENT_BINDING=NO
P030B_REAL_CASE_RPC=NO
P030B_D331=OFF
P030B_GOOGLE_SHEETS_WRITES=NO
P030B_DEPLOY=NO
P030B_MERGE=HOLD_SEPARATE_PO_APPROVAL
```
