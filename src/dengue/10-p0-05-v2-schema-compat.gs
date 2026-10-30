/**
 * D331 P0-05 — v2 physical-header compatibility gate, SOURCE-ONLY.
 * Uses the existing Smart SRRT Google Sheets object supplied by the
 * still-DISABLED P0-03B adapter. NEVER register or call as a public RPC.
 *
 * Header gate reads row 1 only; the internal Case decoder below receives
 * already-authorized service rows. No grants, writes or DDL.
 * Exact populated last column is checked; unused physical grid columns
 * are permitted because getMaxColumns() is NOT a schema width.
 */
var D331_P005_V2_TABS_ = [
  'DengueCases','DenguePlans','DengueControlActions',
  'DengueEntomology','DengueFollowups',
  'DengueRequestLedger','D331AccessGrants'
];

function d331P005RequireSevenSheets_(spreadsheet) {
  if (!spreadsheet || typeof spreadsheet.getSheetByName !== 'function' ||
      D331_P002A_SCHEMA_VERSION_ !== 2) d331P003bDeny_();
  var fromContract = d331P002aNames_();
  if (!Array.isArray(fromContract) ||
      fromContract.length !== D331_P005_V2_TABS_.length ||
      D331_P005_V2_TABS_.some(function(n,i){ return fromContract[i] !== n; }))
    d331P003bDeny_();

  var result = Object.create(null);
  D331_P005_V2_TABS_.forEach(function(name) {
    var headers = d331P002aHeaders_(name);
    if (!Array.isArray(headers) || !headers.length ||
        new Set(headers).size !== headers.length) d331P003bDeny_();
    // Reject absent, reordered, duplicate, additional populated headers.
    // The helper reads exactly row 1; it does NOT scan clinical records.
    result[name] = d331P003bGetRequiredSheet_(spreadsheet,name,headers);
  });
  return result;
}

// Internal storage adapter, called only after the existing authorization/header
// gates. A Sheets Date is a physical value, never a logical API input. Decode
// only Case onset in the pinned workbook's calendar; do not edit stored rows.
function d331P005DecodeCaseRow_(sheet,row) {
  if (!Array.isArray(row)||row.length!==16) d331P003bDeny_();
  var decoded=row.slice(),value=decoded[5];
  if (Object.prototype.toString.call(value)==='[object Date]') {
    if (!Number.isFinite(value.getTime())||!sheet||
        typeof sheet.getParent!=='function') d331P003bDeny_();
    var parent=sheet.getParent();
    if (!parent||parent.getId()!==D331_P003B_APPROVED_DEV_SPREADSHEET_ID_||
        typeof parent.getSpreadsheetTimeZone!=='function') d331P003bDeny_();
    var zone=parent.getSpreadsheetTimeZone();
    if (typeof zone!=='string'||!zone||zone!==zone.trim()) d331P003bDeny_();
    decoded[5]=Utilities.formatDate(value,zone,'yyyy-MM-dd');
  }
  // Keep canonical strings, empties and all other logical fields strict.
  d331P002aValidateSyntheticRow_('DengueCases',decoded);
  return decoded;
}
