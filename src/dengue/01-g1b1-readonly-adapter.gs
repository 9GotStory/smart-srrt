/**
 * D331-G1-B1: OFFLINE read-only integration preview.
 * Intentionally NOT registered in tools/native-sources.mjs / GAS runtime.
 * Requires D331-G1-A pure functions, loaded by synthetic Node tests only.
 * Does NOT call any Apps Script service, updater, installer or public RPC.
 */
var D331_B1_PREVIEW_VERSION = 1;

function d331B1RequireContracts_() {
  if (typeof D331_G1A_SCHEMAS !== 'object' ||
      typeof D331_G1A_SCHEMA_VERSION !== 'number' ||
      typeof d331RequireUuid_ !== 'function' ||
      typeof d331RequireRevision_ !== 'function') {
    throw new Error('D331_B1_CONTRACTS_MISSING');
  }
}

function d331B1StrictVersion_(value) {
  if (value === null) return null; // Uninitialized, not ready.
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('D331_B1_INVALID_SNAPSHOT');
  }
  return value;
}

function d331B1ValidHeaders_(headers) {
  if (!Array.isArray(headers) || headers.length > 500) {
    throw new Error('D331_B1_INVALID_SNAPSHOT');
  }
  var seen = Object.create(null);
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (typeof header !== 'string' || !header || header.trim() !== header ||
        header.length > 128) return {wellFormed:false,duplicate:false};
    if (seen[header]) return {wellFormed:false,duplicate:true};
    seen[header] = true;
  }
  return {wellFormed:true,duplicate:false};
}

/**
 * ONLY structured metadata from a PRE-VERIFIED read-only test reader.
 * The adapter never reads row/cell content and does not call getDb_(),
 * ensureSheet_(), or spreadsheet/script property mutation facilities.
 *
 * Interface: listTableNames(), readModuleVersion(),
 * readTableHeaders(knownTableName), readTableRowCount(knownTableName).
 * A future live reader MUST have an independently approved operator gate.
 */
function d331B1ReadSnapshot_(reader) {
  d331B1RequireContracts_();
  if (!reader || typeof reader.listTableNames !== 'function' ||
      typeof reader.readModuleVersion !== 'function' ||
      typeof reader.readTableHeaders !== 'function' ||
      typeof reader.readTableRowCount !== 'function') {
    throw new Error('D331_B1_READER_REQUIRED');
  }
  try {
    var names = reader.listTableNames();
    if (!Array.isArray(names) || names.length > 1000) {
      throw new Error('D331_B1_INVALID_SNAPSHOT');
    }
    var seen = Object.create(null);
    names.forEach(function(name) {
      if (typeof name !== 'string' || !name ||
          name.length > 128 || seen[name]) {
        throw new Error('D331_B1_INVALID_SNAPSHOT');
      }
      seen[name] = true;
    });
    var version = d331B1StrictVersion_(reader.readModuleVersion());
    var tables = Object.create(null);
    Object.keys(D331_G1A_SCHEMAS).forEach(function(name) {
      if (!seen[name]) return;
      var headers = reader.readTableHeaders(name);
      var count = reader.readTableRowCount(name);
      if (!Array.isArray(headers) || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('D331_B1_INVALID_SNAPSHOT');
      }
      // Never return raw record values or other spreadsheet content.
      tables[name] = {headers:headers.slice(),rowCount:count};
    });
    return {moduleSchemaVersion:version,tables:tables};
  } catch (ignore) {
    // Never return underlying error text: it may reveal spreadsheet cells,
    // database IDs, patient names or environment paths.
    throw new Error('D331_B1_READ_FAILED');
  }
}

function d331B1PreviewSchema_(snapshot) {
  d331B1RequireContracts_();
  if (!snapshot || typeof snapshot !== 'object' ||
      Array.isArray(snapshot) ||
      !Object.prototype.hasOwnProperty.call(snapshot,'tables') ||
      !snapshot.tables || typeof snapshot.tables !== 'object' ||
      Array.isArray(snapshot.tables) ||
      !Object.prototype.hasOwnProperty.call(snapshot,'moduleSchemaVersion')) {
    throw new Error('D331_B1_INVALID_SNAPSHOT');
  }
  var observed = d331B1StrictVersion_(snapshot.moduleSchemaVersion);
  var findings = [];
  if (observed !== D331_G1A_SCHEMA_VERSION) {
    findings.push({code:'SCHEMA_VERSION_MISMATCH'});
  }
  var matched = 0, missing = 0, conflicts = 0, present = 0, totalRows = 0;
  Object.keys(D331_G1A_SCHEMAS).forEach(function(name) {
    if (!Object.prototype.hasOwnProperty.call(snapshot.tables, name)) {
      missing++;
      findings.push({code:'MISSING_TABLE',table:name});
      return;
    }
    var table = snapshot.tables[name];
    if (!table || typeof table !== 'object' || Array.isArray(table) ||
        !Object.prototype.hasOwnProperty.call(table,'headers') ||
        !Object.prototype.hasOwnProperty.call(table,'rowCount') ||
        !Number.isSafeInteger(table.rowCount) || table.rowCount < 0) {
      throw new Error('D331_B1_INVALID_SNAPSHOT');
    }
    var shape = d331B1ValidHeaders_(table.headers);
    present++;
    totalRows += table.rowCount;
    if (!Number.isSafeInteger(totalRows)) throw new Error('D331_B1_INVALID_SNAPSHOT');
    var expected = D331_G1A_SCHEMAS[name];
    var exactly = shape.wellFormed && table.headers.length === expected.length &&
      table.headers.every(function(h,i) {return h === expected[i];});
    if (exactly) matched++;
    else {
      conflicts++;
      findings.push({code:shape.duplicate?'DUPLICATE_HEADER':'HEADER_MISMATCH',table:name});
      if (table.rowCount > 0) findings.push({code:'POPULATED_CONFLICT',table:name});
    }
  });
  // NOTE: G1-A headers are provisional prototypes, not approved operational DDL.
  // Even a match NEVER means permission to migrate/create/enable.
  return {
    contract:'D331-B1-PREVIEW-V1',
    expectedSchemaVersion:D331_G1A_SCHEMA_VERSION,
    observedSchemaVersion:observed,
    status:'HOLD',
    candidateHeadersMatch:findings.length === 0,
    canApply:false,
    canEnable:false,
    inspectedDataRows:false,
    requiresOperatorApproval:true,
    summary:{expectedTables:7,presentTables:present,missingTables:missing,
      matchingTables:matched,conflictingTables:conflicts,observedDataRows:totalRows},
    findings:findings
  };
}

function d331B1PreviewFromReader_(reader) {
  return d331B1PreviewSchema_(d331B1ReadSnapshot_(reader));
}

/**
 * MainData 39-column *synthetic metadata* adapter. Never returns columns 1-30
 * (free text, event details, disease, place and other potentially sensitive data).
 * Neither disease eligibility nor AreaID privilege is inferable from the row.
 * The area evidence MUST be resolved by future trusted server code; this pure
 * proposal does not authorize access even with a syntactically valid proof.
 */
function d331B1ProjectEvent_(mainRow, areaEvidence) {
  d331B1RequireContracts_();
  if (!Array.isArray(mainRow) || mainRow.length < 39) {
    throw new Error('D331_B1_INVALID_EVENT');
  }
  var id, revision;
  try {
    id = d331RequireUuid_(mainRow[30]);
    revision = d331RequireRevision_(mainRow[31]);
  } catch (ignore) {
    throw new Error('D331_B1_INVALID_EVENT');
  }
  var status = mainRow[32];
  if (status !== 'active' && status !== 'closed' && status !== 'void') {
    throw new Error('D331_B1_INVALID_EVENT');
  }
  var owner = mainRow[38];
  if (typeof owner !== 'string' || owner.length > 128 ||
      owner !== owner.trim()) throw new Error('D331_B1_INVALID_EVENT');
  // The evidence object is only trusted when it was produced by an approved
  // future server adapter. In G1-B1 it NEVER grants area access or eligibility.
  var validAreaEvidence = !!(areaEvidence && areaEvidence.verified === true &&
    areaEvidence.eventId === id && typeof areaEvidence.areaId === 'string' &&
    areaEvidence.areaId.trim() === areaEvidence.areaId && !!areaEvidence.areaId &&
    areaEvidence.areaId.length <= 128);
  return {
    eventId:id,
    revision:revision,
    recordStatus:status,
    ownerUserId:owner,
    areaId:null,
    eligibleDisease:false,
    areaEvidenceAvailable:validAreaEvidence,
    authorizationReady:false
  };
}
