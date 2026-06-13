#!/usr/bin/env node
// AIWG Cockpit Bridge — dev skeleton.
// Reads instance inventory from the agentic-sandbox (mock) admin surface and
// serves a minimal screen. This is the first end-to-end data path:
//   mock executor (admin REST) -> Bridge (/api/inventory) -> screen.
// Real Bridge grows: registry/discover/index binding, per-instance A2A, pty I/O,
// per-launch token + OS-keychain (roctinam/aiwg#1595).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MOCK_URL = process.env.MOCK_URL ?? 'http://127.0.0.1:8122';

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

export function createBridge({ mockUrl = MOCK_URL } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    try {
      if (url.pathname === '/api/inventory') return json(res, 200, await getInventory(mockUrl));
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
