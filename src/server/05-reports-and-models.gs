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
  var aiAnalysis = analyzeWithGemini_(rowData, locationInfo, settings, reportMeta);

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

function recordSuccessfulGeminiModel_(reportMeta, modelInfo) {
  if (!reportMeta || !modelInfo) return;
  if (!reportMeta.models) reportMeta.models = [];
  if (!reportMeta.apiVersions) reportMeta.apiVersions = [];

  var modelName = String(modelInfo.modelName || '').trim();
  var apiVersion = String(modelInfo.apiVersion || '').trim();
  if (modelName && reportMeta.models.indexOf(modelName) < 0) reportMeta.models.push(modelName);
  if (apiVersion && reportMeta.apiVersions.indexOf(apiVersion) < 0) reportMeta.apiVersions.push(apiVersion);
}

function analyzeWithGemini_(rowData, locationInfo, settings, reportMeta) {
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
  var part1 = callGeminiForReport_(apiKey, modelInfo, promptPart1, 'หัวข้อ 1-3', reportMeta);
  if (String(part1 || '').indexOf('🚨') === 0) {
    throw new Error(String(part1).replace(/^🚨\s*/, ''));
  }

  // Synchronous UrlFetchApp.fetch cannot be interrupted; avoid STARTING part 2
  // if the first call has already consumed the safe request budget.
  if (Date.now() - startedAt > 120000) {
    throw new Error('Gemini 3.8 Flash ตอบช้าเกินไป ระบบยุติก่อนเริ่มส่วนที่สองเพื่อเลี่ยง Apps Script Timeout กรุณาลองใหม่ภายหลัง');
  }

  var part2 = callGeminiForReport_(apiKey, modelInfo, promptPart2, 'หัวข้อ 4-6', reportMeta);
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
