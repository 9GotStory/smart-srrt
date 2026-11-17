# ข้อเท็จจริงสำหรับฟีเจอร์ข้อความ LINE: URL scheme, เบราว์เซอร์ในแอป, การล็อกอิน และแนวทางเรื่องข้อมูลผู้ป่วย

วันที่ค้นคว้า: 17 พฤศจิกายน 2569 (ค.ศ. 2026) เอกสารนี้เป็นผลการค้นคว้า ไม่ใช่ข้อกำหนดของระบบ

**สรุป** LINE มี URL scheme ที่เปิดหน้า "Share with" พร้อมข้อความให้ผู้ใช้เลือกแชตเองคือ `https://line.me/R/share?text={text_message}` ใช้ได้บน LINE for iOS และ Android เท่านั้น ไม่รองรับ LINE for PC และเอกสารไม่มีพารามิเตอร์เลือกกลุ่มล่วงหน้า เอกสารของทั้งสองฝ่ายระบุตรงกันว่าการล็อกอินด้วย Google ใช้ไม่ได้ในเบราว์เซอร์ในแอปของ LINE: LINE เขียนไว้ใน FAQ ว่าได้ error `403 disallowed_useragent` และ Google Identity Services เขียนว่า "Android and iOS webviews are not supported for user sign-in" LINE มีพารามิเตอร์ `openExternalBrowser=1` สำหรับให้ลิงก์เปิดในเบราว์เซอร์ของเครื่อง เมื่อผู้ใช้เปิดค่าตั้ง URL previews ลิงก์ที่ส่งในแชตถูกส่งไปยังเซิร์ฟเวอร์ของ LINE และเซิร์ฟเวอร์นั้นเปิดหน้าเว็บเพื่อสร้างตัวอย่างลิงก์จาก `og:title`, `og:description`, `og:image` หรือจาก title และเนื้อหาของหน้าเมื่อไม่มี OGP ด้านแนวทางของงานสาธารณสุข ประกาศคณะกรรมการสุขภาพแห่งชาติ พ.ศ. 2559 นับ LINE เป็นสื่อสังคมออนไลน์ และให้ลบข้อมูลระบุตัวตนของผู้ป่วยทั้งหมดก่อนเผยแพร่เมื่อไม่มีความยินยอม รวมถึงระวังรายละเอียดที่ทำให้คาดเดาตัวผู้ป่วยได้ภายหลัง ไม่พบเอกสารของกรมควบคุมโรคที่กำหนดรายการข้อมูลหรือช่องทางของการแจ้ง รพ.สต. ภายใน 3 ชั่วโมงในมาตรการ 3-3-1 ไม่พบจำนวนตัวอักษรสูงสุดของข้อความแชตที่ผู้ใช้พิมพ์เอง ไม่พบ user agent ของตัวดึงตัวอย่างลิงก์ และไม่พบความยาวสูงสุดของ `text` ใน URL scheme

## 1. แหล่งข้อมูล

วิธีอ่าน: หน้าเว็บดาวน์โหลด HTML ด้วย `curl` แล้วอ่านข้อความเอง เว้นแต่ระบุเป็นอย่างอื่น PDF ดาวน์โหลดแล้วสกัดข้อความด้วย `pdftotext -layout` ทุกแหล่งอ่านเมื่อ 17 พฤศจิกายน 2569 รหัสในวงเล็บเหลี่ยมใช้อ้างอิงในส่วนถัดไป ข้อความภาษาไทยที่ยกมาจาก PDF ที่ชั้นข้อความเสีย (วรรณยุกต์หาย หรือสระสลับ) แก้ตัวสะกดแล้ว เว็บไซต์ราชกิจจานุเบกษา (ratchakitcha.soc.go.th) ตอบ HTTP 403 จึงอ่านสำเนาที่มีหัวกระดาษราชกิจจานุเบกษาจากเว็บไซต์อื่น และระบุที่มาของสำเนาไว้ในตาราง

### 1.1 แหล่งทางเทคนิค

| รหัส | เอกสาร | ผู้เผยแพร่ | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|
| T1 | Using LINE features with the LINE URL scheme | LY Corporation (LINE Developers) | `https://developers.line.biz/en/docs/line-login/using-line-url-scheme/` | หน้าเอกสารปัจจุบัน | อ่าน HTML ทั้งหน้า |
| T2 | Using Share buttons (LINE Social Plugins) | LY Corporation | `https://developers.line.biz/en/docs/line-social-plugins/install-guide/using-line-share-buttons/` | หน้าเอกสารปัจจุบัน | อ่าน HTML ทั้งหน้า |
| T3 | LINE Developers FAQ | LY Corporation | `https://developers.line.biz/en/faq/` หัวข้อ `#social-login-with-google-does-not-work-in-the-liff-browser-or-lines-in-app-browser`, `#how-are-the-url-previews-generated`, `#why-do-urls-in-text-messages-sometimes-not-become-links`, `#share-preview-not-possible` | หน้าเอกสารปัจจุบัน | อ่าน HTML เฉพาะหัวข้อที่เกี่ยวข้อง |
| T4 | ข่าว LINE Developers: "LINE URL scheme of 'line://' is deprecated" (25 มี.ค. 2020), "LINE Notify service will be discontinued on March 31, 2025" (7 ต.ค. 2024), "LINE Notify service has been terminated as of March 31, 2025" (1 เม.ย. 2025) | LY Corporation | `https://developers.line.biz/en/news/2020/03/25/line-url-scheme-deprecation/`, `https://developers.line.biz/en/news/2024/10/07/line-notify-will-be-discontinued/`, `https://developers.line.biz/en/news/2025/04/01/line-notify/` | ประกาศ | อ่านเนื้อข่าวจากหน้ารวมข่าวรายปี `https://developers.line.biz/en/news/<ปี>/` ซึ่งมีเนื้อข่าวเต็ม และค้นคำในหน้ารวมข่าวปี 2018–2026 |
| T5 | End of service for LINE Notify (มีฉบับภาษาไทยในหน้าเดียวกัน) | LY Corporation | `https://notify-bot.line.me/closing-announce` | ประกาศ | อ่าน HTML ทั้งหน้า |
| T6 | Messaging API pricing | LY Corporation | `https://developers.line.biz/en/docs/messaging-api/pricing/` | หน้าเอกสารปัจจุบัน | อ่าน HTML ทั้งหน้า |
| T7 | แพ็กเกจจำนวนข้อความบรอดแคสต์ ของ LINE Official Account ประเทศไทย | LINE for Business ประเทศไทย | `https://lineforbusiness.com/th/service/line-oa-features/broadcast-message` (หน้าที่ [T6] ลิงก์ไปในแถว Thailand) | หน้าเว็บปัจจุบัน | อ่าน HTML เฉพาะตารางแพ็กเกจ |
| T8 | LINE Help Center: About Letter Sealing (`contentId=50000087`), Customizing chats (`20005811`), Detecting phishing sites sent in chats (`200001870`), [LINE Labs] [iPhone/iPad] Opening links in chats with your default browser (`20023875`), [LINE Labs] Scheduling messages (`200003148`) | LY Corporation | `https://help.line.me/line/smartphone/sp?contentId=<contentId>&lang=en` | หน้าช่วยเหลือปัจจุบัน | อ่าน HTML แต่ละบทความ และใช้ช่องค้นหาของ Help Center (`/line/smartphone/search?q=...`) ภาษาอังกฤษ ไทย และญี่ปุ่น |
| T9 | LINE Developers Glossary, LIFF overview, The differences between the LIFF browser and external browser | LY Corporation | `https://developers.line.biz/en/glossary/`, `https://developers.line.biz/en/docs/liff/overview/`, `https://developers.line.biz/en/docs/liff/differences-between-liff-browser-and-external-browser/` | หน้าเอกสารปัจจุบัน | อ่าน HTML เฉพาะส่วนที่เกี่ยวข้อง |
| T10 | Modernizing OAuth interactions in Native Apps for Better Usability and Security (22 ส.ค. 2016) | Google Developers Blog | `https://developers.googleblog.com/2016/08/modernizing-oauth-interactions-in-native-apps.html` | ประกาศ ถูกแทนด้วยกำหนดบังคับใน [T11] | อ่าน HTML ทั้งหน้า |
| T11 | Upcoming security changes to Google's OAuth 2.0 authorization endpoint in embedded webviews (29 มิ.ย. 2021) | Google Developers Blog | `https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html` | ประกาศ | อ่าน HTML ทั้งหน้า |
| T12 | OAuth 2.0 Policies หัวข้อ "Use secure browsers" | Google for Developers | `https://developers.google.com/identity/protocols/oauth2/policies` | นโยบายปัจจุบัน | อ่าน HTML เฉพาะหัวข้อ |
| T13 | Using OAuth 2.0 for Web Server Applications หัวข้อ error `disallowed_useragent` (Last updated 2026-11-16 UTC) | Google for Developers | `https://developers.google.com/identity/protocols/oauth2/web-server` | หน้าเอกสารปัจจุบัน | อ่าน HTML เฉพาะหัวข้อ |
| T14 | Sign in with Google for Web: Supported browsers and platforms (Last updated 2026-09-01 UTC) | Google for Developers | `https://developers.google.com/identity/gsi/web/guides/supported-browsers` | หน้าเอกสารปัจจุบัน | อ่าน HTML ทั้งหน้า เครื่องหมายในตารางความเข้ากันได้เป็นรูปภาพ จึงอ่านไม่ได้จากข้อความ |
| T15 | Web Share API, W3C Recommendation 30 May 2023 | W3C | `https://www.w3.org/TR/web-share/` | Recommendation | อ่าน HTML ทั้งหน้า |
| T16 | Clipboard API and events, W3C Working Draft 24 June 2026 | W3C | `https://www.w3.org/TR/clipboard-apis/` และ Editor's Draft วันเดียวกันที่ `https://w3c.github.io/clipboard-apis/` | Working Draft | อ่านหัวเอกสารจากฉบับ TR และอ่านขั้นตอนของ `writeText()` กับข้อ 9.2 จาก Editor's Draft |
| T17 | MDN: `Navigator.share()`, `Clipboard.writeText()`, Clipboard API | MDN (Mozilla และผู้ร่วมเขียน) | `https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share`, `.../Web/API/Clipboard/writeText`, `.../Web/API/Clipboard_API` | หน้าเอกสารปัจจุบัน | อ่าน HTML เฉพาะส่วนข้อกำหนดและความปลอดภัย |
| T18 | ข้อมูลความเข้ากันได้ของเบราว์เซอร์: MDN browser-compat-data (`api/Navigator.json`, `api/Clipboard.json` แก้ไขล่าสุด 16 พ.ย. 2026) และ caniuse (`features-json/web-share.json`, `features-json/async-clipboard.json` แก้ไขล่าสุด 11 พ.ย. 2026) | MDN และ caniuse | `https://github.com/mdn/browser-compat-data`, `https://github.com/Fyrd/caniuse` | ข้อมูลปัจจุบัน | อ่านไฟล์ JSON โดยตรง |
| O1 | การสังเกตคำตอบ HTTP ของ `line.me` และ `social-plugins.line.me` ด้วย `curl` โดยส่ง User-Agent ของ Chrome บน Linux, Safari บน iPhone และ Chrome บน Android | ผู้ค้นคว้า | — | **การสังเกต ไม่ใช่เอกสาร** และไม่ใช่การทดสอบบนมือถือจริง | ดูเฉพาะรหัสสถานะ, `Location` และ HTML ที่ได้กลับมา |

### 1.2 แหล่งด้านงานสาธารณสุข

| รหัส | เอกสาร | ผู้ออก | URL | สถานะ | วิธีอ่าน |
|---|---|---|---|---|---|
| D1 | ประกาศคณะกรรมการสุขภาพแห่งชาติ เรื่อง แนวทางปฏิบัติในการใช้งานสื่อสังคมออนไลน์ของผู้ปฏิบัติงานด้านสุขภาพ พ.ศ. 2559 (รจ. เล่ม 134 ตอนพิเศษ 88 ง, 24 มี.ค. 2560 ประกาศ ณ วันที่ 30 ธ.ค. 2559) | คณะกรรมการสุขภาพแห่งชาติ | สำเนามีหัวกระดาษราชกิจจานุเบกษา อยู่ในไฟล์รวมกฎหมาย 219 หน้าของโรงพยาบาลลับแล: `https://laplaehospital.moph.go.th/file/2026-MOIT2-1.5-09-03-2569-01-37-45.pdf` หน้า 1–12 ของไฟล์ | ไม่ได้ตรวจว่ามีฉบับแก้ไขหรือยกเลิก | สกัดข้อความ ชั้นข้อความของแนวทางแนบท้ายไม่มีวรรณยุกต์ อ่านคำปรารภ ข้อ 1–3 และข้อ 19–27 และค้นคำทั้ง 27 ข้อ |
| D2 | พระราชบัญญัติสุขภาพแห่งชาติ พ.ศ. 2550 (รจ. เล่ม 124 ตอนที่ 16 ก, 19 มี.ค. 2550) | รัฐสภา | สำเนามีหัวกระดาษราชกิจจานุเบกษา จากเว็บไซต์จุฬาลงกรณ์มหาวิทยาลัย: `https://www.research.chula.ac.th/wp-content/uploads/2026/04/9.พรบ.สุขภาพแห่งชาติ-2550.pdf` | ไม่ได้ตรวจฉบับแก้ไขเพิ่มเติม | สกัดข้อความ อ่านมาตรา 7 และ 49 |
| D3 | ระเบียบกระทรวงสาธารณสุข ว่าด้วยการคุ้มครองและจัดการข้อมูลด้านสุขภาพของบุคคล พ.ศ. 2561 (รจ. เล่ม 135 ตอนพิเศษ 124 ง, 31 พ.ค. 2561 ประกาศ ณ วันที่ 28 มี.ค. 2561) | กระทรวงสาธารณสุข | สำเนามีหัวกระดาษราชกิจจานุเบกษา จากเว็บไซต์ศูนย์สุขภาพจิตที่ 9 กรมสุขภาพจิต: ลิงก์ในหน้า `https://mhc9dmh.com/newweb/public/posts/449` หน้ากฎหมายของสำนักงานปลัดกระทรวง (ops.moph.go.th) ตอบ 403 และลิงก์ไฟล์ตอบ 404 | ไม่ได้ตรวจว่ามีฉบับแก้ไขหรือยกเลิก | สกัดข้อความ ค้นคำทั้งฉบับ 19 หน้า และอ่านข้อ 4, 11–15, 25–26 |
| D4 | พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (รจ. เล่ม 136 ตอนที่ 69 ก, 27 พ.ค. 2562) | รัฐสภา | สำเนามีหัวกระดาษราชกิจจานุเบกษา ในไฟล์เดียวกับ [D1] หน้า 49 เป็นต้นไปของไฟล์ | ไม่ได้ตรวจกฎหมายลำดับรองของคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล | สกัดข้อความ อ่านมาตรา 26, 27 และ 37 |
| D5 | พระราชบัญญัติโรคติดต่อ พ.ศ. 2558 (รหัส L1 ใน [`event-handling-standards.md`](event-handling-standards.md)) | รัฐสภา | `https://ddc.moph.go.th/uploads/ckeditor/c74d97b01eae257e44aa9d5bade97baf/files/001_1gcd.PDF` | ตามที่ระบุในเอกสารเดิม | สกัดข้อความ อ่านมาตรา 10 |
| D6 | แนวปฏิบัติการคุ้มครองข้อมูลส่วนบุคคล กระทรวงสาธารณสุข ฉบับที่ 1 มิ.ย. 2565 (รหัสเอกสาร P-IT-SP-03.01 Rev.00) และแนวปฏิบัติการคุ้มครองข้อมูลส่วนบุคคล กรมควบคุมโรค (ไฟล์สร้าง ก.พ. 2566) | กระทรวงสาธารณสุข และกรมควบคุมโรค | ลิงก์ชื่อเดียวกันในหน้า `https://ddc.moph.go.th/dvb/pagecontent.php?page=1458&dept=dvb` | ไม่ทราบว่ามีฉบับใหม่กว่า | สกัดข้อความ ค้นคำทั้งฉบับ |
| D7 | มาตรการควบคุมโรคไข้เลือดออก 3 – 3 - 1 – 7 – 14 – 21 – 28 (แผ่นเดียว ไฟล์สร้าง พ.ค. 2562) | กองโรคติดต่อนำโดยแมลง กรมควบคุมโรค | ลิงก์ "มาตรการควบคุมโรคไข้เลือดออก 3-3-1" ในหน้า `https://www.ddc.moph.go.th/dvb/news.php?news=1133&deptcode=dvb` | ไม่ทราบว่ามีฉบับใหม่กว่า | สกัดข้อความทั้งหน้า |
| D8 | รายงานพยากรณ์โรคไข้เลือดออก ปี 2563 ข้อ 3.2 หน้า 51 (แหล่งที่โครงการใช้อยู่เดิม) | กรมควบคุมโรค | `https://ddc.moph.go.th/uploads/publish/1026820250203023324.pdf` | ตามเดิม | สกัดข้อความ อ่านข้อ 3.2 ทั้งข้อ |
| D9 | แนวทางการดำเนินงานเฝ้าระวัง ป้องกัน ควบคุมโรคติดต่อนำโดยยุงลาย สำหรับเจ้าหน้าที่สาธารณสุข พ.ศ. 2564 (ISBN 978-616-11-4691-7, พิมพ์ครั้งที่ 1 ส.ค. 2564) | กองโรคติดต่อนำโดยแมลง กรมควบคุมโรค | e-book ที่หน้า [D7] ลิงก์ไป: `https://online.fliphtml5.com/bcbgj/nfvi/` | ฉบับล่าสุดที่หน้าแนวทางของกองแสดง | อ่านจากดัชนีข้อความของ e-book (140 หน้า) ลำดับสระและวรรณยุกต์ในดัชนีเสีย ค้นคำทั้งเล่ม และอ่านหน้า 32–34 กับหน้า 56 |
| D10 | แนวทางการปฏิบัติงานเฝ้าระวัง ป้องกัน ควบคุมโรคไข้เลือดออก ตามพระราชบัญญัติโรคติดต่อ พ.ศ. 2558 (14 หน้า ไฟล์สร้าง พ.ค. 2560) | กรมควบคุมโรค | ลิงก์ชื่อเดียวกันในหน้า [D7] | เก่ากว่า [D9] | สกัดข้อความ ค้นคำทั้งฉบับ |
| D11 | แนวทางการเฝ้าระวังป้องกันควบคุมโรคไข้เลือดออกในเขตเมือง (Urban Dengue Unit Guideline, 141 หน้า ไฟล์สร้าง พ.ค. 2561) | สถาบันป้องกันควบคุมโรคเขตเมือง กรมควบคุมโรค | `https://ddc.moph.go.th/uploads/publish/1080520201216080456.pdf` | ใช้กับเขตเมือง | สกัดข้อความ ค้นคำทั้งฉบับ |
| S1 | มาตรฐานและแนวทางปฏิบัติงานทีมเฝ้าระวังสอบสวนควบคุมโรคและภัยสุขภาพ 2563 (รหัสเดียวกับเอกสารเดิม) | กองระบาดวิทยา กรมควบคุมโรค | `https://ddc.moph.go.th/uploads/publish/1119320210312043053.pdf` | ตามที่ระบุในเอกสารเดิม | สกัดข้อความ ค้นคำ "ไลน์", "Line", "social", "แจ้งเตือน", "โทรศัพท์", "ช่องทาง" ทั้งเล่ม เลขหน้าที่อ้างเป็นเลขหน้าที่พิมพ์ในเล่ม |

## 2. A1: URL scheme ที่เปิด LINE พร้อมข้อความ

ข้อกำหนดร่วมของ LINE URL scheme [T1]:

- "The LINE URL scheme is supported in LINE for iOS and LINE for Android." และ "The LINE URL scheme isn't supported in LINE for PC (macOS, Windows)."
- เมื่อไม่มีแอป LINE: scheme ที่ขึ้นต้นด้วย `https://line.me/R/` "A web browser is launched and prompts the user to download LINE." ส่วน `line://` "Nothing happens or the user is redirected to an error page."
- "The scheme `line://` is deprecated to prevent takeover attacks" และ "No exact date is set for the URL scheme `line://` to become obsolete." ประกาศเลิกแนะนำลงวันที่ 25 มีนาคม 2020: "Use `https://line.me/R/` or `https://liff.line.me/` instead." [T4]

| URL | สถานะ | รูปแบบและการเข้ารหัส | รับอะไร | เลือกแชตล่วงหน้า | ที่มา |
|---|---|---|---|---|---|
| `https://line.me/R/share?text={text_message}` | มีในเอกสารปัจจุบัน หัวข้อ "Sending text messages" | "Make sure `{text_message}` is percent encoded in UTF-8." ตัวอย่าง `https://line.me/R/share?text=Hi%20there%21` | ข้อความอิสระ: "Opens the "Share with" screen. Users can select friends, group chats, or multi-person chats to send a text message specified with `{text_message}`. Users can send the text also to Keep Memo and other apps." | เอกสารไม่มีพารามิเตอร์สำหรับระบุแชต ผู้ใช้เป็นผู้เลือกในหน้า "Share with" | [T1] |
| `https://line.me/R/msg/text/?{text}` | **ไม่มีในเอกสารปัจจุบัน** ไม่พบประกาศเลิกใช้ในหน้ารวมข่าวปี 2018–2026 | ไม่มีเอกสารปัจจุบันให้อ้าง | — | — | [T1], [T4] |
| `line://msg/text/{text}` | ไม่มีในเอกสารปัจจุบัน และ `line://` ทั้งหมดเป็น deprecated | — | — | — | [T1], [T4] |
| `https://social-plugins.line.me/lineit/share?url={url}&text={text}` | มีในเอกสารปัจจุบัน เป็นลิงก์ของปุ่ม LINE Share แบบ custom icon สำหรับหน้าเว็บ | ตัวอย่างในเอกสาร `https://social-plugins.line.me/lineit/share?url=https%3A%2F%2Fline.me%2Fen&text=text` และ FAQ: "Check to make sure that you shared percent-encoded text with UTF-8 character encoding." | URL และข้อความ: "The LINE Share button lets you share URLs and text." และ "When installing the Share button using a custom icon, you can have the URL and text shared together." เอกสารไม่ได้บอกว่าเว้น `url` ได้หรือไม่ | ไม่มีพารามิเตอร์ในเอกสาร | [T2], [T3] |

ข้อกำหนดเพิ่มของปุ่ม LINE Share [T2]: เอกสารแสดงลิงก์แบบ custom icon หลังผู้อ่านยอมรับ "LINE Social Plugins usage guidelines" ("You can see the link if you read and agree to the LINE Social Plugins usage guidelines below.") และสำหรับแอป native เอกสารแนะนำหน้า "Share with" ของ [T1] แทน FAQ ระบุว่าปุ่มใช้ได้ทั้งหน้าเว็บบน PC และมือถือ: "adding buttons is easy for both PC and mobile web pages" [T3]

**พฤติกรรมบน desktop** เอกสารของ LINE ระบุเพียงว่า LINE for PC ไม่รองรับ URL scheme [T1] ไม่มีเอกสารบอกว่าเบราว์เซอร์บน desktop แสดงอะไรเมื่อเปิด `https://line.me/R/share?text=...`

**การสังเกต [O1] (17 พ.ย. 2569 ไม่ใช่เอกสาร และไม่ใช่การทดสอบบนมือถือจริง)**

| URL | User-Agent ของ Chrome บน Linux | User-Agent ของ Safari บน iPhone | User-Agent ของ Chrome บน Android |
|---|---|---|---|
| `https://line.me/R/share?text=Hi%20there%21` | HTTP 302 ไปที่ `/` (หน้าแรกของ line.me) ข้อความไม่ถูกส่งต่อ | HTTP 200 หน้า "Open LINE to continue." มีลิงก์ `line://share?text=Hi%20there%21` และลิงก์ App Store | HTTP 200 หน้าเดียวกัน มีลิงก์ `intent://share?text=Hi%20there%21#Intent;scheme=line;...;package=jp.naver.line.android;end` และลิงก์ `market://` |
| `https://line.me/R/msg/text/?Hi%20there%21` | HTTP 302 ไปที่ `https://social-plugins.line.me/lineit/share?url=&text=Hi%20there%21&from=line_scheme` | HTTP 200 (ไม่ได้ตรวจเนื้อหา) | HTTP 200 (ไม่ได้ตรวจเนื้อหา) |
| `https://social-plugins.line.me/lineit/share?url=...&text=...` | HTTP 302 ไปที่ `/lineit/login` แล้วไปหน้า LINE Login ที่ `access.line.me` ซึ่งขอ scope รวมถึง `message.write` | เหมือนกัน | เหมือนกัน |

หน้าที่ `line.me` ส่งให้เบราว์เซอร์มือถือเป็นหน้าสำรองเมื่อระบบปฏิบัติการไม่เปิดแอปให้เอง การเปิดแอปจริงขึ้นกับ Universal Links ของ iOS และ App Links ของ Android ซึ่งการสังเกตนี้ไม่ได้ทดสอบ

**ความยาวสูงสุด** ไม่พบในเอกสาร [T1], [T2], [T3] ทั้งของ `text` และของ URL

## 3. A2: การเปิดลิงก์ในเบราว์เซอร์ของเครื่องแทนเบราว์เซอร์ในแอป

LINE นิยามเบราว์เซอร์ในแอปว่า "A web browser specifically for the LINE app. Using LINE's in-app browser, you can open URLs and browse web apps on the internet without closing the LINE app." [T9]

หัวข้อ "Opening a URL in an external browser" ของ [T1] มีข้อความทั้งหมดดังนี้:

- "With the query parameters, you can let users open a URL in an external browser instead of LINE's in-app browser."
- "These query parameters work for all URLs accessed from the LINE app, except for on LIFF apps. Even if you add these query parameters to a LIFF URL, it won't open in an external browser."

| URL ที่มีพารามิเตอร์ | คำอธิบายในเอกสาร |
|---|---|
| `https://example.com/?openExternalBrowser=1` | "Opens target URL, in an external browser." |
| `https://example.com/?openInAppBrowser=0` | "Opens target URL, in a Chrome custom tab (only available in LINE for Android)." |

สิ่งที่เอกสารไม่ได้ระบุ: ตำแหน่งของพารามิเตอร์เมื่อ URL มีพารามิเตอร์อื่นหรือมี fragment, LINE ลบพารามิเตอร์ออกก่อนเปิดหน้าหรือไม่, เวอร์ชันขั้นต่ำของ LINE, พฤติกรรมบน LINE for PC และ `openExternalBrowser=1` ไม่มีข้อจำกัดแพลตฟอร์มกำกับ ต่างจาก `openInAppBrowser=0` ที่ระบุว่าใช้ได้เฉพาะ Android ไม่พบข่าวเกี่ยวกับสองพารามิเตอร์นี้ในหน้ารวมข่าวปี 2018–2026 [T4]

**สิ่งที่คล้ายกัน** LINE มีค่าตั้งฝั่งผู้ใช้ใน LINE Labs สำหรับ iPhone และ iPad: "The open links in your default browser feature in LINE Labs lets you open links in chats with the browser you've configured on your device (e.g. Safari, Chrome)." เปิดที่แท็บ Home > ไอคอนตั้งค่า > LINE Labs > "Open links in your default browser" [T8] ค่านี้ผู้ใช้แต่ละคนตั้งเอง และบทความระบุเฉพาะ iPhone/iPad ไม่พบบทความแบบเดียวกันสำหรับ Android

เอกสารของ LIFF ระบุเครื่องยนต์ของ LIFF browser: "The LIFF browser uses WKWebView in iOS, and Android WebView in Android." [T9] LIFF browser เป็นคนละส่วนกับเบราว์เซอร์ในแอป ไม่พบหน้าที่ระบุเครื่องยนต์ของเบราว์เซอร์ในแอปโดยตรง แต่ FAQ ใน [T3] จัดทั้งสองเป็น WebView ในบริบทของนโยบาย Google (ดูข้อ 4)

## 4. A3: การล็อกอินด้วย Google ใน webview และเบราว์เซอร์ในแอป

**นโยบายของ Google**

- นโยบายปัจจุบัน: "A developer must not direct a Google OAuth 2.0 authorization request to an embedded user-agent under the developer's control. Embedded user-agents include, but are not limited to, software libraries that allow a developer to insert arbitrary scripts, alter the default routing of a request to the Google OAuth server, or access session cookies." [T12]
- ประกาศปี 2016: "we will no longer allow OAuth requests to Google in embedded browsers known as "web-views", such as the WebView UI element on Android and UIWebView/WKWebView on iOS" และ "On April 20, 2017, we will start blocking OAuth requests using web-views for all OAuth clients on platforms where viable alternatives exist." [T10]
- ประกาศปี 2021: "All embedded webviews will be blocked starting on September 30, 2021." และมีหมายเหตุถึงเจ้าของเว็บไซต์โดยตรง: "A website's ability to request authorization from a Google Account may be impacted due to another developer's decision to use an embedded webview in their app. For example, if a messaging or news application opens links to your site in an embedded webview, the features available on your site, including Google OAuth 2.0 authorization flows, may be impacted." [T11]
- ความหมายของ error: "`disallowed_useragent` The authorization endpoint is displayed inside an embedded user-agent disallowed by Google's OAuth 2.0 Policies." และ "Web developers may encounter this error when an iOS or macOS app opens a general web link in an embedded user-agent and a user navigates to Google's OAuth 2.0 authorization endpoint from your site." [T13]

**Google Identity Services (`google.accounts.id`, ปุ่ม Sign in with Google และ One Tap)** หน้า Supported browsers and platforms ระบุ [T14]:

- "Note: Android and iOS webviews are not supported for user sign-in. We recommend using Chrome Custom Tabs on Android and SFSafariViewController on iOS instead."
- "It is not guaranteed to work on all browsers or platforms." และ "the JavaScript client library is only supported on the latest two versions of each browser."
- หมายเหตุใต้ตาราง Sign In With Google: "* Due to ITP redirect mode is required for iOS."

**LINE ถูกระบุว่าได้รับผลหรือไม่** เอกสารของ Google ที่อ่านไม่ได้ระบุชื่อ LINE แต่ LINE ระบุเองใน FAQ [T3]: "In the LIFF browser and LINE's in-app browser, the user's social login with google account isn't allowed. This is because Google's OAuth 2.0 Policies disallow authorization requests from WebView to Google. Therefore, when the user tries social login with google account in the LIFF browser or LINE's in-app browser, an error with a status code `403` and an error code `disallowed_useragent` will be displayed."

**แยกสิ่งที่เอกสารระบุ กับสิ่งที่ต้องทดสอบบนมือถือจริง**

| เรื่อง | สถานะ |
|---|---|
| Google ไม่อนุญาตคำขอ OAuth จาก webview และตอบ `disallowed_useragent` | เอกสารระบุ [T11], [T12], [T13] |
| Google Identity Services ไม่รองรับ webview ของ Android และ iOS สำหรับการล็อกอิน | เอกสารระบุ [T14] |
| การล็อกอินด้วย Google ในเบราว์เซอร์ในแอปของ LINE ได้ `403 disallowed_useragent` | เอกสารของ LINE ระบุ [T3] ไม่ได้ทดสอบเอง |
| ปุ่ม Sign in with Google ของ Google Identity Services (ซึ่งคืน ID token ให้หน้าเว็บ) ล้มเหลวแบบเดียวกันในเบราว์เซอร์ในแอปของ LINE รุ่นปัจจุบัน ทั้ง iOS และ Android | **ต้องทดสอบ** [T3] ใช้คำว่า "social login with google account" โดยไม่แยกวิธี และ [T14] บอกเพียงว่าไม่รองรับ |
| ลิงก์ที่มี `openExternalBrowser=1` ซึ่งอยู่ในข้อความที่ผู้ใช้พิมพ์หรือวางในแชต เปิดในเบราว์เซอร์ของเครื่องจริง ทั้ง iOS และ Android | **ต้องทดสอบ** เอกสารบอกว่าใช้ได้กับ "all URLs accessed from the LINE app" [T1] แต่ไม่ได้ยกกรณีข้อความแชตของผู้ใช้ |
| หลังเปิดในเบราว์เซอร์ของเครื่องแล้ว ล็อกอินและกลับมาที่หน้างานเดิมได้ | **ต้องทดสอบ** |
| ลิงก์ที่เปิดจาก LINE for PC เปิดในเบราว์เซอร์ใด | ไม่พบเอกสาร **ต้องทดสอบ** |

## 5. A4: Web Share API และ Clipboard API

**Web Share API ตามข้อกำหนด [T15]**

- บริบทปลอดภัย: `[SecureContext] Promise<undefined> share(optional ShareData data = {});`
- ต้องเกิดจากการกระทำของผู้ใช้: "If global does not have transient activation, return a promise rejected with a "NotAllowedError" DOMException." ส่วน `canShare()` "can be called without transient activation."
- อยู่ใต้ Permissions Policy ชื่อ `web-share`
- ช่องข้อมูล: `title`, `text`, `url`, `files` และ "If none of data's members `title`, `text`, or `url` or `files` are present, return false."
- ปลายทางตีความเอง: "the user agent SHOULD map the members of `ShareData` onto equivalent concepts in the target. It MAY discard or combine members if necessary. The meaning of each member of the payload is at the discretion of the share target."
- ไม่รู้ผลปลายทาง: "the `share()` method is "fire and forget"; it does not wait for the target to approve or reject the payload." ผู้ใช้ยกเลิกได้ และ promise ถูก reject ด้วย `AbortError`

**การรองรับ `navigator.share` [T18]** MDN จัดเป็น "Limited availability" และ "not Baseline" [T17]

| เบราว์เซอร์ | การรองรับ | ที่มา |
|---|---|---|
| Chrome บน Android | ตั้งแต่ 61 | browser-compat-data |
| Safari บน iOS | ตั้งแต่ 12.2 | caniuse |
| Samsung Internet | ตั้งแต่ 8.2 | caniuse |
| Firefox บน Android | ตั้งแต่ 79 | browser-compat-data |
| Chrome บน desktop | เต็มตั้งแต่ 128 รุ่น 89–127 "Only supported on ChromeOS and Windows" | browser-compat-data |
| Edge | เต็มตั้งแต่ 93 รุ่น 81–92 "Only supported on Windows." | browser-compat-data |
| Firefox บน desktop | ปิดไว้หลังค่าตั้ง `dom.webshare.enabled` caniuse ระบุรุ่น 163 ว่าไม่รองรับ | ทั้งสองแหล่ง |
| Safari บน macOS | ตั้งแต่ 12.1 | browser-compat-data |
| Android WebView | **ไม่รองรับ** (`version_added: false`) caniuse หมายเหตุ "Android intent:// URLs can be used instead" | ทั้งสองแหล่ง |
| WKWebView บน iOS | browser-compat-data ใส่ค่า `mirror` คืออนุมานตาม Safari บน iOS ไม่ใช่ผลทดสอบรายแอป | browser-compat-data |

ไม่พบเอกสารของ LINE ว่าเบราว์เซอร์ในแอปรองรับ `navigator.share` หรือไม่ สำหรับ LIFF browser เอกสารระบุเพียงว่าการรองรับเทคโนโลยีเว็บอื่น "is in accordance with the specifications of WKWebView and Android WebView" [T9]

**`navigator.clipboard.writeText` ตามข้อกำหนด [T16]**

- บริบทปลอดภัย: `[SecureContext, SameObject] readonly attribute Clipboard clipboard;` และ MDN: "Writing to the clipboard can only be done in a secure context." [T17]
- ขั้นตอน `writeText(data)` เรียก "check clipboard write permission" ถ้าไม่ผ่าน promise ถูก reject ด้วย `NotAllowedError` ขั้นตอนตรวจ (ข้อ 9.2.1): ผ่านทันทีเมื่อสิทธิ์ `clipboard-write` แบบ `allowWithoutGesture: true` เป็น `granted` ถ้าไม่ใช่และหน้ามี transient activation ผ่านเมื่อการเรียกเกิดจากปุ่ม "cut" หรือ "copy" ของเบราว์เซอร์หรือระบบปฏิบัติการ มิฉะนั้นเบราว์เซอร์ขอสิทธิ์ `clipboard-write` แบบ `allowWithoutGesture: false` ถ้าไม่มี transient activation เบราว์เซอร์ขอสิทธิ์แบบ `allowWithoutGesture: true`
- การทำงานจริงต่างจากข้อกำหนด MDN สรุปไว้ [T17]: Chromium "Writing requires either the `clipboard-write` permission or transient activation." ส่วน Firefox และ Safari "Writing requires transient activation." และ "The `clipboard-read` and `clipboard-write` permissions are not supported (and not planned to be supported) by Firefox or Safari." หน้าเว็บใน `<iframe>` ต้องได้รับ Permissions-Policy `clipboard-write` บน Chromium

**การรองรับ `writeText` [T18]** MDN จัดเป็น "Baseline Widely available" [T17]

| เบราว์เซอร์ | การรองรับ | หมายเหตุในข้อมูล |
|---|---|---|
| Chrome และ Edge (รวม Chrome บน Android ซึ่งใช้ค่า `mirror`) | Chrome ตั้งแต่ 66 | "From version 107, this method must be called within user gesture event handlers, or the user must grant the `clipboard-write` permission." |
| Firefox | ตั้งแต่ 63 | "This method must be called within user gesture event handlers." |
| Safari บน macOS และ iOS | ตั้งแต่ 13.1 (caniuse: iOS ตั้งแต่ 14.0) | "This method must be called within user gesture event handlers." |
| Android WebView | caniuse: รองรับบางส่วน "Supports writing to clipboard but not reading." | — |

## 6. A5: ขีดจำกัดและการแสดงผลของข้อความที่ผู้ใช้ส่งเอง

**จำนวนตัวอักษรสูงสุด** ไม่พบบทความใน LINE Help Center ที่ระบุจำนวนตัวอักษรสูงสุดของข้อความแชตที่ผู้ใช้พิมพ์หรือวางเอง ค้นด้วยคำ "characters", "maximum characters message", "text message limit", "10,000", "文字数" และ "ตัวอักษร" [T8] ตัวเลขเดียวที่พบเป็นของฟีเจอร์ตั้งเวลาส่งข้อความ ซึ่งบทความระบุว่าให้บริการในญี่ปุ่น ไต้หวัน และไทย: "Supported messages: Text messages (up to 10,000 characters)" [T8]

**การแปลง URL เป็นลิงก์** LINE ระบุว่าไม่ได้ควบคุมเอง [T3]: "The behavior of converting a URL in a text message to a link depends on the specifications of the OS, such as Android or iOS, and this isn't controlled by the LINE app. For this reason, a URL in a text message may not become a link." หัวข้อนี้ติดป้าย "LINE app" ด้วย จึงครอบคลุมข้อความในแอป ไม่เฉพาะ Messaging API

ไม่พบเอกสารของ LINE เรื่องช่องว่างหรือการขึ้นบรรทัดรอบ URL และไม่พบเอกสารเรื่องตัวอักษรที่ไม่ใช่ละติน (เช่น ภาษาไทย) ซึ่งอยู่ติดท้าย URL แล้วถูกรวมเข้าไปในลิงก์

## 7. A6: ตัวอย่างลิงก์ (URL preview)

**ใครเป็นผู้เปิดหน้าเว็บ** เซิร์ฟเวอร์ของ LINE ไม่ใช่เครื่องของผู้ใช้ [T8 บทความ Letter Sealing]: "we use a secure mechanism where LINE servers access the website on your behalf and generate the preview." และ "Due to this security feature, URL information is processed on our servers. However, you can turn it off via your settings if you desire." บทความ Customizing chats ย้ำว่า "In order to generate URL previews, links shared in chats are also sent to LINE's servers." [T8]

**ใช้อะไรสร้างตัวอย่าง** [T3]:

- "LINE uses Open Graph Protocol tags from websites to generate URL previews." สามแท็กคือ `og:title`, `og:description`, `og:image` และ "LINE uses only the three OGP tags listed above."
- เมื่อไม่มี OGP: "Even if you don't configure OGP tags, any text or image within the URL will be automatically retrieved to generate a URL preview. For example, for the Title, if there is no available information in `og:title`, the text within the title tag will be displayed. Likewise, for the Summary, if there is no available information in `og:description`, the text within either the description tag or the body will be displayed (If there is no retrievable information, nothing will be displayed in the preview)."

**การปิด** เป็นค่าตั้งของผู้ใช้แต่ละคน: แท็บ Home > ไอคอนตั้งค่า > Chats > "URL previews" และบน Windows/Mac คือ Settings > Chats > Basic > "Show thumbnails and preview site info for links shared in chat" [T8] ฟีเจอร์ตรวจจับเว็บไซต์ฟิชชิงผูกกับค่านี้: "You can only use this feature when URL previews are turned on." และ "If you turn this setting on, Letter Sealing will no longer be applied to links." [T8]

**สิ่งที่ไม่พบ** ไม่พบเอกสารของ LINE ที่ระบุ user agent หรือช่วง IP ของเซิร์ฟเวอร์ที่ดึงตัวอย่าง, เวลาที่ดึง (ตอนพิมพ์ ตอนส่ง หรือตอนผู้รับเปิดแชต), ระยะเวลาเก็บ cache, วิธีล้าง cache หรือวิธีที่เจ้าของเว็บไซต์ปิดตัวอย่างจากฝั่งเว็บ และไม่พบว่าเซิร์ฟเวอร์นั้นรัน JavaScript ของหน้าหรือไม่ สำหรับปุ่ม LINE Share FAQ ระบุเพียงว่า "Depending on the URL you try to share, the preview may not be displayed." [T3]

## 8. A7: LINE Notify และโควตาข้อความของ LINE Official Account

- LINE Notify ยุติเมื่อ 31 มีนาคม 2025: "we are regrettably discontinuing this service as of March 31, 2025" และฉบับภาษาไทยในหน้าเดียวกัน "เราจะยุติการให้บริการ LINE Notify ตั้งแต่วันที่ 31 มีนาคม พ.ศ. 2568 เป็นต้นไป" [T5] ประกาศครั้งแรก 7 ตุลาคม 2024 และยืนยันการยุติ 1 เมษายน 2025 [T4]
- สิ่งที่ LINE แนะนำแทน: "consider using the Messaging API through which you can send messages from your LINE official account. By using the Messaging API you can send a fixed number of messages each month for free." [T5]
- การนับข้อความ: "The number of messages is counted by the number of people you send a message to." ตัวอย่างในเอกสารคือ push message หนึ่งครั้งไปยังห้องแชตที่มี 5 คน นับเป็น 5 ข้อความ และ push, multicast, broadcast, narrowcast message นับเข้าโควตา ส่วน reply message ไม่นับ [T6]
- โควตาฟรีในประเทศไทย: "เมื่อคุณเปิดบัญชีทางการจะได้รับข้อความเพื่อส่งฟรี 300 ข้อความต่อเดือน" แพ็กเกจเบสิก 1,280 บาท 15,000 ข้อความ และแพ็กเกจโปร 1,780 บาท 35,000 ข้อความ ราคายังไม่รวมภาษีมูลค่าเพิ่ม [T7] หน้านี้เรียกโควตาว่า "ข้อความบรอดแคสต์" และ [T6] เป็นหน้าที่ระบุว่า push message นับเข้าโควตาของแพ็กเกจ

## 9. B1: แนวทางทางการเรื่องข้อมูลผู้ป่วยในสื่อสังคมออนไลน์

**กฎหมายแม่บท**

- "ข้อมูลด้านสุขภาพของบุคคล เป็นความลับส่วนบุคคล ผู้ใดจะนำไปเปิดเผยในประการที่น่าจะทำให้บุคคลนั้นเสียหายไม่ได้ เว้นแต่การเปิดเผยนั้นเป็นไปตามความประสงค์ของบุคคลนั้นโดยตรง หรือมีกฎหมายเฉพาะบัญญัติให้ต้องเปิดเผย" [D2 มาตรา 7] โทษ: "จำคุกไม่เกินหกเดือน หรือปรับไม่เกินหนึ่งหมื่นบาท หรือทั้งจำทั้งปรับ" และเป็นความผิดอันยอมความได้ [D2 มาตรา 49]
- ข้อมูลจากงานควบคุมโรค: "ข้อมูลจากการเฝ้าระวัง การสอบสวนโรค หรือการแจ้งหรือรายงานตามพระราชบัญญัตินี้ ซึ่งมีการพาดพิงถึงตัวบุคคลทั้งที่ระบุตัวได้หรือไม่สามารถระบุตัวได้ จะต้องเก็บเป็นความลับและประมวลผลโดยไม่เปิดเผยชื่อ ทั้งนี้ การประมวลผลดังกล่าวจะต้องเหมาะสมและตรงกับวัตถุประสงค์ในการป้องกันและควบคุมโรค" [D5 มาตรา 10]
- ข้อมูลสุขภาพเป็นข้อมูลที่ห้ามเก็บรวบรวม "โดยไม่ได้รับความยินยอมโดยชัดแจ้งจากเจ้าของข้อมูลส่วนบุคคล" เว้นแต่เข้าข้อยกเว้น ซึ่งรวมถึง "(ข) ประโยชน์สาธารณะด้านการสาธารณสุข เช่น การป้องกันด้านสุขภาพจากโรคติดต่ออันตรายหรือโรคระบาดที่อาจติดต่อหรือแพร่เข้ามาในราชอาณาจักร...ซึ่งได้จัดให้มีมาตรการที่เหมาะสมและเจาะจงเพื่อคุ้มครองสิทธิและเสรีภาพของเจ้าของข้อมูลส่วนบุคคลโดยเฉพาะการรักษาความลับของข้อมูลส่วนบุคคลตามหน้าที่หรือตามจริยธรรมแห่งวิชาชีพ" [D4 มาตรา 26 (5)] การใช้หรือเปิดเผยต้องมีความยินยอม เว้นแต่ข้อมูลนั้นเก็บรวบรวมได้โดยได้รับยกเว้นตามมาตรา 24 หรือ 26 [D4 มาตรา 27] และผู้ควบคุมข้อมูลต้อง "จัดให้มีมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม เพื่อป้องกันการสูญหาย เข้าถึง ใช้ เปลี่ยนแปลง แก้ไข หรือเปิดเผยข้อมูลส่วนบุคคลโดยปราศจากอำนาจหรือโดยมิชอบ" [D4 มาตรา 37 (1)]

**แนวทางปฏิบัติในการใช้งานสื่อสังคมออนไลน์ของผู้ปฏิบัติงานด้านสุขภาพ พ.ศ. 2559 [D1]** เป็นเอกสารเดียวที่พบซึ่งกล่าวถึงสื่อสังคมออนไลน์โดยตรง

- ฐานะของเอกสาร: "เป็นแนวทาง (guidelines) เบื้องต้น" ที่สถานพยาบาลและองค์กรด้านสุขภาพ "ควรพิจารณานำแนวทางปฏิบัติฉบับนี้ไปปรับใช้" [ข้อ 1] ถ้อยคำของข้อ 19 ใช้คำว่า "พึง"
- ผู้ที่อยู่ในขอบเขต: "ผู้ปฏิบัติงานด้านสุขภาพ" รวม "บุคลากรอื่นที่ทำงานในระบบสุขภาพ ไม่ว่าจะเป็นงานทางคลินิกหรืองานด้านสาธารณสุข ทั้งเชิงรับและเชิงรุก ตลอดจนผู้ที่ทำงานเกี่ยวข้องกับข้อมูลสารสนเทศสุขภาพ" [ข้อ 3]
- LINE อยู่ในนิยาม: สื่อสังคมออนไลน์รวมถึง "(๒) เครือข่ายสังคมออนไลน์ (social networking services) เช่น Facebook, Google Plus, Myspace, LinkedIn, LINE, WhatsApp, Viber, Skype" [ข้อ 3]
- ข้อ 19 วรรคหนึ่ง: "พึงระมัดระวังไม่ให้ผู้อื่นล่วงรู้ข้อมูลผู้ป่วยจากการใช้งานสื่อสังคมออนไลน์โดยไม่มีความจำเป็นและสมควร"
- ข้อ 19 วรรคสอง: "พึงหลีกเลี่ยงการเปิดเผยข้อมูลส่วนบุคคลของผู้ป่วยในประการที่สามารถระบุตัวตนของผู้ป่วยได้ เว้นแต่จะได้รับความยินยอมจากผู้ป่วยหรือผู้แทนโดยชอบธรรม หรือเป็นไปตามที่กฎหมายบัญญัติ"
- ข้อ 19 วรรคสาม ว่าด้วยการสื่อสารระหว่างผู้ปฏิบัติงานด้วยกัน: เมื่อ "ประสงค์จะเผยแพร่เนื้อหาที่มีข้อมูลเกี่ยวข้องกับผู้ป่วยในสื่อสังคมออนไลน์ เพื่อประโยชน์ต่าง ๆ เช่น การแลกเปลี่ยนเรียนรู้ระหว่างผู้ปฏิบัติงานด้านสุขภาพด้วยกัน การแลกเปลี่ยนความเห็นทางวิชาการ โดยไม่ได้รับความยินยอมจากผู้ป่วย ผู้ปฏิบัติงานด้านสุขภาพพึงลบ (de-identify) ข้อมูลระบุตัวตน (identifiers) ของผู้ป่วยทั้งหมด และรายละเอียดอื่นที่อาจทำให้ผู้อื่นสามารถระบุตัวตนของผู้ป่วยได้ออกก่อน"
- ข้อ 19 วรรคสี่ ว่าด้วยการระบุตัวตนย้อนหลัง: พึงระมัดระวังข้อมูลที่ "มีการระบุรายละเอียดมากพอที่จะทำให้ผู้อื่นสามารถคาดเดาหรือระบุตัวตนของผู้ป่วยในภายหลังได้ (re-identification) เช่น แม้ไม่ได้มีการระบุชื่อหรือเลขประจำตัวผู้ป่วย แต่มีการเปิดเผยสถานพยาบาล หอผู้ป่วย และ/หรือ หมายเลขเตียงที่ผู้ป่วยนอนอยู่"
- ข้อ 27 ว่าด้วยการบันทึก: เมื่อใช้สื่อสังคมออนไลน์ "เพื่อติดต่อสื่อสารกับผู้ป่วย หรือผู้ปฏิบัติงานด้านสุขภาพ" พึงบันทึก "รายละเอียดของการติดต่อสื่อสารดังกล่าว ไว้เป็นส่วนหนึ่งของเวชระเบียนหรือประวัติสุขภาพของผู้ป่วย...หากอยู่ในวิสัยที่สามารถทำได้"

แนวทางฉบับนี้ไม่มีข้อที่กล่าวถึง "กลุ่มแชต" โดยเฉพาะ และไม่มีรายการว่าข้อมูลใดบ้างเป็นข้อมูลระบุตัวตน ตัวอย่างที่ให้มีเพียงชื่อ เลขประจำตัวผู้ป่วย สถานพยาบาล หอผู้ป่วย และหมายเลขเตียง

**ระเบียบกระทรวงสาธารณสุข พ.ศ. 2561 [D3]** ไม่มีคำว่า "สื่อสังคมออนไลน์", "LINE" หรือ "ไลน์" ทั้งฉบับ สิ่งที่ระเบียบกำหนดและเกี่ยวข้อง:

- นิยาม: ข้อมูลด้านสุขภาพของบุคคลคือข้อมูล "ในเรื่องที่เกี่ยวกับสุขภาพของบุคคลที่สามารถระบุตัวบุคคลได้" [ข้อ 4]
- "ข้อมูลด้านสุขภาพของบุคคลเป็นความลับส่วนบุคคล จะเปิดเผยได้ต่อเมื่อได้รับความยินยอมจากเจ้าของข้อมูลหรือผู้มีอำนาจกระทำการแทน...และตามที่กฎหมายบัญญัติไว้เท่านั้น" [ข้อ 13]
- การเก็บ ใช้ และเปิดเผยด้วยวิธีการทางอิเล็กทรอนิกส์ต้องมีมาตรการที่ครอบคลุม "การระบุตัวตน (Identification)", "การยืนยันตัวตน (Authentication)", "อนุญาตเฉพาะผู้มีสิทธิเข้าถึง (Authorization)" และ "ความรับผิดชอบต่อผลการกระทำ (Accountability)" [ข้อ 25] และการส่งต่อข้อมูลทางอิเล็กทรอนิกส์ต้องมีการบริหารจัดการการเข้าถึงของผู้ใช้งาน [ข้อ 26]

**แนวปฏิบัติการคุ้มครองข้อมูลส่วนบุคคลของกระทรวงและของกรมควบคุมโรค [D6]** ไม่มีคำว่า "LINE", "ไลน์" หรือ "สื่อสังคมออนไลน์" ฉบับของกระทรวงระบุหลักทั่วไป เช่น เก็บรวบรวม "เท่าที่จำเป็น" และ "จะไม่เปิดเผยข้อมูลส่วนบุคคลของเจ้าของข้อมูล โดยไม่มีฐานการประมวลผลข้อมูลโดยชอบด้วยกฎหมาย" [ส่วนที่ 5]

## 10. B2: เนื้อหาและช่องทางของการแจ้ง รพ.สต. ในมาตรการ 3-3-1

เอกสารของกรมควบคุมโรคที่อ่านทุกฉบับระบุกำหนดเวลา แต่ไม่ระบุรายการข้อมูลที่ต้องแจ้ง และไม่ระบุช่องทาง

| เอกสาร | ข้อความเรื่องการแจ้ง | รายการข้อมูลที่ต้องแจ้ง | ช่องทาง |
|---|---|---|---|
| [D7] แผ่นมาตรการ 3-3-1 | "รายงานโรคให้ รพ.สต. หรือสถานบริการสาธารณสุขในพื้นที่ ทราบภายใน 3 ชั่วโมง" | ไม่ระบุ | ไม่ระบุ |
| [D8] หน้า 51 | ข้อความเดียวกับ [D7] | ไม่ระบุ | ไม่ระบุ |
| [D9] หน้า 56 ตารางที่ 10 | "สถานพยาบาล แจ้ง รพ.สต. หรือสถานบริการสาธารณสุขในพื้นที่รับทราบว่าในพื้นที่มีผู้ป่วยโรคติดต่อนำโดยยุงลาย ภายใน 3 ชั่วโมง ภายหลังผู้ป่วยได้รับการวินิจฉัย" | ระบุเพียงสาระ: ให้รับทราบว่าในพื้นที่มีผู้ป่วย | ไม่ระบุ |
| [D10] | "รายงานโรคให้ รพ.สต. หรือสถานบริการสาธารณสุขในพื้นที่ ทราบภายใน 3 ชั่วโมง" | ไม่ระบุ | ไม่ระบุ |
| [D11] | "มีระบบรายงานโรคให้สถานบริการสาธารณสุขในพื้นที่ทราบภายใน 3 ชั่วโมง" | ไม่ระบุ | ไม่ระบุ |

ข้อเท็จจริงเพิ่มเติมจาก [D9] ซึ่งเป็นฉบับใหม่ที่สุดที่พบ:

- ผู้แจ้งคือ "สถานพยาบาล" และเวลา 3 ชั่วโมงเริ่มนับ "ภายหลังผู้ป่วยได้รับการวินิจฉัย" [หน้า 56]
- 3 ชั่วโมงที่สองเป็นของ รพ.สต.: "รพ.สต. ดำเนินการควบคุมยุงพาหะ ทั้งการฉีดพ่นสารเคมี (สเปรย์กระป๋อง) และกำจัดแหล่งน้ำขังภายในบ้านผู้ป่วย ภายใน 3 ชั่วโมง หลังได้รับแจ้งว่าพบผู้ป่วยในชุมชน" พร้อมหมายเหตุ "ในกรณีที่ได้รับรายงานผู้ป่วยนอกเวลาราชการ สามารถดำเนินการควบคุมยุงพาหะได้ในวันถัดไป" [หน้า 56]
- ตารางที่ 2 "องค์ประกอบของระบบรายงานโรคติดต่อนำโดยยุงลาย" มีแถวของรายงาน 506, รายงานเหตุการณ์ผิดปกติและตรวจสอบข่าวการระบาด, การติดตามทารกที่คลอดจากมารดาติดเชื้อไวรัสซิกา และดัชนีลูกน้ำยุงลาย ไม่มีแถวของการแจ้ง รพ.สต. ภายใน 3 ชั่วโมง [หน้า 33]
- LINE ปรากฏในเล่มในเรื่องอื่น คือระบบปรึกษาระหว่างแพทย์: "จัดระบบแพทย์พี่เลี้ยงและระบบปรึกษาทางไกล เช่น LINE, on call consultation" [หน้า 23 และ 26]

งานควบคุมโรคในมาตรการนี้ทำที่บ้านผู้ป่วย ผู้ทำจึงต้องรู้ตำแหน่งบ้าน ("ภายในบ้านผู้ป่วย", "รัศมี 100 เมตร") แต่ไม่มีเอกสารใดข้างต้นกำหนดว่าตำแหน่งบ้านต้องส่งด้วยวิธีใด

## 11. B3: มาตรฐาน SRRT 2563 เรื่องเนื้อหาและช่องทางของการแจ้งเตือน

ส่วนนี้เพิ่มเฉพาะสิ่งที่ยังไม่มีในข้อ 2, 5 และ 9 ของ [`event-handling-standards.md`](event-handling-standards.md)

**เนื้อหาของการแจ้งเตือน** [S1] ไม่กำหนดรายการข้อมูลของการแจ้งเตือนข่าวสำหรับทีมระดับอำเภอ มีเพียงนิยาม "การสื่อสารเหตุการณ์สำคัญที่ได้รับการตรวจสอบข่าวแล้ว ไปยังผู้บริหารหรือผู้เกี่ยวข้อง ให้รับทราบหรือร่วมจัดการปัญหา" [หน้า 60] ซึ่งเอกสารเดิมบันทึกไว้แล้ว ข้อแนะนำเดียวต่อเนื้อหาอยู่ในมาตรฐาน SAT (บทที่ 2 ไม่ใช่บทของระดับอำเภอ): "ทุกรูปแบบควรระบุวัน/เวลาที่แจ้งเตือนไว้" [หน้า 20]

**รูปแบบและช่องทาง (ใหม่)**

- มาตรฐาน SAT ยกตัวอย่างรูปแบบการแจ้งเตือน: "บันทึกแจ้งผู้บริหาร/หัวหน้าหน่วยงาน/ผู้เกี่ยวข้อง การแจ้งทาง E-mail group/short message ใช้ทะเบียนรับแจ้งข่าวฯ ในการส่งข่าว หรือใช้แบบฟอร์มที่หน่วยงานออกแบบใช้เอง" และระบุว่า "สามารถทำได้หลายรูปแบบ" [หน้า 20]
- มาตรฐาน SAT ตัวชี้วัดที่ 3 ระบุชื่อ LINE เป็นตัวอย่างช่องทาง: "มีช่องทางการติดต่อสื่อสารกับเครือข่าย เช่น หมายเลขโทรศัพท์ ไลน์ หรืออื่น ๆ ได้ตลอดเวลา" ระดับ [B] [หน้า 17]
- มาตรฐานระดับอำเภอ ตัวชี้วัดที่ 4 ไม่ระบุชื่อช่องทาง: "มีหมายเลขโทรศัพท์หรือการสื่อสารอื่นที่สามารถติดต่อสมาชิกทีมเฝ้าระวังสอบสวนควบคุมโรคและภัยสุขภาพ ทั้งหมดได้ตลอดเวลา" ระดับ [B] และ "มีผู้ประสานงานทีม...ตลอดเวลา เพื่อรับส่งข่าวสาร หรือปฏิบัติงานกรณีเร่งด่วน" ระดับ [B] [หน้า 57] วิธีประเมิน: "สำรวจช่องทางการสื่อสาร ประเมินจากแผนการสื่อสารหรืออย่างน้อยจากรายชื่อและเบอร์โทรศัพท์ของสมาชิกทีมทั้งหมด ทดสอบการติดต่อกับหัวหน้าทีม และสมาชิกทีมอย่างน้อย 1 คน" [หน้า 58]

**สื่อสังคมออนไลน์ใช้เป็นทะเบียนไม่ได้ (ใหม่)** มาตรฐานระดับอำเภอ ตัวชี้วัดที่ 4 นิยามทะเบียนรับแจ้งข่าวว่า "ให้รวมถึงแฟ้มจัดเก็บข่าวสารแบบอื่นที่ใช้เสมือนรับแจ้งข่าว เช่น แฟ้มรับรายงานผู้ป่วยโรคที่สำคัญหรือเร่งด่วน แฟ้มรับรายงานสถานการณ์โรค แฟ้มข่าวหนังสือพิมพ์ฯ โปรแกรมอิเล็กทรอนิกส์ (ยกเว้น application ต่าง ๆ ซึ่งไม่สามารถจัดการข้อมูล วิเคราะห์ และประมวลผลได้โดยง่าย เช่น social media)" [หน้า 57] ข้อยกเว้นถ้อยคำเดียวกันอยู่ในมาตรฐาน SAT [หน้า 19]

เอกสารเดิมบันทึกไว้แล้วว่าหลักฐานที่ผู้ประเมินขอดูรวมถึง "บันทึกหรือหลักฐานการแจ้งเตือน" [S1 หน้า 61]

## 12. สิ่งที่ไม่พบหรือยังไม่ยืนยัน

| เรื่อง | ผล | สิ่งที่ค้นแล้ว |
|---|---|---|
| ความยาวสูงสุดของ `text` ใน `https://line.me/R/share?text=` และของ URL ทั้งเส้น | ไม่พบ | [T1], [T2], [T3] |
| สถานะทางการของ `https://line.me/R/msg/text/?` | ไม่พบทั้งในเอกสารปัจจุบันและในประกาศเลิกใช้ ทราบเพียงจากการสังเกต [O1] ว่าเซิร์ฟเวอร์ยังตอบ | [T1] และค้นคำ `msg/text` ในหน้ารวมข่าวปี 2018–2026 [T4] |
| พฤติกรรมที่ LINE รับรองเมื่อเปิด `https://line.me/R/share` จากเบราว์เซอร์บน desktop | ไม่พบเอกสาร การสังเกต [O1] พบว่าถูกพาไปหน้าแรกของ line.me | [T1] |
| การเปิดแอป LINE จริงจาก `https://line.me/R/share?text=` บน iOS และ Android และข้อความภาษาไทยที่มีการขึ้นบรรทัดแสดงถูกต้อง | ยังไม่ยืนยัน ต้องทดสอบบนมือถือจริง | [O1] ดูได้เฉพาะคำตอบของเซิร์ฟเวอร์ |
| รายละเอียดของ `openExternalBrowser=1`: เวอร์ชันขั้นต่ำ, การใช้ร่วมกับพารามิเตอร์อื่นหรือ fragment, การทำงานกับลิงก์ในข้อความแชตของผู้ใช้, LINE for PC | ไม่พบ ต้องทดสอบ | [T1], [T3], [T4] |
| เครื่องยนต์ของเบราว์เซอร์ในแอปของ LINE (WebView หรือ Custom Tab) | ไม่พบหน้าที่ระบุโดยตรง มีเพียง FAQ ที่จัดเป็น WebView ในบริบทนโยบาย Google และเอกสารของ LIFF browser | [T3], [T9] |
| ปุ่ม Sign in with Google ของ Google Identity Services ทำงานหรือไม่ในเบราว์เซอร์ในแอปของ LINE | เอกสารสองฝ่ายระบุว่าไม่รองรับ ยังไม่ได้ทดสอบเอง รายงานของ PO เรื่องโปรเจกต์อ้างอิงใน ADR-0003 ขัดกับเอกสารสองแหล่งนี้ | [T3], [T14] |
| `navigator.share` และ `navigator.clipboard.writeText` ในเบราว์เซอร์ในแอปของ LINE | ไม่พบเอกสาร ต้องทดสอบ | [T9], [T18] |
| จำนวนตัวอักษรสูงสุดของข้อความแชตที่ผู้ใช้พิมพ์เอง | ไม่พบ พบเฉพาะ 10,000 ตัวอักษรของฟีเจอร์ตั้งเวลาส่ง | ช่องค้นหาของ [T8] สามภาษา |
| กฎการตรวจจับ URL ในข้อความ และกรณีตัวอักษรไทยติดท้าย URL | ไม่พบ LINE ระบุว่าขึ้นกับระบบปฏิบัติการ | [T3] |
| user agent, ช่วง IP, เวลาที่ดึง, cache และการล้าง cache ของตัวอย่างลิงก์ | ไม่พบในแหล่งปฐมภูมิ ชื่อ user agent และเครื่องมือล้าง cache ที่พบมาจากบล็อกและเว็บไซต์รวมรายชื่อ bot เท่านั้น จึงไม่ได้บันทึก | [T3], [T8] และค้นเว็บ |
| ประกาศของ LINE ประเทศไทยเรื่องคิดค่าบริการ Reply API ตั้งแต่ 1 ก.พ. 2570 | **ยังไม่ยืนยัน** พบเฉพาะบทความของบริษัทเอเจนซี ไม่พบประกาศต้นฉบับ | ค้นเว็บ ไม่ได้ใช้เป็นข้อเท็จจริง |
| ประกาศหรือหนังสือสั่งการของกระทรวงสาธารณสุขที่กล่าวถึงการใช้ LINE ในงานโดยตรง | ไม่พบ [D3] และ [D6] ไม่มีคำนี้ | ค้นคำใน [D3], [D6] และค้นเว็บ |
| ฉบับแก้ไขหรือยกเลิกของ [D1], [D2], [D3] และกฎหมายลำดับรองของ [D4] | ไม่ได้ตรวจ | เว็บไซต์ราชกิจจานุเบกษาตอบ 403 |
| ต้นฉบับ [D1] บนเว็บไซต์ของสำนักงานคณะกรรมการสุขภาพแห่งชาติ และ [D3] บนเว็บไซต์ของสำนักงานปลัดกระทรวง | ไม่ได้ต้นฉบับจากผู้ออก ใช้สำเนาที่มีหัวกระดาษราชกิจจานุเบกษาจากเว็บไซต์อื่น | ดูตารางแหล่งข้อมูล |
| รายการข้อมูลและช่องทางของการแจ้ง รพ.สต. ภายใน 3 ชั่วโมง | ไม่พบในเอกสารของกรมควบคุมโรค | [D7]–[D11] |
| โฟลเดอร์ "แนวทางการดำเนินมาตรการป้องกันควบคุมโรคติดต่อนำโดยยุงลาย ปี 2563" และไฟล์ "หนังสือหลักสูตรอบรมการเฝ้าระวังควบคุม SRRTตำบล 2557" ที่หน้า [D7] ลิงก์ไป | ไม่ได้อ่าน รายการแรกเป็นโฟลเดอร์ รายการหลังเป็นไฟล์บีบอัด RAR ซึ่งไม่ได้แตกไฟล์ รายการหลังอาจตอบเรื่อง "แนวทางของทีม SRRT เครือข่ายระดับตำบล" ที่เอกสารเดิมบันทึกว่าไม่พบ | ดาวน์โหลดเฉพาะไฟล์ RAR |
| รายการข้อมูลของการแจ้งเตือนข่าวระดับอำเภอ | ไม่พบใน [S1] | ค้นคำ "แจ้งเตือน" ทั้งเล่ม |

## 13. ข้อสังเกตต่อการออกแบบ

รายการต่อไปนี้เป็นข้อสังเกตจากแหล่งข้อมูล ไม่ใช่การตัดสินใจ

1. URL scheme ที่มีเอกสารรองรับสำหรับปุ่ม "เปิด LINE" คือ `https://line.me/R/share?text=` ตามด้วยข้อความที่ percent-encode แบบ UTF-8 และใช้ได้บน iOS กับ Android เท่านั้น ระบบเลือกกลุ่มแทนผู้ใช้ไม่ได้ ซึ่งตรงกับ ADR-0007 ที่ให้ผู้ใช้เลือกกลุ่มเอง
2. บน desktop ไม่มี URL scheme ที่เอกสารรองรับ ผู้ดูแลที่ทำงานบนคอมพิวเตอร์จึงเหลือสองทาง: "คัดลอก" แล้ววางใน LINE for PC หรือลิงก์ของปุ่ม LINE Share (`social-plugins.line.me/lineit/share`) ซึ่งต้องล็อกอิน LINE ในเบราว์เซอร์ และมีแนวปฏิบัติการใช้งานของ LINE Social Plugins ที่ต้องอ่านก่อนใช้
3. การล็อกอินด้วย Google ในเบราว์เซอร์ในแอปของ LINE ถูกระบุว่าใช้ไม่ได้ทั้งในเอกสารของ LINE และของ Google "ทางเลือกแรก" ใน ADR-0003 (ทำลิงก์ให้เปิดในเบราว์เซอร์ของเครื่อง) มีพารามิเตอร์ที่ LINE จัดทำเอกสารไว้คือ `openExternalBrowser=1` เช่น `https://<APP_HOST>/tasks/<task_id>?openExternalBrowser=1` สิ่งที่การทดสอบบนมือถือจริงต้องตอบจึงเป็นว่าพารามิเตอร์นี้ทำงานกับลิงก์ในข้อความแชตหรือไม่ ทั้ง iOS และ Android
4. เมื่อลิงก์มี `openExternalBrowser=1` หน้าเว็บต้องเปิดได้ตามปกติทั้งที่มีพารามิเตอร์นี้ติดมา รวมถึงระหว่างการพาไปล็อกอินแล้วกลับมาที่งานเดิม เอกสารไม่ได้บอกว่า LINE ลบพารามิเตอร์ออกให้
5. ผู้ใช้อาจยังเปิดลิงก์ในเบราว์เซอร์ในแอปได้ เช่น ลิงก์ถูกพิมพ์ต่อโดยไม่มีพารามิเตอร์ หน้าล็อกอินจึงอาจต้องบอกวิธีเปิดในเบราว์เซอร์ของเครื่องเมื่อการล็อกอินล้มเหลว
6. หมายเหตุ "Due to ITP redirect mode is required for iOS" ใน [T14] เกี่ยวกับวิธีขอ ID token บน iPhone แม้เปิดใน Safari แล้ว ควรอ่านคู่กับเอกสารของ Google Identity Services ตอนทำช่วงที่ 1 ของ roadmap
7. `navigator.clipboard.writeText` ต้องถูกเรียกในตัวจัดการเหตุการณ์ของการกดปุ่มบนหน้า HTTPS ข้อความจึงควรเตรียมเสร็จก่อนผู้ใช้กด "คัดลอก" ถ้ารอคำตอบจาก server หลังการกด การคัดลอกอาจถูกปฏิเสธด้วย `NotAllowedError` ใน Safari และ Firefox
8. Web Share API ใช้แทนปุ่ม "เปิด LINE" ได้ไม่เต็มที่: ปลายทางเป็นผู้ตีความ `title`, `text`, `url` และอาจทิ้งบางช่องได้, Android WebView ไม่รองรับ และ Firefox บน desktop ปิดไว้ ถ้าใช้ ต้องตรวจด้วย `navigator.canShare` และยังต้องมี "คัดลอก" เป็นทางหลัก
9. เมื่อ URL previews เปิดอยู่ ลิงก์ในข้อความถูกส่งไปยังเซิร์ฟเวอร์ของ LINE และเซิร์ฟเวอร์นั้นเปิดหน้าเว็บโดยไม่ได้ล็อกอิน สิ่งที่ตัวอย่างลิงก์แสดงคือ `og:title`, `og:description`, `og:image` หรือ `<title>` กับเนื้อหาของหน้าที่ตอบกลับคำขอที่ไม่ได้ล็อกอิน หน้านั้นจึงไม่ควรมีชื่อโรค หมู่บ้าน หรือเลขที่เหตุการณ์ และ URL เองควรมีเพียงรหัสของแถว ซึ่งตรงกับกฎข้อ 8 ของ CLAUDE.md
10. ไม่พบจำนวนตัวอักษรสูงสุดของข้อความแชต ตัวเลขเดียวที่มีคือ 10,000 ตัวอักษรของฟีเจอร์ตั้งเวลาส่ง ข้อความที่ระบบเตรียม (เลขที่เหตุการณ์ โรค หมู่บ้าน งาน กำหนดเสร็จ ลิงก์) สั้นกว่านี้มาก
11. LINE ไม่ได้ควบคุมการแปลง URL เป็นลิงก์ และไม่มีเอกสารเรื่องตัวอักษรไทยติดท้าย URL การวาง URL ไว้บรรทัดของตัวเองโดยไม่มีข้อความต่อท้ายเป็นข้อควรระวังที่ต้องทดสอบบนมือถือจริง ไม่ใช่ข้อเท็จจริงจากเอกสาร
12. การไม่ใส่ชื่อผู้ป่วยและบ้านเลขที่ในข้อความสอดคล้องกับ [D1 ข้อ 19 วรรคสาม] และ [D5 มาตรา 10] ส่วน [D1 ข้อ 19 วรรคสี่] เตือนเรื่องรายละเอียดที่ทำให้คาดเดาตัวผู้ป่วยได้ภายหลัง ข้อความที่มีโรค หมู่บ้าน และเวลา อาจเข้าข่ายนี้ในหมู่บ้านขนาดเล็ก รายละเอียดเช่น อายุ เพศ หรือวันเริ่มป่วย จึงเป็นสิ่งที่แนวทางชี้ให้ระวังถ้าจะเพิ่มในข้อความ
13. ไม่มีเอกสารของกรมควบคุมโรคกำหนดรายการข้อมูลหรือช่องทางของการแจ้ง รพ.สต. ภายใน 3 ชั่วโมง เนื้อหาของข้อความจึงเป็นการตัดสินใจของระบบ สาระที่ [D9] ระบุมีเพียงให้ รพ.สต. "รับทราบว่าในพื้นที่มีผู้ป่วย" ส่วนตำแหน่งบ้านซึ่งงานควบคุมโรคต้องใช้ อยู่หลังลิงก์ที่ต้องล็อกอินตามการออกแบบปัจจุบัน
14. [D9] นับ 3 ชั่วโมงแรกจากเวลาที่ผู้ป่วยได้รับการวินิจฉัย ตรงกับ `docs/spec.md` และ `docs/schema.md` ปัจจุบัน และให้ รพ.สต. ที่รับรายงานนอกเวลาราชการเริ่มควบคุมยุงพาหะในวันถัดไปได้ ซึ่งเกี่ยวกับการแสดงงานเกินกำหนดของเป้า 3 ชั่วโมงที่สอง
15. มาตรฐาน SAT ใน [S1] ระบุว่าการแจ้งเตือนทุกรูปแบบควรระบุวันและเวลา และผู้ประเมินมาตรฐานระดับอำเภอขอดู "บันทึกหรือหลักฐานการแจ้งเตือน" เวลาที่แจ้งหน่วยบริการซึ่งระบบบันทึกเมื่อผู้ดูแลยืนยันว่าส่งแล้วจึงทำหน้าที่นี้ได้ ส่วนกลุ่ม LINE เองใช้เป็นทะเบียนไม่ได้ตามนิยามใน [S1 หน้า 57] และ [D1 ข้อ 27] ให้บันทึกการสื่อสารไว้ในระบบบันทึกหลัก
16. โควตาฟรีของ LINE Official Account ในประเทศไทยคือ 300 ข้อความต่อเดือน และ push message ไปยังกลุ่มนับตามจำนวนคนในกลุ่ม เมื่อคำนวณตามกฎนี้ กลุ่มที่มีสมาชิก 20 คนใช้โควตา 20 ข้อความต่อการแจ้งหนึ่งครั้ง ตัวเลขนี้ใช้ประกอบเหตุผลของ ADR-0007 ที่เลื่อนการส่งอัตโนมัติ
