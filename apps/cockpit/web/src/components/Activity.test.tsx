import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Activity } from './Activity';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const completeness = { complete: false, label: 'incomplete', collector_count: 1, sequence_gap_count: 1, durable_loss_count: 1, restart_count: 1, dropped_event_count: 2, stale_collector_count: 1, unsupported_event_classes: ['terminal.raw'], maximum_clock_error_ms: 25 };
const coverage = [{ collector_id: 'runtime', sequence_gaps: [{ first_missing_sequence: 2, last_missing_sequence: 2 }], durable_loss_records: [], restart_count: 1, dropped_event_count: 2, stale: true, unsupported_event_classes: ['terminal.raw'], maximum_clock_error_ms: 25 }];

it('fetches coverage before timeline and never hides incomplete evidence', async () => {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input) => {
    const url = String(input); calls.push(url);
    const body = url.includes('coverage') ? { schema_version: 'activity.event/v1', coverage, completeness } : { schema_version: 'activity.event/v1', coverage, completeness, events: [{ event_id: 'e1', event_name: 'process.started', plane: 'runtime', occurred_at: '2026-08-04T00:00:00Z', source: { collector: 'runtime', layer: 'host', trust: 'observed' }, outcome: { status: 'started' } }] };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  render(<Activity />);
  for (const [name, value] of [['tenant', 't'], ['host', 'h'], ['instance', 'i'], ['agent', 'a']]) fireEvent.change(screen.getByLabelText(name), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Load activity' }));
  expect(await screen.findByText('Incomplete coverage')).toBeTruthy();
  expect(screen.getByText(/gaps 1 · durable loss 1 · restarts 1 · dropped 2 · stale 1/)).toBeTruthy();
  expect(await screen.findByText('observed')).toBeTruthy();
  expect(calls.findIndex((url) => url.includes('coverage'))).toBeLessThan(calls.findIndex((url) => url.includes('timeline')));
});

it('renders export-unavailable without manufacturing evidence', async () => {
  globalThis.fetch = vi.fn(async (input) => {
    const url = String(input);
    if (url.includes('export')) return new Response(JSON.stringify({ error: 'activity_export_unavailable' }), { status: 503 });
    return new Response(JSON.stringify({ schema_version: 'activity.event/v1', coverage, completeness, events: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  render(<Activity />);
  for (const [name, value] of [['tenant', 't'], ['host', 'h'], ['instance', 'i'], ['agent', 'a']]) fireEvent.change(screen.getByLabelText(name), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Load activity' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /export signed/i })).not.toHaveProperty('disabled', true));
  fireEvent.click(screen.getByRole('button', { name: /export signed/i }));
  expect(await screen.findByText(/signing key is unavailable/i)).toBeTruthy();
});
