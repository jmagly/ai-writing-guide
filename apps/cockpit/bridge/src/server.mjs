#!/usr/bin/env node
// AIWG Cockpit Bridge.
// Reads instance inventory from an agentic-sandbox executor admin surface and
// serves a minimal screen. This is the first end-to-end data path:
//   executor (admin REST) -> Bridge (/api/inventory) -> screen.
// Real Bridge grows: registry/discover/index binding, per-instance A2A, pty I/O,
// per-launch token + OS-keychain (roctinam/aiwg#1595).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, chmod, readdir, cp, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
// Primary seam for roctinam/aiwg#1589: Cockpit talks to a real agentic-sandbox
// executor via this URL. MOCK_URL remains as a compatibility alias for older
// scripts/tests that predate agentic-sandbox#460/#461.
const EXECUTOR_URL =
  process.env.AIWG_COCKPIT_EXECUTOR_URL ??
  process.env.EXECUTOR_URL ??
  process.env.MOCK_URL ??
  'http://127.0.0.1:8122';
const RUNTIME_DIR = join(homedir(), '.aiwg', 'cockpit', 'runtime');
// The built React app (apps/cockpit/web/dist). Served when present; falls back to the
// legacy vanilla page so the Bridge works even before a web build.
const WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' };

/** Serve a static file from the built web app, sandboxed to WEB_DIST. Returns true if served. */
async function serveDistFile(res, relPath) {
  const safe = join(WEB_DIST, relPath.replace(/^\/+/, ''));
  if (!safe.startsWith(WEB_DIST) || !existsSync(safe)) return false;
  // content-hashed assets are safe to cache forever
  res.writeHead(200, { 'content-type': MIME[extname(safe)] ?? 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' });
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
// --- user asset library (#1591/#1593): the operator's OWN copied/cloned/imported
// assets, on disk under ~/.aiwg/cockpit/library. AIWG install files are NEVER written
// (clone reads the catalog read-only, writes only into the library). ---
const LIBRARY_DIR = join(homedir(), '.aiwg', 'cockpit', 'library');
/** Resolve a name to a path INSIDE the library, or null if it would escape. */
function inLibrary(name) {
  const r = join(LIBRARY_DIR, String(name).replace(/^[/\\]+/, ''));
  return r === LIBRARY_DIR || r.startsWith(LIBRARY_DIR + '/') ? r : null;
}
async function listLibrary() {
  let entries;
  try { entries = await readdir(LIBRARY_DIR, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    let meta = { name: e.name, kind: e.isDirectory() ? 'dir' : 'file', type: 'unknown', origin: 'imported' };
    if (e.isDirectory()) {
      try { meta = { ...meta, ...JSON.parse(await readFile(join(LIBRARY_DIR, e.name, '.cockpit-origin.json'), 'utf8')), name: e.name, kind: 'dir' }; } catch { /* no manifest */ }
    }
    out.push(meta);
  }
  return out;
}
/** Clone a catalog asset (skill dir or single file) into the library — never the reverse. */
async function cloneToLibrary({ type, name, path }) {
  if (!type || !name || !path) throw new Error('type, name, path required');
  if (!existsSync(path)) throw new Error('source not found');
  await mkdir(LIBRARY_DIR, { recursive: true, mode: 0o755 });
  const destName = String(name).replace(/[^a-z0-9._-]/gi, '-');
  const isDir = /SKILL\.(md|markdown)$/i.test(basename(path)) || (await stat(path)).isDirectory();
  const src = /SKILL\.(md|markdown)$/i.test(basename(path)) ? dirname(path) : path;
  if (isDir) {
    const dest = inLibrary(destName);
    if (!dest || existsSync(dest)) throw new Error(`already in library: ${destName}`);
    await cp(src, dest, { recursive: true });
    await writeFile(join(dest, '.cockpit-origin.json'), JSON.stringify({ name: destName, type, origin: 'aiwg-catalog', kind: 'dir', source_path: path, cloned_at: new Date().toISOString() }, null, 2), { mode: 0o644 });
    return { name: destName, type, kind: 'dir' };
  }
  const dest = inLibrary(destName + (extname(path) || '.md'));
  if (!dest || existsSync(dest)) throw new Error(`already in library: ${destName}`);
  await cp(src, dest);
  return { name: basename(dest), type, kind: 'file' };
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

async function fetchJsonFirst(candidates, { method = 'GET' } = {}) {
  const failures = [];
  for (const candidate of candidates) {
    const target = typeof candidate === 'string' ? candidate : candidate.target;
    const requestMethod = typeof candidate === 'string' ? method : candidate.method ?? method;
    let r;
    try {
      r = await fetch(target, { method: requestMethod });
    } catch (err) {
      failures.push(`${target} -> ${String(err?.message ?? err)}`);
      continue;
    }
    const body = await r.json().catch(() => ({}));
    if (r.ok) return { target, status: r.status, body };
    failures.push(`${target} -> ${r.status}`);
    if (r.status !== 404 && r.status !== 405) return { target, status: r.status, body, failures };
  }
  throw new Error(failures.join('; ') || 'no upstream candidates');
}

async function proxyFirst(res, candidates, options) {
  try {
    const { status, body } = await fetchJsonFirst(candidates, options);
    return json(res, status, body);
  } catch (err) {
    return json(res, 502, { error: 'bridge_upstream_error', message: String(err?.message ?? err) });
  }
}

function asArrayFromEnvelope(body, keys) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(body[key])) return body[key];
  }
  if (body.data && typeof body.data === 'object') {
    for (const key of keys) {
      if (Array.isArray(body.data[key])) return body.data[key];
    }
  }
  return [];
}

function normalizeRuntimePosture(kind) {
  const runtime = String(kind || 'unknown').toLowerCase();
  if (runtime === 'host') return {
    kind: runtime,
    isolation: 'least',
    label: 'Host / full host access',
    warning: 'Least isolated tier: this agent runs with direct host access.',
  };
  if (runtime === 'container' || runtime === 'docker') return {
    kind: runtime,
    isolation: 'shared-kernel',
    label: 'Container / shared kernel',
    warning: 'Container isolation shares the host kernel.',
  };
  if (runtime === 'vm') return { kind: runtime, isolation: 'strong', label: 'VM / hardware boundary' };
  if (runtime === 'unknown') return { kind: runtime, isolation: 'unknown', label: 'Unknown runtime', warning: 'Runtime metadata was not reported by the sandbox.' };
  return {
    kind: runtime,
    isolation: 'opaque',
    label: `${runtime} / opaque runtime`,
    warning: 'Future or unrecognized runtime kind; Cockpit is rendering it conservatively.',
  };
}

function normalizeHostDaemon(status, runtime) {
  const raw = status && typeof status === 'object' ? status : {};
  const value = String(raw.status ?? (runtime === 'host' ? 'unknown' : 'unavailable')).toLowerCase();
  const allowed = new Set(['detected', 'available', 'unavailable', 'permission_denied', 'degraded', 'stopped', 'unknown']);
  return {
    status: allowed.has(value) ? value : 'unknown',
    detail: raw.detail ?? (runtime === 'host' ? 'Host daemon status was not reported.' : 'Not applicable for this runtime tier.'),
    operator_command: raw.operator_command,
  };
}

function normalizeTransport(posture) {
  const raw = posture && typeof posture === 'object' ? posture : {};
  const mode = String(raw.mode ?? 'unknown');
  const trust = String(raw.trust ?? '').toLowerCase();
  const normalizedTrust = ['secure', 'local', 'compatibility', 'degraded', 'unknown'].includes(trust) ? trust : (
    /mtls|local-ca|client-cert/i.test(mode) ? 'secure' :
    /shared-secret|tofu|legacy/i.test(mode) ? 'compatibility' :
    /loopback|uds|vsock/i.test(mode) ? 'local' :
    'unknown'
  );
  const labels = {
    secure: 'Secure transport',
    local: 'Local transport',
    compatibility: 'Legacy compatibility',
    degraded: 'Degraded transport',
    unknown: 'Unknown transport',
  };
  return {
    mode,
    trust: normalizedTrust,
    label: labels[normalizedTrust],
    source: raw.source ?? 'agentic-sandbox metadata',
    evidence: raw.evidence,
    stale: Boolean(raw.stale),
  };
}

function normalizeSessionBackends(backends) {
  const list = Array.isArray(backends) ? backends : [];
  if (!list.length) return [{ mode: 'direct', backend: 'native', observe: true, drive: false, replay: false, keyframe: false, available: false, reason: 'sandbox did not advertise session-host capabilities' }];
  return list.map((b) => ({
    mode: b.mode === 'managed' ? 'managed' : 'direct',
    backend: String(b.backend || (b.mode === 'managed' ? 'tmux' : 'native')),
    replay: Boolean(b.replay),
    keyframe: Boolean(b.keyframe),
    drive: Boolean(b.drive),
    observe: b.observe !== false,
    available: b.available !== false,
    reason: b.reason,
  }));
}

function normalizeInstance(executorUrl, i) {
  const runtimeValue = i.runtime_kind ?? i.runtime?.kind ?? i.runtime ?? i.runtime_tier ?? i.isolation?.runtime ?? 'unknown';
  const runtime = String(runtimeValue);
  const runtimePosture = normalizeRuntimePosture(runtime);
  const id = i.instance_id ?? i.instanceId ?? i.agent_instance_id ?? i.id;
  return {
    id,
    runtime,
    loadout: i.loadout ?? i.launch_context?.loadout ?? i.launchContext?.loadout ?? 'unknown',
    state: i.state ?? i.status ?? 'unknown',
    tenant: i.tenant_id ?? i.tenant ?? i.tenantId ?? 'default',
    card_url: i.card_url ?? i.cardUrl ?? `${executorUrl}/agents/${encodeURIComponent(id)}/.well-known/agent-card.json`,
    runtime_posture: runtimePosture,
    host_daemon: normalizeHostDaemon(i.host_daemon ?? i.hostDaemon, runtimePosture.kind),
    transport: normalizeTransport(i.transport ?? i.transport_posture ?? i.security_posture ?? i.security?.transport),
    launch_context: {
      cwd: i.launch_context?.cwd ?? i.launchContext?.cwd ?? i.cwd,
      loadout: i.launch_context?.loadout ?? i.launchContext?.loadout ?? i.loadout,
      runtime_kind: i.launch_context?.runtime_kind ?? i.launchContext?.runtimeKind ?? runtime,
      host: i.launch_context?.host ?? i.launchContext?.host ?? i.host_metadata?.hostname ?? i.hostMetadata?.hostname,
      selected_tier: i.launch_context?.selected_tier ?? i.launchContext?.selectedTier ?? i.operator_selected_tier ?? i.operatorSelectedTier ?? runtime,
    },
    session_backends: normalizeSessionBackends(i.session_backends ?? i.sessionBackends ?? i.session_host?.backends ?? i.sessionHost?.backends ?? i.capabilities?.session_backends ?? i.capabilities?.sessionBackends),
  };
}

/** Normalize the executor's admin inventory into the Bridge's UI shape. */
async function getInventory(executorUrl) {
  const { target, body } = await fetchJsonFirst([
    `${executorUrl}/admin/instances`,
    `${executorUrl}/api/v2/admin/instances`,
  ]);
  const instances = asArrayFromEnvelope(body, ['instances', 'items', 'data']);
  const normalized = instances.map((i) => normalizeInstance(executorUrl, i));
  return {
    source: executorUrl,
    admin_path: new URL(target).pathname,
    fetched_at: new Date().toISOString(),
    count: normalized.length,
    instances: normalized,
  };
}

/** Running tasks across all instances (the running-agents board). */
async function getRunning(executorUrl) {
  const { body } = await fetchJsonFirst([
    `${executorUrl}/admin/running`,
    `${executorUrl}/api/v2/admin/running`,
  ]);
  const running = asArrayFromEnvelope(body, ['running', 'tasks', 'items', 'data']);
  const byId = new Map((await getInventory(executorUrl)).instances.map((i) => [i.id, i]));
  return {
    source: executorUrl,
    fetched_at: new Date().toISOString(),
    count: running.length,
    running: running.map((t) => {
      const instanceId = t.instance_id ?? t.instanceId ?? t.agent_instance_id ?? t.agentInstanceId;
      const taskId = t.task_id ?? t.taskId ?? t.id;
      const inst = byId.get(instanceId);
      return {
        instance_id: instanceId,
        task_id: taskId,
        state: t.state ?? t.status ?? 'unknown',
        tenant: t.tenant ?? t.tenant_id ?? t.tenantId ?? 'default',
        runtime_posture: inst?.runtime_posture,
        transport: inst?.transport,
      };
    }),
  };
}

/**
 * Sessions for one instance, each with a direct attach_url. Control plane (this
 * list) goes through the Bridge; the data plane (the pty stream) connects direct
 * to the executor — masking differs per WS direction, so the Bridge issues the
 * URL rather than proxying frames.
 */
async function getSessions(executorUrl, instanceId) {
  const { body } = await fetchJsonFirst([
    `${executorUrl}/agents/${encodeURIComponent(instanceId)}/sessions`,
    `${executorUrl}/agents/${encodeURIComponent(instanceId)}/v1/sessions`,
  ]);
  const sessions = asArrayFromEnvelope(body, ['sessions', 'items', 'data']);
  const wsBase = executorUrl.replace(/^http/i, 'ws');
  return {
    instance_id: instanceId,
    sessions: sessions.map((s) => ({
      ...s,
      id: s.id ?? s.session_id ?? s.sessionId,
      instance_id: s.instance_id ?? s.instanceId ?? instanceId,
      attach_url: s.attach_url ?? s.attachUrl ?? `${wsBase}/agents/${encodeURIComponent(instanceId)}/sessions/${encodeURIComponent(s.id ?? s.session_id ?? s.sessionId)}/attach`,
    })),
  };
}

export function createBridge({ executorUrl = EXECUTOR_URL, mockUrl, token } = {}) {
  const upstreamUrl = mockUrl ?? executorUrl;
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
      if (url.pathname === '/api/inventory') return json(res, 200, await getInventory(upstreamUrl));
      if (url.pathname === '/api/running') return json(res, 200, await getRunning(upstreamUrl));
      if (url.pathname === '/api/sessions') {
        const inst = url.searchParams.get('instance');
        if (!inst) return json(res, 400, { error: 'instance_required' });
        return json(res, 200, await getSessions(upstreamUrl, inst));
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
      // user asset library — browse / clone-from-catalog / delete. AIWG install files
      // are never written; deletes are sandboxed to ~/.aiwg/cockpit/library.
      if (url.pathname === '/api/library' && req.method === 'GET') return json(res, 200, { library: await listLibrary() });
      if (url.pathname === '/api/library/clone' && req.method === 'POST') {
        try {
          return json(res, 201, await cloneToLibrary({
            type: url.searchParams.get('type'), name: url.searchParams.get('name'), path: url.searchParams.get('path'),
          }));
        } catch (e) { return json(res, 400, { error: 'clone_failed', detail: String(e?.message ?? e) }); }
      }
      {
        const lm = url.pathname.match(/^\/api\/library\/(.+)$/);
        if (lm && req.method === 'DELETE') {
          const target = inLibrary(decodeURIComponent(lm[1]));
          if (!target || target === LIBRARY_DIR || !existsSync(target)) return json(res, 404, { error: 'not_in_library' });
          await rm(target, { recursive: true, force: true });
          return json(res, 200, { removed: decodeURIComponent(lm[1]) });
        }
      }

      // contribution model — declarative UI extension (#1591). Actions INJECT a command
      // into an agentic session (client-side, over the pty WS); the Bridge does NOT run
      // them. See adr-cockpit-session-control-not-cli-runner.md.
      if (url.pathname === '/api/contributions') return json(res, 200, await loadContributions());
      // --- start a session (the onboarding primary verb): create + issue attach_url ---
      let m;
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/sessions$/)) && req.method === 'POST') {
        const id = decodeURIComponent(m[1]);
        const qs = new URLSearchParams();
        const mode = url.searchParams.get('mode'), backend = url.searchParams.get('backend');
        if (mode) qs.set('mode', mode);
        if (backend) qs.set('backend', backend);
        const { status, body } = await fetchJsonFirst([
          `${upstreamUrl}/agents/${encodeURIComponent(id)}/sessions${qs.size ? `?${qs}` : ''}`,
          `${upstreamUrl}/agents/${encodeURIComponent(id)}/v1/sessions${qs.size ? `?${qs}` : ''}`,
        ], { method: 'POST' });
        const wsBase = upstreamUrl.replace(/^http/i, 'ws');
        const sessionId = body.id ?? body.session_id ?? body.sessionId;
        return json(res, status, { ...body, id: sessionId, attach_url: body.attach_url ?? body.attachUrl ?? `${wsBase}/agents/${encodeURIComponent(id)}/sessions/${encodeURIComponent(sessionId)}/attach` });
      }

      // --- management surface (UC-012): lifecycle + task cancel ---
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/(start|stop)$/)) && req.method === 'POST')
        return proxyFirst(res, [
          `${upstreamUrl}/admin/instances/${encodeURIComponent(m[1])}/${m[2]}`,
          `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(m[1])}/${m[2]}`,
        ], { method: 'POST' });
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)$/)) && req.method === 'DELETE')
        return proxyFirst(res, [
          { target: `${upstreamUrl}/admin/instances/${encodeURIComponent(m[1])}`, method: 'DELETE' },
          { target: `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(m[1])}`, method: 'DELETE' },
          { target: `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(m[1])}/destroy`, method: 'POST' },
        ]);
      if ((m = url.pathname.match(/^\/api\/tasks\/([^/]+)\/([^/]+)\/cancel$/)) && req.method === 'POST')
        return proxy(res, 'POST', `${upstreamUrl}/agents/${encodeURIComponent(m[1])}/tasks/${encodeURIComponent(m[2])}:cancel`);

      // --- approval inbox (UC-009) + cost (UC-010) ---
      if (url.pathname === '/api/approvals' && req.method === 'GET')
        return proxy(res, 'GET', `${upstreamUrl}/admin/approvals?status=${encodeURIComponent(url.searchParams.get('status') || 'pending')}`);
      if ((m = url.pathname.match(/^\/api\/approvals\/([^/]+)$/)) && req.method === 'POST')
        return proxy(res, 'POST', `${upstreamUrl}/admin/approvals/${encodeURIComponent(m[1])}?decision=${encodeURIComponent(url.searchParams.get('decision') || '')}`);
      if (url.pathname === '/api/cost' && req.method === 'GET')
        return proxy(res, 'GET', `${upstreamUrl}/admin/cost`);

      if (url.pathname === '/api/health') return json(res, 200, { status: 'ok', executor_url: upstreamUrl });
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const distIndex = join(WEB_DIST, 'index.html');
        const src = existsSync(distIndex) ? distIndex : join(__dir, 'public', 'index.html');
        const raw = await readFile(src, 'utf8');
        // Inject the per-launch token so the same-origin app can call the gated API.
        const html = raw.replace('</head>', `<script>window.__COCKPIT_TOKEN__=${JSON.stringify(TOKEN)}</script>\n</head>`);
        // never cache the shell — it must always reference the latest hashed bundle
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
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
    console.log(`[cockpit-bridge] http://127.0.0.1:${port}  (executor ${EXECUTOR_URL})`);
    console.log(`  token written ${file} (mode 600) — open the URL in a browser or attach a shell`);
  });
}
