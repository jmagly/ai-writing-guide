// End-to-end data-path smoke: executor fixture (admin) -> Bridge (/api/inventory) -> served screen.
// Self-contained (own ports); no deps. Exits non-zero on failure.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createExecutor, DEFAULT_INSTANCE } from '../../mock-executor/src/server.mjs';
import { createBridge, localLibvirtFallbackAllowed, normalizeSessionRows } from './server.mjs';

const mock = createExecutor();
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const executorPort = mock.address().port;
const executorUrl = `http://127.0.0.1:${executorPort}`;

const bridge = createBridge({ executorUrl, allowMockExecutor: true });
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
  assert.equal(inv.count, 4, 'four demo instances');
  const ids = inv.instances.map((i) => i.id);
  assert.ok(ids.includes('550e8400-e29b-41d4-a716-446655440000'), 'default instance present');
  assert.equal(inv.instances.find((i) => i.runtime === 'host')?.runtime_posture.isolation, 'least', 'host is least-isolated');
  assert.equal(inv.instances.find((i) => i.runtime === 'wasm-edge')?.runtime_posture.isolation, 'opaque', 'future runtime is opaque');
  assert.equal(inv.instances.find((i) => i.transport?.mode === 'shared-secret')?.transport.trust, 'compatibility', 'legacy secret transport is compatibility posture');
  const i0 = inv.instances[0];
  for (const k of ['id', 'runtime', 'loadout', 'state', 'tenant', 'card_url', 'runtime_posture', 'host_daemon', 'transport', 'launch_context', 'session_backends']) assert.ok(k in i0, `field ${k}`);
  assert.equal(i0.storage?.persistent, true, 'storage persistence surfaced');
  assert.equal(i0.storage?.delete_on_destroy, true, 'storage delete-on-destroy surfaced');
  assert.ok(['vm', 'container', 'host', 'wasm-edge'].includes(i0.runtime), 'runtime kind');

  // A transient executor outage must not poison Bridge state or require a
  // Bridge restart. Every poll is a fresh upstream request, so the same Bridge
  // reports the gap and resumes inventory as soon as the executor returns.
  await new Promise((resolve) => mock.close(resolve));
  assert.equal((await f('/api/inventory')).status, 502, 'transient executor drop -> 502');
  await new Promise((resolve) => mock.listen(executorPort, '127.0.0.1', resolve));
  const recoveredInventory = await f('/api/inventory');
  assert.equal(recoveredInventory.status, 200, 'same Bridge resumes after executor returns');
  assert.equal((await recoveredInventory.json()).count, 4, 'recovered inventory is complete');

  // running board: seeded working tasks on the running instances
  const rr = await f("/api/running");
  assert.equal(rr.status, 200, 'running 200');
  const run = await rr.json();
  assert.ok(run.count >= 2, 'at least two running tasks seeded');
  for (const k of ['instance_id', 'task_id', 'state', 'tenant']) assert.ok(k in run.running[0], `running field ${k}`);
  for (const k of ['runtime_posture', 'transport']) assert.ok(k in run.running[0], `running posture field ${k}`);
  assert.equal(run.running[0].state, 'working', 'running task is working');

  // sessions: the demo pty session is listed with a Bridge-owned ws attach_url
  const sr = await f("/api/sessions?instance=550e8400-e29b-41d4-a716-446655440000");
  assert.equal(sr.status, 200, 'sessions 200');
  const sess = await sr.json();
  const demo = sess.sessions.find((s) => s.id === 'demo-shell');
  assert.ok(demo, 'demo-shell session present');
  assert.match(demo.attach_url, /^ws:\/\/.*\/api\/pty\/agents\/.*\/sessions\/demo-shell\/attach\/[A-Za-z0-9_-]+$/, 'ws attach_url shape');
  assert.ok(demo.liveness.replay_newest_seq >= 3, 'demo session has a seeded transcript');
  assert.equal(demo.session_class, 'direct', 'demo session class');
  assert.equal(demo.session_backend, 'native', 'demo session backend');
  assert.equal(demo.role_policy, 'observe-default', 'session role policy');

  const qemuDedup = normalizeSessionRows({
    executorUrl,
    instanceId: 'vm-1',
    sessionAgentId: 'vm-agent-name',
    sessions: [
      {
        id: 'sess-formal',
        session_id: 'sess-formal',
        command_id: 'cmd-real',
        session_name: 'terminal-qemu',
        command: '/bin/bash',
        has_screen: true,
      },
      {
        id: 'sess-formal',
        session_id: 'sess-formal',
        command_id: 'sess-formal',
        session_name: 'sess-formal',
        command: '/bin/bash -l',
        has_screen: false,
      },
    ],
  });
  assert.equal(qemuDedup.sessions.length, 1, 'QEMU formal session + fallback row dedupe to one session');
  assert.equal(qemuDedup.sessions[0].session_name, 'terminal-qemu', 'dedupe keeps the named screen-backed session');

  // missing instance param is a 400
  assert.equal((await f("/api/sessions")).status, 400, 'sessions requires instance');

  // loadout catalog passthrough — the start-session picker offers the full set (#1641)
  const lo = await (await f('/api/loadouts')).json();
  assert.ok(Array.isArray(lo.loadouts) && lo.loadouts.length >= 3, 'loadout catalog returned');
  assert.ok(lo.loadouts.every((l) => typeof l.id === 'string' && typeof l.label === 'string'), 'loadouts carry id+label');
  assert.ok(lo.loadouts.some((l) => l.id === 'security-audit'), 'catalog includes a non-default loadout');
  const gpuLoadout = lo.loadouts.find((l) => l.id === 'gpu-vfio');
  assert.ok(gpuLoadout?.runtime_options?.required_capabilities?.includes('device.vfio'), 'loadout runtime_options preserve VFIO requirement');
  assert.ok(gpuLoadout?.compatibility?.[0]?.excluded_capabilities?.includes('instance.restore'), 'loadout compatibility preserves fast-start exclusion');

  const caps = await (await f('/api/executor/capabilities')).json();
  assert.ok(caps.runtime_providers?.providers?.some((p) => p.provider === 'cloud-hypervisor'), 'runtime providers discovered');
  assert.ok(caps.runtime_providers.providers.find((p) => p.provider === 'cloud-hypervisor')?.capability_constraints?.[0]?.excludes?.includes('instance.restore'), 'provider VFIO constraint preserved');
  const hostProvider = caps.runtime_providers.providers.find((p) => p.provider === 'host');
  const dockerProvider = caps.runtime_providers.providers.find((p) => p.provider === 'docker');
  assert.ok(hostProvider?.platforms?.includes('darwin/arm64'), 'Apple Silicon host runtime discovery is proxied');
  assert.equal(hostProvider?.posture?.host_architecture, 'arm64', 'Apple Silicon host architecture is preserved');
  assert.equal(dockerProvider?.engine, 'Docker Desktop', 'Docker Desktop runtime posture is proxied');
  assert.equal(dockerProvider?.posture?.host_platform, 'darwin', 'Docker Desktop host platform is preserved');
  assert.equal(localLibvirtFallbackAllowed('darwin', undefined), false, 'virsh fallback is not automatic on macOS');
  assert.equal(localLibvirtFallbackAllowed('darwin', '1'), true, 'virsh fallback can be explicitly enabled for local development');
  assert.equal(localLibvirtFallbackAllowed('linux', undefined), true, 'Linux bridge hosts retain local virsh fallback');

  const mcp = await (await f('/api/mcp/discovery')).json();
  assert.equal(mcp.enabled, true, 'MCP discovery enabled');
  assert.equal(mcp.endpoint?.path, '/mcp', 'MCP endpoint path surfaced');
  assert.equal(mcp.endpoint?.mcp_session_id, false, 'MCP discovery is stateless/no session id');
  assert.ok(mcp.tools.some((tool) => tool.name === 'list_sandboxes'), 'MCP tools surfaced');
  assert.ok(mcp.resource_templates.some((template) => template.uriTemplate === 'sandbox://sessions/{session_id}/screen'), 'MCP resource templates surfaced');
  assert.equal((await f('/api/mcp', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })).status, 503, 'MCP proxy fail-closed without token file');
  const gatedReconnect = await f(`/api/instances/${DEFAULT_INSTANCE}/reconnect`, { method: 'POST' });
  assert.equal(gatedReconnect.status, 409, 'Docker reconnect fallback is gated unless local dev flag is set');
  assert.equal((await gatedReconnect.json()).error, 'local_docker_fallback_disabled', 'Docker reconnect fallback error is explicit');

  // registry binding: discover + show through the aiwg CLI (#1592)
  const cap = await (await f("/api/capabilities?q=" + encodeURIComponent("deploy production") + "&limit=4")).json();
  assert.ok(Array.isArray(cap.results) && cap.results.length >= 1, 'discover returns results');
  const hit = cap.results.find((r) => r.name === 'flow-deploy-to-production');
  assert.ok(hit, 'flow-deploy-to-production discoverable');
  assert.ok(hit.name && hit.type, 'result carries name+type for show');
  const shown = await (await f("/api/show?type=skill&name=flow-deploy-to-production")).json();
  assert.match(shown.body, /name:\s*flow-deploy-to-production/, 'show returns the skill body');
  assert.equal((await f("/api/capabilities")).status, 400, 'capabilities requires q');
  // show by discovered PATH — deterministic, sidesteps ambiguous same-named artifacts (#1643)
  if (hit.path) {
    const shownByPath = await (await f(`/api/show?path=${encodeURIComponent(hit.path)}`)).json();
    assert.match(shownByPath.body, /name:\s*flow-deploy-to-production/, 'show-by-path returns the body');
    assert.equal(shownByPath.path, hit.path, 'show-by-path echoes the resolved path');
  } else {
    assert.ok(hit.id, 'pathless discover result carries a stable id');
  }
  // a missing artifact is a 4xx, never a 502 (ambiguous/not-found map to operator-correctable input)
  assert.equal((await f('/api/show?type=agent&name=__definitely_not_a_real_artifact__')).status, 404, 'unknown artifact -> 404 not 502');
  // a path outside the AIWG corpus is refused (no traversal)
  assert.equal((await f(`/api/show?path=${encodeURIComponent('/etc/passwd')}`)).status, 400, 'path outside corpus -> 400');

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
  assert.equal(pend.derived, 'per-instance A2A input-required tasks', 'approvals derive from A2A tasks');
  assert.ok(pend.approvals.length >= 1, 'pending approvals seeded');
  const approvalId = pend.approvals[0].id;
  const apr = await (await f(`/api/approvals/${encodeURIComponent(approvalId)}?decision=approve`, { method: 'POST' })).json();
  assert.equal(apr.status.state, 'completed', 'approval response completes the task');
  const pend2 = await (await f('/api/approvals?status=pending')).json();
  assert.equal(pend2.approvals.length, pend.approvals.length - 1, 'approved item leaves the queue');

  // cost rollup (UC-010)
  const cost = await (await f('/api/cost')).json();
  assert.ok(cost.total.usd > 0 && cost.per_instance.length >= 1, 'cost rollup present');

  // destroy
  assert.equal((await (await f(`/api/instances/${stoppedId}`, { method: 'DELETE' })).json()).destroyed, stoppedId, 'destroy returns id');

  // user asset library: clone a catalog asset into the library, list it, delete it.
  // (AIWG source is read-only — clone copies into ~/.aiwg/cockpit/library, never the reverse.)
  const libraryPath = hit.path || fileURLToPath(new URL('../../../../agentic/code/frameworks/sdlc-complete/skills/flow-deploy-to-production/SKILL.md', import.meta.url));
  const cloneRes = await f(`/api/library/clone?type=${encodeURIComponent(hit.type)}&name=${encodeURIComponent(hit.name)}&path=${encodeURIComponent(libraryPath)}`, { method: 'POST' });
  assert.ok([201, 400].includes(cloneRes.status), 'clone returns 201 (new) or 400 (already present)');
  const lib1 = await (await f('/api/library')).json();
  assert.ok(lib1.library.some((a) => a.name === hit.name), 'cloned asset appears in the user library');
  assert.equal((await f(`/api/library/${encodeURIComponent(hit.name)}`, { method: 'DELETE' })).status, 200, 'library delete 200');
  const lib2 = await (await f('/api/library')).json();
  assert.ok(!lib2.library.some((a) => a.name === hit.name), 'deleted asset removed from library');
  // a path that escapes the library is refused
  assert.equal((await f('/api/library/..%2f..%2fevil', { method: 'DELETE' })).status, 404, 'escape attempt refused');

  // start a session (onboarding primary verb): create + issue a ws attach_url
  const started = await (await f('/api/instances/550e8400-e29b-41d4-a716-446655440000/sessions', { method: 'POST' })).json();
  assert.match(started.id ?? '', /^sess-/, 'start-session returns a new session id');
  assert.match(started.attach_url ?? '', /\/sessions\/sess-[^/]+\/attach\/[A-Za-z0-9_-]+$/, 'start-session issues a proxied ws attach_url');

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

  console.log(`SMOKE OK — inventory(4) + running(${run.count}) + sessions(demo-shell) + mcp(${mcp.tools.length} tools) + registry(discover→${cap.results.length}) + contrib(${contrib.actions.length}) + shell(${shell})`);
} finally {
  bridge.close();
  mock.close();
}
