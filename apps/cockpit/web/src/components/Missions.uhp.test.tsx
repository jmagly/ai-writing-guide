import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Missions } from './Missions';

afterEach(() => vi.restoreAllMocks());

it('renders UHP-backed work as UHP rather than pretending it is A2A', async () => {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
    count: 1,
    sessions: [{
      id: 'remote', name: 'Remote harness', state: 'active', source: 'aiwg-mc',
      audit_count: 0, audit_tail: [],
      missions: [{
        id: 'm-uhp', session_id: 'remote', source: 'remote-harness', title: 'Remote task',
        status: 'running', terminal: false, transport: 'uhp', protocol_version: '2026-08-11',
        endpoint_profile: 'research', response_id: 'resp_fixture', remote_session_id: 'hsessfixture',
      }],
    }],
    missions: [{ id: 'm-uhp', session_id: 'remote', source: 'remote-harness', title: 'Remote task', status: 'running', terminal: false, transport: 'uhp' }],
  }), { headers: { 'content-type': 'application/json' } })) as typeof fetch;

  render(<Missions />);
  expect(await screen.findByText('Remote task')).toBeTruthy();
  expect(screen.getByText('UHP research · 2026-08-11')).toBeTruthy();
  expect(screen.queryByText(/A2A/)).toBeNull();
});
