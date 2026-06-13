#!/usr/bin/env node
// Mock agentic-sandbox A2A v2 executor — increment 1: per-instance AgentCard discovery.
// Surfaces grow per the contract: admin REST, per-instance A2A core + extensions,
// pty-ws/pty-extensions. Validated against roctinam/agentic-sandbox-conformance.
import http from 'node:http';
import { buildAgentCard } from './agent-card.mjs';

// In-memory instance store (admin-API provisioning lands in increment 2).
// A default instance exists so discovery works out of the box.
const DEFAULT_INSTANCE = process.env.MOCK_INSTANCE_ID ?? '550e8400-e29b-41d4-a716-446655440000';
const instances = new Map([[DEFAULT_INSTANCE, { runtime: 'container', loadout: 'agentic-dev' }]]);

function json(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': 'application/json', ...extraHeaders });
  res.end(payload);
}

// A2A extension activation: echo any activated extensions back on the response.
function echoExtensions(req) {
  const hdr = req.headers['a2a-extensions'];
  return hdr ? { 'A2A-Extensions': Array.isArray(hdr) ? hdr.join(', ') : hdr } : {};
}

export function createExecutor() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (path === '/health') return json(res, 200, { status: 'ok', surfaces: ['discovery'] });

    // Per-instance AgentCard discovery: GET /agents/:id/.well-known/agent-card.json
    const m = path.match(/^\/agents\/([^/]+)\/\.well-known\/agent-card\.json$/);
    if (m && req.method === 'GET') {
      const instanceId = decodeURIComponent(m[1]);
      const inst = instances.get(instanceId);
      if (!inst) {
        return json(res, 404, {
          jsonrpc: '2.0', id: null,
          error: { code: -32001, message: 'Instance not found', data: { instance_id: instanceId } },
        });
      }
      const baseUrl = `${url.protocol}//${req.headers.host}/agents/${encodeURIComponent(instanceId)}`;
      const card = buildAgentCard(instanceId, { baseUrl, runtime: inst.runtime, loadout: inst.loadout });
      return json(res, 200, card, echoExtensions(req));
    }

    return json(res, 404, {
      jsonrpc: '2.0', id: null,
      error: { code: -32601, message: 'Not implemented in this increment', data: { path } },
    });
  });
}

// Exported for tests / the admin layer (increment 2+).
export { instances, DEFAULT_INSTANCE };

// Run directly: `node src/server.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8122);
  createExecutor().listen(port, '127.0.0.1', () => {
    console.log(`[cockpit-mock-executor] listening on http://127.0.0.1:${port}`);
    console.log(`  AgentCard: http://127.0.0.1:${port}/agents/${DEFAULT_INSTANCE}/.well-known/agent-card.json`);
  });
}
