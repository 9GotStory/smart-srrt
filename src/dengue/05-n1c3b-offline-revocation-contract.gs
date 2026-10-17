/**
 * D331 N1-C3-B: PURE, UNREGISTERED, SYNTHETIC-ONLY authorization simulation.
 * NOT an Apps Script RPC, not a grant provider, and NOT a live security boundary.
 * Caller-controlled snapshots cannot prove server origin, policy or revocation.
 * D331_G1A_ENABLED remains false in the separate Native26 foundation.
 * Depends only on the unregistered pure 00/03/04 D331 sources in offline VM tests.
 */
var D331_N1C3B_DENY_ = Object.freeze({
  simulationOnly:true, decision:'SIMULATED_DENY', code:'D331_SYNTHETIC_DENY'
});
var D331_N1C3B_ALLOW_ = Object.freeze({
  simulationOnly:true, decision:'SIMULATED_ALLOW', code:'D331_SYNTHETIC_ONLY'
});
function d331N1c3bExact_(obj, keys) {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).length === keys.length &&
    keys.every(function(k) { return Object.prototype.hasOwnProperty.call(obj,k); });
}
function d331N1c3bText_(x) {
  return typeof x === 'string' && x.length > 0 && x.length <= 128 &&
    x === x.trim() && x !== '*' && x !== '__proto__';
}
function d331N1c3bNumber_(x) {
  return Number.isSafeInteger(x) && x >= 1;
}
function d331N1c3bStrings_(a, allowEmpty) {
  return Array.isArray(a) && a.length <= 50 && (allowEmpty || a.length > 0) &&
    a.every(d331N1c3bText_) && new Set(a).size === a.length;
}
function d331N1c3bWindow_(data, now) {
  return d331N1c3bNumber_(data.validFromMs) &&
    d331N1c3bNumber_(data.expiresAtMs) &&
    data.validFromMs <= now && now < data.expiresAtMs;
}
/**
 * Clone only own, enumerable, data-only JSON primitives, arrays and records.
 * Accessors, cycles, symbols, functions, sparse arrays and prototype-pollution
 * keys fail closed. The clone is detached from a mutable synthetic test driver.
 * It is NOT a trusted server snapshot or a signature.
 */
function d331N1c3bCopy_(value, depth, seen, budget) {
  if (--budget.left < 0 || depth > 9) throw new Error('D331_OFFLINE_INVALID');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || seen.indexOf(value) !== -1)
    throw new Error('D331_OFFLINE_INVALID');
  seen.push(value);
  var array = Array.isArray(value);
  if (!array && Object.prototype.toString.call(value) !== '[object Object]')
    throw new Error('D331_OFFLINE_INVALID');
  var keys = Reflect.ownKeys(value);
  if (keys.some(function(k) { return typeof k !== 'string' || k === '__proto__' ||
      k === 'constructor' || k === 'prototype'; })) throw new Error('D331_OFFLINE_INVALID');
  if (array && (value.length > 10000 || keys.length !== value.length + 1))
    throw new Error('D331_OFFLINE_INVALID');
  var out = array ? [] : Object.create(null);
  keys.forEach(function(k) {
    if (array && k === 'length') return;
    if (array && (!/^(0|[1-9][0-9]*)$/.test(k) ||
        Number(k) >= value.length)) throw new Error('D331_OFFLINE_INVALID');
    var descriptor = Object.getOwnPropertyDescriptor(value,k);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor,'value') ||
        !descriptor.enumerable) throw new Error('D331_OFFLINE_INVALID');
    out[k] = d331N1c3bCopy_(descriptor.value,depth+1,seen,budget);
  });
  seen.pop();
  return out;
}
function d331N1c3bEvaluateOffline_(raw, rawRequest) {
  try {
    var budget={left:12000}, seen=[];
    var s=d331N1c3bCopy_(raw,0,seen,budget);
    var q=d331N1c3bCopy_(rawRequest,0,seen,budget);
    if (!d331N1c3bExact_(s,['syntheticOnly','simulatedFeatureEnabled','nowMs',
        'latestRequestId','lastConsumedRequestId','currentSessionRevision',
        'currentPolicyRevision','currentGrantRevision','session','policy','grants',
        'revokedGrantIds','mainHeaders','areaHeaders','mainRows','areaRows']) ||
        s.syntheticOnly !== true || s.simulatedFeatureEnabled !== true ||
        !d331N1c3bNumber_(s.nowMs) ||
        !d331N1c3bNumber_(s.latestRequestId) ||
        !Number.isSafeInteger(s.lastConsumedRequestId) || s.lastConsumedRequestId < 0 ||
        s.latestRequestId <= s.lastConsumedRequestId ||
        !d331N1c3bNumber_(s.currentSessionRevision) ||
        !d331N1c3bNumber_(s.currentPolicyRevision) ||
        !d331N1c3bNumber_(s.currentGrantRevision)) return D331_N1C3B_DENY_;
    if (!d331N1c3bExact_(q,['eventId','operation','requestId','authEpoch',
      'sessionRevision','policyRevision','grantRevision']) ||
      !d331IsUuid_(q.eventId) || q.eventId !== q.eventId.toLowerCase() ||
      q.operation !== 'dengue.case.read' || // writes remain DENIED pending ledger/DDL
      !d331N1c3bNumber_(q.requestId) || q.requestId !== s.latestRequestId)
      return D331_N1C3B_DENY_;

    var user=s.session, policy=s.policy;
    if (!d331N1c3bExact_(user,['userId','status','revision','authEpoch']) ||
        !d331N1c3bText_(user.userId) || user.status !== 'active' ||
        !d331N1c3bNumber_(user.revision) ||
        !d331N1c3bNumber_(user.authEpoch) ||
        user.revision !== s.currentSessionRevision ||
        q.sessionRevision !== user.revision || q.authEpoch !== user.authEpoch)
      return D331_N1C3B_DENY_;
    if (!d331N1c3bExact_(policy,['revision','approved','revoked','validFromMs',
       'expiresAtMs','labels']) || policy.approved !== true ||
       policy.revoked !== false || !d331N1c3bNumber_(policy.revision) ||
       policy.revision !== s.currentPolicyRevision ||
       policy.revision !== q.policyRevision ||
       !d331N1c3bWindow_(policy,s.nowMs) ||
       !d331N1c3bStrings_(policy.labels,false))
      return D331_N1C3B_DENY_;

    if (!Array.isArray(s.grants) || s.grants.length !== 1 ||
        !d331N1c3bStrings_(s.revokedGrantIds,true) ||
        !Array.isArray(s.mainHeaders) || !Array.isArray(s.areaHeaders) ||
        !Array.isArray(s.mainRows) || !Array.isArray(s.areaRows) ||
        s.mainRows.length === 0 || s.mainRows.length > 100 ||
        s.areaRows.length === 0 || s.areaRows.length > 100)
      return D331_N1C3B_DENY_;
    d331N1b2bAssertHeader_(s.mainHeaders,D331_N1B2B_MAIN_HEADERS_);
    d331N1b2bAssertHeader_(s.areaHeaders,D331_N1B2B_AREA_HEADERS_);

    var grant=s.grants[0];
    if (!d331N1c3bExact_(grant,['grantId','userId','revision','approved','revoked',
       'validFromMs','expiresAtMs','capabilities','allowedAreaIds','allowedEventIds',
       'policyRevision','sessionRevision']) ||
       !d331N1c3bText_(grant.grantId) || !d331N1c3bText_(grant.userId) ||
       grant.userId !== user.userId || grant.approved !== true ||
       grant.revoked !== false || s.revokedGrantIds.indexOf(grant.grantId) >= 0 ||
       !d331N1c3bNumber_(grant.revision) ||
       grant.revision !== s.currentGrantRevision ||
       grant.revision !== q.grantRevision ||
       grant.policyRevision !== policy.revision ||
       grant.sessionRevision !== user.revision ||
       !d331N1c3bWindow_(grant,s.nowMs) ||
       !d331N1c3bStrings_(grant.capabilities,false) ||
       !d331N1c3bStrings_(grant.allowedAreaIds,false) ||
       !d331N1c3bStrings_(grant.allowedEventIds,false) ||
       grant.capabilities.indexOf(q.operation) < 0 ||
       grant.capabilities.some(function(c) {
         return c !== 'dengue.case.read' && c !== 'dengue.case.write';
       }) || grant.allowedEventIds.indexOf(q.eventId) < 0)
      return D331_N1C3B_DENY_;

    if (s.mainRows.some(function(row) {
       return !Array.isArray(row) || row.length !== 39;
    }) || s.areaRows.some(function(row) {
       return !Array.isArray(row) || row.length !== 10 ||
         typeof row[4] !== 'string' || typeof row[6] !== 'string' ||
         row[7] !== true || !d331N1c3bText_(row[0]) ||
         !d331N1c3bText_(row[6]);
    })) return D331_N1C3B_DENY_;
    var matched=s.mainRows.filter(function(row) { return row[30] === q.eventId; });
    if (matched.length !== 1 || matched[0][32] !== 'active' ||
        !d331N1c3bNumber_(matched[0][31]) ||
        !d331N1c3bText_(matched[0][38])) return D331_N1C3B_DENY_;
    // In this conservative simulation, explicit Event AND Area scope are
    // mandatory; owner-only and empty Event grants cannot broaden rights.
    var result=d331N1bAuthorizeOffline_(
      {userId:user.userId,status:'active'},
      matched[0],s.areaRows,
      {userId:grant.userId,approved:true,capabilities:grant.capabilities,
       allowedAreaIds:grant.allowedAreaIds,allowedEventIds:grant.allowedEventIds},
      policy.labels,q.operation,false,undefined);
    if (!result || result.eventId !== q.eventId ||
        grant.allowedAreaIds.indexOf(result.areaId) < 0)
      return D331_N1C3B_DENY_;
    return D331_N1C3B_ALLOW_;
  } catch (_) {
    // Never echo exception text, token, PHI, user ID or target details.
    return D331_N1C3B_DENY_;
  }
}
