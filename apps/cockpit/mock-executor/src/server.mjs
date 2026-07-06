#!/usr/bin/env node
// Mock agentic-sandbox A2A v2 executor.
//   Increment 1: per-instance AgentCard discovery (per-instance A2A surface).
//   Increment 2: admin REST — list/get instances (Surface 1, fleet).
// Grows toward A2A core + extensions + pty-ws per the contract; validated
// against roctinam/agentic-sandbox-conformance.
import http from 'node:http';
import { buildAgentCard } from './agent-card.mjs';
import { listInstances, getInstance, DEFAULT_INSTANCE, setInstanceState, destroyInstance, listApprovals, resolveApproval, costReport, listLoadouts } from './store.mjs';
import { handleSend, handleGetTask, handleListTasks, handleCancel, handleRespond, handleSubscribe, runningTasks, seedRunningTasks } from './a2a.mjs';
import { attachPtyWs, listSessions, seedDemoSessions, createSession } from './pty-ws.mjs';

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
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (path === '/health') return json(res, 200, { status: 'ok', surfaces: ['discovery', 'admin'] });

    // --- Admin surface (Surface 1): fleet instance inventory ---
    if (path === '/admin/instances' && req.method === 'GET') {
      return json(res, 200, { instances: listInstances() });
    }
    // lifecycle: start / stop / destroy (Cockpit management, UC-012)
    let lm;
    if ((lm = path.match(/^\/admin\/instances\/([^/]+)\/(start|stop)$/)) && req.method === 'POST') {
      const inst = setInstanceState(decodeURIComponent(lm[1]), lm[2] === 'start' ? 'running' : 'stopped');
      return inst ? json(res, 200, inst) : json(res, 404, { error: 'instance_not_found', instance_id: decodeURIComponent(lm[1]) });
    }
    const am = path.match(/^\/admin\/instances\/([^/]+)$/);
    if (am && req.method === 'DELETE') {
      const id = decodeURIComponent(am[1]);
      return destroyInstance(id) ? json(res, 200, { destroyed: id }) : json(res, 404, { error: 'instance_not_found', instance_id: id });
    }
    if (am && req.method === 'GET') {
      const inst = getInstance(decodeURIComponent(am[1]));
      return inst ? json(res, 200, inst) : json(res, 404, { error: 'instance_not_found', instance_id: decodeURIComponent(am[1]) });
    }

    // --- Admin: running tasks across instances (for the Cockpit running view) ---
    if (path === '/admin/running' && req.method === 'GET') return json(res, 200, { running: runningTasks() });

    // --- Loadout catalog (#1641) — real exposes /api/v1/loadouts; mock mirrors here ---
    if (path === '/admin/loadouts' && req.method === 'GET') return json(res, 200, { loadouts: listLoadouts() });

    // --- Admin: HITL approval queue (hitl-prompt/v1; UC-009) ---
    if (path === '/admin/approvals' && req.method === 'GET') return json(res, 200, { approvals: listApprovals(url.searchParams.get('status') || undefined) });
    let pm2;
    if ((pm2 = path.match(/^\/admin\/approvals\/([^/]+)$/)) && req.method === 'POST') {
      const decision = url.searchParams.get('decision');
      if (decision !== 'approve' && decision !== 'deny') return json(res, 400, { error: 'decision must be approve|deny' });
      const a = resolveApproval(decodeURIComponent(pm2[1]), decision);
      return a ? json(res, 200, a) : json(res, 409, { error: 'no_pending_approval', id: decodeURIComponent(pm2[1]) });
    }

    // --- Admin: cost / quota rollup (UC-010) ---
    if (path === '/admin/cost' && req.method === 'GET') return json(res, 200, costReport());

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
      if (rest === 'sessions' && req.method === 'GET') return json(res, 200, { sessions: listSessions(instanceId) });
      if (rest === 'sessions' && req.method === 'POST') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = raw ? JSON.parse(raw) : {};
        return json(res, 201, createSession(instanceId, {
          mode: body.session_class || url.searchParams.get('mode') || undefined,
          backend: body.session_backend || url.searchParams.get('backend') || undefined,
          sessionName: body.session_name || body.sessionName,
        }));
      }
      if (rest === 'tasks' && req.method === 'GET') return handleListTasks(req, res, instanceId);
      let tm;
      if ((tm = rest.match(/^tasks\/(.+):cancel$/)) && req.method === 'POST') return handleCancel(req, res, instanceId, decodeURIComponent(tm[1]));
      if ((tm = rest.match(/^tasks\/(.+):respond$/)) && req.method === 'POST') return handleRespond(req, res, instanceId, decodeURIComponent(tm[1]));
      if ((tm = rest.match(/^tasks\/([^/]+)\/subscribe$/)) && req.method === 'GET') return handleSubscribe(req, res, instanceId, decodeURIComponent(tm[1]));
      if ((tm = rest.match(/^tasks\/([^/:]+)$/)) && req.method === 'GET') return handleGetTask(req, res, instanceId, decodeURIComponent(tm[1]));
    }

    return notFound(res, path);
  });
  seedRunningTasks();   // running board has content
  seedDemoSessions();   // one demo pty session with a transcript
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
