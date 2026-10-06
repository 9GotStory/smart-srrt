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
  logVisit_(e);
  return output;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Smart SRRT')
      .addItem('ติดตั้ง/ซ่อมระบบครั้งเดียว', 'installSmartSRRT')
      .addItem('อัปเกรดโครงสร้างข้อมูล', 'migrateSmartSRRTSchema')
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
    var lifecycleMigration = ensureEventLifecycleData_(mainSheet);
    ensureSheet_(ss, CONFIG.SHEETS.USERS, ['UserID','ชื่อ-สกุล','Email','PasswordHash','Role','Status','หน่วยงาน','ตำบล','อำเภอ','จังหวัด','วันที่ลงทะเบียน','อนุมัติโดย','วันที่อนุมัติ','LastLogin']);
    ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, ['Key','Value','Description','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.MASTER, ['Type','Value','Label','SortOrder','Active','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.AREAS, ['AreaID','จังหวัด','อำเภอ','ตำบล','หมู่','ชื่อหมู่บ้าน','รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.CONTENT, ['ContentID','Category','Title','Description','URL','FileID','Status','SortOrder','CreatedAt','UpdatedAt','UpdatedBy']);
    ensureSheet_(ss, CONFIG.SHEETS.ATTACHMENTS, ['AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes','FileUrl','Active','UploadedAt','UploadedBy','DisabledAt','DisabledBy']);
    ensureSheet_(ss, CONFIG.SHEETS.REPORTS, ['ReportID','EventID','DocumentID','DocumentURL','GeneratedAt','GeneratedBy','Model','ApiVersion','PromptVersion','TemplateDocID','ReadinessWarnings','Status']);
    ensureSheet_(ss, CONFIG.SHEETS.AUDIT, ['Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint']);
    ensureSheet_(ss, CONFIG.SHEETS.AUDIT_ARCHIVE, ['Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint','ArchivedAt']);
    var visitSheet = ensureSheet_(ss, CONFIG.SHEETS.VISITS, ['Timestamp','Page','Parameters']);
    ensureVisitLogsSchema_(visitSheet);

    var assets = ensureSystemAssets_(ss);
    seedSettings_(ss, assets);
    seedMasterData_(ss);
    var adminInfo = seedSuperAdmin_(ss);
    formatSheets_(ss);

    props.setProperty('INSTALL_VERSION', CONFIG.VERSION);
    props.setProperty('SYSTEM_FOLDER_ID', assets.systemFolderId);
    props.setProperty('REPORT_FOLDER_ID', assets.reportFolderId);
    props.setProperty('LOGO_FOLDER_ID', assets.logoFolderId);
    props.setProperty('ATTACHMENT_FOLDER_ID', assets.attachmentFolderId);
    props.setProperty('TEMPLATE_DOC_ID', assets.templateDocId);

    var message = [
      'ติดตั้ง/ตรวจสอบ Smart SRRT เรียบร้อยแล้ว',
      'ฐานข้อมูล: ' + ss.getName(),
      'โฟลเดอร์ระบบและ Template รายงานถูกสร้างให้อัตโนมัติ',
      'Event identity: backfilled ' + eventMigration.backfilledIds + ', initialized revision ' + eventMigration.initializedRevision + ', initialized status ' + eventMigration.initializedStatus,
      'Event lifecycle: initialized workflow status ' + lifecycleMigration.initializedWorkflowStatus,
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
      templateDocId: assets.templateDocId,
      adminEmail: adminInfo.email,
      eventMigration: eventMigration,
      lifecycleMigration: lifecycleMigration
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
  var attachmentFolder = getOrCreateFolder_(
    directSettings.ATTACHMENT_FOLDER_ID || props.getProperty('ATTACHMENT_FOLDER_ID'),
    'ไฟล์แนบเหตุการณ์',
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
    if (existingStatus && ['active','void'].indexOf(existingStatus) < 0) {
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

function ensureEventLifecycleData_(sheet) {
  var lastRow = sheet.getLastRow();
  var count = Math.max(lastRow - 1, 0);
  var summary = {rows:count, initializedWorkflowStatus:0};
  if (!count) return summary;

  var receivedDates = sheet.getRange(2, 2, count, 1).getValues();
  var workflow = sheet.getRange(2, WORKFLOW_META_COL.WORKFLOW_STATUS, count, WORKFLOW_META_HEADERS.length).getValues();
  var changed = false;

  for (var i=0; i<count; i++) {
    if (!receivedDates[i][0]) continue;
    var status = String(workflow[i][0] || '').trim().toLowerCase();
    if (status && ['open','in_progress','closed'].indexOf(status) < 0) {
      throw new Error('พบ WorkflowStatus ไม่ถูกต้องที่แถว ' + (i + 2) + ': ' + status);
    }
    if (!status) {
      workflow[i][0] = 'open';
      summary.initializedWorkflowStatus++;
      changed = true;
    }
  }

  if (changed) {
    sheet.getRange(2, WORKFLOW_META_COL.WORKFLOW_STATUS, count, WORKFLOW_META_HEADERS.length).setValues(workflow);
  }
  return summary;
}

function ensureVisitLogsSchema_(sheet) {
  if (!sheet) return;
  var header = String(sheet.getRange(1, 3).getValue() || '');
  if (!header || header === 'UserAgent') sheet.getRange(1, 3).setValue('Parameters');
}

function ensureSupportingGovernanceSchema_(ss) {
  ensureSheet_(ss, CONFIG.SHEETS.ATTACHMENTS, ['AttachmentID','EventID','FileID','FileName','MimeType','SizeBytes','FileUrl','Active','UploadedAt','UploadedBy','DisabledAt','DisabledBy']);
  ensureSheet_(ss, CONFIG.SHEETS.REPORTS, ['ReportID','EventID','DocumentID','DocumentURL','GeneratedAt','GeneratedBy','Model','ApiVersion','PromptVersion','TemplateDocID','ReadinessWarnings','Status']);
  ensureSheet_(ss, CONFIG.SHEETS.AUDIT_ARCHIVE, ['Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint','ArchivedAt']);
  var visits = ensureSheet_(ss, CONFIG.SHEETS.VISITS, ['Timestamp','Page','Parameters']);
  ensureVisitLogsSchema_(visits);
}

function migrateSmartSRRTSchema() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var sheet = ensureSheet_(ss, CONFIG.SHEETS.MAIN, MAIN_SCHEMA_HEADERS);
    var eventSummary = ensureEventIdentityData_(sheet);
    var lifecycleSummary = ensureEventLifecycleData_(sheet);
    ensureSupportingGovernanceSchema_(ss);
    var settings = getSheet_(CONFIG.SHEETS.SETTINGS);
    upsertSettingDirect_(settings, 'SCHEMA_VERSION', CONFIG.SCHEMA_VERSION, 'รุ่นโครงสร้างข้อมูลถาวร', true);
    var message = [
      'อัปเกรดโครงสร้าง Smart SRRT เรียบร้อยแล้ว',
      'จำนวน Event ที่ตรวจ: ' + eventSummary.rows,
      'สร้าง EventID ใหม่: ' + eventSummary.backfilledIds,
      'กำหนด Revision เริ่มต้น: ' + eventSummary.initializedRevision,
      'กำหนด RecordStatus เริ่มต้น: ' + eventSummary.initializedStatus,
      'กำหนด WorkflowStatus เริ่มต้น: ' + lifecycleSummary.initializedWorkflowStatus,
      'Schema version: ' + CONFIG.SCHEMA_VERSION
    ].join('\n');
    try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
    return message;
  } finally {
    lock.releaseLock();
  }
}

function migrateP1EventIdentity() {
  return migrateSmartSRRTSchema();
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
    voidReason: row[EVENT_META_COL.VOID_REASON - 1] || '',
    workflowStatus: String(row[WORKFLOW_META_COL.WORKFLOW_STATUS - 1] || 'open').toLowerCase(),
    ownerUserId: String(row[WORKFLOW_META_COL.OWNER_USER_ID - 1] || ''),
    assignedAt: row[WORKFLOW_META_COL.ASSIGNED_AT - 1] || '',
    assignedBy: row[WORKFLOW_META_COL.ASSIGNED_BY - 1] || '',
    closedAt: row[WORKFLOW_META_COL.CLOSED_AT - 1] || '',
    closedBy: row[WORKFLOW_META_COL.CLOSED_BY - 1] || '',
    closeReason: row[WORKFLOW_META_COL.CLOSE_REASON - 1] || '',
    reopenedAt: row[WORKFLOW_META_COL.REOPENED_AT - 1] || '',
    reopenedBy: row[WORKFLOW_META_COL.REOPENED_BY - 1] || '',
    reopenReason: row[WORKFLOW_META_COL.REOPEN_REASON - 1] || ''
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
    ['ATTACHMENT_FOLDER_ID', assets.attachmentFolderId, 'โฟลเดอร์เก็บไฟล์แนบเหตุการณ์'],
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

