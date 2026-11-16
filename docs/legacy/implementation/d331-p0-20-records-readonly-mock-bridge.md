# Smart SRRT — P0-20 Records read-only UI Bridge (source-only)

**Baseline:** `main@b27a378b4cae410312816d8ee95353b6adf103de`. This slice implements a **pure offline/mock-only** adapter inside the existing Records page; it is not an approved D331-enabled read path and requires **no live Google access**.

## Original five areas

| Area | What was completed | Still blocked |
| --- | --- | --- |
| **Database** | Reuse P0-18's existing 7-tab/113-header mapping. Mock includes no real EventID or Google Sheets row. | Real event data, row relationships, D331 access grants or schema changes |
| **Backend (GS)** | Frontend DTO intentionally mirrors P0-19 count-only `getDengueWorkspace(sessionToken,eventId)` shape: `status:'READ_ONLY'`, event/area/revision, five integer counts, `slaAssessment:'NOT_EVALUATED'`, `canWrite:false`, `canEnable:false`. Strict validator accepts only a **fixed synthetic UUID** and synthetic area, never a real event. | Any request to backend: not wired, D331 hard switches OFF, approved binding/disease/policy/grants unset |
| **Frontend (UI/UX)** | Reuse **one** P0-18 `<details>` under Records; add a hidden static count `<dl>` with five fields and an `aria-live` status. After a logged-in Records render, bind a single `toggle` listener to request the **pure in-memory mock**; display Loading/Ready/Error; closing or Logout clears results. No extra page, menu, form, enabled button or patient narrative. | Selecting a real case/event row, clinical forms, native approval to call live GS |
| **Security** | Client mock is visually guarded by existing current user/token/record-role, with session identity and epoch fencing against stale Promise results. **This is UX only**; the *actual* read authorization still lives solely in the GS grant guard and remains OFF. No token, user details, real event ID or raw rows in the displayed DTO. | Server-authorized real grants/read enablement, policy-approved disease/time thresholds |
| **Testing** | Node/vm offline tests for default-closed page, mock count shape, Loading/Ready/Error, duplicate suppression, logout and in-flight stale response invalidation, bad DTO rejection, no real RPC, and original Smart SRRT navigation and CI regression. | Real D331 browser E2E and Google Sheets access, which are not approved |

## Explicit states / contract boundary

1. **Guest/no record-role:** Records navigation is already prohibited by the old closed-world `showPage`. Direct mock calls with guest identity clear the hidden summary and cannot produce counts.
2. **Authorized original Records page + user opens preview:** display “กำลังโหลดข้อมูลจำลองแบบอ่านอย่างเดียว...” immediately; resolve a fixed, synthetic `READ_ONLY` DTO on the next microtask and show five synthetic counts. The sample is marked **ตัวอย่าง** at both the title and the status and remains unbound to `allData` / selected patient event.
3. **Bad synthetic response / rejected mock request:** show generic mock error; never render unknown counts or arbitrary HTML.
4. **Logout, collapse, changed session:** immediately increment epoch, wipe counters, hide summary and ignore any late response.
5. **Repeat render/open:** avoid duplicate listeners and concurrent mock calls. Only `textContent` is assigned to counters/status. Existing two disabled P0-18 buttons remain untouched.

**Clinical business rules:** no 3-hour or one-day clock inference. The UI continues to display **NOT_EVALUATED**, pending explicit clinical-policy approval.

**Deployment/source gates:** no source manifest change, no backend modifications, no real `google.script.run`/Apps Script RPC in the new bridge, no D331 feature enabled, no grant issuance, no clinical row read or writes, no Production (not configured). The existing Development Web App is not changed by this PR. Require **separate** owner approval for Merge and Development deployment. The mock is **not** proof of real AccessGrant authorization.

## Next
The next bounded step is server-policy decision and an explicitly scoped real read-only *Development* integration gate (trusted EventID + clinical approved disease list + grant), followed by authorized synthetic workflow UAT; then later, under separate grants and controls, CRUD. Never infer readiness from the visible mock.
