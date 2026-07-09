/**
 * User-level project memory registry (#1750).
 *
 * Stores private, per-project AIWG memory roots under ~/.aiwg/projects while
 * preserving the effective `.aiwg` layout inside each registered memory root.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export interface ProjectMemoryMetadata {
  owner?: string;
  repo?: string;
  [key: string]: string | undefined;
}

export interface ProjectMemoryEntry {
  id: string;
  name: string;
  workspaceRoots: string[];
  gitRemotes: string[];
  memoryRoot: string;
  metadata?: ProjectMemoryMetadata;
  registeredAt: string;
  updatedAt: string;
}

export interface ProjectMemoryManifest {
  version: 1;
  projects: ProjectMemoryEntry[];
}

export interface ProjectMemoryIndex {
  version: 1;
  generatedAt: string;
  byProjectId: Record<string, string>;
  byWorkspaceRoot: Record<string, string[]>;
  byGitRemote: Record<string, string[]>;
}

export type ProjectMemoryLookup =
  | { status: 'found'; entry: ProjectMemoryEntry; matchedBy: 'id' | 'workspaceRoot' | 'gitRemote' }
  | { status: 'missing'; reason: string }
  | { status: 'ambiguous'; reason: string; entries: ProjectMemoryEntry[] };

export type MemoryRootResolution =
  | { source: 'project-local'; root: string; reason: string }
  | { source: 'user'; root: string; entry: ProjectMemoryEntry; reason: string }
  | { source: 'default'; root: string; reason: string };

export function projectMemoryHome(): string {
  const override = process.env.AIWG_PROJECT_MEMORY_HOME;
  if (override) return path.resolve(override);
  return path.join(homedir(), '.aiwg', 'projects');
}

export function projectMemoryManifestPath(): string {
  return path.join(projectMemoryHome(), 'manifest.json');
}

export function projectMemoryIndexPath(): string {
  return path.join(projectMemoryHome(), 'index', 'manifest-index.json');
}

export function emptyProjectMemoryManifest(): ProjectMemoryManifest {
  return { version: 1, projects: [] };
}

export async function readProjectMemoryManifest(): Promise<ProjectMemoryManifest> {
  const manifestPath = projectMemoryManifestPath();
  if (!existsSync(manifestPath)) return emptyProjectMemoryManifest();
  const parsed = JSON.parse(await readFile(manifestPath, 'utf-8')) as Partial<ProjectMemoryManifest>;
  if (parsed.version !== 1 || !Array.isArray(parsed.projects)) {
    throw new Error(`${manifestPath}: expected project memory manifest version 1`);
  }
  return {
    version: 1,
    projects: parsed.projects.map(normalizeEntry),
  };
}

export async function writeProjectMemoryManifest(manifest: ProjectMemoryManifest): Promise<void> {
  const manifestPath = projectMemoryManifestPath();
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const normalized = {
    version: 1,
    projects: [...manifest.projects].sort((a, b) => a.id.localeCompare(b.id)).map(normalizeEntry),
  } satisfies ProjectMemoryManifest;
  await writeFile(manifestPath, JSON.stringify(normalized, null, 2) + '\n', 'utf-8');
  await writeProjectMemoryIndex(normalized);
}

export async function writeProjectMemoryIndex(manifest?: ProjectMemoryManifest): Promise<ProjectMemoryIndex> {
  manifest ??= await readProjectMemoryManifest();
  const index: ProjectMemoryIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    byProjectId: {},
    byWorkspaceRoot: {},
    byGitRemote: {},
  };

  for (const entry of manifest.projects) {
    index.byProjectId[entry.id] = entry.id;
    for (const root of entry.workspaceRoots) {
      addIndexValue(index.byWorkspaceRoot, normalizeWorkspaceRoot(root), entry.id);
    }
    for (const remote of entry.gitRemotes) {
      addIndexValue(index.byGitRemote, normalizeGitRemote(remote), entry.id);
    }
  }

  const indexPath = projectMemoryIndexPath();
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  return index;
}

export async function registerProjectMemory(opts: {
  workspaceRoot?: string;
  id?: string;
  name?: string;
  memoryRoot?: string;
  gitRemotes?: string[];
  metadata?: ProjectMemoryMetadata;
}): Promise<ProjectMemoryEntry> {
  const workspaceRoot = normalizeWorkspaceRoot(opts.workspaceRoot ?? process.cwd());
  const gitRemotes = uniqueGitRemotes(opts.gitRemotes ?? discoverGitRemotes(workspaceRoot));
  const name = opts.name ?? path.basename(workspaceRoot);
  const metadata = { ...metadataFromRemotes(gitRemotes), ...opts.metadata };
  const id = sanitizeProjectId(opts.id ?? stableProjectId({ name, workspaceRoot, gitRemotes }));
  const now = new Date().toISOString();
  const memoryRoot = expandUserPath(opts.memoryRoot ?? path.join(projectMemoryHome(), id, '.aiwg'));

  const manifest = await readProjectMemoryManifest();
  const existing = manifest.projects.find((p) => p.id === id);
  const entry: ProjectMemoryEntry = {
    id,
    name,
    workspaceRoots: normalizeUnique([...(existing?.workspaceRoots ?? []), workspaceRoot], normalizeWorkspaceRoot),
    gitRemotes: uniqueGitRemotes([...(existing?.gitRemotes ?? []), ...gitRemotes]),
    memoryRoot,
    metadata,
    registeredAt: existing?.registeredAt ?? now,
    updatedAt: now,
  };

  const nextProjects = manifest.projects.filter((p) => p.id !== id);
  nextProjects.push(entry);
  await ensureMemoryLayout(entry.memoryRoot);
  await writeProjectMemoryManifest({ version: 1, projects: nextProjects });
  return entry;
}

export async function lookupProjectMemory(opts: {
  id?: string;
  workspaceRoot?: string;
  gitRemote?: string;
}): Promise<ProjectMemoryLookup> {
  const manifest = await readProjectMemoryManifest();
  if (opts.id) {
    const entry = manifest.projects.find((p) => p.id === opts.id);
    return entry
      ? { status: 'found', entry, matchedBy: 'id' }
      : { status: 'missing', reason: `No project memory entry with id '${opts.id}'` };
  }

  if (opts.workspaceRoot) {
    const active = normalizeWorkspaceRoot(opts.workspaceRoot);
    const matches = manifest.projects
      .filter((p) => p.workspaceRoots.some((root) => isWithinRoot(active, normalizeWorkspaceRoot(root))))
      .sort((a, b) => longestMatchingRoot(b, active) - longestMatchingRoot(a, active));
    const topLen = matches.length > 0 ? longestMatchingRoot(matches[0], active) : -1;
    const top = matches.filter((p) => longestMatchingRoot(p, active) === topLen);
    if (top.length === 1) return { status: 'found', entry: top[0], matchedBy: 'workspaceRoot' };
    if (top.length > 1) return { status: 'ambiguous', reason: `Multiple project memory entries match workspace '${active}'`, entries: top };
  }

  if (opts.gitRemote) {
    const remote = normalizeGitRemote(opts.gitRemote);
    const matches = manifest.projects.filter((p) => p.gitRemotes.map(normalizeGitRemote).includes(remote));
    if (matches.length === 1) return { status: 'found', entry: matches[0], matchedBy: 'gitRemote' };
    if (matches.length > 1) return { status: 'ambiguous', reason: `Multiple project memory entries match remote '${opts.gitRemote}'`, entries: matches };
  }

  return { status: 'missing', reason: 'No project memory entry matched the supplied workspace or remote metadata' };
}

export async function resolveProjectMemoryRoot(projectRoot = process.cwd()): Promise<MemoryRootResolution> {
  const localAiwg = path.resolve(projectRoot, '.aiwg');
  if (existsSync(localAiwg)) {
    return { source: 'project-local', root: path.join(localAiwg, 'memory'), reason: 'project-local .aiwg exists' };
  }

  const byPath = await lookupProjectMemory({ workspaceRoot: projectRoot });
  if (byPath.status === 'found') {
    return { source: 'user', root: path.join(byPath.entry.memoryRoot, 'memory'), entry: byPath.entry, reason: 'matched workspace path' };
  }
  if (byPath.status === 'ambiguous') {
    return { source: 'default', root: path.resolve(projectRoot, '.aiwg', 'memory'), reason: byPath.reason };
  }

  for (const remote of discoverGitRemotes(projectRoot)) {
    const byRemote = await lookupProjectMemory({ gitRemote: remote });
    if (byRemote.status === 'found') {
      return { source: 'user', root: path.join(byRemote.entry.memoryRoot, 'memory'), entry: byRemote.entry, reason: 'matched git remote' };
    }
    if (byRemote.status === 'ambiguous') {
      return { source: 'default', root: path.resolve(projectRoot, '.aiwg', 'memory'), reason: byRemote.reason };
    }
  }

  return { source: 'default', root: path.resolve(projectRoot, '.aiwg', 'memory'), reason: 'no registered user-level project memory entry' };
}

export async function relocateProjectMemory(id: string, newMemoryRoot: string): Promise<ProjectMemoryEntry> {
  const manifest = await readProjectMemoryManifest();
  const entry = manifest.projects.find((p) => p.id === id);
  if (!entry) throw new Error(`No project memory entry with id '${id}'`);
  const oldRoot = entry.memoryRoot;
  const nextRoot = expandUserPath(newMemoryRoot);
  if (oldRoot !== nextRoot && existsSync(oldRoot) && !existsSync(nextRoot)) {
    await mkdir(path.dirname(nextRoot), { recursive: true });
    await rename(oldRoot, nextRoot);
  } else {
    await ensureMemoryLayout(nextRoot);
  }
  entry.memoryRoot = nextRoot;
  entry.updatedAt = new Date().toISOString();
  await writeProjectMemoryManifest(manifest);
  return entry;
}

export async function removeProjectMemory(id: string, opts: { deleteFiles?: boolean } = {}): Promise<ProjectMemoryEntry | null> {
  const manifest = await readProjectMemoryManifest();
  const entry = manifest.projects.find((p) => p.id === id);
  if (!entry) return null;
  await writeProjectMemoryManifest({ version: 1, projects: manifest.projects.filter((p) => p.id !== id) });
  if (opts.deleteFiles) await rm(entry.memoryRoot, { recursive: true, force: true });
  return entry;
}

export async function ensureMemoryLayout(memoryRoot: string): Promise<void> {
  await mkdir(path.join(memoryRoot, 'memory'), { recursive: true });
  await mkdir(path.join(memoryRoot, 'index'), { recursive: true });
  await mkdir(path.join(memoryRoot, 'artifacts'), { recursive: true });
  const configPath = path.join(memoryRoot, 'aiwg.config');
  if (!existsSync(configPath)) {
    await writeFile(configPath, JSON.stringify({ version: '1', projectMemory: { private: true } }, null, 2) + '\n', 'utf-8');
  }
}

export function normalizeGitRemote(remote: string): string {
  const trimmed = remote.trim();
  const withoutGit = trimmed.endsWith('.git') ? trimmed.slice(0, -4) : trimmed;
  const ssh = withoutGit.match(/^git@([^:]+):(.+)$/);
  if (ssh) return `${ssh[1].toLowerCase()}/${ssh[2].replace(/^\/+/, '').toLowerCase()}`;
  try {
    const u = new URL(withoutGit);
    return `${u.hostname.toLowerCase()}/${u.pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase()}`;
  } catch {
    return withoutGit.toLowerCase();
  }
}

function normalizeEntry(entry: ProjectMemoryEntry): ProjectMemoryEntry {
  return {
    ...entry,
    workspaceRoots: normalizeUnique(entry.workspaceRoots ?? [], normalizeWorkspaceRoot),
    gitRemotes: uniqueGitRemotes(entry.gitRemotes ?? []),
    memoryRoot: expandUserPath(entry.memoryRoot),
    metadata: entry.metadata ?? {},
  };
}

function addIndexValue(index: Record<string, string[]>, key: string, id: string): void {
  index[key] = Array.from(new Set([...(index[key] ?? []), id])).sort();
}

function normalizeUnique(values: string[], normalize: (value: string) => string): string[] {
  return Array.from(new Set(values.filter(Boolean).map(normalize))).sort();
}

function uniqueGitRemotes(values: string[]): string[] {
  const byNormalized = new Map<string, string>();
  for (const value of values.filter(Boolean)) {
    const trimmed = value.trim();
    const normalized = normalizeGitRemote(trimmed);
    if (!byNormalized.has(normalized)) byNormalized.set(normalized, trimmed);
  }
  return Array.from(byNormalized.values()).sort();
}

function normalizeWorkspaceRoot(root: string): string {
  return path.resolve(expandUserPath(root));
}

function expandUserPath(value: string): string {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return path.join(homedir(), value.slice(2));
  return path.resolve(value);
}

function stableProjectId(opts: { name: string; workspaceRoot: string; gitRemotes: string[] }): string {
  const seed = opts.gitRemotes[0] ? normalizeGitRemote(opts.gitRemotes[0]) : opts.workspaceRoot;
  const digest = createHash('sha256').update(seed).digest('hex').slice(0, 12);
  return `${opts.name}-${digest}`;
}

function sanitizeProjectId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function discoverGitRemotes(cwd: string): string[] {
  try {
    const stdout = execFileSync('git', ['remote', '-v'], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    const remotes = stdout
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
      .filter((remote): remote is string => Boolean(remote));
    return normalizeUnique(remotes, (v) => v.trim());
  } catch {
    return [];
  }
}

function metadataFromRemotes(remotes: string[]): ProjectMemoryMetadata {
  for (const remote of remotes) {
    const normalized = normalizeGitRemote(remote);
    const parts = normalized.split('/');
    if (parts.length >= 3) {
      return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
    }
  }
  return {};
}

function isWithinRoot(active: string, root: string): boolean {
  const rel = path.relative(root, active);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function longestMatchingRoot(entry: ProjectMemoryEntry, active: string): number {
  return Math.max(...entry.workspaceRoots.map((root) => {
    const normalized = normalizeWorkspaceRoot(root);
    return isWithinRoot(active, normalized) ? normalized.length : -1;
  }));
}
