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

var ALLOWED_MASTER_TYPES = ['surveillance','disease_group','event_type','verify_status','criteria','risk','content_category'];

function isAllowedMasterType_(type) {
  return ALLOWED_MASTER_TYPES.indexOf(String(type || '').trim()) >= 0;
}

function listMasterDataAdmin(sessionToken, type) {
  requireAuth_(sessionToken, 'master');
  var filterType = String(type || '').trim();
  if (filterType && !isAllowedMasterType_(filterType)) throw new Error('MasterData Type ไม่รองรับ');
  return getSheet_(CONFIG.SHEETS.MASTER).getDataRange().getValues().slice(1).map(function(r) {
    return {
      type:String(r[0] || ''),
      value:String(r[1] || ''),
      label:String(r[2] || ''),
      sort:Number(r[3] || 999),
      active:String(r[4]).toLowerCase() !== 'false',
      updatedAt:r[5] || '',
      updatedBy:String(r[6] || '')
    };
  }).filter(function(item){ return !filterType || item.type === filterType; });
}

function saveMasterDataItem(sessionToken, item) {
  var user = requireAuth_(sessionToken, 'master');
  item = item || {};
  var type = String(item.type || '').trim();
  var value = String(item.value || '').trim();
  var label = String(item.label || value).trim();
  var sort = Number(item.sort || 999);
  var active = item.active !== false;
  if (!isAllowedMasterType_(type)) throw new Error('MasterData Type ไม่รองรับ');
  if (!value) throw new Error('กรุณาระบุ Value ของ MasterData');
  if (!isFinite(sort) || sort < 0) sort = 999;

  var sheet = getSheet_(CONFIG.SHEETS.MASTER);
  var rows = sheet.getDataRange().getValues();
  for (var i=1; i<rows.length; i++) {
    if (String(rows[i][0]) === type && String(rows[i][1]) === value) {
      var before = JSON.stringify(rows[i]);
      sheet.getRange(i+1, 3, 1, 5).setValues([[label, sort, active, new Date(), user.email]]);
      writeAudit_(user, 'UPDATE_MASTER_DATA', CONFIG.SHEETS.MASTER, type + ':' + value, before, JSON.stringify(item));
      return 'อัปเดต MasterData เรียบร้อยแล้ว';
    }
  }
  sheet.appendRow([type,value,label,sort,active,new Date(),user.email]);
  writeAudit_(user, 'CREATE_MASTER_DATA', CONFIG.SHEETS.MASTER, type + ':' + value, '', JSON.stringify(item));
  return 'เพิ่ม MasterData เรียบร้อยแล้ว';
}

function disableMasterDataItem(sessionToken, type, value) {
  var user = requireAuth_(sessionToken, 'master');
  type = String(type || '').trim();
  value = String(value || '').trim();
  if (!isAllowedMasterType_(type) || !value) throw new Error('MasterData ไม่ถูกต้อง');
  var sheet = getSheet_(CONFIG.SHEETS.MASTER);
  var rows = sheet.getDataRange().getValues();
  for (var i=1; i<rows.length; i++) {
    if (String(rows[i][0]) === type && String(rows[i][1]) === value) {
      if (String(rows[i][4]).toLowerCase() === 'false') return 'MasterData นี้ปิดใช้งานอยู่แล้ว';
      sheet.getRange(i+1, 5, 1, 3).setValues([[false,new Date(),user.email]]);
      writeAudit_(user, 'DISABLE_MASTER_DATA', CONFIG.SHEETS.MASTER, type + ':' + value, JSON.stringify(rows[i]), JSON.stringify({active:false}));
      return 'ปิดใช้งาน MasterData เรียบร้อยแล้ว';
    }
  }
  throw new Error('ไม่พบ MasterData ที่ระบุ');
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

  var result = data.slice(1).map(function(row) {
    return rowToObject_(row);
  }).filter(function(r) {
    return r.col2 !== '' && String(r.recordStatus || 'active').toLowerCase() !== 'void';
  });

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

function isCriteriaMet_(value) {
  return String(value || '').trim() === 'เข้าเกณฑ์';
}

function isInvestigatedCriteriaEvent_(event) {
  return isCriteriaMet_(event && event.col17) && String((event && event.col26) || '').trim() !== '';
}

function countByGetter_(rows, getter) {
  var map = {};
  rows.forEach(function(r) {
    var key = String(getter(r) || '').trim() || 'ไม่ระบุ';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.keys(map).map(function(key) {
    return {name:key, value:map[key]};
  }).sort(function(a,b) {
    if (b.value !== a.value) return b.value - a.value;
    return String(a.name).localeCompare(String(b.name));
  });
}

function buildDashboardSummary_(rows) {
  rows = rows || [];
  var criteriaRows = rows.filter(function(r){ return isCriteriaMet_(r.col17); });
  var investigatedRows = criteriaRows.filter(isInvestigatedCriteriaEvent_);
  var pending = criteriaRows.length - investigatedRows.length;
  var rate = criteriaRows.length ? Math.round(investigatedRows.length / criteriaRows.length * 100) : 0;

  var byVillage = countByGetter_(rows, function(r) {
    if (r.col29) return 'บ้าน' + r.col29 + (r.col10 ? ' หมู่ ' + r.col10 : '');
    return r.col10 ? 'หมู่ ' + r.col10 : 'ไม่ระบุหมู่บ้าน';
  });
  var byMonth = countByGetter_(rows.filter(function(r){ return r.col2; }), function(r) {
    return String(r.col2).substring(0, 7);
  });
  var byDiseaseGroup = countByGetter_(rows, function(r){ return r.col5; });
  var byRisk = countByGetter_(rows, function(r){ return r.col19; });
  var byDisease = countByGetter_(rows, function(r){ return r.col6; });

  return {
    kpi: {
      events: rows.length,
      criteria: criteriaRows.length,
      investigated: investigatedRows.length,
      investigationRate: rate,
      pendingInvestigation: pending
    },
    charts: {
      byVillage: byVillage,
      byMonth: byMonth,
      byDiseaseGroup: byDiseaseGroup,
      byRisk: byRisk
    },
    insight: {
      topDisease: byDisease.length ? byDisease[0].name : 'ไม่ระบุ',
      topVillage: byVillage.length ? byVillage[0].name : 'ไม่ระบุ',
      pendingInvestigation: pending
    }
  };
}

function getDashboardData(filter) {
  // Public contract: aggregate-only. Never return Event-level rows from this RPC.
  return buildDashboardSummary_(getFilteredEventRows_(filter || {}));
}

function getEventData(sessionToken, filter) {
  requireAuth_(sessionToken, 'view');
  var rows = getFilteredEventRows_(filter || {});
  var users = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  var owners = {};
  users.forEach(function(r) {
    owners[String(r[0] || '')] = {name:String(r[1] || ''), email:String(r[2] || '')};
  });
  return rows.map(function(r) {
    var owner = owners[String(r.ownerUserId || '')] || null;
    r.ownerName = owner ? owner.name : '';
    r.ownerEmail = owner ? owner.email : '';
    return r;
  });
}

function getEventConsistencyWarnings_(event) {
  event = event || {};
  var warnings = [];
  var verify = String(event.col15 || '').trim();
  var criteria = String(event.col17 || '').trim();
  if (!verify || verify === 'รอตรวจสอบ') warnings.push('ยังไม่ได้ยืนยันผลการตรวจสอบเหตุการณ์');
  if (!criteria || criteria === 'รอดำเนินการ') warnings.push('ยังไม่ได้สรุปเกณฑ์สอบสวนโรค');
  if (isCriteriaMet_(criteria) && !String(event.col26 || '').trim()) {
    warnings.push('เหตุการณ์เข้าเกณฑ์แต่ยังไม่ได้ระบุวันที่ลงสอบสวนโรค');
  }
  return warnings;
}

function getEventCloseReadiness(sessionToken, eventId) {
  requireAuth_(sessionToken, 'edit');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var rowNumber = findEventRowById_(sheet, eventId, false);
  var row = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
  var event = rowToObject_(row);
  return {eventId:event.eventId, revision:event.revision, workflowStatus:event.workflowStatus, warnings:getEventConsistencyWarnings_(event)};
}

function assignEventOwner(sessionToken, eventId, ownerEmail, expectedRevision) {
  var user = requireAuth_(sessionToken, 'edit');
  var target = findUserByEmail_(String(ownerEmail || '').trim().toLowerCase());
  if (!target || target.status !== 'active') throw new Error('ไม่พบผู้รับผิดชอบที่ Active ตามอีเมลที่ระบุ');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var workflowStatus = String(sheet.getRange(rowNumber, WORKFLOW_META_COL.WORKFLOW_STATUS).getValue() || 'open').toLowerCase();
    if (workflowStatus === 'closed') throw new Error('เหตุการณ์นี้ปิดแล้ว กรุณาเปิดเหตุการณ์อีกครั้งก่อนมอบหมายผู้รับผิดชอบ');

    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    var expected = Number(expectedRevision);
    if (!expected || expected < 1 || Math.floor(expected) !== expected) throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนมอบหมายอีกครั้ง');
    if (expected !== currentRevision) throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนมอบหมายอีกครั้ง');

    var now = new Date();
    sheet.getRange(rowNumber, WORKFLOW_META_COL.OWNER_USER_ID).setValue(target.userId);
    sheet.getRange(rowNumber, WORKFLOW_META_COL.ASSIGNED_AT).setValue(now);
    sheet.getRange(rowNumber, WORKFLOW_META_COL.ASSIGNED_BY).setValue(user.email);
    if (workflowStatus === 'open') sheet.getRange(rowNumber, WORKFLOW_META_COL.WORKFLOW_STATUS).setValue('in_progress');
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    sheet.getRange(rowNumber, 27).setValue(user.email);
    sheet.getRange(rowNumber, 28).setValue(now);
    writeAudit_(user, 'ASSIGN_EVENT_OWNER', CONFIG.SHEETS.MAIN, eventId, '', JSON.stringify({ownerUserId:target.userId, ownerEmail:target.email}));
    return 'มอบหมายผู้รับผิดชอบเรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function closeEvent(sessionToken, eventId, expectedRevision, closeReason, overrideReason) {
  var user = requireAuth_(sessionToken, 'edit');
  var reason = String(closeReason || '').trim();
  var override = String(overrideReason || '').trim();
  if (!reason) throw new Error('กรุณาระบุเหตุผลหรือสรุปการปิดเหตุการณ์');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var row = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
    var event = rowToObject_(row);
    if (event.workflowStatus === 'closed') return 'เหตุการณ์นี้ปิดอยู่แล้ว';

    var expected = Number(expectedRevision);
    if (!expected || expected < 1 || Math.floor(expected) !== expected) throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนปิดอีกครั้ง');
    if (expected !== event.revision) throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนปิดอีกครั้ง');

    var warnings = getEventConsistencyWarnings_(event);
    if (warnings.length && !override) {
      throw new Error('ยังมีข้อมูลที่ควรตรวจสอบก่อนปิดเหตุการณ์: ' + warnings.join(' | ') + ' หากจำเป็นต้องปิด ให้ระบุเหตุผล Override');
    }

    var now = new Date();
    sheet.getRange(rowNumber, WORKFLOW_META_COL.WORKFLOW_STATUS).setValue('closed');
    sheet.getRange(rowNumber, WORKFLOW_META_COL.CLOSED_AT).setValue(now);
    sheet.getRange(rowNumber, WORKFLOW_META_COL.CLOSED_BY).setValue(user.email);
    sheet.getRange(rowNumber, WORKFLOW_META_COL.CLOSE_REASON).setValue(reason);
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(event.revision + 1);
    sheet.getRange(rowNumber, 27).setValue(user.email);
    sheet.getRange(rowNumber, 28).setValue(now);
    writeAudit_(user, 'CLOSE_EVENT', CONFIG.SHEETS.MAIN, eventId, '', JSON.stringify({closeReason:reason,warnings:warnings,overrideReason:override}));
    return 'ปิดเหตุการณ์เรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
}

function reopenEvent(sessionToken, eventId, expectedRevision, reopenReason) {
  var user = requireAuth_(sessionToken, 'edit');
  var reason = String(reopenReason || '').trim();
  if (!reason) throw new Error('กรุณาระบุเหตุผลในการเปิดเหตุการณ์อีกครั้ง');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
    var rowNumber = findEventRowById_(sheet, eventId, false);
    var row = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
    var event = rowToObject_(row);
    if (event.workflowStatus !== 'closed') throw new Error('เหตุการณ์นี้ไม่ได้อยู่ในสถานะปิด');

    var expected = Number(expectedRevision);
    if (!expected || expected < 1 || Math.floor(expected) !== expected) throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนเปิดอีกครั้ง');
    if (expected !== event.revision) throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนเปิดอีกครั้ง');

    var now = new Date();
    sheet.getRange(rowNumber, WORKFLOW_META_COL.WORKFLOW_STATUS).setValue('open');
    sheet.getRange(rowNumber, WORKFLOW_META_COL.CLOSED_AT, 1, 3).clearContent();
    sheet.getRange(rowNumber, WORKFLOW_META_COL.REOPENED_AT).setValue(now);
    sheet.getRange(rowNumber, WORKFLOW_META_COL.REOPENED_BY).setValue(user.email);
    sheet.getRange(rowNumber, WORKFLOW_META_COL.REOPEN_REASON).setValue(reason);
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(event.revision + 1);
    sheet.getRange(rowNumber, 27).setValue(user.email);
    sheet.getRange(rowNumber, 28).setValue(now);
    writeAudit_(user, 'REOPEN_EVENT', CONFIG.SHEETS.MAIN, eventId, '', JSON.stringify({reopenReason:reason}));
    return 'เปิดเหตุการณ์อีกครั้งเรียบร้อยแล้ว';
  } finally {
    lock.releaseLock();
  }
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
  obj.workflowStatus = meta.workflowStatus;
  obj.ownerUserId = meta.ownerUserId;
  obj.assignedAt = meta.assignedAt;
  obj.assignedBy = meta.assignedBy;
  obj.closedAt = meta.closedAt;
  obj.closedBy = meta.closedBy;
  obj.closeReason = meta.closeReason;
  obj.reopenedAt = meta.reopenedAt;
  obj.reopenedBy = meta.reopenedBy;
  obj.reopenReason = meta.reopenReason;
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

    sheet.getRange(newRow, 1).setValue(newRow - 1);
    saveRowData_(sheet, newRow, formData, user);
    sheet.getRange(newRow, EVENT_META_COL.EVENT_ID, 1, EVENT_META_HEADERS.length).setValues([[
      eventId, 1, 'active', now, user.email, '', '', ''
    ]]);
    sheet.getRange(newRow, WORKFLOW_META_COL.WORKFLOW_STATUS, 1, WORKFLOW_META_HEADERS.length).setValues([[
      'open', '', '', '', '', '', '', '', '', ''
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
    var before = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
    var workflowStatus = String(sheet.getRange(rowNumber, WORKFLOW_META_COL.WORKFLOW_STATUS).getValue() || 'open').toLowerCase();
    if (workflowStatus === 'closed') {
      throw new Error('เหตุการณ์นี้ปิดแล้ว กรุณาเปิดเหตุการณ์อีกครั้งก่อนแก้ไขข้อมูล');
    }
    var currentRevision = Number(sheet.getRange(rowNumber, EVENT_META_COL.REVISION).getValue() || 1);
    var expected = Number(expectedRevision);
    if (!expected || expected < 1 || Math.floor(expected) !== expected) {
      throw new Error('ไม่พบ Revision ของเหตุการณ์ กรุณารีเฟรชข้อมูลก่อนบันทึกอีกครั้ง');
    }
    if (expected !== currentRevision) {
      throw new Error('ข้อมูลเหตุการณ์ถูกแก้ไขจากผู้ใช้อื่นแล้ว กรุณารีเฟรชข้อมูลก่อนบันทึกอีกครั้ง');
    }

    saveRowData_(sheet, rowNumber, formData, user);
    sheet.getRange(rowNumber, EVENT_META_COL.REVISION).setValue(currentRevision + 1);
    writeAudit_(user, 'UPDATE_RECORD', CONFIG.SHEETS.MAIN, eventId, JSON.stringify(before), JSON.stringify(formData));
    return 'อัปเดตข้อมูลเรียบร้อยแล้ว';
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
  var summary = buildDashboardSummary_(data);
  var users = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues().slice(1);
  var logs = getSheet_(CONFIG.SHEETS.AUDIT).getDataRange().getValues().slice(1);
  return {
    kpi: {
      events: summary.kpi.events,
      criteria: summary.kpi.criteria,
      investigated: summary.kpi.investigated,
      investigationRate: summary.kpi.investigationRate,
      pendingInvestigation: summary.kpi.pendingInvestigation,
      users: users.length,
      activeUsers: users.filter(function(r){return r[5] === 'active';}).length,
      auditLogs: logs.length
    },
    byRisk: summary.charts.byRisk,
    byDisease: countBy_(data, 'col6'),
    byTambon: countBy_(data, 'col11'),
    byVillage: summary.charts.byVillage,
    user: publicUser_(user)
  };
}

function countBy_(arr, field) {
  var map = {};
  arr.forEach(function(r){ var k = r[field] || 'ไม่ระบุ'; map[k] = (map[k] || 0) + 1; });
  return Object.keys(map).map(function(k){ return {name:k, value:map[k]}; }).sort(function(a,b){return b.value-a.value;});
}

