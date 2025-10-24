/**
 * FrameworkIsolator - Enforce framework-scoped isolation
 *
 * Ensures framework-specific resources (agents, commands, memory) are isolated
 * from each other while allowing shared resources (requirements, architecture)
 * to be accessible across all frameworks.
 *
 * FID-007 Framework-Scoped Workspaces isolation logic.
 *
 * @module src/plugin/framework-isolator
 * @version 1.0.0
 * @since 2025-10-23
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ===========================
// Interfaces
// ===========================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type: 'contamination' | 'permission' | 'symlink';
  path: string;
  message: string;
}

export interface ResourceInfo {
  source: string;
  target?: string;
  type?: 'framework-specific' | 'shared';
}

export interface FrameworkSuggestion {
  resource: string;
  suggestedFramework: string;
  confidence: number;
}

export interface CategorizedResources {
  frameworkSpecific: string[];
  shared: string[];
}

// ===========================
// FrameworkIsolator Class
// ===========================

export class FrameworkIsolator {
  private projectRoot: string;

  private readonly FRAMEWORK_SPECIFIC = ['agents', 'commands', 'memory', 'context'];
  private readonly SHARED_RESOURCES = [
    'requirements', 'architecture', 'testing', 'deployment',
    'security', 'quality', 'risks', 'planning'
  ];

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Get framework-specific path
   *
   * @param framework - Framework name
   * @param resource - Optional resource path
   * @returns Full path to framework resource
   */
  getFrameworkPath(framework: string, resource?: string): string {
    if (framework === 'shared') {
      const basePath = path.join(this.projectRoot, '.aiwg', 'shared');
      return resource ? path.join(basePath, resource) : basePath;
    }

    if (!['claude', 'codex', 'cursor'].includes(framework)) {
      throw new Error(`Unknown framework: ${framework}`);
    }

    const basePath = path.join(this.projectRoot, '.aiwg', framework);
    if (resource) {
      // Normalize resource path
      const normalizedResource = resource.startsWith('/') ? resource.slice(1) : resource;
      return path.join(basePath, normalizedResource);
    }
    return basePath;
  }

  /**
   * Check if resource is shared across frameworks
   *
   * @param resourcePath - Resource path
   * @returns True if resource is shared
   */
  isSharedResource(resourcePath: string): boolean {
    const firstDir = resourcePath.split('/')[0];
    return this.SHARED_RESOURCES.includes(firstDir);
  }

  /**
   * Get framework-specific resources
   *
   * @param framework - Framework name
   * @param resourceType - Resource type (agents, commands, etc.)
   * @returns Array of resource paths
   */
  async getFrameworkResources(framework: string, resourceType: string): Promise<string[]> {
    const frameworkPath = this.getFrameworkPath(framework, resourceType);

    try {
      const entries = await fs.readdir(frameworkPath);
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Get shared resources
   *
   * @param resourceType - Resource type
   * @param framework - Optional framework name (for access checking)
   * @returns Array of resource paths
   */
  async getSharedResources(resourceType: string, _framework?: string): Promise<string[]> {
    const sharedPath = path.join(this.projectRoot, '.aiwg', 'shared', resourceType);

    try {
      const entries = await fs.readdir(sharedPath);
      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Get framework-specific config
   *
   * @param framework - Framework name
   * @returns Framework configuration
   */
  async getFrameworkConfig(framework: string): Promise<any> {
    const configPath = this.getFrameworkPath(framework, 'settings.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Fallback for YAML config
      const yamlPath = this.getFrameworkPath(framework, 'config.yaml');
      try {
        const content = await fs.readFile(yamlPath, 'utf-8');
        // Simple YAML parsing (for basic cases)
        return this.parseSimpleYaml(content);
      } catch {
        return { framework };
      }
    }
  }

  /**
   * Validate workspace isolation
   *
   * @returns Validation result
   */
  async validateIsolation(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check for framework-specific resources in shared
    const sharedPath = path.join(this.projectRoot, '.aiwg', 'shared');
    try {
      const entries = await fs.readdir(sharedPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && this.FRAMEWORK_SPECIFIC.includes(entry.name)) {
          errors.push({
            type: 'contamination',
            path: path.join('shared', entry.name),
            message: `${entry.name} should not be in shared`
          });
        }
      }

      // Check for settings files in shared
      const files = entries.filter(e => e.isFile());
      for (const file of files) {
        if (file.name === 'settings.json' || file.name === 'config.yaml') {
          errors.push({
            type: 'contamination',
            path: path.join('shared', file.name),
            message: `${file.name} should not be in shared`
          });
        }
      }
    } catch {
      // Shared directory doesn't exist
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if framework can access resource
   *
   * @param framework - Framework name
   * @param resourcePath - Resource path
   * @returns True if access allowed
   */
  async canAccess(framework: string, resourcePath: string): Promise<boolean> {
    // Shared resources are accessible to all
    if (resourcePath.startsWith('shared/')) {
      return true;
    }

    // Framework can access its own resources
    if (resourcePath.startsWith(`${framework}/`)) {
      return true;
    }

    return false;
  }

  /**
   * Check if framework can read resource
   *
   * @param framework - Framework name
   * @param resourcePath - Resource path
   * @returns True if read allowed
   */
  async canRead(framework: string, resourcePath: string): Promise<boolean> {
    return this.canAccess(framework, resourcePath);
  }

  /**
   * Check if framework can write to resource
   *
   * @param framework - Framework name
   * @param resourcePath - Resource path
   * @returns True if write allowed
   */
  async canWrite(framework: string, resourcePath: string): Promise<boolean> {
    // Cannot write to other framework's directories
    if (resourcePath.startsWith('claude/') ||
        resourcePath.startsWith('codex/') ||
        resourcePath.startsWith('cursor/')) {
      return resourcePath.startsWith(`${framework}/`);
    }

    // Can write to shared if authorized
    if (resourcePath.startsWith('shared/')) {
      return true;
    }

    return false;
  }

  /**
   * Identify framework-specific resources in legacy workspace
   *
   * @param workspacePath - Workspace path
   * @returns Array of framework-specific resources
   */
  async identifyFrameworkSpecificResources(workspacePath: string): Promise<ResourceInfo[]> {
    const resources: ResourceInfo[] = [];

    for (const dir of this.FRAMEWORK_SPECIFIC) {
      const dirPath = path.join(workspacePath, dir);
      try {
        const files = await this.listFilesRecursive(dirPath);
        for (const file of files) {
          resources.push({
            source: path.join(dir, file),
            type: 'framework-specific'
          });
        }
      } catch {
        // Directory doesn't exist
      }
    }

    return resources;
  }

  /**
   * Identify shared resources in legacy workspace
   *
   * @param workspacePath - Workspace path
   * @returns Array of shared resources
   */
  async identifySharedResources(workspacePath: string): Promise<ResourceInfo[]> {
    const resources: ResourceInfo[] = [];

    for (const dir of this.SHARED_RESOURCES) {
      const dirPath = path.join(workspacePath, dir);
      try {
        const files = await this.listFilesRecursive(dirPath);
        for (const file of files) {
          resources.push({
            source: path.join(dir, file),
            target: path.join('shared', dir, file)
          });
        }
      } catch {
        // Directory doesn't exist
      }
    }

    return resources;
  }

  /**
   * Categorize all resources
   *
   * @param workspacePath - Workspace path
   * @returns Categorized resources
   */
  async categorizeResources(workspacePath: string): Promise<CategorizedResources> {
    const frameworkSpecificResources = await this.identifyFrameworkSpecificResources(workspacePath);
    const sharedResources = await this.identifySharedResources(workspacePath);

    return {
      frameworkSpecific: frameworkSpecificResources.map(r => r.source),
      shared: sharedResources.map(r => r.source)
    };
  }

  /**
   * Suggest target frameworks for resources
   *
   * @param workspacePath - Workspace path
   * @returns Array of framework suggestions
   */
  async suggestFrameworkTargets(workspacePath: string): Promise<FrameworkSuggestion[]> {
    const suggestions: FrameworkSuggestion[] = [];

    // Detect installed frameworks
    const { FrameworkDetector } = await import('./framework-detector.js');
    const detector = new FrameworkDetector(this.projectRoot);
    const frameworks = await detector.detectFrameworks();

    if (frameworks.length === 0) {
      return suggestions;
    }

    // Suggest first detected framework for all framework-specific resources
    const frameworkSpecific = await this.identifyFrameworkSpecificResources(workspacePath);
    const targetFramework = frameworks[0];

    for (const resource of frameworkSpecific) {
      suggestions.push({
        resource: resource.source,
        suggestedFramework: targetFramework,
        confidence: frameworks.length === 1 ? 1.0 : 0.7
      });
    }

    return suggestions;
  }

  // ===========================
  // Helper Methods
  // ===========================

  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (currentPath: string, relativePath: string = '') => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    };

    await walk(dirPath);
    return files;
  }

  private parseSimpleYaml(content: string): any {
    const result: any = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (value) {
        result[key] = value;
      }
    }

    return result;
  }
}
