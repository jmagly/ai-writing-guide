/**
 * Shared platform directory path utilities
 *
 * Provides consistent path resolution for agents, commands, and skills across all platforms.
 */

import { join } from 'path';
import type { Platform } from '../agents/types.js';
import { getProviderDefinition, resolveProviderPathValue } from '../providers/provider-definitions.js';

function getSmithPaths(platform: Platform) {
  const definition = getProviderDefinition(platform);
  if (!definition) throw new Error(`Missing provider definition for ${platform}`);
  return definition.smithPaths;
}

/**
 * Get the commands directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to commands directory
 */
export function getCommandsDirectory(platform: Platform, projectPath: string): string {
  return resolveProviderPathValue(getSmithPaths(platform).commands, projectPath);
}

/**
 * Get the agents directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to agents directory
 */
export function getAgentsDirectory(platform: Platform, projectPath: string): string {
  return resolveProviderPathValue(getSmithPaths(platform).agents, projectPath);
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
  return resolveProviderPathValue(getSmithPaths(platform).skills, projectPath);
}

/**
 * Get the file extension for artifacts on a given platform
 *
 * @param platform - Target platform
 * @returns File extension (with dot)
 */
export function getFileExtension(platform: Platform): string {
  return getSmithPaths(platform).fileExtension;
}

/**
 * Get the rules/config directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to rules/config directory
 */
export function getRulesDirectory(platform: Platform, projectPath: string): string {
  return resolveProviderPathValue(getSmithPaths(platform).rules, projectPath);
}

/**
 * Check if platform uses aggregated files (vs individual files)
 *
 * @param platform - Target platform
 * @returns True if platform uses aggregated agent/command files
 */
export function usesAggregatedFiles(platform: Platform): boolean {
  return getSmithPaths(platform).aggregated;
}

/**
 * Get the main config file name for a platform
 *
 * @param platform - Target platform
 * @returns Config file name
 */
export function getConfigFileName(platform: Platform): string {
  return getSmithPaths(platform).configFile ?? '';
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
