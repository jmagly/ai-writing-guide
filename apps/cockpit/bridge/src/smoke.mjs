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
// authed fetch helper — every /api/ call carries the per-launch bearer token
const f = (p, o = {}) => fetch(base + p, { ...o, headers: { ...(o.headers || {}), authorization: 'Bearer ' + bridge.cockpitToken } });

try {
  // auth gate: /api/ without the token is 401; /healthz is open
  assert.equal((await fetch(`${base}/api/inventory`)).status, 401, 'gate: no token -> 401');
  assert.equal((await fetch(`${base}/api/inventory?token=wrong`)).status, 401, 'gate: bad token -> 401');
  assert.equal((await fetch(`${base}/healthz`)).status, 200, 'healthz open (no token)');

  // data path: Bridge reads the executor admin inventory
  const r = await f('/api/inventory');
  assert.equal(r.status, 200, 'inventory 200 (authed)');
  const inv = await r.json();
  assert.equal(inv.count, 3, 'three demo instances');
  const ids = inv.instances.map((i) => i.id);
  assert.ok(ids.includes('550e8400-e29b-41d4-a716-446655440000'), 'default instance present');
  const i0 = inv.instances[0];
  for (const k of ['id', 'runtime', 'loadout', 'state', 'tenant', 'card_url']) assert.ok(k in i0, `field ${k}`);
  assert.ok(['vm', 'container'].includes(i0.runtime), 'runtime kind');

  // running board: seeded working tasks on the running instances
  const rr = await f("/api/running");
  assert.equal(rr.status, 200, 'running 200');
  const run = await rr.json();
  assert.ok(run.count >= 2, 'at least two running tasks seeded');
  for (const k of ['instance_id', 'task_id', 'state', 'tenant']) assert.ok(k in run.running[0], `running field ${k}`);
  assert.equal(run.running[0].state, 'working', 'running task is working');

  // sessions: the demo pty session is listed with a direct ws attach_url
  const sr = await f("/api/sessions?instance=550e8400-e29b-41d4-a716-446655440000");
  assert.equal(sr.status, 200, 'sessions 200');
  const sess = await sr.json();
  const demo = sess.sessions.find((s) => s.id === 'demo-shell');
  assert.ok(demo, 'demo-shell session present');
  assert.match(demo.attach_url, /^ws:\/\/.*\/agents\/.*\/sessions\/demo-shell\/attach$/, 'ws attach_url shape');
  assert.ok(demo.seq >= 3, 'demo session has a seeded transcript');

  // missing instance param is a 400
  assert.equal((await f("/api/sessions")).status, 400, 'sessions requires instance');

  // registry binding: discover + show through the aiwg CLI (#1592)
  const cap = await (await f("/api/capabilities?q=" + encodeURIComponent("deploy production") + "&limit=4")).json();
  assert.ok(Array.isArray(cap.results) && cap.results.length >= 1, 'discover returns results');
  const hit = cap.results.find((r) => r.name === 'flow-deploy-to-production');
  assert.ok(hit, 'flow-deploy-to-production discoverable');
  assert.ok(hit.name && hit.type, 'result carries name+type for show');
  const shown = await (await f("/api/show?type=skill&name=flow-deploy-to-production")).json();
  assert.match(shown.body, /name:\s*flow-deploy-to-production/, 'show returns the skill body');
  assert.equal((await f("/api/capabilities")).status, 400, 'capabilities requires q');

  // contribution model: actions INJECT a command into a session — the Cockpit never
  // runs the CLI (adr-cockpit-session-control-not-cli-runner) (#1591)
  const contrib = await (await f("/api/contributions")).json();
  assert.ok(contrib.sources.some((s) => s.id === 'aiwg-core'), 'aiwg-core contribution loaded');
  const audit = contrib.actions.find((a) => a.id === 'audit-issues');
  assert.ok(audit && typeof audit.inject.command === 'string', 'audit-issues declares an inject command');
  assert.match(audit.inject.command, /issue-audit/, 'audit-issues injects the issue-audit command');
  // the spawn-aiwg run endpoint is removed
  assert.equal((await f("/api/actions/audit-issues/run", { method: 'POST' })).status, 404, 'action run endpoint gone (no Bridge CLI run for actions)');

  // management: lifecycle (UC-012)
  const stoppedId = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
  assert.equal((await (await f(`/api/instances/${stoppedId}/start`, { method: 'POST' })).json()).state, 'running', 'start -> running');
  assert.equal((await (await f(`/api/instances/${stoppedId}/stop`, { method: 'POST' })).json()).state, 'stopped', 'stop -> stopped');

  // management: cancel a running task
  const before = await (await f('/api/running')).json();
  const victim = before.running[0];
  assert.equal((await f(`/api/tasks/${victim.instance_id}/${victim.task_id}/cancel`, { method: 'POST' })).status, 200, 'task cancel 200');
  const after = await (await f('/api/running')).json();
  assert.ok(after.count < before.count, 'cancel removed a running task');

  // approval inbox (UC-009)
  const pend = await (await f('/api/approvals?status=pending')).json();
  assert.ok(pend.approvals.length >= 2, 'pending approvals seeded');
  const apr = await (await f('/api/approvals/apr-001?decision=approve', { method: 'POST' })).json();
  assert.equal(apr.status, 'approved', 'approval resolves to approved');
  const pend2 = await (await f('/api/approvals?status=pending')).json();
  assert.equal(pend2.approvals.length, pend.approvals.length - 1, 'approved item leaves the queue');

  // cost rollup (UC-010)
  const cost = await (await f('/api/cost')).json();
  assert.ok(cost.total.usd > 0 && cost.per_instance.length >= 1, 'cost rollup present');

  // destroy
  assert.equal((await (await f(`/api/instances/${stoppedId}`, { method: 'DELETE' })).json()).destroyed, stoppedId, 'destroy returns id');

  // start a session (onboarding primary verb): create + issue a ws attach_url
  const started = await (await f('/api/instances/550e8400-e29b-41d4-a716-446655440000/sessions', { method: 'POST' })).json();
  assert.match(started.id ?? '', /^sess-/, 'start-session returns a new session id');
  assert.match(started.attach_url ?? '', /\/sessions\/sess-[^/]+\/attach$/, 'start-session issues a ws attach_url');

  // app shell served with the per-launch token injected (React build if present, else
  // the legacy fallback — both carry the title + token)
  const html = await (await fetch(base + "/")).text();
  assert.match(html, /AIWG.?Cockpit/i, 'app title rendered');
  assert.ok(html.includes(`window.__COCKPIT_TOKEN__=${JSON.stringify(bridge.cockpitToken)}`), 'token injected into the served app');
  // strip HTML comments BEFORE matching — a module script trapped inside a comment
  // (the Vite '</head>'-in-comment gotcha) must not count as "referenced".
  const live = html.replace(/<!--[\s\S]*?-->/g, '');
  const shell = /assets\//.test(html) ? 'react' : 'legacy';
  if (shell === 'react') {
    const asset = live.match(/<script[^>]+type="module"[^>]+src="([^"]*assets\/[^"]+\.js)"/);
    assert.ok(asset, 'React build present → module bundle must be referenced outside comments');
    assert.equal((await fetch(base + asset[1].replace(/^\.\//, '/'))).status, 200, 'built React bundle served');
  }

  console.log(`SMOKE OK — inventory(3) + running(${run.count}) + sessions(demo-shell) + registry(discover→${cap.results.length}) + contrib(${contrib.actions.length}) + shell(${shell})`);
} finally {
  bridge.close();
  mock.close();
}
