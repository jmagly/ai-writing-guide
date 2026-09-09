import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
// @ts-expect-error addon source is distributed JavaScript
import { normalizeResults } from '../../../agentic/code/addons/testing-quality/lib/results.mjs';

const nestedVitest = JSON.parse(fs.readFileSync(new URL('../../fixtures/testing-quality/vitest-nested-suites.actual.json', import.meta.url), 'utf8'));

const options = { root: '/target', laneId: 'unit' };
const normalize = (raw: unknown, format = 'canonical', extra = {}) => normalizeResults(raw, { ...options, format, ...extra });
const canonical = (changes = {}) => ({ complete: true, cases: [{ file: 'test/a.test.ts', name: 'suite verifies value', status: 'passed' }], files: [], ...changes });
const jest = (changes = {}) => ({ success: true, numTotalTests: 1, numPassedTests: 1, numFailedTests: 0, testResults: [{ name: '/target/test/a.test.ts', status: 'passed', assertionResults: [{ fullName: 'suite checks value', status: 'passed', duration: 12 }] }], ...changes });

describe('test conformance result normalization', () => {
  it('keeps stable unambiguous lane/file/full-name identity and root-relative paths', () => {
    const out = normalize(jest(), 'vitest');
    expect(out.complete).toBe(true);
    expect(out.cases).toEqual([{ id: '["unit","test/a.test.ts","suite checks value"]', file: 'test/a.test.ts', name: 'suite checks value', status: 'passed', durationMs: 12 }]);
    expect(out.files).toEqual([{ path: 'test/a.test.ts', status: 'passed' }]);
    expect(normalize(jest(), 'jest').cases[0].id).toBe(out.cases[0].id);
    expect(normalize(jest(), 'jest', { laneId: 'other' }).cases[0].id).not.toBe(out.cases[0].id);
  });
  it.each(['', '{', null, {}, { cases: [] }])('fails malformed or missing evidence closed (%j)', raw => {
    expect(normalize(raw).complete).toBe(false);
    expect(normalize(raw).errors.length).toBeGreaterThan(0);
  });
  it('does not accept empty canonical reports or upstream incompleteness', () => {
    expect(normalize(canonical({ cases: [] })).errors).toContainEqual(expect.objectContaining({ code: 'EMPTY_REPORT' }));
    expect(normalize(canonical({ complete: false })).complete).toBe(false);
    expect(normalize(canonical({ errors: [{ code: 'NO_RUNNER', message: 'missing' }] })).complete).toBe(false);
  });
  it.each(['../elsewhere.ts', '/outside/a.ts', 'tests/../../a.ts', 'C:\\elsewhere\\a.ts', 'a\0.ts'])('rejects unsafe reporter path %s', file => {
    const out = normalize(canonical({ cases: [{ file, name: 'check', status: 'passed' }] }));
    expect(out.complete).toBe(false);
    expect(out.files).toEqual([]);
  });
  it('retains a failed suite with zero registered failing cases', () => {
    const out = normalize(jest({ success: false, numTotalTests: 0, numPassedTests: 0, testResults: [{ name: '/target/test/setup.ts', status: 'failed', assertionResults: [], message: 'setup broke' }] }), 'vitest');
    expect(out.files).toEqual([{ path: 'test/setup.ts', status: 'failed' }]);
    expect(out.summary).toEqual({ total: 0, passed: 0, failed: 0, skipped: 0 });
    expect(out.complete).toBe(true);
  });
  it('reconciles actual Vitest nested describe suite counts separately from files', () => {
    // Captured from installed Vitest 4.1.11: outer > inner, two real assertions.
    // Only the machine-specific file path was normalized to /target/tests/.
    expect(nestedVitest.numTotalTestSuites).toBe(3);
    expect(nestedVitest.testResults).toHaveLength(1);
    const out = normalize(nestedVitest, 'vitest');
    expect(out.errors).toEqual([]);
    expect(out.complete).toBe(true);
    expect(out.files).toEqual([{ path: 'tests/nested.test.mjs', status: 'passed' }]);
    expect(out.cases.map((c: any) => ({ id: c.id, status: c.status }))).toEqual([
      { id: JSON.stringify(['unit','tests/nested.test.mjs','outer > inner > adds independent inputs']), status: 'passed' },
      { id: JSON.stringify(['unit','tests/nested.test.mjs','outer > inner > rejects zero as positive']), status: 'passed' },
    ]);
    expect(out.summary).toEqual({total:2,passed:2,failed:0,skipped:0});
    expect(normalize(nestedVitest, 'jest').errors).toContainEqual(expect.objectContaining({code:'COUNT_MISMATCH'}));
  });
  it.each([
    {numTotalTestSuites:0}, {numTotalTestSuites:-1}, {numTotalTestSuites:1.5},
    {numTotalTestSuites:1,numPassedTestSuites:1}, {numTotalTestSuites:'3'}, {numPassedTestSuites:-1}, {numPassedTestSuites:4},
    {numFailedTestSuites:1.5}, {numPendingTestSuites:4}, {numPassedTestSuites:2},
  ])('rejects malformed Vitest suite accounting %j', change => {
    const out = normalize({...nestedVitest,...change},'vitest');
    expect(out.complete).toBe(false);
    expect(out.errors).toContainEqual(expect.objectContaining({code:'COUNT_MISMATCH'}));
  });
  it('preserves nested Vitest setup failures without fabricating failed cases', () => {
    const report = {...nestedVitest, success:false, numTotalTests:0, numPassedTests:0,
      numPassedTestSuites:0, numFailedTestSuites:3,
      testResults:[{name:'/target/tests/nested.test.mjs',status:'failed',message:'beforeAll failed',assertionResults:[]}]};
    const out = normalize(report,'vitest');
    expect(out.complete).toBe(true);
    expect(out.errors).toEqual([]);
    expect(out.files).toEqual([{path:'tests/nested.test.mjs',status:'failed'}]);
    expect(out.summary).toEqual({total:0,passed:0,failed:0,skipped:0});
    expect(normalize({...report,numFailedTestSuites:0,numPassedTestSuites:3},'vitest').errors).toContainEqual(expect.objectContaining({code:'COUNT_MISMATCH'}));
    expect(normalize({...report,success:true},'vitest').errors).toContainEqual(expect.objectContaining({code:'CONTRADICTORY_SUCCESS'}));
    expect(normalize({...nestedVitest,numTotalTests:3},'vitest').errors).toContainEqual(expect.objectContaining({code:'COUNT_MISMATCH'}));
  });
  it('rejects contradictory aggregate and case counts', () => {
    expect(normalize(jest({ numTotalTests: 2 }), 'jest').errors).toContainEqual(expect.objectContaining({ code: 'COUNT_MISMATCH' }));
    const report = jest({ testResults: [{ name: 'test/a.ts', status: 'passed', assertionResults: [{ fullName: 'bad', status: 'failed' }] }] });
    expect(normalize(report, 'vitest').errors.map((e: any) => e.code)).toContain('CONTRADICTORY_SUITE');
    expect(normalize(report, 'vitest').complete).toBe(false);
  });
  it('rejects duplicate case identities instead of hiding them', () => {
    const c = canonical();
    const out = normalize({ ...c, cases: [...c.cases, ...c.cases] });
    expect(out.errors).toContainEqual(expect.objectContaining({ code: 'DUPLICATE_CASE' }));
    expect(out.summary.total).toBe(1);
  });
  it('rejects canonical file/case contradictions and unknown file-only execution', () => {
    const out = normalize(canonical({ cases: [{ file: 'a.ts', name: 'fails', status: 'failed' }], files: [{ path: 'a.ts', status: 'passed' }] }));
    expect(out.errors).toContainEqual(expect.objectContaining({ code: 'CONTRADICTORY_SUITE' }));
    expect(out.files[0].status).toBe('failed');
    expect(normalize(canonical({ cases: [], files: [{ path: 'a.ts', status: 'unknown' }] })).complete).toBe(false);
  });
  it('never turns discovery into successful execution', () => {
    const out = normalize(jest(), 'jest', { mode: 'discovery' });
    expect(out.complete).toBe(true);
    expect(out.cases[0].status).toBe('unknown');
    expect(out.files[0].status).toBe('unknown');
    expect(out.summary.passed).toBe(0);
    for (const flag of ['wouldRun', 'collectTests', 'wasInterrupted']) expect(normalize(jest({ [flag]: true }), 'jest').complete).toBe(false);
    expect(normalize(canonical({ mode: 'discovery' })).complete).toBe(false);
  });
  it('reconciles actual Vitest list names with execution ancestor/title identities', () => {
    const listing = [{ file: '/target/tests/a.test.ts', name: 'suite > value > literal' }];
    const discovery = normalize(listing, 'vitest', { mode: 'discovery' });
    const execution = normalize({ testResults: [{ name: '/target/tests/a.test.ts', status: 'passed', assertionResults: [{ ancestorTitles: ['suite'], title: 'value > literal', fullName: 'suite value > literal', status: 'passed' }] }] }, 'vitest');
    expect(discovery.complete).toBe(true);
    expect(discovery.cases[0].status).toBe('unknown');
    expect(discovery.cases[0].id).toBe(execution.cases[0].id);
    expect(normalize(listing, 'vitest').complete).toBe(false);
  });
  it('normalizes pytest node ids without inventing source declarations', () => {
    const out = normalize({ exitcode: 0, summary: { total: 2, passed: 1, skipped: 1 }, tests: [{ nodeid: 'tests/test_math.py::test_sum[positive]', outcome: 'passed', duration: .025 }, { nodeid: 'tests/test_math.py::test_sum[negative]', outcome: 'skipped' }] }, 'pytest-json-report');
    expect(out.complete).toBe(true);
    expect(out.summary).toEqual({ total: 2, passed: 1, failed: 0, skipped: 1 });
    expect(out.cases[0].durationMs).toBe(25);
    expect(out.cases[0].file).toBe('tests/test_math.py');
    expect(out.cases).toEqual([
      { id: '["unit","tests/test_math.py","tests/test_math.py::test_sum[positive]"]', file: 'tests/test_math.py', name: 'tests/test_math.py::test_sum[positive]', status: 'passed', durationMs: 25 },
      { id: '["unit","tests/test_math.py","tests/test_math.py::test_sum[negative]"]', file: 'tests/test_math.py', name: 'tests/test_math.py::test_sum[negative]', status: 'skipped' },
    ]);
  });
  it('accepts the protocol pytest-json format alias', () => {
    const payload = { exitcode: 0, summary: { total: 1, passed: 1 }, tests: [{ nodeid: 'tests/test_add.py::test_add', outcome: 'passed' }] };
    const result = normalize(payload, 'pytest-json');
    expect(result.complete).toBe(true);
    expect(result).toEqual(normalize(payload, 'pytest-json-report'));
    expect(result.summary.passed).toBe(1);
  });
  it('retains pytest collection errors and missing prerequisite exits', () => {
    const valid = { exitcode: 0, summary: { total: 1, passed: 1 }, tests: [{ nodeid: 'tests/test_one.py::test_one', outcome: 'passed' }] };
    const baseline = normalize(valid, 'pytest');
    expect(baseline.complete).toBe(true);
    expect(baseline.errors).toEqual([]);
    const interrupted = normalize({ ...valid, exitcode: 2 }, 'pytest');
    expect(interrupted.complete).toBe(false);
    expect(interrupted.errors).toContainEqual(expect.objectContaining({ code: 'PYTEST_INCOMPLETE', message: expect.stringContaining('pytest exited 2') }));
    expect(interrupted.cases).toEqual(baseline.cases);
    const collection = normalize({ ...valid, collectors: [{ nodeid: 'tests/test_broken.py', outcome: 'failed', longrepr: 'ImportError' }] }, 'pytest');
    expect(collection.complete).toBe(false);
    expect(collection.errors).toContainEqual({ code: 'COLLECTION_FAILURE', message: 'ImportError' });
    expect(collection.files).toEqual([{ path: 'tests/test_one.py', status: 'passed' }, { path: 'tests/test_broken.py', status: 'failed' }]);
    const out = normalize({ exitcode: 2, summary: { total: 0 }, tests: [], collectors: [{ nodeid: 'tests/test_broken.py', outcome: 'failed', longrepr: 'ImportError' }] }, 'pytest');
    expect(out.complete).toBe(false);
    expect(out.files).toEqual([{ path: 'tests/test_broken.py', status: 'failed' }]);
  });
  it('normalizes Go dynamic subtests from runtime events and leaves source file unknown', () => {
    const raw = [{ Action: 'start', Package: 'example/math' }, { Action: 'run', Package: 'example/math', Test: 'TestSum' }, { Action: 'run', Package: 'example/math', Test: 'TestSum/negative' }, { Action: 'pass', Package: 'example/math', Test: 'TestSum/negative', Elapsed: .02 }, { Action: 'pass', Package: 'example/math', Test: 'TestSum' }, { Action: 'pass', Package: 'example/math' }];
    const out = normalize(raw.map(e => JSON.stringify(e)).join('\n'), 'go-json');
    expect(out.complete).toBe(true);
    expect(out.cases.map((c: any) => c.name)).toEqual(['example/math::TestSum/negative', 'example/math::TestSum']);
    expect(out.cases.every((c: any) => c.file === null)).toBe(true);
    expect(out.files).toEqual([]);
    expect(normalize(raw.slice(0, -1), 'go-json').complete).toBe(false);
  });
  it('rejects Go package failures, duplicate terminals and truncated lines', () => {
    const valid = [{ Package: 'p', Action: 'start' }, { Package: 'p', Action: 'run', Test: 'TestOne' }, { Package: 'p', Action: 'pass', Test: 'TestOne' }, { Package: 'p', Action: 'pass' }];
    const baseline = normalize(valid, 'go');
    expect(baseline.complete).toBe(true);
    expect(baseline.errors).toEqual([]);
    // A repeated skip terminal isolates duplication without a second missing-start error.
    const duplicate = normalize([...valid, { Package: 'p', Action: 'skip' }], 'go');
    expect(duplicate.complete).toBe(false);
    expect(duplicate.errors).toContainEqual(expect.objectContaining({ code: 'DUPLICATE_TERMINAL', message: expect.stringContaining('p::') }));
    expect(duplicate.cases).toEqual(baseline.cases);
    expect(normalize([{ Package: 'p', Action: 'fail' }], 'go').errors).toContainEqual(expect.objectContaining({ code: 'PACKAGE_FAILURE' }));
    expect(normalize([{ Package: 'p', Action: 'pass' }, { Package: 'p', Action: 'pass' }], 'go').complete).toBe(false);
    expect(normalize('{"Package":"p","Action":"start"}\n{', 'go').complete).toBe(false);
  });
  it('accepts explicit Cargo runtime events and rejects successful build messages', () => {
    const out = normalize([{ type: 'suite', event: 'started', test_count: 1 }, { type: 'test', event: 'started', name: 'tests::adds' }, { type: 'test', event: 'ok', name: 'tests::adds', exec_time: .01 }, { type: 'suite', event: 'ok', passed: 1, failed: 0, ignored: 0 }], 'cargo-json');
    expect(out.complete).toBe(true);
    expect(out.cases[0]).toMatchObject({ name: 'tests::adds', file: null, durationMs: 10 });
    expect(normalize([{ reason: 'build-finished', success: true }], 'cargo').complete).toBe(false);
    expect(normalize([{ type: 'test', event: 'ok', name: 'alone' }], 'cargo').complete).toBe(false);
  });
  it('counts nested TAP leaves once and keeps the enclosing full name', () => {
    const out = normalize('TAP version 13\n# Subtest: arithmetic\n    # Subtest: adds\n    ok 1 - adds\n    # Subtest: subtracts\n    ok 2 - subtracts # SKIP unavailable\n    1..2\nok 1 - arithmetic\n1..1\n', 'node-tap');
    expect(out.complete).toBe(true);
    expect(out.cases.map((c: any) => c.name)).toEqual(['arithmetic > adds', 'arithmetic > subtracts']);
    expect(out.summary).toEqual({ total: 2, passed: 1, failed: 0, skipped: 1 });
  });
  it('preserves a custom TAP harness as one unit without inventing embedded assertions', () => {
    const out = normalize('TAP version 13\n# internal harness passed 99 checks\nok 1 - custom harness\n1..1\n', 'tap');
    expect(out.complete).toBe(true);
    expect(out.summary.total).toBe(1);
  });
  it.each([
    ['missing plan', 'ok 1 - missing plan\n'],
    ['missing first terminal', 'ok 2 - missing first\n1..2\n'],
    ['bailout', 'Bail out! setup\n'],
    ['empty plan', '1..0\n'],
  ])('fails incomplete or empty TAP closed (%s)', (_reason, raw) => expect(normalize(raw, 'tap').complete).toBe(false));
  it('rejects unknown statuses, invalid duration and unsupported adapters', () => {
    expect(normalize(canonical({ cases: [{ file: 'a.ts', name: 'x', status: 'green' }] })).complete).toBe(false);
    expect(normalize(canonical({ cases: [{ file: 'a.ts', name: 'x', status: 'passed', durationMs: -1 }] })).complete).toBe(false);
    expect(normalize('<testsuite/>', 'unsupported-runner').errors).toContainEqual(expect.objectContaining({ code: 'MISSING_ADAPTER' }));
  });
  it('does not hide runner-level failure behind passing assertion rows', () => {
    expect(normalize(jest({ success: false }), 'vitest').complete).toBe(false);
    expect(normalize(jest({ numUnhandledErrors: 1 }), 'vitest').complete).toBe(false);
    const report = { exitcode: 1, summary: { total: 1, passed: 1, failed: 0, skipped: 0 }, tests: [{ nodeid: 'test/a.py::check', outcome: 'passed' }] };
    expect(normalize(report, 'pytest-json').complete).toBe(false);
    expect(normalize({ ...report, exitcode: 0, tests: [{ nodeid: 'test/a.py::check', outcome: 'passed', teardown: { outcome: 'failed' } }] }, 'pytest-json').complete).toBe(false);
  });
  it('reconciles declared Cargo runtime count with emitted terminal cases', () => {
    const raw = [{ type: 'suite', event: 'started', test_count: 2 }, { type: 'test', event: 'started', name: 'only_one' }, { type: 'test', event: 'ok', name: 'only_one' }, { type: 'suite', event: 'ok', passed: 1, failed: 0, ignored: 0 }];
    expect(normalize(raw, 'cargo-json').errors).toContainEqual(expect.objectContaining({ code: 'COUNT_MISMATCH' }));
    expect(normalize([{ type: 'suite', event: 'started' }, ...raw.slice(1)], 'cargo-json').complete).toBe(false);
    expect(normalize([{ type: 'suite', event: 'started', test_count: 1 }, ...raw.slice(2)], 'cargo-json').errors).toContainEqual(expect.objectContaining({ code: 'MISSING_START' }));
  });
  it('does not drop a contradictory skipped TAP parent from successful children', () => {
    const raw = '# Subtest: suite\n    ok 1 - child\n    1..1\nok 1 - suite # SKIP skipped parent\n1..1\n';
    expect(normalize(raw, 'tap').errors).toContainEqual(expect.objectContaining({ code: 'TAP_SKIPPED_PARENT' }));
  });

});
