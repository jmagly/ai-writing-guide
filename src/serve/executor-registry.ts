/**
 * Executor Registry
 *
 * Manages registered executor instances per the executor contract v1 spec
 * (docs/contracts/executor.v1.md). Each executor registers with
 * `aiwg serve` via POST /api/v1/executors/register and then pushes
 * real-time events over WebSocket at /ws/executors/:executorId.
 *
 * This is the AIWG-side dispatch surface for the executor contract epic.
 * Executor implementations (sandbox adapter, local executor) are in sibling issues.
 *
 * @issue #1179
 * @see #1177 — executor-contract epic
 * @see #1178 — JSON Schema + conformance fixtures (schemas/executor-v1.json)
 * @see docs/contracts/executor.v1.md — authoritative prose spec
 */

import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// ============================================================
// Ajv bootstrap (transitive dep — zero new top-level deps)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _validateRegisterPayload: ((data: unknown) => boolean) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _validateEventEnvelope: ((data: unknown) => boolean) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _validateDispatchPayload: ((data: unknown) => boolean) | null = null;
function loadValidators(): void {
  if (_validateRegisterPayload !== null) return; // already loaded

  try {
    const require = createRequire(fileURLToPath(import.meta.url));
    const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..');

    const ajvPaths = [
      join(projectRoot, 'node_modules', 'ajv', 'dist', '2020.js'),
      join(projectRoot, 'node_modules', 'ajv', 'dist', 'ajv.js'),
    ];
    const formatsPath = join(projectRoot, 'node_modules', 'ajv-formats', 'dist', 'index.js');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Ajv: any = null;
    for (const p of ajvPaths) {
      if (existsSync(p)) {
        try { Ajv = require(p); break; } catch { /* try next */ }
      }
    }
    if (!Ajv) return; // graceful: validators stay null, schema checks skipped

    const AjvClass = Ajv?.default ?? Ajv;
    // validateSchema: false — prevents AJV from trying to fetch the draft-2020-12
    // meta-schema URI at runtime. The Ajv2020 constructor already implies the dialect.
    const ajv = new AjvClass({ strict: false, allErrors: true, validateSchema: false });

    if (existsSync(formatsPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fmtMod: any = require(formatsPath);
        const addFormats = fmtMod?.default ?? fmtMod;
        if (typeof addFormats === 'function') addFormats(ajv);
      } catch { /* formats optional */ }
    }

    const schemaPath = join(projectRoot, 'schemas', 'executor-v1.json');
    if (!existsSync(schemaPath)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema: any = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    ajv.addSchema(schema, 'executor.aiwg.io/v1');

    _validateRegisterPayload = ajv.compile({ $ref: 'executor.aiwg.io/v1#/$defs/register_payload' });
    _validateEventEnvelope   = ajv.compile({ $ref: 'executor.aiwg.io/v1#/$defs/event_envelope' });
    _validateDispatchPayload = ajv.compile({ $ref: 'executor.aiwg.io/v1#/$defs/dispatch_payload' });
  } catch { /* validation degraded to no-op */ }
}

export function validateRegisterPayload(data: unknown): { valid: boolean; errors: string } {
  loadValidators();
  if (!_validateRegisterPayload) return { valid: true, errors: '' }; // graceful degradation
  const valid = _validateRegisterPayload(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = valid ? '' : JSON.stringify((_validateRegisterPayload as any).errors ?? []);
  return { valid, errors };
}

export function validateEventEnvelope(data: unknown): { valid: boolean; errors: string } {
  loadValidators();
  if (!_validateEventEnvelope) return { valid: true, errors: '' };
  const valid = _validateEventEnvelope(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = valid ? '' : JSON.stringify((_validateEventEnvelope as any).errors ?? []);
  return { valid, errors };
}

export function validateDispatchPayload(data: unknown): { valid: boolean; errors: string } {
  loadValidators();
  if (!_validateDispatchPayload) return { valid: true, errors: '' };
  const valid = _validateDispatchPayload(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = valid ? '' : JSON.stringify((_validateDispatchPayload as any).errors ?? []);
  return { valid, errors };
}

// ============================================================
// Token issuance
// ============================================================

/**
 * Issue an opaque bearer token — base64url, 32 bytes of entropy.
 * Returned once at register time. Re-register with same executor_id reclaims
 * the prior identity (per ADR §9); the token is NOT rotated on re-register.
 */
function issueToken(): string {
  return randomBytes(32).toString('base64url');
}

// ============================================================
// Types
// ============================================================

/** Transport endpoints as declared in the schema. */
export interface TransportEndpoints {
  rest: string;
  ws: string;
  grpc?: string;
}

/** One active mission tracked by aiwg serve. */
export interface MissionRecord {
  missionId: string;
  executorId: string;
  state: MissionState;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  recentEvents: EventEnvelope[];
  ptySessionRef?: string;
  exitCode?: number;
  error?: string;
}

export type MissionState =
  | 'queued'
  | 'assigned'
  | 'running'
  | 'paused'
  | 'hitl-required'
  | 'suspended'
  | 'done'
  | 'failed'
  | 'aborted';

/** The terminal states — mission is done and won't change again. */
const TERMINAL_STATES: ReadonlySet<MissionState> = new Set(['done', 'failed', 'aborted']);

export interface EventEnvelope {
  event: string;
  executor_id: string;
  mission_id?: string;
  ts: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, unknown>;
}

/** Per-executor registration record (in-memory). */
export interface ExecutorRegistration {
  /** Stable executor UUID — declared by the executor at registration time. */
  executorId: string;
  name: string;
  version: string;
  specVersion: string;
  transportEndpoints: TransportEndpoints;
  capabilities: string[];
  /** Bearer token issued at first registration; preserved across re-registers. */
  token: string;
  connected: boolean;
  lastEventTs?: string;
  registeredAt: string;
  disconnectedAt?: string;
  /** Non-terminal missions currently owned by this executor. */
  currentMissions: Set<string>;
  /** Live WS connection handle (set by serve.ts on WS upgrade). */
  wsConn?: WebSocketConn;
}

/** Minimal WS connection interface (duck-typed from the `ws` package). */
export interface WebSocketConn {
  readyState: number; // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/** Serializable executor summary (used in API responses). */
export interface ExecutorSummary {
  executor_id: string;
  name: string;
  version: string;
  spec_version: string;
  transport_endpoints: TransportEndpoints;
  capabilities: string[];
  connected: boolean;
  last_event_ts?: string;
  active_mission_count: number;
  registered_at: string;
  disconnected_at?: string;
}

/** Request body for POST /api/v1/executors/register (wire shape). */
export interface ExecutorRegisterRequest {
  executor_id: string;
  name: string;
  version: string;
  spec_version: string;
  transport_endpoints: TransportEndpoints;
  capabilities: string[];
}

/** Response body for 201 Created. */
export interface ExecutorRegisterResponse {
  executor_id: string;
  token: string;
  registered_at: string;
}

/** Persistent token record saved across server restarts (#969 pattern). */
interface ExecutorIdentityRecord {
  executorId: string;
  token: string;
  lastSeenAt: string;
}

/** Filter criteria for executor selection (mirrors ExecutorFilter schema). */
export interface ExecutorFilter {
  /** Pin to specific executor. null = any. */
  executor_id?: string | null;
  /** Executor must advertise ALL listed capabilities. */
  capabilities?: string[];
}

/** Result of picking an executor via pickByFilter(). */
export interface ExecutorPickResult {
  executor: ExecutorRegistration;
  reason: string;
  rejected: Array<{ executorId: string; reason: string }>;
}

// ============================================================
// Identity store (#969 pattern — atomic writes)
// ============================================================

const DEFAULT_EXECUTOR_IDENTITY_STORE_PATH = join(homedir(), '.config', 'aiwg', 'executor-identities.json');

export function resolveExecutorIdentityStorePath(projectRootOverride?: string): string {
  const envOverride = process.env['AIWG_EXECUTOR_IDENTITY_STORE'];
  if (envOverride) return envOverride;

  const projectRoot = projectRootOverride ?? process.cwd();
  const configPath = join(projectRoot, '.aiwg', 'storage.config');
  if (!existsSync(configPath)) return DEFAULT_EXECUTOR_IDENTITY_STORE_PATH;

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      version?: string;
      roots?: Record<string, string>;
    };
    if (parsed.version !== '1') return DEFAULT_EXECUTOR_IDENTITY_STORE_PATH;
    const override = parsed.roots?.['executor_identity'];
    if (override) {
      let resolved = override;
      if (resolved.startsWith('~/')) resolved = join(homedir(), resolved.slice(2));
      else if (resolved === '~') resolved = homedir();
      else if (!isAbsolute(resolved)) resolved = resolvePath(projectRoot, resolved);
      return join(resolved, 'executor-identities.json');
    }
  } catch { /* fall through */ }
  return DEFAULT_EXECUTOR_IDENTITY_STORE_PATH;
}

function loadExecutorIdentityStore(): Map<string, ExecutorIdentityRecord> {
  const path = resolveExecutorIdentityStorePath();
  try {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf-8')) as ExecutorIdentityRecord[];
      return new Map(data.map((r) => [r.executorId, r]));
    }
  } catch { /* ignore */ }
  return new Map();
}

function saveExecutorIdentityStore(store: Map<string, ExecutorIdentityRecord>): void {
  const path = resolveExecutorIdentityStorePath();
  try {
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    const tmp = `${path}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify([...store.values()], null, 2), 'utf-8');
    try {
      renameSync(tmp, path);
    } catch (err) {
      try { unlinkSync(tmp); } catch { /* ignore */ }
      throw err;
    }
  } catch { /* non-fatal — best effort */ }
}

// ============================================================
// Max recent events kept per mission
// ============================================================

const MAX_MISSION_EVENTS = 50;

// ============================================================
// Registry class
// ============================================================

/**
 * ExecutorRegistry — state, auth, and identity store integration for
 * registered executor instances. Parallel to SandboxRegistry.
 *
 * Emits EventEmitter events:
 *   'executor:registered'   — { executorId, name }
 *   'executor:deregistered' — { executorId, reason }
 *   'mission:assigned'      — { missionId, executorId }
 *   'mission:state_change'  — { missionId, executorId, state, prevState }
 */
export class ExecutorRegistry extends EventEmitter {
  private executors = new Map<string, ExecutorRegistration>();
  private missions  = new Map<string, MissionRecord>();
  /** Persistent token store — executorId → identity record */
  private identityStore: Map<string, ExecutorIdentityRecord>;

  constructor() {
    super();
    this.identityStore = loadExecutorIdentityStore();
  }

  // ---- Registration ----

  /**
   * Register an executor. Validates payload against `register_payload` schema.
   * Returns 400-level error string on invalid payload.
   * On re-register with same executor_id: reclaims prior token (per ADR §9).
   */
  register(req: ExecutorRegisterRequest): ExecutorRegisterResponse | { error: string; status: 400 } {
    // Validate against JSON Schema
    const { valid, errors } = validateRegisterPayload(req);
    if (!valid) {
      return { error: `Invalid register payload: ${errors}`, status: 400 };
    }

    const now = new Date().toISOString();
    const { executor_id: executorId } = req;

    // Check for existing token in identity store (re-register reclaims it)
    const existing = this.executors.get(executorId);
    const storedIdentity = this.identityStore.get(executorId);
    const token = existing?.token ?? storedIdentity?.token ?? issueToken();

    // Update or create in-memory registration
    if (existing) {
      // Upsert — preserve token and registeredAt
      existing.name = req.name;
      existing.version = req.version;
      existing.specVersion = req.spec_version;
      existing.transportEndpoints = req.transport_endpoints;
      existing.capabilities = req.capabilities;
      existing.connected = false; // WS will update this on upgrade
    } else {
      const registration: ExecutorRegistration = {
        executorId,
        name: req.name,
        version: req.version,
        specVersion: req.spec_version,
        transportEndpoints: req.transport_endpoints,
        capabilities: req.capabilities,
        token,
        connected: false,
        registeredAt: now,
        currentMissions: new Set(),
      };
      this.executors.set(executorId, registration);
    }

    // Persist token to identity store
    this.identityStore.set(executorId, {
      executorId,
      token,
      lastSeenAt: now,
    });
    saveExecutorIdentityStore(this.identityStore);

    // Emit event (for dashboard SSE, etc.)
    this.emit('executor:registered', { executorId, name: req.name });

    return {
      executor_id: executorId,
      token,
      registered_at: existing?.registeredAt ?? now,
    };
  }

  /**
   * Deregister an executor by ID. Auth must be checked by the caller.
   * Emits 'executor:deregistered'.
   */
  deregister(executorId: string, reason: 'graceful_shutdown' | 'operator_deleted' | 'timeout' = 'operator_deleted'): boolean {
    const executor = this.executors.get(executorId);
    if (!executor) return false;

    // Close WS if open
    if (executor.wsConn && executor.wsConn.readyState <= 1) {
      try { executor.wsConn.close(1000, 'deregistered'); } catch { /* ignore */ }
    }

    this.executors.delete(executorId);
    this.emit('executor:deregistered', { executorId, reason });
    return true;
  }

  /**
   * Validate bearer token for an executor.
   */
  authenticate(executorId: string, token: string): boolean {
    const executor = this.executors.get(executorId);
    if (executor) return executor.token === token;
    // Fall back to identity store for executors that registered in a prior server run
    const stored = this.identityStore.get(executorId);
    return stored !== undefined && stored.token === token;
  }

  /**
   * Mark the WS event stream as connected or disconnected.
   */
  setConnected(executorId: string, connected: boolean, wsConn?: WebSocketConn): void {
    const executor = this.executors.get(executorId);
    if (!executor) return;
    executor.connected = connected;
    if (connected && wsConn) {
      executor.wsConn = wsConn;
    } else if (!connected) {
      executor.disconnectedAt = new Date().toISOString();
      executor.wsConn = undefined;
    }
  }

  /**
   * Push a message to the executor's live WS connection.
   * Returns true if sent, false if the executor has no open connection.
   */
  pushToExecutor(executorId: string, event: EventEnvelope): boolean {
    const executor = this.executors.get(executorId);
    if (!executor?.wsConn || executor.wsConn.readyState !== 1) return false;
    try {
      executor.wsConn.send(JSON.stringify(event));
      return true;
    } catch {
      return false;
    }
  }

  // ---- Event handling ----

  /**
   * Handle an inbound event from an executor WS connection.
   * Validates against event_envelope schema; updates mission state.
   */
  handleEvent(envelope: EventEnvelope): void {
    const executor = this.executors.get(envelope.executor_id);
    if (!executor) return;

    executor.lastEventTs = envelope.ts || new Date().toISOString();

    const missionId = envelope.mission_id;

    switch (envelope.event) {
      case 'executor.resync': {
        // Reconcile mission state on reconnect
        const ownedIds: string[] = (envelope.data?.['owned_mission_ids'] as string[]) ?? [];
        for (const mid of ownedIds) {
          const mission = this.missions.get(mid);
          if (mission && !TERMINAL_STATES.has(mission.state)) {
            const prevState = mission.state;
            mission.state = 'running';
            mission.updatedAt = envelope.ts;
            this.appendMissionEvent(mission, envelope);
            this.emit('mission:state_change', { missionId: mid, executorId: envelope.executor_id, state: 'running', prevState });
          }
        }
        break;
      }

      case 'mission.assigned': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'assigned';
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'assigned', prevState });
        }
        break;
      }

      case 'mission.started': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'running';
          mission.updatedAt = envelope.ts;
          if (envelope.data?.['pty_session_id']) {
            mission.ptySessionRef = envelope.data['pty_session_id'] as string;
          }
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'running', prevState });
        }
        break;
      }

      case 'mission.progress': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
        }
        break;
      }

      case 'mission.hitl_required': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'hitl-required';
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'hitl-required', prevState });
        }
        break;
      }

      case 'mission.paused': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'paused';
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'paused', prevState });
        }
        break;
      }

      case 'mission.resumed': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'running';
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'running', prevState });
        }
        break;
      }

      case 'mission.suspended': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'suspended';
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'suspended', prevState });
        }
        break;
      }

      case 'mission.reconnected': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'running';
          mission.updatedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'running', prevState });
        }
        break;
      }

      case 'mission.completed': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'done';
          mission.updatedAt = envelope.ts;
          mission.completedAt = envelope.ts;
          if (typeof envelope.data?.['exit_code'] === 'number') {
            mission.exitCode = envelope.data['exit_code'] as number;
          }
          this.appendMissionEvent(mission, envelope);
          executor.currentMissions.delete(missionId);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'done', prevState });
        }
        break;
      }

      case 'mission.failed': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'failed';
          mission.updatedAt = envelope.ts;
          mission.completedAt = envelope.ts;
          if (typeof envelope.data?.['error'] === 'string') {
            mission.error = envelope.data['error'] as string;
          }
          if (typeof envelope.data?.['exit_code'] === 'number') {
            mission.exitCode = envelope.data['exit_code'] as number;
          }
          this.appendMissionEvent(mission, envelope);
          executor.currentMissions.delete(missionId);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'failed', prevState });
        }
        break;
      }

      case 'mission.aborted': {
        if (!missionId) break;
        const mission = this.missions.get(missionId);
        if (mission) {
          const prevState = mission.state;
          mission.state = 'aborted';
          mission.updatedAt = envelope.ts;
          mission.completedAt = envelope.ts;
          this.appendMissionEvent(mission, envelope);
          executor.currentMissions.delete(missionId);
          this.emit('mission:state_change', { missionId, executorId: envelope.executor_id, state: 'aborted', prevState });
        }
        break;
      }

      default:
        // Unknown or pass-through event — update timestamp, do not crash
        break;
    }
  }

  private appendMissionEvent(mission: MissionRecord, envelope: EventEnvelope): void {
    mission.recentEvents.push(envelope);
    if (mission.recentEvents.length > MAX_MISSION_EVENTS) {
      mission.recentEvents = mission.recentEvents.slice(-MAX_MISSION_EVENTS);
    }
  }

  // ---- Mission management ----

  /**
   * Create a mission record and associate it with an executor.
   * Called by the dispatch route after forwarding succeeds.
   */
  assignMission(missionId: string, executorId: string): MissionRecord {
    const now = new Date().toISOString();
    const mission: MissionRecord = {
      missionId,
      executorId,
      state: 'assigned',
      createdAt: now,
      updatedAt: now,
      recentEvents: [],
    };
    this.missions.set(missionId, mission);

    const executor = this.executors.get(executorId);
    if (executor) executor.currentMissions.add(missionId);

    this.emit('mission:assigned', { missionId, executorId });
    return mission;
  }

  /**
   * Mark a mission as failed (e.g. executor unreachable on forward).
   */
  failMission(missionId: string, error: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    const prevState = mission.state;
    mission.state = 'failed';
    mission.error = error;
    mission.updatedAt = new Date().toISOString();
    mission.completedAt = mission.updatedAt;
    const executor = this.executors.get(mission.executorId);
    if (executor) executor.currentMissions.delete(missionId);
    this.emit('mission:state_change', { missionId, executorId: mission.executorId, state: 'failed', prevState });
  }

  /**
   * Get a mission record by ID.
   */
  getMission(missionId: string): MissionRecord | undefined {
    return this.missions.get(missionId);
  }

  /**
   * Transition a mission to a requested operator state.
   * Returns false if the mission is in a terminal state or not found.
   */
  transitionMission(missionId: string, targetState: 'paused' | 'running' | 'aborted'): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;
    if (TERMINAL_STATES.has(mission.state)) return false;
    const prevState = mission.state;
    mission.state = targetState;
    mission.updatedAt = new Date().toISOString();
    this.emit('mission:state_change', { missionId, executorId: mission.executorId, state: targetState, prevState });
    return true;
  }

  // ---- Query ----

  /**
   * List all executors as serializable summaries.
   */
  list(): ExecutorSummary[] {
    return [...this.executors.values()].map(toSummary);
  }

  /**
   * Get a single executor summary.
   */
  get(executorId: string): ExecutorSummary | undefined {
    const executor = this.executors.get(executorId);
    return executor ? toSummary(executor) : undefined;
  }

  /**
   * Get the raw registration record (internal use by dispatch).
   */
  getRegistration(executorId: string): ExecutorRegistration | undefined {
    return this.executors.get(executorId);
  }

  /**
   * Pick the best executor matching the given filter.
   *
   * Default-selection policy (per ADR §3):
   *   1. Sandbox-first: prefer any executor with isolation:vm or isolation:container
   *   2. Local fallback: isolation:none or isolation:host
   *   3. 503 if no executor available
   *
   * `long_running: true` requires a 'resumable' capability.
   */
  pickByFilter(filter: ExecutorFilter, longRunning = false): ExecutorPickResult | null {
    const candidates = [...this.executors.values()].filter((e) => e.connected);
    const rejected: Array<{ executorId: string; reason: string }> = [];

    // If executor_id is pinned, target it directly
    if (filter.executor_id) {
      const pinned = this.executors.get(filter.executor_id);
      if (!pinned) {
        return null;
      }
      if (!pinned.connected) {
        return null;
      }
      if (longRunning && !pinned.capabilities.includes('resumable')) {
        return null;
      }
      return { executor: pinned, reason: 'pinned by executor_id', rejected: [] };
    }

    // Filter by required capabilities
    const filtered: ExecutorRegistration[] = [];
    for (const executor of candidates) {
      // Long-running requires resumable
      if (longRunning && !executor.capabilities.includes('resumable')) {
        rejected.push({ executorId: executor.executorId, reason: 'long_running requires resumable capability' });
        continue;
      }
      // All requested capabilities must be present
      if (filter.capabilities && filter.capabilities.length > 0) {
        const missing = filter.capabilities.filter((c) => !executor.capabilities.includes(c));
        if (missing.length > 0) {
          rejected.push({ executorId: executor.executorId, reason: `missing capabilities: ${missing.join(', ')}` });
          continue;
        }
      }
      filtered.push(executor);
    }

    if (filtered.length === 0) return null;

    // ADR §3 sandbox-first policy: prefer vm/container isolation
    const sandboxFirst = filtered.filter((e) =>
      e.capabilities.some((c) => c === 'isolation:vm' || c === 'isolation:container')
    );
    const chosen = sandboxFirst.length > 0 ? sandboxFirst[0]! : filtered[0]!;

    return {
      executor: chosen,
      reason: sandboxFirst.length > 0 ? 'sandbox-first (isolation:vm/container)' : 'local fallback',
      rejected,
    };
  }

  /** Total registered executor count. */
  get size(): number {
    return this.executors.size;
  }

  /** Shut down — clear all state. */
  shutdown(): void {
    for (const executor of this.executors.values()) {
      if (executor.wsConn && executor.wsConn.readyState <= 1) {
        try { executor.wsConn.close(1000, 'server shutdown'); } catch { /* ignore */ }
      }
    }
    this.executors.clear();
    this.missions.clear();
    this.removeAllListeners();
  }
}

// ============================================================
// Serialization helper
// ============================================================

function toSummary(e: ExecutorRegistration): ExecutorSummary {
  return {
    executor_id: e.executorId,
    name: e.name,
    version: e.version,
    spec_version: e.specVersion,
    transport_endpoints: e.transportEndpoints,
    capabilities: e.capabilities,
    connected: e.connected,
    last_event_ts: e.lastEventTs,
    active_mission_count: e.currentMissions.size,
    registered_at: e.registeredAt,
    disconnected_at: e.disconnectedAt,
  };
}

// Singleton instance
export const executorRegistry = new ExecutorRegistry();
