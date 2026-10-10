# Smart SRRT — คุณสมบัติและความสามารถของระบบปัจจุบัน

> **เอกสารอ้างอิง Current Implementation** ณ 10 ตุลาคม 2026  
> Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt) · Baseline: `main@60cda9da745e080122f104713bb0f0eb8ce0f110`  
> `CONFIG.VERSION = 2026.09.08.1` · `CONFIG.SCHEMA_VERSION = 7` · `CONFIG.REPORT_PROMPT_VERSION = 2026.10.06.1`
>
> รายละเอียดด้านล่างอธิบายสิ่งที่ **มีใน Source ปัจจุบัน** ไม่รับรองว่า Deploy ทุก Installation ตรงกับ GitHub และไม่รับรองการทดสอบ End-to-End ที่ไม่ได้เกิดขึ้น

## 1. วัตถุประสงค์และแผนที่หน้าจอ

Smart SRRT สนับสนุนการเฝ้าระวังแบบ Event-based Epidemiological Surveillance ตั้งแต่รับแจ้งเหตุการณ์ ตรวจสอบ/ประเมินเกณฑ์ กำหนดผู้รับผิดชอบ เก็บหลักฐาน สรุป Dashboard ไปจนถึงสร้าง **ร่าง** รายงานสอบสวนโรคเบื้องต้นด้วย AI

| เมนูด้านซ้ายตาม Source | หน้าหรือหน้าที่ | การเข้าถึง |
| --- | --- | --- |
| `Dashboard` | Dashboard และรายการเหตุการณ์ (รายการรายแถวเฉพาะผู้ล็อกอิน) | ทุกคนดูข้อมูลรวมได้ |
| `บันทึก/แก้ไขข้อมูล` | `บันทึก/แก้ไขข้อมูลเหตุการณ์` | Super Admin / Manager / Admin |
| `สร้างรายงานสอบสวนโรค` | **`สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI`** | Super Admin / Manager / Admin |
| `การจัดการระบบ` | สถานะระบบ การตั้งค่า MasterData พื้นที่ ผู้ใช้ เนื้อหา Audit | Super Admin / Manager |
| `ประกาศ/แนวทาง/คู่มือ` | `ประกาศ แนวทาง และคู่มือ` | ทุกคนดูเนื้อหาที่ published ได้ |

หลักฐานชื่อเมนูและหน้า: [`src/web/02-app-layout.html`](../src/web/02-app-layout.html); Dialog/Modal: [`src/web/03-modals.html`](../src/web/03-modals.html) และพฤติกรรม: [`src/web/04-browser-app.html`](../src/web/04-browser-app.html)

**สิ่งที่ไม่ได้ทำ:** HIS/LIS, เวชระเบียนผู้ป่วย, ระบบจัดการเคสและผู้สัมผัสเต็มรูปแบบ, Workflow Engine แบบ Task/SLA/Escalation, ระบบอนุมัติหรือเซ็นรับรองรายงาน, การวินิจฉัยอัตโนมัติ

## 2. Public Dashboard และตัวชี้วัด

### 2.1 การใช้งานและตัวกรอง

ผู้ใช้งานทั่วไปเปิด `Dashboard` ได้โดยไม่ต้อง Login ระบบเรียก `getPublicDashboardData(filter)` เพื่อรับ **ข้อมูลรวม** แทนรายการเหตุการณ์ ผู้ใช้ที่ล็อกอินเรียก `getDashboardData(sessionToken, filter)` ซึ่งต้องมี `view` permission และจึงเห็น `รายการเหตุการณ์` พร้อมรายละเอียดตามสิทธิ์

ตัวกรองประกอบด้วยวันที่เริ่มต้น/สิ้นสุด จังหวัด อำเภอ ตำบล และหมู่บ้าน; สามารถค้นหา ล้างตัวกรอง และ `บันทึกรูปภาพ` Dashboard ได้ สถิติมีกราฟ **จำนวนเหตุการณ์รายหมู่บ้าน**, **แนวโน้มรายเดือน**, **สัดส่วนตามกลุ่มโรค**, **สัดส่วนตามระดับความเสี่ยง** พร้อม `Smart Insights` สรุปโรค/เหตุการณ์และหมู่บ้านที่พบมากที่สุด รวมทั้งรายการเข้าเกณฑ์ที่ยังไม่มีวันที่ลงสอบสวน

**Smart Insights ใน Dashboard เป็นข้อความที่คำนวณจากข้อมูลสรุป ไม่ใช่การเรียก Gemini ทุกครั้งที่เปิด Dashboard.**

### 2.2 นิยาม KPI ที่ Server ใช้

| KPI ที่หน้าจอ | เงื่อนไขตาม `buildDashboardAggregate_` |
| --- | --- |
| `เหตุการณ์ทั้งหมด` | จำนวนแถวที่มี `วันรับแจ้ง` และ `RecordStatus != void` ภายใต้ตัวกรองที่เลือก |
| `เข้าเกณฑ์สอบสวนโรค` | เหตุการณ์ที่ `trim(col17) === 'เข้าเกณฑ์'` เท่านั้น |
| `ลงสอบสวนโรคแล้ว` | เฉพาะเหตุการณ์เข้าเกณฑ์ข้างต้น **และ** `col26` (วันที่ลงสอบสวน) ไม่ว่าง |
| `ความครบถ้วนการสอบสวน` | `round(ลงสอบสวนแล้ว / เข้าเกณฑ์ × 100)`; ถ้าตัวหารเป็นศูนย์ ให้ 0% |
| `pendingCriteria` (ผลข้อมูลรวม) | เหตุการณ์ `เข้าเกณฑ์` แต่ยังไม่มี `col26` |

`ไม่เข้าเกณฑ์` และ `รอดำเนินการ` ไม่ใช่ตัวนับ `เข้าเกณฑ์` และเหตุการณ์ที่มีวันที่ลงสอบสวนแต่ไม่เข้าเกณฑ์ **ไม่** ถูกนำไปนับเป็นตัวตั้งของอัตรานี้

Server ส่ง `kpi`, `byVillage`, `byMonth`, `byDiseaseGroup`, `byRisk`, `topDisease`, `topVillage` เท่านั้นสำหรับ Public Dashboard; ไม่ส่ง `EventID`, `Revision`, `MainData` rows, Narratives, รายละเอียดผู้แจ้งหรือไฟล์ Export แบบข้อมูลดิบ หน้าจอล้าง `allData` เมื่อ Logout และ Guard ผลตอบกลับเก่าจาก Session/Filter ที่เปลี่ยนแล้ว

> หมายเหตุเชิง Implementation: `getAnalytics(sessionToken)` ของส่วน Admin มีชุดตัวนับภายในของตนเอง โดยค่า `investigated` นับเหตุการณ์ที่มี `col26` แม้ไม่เข้าเกณฑ์ ไม่ควรนำไปแทนความหมาย KPI `ลงสอบสวนโรคแล้ว` บน Dashboard โดยไม่ปรับนิยาม

Source: [`src/server/03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [P2 Privacy/KPI Contract](../docs/architecture/p2-privacy-kpi-contract.md)

## 3. Authentication, Registration และ User Management

### 3.1 Login / Logout / Session

- `login(payload)` ใช้อีเมลและรหัสผ่าน ตรวจ `PasswordHash` และสถานะบัญชี `active` แล้วคืน Session Token พร้อม Public User Profile
- Server Hash Password ด้วย SHA-256 ตามโค้ดปัจจุบัน; **ไม่ใช่** Password Hash แบบ Adaptive ที่มี Salt เฉพาะบัญชี จึงไม่ควรอธิบายว่ามี BCrypt/Argon2 หรือ MFA
- `makeSessionToken_` เก็บ Token → Email ใน `CacheService.getScriptCache()` ด้วย TTL **21600 วินาที (6 ชั่วโมง)**; Browser เก็บ Token ใน Local Storage
- `logout(sessionToken)` เอา Token ออกจาก Server Cache และ Browser ล้าง Token, รายการเหตุการณ์, สรุปรายงาน และสถานะ UI เดิมทันที
- ทุก RPC ที่มีข้อมูล/การดำเนินการเฉพาะสิทธิ์ต้องตรวจ `requireAuth_(sessionToken, permission)` บน Server; การซ่อนเมนูอย่างเดียวไม่ถือเป็น Authentication Boundary
- `SYSTEM_STATUS=closed` ปฏิเสธการกระทำ `create/edit/delete/report/assign/close_event` แต่ยังเปิดอ่าน Dashboard ได้

### 3.2 สมัครและอนุมัติบัญชี

`registerUser` เปิดใช้งานได้เฉพาะเมื่อ `ALLOW_SELF_REGISTER=true` ผู้สมัครใหม่ใช้ Role `Staff`, Status `pending`; ผู้มีสิทธิ์ `users` จึงแก้ Role/Status/ข้อมูลหน่วยงาน และ Reset รหัสผ่านได้ การลงทะเบียนไม่เท่ากับการได้รับสิทธิ์ใช้งานทันที

### 3.3 สิทธิ์ตาม Source Code

| Permission | Super Admin | Manager | Admin | Staff |
| --- | :---: | :---: | :---: | :---: |
| `view` / `export` | ✓ | ✓ | ✓ | ✓ |
| `create` / `edit` / `report` | ✓ | ✓ | ✓ | — |
| `delete` / `assign` / `close_event` | ✓ | ✓ | — | — |
| `users` / `settings` / `master` / `audit` / `approve` | ✓ | ✓ | — | — |

ผู้ไม่เข้าสู่ระบบไม่ได้ใช้ Permission `view` เพื่ออ่าน Rows แต่ใช้ RPC Public แบบแยกสิทธิ์ กลุ่ม Staff มีสิทธิ์ Export หลังล็อกอิน แต่ไม่ปรากฏเมนูบันทึก/รายงาน

Source: [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs), [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs)

## 4. Event Management

### 4.1 ข้อมูลเหตุการณ์และรายการ

`บันทึก/แก้ไขข้อมูลเหตุการณ์` และส่วน `รายการเหตุการณ์` หลังล็อกอินแสดงวันรับแจ้ง โรค/เหตุการณ์ หมู่บ้าน/พื้นที่ สถานะเหตุการณ์ ผู้รับผิดชอบ ผู้บันทึก ไฟล์แนบ และการจัดการตามแต่ละหน้า ฟอร์มครอบคลุมผู้แจ้ง/หน่วยงาน การเฝ้าระวัง กลุ่มโรค ชื่อโรค/เหตุการณ์ ประเภทเหตุการณ์ วันที่เริ่มป่วย จังหวัด/อำเภอ/ตำบล/หมู่บ้าน รายละเอียด การตรวจสอบ เกณฑ์สอบสวน การประเมินความเสี่ยง มาตรการ หน่วยงาน และวันที่ลงสอบสวน

ข้อมูล MainData ภาคธุรกิจอยู่ในคอลัมน์ 1–30; Event ID และ Metadata ต่อท้ายตาม `MAIN_SCHEMA_HEADERS`. การคัดกรองด้านพื้นที่ผูกกับ `AreaMaster` และตัวเลือกชนิดข้อมูลจาก `MasterData`

### 4.2 EventID, Revision และ Concurrent Edit

- `addRecord` สร้าง `EventID` เป็น UUID, `Revision=1` และ `RecordStatus=active`
- `updateRecord(sessionToken, eventId, formData, expectedRevision)` หาเหตุการณ์ด้วย EventID ไม่ใช้ Row Number เป็น Identity
- การแก้ไข กำหนดผู้รับผิดชอบ แนบ/นำไฟล์ออก ปิด/เปิด และยกเลิก มีการตรวจ `expectedRevision` เทียบ Version ล่าสุดก่อนเขียน แล้วเพิ่ม Revision ตามการเปลี่ยนแปลง
- เมื่อ Revision ไม่ตรง ระบบขอให้รีเฟรช ไม่เขียนทับข้อมูลของผู้ใช้อื่นแบบเงียบ ๆ; การแก้ไขบันทึก Audit
- เมื่อ `RecordStatus=closed` การแก้ไขข้อมูลและเพิ่ม/นำไฟล์แนบออกถูกปฏิเสธจนกว่าจะ Reopen

### 4.3 Lifecycle, Owner, Close/Reopen และ Void

Implementation ปัจจุบันใช้ `RecordStatus` ค่า `active`, `closed`, `void` พร้อมแสดง `eventLifecycle` ที่ **derive จากข้อมูลจริง** เช่น `รับแจ้งแล้ว`, `รอตรวจสอบ`, `รอประเมินเกณฑ์`, `รอสอบสวน`, `สอบสวนแล้ว`, `ปิดเหตุการณ์แล้ว`, `ยกเลิก` ฯลฯ ไม่ได้เก็บคอลัมน์ `WorkflowStatus` แยกเป็น Engine ใหม่

`OwnerUserID` ที่ MainData คอลัมน์ **39** ระบุผู้รับผิดชอบ (ไม่บังคับ) ต้องอ้างถึงผู้ใช้ Active; กำหนด/เปลี่ยน/ยกเลิกผู้รับผิดชอบด้วย `assignEventOwner` ตามสิทธิ์ `assign`

`closeEvent` และ `reopenEvent` ต้องมีเหตุผลและ Revision ตรงกัน; เปลี่ยน `RecordStatus`, เพิ่ม Revision และเก็บเหตุผลใน Audit การปิดไม่ใช่การลบข้อมูล; การเปิดกลับใช้ได้เฉพาะ `closed` `deleteRecord` คือ **Soft Void** ต้องมีเหตุผล, บันทึก `VoidedAt/VoidedBy/VoidReason` และไม่ลบ Row

**ข้อควรระวังการอ่านเอกสารเดิม:** [P3 Workflow Contract](../docs/architecture/p3-lightweight-workflow-contract.md) อธิบาย schema/WorkflowStatus แบบที่ต่างจาก `main` ปัจจุบัน รวมถึงคอลัมน์ 39–44 จึงห้ามยกมาเป็นโครงสร้างฐานข้อมูลที่ Deploy ได้ใน v7 โดยไม่ตรวจสอบ Mapping/Migration

### 4.4 Consistency Warnings

`deriveEventConsistencyWarnings_` แจ้งข้อสังเกตเมื่อค่าขัดกันโดยไม่บังคับให้ปิดงาน เช่น ตรวจสอบแล้วไม่จริงแต่เข้าเกณฑ์, ไม่เข้าเกณฑ์แต่มีวันลงสอบสวน, ระบุไม่ลงสอบสวนแต่มีวันลงสอบสวน, ระบุลงสอบสวนแต่ไม่มีวัน หรือมีวันที่ดำเนินมาตรการแต่ไม่มีรายละเอียด ผลเตือนแสดงกับ Event ที่ผู้มีสิทธิ์เปิดอ่านได้ ไม่เผยใน Public Aggregate

Source: [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs); [G-19 Close/Reopen](../docs/workflow/g19-close-reopen.md)

## 5. สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI

### 5.1 ชื่อหน้าและข้อมูลที่เห็นจริง

- **เมนูด้านซ้าย:** `สร้างรายงานสอบสวนโรค`
- **ชื่อหน้า:** `สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI`
- **คอลัมน์ในตาราง:** `วันรับแจ้ง` · `โรค/เหตุการณ์` · `หมู่บ้าน/พื้นที่` · `รายละเอียด` · `รายงาน`

ทั้งตารางนี้และตาราง Event ของผู้มีสิทธิ์สร้างรายงานใช้ปุ่ม Report Action **เพียงหนึ่งชุดต่อแถว** ตาม G-33

### 5.2 ปุ่มเดียวตามสถานะทะเบียน (G-33)

| สถานะที่ยืนยันได้ | การทำงาน |
| --- | --- |
| `ReportRegistry` มี 0 รายงาน | `สร้างรายงาน AI` — ตรวจทะเบียนซ้ำก่อนเริ่มสร้างฉบับแรก |
| มี 1 รายงาน | `ดูรายงาน` — เปิดประวัติของเหตุการณ์ |
| มี N รายงาน (N มากกว่า 1) | `ดูรายงาน (N)` — เปิดประวัติครบตามทะเบียน |
| งานของเหตุการณ์นี้กำลังดำเนินการ | เปิดดูสถานะงานเดียวกัน เช่น `กำลังสร้างรายงาน · ดูสถานะ` หรือ `กำลังบันทึก · ดูสถานะ` |
| งานเหตุการณ์อื่นกำลังทำอยู่ | ปุ่มไม่เริ่มงานใหม่และแสดงว่ามีงานอื่นอยู่ |
| ทะเบียน/เครือข่าย/Job ยังตรวจสอบไม่ได้ | `ตรวจสอบสถานะรายงาน` / `ตรวจสอบทะเบียนรายงาน` ไม่ถือว่าเป็น 0 รายงานและไม่สร้างซ้ำเอง |

Browser เรียก `getReportSummariesForEvents(sessionToken, eventIds)` เป็นชุดไม่เกิน **500 EventIDs ต่อ RPC** มีการจัด Batch และ Session Guard; Server ตอบ `count`, `latestSourceRevision`, `invalidCount` โดยไม่ส่ง Narrative, Prompt หรือ Document URL ใน Summary หากข้อมูลทะเบียนไม่สมบูรณ์จะ Fail Closed

### 5.3 ประวัติรายงานของเหตุการณ์ (G-17 + G-27 + G-33)

Modal ชื่อ `รายงานของเหตุการณ์` เรียก `listReportsForEvent(sessionToken,eventId)` (Permission `report`) เพื่ออ่าน `ReportRegistry` ตาม EventID แสดงฉบับใหม่ก่อน รายงานหลายฉบับคงอยู่เป็นคนละ `ReportID`; แสดงข้อมูล GeneratedAt/By, SourceRevision, Model/API, PromptVersion และลิงก์ `เปิด Google Doc` เฉพาะ URL ที่ผ่านการตรวจรูปแบบและ DocumentID

ถ้า Event Revision ใหม่กว่ารายงานล่าสุดมีข้อความ `ข้อมูลเหตุการณ์มีการปรับปรุงหลังสร้างรายงานล่าสุด` ไม่ได้แปลว่าต้องลบหรือเขียนทับรายงานเดิม

เมื่อมีรายงานในทะเบียน ผู้ใช้สามารถกด `สร้างรายงานฉบับใหม่` → Modal `ยืนยันสร้างรายงานฉบับใหม่` → `กลับไปดูรายงาน` หรือ `ยืนยันสร้างฉบับใหม่`; ระบบตรวจทะเบียนซ้ำเพื่อแยก **ความตั้งใจสร้างฉบับใหม่** จากความผิดพลาดที่กดซ้ำ และคงรายงานเก่าทุกฉบับไว้

**หมายเหตุ:** เอกสาร Google Docs ที่สร้างก่อนมี G-17 อาจไม่มีแถวใน `ReportRegistry` ระบบไม่เดา EventID/Backfill ให้เองและไม่แสดงว่าเป็นประวัติที่ยืนยันได้

### 5.4 การตรวจความพร้อม (G-26)

ก่อนสร้างใช้ `getAIReportReadiness(sessionToken,eventId)` ตรวจ Event ล่าสุดและแสดงระดับ `ready`, `review` หรือ `limited` พร้อมคำเตือน

- Core fields เช่น วันรับแจ้ง โรค/เหตุการณ์ ตำแหน่งที่เกิดเหตุหรือที่ตั้ง และรายละเอียดเหตุการณ์
- Important fields เช่น แหล่งแจ้ง วันที่เริ่มป่วย การตรวจสอบ ความเสี่ยง เกณฑ์สอบสวน มาตรการ หน่วยงาน และวันที่ลงสอบสวนตามเงื่อนไข
- Consistency warnings จาก Event

ระดับ `review/limited` แสดง Modal `ความพร้อมก่อนสร้างรายงาน AI` ให้ `กลับไปตรวจข้อมูล` หรือ `สร้างรายงานต่อ` คำเตือน **ไม่ใช่ Hard Block, ไม่ใช่การรับรองความถูกต้อง และไม่ใช่ระบบอนุมัติ**; รายงานเป็นร่างที่ต้องตรวจทานโดยคน

### 5.5 การสร้างเอกสารและหลักฐาน (G-17 / G-31)

`runReportJob` ควบคุมการทำงานจริงภายใน Server ผ่าน `generateReportFromWeb` ที่ต้องมี Private Execution Nonce ซึ่ง Browser เรียกตรงเพื่อข้าม Job ไม่ได้ ระบบอ่าน Snapshot ของ Event พร้อม Revision, ใช้ Prompt 2 ส่วน (หัวข้อ 1–3 และ 4–6) แล้วคัดลอก Template เป็น **Google Doc ใหม่** ใน Report Folder และบันทึกผลลง `ReportRegistry` แบบ Append-only

เส้นทางสร้างรายงานใช้ `models/gemini-3.8-flash` เท่านั้น ไม่สลับโมเดลอื่นหากไม่พร้อม; G-32 V8 อาจ Retry **HTTP 503 ได้สูงสุดหนึ่งครั้งต่อส่วน** ภายใต้ Time Budget โดยไม่ Retry HTTP 429 หรือ Error อื่นอัตโนมัติ ผลสำเร็จบันทึก ReportID, EventID, SourceRevision, DocumentID/URL, ผู้สร้าง, เวลาสร้าง, โมเดล/เวอร์ชัน API ที่สำเร็จจริง, PromptVersion และ TemplateDocID

ถ้าสร้าง Google Doc แล้วแต่ Append Registry ไม่สำเร็จ มี Compensation เพื่อย้ายเอกสารใหม่ไป Trash; เมื่อ Registry Commit แล้วแต่ Audit เขียนไม่สำเร็จ Server บันทึกคำเตือนเชิงปฏิบัติการแทนการกล่าวเท็จว่าการสร้างรายงานล้มเหลว

### 5.6 Job Tracking, การยกเลิกและความไม่แน่นอน (G-32)

`createReportJob` / `getReportJobStatus` / `getCurrentReportJob` / `cancelReportJob` / `dismissReportJob` ใช้ Script Properties เก็บ JobID, EventID, Owner และสถานะขั้นต่ำ **ไม่ใช่ Report History**; ประวัติถาวรอยู่ที่ `ReportRegistry`

สถานะ: `queued` → `running` → `finalizing` → `completed` หรือ `cancel_requested` → `cancelled`; มี `failed` และ `unknown` สำหรับผลที่ยืนยันไม่ได้

- มีได้ **หนึ่ง Report Job ที่กำลังทำงานต่อหนึ่ง Apps Script Project**; การกดซ้ำโดยเจ้าของงานคืน Job เดิม ไม่เปิดงานใหม่
- กด `ปิดหน้าต่าง · ทำงานต่อ` เพื่อย่อ Modal ขณะหน้าเว็บยังเปิดอยู่ และเปิดกลับจาก Indicator; ไม่ใช่ Background Queue ถาวร
- `ยกเลิกการสร้าง` เปิด `ยืนยันยกเลิกการสร้างรายงาน`; ถ้า Gemini กำลังประมวลผลจะเป็น `cancel_requested` และหยุดที่ Safe Checkpoint ถัดไป; ช่วง `finalizing` ยกเลิกไม่ได้แล้ว
- `unknown` หรือ Network Timeout **ไม่ใช่หลักฐานว่ารายงานไม่ถูกสร้าง** ต้องตรวจ Current Job และประวัติใน Registry ก่อนสร้างใหม่
- Job Metadata มีอายุประมาณ 24 ชั่วโมง; งานที่ไม่จบตามกรอบประมาณ 8 นาทีอาจเป็น `unknown`; Browser ไม่สามารถรับประกันว่า Google Apps Script จะทำงานต่อเมื่อปิด Tab
- หลัง `completed` ระบบแสดง `เปิด Google Doc` เมื่อ Server ยืนยันผลแล้ว

Source: [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`06-gemini-and-prompts.gs`](../src/server/06-gemini-and-prompts.gs), [G-17](../docs/governance/g17-report-registry.md), [G-26](../docs/governance/g26-ai-report-readiness.md), [G-27](../docs/governance/g27-event-report-history.md), [G-32](../docs/deployment/g32-report-jobs.md), [G-33](../docs/ux/g33-single-report-action.md)

## 6. Supporting Functions

### 6.1 Google Drive Attachments

`EventAttachments` ผูกกับ EventID และ AttachmentID; Permission `view` ดู/ดาวน์โหลด; `edit` อัปโหลด; `delete` นำไฟล์ออก ใช้ `expectedRevision` สำหรับการเปลี่ยนแปลง ขนาดสูงสุด **5 MB** รองรับ **PDF, JPG/JPEG, PNG, WEBP, DOCX และ XLSX** พร้อมตรวจ File Signature ก่อนบันทึก

ไฟล์จัดเก็บในโฟลเดอร์จัดการโดยระบบบน Google Drive ที่ไม่เปิดสาธารณะเหมือนโลโก้; ผู้ใช้ดาวน์โหลดผ่าน RPC ที่ตรวจสิทธิ์. การนำไฟล์ออกปรับ `Status=removed` เก็บ `RemovedAt/By/Reason` และยังคงไฟล์ Drive ไม่ใช่ Hard Delete. Event `closed` ดู/ดาวน์โหลดได้ แต่เพิ่มหรือนำออกไม่ได้

**ความต่างจากเอกสาร P4 รุ่นเก่า:** Current v7 ใช้ `EventAttachments` **13 คอลัมน์** และสถานะ `removed` แทน Schema `archived` แบบ Legacy ห้ามสรุปว่า Migrated/เทียบเท่ากันแล้ว

### 6.2 Audit Logs และ Archive

`AuditLogs` มี 10 คอลัมน์รวม UUID `AuditID`; Server เขียน Action/Target/Before/After ตามการดำเนินการสำคัญ ผู้มี `audit` ดูรายการและสั่ง `Archive รายการเก่า` ได้ โดยค่า Retention เริ่มต้น **365 วัน** (สามารถมีค่าที่เก็บไว้เดิม)

ระบบ G-21 จัดเก็บลง **Google Spreadsheet แยกที่เป็น Private** ภายใต้โฟลเดอร์ระบบ โดยแยก Tab เป็น `Y2025`, `Y2026` ฯลฯ ทำลำดับ Copy → Verify → Delete Source สำหรับรายการที่ย้ายสำเร็จ และออก Audit Summary ในชีตหลัก ไม่มี Automatic Purge / Scheduled Archive

### 6.3 VisitLogs

`VisitLogs` ปัจจุบันมี `Timestamp | EntryPoint | LegacyRequestParams` การเปิดเว็บใหม่บันทึกเวลา, `doGet`, คอลัมน์ 3 ว่าง; ไม่บันทึก Query Parameters ใหม่, User-Agent, IP หรือ Session Token ค่า Legacy ที่มีอยู่ก่อนอัปเกรดไม่ได้ถูกลบเองโดย Migration

### 6.4 MasterData และ AreaMaster

`MasterData` ใช้ Type: `surveillance`, `disease_group`, `event_type`, `verify_status`, `criteria`, `risk`, `content_category`. ผู้มี `master` จัดการ Type ที่อนุญาตได้ โดย Identity คือ `Type + Value`; ห้ามแก้ Identity เดิมและไม่ Hard Delete. `verify_status`/`criteria` เป็นค่าเชิงความหมายของระบบ จึงเพิ่ม Value ใหม่หรือปิด Active ไม่ได้; ปรับได้เฉพาะ Label/SortOrder. ค่าเดิมที่ Inactive ยังอยู่ในข้อมูล Historical

`AreaMaster` มีข้อมูลจังหวัด อำเภอ ตำบล หมู่ ชื่อหมู่บ้านและรหัสหมู่บ้าน; เพิ่ม/แก้ไข/ปิดใช้งานโดยไม่ลบแถว และ `Import Excel/CSV` ผ่าน Browser ได้ (RPC `importAreas` รับสูงสุด 500 รายการ/ครั้ง)

### 6.5 Content Management, Settings และ Administrator

หน้า `การจัดการระบบ` รองรับ ContentLibrary สำหรับประกาศ/แนวทาง/คู่มือ (สถานะ `draft` / `published`), ชื่อระบบ คำอธิบาย ชื่อหน่วยงาน ข้อมูลติดต่อ Banner สีหลัก/รอง โลโก้ PNG/JPEG/WEBP ≤3 MB การเปิด/ปิดการบันทึก การสมัครสมาชิก Gemini API Key, TemplateDocID, Report Folder ID, Users, Areas, MasterData, สถานะ Installer/Repair และ Audit

`getAppBoot` ส่งเฉพาะ Public Settings ที่ Allowlist; ไม่ส่ง `GEMINI_API_KEY` กลับสู่ Public Boot. `saveSystemSettings` ป้องกันไม่ให้ Generic Editor เปลี่ยน System/Database/Archive IDs และ Retention บางค่า; การตั้งค่าของผู้ดูแลต้องเก็บเป็นความลับและจำกัดการเข้าถึง Apps Script/Sheet

### 6.6 Export และ Dashboard Image

Dashboard มีปุ่ม `บันทึกรูปภาพ`; หลังล็อกอินมีรายการเหตุการณ์และปุ่ม `Excel` ฝั่ง Browser และ `Export จากระบบ` ฝั่ง Server. `exportData(sessionToken, format)` ต้องมี `export` และ **สร้าง Google Spreadsheet ใหม่พร้อม URL** ไม่ใช่การส่งไฟล์ XLSX binary กลับจาก Server โดยตรง; ค่า `format` เป็นข้อมูลตอบกลับเท่านั้น

Source: [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [G-21](../docs/governance/g21-audit-retention.md), [G-24](../docs/governance/g24-masterdata-admin.md), [G-29](../docs/governance/g29-visitlogs-semantics.md)

## 7. Data Model และความสัมพันธ์

### 7.1 โครงสร้างข้อมูล Current v7

| ที่เก็บ / Sheet | ความหมายและข้อกำหนด |
| --- | --- |
| `MainData` | **39 คอลัมน์**: Business 1–30; `EventID, Revision, RecordStatus, CreatedAt, CreatedBy, VoidedAt, VoidedBy, VoidReason` เป็นคอลัมน์ 31–38; `OwnerUserID` คอลัมน์ 39 |
| `UserAccounts` | UserID, Name, Email, PasswordHash, Role, Status, พื้นที่/หน่วยงาน และประวัติสมัคร/อนุมัติ/เข้าใช้ |
| `SystemSettings` | Key/Value/Description/UpdatedAt/UpdatedBy; รวมค่า Config และ Google Workspace asset IDs ที่ต้องจำกัดสิทธิ์ |
| `MasterData` | Type, Value, Label, SortOrder, Active, UpdatedAt/By |
| `AreaMaster` | AreaID, จังหวัด/อำเภอ/ตำบล/หมู่/หมู่บ้าน/รหัสหมู่บ้าน, Active, UpdatedAt/By |
| `ContentLibrary` | ContentID, Category, Title, Description, URL, FileID, Status, SortOrder, timestamps |
| `EventAttachments` | **13 คอลัมน์**: AttachmentID, EventID, FileID, FileName, MimeType, SizeBytes, Description, Status, UploadedAt/By, RemovedAt/By/Reason |
| `ReportRegistry` | **11 คอลัมน์**: ReportID, EventID, SourceRevision, DocumentID/URL, GeneratedAt/By, GeminiModels, GeminiApiVersions, PromptVersion, TemplateDocID; Append-only |
| `AuditLogs` | **10 คอลัมน์** รวม `AuditID`; Archive อยู่ **Spreadsheet แยก** และ Tab รายปี |
| `VisitLogs` | `Timestamp, EntryPoint, LegacyRequestParams`; ข้อมูลใหม่ไม่เก็บค่า Request Query |
| `ScriptProperties` | Job Status G-32 ชั่วคราว, Runtime identifiers และ Config ภายใน; ไม่ใช่ Database ของรายงาน |

### 7.2 Identity และ Data Safety

`EventID` เป็น Identity ถาวรของ MainData; `ReportRegistry.EventID` เชื่อมไปยัง Event เดิม; `ReportID` เป็น Identity ใหม่ทุกครั้งที่สร้าง Report; `SourceRevision` บันทึก Version ของ Event ในขณะสร้างรายงาน ส่วน `JobID` เป็น Identity การประมวลผลชั่วคราว ไม่ใช่ ReportID หรือเอกสารสำเร็จ

`Revision` เพิ่มเมื่อเปลี่ยนข้อมูลเหตุการณ์หรือหลักฐานที่กระทบ Event; การสร้างรายงาน **ไม่เพิ่ม Event Revision**. การยกเลิก Event เป็น `void`, การนำไฟล์แนบออกเป็น `removed`, การสร้างรายงานใหม่เป็น Append-only, การ Archive Audit ต้องตรวจการ Copy ก่อนลบแถวเดิม. ห้ามดัดแปลงข้อมูล/ความหมายของ Historical Rows เพื่อให้ผ่าน Schema ปัจจุบันโดยพลการ

### 7.3 Version, Migration และ Privacy

- **App version** (`CONFIG.VERSION`) แยกจาก **Schema version** (`7`) และ **Prompt version** (`2026.10.06.1`)
- Migration functions ใน Source อาทิ `migrateP1EventIdentity`, `migrateG05EventOwner`, `migrateG11EventAttachments`, `migrateG21AuditRetention`, `migrateG29VisitLogs`, `migrateG17ReportRegistry` ไม่ได้หมายความว่าอนุญาตให้รันกับ Database ที่มีข้อมูลจริงแล้ว
- Legacy P4→v7 มี Schema/ความหมายต่างกัน เช่น Closure Metadata, Archived Attachment และ AuditArchive; **Historical Migration ยัง HOLD** ตาม [Migration Readiness](../docs/integration/p4-v7-migration-readiness-2026-10-09.md) และ [Migration Policy](../docs/governance/migration-version-release-policy.md)
- ข้อมูลสุขภาพ รายละเอียดเหตุการณ์ API Key, Session Token, Document/Spreadsheet Identifiers และ Audit ถือเป็นข้อมูลที่ต้องควบคุมการเข้าถึง ไม่ส่งขึ้น GitHub, Test Fixtures หรือ Execution Logs แบบระบุตัวบุคคล

Source Schema: [`00-bootstrap.gs`](../src/server/00-bootstrap.gs), [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs)

## 8. Feature Status Matrix

นิยามคอลัมน์: **Source** = พบฟังก์ชัน/หน้าจอใน `main`; **Automated** = มีการครอบคลุมโดย Tests/Contracts ใน Repository (ไม่ได้หมายถึง Live E2E); **Deployed UI** = หลักฐานที่ Product Owner รายงานจากหน้าจอ, ไม่ใช่ Independent Artifact-Parity Verification. เครื่องหมาย `—` คือ **ยังไม่มีหลักฐานเฉพาะรายการจาก Handoff** ไม่ใช่ Fail หรือ Unimplemented

| Feature | Implemented in Source | Verified by Automated Tests / Coverage | Observed in Deployed UI |
| --- | --- | --- | --- |
| Public Aggregate + Privacy/KPI | Yes | P2/G-23/Integration P2 | — |
| Login/Logout/User Permissions | Yes | Integration P2 + G-33 Session cases | — |
| EventID / Revision / Soft Void | Yes | P1/G-03 | — |
| Lifecycle, Owner, Close/Reopen, Warnings | Yes | G-03/G-04/G-05/G-19 + P3 | — |
| Event Attachments | Yes | G-11/P4 | — |
| MasterData / AreaMaster / Admin | Yes | G-24/P4 (MasterData); AreaMaster มี Source | — |
| Content / System Settings / Export | Yes | P4 contract บางส่วน; ไม่อ้าง Full Live E2E | — |
| Audit Retention / Archive | Yes | G-21 | — |
| VisitLogs Semantic Cleanup | Yes | G-29 | — |
| G-17 ReportRegistry + G-27 History | Yes | G-17/G-27 | Operator รายงานเส้นทาง History ผ่าน UI Smoke |
| G-26 Advisory Readiness | Yes | G-26 | — |
| G-31/G-32 Gemini/Job/Cancel/Retry | Yes | G-31/G-32/V8 mocked regression | — |
| G-33 Single Report Action/New Draft | Yes | G-33 mocked regression | Operator รายงานปุ่มรายงานและประวัติผ่าน UI Smoke |
| One-Click Source/Build Parity | Yes | G-30 contract + CI | ไม่ใช่การพิสูจน์ Deployed Parity |

**หลักฐานรวม ณ Baseline:** PR #64 และ #67 Merge แล้ว; ก่อน Merge #67 รายงาน Automated Tests **334/334 PASS**; GitHub Actions หลัง Merge สำเร็จ; Product Owner รายงาน Deploy ใหม่และ **Basic UI Smoke 12/12 PASS** เท่านั้น อย่ากระจาย 12 รายการนั้นเป็น PASS รายฟีเจอร์โดยไม่มี Evidence

### 8.1 Planned / Deferred / Not Supported

| สถานะ | ความสามารถหรือข้อจำกัด |
| --- | --- |
| **Planned / Deferred** | Historical P4→v7 Migration พร้อม Backup, Mapping, Review, Operator Approval; ยังไม่อนุญาตให้ทำกับข้อมูลจริง |
| **Deferred / Not independently verified** | การยืนยัน Deployed SHA/Artifact Parity และ Full End-to-End ทุกเส้นทาง; ในรอบ Documentation นี้ไม่เปิด Browser UAT ใหม่ตามคำสั่ง Product Owner |
| **Not Supported / Out of Scope** | Report Approval/Sign-off/Document Replacement, Automatic Medical Diagnosis, HIS/LIS, Full Contact Tracing/Case Management, Task/SLA/Escalation Engine, Persistent Distributed Job Queue |
| **Not Supported / Out of Scope** | การเปิด Public Access ให้ Raw MainData/Attachment, Auto-backfill เอกสารรายงานเก่าที่ไม่มีทะเบียน, การแก้ Registry Row เก่าเพื่อเปลี่ยนรายงานฉบับเดิม |
| **Not Supported** | อนุมานว่า `npm test`, GitHub Merge หรือการ Deploy Reported เท่ากับการอนุญาต Migration หรือเป็นหลักฐาน Production Live E2E |

## 9. เอกสารอ้างอิงและหลักในการอ่าน

**ลำดับความน่าเชื่อถือสำหรับ "ทำอะไรได้จริงในปัจจุบัน":** (1) Source/Tests ที่ SHA ข้างต้น → (2) เอกสาร Current Implementation ฉบับนี้ → (3) Contract/Governance รุ่นปัจจุบันที่สอดคล้อง Source → (4) Baseline, Roadmap และ Stacked-PR Design ที่อาจสะท้อนสถานะก่อน Merge

- [README.md](../README.md) — ภาพรวม/ติดตั้ง/ลิงก์เริ่มต้น
- [AGENTS.md](../AGENTS.md) — ขอบเขตและกฎสำหรับ AI Agents รวม Context7
- [`src/server/`](../src/server/) และ [`src/web/`](../src/web/) — Implementation จริง
- [Architecture](../docs/architecture/) · [Governance](../docs/governance/) · [Deployment](../docs/deployment/)
- [UX G-33](../docs/ux/g33-single-report-action.md) · [Roadmap](../docs/roadmap/group-a-b-development-plan.md)
- [P4→v7 Migration Design](../docs/integration/p4-to-v7-migration-design-2026-10-09.md) และ [Readiness HOLD Matrix](../docs/integration/p4-v7-migration-readiness-2026-10-09.md)

เอกสารนี้เป็น **Description / Reference** ไม่มีการเปลี่ยน Source, Runtime, Schema, Deployment หรือ Migration ในการจัดทำ
