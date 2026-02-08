/**
 * Platform-specific skill deployment path resolution
 *
 * @module smiths/skillsmith/platform-resolver
 */

import * as path from 'path';
import type { Platform } from '../../agents/types.js';
import type { PlatformSkillConfig } from './types.js';

/**
 * Platform-specific skill configurations
 */
const PLATFORM_CONFIGS: Record<Platform, PlatformSkillConfig> = {
  claude: {
    baseDir: '.claude/skills',
    extension: '.md',
    supportsSkills: true,
  },
  factory: {
    baseDir: '.factory/skills',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'command',
  },
  cursor: {
    baseDir: '.cursor/skills',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'command',
  },
  codex: {
    baseDir: '.codex/skills',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'command',
  },
  opencode: {
    baseDir: '.opencode/skill',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'command',
  },
  warp: {
    baseDir: '.warp/skills',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'command',
  },
  windsurf: {
    baseDir: '.windsurf/skills',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'command',
  },
  copilot: {
    baseDir: '.github/copilot/skills',
    extension: '.md',
    supportsSkills: false,
    alternativeStrategy: 'none',
  },
  generic: {
    baseDir: 'skills',
    extension: '.md',
    supportsSkills: true,
  },
};

/**
 * Resolve platform-specific skill paths
 */
export class PlatformSkillResolver {
  /**
   * Get platform configuration for skills
   */
  static getConfig(platform: Platform): PlatformSkillConfig {
    return PLATFORM_CONFIGS[platform];
  }

  /**
   * Get base directory for skills on a platform
   */
  static getBaseDir(platform: Platform, projectPath: string): string {
    const config = this.getConfig(platform);
    return path.join(projectPath, config.baseDir);
  }

  /**
   * Get path for a specific skill
   */
  static getSkillPath(
    platform: Platform,
    projectPath: string,
    skillName: string
  ): string {
    const baseDir = this.getBaseDir(platform, projectPath);
    return path.join(baseDir, skillName);
  }

  /**
   * Get path for SKILL.md file
   */
  static getSkillFilePath(
    platform: Platform,
    projectPath: string,
    skillName: string
  ): string {
    const skillPath = this.getSkillPath(platform, projectPath, skillName);
    const config = this.getConfig(platform);
    return path.join(skillPath, `SKILL${config.extension}`);
  }

  /**
   * Get path for references directory
   */
  static getReferencesPath(
    platform: Platform,
    projectPath: string,
    skillName: string
  ): string {
    const skillPath = this.getSkillPath(platform, projectPath, skillName);
    return path.join(skillPath, 'references');
  }

  /**
   * Check if platform natively supports skills
   */
  static supportsSkills(platform: Platform): boolean {
    return this.getConfig(platform).supportsSkills;
  }

  /**
   * Get alternative deployment strategy for platforms without skill support
   */
  static getAlternativeStrategy(
    platform: Platform
  ): 'command' | 'agent' | 'none' | undefined {
    return this.getConfig(platform).alternativeStrategy;
  }

  /**
   * Validate skill name format
   */
  static validateSkillName(name: string): { valid: boolean; error?: string } {
    // kebab-case: lowercase letters, numbers, hyphens
    const kebabRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;

    if (!name) {
      return { valid: false, error: 'Skill name cannot be empty' };
    }

    if (name.length < 2) {
      return { valid: false, error: 'Skill name must be at least 2 characters' };
    }

    if (name.startsWith('-') || name.endsWith('-')) {
      return { valid: false, error: 'Skill name cannot start or end with hyphen' };
    }

    if (!kebabRegex.test(name)) {
      return {
        valid: false,
        error: 'Skill name must be kebab-case (lowercase, alphanumeric, hyphens)',
      };
    }

    return { valid: true };
  }
}
