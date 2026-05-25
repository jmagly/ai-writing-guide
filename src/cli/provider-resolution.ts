import { readFileSync } from 'node:fs';
import { readAiwgConfig } from '../config/aiwg-config.js';
import type { Platform } from '../agents/types.js';

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

const PROVIDERS: Platform[] = [
  'claude',
  'codex',
  'copilot',
  'cursor',
  'factory',
  'hermes',
  'opencode',
  'openclaw',
  'warp',
  'windsurf',
  'generic',
];

export function normalizeProviderId(provider: string | undefined | null): Platform | null {
  const normalized = provider?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'claude-code') return 'claude';
  if (normalized === 'openai') return 'codex';
  if ((PROVIDERS as string[]).includes(normalized)) return normalized as Platform;
  return null;
}

export function capabilityProviderId(provider: Platform | string | null): string | null {
  if (!provider) return null;
  if (provider === 'claude') return 'claude-code';
  if (provider === 'openai') return 'codex';
  return provider;
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
  if (env.CODEX_SANDBOX || env.CODEX_HOME || env.CODEX_API_KEY || env.OPENAI_API_KEY) return 'codex';
  if (env.CURSOR_TRACE_ID || env.CURSOR_VERSION) return 'cursor';
  if (env.WINDSURF_VERSION) return 'windsurf';
  if (env.WARP_SESSION_ID || env.WARP_TERMINAL) return 'warp';
  if (env.COPILOT_AGENT || env.GITHUB_COPILOT_TOKEN) return 'copilot';
  if (env.OPENCLAW_VERSION) return 'openclaw';
  if (env.FACTORY_AGENT_ID) return 'factory';
  if (env.OPENCODE_VERSION) return 'opencode';
  if (env.CLAUDE_CODE_VERSION || env.ANTHROPIC_API_KEY) return 'claude';
  return null;
}

function commandLooksLikeProvider(command: string): Platform | null {
  const lower = command.toLowerCase();
  if (lower.includes('@openai/codex') || /(?:^|[/\s])codex(?:$|[\s/])/.test(lower)) return 'codex';
  if (lower.includes('claude-code') || /(?:^|[/\s])claude(?:$|[\s/])/.test(lower)) return 'claude';
  if (lower.includes('opencode')) return 'opencode';
  if (lower.includes('cursor')) return 'cursor';
  if (lower.includes('windsurf')) return 'windsurf';
  if (lower.includes('warp')) return 'warp';
  if (lower.includes('factory')) return 'factory';
  if (lower.includes('openclaw')) return 'openclaw';
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
