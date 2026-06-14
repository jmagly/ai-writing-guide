#!/usr/bin/env node
// Mock agentic-sandbox A2A v2 executor.
//   Increment 1: per-instance AgentCard discovery (per-instance A2A surface).
//   Increment 2: admin REST — list/get instances (Surface 1, fleet).
// Grows toward A2A core + extensions + pty-ws per the contract; validated
// against roctinam/agentic-sandbox-conformance.
import http from 'node:http';
import { buildAgentCard } from './agent-card.mjs';
import { listInstances, getInstance, DEFAULT_INSTANCE } from './store.mjs';
import { handleSend, handleGetTask, handleListTasks, handleCancel, handleSubscribe, runningTasks } from './a2a.mjs';
import { attachPtyWs } from './pty-ws.mjs';

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
  const server = http.createServer((req, res) => {
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

    // --- Admin: running tasks across instances (for the Cockpit running view) ---
    if (path === '/admin/running' && req.method === 'GET') return json(res, 200, { running: runningTasks() });

    // --- Per-instance A2A surface ---
    const pm = path.match(/^\/agents\/([^/]+)\/(.+)$/);
    if (pm) {
      const instanceId = decodeURIComponent(pm[1]);
      const rest = pm[2];
      const inst = getInstance(instanceId);
      if (!inst) return json(res, 404, { error: 'instance_not_found', instance_id: instanceId }, { 'content-type': 'application/problem+json' });

      if (rest === '.well-known/agent-card.json' && req.method === 'GET') {
        const baseUrl = `${url.protocol}//${req.headers.host}/agents/${encodeURIComponent(instanceId)}`;
        return json(res, 200, buildAgentCard(instanceId, { baseUrl, runtime: inst.runtime, loadout: inst.loadout }), echoExtensions(req));
      }
      if (rest === 'messages:send' && req.method === 'POST') return handleSend(req, res, instanceId, inst);
      if (rest === 'tasks' && req.method === 'GET') return handleListTasks(req, res, instanceId);
      let tm;
      if ((tm = rest.match(/^tasks\/(.+):cancel$/)) && req.method === 'POST') return handleCancel(req, res, instanceId, decodeURIComponent(tm[1]));
      if ((tm = rest.match(/^tasks\/([^/]+)\/subscribe$/)) && req.method === 'GET') return handleSubscribe(req, res, instanceId, decodeURIComponent(tm[1]));
      if ((tm = rest.match(/^tasks\/([^/:]+)$/)) && req.method === 'GET') return handleGetTask(req, res, instanceId, decodeURIComponent(tm[1]));
    }

    return notFound(res, path);
  });
  return attachPtyWs(server);
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
