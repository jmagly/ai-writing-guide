export interface OmpPathOptions {
  env?: NodeJS.ProcessEnv;
  home?: string;
  cwd?: string;
  platform?: string;
  exists?: (path: string) => boolean;
}
export function normalizeOmpProfile(value?: string): string | undefined;
export function resolveOmpPaths(options?: OmpPathOptions): {
  profile?: string; configRoot: string; agentDir: string; projectDir: string;
  resourceDirs: { agents: string; skills: string; commands: string; rules: string; behaviors: string };
  dataDir: string; stateDir: string; cacheDir: string; sessionsDir: string;
};
