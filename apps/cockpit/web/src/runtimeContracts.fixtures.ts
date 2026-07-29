import type {
  Loadout,
  RuntimeProviderDescriptor,
  RuntimeProvidersResponse,
} from './types';

export const runtimeProviderFixtures: RuntimeProvidersResponse = {
  default_provider: 'cloud-hypervisor',
  kinds: [
    { kind: 'host', label: 'Host', default_provider: 'host', providers: ['host'] },
    { kind: 'container', label: 'Container', default_provider: 'docker', providers: ['docker'] },
    { kind: 'vm', label: 'VM', default_provider: 'cloud-hypervisor', providers: ['cloud-hypervisor', 'libvirt', 'future-vm-provider'] },
  ],
  providers: [
    {
      provider: 'host',
      kind: 'host',
      label: 'Host runtime',
      capabilities: [],
    },
    {
      provider: 'docker',
      kind: 'container',
      label: 'Docker',
      capabilities: [],
    },
    {
      provider: 'cloud-hypervisor',
      kind: 'vm',
      label: 'Cloud Hypervisor',
      default: true,
      capabilities: [
        { id: 'instance.snapshot', label: 'Snapshot' },
        { id: 'instance.restore', label: 'Restore' },
        { id: 'instance.fork', label: 'Fork' },
        { id: 'warm_pool.manage', label: 'Warm pools' },
        { id: 'device.vfio', label: 'VFIO device passthrough' },
      ],
      capability_constraints: [
        {
          capability: 'device.vfio',
          excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
          reason: 'VFIO-backed VMs cannot safely reuse memory snapshots or warm-pool state.',
        },
      ],
    },
    {
      provider: 'libvirt',
      kind: 'vm',
      label: 'libvirt/QEMU',
      capabilities: [
        { id: 'instance.restore', label: 'Checkpoint restore' },
        { id: 'warm_pool.manage', label: 'Warm pools' },
      ],
    },
    {
      provider: 'future-vm-provider',
      kind: 'vm',
      label: 'Future VM provider',
      capabilities: [{ id: 'future.capability', label: 'Future capability' }],
    } satisfies RuntimeProviderDescriptor,
  ],
};

export const loadoutCompatibilityFixtures: Loadout[] = [
  {
    id: 'host-tools',
    label: 'host-tools',
    description: 'Host tools',
    runtimes: ['host'],
    runtime_options: { kind: 'host', provider: 'host', launch_strategy: { mode: 'cold' } },
    compatibility: [{ runtime_kind: 'host', provider: 'host', eligible: true }],
  },
  {
    id: 'agentic-dev',
    label: 'agentic-dev',
    description: 'Developer tools',
    runtimes: ['docker', 'container', 'qemu', 'vm'],
    runtime_options: {
      kind: 'vm',
      provider: 'cloud-hypervisor',
      required_capabilities: ['instance.restore'],
      excluded_capabilities: ['device.vfio'],
      launch_strategy: {
        mode: 'restore',
        prefer_fast_start: true,
        asset_ref: 'ch-snapshot-agentic-dev',
        restore_mode: 'copy',
      },
      constraints: { allow_vfio_fast_start: false, fallback_mode: 'fail' },
    },
    compatibility: [
      {
        runtime_kind: 'vm',
        provider: 'cloud-hypervisor',
        eligible: true,
        required_capabilities: ['instance.restore'],
        excluded_capabilities: ['device.vfio'],
        fast_start_assets: [
          {
            id: 'ch-snapshot-agentic-dev',
            provider: 'cloud-hypervisor',
            kind: 'snapshot',
            state: 'ready',
            capabilities: ['instance.restore'],
          },
        ],
      },
      {
        runtime_kind: 'vm',
        provider: 'libvirt',
        eligible: true,
        required_capabilities: ['warm_pool.manage'],
        fast_start_assets: [
          {
            id: 'libvirt-pool-agentic-dev',
            provider: 'libvirt',
            kind: 'warm_pool',
            state: 'ready',
            capabilities: ['warm_pool.manage'],
          },
        ],
      },
    ],
  },
  {
    id: 'sdlc-team-fork',
    label: 'sdlc-team-fork',
    description: 'Fork from a prepared Cloud Hypervisor base',
    runtimes: ['vm'],
    runtime_options: {
      kind: 'vm',
      provider: 'cloud-hypervisor',
      required_capabilities: ['instance.fork'],
      launch_strategy: {
        mode: 'fork',
        prefer_fast_start: true,
        asset_ref: 'ch-base-sdlc-team',
      },
    },
    compatibility: [
      {
        runtime_kind: 'vm',
        provider: 'cloud-hypervisor',
        eligible: true,
        required_capabilities: ['instance.fork'],
        fast_start_assets: [
          {
            id: 'ch-base-sdlc-team',
            provider: 'cloud-hypervisor',
            kind: 'fork_base',
            state: 'ready',
            capabilities: ['instance.fork'],
          },
        ],
      },
    ],
  },
  {
    id: 'gpu-vfio',
    label: 'gpu-vfio',
    description: 'GPU-backed VM that must cold boot',
    runtimes: ['vm'],
    runtime_options: {
      kind: 'vm',
      provider: 'cloud-hypervisor',
      required_capabilities: ['device.vfio'],
      excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
      launch_strategy: { mode: 'cold' },
      constraints: { allow_vfio_fast_start: false, fallback_mode: 'fail' },
    },
    compatibility: [
      {
        runtime_kind: 'vm',
        provider: 'cloud-hypervisor',
        eligible: true,
        required_capabilities: ['device.vfio'],
        excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        constraints: [
          {
            capability: 'device.vfio',
            excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
            reason: 'VFIO-backed VMs cannot use fast-start memory reuse.',
          },
        ],
      },
    ],
  },
];
