#!/usr/bin/env node
// AIWG Cockpit Bridge — dev skeleton.
// Reads instance inventory from the agentic-sandbox (mock) admin surface and
// serves a minimal screen. This is the first end-to-end data path:
//   mock executor (admin REST) -> Bridge (/api/inventory) -> screen.
// Real Bridge grows: registry/discover/index binding, per-instance A2A, pty I/O,
// per-launch token + OS-keychain (roctinam/aiwg#1595).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, chmod, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MOCK_URL = process.env.MOCK_URL ?? 'http://127.0.0.1:8122';
const RUNTIME_DIR = join(homedir(), '.aiwg', 'cockpit', 'runtime');
// The built React app (apps/cockpit/web/dist). Served when present; falls back to the
// legacy vanilla page so the Bridge works even before a web build.
const WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' };

/** Serve a static file from the built web app, sandboxed to WEB_DIST. Returns true if served. */
async function serveDistFile(res, relPath) {
  const safe = join(WEB_DIST, relPath.replace(/^\/+/, ''));
  if (!safe.startsWith(WEB_DIST) || !existsSync(safe)) return false;
  res.writeHead(200, { 'content-type': MIME[extname(safe)] ?? 'application/octet-stream' });
  res.end(await readFile(safe));
  return true;
}
// First-party contribution manifests; AIWG-extension-sourced ones layer in via AIWG_COCKPIT_CONTRIB (#1591).
const CONTRIB_DIRS = [fileURLToPath(new URL('../../contrib', import.meta.url)), ...(process.env.AIWG_COCKPIT_CONTRIB ? [process.env.AIWG_COCKPIT_CONTRIB] : [])];

/** Constant-time bearer-token check (header or ?token=). */
function authed(req, url, token) {
  const hdr = String(req.headers['authorization'] ?? '');
  const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  const presented = bearer || url.searchParams.get('token') || '';
  if (presented.length !== token.length) return false;
  try { return timingSafeEqual(Buffer.from(presented), Buffer.from(token)); } catch { return false; }
}

/** Persist the per-launch token for the desktop/VS Code shells to read (mode 600). */
async function writeRuntimeToken({ token, port, pid }) {
  await mkdir(RUNTIME_DIR, { recursive: true, mode: 0o700 });
  const file = join(RUNTIME_DIR, 'bridge.json');
  await writeFile(file, JSON.stringify({ token, port, pid, started_at: new Date().toISOString() }, null, 2), { mode: 0o600 });
  await chmod(file, 0o600);
  return file;
}
// Repo-local aiwg bin: makes the registry binding work in dev + CI without a global install.
const REPO_BIN = fileURLToPath(new URL('../../../../bin/aiwg.mjs', import.meta.url));

// --- registry binding: the data-driven core shells out to the aiwg CLI (#1592) ---
function spawnCollect(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: process.cwd() }); // argv (no shell): args are not interpolated
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.once('error', reject);
    p.once('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err.trim() || `aiwg exit ${code}`))));
  });
}
async function runAiwg(args) {
  try { return await spawnCollect('aiwg', args); }
  catch (e) { if (e && e.code === 'ENOENT') return spawnCollect(process.execPath, [REPO_BIN, ...args]); throw e; }
}
/** The `aiwg show <type> <name>` slug for a discover result path. */
function deriveName(path) {
  const base = basename(path);
  if (/^SKILL\.(md|markdown)$/i.test(base)) return basename(dirname(path));
  return base.replace(/\.(md|markdown|ya?ml|json)$/i, '');
}

// --- UI contribution model (#1591): declarative screens/actions/event-hooks ---
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
/** Validate one contribution manifest. Throws with a precise message on bad shape. */
function validateContribution(m, where) {
  const fail = (msg) => { throw new Error(`${where}: ${msg}`); };
  if (!m || typeof m !== 'object') fail('manifest must be an object');
  if (!ID_RE.test(m.id || '')) fail('id must match [a-z0-9._-]{1,64}');
  if (typeof m.version !== 'string') fail('version (string) required');
  const c = m.contributes || {};
  for (const a of c.actions || []) {
    if (!ID_RE.test(a.id || '')) fail(`action.id invalid: ${a.id}`);
    if (typeof a.title !== 'string') fail(`action ${a.id}: title required`);
    // An action INJECTS a command into an agentic session — it does NOT run the CLI.
    if (!a.inject || typeof a.inject.command !== 'string') fail(`action ${a.id}: inject.command (string) required`);
    if (a.inject.target && !['focused', 'new'].includes(a.inject.target)) fail(`action ${a.id}: inject.target must be focused|new`);
  }
  for (const s of c.screens || []) { if (!ID_RE.test(s.id || '') || typeof s.source !== 'string') fail(`screen invalid: ${s.id}`); }
  for (const h of c.hooks || []) { if (typeof h.on !== 'string' || !ID_RE.test(h.action || '')) fail(`hook invalid: on=${h.on}`); }
  return m;
}
/** Load + validate + merge all contribution manifests across the configured dirs. */
async function loadContributions() {
  const sources = [], actions = [], screens = [], hooks = [];
  for (const dir of CONTRIB_DIRS) {
    let entries = [];
    try { entries = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'contribution.schema.json'); } catch { continue; }
    for (const file of entries) {
      const m = validateContribution(JSON.parse(await readFile(join(dir, file), 'utf8')), file);
      sources.push({ id: m.id, version: m.version, title: m.title ?? m.id, file });
      for (const a of m.contributes?.actions || []) actions.push({ ...a, source: m.id });
      for (const s of m.contributes?.screens || []) screens.push({ ...s, source: m.id });
      for (const h of m.contributes?.hooks || []) hooks.push({ ...h, source: m.id });
    }
  }
  return { sources, actions, screens, hooks };
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Forward a control-plane call to the executor admin surface, relaying status + body. */
async function proxy(res, method, target) {
  const r = await fetch(target, { method });
  const body = await r.json().catch(() => ({}));
  return json(res, r.status, body);
}

/** Normalize the executor's admin inventory into the Bridge's UI shape. */
async function getInventory(mockUrl) {
  const r = await fetch(`${mockUrl}/admin/instances`);
  if (!r.ok) throw new Error(`admin /instances -> ${r.status}`);
  const { instances } = await r.json();
  return {
    source: mockUrl,
    fetched_at: new Date().toISOString(),
    count: instances.length,
    instances: instances.map((i) => ({
      id: i.instance_id,
      runtime: i.runtime,
      loadout: i.loadout,
      state: i.state,
      tenant: i.tenant_id,
      card_url: `${mockUrl}/agents/${encodeURIComponent(i.instance_id)}/.well-known/agent-card.json`,
    })),
  };
}

/** Running tasks across all instances (the running-agents board). */
async function getRunning(mockUrl) {
  const r = await fetch(`${mockUrl}/admin/running`);
  if (!r.ok) throw new Error(`admin /running -> ${r.status}`);
  const { running } = await r.json();
  return {
    source: mockUrl,
    fetched_at: new Date().toISOString(),
    count: running.length,
    running: running.map((t) => ({ instance_id: t.instance_id, task_id: t.task_id, state: t.state, tenant: t.tenant })),
  };
}

/**
 * Sessions for one instance, each with a direct attach_url. Control plane (this
 * list) goes through the Bridge; the data plane (the pty stream) connects direct
 * to the executor — masking differs per WS direction, so the Bridge issues the
 * URL rather than proxying frames.
 */
async function getSessions(mockUrl, instanceId) {
  const r = await fetch(`${mockUrl}/agents/${encodeURIComponent(instanceId)}/sessions`);
  if (!r.ok) throw new Error(`/sessions -> ${r.status}`);
  const { sessions } = await r.json();
  const wsBase = mockUrl.replace(/^http/i, 'ws');
  return {
    instance_id: instanceId,
    sessions: sessions.map((s) => ({
      ...s,
      attach_url: `${wsBase}/agents/${encodeURIComponent(instanceId)}/sessions/${encodeURIComponent(s.id)}/attach`,
    })),
  };
}

export function createBridge({ mockUrl = MOCK_URL, token } = {}) {
  const TOKEN = token ?? randomBytes(24).toString('hex');
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    try {
      // unauthenticated liveness probe (no /api/ prefix) — for the shell to wait on
      if (url.pathname === '/healthz') return json(res, 200, { status: 'ok' });
      // gate the control surface: per-launch bearer token on every /api/ call
      if (url.pathname.startsWith('/api/') && !authed(req, url, TOKEN)) {
        return json(res, 401, { error: 'unauthorized', detail: 'missing or invalid cockpit token' });
      }
      if (url.pathname === '/api/inventory') return json(res, 200, await getInventory(mockUrl));
      if (url.pathname === '/api/running') return json(res, 200, await getRunning(mockUrl));
      if (url.pathname === '/api/sessions') {
        const inst = url.searchParams.get('instance');
        if (!inst) return json(res, 400, { error: 'instance_required' });
        return json(res, 200, await getSessions(mockUrl, inst));
      }
      // registry-bound, data-driven core — live, no app restart (#1592)
      if (url.pathname === '/api/capabilities') {
        const q = (url.searchParams.get('q') || '').trim();
        if (!q) return json(res, 400, { error: 'q_required' });
        const args = ['discover', q, '--json', '--limit', String(Number(url.searchParams.get('limit')) || 8)];
        const type = url.searchParams.get('type');
        if (type && type !== 'all') args.push('--type', type);
        const data = JSON.parse(await runAiwg(args));
        data.results = (data.results || []).map((r) => ({ ...r, name: deriveName(r.path) }));
        return json(res, 200, data);
      }
      if (url.pathname === '/api/show') {
        const type = url.searchParams.get('type'), name = url.searchParams.get('name');
        if (!type || !name) return json(res, 400, { error: 'type_and_name_required' });
        return json(res, 200, { type, name, body: await runAiwg(['show', type, name]) });
      }
      // contribution model — declarative UI extension (#1591). Actions INJECT a command
      // into an agentic session (client-side, over the pty WS); the Bridge does NOT run
      // them. See adr-cockpit-session-control-not-cli-runner.md.
      if (url.pathname === '/api/contributions') return json(res, 200, await loadContributions());
      // --- start a session (the onboarding primary verb): create + issue attach_url ---
      let m;
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/sessions$/)) && req.method === 'POST') {
        const id = decodeURIComponent(m[1]);
        const r = await fetch(`${mockUrl}/agents/${encodeURIComponent(id)}/sessions`, { method: 'POST' });
        const body = await r.json();
        const wsBase = mockUrl.replace(/^http/i, 'ws');
        return json(res, r.status, { ...body, attach_url: `${wsBase}/agents/${encodeURIComponent(id)}/sessions/${encodeURIComponent(body.id)}/attach` });
      }

      // --- management surface (UC-012): lifecycle + task cancel ---
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/(start|stop)$/)) && req.method === 'POST')
        return proxy(res, 'POST', `${mockUrl}/admin/instances/${encodeURIComponent(m[1])}/${m[2]}`);
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)$/)) && req.method === 'DELETE')
        return proxy(res, 'DELETE', `${mockUrl}/admin/instances/${encodeURIComponent(m[1])}`);
      if ((m = url.pathname.match(/^\/api\/tasks\/([^/]+)\/([^/]+)\/cancel$/)) && req.method === 'POST')
        return proxy(res, 'POST', `${mockUrl}/agents/${encodeURIComponent(m[1])}/tasks/${encodeURIComponent(m[2])}:cancel`);

      // --- approval inbox (UC-009) + cost (UC-010) ---
      if (url.pathname === '/api/approvals' && req.method === 'GET')
        return proxy(res, 'GET', `${mockUrl}/admin/approvals?status=${encodeURIComponent(url.searchParams.get('status') || 'pending')}`);
      if ((m = url.pathname.match(/^\/api\/approvals\/([^/]+)$/)) && req.method === 'POST')
        return proxy(res, 'POST', `${mockUrl}/admin/approvals/${encodeURIComponent(m[1])}?decision=${encodeURIComponent(url.searchParams.get('decision') || '')}`);
      if (url.pathname === '/api/cost' && req.method === 'GET')
        return proxy(res, 'GET', `${mockUrl}/admin/cost`);

      if (url.pathname === '/api/health') return json(res, 200, { status: 'ok', mock: mockUrl });
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const distIndex = join(WEB_DIST, 'index.html');
        const src = existsSync(distIndex) ? distIndex : join(__dir, 'public', 'index.html');
        const raw = await readFile(src, 'utf8');
        // Inject the per-launch token so the same-origin app can call the gated API.
        const html = raw.replace('</head>', `<script>window.__COCKPIT_TOKEN__=${JSON.stringify(TOKEN)}</script>\n</head>`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      // static assets from the built web app (e.g. /assets/*.js, *.css)
      if (req.method === 'GET' && !url.pathname.startsWith('/api/') && url.pathname !== '/healthz') {
        if (await serveDistFile(res, url.pathname)) return;
      }
      json(res, 404, { error: 'not_found', path: url.pathname });
    } catch (err) {
      json(res, 502, { error: 'bridge_upstream_error', message: String(err?.message ?? err) });
    }
  });
  server.cockpitToken = TOKEN; // exposed for shells/tests
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8120);
  const server = createBridge();
  server.listen(port, '127.0.0.1', async () => {
    const file = await writeRuntimeToken({ token: server.cockpitToken, port, pid: process.pid });
    console.log(`[cockpit-bridge] http://127.0.0.1:${port}  (reading ${MOCK_URL})`);
    console.log(`  token written ${file} (mode 600) — open the URL in a browser or attach a shell`);
  });
}
