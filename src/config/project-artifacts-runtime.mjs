/**
 * Runtime implementation of project AIWG artifact directory resolution.
 *
 * Kept as ESM JavaScript so direct `.mjs` tools and compiled TypeScript
 * consumers share exactly one resolver implementation.
 */

import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

export const DEFAULT_PROJECT_AIWG_DIR = '.aiwg';
export const AIWG_ARTIFACTS_PATH_ENV = 'AIWG_ARTIFACTS_PATH';
export const PROJECT_AIWG_LOCATION_FILE = '.aiwg-location';

const ARTIFACT_PATH_ENV_ALIASES = [
  AIWG_ARTIFACTS_PATH_ENV,
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
];

export function expandProjectArtifactPath(pathValue, projectDir) {
  const trimmed = pathValue.trim();
  if (trimmed === '~') return homedir();
  if (trimmed.startsWith('~/')) return resolve(homedir(), trimmed.slice(2));
  if (isAbsolute(trimmed)) return trimmed;
  return resolve(projectDir, trimmed);
}

export function parseProjectArtifactLocation(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice('export '.length).trim();
    const assignment = line.match(/^AIWG_ARTIFACTS_PATH\s*=\s*(.+)$/);
    if (assignment) line = assignment[1].trim();
    if (
      (line.startsWith('"') && line.endsWith('"')) ||
      (line.startsWith("'") && line.endsWith("'"))
    ) {
      line = line.slice(1, -1);
    }
    return line.length > 0 ? line : null;
  }
  return null;
}

export function readProjectArtifactLocation(projectDir) {
  const pointerPath = resolve(projectDir, PROJECT_AIWG_LOCATION_FILE);
  if (!existsSync(pointerPath)) return null;
  return parseProjectArtifactLocation(readFileSync(pointerPath, 'utf-8'));
}

export function resolveProjectAiwgDir(projectDir, env = process.env) {
  for (const key of ARTIFACT_PATH_ENV_ALIASES) {
    const value = env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return expandProjectArtifactPath(value, projectDir);
    }
  }
  const configuredLocation = readProjectArtifactLocation(projectDir);
  if (configuredLocation) return expandProjectArtifactPath(configuredLocation, projectDir);
  return resolve(projectDir, DEFAULT_PROJECT_AIWG_DIR);
}

export function projectAiwgPath(projectDir, ...segments) {
  return join(resolveProjectAiwgDir(projectDir), ...segments);
}
