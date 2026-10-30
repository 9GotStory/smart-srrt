/**
 * D331 P0-22B2 — UNREGISTERED source-only candidate for a bounded
 * server-authorized Event -> DengueCases read. There is NO public GAS RPC.
 * Clinical/privacy and operational revocation approval are NOT granted.
 * Disabled by default; no Script/Deployment/Sheet mutation.
 */
var D331_P022B2_ENABLED_ = false;
var D331_P022B2_APPROVED_FIELDS_ = [];
var D331_P022B2_REVOCATION_APPROVED_ = false;
var D331_P022B2_MAX_ROWS_ = 10000;
var D331_P022B2_MAX_EVENT_CASES_ = 100;

function d331P022b2Deny_() { throw new Error('D331_UNAVAILABLE'); }

/**
 * INTERNAL helper only. Never expose this as a top-level public GAS callable.
 * ctx is created here by the existing P0-03B server authorization path,
 * NOT accepted as a request argument or from the browser.
 *
 * Test fixtures may set source flags in an isolated VM to exercise the
 * whole path. That is NOT operational approval.
 */
function d331P022b2ListCasesForEvent_(sessionToken,eventId) {
  // The source-only rollout is unavailable until distinct clinical/privacy
  // scope and revocation authority reviews; no service call when disabled.
  if (D331_G1A_ENABLED !== true ||
      D331_P003B_ENABLED_ !== true ||
      D331_P022B2_ENABLED_ !== true ||
      D331_P022B2_REVOCATION_APPROVED_ !== true ||
      !Array.isArray(D331_P022B2_APPROVED_FIELDS_) ||
      D331_P022B2_APPROVED_FIELDS_.length !== 3 ||
      D331_P022B2_APPROVED_FIELDS_.join('|') !==
        'CaseID|CaseRevision|CaseStatus') d331P022b2Deny_();

  try {
    // Server-owned session, pinned original DEV Spreadsheet ID, seven
    // headers, unique Event/Area, explicit live per-Event read capability
    // and versioned grant validation are delegated to P0-03B.
    var ctx=d331P003bAuthorizedContext_(sessionToken,eventId);
    if (!ctx || ctx.mode!=='read' || ctx.recordStatus!=='active' ||
        ctx.eventId!==eventId || !Number.isSafeInteger(ctx.revision) ||
        ctx.revision<1 || typeof ctx.areaId!=='string' || !ctx.areaId ||
        !ctx.tables || !ctx.tables.DengueCases) d331P022b2Deny_();

    var sheet=ctx.tables.DengueCases;
    var fields=d331P002aHeaders_('DengueCases');
    if (!Array.isArray(fields) || fields.length!==16 ||
        fields.slice(0,4).join('|')!==
          'CaseID|EventID|CaseRevision|CaseStatus') d331P022b2Deny_();

    var count=sheet.getLastRow()-1;
    if (!Number.isSafeInteger(count)||count<0||
        count>D331_P022B2_MAX_ROWS_ || D331_P022B2_MAX_ROWS_!==10000 ||
        D331_P022B2_MAX_EVENT_CASES_!==100) d331P022b2Deny_();

    var selected=[];
    if (count) {
      // Read only two identifier columns across the bounded sheet AFTER
      // server authorization. This checks CaseID uniqueness GLOBALLY,
      // including rows belonging to other Events; never fetch their PHI.
      var ids=sheet.getRange(2,1,count,2).getValues();
      if (!Array.isArray(ids)||ids.length!==count)d331P022b2Deny_();
      var globalCaseIds=Object.create(null);
      ids.forEach(function(pair,i){
        if (!Array.isArray(pair)||pair.length!==2)d331P022b2Deny_();
        var caseId=pair[0],parentId=pair[1];
        if (typeof caseId!=='string'||!d331IsUuid_(caseId)||
            caseId!==caseId.toLowerCase()||
            typeof parentId!=='string'||!d331IsUuid_(parentId)||
            parentId!==parentId.toLowerCase()||
            Object.prototype.hasOwnProperty.call(globalCaseIds,caseId))
          d331P022b2Deny_();
        globalCaseIds[caseId]=true;
        if(parentId===ctx.eventId)selected.push({row:i+2,caseId:caseId});
      });
      if (selected.length>D331_P022B2_MAX_EVENT_CASES_)d331P022b2Deny_();
    }

    var cases=selected.map(function(hit){
      // Re-read full rows ONLY for the authorized Event and ensure both
      // identifiers still match the earlier index scan. This catches an
      // edit between index and detail reads; Sheets is not transactional.
      var found=sheet.getRange(hit.row,1,1,16).getValues();
      if (!Array.isArray(found)||found.length!==1||
          !Array.isArray(found[0])||found[0].length!==16)d331P022b2Deny_();
      var row=d331P005DecodeCaseRow_(sheet,found[0]);
      // VOID disclosure semantics remain unapproved: DENY the request.
      if (row[0]!==hit.caseId || row[1]!==ctx.eventId ||
          row[3]!=='ACTIVE') d331P022b2Deny_();
      return {caseId:row[0],caseRevision:row[2],caseStatus:row[3]};
    });

    return {
      status:'READ_ONLY',eventId:ctx.eventId,revision:ctx.revision,
      areaId:ctx.areaId,cases:cases,
      slaAssessment:'NOT_EVALUATED',clinicalPolicyApproved:false,
      canWrite:false,canEnable:false
    };
  } catch(ignore) { d331P022b2Deny_(); }
}
