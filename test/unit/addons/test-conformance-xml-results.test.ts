import { describe, expect, it } from 'vitest';
// @ts-expect-error Native addon module.
import { normalizeResults } from '../../../agentic/code/addons/testing-quality/lib/results.mjs';
const normalize = (raw: string, format = 'junit', mode = 'execution') => normalizeResults(raw, { format, mode, root: '/project' });
const trx = (results: string, counters: string, outcome = 'Completed') => `<TestRun xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010"><Results>${results}</Results><ResultSummary outcome="${outcome}"><Counters ${counters}/></ResultSummary></TestRun>`;
const result = (outcome = 'Passed', id = 'one') => `<UnitTestResult executionId="execution-${id}" testId="${id}" testName="boundary &amp; oracle" outcome="${outcome}" duration="00:00:00.1250000"/>`;

describe('producer-specific XML evidence', () => {
  it('normalizes Maven/pytest suites, failure/error/skip states and explicit files without class inference', () => {
    const report = normalize(`<testsuites xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://example.invalid/never-fetched.xsd" tests="4" failures="1" errors="1" skipped="1"><testsuite name="boundary" tests="4" failures="1" errors="1" skipped="1"><testcase classname="demo.Boundary" name="passes" time="0.1"/><testcase classname="demo.Boundary" name="fails" file="tests/boundary.java"><failure message="bad"/></testcase><testcase name="setup"><error/></testcase><testcase name="skip"><skipped/></testcase></testsuite></testsuites>`);
    expect(report.complete).toBe(true);
    expect(report.summary).toEqual({ total: 4, passed: 1, failed: 2, skipped: 1 });
    expect(report.cases[0]).toMatchObject({ file: null, name: 'demo.Boundary::passes', durationMs: 100 });
    expect(report.cases[1].file).toBe('tests/boundary.java');
  });
  it('retains setup-only failure, rejects zero suites, duplicates, truncation and wrong counts', () => {
    for (const xml of [
      '<testsuite tests="0" errors="1"><error message="setup"/></testsuite>',
      '<testsuite tests="0"/>',
      '<testsuite tests="2"><testcase name="same"/><testcase name="same"/></testsuite>',
      '<testsuite tests="1"><testcase name="cut"/>',
      '<testsuite tests="9"><testcase name="one"/></testsuite>',
      '<testsuite tests="1"><testcase name="contradiction"><skipped/><failure/></testcase></testsuite>',
      '<testsuite tests="1"><testcase name="rerun"><flakyFailure/></testcase></testsuite>',
    ]) expect(normalize(xml).complete).toBe(false);
  });
  it('rejects XML entity expansion, external entities, malformed syntax and depth excess', () => {
    for (const xml of [
      '<!DOCTYPE testsuite [<!ENTITY file SYSTEM "file:///etc/passwd">]><testsuite tests="1"><testcase name="&file;"/></testsuite>',
      '<!DOCTYPE testsuite [<!ENTITY a "aaaa">]><testsuite tests="1"><testcase name="&a;"/></testsuite>',
      '<testsuite tests="1"><testcase name="&unknown;"/></testsuite>',
      '<testsuite tests="1" tests="2"><testcase name="x"/></testsuite>',
      '<testsuite tests="1"><testcase name="x"/ ></testsuite>',
      '<testsuite tests="0">' + '<nested>'.repeat(65) + '</nested>'.repeat(65) + '</testsuite>',
    ]) expect(normalize(xml).complete).toBe(false);
  });
  it('normalizes flat VSTest TRX while preserving unknown source provenance', () => {
    const report = normalize(trx(result() + result('Failed', 'two') + result('NotExecuted', 'three'), 'total="3" executed="2" passed="1" failed="1" notExecuted="1"'), 'trx');
    expect(report.complete).toBe(true);
    expect(report.summary).toEqual({ total: 3, passed: 1, failed: 1, skipped: 1 });
    expect(report.cases[0]).toMatchObject({ file: null, name: 'one::boundary & oracle', durationMs: 125 });
  });
  it('fails closed for TRX run errors, incomplete/counter mismatch, duplicates and unknown outcomes', () => {
    for (const xml of [
      trx(result(), 'total="1" executed="1" passed="1" failed="0"', 'Failed'),
      trx(result(), 'total="2" executed="2" passed="1" failed="0"'),
      trx(result() + result(), 'total="2" executed="2" passed="2" failed="0"'),
      trx(result('Inconclusive'), 'total="1" executed="1" passed="0" failed="0" inconclusive="1"'),
      trx('', 'total="0" executed="0" passed="0" failed="0"'),
      trx(result(), 'total="1" executed="1" passed="1" failed="0"').slice(0, -10),
      '<TestRun><Results/><ResultSummary outcome="Completed"><Counters total="0" executed="0" passed="0" failed="0"/></ResultSummary></TestRun>',
    ]) expect(normalize(xml, 'trx').complete).toBe(false);
  });
  it('cannot promote JUnit or TRX reports to authoritative discovery', () => {
    expect(normalize('<testsuite tests="1"><testcase name="a"/></testsuite>', 'junit', 'discovery').complete).toBe(false);
    expect(normalize(trx(result(), 'total="1" executed="1" passed="1" failed="0"'), 'trx', 'discovery').complete).toBe(false);
  });
});
