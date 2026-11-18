# ข้อเท็จจริงสำหรับการสำรองข้อมูล การกู้คืน ความต่อเนื่องของบัญชีเจ้าของ และการแยกชุดใช้งานจริงกับชุดทดสอบ

วันที่ค้นคว้า: 17 พฤศจิกายน 2569 (ค.ศ. 2026) เอกสารนี้เป็นผลการค้นคว้า ไม่ใช่ข้อกำหนดของระบบ

**สรุป** Trigger ตามเวลาแบบ installable กำหนดรอบรายสัปดาห์ได้ถึงวันและชั่วโมง ในเขตเวลาของโปรเจกต์หรือที่ระบุด้วย `inTimezone` นาทีที่ทำงานคลาดได้ภายในชั่วโมงนั้น ("Apps Script chooses a time between 9 AM and 10 AM") บัญชี gmail.com มี trigger ได้ 20 ตัวต่อผู้ใช้ต่อสคริปต์ เวลารวมของ trigger 90 นาทีต่อวัน และการทำงานครั้งละไม่เกิน 6 นาที trigger "always run under the account of the person who created them" บัญชีอื่นมองไม่เห็น และเมื่อล้มเหลวมีเพียงอีเมลสรุปกับหน้า Executions เอกสารไม่ระบุว่า trigger ถูกปิดเองหลังล้มเหลวซ้ำหรือไม่ และไม่ระบุว่า trigger รันโค้ดล่าสุดหรือโค้ดของ version ที่ deploy การคัดลอกไฟล์ทำได้ด้วย `File.makeCopy(name, destination)` (ต้องมี scope `drive` เต็ม), `Spreadsheet.copy(name)` (ไม่มีพารามิเตอร์โฟลเดอร์) หรือ Drive API `files.copy` เอกสารของทั้งสามวิธีไม่มีรายการของสิ่งที่ถูกคัดลอก สิ่งที่ระบุคือสำเนาสืบทอดสิทธิ์จากโฟลเดอร์ปลายทาง ("Permissions are still inherited from parent folders.") ผู้คัดลอกเป็นเจ้าของสำเนา และไฟล์ที่มีสคริปต์ผูกอยู่ถูกคัดลอกพร้อมสคริปต์ `DriveApp` ลบถาวรไม่ได้ ทำได้เพียง `setTrashed(true)` ซึ่งเฉพาะเจ้าของทำได้ ถังขยะล้างเองเมื่อครบ 30 วัน และระหว่างนั้นไฟล์ยังนับพื้นที่และยังเปิดได้โดยผู้ที่ได้รับแชร์ บัญชีส่วนตัวมีพื้นที่ 15 GB ใช้ร่วมกับ Gmail และ Photos (บัญชีที่สร้างหลัง 9 มีนาคม 2026 ได้ 5 GB จนกว่าจะยืนยันเบอร์โทรศัพท์) ไฟล์ Sheets ที่สร้างหรือแก้หลัง 1 มิถุนายน 2021 นับพื้นที่ แต่ reference ของ `File.getSize()` ยังเขียนว่าไฟล์ของ Google Workspace คืน 0 ไบต์ เมื่อพื้นที่เต็ม "nobody can edit or copy your affected files" และ Gmail รับส่งไม่ได้ ไฟล์ Sheets จำกัดที่ 20 ล้านเซลล์หรือ 100MB ประวัติเวอร์ชันของ Sheets กู้คืนหรือคัดลอกเป็นไฟล์ใหม่ได้โดยผู้ที่มีสิทธิ์แก้ไข แต่เวอร์ชัน "may occasionally be merged" เจ้าของลบประวัติได้ ตั้งชื่อเวอร์ชันได้ 15 ชุดต่อไฟล์ และไม่พบเอกสารที่ระบุระยะเวลาเก็บ ทางกู้คืนทุกทางที่อยู่ในบัญชีเดียวกัน (ประวัติเวอร์ชัน ถังขยะ สำเนาในโฟลเดอร์ของระบบ) ไม่ครอบคลุมการเสียบัญชี Google ลบบัญชีส่วนตัวที่ไม่มีการใช้งาน 2 ปีได้ และรายการสิ่งที่นับเป็นการใช้งานเป็นการกระทำของผู้ใช้ขณะล็อกอิน ไม่กล่าวถึงการทำงานของสคริปต์ การโอนความเป็นเจ้าของไฟล์ระหว่างบัญชีส่วนตัวทำได้เมื่อผู้รับกดรับ ทำทีละไฟล์ ("When you make someone else the owner of a folder, you still own the files inside.") และ `DriveApp.setOwner` ใช้กับไฟล์ของ gmail.com ไม่ได้ deployment ของ Apps Script โอนไม่ได้ ("You cannot transfer ownership of versioned deployments.") trigger ไม่โอนตาม และเอกสารไม่กล่าวถึงผลต่อ web app แบบ Execute as me เมื่อเจ้าของเปลี่ยนระหว่างบัญชี gmail.com สองบัญชี การตรวจการแชร์ทำได้ด้วย `getSharingAccess()` (ค่า `ANYONE`, `ANYONE_WITH_LINK`, `DOMAIN`, `DOMAIN_WITH_LINK`, `PRIVATE`), `getSharingPermission()`, `getEditors()`, `getViewers()` และ `getOwner()` แต่เอกสารไม่ระบุว่าเมทอดของไฟล์รายงานสิทธิ์ที่สืบทอดจากโฟลเดอร์หรือไม่ ด้านการแยกสองชุด URL ของ web app คงเดิมเมื่อแก้ deployment ให้ชี้ version ใหม่ โปรเจกต์หนึ่งมี version ได้ 200 ชุด `clasp` 3.x มีตัวเลือก `--project <file>` ที่ "Intended to support multiple deployment targets" และ `--user <name>` สำหรับหลายบัญชี Cloudflare Pages มีสอง environment ต่อโปรเจกต์ (production และ preview) ตั้งตัวแปรแยกกันได้ แต่ preview ทุก branch ใช้ค่าชุดเดียว URL ของ preview เปิดสาธารณะจนกว่าจะเปิด Cloudflare Access repository หนึ่งผูกได้ถึง 5 โปรเจกต์ และ rollback ไปยัง production deployment ก่อนหน้าได้ทันที OAuth client หนึ่งตัวรับ authorised JavaScript origins หลายค่าแต่ไม่รับ wildcard นโยบายของ Google "require separate projects for testing and production" และ client ที่ไม่ถูกใช้ 6 เดือนถูกลบเอง สำหรับแอป External ที่ขอเฉพาะ `openid email profile` สถานะ Testing ไม่จำกัดผู้ใช้ไว้ที่รายชื่อผู้ทดสอบ ("your users do not need to be in the trusted user list, they will not see a warning message, and their authorizations will not expire after 7 days") และการเผยแพร่เป็น In production ไม่บังคับให้ verify เมื่อใช้เฉพาะ scope ที่ไม่ sensitive เรื่องนี้ไม่มีใน `docs/adr/0003` และ `docs/spec.md` ข้อ 2 กลไกกู้คืนที่มีเอกสารมีสามแบบ: เปลี่ยน ID ของไฟล์ใน Script Properties ให้ `openById` เปิดสำเนา (ID ของฐานข้อมูลเปลี่ยน), เขียนเนื้อหากลับเข้าไฟล์เดิมด้วย `Sheet.copyTo` หรือ `Range.setValues` (ซึ่งตีความค่าที่ขึ้นต้นด้วย `=` เป็นสูตร) และ "Restore this version" ในหน้าจอของ Sheets ซึ่งกู้ทั้งไฟล์และล้างประวัติการแก้รายเซลล์ก่อนหน้า

> หมายเหตุ 18 พฤศจิกายน 2569: "ช่วงที่ 6" ในเอกสารนี้หมายถึงช่วงทดลองใช้และเริ่มใช้ข้อมูลจริง ซึ่ง roadmap เลื่อนเป็นช่วงที่ 7 เมื่อเพิ่มช่วงร่างรายงานสอบสวน

## 1. แหล่งข้อมูล

วิธีอ่าน: ทุกแหล่งอ่านเมื่อ 17 พฤศจิกายน 2569 หน้าเว็บของ Google ดาวน์โหลด HTML ด้วย `curl -L` แล้วแปลงเป็นข้อความ หน้าของ Cloudflare ดาวน์โหลดฉบับ Markdown ของหน้าเดียวกัน (เติม `index.md` ท้ายที่อยู่) README ของ clasp ดาวน์โหลดจาก `raw.githubusercontent.com` การค้นคว้านี้อ่านเอกสารอย่างเดียว ไม่ได้ทดสอบกับบัญชี Google สคริปต์ ไฟล์ Drive หรือโปรเจกต์ Cloudflare ใด ๆ รหัส B เป็นแหล่งใหม่ของเอกสารนี้ รหัส P ใช้ตาม [`public-dashboard-facts.md`](public-dashboard-facts.md) ข้อความภาษาอังกฤษยกตามต้นฉบับ หน้าของศูนย์ช่วยเหลือ (`support.google.com`) ไม่แสดงวันที่ปรับปรุง จึงระบุเป็นวันที่อ่าน ที่อยู่ของหน้า `developers.google.com/drive/...` ถูกส่งต่อไปที่ `developers.google.com/workspace/drive/...` ตารางใช้ที่อยู่หลังส่งต่อ

### 1.1 Google Apps Script

| รหัส | เอกสาร | ผู้ออก | ปี | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|---|
| B1 | Installable Triggers (คู่มือ) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/apps-script/guides/triggers/installable` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B2 | Reference: Class ClockTriggerBuilder | Google | "Last updated 2026-04-13 UTC" | `https://developers.google.com/apps-script/reference/script/clock-trigger-builder` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B3 | Reference: Class ScriptApp, คู่มือ Authorization for Google Services และคู่มือ Troubleshooting | Google | "Last updated 2026-04-13 UTC", "2026-09-03 UTC" และ "2026-09-15 UTC" ตามลำดับ | `https://developers.google.com/apps-script/reference/script/script-app`, `https://developers.google.com/apps-script/guides/services/authorization`, `https://developers.google.com/apps-script/guides/support/troubleshooting` | เอกสารปัจจุบัน | ScriptApp: อ่านเมทอดเกี่ยวกับ trigger อีกสองหน้า: ค้นคำ "trigger", "authoriz", "disabled" แล้วอ่านหัวข้อที่พบ |
| P16 | Quotas for Google Services | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/apps-script/guides/services/quotas` | เอกสารปัจจุบัน หน้าระบุเองว่า "All quotas are subject to elimination, reduction, or change at any time, without notice." | ดาวน์โหลดซ้ำ อ่านทั้งหน้า |
| B4 | Create and manage deployments และ Versions (คู่มือ) | Google | "Last updated 2026-09-15 UTC" และ "2026-09-03 UTC" | `https://developers.google.com/apps-script/concepts/deployments`, `https://developers.google.com/apps-script/guides/versions` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| P17 | Web Apps (คู่มือ) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/apps-script/guides/web` | เอกสารปัจจุบัน | ดาวน์โหลดซ้ำ อ่านทั้งหน้า |
| B5 | Script projects, Standalone scripts และ Container-bound scripts (คู่มือ) | Google | "Last updated 2026-10-07 UTC", "2026-09-03 UTC" และ "2026-11-02 UTC" ตามลำดับ | `https://developers.google.com/apps-script/guides/projects`, `https://developers.google.com/apps-script/guides/standalone`, `https://developers.google.com/apps-script/guides/bound` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B6 | Collaborate with other developers (คู่มือ) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/apps-script/guides/collaborating` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B7 | Properties service (คู่มือ) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/apps-script/guides/properties` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B8 | Use the command-line interface with clasp (คู่มือของ Google) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/apps-script/guides/clasp` | เอกสารปัจจุบัน ชื่อคำสั่งบางคำสั่งในหน้านี้เป็นชื่อของ clasp 2.x | อ่านทั้งหน้ายกเว้นตัวอย่าง workflow ของ GitHub Actions |
| B9 | README ของ google/clasp ที่สาขา `master` | Google (โครงการโอเพนซอร์ส) | commit ล่าสุดของไฟล์ `089cda4` ลงวันที่ 18 ส.ค. 2026 รุ่นล่าสุดที่ออก `clasp-v3.4.1` เมื่อ 28 ส.ค. 2026 | `https://github.com/google/clasp/blob/master/README.md` | เอกสารของ clasp 3.x | อ่านหัวข้อ Commands, Migrating from 2.x to 3.x, Authorization, Project Settings File และ Reference ของคำสั่ง create, clone, push, deployments, deploy, redeploy, undeploy, version |
| B10 | Reference ของ Drive service: Class File, Class Folder, Class DriveApp, Enum Access และ Enum Permission | Google | "Last updated 2026-04-13 UTC" ทุกหน้า | `https://developers.google.com/apps-script/reference/drive/file`, `.../drive/folder`, `.../drive/drive-app`, `.../drive/access`, `.../drive/permission` | เอกสารปัจจุบัน | File: อ่านเมทอดที่เกี่ยวกับการคัดลอก การแชร์ เจ้าของ ถังขยะ และขนาด Folder และ DriveApp: ค้นคำแล้วอ่านเมทอดที่ตรงกัน Enum สองหน้า: อ่านทั้งหน้า |
| B11 | Reference ของ Spreadsheet service: Class Spreadsheet, Class Sheet, Class SpreadsheetApp และ Class Range | Google | "Last updated 2026-04-13 UTC" สามหน้าแรก และ "2026-08-19 UTC" สำหรับ Range | `https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet`, `.../spreadsheet/sheet`, `.../spreadsheet/spreadsheet-app`, `.../spreadsheet/range` | เอกสารปัจจุบัน | อ่านเฉพาะ `copy`, `copyTo`, `setValues`, `copyValuesToRange`, `openById`, `create` และตรวจว่ามีเมทอด `deleteSheet`, `setName`, `clearContent`, `setNumberFormat`, `getProtections` ในตารางเมทอด |
| P15 | Reference: Class Cache และ Class CacheService | Google | ตาม `public-dashboard-facts.md` | ตาม `public-dashboard-facts.md` | ตามเดิม | ไม่ได้อ่านซ้ำ อ้างค่าอายุสูงสุด 6 ชั่วโมงจากเอกสารนั้น |

### 1.2 Google Drive API

| รหัส | เอกสาร | ผู้ออก | ปี | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|---|
| B12 | Method: files.copy และ Method: files.delete | Google | "Last updated 2026-09-04 UTC" และ "2026-05-21 UTC" | `https://developers.google.com/workspace/drive/api/reference/rest/v3/files/copy`, `.../files/delete` | เอกสารปัจจุบัน | files.copy อ่านทั้งหน้า files.delete อ่านคำอธิบายของเมทอด |
| B13 | Share files, folders, and drives (คู่มือ) | Google | "Last updated 2026-09-14 UTC" | `https://developers.google.com/workspace/drive/api/guides/manage-sharing` | เอกสารปัจจุบัน | อ่านหัวข้อ How permissions propagate, File links and access control, Determine the role source และ Delete a permission |
| B14 | Transfer file ownership (คู่มือ) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/workspace/drive/api/guides/transfer-file` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B15 | Trash or delete files and folders (คู่มือ) | Google | "Last updated 2026-09-03 UTC" | `https://developers.google.com/workspace/drive/api/guides/delete` | เอกสารปัจจุบัน | อ่านบทนำและหัวข้อ Trash |
| B16 | Manage file revisions และ Changes and revisions overview (คู่มือ) | Google | "Last updated 2026-09-03 UTC" ทั้งสองหน้า | `https://developers.google.com/workspace/drive/api/guides/manage-revisions`, `.../guides/change-overview` | เอกสารปัจจุบัน | อ่านหัวข้อ Specify revisions to save from auto delete, List a file's revisions และคำนิยามของ revision |

### 1.3 ศูนย์ช่วยเหลือของ Google (Drive, Docs Editors, Google One และบัญชี Google)

| รหัส | เอกสาร | ผู้ออก | ปี | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|---|
| B17 | Files you can store in Google Drive | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/drive/answer/37603?hl=en` | หน้าปัจจุบัน | อ่านหัวข้อ File sizes |
| B18 | Delete files in Google Drive และ Recover a deleted file in Google Drive | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/drive/answer/2375102?hl=en`, `https://support.google.com/drive/answer/1716222?hl=en` | หน้าปัจจุบัน หน้าที่สองแสดงเนื้อหาส่วนขอกู้ไฟล์เฉพาะผู้ที่ล็อกอิน | อ่านทั้งหน้าเท่าที่แสดงโดยไม่ล็อกอิน |
| B19 | How your Google storage works และ Manage your storage in Drive, Gmail & Photos | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/googleone/answer/9312312?hl=en`, `https://support.google.com/drive/answer/6374270?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B20 | Find what's changed in a file (ประวัติเวอร์ชันของ Docs, Sheets, Slides) | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/docs/answer/190843?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B21 | Make someone else the owner of your file | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/drive/answer/2494892?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B22 | Share and manage access to files and folders in Google Drive และ Learn about limited access to files and folders in Google Drive | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/drive/answer/7166529?hl=en`, `https://support.google.com/drive/answer/14254362?hl=en` | หน้าปัจจุบัน | หน้าแรกอ่านทั้งหน้า หน้าที่สองอ่านถึงหัวข้อ Learn who can find & access folders with limited access |
| B23 | Create, view, or download a file, Protect, hide & edit sheets และ Organize your files in Google Drive | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/docs/answer/49114?hl=en`, `https://support.google.com/docs/answer/1218656?hl=en`, `https://support.google.com/drive/answer/2375091?hl=en` | หน้าปัจจุบัน | หน้าแรกอ่านทั้งหน้า อีกสองหน้าค้นคำ "copy" แล้วอ่านหัวข้อที่พบ |
| B24 | Inactive Google Account Policy | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/accounts/answer/12418290?hl=en` | นโยบายปัจจุบัน | อ่านทั้งหน้า |
| B25 | About Inactive Account Manager | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/accounts/answer/3036546?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B26 | Turn on 2-Step Verification และ Sign in with backup codes | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/accounts/answer/185839?hl=en`, `https://support.google.com/accounts/answer/1187538?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B27 | Set up recovery options และ How to recover your Google Account or Gmail | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/accounts/answer/183723?hl=en`, `https://support.google.com/accounts/answer/7682439?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B28 | How to download your Google data (Google Takeout) | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/accounts/answer/3024190?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้ายกเว้นส่วนท้ายเรื่องพารามิเตอร์ของ URL |

### 1.4 Google Cloud OAuth และ Google Identity Services

| รหัส | เอกสาร | ผู้ออก | ปี | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|---|
| B29 | Manage App Audience | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/cloud/answer/15549945?hl=en` | หน้าปัจจุบัน | อ่านทั้งหน้า |
| B30 | Manage OAuth Clients | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/cloud/answer/15549257?hl=en` | หน้าปัจจุบัน | อ่านหัวข้อ Web Applications, Delete OAuth Clients และ Unused Client Deletion |
| B31 | OAuth App Verification Help Center, When is verification not needed, Verification requirements และ Unverified apps | Google | อ่าน 17 พ.ย. 2569 | `https://support.google.com/cloud/answer/13463073?hl=en`, `.../answer/13464323?hl=en`, `.../answer/13464321?hl=en`, `.../answer/7454865?hl=en` | หน้าปัจจุบัน หน้า Verification requirements ระบุเองว่า "This is NOT a policy document." | อ่านทั้งหน้า |
| B32 | Setup ของ Sign In With Google (Google Identity Services) | Google | "Last updated 2026-04-06 UTC" | `https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid` | เอกสารปัจจุบัน | อ่านหัวข้อ Get your Google API client ID และ Configure your OAuth Consent Screen |
| B33 | Comply with OAuth 2.0 policies (production readiness) | Google | "Last updated 2026-11-10 UTC" | `https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance` | เอกสารปัจจุบัน | อ่านหัวข้อ Use separate projects for testing and production |

### 1.5 Cloudflare Pages

| รหัส | เอกสาร | ผู้ออก | ปี | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|---|
| B34 | Branch deployment controls | Cloudflare | "Last updated Apr 21, 2026" | `https://developers.cloudflare.com/pages/configuration/branch-build-controls/` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B35 | Preview deployments, Known issues และ Add a custom domain to a branch | Cloudflare | "Last updated Oct 12, 2026", "Nov 6, 2026" และ "Apr 21, 2026" ตามลำดับ | `https://developers.cloudflare.com/pages/configuration/preview-deployments/`, `.../pages/platform/known-issues/`, `.../pages/how-to/custom-branch-aliases/` | เอกสารปัจจุบัน | หน้าแรกและหน้าที่สามอ่านทั้งหน้า Known issues อ่านหัวข้อ Enable Access on your `*.pages.dev` domain |
| B36 | Bindings (หัวข้อ Environment variables และ Secrets), Build configuration และ Configuration (ไฟล์ Wrangler ของ Pages) | Cloudflare | "Last updated Nov 12, 2026", "Sep 18, 2026" และ "Jun 25, 2026" ตามลำดับ | `https://developers.cloudflare.com/pages/functions/bindings/`, `.../pages/configuration/build-configuration/`, `.../pages/functions/wrangler-configuration/` | เอกสารปัจจุบัน | Bindings อ่านสองหัวข้อ Build configuration อ่านทั้งหน้า Configuration ค้นคำ "preview" และ "production" แล้วอ่านหัวข้อ Production and preview deployments กับ Environment-specific overrides |
| B37 | Monorepos และ Limits | Cloudflare | "Last updated Apr 21, 2026" และ "Sep 5, 2026" | `https://developers.cloudflare.com/pages/configuration/monorepos/`, `.../pages/platform/limits/` | เอกสารปัจจุบัน Limits เป็นข้อจำกัดของแผน Free | อ่านทั้งหน้า |
| B38 | Rollbacks | Cloudflare | "Last updated Apr 21, 2026" | `https://developers.cloudflare.com/pages/configuration/rollbacks/` | เอกสารปัจจุบัน | อ่านทั้งหน้า |
| B39 | Git integration และ Direct Upload | Cloudflare | "Last updated Oct 15, 2026" และ "Apr 21, 2026" | `https://developers.cloudflare.com/pages/configuration/git-integration/`, `.../pages/get-started/direct-upload/` | เอกสารปัจจุบัน | Git integration อ่านทั้งหน้า Direct Upload ค้นคำ "git" แล้วอ่านข้อความที่พบ |

## 2. คำถามที่ 1: การสำรองตามกำหนดเวลาภายใน Apps Script

### 2.1 Trigger ตามเวลาแบบ installable

**การกำหนดรอบรายสัปดาห์** [B1], [B2]

- ตัวอย่างในคู่มือ: `ScriptApp.newTrigger("myFunction").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();` ซึ่งคู่มืออธิบายว่า "fires every Monday at 9 a.m. (in the time zone that your script is set to)" [B1]
- `onWeekDay(day)`: "Specifies the day of the week that the trigger runs." `everyWeeks(n)`: "Specifies to run the trigger every `n` weeks." `atHour(hour)`: "Specifies the hour the trigger at which the trigger runs." ตัวอย่างของ `atHour(5)` มีคำอธิบายว่า "Runs between 5am-6am in the timezone of the script" [B2]
- นาทีที่ทำงาน: `nearMinute(minute)`: "Specifies the minute at which the trigger runs (plus or minus 15 minutes). If `nearMinute()` is not called, a random minute value is used." ตัวอย่างในหน้าเดียวกันมีหมายเหตุว่า "Frequency is required if you are using atHour() or nearMinute()" [B2]
- ความคลาดเคลื่อนของเวลา: "The time might be slightly randomized—for example, if you create a recurring 9 AM trigger, Apps Script chooses a time between 9 AM and 10 AM, then keeps that timing consistent from day to day so that 24 hours elapse before the trigger fires again." [B1]
- เขตเวลา: `inTimezone(timezone)`: "Specifies the timezone for the specified dates/time when the trigger runs. By default, the timezone is that of the script." และ "An invalid timezone string causes the script to throw an error." [B2] เขตเวลาของโปรเจกต์ตั้งในหน้า Project Settings: "When you set a time zone for an Apps Script project, scripts use that time zone when they run." [B5]
- ความถี่ที่ทำได้: "as frequently as every minute or as infrequently as once per month" [B1]
- สร้างด้วยมือได้ในหน้า Triggers ของตัวแก้ไขสคริปต์ หรือสร้างด้วยโค้ดผ่าน `ScriptApp.newTrigger(functionName)` การแก้ trigger ด้วยโค้ดทำไม่ได้โดยตรง: "To programmatically modify an existing installable trigger, you must delete it and create a new one." [B1]

**ข้อจำกัด** [P16] (ค่าของบัญชี consumer เช่น gmail.com)

| รายการ | ค่า | หมายเหตุ |
|---|---|---|
| "Triggers" | "20 / user / script" | ตาราง Current limitations |
| "Triggers total runtime" | "90 min / day" | ตาราง Current quotas บัญชี Google Workspace ได้ "6 hr / day" |
| "Script runtime" | "6 min / execution" | ใช้กับการทำงานทุกแบบ รวมการทำงานจาก trigger |
| "Spreadsheets created" | "250 / day" | เอกสารไม่ระบุว่าการคัดลอกไฟล์นับในรายการนี้หรือไม่ (ข้อ 8) |
| "Properties read/write" | "50,000 / day" | |
| "Apps Script projects" | "50 / day" | จำนวนโปรเจกต์ที่สร้างต่อวัน |
| "Versions" | "200 / script" | ตาราง Current limitations |

"Quotas are per user and reset 24 hours after the first request." เมื่อเวลารวมของ trigger เกินโควตา ข้อความ exception คือ "Service using too much computer time for one day." ซึ่งเอกสารอธิบายว่า "It most commonly occurs for scripts that run on a trigger, which have a lower daily limit than scripts executed manually." [P16]

**Trigger ทำงานในนามใคร**

- "Installable triggers always run under the account of the person who created them." [B1] และตารางในคู่มือ Authorization ระบุ "Installable trigger" ทำงานเป็น "User who created the trigger" [B3]
- "A given account can't see triggers installed from a second account, even though the first account can still activate those triggers." [B1]
- "any installable triggers that you create are not shared with those who have access to your project. If you need to have a consistent trigger setup for all collaborators, use the Script service to create triggers programmatically, at run time." [B6]
- `ScriptApp.getProjectTriggers()`: "Gets all installable triggers associated with the current project and current user." [B3]
- "Before creating a trigger, verify that the associated function has all the necessary OAuth permissions." [B1]

**เมื่อ trigger ล้มเหลว**

- ไม่มีข้อความบนหน้าจอ: "When an installable trigger fires but the function throws an exception or otherwise fails to run successfully, no error message appears on your screen." Apps Script ส่งอีเมลหัวเรื่อง "Summary of failures for Apps Script" และ "The email includes a link to deactivate or reconfigure the trigger." คู่มือไม่ระบุผู้รับของอีเมลนี้ [B1]
- ความถี่ของอีเมลปรับได้ แต่ปิดเฉพาะอีเมลไม่ได้: "Failure notifications are an inherent part of an active trigger. ... While a trigger is active, you can only adjust the frequency of these notifications." [B1]
- รายละเอียดของการทำงานที่ล้มเหลวอยู่ในหน้า Executions ของโปรเจกต์ [B1]
- เมื่อโค้ดเริ่มใช้บริการที่ยังไม่ได้อนุญาต trigger ล้มเหลวโดยไม่มีหน้าต่างขออนุญาต: "When a script runs from a trigger or as a service, an authorization dialog cannot be presented. To authorize the script, open the script editor and run any function. If the script uses new unauthorized services, you must re-authorize it." และ "If a script runs in the background (such as on an installable trigger) and tries to use a service that the user did not authorize, it fails immediately." [B3] คู่มือ Authorization ระบุเพิ่มว่า "Scripts that you have previously authorized also ask for additional authorization if a code change adds new services." [B3]
- เอกสารที่อ่านไม่มีข้อความว่า Apps Script ปิด trigger เองหลังล้มเหลวซ้ำ และไม่มีข้อความว่าไม่ปิด: **Not Verified** (ข้อ 8)

**Trigger กับ deployment และ version ใหม่**

เอกสารที่อ่าน ([B1], [B2], [B3], [B4], [B6]) ไม่ระบุว่า trigger ตามเวลาทำงานด้วยโค้ดล่าสุดที่บันทึก (head) หรือโค้ดของ version ที่ deploy และไม่ระบุว่า trigger ยังอยู่หรือไม่หลัง `clasp push` การสร้าง version หรือการแก้ deployment: **Not Verified** (ข้อ 8) สิ่งที่เอกสารระบุคือ trigger เป็นทรัพยากรที่ "exist independently of its code" ตามคำจำกัดความของหัวข้อ Collaboration and project resources ใน [B6] ("Resources are entities that are associated with your project but exist independently of its code.")

### 2.2 การคัดลอกไฟล์สเปรดชีต

| วิธี | ข้อความในเอกสาร | Scope ที่ต้องมี | สิ่งที่เอกสารไม่ระบุ |
|---|---|---|---|
| `File.makeCopy(name, destination)` ของ `DriveApp` [B10] | "Creates a copy of the file in the destination directory and names it with the name provided." คืนค่า `File` "The new copy." | `https://www.googleapis.com/auth/drive` เท่านั้น (ไม่มีตัวเลือก `drive.readonly`) | สิ่งที่ถูกคัดลอก (แท็บ รูปแบบ ช่วงที่ป้องกัน สคริปต์ที่ผูกกับไฟล์) และสิทธิ์ของสำเนา |
| `Spreadsheet.copy(name)` ของ `SpreadsheetApp` [B11] | "Copies the spreadsheet and returns the new one." | `https://www.googleapis.com/auth/spreadsheets.currentonly` หรือ `https://www.googleapis.com/auth/spreadsheets` | ไม่มีพารามิเตอร์โฟลเดอร์ปลายทาง และไม่ระบุว่าสำเนาอยู่ที่ใดใน Drive |
| Drive API `files.copy` [B12] | "Creates a copy of a file and applies any requested updates with patch semantics." พารามิเตอร์ `copyComments`: "Whether to copy the open (unresolved) comments associated with the file." | หนึ่งใน `drive`, `drive.appdata`, `drive.file`, `drive.photos.readonly` | สิ่งที่ถูกคัดลอกนอกจากความคิดเห็น |

**สิทธิ์ของสำเนา**

- สิทธิ์สืบทอดจากโฟลเดอร์ปลายทาง: คำอธิบายของพารามิเตอร์ `ignoreDefaultVisibility` ใน `files.copy` ลงท้ายว่า "Permissions are still inherited from parent folders." [B12] คู่มือการแชร์ระบุหลักทั่วไป: "Inherited by default: All child files and folders automatically inherit permissions from their parent folder." และ "Cannot be reduced on children: You cannot remove or reduce an inherited permission on a child item." [B13] ศูนย์ช่วยเหลือระบุตรงกัน: "When you share a folder, all files and subfolders inside it inherit those same sharing permissions." [B22]
- สิทธิ์ที่ให้ไว้โดยตรงกับไฟล์ต้นทาง: เอกสารของทั้งสามวิธีไม่ระบุว่าถูกคัดลอกไปที่สำเนาหรือไม่ ข้อเท็จจริงเดียวที่พบอยู่ในหน้าจอของ Sheets: ขั้นตอน "Copy an earlier version" มีข้อ "To share the file with the same people, click Share it with the same people." เป็นตัวเลือกที่ผู้ใช้ต้องกดเอง [B20] สำหรับการคัดลอกด้วยโค้ด: **Not Verified** (ข้อ 8)
- เจ้าของของสำเนาคือผู้คัดลอก: "If view-only collaborators make a copy of the container file, they become the owner of the copy" [B5] และ "if you make a copy of a shared file ... those new files use your storage" [B19]

**สคริปต์ที่ผูกกับไฟล์ (container-bound)**

- การคัดลอกไฟล์ที่มีสคริปต์ผูกอยู่ คัดลอกสคริปต์ไปด้วย: "If view-only collaborators make a copy of the container file, they become the owner of the copy and can edit and run the copied script." [B5]
- สคริปต์ที่ผูกกับไฟล์ "don't appear in Google Drive" และ "can't be detached from the file they are bound to" [B5]
- เอกสารไม่ระบุว่า Script Properties, trigger และ deployment ของสคริปต์ที่ผูกอยู่ตามไปกับสำเนาหรือไม่ ข้อความที่เกี่ยวข้องคือ "Properties are never shared between scripts." [B7] และ trigger "always run under the account of the person who created them" [B1]: **Not Verified** (ข้อ 8)
- เอกสารของโครงการ (`docs/adr/0001`, `docs/schema.md` ข้อ 8) ไม่ระบุว่า Apps Script project ที่ใช้อยู่เป็นแบบ standalone หรือผูกกับไฟล์ฐานข้อมูล ข้อนี้เป็นข้อเท็จจริงของระบบที่ต้องตรวจในช่วงที่ 0

**แท็บ รูปแบบ และช่วงที่ป้องกัน**

เอกสารไม่มีรายการของสิ่งที่การคัดลอกทั้งไฟล์เก็บไว้ ข้อความที่พบมีเพียง: ผู้ที่ดูได้อย่างเดียว "can make a copy of the spreadsheet" แม้แผ่นงานถูกป้องกัน, "People can print, copy, paste, and import and export copies of a protected spreadsheet." และ "if a viewer makes a copy of the spreadsheet, the sheets remain hidden, but they can unhide the sheets." [B23] ข้อหลังแสดงว่าแท็บที่ซ่อนอยู่ถูกคัดลอกไปด้วย การคัดลอกครบทุกแท็บ รูปแบบ plain text ของเซลล์ และการป้องกันช่วง: **Not Verified** จากเอกสาร ตรวจได้ในการทดลองกู้คืนของช่วงที่ 6 (ข้อ 8)

### 2.3 การเอาชุดสำรองเก่าออก

- `File.setTrashed(true)`: "Sets whether the `File` is in the trash of the user's Drive. Only the owner may trash the `File`." ต้องมี scope `https://www.googleapis.com/auth/drive` [B10]
- ตารางเมทอดของ `File` และ `DriveApp` ไม่มีเมทอดลบถาวร มี `setTrashed`, `isTrashed`, `DriveApp.getTrashedFiles()` และ `DriveApp.removeFile(child)` ซึ่งอธิบายว่า "Removes the given file from the root of the user's Drive." [B10]
- การลบถาวรมีใน Drive API: `files.delete` "Permanently deletes a file owned by the user without moving it to the trash." [B12] และ "Deleting files and folders removes them permanently from Drive." [B15]
- ถังขยะล้างเองใน 30 วัน: "Files you move to the Trash are deleted forever after 30 days." [B18] และ "Files in the trash are automatically deleted after 30 days. You can restore files from your trash before the 30-day period." [B15]
- ไฟล์ในถังขยะยังนับพื้นที่: "Files in your Trash still count towards your storage until they are permanently deleted." [B18]
- ไฟล์ในถังขยะยังเปิดได้โดยผู้ที่ได้รับแชร์: "Anyone you shared your file with can continue to access it until the file is permanently deleted." [B18] และ "other users can still access the file in the owner's trash until it's permanently deleted" [B15]
- เฉพาะเจ้าของย้ายไฟล์ลงถังขยะได้ บัญชีอื่นที่พยายามทำได้ error `insufficientFilePermissions` [B15]

### 2.4 พื้นที่เก็บข้อมูล

- ขนาด: "Each Google Account includes up to 15 GB of storage, which is shared across Gmail, Google Drive, and Google Photos." บัญชีใหม่ได้น้อยกว่า: "Starting on March 9, 2026, new Google Accounts get 5 GB of storage with the option to unlock an additional 10 GB by verifying a valid phone number." [B19]
- ไฟล์ Google Sheets นับพื้นที่: รายการ "What counts towards your storage quota" มี "Files created or edited in collaborative content creation apps like Google Docs, Sheets, Slides, Drawings, Forms, Recorder, Vids, and Pics." พร้อมเงื่อนไข "Files created or edited after June 1, 2021 count against your quota." และ "Files uploaded or last edited before June 1, 2021 don't count against your quota." [B19]
- เอกสารสองแหล่งขัดกันเรื่องขนาดที่รายงาน: `File.getSize()` ระบุ "Gets the number of bytes used to store the `File` in Drive. Note that Google Workspace application files do not count toward Drive storage limits and thus return `0` bytes." [B10] (หน้าลงวันที่ 2026-04-13) ขณะที่ [B19] ระบุว่านับ เอกสารไม่ระบุวิธีคำนวณขนาดของไฟล์ Sheets: **Not Verified** (ข้อ 8)
- ค่าที่สคริปต์อ่านได้: `DriveApp.getStorageLimit()` "Gets the number of bytes the user is allowed to store in Drive." และ `DriveApp.getStorageUsed()` "Gets the number of bytes the user is currently storing in Drive." [B10]
- ไฟล์นับพื้นที่ของเจ้าของเท่านั้น: "Files in shared folders only consume the cloud storage quota of the original file owner, never the recipient." [B19]
- เมื่อพื้นที่เต็ม [B19]:
  - "Most actions on your Drive files will be restricted other than download, delete, and Takeout."
  - "You can’t create new files in collaborative content creation apps like Google Docs, Sheets, Slides, Drawings, Forms, Vids, and Pics. Until you reduce your storage usage, nobody can edit or copy your affected files."
  - "When your account reaches its storage limit, you won't be able to upload or create files in Drive, send or receive emails in Gmail, or back up photos or videos to Google Photos."
  - "Your ability to send and receive email in Gmail can be impacted." และ "Messages sent to you go back to the sender."
  - เกิน 2 ปี: "all of your content in your Google Account may be removed" โดย Google แจ้งล่วงหน้า "at least 3 months"
- พื้นที่ไม่คืนทันทีหลังลบ: "After you delete a large number of files, it normally takes up to 48–72 hours for Google's systems to accurately update the storage space." [B19]
- เอกสารของ Apps Script ไม่ระบุว่า `makeCopy`, `createFile` หรือการเขียน Sheet ได้ exception ใดเมื่อพื้นที่เต็ม: **Not Verified** (ข้อ 8)

### 2.5 ข้อจำกัดของไฟล์ Google Sheets

- ขนาดสูงสุด: "Up to 20 million cells or 100MB for spreadsheets that are created in or converted to Google Sheets." [B17] หน้าปัจจุบันระบุ 20 ล้านเซลล์ ไม่ใช่ 10 ล้านเซลล์ตามที่คำถามของการค้นคว้านี้ตั้งไว้ หน้าเดียวกันไม่มีข้อจำกัดจำนวนแถว จำนวนคอลัมน์ หรือจำนวนแท็บ
- เวอร์ชันที่ตั้งชื่อ: "You can add up to 15 names versions per spreadsheet." (สะกดตามต้นฉบับ) [B20]
- การแชร์: "You can share a single file with up to 600 individual email addresses." และ "A Google file can only be actively edited on up to 100 open tabs or devices at the same time." [B22]

## 3. คำถามที่ 2: ทางกู้คืนอื่นนอกจากชุดสำรองของระบบ

### 3.1 ประวัติเวอร์ชันของ Google Sheets [B20]

- สิทธิ์: "To browse earlier versions of a file, you need permission to edit that file." และ "If you don't have permission to edit a file, you won't be able to see the version history."
- กู้คืนทั้งไฟล์: เลือกเวอร์ชันแล้วกด "Restore this version" ผลข้างเคียงที่ระบุ: "When you restore an earlier version of a spreadsheet, it clears the cell-by-cell edit history for any changes made before the restore. If you need to track the cell edit history, make a copy of the spreadsheet instead."
- คัดลอกเวอร์ชันเป็นไฟล์ใหม่: เมนู "Make a copy" ของเวอร์ชันนั้น ให้ตั้งชื่อ เลือกที่เก็บ และเลือกได้ว่าจะ "Share it with the same people"
- เวอร์ชันถูกรวมได้: "The revisions for your file may occasionally be merged." การตั้งชื่อเวอร์ชันกันการรวม: "You can create a named version to track your version history and make sure your versions aren't merged." จำกัด 15 เวอร์ชันที่ตั้งชื่อต่อสเปรดชีต (40 ต่อเอกสาร Docs)
- เจ้าของลบประวัติได้ (เฉพาะบัญชีส่วนตัว): "Deleting version history is available only for users with a personal Google Account." มีสองคำสั่ง "Delete all versions" ซึ่งลบ "all versions of your document that have not been explicitly named" และ "Delete this and older versions" พร้อมคำเตือน "Deleting version history is permanent and cannot be undone."
- ระยะเวลาที่เก็บเวอร์ชัน: หน้านี้ไม่ระบุ คู่มือ Drive API ระบุระยะเวลาเฉพาะไฟล์แบบ blob (ไฟล์ที่ไม่ใช่ของ Google Workspace): "Purgeable revisions are typically preserved for 30 days, but can be purged earlier if a file has 100 revisions that aren't designated as \"Keep Forever\" and a new revision is uploaded." และระบุเรื่อง Sheets เพียงว่า รายการ revision จาก API "might be incomplete for files with a large revision history, including frequently edited Google Docs, Google Sheets, and Google Slides" [B16] ระยะเวลาเก็บเวอร์ชันของไฟล์ Sheets และการที่เวอร์ชันที่ตั้งชื่อถูกเก็บนานกว่าหรือไม่: **Not Verified** (ข้อ 8)
- ประวัติการแก้รายเซลล์ ("Show edit history") ไม่ครบ: รายการที่ไม่แสดงรวม "Added or deleted rows and columns", "Changes made by formulas" และ "Changes made prior to restoring a past version of the spreadsheet."
- เอกสารไม่ระบุว่าการเขียนของสคริปต์ผ่าน `SpreadsheetApp` ถูกบันทึกเป็นเวอร์ชันอย่างไร การค้นคำ "version" และ "revision" ในหน้า Class Spreadsheet, SpreadsheetApp, File และ DriveApp ไม่พบเมทอดสำหรับอ่าน ตั้งชื่อ หรือกู้คืนเวอร์ชัน [B10], [B11]: **Not Verified** (ข้อ 8)

### 3.2 ถังขยะของ Drive

- เจ้าของกู้ไฟล์ได้ภายใน 30 วัน: "Files remain in Trash for 30 days, then they’re deleted forever." และขั้นตอนคือเปิด Trash คลิกขวาที่ไฟล์ แล้วเลือก Restore [B18]
- หลังลบถาวร: หน้า Recover a deleted file มีส่วนขอกู้ไฟล์ที่แสดงเฉพาะผู้ล็อกอิน ("To request file recovery, log into your Google Account and reload this article.") เงื่อนไขและระยะเวลาของการขอกู้จึงไม่ได้อ่าน: **Not Verified** (ข้อ 8)
- เมื่อเจ้าของลบถาวร ผู้ที่ได้รับแชร์เสียสิทธิ์: "If you're the owner of the file, anyone you shared the file with loses access when you permanently delete it." [B18]

### 3.3 Google Takeout [B28]

- ชนิดของการส่งออก: "One-time archive" หรือ "Scheduled exports" ซึ่ง "Automatically create an archive of your selected data every 2 months for one year."
- ปลายทาง: ลิงก์ดาวน์โหลดทางอีเมล, "Add to Drive" ("Your data will count toward your storage."), Dropbox, Microsoft OneDrive หรือ Box
- อายุของไฟล์ส่งออก: "Your archive expires in about 7 days." และ "We only allow each archive to be downloaded 5 times"
- ความครบถ้วน: "Your data file may not include changes made to your data between when you request a download and when you create your archive." และข้อมูลที่อยู่ระหว่างถูกลบ "are not included in your archive"
- เวลา: "this process could take from a few minutes to a few days"
- การเลือกบางส่วน: "If you only want to download some of your data from a product, you may have the option to select a button like All data included" แล้ว "you can uncheck the box next to data you don’t want to include." หน้านี้ไม่ระบุว่า Drive เลือกรายโฟลเดอร์ได้ และไม่ระบุรูปแบบไฟล์ที่ Sheets ถูกส่งออก: **Not Verified** (ข้อ 8)
- ศูนย์ช่วยเหลือของ Drive แนะนำ Takeout เป็นวิธีย้ายไฟล์ทั้งหมดไปอีกบัญชี: "To transfer all your Google Drive files and folders to another account, you can download your Google data." [B21]
- ต้องยืนยันตัวตนซ้ำก่อนดาวน์โหลด และ "If your account has 2-Step Verification turned on, you may also be asked to complete an additional verification step."

### 3.4 สิ่งที่แต่ละทางไม่ครอบคลุม

ตารางนี้สรุปจากข้อความในข้อ 2 และข้อ 3 คอลัมน์ "ไม่ครอบคลุม" เป็นการตีความของผู้ค้นคว้าจากข้อความที่อ้าง

| ทางกู้คืน | ใช้ได้เมื่อ | ไม่ครอบคลุม |
|---|---|---|
| ประวัติเวอร์ชันของไฟล์ฐานข้อมูล | ไฟล์ยังอยู่ และผู้กู้มีสิทธิ์แก้ไข | ไฟล์ถูกลบถาวร (ประวัติอยู่กับไฟล์) บัญชีเจ้าของเข้าไม่ได้และไม่มีบัญชีอื่นที่มีสิทธิ์แก้ไข ประวัติที่ถูกลบด้วย "Delete history" เวอร์ชันที่ถูกรวม และระยะเวลาเก็บที่ไม่มีเอกสารรับรอง |
| ถังขยะของ Drive | ไฟล์ถูกย้ายลงถังขยะไม่เกิน 30 วัน และเข้าบัญชีเจ้าของได้ | ไฟล์ที่ถูกลบถาวรหรือพ้น 30 วัน ข้อมูลที่ถูกแก้ผิดในไฟล์ที่ไม่ได้ถูกลบ และบัญชีที่เข้าไม่ได้ |
| สำเนาของไฟล์ในโฟลเดอร์ของระบบ (บัญชีเดียวกัน) | ไฟล์ต้นทางเสียหายหรือถูกลบ แต่บัญชีและโฟลเดอร์ยังอยู่ | บัญชีถูกลบ ถูกยึด หรือเข้าไม่ได้ (สำเนาเป็นของบัญชีเดียวกัน) พื้นที่เต็มจนคัดลอกไม่ได้ และการลบทั้งโฟลเดอร์ |
| Google Takeout | เข้าบัญชีได้ในวันที่ส่งออก และมีผู้เก็บไฟล์ส่งออกไว้นอกบัญชี | การเปลี่ยนแปลงหลังวันที่ส่งออก การส่งออกอัตโนมัติถี่กว่าทุก 2 เดือน และบัญชีที่เข้าไม่ได้แล้ว |
| สำเนาที่บัญชี Google อีกบัญชีหนึ่งเป็นเจ้าของ หรือไฟล์ที่ดาวน์โหลดออกนอก Google | บัญชีเจ้าของเสียทั้งบัญชี | ไม่มีกลไกอัตโนมัติในเอกสารที่อ่าน นอกจากการโอนความเป็นเจ้าของรายไฟล์ซึ่งผู้รับต้องกดรับ (ข้อ 4.3) |

## 4. คำถามที่ 3: ความต่อเนื่องของบัญชี Gmail ส่วนตัวที่เป็นเจ้าของระบบ

### 4.1 นโยบายบัญชีที่ไม่มีการใช้งาน [B24]

- "An inactive Google Account is an account that has not been used within a 2-year period. Google reserves the right to delete an inactive Google Account and its activity and data if you are inactive across Google for at least two years."
- ใช้กับบัญชีส่วนตัวเท่านั้น: "This policy applies to your personal Google Account. This policy doesn't apply to any Google Account that was set up for you through your work, school, or other organization."
- สิ่งที่นับเป็นการใช้งาน: "Activity might include these actions you take when you sign in or while you’re signed in to your Google Account" ได้แก่ "Reading or sending an email", "Using Google Drive", "Watching a YouTube video", "Sharing a photo", "Downloading an app", "Using Google Search" และ "Using Sign in with Google to sign in to a third-party app or service"
- แยกรายบัญชี: "If you have more than one Google Account set up on your device, you’ll want to make sure each account is used within a 2-year period."
- การแจ้งก่อนลบ: "Email notifications to your Google Account" และ "Notifications to your recovery email, if any exists"
- ระดับผลิตภัณฑ์: "Google also reserves the right to delete data in a product if you are inactive in that product for at least two years."
- ข้อยกเว้นที่ระบุทั้งหมดเกี่ยวกับการซื้อ บัตรของขวัญ แอปที่เผยแพร่ และบัญชีของผู้เยาว์ ไม่มีข้อใดเกี่ยวกับ Apps Script หรือ Drive
- หน้านี้ไม่ระบุว่าการทำงานของ trigger หรือ web app ที่รันในนามบัญชี นับเป็นการใช้งานหรือไม่ รายการข้างบนเป็นการกระทำ "you take": **Not Verified** (ข้อ 8)

### 4.2 Inactive Account Manager [B25]

- "Inactive Account Manager is a way for users to share parts of their account data or notify someone if they’ve been inactive for a certain period of time."
- "You can select up to 10 people to receive this data, and choose to share all or only specific data types." ตัวอย่างข้อความในหน้านั้นแสดง Drive เป็นหนึ่งในข้อมูลที่แชร์ได้
- สัญญาณที่ใช้ตัดสิน: "your last sign-ins, your recent activity in My Activity, usage of Gmail (e.g., the Gmail app on your phone), and Android check-ins"
- ผู้รับต้องยืนยันด้วยเบอร์โทรศัพท์ และได้อีเมลที่มี "a link they can follow to download the data" หน้านี้ไม่กล่าวถึงการให้ผู้รับเข้าบัญชีหรือรับช่วงเป็นเจ้าของไฟล์
- ไม่แทนนโยบายข้อ 4.1: "The Inactive Account Manager settings don’t override our inactive and over quota policies." [B19]

### 4.3 การยืนยันตัวตนสองชั้น รหัสสำรอง และข้อมูลกู้คืน

- 2-Step Verification: หลังเปิดใช้ เข้าบัญชีได้ด้วย "Your password and a second step" หรือ "Your passkey" และ "When you sign in with a passkey, it bypasses your second authentication step" [B26]
- วิธีของขั้นที่สองที่หน้าระบุ: Google prompts, passkey หรือ hardware security key, แอปสร้างรหัส (Google Authenticator), รหัสทาง SMS หรือโทรศัพท์ และ backup codes หน้าเดียวกันเตือนว่า "verification codes sent by texts or calls can be vulnerable to phone number-based hacks" [B26]
- เบอร์ใหม่ใช้ไม่ได้ทันที: "If you add a phone number for 2-Step Verification, it may take up to 7 days for Google to trust the phone number." [B26]
- Backup codes [B26]: ชุดละ 10 รหัส รหัสละ 8 หลัก "After you use a backup code to sign in, that code becomes inactive." และ "When you create a new set of codes, the old set automatically becomes inactive." ต้องเปิด 2-Step Verification ก่อน พิมพ์หรือดาวน์โหลดได้ และ "You can't download backup codes if you're in the Advanced Protection Program."
- ข้อมูลกู้คืน [B27]: เบอร์โทรศัพท์กู้คืน อีเมลกู้คืน ("Choose an email address you use regularly but not the one you use to sign in to your Google Account") recovery contacts และวิดีโอเซลฟี ข้อจำกัดที่ระบุ: "You can’t add recovery info while you’re locked out of your account or in the account recovery process." การเปลี่ยนเบอร์กู้คืน "may take up to 7 days for those changes to take effect" และ recovery contact ใช้ได้หลังตอบรับ 7 วัน
- ไม่มีช่องทางโทรหา Google: "For your security, you can't call Google for help to sign into your account." และเมื่อกู้ไม่ได้ หน้านั้นแนะนำ "you can create a new Google Account" [B27]
- อีเมลกู้คืนเป็นช่องทางที่ Google ใช้แจ้งเรื่องบัญชี รวม "To let you know if you're about to run out of storage space" [B27] และการแจ้งก่อนลบบัญชีที่ไม่มีการใช้งาน [B24]

### 4.4 การโอนความเป็นเจ้าของไฟล์และโฟลเดอร์ระหว่างบัญชีส่วนตัว

- ทำได้ และผู้รับต้องตอบรับ: "Ownership of files can be transferred between one consumer account to another. However, Drive doesn't transfer ownership of a file between the two consumer accounts until the prospective owner explicitly consents to the transfer." [B14]
- ขั้นตอนในหน้าจอ [B21]: ต้องแชร์ไฟล์ให้ผู้รับก่อน ("You can only transfer ownership to someone you shared the file or folder with.") แล้วเลือก "Transfer ownership" ที่ชื่อผู้รับ ผู้รับได้อีเมลและกด Accept หรือ Decline ค้นไฟล์ที่รอตอบได้ด้วย `pendingowner:me`
- ระหว่างรอ: "The pending owner is upgraded to an Editor, unless they’re already an Editor." และ "Until then, you remain the owner."
- หลังตอบรับ: "If the pending owner accepts, you’re downgraded to Editor. The new owner can remove you." และ "You can't cancel a transfer after the new owner accepts the request."
- โฟลเดอร์: "When you make someone else the owner of a folder, you still own the files inside." [B21] การโอนโฟลเดอร์จึงไม่โอนไฟล์ข้างใน
- พื้นที่: "When you transfer ownership of a file, it's no longer in My Drive and doesn't count towards your storage. It'll count towards the storage of the new owner." [B21]
- ข้ามชนิดบัญชีไม่ได้: "You can’t transfer a file from your personal Google account to someone with a work or school account." [B21]
- ทำด้วย `DriveApp` ไม่ได้: `File.setOwner` มีหมายเหตุ "Drive does not support changing the ownership for items which are owned by gmail.com accounts; it's supported for Workspace accounts." [B10] ข้อความนี้ขัดกับ [B14] และ [B21] ในภาพรวม คู่มือ Drive API อธิบายขั้นตอนสองฝ่าย (`pendingOwner=true` แล้วผู้รับตั้ง `role=owner` กับ `transferOwnership=true`) ซึ่งเมทอด `setOwner` ที่รับเพียงอีเมลไม่มี

### 4.5 Apps Script project เมื่อเจ้าของเปลี่ยนหรือเมื่อคัดลอกโปรเจกต์

- โปรเจกต์แบบ standalone เป็นไฟล์ใน Drive: "These scripts appear among your files in Google Drive." [B5] และ "Standalone projects appear in Drive as a file; share them like any other file." [B6] โปรเจกต์ที่ผูกกับไฟล์ใช้สิทธิ์ของไฟล์นั้น: "All container-bound scripts use the same owner, viewer, and editor access list defined for the container file." [B5]
- Deployment ไม่โอนตาม: "You cannot transfer ownership of versioned deployments. If you transfer ownership of a script project, the owner of the existing versioned deployments doesn't change. If an administrator deletes the deployment owner's account, their deployments might experience script errors." [B4]
- Web app แบบ "Execute the app as me": "the script always executes as you, the owner of the script, no matter who accesses the web app." [P17] ข้อความเรื่องการเปลี่ยนเจ้าของในคู่มือ Web Apps กล่าวถึงกรณีข้ามโดเมนเท่านั้น: "Web apps deployed in one domain cease to function if their ownership changes to a shared drive or account in a different domain. This can be corrected by having the new owner or collaborator redeploy the web app in the new domain." [P17] เอกสารไม่กล่าวถึงการเปลี่ยนเจ้าของระหว่างบัญชี gmail.com สองบัญชี: web app เดิมจะรันในนามใคร และ URL เดิมยังใช้ได้หรือไม่ เป็น **Not Verified** (ข้อ 8)
- URL ผูกกับ deployment: "A deployment has a unique URL or ID." [B4] และ "For web apps, each deployment has a unique URL." [B9] deployment ใหม่ที่บัญชีใหม่สร้างจึงมี URL ใหม่ (การตีความจากสองประโยคนี้)
- Trigger ไม่โอนตาม: trigger รันในนามผู้สร้างและบัญชีอื่นมองไม่เห็น (ข้อ 2.1) บัญชีที่รับช่วงต้องสร้าง trigger ของตนเอง
- Script Properties: "Properties are never shared between scripts." และตารางเปรียบเทียบในคู่มือระบุแถว "Data shared among" ของ Script Properties ว่า "All users of a script, add-on, or web app" [B7] เอกสารไม่กล่าวถึงผลของการเปลี่ยนเจ้าของต่อ Script Properties โดยตรง การเปลี่ยนเจ้าของไม่สร้างโปรเจกต์ใหม่ ค่าจึงควรอยู่กับโปรเจกต์เดิม (การตีความ) และเอกสารไม่ระบุว่าสำเนาของโปรเจกต์ได้ค่า Script Properties ไปด้วยหรือไม่: **Not Verified** (ข้อ 8)
- การคัดลอกโปรเจกต์แบบ standalone: หน้าที่อ่าน ([B4], [B5], [B6], [B8]) ไม่มีขั้นตอนคัดลอกโปรเจกต์ วิธีที่มีเอกสารคือสร้างโปรเจกต์ใหม่ด้วย `clasp create-script` แล้ว `clasp push` โค้ดชุดเดียวกัน [B9] ซึ่งส่งเฉพาะไฟล์โค้ดและ manifest: "the `push` command always **replaces** the whole content of the online project with the files being pushed" [B9]
- คำเตือนของ Google เรื่องเจ้าของคนเดียว: "A common problem in collaboration occurs when a script project owner leaves the team without transferring ownership of the project to someone else on the team. This can leave you unable to maintain or update the project." ทางแก้ที่คู่มือเสนอคือ shared drive ซึ่ง "are only available to Google Workspace Business and Google Workspace Enterprise customers" [B6]
- การลบโปรเจกต์กู้ไม่ได้: "Once you delete a container-bound Apps Script project, it can't be recovered." [B5]

### 4.6 ระดับสิทธิ์ที่บัญชี Google ที่สองต้องมี

| จุดประสงค์ | สิทธิ์ที่เอกสารระบุ | ข้อจำกัดที่เอกสารระบุ |
|---|---|---|
| (ก) อ่านชุดสำรอง | Viewer ของโฟลเดอร์: "People can view the file or folder and open all files within a shared folder. They cannot make changes, add comments, or share the item." [B22] | Viewer ดูประวัติเวอร์ชันไม่ได้ [B20] Viewer คัดลอกและดาวน์โหลดได้ เว้นแต่เจ้าของปิดตัวเลือก "People who can download, copy, print, and access" [B22] |
| (ข) รับช่วงดูแลข้อมูล | Editor ของโฟลเดอร์หรือไฟล์: "People can open, edit, delete, or move any files within the folder, as well as add new files. Editors can also change permissions and share items with others by default." [B22] | ย้ายไฟล์ลงถังขยะได้เฉพาะเจ้าของ [B10], [B15]: "You cannot delete files you do not own." และ "If you remove a file from a shared folder, it moves to the owner's My Drive." [B22] สิทธิ์ของโฟลเดอร์สืบทอดถึงทุกไฟล์ข้างในและลดรายไฟล์ไม่ได้ [B13], [B22] ปิดการแชร์ต่อของ Editor ได้ด้วย "Allow editors to change permissions and share" [B22] หรือ `setShareableByEditors(false)` [B10] |
| (ข) รับช่วงดูแลสคริปต์ | Editor ของโปรเจกต์: "Editors can also create new code versions, publish add-ons, and deploy scripts as web apps or as executables for the Apps Script API." [B6] | deployment เดิมยังเป็นของเจ้าของเดิม [B4] trigger เดิมมองไม่เห็นและต้องสร้างใหม่ [B1] ถ้าโปรเจกต์อยู่ในโฟลเดอร์ที่แชร์ "If someone has edit access to the folder, they can edit or delete the Apps Script project and run the script." [B6] |
| เป็นเจ้าของแทน | โอนความเป็นเจ้าของรายไฟล์ตามข้อ 4.4 | ผู้รับต้องกดรับทีละคำขอ โฟลเดอร์ไม่พาไฟล์ข้างในไปด้วย [B21] |

บัญชีที่สองที่สร้างใหม่หลัง 9 มีนาคม 2026 มีพื้นที่ 5 GB จนกว่าจะยืนยันเบอร์โทรศัพท์ [B19] และอยู่ใต้นโยบายไม่มีการใช้งาน 2 ปีของตัวเอง [B24]

## 5. คำถามที่ 4: การตรวจการแชร์ที่ไม่ต้องการจาก Apps Script

### 5.1 เมทอดของ `File` และ `Folder` [B10]

ทุกเมทอดในตารางต้องมี scope `https://www.googleapis.com/auth/drive.readonly` หรือ `https://www.googleapis.com/auth/drive` `Folder` มีเมทอดชื่อเดียวกันครบทุกแถว

| เมทอด | คืนค่า | ข้อความในเอกสาร |
|---|---|---|
| `getSharingAccess()` | `Access` | "Gets which class of users can access the `File`, besides any individual users who have been explicitly given access." |
| `getSharingPermission()` | `Permission` | "Gets the permission granted to those users who can access the `File`, besides any individual users who have been explicitly given access." |
| `getEditors()` | `User[]` | "Gets the list of editors for this `File`. If the user who executes the script does not have edit access to the `File`, this method returns an empty array." |
| `getViewers()` | `User[]` | "Gets the list of viewers and commenters for this `File`. If the user who executes the script does not have edit access to the `File`, this method returns an empty array." |
| `getOwner()` | `User` | "Gets the file owner." |
| `getAccess(email)` | `Permission` | "Gets the permission granted to a specific user. The method doesn't support returning permissions for a Google Group or permissions inherited through Google Groups." |
| `isShareableByEditors()` | `Boolean` | "Determines whether users with edit permissions to the `File` are allowed to share with other users or change the permissions." ค่าตั้งต้นของไฟล์ใหม่คือ `true` ตามคำอธิบายของ `setShareableByEditors` |

### 5.2 ค่าของ enum [B10]

`Access` (ค่าที่ `getSharingAccess()` คืน): "An enum representing classes of users who can access a file or folder, besides any individual users who have been explicitly given access."

| ค่า | คำอธิบายในเอกสาร |
|---|---|
| `ANYONE` | "Anyone on the Internet can find and access. No sign-in required." |
| `ANYONE_WITH_LINK` | "Anyone who has the link can access. No sign-in required." |
| `DOMAIN` | "People in your domain can find and access. Sign-in required." ใช้ได้เฉพาะบัญชี Google Workspace |
| `DOMAIN_WITH_LINK` | "People in your domain who have the link can access. Sign-in required." ใช้ได้เฉพาะบัญชี Google Workspace |
| `PRIVATE` | "Only people explicitly granted permission can access. Sign-in required." |

`Permission` (ค่าที่ `getSharingPermission()` และ `getAccess()` คืน): `VIEW`, `EDIT`, `COMMENT`, `OWNER`, `ORGANIZER`, `FILE_ORGANIZER` และ `NONE` คำอธิบายของ `NONE` คือ "The user does not have any permissions for the file or folder." และของ `EDIT` ระบุว่า "Unless `File.setShareableByEditors(shareable)` is set to `false`, users can also change the sharing settings."

### 5.3 สิทธิ์ที่สืบทอดจากโฟลเดอร์

- หน้า reference ของ `File` และ `Folder` ไม่ระบุว่า `getSharingAccess()`, `getEditors()` และ `getViewers()` ของไฟล์ที่อยู่ในโฟลเดอร์ที่แชร์ รายงานสิทธิ์ที่สืบทอดมาด้วยหรือไม่ การค้นคำ "inherit" ในสองหน้านั้นพบเฉพาะข้อความเรื่อง Google Groups ของ `getAccess`: **Not Verified** (ข้อ 8)
- ฝั่ง Drive สิทธิ์สืบทอดเสมอ: "Inherited by default: All child files and folders automatically inherit permissions from their parent folder." [B13] ไฟล์ในโฟลเดอร์ที่แชร์จึงเปิดได้โดยผู้ที่ได้รับแชร์โฟลเดอร์ ไม่ว่าเมทอดของ `File` จะรายงานอย่างไร
- Drive API แยกสิทธิ์ที่สืบทอดได้ด้วยฟิลด์ `permissionDetails` ซึ่งมี `inherited` และ `inheritedFrom` แต่คู่มืออธิบายฟิลด์นี้ในบริบทของ shared drive ("To determine the role source for a shared drive, or items within that drive") [B13] ไม่ได้อ่านหน้า reference ของ `permissions` resource ว่าฟิลด์นี้มีค่าสำหรับไฟล์ใน My Drive หรือไม่
- การเอาผู้ใช้ออกรายคนไม่ปิดการเข้าถึงแบบกลุ่ม: `removeEditor` "doesn't block users from accessing the `File` if they belong to a class of users who have general access" [B10]
- โฟลเดอร์แบบ limited access เป็นวิธีที่ Drive ให้ตัดการสืบทอด: "When you limit access to a folder, only people you give permission to can open it." ใน My Drive เจ้าของโฟลเดอร์เปิดหรือปิดได้ [B22] หน้า reference ของ `Folder` ที่อ่านไม่มีเมทอดสำหรับค่านี้

## 6. คำถามที่ 5: สองชุด คือชุดใช้งานจริงและชุดทดสอบ

### 6.1 Apps Script: deployment, version และ clasp

**Deployment สองชนิด** [B4]

- "Head deployments, which always sync to the current project code." และ "Versioned deployments, which connect to a specific project version."
- "Use head deployments to test code. Don't use head deployments for public use. There is only one head deployment for each Apps Script project."
- URL ของ head deployment ลงท้ายด้วย `/dev`: "This URL ends in `/dev` and can only be accessed by users who have edit access to the script. This instance of the app always runs the most recently saved code" [P17]
- "When you publish an application for public use, always use a versioned deployment. You can have multiple active versioned deployments at once."
- จำนวน deployment สูงสุดต่อโปรเจกต์: หน้า [B4] และ [P16] ไม่ระบุ: **Not Verified** (ข้อ 8)

**URL คงเดิมเมื่อแก้ deployment ให้ชี้ version ใหม่** [B4]

- "When you want to update the code used by an existing deployment (like a web app), you create a new version and then edit the deployment to point to that new version. This updates the application for all users while maintaining the same URL or deployment ID."
- "To deploy a change to the project code, create a new version and edit the deployment to use it. This is the standard way to update your application without changing its URL or deployment ID. The deployment automatically uses the new version for all users."
- ทำในหน้าจอที่ Deploy > Manage deployments > Edit > Version > New version
- Deployment ลบไม่ได้ แต่ archive ได้และ deploy ซ้ำได้: "You can't delete versioned deployments from your record of deployments. Instead, you can archive them." และ "Deployment IDs only appear on active deployments."

**Version** [B4]

- "A version is a static copy of a script. ... Once saved, a version is immutable. ... Script projects can have up to 200 versions."
- ลบได้เมื่อไม่มี deployment ที่ใช้งานอยู่ชี้มา: "You can permanently delete versions if they're not in use by an active deployment."
- กู้โค้ดจาก version เก่าต้องคัดลอกเอง: "You can't automatically restore a previous version of your script project. However, you can manually copy code from a previous version into your current project" ข้อนี้เกี่ยวกับประโยคใน `docs/roadmap.md` ช่วงที่ 0 ว่าระบบเก่า "กู้คืนได้จากประวัติเวอร์ชันของ Apps Script"

**clasp กับโปรเจกต์มากกว่าหนึ่งโปรเจกต์จากโค้ดชุดเดียว** [B9]

- `.clasp.json`: "When running `clone` or `create`, a file named `.clasp.json` is created in the current directory to describe `clasp`'s configuration for the current project." ค่าที่ต้องมีคือ `scriptId` ("Specifies the id of the Google Script project that clasp will target.") และมี `rootDir` กับ `projectId` เป็นตัวเลือก
- ตัวเลือกกลาง `--project <file>`: "Reads project settings from a file other than `.clasp.json`. Intended to support multiple deployment targets." README ของ 3.x ไม่แสดงรูปย่อ `-P`
- ตัวเลือกกลาง `--user <name>`: "Uses credentials stored under the named key. When omitted, the `default` user is used." และ "Use the global `--user` option to switch between accounts."
- `clasp create-script [--title <title>] [--type <type>] [--rootDir <dir>] [--parentId <id>]`: "Creates a new script project." เมื่อไม่ระบุ `--parentId` "a standalone script project is created"
- `clasp clone-script <scriptId | scriptURL> [versionNumber] [--rootDir <dir>]`: "Clones the script project from script.google.com."
- `clasp push`: "Force writes all local files to script.google.com." และ "the `push` command always **replaces** the whole content of the online project with the files being pushed"
- `clasp create-deployment [--versionNumber <version>] [--description <description>] [--deploymentId <id>]`: "Creates a version and deploys a script. ... For web apps, each deployment has a unique URL. To update/redeploy an existing deployment, provide the deployment ID." ตัวอย่าง: "`clasp create-deployment --deploymentId abcd1234` (redeploy and create new version)"
- `clasp update-deployment <id>`: "Updates an existing deployment. Same as `create-deployment -i id`." ตารางย้ายรุ่นระบุว่าคำสั่ง `deploy -i <id>` ของ 2.x เปลี่ยนชื่อเป็น `update-deployment <id>` ใน 3.x และ "Other commands have also been renamed but retain aliases for compatibility."
- รุ่นของ clasp ที่ติดตั้งในเครื่องพัฒนาของโครงการคือ 3.4.1 (ผลของ `clasp --version` เมื่อ 17 พ.ย. 2569) ตรงกับรุ่นล่าสุดที่ออก
- คู่มือของ Google [B8] ยังใช้ชื่อคำสั่งแบบเดิมบางคำสั่ง (`clasp deploy`, `clasp redeploy <deploymentId> <version> <description>`, `clasp versions`) และแนะนำให้เก็บ `.clasp.json` นอก repository: "Add `.clasprc.json` and `.clasp.json` to your `.gitignore`. These contain credentials and should never be committed."
- เอกสารสองหน้าของ Google ขัดกันเรื่องสคริปต์ที่ผูกกับไฟล์: [B5] ระบุ "The `clasp` tool can't create bound scripts, but it can clone and edit them." ส่วน [B8] และ [B9] ระบุว่า `--parentId` สร้างสคริปต์ที่ผูกกับไฟล์ที่มีอยู่ได้

### 6.2 การคัดลอกทั้งชุด

| สิ่งที่ต้องมีในชุดใหม่ | สิ่งที่เอกสารระบุ |
|---|---|
| ไฟล์ฐานข้อมูล | คัดลอกได้ด้วยวิธีในข้อ 2.2 สำเนาเป็นไฟล์ใหม่ที่มี ID ของตัวเอง สิ่งที่การคัดลอกเก็บไว้ไม่มีรายการในเอกสาร (ข้อ 2.2) |
| โฟลเดอร์รูปถ่าย | "You can’t copy folders, only files." [B23] |
| โค้ดของ Apps Script | ไม่มีขั้นตอนคัดลอกโปรเจกต์แบบ standalone ในหน้าที่อ่าน สร้างโปรเจกต์ใหม่แล้ว push โค้ดได้ [B9] ถ้าสคริปต์ผูกกับไฟล์ฐานข้อมูล การคัดลอกไฟล์คัดลอกสคริปต์ไปด้วย [B5] |
| Script Properties | "Properties are never shared between scripts." [B7] ตั้งด้วยมือได้ไม่เกิน 50 ค่าในหน้า Project Settings หรือตั้งด้วยโค้ด [B7] การตามไปกับสำเนา: **Not Verified** |
| Trigger | สร้างใหม่โดยบัญชีที่จะให้รัน (ข้อ 2.1) การตามไปกับสำเนา: **Not Verified** |
| Deployment ของ web app | แต่ละ deployment มี URL ของตัวเอง [B4], [B9] โปรเจกต์ใหม่จึงมี URL ใหม่ |
| OAuth client | ข้อ 6.4 |
| หน้าเว็บ | ข้อ 6.3 |

### 6.3 Cloudflare Pages

**Production branch และ preview** [B34], [B35]

- "Pages will default to setting your production environment to the branch you first push, but you can set your production to another branch if you choose." ตั้งที่ Settings > Builds & deployments > Configure Production deployments
- ปิดการ deploy อัตโนมัติของ production branch ได้ด้วยช่อง "Enable automatic production branch deployments" [B34] และคู่มือ Git integration ระบุว่าหลังปิดแล้ว "you can use Wrangler to deploy directly to your Pages project" [B39]
- Preview มีสามตัวเลือก: "All non-Production branches", "None" และ "Custom branches" ซึ่งรับชื่อ branch ตรงตัวหรือ wildcard ในช่อง include และ exclude: "The order of execution for the configuration is (1) Excludes, (2) Includes, (3) Skip." [B34]
- commit ที่ production branch ปรับ `<project>.pages.dev` และ custom domain ทุกตัวของโปรเจกต์: "any commits to the `main` branch will update your `user-example.pages.dev` content, as well as any custom domains attached to the project" [B35]
- Preview จาก pull request เกิดเฉพาะ PR จาก repository เดียวกัน: "This is only true when pull requests originate from the repository itself." [B35]

**รูปแบบ URL ของ preview** [B35]

- ทุก deployment มีที่อยู่ตาม hash: "`<hash>.<project>.pages.dev`. These are atomic and may always be visited in the future."
- ทุก branch มี alias ที่ชี้ deployment ล่าสุดของ branch: "Pages will deploy to `abc123.<project>.pages.dev` and alias `development.<project>.pages.dev` to it." และ "Branch name aliases are lowercased and non-alphanumeric characters are replaced with a hyphen"
- ผูก custom domain กับ branch ได้ เมื่อใช้ DNS ของ Cloudflare แบบ proxied เท่านั้น: "If you attempt to follow this guide using an external DNS provider or an unproxied DNS record, your custom alias will be sent to the production branch of your Pages project."
- Preview มี header `X-Robots-Tag: noindex` โดยค่าตั้งต้น
- จำนวน preview ไม่จำกัด [B37] ลบได้ด้วย `wrangler pages deployment delete` แต่ "The latest deployment for a branch cannot be deleted."

**การกันการเข้าถึง preview** [B35]

- "By default, these deployment URLs are public."
- เปิด Cloudflare Access ได้ที่ Settings > General > Enable access policy: "Enabling the access policy will restrict viewing project deployments to your Cloudflare account."
- ขอบเขต: "this will only protect your preview deployments (for example, `373f31e2.user-example.pages.dev` and every other randomly generated preview link) and not your `*.pages.dev` domain or custom domain." การกัน `*.pages.dev` และ custom domain ต้องทำขั้นตอนเพิ่มตามหน้า Known issues

**ตัวแปรแยกตาม environment** [B36]

- "Set your environment variables directly within the Cloudflare dashboard for both your production and preview environments at runtime and build-time."
- ตัวแปรธรรมดา "is stored as plain text" ส่วน secret "You cannot see secrets after you set them" และต้องตั้ง "before a deployment that uses those secrets"
- มีสอง environment เท่านั้น: "Unlike Workers Environments, `production` and `preview` are the only two options available via `[env.<ENVIRONMENT>]`." และค่าของ preview ใช้กับทุก branch: "This will set the configuration for all preview deployments, not just the deployments from a specific branch. Pages does not currently support branch-based configuration."
- ตัวแปรที่ระบบใส่ให้ตอน build รวม `CF_PAGES_BRANCH` ("Customizing build based on branch") และ `CF_PAGES_URL`

**สองโปรเจกต์จาก repository เดียว** [B37]

- "You can create multiple projects using the same repository ... All project names must be unique even if connected to the same repository."
- "You can configure a maximum of 5 Pages projects per repository."
- ทุก push build ทุกโปรเจกต์ที่ผูกอยู่ เว้นแต่ตั้ง branch control หรือ build watch paths: "each Git push will issue a new build and deployment for all connected projects unless specified in your build configuration."
- ข้อจำกัดของแผน Free: build ได้ 500 ครั้งต่อเดือน ครั้งละ "1 build at a time" ("Concurrent builds are counted per account."), โปรเจกต์ไม่เกิน 100 โปรเจกต์ต่อบัญชี และ custom domain 100 ชื่อต่อโปรเจกต์
- โปรเจกต์ที่ผูก Git เปลี่ยนเป็น Direct Upload ไม่ได้ และกลับกัน: "If you deploy using the Git integration, you cannot switch to Direct Upload later." [B39]

**Rollback** [B38]

- "Rollbacks allow you to instantly revert your project to a previous production deployment."
- "Any production deployment that has been successfully built is a valid rollback target. ... Note that preview deployments are not valid rollback targets."
- ทำที่ Deployments > เมนูของ deployment > "Rollback to this deployment"

### 6.4 Google Identity Services และ OAuth ของ Google Cloud

**สิ่งที่ `docs/adr/0003` และ `docs/spec.md` ข้อ 2 ครอบคลุมแล้ว** สองเอกสารระบุว่าระบบขอ ID token ตรวจ `aud` กับ client ID ที่ตั้งไว้ ขอเฉพาะตัวตนและอีเมล และ "PO ต้องสร้าง OAuth client ใน Google Cloud หนึ่งครั้ง" ไม่มีข้อความเรื่อง publishing status ของ consent screen, authorised JavaScript origins, จำนวน OAuth client หรือโปรเจกต์ของ Google Cloud ต่อชุด และการลบ client ที่ไม่ถูกใช้ หัวข้อนี้จึงเป็นเรื่องใหม่ทั้งหมด

**Authorised JavaScript origins** [B30], [B32]

- "Applications that use client-side JavaScript to access Google APIs must specify authorized JavaScript origins. The origins identify the domains from which your application can send API requests." ช่องนี้รับได้หลายค่า (คู่มือใช้พหูพจน์และให้เพิ่ม `http://localhost` กับ `http://localhost:<port_number>` คู่กับที่อยู่จริง [B32]) จำนวนสูงสุดไม่ระบุในหน้าที่อ่าน: **Not Verified** (ข้อ 8)
- กฎที่เกี่ยวข้อง: ต้องเป็น HTTPS ยกเว้น localhost, ห้าม wildcard ("Wildcard characters ('*')"), ห้ามมี path และ "If you send a request to a Google OAuth 2.0 endpoint from an unregistered JavaScript origin, you will receive an `origin_mismatch` error."
- การแก้ค่าไม่มีผลทันที: "It may take 5 minutes to a few hours for changes made to these settings to take effect"

**นโยบายแยกโปรเจกต์ทดสอบกับใช้งานจริง** [B33], [B31]

- "Google's OAuth policies require separate projects for testing and production."
- "Google OAuth clients used in production must not contain test environments, redirect URIs, or JavaScript origins available to only you or your development team." ตัวอย่างที่ให้: "The test servers of individual developers" และ "Test or pre-release versions of your app"
- "Please create separate projects for development/testing/staging and production as per the Google OAuth policy. Your “production” tier project should have a published status of “In Production”." [B31]
- คู่มือของ Sign In With Google ระบุสอดคล้องกัน: "When creating production applications, multiple projects may be necessary" [B32]

**Publishing status ของแอปแบบ External** [B29]

- Testing: "Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen." ผู้ใช้ทดสอบเห็นคำเตือน และ "Authorizations by a test user will expire seven days from the time of consent."
- ข้อยกเว้นสำหรับ scope ที่ระบบนี้ใช้: "The only exception to this behavior is if your app requests a subset of the following: name, email address, and user profile (through the `userinfo.email, userinfo.profile, openid` scopes or their OpenID Connect equivalents). For such requests, your users do not need to be in the trusted user list, they will not see a warning message, and their authorizations will not expire after 7 days. If your app uses Sign in with Google to authenticate users then this exception also applies. If your app requests any other OAuth scopes, then this exception does not apply."
- In production: "Projects configured with a publishing status of In production are available to any user with a Google Account. ... Your project's configuration may be subject to verification before its name and logo are displayed on an authorization screen or before it may request authorization of sensitive or restricted scopes."

**การ verify** [B31], [B32]

- "If your app utilizes only non-sensitive scopes, it is not mandatory for your app to complete the app verification process. However, if you want your app to display an app name and logo on the OAuth consent screen, you will need to complete a lighter-weight verification process known as \"brand-verification\"."
- "For the authentication, default scope (email, profile, openid) is sufficient, you don't need to add any sensitive scopes." [B32]
- Brand verification ต้องมีหน้าแรกบนโดเมนที่พิสูจน์ความเป็นเจ้าของแล้ว ("The homepage must be hosted on a verified domain you own", "Your homepage can not be only a login page") และมีลิงก์นโยบายความเป็นส่วนตัวบนโดเมนเดียวกัน
- เพดานผู้ใช้ 100 คนใช้กับแอปที่แสดงหน้าจอ unverified: "The user cap limits the number of users that can grant permission to your app when requesting unapproved sensitive or restricted scopes." [B29] หน้า When is verification not needed เขียนกว้างกว่า: "Your app will be subject to the unverified app screen and the 100-user cap will be in effect when an app is in development/testing/staging." [B31] สองข้อความนี้ไม่ตรงกันสำหรับแอปที่ขอเฉพาะ `openid email profile` ในสถานะ Testing
- "If you add any new redirect URLs or JavaScript origins, or if you change your product name after verification, you have to go through verification again." [B31]

**OAuth client ที่ไม่ถูกใช้ถูกลบเอง** [B30]

- "OAuth 2.0 clients that have been inactive for six months are automatically deleted."
- ถือว่าไม่ถูกใช้เมื่อใน 6 เดือนไม่มีทั้งสองอย่าง: "The client has not been used for any credential or token request via the Google OAuth2.0 endpoint." และ "The client's settings have not been modified programmatically or manually within the Google Cloud Console."
- "You will receive an email notification 30 days before an inactive client is scheduled for deletion." หลังลบ "It can no longer be used for Sign in with Google" และ "Deleted clients are typically recoverable at least 30 days following deletion."

## 7. คำถามที่ 6: กลไกสำหรับนำชุดสำรองกลับมาใช้

หัวข้อนี้บันทึกเฉพาะกลไกและข้อจำกัดที่มีเอกสาร ไม่เลือกวิธี

### 7.1 (ก) ให้สคริปต์ชี้ไฟล์อื่นด้วย ID ใน Script Properties

- `SpreadsheetApp.openById(id)`: "Opens the spreadsheet with the given ID." ต้องมี scope `https://www.googleapis.com/auth/spreadsheets` [B11] หน้านั้นไม่ระบุผลเมื่อบัญชีที่สคริปต์รันในนามไม่มีสิทธิ์ในไฟล์ ส่วน `DriveApp.getFileById(id)` ระบุว่า "Throws a scripting exception if the file does not exist or the user does not have permission to access it." [B10]
- สำเนาทุกชุดเป็นไฟล์ใหม่ที่มี ID ของตัวเอง ("the item has a single, constant link based on its `fileId`" [B13]) การชี้ไปที่สำเนาจึงเปลี่ยน ID ของฐานข้อมูลที่ระบบใช้ และ URL ของไฟล์ที่ PO เปิดดู
- Script Properties แก้ได้สองทาง: ในหน้า Project Settings ("Manually add up to fifty custom properties") หรือด้วย `Properties.setProperty(key, value)` [B7] ข้อจำกัด: "Properties value size" คือ "9 KB / val" และ "Properties read/write" คือ "50,000 / day" [P16]
- การแก้ Script Properties ไม่ต้องสร้าง version หรือแก้ deployment เพราะ properties ไม่ใช่โค้ด (การตีความจากคำจำกัดความของ version ว่า "A static snapshot of your script project's code" [B4]) เอกสารไม่ระบุว่าการทำงานที่กำลังรันอยู่เห็นค่าใหม่เมื่อใด
- ค่าที่ค้างใน `CacheService` มีอายุได้ถึง 6 ชั่วโมง [P15] และไม่ผูกกับ ID ของไฟล์ เว้นแต่โค้ดตั้ง key ให้ผูกเอง (การตีความ)
- Trigger สำรองข้อมูลและการตรวจการแชร์ที่อ่าน ID เดียวกันจาก Script Properties จะย้ายตามไปที่ไฟล์ใหม่ ไฟล์เดิมยังอยู่ที่เดิมจนกว่าจะมีผู้ย้ายหรือลบ (การตีความ)

### 7.2 (ข) คัดลอกเนื้อหาของแท็บกลับเข้าไฟล์เดิม

- `Sheet.copyTo(spreadsheet)`: "Copies the sheet to a given spreadsheet, which can be the same spreadsheet as the source. The copied sheet is named \"Copy of [original name]\"." [B11] แท็บที่ได้จึงมีชื่อใหม่ ต้องลบแท็บเดิมด้วย `Spreadsheet.deleteSheet(sheet)` และเปลี่ยนชื่อด้วย `Sheet.setName(name)` ซึ่งมีอยู่ในตารางเมทอด [B11] เอกสารของ `copyTo` ไม่ระบุว่ารูปแบบเซลล์และการป้องกันช่วงถูกคัดลอกหรือไม่
- `Range.setValues(values)`: "Sets a rectangular grid of values (must match dimensions of this range). If a value begins with `=`, it's interpreted as a formula." [B11] ข้อหลังเกี่ยวกับหลักการข้อ 13 ของ `docs/schema.md` ที่กำหนดว่าค่าที่ขึ้นต้นด้วย `=`, `+`, `-` หรือ `@` ต้องไม่ถูกตีความเป็นสูตร
- `Range.copyTo(destination)`: "Copies the data from a range of cells to another range of cells. Both the values and formatting are copied." เอกสารไม่ระบุว่าปลายทางอยู่คนละไฟล์ได้หรือไม่ [B11]
- `Range.clearContent()`: "Clears the content of the range, leaving the formatting intact." [B11]
- ข้อจำกัดที่มีเอกสาร: การทำงานหนึ่งครั้งไม่เกิน 6 นาที [P16] และไฟล์ไม่เกิน 20 ล้านเซลล์ [B17] เอกสารไม่ระบุจำนวนเซลล์สูงสุดต่อการเรียก `setValues` หนึ่งครั้ง: **Not Verified** (ข้อ 8)
- วิธีนี้คง ID ของไฟล์เดิม Script Properties จึงไม่ต้องแก้ และการเขียนทับถูกบันทึกในประวัติเวอร์ชันของไฟล์เดิม (การตีความ)
- Google Sheets ไม่มี transaction (`docs/schema.md` หลักการข้อ 10) การเขียนกลับหลายแท็บที่หยุดกลางทางจึงทิ้งไฟล์ไว้ในสภาพที่แท็บไม่ตรงกัน (การตีความ)

### 7.3 (ค) กู้คืนเวอร์ชันในหน้าจอของ Sheets [B20]

- เปิดประวัติเวอร์ชัน เลือกเวอร์ชัน แล้วกด "Restore this version" ผู้ทำต้องมีสิทธิ์แก้ไข
- กู้คืนทั้งไฟล์ หน้าช่วยเหลือไม่มีขั้นตอนกู้คืนรายแท็บ
- "When you restore an earlier version of a spreadsheet, it clears the cell-by-cell edit history for any changes made before the restore."
- ทางเลือกในหน้าเดียวกันคือ "Make a copy" ของเวอร์ชันนั้น ซึ่งได้ไฟล์ใหม่ (ID ใหม่) และไม่แตะไฟล์เดิม จากนั้นใช้กลไก (ก) หรือ (ข) ต่อ
- วิธีนี้คง ID ของไฟล์เดิม ทำได้เฉพาะในหน้าจอ และใช้ได้กับเวอร์ชันที่ยังอยู่ในประวัติเท่านั้น ซึ่งระยะเวลาเก็บไม่มีเอกสารรับรอง (ข้อ 3.1)
- การกู้ไฟล์จากถังขยะด้วย "Restore" (ข้อ 3.2) เป็นอีกกลไกหนึ่งของหน้าจอ ใช้กับชุดสำรองที่ถูกย้ายลงถังขยะไม่เกิน 30 วัน

## 8. สิ่งที่ไม่พบหรือยังไม่ยืนยัน

ช่วงที่อ้างในคอลัมน์ขวาคือช่วงของ [`docs/roadmap.md`](../roadmap.md) การวัดทุกข้อทำกับข้อมูลสมมติ

| เรื่อง | ผล | สิ่งที่ค้นแล้ว และการวัดที่จะยืนยัน |
|---|---|---|
| Apps Script ปิด trigger เองหลังล้มเหลวซ้ำหรือไม่ และผู้รับของอีเมลแจ้งความล้มเหลว | **Not Verified** เอกสารไม่กล่าวถึง | ค้นคำ "disabled", "deactivat" ใน [B1], [B3] ช่วงที่ 6: ให้ฟังก์ชันสำรองโยน exception โดยตั้งใจหลายรอบบนชุดทดสอบ แล้วดูหน้า Triggers หน้า Executions และกล่องอีเมลของบัญชีเจ้าของ |
| Trigger ตามเวลารันโค้ด head หรือโค้ดของ version ที่ deploy และยังอยู่หรือไม่หลัง `clasp push` กับการแก้ deployment | **Not Verified** เอกสารไม่กล่าวถึง | [B1], [B2], [B3], [B4], [B6] ช่วงที่ 0: สร้าง trigger ที่เขียนค่าคงที่จากโค้ดลง log แล้ว push โค้ดที่เปลี่ยนค่านั้นโดยไม่สร้าง version จากนั้นแก้ deployment แล้วดูว่า trigger ยังอยู่และ log แสดงค่าใด |
| การคัดลอกไฟล์ด้วย `makeCopy` หรือ `files.copy` นำสิทธิ์ที่ให้ไว้โดยตรงกับไฟล์ต้นทางไปด้วยหรือไม่ | **Not Verified** เอกสารระบุเฉพาะการสืบทอดจากโฟลเดอร์ปลายทาง | [B10], [B12], [B13] ช่วงที่ 6: แชร์ไฟล์สมมติให้บัญชีที่สองโดยตรง คัดลอกลงโฟลเดอร์ที่ไม่ได้แชร์ แล้วอ่าน `getEditors()`, `getViewers()` และ `getSharingAccess()` ของสำเนา |
| สิ่งที่การคัดลอกทั้งไฟล์เก็บไว้: ทุกแท็บ รูปแบบ plain text การป้องกันช่วง แถวที่ตรึง | **Not Verified** พบเพียงว่าแท็บที่ซ่อนถูกคัดลอก [B23] | [B10], [B11], [B12], [B23] ช่วงที่ 6: ในการทดลองกู้คืน เทียบจำนวนแท็บ ชื่อคอลัมน์ จำนวนแถว และค่าที่เสี่ยงถูกแปลง เช่น `12/3` กับรหัสที่ขึ้นต้นด้วยศูนย์ ระหว่างต้นทางกับสำเนา |
| Apps Script project ของระบบเป็น standalone หรือผูกกับไฟล์ฐานข้อมูล | ไม่อยู่ในเอกสารของโครงการ | `docs/adr/0001`, `docs/schema.md` ข้อ 8 ช่วงที่ 0: เปิดไฟล์ฐานข้อมูลแล้วดูเมนู Extensions > Apps Script หรือดูว่าโปรเจกต์ปรากฏเป็นไฟล์ใน Drive หรือไม่ |
| Script Properties, trigger และ deployment ตามไปกับสำเนาของไฟล์ที่มีสคริปต์ผูกอยู่ หรือกับสำเนาของโปรเจกต์ standalone หรือไม่ และมีคำสั่งคัดลอกโปรเจกต์ standalone หรือไม่ | **Not Verified** เอกสารไม่กล่าวถึง | [B4], [B5], [B6], [B7], [B8] ช่วงที่ 6 ขั้นแยกชุด: หลังสร้างชุดทดสอบ เปิด Project Settings, Triggers และ Manage deployments ของโปรเจกต์ใหม่ แล้วบันทึกสิ่งที่พบ |
| การคัดลอกไฟล์นับในโควตา "Spreadsheets created" ("250 / day") หรือไม่ | เอกสารไม่ระบุ | [P16] ไม่กระทบรอบสัปดาห์ละครั้ง |
| `Spreadsheet.copy(name)` วางสำเนาไว้ที่ใด | เอกสารไม่ระบุ | [B11] ช่วงที่ 6: เรียกครั้งเดียวบนชุดทดสอบแล้วดู `getParents()` ของสำเนา |
| ขนาดที่ไฟล์ Sheets นับในพื้นที่ 15 GB และค่าที่ `File.getSize()` คืน | **Not Verified** เอกสารสองแหล่งขัดกัน [B10], [B19] | ช่วงที่ 6: อ่าน `DriveApp.getStorageUsed()` ก่อนและหลังคัดลอกไฟล์ฐานข้อมูลสมมติหนึ่งครั้ง และดูหน้า Storage ของ Drive หลังรอให้ค่าปรับ (เอกสารระบุว่าอาจใช้ 48–72 ชั่วโมง) |
| Exception ที่ Apps Script ได้เมื่อพื้นที่เต็มขณะคัดลอกไฟล์ อัปโหลดรูป หรือเขียน Sheet | **Not Verified** เอกสารของ Apps Script ไม่กล่าวถึง | [B10], [P16], [B19] วัดได้ยากโดยไม่ทำให้บัญชีเต็มจริง ยืนยันทางอ้อมได้ด้วยการให้โค้ดจับ exception ของ `makeCopy` แล้วบันทึกข้อความ |
| ระยะเวลาที่ Google เก็บเวอร์ชันของไฟล์ Sheets และเวอร์ชันที่ตั้งชื่อถูกเก็บนานกว่าหรือไม่ | **Not Verified** ไม่พบในเอกสาร | [B20], [B16] เอกสารระบุเพียงว่าเวอร์ชัน "may occasionally be merged" และการตั้งชื่อกันการรวม ยืนยันด้วยการวัดไม่ได้ในเวลาของโครงการ |
| การเขียนของสคริปต์ปรากฏในประวัติเวอร์ชันอย่างไร และสคริปต์ตั้งชื่อเวอร์ชันได้หรือไม่ | **Not Verified** ไม่พบเมทอดใน [B10], [B11] | ช่วงที่ 0: หลังเขียนข้อมูลสมมติผ่าน API เปิดประวัติเวอร์ชันของไฟล์แล้วดูว่าแบ่งเวอร์ชันถี่เพียงใดและแสดงชื่อผู้แก้ว่าใคร ไม่ได้อ่าน reference ของ Drive API `revisions` และ Sheets API |
| ขั้นตอนและเงื่อนไขของการขอให้ Google กู้ไฟล์ที่ลบถาวรแล้ว | **Not Verified** ไม่ได้อ่าน | [B18] แสดงส่วนนี้เฉพาะผู้ล็อกอิน PO เปิดหน้านั้นขณะล็อกอินแล้วอ่านได้ |
| Takeout เลือกส่งออกเฉพาะโฟลเดอร์ของ Drive ได้หรือไม่ และส่งออกไฟล์ Sheets เป็นรูปแบบใด | **Not Verified** หน้าช่วยเหลือไม่ระบุ | [B28] ช่วงที่ 6: PO เปิดหน้า Takeout เลือก Drive แล้วดูตัวเลือก โดยไม่ต้องกดสร้างไฟล์ส่งออก |
| การทำงานของ trigger และ web app ในนามบัญชี นับเป็นการใช้งานตามนโยบายบัญชีที่ไม่มีการใช้งานหรือไม่ | **Not Verified** นโยบายไม่ระบุ | [B24] วัดไม่ได้ รายการในนโยบายเป็นการกระทำของผู้ใช้ขณะล็อกอิน |
| เมื่อเจ้าของของ Apps Script project เปลี่ยนระหว่างบัญชี gmail.com สองบัญชี web app แบบ Execute as me รันในนามใคร และ URL เดิมยังใช้ได้หรือไม่ | **Not Verified** เอกสารกล่าวถึงเฉพาะกรณีข้ามโดเมนและกรณีผู้ดูแลลบบัญชี | [B4], [P17], [B6] วัดได้บนชุดทดสอบด้วยบัญชีที่สอง แต่เป็นการเปลี่ยนที่ย้อนกลับต้องให้อีกฝ่ายกดรับ |
| เมื่อ Editor ที่ไม่ใช่เจ้าของสร้าง deployment แบบ Execute as me ในโปรเจกต์ที่อยู่ใน My Drive สคริปต์รันในนามเจ้าของหรือผู้ deploy | **Not Verified** เอกสารระบุชัดเฉพาะกรณี shared drive | [P17] ("causes the web app to execute under the authority of the user that deployed it (since there is no script owner)") |
| `getSharingAccess()`, `getEditors()` และ `getViewers()` ของไฟล์รายงานสิทธิ์ที่สืบทอดจากโฟลเดอร์หรือไม่ | **Not Verified** เอกสารไม่กล่าวถึง | [B10] ช่วงที่ 0 หรือ 6: แชร์โฟลเดอร์สมมติให้บัญชีที่สองเป็น Viewer แล้วอ่านสามเมทอดนี้จากไฟล์ข้างใน ทำซ้ำกับการแชร์โฟลเดอร์แบบ "Anyone with the link" |
| ฟิลด์ `permissionDetails` ของ Drive API มีค่าสำหรับไฟล์ใน My Drive หรือไม่ | ไม่ได้อ่าน | ไม่ได้เปิดหน้า reference ของ `permissions` resource คู่มือ [B13] อธิบายฟิลด์นี้ในบริบทของ shared drive |
| เมทอดของ `DriveApp` สำหรับอ่านหรือตั้งค่า limited access ของโฟลเดอร์ | ไม่พบใน [B10] | ค้นคำ "limited" ในหน้า Class Folder |
| จำนวน deployment สูงสุดต่อ Apps Script project | เอกสารไม่ระบุ | [B4], [P16] |
| จำนวน authorised JavaScript origins สูงสุดต่อ OAuth client | เอกสารไม่ระบุ | [B30], [B32] |
| เพดานผู้ใช้ 100 คนใช้กับแอปสถานะ Testing ที่ขอเฉพาะ `openid email profile` หรือไม่ | **Not Verified** สองหน้าของ Google เขียนไม่ตรงกัน [B29], [B31] | ระบบมีผู้ใช้ไม่เกิน 50 บัญชีตาม `docs/schema.md` ข้อ 7 จึงต่ำกว่าเพดานในทั้งสองการตีความ ยืนยันได้ที่หน้า Audience ของ Google Cloud Console ซึ่งแสดงจำนวนผู้ใช้ที่นับ |
| หน้าจอที่ผู้ใช้เห็นเมื่อแอปอยู่ในสถานะ In production โดยยังไม่ทำ brand verification | **Not Verified** เอกสารระบุเพียงว่าชื่อและโลโก้ "may be subject to verification" | [B29], [B31] ช่วงที่ 1: ล็อกอินด้วยบัญชีที่ไม่ใช่เจ้าของโปรเจกต์แล้วบันทึกภาพหน้าจอ |
| ตัวแปรของ Cloudflare Pages ที่ตั้งใน dashboard ถูกส่งให้คำสั่ง build ของ Vite อย่างไร และการ rollback ใช้ค่าตัวแปรของ build เดิมหรือไม่ | ไม่ได้อ่านเอกสารของ Vite [B36] ระบุเพียงว่าตัวแปรใช้ได้ "at runtime and build-time" | ช่วงที่ 0: build หนึ่งครั้งแล้วดูค่าที่ฝังในไฟล์ผลลัพธ์ |
| ค่าใช้จ่ายและจำนวนผู้ใช้ของ Cloudflare Access ในแผน Free | ไม่ได้อ่าน | อยู่นอกหน้าของ Pages ที่อ่าน |
| คู่มือ GitHub integration ของ Pages (สิทธิ์ของ GitHub App ต่อ repository) และหน้า build watch paths | ไม่ได้อ่าน | อ้างถึงใน [B37], [B39] |
| โควตาของ Drive API ต่อโปรเจกต์ | อ่านแล้วแต่ไม่ใช้ | หน้า Usage limits ("Last updated 2026-10-30 UTC") ระบุโควตาเป็น quota units ต่อนาที ซึ่งสูงกว่าการคัดลอกสัปดาห์ละครั้งหลายลำดับขนาด และเกี่ยวเฉพาะเมื่อเรียก Drive API โดยตรงแทน `DriveApp` |

## 9. ข้อสังเกตต่อการออกแบบ

รายการต่อไปนี้เป็นข้อสังเกตจากแหล่งข้อมูล ไม่ใช่การตัดสินใจ ข้อที่ขึ้นต้นด้วย "การตีความ" เป็นข้อสรุปของผู้ค้นคว้า ไม่ใช่ข้อความจากแหล่งข้อมูล

1. Trigger รายสัปดาห์กำหนดได้ถึงระดับวันและชั่วโมง นาทีที่ทำงานคลาดได้ภายในชั่วโมงนั้น [B1], [B2] เขตเวลาตั้งต้นเป็นของโปรเจกต์ และระบุ `Asia/Bangkok` ที่ตัว trigger ได้ด้วย `inTimezone` ซึ่งเกี่ยวกับหลักการข้อ 12 ของ `docs/schema.md` Dashboard สาธารณะมีรอบคำนวณรายสัปดาห์อยู่แล้ว (`docs/schema.md` ข้อ 7) ถ้ารอบนั้นใช้ trigger ทั้งสองงานนับในข้อจำกัด 20 trigger ต่อผู้ใช้ต่อสคริปต์ และ 90 นาทีต่อวันร่วมกัน [P16]
2. Trigger เป็นของบัญชีที่สร้าง ไม่ใช่ของโปรเจกต์ [B1], [B6] การตีความ: ชุดทดสอบที่สร้างจากการคัดลอกไม่มี trigger จนกว่าจะมีผู้สร้าง และ trigger ที่สร้างด้วยมือในหน้าจอไม่อยู่ใน repository คู่มือของ Google แนะนำให้สร้างด้วยโค้ดเมื่อต้องการให้เหมือนกันทุกที่ [B6]
3. ความล้มเหลวของ trigger ไม่ปรากฏบนหน้าจอของระบบ ช่องทางเดียวที่มีเอกสารคืออีเมลสรุปและหน้า Executions [B1] การตีความ: การรู้ว่าชุดสำรองล่าสุดสำเร็จเมื่อใดจากหน้าจอของระบบเอง ต้องมีค่าที่ฟังก์ชันสำรองเขียนไว้ เช่น ใน `settings` ซึ่งเป็นการแตะ `docs/schema.md`
4. การเพิ่ม `DriveApp` เข้าโค้ดเพิ่ม scope `https://www.googleapis.com/auth/drive` ซึ่ง `makeCopy` และ `setTrashed` ต้องใช้ [B10] และโค้ดที่เพิ่มบริการใหม่ต้องให้เจ้าของอนุญาตซ้ำ trigger ที่รันก่อนอนุญาตล้มเหลวทันที [B3] ฟีเจอร์รูปถ่ายของช่วงที่ 3 ใช้ Drive อยู่แล้ว ลำดับของการอนุญาตจึงขึ้นกับว่าช่วงใดเพิ่ม Drive ก่อน
5. การตีความ: เมื่อเก็บ 8 ชุดและย้ายชุดที่เกินลงถังขยะสัปดาห์ละชุด ถังขยะมีชุดสำรองค้างอยู่ 4–5 ชุดตลอดเวลา เพราะถังขยะล้างเมื่อครบ 30 วัน [B18] ชุดที่ค้างยังนับพื้นที่ และผู้ที่ได้รับแชร์โฟลเดอร์ยังเปิดได้ [B15], [B18] จำนวนสำเนาที่มีอยู่จริงจึงเป็น 12–13 ชุด ไม่ใช่ 8 การลบถาวรทันทีทำได้ด้วย Drive API เท่านั้น [B12] และการลบถาวรเข้าข่าย "ลบหรือล้างข้อมูลใน Drive" ซึ่ง ADR-0008 กำหนดให้ PO อนุมัติทุกครั้ง การย้ายลงถังขยะโดย trigger อัตโนมัติก็เป็นการลบที่ไม่มีการอนุมัติรายครั้งเช่นกัน
6. สำเนาในโฟลเดอร์ของระบบได้สิทธิ์ของโฟลเดอร์นั้น [B12], [B13] การตีความ: เมื่อ PO แชร์โฟลเดอร์ของระบบให้บัญชี Google สำรองตามข้อ 7 ของช่วงที่ 6 บัญชีนั้นเห็นไฟล์ฐานข้อมูล รูปถ่าย และชุดสำรองทุกชุดในโฟลเดอร์ ในระดับสิทธิ์เดียวกัน และลดสิทธิ์รายไฟล์ไม่ได้ [B22] การตรวจการแชร์ตาม `docs/spec.md` ข้อ 8 จึงต้องแยกบัญชีสำรองที่ตั้งใจแชร์ออกจากการแชร์ที่ไม่ตั้งใจ ซึ่งหมายถึงต้องมีที่เก็บว่าบัญชีใดเป็นบัญชีสำรอง
7. `getEditors()` และ `getViewers()` คืนรายการเมื่อผู้รันมีสิทธิ์แก้ไข ซึ่งเจ้าของมี [B10] `getSharingAccess()` แยกการแชร์ด้วยลิงก์ (`ANYONE`, `ANYONE_WITH_LINK`) ออกจาก `PRIVATE` ได้ แต่เอกสารไม่ยืนยันว่าเมทอดของไฟล์สะท้อนการแชร์ที่โฟลเดอร์แม่ (ข้อ 8) การตีความ: จนกว่าจะวัด การตรวจที่เชื่อได้ต้องอ่านทั้งไฟล์ฐานข้อมูล โฟลเดอร์รูปถ่าย และโฟลเดอร์แม่ทุกชั้นที่ระบบรู้จัก
8. ชุดสำรองที่อยู่ในบัญชีเดียวกับระบบไม่ครอบคลุมความเสี่ยงที่ ADR-0001 บันทึกไว้ คือการเข้าบัญชีไม่ได้ (ตารางข้อ 3.4) กลไกที่มีเอกสารสำหรับให้ข้อมูลรอดจากการเสียบัญชีมีสามอย่าง: บัญชีที่สองที่ได้รับแชร์และคัดลอกไฟล์ไปเป็นของตัวเอง [B19], [B22] การโอนความเป็นเจ้าของรายไฟล์ซึ่งผู้รับต้องกดรับ [B14], [B21] และ Takeout ที่ตั้งเวลาได้ถี่สุดทุก 2 เดือน [B28] ทั้งสามอย่างไม่ทำงานเองจาก trigger ของบัญชีเจ้าของ
9. บัญชี Google สำรองมีข้อจำกัดของตัวเอง: บัญชีที่สร้างใหม่ได้ 5 GB จนกว่าจะยืนยันเบอร์โทรศัพท์ [B19] ถูกลบได้เมื่อไม่ใช้ 2 ปี [B24] และสิทธิ์ Viewer ดูประวัติเวอร์ชันไม่ได้ [B20] ส่วนสิทธิ์ Editor แชร์ต่อได้เว้นแต่ปิดตัวเลือก [B22]
10. บัญชีเจ้าของของระบบมีการใช้งานเป็นประจำเมื่อ PO ล็อกอินใช้ Drive หรือ Gmail ซึ่งอยู่ในรายการของนโยบาย [B24] การตีความ: ความเสี่ยงของนโยบาย 2 ปีจึงตกกับบัญชีสำรองที่ไม่มีใครเปิด มากกว่าบัญชีเจ้าของ และเอกสารไม่รับรองว่าการทำงานของสคริปต์อย่างเดียวนับเป็นการใช้งาน
11. พื้นที่เต็มกระทบทั้งระบบ ไม่ใช่เฉพาะการสำรอง: เมื่อเกินโควตา "nobody can edit or copy your affected files" และ Gmail ของบัญชีรับส่งไม่ได้ [B19] ซึ่งรวมอีเมลแจ้ง trigger ล้มเหลวและอีเมลแจ้งเตือนของ Google เอง การตีความ: รูปถ่ายเป็นส่วนที่โตเร็วที่สุดของพื้นที่ 15 GB ที่ใช้ร่วมกับ Gmail และ Photos ส่วนตัวของ PO `DriveApp.getStorageUsed()` กับ `getStorageLimit()` ให้ตัวเลขสำหรับแสดงหรือเตือนได้ [B10]
12. ประวัติเวอร์ชันของ Sheets ไม่มีระยะเวลาเก็บที่ Google รับรอง ถูกรวมได้ และเจ้าของลบได้ [B20] การตีความ: ใช้เป็นทางกู้คืนเสริมสำหรับความผิดพลาดที่พบเร็วได้ แต่ใช้แทนชุดสำรองตามรอบไม่ได้ และเวอร์ชันที่ตั้งชื่อ 15 ชุดต่อไฟล์เป็นงานที่ทำด้วยมือ
13. กลไกกู้คืนสามแบบในข้อ 7 ต่างกันที่ ID ของไฟล์: (ก) เปลี่ยน ID ที่ระบบใช้และทิ้งไฟล์เดิมไว้ให้ตรวจ (ข) และ (ค) คง ID เดิมแต่เขียนทับไฟล์ที่ใช้งานอยู่ `setValues` ตีความค่าที่ขึ้นต้นด้วย `=` เป็นสูตร [B11] ซึ่งกลไก (ข) ต้องจัดการให้ตรงกับหลักการข้อ 13 ของ `docs/schema.md` การตีความ: การทดลองกู้คืนของช่วงที่ 6 พิสูจน์ได้เฉพาะกลไกที่ทดลอง และควรบันทึกเวลาที่ใช้กับจำนวนแถวที่ตรวจ
14. ข้อมูลที่บันทึกหลังชุดสำรองล่าสุดหายเมื่อกู้คืนจากชุดนั้น รอบรายสัปดาห์หมายถึงเสียได้ถึง 7 วัน การตีความ: `timeline` และ `audit_log` อยู่ในไฟล์เดียวกันจึงหายไปด้วย รูปถ่ายใน Drive ไม่ถูกย้อน แถว `attachments` ที่อ้างถึงรูปซึ่งอัปโหลดหลังชุดสำรองจึงหาย ขณะที่ไฟล์รูปยังอยู่
15. URL ของ web app คงเดิมเมื่อแก้ deployment ให้ชี้ version ใหม่ [B4] การตีความ: ค่าที่อยู่ของ API ใน Cloudflare Pages จึงตั้งครั้งเดียวต่อชุด และชุดทดสอบที่เป็น Apps Script project อีกโปรเจกต์หนึ่งมี URL ของตัวเอง ข้อจำกัด 200 version ต่อสคริปต์ [P16] ถึงได้ในโครงการที่ deploy ทุกครั้งที่ merge และ version ลบได้เมื่อไม่มี deployment ที่ใช้งานอยู่ชี้มา [B4]
16. `clasp` รองรับหลายเป้าหมายจากโค้ดชุดเดียวด้วยไฟล์ตั้งค่าหลายไฟล์และตัวเลือก `--project` [B9] ไฟล์ตั้งค่ามี `scriptId` ซึ่งเป็น ID ที่กฎข้อ 5 ของ `CLAUDE.md` ห้ามอยู่ใน repository สาธารณะ และคู่มือของ Google ให้ใส่ `.clasp.json` ใน `.gitignore` [B8] การตีความ: การแยก "Claude Code ทำงานในชุดทดสอบเท่านั้น" ตาม ADR-0008 ทำได้ที่ระดับไฟล์ตั้งค่าและ credential ของ `clasp` (`--user`) คือเครื่องพัฒนาไม่มีไฟล์ตั้งค่าหรือ credential ของชุดใช้งานจริง
17. Cloudflare Pages มีสองทางที่มีเอกสารสำหรับสองชุด ทางแรกคือโปรเจกต์เดียวที่ใช้ production กับ preview ซึ่งตัวแปรแยกกันได้สองชุด แต่ preview ทุก branch ใช้ค่าชุดเดียวกัน [B36] และ URL ของ preview เปิดสาธารณะจนกว่าจะเปิด Access [B35] ทางที่สองคือสองโปรเจกต์จาก repository เดียว แต่ละโปรเจกต์มี production branch ตัวแปร และ `pages.dev` ของตัวเอง โดยทุก push build ทั้งสองโปรเจกต์เว้นแต่ตั้ง branch control [B37] การตีความ: ในทางแรก การ merge เข้า production branch คือการ deploy หน้าเว็บขึ้นชุดใช้งานจริงทันที เว้นแต่ปิด "Enable automatic production branch deployments" [B34] ซึ่งเกี่ยวกับข้อกำหนดของ ADR-0008 ว่าทุก Deploy ขึ้นชุดใช้งานจริงต้องขออนุมัติแยก
18. Authorised JavaScript origins ไม่รับ wildcard [B30] การตีความ: ที่อยู่ preview แบบ hash ซึ่งเปลี่ยนทุก deployment จึงล็อกอินด้วย Google ไม่ได้ ที่อยู่ที่คงที่พอจะลงทะเบียนเป็น origin มีสามแบบ คือ `<project>.pages.dev`, alias ของ branch และ custom domain [B35]
19. นโยบาย OAuth ของ Google ให้แยกโปรเจกต์ Google Cloud ของชุดทดสอบกับชุดใช้งานจริง และ client ของชุดใช้งานจริงต้องไม่มี origin ของชุดทดสอบ [B33] ซึ่งต่างจากประโยค "PO ต้องสร้าง OAuth client ใน Google Cloud หนึ่งครั้ง" ใน ADR-0003 การตีความ: สอง client หมายถึงค่า `aud` สองค่า ซึ่งเข้ากับการเก็บ client ID ใน Script Properties แยกชุดอยู่แล้ว (`docs/schema.md` ข้อ 8)
20. สำหรับ scope `openid email profile` สถานะ Testing ไม่กันผู้ใช้ที่อยู่นอกรายชื่อผู้ทดสอบ ไม่แสดงคำเตือน และไม่หมดอายุใน 7 วัน [B29] การตีความ: สถานะ Testing จึงไม่ใช่กลไกจำกัดผู้เข้าชุดทดสอบ ตาราง `users` ของแต่ละชุดเป็นกลไกเดียวที่จำกัด และการเผยแพร่เป็น In production ไม่บังคับให้ verify เมื่อใช้เฉพาะ scope ที่ไม่ sensitive [B31] แต่ชื่อและโลโก้ของแอปบนหน้าจอของ Google ขึ้นกับ brand verification ซึ่งต้องมีโดเมนที่พิสูจน์ความเป็นเจ้าของและหน้านโยบายความเป็นส่วนตัว
21. OAuth client ที่ไม่มีการขอ token และไม่ถูกแก้ค่าเลย 6 เดือนถูกลบเอง โดยแจ้งล่วงหน้า 30 วันทางอีเมล [B30] การตีความ: client ของชุดทดสอบเสี่ยงกว่า client ของชุดใช้งานจริง เพราะช่วงที่ไม่มีงานพัฒนาอาจยาวเกิน 6 เดือน
22. ประโยคใน `docs/roadmap.md` ช่วงที่ 0 และ ADR-0001 ว่าระบบเก่า "กู้คืนได้จากประวัติเวอร์ชันของ Apps Script" ตรงกับเอกสารในความหมายจำกัด: Apps Script ไม่กู้ version เก่าให้อัตโนมัติ ต้องคัดลอกโค้ดจาก version นั้นเอง [B4] และ tag `legacy-v1` ให้โค้ดชุดเดียวกันจาก Git
