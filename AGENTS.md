# AGENTS.md — Smart SRRT AI Coding Agent Instructions

> ใช้กับ Codex, Claude Code, Antigravity, Multica และ AI Coding Agents ที่ทำงานใน Repository นี้  
> Canonical Repository: [9GotStory/smart-srrt](https://github.com/9GotStory/smart-srrt)  
> เอกสารชุดนี้อ้างอิง `main@1486211d0cbbcd8bc772dda6a5d9ab2d2a32f778` ณ 11 ตุลาคม 2026; **ทุก Agent ต้องตรวจ HEAD จริงก่อนเริ่มงานครั้งต่อไป** ห้ามถือ SHA นี้เป็น HEAD ถาวร

## 1. Project Context

Smart SRRT เป็นระบบ **Event-based Epidemiological Surveillance** สำหรับพื้นที่สาธารณสุข ครอบคลุม Public Aggregate Dashboard, Authentication/RBAC, การบันทึกและติดตาม Event, ผู้รับผิดชอบ, เอกสารแนบ, Audit, การดูประวัติและสร้างร่างรายงานสอบสวนโรคเบื้องต้นด้วย Gemini

**ไม่ใช่** HIS/LIS, EHR, ระบบอนุมัติรายงาน, เครื่องมือวินิจฉัย, Contact-Tracing Platform หรือ General Workflow Engine. การสร้างเอกสาร AI ไม่ใช่การรับรองความถูกต้องทางคลินิก/ระบาดวิทยา

**Runtime ปัจจุบัน:** Google Apps Script + Google Sheets/Drive/Docs + Gemini API; Frontend HTML/CSS/Vanilla JavaScript; Development Tooling เป็น Node.js/npm, GitHub Actions. ไม่เพิ่ม Node Server, Framework ใหม่, SQL Database, Docker/Podman หรือ Background Queue เองโดยไม่มี Architecture Decision แยกต่างหาก

## 2. Required Reading Order

ก่อนวิเคราะห์ แก้โค้ด หรือรีวิวงาน:

1. **`AGENTS.md`** — ข้อกำหนดการทำงานของ Agent (ไฟล์นี้)
2. **[`README.md`](README.md)** — ขอบเขต ระบบ และวิธีพัฒนา/ปล่อย One-Click
3. **[`docs/features.md`](docs/features.md)** — ความสามารถจริงและ Feature Status Matrix
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
docs/features.md       Human + Agent System Feature Reference
README.md             Project Overview
AGENTS.md             Repository-wide Agent Rules
Code_Smart_SRRT_OneClick_v2026.09.08.1.gs
Index_Smart_SRRT_OneClick.html
```

**Modular Source is canonical**. `tools/build-one-click.mjs` ประกอบ Source 7+5 ไฟล์ตามลำดับตายตัวให้กลายเป็น One-Click Artifacts สองไฟล์ที่อยู่ Root. Source Code ไม่ได้แยก Deploy เป็น GAS Files รายตัวโดยอัตโนมัติ. ผู้ดูแลใช้ Artifacts ไปวางใน `Code.gs` และ `Index` ตาม Deployment Guide

**G-34 Native Multi-file Candidate:** `tools/build-apps-script-multifile.mjs` สร้าง `dist/apps-script/` แบบ Generated/Untracked ประกอบด้วย 7 `.gs` + 5 HTML Partials + `Index.html` (ใช้ `<?!= include(...) ?>`). ต้องตรวจ `npm run build:gas-multifile` → `npm run check:gas-multifile` และ Regression Tests ก่อนส่งให้ผู้ตรวจอิสระ. **ชุด 13 ไฟล์ไม่รวม `appsscript.json`**: ต้องรักษา Project Manifest, OAuth scopes, V8 runtime และสิทธิ์ของโปรเจกต์ Apps Script เดิมไว้ และห้ามนำ Candidate เข้าระบบใช้งานจริงหรือถอด One-Click เดิมออกจาก Apps Script ที่กำลังให้บริการเพียงเพราะสร้างไฟล์สำเร็จ; Deployment/Migration ยังคงใช้ Human Gate แยก. หากใช้ `clasp` ในอนาคต ต้องรักษา Config/Credentials นอก Git และระวังว่า `clasp push` เขียนทับไฟล์ทั้งหมดของ Project. ดู [คู่มือ G-34](docs/deployment/g34-native-multifile-apps-script.md).

## 4. Engineering Invariants — DO NOT BREAK

1. **Source/Build Parity:** แก้ `src/server/` หรือ `src/web/` เป็นอันดับแรก แล้วประกอบและตรวจ byte-for-byte ด้วย `npm run build` / `npm run build:check` ตาม Scope งาน. ห้ามแก้ Generated Artifact อย่างเดียว. **ใน PR ที่เป็น Documentation Only ห้ามเปลี่ยน Artifacts ทั้งสอง**
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

เมื่อ Feature/Schema/UI ถูกเปลี่ยนภายใต้ PR ที่อนุมัติ ให้ปรับ `README.md` และ/หรือ `docs/features.md` ให้ตรง Source; ระบุสถานะ **Implemented in Source**, **Verified by Automated Tests**, **Observed in Deployed UI**, **Planned / Deferred**, **Not Supported** อย่างซื่อสัตย์และแยกหลักฐานให้ชัดเจน

อย่าอัปเดตสถานะ `Deployed` ด้วย GitHub Merge เพียงอย่างเดียว. อย่ากรอก `Observed in Deployed UI` เมื่อไม่มีผลที่ Operator ยืนยันเฉพาะเส้นทางนั้น. เอกสารอ้างอิงเก่าคงไว้ได้โดยไม่บังคับให้แก้ประวัติ แต่ต้องอธิบายความขัดแย้งกับ Current Source ในเอกสารใหม่

## 9. UX-R2-02 Shared UI Gate (11 Oct 2026)

R2-01 Tailwind v4 Build Foundation was separately reviewed and merged as `main@055677fba61e8df95f93776661386957bdb902de`. The Product Owner subsequently authorized **UX-R2-02 incremental Shared UI work**, tracked in [Issue #80](https://github.com/9GotStory/smart-srrt/issues/80) on `feat/ux-r2-02-shared-ui`. This gate supersedes the narrower R2-01 authorization **only for that branch and task**.

- **Authorized:** improve existing five-page sidebar/navigation semantics, shared focus/button/form/table CSS, skip link, mobile drawer and labelled core table regions; replace an audited small subset of static nav/hamburger icons with pinned Lucide SVGs; add `src/styles/shared-ui.css`, deterministic generated CSS/One-Click outputs, synthetic tests/CI and directly related docs/license.
- **Not authorized:** new business pages, full visual redesign of every modal, server `.gs` changes, schema/RPC/auth changes, dashboard KPI/Excel privacy changes, G-26/G-32/G-33 AI report/job behavior, Chart.js replacement, changing Gemini, real user records or deployment.
- **Invariant:** preserve five `data-page` values, original `page-*`, all `google.script.run` and `EventID` semantics, role-aware menu visibility, original responsive route behavior. No component-only permission assumptions.
- **Build:** 7 `.gs` + 5 HTML partials + `Index.html` (13 GAS files), exact One-Click parity, Preflight-disabled `tw:` Tailwind and no runtime Lucide CDN. Existing external Font Awesome remains required by icons outside the migrated navigation.
- **Verification:** `npm ci --ignore-scripts`; `check:ui-assets`; `build:check`; `build:gas-multifile` and `check:gas-multifile`; `check:contracts`; `release:preflight`; full `npm test` and controlled synthetic shared-navigation tests.
- **Gate separation:** ChatGPT Technical Review (author-assisted; not independent), then **Product Owner explicit PR Merge approval**, then later **separate** Apps Script runtime/deploy approval. Web App @10 must not be changed by repository build or this PR.

## 10. Pre-change Checklist (must be followed)

- **Baseline/identity:** Record repository, exact `main` SHA, branch base SHA, accepted task/PR scope; inspect `git diff --name-status` and file list.
- **Read in priority order:** `AGENTS.md` → `README.md` → `docs/features.md` → relevant `docs/**` → canonical `src/**` + matched `tests/**`. Historical `doc/features.md` is preserved but not the up-to-date feature authority.
- **Frontend/RPC:** Verify visible Thai menu/button/error labels from `src/web/02-app-layout.html`, `03-modals.html`, `04-browser-app.html`. Check `google.script.run` calls against public `src/server/*.gs` functions and server-side `requireAuth_`.
- **Build commands (only when applicable):** `npm run build:check`, `npm run build:gas-multifile && npm run check:gas-multifile`, `npm run check:contracts`, `npm run release:preflight`, `npm test`. `npm run build` writes tracked One-Click artifacts and **must not** run in a documentation-only change.
- **GAS deployment:** 7 script files + 5 HTML fragments + generated `Index.html` are a candidate; `dist/apps-script/` is generated and untracked. Keep target Apps Script manifest/project identifiers/OAuth permissions outside the bundle. V8 file evaluation order and actual Web App behavior require separate runtime verification.
- **Data boundaries:** v7 MainData 39 columns (OwnerUserID at 39), EventAttachments 13, ReportRegistry 11, AuditLogs 10, VisitLogs 3. Treat P3/P4 conceptual contracts as historical unless reconciled to live source.
- **Report guardrails:** Permission `report`; G-26 warnings advisory; G-17 registry append-only; G-32 one active job per project and unknown-state recovery; G-33 one primary action per Event; Gemini report path pinned to `models/gemini-3.8-flash` and bounded 503 retry only. Human must review generated drafts.
- **Security/privacy:** Never commit real event/health data, Drive/Sheet URLs or IDs copied from production, secrets, access tokens, private configuration, or raw logs. Public aggregate is *not* guaranteed anonymous when groups are small.
- **Review authority:** For UX-R2, Product Owner selected ChatGPT Technical Review even when author-assisted; explicitly disclose that it is not an independent/distinct-author approval. Verify exact SHA, diff, docs, CI, parity and privacy. Product Owner alone authorizes Merge. Deploy/Migration remain separate approvals. Other projects may maintain stricter independent-review requirements.
- **Context7:** Detect tools first. For version-dependent external APIs use Context7 library resolution and version-matched docs where available; fall back to official Google Apps Script/Sheets/Drive/Docs/Gemini or Node docs. External docs never supersede repository source, schema or approved baseline.

**Documentation-only boundary of this PR:** Never modify `src/`, `tests/`, `tools/`, `.github/`, schema, generated One-Click files, existing `doc/features.md`, Workspace data, or production deployment. No Browser UAT or additional UAT task.

---
**Agent reminder:** Read first → Inspect current code → Respect privacy/data integrity → Keep changes scoped → Separate implementation, review, merge, deploy and migration → Report evidence precisely.
