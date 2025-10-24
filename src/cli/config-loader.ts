/**
 * Configuration Loader
 *
 * Manages loading, validating, and merging AIWG CLI configurations from multiple sources.
 * Supports .aiwgrc.json, package.json, and command-line overrides.
 */

import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { constants } from 'fs';

export interface ValidationConfig {
  enabled: boolean;
  threshold: number; // minimum score to pass (0-100)
  context?: 'academic' | 'technical' | 'executive' | 'casual';
  failOnCritical: boolean;
  rules?: string[]; // custom rule paths
}

export interface OptimizationConfig {
  enabled: boolean;
  autoApply: boolean;
  strategies: string[]; // 'specificity' | 'examples' | 'constraints' | 'voice' | 'anti_pattern'
  createBackup: boolean;
}

export interface OutputConfig {
  format: 'text' | 'json' | 'html' | 'junit';
  destination?: string;
  verbose: boolean;
  colors: boolean;
}

export interface WatchConfig {
  enabled: boolean;
  patterns: string[]; // glob patterns to watch
  debounce: number; // ms to wait before processing
  ignorePatterns?: string[];
}

export interface HooksConfig {
  preCommit: boolean;
  prePush: boolean;
  hookPath?: string;
}

export interface AiwgConfig {
  version: string;
  validation: ValidationConfig;
  optimization: OptimizationConfig;
  output: OutputConfig;
  watch: WatchConfig;
  hooks: HooksConfig;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration Loader class
 */
export class ConfigLoader {
  private configCache: AiwgConfig | null = null;

  /**
   * Load configuration from file or defaults
   */
  async load(configPath?: string): Promise<AiwgConfig> {
    // If cached, return it
    if (this.configCache) {
      return this.configCache;
    }

    // Start with defaults
    let config = this.getDefaults();

    // Try to load from .aiwgrc.json
    if (configPath) {
      const fileConfig = await this.loadFromFile(configPath);
      if (fileConfig) {
        config = this.merge([config, fileConfig]);
      }
    } else {
      // Look for .aiwgrc.json in current directory and parent directories
      const foundConfig = await this.findConfigFile(process.cwd());
      if (foundConfig) {
        config = this.merge([config, foundConfig]);
      }
    }

    // Try to load from package.json
    const pkgPath = resolve(process.cwd(), 'package.json');
    if (existsSync(pkgPath)) {
      const pkgConfig = await this.loadFromPackageJson(pkgPath);
      if (pkgConfig) {
        config = this.merge([config, pkgConfig]);
      }
    }

    // Validate merged config
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Cache it
    this.configCache = config;

    return config;
  }

  /**
   * Load configuration from .aiwgrc.json file
   */
  async loadFromFile(filePath: string): Promise<Partial<AiwgConfig> | null> {
    try {
      await access(filePath, constants.R_OK);
      const content = await readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as Partial<AiwgConfig>;
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load config from ${filePath}: ${error}`);
    }
  }

  /**
   * Load configuration from package.json "aiwg" field
   */
  async loadFromPackageJson(pkgPath: string): Promise<Partial<AiwgConfig> | null> {
    try {
      const content = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as { aiwg?: Partial<AiwgConfig> };
      return pkg.aiwg || null;
    } catch {
      return null;
    }
  }

  /**
   * Find config file by walking up directory tree
   */
  async findConfigFile(startDir: string): Promise<Partial<AiwgConfig> | null> {
    let currentDir = startDir;
    const root = resolve('/');

    while (currentDir !== root) {
      const configPath = resolve(currentDir, '.aiwgrc.json');
      if (existsSync(configPath)) {
        return await this.loadFromFile(configPath);
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root
      }
      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Merge multiple partial configs into one complete config
   */
  merge(configs: Partial<AiwgConfig>[]): AiwgConfig {
    const result = this.getDefaults();

    for (const config of configs) {
      if (config.version) result.version = config.version;

      if (config.validation) {
        result.validation = { ...result.validation, ...config.validation };
      }

      if (config.optimization) {
        result.optimization = { ...result.optimization, ...config.optimization };
      }

      if (config.output) {
        result.output = { ...result.output, ...config.output };
      }

      if (config.watch) {
        result.watch = { ...result.watch, ...config.watch };
      }

      if (config.hooks) {
        result.hooks = { ...result.hooks, ...config.hooks };
      }
    }

    return result;
  }

  /**
   * Validate configuration object
   */
  validate(config: AiwgConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate version
    if (!config.version || !config.version.match(/^\d+\.\d+$/)) {
      errors.push('Invalid version format (expected "1.0")');
    }

    // Validate validation config
    if (config.validation.threshold < 0 || config.validation.threshold > 100) {
      errors.push('Validation threshold must be between 0 and 100');
    }

    if (config.validation.context &&
        !['academic', 'technical', 'executive', 'casual'].includes(config.validation.context)) {
      errors.push('Invalid validation context');
    }

    // Validate optimization config
    const validStrategies = ['specificity', 'examples', 'constraints', 'voice', 'anti_pattern'];
    for (const strategy of config.optimization.strategies) {
      if (!validStrategies.includes(strategy)) {
        warnings.push(`Unknown optimization strategy: ${strategy}`);
      }
    }

    // Validate output config
    if (!['text', 'json', 'html', 'junit'].includes(config.output.format)) {
      errors.push('Invalid output format (must be: text, json, html, or junit)');
    }

    // Validate watch config
    if (config.watch.debounce < 0) {
      errors.push('Watch debounce must be >= 0');
    }

    if (config.watch.patterns.length === 0) {
      warnings.push('No watch patterns specified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default configuration
   */
  getDefaults(): AiwgConfig {
    return {
      version: '1.0',
      validation: {
        enabled: true,
        threshold: 70,
        context: undefined,
        failOnCritical: true,
        rules: []
      },
      optimization: {
        enabled: true,
        autoApply: false,
        strategies: ['specificity', 'examples', 'constraints', 'anti_pattern'],
        createBackup: true
      },
      output: {
        format: 'text',
        destination: undefined,
        verbose: false,
        colors: true
      },
      watch: {
        enabled: false,
        patterns: ['**/*.md', '**/*.txt'],
        debounce: 500,
        ignorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**']
      },
      hooks: {
        preCommit: false,
        prePush: false,
        hookPath: '.git/hooks'
      }
    };
  }

  /**
   * Generate example config file content
   */
  generateExample(): string {
    const example = this.getDefaults();
    return JSON.stringify(example, null, 2);
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.configCache = null;
  }

  /**
   * Override specific config values
   */
  override(config: AiwgConfig, overrides: Partial<AiwgConfig>): AiwgConfig {
    return this.merge([config, overrides]);
  }
}
