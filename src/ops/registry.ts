/**
 * Ops Workspace Registry
 *
 * Manages the ops.yaml file in the user config directory.
 * Tracks workspace definitions, repo locations, and cross-repo wiring.
 *
 * @implements #544
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolveConfigDir } from '../config/user-config.js';

/**
 * Extension type abbreviations
 */
const EXTENSION_NAMES: Record<string, string> = {
  sys: 'sysops',
  it: 'itops',
  dev: 'devops',
  stream: 'streamops',
};

/**
 * Ops workspace repo entry
 */
export interface OpsRepoEntry {
  path: string;
  remote?: string;
  extensions: string[];
}

/**
 * Ops workspace definition
 */
export interface OpsWorkspace {
  home: string;
  mode: 'single-repo' | 'multi-repo';
  repos: Record<string, OpsRepoEntry>;
}

/**
 * Full ops registry structure
 */
export interface OpsRegistryData {
  apiVersion: string;
  kind: string;
  defaultWorkspace: string;
  workspaces: Record<string, OpsWorkspace>;
}

/**
 * Init options for creating a new workspace
 */
export interface InitOptions {
  name: string;
  home?: string;
  mode: 'single-repo' | 'multi-repo';
  extensions: string[];
  prefix?: string;
  provider?: string;
  silent?: boolean;
}

/**
 * Default empty registry
 */
const DEFAULT_REGISTRY: OpsRegistryData = {
  apiVersion: 'aiwg.io/v1',
  kind: 'OpsRegistry',
  defaultWorkspace: 'default',
  workspaces: {},
};

/**
 * Ops workspace registry manager
 */
export class OpsRegistry {
  private readonly configDir: string;
  private readonly registryPath: string;

  constructor(configDirOverride?: string) {
    this.configDir = resolveConfigDir(configDirOverride);
    this.registryPath = resolve(this.configDir, 'ops.json');
  }

  /**
   * Load the ops registry, creating defaults if missing
   */
  async load(): Promise<OpsRegistryData> {
    if (!existsSync(this.registryPath)) {
      return { ...DEFAULT_REGISTRY, workspaces: {} };
    }

    try {
      const content = await readFile(this.registryPath, 'utf-8');
      const parsed = JSON.parse(content) as OpsRegistryData;
      return {
        ...DEFAULT_REGISTRY,
        ...parsed,
        workspaces: parsed.workspaces ? { ...parsed.workspaces } : {},
      };
    } catch {
      return { ...DEFAULT_REGISTRY, workspaces: {} };
    }
  }

  /**
   * Save the ops registry
   */
  async save(data: OpsRegistryData): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    await writeFile(this.registryPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Initialize a new ops workspace
   */
  async initWorkspace(opts: InitOptions): Promise<void> {
    const data = await this.load();

    // Check for existing workspace
    if (data.workspaces[opts.name]) {
      throw new Error(
        `Workspace "${opts.name}" already exists. Use a different name or remove the existing workspace.`
      );
    }

    // Resolve home directory
    const opsHome = opts.home || resolve(homedir(), 'ops', opts.name);

    // Refuse to create nested ops workspaces — walk up from the parent of
    // opsHome looking for OpsInventory.yaml. Sibling layout is required.
    const enclosing = findEnclosingOpsWorkspace(opsHome);
    if (enclosing) {
      const suggested = resolve(dirname(enclosing), opts.name);
      throw new Error(
        `${enclosing} is already an ops workspace.\n` +
          `Ops workspaces must be siblings of one another, not nested.\n` +
          `Suggested location: ${suggested}`
      );
    }

    // Build workspace
    const workspace: OpsWorkspace = {
      home: opsHome,
      mode: opts.mode,
      repos: {},
    };

    if (opts.mode === 'multi-repo') {
      // Create separate repo for each extension
      for (const ext of opts.extensions) {
        const fullName = EXTENSION_NAMES[ext] || ext;
        const repoName = opts.prefix ? `${opts.prefix}-${fullName}` : fullName;
        const repoPath = resolve(opsHome, repoName);

        workspace.repos[repoName] = {
          path: repoPath,
          extensions: [ext],
        };

        // Create directory and git init
        await mkdir(repoPath, { recursive: true });
        if (!existsSync(resolve(repoPath, '.git'))) {
          execSync('git init', { cwd: repoPath, stdio: 'pipe' });
        }

        // Seed OpsInventory stub
        await seedInventory(repoPath, repoName, ext);

        console.log(`  Created ${repoName} at ${repoPath}`);
      }
    } else {
      // Single-repo mode: one repo, subdirectories per domain
      const repoName = opts.prefix ? `${opts.prefix}-ops` : 'ops';
      const repoPath = resolve(opsHome, repoName);

      await mkdir(repoPath, { recursive: true });
      if (!existsSync(resolve(repoPath, '.git'))) {
        execSync('git init', { cwd: repoPath, stdio: 'pipe' });
      }

      // Create subdirectories for each extension
      for (const ext of opts.extensions) {
        const fullName = EXTENSION_NAMES[ext] || ext;
        const subDir = resolve(repoPath, fullName);
        await mkdir(subDir, { recursive: true });
        await seedInventory(subDir, fullName, ext);
      }

      workspace.repos[repoName] = {
        path: repoPath,
        extensions: opts.extensions,
      };

      console.log(`  Created ${repoName} at ${repoPath}`);
    }

    // Register workspace
    data.workspaces[opts.name] = workspace;
    if (Object.keys(data.workspaces).length === 1) {
      data.defaultWorkspace = opts.name;
    }

    await this.save(data);

    // Post-init summary
    console.log('');
    console.log(`Workspace "${opts.name}" initialized`);
    console.log(`  Mode: ${opts.mode}`);
    console.log(`  Home: ${opsHome}`);
    console.log(`  Extensions: ${opts.extensions.join(', ')}`);
    console.log(`  Repos: ${Object.keys(workspace.repos).join(', ')}`);
    console.log(`  Registry: ${this.registryPath}`);

    if (opts.provider) {
      console.log('');
      console.log(`Remote push to ${opts.provider} requested — use 'aiwg ops push' to push repos.`);
    }
  }

  /**
   * Show workspace status
   */
  async showStatus(showAll: boolean): Promise<void> {
    const data = await this.load();

    if (Object.keys(data.workspaces).length === 0) {
      console.log('No ops workspaces registered.');
      console.log('Run "aiwg ops init" to create one.');
      return;
    }

    const workspaces = showAll
      ? Object.entries(data.workspaces)
      : [[data.defaultWorkspace, data.workspaces[data.defaultWorkspace]] as const].filter(
          ([, ws]) => ws !== undefined
        );

    for (const [name, ws] of workspaces) {
      const workspace = ws as OpsWorkspace;
      const isDefault = name === data.defaultWorkspace;
      console.log(`${isDefault ? '* ' : '  '}${name} (${workspace.mode})`);
      console.log(`    Home: ${workspace.home}`);

      for (const [repoName, repo] of Object.entries(workspace.repos)) {
        const exists = existsSync(repo.path);
        const hasGit = exists && existsSync(resolve(repo.path, '.git'));
        const status = !exists ? 'MISSING' : !hasGit ? 'NO GIT' : 'OK';
        console.log(`    ${repoName}: ${status} — ${repo.path}`);
      }
      console.log('');
    }
  }

  /**
   * Switch active workspace
   */
  async switchWorkspace(name: string): Promise<void> {
    const data = await this.load();

    if (!data.workspaces[name]) {
      const available = Object.keys(data.workspaces).join(', ') || '(none)';
      throw new Error(`Workspace "${name}" not found. Available: ${available}`);
    }

    data.defaultWorkspace = name;
    await this.save(data);
    console.log(`Active workspace: ${name}`);
  }

  /**
   * List all registered workspaces
   */
  async listWorkspaces(): Promise<void> {
    const data = await this.load();

    if (Object.keys(data.workspaces).length === 0) {
      console.log('No ops workspaces registered.');
      return;
    }

    console.log('Registered workspaces:\n');
    for (const [name, ws] of Object.entries(data.workspaces)) {
      const isDefault = name === data.defaultWorkspace;
      const repoCount = Object.keys(ws.repos).length;
      console.log(`  ${isDefault ? '*' : ' '} ${name} — ${ws.mode}, ${repoCount} repo(s), ${ws.home}`);
    }
  }

  /**
   * Push workspace repos to remote (always private)
   */
  async pushWorkspace(workspaceName?: string): Promise<void> {
    const data = await this.load();
    const name = workspaceName || data.defaultWorkspace;
    const workspace = data.workspaces[name];

    if (!workspace) {
      throw new Error(`Workspace "${name}" not found`);
    }

    for (const [repoName, repo] of Object.entries(workspace.repos)) {
      if (!existsSync(repo.path)) {
        console.log(`  Skipping ${repoName} — path does not exist`);
        continue;
      }

      if (repo.remote) {
        console.log(`  Pushing ${repoName} to ${repo.remote}...`);
        try {
          execSync(`git push origin main`, { cwd: repo.path, stdio: 'pipe' });
          console.log(`  ${repoName}: pushed`);
        } catch (err) {
          console.log(`  ${repoName}: push failed — ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        console.log(`  ${repoName}: no remote configured`);
      }
    }
  }
}

/**
 * Walk up from targetPath's parent looking for an enclosing ops workspace.
 * Returns the path of the enclosing workspace, or null if none found.
 *
 * Marker: OpsInventory.yaml (the file the ops scaffolder seeds at workspace
 * root). `.aiwg/` is intentionally not used as a marker since AIWG project
 * roots routinely contain `.aiwg/aiwg.config` without being ops workspaces.
 */
function findEnclosingOpsWorkspace(targetPath: string): string | null {
  const resolved = resolve(targetPath);
  let current = dirname(resolved);
  // Stop walking when dirname() no longer advances (filesystem root).
  while (true) {
    if (existsSync(resolve(current, 'OpsInventory.yaml'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Seed an OpsInventory.yaml stub in a repo or subdirectory
 */
async function seedInventory(dirPath: string, name: string, extension: string): Promise<void> {
  const inventoryPath = resolve(dirPath, 'OpsInventory.yaml');
  if (existsSync(inventoryPath)) return;

  const fullName = EXTENSION_NAMES[extension] || extension;
  const content = `apiVersion: aiwg.io/v1
kind: OpsInventory
metadata:
  name: ${name}
  domain: ${fullName}
  created: ${new Date().toISOString().split('T')[0]}

# Add hosts, services, and resources below
inventory: []
`;

  await writeFile(inventoryPath, content, 'utf-8');
}
