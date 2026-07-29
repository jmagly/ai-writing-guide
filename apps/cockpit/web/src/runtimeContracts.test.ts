import { describe, expect, it } from 'vitest';
import { loadoutCompatibilityFixtures, runtimeProviderFixtures } from './runtimeContracts.fixtures';

describe('sandbox runtime contract fixtures', () => {
  it('keeps provider discovery opaque enough for future VM providers', () => {
    const vmKind = runtimeProviderFixtures.kinds.find((kind) => kind.kind === 'vm');
    expect(vmKind?.providers).toContain('future-vm-provider');
    expect(runtimeProviderFixtures.providers.find((provider) => provider.provider === 'future-vm-provider')).toMatchObject({
      kind: 'vm',
      capabilities: [{ id: 'future.capability' }],
    });
  });

  it('represents restore, fork, and warm-pool fast-start assets per provider', () => {
    const agenticDev = loadoutCompatibilityFixtures.find((loadout) => loadout.id === 'agentic-dev');
    const sdlcFork = loadoutCompatibilityFixtures.find((loadout) => loadout.id === 'sdlc-team-fork');

    expect(agenticDev?.runtime_options?.launch_strategy).toMatchObject({
      mode: 'restore',
      asset_ref: 'ch-snapshot-agentic-dev',
    });
    expect(agenticDev?.compatibility?.flatMap((entry) => entry.fast_start_assets ?? []).map((asset) => asset.kind))
      .toEqual(expect.arrayContaining(['snapshot', 'warm_pool']));
    expect(sdlcFork?.runtime_options?.launch_strategy).toMatchObject({
      mode: 'fork',
      asset_ref: 'ch-base-sdlc-team',
    });
  });

  it('captures VFIO incompatibility with snapshot, restore, fork, and warm pools', () => {
    const cloudHypervisor = runtimeProviderFixtures.providers.find((provider) => provider.provider === 'cloud-hypervisor');
    const gpuLoadout = loadoutCompatibilityFixtures.find((loadout) => loadout.id === 'gpu-vfio');
    const excluded = ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'];

    expect(cloudHypervisor?.capability_constraints?.[0]).toMatchObject({
      capability: 'device.vfio',
      excludes: excluded,
    });
    expect(gpuLoadout?.runtime_options?.required_capabilities).toEqual(['device.vfio']);
    expect(gpuLoadout?.runtime_options?.excluded_capabilities).toEqual(excluded);
    expect(gpuLoadout?.runtime_options?.constraints?.allow_vfio_fast_start).toBe(false);
  });
});
