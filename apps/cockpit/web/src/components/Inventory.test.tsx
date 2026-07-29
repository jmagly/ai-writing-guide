import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Inventory } from './Inventory';

const VM_INSTANCE = {
  id: 'vm-1',
  runtime: 'vm',
  provider: 'cloud-hypervisor',
  capabilities: [
    { id: 'instance.snapshot', label: 'Snapshot' },
    { id: 'instance.restore', label: 'Restore' },
    { id: 'instance.fork', label: 'Fork' },
    { id: 'warm_pool.manage', label: 'Warm pools' },
  ],
  loadout: 'security-audit',
  state: 'running',
  tenant: 'default',
  card_url: '',
  runtime_posture: { kind: 'vm', isolation: 'strong', label: 'VM' },
  host_daemon: { status: 'available' },
  transport: { mode: 'mtls', trust: 'secure', label: 'mTLS', source: 'test' },
  launch_context: { name: 'vm-one', loadout: 'security-audit' },
  session_backends: [{ mode: 'managed', backend: 'zellij', available: true, drive: true }],
};

beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 't';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Inventory provider-aware fast-start controls', () => {
  it('runs a capability-gated snapshot action and records terminal audit evidence', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.includes('/api/inventory')) return ok({ count: 1, fetched_at: '2026-07-29T00:00:00Z', instances: [VM_INSTANCE] });
      if (url.includes('/api/instances/vm-1/snapshot') && init?.method === 'POST') return ok({ id: 'op-1', state: 'running' });
      if (url.includes('/api/operations/op-1')) return ok({ id: 'op-1', state: 'succeeded', result: { provider: 'cloud-hypervisor', snapshot_id: 'vm-one-snap' } });
      if (url.includes('/api/audit/intent') && init?.method === 'POST') return ok({ id: 'audit-1' });
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;
    vi.spyOn(window, 'prompt').mockReturnValue('vm-one-snap');

    render(<Inventory refreshMs={60_000} />);

    fireEvent.click(await screen.findByRole('button', { name: /snapshot vm-1/i }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Snapshot succeeded: op-1'));
    const actionCall = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/instances/vm-1/snapshot'));
    expect(JSON.parse(String(actionCall?.[1]?.body))).toMatchObject({ asset_ref: 'vm-one-snap' });
    const auditCall = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls
      .find((call) => String(call[0]).includes('/api/audit/intent'));
    expect(JSON.parse(String(auditCall?.[1]?.body))).toMatchObject({
      event: 'instance.fast_start.terminal',
      detail: {
        instance_id: 'vm-1',
        provider: 'cloud-hypervisor',
        action: 'snapshot',
        operation_id: 'op-1',
        state: 'succeeded',
      },
    });
  });

  it('disables unsafe fast-start controls when VFIO constraints exclude them', async () => {
    const vfioVm = {
      ...VM_INSTANCE,
      capability_constraints: [{
        capability: 'device.vfio',
        excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        reason: 'VFIO-backed VMs cannot safely reuse memory state.',
      }],
    };
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/inventory')) {
        return new Response(JSON.stringify({ count: 1, fetched_at: '2026-07-29T00:00:00Z', instances: [vfioVm] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;

    render(<Inventory refreshMs={60_000} />);

    const snapshot = await screen.findByRole('button', { name: /snapshot vm-1/i }) as HTMLButtonElement;
    expect(snapshot.disabled).toBe(true);
    expect(snapshot.getAttribute('title')).toBe('VFIO-backed VMs cannot safely reuse memory state.');
    expect((screen.getByRole('button', { name: /restore vm-1/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /fork vm-1/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /warm pool vm-1/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
