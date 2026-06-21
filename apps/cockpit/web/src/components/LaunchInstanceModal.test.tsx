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
  { id: 'full-suite', label: 'full-suite', description: 'All providers', runtimes: ['docker', 'container', 'qemu', 'vm'] },
  { id: 'agentic-dev', label: 'agentic-dev', description: 'Developer tools', runtimes: ['docker', 'container'] },
];

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/api/loadouts')) return ok({ loadouts: LOADOUTS });
    if (url.includes('/api/inventory')) return ok({ instances: [HOST_INSTANCE] });
    if (url.includes('/api/instances') && init?.method === 'POST') return ok({ instance_id: 'docker-1' });
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
}

beforeEach(() => { (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 't'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('LaunchInstanceModal', () => {
  it('uses an existing host target instead of provisioning unsupported host instances', async () => {
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
});
