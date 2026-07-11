/**
 * Focused tests for provider stream usage extraction.
 *
 * Run with: node tools/ralph-external/session-launcher-usage.test.mjs
 */

import assert from 'assert';
import { SessionLauncher } from './session-launcher.mjs';

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    throw error;
  }
}

test('extracts snake_case usage and cost fields', () => {
  const launcher = new SessionLauncher();
  const usage = launcher._extractUsageStats({
    type: 'result',
    total_cost_usd: 0.123,
    usage: {
      input_tokens: 100,
      output_tokens: 25,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 5,
    },
  });

  assert.strictEqual(usage.hasUsage, true);
  assert.strictEqual(usage.inputTokens, 100);
  assert.strictEqual(usage.outputTokens, 25);
  assert.strictEqual(usage.cacheCreationInputTokens, 10);
  assert.strictEqual(usage.cacheReadInputTokens, 5);
  assert.strictEqual(usage.totalTokens, 140);
  assert.strictEqual(usage.costUsd, 0.123);
});

test('prefers explicit total tokens when present', () => {
  const launcher = new SessionLauncher();
  const usage = launcher._extractUsageStats({
    usage: {
      inputTokens: 100,
      outputTokens: 25,
      totalTokens: 500,
    },
  });

  assert.strictEqual(usage.totalTokens, 500);
});

test('returns zero usage for events without accounting data', () => {
  const launcher = new SessionLauncher();
  const usage = launcher._extractUsageStats({ type: 'text', content: 'hello' });

  assert.strictEqual(usage.hasUsage, false);
  assert.strictEqual(usage.totalTokens, 0);
  assert.strictEqual(usage.costUsd, 0);
  assert.strictEqual(usage.hasCostField, false);
});

test('reads usage nested under message.usage (assistant events) (#1766)', () => {
  const launcher = new SessionLauncher();
  // Claude assistant events nest usage under message.usage — reading only the
  // top-level usage lost all accounting on timed-out sessions whose terminal
  // result event never arrives.
  const usage = launcher._extractUsageStats({
    type: 'assistant',
    message: {
      usage: { input_tokens: 200, output_tokens: 50 },
    },
  });

  assert.strictEqual(usage.hasUsage, true);
  assert.strictEqual(usage.inputTokens, 200);
  assert.strictEqual(usage.outputTokens, 50);
  assert.strictEqual(usage.totalTokens, 250);
});

test('distinguishes a present cost field from an absent one (#1766)', () => {
  const launcher = new SessionLauncher();

  const withCost = launcher._extractUsageStats({ type: 'result', total_cost_usd: 0, usage: { total_tokens: 10 } });
  assert.strictEqual(withCost.hasCostField, true);

  const withoutCost = launcher._extractUsageStats({ type: 'result', usage: { total_tokens: 10 } });
  assert.strictEqual(withoutCost.hasCostField, false);
});

console.log('\nUsage extraction tests passed.\n');
