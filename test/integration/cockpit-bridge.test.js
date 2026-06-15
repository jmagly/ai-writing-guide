// AIWG Cockpit — in-process integration + a11y coverage for CI.
// Exercises the Bridge control surface against the mock executor without shelling
// the aiwg CLI (registry endpoints are covered by the standalone bridge smoke), so
// this stays fast and deterministic in CI. Imports cockpit source directly (apps/
// cockpit is in the repo checkout though excluded from the published tarball).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createExecutor } from '../../apps/cockpit/mock-executor/src/server.mjs';
import { createBridge } from '../../apps/cockpit/bridge/src/server.mjs';

let mock, bridge, base, token;
const f = (p, o = {}) => fetch(base + p, { ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } });

beforeAll(async () => {
  mock = createExecutor();
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  bridge = createBridge({ mockUrl: `http://127.0.0.1:${mock.address().port}` });
  await new Promise((r) => bridge.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${bridge.address().port}`;
  token = bridge.cockpitToken;
});
afterAll(() => { bridge?.close(); mock?.close(); });

describe('cockpit Bridge — control surface', () => {
  it('gates /api with the per-launch token; /healthz is open', async () => {
    expect((await fetch(`${base}/api/inventory`)).status).toBe(401);
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    expect((await f('/api/inventory')).status).toBe(200);
  });

  it('serves inventory, running, and sessions with a ws attach_url', async () => {
    const inv = await (await f('/api/inventory')).json();
    expect(inv.count).toBe(3);
    const run = await (await f('/api/running')).json();
    expect(run.count).toBeGreaterThanOrEqual(2);
    const s = await (await f('/api/sessions?instance=550e8400-e29b-41d4-a716-446655440000')).json();
    expect(s.sessions.find((x) => x.id === 'demo-shell')?.attach_url).toMatch(/^ws:\/\/.*\/attach$/);
  });

  it('loads declarative contributions whose actions inject commands (no Bridge CLI run)', async () => {
    const c = await (await f('/api/contributions')).json();
    expect(c.sources.some((x) => x.id === 'aiwg-core')).toBe(true);
    const audit = c.actions.find((a) => a.id === 'audit-issues');
    expect(audit?.inject?.command).toMatch(/issue-audit/);
    // the spawn-aiwg action-run endpoint is gone
    expect((await f('/api/actions/audit-issues/run', { method: 'POST' })).status).toBe(404);
  });

  it('drives lifecycle, approvals (no flip), and cost', async () => {
    const id = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
    expect((await (await f(`/api/instances/${id}/start`, { method: 'POST' })).json()).state).toBe('running');
    expect((await (await f(`/api/instances/${id}/stop`, { method: 'POST' })).json()).state).toBe('stopped');
    expect((await (await f('/api/approvals/apr-001?decision=approve', { method: 'POST' })).json()).status).toBe('approved');
    expect((await f('/api/approvals/apr-001?decision=deny', { method: 'POST' })).status).toBe(409);
    expect((await (await f('/api/cost')).json()).total.usd).toBeGreaterThan(0);
  });
});

describe('cockpit web — app shell served', () => {
  let html;
  beforeAll(async () => { html = await (await fetch(base + '/')).text(); });

  it('declares a document language', () => expect(html).toMatch(/<html lang="en"/));
  it('renders the Cockpit title', () => expect(html).toMatch(/AIWG.?Cockpit/i));
  it('injects the per-launch token', () => expect(html).toContain(`window.__COCKPIT_TOKEN__=${JSON.stringify(token)}`));
  it('serves the built bundle when a React build is present', async () => {
    const m = html.match(/src="([^"]*assets\/[^"]+\.js)"/);
    if (m) expect((await fetch(base + m[1].replace(/^\.\//, '/'))).status).toBe(200);
    // a11y of the *rendered* UI is asserted by the React-render tests in T6 (jsdom);
    // the ARIA lives in the components (role/aria-* in the JSX), not the static shell.
  });
});
