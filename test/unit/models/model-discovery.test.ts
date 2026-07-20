import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  diffModelCatalog,
  resolveDynamicModelCatalog,
} from '../../../src/models/model-discovery.js';
import type { ProviderInventory } from '../../../src/providers/provider-inventory.js';

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-model-discovery-'));
  roots.push(root);
  const cacheFile = join(root, 'cache/model-catalog.v1.json');
  await mkdir(join(root, 'agentic/code/providers'), { recursive: true });
  const catalog = {
    version: '1.0.0',
    refreshedAt: '2026-07-20',
    providers: {
      codex: { roles: { reasoning: { id: 'static-premium' }, coding: { id: 'static-standard' } } },
      claude: { roles: { reasoning: { id: 'static-opus' } } },
    },
  };
  await writeFile(
    join(root, 'agentic/code/providers/model-catalog.v1.json'),
    JSON.stringify(catalog),
  );
  const inventory: ProviderInventory = {
    generatedAt: new Date(0).toISOString(),
    projectDir: root,
    activeProvider: 'codex',
    activeSource: 'env',
    providers: [
      {
        id: 'codex',
        displayName: 'Codex',
        configured: true,
        deployed: true,
        detected: true,
        available: true,
        active: true,
        evidence: [],
        reasons: [],
      },
      {
        id: 'claude',
        displayName: 'Claude',
        configured: true,
        deployed: false,
        detected: false,
        available: false,
        active: false,
        evidence: [],
        reasons: ['not installed'],
      },
    ],
  };
  return { root, cacheFile, inventory, catalog };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('dynamic model catalog', () => {
  it('produces a reviewable provider-role drift report', () => {
    const before: any = {
      version: '1',
      providers: { codex: { roles: { coding: { id: 'old' } } } },
    };
    const after: any = {
      version: '2',
      providers: { codex: { roles: { coding: { id: 'new' } } } },
    };
    expect(diffModelCatalog(before, after)).toEqual({
      changed: true,
      providers: {
        codex: [{ role: 'coding', before: 'old', after: 'new' }],
      },
    });
  });

  it('uses static data without network during ordinary reads', async () => {
    const { root, cacheFile, inventory } = await fixture();
    const fetchImpl = vi.fn();
    const resolved = await resolveDynamicModelCatalog({
      aiwgRoot: root,
      cacheFile,
      inventory,
      allowNetwork: false,
      fetchImpl: fetchImpl as any,
      now: () => new Date(0),
    });
    expect(resolved.discovery?.source).toBe('static');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refreshes from a public feed and runs native discovery only for available providers', async () => {
    const { root, cacheFile, inventory } = await fixture();
    const codexDiscovery = vi.fn().mockResolvedValue({
      provider: 'codex',
      source: 'native',
      observedAt: new Date(0).toISOString(),
      accountScope: 'local-account',
      models: [{ id: 'account-model' }],
    });
    const claudeDiscovery = vi.fn();
    const resolved = await resolveDynamicModelCatalog({
      aiwgRoot: root,
      cacheFile,
      inventory,
      allowNetwork: true,
      remoteUrl: 'https://aiwg.example/models.json',
      fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify({
        version: '2.0.0',
        providers: {
          codex: { roles: { reasoning: { id: 'remote-premium' } } },
        },
      }))),
      nativeDiscoverers: {
        codex: codexDiscovery,
        claude: claudeDiscovery,
      },
      now: () => new Date(0),
    });
    expect(resolved.version).toBe('2.0.0');
    expect(resolved.discovery).toMatchObject({
      source: 'remote',
      remoteUrl: 'https://aiwg.example/models.json',
    });
    expect(resolved.discovery?.providers.codex.models).toEqual([{ id: 'account-model' }]);
    expect(codexDiscovery).toHaveBeenCalledOnce();
    expect(claudeDiscovery).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(cacheFile, 'utf8')).discovery.source).toBe('remote');
  });

  it('uses a fresh cache and avoids provider or network probes', async () => {
    const { root, cacheFile, inventory } = await fixture();
    await mkdir(join(root, 'cache'), { recursive: true });
    await writeFile(cacheFile, JSON.stringify({
      version: 'cached',
      providers: {},
      discovery: {
        source: 'remote',
        fetchedAt: '2026-07-20T00:00:00.000Z',
        providers: {},
      },
    }));
    const fetchImpl = vi.fn();
    const native = vi.fn();
    const resolved = await resolveDynamicModelCatalog({
      aiwgRoot: root,
      cacheFile,
      inventory,
      allowNetwork: true,
      fetchImpl: fetchImpl as any,
      nativeDiscoverers: { codex: native },
      now: () => new Date('2026-07-20T01:00:00.000Z'),
    });
    expect(resolved.version).toBe('cached');
    expect(resolved.discovery).toMatchObject({ source: 'cache', upstreamSource: 'remote' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(native).not.toHaveBeenCalled();
  });

  it('forces native refresh from a fresh cache without requiring a public feed', async () => {
    const { root, cacheFile, inventory } = await fixture();
    await mkdir(join(root, 'cache'), { recursive: true });
    await writeFile(cacheFile, JSON.stringify({
      version: 'cached',
      providers: {},
      discovery: {
        source: 'remote',
        fetchedAt: '2026-07-20T00:00:00.000Z',
        providers: {},
      },
    }));
    const fetchImpl = vi.fn();
    const native = vi.fn().mockResolvedValue({
      provider: 'codex',
      source: 'native',
      observedAt: '2026-07-20T01:00:00.000Z',
      accountScope: 'local-account',
      models: [{ id: 'native-default', isDefault: true }],
    });
    const resolved = await resolveDynamicModelCatalog({
      aiwgRoot: root,
      cacheFile,
      inventory,
      allowNetwork: true,
      forceRefresh: true,
      fetchImpl: fetchImpl as any,
      nativeDiscoverers: { codex: native },
      now: () => new Date('2026-07-20T01:00:00.000Z'),
    });
    expect(resolved.version).toBe('1.0.0');
    expect(resolved.discovery?.source).toBe('static');
    expect(resolved.providers.codex.roles.coding).toMatchObject({
      id: 'native-default',
      observed: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(native).toHaveBeenCalledOnce();
  });

  it('invalidates a fresh cache when provider runtime evidence changes', async () => {
    const { root, cacheFile, inventory } = await fixture();
    await mkdir(join(root, 'cache'), { recursive: true });
    await writeFile(cacheFile, JSON.stringify({
      version: 'cached',
      providers: {},
      discovery: {
        source: 'native',
        fetchedAt: '2026-07-20T00:00:00.000Z',
        inventorySignature: 'codex:executable=/old/codex@1',
        providers: {},
      },
    }));
    inventory.providers[0].evidence = [
      { kind: 'executable', scope: 'runtime', value: '/new/codex@2' },
    ];
    const native = vi.fn().mockResolvedValue({
      provider: 'codex',
      source: 'native',
      observedAt: '2026-07-20T01:00:00.000Z',
      accountScope: 'local-account',
      models: [{ id: 'new-runtime-model', isDefault: true }],
    });
    const resolved = await resolveDynamicModelCatalog({
      aiwgRoot: root,
      cacheFile,
      inventory,
      allowNetwork: true,
      nativeDiscoverers: { codex: native },
      now: () => new Date('2026-07-20T01:00:00.000Z'),
    });
    expect(resolved.version).toBe('1.0.0');
    expect(resolved.providers.codex.roles.coding.id).toBe('new-runtime-model');
    expect(native).toHaveBeenCalledOnce();
  });
});
