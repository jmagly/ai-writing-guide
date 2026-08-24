export interface ManagerCommandOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  execute?: (file: string, args: string[], options?: Record<string, unknown>) => unknown;
  execOptions?: Record<string, unknown>;
}

export function resolveManagerCommand(
  file: string,
  args: string[],
  options?: ManagerCommandOptions,
): { file: string; args: string[] };

export function executeManagerCommand(
  file: string,
  args: string[],
  options?: ManagerCommandOptions,
): unknown;
