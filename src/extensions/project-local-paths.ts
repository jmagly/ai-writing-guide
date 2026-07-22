/**
 * Project-local bundle search root resolution.
 *
 * The canonical project-local source tree lives under the configured AIWG
 * artifact root, not necessarily `<project>/.aiwg`. Operators may also add
 * extra roots for team/private bundles without moving the project corpus.
 */

import { existsSync, readFileSync } from 'fs';
import { delimiter, isAbsolute, join, relative, resolve, sep } from 'path';
import {
  DEFAULT_PROJECT_AIWG_DIR,
  expandProjectArtifactPath,
  resolveProjectAiwgDir,
  type ProjectArtifactEnv,
} from '../config/project-artifacts.js';
import type { ProjectLocalType } from './manifest.js';

export const PROJECT_LOCAL_SEARCH_PATHS_ENV = 'AIWG_PROJECT_LOCAL_PATHS';

export const PROJECT_LOCAL_TYPE_TO_DIR = {
  extension: 'extensions',
  addon: 'addons',
  framework: 'frameworks',
  plugin: 'plugins',
  provider: 'providers',
} satisfies Record<ProjectLocalType, string>;

export const PROJECT_LOCAL_DIR_TO_TYPE: Record<string, ProjectLocalType> = Object.fromEntries(
  Object.entries(PROJECT_LOCAL_TYPE_TO_DIR).map(([type, dirName]) => [dirName, type as ProjectLocalType]),
);

export const PROJECT_LOCAL_SCAN_DIRS = Object.values(PROJECT_LOCAL_TYPE_TO_DIR);

export interface ProjectLocalSearchRoot {
  /** Absolute directory whose children are extensions/, addons/, frameworks/, plugins/, providers/. */
  rootPath: string;
  /** Stable path prefix used for operator-facing paths under this root. */
  displayPrefix: string;
  /** Where this root came from. */
  source: 'artifact-root' | 'config' | 'env';
}

function toPortablePath(pathValue: string): string {
  return pathValue.split(sep).join('/');
}

export function isPathInside(parentPath: string, candidatePath: string): boolean {
  const parent = resolve(parentPath);
  const candidate = resolve(candidatePath);
  const rel = relative(parent, candidate);
  return rel === '' || (rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel));
}

export function projectRelativePathIfInside(projectDir: string, absPath: string): string | null {
  if (!isPathInside(projectDir, absPath)) return null;
  const rel = toPortablePath(relative(resolve(projectDir), resolve(absPath)));
  return rel.length > 0 ? rel : '.';
}

function displayPrefixForAdditionalRoot(projectDir: string, rootPath: string): string {
  const rel = projectRelativePathIfInside(projectDir, rootPath);
  return rel ?? resolve(rootPath);
}

function readConfiguredSearchPaths(projectDir: string, env: ProjectArtifactEnv): string[] {
  const configPath = join(resolveProjectAiwgDir(projectDir, env), 'aiwg.config');
  if (!existsSync(configPath)) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];
  const record = parsed as Record<string, unknown>;
  const projectLocal = record.projectLocal ?? record.project_local;
  if (!projectLocal || typeof projectLocal !== 'object') return [];

  const projectLocalRecord = projectLocal as Record<string, unknown>;
  const rawPaths = projectLocalRecord.searchPaths ?? projectLocalRecord.search_paths;
  if (!Array.isArray(rawPaths)) return [];

  return rawPaths
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => value.length > 0);
}

export function parseProjectLocalSearchPaths(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(delimiter)
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

/**
 * Resolve project-local bundle roots in scan order.
 *
 * The configured project AIWG artifact root is always first and keeps the
 * virtual `.aiwg/...` display prefix so registry bindings survive a move or
 * rename. Additional roots are then loaded from `aiwg.config` and finally
 * `AIWG_PROJECT_LOCAL_PATHS`.
 */
export function resolveProjectLocalSearchRoots(
  projectDir: string,
  env: ProjectArtifactEnv = process.env,
): ProjectLocalSearchRoot[] {
  const roots: ProjectLocalSearchRoot[] = [];
  const seen = new Set<string>();

  const addRoot = (
    rootPath: string,
    source: ProjectLocalSearchRoot['source'],
    displayPrefix: string,
  ): void => {
    const absoluteRoot = resolve(rootPath);
    const key = process.platform === 'win32' ? absoluteRoot.toLowerCase() : absoluteRoot;
    if (seen.has(key)) return;
    seen.add(key);
    roots.push({ rootPath: absoluteRoot, source, displayPrefix });
  };

  addRoot(
    resolveProjectAiwgDir(projectDir, env),
    'artifact-root',
    DEFAULT_PROJECT_AIWG_DIR,
  );

  for (const rawPath of readConfiguredSearchPaths(projectDir, env)) {
    const rootPath = expandProjectArtifactPath(rawPath, projectDir);
    addRoot(rootPath, 'config', displayPrefixForAdditionalRoot(projectDir, rootPath));
  }

  for (const rawPath of parseProjectLocalSearchPaths(env[PROJECT_LOCAL_SEARCH_PATHS_ENV])) {
    const rootPath = expandProjectArtifactPath(rawPath, projectDir);
    addRoot(rootPath, 'env', displayPrefixForAdditionalRoot(projectDir, rootPath));
  }

  return roots;
}

export function projectLocalDisplayPath(
  projectDir: string,
  absPath: string,
  searchRoot?: ProjectLocalSearchRoot,
): string {
  const absolutePath = resolve(absPath);
  if (searchRoot && isPathInside(searchRoot.rootPath, absolutePath)) {
    const rel = toPortablePath(relative(searchRoot.rootPath, absolutePath));
    const prefix = searchRoot.displayPrefix.replace(/\/+$/, '');
    if (rel.length === 0) return prefix || '.';
    return prefix.length > 0 && prefix !== '.'
      ? `${prefix}/${rel}`
      : rel;
  }

  const projectRel = projectRelativePathIfInside(projectDir, absolutePath);
  return projectRel ?? absolutePath;
}

export function ensureTrailingSlash(pathValue: string): string {
  return pathValue.endsWith('/') ? pathValue : `${pathValue}/`;
}
