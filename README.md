> **GS-S5 Audit Observability (source candidate; NOT merged/deployed):** The AuditLogs write sink records non-secret, best-effort degraded/recovered health under a bounded Script Property and a safe Apps Script execution warning when an append fails. The existing Audit-retention Admin panel exposes health through the protected `audit` permission; once a report is committed, an Audit failure still cannot force duplicate report generation. No health alerts imply perfect completeness. [GS-S5 runbook](docs/implementation/gs-s5-audit-observability.md).

> **GS-S4 Server-side Report Consent (candidate; not merged/deployed):** An authenticated G-27 history confirmation now requests a short-lived server-issued one-use regeneration capability, tied to the owner, EventID, Report Registry count/latest ReportID and Event Revision. `createReportJob` checks this inside the G-32 job lock before allowing a repeat report; guest, stale, cross-user, forged or unknown-state retries fail closed. See [GS-S4](docs/implementation/gs-s4-server-report-consent.md).

> **GS-S3 Authentication Modernization — source candidate, NOT deployed (2026-10-12):** Adds versioned salted PBKDF2-HMAC-SHA256 verifier for new/updated passwords, one-time successful legacy SHA-256 migration, stronger registration policy, account-scoped best-effort login throttling and password-bound sessions with revocation on password change. Explicit non-production performance and identity-policy validation remain required before production. No user rows or Apps Script deployments changed. [GS-S3 details](docs/implementation/gs-s3-authentication-modernization.md).

> **GS-S2 Credential / Audit Redaction (source candidate; not merged/deployed):** UpdateUser audit records now use an allowlisted non-secret change summary; central AuditLogs sink masks structured credential fields and Bearer tokens. Synthetic VM contract tests ensure passwords and PasswordHash never reach new audit rows. Existing/historical AuditLogs are **not** scanned, migrated or deleted. See [GS-S2](docs/implementation/gs-s2-credential-audit-redaction.md).

> **GS-S1 Security Boundary (source candidate; not merged/deployed):** Fifteen privileged Apps Script maintenance/migration/model entrypoints now require an explicitly provisioned `GS_TRUSTED_OPERATOR_EMAIL` plus matching nonblank Google active and effective identities. Trusted HTML `include()` names are allowlisted to the 16 Native partials; the normal app RPC surface and 24-file stage remain unchanged. Future operator maintenance will fail closed until this property is configured. [Read GS-S1](docs/implementation/gs-s1-operator-rpc-boundary.md).

> **GS Architecture Review (2026-10-12; documentation only):** Seven Native server modules are structurally sufficient. Source review identified privileged-operator RPC boundaries and credential-bearing audit payloads needing priority security triage before a new production release. No Runtime changes, Merge or Apps Script deployment. Read [GS Architecture Review](docs/architecture/gs-architecture-review-2026-10-12.md).

> **UX-R2-M01-05 Final Native Stabilization (12 Oct 2026; source-only candidate):** A new test-only 24-file Native topology and browser-global contract checks exact script order, unique final `boot()`, original `fileToBase64` duplicate, no pre-boot RPC, HTML inline handlers, and fail-closed AI Reporter state. Includes negative drift fixtures. The gate is wired to `npm run check:contracts` and `npm test`. **No runtime behavior change, no Merge or Apps Script @10 deployment.** See [M01-05](docs/implementation/ux-r2-m01-05-final-stabilization.md).

> **UX-R2-M01-04 AI Reporter Modularization (12 Oct 2026; candidate source only):** Report readiness/actions, job polling/recovery/cancellation, and AI generation have been extracted byte-for-byte into `03i-client-report-actions.html`, `03j-client-report-job.html`, and `03k-client-report-generation.html`. The Native candidate stages **24 files** (7 GS + 16 HTML + generated Index). Admin/Library and single final `boot()` remain in `04-browser-app.html`. G-26/G-32/G-33 safeguards, frozen One-Click and Apps Script @10 stay unchanged; not merged or deployed. See [M01-04](docs/implementation/ux-r2-m01-04-ai-reporter.md).

> **UX-R2-M01-03 Event Management Modularization (12 Oct 2026; source candidate, not deployed):** Separate Event Owner/Attachments (`03f-client-event-controls.html`), Event Report History (`03g-client-event-history.html`) and Event Records/Lifecycle (`03h-client-event-records.html`) from `04-browser-app.html` without rewriting logic. Native stage now **21 files** (7 GS + 13 HTML + Index); Reporter Job remains in final 04. Frozen One-Click, production Apps Script @10 and schema v7 are unchanged. See [M01-03](docs/implementation/ux-r2-m01-03-event-management.md).

> **UX-R2-M01-02 Dashboard Modularization (12 Oct 2026; candidate source only):** Native HTML manifest now includes `03d-client-dashboard.html` and `03e-client-dashboard-export.html` before `04-browser-app.html` (7 GS + 10 HTML + Index = **18 stage files**). The original Dashboard filtering, KPI, guest aggregation, Google Charts, XLSX/server exports, and capture functions are moved without logic changes; Chart.js migration is separately gated. AI Reporter and frozen One-Click remain unchanged. Source is **not deployed** to Apps Script @10. See [M01-02](docs/implementation/ux-r2-m01-02-dashboard.md).

> **UX-R2-M01-01 (12 ต.ค. 2569; Source Candidate ไม่ใช่ Deploy):** แยก Shared Core + Auth/Session ออกจาก `04-browser-app.html` เป็น `03b-client-core.html` และ `03c-client-auth.html` ตาม Native Manifest; เปลี่ยน Candidate Stage เป็น **16 ไฟล์** (7 server + 8 HTML + Index). คง Google Apps Script HTML Service, `google.script.run`, RBAC, AI Reporter Job Guards และ `boot()` ที่จุดสุดท้าย. One-Click ไม่เปลี่ยน และ Apps Script @10 ยังไม่ Deploy. ดู [M01-01](docs/implementation/ux-r2-m01-01-shared-core.md).

> **UX-R2-M01-00 (12 ต.ค. 2569):** เตรียม Test Foundation สำหรับแยก Client JavaScript เป็น Native HTML Partials ตามลำดับ Manifest โดยยังไม่แก้ Runtime Source, ยังคง 14 ไฟล์ และยังไม่ Deploy; ดู [M01-00 Test Foundation](docs/implementation/ux-r2-m01-00-browser-module-foundation.md). งานแยก Module จริงต้องรับอนุมัติและเปิด PR แยกต่างหาก.

# Smart SRRT

> **UX-R2-03B (12 ต.ค. 2569):** การตรวจ Release/Regression ปัจจุบันใช้ **Native Source 14 ไฟล์** ผ่าน `tools/native-release-inspection.mjs`, G-30/G-34 และ P6 Native Offline Preflight. `npm run release:preflight` ต้องมี `dist/apps-script/` ที่ Stage แล้วและทำงานแบบ Read-only โดย Release Decision ยังเป็น **HOLD**. One-Click สองไฟล์เป็นเพียงหลักฐานเก่า มี Test ตรวจ Git Blob ที่ตรึงไว้เท่านั้น ไม่ใช่ Current Release. ดู [คู่มือ R2-03B](docs/implementation/ux-r2-03b-native-release-tests.md).

> **สำคัญ — UX-R2-03 (11 ต.ค. 2569):** ตั้งแต่ R2-03 ให้พัฒนา/Build/ตรวจรับผ่าน **Native Multi-file** ตาม [Source Manifest](tools/native-sources.mjs) เท่านั้น (7 .gs + 6 HTML partials + Index.html = **14 ไฟล์**). **ห้ามแก้หรือ Generate One-Click สองไฟล์เดิมอีก**; เป็นเพียง Legacy Snapshot ของระบบที่เคยใช้. การอ้างอิง One-Click/G-34 จำนวน 13 ไฟล์ในหัวข้อประวัติด้านล่างเป็นข้อมูลก่อน R2-03 และไม่ใช่คำสั่ง Build ปัจจุบัน. ดู [คู่มือ R2-03](docs/implementation/ux-r2-03-native-dashboard-mobile.md). ไม่อนุญาต Deploy @10 โดยอัตโนมัติ.

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

รายละเอียดการทำงานและข้อจำกัดทุกหมวดอยู่ใน **[docs/features.md](docs/features.md)**

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

หลักการ: **Modular Source, Multi-file Apps Script Candidate, One-Click Legacy Compatibility** — พัฒนาในไฟล์แยกส่วนที่ `src/server/` และ `src/web/` โดยกำลังเปลี่ยนรูปแบบการเผยแพร่ที่ต้องการเป็น Native Multi-file จำนวน 14 Source/HTML Files. ในระหว่างรอตรวจรับและ Cutover ยังคง One-Click Artifacts เดิมไว้สำหรับการใช้งานที่ผ่านการตรวจและการย้อนกลับ; ยังไม่ถือว่ารูปแบบ Multi-file ถูก Deploy แล้ว

### โครงสร้าง Repository ปัจจุบัน

```text
src/server/    00-bootstrap.gs ... 06-gemini-and-prompts.gs
src/web/       00-document-head.html ... 04-browser-app.html
tools/         build-one-click.mjs และเครื่องมือตรวจ release/migration แบบ offline
tests/         Node.js tests และ contract/integration tests
docs/          architecture, baseline, deployment, governance,
               integration, migrations, roadmap, testing, ux, workflow
docs/features.md  เอกสารความสามารถระบบปัจจุบัน (เอกสารชุดนี้)
AGENTS.md      กติกาและบริบทสำหรับ AI Coding Agents
Code_Smart_SRRT_OneClick_v2026.09.08.1.gs
Index_Smart_SRRT_OneClick.html
คู่มือติดตั้ง_Smart_SRRT_ระดับอำเภอ_v2026.09.08.1.txt
README_ติดตั้ง_Smart_SRRT_OneClick.txt
```

ไฟล์ `Code_Smart_SRRT_OneClick_v2026.09.08.1.gs` และ `Index_Smart_SRRT_OneClick.html` เป็น One-Click Artifacts ที่ประกอบตามลำดับ Source ที่กำหนดไว้ใน [`tools/build-one-click.mjs`](tools/build-one-click.mjs) **ไฟล์นี้เป็น Snapshot เก่า ห้าม Generate/แก้ไขใหม่**; งานพัฒนาต่อให้แก้ `src/server/` หรือ `src/web/` และ Build Native เท่านั้น

สำหรับผู้พัฒนา (ตั้งแต่ UX-R2-01 เมื่อ PR ได้รับอนุมัติและ Merge):

```bash
npm ci --ignore-scripts --no-audit --no-fund # ติดตั้ง Dependencies จาก package-lock.json
npm run check:ui-assets # ตรวจ Tailwind CSS ที่ Compile ไว้แบบ Read-only
npm run build:ui-assets # เขียน CSS Generated เฉพาะเมื่อเปลี่ยน Source CSS โดยเจตนา
npm run build:gas-multifile # สร้าง Native Candidate 14 ไฟล์ใน dist/apps-script/
npm run build:check      # ตรวจ byte-for-byte Native Stage และ CSS โดยไม่แก้ One-Click
npm run build            # สร้าง CSS และ Native Multi-file Candidate เท่านั้น (ไม่แตะ One-Click)
npm run check:contracts  # ตรวจ G-30 contract
npm test                 # Node test suite
npm run release:preflight
```

คำสั่งข้างต้นเป็นข้อมูลอ้างอิงสำหรับกระบวนการพัฒนา **ไม่ใช่คำสั่งให้ดำเนินการกับระบบ Production หรือข้อมูลจริง**

รายละเอียด R2-01: [Frontend Build Foundation](docs/implementation/ux-r2-01-build-foundation.md) — Tailwind v4 ใช้แบบ Compile ล่วงหน้าและไม่มี Preflight ในระยะแรก; ยังไม่ใช่การปรับ UI ทุกหน้า, ยังไม่ติดตั้ง Lucide/Chart.js, และไม่เปลี่ยน Deployment Apps Script ที่ใช้งานอยู่.

**UX-R2-02 Shared UI (Merged Baseline):** [การปรับ Navigation และ Shared UI](docs/implementation/ux-r2-02-shared-ui.md) — เมนูเดิม 5 หน้า, Lucide SVG 6 รายการจาก Source ตรึง Commit, Focus/Keyboard, Mobile Drawer และตารางหลัก 3 ส่วน โดยยังไม่ Deploy Apps Script หรือแทนที่ UI ทั้งระบบ.

**UX-R2-02B Shared Controls (Branch/PR Candidate):** [Form Labels, Buttons และ Responsive Tables](docs/implementation/ux-r2-02b-controls-forms-tables.md) — เพิ่มความชัดเจนของ Label ให้ข้อมูลเดิม 26 ฟิลด์ ตัวกรองและช่องตั้งค่า ทำให้ตาราง Admin 4 แห่งใช้คีย์บอร์ดเลื่อนได้ และเพิ่ม Shared CSS โดยไม่เปลี่ยน Backend, RPC หรือสิทธิ์ผู้ใช้และยังไม่ Deploy Apps Script.

### รูปแบบ Multi-file ใน Google Apps Script (G-34 — Candidate)

รูปแบบที่ต้องการสำหรับการใช้งาน Apps Script ในอนาคตคือ **Script 7 ไฟล์ + HTML Partials 6 ไฟล์ + `Index.html` สำหรับประกอบหน้า** (รวม 14 ไฟล์) ซึ่งผู้พัฒนาจะจัดการโค้ดแต่ละส่วนใน Apps Script ได้โดยไม่ต้องวาง One-Click ขนาดใหญ่ การประกอบ `Index` ใช้ `<?!= include('...') ?>` กับ HTML Partials ที่มาจาก GitHub เท่านั้น และมีการตรวจสอบ Offline ว่า Native Stage ตรงกับ Source ปัจจุบัน

```bash
npm run build:gas-multifile   # สร้าง Native 14 ไฟล์ใน dist/apps-script/
npm run check:gas-multifile   # ตรวจสอบไฟล์ที่สร้างแล้วและความตรงกับ Source (ไม่เขียนไฟล์)
```

อ่าน [คู่มือการย้ายเป็น Native Multi-file Apps Script](docs/deployment/g34-native-multifile-apps-script.md) ก่อนนำไปใช้จริง **สถานะปัจจุบันเป็น Deployment Candidate เท่านั้น**: การสร้างไฟล์ใน GitHub หรือ CI PASS ยังไม่ใช่การทดสอบบน Apps Script และไม่อนุญาตให้เปลี่ยนโปรเจกต์/Deployment จริงโดยอัตโนมัติ ไฟล์ One-Click เดิมจึงยังคงอยู่เพื่อการใช้งานและย้อนกลับในระหว่างเปลี่ยนผ่าน



## การติดตั้งและอัปเดต: ภาพรวม

**รูปแบบติดตั้งที่ผ่านการรับรองเดิม (One-Click):** สำหรับการติดตั้งใหม่ในขอบเขต Legacy ให้ปฏิบัติตาม [คู่มือติดตั้งระดับอำเภอ](คู่มือติดตั้ง_Smart_SRRT_ระดับอำเภอ_v2026.09.08.1.txt) และ [One-Click Compatibility Contract](docs/deployment/one-click-compatibility-contract.md) โดยเตรียม Google Sheet และ Apps Script ที่ผูกกับ Sheet, วาง Server Artifact ลง `Code.gs` และ HTML Artifact ในไฟล์ `Index`, แล้วดำเนินการ Installer/Deployment **เมื่อมีการอนุมัติการติดตั้งแยกต่างหาก** เท่านั้น

**รูปแบบเป้าหมาย (G-34 Multi-file):** เมื่อผ่าน Review/Approval และการตรวจบน Apps Script แล้ว ให้ใช้ไฟล์ 14 ไฟล์จาก `dist/apps-script/` ตาม [คู่มือ G-34](docs/deployment/g34-native-multifile-apps-script.md) และ **คงค่า `appsscript.json`/OAuth Scopes ของโปรเจกต์ปลายทาง** โดยไม่วาง One-Click ซ้ำในโปรเจกต์เดียวกัน; Build/CI PASS เพียงอย่างเดียวยังไม่อนุญาตให้ Cutover/Deploy

**สำคัญสำหรับระบบที่มีข้อมูลอยู่แล้ว:** อย่าตีความว่าการแทนที่โค้ดและรัน Installer เป็นการ Migration จากทุกเวอร์ชันได้โดยอัตโนมัติ ต้องตรวจ Schema จริง สำรองข้อมูล แยกกระบวนการ Deploy กับ Migration และผ่าน [Migration/Version/Release Policy](docs/governance/migration-version-release-policy.md) ก่อนทุกครั้ง โดยเฉพาะประเด็น **P4→v7 Historical Migration** ที่ยังไม่ได้รับอนุญาต คู่มือเดิมบางส่วนเป็น Legacy Snapshot จึงต้องเทียบกับโค้ดและสัญญาปัจจุบันก่อนใช้

การแก้ GitHub `main` หรือการ Merge PR **ไม่ทำให้ Web App ที่ Deploy อยู่เปลี่ยนเอง** การเผยแพร่เวอร์ชัน Apps Script ต้องดำเนินการแยกต่างหากโดยผู้มีสิทธิ์และได้รับอนุมัติ

## เวอร์ชันและสถานะหลักฐาน

- **Verified GitHub documentation baseline:** `main@1486211d0cbbcd8bc772dda6a5d9ab2d2a32f778` (10 ตุลาคม 2026)
- **ค่าใน CONFIG:** `VERSION = 2026.09.08.1`, `SCHEMA_VERSION = 7`, `REPORT_PROMPT_VERSION = 2026.10.06.1` — ไม่ใช่ค่าเดียวกันและไม่ควรใช้แทนกัน
- **GitHub:** PR #64, #67 และ #70 (G-34) Merge แล้ว; workflow `tests` สำหรับ `main@1486211d0cbbcd8bc772dda6a5d9ab2d2a32f778` สำเร็จ ([run #38061906543](https://github.com/9GotStory/smart-srrt/actions/runs/38061906543)). การตรวจแบบ CI/Mock/Offline ไม่ใช่การยืนยัน Apps Script Runtime
- **Web App:** Product Owner เคยรายงานว่า Deploy เวอร์ชันของรอบ G-33 แล้วและ Basic UI Smoke 12/12 PASS; **ยังไม่ยืนยัน Deployed SHA/Artifact Parity อย่างอิสระ**. G-34 ที่ Merge ใน GitHub เป็นเพียง **Native Multi-file Deployment Candidate** ไม่ใช่หลักฐานว่าใช้ชุด 14 ไฟล์บน Apps Script จริง
- **Migration:** Historical P4→v7 ยังเป็น **HOLD / ไม่ได้รับอนุญาต**; ห้ามถือว่าผลทดสอบ Synthetic หรือ Preflight เป็นการอนุญาตใช้ข้อมูลจริง
- **Documentation Phase:** ไม่เพิ่ม Browser UAT, ไม่เรียก Gemini, ไม่ Deploy และไม่รัน Migration ในงานจัดทำเอกสารชุดนี้

เอกสารรายละเอียดเชิงลึกอ้างอิง **โค้ด `main` เป็น Current Implementation**; เอกสารเก่าที่มีถ้อยคำว่า Draft/HOLD/Legacy ให้ตีความตามบริบทเวลาที่เอกสารถูกสร้าง ไม่ใช่สถานะ PR ปัจจุบัน

## เริ่มอ่านที่นี่

เอกสารอ้างอิง **`docs/features.md`** เป็น Feature Reference ฉบับปัจจุบันที่มี Traceability รายฟีเจอร์, ข้อจำกัด, Tests และสถานะหลักฐาน; เก็บ `doc/features.md` เป็นเอกสาร Legacy Snapshot ไม่ควรใช้แทนฉบับปัจจุบัน.

- [ความสามารถและสถานะฟีเจอร์ทั้งหมด — `docs/features.md`](docs/features.md)
- [แนวทางสำหรับ AI Agents — `AGENTS.md`](AGENTS.md)
- [แหล่ง Source และวิธีสร้าง One-Click Artifacts](docs/architecture/g30-canonical-modular-release.md)
- [Privacy & KPI](docs/architecture/p2-privacy-kpi-contract.md)
- [ReportRegistry G-17](docs/governance/g17-report-registry.md), [Readiness G-26](docs/governance/g26-ai-report-readiness.md), [History G-27](docs/governance/g27-event-report-history.md)
- [Report Jobs G-32](docs/deployment/g32-report-jobs.md) และ [Single Report Action G-33](docs/ux/g33-single-report-action.md)
- [Migration Readiness P4→v7](docs/integration/p4-v7-migration-readiness-2026-10-09.md)

## การสำรองข้อมูลและการดูแลรักษา

ก่อนแก้ไข Google Apps Script/Schema หรือย้ายวิธี Deploy ต้องเก็บ Snapshot ของ Spreadsheet, โฟลเดอร์ Drive/Template, `appsscript.json`/OAuth scopes, Script source และเวอร์ชัน Deployment สำหรับการกู้คืน (ไม่ส่งข้อมูลจริงหรือรหัสเข้าถึงขึ้น GitHub). การสำรองข้อมูลเป็นขั้นตอนของผู้ดูแลที่ได้รับอนุญาต ไม่ใช่ผลของ `npm run build`. การย้าย Historical P4→v7 ยัง **HOLD** ตาม [Migration Policy](docs/governance/migration-version-release-policy.md). 

## การดูแลรักษาและการมีส่วนร่วม

ใช้ GitHub เป็น Source of Truth: อ่านข้อกำหนดใน `AGENTS.md` → ระบุ Scope → ตรวจ Source/Tests → ทำงานใน Branch แยก → เปิด PR → ตรวจรับโดยผู้ตรวจอิสระตามกระบวนการ → รอ Product Owner อนุมัติ Merge/Deploy/Migration แยกแต่ละขั้น หลีกเลี่ยงการนำข้อมูลสุขภาพจริง, Session Token, Gemini API Key, Spreadsheet ID หรือไฟล์หลักฐานที่ระบุตัวบุคคลเข้าสู่ GitHub, Test Fixtures และ Logs

เอกสารนี้เป็น **ภาพรวมระบบ** ไม่ใช่คำอนุญาตให้เปลี่ยนแปลงระบบที่ใช้งานอยู่
