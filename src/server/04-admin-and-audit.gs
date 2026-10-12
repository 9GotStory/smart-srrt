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

function auditArchiveRowMatches_(archived, original) {
  if (!archived || !original ||
      archived.length !== AUDIT_HEADERS.length || original.length !== AUDIT_HEADERS.length) return false;
  for (var i = 0; i < AUDIT_HEADERS.length; i++) {
    var a = archived[i];
    var b = original[i];
    var dateA = Object.prototype.toString.call(a) === '[object Date]';
    var dateB = Object.prototype.toString.call(b) === '[object Date]';
    if (dateA || dateB) {
      // Do not silently equate a Date cell with a textual timestamp.
      if (!dateA || !dateB || !isFinite(a.getTime()) || !isFinite(b.getTime()) ||
          a.getTime() !== b.getTime()) return false;
    } else if (a !== b) {
      return false;
    }
  }
  return true;
}

function getAuditArchiveIds_(sheet) {
  var out = Object.create(null);
  var count = Math.max(sheet.getLastRow() - 1, 0);
  if (!count) return out;
  var rows = sheet.getRange(2, 1, count, AUDIT_HEADERS.length).getValues();
  rows.forEach(function(row, i) {
    var id = String(row[AUDIT_COL.AUDIT_ID - 1] || '').trim();
    if (!isUuid_(id)) throw new Error('Audit archive มี AuditID ไม่ถูกต้องที่แถว ' + (i + 2));
    if (out[id]) throw new Error('Audit archive มี AuditID ซ้ำที่แถว ' + (i + 2));
    out[id] = row;
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
      var toAppend = byYear[yearKey].filter(function(c) {
        var existing = existingIds[c.auditId];
        if (existing && !auditArchiveRowMatches_(existing, c.row)) {
          throw new Error('Audit archive มี AuditID ตรงกันแต่ข้อมูลไม่ตรงกัน: ' + c.auditId);
        }
        return !existing;
      });
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
        if (!ids[c.auditId] || !auditArchiveRowMatches_(ids[c.auditId], c.row)) {
          throw new Error('Archive verification ข้อมูลไม่ตรงกับ AuditID ' + c.auditId);
        }
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

/**
 * GS-S2: Defense-in-depth protection against structured credentials in AuditLogs.
 * All values are passed through this helper before writing. Arbitrary unlabelled
 * natural-language secrets are not reliably detectable; callers must NEVER
 * pass password-bearing rows or unredacted objects to begin with.
 */
function redactAuditText_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|passwd|pwd|api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?token|authorization|secret)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s&,;}\]]+)/gi, '$1=[REDACTED]');
}

function sanitizeAuditPayload_(value, targetSheet) {
  var source = typeof value === 'string' ? value :
    (value === undefined || value === null ? '' : JSON.stringify(value));
  if (!source) return '';
  var parsed;
  try { parsed = JSON.parse(source); }
  catch(ignore) { return redactAuditText_(source); }
  if (!parsed || typeof parsed !== 'object') return redactAuditText_(source);

  // The old UserAccounts full-row audit form stores PasswordHash at index 3.
  // Mask that slot even if a future caller accidentally passes the old row again.
  if (String(targetSheet) === String(CONFIG.SHEETS.USERS) &&
      Array.isArray(parsed) && parsed.length >= 4) parsed[3] = '[REDACTED]';

  function scrub(item, depth) {
    if (depth > 12) return '[REDACTED]';
    if (Array.isArray(item)) return item.map(function(v){ return scrub(v, depth + 1); });
    if (item && typeof item === 'object') {
      var result = {};
      Object.keys(item).forEach(function(key) {
        result[key] = /password|passwd|pwd|passphrase|secret|token|credential|authorization|api[_-]?key|private[_-]?key|cookie/i.test(key)
          ? '[REDACTED]' : scrub(item[key], depth + 1);
      });
      return result;
    }
    return typeof item === 'string' ? redactAuditText_(item) : item;
  }
  return JSON.stringify(scrub(parsed, 0));
}

function writeAudit_(user, action, targetSheet, targetId, beforeValue, afterValue) {
  try {
    // Sanitize before touching the sheet; never fall back to writing unsafe raw input.
    var beforeSafe = sanitizeAuditPayload_(beforeValue, targetSheet);
    var afterSafe = sanitizeAuditPayload_(afterValue, targetSheet);
    getSheet_(CONFIG.SHEETS.AUDIT).appendRow([
      new Date(),
      user.email || '',
      user.role || '',
      action,
      targetSheet,
      targetId,
      beforeSafe,
      afterSafe,
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

