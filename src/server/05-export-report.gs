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

function getReportReadinessWarnings_(event) {
  event = event || {};
  var warnings = getEventConsistencyWarnings_(event).slice();
  if (!String(event.col14 || '').trim()) warnings.push('ยังไม่มีรายละเอียดเหตุการณ์สำหรับใช้ร่างรายงาน');
  if (!String(event.col19 || '').trim()) warnings.push('ยังไม่ได้บันทึกการประเมินความเสี่ยงของทีมสอบสวน');
  return warnings.filter(function(value, index, arr){ return arr.indexOf(value) === index; });
}

function getReportReadiness(sessionToken, eventId) {
  requireAuth_(sessionToken, 'report');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var rowNumber = findEventRowById_(sheet, eventId, false);
  var row = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
  var event = rowToObject_(row);
  var settings = getSettingsMap_();
  var configWarnings = [];
  if (!String(settings.GEMINI_API_KEY || '').trim()) configWarnings.push('ยังไม่ได้ตั้งค่า Gemini API Key');
  if (!String(settings.TEMPLATE_DOC_ID || '').trim()) configWarnings.push('ยังไม่ได้ตั้งค่า Template Google Doc');
  if (!String(settings.REPORT_FOLDER_ID || '').trim()) configWarnings.push('ยังไม่ได้ตั้งค่าโฟลเดอร์รายงาน');
  return {
    eventId:event.eventId,
    revision:event.revision,
    warnings:getReportReadinessWarnings_(event),
    configurationWarnings:configWarnings,
    ready:configWarnings.length === 0 && getReportReadinessWarnings_(event).length === 0,
    canGenerate:configWarnings.length === 0
  };
}

function listReportsForEvent(sessionToken, eventId) {
  requireAuth_(sessionToken, 'view');
  var main = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(main, eventId, true);
  return getSheet_(CONFIG.SHEETS.REPORTS).getDataRange().getDisplayValues().slice(1).filter(function(r) {
    return String(r[1]) === String(eventId);
  }).map(function(r) {
    var warnings = [];
    try { warnings = r[10] ? JSON.parse(r[10]) : []; } catch (ignore) {}
    return {
      reportId:r[0],
      eventId:r[1],
      documentId:r[2],
      url:r[3],
      generatedAt:r[4],
      generatedBy:r[5],
      model:r[6],
      apiVersion:r[7],
      promptVersion:r[8],
      templateDocId:r[9],
      readinessWarnings:warnings,
      status:r[11] || 'generated'
    };
  }).sort(function(a,b){ return String(b.generatedAt).localeCompare(String(a.generatedAt)); });
}

function generateReportFromWeb(sessionToken, eventId, acknowledgeWarnings) {
  var user = requireAuth_(sessionToken, 'report');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  var settings = getSettingsMap_();
  var templateId = settings.TEMPLATE_DOC_ID;
  var folderId = settings.REPORT_FOLDER_ID;
  if (!templateId || !folderId) throw new Error('กรุณาตั้งค่า Template และโฟลเดอร์รายงานในหน้า Admin ก่อน');

  var rowNumber = findEventRowById_(sheet, eventId, false);
  var rowData = sheet.getRange(rowNumber, 1, 1, MAIN_SCHEMA_HEADERS.length).getDisplayValues()[0];
  var event = rowToObject_(rowData);
  var readinessWarnings = getReportReadinessWarnings_(event);
  if (readinessWarnings.length && acknowledgeWarnings !== true) {
    throw new Error('ข้อมูลสำหรับรายงานยังมีคำเตือน: ' + readinessWarnings.join(' | ') + ' กรุณาตรวจสอบหรือยืนยันการสร้างรายงานเบื้องต้น');
  }

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
  var aiResult = analyzeWithGemini_(rowData, locationInfo, settings);

  var newDocFile = DriveApp.getFileById(templateId).makeCopy(title, DriveApp.getFolderById(folderId));
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
    '<<ผลวิเคราะห์จากAI>>': aiResult.text
  };
  Object.keys(replacements).forEach(function(k) {
    if (k === '<<ผลวิเคราะห์จากAI>>') replacePlaceholderWithParagraphs_(body, k, replacements[k]);
    else body.replaceText(k, replacements[k]);
  });
  document.saveAndClose();

  var reportId = Utilities.getUuid();
  var modelLabel = (aiResult.models || []).join(',');
  var apiVersionLabel = (aiResult.apiVersions || []).join(',');
  getSheet_(CONFIG.SHEETS.REPORTS).appendRow([
    reportId,
    eventId,
    newDocFile.getId(),
    newDocFile.getUrl(),
    new Date(),
    user.email,
    modelLabel,
    apiVersionLabel,
    CONFIG.REPORT_PROMPT_VERSION,
    templateId,
    JSON.stringify(readinessWarnings),
    'generated'
  ]);
  writeAudit_(user, 'GENERATE_REPORT', CONFIG.SHEETS.REPORTS, reportId, '', JSON.stringify({eventId:eventId,documentId:newDocFile.getId(),model:modelLabel,promptVersion:CONFIG.REPORT_PROMPT_VERSION,warnings:readinessWarnings}));
  return {reportId:reportId,url:newDocFile.getUrl(),warnings:readinessWarnings,model:modelLabel,promptVersion:CONFIG.REPORT_PROMPT_VERSION};
}

