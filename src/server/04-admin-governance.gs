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
    templateDocId: settings.TEMPLATE_DOC_ID || '',
    logoFileId: settings.LOGO_FILE_ID || '',
    attachmentFolderId: settings.ATTACHMENT_FOLDER_ID || '',
    attachments: Math.max(getSheet_(CONFIG.SHEETS.ATTACHMENTS).getLastRow() - 1, 0),
    reports: Math.max(getSheet_(CONFIG.SHEETS.REPORTS).getLastRow() - 1, 0),
    areas: Math.max(getSheet_(CONFIG.SHEETS.AREAS).getLastRow() - 1, 0),
    events: Math.max(getSheet_(CONFIG.SHEETS.MAIN).getLastRow() - 1, 0)
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
  var sheet = getSheet_(CONFIG.SHEETS.CONTENT);
  if (!item.id) {
    item.id = Utilities.getUuid();
    sheet.appendRow([item.id, item.category, item.title, item.description, item.url, item.fileId, item.status || 'draft', item.sort || 999, new Date(), new Date(), user.email]);
    writeAudit_(user, 'CREATE_CONTENT', CONFIG.SHEETS.CONTENT, item.id, '', JSON.stringify(item));
    return 'เพิ่มข้อมูลเนื้อหาเรียบร้อยแล้ว';
  }
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (values[i][0] === item.id) {
      var before = JSON.stringify(values[i]);
      sheet.getRange(i+1,2,1,10).setValues([[item.category,item.title,item.description,item.url,item.fileId,item.status,item.sort || 999,values[i][8] || new Date(),new Date(),user.email]]);
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
  var blockedKeys = ['DATABASE_SPREADSHEET_ID','MAIN_SHEET_ID','SYSTEM_FOLDER_ID','LOGO_FOLDER_ID','LOGO_FILE_ID','INSTALL_VERSION','SCHEMA_VERSION'];
  settingsArray.forEach(function(s) {
    if (!s.key || blockedKeys.indexOf(String(s.key)) >= 0) return;
    upsertSettingAsUser_(sheet, String(s.key), s.value, s.description || '', user.email);
  });
  writeAudit_(user, 'UPDATE_SETTINGS', CONFIG.SHEETS.SETTINGS, 'web-admin', '', JSON.stringify(settingsArray.map(function(s){return s.key;})));
  return 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว';
}

function listAuditLogs(sessionToken, limit) {
  requireAuth_(sessionToken, 'audit');
  var rows = getSheet_(CONFIG.SHEETS.AUDIT).getDataRange().getDisplayValues().slice(1).reverse();
  return rows.slice(0, Number(limit || 100)).map(function(r){return {timestamp:r[0], email:r[1], role:r[2], action:r[3], targetSheet:r[4], targetId:r[5], before:r[6], after:r[7]};});
}

function archiveAuditLogs(sessionToken, olderThanDays) {
  var user = requireAuth_(sessionToken, 'audit');
  var days = Number(olderThanDays || 365);
  if (!isFinite(days) || days < 30 || days > 3650) throw new Error('กำหนดช่วงจัดเก็บ Audit ได้ตั้งแต่ 30 ถึง 3650 วัน');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = getDb_();
    var active = getSheet_(CONFIG.SHEETS.AUDIT);
    var archive = ensureSheet_(ss, CONFIG.SHEETS.AUDIT_ARCHIVE, ['Timestamp','UserEmail','Role','Action','TargetSheet','TargetId','Before','After','IpHint','ArchivedAt']);
    var rows = active.getDataRange().getValues();
    var cutoff = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
    var candidates = [];

    for (var i=1; i<rows.length; i++) {
      var timestamp = rows[i][0];
      if (timestamp instanceof Date && !isNaN(timestamp.getTime()) && timestamp < cutoff) {
        candidates.push({rowNumber:i+1,values:rows[i]});
      }
    }
    if (!candidates.length) return 'ไม่มี Audit Logs ที่เก่ากว่า ' + days + ' วัน';

    var archivedAt = new Date();
    var output = candidates.map(function(item){ return item.values.concat([archivedAt]); });
    archive.getRange(archive.getLastRow()+1, 1, output.length, 10).setValues(output);
    SpreadsheetApp.flush();

    for (var j=candidates.length-1; j>=0; j--) active.deleteRow(candidates[j].rowNumber);
    writeAudit_(user, 'ARCHIVE_AUDIT_LOGS', CONFIG.SHEETS.AUDIT_ARCHIVE, String(output.length), '', JSON.stringify({olderThanDays:days,count:output.length}));
    return 'จัดเก็บ Audit Logs ไป Archive แล้ว ' + output.length + ' รายการ';
  } finally {
    lock.releaseLock();
  }
}

function isAllowedAttachmentMime_(mimeType) {
  return [
    'application/pdf',
    'image/png','image/jpeg','image/webp',
    'text/plain','text/csv',
    'application/msword','application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ].indexOf(String(mimeType || '').toLowerCase()) >= 0;
}

function getAttachmentFolder_() {
  var settings = getSettingsMap_();
  try {
    return DriveApp.getFolderById(String(settings.ATTACHMENT_FOLDER_ID || ''));
  } catch (e) {
    var assets = ensureSystemAssets_(getDb_());
    var sheet = getSheet_(CONFIG.SHEETS.SETTINGS);
    upsertSettingDirect_(sheet, 'ATTACHMENT_FOLDER_ID', assets.attachmentFolderId, 'โฟลเดอร์เก็บไฟล์แนบเหตุการณ์', true);
    return DriveApp.getFolderById(assets.attachmentFolderId);
  }
}

function listEventAttachments(sessionToken, eventId) {
  requireAuth_(sessionToken, 'view');
  var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(main, eventId, true);
  return getSheet_(CONFIG.SHEETS.ATTACHMENTS).getDataRange().getDisplayValues().slice(1).filter(function(r) {
    return String(r[1]) === String(eventId) && String(r[7]).toLowerCase() !== 'false';
  }).map(function(r) {
    return {attachmentId:r[0],eventId:r[1],fileId:r[2],fileName:r[3],mimeType:r[4],sizeBytes:Number(r[5] || 0),url:r[6],uploadedAt:r[8],uploadedBy:r[9]};
  });
}

function uploadEventAttachment(sessionToken, eventId, payload) {
  var user = requireAuth_(sessionToken, 'edit');
  var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(main, eventId, false);
  payload = payload || {};
  var mimeType = String(payload.mimeType || '').toLowerCase();
  if (!isAllowedAttachmentMime_(mimeType)) throw new Error('ชนิดไฟล์แนบไม่รองรับ');

  var bytes;
  try { bytes = Utilities.base64Decode(String(payload.base64 || '')); }
  catch (e) { throw new Error('ข้อมูลไฟล์แนบไม่ถูกต้อง'); }
  if (!bytes.length) throw new Error('ไม่พบข้อมูลไฟล์แนบ');
  if (bytes.length > CONFIG.MAX_ATTACHMENT_BYTES) throw new Error('ไฟล์แนบต้องมีขนาดไม่เกิน 10 MB');

  var cleanName = String(payload.name || 'attachment').replace(/[^\wก-๙.\-() ]+/g,'_').trim() || 'attachment';
  var folder = getAttachmentFolder_();
  var file = folder.createFile(Utilities.newBlob(bytes, mimeType, new Date().getTime() + '_' + cleanName));
  var attachmentId = Utilities.getUuid();
  var url = file.getUrl();
  getSheet_(CONFIG.SHEETS.ATTACHMENTS).appendRow([
    attachmentId,eventId,file.getId(),cleanName,mimeType,bytes.length,url,true,new Date(),user.email,'',''
  ]);
  writeAudit_(user, 'UPLOAD_EVENT_ATTACHMENT', CONFIG.SHEETS.ATTACHMENTS, attachmentId, '', JSON.stringify({eventId:eventId,fileId:file.getId(),fileName:cleanName,sizeBytes:bytes.length}));
  return {attachmentId:attachmentId,fileName:cleanName,url:url,message:'อัปโหลดไฟล์แนบเรียบร้อยแล้ว'};
}

function disableEventAttachment(sessionToken, attachmentId) {
  var user = requireAuth_(sessionToken, 'edit');
  var sheet = getSheet_(CONFIG.SHEETS.ATTACHMENTS);
  var rows = sheet.getDataRange().getValues();
  for (var i=1; i<rows.length; i++) {
    if (String(rows[i][0]) === String(attachmentId)) {
      if (String(rows[i][7]).toLowerCase() === 'false') return 'ไฟล์แนบนี้ถูกปิดใช้งานอยู่แล้ว';
      sheet.getRange(i+1, 8).setValue(false);
      sheet.getRange(i+1, 11, 1, 2).setValues([[new Date(),user.email]]);
      writeAudit_(user, 'DISABLE_EVENT_ATTACHMENT', CONFIG.SHEETS.ATTACHMENTS, attachmentId, JSON.stringify(rows[i]), JSON.stringify({active:false}));
      return 'ปิดใช้งานไฟล์แนบเรียบร้อยแล้ว';
    }
  }
  throw new Error('ไม่พบไฟล์แนบ');
}

function writeAudit_(user, action, targetSheet, targetId, beforeValue, afterValue) {
  try {
    getSheet_(CONFIG.SHEETS.AUDIT).appendRow([new Date(), user.email || '', user.role || '', action, targetSheet, targetId, beforeValue, afterValue, '']);
  } catch(e) {}
}

function redactVisitParams_(params) {
  params = params || {};
  var safe = {};
  Object.keys(params).forEach(function(key) {
    var value = String(params[key] == null ? '' : params[key]);
    if (/token|password|secret|api.?key|session/i.test(String(key))) safe[key] = '[REDACTED]';
    else safe[key] = value.substring(0, 500);
  });
  return safe;
}

function logVisit_(e) {
  try {
    getSheet_(CONFIG.SHEETS.VISITS).appendRow([new Date(), 'doGet', JSON.stringify(redactVisitParams_(e && e.parameter ? e.parameter : {}))]);
  } catch(err) {}
}

