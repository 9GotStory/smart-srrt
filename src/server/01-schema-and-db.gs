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
  requireTrustedOperator_('migrateG05EventOwner');
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
  requireTrustedOperator_('migrateG11EventAttachments');
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
  requireTrustedOperator_('migrateG21AuditRetention');
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
  requireTrustedOperator_('migrateG29VisitLogs');
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
  requireTrustedOperator_('migrateG17ReportRegistry');
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
  requireTrustedOperator_('migrateP1EventIdentity');
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
  var defaultPassword = 'SRRT-' + (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g,'').substring(0,24);
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

// GS-S3: versioned salted password hashing, encoded with an explicit KDF scheme.
// Before deploying, benchmark real Apps Script HMAC latency and execution limits.
var PASSWORD_KDF_ROUNDS_ = 12000;
var PASSWORD_HASH_PREFIX_ = 'pbkdf2-sha256';
function passwordBytesToHex_(bytes) {
  return bytes.map(function(b) {var h=(b<0?b+256:b).toString(16);return h.length===1?'0'+h:h;}).join('');
}
function passwordHexToBytes_(hex) {
  var out=[];
  for(var i=0;i<hex.length;i+=2){var b=parseInt(hex.slice(i,i+2),16);out.push(b>127?b-256:b);}
  return out;
}
function passwordConstantEqual_(a,b) {
  a=String(a||'');b=String(b||'');
  var delta=a.length^b.length;
  for(var i=0;i<Math.max(a.length,b.length);i++) delta|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return delta===0;
}
function legacyPasswordHash_(plain) {
  return passwordBytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    String(plain),Utilities.Charset.UTF_8));
}
function passwordKdf_(plain,saltHex,rounds) {
  var key=Utilities.newBlob(String(plain),'text/plain').getBytes();
  var input=passwordHexToBytes_(saltHex).concat([0,0,0,1]);
  var u=Utilities.computeHmacSha256Signature(input,key);
  var derived=u.map(function(b){return b&255;});
  for(var n=1;n<rounds;n++){
    u=Utilities.computeHmacSha256Signature(u,key);
    for(var j=0;j<derived.length;j++)derived[j]^=u[j]&255;
  }
  return passwordBytesToHex_(derived);
}
function hashPassword_(plain) {
  var salt=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'').toLowerCase();
  return PASSWORD_HASH_PREFIX_+'$'+PASSWORD_KDF_ROUNDS_+'$'+salt+'$'+
    passwordKdf_(plain,salt,PASSWORD_KDF_ROUNDS_);
}
function verifyPassword_(plain,stored) {
  stored=String(stored||'');
  if(/^[0-9a-f]{64}$/.test(stored)){
    return {ok:passwordConstantEqual_(stored,legacyPasswordHash_(plain)),legacy:true};
  }
  var match=/^pbkdf2-sha256\$(\d{4,6})\$([0-9a-f]{64})\$([0-9a-f]{64})$/.exec(stored);
  if(!match)return {ok:false,legacy:false};
  var rounds=Number(match[1]);
  if(!Number.isSafeInteger(rounds)||rounds<10000||rounds>120000)return {ok:false,legacy:false};
  return {ok:passwordConstantEqual_(match[3],passwordKdf_(plain,match[2],rounds)),legacy:false};
}
function validateNewPassword_(value) {
  if(typeof value!=='string'||value.length<12||value.length>128){
    throw new Error('รหัสผ่านใหม่ต้องมีความยาว 12-128 ตัวอักษร');
  }
}
function sessionCredentialTag_(hash) {
  return passwordBytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    String(hash||''),Utilities.Charset.UTF_8));
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

function makeSessionToken_(user) {
  // Opaque token with a server-side verifier tag for reset-based revocation.
  if(!user||!user.userId||!user.passwordHash)throw new Error('ไม่สามารถสร้างเซสชันได้');
  var token=Utilities.getUuid()+'.'+Utilities.getUuid();
  var session=JSON.stringify({v:2,id:String(user.userId),tag:sessionCredentialTag_(user.passwordHash)});
  CacheService.getScriptCache().put('srrt_session_'+token,session,21600);
  return token;
}

