/**
 * FrameworkDetector - Detect framework-scoped workspaces
 *
 * Detects frameworks from directory structure (.claude/, .codex/, .cursor/)
 * and configuration files. Distinguishes legacy workspaces from framework-scoped.
 *
 * FID-007 Framework-Scoped Workspaces detection logic.
 *
 * @module src/plugin/framework-detector
 * @version 1.0.0
 * @since 2025-10-23
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ===========================
// Interfaces
// ===========================

export interface FrameworkInfo {
  name: string;
  path: string;
  type: 'ide' | 'cli' | 'custom';
  version?: string;
  capabilities?: string[];
  agentCount?: number;
  commandCount?: number;
}

// ===========================
// FrameworkDetector Class
// ===========================

export class FrameworkDetector {
  private projectRoot: string;

  private readonly FRAMEWORK_DIRS = ['claude', 'codex', 'cursor'];
  private readonly LEGACY_DIRS = [
    // SDLC shared directories
    'intake', 'requirements', 'architecture', 'planning',
    'risks', 'testing', 'security', 'quality', 'deployment',
    'reports', 'working', 'handoffs', 'gates', 'decisions', 'team', 'management',
    // Framework-specific directories (legacy when directly under .aiwg)
    'agents', 'commands', 'memory', 'context'
  ];

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Detect all frameworks present in the project
   *
   * @returns Array of framework names
   */
  async detectFrameworks(): Promise<string[]> {
    const frameworks = new Set<string>();

    // Check for .framework/ directories
    for (const framework of this.FRAMEWORK_DIRS) {
      try {
        await fs.access(path.join(this.projectRoot, `.${framework}`));
        frameworks.add(framework);
      } catch {
        // Framework directory doesn't exist
      }
    }

    // Check for .aiwg/framework/ directories
    const aiwgPath = path.join(this.projectRoot, '.aiwg');
    try {
      const entries = await fs.readdir(aiwgPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && this.FRAMEWORK_DIRS.includes(entry.name)) {
          frameworks.add(entry.name);
        }
      }
    } catch {
      // .aiwg doesn't exist
    }

    return Array.from(frameworks).sort();
  }

  /**
   * Check if workspace is legacy (non-framework-scoped)
   *
   * @returns True if legacy workspace detected
   */
  async isLegacyWorkspace(): Promise<boolean> {
    const aiwgPath = path.join(this.projectRoot, '.aiwg');

    try {
      await fs.access(aiwgPath);
    } catch {
      return false; // No .aiwg directory
    }

    // Check for legacy SDLC directories
    let legacyDirCount = 0;
    let frameworkDirCount = 0;

    try {
      const entries = await fs.readdir(aiwgPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (this.LEGACY_DIRS.includes(entry.name)) {
            legacyDirCount++;
          }
          if (this.FRAMEWORK_DIRS.includes(entry.name)) {
            frameworkDirCount++;
          }
        }
      }
    } catch {
      return false;
    }

    // Legacy workspace if has legacy dirs but no framework dirs
    return legacyDirCount > 0 && frameworkDirCount === 0;
  }

  /**
   * Get detailed information about a framework
   *
   * @param frameworkName - Framework name
   * @returns Framework information
   */
  async getFrameworkInfo(frameworkName: string): Promise<FrameworkInfo> {
    // Check .aiwg/framework/ first
    const aiwgPath = path.join(this.projectRoot, '.aiwg', frameworkName);
    const rootPath = path.join(this.projectRoot, `.${frameworkName}`);

    let frameworkPath: string;
    let configPath: string;

    try {
      await fs.access(aiwgPath);
      frameworkPath = aiwgPath;
      configPath = path.join(aiwgPath, 'settings.json');
    } catch {
      try {
        await fs.access(rootPath);
        frameworkPath = rootPath;
        configPath = path.join(rootPath, 'settings.json');
      } catch {
        throw new Error(`Framework not found: ${frameworkName}`);
      }
    }

    // Load config
    let config: any = {};
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      // Config doesn't exist or is invalid, use defaults
    }

    // Count agents and commands
    let agentCount = 0;
    let commandCount = 0;

    try {
      const agentsPath = path.join(frameworkPath, 'agents');
      const agents = await fs.readdir(agentsPath);
      agentCount = agents.filter(f => f.endsWith('.md')).length;
    } catch {
      // Agents directory doesn't exist
    }

    try {
      const commandsPath = path.join(frameworkPath, 'commands');
      const commands = await fs.readdir(commandsPath);
      commandCount = commands.filter(f => f.endsWith('.md')).length;
    } catch {
      // Commands directory doesn't exist
    }

    return {
      name: frameworkName,
      path: frameworkPath,
      type: 'ide',
      version: config.version,
      capabilities: config.capabilities,
      agentCount,
      commandCount
    };
  }
}
