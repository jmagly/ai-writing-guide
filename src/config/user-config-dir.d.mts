export interface UserConfigDirOptions {
  configDir?: string;
  env?: Record<string, string | undefined>;
  homeDir?: string;
  exists?: (path: string) => boolean;
}

export function resolveUserConfigDir(options?: UserConfigDirOptions): string;
export function userConfigFile(name: string, options?: UserConfigDirOptions): string;
