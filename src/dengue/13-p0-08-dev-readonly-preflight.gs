/**
 * Smart SRRT D331 P0-08 — read-only Development integration preflight.
 *
 * This is an INTERNAL, UNREGISTERED Apps Script helper (underscore suffix).
 * It cannot authorize the feature, test a user's permissions, or run CRUD.
 * No SpreadsheetApp active/fallback DB, no mutable Script Properties,
 * no rows below header 1, no PHI, no grants issued, no writes or deploys.
 */
var D331_P008_DEV_PREFLIGHT_ONLY_ = true;
var D331_P008_REQUIRED_TABS_ = 10;

function d331P008Deny_() { throw new Error('D331_DEV_PREFLIGHT_UNAVAILABLE'); }

function d331P008CheckHeaders_() {
  // Reuse existing DEV binding; never embed real IDs in source/CI output.
  var expected = D331_P003B_APPROVED_DEV_SPREADSHEET_ID_;
  if (typeof expected !== 'string' ||
      !/^[A-Za-z0-9_-]{20,160}$/.test(expected)) d331P008Deny_();
  try {
    // Direct read-only property lookup, not getDb_ which can mutate fallback.
    var configured=PropertiesService.getScriptProperties()
      .getProperty('DATABASE_SPREADSHEET_ID');
    if(configured!==expected) d331P008Deny_();
    var ss=SpreadsheetApp.openById(expected);
    if(!ss || ss.getId()!==expected) d331P008Deny_();

    // Existing Smart SRRT tables. Only row 1 is read by each helper.
    d331P003bGetRequiredSheet_(ss,'MainData',
      MAIN_HEADERS.concat(EVENT_META_HEADERS,[EVENT_OWNER_HEADER]));
    d331P003bGetRequiredSheet_(ss,'UserAccounts',D331_P003B_USER_HEADERS_);
    d331P003bGetRequiredSheet_(ss,'AreaMaster',D331_P003B_AREA_HEADERS_);

    // All seven D331 v2 tabs, including the ledger and grant registry.
    var dengue=d331P005RequireSevenSheets_(ss);
    if (Object.keys(dengue).length !== 7 ||
        D331_P008_REQUIRED_TABS_ !== 10) d331P008Deny_();

    // Status only; never emit a Spreadsheet ID, token or record content.
    return {
      status:'DEV_SCHEMA_HEADERS_PASS',
      existingHeadersChecked:3,
      dengueHeadersChecked:7,
      headersChecked:10,
      readDataRows:false,
      scriptDeploymentBinding:'NOT_ATTESTED',
      sessionAndGrants:'NOT_TESTED',
      canWrite:false,
      canEnable:false,
      canDeploy:false
    };
  } catch(e) { d331P008Deny_(); }
}
