/**
 * Smart SRRT Dashboard & AI Reporter - One-Click Install Edition
 * ระบบบริหารจัดการข้อมูลระบาดวิทยาและรายงานสอบสวนโรคระดับพื้นที่
 * Version: 2026-08-02 One-Click Install + Village Master + Web Logo Upload
 *
 * วิธีเริ่มต้น
 * 1) สร้าง Google Sheet ใหม่ แล้วเปิด Extensions > Apps Script
 * 2) วางไฟล์นี้ใน Code.gs และวางไฟล์ Index.html
 * 3) Run ฟังก์ชัน installSmartSRRT() เพียงครั้งเดียวและอนุญาตสิทธิ์
 * 4) Deploy > New deployment > Web app
 * 5) หลังจากนั้นเปลี่ยนชื่อระบบ โลโก้ สี พื้นที่ Template และ Gemini API Key ผ่านหน้า Admin
 */

var CONFIG = {
  APP_TITLE: 'Smart SRRT Dashboard & AI Reporter',
  VERSION: '2026.09.08.1',
  SCHEMA_VERSION: '5',
  DEFAULT_DB_SHEET_NAME: 'MainData',
  SHEETS: {
    MAIN: 'MainData',
    USERS: 'UserAccounts',
    SETTINGS: 'SystemSettings',
    MASTER: 'MasterData',
    AREAS: 'AreaMaster',
    CONTENT: 'ContentLibrary',
    ATTACHMENTS: 'EventAttachments',
    REPORTS: 'ReportRegistry',
    AUDIT: 'AuditLogs',
    AUDIT_ARCHIVE: 'AuditArchive',
    VISITS: 'VisitLogs'
  },
  ROLES: {
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager',
    ADMIN: 'Admin',
    STAFF: 'Staff'
  },
  MAX_LOGO_BYTES: 3 * 1024 * 1024,
  MAX_ATTACHMENT_BYTES: 10 * 1024 * 1024,
  REPORT_PROMPT_VERSION: '2026.10.06-p5.1'
};

var MAIN_HEADERS = [
  'ลำดับ','วันรับแจ้ง','ผู้แจ้งข่าว/หน่วยงานที่แจ้ง','การเฝ้าระวัง','กลุ่มโรค','โรค/ภัย/เหตุการณ์','ประเภทเหตุการณ์','สถานที่เกิดเหตุ','วันที่เริ่มป่วย','หมู่','ตำบล','อำเภอ','จังหวัด','รายละเอียดเหตุการณ์','การตรวจสอบ','วิธีการตรวจสอบ','เข้าเกณฑ์สอบสวนโรค','ประเภทการสอบสวนโรค','ประเมินความเสี่ยงแจ้งเตือน','หน่วยงานแจ้งเตือน','การดำเนินการตามมาตรการ','วันที่ดำเนินการตามมาตรการ','หน่วยงานรับแจ้ง','ลงสอบสวนโรค','หมายเหตุ','วันที่ลงสอบสวนโรค','ผู้บันทึก','วันที่บันทึก/แก้ไขล่าสุด','ชื่อหมู่บ้าน','รหัสหมู่บ้าน'
];

var EVENT_META_HEADERS = [
  'EventID','Revision','RecordStatus','CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason'
];

var WORKFLOW_META_HEADERS = [
  'WorkflowStatus','OwnerUserID','AssignedAt','AssignedBy',
  'ClosedAt','ClosedBy','CloseReason','ReopenedAt','ReopenedBy','ReopenReason'
];

var MAIN_SCHEMA_HEADERS = MAIN_HEADERS.concat(EVENT_META_HEADERS).concat(WORKFLOW_META_HEADERS);

var EVENT_META_COL = {
  EVENT_ID: 31,
  REVISION: 32,
  RECORD_STATUS: 33,
  CREATED_AT: 34,
  CREATED_BY: 35,
  VOIDED_AT: 36,
  VOIDED_BY: 37,
  VOID_REASON: 38
};

var WORKFLOW_META_COL = {
  WORKFLOW_STATUS: 39,
  OWNER_USER_ID: 40,
  ASSIGNED_AT: 41,
  ASSIGNED_BY: 42,
  CLOSED_AT: 43,
  CLOSED_BY: 44,
  CLOSE_REASON: 45,
  REOPENED_AT: 46,
  REOPENED_BY: 47,
  REOPEN_REASON: 48
};

