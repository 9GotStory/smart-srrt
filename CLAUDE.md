# CLAUDE.md — Smart SRRT Claude Code Instructions

> **Current reference — 8 November 2026:** Workflow และสถานะ D331 อ้าง `main@17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946`; รายละเอียด implementation อื่นอ้าง baseline `main@29ca13ba33f87d46f1f50fba90fe904773b6594a`. ตรวจ GitHub/local HEAD และ Diff ใหม่ก่อนทำงาน; SHA นี้เป็นหลักฐาน ณ วันที่ตรวจ ไม่ใช่ HEAD ถาวร
>
> Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt). [Documentation Index / Source-of-Truth Map](docs/INDEX.md) แยก Current, Historical, Proposed และ HOLD. [บันทึกงานวันที่ 11–12 ต.ค.](docs/handoff/agent-task-records-2026-10-12.md) เป็น Historical ไม่ใช่คำสั่งปัจจุบันหรือสิทธิ์ Deploy

## 1. Project Context

Smart SRRT เป็นระบบ **Event-based Epidemiological Surveillance** สำหรับพื้นที่สาธารณสุข ครอบคลุม Public Aggregate Dashboard, Authentication/RBAC, การบันทึกและติดตาม Event, ผู้รับผิดชอบ, เอกสารแนบ, Audit, การดูประวัติและสร้างร่างรายงานสอบสวนโรคเบื้องต้นด้วย Gemini

**ไม่ใช่** HIS/LIS, EHR, ระบบอนุมัติรายงาน, เครื่องมือวินิจฉัย, Contact-Tracing Platform หรือ General Workflow Engine. การสร้างเอกสาร AI ไม่ใช่การรับรองความถูกต้องทางคลินิก/ระบาดวิทยา

**Runtime ปัจจุบัน:** Google Apps Script + Google Sheets/Drive/Docs + Gemini API; Frontend HTML/CSS/Vanilla JavaScript; Development Tooling เป็น Node.js/npm, GitHub Actions. ไม่เพิ่ม Node Server, Framework ใหม่, SQL Database, Docker/Podman หรือ Background Queue เองโดยไม่มี Architecture Decision แยกต่างหาก

## 2. Required Reading Order

ก่อนวิเคราะห์ แก้โค้ด หรือรีวิวงาน:

1. **`CLAUDE.md`** — ข้อกำหนดการทำงานของ Claude Code (ไฟล์นี้)
2. **[`README.md`](README.md)** — ขอบเขต ระบบ และวิธีพัฒนา Native
3. **[`docs/features.md`](docs/features.md)** — ความสามารถจริงและ Feature Status Matrix
4. **[`docs/INDEX.md`](docs/INDEX.md)** → เอกสาร Architecture, Governance, Workflow, UX, Deployment และ Integration/Migration เฉพาะงาน โดยตรวจวันที่/สถานะก่อนใช้
5. Source Code และ Tests ที่เกี่ยวข้องกับ Issue จริง; ตรวจ HEAD, Diff, Branch Base และ Acceptance Criteria ก่อนตัดสินใจ

**Source of Truth สำหรับพฤติกรรมภายใน:** Source และ Tests ที่อยู่ใน GitHub Commit เดียวกัน **เหนือกว่า** Roadmap หรือ Draft Contract เก่า. เอกสาร `docs/baseline/` คือ AS-IS Snapshot; ห้ามใช้แทน Current Implementation โดยไม่ตรวจสอบ. เอกสารที่เขียนไว้ก่อน Merge อาจยังบอกว่า HOLD/Draft แม้ GitHub PR ปัจจุบัน Merge แล้ว; ต้องแยก **สถานะโค้ด** ออกจาก **สิทธิ์ Deploy/Migrate**

## 3. Current Repository Layout

```text
src/server/    7 core Apps Script modules (00-bootstrap ... 06-gemini-and-prompts)
src/dengue/    D331 foundation และ offline/disabled candidates; registration ดู manifest
src/web/       HTML/CSS/classic inline scripts; 04-browser-app owns final boot/closing tags
tools/         Native build/inspection และ guarded offline/release tools
tests/         Node contracts, VM/mocked behavior และ synthetic integration
docs/INDEX.md  Documentation navigation และ authority map
docs/features.md  Current feature reference
README.md     System overview
```

**Native source is canonical:** [`tools/native-sources.mjs`](tools/native-sources.mjs) กำหนดลำดับจริง ปัจจุบัน **8 GS + 17 HTML partials + generated Index = 26 staged files**: core server 7 ไฟล์ + pure `src/dengue/00-g1a-foundation.gs`; HTML รวม inert D331 status partial แล้ว Browser ยังใช้ classic scripts/shared lexical state และหนึ่ง final `boot()` ไม่ใช่ ES modules

[`tools/build-apps-script-multifile.mjs`](tools/build-apps-script-multifile.mjs) สร้าง generated/untracked `dist/apps-script/`; `Index.html` include trusted partials ตาม manifest ชุดนี้ไม่รวม `appsscript.json` ต้องรักษา manifest, V8, OAuth scopes และ project identity เดิมเมื่อมีการอนุมัติ Deploy แยกต่างหาก การ build ไม่เขียน Apps Script

One-Click สองไฟล์ที่ root เป็น **frozen historical archives** ห้ามแก้/Generate ใหม่; ไม่ใช่ current release source. **Native33** เป็น D331 dependency candidate แยกจาก default Native26 ดู [runtime dependency assessment](docs/implementation/d331-p0-10-dev-runtime-readiness.md); อย่านำจำนวนไฟล์หรือ source ที่มีใน repo ไปอนุมานว่า registered/deployed/authorized แล้ว

## 4. Engineering Invariants — DO NOT BREAK

1. **Native Source/Build Parity (UX-R2-03+):** แก้ `src/server/` หรือ `src/web/` เป็นอันดับแรก จัดเรียง `tools/native-sources.mjs` อย่างชัดเจน และตรวจ `npm run build:gas-multifile` → `npm run build:check`/ `check:gas-multifile`. `npm run build` สร้าง Native Package ไม่สร้าง One-Click. **ห้ามปรับ One-Click Artifacts ทั้งสอง**; G-30/G-34/P6 ตรวจ current Native และตรวจ One-Click เฉพาะ archival integrity.
2. **Public Privacy Boundary:** `getPublicDashboardData` ต้องคืน Aggregate เท่านั้น ห้ามส่ง Raw `MainData`, `EventID`, `Revision`, ชื่อผู้แจ้ง, รายละเอียดเหตุการณ์, Document URL, Token หรือข้อมูลระบุตัวบุคคลสู่ Anonymous Dashboard. Raw Event ต้องผ่าน `getDashboardData` และ `view` Permission
   **Privacy Review Caveat:** `buildDashboardAggregate_` ปัจจุบันไม่มี Small-cell Suppression; Aggregate ตามหมู่บ้าน/โรคอาจมีจำนวนต่ำและเสี่ยงต่อการอนุมานตัวบุคคล. ให้แยก **Data Minimization (ส่งเฉพาะ Aggregate)** จาก **การรับรอง Anonymity (ยังไม่ได้พิสูจน์)** และห้ามขยายการเปิดเผยข้อมูลโดยไม่มีการทบทวน Privacy.
3. **Authentication/RBAC:** Server-side `requireAuth_` และ Permission Matrix เป็น Authority. อย่าเชื่อเพียงการซ่อนปุ่ม/เมนูใน Browser. Roles: `Super Admin`, `Manager`, `Admin`, `Staff`. UI Guards ไม่แทน Server Authorization
4. **Stable Event Identity:** Event ใช้ UUID `EventID` ไม่ใช้ Row Number; ทุก Mutating Event Path ที่รองรับต้องยืนยัน `expectedRevision` ภายใต้ Lock และเพิ่ม Revision ตามสัญญา. `RecordStatus` ปัจจุบันคือ `active / closed / void`; `OwnerUserID` อยู่คอลัมน์ 39. ห้ามสมมติว่ามีคอลัมน์ `WorkflowStatus`/`ClosedAt` ตาม Contract P3 Legacy
5. **KPI Semantics:** `criteria` นับเฉพาะ `trim(col17) === 'เข้าเกณฑ์'`; `investigated` บน Dashboard ต้องเข้าเกณฑ์และมี `col26` เท่านั้น; ถ้า Denominator เป็นศูนย์ Rate=0
6. **Persistence Safety:** Soft Void ไม่ลบ Event Row; Attachment Removal ปรับ `Status=removed` และรักษา Drive File; `ReportRegistry` เป็น Append-only; Audit Archive ต้อง Copy/Verify ก่อนลบ Source. ห้ามแก้ Historical Rows/Identity เพื่อกลบ Schema Incompatibility
7. **AI Report Contract:** `ReportRegistry` เป็น Authority ของรายงานสำเร็จ (`ReportID/EventID/SourceRevision/DocumentID`); G-32 `JobID` และ Script Properties เป็นข้อมูลสถานะชั่วคราว ไม่ใช่รายงานถาวร. G-33 ใช้ปุ่มรายงานหนึ่งชุดต่อ Event, Summary Fail Closed และต้องมี Explicit Consent ก่อนสร้างฉบับใหม่เมื่อมีรายงานแล้ว
8. **Gemini Boundary:** Report Path ใช้ `models/gemini-3.8-flash` เท่านั้น; G-32 V8 อนุญาต Retry HTTP 503 แบบจำกัดสูงสุดหนึ่งครั้งต่อส่วนตาม Budget ไม่เปิด Model Fallback หรือ Retry 429 โดยพลการ. Readiness G-26 เป็น Advisory ไม่ใช่ Hard Gate; AI Result เป็น Draft ที่ต้องให้คนตรวจทาน
9. **Safe URLs/Logs:** ตรวจ Google Docs URL กับ DocumentID; ห้ามนำ Health Narrative, API Key, Token, Request Params หรือ Response Body ที่ระบุตัวบุคคลไปลง Logs/CI/GitHub. อย่าใช้ Production Data ใน Tests หรือ Fixture
10. **Version Dimensions:** แยก `CONFIG.VERSION`, `SCHEMA_VERSION` และ `REPORT_PROMPT_VERSION`; เปลี่ยน Schema/Prompt Contract ได้เมื่อมี Spec, Migration/Rollback/Verification และการอนุมัติที่ชัดเจนเท่านั้น

อ่าน [`docs/features.md`](docs/features.md) สำหรับนิยามทุก Feature แทนการอนุมานจากชื่อ Function หรือ Legacy Documents

## 5. Allowed Development and Review Workflow

### Claude Code + Matt Pocock Skills

ทุกขั้นของ Workflow นี้ทำด้วย **Claude Code** และใช้ **Matt Pocock Skills** เป็นหลัก นอกชุดนี้ใช้ได้เฉพาะ `frontend-design` สำหรับงานออกแบบ UI, Context7 สำหรับเอกสารภายนอกตาม Section 7 และ Playwright สำหรับตรวจบน Browser ตามหัวข้อท้าย Workflow ก่อนใช้ Skill ให้ตรวจรายการที่ session เปิดให้ใช้และ `SKILL.md` ที่ติดตั้งจริง อ่านเฉพาะ Skill ที่เกี่ยวข้อง และตรวจวิธีเรียก/ข้อจำกัดของ Skill นั้น; ชื่อ Skill ในแต่ละขั้นเป็นตัวเลือกตามงาน ไม่บังคับเรียกทุก Skill หากไม่มี Skill ที่ต้องใช้ ให้รายงานข้อจำกัดและเสนอวิธีทำในขอบเขตที่ได้รับอนุมัติ Skills ไม่เพิ่มสิทธิ์แก้ไฟล์หรือข้าม approval gates ของโครงการ

1. **Research:** ยืนยัน Product Owner Intent, Scope และ Acceptance Criteria; ตรวจ GitHub/local `main` HEAD, Branch Base และ Diff ใหม่ อ่าน Requirements → Source/Tests/Docs ตาม Section 2 พร้อม GitHub Issues/PRs เดิมและ comments ที่เกี่ยวข้อง สรุป Current Implementation, Proposal และสิ่งที่ยังไม่ทราบก่อนวางแผน ใช้งานเดิมเป็นฐานเพื่อหลีกเลี่ยง Issue/เอกสารซ้ำ
2. **Planning:** ใช้ Matt Skills ที่เหมาะสมและตรวจพบจริง เช่น `codebase-design` เมื่อออกแบบ interface/test seam, `domain-modeling` เมื่อปรับความหมาย domain, `grilling` เมื่อมี design decision ที่ต้องถาม PO และ `writing-for-agents` เมื่อแก้เอกสารสำหรับ Agent เสนอแผนที่เล็กและครบหนึ่ง feature: user workflow, source/data boundaries, changes, acceptance/negative tests, test seams, dependencies/blocked decisions และ CI ถาม PO เฉพาะประเด็นสำคัญที่หาคำตอบจากหลักฐานไม่ได้
3. **Product Owner Approval:** ส่ง Implementation Plan ให้ PO อนุมัติ scope และ test seams ก่อนสร้าง/ปรับ Issue หรือเริ่ม Implementation หาก scope/decision สำคัญเปลี่ยน ให้แก้แผนและขออนุมัติส่วนที่เปลี่ยนก่อนเดินต่อ
4. **Specification / GitHub Issue:** หลังแผนได้รับอนุมัติ ใช้ `to-spec` สังเคราะห์และเผยแพร่ spec Issue หรือ `to-tickets` เมื่อต้องแบ่งงาน; ทั้งสอง Skill ตั้งให้ผู้ใช้เรียกเท่านั้น จึงต้องขอให้ PO พิมพ์ `/to-spec` หรือ `/to-tickets` เมื่อถึงขั้นนี้ สร้าง/ปรับ Issue ใน `9GotStory/smart-srrt` ให้ตรงแผน พร้อม acceptance criteria, negative tests, dependencies และ approval gates; ใช้ Issue เดิมเมื่อครอบคลุมงาน สำหรับ D331 ใช้ขอบเขต Planning/Specification ของหนึ่ง feature เป็นค่าเริ่มต้นตาม [Remaining Feature Briefs](docs/implementation/d331-remaining-feature-briefs.md); เพิ่ม implementation tickets ที่เชื่อมโยงกับ spec Issue ได้เฉพาะเมื่อ PO อนุมัติการแบ่งงานอย่างชัดเจน โดยไม่สร้าง Issues ซ้ำหรือขยายไป feature อื่น สถานะ `ready-for-agent` เป็น triage ไม่แทนสิทธิ์ Implementation
5. **Implementation:** เมื่อได้รับอนุมัติ Implementation ตามแผน/Issue ให้ **Claude Code (Developer)** พัฒนาใน Feature/Documentation Branch แยกจาก `main` และรักษา exact file scope ใช้ `tdd` สำหรับงาน Code ที่ test seams ซึ่ง PO ยืนยันแล้ว: failing behavior test → minimal passing implementation ทีละ slice; ใช้ synthetic/offline fixtures และ Matt Skills อื่นเฉพาะที่เหมาะสม งาน documentation-only ใช้ checks ตาม scope โดยไม่เพิ่ม code/tests เปิด Draft PR โดยใช้ `pr` เขียน body เมื่อเหมาะสม พร้อม Base/Exact Head SHA, Issue/approved scope, changed files, เหตุผล, test evidence, ผลที่ยังไม่ยืนยัน, สิ่งที่ไม่ได้ทำ และความเสี่ยงคงเหลือ
6. **Independent Review ของ PR:** ให้ **Claude Code session ใหม่ที่ไม่มีบริบทการเขียนงานนั้น** ตรวจ Exact HEAD SHA, Diff เทียบ Base, approved Issue/Plan, Tests และ GitHub CI ที่ HEAD เดียวกัน รวม Security, Schema, Native Parity และ Evidence ตาม scope ใช้ `code-review` เมื่อมีให้ใช้และเหมาะสม; ผลจาก session ที่เขียนงานเป็น author-assisted ไม่ใช่ independent approval ระบุใน PR ว่าผู้ตรวจคือ Claude Code session ที่แยกจากผู้เขียน ไม่ใช่การรับรองจากบุคคลภายนอก นิยามนี้ใช้กับการตรวจ PR เท่านั้น Reviewer ส่ง findings ให้ Developer แก้; เมื่อ HEAD เปลี่ยนต้องตรวจ Diff/Tests/CI และยืนยันผล review ที่ SHA ใหม่
7. **Merge:** หลัง Independent Review ผ่านและมี CI evidence ที่ Exact HEAD ต้องรอ **Product Owner อนุมัติ Merge แยกต่างหาก** ห้าม Direct Push ไป `main` หรือเปิด Auto-merge เพื่อข้าม Gate

**Playwright** (`playwright-cli`) คือเครื่องมือตรวจพฤติกรรมบน Browser ของ Workflow นี้:

- **Local build:** Native stage + stub `google.script.run` + ข้อมูลสังเคราะห์ ใช้ระหว่างพัฒนาได้ เก็บ artifact ไว้นอก Repository และคง `package.json` เดิม
- **DEV Web App:** นับเป็น Browser UAT ต้องมีขอบเขตที่ PO อนุมัติเฉพาะรอบ; Source ใหม่ต้องผ่าน Deploy Gate ก่อนจึงทดสอบบน DEV ได้

ทำเฉพาะ Offline/Mock/Code Review ที่ได้รับมอบหมาย; Browser UAT, External API, Live Workspace และ Production ต้องมีขอบเขตที่อนุมัติเฉพาะ การ Deploy, ใช้ Credentials จริง, เรียก Gemini จริง, เปิดข้อมูลสุขภาพจริง และ Migration ต้องได้รับ **Product Owner Authorization แยกต่างหาก** ตาม Section 6; Green CI ไม่ข้าม Human Gate หากพิสูจน์ไม่ได้ให้ระบุ `Unknown / Not Verified / HOLD` ตามจริง

**GitHub Repository เป็น Source of Truth ของ Code/Docs; การ Merge GitHub ไม่เท่ากับการ Deploy Apps Script**. ไม่เปลี่ยน Deployment ID/URL, Schema, Template, Google Sheet, Drive หรือ Script Properties เพียงเพราะ PR ผ่าน

## 6. Data Protection, Release and Migration Gates

- รักษาขอบเขตสิทธิ์ Google Workspace, Folder Privacy และการดู Raw Records; ห้ามเปิด Public Links ให้เอกสารแนบ/รายงานโดยพลการ
- ก่อน Code Release ตรวจ Parity, API Contracts, Tests, Preflight และ Review ตาม Scope โดยไม่ใช้ข้อมูลผู้ป่วยจริง. Reference scripts ที่มีอยู่: `npm run build:check`, `npm run check:contracts`, `npm test`, `npm run release:preflight`
- **Historical P4→v7 Migration = HOLD** จนกว่ามี Data Mapping/Backup/Restore/Retention/Provenance/Independent Review โดยผู้ตรวจที่ PO กำหนดเป็นรอบ ๆ และ Last Operator Approval. อย่าดัด Schema v7 ให้ดูเหมือนเข้ากับ P4 โดยเงียบ ๆ; เอกสาร [Readiness Matrix](docs/integration/p4-v7-migration-readiness-2026-10-09.md) ไม่ใช่การอนุญาตเอง
- ห้ามรัน `installSmartSRRT()`, `repairInstallation()`, `migrate*()`, `archiveAuditLogs()` หรือ Gemini/Report RPC ต่อข้อมูลจริงโดยไม่มีคำสั่งเฉพาะและสิทธิ์ของ Operator; ชื่อ Function ว่า "repair" ไม่รับประกันว่าจะไม่มีการ Mutation
- การ Backup, Data Migration, Deployment และ Code Merge เป็น **คนละ Gate** ต้องมีการอนุมัติแยก ไม่ถือว่าอนุมัติอัตโนมัติจากขั้นก่อนหน้า

## 7. Context7 MCP — External Library / SDK / API Documentation

เมื่อ Agent จำเป็นต้องใช้เอกสารภายนอกที่ไวต่อเวอร์ชัน (Google Apps Script, Google Workspace APIs, Gemini API, Node.js/npm หรือ Library อื่น) ให้ใช้ **Context7 MCP หากมีการเชื่อมต่อและรองรับ Library/Version นั้นจริง**:

1. เรียก `resolve-library-id` เพื่อหา Library ID ที่ตรงกับ Package/API/Runtime เป้าหมาย
2. เรียก `query-docs` ด้วย Library ID ที่ตรวจแล้วและคำถามเฉพาะด้านที่ต้องการ
3. เทียบ API, Version, Deprecations และ Quotas กับ Source/Package ปัจจุบันก่อนแนะนำหรือเปลี่ยนแปลง; หากเอกสารจาก Context7 ไม่ครอบคลุม ให้ใช้ **Official Documentation** ของ Google / Google AI / Node.js โดยระบุที่มาและเวอร์ชัน
4. อย่าคัดลอกตัวอย่างภายนอกไปแทน Engineering Rules ของ Smart SRRT และอย่าใช้ Context7 เพื่อเดาว่า Feature ภายในถูก Implement แล้วหรือไม่
5. บันทึกข้อจำกัด/สิ่งที่ยังพิสูจน์ไม่ได้เมื่อไม่มี MCP หรือเอกสารที่ตรงเวอร์ชัน

**สำคัญ:** `CLAUDE.md` เป็น **Instructions** ไม่ได้ติดตั้ง Context7, ไม่ได้แปลว่า MCP เชื่อมต่ออยู่ และไม่ได้ให้สิทธิ์ Network, Workspace หรือ Gemini เพิ่มเติม. การใช้ Context7 ต้องตรวจ Tool Availability จริงก่อน

## 8. Documentation Maintenance

เมื่อ Feature/Schema/UI ถูกเปลี่ยนภายใต้ PR ที่อนุมัติ ให้ปรับ `README.md` และ/หรือ `docs/features.md` ให้ตรง Source; ระบุสถานะ **Implemented in Source**, **Verified by Automated Tests**, **Observed in Deployed UI**, **Planned / Deferred**, **Not Supported** อย่างซื่อสัตย์และแยกหลักฐานให้ชัดเจน

อย่าอัปเดตสถานะ `Deployed` ด้วย GitHub Merge เพียงอย่างเดียว. อย่ากรอก `Observed in Deployed UI` เมื่อไม่มีผลที่ Operator ยืนยันเฉพาะเส้นทางนั้น. เอกสารอ้างอิงเก่าคงไว้ได้โดยไม่บังคับให้แก้ประวัติ แต่ต้องอธิบายความขัดแย้งกับ Current Source ในเอกสารใหม่

## 9. Pre-change Checklist (must be followed)

- **Baseline/identity:** Record repository, exact `main` SHA, branch base SHA, accepted task/PR scope; inspect `git diff --name-status` and file list.
- **Read in priority order:** `CLAUDE.md` → `README.md` → `docs/features.md` → `docs/INDEX.md` → relevant `docs/**` → canonical `src/**` + matched `tests/**`. Historical `doc/features.md` is preserved but not the up-to-date feature authority.
- **Frontend/RPC:** Verify visible Thai menu/button/error labels from `src/web/02-app-layout.html`, `03-modals.html` และ client partial เจ้าของพฤติกรรมตาม manifest. Check `google.script.run` calls against public `src/server/*.gs` functions and server-side `requireAuth_`.
- **Build commands (only when applicable):** `npm run build:check`, `npm run build:gas-multifile && npm run check:gas-multifile`, `npm run check:contracts`, `npm run release:preflight`, `npm test`. `package.json` เป็น authority ของคำสั่ง: `npm run build` เขียน CSS + Native stage เท่านั้น; documentation-only ใช้ check scripts กับ stage เดิม ไม่ rebuild โดยไม่จำเป็น.
- **GAS deployment:** Default package ตาม manifest คือ Native26; Native33 เป็น separate candidate; `dist/apps-script/` is generated and untracked. Keep target Apps Script manifest/project identifiers/OAuth permissions outside the bundle. V8 file evaluation order and actual Web App behavior require separate runtime verification.
- **Data boundaries:** v7 MainData 39 columns (OwnerUserID at 39), EventAttachments 13, ReportRegistry 11, AuditLogs 10, VisitLogs 3. Treat P3/P4 conceptual contracts as historical unless reconciled to live source.
- **Report guardrails:** Permission `report`; G-26 warnings advisory; G-17 registry append-only; G-32 one active job per project and unknown-state recovery; G-33 one primary action per Event; Gemini report path pinned to `models/gemini-3.8-flash` and bounded 503 retry only. Human must review generated drafts.
- **Security/privacy:** Never commit real event/health data, Drive/Sheet URLs or IDs copied from production, secrets, access tokens, private configuration, or raw logs. Public aggregate is *not* guaranteed anonymous when groups are small.
- **Review authority:** PR review follows Section 5, step 6. Verify exact SHA, diff, docs, CI, parity and privacy. Product Owner alone authorizes Merge. Deploy/Migration remain separate approvals.
- **Context7:** Detect tools first. For version-dependent external APIs use Context7 library resolution and version-matched docs where available; fall back to official Google Apps Script/Sheets/Drive/Docs/Gemini or Node docs. External docs never supersede repository source, schema or approved baseline.

**Documentation-only boundary (unless a later explicit task authorizes a different scope):** Never modify `src/`, `tests/`, `tools/`, `.github/`, schema, generated One-Click files, existing `doc/features.md`, Workspace data, or production deployment. No Browser UAT or additional UAT task.

---
**Agent reminder:** Read first → Inspect current code → Respect privacy/data integrity → Keep changes scoped → Separate implementation, review, merge, deploy and migration → Report evidence precisely.


## 10. D331 current scope and planning frontier

อ่าน [D331 Remaining Feature Briefs](docs/implementation/d331-remaining-feature-briefs.md) ก่อนวางแผนงาน Dengue; ใช้ existing Issues/decisions ที่ลิงก์ไว้และ source/tests ปัจจุบัน ไม่สร้าง backlog หรือ policy packet ซ้ำ

- **Current source:** Canonical Native26/Native33 คง D331 OFF. Foundation/status registered แบบ inert; Records มี synthetic Case mock. Private readers/guarded CRUD/offline engine มี groundwork แล้ว แต่ยังไม่ใช่ live authorized workflow; P0-31A Case→Plan model merged แต่ยัง unregistered
- **Proposed / HOLD:** D2/P1/P2/S1/S2/C1/C2 และ current trusted DEV binding/allowed data ยังต้องมี scoped, dated/versioned accountable decisions. Role Admin หรือ mock DTO ไม่ใช่ D331 data grant; clinical assessment ยัง `NOT_EVALUATED`
- **Evidence:** DEV version/browser observations เป็น owner/operator receipt ตามวันที่ในทะเบียน ไม่เท่ากับ independent deployed-SHA/binding verification ดู [evidence map](docs/INDEX.md#environment-and-evidence)
- **F01 / P0-31B complete — 29 October 2026:** [PR #261](https://github.com/9GotStory/smart-srrt/pull/261) merged ที่ `f8418c200564da7b9ef9370d350ad890b6a910ca`; exact post-merge CI ผ่าน และ #257/#258/#259 CLOSED/completed สำหรับ synthetic source/offline delivery เท่านั้น ดู [F01 completion evidence](docs/implementation/d331-remaining-feature-briefs.md#f01--p0-31b--synthetic-case--plan-in-records)
- **F02 synthetic DEV — 4 November 2026:** Development Web App เดิมเป็น **Version 22** จาก `main@17975ff3b0a3e863dfcd8e29c3f5a70a0fe13946` ผ่าน [F02 DEV package](docs/implementation/d331-f02-dev-activation.md) ที่แยกจาก canonical package; bounded synthetic-only Browser UAT PASS ตาม operator receipt ใน [#238](https://github.com/9GotStory/smart-srrt/issues/238) ไม่ใช่การอนุมัติข้อมูลจริงหรือ clinical และ #238 ยังเปิด
- **F03 Plans — รอ Independent Review:** [Draft PR #270](https://github.com/9GotStory/smart-srrt/pull/270) ตาม [#269](https://github.com/9GotStory/smart-srrt/issues/269) เป็น source-only/OFF; Merge, activation, Deploy และ Browser UAT เป็นคนละ gate
- **Next frontier:** รอ PO เลือกงานถัดไป แล้วใช้ briefs และ Workflow ใน Section 5 วางแผนหนึ่ง feature และเสนอ scope/test seams ให้อนุมัติก่อนสร้าง/ปรับ Issue หรือเริ่ม Implementation. ไม่เริ่ม F04–F08 อัตโนมัติ; #253 เป็น tests-only comparison ไม่ใช่ D2/P1 approval. Data/UAT/release/Deploy gates คงเดิม
