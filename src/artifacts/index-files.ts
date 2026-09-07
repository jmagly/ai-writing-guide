/**
 * Shared artifact source-file enumeration.
 *
 * Index builds and coverage reporting must use the same file set so project
 * context files cannot inflate the indexed count beyond the reported total.
 *
 * @implements jmagly/aiwg#146
 */

import fs from 'fs';
import path from 'path';
import {
  DEFAULT_INDEX_EXTENSIONS,
  GRAPH_CONFIGS,
  type GraphType,
  resolveGraphScanDir,
} from './types.js';
import {
  DEFAULT_PROJECT_AIWG_DIR,
  resolveProjectAiwgDir,
} from '../config/project-artifacts.js';
import { workspaceLinkedFiles } from '../smiths/context-pipeline/workspace-context.js';
import { discoverProjectLocalBundles } from '../extensions/project-local-discovery.js';

function pathContains(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function indexPathFor(cwd: string, fullPath: string, graph?: GraphType): string {
  if (!graph || graph === 'project') {
    const artifactRoot = resolveProjectAiwgDir(cwd);
    if (pathContains(artifactRoot, fullPath)) {
      const relative = toPosixPath(path.relative(artifactRoot, fullPath));
      return relative ? `${DEFAULT_PROJECT_AIWG_DIR}/${relative}` : DEFAULT_PROJECT_AIWG_DIR;
    }
  }
  const relative = path.relative(cwd, fullPath);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) return toPosixPath(relative);
  return fullPath;
}

export function findArtifactFiles(
  dir: string,
  extensions: readonly string[] = DEFAULT_INDEX_EXTENSIONS,
): string[] {
  return walkArtifactFiles(dir, extensions, new Set());
}

/** Recursively find indexable files, excluding hidden directories such as .index. */
function walkArtifactFiles(
  dir: string,
  extensions: readonly string[],
  seenRealDirs: Set<string>,
  boundary?: string,
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  let realDir: string;
  try {
    realDir = fs.realpathSync(dir);
  } catch {
    return results;
  }
  if (seenRealDirs.has(realDir)) return results;
  seenRealDirs.add(realDir);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
      if (boundary && !pathContains(boundary, fs.realpathSync(fullPath))) continue;
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      results.push(...walkArtifactFiles(fullPath, extensions, seenRealDirs, boundary));
    } else if (stat.isFile() && extensions.some(extension => entry.name.endsWith(extension))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Return the exact current source-file set used by a standard graph build. */
export async function collectGraphIndexFiles(cwd: string, graph?: GraphType): Promise<string[]> {
  const config = graph ? GRAPH_CONFIGS[graph] : undefined;
  if (graph && !config) {
    throw new Error(`Unknown graph: ${graph}`);
  }
  const scanDirs = config
    ? config.scanDirs.map(directory => resolveGraphScanDir(cwd, directory))
    : [resolveProjectAiwgDir(cwd)];
  const extensions = config?.extensions ?? [...DEFAULT_INDEX_EXTENSIONS];
  const files = new Set<string>();

  for (const scanDir of scanDirs) {
    for (const file of findArtifactFiles(scanDir, extensions)) files.add(file);
  }

  if (!graph || graph === 'project') {
    // Additional search roots authorize bundle payloads, not the surrounding
    // external corpus. Reuse deployment's validated source resolution, including
    // plugin payloads, and prevent payload symlinks from escaping that boundary.
    const { bundles } = await discoverProjectLocalBundles(cwd);
    for (const bundle of bundles) {
      if (scanDirs.some(scanDir => pathContains(scanDir, bundle.artifactPath))) continue;
      const boundary = fs.realpathSync(bundle.artifactPath);
      for (const file of walkArtifactFiles(bundle.artifactPath, extensions, new Set(), boundary)) {
        files.add(file);
      }
    }

    const workspacePath = path.join(cwd, 'WORKSPACE.md');
    const contextFiles = [
      ...(fs.existsSync(workspacePath) ? [workspacePath] : []),
      ...await workspaceLinkedFiles(cwd),
    ];
    for (const contextFile of contextFiles) {
      if (extensions.some(extension => contextFile.endsWith(extension))) files.add(contextFile);
    }
  }

  return [...files];
}
