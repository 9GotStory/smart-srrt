import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  E2ReadError, summarizeE2Pages, fetchE2Pages, inspectE2,
} from '../tools/h0-e2-deployments-readonly.mjs';

const SECRET_ID = 'AKfysyntheticSensitiveDeploymentId2026';
const SCRIPT_ID = 'SyntheticScriptId01234567890123';
const SECRET_URL = 'https://script.google.com/macros/s/SENSITIVE_TEST_ENDPOINT/exec';
const SECRET_EMAIL = 'person-synthetic-secret@example.invalid';
const TOKEN = 'synthetic-token-never-output-XYZ';

function webApp(id, access = 'DOMAIN', executeAs = 'USER_DEPLOYING', versionNumber = 10) {
  return {
    deploymentId: id,
    deploymentConfig: { scriptId: SCRIPT_ID, versionNumber, description: SECRET_EMAIL },
    entryPoints: [{
      entryPointType: 'WEB_APP',
      webApp: {
        url: SECRET_URL,
        entryPointConfig: { access, executeAs },
      },
    }],
  };
}
function fakeResponse(data, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => data };
}
function assertCode(code) {
  return e => e instanceof E2ReadError && e.code === code;
}

test('H0-E2 sanitized report returns approved enums and omits raw IDs URLs descriptions and secrets', () => {
  const result = summarizeE2Pages([
    { deployments: [webApp(SECRET_ID, 'ANYONE_ANONYMOUS', 'USER_DEPLOYING')] },
  ], SECRET_ID);
  assert.equal(result.expected_deployment_present, 'YES');
  assert.equal(result.webapp_access, 'ANYONE_ANONYMOUS');
  assert.equal(result.execute_as, 'USER_DEPLOYING');
  assert.equal(result.published_version_present, 'YES');
  assert.equal(result.apps_script_deployment, 'HOLD');
  const out = JSON.stringify(result);
  for (const forbidden of [SECRET_ID, SCRIPT_ID, SECRET_URL, SECRET_EMAIL, TOKEN, 'versionNumber', 'deploymentId']) {
    assert.ok(!out.includes(forbidden), forbidden + ' leaked in sanitized result');
  }
});

test('H0-E2 deployment not pinned returns aggregate only; mixed modes never imply one verified target', () => {
  const result = summarizeE2Pages([{
    deployments: [
      webApp('a', 'DOMAIN', 'USER_ACCESSING'),
      webApp('b', 'ANYONE_ANONYMOUS', 'USER_DEPLOYING'),
    ],
  }]);
  assert.equal(result.expected_deployment_present, 'UNKNOWN');
  assert.equal(result.webapp_access, 'MIXED');
  assert.equal(result.execute_as, 'MIXED');
  assert.equal(result.additional_webapp_deployments, 'YES');
  assert.equal(result.e1_mfa_coverage, 'NOT_COLLECTED');
});

test('H0-E2 matching expected deployment excludes unrelated webapp from target access and execute-as', () => {
  const result = summarizeE2Pages([{
    deployments: [
      webApp('known', 'DOMAIN', 'USER_ACCESSING'),
      webApp('other', 'ANYONE_ANONYMOUS', 'USER_DEPLOYING'),
    ],
  }], 'known');
  assert.equal(result.webapp_access, 'DOMAIN');
  assert.equal(result.execute_as, 'USER_ACCESSING');
  assert.equal(result.additional_webapp_deployments, 'YES');
  assert.equal(result.webapp_count_band, 'TWO_TO_FIVE');
});

test('H0-E2 absent target cannot be asserted present or inferred from alternative deployment', () => {
  const result = summarizeE2Pages([{ deployments: [webApp('other')] }], 'not-present');
  assert.equal(result.expected_deployment_present, 'NO');
  assert.equal(result.webapp_access, 'UNKNOWN');
  assert.equal(result.execute_as, 'UNKNOWN');
  assert.equal(result.published_version_present, 'UNKNOWN');
});

test('H0-E2 unknown API enum and missing version cannot masquerade as secure mode', () => {
  const result = summarizeE2Pages([{
    deployments: [webApp('known', 'UNKNOWN_ACCESS', 'UNKNOWN_EXECUTE_AS', 0)],
  }], 'known');
  assert.equal(result.webapp_access, 'UNKNOWN');
  assert.equal(result.execute_as, 'UNKNOWN');
  assert.equal(result.published_version_present, 'NO');
});

test('H0-E2 read uses only GET documented Google endpoint; pagination is bounded, redacted and complete', async () => {
  const calls = [];
  const impl = async (url, opts) => {
    calls.push({ url, opts });
    if (calls.length === 1) {
      return fakeResponse({
        deployments: [webApp('a')],
        nextPageToken: 'next-page-SYNTHETIC',
      });
    }
    return fakeResponse({ deployments: [webApp(SECRET_ID, 'DOMAIN', 'USER_ACCESSING')] });
  };
  const result = await inspectE2({
    env: {
      H0_E2_APPROVED_READONLY: 'YES',
      H0_E2_TARGET_CONFIRMED: 'YES',
      H0_E2_SCRIPT_ID: SCRIPT_ID,
      H0_E2_EXPECTED_DEPLOYMENT_ID: SECRET_ID,
      H0_E2_ACCESS_TOKEN: TOKEN,
    },
    fetchImpl: impl,
  });
  assert.equal(calls.length, 2);
  for (const x of calls) {
    const url = new URL(x.url);
    assert.equal(url.origin, 'https://script.googleapis.com');
    assert.equal(url.pathname, '/v1/projects/' + SCRIPT_ID + '/deployments');
    assert.equal(x.opts.method, 'GET');
    assert.equal(x.opts.redirect, 'error');
    assert.equal(x.opts.cache, 'no-store');
    assert.equal(x.opts.headers.Authorization, 'Bearer ' + TOKEN);
    assert.equal(url.searchParams.get('pageSize'), '50');
  }
  assert.equal(new URL(calls[1].url).searchParams.get('pageToken'), 'next-page-SYNTHETIC');
  assert.equal(result.webapp_count_band, 'TWO_TO_FIVE');
  assert.equal(result.webapp_access, 'DOMAIN');
  assert.equal(result.execute_as, 'USER_ACCESSING');
  const out = JSON.stringify(result);
  for (const forbidden of [SECRET_ID, SCRIPT_ID, SECRET_URL, SECRET_EMAIL, TOKEN, 'next-page-SYNTHETIC']) {
    assert.ok(!out.includes(forbidden), 'sensitive data leaked');
  }
});

test('H0-E2 operator and target gates prevent any network request', async () => {
  let calls = 0;
  const mock = async () => { calls += 1; throw new Error('should not be called'); };
  await assert.rejects(inspectE2({env:{},fetchImpl:mock}),assertCode('HUMAN_GATE_NOT_ACKNOWLEDGED'));
  await assert.rejects(inspectE2({
    env:{H0_E2_APPROVED_READONLY:'YES'},fetchImpl:mock,
  }),assertCode('TARGET_NOT_CONFIRMED'));
  assert.equal(calls,0);
});

test('H0-E2 reject malformed IDs, missing token and malicious Google API error bodies', async () => {
  let called = 0;
  const mock = async () => { called += 1; return fakeResponse({error:{message: SECRET_EMAIL}},403); };
  await assert.rejects(fetchE2Pages({
    scriptId:'../../steal',accessToken:TOKEN,fetchImpl:mock,
  }),assertCode('INVALID_SCRIPT_ID_INPUT'));
  await assert.rejects(fetchE2Pages({
    scriptId:SCRIPT_ID,accessToken:'',fetchImpl:mock,
  }),assertCode('TOKEN_NOT_PROVIDED'));
  await assert.rejects(fetchE2Pages({
    scriptId:SCRIPT_ID,accessToken:TOKEN,fetchImpl:mock,
  }),assertCode('API_NOT_AUTHORIZED'));
  assert.equal(called,1);
});

test('H0-E2 fail closed on invalid API shape, repeating page tokens and too many pages', async () => {
  assert.throws(() => summarizeE2Pages([{deployments:null}]),assertCode('INVALID_API_SHAPE'));
  assert.throws(() => summarizeE2Pages([{deployments:[{deploymentId:'a'}]}]),
    assertCode('INVALID_DEPLOYMENT_SHAPE'));
  await assert.rejects(fetchE2Pages({
    scriptId:SCRIPT_ID,accessToken:TOKEN,
    fetchImpl:async () => fakeResponse({deployments:[],nextPageToken:'same-token'}),
  }),assertCode('INVALID_PAGINATION'));
  let n=0;
  await assert.rejects(fetchE2Pages({
    scriptId:SCRIPT_ID,accessToken:TOKEN,
    fetchImpl:async () => fakeResponse({deployments:[],nextPageToken:'page-' + (++n)}),
  }),assertCode('PAGINATION_LIMIT_REACHED'));
  assert.equal(n,10);
});

test('H0-E2 network failures never propagate untrusted error text and CLI without flag is inert', async () => {
  await assert.rejects(fetchE2Pages({
    scriptId:SCRIPT_ID,accessToken:TOKEN,
    fetchImpl:async () => { throw new Error('secret=' + TOKEN + ' url=' + SECRET_URL); },
  }),assertCode('API_NETWORK_OR_TIMEOUT'));
  const spawned=spawnSync(process.execPath, ['tools/h0-e2-deployments-readonly.mjs'], {
    cwd: process.cwd(),encoding:'utf8',env:{PATH:process.env.PATH || ''},
  });
  assert.equal(spawned.status,2);
  const payload=JSON.parse(spawned.stdout);
  assert.equal(payload.e2_result,'BLOCKED');
  assert.equal(payload.apps_script_deployment,'HOLD');
  assert.equal(payload.error_class,'EXPLICIT_READONLY_FLAG_REQUIRED');
});
