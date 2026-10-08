import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ONE_CLICK_TARGETS } from './build-one-click.mjs';

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

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Only reads local committed source and release files. Does NOT invoke Apps Script,
 * Google APIs, write files, validate actual deployment, or perform migrations.
 */
export function runOfflinePreflight(root = DEFAULT_ROOT) {
  const checks = [];
  const artifacts = [];
  const contents = new Map();
  for (const entry of ONE_CLICK_TARGETS) {
    let compiled = null;
    let generated = null;
    try {
      compiled = fs.readFileSync(path.join(root, entry.target));
      generated = Buffer.concat(entry.sources.map(name => fs.readFileSync(path.join(root, name))));
    } catch (e) {
      guard(checks, 'artifact:' + entry.target, false, 'Missing or unreadable source/artifact: ' + e.code);
      continue;
    }
    const same = compiled.equals(generated);
    guard(checks, 'artifact:' + entry.target, same, same ? 'Byte-exact modular parity' : 'Generated artifact does not match its source modules');
    artifacts.push({path:entry.target, sha256:sha256(compiled), bytes:compiled.length, sourceParts:entry.sources.length});
    contents.set(entry.target, compiled.toString('utf8'));
  }

  const server = contents.get('Code_Smart_SRRT_OneClick_v2026.09.08.1.gs') || '';
  const html = contents.get('Index_Smart_SRRT_OneClick.html') || '';
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
  guard(checks, 'privacy-boundary', /buildDashboardAggregate_\(getFilteredEventRows_/.test(publicDashboard),
    'Public Dashboard must continue through aggregate contract');
  guard(checks, 'report-history-auth', /requireAuth_\(sessionToken, 'report'\)/.test(history),
    'Event report history requires report permission');
  guard(checks, 'report-history-void', /findEventRowById_\(main, eventId, false\)/.test(history),
    'Event history must reject void Event identity');
  guard(checks, 'g26-warning', /function getAIReportReadiness\(sessionToken, eventId\)/.test(server),
    'G-26 latest-state advisory RPC remains present');
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
      'Independent human review and explicit production go/no-go'
    ],
    disclaimer:'This command does not execute migrations, installer, Google Apps Script, external APIs, staging, or production. Code PASS is not release authorization.'
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
