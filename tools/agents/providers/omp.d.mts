export interface OmpUninstallOptions { dryRun?: boolean; scope?: 'user' | 'project'; home?: string; env?: NodeJS.ProcessEnv; quiet?: boolean }
export function uninstall(target: string, opts?: OmpUninstallOptions): number;

export function deploySkillSupportAsset(source: string, destination: string, opts?: { dryRun?: boolean; quiet?: boolean }): number;
