/**
 * ExecutorShim — local-executor conformance shim for DaemonSupervisor
 *
 * Wraps the existing DaemonSupervisor and exposes the executor contract v1
 * surface: register-on-start handshake, REST routes (dispatch/status/HITL/
 * pause/resume/abort), and the WS event-stream endpoint.
 *
 * This is `isolation:none` — the agent runs directly in the host process.
 * No sandboxing is performed; callers should understand the security model
 * before exposing this on non-loopback interfaces.
 *
 * Event translation (supervisor → executor vocabulary):
 *   loop:queued          → (held; emitted as mission.assigned when dispatch received)
 *   loop:started         → mission.started
 *   supervisor task:progress (simulated via progress ticks) → mission.progress
 *   loop:completed       → mission.completed
 *   loop:failed          → mission.failed
 *   (operator abort)     → mission.aborted
 *   HITL detector        → mission.hitl_required
 *   graceful shutdown    → mission.suspended for all in-flight missions
 *
 * @issue #1181
 * @see docs/contracts/executor.v1.md
 * @see schemas/executor-v1.json
 */

import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── HITL detector patterns (pluggable via addHitlPattern) ────────────────────

const DEFAULT_HITL_PATTERNS = [
  /\(y\/N\)/i,
  /\(yes\/no\)/i,
  /:\s*$/,
  /\?\s*$/,
  /Continue\?\s*/i,
  /Press Enter/i,
  /Do you want/i,
  /Are you sure/i,
  /\[y\/n\]/i,
];

// ── Platform detection ───────────────────────────────────────────────────────

function detectPlatformCapability() {
  const plat = os.platform();
  const arch = os.arch();

  // Map os.arch() values to executor contract vocab
  const archMap = { x64: 'x64', arm64: 'arm64', arm: 'arm' };
  const mappedArch = archMap[arch] ?? arch;

  // Detect WSL
  const isWsl = plat === 'linux' && (
    process.env.WSL_DISTRO_NAME ||
    process.env.WSLENV ||
    // Check /proc/version for Microsoft string
    (() => {
      try {
        const { readFileSync } = await_readFileSync('/proc/version');
        return readFileSync.includes('Microsoft');
      } catch { return false; }
    })()
  );

  if (isWsl) return `platform:wsl/${mappedArch}`;
  if (plat === 'darwin') return `platform:darwin/${mappedArch}`;
  if (plat === 'linux') return `platform:linux/${mappedArch}`;
  if (plat === 'win32') return `platform:win32/${mappedArch}`;
  return `platform:${plat}/${mappedArch}`;
}

// Sync version for module initialisation
function detectPlatformCapabilitySync() {
  const plat = os.platform();
  const arch = os.arch();
  const archMap = { x64: 'x64', arm64: 'arm64', arm: 'arm' };
  const mappedArch = archMap[arch] ?? arch;

  // WSL heuristic: linux + WSL env var
  const isWsl = plat === 'linux' && (
    !!process.env.WSL_DISTRO_NAME || !!process.env.WSLENV
  );

  if (isWsl) return `platform:wsl/${mappedArch}`;
  if (plat === 'darwin') return `platform:darwin/${mappedArch}`;
  if (plat === 'linux') return `platform:linux/${mappedArch}`;
  if (plat === 'win32') return `platform:win32/${mappedArch}`;
  return `platform:${plat}/${mappedArch}`;
}

const PLATFORM_CAPABILITY = detectPlatformCapabilitySync();

// ── ExecutorShim ─────────────────────────────────────────────────────────────

/**
 * ExecutorShim wraps a DaemonSupervisor instance and exposes the v1 executor
 * contract surface. One shim instance per local-executor serve process.
 *
 * @fires ExecutorShim#event:ws  — when an event should be streamed over WS
 */
export class ExecutorShim extends EventEmitter {
  /**
   * @param {object} opts
   * @param {object} opts.supervisor          DaemonSupervisor instance
   * @param {string} opts.executorId          Stable UUID for this executor
   * @param {string} opts.name                Human-readable name
   * @param {string} opts.version             Software version string
   * @param {string} opts.restBase            REST base URL as seen by aiwg-serve (e.g. http://127.0.0.1:8200)
   * @param {string} opts.wsBase              WS base URL as seen by aiwg-serve (e.g. ws://127.0.0.1:8200)
   * @param {string} opts.aiwgServeUrl        Registration target URL (e.g. http://127.0.0.1:7337)
   * @param {string[]} [opts.hitlPatterns]    Additional HITL regex patterns
   */
  constructor(opts) {
    super();

    if (!opts.supervisor) throw new Error('ExecutorShim: opts.supervisor is required');
    if (!opts.executorId) throw new Error('ExecutorShim: opts.executorId is required');

    this.supervisor    = opts.supervisor;
    this.executorId    = opts.executorId;
    this.name          = opts.name ?? 'aiwg-local-executor';
    this.version       = opts.version ?? '1.0.0';
    this.restBase      = opts.restBase;
    this.wsBase        = opts.wsBase;
    this.aiwgServeUrl  = opts.aiwgServeUrl;

    this.hitlPatterns  = [...DEFAULT_HITL_PATTERNS];
    if (opts.hitlPatterns) {
      for (const p of opts.hitlPatterns) {
        this.hitlPatterns.push(p instanceof RegExp ? p : new RegExp(p));
      }
    }

    /**
     * Live WS connections indexed by executorId (there will normally be one,
     * but support multiple for reconnect races).
     * @type {Set<WebSocket>}
     */
    this._wsClients = new Set();

    /**
     * Tracks in-flight missions.
     * missionId → { state, loopId, createdAt, updatedAt, recentEvents, pendingHitl }
     * @type {Map<string, MissionState>}
     */
    this._missions = new Map();

    /**
     * Maps loopId → missionId (reverse lookup for supervisor events).
     * @type {Map<string, string>}
     */
    this._loopToMission = new Map();

    /**
     * Token issued by aiwg-serve on register. Stored for reuse.
     * @type {string|null}
     */
    this._token = null;

    /**
     * Per-mission stdout buffer used for HITL pattern detection.
     * loopId → string (last N bytes)
     * @type {Map<string, string>}
     */
    this._stdoutBuffers = new Map();

    this._wireSupervisorEvents();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add a custom HITL pattern at runtime.
   * @param {RegExp|string} pattern
   */
  addHitlPattern(pattern) {
    this.hitlPatterns.push(pattern instanceof RegExp ? pattern : new RegExp(pattern));
  }

  /**
   * Register with aiwg-serve. Should be called once at startup.
   * Retries on failure with exponential back-off (capped at 30 s).
   * Resolves with the issued token.
   */
  async register(retryCount = 0) {
    const payload = {
      executor_id:          this.executorId,
      name:                 this.name,
      version:              this.version,
      spec_version:         '1.0.0',
      transport_endpoints: {
        rest: this.restBase,
        ws:   this.wsBase,
      },
      capabilities: [
        'isolation:none',
        'runtime:claude-code',
        'runtime:codex',
        PLATFORM_CAPABILITY,
        'hitl',
      ],
    };

    try {
      const res = await fetch(`${this.aiwgServeUrl}/api/v1/executors/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`register HTTP ${res.status}: ${text}`);
      }

      const body = await res.json();
      this._token = body.token;
      this.emit('registered', { executorId: this.executorId, token: this._token });
      return this._token;
    } catch (err) {
      if (retryCount < 8) {
        const delay = Math.min(30_000, 250 * (2 ** retryCount));
        await new Promise(r => setTimeout(r, delay));
        return this.register(retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * Deregister from aiwg-serve. Called on graceful shutdown.
   */
  async deregister() {
    if (!this._token) return;
    try {
      await fetch(`${this.aiwgServeUrl}/api/v1/executors/${this.executorId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${this._token}` },
      });
    } catch { /* best-effort */ }
  }

  // ── Mission operations (called by REST handlers) ───────────────────────────

  /**
   * Accept a dispatched mission, hand it to the supervisor.
   * @param {string} sessionId  — from the URL path
   * @param {object} body       — validated dispatch_payload
   * @returns {{ missionId, estimatedStart }} or throws
   */
  dispatch(sessionId, body) {
    const { mission_id: missionId, objective, completion, metadata = {} } = body;

    if (this._missions.has(missionId)) {
      throw Object.assign(new Error(`Mission ${missionId} already exists`), { status: 409 });
    }

    const loopId = missionId; // 1:1 mapping
    const now    = new Date().toISOString();

    this._missions.set(missionId, {
      missionId,
      loopId,
      sessionId,
      state:       'assigned',
      createdAt:   now,
      updatedAt:   now,
      recentEvents: [],
      pendingHitl:  null,
      objective,
      completion,
      metadata,
    });
    this._loopToMission.set(loopId, missionId);

    // Emit mission.assigned immediately
    this._emitMissionEvent(missionId, 'mission.assigned', { state: 'assigned' });

    // Submit to supervisor (runs the loop)
    try {
      this.supervisor.submit({
        loopId,
        prompt:   `${objective}\n\nCompletion criteria: ${completion}`,
        priority: metadata?.priority ?? 0,
        metadata: { missionId, sessionId, ...metadata },
      });
    } catch (err) {
      // Supervisor rejected (queue full, budget, circuit-breaker) — fail fast
      this._missions.delete(missionId);
      this._loopToMission.delete(loopId);
      throw Object.assign(err, { status: 503 });
    }

    return {
      missionId,
      executorId:     this.executorId,
      status:         'assigned',
      estimatedStart: new Date(Date.now() + 100).toISOString(),
    };
  }

  /**
   * Return a mission status snapshot.
   */
  getMission(missionId) {
    return this._missions.get(missionId) ?? null;
  }

  /**
   * Handle an incoming HITL response from the REST endpoint.
   * @param {string} missionId
   * @param {{ hitl_id: string, response: string }} body
   */
  submitHitlResponse(missionId, body) {
    const mission = this._missions.get(missionId);
    if (!mission) throw Object.assign(new Error('Mission not found'), { status: 404 });

    const { hitl_id, response } = body;

    if (!mission.pendingHitl || mission.pendingHitl.hitl_id !== hitl_id) {
      throw Object.assign(
        new Error(`No pending HITL request with id ${hitl_id}`),
        { status: 422 }
      );
    }

    // Clear the pending HITL
    mission.pendingHitl = null;
    mission.state       = 'running';
    mission.updatedAt   = new Date().toISOString();

    // Inject response into agent stdin if we have a pid/stdin handle
    this._injectHitlResponse(mission.loopId, response);

    // Emit hitl_responded over WS back to the executor itself (per contract)
    const respondedEnvelope = this._makeEnvelope(missionId, 'mission.hitl_responded', {
      hitl_id,
      response,
      responded_at: new Date().toISOString(),
    });
    this._broadcastWs(respondedEnvelope);

    return { missionId, hitl_id, status: 'forwarded' };
  }

  /**
   * Pause a running mission.
   */
  pauseMission(missionId) {
    const mission = this._missions.get(missionId);
    if (!mission) throw Object.assign(new Error('Mission not found'), { status: 404 });
    if (['done', 'failed', 'aborted'].includes(mission.state)) {
      throw Object.assign(new Error('Mission is in a terminal state'), { status: 409 });
    }

    mission.state     = 'paused';
    mission.updatedAt = new Date().toISOString();

    // Send SIGSTOP to the process group to actually pause it
    try { this.supervisor.killProcessGroup(mission.loopId, 'SIGSTOP'); } catch { /* ignore */ }

    this._emitMissionEvent(missionId, 'mission.paused', { state: 'paused', reason: 'operator request' });
    return { missionId, status: 'paused' };
  }

  /**
   * Resume a paused mission.
   */
  resumeMission(missionId) {
    const mission = this._missions.get(missionId);
    if (!mission) throw Object.assign(new Error('Mission not found'), { status: 404 });
    if (mission.state !== 'paused') {
      throw Object.assign(new Error('Mission is not paused'), { status: 409 });
    }

    mission.state     = 'running';
    mission.updatedAt = new Date().toISOString();

    try { this.supervisor.killProcessGroup(mission.loopId, 'SIGCONT'); } catch { /* ignore */ }

    this._emitMissionEvent(missionId, 'mission.resumed', { state: 'running', resumed_from: 'paused' });
    return { missionId, status: 'resumed' };
  }

  /**
   * Abort a mission.
   */
  abortMission(missionId) {
    const mission = this._missions.get(missionId);
    if (!mission) throw Object.assign(new Error('Mission not found'), { status: 404 });
    if (['done', 'failed', 'aborted'].includes(mission.state)) {
      throw Object.assign(new Error('Mission is in a terminal state'), { status: 409 });
    }

    this.supervisor.cancel(mission.loopId);
    mission.state       = 'aborted';
    mission.updatedAt   = new Date().toISOString();
    mission.completedAt = mission.updatedAt;

    this._emitMissionEvent(missionId, 'mission.aborted', {
      state:      'aborted',
      aborted_by: 'operator',
      reason:     'operator request',
    });
    return { missionId, status: 'aborted' };
  }

  // ── WS management ──────────────────────────────────────────────────────────

  /**
   * Register a live WS client. Called when the /ws/executors/:id upgrade
   * completes on the shim's own server.
   * @param {WebSocket} ws
   */
  addWsClient(ws) {
    this._wsClients.add(ws);

    // Send executor.resync immediately
    const ownedIds = [...this._missions.values()]
      .filter(m => !['done', 'failed', 'aborted'].includes(m.state))
      .map(m => m.missionId);

    const resync = this._makeEnvelope(null, 'executor.resync', { owned_mission_ids: ownedIds });
    try { ws.send(JSON.stringify(resync)); } catch { /* ignore */ }

    ws.on('close', () => { this._wsClients.delete(ws); });
    ws.on('error', () => { this._wsClients.delete(ws); });

    // Handle inbound WS messages (e.g. mission.hitl_responded from aiwg-serve)
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'mission.hitl_responded' && msg.mission_id) {
          const mission = this._missions.get(msg.mission_id);
          if (mission && msg.data?.hitl_id && msg.data?.response) {
            this.submitHitlResponse(msg.mission_id, {
              hitl_id:  msg.data.hitl_id,
              response: msg.data.response,
            });
          }
        }
      } catch { /* ignore malformed */ }
    });
  }

  // ── Graceful shutdown ───────────────────────────────────────────────────────

  /**
   * Graceful shutdown — emit mission.suspended for all in-flight missions,
   * deregister from aiwg-serve, then resolve.
   */
  async shutdown() {
    // Suspend all non-terminal missions
    for (const [missionId, mission] of this._missions) {
      if (!['done', 'failed', 'aborted'].includes(mission.state)) {
        mission.state     = 'suspended';
        mission.updatedAt = new Date().toISOString();
        this._emitMissionEvent(missionId, 'mission.suspended', {
          state:         'suspended',
          checkpoint_id: `checkpoint-${missionId}-${Date.now()}`,
          reason:        'executor_shutdown',
        });
      }
    }

    // Close all WS clients
    for (const ws of this._wsClients) {
      try { ws.close(1001, 'executor shutting down'); } catch { /* ignore */ }
    }
    this._wsClients.clear();

    // Deregister
    await this.deregister();
  }

  // ── Private: event wiring ───────────────────────────────────────────────────

  _wireSupervisorEvents() {
    // loop:started (supervisor started actual agent process)
    this.supervisor.on('loop:started', ({ loopId, taskId }) => {
      const missionId = this._loopToMission.get(loopId);
      if (!missionId) return;
      const mission = this._missions.get(missionId);
      if (!mission) return;

      mission.state     = 'running';
      mission.updatedAt = new Date().toISOString();

      this._emitMissionEvent(missionId, 'mission.started', {
        state:         'running',
        agent_runtime: 'claude-code',
        pty_session_id: `pty-${missionId}`,
      });

      // Emit an initial progress event
      this._emitMissionEvent(missionId, 'mission.progress', {
        phase:   'initialising',
        summary: 'Agent started',
      });
    });

    // loop:completed (supervisor reports exit 0)
    this.supervisor.on('loop:completed', ({ loopId }) => {
      const missionId = this._loopToMission.get(loopId);
      if (!missionId) return;
      const mission = this._missions.get(missionId);
      if (!mission) return;

      mission.state       = 'done';
      mission.updatedAt   = new Date().toISOString();
      mission.completedAt = mission.updatedAt;

      this._emitMissionEvent(missionId, 'mission.completed', {
        state:    'done',
        exit_code: 0,
        summary:  'Mission completed successfully',
      });

      this._loopToMission.delete(loopId);
    });

    // loop:failed (supervisor reports non-zero exit or error)
    this.supervisor.on('loop:failed', ({ loopId, error, permanent }) => {
      const missionId = this._loopToMission.get(loopId);
      if (!missionId) return;
      const mission = this._missions.get(missionId);
      if (!mission) return;

      mission.state       = 'failed';
      mission.updatedAt   = new Date().toISOString();
      mission.completedAt = mission.updatedAt;

      this._emitMissionEvent(missionId, 'mission.failed', {
        state:  'failed',
        reason: permanent ? 'restart_intensity_exceeded' : 'exit_nonzero',
        error:  String(error),
      });

      this._loopToMission.delete(loopId);
    });

    // Also handle loop:recovered (restart in progress) as a progress event
    this.supervisor.on('loop:recovered', ({ loopId, error }) => {
      const missionId = this._loopToMission.get(loopId);
      if (!missionId) return;

      this._emitMissionEvent(missionId, 'mission.progress', {
        phase:   'recovering',
        summary: `Agent restarting: ${String(error)}`,
      });
    });
  }

  /**
   * Inspect a stdout chunk for HITL patterns.
   * Called externally when the supervisor/PTY has output to offer.
   *
   * @param {string} loopId
   * @param {string} chunk
   */
  handleStdoutChunk(loopId, chunk) {
    const missionId = this._loopToMission.get(loopId);
    if (!missionId) return;
    const mission = this._missions.get(missionId);
    if (!mission || mission.state !== 'running') return;

    // Maintain a rolling buffer (last 1 KB)
    const existing = this._stdoutBuffers.get(loopId) ?? '';
    const combined = (existing + chunk).slice(-1024);
    this._stdoutBuffers.set(loopId, combined);

    for (const pattern of this.hitlPatterns) {
      if (pattern.test(combined)) {
        // Avoid re-triggering while a HITL is already pending
        if (mission.pendingHitl) break;

        const hitlId = `hitl-${missionId}-${Date.now()}`;
        mission.pendingHitl = { hitl_id: hitlId };
        mission.state       = 'hitl-required';
        mission.updatedAt   = new Date().toISOString();

        this._emitMissionEvent(missionId, 'mission.hitl_required', {
          hitl_id: hitlId,
          prompt:  combined.trim().split('\n').pop() || combined.trim(),
          context: combined.trim(),
        });

        // Clear buffer so we don't re-fire
        this._stdoutBuffers.set(loopId, '');
        break;
      }
    }
  }

  // ── Private: HITL stdin injection ──────────────────────────────────────────

  _injectHitlResponse(loopId, response) {
    const entry = this.supervisor._running?.get(loopId);
    if (!entry) return;

    // If the underlying AgentSupervisor exposes a stdin write on the task,
    // use it. Otherwise the response is best-effort.
    const task = this.supervisor.agentSupervisor?.tasks?.get(entry.taskId);
    if (task?.stdin && typeof task.stdin.write === 'function') {
      try { task.stdin.write(response + '\n'); } catch { /* ignore */ }
      return;
    }

    // Fallback: emit a synthetic progress note so the operator knows we tried
    const missionId = this._loopToMission.get(loopId);
    if (missionId) {
      this._emitMissionEvent(missionId, 'mission.progress', {
        phase:   'hitl_response',
        summary: `HITL response submitted: ${response}`,
      });
    }
  }

  // ── Private: event helpers ──────────────────────────────────────────────────

  _makeEnvelope(missionId, event, data) {
    const envelope = {
      event,
      executor_id: this.executorId,
      ts:          new Date().toISOString(),
    };
    if (missionId) envelope.mission_id = missionId;
    if (data !== undefined) envelope.data = data;
    return envelope;
  }

  _appendMissionEvent(missionId, envelope) {
    const mission = this._missions.get(missionId);
    if (!mission) return;
    mission.recentEvents.push(envelope);
    if (mission.recentEvents.length > 50) {
      mission.recentEvents = mission.recentEvents.slice(-50);
    }
    mission.updatedAt = envelope.ts;
  }

  _emitMissionEvent(missionId, eventType, data) {
    const envelope = this._makeEnvelope(missionId, eventType, data);
    if (missionId) this._appendMissionEvent(missionId, envelope);
    this._broadcastWs(envelope);
    this.emit('event', envelope);
  }

  _broadcastWs(envelope) {
    const payload = JSON.stringify(envelope);
    for (const ws of this._wsClients) {
      try {
        if (ws.readyState === 1 /* OPEN */) ws.send(payload);
      } catch { /* ignore dead connection */ }
    }
  }
}

// ── HTTP / WS server factory ─────────────────────────────────────────────────

/**
 * Build and start the executor's own HTTP+WS server.
 *
 * Routes:
 *   POST /api/v1/sessions/:id/dispatch            — accept a mission
 *   GET  /api/v1/missions/:id                     — mission status
 *   POST /api/v1/missions/:id/hitl_response       — HITL response
 *   POST /api/v1/missions/:id/pause               — pause
 *   POST /api/v1/missions/:id/resume              — resume
 *   POST /api/v1/missions/:id/abort               — abort
 *   WS   /ws/executors/:executor_id?token=<token> — event stream
 *
 * @param {ExecutorShim} shim
 * @param {{ port: number, bind: string, token: string }} opts
 * @returns {{ close: function, url: string }}
 */
export async function startExecutorServer(shim, opts) {
  const { port, bind, token } = opts;

  // ── Dynamic imports for optional deps ──────────────────────────────────────
  // eslint-disable-next-line no-new-func
  let honoMod, nodeMod;
  try {
    honoMod = await (new Function('m', 'return import(m)'))('hono');
    nodeMod = await (new Function('m', 'return import(m)'))('@hono/node-server');
  } catch {
    throw new Error(
      'local-executor requires hono + @hono/node-server. ' +
      'Install with: npm install --save-optional hono @hono/node-server'
    );
  }

  const Hono = honoMod.Hono ?? honoMod.default?.Hono;
  const serve = nodeMod.serve ?? nodeMod.default?.serve;
  const getNodeListener = nodeMod.getNodeListener ?? nodeMod.default?.getNodeListener;

  if (!Hono || (!serve && !getNodeListener)) {
    throw new Error('Could not resolve Hono or serve from installed packages');
  }

  // ── Token auth middleware ──────────────────────────────────────────────────

  function checkBearer(req) {
    const auth = req.header('Authorization') ?? '';
    const t = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    return t === token;
  }

  // ── Hono app ───────────────────────────────────────────────────────────────

  const app = new Hono();

  // Dispatch a mission
  app.post('/api/v1/sessions/:sessionId/dispatch', async (c) => {
    if (!checkBearer(c.req)) return c.json({ error: 'Unauthorized' }, 401);

    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'Invalid JSON' }, 400); }

    const { mission_id, objective, completion } = body;
    if (!mission_id || !objective || !completion) {
      return c.json({ error: 'mission_id, objective, and completion are required' }, 400);
    }

    try {
      const result = shim.dispatch(c.req.param('sessionId'), body);
      return c.json(result, 202);
    } catch (err) {
      return c.json({ error: err.message }, err.status ?? 500);
    }
  });

  // Mission status
  app.get('/api/v1/missions/:missionId', (c) => {
    if (!checkBearer(c.req)) return c.json({ error: 'Unauthorized' }, 401);

    const mission = shim.getMission(c.req.param('missionId'));
    if (!mission) return c.json({ error: 'Mission not found' }, 404);

    return c.json({
      mission_id:     mission.missionId,
      executor_id:    shim.executorId,
      state:          mission.state,
      created_at:     mission.createdAt,
      updated_at:     mission.updatedAt,
      completed_at:   mission.completedAt,
      recent_events:  mission.recentEvents.slice(-50),
      exit_code:      mission.exitCode,
      error:          mission.error,
    });
  });

  // HITL response
  app.post('/api/v1/missions/:missionId/hitl_response', async (c) => {
    if (!checkBearer(c.req)) return c.json({ error: 'Unauthorized' }, 401);

    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'Invalid JSON' }, 400); }

    try {
      const result = shim.submitHitlResponse(c.req.param('missionId'), body);
      return c.json(result, 202);
    } catch (err) {
      return c.json({ error: err.message }, err.status ?? 500);
    }
  });

  // Pause / resume / abort
  app.post('/api/v1/missions/:missionId/pause', (c) => {
    if (!checkBearer(c.req)) return c.json({ error: 'Unauthorized' }, 401);
    try {
      return c.json(shim.pauseMission(c.req.param('missionId')), 202);
    } catch (err) { return c.json({ error: err.message }, err.status ?? 500); }
  });

  app.post('/api/v1/missions/:missionId/resume', (c) => {
    if (!checkBearer(c.req)) return c.json({ error: 'Unauthorized' }, 401);
    try {
      return c.json(shim.resumeMission(c.req.param('missionId')), 202);
    } catch (err) { return c.json({ error: err.message }, err.status ?? 500); }
  });

  app.post('/api/v1/missions/:missionId/abort', (c) => {
    if (!checkBearer(c.req)) return c.json({ error: 'Unauthorized' }, 401);
    try {
      return c.json(shim.abortMission(c.req.param('missionId')), 202);
    } catch (err) { return c.json({ error: err.message }, err.status ?? 500); }
  });

  // ── Node HTTP server with WS upgrade ──────────────────────────────────────

  // Build node listener from Hono app
  let nodeListener;
  if (getNodeListener) {
    nodeListener = getNodeListener(app.fetch);
  } else {
    // Older @hono/node-server: serve returns a server object
    nodeListener = app.fetch;
  }

  // Attempt to get a ws package
  let wsMod;
  try {
    wsMod = await (new Function('m', 'return import(m)'))('ws');
  } catch {
    wsMod = null;
  }

  const WebSocketServer = wsMod?.WebSocketServer ?? wsMod?.default?.WebSocketServer ?? wsMod?.Server ?? wsMod?.default?.Server;

  let httpServer;

  if (serve && typeof serve === 'function') {
    // @hono/node-server ≥1.x: serve() returns the Node http.Server
    httpServer = serve({
      fetch:    app.fetch,
      port,
      hostname: bind,
    });

    // serve() may return the server synchronously or as a promise
    if (httpServer && typeof httpServer.then === 'function') {
      httpServer = await httpServer;
    }
  }

  // Fallback: create our own Node HTTP server
  if (!httpServer || typeof httpServer.on !== 'function') {
    httpServer = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const honoReq = new Request(`http://${req.headers.host}${req.url}`, {
        method:  req.method,
        headers: Object.fromEntries(
          Object.entries(req.headers).filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])
        ),
      });
      app.fetch(honoReq).then(async (honoRes) => {
        res.writeHead(honoRes.status, Object.fromEntries(honoRes.headers));
        const buf = await honoRes.arrayBuffer();
        res.end(Buffer.from(buf));
      }).catch(() => {
        res.writeHead(500);
        res.end('Internal server error');
      });
    });
    httpServer.listen(port, bind);
  }

  // Wire WS upgrade for /ws/executors/:executorId
  if (WebSocketServer && httpServer && typeof httpServer.on === 'function') {
    const wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const match = url.pathname.match(/^\/ws\/executors\/([^/]+)$/);
      if (!match) { socket.destroy(); return; }

      const executorIdParam = match[1];
      const tkParam         = url.searchParams.get('token') ?? '';

      if (executorIdParam !== shim.executorId || tkParam !== token) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        shim.addWsClient(ws);
      });
    });
  }

  const url = `http://${bind}:${port}`;
  return {
    url,
    close: () => {
      if (httpServer && typeof httpServer.close === 'function') {
        httpServer.close();
      }
    },
  };
}
