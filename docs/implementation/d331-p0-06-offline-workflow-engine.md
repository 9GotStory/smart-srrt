# Smart SRRT Dengue 3-3-1 — P0-06 Offline Workflow Engine

**Repository baseline:** `main@eaf26a7c7e6ddcc38da501e272b802780bcc48c9`. **Delivery:** source-only, mock-test-only, **not registered** in Apps Script Native manifest. No Production configured.

## Five agreed areas

| Area | P0-06 outcome |
|---|---|
| Database | Reuses existing v2 P0-04 seven-tab / 113-column Google Sheets contract; no DDL, no real data accessed |
| Backend GS | New pure `d331P006EvaluateOffline_` simulates 5 linked domains: `DengueCases`, `DenguePlans`, `DengueControlActions`, `DengueEntomology`, `DengueFollowups` |
| Frontend UI/UX | Unchanged; future Smart SRRT navigation and action/loading states |
| Security | No RPC, no Login bypass, no grants issued, no authorization decisions; only synthetic inputs and non-identifying output; deny on malformed/ambiguous relationships |
| Testing | VM-based synthetic positive/negative lifecycle, referential integrity, HI/CI and no PHI; existing full CI required |

## Offline contract

`d331P006EvaluateOffline_({schemaVersion:2,eventId,areaId,cases,plans,actions,surveys,followups})` expects **all five** bounded synthetic arrays with the exact v2 ordered columns. It rejects extraneous keys (including client-supplied authorization or policy), malformed scalar values, duplicate entity IDs, cross-event relationships, orphan `TriggerCaseID`, `PlanID`, `LinkedActionID`, `LinkedSurveyID`, and inconsistent plan/field AreaID. An open plan referencing a void trigger case is rejected.

The five tables are validated first using the existing `d331P002aValidateSyntheticRow_` for types/enums/required fields and completed/final evidence. `DengueRequestLedger` and `D331AccessGrants` are intentionally excluded: future writes and grants require separate trusted DB, atomicity, idempotency, revocation and privacy approvals.

Per synthetic survey, only `checkpoint`, `scope`, **HI%** and **CI%** are returned. HI uses `HousesPositive/HousesInspected × 100`, CI uses `ContainersPositive/ContainersInspected × 100`. When either inspected count is zero, **that percentage is `null` (unknown), not 0**. There is **no aggregation across mixed plans/areas/checkpoints**. Return value contains counts for five tables and `status:'SYNTHETIC_WORKFLOW_ONLY'`, `canWrite:false`, `canEnable:false`, `clinicalPolicyApproved:false`, `slaAssessment:'NOT_EVALUATED'`. It contains no EventID, AreaID, UserID, EvidenceRef, name, token or patient DTO.

## Not approved or demonstrated

The semantic clocks and policy for detection → report, receipt → initial response, vector control or 3/7/14 followup, including the 3-3-1 origin definitions, disease label mapping and optional 21/28 checkpoints, are not yet clinically signed. No policy-derived due dates, "ON_TIME"/"LATE" judgment, threshold, automated alert, response assignment, or compliance scores are implemented. The enum vocabulary is a v2 candidate, not medical authority.

This module cannot verify a live user Session, Spreadsheet ID, MainData event or active grant and **must not** be exposed to a browser as a live evaluator. It does not write to the six D331 data tables, attach a report or commit a request ledger. D331 flags remain OFF and original Smart SRRT screens unaffected.

## Independent Review & gates

Run `node --test tests/d331-p0-06-offline-workflow-engine.test.mjs`, `npm test`, existing GitHub Actions. After SHA + CI independent review, a **separate Product Owner Merge approval** is required for source-only promotion. Later separate Development gates: clinically approved rules, trusted server/session/AreaID grants, Google Sheet CRUD under lock + idempotency, private data access, browser UAT and deployment. P0-06 does not authorize any of these.
