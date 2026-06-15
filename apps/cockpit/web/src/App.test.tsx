import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { App } from './App';

// Rendered-DOM coverage (the a11y assertions deferred from T2, and a guard against the
// "blank render" class of bug). The Welcome tab fetches inventory/running/approvals on
// mount, so fetch is stubbed.
beforeEach(() => {
  (window as unknown as { __COCKPIT_TOKEN__: string }).__COCKPIT_TOKEN__ = 'test-token';
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const u = String(input);
    if (u.includes('/api/inventory')) return ok({ count: 0, fetched_at: new Date(0).toISOString(), instances: [] });
    if (u.includes('/api/running')) return ok({ count: 0, running: [] });
    if (u.includes('/api/approvals')) return ok({ approvals: [] });
    return ok({});
  }) as typeof fetch;
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
