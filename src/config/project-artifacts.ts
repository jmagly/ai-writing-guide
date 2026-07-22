/**
 * Project AIWG artifact directory resolution.
 *
 * The public contract has long documented `AIWG_ARTIFACTS_PATH` as the
 * override for the project-local `.aiwg/` artifact root. Keep that contract
 * centralized so callers do not hardcode `<project>/.aiwg`.
 */

import { homedir } from 'os';
import { isAbsolute, join, resolve } from 'path';

export const DEFAULT_PROJECT_AIWG_DIR = '.aiwg';
export const AIWG_ARTIFACTS_PATH_ENV = 'AIWG_ARTIFACTS_PATH';

const ARTIFACT_PATH_ENV_ALIASES = [
  AIWG_ARTIFACTS_PATH_ENV,
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;

export type ProjectArtifactEnv = Record<string, string | undefined>;

export function expandProjectArtifactPath(pathValue: string, projectDir: string): string {
  const trimmed = pathValue.trim();
  if (trimmed === '~') return homedir();
  if (trimmed.startsWith('~/')) return resolve(homedir(), trimmed.slice(2));
  if (isAbsolute(trimmed)) return trimmed;
  return resolve(projectDir, trimmed);
}

/**
 * Resolve the directory that contains AIWG project artifacts.
 *
 * Defaults to `<projectDir>/.aiwg`. When `AIWG_ARTIFACTS_PATH` is set, the
 * override may be absolute, project-relative, or `~/`-relative. The override
 * intentionally points at the artifact directory itself, not its parent, so
 * callers can rename `.aiwg` or place it outside the checkout.
 */
export function resolveProjectAiwgDir(
  projectDir: string,
  env: ProjectArtifactEnv = process.env,
): string {
  for (const key of ARTIFACT_PATH_ENV_ALIASES) {
    const value = env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return expandProjectArtifactPath(value, projectDir);
    }
  }
  return resolve(projectDir, DEFAULT_PROJECT_AIWG_DIR);
}

export function projectAiwgPath(projectDir: string, ...segments: string[]): string {
  return join(resolveProjectAiwgDir(projectDir), ...segments);
}
