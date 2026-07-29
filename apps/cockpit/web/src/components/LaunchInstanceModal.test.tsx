import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { LaunchInstanceModal } from './LaunchInstanceModal';

const HOST_INSTANCE = {
  id: 'host-aaaaaaaa-1111',
  runtime: 'host',
  loadout: 'host-tools',
  state: 'running',
  tenant: 'default',
  card_url: '',
  runtime_posture: { kind: 'host', isolation: 'least', label: 'host' },
  host_daemon: { status: 'available' },
  transport: { mode: 'mtls', trust: 'secure', label: 'mTLS', source: 'test' },
  launch_context: { name: 'local-host', loadout: 'host-tools' },
  session_backends: [{ mode: 'managed', backend: 'tmux', available: true, drive: true }],
};

const LOADOUTS = [
  { id: 'host-tools', label: 'host-tools', description: 'Host tools', runtimes: ['host'] },
  {
    id: 'full-suite',
    label: 'full-suite',
    description: 'All providers',
    runtimes: ['docker', 'container', 'qemu', 'vm'],
    compatibility: [{ runtime_kind: 'vm', provider: 'cloud-hypervisor', eligible: true }],
  },
  {
    id: 'gpu-vfio',
    label: 'GPU Workstation',
    description: 'GPU-backed VM',
    runtimes: ['qemu', 'vm'],
    runtime_options: {
      kind: 'vm',
      provider: 'cloud-hypervisor',
      required_capabilities: ['device.vfio'],
      excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
      launch_strategy: { mode: 'cold' },
      constraints: { allow_vfio_fast_start: false, fallback_mode: 'fail' },
    },
    compatibility: [{
      runtime_kind: 'vm',
      provider: 'cloud-hypervisor',
      eligible: true,
      required_capabilities: ['device.vfio'],
      excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
      constraints: [{
        capability: 'device.vfio',
        excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        reason: 'VFIO-backed VMs cannot safely reuse memory state.',
      }],
    }],
  },
  {
    id: 'active-host-gpu',
    label: 'Active Host GPU',
    description: 'Rejected GPU assignment',
    runtimes: ['qemu', 'vm'],
    runtime_options: {
      kind: 'vm',
      provider: 'cloud-hypervisor',
      required_capabilities: ['device.vfio'],
      launch_strategy: { mode: 'cold' },
    },
    compatibility: [{
      runtime_kind: 'vm',
      provider: 'cloud-hypervisor',
      eligible: false,
      required_capabilities: ['device.vfio'],
      reason: 'GPU 0000:41:00.0 is active on the host',
    }],
  },
  { id: 'agentic-dev', label: 'agentic-dev', description: 'Developer tools', runtimes: ['docker', 'container'] },
];

const VM_PROVIDER_CAPS = {
  status: 'ok',
  source: '/healthz/deep',
  host_runtime_enabled: true,
  runtime_providers: {
    default_provider: 'cloud-hypervisor',
    kinds: [{ kind: 'vm', label: 'VM', default_provider: 'cloud-hypervisor', providers: ['cloud-hypervisor'] }],
    providers: [{
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
      capability_constraints: [{
        capability: 'device.vfio',
        excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        reason: 'VFIO-backed VMs cannot safely reuse memory state.',
      }],
    }],
  },
};

const VM_PROVIDER_CAPS_NO_GPU = {
  ...VM_PROVIDER_CAPS,
  runtime_providers: {
    ...VM_PROVIDER_CAPS.runtime_providers,
    providers: [{
      provider: 'cloud-hypervisor',
      kind: 'vm',
      label: 'Cloud Hypervisor',
      default: true,
      capabilities: [{ id: 'instance.restore', label: 'Restore' }],
    }],
  },
};

function mockFetch({
  instances = [HOST_INSTANCE],
  executorCaps = null,
  createdInstanceId = 'docker-1',
}: {
  instances?: unknown[];
  executorCaps?: unknown;
  createdInstanceId?: string;
} = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/api/loadouts')) return ok({ loadouts: LOADOUTS });
    if (url.includes('/api/inventory')) return ok({ instances });
    if (url.includes('/api/executor/capabilities') && executorCaps) return ok(executorCaps);
    if (url.includes('/api/instances') && init?.method === 'POST') return ok({ instance_id: createdInstanceId });
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
}

beforeEach(() => { (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 't'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('LaunchInstanceModal', () => {
  it('uses an existing host target when one is already registered', async () => {
    globalThis.fetch = mockFetch();
    const onLaunched = vi.fn();
    const onClose = vi.fn();
    render(<LaunchInstanceModal open onClose={onClose} onLaunched={onLaunched} />);

    expect(await screen.findByRole('dialog', { name: /new instance/i })).toBeTruthy();
    expect(await screen.findByRole('option', { name: /local-host - host-tools/i })).toBeTruthy();
    expect(screen.getByText('host-tools')).toBeTruthy();
    expect(screen.queryByRole('option', { name: /full-suite/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /start host session/i }));
    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('host-aaaaaaaa-1111', true));
    const postCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/instances') && call[1]?.method === 'POST');
    expect(postCall).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
  });

  it('provisions the first host instance when the executor host supervisor is enabled', async () => {
    globalThis.fetch = mockFetch({
      instances: [],
      executorCaps: { status: 'ok', source: '/healthz/deep', host_runtime_enabled: true },
      createdInstanceId: 'host-created-1',
    });
    const onLaunched = vi.fn();
    const onClose = vi.fn();
    render(<LaunchInstanceModal open onClose={onClose} onLaunched={onLaunched} />);

    expect(await screen.findByRole('option', { name: /local host runtime - create new/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /start host session/i }));

    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('host-created-1', true, undefined));
    const postCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/instances') && call[1]?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      runtime: 'host',
      loadout: 'host-tools',
      start: true,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps Docker on the real provisioning path with Docker loadouts and images', async () => {
    globalThis.fetch = mockFetch();
    const onLaunched = vi.fn();
    render(<LaunchInstanceModal open onClose={() => {}} onLaunched={onLaunched} />);

    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'docker' } });
    expect(await screen.findByRole('option', { name: /agentic-dev/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Codex - agentic\/codex:latest/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /create \+ start session/i }));
    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('docker-1', true, undefined));
    const postCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/instances') && call[1]?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      runtime: 'docker',
      loadout: 'agentic-dev',
      image: 'agentic/codex:latest',
      agentshare: true,
    });
  });

  it('regenerates a fresh instance name on each open so back-to-back launches do not collide', async () => {
    globalThis.fetch = mockFetch();
    const { rerender } = render(<LaunchInstanceModal open onClose={() => {}} onLaunched={() => {}} />);
    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'docker' } });
    const name1 = (await screen.findByLabelText('Name') as HTMLInputElement).value;
    expect(name1).toMatch(/^cockpit-/);
    // Close then reopen — the second launch (e.g. a VM after a Docker) must get a
    // different name, or both register the same name-keyed agent and shadow each other.
    rerender(<LaunchInstanceModal open={false} onClose={() => {}} onLaunched={() => {}} />);
    rerender(<LaunchInstanceModal open onClose={() => {}} onLaunched={() => {}} />);
    const name2 = (await screen.findByLabelText('Name') as HTMLInputElement).value;
    expect(name2).toMatch(/^cockpit-/);
    expect(name2).not.toBe(name1);
  });

  it('passes a VM SSH public key path when launching QEMU', async () => {
    globalThis.fetch = mockFetch();
    const onLaunched = vi.fn();
    render(<LaunchInstanceModal open onClose={() => {}} onLaunched={onLaunched} />);

    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'qemu' } });
    fireEvent.change(await screen.findByLabelText('SSH public key'), { target: { value: '~/.ssh/agentic_ed25519.pub' } });
    fireEvent.click(screen.getByRole('button', { name: /create \+ start session/i }));

    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('docker-1', true, undefined));
    const postCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/instances') && call[1]?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      runtime: 'qemu',
      agentshare: true,
      ssh_key: '~/.ssh/agentic_ed25519.pub',
    });
  });

  it('shows GPU unavailable when provider discovery does not advertise VFIO', async () => {
    globalThis.fetch = mockFetch({ executorCaps: VM_PROVIDER_CAPS_NO_GPU });
    render(<LaunchInstanceModal open onClose={() => {}} onLaunched={() => {}} />);

    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'qemu' } });

    expect(await screen.findByText('GPU passthrough unavailable')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: /request gpu passthrough/i }) as HTMLInputElement).disabled).toBe(true);
  });

  it('rejects a GPU loadout when compatibility reports the host device is active', async () => {
    globalThis.fetch = mockFetch({ executorCaps: VM_PROVIDER_CAPS });
    render(<LaunchInstanceModal open onClose={() => {}} onLaunched={() => {}} />);

    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'qemu' } });
    fireEvent.change(await screen.findByLabelText('Instance loadout'), { target: { value: 'active-host-gpu' } });

    expect(await screen.findByText('GPU 0000:41:00.0 is active on the host')).toBeTruthy();
    expect((screen.getByRole('button', { name: /create \+ start session/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends cold VFIO runtime_options for an eligible GPU loadout', async () => {
    globalThis.fetch = mockFetch({ executorCaps: VM_PROVIDER_CAPS, createdInstanceId: 'vm-gpu-1' });
    const onLaunched = vi.fn();
    render(<LaunchInstanceModal open onClose={() => {}} onLaunched={onLaunched} />);

    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'qemu' } });
    fireEvent.change(await screen.findByLabelText('Instance loadout'), { target: { value: 'gpu-vfio' } });
    fireEvent.click(screen.getByRole('button', { name: /create \+ start session/i }));

    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('vm-gpu-1', true, undefined));
    const postCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/instances') && call[1]?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      runtime: 'qemu',
      provider: 'cloud-hypervisor',
      runtime_options: {
        kind: 'vm',
        provider: 'cloud-hypervisor',
        required_capabilities: ['device.vfio'],
        excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        launch_strategy: { mode: 'cold' },
        constraints: { allow_vfio_fast_start: false, fallback_mode: 'fail' },
      },
    });
  });

  it('surfaces VFIO fast-start incompatibility before launch', async () => {
    globalThis.fetch = mockFetch({ executorCaps: VM_PROVIDER_CAPS });
    render(<LaunchInstanceModal open onClose={() => {}} onLaunched={() => {}} />);

    fireEvent.change(await screen.findByLabelText('Runtime'), { target: { value: 'qemu' } });
    fireEvent.change(await screen.findByLabelText('Instance loadout'), { target: { value: 'gpu-vfio' } });

    expect(await screen.findByText(/Disabled: instance.snapshot, instance.restore, instance.fork, warm_pool.manage/i)).toBeTruthy();
  });
});
