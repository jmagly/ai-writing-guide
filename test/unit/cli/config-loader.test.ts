/**
 * Tests for Config Loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { resolve } from 'path';
import { ConfigLoader, AiwgConfig } from '../../../src/cli/config-loader.ts';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let testDir: string;

  beforeEach(async () => {
    loader = new ConfigLoader();
    testDir = resolve(process.cwd(), 'test-temp-config');
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    loader.clearCache();
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('load', () => {
    it('should handle loading, merging, validation, and caching', async () => {
      // Test 1: Load defaults when no config exists
      let config = await loader.load();
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0');
      expect(config.validation.threshold).toBe(70);

      // Test 2: Load from specified file path
      loader.clearCache();
      const configPath = resolve(testDir, '.aiwgrc.json');
      await writeFile(configPath, JSON.stringify({
        version: '1.0',
        validation: { threshold: 85 }
      }), 'utf-8');

      config = await loader.load(configPath);
      expect(config.validation.threshold).toBe(85);

      // Cleanup for next test
      loader.clearCache();
      await rm(configPath);

      // Test 3: Merge with defaults
      await writeFile(configPath, JSON.stringify({
        validation: { threshold: 80 }
      }), 'utf-8');

      config = await loader.load(configPath);
      expect(config.validation.threshold).toBe(80);
      expect(config.version).toBe('1.0'); // From defaults
      expect(config.optimization).toBeDefined(); // From defaults

      // Cleanup for next test
      loader.clearCache();
      await rm(configPath);

      // Test 4: Throw on invalid config
      await writeFile(configPath, JSON.stringify({
        version: '1.0',
        validation: { threshold: 150 } // Invalid
      }), 'utf-8');

      await expect(loader.load(configPath)).rejects.toThrow('Invalid configuration');

      // Cleanup for next test
      loader.clearCache();
      await rm(configPath);

      // Test 5: Cache loaded config
      const config1 = await loader.load();
      const config2 = await loader.load();
      expect(config1).toBe(config2);
    });
  });

  describe('loadFromFile', () => {
    it('should load from file, handle nonexistent files, and reject invalid JSON', async () => {
      // Test 1: Load config from file
      const configPath = resolve(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        version: '1.0',
        validation: { threshold: 90 }
      }), 'utf-8');

      let config = await loader.loadFromFile(configPath);
      expect(config).toBeDefined();
      expect(config?.validation?.threshold).toBe(90);

      // Test 2: Return null for nonexistent file
      config = await loader.loadFromFile(resolve(testDir, 'nonexistent.json'));
      expect(config).toBeNull();

      // Test 3: Throw on invalid JSON
      const invalidPath = resolve(testDir, 'invalid.json');
      await writeFile(invalidPath, 'not valid json', 'utf-8');
      await expect(loader.loadFromFile(invalidPath)).rejects.toThrow();
    });
  });

  describe('loadFromPackageJson', () => {
    it('should load from package.json aiwg field or return null', async () => {
      const pkgPath = resolve(testDir, 'package.json');

      // Test 1: Load from aiwg field
      await writeFile(pkgPath, JSON.stringify({
        name: 'test',
        aiwg: {
          validation: { threshold: 75 }
        }
      }), 'utf-8');

      let config = await loader.loadFromPackageJson(pkgPath);
      expect(config).toBeDefined();
      expect(config?.validation?.threshold).toBe(75);

      // Test 2: Return null if no aiwg field
      await writeFile(pkgPath, JSON.stringify({ name: 'test' }), 'utf-8');
      config = await loader.loadFromPackageJson(pkgPath);
      expect(config).toBeNull();
    });
  });

  describe('findConfigFile', () => {
    it('should find config in current and parent directories, or return null', async () => {
      // Test 1: Find in current directory
      const configPath = resolve(testDir, '.aiwgrc.json');
      await writeFile(configPath, JSON.stringify({ version: '1.0' }), 'utf-8');

      let config = await loader.findConfigFile(testDir);
      expect(config).toBeDefined();

      // Cleanup for next test
      await rm(configPath);

      // Test 2: Find in parent directory
      const parentConfig = resolve(testDir, '.aiwgrc.json');
      await writeFile(parentConfig, JSON.stringify({ version: '1.0' }), 'utf-8');

      const subDir = resolve(testDir, 'sub', 'dir');
      await mkdir(subDir, { recursive: true });

      config = await loader.findConfigFile(subDir);
      expect(config).toBeDefined();

      // Cleanup for next test
      await rm(parentConfig);

      // Test 3: Return null if not found
      config = await loader.findConfigFile(testDir);
      expect(config).toBeNull();
    });
  });

  describe('merge', () => {
    it('should merge configs, override with later values, and preserve unmerged fields', () => {
      const base = loader.getDefaults();

      // Test 1: Merge partial configs
      const override1 = { validation: { threshold: 80 } };
      const override2 = { optimization: { autoApply: true } };

      let merged = loader.merge([base, override1, override2]);
      expect(merged.validation.threshold).toBe(80);
      expect(merged.optimization.autoApply).toBe(true);
      expect(merged.version).toBe(base.version);

      // Test 2: Override with later configs
      const config1 = { validation: { threshold: 70 } };
      const config2 = { validation: { threshold: 85 } };

      merged = loader.merge([loader.getDefaults(), config1, config2]);
      expect(merged.validation.threshold).toBe(85);

      // Test 3: Preserve unmerged fields
      const override = { validation: { threshold: 80 } };
      merged = loader.merge([base, override]);
      expect(merged.optimization).toEqual(base.optimization);
      expect(merged.output).toEqual(base.output);
    });
  });

  describe('validate', () => {
    it('should validate valid config', () => {
      const config = loader.getDefaults();

      const result = loader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid config values', () => {
      const invalidCases = [
        {
          name: 'invalid version',
          mutate: (cfg: AiwgConfig) => { cfg.version = 'invalid'; },
          errorIncludes: 'version'
        },
        {
          name: 'invalid threshold',
          mutate: (cfg: AiwgConfig) => { cfg.validation.threshold = 150; },
          errorIncludes: 'threshold'
        },
        {
          name: 'invalid context',
          mutate: (cfg: AiwgConfig) => { (cfg.validation.context as any) = 'invalid'; },
          errorIncludes: 'context'
        },
        {
          name: 'invalid format',
          mutate: (cfg: AiwgConfig) => { (cfg.output.format as any) = 'invalid'; },
          errorIncludes: 'format'
        },
        {
          name: 'negative debounce',
          mutate: (cfg: AiwgConfig) => { cfg.watch.debounce = -100; },
          errorIncludes: 'debounce'
        }
      ];

      for (const testCase of invalidCases) {
        const config = loader.getDefaults();
        testCase.mutate(config);

        const result = loader.validate(config);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes(testCase.errorIncludes))).toBe(true);
      }
    });

    it('should generate warnings for problematic config values', () => {
      const warningCases = [
        {
          name: 'unknown strategies',
          mutate: (cfg: AiwgConfig) => { cfg.optimization.strategies.push('unknown_strategy'); },
          warningIncludes: 'unknown_strategy'
        },
        {
          name: 'empty watch patterns',
          mutate: (cfg: AiwgConfig) => { cfg.watch.patterns = []; },
          warningIncludes: 'patterns'
        }
      ];

      for (const testCase of warningCases) {
        const config = loader.getDefaults();
        testCase.mutate(config);

        const result = loader.validate(config);

        expect(result.warnings.some(w => w.includes(testCase.warningIncludes))).toBe(true);
      }
    });
  });

  describe('getDefaults', () => {
    it('should return valid default config as new object each time', () => {
      // Test 1: Valid default config
      const defaults = loader.getDefaults();
      expect(defaults.version).toBe('1.0');
      expect(defaults.validation.threshold).toBe(70);
      expect(defaults.optimization.strategies).toContain('specificity');
      expect(defaults.watch.patterns).toContain('**/*.md');

      // Test 2: New object each time
      const defaults1 = loader.getDefaults();
      const defaults2 = loader.getDefaults();
      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });
  });

  describe('generateExample', () => {
    it('should generate valid formatted JSON', () => {
      const example = loader.generateExample();

      const parsed = JSON.parse(example);
      expect(parsed.version).toBe('1.0');

      // Should be formatted
      expect(example).toContain('\n');
      expect(example).toContain('  ');
    });
  });

  describe('clearCache', () => {
    it('should clear cached config', async () => {
      const config1 = await loader.load();
      loader.clearCache();
      const config2 = await loader.load();

      expect(config1).not.toBe(config2);
    });
  });

  describe('override', () => {
    it('should override config values without modifying original', () => {
      const config = loader.getDefaults();
      const originalThreshold = config.validation.threshold;
      const overrides = {
        validation: { threshold: 85 }
      };

      const overridden = loader.override(config, overrides);

      // Should override
      expect(overridden.validation.threshold).toBe(85);

      // Should not modify original
      expect(config.validation.threshold).toBe(originalThreshold);
    });
  });
});
