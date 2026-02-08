/**
 * Tests for ModelResolver
 *
 * @source @src/models/resolver.ts
 * @source @src/models/config-loader.ts
 * @architecture @.aiwg/architecture/ADR-015-enhanced-model-selection.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { resolve } from 'path';
import { ModelResolver } from '../../../src/models/resolver.js';
import type { UserProjectConfig } from '../../../src/models/types.js';

describe('ModelResolver', () => {
  let testDir: string;
  let resolver: ModelResolver;

  beforeEach(async () => {
    testDir = resolve(process.cwd(), 'test-temp-models');
    await mkdir(testDir, { recursive: true });
    // Point AIWG_HOME to project root so ConfigLoader finds models-v2.json
    process.env.AIWG_HOME = process.cwd();
  });

  afterEach(async () => {
    delete process.env.AIWG_HOME;
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('resolve', () => {
    it('should resolve agents with various configurations', async () => {
      const cases = [
        {
          name: 'default tier and role',
          options: {},
          agent: 'software-implementer',
          role: undefined,
          expected: {
            modelId: 'claude-sonnet-4-5-20250929',
            provider: 'claude',
            tier: 'standard',
            role: 'coding',
          },
        },
        {
          name: 'explicit reasoning role',
          options: {},
          agent: 'architecture-designer',
          role: 'reasoning',
          expected: {
            modelId: 'claude-opus-4-5-20251101',
            role: 'reasoning',
            tier: 'premium',
          },
        },
        {
          name: 'tier from CLI options',
          options: { tier: 'max-quality' },
          agent: 'software-implementer',
          role: 'coding',
          expected: {
            modelId: 'claude-opus-4-5-20251101',
            tier: 'max-quality',
            source: 'cli',
          },
        },
        {
          name: 'unknown agent defaults to coding',
          options: {},
          agent: 'unknown-agent',
          role: undefined,
          expected: {
            role: 'coding',
            tier: 'standard',
          },
        },
      ];

      for (const tc of cases) {
        resolver = new ModelResolver(tc.options, testDir);
        const result = await resolver.resolve(tc.agent, tc.role);
        expect(result, tc.name).toBeDefined();
        for (const [key, value] of Object.entries(tc.expected)) {
          expect((result as any)[key], `${tc.name} - ${key}`).toBe(value);
        }
      }
    });

    it('should apply tier from agent frontmatter', async () => {
      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('software-implementer', 'coding', 'premium');

      expect(result.modelId).toBe('claude-sonnet-4-5-20250929');
      expect(result.tier).toBe('premium');
      expect(result.source).toBe('agent');
    });

    it('should handle minimum tier requirements', async () => {
      // Test with minimums respected (default)
      resolver = new ModelResolver({ tier: 'economy' }, testDir);
      const withMinimums = await resolver.resolve('executive-orchestrator', 'reasoning');
      expect(withMinimums.tier).toBe('premium'); // Upgraded from economy
      expect(withMinimums.modelId).toBe('claude-opus-4-5-20251101');

      // Test with minimums ignored
      resolver = new ModelResolver({ tier: 'economy', respectMinimums: false }, testDir);
      const withoutMinimums = await resolver.resolve('executive-orchestrator', 'reasoning');
      expect(withoutMinimums.tier).toBe('economy'); // Not upgraded
      expect(withoutMinimums.modelId).toBe('claude-haiku-3-5');
    });

    it('should use different provider when specified', async () => {
      resolver = new ModelResolver({ provider: 'openai', tier: 'standard' }, testDir);

      const result = await resolver.resolve('software-implementer', 'coding');

      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-5-codex');
    });

    it('should handle project config overrides', async () => {
      const cases = [
        {
          name: 'tier override',
          config: {
            agentOverrides: {
              'software-implementer': {
                'model-tier': 'premium',
              },
            },
          },
          expectedTier: 'premium',
          expectedSource: 'agent',
        },
        {
          name: 'direct model override',
          config: {
            agentOverrides: {
              'software-implementer': {
                'model-override': 'claude-opus-4-1-20250805',
              },
            },
          },
          expectedModelId: 'claude-opus-4-1-20250805',
          expectedSource: 'agent',
        },
      ];

      for (const tc of cases) {
        await writeFile(
          resolve(testDir, 'models.json'),
          JSON.stringify(tc.config),
          'utf-8'
        );

        resolver = new ModelResolver({}, testDir);
        const result = await resolver.resolve('software-implementer', 'coding');

        if (tc.expectedTier) {
          expect(result.tier, tc.name).toBe(tc.expectedTier);
        }
        if (tc.expectedModelId) {
          expect(result.modelId, tc.name).toBe(tc.expectedModelId);
        }
        if (tc.expectedSource) {
          expect(result.source, tc.name).toBe(tc.expectedSource);
        }
      }
    });

    it('should determine role from agent category', async () => {
      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('architecture-designer');

      expect(result.role).toBe('reasoning');
      expect(result.tier).toBe('premium');
    });
  });

  describe('getModelInfo', () => {
    beforeEach(() => {
      resolver = new ModelResolver({}, testDir);
    });

    it('should get model info by ID or alias', async () => {
      const cases = [
        {
          name: 'exact ID',
          query: 'claude-opus-4-5-20251101',
          expected: {
            id: 'claude-opus-4-5-20251101',
            provider: 'claude',
            role: 'reasoning',
            contextWindow: 200000,
          },
        },
        {
          name: 'alias',
          query: 'opus',
          expected: {
            id: 'claude-opus-4-5-20251101',
          },
        },
        {
          name: 'with cost info',
          query: 'claude-sonnet-4-5-20250929',
          expected: {
            costPer1kTokens: {
              input: 0.003,
              output: 0.015,
            },
          },
        },
      ];

      for (const tc of cases) {
        const info = await resolver.getModelInfo(tc.query);
        expect(info, tc.name).toBeDefined();
        for (const [key, value] of Object.entries(tc.expected)) {
          expect((info as any)?.[key], `${tc.name} - ${key}`).toEqual(value);
        }
      }
    });

    it('should return null for unknown model', async () => {
      const info = await resolver.getModelInfo('unknown-model');
      expect(info).toBeNull();
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      resolver = new ModelResolver({}, testDir);
    });

    it('should list models with filtering', async () => {
      // All models for default provider
      const allModels = await resolver.listModels();
      expect(allModels.length).toBeGreaterThan(0);
      expect(allModels.every((m) => m.provider === 'claude')).toBe(true);

      // Models for specific provider
      const openaiModels = await resolver.listModels('openai');
      expect(openaiModels.length).toBeGreaterThan(0);
      expect(openaiModels.every((m) => m.provider === 'openai')).toBe(true);

      // Check all three roles are present
      const claudeModels = await resolver.listModels('claude');
      const roles = claudeModels.map((m) => m.role);
      expect(roles).toContain('reasoning');
      expect(roles).toContain('coding');
      expect(roles).toContain('efficiency');
    });

    it('should handle inherited providers', async () => {
      const models = await resolver.listModels('factory');

      // Factory inherits from claude
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'factory')).toBe(true);
    });
  });

  describe('listTiers', () => {
    beforeEach(() => {
      resolver = new ModelResolver({}, testDir);
    });

    it('should list all tiers with metadata', async () => {
      const tiers = await resolver.listTiers();

      expect(tiers.length).toBe(4);
      expect(tiers.map((t) => t.tier)).toEqual([
        'economy',
        'standard',
        'premium',
        'max-quality',
      ]);

      const standardTier = tiers.find((t) => t.tier === 'standard');
      expect(standardTier?.description).toContain('Balanced');
      expect(standardTier?.costMultiplier).toBe(1.0);

      const economyTier = tiers.find((t) => t.tier === 'economy');
      expect(economyTier?.costMultiplier).toBe(0.1);

      const maxQualityTier = tiers.find((t) => t.tier === 'max-quality');
      expect(maxQualityTier?.costMultiplier).toBe(10.0);
    });
  });

  describe('tier role mapping', () => {
    it('should map tiers to correct models for each role', async () => {
      const cases = [
        {
          name: 'economy uses efficiency',
          tier: 'economy',
          assertions: [
            { role: 'reasoning', expected: 'claude-haiku-3-5' },
            { role: 'coding', expected: 'claude-haiku-3-5' },
          ],
        },
        {
          name: 'standard is balanced',
          tier: 'standard',
          assertions: [
            { role: 'reasoning', expected: 'claude-sonnet-4-5-20250929' },
            { role: 'coding', expected: 'claude-sonnet-4-5-20250929' },
            { role: 'efficiency', expected: 'claude-haiku-3-5' },
          ],
        },
        {
          name: 'premium for high quality',
          tier: 'premium',
          assertions: [
            { role: 'reasoning', expected: 'claude-opus-4-5-20251101' },
            { role: 'coding', expected: 'claude-sonnet-4-5-20250929' },
          ],
        },
        {
          name: 'max-quality for best',
          tier: 'max-quality',
          assertions: [
            { role: 'reasoning', expected: 'claude-opus-4-5-20251101' },
            { role: 'coding', expected: 'claude-opus-4-5-20251101' },
            { role: 'efficiency', expected: 'claude-sonnet-4-5-20250929' },
          ],
        },
      ];

      for (const tc of cases) {
        resolver = new ModelResolver({ tier: tc.tier as any }, testDir);
        for (const assertion of tc.assertions) {
          const result = await resolver.resolve('test-agent', assertion.role as any);
          expect(result.modelId, `${tc.name} - ${assertion.role}`).toBe(assertion.expected);
        }
      }
    });
  });

  describe('provider inheritance', () => {
    beforeEach(() => {
      resolver = new ModelResolver({ provider: 'factory' }, testDir);
    });

    it('should inherit models from parent provider', async () => {
      const result = await resolver.resolve('test-agent', 'coding');
      expect(result.modelId).toBe('claude-sonnet-4-5-20250929');

      const models = await resolver.listModels('factory');
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id.startsWith('claude-'))).toBe(true);
    });
  });

  describe('project config precedence', () => {
    it('should use project defaults and custom tiers', async () => {
      // Test project default tier override
      const defaultConfig: UserProjectConfig = {
        defaults: {
          tier: 'premium',
        },
      };

      await writeFile(
        resolve(testDir, 'models.json'),
        JSON.stringify(defaultConfig),
        'utf-8'
      );

      resolver = new ModelResolver({}, testDir);
      const result1 = await resolver.resolve('software-implementer', 'coding');
      expect(result1.tier).toBe('premium');

      // Test custom tier definition
      const customTierConfig: UserProjectConfig = {
        customTiers: {
          'budget-dev': {
            description: 'Budget development tier',
            costMultiplier: 0.05,
            roleMapping: {
              reasoning: 'efficiency',
              coding: 'efficiency',
              efficiency: 'efficiency',
            },
          },
        },
      };

      await writeFile(
        resolve(testDir, 'models.json'),
        JSON.stringify(customTierConfig),
        'utf-8'
      );

      resolver = new ModelResolver({
        tier: 'budget-dev' as any,
        respectMinimums: false,
      }, testDir);

      const result2 = await resolver.resolve('software-implementer', 'reasoning');
      expect(result2.modelId).toBe('claude-haiku-3-5');
    });
  });

  describe('clearCache', () => {
    it('should clear resolver cache', async () => {
      resolver = new ModelResolver({}, testDir);

      await resolver.resolve('test-agent');
      resolver.clearCache();

      const result = await resolver.resolve('test-agent');
      expect(result).toBeDefined();
    });
  });
});
