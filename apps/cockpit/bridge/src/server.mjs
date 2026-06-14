#!/usr/bin/env node
// AIWG Cockpit Bridge — dev skeleton.
// Reads instance inventory from the agentic-sandbox (mock) admin surface and
// serves a minimal screen. This is the first end-to-end data path:
//   mock executor (admin REST) -> Bridge (/api/inventory) -> screen.
// Real Bridge grows: registry/discover/index binding, per-instance A2A, pty I/O,
// per-launch token + OS-keychain (roctinam/aiwg#1595).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MOCK_URL = process.env.MOCK_URL ?? 'http://127.0.0.1:8122';
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

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
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

export function createBridge({ mockUrl = MOCK_URL } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    try {
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
      if (url.pathname === '/api/health') return json(res, 200, { status: 'ok', mock: mockUrl });
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const html = await readFile(join(__dir, 'public', 'index.html'), 'utf8');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      json(res, 404, { error: 'not_found', path: url.pathname });
    } catch (err) {
      json(res, 502, { error: 'bridge_upstream_error', message: String(err?.message ?? err) });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8120);
  createBridge().listen(port, '127.0.0.1', () => {
    console.log(`[cockpit-bridge] http://127.0.0.1:${port}  (reading ${MOCK_URL})`);
  });
}
