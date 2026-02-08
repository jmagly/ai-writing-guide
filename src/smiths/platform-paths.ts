/**
 * Shared platform directory path utilities
 *
 * Provides consistent path resolution for agents, commands, and skills across all platforms.
 */

import { Platform } from '../agents/types.js';
import { join } from 'path';

/**
 * Get the commands directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to commands directory
 */
export function getCommandsDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/commands',
    'factory': '.factory/commands',
    'cursor': '.cursor/commands',
    'codex': '.codex/commands',
    'copilot': '.github/commands',
    'opencode': '.opencode/command',
    'warp': '.warp/commands',
    'windsurf': '.windsurf/workflows',
    'generic': 'commands',
  };
  return join(projectPath, dirs[platform]);
}

/**
 * Get the agents directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to agents directory
 */
export function getAgentsDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/agents',
    'factory': '.factory/droids',
    'cursor': '.cursor/agents',
    'codex': '.codex/agents',
    'copilot': '.github/agents',
    'opencode': '.opencode/agent',
    'warp': '.warp/agents',
    'windsurf': '.windsurf/agents',
    'generic': 'agents',
  };
  return join(projectPath, dirs[platform]);
}

/**
 * Get the skills directory for a given platform
 *
 * Skills are mainly a Claude concept; other platforms map to commands/agents.
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to skills directory
 */
export function getSkillsDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/skills',
    'factory': '.factory/skills',
    'cursor': '.cursor/skills',
    'codex': '.codex/skills',
    'copilot': '.github/skills',
    'opencode': '.opencode/skill',
    'warp': '.warp/skills',
    'windsurf': '.windsurf/skills',
    'generic': 'skills',
  };
  return join(projectPath, dirs[platform]);
}

/**
 * Get the file extension for artifacts on a given platform
 *
 * @param platform - Target platform
 * @returns File extension (with dot)
 */
export function getFileExtension(platform: Platform): string {
  if (platform === 'cursor') return '.json';
  return '.md';
}

/**
 * Get the rules/config directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to rules/config directory
 */
export function getRulesDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/rules',
    'factory': '.factory/rules',
    'cursor': '.cursor/rules',
    'codex': '.codex/rules',
    'copilot': '.github/copilot-rules',
    'opencode': '.opencode/rule',
    'warp': '.warp/rules',
    'windsurf': '.windsurf/rules',
    'generic': 'rules',
  };
  return join(projectPath, dirs[platform]);
}

/**
 * Check if platform uses aggregated files (vs individual files)
 *
 * @param platform - Target platform
 * @returns True if platform uses aggregated agent/command files
 */
export function usesAggregatedFiles(platform: Platform): boolean {
  return platform === 'windsurf' || platform === 'warp';
}

/**
 * Get the main config file name for a platform
 *
 * @param platform - Target platform
 * @returns Config file name
 */
export function getConfigFileName(platform: Platform): string {
  const configs: Record<Platform, string> = {
    'claude': 'CLAUDE.md',
    'factory': 'AGENTS.md',
    'cursor': '.cursorrules',
    'codex': 'AGENTS.md',
    'copilot': 'copilot-instructions.md',
    'opencode': 'AGENTS.md',
    'warp': 'WARP.md',
    'windsurf': '.windsurfrules',
    'generic': 'README.md',
  };
  return configs[platform];
}

/**
 * Get all platform directories for a project
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Object with all platform-specific directories
 */
export function getPlatformDirectories(platform: Platform, projectPath: string) {
  return {
    agents: getAgentsDirectory(platform, projectPath),
    commands: getCommandsDirectory(platform, projectPath),
    skills: getSkillsDirectory(platform, projectPath),
    rules: getRulesDirectory(platform, projectPath),
    extension: getFileExtension(platform),
    config: join(projectPath, getConfigFileName(platform)),
    aggregated: usesAggregatedFiles(platform),
  };
}
