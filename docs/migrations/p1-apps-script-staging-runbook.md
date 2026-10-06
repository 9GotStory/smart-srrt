# P1 — Apps Script Staging Smoke Runbook

Scope: G-01, G-02, G-20  
Purpose: final live-runtime gate before merging P1.

## Safety boundary

Use a disposable staging copy only.

Do not paste the P1 candidate into the production Smart SRRT Apps Script project for this gate.

Before testing:

- keep the existing production deployment unchanged;
- create/copy a staging Google Sheet;
- preserve a pre-migration backup;
- do not reuse production report output folders when avoidable.

## Candidate source

Branch:

`feat/p1-event-identity-integrity`

Files:

- `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs`
- `Index_Smart_SRRT_OneClick.html`

## A. Prepare staging Apps Script

1. Open a disposable staging Google Sheet.
2. Open **Extensions → Apps Script**.
3. Replace Code.gs with the candidate server file.
4. Create/replace `Index.html` with the candidate HTML.
5. Save the project.
6. Do not deploy yet.

## B. Run migration

Run:

`migrateP1EventIdentity()`

Expected first-run result for each legacy Event with a nonblank received date:

- EventID created
- Revision initialized to 1
- RecordStatus initialized to active
- CreatedAt remains blank for legacy rows
- CreatedBy remains blank for legacy rows
- original columns A:AD remain unchanged

Record the execution result counts.

## C. Idempotency check

Run:

`migrateP1EventIdentity()`

again.

Expected:

- new EventID backfills = 0
- new Revision initializations = 0
- new RecordStatus initializations = 0

Any nonzero second-run count blocks the merge until explained.

## D. Deploy staging Web App

Create/update a staging-only Web App deployment.

Do not replace the production deployment for this test.

Then open the staging `/exec` URL.

## E. Smoke tests

### E1 — Existing Event view

- Dashboard loads.
- Existing Event rows remain visible.
- Existing data A:AD is unchanged.

### E2 — Edit existing Event

1. Open an existing Event.
2. Change one harmless test field.
3. Save.
4. Confirm save succeeds.
5. Confirm Revision increments by exactly 1.
6. Confirm EventID does not change.

### E3 — Stale edit

1. Open the same Event in two browser tabs.
2. Save a change in tab A.
3. Without refreshing, save a change in tab B.

Expected tab B result:

> ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนบันทึกอีกครั้ง

The stale write must not overwrite tab A.

### E4 — Add Event

Create one staging-only test Event.

Expected:

- EventID = UUID
- Revision = 1
- RecordStatus = active
- CreatedAt populated
- CreatedBy populated

### E5 — Void Event

Use Manager/Super Admin on the staging test Event.

Expected:

- UI asks for a reason
- row remains physically present
- Revision increments
- RecordStatus = void
- VoidedAt populated
- VoidedBy populated
- VoidReason matches the entered reason
- Event disappears from normal Event/Dashboard list

### E6 — Stale void

1. Open an active Event.
2. Change it elsewhere so Revision increments.
3. From the stale view, attempt to void it.

Expected:

> ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนยกเลิกอีกครั้ง

The Event must remain active.

### E7 — AI report

Generate an AI report from an active Event.

Expected:

- report generation succeeds using EventID lookup;
- generated document corresponds to the selected Event;
- AuditLogs target ID is EventID rather than physical row number.

Do not use a real sensitive Event for this smoke test if the staging environment sends data to Gemini.

## F. Preservation check

Compare the pre-migration backup with staging:

- original headers A:AD
- original values A:AD for all legacy rows

Expected:

**0 differences caused by migration.**

Only intentional smoke-test edits/additions after migration may differ.

## G. Evidence to record

Record in Issue #3 / PR #4:

- staging migration first-run counts
- second-run counts
- stale-edit result
- add result
- void result
- stale-void result
- report result
- A:AD preservation result
- any limitation

Do not paste:

- passwords
- Gemini API keys
- session tokens
- sensitive Event narratives

## Pass criteria

P1 runtime gate passes only when:

- migration first run succeeds;
- second run is idempotent;
- EventID remains stable;
- Revision guards both edit and void;
- no physical Event row is deleted;
- active lists hide void Events;
- report lookup works by EventID;
- original legacy business columns are preserved.

After this gate passes, PR #4 may be marked ready for final review/merge.
