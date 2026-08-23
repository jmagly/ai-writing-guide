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
import { attachPtyWs, listSessions, seedDemoSessions, createSession, getSessionScreen } from './pty-ws.mjs';

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

function a2aProblem(res, status, type, title, detail, extra = {}) {
  return json(res, status, { type, title, status, detail, ...extra }, { 'content-type': 'application/problem+json' });
}

function validateA2ARequest(req, res, protocolVersion, protocolMode) {
  if (protocolMode !== 'dual' && protocolMode !== protocolVersion) {
    a2aProblem(res, 400, 'https://a2a-protocol.org/errors/version-not-supported', 'Protocol Version Not Supported', `mock is running in ${protocolMode} mode`, { supportedVersions: [protocolMode] });
    return false;
  }
  const header = req.headers['a2a-version'];
  const selected = Array.isArray(header) ? header[0] : header;
  if (protocolVersion === '1.0' && selected !== '1.0') {
    a2aProblem(res, 400, 'https://a2a-protocol.org/errors/version-not-supported', 'Protocol Version Not Supported', 'A2A 1.0 requires A2A-Version: 1.0', { supportedVersions: protocolMode === 'dual' ? ['1.0', '0.3'] : ['1.0'] });
    return false;
  }
  if (protocolVersion === '0.3' && selected && !String(selected).startsWith('0.3')) {
    a2aProblem(res, 400, 'https://a2a-protocol.org/errors/version-not-supported', 'Protocol Version Not Supported', `legacy route does not support ${selected}`, { supportedVersions: ['0.3'] });
    return false;
  }
  if (protocolVersion === '1.0' && ['POST', 'PUT', 'PATCH'].includes(req.method ?? '')) {
    const mediaType = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    if (mediaType !== 'application/a2a+json') {
      a2aProblem(res, 415, 'https://a2a-protocol.org/errors/content-type-not-supported', 'Content Type Not Supported', 'A2A 1.0 mock requires application/a2a+json');
      return false;
    }
  }
  return true;
}

const operations = new Map();
let operationSeq = 1;

function acceptedOperation(kind, result = {}) {
  const id = `op-mock-${operationSeq++}`;
  const op = {
    id,
    kind,
    state: 'succeeded',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result,
  };
  operations.set(id, op);
  return op;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const RUNTIME_PROVIDERS = {
  default_provider: 'cloud-hypervisor',
  kinds: [
    { kind: 'host', label: 'Host', default_provider: 'host', providers: ['host'] },
    { kind: 'container', label: 'Container', default_provider: 'docker', providers: ['docker'] },
    { kind: 'vm', label: 'VM', default_provider: 'cloud-hypervisor', providers: ['cloud-hypervisor', 'libvirt'] },
  ],
  providers: [
    {
      provider: 'host',
      kind: 'host',
      label: 'Host runtime',
      platforms: ['linux/x64', 'linux/arm64', 'darwin/arm64'],
      architectures: ['x64', 'arm64'],
      capabilities: [],
      posture: { host_platform: 'darwin', host_architecture: 'arm64', available: true, reason: 'Apple Silicon developer package host runtime discovered.' },
    },
    {
      provider: 'docker',
      kind: 'container',
      label: 'Docker Desktop',
      platforms: ['linux/x64', 'linux/arm64', 'darwin/arm64'],
      architectures: ['x64', 'arm64'],
      engine: 'Docker Desktop',
      capabilities: [],
      posture: { host_platform: 'darwin', host_architecture: 'arm64', engine: 'Docker Desktop', available: true, reason: 'Docker Desktop runtime discovered on Apple Silicon.' },
    },
    {
      provider: 'cloud-hypervisor',
      kind: 'vm',
      label: 'Cloud Hypervisor',
      default: true,
      capabilities: [
        { id: 'instance.snapshot', label: 'Snapshot' },
        { id: 'instance.restore', label: 'Restore' },
        { id: 'instance.fork', label: 'Fork' },
        { id: 'warm_pool.manage', label: 'Warm pools' },
        { id: 'device.vfio', label: 'VFIO device passthrough' },
      ],
      capability_constraints: [{
        capability: 'device.vfio',
        excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        reason: 'VFIO-backed VMs cannot safely reuse memory state.',
      }],
    },
    {
      provider: 'libvirt',
      kind: 'vm',
      label: 'libvirt/QEMU',
      capabilities: [
        { id: 'instance.checkpoint', label: 'Checkpoint' },
        { id: 'instance.restore', label: 'Checkpoint restore' },
        { id: 'warm_pool.manage', label: 'Warm pools' },
      ],
    },
  ],
};

const MCP_DISCOVERY = {
  enabled: true,
  status: 'enabled',
  reason_code: null,
  endpoint: {
    path: '/mcp',
    methods: ['POST'],
    transport: 'streamable-http',
    stateless: true,
    get_behavior: '405_method_not_allowed',
    mcp_session_id: false,
  },
  protocol: {
    latest: '2025-11-25',
    supported: ['2025-03-26', '2025-06-18', '2025-11-25'],
  },
  auth: {
    scheme: 'bearer',
    required: true,
    principal_config: 'mcp-principals.toml',
    principals: [{ client_id: 'cockpit-test', scopes: ['fleet.read', 'session.read', 'output.read'] }],
    scopes: ['fleet.read', 'output.read', 'session.read'],
  },
  capabilities: {
    tools: { listChanged: false },
    resources: { subscribe: false, listChanged: false },
  },
  tools: [
    { name: 'list_sandboxes', title: 'List sandboxes', description: 'List the canonical management fleet inventory.' },
    { name: 'tail_output', title: 'Replay command output', description: 'Read bounded replay output for a command.' },
  ],
  resources: [
    { uri: 'sandbox://fleet', name: 'fleet', description: 'Current sandbox fleet inventory', mimeType: 'application/json' },
  ],
  resource_templates: [
    { uriTemplate: 'sandbox://instances/{instance_id}', name: 'sandbox-instance', mimeType: 'application/json' },
    { uriTemplate: 'sandbox://sessions/{session_id}/screen', name: 'session-screen', mimeType: 'application/json' },
  ],
  errors: [
    { http_status: 401, code: 'mcp.unauthorized', message: 'missing or invalid MCP bearer token' },
    { http_status: 403, jsonrpc_code: -32003, code: 'mcp.insufficient_scope', message: 'Insufficient scope' },
  ],
  notes: ['GET /mcp is not a session endpoint.'],
};

const BOOTSTRAP_READINESS = {
  status: 'secure',
  ca_provider: {
    configured: true,
    provider_ref: 'local-ca://cockpit-mock',
    trust_bundle_ref: 'trust-bundle://cockpit-mock/current',
    client_identity_ref: 'spiffe://sandbox.agentic.local/cockpit/mock',
    rotation_state: 'current',
    trust_bundle_fresh: true,
    expires_at: '2026-08-31T00:00:00.000Z',
  },
  bootstrap: {
    token_store_configured: true,
  },
  error_taxonomy: [
    { code: 'bootstrap.csr_invalid', recovery: 'Regenerate the CSR with the sandbox instance identity.' },
  ],
};

function fleetRecord(kind, childId, targetId, runtimeId, observedState, extra = {}) {
  return {
    document_type: 'workload',
    api_version: 'agentic-orchestration/v1',
    kind,
    lineage: {
      orchestrator_id: 'aiwg-cockpit-mock', mission_id: 'mission-fleet-demo', dispatch_id: `dispatch-${childId}`,
      idempotency_key: `idem-${childId}`, parent_id: 'mission-fleet-demo', child_id: childId,
      target_id: targetId, executor_id: `executor-${targetId}`, runtime_id: runtimeId,
      session_id: extra.session_id ?? null, task_id: extra.task_id ?? null, command_id: extra.command_id ?? null,
    },
    spec: {
      desired_state: 'running', capabilities: [],
      policy: { trust_tier: 'T1', isolation_kind: 'container' },
      budgets: { max_attempts: 3, timeout_seconds: 600 },
      ...(extra.schedule ? { schedule: extra.schedule } : {}),
    },
    status: {
      observed_state: observedState, revision: extra.revision ?? 1,
      last_seen: '2026-08-02T15:00:00.000Z', artifacts: extra.artifacts ?? [],
      ...(extra.health ? { health: extra.health } : {}),
      ...(extra.backpressure ? { backpressure: extra.backpressure } : {}),
    },
  };
}

const FLEET_INVENTORY = {
  document_type: 'inventory',
  api_version: 'agentic-orchestration/v1',
  inventory_revision: 12,
  generated_at: '2026-08-02T15:00:00.000Z',
  records: [
    fleetRecord('persistent-agent', 'child-agent', 'target-1', 'runtime-container-1', 'retained', { session_id: 'session-agent-1', task_id: 'task-agent-1', revision: 4 }),
    fleetRecord('daemon', 'child-daemon', 'target-2', 'runtime-host-1', 'healthy', { task_id: 'task-daemon-1', health: 'healthy', revision: 8 }),
    fleetRecord('one-shot-command', 'child-command', 'target-3', 'runtime-vm-1', 'blocked', {
      task_id: 'task-command-1', command_id: 'command-1', revision: 3,
      backpressure: { reason: 'approval', retryable: false },
    }),
  ],
};

export function createExecutor(options = {}) {
  const protocolMode = options.protocolMode ?? process.env.A2A_MOCK_PROTOCOL_MODE ?? '0.3';
  if (!['0.3', '1.0', 'dual'].includes(protocolMode)) throw new Error(`invalid A2A mock protocol mode: ${protocolMode}`);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (path === '/health') return json(res, 200, { status: 'ok', surfaces: ['discovery', 'admin'] });
    if (path === '/api/v2/admin/runtime/providers' && req.method === 'GET') return json(res, 200, RUNTIME_PROVIDERS);
    if (path === '/api/v2/admin/mcp/discovery' && req.method === 'GET') return json(res, 200, MCP_DISCOVERY);
    if (path === '/api/v2/admin/bootstrap/readiness' && req.method === 'GET') return json(res, 200, BOOTSTRAP_READINESS);
    if (path === '/api/v2/fleet/workloads' && req.method === 'GET') return json(res, 200, FLEET_INVENTORY);
    let opm;
    if ((opm = path.match(/^\/api\/v2\/admin\/operations\/([^/]+)$/)) && req.method === 'GET') {
      const op = operations.get(decodeURIComponent(opm[1]));
      return op ? json(res, 200, op) : json(res, 404, { error: 'operation_not_found', id: decodeURIComponent(opm[1]) });
    }
    if (path === '/api/v2/admin/cloud-hypervisor/snapshots' && req.method === 'POST') {
      const body = await readJson(req);
      return json(res, 202, acceptedOperation('instance.snapshot', {
        provider: 'cloud-hypervisor',
        snapshot_id: body.snapshot_id,
        vm: body.vm,
      }));
    }
    if (path === '/api/v2/admin/libvirt/checkpoints' && req.method === 'POST') {
      const body = await readJson(req);
      return json(res, 202, acceptedOperation('instance.snapshot', {
        provider: 'libvirt',
        checkpoint_id: body.checkpoint_id,
        vm: body.vm,
      }));
    }
    if (path === '/api/v2/admin/instances' && req.method === 'POST') {
      const body = await readJson(req);
      const strategy = body.runtime_options?.launch_strategy;
      if (strategy && strategy.mode !== 'cold') {
        const provider = body.provider ?? body.runtime_options?.provider ?? 'cloud-hypervisor';
        return json(res, 202, acceptedOperation(`instance.${strategy.mode}`, {
          provider,
          instance_id: `mock-${String(body.name ?? 'fast-start')}`,
          name: body.name,
          asset_ref: strategy.asset_ref,
          runtime: 'qemu',
        }));
      }
      return json(res, 202, acceptedOperation('instance.provision', {
        provider: body.provider ?? body.runtime_options?.provider,
        instance_id: `mock-${String(body.name ?? 'instance')}`,
        runtime: body.runtime,
      }));
    }

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
        return json(res, 200, buildAgentCard(instanceId, { baseUrl, runtime: inst.runtime, loadout: inst.loadout, protocolMode }), echoExtensions(req));
      }
      const legacyRest = rest.startsWith('v1/') ? rest.slice(3) : null;
      const isLegacySend = legacyRest === 'messages:send' && req.method === 'POST';
      const isV1Send = rest === 'message:send' && req.method === 'POST';
      if (isLegacySend || isV1Send) {
        const version = isV1Send ? '1.0' : '0.3';
        if (!validateA2ARequest(req, res, version, protocolMode)) return;
        return handleSend(req, res, instanceId, inst, version);
      }
      if ((legacyRest === 'extendedAgentCard' || legacyRest === 'card') && req.method === 'GET') {
        if (!validateA2ARequest(req, res, '0.3', protocolMode)) return;
        const baseUrl = `${url.protocol}//${req.headers.host}/agents/${encodeURIComponent(instanceId)}`;
        return json(res, 200, buildAgentCard(instanceId, { baseUrl, runtime: inst.runtime, loadout: inst.loadout, protocolMode }));
      }
      if (rest === 'extendedAgentCard' && req.method === 'GET') {
        if (!validateA2ARequest(req, res, '1.0', protocolMode)) return;
        const baseUrl = `${url.protocol}//${req.headers.host}/agents/${encodeURIComponent(instanceId)}`;
        return json(res, 200, buildAgentCard(instanceId, { baseUrl, runtime: inst.runtime, loadout: inst.loadout, protocolMode }));
      }
      if (rest === 'sessions' && req.method === 'GET') return json(res, 200, { sessions: listSessions(instanceId) });
      let sm;
      if ((sm = rest.match(/^sessions\/([^/]+)\/screen(?:-state)?$/)) && req.method === 'GET') {
        const screen = getSessionScreen(instanceId, decodeURIComponent(sm[1]));
        return screen ? json(res, 200, screen) : json(res, 404, { error: 'session_screen_not_found', session_id: decodeURIComponent(sm[1]) });
      }
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
      if ((legacyRest === 'tasks' || rest === 'tasks') && req.method === 'GET') {
        const version = legacyRest === 'tasks' ? '0.3' : '1.0';
        if (!validateA2ARequest(req, res, version, protocolMode)) return;
        return handleListTasks(req, res, instanceId, version);
      }
      let tm;
      const taskRest = legacyRest ?? rest;
      const taskVersion = legacyRest !== null ? '0.3' : '1.0';
      if ((tm = taskRest.match(/^tasks\/(.+?)(?::cancel|\/cancel)$/)) && req.method === 'POST') {
        if (!validateA2ARequest(req, res, taskVersion, protocolMode)) return;
        return handleCancel(req, res, instanceId, decodeURIComponent(tm[1]), taskVersion);
      }
      if ((tm = taskRest.match(/^tasks\/(.+):respond$/)) && req.method === 'POST') {
        if (!validateA2ARequest(req, res, taskVersion, protocolMode)) return;
        return handleRespond(req, res, instanceId, decodeURIComponent(tm[1]), taskVersion);
      }
      const subscribeMatch = taskVersion === '1.0'
        ? taskRest.match(/^tasks\/([^/:]+):subscribe$/)
        : taskRest.match(/^tasks\/([^/]+)\/subscribe$/);
      if (subscribeMatch && req.method === (taskVersion === '1.0' ? 'POST' : 'GET')) {
        if (!validateA2ARequest(req, res, taskVersion, protocolMode)) return;
        return handleSubscribe(req, res, instanceId, decodeURIComponent(subscribeMatch[1]), taskVersion);
      }
      if ((tm = taskRest.match(/^tasks\/([^/:]+)$/)) && req.method === 'GET') {
        if (!validateA2ARequest(req, res, taskVersion, protocolMode)) return;
        return handleGetTask(req, res, instanceId, decodeURIComponent(tm[1]), taskVersion);
      }
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
