/**
 * D331 P0-22B1: UNREGISTERED, deny-only GS case-read boundary +
 * fixed offline-only validation/projection for synthetic case previews.
 *
 * Neither these source bytes nor offline fixtures are an authenticated
 * patient-read path. Clinical, privacy, grant and target approvals are HOLD.
 * DO NOT add to native-sources.mjs, expose a public RPC or set any flags ON.
 */
var D331_P022B_ENABLED_ = false;
var D331_P022B_APPROVED_FIELD_POLICY_ = '';
var D331_P022B_OFFLINE_KIND_ = 'D331_P022B_SYNTHETIC_ONLY_V1';
var D331_P022B_OFFLINE_EVENT_ = 'e0000000-0000-4000-8000-000000000022';
var D331_P022B_OFFLINE_CASE_IDS_ = [
  'a0000000-0000-4000-8000-000000000022',
  'a0000000-0000-4000-8000-000000000023'
];

function d331P022bDeny_() { throw new Error('D331_UNAVAILABLE'); }

/**
 * Reserved PRIVATE GS method. No real case-row access even if caller forges
 * inputs or later flips another module's flags. A separate, fully reviewed
 * clinical+privacy+security implementation must replace this fail-closed stub.
 */
function d331P022bListCasesForEvent_(sessionToken,eventId) {
  if (D331_G1A_ENABLED !== true ||
      D331_P003B_ENABLED_ !== true ||
      D331_P022B_ENABLED_ !== true ||
      D331_P022B_APPROVED_FIELD_POLICY_ !== 'APPROVED_BY_SEPARATE_GATE')
    d331P022bDeny_();
  // Deliberate permanent DENY: approvals cannot activate this source by flags.
  d331P022bDeny_();
}

/**
 * Pure offline-only contract. ALL data and IDs are fixed synthetic fixtures.
 * Caller-supplied snapshots can be forged; this is NEVER a grant/authorization
 * decision and never consumes SpreadsheetApp, CacheService or PropertiesService.
 * Strictly refuse unknown keys/rows; return only safe example identity fields.
 */
function d331P022bOfflineCases_(snapshot,rows) {
  try {
    if (!snapshot || typeof snapshot !== 'object' ||
        Array.isArray(snapshot) ||
        Object.keys(snapshot).sort().join('|') !==
          'areaId|eventId|kind|revision' ||
        snapshot.kind !== D331_P022B_OFFLINE_KIND_ ||
        snapshot.eventId !== D331_P022B_OFFLINE_EVENT_ ||
        snapshot.areaId !== 'SYNTHETIC-AREA' ||
        snapshot.revision !== 3 ||
        !Array.isArray(rows) || rows.length > 2)
      d331P022bDeny_();

    var headers = d331P002aHeaders_('DengueCases');
    if (!Array.isArray(headers) || headers.length !== 16 ||
        headers.slice(0,4).join('|') !==
        'CaseID|EventID|CaseRevision|CaseStatus')
      d331P022bDeny_();

    var used = Object.create(null);
    var cases = rows.map(function(row) {
      if (!Array.isArray(row) || row.length !== headers.length)
        d331P022bDeny_();
      // Validates all 16 scalar/enum fields of the v2 draft, not just DTO keys.
      d331P002aValidateSyntheticRow_('DengueCases',row);
      var caseId = row[0];
      if (D331_P022B_OFFLINE_CASE_IDS_.indexOf(caseId) < 0 ||
          Object.prototype.hasOwnProperty.call(used,caseId) ||
          row[1] !== snapshot.eventId)
        d331P022bDeny_();
      used[caseId] = true;
      return {caseId:caseId,caseRevision:row[2],caseStatus:row[3]};
    });

    return {
      simulationOnly:true,
      status:'READ_ONLY_MOCK',
      eventId:snapshot.eventId,
      revision:snapshot.revision,
      areaId:snapshot.areaId,
      cases:cases,
      slaAssessment:'NOT_EVALUATED',
      canWrite:false,
      canEnable:false
    };
  } catch (ignore) { d331P022bDeny_(); }
}
