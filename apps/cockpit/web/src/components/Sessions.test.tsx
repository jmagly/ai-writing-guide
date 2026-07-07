import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, within, act } from '@testing-library/react';
import { Sessions } from './Sessions';
import type { SessionApi } from '../useSession';
import { resetSessionRegistryForTest, updateRegistrySessionSnapshot } from '../sessionRegistry';

const INSTANCE = {
  id: 'inst-1',
  runtime: 'docker',
  loadout: 'agentic-dev',
  state: 'running',
  tenant: 'default',
  card_url: '',
  runtime_posture: { kind: 'docker', isolation: 'shared-kernel', label: 'Container' },
  host_daemon: { status: 'available' },
  transport: { mode: 'mtls-agent-registration', trust: 'secure', label: 'Secure transport', source: 'test' },
  launch_context: { name: 'docker-one', loadout: 'agentic-dev' },
  session_backends: [{ mode: 'managed', backend: 'tmux', available: true, drive: true, keyframe: true }],
};
const INSTANCE_NEXT = {
  ...INSTANCE,
  id: 'inst-2',
  launch_context: { name: 'docker-two', loadout: 'agentic-dev' },
};

function stubSession(state: Partial<SessionApi['state']> = {}): SessionApi {
  const nextState = { attached: true, role: 'controller', url: 'ws://x/agents/inst-1/sessions/sess-1/attach', ...state };
  return {
    state: nextState,
    responseNeeded: { needed: false, prompt: '', since: null, source: 'pty' },
    attach: vi.fn(),
    detach: vi.fn(),
    replay: vi.fn(),
    requestKeyframe: vi.fn(),
    sendInput: vi.fn(),
    openTerminal: vi.fn(),
    isController: nextState.role === 'controller',
  } as unknown as SessionApi;
}

beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 'test-token';
  resetSessionRegistryForTest();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Sessions', () => {
  it('ends the selected session, detaches if attached, and refreshes the list', async () => {
    const session = stubSession();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [{
          id: 'sess-1',
          session_name: 'terminal-main',
          instance_id: 'inst-1',
          attach_url: 'ws://x/agents/inst-1/sessions/sess-1/attach',
          session_class: 'managed',
          session_backend: 'tmux',
        }],
      });
      if (url.includes('/api/instances/inst-1/sessions/sess-1') && init?.method === 'DELETE') return jsonResponse({ ended: true });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    const endButton = await screen.findByRole('button', { name: /end session/i });
    await waitFor(() => expect((endButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(endButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/instances/inst-1/sessions/sess-1'),
      expect.objectContaining({ method: 'DELETE' }),
    ));
    await waitFor(() => expect(session.detach).toHaveBeenCalled());
  });

  it('refreshes stale recovered inventory and stops offering dead session attach URLs', async () => {
    const session = stubSession({ attached: false, role: null, url: null });
    const inventories = [
      { instances: [INSTANCE] },
      { instances: [INSTANCE_NEXT] },
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse(inventories.shift() ?? { instances: [INSTANCE_NEXT] });
      if (url.includes('instance=inst-1')) return jsonResponse({
        sessions: [{
          id: 'sess-old',
          instance_id: 'inst-1',
          attach_url: 'ws://x/agents/inst-1/sessions/sess-old/attach',
          session_class: 'managed',
          session_backend: 'tmux',
        }],
      });
      if (url.includes('instance=inst-2')) return jsonResponse({
        sessions: [{
          id: 'sess-new',
          instance_id: 'inst-2',
          attach_url: 'ws://x/agents/inst-2/sessions/sess-new/attach',
          session_class: 'managed',
          session_backend: 'tmux',
        }],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} refreshMs={10} />);

    // The nav lists instances as buttons (not <select> options) now (#1670).
    expect(await screen.findByText('docker-one')).toBeTruthy();
    // Inventory refresh swaps inst-1 → inst-2; the dead instance drops out and
    // selection follows to the live one, whose session is listed underneath.
    expect(await screen.findByText('docker-two')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('docker-one')).toBeNull());
    // Scope to the nav (the active-session indicator also carries the id by title).
    const nav = screen.getByLabelText('Instances and sessions');
    expect(await within(nav).findByTitle('sess-new')).toBeTruthy();
  });

  it('keeps controller posture when a different session is selected while driving (#1670)', async () => {
    const session = stubSession(); // currently attached to .../sessions/sess-1/attach as controller
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [{ id: 'sess-2', session_name: 'terminal-other', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-2/attach', mode: 'managed', backend: 'tmux' }],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    const nav = screen.getByLabelText('Instances and sessions');
    const sessBtn = await within(nav).findByTitle('sess-2');
    fireEvent.click(sessBtn);
    // Selecting a not-yet-attached session should not silently downgrade an
    // operator who is already driving another session.
    expect(session.attach).toHaveBeenCalledWith('ws://x/agents/inst-1/sessions/sess-2/attach', false, 'controller', { instanceId: 'inst-1', sessionId: 'sess-2' });
  });

  it('does not detach the live session when browsing another instance (#1739)', async () => {
    const session = stubSession();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE, INSTANCE_NEXT] });
      if (url.includes('instance=inst-1')) return jsonResponse({
        sessions: [{ id: 'sess-1', session_name: 'terminal-main', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-1/attach', mode: 'managed', backend: 'tmux' }],
      });
      if (url.includes('instance=inst-2')) return jsonResponse({
        sessions: [{ id: 'sess-2', session_name: 'terminal-other', instance_id: 'inst-2', attach_url: 'ws://x/agents/inst-2/sessions/sess-2/attach', mode: 'managed', backend: 'tmux' }],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    expect((await screen.findAllByTitle('sess-1')).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByText('docker-two'));
    expect((await screen.findAllByText('terminal-other')).length).toBeGreaterThan(0);

    expect(session.detach).not.toHaveBeenCalled();
  });

  it('treats the instance/session pair as live identity when attach URLs diverge (#1741)', async () => {
    const session = stubSession({ url: 'ws://executor-a/agents/inst-1/sessions/sess-1/attach?from=create' });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [{
          id: 'sess-1',
          session_name: 'terminal-main',
          instance_id: 'inst-1',
          attach_url: 'ws://executor-b/agents/inst-1/sessions/sess-1/attach',
          mode: 'managed',
          backend: 'tmux',
        }],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    const nav = screen.getByLabelText('Instances and sessions');
    expect(await within(nav).findByTitle('Attached here')).toBeTruthy();
    expect(session.detach).not.toHaveBeenCalled();
  });

  it('ignores stale session-list responses after switching instances (#1740)', async () => {
    const session = stubSession({ attached: false, role: null, url: null });
    let resolveInst1: (value: Response) => void = () => {};
    const inst1Sessions = new Promise<Response>((resolve) => { resolveInst1 = resolve; });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE, INSTANCE_NEXT] });
      if (url.includes('instance=inst-1')) return inst1Sessions;
      if (url.includes('instance=inst-2')) return jsonResponse({
        sessions: [{ id: 'sess-2', session_name: 'terminal-two', instance_id: 'inst-2', attach_url: 'ws://x/agents/inst-2/sessions/sess-2/attach', mode: 'managed', backend: 'tmux' }],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} refreshMs={60_000} />);

    fireEvent.click(await screen.findByText('docker-two'));
    const nav = screen.getByLabelText('Instances and sessions');
    expect(await within(nav).findByTitle('sess-2')).toBeTruthy();

    resolveInst1(jsonResponse({
      sessions: [{ id: 'sess-1', session_name: 'terminal-one', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-1/attach', mode: 'managed', backend: 'tmux' }],
    }));

    await waitFor(() => expect(within(nav).queryByText('terminal-one')).toBeNull());
    expect(within(nav).getByText('terminal-two')).toBeTruthy();
  });

  it('requires two consecutive missing polls before detaching the attached session (#1740)', async () => {
    const session = stubSession();
    const sessionResponses = [
      [{ id: 'sess-1', session_name: 'terminal-main', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-1/attach', mode: 'managed', backend: 'tmux' }],
      [{ id: 'sess-1', session_name: 'terminal-main', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-1/attach', mode: 'managed', backend: 'tmux' }],
      [{ id: 'sess-other', session_name: 'terminal-other', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-other/attach', mode: 'managed', backend: 'tmux' }],
      [{ id: 'sess-other', session_name: 'terminal-other', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-other/attach', mode: 'managed', backend: 'tmux' }],
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({ sessions: sessionResponses.shift() ?? sessionResponses[sessionResponses.length - 1] ?? [] });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} refreshMs={250} />);
    expect(await screen.findByTitle('sess-other')).toBeTruthy();
    expect(session.detach).not.toHaveBeenCalled();

    await waitFor(() => expect(session.detach).toHaveBeenCalledTimes(1), { timeout: 1_200 });
  });

  it('reattaches with replay instead of downgrading when re-selecting the session already attached', async () => {
    const session = stubSession(); // state.url === .../sessions/sess-1/attach, role controller
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [{ id: 'sess-1', session_name: 'terminal-main', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-1/attach', mode: 'managed', backend: 'tmux' }],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    const nav = screen.getByLabelText('Instances and sessions');
    fireEvent.click(await within(nav).findByTitle('sess-1'));
    // Clicking the session we already drive replays/reasserts controller; it
    // must not downgrade us back to observer.
    expect(session.attach).not.toHaveBeenCalled();
    expect(session.replay).toHaveBeenCalledWith('ws://x/agents/inst-1/sessions/sess-1/attach', 'controller', { instanceId: 'inst-1', sessionId: 'sess-1' });
  });

  it('distinguishes sessions by name + backend + viewer count in the nav (#1670)', async () => {
    const session = stubSession();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [
          { id: 'sess-a', session_name: 'terminal-alpha', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-a/attach', session_class: 'managed', session_backend: 'tmux', membership: { controllers: ['c1'], observers: ['o1'], attachment_count: 2 } },
          { id: 'sess-b', session_name: 'terminal-beta', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-b/attach', session_class: 'direct', session_backend: 'native', membership: { controllers: [], observers: [], attachment_count: 0 } },
        ],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    // Two distinct sessions, each shown by name with its own backend/viewer meta.
    // Scope to the nav — the controls bar's active-session indicator echoes the label.
    await screen.findByText('terminal-beta');
    const nav = screen.getByLabelText('Instances and sessions');
    expect(within(nav).getByText('terminal-alpha')).toBeTruthy();
    expect(within(nav).getByText('terminal-beta')).toBeTruthy();
    expect(within(nav).getByText('managed/tmux · 2 viewers')).toBeTruthy();
    expect(within(nav).getByText('direct/native · 0 viewers')).toBeTruthy();
    // sess-a has a controller connected → it carries the ctrl badge; sess-b does not.
    expect(within(nav).getByTitle('A controller is connected')).toBeTruthy();
  });

  it('shows registry unread and response-needed badges and clears unread on view', async () => {
    const session = stubSession({ attached: false, role: null, url: null });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [
          { id: 'sess-a', session_name: 'terminal-alpha', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-a/attach', session_class: 'managed', session_backend: 'tmux' },
          { id: 'sess-b', session_name: 'terminal-beta', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-b/attach', session_class: 'managed', session_backend: 'tmux' },
        ],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    const nav = screen.getByLabelText('Instances and sessions');
    const beta = await within(nav).findByTitle('sess-b');
    act(() => updateRegistrySessionSnapshot('inst-1', 'sess-b', 'Deploy to prod? [y/N]\n'));

    expect(await within(nav).findByTitle('Unread output')).toBeTruthy();
    expect(within(nav).getByTitle('Response needed')).toBeTruthy();

    fireEvent.click(beta);
    await waitFor(() => expect(within(nav).queryByTitle('Unread output')).toBeNull());
    expect(within(nav).getByTitle('Response needed')).toBeTruthy();
  });

  it('omits viewer counts when the session source does not provide membership fields (#1745)', async () => {
    const session = stubSession();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [INSTANCE] });
      if (url.includes('/api/sessions?instance=')) return jsonResponse({
        sessions: [
          { id: 'sess-bare', session_name: 'terminal-bare', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-bare/attach', session_class: 'managed', session_backend: 'tmux' },
          { id: 'sess-rich', session_name: 'terminal-rich', instance_id: 'inst-1', attach_url: 'ws://x/agents/inst-1/sessions/sess-rich/attach', session_class: 'managed', session_backend: 'tmux', membership: { controllers: ['c1'], observers: ['o1'], attachment_count: 2 } },
        ],
      });
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Sessions session={session} composer="" setComposer={() => {}} onRequestStart={() => {}} />);

    await screen.findByText('terminal-rich');
    const nav = screen.getByLabelText('Instances and sessions');
    expect(within(nav).getAllByText('managed/tmux')).toHaveLength(1);
    expect(within(nav).getByText('managed/tmux · 2 viewers')).toBeTruthy();
    expect(within(nav).getByTitle('A controller is connected')).toBeTruthy();
    expect(within(nav).queryByText('0 viewers')).toBeNull();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
