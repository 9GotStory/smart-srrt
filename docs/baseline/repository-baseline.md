# Smart SRRT — Repository Baseline

## Canonical AS-IS baseline

- Repository: `9GotStory/smart-srrt`
- Default branch: `main`
- Baseline commit: `799418cad8d570f5ec0adcb37a641977b25f9650`
- Application version: `2026.09.08.1`
- Baseline source files:
  - `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs`
  - `Index_Smart_SRRT_OneClick.html`
  - `AreaMaster_Template.csv`
  - `Mocking Data.xlsx`
  - `Template_รายงานสอบสวนโรคเบื้องต้น.docx`
  - `README_ติดตั้ง_Smart_SRRT_OneClick.txt`
  - `คู่มือติดตั้ง_Smart_SRRT_ระดับอำเภอ_v2026.09.08.1.txt`
  - `การอัพเดทเวอร์ชั่น เพื่อแก้ไขปัญหาสร้างรายงานสอบสวนไม่ได้.txt`

## Baseline policy

The baseline commit above is the reference for current production behavior. Development must not rewrite or normalize the original baseline files merely for style or structure before characterization and regression gates exist.

All modernization work must occur on branches and must preserve migration compatibility with existing Google Sheets / Drive / Docs installations.

## Known baseline observations

These are observations only, not changes applied to the baseline:

1. The code comment header still says `Version: 2026-08-02`, while `CONFIG.VERSION` is `2026.09.08.1`.
2. The current application uses Google Apps Script + Google Sheets + Google Drive + Google Docs + Gemini API.
3. Event operations currently rely on Google Sheet row numbers in several workflows.
4. Public Dashboard and event-level data require a data-boundary review.
5. KPI criteria logic requires correctness review.
6. The current one-click deployment experience is a compatibility requirement unless explicitly changed.

## Change discipline

- No direct feature work on `main`.
- Prefer one concern per branch / PR.
- Migration work must be additive and backward-compatible first.
- Existing data must not be destructively rewritten without backup, dry-run, verification, and rollback evidence.
- Security/privacy corrections take precedence over new feature work.
