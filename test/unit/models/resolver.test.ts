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
    it('should resolve agent with default tier and role', async () => {
      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('software-implementer');

      expect(result).toBeDefined();
      expect(result.modelId).toBe('claude-sonnet-4-5-20250929'); // standard tier, coding role
      expect(result.provider).toBe('claude');
      expect(result.tier).toBe('standard');
      expect(result.role).toBe('coding');
    });

    it('should resolve agent with explicit role', async () => {
      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('architecture-designer', 'reasoning');

      // Architecture has minimum tier of premium
      // Premium tier with reasoning role maps to reasoning model (opus)
      expect(result.modelId).toBe('claude-opus-4-5-20251101');
      expect(result.role).toBe('reasoning');
      expect(result.tier).toBe('premium');
    });

    it('should apply tier from CLI options', async () => {
      resolver = new ModelResolver({ tier: 'max-quality' }, testDir);

      const result = await resolver.resolve('software-implementer', 'coding');

      expect(result.modelId).toBe('claude-opus-4-5-20251101'); // max-quality uses opus for coding
      expect(result.tier).toBe('max-quality');
      expect(result.source).toBe('cli');
    });

    it('should apply tier from agent frontmatter', async () => {
      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('software-implementer', 'coding', 'premium');

      expect(result.modelId).toBe('claude-sonnet-4-5-20250929'); // premium tier, coding role
      expect(result.tier).toBe('premium');
      expect(result.source).toBe('agent');
    });

    it('should respect minimum tier for orchestration agents', async () => {
      resolver = new ModelResolver({ tier: 'economy' }, testDir);

      const result = await resolver.resolve('executive-orchestrator', 'reasoning');

      // Should upgrade to premium (minimum for orchestration)
      expect(result.tier).toBe('premium');
      expect(result.modelId).toBe('claude-opus-4-5-20251101'); // premium tier, reasoning role
    });

    it('should ignore minimum tier when respectMinimums is false', async () => {
      resolver = new ModelResolver({ tier: 'economy', respectMinimums: false }, testDir);

      const result = await resolver.resolve('executive-orchestrator', 'reasoning');

      // Should use economy tier despite minimum
      expect(result.tier).toBe('economy');
      expect(result.modelId).toBe('claude-haiku-3-5'); // economy uses efficiency model
    });

    it('should use different provider when specified', async () => {
      resolver = new ModelResolver({ provider: 'openai', tier: 'standard' }, testDir);

      const result = await resolver.resolve('software-implementer', 'coding');

      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-5-codex'); // openai coding model
    });

    it('should handle agent overrides from project config', async () => {
      // Create project config with agent override
      const projectConfig: UserProjectConfig = {
        agentOverrides: {
          'software-implementer': {
            'model-tier': 'premium',
          },
        },
      };

      await writeFile(
        resolve(testDir, 'models.json'),
        JSON.stringify(projectConfig),
        'utf-8'
      );

      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('software-implementer', 'coding');

      expect(result.tier).toBe('premium');
      expect(result.source).toBe('agent');
    });

    it('should handle direct model override', async () => {
      const projectConfig: UserProjectConfig = {
        agentOverrides: {
          'software-implementer': {
            'model-override': 'claude-opus-4-1-20250805',
          },
        },
      };

      await writeFile(
        resolve(testDir, 'models.json'),
        JSON.stringify(projectConfig),
        'utf-8'
      );

      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('software-implementer', 'coding');

      expect(result.modelId).toBe('claude-opus-4-1-20250805');
      expect(result.source).toBe('agent');
    });

    it('should determine role from agent category', async () => {
      resolver = new ModelResolver({}, testDir);

      // architecture-designer should get reasoning role
      const result = await resolver.resolve('architecture-designer');

      expect(result.role).toBe('reasoning');
      expect(result.tier).toBe('premium'); // architecture minimum tier
    });

    it('should use coding as default role for unknown agents', async () => {
      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('unknown-agent');

      expect(result.role).toBe('coding');
      expect(result.tier).toBe('standard');
    });
  });

  describe('getModelInfo', () => {
    beforeEach(() => {
      resolver = new ModelResolver({}, testDir);
    });

    it('should get model info by exact ID', async () => {
      const info = await resolver.getModelInfo('claude-opus-4-5-20251101');

      expect(info).toBeDefined();
      expect(info?.id).toBe('claude-opus-4-5-20251101');
      expect(info?.provider).toBe('claude');
      expect(info?.role).toBe('reasoning');
      expect(info?.contextWindow).toBe(200000);
    });

    it('should get model info by alias', async () => {
      const info = await resolver.getModelInfo('opus');

      expect(info).toBeDefined();
      expect(info?.id).toBe('claude-opus-4-5-20251101');
    });

    it('should return null for unknown model', async () => {
      const info = await resolver.getModelInfo('unknown-model');

      expect(info).toBeNull();
    });

    it('should include cost information', async () => {
      const info = await resolver.getModelInfo('claude-sonnet-4-5-20250929');

      expect(info).toBeDefined();
      expect(info?.costPer1kTokens).toBeDefined();
      expect(info?.costPer1kTokens?.input).toBe(0.003);
      expect(info?.costPer1kTokens?.output).toBe(0.015);
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      resolver = new ModelResolver({}, testDir);
    });

    it('should list all models for default provider', async () => {
      const models = await resolver.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'claude')).toBe(true);
    });

    it('should list models for specific provider', async () => {
      const models = await resolver.listModels('openai');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'openai')).toBe(true);
    });

    it('should include all three roles', async () => {
      const models = await resolver.listModels('claude');

      const roles = models.map((m) => m.role);
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

    it('should list all tiers', async () => {
      const tiers = await resolver.listTiers();

      expect(tiers.length).toBe(4);
      expect(tiers.map((t) => t.tier)).toEqual([
        'economy',
        'standard',
        'premium',
        'max-quality',
      ]);
    });

    it('should include tier metadata', async () => {
      const tiers = await resolver.listTiers();

      const standardTier = tiers.find((t) => t.tier === 'standard');
      expect(standardTier).toBeDefined();
      expect(standardTier?.description).toContain('Balanced');
      expect(standardTier?.costMultiplier).toBe(1.0);
    });

    it('should show economy as cheapest', async () => {
      const tiers = await resolver.listTiers();

      const economyTier = tiers.find((t) => t.tier === 'economy');
      expect(economyTier?.costMultiplier).toBe(0.1);
    });

    it('should show max-quality as most expensive', async () => {
      const tiers = await resolver.listTiers();

      const maxQualityTier = tiers.find((t) => t.tier === 'max-quality');
      expect(maxQualityTier?.costMultiplier).toBe(10.0);
    });
  });

  describe('tier role mapping', () => {
    beforeEach(() => {
      resolver = new ModelResolver({}, testDir);
    });

    it('should map economy tier to efficiency models', async () => {
      resolver = new ModelResolver({ tier: 'economy' }, testDir);

      const reasoningResult = await resolver.resolve('test-agent', 'reasoning');
      const codingResult = await resolver.resolve('test-agent', 'coding');

      // Economy tier maps all roles to efficiency
      expect(reasoningResult.modelId).toBe('claude-haiku-3-5');
      expect(codingResult.modelId).toBe('claude-haiku-3-5');
    });

    it('should use standard tier as balanced', async () => {
      resolver = new ModelResolver({ tier: 'standard' }, testDir);

      const reasoningResult = await resolver.resolve('test-agent', 'reasoning');
      const codingResult = await resolver.resolve('test-agent', 'coding');
      const efficiencyResult = await resolver.resolve('test-agent', 'efficiency');

      expect(reasoningResult.modelId).toBe('claude-sonnet-4-5-20250929'); // reasoning -> coding
      expect(codingResult.modelId).toBe('claude-sonnet-4-5-20250929'); // coding -> coding
      expect(efficiencyResult.modelId).toBe('claude-haiku-3-5'); // efficiency -> efficiency
    });

    it('should use premium tier for high quality', async () => {
      resolver = new ModelResolver({ tier: 'premium' }, testDir);

      const reasoningResult = await resolver.resolve('test-agent', 'reasoning');
      const codingResult = await resolver.resolve('test-agent', 'coding');

      expect(reasoningResult.modelId).toBe('claude-opus-4-5-20251101'); // reasoning -> reasoning
      expect(codingResult.modelId).toBe('claude-sonnet-4-5-20250929'); // coding -> coding
    });

    it('should use max-quality tier for best models', async () => {
      resolver = new ModelResolver({ tier: 'max-quality' }, testDir);

      const reasoningResult = await resolver.resolve('test-agent', 'reasoning');
      const codingResult = await resolver.resolve('test-agent', 'coding');
      const efficiencyResult = await resolver.resolve('test-agent', 'efficiency');

      // Max quality tier overrides: opus for reasoning/coding, sonnet for efficiency
      expect(reasoningResult.modelId).toBe('claude-opus-4-5-20251101');
      expect(codingResult.modelId).toBe('claude-opus-4-5-20251101');
      expect(efficiencyResult.modelId).toBe('claude-sonnet-4-5-20250929'); // tier override for efficiency
    });
  });

  describe('provider inheritance', () => {
    beforeEach(() => {
      resolver = new ModelResolver({ provider: 'factory' }, testDir);
    });

    it('should inherit models from parent provider', async () => {
      const result = await resolver.resolve('test-agent', 'coding');

      // Factory inherits from claude
      expect(result.modelId).toBe('claude-sonnet-4-5-20250929');
    });

    it('should list inherited models', async () => {
      const models = await resolver.listModels('factory');

      expect(models.length).toBeGreaterThan(0);
      // Should have claude models
      expect(models.some((m) => m.id.startsWith('claude-'))).toBe(true);
    });
  });

  describe('project config precedence', () => {
    it('should use project default tier over AIWG default', async () => {
      const projectConfig: UserProjectConfig = {
        defaults: {
          tier: 'premium',
        },
      };

      await writeFile(
        resolve(testDir, 'models.json'),
        JSON.stringify(projectConfig),
        'utf-8'
      );

      resolver = new ModelResolver({}, testDir);

      const result = await resolver.resolve('software-implementer', 'coding');

      expect(result.tier).toBe('premium');
    });

    it('should use custom tier definition', async () => {
      const projectConfig: UserProjectConfig = {
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
        JSON.stringify(projectConfig),
        'utf-8'
      );

      resolver = new ModelResolver({
        tier: 'budget-dev' as any,
        respectMinimums: false, // software-implementer has standard minimum
      }, testDir);

      const result = await resolver.resolve('software-implementer', 'reasoning');

      // Custom tier maps reasoning to efficiency
      expect(result.modelId).toBe('claude-haiku-3-5');
    });
  });

  describe('clearCache', () => {
    it('should clear resolver cache', async () => {
      resolver = new ModelResolver({}, testDir);

      await resolver.resolve('test-agent');
      resolver.clearCache();

      // Should be able to resolve again after cache clear
      const result = await resolver.resolve('test-agent');
      expect(result).toBeDefined();
    });
  });
});
