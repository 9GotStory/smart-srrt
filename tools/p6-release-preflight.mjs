import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectNativeRelease } from './native-release-inspection.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = Object.freeze([
  ['migrateP1EventIdentity', 2, 'Backfills EventID/Revision/RecordStatus in MainData'],
  ['migrateG05EventOwner', 3, 'Adds Event owner column'],
  ['migrateG11EventAttachments', 4, 'Creates/validates attachment registry and Drive folder'],
  ['migrateG21AuditRetention', 5, 'Updates audit schema and may create archive spreadsheet'],
  ['migrateG29VisitLogs', 6, 'Validates/migrates VisitLogs header semantics'],
  ['migrateG17ReportRegistry', 7, 'Creates/validates ReportRegistry']
]);

function codeBlock(source, name) {
  const marker = new RegExp('^function\\s+' + name + '\\s*\\(', 'm');
  const match = marker.exec(source);
  if (!match) return '';
  const next = source.slice(match.index + 1).search(/^function\s+[A-Za-z_$][\w$]*\s*\(/m);
  return source.slice(match.index, next < 0 ? source.length : match.index + 1 + next);
}

function guard(checks, id, condition, detail) {
  checks.push({ id, status:condition ? 'PASS' : 'FAIL', detail });
}

/**
 * Inspects canonical Native source, expanded Index and exact staged files.
 * Does not create a stage, change source, deploy, or call any Google service.
 */
export function runOfflinePreflight(root = DEFAULT_ROOT) {
  const snapshot=inspectNativeRelease(root);
  const checks=[...snapshot.checks];
  const artifacts=snapshot.artifacts;
  const server=snapshot.server;
  const html=snapshot.html;
  const rawVersion = /SCHEMA_VERSION:\s*['"](\d+)['"]/.exec(server);
  const schemaVersion = rawVersion ? Number(rawVersion[1]) : null;
  guard(checks, 'schema-version', schemaVersion === 7, 'Expected application schema v7; observed ' + (schemaVersion ?? 'missing'));

  const migrations = MIGRATIONS.map(([name, floor, sideEffect]) => {
    const block = codeBlock(server, name);
    const lock = /LockService\.getScriptLock\(\)/.test(block) && /lock\.releaseLock\(\)/.test(block);
    const floorGuard = new RegExp('Math\\.max\\(existingSchemaVersion,\\s*' + floor + '\\)').test(block);
    guard(checks, 'migration:' + name, Boolean(block) && floorGuard && lock, 'Expected version floor ' + floor + ' with script lock; actual execution not attempted');
    return {name, schemaFloor:floor, possibleSideEffects:sideEffect, execution:'NOT_RUN', dryRun:false};
  });

  const installer = codeBlock(server, 'installSmartSRRTCore_');
  const installerIsMutating = /ensureSheet_\(ss/.test(installer)
    && /seedSettings_\(ss/.test(installer)
    && /ensureSystemAssets_\(ss/.test(installer)
    && /ensureAuditArchiveSpreadsheet_\(ss/.test(installer);
  guard(checks, 'installer-side-effects', installerIsMutating,
    'Installer must be treated as a WRITE operation, never as a read-only preflight');

  const publicDashboard = codeBlock(server, 'getPublicDashboardData');
  const history = codeBlock(server, 'listReportsForEvent');
  const readiness = codeBlock(server, 'getAIReportReadiness');
  const generation = codeBlock(server, 'generateReportFromWeb');
  guard(checks, 'privacy-boundary', /buildDashboardAggregate_\(getFilteredEventRows_/.test(publicDashboard),
    'Public Dashboard must continue through aggregate contract');
  guard(checks, 'report-history-auth', /requireAuth_\(sessionToken, 'report'\)/.test(history),
    'Event report history requires report permission');
  guard(checks, 'report-history-void', /findEventRowById_\(main, eventId, false\)/.test(history),
    'Event history must reject void Event identity');
  guard(checks, 'g26-warning', Boolean(readiness),
    'G-26 latest-state advisory RPC remains present');
  guard(checks, 'readiness-report-auth',
    /requireAuth_\(sessionToken, 'report'\)/.test(readiness),
    'G-26 pre-generation readiness RPC must require report permission');
  guard(checks, 'readiness-void-boundary',
    /findEventRowById_\(sheet, eventId, false\)/.test(readiness),
    'G-26 readiness RPC must reject void Event identity');
  guard(checks, 'generation-report-auth',
    /requireAuth_\(sessionToken, 'report'\)/.test(generation),
    'AI report generation must require report permission');
  guard(checks, 'generation-void-boundary',
    /findEventRowById_\(sheet, eventId, false\)/.test(generation),
    'AI report generation must reject void Event identity');
  guard(checks, 'generation-registry-commit',
    /document\.saveAndClose\(\);[\s\S]*appendReportRegistry_\(\{/.test(generation)
      && /newDocFile\.setTrashed\(true\)/.test(generation),
    'Generated Doc must be saved then registered, with orphan compensation on failure');
  guard(checks, 'report-registry', /var REPORT_REGISTRY_HEADERS\s*=\s*\[[\s\S]*?'TemplateDocID'/.test(server),
    'ReportRegistry original 11-header declaration remains present');

  const serverFns = [...server.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
  const names = new Set(serverFns);
  guard(checks, 'unique-server-functions', serverFns.length >= 150 && names.size === serverFns.length,
    'All top-level server function names must be unique');
  const rpcNames = [...new Set([...html.matchAll(/\bgs\(\s*['"]([\w$]+)['"]/g)].map(m => m[1]))];
  guard(checks, 'browser-rpc-targets', rpcNames.length >= 40 && rpcNames.every(n => names.has(n)),
    'All literal browser RPC targets must resolve on server');

  return {
    tool:'Smart SRRT P6 Offline Release Preflight',
    mode:'READ_ONLY_SOURCE_INSPECTION',
    codeGate:checks.every(x => x.status === 'PASS') ? 'PASS' : 'FAIL',
    releaseDecision:'HOLD',
    schemaVersion,
    artifacts,
    migrationOrder:migrations,
    checks,
    humanGates:[
      'Verified restricted backups and recorded current installation configuration',
      'Representative legacy staging dataset and migration/restore rehearsal',
      'Live Apps Script RBAC, public privacy and Event workflow testing',
      'Live Gemini, Google Docs/Drive template and registered report history',
      'Human Product Owner technical review and explicit separate production go/no-go'
    ],
    disclaimer:'This command inspects Native source and an existing offline 14-file stage without writes. It does not execute migrations, installer, Google Apps Script, external APIs, staging creation, or production. Code PASS is not release authorization.'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) {
    console.error('Usage: node tools/p6-release-preflight.mjs (no arguments, read-only)');
    process.exitCode = 2;
  } else {
    const result = runOfflinePreflight();
    console.log(JSON.stringify(result, null, 2));
    if (result.codeGate !== 'PASS') process.exitCode = 1;
  }
}
