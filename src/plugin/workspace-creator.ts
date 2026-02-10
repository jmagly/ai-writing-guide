/**
 * WorkspaceCreator - Create framework-scoped workspaces
 *
 * Creates framework-specific directories and shared resources for
 * multi-framework projects. Supports Claude, Codex, and Cursor frameworks.
 *
 * FID-007 Framework-Scoped Workspaces creation logic.
 *
 * @module src/plugin/workspace-creator
 * @version 1.0.0
 * @since 2025-10-23
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ===========================
// Interfaces
// ===========================

export interface CreateOptions {
  version?: string;
  autoDetect?: boolean;
  environment?: string;
  respectMergeStrategy?: boolean;
  includeLocal?: boolean;
}

// ===========================
// WorkspaceCreator Class
// ===========================

export class WorkspaceCreator {
  private projectRoot: string;

  private readonly SUPPORTED_FRAMEWORKS = ['claude', 'codex', 'cursor'];
  private readonly SHARED_DIRS = [
    'intake',
    'requirements',
    'architecture',
    'planning',
    'testing',
    'deployment',
    'security',
    'quality',
    'risks',
    'reports',
    'working',
    'handoffs',
    'gates',
    'decisions',
    'team',
    'management'
  ];

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Create framework-specific workspace
   *
   * @param framework - Framework name (claude, codex, cursor)
   * @param options - Creation options
   */
  async createFrameworkWorkspace(framework: string, options: CreateOptions = {}): Promise<void> {
    if (!this.SUPPORTED_FRAMEWORKS.includes(framework)) {
      throw new Error(`Unsupported framework: ${framework}`);
    }

    const frameworkPath = path.join(this.projectRoot, '.aiwg', framework);
    const sharedPath = path.join(this.projectRoot, '.aiwg', 'shared');

    // Create framework directory structure
    await fs.mkdir(frameworkPath, { recursive: true });
    await fs.mkdir(path.join(frameworkPath, 'agents'), { recursive: true });
    await fs.mkdir(path.join(frameworkPath, 'commands'), { recursive: true });
    await fs.mkdir(path.join(frameworkPath, 'memory'), { recursive: true });
    await fs.mkdir(path.join(frameworkPath, 'context'), { recursive: true });

    // Create shared directory structure
    await fs.mkdir(sharedPath, { recursive: true });
    for (const dir of this.SHARED_DIRS) {
      await fs.mkdir(path.join(sharedPath, dir), { recursive: true });
    }

    // Create default config file
    const configPath = path.join(frameworkPath, 'settings.json');
    try {
      await fs.access(configPath);
      // Config already exists, don't overwrite
    } catch {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          framework,
          version: options.version || '1.0.0',
          created: new Date().toISOString()
        }, null, 2)
      );
    }

    // Create README
    const readmePath = path.join(frameworkPath, 'README.md');
    try {
      await fs.access(readmePath);
    } catch {
      await fs.writeFile(
        readmePath,
        `# ${framework.charAt(0).toUpperCase() + framework.slice(1)} Framework Workspace\n\nFramework-specific configuration and resources.\n`
      );
    }

    // Create .gitignore
    const gitignorePath = path.join(frameworkPath, '.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      await fs.writeFile(
        gitignorePath,
        '*.log\nmemory/\n*.tmp\n'
      );
    }
  }

  /**
   * Add framework to existing project
   *
   * @param framework - Framework name to add
   */
  async addFrameworkToProject(framework: string): Promise<void> {
    // Create workspace for new framework
    await this.createFrameworkWorkspace(framework);

    // Update workspace registry
    const registryPath = path.join(this.projectRoot, '.aiwg', 'registry.json');
    let registry: any = { frameworks: [] };

    try {
      const content = await fs.readFile(registryPath, 'utf-8');
      registry = JSON.parse(content);
    } catch {
      // Registry doesn't exist yet
    }

    if (!registry.frameworks.includes(framework)) {
      registry.frameworks.push(framework);
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    }

    // Update workspace.json
    const workspacePath = path.join(this.projectRoot, '.aiwg', 'workspace.json');
    try {
      const content = await fs.readFile(workspacePath, 'utf-8');
      const workspace = JSON.parse(content);
      if (!workspace.frameworks) {
        workspace.frameworks = [];
      }
      if (!workspace.frameworks.includes(framework)) {
        workspace.frameworks.push(framework);
        await fs.writeFile(workspacePath, JSON.stringify(workspace, null, 2));
      }
    } catch {
      // workspace.json doesn't exist
    }
  }

  /**
   * Initialize empty workspace structure
   *
   * @param options - Initialization options
   */
  async initializeWorkspace(options: CreateOptions = {}): Promise<void> {
    const aiwgPath = path.join(this.projectRoot, '.aiwg');

    // Create .aiwg directory
    await fs.mkdir(aiwgPath, { recursive: true });

    // Create shared directory with SDLC subdirs
    const sharedPath = path.join(aiwgPath, 'shared');
    await fs.mkdir(sharedPath, { recursive: true });

    for (const dir of this.SHARED_DIRS) {
      await fs.mkdir(path.join(sharedPath, dir), { recursive: true });
    }

    // Create workspace.json
    const workspacePath = path.join(aiwgPath, 'workspace.json');
    try {
      await fs.access(workspacePath);
      // Already exists, don't overwrite
    } catch {
      await fs.writeFile(
        workspacePath,
        JSON.stringify({
          version: '1.0.0',
          frameworks: [],
          created: new Date().toISOString()
        }, null, 2)
      );
    }

    // Create .gitignore
    const gitignorePath = path.join(aiwgPath, '.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      await fs.writeFile(
        gitignorePath,
        '*.log\nworking/\n*.tmp\n'
      );
    }

    // Create README
    const readmePath = path.join(aiwgPath, 'README.md');
    try {
      await fs.access(readmePath);
    } catch {
      await fs.writeFile(
        readmePath,
        '# AIWG Workspace\n\nFramework-scoped workspace for AIWG.\n'
      );
    }

    // Auto-detect and create framework workspaces if requested
    if (options.autoDetect) {
      const { FrameworkDetector } = await import('./framework-detector.js');
      const detector = new FrameworkDetector(this.projectRoot);
      const frameworks = await detector.detectFrameworks();

      for (const framework of frameworks) {
        await this.createFrameworkWorkspace(framework);
      }
    }
  }
}
