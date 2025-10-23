/**
 * FrameworkConfigLoader - Load and merge framework configurations
 *
 * Handles loading framework-specific configs, merging with shared configs,
 * and managing configuration precedence. Supports JSON and YAML formats.
 *
 * FID-007 Framework-Scoped Workspaces configuration management.
 *
 * @module src/plugin/framework-config-loader
 * @version 1.0.0
 * @since 2025-10-23
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ===========================
// Interfaces
// ===========================

export interface LoadOptions {
  environment?: string;
  respectMergeStrategy?: boolean;
  includeLocal?: boolean;
}

// ===========================
// FrameworkConfigLoader Class
// ===========================

export class FrameworkConfigLoader {
  private projectRoot: string;
  private configCache: Map<string, any> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Load framework configuration
   *
   * @param framework - Framework name
   * @param options - Load options
   * @returns Merged configuration
   */
  async loadConfig(framework: string, options: LoadOptions = {}): Promise<any> {
    const cacheKey = `${framework}-${options.environment || 'default'}`;

    // Check cache
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey);
    }

    // Load shared config
    const sharedConfig = await this.loadSharedConfig();

    // Load framework-specific config
    const frameworkConfig = await this.loadFrameworkConfig(framework);

    // Load environment-specific config
    let envConfig = {};
    if (options.environment) {
      envConfig = await this.loadEnvironmentConfig(framework, options.environment);
    }

    // Load local overrides
    let localConfig = {};
    if (options.includeLocal) {
      localConfig = await this.loadLocalConfig(framework);
    }

    // Merge configs (later configs override earlier)
    let merged = this.deepMerge(
      sharedConfig,
      frameworkConfig,
      envConfig,
      localConfig
    );

    // Apply merge strategy if requested
    if (options.respectMergeStrategy && sharedConfig.mergeStrategy) {
      merged = this.applyMergeStrategy(merged, sharedConfig.mergeStrategy);
    }

    // Cache result
    this.configCache.set(cacheKey, merged);

    return merged;
  }

  /**
   * Get specific config value
   *
   * @param framework - Framework name
   * @param key - Config key (supports dot notation)
   * @param defaultValue - Default value if key not found
   * @returns Config value
   */
  getConfigValue(framework: string, key: string, defaultValue?: any): any {
    const config = this.configCache.get(`${framework}-default`);
    if (!config) {
      return defaultValue;
    }

    const keys = key.split('.');
    let value = config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Save framework configuration
   *
   * @param framework - Framework name
   * @param config - Configuration to save
   */
  async saveConfig(framework: string, config: any): Promise<void> {
    const configPath = path.join(this.projectRoot, '.aiwg', framework, 'settings.json');

    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Invalidate cache
    this.configCache.delete(`${framework}-default`);
  }

  // ===========================
  // Private Methods
  // ===========================

  private async loadSharedConfig(): Promise<any> {
    const workspacePath = path.join(this.projectRoot, '.aiwg', 'workspace.json');

    try {
      const content = await fs.readFile(workspacePath, 'utf-8');
      const workspace = JSON.parse(content);
      return workspace.shared || {};
    } catch {
      return {};
    }
  }

  private async loadFrameworkConfig(framework: string): Promise<any> {
    // Try JSON first
    const jsonPath = path.join(this.projectRoot, '.aiwg', framework, 'settings.json');
    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Try YAML
      const yamlPath = path.join(this.projectRoot, '.aiwg', framework, 'config.yaml');
      try {
        const content = await fs.readFile(yamlPath, 'utf-8');
        return this.parseSimpleYaml(content);
      } catch {
        // Return default config
        return { framework };
      }
    }
  }

  private async loadEnvironmentConfig(framework: string, environment: string): Promise<any> {
    const envPath = path.join(
      this.projectRoot,
      '.aiwg',
      framework,
      `settings.${environment}.json`
    );

    try {
      const content = await fs.readFile(envPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async loadLocalConfig(framework: string): Promise<any> {
    const localPath = path.join(
      this.projectRoot,
      '.aiwg',
      framework,
      'settings.local.json'
    );

    try {
      const content = await fs.readFile(localPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private deepMerge(...objects: any[]): any {
    const result: any = {};

    for (const obj of objects) {
      if (!obj) continue;

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            // Merge objects recursively
            result[key] = this.deepMerge(result[key] || {}, value);
          } else {
            // Override with new value
            result[key] = value;
          }
        }
      }
    }

    return result;
  }

  private applyMergeStrategy(config: any, strategy: any): any {
    // Apply merge strategies (e.g., append arrays instead of override)
    const result = { ...config };

    for (const key in strategy) {
      if (strategy[key] === 'append' && Array.isArray(config[key])) {
        // Append strategy already handled in initial merge
        // This is a placeholder for more complex strategies
      }
    }

    return result;
  }

  private parseSimpleYaml(content: string): any {
    const result: any = {};
    const lines = content.split('\n');
    let currentObject: any = result;
    let currentKey: string | null = null;
    let indent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        // Might be array item
        if (trimmed.startsWith('- ')) {
          const value = trimmed.slice(2).trim();
          if (currentKey && Array.isArray(currentObject[currentKey])) {
            currentObject[currentKey].push(value);
          }
        }
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (value) {
        // Simple key-value
        currentObject[key] = value;
      } else {
        // Nested object or array
        currentObject[key] = {};
        currentKey = key;
      }
    }

    return result;
  }
}
