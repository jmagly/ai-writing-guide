export interface StandalonePackageOptions {
  cwd: string;
  name: string;
  source?: string;
  output?: string;
  provider?: string;
  dryRun?: boolean;
  clean?: boolean;
}
export function resolveStandalonePluginSource(options: {
  cwd: string;
  name: string;
  source?: string;
}): string | null;
export function packageStandalonePlugin(options: StandalonePackageOptions): {
  sourceRoot: string;
  payloadRoot: string;
  plans: Array<{ provider: string; archivePath: string }>;
  dryRun: boolean;
} | null;
