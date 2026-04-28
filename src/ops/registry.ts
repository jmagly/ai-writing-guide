/**
 * Ops Workspace Registry
 *
 * Manages the ops.yaml file in the user config directory.
 * Tracks workspace definitions, repo locations, and cross-repo wiring.
 *
 * @implements #544
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { resolve, dirname, basename, sep } from 'path';
import { homedir } from 'os';
import { existsSync, readdirSync, statSync } from 'fs';
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
  /**
   * If set, clone this git URL into the target repo instead of running
   * `git init`. Only valid for single-repo mode or multi-repo with
   * exactly one extension (otherwise the URL would map ambiguously).
   */
  from?: string;
}

/**
 * Adopt options for registering an existing local clone
 */
export interface AdoptOptions {
  /** Target workspace bucket. Defaults to "default". */
  workspace?: string;
  /** Extensions to record on the adopted repo entry. */
  extensions?: string[];
  /** Repo name override (defaults to basename of path). */
  name?: string;
  /** Suppress informational logging. */
  silent?: boolean;
}

/**
 * Result of a single discovered ops-workspace candidate
 */
export interface DiscoveredCandidate {
  /** Absolute path to the workspace root */
  path: string;
  /** Inferred workspace name (basename) */
  name: string;
  /** Git remote URL if a `.git` directory is present, else undefined */
  remote?: string;
  /** True if the path matches an entry in any registered workspace */
  alreadyRegistered: boolean;
  /** Marker that triggered detection (for transparency) */
  marker: 'OpsInventory.yaml';
}

/**
 * Options for discovery
 */
export interface DiscoverOptions {
  /** Roots to scan. Defaults to [homedir()]. */
  roots?: string[];
  /** Maximum directory depth from each root. Default 3. */
  maxDepth?: number;
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

    if (opts.from && opts.mode === 'multi-repo' && opts.extensions.length > 1) {
      throw new Error(
        '--from <url> requires single-repo mode or exactly one extension. ' +
          'Use --mode single-repo, or pass --ext with a single value.'
      );
    }

    if (opts.mode === 'multi-repo') {
      // Create separate repo for each extension
      for (const ext of opts.extensions) {
        const fullName = EXTENSION_NAMES[ext] || ext;
        const repoName = opts.prefix ? `${opts.prefix}-${fullName}` : fullName;
        const repoPath = resolve(opsHome, repoName);

        const provisioned = await provisionRepo(repoPath, opts.from, !!opts.silent);

        workspace.repos[repoName] = {
          path: repoPath,
          remote: provisioned.remote,
          extensions: [ext],
        };

        // Seed OpsInventory stub (only if missing — never overwrite)
        await seedInventory(repoPath, repoName, ext);

        if (!opts.silent) console.log(`  ${provisioned.action} ${repoName} at ${repoPath}`);
      }
    } else {
      // Single-repo mode: one repo, subdirectories per domain
      const repoName = opts.prefix ? `${opts.prefix}-ops` : 'ops';
      const repoPath = resolve(opsHome, repoName);

      const provisioned = await provisionRepo(repoPath, opts.from, !!opts.silent);

      // Create subdirectories for each extension
      for (const ext of opts.extensions) {
        const fullName = EXTENSION_NAMES[ext] || ext;
        const subDir = resolve(repoPath, fullName);
        await mkdir(subDir, { recursive: true });
        await seedInventory(subDir, fullName, ext);
      }

      workspace.repos[repoName] = {
        path: repoPath,
        remote: provisioned.remote,
        extensions: opts.extensions,
      };

      if (!opts.silent) console.log(`  ${provisioned.action} ${repoName} at ${repoPath}`);
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
   * Adopt an existing local clone as a repo entry under a workspace.
   *
   * Detects the git remote, seeds OpsInventory.yaml only if missing
   * (never overwrites an existing inventory), and registers the repo.
   * Refuses to register a path nested inside another registered repo.
   */
  async adoptRepo(repoPath: string, opts: AdoptOptions = {}): Promise<{ workspace: string; repoName: string }> {
    const absPath = resolve(repoPath);
    if (!existsSync(absPath)) {
      throw new Error(`Path does not exist: ${absPath}`);
    }
    if (!statSync(absPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${absPath}`);
    }

    const data = await this.load();

    // Refuse if this path is nested inside another registered repo
    for (const ws of Object.values(data.workspaces)) {
      for (const repo of Object.values(ws.repos)) {
        const registered = resolve(repo.path);
        if (registered !== absPath && absPath.startsWith(registered + sep)) {
          throw new Error(
            `Refusing to adopt: ${absPath} is nested inside registered repo ${registered}.`
          );
        }
      }
    }

    const workspaceName = opts.workspace ?? 'default';
    if (!data.workspaces[workspaceName]) {
      data.workspaces[workspaceName] = {
        home: dirname(absPath),
        mode: 'multi-repo',
        repos: {},
      };
    }
    const ws = data.workspaces[workspaceName];

    const remote = readGitRemote(absPath);
    let repoName = opts.name ?? basename(absPath);
    let suffix = 2;
    while (ws.repos[repoName]) {
      // Same path already registered? Treat as idempotent.
      if (resolve(ws.repos[repoName].path) === absPath) {
        if (!opts.silent) console.log(`  Already registered: ${repoName} -> ${absPath}`);
        return { workspace: workspaceName, repoName };
      }
      repoName = `${opts.name ?? basename(absPath)}-${suffix++}`;
    }

    // Seed OpsInventory.yaml only if missing — never overwrite existing.
    const inventoryPath = resolve(absPath, 'OpsInventory.yaml');
    if (!existsSync(inventoryPath)) {
      const ext = (opts.extensions && opts.extensions[0]) ?? 'sys';
      await seedInventory(absPath, repoName, ext);
    }

    ws.repos[repoName] = {
      path: absPath,
      remote,
      extensions: opts.extensions ?? [],
    };

    if (Object.keys(data.workspaces).length === 1) {
      data.defaultWorkspace = workspaceName;
    }

    await this.save(data);
    if (!opts.silent) {
      console.log(`Adopted ${repoName} at ${absPath} into workspace "${workspaceName}".`);
      if (remote) console.log(`  Remote: ${remote}`);
    }
    return { workspace: workspaceName, repoName };
  }

  /**
   * Walk the given roots looking for ops-workspace candidates.
   *
   * A candidate is any directory containing `OpsInventory.yaml`. Skips
   * `node_modules`, `.git`, and other obvious noise. Candidates nested
   * inside another candidate are dropped (siblings-only by design — see
   * #935).
   */
  async discoverWorkspaces(opts: DiscoverOptions = {}): Promise<DiscoveredCandidate[]> {
    const roots = (opts.roots && opts.roots.length > 0 ? opts.roots : [homedir()]).map((r) =>
      resolve(r)
    );
    const maxDepth = opts.maxDepth ?? 3;

    const data = await this.load();
    const registeredPaths = new Set<string>();
    for (const ws of Object.values(data.workspaces)) {
      for (const repo of Object.values(ws.repos)) {
        registeredPaths.add(resolve(repo.path));
      }
    }

    const found: DiscoveredCandidate[] = [];
    const seen = new Set<string>();

    const skipNames = new Set([
      'node_modules',
      '.git',
      '.aiwg', // walk past, never into
      '.cache',
      '.npm',
      '.yarn',
      '.pnpm-store',
      '.venv',
      'venv',
      'dist',
      'build',
      'target',
    ]);

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;
      if (seen.has(dir)) return;
      seen.add(dir);

      // Marker check at this level
      if (existsSync(resolve(dir, 'OpsInventory.yaml'))) {
        found.push({
          path: dir,
          name: basename(dir),
          remote: readGitRemote(dir),
          alreadyRegistered: registeredPaths.has(dir),
          marker: 'OpsInventory.yaml',
        });
        // Don't descend further — workspaces shouldn't nest.
        return;
      }

      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.startsWith('.') && entry !== '.aiwg') {
          // Allow hidden roots only in narrow cases; skip the rest.
          if (skipNames.has(entry)) continue;
          if (entry === '.git') continue;
        }
        if (skipNames.has(entry)) continue;

        const child = resolve(dir, entry);
        let isDir = false;
        try {
          isDir = statSync(child).isDirectory();
        } catch {
          continue;
        }
        if (!isDir) continue;

        await walk(child, depth + 1);
      }
    };

    for (const root of roots) {
      if (!existsSync(root)) continue;
      await walk(root, 0);
    }

    // Drop nested candidates (deeper paths whose ancestor is also a candidate)
    found.sort((a, b) => a.path.length - b.path.length);
    const kept: DiscoveredCandidate[] = [];
    for (const cand of found) {
      const nested = kept.some(
        (k) => cand.path !== k.path && cand.path.startsWith(k.path + sep)
      );
      if (!nested) kept.push(cand);
    }

    return kept;
  }

  /**
   * Register discovered candidates as a workspace in the registry.
   *
   * Creates a single multi-repo workspace and adds each candidate as a
   * repo entry. Skips candidates whose path is already registered.
   */
  async registerDiscovered(
    workspaceName: string,
    candidates: DiscoveredCandidate[]
  ): Promise<{ added: number; skipped: number }> {
    if (candidates.length === 0) return { added: 0, skipped: 0 };

    const data = await this.load();

    if (!data.workspaces[workspaceName]) {
      data.workspaces[workspaceName] = {
        home: dirname(candidates[0].path),
        mode: 'multi-repo',
        repos: {},
      };
    }
    const ws = data.workspaces[workspaceName];

    let added = 0;
    let skipped = 0;
    for (const cand of candidates) {
      if (cand.alreadyRegistered) {
        skipped++;
        continue;
      }
      // Avoid clobbering an existing repo entry of the same name
      let repoName = cand.name;
      let suffix = 2;
      while (ws.repos[repoName]) {
        repoName = `${cand.name}-${suffix++}`;
      }
      ws.repos[repoName] = {
        path: cand.path,
        remote: cand.remote,
        extensions: [],
      };
      added++;
    }

    if (Object.keys(data.workspaces).length === 1) {
      data.defaultWorkspace = workspaceName;
    }

    await this.save(data);
    return { added, skipped };
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
 * Provision a repo at `repoPath`. Order of preference:
 *   1. Pre-existing `.git` at the path → adopt (read remote, no init/clone).
 *   2. `--from <url>` provided and target is empty → `git clone`.
 *   3. Fallback → `mkdir` + `git init`.
 *
 * Returns the action taken and the resolved remote URL (if any).
 */
async function provisionRepo(
  repoPath: string,
  fromUrl: string | undefined,
  silent: boolean
): Promise<{ action: 'Adopted' | 'Cloned' | 'Created'; remote?: string }> {
  // Case 1: existing .git at the path → adopt in place.
  if (existsSync(resolve(repoPath, '.git'))) {
    return { action: 'Adopted', remote: readGitRemote(repoPath) };
  }

  // Case 2: --from URL → clone (only if target is empty or doesn't exist).
  if (fromUrl) {
    const exists = existsSync(repoPath);
    if (exists) {
      // Refuse to clone over a non-empty existing dir to avoid surprise overwrites.
      let entries: string[] = [];
      try {
        entries = readdirSync(repoPath);
      } catch {
        // ignore
      }
      if (entries.filter((e) => !e.startsWith('.')).length > 0) {
        throw new Error(
          `Refusing to clone into non-empty directory: ${repoPath}. Move or remove it first.`
        );
      }
    }
    await mkdir(dirname(repoPath), { recursive: true });
    execSync(
      `git clone ${shellEscape(fromUrl)} ${shellEscape(repoPath)}`,
      { stdio: silent ? 'pipe' : 'inherit' }
    );
    return { action: 'Cloned', remote: readGitRemote(repoPath) };
  }

  // Case 3: fresh init.
  await mkdir(repoPath, { recursive: true });
  execSync('git init', { cwd: repoPath, stdio: 'pipe' });
  return { action: 'Created', remote: undefined };
}

/**
 * Minimal shell escaping for git URLs and paths passed via execSync.
 * URLs are URL-encoded already, but paths may contain spaces.
 */
function shellEscape(s: string): string {
  if (/^[A-Za-z0-9_@:./~+,=-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/**
 * Return the `origin` remote URL for a git repo rooted at `dirPath`, or
 * undefined if not a git repo or no origin configured.
 */
function readGitRemote(dirPath: string): string | undefined {
  if (!existsSync(resolve(dirPath, '.git'))) return undefined;
  try {
    const out = execSync('git config --get remote.origin.url', {
      cwd: dirPath,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return out || undefined;
  } catch {
    return undefined;
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
