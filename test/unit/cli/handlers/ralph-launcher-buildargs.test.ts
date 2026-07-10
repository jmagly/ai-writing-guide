import { describe, expect, it } from 'vitest';
import { buildArgs } from '../../../../src/cli/handlers/ralph-launcher.js';

describe('ralph-launcher buildArgs', () => {
  it('emits LFD hard budget and exploration quota flags', () => {
    const args = buildArgs({
      objective: 'Budgeted loop',
      completionCriteria: 'tests pass',
      maxIterations: 5,
      maxTotalTokens: 5000,
      maxOutputTokens: 1200,
      maxToolCalls: 20,
      maxTotalCost: 3.5,
      maxWallClockMinutes: 45,
      explorationQuota: 2,
    });

    expect(args).toEqual(expect.arrayContaining([
      '--max-total-tokens',
      '5000',
      '--max-output-tokens',
      '1200',
      '--max-tool-calls',
      '20',
      '--max-total-cost',
      '3.5',
      '--max-wall-clock-minutes',
      '45',
      '--exploration-quota',
      '2',
    ]));
  });
});
