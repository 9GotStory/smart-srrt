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
  SCHEMA_VERSION: '7',
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
    VISITS: 'VisitLogs'
  },
  ROLES: {
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager',
    ADMIN: 'Admin',
    STAFF: 'Staff'
  },
  MAX_LOGO_BYTES: 3 * 1024 * 1024,
  MAX_ATTACHMENT_BYTES: 5 * 1024 * 1024,
  DEFAULT_AUDIT_RETENTION_DAYS: 365,
  REPORT_PROMPT_VERSION: '2026.10.06.1'
};

var MAIN_HEADERS = [
  'ลำดับ','วันรับแจ้ง','ผู้แจ้งข่าว/หน่วยงานที่แจ้ง','การเฝ้าระวัง','กลุ่มโรค','โรค/ภัย/เหตุการณ์','ประเภทเหตุการณ์','สถานที่เกิดเหตุ','วันที่เริ่มป่วย','หมู่','ตำบล','อำเภอ','จังหวัด','รายละเอียดเหตุการณ์','การตรวจสอบ','วิธีการตรวจสอบ','เข้าเกณฑ์สอบสวนโรค','ประเภทการสอบสวนโรค','ประเมินความเสี่ยงแจ้งเตือน','หน่วยงานแจ้งเตือน','การดำเนินการตามมาตรการ','วันที่ดำเนินการตามมาตรการ','หน่วยงานรับแจ้ง','ลงสอบสวนโรค','หมายเหตุ','วันที่ลงสอบสวนโรค','ผู้บันทึก','วันที่บันทึก/แก้ไขล่าสุด','ชื่อหมู่บ้าน','รหัสหมู่บ้าน'
];

var EVENT_META_HEADERS = [
  'EventID','Revision','RecordStatus','CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason'
];

var MAIN_SCHEMA_HEADERS = MAIN_HEADERS.concat(EVENT_META_HEADERS);

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

var EVENT_OWNER_HEADER = 'OwnerUserID';
var EVENT_OWNER_COL = 39;

var EVENT_ATTACHMENT_HEADERS = [
  'AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes','Description',
  'Status','UploadedAt','UploadedBy','RemovedAt','RemovedBy','RemoveReason'
];

var EVENT_ATTACHMENT_COL = {
  ATTACHMENT_ID: 1,
  EVENT_ID: 2,
  FILE_ID: 3,
  FILE_NAME: 4,
  MIME_TYPE: 5,
  SIZE_BYTES: 6,
  DESCRIPTION: 7,
  STATUS: 8,
  UPLOADED_AT: 9,
  UPLOADED_BY: 10,
  REMOVED_AT: 11,
  REMOVED_BY: 12,
  REMOVE_REASON: 13
};

var AUDIT_HEADERS = [
  'Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint','AuditID'
];

var AUDIT_COL = {
  TIMESTAMP: 1,
  USER_EMAIL: 2,
  ROLE: 3,
  ACTION: 4,
  TARGET_SHEET: 5,
  TARGET_ID: 6,
  BEFORE: 7,
  AFTER: 8,
  IP_HINT: 9,
  AUDIT_ID: 10
};

var REPORT_REGISTRY_HEADERS = [
  'ReportID','EventID','SourceRevision','DocumentID','DocumentURL','GeneratedAt',
  'GeneratedBy','GeminiModels','GeminiApiVersions','PromptVersion','TemplateDocID'
];

var REPORT_REGISTRY_COL = {
  REPORT_ID: 1,
  EVENT_ID: 2,
  SOURCE_REVISION: 3,
  DOCUMENT_ID: 4,
  DOCUMENT_URL: 5,
  GENERATED_AT: 6,
  GENERATED_BY: 7,
  GEMINI_MODELS: 8,
  GEMINI_API_VERSIONS: 9,
  PROMPT_VERSION: 10,
  TEMPLATE_DOC_ID: 11
};

var VISIT_HEADERS = ['Timestamp','EntryPoint','LegacyRequestParams'];
var VISIT_LEGACY_HEADERS = ['Timestamp','Page','UserAgent'];

var MASTER_DATA_POLICIES = {
  surveillance: {
    label:'การเฝ้าระวัง',
    sourceSheet:'main',
    sourceColumn:4,
    allowCreate:true,
    allowDeactivate:true,
    semanticLocked:false
  },
  disease_group: {
    label:'กลุ่มโรค',
    sourceSheet:'main',
    sourceColumn:5,
    allowCreate:true,
    allowDeactivate:true,
    semanticLocked:false
  },
  event_type: {
    label:'ประเภทเหตุการณ์',
    sourceSheet:'main',
    sourceColumn:7,
    allowCreate:true,
    allowDeactivate:true,
    semanticLocked:false
  },
  verify_status: {
    label:'สถานะการตรวจสอบ',
    sourceSheet:'main',
    sourceColumn:15,
    allowCreate:false,
    allowDeactivate:false,
    semanticLocked:true
  },
  criteria: {
    label:'เกณฑ์สอบสวนโรค',
    sourceSheet:'main',
    sourceColumn:17,
    allowCreate:false,
    allowDeactivate:false,
    semanticLocked:true
  },
  risk: {
    label:'ระดับความเสี่ยง',
    sourceSheet:'main',
    sourceColumn:19,
    allowCreate:true,
    allowDeactivate:true,
    semanticLocked:false
  },
  content_category: {
    label:'หมวดหมู่ประกาศ/คู่มือ',
    sourceSheet:'content',
    sourceColumn:2,
    allowCreate:true,
    allowDeactivate:true,
    semanticLocked:false
  }
};

function doGet(e) {
  var title = CONFIG.APP_TITLE;
  try {
    var appSettings = getSettingsMap_();
    title = appSettings.APP_NAME || title;
  } catch (ignore) {}
  var output = HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  logVisit_();
  return output;
}

function include(filename) {
  // GS-S1: HTML Service requires a public include(), so restrict to trusted native partials.
  var trusted = ["00-document-head","01-styles","02-app-layout","03-modals","03a-dashboard-mobile","03b-client-core","03c-client-auth","03d-client-dashboard","03e-client-dashboard-export","03f-client-event-controls","03g-client-event-history","03h-client-event-records","03i-client-report-actions","03j-client-report-job","03k-client-report-generation","04-browser-app"];
  if (typeof filename !== 'string' || trusted.indexOf(filename) < 0) {
    throw new Error('ไม่อนุญาตให้โหลดไฟล์ HTML นี้');
  }
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * GS-S1 privileged maintenance boundary. Editor-controlled, explicit fail-closed
 * Google identity: never infer a trusted operator from the web app's effective
 * execution account or from Smart SRRT's independent email/password session.
 *
 * An authorized operator must configure GS_TRUSTED_OPERATOR_EMAIL manually in
 * Apps Script Project Settings > Script Properties before maintenance runs.
 * This protects public GAS wrappers needed by existing Spreadsheet menus.
 */
function requireTrustedOperator_(operation) {
  var configured = String(PropertiesService.getScriptProperties()
    .getProperty('GS_TRUSTED_OPERATOR_EMAIL') || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(configured)) {
    throw new Error('ไม่ได้กำหนดผู้ปฏิบัติการที่ได้รับอนุญาตใน Script Properties');
  }
  var active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  var effective = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!active || active !== configured || effective !== configured) {
    throw new Error('ไม่มีสิทธิ์ดำเนินการบำรุงรักษาระบบ');
  }
  return true;
}



function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Smart SRRT')
      .addItem('ติดตั้ง/ซ่อมระบบครั้งเดียว', 'installSmartSRRT')
      .addItem('อัปเกรด Event ID / Data Integrity', 'migrateP1EventIdentity')
      .addItem('อัปเกรด Event Owner', 'migrateG05EventOwner')
      .addItem('อัปเกรด Event Attachments', 'migrateG11EventAttachments')
      .addItem('อัปเกรด Audit Retention', 'migrateG21AuditRetention')
      .addItem('อัปเกรด VisitLogs', 'migrateG29VisitLogs')
      .addItem('อัปเกรด Report Registry', 'migrateG17ReportRegistry')
      .addItem('จัดเก็บ Audit เก่า', 'archiveAuditLogsFromSheetMenu')
      .addItem('เปิดหน้าฐานข้อมูล', 'showDatabaseInfo')
      .addItem('รีเซ็ตรหัส Super Admin', 'resetSuperAdminPassword')
      .addToUi();
  } catch (ignore) {}
}

/**
 * ฟังก์ชันติดตั้งหลัก: รันเพียงครั้งเดียว
 * ปลอดภัยต่อการรันซ้ำ ใช้ซ่อมชีท/โฟลเดอร์/Template ที่ขาดได้
 */
function installSmartSRRT() {
  requireTrustedOperator_('installSmartSRRT');
  var result = installSmartSRRTCore_();
  try { SpreadsheetApp.getUi().alert(result.message); } catch (ignore) {}
  return result.message;
}

/** รองรับชื่อฟังก์ชันเดิม */
function setupDatabase() {
  requireTrustedOperator_('setupDatabase');
  return installSmartSRRT();
}

function installSmartSRRTCore_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var ss = null;
    var existingDbId = props.getProperty('DATABASE_SPREADSHEET_ID');
    if (existingDbId) {
      try { ss = SpreadsheetApp.openById(existingDbId); } catch (ignore) {}
    }
    if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('กรุณาเปิด Apps Script จาก Google Sheet ที่ต้องการใช้เป็นฐานข้อมูล');
    props.setProperty('DATABASE_SPREADSHEET_ID', ss.getId());

    var mainSheet = ensureSheet_(ss, CONFIG.SHEETS.MAIN, MAIN_SCHEMA_HEADERS);
    var eventMigration = ensureEventIdentityData_(mainSheet);
    ensureEventOwnerSchema_(ss);
    ensureSheet_(ss, CONFIG.SHEETS.USERS, ['UserID','ชื่อ-สกุล','Email','PasswordHash','Role','Status','หน่วยงาน','ตำบล','อำเภอ','จังหวัด','วันที่ลงทะเบียน','อนุมัติโดย','วันที่อนุมัติ','LastLogin']);
    ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.MASTER, ['Type','Value','Label','SortOrder','Active','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.AREAS, ['AreaID','จังหวัด','อำเภอ','ตำบล','หมู่','ชื่อหมู่บ้าน','รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.CONTENT, ['ContentID','Category','Title','Description','URL','FileID','Status','SortOrder','CreatedAt','UpdatedAt','UpdatedBy']);
    ensureEventAttachmentSheet_(ss);
    var reportRegistry = ensureReportRegistrySheet_(ss);
    var auditMigration = ensureAuditSchema_(ss);
    var visitMigration = ensureVisitLogSchema_(ss);

    var assets = ensureSystemAssets_(ss);
    seedSettings_(ss, assets);
    var auditArchive = ensureAuditArchiveSpreadsheet_(ss);
    var settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
    upsertSettingDirect_(settingsSheet, 'AUDIT_ARCHIVE_SPREADSHEET_ID', auditArchive.getId(), 'Spreadsheet ID สำหรับเก็บ Audit archive', true);
    seedMasterData_(ss);
    var adminInfo = seedSuperAdmin_(ss);
    formatSheets_(ss);

    props.setProperty('INSTALL_VERSION', CONFIG.VERSION);
    props.setProperty('SYSTEM_FOLDER_ID', assets.systemFolderId);
    props.setProperty('REPORT_FOLDER_ID', assets.reportFolderId);
    props.setProperty('LOGO_FOLDER_ID', assets.logoFolderId);
    props.setProperty('ATTACHMENT_FOLDER_ID', assets.attachmentFolderId);
    props.setProperty('AUDIT_ARCHIVE_SPREADSHEET_ID', auditArchive.getId());
    props.setProperty('TEMPLATE_DOC_ID', assets.templateDocId);

    var message = [
      'ติดตั้ง/ตรวจสอบ Smart SRRT เรียบร้อยแล้ว',
      'ฐานข้อมูล: ' + ss.getName(),
      'โฟลเดอร์ระบบและ Template รายงานถูกสร้างให้อัตโนมัติ',
      'Event identity: backfilled ' + eventMigration.backfilledIds + ', initialized revision ' + eventMigration.initializedRevision + ', initialized status ' + eventMigration.initializedStatus,
      'Audit identity: backfilled ' + auditMigration.backfilledIds + ', retention ' + getAuditRetentionDays_() + ' วัน',
      'VisitLogs: rows ' + visitMigration.rows + ', legacy headers ' + (visitMigration.migratedLegacyHeaders ? 'migrated' : 'ok'),
      'Report Registry: rows ' + reportRegistry.rows + ', prompt version ' + CONFIG.REPORT_PROMPT_VERSION,
      'เข้าสู่ระบบครั้งแรกด้วย Email: ' + adminInfo.email,
      'รหัสผ่านเริ่มต้น: ' + adminInfo.password,
      'กรุณาเปลี่ยนรหัสผ่านและตั้งค่าชื่อระบบ/โลโก้/Gemini API Key ในหน้า Admin'
    ].join('\n');

    return {
      ok: true,
      message: message,
      spreadsheetId: ss.getId(),
      systemFolderId: assets.systemFolderId,
      reportFolderId: assets.reportFolderId,
      attachmentFolderId: assets.attachmentFolderId,
      auditArchiveSpreadsheetId: auditArchive.getId(),
      templateDocId: assets.templateDocId,
      adminEmail: adminInfo.email,
      eventMigration: eventMigration
    };
  } finally {
    lock.releaseLock();
  }
}

function resetSuperAdminPassword() {
  requireTrustedOperator_('resetSuperAdminPassword');
  var ss = getDb_();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet || sheet.getLastRow() <= 1) throw new Error('ไม่พบผู้ดูแลระบบ กรุณา Run installSmartSRRT()');
  var values = sheet.getDataRange().getValues();
  var row = -1;
  var email = '';
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][4]) === CONFIG.ROLES.SUPER_ADMIN) {
      row = i + 1;
      email = String(values[i][2] || '');
      break;
    }
  }
  if (row < 0) throw new Error('ไม่พบบัญชี Super Admin');
  var newPassword = 'SRRT-' + Utilities.getUuid().replace(/-/g,'').substring(0,8);
  sheet.getRange(row,4).setValue(hashPassword_(newPassword));
  var message = 'รีเซ็ตรหัสผ่านเรียบร้อย\nEmail: ' + email + '\nรหัสผ่านใหม่: ' + newPassword;
  try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
  return message;
}

function showDatabaseInfo() {
  requireTrustedOperator_('showDatabaseInfo');
  var ss = getDb_();
  var settings = getSettingsMap_();
  var text = [
    'Spreadsheet ID: ' + ss.getId(),
    'System Folder ID: ' + (settings.SYSTEM_FOLDER_ID || '-'),
    'Report Folder ID: ' + (settings.REPORT_FOLDER_ID || '-'),
    'Template Doc ID: ' + (settings.TEMPLATE_DOC_ID || '-')
  ].join('\n');
  try { SpreadsheetApp.getUi().alert(text); } catch (ignore) {}
  return text;
}

function ensureSystemAssets_(ss) {
  var props = PropertiesService.getScriptProperties();
  var settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  var directSettings = settingsSheet ? keyValueMap_(settingsSheet.getDataRange().getValues(), 0, 1) : {};

  var systemFolder = getOrCreateFolder_(
    directSettings.SYSTEM_FOLDER_ID || props.getProperty('SYSTEM_FOLDER_ID'),
    'Smart SRRT - ' + ss.getName(),
    null
  );
  var reportFolder = getOrCreateFolder_(
    directSettings.REPORT_FOLDER_ID || props.getProperty('REPORT_FOLDER_ID'),
    'รายงานสอบสวนโรค',
    systemFolder
  );
  var logoFolder = getOrCreateFolder_(
    directSettings.LOGO_FOLDER_ID || props.getProperty('LOGO_FOLDER_ID'),
    'โลโก้ระบบ',
    systemFolder
  );
  var attachmentFolder = getOrCreateNamedChildFolder_(
    directSettings.ATTACHMENT_FOLDER_ID || props.getProperty('ATTACHMENT_FOLDER_ID'),
    'เอกสารแนบเหตุการณ์',
    systemFolder
  );

  var templateId = directSettings.TEMPLATE_DOC_ID || props.getProperty('TEMPLATE_DOC_ID');
  if (!isGoogleDocAvailable_(templateId)) {
    templateId = createDefaultReportTemplate_(systemFolder);
  }

  return {
    systemFolderId: systemFolder.getId(),
    reportFolderId: reportFolder.getId(),
    logoFolderId: logoFolder.getId(),
    attachmentFolderId: attachmentFolder.getId(),
    templateDocId: templateId
  };
}

function getOrCreateNamedChildFolder_(folderId, name, parentFolder) {
  if (folderId) {
    try {
      var existing = DriveApp.getFolderById(String(folderId));
      existing.getName();
      return existing;
    } catch (ignore) {}
  }
  if (parentFolder) {
    var matches = parentFolder.getFoldersByName(name);
    if (matches.hasNext()) return matches.next();
    return parentFolder.createFolder(name);
  }
  return DriveApp.createFolder(name);
}

function getOrCreateFolder_(folderId, name, parentFolder) {
  if (folderId) {
    try {
      var existing = DriveApp.getFolderById(String(folderId));
      existing.getName();
      return existing;
    } catch (ignore) {}
  }
  return parentFolder ? parentFolder.createFolder(name) : DriveApp.createFolder(name);
}

function isGoogleDocAvailable_(fileId) {
  if (!fileId) return false;
  try {
    var file = DriveApp.getFileById(String(fileId));
    return file.getMimeType() === MimeType.GOOGLE_DOCS;
  } catch (ignore) {
    return false;
  }
}

function createDefaultReportTemplate_(systemFolder) {
  var doc = DocumentApp.create('Template_รายงานสอบสวนโรคเบื้องต้น_Smart_SRRT');
  var file = DriveApp.getFileById(doc.getId());
  try { file.moveTo(systemFolder); } catch (ignore) {}

  var body = doc.getBody();
  body.clear();
  body.appendParagraph('บันทึกข้อความ')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setBold(true)
    .setFontSize(18);
  body.appendParagraph('ส่วนราชการ ............................................................................................................................');
  body.appendParagraph('ที่ ............................................................ วันที่ <<วันที่>>');
  body.appendParagraph('เรื่อง  <<ชื่อเรื่อง>>');
  body.appendParagraph('เรียน  .......................................................................................................................................');
  body.appendParagraph('');
  body.appendParagraph('<<ผลวิเคราะห์จากAI>>');
  body.appendParagraph('');
  body.appendParagraph('(ลงชื่อ)........................................................ ผู้รายงาน')
    .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('(........................................................)')
    .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('ตำแหน่ง....................................................')
    .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('วันที่........./........./.........')
    .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('');
  body.appendParagraph('ทีมเฝ้าระวังสอบสวนเคลื่อนที่เร็ว และหน่วยงานที่ร่วมดำเนินการ').setBold(true);
  var table = body.appendTable([
    ['ลำดับ','ชื่อ-สกุล','ตำแหน่ง','หน่วยงาน'],
    ['1','','',''],
    ['2','','',''],
    ['3','','',''],
    ['4','','','']
  ]);
  for (var c = 0; c < table.getRow(0).getNumCells(); c++) {
    table.getRow(0).getCell(c).editAsText().setBold(true);
  }
  doc.saveAndClose();
  return doc.getId();
}

