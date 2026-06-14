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

  // running board: seeded working tasks on the running instances
  const rr = await fetch(`${base}/api/running`);
  assert.equal(rr.status, 200, 'running 200');
  const run = await rr.json();
  assert.ok(run.count >= 2, 'at least two running tasks seeded');
  for (const k of ['instance_id', 'task_id', 'state', 'tenant']) assert.ok(k in run.running[0], `running field ${k}`);
  assert.equal(run.running[0].state, 'working', 'running task is working');

  // sessions: the demo pty session is listed with a direct ws attach_url
  const sr = await fetch(`${base}/api/sessions?instance=550e8400-e29b-41d4-a716-446655440000`);
  assert.equal(sr.status, 200, 'sessions 200');
  const sess = await sr.json();
  const demo = sess.sessions.find((s) => s.id === 'demo-shell');
  assert.ok(demo, 'demo-shell session present');
  assert.match(demo.attach_url, /^ws:\/\/.*\/agents\/.*\/sessions\/demo-shell\/attach$/, 'ws attach_url shape');
  assert.ok(demo.seq >= 3, 'demo session has a seeded transcript');

  // missing instance param is a 400
  assert.equal((await fetch(`${base}/api/sessions`)).status, 400, 'sessions requires instance');

  // the screen is served and references the three data paths
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /AIWG.?Cockpit/i, 'screen renders Cockpit title');
  for (const p of ['/api/inventory', '/api/running', '/api/sessions']) assert.ok(html.includes(p), `screen wires ${p}`);
  assert.match(html, /pty\.join_session/, 'screen drives the pty session protocol');

  console.log('SMOKE OK — data paths: inventory(3) + running(' + run.count + ') + sessions(demo-shell, ws attach) -> screen');
} finally {
  bridge.close();
  mock.close();
}
