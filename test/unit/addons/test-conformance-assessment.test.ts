import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error distributed addon JavaScript
import { assessConformance } from '../../../agentic/code/addons/testing-quality/lib/assessment.mjs';
// @ts-expect-error distributed addon JavaScript
import { collectEvidence } from '../../../agentic/code/addons/testing-quality/lib/collector.mjs';
// @ts-expect-error distributed addon JavaScript
import { inventoryWorkspace } from '../../../agentic/code/addons/testing-quality/lib/inventory.mjs';
// @ts-expect-error distributed addon JavaScript
import { artifact, digest, validateContract } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';
// @ts-expect-error distributed addon JavaScript
import { collectControls } from '../../../agentic/code/addons/testing-quality/lib/controls.mjs';
// @ts-expect-error distributed addon JavaScript
import { createPlan, applyPlan, rollbackPlan } from '../../../agentic/code/addons/testing-quality/lib/normalization.mjs';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
const fields = ['sut', 'claim', 'oracle', 'validity', 'isolation', 'determinism', 'normalization', 'maintainability', 'scope'];
async function fixture({ broken = false, policy = {} } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'conformance-assessment-')); roots.push(root);
  await fs.mkdir(path.join(root, 'src')); await fs.mkdir(path.join(root, 'tests'));
  await fs.writeFile(path.join(root, 'src/add.mjs'), `export const add = (a,b) => ${broken ? 'a-b' : 'a+b'};\n`);
  await fs.writeFile(path.join(root, 'tests/check.mjs'), `import assert from 'node:assert/strict';
import { add } from '../src/add.mjs';
const discovery = process.argv.includes('--discover');
let status = 'unknown';
if (!discovery) { try { assert.equal(add(2,3),5); status='passed'; } catch { status='failed'; process.exitCode=1; } }
console.log(JSON.stringify({complete:true,cases:[{file:'tests/check.mjs',name:'adds two inputs',status}],files:[{path:'tests/check.mjs',status}],summary:{total:1,passed:status==='passed'?1:0,failed:status==='failed'?1:0,skipped:0}}));
`);
  const command = { argv: [process.execPath, 'tests/check.mjs'], timeoutMs: 10000 };
  const protocol = { apiVersion: 'testing.aiwg.io/v1', kind: 'TestConformanceProtocol', metadata: { name: 'actual-custom-test' }, spec: { platform: 'javascript', system: 'arithmetic function', source: { include: ['src/**/*.mjs'], exclude: [] }, tests: { include: ['tests/**/*.mjs'], exclude: [] }, areas: [{ id: 'unit', include: ['tests/**/*.mjs'] }], lanes: [{ id: 'unit', runner: 'custom', include: ['tests/**/*.mjs'], exclude: [], command, result: { format: 'canonical' }, required: true, discovery: { command: { ...command, argv: [...command.argv, '--discover'] }, result: { format: 'canonical' } } }], policy: { requireDiscovery: true, requireReview: true, requireNegativeControls: false, allowSkipped: false, coverageThresholds: {}, maxFiles: 100, maxFileBytes: 1000000, maxOutputBytes: 1000000, ...policy }, research: { paths: [], allowWeb: false } } };
  return { root, protocol };
}
async function evidenceFor(root: string, protocol: any) {
  return [await collectEvidence(root, protocol, { mode: 'discovery' }), await collectEvidence(root, protocol)];
}
async function reviewFor(root: string, protocol: any) {
  const inventory = await inventoryWorkspace(root, protocol);
  return artifact('TestConformanceReview', { root, protocolHash: digest(protocol), snapshotHash: inventory.spec.snapshotHash, reviewer: 'test-architect', files: inventory.spec.files.filter((f: any) => f.role === 'test').map((f: any) => ({ path: f.path, hash: f.hash, ...Object.fromEntries(fields.map(field => [field, `Inspected ${field}: tests/check.mjs calls add(2,3) and checks exact numeric result 5.`])), verdict: 'passed', findings: [] })) });
}
const gate = (report: any, id: string) => report.spec.gates.find((g: any) => g.id === id);

describe('current-source test conformance assessment', () => {
  it('proves a complete declared protocol from actual processes and whole-scope review', async () => {
    const { root, protocol } = await fixture();
    const report = await assessConformance(root, protocol, { evidence: await evidenceFor(root, protocol), reviews: await reviewFor(root, protocol) });
    expect(report.spec.status).toBe('conformant');
    expect(report.spec.summary.failed).toBe(0); expect(report.spec.summary.unknown).toBe(0);
    expect(gate(report, 'unit-file-reconciliation').status).toBe('passed');
    expect(gate(report, 'unit-case-reconciliation').status).toBe('passed');
    expect(gate(report, 'review:tests/check.mjs').status).toBe('passed');
    await expect(validateContract(report, 'test-conformance-assessment.v1')).resolves.toEqual(report);
  });
  it('keeps missing execution and discovery evidence unknown', async () => {
    const { root, protocol } = await fixture();
    const report = await assessConformance(root, protocol, {});
    expect(report.spec.status).toBe('unknown');
    expect(gate(report, 'unit-execution').status).toBe('unknown');
    expect(gate(report, 'unit-discovery').status).toBe('unknown');
  });
  it('detects a real broken SUT and retains failed execution', async () => {
    const { root, protocol } = await fixture({ broken: true });
    const evidence = await evidenceFor(root, protocol);
    expect(evidence[1].spec.lanes[0].normalized.summary.failed).toBe(1);
    const report = await assessConformance(root, protocol, { evidence, reviews: await reviewFor(root, protocol) });
    expect(report.spec.status).toBe('nonconformant');
    expect(gate(report, 'unit-execution').status).toBe('failed');
  });
  it('rechecks retained raw reports instead of trusting a receipt pass summary', async () => {
    const { root, protocol } = await fixture(); const evidence = await evidenceFor(root, protocol);
    await fs.appendFile(path.join(root, evidence[1].spec.lanes[0].report.path), 'tampered');
    const report = await assessConformance(root, protocol, { evidence, reviews: await reviewFor(root, protocol) });
    expect(report.spec.status).toBe('unknown');
    expect(gate(report, 'receipt-1').references.some((r: string) => r.includes('REPORT_TAMPERED'))).toBe(true);
  });
  it('invalidates source-changed evidence even when a supplied inventory claims old scope', async () => {
    const { root, protocol } = await fixture(); const inventory = await inventoryWorkspace(root, protocol); const evidence = await evidenceFor(root, protocol);
    await fs.writeFile(path.join(root, 'src/add.mjs'), 'export const add = () => 0;\n');
    const report = await assessConformance(root, protocol, { inventory, evidence, reviews: await reviewFor(root, protocol) });
    expect(report.spec.status).toBe('unknown');
    expect(gate(report, 'supplied-inventory').status).toBe('unknown');
    expect(gate(report, 'receipt-1').references.some((r: string) => r.includes('STALE_RECEIPT'))).toBe(true);
  });
  it('requires current substantive review rather than a sampled or stale review', async () => {
    const { root, protocol } = await fixture(); const evidence = await evidenceFor(root, protocol);
    const review = await reviewFor(root, protocol); review.spec.files[0].hash = '0'.repeat(64);
    const report = await assessConformance(root, protocol, { evidence, reviews: review });
    expect(gate(report, 'review:tests/check.mjs').status).toBe('unknown');
    review.spec.files = [];
    const empty = await assessConformance(root, protocol, { evidence, reviews: review });
    expect(empty.spec.status).toBe('unknown');
    expect(gate(empty, 'review-artifact-0').status).toBe('unknown');
  });
  it('does not treat a valid subset review as a whole-file-scope review', async () => {
    const { root, protocol } = await fixture();
    await fs.writeFile(path.join(root, 'tests/omitted.mjs'), 'import assert from "node:assert/strict"; assert.equal(1,1);\n');
    const evidence = await evidenceFor(root, protocol); const review = await reviewFor(root, protocol);
    review.spec.files = review.spec.files.filter((f: any) => f.path === 'tests/check.mjs');
    const report = await assessConformance(root, protocol, { evidence, reviews: review });
    expect(gate(report, 'review:tests/omitted.mjs').status).toBe('unknown');
    expect(gate(report, 'unit-file-reconciliation').status).toBe('unknown');
    expect(report.spec.status).toBe('unknown');
  });
  it('detects runner case identity mismatch independently of matching file counts', async () => {
    const { root, protocol } = await fixture();
    const file = path.join(root, 'tests/check.mjs');
    const text = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, text.replace("name:'adds two inputs'", "name:discovery?'different registered case':'adds two inputs'"));
    const report = await assessConformance(root, protocol, { evidence: await evidenceFor(root, protocol), reviews: await reviewFor(root, protocol) });
    expect(gate(report, 'unit-file-reconciliation').status).toBe('passed');
    expect(gate(report, 'unit-case-reconciliation').status).toBe('unknown');
    expect(report.spec.status).toBe('unknown');
  });
  it('rejects placeholder dimensions and open findings despite a passing verdict', async () => {
    const { root, protocol } = await fixture(); const evidence = await evidenceFor(root, protocol); const review = await reviewFor(root, protocol);
    review.spec.files[0].oracle = 'TODO investigate the claimed outcome';
    expect(gate(await assessConformance(root, protocol, { evidence, reviews: review }), 'review:tests/check.mjs').status).toBe('unknown');
    review.spec.files[0].oracle = 'Exact result 5 from independently chosen arithmetic example.';
    review.spec.files[0].findings.push({ code: 'WEAK_ORACLE', message: 'Wrong result can still pass this check.', severity: 'high', status: 'open' });
    const failed = await assessConformance(root, protocol, { evidence, reviews: review });
    expect(failed.spec.status).toBe('nonconformant');
    expect(gate(failed, 'review:tests/check.mjs').status).toBe('failed');
  });
  it('does not infer negative-control sensitivity or coverage from a passing suite', async () => {
    const { root, protocol } = await fixture({ policy: { requireNegativeControls: true, coverageThresholds: { lines: 80 } } });
    const report = await assessConformance(root, protocol, { evidence: await evidenceFor(root, protocol), reviews: await reviewFor(root, protocol) });
    expect(report.spec.status).toBe('unknown');
    expect(gate(report, 'negative-controls').status).toBe('unknown');
    expect(gate(report, 'coverage').status).toBe('unknown');
  });
  it('rejects a rebound receipt claiming the wrong configured command', async () => {
    const { root, protocol } = await fixture(); const evidence = await evidenceFor(root, protocol);
    evidence[1].spec.lanes[0].process.argv = [process.execPath, '-e', 'process.exit(0)'];
    const { receiptHash, ...bound } = evidence[1].spec; evidence[1].spec.receiptHash = digest(bound);
    const report = await assessConformance(root, protocol, { evidence, reviews: await reviewFor(root, protocol) });
    expect(gate(report, 'unit-execution').status).toBe('unknown');
    expect(gate(report, 'unit-execution').message).toContain('configured lane command');
  });
  it('rejects duplicate selected runs instead of choosing a convenient green result', async () => {
    const { root, protocol } = await fixture(); const evidence = await evidenceFor(root, protocol);
    const report = await assessConformance(root, protocol, { evidence: [...evidence, evidence[1]], reviews: await reviewFor(root, protocol) });
    expect(gate(report, 'unit-execution').status).toBe('unknown');
    expect(gate(report, 'unit-execution').message).toContain('ambiguous');
  });
  it('traces behavioral obligations through registered/executed cases and SUT/boundary review', async () => {
    const { root, protocol } = await fixture();
    const id = JSON.stringify(['unit', 'tests/check.mjs', 'adds two inputs']);
    (protocol.spec as any).obligations = [{ id: 'adds', description: 'Add independently supplied integer arguments', level: 'unit', sut: 'add', boundary: 'function', lanes: ['unit'], testIds: [id], assertions: ['add(2,3) equals 5'], owner: 'test-engineer', prerequisites: [] }];
    const evidence = await evidenceFor(root, protocol); const review = await reviewFor(root, protocol);
    review.spec.files[0].obligationIds = ['adds']; review.spec.files[0].assertions = ['add(2,3) equals 5']; review.spec.files[0].scope = 'Real pure function call, without collaboration doubles.';
    const pass = await assessConformance(root, protocol, { evidence, reviews: review });
    expect(gate(pass, 'obligation:adds').status).toBe('passed');
    expect(pass.spec.status).toBe('conformant');
    delete review.spec.files[0].obligationIds;
    const missing = await assessConformance(root, protocol, { evidence, reviews: review });
    expect(gate(missing, 'obligation:adds').status).toBe('unknown');
  });
  it('rejects empty obligation case mappings at the protocol boundary', async () => {
    const { root, protocol } = await fixture();
    (protocol.spec as any).obligations = [{ id: 'adds', description: 'Add independently supplied integer arguments', level: 'unit', sut: 'add', boundary: 'function', lanes: ['unit'], testIds: [], assertions: ['expected output'], owner: 'owner', prerequisites: [] }];
    await expect(assessConformance(root, protocol, {})).rejects.toThrow('Invalid conformance-protocol');
  });
  it('compares stable gate IDs and reports resolution instead of hiding former unknowns', async () => {
    const { root, protocol } = await fixture();
    const previous = await assessConformance(root, protocol, {});
    const current = await assessConformance(root, protocol, { evidence: await evidenceFor(root, protocol), reviews: await reviewFor(root, protocol), previous });
    expect(current.spec.status).toBe('conformant');
    expect(current.spec.comparison.protocolChanged).toBe(false);
    expect(current.spec.comparison.resolved).toContain('unit-execution');
    expect(current.spec.comparison.resolved).toContain('review:tests/check.mjs');
    const regressed = await assessConformance(root, protocol, { previous: current });
    expect(regressed.spec.comparison.regressed).toContain('unit-execution');
    expect(regressed.spec.status).toBe('unknown');
  });
  it('accepts a verified real killed control and rejects its tampered raw evidence', async () => {
    const { root, protocol } = await fixture({ policy: { requireNegativeControls: true } });
    const plan = await createPlan(root, [{ path: 'src/add.mjs', content: 'export const add = (a,b) => a-b;\n' }]);
    await fs.mkdir(path.join(root, '.aiwg/testing'), { recursive: true });
    await fs.writeFile(path.join(root, '.aiwg/testing/control.json'), JSON.stringify(plan));
    const lane = protocol.spec.lanes[0];
    (lane as any).negativeControls = [{ id: 'subtract', description: 'Subtracting instead of adding must fail the exact result assertion', command: lane.command, result: lane.result, testIds: [JSON.stringify(['unit', 'tests/check.mjs', 'adds two inputs'])], changePlan: '.aiwg/testing/control.json' }];
    const evidence = await evidenceFor(root, protocol);
    const controls = await collectControls(root, protocol, { evidence: evidence[1] });
    expect(controls.spec.controls[0].status).toBe('killed');
    const review = await reviewFor(root, protocol);
    const passing = await assessConformance(root, protocol, { evidence: [...evidence, controls], reviews: review });
    expect(gate(passing, 'control:unit:subtract').status).toBe('passed');
    expect(passing.spec.status).toBe('conformant');
    await fs.appendFile(path.join(root, controls.spec.controls[0].mutationReceipt.spec.lanes[0].report.path), 'tampered');
    const unknown = await assessConformance(root, protocol, { evidence: [...evidence, controls], reviews: review });
    expect(unknown.spec.status).toBe('unknown');
    expect(gate(unknown, 'control:unit:subtract').status).toBe('unknown');
  });
  it('repairs an actual weak test oracle, proves new fault sensitivity and safely reverts the test repair', async () => {
    const { root, protocol } = await fixture({ policy: { requireNegativeControls: true } });
    const testPath = path.join(root, 'tests/check.mjs');
    const strong = await fs.readFile(testPath, 'utf8');
    const weak = strong.replace('assert.equal(add(2,3),5)', "assert.equal(typeof add(2,3),'number')");
    expect(weak).not.toBe(strong);
    await fs.writeFile(testPath, weak);
    const mutantPlan = await createPlan(root, [{ path: 'src/add.mjs', content: 'export const add = (a,b) => a-b;\n' }]);
    await fs.mkdir(path.join(root, '.aiwg/testing'), { recursive: true });
    await fs.writeFile(path.join(root, '.aiwg/testing/control.json'), JSON.stringify(mutantPlan));
    const lane = protocol.spec.lanes[0];
    (lane as any).negativeControls = [{ id: 'wrong-result', description: 'Subtracting must fail the assertion that the sum equals 5', command: lane.command, result: lane.result, testIds: [JSON.stringify(['unit', 'tests/check.mjs', 'adds two inputs'])], changePlan: '.aiwg/testing/control.json' }];
    const before = await evidenceFor(root, protocol);
    expect(before[1].spec.lanes[0].normalized.summary.passed).toBe(1);
    const survived = await collectControls(root, protocol, { evidence: before[1] });
    expect(survived.spec.controls[0].status).toBe('survived');
    const weakReview = await reviewFor(root, protocol);
    weakReview.spec.files[0].verdict = 'failed';
    weakReview.spec.files[0].findings = [{ code: 'VALUE_NOT_CHECKED', message: 'The type assertion accepts an incorrect numeric result.', severity: 'high', status: 'open' }];
    const failed = await assessConformance(root, protocol, { evidence: [...before, survived], reviews: weakReview });
    expect(failed.spec.status).toBe('nonconformant');
    expect(gate(failed, 'control:unit:wrong-result').status).toBe('failed');
    const repair = await createPlan(root, [{ path: 'tests/check.mjs', content: strong }], { purpose: 'Replace the vacuous type oracle with independently expected arithmetic result' });
    expect(await fs.readFile(testPath, 'utf8')).toBe(weak);
    const applied = await applyPlan(root, repair);
    expect(await fs.readFile(testPath, 'utf8')).toBe(strong);
    const stale = await assessConformance(root, protocol, { evidence: [...before, survived], reviews: weakReview });
    expect(stale.spec.status).toBe('unknown');
    const after = await evidenceFor(root, protocol);
    const killed = await collectControls(root, protocol, { evidence: after[1] });
    expect(killed.spec.controls[0].status).toBe('killed');
    expect(killed.spec.controls[0].mutationReceipt.spec.lanes[0].normalized.summary.failed).toBe(1);
    const repaired = await assessConformance(root, protocol, { evidence: [...after, killed], reviews: await reviewFor(root, protocol), previous: failed });
    expect(repaired.spec.status).toBe('conformant');
    expect(repaired.spec.comparison.resolved).toContain('control:unit:wrong-result');
    await rollbackPlan(root, applied);
    expect(await fs.readFile(testPath, 'utf8')).toBe(weak);
    expect(await fs.readFile(path.join(root, 'src/add.mjs'), 'utf8')).toBe('export const add = (a,b) => a+b;\n');
  });
  it.each([[1, 2, 'failed'], [2, 2, 'passed'], [0, 0, 'unknown']])('uses verified coverage numerator/denominator %s/%s (%s)', async (covered, total, expected) => {
    const { root, protocol } = await fixture({ policy: { coverageThresholds: { lines: 80 } } });
    const lane = protocol.spec.lanes[0];
    lane.command.argv.push('.aiwg/testing/coverage-{runId}.json');
    (lane as any).coverage = { format: 'canonical', path: '.aiwg/testing/coverage-{runId}.json', provider: 'test-counter-fixture', version: '1' };
    await fs.appendFile(path.join(root, 'tests/check.mjs'), `\nimport fs from 'node:fs';\nif(!discovery){fs.mkdirSync('.aiwg/testing',{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify({complete:true,files:[{path:'src/add.mjs',metrics:{lines:{covered:${covered},total:${total}}}}]}));}\n`);
    const evidence = await evidenceFor(root, protocol);
    const report = await assessConformance(root, protocol, { evidence, reviews: await reviewFor(root, protocol) });
    expect(gate(report, 'unit-coverage-lines').status).toBe(expected);
    expect(report.spec.status).toBe(expected === 'passed' ? 'conformant' : expected === 'failed' ? 'nonconformant' : 'unknown');
  });
});
