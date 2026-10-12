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

/**
 * Issue #66: One bounded, read-only authenticated summary for the visible Events.
 * Never writes report metadata to MainData and never repairs ReportRegistry on a read.
 * A corrupt matching row makes the summary unknown, not an authoritative zero.
 */
function getReportSummariesForEvents(sessionToken, eventIds) {
  requireAuth_(sessionToken, 'report');
  if (!Array.isArray(eventIds) || eventIds.length > 500) {
    throw new Error('รายการเหตุการณ์สำหรับสรุปรายงานไม่ถูกต้องหรือเกิน 500 รายการ กรุณากรองข้อมูลก่อน');
  }
  var requested = Object.create(null);
  eventIds.forEach(function(id) {
    var value = String(id || '').trim();
    if (!isUuid_(value)) throw new Error('EventID สำหรับสรุปรายงานไม่ถูกต้อง');
    requested[value] = true;
  });
  var ids = Object.keys(requested);
  if (!ids.length) return {summaries:{}};

  // Use the same non-void Event universe as the authenticated dashboard.
  var available = Object.create(null);
  getFilteredEventRows_({}).forEach(function(event) {
    available[String(event.eventId || '').trim()] = true;
  });
  ids.forEach(function(id) {
    if (!available[id]) throw new Error('ไม่พบเหตุการณ์หรือเหตุการณ์ถูกยกเลิก กรุณารีเฟรช');
  });

  var registry = getDb_().getSheetByName(CONFIG.SHEETS.REPORTS);
  if (!registry || registry.getLastRow() < 1 ||
      registry.getLastColumn() < REPORT_REGISTRY_HEADERS.length) {
    throw new Error('ยังไม่มีทะเบียน ReportRegistry ที่พร้อมใช้งาน กรุณาดำเนินการ migration G-17 ก่อน');
  }
  var headers = registry.getRange(1, 1, 1, REPORT_REGISTRY_HEADERS.length).getDisplayValues()[0];
  REPORT_REGISTRY_HEADERS.forEach(function(expected, index) {
    if (String(headers[index] || '').trim() !== expected) {
      throw new Error('หัวข้อ ReportRegistry ไม่ตรงกับ schema v7 ที่คอลัมน์ ' + (index + 1));
    }
  });

  var summaries = Object.create(null);
  var visited = Object.create(null);
  ids.forEach(function(id) {
    summaries[id] = {count:0, latestSourceRevision:0, invalidCount:0};
    visited[id] = Object.create(null);
  });
  var latest = Object.create(null);
  var rows = registry.getLastRow() > 1
    ? registry.getRange(2, 1, registry.getLastRow() - 1, REPORT_REGISTRY_HEADERS.length).getValues()
    : [];
  rows.forEach(function(row, index) {
    var eventId = String(row[REPORT_REGISTRY_COL.EVENT_ID - 1] || '').trim();
    if (!Object.prototype.hasOwnProperty.call(requested, eventId)) return;
    var reportId = String(row[REPORT_REGISTRY_COL.REPORT_ID - 1] || '').trim();
    var docId = String(row[REPORT_REGISTRY_COL.DOCUMENT_ID - 1] || '').trim();
    if (!isUuid_(reportId) || !docId ||
        Object.prototype.hasOwnProperty.call(visited[eventId], reportId)) {
      summaries[eventId].invalidCount++;
      return;
    }
    visited[eventId][reportId] = true;
    summaries[eventId].count++;
    var sourceRevision = Number(row[REPORT_REGISTRY_COL.SOURCE_REVISION - 1]);
    if (!Number.isSafeInteger(sourceRevision) || sourceRevision < 1) {
      summaries[eventId].invalidCount++;
      return;
    }
    var rawDate = row[REPORT_REGISTRY_COL.GENERATED_AT - 1];
    var millis = rawDate instanceof Date && !isNaN(rawDate.getTime()) ? rawDate.getTime() : NaN;
    var validDate = isFinite(millis);
    var old = latest[eventId];
    if (!old || (validDate && !old.validDate) ||
        (validDate === old.validDate && (!validDate || millis >= old.millis))) {
      latest[eventId] = {validDate:validDate, millis:millis, revision:sourceRevision, index:index};
      summaries[eventId].latestSourceRevision = sourceRevision;
    }
  });
  ids.forEach(function(id) {
    if (summaries[id].invalidCount) {
      throw new Error('พบข้อมูลทะเบียนรายงานไม่สมบูรณ์ กรุณาตรวจสอบก่อนสร้างรายงานใหม่');
    }
  });
  return {summaries:summaries};
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
  // G-32 intentionally fails closed for stale V4 pages and direct RPC bypass.
  // The private execution nonce is minted only by runReportJob, not returned to the UI.
  var reportJobId = arguments.length > 2 ? arguments[2] : '';
  var executionNonce = arguments.length > 3 ? arguments[3] : '';
  if (!reportJobId || !executionNonce) {
    throw new Error('กรุณารีเฟรชหน้า Smart SRRT เพื่อสร้างรายงานด้วยระบบงาน G-32');
  }
  withReportJobLock_(function(props) {
    var authorizedJob = reportJobOwned_(props,reportJobId,user);
    if (authorizedJob.eventId !== String(eventId || '').trim() ||
        authorizedJob.status !== 'running' ||
        authorizedJob.executionNonce !== executionNonce) {
      throw new Error('ไม่สามารถใช้สิทธิ์คำขอรายงานนี้ซ้ำหรือข้ามขั้นตอน');
    }
  });
  reportJobCheckpoint_(reportJobId, 'preparing');
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
  var aiAnalysis = analyzeWithGemini_(rowData, locationInfo, settings, reportMeta, reportJobId);
  // Atomic finalization boundary: a cancel request after this point is too late
  // and must not be represented to the user as successfully cancelled.
  reportJobCheckpoint_(reportJobId, 'finalizing');

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

    // Once ReportRegistry is committed, the report is durable. An audit
    // transport failure cannot truthfully turn an already-created Doc into
    // "generation failed" and invite a duplicate retry.
    try {
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
    } catch (auditError) {
      Logger.log('G-32 WARNING: ReportRegistry committed but report audit logging failed; investigate using ReportID=' + reportId);
    }

    return newDocFile.getUrl();
  } catch (error) {
    if (newDocFile && !registered) {
      try { newDocFile.setTrashed(true); } catch (ignoreTrash) {}
    }
    throw error;
  }
}

// G-32: Cooperative cancellation and recoverable report-job metadata.
// PropertiesService stores small status records, not prompts, patient narratives,
// access tokens, API keys or other sensitive event content.
var REPORT_JOB_PREFIX_ = 'SRRT_G32_JOB_';
var REPORT_JOB_ACTIVE_KEY_ = 'SRRT_G32_ACTIVE';
var REPORT_JOB_TTL_MS_ = 24 * 60 * 60 * 1000;
var REPORT_JOB_STALE_MS_ = 8 * 60 * 1000;

function withReportJobLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('ระบบรายงานกำลังจัดการคำขอ กรุณาลองใหม่');
  try { return fn(PropertiesService.getScriptProperties()); }
  finally { lock.releaseLock(); }
}

function readReportJob_(props, jobId) {
  if (!isUuid_(String(jobId || ''))) throw new Error('Report Job ID ไม่ถูกต้อง');
  var raw = props.getProperty(REPORT_JOB_PREFIX_ + jobId);
  if (!raw) throw new Error('ไม่พบคำขอสร้างรายงาน หรือข้อมูลหมดอายุแล้ว');
  return JSON.parse(raw);
}
function saveReportJob_(props, job) {
  job.updatedAt = Date.now();
  props.setProperty(REPORT_JOB_PREFIX_ + job.id, JSON.stringify(job));
}
function reportJobTerminal_(status) {
  return ['cancelled','completed','failed','unknown'].indexOf(status) !== -1;
}
function releaseReportJobSlot_(props, jobId) {
  if (props.getProperty(REPORT_JOB_ACTIVE_KEY_) === jobId) props.deleteProperty(REPORT_JOB_ACTIVE_KEY_);
}
function expireStaleReportJob_(props, job) {
  if (!reportJobTerminal_(job.status) &&
      Date.now() - Number(job.createdAt || 0) > REPORT_JOB_STALE_MS_) {
    job.status = 'unknown';
    job.stage = 'unknown';
    job.message = 'ไม่สามารถยืนยันสถานะการทำงานหลังหมดเวลารอ กรุณาตรวจประวัติรายงานก่อนเริ่มใหม่';
    saveReportJob_(props, job);
    releaseReportJobSlot_(props, job.id);
  }
  return job;
}
function reportJobOwned_(props, jobId, user) {
  // Check ownership BEFORE any stale-state cleanup, so a foreign user cannot
  // mutate another owner's status or release the global job slot.
  var job = readReportJob_(props, jobId);
  if (String(job.ownerId) !== String(user.userId)) {
    throw new Error('ไม่มีสิทธิ์ดูหรือจัดการคำขอรายงานนี้');
  }
  return expireStaleReportJob_(props, job);
}
function publicReportJob_(job) {
  return {
    id:job.id,eventId:job.eventId,status:job.status,stage:job.stage,
    createdAt:job.createdAt,updatedAt:job.updatedAt,
    message:job.message || '', documentUrl:job.status === 'completed' ? (job.documentUrl || '') : ''
  };
}
function cleanupOldReportJobs_(props) {
  var all = props.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf(REPORT_JOB_PREFIX_) !== 0) return;
    try {
      var job = JSON.parse(all[key]);
      if (Date.now() - Number(job.createdAt || 0) > REPORT_JOB_TTL_MS_) props.deleteProperty(key);
    } catch(ignore) { props.deleteProperty(key); }
  });
  Object.keys(all).forEach(function(key) {
    if (key.indexOf('SRRT_G32_USER_') !== 0) return;
    if (!props.getProperty(REPORT_JOB_PREFIX_ + all[key])) props.deleteProperty(key);
  });
}
// GS-S4: An explicit, server-issued, one-use regeneration capability.
// Only an authenticated report operator can request it after selecting the
// history confirmation flow. It binds the current registry snapshot to the
// owner/Event and expires quickly; a browser-supplied boolean is never enough.
var REPORT_REGEN_CONSENT_PREFIX_ = 'SRRT_GS4_REGEN_';
var REPORT_REGEN_CONSENT_TTL_MS_ = 5 * 60 * 1000;

function reportConsentRegistryState_(sessionToken, eventId) {
  // G-27 is read-only and validates Event, current Revision and schema-v7
  // ReportRegistry; do NOT call ensureReportRegistrySheet_ on a consent read.
  var state = listReportsForEvent(sessionToken, eventId);
  if (!state || String(state.eventId) !== String(eventId) ||
      !Number.isSafeInteger(state.count) || state.count < 0 ||
      !Number.isSafeInteger(state.invalidCount) || state.invalidCount !== 0 ||
      !Number.isSafeInteger(state.currentRevision) || state.currentRevision < 1 ||
      (state.recordStatus !== 'active' && state.recordStatus !== 'closed') ||
      (state.count > 0 && (!state.latest || !isUuid_(String(state.latest.reportId || ''))))) {
    throw new Error('ยังยืนยันทะเบียนรายงานและ Revision ไม่ได้ กรุณาตรวจประวัติก่อน');
  }
  return state;
}

function assertNoUnresolvedReportJob_(props, eventId) {
  // G-32 expires an active pointer when a job becomes unknown. The durable
  // job record remains for up to 24 hours; scanning it avoids a retry bypass
  // after the active pointer has already been cleared by another request.
  var all=props.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf(REPORT_JOB_PREFIX_)!==0) return;
    var job;
    try { job=JSON.parse(all[key]); }
    catch(ignore) { throw new Error('ตรวจสอบสถานะงานรายงานเดิมไม่ได้ กรุณาตรวจสอบก่อนสร้างซ้ำ'); }
    if (String(job.eventId||'')===String(eventId) && job.status==='unknown') {
      throw new Error('ยังมีงานรายงานสถานะไม่แน่นอน กรุณาตรวจสอบทะเบียนและติดต่อผู้ดูแลก่อนสร้างซ้ำ');
    }
  });
}

function expireReportRegenerationConsents_(props) {
  var now=Date.now(), all=props.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf(REPORT_REGEN_CONSENT_PREFIX_) !== 0) return;
    try {
      var proof=JSON.parse(all[key]);
      if (!Number.isFinite(Number(proof.createdAt)) ||
          now-Number(proof.createdAt)>REPORT_REGEN_CONSENT_TTL_MS_ ||
          Number(proof.createdAt)>now) props.deleteProperty(key);
    } catch(ignore) { props.deleteProperty(key); }
  });
}

// Browser RPC: call only AFTER the authenticated user explicitly confirms a
// new report from the G-27 history dialog. This does NOT create a report.
function prepareReportRegeneration(sessionToken, eventId) {
  var user=requireAuth_(sessionToken,'report');
  var stableEventId=String(eventId||'').trim();
  if (!isUuid_(stableEventId)) throw new Error('EventID ไม่ถูกต้อง');
  return withReportJobLock_(function(props) {
    expireReportRegenerationConsents_(props);
    var state=reportConsentRegistryState_(sessionToken,stableEventId);
    if (!state.count) throw new Error('ยังไม่มีรายงานเดิมที่ยืนยันได้ ไม่สามารถขอสร้างซ้ำ');
    var consentId=Utilities.getUuid();
    if (!isUuid_(consentId)) throw new Error('ไม่สามารถยืนยันรหัสคำขอได้');
    props.setProperty(REPORT_REGEN_CONSENT_PREFIX_+consentId,JSON.stringify({
      ownerId:String(user.userId),eventId:stableEventId,
      count:state.count,latestReportId:String(state.latest.reportId),
      sourceRevision:state.currentRevision,createdAt:Date.now()
    }));
    return {consentId:consentId,eventId:stableEventId};
  });
}

function verifyReportRegenerationConsent_(props, consentId, user, eventId, state) {
  if (!isUuid_(String(consentId||''))) throw new Error('กรุณายืนยันการสร้างรายงานใหม่จากประวัติรายงาน');
  var key=REPORT_REGEN_CONSENT_PREFIX_+String(consentId);
  var raw=props.getProperty(key);
  if (!raw) throw new Error('คำยืนยันสร้างรายงานใหม่ไม่พร้อมใช้งาน กรุณายืนยันอีกครั้ง');
  var proof;
  try { proof=JSON.parse(raw); }
  catch(ignore) { throw new Error('คำยืนยันสร้างรายงานใหม่ไม่ถูกต้อง'); }
  var age=Date.now()-Number(proof.createdAt);
  if (!Number.isFinite(age) || age<0 || age>REPORT_REGEN_CONSENT_TTL_MS_ ||
      String(proof.ownerId)!==String(user.userId) ||
      String(proof.eventId)!==String(eventId) ||
      proof.count!==state.count ||
      proof.latestReportId!==String(state.latest&&state.latest.reportId||'') ||
      proof.sourceRevision!==state.currentRevision) {
    throw new Error('คำยืนยันหมดอายุหรือทะเบียนรายงานเปลี่ยนแปลง กรุณาตรวจประวัติและยืนยันใหม่');
  }
  return key; // Deleted under the same script lock, only when a job is accepted.
}

function createReportJob(sessionToken, eventId, regenerationConsentId) {
  var user = requireAuth_(sessionToken, 'report');
  var sheet = getSheetByIdOrName_('MAIN_SHEET_ID', CONFIG.SHEETS.MAIN);
  findEventRowById_(sheet, eventId, false);
  var stableEventId = String(eventId || '').trim();
  if (!isUuid_(stableEventId)) throw new Error('EventID ไม่ถูกต้อง');
  return withReportJobLock_(function(props) {
    cleanupOldReportJobs_(props);
    assertNoUnresolvedReportJob_(props,stableEventId);
    var existingId = props.getProperty(REPORT_JOB_ACTIVE_KEY_);
    if (existingId) {
      var existing;
      try { existing = expireStaleReportJob_(props, readReportJob_(props, existingId)); }
      catch(ignore) { releaseReportJobSlot_(props, existingId); }
      if (existing && existing.status === 'unknown') {
        // Expired execution is not proof that no document was committed.
        // Explicit consent cannot turn an unresolved unknown into a safe retry.
        throw new Error('ยังไม่สามารถยืนยันผลคำขอรายงานก่อนหน้า กรุณาตรวจสถานะและทะเบียนรายงาน');
      }
      if (existing && !reportJobTerminal_(existing.status)) {
        if (existing.ownerId === String(user.userId) &&
            existing.eventId === stableEventId) {
          return publicReportJob_(existing); // Same owner + Event only.
        }
        throw new Error('มีการสร้างรายงานอื่นกำลังทำงานอยู่ กรุณารอจนเสร็จ');
      }
      releaseReportJobSlot_(props, existingId);
    }

    // Verify inside the same G-32 ScriptLock that claims the global job slot.
    // This closes the frontend time-of-check / time-of-use gap.
    var registryState=reportConsentRegistryState_(sessionToken, stableEventId);
    var consentKey='';
    if (registryState.count > 0) {
      consentKey=verifyReportRegenerationConsent_(
        props,regenerationConsentId,user,stableEventId,registryState);
    } else if (regenerationConsentId) {
      throw new Error('ทะเบียนรายงานเปลี่ยนแปลง กรุณารีเฟรชและยืนยันใหม่');
    }
    var job = {
      id:Utilities.getUuid(),eventId:stableEventId,
      ownerId:String(user.userId),
      status:'queued',stage:'queued',createdAt:Date.now(),updatedAt:Date.now(),
      message:'รอเริ่มสร้างรายงาน',documentUrl:''
    };
    saveReportJob_(props, job);
    props.setProperty(REPORT_JOB_ACTIVE_KEY_, job.id);
    props.setProperty('SRRT_G32_USER_' + job.ownerId, job.id);
    if (consentKey) props.deleteProperty(consentKey); // One-use capability.
    return publicReportJob_(job);
  });
}
function getReportJobStatus(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    return publicReportJob_(reportJobOwned_(props, jobId, user));
  });
}
function getCurrentReportJob(sessionToken) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    var pointer = 'SRRT_G32_USER_' + user.userId;
    var id = props.getProperty(pointer);
    if (!id) return null;
    try { return publicReportJob_(reportJobOwned_(props, id, user)); }
    catch(ignore) {
      // Clear an expired/unreadable pointer instead of retaining stale keys.
      props.deleteProperty(pointer);
      return null;
    }
  });
}
function cancelReportJob(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    var job = reportJobOwned_(props, jobId, user);
    if (job.status === 'queued') {
      job.status = 'cancelled';job.stage = 'cancelled';
      job.message = 'ยกเลิกก่อนเริ่มสร้างรายงานแล้ว';
      releaseReportJobSlot_(props,job.id);
      saveReportJob_(props,job);
    } else if (job.status === 'running') {
      job.status = 'cancel_requested';
      job.message = 'รับคำขอยกเลิกแล้ว จะหยุดเมื่อ Gemini ส่งคำตอบกลับและถึงจุดตรวจสอบ';
      saveReportJob_(props,job);
    } else if (job.status === 'finalizing') {
      job.message = 'กำลังบันทึกเอกสารและทะเบียนรายงาน ไม่สามารถยกเลิกได้แล้ว';
      saveReportJob_(props,job);
    }
    // cancel_requested/terminal states are idempotent and never revert.
    return publicReportJob_(job);
  });
}
function dismissReportJob(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  return withReportJobLock_(function(props) {
    var job = reportJobOwned_(props, jobId, user);
    if (!reportJobTerminal_(job.status)) throw new Error('งานยังไม่สิ้นสุด ไม่สามารถล้างการแจ้งเตือนได้');
    var pointer = 'SRRT_G32_USER_' + user.userId;
    if (props.getProperty(pointer) === jobId) props.deleteProperty(pointer);
    return publicReportJob_(job);
  });
}
function reportJobCheckpoint_(jobId, stage) {
  if (!jobId) return;
  return withReportJobLock_(function(props) {
    var job = expireStaleReportJob_(props,readReportJob_(props,jobId));
    if (job.status === 'cancel_requested' || job.status === 'cancelled') {
      throw new Error('REPORT_JOB_CANCELLED');
    }
    if (job.status !== 'running') throw new Error('คำขอรายงานไม่อยู่ในสถานะที่ทำงานได้');
    job.stage = stage;
    if (stage === 'finalizing') job.status = 'finalizing';
    saveReportJob_(props,job);
  });
}
function finalizeReportJob_(jobId, status, url, message) {
  return withReportJobLock_(function(props) {
    var job = readReportJob_(props,jobId);
    if (reportJobTerminal_(job.status)) return publicReportJob_(job);
    if (status === 'failed' && job.status === 'cancel_requested') status = 'cancelled';
    job.status = status;job.stage = status;
    job.documentUrl = status === 'completed' ? String(url || '') : '';
    job.message = String(message || '').slice(0,220);
    saveReportJob_(props,job);
    releaseReportJobSlot_(props,jobId);
    return publicReportJob_(job);
  });
}
function runReportJob(sessionToken, jobId) {
  var user = requireAuth_(sessionToken, 'report');
  var job = withReportJobLock_(function(props) {
    var current = reportJobOwned_(props,jobId,user);
    if (current.status === 'cancelled') return current;
    if (current.status !== 'queued') throw new Error('คำขอรายงานนี้เริ่มแล้วหรือเสร็จสิ้นแล้ว โปรดตรวจสถานะเดิม');
    if (props.getProperty(REPORT_JOB_ACTIVE_KEY_) !== current.id) {
      throw new Error('คำขอรายงานไม่ใช่งานที่กำลังรออยู่');
    }
    current.status = 'running';current.stage = 'preparing';current.message = '';
    current.executionNonce = Utilities.getUuid();
    saveReportJob_(props,current);
    return current;
  });
  if (job.status === 'cancelled') return publicReportJob_(job);
  try {
    var url = generateReportFromWeb(sessionToken,job.eventId,job.id,job.executionNonce);
    return finalizeReportJob_(job.id,'completed',url,'สร้างรายงานเรียบร้อยแล้ว');
  } catch(error) {
    var internalError = String(error.message || error);
    var safeMessage = internalError === 'REPORT_JOB_CANCELLED'
      ? 'ยกเลิกการสร้างรายงานแล้ว'
      : (/^Gemini 3\.8 Flash/.test(internalError)
        ? internalError
        : 'สร้างรายงานไม่สำเร็จ กรุณาตรวจ Execution Logs และประวัติรายงาน');
    var final = finalizeReportJob_(job.id,'failed','',safeMessage);
    // Return only a scrubbed terminal status, never raw patient content.
    return final;
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

function analyzeWithGemini_(rowData, locationInfo, settings, reportMeta, reportJobId) {
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
  reportJobCheckpoint_(reportJobId,'gemini_1');
  var part1 = callGeminiForReport_(apiKey, modelInfo, promptPart1, 'หัวข้อ 1-3', reportMeta,
    reportJobId, 'gemini_1', startedAt);
  reportJobCheckpoint_(reportJobId,'gemini_2');
  if (String(part1 || '').indexOf('🚨') === 0) {
    throw new Error(String(part1).replace(/^🚨\s*/, ''));
  }

  // Synchronous UrlFetchApp.fetch cannot be interrupted. Retrying part 1 must
  // never consume so much time that we then start part 2 too late.
  if (Date.now() - startedAt > 120000) {
    throw new Error('Gemini 3.8 Flash ตอบช้าเกินไป ระบบยุติก่อนเริ่มส่วนที่สองเพื่อเลี่ยง Apps Script Timeout กรุณาลองใหม่ภายหลัง');
  }

  var part2 = callGeminiForReport_(apiKey, modelInfo, promptPart2, 'หัวข้อ 4-6', reportMeta,
    reportJobId, 'gemini_2', startedAt);
  reportJobCheckpoint_(reportJobId,'post_gemini');
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
  requireTrustedOperator_('clearGeminiModelCache');
  clearGeminiModelCache_();
  Logger.log('ล้าง Cache โมเดล Gemini เรียบร้อยแล้ว');
  return 'ล้าง Cache โมเดล Gemini เรียบร้อยแล้ว';
}

function listAvailableGeminiModels() {
  requireTrustedOperator_('listAvailableGeminiModels');
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
  requireTrustedOperator_('testGeminiConnection');
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
