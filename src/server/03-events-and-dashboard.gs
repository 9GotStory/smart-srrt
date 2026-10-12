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
    var hasInvestigationDate = String(r.col26 || '').trim() !== '';

    byVillage[village] = (byVillage[village] || 0) + 1;
    byMonth[month] = (byMonth[month] || 0) + 1;
    byDiseaseGroup[diseaseGroup] = (byDiseaseGroup[diseaseGroup] || 0) + 1;
    byRisk[risk] = (byRisk[risk] || 0) + 1;
    byDisease[disease] = (byDisease[disease] || 0) + 1;

    if (meetsCriteria) {
      criteria++;
      if (hasInvestigationDate) investigated++;
      else pendingCriteria++;
    }
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
  // Investigation numerator and denominator MUST share the exact-criteria scope.
  // Never count a dated investigation of a nonqualifying event in this rate.
  var rate = criteria ? Math.round(investigated / criteria * 100) : 0;

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
  // Preserve P3 nonblocking consistency notices independently of G-04 warnings.
  if (investigationDecision === 'ลงสอบสวน' && !isInvestigationCriteriaMet_(criteria)) {
    add_('INVESTIGATION_FLAG_WITHOUT_CRITERIA', 'ระบุว่าลงสอบสวน แต่สถานะเข้าเกณฑ์สอบสวนโรคไม่ใช่ "เข้าเกณฑ์"');
  }
  if (String(event.col22 || '').trim() && !String(event.col21 || '').trim()) {
    add_('MEASURES_DATE_WITHOUT_DETAILS', 'มีวันที่ดำเนินมาตรการ แต่ยังไม่มีรายละเอียดการดำเนินการตามมาตรการ');
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
      // GS-S2: Never serialize the UserAccounts row into audit: index 3 is PasswordHash.
      // Preserve only minimal operational before-state needed for accountability.
      var auditBefore = {
        role:String(values[i][4] || ''),
        status:String(values[i][5] || '')
      };
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
      // GS-S2: An allowlisted change summary, NEVER raw patch/newPassword or row hash.
      var safeChangedFields = ['name','role','status','org','tambon','amphoe','province']
        .filter(function(key){ return Object.prototype.hasOwnProperty.call(patch, key); });
      var auditAfter = {
        changedFields:safeChangedFields,
        role:patch.role !== undefined ? String(patch.role) : auditBefore.role,
        status:patch.status !== undefined ? String(patch.status) : auditBefore.status,
        passwordChanged:!!patch.newPassword
      };
      writeAudit_(admin, 'UPDATE_USER', CONFIG.SHEETS.USERS, userId,
        JSON.stringify(auditBefore), JSON.stringify(auditAfter));
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

