# AGENTS.md — Smart SRRT AI Coding Agent Instructions

> ใช้กับ Codex, Claude Code, Antigravity, Multica และ AI Coding Agents ที่ทำงานใน Repository นี้  
> Canonical Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt)  
> เอกสารชุดนี้อ้างอิง `main@60cda9da745e080122f104713bb0f0eb8ce0f110` ณ 10 ตุลาคม 2026; **ทุก Agent ต้องตรวจ HEAD จริงก่อนเริ่มงานครั้งต่อไป** ห้ามถือ SHA นี้เป็น HEAD ถาวร

## 1. Project Context

Smart SRRT เป็นระบบ **Event-based Epidemiological Surveillance** สำหรับพื้นที่สาธารณสุข ครอบคลุม Public Aggregate Dashboard, Authentication/RBAC, การบันทึกและติดตาม Event, ผู้รับผิดชอบ, เอกสารแนบ, Audit, การดูประวัติและสร้างร่างรายงานสอบสวนโรคเบื้องต้นด้วย Gemini

**ไม่ใช่** HIS/LIS, EHR, ระบบอนุมัติรายงาน, เครื่องมือวินิจฉัย, Contact-Tracing Platform หรือ General Workflow Engine. การสร้างเอกสาร AI ไม่ใช่การรับรองความถูกต้องทางคลินิก/ระบาดวิทยา

**Runtime ปัจจุบัน:** Google Apps Script + Google Sheets/Drive/Docs + Gemini API; Frontend HTML/CSS/Vanilla JavaScript; Development Tooling เป็น Node.js/npm, GitHub Actions. ไม่เพิ่ม Node Server, Framework ใหม่, SQL Database, Docker/Podman หรือ Background Queue เองโดยไม่มี Architecture Decision แยกต่างหาก

## 2. Required Reading Order

ก่อนวิเคราะห์ แก้โค้ด หรือรีวิวงาน:

1. **`AGENTS.md`** — ข้อกำหนดการทำงานของ Agent (ไฟล์นี้)
2. **[`README.md`](README.md)** — ขอบเขต ระบบ และวิธีพัฒนา/ปล่อย One-Click
3. **[`doc/features.md`](doc/features.md)** — ความสามารถจริงและ Feature Status Matrix
4. เอกสาร Architecture, Governance, Workflow, UX, Deployment, Integration/Migration ที่เกี่ยวข้องกับงานใน `docs/` โดยต้องพิจารณาวันที่และสถานะของเอกสาร
5. Source Code และ Tests ที่เกี่ยวข้องกับ Issue จริง; ตรวจ HEAD, Diff, Branch Base และ Acceptance Criteria ก่อนตัดสินใจ

**Source of Truth สำหรับพฤติกรรมภายใน:** Source และ Tests ที่อยู่ใน GitHub Commit เดียวกัน **เหนือกว่า** Roadmap หรือ Draft Contract เก่า. เอกสาร `docs/baseline/` คือ AS-IS Snapshot; ห้ามใช้แทน Current Implementation โดยไม่ตรวจสอบ. เอกสารที่เขียนไว้ก่อน Merge อาจยังบอกว่า HOLD/Draft แม้ GitHub PR ปัจจุบัน Merge แล้ว; ต้องแยก **สถานะโค้ด** ออกจาก **สิทธิ์ Deploy/Migrate**

## 3. Current Repository Layout

```text
src/server/
  00-bootstrap.gs
  01-schema-and-db.gs
  02-auth-and-attachments.gs
  03-events-and-dashboard.gs
  04-admin-and-audit.gs
  05-reports-and-models.gs
  06-gemini-and-prompts.gs
src/web/
  00-document-head.html
  01-styles.html
  02-app-layout.html
  03-modals.html
  04-browser-app.html
tools/                Build, Release Preflight, Offline Migration Assessment
tests/                Node Tests, Integration/Contract and Mocked Tests
docs/                 Architecture, Governance, Migration, Deployment, UX, Roadmap
doc/features.md       Human + Agent System Feature Reference
README.md             Project Overview
AGENTS.md             Repository-wide Agent Rules
Code_Smart_SRRT_OneClick_v2026.09.08.1.gs
Index_Smart_SRRT_OneClick.html
```

**Modular Source is canonical**. `tools/build-one-click.mjs` ประกอบ Source 7+5 ไฟล์ตามลำดับตายตัวให้กลายเป็น One-Click Artifacts สองไฟล์ที่อยู่ Root. Source Code ไม่ได้แยก Deploy เป็น GAS Files รายตัวโดยอัตโนมัติ. ผู้ดูแลใช้ Artifacts ไปวางใน `Code.gs` และ `Index` ตาม Deployment Guide

## 4. Engineering Invariants — DO NOT BREAK

1. **Source/Build Parity:** แก้ `src/server/` หรือ `src/web/` เป็นอันดับแรก แล้วประกอบและตรวจ byte-for-byte ด้วย `npm run build` / `npm run build:check` ตาม Scope งาน. ห้ามแก้ Generated Artifact อย่างเดียว. **ใน PR ที่เป็น Documentation Only ห้ามเปลี่ยน Artifacts ทั้งสอง**
2. **Public Privacy Boundary:** `getPublicDashboardData` ต้องคืน Aggregate เท่านั้น ห้ามส่ง Raw `MainData`, `EventID`, `Revision`, ชื่อผู้แจ้ง, รายละเอียดเหตุการณ์, Document URL, Token หรือข้อมูลระบุตัวบุคคลสู่ Anonymous Dashboard. Raw Event ต้องผ่าน `getDashboardData` และ `view` Permission
3. **Authentication/RBAC:** Server-side `requireAuth_` และ Permission Matrix เป็น Authority. อย่าเชื่อเพียงการซ่อนปุ่ม/เมนูใน Browser. Roles: `Super Admin`, `Manager`, `Admin`, `Staff`. UI Guards ไม่แทน Server Authorization
4. **Stable Event Identity:** Event ใช้ UUID `EventID` ไม่ใช้ Row Number; ทุก Mutating Event Path ที่รองรับต้องยืนยัน `expectedRevision` ภายใต้ Lock และเพิ่ม Revision ตามสัญญา. `RecordStatus` ปัจจุบันคือ `active / closed / void`; `OwnerUserID` อยู่คอลัมน์ 39. ห้ามสมมติว่ามีคอลัมน์ `WorkflowStatus`/`ClosedAt` ตาม Contract P3 Legacy
5. **KPI Semantics:** `criteria` นับเฉพาะ `trim(col17) === 'เข้าเกณฑ์'`; `investigated` บน Dashboard ต้องเข้าเกณฑ์และมี `col26` เท่านั้น; ถ้า Denominator เป็นศูนย์ Rate=0
6. **Persistence Safety:** Soft Void ไม่ลบ Event Row; Attachment Removal ปรับ `Status=removed` และรักษา Drive File; `ReportRegistry` เป็น Append-only; Audit Archive ต้อง Copy/Verify ก่อนลบ Source. ห้ามแก้ Historical Rows/Identity เพื่อกลบ Schema Incompatibility
7. **AI Report Contract:** `ReportRegistry` เป็น Authority ของรายงานสำเร็จ (`ReportID/EventID/SourceRevision/DocumentID`); G-32 `JobID` และ Script Properties เป็นข้อมูลสถานะชั่วคราว ไม่ใช่รายงานถาวร. G-33 ใช้ปุ่มรายงานหนึ่งชุดต่อ Event, Summary Fail Closed และต้องมี Explicit Consent ก่อนสร้างฉบับใหม่เมื่อมีรายงานแล้ว
8. **Gemini Boundary:** Report Path ใช้ `models/gemini-3.8-flash` เท่านั้น; G-32 V8 อนุญาต Retry HTTP 503 แบบจำกัดสูงสุดหนึ่งครั้งต่อส่วนตาม Budget ไม่เปิด Model Fallback หรือ Retry 429 โดยพลการ. Readiness G-26 เป็น Advisory ไม่ใช่ Hard Gate; AI Result เป็น Draft ที่ต้องให้คนตรวจทาน
9. **Safe URLs/Logs:** ตรวจ Google Docs URL กับ DocumentID; ห้ามนำ Health Narrative, API Key, Token, Request Params หรือ Response Body ที่ระบุตัวบุคคลไปลง Logs/CI/GitHub. อย่าใช้ Production Data ใน Tests หรือ Fixture
10. **Version Dimensions:** แยก `CONFIG.VERSION`, `SCHEMA_VERSION` และ `REPORT_PROMPT_VERSION`; เปลี่ยน Schema/Prompt Contract ได้เมื่อมี Spec, Migration/Rollback/Verification และการอนุมัติที่ชัดเจนเท่านั้น

อ่าน [`doc/features.md`](doc/features.md) สำหรับนิยามทุก Feature แทนการอนุมานจากชื่อ Function หรือ Legacy Documents

## 5. Allowed Development and Review Workflow

1. ยืนยัน Product Owner Intent, Scope และ Acceptance Criteria; ตรวจ `main` HEAD ใหม่ทุกครั้ง
2. อ่าน Source/Tests/Docs ที่เกี่ยวข้อง. ระบุความแตกต่างระหว่าง Current Code และ Proposal ก่อนเสนอ Implementation
3. แยก Feature Branch/Documentation Branch, ห้ามแก้งานนอก Scope และห้าม Direct Push ไป `main`
4. เมื่อเป็นงาน Code ให้ผู้รับบท **Developer** เป็นผู้เขียน/แก้ไข และให้ **Independent Reviewer** ที่แยกจากผู้เขียนตรวจ Diff, Tests, Security, Schema, Parity และ Evidence ตามหน้าที่. Reviewer ไม่แก้ Code ของตนเพื่อให้ตัดสิน PASS เอง
5. ทำเฉพาะการตรวจแบบ Offline/Mock/Code Review ที่ได้รับมอบหมาย; ห้ามขยายเป็น Browser UAT, External API, Live Workspace หรือ Production โดยอนุมานจาก CI ที่ผ่าน
6. เปิด PR พร้อม Base/Head SHA, Scope, รายการไฟล์, เหตุผล, หลักฐานที่มีจริง, ผลที่ยังไม่ยืนยัน, สิ่งที่ **ไม่ได้** ดำเนินการ และความเสี่ยงคงเหลือ
7. **ต้องได้รับ Product Owner Authorization แยกต่างหากก่อน Merge, Deploy, ใช้ Credentials จริง, เรียก Gemini จริง, เปิดข้อมูลสุขภาพจริง หรือดำเนินการ Migration**. Green CI ไม่ใช่สิทธิ์ในการข้าม Human Gate
8. หากไม่ทราบหรือพิสูจน์ไม่ได้ ให้ระบุ `Unknown / Not Verified / HOLD` ตามจริง ห้ามเขียนว่า `PASS` หรือ `Deployed` จากการคาดเดา

**GitHub Repository เป็น Source of Truth ของ Code/Docs; การ Merge GitHub ไม่เท่ากับการ Deploy Apps Script**. ไม่เปลี่ยน Deployment ID/URL, Schema, Template, Google Sheet, Drive หรือ Script Properties เพียงเพราะ PR ผ่าน

## 6. Data Protection, Release and Migration Gates

- รักษาขอบเขตสิทธิ์ Google Workspace, Folder Privacy และการดู Raw Records; ห้ามเปิด Public Links ให้เอกสารแนบ/รายงานโดยพลการ
- ก่อน Code Release ตรวจ Parity, API Contracts, Tests, Preflight และ Review ตาม Scope โดยไม่ใช้ข้อมูลผู้ป่วยจริง. Reference scripts ที่มีอยู่: `npm run build:check`, `npm run check:contracts`, `npm test`, `npm run release:preflight`
- **Historical P4→v7 Migration = HOLD** จนกว่ามี Data Mapping/Backup/Restore/Retention/Provenance/Independent Review และ Last Operator Approval. อย่าดัด Schema v7 ให้ดูเหมือนเข้ากับ P4 โดยเงียบ ๆ; เอกสาร [Readiness Matrix](docs/integration/p4-v7-migration-readiness-2026-10-09.md) ไม่ใช่การอนุญาตเอง
- ห้ามรัน `installSmartSRRT()`, `repairInstallation()`, `migrate*()`, `archiveAuditLogs()` หรือ Gemini/Report RPC ต่อข้อมูลจริงโดยไม่มีคำสั่งเฉพาะและสิทธิ์ของ Operator; ชื่อ Function ว่า "repair" ไม่รับประกันว่าจะไม่มีการ Mutation
- การ Backup, Data Migration, Deployment และ Code Merge เป็น **คนละ Gate** ต้องมีการอนุมัติแยก ไม่ถือว่าอนุมัติอัตโนมัติจากขั้นก่อนหน้า

## 7. Context7 MCP — External Library / SDK / API Documentation

เมื่อ Agent จำเป็นต้องใช้เอกสารภายนอกที่ไวต่อเวอร์ชัน (Google Apps Script, Google Workspace APIs, Gemini API, Node.js/npm หรือ Library อื่น) ให้ใช้ **Context7 MCP หากมีการเชื่อมต่อและรองรับ Library/Version นั้นจริง**:

1. เรียก `resolve-library-id` เพื่อหา Library ID ที่ตรงกับ Package/API/Runtime เป้าหมาย
2. เรียก `query-docs` ด้วย Library ID ที่ตรวจแล้วและคำถามเฉพาะด้านที่ต้องการ
3. เทียบ API, Version, Deprecations และ Quotas กับ Source/Package ปัจจุบันก่อนแนะนำหรือเปลี่ยนแปลง; หากเอกสารจาก Context7 ไม่ครอบคลุม ให้ใช้ **Official Documentation** ของ Google / Google AI / Node.js โดยระบุที่มาและเวอร์ชัน
4. อย่าคัดลอกตัวอย่างภายนอกไปแทน Engineering Rules ของ Smart SRRT และอย่าใช้ Context7 เพื่อเดาว่า Feature ภายในถูก Implement แล้วหรือไม่
5. บันทึกข้อจำกัด/สิ่งที่ยังพิสูจน์ไม่ได้เมื่อไม่มี MCP หรือเอกสารที่ตรงเวอร์ชัน

**สำคัญ:** `AGENTS.md` เป็น **Instructions** ไม่ได้ติดตั้ง Context7, ไม่ได้แปลว่า MCP เชื่อมต่ออยู่ และไม่ได้ให้สิทธิ์ Network, Workspace หรือ Gemini เพิ่มเติม. การใช้ Context7 ต้องตรวจ Tool Availability จริงก่อน

## 8. Documentation Maintenance

เมื่อ Feature/Schema/UI ถูกเปลี่ยนภายใต้ PR ที่อนุมัติ ให้ปรับ `README.md` และ/หรือ `doc/features.md` ให้ตรง Source; ระบุสถานะ **Implemented in Source**, **Verified by Automated Tests**, **Observed in Deployed UI**, **Planned / Deferred**, **Not Supported** อย่างซื่อสัตย์และแยกหลักฐานให้ชัดเจน

อย่าอัปเดตสถานะ `Deployed` ด้วย GitHub Merge เพียงอย่างเดียว. อย่ากรอก `Observed in Deployed UI` เมื่อไม่มีผลที่ Operator ยืนยันเฉพาะเส้นทางนั้น. เอกสารอ้างอิงเก่าคงไว้ได้โดยไม่บังคับให้แก้ประวัติ แต่ต้องอธิบายความขัดแย้งกับ Current Source ในเอกสารใหม่

## 9. Current Documentation-Only Gate (10 Oct 2026)

สำหรับงานจัดทำเอกสารตาม Handoff ล่าสุด **Scope เฉพาะ `README.md`, `doc/features.md` และ `AGENTS.md`**:
- ห้ามแก้ Application Source, Tests, Schema, Generated One-Click Artifacts หรือ Deployment
- ห้ามรัน Migration, เรียก Gemini, เปิด Browser UAT หรือสร้าง Additional Test Tasks
- อนุญาต Documentation Branch และ PR เพื่อ Product Owner ตรวจรับ; ไม่ Merge เอง
- เป้าหมายคือเอกสารระบบที่คนอ่านเข้าใจและ AI Agent ใช้เริ่มงานต่อได้ โดยไม่อ้างสิ่งที่ยังไม่ตรวจว่า PASS

เมื่อมีคำสั่งรอบใหม่ ให้ยืนยัน Scope/Approval ใหม่แทนการถือว่า Gate นี้ขยายเอง

---
**Agent reminder:** Read first → Inspect current code → Respect privacy/data integrity → Keep changes scoped → Separate implementation, review, merge, deploy and migration → Report evidence precisely.
