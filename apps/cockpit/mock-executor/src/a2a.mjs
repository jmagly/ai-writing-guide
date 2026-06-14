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

const TENANT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

// Per-instance task + idempotency state.
const tasksByInstance = new Map(); // instanceId -> Map<taskId, Task>
const idemByInstance = new Map();  // instanceId -> Map<messageId, { bodyHash, body }>
function tasksOf(id) { if (!tasksByInstance.has(id)) tasksByInstance.set(id, new Map()); return tasksByInstance.get(id); }
function idemOf(id) { if (!idemByInstance.has(id)) idemByInstance.set(id, new Map()); return idemByInstance.get(id); }

function send(res, status, obj, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers });
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

export async function handleSend(req, res, instanceId, inst) {
  const raw = await readBody(req);
  let body;
  try { body = JSON.parse(raw); } catch { return problem(res, 400, 'request.invalid_params', 'malformed JSON body'); }
  const message = body?.message;
  if (!message || typeof message !== 'object') return problem(res, 400, 'request.invalid_params', 'message required', { field: 'message' });

  const meta = (message.metadata && typeof message.metadata === 'object') ? message.metadata : {};
  let tenant = 'default';
  if (meta.tenant_id !== undefined) {
    if (typeof meta.tenant_id !== 'string' || !TENANT_RE.test(meta.tenant_id)) {
      return problem(res, 400, 'request.invalid_params', 'invalid tenant_id', { field: 'metadata.tenant_id' });
    }
    tenant = meta.tenant_id;
  }

  const messageId = String(message.messageId ?? '');
  const idem = idemOf(instanceId);
  const bodyHash = createHash('sha256').update(raw).digest('hex');
  if (messageId && idem.has(messageId)) {
    const cached = idem.get(messageId);
    if (cached.bodyHash === bodyHash) {
      return res.writeHead(200, { 'content-type': 'application/json', 'Idempotent-Replayed': 'true', ...activatedExtensions(req) }).end(cached.body);
    }
    return problem(res, 422, 'idempotency.key_reused', 'messageId reused with a different body', { field: 'message.messageId' });
  }

  const task = createTaskFor(instanceId, inst, { messageId, parts: message.parts ?? [], tenant });
  const out = JSON.stringify(task);
  if (messageId) idem.set(messageId, { bodyHash, body: out });
  res.writeHead(200, { 'content-type': 'application/json', ...activatedExtensions(req) }).end(out);
}

// Core task creation/lookup, reused by the HTTP and pty-ws surfaces.
export function createTaskFor(instanceId, inst, { messageId, parts = [], tenant = 'default' }) {
  const taskId = randomUUID();
  const now = new Date().toISOString();
  const userMsg = { messageId: messageId || randomUUID(), role: 'user', parts, kind: 'message', metadata: { tenant_id: tenant }, taskId, contextId: taskId };
  const task = {
    id: taskId,
    contextId: taskId,
    status: { state: 'working', timestamp: now },
    history: [userMsg],
    artifacts: [],
    metadata: { 'runtime.instance_id': instanceId, 'runtime.kind': inst.runtime, tenant_id: tenant },
    kind: 'task',
  };
  tasksOf(instanceId).set(taskId, task);
  return task;
}
export function getTaskFor(instanceId, taskId) { return tasksOf(instanceId).get(taskId) ?? null; }

export function handleGetTask(req, res, instanceId, taskId) {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  return send(res, 200, task, activatedExtensions(req));
}

export function handleListTasks(req, res, instanceId) {
  return send(res, 200, { tasks: [...tasksOf(instanceId).values()] }, activatedExtensions(req));
}

export function handleCancel(req, res, instanceId, taskId) {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  const terminal = ['completed', 'canceled', 'failed', 'rejected'];
  if (terminal.includes(task.status.state)) return problem(res, 409, 'unsupported_operation', `task already ${task.status.state}`);
  task.status = { state: 'canceled', timestamp: new Date().toISOString(), terminal_at: new Date().toISOString() };
  return send(res, 200, task);
}

export function handleSubscribe(req, res, instanceId, taskId) {
  const task = tasksOf(instanceId).get(taskId);
  if (!task) return problem(res, 404, 'task.not_found', `no task ${taskId}`, { task_id: taskId });
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  res.write(`event: status-update\ndata: ${JSON.stringify(task)}\n\n`);
  const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* closed */ } }, 15000);
  req.on('close', () => clearInterval(hb));
}

// Test/UX helper: list working (running) tasks across instances.
export function runningTasks() {
  const out = [];
  for (const [instanceId, m] of tasksByInstance) {
    for (const t of m.values()) if (t.status.state === 'working') out.push({ instance_id: instanceId, task_id: t.id, state: t.status.state, tenant: t.metadata.tenant_id });
  }
  return out;
}
