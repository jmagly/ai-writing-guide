// End-to-end data-path smoke: mock executor (admin) -> Bridge (/api/inventory) -> served screen.
// Self-contained (own ports); no deps. Exits non-zero on failure.
import assert from 'node:assert/strict';
import { createExecutor } from '../../mock-executor/src/server.mjs';
import { createBridge } from './server.mjs';

const mock = createExecutor();
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const mockUrl = `http://127.0.0.1:${mock.address().port}`;

const bridge = createBridge({ mockUrl });
await new Promise((r) => bridge.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${bridge.address().port}`;

try {
  // data path: Bridge reads the executor admin inventory
  const r = await fetch(`${base}/api/inventory`);
  assert.equal(r.status, 200, 'inventory 200');
  const inv = await r.json();
  assert.equal(inv.count, 3, 'three demo instances');
  const ids = inv.instances.map((i) => i.id);
  assert.ok(ids.includes('550e8400-e29b-41d4-a716-446655440000'), 'default instance present');
  const i0 = inv.instances[0];
  for (const k of ['id', 'runtime', 'loadout', 'state', 'tenant', 'card_url']) assert.ok(k in i0, `field ${k}`);
  assert.ok(['vm', 'container'].includes(i0.runtime), 'runtime kind');

  // the screen is served and references the data path
  const h = await fetch(`${base}/`);
  assert.equal(h.status, 200, 'index 200');
  const html = await h.text();
  assert.match(html, /AIWG.?Cockpit/i, 'screen renders Cockpit title');
  assert.match(html, /\/api\/inventory/, 'screen fetches the inventory API');

  console.log('SMOKE OK — data path: mock admin -> Bridge /api/inventory (3 instances) -> screen served');
} finally {
  bridge.close();
  mock.close();
}
