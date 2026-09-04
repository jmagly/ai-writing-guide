export function ompServerConfig(server: Record<string, any>): Record<string, any>;
export function manageOmpMcp(configPath: string, servers: Array<{name: string; [key: string]: any}>, options?: {dryRun?: boolean; remove?: string[]}): Promise<{
  configPath: string; serversInjected: string[]; alreadyPresent: string[]; removed: string[];
}>;
