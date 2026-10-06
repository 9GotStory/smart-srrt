import fs from 'node:fs';

const server = fs.readFileSync('Code_Smart_SRRT_OneClick_v2026.09.08.1.gs', 'utf8');
const html = fs.readFileSync('Index_Smart_SRRT_OneClick.html', 'utf8');

function fail(message) {
  console.error('CONTRACT FAIL:', message);
  process.exitCode = 1;
}

try {
  new Function(server);
  console.log('SYNTAX PASS: server');
} catch (error) {
  fail('server syntax: ' + error.message);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(text => text.trim());

for (let i = 0; i < inlineScripts.length; i++) {
  try {
    new Function(inlineScripts[i]);
  } catch (error) {
    fail(`inline browser script ${i + 1} syntax: ${error.message}`);
  }
}
if (!process.exitCode) console.log('SYNTAX PASS: browser inline scripts');

const declarations = [...server.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
const counts = new Map();
for (const name of declarations) counts.set(name, (counts.get(name) || 0) + 1);
const duplicates = [...counts.entries()].filter(([,count]) => count > 1);
if (duplicates.length) fail('duplicate server functions: ' + duplicates.map(([n,c]) => `${n} x${c}`).join(', '));
else console.log(`FUNCTION PASS: ${declarations.length} unique server declarations`);

const serverNames = new Set(declarations);
const rpcNames = [...html.matchAll(/\bgs\(\s*['"]([A-Za-z_$][\w$]*)['"]/g)].map(m => m[1]);
const uniqueRpc = [...new Set(rpcNames)].sort();
const missing = uniqueRpc.filter(name => !serverNames.has(name));
if (missing.length) fail('browser RPC targets missing server functions: ' + missing.join(', '));
else console.log(`RPC PASS: ${uniqueRpc.length} unique browser targets resolved`);

if (/\browNumber\b/.test(html)) fail('browser contains forbidden physical Event rowNumber reference');
else console.log('IDENTITY PASS: browser has no physical Event rowNumber reference');

if (/\.includes\(\s*['"]เข้าเกณฑ์['"]\s*\)|indexOf\(\s*['"]เข้าเกณฑ์['"]\s*\)/.test(html)) {
  fail('browser reimplements forbidden substring criteria KPI logic');
} else {
  console.log('KPI PASS: browser has no substring criteria matcher');
}

if (/function\s+deleteRecord[\s\S]*?deleteRow\s*\(/.test(server.match(/function\s+deleteRecord[\s\S]*?(?=\nfunction\s)/)?.[0] || '')) {
  fail('Event deleteRecord performs physical deleteRow');
} else {
  console.log('INTEGRITY PASS: Event deleteRecord is non-destructive');
}

if (process.exitCode) process.exit(process.exitCode);
