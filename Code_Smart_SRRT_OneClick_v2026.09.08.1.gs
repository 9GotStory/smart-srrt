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
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
  var result = installSmartSRRTCore_();
  try { SpreadsheetApp.getUi().alert(result.message); } catch (ignore) {}
  return result.message;
}

/** รองรับชื่อฟังก์ชันเดิม */
function setupDatabase() {
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

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var patched = current.slice();
    var changed = false;
    for (var i = 0; i < headers.length; i++) {
      if (!patched[i]) { patched[i] = headers[i]; changed = true; }
    }
    if (changed || current.join('') === '') sheet.getRange(1, 1, 1, headers.length).setValues([patched]);
  }
  return sheet;
}

function ensureReportRegistrySheet_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.REPORTS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.REPORTS);
    sheet.appendRow(REPORT_REGISTRY_HEADERS);
    return {sheet:sheet, rows:0};
  }

  if (sheet.getMaxColumns() < REPORT_REGISTRY_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), REPORT_REGISTRY_HEADERS.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REPORT_REGISTRY_HEADERS);
    return {sheet:sheet, rows:0};
  }

  var current = sheet.getRange(1, 1, 1, REPORT_REGISTRY_HEADERS.length).getValues()[0];
  var rowCount = Math.max(sheet.getLastRow() - 1, 0);
  var patched = current.slice();

  for (var i = 0; i < REPORT_REGISTRY_HEADERS.length; i++) {
    var actual = String(current[i] || '').trim();
    var expected = REPORT_REGISTRY_HEADERS[i];

    if (actual === expected) continue;

    if (!actual) {
      if (rowCount > 0) {
        var values = sheet.getRange(2, i + 1, rowCount, 1).getValues();
        for (var r = 0; r < values.length; r++) {
          if (String(values[r][0] || '').trim() !== '') {
            throw new Error('ไม่สามารถเตรียม ReportRegistry ได้: คอลัมน์ ' + (i + 1) + ' มีข้อมูลเดิมที่แถว ' + (r + 2) + ' แต่หัวข้อว่าง');
          }
        }
      }
      patched[i] = expected;
      continue;
    }

    throw new Error('ไม่สามารถเตรียม ReportRegistry ได้: คอลัมน์ ' + (i + 1) + ' ใช้หัวข้อ "' + actual + '" แทน "' + expected + '"');
  }

  if (patched.join('\u0001') !== current.map(function(v){return String(v || '').trim();}).join('\u0001')) {
    sheet.getRange(1, 1, 1, REPORT_REGISTRY_HEADERS.length).setValues([patched]);
  }

  return {sheet:sheet, rows:rowCount};
}

function ensureVisitLogSchema_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.VISITS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.VISITS);
    sheet.appendRow(VISIT_HEADERS);
    return {sheet:sheet, rows:0, migratedLegacyHeaders:false};
  }

  if (sheet.getMaxColumns() < VISIT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), VISIT_HEADERS.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(VISIT_HEADERS);
    return {sheet:sheet, rows:0, migratedLegacyHeaders:false};
  }

  var current = sheet.getRange(1, 1, 1, VISIT_HEADERS.length).getValues()[0];
  var rowCount = Math.max(sheet.getLastRow() - 1, 0);
  var migratedLegacyHeaders = false;
  var patched = current.slice();

  for (var i = 0; i < VISIT_HEADERS.length; i++) {
    var actual = String(current[i] || '').trim();
    var expected = VISIT_HEADERS[i];
    var legacy = VISIT_LEGACY_HEADERS[i];

    if (actual === expected) continue;
    if (actual === legacy) {
      patched[i] = expected;
      migratedLegacyHeaders = true;
      continue;
    }

    if (!actual) {
      if (rowCount > 0) {
        var values = sheet.getRange(2, i + 1, rowCount, 1).getValues();
        for (var r = 0; r < values.length; r++) {
          if (String(values[r][0] || '').trim() !== '') {
            throw new Error('ไม่สามารถอัปเกรด VisitLogs ได้: คอลัมน์ ' + (i + 1) + ' มีข้อมูลเดิมที่แถว ' + (r + 2) + ' แต่หัวข้อว่าง');
          }
        }
      }
      patched[i] = expected;
      continue;
    }

    throw new Error('ไม่สามารถอัปเกรด VisitLogs ได้: คอลัมน์ ' + (i + 1) + ' ใช้หัวข้อ "' + actual + '" ซึ่งไม่ใช่ schema ที่รองรับ');
  }

  if (patched.join('\u0001') !== current.map(function(v){return String(v || '').trim();}).join('\u0001')) {
    sheet.getRange(1, 1, 1, VISIT_HEADERS.length).setValues([patched]);
  }

  return {sheet:sheet, rows:rowCount, migratedLegacyHeaders:migratedLegacyHeaders};
}

function ensureAuditSchema_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.AUDIT);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.AUDIT);
    sheet.appendRow(AUDIT_HEADERS);
    return {sheet:sheet, rows:0, backfilledIds:0};
  }

  if (sheet.getMaxColumns() < AUDIT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), AUDIT_HEADERS.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(AUDIT_HEADERS);
    return {sheet:sheet, rows:0, backfilledIds:0};
  }

  var current = sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).getValues()[0];
  for (var i = 0; i < AUDIT_HEADERS.length; i++) {
    var actual = String(current[i] || '').trim();
    var expected = AUDIT_HEADERS[i];
    if (actual && actual !== expected) {
      throw new Error('ไม่สามารถอัปเกรด AuditLogs ได้: คอลัมน์ ' + (i + 1) + ' ใช้หัวข้อ "' + actual + '" แทน "' + expected + '"');
    }
    if (!actual && i < 9 && sheet.getLastRow() > 1) {
      var legacyValues = sheet.getRange(2, i + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var lr = 0; lr < legacyValues.length; lr++) {
        if (String(legacyValues[lr][0] || '').trim() !== '') {
          throw new Error('ไม่สามารถอัปเกรด AuditLogs ได้: คอลัมน์ ' + (i + 1) + ' มีข้อมูลเดิมที่แถว ' + (lr + 2) + ' แม้หัวข้อจะว่าง');
        }
      }
    }
  }

  var patched = current.slice();
  var headerChanged = false;
  for (var h = 0; h < AUDIT_HEADERS.length; h++) {
    if (!String(patched[h] || '').trim()) {
      patched[h] = AUDIT_HEADERS[h];
      headerChanged = true;
    }
  }
  if (headerChanged) sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).setValues([patched]);

  var rowCount = Math.max(sheet.getLastRow() - 1, 0);
  if (!rowCount) return {sheet:sheet, rows:0, backfilledIds:0};

  var values = sheet.getRange(2, 1, rowCount, AUDIT_HEADERS.length).getValues();
  var seen = {};
  var backfilled = 0;
  var changed = false;

  for (var r = 0; r < values.length; r++) {
    var hasAuditData = false;
    for (var c = 0; c < 9; c++) {
      if (String(values[r][c] || '').trim() !== '') {
        hasAuditData = true;
        break;
      }
    }
    if (!hasAuditData) continue;

    var auditId = String(values[r][AUDIT_COL.AUDIT_ID - 1] || '').trim();
    if (auditId) {
      if (!isUuid_(auditId)) throw new Error('AuditID ไม่ถูกต้องที่แถว ' + (r + 2));
      if (seen[auditId]) throw new Error('พบ AuditID ซ้ำที่แถว ' + (r + 2));
      seen[auditId] = true;
    } else {
      auditId = Utilities.getUuid();
      while (seen[auditId]) auditId = Utilities.getUuid();
      values[r][AUDIT_COL.AUDIT_ID - 1] = auditId;
      seen[auditId] = true;
      backfilled++;
      changed = true;
    }
  }

  if (changed) sheet.getRange(2, 1, rowCount, AUDIT_HEADERS.length).setValues(values);
  return {sheet:sheet, rows:rowCount, backfilledIds:backfilled};
}

function ensureEventAttachmentSheet_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.ATTACHMENTS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.ATTACHMENTS);
    sheet.appendRow(EVENT_ATTACHMENT_HEADERS);
    return sheet;
  }

  if (sheet.getMaxColumns() < EVENT_ATTACHMENT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), EVENT_ATTACHMENT_HEADERS.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EVENT_ATTACHMENT_HEADERS);
    return sheet;
  }

  var current = sheet.getRange(1, 1, 1, EVENT_ATTACHMENT_HEADERS.length).getValues()[0];
  for (var i = 0; i < EVENT_ATTACHMENT_HEADERS.length; i++) {
    var actual = String(current[i] || '').trim();
    var expected = EVENT_ATTACHMENT_HEADERS[i];
    if (actual && actual !== expected) {
      throw new Error('ไม่สามารถเตรียม EventAttachments ได้: คอลัมน์ ' + (i + 1) + ' ใช้หัวข้อ "' + actual + '" แทน "' + expected + '"');
    }
    if (!actual && sheet.getLastRow() > 1) {
      var values = sheet.getRange(2, i + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var r = 0; r < values.length; r++) {
        if (String(values[r][0] || '').trim() !== '') {
          throw new Error('ไม่สามารถเตรียม EventAttachments ได้: คอลัมน์ ' + (i + 1) + ' มีข้อมูลเดิมที่แถว ' + (r + 2) + ' แม้หัวข้อจะว่าง');
        }
      }
    }
  }

  var patched = current.slice();
  var changed = false;
  for (var j = 0; j < EVENT_ATTACHMENT_HEADERS.length; j++) {
    if (!String(patched[j] || '').trim()) {
      patched[j] = EVENT_ATTACHMENT_HEADERS[j];
      changed = true;
    }
  }
  if (changed) sheet.getRange(1, 1, 1, EVENT_ATTACHMENT_HEADERS.length).setValues([patched]);
  return sheet;
}

function ensureEventOwnerSchema_(ss) {
  var sheet = ensureSheet_(ss, CONFIG.SHEETS.MAIN, MAIN_SCHEMA_HEADERS);
  if (sheet.getMaxColumns() < EVENT_OWNER_COL) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), EVENT_OWNER_COL - sheet.getMaxColumns());
  }

  var header = String(sheet.getRange(1, EVENT_OWNER_COL).getValue() || '').trim();
  if (header && header !== EVENT_OWNER_HEADER) {
    throw new Error('ไม่สามารถเพิ่ม Event Owner ได้: คอลัมน์ ' + EVENT_OWNER_COL + ' ถูกใช้งานด้วยหัวข้อ "' + header + '"');
  }

  if (!header && sheet.getLastRow() > 1) {
    var values = sheet.getRange(2, EVENT_OWNER_COL, sheet.getLastRow() - 1, 1).getValues();
    var occupiedRow = 0;
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim() !== '') {
        occupiedRow = i + 2;
        break;
      }
    }
    if (occupiedRow) {
      throw new Error('ไม่สามารถเพิ่ม Event Owner ได้: คอลัมน์ ' + EVENT_OWNER_COL + ' มีข้อมูลเดิมที่แถว ' + occupiedRow + ' แม้หัวข้อจะว่าง');
    }
  }

  if (!header) sheet.getRange(1, EVENT_OWNER_COL).setValue(EVENT_OWNER_HEADER);
  return sheet;
}

function migrateG05EventOwner() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    ensureEventOwnerSchema_(ss);
    var settings = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);
    var settingValues = settings.getDataRange().getValues();
    var existingSchemaVersion = 0;
    for (var i = 1; i < settingValues.length; i++) {
      if (String(settingValues[i][0]) === 'SCHEMA_VERSION') {
        existingSchemaVersion = Number(settingValues[i][1] || 0);
        break;
      }
    }
    var resultingSchemaVersion = Math.max(existingSchemaVersion, 3);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', String(resultingSchemaVersion), 'รุ่นโครงสร้างข้อมูลถาวร', true);
    var message = [
      'อัปเกรด Event Owner เรียบร้อยแล้ว',
      'เพิ่มคอลัมน์: ' + EVENT_OWNER_HEADER,
      'คอลัมน์: ' + EVENT_OWNER_COL,
      'Schema version: ' + resultingSchemaVersion
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}

function migrateG11EventAttachments() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    ensureEventAttachmentSheet_(ss);
    var settings = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);
    var assets = ensureSystemAssets_(ss);
    upsertSettingDirect_(settings, 'ATTACHMENT_FOLDER_ID', assets.attachmentFolderId, 'Google Drive Folder สำหรับเอกสารแนบเหตุการณ์', true);
    var settingValues = settings.getDataRange().getValues();
    var existingSchemaVersion = 0;
    for (var i = 1; i < settingValues.length; i++) {
      if (String(settingValues[i][0]) === 'SCHEMA_VERSION') {
        existingSchemaVersion = Number(settingValues[i][1] || 0);
        break;
      }
    }
    var resultingSchemaVersion = Math.max(existingSchemaVersion, 4);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', String(resultingSchemaVersion), 'รุ่นโครงสร้างข้อมูลถาวร', true);
    PropertiesService.getScriptProperties().setProperty('ATTACHMENT_FOLDER_ID', assets.attachmentFolderId);
    var message = [
      'อัปเกรด Event Attachments เรียบร้อยแล้ว',
      'สร้าง/ตรวจสอบชีท: ' + CONFIG.SHEETS.ATTACHMENTS,
      'โฟลเดอร์เอกสารแนบพร้อมใช้งาน',
      'Schema version: ' + resultingSchemaVersion
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}


function migrateG21AuditRetention() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var audit = ensureAuditSchema_(ss);
    var settings = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);
    upsertSettingDirect_(settings, 'AUDIT_RETENTION_DAYS', String(CONFIG.DEFAULT_AUDIT_RETENTION_DAYS), 'จำนวนวันที่เก็บ AuditLogs ในฐานข้อมูลหลักก่อน Archive', false);
    var archive = ensureAuditArchiveSpreadsheet_(ss);
    upsertSettingDirect_(settings, 'AUDIT_ARCHIVE_SPREADSHEET_ID', archive.getId(), 'Spreadsheet ID สำหรับเก็บ Audit archive', true);

    var settingValues = settings.getDataRange().getValues();
    var existingSchemaVersion = 0;
    for (var i = 1; i < settingValues.length; i++) {
      if (String(settingValues[i][0]) === 'SCHEMA_VERSION') {
        existingSchemaVersion = Number(settingValues[i][1] || 0);
        break;
      }
    }
    var resultingSchemaVersion = Math.max(existingSchemaVersion, 5);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', String(resultingSchemaVersion), 'รุ่นโครงสร้างข้อมูลถาวร', true);
    PropertiesService.getScriptProperties().setProperty('AUDIT_ARCHIVE_SPREADSHEET_ID', archive.getId());

    var message = [
      'อัปเกรด Audit Retention เรียบร้อยแล้ว',
      'Audit rows ที่ตรวจ: ' + audit.rows,
      'สร้าง AuditID ใหม่: ' + audit.backfilledIds,
      'Retention เริ่มต้น: ' + getAuditRetentionDays_() + ' วัน',
      'Archive spreadsheet พร้อมใช้งาน',
      'Schema version: ' + resultingSchemaVersion
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}


function migrateG29VisitLogs() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var visit = ensureVisitLogSchema_(ss);
    var settings = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);

    var settingValues = settings.getDataRange().getValues();
    var existingSchemaVersion = 0;
    for (var i = 1; i < settingValues.length; i++) {
      if (String(settingValues[i][0]) === 'SCHEMA_VERSION') {
        existingSchemaVersion = Number(settingValues[i][1] || 0);
        break;
      }
    }
    var resultingSchemaVersion = Math.max(existingSchemaVersion, 6);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', String(resultingSchemaVersion), 'รุ่นโครงสร้างข้อมูลถาวร', true);

    var message = [
      'อัปเกรด VisitLogs เรียบร้อยแล้ว',
      'จำนวน Visit rows เดิม: ' + visit.rows,
      'ปรับชื่อหัวข้อ legacy: ' + (visit.migratedLegacyHeaders ? 'ใช่' : 'ไม่'),
      'รายการใหม่จะไม่เก็บ request parameter values',
      'Schema version: ' + resultingSchemaVersion
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}


function migrateG17ReportRegistry() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var registry = ensureReportRegistrySheet_(ss);
    var settings = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);

    var settingValues = settings.getDataRange().getValues();
    var existingSchemaVersion = 0;
    for (var i = 1; i < settingValues.length; i++) {
      if (String(settingValues[i][0]) === 'SCHEMA_VERSION') {
        existingSchemaVersion = Number(settingValues[i][1] || 0);
        break;
      }
    }
    var resultingSchemaVersion = Math.max(existingSchemaVersion, 7);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', String(resultingSchemaVersion), 'รุ่นโครงสร้างข้อมูลถาวร', true);

    var message = [
      'อัปเกรด Report Registry เรียบร้อยแล้ว',
      'จำนวน Report records เดิม: ' + registry.rows,
      'Prompt version: ' + CONFIG.REPORT_PROMPT_VERSION,
      'Schema version: ' + resultingSchemaVersion
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}

function isUuid_(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function ensureEventIdentityData_(sheet) {
  var lastRow = sheet.getLastRow();
  var count = Math.max(lastRow - 1, 0);
  var summary = {
    rows: count,
    backfilledIds: 0,
    initializedRevision: 0,
    initializedStatus: 0
  };
  if (!count) return summary;

  var receivedDates = sheet.getRange(2, 2, count, 1).getValues();
  var meta = sheet.getRange(2, EVENT_META_COL.EVENT_ID, count, EVENT_META_HEADERS.length).getValues();
  var seen = {};

  for (var i = 0; i < count; i++) {
    if (!receivedDates[i][0]) continue;
    var existingId = String(meta[i][0] || '').trim();
    if (!existingId) continue;
    if (!isUuid_(existingId)) throw new Error('พบ EventID รูปแบบไม่ถูกต้องที่แถว ' + (i + 2) + ': ' + existingId);
    if (seen[existingId]) throw new Error('พบ EventID ซ้ำที่แถว ' + seen[existingId] + ' และ ' + (i + 2) + ': ' + existingId);
    seen[existingId] = i + 2;

    if (meta[i][1] !== '' && meta[i][1] !== null) {
      var existingRevision = Number(meta[i][1]);
      if (!isFinite(existingRevision) || existingRevision < 1 || Math.floor(existingRevision) !== existingRevision) {
        throw new Error('พบ Revision ไม่ถูกต้องที่แถว ' + (i + 2));
      }
    }
    var existingStatus = String(meta[i][2] || '').trim().toLowerCase();
    if (existingStatus && ['active','closed','void'].indexOf(existingStatus) < 0) {
      throw new Error('พบ RecordStatus ไม่ถูกต้องที่แถว ' + (i + 2) + ': ' + existingStatus);
    }
  }

  var changed = false;
  for (var j = 0; j < count; j++) {
    if (!receivedDates[j][0]) continue;

    if (!String(meta[j][0] || '').trim()) {
      var generatedId = Utilities.getUuid();
      while (seen[generatedId]) generatedId = Utilities.getUuid();
      meta[j][0] = generatedId;
      seen[generatedId] = j + 2;
      summary.backfilledIds++;
      changed = true;
    }
    if (meta[j][1] === '' || meta[j][1] === null) {
      meta[j][1] = 1;
      summary.initializedRevision++;
      changed = true;
    }
    if (!String(meta[j][2] || '').trim()) {
      meta[j][2] = 'active';
      summary.initializedStatus++;
      changed = true;
    }
    // CreatedAt/CreatedBy stay blank for legacy rows because the original
    // creation actor/time cannot be reconstructed reliably from the old schema.
  }

  if (changed) {
    sheet.getRange(2, EVENT_META_COL.EVENT_ID, count, EVENT_META_HEADERS.length).setValues(meta);
  }
  return summary;
}

function migrateP1EventIdentity() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var sheet = ensureSheet_(ss, CONFIG.SHEETS.MAIN, MAIN_SCHEMA_HEADERS);
    var summary = ensureEventIdentityData_(sheet);
    var settings = getSheet_(CONFIG.SHEETS.SETTINGS);
    var settingValues = settings.getDataRange().getValues();
    var existingSchemaVersion = 0;
    for (var i = 1; i < settingValues.length; i++) {
      if (String(settingValues[i][0]) === 'SCHEMA_VERSION') {
        existingSchemaVersion = Number(settingValues[i][1] || 0);
        break;
      }
    }
    var resultingSchemaVersion = Math.max(existingSchemaVersion, 2);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', String(resultingSchemaVersion), 'รุ่นโครงสร้างข้อมูลถาวร', true);
    var message = [
      'อัปเกรด Event identity เรียบร้อยแล้ว',
      'จำนวน Event ที่ตรวจ: ' + summary.rows,
      'สร้าง EventID ใหม่: ' + summary.backfilledIds,
      'กำหนด Revision เริ่มต้น: ' + summary.initializedRevision,
      'กำหนด RecordStatus เริ่มต้น: ' + summary.initializedStatus,
      'Schema version: ' + resultingSchemaVersion
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}

function findEventRowById_(sheet, eventId, includeVoided) {
  eventId = String(eventId || '').trim();
  if (!isUuid_(eventId)) throw new Error('EventID ไม่ถูกต้อง');
  var count = Math.max(sheet.getLastRow() - 1, 0);
  if (!count) throw new Error('ไม่พบข้อมูลเหตุการณ์');
  var ids = sheet.getRange(2, EVENT_META_COL.EVENT_ID, count, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === eventId) {
      var rowNumber = i + 2;
      var status = String(sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
      if (!includeVoided && status === 'void') throw new Error('เหตุการณ์นี้ถูกยกเลิกแล้ว');
      return rowNumber;
    }
  }
  throw new Error('ไม่พบ EventID: ' + eventId);
}

function getEventMetaFromRow_(row) {
  return {
    eventId: String(row[EVENT_META_COL.EVENT_ID - 1] || ''),
    revision: Number(row[EVENT_META_COL.REVISION - 1] || 1),
    recordStatus: String(row[EVENT_META_COL.RECORD_STATUS - 1] || 'active').toLowerCase(),
    createdAt: row[EVENT_META_COL.CREATED_AT - 1] || '',
    createdBy: row[EVENT_META_COL.CREATED_BY - 1] || '',
    voidedAt: row[EVENT_META_COL.VOIDED_AT - 1] || '',
    voidedBy: row[EVENT_META_COL.VOIDED_BY - 1] || '',
    voidReason: row[EVENT_META_COL.VOID_REASON - 1] || ''
  };
}

function seedSettings_(ss, assets) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  var rows = [
    ['APP_NAME','Smart SRRT Dashboard & AI Reporter','ชื่อระบบที่แสดงหน้าเว็บ'],
    ['APP_SUBTITLE','ระบบบริหารจัดการข้อมูลระบาดวิทยาและรายงานสอบสวนโรคระดับพื้นที่','คำอธิบายระบบ'],
    ['ORG_NAME','สำนักงานสาธารณสุขอำเภอ','ชื่อหน่วยงาน'],
    ['CONTACT_INFO','โทรศัพท์/อีเมลหน่วยงาน','ข้อมูลติดต่อ'],
    ['LOGO_URL','https://lh3.googleusercontent.com/d/1ANG8ALHZASMzdI4MFLtZHwbWcwS0vMWQ','ลิงก์โลโก้ที่ระบบสร้างหลังอัปโหลด'],
    ['LOGO_FILE_ID','','File ID โลโก้ล่าสุด'],
    ['BANNER_TEXT','ระบบพร้อมใช้งาน','ข้อความประกาศบนหน้าแรก'],
    ['PRIMARY_COLOR','#0f766e','สีหลักของระบบ'],
    ['SECONDARY_COLOR','#2563eb','สีรองของระบบ'],
    ['SYSTEM_STATUS','open','open หรือ closed'],
    ['DATABASE_SPREADSHEET_ID', ss.getId(), 'Spreadsheet ID ฐานข้อมูล'],
    ['MAIN_SHEET_ID', String(ss.getSheetByName(CONFIG.SHEETS.MAIN).getSheetId()), 'Sheet ID ของ MainData'],
    ['SYSTEM_FOLDER_ID', assets.systemFolderId, 'โฟลเดอร์หลักของระบบ'],
    ['LOGO_FOLDER_ID', assets.logoFolderId, 'โฟลเดอร์เก็บโลโก้'],
    ['ATTACHMENT_FOLDER_ID', assets.attachmentFolderId, 'โฟลเดอร์เก็บเอกสารแนบเหตุการณ์'],
    ['AUDIT_RETENTION_DAYS',String(CONFIG.DEFAULT_AUDIT_RETENTION_DAYS),'จำนวนวันที่เก็บ AuditLogs ในฐานข้อมูลหลักก่อน Archive'],
    ['AUDIT_ARCHIVE_SPREADSHEET_ID','','Spreadsheet ID สำหรับเก็บ Audit archive'],
    ['GEMINI_API_KEY','','Gemini API Key ตั้งค่าผ่านหน้า Admin'],
    ['GEMINI_MODEL','AUTO','AUTO หรือชื่อโมเดล Gemini ที่รองรับ generateContent'],
    ['TEMPLATE_DOC_ID',assets.templateDocId,'Google Docs Template สำหรับรายงาน'],
    ['REPORT_FOLDER_ID',assets.reportFolderId,'Google Drive Folder สำหรับจัดเก็บรายงาน'],
    ['ALLOW_SELF_REGISTER','true','เปิดให้ผู้ใช้สมัครเองหรือไม่'],
    ['INSTALL_VERSION',CONFIG.VERSION,'รุ่นโครงสร้างระบบ'],
    ['SCHEMA_VERSION',CONFIG.SCHEMA_VERSION,'รุ่นโครงสร้างข้อมูลถาวร']
  ];
  rows.forEach(function(r) {
    upsertSettingDirect_(sheet, r[0], r[1], r[2], ['DATABASE_SPREADSHEET_ID','MAIN_SHEET_ID','SYSTEM_FOLDER_ID','LOGO_FOLDER_ID','ATTACHMENT_FOLDER_ID','TEMPLATE_DOC_ID','REPORT_FOLDER_ID','INSTALL_VERSION','SCHEMA_VERSION'].indexOf(r[0]) >= 0);
  });
}

function upsertSettingDirect_(sheet, key, value, description, overwrite) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(key)) {
      if (overwrite || values[i][1] === '' || values[i][1] === null) {
        sheet.getRange(i + 1, 2, 1, 4).setValues([[value, description || values[i][2] || '', new Date(), 'system']]);
      }
      return i + 1;
    }
  }
  sheet.appendRow([key, value, description || '', new Date(), 'system']);
  return sheet.getLastRow();
}

function seedMasterData_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  if (sheet.getLastRow() > 1) return;
  var values = [
    ['surveillance','Event-based (EBS)','Event-based (EBS)',1,true],
    ['surveillance','Indicator-based (IBS)','Indicator-based (IBS)',2,true],
    ['disease_group','โรคติดต่อทางเดินหายใจ','โรคติดต่อทางเดินหายใจ',1,true],
    ['disease_group','โรคติดต่อทางเดินอาหารและน้ำ','โรคติดต่อทางเดินอาหารและน้ำ',2,true],
    ['disease_group','โรคติดต่อนำโดยแมลง','โรคติดต่อนำโดยแมลง',3,true],
    ['disease_group','โรคติดต่อจากการสัมผัส','โรคติดต่อจากการสัมผัส',4,true],
    ['disease_group','โรคติดต่ออื่นๆ/ภัยสุขภาพ','โรคติดต่ออื่นๆ/ภัยสุขภาพ',5,true],
    ['event_type','ผู้ป่วยรายเดี่ยว','ผู้ป่วยรายเดี่ยว',1,true],
    ['event_type','การระบาดเป็นกลุ่มก้อน (Cluster)','การระบาดเป็นกลุ่มก้อน (Cluster)',2,true],
    ['event_type','เหตุการณ์ผิดปกติ','เหตุการณ์ผิดปกติ',3,true],
    ['verify_status','รอตรวจสอบ','รอตรวจสอบ',1,true],
    ['verify_status','ตรวจสอบแล้วจริง','ตรวจสอบแล้วจริง',2,true],
    ['verify_status','ตรวจสอบแล้วไม่จริง','ตรวจสอบแล้วไม่จริง',3,true],
    ['criteria','เข้าเกณฑ์','เข้าเกณฑ์',1,true],
    ['criteria','ไม่เข้าเกณฑ์','ไม่เข้าเกณฑ์',2,true],
    ['criteria','รอดำเนินการ','รอดำเนินการ',3,true],
    ['risk','ความเสี่ยงต่ำ','ความเสี่ยงต่ำ',1,true],
    ['risk','ความเสี่ยงปานกลาง','ความเสี่ยงปานกลาง',2,true],
    ['risk','ความเสี่ยงสูง','ความเสี่ยงสูง',3,true],
    ['content_category','ประกาศ','ประกาศ',1,true],
    ['content_category','แนวทางเฝ้าระวังและสอบสวนโรค','แนวทางเฝ้าระวังและสอบสวนโรค',2,true],
    ['content_category','คู่มือ/แบบฟอร์ม','คู่มือ/แบบฟอร์ม',3,true],
    ['content_category','บทความ/องค์ความรู้','บทความ/องค์ความรู้',4,true]
  ];
  var now = new Date();
  sheet.getRange(2,1,values.length,7).setValues(values.map(function(r){ return r.concat([now,'system']); }));
}

function seedSuperAdmin_(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  var defaultEmail = String(Session.getEffectiveUser().getEmail() || 'superadmin@ddc.local').trim().toLowerCase();
  var defaultPassword = 'SRRT-' + Utilities.getUuid().replace(/-/g,'').substring(0,8);
  if (sheet.getLastRow() <= 1) {
    sheet.appendRow([
      Utilities.getUuid(),
      'ผู้ดูแลระบบ',
      defaultEmail,
      hashPassword_(defaultPassword),
      CONFIG.ROLES.SUPER_ADMIN,
      'active',
      'System', '', '', '', new Date(), 'system', new Date(), ''
    ]);
    return {email:defaultEmail, password:defaultPassword, created:true};
  }

  var values = sheet.getDataRange().getValues();
  var firstAdminEmail = '';
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][4]) === CONFIG.ROLES.SUPER_ADMIN) {
      firstAdminEmail = String(values[i][2] || '');
      break;
    }
  }
  return {email:firstAdminEmail || defaultEmail, password:'ใช้รหัสผ่านเดิมของผู้ดูแลระบบ', created:false};
}

function formatSheets_(ss) {
  Object.keys(CONFIG.SHEETS).forEach(function(k) {
    var sh = ss.getSheetByName(CONFIG.SHEETS[k]);
    if (!sh) return;
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 12));
  });
  var main = ss.getSheetByName(CONFIG.SHEETS.MAIN);
  if (main) {
    [2,9,22,26].forEach(function(col){ main.getRange(2,col,Math.max(main.getMaxRows()-1,1),1).setNumberFormat('@'); });
  }
}

function getDb_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DATABASE_SPREADSHEET_ID');
  if (!id) {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) throw new Error('ยังไม่ได้ตั้งค่า DATABASE_SPREADSHEET_ID กรุณา Run installSmartSRRT() ก่อน');
    id = active.getId();
    props.setProperty('DATABASE_SPREADSHEET_ID', id);
  }
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  var ss = getDb_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีท: ' + name + ' กรุณา Run setupDatabase()');
  return sheet;
}

function getSheetByIdOrName_(settingKey, fallbackName) {
  var ss = getDb_();
  var setting = getSettingsMap_();
  var sheetId = setting[settingKey];
  if (sheetId) {
    var sheets = ss.getSheets();
    for (var i=0; i<sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(sheetId)) return sheets[i];
    }
  }
  return ss.getSheetByName(fallbackName);
}

function getSettingsMap_() {
  var sheet = getSheet_(CONFIG.SHEETS.SETTINGS);
  var values = sheet.getDataRange().getValues();
  var map = {};
  values.slice(1).forEach(function(r) { if (r[0]) map[String(r[0])] = r[1]; });
  return map;
}

function getPublicSettings_(settings) {
  settings = settings || {};
  var keys = ['APP_NAME','APP_SUBTITLE','ORG_NAME','CONTACT_INFO','LOGO_URL','BANNER_TEXT','PRIMARY_COLOR','SECONDARY_COLOR','SYSTEM_STATUS','ALLOW_SELF_REGISTER','INSTALL_VERSION'];
  var out = {};
  keys.forEach(function(k){ if (settings[k] !== undefined) out[k] = settings[k]; });
  return out;
}

function keyValueMap_(values, keyIndex, valueIndex) {
  var map = {};
  values.slice(1).forEach(function(r) { if (r[keyIndex]) map[String(r[keyIndex])] = r[valueIndex]; });
  return map;
}

function hashPassword_(plain) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain), Utilities.Charset.UTF_8);
  return raw.map(function(b){ var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function getCurrentUserHint_() {
  return Session.getActiveUser().getEmail() || 'anonymous';
}

function hasPermission_(role, action) {
  var permissions = {
    'Super Admin': ['view','create','edit','delete','report','assign','close_event','users','settings','master','audit','export','approve'],
    'Manager': ['view','create','edit','delete','report','assign','close_event','users','settings','master','audit','export','approve'],
    'Admin': ['view','create','edit','report','export'],
    'Staff': ['view','export']
  };
  return (permissions[role] || []).indexOf(action) >= 0;
}

function requireAuth_(sessionToken, action) {
  var user = getUserByToken_(sessionToken);
  if (!user || user.status !== 'active') throw new Error('กรุณาเข้าสู่ระบบ หรือบัญชียังไม่ผ่านการอนุมัติ');
  if (action && !hasPermission_(user.role, action)) throw new Error('สิทธิ์ไม่เพียงพอสำหรับการทำรายการนี้');
  if (['create','edit','delete','report','assign','close_event'].indexOf(action) >= 0) {
    var systemStatus = String(getSettingsMap_().SYSTEM_STATUS || 'open').toLowerCase();
    if (systemStatus === 'closed') throw new Error('ระบบถูกปิดการบันทึก/แก้ไขชั่วคราวโดยผู้ดูแลระบบ');
  }
  return user;
}

function makeSessionToken_(email) {
  var token = Utilities.getUuid() + '.' + Utilities.getUuid();
  CacheService.getScriptCache().put('srrt_session_' + token, email, 21600);
  return token;
}

function getUserByToken_(token) {
  if (!token) return null;
  var email = CacheService.getScriptCache().get('srrt_session_' + token);
  if (!email) return null;
  return findUserByEmail_(email);
}

function findUserByEmail_(email) {
  var sheet = getSheet_(CONFIG.SHEETS.USERS);
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (String(values[i][2]).toLowerCase() === String(email).toLowerCase()) {
      return {
        rowNumber: i + 1,
        userId: values[i][0],
        name: values[i][1],
        email: values[i][2],
        passwordHash: values[i][3],
        role: values[i][4],
        status: values[i][5],
        org: values[i][6],
        tambon: values[i][7],
        amphoe: values[i][8],
        province: values[i][9]
      };
    }
  }
  return null;
}

function findUserById_(userId) {
  userId = String(userId || '').trim();
  if (!userId) return null;
  var sheet = getSheet_(CONFIG.SHEETS.USERS);
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (String(values[i][0] || '').trim() === userId) {
      return {
        rowNumber: i + 1,
        userId: values[i][0],
        name: values[i][1],
        email: values[i][2],
        passwordHash: values[i][3],
        role: values[i][4],
        status: values[i][5],
        org: values[i][6],
        tambon: values[i][7],
        amphoe: values[i][8],
        province: values[i][9]
      };
    }
  }
  return null;
}

function getUserDirectoryById_() {
  var values = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  var out = {};
  values.forEach(function(r) {
    var userId = String(r[0] || '').trim();
    if (!userId) return;
    out[userId] = {
      userId:userId,
      name:r[1] || '',
      email:r[2] || '',
      role:r[4] || '',
      status:r[5] || '',
      org:r[6] || ''
    };
  });
  return out;
}

function enrichEventOwners_(rows) {
  var users = getUserDirectoryById_();
  return rows.map(function(r) {
    var owner = r.ownerUserId ? users[r.ownerUserId] : null;
    r.ownerName = owner ? owner.name : '';
    r.ownerEmail = owner ? owner.email : '';
    r.ownerRole = owner ? owner.role : '';
    r.ownerStatus = owner ? owner.status : '';
    r.ownerOrg = owner ? owner.org : '';
    r.ownerMissing = !!(r.ownerUserId && !owner);
    return r;
  });
}

function listAssignableEventOwners(sessionToken) {
  requireAuth_(sessionToken, 'assign');
  var values = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  return values.map(function(r) {
    return {
      userId:String(r[0] || '').trim(),
      name:r[1] || '',
      email:r[2] || '',
      role:r[4] || '',
      status:r[5] || '',
      org:r[6] || ''
    };
  }).filter(function(u) {
    return u.userId && u.status === 'active' && hasPermission_(u.role, 'edit');
  }).sort(function(a,b) {
    return String(a.name || a.email).localeCompare(String(b.name || b.email), 'th');
  });
}

function enrichEventAttachments_(rows) {
  var ss = getDb_();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.ATTACHMENTS);
  var counts = {};
  if (sheet && sheet.getLastRow() > 1) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, EVENT_ATTACHMENT_HEADERS.length).getValues();
    values.forEach(function(r) {
      var eventId = String(r[EVENT_ATTACHMENT_COL.EVENT_ID - 1] || '').trim();
      var status = String(r[EVENT_ATTACHMENT_COL.STATUS - 1] || 'active').trim().toLowerCase();
      if (eventId && status === 'active') counts[eventId] = (counts[eventId] || 0) + 1;
    });
  }
  return rows.map(function(r) {
    r.attachmentCount = counts[r.eventId] || 0;
    return r;
  });
}

function attachmentMimeAllowed_(mimeType) {
  return [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ].indexOf(String(mimeType || '').toLowerCase()) >= 0;
}

function validateAttachmentMagic_(bytes, mimeType) {
  function b_(i) {
    var v = Number(bytes[i] || 0);
    return v < 0 ? v + 256 : v;
  }
  mimeType = String(mimeType || '').toLowerCase();
  if (mimeType === 'application/pdf') {
    return b_(0) === 0x25 && b_(1) === 0x50 && b_(2) === 0x44 && b_(3) === 0x46 && b_(4) === 0x2d;
  }
  if (mimeType === 'image/jpeg') {
    return b_(0) === 0xff && b_(1) === 0xd8 && b_(2) === 0xff;
  }
  if (mimeType === 'image/png') {
    return b_(0) === 0x89 && b_(1) === 0x50 && b_(2) === 0x4e && b_(3) === 0x47 &&
      b_(4) === 0x0d && b_(5) === 0x0a && b_(6) === 0x1a && b_(7) === 0x0a;
  }
  if (mimeType === 'image/webp') {
    return b_(0) === 0x52 && b_(1) === 0x49 && b_(2) === 0x46 && b_(3) === 0x46 &&
      b_(8) === 0x57 && b_(9) === 0x45 && b_(10) === 0x42 && b_(11) === 0x50;
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return b_(0) === 0x50 && b_(1) === 0x4b && b_(2) === 0x03 && b_(3) === 0x04;
  }
  return false;
}

function sanitizeAttachmentFileName_(name) {
  var clean = String(name || 'attachment')
    .replace(/[\\\/:*?"<>|]+/g, '_')
    .replace(/[\r\n\t]+/g, '_')
    .trim();
  if (!clean) clean = 'attachment';
  if (clean.length > 120) clean = clean.substring(0, 120);
  return clean;
}

function formatAttachmentDateTime_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value);
}

function getEventAttachmentRoot_() {
  var settings = getSettingsMap_();
  var folderId = String(settings.ATTACHMENT_FOLDER_ID || '').trim();
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (ignore) {}
  }
  var assets = ensureSystemAssets_(getDb_());
  var settingsSheet = getSheet_(CONFIG.SHEETS.SETTINGS);
  upsertSettingDirect_(settingsSheet, 'ATTACHMENT_FOLDER_ID', assets.attachmentFolderId, 'Google Drive Folder สำหรับเอกสารแนบเหตุการณ์', true);
  PropertiesService.getScriptProperties().setProperty('ATTACHMENT_FOLDER_ID', assets.attachmentFolderId);
  return DriveApp.getFolderById(assets.attachmentFolderId);
}

function getEventAttachmentFolder_(eventId) {
  var root = getEventAttachmentRoot_();
  var matches = root.getFoldersByName(String(eventId));
  if (matches.hasNext()) return matches.next();
  return root.createFolder(String(eventId));
}

function findAttachmentRowById_(sheet, attachmentId, includeRemoved) {
  attachmentId = String(attachmentId || '').trim();
  if (!isUuid_(attachmentId)) throw new Error('AttachmentID ไม่ถูกต้อง');
  var count = Math.max(sheet.getLastRow() - 1, 0);
  if (!count) throw new Error('ไม่พบเอกสารแนบ');
  var values = sheet.getRange(2, 1, count, EVENT_ATTACHMENT_HEADERS.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][EVENT_ATTACHMENT_COL.ATTACHMENT_ID - 1] || '').trim() === attachmentId) {
      var status = String(values[i][EVENT_ATTACHMENT_COL.STATUS - 1] || 'active').trim().toLowerCase();
      if (!includeRemoved && status === 'removed') throw new Error('เอกสารแนบนี้ถูกนำออกแล้ว');
      return {rowNumber:i + 2, values:values[i]};
    }
  }
  throw new Error('ไม่พบ AttachmentID: ' + attachmentId);
}

function listEventAttachments(sessionToken, eventId) {
  requireAuth_(sessionToken, 'view');
  var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(main, eventId, false);

  var ss = getDb_();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.ATTACHMENTS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, EVENT_ATTACHMENT_HEADERS.length).getValues();
  return values.filter(function(r) {
    return String(r[EVENT_ATTACHMENT_COL.EVENT_ID - 1] || '').trim() === String(eventId) &&
      String(r[EVENT_ATTACHMENT_COL.STATUS - 1] || 'active').trim().toLowerCase() === 'active';
  }).map(function(r) {
    return {
      attachmentId:String(r[EVENT_ATTACHMENT_COL.ATTACHMENT_ID - 1] || ''),
      fileName:String(r[EVENT_ATTACHMENT_COL.FILE_NAME - 1] || ''),
      mimeType:String(r[EVENT_ATTACHMENT_COL.MIME_TYPE - 1] || ''),
      sizeBytes:Number(r[EVENT_ATTACHMENT_COL.SIZE_BYTES - 1] || 0),
      description:String(r[EVENT_ATTACHMENT_COL.DESCRIPTION - 1] || ''),
      uploadedAt:formatAttachmentDateTime_(r[EVENT_ATTACHMENT_COL.UPLOADED_AT - 1]),
      uploadedBy:String(r[EVENT_ATTACHMENT_COL.UPLOADED_BY - 1] || '')
    };
  }).sort(function(a,b) {
    return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
  });
}

function uploadEventAttachment(sessionToken, eventId, payload, expectedRevision) {
  var user = requireAuth_(sessionToken, 'edit');
  payload = payload || {};
  var expected = Number(expectedRevision);
  if (!expected || expected < 1 || Math.floor(expected) !== expected) {
    throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนแนบไฟล์');
  }

  var mimeType = String(payload.mimeType || '').toLowerCase();
  if (!attachmentMimeAllowed_(mimeType)) {
    throw new Error('รองรับเฉพาะ PDF, JPG/JPEG, PNG, WEBP, DOCX และ XLSX');
  }

  var base64 = String(payload.base64 || '');
  if (!base64) throw new Error('ไม่พบข้อมูลไฟล์แนบ');
  var bytes = Utilities.base64Decode(base64);
  if (!bytes.length) throw new Error('ไฟล์แนบไม่มีข้อมูล');
  if (bytes.length > CONFIG.MAX_ATTACHMENT_BYTES) throw new Error('ไฟล์แนบต้องมีขนาดไม่เกิน 5 MB');
  if (!validateAttachmentMagic_(bytes, mimeType)) throw new Error('ชนิดไฟล์ไม่ตรงกับเนื้อหาไฟล์ หรือไฟล์ไม่รองรับ');

  var fileName = sanitizeAttachmentFileName_(payload.name);
  var description = String(payload.description || '').trim();
  if (description.length > 500) throw new Error('รายละเอียดไฟล์แนบต้องไม่เกิน 500 ตัวอักษร');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(main, eventId, false);
    var status = String(main.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    if (status === 'closed') throw new Error('เหตุการณ์นี้ถูกปิดแล้ว กรุณาเปิดเหตุการณ์อีกครั้งก่อนแนบไฟล์');

    var currentRevision = Number(main.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนแนบไฟล์');
    }

    var attachmentSheet = ensureEventAttachmentSheet_(ss);
    var folder = getEventAttachmentFolder_(eventId);
    var attachmentId = Utilities.getUuid();
    var now = new Date();
    var file = null;
    try {
      file = folder.createFile(Utilities.newBlob(bytes, mimeType, attachmentId + '_' + fileName));
      attachmentSheet.appendRow([
        attachmentId,
        eventId,
        file.getId(),
        fileName,
        mimeType,
        bytes.length,
        description,
        'active',
        now,
        user.email || '',
        '',
        '',
        ''
      ]);

      main.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
      main.getRange(rowNumber, 27).setValue(user.email || '');
      main.getRange(rowNumber, 28).setValue(now);
    } catch (e) {
      if (file) {
        try { file.setTrashed(true); } catch (ignore) {}
      }
      throw e;
    }

    writeAudit_(
      user,
      'UPLOAD_EVENT_ATTACHMENT',
      CONFIG.SHEETS.ATTACHMENTS,
      attachmentId,
      '',
      JSON.stringify({eventId:eventId, fileName:fileName, mimeType:mimeType, sizeBytes:bytes.length})
    );

    return {
      ok:true,
      message:'แนบไฟล์เรียบร้อยแล้ว',
      attachmentId:attachmentId,
      revision:currentRevision + 1
    };
  } finally {
    lock.releaseLock();
  }
}

function downloadEventAttachment(sessionToken, attachmentId) {
  var user = requireAuth_(sessionToken, 'view');
  var sheet = getSheet_(CONFIG.SHEETS.ATTACHMENTS);
  var found = findAttachmentRowById_(sheet, attachmentId, false);
  var row = found.values;
  var eventId = String(row[EVENT_ATTACHMENT_COL.EVENT_ID - 1] || '').trim();

  var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(main, eventId, false);

  var fileId = String(row[EVENT_ATTACHMENT_COL.FILE_ID - 1] || '').trim();
  var file;
  try { file = DriveApp.getFileById(fileId); }
  catch (e) { throw new Error('ไม่พบไฟล์เอกสารแนบใน Google Drive'); }

  var blob = file.getBlob();
  var bytes = blob.getBytes();
  if (bytes.length > CONFIG.MAX_ATTACHMENT_BYTES) {
    throw new Error('ไฟล์เอกสารแนบมีขนาดเกินขีดจำกัดการดาวน์โหลดของระบบ');
  }

  writeAudit_(
    user,
    'DOWNLOAD_EVENT_ATTACHMENT',
    CONFIG.SHEETS.ATTACHMENTS,
    attachmentId,
    '',
    JSON.stringify({eventId:eventId, fileName:String(row[EVENT_ATTACHMENT_COL.FILE_NAME - 1] || file.getName())})
  );

  return {
    fileName:String(row[EVENT_ATTACHMENT_COL.FILE_NAME - 1] || file.getName()),
    mimeType:String(row[EVENT_ATTACHMENT_COL.MIME_TYPE - 1] || blob.getContentType() || 'application/octet-stream'),
    sizeBytes:bytes.length,
    base64:Utilities.base64Encode(bytes)
  };
}

function removeEventAttachment(sessionToken, attachmentId, removeReason, expectedRevision) {
  var user = requireAuth_(sessionToken, 'delete');
  var reason = String(removeReason || '').trim();
  if (!reason) throw new Error('กรุณาระบุเหตุผลในการนำเอกสารแนบออก');
  var expected = Number(expectedRevision);
  if (!expected || expected < 1 || Math.floor(expected) !== expected) {
    throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนนำเอกสารแนบออก');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var sheet = ensureEventAttachmentSheet_(ss);
    var found = findAttachmentRowById_(sheet, attachmentId, true);
    var row = found.values;
    var status = String(row[EVENT_ATTACHMENT_COL.STATUS - 1] || 'active').trim().toLowerCase();
    var eventId = String(row[EVENT_ATTACHMENT_COL.EVENT_ID - 1] || '').trim();

    var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var eventRow = findEventRowById_(main, eventId, false);
    var eventStatus = String(main.getRange(eventRow, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    if (eventStatus === 'closed') throw new Error('เหตุการณ์นี้ถูกปิดแล้ว กรุณาเปิดเหตุการณ์อีกครั้งก่อนนำเอกสารแนบออก');

    var currentRevision = Number(main.getRange(eventRow, EVENT_META_COL.REVISION).getValue() || 1);
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนนำเอกสารแนบออก');
    }
    if (status === 'removed') return {ok:true, message:'เอกสารแนบนี้ถูกนำออกไว้แล้ว', revision:currentRevision};

    var now = new Date();
    sheet.getRange(found.rowNumber, EVENT_ATTACHMENT_COL.STATUS).setValue('removed');
    sheet.getRange(found.rowNumber, EVENT_ATTACHMENT_COL.REMOVED_AT).setValue(now);
    sheet.getRange(found.rowNumber, EVENT_ATTACHMENT_COL.REMOVED_BY).setValue(user.email || '');
    sheet.getRange(found.rowNumber, EVENT_ATTACHMENT_COL.REMOVE_REASON).setValue(reason);

    main.getRange(eventRow, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    main.getRange(eventRow, 27).setValue(user.email || '');
    main.getRange(eventRow, 28).setValue(now);

    writeAudit_(
      user,
      'REMOVE_EVENT_ATTACHMENT',
      CONFIG.SHEETS.ATTACHMENTS,
      attachmentId,
      JSON.stringify({eventId:eventId, status:status}),
      JSON.stringify({eventId:eventId, status:'removed', reason:reason})
    );

    return {ok:true, message:'นำเอกสารแนบออกจากเหตุการณ์แล้ว', revision:currentRevision + 1};
  } finally {
    lock.releaseLock();
  }
}

function assignEventOwner(sessionToken, eventId, ownerUserId, expectedRevision) {
  var actor = requireAuth_(sessionToken, 'assign');
  var expected = Number(expectedRevision);
  if (!expected || expected < 1 || Math.floor(expected) !== expected) {
    throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนเปลี่ยนผู้รับผิดชอบ');
  }

  ownerUserId = String(ownerUserId || '').trim();
  var owner = null;
  if (ownerUserId) {
    owner = findUserById_(ownerUserId);
    if (!owner) throw new Error('ไม่พบบัญชีผู้รับผิดชอบที่เลือก');
    if (owner.status !== 'active') throw new Error('บัญชีผู้รับผิดชอบที่เลือกไม่ได้อยู่ในสถานะ active');
    if (!hasPermission_(owner.role, 'edit')) throw new Error('บัญชีผู้รับผิดชอบที่เลือกไม่มีสิทธิ์แก้ไขเหตุการณ์');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var sheet = ensureEventOwnerSchema_(ss);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var status = String(sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    if (status === 'closed') throw new Error('เหตุการณ์นี้ถูกปิดแล้ว กรุณาเปิดเหตุการณ์อีกครั้งก่อนเปลี่ยนผู้รับผิดชอบ');
    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนเปลี่ยนผู้รับผิดชอบ');
    }

    var beforeOwnerUserId = String(sheet.getRange(rowNumber, EVENT_OWNER_COL).getValue() || '').trim();
    if (beforeOwnerUserId === ownerUserId) {
      return ownerUserId ? 'ผู้รับผิดชอบเหตุการณ์ไม่เปลี่ยนแปลง' : 'เหตุการณ์นี้ยังไม่ได้กำหนดผู้รับผิดชอบ';
    }

    sheet.getRange(rowNumber, EVENT_OWNER_COL).setValue(ownerUserId);
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    sheet.getRange(rowNumber, 27).setValue(actor.email || '');
    sheet.getRange(rowNumber, 28).setValue(new Date());

    writeAudit_(
      actor,
      'ASSIGN_EVENT_OWNER',
      CONFIG.SHEETS.MAIN,
      eventId,
      JSON.stringify({ownerUserId:beforeOwnerUserId}),
      JSON.stringify({ownerUserId:ownerUserId, ownerName:owner ? owner.name : ''})
    );

    return ownerUserId
      ? 'กำหนดผู้รับผิดชอบเหตุการณ์เรียบร้อยแล้ว'
      : 'ยกเลิกการกำหนดผู้รับผิดชอบเหตุการณ์เรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function login(payload) {
  var email = String(payload.email || '').trim().toLowerCase();
  var password = String(payload.password || '');
  var user = findUserByEmail_(email);
  if (!user || user.passwordHash !== hashPassword_(password)) return {ok:false, message:'อีเมลหรือรหัสผ่านไม่ถูกต้อง'};
  if (user.status !== 'active') return {ok:false, message:'บัญชียังไม่พร้อมใช้งาน สถานะ: ' + user.status};
  var token = makeSessionToken_(email);
  getSheet_(CONFIG.SHEETS.USERS).getRange(user.rowNumber, 14).setValue(new Date());
  writeAudit_(user, 'LOGIN', CONFIG.SHEETS.USERS, user.userId, '', 'เข้าสู่ระบบ');
  return {ok:true, token:token, user: publicUser_(user)};
}

function logout(sessionToken) {
  CacheService.getScriptCache().remove('srrt_session_' + sessionToken);
  return true;
}

function registerUser(payload) {
  var settings = getSettingsMap_();
  if (String(settings.ALLOW_SELF_REGISTER).toLowerCase() !== 'true') throw new Error('ระบบปิดการสมัครผู้ใช้ใหม่');
  var email = String(payload.email || '').trim().toLowerCase();
  if (!email || !payload.password || !payload.name) throw new Error('กรุณากรอกชื่อ อีเมล และรหัสผ่าน');
  if (String(payload.password).length < 4) throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
  if (findUserByEmail_(email)) throw new Error('อีเมลนี้มีในระบบแล้ว');
  getSheet_(CONFIG.SHEETS.USERS).appendRow([
    Utilities.getUuid(), payload.name, email, hashPassword_(payload.password), CONFIG.ROLES.STAFF, 'pending', payload.org || '', payload.tambon || '', payload.amphoe || '', payload.province || '', new Date(), '', '', ''
  ]);
  writeAudit_({email:email, role:'SelfRegister'}, 'REGISTER', CONFIG.SHEETS.USERS, email, '', 'สมัครผู้ใช้ใหม่');
  return 'สมัครใช้งานเรียบร้อยแล้ว รอผู้ดูแลระบบอนุมัติ';
}

function publicUser_(u) {
  return {name:u.name, email:u.email, role:u.role, status:u.status, org:u.org, tambon:u.tambon, amphoe:u.amphoe, province:u.province};
}

function getAppBoot(sessionToken) {
  var settings = getSettingsMap_();
  var user = null;
  try { user = getUserByToken_(sessionToken); } catch(e) {}
  return {
    settings: getPublicSettings_(settings),
    user: user ? publicUser_(user) : null,
    master: getMasterData(),
    areas: getAreaMaster(),
    content: getPublishedContent(),
    version: CONFIG.VERSION,
    systemOpen: String(settings.SYSTEM_STATUS || 'open') === 'open'
  };
}

function getMasterData() {
  var values = getSheet_(CONFIG.SHEETS.MASTER).getDataRange().getValues().slice(1);
  var out = {};
  values.forEach(function(r) {
    if (String(r[4]).toLowerCase() === 'false') return;
    var type = r[0];
    if (!out[type]) out[type] = [];
    out[type].push({value:r[1], label:r[2] || r[1], sort:Number(r[3] || 999)});
  });
  Object.keys(out).forEach(function(k){ out[k].sort(function(a,b){return a.sort-b.sort;}); });
  return out;
}

function normalizeMasterKey_(value) {
  return String(value || '').trim().toLowerCase();
}

function getActiveMasterValueSets_() {
  var sets = {};
  Object.keys(MASTER_DATA_POLICIES).forEach(function(type){ sets[type] = {}; });
  var rows = getSheet_(CONFIG.SHEETS.MASTER).getDataRange().getValues().slice(1);
  rows.forEach(function(r) {
    var type = String(r[0] || '').trim();
    var value = String(r[1] || '').trim();
    var active = String(r[4]).toLowerCase() !== 'false';
    if (!type || !value || !active || !sets[type]) return;
    sets[type][value] = true;
  });
  return sets;
}

function validateEventMasterData_(data, beforeRow) {
  var mapping = {
    4:'surveillance',
    5:'disease_group',
    7:'event_type',
    15:'verify_status',
    17:'criteria',
    19:'risk'
  };
  var sets = getActiveMasterValueSets_();

  Object.keys(mapping).forEach(function(colKey) {
    var col = Number(colKey);
    var type = mapping[col];
    var value = String((data || {})['col' + col] || '').trim();
    if (!value) return;
    if (sets[type] && sets[type][value]) return;

    var oldValue = beforeRow ? String(beforeRow[col - 1] || '').trim() : '';
    if (beforeRow && oldValue === value) return;

    throw new Error('ค่า "' + value + '" ของ ' + MASTER_DATA_POLICIES[type].label + ' ไม่อยู่ใน MasterData ที่เปิดใช้งาน');
  });
}

function isActiveMasterValue_(type, value) {
  getMasterPolicy_(type);
  value = String(value || '').trim();
  if (!value) return false;
  var sets = getActiveMasterValueSets_();
  return !!(sets[type] && sets[type][value]);
}

function getMasterPolicy_(type) {
  type = String(type || '').trim();
  var policy = MASTER_DATA_POLICIES[type];
  if (!policy) throw new Error('MasterData Type ไม่ได้รับอนุญาต: ' + type);
  return policy;
}

function buildMasterDataUsageMap_() {
  var usage = {};
  Object.keys(MASTER_DATA_POLICIES).forEach(function(type){ usage[type] = {}; });

  var mainPolicies = Object.keys(MASTER_DATA_POLICIES).filter(function(type){
    return MASTER_DATA_POLICIES[type].sourceSheet === 'main';
  });
  if (mainPolicies.length) {
    var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var mainRows = main.getDataRange().getValues().slice(1);
    mainRows.forEach(function(row) {
      mainPolicies.forEach(function(type) {
        var policy = MASTER_DATA_POLICIES[type];
        var value = String(row[policy.sourceColumn - 1] || '').trim();
        if (value) usage[type][value] = (usage[type][value] || 0) + 1;
      });
    });
  }

  var contentPolicies = Object.keys(MASTER_DATA_POLICIES).filter(function(type){
    return MASTER_DATA_POLICIES[type].sourceSheet === 'content';
  });
  if (contentPolicies.length) {
    var content = getSheet_(CONFIG.SHEETS.CONTENT);
    var contentRows = content.getDataRange().getValues().slice(1);
    contentRows.forEach(function(row) {
      contentPolicies.forEach(function(type) {
        var policy = MASTER_DATA_POLICIES[type];
        var value = String(row[policy.sourceColumn - 1] || '').trim();
        if (value) usage[type][value] = (usage[type][value] || 0) + 1;
      });
    });
  }

  return usage;
}

function countMasterDataUsage_(type, value, usageMap) {
  getMasterPolicy_(type);
  var wanted = String(value || '').trim();
  if (!wanted) return 0;
  var map = usageMap || buildMasterDataUsageMap_();
  return map[type] && map[type][wanted] ? map[type][wanted] : 0;
}

function getMasterDataAdmin(sessionToken) {
  requireAuth_(sessionToken, 'master');
  var sheet = getSheet_(CONFIG.SHEETS.MASTER);
  var rows = sheet.getDataRange().getValues().slice(1);
  var usageMap = buildMasterDataUsageMap_();
  var items = [];

  rows.forEach(function(r) {
    var type = String(r[0] || '').trim();
    var value = String(r[1] || '').trim();
    if (!type || !value || !MASTER_DATA_POLICIES[type]) return;
    var policy = MASTER_DATA_POLICIES[type];
    items.push({
      type:type,
      typeLabel:policy.label,
      value:value,
      label:String(r[2] || value),
      sortOrder:Number(r[3] || 999),
      active:String(r[4]).toLowerCase() !== 'false',
      usageCount:countMasterDataUsage_(type, value, usageMap),
      allowCreate:policy.allowCreate,
      allowDeactivate:policy.allowDeactivate,
      semanticLocked:policy.semanticLocked
    });
  });

  items.sort(function(a,b) {
    return String(a.typeLabel).localeCompare(String(b.typeLabel), 'th') ||
      a.sortOrder - b.sortOrder ||
      String(a.label).localeCompare(String(b.label), 'th');
  });

  var types = Object.keys(MASTER_DATA_POLICIES).map(function(type) {
    var p = MASTER_DATA_POLICIES[type];
    return {
      type:type,
      label:p.label,
      allowCreate:p.allowCreate,
      allowDeactivate:p.allowDeactivate,
      semanticLocked:p.semanticLocked
    };
  }).sort(function(a,b){ return String(a.label).localeCompare(String(b.label), 'th'); });

  return {types:types, items:items};
}

function saveMasterDataItem(sessionToken, item) {
  var user = requireAuth_(sessionToken, 'master');
  item = item || {};

  var mode = String(item.mode || '').trim().toLowerCase();
  if (['create','update'].indexOf(mode) < 0) throw new Error('โหมดการบันทึก MasterData ไม่ถูกต้อง');

  var type = String(item.type || '').trim();
  var value = String(item.value || '').trim();
  var label = String(item.label || '').trim();
  var sortOrder = Number(item.sortOrder);
  var active = !(item.active === false || String(item.active).toLowerCase() === 'false');
  var policy = getMasterPolicy_(type);

  if (!value) throw new Error('กรุณาระบุ Value');
  if (!label) throw new Error('กรุณาระบุ Label');
  if (value.length > 120) throw new Error('Value ต้องไม่เกิน 120 ตัวอักษร');
  if (label.length > 160) throw new Error('Label ต้องไม่เกิน 160 ตัวอักษร');
  if (!isFinite(sortOrder) || Math.floor(sortOrder) !== sortOrder || sortOrder < 1 || sortOrder > 9999) {
    throw new Error('SortOrder ต้องเป็นจำนวนเต็ม 1-9999');
  }
  if (!policy.allowDeactivate && !active) {
    throw new Error('Type นี้เป็นค่าควบคุมของระบบและไม่อนุญาตให้ปิดใช้งาน');
  }

  var sheet = getSheet_(CONFIG.SHEETS.MASTER);
  var rows = sheet.getDataRange().getValues();
  var wantedKey = normalizeMasterKey_(value);
  var matchRow = 0;
  var duplicateRow = 0;

  for (var i = 1; i < rows.length; i++) {
    var rowType = String(rows[i][0] || '').trim();
    var rowValue = String(rows[i][1] || '').trim();
    if (rowType !== type) continue;
    if (normalizeMasterKey_(rowValue) === wantedKey) {
      duplicateRow = i + 1;
      if (rowValue === value) matchRow = i + 1;
      break;
    }
  }

  var now = new Date();
  if (mode === 'create') {
    if (!policy.allowCreate) {
      throw new Error('Type นี้เป็นค่าควบคุมของระบบและไม่อนุญาตให้สร้าง Value ใหม่');
    }
    if (duplicateRow) throw new Error('มี MasterData Type/Value นี้อยู่แล้ว');
    sheet.appendRow([type, value, label, sortOrder, active, now, user.email || '']);
    writeAudit_(
      user,
      'CREATE_MASTER_DATA',
      CONFIG.SHEETS.MASTER,
      type + ':' + value,
      '',
      JSON.stringify({type:type,value:value,label:label,sortOrder:sortOrder,active:active})
    );
    return 'เพิ่ม MasterData เรียบร้อยแล้ว';
  }

  var originalType = String(item.originalType || '').trim();
  var originalValue = String(item.originalValue || '').trim();
  if (!originalType || !originalValue) throw new Error('ไม่พบ identity เดิมของ MasterData');
  if (originalType !== type || originalValue !== value) {
    throw new Error('ไม่อนุญาตให้เปลี่ยน Type หรือ Value ของ MasterData เดิม');
  }
  if (!matchRow) throw new Error('ไม่พบ MasterData ที่ต้องการแก้ไข');

  var before = sheet.getRange(matchRow, 1, 1, 7).getValues()[0];
  sheet.getRange(matchRow, 3, 1, 5).setValues([[
    label,
    sortOrder,
    active,
    now,
    user.email || ''
  ]]);

  writeAudit_(
    user,
    'UPDATE_MASTER_DATA',
    CONFIG.SHEETS.MASTER,
    type + ':' + value,
    JSON.stringify({
      type:before[0],
      value:before[1],
      label:before[2],
      sortOrder:before[3],
      active:String(before[4]).toLowerCase() !== 'false'
    }),
    JSON.stringify({type:type,value:value,label:label,sortOrder:sortOrder,active:active})
  );

  return 'บันทึก MasterData เรียบร้อยแล้ว';
}

function getPublishedContent() {
  var values = getSheet_(CONFIG.SHEETS.CONTENT).getDataRange().getValues().slice(1);
  return values.filter(function(r){ return String(r[6]).toLowerCase() === 'published'; }).map(function(r){
    return {id:r[0], category:r[1], title:r[2], description:r[3], url:r[4], fileId:r[5], sort:r[7] || 999};
  }).sort(function(a,b){return Number(a.sort)-Number(b.sort);});
}

function getFilteredEventRows_(filter) {
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];
  var rows = data.slice(1);
  var result = rows.map(function(row) {
    return rowToObject_(row);
  }).filter(function(r) { return r.col2 !== '' && String(r.recordStatus || 'active').toLowerCase() !== 'void'; });

  filter = filter || {};
  if (filter.startDate || filter.endDate) {
    var startThai = filter.startDate ? isoToThaiDate_(filter.startDate) : '0000-00-00';
    var endThai = filter.endDate ? isoToThaiDate_(filter.endDate) : '9999-99-99';
    result = result.filter(function(r){ return r.col2 && r.col2 >= startThai && r.col2 <= endThai; });
  }
  if (filter.province) result = result.filter(function(r){ return String(r.col13) === String(filter.province); });
  if (filter.amphoe) result = result.filter(function(r){ return String(r.col12) === String(filter.amphoe); });
  if (filter.tambon) result = result.filter(function(r){ return String(r.col11) === String(filter.tambon); });
  if (filter.village) result = result.filter(function(r){
    return String(r.col29) === String(filter.village) || ('หมู่ ' + String(r.col10)) === String(filter.village);
  });
  return result;
}

function getDashboardData(sessionToken, filter) {
  requireAuth_(sessionToken, 'view');
  return enrichEventAttachments_(enrichEventOwners_(getFilteredEventRows_(filter || {})));
}

function getPublicDashboardData(filter) {
  return buildDashboardAggregate_(getFilteredEventRows_(filter || {}));
}

function isInvestigationCriteriaMet_(value) {
  return String(value || '').trim() === 'เข้าเกณฑ์';
}

function buildDashboardAggregate_(rows) {
  var byVillage = {};
  var byMonth = {};
  var byDiseaseGroup = {};
  var byRisk = {};
  var byDisease = {};
  var criteria = 0;
  var investigated = 0;
  var pendingCriteria = 0;

  rows.forEach(function(r) {
    var village = r.col29
      ? ('บ้าน' + r.col29 + (r.col10 ? ' หมู่ ' + r.col10 : ''))
      : (r.col10 ? 'หมู่ ' + r.col10 : 'ไม่ระบุหมู่บ้าน');
    var month = r.col2 ? String(r.col2).substring(0, 7) : 'ไม่ระบุ';
    var diseaseGroup = String(r.col5 || 'ไม่ระบุ');
    var risk = String(r.col19 || 'ไม่ระบุ');
    var disease = String(r.col6 || 'ไม่ระบุ');
    var meetsCriteria = isInvestigationCriteriaMet_(r.col17);
    var hasInvestigationDate = r.col26 !== '';

    byVillage[village] = (byVillage[village] || 0) + 1;
    byMonth[month] = (byMonth[month] || 0) + 1;
    byDiseaseGroup[diseaseGroup] = (byDiseaseGroup[diseaseGroup] || 0) + 1;
    byRisk[risk] = (byRisk[risk] || 0) + 1;
    byDisease[disease] = (byDisease[disease] || 0) + 1;

    if (meetsCriteria) {
      criteria++;
      if (!hasInvestigationDate) pendingCriteria++;
    }
    if (hasInvestigationDate) investigated++;
  });

  function sortedEntries_(map, alpha) {
    var keys = Object.keys(map);
    if (alpha) keys.sort();
    else keys.sort(function(a,b){ return map[b] - map[a] || String(a).localeCompare(String(b), 'th'); });
    return keys.map(function(k){ return [k, map[k]]; });
  }

  var diseaseEntries = sortedEntries_(byDisease, false);
  var villageEntries = sortedEntries_(byVillage, false);
  var total = rows.length;
  var rate = criteria
    ? Math.round(investigated / criteria * 100)
    : (total ? Math.round(investigated / total * 100) : 0);

  return {
    kpi: {
      events: total,
      criteria: criteria,
      investigated: investigated,
      investigationRate: rate,
      pendingCriteria: pendingCriteria
    },
    topDisease: diseaseEntries.length ? diseaseEntries[0][0] : 'ไม่ระบุ',
    topVillage: villageEntries.length ? villageEntries[0][0] : 'ไม่ระบุ',
    byVillage: villageEntries,
    byMonth: sortedEntries_(byMonth, true),
    byDiseaseGroup: sortedEntries_(byDiseaseGroup, false),
    byRisk: sortedEntries_(byRisk, false)
  };
}

function deriveEventLifecycle_(event) {
  event = event || {};
  var recordStatus = String(event.recordStatus || 'active').trim().toLowerCase();
  var verification = String(event.col15 || '').trim();
  var criteria = String(event.col17 || '').trim();
  var investigationDate = String(event.col26 || '').trim();

  if (recordStatus === 'void') {
    return {code:'voided', label:'ยกเลิก'};
  }
  if (recordStatus === 'closed') {
    return {code:'closed', label:'ปิดเหตุการณ์แล้ว'};
  }

  // A recorded investigation date is the strongest existing evidence that
  // the investigation has already taken place. Earlier contradictory fields
  // are surfaced later by G-04 rather than hidden by lifecycle derivation.
  if (investigationDate) {
    return {code:'investigated', label:'สอบสวนแล้ว'};
  }

  if (isInvestigationCriteriaMet_(criteria)) {
    return {code:'investigation_required', label:'รอสอบสวน'};
  }
  if (criteria === 'ไม่เข้าเกณฑ์') {
    return {code:'criteria_not_met', label:'ไม่เข้าเกณฑ์สอบสวน'};
  }
  if (criteria === 'รอดำเนินการ') {
    return {code:'criteria_pending', label:'รอประเมินเกณฑ์'};
  }

  if (verification === 'ตรวจสอบแล้วไม่จริง') {
    return {code:'verification_rejected', label:'ตรวจสอบแล้วไม่จริง'};
  }
  if (verification === 'ตรวจสอบแล้วจริง') {
    return {code:'criteria_pending', label:'รอประเมินเกณฑ์'};
  }
  if (verification === 'รอตรวจสอบ') {
    return {code:'verification_pending', label:'รอตรวจสอบ'};
  }

  return {code:'received', label:'รับแจ้งแล้ว'};
}

function deriveEventConsistencyWarnings_(event) {
  event = event || {};
  var recordStatus = String(event.recordStatus || 'active').trim().toLowerCase();
  if (recordStatus === 'void') return [];

  var verification = String(event.col15 || '').trim();
  var criteria = String(event.col17 || '').trim();
  var investigationDecision = String(event.col24 || '').trim();
  var investigationDate = String(event.col26 || '').trim();
  var warnings = [];

  function add_(code, message) {
    warnings.push({code:code, message:message});
  }

  if (verification === 'ตรวจสอบแล้วไม่จริง' && isInvestigationCriteriaMet_(criteria)) {
    add_('VERIFY_FALSE_BUT_CRITERIA_MET', 'ตรวจสอบแล้วไม่จริง แต่ระบุว่าเข้าเกณฑ์สอบสวนโรค');
  }
  if (verification === 'ตรวจสอบแล้วไม่จริง' && investigationDate) {
    add_('VERIFY_FALSE_BUT_INVESTIGATED', 'ตรวจสอบแล้วไม่จริง แต่มีวันที่ลงสอบสวนโรค');
  }
  if (criteria === 'ไม่เข้าเกณฑ์' && investigationDate) {
    add_('CRITERIA_NOT_MET_BUT_INVESTIGATED', 'ไม่เข้าเกณฑ์สอบสวนโรค แต่มีวันที่ลงสอบสวนโรค');
  }
  if (criteria === 'รอดำเนินการ' && investigationDate) {
    add_('CRITERIA_PENDING_BUT_INVESTIGATED', 'ยังรอประเมินเกณฑ์ แต่มีวันที่ลงสอบสวนโรค');
  }
  if (investigationDecision === 'ไม่ลงสอบสวน' && investigationDate) {
    add_('NO_INVESTIGATION_BUT_DATE_SET', 'ระบุว่าไม่ลงสอบสวน แต่มีวันที่ลงสอบสวนโรค');
  }
  if (investigationDecision === 'ลงสอบสวน' && !investigationDate) {
    add_('INVESTIGATION_MARKED_WITHOUT_DATE', 'ระบุว่าลงสอบสวนแล้ว แต่ยังไม่มีวันที่ลงสอบสวนโรค');
  }
  if (isInvestigationCriteriaMet_(criteria) && investigationDecision === 'ไม่ลงสอบสวน') {
    add_('CRITERIA_MET_BUT_NO_INVESTIGATION', 'เข้าเกณฑ์สอบสวนโรค แต่ระบุว่าไม่ลงสอบสวน');
  }

  return warnings;
}

function deriveAIReportReadiness_(event) {
  event = event || {};
  var warnings = [];

  function has_(value) {
    var text = String(value === null || value === undefined ? '' : value).trim();
    return !!text && !/^(?:\.{3,}|…+|[-—]+|ไม่ระบุ|ไม่ทราบ|ไม่มีข้อมูล|ข้อมูลไม่ปรากฏ)$/i.test(text);
  }
  function add_(code, severity, field, message) {
    warnings.push({code:code, severity:severity, field:field, message:message});
  }

  var hasLocation = [
    event.col8,
    event.col10,
    event.col11,
    event.col12,
    event.col13,
    event.col29
  ].some(has_);

  if (!has_(event.col2)) {
    add_('REPORT_CORE_RECEIVED_DATE_MISSING', 'core', 'col2', 'ยังไม่มีวันรับแจ้ง ซึ่งใช้เป็นข้อมูลหลักของความเป็นมา');
  }
  if (!has_(event.col6)) {
    add_('REPORT_CORE_EVENT_MISSING', 'core', 'col6', 'ยังไม่มีโรค/ภัย/เหตุการณ์ ซึ่งเป็นหัวข้อหลักของรายงาน');
  }
  if (!hasLocation) {
    add_('REPORT_CORE_LOCATION_MISSING', 'core', 'col8|col10|col11|col12|col13|col29', 'ยังไม่มีสถานที่หรือข้อมูลพื้นที่สำหรับอธิบายจุดเกิดเหตุ');
  }
  if (!has_(event.col14)) {
    add_('REPORT_CORE_NARRATIVE_MISSING', 'core', 'col14', 'ยังไม่มีรายละเอียดเหตุการณ์/ผลการสอบสวนเบื้องต้นสำหรับใช้วิเคราะห์');
  }

  if (!has_(event.col3)) {
    add_('REPORT_REPORTER_MISSING', 'important', 'col3', 'ยังไม่มีผู้แจ้งข่าวหรือหน่วยงานที่แจ้ง');
  }
  if (!has_(event.col9)) {
    add_('REPORT_ONSET_DATE_MISSING', 'important', 'col9', 'ยังไม่มีวันที่เริ่มป่วยของเหตุการณ์');
  }
  if (!has_(event.col15)) {
    add_('REPORT_VERIFICATION_MISSING', 'important', 'col15', 'ยังไม่มีผลการตรวจสอบความจริงของเหตุการณ์');
  } else if (String(event.col15).trim() === 'รอตรวจสอบ') {
    add_('REPORT_VERIFICATION_PENDING', 'important', 'col15', 'เหตุการณ์ยังอยู่ระหว่างตรวจสอบความจริง');
  }
  if (!has_(event.col17)) {
    add_('REPORT_CRITERIA_MISSING', 'important', 'col17', 'ยังไม่มีผลประเมินเกณฑ์สอบสวนโรค');
  } else if (String(event.col17).trim() === 'รอดำเนินการ') {
    add_('REPORT_CRITERIA_PENDING', 'important', 'col17', 'การประเมินเกณฑ์สอบสวนโรคยังไม่แล้วเสร็จ');
  }
  if (!has_(event.col19)) {
    add_('REPORT_RISK_MISSING', 'important', 'col19', 'ยังไม่มีข้อมูลประเมินความเสี่ยงแจ้งเตือนให้ใช้ตรวจทานการประเมินของ AI');
  }
  if (!has_(event.col21)) {
    add_('REPORT_MEASURES_MISSING', 'important', 'col21', 'ยังไม่มีมาตรการหรือกิจกรรมควบคุมโรคที่ดำเนินการ');
  }
  if (!has_(event.col20) && !has_(event.col23)) {
    add_('REPORT_AGENCY_MISSING', 'important', 'col20|col23', 'ยังไม่มีหน่วยงานแจ้งเตือนหรือหน่วยงานรับแจ้งสำหรับอ้างอิงในรายงาน');
  }

  var consistency = Array.isArray(event.eventConsistencyWarnings)
    ? event.eventConsistencyWarnings
    : deriveEventConsistencyWarnings_(event);
  var hasG04InvestigationDateWarning = consistency.some(function(w) {
    return String(w.code || '') === 'INVESTIGATION_MARKED_WITHOUT_DATE';
  });
  var lifecycle = String(event.eventLifecycle || deriveEventLifecycle_(event).code || '');
  var investigationDecision = String(event.col24 || '').trim();
  if ((lifecycle === 'investigated' || investigationDecision === 'ลงสอบสวน') &&
      !has_(event.col26) && !hasG04InvestigationDateWarning) {
    add_('REPORT_INVESTIGATION_DATE_MISSING', 'important', 'col26', 'เหตุการณ์ระบุว่าลงสอบสวนแล้ว แต่ยังไม่มีวันที่ลงสอบสวนโรค');
  }

  consistency.forEach(function(w) {
    add_(
      'REPORT_CONSISTENCY_' + String(w.code || 'WARNING'),
      'consistency',
      '',
      String(w.message || 'พบข้อมูล workflow ที่ควรตรวจสอบก่อนสร้างรายงาน')
    );
  });

  var coreMissingCount = warnings.filter(function(w){return w.severity === 'core';}).length;
  var importantMissingCount = warnings.filter(function(w){return w.severity === 'important';}).length;
  var consistencyWarningCount = warnings.filter(function(w){return w.severity === 'consistency';}).length;
  var level = coreMissingCount > 0
    ? 'limited'
    : (importantMissingCount > 0 || consistencyWarningCount > 0 ? 'review' : 'ready');

  var label = level === 'ready'
    ? 'พร้อมสร้างรายงาน'
    : (level === 'review' ? 'ควรตรวจสอบข้อมูลก่อนสร้างรายงาน' : 'ข้อมูลหลักยังไม่ครบ');

  return {
    level:level,
    label:label,
    canGenerate:true,
    warningCount:warnings.length,
    coreMissingCount:coreMissingCount,
    importantMissingCount:importantMissingCount,
    consistencyWarningCount:consistencyWarningCount,
    warnings:warnings
  };
}

function rowToObject_(row) {
  var obj = {};
  for (var i=0; i<MAIN_HEADERS.length; i++) obj['col' + (i+1)] = row[i] || '';
  var meta = getEventMetaFromRow_(row);
  // P1 exposes only metadata required for browser identity/concurrency.
  // Created/void audit metadata remains server-side until a later authenticated contract needs it.
  obj.eventId = meta.eventId;
  obj.revision = meta.revision;
  obj.recordStatus = meta.recordStatus;
  obj.ownerUserId = String(row[EVENT_OWNER_COL - 1] || '').trim();
  var lifecycle = deriveEventLifecycle_(obj);
  obj.eventLifecycle = lifecycle.code;
  obj.eventLifecycleLabel = lifecycle.label;
  obj.eventConsistencyWarnings = deriveEventConsistencyWarnings_(obj);
  obj.aiReportReadiness = deriveAIReportReadiness_(obj);
  return obj;
}

function isoToThaiDate_(iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  if (p.length !== 3) return iso;
  return (Number(p[0]) + 543) + '-' + p[1] + '-' + p[2];
}

function thaiDateToIso_(dateText) {
  if (!dateText) return '';
  var p = String(dateText).split('-');
  if (p.length !== 3) return dateText;
  var y = Number(p[0]);
  if (y > 2400) y -= 543;
  return y + '-' + p[1] + '-' + p[2];
}

function addRecord(sessionToken, formData) {
  var user = requireAuth_(sessionToken, 'create');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    ensureSheet_(getDb_(), CONFIG.SHEETS.MAIN, MAIN_SCHEMA_HEADERS);
    var newRow = sheet.getLastRow() + 1;
    var eventId = Utilities.getUuid();
    var now = new Date();

    validateEventMasterData_(formData || {}, null);
    sheet.getRange(newRow, 1).setValue(newRow - 1);
    saveRowData_(sheet, newRow, formData, user);
    sheet.getRange(newRow, EVENT_META_COL.EVENT_ID, 1, EVENT_META_HEADERS.length).setValues([[
      eventId, 1, 'active', now, user.email, '', '', ''
    ]]);

    writeAudit_(user, 'CREATE_RECORD', CONFIG.SHEETS.MAIN, eventId, '', JSON.stringify(formData));
    return 'บันทึกข้อมูลใหม่เรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function updateRecord(sessionToken, eventId, formData, expectedRevision) {
  var user = requireAuth_(sessionToken, 'edit');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var status = String(sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    if (status === 'closed') throw new Error('เหตุการณ์นี้ถูกปิดแล้ว กรุณาเปิดเหตุการณ์อีกครั้งก่อนแก้ไขข้อมูล');
    var before = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    var expected = Number(expectedRevision);
    if (!expected || expected < 1 || Math.floor(expected) !== expected) {
      throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนบันทึกอีกครั้ง');
    }
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนบันทึกอีกครั้ง');
    }

    validateEventMasterData_(formData || {}, before);
    saveRowData_(sheet, rowNumber, formData, user);
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    writeAudit_(user, 'UPDATE_RECORD', CONFIG.SHEETS.MAIN, eventId, JSON.stringify(before), JSON.stringify(formData));
    return 'อัปเดตข้อมูลเรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function closeEvent(sessionToken, eventId, closeReason, expectedRevision) {
  var user = requireAuth_(sessionToken, 'close_event');
  var reason = String(closeReason || '').trim();
  if (!reason) throw new Error('กรุณาระบุเหตุผลในการปิดเหตุการณ์');

  var expected = Number(expectedRevision);
  if (!expected || expected < 1 || Math.floor(expected) !== expected) {
    throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนปิดเหตุการณ์');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var status = String(sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนปิดเหตุการณ์');
    }
    if (status === 'closed') return 'เหตุการณ์นี้ถูกปิดไว้แล้ว';

    var now = new Date();
    sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).setValue('closed');
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    sheet.getRange(rowNumber, 27).setValue(user.email || '');
    sheet.getRange(rowNumber, 28).setValue(now);

    writeAudit_(
      user,
      'CLOSE_EVENT',
      CONFIG.SHEETS.MAIN,
      eventId,
      JSON.stringify({recordStatus:status}),
      JSON.stringify({recordStatus:'closed', reason:reason})
    );
    return 'ปิดเหตุการณ์เรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function reopenEvent(sessionToken, eventId, reopenReason, expectedRevision) {
  var user = requireAuth_(sessionToken, 'close_event');
  var reason = String(reopenReason || '').trim();
  if (!reason) throw new Error('กรุณาระบุเหตุผลในการเปิดเหตุการณ์อีกครั้ง');

  var expected = Number(expectedRevision);
  if (!expected || expected < 1 || Math.floor(expected) !== expected) {
    throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนเปิดเหตุการณ์อีกครั้ง');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var status = String(sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนเปิดเหตุการณ์อีกครั้ง');
    }
    if (status === 'active') return 'เหตุการณ์นี้เปิดใช้งานอยู่แล้ว';
    if (status !== 'closed') throw new Error('สามารถเปิดเหตุการณ์อีกครั้งได้เฉพาะเหตุการณ์ที่มีสถานะ closed');

    var now = new Date();
    sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).setValue('active');
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    sheet.getRange(rowNumber, 27).setValue(user.email || '');
    sheet.getRange(rowNumber, 28).setValue(now);

    writeAudit_(
      user,
      'REOPEN_EVENT',
      CONFIG.SHEETS.MAIN,
      eventId,
      JSON.stringify({recordStatus:'closed'}),
      JSON.stringify({recordStatus:'active', reason:reason})
    );
    return 'เปิดเหตุการณ์อีกครั้งเรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function deleteRecord(sessionToken, eventId, voidReason, expectedRevision) {
  var user = requireAuth_(sessionToken, 'delete');
  var reason = String(voidReason || '').trim();
  if (!reason) throw new Error('กรุณาระบุเหตุผลในการยกเลิกเหตุการณ์');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, true);
    var status = String(sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').toLowerCase();
    if (status === 'void') return 'เหตุการณ์นี้ถูกยกเลิกไว้แล้ว';

    var before = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    var expected = Number(expectedRevision);
    if (!expected || expected < 1 || Math.floor(expected) !== expected) {
      throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนยกเลิกอีกครั้ง');
    }
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนยกเลิกอีกครั้ง');
    }
    var now = new Date();

    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    sheet.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).setValue('void');
    sheet.getRange(rowNumber, EVENT_META_COL.VOIDED_AT).setValue(now);
    sheet.getRange(rowNumber, EVENT_META_COL.VOIDED_BY).setValue(user.email);
    sheet.getRange(rowNumber, EVENT_META_COL.VOID_REASON).setValue(reason);
    sheet.getRange(rowNumber, 27).setValue(user.email);
    sheet.getRange(rowNumber, 28).setValue(now);

    writeAudit_(user, 'VOID_RECORD', CONFIG.SHEETS.MAIN, eventId, JSON.stringify(before), JSON.stringify({recordStatus:'void',voidReason:reason}));
    return 'ยกเลิกข้อมูลเหตุการณ์เรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function saveRowData_(sheet, row, data, user) {
  var width = MAIN_HEADERS.length;
  var current = sheet.getRange(row, 1, 1, width).getValues()[0];
  for (var i = 2; i <= width; i++) {
    if ([25,27,28].indexOf(i) >= 0) continue;
    current[i - 1] = data['col' + i] || '';
  }
  current[26] = user ? user.email : getCurrentUserHint_();
  current[27] = new Date();
  sheet.getRange(row, 1, 1, width).setValues([current]);
}

function getAnalytics(sessionToken) {
  var user = requireAuth_(sessionToken, 'view');
  var data = getFilteredEventRows_({});
  var users = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  var logs = getSheet_(CONFIG.SHEETS.AUDIT).getDataRange().getValues().slice(1);
  var byRisk = countBy_(data, 'col19');
  var byDisease = countBy_(data, 'col6');
  var byTambon = countBy_(data, 'col11');
  var byVillage = countBy_(data, 'col29');
  return {
    kpi: {
      events: data.length,
      criteria: data.filter(function(r){return isInvestigationCriteriaMet_(r.col17);}).length,
      investigated: data.filter(function(r){return r.col26 !== '';}).length,
      users: users.length,
      activeUsers: users.filter(function(r){return r[5] === 'active';}).length,
      auditLogs: logs.length
    },
    byRisk: byRisk,
    byDisease: byDisease,
    byTambon: byTambon,
    byVillage: byVillage,
    user: publicUser_(user)
  };
}

function countBy_(arr, field) {
  var map = {};
  arr.forEach(function(r){ var k = r[field] || 'ไม่ระบุ'; map[k] = (map[k] || 0) + 1; });
  return Object.keys(map).map(function(k){ return {name:k, value:map[k]}; }).sort(function(a,b){return b.value-a.value;});
}

function listUsers(sessionToken, keyword) {
  requireAuth_(sessionToken, 'users');
  var values = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  var q = String(keyword || '').toLowerCase();
  return values.map(function(r){
    return {userId:r[0], name:r[1], email:r[2], role:r[4], status:r[5], org:r[6], tambon:r[7], amphoe:r[8], province:r[9], created:r[10], lastLogin:r[13]};
  }).filter(function(u){ return !q || JSON.stringify(u).toLowerCase().indexOf(q) >= 0; });
}

function updateUser(sessionToken, userId, patch) {
  var admin = requireAuth_(sessionToken, 'users');
  var sheet = getSheet_(CONFIG.SHEETS.USERS);
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (values[i][0] === userId) {
      var before = JSON.stringify(values[i]);
      if (patch.name !== undefined) sheet.getRange(i+1,2).setValue(patch.name);
      if (patch.role !== undefined) sheet.getRange(i+1,5).setValue(patch.role);
      if (patch.status !== undefined) sheet.getRange(i+1,6).setValue(patch.status);
      if (patch.org !== undefined) sheet.getRange(i+1,7).setValue(patch.org);
      if (patch.tambon !== undefined) sheet.getRange(i+1,8).setValue(patch.tambon);
      if (patch.amphoe !== undefined) sheet.getRange(i+1,9).setValue(patch.amphoe);
      if (patch.province !== undefined) sheet.getRange(i+1,10).setValue(patch.province);
      if (patch.status === 'active') {
        sheet.getRange(i+1,12).setValue(admin.email);
        sheet.getRange(i+1,13).setValue(new Date());
      }
      if (patch.newPassword) sheet.getRange(i+1,4).setValue(hashPassword_(patch.newPassword));
      writeAudit_(admin, 'UPDATE_USER', CONFIG.SHEETS.USERS, userId, before, JSON.stringify(patch));
      return 'บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว';
    }
  }
  throw new Error('ไม่พบผู้ใช้');
}


function getAreaMaster() {
  var sheet = getSheet_(CONFIG.SHEETS.AREAS);
  var rows = sheet.getDataRange().getValues().slice(1);
  return rows.filter(function(r){ return String(r[7]).toLowerCase() !== 'false' && String(r[7]).toLowerCase() !== 'inactive'; })
    .map(function(r){
      return {id:r[0], province:r[1], amphoe:r[2], tambon:r[3], moo:r[4], village:r[5], villageCode:r[6], active:r[7]};
    })
    .sort(function(a,b){
      return [a.province,a.amphoe,a.tambon,String(a.moo).padStart(3,'0'),a.village].join('|')
        .localeCompare([b.province,b.amphoe,b.tambon,String(b.moo).padStart(3,'0'),b.village].join('|'),'th');
    });
}

function listAreas(sessionToken, keyword) {
  requireAuth_(sessionToken, 'master');
  var rows = getSheet_(CONFIG.SHEETS.AREAS).getDataRange().getValues().slice(1);
  var q = String(keyword || '').toLowerCase();
  return rows.map(function(r){
    return {id:r[0], province:r[1], amphoe:r[2], tambon:r[3], moo:r[4], village:r[5], villageCode:r[6], active:r[7], updatedAt:r[8], updatedBy:r[9]};
  }).filter(function(x){ return !q || JSON.stringify(x).toLowerCase().indexOf(q) >= 0; });
}

function saveArea(sessionToken, item) {
  var user = requireAuth_(sessionToken, 'master');
  item = item || {};
  if (!item.province || !item.amphoe || !item.tambon || !item.moo || !item.village) {
    throw new Error('กรุณากรอกจังหวัด อำเภอ ตำบล หมู่ และชื่อหมู่บ้านให้ครบ');
  }
  var sheet = getSheet_(CONFIG.SHEETS.AREAS);
  var values = sheet.getDataRange().getValues();
  if (!item.id) {
    item.id = Utilities.getUuid();
    sheet.appendRow([item.id,item.province,item.amphoe,item.tambon,String(item.moo),item.village,item.villageCode || '',item.active === false ? false : true,new Date(),user.email]);
    writeAudit_(user, 'CREATE_AREA', CONFIG.SHEETS.AREAS, item.id, '', JSON.stringify(item));
    return 'เพิ่มข้อมูลหมู่บ้านเรียบร้อยแล้ว';
  }
  for (var i=1; i<values.length; i++) {
    if (String(values[i][0]) === String(item.id)) {
      var before = JSON.stringify(values[i]);
      sheet.getRange(i+1,2,1,9).setValues([[
        item.province,item.amphoe,item.tambon,String(item.moo),item.village,item.villageCode || '',
        item.active === false ? false : true,new Date(),user.email
      ]]);
      writeAudit_(user, 'UPDATE_AREA', CONFIG.SHEETS.AREAS, item.id, before, JSON.stringify(item));
      return 'แก้ไขข้อมูลหมู่บ้านเรียบร้อยแล้ว';
    }
  }
  throw new Error('ไม่พบข้อมูลหมู่บ้าน');
}

function deleteArea(sessionToken, areaId) {
  var user = requireAuth_(sessionToken, 'master');
  var sheet = getSheet_(CONFIG.SHEETS.AREAS);
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (String(values[i][0]) === String(areaId)) {
      sheet.getRange(i+1,8,1,3).setValues([[false,new Date(),user.email]]);
      writeAudit_(user, 'DISABLE_AREA', CONFIG.SHEETS.AREAS, areaId, JSON.stringify(values[i]), 'active=false');
      return 'ปิดใช้งานข้อมูลหมู่บ้านแล้ว';
    }
  }
  throw new Error('ไม่พบข้อมูลหมู่บ้าน');
}

function importAreas(sessionToken, items) {
  var user = requireAuth_(sessionToken, 'master');
  items = Array.isArray(items) ? items : [];
  if (!items.length) throw new Error('ไม่พบข้อมูลสำหรับนำเข้า');
  if (items.length > 500) throw new Error('นำเข้าได้ครั้งละไม่เกิน 500 แถว');

  var sheet = getSheet_(CONFIG.SHEETS.AREAS);
  var values = sheet.getDataRange().getValues();
  var keyToRow = {};
  for (var i=1; i<values.length; i++) {
    var key = areaKey_(values[i][1],values[i][2],values[i][3],values[i][4],values[i][5]);
    keyToRow[key] = i + 1;
  }

  var appended = [];
  var updated = 0;
  items.forEach(function(item){
    if (!item.province || !item.amphoe || !item.tambon || !item.moo || !item.village) return;
    var key = areaKey_(item.province,item.amphoe,item.tambon,item.moo,item.village);
    if (keyToRow[key]) {
      sheet.getRange(keyToRow[key],2,1,9).setValues([[
        item.province,item.amphoe,item.tambon,String(item.moo),item.village,item.villageCode || '',true,new Date(),user.email
      ]]);
      updated++;
    } else {
      var id = Utilities.getUuid();
      appended.push([id,item.province,item.amphoe,item.tambon,String(item.moo),item.village,item.villageCode || '',true,new Date(),user.email]);
      keyToRow[key] = -1;
    }
  });
  if (appended.length) sheet.getRange(sheet.getLastRow()+1,1,appended.length,10).setValues(appended);
  writeAudit_(user, 'IMPORT_AREAS', CONFIG.SHEETS.AREAS, String(items.length), '', JSON.stringify({added:appended.length,updated:updated}));
  return 'นำเข้าข้อมูลพื้นที่สำเร็จ: เพิ่ม ' + appended.length + ' แถว, อัปเดต ' + updated + ' แถว';
}

function areaKey_(province, amphoe, tambon, moo, village) {
  return [province,amphoe,tambon,moo,village].map(function(x){return String(x || '').trim().toLowerCase();}).join('|');
}

function uploadLogo(sessionToken, payload) {
  var user = requireAuth_(sessionToken, 'settings');
  payload = payload || {};
  var mimeType = String(payload.mimeType || '').toLowerCase();
  if (['image/png','image/jpeg','image/webp'].indexOf(mimeType) < 0) {
    throw new Error('รองรับโลโก้เฉพาะ PNG, JPG/JPEG และ WEBP');
  }
  var bytes = Utilities.base64Decode(String(payload.base64 || ''));
  if (!bytes.length) throw new Error('ไม่พบข้อมูลรูปภาพ');
  if (bytes.length > CONFIG.MAX_LOGO_BYTES) throw new Error('ไฟล์โลโก้ต้องมีขนาดไม่เกิน 3 MB');

  var settings = getSettingsMap_();
  var folder;
  try {
    folder = DriveApp.getFolderById(String(settings.LOGO_FOLDER_ID));
  } catch (e) {
    var assets = ensureSystemAssets_(getDb_());
    folder = DriveApp.getFolderById(assets.logoFolderId);
  }

  var cleanName = String(payload.name || 'logo').replace(/[^\wก-๙.\-]+/g,'_');
  var file = folder.createFile(Utilities.newBlob(bytes, mimeType, new Date().getTime() + '_' + cleanName));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (ignore) {}

  var oldId = String(settings.LOGO_FILE_ID || '');
  if (oldId && oldId !== file.getId()) {
    try { DriveApp.getFileById(oldId).setTrashed(true); } catch (ignore) {}
  }

  var url = 'https://lh3.googleusercontent.com/d/' + file.getId();
  var sheet = getSheet_(CONFIG.SHEETS.SETTINGS);
  upsertSettingAsUser_(sheet, 'LOGO_FILE_ID', file.getId(), 'File ID โลโก้ล่าสุด', user.email);
  upsertSettingAsUser_(sheet, 'LOGO_URL', url, 'ลิงก์โลโก้ที่ระบบสร้างหลังอัปโหลด', user.email);
  writeAudit_(user, 'UPLOAD_LOGO', CONFIG.SHEETS.SETTINGS, file.getId(), oldId, url);
  return {ok:true, fileId:file.getId(), url:url, message:'อัปโหลดและเปลี่ยนโลโก้เรียบร้อยแล้ว'};
}

function upsertSettingAsUser_(sheet, key, value, description, email) {
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (String(values[i][0]) === String(key)) {
      sheet.getRange(i+1,2,1,4).setValues([[value,description || values[i][2] || '',new Date(),email || 'system']]);
      return;
    }
  }
  sheet.appendRow([key,value,description || '',new Date(),email || 'system']);
}

function getInstallationStatus(sessionToken) {
  requireAuth_(sessionToken, 'settings');
  var ss = getDb_();
  var settings = getSettingsMap_();
  return {
    version: CONFIG.VERSION,
    schemaVersion: CONFIG.SCHEMA_VERSION,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    systemFolderId: settings.SYSTEM_FOLDER_ID || '',
    reportFolderId: settings.REPORT_FOLDER_ID || '',
    attachmentFolderId: settings.ATTACHMENT_FOLDER_ID || '',
    auditArchiveSpreadsheetId: settings.AUDIT_ARCHIVE_SPREADSHEET_ID || '',
    auditRetentionDays: getAuditRetentionDays_(),
    templateDocId: settings.TEMPLATE_DOC_ID || '',
    logoFileId: settings.LOGO_FILE_ID || '',
    areas: Math.max(getSheet_(CONFIG.SHEETS.AREAS).getLastRow() - 1, 0),
    events: Math.max(getSheet_(CONFIG.SHEETS.MAIN).getLastRow() - 1, 0),
    attachments: Math.max((ss.getSheetByName(CONFIG.SHEETS.ATTACHMENTS) || {getLastRow:function(){return 1;}}).getLastRow() - 1, 0)
  };
}

function repairInstallation(sessionToken) {
  var user = requireAuth_(sessionToken, 'settings');
  var result = installSmartSRRTCore_();
  writeAudit_(user, 'REPAIR_INSTALLATION', CONFIG.SHEETS.SETTINGS, CONFIG.VERSION, '', result.message);
  return result.message;
}


function listContent(sessionToken) {
  requireAuth_(sessionToken, 'master');
  var rows = getSheet_(CONFIG.SHEETS.CONTENT).getDataRange().getValues().slice(1);
  return rows.map(function(r){return {id:r[0], category:r[1], title:r[2], description:r[3], url:r[4], fileId:r[5], status:r[6], sort:r[7]};});
}

function saveContent(sessionToken, item) {
  var user = requireAuth_(sessionToken, 'master');
  item = item || {};
  var sheet = getSheet_(CONFIG.SHEETS.CONTENT);
  var category = String(item.category || '').trim();
  if (!category) throw new Error('กรุณาเลือกหมวดหมู่เนื้อหา');

  if (!item.id) {
    if (!isActiveMasterValue_('content_category', category)) {
      throw new Error('หมวดหมู่เนื้อหาไม่อยู่ใน MasterData ที่เปิดใช้งาน');
    }
    item.id = Utilities.getUuid();
    sheet.appendRow([item.id,category,item.title,item.description,item.url,item.fileId,item.status || 'draft',item.sort || 999,new Date(),new Date(),user.email]);
    writeAudit_(user, 'CREATE_CONTENT', CONFIG.SHEETS.CONTENT, item.id, '', JSON.stringify(item));
    return 'เพิ่มข้อมูลเนื้อหาเรียบร้อยแล้ว';
  }

  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (values[i][0] === item.id) {
      var existingCategory = String(values[i][1] || '').trim();
      if (category !== existingCategory && !isActiveMasterValue_('content_category', category)) {
        throw new Error('หมวดหมู่เนื้อหาใหม่ไม่อยู่ใน MasterData ที่เปิดใช้งาน');
      }
      var before = JSON.stringify(values[i]);
      sheet.getRange(i+1,2,1,10).setValues([[category,item.title,item.description,item.url,item.fileId,item.status,item.sort || 999,values[i][8] || new Date(),new Date(),user.email]]);
      writeAudit_(user, 'UPDATE_CONTENT', CONFIG.SHEETS.CONTENT, item.id, before, JSON.stringify(item));
      return 'อัปเดตข้อมูลเนื้อหาเรียบร้อยแล้ว';
    }
  }
  throw new Error('ไม่พบรายการเนื้อหา');
}

function getSystemSettings(sessionToken) {
  requireAuth_(sessionToken, 'settings');
  var rows = getSheet_(CONFIG.SHEETS.SETTINGS).getDataRange().getValues().slice(1);
  return rows.map(function(r){return {key:r[0], value:r[1], description:r[2], updatedAt:r[3], updatedBy:r[4]};});
}

function saveSystemSettings(sessionToken, settingsArray) {
  var user = requireAuth_(sessionToken, 'settings');
  var sheet = getSheet_(CONFIG.SHEETS.SETTINGS);
  var blockedKeys = ['DATABASE_SPREADSHEET_ID','MAIN_SHEET_ID','SYSTEM_FOLDER_ID','LOGO_FOLDER_ID','LOGO_FILE_ID','ATTACHMENT_FOLDER_ID','AUDIT_ARCHIVE_SPREADSHEET_ID','AUDIT_RETENTION_DAYS','INSTALL_VERSION','SCHEMA_VERSION'];
  settingsArray.forEach(function(s) {
    if (!s.key || blockedKeys.indexOf(String(s.key)) >= 0) return;
    upsertSettingAsUser_(sheet, String(s.key), s.value, s.description || '', user.email);
  });
  writeAudit_(user, 'UPDATE_SETTINGS', CONFIG.SHEETS.SETTINGS, 'web-admin', '', JSON.stringify(settingsArray.map(function(s){return s.key;})));
  return 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว';
}

function getAuditRetentionDays_() {
  var settings = {};
  try { settings = getSettingsMap_(); } catch (ignore) {}
  var days = Number(settings.AUDIT_RETENTION_DAYS || CONFIG.DEFAULT_AUDIT_RETENTION_DAYS);
  if (!isFinite(days)) days = CONFIG.DEFAULT_AUDIT_RETENTION_DAYS;
  days = Math.floor(days);
  if (days < 90) days = 90;
  if (days > 3650) days = 3650;
  return days;
}

function auditTimestampToDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }
  if (value === null || value === undefined || value === '') return null;
  var parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getAuditArchiveSpreadsheet_(dbSs) {
  dbSs = dbSs || getDb_();
  var settings = {};
  try { settings = getSettingsMap_(); } catch (ignore) {}
  var props = PropertiesService.getScriptProperties();
  var configuredId = String(settings.AUDIT_ARCHIVE_SPREADSHEET_ID || props.getProperty('AUDIT_ARCHIVE_SPREADSHEET_ID') || '').trim();

  if (configuredId) {
    try {
      var existing = SpreadsheetApp.openById(configuredId);
      existing.getName();
      return existing;
    } catch (ignoreConfigured) {}
  }

  var systemFolderId = String(settings.SYSTEM_FOLDER_ID || props.getProperty('SYSTEM_FOLDER_ID') || '').trim();
  var systemFolder;
  if (systemFolderId) {
    try { systemFolder = DriveApp.getFolderById(systemFolderId); } catch (ignoreFolder) {}
  }
  if (!systemFolder) {
    var assets = ensureSystemAssets_(dbSs);
    systemFolder = DriveApp.getFolderById(assets.systemFolderId);
  }

  var archiveName = 'Smart SRRT Audit Archive - ' + dbSs.getName();
  var matches = systemFolder.getFilesByName(archiveName);
  while (matches.hasNext()) {
    var candidate = matches.next();
    try {
      var found = SpreadsheetApp.openById(candidate.getId());
      found.getName();
      return found;
    } catch (ignoreCandidate) {}
  }

  var archive = SpreadsheetApp.create(archiveName);
  DriveApp.getFileById(archive.getId()).moveTo(systemFolder);
  return archive;
}

function ensureAuditArchiveSpreadsheet_(dbSs) {
  return getAuditArchiveSpreadsheet_(dbSs);
}

function ensureAuditArchiveYearSheet_(archiveSs, year) {
  var name = 'Y' + String(year);
  var sheet = archiveSs.getSheetByName(name);

  if (!sheet) {
    var sheets = archiveSs.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getName() === 'Sheet1') {
      sheet = sheets[0];
      sheet.setName(name);
    } else {
      sheet = archiveSs.insertSheet(name);
    }
  }

  if (sheet.getMaxColumns() < AUDIT_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), AUDIT_HEADERS.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(AUDIT_HEADERS);
  } else {
    var current = sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).getValues()[0];
    for (var i = 0; i < AUDIT_HEADERS.length; i++) {
      var actual = String(current[i] || '').trim();
      if (actual && actual !== AUDIT_HEADERS[i]) {
        throw new Error('Audit archive ' + name + ' มีหัวข้อไม่ตรงที่คอลัมน์ ' + (i + 1));
      }
      if (!actual && sheet.getLastRow() > 1) {
        var existing = sheet.getRange(2, i + 1, sheet.getLastRow() - 1, 1).getValues();
        for (var r = 0; r < existing.length; r++) {
          if (String(existing[r][0] || '').trim() !== '') {
            throw new Error('Audit archive ' + name + ' มีข้อมูลใต้หัวข้อว่างที่คอลัมน์ ' + (i + 1));
          }
        }
      }
    }
    var patched = current.slice();
    var changed = false;
    for (var h = 0; h < AUDIT_HEADERS.length; h++) {
      if (!String(patched[h] || '').trim()) {
        patched[h] = AUDIT_HEADERS[h];
        changed = true;
      }
    }
    if (changed) sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).setValues([patched]);
  }

  try {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).setFontWeight('bold');
  } catch (ignoreFormat) {}
  return sheet;
}

function getAuditArchiveIds_(sheet) {
  var out = {};
  var count = Math.max(sheet.getLastRow() - 1, 0);
  if (!count) return out;
  var ids = sheet.getRange(2, AUDIT_COL.AUDIT_ID, count, 1).getValues();
  ids.forEach(function(r) {
    var id = String(r[0] || '').trim();
    if (id) out[id] = true;
  });
  return out;
}

function deleteAuditSourceRows_(sheet, rowNumbers) {
  if (!rowNumbers.length) return;
  var sorted = rowNumbers.slice().sort(function(a,b){return b-a;});
  var high = sorted[0];
  var low = high;

  function flush_() {
    sheet.deleteRows(low, high - low + 1);
  }

  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === low - 1) {
      low = sorted[i];
    } else {
      flush_();
      high = sorted[i];
      low = high;
    }
  }
  flush_();
}

function getAuditRetentionStatus(sessionToken) {
  requireAuth_(sessionToken, 'audit');
  var ss = getDb_();
  var audit = ensureAuditSchema_(ss);
  var sheet = audit.sheet;
  var days = getAuditRetentionDays_();
  var cutoff = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
  var values = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, AUDIT_HEADERS.length).getValues()
    : [];
  var eligible = 0;
  var malformed = 0;
  var oldest = null;

  values.forEach(function(r) {
    var d = auditTimestampToDate_(r[AUDIT_COL.TIMESTAMP - 1]);
    if (!d) {
      malformed++;
      return;
    }
    if (!oldest || d.getTime() < oldest.getTime()) oldest = d;
    if (d.getTime() < cutoff.getTime()) eligible++;
  });

  var settings = getSettingsMap_();
  return {
    activeRows: values.length,
    retentionDays: days,
    eligibleRows: eligible,
    malformedTimestampRows: malformed,
    cutoff: Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    oldestTimestamp: oldest ? Utilities.formatDate(oldest, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
    archiveSpreadsheetId: String(settings.AUDIT_ARCHIVE_SPREADSHEET_ID || '')
  };
}

function archiveAuditLogs(sessionToken) {
  var user = requireAuth_(sessionToken, 'audit');
  return archiveAuditLogsCore_(user);
}

function archiveAuditLogsFromSheetMenu() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim(); } catch (ignore) {}
  var user = email ? findUserByEmail_(email) : null;
  if (!user || user.status !== 'active' || !hasPermission_(user.role, 'audit')) {
    throw new Error('ไม่สามารถยืนยันสิทธิ์ผู้ดูแลจากบัญชี Google นี้ได้ กรุณาใช้ปุ่ม Archive ในหน้า Admin');
  }
  var result = archiveAuditLogsCore_(user);
  var message = [
    'จัดเก็บ Audit เรียบร้อยแล้ว',
    'รายการที่เข้าเกณฑ์: ' + result.eligibleRows,
    'เพิ่มเข้า Archive ใหม่: ' + result.newlyArchivedRows,
    'ลบออกจาก AuditLogs หลัง verify: ' + result.removedFromActiveRows,
    'รายการ timestamp ผิดรูปแบบที่คงไว้: ' + result.malformedTimestampRows
  ].join('\n');
  try { SpreadsheetApp.getUi().alert(message); } catch (ignoreUi) {}
  return message;
}

function archiveAuditLogsCore_(user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var audit = ensureAuditSchema_(ss);
    var source = audit.sheet;
    var days = getAuditRetentionDays_();
    var now = new Date();
    var cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    var count = Math.max(source.getLastRow() - 1, 0);
    var values = count ? source.getRange(2, 1, count, AUDIT_HEADERS.length).getValues() : [];
    var candidates = [];
    var malformed = 0;

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var d = auditTimestampToDate_(row[AUDIT_COL.TIMESTAMP - 1]);
      if (!d) {
        malformed++;
        continue;
      }
      if (d.getTime() >= cutoff.getTime()) continue;

      var auditId = String(row[AUDIT_COL.AUDIT_ID - 1] || '').trim();
      if (!isUuid_(auditId)) throw new Error('AuditID ไม่ถูกต้องที่ AuditLogs แถว ' + (i + 2));
      candidates.push({
        sourceRow:i + 2,
        row:row,
        auditId:auditId,
        year:Number(Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy'))
      });
    }

    if (!candidates.length) {
      return {
        retentionDays:days,
        eligibleRows:0,
        newlyArchivedRows:0,
        removedFromActiveRows:0,
        malformedTimestampRows:malformed,
        archiveSpreadsheetId:String(getSettingsMap_().AUDIT_ARCHIVE_SPREADSHEET_ID || '')
      };
    }

    var archiveSs = ensureAuditArchiveSpreadsheet_(ss);
    var byYear = {};
    candidates.forEach(function(c) {
      if (!byYear[c.year]) byYear[c.year] = [];
      byYear[c.year].push(c);
    });

    var newlyArchived = 0;
    Object.keys(byYear).forEach(function(yearKey) {
      var yearSheet = ensureAuditArchiveYearSheet_(archiveSs, yearKey);
      var existingIds = getAuditArchiveIds_(yearSheet);
      var toAppend = byYear[yearKey].filter(function(c){ return !existingIds[c.auditId]; });
      if (toAppend.length) {
        yearSheet.getRange(yearSheet.getLastRow() + 1, 1, toAppend.length, AUDIT_HEADERS.length)
          .setValues(toAppend.map(function(c){ return c.row; }));
        newlyArchived += toAppend.length;
      }
    });

    var verified = {};
    Object.keys(byYear).forEach(function(yearKey) {
      var yearSheet = ensureAuditArchiveYearSheet_(archiveSs, yearKey);
      var ids = getAuditArchiveIds_(yearSheet);
      byYear[yearKey].forEach(function(c) {
        if (!ids[c.auditId]) throw new Error('Archive verification ล้มเหลวสำหรับ AuditID ' + c.auditId);
        verified[c.auditId] = true;
      });
    });

    var rowsToDelete = candidates.filter(function(c){ return verified[c.auditId]; }).map(function(c){ return c.sourceRow; });
    if (rowsToDelete.length !== candidates.length) {
      throw new Error('Archive verification ไม่ครบทุก Audit row จึงยังไม่ลบข้อมูลต้นทาง');
    }

    deleteAuditSourceRows_(source, rowsToDelete);

    var settingsSheet = getSheet_(CONFIG.SHEETS.SETTINGS);
    upsertSettingDirect_(settingsSheet, 'AUDIT_ARCHIVE_SPREADSHEET_ID', archiveSs.getId(), 'Spreadsheet ID สำหรับเก็บ Audit archive', true);
    PropertiesService.getScriptProperties().setProperty('AUDIT_ARCHIVE_SPREADSHEET_ID', archiveSs.getId());

    writeAudit_(
      user,
      'ARCHIVE_AUDIT_LOGS',
      CONFIG.SHEETS.AUDIT,
      archiveSs.getId(),
      '',
      JSON.stringify({
        retentionDays:days,
        cutoff:Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
        eligibleRows:candidates.length,
        newlyArchivedRows:newlyArchived,
        removedFromActiveRows:rowsToDelete.length,
        malformedTimestampRows:malformed
      })
    );

    return {
      retentionDays:days,
      eligibleRows:candidates.length,
      newlyArchivedRows:newlyArchived,
      removedFromActiveRows:rowsToDelete.length,
      malformedTimestampRows:malformed,
      archiveSpreadsheetId:archiveSs.getId()
    };
  } finally {
    lock.releaseLock();
  }
}

function listAuditLogs(sessionToken, limit) {
  requireAuth_(sessionToken, 'audit');
  var rows = getSheet_(CONFIG.SHEETS.AUDIT).getDataRange().getDisplayValues().slice(1).reverse();
  return rows.slice(0, Number(limit || 100)).map(function(r){
    return {
      timestamp:r[0],
      email:r[1],
      role:r[2],
      action:r[3],
      targetSheet:r[4],
      targetId:r[5],
      before:r[6],
      after:r[7],
      auditId:r[9] || ''
    };
  });
}

function writeAudit_(user, action, targetSheet, targetId, beforeValue, afterValue) {
  try {
    getSheet_(CONFIG.SHEETS.AUDIT).appendRow([
      new Date(),
      user.email || '',
      user.role || '',
      action,
      targetSheet,
      targetId,
      beforeValue,
      afterValue,
      '',
      Utilities.getUuid()
    ]);
  } catch(e) {}
}

function logVisit_() {
  try {
    getSheet_(CONFIG.SHEETS.VISITS).appendRow([new Date(), 'doGet', '']);
  } catch(err) {}
}

function exportData(sessionToken, format) {
  requireAuth_(sessionToken, 'export');
  var data = getFilteredEventRows_({});
  var ss = SpreadsheetApp.create('SRRT_Export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm'));
  var sh = ss.getActiveSheet();
  sh.setName('SRRT_Data');
  sh.getRange(1,1,1,MAIN_HEADERS.length).setValues([MAIN_HEADERS]);
  if (data.length > 0) {
    var rows = data.map(function(r){ var arr=[]; for(var i=1;i<=MAIN_HEADERS.length;i++) arr.push(r['col'+i] || ''); return arr; });
    sh.getRange(2,1,rows.length,MAIN_HEADERS.length).setValues(rows);
  }
  sh.getRange(1,1,1,MAIN_HEADERS.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sh.autoResizeColumns(1, MAIN_HEADERS.length);
  return {url:ss.getUrl(), message:'สร้างไฟล์ Export แล้ว', format:format || 'xlsx'};
}

function appendReportRegistry_(record) {
  record = record || {};
  var reportId = String(record.reportId || '').trim();
  var eventId = String(record.eventId || '').trim();
  var documentId = String(record.documentId || '').trim();

  if (!isUuid_(reportId)) throw new Error('ReportID ไม่ถูกต้อง');
  if (!isUuid_(eventId)) throw new Error('EventID ของรายงานไม่ถูกต้อง');
  if (!documentId) throw new Error('ไม่พบ DocumentID สำหรับทะเบียนรายงาน');

  var ss = getDb_();
  var registry = ensureReportRegistrySheet_(ss).sheet;
  registry.appendRow([
    reportId,
    eventId,
    Number(record.sourceRevision || 0),
    documentId,
    String(record.documentUrl || ''),
    record.generatedAt || new Date(),
    String(record.generatedBy || ''),
    String(record.geminiModels || ''),
    String(record.geminiApiVersions || ''),
    String(record.promptVersion || CONFIG.REPORT_PROMPT_VERSION),
    String(record.templateDocId || '')
  ]);

  return reportId;
}


/**
 * G-27: Read-only ReportRegistry history for a non-void Event.
 * The user's existing report permission is authoritative.
 */
function listReportsForEvent(sessionToken, eventId) {
  requireAuth_(sessionToken, 'report');
  var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var rowNumber = findEventRowById_(main, eventId, false);
  var revision = Number(main.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
  var recordStatus = String(main.getRange(rowNumber, EVENT_META_COL.RECORD_STATUS).getValue() || 'active').trim().toLowerCase();
  var stableEventId = String(eventId || '').trim();

  // No implicit migration or sheet mutation on a read-only endpoint.
  var registry = getDb_().getSheetByName(CONFIG.SHEETS.REPORTS);
  if (!registry || registry.getLastRow() < 1 || registry.getLastColumn() < REPORT_REGISTRY_HEADERS.length) {
    throw new Error('ยังไม่มีทะเบียน ReportRegistry ที่พร้อมใช้งาน กรุณาดำเนินการ migration G-17 ก่อน');
  }
  var actualHeaders = registry.getRange(1, 1, 1, REPORT_REGISTRY_HEADERS.length).getDisplayValues()[0];
  for (var h = 0; h < REPORT_REGISTRY_HEADERS.length; h++) {
    if (String(actualHeaders[h] || '').trim() !== REPORT_REGISTRY_HEADERS[h]) {
      throw new Error('หัวข้อ ReportRegistry ไม่ตรงกับ schema v7 ที่คอลัมน์ ' + (h + 1));
    }
  }

  var rows = registry.getLastRow() > 1
    ? registry.getRange(2, 1, registry.getLastRow() - 1, REPORT_REGISTRY_HEADERS.length).getValues()
    : [];
  var seen = {};
  var invalidCount = 0;
  var matches = [];
  rows.forEach(function(r, index) {
    if (String(r[REPORT_REGISTRY_COL.EVENT_ID - 1] || '').trim() !== stableEventId) return;
    var reportId = String(r[REPORT_REGISTRY_COL.REPORT_ID - 1] || '').trim();
    var docId = String(r[REPORT_REGISTRY_COL.DOCUMENT_ID - 1] || '').trim();
    if (!isUuid_(reportId) || !docId || Object.prototype.hasOwnProperty.call(seen, reportId)) {
      invalidCount++;
      return;
    }
    seen[reportId] = true;
    var rawDate = r[REPORT_REGISTRY_COL.GENERATED_AT - 1];
    var millis = rawDate instanceof Date && !isNaN(rawDate.getTime()) ? rawDate.getTime() : NaN;
    var dateText = isFinite(millis) ? rawDate.toISOString() : String(rawDate || '');
    var storedUrl = String(r[REPORT_REGISTRY_COL.DOCUMENT_URL - 1] || '').trim();
    var urlMatch = /^https:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)(?:\/|$)/.exec(storedUrl);
    var safeUrl = urlMatch && urlMatch[1] === docId ? storedUrl : '';

    matches.push({
      order:index,
      timestamp:millis,
      report:{
        reportId:reportId,
        sourceRevision:Number(r[REPORT_REGISTRY_COL.SOURCE_REVISION - 1] || 0),
        documentURL:safeUrl,
        generatedAt:dateText,
        generatedBy:String(r[REPORT_REGISTRY_COL.GENERATED_BY - 1] || ''),
        geminiModels:String(r[REPORT_REGISTRY_COL.GEMINI_MODELS - 1] || ''),
        geminiApiVersions:String(r[REPORT_REGISTRY_COL.GEMINI_API_VERSIONS - 1] || ''),
        promptVersion:String(r[REPORT_REGISTRY_COL.PROMPT_VERSION - 1] || '')
      }
    });
  });
  // Timestamp is authoritative; the append order breaks ties deterministically.
  matches.sort(function(a, b) {
    var av = isFinite(a.timestamp), bv = isFinite(b.timestamp);
    if (av && bv && a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
    if (av !== bv) return av ? -1 : 1;
    return b.order - a.order;
  });
  var reports = matches.map(function(item){ return item.report; });
  return {
    eventId:stableEventId,
    currentRevision:revision,
    recordStatus:recordStatus,
    count:reports.length,
    latest:reports.length ? reports[0] : null,
    invalidCount:invalidCount,
    reports:reports
  };
}

function getAIReportReadiness(sessionToken, eventId) {
  requireAuth_(sessionToken, 'report');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var rowNumber = findEventRowById_(sheet, eventId, false);
  var row = sheet.getRange(rowNumber, 1, 1, Math.max(MAIN_SCHEMA_HEADERS.length, EVENT_OWNER_COL)).getDisplayValues()[0];
  return deriveAIReportReadiness_(rowToObject_(row));
}

function generateReportFromWeb(sessionToken, eventId) {
  var user = requireAuth_(sessionToken, 'report');
  // Legacy two-argument RPC remains supported; G-32 passes an authenticated job ID.
  var reportJobId = arguments.length > 2 ? arguments[2] : '';
  reportJobCheckpoint_(reportJobId, 'preparing');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var settings = getSettingsMap_();
  var templateId = settings.TEMPLATE_DOC_ID;
  var folderId = settings.REPORT_FOLDER_ID;
  if (!templateId || !folderId) throw new Error('กรุณาตั้งค่า Template และโฟลเดอร์รายงานในหน้า Admin ก่อน');

  var rowNumber = findEventRowById_(sheet, eventId, false);
  var sourceRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
  var rowData = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
  var disease = rowData[5] || '..........';
  var place = rowData[7] || '..........';
  var villageName = rowData[28] || '';
  var villageCode = rowData[29] || '';
  var locationInfo = [
    place,
    villageName ? 'บ้าน' + villageName : '',
    rowData[9] ? 'หมู่ ' + rowData[9] : '',
    rowData[10] ? 'ต.' + rowData[10] : '',
    rowData[11] ? 'อ.' + rowData[11] : '',
    rowData[12] ? 'จ.' + rowData[12] : '',
    villageCode ? '(รหัสหมู่บ้าน ' + villageCode + ')' : ''
  ].filter(function(x){return x;}).join(' ');
  var title = 'รายงานการสอบสวนเบื้องต้น ผู้ป่วยสงสัยโรค' + disease + ' ' + locationInfo;
  var reportMeta = {models:[], apiVersions:[]};
  var aiAnalysis = analyzeWithGemini_(rowData, locationInfo, settings, reportMeta, reportJobId);
  // Atomic finalization boundary: a cancel request after this point is too late
  // and must not be represented to the user as successfully cancelled.
  reportJobCheckpoint_(reportJobId, 'finalizing');

  var reportId = Utilities.getUuid();
  var newDocFile = null;
  var registered = false;

  try {
    newDocFile = DriveApp.getFileById(templateId).makeCopy(title, DriveApp.getFolderById(folderId));
    var document = DocumentApp.openById(newDocFile.getId());
    var body = document.getBody();
    var replacements = {
      '<<ชื่อเรื่อง>>': title,
      '<<วันที่>>': rowData[1] || '..........',
      '<<ผู้แจ้ง>>': rowData[2] || '..........',
      '<<โรค>>': disease,
      '<<สถานที่>>': locationInfo,
      '<<หมู่บ้าน>>': villageName || '..........',
      '<<รหัสหมู่บ้าน>>': villageCode || '..........',
      '<<วันเริ่มป่วย>>': rowData[8] || '..........',
      '<<รายละเอียดเหตุการณ์>>': rowData[13] || '..........',
      '<<มาตรการ>>': rowData[20] || '..........',
      '<<ผลวิเคราะห์จากAI>>': aiAnalysis
    };

    Object.keys(replacements).forEach(function(k) {
      if (k === '<<ผลวิเคราะห์จากAI>>') {
        replacePlaceholderWithParagraphs_(body, k, replacements[k]);
      } else {
        body.replaceText(k, replacements[k]);
      }
    });
    document.saveAndClose();

    var generatedAt = new Date();
    appendReportRegistry_({
      reportId:reportId,
      eventId:eventId,
      sourceRevision:sourceRevision,
      documentId:newDocFile.getId(),
      documentUrl:newDocFile.getUrl(),
      generatedAt:generatedAt,
      generatedBy:user.email || '',
      geminiModels:(reportMeta.models || []).join(' | '),
      geminiApiVersions:(reportMeta.apiVersions || []).join(' | '),
      promptVersion:CONFIG.REPORT_PROMPT_VERSION,
      templateDocId:templateId
    });
    registered = true;

    writeAudit_(
      user,
      'GENERATE_REPORT',
      CONFIG.SHEETS.REPORTS,
      reportId,
      '',
      JSON.stringify({
        eventId:eventId,
        sourceRevision:sourceRevision,
        documentId:newDocFile.getId(),
        promptVersion:CONFIG.REPORT_PROMPT_VERSION
      })
    );

    return newDocFile.getUrl();
  } catch (error) {
    if (newDocFile && !registered) {
      try { newDocFile.setTrashed(true); } catch (ignoreTrash) {}
    }
    throw error;
  }
}

// G-32: Cooperative cancellation and recoverable report-job metadata.
// PropertiesService stores small status records, not prompts, patient narratives,
// access tokens, API keys or other sensitive event content.
var REPORT_JOB_PREFIX_ = 'SRRT_G32_JOB_';
var REPORT_JOB_ACTIVE_KEY_ = 'SRRT_G32_ACTIVE';
var REPORT_JOB_TTL_MS_ = 24 * 60 * 60 * 1000;
var REPORT_JOB_STALE_MS_ = 8 * 60 * 1000;

function withReportJobLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('ระบบรายงานกำลังจัดการคำขอ กรุณาลองใหม่');
  try { return fn(PropertiesService.getScriptProperties()); }
  finally { lock.releaseLock(); }
}

function readReportJob_(props, jobId) {
  if (!isUuid_(String(jobId || ''))) throw new Error('Report Job ID ไม่ถูกต้อง');
  var raw = props.getProperty(REPORT_JOB_PREFIX_ + jobId);
  if (!raw) throw new Error('ไม่พบคำขอสร้างรายงาน หรือข้อมูลหมดอายุแล้ว');
  return JSON.parse(raw);
}
function saveReportJob_(props, job) {
  job.updatedAt = Date.now();
  props.setProperty(REPORT_JOB_PREFIX_ + job.id, JSON.stringify(job));
}
function reportJobTerminal_(status) {
  return ['cancelled','completed','failed','unknown'].indexOf(status) !== -1;
}
function releaseReportJobSlot_(props, jobId) {
  if (props.getProperty(REPORT_JOB_ACTIVE_KEY_) === jobId) props.deleteProperty(REPORT_JOB_ACTIVE_KEY_);
}
function expireStaleReportJob_(props, job) {
  if (!reportJobTerminal_(job.status) &&
      Date.now() - Number(job.createdAt || 0) > REPORT_JOB_STALE_MS_) {
    job.status = 'unknown';
    job.stage = 'unknown';
    job.message = 'ไม่สามารถยืนยันสถานะการทำงานหลังหมดเวลารอ กรุณาตรวจประวัติรายงานก่อนเริ่มใหม่';
    saveReportJob_(props, job);
    releaseReportJobSlot_(props, job.id);
  }
  return job;
}
function reportJobOwned_(props, jobId, user) {
  var job = expireStaleReportJob_(props, readReportJob_(props, jobId));
  if (String(job.ownerId) !== String(user.userId) ||
      String(job.ownerEmail).toLowerCase() !== String(user.email).toLowerCase()) {
    throw new Error('ไม่มีสิทธิ์ดูหรือจัดการคำขอรายงานนี้');
  }
  return job;
}
function publicReportJob_(job) {
  return {
    id:job.id,eventId:job.eventId,status:job.status,stage:job.stage,
    createdAt:job.createdAt,updatedAt:job.updatedAt,
    message:job.message || '', documentUrl:job.status === 'completed' ? (job.documentUrl || '') : ''
  };
}
function cleanupOldReportJobs_(props) {
  var all = props.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf(REPORT_JOB_PREFIX_) !== 0) return;
    try {
      var job = JSON.parse(all[key]);
      if (Date.now() - Number(job.createdAt || 0) > REPORT_JOB_TTL_MS_) props.deleteProperty(key);
    } catch(ignore) { props.deleteProperty(key); }
  });
}
function createReportJob(sessionToken, eventId) {
  var user = requireAuth_(sessionToken, 'report');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(sheet, eventId, false);
  var stableEventId = String(eventId || '').trim();
  if (!isUuid_(stableEventId)) throw new Error('EventID ไม่ถูกต้อง');
  return withReportJobLock_(function(props) {
    cleanupOldReportJobs_(props);
    var existingId = props.getProperty(REPORT_JOB_ACTIVE_KEY_);
    if (existingId) {
      var existing;
      try { existing = expireStaleReportJob_(props, readReportJob_(props, existingId)); }
      catch(ignore) { releaseReportJobSlot_(props, existingId); }
      if (existing && !reportJobTerminal_(existing.status)) {
        if (existing.ownerId === String(user.userId)) {
          return publicReportJob_(existing); // Idempotent same-owner retry; never start another.
        }
        throw new Error('มีการสร้างรายงานอื่นกำลังทำงานอยู่ กรุณารอจนเสร็จ');
      }
      releaseReportJobSlot_(props, existingId);
    }
    var job = {
      id:Utilities.getUuid(),eventId:stableEventId,
      ownerId:String(user.userId),ownerEmail:String(user.email).toLowerCase(),
      status:'queued',stage:'queued',createdAt:Date.now(),updatedAt:Date.now(),
      message:'รอเริ่มสร้างรายงาน',documentUrl:''
    };
    saveReportJob_(props, job);
    props.setProperty(REPORT_JOB_ACTIVE_KEY_, job.id);
    props.setProperty('SRRT_G32_USER_' + job.ownerId, job.id);
    return publicReportJob_(job);
  });
}
function getReportJobStatus(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    return publicReportJob_(reportJobOwned_(props, jobId, user));
  });
}
function getCurrentReportJob(sessionToken) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    var id = props.getProperty('SRRT_G32_USER_' + user.userId);
    if (!id) return null;
    try { return publicReportJob_(reportJobOwned_(props, id, user)); }
    catch(ignore) { return null; }
  });
}
function cancelReportJob(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    var job = reportJobOwned_(props, jobId, user);
    if (job.status === 'queued') {
      job.status = 'cancelled';job.stage = 'cancelled';
      job.message = 'ยกเลิกก่อนเริ่มสร้างรายงานแล้ว';
      releaseReportJobSlot_(props,job.id);
      saveReportJob_(props,job);
    } else if (job.status === 'running') {
      job.status = 'cancel_requested';
      job.message = 'รับคำขอยกเลิกแล้ว จะหยุดเมื่อ Gemini ส่งคำตอบกลับและถึงจุดตรวจสอบ';
      saveReportJob_(props,job);
    } else if (job.status === 'finalizing') {
      job.message = 'กำลังบันทึกเอกสารและทะเบียนรายงาน ไม่สามารถยกเลิกได้แล้ว';
      saveReportJob_(props,job);
    }
    // cancel_requested/terminal states are idempotent and never revert.
    return publicReportJob_(job);
  });
}
function dismissReportJob(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    var job = reportJobOwned_(props, jobId, user);
    if (!reportJobTerminal_(job.status)) throw new Error('งานยังไม่สิ้นสุด ไม่สามารถล้างการแจ้งเตือนได้');
    var pointer = 'SRRT_G32_USER_' + user.userId;
    if (props.getProperty(pointer) === jobId) props.deleteProperty(pointer);
    return publicReportJob_(job);
  });
}
function reportJobCheckpoint_(jobId, stage) {
  if (!jobId) return;
  return withReportJobLock_(function(props) {
    var job = expireStaleReportJob_(props,readReportJob_(props,jobId));
    if (job.status === 'cancel_requested' || job.status === 'cancelled') {
      throw new Error('REPORT_JOB_CANCELLED');
    }
    if (job.status !== 'running') throw new Error('คำขอรายงานไม่อยู่ในสถานะที่ทำงานได้');
    job.stage = stage;
    if (stage === 'finalizing') job.status = 'finalizing';
    saveReportJob_(props,job);
  });
}
function finalizeReportJob_(jobId, status, url, message) {
  return withReportJobLock_(function(props) {
    var job = readReportJob_(props,jobId);
    if (reportJobTerminal_(job.status)) return publicReportJob_(job);
    if (status === 'failed' && job.status === 'cancel_requested') status = 'cancelled';
    job.status = status;job.stage = status;
    job.documentUrl = status === 'completed' ? String(url || '') : '';
    job.message = String(message || '').slice(0,220);
    saveReportJob_(props,job);
    releaseReportJobSlot_(props,jobId);
    return publicReportJob_(job);
  });
}
function runReportJob(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  var job = withReportJobLock_(function(props) {
    var current = reportJobOwned_(props,jobId,user);
    if (current.status === 'cancelled') return current;
    if (current.status !== 'queued') throw new Error('คำขอรายงานนี้เริ่มแล้วหรือเสร็จสิ้นแล้ว โปรดตรวจสถานะเดิม');
    if (props.getProperty(REPORT_JOB_ACTIVE_KEY_) !== current.id) {
      throw new Error('คำขอรายงานไม่ใช่งานที่กำลังรออยู่');
    }
    current.status = 'running';current.stage = 'preparing';current.message = '';
    saveReportJob_(props,current);
    return current;
  });
  if (job.status === 'cancelled') return publicReportJob_(job);
  try {
    var url = generateReportFromWeb(sessionToken,job.eventId,job.id);
    return finalizeReportJob_(job.id,'completed',url,'สร้างรายงานเรียบร้อยแล้ว');
  } catch(error) {
    var final = finalizeReportJob_(job.id,'failed','',String(error.message || error));
    // Return a typed terminal state; the UI need not expose script errors.
    return final;
  }
}

function recordSuccessfulGeminiModel_(reportMeta, modelInfo) {
  if (!reportMeta || !modelInfo) return;
  if (!reportMeta.models) reportMeta.models = [];
  if (!reportMeta.apiVersions) reportMeta.apiVersions = [];

  var modelName = String(modelInfo.modelName || '').trim();
  var apiVersion = String(modelInfo.apiVersion || '').trim();
  if (modelName && reportMeta.models.indexOf(modelName) < 0) reportMeta.models.push(modelName);
  if (apiVersion && reportMeta.apiVersions.indexOf(apiVersion) < 0) reportMeta.apiVersions.push(apiVersion);
}

function analyzeWithGemini_(rowData, locationInfo, settings, reportMeta, reportJobId) {
  settings = settings || getSettingsMap_();
  var apiKey = String(settings.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า Gemini API Key กรุณาใส่ในหน้า Admin ก่อนสร้างรายงาน AI');
  }

  var modelInfo = resolveReportGeminiModelInfo_(apiKey);

  if (!modelInfo || !modelInfo.modelName) {
    throw new Error('ไม่พบ Gemini 3.8 Flash ที่รองรับ generateContent สำหรับ API Key นี้ ระบบจะไม่สลับไปโมเดลอื่น กรุณาตรวจสอบสิทธิ์หรือสถานะ API แล้วลองใหม่ภายหลัง');
  }

  Logger.log('AI Reporter split mode: start');
  Logger.log('AI Reporter API Version: ' + modelInfo.apiVersion);
  Logger.log('AI Reporter Model: ' + modelInfo.modelName);

  var promptPart1 = buildReportPromptPart_(rowData, locationInfo, '1-3');
  var promptPart2 = buildReportPromptPart_(rowData, locationInfo, '4-6');

  var startedAt = Date.now();
  reportJobCheckpoint_(reportJobId,'gemini_1');
  var part1 = callGeminiForReport_(apiKey, modelInfo, promptPart1, 'หัวข้อ 1-3', reportMeta);
  reportJobCheckpoint_(reportJobId,'gemini_2');
  if (String(part1 || '').indexOf('🚨') === 0) {
    throw new Error(String(part1).replace(/^🚨\s*/, ''));
  }

  // Synchronous UrlFetchApp.fetch cannot be interrupted; avoid STARTING part 2
  // if the first call has already consumed the safe request budget.
  if (Date.now() - startedAt > 120000) {
    throw new Error('Gemini 3.8 Flash ตอบช้าเกินไป ระบบยุติก่อนเริ่มส่วนที่สองเพื่อเลี่ยง Apps Script Timeout กรุณาลองใหม่ภายหลัง');
  }

  var part2 = callGeminiForReport_(apiKey, modelInfo, promptPart2, 'หัวข้อ 4-6', reportMeta);
  reportJobCheckpoint_(reportJobId,'post_gemini');
  if (String(part2 || '').indexOf('🚨') === 0) {
    throw new Error(String(part2).replace(/^🚨\s*/, ''));
  }

  var finalText = String(part1 || '').trim() + '\n\n' + String(part2 || '').trim();

  Logger.log('AI Reporter part1 length: ' + String(part1 || '').length);
  Logger.log('AI Reporter part2 length: ' + String(part2 || '').length);
  Logger.log('AI Reporter final length: ' + finalText.length);

  return finalText.replace(/\*/g, '').replace(/```/g, '').trim();
}

var REPORT_GEMINI_MODEL = 'models/gemini-3.8-flash';

// AI reports are pinned, regardless of AUTO settings or a stale cache entry.
// Do not silently substitute another model when Gemini 3.8 is unavailable.
function resolveReportGeminiModelInfo_(apiKey) {
  var cache = CacheService.getScriptCache();
  var cachedName = cache.get('GEMINI_AVAILABLE_MODEL');
  var cachedVersion = cache.get('GEMINI_AVAILABLE_ENDPOINT');
  if (cachedName === REPORT_GEMINI_MODEL && (cachedVersion === 'v1' || cachedVersion === 'v1beta')) {
    return {modelName:REPORT_GEMINI_MODEL, apiVersion:cachedVersion};
  }
  // Ignoring another model's cached selection is essential after changing AUTO.
  var modelInfo = findGeminiModelInList_(apiKey, REPORT_GEMINI_MODEL);
  if (!modelInfo || modelInfo.modelName !== REPORT_GEMINI_MODEL) return null;
  cache.put('GEMINI_AVAILABLE_MODEL', REPORT_GEMINI_MODEL, 21600);
  cache.put('GEMINI_AVAILABLE_ENDPOINT', modelInfo.apiVersion, 21600);
  return modelInfo;
}

function resolveGeminiModel_(apiKey, settings) {
  var info = resolveGeminiModelInfo_(apiKey, settings, false);
  return info ? info.modelName : '';
}

function resolveGeminiModelInfo_(apiKey, settings, forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (forceRefresh) clearGeminiModelCache_();

  var cachedModel = cache.get('GEMINI_AVAILABLE_MODEL');
  var cachedVersion = cache.get('GEMINI_AVAILABLE_ENDPOINT');
  if (!forceRefresh && cachedModel && cachedVersion && cachedModel.indexOf('gemini-1.5') === -1) {
    return { modelName: cachedModel, apiVersion: cachedVersion };
  }
  if (cachedModel && cachedModel.indexOf('gemini-1.5') !== -1) {
    clearGeminiModelCache_();
  }

  var configured = String((settings && settings.GEMINI_MODEL) || 'AUTO').trim();
  if (!configured) configured = 'AUTO';

  if (configured.toUpperCase() !== 'AUTO') {
    var manualModel = normalizeGeminiModelName_(configured);
    if (manualModel.indexOf('gemini-1.5') !== -1) {
      Logger.log('GEMINI_MODEL ระบุโมเดลเก่าที่ไม่อนุญาตแล้ว ระบบจะข้ามและใช้ AUTO: ' + manualModel);
    } else {
      var manualInfo = findGeminiModelInList_(apiKey, manualModel);
      if (manualInfo) {
        cache.put('GEMINI_AVAILABLE_MODEL', manualInfo.modelName, 21600);
        cache.put('GEMINI_AVAILABLE_ENDPOINT', manualInfo.apiVersion, 21600);
        Logger.log('Selected manual Gemini model: ' + manualInfo.modelName);
        Logger.log('Selected Gemini API version: ' + manualInfo.apiVersion);
        return manualInfo;
      }
      Logger.log('Manual GEMINI_MODEL not usable, fallback to AUTO: ' + manualModel);
    }
  }

  var autoInfo = findBestGeminiModel_(apiKey);
  if (autoInfo) {
    cache.put('GEMINI_AVAILABLE_MODEL', autoInfo.modelName, 21600);
    cache.put('GEMINI_AVAILABLE_ENDPOINT', autoInfo.apiVersion, 21600);
    Logger.log('Selected Gemini model: ' + autoInfo.modelName);
    Logger.log('Selected Gemini API version: ' + autoInfo.apiVersion);
    return autoInfo;
  }

  return null;
}

function findBestGeminiModel_(apiKey) {
  var versions = ['v1', 'v1beta'];
  var priority = [
  // เลือก Stable Flash รุ่นใหม่ก่อน และ fallback ลงมาตามลำดับ
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-pro'
];

  for (var v = 0; v < versions.length; v++) {
    var apiVersion = versions[v];
    var models = listGeminiModelsForVersion_(apiKey, apiVersion);
    if (!models || models.length === 0) continue;

    var usableModels = models.filter(function(model) {
      var methods = model.supportedGenerationMethods || [];
      var name = String(model.name || '');
      return methods.indexOf('generateContent') !== -1 && name.indexOf('gemini-1.5') === -1;
    });

    if (usableModels.length === 0) continue;

    for (var p = 0; p < priority.length; p++) {
      var wanted = priority[p];
      for (var i = 0; i < usableModels.length; i++) {
        var name = String(usableModels[i].name || '');
        if (name === 'models/' + wanted || name.indexOf(wanted) !== -1) {
          return { modelName: name, apiVersion: apiVersion };
        }
      }
    }

    return { modelName: usableModels[0].name, apiVersion: apiVersion };
  }

  return null;
}

function findGeminiModelInList_(apiKey, modelName) {
  var versions = ['v1', 'v1beta'];
  modelName = normalizeGeminiModelName_(modelName);
  if (!modelName || modelName.indexOf('gemini-1.5') !== -1) return null;

  for (var v = 0; v < versions.length; v++) {
    var apiVersion = versions[v];
    var models = listGeminiModelsForVersion_(apiKey, apiVersion);
    if (!models || models.length === 0) continue;

    for (var i = 0; i < models.length; i++) {
      var m = models[i];
      var name = String(m.name || '');
      var methods = m.supportedGenerationMethods || [];
      if (name === modelName && methods.indexOf('generateContent') !== -1) {
        return { modelName: name, apiVersion: apiVersion };
      }
    }
  }
  return null;
}

function listGeminiModelsForVersion_(apiKey, apiVersion) {
  var listUrl = 'https://generativelanguage.googleapis.com/' + apiVersion + '/models?key=' + encodeURIComponent(apiKey);
  try {
    var response = UrlFetchApp.fetch(listUrl, { method: 'get', muteHttpExceptions: true });
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    Logger.log('ListModels ' + apiVersion + ' status: ' + statusCode);
    if (statusCode < 200 || statusCode >= 300) {
      Logger.log('ListModels ' + apiVersion + ' error: ' + responseText);
      return [];
    }
    var json = JSON.parse(responseText);
    return json.models || [];
  } catch (error) {
    Logger.log('listGeminiModelsForVersion_ ' + apiVersion + ' error: ' + error.toString());
    return [];
  }
}

function normalizeGeminiModelName_(modelName) {
  modelName = String(modelName || '').trim();
  if (!modelName) return '';
  if (modelName.indexOf('models/') === 0) return modelName;
  return 'models/' + modelName;
}

function clearGeminiModelCache_() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('GEMINI_AVAILABLE_MODEL');
    cache.remove('GEMINI_AVAILABLE_ENDPOINT');
  } catch (e) {}
}

function clearGeminiModelCache() {
  clearGeminiModelCache_();
  Logger.log('ล้าง Cache โมเดล Gemini เรียบร้อยแล้ว');
  return 'ล้าง Cache โมเดล Gemini เรียบร้อยแล้ว';
}

function listAvailableGeminiModels() {
  clearGeminiModelCache_();
  var settings = getSettingsMap_();
  var apiKey = String(settings.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    Logger.log('ไม่พบ GEMINI_API_KEY ใน SystemSettings');
    return 'ไม่พบ GEMINI_API_KEY ใน SystemSettings';
  }

  var versions = ['v1', 'v1beta'];
  var lines = [];
  for (var v = 0; v < versions.length; v++) {
    var apiVersion = versions[v];
    var models = listGeminiModelsForVersion_(apiKey, apiVersion);
    var usable = models.filter(function(m) {
      var methods = m.supportedGenerationMethods || [];
      return methods.indexOf('generateContent') !== -1;
    }).map(function(m) {
      return apiVersion + ' | ' + m.name + ' | methods=' + (m.supportedGenerationMethods || []).join(',');
    });
    lines = lines.concat(usable);
  }

  var output = lines.length ? lines.join('\n') : 'ไม่พบโมเดลที่รองรับ generateContent';
  Logger.log(output);
  return output;
}

function testGeminiConnection() {
  forceGeminiModelAuto();
  var settings = getSettingsMap_();
  settings.GEMINI_MODEL = 'AUTO';
  var apiKey = String(settings.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    Logger.log('ไม่พบ GEMINI_API_KEY ใน SystemSettings');
    return 'ไม่พบ GEMINI_API_KEY ใน SystemSettings';
  }

  var modelInfo = resolveGeminiModelInfo_(apiKey, settings, true);
  if (!modelInfo || !modelInfo.modelName) {
    Logger.log('ไม่พบโมเดลที่รองรับ generateContent');
    return 'ไม่พบโมเดลที่รองรับ generateContent\n\nรายชื่อที่ตรวจพบ:\n' + listAvailableGeminiModels();
  }

  var apiUrl = 'https://generativelanguage.googleapis.com/' + modelInfo.apiVersion + '/' + modelInfo.modelName + ':generateContent?key=' + encodeURIComponent(apiKey);
  var payload = {
    contents: [{ parts: [{ text: 'ทดสอบระบบ Smart SRRT AI Reporter กรุณาตอบว่า ระบบพร้อมใช้งาน' }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256
    }
  };

  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  Logger.log('API Version: ' + modelInfo.apiVersion);
  Logger.log('Model: ' + modelInfo.modelName);
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log(response.getContentText());
  return 'API Version: ' + modelInfo.apiVersion + '\nModel: ' + modelInfo.modelName + '\nStatus: ' + response.getResponseCode() + '\n' + response.getContentText();
}
// Only Gemini 3.8 Flash is authorized for Smart SRRT report generation.
// One synchronous request per section; HTTP 503/429 fails immediately without retry.
function callGeminiForReport_(apiKey, modelInfo, promptText, label, reportMeta) {
  if (!modelInfo || modelInfo.modelName !== REPORT_GEMINI_MODEL || !['v1','v1beta'].includes(modelInfo.apiVersion)) {
    throw new Error('ไม่อนุญาตให้สร้างรายงานด้วยโมเดลอื่นนอกจาก Gemini 3.8 Flash');
  }
  var apiUrl = 'https://generativelanguage.googleapis.com/' + modelInfo.apiVersion + '/' +
    REPORT_GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(apiKey);
  var payload = {
    contents:[{parts:[{text:promptText}]}],
    generationConfig:{temperature:0.15, topP:0.8, topK:40, maxOutputTokens:12000}
  };
  var startedAt = Date.now();
  var response;
  try {
    response = UrlFetchApp.fetch(apiUrl, {
      method:'post', contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true, timeoutSeconds:110
    });
  } catch (error) {
    Logger.log('AI Reporter ' + label + ' transport failure, ms=' + (Date.now() - startedAt));
    throw new Error('เชื่อมต่อ Gemini 3.8 Flash ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่ภายหลัง');
  }
  var statusCode = response.getResponseCode();
  Logger.log('AI Reporter ' + label + ' model=' + REPORT_GEMINI_MODEL +
    ' API=' + modelInfo.apiVersion + ' status=' + statusCode + ' durationMs=' + (Date.now() - startedAt));
  if (statusCode === 503) {
    throw new Error('Gemini 3.8 Flash กำลังมีการใช้งานสูง (HTTP 503) กรุณาลองใหม่ภายหลัง ระบบไม่ได้สลับโมเดลอื่น');
  }
  if (statusCode === 429) {
    throw new Error('Gemini 3.8 Flash เกินขีดจำกัดการใช้งาน (HTTP 429) กรุณารอให้โควตาพร้อมแล้วลองใหม่');
  }
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('Gemini 3.8 Flash ตอบกลับ HTTP ' + statusCode + ' กรุณาลองใหม่ภายหลัง');
  }
  var json;
  try { json = JSON.parse(response.getContentText()); }
  catch (error) { throw new Error('Gemini 3.8 Flash ส่งข้อมูลตอบกลับที่อ่านไม่ได้'); }
  var candidate = json.candidates && json.candidates[0];
  if (!candidate || !candidate.content || !Array.isArray(candidate.content.parts)) {
    throw new Error('Gemini 3.8 Flash ไม่ส่งเนื้อหารายงานในส่วน ' + label);
  }
  var text = candidate.content.parts.map(function(p){return p.text || '';}).join('\n')
    .replace(/\*/g,'').replace(/```/g,'').trim();
  if (!text) throw new Error('Gemini 3.8 Flash ส่งรายงานว่างเปล่าในส่วน ' + label);
  recordSuccessfulGeminiModel_(reportMeta, modelInfo);
  if (candidate.finishReason === 'MAX_TOKENS') {
    text += '\n\nหมายเหตุ: ระบบ AI สร้างเนื้อหา' + label + 'ถึงขีดจำกัดความยาวของโมเดล ข้อความส่วนนี้อาจยังไม่สมบูรณ์';
  }
  return text;
}

function buildReportPromptPart_(rowData, locationInfo, sectionRange) {
  var base = buildReportPrompt_(rowData, locationInfo);

  if (sectionRange === '1-3') {
    return base + '\n\n' +
      'คำสั่งเฉพาะรอบนี้: ให้เขียนเฉพาะหัวข้อ 1. ความเป็นมา, 2. ผลการสอบสวนโรค และ 3. กิจกรรมควบคุมโรคที่ดำเนินการไปแล้ว เท่านั้น ' +
      'ห้ามเขียนหัวข้อ 4, 5, 6 ในรอบนี้ และต้องเขียนหัวข้อ 1-3 ให้ละเอียดครบถ้วนตามกฎด้านบน';
  }

  if (sectionRange === '4-6') {
    return base + '\n\n' +
      'คำสั่งเฉพาะรอบนี้: ให้เขียนเฉพาะหัวข้อ 4. แนวโน้มของการระบาด, 5. สรุปความสำคัญทางสาธารณสุข และความเร่งด่วน และ 6. ข้อเสนอเพื่อพิจารณาดำเนินการ เท่านั้น ' +
      'ห้ามเขียนหัวข้อ 1, 2, 3 ซ้ำในรอบนี้ ต้องเริ่มที่หัวข้อ 4. แนวโน้มของการระบาด ทันที ' +
      'ห้ามปล่อยหัวข้อ 4 เป็นจุดไข่ปลา และข้อ 6 ต้องมีข้อเสนอเชิงปฏิบัติอย่างน้อย 5 ข้อ';
  }

  return base;
}


function replacePlaceholderWithParagraphs_(body, placeholder, text) {
  text = String(text || '').replace(/\r/g, '\n');

  var found = body.findText(placeholder);

  if (!found) {
    body.appendParagraph(text);
    return;
  }

  var element = found.getElement();
  var paragraph = element.getParent();

  while (paragraph.getType && paragraph.getType() !== DocumentApp.ElementType.PARAGRAPH) {
    paragraph = paragraph.getParent();
  }

  var parent = paragraph.getParent();
  var insertIndex = parent.getChildIndex(paragraph);

  parent.removeChild(paragraph);

  var lines = text.split('\n');
  var currentIndex = insertIndex;

  lines.forEach(function(line) {
    line = String(line || '').trim();

    if (line === '') {
      parent.insertParagraph(currentIndex, '');
      currentIndex++;
      return;
    }

    var p = parent.insertParagraph(currentIndex, line);

    if (/^[1-6]\.\s/.test(line)) {
      p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      p.setBold(true);
    } else if (/^2\.[1-7]\s/.test(line)) {
      p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      p.setBold(true);
    } else {
      p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
      p.setBold(false);
    }

    currentIndex++;
  });
}

function buildReportPrompt_(rowData, locationInfo) {
  var reporter = safePromptValue_(rowData[2]);
  var notifyAgency = safePromptValue_(rowData[19] || 'ไม่ระบุ');
  var receiveAgency = safePromptValue_(rowData[22] || 'ไม่ระบุ');
  var reportDate = safePromptValue_(rowData[1]);
  var disease = safePromptValue_(rowData[5]);
  var location = safePromptValue_(locationInfo);
  var onsetDate = safePromptValue_(rowData[8]);
  var criteria = safePromptValue_(rowData[16]);
  var dateInv = safePromptValue_(rowData[25]);
  var details = safePromptValue_(rowData[13]);
  var measures = safePromptValue_(rowData[20]);

  return `
จงเขียนเนื้อหารายงานสอบสวนโรคเบื้องต้น จำนวน 6 หัวข้อ โดยใช้ข้อมูลดิบที่กำหนดให้

ข้อมูลดิบ:
- แหล่งข่าว/ผู้แจ้ง: ${reporter}
- หน่วยงานแจ้งเตือน: ${notifyAgency}
- หน่วยงานรับแจ้ง: ${receiveAgency}
- วันที่รับแจ้ง: ${reportDate}
- โรค/เหตุการณ์: ${disease}
- สถานที่เกิดเหตุ: ${location}
- วันที่เริ่มป่วย (Index case): ${onsetDate}
- การเข้าเกณฑ์สอบสวนโรค: ${criteria}
- วันที่ลงสอบสวนโรค: ${dateInv}
- ผลการสอบสวนโรค (รายละเอียด): ${details}
- กิจกรรมควบคุมโรคที่ทำแล้ว: ${measures}

กฎการเขียน (บังคับใช้ขั้นเด็ดขาด):
1. ห้ามใช้เครื่องหมาย * หรือ ** ในการจัดรูปแบบข้อความเด็ดขาด ให้พิมพ์ข้อความธรรมดา
2. ห้ามพิมพ์คำขึ้นต้นจดหมาย เช่น "รายงานสอบสวนโรค...", "เรียน...", "จาก..." ให้เริ่มพิมพ์ที่ข้อ "1. ความเป็นมา" ได้เลย
3. ข้อมูลหัวข้อใดที่ไม่มีในข้อมูลดิบ ให้พิมพ์ ".........." แทนที่ข้อมูลนั้น ห้ามจินตนาการเนื้อหาขึ้นเองเด็ดขาด
4. ใช้ภาษาราชการ และภาษาทางการแพทย์ที่กระชับ
5. ต้องเขียนให้ครบทุกหัวข้อที่ได้รับมอบหมายในรอบนั้น ห้ามปล่อยหัวข้อใหญ่ใดหัวข้อหนึ่งเป็นเพียง ".........."
6. หากข้อมูลไม่ครบ ให้เขียนวิเคราะห์จากข้อมูลที่มี และระบุข้อจำกัดว่า "ข้อมูลไม่ปรากฏในข้อมูลดิบ" หรือ "อยู่ระหว่างสอบสวนโรค"
7. ห้ามแนะนำให้ผู้ใช้กรอกข้อมูลเพิ่ม ให้เขียนรายงานจากข้อมูลที่มีทันที

รูปแบบเนื้อหาที่ต้องการ ให้เขียนเรียงลำดับ 1 ถึง 6:

1. ความเป็นมา
- การรับแจ้ง: บังคับให้ขึ้นต้นประโยคแรกว่า "ศูนย์ระบาดวิทยาอำเภอ[ระบุชื่ออำเภอที่เกิดเหตุ] ได้รับแจ้งจาก ${reporter}..."
- หากระบุชื่ออำเภอได้จากสถานที่เกิดเหตุ ให้เติมชื่ออำเภอในประโยคแรก เช่น "ศูนย์ระบาดวิทยาอำเภอเมืองอุดรธานี ได้รับแจ้งจาก..."
- รูปแบบวันเวลา: บังคับให้แปลงวันที่รับแจ้งเป็นรูปแบบภาษาไทยแบบเต็ม เช่น วันที่ 10 ตุลาคม 2569 และต้องระบุเวลาเสมอ หากไม่มีข้อมูลเวลาให้พิมพ์ต่อท้ายวันที่ว่า "เวลา..... น."
- เนื้อหา: สรุปข้อมูลเบื้องต้นของ Index case ขนาดและความรุนแรงของปัญหา การเข้าเกณฑ์สอบสวนโรค หน่วยงานที่แจ้งเตือน หน่วยงานรับแจ้ง และหน่วยงานที่เข้าดำเนินการ
- วัตถุประสงค์ของการสอบสวนโรค: ให้วิเคราะห์จากจำนวนผู้ป่วยในข้อมูลดิบ
  หากพบผู้ป่วยเพียง 1 ราย หรือข้อมูลมีลักษณะสอบสวนเฉพาะราย ให้เขียนวัตถุประสงค์ทิ้งท้ายข้อนี้ว่า "เพื่อยืนยันการวินิจฉัยโรค เพื่อค้นหาแหล่งโรค/แหล่งรังโรค และลักษณะของการเกิดโรค และเพื่อหาแนวทางควบคุมป้องกันไม่ให้แพร่กระจายออกไป"
  หากพบผู้ป่วยมากกว่า 1 ราย หรือเป็นกลุ่มก้อน หรือมีคำว่า cluster/กลุ่มก้อน/ระบาด ให้เขียนวัตถุประสงค์ทิ้งท้ายข้อนี้ว่า "เพื่อยืนยันการวินิจฉัยและการระบาดของโรค เพื่อศึกษาลักษณะทางระบาดวิทยาของโรคตาม บุคคล เวลา สถานที่ เพื่อค้นหาแหล่งโรค วิธีการถ่ายทอดโรค และเพื่อหามาตรการในการควบคุมป้องกันการระบาดในครั้งนี้และป้องกันการระบาดในอนาคต"

2. ผลการสอบสวนโรค
เขียนอธิบายรายละเอียดโดยครอบคลุมประเด็นต่อไปนี้ให้ครบถ้วนตามลำดับ ห้ามเขียนสั้นเพียงย่อหน้าเดียว

2.1 ข้อมูลทั่วไป
- อธิบายข้อมูลทั่วไปของสถานที่เกิดเหตุ หรือจุดเกิดเหตุ เช่น บ้านพัก โรงเรียน ศูนย์เด็กเล็ก ชุมชน หมู่บ้าน สถานประกอบการ โรงพยาบาล หรือสถานที่อื่น
- หากไม่มีข้อมูลส่วนนี้ ให้เขียนว่า "ข้อมูลทั่วไปของสถานที่เกิดเหตุ .........." แต่ยังต้องเชื่อมโยงว่าสถานที่เกิดเหตุอยู่ที่ ${location}

2.2 สถานการณ์การระบาด
- ระบุจำนวนผู้ป่วยทั้งหมดเท่าที่พบในข้อมูลดิบ
- ระบุจำนวนผู้เสียชีวิต หากไม่มีให้เขียนว่า "ไม่พบข้อมูลผู้เสียชีวิตในข้อมูลดิบ"
- ระบุอัตราป่วย หากไม่มีตัวหารประชากรให้เขียนว่า "ไม่สามารถคำนวณอัตราป่วยได้ เนื่องจากไม่ปรากฏจำนวนประชากรกลุ่มเสี่ยงในข้อมูลดิบ"
- ระบุสถานะผู้ป่วย เช่น สงสัย เข้าข่าย ยืนยัน หรืออยู่ระหว่างรอผล หากมีในข้อมูลดิบ

2.3 ลักษณะทางระบาดวิทยา
ให้แยกเขียนเป็น 3 ประเด็นย่อยดังนี้
1) บุคคล: อธิบายลักษณะผู้ป่วยตามกลุ่ม เพศ อายุ อาชีพ กลุ่มเสี่ยง ภาวะเฉพาะ เช่น หญิงตั้งครรภ์ เด็ก ผู้สูงอายุ ผู้มีโรคประจำตัว หรือบุคลากรสาธารณสุข หากข้อมูลใดไม่มี ให้ใช้ ".........."
2) เวลา: ระบุวันที่เริ่มป่วยของ Index case วันที่รับแจ้ง วันที่ลงสอบสวน และวันที่พบผู้ป่วยรายล่าสุด หากไม่ทราบให้ระบุว่า "ไม่ปรากฏในข้อมูลดิบ"
3) สถานที่: ระบุสถานที่เกิดเหตุ หมู่บ้าน ตำบล อำเภอ จังหวัด หรือสถานที่เฉพาะ เช่น ชั้นเรียน หอผู้ป่วย แผนก โรงงาน หรือชุมชน

2.4 กลุ่มเสี่ยงและผู้สัมผัส
- ระบุว่ากลุ่มเสี่ยงที่พบเป็นกลุ่มใด
- ระบุจำนวนผู้สัมผัส หากมีในข้อมูลดิบ
- หากไม่มีจำนวนผู้สัมผัส ให้เขียนว่า "จำนวนผู้สัมผัสยังไม่ปรากฏในข้อมูลดิบ และควรดำเนินการค้นหาเพิ่มเติม"

2.5 แหล่งรังโรค แหล่งโรค และการถ่ายทอดโรค
- ระบุแหล่งรังโรค หากในข้อมูลดิบไม่ระบุ ให้พิมพ์ว่า "อยู่ระหว่างสอบสวนโรค"
- ระบุแหล่งโรค วิธีการแพร่กระจาย และสาเหตุของการระบาด เช่น เชื้อโรค สัตว์ พาหะ อาหาร น้ำ สิ่งแวดล้อม หรือสารเคมี
- หากเป็นโรคติดต่อนำโดยแมลง ให้เชื่อมโยงกับแหล่งเพาะพันธุ์พาหะ ค่า HI ค่า CI หรือสิ่งแวดล้อมที่เอื้อต่อการแพร่โรค เฉพาะเมื่อมีข้อมูลในข้อมูลดิบ
- หากเป็นโรคอาหารเป็นพิษ ให้เชื่อมโยงกับอาหาร น้ำ แหล่งปรุง ประวัติรับประทานร่วมกัน หรือสุขาภิบาลอาหาร เฉพาะเมื่อมีข้อมูลในข้อมูลดิบ
- หากเป็นโรคทางเดินหายใจ ให้เชื่อมโยงกับผู้สัมผัสใกล้ชิด พื้นที่แออัด ระบบระบายอากาศ หรือประวัติสัมผัสผู้ป่วย เฉพาะเมื่อมีข้อมูลในข้อมูลดิบ

2.6 ปัจจัยเสี่ยง
- ระบุปัจจัยเสี่ยงที่เกี่ยวข้องของกลุ่มผู้ป่วยและพื้นที่
- หากข้อมูลไม่ครบ ให้เขียนว่า "ปัจจัยเสี่ยงเพิ่มเติมอยู่ระหว่างสอบสวนโรค" แต่ต้องไม่เว้นว่าง

2.7 ผลตรวจทางห้องปฏิบัติการ
- ระบุว่ามีผลตรวจหรือไม่
- ระบุชนิดตัวอย่าง วิธีตรวจ สถานที่ตรวจ วันที่เก็บตัวอย่าง วันที่ทราบผล และผลการตรวจ หากมีในข้อมูลดิบ
- หากไม่มีข้อมูล ให้เขียนว่า "ผลตรวจทางห้องปฏิบัติการ .........." หรือ "อยู่ระหว่างสอบสวน/รอผลตรวจ" ตามความเหมาะสมจากข้อมูลดิบ

3. กิจกรรมควบคุมโรคที่ดำเนินการไปแล้ว
นำข้อมูล "กิจกรรมควบคุมโรคที่ทำแล้ว" มาแยกเขียนเป็นข้อๆ ย่อย 1), 2), 3)...
- บังคับให้ระบุชื่อหน่วยงานที่ปฏิบัติไว้ที่หน้าสุดของแต่ละข้อ แล้วตามด้วยรายละเอียดกิจกรรม
- ให้อนุมานชื่อหน่วยงานจาก "หน่วยงานแจ้งเตือน", "หน่วยงานรับแจ้ง" หรือ "แหล่งข่าว/ผู้แจ้ง"
- หากข้อใดไม่สามารถระบุชื่อหน่วยงานได้ ให้พิมพ์คำว่า "หน่วยงาน ....." ขึ้นต้นประโยคแทน
- ห้ามเขียนรวมเป็นย่อหน้าความเรียงเด็ดขาด
- ต้องพยายามแยกกิจกรรมให้เป็นหลายข้อ เช่น การสอบสวนโรค การค้นหาผู้ป่วยเพิ่มเติม การค้นหาผู้สัมผัส การควบคุมสิ่งแวดล้อม การให้สุขศึกษา การติดตามอาการ และการประสานหน่วยงาน
- ตัวอย่างรูปแบบที่ต้องการ:
1) รพ.สต.บ้านตาด ดำเนินการคัดกรองอุณหภูมิและค้นหาผู้ป่วยเพิ่มเติมในพื้นที่
2) หน่วยงาน ..... ให้สุขศึกษาเรื่องการสวมหน้ากากและการป้องกันโรค
3) อปท.ในพื้นที่ สนับสนุนการควบคุมสิ่งแวดล้อมและกำจัดแหล่งเสี่ยง

4. แนวโน้มของการระบาด
วิเคราะห์ตามหลัก Single Algorithm จากปัจจัยต่างๆ ดังนี้:
1) กลุ่มเสี่ยงที่มีโอกาสได้รับเชื้อหรือผลกระทบเพิ่มขึ้น
2) โอกาสสัมผัสโรค (Exposure) หรือความหนาแน่นของผู้สัมผัสในพื้นที่
3) ความผิดปกติของเหตุการณ์ (Unusualness) ว่าเคยเกิดขึ้นมาก่อนหรือไม่
4) โอกาสที่จะแพร่กระจายไปพื้นที่อื่น (Spreading)
5) ขนาดผลกระทบทางสุขภาพ (Impact) ต่อประชาชน
6) มาตรการควบคุมที่มีประสิทธิภาพ (Control measures)

ข้อกำหนดสำคัญของหัวข้อ 4:
- ห้ามตอบเพียง ".........." ทั้งหัวข้อ
- ให้พรรณนาวิเคราะห์จากข้อมูลที่มี แม้ข้อมูลไม่ครบ
- หากข้อมูลไม่ชัดเจน ให้ระบุว่า "ข้อมูลไม่ปรากฏในข้อมูลดิบ" หรือ "อยู่ระหว่างสอบสวนโรค" แล้วประเมินในระดับที่สูงกว่าหรือรุนแรงไว้ก่อนตามหลักความปลอดภัย (Precautionary Principle)
- ต้องสรุปสุดท้ายว่าเหตุการณ์นี้เป็นความเสี่ยงระดับใด ได้แก่ ต่ำมาก, ต่ำ, ปานกลาง, สูง หรือสูงมาก พร้อมเหตุผลสนับสนุน
- หากพบกลุ่มเสี่ยงพิเศษ เช่น หญิงตั้งครรภ์ เด็กเล็ก ผู้สูงอายุ ผู้ป่วยโรคเรื้อรัง หรือผู้สัมผัสจำนวนมาก ให้สะท้อนในระดับความเสี่ยงและความเร่งด่วน

5. สรุปความสำคัญทางสาธารณสุข และความเร่งด่วน
เขียนสรุปเป็นความเรียงเชิงบริหาร (Executive Summary) ที่กระชับและตรงประเด็น โดยต้องครอบคลุมเนื้อหาดังนี้:
- ขนาดของปัญหาและผลกระทบโดยตรงต่อสุขภาพของประชาชนในพื้นที่
- ระบุและฟันธงให้ชัดเจนว่าเหตุการณ์นี้จัดเป็น "การระบาด", "โรคอุบัติใหม่/อุบัติซ้ำ", "โรคติดต่ออันตราย" หรือ "การสอบสวนเฉพาะราย" หรือไม่
- ประเมินความเร่งด่วนในการแก้ไขปัญหา โดยต้องนำระดับความเสี่ยงที่วิเคราะห์ได้จากข้อ 4 มาเป็นเหตุผลสนับสนุนความเร่งด่วน
- ประเมินผลกระทบเชิงวงกว้างด้านเศรษฐกิจ การท่องเที่ยว และสังคม ว่ามีหรือไม่ อยู่ในระดับใด สูง, ปานกลาง, ต่ำ หรือไม่มีผลกระทบ พร้อมอธิบายเหตุผลสั้นๆ
- ต้องเขียนให้เหมาะกับการเสนอผู้บริหารอำเภอ/จังหวัด

6. ข้อเสนอเพื่อพิจารณาดำเนินการ
นำเสนอข้อพิจารณาสั่งการและมาตรการที่ควรทำเพิ่มเติม โดยให้ครอบคลุมอย่างน้อย 5 มิติ ดังนี้:
1) การค้นหาผู้ป่วยเพิ่มเติมและการเฝ้าระวังเชิงรุก
2) การค้นหาและติดตามผู้สัมผัสหรือกลุ่มเสี่ยง
3) การจัดการควบคุมสิ่งแวดล้อม พาหะ แหล่งโรค หรือปัจจัยเสี่ยง
4) การสื่อสารความเสี่ยงและให้สุขศึกษาแก่ประชาชน
5) การประสานงาน/สนับสนุนทรัพยากร/ติดตามประเมินผล

กติกาบังคับของหัวข้อ 6:
- ต้องแยกเขียนเป็นข้อย่อย 1), 2), 3), 4), 5)
- ทุกข้อต้องระบุชื่อหน่วยงานที่ควรรับผิดชอบไว้เป็นประธานหน้าสุดของประโยค
- ให้อนุมานชื่อหน่วยงานจากบริบทของสถานที่เกิดเหตุ เช่น สสจ., สสอ., รพ.สต., อปท., ปศุสัตว์, โรงเรียน, โรงพยาบาล หรือพิมพ์ "หน่วยงาน ....." หากระบุไม่ได้
- ห้ามเขียนรวมเป็นย่อหน้าความเรียงเด็ดขาด
- ห้ามเขียนเพียงชื่อหน่วยงานตามด้วย ".........." ต้องมีข้อเสนอเชิงปฏิบัติอย่างน้อย 1 ประโยคในแต่ละข้อ
- ตัวอย่างรูปแบบที่ถูกต้อง:
1) รพ.สต.[ชื่อตำบล] ควรเฝ้าระวังค้นหาผู้ป่วยรายใหม่และติดตามกลุ่มเสี่ยงในพื้นที่ต่อเนื่อง
2) อปท.ในพื้นที่ ควรสนับสนุนวัสดุอุปกรณ์และกำลังคนในการควบคุมสิ่งแวดล้อม
3) สสอ.[ชื่ออำเภอ] ควรประสานหน่วยงานที่เกี่ยวข้องเพื่อกำกับติดตามการดำเนินงานและสรุปผลเสนอผู้บริหาร
`.trim();
}

function safePromptValue_(value) {
  var text = String(value || '..........').trim();

  if (!text) {
    text = '..........';
  }

  text = text
    .replace(/`/g, "'")
    .replace(/\$\{/g, "{")
    .replace(/\r/g, "\n");

  return text;
}
function forceGeminiModelAuto() {
  var ss = getDb_();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

  if (!sheet) {
    throw new Error('ไม่พบชีท SystemSettings');
  }

  var preferred = 'AUTO';
  var values = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === 'GEMINI_MODEL') {
      sheet.getRange(i + 1, 2).setValue(preferred);
      sheet.getRange(i + 1, 3).setValue('AUTO = ตรวจโมเดลที่ API Key ใช้งานได้จริง แล้วเลือก Stable Flash รุ่นใหม่อัตโนมัติ');
      sheet.getRange(i + 1, 4).setValue(new Date());
      sheet.getRange(i + 1, 5).setValue('system');
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([
      'GEMINI_MODEL',
      preferred,
      'AUTO = ตรวจโมเดลที่ API Key ใช้งานได้จริง แล้วเลือก Stable Flash รุ่นใหม่อัตโนมัติ',
      new Date(),
      'system'
    ]);
  }

  clearGeminiModelCache_();

  Logger.log('ตั้งค่า GEMINI_MODEL เป็น AUTO และล้าง Cache เรียบร้อยแล้ว');
  return 'ตั้งค่า GEMINI_MODEL เป็น AUTO และล้าง Cache เรียบร้อยแล้ว';
}

// ชื่อเดิมยังใช้ได้ เพื่อไม่ให้เมนูหรือคู่มือเก่าเสีย
function forceGeminiModelStable() {
  return forceGeminiModelAuto();
}