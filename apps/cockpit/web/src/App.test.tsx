import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { App } from './App';

// Rendered-DOM coverage (the a11y assertions deferred from T2, and a guard against the
// "blank render" class of bug). The Welcome tab fetches inventory/running/approvals on
// mount, so fetch is stubbed.
beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 'test-token';
  window.history.replaceState({}, '', '/');
  globalThis.fetch = vi.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const TAB_LABELS = ['Home', 'Inventory', 'Running', 'Sessions', 'Approvals', 'Explore', 'Library', 'Actions'];

describe('App shell (rendered DOM)', () => {
  it('renders an ARIA tablist with all eight tabs', () => {
    render(<App />);
    expect(screen.getByRole('tablist', { name: /cockpit views/i })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(TAB_LABELS.length);
    for (const label of TAB_LABELS) expect(screen.getByRole('tab', { name: label })).toBeTruthy();
  });

  it('marks exactly one tab selected and the rest unselected', () => {
    render(<App />);
    const selected = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveProperty('id', 'tab-welcome');
  });

  it('exposes the Start a session primary verb', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /start a session/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('exposes additive host/docker/vm instance launch', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /launch instance/i }));
    expect(screen.getByRole('dialog', { name: /new instance/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Host' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Docker container' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'VM / QEMU' })).toBeTruthy();
    expect(screen.getByText(/existing instances and sessions keep running/i)).toBeTruthy();
    expect(screen.getByText(/start a session automatically/i)).toBeTruthy();
  });

  it('renders the welcome heading and its tabpanel (not blank)', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /work alongside your agents/i })).toBeTruthy();
    const panel = document.getElementById('panel-welcome');
    expect(panel?.hidden).toBe(false);
  });

  it('surfaces persistent bridge and executor status in global chrome', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return jsonResponse({ count: 2, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [{ id: 'approval-1', instance_id: 'host-1', prompt: 'Allow?', risk: 'medium', status: 'pending' }] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);

    expect(await screen.findByText('Bridge live')).toBeTruthy();
    expect(screen.getAllByText('http://127.0.0.1:8122').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 stacks')).toBeTruthy();
    expect(screen.getByText('2 running')).toBeTruthy();
    expect(screen.getByText('1 responses needed')).toBeTruthy();
    expect(screen.getByText(/host ✓ · docker - · vm -/)).toBeTruthy();
  });

  it('stays connected when the executor exposes no running/approvals admin surface (#1638)', async () => {
    // Real agentic-sandbox has no /running or /approvals admin route, so those
    // Bridge endpoints error. Inventory + health succeed. The header must stay
    // "Bridge live" and Home must bind inventory — not collapse to the
    // "No stack connected" / "Bridge checking" empty state.
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return errorResponse(502);
      if (url.includes('/api/approvals')) return errorResponse(404);
      if (url.includes('/api/cost')) return errorResponse(404);
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);

    // Header chrome stays live (enrichment failures degrade independently).
    expect(await screen.findByText('Bridge live')).toBeTruthy();
    expect(screen.getByText('1 stacks')).toBeTruthy();
    expect(screen.getByText('0 running')).toBeTruthy();
    expect(screen.getByText('0 responses needed')).toBeTruthy();
    // Home binds inventory and renders the operator wall, not the empty state.
    expect(await screen.findByRole('heading', { name: /eleven-stack operator wall/i })).toBeTruthy();
    expect(screen.queryByText(/no stack connected/i)).toBeNull();
  });

  it('renders the radial operator-wall topology from live status data', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({
        instances: [
          instance('host-1', 'host', 'Codex host'),
          instance('docker-1', 'container', 'Docker Codex'),
          instance('vm-1', 'vm', 'QEMU Codex'),
        ],
      });
      if (url.includes('/api/running')) return jsonResponse({ count: 1, running: [{ instance_id: 'host-1', task_id: 'task-abc', state: 'working', tenant: 'local' }] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [{ id: 'approval-1', instance_id: 'host-1', prompt: 'Allow?', risk: 'medium', status: 'pending' }] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 10, output_tokens: 20, usd: 0.42 }, per_instance: [] });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);

    expect(await screen.findByRole('heading', { name: /eleven-stack operator wall/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /start from cockpit command hub/i })).toBeTruthy();
    await waitFor(() => {
      expect(document.querySelectorAll('.orbit-node')).toHaveLength(11);
    });
    expect(screen.getByRole('button', { name: /codex host/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /docker codex/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /qemu codex/i })).toBeTruthy();
    expect(screen.getAllByText('3/3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('group', { name: /wall review mode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Topology' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Handoff' }));
    expect(screen.getByRole('button', { name: 'Handoff' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: /mission-handoff operator wall/i })).toBeTruthy();
    expect(screen.getByText('Source')).toBeTruthy();
    expect(screen.getByText('Destination')).toBeTruthy();
    expect(screen.getByRole('region', { name: /guided start and cost quota/i })).toBeTruthy();
    expect(screen.getByLabelText('Cost and quota')).toBeTruthy();
    expect(screen.getByText(/codex host \/ auto runtime \/ observe/i)).toBeTruthy();
    expect(screen.getAllByText('$0.42').length).toBeGreaterThanOrEqual(1);
  });

  it('exposes copy-command affordances beside contributed actions', async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/contributions')) return jsonResponse({
        actions: [{
          id: 'doctor',
          title: 'Run doctor',
          source: 'test',
          inject: { command: 'aiwg doctor' },
        }],
      });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }));
    fireEvent.click(await screen.findByRole('button', { name: /copy CLI command for run doctor/i }));

    expect(writeText).toHaveBeenCalledWith('aiwg doctor');
    await waitFor(() => expect(screen.getByText(/copied "aiwg doctor"/i)).toBeTruthy());
  });

  it('can open the mission-handoff review layout from a shareable URL', async () => {
    window.history.replaceState({}, '', '/?wall=handoff');
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({
        instances: [
          instance('host-1', 'host', 'Codex host'),
          instance('docker-1', 'container', 'Docker Codex'),
        ],
      });
      if (url.includes('/api/running')) return jsonResponse({ count: 1, running: [{ instance_id: 'host-1', task_id: 'task-abc', state: 'working', tenant: 'local' }] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);

    expect(await screen.findByRole('heading', { name: /mission-handoff operator wall/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Handoff' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Source')).toBeTruthy();
    expect(screen.getByText('Destination')).toBeTruthy();
  });

  it('treats stale destroy 404 responses as already removed in Inventory (#1660)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const inventory = { instances: [instance('ghost-vm-1', 'vm', 'QEMU Codex')], count: 1, fetched_at: new Date().toISOString() };
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse(inventory);
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/instances/ghost-vm-1') && init?.method === 'DELETE') {
        return jsonResponse({ destroyed: 'ghost-vm-1', already_gone: true, message: 'Instance ghost-vm-1 was already removed; inventory refreshed.' });
      }
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    fireEvent.click(await screen.findByRole('button', { name: /destroy instance ghost-vm-1/i }));

    expect((await screen.findByRole('status')).textContent).toMatch(/already removed; inventory refreshed/i);
    expect(screen.queryByText(/action failed/i)).toBeNull();
  });

  it('keeps Destroy enabled for a stopped Docker row so it can be cleaned up', async () => {
    const stale = { ...instance('stale-dkr-1', 'docker', 'full-suite'), state: 'stopped' };
    const inventory = { instances: [stale], count: 1, fetched_at: new Date().toISOString() };
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse(inventory);
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    const destroy = await screen.findByRole('button', { name: /destroy instance stale-dkr-1/i });
    // Previously hard-disabled for stopped Docker rows, which trapped stale
    // containers in inventory with no in-UI way to remove them.
    expect((destroy as HTMLButtonElement).disabled).toBe(false);
  });

  it('each tab has a matching labelled tabpanel (controls/labelledby pairing)', () => {
    render(<App />);
    for (const tab of screen.getAllByRole('tab')) {
      const panelId = tab.getAttribute('aria-controls')!;
      const panel = document.getElementById(panelId);
      expect(panel, `panel ${panelId} exists`).toBeTruthy();
      expect(panel!.getAttribute('aria-labelledby')).toBe(tab.id);
    }
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number): Response {
  return new Response(JSON.stringify({ error: 'unavailable' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function instance(id: string, kind: string, loadout: string) {
  return {
    id,
    runtime: kind,
    loadout,
    state: 'running',
    tenant: 'local',
    card_url: '',
    runtime_posture: { kind, isolation: kind === 'vm' ? 'strong' : 'shared-kernel', label: kind },
    host_daemon: { status: 'available' },
    transport: { mode: 'mtls', trust: 'secure', label: 'mTLS', source: 'test' },
    launch_context: {},
    session_backends: [{ mode: 'managed', backend: 'tmux', available: true, observe: true, drive: true }],
  };
}
