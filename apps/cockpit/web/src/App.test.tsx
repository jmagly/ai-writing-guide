import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import { App, waitForSessionReady } from './App';

// Rendered-DOM coverage (the a11y assertions deferred from T2, and a guard against the
// "blank render" class of bug). The Welcome tab fetches inventory/running/approvals on
// mount, so fetch is stubbed.
beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 'test-token';
  window.history.replaceState({}, '', '/');
  globalThis.fetch = vi.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const TAB_LABELS = ['Home', 'Inventory', 'Running', 'Missions', 'Sessions', 'Approvals', 'Explore', 'Library', 'Telemetry', 'Memory', 'Actions'];

describe('App shell (rendered DOM)', () => {
  it('renders an ARIA tablist with all Cockpit tabs', () => {
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

  it('counts qemu and kvm instances as VM runtime coverage in the header (#1782)', async () => {
    for (const kind of ['qemu', 'kvm']) {
      cleanup();
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
        if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance(`${kind}-1`, kind, 'full-suite')] });
        if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
        if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
        if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
        return jsonResponse({});
      }) as typeof fetch;

      render(<App />);
      expect((await screen.findByTitle('Runtime target coverage')).textContent).toContain('vm ✓');
    }
  });

  it('does not bind launch session creation to the first unrelated running instance (#1743)', async () => {
    vi.useFakeTimers();
    try {
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/operations/op-1')) return jsonResponse({ id: 'op-1', state: 'running', result: { runtime: 'docker' } });
        if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('busy-existing', 'container', 'Existing stack')] });
        return jsonResponse({});
      }) as typeof fetch;

      const ready = waitForSessionReady(undefined, 'op-1');
      const rejection = expect(ready).rejects.toThrow(/waiting for launch operation to report instance id/i);
      for (let i = 0; i < 151; i += 1) await vi.advanceTimersByTimeAsync(1_000);
      await rejection;
      expect(globalThis.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/instances/busy-existing/sessions'), expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders durable Missions projection from aiwg mc state and live executor work', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return jsonResponse({ count: 1, running: [{ instance_id: 'host-1', task_id: 'task-abc', state: 'working', tenant: 'local' }] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/missions')) return jsonResponse({
        source: 'aiwg-mc + agentic-sandbox',
        fetched_at: new Date().toISOString(),
        count: 2,
        sessions: [{
          id: 'mc-1',
          name: 'Release hardening',
          state: 'active',
          source: 'aiwg-mc',
          audit_count: 1,
          audit_tail: [{ event: 'mission_dispatched', ts: '2026-07-04T12:00:00.000Z', missionId: 'm-1' }],
          missions: [{ id: 'm-1', session_id: 'mc-1', source: 'aiwg-mc', title: 'Finish cockpit', status: 'running', loop: 1, max_iterations: 5, terminal: false }],
        }, {
          id: 'executor-live',
          name: 'Executor live tasks',
          state: 'active',
          source: 'agentic-sandbox',
          audit_count: 0,
          audit_tail: [],
          missions: [{ id: 'host-1::task-abc', session_id: 'executor-live', source: 'executor-task', title: 'Task task-abc', status: 'working', instance_id: 'host-1', task_id: 'task-abc', terminal: false }],
        }],
        missions: [
          { id: 'm-1', session_id: 'mc-1', source: 'aiwg-mc', title: 'Finish cockpit', status: 'running', terminal: false },
          { id: 'host-1::task-abc', session_id: 'executor-live', source: 'executor-task', title: 'Task task-abc', status: 'working', terminal: false },
        ],
      });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Missions' }));

    expect((await screen.findAllByText('Release hardening')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Mission status summary').textContent).toContain('2 total');
    expect(screen.getByText('Finish cockpit')).toBeTruthy();
    expect(screen.getByText(/mission_dispatched/)).toBeTruthy();
  });

  it('renders Bridge-backed Telemetry from unified events and cost', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return jsonResponse({ count: 1, running: [{ instance_id: 'host-1', task_id: 'task-abc', state: 'working', tenant: 'local' }] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 1000, output_tokens: 2000, usd: 0.42 }, per_instance: [] });
      if (url.includes('/api/missions')) return jsonResponse({ count: 1, sessions: [], missions: [{ id: 'm-1', session_id: 'mc-1', source: 'aiwg-mc', title: 'Mission', status: 'completed', terminal: true }] });
      if (url.includes('/api/events/snapshot')) return jsonResponse({
        source: 'cockpit.unified-event-model/v1',
        fetched_at: new Date().toISOString(),
        count: 2,
          events: [
            { id: 'mission:m-1', type: 'mission.lifecycle', source: 'aiwg-mc', subject: 'm-1', state: 'completed', ts: new Date().toISOString() },
            { id: 'session:host-1:sess-1', type: 'session.lifecycle', source: 'pty-session', subject: 'sess-1', state: 'available', ts: new Date().toISOString() },
            { id: 'task:task-abc', type: 'task.lifecycle', source: 'a2a', subject: 'task-abc', state: 'working', ts: new Date().toISOString() },
          ],
      });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Telemetry' }));

    expect(await screen.findByText('cockpit.unified-event-model/v1')).toBeTruthy();
    expect(screen.getByText('$0.42')).toBeTruthy();
    expect(screen.getByText('mission.lifecycle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'session' }));
    expect(screen.getByText('session.lifecycle')).toBeTruthy();
  });

  it('renders local Memory and auto-notes terminal Missions', async () => {
    localStorage.clear();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/missions')) return jsonResponse({
        count: 1,
        sessions: [],
        missions: [{ id: 'm-done', session_id: 'mc-1', source: 'aiwg-mc', title: 'Closed release gate', status: 'completed', completed_at: '2026-07-04T12:00:00.000Z', terminal: true }],
      });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Memory' }));

    expect(await screen.findByText('Closed release gate')).toBeTruthy();
    expect(screen.getByText(/1 saved/i)).toBeTruthy();
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

  it('shows reconnecting and restores all live views after a transient drop without a page refresh (#1763)', async () => {
    vi.useFakeTimers();
    try {
      let executorAvailable = true;
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
        if (url.includes('/api/inventory')) {
          return executorAvailable
            ? jsonResponse({ count: 1, fetched_at: new Date().toISOString(), instances: [instance('host-1', 'host', 'Codex host')] })
            : errorResponse(502);
        }
        if (url.includes('/api/running')) return executorAvailable ? jsonResponse({ count: 1, running: [] }) : errorResponse(502);
        if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
        if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
        return jsonResponse({});
      }) as typeof fetch;

      render(<App />);
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(screen.getByText('Bridge live')).toBeTruthy();
      expect(screen.getByText('1 stacks')).toBeTruthy();
      const sessionCallsBeforeDrop = vi.mocked(globalThis.fetch).mock.calls
        .filter(([input]) => String(input).includes('/api/sessions?instance=')).length;

      executorAvailable = false;
      await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
      expect(screen.getByText('Reconnecting…')).toBeTruthy();
      expect(screen.getByTitle(/showing last-known status/i)).toBeTruthy();
      expect(screen.getByText('1 stacks')).toBeTruthy();

      executorAvailable = true;
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
      expect(screen.getByText('Bridge live')).toBeTruthy();
      expect(screen.queryByText('Reconnecting…')).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/running'), expect.anything());
      expect(vi.mocked(globalThis.fetch).mock.calls
        .filter(([input]) => String(input).includes('/api/sessions?instance=')).length).toBeGreaterThan(sessionCallsBeforeDrop);
    } finally {
      vi.useRealTimers();
    }
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
        screens: [{ id: 'index-live', title: 'Live Index', source: 'cockpit://index/live', contribution: 'test' }],
        workflows: [{
          id: 'maintenance-check',
          title: 'Maintenance Check',
          description: 'Run doctor through an agentic session.',
          source: 'test',
          steps: [{ action: 'doctor', label: 'Doctor' }],
        }],
      });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }));
    expect(await screen.findByText('Live Index')).toBeTruthy();
    expect(screen.getByText('Maintenance Check')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /copy CLI command for run doctor/i }));

    expect(writeText).toHaveBeenCalledWith('aiwg doctor');
    await waitFor(() => expect(screen.getByText(/copied "aiwg doctor"/i)).toBeTruthy());
  });

  it('renders live index status and query results in Explore', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse({ instances: [instance('host-1', 'host', 'Codex host')] });
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/index/status')) return jsonResponse({
        graphs: [{ name: 'project', origin: 'builtin', shared: false, defaultBuild: true, location: '.aiwg/.index/project', built: true, builtAt: '2026-07-04T12:00:00.000Z', ageHours: 1, entries: 42, missing: false }],
        orphanIndexDirs: [],
        warnings: [],
        summary: { total: 1, built: 1, missing: 0, orphans: 0, warnings: 0 },
      });
      if (url.includes('/api/index/query')) return jsonResponse({
        results: [{ path: '.aiwg/requirements/UC-001.md', title: 'Mission requirements', type: 'use-case', phase: 'requirements', summary: 'Operator workflow coverage', score: 0.91 }],
        total: 1,
      });
      return jsonResponse({});
    }) as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Explore' }));

    expect(await screen.findByText(/1\/1 graphs built/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/index query/i), { target: { value: 'mission' } });
    fireEvent.click(screen.getByRole('button', { name: /search index/i }));

    expect(await screen.findByText('Mission requirements')).toBeTruthy();
    expect(screen.getByText(/operator workflow coverage/i)).toBeTruthy();
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

  it('offers Reconnect for a running Docker row whose agent is not registered', async () => {
    const stale = {
      ...instance('stale-dkr-2', 'docker', 'full-suite'),
      agent_ready: false,
      session_backends: [{
        mode: 'managed',
        backend: 'tmux',
        available: false,
        observe: true,
        drive: true,
        reason: 'container is running but the agent has not registered; PTY sessions are not ready',
      }],
    };
    const inventory = { instances: [stale], count: 1, fetched_at: new Date().toISOString() };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse(inventory);
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/instances/stale-dkr-2/reconnect') && init?.method === 'POST') {
        return jsonResponse({ state: 'reconnecting', message: 'Reconnect requested for stale-dkr-2; inventory will refresh as the agent re-registers.' });
      }
      return jsonResponse({});
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(await screen.findByText('agent unreachable')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /reconnect agent for stale-dkr-2/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/instances/stale-dkr-2/reconnect'),
      expect.objectContaining({ method: 'POST' }),
    ));
    expect((await screen.findByRole('status')).textContent).toMatch(/reconnect requested/i);
  });

  it('offers Reconnect for a running VM row whose agent is not registered (#1778)', async () => {
    const staleVm = {
      ...instance('stale-vm-1', 'vm', 'full-suite'),
      agent_ready: false,
      session_backends: [{
        mode: 'managed',
        backend: 'tmux',
        available: false,
        observe: true,
        drive: true,
        reason: 'VM is running but the agent has not registered; PTY sessions are not ready',
      }],
    };
    const inventory = { instances: [staleVm], count: 1, fetched_at: new Date().toISOString() };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/health')) return jsonResponse({ executor_url: 'http://127.0.0.1:8122' });
      if (url.includes('/api/inventory')) return jsonResponse(inventory);
      if (url.includes('/api/running')) return jsonResponse({ count: 0, running: [] });
      if (url.includes('/api/approvals')) return jsonResponse({ approvals: [] });
      if (url.includes('/api/cost')) return jsonResponse({ total: { input_tokens: 0, output_tokens: 0, usd: 0 }, per_instance: [] });
      if (url.includes('/api/instances/stale-vm-1/reconnect') && init?.method === 'POST') {
        return jsonResponse({ state: 'reconnecting', message: 'Reconnect requested for VM stale-vm-1; inventory will refresh as the agent re-registers.' });
      }
      return jsonResponse({});
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(await screen.findByText('agent unreachable')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /reconnect agent for stale-vm-1/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/instances/stale-vm-1/reconnect'),
      expect.objectContaining({ method: 'POST' }),
    ));
    expect((await screen.findByRole('status')).textContent).toMatch(/reconnect requested/i);
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
