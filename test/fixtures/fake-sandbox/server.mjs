// Fake agentic-sandbox HTTP + WS harness.
//
// Mimics the agentic-sandbox management-server surface that `aiwg serve` and
// `tools/daemon/sandbox-transport.mjs` consume, so integration tests can drive
// the full stack without a live VM host.
//
// Scope: HTTP routes for /api/v1/tasks lifecycle, basic instance listing, and
// the WS streams (/ws/sandbox/:id for events, /ws/tasks/:id for PTY-like
// streams). Scenarios live alongside in scenarios/ and customize response
// timing, error injection, and event sequences.
//
// @issue #1173
// @related test/fixtures/sandbox-api/  (canonical wire-shape fixtures)

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

/**
 * @typedef {object} Task
 * @property {string} task_id
 * @property {'queued'|'running'|'completed'|'failed'|'cancelled'} state
 * @property {string} created_at
 * @property {string} [started_at]
 * @property {string} [ended_at]
 * @property {number} [exit_code]
 * @property {string[]} log
 * @property {object} manifest
 */

/**
 * @typedef {object} Scenario
 * @property {(req: object) => Promise<object | object[]> | object | object[]} [onTaskCreate]
 *   Override task creation. Default: accept and return queued task.
 * @property {(taskId: string) => 'running'|'completed'|'failed' | undefined} [taskAutoState]
 *   Auto-transition task state on each poll. Useful for happy-path.
 * @property {() => Array<object>} [listInstances]
 *   Override GET /api/v1/agents (instance list).
 * @property {AsyncGenerator<object> | object[]} [eventStream]
 *   Per-connection event stream. Re-instantiated for every new WS so events
 *   are not lost when no client is connected at startup. Pass a generator
 *   *function* if you need it called per-connect; pass a generator instance
 *   if you want it shared (legacy behaviour).
 * @property {() => AsyncGenerator<object> | object[]} [eventStreamFactory]
 *   Preferred over eventStream — called for each new WS so each subscriber
 *   gets its own iterator with deterministic ordering.
 * @property {{ pathPattern: { test: (path: string) => boolean }, status: number, body?: any }[]} [errorRoutes]
 *   Inject 4xx/5xx for matching request paths.
 * @property {(ws: any) => void} [onPartition]
 *   Called once per new connection; allow scenario to wrap ws.send to drop
 *   sockets mid-stream.
 * @property {(msg: object, ctx: { ws: any, path: string, state: object, send: (event: object) => void }) => void | Promise<void>} [onWsMessage]
 *   Called for each JSON WS message received by the fake sandbox.
 */

/**
 * Start a fake agentic-sandbox on an ephemeral 127.0.0.1 port.
 *
 * @param {object} [opts]
 * @param {Scenario} [opts.scenario]  Default: happy-path semantics.
 * @param {(msg: string, meta?: object) => void} [opts.logger]
 * @returns {Promise<{url: string, ws_url: string, port: number, stop: () => Promise<void>, server: any, scenario: Scenario, _state: {tasks: Map<string, Task>, instances: object[]}, _emit: (event: object) => void}>}
 */
export async function startFakeSandbox(opts = {}) {
  const scenario = opts.scenario || {};
  const log = opts.logger || (() => {});

  /** @type {Map<string, Task>} */
  const tasks = new Map();
  const instances = scenario.listInstances
    ? scenario.listInstances()
    : defaultInstances();

  const app = new Hono();

  // ── Error injection middleware ─────────────────────────────────
  app.use('*', async (c, next) => {
    const path = new URL(c.req.url).pathname;
    const hit = (scenario.errorRoutes || []).find(r => r.pathPattern.test(path));
    if (hit) {
      log('fake-sandbox:inject-error', { path, status: hit.status });
      return c.json(hit.body ?? { error: 'injected' }, hit.status);
    }
    return next();
  });

  // ── /api/v1/tasks — PTY task lifecycle ─────────────────────────
  app.post('/api/v1/tasks', async (c) => {
    let manifest;
    try { manifest = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }

    if (scenario.onTaskCreate) {
      const override = await scenario.onTaskCreate({ manifest });
      if (override && typeof override === 'object' && 'task_id' in override) {
        const task = makeTask(override);
        tasks.set(task.task_id, task);
        log('fake-sandbox:task-create', { taskId: task.task_id });
        return c.json({ task_id: task.task_id, state: task.state }, 201);
      }
    }

    const task = makeTask({ manifest });
    tasks.set(task.task_id, task);
    log('fake-sandbox:task-create', { taskId: task.task_id });
    return c.json({ task_id: task.task_id, state: task.state }, 201);
  });

  app.get('/api/v1/tasks', (c) => {
    const stateFilter = c.req.query('state');
    const all = [...tasks.values()];
    const filtered = stateFilter ? all.filter(t => t.state === stateFilter) : all;
    return c.json({ tasks: filtered.map(taskSummary) });
  });

  app.get('/api/v1/tasks/:id', (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    // Allow scenario-driven auto-state transitions
    if (scenario.taskAutoState) {
      const next = scenario.taskAutoState(task.task_id);
      if (next && next !== task.state) {
        task.state = next;
        if (next === 'running' && !task.started_at) task.started_at = new Date().toISOString();
        if (['completed', 'failed', 'cancelled'].includes(next) && !task.ended_at) {
          task.ended_at = new Date().toISOString();
          if (next === 'completed' && task.exit_code === undefined) task.exit_code = 0;
        }
      }
    }
    return c.json(taskSummary(task));
  });

  app.patch('/api/v1/tasks/:id', async (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }
    if (body.stdin) {
      task.log.push(`[stdin] ${String(body.stdin)}`);
    }
    log('fake-sandbox:task-patch', { taskId: task.task_id, hasStdin: Boolean(body.stdin) });
    return c.json({ ok: true });
  });

  app.delete('/api/v1/tasks/:id', (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    task.state = 'cancelled';
    task.ended_at = new Date().toISOString();
    log('fake-sandbox:task-cancel', { taskId: task.task_id });
    return c.json({ ok: true });
  });

  app.get('/api/v1/tasks/:id/logs', (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const slice = task.log.slice(offset);
    return c.json({
      task_id: task.task_id,
      offset,
      next_offset: offset + slice.length,
      lines: slice,
    });
  });

  // ── /api/v1/agents — instance list ────────────────────────────
  app.get('/api/v1/agents', (c) => {
    return c.json({ agents: instances });
  });

  // ── /api/v1/vms — VM lifecycle (#1146 dashboard proxy target) ─
  /** @type {Map<string, object>} */
  const vms = scenario.listVms ? new Map(scenario.listVms().map(v => [v.name, v])) : defaultVMs();

  app.get('/api/v1/vms', (c) => {
    const state = c.req.query('state');
    const prefix = c.req.query('prefix');
    let list = [...vms.values()];
    if (state) list = list.filter(v => v.state === state);
    if (prefix) list = list.filter(v => v.name.startsWith(prefix));
    return c.json({ vms: list });
  });

  app.get('/api/v1/vms/:name', (c) => {
    const vm = vms.get(c.req.param('name'));
    if (!vm) return c.json({ error: 'vm_not_found' }, 404);
    return c.json(vm);
  });

  for (const action of ['start', 'stop', 'restart', 'destroy', 'deploy-agent']) {
    app.post(`/api/v1/vms/:name/${action}`, async (c) => {
      const vm = vms.get(c.req.param('name'));
      if (!vm) return c.json({ error: 'vm_not_found' }, 404);
      const nextState = {
        start: 'running',
        stop: 'stopped',
        restart: 'running',
        destroy: 'destroyed',
        'deploy-agent': vm.state,
      }[action];
      vm.state = nextState;
      vm[`${action}_at`] = new Date().toISOString();
      if (action === 'deploy-agent') {
        const body = await c.req.json().catch(() => ({}));
        vm.deployedAgent = body.agent_id || body.name || 'unnamed';
      }
      log('fake-sandbox:vm-action', { name: vm.name, action, newState: nextState });
      return c.json({ ok: true, vm });
    });
  }

  app.delete('/api/v1/vms/:name', (c) => {
    const name = c.req.param('name');
    if (!vms.has(name)) return c.json({ error: 'vm_not_found' }, 404);
    vms.delete(name);
    log('fake-sandbox:vm-delete', { name });
    return c.json({ ok: true });
  });

  // POST /api/v1/vms — create a new VM (provision)
  app.post('/api/v1/vms', async (c) => {
    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }
    const name = body.name || `vm-${randomUUID().slice(0, 8)}`;
    const vm = {
      name,
      state: 'creating',
      runtime: 'qemu',
      profile: body.profile || body.loadout || 'default',
      created_at: new Date().toISOString(),
    };
    vms.set(name, vm);
    log('fake-sandbox:vm-create', { name });
    return c.json({ ok: true, vm }, 201);
  });

  // ── /api/v1/containers — Container lifecycle (parallel to /vms) ──
  /** @type {Map<string, object>} */
  const containers = scenario.listContainers
    ? new Map(scenario.listContainers().map(ct => [ct.name, ct]))
    : new Map();

  app.get('/api/v1/containers', (c) => c.json({ containers: [...containers.values()] }));
  app.get('/api/v1/containers/:name', (c) => {
    const ct = containers.get(c.req.param('name'));
    return ct ? c.json(ct) : c.json({ error: 'container_not_found' }, 404);
  });
  app.post('/api/v1/containers', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const name = body.name || `ct-${randomUUID().slice(0, 8)}`;
    const ct = { name, state: 'created', image: body.image || 'fake:latest' };
    containers.set(name, ct);
    return c.json({ ok: true, container: ct }, 201);
  });
  for (const action of ['start', 'stop']) {
    app.post(`/api/v1/containers/:name/${action}`, (c) => {
      const ct = containers.get(c.req.param('name'));
      if (!ct) return c.json({ error: 'container_not_found' }, 404);
      ct.state = action === 'start' ? 'running' : 'stopped';
      return c.json({ ok: true, container: ct });
    });
  }
  app.delete('/api/v1/containers/:name', (c) => {
    const name = c.req.param('name');
    if (!containers.has(name)) return c.json({ error: 'container_not_found' }, 404);
    containers.delete(name);
    return c.json({ ok: true });
  });

  // ── /api/sandboxes/register (legacy) ──────────────────────────
  app.post('/api/sandboxes/register', async (c) => {
    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }
    const sandboxId = body.sandbox_id || randomUUID();
    log('fake-sandbox:registered', { sandboxId });
    return c.json({ sandbox_id: sandboxId, token: `fake-${sandboxId.slice(0, 8)}` }, 201);
  });

  // ── /api/v1/aiwg/status ────────────────────────────────────────
  app.get('/api/v1/aiwg/status', (c) => {
    return c.json({ healthy: true, fake: true });
  });

  // ── HTTP server start ──────────────────────────────────────────
  /** @type {any} */
  let nodeServer;
  await new Promise((resolve, reject) => {
    try {
      nodeServer = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, (info) => {
        nodeServer._info = info;
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });

  const port = nodeServer._info?.port || (nodeServer.address && nodeServer.address().port);
  const url = `http://127.0.0.1:${port}`;
  const ws_url = `ws://127.0.0.1:${port}`;

  // ── WS server (manual upgrade so we can route by path) ────────
  const wss = new WebSocketServer({ noServer: true });
  /** Active WS connections, keyed by path. */
  const activeWS = new Map();

  // Hono's @hono/node-server doesn't expose .on('upgrade'). Hook the underlying
  // http server directly. Node-server returns the http.Server when configured.
  const httpServer = nodeServer.server || nodeServer;
  if (httpServer && typeof httpServer.on === 'function') {
    httpServer.on('upgrade', (req, socket, head) => {
      const path = (req.url || '').split('?')[0];
      // We accept any /ws/* path; the scenario decides what to emit.
      if (!path.startsWith('/ws/')) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        const conns = activeWS.get(path) || new Set();
        conns.add(ws);
        activeWS.set(path, conns);
        log('fake-sandbox:ws-open', { path });
        ws.on('close', () => {
          conns.delete(ws);
          log('fake-sandbox:ws-close', { path });
        });
        ws.on('message', async (raw) => {
          if (!scenario.onWsMessage) return;
          let msg;
          try {
            msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
          } catch {
            return;
          }
          const send = (event) => {
            if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(event));
          };
          try {
            await scenario.onWsMessage(msg, {
              ws,
              path,
              state: { tasks, instances, activeWS },
              send,
            });
          } catch (err) {
            log('fake-sandbox:ws-message-error', { error: String(err), path });
          }
        });
        // Allow scenarios to wrap ws.send (e.g., for partition simulation)
        scenario.onPartition?.(ws);
        // Drive a per-connection event stream so events are not lost when
        // there's no subscriber at startup.
        const factory = scenario.eventStreamFactory;
        const iterableSrc = factory ? factory() : scenario.eventStream;
        if (iterableSrc) {
          (async () => {
            try {
              for await (const event of iterableSrc) {
                if (ws.readyState !== 1 /* OPEN */) break;
                try { ws.send(JSON.stringify(event)); } catch { break; }
              }
            } catch (err) {
              log('fake-sandbox:event-stream-error', { error: String(err), path });
            }
          })();
        }
      });
    });
  }

  /** Broadcast an event to every connection matching `pathPrefix`. */
  function _emit(event, pathPrefix = '/ws/') {
    for (const [p, conns] of activeWS) {
      if (!p.startsWith(pathPrefix)) continue;
      for (const ws of conns) {
        try {
          if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(event));
        } catch {}
      }
    }
  }

  let streamAbort = false;

  async function stop() {
    streamAbort = true;
    // Close all WS connections
    for (const [, conns] of activeWS) {
      for (const ws of conns) {
        try { ws.close(1000, 'shutdown'); } catch {}
        try { ws.terminate?.(); } catch {}
      }
    }
    for (const ws of wss.clients) {
      try { ws.terminate?.(); } catch {}
    }
    activeWS.clear();
    try { wss.close(); } catch {}
    try { httpServer.closeAllConnections?.(); } catch {}
    try { httpServer.closeIdleConnections?.(); } catch {}
    await new Promise(r => {
      const timeout = setTimeout(() => r(), 250);
      try {
        httpServer.close(() => {
          clearTimeout(timeout);
          r();
        });
      } catch {
        clearTimeout(timeout);
        r();
      }
    });
    log('fake-sandbox:stopped', { port });
  }

  return {
    url,
    ws_url,
    port,
    stop,
    server: nodeServer,
    scenario,
    _state: { tasks, instances },
    _emit,
  };
}

function makeTask({ manifest, task_id, state }) {
  return {
    task_id: task_id || `task-${randomUUID().slice(0, 8)}`,
    state: state || 'queued',
    created_at: new Date().toISOString(),
    log: [],
    manifest: manifest || {},
  };
}

function taskSummary(task) {
  return {
    task_id: task.task_id,
    state: task.state,
    created_at: task.created_at,
    started_at: task.started_at,
    ended_at: task.ended_at,
    exit_code: task.exit_code,
  };
}

function defaultInstances() {
  return [
    {
      id: 'agent-01',
      name: 'fake-agent-01',
      runtime: 'claude-code',
      status: 'running',
      kind: 'agent',
    },
    {
      id: 'vm-01',
      name: 'fake-vm-01',
      runtime: 'qemu',
      status: 'running',
      kind: 'vm',
    },
    {
      id: 'container-01',
      name: 'fake-container-01',
      runtime: 'docker',
      status: 'running',
      kind: 'container',
    },
  ];
}

function defaultVMs() {
  return new Map([
    ['fake-vm-01', {
      name: 'fake-vm-01',
      state: 'stopped',
      runtime: 'qemu',
      profile: 'default',
      cpu: 2,
      memory_gb: 4,
      disk_gb: 20,
      ip: null,
    }],
  ]);
}
