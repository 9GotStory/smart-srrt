# P0-20 — Mock-first Records ↔ Read-only DTO Frontend Contract

**Baseline:** `main@b27a378b4cae410312816d8ee95353b6adf103de` · **Scope:** Source-only. No remote Google service call, new Web App route, Script deployment, Session change, feature enablement, grant issuance or Sheets mutation.

## Purpose and user path

Inside existing **Smart SRRT → Records**, an authenticated record-capable user can press **“ดูตัวอย่าง 3-3-1”** on any row. A separate mock-only summary panel appears below the unchanged P0-18 expandable five-step prototype. It presents synthetic counts for **Case / Plan / Control Action / Entomology / Follow-up** and explicit **Mock-only · D331 OFF** disclosure. The selection uses the already-loaded Records array only to check current authentication and stale-event changes. It **does not inspect the selected event's disease, patient, village, event ID or any real D331 row for this preview**. Any Records row can show the same synthetic example; no user should interpret those counts as belonging to the selected event.

The panel shows loading → ready / empty / error; errors remain generic. Closing, logout, session or record changes invalidate outstanding response leases and clear mock counts; duplicate clicks while pending are ignored. No new patient form, Report AI action or D331 CRUD button is introduced.

## Five-domain integration contract

| Domain | P0-20 source-only behavior | Hold for future stage |
| --- | --- | --- |
| **Database** | Original seven D331 v2 Sheets and 113 headers unchanged. No real data row read, not even EventID scan. | Approved data minimization / precise Data-Transfer Objects for detailed cases. |
| **Backend (GS)** | Pure Frontend validator `d331P020ValidateBackendDto_` recognizes the **existing P0-19** aggregate DTO shape: `status:'READ_ONLY'`, trusted EventID, positive revision, nonempty AreaID, exactly five bounded integer counts, `slaAssessment:'NOT_EVALUATED'`, `clinicalPolicyApproved:false`, `canWrite:false`, `canEnable:false`. | Actual `gs('getDengueWorkspace',sessionToken,eventId)` integration **not written**, so no real RPC is possible through this panel; it requires another reviewed source/DEV enablement gate. |
| **Frontend** | Existing Records table gains **one “ดูตัวอย่าง 3-3-1”** button per record-capable row; summary is a **separate** mock-only panel, leaving the P0-18 static `<details>` and disabled controls untouched. Responsive CSS from authored `src/styles/dashboard-ui.css` is kept in exact generated `src/web/01-styles.html` parity. | Future approved event-specific read renderer (not mock counts) and clinical workflow form. |
| **Security** | Strict in-memory `currentUser`, `token`, existing `roleCanRecord()` and exact Records-array reference checks before/after any mock async step. A click never sends a Browser RPC, logs patient info, opens Google Sheets or creates grants. Client role is only a UI convenience, **never trusted server authorization**. Source G1A/P003B/P007 flags remain OFF. | Real Backend grant check, disease scope and PolicyRevision must still be approved and tested at the Server boundary. |
| **Testing** | Synthetic VM tests cover layout, five count DTO, no extra fields or false SLA, guest/unauthorized rejection, loading/empty/error, stale/logout invalidation, duplicate prevention, no D331 RPC and no feature flag change. Entire existing Contract/Regression CI must PASS. | Genuine Development Browser/Session test only after distinct owner deployment and D331 enablement approvals. |

## Strict separation of Mock and Backend

- `d331P020MockRead_()` returns an intentionally **different** status `SYNTHETIC_ONLY` and fixed fake five counts; it never takes a selected EventID argument.
- `d331P020ValidateBackendDto_(reply,expectedEventId)` is a **pure validator, not an authority decision**. It is not used to activate any Backend call, and a successful client-side result alone would not grant permissions.
- UI explicitly labels the mock sample and never displays EventID, CaseID, names, user details, patient narrative, raw grant or ledger.
- If real P0-19 RPC is eventually enabled with the owner's explicit approval, the Server must first independently validate session-v2, exact selected event/area, disease allowlist and `dengue.case.read` per-user/event grant. Client must then refuse stale/extra payloads; no source flag switch by the browser.
- 3h / 3h / 1d clocks, eligibility rules and Follow-up days remain **clinical policy HOLD**; no fabricated SLA assessment or on-time/overdue status.

## Guardrails / Acceptance

1. Five existing Smart SRRT page IDs and native 8-GS/17-HTML source manifest unchanged; no new Dengue route.
2. P0-18 status-only partial and its existing inert test remain unmodified; P0-18 static details remain five steps with two disabled controls.
3. No `google.script.run` / `gs` / `fetch` invocation inside P0-20 adapter; no D331 Spreadsheet columns, grants or rows accessed.
4. New tests prove mock-only source status, strict reply projection, guest/role denial, duplicate and stale-response handling with logout, and generic error.
5. Source-only PR + Independent Review; **do not Merge, Deploy, issue grants, toggle flags or write Google Sheets without separate Product Owner approval**.

**Status:** `P020_MOCK_SOURCE_ONLY=PROPOSED`; `P020_BACKEND_LIVE_BINDING=HOLD`; `P020_D331_ENABLED=NO`; `P020_SHEET_WRITES=NO`.
