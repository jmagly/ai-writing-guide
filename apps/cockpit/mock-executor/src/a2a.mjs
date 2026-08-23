// A2A v1.0.0 REST surface for the mock per-instance executor (increment 3).
// Implements the ops the conformance harness exercises:
//   POST /messages:send        -> Task (idempotent by messageId; A2A-Extensions echo)
//   GET  /tasks                 -> { tasks: [...] }
//   GET  /tasks/:id             -> Task | 404 problem+json
//   POST /tasks/:id:cancel      -> Task (state=canceled)
//   GET  /tasks/:id/subscribe   -> SSE, initial Task event
// Extensions wired: runtime/v1 (Task.metadata runtime.*), multi-tenant/v1
// (tenant_id charset validation + echo), idempotency/v1 (replay + 422).
import { randomUUID, createHash } from 'node:crypto';
import { EXT } from './agent-card.mjs';
import { listInstances } from './store.mjs';

const TENANT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

// Per-instance task + idempotency state.
const tasksByInstance = new Map(); // instanceId -> Map<taskId, Task>
const idemByInstance = new Map();  // instanceId -> Map<messageId, { bodyHash, body }>
function tasksOf(id) { if (!tasksByInstance.has(id)) tasksByInstance.set(id, new Map()); return tasksByInstance.get(id); }
function idemOf(id) { if (!idemByInstance.has(id)) idemByInstance.set(id, new Map()); return idemByInstance.get(id); }

function send(res, status, obj, headers = {}, protocolVersion = '0.3') {
  const mediaType = protocolVersion === '1.0' ? 'application/a2a+json' : 'application/json';
  res.writeHead(status, { 'content-type': mediaType, 'access-control-allow-origin': '*', ...headers });
  res.end(JSON.stringify(obj));
}
function problem(res, status, code, detail, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/problem+json' });
  res.end(JSON.stringify({ type: 'about:blank', title: code, status, code, detail, ...extra }));
}
function activatedExtensions(req) {
  const hdr = req.headers['a2a-extensions'];
  return hdr ? { 'A2A-Extensions': Array.isArray(hdr) ? hdr.join(', ') : hdr } : {};
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

export async function handleSend(req, res, instanceId, inst, protocolVersion = '0.3') {
  const raw = await readBody(req);
  let body;
  try { body = JSON.parse(raw); } catch { return problem(res, 400, 'request.invalid_params', 'malformed JSON body'); }
  const message = body?.message;
  if (!message || typeof message !== 'object') return problem(res, 400, 'request.invalid_params', 'message required', { field: 'message' });
  const decoded = decodeMessage(message, protocolVersion);
  if (!decoded.ok) return problem(res, 400, 'request.invalid_params', decoded.error);

  const meta = (message.metadata && typeof message.metadata === 'object') ? message.metadata : {};
  let tenant = 'default';
  if (meta.tenant_id !== undefined) {
    if (typeof meta.tenant_id !== 'string' || !TENANT_RE.test(meta.tenant_id)) {
      return problem(res, 400, 'request.invalid_params', 'invalid tenant_id', { field: 'metadata.tenant_id' });
    }
    tenant = meta.tenant_id;
  }

  const messageId = decoded.message.messageId;
  const idem = idemOf(instanceId);
  const idempotencyKey = `${protocolVersion}:${messageId}`;
  const bodyHash = createHash('sha256').update(protocolVersion).update('\0').update(raw).digest('hex');
  if (messageId && idem.has(idempotencyKey)) {
    const cached = idem.get(idempotencyKey);
    if (cached.bodyHash === bodyHash) {
      return res.writeHead(200, { 'content-type': protocolVersion === '1.0' ? 'application/a2a+json' : 'application/json', 'Idempotent-Replayed': 'true', ...activatedExtensions(req) }).end(cached.body);
    }
    return problem(res, 422, 'idempotency.key_reused', 'messageId reused with a different body', { field: 'message.messageId' });
  }

  // A 1.0 HITL continuation is a Message associated with the existing Task,
  // not the legacy task-specific :respond operation.
  const approvalDecision = meta.approval_decision ?? meta.hitl_response?.decision;
  if (protocolVersion === '1.0' && typeof message.taskId === 'string' && approvalDecision !== undefined) {
    const task = tasksOf(instanceId).get(message.taskId);
    if (!task) return problem(res, 404, 'task.not_found', `no task ${message.taskId}`, { task_id: message.taskId });
    if (task.status.state !== 'input-required') return problem(res, 409, 'unsupported_operation', `task is ${task.status.state}`);
    if (approvalDecision !== 'approve' && approvalDecision !== 'deny') {
      return problem(res, 400, 'request.invalid_params', 'decision must be approve|deny');
    }
    task.status = {
      state: approvalDecision === 'approve' ? 'completed' : 'rejected',
      timestamp: new Date().toISOString(),
      terminal_at: new Date().toISOString(),
    };
    task.metadata.hitl_response = { decision: approvalDecision };
    task.artifacts.push({ artifactId: `hitl-${task.id}`, name: 'HITL decision', parts: [{ type: 'text', text: approvalDecision }] });
    const out = JSON.stringify({ task: encodeTask(task, protocolVersion) });
    if (messageId) idem.set(idempotencyKey, { bodyHash, body: out });
    return res.writeHead(200, { 'content-type': 'application/a2a+json', ...activatedExtensions(req) }).end(out);
  }

  const task = createTaskFor(instanceId, inst, { messageId, parts: decoded.message.parts, tenant });
  const responseBody = protocolVersion === '1.0' ? { task: encodeTask(task, protocolVersion) } : encodeTask(task, protocolVersion);
  const out = JSON.stringify(responseBody);
  if (messageId) idem.set(idempotencyKey, { bodyHash, body: out });
  res.writeHead(200, { 'content-type': protocolVersion === '1.0' ? 'application/a2a+json' : 'application/json', ...activatedExtensions(req) }).end(out);
}

// Core task creation/lookup, reused by the HTTP and pty-ws surfaces.
export function createTaskFor(instanceId, inst, { messageId, parts = [], tenant = 'default' }) {
  const taskId = randomUUID();
  const now = new Date().toISOString();
  const userMsg = { messageId: messageId || randomUUID(), role: 'user', parts, metadata: { tenant_id: tenant }, taskId, contextId: taskId };
  const task = {
    id: taskId,
    contextId: taskId,
    status: { state: 'working', timestamp: now },
    history: [userMsg],
    artifacts: [],
    metadata: { 'runtime.instance_id': instanceId, 'runtime.kind': inst.runtime, tenant_id: tenant },
  };
  tasksOf(instanceId).set(taskId, task);
  return task;
}

export function createHitlTaskFor(instanceId, inst, { messageId, prompt, risk = 'medium', tenant = 'default' }) {
  const task = createTaskFor(instanceId, inst, {
    messageId,
    parts: [{ type: 'text', text: prompt }],
    tenant,
  });
  task.status = {
    state: 'input-required',
    timestamp: new Date().toISOString(),
    message: {
      messageId: randomUUID(), role: 'agent', taskId: task.id, contextId: task.contextId,
      parts: [{ type: 'text', text: prompt }],
    },
  };
  task.metadata = {
    ...task.metadata,
    risk,
    hitl_prompt: { prompt, risk, schema: 'hitl-prompt/v1' },
  };
  return task;
}
export function getTaskFor(instanceId, taskId) { return tasksOf(instanceId).get(taskId) ?? null; }

export function handleGetTask(req, res, instanceId, taskId, protocolVersion = '0.3') {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  return send(res, 200, encodeTask(task, protocolVersion), activatedExtensions(req), protocolVersion);
}

export function handleListTasks(req, res, instanceId, protocolVersion = '0.3') {
  return send(res, 200, { tasks: [...tasksOf(instanceId).values()].map(task => encodeTask(task, protocolVersion)) }, activatedExtensions(req), protocolVersion);
}

export function handleCancel(req, res, instanceId, taskId, protocolVersion = '0.3') {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  const terminal = ['completed', 'canceled', 'failed', 'rejected'];
  if (terminal.includes(task.status.state)) return problem(res, 409, 'unsupported_operation', `task already ${task.status.state}`);
  task.status = { state: 'canceled', timestamp: new Date().toISOString(), terminal_at: new Date().toISOString() };
  const encoded = encodeTask(task, protocolVersion);
  return send(res, 200, protocolVersion === '1.0' ? { task: encoded } : encoded, {}, protocolVersion);
}

export async function handleRespond(req, res, instanceId, taskId, protocolVersion = '0.3') {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  if (task.status.state !== 'input-required') return problem(res, 409, 'unsupported_operation', `task is ${task.status.state}`);
  const raw = await readBody(req);
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return problem(res, 400, 'request.invalid_params', 'malformed JSON body'); }
  const decision = body.decision ?? body.response?.metadata?.approval_decision ?? body.message?.metadata?.approval_decision;
  if (decision !== 'approve' && decision !== 'deny') return problem(res, 400, 'request.invalid_params', 'decision must be approve|deny');
  task.status = {
    state: decision === 'approve' ? 'completed' : 'rejected',
    timestamp: new Date().toISOString(),
    terminal_at: new Date().toISOString(),
  };
  task.metadata.hitl_response = { decision };
  task.artifacts.push({ artifactId: `hitl-${taskId}`, name: 'HITL decision', parts: [{ type: 'text', text: decision }] });
  const encoded = encodeTask(task, protocolVersion);
  return send(res, 200, protocolVersion === '1.0' ? { task: encoded } : encoded, {}, protocolVersion);
}

export function handleSubscribe(req, res, instanceId, taskId, protocolVersion = '0.3') {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const encoded = encodeTask(task, protocolVersion);
  res.write(protocolVersion === '1.0'
    ? `data: ${JSON.stringify({ task: encoded })}\n\n`
    : `event: task-state\ndata: ${JSON.stringify({ kind: 'task-state', task: encoded })}\n\n`);
  const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* closed */ } }, 15000);
  req.on('close', () => clearInterval(hb));
}

// Seed one working task per running instance so the Cockpit running board has content.
export function seedRunningTasks() {
  for (const inst of listInstances()) {
    if (inst.state !== 'running') continue;
    const tasks = [...tasksOf(inst.instance_id).values()];
    if (!tasks.some((t) => t.status.state === 'working')) {
      createTaskFor(inst.instance_id, inst, { messageId: `seed-${inst.instance_id}`, parts: [{ type: 'text', text: 'session active' }] });
    }
    if (inst.runtime === 'vm' && !tasks.some((t) => t.status.state === 'input-required')) {
      createHitlTaskFor(inst.instance_id, inst, {
        messageId: `seed-hitl-${inst.instance_id}`,
        prompt: 'Deploy to production (security-audit stack)?',
        risk: 'high',
      });
    }
  }
}

const V1_STATE = {
  submitted: 'TASK_STATE_SUBMITTED', working: 'TASK_STATE_WORKING', completed: 'TASK_STATE_COMPLETED',
  failed: 'TASK_STATE_FAILED', canceled: 'TASK_STATE_CANCELED', 'input-required': 'TASK_STATE_INPUT_REQUIRED',
  rejected: 'TASK_STATE_REJECTED', 'auth-required': 'TASK_STATE_AUTH_REQUIRED',
};

function decodeMessage(message, protocolVersion) {
  const expectedRole = protocolVersion === '1.0' ? 'ROLE_USER' : 'user';
  if (message.role !== expectedRole || typeof message.messageId !== 'string' || !Array.isArray(message.parts) || !message.parts.length) {
    return { ok: false, error: `message must use ${protocolVersion} role and required fields` };
  }
  const parts = [];
  for (const part of message.parts) {
    if (!part || typeof part !== 'object') return { ok: false, error: 'part must be an object' };
    if (protocolVersion === '1.0') {
      if ('kind' in part) return { ok: false, error: '1.0 Part must not contain kind' };
      const members = ['text', 'raw', 'url', 'data'].filter(key => Object.hasOwn(part, key));
      if (members.length !== 1) return { ok: false, error: '1.0 Part requires exactly one content member' };
      const key = members[0];
      parts.push(key === 'text' ? { type: 'text', text: part.text }
        : key === 'data' ? { type: 'data', data: part.data }
          : { type: 'file', [key]: part[key], ...(part.mediaType ? { mediaType: part.mediaType } : {}), ...(part.filename ? { filename: part.filename } : {}) });
    } else {
      if (!['text', 'data', 'file'].includes(part.kind)) return { ok: false, error: '0.3 Part requires kind' };
      parts.push(part.kind === 'text' ? { type: 'text', text: part.text }
        : part.kind === 'data' ? { type: 'data', data: part.data }
          : { type: 'file', ...(part.bytes ? { raw: part.bytes } : { url: part.uri }), ...(part.mimeType ? { mediaType: part.mimeType } : {}) });
    }
  }
  return { ok: true, message: { messageId: message.messageId, parts } };
}

function encodeTask(task, protocolVersion) {
  const status = { ...task.status, state: protocolVersion === '1.0' ? V1_STATE[task.status.state] : task.status.state };
  if (task.status.message) {
    status.message = {
      ...task.status.message,
      role: protocolVersion === '1.0' ? 'ROLE_AGENT' : task.status.message.role,
      parts: task.status.message.parts.map(part => encodePart(part, protocolVersion)),
      ...(protocolVersion === '0.3' ? { kind: 'message' } : {}),
    };
  }
  return {
    id: task.id,
    contextId: task.contextId,
    status,
    history: task.history.map(message => ({
      ...message,
      role: protocolVersion === '1.0' ? 'ROLE_USER' : message.role,
      parts: message.parts.map(part => encodePart(part, protocolVersion)),
      ...(protocolVersion === '0.3' ? { kind: 'message' } : {}),
    })),
    artifacts: task.artifacts.map(artifact => ({ ...artifact, parts: artifact.parts.map(part => encodePart(part, protocolVersion)) })),
    metadata: task.metadata,
    ...(protocolVersion === '0.3' ? { kind: 'task' } : {}),
  };
}

function encodePart(part, protocolVersion) {
  if (protocolVersion === '1.0') {
    if (part.type === 'text') return { text: part.text, ...(part.mediaType ? { mediaType: part.mediaType } : {}) };
    if (part.type === 'data') return { data: part.data, ...(part.mediaType ? { mediaType: part.mediaType } : {}) };
    return { ...(part.raw ? { raw: part.raw } : { url: part.url }), ...(part.mediaType ? { mediaType: part.mediaType } : {}), ...(part.filename ? { filename: part.filename } : {}) };
  }
  if (part.type === 'text') return { kind: 'text', text: part.text };
  if (part.type === 'data') return { kind: 'data', data: part.data };
  return { kind: 'file', ...(part.raw ? { bytes: part.raw } : { uri: part.url }), ...(part.mediaType ? { mimeType: part.mediaType } : {}) };
}

// Test/UX helper: list working (running) tasks across instances.
export function runningTasks() {
  const out = [];
  for (const [instanceId, m] of tasksByInstance) {
    for (const t of m.values()) if (t.status.state === 'working') out.push({ instance_id: instanceId, task_id: t.id, state: t.status.state, tenant: t.metadata.tenant_id });
  }
  return out;
}
