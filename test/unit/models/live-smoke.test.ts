import { execFileSync, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('model live smoke gate', () => {
  it('is cost-free and disabled in normal CI', () => {
    const output = JSON.parse(execFileSync(
      process.execPath, ['tools/models/live-smoke.mjs', '--check'], { encoding: 'utf8' },
    ));
    expect(output.live).toBe(false);
    expect(output.normalCiCostUsd).toBe(0);
    expect(output.maximumBudgetUsd).toBe(0.25);
  });

  it('refuses execution without the explicit operator gate', () => {
    const result = spawnSync(process.execPath, [
      'tools/models/live-smoke.mjs',
      '--provider', 'codex',
      '--command', 'exit 0',
      '--output', '/tmp/should-not-exist.json',
      '--budget-usd', '0.01',
    ], { encoding: 'utf8', env: { ...process.env, AIWG_MODEL_LIVE_SMOKE: '' } });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Live model smoke is disabled');
  });
});
