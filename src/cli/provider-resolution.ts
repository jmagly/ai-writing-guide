import { readFileSync } from 'node:fs';
import { readAiwgConfig } from '../config/aiwg-config.js';
import type { Platform } from '../agents/types.js';
import {
  getProviderDefinition,
  listProviderDefinitions,
  normalizeProviderDefinitionId,
} from '../providers/provider-definitions.js';

export type ProviderResolutionSource =
  | 'explicit'
  | 'env'
  | 'runtime-env'
  | 'process'
  | 'config'
  | 'deployment'
  | 'default'
  | 'ambiguous';

export interface ProviderResolution {
  provider: Platform | null;
  source: ProviderResolutionSource;
  candidates: Platform[];
  reason: string;
}

export function normalizeProviderId(provider: string | undefined | null): Platform | null {
  return normalizeProviderDefinitionId(provider);
}

export function capabilityProviderId(provider: Platform | string | null): string | null {
  if (!provider) return null;
  const definition = getProviderDefinition(provider);
  return definition?.detection.capabilityId ?? provider;
}

function uniqueProviders(providers: Iterable<string | undefined | null>): Platform[] {
  const result: Platform[] = [];
  for (const provider of providers) {
    const normalized = normalizeProviderId(provider);
    if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return result;
}

function detectProviderFromRuntimeEnv(env: NodeJS.ProcessEnv): Platform | null {
  const definitions = [...listProviderDefinitions()].sort(
    (a, b) => (a.detection.runtimeEnvPriority ?? Number.MAX_SAFE_INTEGER) - (b.detection.runtimeEnvPriority ?? Number.MAX_SAFE_INTEGER),
  );
  for (const definition of definitions) {
    if (definition.detection.env.some((marker) => Boolean(env[marker]))) return definition.id;
  }
  return null;
}

function commandMatchesProviderMarker(command: string, marker: string): boolean {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (marker.includes('/') || marker.includes('@')) return command.includes(marker);
  return new RegExp(`(?:^|[/\\s])${escaped}(?:$|[\\s/])`).test(command);
}

export function commandLooksLikeProvider(command: string): Platform | null {
  const lower = command.toLowerCase();
  for (const definition of listProviderDefinitions()) {
    if (definition.detection.process.some((marker) => commandMatchesProviderMarker(lower, marker))) {
      return definition.id;
    }
  }
  return null;
}

export function detectProviderFromProcessTree(pid = process.pid): Platform | null {
  let current = pid;
  const seen = new Set<number>();
  for (let depth = 0; depth < 12 && current > 1 && !seen.has(current); depth += 1) {
    seen.add(current);
    try {
      const stat = readFileSync(`/proc/${current}/stat`, 'utf8');
      const end = stat.lastIndexOf(')');
      const fields = stat.slice(end + 2).split(' ');
      const ppid = Number(fields[1]);
      const cmdline = readFileSync(`/proc/${current}/cmdline`, 'utf8').replace(/\0/g, ' ');
      const provider = commandLooksLikeProvider(cmdline);
      if (provider) return provider;
      current = Number.isFinite(ppid) ? ppid : 0;
    } catch {
      return null;
    }
  }
  return null;
}

export async function resolveActiveProvider(options: {
  cwd: string;
  explicitProvider?: string;
  env?: NodeJS.ProcessEnv;
  defaultProvider?: Platform | null;
  detectProcess?: boolean;
}): Promise<ProviderResolution> {
  const env = options.env ?? process.env;
  const explicit = normalizeProviderId(options.explicitProvider);
  if (explicit) {
    return { provider: explicit, source: 'explicit', candidates: [explicit], reason: '--provider supplied' };
  }

  const envProvider = normalizeProviderId(env.AIWG_PROVIDER ?? env.CLAUDECODE_PROVIDER);
  if (envProvider) {
    return { provider: envProvider, source: 'env', candidates: [envProvider], reason: 'explicit provider environment variable' };
  }

  const runtimeProvider = detectProviderFromRuntimeEnv(env);
  if (runtimeProvider) {
    return { provider: runtimeProvider, source: 'runtime-env', candidates: [runtimeProvider], reason: 'runtime environment marker' };
  }

  const testProcessProvider = normalizeProviderId(env.AIWG_TEST_PROCESS_PROVIDER);
  if (testProcessProvider) {
    return { provider: testProcessProvider, source: 'process', candidates: [testProcessProvider], reason: 'provider process ancestry' };
  }

  if (options.detectProcess !== false && env.AIWG_DISABLE_PROCESS_PROVIDER_DETECTION !== '1') {
    const processProvider = detectProviderFromProcessTree();
    if (processProvider) {
      return { provider: processProvider, source: 'process', candidates: [processProvider], reason: 'provider process ancestry' };
    }
  }

  try {
    const config = await readAiwgConfig(options.cwd);
    const configured = uniqueProviders(config?.providers ?? []);
    if (configured.length === 1) {
      return { provider: configured[0], source: 'config', candidates: configured, reason: '.aiwg/aiwg.config providers' };
    }
    if (configured.length > 1) {
      return { provider: null, source: 'ambiguous', candidates: configured, reason: 'multiple configured providers' };
    }

    const deployed = uniqueProviders(
      Object.values(config?.installed ?? {}).flatMap((entry) => Object.keys(entry.deployedTo ?? {})),
    );
    if (deployed.length === 1) {
      return { provider: deployed[0], source: 'deployment', candidates: deployed, reason: 'single deployed provider' };
    }
    if (deployed.length > 1) {
      return { provider: null, source: 'ambiguous', candidates: deployed, reason: 'multiple deployed providers' };
    }
  } catch {
    // Missing or malformed project config is not fatal for provider detection.
  }

  const fallback = options.defaultProvider ?? null;
  return {
    provider: fallback,
    source: fallback ? 'default' : 'ambiguous',
    candidates: fallback ? [fallback] : [],
    reason: fallback ? 'default provider' : 'no provider signal found',
  };
}
