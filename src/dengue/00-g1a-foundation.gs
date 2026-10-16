/**
 * D331-G1-A: Offline-only Dengue 3-3-1 foundation contract.
 * NOT listed in tools/native-sources.mjs; does not run in any deployed GAS app.
 * No SpreadsheetApp, LockService, DriveApp, PropertiesService or RPC entrypoints.
 * No clinical 3-3-1 policy is adopted by this module.
 */
var D331_G1A_ENABLED = false;
var D331_G1A_SCHEMA_VERSION = 1;

var D331_G1A_SCHEMAS = {
  DengueCases: ['CaseID','EventID','CaseRevision','CaseStatus'],
  DenguePlans: ['PlanID','EventID','EpisodeKey','PolicyVersion','PlanRevision','PlanStatus'],
  DengueControlActions: ['ActionID','EventID','PlanID','ActionRevision','ActionStatus'],
  DengueEntomology: ['SurveyID','EventID','SurveyRevision','HousesInspected','HousesPositive','ContainersInspected','ContainersPositive'],
  DengueContainers: ['ContainerID','EventID','SurveyID','ContainerRevision','Inspected','Positive'],
  DengueFollowups: ['FollowupID','EventID','PlanID','CheckpointKey','FollowupRevision','FollowupStatus'],
  DengueRequestLedger: ['RequestID','EventID','PrincipalID','Operation','PayloadDigest','Phase','EntityID','UpdatedAt']
};

function d331IsUuid_(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function d331RequireUuid_(value) {
  if (!d331IsUuid_(value)) throw new Error('D331_INVALID_ID');
  return value.toLowerCase();
}
function d331RequireRevision_(revision) {
  if (typeof revision !== 'number' || !isFinite(revision) ||
      revision < 1 || !Number.isSafeInteger(revision)) {
    throw new Error('D331_INVALID_REVISION');
  }
  return revision;
}
function d331CheckRevision_(expected, actual) {
  d331RequireRevision_(expected);
  d331RequireRevision_(actual);
  if (expected !== actual) throw new Error('D331_STALE_REVISION');
  return true;
}
function d331IsoInstant_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (!isFinite(value.getTime())) throw new Error('D331_INVALID_DATE');
    return value.toISOString();
  }
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw new Error('D331_INVALID_DATE');
  }
  var parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  var canonical = parts[1] + '.' + ((parts[2] || '') + '000').slice(0, 3) + 'Z';
  var date = new Date(value);
  if (!isFinite(date.getTime()) || date.toISOString() !== canonical) {
    throw new Error('D331_INVALID_DATE');
  }
  return date.toISOString();
}
function d331LocalDate_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('D331_INVALID_LOCAL_DATE');
  }
  // Thai Buddhist Era years such as 2569 must be converted by an explicit UI boundary.
  var year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2100) throw new Error('D331_INVALID_LOCAL_DATE');
  var date = new Date(value + 'T00:00:00.000Z');
  if (!isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('D331_INVALID_LOCAL_DATE');
  }
  return value;
}
function d331CountPair_(inspected, positive) {
  if (typeof inspected !== 'number' || typeof positive !== 'number' ||
      !isFinite(inspected) || !isFinite(positive) ||
      Math.floor(inspected) !== inspected || Math.floor(positive) !== positive ||
      inspected < 0 || positive < 0 || positive > inspected ||
      inspected > Number.MAX_SAFE_INTEGER || positive > Number.MAX_SAFE_INTEGER) {
    throw new Error('D331_INVALID_COUNTS');
  }
  return { inspected: inspected, positive: positive, percent: inspected ? 100 * positive / inspected : null };
}
function d331AggregateCounts_(pairs, expectedScopeKey) {
  // Aggregation must never mix rounds, areas, or other non-comparable scopes.
  if (!Array.isArray(pairs) || typeof expectedScopeKey !== 'string' ||
      !expectedScopeKey) throw new Error('D331_INVALID_COUNTS');
  var inspected = 0, positive = 0;
  pairs.forEach(function (pair) {
    if (!pair || pair.scopeKey !== expectedScopeKey) throw new Error('D331_MIXED_SCOPE');
    var validated = d331CountPair_(pair.inspected, pair.positive);
    inspected += validated.inspected;
    positive += validated.positive;
    if (!Number.isSafeInteger(inspected) || !Number.isSafeInteger(positive)) {
      throw new Error('D331_INVALID_COUNTS');
    }
  });
  return d331CountPair_(inspected, positive);
}
function d331FeatureGuard_() {
  // Must not be activated as a side effect of schema inspection or boot.
  if (D331_G1A_ENABLED !== true) throw new Error('D331_FEATURE_DISABLED');
}
function d331InspectHeaders_(actual, actualVersion) {
  // Pure function: caller provides an offline object, never a Spreadsheet.
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    throw new Error('D331_INVALID_SCHEMA_INPUT');
  }
  var problems = [];
  if (actualVersion !== D331_G1A_SCHEMA_VERSION) problems.push('SCHEMA_VERSION_MISMATCH');
  Object.keys(D331_G1A_SCHEMAS).forEach(function (name) {
    var wanted = D331_G1A_SCHEMAS[name], got = actual[name];
    if (!Array.isArray(got)) { problems.push(name + ':MISSING'); return; }
    if (got.length !== wanted.length ||
        got.some(function (v, i) { return v !== wanted[i]; })) {
      problems.push(name + ':HEADER_MISMATCH');
    }
  });
  return { schemaVersion: D331_G1A_SCHEMA_VERSION, valid: problems.length === 0, problems: problems };
}
function d331PrimitiveDto_(source, allowedFields) {
  // DTO projection is not an authorization check; caller must authorize first.
  if (!source || typeof source !== 'object' || Array.isArray(source) ||
      !Array.isArray(allowedFields)) throw new Error('D331_INVALID_DTO');
  var result = Object.create(null);
  var seen = Object.create(null);
  allowedFields.forEach(function (field) {
    if (typeof field !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(field) ||
        field === '__proto__' || seen[field]) throw new Error('D331_INVALID_DTO');
    seen[field] = true;
    if (!Object.prototype.hasOwnProperty.call(source, field)) return;
    var value = source[field];
    if (Object.prototype.toString.call(value) === '[object Date]') value = d331IsoInstant_(value);
    if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
        (typeof value === 'number' && isFinite(value))) {
      result[field] = value;
    } else {
      throw new Error('D331_INVALID_DTO');
    }
  });
  return result;
}
function d331Authorize_(principal, event, capability, isWrite) {
  // The future GAS RPC must load both principal and event from trusted SERVER state.
  // Never take principal, owner, area or capabilities from browser payload.
  if (!principal || principal.active !== true || typeof principal.userId !== 'string' ||
      !principal.userId.trim() || principal.userId !== principal.userId.trim() ||
      typeof isWrite !== 'boolean' ||
      !event || !d331IsUuid_(event.eventId) || !Array.isArray(principal.capabilities) ||
      typeof capability !== 'string' || !/^dengue\.[a-z.]+$/.test(capability) ||
      principal.capabilities.indexOf(capability) < 0) throw new Error('D331_FORBIDDEN');
  if (event.eligibleDisease !== true ||
      (event.recordStatus !== 'active' && event.recordStatus !== 'closed') ||
      (isWrite === true && event.recordStatus !== 'active')) throw new Error('D331_FORBIDDEN');
  if (typeof event.areaId !== 'string' || !event.areaId.trim() ||
      event.areaId !== event.areaId.trim() ||
      !Array.isArray(principal.allowedAreaIds) ||
      principal.allowedAreaIds.indexOf(event.areaId) < 0) throw new Error('D331_FORBIDDEN');
  if (!((typeof event.ownerUserId === 'string' && !!event.ownerUserId.trim() &&
          event.ownerUserId === principal.userId) ||
        (Array.isArray(principal.allowedEventIds) &&
         principal.allowedEventIds.indexOf(event.eventId) >= 0))) {
    throw new Error('D331_FORBIDDEN');
  }
  return true;
}
function d331RequireEnum_(value, allowed) {
  if (!Array.isArray(allowed) || !allowed.length ||
      allowed.some(function(v) { return typeof v !== 'string' || !v; }) ||
      typeof value !== 'string' || allowed.indexOf(value) < 0) {
    throw new Error('D331_INVALID_ENUM');
  }
  return value;
}
function d331BindScopedEntity_(eventId, parent, child, parentIdKey, childFkKey) {
  // Internal contract only: trusted caller fixes key names (never from a browser).
  d331RequireUuid_(eventId);
  if (!parent || !child || typeof parentIdKey !== 'string' ||
      typeof childFkKey !== 'string' ||
      !/^(PlanID|SurveyID|FollowupID)$/.test(parentIdKey) ||
      !/^(PlanID|SurveyID|FollowupID)$/.test(childFkKey) ||
      !d331IsUuid_(parent[parentIdKey]) ||
      parent.EventID !== eventId || child.EventID !== eventId ||
      child[childFkKey] !== parent[parentIdKey]) {
    throw new Error('D331_FOREIGN_CHILD');
  }
  return true;
}
function d331BindChild_(eventId, child, plan) {
  d331RequireUuid_(eventId);
  if (!child || child.eventId !== eventId) throw new Error('D331_FOREIGN_CHILD');
  // Cases and simple event children may have no PlanID. Once a PlanID field
  // exists, the authoritative plan is mandatory (never optional by omission).
  var hasPlanFk = Object.prototype.hasOwnProperty.call(child, 'planId');
  var suppliedPlan = plan !== undefined && plan !== null;
  if (hasPlanFk !== suppliedPlan) throw new Error('D331_FOREIGN_CHILD');
  if (hasPlanFk &&
      (!d331IsUuid_(plan.planId) || plan.eventId !== eventId ||
       child.planId !== plan.planId)) throw new Error('D331_FOREIGN_CHILD');
  return true;
}
function d331RequestDecision_(existing, request) {
  if (!request || !d331IsUuid_(request.requestId) || !d331IsUuid_(request.eventId) ||
      typeof request.principalId !== 'string' || !request.principalId ||
      typeof request.operation !== 'string' || !/^dengue\.[a-z.]+$/.test(request.operation) ||
      typeof request.payloadDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(request.payloadDigest)) {
    throw new Error('D331_INVALID_REQUEST');
  }
  if (!existing) return { decision: 'reserve', phase: 'PENDING' };
  if (existing.requestId !== request.requestId ||
      existing.eventId !== request.eventId ||
      existing.principalId !== request.principalId ||
      existing.operation !== request.operation ||
      existing.payloadDigest !== request.payloadDigest) throw new Error('D331_IDEMPOTENCY_CONFLICT');
  if (existing.phase === 'COMMITTED') return { decision: 'replay', phase: 'COMMITTED' };
  if (existing.phase === 'PENDING' || existing.phase === 'UNKNOWN') {
    return { decision: 'reconcile', phase: existing.phase };
  }
  throw new Error('D331_INVALID_LEDGER_STATE');
}
function d331LedgerTransition_(entry, action) {
  // G1-A models only safe ambiguity handling. A string/DTO passed by a caller
  // is NOT authoritative business-row evidence. COMMITTED transitions are
  // deliberately unavailable until a separately approved G1-B trusted
  // ledger writer reconciles against a real persisted business row.
  if (!entry || !d331IsUuid_(entry.requestId)) throw new Error('D331_INVALID_LEDGER_STATE');
  d331RequestDecision_(null, entry); // validate principal/operation/digest.
  if (entry.phase !== 'PENDING' || action !== 'AMBIGUOUS') {
    throw new Error('D331_RECONCILIATION_REQUIRED');
  }
  return { requestId: entry.requestId, eventId: entry.eventId, principalId: entry.principalId,
    operation: entry.operation, payloadDigest: entry.payloadDigest, phase: 'UNKNOWN' };
}
function d331SyntheticIdMap_(legacyIds, uuidFactory) {
  // For offline prototype fixture IDs ONLY. Does not touch MainData or expose a migration RPC.
  if (!Array.isArray(legacyIds) || typeof uuidFactory !== 'function') {
    throw new Error('D331_INVALID_FIXTURE');
  }
  var result = Object.create(null), used = Object.create(null);
  legacyIds.forEach(function (legacyId) {
    if (typeof legacyId !== 'string' || !/^TEST-[A-Z0-9-]{1,80}$/.test(legacyId) ||
        Object.prototype.hasOwnProperty.call(result, legacyId)) {
      throw new Error('D331_INVALID_FIXTURE');
    }
    var generated = d331RequireUuid_(uuidFactory(legacyId));
    if (used[generated]) throw new Error('D331_INVALID_FIXTURE');
    used[generated] = true;
    result[legacyId] = generated;
  });
  return result;
}
function d331SyntheticFk_(map, legacyId) {
  if (!map || !Object.prototype.hasOwnProperty.call(map, legacyId)) {
    throw new Error('D331_UNKNOWN_FIXTURE_FK');
  }
  return map[legacyId];
}
