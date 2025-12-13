/**
 * Model Configuration Loader
 * Loads and merges model configurations from multiple sources with proper precedence
 *
 * @implements @.aiwg/architecture/ADR-015-enhanced-model-selection.md
 * @architecture @.aiwg/architecture/enhanced-model-selection-design.md
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import type {
  ModelConfig,
  ModelConfigV1,
  UserProjectConfig,
  MergedModelConfig,
  ProviderDefinition,
  AgentOverride,
} from './types.js';

/**
 * Configuration file locations
 */
export interface ConfigLocations {
  aiwgDefault: string;
  userConfig: string;
  projectConfig: string;
}

/**
 * Loads and merges model configurations
 */
export class ConfigLoader {
  private cache: MergedModelConfig | null = null;
  private readonly locations: ConfigLocations;

  constructor(projectPath?: string) {
    const aiwgHome = process.env.AIWG_HOME || resolve(homedir(), '.local/share/ai-writing-guide');
    const userConfigDir = process.env.AIWG_CONFIG || resolve(homedir(), '.config/aiwg');

    this.locations = {
      aiwgDefault: resolve(aiwgHome, 'agentic/code/frameworks/sdlc-complete/config/models-v2.json'),
      userConfig: resolve(userConfigDir, 'models.json'),
      projectConfig: resolve(projectPath || process.cwd(), 'models.json'),
    };
  }

  /**
   * Load and merge all configurations
   * Precedence: project > user > AIWG default
   */
  async load(): Promise<MergedModelConfig> {
    if (this.cache) {
      return this.cache;
    }

    // Load all configs
    const aiwgDefault = await this.loadAiwgDefault();
    const userConfig = await this.loadUserConfig();
    const projectConfig = await this.loadProjectConfig();

    // Merge with precedence
    const merged = this.merge(aiwgDefault, userConfig, projectConfig);

    this.cache = merged;
    return merged;
  }

  /**
   * Load AIWG default configuration
   */
  private async loadAiwgDefault(): Promise<ModelConfig> {
    try {
      const content = await readFile(this.locations.aiwgDefault, 'utf-8');
      const config = JSON.parse(content) as ModelConfig;

      // Validate it's v2 schema
      if (!config.version || !config.tiers || !config.providers) {
        throw new Error('Invalid AIWG default config: missing required v2 fields');
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to load AIWG default config: ${error}`);
    }
  }

  /**
   * Load user configuration (optional)
   */
  private async loadUserConfig(): Promise<UserProjectConfig | null> {
    if (!existsSync(this.locations.userConfig)) {
      return null;
    }

    try {
      const content = await readFile(this.locations.userConfig, 'utf-8');
      return JSON.parse(content) as UserProjectConfig;
    } catch (error) {
      console.warn(`Warning: Failed to load user config: ${error}`);
      return null;
    }
  }

  /**
   * Load project configuration (optional)
   */
  private async loadProjectConfig(): Promise<UserProjectConfig | null> {
    if (!existsSync(this.locations.projectConfig)) {
      return null;
    }

    try {
      const content = await readFile(this.locations.projectConfig, 'utf-8');
      return JSON.parse(content) as UserProjectConfig;
    } catch (error) {
      console.warn(`Warning: Failed to load project config: ${error}`);
      return null;
    }
  }

  /**
   * Merge configurations with proper precedence
   */
  private merge(
    aiwgDefault: ModelConfig,
    userConfig: UserProjectConfig | null,
    projectConfig: UserProjectConfig | null
  ): MergedModelConfig {
    // Start with AIWG defaults
    const merged: MergedModelConfig = {
      defaults: { ...aiwgDefault.defaults },
      tiers: { ...aiwgDefault.tiers },
      providers: this.deepCloneProviders(aiwgDefault.providers),
      agentRoleAssignments: { ...(aiwgDefault.agentRoleAssignments || {}) },
      shorthand: { ...(aiwgDefault.shorthand || {}) },
      agentOverrides: {},
    };

    // Apply user config
    if (userConfig) {
      if (userConfig.defaults) {
        merged.defaults = { ...merged.defaults, ...userConfig.defaults };
      }
      if (userConfig.customTiers) {
        merged.tiers = { ...merged.tiers, ...userConfig.customTiers };
      }
      if (userConfig.agentOverrides) {
        merged.agentOverrides = { ...userConfig.agentOverrides };
      }
    }

    // Apply project config (highest precedence)
    if (projectConfig) {
      if (projectConfig.defaults) {
        merged.defaults = { ...merged.defaults, ...projectConfig.defaults };
      }
      if (projectConfig.customTiers) {
        merged.tiers = { ...merged.tiers, ...projectConfig.customTiers };
      }
      if (projectConfig.agentOverrides) {
        merged.agentOverrides = { ...merged.agentOverrides, ...projectConfig.agentOverrides };
      }
    }

    return merged;
  }

  /**
   * Deep clone providers to avoid mutation
   */
  private deepCloneProviders(providers: {
    [provider: string]: ProviderDefinition;
  }): { [provider: string]: ProviderDefinition } {
    const cloned: { [provider: string]: ProviderDefinition } = {};

    for (const [name, provider] of Object.entries(providers)) {
      cloned[name] = {
        ...provider,
        models: provider.models
          ? {
              reasoning: provider.models.reasoning ? { ...provider.models.reasoning } : undefined,
              coding: provider.models.coding ? { ...provider.models.coding } : undefined,
              efficiency: provider.models.efficiency ? { ...provider.models.efficiency } : undefined,
            }
          : undefined,
        tierOverrides: provider.tierOverrides ? { ...provider.tierOverrides } : undefined,
      };
    }

    return cloned;
  }

  /**
   * Load v1 config for backwards compatibility
   */
  async loadV1Config(path: string): Promise<ModelConfigV1 | null> {
    if (!existsSync(path)) {
      return null;
    }

    try {
      const content = await readFile(path, 'utf-8');
      const config = JSON.parse(content) as ModelConfigV1;

      // Simple heuristic: v1 has provider keys with role objects
      // v2 has version, tiers, providers structure
      if ('version' in config && 'tiers' in config) {
        return null; // This is v2
      }

      return config;
    } catch {
      return null;
    }
  }

  /**
   * Convert v1 config to v2 compatible structure
   */
  convertV1ToV2(_v1Config: ModelConfigV1): UserProjectConfig {
    const agentOverrides: { [agentName: string]: AgentOverride } = {};

    // V1 doesn't have agent overrides, so we just create empty structure
    // The actual v1 role mappings will be used as defaults in the resolver
    // _v1Config preserved for future v1 field migration

    return {
      agentOverrides,
    };
  }

  /**
   * Resolve provider inheritance
   */
  resolveProviderInheritance(
    provider: ProviderDefinition,
    providers: { [provider: string]: ProviderDefinition }
  ): ProviderDefinition {
    if (!provider.inherits) {
      return provider;
    }

    const parent = providers[provider.inherits];
    if (!parent) {
      throw new Error(`Provider ${provider.inherits} not found for inheritance`);
    }

    // Recursively resolve parent
    const resolvedParent = this.resolveProviderInheritance(parent, providers);

    // Merge parent into child (child overrides parent)
    return {
      ...resolvedParent,
      ...provider,
      models: provider.models || resolvedParent.models,
      tierOverrides: provider.tierOverrides || resolvedParent.tierOverrides,
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Get configuration file locations
   */
  getLocations(): ConfigLocations {
    return { ...this.locations };
  }
}
