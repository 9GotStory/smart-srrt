/**
 * D331-N1-B1: Pure, offline Event/Area/Capability projection contracts.
 *
 * NOT registered in tools/native-sources.mjs. No RPCs or Google services.
 * The caller MUST obtain mainRow, areaRows, authenticatedUser and approvedGrant
 * exclusively from trusted server-side sources in a later, separately reviewed
 * N1-B2 boundary. These functions DO NOT attest origin or approve a disease
 * policy; arbitrary objects from the browser are NEVER acceptable here.
 *
 * Nothing in this file enables D331 or changes MainData, schema v7, or ACLs.
 */

function d331N1bText_(value) {
  if (typeof value !== 'string' || !value || value !== value.trim()) {
    throw new Error('D331_UNTRUSTED_CONTEXT');
  }
  return value;
}

function d331N1bDistinctStrings_(values, validateUuid) {
  if (!Array.isArray(values) || !values.length) throw new Error('D331_GRANT_REQUIRED');
  var seen = Object.create(null);
  return values.map(function(v) {
    var value = d331N1bText_(v);
    if (validateUuid && !d331IsUuid_(value)) throw new Error('D331_GRANT_REQUIRED');
    if (Object.prototype.hasOwnProperty.call(seen, value)) throw new Error('D331_GRANT_REQUIRED');
    seen[value] = true;
    return value;
  });
}

function d331N1bActiveAreaId_(row, masterRows) {
  // Raw source is AreaMaster with ordered 10 fields:
  // AreaID, Province, Amphoe, Tambon, Moo, VillageName, VillageCode,
  // Active, UpdatedAt, UpdatedBy. Exact matching; no fuzzy village inference.
  if (!Array.isArray(masterRows) || !Array.isArray(row) || row.length !== 39 ||
      !d331N1bText_(row[9]) || !d331N1bText_(row[10]) ||
      !d331N1bText_(row[11]) || !d331N1bText_(row[12]) ||
      !d331N1bText_(row[29])) throw new Error('D331_AREA_UNRESOLVED');

  var candidates = masterRows.filter(function(area) {
    if (!Array.isArray(area) || area.length !== 10 || area[7] !== true) return false;
    return typeof area[0] === 'string' && area[0].trim() === area[0] && area[0] !== '' &&
      area[1] === row[12] && area[2] === row[11] &&
      area[3] === row[10] && String(area[4]) === row[9] &&
      area[6] === row[29] &&
      (row[28] === '' || area[5] === row[28]);
  });
  if (candidates.length !== 1) throw new Error('D331_AREA_UNRESOLVED');
  var areaId = d331N1bText_(candidates[0][0]);
  // No duplicate active AreaID is safe even if the second row is elsewhere.
  var copies = masterRows.filter(function(area) {
    return Array.isArray(area) && area.length === 10 &&
      area[7] === true && area[0] === areaId;
  });
  if (copies.length !== 1) throw new Error('D331_AREA_UNRESOLVED');
  return areaId;
}

function d331N1bEventFromTrustedRows_(mainRow, areaRows, approvedDiseaseLabels) {
  // MainData columns are exact and pinned to v7's 39-column event layout.
  // Client rowToObject_ is NOT a source of authority. Project only IDs/scope.
  if (!Array.isArray(mainRow) || mainRow.length !== 39) {
    throw new Error('D331_EVENT_UNRESOLVED');
  }
  var eventId = d331RequireUuid_(mainRow[30]);
  var revision = d331RequireRevision_(mainRow[31]);
  var status = mainRow[32];
  if (status !== 'active' && status !== 'closed') {
    throw new Error('D331_EVENT_UNRESOLVED');
  }
  var ownerUserId = d331N1bText_(mainRow[38]);
  // Eligibility is an explicit, later clinically approved server allowlist.
  // Missing, vague, inactive or unsupported disease values fail CLOSED.
  var disease = d331N1bText_(mainRow[5]);
  var allowlist = d331N1bDistinctStrings_(approvedDiseaseLabels, false);
  if (allowlist.indexOf(disease) < 0) throw new Error('D331_DISEASE_NOT_APPROVED');
  var areaId = d331N1bActiveAreaId_(mainRow, areaRows);
  return {eventId:eventId, revision:revision, recordStatus:status,
    ownerUserId:ownerUserId, areaId:areaId, eligibleDisease:true};
}

function d331N1bPrincipalFromTrustedGrant_(authenticatedUser, approvedGrant) {
  // "view", "edit" and Super Admin/Manager role alone NEVER issue D331 rights.
  // No user claim, form field, UserAccounts area string or UI-provided grant.
  if (!authenticatedUser || authenticatedUser.status !== 'active' ||
      !approvedGrant || approvedGrant.approved !== true ||
      typeof authenticatedUser.userId !== 'string' ||
      !authenticatedUser.userId.trim() ||
      authenticatedUser.userId !== authenticatedUser.userId.trim() ||
      approvedGrant.userId !== authenticatedUser.userId) {
    throw new Error('D331_GRANT_REQUIRED');
  }
  var capabilities = d331N1bDistinctStrings_(approvedGrant.capabilities, false);
  if (capabilities.some(function(cap) {
    return !/^dengue(?:\.[a-z]+)+\.(?:read|write)$/.test(cap);
  })) throw new Error('D331_GRANT_REQUIRED');
  var allowedAreaIds = d331N1bDistinctStrings_(approvedGrant.allowedAreaIds, false);
  var allowedEventIds = approvedGrant.allowedEventIds === undefined ? [] :
    (Array.isArray(approvedGrant.allowedEventIds) && approvedGrant.allowedEventIds.length===0
      ? [] : d331N1bDistinctStrings_(approvedGrant.allowedEventIds, true));
  return {active:true, userId:authenticatedUser.userId,
    capabilities:capabilities, allowedAreaIds:allowedAreaIds,
    allowedEventIds:allowedEventIds};
}

function d331N1bAuthorizeOffline_(authenticatedUser, mainRow, areaRows,
    approvedGrant, approvedDiseaseLabels, capability, isWrite, expectedRevision) {
  // Evaluation of pre-supplied, SERVER-TRUSTED snapshots ONLY.
  // This is not a public entrypoint and does not grant runtime permission.
  var principal = d331N1bPrincipalFromTrustedGrant_(authenticatedUser, approvedGrant);
  var event = d331N1bEventFromTrustedRows_(mainRow, areaRows, approvedDiseaseLabels);
  d331Authorize_(principal, event, capability, isWrite);
  if (isWrite) d331CheckRevision_(expectedRevision, event.revision);
  // Minimal identity/consistency result; not a patient DTO or read grant.
  return {eventId:event.eventId, revision:event.revision, areaId:event.areaId,
    capability:capability, mode:isWrite ? 'write' : 'read'};
}
