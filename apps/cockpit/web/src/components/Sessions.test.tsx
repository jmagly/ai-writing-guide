import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { Sessions } from './Sessions';
import type { SessionApi } from '../useSession';

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

function stubSession(): SessionApi {
  return {
    state: { attached: true, role: 'controller', url: 'ws://x/agents/inst-1/sessions/sess-1/attach' },
    responseNeeded: { needed: false, prompt: '', since: null, source: 'pty' },
    attach: vi.fn(),
    detach: vi.fn(),
    replay: vi.fn(),
    requestKeyframe: vi.fn(),
    sendInput: vi.fn(),
    openTerminal: vi.fn(),
    isController: true,
  } as unknown as SessionApi;
}

beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 'test-token';
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
    expect(session.detach).toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
