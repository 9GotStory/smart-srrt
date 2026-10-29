# Smart SRRT — Documentation Index

**Reviewed:** 21 October 2026 (Asia/Bangkok)
**Implementation baseline:** `main@29ca13ba33f87d46f1f50fba90fe904773b6594a`
**Purpose:** ทางเข้ารวมและแผนที่ authority ของเอกสาร ไม่ใช่ spec, policy approval หรือคำสั่ง Deploy ตรวจ HEAD ใหม่ก่อนใช้ snapshot นี้กับงานถัดไป

## Reading order

1. [AGENTS.md](../AGENTS.md) — scope, engineering invariants และ approval gates สำหรับ Agent
2. [README.md](../README.md) — system overview และ Development scope
3. [Feature Reference](features.md) — current capability/source/test status; Core IDs F01–F23
4. ใช้ index นี้เลือกเอกสารเฉพาะงาน แล้วตรวจ canonical source/tests ที่ commit เดียวกันก่อนตัดสินใจ
5. งาน D331 ให้อ่าน [Remaining Feature Briefs](implementation/d331-remaining-feature-briefs.md) และ existing linked Issues; D331 F01–F08 เป็น document-local IDs คนละชุดกับ Core feature IDs

## Status definitions

| Label | ความหมายและวิธีใช้ |
| --- | --- |
| **Current** | Reference ที่เทียบกับ implementation baseline ข้างต้นแล้ว; ไม่รับรอง runtime หรือ authorization |
| **Historical** | Snapshot/evidence/task instruction ตามวัน/SHA เดิม รวมข้อความ candidate/NOT MERGED ที่ PR ภายหลังอาจ merge แล้ว; ไม่ใช้เป็นคำสั่ง current |
| **Proposed** | Design/ADR/requirements หรือข้อเสนอที่ยังไม่ใช่ accepted policy/implemented behavior; การ merge เอกสารไม่ใช่ ratification |
| **HOLD** | ยังขาด decision/evidence/authorization ของขอบเขตนั้น; code/CI PASS ไม่ยกเลิก HOLD |

สถานะเหล่านี้ใช้แยกแต่ละมิติได้: source อาจ merged และ registered แต่ data access หรือ deployment ยัง HOLD. Owner-reported observation ต้องมีวันที่/version และไม่แทน independent deployed-SHA verification

## Source-of-Truth Map

| เรื่อง | Authority / จุดเริ่มอ่าน | ขอบเขต |
| --- | --- | --- |
| Runtime behavior, RPC, permission | [src/server](../src/server/), [src/web](../src/web/), [tests](../tests/) ที่ SHA เดียวกัน | Source/tests เหนือกว่า roadmap/design เก่าที่ขัดกัน |
| Native topology / ordering | [native-sources.mjs](../tools/native-sources.mjs) | Default **Native26 = 8 GS + 17 HTML partials + Index**; นับจาก manifest ไม่ใช่ทุกไฟล์ใน src |
| Build / verification commands | [package.json](../package.json), [CI workflow](../.github/workflows/tests.yml) | `build` เขียน CSS+Native; `build:check` ตรวจ CSS+stage; ไม่มี One-Click generation |
| Staged bytes / browser scripts | [Native builder](../tools/build-apps-script-multifile.mjs), [inspector](../tools/native-release-inspection.mjs), [inline vendor compiler](../tools/native-inline-vendor.mjs), [client test reader](../tests/helpers/native-client.mjs) | Head fragment ใช้ compiled pinned Chart.js bytes; ไม่ใช่ทุก stage file เท่ากับ raw authored HTML |
| Core schema v7 | [bootstrap headers](../src/server/00-bootstrap.gs), [schema/migrations](../src/server/01-schema-and-db.gs) | MainData 39 columns; schema source ไม่พิสูจน์ live workbook |
| D331 contracts/registration | [G1-A provisional v1](../src/dengue/00-g1a-foundation.gs), [v2 draft contract](../src/dengue/07-p0-02a-mvp-schema-contract.gs), [Native manifest](../tools/native-sources.mjs) | Registered v1/OFF แยกจาก unregistered v2 seven-table/113-header contract |
| Product capability | [features.md](features.md) | Source/automated/mock/observed/approved ต้องแยก; ไม่เพิ่ม requirements จากชื่อ function |
| D331 remaining requirements | [Remaining Feature Briefs](implementation/d331-remaining-feature-briefs.md) | Product backlog แปด features; ไม่ใช่ implementation authorization |
| Data/privacy/security/clinical decisions | [P0-30D decision gates](implementation/d331-p0-30d-caseid-privacy-security-decision-gates.md), [Issue #238](https://github.com/9GotStory/smart-srrt/issues/238) | ต้องมี accountable dated/versioned decisions; proposal/fictional tests ไม่ใช่ approval |
| Work status / merge evidence | [GitHub Issues](https://github.com/9GotStory/smart-srrt/issues), [PRs](https://github.com/9GotStory/smart-srrt/pulls) | อ่าน latest comments/merge SHA และ source; Open ไม่แปลว่า code ไม่มี และ Closed ไม่แปลว่า deployed |
| Deployed state / permitted data | Dated operator evidence ในทะเบียนด้านล่าง | ต้องระบุ exact approved target/version/source/binding และสิทธิ์; ไม่อนุมานจาก GitHub |

## Current reference entrypoints

- **Core behavior:** [Feature Reference](features.md), [G-19 lifecycle](workflow/g19-close-reopen.md), [G-17 registry](governance/g17-report-registry.md), [G-26 advisory readiness](governance/g26-ai-report-readiness.md), [G-27 report history](governance/g27-event-report-history.md). Governance docs เป็นรายละเอียดตามช่วงที่เขียน; source/tests ที่ baseline เป็น authority เมื่อขัดกัน
- **Auth/security source:** [GS-S1](implementation/gs-s1-operator-rpc-boundary.md), [GS-S2](implementation/gs-s2-credential-audit-redaction.md), [GS-S3](implementation/gs-s3-authentication-modernization.md), [GS-S4](implementation/gs-s4-server-report-consent.md), [GS-S5](implementation/gs-s5-audit-observability.md), [RR-01 rollback compatibility](implementation/rr-01-authentication-rollback-compatibility.md). Candidate banners เดิมเป็น Historical; ไม่อ้างว่า operational exit gates เสร็จแล้ว
- **Native/UX:** [current manifest](../tools/native-sources.mjs), [G-30 tests](../tests/g30-release-parity.test.mjs), [Native stabilization tests](../tests/ux-r2-m01-final-stabilization.test.mjs), [Chart.js source](../src/web/03d-client-dashboard.html), [shared loading matrix](ux/p9-action-state-matrix.md). Extraction/UX implementation notes เป็น dated records; current tests/source อาจก้าวหน้ากว่า
- **D331:** [current feature status](features.md#d331-development-status) → [remaining briefs](implementation/d331-remaining-feature-briefs.md) → [functional MVP Issue #215](https://github.com/9GotStory/smart-srrt/issues/215), [five-area audit #248](https://github.com/9GotStory/smart-srrt/issues/248), [authorization decisions #238](https://github.com/9GotStory/smart-srrt/issues/238). Existing mock/model/reader/CRUD groundwork ต้องตรวจและ reuse ก่อนเสนอ code ใหม่
- **Candidate packaging:** [Native33 readiness](implementation/d331-p0-10-dev-runtime-readiness.md), [guarded package](implementation/d331-p0-11-native33-guarded-preflight.md). Default manifest ยัง Native26; candidate/source metadata ไม่ใช่สิทธิ์เรียก deploy scripts

## Environment and evidence

| Evidence | Recorded state | Provenance / limit |
| --- | --- | --- |
| Source baseline CI | [run #39574236406](https://github.com/9GotStory/smart-srrt/actions/runs/39574236406) completed SUCCESS ที่ implementation SHA ข้างต้น | GitHub Actions verified; ไม่ใช่ live GAS/UAT หรือผล CI ของ docs PR ในอนาคต |
| Existing Development Web App | Last recorded **v20**, D331 OFF; mock-only browser UAT **8/8** | [Remaining briefs, 21 Oct](implementation/d331-remaining-feature-briefs.md), [P0-29 owner-evidence classification](https://github.com/9GotStory/smart-srrt/issues/248). Owner-reported; ไม่ได้ re-attest ผ่าน Apps Script/Browser ในรอบนี้ |
| Environment scope | Latest record ระบุ **ไม่มี Production environment** | เป็น recorded owner context; คำว่า production/@10/TEST v12/v16 ในเอกสารเก่าไม่พิสูจน์ environment วันนี้ และไม่ยกเลิก approval gates |
| DEV schema setup | Prior authorized metadata setup: seven empty D331 v2 tabs / 113 ordered headers | [Issue #219](https://github.com/9GotStory/smart-srrt/issues/219). Historical header evidence; ไม่พิสูจน์ current binding, grants หรือสิทธิ์อ่าน rows |
| Trusted source/data binding | **HOLD / not freshly attested** | Exact Script↔Deployment↔Workbook และ allowed fixtures/data ต้องตรวจภายใต้ authorization แยก; restricted identifiers เก็บกับ custodian ไม่คัดลอกลง docs |
| D331 policies/data access | **D2/P1/P2/S1/S2/C1/C2 HOLD**; clinical `NOT_EVALUATED` | [Decision register](implementation/d331-p0-30d-caseid-privacy-security-decision-gates.md); CaseID uniqueness, cross-Event scan และ DTO disclosure เป็นคนละ decision |
| Release/security exit evidence | Source fixes มีแล้ว; live enforcement/performance/identity/privacy/recovery evidence ต้องประเมินตาม scope | [Security review 12 Oct](release/security-release-readiness-review-2026-10-12.md) เป็น Historical gate snapshot รวม R01–R08; ไม่คัดลอกว่า blocker ทุกข้อยังไม่มี source remediation หรือปิดแล้วโดยไม่มีหลักฐานใหม่ |

`release:preflight` เป็น offline code gate และแยก `releaseDecision=HOLD`. Source merged, CI PASS, owner mock smoke และ approval เป็นหลักฐานคนละชนิด ห้ามนำ Case/patient data ไป public dashboard, Gemini, logs หรือ export จากการอนุมัติเอกสาร

## Documentation categories

ตารางนี้เป็น navigation ครบทุกหมวด ไม่รับรองว่าทุกไฟล์ใน directory เป็น Current. อ่าน date/SHA/status ของรายการก่อนใช้

| Category | บทบาท / ตัวอย่างเริ่มอ่าน | Classification / caveat |
| --- | --- | --- |
| [Root references](.) | [features.md](features.md), INDEX นี้ | Current ตาม implementation baseline |
| [architecture](architecture/) | [GS review](architecture/gs-architecture-review-2026-10-12.md), [ADR-AUTH-01](architecture/adr-auth-01-managed-identity-transition.md) | Historical source audit / Proposed identity decision; P3/P4 designs ไม่ใช่ v7 headers |
| [baseline](baseline/) | [Repository baseline](baseline/repository-baseline.md) | Historical AS-IS snapshots |
| [deployment](deployment/) | [G-32 jobs](deployment/g32-report-jobs.md), [G-34 runbook](deployment/g34-native-multifile-apps-script.md) | Dated contracts/runbooks; เทียบ current topology/approved target ก่อนใช้ ไม่มี deploy authorization |
| [discovery](discovery/) | [H0 source inventory](discovery/h0-authentication-source-inventory-2026-10-12.md) | Historical discovery / unresolved operator evidence requests |
| [governance](governance/) | [Migration/release policy](governance/migration-version-release-policy.md), registry/readiness links ด้านบน | Scope/permission constraints; implementation รายละเอียดต้องเทียบ source |
| [handoff](handoff/) | [Security handoff 12 Oct](handoff/smart-srrt-security-release-2026-10-12.md) | Historical handoff at its exact SHA |
| [implementation](implementation/) | [D331 remaining briefs](implementation/d331-remaining-feature-briefs.md) และ per-slice records | Current requirements entrypoint + Historical implementation evidence + Proposed designs ปะปน; ไม่ถือทั้งหมวดเป็น current implementation |
| [integration](integration/) | [P3/v7 reconciliation](integration/p3-v7-workflow-reconciliation-2026-10-09.md), [P4/v7 readiness](integration/p4-v7-migration-readiness-2026-10-09.md) | Historical compatibility analysis; live migration HOLD |
| [licenses](licenses/) | [Lucide license](licenses/lucide-LICENSE.txt) | Third-party license reference |
| [migrations](migrations/) | [P1 identity](migrations/p1-event-identity.md) | Dated migration/runbook/evidence; no current execution permission |
| [release](release/) | [Security readiness](release/security-release-readiness-review-2026-10-12.md), RR/ADR matrices | Historical readiness / Proposed acceptance gates / evidence templates |
| [roadmap](roadmap/) | [Group A/B plan](roadmap/group-a-b-development-plan.md) | Historical development plan; ไม่ใช่ current status tracker |
| [testing](testing/) | [Characterization matrix](testing/characterization-test-matrix.md) | Historical test baseline; current executable coverage ดู tests/CI |
| [ux](ux/) | [P9 integration gate](ux/p9-integration-review-and-uat-gate.md), [design system](ux/design-system.md) | Dated design/UAT evidence; Proposed/implemented/observed ต้องแยก |
| [workflow](workflow/) | [G-19 close/reopen](workflow/g19-close-reopen.md) | Core behavior reference; เทียบ source/tests ปัจจุบัน |

## Historical and proposed interpretation

- Historical One-Click installation/release guidance, Native counts และ old candidate banners คงอยู่ใน [README](../README.md), [AGENTS](../AGENTS.md), [features](features.md) ส่วน Historical และเอกสารเดิมตามหมวด; frozen artifacts ไม่ใช่ current build source
- D331 C3/Option A/R1/R3 documents เป็น design records; latest MVP/remaining briefs ไม่อนุญาตขยาย provider/cloud infrastructure หรือถือ design เป็น approved grant/revocation policy
- Known out-of-scope drift: [RR-04 cross-references](architecture/rr-04-login-abuse-corrective-design.md) มี relative links ของ RR-01/02/03 ที่ชี้ directory ผิด; target จริงอยู่ [implementation](implementation/). ไฟล์นั้นคงเดิมใน four-file alignment นี้; ใช้ current entrypoints ด้านบน
- **F01 update, 29 October 2026:** [PR #261](https://github.com/9GotStory/smart-srrt/pull/261) merged และ #257/#258/#259 CLOSED/completed สำหรับ synthetic source/offline delivery; exact SHA/review/post-merge CI อยู่ใน [F01 completion evidence](implementation/d331-remaining-feature-briefs.md#f01--p0-31b--synthetic-case--plan-in-records). รอ PO เลือก feature ถัดไปและอนุมัติแผนก่อนสร้าง/ปรับ Issue หรือ implementation; Merge, data access, Browser UAT และ Deploy เป็นคนละ gate. D331 OFF
