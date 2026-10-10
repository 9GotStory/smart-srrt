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

