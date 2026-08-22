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

/** Recursively find indexable files, excluding hidden directories such as .index. */
export function findArtifactFiles(
  dir: string,
  extensions: readonly string[] = DEFAULT_INDEX_EXTENSIONS,
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink() && !fs.existsSync(fullPath)) continue;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      results.push(...findArtifactFiles(fullPath, extensions));
    } else if (extensions.some(extension => entry.name.endsWith(extension))) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Return the exact current source-file set used by a standard graph build. */
export async function collectGraphIndexFiles(cwd: string, graph?: GraphType): Promise<string[]> {
  const config = graph ? GRAPH_CONFIGS[graph] : undefined;
  const scanDirs = config
    ? config.scanDirs.map(directory => resolveGraphScanDir(cwd, directory))
    : [resolveProjectAiwgDir(cwd)];
  const extensions = config?.extensions ?? [...DEFAULT_INDEX_EXTENSIONS];
  const files = new Set<string>();

  for (const scanDir of scanDirs) {
    for (const file of findArtifactFiles(scanDir, extensions)) files.add(file);
  }

  if (!graph || graph === 'project') {
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
