import { describe, expect, it } from 'vitest';
import { collectUseModelDeployArgs } from '../../../../src/cli/handlers/use.js';

describe('use model option parity', () => {
  it('forwards model, tier, filter, and persistence options to every deploy path', () => {
    expect(collectUseModelDeployArgs([
      '--target', '/tmp/project',
      '--model-tier', 'economy',
      '--filter', 'review-*',
      '--filter-role', 'coding',
      '--reasoning-model', 'provider/reasoning',
      '--save-user',
      '--verbose',
    ])).toEqual([
      '--model-tier', 'economy',
      '--filter', 'review-*',
      '--filter-role', 'coding',
      '--reasoning-model', 'provider/reasoning',
      '--save-user',
    ]);
  });
});
