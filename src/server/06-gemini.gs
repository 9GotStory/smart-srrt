function analyzeWithGemini_(rowData, locationInfo, settings) {
  settings = settings || getSettingsMap_();
  var apiKey = String(settings.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า Gemini API Key กรุณาใส่ในหน้า Admin ก่อนสร้างรายงาน AI');
  }

  var modelInfo = resolveGeminiModelInfo_(apiKey, settings, false);
  if (!modelInfo || !modelInfo.modelName) {
    throw new Error('ไม่พบโมเดล Gemini ที่รองรับ generateContent สำหรับ API Key นี้ กรุณาตรวจสอบ API Key, Gemini API และ Quota/Billing แล้ว Run testGeminiConnection() อีกครั้ง');
  }

  Logger.log('AI Reporter split mode: start');
  Logger.log('AI Reporter API Version: ' + modelInfo.apiVersion);
  Logger.log('AI Reporter Model: ' + modelInfo.modelName);

  var promptPart1 = buildReportPromptPart_(rowData, locationInfo, '1-3');
  var promptPart2 = buildReportPromptPart_(rowData, locationInfo, '4-6');

  var part1 = callGeminiForReport_(apiKey, modelInfo, promptPart1, 'หัวข้อ 1-3');
  if (!part1 || !part1.text) throw new Error('Gemini ไม่สามารถสร้างหัวข้อ 1-3 ได้');

  Utilities.sleep(500);

  var part2 = callGeminiForReport_(apiKey, modelInfo, promptPart2, 'หัวข้อ 4-6');
  if (!part2 || !part2.text) throw new Error('Gemini ไม่สามารถสร้างหัวข้อ 4-6 ได้');

  var finalText = String(part1.text || '').trim() + '\n\n' + String(part2.text || '').trim();
  var models = [part1.modelName, part2.modelName].filter(function(v,i,a){ return v && a.indexOf(v) === i; });
  var apiVersions = [part1.apiVersion, part2.apiVersion].filter(function(v,i,a){ return v && a.indexOf(v) === i; });

  Logger.log('AI Reporter part1 length: ' + String(part1.text || '').length);
  Logger.log('AI Reporter part2 length: ' + String(part2.text || '').length);
  Logger.log('AI Reporter final length: ' + finalText.length);

  return {
    text:finalText.replace(/\*/g, '').replace(/\x60\x60\x60/g, '').trim(),
    models:models,
    apiVersions:apiVersions
  };
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
function getGeminiRetryModelQueue_(apiKey, primaryModelInfo) {
  var queue = [];
  var seen = {};

  function add(info) {
    if (!info || !info.modelName || !info.apiVersion) return;
    if (String(info.modelName).indexOf('gemini-1.5') !== -1) return;

    var key = info.apiVersion + '|' + info.modelName;
    if (seen[key]) return;

    seen[key] = true;
    queue.push({
      modelName: info.modelName,
      apiVersion: info.apiVersion
    });
  }

  add(primaryModelInfo);

  var preferred = [
    'models/gemini-3.8-flash',
    'models/gemini-3.7-flash',
    'models/gemini-3.6-flash',
    'models/gemini-3.5-flash',
    'models/gemini-3.5-flash-lite',
    'models/gemini-3.1-flash-lite',
    'models/gemini-pro'
  ];

  for (var i = 0; i < preferred.length; i++) {
    var info = findGeminiModelInList_(apiKey, preferred[i]);
    if (info) add(info);
  }

  if (queue.length === 0 && primaryModelInfo) {
    add(primaryModelInfo);
  }

  Logger.log('Gemini retry queue: ' + queue.map(function(x) {
    return x.apiVersion + '/' + x.modelName;
  }).join(' -> '));

  return queue;
}

function callGeminiForReport_(apiKey, modelInfo, promptText, label) {
  var attempts = getGeminiRetryModelQueue_(apiKey, modelInfo);
  var lastErrorText = '';

  for (var attempt = 0; attempt < attempts.length; attempt++) {
    var currentModelInfo = attempts[attempt];

    var apiUrl = 'https://generativelanguage.googleapis.com/' +
      currentModelInfo.apiVersion + '/' +
      currentModelInfo.modelName +
      ':generateContent?key=' + encodeURIComponent(apiKey);

    var payload = {
      contents: [
        {
          parts: [
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 12000
      }
    };

    try {
      var response = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var statusCode = response.getResponseCode();
      var responseText = response.getContentText();
      var json = JSON.parse(responseText);

      Logger.log('AI Reporter ' + label + ' attempt: ' + (attempt + 1));
      Logger.log('AI Reporter ' + label + ' API Version: ' + currentModelInfo.apiVersion);
      Logger.log('AI Reporter ' + label + ' Model: ' + currentModelInfo.modelName);
      Logger.log('AI Reporter ' + label + ' status: ' + statusCode);

      if (statusCode >= 200 && statusCode < 300) {
        if (
          json.candidates &&
          json.candidates.length > 0 &&
          json.candidates[0].content &&
          json.candidates[0].content.parts &&
          json.candidates[0].content.parts.length > 0
        ) {
          var finishReason = json.candidates[0].finishReason || '';

          var text = json.candidates[0].content.parts.map(function(p) {
            return p.text || '';
          }).join('\n');

          text = String(text || '')
            .replace(/\*/g, '')
            .replace(/```/g, '')
            .trim();

          Logger.log('AI Reporter ' + label + ' finishReason: ' + finishReason);
          Logger.log('AI Reporter ' + label + ' output length: ' + text.length);

          CacheService.getScriptCache().put('GEMINI_AVAILABLE_MODEL', currentModelInfo.modelName, 21600);
          CacheService.getScriptCache().put('GEMINI_AVAILABLE_ENDPOINT', currentModelInfo.apiVersion, 21600);

          if (finishReason === 'MAX_TOKENS') {
            text += '\n\nหมายเหตุ: ระบบ AI สร้างเนื้อหา' + label + 'ถึงขีดจำกัดความยาวของโมเดล ข้อความส่วนนี้อาจยังไม่สมบูรณ์';
          }

          return {text:text, modelName:currentModelInfo.modelName, apiVersion:currentModelInfo.apiVersion};
        }

        throw new Error('Gemini ตอบกลับสำเร็จ แต่ไม่พบข้อความรายงานใน candidates (' + label + ')');
      }

      var errorMessage = json && json.error && json.error.message
        ? json.error.message
        : responseText;

      lastErrorText =
        'Google AI (' + statusCode + ') ขณะสร้าง' + label + ': ' + errorMessage +
        '\nAPI Version: ' + currentModelInfo.apiVersion +
        '\nModel: ' + currentModelInfo.modelName;

      if (
        statusCode === 404 ||
        statusCode === 410 ||
        statusCode === 429 ||
        statusCode === 500 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 504
      ) {
        Logger.log('Gemini model/API error, fallback to next model: ' + lastErrorText);
        clearGeminiModelCache_();
        Utilities.sleep(800 * (attempt + 1));
        continue;
      }

      clearGeminiModelCache_();

      throw new Error('พบปัญหาจาก ' + lastErrorText + ' | ตรวจว่า Gemini Model เป็น AUTO และทดสอบการเชื่อมต่ออีกครั้ง');

    } catch (error) {
      lastErrorText = 'Apps Script error ขณะเรียก Gemini API (' + label + '): ' + error.toString();
      Logger.log(lastErrorText);
      clearGeminiModelCache_();
      Utilities.sleep(800 * (attempt + 1));
    }
  }

  throw new Error('พบปัญหาจาก Google AI หลังจากลองหลายโมเดลแล้ว: ' + lastErrorText);
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
  var eventType = safePromptValue_(rowData[6] || 'ไม่ระบุ');
  var location = safePromptValue_(locationInfo);
  var onsetDate = safePromptValue_(rowData[8]);
  var criteria = safePromptValue_(rowData[16]);
  var recordedRisk = safePromptValue_(rowData[18] || 'ไม่ระบุ');
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
- ประเภทเหตุการณ์ที่บันทึกในระบบ: ${eventType}
- สถานที่เกิดเหตุ: ${location}
- วันที่เริ่มป่วย (Index case): ${onsetDate}
- การเข้าเกณฑ์สอบสวนโรคที่ทีมบันทึก: ${criteria}
- ระดับความเสี่ยงที่ทีมบันทึก: ${recordedRisk}
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
8. AI ทำหน้าที่ช่วยร่างและเรียบเรียงรายงานเท่านั้น ห้ามแก้ไข ตัดสินใหม่ หรือยกระดับ "การเข้าเกณฑ์สอบสวนโรค", "ประเภทเหตุการณ์" หรือ "ระดับความเสี่ยง" ที่ทีม SRRT บันทึกไว้
9. หากข้อมูลดิบไม่ได้ระบุการจำแนกหรือระดับความเสี่ยง ให้ระบุว่า "ยังไม่ได้บันทึกในระบบ" ห้ามอนุมานหรือฟันธงแทนผู้สอบสวน

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
- หากข้อมูลไม่ชัดเจน ให้ระบุว่า "ข้อมูลไม่ปรากฏในข้อมูลดิบ" หรือ "อยู่ระหว่างสอบสวนโรค" โดยห้ามยกระดับหรือลดระดับความเสี่ยงเอง
- ให้รายงานระดับความเสี่ยงตามค่าที่ทีม SRRT บันทึกไว้เท่านั้น คือ "${recordedRisk}" หากยังไม่บันทึก ให้ระบุว่า "ยังไม่ได้บันทึกระดับความเสี่ยงในระบบ"
- หากพบข้อมูลกลุ่มเสี่ยงพิเศษ ให้สรุปข้อเท็จจริงและผลกระทบที่ปรากฏในข้อมูลดิบ แต่ห้ามใช้ข้อมูลดังกล่าวเพื่อเปลี่ยนระดับความเสี่ยงแทนทีมสอบสวน

5. สรุปความสำคัญทางสาธารณสุข และความเร่งด่วน
เขียนสรุปเป็นความเรียงเชิงบริหาร (Executive Summary) ที่กระชับและตรงประเด็น โดยต้องครอบคลุมเนื้อหาดังนี้:
- ขนาดของปัญหาและผลกระทบโดยตรงต่อสุขภาพของประชาชนในพื้นที่
- ระบุ "ประเภทเหตุการณ์ที่บันทึกในระบบ" คือ "${eventType}" และ "การเข้าเกณฑ์สอบสวนโรคที่ทีมบันทึก" คือ "${criteria}" โดยห้ามเปลี่ยนหรือฟันธงการจำแนกใหม่เอง
- อธิบายความเร่งด่วนโดยอ้างอิงระดับความเสี่ยงที่ทีมบันทึก คือ "${recordedRisk}" หากยังไม่บันทึก ให้ระบุข้อจำกัดและไม่กำหนดระดับแทน
- กล่าวถึงผลกระทบเชิงเศรษฐกิจ การท่องเที่ยว และสังคมเฉพาะเมื่อมีข้อมูลรองรับ หากไม่มีให้ระบุว่า "ข้อมูลผลกระทบเชิงวงกว้างไม่ปรากฏในข้อมูลดิบ"
- ต้องเขียนให้เหมาะกับการเสนอผู้บริหารอำเภอ/จังหวัด โดยแยกข้อเท็จจริงที่บันทึกแล้วออกจากข้อเสนอเชิงปฏิบัติให้ชัดเจน

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