export const DEFAULT_PROJECT_AIWG_DIR: '.aiwg';
export const AIWG_ARTIFACTS_PATH_ENV: 'AIWG_ARTIFACTS_PATH';
export const PROJECT_AIWG_LOCATION_FILE: '.aiwg-location';

export type ProjectArtifactEnv = Record<string, string | undefined>;

export function expandProjectArtifactPath(pathValue: string, projectDir: string): string;
export function parseProjectArtifactLocation(contents: string): string | null;
export function readProjectArtifactLocation(projectDir: string): string | null;
export function resolveProjectAiwgDir(projectDir: string, env?: ProjectArtifactEnv): string;
export function resolveProjectControlDir(projectDir: string): string;
export function projectAiwgPath(projectDir: string, ...segments: string[]): string;
export function projectControlPath(projectDir: string, ...segments: string[]): string;
