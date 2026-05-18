/**
 * Model Override Tests
 *
 * Tests for CLI model override functionality:
 * - --model blanket override
 * - --reasoning-model / --coding-model / --efficiency-model individual overrides
 * - Shorthand resolution (opus, sonnet, haiku)
 * - modelsConfig loading and wiring
 * - Precedence: CLI > models.json > defaults
 *
 * @issue #411
 */

import { describe, it, expect } from 'vitest';
import {
  FACTORY_DEPLOY_MODELS,
  DEFAULT_SHORTHAND,
  LEGACY_MODELS,
  buildFactoryModelsConfig,
} from '../../fixtures/models.js';

// Import the functions we need to test
// We test the provider mapModel functions directly since deploy-agents.mjs
// is a script entry point (harder to unit test)
import { mapModel as claudeMapModel } from '../../../tools/agents/providers/claude.mjs';
import { mapModel as factoryMapModel } from '../../../tools/agents/providers/factory.mjs';
import { loadModelConfig } from '../../../tools/agents/providers/base.mjs';

describe('Model Override - Claude Provider', () => {
  describe('mapModel with CLI overrides', () => {
    it('should use reasoningModel for opus agents', () => {
      const result = claudeMapModel('opus', { reasoningModel: 'my-custom-opus' }, {});
      expect(result).toBe('my-custom-opus');
    });

    it('should use codingModel for sonnet agents', () => {
      const result = claudeMapModel('sonnet', { codingModel: 'my-custom-sonnet' }, {});
      expect(result).toBe('my-custom-sonnet');
    });

    it('should use efficiencyModel for haiku agents', () => {
      const result = claudeMapModel('haiku', { efficiencyModel: 'my-custom-haiku' }, {});
      expect(result).toBe('my-custom-haiku');
    });

    it('should default to opus for reasoning when only codingModel is set', () => {
      const result = claudeMapModel('opus', { codingModel: 'my-sonnet' }, {});
      expect(result).toBe('opus');
    });

    it('should default to haiku for efficiency when only codingModel is set', () => {
      const result = claudeMapModel('haiku', { codingModel: 'my-sonnet' }, {});
      expect(result).toBe('haiku');
    });

    it('should handle blanket override (all three set to same value)', () => {
      const modelCfg = {
        reasoningModel: 'sonnet',
        codingModel: 'sonnet',
        efficiencyModel: 'sonnet',
      };
      expect(claudeMapModel('opus', modelCfg, {})).toBe('sonnet');
      expect(claudeMapModel('sonnet', modelCfg, {})).toBe('sonnet');
      expect(claudeMapModel('haiku', modelCfg, {})).toBe('sonnet');
    });
  });

  describe('mapModel without overrides', () => {
    it('should pass through shorthand unchanged for Claude', () => {
      expect(claudeMapModel('opus', {}, {})).toBe('opus');
      expect(claudeMapModel('sonnet', {}, {})).toBe('sonnet');
      expect(claudeMapModel('haiku', {}, {})).toBe('haiku');
    });

    it('should default to sonnet when model is null', () => {
      expect(claudeMapModel(null, {}, {})).toBe('sonnet');
    });
  });
});

describe('Model Override - Factory Provider', () => {
  const defaultModelsConfig = buildFactoryModelsConfig();

  describe('mapModel with CLI overrides', () => {
    it('should use reasoningModel for opus agents', () => {
      const result = factoryMapModel('opus', { reasoningModel: LEGACY_MODELS.gpt53codex }, defaultModelsConfig);
      expect(result).toBe(LEGACY_MODELS.gpt53codex);
    });

    it('should use codingModel for sonnet agents', () => {
      const result = factoryMapModel('sonnet', { codingModel: LEGACY_MODELS.gpt53codex }, defaultModelsConfig);
      expect(result).toBe(LEGACY_MODELS.gpt53codex);
    });

    it('should use efficiencyModel for haiku agents', () => {
      const result = factoryMapModel('haiku', { efficiencyModel: LEGACY_MODELS.gpt5codexMini }, defaultModelsConfig);
      expect(result).toBe(LEGACY_MODELS.gpt5codexMini);
    });

    it('should handle blanket override (all three set to same value)', () => {
      const modelCfg = {
        reasoningModel: FACTORY_DEPLOY_MODELS.coding,
        codingModel: FACTORY_DEPLOY_MODELS.coding,
        efficiencyModel: FACTORY_DEPLOY_MODELS.coding,
      };
      expect(factoryMapModel('opus', modelCfg, defaultModelsConfig)).toBe(FACTORY_DEPLOY_MODELS.coding);
      expect(factoryMapModel('sonnet', modelCfg, defaultModelsConfig)).toBe(FACTORY_DEPLOY_MODELS.coding);
      expect(factoryMapModel('haiku', modelCfg, defaultModelsConfig)).toBe(FACTORY_DEPLOY_MODELS.coding);
    });
  });

  describe('mapModel with modelsConfig (no CLI overrides)', () => {
    it('should resolve opus via shorthand to factory model', () => {
      const result = factoryMapModel('opus', {}, defaultModelsConfig);
      expect(result).toBe(FACTORY_DEPLOY_MODELS.reasoning);
    });

    it('should resolve sonnet via shorthand to factory model', () => {
      const result = factoryMapModel('sonnet', {}, defaultModelsConfig);
      expect(result).toBe(FACTORY_DEPLOY_MODELS.coding);
    });

    it('should resolve haiku via shorthand to factory model', () => {
      const result = factoryMapModel('haiku', {}, defaultModelsConfig);
      expect(result).toBe(FACTORY_DEPLOY_MODELS.efficiency);
    });

    it('should use factory_shorthand when available', () => {
      const config = {
        ...defaultModelsConfig,
        factory_shorthand: {
          opus: 'custom-opus',
          sonnet: 'custom-sonnet',
          haiku: 'custom-haiku',
        },
      };
      expect(factoryMapModel('opus', {}, config)).toBe('custom-opus');
      expect(factoryMapModel('sonnet', {}, config)).toBe('custom-sonnet');
    });

    it('should default to coding model when model is null', () => {
      const result = factoryMapModel(null, {}, defaultModelsConfig);
      expect(result).toBe(FACTORY_DEPLOY_MODELS.coding);
    });
  });

  describe('mapModel with empty config', () => {
    it('should fall back to DEFAULT_FACTORY_MODELS', () => {
      const result = factoryMapModel('opus', {}, {});
      expect(result).toBe(FACTORY_DEPLOY_MODELS.reasoning);
    });
  });
});

describe('loadModelConfig', () => {
  it('should return an object with shorthand mappings', () => {
    // This loads from the AIWG defaults (since we are in the repo)
    const repoRoot = process.cwd();
    const config = loadModelConfig(repoRoot);
    expect(config).toBeDefined();
    expect(config.shorthand).toBeDefined();
    expect(config.shorthand.opus).toBeDefined();
    expect(config.shorthand.sonnet).toBeDefined();
    expect(config.shorthand.haiku).toBeDefined();
  });

  it('should include provider configs', () => {
    const repoRoot = process.cwd();
    const config = loadModelConfig(repoRoot);
    expect(config.factory).toBeDefined();
    expect(config.factory.reasoning).toBeDefined();
    expect(config.factory.coding).toBeDefined();
    expect(config.factory.efficiency).toBeDefined();
  });

  it('should keep Claude Code sonnet on the non-1M alias by default', () => {
    const repoRoot = process.cwd();
    const config = loadModelConfig(repoRoot);
    expect(config.claude.coding.model).toBe('sonnet');
    expect(config.claude_shorthand.sonnet).toBe('sonnet');
    expect(config.claude_shorthand['sonnet-1m']).toBe('sonnet[1m]');
    expect(config.shorthand.sonnet).toBe(FACTORY_DEPLOY_MODELS.coding);
  });

  it('should tag config with _source', () => {
    const repoRoot = process.cwd();
    const config = loadModelConfig(repoRoot);
    expect(config._source).toBeDefined();
    expect(typeof config._source).toBe('string');
  });
});

describe('Blanket --model flag behavior', () => {
  // These test the expected behavior of the blanket flag
  // The actual flag parsing is in deploy-agents.mjs main()

  it('blanket should set all tiers when none individually specified', () => {
    // Simulates: --model sonnet
    const cfg = { model: 'sonnet', reasoningModel: null, codingModel: null, efficiencyModel: null };
    if (cfg.model) {
      if (!cfg.reasoningModel) cfg.reasoningModel = cfg.model;
      if (!cfg.codingModel) cfg.codingModel = cfg.model;
      if (!cfg.efficiencyModel) cfg.efficiencyModel = cfg.model;
    }
    expect(cfg.reasoningModel).toBe('sonnet');
    expect(cfg.codingModel).toBe('sonnet');
    expect(cfg.efficiencyModel).toBe('sonnet');
  });

  it('individual tier should override blanket', () => {
    // Simulates: --model sonnet --reasoning opus
    const cfg = { model: 'sonnet', reasoningModel: 'opus', codingModel: null, efficiencyModel: null };
    if (cfg.model) {
      if (!cfg.reasoningModel) cfg.reasoningModel = cfg.model;
      if (!cfg.codingModel) cfg.codingModel = cfg.model;
      if (!cfg.efficiencyModel) cfg.efficiencyModel = cfg.model;
    }
    expect(cfg.reasoningModel).toBe('opus');
    expect(cfg.codingModel).toBe('sonnet');
    expect(cfg.efficiencyModel).toBe('sonnet');
  });

  it('all individual tiers should override blanket', () => {
    // Simulates: --model sonnet --reasoning opus --coding haiku --efficiency inherit
    const cfg = { model: 'sonnet', reasoningModel: 'opus', codingModel: 'haiku', efficiencyModel: 'inherit' };
    if (cfg.model) {
      if (!cfg.reasoningModel) cfg.reasoningModel = cfg.model;
      if (!cfg.codingModel) cfg.codingModel = cfg.model;
      if (!cfg.efficiencyModel) cfg.efficiencyModel = cfg.model;
    }
    expect(cfg.reasoningModel).toBe('opus');
    expect(cfg.codingModel).toBe('haiku');
    expect(cfg.efficiencyModel).toBe('inherit');
  });
});
