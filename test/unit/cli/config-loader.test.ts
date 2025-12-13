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
    it('should load defaults when no config file exists', async () => {
      const config = await loader.load();

      expect(config).toBeDefined();
      expect(config.version).toBe('1.0');
      expect(config.validation.threshold).toBe(70);
    });

    it('should load from specified file path', async () => {
      const configPath = resolve(testDir, '.aiwgrc.json');
      const customConfig = {
        version: '1.0',
        validation: { threshold: 85 }
      };

      await writeFile(configPath, JSON.stringify(customConfig), 'utf-8');

      const config = await loader.load(configPath);

      expect(config.validation.threshold).toBe(85);
    });

    it('should merge with defaults', async () => {
      const configPath = resolve(testDir, '.aiwgrc.json');
      const customConfig = {
        validation: { threshold: 80 }
      };

      await writeFile(configPath, JSON.stringify(customConfig), 'utf-8');

      const config = await loader.load(configPath);

      expect(config.validation.threshold).toBe(80);
      expect(config.version).toBe('1.0'); // From defaults
      expect(config.optimization).toBeDefined(); // From defaults
    });

    it('should throw on invalid config', async () => {
      const configPath = resolve(testDir, '.aiwgrc.json');
      const invalidConfig = {
        version: '1.0',
        validation: { threshold: 150 } // Invalid
      };

      await writeFile(configPath, JSON.stringify(invalidConfig), 'utf-8');

      await expect(loader.load(configPath)).rejects.toThrow('Invalid configuration');
    });

    it('should cache loaded config', async () => {
      const config1 = await loader.load();
      const config2 = await loader.load();

      expect(config1).toBe(config2);
    });
  });

  describe('loadFromFile', () => {
    it('should load config from file', async () => {
      const configPath = resolve(testDir, 'config.json');
      const customConfig = {
        version: '1.0',
        validation: { threshold: 90 }
      };

      await writeFile(configPath, JSON.stringify(customConfig), 'utf-8');

      const config = await loader.loadFromFile(configPath);

      expect(config).toBeDefined();
      expect(config?.validation?.threshold).toBe(90);
    });

    it('should return null for nonexistent file', async () => {
      const config = await loader.loadFromFile(resolve(testDir, 'nonexistent.json'));

      expect(config).toBeNull();
    });

    it('should throw on invalid JSON', async () => {
      const configPath = resolve(testDir, 'invalid.json');
      await writeFile(configPath, 'not valid json', 'utf-8');

      await expect(loader.loadFromFile(configPath)).rejects.toThrow();
    });
  });

  describe('loadFromPackageJson', () => {
    it('should load from package.json aiwg field', async () => {
      const pkgPath = resolve(testDir, 'package.json');
      const pkg = {
        name: 'test',
        aiwg: {
          validation: { threshold: 75 }
        }
      };

      await writeFile(pkgPath, JSON.stringify(pkg), 'utf-8');

      const config = await loader.loadFromPackageJson(pkgPath);

      expect(config).toBeDefined();
      expect(config?.validation?.threshold).toBe(75);
    });

    it('should return null if no aiwg field', async () => {
      const pkgPath = resolve(testDir, 'package.json');
      await writeFile(pkgPath, JSON.stringify({ name: 'test' }), 'utf-8');

      const config = await loader.loadFromPackageJson(pkgPath);

      expect(config).toBeNull();
    });
  });

  describe('findConfigFile', () => {
    it('should find config in current directory', async () => {
      const configPath = resolve(testDir, '.aiwgrc.json');
      await writeFile(configPath, JSON.stringify({ version: '1.0' }), 'utf-8');

      const config = await loader.findConfigFile(testDir);

      expect(config).toBeDefined();
    });

    it('should find config in parent directory', async () => {
      const parentConfig = resolve(testDir, '.aiwgrc.json');
      await writeFile(parentConfig, JSON.stringify({ version: '1.0' }), 'utf-8');

      const subDir = resolve(testDir, 'sub', 'dir');
      await mkdir(subDir, { recursive: true });

      const config = await loader.findConfigFile(subDir);

      expect(config).toBeDefined();
    });

    it('should return null if no config found', async () => {
      const config = await loader.findConfigFile(testDir);

      expect(config).toBeNull();
    });
  });

  describe('merge', () => {
    it('should merge partial configs', () => {
      const base = loader.getDefaults();
      const override1 = { validation: { threshold: 80 } };
      const override2 = { optimization: { autoApply: true } };

      const merged = loader.merge([base, override1, override2]);

      expect(merged.validation.threshold).toBe(80);
      expect(merged.optimization.autoApply).toBe(true);
      expect(merged.version).toBe(base.version);
    });

    it('should override with later configs', () => {
      const config1 = { validation: { threshold: 70 } };
      const config2 = { validation: { threshold: 85 } };

      const merged = loader.merge([loader.getDefaults(), config1, config2]);

      expect(merged.validation.threshold).toBe(85);
    });

    it('should preserve unmerged fields', () => {
      const base = loader.getDefaults();
      const override = { validation: { threshold: 80 } };

      const merged = loader.merge([base, override]);

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

    it('should reject invalid version', () => {
      const config = loader.getDefaults();
      config.version = 'invalid';

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('should reject invalid threshold', () => {
      const config = loader.getDefaults();
      config.validation.threshold = 150;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('threshold'))).toBe(true);
    });

    it('should reject invalid context', () => {
      const config = loader.getDefaults();
      (config.validation.context as any) = 'invalid';

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('context'))).toBe(true);
    });

    it('should reject invalid format', () => {
      const config = loader.getDefaults();
      (config.output.format as any) = 'invalid';

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('format'))).toBe(true);
    });

    it('should reject negative debounce', () => {
      const config = loader.getDefaults();
      config.watch.debounce = -100;

      const result = loader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('debounce'))).toBe(true);
    });

    it('should warn on unknown strategies', () => {
      const config = loader.getDefaults();
      config.optimization.strategies.push('unknown_strategy');

      const result = loader.validate(config);

      expect(result.warnings.some(w => w.includes('unknown_strategy'))).toBe(true);
    });

    it('should warn on empty watch patterns', () => {
      const config = loader.getDefaults();
      config.watch.patterns = [];

      const result = loader.validate(config);

      expect(result.warnings.some(w => w.includes('patterns'))).toBe(true);
    });
  });

  describe('getDefaults', () => {
    it('should return valid default config', () => {
      const defaults = loader.getDefaults();

      expect(defaults.version).toBe('1.0');
      expect(defaults.validation.threshold).toBe(70);
      expect(defaults.optimization.strategies).toContain('specificity');
      expect(defaults.watch.patterns).toContain('**/*.md');
    });

    it('should return new object each time', () => {
      const defaults1 = loader.getDefaults();
      const defaults2 = loader.getDefaults();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });
  });

  describe('generateExample', () => {
    it('should generate valid JSON', () => {
      const example = loader.generateExample();

      const parsed = JSON.parse(example);
      expect(parsed.version).toBe('1.0');
    });

    it('should be formatted', () => {
      const example = loader.generateExample();

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
    it('should override config values', () => {
      const config = loader.getDefaults();
      const overrides = {
        validation: { threshold: 85 }
      };

      const overridden = loader.override(config, overrides);

      expect(overridden.validation.threshold).toBe(85);
    });

    it('should not modify original config', () => {
      const config = loader.getDefaults();
      const originalThreshold = config.validation.threshold;

      loader.override(config, { validation: { threshold: 90 } });

      expect(config.validation.threshold).toBe(originalThreshold);
    });
  });
});
