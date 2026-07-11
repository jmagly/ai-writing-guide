/**
 * Eval-harness runner tests, including the adversarial isolation guarantees.
 *
 * Run with: node tools/ralph-external/eval-harness.test.mjs
 */

import assert from 'assert';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  EvalHarness,
  buildOptimizerFeedback,
  statusToVerification,
  DEFAULT_FORBIDDEN_OPTIMIZER_FIELDS,
} from './eval-harness.mjs';

const TEST_DIR = join(dirname(fileURLToPath(import.meta.url)), '.tmp-eval-harness');

function setup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}\n  ${err.message}`);
    throw err;
  }
}

/** A stub command runner returning canned {code, stdout} keyed by command. */
function stubRunner(map) {
  return { run: (cmd) => map[cmd] || { code: 0, stdout: '{}' } };
}

try {
  // ── Pure isolation core ────────────────────────────────────────────────

  test('buildOptimizerFeedback strips every forbidden field (holdout-leakage)', () => {
    const raw = {
      score: 82,
      pass_count: 41,
      total_count: 50,
      status: 'fail',
      // Forbidden — must NEVER survive into optimizer feedback:
      holdout_case_ids: [1, 2, 3],
      holdout_answers: { 1: 'A' },
      oracle_traces: 'trace…',
      detailed_lint_findings: ['line 5 bad'],
      fixture_membership: 'holdout',
    };
    const { feedback, leaked } = buildOptimizerFeedback(raw);
    assert.deepStrictEqual(feedback, { score: 82, pass_count: 41, total_count: 50, status: 'fail' });
    for (const f of DEFAULT_FORBIDDEN_OPTIMIZER_FIELDS) {
      assert.strictEqual(feedback[f], undefined, `${f} leaked`);
    }
    assert.strictEqual(leaked.length, 5);
  });

  test('buildOptimizerFeedback drops unknown (non-allowlisted) keys too', () => {
    const { feedback } = buildOptimizerFeedback({ score: 10, sneaky_new_oracle_field: 'x' });
    assert.deepStrictEqual(feedback, { score: 10 });
  });

  test('statusToVerification maps eval status → analytics vocabulary', () => {
    assert.strictEqual(statusToVerification('pass'), 'passed');
    assert.strictEqual(statusToVerification('fail'), 'failed');
    assert.strictEqual(statusToVerification('void'), 'void');
    assert.strictEqual(statusToVerification('error'), 'failed');
  });

  // ── Runner behavior ────────────────────────────────────────────────────

  test('lint violation VOIDs the iteration (VOID-on-lint-failure)', () => {
    setup();
    const harness = new EvalHarness(
      {
        lint: { command: 'lint', void_on_violation: true },
        score: { command: 'score' },
        diagnostics_policy: { private_human: join(TEST_DIR, 'priv.json') },
      },
      {
        runner: stubRunner({
          lint: { code: 1, stdout: JSON.stringify({ violation: true, void_reason: 'used a banned import' }) },
          score: { code: 0, stdout: JSON.stringify({ score: 90, pass_count: 9, total_count: 10 }) },
        }),
      },
    );
    const result = harness.run({ iterationDir: TEST_DIR });
    assert.strictEqual(result.status, 'void');
    assert.strictEqual(result.optimizer_feedback.void_reason, 'used a banned import');
    assert.strictEqual(statusToVerification(result.status), 'void');
  });

  test('all-pass score → pass; partial → fail', () => {
    const mk = (pass, total) => new EvalHarness(
      { score: { command: 'score' } },
      { runner: stubRunner({ score: { code: 0, stdout: JSON.stringify({ pass_count: pass, total_count: total }) } }) },
    ).run({});
    assert.strictEqual(mk(10, 10).status, 'pass');
    assert.strictEqual(mk(7, 10).status, 'fail');
  });

  test('forbidden fields emitted by the score instrument are stripped + leakage audit passes', () => {
    setup();
    // A misconfigured/adversarial harness that tries to surface holdout answers.
    const harness = new EvalHarness(
      { score: { command: 'score' }, diagnostics_policy: { private_human: join(TEST_DIR, 'p.json') } },
      {
        runner: stubRunner({
          score: {
            code: 0,
            stdout: JSON.stringify({
              score: 100, pass_count: 10, total_count: 10,
              holdout_answers: { 1: 'A', 2: 'B' },   // attempted leak
              oracle_traces: 'CANARY-9f3a-secret',
            }),
          },
        }),
      },
    );
    const result = harness.run({ iterationDir: TEST_DIR });
    // Optimizer feedback carries NONE of the forbidden fields...
    assert.strictEqual(result.optimizer_feedback.holdout_answers, undefined);
    assert.strictEqual(result.optimizer_feedback.oracle_traces, undefined);
    // ...the audit still records that the harness TRIED to surface them...
    assert.ok(result._forbidden_fields_seen.includes('holdout_answers'));
    // ...and the audit result is pass because nothing actually leaked.
    assert.strictEqual(result.leakage_audit.result, 'pass');
  });

  test('canary in private diagnostics never appears in optimizer feedback (contamination gauge)', () => {
    setup();
    const CANARY = 'CANARY-GUID-2b7e-do-not-leak';
    const harness = new EvalHarness(
      { score: { command: 'score' }, diagnostics_policy: { private_human: join(TEST_DIR, 'diag.json') } },
      {
        runner: stubRunner({
          score: { code: 0, stdout: JSON.stringify({ score: 50, pass_count: 5, total_count: 10, oracle_traces: CANARY }) },
        }),
      },
    );
    const result = harness.run({ iterationDir: TEST_DIR });
    const feedbackStr = JSON.stringify(result.optimizer_feedback);
    assert.ok(!feedbackStr.includes(CANARY), 'canary leaked into optimizer feedback');
    // The canary IS present in the private (non-optimizer-readable) diagnostics.
    const priv = readFileSync(result.private_diagnostics_ref, 'utf8');
    assert.ok(priv.includes(CANARY), 'canary missing from private diagnostics');
  });

  console.log('\n=== All eval-harness tests passed ===\n');
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
} catch (err) {
  console.error('\n=== Eval-harness test suite FAILED ===\n');
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  process.exit(1);
}
