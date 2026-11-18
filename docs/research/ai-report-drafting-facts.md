# ข้อเท็จจริงสำหรับฟีเจอร์ร่างรายงานสอบสวนโรคด้วย Gemini: ข้อตกลงเรื่องข้อมูล รุ่นและราคา การเรียกจาก Apps Script การสร้างเอกสาร และกฎหมายเรื่องการส่งข้อมูลผู้ป่วยไปต่างประเทศ

วันที่ค้นคว้า: 18 พฤศจิกายน 2569 (ค.ศ. 2026) เอกสารนี้เป็นผลการค้นคว้า ไม่ใช่ข้อกำหนดของระบบ และไม่ใช่คำแนะนำทางกฎหมาย หัวข้อมาตรฐานของรายงานสอบสวนโรคอยู่นอกขอบเขตของเอกสารนี้ รุ่น ราคา และข้อตกลงของ Google ในเอกสารนี้เป็นของวันที่ค้นคว้า ราคาเปลี่ยนได้โดยมีผล 30 วันหลังประกาศ และรุ่น Preview ถูกเลิกได้โดยแจ้งล่วงหน้าอย่างน้อย 2 สัปดาห์

**สรุป** ข้อตกลง Gemini API ฉบับมีผล 23 มีนาคม 2026 แยกบริการเป็นสองระดับ ระดับฟรี Google ใช้ prompt และคำตอบ "to provide, improve, and develop Google products and services and machine learning technologies" ผู้ตรวจที่เป็นคนอ่านได้ และมีคำสั่งตัวหนาว่า "Do not submit sensitive, confidential, or personal information to the Unpaid Services" ระดับชำระเงิน (โปรเจกต์ที่ผูก billing account) Google ไม่ใช้เนื้อหาปรับปรุงผลิตภัณฑ์และประมวลผลตาม Data Processing Addendum แต่ยังเก็บ prompt และคำตอบ 55 วันเพื่อตรวจการใช้ผิดนโยบาย ซึ่งพนักงานที่ได้รับอนุญาตอ่านเนื้อหาที่ถูกติดธงได้ ข้อมูลอาจอยู่ในประเทศใดก็ได้ที่ Google มีสถานที่ และ Gemini API ไม่มีทางปิด log นี้ เอกสารส่งผู้ที่ต้องการ zero data retention ไปที่ Vertex AI ซึ่งเลือกภูมิภาคได้ แต่ไม่มีภูมิภาคในประเทศไทย ประเทศไทยอยู่ในรายการภูมิภาคที่ใช้ Gemini API ได้ และเอกสารไม่ได้จำกัดชนิดของบัญชี Google สำหรับทั้งสองระดับ รุ่นข้อความปัจจุบันคือ Gemini 4 (Carbon, Argon, Hydrogen), Gemini 3.8 Flash, 3.6 Flash และ 3.5 Flash-Lite รุ่น 2.5 Pro และ 2.5 Flash ถูกส่งต่อไปรุ่นอื่นตั้งแต่ 1 ธันวาคม 2026 หน้า Rate limits ไม่แสดงขีดจำกัดของระดับฟรีเป็นตัวเลขแล้ว ร่างหนึ่งฉบับขนาด input 3,000 และ output 2,500 token มีค่า token $0.007 ถึง $0.023 และ 200 ร่างต่อปี $1.43 ถึง $4.65 ก่อนนับ thinking token ระดับชำระเงินต้องเติมเงินล่วงหน้าขั้นต่ำ $5 ซึ่งหมดอายุใน 12 เดือน Apps Script ของบัญชี gmail.com เรียก Gemini ได้ในคำขอเดียว (6 นาทีต่อการทำงาน, URL Fetch 20,000 ครั้งต่อวัน, ไม่มี streaming) คำตอบที่ถูกบล็อกเป็น HTTP 400 พร้อมรหัสเช่น `safety` หรือ `spii` เอกสารไม่ระบุว่าเนื้อหาเรื่องโรคหรือข้อมูลระบุตัวผู้ป่วยถูกบล็อกหรือไม่ ด้านเอกสาร ทางที่ให้แก้ไขต่อใน Microsoft Word และไม่สร้างไฟล์ที่ server คือให้เบราว์เซอร์สร้างไฟล์ .docx ด้วยไลบรารี `docx` ส่วนทางแม่แบบ Google Docs สร้างไฟล์ที่มีข้อมูลผู้ป่วยใน Drive Microsoft 365 มี TH SarabunPSK เป็น cloud font Google Docs มีแบบอักษรเดียวกันในชื่อ Sarabun และ Windows 11 ไม่มีแบบอักษรตระกูลนี้ติดมา ด้านกฎหมาย คณะกรรมการคุ้มครองข้อมูลส่วนบุคคลออกแนวทางเรื่อง AI ลงราชกิจจานุเบกษาเมื่อ 2 พฤศจิกายน 2569 (ไม่มีสภาพบังคับ) ซึ่งระบุว่า Prompt เป็นข้อมูลส่วนบุคคลได้ อายุ ที่อยู่ และวันที่เข้ารับบริการเป็นตัวระบุทางอ้อม การป้อนข้อมูลให้ผู้ให้บริการ AI อาจเป็นการเปิดเผยและอาจเป็นการส่งหรือโอนไปต่างประเทศตามมาตรา 28 และ 29 เมื่อมีบุคคลอื่นในต่างประเทศเข้าถึงข้อมูลได้ ผู้ให้บริการที่นำ Prompt ไปฝึกโมเดลเป็นผู้ควบคุมข้อมูลอีกรายหนึ่ง และแนะนำให้มีข้อตกลงการประมวลผลข้อมูลที่ห้ามนำข้อมูลไปฝึกโมเดล กับให้หลีกเลี่ยงการส่งข้อมูลส่วนบุคคลทางตรงผ่าน API หากไม่จำเป็น ไม่พบแนวปฏิบัติเรื่อง generative AI ของ สพร. กระทรวงสาธารณสุข หรือกรมควบคุมโรค สิ่งที่ยังไม่ยืนยันที่สำคัญ: เนื้อหาของ Data Processing Addendum ของ Google และการใช้กับบัญชีส่วนบุคคล, log 55 วันทำให้เป็นการส่งหรือโอนไปต่างประเทศหรือไม่, ขีดจำกัดของระดับฟรี, พฤติกรรมของตัวกรองกับข้อมูลผู้ป่วยภาษาไทย, แบบอักษรและรุ่นของ Office บนเครื่องของหน่วยงาน และข้อกำหนดทางการเรื่องแบบอักษรของหนังสือราชการ

## 1. แหล่งข้อมูล

วิธีอ่าน: ทุกแหล่งอ่านเมื่อ 18 พฤศจิกายน 2569 หน้าเอกสารของ Gemini API ดาวน์โหลดฉบับ Markdown ของหน้าเดียวกันด้วย `curl` (เติม `.md` ท้ายที่อยู่ ตามที่ดัชนี `https://aistudio.google.com/llms.txt` ระบุ) แล้วอ่านข้อความเอง หน้าของ Google Cloud และ Apps Script ดาวน์โหลด HTML ด้วย `curl -L` แล้วแปลงเป็นข้อความ เอกสารของไทยที่เป็น PDF ดาวน์โหลดด้วย `curl` แล้วสกัดข้อความด้วย `pdftotext -layout` ไฟล์ที่ชั้นข้อความเสียแปลงเป็นภาพด้วย `pdftoppm` แล้วอ่านจากภาพ การค้นเว็บใช้เพื่อหาที่อยู่ของเอกสารเท่านั้น ข้อความจากผลค้นไม่ได้ใช้เป็นข้อเท็จจริง การค้นคว้านี้อ่านเอกสารอย่างเดียว ไม่ได้เรียก Gemini API ไม่ได้เปิด Google AI Studio ด้วยบัญชีใด และไม่ได้ทดสอบกับสคริปต์หรือไฟล์ใด ข้อความภาษาอังกฤษยกตามต้นฉบับ รหัส A, C, S, W และ N เป็นแหล่งใหม่ของเอกสารนี้ รหัส D และ G ใช้ตาม [`data-retention-governance-facts.md`](data-retention-governance-facts.md) ที่อยู่เดิม `ai.google.dev/gemini-api/...` ถูกส่งต่อ (HTTP 301) ไปที่ `aistudio.google.com/docs/...` ตารางใช้ที่อยู่หลังส่งต่อ ที่อยู่เดิม `cloud.google.com/vertex-ai/generative-ai/docs/...` ถูกส่งต่อไปที่ `docs.cloud.google.com/gemini-enterprise-agent-platform/...` และเอกสารของ Google เรียกบริการที่เดิมชื่อ Vertex AI ว่า "Gemini Enterprise Agent Platform" หรือ "Agent Platform" ("Agent Platform API (formerly the Vertex AI API)" [S4]) เอกสารนี้เขียนว่า Vertex AI ตามคำถาม

### 1.1 Gemini API (Gemini Developer API)

| รหัส | เอกสาร | ผู้ออก | URL | สถานะ |
|---|---|---|---|---|
| A0 | ดัชนีเอกสาร Gemini API & AI Studio Documentation (`llms.txt`) | Google | `https://aistudio.google.com/llms.txt` | ไฟล์ดัชนีปัจจุบัน อ่านส่วนหัวและรายชื่อหน้า |
| A1 | Gemini API Additional Terms of Service | Google | `https://aistudio.google.com/docs/terms` | หัวกระดาษระบุ "Effective March 23, 2026" อ่านทั้งหน้า |
| A2 | Abuse monitoring | Google | `https://aistudio.google.com/docs/usage-policies` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| A3 | Zero data retention in the Gemini Developer API | Google | `https://aistudio.google.com/docs/zdr` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า หน้านี้ไม่อยู่ในดัชนี `llms.txt` แต่เปิดได้ และ [A1] ไม่ได้ลิงก์มา |
| A4 | Data logging and sharing | Google | `https://aistudio.google.com/docs/logs-policy` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| A5 | Available regions for Google AI Studio and Gemini API | Google | `https://aistudio.google.com/docs/available-regions` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| A6 | Models และหน้าของแต่ละรุ่น (`/docs/models/gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`) | Google | `https://aistudio.google.com/docs/models` | หน้าเอกสารปัจจุบัน อ่านหน้ารวมทั้งหน้า หน้าของรุ่นอ่านเฉพาะแถวขีดจำกัด token และความสามารถ |
| A7 | Gemini Developer API pricing | Google | `https://aistudio.google.com/docs/pricing` | หน้าเอกสารปัจจุบัน อ่านแท็บ Standard ของรุ่นข้อความ และหัวข้อ Notes ไม่ได้อ่านรุ่นภาพ เสียง และวิดีโอ |
| A8 | Rate limits | Google | `https://aistudio.google.com/docs/rate-limits` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| A9 | Gemini deprecations | Google | `https://aistudio.google.com/docs/deprecations` | หน้าเอกสารปัจจุบัน อ่านหัวข้อรุ่นข้อความ |
| A10 | Billing | Google | `https://aistudio.google.com/docs/billing` | หน้าเอกสารปัจจุบัน อ่านถึงหัวข้อ FAQ ข้อ "How do Google Cloud credits work with Prepay?" |
| A11 | Project and account verification | Google | `https://aistudio.google.com/docs/verification` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| A12 | Structured outputs | Google | `https://aistudio.google.com/docs/structured-output` | หน้าเอกสารปัจจุบัน อ่านตัวอย่าง REST และหัวข้อ JSON schema support, Best practices, Limitations |
| A13 | Safety settings (ฉบับ Interactions API และฉบับ `?generate-content=true`) | Google | `https://aistudio.google.com/docs/safety-settings` | หน้าเอกสารปัจจุบัน อ่านฉบับ Interactions ทั้งหน้า ฉบับ generateContent เฉพาะค่าเริ่มต้น |
| A14 | API errors | Google | `https://aistudio.google.com/docs/api-errors` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| A15 | Troubleshooting guide | Google | `https://aistudio.google.com/docs/troubleshooting` | หน้าเอกสารปัจจุบัน อ่านถึงหัวข้อ Blocked or non-working API keys |
| A16 | Interactions API (overview) และ API reference `generateContent` | Google | `https://aistudio.google.com/docs/interactions-overview`, `https://aistudio.google.com/api-reference/generate-content/generate-content` | หน้าเอกสารปัจจุบัน อ่านหัวข้อ Data storage and retention และค่าของ `blockReason`, `finishReason` |
| A17 | What's new in Gemini 4 Hydrogen, Thinking, Tokens | Google | `https://aistudio.google.com/docs/whats-new-gemini-4-hydrogen`, `/docs/thinking`, `/docs/tokens` | หน้าเอกสารปัจจุบัน ค้นคำ "default", "thinking_level", "token is" |
| A18 | Gemini Developer API vs. Gemini platform | Google | `https://aistudio.google.com/docs/migrate-to-cloud` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |

### 1.2 Vertex AI บน Google Cloud (ชื่อปัจจุบัน Gemini Enterprise Agent Platform)

| รหัส | เอกสาร | ผู้ออก | URL | สถานะ |
|---|---|---|---|---|
| C1 | Gemini Enterprise Agent Platform and zero data retention | Google Cloud | `https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention` | หน้าเอกสารปัจจุบัน อ่านถึงหัวข้อ Partner models ที่อยู่เดิมของหน้า data governance ของ Vertex AI ส่งต่อมาที่หน้านี้ |
| C2 | Data residency | Google Cloud | `https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency` | หน้าเอกสารปัจจุบัน อ่านหัวข้อ Where your data lives and is processed และตาราง Google models (อ่านเครื่องหมายในตารางจาก HTML) |
| C3 | Gemini Enterprise Agent Platform in express mode overview | Google Cloud | `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/express-mode/overview` | หน้าระบุสถานะ Preview อ่านถึงหัวข้อ What's different in express mode |
| C4 | Create a Cloud Billing account | Google Cloud | `https://docs.cloud.google.com/billing/docs/how-to/create-billing-account` | หน้าเอกสารปัจจุบัน อ่านหัวข้อสิทธิ์ที่ต้องมีและ Account type |

### 1.3 Google Apps Script

| รหัส | เอกสาร | ผู้ออก | URL | สถานะ |
|---|---|---|---|---|
| S1 | Quotas for Google Services | Google | `https://developers.google.com/apps-script/guides/services/quotas` | หน้าเอกสารปัจจุบัน อ่านทั้งหน้า |
| S2 | Class UrlFetchApp | Google | `https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app` | หน้าเอกสารปัจจุบัน อ่านคำอธิบายของคลาส และตารางพารามิเตอร์ของ `fetch` |
| S4 | Vertex AI Service (advanced service) | Google | `https://developers.google.com/apps-script/advanced/vertex-ai` | หน้าเอกสารปัจจุบัน อ่านหัวข้อ Prerequisites และตัวอย่าง Generate text |

### 1.4 การสร้างเอกสาร แบบอักษร และ Microsoft Word

| รหัส | เอกสาร | ผู้ออก | URL | สถานะ |
|---|---|---|---|---|
| W1 | Reference ของ Document service: Class DocumentApp, Class Body (`replaceText`), Class Text (`setFontFamily`) | Google | `https://developers.google.com/apps-script/reference/document/document-app`, `.../document/body`, `.../document/text` | หน้าเอกสารปัจจุบัน อ่านเฉพาะเมทอดที่ระบุและหัวข้อ Authorization |
| W2 | Reference ของ Drive service: Class File (`makeCopy`, `getAs`, `setTrashed`) แหล่งเดียวกับ [B10] ของ [`backup-environment-facts.md`](backup-environment-facts.md) | Google | `https://developers.google.com/apps-script/reference/drive/file` | หน้าเอกสารปัจจุบัน อ่านเฉพาะเมทอดที่ระบุ |
| W3 | Drive API: Method `files.export`, Export MIME types for Google Workspace documents, Download and export files | Google | `https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export`, `.../drive/api/guides/ref-export-formats`, `.../drive/api/guides/manage-downloads` | หน้าเอกสารปัจจุบัน อ่านหน้าแรกและตารางทั้งหมด หน้าที่สามเฉพาะหัวข้อ Export |
| W4 | Google Fonts: ข้อมูลของตระกูล Sarabun และ CSS ของ `fonts.googleapis.com` | Google | `https://fonts.google.com/metadata/fonts/Sarabun`, `https://fonts.googleapis.com/css2?family=Sarabun` | ข้อมูลปัจจุบัน อ่านช่อง description, license, designers และ coverage |
| W5 | README ของโครงการแบบอักษร Sarabun | Cadson Demak (GitHub `cadsondemak/Sarabun`) | `https://raw.githubusercontent.com/cadsondemak/Sarabun/master/README.md` | อ่านย่อหน้าแรก |
| W6 | Windows 11 font list | Microsoft | `https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list` | หน้าเอกสารปัจจุบัน ค้นคำ Thai, Leelawadee, Sarabun และอ่านหัวข้อ Thai Supplemental Fonts |
| W7 | Cloud fonts in Office | Microsoft | `https://support.microsoft.com/en-us/office/fonts/cloud-fonts-in-office` | หน้าระบุ "Last updated: March 12, 2025" อ่านส่วนนำ ตารางความพร้อมใช้ และค้นคำ Sarabun, TH, Angsana, Cordia ในรายการแบบอักษร |
| W8 | Benefits of embedding custom fonts | Microsoft | `https://support.microsoft.com/en-us/office/fonts/benefits-of-embedding-custom-fonts` | หน้าปัจจุบัน อ่านส่วน Windows |
| W9 | Edit a PDF (Word) | Microsoft | `https://support.microsoft.com/en-us/word/training/edit-a-pdf` | หน้าปัจจุบัน อ่านทั้งหน้า |
| W10 | ไลบรารี `docx`: README, `docs/usage/fonts.md`, `packers.md`, `styling-with-js.md`, `patcher.md`, `package.json`, `LICENSE` | Dolan Miu และผู้ร่วมพัฒนา (GitHub `dolanmiu/docx` สาขา `master`) | `https://raw.githubusercontent.com/dolanmiu/docx/master/README.md` และไฟล์ในโฟลเดอร์ `docs/usage/` | `package.json` ระบุรุ่น 9.15.4 สัญญาอนุญาต MIT อ่านไฟล์ที่ระบุ ไม่ได้ทดลองรัน |
| W11 | MDN: `@page` CSS at-rule และ `Window: print()` method | Mozilla (MDN, ไฟล์ต้นฉบับใน GitHub `mdn/content`) | `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page`, `https://developer.mozilla.org/en-US/docs/Web/API/Window/print` | อ่านย่อหน้านำและรายการ descriptor |
| W12 | เอกสาร "การพิมพ์หนังสือราชการด้วยโปรแกรม Microsoft Word" (37 หน้า) | เผยแพร่บนเว็บไซต์สำนักงานสาธารณสุขจังหวัดอุทัยธานี ไม่ระบุผู้จัดทำในหน้าที่อ่าน | `https://uthaihealth.moph.go.th/uthaihealth/uploadfile/318.pdf` | **แหล่งทุติยภูมิ** สกัดข้อความด้วย `pdftotext` อ่านหน้า 1–2 และ 14 |

### 1.5 กฎหมายและแนวทางของไทย

| รหัส | เอกสาร | ผู้ออก | ปี | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|---|
| D4 | พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (รจ. เล่ม 136 ตอนที่ 69 ก, 27 พ.ค. 2562) | รัฐสภา | 2562 | ตาม [`line-message-facts.md`](line-message-facts.md) | สำเนามีหัวกระดาษราชกิจจานุเบกษา ไม่ได้ตรวจฉบับแก้ไขเพิ่มเติม | ดาวน์โหลดซ้ำ สกัดข้อความ อ่านมาตรา 6 และ 26–29 ชั้นข้อความตกสระอำ ข้อความที่ยกมาแก้ตัวสะกดแล้ว |
| G8 | ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 28 พ.ศ. 2566 (รจ. เล่ม 140 ตอนพิเศษ 323 ง, 25 ธ.ค. 2566 หน้า 33–35) | คณะกรรมการคุ้มครองข้อมูลส่วนบุคคล | 2566 | ไฟล์ในหน้า `https://www.pdpc.or.th/2500/` | ตาม `data-retention-governance-facts.md` | ชั้นข้อความเสีย อ่านจากภาพหน้า 34–35 (ข้อ 4–8) |
| N1 | ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง แนวทางการดำเนินการด้านการคุ้มครองข้อมูลส่วนบุคคลเกี่ยวกับการพัฒนาและการใช้งานเทคโนโลยีปัญญาประดิษฐ์ (Artificial Intelligence) พ.ศ. 2569 พร้อมแนวทางแนบท้าย version 1.0 (รจ. เล่ม 143 ตอนพิเศษ 261 ง, 2 พ.ย. 2569 หน้า 24 เป็นต้นไป ไฟล์ 81 หน้า ประกาศ ณ วันที่ 22 ต.ค. 2569) | คณะกรรมการคุ้มครองข้อมูลส่วนบุคคล แนวทางระบุว่าจัดทำโดย สคส. และ สพธอ. | 2569 | `https://ratchakitcha.soc.go.th/documents/136419.pdf` ลิงก์ในหน้า `https://www.pdpc.or.th/29505/` | สำเนาราชกิจจานุเบกษา ออกก่อนวันที่ค้นคว้า 16 วัน | ชั้นข้อความเสีย ใช้คำภาษาอังกฤษที่สกัดได้ทำดัชนีรายหน้า แล้วอ่านจากภาพ 11 หน้า: ตัวประกาศ และหน้า 16, 20, 25, 29, 38, 39, 63, 69, 70, 72 ของแนวทาง (เลขหน้าที่พิมพ์บนหน้ากระดาษ) **อีก 70 หน้าไม่ได้อ่าน** |
| N2 | ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศ ตามมาตรา 29 พ.ศ. 2566 (รจ. เล่ม 140 ตอนพิเศษ 323 ง, 25 ธ.ค. 2566 หน้า 36–42) | เดียวกัน | 2566 | ไฟล์ในหน้า `https://www.pdpc.or.th/2507/` | สำเนาราชกิจจานุเบกษา ใช้บังคับเมื่อพ้น 90 วันนับแต่วันประกาศ ไม่ได้ตรวจว่ามีฉบับแก้ไข | ชั้นข้อความเสีย อ่านจากภาพหน้า 36, 37, 39, 40, 41 (ข้อ 1–5 และ 8–11) ไม่ได้อ่านหน้า 38 และ 42 |
| N3 | แนวทางการประยุกต์ใช้ Generative AI อย่างมีธรรมาภิบาลสำหรับองค์กร (Generative AI Governance Guideline for Organizations) ไฟล์ชื่อ `20241125-Generative-AI-Guideline_V2-0.pdf` 63 หน้า | สำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์ (สพธอ.) โดยศูนย์ธรรมาภิบาลปัญญาประดิษฐ์ (AIGC) | 2567 | ไฟล์ในหน้า `https://www.etda.or.th/th/Useful-Resource/GovernanceGuideline_v1.aspx` | แนวทาง ไม่ใช่กฎ ไม่ทราบว่ามีรุ่นใหม่กว่า | สกัดข้อความ ชั้นข้อความสลับสระ า กับ ำ ข้อความที่ยกมาแก้ตัวสะกดแล้ว อ่านสารบัญ ข้อ 3.1 (4) และภาคผนวกตัวอย่างนโยบาย ข้อ 1–4.2 |
| N4 | นโยบายการใช้ปัญญาประดิษฐ์ ของสำนักงานสถิติแห่งชาติ (9 หน้า) และนโยบายและแนวปฏิบัติการใช้ AI ของกรมการขนส่งทางราง (15 หน้า) | สำนักงานสถิติแห่งชาติ และกรมการขนส่งทางราง | 2569 | `https://www.nso.go.th/nsoweb/downloadFile/contents/7Er/20260514142130_13304.pdf`, `https://www.drt.go.th/wp-content/uploads/2026/06/03_Policy_Guideline_AI_Drt-20-5-69.pdf` | นโยบายภายในของหน่วยงานอื่น ใช้เพื่อดูว่าหน่วยงานของรัฐอ้างแนวทางฉบับใด | สกัดข้อความ ค้นคำ "สพร.", "DGA", "สพธอ.", "มติคณะรัฐมนตรี" และอ่านเอกสารอ้างอิงของฉบับแรก |

แหล่งที่ตั้งใจอ่านแต่เปิดไม่ได้หรือหาไม่พบ อยู่ในข้อ 7

## 2. คำถามที่ 1: ข้อตกลงเรื่องข้อมูลของ Gemini API

### 2.1 บริการที่ไม่เสียค่าใช้จ่าย (Unpaid Services) [A1]

1. นิยาม: "Any Services that are offered free of charge like direct interactions with Google AI Studio or unpaid quota in Gemini API are unpaid Services" [A1 หัวข้อ Unpaid Services]
2. การใช้ข้อมูล: "When you use Unpaid Services, including, for example, Google AI Studio and the unpaid quota on Gemini API, Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies, including Google's enterprise features, products, and services, consistent with our Privacy Policy." [A1 หัวข้อ How Google Uses Your Data ใต้ Unpaid Services]
3. การอ่านโดยคน: "To help with quality and improve our products, human reviewers may read, annotate, and process your API input and output. Google takes steps to protect your privacy as part of this process. This includes disconnecting this data from your Google Account, API key, and Cloud project before reviewers see or annotate it." [A1 หัวข้อเดียวกัน]
4. คำสั่งห้ามส่งข้อมูลอ่อนไหว เป็นตัวหนาในต้นฉบับ: "**Do not submit sensitive, confidential, or personal information to the Unpaid Services.**" [A1 หัวข้อเดียวกัน] หน้าราคายืนยันในแถว "Used to improve our products" ของทุกรุ่นข้อความ: Free Tier "Yes" และ Paid Tier "No" [A7]
5. ระยะเวลาการเก็บของข้อมูลที่ใช้ปรับปรุงผลิตภัณฑ์ในบริการที่ไม่เสียค่าใช้จ่าย: [A1] ไม่ระบุตัวเลข สิ่งที่มีตัวเลขคือ log เพื่อตรวจการใช้ผิดนโยบาย 55 วัน (ข้อ 2.3) และ Interaction ที่เก็บไว้ของ Free Tier 1 วัน (ข้อ 2.4)
6. ข้อยกเว้นตามภูมิภาค: ผู้ใช้ในเขตเศรษฐกิจยุโรป สวิตเซอร์แลนด์ และสหราชอาณาจักรได้เงื่อนไขของบริการแบบชำระเงินแม้ใช้ฟรี [A1 ย่อหน้าสุดท้ายของ Unpaid Services] ประเทศไทยไม่อยู่ในข้อยกเว้นนี้

### 2.2 บริการแบบชำระเงิน (Paid Services) [A1]

1. นิยาม: "Your access to Gemini API is a "Paid Service" only when accessing the API through a Cloud Project associated with an active billing account." [A1 หัวข้อ Paid Services] สถานะจึงผูกกับ Cloud project ที่ออก API key ไม่ผูกกับจำนวนเงินที่ใช้
2. การใช้ข้อมูล: "When you use Paid Services, including, for example, the paid quota of the Gemini API, Google doesn't use your prompts (including associated system instructions, cached content, and files such as images, videos, or documents) or responses to improve our products, and will process your prompts and responses in accordance with the Data Processing Addendum for Products Where Google is a Data Processor." [A1 หัวข้อ How Google Uses Your Data ใต้ Paid Services] ลิงก์ของ Data Processing Addendum คือ `https://business.safety.google/processorterms/` ซึ่งเอกสารนี้ไม่ได้เปิดอ่าน (ข้อ 7)
3. log เพื่อตรวจการใช้ผิดนโยบายยังมีอยู่ในบริการแบบชำระเงิน: "For Paid Services, Google logs prompts and responses for a limited period of time, solely for detecting and preventing violations of the Prohibited Use Policy to maintain the safety and security of the Services, and any required legal or regulatory disclosures. This data may be stored transiently or cached in any country in which Google or its agents maintain facilities." [A1 หัวข้อเดียวกัน]
4. หน้า Billing เรียกผลของการผูก billing account ว่า "ensure your prompts and responses are **not** used to improve Google products" และมีเชิงอรรถ "Enterprise-grade data privacy" ที่ชี้กลับไปที่ [A1] [A10 หัวข้อ About billing and tiers]

### 2.3 การตรวจการใช้ผิดนโยบาย (abuse monitoring) ใช้กับทั้งสองระดับ [A2]

1. ระยะเวลา: "Google retains the following data for fifty-five (55) days for the purposes of detecting and preventing violations of the Prohibited Use Policy ...: Prompts ... Contextual Information ... Output" [A2 หัวข้อ How We Handle Data] หน้า [A2] ระบุขอบเขตว่า "These policy guidelines apply to the use of the Gemini API and AI Studio." โดยไม่แยกระดับฟรีกับชำระเงิน
2. การอ่านโดยคน: "When prompts or model outputs are flagged by safety filters and abuse detection systems described above, authorized Google employees may assess the flagged content ... Data can be accessed for human review only by authorized Google employees via an internal governance assessment and review management platform. When data is logged for abuse monitoring, it is used solely for the purpose of policy enforcement and preventing policy violations. It is not used to train or fine-tune any AI/ML models besides those used specifically for policy enforcement." [A2 หัวข้อ How We Investigate Potential Issues]
3. Gemini Developer API ไม่มีทางปิด log นี้: "If your workload requires guaranteed zero data retention or enterprise data processing agreements, use Vertex AI." [A3 หัวข้อ Customer data retention and achieving zero data retention]

### 2.4 ข้อมูลอื่นที่ถูกเก็บโดยค่าเริ่มต้น [A3, A4, A16]

1. Interactions API ซึ่งเอกสารปัจจุบันกำหนดเป็น API หลัก เก็บคำขอและคำตอบโดยค่าเริ่มต้น: "By default, the API stores all Interaction objects (`store=true`) ... **Paid Tier**: The system retains interactions for **55 days**. **Free Tier**: The system retains interactions for **1 day**. If you don't want this, you can set `store=false` in your request." [A16 หัวข้อ Data storage and retention] และ "To ensure a zero-data footprint, you must explicitly set the `store` parameter to `false` in your API requests" [A3]
2. Logs ใน AI Studio ของโปรเจกต์ที่ผูก billing: "Logging is on by default for Interactions API calls, and for Generate Content API calls in projects created on or after October 26, 2026. As a project owner, you can turn logging on or off at any time from the Logs page in AI Studio." และ "Logs are retained for a default maximum period of 55 days ... The storage retention window for a project can be updated in AI Studio to automatically mark logs for deletion after 7, 14, 28, or 55 days." [A4] log เหล่านี้ "are private to your Google Cloud project" และ "prompts and responses within logs are not used for product improvement or development" เว้นแต่เจ้าของเลือกแบ่งปันเป็น dataset [A4]
3. ถ้าเจ้าของแบ่งปัน dataset หรือเปิด "Contributor Tier" (ส่วนลดสูงสุด 50% ของ Gemini 4 Argon และ Gemini 4 Hydrogen แบบเชิญเท่านั้น) ข้อมูลถูกใช้ตามเงื่อนไขของบริการที่ไม่เสียค่าใช้จ่าย และเอกสารเขียนว่า "do not donate data that is personal, sensitive, or confidential" [A4]
4. แคชในหน่วยความจำ: "By default, Gemini models cache data in-memory to reduce latency and cost for developers. This data is strictly in RAM (not at-rest), isolated at the project level, and has a 24-hour TTL." [A3]
5. Grounding with Google Search และ Google Maps เก็บ prompt และผลลัพธ์ 30 วัน และปิดไม่ได้ [A1, A3] ฟีเจอร์ร่างรายงานไม่จำเป็นต้องใช้สองเครื่องมือนี้

### 2.5 ข้อจำกัดการใช้งานที่เกี่ยวกับงานสาธารณสุข [A1]

1. "You may not use the Services in clinical practice, to provide medical advice, or in any manner that is overseen by or requires clearance or approval from a medical device regulatory agency." [A1 หัวข้อ Use Restrictions] ข้อนี้ใช้กับทั้งระดับฟรีและชำระเงิน [A1] ไม่ได้นิยาม "clinical practice" และไม่ได้กล่าวถึงรายงานสอบสวนโรคหรืองานระบาดวิทยา (ข้อ 7)
2. "Don't rely on the Services for medical, mental health, legal, financial, or other professional advice. Any content regarding those topics is provided for informational purposes only" [A1 หัวข้อ Disclaimers]
3. "You must be 18 years of age or older to use the APIs." และ "Use of Google AI Studio and Gemini API is for developers building with Google AI models for professional or business purposes, not for consumer use." [A1]

### 2.6 ภูมิภาคและที่ประมวลผล

1. ประเทศไทยอยู่ในรายการ "The Gemini API and Google AI Studio are available in the following countries and territories" [A5] และ [A1] กำหนดว่า "You may only access the Services (or make API Clients available to users) within an available region."
2. [A5] มีหมายเหตุเรื่อง Colab ว่าข้อจำกัดภูมิภาค "are applied based on the region that the **Colab instance** is in, not the region that **the user** is in" เอกสารไม่ได้กล่าวถึง Apps Script ซึ่งส่งคำขอจากเครื่องของ Google เช่นกัน ("Requests made using this service originate from a set pool of IP ranges" [S2]) และไม่ได้บอกว่าเครื่องเหล่านั้นอยู่ประเทศใด (ข้อ 7)
3. Gemini Developer API ไม่มีตัวเลือกภูมิภาคของการประมวลผล เอกสารที่อ่านระบุเพียงว่าข้อมูลของบริการแบบชำระเงิน "may be stored transiently or cached in any country in which Google or its agents maintain facilities" [A1] ไม่พบข้อความเรื่องที่ประมวลผลของบริการที่ไม่เสียค่าใช้จ่าย

### 2.7 เมื่อใช้รุ่นเดียวกันผ่าน Vertex AI [C1, C2, A3, A18]

1. การห้ามนำไปฝึก: "Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction. This applies to all managed models on Gemini Enterprise Agent Platform, including GA and pre-GA models." [C1 หัวข้อ Training restriction] ข้อนี้อ้าง "Training Restriction" ใน Service Specific Terms ซึ่งเอกสารนี้ไม่ได้เปิดอ่านตัวข้อตกลง
2. log เพื่อตรวจการใช้ผิดนโยบาย: "Google may log prompts to detect potential abuse and violations of its Acceptable Use Policy and Prohibited Use Policy ... Only customers whose use of Google Cloud is governed by the Google Cloud Platform Terms of Service are subject to prompt logging for abuse monitoring." [C1] หน้า [C1] ไม่ได้บอกวิธีขอยกเว้น log นี้ในส่วนที่อ่าน และไม่ได้ระบุจำนวนวัน
3. รายการที่ต้องทำเพื่อให้ไม่มีการเก็บข้อมูล: ไม่เปิด request-response logging ("This feature is disabled by default"), ตั้ง `store = false` เมื่อใช้ Interactions API ("If you do not specify a value for `store`, it defaults to `true` for all models"), และปิดแคช ซึ่งมีสองชั้นคือในหน่วยความจำและแบบ durable ที่ "stored at rest and encrypted with Google default encryption ... deleted no later than 24 hours after it's written" [C1]
4. การเลือกภูมิภาค: "Requests submitted to a global endpoint may be processed in any Google Cloud location around the world, and therefore don't provide any data residency guarantees." ส่วน "Locational endpoints ... ensure that ML processing remains entirely within the broader multi-regional or country jurisdiction associated with that region" [C2]
5. ตารางของ [C2] มีคอลัมน์ US multi-region, EU multi-region, บราซิล, แคนาดา, ฝรั่งเศส, เยอรมนี, เนเธอร์แลนด์, สหราชอาณาจักร, ออสเตรเลีย, อินเดีย, ญี่ปุ่น, สิงคโปร์ (`asia-southeast1`) และเกาหลีใต้ **ไม่มีคอลัมน์ประเทศไทย** รุ่นที่มีเครื่องหมายในคอลัมน์สิงคโปร์คือ Gemini 4 Argon, Gemini 3.5 Flash และ Gemini 2.5 Flash ส่วน Gemini 4 Hydrogen, Gemini 3.8 Flash และ Gemini 3.6 Flash ไม่มี (3.8 Flash มีแคนาดาและญี่ปุ่น, 3.5 Flash-Lite มีอินเดีย) [C2 ตาราง Google models] การใช้ Vertex AI จึงเลือกประเทศปลายทางได้ แต่ข้อมูลยังออกนอกประเทศไทย
6. หน้าเปรียบเทียบของ Gemini API เขียนว่า "Most developers should use the Gemini Developer API unless there is a need for specific enterprise controls." และเมื่อย้าย "You'll need to use Google Cloud service accounts to authenticate." [A18]

### 2.8 บัญชี Gmail ส่วนบุคคลใช้แต่ละทางได้หรือไม่

| ทาง | สิ่งที่เอกสารระบุ | แหล่ง |
|---|---|---|
| Gemini API ระดับฟรี | "New accounts begin on the Free Tier" บางโปรเจกต์ต้องยืนยันด้วยโทรศัพท์มือถือ: "Required for the free tier on additional projects or projects created outside Google AI Studio" มิฉะนั้น API ตอบ `403` (`FREE_TIER_VERIFICATION_REQUIRED`) และ "Not all Google Cloud projects or accounts are eligible for the Gemini API free tier." | [A10], [A11], [A15] |
| Gemini API ระดับชำระเงิน | ผูก Cloud Billing account ใน AI Studio และ "prepaying to add a minimum of $5 (or equivalent in other currencies) of credits" เอกสารไม่ได้จำกัดชนิดของบัญชี Google | [A10] |
| Vertex AI แบบ express mode | "Agent Platform is available in express mode for developers with a @gmail.com Google Account" ระดับฟรีใช้ได้ 90 วันสำหรับผู้ใช้ใหม่ของ Google Cloud แล้วต้องผูก billing หน้านี้มีสถานะ Preview และตารางรุ่นของ express mode มี 8 รุ่น คือ `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash-image`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` พร้อมข้อความ "Only the models listed in the preceding table are supported in express mode." ไม่มีรุ่น Gemini 4, 3.8, 3.6 หรือ 3.5 Flash-Lite ในตาราง (ตัวอย่างโค้ดในหน้าเดียวกันใช้ `gemini-3.5-flash` ซึ่งไม่อยู่ในตาราง) | [C3] |
| Vertex AI แบบเต็ม | ผู้ที่ไม่ได้อยู่ใน Google Cloud Organization "don't need any specific billing role or permission to create a Cloud Billing account" และ payments profile มีชนิด "Individual ... If you are an individual, student, or not part of an organization, select Individual." | [C4] |

- [A1] กำหนดผู้ใช้ไว้ที่ "developers building ... for professional or business purposes" และไม่มีข้อที่ห้ามบัญชี gmail.com
- ไม่พบในหน้าที่อ่านว่า express mode ระดับฟรี 90 วันของ Vertex AI ใช้ข้อมูลเพื่อปรับปรุงผลิตภัณฑ์หรือไม่ ([C3] ไม่มีคำว่า train, improve หรือ privacy ในผลค้นคำ) (ข้อ 7)

## 3. คำถามที่ 2: รุ่น ขีดจำกัด และราคา ณ 18 พฤศจิกายน 2569

ตัวเลขทุกตัวในส่วนนี้มาจากหน้าเอกสารที่อ่านในวันที่ค้นคว้า ไม่มีตัวเลขใดมาจากความจำ ข้อตกลงเขียนว่า "Google may make changes to this pricing from time to time, effective 30 days after they are posted unless otherwise specified" [A1 หัวข้อ Payment Terms]

### 3.1 รุ่นข้อความที่ใช้อยู่ และกำหนดเลิกใช้ [A6, A9]

| รุ่น (model code) | วันออก | กำหนดปิด | ระดับฟรี | หมายเหตุ |
|---|---|---|---|---|
| `gemini-4-hydrogen` | 12 พ.ย. 2026 | "No shutdown date announced" | มี | Stable [A6] เอกสารแนะนำสำหรับโปรเจกต์ใหม่: "For any new projects, use our latest models: Gemini 4 Hydrogen or 3.5 Flash-Lite." [A6] |
| `gemini-4-carbon` | 10 พ.ย. 2026 | ไม่ประกาศ | ไม่มี ("is not available on the Free tier") | รุ่นให้เหตุผลสูงสุด [A6, A7] |
| `gemini-4-argon` | 13 ต.ค. 2026 | ไม่ประกาศ | ไม่มี | [A6, A7] |
| `gemini-3.8-flash` | 2 ก.ย. 2026 | ไม่ประกาศ | มี | [A6] เรียกว่า "Our previous-generation Flash model" |
| `gemini-3.6-flash` | 21 ก.ค. 2026 | ไม่ประกาศ | มี | Stable |
| `gemini-3.5-flash-lite` | 21 ก.ค. 2026 | ไม่ประกาศ | มี | Stable ราคาต่ำสุดในกลุ่มที่ไม่มีกำหนดปิด |
| `gemini-3.1-flash-lite` | 7 พ.ค. 2026 | **7 พ.ค. 2027** แทนด้วย `gemini-3.5-flash-lite` | มี | |
| `gemini-3.1-pro-preview`, `gemini-3-flash-preview` | ก.พ. 2026, ธ.ค. 2025 | ไม่ประกาศ | ไม่มี / มี | รุ่น Preview "will be deprecated with at least 2 weeks notice" [A6] |
| `gemini-2.5-pro` | 17 มิ.ย. 2025 | **1 ธ.ค. 2026** คำขอถูกส่งต่อไป `gemini-3.8-flash` และคิดราคาของรุ่นนั้น | | "Access through the API is limited to existing users who have actively used it in the past." [A9] |
| `gemini-2.5-flash` | 17 มิ.ย. 2025 | **1 ธ.ค. 2026** คำขอถูกส่งต่อไป `gemini-3.5-flash-lite` | | เงื่อนไขเดียวกัน [A9] |
| `gemini-2.5-flash-lite` | 22 ก.ค. 2025 | ไม่ประกาศ | มี | "we are limiting access to the 2.5 models to users who have actively used them in the past" โปรเจกต์ใหม่จึงไม่ควรนับว่าใช้ได้ [A6] |
| `gemini-3.7-flash`, `gemini-3.5-flash` | ส.ค. และ พ.ค. 2026 | ไม่ปิด endpoint แต่ส่งต่อไป `gemini-3.8-flash` และ `gemini-3.6-flash` ตามลำดับ | | [A9] |
| `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3-pro-preview`, `gemini-3.1-flash-lite-preview` | | ปิดแล้ว (1 มิ.ย. 2026, 9 มี.ค. 2026, 25 พ.ค. 2026) | | [A6 หัวข้อ Previous models, A9] |

- วันที่ในตารางของ [A9] คือ "the *earliest possible dates* on which a model might be retired"
- ชื่อรุ่นแบบ alias: "`gemini-flash-latest` ... This alias will get hot-swapped with every new release of a specific model variation. A **2-week notice** will be provided through email before the version behind latest is changed." [A6] การใช้ alias จึงทำให้รุ่นและราคาเปลี่ยนได้เองโดยไม่แก้โค้ด
- ตั้งแต่ `gemini-3.6-flash` ขึ้นไปและ Gemini 4 ค่า `temperature`, `top_p`, `top_k` ถูกเพิกเฉย: "Gemini 4 and Gemini 3.6+ models ignore custom values for `temperature`, `top_p`, and `top_k` and return deprecation warning headers (and will return `400` errors in a future release)." [A15]

### 3.2 ขีดจำกัดอัตราของระดับฟรี [A8]

1. หน้า Rate limits **ไม่แสดงตัวเลข RPM, TPM และ RPD ของรุ่นข้อความ** ทั้งของระดับฟรีและชำระเงิน ข้อความคือ "Rate limits depend on a variety of factors (such as your usage tier) and can be viewed in Google AI Studio." และ "Specified rate limits are not guaranteed and actual capacity may vary." ตารางตัวเลขที่อยู่ในหน้าเป็นของ Gemini Omni Flash, Gemini Decision 1 และ Batch API เท่านั้น [A8] ตัวเลขของระดับฟรีจึง **Not Verified** (ข้อ 7)
2. สิ่งที่ [A8] ระบุ: ขีดจำกัดวัดสามมิติคือ RPM, TPM (input) และ RPD "Rate limits are applied per project, not per API key. Requests per day (**RPD**) quotas reset at midnight Pacific time." และ "Rate limits are more restricted for experimental and preview models."
3. ระดับการใช้งาน: Free (โปรเจกต์ที่ใช้งานอยู่ บางโปรเจกต์ต้องยืนยัน), Tier 1 (ผูก billing account, เพดานรายเดือน $250), Tier 2 (จ่ายสะสม $100 และ 3 วัน), Tier 3 (จ่ายสะสม $1,000 และ 30 วัน) Tier 1 มีขีดจำกัดการใช้จ่าย $10 ต่อ 10 นาที [A8]
4. รุ่นที่มีระดับฟรีตาม [A7]: `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-2.5-flash-lite` และ Gemma 4 ซึ่งมีเฉพาะระดับฟรี

### 3.3 ราคาของระดับชำระเงิน แท็บ Standard ต่อ 1 ล้าน token เป็นดอลลาร์สหรัฐ [A7]

| รุ่น | Input | Output (รวม thinking token) | หมายเหตุ |
|---|---|---|---|
| `gemini-4-hydrogen` | $1.50 | $7.50 | ราคาเดียวตลอดหน้าต่าง 1M |
| `gemini-4-carbon`, `gemini-4-argon` | $2.00 ถึง 30 พ.ย. 2026 แล้ว **$4.00 ตั้งแต่ 1 ธ.ค. 2026** | $10.00 แล้ว **$20.00 ตั้งแต่ 1 ธ.ค. 2026** | ไม่มีระดับฟรี |
| `gemini-3.8-flash`, `gemini-3.6-flash` | $0.75 ถึง 31 ธ.ค. 2026 แล้ว **$1.50 ตั้งแต่ 1 ม.ค. 2027** | $3.75 แล้ว **$7.50 ตั้งแต่ 1 ม.ค. 2027** | |
| `gemini-3.5-flash-lite` | $0.30 | $2.50 | |
| `gemini-3.1-flash-lite` | $0.25 | $1.50 | ปิดอย่างเร็ว 7 พ.ค. 2027 |
| `gemini-2.5-flash-lite` | $0.10 | $0.40 | จำกัดเฉพาะผู้ที่เคยใช้ |

- thinking token คิดเงินเป็น output: "Every token the model processes is counted and billed, including thinking tokens" [A7] และ "The `max_output_tokens` field caps combined thinking and output tokens" [A17]
- ค่าเริ่มต้นของ thinking: `gemini-4-hydrogen` คือ `high` และ "rejects `minimal` with an error"; `gemini-4-carbon`, `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.6-flash` คือ `medium`; `gemini-3.5-flash-lite` และ `gemini-3.1-flash-lite` คือ `minimal` [A17] จำนวน thinking token ต่อคำขอไม่มีตัวเลขในเอกสาร
- แท็บ Batch และ Flex ของ `gemini-4-hydrogen` ราคาครึ่งหนึ่ง ($0.75 / $3.75) และไม่มีในระดับฟรี [A7] ทั้งสองแบบไม่ตอบทันที จึงไม่เหมาะกับปุ่มที่ผู้ใช้กดแล้วรอ
- ราคาบน Vertex AI: "Prices may differ from the prices listed here and the prices offered on Gemini Enterprise Agent Platform." [A7 หัวข้อ Notes] เอกสารนี้ไม่ได้เปิดหน้าราคาของ Vertex AI (ข้อ 7)

### 3.4 ค่าใช้จ่ายขั้นต่ำและวิธีจ่าย [A10]

1. "Upgrading from the Free Tier to the Paid Tier means linking a billing account and prepaying to add a minimum of $5 (or equivalent in other currencies) of credits to your account." และ "New users default to the Prepay billing plan."
2. "After credits are purchased, unused credits expire after 12 months and are non-refundable" และ "The minimum purchase is $5. The maximum amount of credits you can prepay for is $5,000."
3. "When your Prepay credit balance on the billing account hits $0, all API keys in all projects linked to that billing account will stop working simultaneously. Requests then fail with an HTTP 402 Payment Required error until you add credits."
4. เครดิตต้อนรับ $300 ของ Google Cloud ใช้กับ Gemini API ไม่ได้: "No, starting March 2026, Gemini API usage costs are specifically excluded from the $300 Google Cloud Free Trial program."
5. ตั้งเพดานรายเดือนของโปรเจกต์เองได้ที่หน้า Spend ของ AI Studio (ฟีเจอร์ระบุว่า "Experimental" และ "You are subject to overages for around a 10 minute latency period")
6. กลับไประดับฟรีได้ด้วยการเลิกผูก billing ของโปรเจกต์ [A10 FAQ]

### 3.5 ประมาณค่าใช้จ่ายของหนึ่งร่าง และ 200 ร่างต่อปี

สมมติฐานของผู้สั่งงาน: input 3,000 token และ output 2,500 token ต่อร่าง การคำนวณเป็นของเอกสารนี้ จากราคาใน [A7]: ค่าใช้จ่าย = 3,000 × ราคา input ÷ 1,000,000 + 2,500 × ราคา output ÷ 1,000,000

| รุ่น | ต่อร่าง | 200 ร่างต่อปี |
|---|---|---|
| `gemini-4-hydrogen` | $0.0045 + $0.01875 = **$0.02325** | **$4.65** |
| `gemini-3.8-flash` หรือ `gemini-3.6-flash` ถึง 31 ธ.ค. 2026 | $0.00225 + $0.009375 = $0.011625 | $2.33 |
| `gemini-3.8-flash` หรือ `gemini-3.6-flash` ตั้งแต่ 1 ม.ค. 2027 | $0.0045 + $0.01875 = $0.02325 | $4.65 |
| `gemini-3.5-flash-lite` | $0.0009 + $0.00625 = **$0.00715** | **$1.43** |
| `gemini-3.1-flash-lite` (ปิดอย่างเร็ว พ.ค. 2027) | $0.00075 + $0.00375 = $0.0045 | $0.90 |
| `gemini-4-argon` หรือ `gemini-4-carbon` ตั้งแต่ 1 ธ.ค. 2026 | $0.012 + $0.05 = $0.062 | $12.40 |

- ตัวเลขนี้นับ output 2,500 token รวม thinking แล้ว ถ้า 2,500 เป็นเฉพาะข้อความของร่าง ค่าใช้จ่ายจริงสูงกว่า ตัวอย่างสมมติ: thinking อีก 2,500 token บน `gemini-4-hydrogen` ทำให้หนึ่งร่างเป็น $0.0045 + $0.0375 = $0.042 และ 200 ร่างเป็น $8.40 จำนวน thinking token จริงต้องวัดจากช่องการใช้ token ในคำตอบ
- จำนวน token ของข้อความภาษาไทย: เอกสารให้เพียงค่าประมาณทั่วไป "a token is equivalent to about 4 characters" [A17] ไม่มีอัตราของภาษาไทย ตัวเลข 3,000 และ 2,500 จึงยังไม่ได้ตรวจกับข้อความไทยจริง ตรวจได้โดยไม่เรียกโมเดลด้วยเมทอด `countTokens` [A10 FAQ] ซึ่งยังเป็นการส่งข้อความไปที่ Google จึงใช้ได้กับข้อความสมมติเท่านั้น
- ทุกแถวต่ำกว่ายอดเติมขั้นต่ำ $5 ยกเว้นแถวสุดท้าย และเครดิตหมดอายุใน 12 เดือน รายจ่ายจริงต่อปีของระดับชำระเงินแบบ Prepay ที่ปริมาณนี้จึงอยู่ที่ประมาณ $5 ต่อปี ไม่ใช่ $1 ถึง $5 ตามการคำนวณ token
- เอกสารนี้ไม่ได้แปลงเป็นเงินบาท เพราะไม่ได้ค้นอัตราแลกเปลี่ยนจากแหล่งปฐมภูมิ

### 3.6 ขีดจำกัด token และ structured output [A6, A12]

1. `gemini-4-hydrogen`: "Context window (unified input and output token limit) 1,048,576" และ "Max output 65,536 (default synchronous) / up to 1,048,576 (with long decode)" [A6]
2. `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`: "Input token limit 1,048,576" และ "Output token limit 65,536" [A6] ร่างขนาด 3,000 + 2,500 token ใช้ไม่ถึงร้อยละ 1 ของขีดจำกัด
3. ทุกรุ่นในข้อ 1 และ 2 มีป้าย "Structured outputs: Supported" [A6]
4. วิธีใช้กับ Interactions API: "configure `response_format` with an object ... of type `text` and set its `mime_type` to `application/json`. The schema should be provided in the `schema` field." [A12]
5. "Gemini's structured output mode supports a subset of the JSON Schema specification." ชนิดที่รองรับ: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`; คุณสมบัติที่รองรับรวม `properties`, `required`, `additionalProperties`, `enum`, `format`, `minimum`, `maximum`, `items`, `prefixItems`, `minItems`, `maxItems`, `anyOf`, `$ref` [A12]
6. สิ่งที่ไม่ถูกบังคับ: "`minLength`, `maxLength`, `minProperties`, `maxProperties`, `uniqueItems`, `contains`, `minContains`, and `maxContains` ... are not enforced by the constrained decoding grammar engine" และ "Very large or deeply nested schemas may be rejected." [A12] ระบบจึงจำกัดความยาวของแต่ละหัวข้อด้วย schema ไม่ได้
7. "While output is syntactically correct JSON, always validate values in your application." [A12 หัวข้อ Best practices]
8. คำแนะนำเมื่อข้อความซ้ำใน structured output: "Don't specify the order of fields in your prompt. Make all output fields required." และให้เลี่ยงลำดับ escape `\u` ในตัวอย่าง JSON ของ prompt [A15] ข้อหลังเกี่ยวกับข้อความไทยโดยตรง: ตัวอย่างใน prompt ควรเป็นตัวอักษร UTF-8 ไม่ใช่ `\uXXXX`

## 4. คำถามที่ 3: การเรียก Gemini จาก Apps Script

### 4.1 ขีดจำกัดของ Apps Script สำหรับบัญชี gmail.com [S1, S2]

| เรื่อง | ค่า | แหล่ง |
|---|---|---|
| เวลาทำงานของสคริปต์ | "6 min / execution" | [S1 ตาราง Current limitations] |
| เวลารอคำตอบของ `UrlFetchApp.fetch` | พารามิเตอร์ `timeoutSeconds`: "The maximum time in seconds to wait for the request to complete. The default is 360 (6 minutes)." | [S2] |
| จำนวนการเรียก URL Fetch | "20,000 / day" ต่อผู้ใช้ "reset 24 hours after the first request" | [S1 ตาราง Current quotas] |
| ขนาดของคำขอและคำตอบ | "URL Fetch POST size 50 MB / call" และ "URL Fetch response size 50 MB / call" | [S1] |
| header | "100 / call" และ "8 KB / call" | [S1] |
| การทำงานพร้อมกัน | "Simultaneous executions per user 30 / user" และ "per script 1,000" | [S1] |
| Script Properties | "Properties value size 9 KB / val" และ "500 KB / property store" | [S1] |
| สิทธิ์ที่ต้องมี | "This service requires the `https://www.googleapis.com/auth/script.external_request` scope" | [S2] |

1. API ของระบบรันในนามเจ้าของบัญชีคนเดียว (ADR-0002) การเรียก Gemini ที่ใช้เวลานานจึงกินช่องการทำงานพร้อมกัน 30 ช่องของผู้ใช้คนนั้นตลอดเวลาที่รอ
2. คำขอขนาด 3,000 token และคำตอบ 2,500 token เล็กกว่าขีดจำกัด 50 MB หลายพันเท่า โควตา 20,000 ครั้งต่อวันสูงกว่าปริมาณ 200 ร่างต่อปีมาก
3. ไม่มี streaming: เมทอดของ `UrlFetchApp` มีเพียง `fetch`, `fetchAll` และ `getRequest` ซึ่งคืน `HTTPResponse` เมื่อคำขอเสร็จ [S2] หน้าเว็บจึงเห็นร่างทั้งฉบับครั้งเดียว ไม่เห็นข้อความทยอยขึ้น
4. `muteHttpExceptions`: "If true the fetch doesn't throw an exception if the response code indicates failure, and instead returns the HTTPResponse." [S2] ต้องตั้งค่านี้จึงจะอ่านรหัส 400, 429 และ 503 กับตัว error ที่ Gemini ส่งกลับได้
5. คำเตือนของ [S1]: "All quotas are subject to elimination, reduction, or change at any time, without notice."

### 4.2 ที่อยู่ของ API และ key [A13, A15, A16]

1. Interactions API: `POST https://generativelanguage.googleapis.com/v1beta/interactions` ส่ง key ใน header `x-goog-api-key` และตัวอย่างของเอกสารส่ง header `Api-Revision: 2026-05-20` [A13 ตัวอย่าง REST] ดัชนีเอกสารเขียนว่า "Use the Interactions API (`client.interactions`) as the default across all workflows. `generateContent` is still supported for existing integrations, but is considered a legacy API." [A0] และหน้า overview เขียนว่า "As of June 2026, it is Generally Available and the recommended interface for all new projects." [A16]
2. API เดิม: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` [A16]
3. "Never embed API keys directly in client-side code or public repositories." และ key ที่รั่วถูกปิด: "we have proactively blocked these known leaked keys from accessing the Gemini API" [A15] การเรียกจึงต้องทำจาก `backend/` โดย key อยู่ใน Script Properties (ชื่อตัวแปรเช่น `GEMINI_API_KEY`) ตามกฎข้อ 5 ของ `CLAUDE.md`
4. ทางเลือกผ่าน Vertex AI ใน Apps Script เป็น advanced service: ต้องมี "A Google Cloud project with billing enabled" เปิด Agent Platform API และเปิดบริการ Vertex AI ในโปรเจกต์สคริปต์ ตัวอย่างใช้ `VertexAI.Endpoints.generateContent(payload, model)` กับ model แบบ `projects/${projectId}/locations/${region}/publishers/google/models/${modelName}` ซึ่งทำให้ระบุภูมิภาคได้ [S4] ตัวอย่างในหน้านั้นยังใช้ `gemini-2.5-flash` และ `temperature` ซึ่งล้าสมัยตาม [A9] และ [A15]

### 4.3 ตัวกรองความปลอดภัยกับเนื้อหาทางการแพทย์ [A13, A14, A16]

1. ค่าเริ่มต้นคือปิด: "Due to the model's inherent safety, additional filters are **Off** by default." และ "Categories you don't set use the default threshold, which is **Off** for Gemini 2.5 and later models." [A13]
2. หมวดที่ปรับได้มีห้าหมวด: `harassment`, `hate_speech`, `sexually_explicit`, `dangerous_content` ("Content that promotes, facilitates, or enables dangerous activities") และ `jailbreak` [A13] **ไม่มีหมวดเนื้อหาทางการแพทย์หรือโรค** และหน้า [A13] ไม่มีคำว่า medical, health หรือ disease เอกสารจึงไม่ได้บอกว่าข้อความเรื่องโรคติดต่อ อาการ หรือการเสียชีวิตถูกกรองหรือไม่ ต้องทดสอบด้วยข้อมูลสมมติ (ข้อ 7)
3. มีการป้องกันที่ปรับไม่ได้: "the Gemini API has built-in protections against core harms, such as content that endangers child safety. These types of harm are always blocked and cannot be adjusted." [A13]
4. รูปของคำตอบที่ถูกบล็อกใน Interactions API: "If a safety filter blocks the input or the model's response, the interaction fails with an HTTP `400` error. The blocked content isn't returned." ตัวอย่างของเอกสาร:

   ```json
   {
     "error": {
       "code": "safety",
       "message": "Request blocked due to safety violations (harmful content). Please modify your input and retry."
     }
   }
   ```

   รหัสอื่นของกลุ่มเดียวกัน: `jailbreak`, `prohibited_content`, `blocklist` (ข้อความขึ้นต้น "Input blocked:"), `recitation`, `language` ("An unsupported language blocked the request."), `content_blocked` และ **`spii`: "Sensitive Personally Identifiable Information restrictions blocked the request."** [A13, A14]
5. รูปของคำตอบใน API เดิม `generateContent`: HTTP 200 ที่มี `promptFeedback.blockReason` ("If set, the prompt was blocked and no candidates are returned.") ค่า `SAFETY`, `OTHER`, `BLOCKLIST`, `PROHIBITED_CONTENT` หรือ `candidates[].finishReason` ที่ไม่ใช่ `STOP` เช่น `MAX_TOKENS`, `SAFETY`, `RECITATION`, `LANGUAGE`, `PROHIBITED_CONTENT`, **`SPII`: "Token generation stopped because the content potentially contains Sensitive Personally Identifiable Information (SPII)."** [A16] โค้ดจึงต้องตรวจสองที่ ไม่ใช่เฉพาะรหัส HTTP
6. เอกสารไม่ได้อธิบายว่าอะไรทำให้เกิดรหัส `spii` และปิดได้หรือไม่ ชื่อ บ้านเลขที่ และการวินิจฉัยของผู้ป่วยใน prompt เป็นข้อมูลชนิดที่ชื่อของรหัสนี้กล่าวถึง (ข้อ 7)
7. "If you see `BlockedReason.OTHER`, the query or response may violate the terms of service or be otherwise unsupported." [A15]

### 4.4 การจัดการ 429, 503 และข้อผิดพลาดอื่น [A14, A15]

| รหัส | ความหมาย | สิ่งที่เอกสารแนะนำ |
|---|---|---|
| 429 `rate_limit_exceeded`, `too_many_requests` | เกินขีดจำกัดต่อนาที | "Wait and retry with exponential backoff." |
| 429 `quota_exceeded` | เกินโควตารายวัน | "Wait until the quota resets or request a quota increase." การลองใหม่ทันทีไม่ช่วย |
| 503 `service_unavailable` | บริการรับภาระเกินชั่วคราว | "Wait and retry with exponential backoff." |
| 500 `api_error` | ข้อผิดพลาดของเซิร์ฟเวอร์ | "Retry the request. If it persists, contact support." |
| 504 `deadline_exceeded` | คำขอไม่เสร็จในเวลา | "Remove or increase client deadline setting to use the server default." |
| 402 `payment_required` | เครดิต Prepay หมด | "Don't retry: the request won't succeed until credits are added." |
| 403 `permission_denied` | key ไม่มีสิทธิ์ โปรเจกต์ต้องยืนยัน หรือ key ถูกรายงานว่ารั่ว | ตรวจ key สถานะการยืนยัน และ billing |
| 400 `safety`, `spii` และรหัสกลุ่ม generation blocked | เนื้อหาถูกบล็อก | "modify your input and retry" การส่งซ้ำข้อความเดิมไม่ช่วย |

1. วิธีลองใหม่ที่แนะนำสำหรับผู้เรียก REST เอง: "Wait a short time before the first retry (for example, 1 second), then increase the delay exponentially (for example, 2s, 4s, 8s)", "Add random "jitter"", "Only retry on transient errors (like `429`, `408`, or `5xx`). Do not retry on client errors (like `400`, `402`, or `403`)" และ "Define a maximum number of retry attempts" [A15 หัวข้อ Retry strategy] SDK ของ Python ลองใหม่ "up to four times with an initial delay of approximately 1 second and a maximum delay of 60 seconds" ซึ่ง Apps Script ไม่มี SDK นี้และต้องเขียนเอง
2. ทุกรอบของการรอและลองใหม่อยู่ในเวลาทำงาน 6 นาทีของ Apps Script [S1] และใน Apps Script การรอทำด้วย `Utilities.sleep` ซึ่งกินเวลาทำงานและช่องการทำงานพร้อมกัน
3. เวลาตอบ: "Gemini 3.x models have thinking enabled by default ... This reasoning process increases both response latency and total token consumption. If you prioritize lower latency or need to minimize costs, you can lower the thinking level" [A15] เอกสารไม่มีตัวเลขเวลาตอบของคำขอขนาด 2,500 token (ข้อ 7)
4. ระดับฟรีมีเหตุล้มเหลวเพิ่มที่ไม่เกี่ยวกับโค้ด: `403` `FREE_TIER_VERIFICATION_REQUIRED` และโปรเจกต์ที่ไม่มีสิทธิ์ใช้ระดับฟรี [A11, A15]

## 5. คำถามที่ 4: การสร้างเอกสาร

### 5.1 แบบอักษรไทยแบบราชการ: สิ่งที่แหล่งข้อมูลยืนยัน

1. แบบอักษร "Sarabun" บน Google Fonts คือ TH Sarabun New: "Sarabun is an open source multi-script webfont that supports both Latin and Thai. It is the "TH Sarabun New" font, made available under the Open Font License. ... The font is used in the Government Gazette of Thailand newspaper" ช่อง license เป็น `ofl` และมีชุดอักขระ `thai` [W4] ผู้พัฒนาเขียนว่า "This font was selected by the royal Thai government to be the official typeface for documentation purpose." [W5]
2. Google Docs ใช้แบบอักษรจาก Google Fonts ได้: `setFontFamily(fontFamilyName)` "Sets the font family. The name can be any font from the Font menu in Docs or Google Fonts, and is case-sensitive. Unrecognized font names will render as Arial." [W1] ชื่อที่ใช้ได้ใน Google Docs จึงเป็น `Sarabun` บริการ CSS ของ Google Fonts ตอบ HTTP 400 สำหรับชื่อ `TH SarabunPSK`, `TH Sarabun New` และ `TH SarabunIT9` และตอบ 200 สำหรับ `Sarabun` (ตรวจเมื่อ 18 พฤศจิกายน 2569) [W4]
3. Windows 11 ไม่มีแบบอักษรตระกูล Sarabun: หน้ารายการแบบอักษรของ Windows 11 ไม่มีคำว่า Sarabun แบบอักษรไทยที่ติดมาคือ Leelawadee UI และชุดเสริม "Thai Supplemental Fonts" ซึ่งเป็น Feature On Demand มี Angsana New, AngsanaUPC, Browallia New, BrowalliaUPC, Cordia New, CordiaUPC, Leelawadee และตระกูล UPC อื่น [W6]
4. **Microsoft 365 มี TH SarabunPSK เป็น cloud font**: รายการ "Cloud fonts list" มี "TH SarabunPSK", "TH SarabunPSK Bold", "TH SarabunPSK Bold Italic", "TH SarabunPSK Italic" (ไฟล์ `thsarabun.ttf` รุ่น 1.21) [W7] เงื่อนไข: "Cloud fonts are available to Microsoft 365 subscribers.", "To get the cloud fonts, your device needs to be online", ต้องเปิด "Optional connected experiences" และ Word บน Windows ต้องเป็น "Build 16.0.9203 or later" [W7] รายการนี้ไม่มี TH SarabunIT๙, TH Sarabun New หรือ Sarabun
5. เครื่องที่ใช้ Office แบบซื้อขาด หรือไม่ได้ต่ออินเทอร์เน็ต ไม่อยู่ในเงื่อนไขของข้อ 4 แบบอักษรต้องถูกติดตั้งในเครื่อง หรือฝังในไฟล์: "if you share your document with someone else who doesn't have the same fonts installed that you do, the fonts, layout, and styling of the document won't change" เมื่อฝังแบบอักษร และเมื่อไม่ฝัง "a different font is substituted" [W8]
6. ข้อกำหนดของทางราชการเรื่องแบบอักษร: พบเฉพาะในแหล่งทุติยภูมิ คือเอกสารที่เผยแพร่บนเว็บไซต์สำนักงานสาธารณสุขจังหวัดอุทัยธานี ซึ่งเขียนว่าการพิมพ์หนังสือภายนอก "ใช้รูปแบบตัวพิมพ์ไทยสารบรรณ (ฟอนต์ TH SarabunPSK) ขนาด 16 พอยท์" [W12 หน้า 14] ต้นฉบับของข้อกำหนดนี้ (หนังสือเวียนของสำนักนายกรัฐมนตรี) และมติคณะรัฐมนตรีเรื่องแบบอักษรมาตรฐานราชการ เปิดไม่ได้ในรอบนี้: **Not Verified** (ข้อ 7)
7. เครื่องคอมพิวเตอร์ของหน่วยงานรัฐไทยมี TH SarabunPSK หรือ TH SarabunIT๙ ติดตั้งเป็นมาตรฐานหรือไม่: ไม่พบแหล่งปฐมภูมิ และเอกสารที่อ่านไม่ได้กล่าวถึง TH SarabunIT๙ เลย: **Not Verified** ยืนยันได้ด้วยการเปิดรายการแบบอักษรบนเครื่องของ สสอ. และ รพ.สต. (ข้อ 7)
8. แหล่งที่อ่านไม่ได้บอกว่ารายงานสอบสวนโรคเป็น "หนังสือราชการ" ที่ต้องใช้แบบของระเบียบงานสารบรรณหรือไม่ เรื่องรูปแบบของรายงานอยู่ในขอบเขตของการค้นคว้าอีกชุดหนึ่ง

### 5.2 (ก) Apps Script คัดลอกแม่แบบ Google Docs แทนที่ตัวยึด แล้วส่งออกเป็น DOCX หรือ PDF

| เรื่อง | ข้อเท็จจริง | แหล่ง |
|---|---|---|
| คัดลอกแม่แบบ | `File.makeCopy(name, destination)` ต้องมี scope `https://www.googleapis.com/auth/drive` | [W2] |
| แทนที่ตัวยึด | `Body.replaceText(searchPattern, replacement)`: "Replaces all occurrences of a given text pattern with a given replacement string, using regular expressions ... This methods uses Google's RE2 regular expression library" และ "The provided regular expression pattern is independently matched against each text block contained in the current element." ต้องมี scope `https://www.googleapis.com/auth/documents` | [W1] |
| ส่งออก PDF | `File.getAs(contentType)`: "For most blobs, 'application/pdf' is the only valid option. ... For a Google Docs document, 'text/markdown' is also valid." | [W2] |
| ส่งออก DOCX | `getAs` ทำไม่ได้ ต้องใช้ Drive API `files.export` กับ MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document` ต้องมี scope `drive`, `drive.file` หรือ `drive.readonly` | [W3] |
| ขนาด | "Note that the exported content is limited to 10 MB." | [W3] |
| โควตาของบัญชี gmail.com | "Documents created 250 / day" และ "Files converted 2,000 / day" | [S1] |

1. ทางนี้ต้องเพิ่ม scope `documents` และใช้ scope `drive` เต็ม ซึ่งระบบมีอยู่แล้วหากใช้ `File.makeCopy` สำหรับชุดสำรอง (ตาม `backup-environment-facts.md`)
2. **ไฟล์ที่มีข้อมูลผู้ป่วยต้องเกิดขึ้นใน Google Drive** อย่างน้อยชั่วคราว เพราะสำเนาของแม่แบบเป็นไฟล์ Google Docs และการส่งออกทำจากไฟล์นั้น การเอาออกทำได้ด้วย `File.setTrashed(true)` เท่านั้น Apps Script ไม่มีเมทอดลบถาวร และ "Files in the trash are automatically deleted after 30 days." [`backup-environment-facts.md` ข้อ 2.3 แหล่ง B10, B15] ร่างรายงานจึงค้างในถังขยะของบัญชีเจ้าของได้ถึง 30 วัน เว้นแต่ใช้ Drive API ลบถาวร ซึ่งเอกสารนี้ไม่ได้ตรวจ
3. แบบอักษร: แม่แบบใช้ `Sarabun` ได้ (ข้อ 5.1 ข้อ 2) PDF ที่ส่งออกจาก Google Docs ไม่ขึ้นกับแบบอักษรในเครื่องผู้อ่าน ส่วนไฟล์ DOCX ที่ส่งออกจะอ้างชื่อแบบอักษร `Sarabun` หรือฝังแบบอักษรมาด้วยหรือไม่ เอกสารของ Google ที่อ่านไม่ได้ระบุ: **Not Verified** ต้องทดสอบส่งออกแล้วเปิดใน Word บนเครื่องที่ไม่มี Sarabun (ข้อ 7) ชื่อ `Sarabun` ไม่ตรงกับ `TH SarabunPSK` ที่ Microsoft 365 มีเป็น cloud font [W7] Word จึงอาจแทนด้วยแบบอักษรอื่น
4. `replaceText` จับคู่ทีละบล็อกข้อความ [W1] ตัวยึดที่ถูกแบ่งเป็นหลายช่วงรูปแบบในแม่แบบอาจไม่ถูกจับคู่ และการใส่ร่างยาวหลายย่อหน้าหรือตารางผู้ป่วยต้องใช้เมทอดแทรกย่อหน้าและตาราง ไม่ใช่การแทนที่ข้อความอย่างเดียว ไม่ได้ทดสอบ
5. การแก้ไขต่อใน Word: ได้ เมื่อส่งออกเป็น DOCX ส่วน PDF แก้ต่อได้โดยให้ Word แปลงกลับ ซึ่ง "The converted document might not have a perfect page-to-page correspondence with the original." [W9]

### 5.3 (ข) เบราว์เซอร์สร้างไฟล์ .docx ด้วยไลบรารีโอเพนซอร์สจาก JSON ที่ API ส่งมา

1. ไลบรารี `docx` รุ่น 9.15.4 สัญญาอนุญาต MIT: "Easily generate and modify .docx files with JS/TS. Works for Node and on the Browser." [W10 README, `package.json`]
2. ในเบราว์เซอร์ใช้ `Packer.toBlob(doc)`: "This is useful if you want to send it as an downloadable in a browser environment." ส่วน `toBuffer` และ `toStream` ใช้ในเบราว์เซอร์ไม่ได้ [W10 `packers.md`] ไฟล์จึงเกิดในเครื่องของผู้ใช้ และไม่มีไฟล์ใน Drive หรือที่ server
3. การกำหนดแบบอักษร: `font(name)` หรือ `font({ascii, cs, eastAsia, hAnsi, hint})` [W10 `styling-with-js.md`] เอกสารของไลบรารีที่อ่านไม่ได้อธิบายว่าช่องใดใช้กับอักษรไทย และไม่ได้อธิบายการกำหนดขนาดตัวอักษรแยกตามกลุ่มอักษร เอกสารนี้ไม่ได้เปิดมาตรฐานของรูปแบบไฟล์ Word: **Not Verified** ต้องทดสอบว่าข้อความไทยได้แบบอักษรและขนาด 16 พอยต์ตามที่ตั้ง (ข้อ 7)
4. การฝังแบบอักษรลงในไฟล์: "Custom fonts allow you to embed fonts directly into your document, ensuring consistent appearance across different systems." กำหนดไฟล์ของตัวปกติ ตัวหนา ตัวเอียง และตัวหนาเอียงได้ และมีค่า `CharacterSet.THAI`: "specifying the correct character set is important for non-Latin scripts — without it, Word may fall back to a default encoding and render characters incorrectly." [W10 `fonts.md`] แบบอักษร Sarabun ใช้สัญญาอนุญาต OFL [W4] ซึ่งเอกสารนี้ไม่ได้อ่านตัวสัญญา
5. การเติมแม่แบบ .docx ที่มีอยู่: `patchDocument({ data, patches })` รับแม่แบบเป็น `Buffer`, `Uint8Array`, `ArrayBuffer` หรือ `Blob` และแทนที่ตัวยึดแบบ `{{name}}` โดย `patchDetector` คืนรายชื่อตัวยึดในแม่แบบ [W10 `patcher.md`] ทางนี้ทำให้ PO หรือเจ้าหน้าที่จัดหน้าแม่แบบใน Word เองได้ด้วยแบบอักษรที่เครื่องของหน่วยงานมี
6. แบบอักษรบนเครื่องผู้อ่าน: ถ้าไฟล์อ้างชื่อ `TH SarabunPSK` โดยไม่ฝัง Word ของ Microsoft 365 ที่ออนไลน์ดาวน์โหลดแบบอักษรนี้เองได้ [W7] เครื่องอื่นต้องมีแบบอักษรติดตั้งอยู่ (ข้อ 5.1 ข้อ 5 และ 7) ถ้าฝังแบบอักษรในไฟล์ ไม่ต้องพึ่งเครื่องผู้อ่าน แต่ Word ทุกรุ่นและโปรแกรมอื่นอ่านแบบอักษรที่ฝังด้วยไลบรารีนี้ได้หรือไม่ ไม่ได้ทดสอบ
7. การแก้ไขต่อใน Word: ได้โดยตรง เพราะผลลัพธ์เป็นไฟล์ .docx
8. ข้อมูลที่ต้องเดินทาง: API ส่ง JSON ของร่างและข้อมูลผู้ป่วยที่ใช้ในเอกสารให้เบราว์เซอร์ของผู้ที่มีสิทธิ์ ซึ่งเป็นเส้นทางเดียวกับการแสดงข้อมูลบนหน้าจอ ไฟล์ที่ดาวน์โหลดอยู่ในเครื่องของเจ้าหน้าที่ นอกการควบคุมของระบบ เช่นเดียวกับไฟล์ส่งออกอื่น
9. ขนาดของไลบรารีที่เพิ่มในหน้าเว็บ และการทำงานบนมือถือ ไม่ได้ตรวจ

### 5.4 (ค) หน้า HTML ที่จัดรูปแบบสำหรับพิมพ์ แล้วบันทึกเป็น PDF จากเบราว์เซอร์

1. "`@page` at-rule is a CSS at-rule used to modify different aspects of printed pages. It targets and modifies the page's dimensions, orientation, and margins." [W11] และ `window.print()` "Opens the print dialog to print the current document." [W11]
2. แบบอักษร: หน้าเว็บโหลด Sarabun เป็น web font ได้ (CSS ของ Google Fonts มีช่วง Unicode ของอักษรไทย U+0E01–0E5B [W4]) จึงไม่ขึ้นกับแบบอักษรในเครื่อง หากระบบจำกัดแหล่งของสคริปต์และทรัพยากรตาม ADR-0002 ต้องวางไฟล์แบบอักษรไว้กับหน้าเว็บเอง
3. ไม่มีไฟล์ที่ server ผู้ใช้เลือก "บันทึกเป็น PDF" ในกล่องพิมพ์ของเบราว์เซอร์เอง หัวและท้ายกระดาษที่เบราว์เซอร์เติม (ที่อยู่หน้าเว็บ วันที่) และการตัดหน้า ขึ้นกับเบราว์เซอร์และค่าที่ผู้ใช้ตั้ง ไม่ได้ทดสอบ
4. การแก้ไขต่อใน Word: **ไม่ได้โดยตรง** ต้องเปิด PDF ใน Word ซึ่งแปลงเนื้อหาและ "works best with PDFs that are mostly text" โดยหน้าและบรรทัดอาจไม่ตรงเดิม [W9] การแปลงข้อความไทยจาก PDF ไม่ได้ทดสอบ
5. ทางนี้แก้ข้อความได้ในหน้าเว็บก่อนพิมพ์ ถ้าระบบมีช่องแก้ไขร่าง แต่ไฟล์ที่ได้เป็นฉบับพิมพ์ ไม่ใช่ฉบับแก้ไข

### 5.5 เปรียบเทียบสามทาง

| เรื่อง | (ก) แม่แบบ Google Docs | (ข) `.docx` ในเบราว์เซอร์ | (ค) HTML พิมพ์เป็น PDF |
|---|---|---|---|
| แก้ไขต่อใน Microsoft Word | ได้ เมื่อส่งออก DOCX | ได้ | ไม่ได้โดยตรง ต้องให้ Word แปลง PDF [W9] |
| ไฟล์ที่มีข้อมูลผู้ป่วยนอกตาราง | เกิดใน Drive ของบัญชีเจ้าของ และค้างในถังขยะได้ 30 วัน | ไม่มีที่ server มีในเครื่องผู้ใช้ | ไม่มีที่ server มีในเครื่องผู้ใช้เมื่อบันทึก |
| สิทธิ์และโควตาเพิ่ม | scope `documents` และ `drive`, 250 เอกสารต่อวัน, ส่งออกไม่เกิน 10 MB [W1–W3, S1] | ไม่มี | ไม่มี |
| เวลาทำงานของ Apps Script | เพิ่มจากการคัดลอก แก้ไข และส่งออก ภายใน 6 นาทีเดียวกับการเรียก Gemini หากทำในคำขอเดียว [S1] | ไม่เพิ่ม | ไม่เพิ่ม |
| แบบอักษรไทย | `Sarabun` ใน Docs [W1, W4] ผลใน DOCX ที่ส่งออก Not Verified | อ้างชื่อ `TH SarabunPSK` (Microsoft 365 มีเป็น cloud font [W7]) หรือฝังไฟล์แบบอักษร [W10] | web font ไม่ขึ้นกับเครื่อง [W4] |
| ผู้จัดหน้าแม่แบบ | แก้ใน Google Docs | แก้แม่แบบ .docx ใน Word แล้วใช้ `patchDocument` หรือเขียนเป็นโค้ด [W10] | แก้ CSS |
| สิ่งที่ต้องทดสอบก่อนเลือก | แบบอักษรและการจัดหน้าของ DOCX ที่ส่งออกเมื่อเปิดใน Word | ข้อความไทย ขนาดตัวอักษร และตารางเมื่อเปิดใน Word รุ่นที่หน่วยงานใช้ | การตัดหน้าและหัวท้ายกระดาษในเบราว์เซอร์ที่เจ้าหน้าที่ใช้ |

ทางที่ให้เจ้าหน้าที่แก้ไขต่อใน Microsoft Word ได้คือ (ก) และ (ข) และทางที่ไม่สร้างไฟล์ที่ server คือ (ข) และ (ค) ทางที่ได้ทั้งสองอย่างคือ (ข)

## 6. คำถามที่ 5: กฎหมายและแนวทางของไทยเรื่องการส่งข้อมูลผู้ป่วยให้บริการ generative AI ในต่างประเทศ

สิ่งที่ [`data-retention-governance-facts.md`](data-retention-governance-facts.md) บันทึกไว้แล้วและไม่เขียนซ้ำ: ฐานของการเก็บโดยไม่ขอความยินยอมตามมาตรา 24 และ 26 (5) (ข) (ข้อ 4.1), หน้าที่เรื่องผู้ประมวลผลข้อมูลตามมาตรา 40 และนิยาม "ส่งหรือโอนข้อมูลส่วนบุคคล" ของประกาศตามมาตรา 28 (ข้อ 4.7), มาตรการความมั่นคงปลอดภัยขั้นต่ำ (ข้อ 4.5) และการทำให้ข้อมูลระบุตัวไม่ได้ตามประกาศปี 2567 [G9 ข้อ 6] (ข้อ 2.3) ส่วนนี้เพิ่มสิ่งที่เกี่ยวกับ AI และการส่งออกนอกประเทศโดยตรง

### 6.1 ตัวบทของพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 [D4]

1. มาตรา 6: "“ข้อมูลส่วนบุคคล” หมายความว่า ข้อมูลเกี่ยวกับบุคคลซึ่งทำให้สามารถระบุตัวบุคคลนั้นได้ไม่ว่าทางตรงหรือทางอ้อม แต่ไม่รวมถึงข้อมูลของผู้ถึงแก่กรรมโดยเฉพาะ"
2. มาตรา 26 วรรคหนึ่ง: "ห้ามมิให้เก็บรวบรวมข้อมูลส่วนบุคคลเกี่ยวกับเชื้อชาติ เผ่าพันธุ์ ความคิดเห็นทางการเมือง ความเชื่อในลัทธิ ศาสนาหรือปรัชญา พฤติกรรมทางเพศ ประวัติอาชญากรรม ข้อมูลสุขภาพ ความพิการ ข้อมูลสหภาพแรงงาน ข้อมูลพันธุกรรม ข้อมูลชีวภาพ หรือข้อมูลอื่นใดซึ่งกระทบต่อเจ้าของข้อมูลส่วนบุคคลในทำนองเดียวกันตามที่คณะกรรมการประกาศกำหนด โดยไม่ได้รับความยินยอมโดยชัดแจ้งจากเจ้าของข้อมูลส่วนบุคคล เว้นแต่ ..." ข้อยกเว้น (5) (ข) เรื่องประโยชน์สาธารณะด้านการสาธารณสุขมีเงื่อนไข "ซึ่งได้จัดให้มีมาตรการที่เหมาะสมและเจาะจงเพื่อคุ้มครองสิทธิและเสรีภาพของเจ้าของข้อมูลส่วนบุคคลโดยเฉพาะการรักษาความลับของข้อมูลส่วนบุคคลตามหน้าที่หรือตามจริยธรรมแห่งวิชาชีพ"
3. มาตรา 27: "ห้ามมิให้ผู้ควบคุมข้อมูลส่วนบุคคลใช้หรือเปิดเผยข้อมูลส่วนบุคคล โดยไม่ได้รับความยินยอมจากเจ้าของข้อมูลส่วนบุคคล เว้นแต่เป็นข้อมูลส่วนบุคคลที่เก็บรวบรวมได้โดยได้รับยกเว้นไม่ต้องขอความยินยอมตามมาตรา 24 หรือมาตรา 26" และวรรคสาม "ผู้ควบคุมข้อมูลส่วนบุคคลต้องบันทึกการใช้หรือเปิดเผยนั้นไว้ในรายการตามมาตรา 39"
4. มาตรา 28 วรรคหนึ่ง: "ในกรณีที่ผู้ควบคุมข้อมูลส่วนบุคคลส่งหรือโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ ประเทศปลายทางหรือองค์การระหว่างประเทศที่รับข้อมูลส่วนบุคคลต้องมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอ ทั้งนี้ ต้องเป็นไปตามหลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลตามที่คณะกรรมการประกาศกำหนดตามมาตรา 16 (5) เว้นแต่ (1) เป็นการปฏิบัติตามกฎหมาย (2) ได้รับความยินยอมจากเจ้าของข้อมูลส่วนบุคคลโดยได้แจ้งให้เจ้าของข้อมูลส่วนบุคคลทราบถึงมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่ไม่เพียงพอของประเทศปลายทาง ... (3) เป็นการจำเป็นเพื่อการปฏิบัติตามสัญญาซึ่งเจ้าของข้อมูลส่วนบุคคลเป็นคู่สัญญา ... (4) เป็นการกระทำตามสัญญาระหว่างผู้ควบคุมข้อมูลส่วนบุคคลกับบุคคลหรือนิติบุคคลอื่นเพื่อประโยชน์ของเจ้าของข้อมูลส่วนบุคคล (5) เพื่อป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพของเจ้าของข้อมูลส่วนบุคคลหรือบุคคลอื่น เมื่อเจ้าของข้อมูลส่วนบุคคลไม่สามารถให้ความยินยอมในขณะนั้นได้ (6) เป็นการจำเป็นเพื่อการดำเนินภารกิจเพื่อประโยชน์สาธารณะที่สำคัญ"
5. มาตรา 29 วรรคสาม: "ในกรณีที่ยังไม่มีคำวินิจฉัยของคณะกรรมการตามมาตรา 28 หรือยังไม่มีนโยบายในการคุ้มครองข้อมูลส่วนบุคคลตามวรรคหนึ่ง ผู้ควบคุมข้อมูลส่วนบุคคลหรือผู้ประมวลผลข้อมูลส่วนบุคคลอาจส่งหรือโอนข้อมูลส่วนบุคคลไปยังต่างประเทศได้โดยได้รับยกเว้นไม่ต้องปฏิบัติตามมาตรา 28 เมื่อผู้ควบคุมข้อมูลส่วนบุคคลหรือผู้ประมวลผลข้อมูลส่วนบุคคลได้จัดให้มีมาตรการคุ้มครองที่เหมาะสมสามารถบังคับตามสิทธิของเจ้าของข้อมูลส่วนบุคคลได้ รวมทั้งมีมาตรการเยียวยาทางกฎหมายที่มีประสิทธิภาพตามหลักเกณฑ์และวิธีการที่คณะกรรมการประกาศกำหนด" วรรคหนึ่งของมาตราเดียวกันว่าด้วยนโยบายของ "เครือกิจการหรือเครือธุรกิจเดียวกัน" ซึ่งไม่เกี่ยวกับกรณีนี้

### 6.2 ประกาศตามมาตรา 28 และ 29 พ.ศ. 2566 [G8, N2]

1. มาตรฐานที่เพียงพอของประเทศปลายทาง: "ให้พิจารณาจากข้อเท็จจริงเกี่ยวกับความเพียงพอของปัจจัย ดังต่อไปนี้ (1) มีมาตรการหรือกลไกทางกฎหมายเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคลของประเทศปลายทาง ... ที่สอดคล้องกับกฎหมายว่าด้วยการคุ้มครองข้อมูลส่วนบุคคลของประเทศไทย ... (2) มีหน่วยงานหรือองค์กรที่มีหน้าที่และอำนาจในการบังคับใช้กฎหมายและกฎระเบียบเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคลในประเทศปลายทางหรือองค์การระหว่างประเทศ" [G8 ข้อ 5]
2. คณะกรรมการ "อาจพิจารณาวินิจฉัยเป็นรายกรณี หรือพิจารณากำหนดรายชื่อประเทศปลายทางหรือองค์การระหว่างประเทศที่รับข้อมูลส่วนบุคคล ซึ่งถือว่ามีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอก็ได้" [G8 ข้อ 6] เอกสารนี้ไม่ได้ค้นว่ามีรายชื่อประเทศเช่นนั้นแล้วหรือไม่ (ข้อ 7)
3. นิยาม "ส่งหรือโอนข้อมูลส่วนบุคคล" ของประกาศตามมาตรา 29 ใช้ข้อความเดียวกับประกาศตามมาตรา 28: ไม่รวม "การส่งและรับข้อมูลส่วนบุคคลในลักษณะที่เป็นเพียงสื่อกลาง (intermediary) ในการส่งผ่านข้อมูล (data transit) ... หรือการเก็บพักข้อมูล (data storage) ในรูปแบบชั่วคราวหรือถาวรที่ไม่มีบุคคลภายนอกเข้าถึงข้อมูลส่วนบุคคลดังกล่าว" และยกตัวอย่าง "การส่งข้อมูลผ่านระบบของผู้ให้บริการระบบคลาวด์ (cloud computing service provider) ที่ไม่มีบุคคลใดนอกจากผู้ควบคุมข้อมูลส่วนบุคคลหรือผู้ประมวลผลข้อมูลส่วนบุคคลที่เป็นผู้ส่งข้อมูลส่วนบุคคลนั้น หรือบุคลากร พนักงาน หรือลูกจ้าง เข้าถึงข้อมูลส่วนบุคคล เนื่องจากมีมาตรการทางเทคนิคหรือเงื่อนไขทางกฎหมายรองรับ" [N2 ข้อ 3]
4. มาตรการคุ้มครองที่เหมาะสม (appropriate safeguards) ตามมาตรา 29 วรรคสาม "อาจอยู่ในรูปแบบ ดังนี้ (1) ข้อสัญญาที่เป็นไปตามข้อสัญญาในการส่งหรือโอนข้อมูลส่วนบุคคลที่เป็นที่ยอมรับ ... (2) การรับรอง (certification) ... (3) ข้อกำหนดมาตรการคุ้มครองข้อมูลส่วนบุคคลในตราสารหรือข้อตกลงที่มีผลผูกพันทางกฎหมายและสามารถใช้บังคับได้ระหว่างหน่วยงานของรัฐของประเทศไทยกับหน่วยงานของรัฐของประเทศอื่น" [N2 ข้อ 8]
5. ข้อสัญญาต้นแบบที่ประกาศยอมรับ: "(ก) ข้อสัญญาต้นแบบของอาเซียนสำหรับการไหลเวียนข้อมูลข้ามพรมแดน (ASEAN Model Contractual Clauses for Cross Border Data Flows) (ข) ข้อสัญญามาตรฐานสำหรับการโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ (Standard Contractual Clauses for the Transfer of Personal Data to Third Countries) ที่ออกตามความใน Article 46 (1) ประกอบ Article 46 (2) (c) และ Article 28 (7) ของกฎหมาย Regulation (EU) 2016/679" หรือข้อสัญญามาตรฐานอื่นที่คณะกรรมการประกาศกำหนด [N2 ข้อ 10 (2)]
6. เมื่อผู้รับเป็นผู้ประมวลผลข้อมูล ข้อสัญญาที่คู่สัญญาทำเองต้องกำหนดว่าผู้รับ "ต้องเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลตามคำสั่งหรือในนามของผู้ส่งหรือโอนข้อมูลส่วนบุคคล และตามวัตถุประสงค์ที่ผู้ส่งหรือโอนข้อมูลส่วนบุคคลกำหนดไว้เท่านั้น" และ "ต้องแจ้งเหตุการละเมิดข้อมูลส่วนบุคคล ... โดยไม่ชักช้าภายในเจ็ดสิบสองชั่วโมง" [N2 ข้อ 10 (1) (ค)]

### 6.3 แนวทางของคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลเรื่อง AI พ.ศ. 2569 [N1]

ประกาศนี้ลงราชกิจจานุเบกษาเมื่อ 2 พฤศจิกายน 2569 ออกตามมาตรา 16 (3) ของ [D4] สถานะตามหน้าเผยแพร่ของ สคส.: "มีวัตถุประสงค์เพื่อเป็นคำแนะนำในขั้นต้น เพื่อประโยชน์ของผู้ควบคุมข้อมูลส่วนบุคคล หรือผู้ที่เกี่ยวข้องในการนำไปปรับใช้เท่านั้น ไม่มีสภาพบังคับตามกฎหมาย และไม่มีผลผูกพันในการพิจารณาความผิด และไม่ถือเป็นการตีความหรือวินิจฉัยชี้ขาดปัญหาที่เกิดจากการบังคับใช้กฎหมายว่าด้วยการคุ้มครองข้อมูลส่วนบุคคล" (หน้า `https://www.pdpc.or.th/29505/`) เลขหน้าด้านล่างเป็นเลขที่พิมพ์บนหน้ากระดาษของแนวทาง

1. **Prompt และ Output เป็นข้อมูลส่วนบุคคลได้**: นิยามในภาคผนวก ง "ในบริบทของ AI ให้หมายความรวมถึงข้อมูลใน Prompt หรือ Output ที่สามารถระบุตัวตนได้" [N1 หน้า 72]
2. **ข้อมูลที่ตัดชื่อออกแล้วยังเป็นข้อมูลส่วนบุคคลได้**: "ในการพิจารณาความเป็นข้อมูลส่วนบุคคลนั้น จะต้องพิจารณาว่าผู้เก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลสามารถระบุตัวเจ้าของข้อมูลส่วนบุคคลนั้นได้ ไม่ว่าทางตรงหรือทางอ้อมจากข้อมูลดังกล่าวเอง หรือจากข้อมูลดังกล่าวประกอบกับข้อมูลอื่นที่มีหรือสามารถเข้าถึงได้" และ "ข้อมูลที่สามารถระบุตัวบุคคลได้ทางอ้อม (Indirect Identifiers) เช่น วันเดือนปีเกิด อายุ ตำแหน่งงาน สังกัด วันเดือนปีที่เข้ารับบริการ ที่อยู่ และหมายเลขไอพี (IP address) หรือข้อมูลการทำรายการ (log) อาจถือเป็นข้อมูลส่วนบุคคลที่สามารถระบุตัวบุคคลได้ทางตรงหรือทางอ้อมได้" [N1 หน้า 16] รายการตัวระบุทางอ้อมนี้ตรงกับ [G9 ข้อ 6]
3. "ข้อมูลที่ปราศจากชื่อสกุลหรือข้อมูลระบุตัวตน (De-identified Data) อาจถูกประมวลผลเพื่อพิสูจน์ทราบตัวบุคคลได้อีกครั้ง (Re-identification) เมื่อถูกนำไปประมวลผลร่วมกับชุดข้อมูลอื่นหรือผ่านกระบวนการอนุมานของโมเดล (Inference)" [N1 หน้า 29 ข้อ 4.1] และ "การทำให้เป็นข้อมูลนิรนามจะทำให้ข้อมูลนั้นไม่เป็นข้อมูลส่วนบุคคล แต่ในบริบทของ AI ต้องระวังความเสี่ยงในการระบุตัวตนย้อนกลับ (Re-identification)" [N1 หน้า 70 คำถาม 6.4]
4. ข้อมูลตามมาตรา 26: "ผู้พัฒนาหรือผู้ใช้งานปัญญาประดิษฐ์ควรตระหนักถึงประเด็นนี้เป็นพิเศษ เนื่องจากฐานทางกฎหมายในการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลประเภทนี้จะมีความแตกต่างจากข้อมูลส่วนบุคคลทั่วไป" [N1 หน้า 29]
5. การใช้ข้อมูลที่เก็บมาโดยไม่ต้องขอความยินยอม: ใช้หรือเปิดเผยได้ "และต้องเป็นไปตามวัตถุประสงค์ที่ได้แจ้งเจ้าของข้อมูลส่วนบุคคลไว้ก่อนหรือในขณะที่เก็บรวบรวม และควรบันทึกการใช้ข้อมูลดังกล่าวลงในบันทึกรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (Record of Processing Activities: ROPA) ตามมาตรา 39" [N1 หน้า 38 ข้อ 5.2]
6. **การป้อนข้อมูลให้ผู้ให้บริการ AI ภายนอก**: "การป้อน Prompt อัปโหลด ส่ง หรือถ่ายโอนข้อมูลส่วนบุคคลเข้าสู่ระบบปัญญาประดิษฐ์ดังกล่าว เพื่อให้ระบบประมวลผล วิเคราะห์ หรือสร้างผลลัพธ์จากข้อมูลนั้น อาจถือว่าเป็นการเปิดเผยข้อมูลส่วนบุคคลแก่ผู้ให้บริการระบบ AI ซึ่งอาจมีการจัดเก็บหรือประมวลผลข้อมูลในศูนย์ข้อมูล (Data center) ของผู้ให้บริการ ทั้งในประเทศหรือต่างประเทศ" [N1 หน้า 38–39 ข้อ 5.3]
7. **เมื่อใดไม่ถือเป็นการส่งหรือโอนไปต่างประเทศ**: "หากการรับส่งข้อมูลเกิดขึ้นเพียงเพื่อการส่งผ่านข้อมูลผ่านโครงสร้างพื้นฐานของเครือข่าย (Data transit) หรือการเก็บพักข้อมูลในลักษณะชั่วคราวหรือถาวร (Data storage) ที่ไม่มีบุคคลภายนอกเข้าถึงข้อมูลส่วนบุคคลดังกล่าว นอกเหนือจากผู้ควบคุมข้อมูลส่วนบุคคลหรือผู้ประมวลผลข้อมูลส่วนบุคคลที่เป็นผู้ส่งข้อมูลส่วนบุคคลนั้น ... โดยมีมาตรการทางเทคนิคหรือข้อกำหนดทางกฎหมายรองรับ" [N1 หน้า 39]
8. **เมื่อใดอาจถือเป็นการส่งหรือโอนไปต่างประเทศ**: "หากผู้ให้บริการระบบ AI มีการจัดเก็บหรือใช้ข้อมูลส่วนบุคคลในศูนย์ข้อมูลที่ตั้งอยู่ในต่างประเทศและมีบุคคลหรือนิติบุคคลอื่นที่ไม่ใช่ผู้ส่งข้อมูลส่วนบุคคลซึ่งอยู่ในต่างประเทศสามารถเข้าถึงข้อมูลส่วนบุคคลดังกล่าวได้ อาจถือได้ว่าเป็นการส่งหรือโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ ซึ่งทำให้ผู้ควบคุมข้อมูลส่วนบุคคลหรือผู้ประมวลผลข้อมูลส่วนบุคคลต้องปฏิบัติให้สอดคล้องกับ PDPA มาตรา 28 มาตรา 29 รวมถึงประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล ... ที่เกี่ยวข้อง" [N1 หน้า 39]
9. **ผู้ให้บริการที่นำ Prompt ไปฝึกโมเดล**: ตารางตัวอย่างสถานะทางกฎหมายมีกรณี "ให้บริการ Cloud AI แก่องค์กรธุรกิจในฐานะ Processor แต่ในเงื่อนไขการให้บริการ (Terms of Service) ระบุว่าจะนำข้อมูลที่ลูกค้าป้อนเข้าสู่ระบบ (Prompt) ไปปรับปรุงและฝึกฝนโมเดล (Fine-tuning) ของตนเอง" และอธิบายว่า "ในส่วนกิจกรรมที่นำข้อมูลลูกค้าไปฝึกฝนโมเดลของตนเอง ผู้ให้บริการนั้นจะเปลี่ยนสถานะเป็นผู้ควบคุมข้อมูลส่วนบุคคลอีกรายหนึ่ง เนื่องจากเป็นการนำข้อมูลไปใช้เพื่อวัตถุประสงค์ของตนเอง" [N1 หน้า 25]
10. **การเลือกระหว่าง On-premises, Cloud และ API**: "หากมีความเสี่ยงควรพิจารณาการติดตั้งภายใน (On-premises) ซึ่งเหมาะสมสำหรับข้อมูลความลับสูงหรือข้อมูลส่วนบุคคลอ่อนไหว ... API/Cloud: หากจำเป็นต้องใช้ ควรกำหนดมาตรการและข้อตกลง (DPA) ให้รัดกุม โดยเฉพาะการห้ามผู้ให้บริการนำข้อมูลไปใช้ฝึกโมเดล (Zero-retention policy) และควรหลีกเลี่ยงการส่งข้อมูลส่วนบุคคลทางตรงผ่าน API หากไม่จำเป็น" [N1 หน้า 69 คำถาม 4.4]
11. **AI สำเร็จรูป**: "องค์กรควรตรวจสอบผู้ให้บริการ (Due Diligence) อ่านข้อกำหนดการใช้งาน (Terms of Use) หรือ Privacy Notice ว่ามีการนำข้อมูลไปประมวลผลอย่างไร และควรตั้งค่าความเป็นส่วนตัว (Privacy Settings) ให้เหมาะสมไม่ควรใช้ค่าเริ่มต้นหากพิจารณาแล้วไม่ปลอดภัยเพียงพอ" [N1 หน้า 70 คำถาม 6.3]
12. **รายการตรวจสอบสำหรับการจัดหาและใช้งาน AI** (ภาคผนวก ข ซึ่งมีข้อความกำกับว่าเป็น "เพียงเครื่องมือพื้นฐาน" และการตรวจครบทุกข้อไม่ได้ทำให้พ้นความรับผิดตามกฎหมาย): ตรวจมาตรฐานความมั่นคงปลอดภัยของผู้ให้บริการตามประกาศปี 2565, ทำ DPIA "โดยเฉพาะในกรณีที่มีการใช้ AI เพื่อการตัดสินใจอัตโนมัติ (Automated Decision-Making) หรือการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลอ่อนไหวหรือข้อมูลส่วนบุคคลผู้เยาว์จำนวนมาก", ประกาศนโยบายการใช้งานที่ยอมรับได้ "ที่ระบุข้อห้ามชัดเจน เช่น ห้ามป้อนข้อมูลส่วนบุคคลลงใน AI สาธารณะ" และ "จัดทำข้อตกลง DPA ตามมาตรา 40 อย่างครบถ้วน โดยระบุเงื่อนไขห้ามมิให้ผู้ให้บริการนำข้อมูลส่วนบุคคลขององค์กรไปใช้ในวัตถุประสงค์หรือเงื่อนไขนอกเหนือจากข้อตกลง" [N1 หน้า 63]
13. **Log**: "ควรหลีกเลี่ยงการบันทึกข้อมูลส่วนบุคคลใน Prompt หรือ Output ลงใน Log โดยตรง หรือควรทำการ Masking ข้อมูลก่อนบันทึก" [N1 หน้า 70 คำถาม 6.5] ตรงกับกฎข้อ 8 ของ `CLAUDE.md`
14. แนวทางไม่ได้นิยาม "AI สาธารณะ" ในหน้าที่อ่าน และหน้าที่อ่านไม่มีข้อความเฉพาะสำหรับหน่วยงานของรัฐหรือหน่วยบริการสุขภาพ หน้าที่ 36 ของไฟล์มีคำว่า "Medical AI" และ "Research" ซึ่งไม่ได้อ่าน (ข้อ 7)

### 6.4 แนวทางของ สพธอ. พ.ศ. 2567 [N3]

1. เอกสารเป็นแนวทางสำหรับองค์กรทั่วไป ไม่ใช่กฎ นโยบาย AI ของหน่วยงานของรัฐสองแห่งที่เปิดดูอ้างเอกสารนี้: สำนักงานสถิติแห่งชาติอ้างเป็นเอกสารอ้างอิงรายการเดียว และใช้นิยามจาก "แนวทางการประยุกต์ใช้ Generative AI อย่างมีธรรมาภิบาลสำหรับองค์กร: สพธอ." [N4]
2. ความเสี่ยงด้านความเป็นส่วนตัว: "ข้อมูลที่ใช้ในการฝึกฝนโมเดล Generative AI อาจถูกเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลที่ส่งผลกระทบต่อความเป็นส่วนตัวได้ เช่น ข้อมูลบัตรประชาชน ประวัติการรักษา ที่อยู่ หรือข้อมูลที่สามารถระบุตัวตนได้" [N3 ข้อ 3.1 (4)]
3. ตัวอย่างนโยบายการใช้งานในภาคผนวก ข้อ 4.2 "การรักษาความลับและคุ้มครองข้อมูลส่วนบุคคล": "ด้วยแอปพลิเคชันหรือบริการ Generative AI ที่ให้บริการ โดยเฉพาะอย่างยิ่งแอปพลิเคชันหรือบริการที่ไม่มีค่าใช้จ่าย อาจมีการเข้าถึงหรือบันทึกข้อมูลที่โต้ตอบหรือข้อมูลที่ได้รับจากผู้ใช้งานสำหรับนำไปใช้ในการฝึกสอนโมเดล Generative AI ... ดังนั้นผู้ใช้งานจึงต้องมีความระมัดระวังและปฏิบัติตามนโยบาย ดังต่อไปนี้ ... 2) ไม่นำข้อมูลส่วนบุคคล (เช่น รูปภาพบุคคล ชื่อ-สกุล หมายเลขประจำตัวประชาชน ที่อยู่ หมายเลขโทรศัพท์ อีเมล ฯลฯ) และข้อมูลส่วนบุคคลที่อ่อนไหว (เช่น สำเนาบัตรประชาชนที่มีข้อมูลศาสนา ข้อมูลชีวภาพ ใบรับรองแพทย์ ฯลฯ) ไปใช้งานร่วมกับแอปพลิเคชันหรือบริการ Generative AI 3) ในกรณีที่ต้องใช้แอปพลิเคชันหรือบริการ Generative AI ร่วมกับข้อมูลภายในองค์กร ข้อมูลที่มีชั้นความลับ ข้อมูลส่วนบุคคล และข้อมูลส่วนบุคคลที่อ่อนไหว ผู้ใช้งานจะต้องใช้แอปพลิเคชันหรือบริการที่ได้รับการอนุมัติหรือจัดหาโดยสำนักงานเท่านั้น" [N3 ภาคผนวก หน้า 55]

### 6.5 กระทรวงสาธารณสุข กรมควบคุมโรค และ สพร.

1. ไม่พบประกาศ หนังสือสั่งการ หรือแนวปฏิบัติของกระทรวงสาธารณสุขหรือกรมควบคุมโรคที่กล่าวถึง generative AI โดยตรง จากการค้นเว็บสองครั้ง ผลค้นเป็นข่าวการใช้ AI ของกระทรวงและเอกสารศึกษาของสำนักงานคณะกรรมการกฤษฎีกา ซึ่งไม่ได้เปิดอ่าน (ข้อ 7)
2. ข้อความที่มีอยู่แล้วและใช้กับกรณีนี้: แนวปฏิบัติของกระทรวง "จะทำการเปิดเผยข้อมูลส่วนบุคคลต่อผู้รับข้อมูลในต่างประเทศ เฉพาะกรณีที่กฎหมายคุ้มครองข้อมูลส่วนบุคคลกำหนดให้ทำได้เท่านั้น" [D6 ตาม `data-retention-governance-facts.md` ข้อ 3.4] และพระราชบัญญัติโรคติดต่อ พ.ศ. 2558 มาตรา 10 ให้ข้อมูลจากการสอบสวนโรค "เก็บเป็นความลับและประมวลผลโดยไม่เปิดเผยชื่อ" [D5 ตาม `public-dashboard-facts.md`]
3. ไม่พบแนวปฏิบัติเรื่อง generative AI สำหรับหน่วยงานของรัฐที่ออกโดยสำนักงานพัฒนารัฐบาลดิจิทัล (สพร.): การค้นในเว็บไซต์ `dga.or.th` ด้วยคำ "Generative AI" ได้เพียงหน้าบริการ "ดี-เด่น (Ask AI)" การค้นใน `standard.dga.or.th` ด้วยคำ "AI" และ "ปัญญาประดิษฐ์" ไม่ได้รายการที่เกี่ยวข้อง และการค้นเว็บสองครั้งไม่พบ นโยบายของสำนักงานคณะกรรมการคุ้มครองผู้บริโภคที่เปิดดูอ้าง "มาตรฐานรัฐบาลดิจิทัล (DGA Standards)" เรื่องธรรมาภิบาลข้อมูลและการจัดชั้นข้อมูล ไม่ใช่เรื่อง AI ผลนี้ยืนยันไม่ได้ว่าไม่มีเอกสาร (ข้อ 7)

### 6.6 สิ่งที่ตัวบทและแนวทางกำหนดก่อนข้อมูลผู้ป่วยออกนอกประเทศ เรียงตามลำดับที่ต้องตอบ

รายการนี้เป็นการเรียงข้อความในข้อ 6.1–6.4 ไม่ใช่ความเห็นทางกฎหมาย

1. **ข้อมูลที่ส่งเป็นข้อมูลส่วนบุคคลหรือไม่** ชื่อเป็นตัวระบุทางตรง ส่วนอายุ ที่อยู่ และวันเดือนปีที่เข้ารับบริการอยู่ในรายการตัวอย่างของตัวระบุทางอ้อมใน [N1 หน้า 16] และ [G9 ข้อ 6] ชุดข้อมูลที่ตัดชื่อและบ้านเลขที่ออก แต่ยังมีอายุ เพศ หมู่บ้าน วันเริ่มป่วย และการวินิจฉัย จึงยังอาจเป็นข้อมูลส่วนบุคคล และเป็นข้อมูลสุขภาพตามมาตรา 26 แหล่งข้อมูลไม่ได้ให้เกณฑ์ว่าเมื่อใดความเสี่ยง "ต่ำเพียงพอ"
2. **การใช้ข้อมูลนี้ร่างรายงานอยู่ในวัตถุประสงค์ที่เก็บมาหรือไม่** มาตรา 27 และ [N1 ข้อ 5.2] ผูกการใช้กับวัตถุประสงค์เดิม และให้บันทึกใน ROPA
3. **ผู้ให้บริการเป็นผู้ประมวลผลข้อมูล หรือเป็นผู้ควบคุมข้อมูลอีกราย** ขึ้นกับว่าเงื่อนไขการให้บริการให้นำ Prompt ไปปรับปรุงโมเดลหรือไม่ [N1 หน้า 25] ถ้าเป็นผู้ประมวลผล ต้องมีข้อตกลงตามมาตรา 40 [N1 หน้า 63, 69]
4. **เป็นการส่งหรือโอนไปต่างประเทศหรือไม่** ขึ้นกับว่ามีบุคคลอื่นนอกจากผู้ส่งเข้าถึงข้อมูลในต่างประเทศได้หรือไม่ และมีมาตรการทางเทคนิคหรือข้อกำหนดทางกฎหมายรองรับหรือไม่ [N1 หน้า 39, N2 ข้อ 3]
5. **ถ้าเป็นการส่งหรือโอน** ต้องเข้าทางใดทางหนึ่ง: ประเทศปลายทางมีมาตรฐานเพียงพอ [G8 ข้อ 5], ข้อยกเว้นของมาตรา 28 (1)–(6) หรือมาตรการคุ้มครองที่เหมาะสมตามมาตรา 29 วรรคสาม เช่น ข้อสัญญาต้นแบบ [N2 ข้อ 8, 10]
6. **มาตรการที่แนวทางแนะนำเพิ่ม** ประเมินผลกระทบ (DPIA) เมื่อใช้ข้อมูลส่วนบุคคลอ่อนไหว, ตรวจผู้ให้บริการและตั้งค่าความเป็นส่วนตัว, หลีกเลี่ยงการส่งข้อมูลส่วนบุคคลทางตรงผ่าน API หากไม่จำเป็น และไม่บันทึก Prompt หรือ Output ที่มีข้อมูลส่วนบุคคลลง log [N1 หน้า 63, 69, 70]

## 7. สิ่งที่ไม่พบหรือยังไม่ยืนยัน

| เรื่อง | ผล | สิ่งที่ค้นแล้ว หรือสิ่งที่ต้องทำเพื่อยืนยัน |
|---|---|---|
| ขีดจำกัดอัตราของระดับฟรี (RPM, TPM, RPD) ของ `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite` | **Not Verified** หน้า Rate limits ไม่แสดงตัวเลขของรุ่นข้อความ | [A8] ทั้งหน้า ตัวเลขอยู่ที่ `https://aistudio.google.com/rate-limit` ซึ่งต้องล็อกอิน ยืนยันได้เมื่อ PO เปิดหน้านั้นด้วยบัญชีและโปรเจกต์ที่จะใช้ |
| ระยะเวลาที่ Google เก็บ prompt และคำตอบของระดับฟรีเพื่อปรับปรุงผลิตภัณฑ์ และการลบตามคำขอ | ไม่พบ | [A1], [A2], [A3], [A4] ไม่ได้เปิด Google Privacy Policy และ Google APIs Terms of Service ที่ [A1] อ้าง |
| เนื้อหาของ Data Processing Addendum for Products Where Google is a Data Processor (`business.safety.google/processorterms`): ฐานะผู้ประมวลผล ข้อสัญญามาตรฐานสำหรับการโอนข้อมูล ผู้ประมวลผลช่วง การแจ้งเหตุละเมิด และใช้กับบัญชี gmail.com ที่ไม่ใช่นิติบุคคลหรือไม่ | **Not Verified** ไม่ได้อ่าน | [A1] อ้างถึงเท่านั้น ต้องอ่านตัวข้อตกลงก่อนสรุปว่าระดับชำระเงินเข้าเงื่อนไขของมาตรา 40 และประกาศตามมาตรา 29 [N2 ข้อ 10] |
| log 55 วันเพื่อตรวจการใช้ผิดนโยบาย ซึ่งพนักงานของ Google อ่านเนื้อหาที่ถูกติดธงได้ ทำให้การใช้ระดับชำระเงินเป็น "การส่งหรือโอนไปต่างประเทศ" ตาม [N2 ข้อ 3] และ [N1 หน้า 39] หรือไม่ | แหล่งข้อมูลไม่ชัด | ตัวบทใช้เงื่อนไข "ไม่มีบุคคลภายนอกเข้าถึง ... เนื่องจากมีมาตรการทางเทคนิคหรือเงื่อนไขทางกฎหมายรองรับ" ไม่พบคำวินิจฉัยหรือข้อหารือของ สคส. เรื่องนี้ ไม่ได้เปิดหน้า "ข้อหารือตามกฎหมาย PDPA" ของ `pdpc.or.th` ยืนยันได้ด้วยการถามผู้ประสานงานคุ้มครองข้อมูลส่วนบุคคลของสำนักงานสาธารณสุขจังหวัด หรือหารือ สคส. |
| รายชื่อประเทศที่คณะกรรมการคุ้มครองข้อมูลส่วนบุคคลกำหนดว่ามีมาตรฐานเพียงพอตาม [G8 ข้อ 6] | ไม่ได้ค้น | เห็นเพียงข้อ 6 ที่ให้อำนาจกำหนด |
| ข้อจำกัด "You may not use the Services in clinical practice" ของ [A1] ครอบคลุมการร่างรายงานสอบสวนโรคของหน่วยงานสาธารณสุขหรือไม่ | แหล่งข้อมูลไม่ชัด | [A1] ไม่นิยามคำนี้ ไม่ได้เปิด Prohibited Use Policy (`policies.google.com/terms/generative-ai/use-policy`) |
| คำขอจาก Apps Script ถูกนับว่ามาจากภูมิภาคใดตามเงื่อนไข "available region" ของ [A1] | ไม่พบ | [A5] กล่าวถึงเฉพาะ Colab; [S2] ไม่ระบุที่ตั้งของช่วง IP ต้องทดสอบด้วยคำขอจริงหลัง PO อนุมัติการเรียก Gemini |
| ที่ประมวลผลของ Gemini Developer API (ประเทศหรือภูมิภาค) | ไม่พบ | [A1] ระบุเพียง "any country in which Google or its agents maintain facilities" สำหรับบริการแบบชำระเงิน |
| Vertex AI: จำนวนวันของ log เพื่อตรวจการใช้ผิดนโยบาย วิธีขอยกเว้น ราคาต่อ token และการใช้ข้อมูลของ express mode ระดับฟรี | ไม่ได้อ่านหรือไม่พบ | [C1] ส่วนที่อ่าน, [C3] ไม่ได้เปิดหน้าราคาของ Vertex AI, Service Specific Terms, Google Cloud Platform Terms of Service ข้อ 4.3 และหน้า Abuse monitoring ของ Google Cloud |
| จำนวน token จริงของข้อความไทย และจำนวน thinking token ต่อร่าง | **Not Verified** | [A17] ให้เพียง "about 4 characters" ต่อ token โดยไม่แยกภาษา ต้องวัดด้วย `countTokens` และช่องการใช้ token ของคำตอบจริงกับข้อมูลสมมติ หลัง PO อนุมัติ |
| เวลาตอบของคำขอขนาดหนึ่งร่าง | ไม่พบ | [A15], [A17] ไม่มีตัวเลข ต้องวัดเอง |
| ตัวกรองความปลอดภัยและรหัส `spii` กับข้อความเรื่องโรค อาการ การเสียชีวิต และข้อมูลระบุตัวผู้ป่วยภาษาไทย | **Not Verified** เอกสารไม่ระบุพฤติกรรม | [A13], [A14], [A16] ต้องทดสอบด้วยข้อมูลสมมติ |
| คุณภาพของภาษาไทยแบบหนังสือราชการที่แต่ละรุ่นเขียน | ไม่ได้ตรวจ | อยู่นอกสิ่งที่เอกสารตอบได้ ต้องเปรียบเทียบผลจริงของรุ่นที่เลือกกับข้อมูลสมมติ |
| ไฟล์ DOCX ที่ส่งออกจาก Google Docs: อ้างชื่อแบบอักษร `Sarabun` หรือฝังแบบอักษร และการจัดหน้าเมื่อเปิดใน Word | **Not Verified** | [W1], [W3] ไม่ระบุ ไม่ได้เปิดศูนย์ช่วยเหลือของ Google Docs เรื่องไฟล์ Office ต้องทดสอบส่งออกจริง |
| ไลบรารี `docx`: แบบอักษรและขนาดของข้อความไทย การฝังแบบอักษรเมื่อเปิดใน Word รุ่นที่หน่วยงานใช้ ขนาดของไลบรารีในหน้าเว็บ และการทำงานบนมือถือ | **Not Verified** ไม่ได้ทดลองรัน | [W10] อ่านเอกสารเท่านั้น ไม่ได้เปิดมาตรฐานของรูปแบบไฟล์ Word |
| หน้า HTML สำหรับพิมพ์: การตัดหน้า หัวและท้ายกระดาษที่เบราว์เซอร์เติม และการแปลง PDF ภาษาไทยกลับเป็น Word | ไม่ได้ทดสอบ | [W9], [W11] |
| หนังสือเวียนของสำนักนายกรัฐมนตรีที่กำหนดแบบอักษรของหนังสือราชการ และมติคณะรัฐมนตรีเรื่องแบบอักษรมาตรฐานราชการ | **Not Verified** พบเฉพาะแหล่งทุติยภูมิ [W12] | `opm.go.th` เชื่อมต่อไม่ได้ `soc.go.th` ตอบ 403 ค้นเว็บสองครั้งได้เพียงบทความ Wikipedia เรื่อง National Fonts และคู่มือของหน่วยงานอื่น ซึ่งไม่ได้ใช้เป็นข้อเท็จจริง เลขที่และวันที่ของหนังสือและมติจึงไม่ได้บันทึก |
| TH SarabunIT๙: ข้อกำหนดให้ใช้ และการมีอยู่บนเครื่องของหน่วยงานรัฐ | **Not Verified** ไม่พบแหล่งปฐมภูมิ | ไม่อยู่ในรายการ cloud font ของ [W7] และไม่อยู่ใน [W6] ยืนยันได้ด้วยการดูรายการแบบอักษรบนเครื่องของ สสอ. และ รพ.สต. |
| รุ่นของ Microsoft Office ที่ สสอ. และ รพ.สต. ใช้ (Microsoft 365 แบบสมาชิก หรือแบบซื้อขาด หรือโปรแกรมอื่น) | ไม่ทราบ เป็นข้อเท็จจริงของอำเภอ | ต้องถาม PO เพราะกำหนดว่า cloud font ของ [W7] ใช้ได้หรือไม่ |
| แนวทาง [N1] อีก 70 หน้า รวมหน้าที่มีคำว่า Medical AI, Research, DPIA, Legitimate Interest และบทเรื่องความมั่นคงปลอดภัย | ไม่ได้อ่าน | ชั้นข้อความของไฟล์เสีย ต้องอ่านจากภาพทีละหน้า ไฟล์ "ฉบับเนื้อหา" 75 หน้าในหน้า `https://www.pdpc.or.th/28888/` ดาวน์โหลดแล้วไม่ได้เทียบกับฉบับราชกิจจานุเบกษา |
| แนวปฏิบัติเรื่อง generative AI ของ สพร. สำหรับหน่วยงานของรัฐ | ไม่พบ ยืนยันไม่ได้ว่าไม่มี | ค้น `dga.or.th` และ `standard.dga.or.th` อย่างละหนึ่งถึงสองคำ และค้นเว็บสองครั้ง |
| ประกาศ หนังสือสั่งการ หรือแนวปฏิบัติของกระทรวงสาธารณสุขและกรมควบคุมโรคเรื่อง AI หรือ generative AI และนโยบายความมั่นคงปลอดภัยสารสนเทศของกระทรวง | ไม่พบ ยืนยันไม่ได้ว่าไม่มี | ค้นเว็บสองครั้ง เว็บไซต์ `moph.go.th`, `ops.moph.go.th`, `ict.moph.go.th` ตอบ 403 ตามที่ `data-retention-governance-facts.md` บันทึก ไม่ได้ลองซ้ำ ยืนยันได้ด้วยการถามกลุ่มงานพัฒนายุทธศาสตร์สาธารณสุขหรือผู้ดูแลระบบสารสนเทศของสำนักงานสาธารณสุขจังหวัด |
| เอกสาร "AI และการคุ้มครองข้อมูลส่วนบุคคลในทางการแพทย์" ของสำนักงานคณะกรรมการกฤษฎีกา และเอกสาร "AI in Government Services" ของ สพธอ. | ไม่ได้อ่าน | ปรากฏในผลค้นเว็บเท่านั้น |
| ฉบับแก้ไขเพิ่มเติมของ [D4] และของ [G8], [N2] | ไม่ได้ตรวจ | ตามที่ `data-retention-governance-facts.md` บันทึก |
| เนื้อหาของแนวทาง [N3] ส่วนที่ 4 (แนวทางการนำ Generative AI มาประยุกต์ใช้ในองค์กร) | ไม่ได้อ่าน | อ่านเฉพาะสารบัญ ข้อ 3.1 (4) และภาคผนวก |

## 8. ข้อสังเกตต่อการออกแบบ

รายการต่อไปนี้เป็นข้อสังเกตจากแหล่งข้อมูล ไม่ใช่การตัดสินใจ และไม่ใช่ความเห็นทางกฎหมาย

1. **ระดับฟรีของ Gemini API ใช้กับข้อมูลผู้ป่วยจริงไม่ได้ตามเงื่อนไขของ Google เอง** [A1] เขียนว่า "Do not submit sensitive, confidential, or personal information to the Unpaid Services" เนื้อหาถูกใช้ปรับปรุงผลิตภัณฑ์และคนอ่านได้ และตามตัวอย่างของ [N1 หน้า 25] ผู้ให้บริการที่นำ Prompt ไปปรับปรุงโมเดลเป็นผู้ควบคุมข้อมูลอีกรายหนึ่ง ข้อมูลที่ตัดชื่อและบ้านเลขที่ออกยังอยู่ในข้อห้ามนี้ได้ เพราะอายุ ที่อยู่ และวันที่รับบริการเป็นตัวระบุทางอ้อม [N1 หน้า 16] และการวินิจฉัยเป็นข้อมูลสุขภาพ ระดับฟรีจึงเหลือที่ใช้เฉพาะช่วงพัฒนาที่ระบบมีแต่ข้อมูลสมมติตามกฎข้อ 4 ของ `CLAUDE.md` และยังมีเงื่อนไขการยืนยันโปรเจกต์ด้วยโทรศัพท์ [A11]
2. **ระดับชำระเงินตัดการนำไปฝึกโมเดล แต่ไม่ตัดการเก็บ** Google ประมวลผลตาม Data Processing Addendum [A1] แต่เก็บ prompt และคำตอบ 55 วันเพื่อตรวจการใช้ผิดนโยบาย ซึ่งพนักงานที่ได้รับอนุญาตอ่านเนื้อหาที่ถูกติดธงได้ [A2] และข้อมูลอาจอยู่ในประเทศใดก็ได้ [A1] Gemini Developer API ไม่มีทางปิด log นี้ [A3] การตั้งค่าที่ลดการเก็บลงได้คือ `store=false` ใน Interactions API (ค่าเริ่มต้นเก็บ 55 วัน) และปิด Logs ของโปรเจกต์ใน AI Studio (ค่าเริ่มต้นเปิดสำหรับ Interactions API) [A4, A16] ทั้งสองอย่างเป็นค่าเริ่มต้นที่ [N1 คำถาม 6.3] บอกว่าไม่ควรใช้โดยไม่พิจารณา
3. **ฐานะทางกฎหมายของการใช้ระดับชำระเงินยังไม่มีแหล่งใดตอบ** สองคำถามที่ต้องมีผู้ตอบก่อนใช้ข้อมูลจริง คือ (ก) ข้อตกลงของ Google เป็นข้อตกลงตามมาตรา 40 และมีข้อสัญญาที่ [N2 ข้อ 10] ยอมรับหรือไม่ และใช้กับบัญชี gmail.com ส่วนบุคคลหรือไม่ และ (ข) log 55 วันทำให้เป็นการส่งหรือโอนไปต่างประเทศหรือไม่ ถ้าเป็น ทางที่ตัวบทเปิดคือข้อยกเว้นของมาตรา 28 เช่น (6) หรือมาตรการคุ้มครองที่เหมาะสมตามมาตรา 29 วรรคสาม (ข้อ 6.6) คำถามทั้งสองเป็นเรื่องของผู้ควบคุมข้อมูล ซึ่ง `data-retention-governance-facts.md` บันทึกว่ายังไม่ทราบว่าคือหน่วยงานระดับใด
4. **ส่งข้อมูลให้น้อยที่สุดเป็นทางที่แหล่งข้อมูลชี้ตรงกัน** [N1 คำถาม 4.4] ให้ "หลีกเลี่ยงการส่งข้อมูลส่วนบุคคลทางตรงผ่าน API หากไม่จำเป็น" รายงานสอบสวนโรคมีส่วนที่เป็นข้อความบรรยายกับส่วนที่เป็นรายการผู้ป่วย ระบบเติมชื่อ บ้านเลขที่ และตารางรายผู้ป่วยจากตารางของตนเองลงในเอกสารได้หลังโมเดลตอบ โดยไม่ส่งช่องเหล่านั้นไปที่ Gemini สิ่งที่ส่งจึงเหลือข้อมูลของเหตุการณ์และจำนวนรวม ซึ่งยังอาจเป็นข้อมูลส่วนบุคคลเมื่อจำนวนผู้ป่วยในหมู่บ้านมีน้อย (เกณฑ์จำนวนน้อยอยู่ใน `public-dashboard-facts.md`) การออกแบบนี้ลดความเสี่ยงแต่ไม่ได้ทำให้คำถามในข้อ 3 หมดไป
5. **ค่าใช้จ่ายไม่เป็นศูนย์อีกต่อไป แต่ต่ำ** ระดับชำระเงินต้องผูก Cloud Billing account กับบัญชีส่วนบุคคลและเติมเงินขั้นต่ำ $5 ซึ่งหมดอายุใน 12 เดือน [A10] ค่า token ของ 200 ร่างต่อปีอยู่ที่ประมาณ $1.43 (`gemini-3.5-flash-lite`) ถึง $4.65 (`gemini-4-hydrogen`) ก่อนนับ thinking token (ข้อ 3.5) รายจ่ายจริงจึงประมาณ $5 ต่อปี และการเติมเงินต้องมีบัตรหรือวิธีชำระเงินของ PO เพดานรายเดือนของโปรเจกต์ตั้งได้ใน AI Studio [A10]
6. **รุ่นและราคาเปลี่ยนเร็ว** ในรอบ 12 เดือนที่ผ่านมามีรุ่นข้อความออกใหม่และถูกปิดหลายรุ่น `gemini-2.5-pro` และ `gemini-2.5-flash` ถูกส่งต่อไปรุ่นอื่นตั้งแต่ 1 ธันวาคม 2026 และราคาของ `gemini-3.8-flash` กับ `gemini-3.6-flash` ขึ้นเท่าตัวตั้งแต่ 1 มกราคม 2027 [A7, A9] ชื่อรุ่นจึงควรเป็นค่าตั้งที่เปลี่ยนได้โดยไม่แก้โค้ด เช่น Script Property `GEMINI_MODEL` และตัวเลขในเอกสารนี้ต้องตรวจซ้ำก่อนใช้ รุ่นที่เอกสารแนะนำสำหรับโปรเจกต์ใหม่และมีระดับฟรีสำหรับช่วงพัฒนาคือ `gemini-4-hydrogen` และ `gemini-3.5-flash-lite` [A6] คำขอไม่ควรส่ง `temperature` [A15]
7. **การเรียกจาก Apps Script ทำได้ในคำขอเดียว** ขนาดและโควตาไม่เป็นข้อจำกัด (ข้อ 4.1) สิ่งที่โค้ดต้องทำตามเอกสาร: ตั้ง `muteHttpExceptions` และ `timeoutSeconds`, แยกข้อผิดพลาดที่ลองใหม่ได้ (429 ต่อนาที, 5xx) จากที่ลองใหม่ไม่ได้ (400, 402, 403, 429 รายวัน), จำกัดจำนวนรอบ, ตรวจทั้งรหัส HTTP และเหตุที่ถูกบล็อก, ตรวจค่าใน JSON ที่ได้แม้ใช้ schema และไม่บันทึก prompt หรือคำตอบลง log [A12, A14, A15, S2, N1 คำถาม 6.5] หน้าจอเห็นผลครั้งเดียวเมื่อเสร็จ เพราะไม่มี streaming การลดระดับ thinking ลดทั้งเวลารอและค่าใช้จ่าย [A15, A17]
8. **ทางสร้างเอกสารที่ได้ทั้งการแก้ไขต่อใน Word และไม่มีไฟล์ที่ server คือ (ข)** ทาง (ก) สร้างไฟล์ที่มีข้อมูลผู้ป่วยใน Drive และค้างในถังขยะได้ 30 วัน ซึ่งขัดกับกฎข้อ 8 ของ `CLAUDE.md` ตามตัวอักษร ทาง (ค) ไม่ให้แก้ไขต่อใน Word โดยตรง ทาง (ข) ใช้แม่แบบ .docx ที่จัดหน้าใน Word แล้วเติมด้วย `patchDocument` ได้ [W10] ไฟล์ที่ดาวน์โหลดอยู่ในเครื่องของเจ้าหน้าที่ ซึ่งอยู่นอกตารางเช่นกัน แต่เป็นสิ่งเดียวกับที่ฟีเจอร์ส่งออกอื่นของระบบทำ
9. **แบบอักษรขึ้นกับเครื่องของหน่วยงาน ซึ่งยังไม่ทราบ** ชื่อที่ Microsoft 365 มีให้เองคือ `TH SarabunPSK` [W7] ชื่อใน Google Docs คือ `Sarabun` [W4] สองชื่อนี้ไม่ใช่ชื่อเดียวกันในสายตาของ Word ก่อนเลือกต้องรู้ว่าเครื่องของ สสอ. ใช้ Office แบบใดและมีแบบอักษรใดติดตั้ง ซึ่งเป็นข้อเท็จจริงของอำเภอที่ถาม PO ได้ และต้องทดสอบไฟล์จริงบนเครื่องนั้น การฝังแบบอักษรในไฟล์เป็นทางที่ไม่ขึ้นกับเครื่อง [W8, W10] แต่ยังไม่ได้ทดสอบ
10. **ร่างของ AI ต้องผ่านคนก่อนใช้** เงื่อนไขของ Google เขียนว่า "Use discretion before relying on, publishing, or otherwise using content provided by the Services." [A1] และ [N3] ระบุข้อจำกัดด้านภาษาไทยและบริบทของประเทศไทย ฟีเจอร์ที่ PO กำหนด (เจ้าหน้าที่แก้ไข พิมพ์ และลงนาม) ตรงกับข้อนี้ เอกสารนี้ไม่ได้ตรวจว่าต้องระบุในรายงานหรือไม่ว่าใช้ AI ช่วยร่าง
11. **เอกสารของโครงการที่ต้องแก้เมื่อฟีเจอร์นี้เข้ารุ่นแรก** ตารางจุดอนุมัติของ ADR-0008 เขียนว่าการเรียก Gemini จริงต้องอนุมัติ "ก่อนเปิดใช้ความสามารถ AI ในรุ่นถัดไป" ซึ่งไม่ตรงกับการย้ายฟีเจอร์นี้มารุ่นแรก และกฎข้อ 8 ของ `CLAUDE.md` ("ข้อมูลผู้ป่วยอยู่ในตารางเท่านั้น") ยังไม่มีข้อความเรื่องการส่งข้อมูลให้บริการภายนอกหรือไฟล์เอกสารที่ระบบสร้าง ตาม `CLAUDE.md` ข้อ 1 เรื่องนี้ต้องรายงาน PO
12. **สิ่งที่ต้องมีก่อนเปิดใช้กับข้อมูลจริง ตามรายการของ [N1 ภาคผนวก ข]** การตรวจผู้ให้บริการ การประเมินผลกระทบ (DPIA) นโยบายการใช้งานที่ยอมรับได้ และข้อตกลงการประมวลผลข้อมูล รายการนี้เพิ่มจากรายการในข้อ 4 ของ `data-retention-governance-facts.md` และควรอยู่ในเกณฑ์ของการเริ่มใช้ข้อมูลจริงในช่วงที่ 7 ของ roadmap

