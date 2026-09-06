import test from 'node:test';
import assert from 'node:assert/strict';
import { DeepSeekHarnessAdapter } from '../../../tools/ralph-external/lib/deepseek-harness-adapter.mjs';

test('DeepSeek Harness Ralph adapter uses bounded headless profile defaults', () => {
  const adapter = new DeepSeekHarnessAdapter();
  const args = adapter.buildSessionArgs({ prompt: 'work' });
  assert.deepEqual(args.slice(0, 2), ['--profile', 'headless']);
  assert.equal(args.at(-1), 'work');
  assert.equal(adapter.getEnvOverrides().DSH_PERMISSION_MODE, 'workspace-write');
  assert.deepEqual(adapter.parseOutput('done\n'), { events: [{ type: 'assistant_final', text: 'done' }], settled: true, text: 'done' });
});
