/**
 * Sandbox Registry
 *
 * Manages registered agentic-sandbox instances. Each sandbox registers
 * with `aiwg serve` via POST /api/sandboxes/register and then pushes
 * real-time events over WebSocket at /ws/sandbox/:sandboxId.
 *
 * This is the AIWG side of the bidirectional integration:
 *   - aiwg#731 = registration API (this file)
 *   - sandbox#132 = outbound registration (pushes events here)
 *
 * @issue #731
 * @see #710 — epic
 * @see #732 — HITL relay (consumes hitl.input_required events)
 * @see #733 — operator controls (proxies to sandbox HTTP)
 */

import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'path';

// ============================================================
// Types
// ============================================================

export interface SandboxRegistration {
  /** Unique sandbox ID (assigned on register, session-scoped) */
  id: string;
  /** Display name chosen by sandbox operator */
  name: string;
  /**
   * Stable instance identity (UUIDv7) persisted by the sandbox across restarts.
   * Used for upsert-on-reconnect so the same physical sandbox never creates
   * duplicate entries regardless of how many times it re-registers.
   */
  instanceId?: string;
  /** gRPC endpoint for agent communication */
  grpcEndpoint: string;
  /** WebSocket endpoint for PTY streaming */
  wsEndpoint: string;
  /** HTTP REST API endpoint */
  httpEndpoint: string;
  /** Capabilities this sandbox advertises */
  capabilities: string[];
  /** Sandbox software version */
  version: string;
  /** Auth token for this sandbox (returned at registration) */
  token: string;
  /** When this sandbox_id was first assigned */
  registeredAt: string;
  /** When the most recent registration arrived (updated on every upsert) */
  lastRegisteredAt: string;
  /** Last event received from the sandbox */
  lastEventAt: string;
  /** Whether the event push WebSocket is connected */
  connected: boolean;
  /** When the event push WebSocket last disconnected (undefined if never disconnected) */
  disconnectedAt?: string;
  /** Live agent inventory (updated by sandbox events) */
  agents: Map<string, SandboxAgent>;
  /** Sandbox-level artifact inventory reported at registration time (#906) */
  sandboxInventory?: AgentInventory;
  /** WebSocket protocol capabilities advertised at registration time (#912) */
  wsCapabilities?: SandboxCapabilities;
}

export interface SandboxAgent {
  agentId: string;
  status: 'starting' | 'provisioning' | 'ready' | 'busy' | 'error' | 'disconnected';
  loadout?: string;
  /** Framework list — name, providers, and optional version/content_hash (#910) */
  aiwgFrameworks?: Array<{ name: string; providers: string[]; version?: string; content_hash?: string }>;
  connectedAt?: string;
  lastHeartbeat?: string;
  /** Live session count — incremented/decremented by session.start/session.end events.
   *  Approximate; `sessions` is authoritative when present (drift-resistant). */
  sessionCount?: number;
  /**
   * Authoritative session inventory pushed by the sandbox via the
   * `agent.sessions` event (#1151, sandbox#192). Replaces wholesale on each
   * event so a missed start/end can't desync the count.
   *
   * Undefined when the sandbox is on a build that doesn't emit
   * `agent.sessions` yet — UI should fall back to "no badge" rather than
   * rendering "0 sessions" for unknown state.
   */
  sessions?: SessionInfo[];
  /** Agent/command/skill manifest inventory — populated by agent.inventory_updated events (#906) */
  inventory?: AgentInventory;
  /** Latest metrics snapshot — populated by agent.metrics_updated events (#911) */
  latestMetrics?: AgentMetrics;
  /** Rolling metrics history (last METRICS_HISTORY_MAX samples) — for sparklines (#911) */
  metricsHistory?: AgentMetricsSample[];
  /** Current provisioning step — populated by agent.provisioning_step events (#911) */
  provisioningStep?: ProvisioningStep;
  /** True if provisioning has stalled (no progress for 30s+) (#911) */
  provisioningStalled?: boolean;
  /**
   * Stable agent instance identity — UUIDv7 generated on first start, persisted by the sandbox.
   * Survives restarts, reprovisions, and agentId changes (#917).
   */
  instanceId?: string;
  /**
   * Human-readable stable name assigned by the operator (e.g. "security-01").
   * Persisted in ~/.config/aiwg/sandbox-agents.json (#917).
   */
  logicalName?: string;
}

// ============================================================
// Session inventory (#1151)
// ============================================================

/**
 * One live session record on an agent. Pushed by the sandbox in the
 * `agent.sessions` event (sandbox#192) as a full inventory replace.
 *
 * Field shape mirrors the dashboard's WS `session_list` reply so the UI
 * can render the same data on either surface.
 */
export interface SessionInfo {
  session_id: string;
  session_name: string;
  session_type: 'interactive' | 'headless' | 'background';
  command: string;
  /** Unix epoch seconds — kept as raw seconds so the consumer can format
   *  it in the local timezone. */
  created_at_secs: number;
  /** True when the sandbox has a screen-state snapshot for this session
   *  available via `GET /api/v1/sessions/:id/screen` (#913). */
  has_screen: boolean;
}

// ============================================================
// Protocol capabilities (#912)
// ============================================================

/**
 * Protocol capabilities advertised by the sandbox on registration.
 * Enables AIWG to select the correct WS message path for each sandbox.
 */
export interface SandboxCapabilities {
  /** Numeric protocol version (e.g. 2) */
  ws_protocol_version: number;
  /** Client message types this sandbox accepts */
  supported_client_messages: string[];
  /** Server message types this sandbox emits */
  supported_server_messages: string[];
  /** Named feature flags (e.g. "replay_buffer", "role_control", "seq_tracking") */
  features: string[];
}

// ============================================================
// Persistent agent identity store (#917)
// ============================================================

/** One record per known agent instance in the persistent store. */
interface AgentIdentityRecord {
  instanceId: string;
  logicalName?: string;
  /** Last known agentId — may change across reprovisions */
  lastAgentId?: string;
  /** Last known sandboxId */
  lastSandboxId?: string;
  lastSeenAt: string;
}

/**
 * Default identity store location — global, host-level. Preserved for
 * backward compatibility when `.aiwg/storage.config` doesn't redirect
 * `sandbox_identity` (#969).
 */
const DEFAULT_IDENTITY_STORE_PATH = join(homedir(), '.config', 'aiwg', 'sandbox-agents.json');

/**
 * Resolve the identity-store path, honoring `roots.sandbox_identity`
 * in `.aiwg/storage.config` when set. Sync read because the sandbox
 * registry constructor is sync and load happens at construction time.
 *
 * Backend support: only `fs` (or absent config) is currently supported
 * for the identity store — non-fs backends would require an async
 * adapter call which doesn't fit the sync constructor. Throws a clear
 * error if the user has configured a non-fs backend for this subsystem.
 *
 * Exported for testing — production callers omit `projectRootOverride`
 * to use `process.cwd()`.
 *
 * @issue #969
 */
export function resolveIdentityStorePath(projectRootOverride?: string): string {
  // First check env var for tests / one-off overrides
  const envOverride = process.env['AIWG_SANDBOX_IDENTITY_STORE'];
  if (envOverride) return envOverride;

  // Try storage.config — sync read of project-local file
  const projectRoot = projectRootOverride ?? process.cwd();
  const configPath = join(projectRoot, '.aiwg', 'storage.config');
  if (!existsSync(configPath)) return DEFAULT_IDENTITY_STORE_PATH;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      version?: string;
      roots?: Record<string, string>;
      backends?: Record<string, { type?: string }>;
    };
    if (parsed.version !== '1') return DEFAULT_IDENTITY_STORE_PATH;

    // Refuse non-fs backends — sync constructor can't await an adapter
    const backendType = parsed.backends?.['sandbox_identity']?.type;
    if (backendType && backendType !== 'fs') {
      throw new Error(
        `sandbox-registry: backend "${backendType}" not supported for sandbox_identity ` +
          `(only fs supported in v1; sync load constraint). Configure roots.sandbox_identity ` +
          `to redirect within the fs backend, or remove the backends.sandbox_identity entry.`
      );
    }

    const override = parsed.roots?.['sandbox_identity'];
    if (override) {
      // Expand ~/ and resolve relative paths against project root
      let resolved = override;
      if (resolved.startsWith('~/')) resolved = join(homedir(), resolved.slice(2));
      else if (resolved === '~') resolved = homedir();
      else if (!isAbsolute(resolved)) resolved = resolvePath(projectRoot, resolved);
      // The override is a directory; the legacy file lives inside it
      return join(resolved, 'sandbox-agents.json');
    }
  } catch (err) {
    // Throw on configured-but-unsupported, swallow on parse errors
    if (err instanceof Error && err.message.startsWith('sandbox-registry: backend')) {
      throw err;
    }
    // ignore — fall through to default
  }
  return DEFAULT_IDENTITY_STORE_PATH;
}

function loadIdentityStore(): Map<string, AgentIdentityRecord> {
  const path = resolveIdentityStorePath();
  try {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf-8')) as AgentIdentityRecord[];
      return new Map(data.map((r) => [r.instanceId, r]));
    }
  } catch { /* ignore parse/read errors */ }
  return new Map();
}

/**
 * Save the identity store atomically: write to a temp file in the same
 * directory, then rename onto the live path. Prevents readers from
 * observing a half-written JSON file under concurrent SIGINT.
 */
function saveIdentityStore(store: Map<string, AgentIdentityRecord>): void {
  const path = resolveIdentityStorePath();
  try {
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });

    const tmp = `${path}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify([...store.values()], null, 2), 'utf-8');
    try {
      renameSync(tmp, path);
    } catch (err) {
      // Best-effort cleanup of the temp file
      try { unlinkSync(tmp); } catch { /* ignore */ }
      throw err;
    }
  } catch { /* ignore write errors — non-fatal per existing contract */ }
}

/** Convenience helper — returns true if the sandbox advertises a feature flag. */
export function sandboxHasFeature(reg: { wsCapabilities?: SandboxCapabilities }, feature: string): boolean {
  return reg.wsCapabilities?.features.includes(feature) ?? false;
}

/** Returns true if the sandbox supports a given client message type. */
export function sandboxSupports(reg: { wsCapabilities?: SandboxCapabilities }, msg: string): boolean {
  return reg.wsCapabilities?.supported_client_messages.includes(msg) ?? false;
}

// ============================================================
// Metrics types (#911)
// ============================================================

export interface AgentMetrics {
  cpu_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  uptime_seconds: number;
  load_avg_1m?: number;
  disk_used_bytes?: number;
  disk_total_bytes?: number;
  /** Unix timestamp (ms) when metrics were sampled */
  ts: number;
}

/** Compact sample stored in the rolling history ring. */
export interface AgentMetricsSample {
  cpu_percent: number;
  memory_percent: number;
  ts: number;
}

/** Maximum number of samples kept per agent (#911). ~5 min at 5s interval. */
export const METRICS_HISTORY_MAX = 60;

// ============================================================
// Provisioning types (#911)
// ============================================================

export interface ProvisioningStep {
  step: string;
  step_index?: number;
  total_steps?: number;
  elapsed_seconds?: number;
  ts: string;
}

// ============================================================
// Inventory types (#906)
// ============================================================

export interface AgentManifestSummary {
  name: string;
  description: string;
  model?: string;
  category: string;
  platform: string;
  /** SHA-256 of agent manifest file — for change detection */
  content_hash: string;
}

export interface CommandManifestSummary {
  name: string;
  description: string;
  platform: string;
  content_hash: string;
}

export interface SkillManifestSummary {
  name: string;
  description: string;
  platform: string;
  content_hash: string;
}

export interface AgentInventory {
  agents: AgentManifestSummary[];
  commands: CommandManifestSummary[];
  skills: SkillManifestSummary[];
  last_updated: string;
}

// ============================================================
// Events
// ============================================================

/**
 * Events pushed from agentic-sandbox to aiwg serve over WebSocket.
 * Matches the protocol defined in aiwg#731 / sandbox#132.
 */
export type SandboxEventType =
  | 'agent.connected'
  | 'agent.disconnected'
  | 'agent.provisioning'
  | 'agent.ready'
  | 'session.start'
  | 'session.end'
  | 'hitl.input_required'
  | 'hitl.responded'          // emitted by aiwg serve after forwarding response (#908)
  | 'hitl.timed_out'          // emitted when a HITL request expires (#908)
  | 'agent.inventory_updated' // sandbox pushed new agent/command/skill manifest hashes (#906)
  | 'task.submitted'              // task accepted by sandbox orchestrator (#907)
  | 'task.started'                // task VM allocated and running (#907)
  | 'task.progressed'             // incremental output chunk (#907)
  | 'task.completed'              // task exited cleanly (#907)
  | 'task.failed'                 // task errored or cancelled (#907)
  | 'agent.metrics_updated'       // heartbeat metrics (cpu, memory, disk, uptime) (#911)
  | 'agent.provisioning_step'     // provisioning step progress (#911)
  | 'agent.provisioning_stalled'  // no provisioning progress for 30s+ (#911)
  | 'framework.update_available'  // sandbox framework version behind host (#910)
  | 'session.screen_updated'      // screen state hash changed (throttled) (#913)
  | 'agent.sessions'              // full session inventory replace — drift-resistant (#1151, sandbox#192)
  | 'aiwg.log';                   // log line from sandbox AIWG instance (#914)


export interface SandboxEvent {
  type: SandboxEventType;
  sandboxId: string;
  agentId: string;
  timestamp: string;
  // Event-specific fields
  loadout?: string;
  aiwgFrameworks?: Array<{ name: string; providers: string[] }>;
  step?: string;
  progress?: unknown;
  sessionId?: string;
  /** PTY/exec command — present on session.start events */
  command?: string;
  /** Exit code — present on session.end events */
  exitCode?: number;
  task?: string;
  // HITL-specific fields (#908)
  hitlId?: string;
  prompt?: string;
  context?: string;
  expiresAt?: string;
  // Inventory-specific fields (#906)
  agentInventory?: AgentManifestSummary[];
  commandInventory?: CommandManifestSummary[];
  skillInventory?: SkillManifestSummary[];
  // Task lifecycle fields (#907)
  taskId?: string;
  outputChunk?: string;
  taskError?: string;
  // Metrics fields (#911)
  metrics?: AgentMetrics;
  // Provisioning step fields (#911)
  stepIndex?: number;
  totalSteps?: number;
  elapsedSeconds?: number;
  stalledForSeconds?: number;
  // Framework version fields (#910)
  framework?: string;
  currentVersion?: string;
  availableVersion?: string;
  daysBehind?: number;
  // Screen state fields (#913)
  screenHash?: string;
  changedLines?: number[];
  // AIWG log fields (#914)
  level?: string;
  message?: string;
  // Agent identity fields (#917)
  /** Stable agent instance UUIDv7 — set on agent.connected events */
  agentInstanceId?: string;
  /** Operator-assigned logical name — set on agent.connected events */
  agentLogicalName?: string;
  // Session inventory fields (#1151)
  /** Full session inventory — set on agent.sessions events. The sandbox
   *  replaces the agent's session list wholesale on each event so missed
   *  session.start / session.end deltas can't desync the count. */
  sessions?: SessionInfo[];
}

export interface HitlRequest {
  id: string;
  sandboxId: string;
  agentId: string;
  sessionId: string;
  timestamp: string;
  prompt: string;
  context: string;
  expiresAt?: string;
}

export interface RegisterRequest {
  name: string;
  /** Stable UUIDv7 generated on first start, persisted across restarts */
  instance_id?: string;
  grpc_endpoint: string;
  ws_endpoint: string;
  http_endpoint: string;
  capabilities?: string[];
  version?: string;
  /** Agent manifest summaries for all deployed agents (#906) */
  agent_inventory?: AgentManifestSummary[];
  /** Command manifest summaries for all deployed commands (#906) */
  command_inventory?: CommandManifestSummary[];
  /** Skill manifest summaries for all deployed skills (#906) */
  skill_inventory?: SkillManifestSummary[];
  /** WebSocket protocol capabilities — enables negotiation on connect (#912) */
  ws_capabilities?: SandboxCapabilities;
}

export interface RegisterResponse {
  sandbox_id: string;
  token: string;
}

// ============================================================
// Event normalization (#933)
// ============================================================
//
// agentic-sandbox emits SandboxEvent over WS with Serde's
// `rename_all = "snake_case"` applied to the enum tag and every field.
// So the wire payload is:
//
//   { "type": "agent_connected", "agent_id": "agent-01",
//     "agent_instance_id": "01HX...", "loadout": "base", ... }
//
// AIWG's registry switch is written in dot-notation + camelCase
// (`agent.connected`, `event.agentId`). Before #933, only
// `session_start`/`session_end` were normalized — every `agent_*`
// and `hitl_*` event was silently dropped and agents never populated
// the registry, which is why the dashboard reported "0 agents".
//
// normalizeSandboxEvent() maps snake_case event types to the dot
// notation the switch expects and aliases snake_case top-level fields
// onto their camelCase twins. Nested payloads (metrics, inventory
// summaries) are left alone — their consumers already read snake_case
// keys (e.g. metrics.cpu_percent, AgentManifestSummary.content_hash).

/** Explicit snake_case → dot-notation map for SandboxEventType. */
const SNAKE_TO_DOT_EVENT_TYPE: Record<string, SandboxEventType> = {
  agent_connected: 'agent.connected',
  agent_disconnected: 'agent.disconnected',
  agent_ready: 'agent.ready',
  agent_provisioning: 'agent.provisioning',
  session_start: 'session.start',
  session_end: 'session.end',
  hitl_input_required: 'hitl.input_required',
  hitl_responded: 'hitl.responded',
  hitl_timed_out: 'hitl.timed_out',
  agent_inventory_updated: 'agent.inventory_updated',
  agent_metrics_updated: 'agent.metrics_updated',
  agent_provisioning_step: 'agent.provisioning_step',
  agent_provisioning_stalled: 'agent.provisioning_stalled',
  framework_update_available: 'framework.update_available',
  session_screen_updated: 'session.screen_updated',
  task_submitted: 'task.submitted',
  task_started: 'task.started',
  task_progressed: 'task.progressed',
  task_completed: 'task.completed',
  task_failed: 'task.failed',
  aiwg_log: 'aiwg.log',
  agent_sessions: 'agent.sessions', // sandbox#192 — full session inventory replace (#1155)
};

/** Top-level field aliases from snake_case payloads → camelCase view. */
const SNAKE_TO_CAMEL_FIELDS: Record<string, string> = {
  agent_id: 'agentId',
  sandbox_id: 'sandboxId',
  session_id: 'sessionId',
  exit_code: 'exitCode',
  hitl_id: 'hitlId',
  agent_instance_id: 'agentInstanceId',
  agent_logical_name: 'agentLogicalName',
  aiwg_frameworks: 'aiwgFrameworks',
  agent_inventory: 'agentInventory',
  command_inventory: 'commandInventory',
  skill_inventory: 'skillInventory',
  step_index: 'stepIndex',
  total_steps: 'totalSteps',
  elapsed_seconds: 'elapsedSeconds',
  stalled_for_seconds: 'stalledForSeconds',
  current_version: 'currentVersion',
  available_version: 'availableVersion',
  days_behind: 'daysBehind',
  screen_hash: 'screenHash',
  changed_lines: 'changedLines',
  task_error: 'taskError',
  output_chunk: 'outputChunk',
  expires_at: 'expiresAt',
};

/**
 * Normalize a raw sandbox event payload into the camelCase + dot-notation
 * shape `handleEvent` expects. Accepts payloads in either the legacy
 * snake_case or the newer dot/camelCase shape and is idempotent on the
 * latter, so it is safe to pipe every inbound event through this helper.
 */
export function normalizeSandboxEvent(raw: unknown): SandboxEvent {
  if (!raw || typeof raw !== 'object') {
    // Malformed payload — callers discard anything that fails the switch.
    return { type: 'aiwg.log', sandboxId: '', agentId: '', timestamp: new Date().toISOString() };
  }
  const src = raw as Record<string, unknown>;
  const rawType = typeof src.type === 'string' ? src.type : '';
  const type = (SNAKE_TO_DOT_EVENT_TYPE[rawType] ?? rawType) as SandboxEventType;

  // Copy every field onto the output, aliasing snake_case top-level keys
  // to their camelCase equivalents when the camelCase key is not already set.
  const out: Record<string, unknown> = { ...src, type };
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL_FIELDS)) {
    if (snake in src && out[camel] === undefined) {
      out[camel] = src[snake];
    }
  }
  // Ensure timestamp is always ISO string for downstream consumers.
  if (typeof out.timestamp !== 'string') {
    out.timestamp = new Date().toISOString();
  }
  return out as unknown as SandboxEvent;
}

// ============================================================
// Registry
// ============================================================

/**
 * Debounce window for re-registrations from the same instance_id.
 * Matches the sandbox's 5 s retry interval — suppressess flicker on rapid restarts.
 */
const DEBOUNCE_MS = 5_000;

export class SandboxRegistry {
  private sandboxes = new Map<string, SandboxRegistration>();
  private hitlRequests = new Map<string, HitlRequest>();
  private listeners = new Set<(event: SandboxEvent) => void>();
  /** instance_id → sandbox_id (stable reverse-lookup for sandbox upsert) */
  private byInstanceId = new Map<string, string>();
  /** instance_id → last registration timestamp (ms, for debounce) */
  private lastRegistrationTime = new Map<string, number>();
  /** Timer for HITL expiry checks (#908) */
  private expiryTimer: ReturnType<typeof setInterval> | null = null;
  /** agentInstanceId → { sandboxId, agentId } — cross-restart lookup (#917) */
  private byAgentInstanceId = new Map<string, { sandboxId: string; agentId: string }>();
  /** logicalName → { sandboxId, agentId } — human-readable alias lookup (#917) */
  private byLogicalName = new Map<string, { sandboxId: string; agentId: string }>();
  /** Persistent store: agentInstanceId → identity record (#917) */
  private identityStore: Map<string, AgentIdentityRecord>;

  constructor() {
    // Check for expired HITL requests every 60 seconds (#908)
    this.expiryTimer = setInterval(() => this.checkHitlExpiry(), 60_000);
    // Load persistent agent identity from disk (#917)
    this.identityStore = loadIdentityStore();
    // Restore logical names from persisted store
    for (const record of this.identityStore.values()) {
      if (record.logicalName) {
        // Will be indexed properly when agent reconnects; logical names are
        // pre-loaded so aliasAgent() calls can reference them immediately.
      }
    }
  }

  private checkHitlExpiry(): void {
    const now = new Date().toISOString();
    for (const [hitlId, req] of this.hitlRequests) {
      if (req.expiresAt && req.expiresAt <= now) {
        this.hitlRequests.delete(hitlId);
        this.emit({
          type: 'hitl.timed_out',
          sandboxId: req.sandboxId,
          agentId: req.agentId,
          timestamp: new Date().toISOString(),
          hitlId,
          sessionId: req.sessionId,
        });
      }
    }
  }

  /**
   * Register a sandbox instance.
   *
   * When the request includes a stable `instance_id`:
   *   - **Debounce**: if a registration for the same instance_id arrived within
   *     DEBOUNCE_MS, return the existing sandbox_id + token without touching state.
   *   - **Upsert**: if outside the debounce window, update the existing entry's
   *     endpoints, version, and lastRegisteredAt in-place. The sandbox_id and token
   *     are preserved so in-flight WS connections stay authenticated.
   *
   * When no instance_id is provided, a new entry is always created (legacy behaviour).
   */
  register(req: RegisterRequest): RegisterResponse {
    const instanceId = req.instance_id;
    const now = Date.now();

    if (instanceId) {
      const lastTime = this.lastRegistrationTime.get(instanceId);
      const existingId = this.byInstanceId.get(instanceId);

      // Debounce: suppress rapid re-registrations within the window
      if (lastTime !== undefined && (now - lastTime) < DEBOUNCE_MS && existingId) {
        const existing = this.sandboxes.get(existingId);
        if (existing) {
          return { sandbox_id: existingId, token: existing.token };
        }
      }

      // Upsert: same instance, update endpoints in-place
      if (existingId) {
        const existing = this.sandboxes.get(existingId);
        if (existing) {
          existing.name = req.name;
          existing.grpcEndpoint = req.grpc_endpoint;
          existing.wsEndpoint = req.ws_endpoint;
          existing.httpEndpoint = req.http_endpoint;
          existing.capabilities = req.capabilities ?? existing.capabilities;
          existing.version = req.version ?? existing.version;
          existing.lastRegisteredAt = new Date().toISOString();
          existing.connected = false; // WS will update this when it (re-)connects
          // Refresh sandbox-level inventory if provided (#906)
          if (req.agent_inventory || req.command_inventory || req.skill_inventory) {
            existing.sandboxInventory = {
              agents: req.agent_inventory ?? existing.sandboxInventory?.agents ?? [],
              commands: req.command_inventory ?? existing.sandboxInventory?.commands ?? [],
              skills: req.skill_inventory ?? existing.sandboxInventory?.skills ?? [],
              last_updated: new Date().toISOString(),
            };
          }
          // Refresh WS capabilities if provided (#912)
          if (req.ws_capabilities) {
            existing.wsCapabilities = req.ws_capabilities;
          }
          this.lastRegistrationTime.set(instanceId, now);
          return { sandbox_id: existingId, token: existing.token };
        }
      }
    }

    // New registration (no instance_id, or first time seeing this instance_id)
    const id = `sandbox-${randomUUID().slice(0, 8)}`;
    const token = randomUUID();
    const now_iso = new Date().toISOString();

    const sandboxInventory: AgentInventory | undefined =
      (req.agent_inventory || req.command_inventory || req.skill_inventory)
        ? {
            agents: req.agent_inventory ?? [],
            commands: req.command_inventory ?? [],
            skills: req.skill_inventory ?? [],
            last_updated: now_iso,
          }
        : undefined;

    const registration: SandboxRegistration = {
      id,
      name: req.name,
      instanceId,
      grpcEndpoint: req.grpc_endpoint,
      wsEndpoint: req.ws_endpoint,
      httpEndpoint: req.http_endpoint,
      capabilities: req.capabilities ?? [],
      version: req.version ?? 'unknown',
      token,
      registeredAt: now_iso,
      lastRegisteredAt: now_iso,
      lastEventAt: now_iso,
      connected: false,
      agents: new Map(),
      sandboxInventory,
      wsCapabilities: req.ws_capabilities,
    };

    this.sandboxes.set(id, registration);
    if (instanceId) {
      this.byInstanceId.set(instanceId, id);
      this.lastRegistrationTime.set(instanceId, now);
    }
    return { sandbox_id: id, token };
  }

  /**
   * Remove all disconnected sandboxes from the registry.
   * Forces re-registration on next sandbox startup.
   * Returns the number of entries removed.
   */
  clearOffline(): number {
    const toRemove: string[] = [];
    for (const [id, sandbox] of this.sandboxes) {
      if (!sandbox.connected) toRemove.push(id);
    }
    for (const id of toRemove) {
      this.deregister(id);
    }
    return toRemove.length;
  }

  /**
   * Deregister a sandbox (on shutdown or explicit delete).
   */
  deregister(id: string): boolean {
    const sandbox = this.sandboxes.get(id);
    if (sandbox?.instanceId) {
      this.byInstanceId.delete(sandbox.instanceId);
      this.lastRegistrationTime.delete(sandbox.instanceId);
    }
    return this.sandboxes.delete(id);
  }

  /**
   * Get a sandbox by ID.
   */
  get(id: string): SandboxRegistration | undefined {
    return this.sandboxes.get(id);
  }

  /**
   * Validate the auth token for a sandbox.
   */
  authenticate(id: string, token: string): boolean {
    const sandbox = this.sandboxes.get(id);
    return sandbox !== undefined && sandbox.token === token;
  }

  /**
   * Mark the event push WebSocket as connected/disconnected.
   */
  setConnected(id: string, connected: boolean): void {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) return;
    sandbox.connected = connected;
    if (!connected) sandbox.disconnectedAt = new Date().toISOString();
  }

  /**
   * List all registered sandboxes (serializable).
   */
  list(): SandboxSummary[] {
    return [...this.sandboxes.values()].map(toSummary);
  }

  /**
   * Get a sandbox summary by ID (serializable).
   */
  getSummary(id: string): SandboxSummary | undefined {
    const sandbox = this.sandboxes.get(id);
    return sandbox ? toSummary(sandbox) : undefined;
  }

  /**
   * Process an event pushed from a sandbox.
   * Updates internal agent inventory and notifies listeners.
   */
  handleEvent(event: SandboxEvent): void {
    const sandbox = this.sandboxes.get(event.sandboxId);
    if (!sandbox) return;

    sandbox.lastEventAt = event.timestamp || new Date().toISOString();

    // Normalize the two underscore variants the sandbox emits for session events.
    // Other event types (agent.connected, hitl.input_required, etc.) use dot notation
    // already and must not be altered.
    const rawType = event.type as string;
    const eventType = (rawType === 'session_start' ? 'session.start'
      : rawType === 'session_end' ? 'session.end'
      : rawType) as SandboxEventType;

    // Update agent inventory based on event type
    switch (eventType) {
      case 'agent.connected': {
        // Resolve persistent logical name from identity store (#917)
        const agentInstanceId = event.agentInstanceId;
        let logicalName = event.agentLogicalName;
        if (agentInstanceId) {
          const record = this.identityStore.get(agentInstanceId);
          if (record) {
            logicalName = logicalName ?? record.logicalName;
            // Update record with current location
            record.lastAgentId = event.agentId;
            record.lastSandboxId = event.sandboxId;
            record.lastSeenAt = event.timestamp;
            if (!record.logicalName && logicalName) record.logicalName = logicalName;
          } else {
            this.identityStore.set(agentInstanceId, {
              instanceId: agentInstanceId,
              logicalName,
              lastAgentId: event.agentId,
              lastSandboxId: event.sandboxId,
              lastSeenAt: event.timestamp,
            });
          }
          saveIdentityStore(this.identityStore);
          this.byAgentInstanceId.set(agentInstanceId, { sandboxId: event.sandboxId, agentId: event.agentId });
        }
        if (logicalName) {
          this.byLogicalName.set(logicalName, { sandboxId: event.sandboxId, agentId: event.agentId });
        }
        sandbox.agents.set(event.agentId, {
          agentId: event.agentId,
          status: 'ready',
          loadout: event.loadout,
          aiwgFrameworks: event.aiwgFrameworks,
          connectedAt: event.timestamp,
          lastHeartbeat: event.timestamp,
          instanceId: agentInstanceId,
          logicalName,
        });
        break;
      }
      case 'agent.disconnected': {
        const agent = sandbox.agents.get(event.agentId);
        if (agent) agent.status = 'disconnected';
        break;
      }
      case 'agent.provisioning': {
        sandbox.agents.set(event.agentId, {
          agentId: event.agentId,
          status: 'provisioning',
          loadout: event.loadout,
          lastHeartbeat: event.timestamp,
        });
        break;
      }
      case 'agent.ready': {
        const existing = sandbox.agents.get(event.agentId);
        if (existing) {
          existing.status = 'ready';
          existing.lastHeartbeat = event.timestamp;
        }
        break;
      }
      case 'session.start': {
        const agent = sandbox.agents.get(event.agentId);
        if (agent) {
          agent.status = 'busy';
          agent.sessionCount = (agent.sessionCount ?? 0) + 1;
          agent.lastHeartbeat = event.timestamp;
        }
        break;
      }
      case 'session.end': {
        const agent = sandbox.agents.get(event.agentId);
        if (agent) {
          if (agent.status === 'busy') agent.status = 'ready';
          if (agent.sessionCount) agent.sessionCount = Math.max(0, agent.sessionCount - 1);
          agent.lastHeartbeat = event.timestamp;
        }
        break;
      }
      case 'agent.sessions': {
        // Full inventory replace (#1151). The sandbox is authoritative for
        // session state — replacing wholesale (rather than merging) means a
        // missed session.start / session.end can't permanently desync the
        // count. sessionCount is also resynced from the new array length so
        // the legacy approximate-count consumers stay accurate.
        const agent = sandbox.agents.get(event.agentId);
        if (agent && Array.isArray(event.sessions)) {
          agent.sessions = event.sessions;
          agent.sessionCount = event.sessions.length;
          agent.lastHeartbeat = event.timestamp;
        }
        break;
      }
      case 'hitl.input_required': {
        if (event.hitlId && event.sessionId) {
          this.hitlRequests.set(event.hitlId, {
            id: event.hitlId,
            sandboxId: event.sandboxId,
            agentId: event.agentId,
            sessionId: event.sessionId,
            timestamp: event.timestamp,
            prompt: event.prompt ?? '',
            context: event.context ?? '',
            expiresAt: event.expiresAt,
          });
        }
        break;
      }
      case 'agent.inventory_updated': {
        // Update the agent's manifest inventory (#906)
        const agent = sandbox.agents.get(event.agentId);
        if (agent && (event.agentInventory || event.commandInventory || event.skillInventory)) {
          agent.inventory = {
            agents: event.agentInventory ?? agent.inventory?.agents ?? [],
            commands: event.commandInventory ?? agent.inventory?.commands ?? [],
            skills: event.skillInventory ?? agent.inventory?.skills ?? [],
            last_updated: event.timestamp,
          };
          agent.lastHeartbeat = event.timestamp;
        }
        break;
      }
      case 'agent.metrics_updated': {
        // Store latest metrics + rolling history (#911)
        if (event.metrics) {
          const agent = sandbox.agents.get(event.agentId);
          if (agent) {
            agent.latestMetrics = event.metrics;
            const sample: AgentMetricsSample = {
              cpu_percent: event.metrics.cpu_percent,
              memory_percent: event.metrics.memory_total_bytes > 0
                ? (event.metrics.memory_used_bytes / event.metrics.memory_total_bytes) * 100
                : 0,
              ts: event.metrics.ts,
            };
            if (!agent.metricsHistory) agent.metricsHistory = [];
            agent.metricsHistory.push(sample);
            if (agent.metricsHistory.length > METRICS_HISTORY_MAX) {
              agent.metricsHistory = agent.metricsHistory.slice(-METRICS_HISTORY_MAX);
            }
            agent.lastHeartbeat = event.timestamp;
          }
        }
        break;
      }
      case 'agent.provisioning_step': {
        // Store current provisioning step (#911)
        const agent = sandbox.agents.get(event.agentId);
        if (agent && event.step) {
          agent.provisioningStep = {
            step: event.step,
            step_index: event.stepIndex,
            total_steps: event.totalSteps,
            elapsed_seconds: event.elapsedSeconds,
            ts: event.timestamp,
          };
          agent.provisioningStalled = false;
          agent.lastHeartbeat = event.timestamp;
        }
        break;
      }
      case 'agent.provisioning_stalled': {
        // Mark provisioning as stalled (#911)
        const agent = sandbox.agents.get(event.agentId);
        if (agent) {
          agent.provisioningStalled = true;
          agent.lastHeartbeat = event.timestamp;
        }
        break;
      }
      // Task lifecycle events — no local state update, listeners handle display (#907)
      case 'task.submitted':
      case 'task.started':
      case 'task.progressed':
      case 'task.completed':
      case 'task.failed':
      // Pass-through events — no AIWG state to update (#910 #913 #914)
      case 'framework.update_available':
      case 'session.screen_updated':
      case 'aiwg.log':
      // Synthetic HITL events — emitted by aiwg serve, no state to update (#908)
      case 'hitl.responded':
      case 'hitl.timed_out':
        break;
      default: {
        // Unknown event type — likely a wire-protocol drift between
        // agentic-sandbox and AIWG. See #933 for the snake_case fix that
        // started tracking this. Log so future mismatches surface loudly
        // instead of silently dropping dashboard state.
        if (process.env.AIWG_SERVE_DEBUG === '1') {
          console.warn(`[sandbox-registry] unknown event type "${String(eventType)}" from sandbox ${event.sandboxId} — ignored. Payload keys:`, Object.keys(event as unknown as Record<string, unknown>));
        }
        break;
      }
    }

    // Notify listeners (browser push, telemetry, etc.)
    this.emit(event);
  }

  /**
   * Emit a synthetic event to all listeners without modifying internal state.
   * Used by serve.ts to push server-side events (e.g. hitl.responded) to the browser.
   */
  emit(event: SandboxEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore listener errors */ }
    }
  }

  /**
   * Get all agents across all sandboxes.
   */
  allAgents(): Array<SandboxAgent & { sandboxId: string; sandboxName: string }> {
    const result: Array<SandboxAgent & { sandboxId: string; sandboxName: string }> = [];
    for (const sandbox of this.sandboxes.values()) {
      for (const agent of sandbox.agents.values()) {
        result.push({ ...agent, sandboxId: sandbox.id, sandboxName: sandbox.name });
      }
    }
    return result;
  }

  /**
   * Resolve an agent reference by agentId → instanceId → logicalName (#917).
   * Returns the sandbox registration and agent, or undefined if not found.
   */
  resolveAgent(ref: string): { sandbox: SandboxRegistration; agent: SandboxAgent } | undefined {
    // 1. Direct agentId lookup
    for (const sandbox of this.sandboxes.values()) {
      const agent = sandbox.agents.get(ref);
      if (agent) return { sandbox, agent };
    }
    // 2. agentInstanceId lookup
    const byInstance = this.byAgentInstanceId.get(ref);
    if (byInstance) {
      const sandbox = this.sandboxes.get(byInstance.sandboxId);
      const agent = sandbox?.agents.get(byInstance.agentId);
      if (sandbox && agent) return { sandbox, agent };
    }
    // 3. logicalName lookup
    const byName = this.byLogicalName.get(ref);
    if (byName) {
      const sandbox = this.sandboxes.get(byName.sandboxId);
      const agent = sandbox?.agents.get(byName.agentId);
      if (sandbox && agent) return { sandbox, agent };
    }
    return undefined;
  }

  /**
   * Assign a stable logical name to an agent (#917).
   * Persists the mapping to ~/.config/aiwg/sandbox-agents.json.
   */
  aliasAgent(sandboxId: string, agentId: string, logicalName: string): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    const agent = sandbox?.agents.get(agentId);
    if (!sandbox || !agent) return false;

    // Remove old logical name index if any
    if (agent.logicalName && agent.logicalName !== logicalName) {
      this.byLogicalName.delete(agent.logicalName);
    }
    agent.logicalName = logicalName;
    this.byLogicalName.set(logicalName, { sandboxId, agentId });

    // Persist to store
    const instanceId = agent.instanceId;
    if (instanceId) {
      const record = this.identityStore.get(instanceId) ?? {
        instanceId,
        lastAgentId: agentId,
        lastSandboxId: sandboxId,
        lastSeenAt: new Date().toISOString(),
      };
      record.logicalName = logicalName;
      this.identityStore.set(instanceId, record);
      saveIdentityStore(this.identityStore);
    }
    return true;
  }

  /**
   * List known agent identities from the persistent store (#917).
   */
  knownAgentIdentities(): AgentIdentityRecord[] {
    return [...this.identityStore.values()];
  }

  // ---- HITL ----

  /**
   * List pending HITL requests.
   */
  pendingHitl(): HitlRequest[] {
    return [...this.hitlRequests.values()];
  }

  /**
   * Get a specific HITL request.
   */
  getHitl(hitlId: string): HitlRequest | undefined {
    return this.hitlRequests.get(hitlId);
  }

  /**
   * Remove a HITL request (after response or dismissal).
   */
  resolveHitl(hitlId: string): HitlRequest | undefined {
    const req = this.hitlRequests.get(hitlId);
    this.hitlRequests.delete(hitlId);
    return req;
  }

  // ---- Event subscription ----

  /**
   * Subscribe to sandbox events (returns unsubscribe fn).
   */
  subscribe(listener: (event: SandboxEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /**
   * Total registered sandbox count.
   */
  get size(): number {
    return this.sandboxes.size;
  }

  /**
   * Shut down — clear all state and stop background timers.
   */
  shutdown(): void {
    if (this.expiryTimer !== null) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = null;
    }
    this.sandboxes.clear();
    this.hitlRequests.clear();
    this.listeners.clear();
    this.byInstanceId.clear();
    this.lastRegistrationTime.clear();
    this.byAgentInstanceId.clear();
    this.byLogicalName.clear();
  }
}

// ============================================================
// Serialization helpers
// ============================================================

export interface SandboxSummary {
  id: string;
  /** Stable instance identity — canonical UI identifier, prefix for display */
  instanceId?: string;
  name: string;
  grpcEndpoint: string;
  wsEndpoint: string;
  httpEndpoint: string;
  capabilities: string[];
  version: string;
  registeredAt: string;
  lastRegisteredAt: string;
  lastEventAt: string;
  connected: boolean;
  /** ISO timestamp of last disconnect — present when connected is false */
  disconnectedAt?: string;
  agentCount: number;
  agents: Array<SandboxAgent>;
  /** Sandbox-level artifact inventory reported at registration time (#906) */
  sandboxInventory?: AgentInventory;
  /** WebSocket protocol capabilities advertised at registration (#912) */
  wsCapabilities?: SandboxCapabilities;
}

function toSummary(s: SandboxRegistration): SandboxSummary {
  return {
    id: s.id,
    instanceId: s.instanceId,
    name: s.name,
    grpcEndpoint: s.grpcEndpoint,
    wsEndpoint: s.wsEndpoint,
    httpEndpoint: s.httpEndpoint,
    capabilities: s.capabilities,
    version: s.version,
    registeredAt: s.registeredAt,
    lastRegisteredAt: s.lastRegisteredAt,
    lastEventAt: s.lastEventAt,
    connected: s.connected,
    disconnectedAt: s.disconnectedAt,
    agentCount: s.agents.size,
    agents: [...s.agents.values()],
    sandboxInventory: s.sandboxInventory,
    wsCapabilities: s.wsCapabilities,
  };
}

// Singleton instance
export const sandboxRegistry = new SandboxRegistry();
