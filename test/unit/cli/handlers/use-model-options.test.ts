import { describe, expect, it } from 'vitest';
import {
  collectModelOverrideDeployArgs,
  collectUseModelDeployArgs,
  resolveUseWrapperModelExpectations,
} from '../../../../src/cli/handlers/use.js';

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

  it('keeps filter selectors out of exact model override calculation', () => {
    expect(collectModelOverrideDeployArgs([
      '--filter', 'review-*',
      '--filter-role', 'coding',
      '--coding-model', 'provider/coding',
    ])).toEqual(['--coding-model', 'provider/coding']);
  });

  it('derives exact wrapper expectations with deployment precedence and aliases', () => {
    const result = resolveUseWrapperModelExpectations({
      provider: 'codex',
      modelDeployArgs: [
        '--model', 'all-model',
        '--model-tier', 'economy',
        '--reasoning-model', 'premium-alias',
      ],
      catalogModels: {
        reasoning: 'catalog-reasoning',
        coding: 'catalog-coding',
        efficiency: 'catalog-efficiency',
      },
      modelsConfig: { shorthand: { 'premium-alias': 'resolved-premium' } },
    });
    expect(result).toEqual({
      reasoning: 'resolved-premium',
      coding: 'catalog-efficiency',
      efficiency: 'catalog-efficiency',
    });
  });
});
