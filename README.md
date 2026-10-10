# Smart SRRT

**ระบบสนับสนุนการเฝ้าระวังเหตุการณ์ทางระบาดวิทยาและการสร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI**

Smart SRRT เป็น Web App สำหรับหน่วยงานสาธารณสุขระดับพื้นที่ ใช้รับแจ้งและติดตามเหตุการณ์ ประเมินข้อมูลเพื่อการเฝ้าระวัง จัดการหลักฐานประกอบ แสดงภาพรวมเชิงสถิติ และช่วยจัดทำ **ร่าง** รายงานสอบสวนโรคเบื้องต้นใน Google Docs ด้วย Gemini API

> **ขอบเขต:** ระบบเฝ้าระวังแบบ Event-based Surveillance ไม่ใช่ HIS/LIS, เวชระเบียนผู้ป่วย, ระบบจัดการเคส/ผู้สัมผัสเต็มรูปแบบ, เครื่องมือวินิจฉัย, ระบบอนุมัติรายงาน หรือระบบตอบสนองฉุกเฉินอัตโนมัติ รายงานจาก AI ต้องให้ผู้รับผิดชอบตรวจทานข้อเท็จจริงก่อนใช้งาน

## ความสามารถหลัก

| ส่วนงาน | ผู้ใช้งานเห็นอะไร / ใช้ทำอะไร |
| --- | --- |
| **Dashboard** | ดูเหตุการณ์ทั้งหมด เหตุการณ์เข้าเกณฑ์ การสอบสวนและอัตราความครบถ้วน กรองวันที่/พื้นที่ ดูกราฟรายหมู่บ้าน รายเดือน กลุ่มโรค และความเสี่ยง พร้อม Smart Insights จากข้อมูลสรุป |
| **บันทึก/แก้ไขข้อมูล** | เพิ่มและแก้ไขเหตุการณ์ด้วย EventID/Revision ติดตามสถานะการตรวจสอบ เกณฑ์สอบสวนและความเสี่ยง กำหนดผู้รับผิดชอบ ปิด/เปิดเหตุการณ์ ยกเลิกโดยเก็บหลักฐาน และจัดการเอกสารแนบ |
| **สร้างรายงานสอบสวนโรค** | หน้า **สร้างรายงานสอบสวนโรคเบื้องต้นด้วย AI** มีปุ่มรายงานหนึ่งชุดต่อเหตุการณ์ ตรวจความพร้อม ดูประวัติ และสร้างร่างฉบับใหม่อย่างชัดเจน |
| **การจัดการระบบ** | จัดการผู้ใช้และสิทธิ์ ข้อมูลพื้นที่ MasterData เนื้อหา/คู่มือ ตั้งค่าเว็บไซต์และ Gemini ดู Audit Logs และจัดเก็บ Audit เก่า |
| **ประกาศ/แนวทาง/คู่มือ** | แสดงเนื้อหาที่เผยแพร่ไว้จาก ContentLibrary |

สรุปพฤติกรรมของปุ่มรายงาน: เมื่อยังไม่มีรายงานที่ยืนยันได้จะแสดง `สร้างรายงาน AI`; เมื่อมีหนึ่งฉบับจะแสดง `ดูรายงาน`; หลายฉบับจะแสดง `ดูรายงาน (N)` โดยเปิดหน้าต่าง **รายงานของเหตุการณ์** ซึ่งสามารถสั่ง **สร้างรายงานฉบับใหม่** พร้อมยืนยันก่อนดำเนินการได้ รายงานเก่ายังคงอยู่ใน `ReportRegistry`

รายละเอียดการทำงานและข้อจำกัดทุกหมวดอยู่ใน **[doc/features.md](doc/features.md)**

## ผู้ใช้งานและสิทธิ์

- **บุคคลทั่วไป (ไม่เข้าสู่ระบบ):** Dashboard แบบข้อมูลรวม ประกาศ/คู่มือ และข้อมูลอ้างอิงสาธารณะที่ระบบเปิดเผย; ไม่ได้รับรายการเหตุการณ์รายแถว
- **Staff:** ดูรายการเหตุการณ์หลังเข้าสู่ระบบและ Export แต่ไม่มีสิทธิ์สร้าง/แก้ไขเหตุการณ์หรือสร้างรายงาน
- **Admin:** ดู/เพิ่ม/แก้ไขเหตุการณ์ สร้างรายงาน และ Export
- **Manager / Super Admin:** จัดการเหตุการณ์และรายงาน รวมทั้งผู้ใช้ การตั้งค่า พื้นที่ MasterData และ Audit ตามสิทธิ์ที่ตรวจบน Server

**ข้อจำกัดของ Dashboard สาธารณะ:** แม้ Server ส่งเฉพาะข้อมูลรวม แต่การแยกตามหมู่บ้าน/กลุ่มโรคอาจทำให้กลุ่มที่มีจำนวนน้อยถูกอนุมานได้ Source ปัจจุบันยังไม่มี Small-cell Suppression จึงไม่ควรตีความว่า Aggregate เท่ากับการทำข้อมูลนิรนามโดยสมบูรณ์ การใช้งานข้อมูลจริงต้องประเมินความเสี่ยงด้านความเป็นส่วนตัวตามบริบทหน่วยงาน

การสมัครด้วยตนเองขึ้นอยู่กับ `ALLOW_SELF_REGISTER`; บัญชีใหม่เริ่มสถานะ `pending` และต้องได้รับการอนุมัติเป็น `active` จึงเข้าใช้งานได้ ชื่อสิทธิ์และตารางอนุญาตในโค้ดเป็นหลักฐานอ้างอิงสูงสุด: [`requireAuth_` / `hasPermission_`](src/server/01-schema-and-db.gs)

## เทคโนโลยีและสถาปัตยกรรม

| ชั้น | เทคโนโลยี |
| --- | --- |
| Runtime / Backend | Google Apps Script (JavaScript) |
| Frontend | HTML, CSS, Vanilla JavaScript; Google Charts |
| ฐานข้อมูลเชิงตาราง | Google Sheets |
| เอกสารแนบและที่เก็บไฟล์ | Google Drive |
| รายงานและแม่แบบ | Google Docs |
| การสร้างข้อความ | Gemini API — เส้นทางสร้างรายงานปัจจุบันล็อก `models/gemini-3.8-flash` |
| เครื่องมือพัฒนา | Node.js (ตาม `package.json` ต้อง ≥20), npm, Node test runner |
| Repository / CI | GitHub / GitHub Actions |
| การเผยแพร่ | Google Apps Script Web App |

หลักการ: **Modular Source, Simple One-Click Deployment** — พัฒนาในไฟล์แยกส่วน แต่ส่งมอบเป็น One-Click Artifacts 2 ไฟล์ให้ผู้ดูแลนำไปติดตั้งได้โดยไม่จำเป็นต้องใช้ Node/npm/Git

### โครงสร้าง Repository ปัจจุบัน

```text
src/server/    00-bootstrap.gs ... 06-gemini-and-prompts.gs
src/web/       00-document-head.html ... 04-browser-app.html
tools/         build-one-click.mjs และเครื่องมือตรวจ release/migration แบบ offline
tests/         Node.js tests และ contract/integration tests
docs/          architecture, baseline, deployment, governance,
               integration, migrations, roadmap, testing, ux, workflow
doc/features.md  เอกสารความสามารถระบบปัจจุบัน (เอกสารชุดนี้)
AGENTS.md      กติกาและบริบทสำหรับ AI Coding Agents
Code_Smart_SRRT_OneClick_v2026.09.08.1.gs
Index_Smart_SRRT_OneClick.html
คู่มือติดตั้ง_Smart_SRRT_ระดับอำเภอ_v2026.09.08.1.txt
README_ติดตั้ง_Smart_SRRT_OneClick.txt
```

สองไฟล์ท้ายที่เป็น One-Click Artifacts ถูกประกอบตามลำดับที่กำหนดไว้ใน [`tools/build-one-click.mjs`](tools/build-one-click.mjs) **ต้องแก้ `src/server/` หรือ `src/web/` ก่อนเสมอ** แล้วจึงสร้าง Artifacts ใหม่; ห้ามแก้เฉพาะไฟล์ที่ Generate แล้วโดยปล่อย Source ต่างกัน

สำหรับผู้พัฒนา:

```bash
npm run build:check      # ตรวจ byte-for-byte Source / One-Click parity โดยไม่เขียนไฟล์
npm run build            # สร้าง One-Click Artifacts จาก Modular Source
npm run check:contracts  # ตรวจ G-30 contract
npm test                 # Node test suite
npm run release:preflight
```

คำสั่งข้างต้นเป็นข้อมูลอ้างอิงสำหรับกระบวนการพัฒนา **ไม่ใช่คำสั่งให้ดำเนินการกับระบบ Production หรือข้อมูลจริง**

## การติดตั้งและอัปเดต: ภาพรวม

สำหรับการติดตั้งใหม่ ให้ปฏิบัติตาม [คู่มือติดตั้งระดับอำเภอ](คู่มือติดตั้ง_Smart_SRRT_ระดับอำเภอ_v2026.09.08.1.txt) และ [One-Click Compatibility Contract](docs/deployment/one-click-compatibility-contract.md) โดยหลักการคือเตรียม Google Sheet, สร้างโปรเจกต์ Apps Script ที่ผูกกับ Sheet, วาง Server Artifact ลง `Code.gs` และ HTML Artifact ในไฟล์ `Index`, อนุญาตสิทธิ์ที่เกี่ยวข้อง, รัน `installSmartSRRT()` สำหรับ **การติดตั้งใหม่ที่ได้รับอนุมัติ** จากนั้น Deploy เป็น Web App

**สำคัญสำหรับระบบที่มีข้อมูลอยู่แล้ว:** อย่าตีความว่าการแทนที่โค้ดและรัน Installer เป็นการ Migration จากทุกเวอร์ชันได้โดยอัตโนมัติ ต้องตรวจ Schema จริง สำรองข้อมูล แยกกระบวนการ Deploy กับ Migration และผ่าน [Migration/Version/Release Policy](docs/governance/migration-version-release-policy.md) ก่อนทุกครั้ง โดยเฉพาะประเด็น **P4→v7 Historical Migration** ที่ยังไม่ได้รับอนุญาต คู่มือเดิมบางส่วนเป็น Legacy Snapshot จึงต้องเทียบกับโค้ดและสัญญาปัจจุบันก่อนใช้

การแก้ GitHub `main` หรือการ Merge PR **ไม่ทำให้ Web App ที่ Deploy อยู่เปลี่ยนเอง** การเผยแพร่เวอร์ชัน Apps Script ต้องดำเนินการแยกต่างหากโดยผู้มีสิทธิ์และได้รับอนุมัติ

## เวอร์ชันและสถานะหลักฐาน

- **Code baseline ที่ใช้เขียนเอกสาร:** `main@60cda9da745e080122f104713bb0f0eb8ce0f110` (10 ตุลาคม 2026)
- **ค่าใน CONFIG:** `VERSION = 2026.09.08.1`, `SCHEMA_VERSION = 7`, `REPORT_PROMPT_VERSION = 2026.10.06.1` — ไม่ใช่ค่าเดียวกันและไม่ควรใช้แทนกัน
- **GitHub:** PR #64 และ #67 Merge แล้ว; CI ของ Merge ที่รายงานล่าสุดสำเร็จ; หลักฐานก่อน Merge #67 รายงาน 334/334 tests PASS
- **Web App:** Product Owner รายงานว่า Deploy แล้วและ Basic UI Smoke 12/12 PASS รวมการดูเส้นทางปุ่มรายงานและประวัติ แต่ **ยังไม่ยืนยัน Deployed SHA/Artifact Parity อย่างอิสระ** และไม่ถือว่า End-to-End ผ่านครบทุกกรณี
- **Migration:** Historical P4→v7 ยังเป็น **HOLD / ไม่ได้รับอนุญาต**; ห้ามถือว่าผลทดสอบ Synthetic หรือ Preflight เป็นการอนุญาตใช้ข้อมูลจริง
- **Documentation Phase:** ไม่เพิ่ม Browser UAT, ไม่เรียก Gemini, ไม่ Deploy และไม่รัน Migration ในงานจัดทำเอกสารชุดนี้

เอกสารรายละเอียดเชิงลึกอ้างอิง **โค้ด `main` เป็น Current Implementation**; เอกสารเก่าที่มีถ้อยคำว่า Draft/HOLD/Legacy ให้ตีความตามบริบทเวลาที่เอกสารถูกสร้าง ไม่ใช่สถานะ PR ปัจจุบัน

## เริ่มอ่านที่นี่

- [ความสามารถและสถานะฟีเจอร์ทั้งหมด — `doc/features.md`](doc/features.md)
- [แนวทางสำหรับ AI Agents — `AGENTS.md`](AGENTS.md)
- [แหล่ง Source และวิธีสร้าง One-Click Artifacts](docs/architecture/g30-canonical-modular-release.md)
- [Privacy & KPI](docs/architecture/p2-privacy-kpi-contract.md)
- [ReportRegistry G-17](docs/governance/g17-report-registry.md), [Readiness G-26](docs/governance/g26-ai-report-readiness.md), [History G-27](docs/governance/g27-event-report-history.md)
- [Report Jobs G-32](docs/deployment/g32-report-jobs.md) และ [Single Report Action G-33](docs/ux/g33-single-report-action.md)
- [Migration Readiness P4→v7](docs/integration/p4-v7-migration-readiness-2026-10-09.md)

## การดูแลรักษาและการมีส่วนร่วม

ใช้ GitHub เป็น Source of Truth: อ่านข้อกำหนดใน `AGENTS.md` → ระบุ Scope → ตรวจ Source/Tests → ทำงานใน Branch แยก → เปิด PR → ตรวจรับโดยผู้ตรวจอิสระตามกระบวนการ → รอ Product Owner อนุมัติ Merge/Deploy/Migration แยกแต่ละขั้น หลีกเลี่ยงการนำข้อมูลสุขภาพจริง, Session Token, Gemini API Key, Spreadsheet ID หรือไฟล์หลักฐานที่ระบุตัวบุคคลเข้าสู่ GitHub, Test Fixtures และ Logs

เอกสารนี้เป็น **ภาพรวมระบบ** ไม่ใช่คำอนุญาตให้เปลี่ยนแปลงระบบที่ใช้งานอยู่
