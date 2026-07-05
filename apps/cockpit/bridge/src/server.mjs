#!/usr/bin/env node
// AIWG Cockpit Bridge.
// Reads instance inventory from an agentic-sandbox executor admin surface and
// serves a minimal screen. This is the first end-to-end data path:
//   executor (admin REST) -> Bridge (/api/inventory) -> screen.
// Real Bridge grows: registry/discover/index binding, per-instance A2A, pty I/O,
// per-launch token + OS-keychain (roctinam/aiwg#1595).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, chmod, readdir, cp, rm, stat, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname, resolve, sep } from 'node:path';
import { storeCockpitToken } from '../../shell-core/keychain.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
// Primary seam for roctinam/aiwg#1589: Cockpit talks to a real agentic-sandbox
// executor via this URL. Mock executors are accepted only by explicit automated
// test opt-in, never by default dev/operator launch.
const EXECUTOR_URL =
  process.env.AIWG_COCKPIT_EXECUTOR_URL ??
  process.env.EXECUTOR_URL ??
  'http://127.0.0.1:8122';
const ALLOW_MOCK_EXECUTOR = process.env.AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR === '1';
const AUTOSTART_EXECUTOR = process.env.AIWG_COCKPIT_AUTOSTART_EXECUTOR !== '0';
const EXECUTOR_COMMAND = process.env.AIWG_COCKPIT_EXECUTOR_COMMAND ?? '';
const RUNTIME_DIR = join(homedir(), '.aiwg', 'cockpit', 'runtime');
const auditDir = () => process.env.AIWG_COCKPIT_AUDIT_DIR || join(homedir(), '.aiwg', 'cockpit', 'audit');
const auditLog = () => join(auditDir(), 'events.jsonl');
// The built React app (apps/cockpit/web/dist). Served when present; falls back to the
// legacy vanilla page so the Bridge works even before a web build.
const WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' };
const CAPABILITY_TYPES = new Set(['skill', 'agent', 'command', 'rule', 'flow']);
const mcSessionsDir = () => join(process.cwd(), '.aiwg', 'ralph-external', 'mc', 'sessions');

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

function isLocalHostName(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function validBrowserOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(String(origin));
    const host = new URL(`http://${req.headers.host ?? 'localhost'}`);
    return ['http:', 'https:'].includes(o.protocol) &&
      isLocalHostName(o.hostname) &&
      isLocalHostName(host.hostname) &&
      (!o.port || !host.port || o.port === host.port);
  } catch {
    return false;
  }
}

function validCsrf(req, token) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET')) return true;
  if (!req.headers.origin) return true;
  const csrf = String(req.headers['x-cockpit-csrf'] ?? '');
  if (csrf.length !== token.length) return false;
  try { return timingSafeEqual(Buffer.from(csrf), Buffer.from(token)); } catch { return false; }
}

/** Persist the per-launch token for the desktop/VS Code shells to read (mode 600). */
async function writeRuntimeToken({ token, port, pid }) {
  await mkdir(RUNTIME_DIR, { recursive: true, mode: 0o700 });
  const file = join(RUNTIME_DIR, 'bridge.json');
  const runtime = { token, port, pid, started_at: new Date().toISOString(), keychain_backed: false };
  const strict = process.env.AIWG_COCKPIT_KEYCHAIN_STRICT === '1';
  try {
    runtime.token_ref = await storeCockpitToken(token, `bridge-${pid}`);
    runtime.keychain_backed = true;
    if (strict) delete runtime.token;
  } catch (e) {
    runtime.keychain_error = String(e?.message ?? e);
    if (strict || process.env.AIWG_COCKPIT_REQUIRE_KEYCHAIN === '1') throw e;
  }
  await writeFile(file, JSON.stringify(runtime, null, 2), { mode: 0o600 });
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

// /api/show resolution by PATH (#1643). `aiwg show <type> <name>` is ambiguous when
// two artifacts share a name (e.g. two `aiwg-steward` agents) — it exits non-zero on
// stderr, which the Bridge would otherwise surface as a 502. `discover` already returns
// the exact path, so the Bridge reads that corpus file directly: deterministic, no
// ambiguity. The path is constrained to the AIWG corpus root(s) to prevent traversal.
const SHOW_EXT_RE = /\.(md|markdown|ya?ml|json)$/i;
const CORPUS_ROOTS = [dirname(dirname(REPO_BIN)), process.env.AIWG_ROOT]
  .filter(Boolean)
  .map((r) => resolve(r));
/** Resolve a discover-provided path to an absolute corpus file, or null if it escapes. */
function resolveCorpusPath(p) {
  let abs;
  try { abs = resolve(String(p)); } catch { return null; }
  if (!SHOW_EXT_RE.test(abs)) return null;
  if (!CORPUS_ROOTS.some((root) => abs === root || abs.startsWith(root + sep))) return null;
  return abs;
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
  for (const s of c.screens || []) {
    if (!ID_RE.test(s.id || '')) fail(`screen.id invalid: ${s.id}`);
    if (typeof s.title !== 'string') fail(`screen ${s.id}: title required`);
    if (typeof s.source !== 'string') fail(`screen ${s.id}: source required`);
  }
  for (const w of c.workflows || []) {
    if (!ID_RE.test(w.id || '')) fail(`workflow.id invalid: ${w.id}`);
    if (typeof w.title !== 'string') fail(`workflow ${w.id}: title required`);
    if (!Array.isArray(w.steps) || w.steps.length === 0) fail(`workflow ${w.id}: steps required`);
    for (const step of w.steps) {
      if (!step || typeof step !== 'object' || !ID_RE.test(step.action || '')) fail(`workflow ${w.id}: step.action invalid`);
    }
  }
  for (const h of c.hooks || []) { if (typeof h.on !== 'string' || !ID_RE.test(h.action || '')) fail(`hook invalid: on=${h.on}`); }
  return m;
}
/** Load + validate + merge all contribution manifests across the configured dirs. */
async function loadContributions() {
  const sources = [], actions = [], screens = [], hooks = [], workflows = [];
  for (const dir of CONTRIB_DIRS) {
    let entries = [];
    try { entries = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'contribution.schema.json'); } catch { continue; }
    for (const file of entries) {
      const m = validateContribution(JSON.parse(await readFile(join(dir, file), 'utf8')), file);
      sources.push({ id: m.id, version: m.version, title: m.title ?? m.id, file });
      for (const a of m.contributes?.actions || []) actions.push({ ...a, source: m.id });
      for (const s of m.contributes?.screens || []) screens.push({ ...s, contribution: m.id });
      for (const h of m.contributes?.hooks || []) hooks.push({ ...h, source: m.id });
      for (const w of m.contributes?.workflows || []) workflows.push({ ...w, source: m.id });
    }
  }
  return { sources, actions, screens, hooks, workflows };
}

function safeIndexGraph(value) {
  const graph = String(value ?? '').trim();
  if (!graph) return '';
  if (!ID_RE.test(graph)) throw new Error('graph must match [a-z0-9._-]{1,64}');
  return graph;
}

function safeIndexLimit(value, fallback = 20) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > 100) throw new Error('limit must be an integer from 1 to 100');
  return n;
}

async function getIndexStatus() {
  return JSON.parse(await runAiwg(['index', 'status', '--json']));
}

async function queryIndex(url) {
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return { status: 400, body: { error: 'q_required' } };
  let limit;
  try { limit = safeIndexLimit(url.searchParams.get('limit'), 20); }
  catch (e) { return { status: 400, body: { error: 'invalid_limit', detail: String(e?.message ?? e) } }; }
  const args = ['index', 'query', q, '--json', '--backend', 'local', '--limit', String(limit)];
  try {
    const graph = safeIndexGraph(url.searchParams.get('graph'));
    if (graph) args.push('--graph', graph);
  } catch (e) { return { status: 400, body: { error: 'invalid_graph', detail: String(e?.message ?? e) } }; }
  for (const flag of ['type', 'phase', 'tags', 'path']) {
    const value = (url.searchParams.get(flag) || '').trim();
    if (value) args.push(`--${flag}`, value);
  }
  return { status: 200, body: JSON.parse(await runAiwg(args)) };
}

async function rebuildIndex(req) {
  const parsed = await readJsonBody(req);
  if (parsed.error) return { status: 400, body: { error: parsed.error } };
  const body = parsed.body || {};
  const args = ['index', 'build'];
  try {
    const graph = safeIndexGraph(body.graph);
    if (graph) args.push('--graph', graph);
  } catch (e) { return { status: 400, body: { error: 'invalid_graph', detail: String(e?.message ?? e) } }; }
  if (body.all === true) args.push('--all');
  if (body.force === true) args.push('--force');
  const requested = await appendAudit('index.rebuild.requested', { graph: body.graph ?? null, all: body.all === true, force: body.force === true });
  const output = await runAiwg(args);
  const status = await getIndexStatus();
  await appendAudit('index.rebuild.completed', { request_ts: requested.ts, graph: body.graph ?? null, all: body.all === true, force: body.force === true });
  return { status: 200, body: { ok: true, command: `aiwg ${args.join(' ')}`, output, status } };
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function redactAuditValue(value) {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/token|secret|password|credential|api[_-]?key|authorization|csrf/i.test(k)) out[k] = '[redacted]';
      else out[k] = redactAuditValue(v);
    }
    return out;
  }
  if (typeof value === 'string' && /(bearer\s+[a-z0-9._-]+|sk-[a-z0-9]|gh[pousr]_[a-z0-9])/i.test(value)) return '[redacted]';
  return value;
}

async function appendAudit(event, fields = {}) {
  const dir = auditDir();
  const log = auditLog();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const entry = redactAuditValue({
    event,
    ts: new Date().toISOString(),
    actor: 'operator',
    surface: 'cockpit-bridge',
    ...fields,
  });
  await appendFile(log, JSON.stringify(entry) + '\n', { mode: 0o600 });
  await chmod(log, 0o600).catch(() => undefined);
  return entry;
}

async function readAudit({ limit = 50 } = {}) {
  try {
    const raw = await readFile(auditLog(), 'utf8');
    return raw.trim().split(/\n+/).filter(Boolean).slice(-limit).map((line) => {
      try { return JSON.parse(line); } catch { return { event: 'unparsed', line }; }
    });
  } catch {
    return [];
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8') || '{}';
  try {
    return { body: JSON.parse(rawBody) };
  } catch {
    return { error: 'invalid_json' };
  }
}

/** Forward a control-plane call to the executor admin surface, relaying status + body. */
async function proxy(res, method, target) {
  const r = await fetch(target, { method });
  const body = await r.json().catch(() => ({}));
  return json(res, r.status, body);
}

async function fetchJsonFirst(candidates, { method = 'GET', headers, body: requestBodyOption } = {}) {
  const failures = [];
  for (const candidate of candidates) {
    const target = typeof candidate === 'string' ? candidate : candidate.target;
    const requestMethod = typeof candidate === 'string' ? method : candidate.method ?? method;
    const requestHeaders = typeof candidate === 'string' ? headers : candidate.headers ?? headers;
    const requestBody = typeof candidate === 'string' ? requestBodyOption : candidate.body ?? requestBodyOption;
    let r;
    try {
      r = await fetch(target, { method: requestMethod, headers: requestHeaders, body: requestBody });
    } catch (err) {
      failures.push(`${target} -> ${String(err?.message ?? err)}`);
      continue;
    }
    const responseBody = await r.json().catch(() => ({}));
    if (r.ok) return { target, status: r.status, body: responseBody };
    failures.push(`${target} -> ${r.status}`);
    if (r.status !== 404 && r.status !== 405) return { target, status: r.status, body: responseBody, failures };
  }
  throw new Error(failures.join('; ') || 'no upstream candidates');
}

function mockExecutorReason(body) {
  if (!body || typeof body !== 'object') return '';
  const value = body;
  if (value.mock === true) return 'health.mock=true';
  if (String(value.name ?? '').toLowerCase().includes('mock')) return `health.name=${value.name}`;
  if (Array.isArray(value.surfaces) && value.surfaces.includes('discovery') && value.surfaces.includes('admin')) {
    return 'legacy mock health surfaces';
  }
  return '';
}

async function assertRealExecutor(executorUrl, allowMockExecutor) {
  if (allowMockExecutor) return;
  let health;
  try {
    health = await fetchJsonFirst([`${executorUrl}/health`]);
  } catch {
    return;
  }
  const reason = mockExecutorReason(health.body);
  if (reason) {
    const err = new Error(`mock executor refused for dev/operator launch (${reason}); use a real agentic-sandbox executor or set AIWG_COCKPIT_ALLOW_MOCK_EXECUTOR=1 only inside automated tests`);
    err.code = 'mock_executor_refused';
    throw err;
  }
}

async function probeExecutor(executorUrl) {
  for (const path of ['/healthz/http', '/healthz', '/health']) {
    try {
      const r = await fetch(`${executorUrl}${path}`, { signal: AbortSignal.timeout(1_500) });
      if (r.ok) return true;
    } catch {
      // Try the next health endpoint.
    }
  }
  return false;
}

async function getExecutorCapabilities(executorUrl) {
  const candidates = ['/healthz/deep', '/healthz', '/health'].map((path) => `${executorUrl}${path}`);
  try {
    const { target, body } = await fetchJsonFirst(candidates);
    return {
      status: 'ok',
      source: new URL(target).pathname,
      host_runtime_enabled: body.host_runtime_enabled === true || body.hostRuntimeEnabled === true,
      raw_status: body.status ?? body.state ?? 'unknown',
    };
  } catch (err) {
    return {
      status: 'unreachable',
      source: null,
      host_runtime_enabled: false,
      error: String(err?.message ?? err),
    };
  }
}

function defaultExecutorCommand() {
  if (EXECUTOR_COMMAND) return EXECUTOR_COMMAND.split(/\s+/).filter(Boolean);
  const candidates = [
    '/home/roctinam/dev/agentic-sandbox/management/target/release/agentic-mgmt',
    '/home/roctinam/dev/agentic-sandbox/management/target/debug/agentic-mgmt',
    'agentic-mgmt',
  ];
  for (const c of candidates) {
    if (c === 'agentic-mgmt' || existsSync(c)) return [c];
  }
  return [];
}

async function ensureExecutor(executorUrl) {
  if (!AUTOSTART_EXECUTOR || await probeExecutor(executorUrl)) return;
  const cmd = defaultExecutorCommand();
  if (!cmd.length) return;
  const child = spawn(cmd[0], cmd.slice(1), {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await probeExecutor(executorUrl)) return;
  }
}

async function proxyFirst(res, candidates, options) {
  try {
    const { status, body } = await fetchJsonFirst(candidates, options);
    return json(res, status, body);
  } catch (err) {
    const message = String(err?.message ?? err);
    const notFound = / -> 404(?:;|$)/.test(message);
    const methodNotAllowed = / -> 405(?:;|$)/.test(message);
    return json(res, notFound ? 404 : methodNotAllowed ? 405 : 502, {
      error: notFound ? 'upstream_not_found' : methodNotAllowed ? 'upstream_method_not_allowed' : 'bridge_upstream_error',
      message,
    });
  }
}

async function destroyInstance(upstreamUrl, instanceId) {
  const inventory = await getInventory(upstreamUrl).catch(() => ({ instances: [] }));
  const inst = inventory.instances.find((i) => String(i.id) === String(instanceId));
  const runtime = String(inst?.runtime ?? inst?.runtime_posture?.kind ?? '').toLowerCase();
  const dockerName = inst?.launch_context?.name;
  const candidates = [
    { target: `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(instanceId)}/destroy`, method: 'POST' },
    { target: `${upstreamUrl}/admin/instances/${encodeURIComponent(instanceId)}/destroy`, method: 'POST' },
    { target: `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(instanceId)}`, method: 'DELETE' },
    { target: `${upstreamUrl}/admin/instances/${encodeURIComponent(instanceId)}`, method: 'DELETE' },
  ];
  try {
    const result = await fetchJsonFirst(candidates);
    if (result.status < 400) {
      if (['docker', 'container'].includes(runtime) && dockerName) {
        try {
          await spawnCollect('docker', ['rm', '-f', dockerName]);
          return {
            ...result,
            body: {
              ...result.body,
              cockpit_reconcile: 'docker-cli-after-admin-v2-success',
              docker_name: dockerName,
            },
          };
        } catch {
          // If Docker already removed it, the admin result is still authoritative.
        }
      }
      return result;
    }
  } catch (err) {
    const message = String(err?.message ?? err);
    // A docker/container row with a resolvable name is still physically
    // removable even when admin-v2 has no instance record (404): fall through
    // to the `docker rm -f` cleanup below so the stopped container is actually
    // removed. Returning already_gone here would claim success while the
    // container persists and re-appears on the next inventory poll — the
    // "stale stopped Docker row can't be destroyed" failure.
    const dockerCleanable = ['docker', 'container'].includes(runtime) && dockerName;
    if (inst && !dockerCleanable && / -> 404(?:;|$)/.test(message)) {
      return {
        target: `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(instanceId)}/destroy`,
        status: 200,
        body: {
          id: instanceId,
          destroyed: instanceId,
          state: 'destroyed',
          result: { state: 'destroyed' },
          already_gone: true,
          message: `Instance ${instanceId} was already removed; inventory refreshed.`,
        },
      };
    }
    // Current sandbox builds can list Docker rows in admin-v2 inventory while
    // lifecycle verbs return instance.not_found. Fall through to a dev cleanup.
  }

  if (!inst || !['docker', 'container'].includes(runtime) || !dockerName) {
    return {
      target: `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(instanceId)}/destroy`,
      status: 404,
      body: { error: 'instance_not_destroyable', message: `No destroyable runtime record for ${instanceId}` },
    };
  }

  let alreadyGone = false;
  try {
    await spawnCollect('docker', ['rm', '-f', dockerName]);
  } catch (err) {
    // `docker rm -f` errors only because the container is already gone (e.g.
    // removed out-of-band). That is success for a destroy request, not a failure.
    if (/No such container|is not running|not found/i.test(String(err?.message ?? err))) {
      alreadyGone = true;
    } else {
      throw err;
    }
  }
  return {
    target: `docker rm -f ${dockerName}`,
    status: 200,
    body: {
      id: instanceId,
      name: dockerName,
      runtime,
      state: 'destroyed',
      result: { state: 'destroyed' },
      already_gone: alreadyGone,
      message: alreadyGone ? `Container ${dockerName} was already removed; inventory refreshed.` : undefined,
      fallback: 'docker-cli-after-admin-v2-instance-not-found',
    },
  };
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

async function resolveSessionAgentId(executorUrl, instanceId) {
  try {
    const { body } = await fetchJsonFirst([`${executorUrl}/api/v1/agents`]);
    const agents = asArrayFromEnvelope(body, ['agents', 'items', 'data']);
    const agent = agents.find((a) => String(a.instance_id ?? a.instanceId ?? '') === String(instanceId));
    return agent?.id ?? agent?.agent_id ?? agent?.agentId ?? instanceId;
  } catch {
    return instanceId;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function defaultSshPublicKey() {
  const candidates = [
    join(homedir(), '.ssh', 'agentic_ed25519.pub'),
    join(homedir(), '.ssh', 'vm_ed25519.pub'),
    join(homedir(), '.ssh', 'id_ed25519.pub'),
    join(homedir(), '.ssh', 'id_rsa.pub'),
    join(homedir(), '.ssh', 'id_ecdsa.pub'),
  ];
  return candidates.find((path) => existsSync(path)) ?? '';
}

function expandHome(path) {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
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
  if (runtime === 'vm' || runtime === 'qemu' || runtime === 'kvm') return { kind: 'vm', isolation: 'strong', label: 'VM / hardware boundary' };
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
  const raw = typeof posture === 'string' ? { mode: posture } : (posture && typeof posture === 'object' ? posture : {});
  const mode = String(raw.mode ?? 'unknown');
  const trust = String(raw.trust ?? raw.transport_posture ?? raw.posture ?? '').toLowerCase();
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

function normalizeSessionBackends(backends, runtimeKind, state = 'unknown', agentReady = false) {
  const list = Array.isArray(backends) ? backends : [];
  if (!list.length && runtimeKind === 'host') {
    return [{
      mode: 'managed',
      backend: 'tmux',
      observe: true,
      drive: true,
      replay: false,
      keyframe: false,
      available: agentReady,
      reason: agentReady
        ? 'agentic-sandbox v1 host session API default'
        : 'host runtime is provisioned but the host agent has not registered; PTY sessions are not ready',
    }];
  }
  if (!list.length && ['docker', 'container', 'vm', 'qemu', 'kvm'].includes(runtimeKind) && String(state).toLowerCase() === 'running') {
    return [{
      mode: 'managed',
      backend: 'tmux',
      observe: true,
      drive: true,
      replay: true,
      keyframe: true,
      available: agentReady,
      reason: agentReady ? 'agentic-sandbox v1 managed session API' : 'container is running but the agent has not registered; PTY sessions are not ready',
    }];
  }
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
  const loadout = i.loadout ?? i.launch_context?.loadout ?? i.launchContext?.loadout ?? i.runtime_extension?.loadout ?? i.runtimeExtension?.loadout ?? 'unknown';
  const agentReady = Boolean(i.agent_ready ?? i.agentReady ?? i.registered_agent_id ?? i.registeredAgentId);
  return {
    id,
    runtime,
    loadout,
    state: i.state ?? i.status ?? 'unknown',
    tenant: i.tenant_id ?? i.tenant ?? i.tenantId ?? 'default',
    card_url: i.card_url ?? i.cardUrl ?? `${executorUrl}/agents/${encodeURIComponent(id)}/.well-known/agent-card.json`,
    runtime_posture: runtimePosture,
    host_daemon: normalizeHostDaemon(i.host_daemon ?? i.hostDaemon, runtimePosture.kind),
    transport: normalizeTransport(
      typeof i.transport === 'string' || typeof i.transport_posture === 'string'
        ? { mode: i.transport, trust: i.transport_posture, source: 'agentic-sandbox admin-v2' }
        : i.transport ?? i.transport_posture ?? i.security_posture ?? i.security?.transport,
    ),
    launch_context: {
      cwd: i.launch_context?.cwd ?? i.launchContext?.cwd ?? i.cwd,
      loadout,
      runtime_kind: i.launch_context?.runtime_kind ?? i.launchContext?.runtimeKind ?? runtime,
      host: i.launch_context?.host ?? i.launchContext?.host ?? i.host_metadata?.hostname ?? i.hostMetadata?.hostname,
      selected_tier: i.launch_context?.selected_tier ?? i.launchContext?.selectedTier ?? i.operator_selected_tier ?? i.operatorSelectedTier ?? runtime,
      name: i.name ?? i.launch_context?.name ?? i.launchContext?.name,
      image_ref: i.image_ref ?? i.imageRef ?? i.runtime_extension?.image_ref ?? i.runtimeExtension?.imageRef,
      source: i.runtime_extension ? 'agent-card runtime extension' : i.launch_context?.source ?? i.launchContext?.source,
    },
    agent_ready: agentReady,
    registered_agent_id: i.registered_agent_id ?? i.registeredAgentId,
    session_backends: normalizeSessionBackends(i.session_backends ?? i.sessionBackends ?? i.session_host?.backends ?? i.sessionHost?.backends ?? i.capabilities?.session_backends ?? i.capabilities?.sessionBackends, runtimePosture.kind, i.state ?? i.status, agentReady),
  };
}

function defaultSessionLaunch(instance) {
  const runtime = String(instance?.runtime_posture?.kind ?? instance?.runtime ?? '').toLowerCase();
  if (runtime === 'host') {
    return {
      command: 'bash',
      args: ['-l'],
      working_dir: instance?.launch_context?.cwd,
    };
  }
  if (runtime === 'container' || runtime === 'docker' || runtime === 'vm' || runtime === 'qemu' || runtime === 'kvm') {
    return {
      command: '/bin/bash',
      args: ['-lc', 'cd "${HOME:-/root}" && exec /bin/bash -l'],
      working_dir: '/root',
    };
  }
  return {
    command: 'bash',
    args: ['-l'],
  };
}

function runtimeExtensionFromCard(card) {
  const extensions = card?.capabilities?.extensions;
  if (!Array.isArray(extensions)) return null;
  const ext = extensions.find((e) => String(e?.uri ?? '').includes('/extensions/runtime/'));
  return ext?.params && typeof ext.params === 'object' ? ext.params : null;
}

async function enrichInstanceFromAgentCard(executorUrl, instance) {
  const id = instance.instance_id ?? instance.instanceId ?? instance.id;
  if (!id) return instance;
  try {
    const { body } = await fetchJsonFirst([
      `${executorUrl}/agents/${encodeURIComponent(id)}/.well-known/agent-card.json`,
    ]);
    const runtimeExtension = runtimeExtensionFromCard(body);
    if (!runtimeExtension) return instance;
    return {
      ...instance,
      runtime_extension: runtimeExtension,
      loadout: instance.loadout ?? runtimeExtension.loadout,
      image_ref: instance.image_ref ?? runtimeExtension.image_ref,
    };
  } catch {
    return instance;
  }
}

async function getRegisteredAgents(executorUrl) {
  try {
    const { body } = await fetchJsonFirst([`${executorUrl}/api/v1/agents`]);
    return asArrayFromEnvelope(body, ['agents', 'items', 'data']);
  } catch {
    return [];
  }
}

function enrichInstanceFromAgentRegistry(instance, agents) {
  const id = instance.instance_id ?? instance.instanceId ?? instance.id;
  const agent = agents.find((a) => String(a.instance_id ?? a.instanceId ?? '') === String(id));
  if (!agent) return { ...instance, agent_ready: false };
  return {
    ...instance,
    agent_ready: true,
    registered_agent_id: agent.id ?? agent.agent_id ?? agent.agentId,
  };
}

function normalizeAgentInstance(executorUrl, agent) {
  const id = agent.instance_id ?? agent.instanceId ?? agent.id ?? agent.agent_id ?? agent.agentId;
  return normalizeInstance(executorUrl, {
    id,
    instance_id: id,
    runtime: 'host',
    loadout: agent.loadout ?? 'host-tools',
    state: 'running',
    tenant: agent.tenant_id ?? agent.tenantId ?? 'default',
    transport: {
      mode: agent.transport?.mode ?? 'mtls-agent-registration',
      trust: agent.transport?.trust ?? 'secure',
      source: 'agent registry fallback',
      evidence: agent.peer_identity ?? agent.spiffe_id ?? agent.spiffeId,
    },
    host_daemon: {
      status: 'available',
      detail: `Registered host agent ${agent.id ?? agent.agent_id ?? agent.agentId ?? id}`,
    },
    launch_context: {
      loadout: agent.loadout ?? 'host-tools',
      runtime_kind: 'host',
      host: agent.hostname,
      selected_tier: 'host',
    },
    session_backends: agent.session_backends ?? agent.sessionBackends ?? [
      { mode: 'managed', backend: 'tmux', observe: true, drive: true, replay: false, keyframe: false, available: true, reason: 'agent registry fallback' },
    ],
  });
}

async function getAgentBackedHostInventory(executorUrl, degradedDetail) {
  const { target, body } = await fetchJsonFirst([`${executorUrl}/api/v1/agents`]);
  const agents = asArrayFromEnvelope(body, ['agents', 'items', 'data']);
  const instances = agents
    .filter((agent) => agent.instance_id || agent.instanceId || agent.id || agent.agent_id || agent.agentId)
    .map((agent) => normalizeAgentInstance(executorUrl, agent));
  return {
    source: executorUrl,
    admin_path: new URL(target).pathname,
    fetched_at: new Date().toISOString(),
    count: instances.length,
    degraded_admin_inventory: degradedDetail,
    instances,
  };
}

/** Normalize the executor's admin inventory into the Bridge's UI shape. */
async function getInventory(executorUrl) {
  const { target, status, body } = await fetchJsonFirst([
    `${executorUrl}/admin/instances`,
    `${executorUrl}/api/v2/admin/instances`,
  ]);
  const instances = asArrayFromEnvelope(body, ['instances', 'items', 'data']);
  if (status >= 400 || !instances.length) {
    const detail = status >= 400 ? `${new URL(target).pathname} returned ${status}` : `${new URL(target).pathname} returned no instances`;
    try {
      const fallback = await getAgentBackedHostInventory(executorUrl, detail);
      if (fallback.instances.length) return fallback;
    } catch {
      // Preserve the admin inventory result when no agent-backed fallback is available.
    }
    if (status >= 400) {
      return {
        source: executorUrl,
        admin_path: new URL(target).pathname,
        fetched_at: new Date().toISOString(),
        count: 0,
        degraded_admin_inventory: detail,
        admin_error: body,
        instances: [],
      };
    }
  }
  const agents = await getRegisteredAgents(executorUrl);
  const enriched = await Promise.all(instances.map((i) => enrichInstanceFromAgentCard(executorUrl, i)));
  const normalized = enriched
    .map((i) => enrichInstanceFromAgentRegistry(i, agents))
    .map((i) => normalizeInstance(executorUrl, i));
  return {
    source: executorUrl,
    admin_path: new URL(target).pathname,
    fetched_at: new Date().toISOString(),
    count: normalized.length,
    instances: normalized,
  };
}

// --- task derivation (#1639) -------------------------------------------------
// The real agentic-sandbox v2 admin surface has NO /running or /approvals route.
// The running board and the approval inbox are derived from the real A2A task
// surface (`/agents/{agentId}/tasks`) per instance — not from the mock's invented
// /admin/running. A2A task lifecycle states: submitted/working/input-required are
// active; completed/canceled/failed/rejected are terminal.
const ACTIVE_TASK_STATES = new Set(['submitted', 'working', 'input-required', 'in_progress', 'running']);
const taskState = (t) => t.status?.state ?? t.state ?? (typeof t.status === 'string' ? t.status : 'unknown');
const taskIdOf = (t) => t.id ?? t.task_id ?? t.taskId;
const taskTenantOf = (t) => t.metadata?.tenant_id ?? t.metadata?.tenantId ?? t.tenant ?? t.tenant_id ?? t.tenantId ?? 'default';

/** Active tasks for one instance via the A2A task surface (#1639). The session
 *  agent id (not the instance id) keys the agent routes on real executors. */
async function listInstanceTasks(executorUrl, instanceId) {
  const agentId = await resolveSessionAgentId(executorUrl, instanceId);
  const candidates = unique([instanceId, agentId]).flatMap((id) => [
    `${executorUrl}/agents/${encodeURIComponent(id)}/tasks`,
    `${executorUrl}/api/v1/agents/${encodeURIComponent(id)}/tasks`,
  ]);
  const { body } = await fetchJsonFirst(candidates);
  return asArrayFromEnvelope(body, ['tasks', 'items', 'data']);
}

/** Running board derived from active A2A tasks across running instances (#1639).
 *  An instance with no reachable task surface contributes nothing rather than
 *  failing the whole board (so a real executor stays usable). */
// Loadout catalog passthrough (#1641). The real executor exposes GET /api/v1/loadouts
// (and v2 /loadouts); the mock mirrors it under /admin/loadouts. Normalized to a flat
// {id,label,description,runtimes} list so the start-session picker can offer the full set
// (vs. only echoing the instance's own loadout field).
async function getLoadouts(executorUrl) {
  const { target, body } = await fetchJsonFirst([
    `${executorUrl}/api/v1/loadouts`,
    `${executorUrl}/api/v2/loadouts`,
    `${executorUrl}/loadouts`,
    `${executorUrl}/admin/loadouts`,
  ]);
  const raw = asArrayFromEnvelope(body, ['loadouts', 'items', 'data']);
  const loadouts = raw.map((l) => {
    if (typeof l === 'string') return { id: l, label: l };
    const id = l.id ?? l.name ?? l.loadout ?? l.slug;
    return {
      id,
      label: l.label ?? l.display_name ?? l.displayName ?? id,
      description: l.description ?? l.summary,
      runtimes: l.runtimes ?? l.runtime_kinds ?? l.supported_runtimes,
    };
  }).filter((l) => l.id);
  return { source: executorUrl, loadouts_path: new URL(target).pathname, count: loadouts.length, loadouts };
}

async function getRunning(executorUrl) {
  const instances = (await getInventory(executorUrl)).instances;
  const running = [];
  await Promise.all(
    instances.filter((i) => i.state === 'running').map(async (inst) => {
      let tasks;
      try { tasks = await listInstanceTasks(executorUrl, inst.id); } catch { return; }
      for (const t of tasks) {
        const state = taskState(t);
        if (!ACTIVE_TASK_STATES.has(state)) continue;
        running.push({
          instance_id: inst.id,
          task_id: taskIdOf(t),
          state,
          tenant: taskTenantOf(t),
          runtime_posture: inst.runtime_posture,
          transport: inst.transport,
        });
      }
    }),
  );
  return {
    source: executorUrl,
    fetched_at: new Date().toISOString(),
    count: running.length,
    running,
    derived: 'per-instance A2A tasks',
  };
}

function textFromParts(parts) {
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => p?.text ?? p?.content ?? p?.value ?? '')
    .filter((p) => typeof p === 'string' && p.trim())
    .join('\n');
}

function approvalPromptFromTask(task) {
  const meta = task.metadata ?? {};
  const status = typeof task.status === 'object' ? task.status : {};
  const prompt = [
    meta.hitl_prompt?.prompt,
    meta.hitlPrompt?.prompt,
    meta.approval?.prompt,
    meta.prompt,
    status.message,
    status.prompt,
    textFromParts(task.artifacts?.flatMap((a) => a.parts ?? [])),
    textFromParts(task.history?.at?.(-1)?.parts),
  ].find((v) => typeof v === 'string' && v.trim());
  return String(prompt || 'Human input required');
}

function approvalFromTask(instance, task) {
  const state = taskState(task);
  const meta = task.metadata ?? {};
  const hasHitlPrompt = meta.hitl_prompt || meta.hitlPrompt || meta.approval || meta['hitl-prompt/v1'];
  if (state !== 'input-required' && !hasHitlPrompt) return null;
  const taskId = taskIdOf(task);
  if (!taskId) return null;
  return {
    id: `${instance.id}::${taskId}`,
    instance_id: instance.id,
    task_id: taskId,
    prompt: approvalPromptFromTask(task),
    risk: meta.risk ?? meta.approval?.risk ?? meta.hitl_prompt?.risk ?? 'unknown',
    created_at: task.created_at ?? task.createdAt ?? task.status?.timestamp ?? task.metadata?.created_at,
    status: state === 'input-required' ? 'pending' : state,
    tenant: taskTenantOf(task),
    derived: 'a2a input-required task',
  };
}

/**
 * Pending HITL approvals (the unified approval inbox) derived from real A2A
 * `input-required` / `hitl-prompt/v1` task surfaces. The real agentic-sandbox
 * v2 admin router has no approvals queue, so this deliberately does not probe
 * `/admin/approvals`.
 */
async function getApprovals(executorUrl, status) {
  const instances = (await getInventory(executorUrl)).instances;
  const approvals = [];
  await Promise.all(
    instances.filter((i) => i.state === 'running').map(async (inst) => {
      let tasks;
      try { tasks = await listInstanceTasks(executorUrl, inst.id); } catch { return; }
      for (const t of tasks) {
        const approval = approvalFromTask(inst, t);
        if (!approval) continue;
        if (status && status !== 'all' && approval.status !== status) continue;
        approvals.push(approval);
      }
    }),
  );
  return {
    source: executorUrl,
    fetched_at: new Date().toISOString(),
    approvals,
    derived: 'per-instance A2A input-required tasks',
  };
}

const TERMINAL_MISSION_STATES = new Set(['done', 'completed', 'complete', 'failed', 'aborted', 'canceled', 'cancelled', 'rejected']);

function normalizeMissionStatus(status) {
  const value = String(status ?? 'unknown').toLowerCase();
  if (value === 'done' || value === 'complete') return 'completed';
  if (value === 'cancelled' || value === 'canceled') return 'aborted';
  if (['queued', 'running', 'paused', 'completed', 'failed', 'aborted', 'input-required', 'awaiting-approval', 'unknown'].includes(value)) return value;
  return value;
}

function missionSummary(mission) {
  const status = normalizeMissionStatus(mission.status);
  return {
    id: String(mission.id ?? mission.mission_id ?? mission.missionId ?? ''),
    title: mission.objective ?? mission.goal ?? mission.task ?? mission.title ?? 'Untitled mission',
    completion: mission.completion ?? mission.completionCriterion ?? mission.completion_criterion,
    status,
    loop: mission.loop ?? mission.iteration ?? mission.currentIteration ?? 0,
    max_iterations: mission.maxIterations ?? mission.max_iterations ?? mission.maxIterations ?? 0,
    priority: mission.priority ?? 'normal',
    mode: mission.mode ?? 'direct',
    target_agent: mission.targetAgent ?? mission.target_agent,
    ralph_loop_id: mission.ralphLoopId ?? mission.ralph_loop_id,
    ralph_pid: mission.ralphPid ?? mission.ralph_pid,
    started_at: mission.startedAt ?? mission.started_at,
    completed_at: mission.completedAt ?? mission.completed_at,
    error: mission.error,
    terminal: TERMINAL_MISSION_STATES.has(status),
  };
}

async function readMcAudit(sessionId) {
  const logPath = join(mcSessionsDir(), sessionId, 'log.jsonl');
  try {
    const raw = await readFile(logPath, 'utf8');
    return raw.trim().split(/\n+/).filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return { event: 'unparsed', line }; }
    });
  } catch {
    return [];
  }
}

async function readMcSessions() {
  let entries = [];
  const sessionsDir = mcSessionsDir();
  try { entries = await readdir(sessionsDir, { withFileTypes: true }); } catch { return []; }
  const sessions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(join(sessionsDir, entry.name, 'session.json'), 'utf8');
      const session = JSON.parse(raw);
      const audit = await readMcAudit(entry.name);
      sessions.push({
        id: String(session.id ?? entry.name),
        name: session.name ?? entry.name,
        state: session.state ?? 'unknown',
        source: 'aiwg-mc',
        created_at: session.createdAt ?? session.created_at,
        updated_at: session.updatedAt ?? session.updated_at,
        max_missions: session.maxMissions ?? session.max_missions,
        audit_count: audit.length,
        audit_tail: audit.slice(-8),
        missions: (session.missions ?? []).map((m) => ({ ...missionSummary(m), session_id: session.id ?? entry.name, source: 'aiwg-mc' })),
      });
    } catch {
      // Ignore malformed or half-written sessions; the next refresh will retry.
    }
  }
  sessions.sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));
  return sessions;
}

async function taskMissionSession(executorUrl) {
  const running = await getRunning(executorUrl).catch(() => ({ running: [] }));
  const approvals = await getApprovals(executorUrl, 'pending').catch(() => ({ approvals: [] }));
  const taskMissions = [
    ...(running.running ?? []).map((t) => ({
      id: `${t.instance_id}::${t.task_id}`,
      session_id: 'executor-live',
      source: 'executor-task',
      title: `Task ${t.task_id}`,
      status: normalizeMissionStatus(t.state),
      instance_id: t.instance_id,
      task_id: t.task_id,
      tenant: t.tenant,
      runtime_posture: t.runtime_posture,
      transport: t.transport,
      terminal: false,
    })),
    ...(approvals.approvals ?? []).map((a) => ({
      id: a.id,
      session_id: 'executor-live',
      source: 'hitl-approval',
      title: a.prompt,
      status: 'awaiting-approval',
      instance_id: a.instance_id,
      task_id: a.task_id,
      tenant: a.tenant,
      risk: a.risk,
      terminal: false,
    })),
  ];
  if (!taskMissions.length) return null;
  return {
    id: 'executor-live',
    name: 'Executor live tasks',
    state: 'active',
    source: 'agentic-sandbox',
    updated_at: new Date().toISOString(),
    audit_count: 0,
    audit_tail: [],
    missions: taskMissions,
  };
}

async function getMissions(executorUrl) {
  const sessions = await readMcSessions();
  const live = await taskMissionSession(executorUrl);
  if (live) sessions.unshift(live);
  const missions = sessions.flatMap((s) => s.missions);
  return {
    source: 'aiwg-mc + agentic-sandbox',
    fetched_at: new Date().toISOString(),
    count: missions.length,
    sessions,
    missions,
  };
}

async function getSessionEventRows(executorUrl, instances) {
  const rows = [];
  await Promise.all((instances ?? []).map(async (inst) => {
    let sessions;
    try { sessions = (await getSessions(executorUrl, inst.id)).sessions; } catch { return; }
    for (const session of sessions) {
      rows.push({
        id: session.id,
        instance_id: inst.id,
        agent_id: session.agent_id,
        state: session.state ?? session.status ?? session.session_state ?? 'available',
        role_policy: session.role_policy,
        backend: session.backend ?? session.session_backend,
        mode: session.mode ?? session.session_class,
      });
    }
  }));
  return rows;
}

async function getEventSnapshot(executorUrl) {
  const inventory = await getInventory(executorUrl).catch(() => ({ instances: [] }));
  const [running, approvals, missions, sessions] = await Promise.all([
    getRunning(executorUrl).catch(() => ({ running: [] })),
    getApprovals(executorUrl, 'pending').catch(() => ({ approvals: [] })),
    getMissions(executorUrl).catch(() => ({ missions: [] })),
    getSessionEventRows(executorUrl, inventory.instances).catch(() => []),
  ]);
  const ts = new Date().toISOString();
  const events = [];
  for (const inst of inventory.instances ?? []) {
    events.push({ id: `instance:${inst.id}`, type: 'inventory.instance', source: 'agentic-sandbox', subject: inst.id, state: inst.state, ts, ref: { instance_id: inst.id } });
  }
  for (const task of running.running ?? []) {
    events.push({ id: `task:${task.instance_id}:${task.task_id}`, type: 'task.lifecycle', source: 'a2a', subject: task.task_id, state: task.state, ts, ref: { instance_id: task.instance_id, task_id: task.task_id } });
  }
  for (const approval of approvals.approvals ?? []) {
    events.push({ id: `approval:${approval.id}`, type: 'hitl.approval', source: 'a2a', subject: approval.task_id ?? approval.id, state: approval.status, severity: approval.risk, ts, ref: { instance_id: approval.instance_id, approval_id: approval.id } });
  }
  for (const session of sessions ?? []) {
    events.push({ id: `session:${session.instance_id}:${session.id}`, type: 'session.lifecycle', source: 'pty-session', subject: session.id, state: session.state, ts, ref: { instance_id: session.instance_id, session_id: session.id, agent_id: session.agent_id, backend: session.backend, mode: session.mode, role_policy: session.role_policy } });
  }
  for (const mission of missions.missions ?? []) {
    events.push({ id: `mission:${mission.id}`, type: 'mission.lifecycle', source: mission.source ?? 'aiwg-mc', subject: mission.id, state: mission.status, ts, ref: { session_id: mission.session_id, mission_id: mission.id, ralph_loop_id: mission.ralph_loop_id } });
  }
  return { source: 'cockpit.unified-event-model/v1', fetched_at: ts, count: events.length, events };
}

async function respondApproval(executorUrl, approvalId, decision) {
  if (!['approve', 'deny'].includes(decision)) return { status: 400, body: { error: 'decision must be approve|deny' } };
  const [instanceId, taskId] = String(approvalId).split('::');
  if (!instanceId || !taskId) return { status: 400, body: { error: 'invalid_approval_id' } };
  const agentId = await resolveSessionAgentId(executorUrl, instanceId);
  const message = {
    message: {
      messageId: `cockpit-hitl-${Date.now()}`,
      role: 'user',
      taskId,
      contextId: taskId,
      parts: [{ kind: 'text', text: decision }],
      metadata: { hitl_response: { decision }, approval_decision: decision },
    },
  };
  const response = JSON.stringify({ decision, response: message.message });
  const candidates = unique([agentId, instanceId]).flatMap((id) => [
    {
      target: `${executorUrl}/api/v1/agents/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}:respond`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: response,
    },
    {
      target: `${executorUrl}/agents/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}:respond`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: response,
    },
    {
      target: `${executorUrl}/api/v1/agents/${encodeURIComponent(id)}/messages:send`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message),
    },
    {
      target: `${executorUrl}/agents/${encodeURIComponent(id)}/messages:send`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message),
    },
  ]);
  try {
    const { status, body } = await fetchJsonFirst(candidates);
    return { status, body };
  } catch (e) {
    return { status: 409, body: { error: 'approval_response_failed', detail: String(e?.message ?? e) } };
  }
}

/**
 * Sessions for one instance, each with a direct attach_url. Control plane (this
 * list) goes through the Bridge; the data plane (the pty stream) connects direct
 * to the executor — masking differs per WS direction, so the Bridge issues the
 * URL rather than proxying frames.
 */
async function getSessions(executorUrl, instanceId) {
  const sessionAgentId = await resolveSessionAgentId(executorUrl, instanceId);
  const agentIds = unique([instanceId, sessionAgentId]);
  const { body } = await fetchJsonFirst(agentIds.flatMap((agentId) => [
    `${executorUrl}/agents/${encodeURIComponent(agentId)}/sessions`,
    `${executorUrl}/agents/${encodeURIComponent(agentId)}/v1/sessions`,
    `${executorUrl}/api/v1/agents/${encodeURIComponent(agentId)}/sessions`,
  ]));
  const sessions = asArrayFromEnvelope(body, ['sessions', 'items', 'data']);
  const wsBase = executorUrl.replace(/^http/i, 'ws');
  const normalizeAttachUrl = (s, sessionId) => {
    const explicit = s.attach_url ?? s.attachUrl;
    if (explicit) return explicit;
    const ptyUrl = s.pty_ws_url ?? s.ptyWsUrl;
    if (ptyUrl) {
      try {
        const u = new URL(String(ptyUrl).replace('{host}', new URL(executorUrl).host));
        u.protocol = new URL(executorUrl).protocol === 'https:' ? 'wss:' : 'ws:';
        return u.toString();
      } catch { /* fall through to legacy shape */ }
    }
    // Fallback URL construction (session entry carried no attach_url/pty_ws_url).
    // The executor's pty-ws route keys the agent segment by the INSTANCE id, not
    // the registered agent name — resolveSessionAgentId returns the name for some
    // agents (e.g. VMs after a Bridge restart), which the route won't accept and
    // the data-plane socket never connects (#1671). Use the instance id here; the
    // agent name is only needed for the session-list FETCH, not the attach path.
    return `${wsBase}/agents/${encodeURIComponent(instanceId)}/sessions/${encodeURIComponent(sessionId)}/attach`;
  };
  const sessionKey = (entry, sessionId) => String(entry.command_id ?? entry.commandId ?? sessionId);
  const fallbackScore = (entry, key) => {
    const id = String(entry.id ?? '');
    const name = String(entry.session_name ?? entry.sessionName ?? '');
    const command = String(entry.command ?? '').trim();
    let score = 0;
    if (id && id === key) score += 2;
    if (name && name === key) score += 2;
    if (/^\/?bin\/bash\s+-l$/.test(command)) score += 1;
    return score;
  };
  const namedScore = (entry) => {
    const name = String(entry.session_name ?? entry.sessionName ?? '');
    if (/^terminal-[a-z0-9-]+$/i.test(name)) return 2;
    return name ? 1 : 0;
  };
  const shouldReplace = (existing, candidate, key) => {
    const existingFallback = fallbackScore(existing, key);
    const candidateFallback = fallbackScore(candidate, key);
    if (existingFallback !== candidateFallback) return candidateFallback < existingFallback;
    const existingNamed = namedScore(existing);
    const candidateNamed = namedScore(candidate);
    if (existingNamed !== candidateNamed) return candidateNamed > existingNamed;
    return false;
  };
  // Dedup by command id when present. The executor can expose a formal
  // Cockpit-created session plus an attach-side fallback shell for the same PTY
  // command id; showing both creates duplicate rows and can attach users to the
  // fallback shell. Prefer the named session Cockpit created.
  const byKey = new Map();
  for (const s of sessions) {
    const sessionId = s.id ?? s.session_id ?? s.sessionId;
    if (!sessionId) continue;
    const normalized = {
      ...s,
      id: sessionId,
      instance_id: s.instance_id ?? s.instanceId ?? instanceId,
      agent_id: s.agent_id ?? s.agentId ?? sessionAgentId,
      role_policy: s.role_policy ?? s.rolePolicy ?? (s.default_role === 'observer' ? 'observe-default' : s.default_role) ?? 'observe-default',
      attach_url: normalizeAttachUrl(s, sessionId),
    };
    const key = sessionKey(s, sessionId);
    const existing = byKey.get(key);
    if (!existing || shouldReplace(existing, normalized, key)) byKey.set(key, normalized);
  }
  return { instance_id: instanceId, sessions: [...byKey.values()] };
}

async function endSession(executorUrl, instanceId, sessionId) {
  const sessionAgentId = await resolveSessionAgentId(executorUrl, instanceId);
  let sessions = [];
  try {
    sessions = (await getSessions(executorUrl, instanceId)).sessions;
  } catch {
    // Fall back to using the supplied id directly; older executors may not list
    // before delete, and delete should remain useful during recovery cleanup.
  }
  const targetSession = sessions.find((s) => String(s.id) === String(sessionId)
    || String(s.session_id ?? s.sessionId ?? '') === String(sessionId)
    || String(s.session_name ?? s.sessionName ?? '') === String(sessionId));
  const sessionName = targetSession?.session_name ?? targetSession?.sessionName ?? sessionId;
  const { status, body } = await fetchJsonFirst(unique([sessionAgentId, instanceId]).map((agentId) => ({
    target: `${executorUrl}/api/v1/agents/${encodeURIComponent(agentId)}/sessions/${encodeURIComponent(sessionName)}`,
    method: 'DELETE',
  })));
  return {
    status,
    body: {
      ...body,
      id: sessionId,
      session_name: sessionName,
      instance_id: instanceId,
      agent_id: sessionAgentId,
      ended: status >= 200 && status < 300,
    },
  };
}

export function createBridge({ executorUrl = EXECUTOR_URL, allowMockExecutor = ALLOW_MOCK_EXECUTOR, token } = {}) {
  const upstreamUrl = executorUrl;
  const TOKEN = token ?? randomBytes(24).toString('hex');
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    try {
      // unauthenticated liveness probe (no /api/ prefix) — for the shell to wait on
      if (url.pathname === '/healthz') return json(res, 200, { status: 'ok' });
      if (url.pathname.startsWith('/api/') && !validBrowserOrigin(req)) {
        return json(res, 403, { error: 'forbidden_origin' });
      }
      // gate the control surface: per-launch bearer token on every /api/ call
      if (url.pathname.startsWith('/api/') && !authed(req, url, TOKEN)) {
        return json(res, 401, { error: 'unauthorized', detail: 'missing or invalid cockpit token' });
      }
      if (url.pathname.startsWith('/api/') && !validCsrf(req, TOKEN)) {
        return json(res, 403, { error: 'csrf_required' });
      }
      if (url.pathname.startsWith('/api/')) {
        try {
          await assertRealExecutor(upstreamUrl, allowMockExecutor);
        } catch (err) {
          return json(res, 502, { error: err.code ?? 'executor_refused', message: String(err?.message ?? err) });
        }
      }
      if (url.pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        const emit = (reason = 'heartbeat') => {
          res.write(`event: cockpit.refresh\n`);
          res.write(`data: ${JSON.stringify({ reason, ts: new Date().toISOString() })}\n\n`);
        };
        emit('connected');
        const timer = setInterval(() => emit(), 5_000);
        req.on('close', () => clearInterval(timer));
        return;
      }
      if (url.pathname === '/api/inventory') return json(res, 200, await getInventory(upstreamUrl));
      if (url.pathname === '/api/executor/capabilities') return json(res, 200, await getExecutorCapabilities(upstreamUrl));
      if (url.pathname === '/api/running') return json(res, 200, await getRunning(upstreamUrl));
      if (url.pathname === '/api/missions') return json(res, 200, await getMissions(upstreamUrl));
      if (url.pathname === '/api/events/snapshot') return json(res, 200, await getEventSnapshot(upstreamUrl));
      if (url.pathname === '/api/loadouts') return json(res, 200, await getLoadouts(upstreamUrl));
      if (url.pathname === '/api/index/status' && req.method === 'GET') return json(res, 200, await getIndexStatus());
      if (url.pathname === '/api/index/query' && req.method === 'GET') {
        const result = await queryIndex(url);
        return json(res, result.status, result.body);
      }
      if (url.pathname === '/api/index/rebuild' && req.method === 'POST') {
        const result = await rebuildIndex(req);
        return json(res, result.status, result.body);
      }
      if (url.pathname === '/api/audit' && req.method === 'GET') {
        const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 50)));
        return json(res, 200, { source: 'cockpit-bridge-audit/v1', audit: await readAudit({ limit }) });
      }
      if (url.pathname === '/api/audit/intent' && req.method === 'POST') {
        const parsed = await readJsonBody(req);
        if (parsed.error) return json(res, 400, { error: parsed.error });
        const body = parsed.body || {};
        const event = typeof body.event === 'string' && body.event.trim() ? body.event.trim() : 'operator.intent';
        const entry = await appendAudit(event, { detail: body.detail ?? body });
        return json(res, 201, entry);
      }
      let m;
      if (url.pathname === '/api/instances' && req.method === 'POST') {
        const parsed = await readJsonBody(req);
        if (parsed.error) return json(res, 400, { error: parsed.error });
        const payload = parsed.body;
        if (payload.runtime === 'qemu') {
          const sshKey = expandHome(String(payload.ssh_key ?? payload.sshKey ?? '').trim()) || defaultSshPublicKey();
          if (!sshKey) {
            return json(res, 400, {
              error: 'ssh_public_key_required',
              message: 'VM / QEMU launch requires an SSH public key path on the executor host.',
              detail: 'Create ~/.ssh/agentic_ed25519.pub or pass ssh_key in the launch request.',
            });
          }
          if (!existsSync(sshKey)) {
            return json(res, 400, {
              error: 'ssh_public_key_not_found',
              message: `SSH public key not found at ${sshKey}`,
              detail: 'Choose an existing public key path on the executor host.',
            });
          }
          payload.ssh_key = sshKey;
        }
        const requestBody = JSON.stringify(payload);
        const before = await appendAudit('instance.launch.requested', {
          runtime: payload.runtime,
          name: payload.name,
          loadout: payload.loadout,
          start: payload.start,
        });
        const result = await fetchJsonFirst([
          {
            target: `${upstreamUrl}/api/v2/admin/instances`,
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: requestBody,
          },
        ]).catch((err) => ({ status: 502, body: { error: 'bridge_upstream_error', message: String(err?.message ?? err) } }));
        await appendAudit('instance.launch.result', { request_ts: before.ts, status: result.status, result: result.body });
        return json(res, result.status, result.body);
      }
      if ((m = url.pathname.match(/^\/api\/operations\/([^/]+)$/)) && req.method === 'GET') {
        return proxyFirst(res, [
          `${upstreamUrl}/api/v2/admin/operations/${encodeURIComponent(m[1])}`,
        ]);
      }
      if (url.pathname === '/api/sessions') {
        const inst = url.searchParams.get('instance');
        if (!inst) return json(res, 400, { error: 'instance_required' });
        return json(res, 200, await getSessions(upstreamUrl, inst));
      }
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/sessions\/([^/]+)$/)) && req.method === 'DELETE') {
        const { status, body } = await endSession(upstreamUrl, decodeURIComponent(m[1]), decodeURIComponent(m[2]));
        return json(res, status, body);
      }
      // registry-bound, data-driven core — live, no app restart (#1592)
      if (url.pathname === '/api/capabilities') {
        const q = (url.searchParams.get('q') || '').trim();
        if (!q) return json(res, 400, { error: 'q_required' });
        const rawLimit = url.searchParams.get('limit') ?? '8';
        const limit = Number(rawLimit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
          return json(res, 400, { error: 'invalid_limit', detail: 'limit must be an integer from 1 to 50' });
        }
        const args = ['discover', q, '--json', '--limit', String(limit)];
        const type = url.searchParams.get('type');
        if (type && type !== 'all') {
          const types = type.split(',').map((t) => t.trim()).filter(Boolean);
          if (!types.length || types.some((t) => !CAPABILITY_TYPES.has(t))) {
            return json(res, 400, { error: 'invalid_type', detail: 'type must be all, skill, agent, command, rule, flow, or a comma list of those kinds' });
          }
          args.push('--type', types.join(','));
        }
        const data = JSON.parse(await runAiwg(args));
        data.results = (data.results || []).map((r) => ({
          ...r,
          name: r.name || (r.path ? deriveName(r.path) : ''),
        }));
        return json(res, 200, data);
      }
      if (url.pathname === '/api/show') {
        const type = url.searchParams.get('type');
        const name = url.searchParams.get('name');
        const wantPath = url.searchParams.get('path');
        // Preferred path: resolve by the discovered file path. Deterministic even when a
        // name is shared by two artifacts (#1643). discover always returns this path.
        if (wantPath) {
          const resolved = resolveCorpusPath(wantPath);
          if (!resolved) return json(res, 400, { error: 'path_outside_corpus' });
          try {
            const body = await readFile(resolved, 'utf8');
            return json(res, 200, { type, name: name ?? deriveName(resolved), path: resolved, body });
          } catch (e) {
            return json(res, 404, { error: 'artifact_not_found', detail: String(e?.message ?? e) });
          }
        }
        // Fallback: resolve by name via the CLI. Map ambiguity/not-found to 4xx — an
        // ambiguous name is operator-correctable input, never a Bridge 502.
        if (!type || !name) return json(res, 400, { error: 'type_name_or_path_required' });
        try {
          return json(res, 200, { type, name, body: await runAiwg(['show', type, name]) });
        } catch (e) {
          const detail = String(e?.message ?? e);
          const ambiguous = /ambiguous/i.test(detail);
          return json(res, ambiguous ? 409 : 404, {
            error: ambiguous ? 'ambiguous_artifact' : 'artifact_not_found',
            detail,
          });
        }
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
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/sessions$/)) && req.method === 'POST') {
        const id = decodeURIComponent(m[1]);
        const qs = new URLSearchParams();
        const mode = url.searchParams.get('mode'), backend = url.searchParams.get('backend'), loadout = url.searchParams.get('loadout');
        if (mode) qs.set('mode', mode);
        if (backend) qs.set('backend', backend);
        if (loadout) qs.set('loadout', loadout);
        const sessionAgentId = await resolveSessionAgentId(upstreamUrl, id);
        let sessionLaunch = defaultSessionLaunch();
        try {
          const inventory = await getInventory(upstreamUrl);
          sessionLaunch = defaultSessionLaunch(inventory.instances.find((inst) => inst.id === id));
        } catch {
          // Session creation can still proceed without an explicit cwd; the
          // executor/agent will fall back to its own process cwd.
        }
        const candidates = unique([sessionAgentId, id]).flatMap((agentId) => [
          {
            target: `${upstreamUrl}/api/v1/agents/${encodeURIComponent(agentId)}/sessions`,
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              session_backend: backend || 'tmux',
              session_class: mode || 'managed',
              command: sessionLaunch.command,
              args: sessionLaunch.args,
              ...(sessionLaunch.working_dir ? { working_dir: sessionLaunch.working_dir } : {}),
            }),
          },
          {
            target: `${upstreamUrl}/agents/${encodeURIComponent(agentId)}/sessions?${qs.toString()}`,
            method: 'POST',
          },
        ]);
        let sessionCreate;
        try {
          sessionCreate = await fetchJsonFirst(candidates);
        } catch (err) {
          return json(res, 409, {
            error: 'agent_not_registered',
            message: 'The instance is visible in inventory, but its agent has not registered yet; PTY sessions are not ready.',
            detail: String(err?.message ?? err),
          });
        }
        const { status, body } = sessionCreate;
        const wsBase = upstreamUrl.replace(/^http/i, 'ws');
        const sessionId = body.id ?? body.session_id ?? body.sessionId;
        if (status >= 200 && status < 300 && !sessionId && !body.attach_url && !body.attachUrl && !body.pty_ws_url && !body.ptyWsUrl) {
          return json(res, 502, { error: 'session_create_missing_id', message: 'executor created no attachable session identifier', body });
        }
        let attachUrl = body.attach_url ?? body.attachUrl;
        if (!attachUrl && (body.pty_ws_url ?? body.ptyWsUrl)) {
          try {
            const u = new URL(String(body.pty_ws_url ?? body.ptyWsUrl).replace('{host}', new URL(upstreamUrl).host));
            u.protocol = new URL(upstreamUrl).protocol === 'https:' ? 'wss:' : 'ws:';
            attachUrl = u.toString();
          } catch { /* fall through to legacy shape */ }
        }
        // Same as the list path (#1671): the attach segment must be the instance
        // id the executor's pty-ws route accepts, not the resolved agent name.
        await appendAudit('session.start.requested', { instance_id: id, mode: mode || 'managed', backend: backend || 'tmux', loadout, status, session_id: sessionId });
        return json(res, status, { ...body, id: sessionId, attach_url: attachUrl ?? `${wsBase}/agents/${encodeURIComponent(id)}/sessions/${encodeURIComponent(sessionId)}/attach` });
      }

      // --- management surface (UC-012): lifecycle + task cancel ---
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)\/(start|stop)$/)) && req.method === 'POST') {
        const result = await fetchJsonFirst([
          `${upstreamUrl}/admin/instances/${encodeURIComponent(m[1])}/${m[2]}`,
          `${upstreamUrl}/api/v2/admin/instances/${encodeURIComponent(m[1])}/${m[2]}`,
        ], { method: 'POST' }).catch((err) => ({ status: 502, body: { error: 'bridge_upstream_error', message: String(err?.message ?? err) } }));
        await appendAudit('instance.lifecycle.requested', { instance_id: decodeURIComponent(m[1]), action: m[2], status: result.status, result: result.body });
        return json(res, result.status, result.body);
      }
      if ((m = url.pathname.match(/^\/api\/instances\/([^/]+)$/)) && req.method === 'DELETE') {
        const { status, body } = await destroyInstance(upstreamUrl, decodeURIComponent(m[1]));
        await appendAudit('instance.destroy.requested', { instance_id: decodeURIComponent(m[1]), status, result: body });
        return json(res, status, body);
      }
      if ((m = url.pathname.match(/^\/api\/tasks\/([^/]+)\/([^/]+)\/cancel$/)) && req.method === 'POST') {
        await appendAudit('task.cancel.requested', { instance_id: decodeURIComponent(m[1]), task_id: decodeURIComponent(m[2]) });
        return proxy(res, 'POST', `${upstreamUrl}/agents/${encodeURIComponent(m[1])}/tasks/${encodeURIComponent(m[2])}:cancel`);
      }

      // --- approval inbox (UC-009) + cost (UC-010) ---
      if (url.pathname === '/api/approvals' && req.method === 'GET')
        return json(res, 200, await getApprovals(upstreamUrl, url.searchParams.get('status') || 'pending'));
      if ((m = url.pathname.match(/^\/api\/approvals\/([^/]+)$/)) && req.method === 'POST') {
        const approvalId = decodeURIComponent(m[1]);
        const decision = url.searchParams.get('decision') || '';
        const { status, body } = await respondApproval(upstreamUrl, approvalId, decision);
        await appendAudit('approval.response.submitted', { approval_id: approvalId, decision, status, result: body });
        return json(res, status, body);
      }
      if (url.pathname === '/api/cost' && req.method === 'GET')
        return proxy(res, 'GET', `${upstreamUrl}/admin/cost`);

      if (url.pathname === '/api/health') return json(res, 200, { status: 'ok', executor_url: upstreamUrl, mock_executor_allowed: allowMockExecutor });
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const distIndex = join(WEB_DIST, 'index.html');
        const src = existsSync(distIndex) ? distIndex : join(__dir, 'public', 'index.html');
        const raw = await readFile(src, 'utf8');
        // Inject the per-launch token so the same-origin app can call the gated API.
        const html = raw.replace('</head>', `<script>window.__COCKPIT_TOKEN__=${JSON.stringify(TOKEN)}</script>\n</head>`);
        // never cache the shell — it must always reference the latest hashed bundle
        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache',
          'set-cookie': `cockpit_csrf=${TOKEN}; Path=/; SameSite=Strict`,
        });
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

// The agentic-sandbox canonical dev runner (`management/dev.sh`) binds
// 8120 (gRPC) / 8121 (WS) / 8122 (HTTP). The Bridge must NOT default into that
// range or it squats on the executor's own ports (#1634). Default off-range and
// refuse to silently start on a reserved port.
export const EXECUTOR_RESERVED_PORTS = [8120, 8121, 8122];
export const DEFAULT_BRIDGE_PORT = 8140;

/** Resolve the Bridge listen port from the environment with a sane, off-range
 *  default. Throws on an invalid port or a collision with the executor range. */
export function resolveBridgePort(env = process.env) {
  const raw = env.PORT ?? env.AIWG_COCKPIT_BRIDGE_PORT;
  const port = raw === undefined || raw === '' ? DEFAULT_BRIDGE_PORT : Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid Bridge port: ${JSON.stringify(raw)} (set PORT to a number 1-65535).`);
  }
  if (EXECUTOR_RESERVED_PORTS.includes(port)) {
    throw new Error(
      `Bridge port ${port} collides with the agentic-sandbox canonical range ` +
      `(${EXECUTOR_RESERVED_PORTS.join('/')} = gRPC/WS/HTTP). The executor needs that ` +
      `range — pick another port (default ${DEFAULT_BRIDGE_PORT}).`,
    );
  }
  return port;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = resolveBridgePort();
  await ensureExecutor(EXECUTOR_URL);
  const server = createBridge();
  server.listen(port, '127.0.0.1', async () => {
    try {
      const file = await writeRuntimeToken({ token: server.cockpitToken, port, pid: process.pid });
      console.log(`[cockpit-bridge] http://127.0.0.1:${port}  (executor ${EXECUTOR_URL})`);
      console.log(`  token written ${file} (mode 600) — open the URL in a browser or attach a shell`);
    } catch (err) {
      console.error(`[cockpit-bridge] failed to persist runtime token: ${String(err?.message ?? err)}`);
      server.close(() => process.exit(1));
    }
  });
}
