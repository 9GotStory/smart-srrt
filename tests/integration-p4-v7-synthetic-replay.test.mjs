import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {
  planSyntheticP4ToV7,SYNTHETIC_KIND,P4_MAIN,P4_AUDIT,P4_ARCHIVE
} from '../tools/p4-v7-offline-transform.mjs';
import {
  P4_EVENT_ATTACHMENT_HEADERS,P4_VISIT_HEADERS
} from '../tools/p4-v7-schema-preflight.mjs';
import {
  createSyntheticDisposableTarget,replaySyntheticPartialCopy,SYNTHETIC_TARGET_KIND
} from '../tools/p4-v7-synthetic-replay.mjs';

const id1='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
const aid1='33333333-3333-4333-8333-333333333333';
const aid2='44444444-4444-4444-8444-444444444444';
const ts='2026-10-08T10:30:00+07:00';
const author='synthetic@example.invalid';
const row=(id)=>{
  const r=Array(44).fill('');
  r[30]=id;r[31]=3;r[32]='active';r[33]=ts;r[34]=author;
  r[38]='IN_PROGRESS';r[39]='owner-1';r[16]='เข้าเกณฑ์';
  return r;
};
const attachment=(id,event)=>[id,event,'mock-file-id','synthetic.pdf','application/pdf',12,
  'https://example.invalid/synthetic-only','mock-only','active',ts,author];
const audit=(event)=>[ts,author,'Manager','SYNTHETIC_EVENT','MainData',event,'before','after',''];
function fixture(){
  return {
    kind:SYNTHETIC_KIND,syntheticOnly:true,snapshotId:'synthetic-recovery-fixture',
    headers:{main:[...P4_MAIN],attachments:[...P4_EVENT_ATTACHMENT_HEADERS],
      audit:[...P4_AUDIT],auditArchive:[...P4_ARCHIVE],visits:[...P4_VISIT_HEADERS]},
    rows:{main:[row(id1),row(id2)],attachments:[attachment(aid1,id1),attachment(aid2,id2)],
      audit:[audit(id1),audit(id2)],auditArchive:[],visits:[]},
    users:[{userId:'owner-1',active:true}]
  };
}
const setup=()=>{const source=fixture();const plan=planSyntheticP4ToV7(source);
  const target=createSyntheticDisposableTarget(plan);
  return {source,plan,target};
};
const copy=x=>structuredClone(x);
const complete=(plan,target)=>replaySyntheticPartialCopy(plan,target);
const totals=r=>Object.values(r.counts).reduce((a,b)=>a+b,0);

test('offline synthetic plan creates a disposable empty v7 target only',()=>{
  const {plan,target}=setup();
  assert.equal(plan.status,'HOLD');
  assert.equal(target.kind,SYNTHETIC_TARGET_KIND);
  assert.deepEqual(Object.keys(target.sheets),['main','attachments','audit']);
  assert.equal(target.sheets.main.headers.length,39);
  assert.equal(target.sheets.attachments.headers.length,13);
  assert.equal(target.sheets.audit.headers.length,10);
  assert.deepEqual(Object.values(target.sheets).map(x=>x.rows.length),[0,0,0]);
});
test('complete preview copies every synthetic row with exact columns, not history or real visits',()=>{
  const {source,plan,target}=setup();
  const untouched=copy(source);
  const out=complete(plan,target);
  assert.equal(out.phase,'preview_complete');
  assert.deepEqual(out.counts,{main:2,attachments:2,audit:2});
  assert.equal(out.appendedRows,6);
  assert.equal(out.reusedRows,0);
  assert.equal(out.status,'HOLD');
  assert.equal(out.migrationAuthorized,false);
  assert.equal(out.realDataAllowed,false);
  assert.equal(out.externalWritesPerformed,false);
  assert.equal(out.independentReviewSatisfied,false);
  for(const name of ['main','attachments','audit'])
    assert.deepEqual(out.target.sheets[name].rows,plan.candidate[name].rows);
  assert.deepEqual(source,untouched);
  assert.deepEqual(Object.values(target.sheets).map(x=>x.rows.length),[0,0,0]);
});
test('injected interruption at zero writes is a safe no-op',()=>{
  const {plan,target}=setup();
  const out=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:0});
  assert.equal(out.phase,'interrupted');
  assert.equal(out.appendedRows,0);
  assert.equal(totals(out),0);
  assert.equal(out.status,'HOLD');
  assert.deepEqual(out.target,target);
});
test('interrupt after every possible prefix then resume exactly without duplicate rows',()=>{
  const {plan,target}=setup();
  const clean=complete(plan,target);
  for(let stop=0;stop<6;stop++){
    const partial=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:stop});
    assert.equal(partial.phase,'interrupted');
    assert.equal(totals(partial),stop);
    assert.equal(partial.appendedRows,stop);
    const resumed=complete(plan,copy(partial.target));
    assert.equal(resumed.phase,'preview_complete');
    assert.equal(resumed.appendedRows,6-stop);
    assert.equal(resumed.reusedRows,stop);
    assert.equal(resumed.targetDigest,clean.targetDigest);
    assert.deepEqual(resumed.target,clean.target);
  }
});
test('interruption exactly after all copy operations is a preview, not a release',()=>{
  const {plan,target}=setup();
  const r=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:6});
  assert.equal(r.phase,'preview_complete');
  assert.equal(r.appendedRows,6);
  assert.equal(r.migrationAuthorized,false);
});
test('repeated resume is idempotent and preserves UUIDs across all sheets',()=>{
  const {plan,target}=setup();
  const partial=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:3});
  const resumed=complete(plan,partial.target);
  const again=complete(plan,copy(resumed.target));
  assert.equal(again.appendedRows,0);
  assert.equal(again.reusedRows,6);
  assert.equal(again.targetDigest,resumed.targetDigest);
  assert.deepEqual(again.target,resumed.target);
});
test('a newly restored disposable target reproduces the clean deterministic preview',()=>{
  const {plan,target}=setup();
  const half=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:2});
  const afterCrash=complete(plan,copy(half.target));
  const freshlyRestored=complete(plan,createSyntheticDisposableTarget(plan));
  assert.equal(afterCrash.targetDigest,freshlyRestored.targetDigest);
  assert.deepEqual(afterCrash.tableDigests,freshlyRestored.tableDigests);
});
test('same identity but mutated payload in interrupted main target fails closed',()=>{
  const {plan,target}=setup();
  const out=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:1});
  const spoiled=copy(out.target);
  spoiled.sheets.main.rows[0][5]='tampered synthetic disease';
  const snapshot=copy(spoiled);
  assert.throws(()=>complete(plan,spoiled),/SYNTHETIC_RECOVERY_TARGET_CONFLICT/);
  assert.deepEqual(spoiled,snapshot);
});
test('audit ID match with different audit payload fails instead of skipping',()=>{
  const {plan,target}=setup();
  const out=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:5});
  const spoiled=copy(out.target);
  assert.equal(spoiled.sheets.audit.rows.length,1);
  spoiled.sheets.audit.rows[0][7]='mismatched after value';
  assert.throws(()=>complete(plan,spoiled),/TARGET_CONFLICT/);
});
test('attachment ID match with mismatched FileID also fails closed',()=>{
  const {plan,target}=setup();
  const out=replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:4});
  const spoiled=copy(out.target);
  spoiled.sheets.attachments.rows[0][2]='different synthetic file id';
  assert.throws(()=>complete(plan,spoiled),/TARGET_CONFLICT/);
});
test('extra target rows or duplicated audit entries cannot be silently accepted',()=>{
  const {plan,target}=setup();
  const all=complete(plan,target).target;
  const extra=copy(all);extra.sheets.audit.rows.push([...extra.sheets.audit.rows[0]]);
  assert.throws(()=>complete(plan,extra),/TARGET_EXTRA_ROWS/);
  const reorder=copy(all);reorder.sheets.audit.rows.reverse();
  assert.throws(()=>complete(plan,reorder),/TARGET_CONFLICT/);
});
test('replay forbids a later-sheet prefix while earlier main rows are missing',()=>{
  const {plan,target}=setup();
  const partial=copy(target);
  partial.sheets.attachments.rows.push([...plan.candidate.attachments.rows[0]]);
  assert.throws(()=>complete(plan,partial),/NONPREFIX_REPLAY/);
});
test('mixed source snapshot, changed users, or changed snapshot identity cannot resume',()=>{
  const {source,plan,target}=setup();
  source.users[0].active=false;
  const changed=planSyntheticP4ToV7(source);
  assert.throws(()=>complete(changed,target),/SOURCE_HOLDS/);
  const newSource=fixture();newSource.rows.main[0][5]='synthetic new label';
  const different=planSyntheticP4ToV7(newSource);
  assert.throws(()=>complete(different,target),/SNAPSHOT_MISMATCH/);
  const swapped=copy(target);swapped.snapshotId='synthetic-another';
  assert.throws(()=>complete(plan,swapped),/SNAPSHOT_MISMATCH/);
});
test('unknown header, omitted sheet, Date object and swapped table are rejected',()=>{
  const {plan,target}=setup();
  const invalid=copy(target);invalid.sheets.main.headers[38]='WorkflowStatus';
  assert.throws(()=>complete(plan,invalid),/SCHEMA_MISMATCH/);
  const missing=copy(target);delete missing.sheets.audit;
  assert.throws(()=>complete(plan,missing),/SHEET_SET/);
  const date=copy(target);date.sheets.main.rows.push([...plan.candidate.main.rows[0]]);
  date.sheets.main.rows[0][33]=new Date('2026-10-08T03:30:00Z');
  assert.throws(()=>complete(plan,date),/ROW_SHAPE/);
});
test('candidate digest tamper fails before any preview operation',()=>{
  const {plan,target}=setup();
  const spoof=copy(plan);spoof.candidate.main.rows[0][5]='changed after signing';
  assert.throws(()=>complete(spoof,target),/CANDIDATE_DIGEST/);
});
test('historical VisitLogs, archived attachments or archived audit rows block rehearsal',()=>{
  const a=fixture();a.rows.visits.push([ts,'doGet','SYNTHETIC_PRIVATE_QUERY']);
  const p=planSyntheticP4ToV7(a);
  assert.throws(()=>createSyntheticDisposableTarget(p),/SOURCE_HOLDS/);
  const b=fixture();b.rows.attachments[0][8]='archived';
  assert.throws(()=>createSyntheticDisposableTarget(planSyntheticP4ToV7(b)),/SOURCE_HOLDS/);
  const c=fixture();
  c.rows.auditArchive.push(['a'.repeat(64),...audit(id2),ts,author]);
  assert.throws(()=>createSyntheticDisposableTarget(planSyntheticP4ToV7(c)),/SOURCE_HOLDS/);
});
test('invalid event identity and invalid audit ledger block the disposable preview',()=>{
  const {plan}=setup();
  const p=copy(plan);p.auditIdentityLedger[0].syntheticAuditId=id1;
  assert.throws(()=>createSyntheticDisposableTarget(p),/AUDIT_LEDGER/);
});
test('untrusted arbitrary instructions, negative/bad interruption and real records fail closed',()=>{
  const {plan,target}=setup();
  assert.throws(()=>replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:-1}),/OPTIONS_SHAPE/);
  assert.throws(()=>replaySyntheticPartialCopy(plan,target,{interruptAfterWrites:0.5}),/OPTIONS_SHAPE/);
  assert.throws(()=>replaySyntheticPartialCopy(plan,target,{staging:true}),/OPTIONS_SHAPE/);
  assert.throws(()=>replaySyntheticPartialCopy(plan,null),/TARGET_SHAPE/);
  assert.throws(()=>createSyntheticDisposableTarget({...plan,realDataAllowed:true}),/FIXTURE_ONLY/);
  assert.throws(()=>createSyntheticDisposableTarget({...plan,migrationAuthorized:true}),/FIXTURE_ONLY/);
});
test('all reported evidence is hash/count metadata, not raw patient or attachment cells',()=>{
  const {plan,target}=setup();
  const out=complete(plan,target);
  const summary=Object.fromEntries(Object.entries(out).filter(([k])=>k!=='target'));
  assert.equal(JSON.stringify(summary).includes('synthetic-file-id'),false);
  assert.equal(JSON.stringify(summary).includes('https://example.invalid/'),false);
  assert.ok(/^[a-f0-9]{64}$/.test(summary.targetDigest));
});
test('synthetic replay code imports no I/O, Google clients or network writers',()=>{
  const src=fs.readFileSync(new URL('../tools/p4-v7-synthetic-replay.mjs',import.meta.url),'utf8');
  for(const phrase of ['DriveApp.','SpreadsheetApp.','UrlFetchApp.','google.script.run',
    'fetch(','writeFile(','createFile(','setValues(','appendRow('])
    assert.equal(src.includes(phrase),false);
  assert.doesNotMatch(src,/from\s+['"](?:node:(?:fs|http|https|net|child_process)|googleapis)/);
});

const candidateDigest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('source count mismatch refuses dropped synthetic event even after new candidate digest',()=>{
  const {plan}=setup();
  const tampered=copy(plan);
  tampered.candidate.main.rows.pop();
  // Simulate a misleading new candidate digest and a matching target count.
  tampered.candidateDigest=candidateDigest(tampered.candidate);
  tampered.counts.candidate.main=1;
  assert.throws(()=>createSyntheticDisposableTarget(tampered),/COUNT_MISMATCH/);
});
test('source count mismatch refuses dropped audit and attachment candidate rows',()=>{
  const {plan}=setup();
  for(const sheet of ['audit','attachments']){
    const tampered=copy(plan);
    tampered.candidate[sheet].rows.pop();
    tampered.candidateDigest=candidateDigest(tampered.candidate);
    tampered.counts.candidate[sheet]=1;
    assert.throws(()=>createSyntheticDisposableTarget(tampered),/COUNT_MISMATCH/);
  }
});
test('missing or substituted source evidence cannot become a valid synthetic preview',()=>{
  const {plan}=setup();
  const missing=copy(plan);
  missing.legacyEvidence.workflow.pop();
  assert.throws(()=>createSyntheticDisposableTarget(missing),/SOURCE_EVIDENCE/);
  const wrong=copy(plan);
  wrong.legacyEvidence.attachments[0].fileId='replaced synthetic file';
  assert.throws(()=>createSyntheticDisposableTarget(wrong),/SOURCE_EVIDENCE/);
  const moved=copy(plan);
  moved.legacyEvidence.workflow[0].rowNumber=999;
  assert.throws(()=>createSyntheticDisposableTarget(moved),/SOURCE_EVIDENCE/);
});
test('excluded historical sheets cannot spoof valid preview with forged headers',()=>{
  const {plan}=setup();
  for(const sheet of ['auditArchive','visits']){
    const tampered=copy(plan);
    tampered.candidate[sheet].headers[1]='UnknownHeader';
    tampered.candidateDigest=candidateDigest(tampered.candidate);
    assert.throws(()=>createSyntheticDisposableTarget(tampered),/UNRESOLVED_HISTORY|SCHEMA_MISMATCH/);
  }
});
test('source counts for excluded archived audit and visit rows must be zero',()=>{
  const {plan}=setup();
  for(const sheet of ['auditArchive','visits']){
    const tampered=copy(plan);
    tampered.counts.source[sheet]=1;
    assert.throws(()=>createSyntheticDisposableTarget(tampered),/COUNT_MISMATCH/);
  }
});