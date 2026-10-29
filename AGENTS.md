# AGENTS.md — Smart SRRT AI Coding Agent Instructions

> **Current reference — 21 October 2026:** Implementation baseline `main@29ca13ba33f87d46f1f50fba90fe904773b6594a`. ตรวจ GitHub/local HEAD และ Diff ใหม่ก่อนทำงาน; SHA นี้เป็นหลักฐาน ณ วันที่ตรวจ ไม่ใช่ HEAD ถาวร
>
> Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt). [Documentation Index / Source-of-Truth Map](docs/INDEX.md) แยก Current, Historical, Proposed และ HOLD. บันทึกงานวันที่ 12 ต.ค. อยู่ท้ายไฟล์และไม่ใช่คำสั่งปัจจุบันหรือสิทธิ์ Deploy

## 1. Project Context

Smart SRRT เป็นระบบ **Event-based Epidemiological Surveillance** สำหรับพื้นที่สาธารณสุข ครอบคลุม Public Aggregate Dashboard, Authentication/RBAC, การบันทึกและติดตาม Event, ผู้รับผิดชอบ, เอกสารแนบ, Audit, การดูประวัติและสร้างร่างรายงานสอบสวนโรคเบื้องต้นด้วย Gemini

**ไม่ใช่** HIS/LIS, EHR, ระบบอนุมัติรายงาน, เครื่องมือวินิจฉัย, Contact-Tracing Platform หรือ General Workflow Engine. การสร้างเอกสาร AI ไม่ใช่การรับรองความถูกต้องทางคลินิก/ระบาดวิทยา

**Runtime ปัจจุบัน:** Google Apps Script + Google Sheets/Drive/Docs + Gemini API; Frontend HTML/CSS/Vanilla JavaScript; Development Tooling เป็น Node.js/npm, GitHub Actions. ไม่เพิ่ม Node Server, Framework ใหม่, SQL Database, Docker/Podman หรือ Background Queue เองโดยไม่มี Architecture Decision แยกต่างหาก

## 2. Required Reading Order

ก่อนวิเคราะห์ แก้โค้ด หรือรีวิวงาน:

1. **`AGENTS.md`** — ข้อกำหนดการทำงานของ Agent (ไฟล์นี้)
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

### Matt Pocock Skills — Development Workflow

ก่อนใช้ Skill ให้ Codex ตรวจรายการที่ environment เปิดให้ใช้และ `SKILL.md` ที่ติดตั้งจริง อ่านเฉพาะ Skill ที่เกี่ยวข้อง และตรวจวิธีเรียก/ข้อจำกัดของ Skill นั้น ห้ามเดาชื่อคำสั่งหรือถือว่ามี Skill จากชื่อในเอกสาร ตัวอย่างด้านล่างเป็นตัวเลือกตามงาน ไม่บังคับเรียกทุก Skill; หากไม่มี Skill ที่ต้องใช้ ให้รายงานข้อจำกัดและเสนอวิธีทำในขอบเขตที่ได้รับอนุมัติ Skills ไม่เพิ่มสิทธิ์แก้ไฟล์หรือข้าม approval gates ของโครงการ

1. **Research:** ยืนยัน Product Owner Intent, Scope และ Acceptance Criteria; ตรวจ GitHub/local `main` HEAD, Branch Base และ Diff ใหม่ อ่าน Requirements → Source/Tests/Docs ตาม Section 2 พร้อม GitHub Issues/PRs เดิมและ comments ที่เกี่ยวข้อง สรุป Current Implementation, Proposal และสิ่งที่ยังไม่ทราบก่อนวางแผน ใช้งานเดิมเป็นฐานเพื่อหลีกเลี่ยง Issue/เอกสารซ้ำ
2. **Planning:** ใช้ Matt Skills ที่เหมาะสมและตรวจพบจริง เช่น `codebase-design` เมื่อออกแบบ interface/test seam, `domain-modeling` เมื่อปรับความหมาย domain, `grilling` เมื่อมี design decision ที่ต้องถาม PO และ `writing-for-agents` เมื่อแก้เอกสารสำหรับ Agent เสนอแผนที่เล็กและครบหนึ่ง feature: user workflow, source/data boundaries, changes, acceptance/negative tests, test seams, dependencies/blocked decisions และ CI ถาม PO เฉพาะประเด็นสำคัญที่หาคำตอบจากหลักฐานไม่ได้
3. **Product Owner Approval:** ส่ง Implementation Plan ให้ PO อนุมัติ scope และ test seams ก่อนสร้าง/ปรับ Issue หรือเริ่ม Implementation หาก scope/decision สำคัญเปลี่ยน ให้แก้แผนและขออนุมัติส่วนที่เปลี่ยนก่อนเดินต่อ
4. **Specification / GitHub Issue:** หลังแผนได้รับอนุมัติ ใช้ workflow ของ Matt ที่มีให้ใช้จริง เช่น `to-spec` สำหรับสังเคราะห์และเผยแพร่ spec Issue หรือ `to-tickets` เมื่อต้องแบ่งงาน โดยปฏิบัติตามเงื่อนไขการเรียก Skill สร้าง/ปรับ Issue ใน `9GotStory/smart-srrt` ให้ตรงแผน พร้อม acceptance criteria, negative tests, dependencies และ approval gates; ใช้ Issue เดิมเมื่อครอบคลุมงาน สำหรับ D331 ใช้ขอบเขต Planning/Specification ของหนึ่ง feature เป็นค่าเริ่มต้นตาม [Remaining Feature Briefs](docs/implementation/d331-remaining-feature-briefs.md); เพิ่ม implementation tickets ที่เชื่อมโยงกับ spec Issue ได้เฉพาะเมื่อ PO อนุมัติการแบ่งงานอย่างชัดเจน โดยไม่สร้าง Issues ซ้ำหรือขยายไป feature อื่น สถานะ `ready-for-agent` เป็น triage ไม่แทนสิทธิ์ Implementation
5. **Implementation:** เมื่อได้รับอนุมัติ Implementation ตามแผน/Issue ให้ **Developer** พัฒนาใน Feature/Documentation Branch แยกจาก `main` และรักษา exact file scope ใช้ `tdd` สำหรับงาน Code ที่ test seams ซึ่ง PO ยืนยันแล้ว: failing behavior test → minimal passing implementation ทีละ slice; ใช้ synthetic/offline fixtures และ Skills อื่นเฉพาะที่เหมาะสม งาน documentation-only ใช้ checks ตาม scope โดยไม่เพิ่ม code/tests เปิด Draft PR พร้อม Base/Exact Head SHA, Issue/approved scope, changed files, เหตุผล, test evidence, ผลที่ยังไม่ยืนยัน, สิ่งที่ไม่ได้ทำ และความเสี่ยงคงเหลือ
6. **Independent Review:** ให้ **ChatGPT ผู้ตรวจที่แยกจากผู้เขียน** ตรวจ Exact HEAD SHA, Diff เทียบ Base, approved Issue/Plan, Tests และ GitHub CI ที่ HEAD เดียวกัน รวม Security, Schema, Native Parity และ Evidence ตาม scope ใช้ `code-review` เมื่อมีให้ใช้และเหมาะสม; ผล author-assisted ไม่ใช่ independent approval Reviewer ส่ง findings ให้ Developer แก้; เมื่อ HEAD เปลี่ยนต้องตรวจ Diff/Tests/CI และยืนยันผล review ที่ SHA ใหม่
7. **Merge:** หลัง Independent Review ผ่านและมี CI evidence ที่ Exact HEAD ต้องรอ **Product Owner อนุมัติ Merge แยกต่างหาก** ห้าม Direct Push ไป `main` หรือเปิด Auto-merge เพื่อข้าม Gate

ทำเฉพาะ Offline/Mock/Code Review ที่ได้รับมอบหมาย; Browser UAT, External API, Live Workspace และ Production ต้องมีขอบเขตที่อนุมัติเฉพาะ การ Deploy, ใช้ Credentials จริง, เรียก Gemini จริง, เปิดข้อมูลสุขภาพจริง และ Migration ต้องได้รับ **Product Owner Authorization แยกต่างหาก** ตาม Section 6; Green CI ไม่ข้าม Human Gate หากพิสูจน์ไม่ได้ให้ระบุ `Unknown / Not Verified / HOLD` ตามจริง

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

เมื่อ Feature/Schema/UI ถูกเปลี่ยนภายใต้ PR ที่อนุมัติ ให้ปรับ `README.md` และ/หรือ `docs/features.md` ให้ตรง Source; ระบุสถานะ **Implemented in Source**, **Verified by Automated Tests**, **Observed in Deployed UI**, **Planned / Deferred**, **Not Supported** อย่างซื่อสัตย์และแยกหลักฐานให้ชัดเจน

อย่าอัปเดตสถานะ `Deployed` ด้วย GitHub Merge เพียงอย่างเดียว. อย่ากรอก `Observed in Deployed UI` เมื่อไม่มีผลที่ Operator ยืนยันเฉพาะเส้นทางนั้น. เอกสารอ้างอิงเก่าคงไว้ได้โดยไม่บังคับให้แก้ประวัติ แต่ต้องอธิบายความขัดแย้งกับ Current Source ในเอกสารใหม่

## 9. Pre-change Checklist (must be followed)

- **Baseline/identity:** Record repository, exact `main` SHA, branch base SHA, accepted task/PR scope; inspect `git diff --name-status` and file list.
- **Read in priority order:** `AGENTS.md` → `README.md` → `docs/features.md` → `docs/INDEX.md` → relevant `docs/**` → canonical `src/**` + matched `tests/**`. Historical `doc/features.md` is preserved but not the up-to-date feature authority.
- **Frontend/RPC:** Verify visible Thai menu/button/error labels from `src/web/02-app-layout.html`, `03-modals.html` และ client partial เจ้าของพฤติกรรมตาม manifest. Check `google.script.run` calls against public `src/server/*.gs` functions and server-side `requireAuth_`.
- **Build commands (only when applicable):** `npm run build:check`, `npm run build:gas-multifile && npm run check:gas-multifile`, `npm run check:contracts`, `npm run release:preflight`, `npm test`. `package.json` เป็น authority ของคำสั่ง: `npm run build` เขียน CSS + Native stage เท่านั้น; documentation-only ใช้ check scripts กับ stage เดิม ไม่ rebuild โดยไม่จำเป็น.
- **GAS deployment:** Default package ตาม manifest คือ Native26; Native33 เป็น separate candidate; `dist/apps-script/` is generated and untracked. Keep target Apps Script manifest/project identifiers/OAuth permissions outside the bundle. V8 file evaluation order and actual Web App behavior require separate runtime verification.
- **Data boundaries:** v7 MainData 39 columns (OwnerUserID at 39), EventAttachments 13, ReportRegistry 11, AuditLogs 10, VisitLogs 3. Treat P3/P4 conceptual contracts as historical unless reconciled to live source.
- **Report guardrails:** Permission `report`; G-26 warnings advisory; G-17 registry append-only; G-32 one active job per project and unknown-state recovery; G-33 one primary action per Event; Gemini report path pinned to `models/gemini-3.8-flash` and bounded 503 retry only. Human must review generated drafts.
- **Security/privacy:** Never commit real event/health data, Drive/Sheet URLs or IDs copied from production, secrets, access tokens, private configuration, or raw logs. Public aggregate is *not* guaranteed anonymous when groups are small.
- **Review authority:** For UX-R2, Product Owner selected ChatGPT Technical Review even when author-assisted; explicitly disclose that it is not an independent/distinct-author approval. Verify exact SHA, diff, docs, CI, parity and privacy. Product Owner alone authorizes Merge. Deploy/Migration remain separate approvals. Other projects may maintain stricter independent-review requirements.
- **Context7:** Detect tools first. For version-dependent external APIs use Context7 library resolution and version-matched docs where available; fall back to official Google Apps Script/Sheets/Drive/Docs/Gemini or Node docs. External docs never supersede repository source, schema or approved baseline.

**Documentation-only boundary (unless a later explicit task authorizes a different scope):** Never modify `src/`, `tests/`, `tools/`, `.github/`, schema, generated One-Click files, existing `doc/features.md`, Workspace data, or production deployment. No Browser UAT or additional UAT task.

---
**Agent reminder:** Read first → Inspect current code → Respect privacy/data integrity → Keep changes scoped → Separate implementation, review, merge, deploy and migration → Report evidence precisely.


## 10. D331 current scope and planning frontier

อ่าน [D331 Remaining Feature Briefs](docs/implementation/d331-remaining-feature-briefs.md) ก่อนวางแผนงาน Dengue; ใช้ existing Issues/decisions ที่ลิงก์ไว้และ source/tests ปัจจุบัน ไม่สร้าง backlog หรือ policy packet ซ้ำ

- **Current source:** D331 OFF. Foundation/status registered แบบ inert; Records มี synthetic Case mock. Private readers/guarded CRUD/offline engine มี groundwork แล้ว แต่ยังไม่ใช่ live authorized workflow; P0-31A Case→Plan model merged แต่ยัง unregistered
- **Proposed / HOLD:** D2/P1/P2/S1/S2/C1/C2 และ current trusted DEV binding/allowed data ยังต้องมี scoped, dated/versioned accountable decisions. Role Admin หรือ mock DTO ไม่ใช่ D331 data grant; clinical assessment ยัง `NOT_EVALUATED`
- **Evidence:** DEV version/browser observations เป็น owner-reported ตามวันที่ในทะเบียน ไม่เท่ากับ independent deployed-SHA/binding verification ดู [evidence map](docs/INDEX.md#environment-and-evidence)
- **Documentation Alignment complete:** [PR #255](https://github.com/9GotStory/smart-srrt/pull/255) Merge แล้วที่ `main@b289d969b915c91db996b48b19a00bf294c107d1` ครอบคลุม `AGENTS.md`, `README.md`, `docs/features.md`, `docs/INDEX.md`; ไม่ใช่สิทธิ์ Deploy หรือเปิดข้อมูลจริง
- **F01 / P0-31B complete — 29 October 2026:** [PR #261](https://github.com/9GotStory/smart-srrt/pull/261) merged ที่ `f8418c200564da7b9ef9370d350ad890b6a910ca`; exact post-merge CI ผ่าน และ #257/#258/#259 CLOSED/completed สำหรับ synthetic source/offline delivery เท่านั้น ดู [F01 completion evidence](docs/implementation/d331-remaining-feature-briefs.md#f01--p0-31b--synthetic-case--plan-in-records)
- **Next frontier:** รอ PO เลือกงานถัดไป แล้วใช้ briefs และ Workflow ใน Section 5 วางแผนหนึ่ง feature และเสนอ scope/test seams ให้อนุมัติก่อนสร้าง/ปรับ Issue หรือเริ่ม Implementation. ไม่เริ่ม F02–F08 อัตโนมัติ; #253 เป็น separate tests-only candidate. D331 OFF และ data/UAT/release/Deploy gates คงเดิม

## Historical task records — 11–12 October 2026

<details>
<summary>Historical source/review snapshots and task-specific instructions (not current instructions)</summary>

ข้อความด้านล่างรักษาบริบทเดิม รวม candidate/NOT MERGED, topology เก่า และข้อกำหนดเฉพาะงาน ณ เวลานั้น Current source/permission ต้องอ่านส่วนบนและ INDEX; ข้อความเหล่านี้ไม่ยกเลิก scope ที่ PO อนุมัติในงานปัจจุบัน และไม่เป็นสิทธิ์ Deploy/Migrate

> **Current source authority (2026-10-12):** `main@7a8e2efeab239bac9bf708ed1e86f28b710f6726` includes GS-S1…GS-S5 merged (PRs #95–#99), verified 60 contract/419 full regression tests and **24 Native staged files**. The older 11 October 2026 14-file/one-click notes in this file are historical and must not be treated as the current Native topology. **DEPLOYMENT=HOLD**. See [Security Release Readiness Review](docs/release/security-release-readiness-review-2026-10-12.md) and [Project Handoff](docs/handoff/smart-srrt-security-release-2026-10-12.md). Source review does not authorize Apps Script writes, live account migration or Merge without explicit owner approval.

> ใช้กับ Codex, Claude Code, Antigravity, Multica และ AI Coding Agents ที่ทำงานใน Repository นี้
> Canonical Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt)
> เอกสารชุดนี้อ้างอิง `main@1486211d0cbbcd8bc772dda6a5d9ab2d2a32f778` ณ 11 ตุลาคม 2026; **ทุก Agent ต้องตรวจ HEAD จริงก่อนเริ่มงานครั้งต่อไป** ห้ามถือ SHA นี้เป็น HEAD ถาวร

## 9. UX-R2-03B Native Release Inspection Gate (12 October 2026)

Product Owner authorized Issue #86 following PR #85 merge at `main@60f6eca0300341879d227b25121cdb31af351439`, specifically to eliminate old One-Click dependency from release verification and regression tests.

- **Source of Truth:** `tools/native-sources.mjs`; **7 server `.gs` + 6 HTML partials + generated `Index.html` = 14 staged Native files**. `src/web/03a-dashboard-mobile.html` remains a separate small component; no existing production HTML/server logic is changed in this task.
- **Current verification:** `tools/native-release-inspection.mjs` reads ordered Native source and `dist/apps-script/` byte-for-byte; `tests/g30-release-parity.test.mjs`, G-34, P6 offline preflight, and behavioral regression tests use the **current** Native release instead of a frozen One-Click image. Preserve installer/migration, auth/report/privacy, schema v7 and release-HOLD checks.
- **Frozen historical references:** `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` / `Index_Smart_SRRT_OneClick.html` must remain **byte-identical** to Git blobs `e762751ff5da5813f7c64c104b67d545378f1608` / `ba4e0aeb5fdb0b1434320c351f32ed877a96d51d`. `tests/legacy-one-click-freeze.test.mjs` checks these as **archival integrity only**, never latest release source. `tools/build-one-click.mjs` is historical and must NOT be run with `--write`.
- **Allowed work:** Tests, read-only Native inspector, P6 source/stage checks, documentation, CI when needed and analysis of guarded clasp staging. **Forbidden:** production `.gs`, Browser App, UI behavior, Data/Sheets schema, permissions, report generation, `clasp push`, installer, migration, Apps Script @10 deployment.
- **Ordered pipeline:** `npm ci --ignore-scripts` → `check:ui-assets` → `build:gas-multifile` → `build:check` / `check:gas-multifile` → `check:contracts` → `release:preflight` → `npm test`. Source/Stage drift and missing files fail closed. All checks read-only except explicit output staging.
- **Human gates:** ChatGPT Technical Review (author-assisted, not independent), explicit Product Owner **PR Merge** approval, and separate explicit **Apps Script Deployment** approval. CI PASS is not HTML Service/real-user/UAT approval.

## UX-R2-M01-00 — Browser Modular Test Foundation (12 October 2026)

Test-only preparation for future client module extraction: `tests/helpers/native-client.mjs` reads ordered classic inline JavaScript directly from `tools/native-sources.mjs`; `tests/helpers/native-current.mjs` exports `nativeClientScripts` and `nativeClientSource` while retaining `nativeBrowser` for old regression suites. Keep one final `boot()`; preserve inline markup global handlers, HTML Service/classic script lexical bindings, duplicate `fileToBase64` baseline, RPC/auth contracts and Native stage checks. No source extraction, One-Click writes, clasp execution, schema change, merge, or deployment is authorized by M01-00 itself. See `docs/implementation/ux-r2-m01-00-browser-module-foundation.md`.

## UX-R2-M01-01 — Native Client Core Extraction (12 October 2026)

Current source candidate introduces `src/web/03b-client-core.html` (shared state/fields/RPC/utilities/RBAC guards) and `src/web/03c-client-auth.html` (navigation, theme, boot definition, login/logout/registration), both **classic inline scripts**. `src/web/04-browser-app.html` still owns the one final `boot()` call and the closing HTML tags. `tools/native-sources.mjs` includes both partials after mobile and before 04; Native stage is **16 files**. These changes are source-only until explicit Apps Script deployment approval; frozen One-Click archives must never be rebuilt. `tests/helpers/native-current.mjs` provides a temporary manifest-derived `nativeBrowser` compatibility export for historical VM harnesses, not a release build. `tools/deploy-g34-clasp.sh` receives an updated staged-file allowlist but is **not run**. Do not modify report job logic, server RPC boundaries, privacy rules, Schema v7, or authorization behavior during this extraction. Full suite/source checks and a separate Product Owner merge gate are required.

## UX-R2-M01-02 Native Dashboard Extraction (12 October 2026)

Source candidate: `03d-client-dashboard.html` owns original filter/guest/authorized KPI/race guard/Google Charts; `03e-client-dashboard-export.html` owns original XLSX/authorized server-export invocation/PNG capture. They are included **after auth and before** `04-browser-app.html` by `tools/native-sources.mjs`. The final 04 script still owns one `boot()` invocation and closing document. Native staging has **18** files. Preserve `getPublicDashboardData` aggregate-only guest handling, `dashboardLoadRequest` invalidation on auth changes, `getDashboardData` authorization, Chart.js deferral, and all G32/G33 reporter-state constraints. G32/G33 test sections use `loadAdmin()` boundary after moving exports; do not weaken those behavior assertions. Historical `nativeBrowser` test source view is manifest-derived and not deployed. Source-only branch and PR: DO NOT execute `tools/deploy-g34-clasp.sh`, clasp, migrations, installer, or any Workspace/Gemini action. No Merge or Deploy without separate Product Owner approval; see `docs/implementation/ux-r2-m01-02-dashboard.md`.

## UX-R2-M01-03 Event Native Partials (12 October 2026)

In unmerged source candidate, event functions are extracted byte-preserving to `03f-client-event-controls.html` (Owner/Attachments and Event badges), `03g-client-event-history.html` (G-27 private report history, new-report confirmation and keyboard/async guards), and `03h-client-event-records.html` (Event tables/forms, 26 field mapping, lifecycle and EventID/Revision close/reopen/void/save). Native manifest ordering is core → auth → Dashboard → export → controls → history → records → `04-browser-app.html`, which retains G26/G32/G33 AI Reporter job and Admin, the only `boot()` call and closing document. Stage = **21 files** (7 GS + 13 HTML + Index). Original duplicate `fileToBase64` declarations remain for characterization, not cleanup. Review `docs/implementation/ux-r2-m01-03-event-management.md`. Historical combined cross-partial VM harnesses must slice code from `nativeClientSource`, never HTML containing closing/opening script tags. Preserve same guest/role/auth/session/privacy/EventID/Revision constraints; no server business changes, One-Click rebuild, clasp execution, installer, data mutation, deployment or Merge without separate approval.

## UX-R2-M01-04 AI Reporter Native Partials (12 October 2026)

On the source-only PR candidate, `03i-client-report-actions.html` holds readiness/registry summaries/report buttons/preflight; `03j-client-report-job.html` holds job status, polling/cancel/recovery/run dispatch; `03k-client-report-generation.html` holds `executeReport`, `makeReport`, and warning continuation. They execute as classic JS after Event Records and before final `04-browser-app.html`, which contains Admin/Library, duplicate `fileToBase64` and the one final `boot()`. Native staged manifest contains **24 files**, generated from 7 GS + 16 HTML + Index. Regression G-32/G-33 source harnesses now use `nativeClientSource` (JS only) to span separate script tags, maintaining actual state/race checks. Preserve guest privacy, Report Registry G17/G27, G26/G32/G33 single action, unknown-state, session fencing, cancel, and no duplicate reports. No `clasp`, backend/schema changes, Workspace/Gemini calls, One-Click updates, Merge or Deploy without separate Product Owner approval. Details: `docs/implementation/ux-r2-m01-04-ai-reporter.md`.

## UX-R2-M01-05 Final Native Stabilization (12 October 2026)

Candidate source-only test gate: `tests/ux-r2-m01-final-stabilization.test.mjs` is integrated in `npm run check:contracts` and `npm test`. It freezes the approved 24-file Native topology (7 GS + 16 HTML + Index), ordered client classic scripts, one final `boot()`, shared lexical state and inline HTML handlers, network-free module initialization, guest report denial, unknown-state and in-flight lock safeguards. Negative fixtures must fail for reordering, duplicate boot, unexpected global function overwrites and broken handlers. The only allowed duplicate is legacy `fileToBase64` (`03f-client-event-controls.html` and `04-browser-app.html`); it is characterized, not changed. **Do not** remove/rename or silently fix without a separately approved behavior test. Review `docs/implementation/ux-r2-m01-05-final-stabilization.md`. Source tests alone are not Apps Script/browser UAT or deployment authority. Maintain explicit separate Product Owner Merge and Apps Script @10 Deploy approval. Do not use Codex/Multica, regenerate One-Click, change server/schema, or call live Workspace/Gemini/clasp in this gate.

## Server Architecture Review and Security Gate (12 October 2026)

Review `docs/architecture/gs-architecture-review-2026-10-12.md` before creating new server RPCs, changing menu/migration/recovery functions, or proposing a Native Apps Script deployment. The existing seven GS modules are sufficient; do not split or refactor by length alone. The **unmerged, doc-only** source audit identifies unguarded operator-maintenance RPCs and password-bearing user-update audit payloads, along with authentication/report-consent/data-observability follow-ups. Do not treat the 379 regression PASS source result as live security verification. Keep publicly callable RPC boundaries authenticated/allowlisted; only publish safe, redacted audit details; preserve ScriptLock/EventID+Revision, G32 single-job/nonce/unknown state, Schema v7 and frozen One-Click. Actual deployed Web App version/access/executeAs is unverified; never test sensitive administrator mutations live without separate, explicit owner authorization. Owner approval is required for each remediation PR Merge and any Apps Script deployment.

## GS-S1 Privileged Operator RPC Boundary — Human / AI Rules (2026-10-12)

Security candidate: `src/server/00-bootstrap.gs` defines private `requireTrustedOperator_(operation)` and requires **explicit `GS_TRUSTED_OPERATOR_EMAIL` Script Property**, matching both `Session.getActiveUser().getEmail()` and `Session.getEffectiveUser().getEmail()`. Never infer operator trust from the web app's execute-as identity, client-provided user/email, or an existing Smart SRRT session token. A blank active-user identity must fail closed. Preserve 15 guarded public maintenance/migration/Gemini wrappers for Spreadsheet menu compatibility, and limit HTML `include()` to exact manifest partial basenames. `tests/gs-s1-operator-rpc-boundary.test.mjs` freezes 69 public server function declarations and tests denied/matching identities, private helper and HTML include boundaries in offline VM; it is in `check:contracts`. See `docs/implementation/gs-s1-operator-rpc-boundary.md`. Do not configure properties on production, run live migrations/reset, merge, or deploy without separate owner approval; actual Apps Script @10 is unchanged. GS-S2 credential-bearing audit payload remediation is still outstanding.

## GS-S2 Credential / Audit Redaction (2026-10-12)

Review `docs/implementation/gs-s2-credential-audit-redaction.md`. Source candidate changes `updateUser` audit before/after payloads to allowlisted role/status and changed-field metadata plus `passwordChanged` boolean; **never log UserAccounts row index 3 PasswordHash or raw `patch.newPassword`**. `writeAudit_` applies defense-in-depth sanitization to structured JSON credential keys and labeled token/password text. Synthetic security tests in `tests/gs-s2-credential-audit-redaction.test.mjs` are part of `check:contracts` and `npm test`. Preserve UserAccounts mutation behavior, audit metadata columns, role authorization and GS-S1 guard. Do not claim arbitrary unlabeled prose secrets or historical AuditLogs are sanitized. Historical audit/archives/backups review and credential rotation require explicit separate authorization, as do Merge and Apps Script deployment. Keep public-facing workflows unchanged. No live data or credentials accessed.

## GS-S3 Authentication Modernization (2026-10-12 candidate)

`docs/implementation/gs-s3-authentication-modernization.md` is the source-authoritative design and rollout limitations. Password digests are versioned: old unsalted 64-hex SHA-256 is accepted only for successful one-time compare-and-swap login migration; all new/changed passwords use randomized salted PBKDF2-HMAC-SHA256 at 12000 rounds. **This transitional cost must be benchmarked and reviewed in non-production GAS before deployment**; it is not contemporary maximum-strength identity security. Admin/new registration passwords must be 12–128 characters, and GS-S1 operator credentials have longer random defaults. SessionCache stores user ID + current verifier tag, so password changes revoke old tokens; legacy email-only sessions require re-login after rollout. Login counter is per normalized email, CacheService-evictable best effort, *not* a substitute for global/per-client rate limiting. Keep GS-S2 sanitized audits and secret-free tests. `tests/gs-s3-authentication-modernization.test.mjs` is in `check:contracts` and full regression; never mutate real UserAccounts, Script Properties, old session caches, reset credentials or Apps Script deployment without separate owner approval. No client files touched.

## GS-S4 Server-side Report Regeneration Consent (12 October 2026)

Source candidate: `docs/implementation/gs-s4-server-report-consent.md`. The newly authorized public RPC `prepareReportRegeneration(sessionToken,eventId)` requires `report` permission and valid existing ReportRegistry history, then issues a five-minute, one-use UUID capability bound to ownerId, EventID, report count, latest ReportID and current Event Revision. `createReportJob(sessionToken,eventId,regenerationConsentId)` **must enforce the current registry state inside the G-32 ScriptLock**. For first reports only an authoritative empty registry permits creation without a capability. Never treat a browser Boolean, a stale zero-count dashboard, or an unconfirmed/corrupt Registry as permission to regenerate. UI explicitly confirms from G-27 history, threads capability through readiness warnings, and clears it on logout; keep G-33 session fences and G-32 owner/nonce/cancellation semantics. Offline VM tests in `tests/gs-s4-report-regeneration-consent.test.mjs` join `check:contracts` and full suite; mocks are not real Apps Script browser UAT. This is an authenticated two-step business-consent proof, **not cryptographic evidence a human clicked the button**. Never Merge/Deploy without separate owner approval; do not mutate live Registry/Jobs or use clasp. Frozen One-Click stays unchanged.

## GS-S5 Audit Observability & Maintainability (2026-10-12 candidate)

Read `docs/implementation/gs-s5-audit-observability.md`. `writeAudit_` returns **boolean success/failure** while still preserving its pre-existing **best-effort never-throw** policy, particularly after durable G-32 ReportRegistry commits and other completed business mutations. Source-only health telemetry is tracked at Script Property `SRRT_GS5_AUDIT_WRITE_HEALTH_V1` with at most state, advisory failure count, ISO timestamps and allowlisted operation code; never record actor email, EventID, targetId, payload, passwords, exception.message or stack in telemetry/Logger. A failed telemetry write must not turn committed work into failure. Existing `getAuditRetentionStatus(sessionToken)` remains protected by `audit` RBAC and adds an `auditWriteHealth` summary shown in the Admin view. A missing health record is `unobserved` (NOT proof of audit completeness), and telemetry store errors are `unavailable`; counters are advisory, not exactly-once atomic due to concurrent operations. Keep G-32 idempotency and post-commit semantics, GS-S2 credential redaction, untouched schema/One-Click and Native staging. `tests/gs-s5-audit-observability.test.mjs` joins the contract/full suite. **No real Script Properties, AuditLogs, archives or Workspace actions were performed; Merge and Apps Script deployment require separate Owner approval.**

</details>
