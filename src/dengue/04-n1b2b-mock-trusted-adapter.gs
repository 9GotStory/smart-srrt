/**
 * D331 N1-B2B: OFFLINE SYNTHETIC SIMULATION ONLY.
 *
 * NOT in tools/native-sources.mjs. NOT a security boundary for live data.
 * The injected driver is forgeable and MUST NOT come from a client, live GAS
 * runtime, or external system. Future N1-B2C/D require independently reviewed
 * server-origin attestation and signed clinical/permissions policy.
 *
 * No Apps Script services, RPC endpoints, persist/repair operations or PHI.
 */

var D331_N1B2B_MOCK_KIND_ = 'D331_SYNTHETIC_TEST_ONLY_V1';
var D331_N1B2B_MAIN_HEADERS_ = [
  'ลำดับ','วันรับแจ้ง','ผู้แจ้งข่าว/หน่วยงานที่แจ้ง','การเฝ้าระวัง','กลุ่มโรค',
  'โรค/ภัย/เหตุการณ์','ประเภทเหตุการณ์','สถานที่เกิดเหตุ','วันที่เริ่มป่วย',
  'หมู่','ตำบล','อำเภอ','จังหวัด','รายละเอียดเหตุการณ์','การตรวจสอบ',
  'วิธีการตรวจสอบ','เข้าเกณฑ์สอบสวนโรค','ประเภทการสอบสวนโรค',
  'ประเมินความเสี่ยงแจ้งเตือน','หน่วยงานแจ้งเตือน','การดำเนินการตามมาตรการ',
  'วันที่ดำเนินการตามมาตรการ','หน่วยงานรับแจ้ง','ลงสอบสวนโรค',
  'หมายเหตุ','วันที่ลงสอบสวนโรค','ผู้บันทึก','วันที่บันทึก/แก้ไขล่าสุด',
  'ชื่อหมู่บ้าน','รหัสหมู่บ้าน','EventID','Revision','RecordStatus',
  'CreatedAt','CreatedBy','VoidedAt','VoidedBy','VoidReason','OwnerUserID'
];
var D331_N1B2B_AREA_HEADERS_ = [
  'AreaID','จังหวัด','อำเภอ','ตำบล','หมู่','ชื่อหมู่บ้าน',
  'รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy'
];

function d331N1b2bAssertHeader_(provided, required) {
  if (!Array.isArray(provided) || provided.length !== required.length ||
      provided.some(function(value, index) { return value !== required[index]; })) {
    throw new Error('D331_MOCK_HEADER_INVALID');
  }
  return true;
}

function d331N1b2bMockProvider_(source) {
  // This checks TEST harness shape, NOT cryptographic identity or real trust.
  if (!source || source.kind !== D331_N1B2B_MOCK_KIND_) {
    throw new Error('D331_MOCK_SOURCE_REQUIRED');
  }
  var methods = ['binding','clock','session','mainHeaders','areaHeaders',
    'mainRows','areaRows','diseasePolicy','grant'];
  methods.forEach(function(name) {
    if (typeof source[name] !== 'function') {
      throw new Error('D331_MOCK_SOURCE_REQUIRED');
    }
  });
  return true;
}

function d331N1b2bMockPolicy_(policy, now) {
  if (!policy || policy.approved !== true ||
      !Number.isSafeInteger(policy.revision) || policy.revision < 1 ||
      typeof policy.policyId !== 'string' ||
      !/^TEST-D331-POLICY-[A-Z0-9-]{1,45}$/.test(policy.policyId) ||
      typeof policy.validFrom !== 'string' ||
      typeof policy.expiresAt !== 'string') {
    throw new Error('D331_MOCK_POLICY_UNAVAILABLE');
  }
  var start = d331IsoInstant_(policy.validFrom);
  var end = d331IsoInstant_(policy.expiresAt);
  if (!(start <= now && now < end)) throw new Error('D331_MOCK_POLICY_UNAVAILABLE');
  try {
    return d331N1bDistinctStrings_(policy.labels, false);
  } catch (err) {
    throw new Error('D331_MOCK_POLICY_UNAVAILABLE');
  }
}

function d331N1b2bMockGrant_(grant, now) {
  if (!grant || grant.approved !== true || grant.revoked !== false ||
      !Number.isSafeInteger(grant.revision) || grant.revision < 1 ||
      typeof grant.grantId !== 'string' ||
      !/^TEST-D331-GRANT-[A-Z0-9-]{1,45}$/.test(grant.grantId) ||
      typeof grant.validFrom !== 'string' ||
      typeof grant.expiresAt !== 'string') {
    throw new Error('D331_MOCK_GRANT_UNAVAILABLE');
  }
  var start = d331IsoInstant_(grant.validFrom);
  var end = d331IsoInstant_(grant.expiresAt);
  if (!(start <= now && now < end)) throw new Error('D331_MOCK_GRANT_UNAVAILABLE');
  return grant;
}

function d331N1b2bSimulate_(source, request) {
  // Never call d331FeatureGuard_ or set its flag; this simulation intentionally
  // runs even while the deployed (separate) N1-A feature is permanently OFF.
  // It cannot be registered into GAS without a different, reviewed trust design.
  d331N1b2bMockProvider_(source);
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      !Object.prototype.hasOwnProperty.call(request, 'eventId') ||
      !Object.prototype.hasOwnProperty.call(request, 'operation') ||
      !d331IsUuid_(request.eventId) ||
      request.eventId !== request.eventId.toLowerCase() ||
      (request.operation !== 'dengue.case.read' &&
       request.operation !== 'dengue.case.write') ||
      Object.keys(request).some(function(k) {
        return ['eventId','operation','expectedRevision'].indexOf(k) < 0;
      })) {
    throw new Error('D331_MOCK_INVALID_REQUEST');
  }
  var isWrite = request.operation === 'dengue.case.write';
  if ((isWrite && (!Object.prototype.hasOwnProperty.call(request,'expectedRevision') ||
      !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 1)) ||
      (!isWrite && Object.prototype.hasOwnProperty.call(request,'expectedRevision'))) {
    throw new Error('D331_MOCK_INVALID_REQUEST');
  }
  var binding = source.binding();
  if (!binding || binding.kind !== D331_N1B2B_MOCK_KIND_ ||
      binding.target !== 'SYNTHETIC-MEMORY-ONLY') {
    throw new Error('D331_MOCK_TARGET_UNVERIFIED');
  }
  var now = d331IsoInstant_(source.clock());
  d331N1b2bAssertHeader_(source.mainHeaders(), D331_N1B2B_MAIN_HEADERS_);
  d331N1b2bAssertHeader_(source.areaHeaders(), D331_N1B2B_AREA_HEADERS_);
  var user = source.session();
  if (!user || user.status !== 'active' || typeof user.userId !== 'string' ||
      !user.userId.trim() || user.userId !== user.userId.trim()) {
    throw new Error('D331_MOCK_SESSION_DENIED');
  }
  var policy = d331N1b2bMockPolicy_(source.diseasePolicy(), now);
  var grant = d331N1b2bMockGrant_(source.grant(user.userId), now);
  if (grant.userId !== user.userId) throw new Error('D331_MOCK_GRANT_UNAVAILABLE');

  // The synthetic source supplies complete snapshots, never client DTOs.
  // A future real adapter must independently prove source and read isolation.
  var rows = source.mainRows();
  if (!Array.isArray(rows) || rows.length > 1000 ||
      rows.some(function(r) { return !Array.isArray(r) || r.length !== 39; })) {
    throw new Error('D331_MOCK_EVENT_UNRESOLVED');
  }
  var matches = rows.filter(function(r) { return r[30] === request.eventId; });
  // Existing findEventRowById_ uses first-match; do NOT reuse it.
  if (matches.length !== 1) throw new Error('D331_MOCK_EVENT_UNRESOLVED');
  var areas = source.areaRows();
  if (!Array.isArray(areas) || areas.length > 1000 ||
      areas.some(function(r) { return !Array.isArray(r) || r.length !== 10; })) {
    throw new Error('D331_MOCK_AREA_UNRESOLVED');
  }
  var projected = d331N1bAuthorizeOffline_(
    user,matches[0],areas,grant,policy,request.operation,
    isWrite,isWrite ? request.expectedRevision : undefined);
  // Deliberately NOT a runtime authorization token or clinical output.
  return {simulationOnly:true, decision:'SIMULATED_ALLOW',
    eventId:projected.eventId, revision:projected.revision,
    areaId:projected.areaId, operation:projected.capability,
    mode:projected.mode};
}
