/**
 * D331 N1-C3-S2 — PURE OFFLINE deny-only envelope composer.
 * Unregistered with Native26; NOT a callable GAS API, trusted issuer,
 * Script/Spreadsheet binding reader, identity proof, or grant provider.
 * All methods are private helpers ending "_". No I/O or clock access.
 *
 * Valid test-local input, own enumerable data properties only:
 *   {requestId: 1..1000000000, nowMs: safe integer >= 1}
 *   {requestId, nowMs, reason: 'OFF'|'POLICY_HOLD'|'ERROR'}
 * Omitting reason yields OFF. Invalid/untrusted inputs return null.
 * NEVER pass untrusted browser inputs to a future real server issuer.
 */
function d331N1c3s2SafeInput_(raw) {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        Object.prototype.toString.call(raw) !== '[object Object]')
      return null;
    var keys=Reflect.ownKeys(raw);
    if (keys.length !== 2 && keys.length !== 3) return null;
    var allowed={requestId:true,nowMs:true,reason:true};
    var values=Object.create(null);
    for (var i=0;i<keys.length;i++) {
      var k=keys[i];
      if (typeof k !== 'string' ||
          !Object.prototype.hasOwnProperty.call(allowed,k)) return null;
      var d=Object.getOwnPropertyDescriptor(raw,k);
      if (!d || !d.enumerable ||
          !Object.prototype.hasOwnProperty.call(d,'value')) return null;
      values[k]=d.value;
    }
    if (!Object.prototype.hasOwnProperty.call(values,'requestId') ||
        !Object.prototype.hasOwnProperty.call(values,'nowMs')) return null;
    if (!Number.isSafeInteger(values.requestId) ||
        values.requestId < 1 || values.requestId > 1000000000 ||
        !Number.isSafeInteger(values.nowMs) || values.nowMs < 1 ||
        values.nowMs > Number.MAX_SAFE_INTEGER-30000) return null;
    var reason=Object.prototype.hasOwnProperty.call(values,'reason') ?
      values.reason : 'OFF';
    if (reason !== 'OFF' && reason !== 'POLICY_HOLD' &&
        reason !== 'ERROR') return null;
    return {requestId:values.requestId,nowMs:values.nowMs,reason:reason};
  } catch (_) {
    // Accessors/proxies/exceptions never echo secrets or trigger fallback.
    return null;
  }
}
function d331N1c3s2ComposeDenyOnly_(raw) {
  try {
    var input=d331N1c3s2SafeInput_(raw);
    if (!input) return null; // never synthesize a plausible signed authority
    // Injected clock only; fixed 30-second maximum lifetime for display denial.
    return Object.freeze({
      version:1,
      requestId:input.requestId,
      state:input.reason,
      issuedAtMs:input.nowMs,
      expiresAtMs:input.nowMs+30000
    });
  } catch (_) {
    return null;
  }
}
