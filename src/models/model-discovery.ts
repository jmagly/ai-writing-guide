import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { ProviderInventory } from '../providers/provider-inventory.js';

export type ModelCatalogSource = 'native' | 'remote' | 'cache' | 'static';

export interface DiscoveredModel {
  id: string;
  displayName?: string;
  hidden?: boolean;
  isDefault?: boolean;
  reasoningEfforts?: string[];
}

export interface ProviderModelDiscovery {
  provider: string;
  source: ModelCatalogSource;
  observedAt: string;
  runtimeVersion?: string;
  accountScope: 'local-account' | 'public-feed' | 'static';
  models: DiscoveredModel[];
  error?: string;
}

export interface DynamicModelCatalog {
  version: string;
  refreshedAt?: string;
  providers: Record<string, {
    roles: Record<string, { id: string; status?: string; observed?: boolean }>;
    sourceUrl?: string;
    verifiedAt?: string;
  }>;
  discovery?: {
    source: ModelCatalogSource;
    upstreamSource?: Exclude<ModelCatalogSource, 'cache'>;
    fetchedAt: string;
    remoteUrl?: string;
    remoteError?: string;
    inventorySignature?: string;
    providers: Record<string, ProviderModelDiscovery>;
  };
}

export interface ModelDiscoveryOptions {
  aiwgRoot: string;
  inventory: ProviderInventory;
  homeDir?: string;
  cacheFile?: string;
  remoteUrl?: string;
  ttlMs?: number;
  forceRefresh?: boolean;
  allowNetwork?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  nativeDiscoverers?: Record<string, () => Promise<ProviderModelDiscovery>>;
}

export interface ModelCatalogDrift {
  changed: boolean;
  providers: Record<string, Array<{
    role: string;
    before: string | null;
    after: string | null;
  }>>;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

async function atomicWrite(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, file);
}

async function readCatalog(file: string): Promise<DynamicModelCatalog | null> {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as DynamicModelCatalog;
    if (!parsed.version || !parsed.providers || typeof parsed.providers !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function inventorySignature(inventory: ProviderInventory): string {
  return inventory.providers
    .filter(provider => provider.available)
    .map(provider => `${provider.id}:${provider.evidence
      .filter(item => item.kind === 'executable' || item.kind === 'runtime-env')
      .map(item => `${item.kind}=${item.value}`)
      .sort()
      .join(',')}`)
    .sort()
    .join('|');
}

function isFresh(
  catalog: DynamicModelCatalog,
  now: Date,
  ttlMs: number,
  signature: string,
): boolean {
  const fetchedAt = catalog.discovery?.fetchedAt;
  if (!fetchedAt) return false;
  if (
    catalog.discovery?.inventorySignature
    && catalog.discovery.inventorySignature !== signature
  ) return false;
  const age = now.getTime() - Date.parse(fetchedAt);
  return Number.isFinite(age) && age >= 0 && age <= ttlMs;
}

export function selectRoleModels(models: DiscoveredModel[]): {
  reasoning?: DiscoveredModel;
  coding?: DiscoveredModel;
  efficiency?: DiscoveredModel;
} {
  const visible = models.filter(model => !model.hidden);
  if (visible.length === 0) return {};
  const coding = visible.find(model => model.isDefault) ?? visible[0];
  const efficiency = visible.find(model => /(?:mini|spark|haiku|light|flash)/i.test(model.id))
    ?? [...visible].sort(
      (a, b) => (a.reasoningEfforts?.length ?? 0) - (b.reasoningEfforts?.length ?? 0),
    )[0];
  const reasoning = [...visible].sort((a, b) => {
    const effortDelta = (b.reasoningEfforts?.length ?? 0) - (a.reasoningEfforts?.length ?? 0);
    if (effortDelta !== 0) return effortDelta;
    return Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault));
  })[0];
  return { reasoning, coding, efficiency };
}

export function diffModelCatalog(
  before: DynamicModelCatalog,
  after: DynamicModelCatalog,
): ModelCatalogDrift {
  const providers: ModelCatalogDrift['providers'] = {};
  for (const provider of new Set([
    ...Object.keys(before.providers),
    ...Object.keys(after.providers),
  ])) {
    const changes: ModelCatalogDrift['providers'][string] = [];
    const beforeRoles = before.providers[provider]?.roles ?? {};
    const afterRoles = after.providers[provider]?.roles ?? {};
    for (const role of new Set([...Object.keys(beforeRoles), ...Object.keys(afterRoles)])) {
      const previous = beforeRoles[role]?.id ?? null;
      const next = afterRoles[role]?.id ?? null;
      if (previous !== next) changes.push({ role, before: previous, after: next });
    }
    if (changes.length > 0) providers[provider] = changes;
  }
  return { changed: Object.keys(providers).length > 0, providers };
}

export async function discoverCodexModels(
  command = 'codex',
  timeoutMs = 10_000,
): Promise<ProviderModelDiscovery> {
  const observedAt = new Date().toISOString();
  return new Promise((resolveDiscovery) => {
    const child = spawn(command, ['app-server', '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    const lines = createInterface({ input: child.stdout });
    let settled = false;
    let stderr = '';
    let timer: NodeJS.Timeout;
    const finish = (result: ProviderModelDiscovery) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      lines.close();
      child.kill();
      resolveDiscovery(result);
    };
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('error', error => finish({
      provider: 'codex',
      source: 'native',
      observedAt,
      accountScope: 'local-account',
      models: [],
      error: error.message,
    }));
    lines.on('line', line => {
      let message: any;
      try { message = JSON.parse(line); } catch { return; }
      if (message.id === 1 && message.result) {
        child.stdin.write(`${JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialized',
          params: {},
        })}\n`);
        child.stdin.write(`${JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'model/list',
          params: { includeHidden: false, limit: 100 },
        })}\n`);
      }
      if (message.id === 2) {
        const models = Array.isArray(message.result?.data)
          ? message.result.data.map((model: any) => ({
            id: String(model.model ?? model.id),
            displayName: typeof model.displayName === 'string' ? model.displayName : undefined,
            hidden: Boolean(model.hidden),
            isDefault: Boolean(model.isDefault),
            reasoningEfforts: Array.isArray(model.supportedReasoningEfforts)
              ? model.supportedReasoningEfforts.map((effort: any) =>
                typeof effort === 'string' ? effort : String(effort.reasoningEffort ?? effort.effort ?? effort)
              )
              : undefined,
          }))
          : [];
        finish({
          provider: 'codex',
          source: 'native',
          observedAt,
          accountScope: 'local-account',
          models,
          ...(message.error ? { error: JSON.stringify(message.error) } : {}),
        });
      }
    });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: { name: 'aiwg-model-discovery', version: '1.0.0' },
        capabilities: { experimentalApi: false },
      },
    })}\n`);
    timer = setTimeout(() => finish({
      provider: 'codex',
      source: 'native',
      observedAt,
      accountScope: 'local-account',
      models: [],
      error: `Codex app-server model/list timed out${stderr ? `: ${stderr.trim()}` : ''}`,
    }), timeoutMs);
  });
}

export async function resolveDynamicModelCatalog(
  options: ModelDiscoveryOptions,
): Promise<DynamicModelCatalog> {
  const now = (options.now ?? (() => new Date()))();
  const homeDir = options.homeDir ?? homedir();
  const cacheFile = options.cacheFile ?? join(homeDir, '.cache/aiwg/model-catalog.v1.json');
  const staticFile = join(options.aiwgRoot, 'agentic/code/providers/model-catalog.v1.json');
  const signature = inventorySignature(options.inventory);
  const staticCatalog = await readCatalog(staticFile);
  if (!staticCatalog) throw new Error(`Invalid or missing static model catalog: ${staticFile}`);
  const cached = await readCatalog(cacheFile);
  if (
    !options.forceRefresh
    && cached
    && isFresh(cached, now, options.ttlMs ?? DEFAULT_TTL_MS, signature)
  ) {
    return {
      ...cached,
      discovery: cached.discovery
        ? {
          ...cached.discovery,
          source: 'cache',
          upstreamSource: cached.discovery.source === 'cache'
            ? cached.discovery.upstreamSource
            : cached.discovery.source,
        }
        : undefined,
    };
  }

  if (!options.allowNetwork) {
    return {
      ...staticCatalog,
      discovery: {
        source: 'static',
        fetchedAt: now.toISOString(),
        inventorySignature: signature,
        providers: {},
      },
    };
  }

  const remoteUrl = options.remoteUrl ?? process.env.AIWG_MODEL_CATALOG_URL;
  let catalog = staticCatalog;
  let source: ModelCatalogSource = 'static';
  let remoteError: string | undefined;
  if (remoteUrl) {
    try {
      const response = await (options.fetchImpl ?? fetch)(remoteUrl, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = await response.json() as DynamicModelCatalog;
      if (!remote.version || !remote.providers) throw new Error('invalid catalog shape');
      catalog = remote;
      source = 'remote';
    } catch (error) {
      remoteError = (error as Error).message;
      // Static catalog remains the deterministic offline fallback.
    }
  }

  const available = new Set(
    options.inventory.providers.filter(provider => provider.available).map(provider => provider.id),
  );
  const nativeDiscoverers = options.nativeDiscoverers ?? {
    codex: () => discoverCodexModels(),
  };
  const providerDiscovery: Record<string, ProviderModelDiscovery> = {};
  for (const provider of available) {
    const discoverer = nativeDiscoverers[provider];
    if (discoverer) {
      try {
        providerDiscovery[provider] = await discoverer();
        const selected = selectRoleModels(providerDiscovery[provider].models);
        const providerCatalog = catalog.providers[provider];
        if (providerCatalog) {
          for (const role of ['reasoning', 'coding', 'efficiency'] as const) {
            if (!selected[role]) continue;
            providerCatalog.roles[role] = {
              ...(providerCatalog.roles[role] ?? {}),
              id: selected[role]!.id,
              status: 'active',
              observed: true,
            };
          }
          providerCatalog.verifiedAt = providerDiscovery[provider].observedAt.slice(0, 10);
        }
      } catch (error) {
        providerDiscovery[provider] = {
          provider,
          source: 'native',
          observedAt: now.toISOString(),
          accountScope: 'local-account',
          models: [],
          error: (error as Error).message,
        };
      }
    } else {
      providerDiscovery[provider] = {
        provider,
        source,
        observedAt: now.toISOString(),
        accountScope: source === 'remote' ? 'public-feed' : 'static',
        models: Object.values(catalog.providers[provider]?.roles ?? {}).map(role => ({ id: role.id })),
        error: 'Provider exposes no supported machine-readable local model enumeration interface.',
      };
    }
  }

  const resolved: DynamicModelCatalog = {
    ...catalog,
    discovery: {
      source,
      fetchedAt: now.toISOString(),
      ...(source === 'remote' && remoteUrl ? { remoteUrl } : {}),
      ...(remoteError ? { remoteError } : {}),
      inventorySignature: signature,
      providers: providerDiscovery,
    },
  };
  await atomicWrite(cacheFile, `${JSON.stringify(resolved, null, 2)}\n`);
  return resolved;
}
