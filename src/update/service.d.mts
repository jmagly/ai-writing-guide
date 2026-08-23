export type InstallMode = 'npm' | 'web' | 'source';

export interface UpdateResult {
  mode: InstallMode;
  packageRoot: string;
  packageName: string | null;
  channel: string;
  status: 'updated' | 'current' | 'manual' | 'dry-run' | 'unsupported-offline';
  changed: boolean;
  version?: string;
  command?: string;
  message: string;
  identity?: import('../installation/manager.mjs').InstallationIdentity;
  identityPersistent?: boolean;
}

export function detectInstallMode(options?: Record<string, unknown>): Promise<{
  mode: InstallMode;
  packageRoot: string;
  packageName: string | null;
}>;
export function updateInstallation(options?: Record<string, unknown>): Promise<UpdateResult>;
