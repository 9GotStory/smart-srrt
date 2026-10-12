/**
 * H0-B E2: isolated GET-only Apps Script Deployments metadata reader.
 * No Apps Script application code imports this file.
 * Needs independently approved operator, project and existing readonly OAuth scope.
 * Never print IDs, URLs, descriptions, names, token or raw Google responses.
 */
import { pathToFileURL } from 'node:url';

const API_ORIGIN = 'https://script.googleapis.com';
const ACCESS = new Set(['MYSELF', 'DOMAIN', 'ANYONE', 'ANYONE_ANONYMOUS']);
const EXECUTE_AS = new Set(['USER_ACCESSING', 'USER_DEPLOYING']);
const MAX_PAGES = 10;
const PAGE_SIZE = 50;
const MAX_DEPLOYMENTS = MAX_PAGES * PAGE_SIZE;

export class E2ReadError extends Error {
  constructor(code) {
    super(code);
    this.name = 'E2ReadError';
    this.code = code;
  }
}
function block(code) { throw new E2ReadError(code); }
function isRecord(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function band(n) {
  if (n === 0) return 'ZERO';
  if (n === 1) return 'ONE';
  if (n <= 5) return 'TWO_TO_FIVE';
  return 'SIX_OR_MORE';
}
function yesNo(v) { return v ? 'YES' : 'NO'; }
function classification(values) {
  if (!values.length) return 'UNKNOWN';
  if (values.some(x => x === 'UNKNOWN')) return 'UNKNOWN';
  return new Set(values).size === 1 ? values[0] : 'MIXED';
}

/**
 * Accept Apps Script API list response pages. Only enums and coarse counts
 * leave this function. Raw deployment IDs and descriptions are discarded.
 * An expected deployment ID is used only for local comparison, never output.
 */
export function summarizeE2Pages(pages, expectedDeploymentId = '') {
  if (!Array.isArray(pages) || !pages.length || pages.length > MAX_PAGES) {
    block('INVALID_PAGE_COUNT');
  }
  let count = 0;
  const webapps = [];
  const selected = [];
  for (const page of pages) {
    if (!isRecord(page) || !Array.isArray(page.deployments)) block('INVALID_API_SHAPE');
    for (const d of page.deployments) {
      if (!isRecord(d) || typeof d.deploymentId !== 'string' ||
          !Array.isArray(d.entryPoints)) block('INVALID_DEPLOYMENT_SHAPE');
      count += 1;
      if (count > MAX_DEPLOYMENTS) block('PAGE_CAPACITY_EXCEEDED');
      const entries = d.entryPoints.filter(e => {
        if (!isRecord(e) || typeof e.entryPointType !== 'string') block('INVALID_ENTRY_POINT');
        return e.entryPointType === 'WEB_APP';
      });
      for (const entry of entries) {
        const config = entry.webApp?.entryPointConfig;
        const access = ACCESS.has(config?.access) ? config.access : 'UNKNOWN';
        const executeAs = EXECUTE_AS.has(config?.executeAs) ? config.executeAs : 'UNKNOWN';
        const version = d.deploymentConfig?.versionNumber;
        const item = {
          access, executeAs,
          versionPresent: Number.isInteger(version) && version > 0,
        };
        webapps.push(item);
        if (expectedDeploymentId && d.deploymentId === expectedDeploymentId) selected.push(item);
      }
    }
  }

  // Without a pinned deployment ID, different /exec URLs cannot be
  // assumed to be the target: return aggregates and UNKNOWN target.
  const relevant = expectedDeploymentId ? selected : webapps;
  return {
    evidence_type: 'H0_B_E2_READONLY_METADATA',
    evidence_scope: 'DEPLOYMENT_METADATA_ONLY',
    deployment_count_band: band(count),
    webapp_count_band: band(webapps.length),
    expected_deployment_present: expectedDeploymentId ? yesNo(selected.length > 0) : 'UNKNOWN',
    additional_webapp_deployments:
      webapps.length === 0 ? 'UNKNOWN' : yesNo(webapps.length > (expectedDeploymentId ? selected.length : 1)),
    webapp_access: classification(relevant.map(x => x.access)),
    execute_as: classification(relevant.map(x => x.executeAs)),
    published_version_present: relevant.length ? yesNo(relevant.every(x => x.versionPresent)) : 'UNKNOWN',
    // API completeness is not proof a human approved target or verified MFA.
    e2_result: 'METADATA_ONLY_OPERATOR_REVIEW_REQUIRED',
    e1_mfa_coverage: 'NOT_COLLECTED',
    adr_auth_01: 'PROPOSED',
    apps_script_deployment: 'HOLD',
  };
}

/**
 * Make only the documented Apps Script deployments.list GET endpoint request.
 * Fetch is injectable for synthetic tests; tests must not use real network.
 */
export async function fetchE2Pages({
  scriptId, accessToken, fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof scriptId !== 'string' || !/^[A-Za-z0-9_-]{12,200}$/.test(scriptId)) {
    block('INVALID_SCRIPT_ID_INPUT');
  }
  if (typeof accessToken !== 'string' || !accessToken.trim()) block('TOKEN_NOT_PROVIDED');
  if (typeof fetchImpl !== 'function') block('INVALID_FETCH_CONFIG');
  const pages = [];
  const seen = new Set();
  let token = '';
  for (let index = 0; index < MAX_PAGES; index += 1) {
    const url = new URL('/v1/projects/' + encodeURIComponent(scriptId) + '/deployments', API_ORIGIN);
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    if (token) url.searchParams.set('pageToken', token);
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' },
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      block('API_NETWORK_OR_TIMEOUT');
    }
    if (!response || typeof response.status !== 'number') block('INVALID_HTTP_RESPONSE');
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) block('API_NOT_AUTHORIZED');
      if (response.status === 404) block('PROJECT_NOT_AVAILABLE');
      if (response.status === 429) block('API_RATE_LIMITED');
      block('API_REQUEST_FAILED');
    }
    let body;
    try { body = await response.json(); } catch { block('API_JSON_INVALID'); }
    if (!isRecord(body) || !Array.isArray(body.deployments)) block('INVALID_API_SHAPE');
    pages.push(body);
    const next = body.nextPageToken;
    if (next === undefined || next === null || next === '') return pages;
    if (typeof next !== 'string' || next.length > 2048 || seen.has(next)) {
      block('INVALID_PAGINATION');
    }
    seen.add(next);
    token = next;
  }
  block('PAGINATION_LIMIT_REACHED');
}

/**
 * Explicit operator gate. Never discover identities, IDs or credentials from
 * Google Drive, local Google account files, or source repository.
 */
export async function inspectE2({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (env.H0_E2_APPROVED_READONLY !== 'YES') block('HUMAN_GATE_NOT_ACKNOWLEDGED');
  if (env.H0_E2_TARGET_CONFIRMED !== 'YES') block('TARGET_NOT_CONFIRMED');
  const pages = await fetchE2Pages({
    scriptId: env.H0_E2_SCRIPT_ID,
    accessToken: env.H0_E2_ACCESS_TOKEN,
    fetchImpl,
  });
  return summarizeE2Pages(pages, env.H0_E2_EXPECTED_DEPLOYMENT_ID || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--approved-readonly') {
    process.stdout.write(JSON.stringify({
      e2_result: 'BLOCKED',
      error_class: 'EXPLICIT_READONLY_FLAG_REQUIRED',
      apps_script_deployment: 'HOLD',
    }) + '\n');
    process.exitCode = 2;
  } else {
    try {
      process.stdout.write(JSON.stringify(await inspectE2()) + '\n');
    } catch (e) {
      // Never print arbitrary exception messages, URLs, tokens or raw API body.
      process.stdout.write(JSON.stringify({
        e2_result: 'BLOCKED',
        error_class: e instanceof E2ReadError ? e.code : 'UNEXPECTED_FAILURE',
        apps_script_deployment: 'HOLD',
      }) + '\n');
      process.exitCode = 1;
    }
  }
}
