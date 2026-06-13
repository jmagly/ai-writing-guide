#!/usr/bin/env node
// Mock agentic-sandbox A2A v2 executor.
//   Increment 1: per-instance AgentCard discovery (per-instance A2A surface).
//   Increment 2: admin REST — list/get instances (Surface 1, fleet).
// Grows toward A2A core + extensions + pty-ws per the contract; validated
// against roctinam/agentic-sandbox-conformance.
import http from 'node:http';
import { buildAgentCard } from './agent-card.mjs';
import { listInstances, getInstance, DEFAULT_INSTANCE } from './store.mjs';

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...extraHeaders });
  res.end(JSON.stringify(body, null, 2));
}
function echoExtensions(req) {
  const hdr = req.headers['a2a-extensions'];
  return hdr ? { 'A2A-Extensions': Array.isArray(hdr) ? hdr.join(', ') : hdr } : {};
}
function notFound(res, path) {
  return json(res, 404, { jsonrpc: '2.0', id: null, error: { code: -32601, message: 'Not implemented in this increment', data: { path } } });
}

export function createExecutor() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (path === '/health') return json(res, 200, { status: 'ok', surfaces: ['discovery', 'admin'] });

    // --- Admin surface (Surface 1): fleet instance inventory ---
    if (path === '/admin/instances' && req.method === 'GET') {
      return json(res, 200, { instances: listInstances() });
    }
    const am = path.match(/^\/admin\/instances\/([^/]+)$/);
    if (am && req.method === 'GET') {
      const inst = getInstance(decodeURIComponent(am[1]));
      return inst ? json(res, 200, inst) : json(res, 404, { error: 'instance_not_found', instance_id: decodeURIComponent(am[1]) });
    }

    // --- Per-instance A2A surface: AgentCard discovery ---
    const dm = path.match(/^\/agents\/([^/]+)\/\.well-known\/agent-card\.json$/);
    if (dm && req.method === 'GET') {
      const instanceId = decodeURIComponent(dm[1]);
      const inst = getInstance(instanceId);
      if (!inst) return json(res, 404, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Instance not found', data: { instance_id: instanceId } } });
      const baseUrl = `${url.protocol}//${req.headers.host}/agents/${encodeURIComponent(instanceId)}`;
      return json(res, 200, buildAgentCard(instanceId, { baseUrl, runtime: inst.runtime, loadout: inst.loadout }), echoExtensions(req));
    }

    return notFound(res, path);
  });
}

export { DEFAULT_INSTANCE };

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8122);
  createExecutor().listen(port, '127.0.0.1', () => {
    console.log(`[cockpit-mock-executor] http://127.0.0.1:${port}`);
    console.log(`  admin:     GET /admin/instances`);
    console.log(`  discovery: GET /agents/${DEFAULT_INSTANCE}/.well-known/agent-card.json`);
  });
}
