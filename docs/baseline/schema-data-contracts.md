# Smart SRRT — AS-IS Schema & Data Contracts

Baseline: `main@799418cad8d570f5ec0adcb37a641977b25f9650`  
Application version: `2026.09.08.1`

This document characterizes the current system. It is not the TO-BE schema.

## 1. MainData

Current width: **30 columns**.

| # | Header | Current semantic role |
|---:|---|---|
| 1 | ลำดับ | display/order value; not a stable event identity |
| 2 | วันรับแจ้ง | received date |
| 3 | ผู้แจ้งข่าว/หน่วยงานที่แจ้ง | reporter/source |
| 4 | การเฝ้าระวัง | surveillance type |
| 5 | กลุ่มโรค | disease group |
| 6 | โรค/ภัย/เหตุการณ์ | disease/event |
| 7 | ประเภทเหตุการณ์ | event type |
| 8 | สถานที่เกิดเหตุ | event location text |
| 9 | วันที่เริ่มป่วย | onset date |
| 10 | หมู่ | moo |
| 11 | ตำบล | tambon |
| 12 | อำเภอ | amphoe |
| 13 | จังหวัด | province |
| 14 | รายละเอียดเหตุการณ์ | narrative detail |
| 15 | การตรวจสอบ | verification status |
| 16 | วิธีการตรวจสอบ | verification method |
| 17 | เข้าเกณฑ์สอบสวนโรค | investigation criteria |
| 18 | ประเภทการสอบสวนโรค | investigation type |
| 19 | ประเมินความเสี่ยงแจ้งเตือน | risk |
| 20 | หน่วยงานแจ้งเตือน | notified agency text |
| 21 | การดำเนินการตามมาตรการ | control measures |
| 22 | วันที่ดำเนินการตามมาตรการ | control date |
| 23 | หน่วยงานรับแจ้ง | receiving agency |
| 24 | ลงสอบสวนโรค | investigation flag/text |
| 25 | หมายเหตุ | note |
| 26 | วันที่ลงสอบสวนโรค | investigation date |
| 27 | ผู้บันทึก | recorder email |
| 28 | วันที่บันทึก/แก้ไขล่าสุด | updated timestamp |
| 29 | ชื่อหมู่บ้าน | village |
| 30 | รหัสหมู่บ้าน | village code |

### Current write behavior

`saveRowData_` writes form values for columns 2..30 except columns 25, 27 and 28. Column 27 is overwritten with the current user's email and column 28 with the current timestamp.

Therefore column 25 (`หมายเหตุ`) is currently preserved/skipped by this generic save path rather than populated from the current web form.

### Current event identity

Browser/server operations currently use:

- physical Google Sheet `rowNumber`
- column 1 `ลำดับ`

Neither is defined as a stable immutable Event ID.

## 2. UserAccounts

Current headers:

`UserID, ชื่อ-สกุล, Email, PasswordHash, Role, Status, หน่วยงาน, ตำบล, อำเภอ, จังหวัด, วันที่ลงทะเบียน, อนุมัติโดย, วันที่อนุมัติ, LastLogin`

Current roles:

- Super Admin
- Manager
- Admin
- Staff

Current status values used by the UI:

- active
- pending
- blocked

Self-registration creates:

- UUID UserID
- Role = `Staff`
- Status = `pending`

## 3. SystemSettings

Current headers:

`Key, Value, Description, UpdatedAt, UpdatedBy`

Seeded keys:

- APP_NAME
- APP_SUBTITLE
- ORG_NAME
- CONTACT_INFO
- LOGO_URL
- LOGO_FILE_ID
- BANNER_TEXT
- PRIMARY_COLOR
- SECONDARY_COLOR
- SYSTEM_STATUS
- DATABASE_SPREADSHEET_ID
- MAIN_SHEET_ID
- SYSTEM_FOLDER_ID
- LOGO_FOLDER_ID
- GEMINI_API_KEY
- GEMINI_MODEL
- TEMPLATE_DOC_ID
- REPORT_FOLDER_ID
- ALLOW_SELF_REGISTER
- INSTALL_VERSION

### Public settings contract

`getAppBoot()` exposes only:

- APP_NAME
- APP_SUBTITLE
- ORG_NAME
- CONTACT_INFO
- LOGO_URL
- BANNER_TEXT
- PRIMARY_COLOR
- SECONDARY_COLOR
- SYSTEM_STATUS
- ALLOW_SELF_REGISTER
- INSTALL_VERSION

### Admin settings contract

`getSystemSettings(sessionToken)` currently returns every row from SystemSettings to a user with the `settings` permission.

This is an AS-IS observation only; P0 does not change this behavior.

## 4. MasterData

Current headers:

`Type, Value, Label, SortOrder, Active, UpdatedAt, UpdatedBy`

Seeded master types:

- surveillance
- disease_group
- event_type
- verify_status
- criteria
- risk
- content_category

Important canonical current values include:

### criteria
- เข้าเกณฑ์
- ไม่เข้าเกณฑ์
- รอดำเนินการ

### verify_status
- รอตรวจสอบ
- ตรวจสอบแล้วจริง
- ตรวจสอบแล้วไม่จริง

### risk
- ความเสี่ยงต่ำ
- ความเสี่ยงปานกลาง
- ความเสี่ยงสูง

## 5. AreaMaster

Current headers:

`AreaID, จังหวัด, อำเภอ, ตำบล, หมู่, ชื่อหมู่บ้าน, รหัสหมู่บ้าน, Active, UpdatedAt, UpdatedBy`

Current identity: UUID `AreaID`.

Current import matching key:

`จังหวัด + อำเภอ + ตำบล + หมู่ + ชื่อหมู่บ้าน`

Import RPC accepts at most 500 items per call. The current browser batches imports separately.

## 6. ContentLibrary

Current headers:

`ContentID, Category, Title, Description, URL, FileID, Status, SortOrder, CreatedAt, UpdatedAt, UpdatedBy`

Current status behavior:

- `published`: exposed by the public content API
- `draft`: not exposed publicly

## 7. AuditLogs

Current headers:

`Timestamp, UserEmail, Role, Action, TargetSheet, TargetId, Before, After, IpHint`

Observed action families include:

- LOGIN
- REGISTER
- CREATE_RECORD
- UPDATE_RECORD
- DELETE_RECORD
- UPDATE_USER
- CREATE_AREA
- UPDATE_AREA
- DISABLE_AREA
- IMPORT_AREAS
- CREATE_CONTENT
- UPDATE_CONTENT
- UPDATE_SETTINGS
- UPLOAD_LOGO
- REPAIR_INSTALLATION
- GENERATE_REPORT

No retention/archive lifecycle is implemented in the baseline.

## 8. VisitLogs

Current headers:

`Timestamp, Page, UserAgent`

Current `logVisit_` writes:

- current timestamp
- literal `doGet`
- JSON representation of request parameters

Therefore the third column is not a browser User-Agent in the current implementation.

## 9. Authorization contract

| Role | Permissions |
|---|---|
| Super Admin | view, create, edit, delete, report, users, settings, master, audit, export, approve |
| Manager | view, create, edit, delete, report, users, settings, master, audit, export, approve |
| Admin | view, create, edit, report, export |
| Staff | view, export |

`SYSTEM_STATUS=closed` blocks actions `create`, `edit`, `delete`, and `report`. Viewing remains available.

## 10. Browser → server RPC contract

Current unique RPC targets:

- addRecord
- deleteArea
- deleteRecord
- exportData
- generateReportFromWeb
- getAnalytics
- getAppBoot
- getDashboardData
- getInstallationStatus
- getSystemSettings
- importAreas
- listAreas
- listAuditLogs
- listContent
- listUsers
- login
- logout
- registerUser
- repairInstallation
- saveArea
- saveContent
- saveSystemSettings
- updateRecord
- updateUser
- uploadLogo

All current browser RPC targets have a matching server-side function in the baseline.

## 11. Public data contracts

### getAppBoot(sessionToken)

Returns:

- public settings
- public user projection when session token resolves
- active MasterData
- active AreaMaster
- published ContentLibrary
- application version
- systemOpen boolean

### getDashboardData(filter)

Current behavior:

- no authentication requirement
- reads MainData
- maps every MainData column to `col1 ... col30`
- includes physical `rowNumber`
- applies optional date/area filters
- returns event-level rows

This is the AS-IS contract to be protected by characterization tests before G-22 changes it intentionally.

## 12. Event mutation contracts

### addRecord(sessionToken, formData)

- requires `create`
- chooses `sheet.getLastRow() + 1`
- writes column 1 using row order
- saves row data
- logs CREATE_RECORD

### updateRecord(sessionToken, rowNumber, formData)

- requires `edit`
- addresses a physical sheet row
- logs before/form payload

### deleteRecord(sessionToken, rowNumber)

- requires `delete`
- hard-deletes the physical row
- logs the pre-delete row

### generateReportFromWeb(sessionToken, activeRow)

- requires `report`
- addresses a physical sheet row
- calls Gemini
- copies the Docs template
- writes placeholders
- logs generated Google Doc ID
- returns only the Google Docs URL

## 13. Dashboard KPI contract

Current backend analytics:

- `events = data.length`
- `criteria = col17 contains "เข้าเกณฑ์"`
- `investigated = col26 is non-empty`

Current browser Dashboard uses equivalent criteria substring logic and calculates investigation rate from these values.

This behavior is intentionally documented because G-23 will change it.

## 14. Report contract

Current generated report is not stored as a first-class database record. The only persisted system evidence is the generated Google Doc itself and an AuditLogs entry containing its document ID.

## 15. Contract stability rule for modernization

P0 records the current contracts. P1+ may intentionally change them only when:

1. the target contract is documented,
2. migration/backward-compatibility behavior is defined,
3. characterization/regression tests exist,
4. the change is associated with an approved Group A/B gap.
