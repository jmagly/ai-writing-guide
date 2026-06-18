import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { App } from './App';

// Rendered-DOM coverage (the a11y assertions deferred from T2, and a guard against the
// "blank render" class of bug). The Welcome tab fetches inventory/running/approvals on
// mount, so fetch is stubbed.
beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 'test-token';
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

  it('renders the welcome heading and its tabpanel (not blank)', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /work alongside your agents/i })).toBeTruthy();
    const panel = document.getElementById('panel-welcome');
    expect(panel?.hidden).toBe(false);
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
    expect(screen.getByRole('region', { name: /guided start and cost quota/i })).toBeTruthy();
    expect(screen.getByLabelText('Cost and quota')).toBeTruthy();
    expect(screen.getByText(/codex host \/ auto runtime \/ observe/i)).toBeTruthy();
    expect(screen.getAllByText('$0.42').length).toBeGreaterThanOrEqual(1);
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
