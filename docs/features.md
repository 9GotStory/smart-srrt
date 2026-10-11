# Smart SRRT — Feature Reference ฉบับสมบูรณ์ (Current Source)

> **เอกสารอ้างอิง Current Implementation** ณ 11 ตุลาคม 2026  
> Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt) · Baseline: `main@1486211d0cbbcd8bc772dda6a5d9ab2d2a32f778`  
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

**ข้อจำกัดของ Public Aggregate:** Source ปัจจุบันไม่ได้กำหนด Small-cell Suppression หรือ Minimum Reporting Threshold ใน `buildDashboardAggregate_`; การแสดงจำนวนรายหมู่บ้านและหมวดข้อมูลที่มีเหตุการณ์น้อยอาจเกิดความเสี่ยงต่อการอนุมานตัวบุคคลได้ การไม่ส่ง Raw Rows ช่วยจำกัดข้อมูลแต่ **ไม่เท่ากับการรับรองว่าไม่มีความเสี่ยงต่อการระบุตัวบุคคล**. นี่เป็นข้อสังเกตเชิง Privacy จากการตรวจ Source ไม่ใช่การกล่าวว่ามีฟีเจอร์ปกปิด Small Cell แล้ว

> หมายเหตุเชิง Implementation: `getAnalytics(sessionToken)` ของส่วน Admin มีชุดตัวนับภายในของตนเอง โดยค่า `investigated` นับเหตุการณ์ที่มี `col26` แม้ไม่เข้าเกณฑ์ ไม่ควรนำไปแทนความหมาย KPI `ลงสอบสวนโรคแล้ว` บน Dashboard โดยไม่ปรับนิยาม

Source: [`src/server/03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [P2 Privacy/KPI Contract](./architecture/p2-privacy-kpi-contract.md)

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

**ข้อควรระวังการอ่านเอกสารเดิม:** [P3 Workflow Contract](./architecture/p3-lightweight-workflow-contract.md) อธิบาย schema/WorkflowStatus แบบที่ต่างจาก `main` ปัจจุบัน รวมถึงคอลัมน์ 39–44 จึงห้ามยกมาเป็นโครงสร้างฐานข้อมูลที่ Deploy ได้ใน v7 โดยไม่ตรวจสอบ Mapping/Migration

### 4.4 Consistency Warnings

`deriveEventConsistencyWarnings_` แจ้งข้อสังเกตเมื่อค่าขัดกันโดยไม่บังคับให้ปิดงาน เช่น ตรวจสอบแล้วไม่จริงแต่เข้าเกณฑ์, ไม่เข้าเกณฑ์แต่มีวันลงสอบสวน, ระบุไม่ลงสอบสวนแต่มีวันลงสอบสวน, ระบุลงสอบสวนแต่ไม่มีวัน หรือมีวันที่ดำเนินมาตรการแต่ไม่มีรายละเอียด ผลเตือนแสดงกับ Event ที่ผู้มีสิทธิ์เปิดอ่านได้ ไม่เผยใน Public Aggregate

Source: [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs); [G-19 Close/Reopen](./workflow/g19-close-reopen.md)

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

ถ้าสร้าง Google Doc แล้วแต่ Append Registry ไม่สำเร็จ มี Compensation เพื่อย้ายเอกสารใหม่ไป Trash; เมื่อ Registry Commit แล้ว การสร้างรายงานถือเป็นผลสำเร็จและไม่ย้อนกลับเพียงเพราะ Audit มีปัญหา **ข้อจำกัดที่ต้องรู้:** `writeAudit_` จับ Exception ภายในโดยไม่ส่งต่อ จึงไม่อาจอ้างจากผลสร้างรายงานสำเร็จว่า Audit Entry ถูกเขียนครบแน่นอน ต้องตรวจหลักฐาน Audit แยกเมื่อจำเป็น

### 5.6 Job Tracking, การยกเลิกและความไม่แน่นอน (G-32)

`createReportJob` / `getReportJobStatus` / `getCurrentReportJob` / `cancelReportJob` / `dismissReportJob` ใช้ Script Properties เก็บ JobID, EventID, Owner และสถานะขั้นต่ำ **ไม่ใช่ Report History**; ประวัติถาวรอยู่ที่ `ReportRegistry`

สถานะ: `queued` → `running` → `finalizing` → `completed` หรือ `cancel_requested` → `cancelled`; มี `failed` และ `unknown` สำหรับผลที่ยืนยันไม่ได้

- มีได้ **หนึ่ง Report Job ที่กำลังทำงานต่อหนึ่ง Apps Script Project**; การกดซ้ำโดยเจ้าของงานคืน Job เดิม ไม่เปิดงานใหม่
- กด `ปิดหน้าต่าง · ทำงานต่อ` เพื่อย่อ Modal ขณะหน้าเว็บยังเปิดอยู่ และเปิดกลับจาก Indicator; ไม่ใช่ Background Queue ถาวร
- `ยกเลิกการสร้าง` เปิด `ยืนยันยกเลิกการสร้างรายงาน`; ถ้า Gemini กำลังประมวลผลจะเป็น `cancel_requested` และหยุดที่ Safe Checkpoint ถัดไป; ช่วง `finalizing` ยกเลิกไม่ได้แล้ว
- `unknown` หรือ Network Timeout **ไม่ใช่หลักฐานว่ารายงานไม่ถูกสร้าง** ต้องตรวจ Current Job และประวัติใน Registry ก่อนสร้างใหม่
- Job Metadata มีอายุประมาณ 24 ชั่วโมง; งานที่ไม่จบตามกรอบประมาณ 8 นาทีอาจเป็น `unknown`; Browser ไม่สามารถรับประกันว่า Google Apps Script จะทำงานต่อเมื่อปิด Tab
- หลัง `completed` ระบบแสดง `เปิด Google Doc` เมื่อ Server ยืนยันผลแล้ว

Source: [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`06-gemini-and-prompts.gs`](../src/server/06-gemini-and-prompts.gs), [G-17](./governance/g17-report-registry.md), [G-26](./governance/g26-ai-report-readiness.md), [G-27](./governance/g27-event-report-history.md), [G-32](./deployment/g32-report-jobs.md), [G-33](./ux/g33-single-report-action.md)

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

Source: [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [G-21](./governance/g21-audit-retention.md), [G-24](./governance/g24-masterdata-admin.md), [G-29](./governance/g29-visitlogs-semantics.md)

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
- Legacy P4→v7 มี Schema/ความหมายต่างกัน เช่น Closure Metadata, Archived Attachment และ AuditArchive; **Historical Migration ยัง HOLD** ตาม [Migration Readiness](./integration/p4-v7-migration-readiness-2026-10-09.md) และ [Migration Policy](./governance/migration-version-release-policy.md)
- ข้อมูลสุขภาพ รายละเอียดเหตุการณ์ API Key, Session Token, Document/Spreadsheet Identifiers และ Audit ถือเป็นข้อมูลที่ต้องควบคุมการเข้าถึง ไม่ส่งขึ้น GitHub, Test Fixtures หรือ Execution Logs แบบระบุตัวบุคคล

Source Schema: [`00-bootstrap.gs`](../src/server/00-bootstrap.gs), [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs)

## 8. Feature Evidence & Traceability — รายละเอียดตรวจสอบรายฟีเจอร์

ตาราง/หัวข้อด้านบนอธิบายพฤติกรรมใช้งาน ส่วนรายการด้านล่างทำหน้าที่เป็น **Implementation Inventory** เพื่อให้แต่ละฟีเจอร์มีการเชื่อม UI, สิทธิ์, ขั้นตอน, พฤติกรรมสำเร็จ/ผิดพลาด, Read/Write, RPC, Source, Tests และข้อจำกัดอย่างตรวจสอบย้อนกลับได้. ทุกข้อ F01–F23 คือ **Implemented in GitHub source `main@1486211d0cbb` / merged**; การมี Tests เป็นหลักฐาน Offline/Mock Contract ไม่ใช่ Production E2E. สำหรับสถานะ Runtime: **ยังไม่ได้ตรวจ Deployed SHA อย่างอิสระ**; มีเพียง Product Owner รายงาน UI Smoke ของ G-33, และ G-34 ยังไม่ผ่าน Cutover.

### F01 — Dashboard สาธารณะและ Privacy Boundary (P2)

- **หน้าจอ/เมนู:** `Dashboard` (ไม่ต้องเข้าสู่ระบบ)
- **ผู้ใช้และสิทธิ์:** Anonymous
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** เลือกวัน/จังหวัด/อำเภอ/ตำบล/หมู่บ้าน → `ค้นหา` หรือ `ล้างค่า`; สำเร็จได้เฉพาะข้อมูลสรุป, KPI, กราฟและ Smart Insights; อ่านไม่สำเร็จแสดงข้อความข้อผิดพลาด ไม่เปิดเผย Raw Rows
- **ข้อมูลอ่าน/เขียน:** อ่าน `MainData` แบบ non-void ผ่าน aggregate และข้อมูลพื้นที่; ไม่เขียน Event
- **Backend RPC / Function:** `getPublicDashboardData` → `getFilteredEventRows_`, `buildDashboardAggregate_`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`02-app-layout.html`](../src/web/02-app-layout.html), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`p2-privacy-kpi.test.mjs`](../tests/p2-privacy-kpi.test.mjs), [`integration-p2-auth-dashboard-parity.test.mjs`](../tests/integration-p2-auth-dashboard-parity.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F02/F09; ไม่ส่ง EventID/Revision/Narrative/DocumentURL; ไม่มี small-cell suppression; ห้ามอ้างว่า anonymous โดยสมบูรณ์
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F02 — Dashboard และรายการเหตุการณ์หลังเข้าสู่ระบบ

- **หน้าจอ/เมนู:** `Dashboard` → `รายการเหตุการณ์`
- **ผู้ใช้และสิทธิ์:** `view`: Staff/Admin/Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** Login → กรองข้อมูลและโหลด Dashboard → แสดง Event Rows และฟังก์ชันตาม Role; Session หมดอายุ/ไม่มีสิทธิ์ไม่คืน Raw Rows; Logout เคลียร์ข้อมูลและป้องกัน stale callback
- **ข้อมูลอ่าน/เขียน:** อ่าน `MainData`, `EventAttachments`, Owner metadata, `AreaMaster`; ไม่เขียน Event เมื่อเปิดดู
- **Backend RPC / Function:** `getDashboardData`, `getFilteredEventRows_`, `enrichEventOwners_`, `enrichEventAttachments_`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`integration-p2-auth-dashboard-parity.test.mjs`](../tests/integration-p2-auth-dashboard-parity.test.mjs), [`g33-logout-race-and-focus.test.mjs`](../tests/g33-logout-race-and-focus.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F03/F04/F06/F08/F21; รายการละเอียดไม่ใช่ Public API
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F03 — การเข้าสู่ระบบ สมัครสมาชิก Session และ RBAC

- **หน้าจอ/เมนู:** `เข้าสู่ระบบ`, `สมัครใช้งาน`, `ออกจากระบบ`
- **ผู้ใช้และสิทธิ์:** สมัครได้ถ้า ALLOW_SELF_REGISTER; user ใหม่ Staff/pending; ฝั่งผู้ใช้ต้อง active; ผู้ดูแลสิทธิ์ `users` เปลี่ยนบัญชี
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** Login ผ่านอีเมล/รหัสผ่าน → Token TTL 6 ชั่วโมง; ไม่ผ่าน/ยัง pending ถูกปฏิเสธ; Logout ล้าง Cache/Browser; Registration ปิดจะสมัครไม่ได้
- **ข้อมูลอ่าน/เขียน:** อ่าน/เขียน `UserAccounts`, `CacheService`, `SystemSettings`; ไม่คืน PasswordHash
- **Backend RPC / Function:** `login`, `logout`, `registerUser`, `getAppBoot`, `requireAuth_`, `hasPermission_`
- **Source:** [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs), [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-modals.html`](../src/web/03-modals.html)
- **Tests/Contract:** [`integration-p2-auth-dashboard-parity.test.mjs`](../tests/integration-p2-auth-dashboard-parity.test.mjs), [`g33-logout-race-and-focus.test.mjs`](../tests/g33-logout-race-and-focus.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** ทุกส่วนที่ต้องมีสิทธิ์; SHA-256 password hash ใน Source ไม่ใช่ adaptive salted hash/MFA
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F04 — บันทึก/แก้ไขข้อมูลเหตุการณ์, EventID/Revision (P1/G-03)

- **หน้าจอ/เมนู:** `บันทึก/แก้ไขข้อมูล` → `บันทึก/แก้ไขข้อมูลเหตุการณ์`, `เพิ่มข้อมูล`, `แก้ไข`
- **ผู้ใช้และสิทธิ์:** `create/edit`: Admin/Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** สร้าง EventID UUID/Revision=1; แก้โดย EventID + expectedRevision แล้วเพิ่ม Revision; ชน Revision หรือข้อมูล MasterData ไม่ถูกต้องต้องแก้/รีเฟรช ไม่ overwrite เงียบ
- **ข้อมูลอ่าน/เขียน:** เขียน `MainData` 1–39; อ่าน `MasterData`, `AreaMaster`; Audit mutation
- **Backend RPC / Function:** `addRecord`, `updateRecord`, `saveRowData_`, `findEventRowById_`, `validateEventMasterData_`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`p1-event-integrity.test.mjs`](../tests/p1-event-integrity.test.mjs), [`g03-event-lifecycle.test.mjs`](../tests/g03-event-lifecycle.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F05/F06/F07/F08/F17; Closed/void guards; Row number ไม่ใช่ stable identity
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F05 — สถานะเหตุการณ์และคำเตือนข้อมูลไม่สอดคล้อง (G-03/G-04/P3)

- **หน้าจอ/เมนู:** สถานะ/คำเตือนในตาราง `รายการเหตุการณ์` และหน้ารายงาน
- **ผู้ใช้และสิทธิ์:** อ่าน `view` หลังล็อกอิน
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** Server derive Lifecycle ตามข้อมูลจริง และขึ้นคำเตือนกรณีเกณฑ์/ผลตรวจ/วันสอบสวนขัดกัน; หากไม่มี Warning แสดงสถานะปกติ; ไม่บังคับแก้ก่อนบันทึก
- **ข้อมูลอ่าน/เขียน:** อ่าน `MainData`; เป็น derived metadata ไม่สร้าง WorkflowStatus column ใหม่
- **Backend RPC / Function:** `deriveEventLifecycle_`, `deriveEventConsistencyWarnings_`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g03-event-lifecycle.test.mjs`](../tests/g03-event-lifecycle.test.mjs), [`g04-consistency-warnings.test.mjs`](../tests/g04-consistency-warnings.test.mjs), [`p3-workflow.test.mjs`](../tests/p3-workflow.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F07/F17; ไม่ใช่ task/SLA escalation engine; historical P3 column map ต่างจาก v7
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F06 — มอบหมายผู้รับผิดชอบเหตุการณ์ (G-05)

- **หน้าจอ/เมนู:** `รายการเหตุการณ์` → `กำหนด` ผู้รับผิดชอบ
- **ผู้ใช้และสิทธิ์:** `assign`: Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** โหลด Active User Directory → เลือกหรือยกเลิก Owner → ตรวจ expectedRevision → เพิ่ม Revision + Audit; ผู้ใช้ไม่ active / event ปิด / revision ไม่ตรงถูกปฏิเสธ
- **ข้อมูลอ่าน/เขียน:** อ่าน `UserAccounts`; เขียน `MainData.OwnerUserID` col39 และ `AuditLogs`
- **Backend RPC / Function:** `listAssignableEventOwners`, `assignEventOwner`, `enrichEventOwners_`
- **Source:** [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-modals.html`](../src/web/03-modals.html)
- **Tests/Contract:** [`g05-event-owner.test.mjs`](../tests/g05-event-owner.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F07; migration `migrateG05EventOwner` เป็น explicit operator gate
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F07 — ปิด เปิดใหม่ และยกเลิกเหตุการณ์ (G-19/P1)

- **หน้าจอ/เมนู:** `ปิดเหตุการณ์`, `เปิดเหตุการณ์อีกครั้ง`, `ยกเลิก`
- **ผู้ใช้และสิทธิ์:** `close_event/delete`: Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** ต้องให้เหตุผลและ Revision ตรง; closed กลับมา active ได้ผ่าน Reopen; void เก็บประวัติ ไม่ลบแถว; invalid transition/ไม่มีสิทธิ์ต้อง error
- **ข้อมูลอ่าน/เขียน:** เขียน `MainData.RecordStatus`, `Revision`, `Voided*` เฉพาะ void; เขียน Audit
- **Backend RPC / Function:** `closeEvent`, `reopenEvent`, `deleteRecord`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g19-close-reopen.test.mjs`](../tests/g19-close-reopen.test.mjs), [`p1-event-integrity.test.mjs`](../tests/p1-event-integrity.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F06/F08/F18; closed ไม่แก้/แนบไฟล์จน reopen; void ถูกตัดจาก Active Event Views
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F08 — เอกสารแนบเหตุการณ์บน Google Drive (G-11)

- **หน้าจอ/เมนู:** `ไฟล์แนบ`, `แนบไฟล์`, ดู/ดาวน์โหลด/นำออก
- **ผู้ใช้และสิทธิ์:** `view` ดู/ดาวน์โหลด; `edit` upload; `delete` remove
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** ตรวจชนิด MIME+Signature/ขนาด ≤5 MB และ Revision; สร้าง Private Drive File + Registry; ไฟล์ไม่ผ่าน/เหตุการณ์ closed/สิทธิ์ผิดถูกปฏิเสธ; remove = status removed ไม่ลบไฟล์
- **ข้อมูลอ่าน/เขียน:** อ่าน/เขียน `EventAttachments` (13 columns), Drive Files, `MainData.Revision`, Audit
- **Backend RPC / Function:** `listEventAttachments`, `uploadEventAttachment`, `downloadEventAttachment`, `removeEventAttachment`
- **Source:** [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-modals.html`](../src/web/03-modals.html), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g11-event-attachments.test.mjs`](../tests/g11-event-attachments.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F07; ไม่ทำ public sharing และไม่รองรับไฟล์เกินขนาด
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F09 — KPI, กราฟ และ Smart Insights

- **หน้าจอ/เมนู:** `Dashboard`: KPI Cards, กราฟหมู่บ้าน/รายเดือน/กลุ่มโรค/ความเสี่ยง, `บันทึกรูปภาพ`
- **ผู้ใช้และสิทธิ์:** Public aggregate; authenticated ตาม `view`
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** รวมเฉพาะเกณฑ์ `เข้าเกณฑ์`; investigated = เข้าเกณฑ์และ col26 มีวัน; denom 0 => 0%; กราฟ/ข้อความเป็น deterministic ไม่เรียก Gemini; ถ้าข้อมูลไม่มีให้แสดงผลว่าง/0 ตามเงื่อนไข
- **ข้อมูลอ่าน/เขียน:** อ่าน `MainData`; Chart Rendering ฝั่ง Browser, ไม่เขียน
- **Backend RPC / Function:** `buildDashboardAggregate_`, `getPublicDashboardData`, `getDashboardData`, Browser `drawCharts`, `makePublicInsight`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g23-kpi-criteria.test.mjs`](../tests/g23-kpi-criteria.test.mjs), [`integration-p2-kpi-contract.test.mjs`](../tests/integration-p2-kpi-contract.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F01/F02/F16; Admin `getAnalytics` ใช้นิยาม `investigated` ต่างจาก Dashboard ห้ามสลับใช้
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F10 — จัดการพื้นที่และ MasterData (G-24)

- **หน้าจอ/เมนู:** `การจัดการระบบ` → `จัดการข้อมูลพื้นที่ระดับหมู่บ้าน`, `MasterData`, `Import Excel/CSV`
- **ผู้ใช้และสิทธิ์:** `master`: Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** เพิ่ม/แก้ไข/ปิดใช้งานค่าและพื้นที่; import areas ได้ ≤500 รายการต่อ RPC; value ที่เป็น semantic status จำกัดการเปลี่ยน; invalid/referenced value ถูกปฏิเสธ
- **ข้อมูลอ่าน/เขียน:** อ่าน/เขียน `MasterData`, `AreaMaster`; ประวัติ Event ยังรักษาค่าเก่า
- **Backend RPC / Function:** `getMasterData`, `getMasterDataAdmin`, `saveMasterDataItem`, `getAreaMaster`, `listAreas`, `saveArea`, `deleteArea`, `importAreas`
- **Source:** [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g24-masterdata-admin.test.mjs`](../tests/g24-masterdata-admin.test.mjs), [`p4-governance-current.test.mjs`](../tests/p4-governance-current.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F05/F09; ปิด Active แทนการ hard-delete
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F11 — บริหารผู้ใช้งานและการอนุมัติ

- **หน้าจอ/เมนู:** `การจัดการระบบ` → `จัดการผู้ใช้งาน`, ฟอร์ม Role/Status
- **ผู้ใช้และสิทธิ์:** `users`: Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** ค้นหา/แก้ไข Role, Status, พื้นที่และรหัสผ่าน; ผู้ใช้ pending ไม่เข้าใช้งานก่อน active; unauthorized/malformed patch ถูกปฏิเสธ
- **ข้อมูลอ่าน/เขียน:** อ่าน/เขียน `UserAccounts`; Audit mutation
- **Backend RPC / Function:** `listUsers`, `updateUser`, `registerUser`
- **Source:** [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`03-modals.html`](../src/web/03-modals.html)
- **Tests/Contract:** [`p4-governance-current.test.mjs`](../tests/p4-governance-current.test.mjs), [`integration-p2-auth-dashboard-parity.test.mjs`](../tests/integration-p2-auth-dashboard-parity.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F03/F06; ระบบไม่มี MFA และไม่ควรใช้ข้อมูลผู้ใช้จริงใน Test
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F12 — ประกาศ แนวทาง และคู่มือ (ContentLibrary)

- **หน้าจอ/เมนู:** เมนู `ประกาศ/แนวทาง/คู่มือ`; หน้า `ประกาศ แนวทาง และคู่มือ`
- **ผู้ใช้และสิทธิ์:** Public ดู published; ผู้มี `settings` จัดการ
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** ผู้ดูเว็บเห็น published เท่านั้น; ผู้ดูแลเพิ่ม/แก้ไขเป็น draft/published; invalid data/authorization ล้มเหลวต้องไม่เปิด draft สาธารณะ
- **ข้อมูลอ่าน/เขียน:** อ่าน/เขียน `ContentLibrary`; Public อ่าน published
- **Backend RPC / Function:** `getPublishedContent`, `listContent`, `saveContent`
- **Source:** [`02-auth-and-attachments.gs`](../src/server/02-auth-and-attachments.gs), [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [`02-app-layout.html`](../src/web/02-app-layout.html)
- **Tests/Contract:** [`p4-governance-current.test.mjs`](../tests/p4-governance-current.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F13; ไม่ใช่ CMS ภายนอก
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F13 — ตั้งค่าระบบ โลโก้ และตรวจสถานะติดตั้ง

- **หน้าจอ/เมนู:** `การจัดการระบบ` → `สถานะการติดตั้ง`, `ตั้งค่าชื่อระบบและโลโก้`, Gemini/Template Settings
- **ผู้ใช้และสิทธิ์:** `settings`: Manager/Super Admin; installer/migration เป็น Operator-only
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** อ่านสถานะ/ตั้งชื่อ สี ข้อความ/สถานะ open-closed/โลโก้; ตรวจ Installer ก่อน Repair; invalid settings/ไม่มีสิทธิ์ error; ห้ามถือ Repair ว่า read-only
- **ข้อมูลอ่าน/เขียน:** อ่าน/เขียน `SystemSettings`, Drive logo/system assets และ Spreadsheet metadata; Secret Key ไม่อยู่ Public Boot
- **Backend RPC / Function:** `getInstallationStatus`, `repairInstallation`, `getSystemSettings`, `saveSystemSettings`, `uploadLogo`, `installSmartSRRT`, `setupDatabase`
- **Source:** [`00-bootstrap.gs`](../src/server/00-bootstrap.gs), [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs)
- **Tests/Contract:** [`p4-governance-current.test.mjs`](../tests/p4-governance-current.test.mjs), [`p6-release-preflight.test.mjs`](../tests/p6-release-preflight.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F03/F19/F23; ไม่อนุญาต live install/repair/migration จากเอกสารนี้
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F14 — Audit Logs และ Archive Retention (G-21)

- **หน้าจอ/เมนู:** `การจัดการระบบ` → `Audit Logs`, `Archive รายการเก่า`
- **ผู้ใช้และสิทธิ์:** `audit`: Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** อ่านย้อนหลัง/แสดงสถานะ Retention → สั่ง Archive แบบมีสิทธิ์ → Copy/Verify/Delete rows ที่ตรวจแล้ว; copy/verify ไม่ผ่านต้องไม่ลบต้นทาง; ไม่ Auto Purge
- **ข้อมูลอ่าน/เขียน:** เขียน `AuditLogs` 10 columns, private Audit Archive Spreadsheet แยก tab ปี, summary
- **Backend RPC / Function:** `writeAudit_`, `listAuditLogs`, `getAuditRetentionStatus`, `archiveAuditLogs`, `archiveAuditLogsCore_`
- **Source:** [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs)
- **Tests/Contract:** [`g21-audit-retention.test.mjs`](../tests/g21-audit-retention.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F07/F08/F13; `writeAudit_` บางเส้นทางจับ error ภายใน: action สำเร็จไม่พิสูจน์ว่า Audit ถูกเขียนทุกครั้ง
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F15 — VisitLogs และการไม่เก็บ Request Query (G-29)

- **หน้าจอ/เมนู:** ไม่มีเมนูผู้ใช้ทั่วไป; Runtime Entry `doGet`
- **ผู้ใช้และสิทธิ์:** System-internal; ไม่เปิดอ่านให้ anonymous
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** เปิดเว็บ → เก็บ Timestamp, EntryPoint=`doGet`, ค่า LegacyRequestParams ใหม่เป็นค่าว่าง; ไม่เก็บ query ใหม่; migration ไม่ล้าง history เดิมเอง
- **ข้อมูลอ่าน/เขียน:** เขียน `VisitLogs` 3 columns
- **Backend RPC / Function:** `doGet`, `logVisit_`, `migrateG29VisitLogs` (migration gated)
- **Source:** [`00-bootstrap.gs`](../src/server/00-bootstrap.gs), [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs)
- **Tests/Contract:** [`g29-visitlogs-semantics.test.mjs`](../tests/g29-visitlogs-semantics.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F13/F23; ไม่มี page-view analytics ที่พิสูจน์ตัวบุคคล
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F16 — ส่งออกและบันทึกรูป Dashboard

- **หน้าจอ/เมนู:** `Excel`, `Export จากระบบ`, `บันทึกรูปภาพ`
- **ผู้ใช้และสิทธิ์:** `export` สำหรับ Data Export; Dashboard Capture ตามมุมมอง
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** Client Excel ใช้ Event ที่ได้รับสิทธิ์; Server Export สร้าง Spreadsheet พร้อม URL; Capture ใช้ html2canvas; ไม่มีสิทธิ์/ผิดพลาดต้องแสดง Error ไม่ปล่อย Raw ผ่าน Public RPC
- **ข้อมูลอ่าน/เขียน:** อ่าน filtered authenticated rows; Server export เขียน Google Spreadsheet ใหม่; ภาพดาวน์โหลดฝั่ง Browser
- **Backend RPC / Function:** `exportData`, Browser `exportClientExcel`, `captureDashboard`
- **Source:** [`04-admin-and-audit.gs`](../src/server/04-admin-and-audit.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`p2-privacy-kpi.test.mjs`](../tests/p2-privacy-kpi.test.mjs), [`p4-governance-current.test.mjs`](../tests/p4-governance-current.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F01/F02; Server export ไม่ใช่ XLSX binary response
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F17 — ความพร้อมก่อนสร้างรายงาน AI (G-26)

- **หน้าจอ/เมนู:** `สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI` → `ความพร้อมก่อนสร้างรายงาน AI`
- **ผู้ใช้และสิทธิ์:** `report`: Admin/Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** กดเริ่ม → Re-fetch readiness ล่าสุด: ready, review, limited; คำเตือนแสดง `กลับไปตรวจข้อมูล`/`สร้างรายงานต่อ`; ความไม่พร้อมไม่ใช่ Hard Block; RPC failure หยุด Preflight
- **ข้อมูลอ่าน/เขียน:** อ่าน Event ล่าสุดและ derived warnings; ไม่เขียน MainData
- **Backend RPC / Function:** `getAIReportReadiness`, `deriveAIReportReadiness_`, `deriveEventConsistencyWarnings_`
- **Source:** [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`03-events-and-dashboard.gs`](../src/server/03-events-and-dashboard.gs), [`03-modals.html`](../src/web/03-modals.html)
- **Tests/Contract:** [`g26-ai-report-readiness.test.mjs`](../tests/g26-ai-report-readiness.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F05/F18/F19/F21; ไม่รับรองข้อมูลทางการแพทย์
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F18 — ReportRegistry และประวัติรายงานหลายฉบับ (G-17/G-27)

- **หน้าจอ/เมนู:** `รายงานของเหตุการณ์`, `เปิด Google Doc`, `สร้างรายงานฉบับใหม่`
- **ผู้ใช้และสิทธิ์:** `report`: Admin/Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** อ่านประวัติเรียงฉบับใหม่ก่อน; ถ้ามีหลายฉบับยังคงทุก ReportID; URL/DocID ผิดหรือ Registry เสียต้อง fail-closed; สร้างใหม่ต้องยืนยันความตั้งใจ
- **ข้อมูลอ่าน/เขียน:** อ่าน `ReportRegistry` (11 cols) และ Event non-void; การ append ทำผ่าน F19; ไม่แก้/ลบ Registry เดิม
- **Backend RPC / Function:** `listReportsForEvent`, `getReportSummariesForEvents`, `appendReportRegistry_`
- **Source:** [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`03-modals.html`](../src/web/03-modals.html), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g17-report-registry.test.mjs`](../tests/g17-report-registry.test.mjs), [`g27-event-report-history.test.mjs`](../tests/g27-event-report-history.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F19/F20/F21; legacy Google Doc ที่ไม่มี Registry ไม่ auto-backfill
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Product Owner reported limited UI smoke; exact deployed SHA not verified.

### F19 — สร้างร่างรายงานผ่าน Gemini และ Google Docs (G-31/V8)

- **หน้าจอ/เมนู:** หน้า `สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI` → `สร้างรายงาน AI`; ผล `เปิด Google Doc`
- **ผู้ใช้และสิทธิ์:** `report`: Admin/Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** หลัง Preflight/Job guard: อ่าน Event Snapshot → Gemini 2 sections → คัดลอก Template เป็น Google Doc ใหม่ → append Registry; failure ระหว่าง finalization ชดเชยเอกสารที่ยังไม่ลงทะเบียน; Gemini error เป็น sanitized failure
- **ข้อมูลอ่าน/เขียน:** อ่าน `MainData`, settings/Template Drive; เขียน Google Docs ใหม่, `ReportRegistry`, Audit best effort
- **Backend RPC / Function:** `runReportJob`, `generateReportFromWeb` (private nonce), `analyzeWithGemini_`, `callGeminiForReport_`, `appendReportRegistry_`
- **Source:** [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`06-gemini-and-prompts.gs`](../src/server/06-gemini-and-prompts.gs)
- **Tests/Contract:** [`g31-ai-generation.test.mjs`](../tests/g31-ai-generation.test.mjs), [`g32-v8-retry.test.mjs`](../tests/g32-v8-retry.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F17/F18/F20/F21; `models/gemini-3.8-flash` only; bounded HTTP 503 one retry/part, no 429 automatic retry; output is draft, not approved report
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F20 — ติดตามงาน สั่งยกเลิก และกู้สถานะ Report Job (G-32)

- **หน้าจอ/เมนู:** `กำลังสร้างรายงาน`, `ปิดหน้าต่าง · ทำงานต่อ`, `ยกเลิกการสร้าง`, `รับทราบ`
- **ผู้ใช้และสิทธิ์:** `report` + ต้องเป็น Owner ของ Job
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** create queued → run → running/finalizing → completed; cancelling cooperative; unknown/timeout ต้อง recover status+registry ไม่ auto retry; ผู้อื่นห้ามดู/ยกเลิก Job
- **ข้อมูลอ่าน/เขียน:** ScriptProperties เก็บ Job metadata ชั่วคราว; ไม่ใช่ทะเบียนรายงาน; successful doc อยู่ F18
- **Backend RPC / Function:** `createReportJob`, `runReportJob`, `getReportJobStatus`, `getCurrentReportJob`, `cancelReportJob`, `dismissReportJob`
- **Source:** [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`03-modals.html`](../src/web/03-modals.html), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g32-report-job.test.mjs`](../tests/g32-report-job.test.mjs), [`g32-uat-modal-and-button.test.mjs`](../tests/g32-uat-modal-and-button.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F18/F19/F21; 1 active job ต่อ Project; Apps Script ไม่รับรอง background worker เมื่อปิด Tab; unknown ไม่ใช่ failed
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

### F21 — ปุ่มรายงานหนึ่งชุดต่อเหตุการณ์ (G-33)

- **หน้าจอ/เมนู:** ทั้งตาราง `รายการเหตุการณ์` และหน้า `สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI`
- **ผู้ใช้และสิทธิ์:** `report`: Admin/Manager/Super Admin
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** 0 = `สร้างรายงาน AI`; 1 = `ดูรายงาน`; N = `ดูรายงาน (N)`; in-flight/unknown = ดูสถานะ/ตรวจสอบ; lookup fail-closed; ยืนยัน `สร้างรายงานฉบับใหม่` ก่อนเริ่มอีกฉบับ
- **ข้อมูลอ่าน/เขียน:** อ่าน `ReportRegistry` summary ≤500 EventIDs/RPC; ไม่เขียนจน F19 สำเร็จ
- **Backend RPC / Function:** `getReportSummariesForEvents`, Browser `reportActionState`, `handleReportAction`, `preflightFirstReportGeneration`
- **Source:** [`05-reports-and-models.gs`](../src/server/05-reports-and-models.gs), [`04-browser-app.html`](../src/web/04-browser-app.html)
- **Tests/Contract:** [`g33-single-report-action.test.mjs`](../tests/g33-single-report-action.test.mjs), [`g33-logout-race-and-focus.test.mjs`](../tests/g33-logout-race-and-focus.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F17/F18/F20; ป้องกัน duplicate requests และ stale callbacks แต่ไม่ใช่หลักฐาน full live E2E
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Product Owner reported limited UI smoke; exact deployed SHA not verified.

### F22 — One-Click Compatibility และ Native Multi-file Package (G-30/G-34)

- **หน้าจอ/เมนู:** ไม่มีหน้าจอใหม่: tooling สำหรับผู้พัฒนา/ผู้ดูแล Apps Script
- **ผู้ใช้และสิทธิ์:** Developer/Reviewer; Deploy เฉพาะ Operator ที่ได้รับอนุมัติ
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** `npm run build:check` ตรวจ tracked One-Click; `npm run build:gas-multifile` สร้าง 13 ไฟล์ใน `dist/apps-script/` และ `npm run check:gas-multifile` ตรวจ parity; mismatch ต้อง FAIL; build ไม่ Deploy
- **ข้อมูลอ่าน/เขียน:** อ่าน `src/server/` 7 + `src/web/` 5; เขียนเฉพาะ generated dist เมื่อใช้ build; ไม่แตะ Workspace
- **Backend RPC / Function:** `tools/build-one-click.mjs`, `tools/build-apps-script-multifile.mjs`, `include`, `doGet`
- **Source:** [`build-one-click.mjs`](../tools/build-one-click.mjs), [`build-apps-script-multifile.mjs`](../tools/build-apps-script-multifile.mjs), [`00-bootstrap.gs`](../src/server/00-bootstrap.gs)
- **Tests/Contract:** [`g30-release-parity.test.mjs`](../tests/g30-release-parity.test.mjs), [`g34-multifile-parity.test.mjs`](../tests/g34-multifile-parity.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F13/F23; 7 .gs + 5 partials + Index.html = 13; no appsscript.json; V8 ordering/manifest/staging/human cutover required
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=G-34 package NOT runtime verified/deployed.

### F23 — Installer, Schema Check และ Explicit Migration (v7/P1/P4)

- **หน้าจอ/เมนู:** `การจัดการระบบ` → `สถานะการติดตั้ง`; Spreadsheet Apps Script menu ในส่วนที่เกี่ยวข้อง
- **ผู้ใช้และสิทธิ์:** Authorized Operator; ไม่ใช่การกระทำอัตโนมัติจาก GitHub
- **ขั้นตอน ผลสำเร็จ และข้อผิดพลาด:** ตรวจ install/migration prerequisites → backup/restore evidence + approval ก่อน mutation; schema mismatch/legacy data = HOLD; offline P4→v7 synthetic transform ไม่ใช่ live migration
- **ข้อมูลอ่าน/เขียน:** สร้าง/แก้ Google Sheets และ System Assets เฉพาะเมื่อ Operator อนุมัติ; historical data untouched ใน docs task
- **Backend RPC / Function:** `installSmartSRRT`, `setupDatabase`, `repairInstallation`, `migrateP1EventIdentity`, `migrateG05EventOwner`, `migrateG11EventAttachments`, `migrateG17ReportRegistry`, `migrateG21AuditRetention`, `migrateG29VisitLogs`
- **Source:** [`00-bootstrap.gs`](../src/server/00-bootstrap.gs), [`01-schema-and-db.gs`](../src/server/01-schema-and-db.gs), [`p4-v7-schema-preflight.mjs`](../tools/p4-v7-schema-preflight.mjs)
- **Tests/Contract:** [`p1-event-integrity.test.mjs`](../tests/p1-event-integrity.test.mjs), [`integration-p4-v7-migration-readiness.test.mjs`](../tests/integration-p4-v7-migration-readiness.test.mjs), [`p6-release-preflight.test.mjs`](../tests/p6-release-preflight.test.mjs) (coverage ใน source; ไม่รับรอง Live E2E)
- **สัมพันธ์กับ/ข้อจำกัด:** F04/F08/F14/F18/F22; Current Schema v7 != Historical P4; destructive/live migration forbidden without separate authorization
- **สถานะหลักฐาน:** Source=merged in main; Automated=มี Tests ตามลิงก์ (main CI success); Runtime=Not independently verified per feature.

## 9. Feature Status Matrix

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
| G-34 Native Multi-file Package (13 files) | Yes — merged PR #70 | G-34 parity + CI offline | **Not verified/deployed**; controlled deployment approval required |

**หลักฐานรวม ณ Baseline:** PR #64, #67 และ #70 รวมเข้า main; [GitHub Actions (main @ 1486211)](https://github.com/9GotStory/smart-srrt/actions/runs/38061906543) สำเร็จตาม workflow offline tests. Product Owner เคยรายงาน Deploy UI รอบ G-33 และ Basic UI Smoke 12/12 PASS แต่ยังไม่มี independent deployed-SHA verification; ไม่ใช่หลักฐานว่า G-34 ชุด 13 ไฟล์ Deploy แล้ว และไม่ใช่การทดสอบ Full E2E

### 9.1 Planned / Deferred / Not Supported

| สถานะ | ความสามารถหรือข้อจำกัด |
| --- | --- |
| **Planned / Deferred** | Historical P4→v7 Migration พร้อม Backup, Mapping, Review, Operator Approval; ยังไม่อนุญาตให้ทำกับข้อมูลจริง |
| **Deferred / Not independently verified** | G-34 manual staging/cutover, Deployed SHA/Artifact Parity และ Full End-to-End ทุกเส้นทาง; ในรอบ Documentation นี้ไม่เปิด Browser UAT ใหม่ตามคำสั่ง Product Owner |
| **Not Supported / Out of Scope** | Report Approval/Sign-off/Document Replacement, Automatic Medical Diagnosis, HIS/LIS, Full Contact Tracing/Case Management, Task/SLA/Escalation Engine, Persistent Distributed Job Queue |
| **Not Supported / Out of Scope** | การเปิด Public Access ให้ Raw MainData/Attachment, Auto-backfill เอกสารรายงานเก่าที่ไม่มีทะเบียน, การแก้ Registry Row เก่าเพื่อเปลี่ยนรายงานฉบับเดิม |
| **Not Supported** | อนุมานว่า `npm test`, GitHub Merge หรือการ Deploy Reported เท่ากับการอนุญาต Migration หรือเป็นหลักฐาน Production Live E2E |

## 10. เอกสารอ้างอิงและหลักในการอ่าน

**ลำดับความน่าเชื่อถือสำหรับ "ทำอะไรได้จริงในปัจจุบัน":** (1) Source/Tests ที่ SHA ข้างต้น → (2) เอกสาร Current Implementation ฉบับนี้ → (3) Contract/Governance รุ่นปัจจุบันที่สอดคล้อง Source → (4) Baseline, Roadmap และ Stacked-PR Design ที่อาจสะท้อนสถานะก่อน Merge

- [README.md](../README.md) — ภาพรวม/ติดตั้ง/ลิงก์เริ่มต้น
- [AGENTS.md](../AGENTS.md) — ขอบเขตและกฎสำหรับ AI Agents รวม Context7
- [`src/server/`](../src/server/) และ [`src/web/`](../src/web/) — Implementation จริง
- [Architecture](./architecture/) · [Governance](./governance/) · [Deployment](./deployment/)
- [UX G-33](./ux/g33-single-report-action.md) · [Roadmap](./roadmap/group-a-b-development-plan.md)
- [P4→v7 Migration Design](./integration/p4-to-v7-migration-design-2026-10-09.md) และ [Readiness HOLD Matrix](./integration/p4-v7-migration-readiness-2026-10-09.md)

**เพิ่มเติมสำหรับ G-34:** เอกสาร [Native Multi-file Deployment Candidate](deployment/g34-native-multifile-apps-script.md) ยังคงเป็นคู่มือ Authoritative สำหรับการทดลอง Staging และการ Rollback; `main` ปัจจุบันมีเครื่องมือสร้างแพ็กเกจแล้ว แต่ไม่มีหลักฐานว่ามีการ Cutover Google Apps Script ที่ใช้งานจริง. ปัจจุบัน Workflow `.github/workflows/tests.yml` ตรวจ One-Click parity, Multi-file build+check, RPC contracts, release preflight และ `npm test`.

เอกสารนี้เป็น **Description / Reference** ไม่มีการเปลี่ยน Source, Runtime, Schema, Deployment หรือ Migration ในการจัดทำ
