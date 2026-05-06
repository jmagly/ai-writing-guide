/**
 * Deployed-artifact discovery for the context-pipeline.
 *
 * Walks the per-provider deploy paths after `aiwg use` has completed and emits
 * IndexEntry[] arrays for the four canonical AGENTS.md sections (Agents, Rules,
 * Skills, Behaviors). The generator-runs-after-deploy invariant from ADR-1 §7
 * means the discovery is filesystem-observed: only files that actually landed
 * appear in the link index. Failed deploys produce shorter indexes, never
 * broken links.
 *
 * Skill discovery is folder-based (each skill is a directory containing
 * SKILL.md). Agent/rule/behavior discovery is file-based (each artifact is
 * one .md file). The asymmetry mirrors the deploy-path conventions defined in
 * `src/cli/handlers/use.ts` PROVIDER_PATHS.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type { AgentsMdSection, IndexEntry, IndexedArtifactType } from './types.js';

/**
 * Path map for one provider's deploy targets. Subset of the PROVIDER_PATHS
 * record in `src/cli/handlers/use.ts` — only the four indexed types are
 * needed here. Empty string means "this provider does not deploy this type
 * to a discrete directory" (e.g. Hermes agents are aggregated into AGENTS.md
 * itself; OpenCode commands derive from skills; Codex commands hit a static
 * built-in enum that does not auto-scan files).
 */
export interface DiscoveryPaths {
  agents: string;
  rules: string;
  skills: string;
  behaviors: string;
}

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

interface MarkdownFrontmatter {
  name?: string;
  description?: string;
  tags?: string[] | string;
  category?: string;
  'safety-critical'?: boolean;
  overrides?: string[];
}

/**
 * Read the YAML frontmatter from a markdown file.
 *
 * Returns null when the file does not start with frontmatter or the block is
 * malformed. Discovery callers treat that as "use the basename as id and the
 * filename as description" rather than aborting — discovery is best-effort.
 */
async function readFrontmatter(filePath: string): Promise<MarkdownFrontmatter | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const match = FRONTMATTER_REGEX.exec(content);
    if (!match) return null;
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object') {
      return parsed as MarkdownFrontmatter;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build an IndexEntry from a markdown file path.
 *
 * Returns null when the file is unreadable; otherwise emits an entry with
 * frontmatter-derived metadata (falling back to filename basename for `id`
 * and a placeholder description if neither is available).
 */
async function entryFromFile(
  absolutePath: string,
  relativePath: string,
): Promise<IndexEntry | null> {
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }

  const fm = await readFrontmatter(absolutePath);
  const basename = path.basename(absolutePath, path.extname(absolutePath));

  const id = fm?.name?.trim() || basename;
  const description = fm?.description?.trim() || `(no description)`;

  const tags = Array.isArray(fm?.tags)
    ? fm.tags
    : typeof fm?.tags === 'string'
      ? fm.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

  const safetyCritical = fm?.['safety-critical'] === true;

  // Always emit forward slashes in the path so AGENTS.md is portable across
  // platforms that read it (Codex on Linux, Cursor on Windows, etc.).
  const portablePath = relativePath.replace(/\\/g, '/');

  return {
    id,
    description,
    path: portablePath,
    tags: tags.length > 0 ? tags : undefined,
    safetyCritical: safetyCritical || undefined,
  };
}

/**
 * Build an IndexEntry from a skill folder.
 *
 * Skills are folders containing SKILL.md (the convention enforced across all
 * platform skill paths). The folder name is the id when no frontmatter `name`
 * is present.
 */
async function entryFromSkillFolder(
  folderAbsPath: string,
  folderRelPath: string,
): Promise<IndexEntry | null> {
  const skillFile = path.join(folderAbsPath, 'SKILL.md');
  try {
    const stat = await fs.stat(skillFile);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }

  const skillRelPath = path.posix.join(folderRelPath.replace(/\\/g, '/'), 'SKILL.md');
  const entry = await entryFromFile(skillFile, skillRelPath);
  if (!entry) return null;

  // Folder name takes precedence as id when frontmatter `name` isn't set —
  // skill folders are addressed by directory, not by SKILL.md filename.
  const folderName = path.basename(folderAbsPath);
  if (!entry.id || entry.id === 'SKILL') {
    entry.id = folderName;
  }
  return entry;
}

/**
 * List markdown files in a directory (non-recursive).
 *
 * Returns an empty array if the directory does not exist or is empty. This
 * is intentional — discovery never errors on missing paths because providers
 * legitimately deploy nothing in some categories (e.g., OpenCode commands).
 */
async function listMarkdownFiles(dirAbs: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.agent.md')))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * List skill subfolders in a directory (non-recursive).
 */
async function listSkillFolders(dirAbs: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Discover one section's deployed artifacts.
 *
 * Type determines whether to scan files (agents/rules/behaviors) or folders
 * (skills). Empty `relativeDir` short-circuits to an empty section.
 */
export async function discoverSection(
  type: IndexedArtifactType,
  projectPath: string,
  relativeDir: string,
): Promise<AgentsMdSection> {
  if (!relativeDir) {
    return { type, entries: [] };
  }

  // Allow absolute paths (home-dir providers like OpenClaw, ~/.codex/skills).
  const dirAbs = path.isAbsolute(relativeDir)
    ? relativeDir
    : path.join(projectPath, relativeDir);

  const entries: IndexEntry[] = [];

  if (type === 'skills') {
    const folders = await listSkillFolders(dirAbs);
    for (const folder of folders.sort()) {
      const entry = await entryFromSkillFolder(
        path.join(dirAbs, folder),
        path.join(relativeDir, folder),
      );
      if (entry) entries.push(entry);
    }
  } else {
    const files = await listMarkdownFiles(dirAbs);
    for (const file of files.sort()) {
      const entry = await entryFromFile(
        path.join(dirAbs, file),
        path.join(relativeDir, file),
      );
      if (entry) entries.push(entry);
    }
  }

  return { type, entries };
}

/**
 * Discover all four canonical AGENTS.md sections at once.
 */
export async function discoverDeployedArtifacts(
  projectPath: string,
  paths: DiscoveryPaths,
): Promise<AgentsMdSection[]> {
  const sections: AgentsMdSection[] = await Promise.all([
    discoverSection('agents', projectPath, paths.agents),
    discoverSection('rules', projectPath, paths.rules),
    discoverSection('skills', projectPath, paths.skills),
    discoverSection('behaviors', projectPath, paths.behaviors),
  ]);
  // Drop empty sections to keep the link index tight; AGENTS.md generator
  // already does the same in renderSection but doing it here too means the
  // result is honest about what was actually found.
  return sections.filter((s) => s.entries.length > 0);
}
