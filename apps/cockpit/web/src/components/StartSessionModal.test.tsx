import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { StartSessionModal } from './StartSessionModal';
import type { SessionApi } from '../useSession';

// Minimal routed fetch mock: inventory on open, POST session on start.
const INSTANCE = {
  id: 'inst-aaaaaaaa-1111', runtime: 'container', loadout: 'agentic-dev', state: 'running', tenant: 'default',
  card_url: '', runtime_posture: { kind: 'container', isolation: 'shared-kernel', label: 'container' },
  host_daemon: { status: 'unknown' }, transport: { mode: 'mtls', trust: 'secure', label: 'mTLS', source: 't' },
  launch_context: { loadout: 'agentic-dev' },
  session_backends: [{ mode: 'managed', backend: 'tmux', available: true, drive: true }],
};
function mockFetch(postImpl?: (init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('/api/inventory')) return ok({ instances: [INSTANCE] });
    if (url.includes('/sessions') && init?.method === 'POST') {
      return postImpl ? postImpl(init) : ok({ id: 'sess-x', attach_url: 'ws://x/agents/i/sessions/sess-x/attach' });
    }
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
}

function stubSession(attached = false): SessionApi {
  return {
    state: { attached, role: null, url: null },
    attach: vi.fn(), detach: vi.fn(), replay: vi.fn(), requestKeyframe: vi.fn(),
    sendInput: vi.fn(), openTerminal: vi.fn(), isController: false,
  } as unknown as SessionApi;
}

beforeEach(() => { (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 't'; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('StartSessionModal (#1640/#1641)', () => {
  it('renders nothing when closed', () => {
    globalThis.fetch = mockFetch();
    const { container } = render(<StartSessionModal open={false} onClose={() => {}} session={stubSession()} onStarted={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('surfaces the selected instance loadout when opened', async () => {
    globalThis.fetch = mockFetch();
    render(<StartSessionModal open onClose={() => {}} session={stubSession()} onStarted={() => {}} />);
    expect(await screen.findByRole('dialog', { name: /start a session/i })).toBeTruthy();
    expect(screen.getByText('Instance loadout')).toBeTruthy();
    expect(screen.getByText('agentic-dev')).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Security Audit/ })).toBeNull();
  });

  it('explains that attached sessions stay running when starting another session', async () => {
    globalThis.fetch = mockFetch();
    render(<StartSessionModal open onClose={() => {}} session={stubSession(true)} onStarted={() => {}} />);
    expect(await screen.findByText(/existing sessions keep running/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /start another session/i })).toBeTruthy();
  });

  it('starts: POSTs with explicit params, attaches, then closes', async () => {
    globalThis.fetch = mockFetch();
    const session = stubSession();
    const onStarted = vi.fn(), onClose = vi.fn();
    render(<StartSessionModal open onClose={onClose} session={session} onStarted={onStarted} />);
    const startBtn = await screen.findByRole('button', { name: /start session/i });
    await waitFor(() => expect((startBtn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(startBtn);
    await waitFor(() => expect(session.attach).toHaveBeenCalledWith(expect.stringContaining('/attach'), false, 'observer', { instanceId: 'inst-aaaaaaaa-1111', sessionId: 'sess-x' }));
    const postCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => String(c[0]).includes('/sessions') && c[1]?.method === 'POST');
    expect(String(postCall?.[0])).toMatch(/mode=managed&backend=tmux/);
    expect(String(postCall?.[0])).not.toContain('loadout=');
    expect(onStarted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the failure inline instead of an alert()', async () => {
    globalThis.fetch = mockFetch(() => new Response('{"error":"boom"}', { status: 500 }));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<StartSessionModal open onClose={() => {}} session={stubSession()} onStarted={() => {}} />);
    const startBtn = await screen.findByRole('button', { name: /start session/i });
    await waitFor(() => expect((startBtn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(startBtn);
    await waitFor(() => expect(screen.getByText(/→ 500/)).toBeTruthy());
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('unlocks when session start times out', async () => {
    globalThis.fetch = mockFetch((init) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    render(<StartSessionModal open onClose={() => {}} session={stubSession()} onStarted={() => {}} startTimeoutMs={5} />);
    const startBtn = await screen.findByRole('button', { name: /start session/i });
    await waitFor(() => expect((startBtn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(startBtn);
    expect(await screen.findByRole('button', { name: /starting/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/timed out/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /start session/i })).toBeTruthy();
  });

  it('unlocks when the bridge returns no attach URL', async () => {
    globalThis.fetch = mockFetch(() => new Response('{"id":"sess-x"}', { status: 200, headers: { 'content-type': 'application/json' } }));
    render(<StartSessionModal open onClose={() => {}} session={stubSession()} onStarted={() => {}} />);
    const startBtn = await screen.findByRole('button', { name: /start session/i });
    await waitFor(() => expect((startBtn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(startBtn);
    await waitFor(() => expect(screen.getByText(/no attach URL/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /start session/i })).toBeTruthy();
  });
});
