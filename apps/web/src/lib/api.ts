/**
 * REST API client for aiwg serve HTTP endpoints.
 */

const BASE = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.clone().json() as { error?: unknown };
      const err = body?.error;
      if (typeof err === 'string') detail = err;
      else if (err && typeof err === 'object') {
        const m = (err as { message?: unknown }).message;
        if (typeof m === 'string') detail = m;
        else detail = JSON.stringify(err);
      }
    } catch {
      try { detail = await res.text(); } catch { /* ignore */ }
    }
    const suffix = detail ? ` — ${detail}` : '';
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}${suffix}`);
  }
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: 'ok';
  readOnly: boolean;
}

export interface SessionsResponse {
  sessions: string[];
}

export interface MissionsResponse {
  missions: unknown[];
}

export interface TelemetryResponse {
  events: unknown[];
}

// ---- Protocol capabilities (#912) ----

export interface SandboxCapabilities {
  ws_protocol_version: number;
  supported_client_messages: string[];
  supported_server_messages: string[];
  features: string[];
}

/** Returns true if the sandbox advertises a named feature flag. */
export function sandboxHasFeature(caps: SandboxCapabilities | undefined, feature: string): boolean {
  return caps?.features.includes(feature) ?? false;
}

// ---- Metrics types (#911) ----

export interface AgentMetrics {
  cpu_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  uptime_seconds: number;
  load_avg_1m?: number;
  disk_used_bytes?: number;
  disk_total_bytes?: number;
  /** Unix timestamp (ms) */
  ts: number;
}

export interface AgentMetricsSample {
  cpu_percent: number;
  memory_percent: number;
  ts: number;
}

// ---- Provisioning types (#911) ----

export interface ProvisioningStep {
  step: string;
  step_index?: number;
  total_steps?: number;
  elapsed_seconds?: number;
  ts: string;
}

// ---- Screen state types (#913) ----

export interface ScreenStateResponse {
  session_id: string;
  rows: number;
  cols: number;
  text: string;
  cursor: { row: number; col: number };
  scrollback_tail?: string;
  prompt_detected: boolean;
  prompt_text?: string;
}

// ---- Remote AIWG exec types (#914) ----

export interface AiwgExecRequest {
  subcommand: string;
  args?: string[];
  timeout?: number;
}

export interface AiwgExecResponse {
  exit_code: number;
  stdout: string;
  stderr: string;
}

// ---- Agent manifest types (#909) ----

export interface AgentDeploymentStatus {
  name: string;
  local_hash: string;
  deployed_hash: string;
  in_sync: boolean;
}

export interface ManifestListResponse {
  platform: string;
  manifests: AgentDeploymentStatus[];
}

// ---- Inventory types (#906) ----

export interface AgentManifestSummary {
  name: string;
  description: string;
  model?: string;
  category: string;
  platform: string;
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

// ---- Sandbox types (#731) ----

/**
 * One live session record on an agent (#1151). Mirrored from the
 * sandbox-registry SessionInfo type — pushed via agent.sessions events and
 * surfaced in InstancesList as the per-row session count badge.
 */
export interface SessionInfo {
  session_id: string;
  session_name: string;
  session_type: 'interactive' | 'headless' | 'background';
  command: string;
  /** Unix epoch seconds — raw so the consumer formats locally. */
  created_at_secs: number;
  has_screen: boolean;
}

export interface SandboxAgent {
  agentId: string;
  status: 'starting' | 'provisioning' | 'ready' | 'busy' | 'error' | 'disconnected';
  loadout?: string;
  /** Framework list — includes optional version/content_hash for version tracking (#910) */
  aiwgFrameworks?: Array<{ name: string; providers: string[]; version?: string; content_hash?: string }>;
  sandboxId?: string;
  sandboxName?: string;
  /** Agent/command/skill manifest inventory (#906) */
  inventory?: AgentInventory;
  /** Latest metrics snapshot (#911) */
  latestMetrics?: AgentMetrics;
  /** Rolling metrics history for sparklines (#911) */
  metricsHistory?: AgentMetricsSample[];
  /** Current provisioning step (#911) */
  provisioningStep?: ProvisioningStep;
  /** True if provisioning has stalled (#911) */
  provisioningStalled?: boolean;
  /** Stable agent instance UUIDv7 — survives restarts and reprovisions (#917) */
  instanceId?: string;
  /** Operator-assigned stable human-readable name (e.g. "security-01") (#917) */
  logicalName?: string;
  /** Authoritative live session inventory — populated by `agent.sessions`
   *  events (#1151, sandbox#192). Undefined when the sandbox is on a build
   *  that doesn't emit the event yet — UI should fall back to "no badge"
   *  rather than "0 sessions" for unknown state. */
  sessions?: SessionInfo[];
}

// ---- Agent identity types (#917) ----

export interface AgentIdentityRecord {
  instanceId: string;
  logicalName?: string;
  lastAgentId?: string;
  lastSandboxId?: string;
  lastSeenAt: string;
}

export interface AgentIdentitiesResponse {
  identities: AgentIdentityRecord[];
}

export interface ResolveAgentResponse {
  sandboxId: string;
  sandboxName: string;
  agent: SandboxAgent;
}

export interface SandboxSummary {
  id: string;
  /** Stable UUIDv7 — persisted across sandbox restarts */
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
  /** ISO timestamp of last disconnect — undefined while connected */
  disconnectedAt?: string;
  agentCount: number;
  agents: SandboxAgent[];
  /** Sandbox-level artifact inventory reported at registration (#906) */
  sandboxInventory?: AgentInventory;
  /** WebSocket protocol capabilities (#912) */
  wsCapabilities?: SandboxCapabilities;
}

export interface SandboxesResponse {
  sandboxes: SandboxSummary[];
}

export interface AgentsResponse {
  agents: SandboxAgent[];
}

// ---- VM types (#930) ----

/** VM state as reported by sandbox GET /api/v1/vms. */
export type VmState =
  | 'running'
  | 'stopped'
  | 'paused'
  | 'shutdown'
  | 'crashed'
  | 'suspended'
  | 'unknown';

export interface VmInfo {
  name: string;
  state: VmState;
  uuid?: string;
  vcpus?: number;
  memory_mb?: number;
  ip_address?: string | null;
  uptime_seconds?: number | null;
}

export interface VmsResponse {
  vms: VmInfo[];
  total: number;
}

/** Extended VM detail returned by GET /api/v1/vms/{name}. */
export interface VmDetail extends VmInfo {
  agent?: {
    connected: boolean;
    connected_at?: number;
    hostname?: string;
  };
}

// ---- Container types (#1146) ----

/** Container info as reported by sandbox GET /api/v1/containers. */
export interface ContainerInfo {
  id: string;
  name: string;
  /** docker_runtime::ContainerStatus serialized as a string. Common values:
   *  "running", "stopped", "exited", "paused", "restarting", "dead". */
  status: string;
  finished_at?: string;
}

export interface ContainersResponse {
  containers: ContainerInfo[];
  total: number;
}

/** Curated agent container image — GET /api/v1/container-images. */
export interface ContainerImage {
  /** Full image reference (`agentic/claude:latest`). The `ref` field name is
   *  intentional — that's the on-the-wire JSON key. */
  ref: string;
  label: string;
  description: string;
  default?: boolean;
}

export interface ContainerImagesResponse {
  images: ContainerImage[];
}

export interface CreateContainerRequest {
  name: string;
  image: string;
  env?: string[] | Array<{ key: string; value: string }>;
  mounts?: string[];
  network?: string;
  cmd?: string[];
}

/** Authoritative agent record from sandbox HTTP API (not the event-cached view). */
export interface FullSandboxAgent {
  id: string;
  hostname?: string;
  ip_address?: string;
  status: string;
  connected_at?: number;
  last_heartbeat?: number;
  metrics?: Record<string, unknown>;
  system_info?: Record<string, unknown>;
}

export interface FullAgentsResponse {
  agents: FullSandboxAgent[];
}

// ---- HITL types (#732) ----

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

export interface HitlResponse {
  requests: HitlRequest[];
}

// ---- Connections types (#887) ----

export interface ConnectionsResponse {
  server: { status: 'ok'; readOnly: boolean; uptime: number };
  ptySessions: string[];
  sandboxes: Array<{
    id: string;
    name: string;
    connected: boolean;
    agentCount: number;
    /** #1157 — total VMs reported by the sandbox; null when offline or unavailable */
    vmCount: number | null;
    /** #1157 — total containers reported by the sandbox; null when offline or unavailable */
    containerCount: number | null;
  }>;
  mcpServers: Array<{ name: string; status: string }>;
  subsystems: {
    ralph: { status: 'active' | 'idle' | 'unknown'; activeLoops: number };
    missions: { status: string; count: number };
    daemon: { status: string };
    rlm: { status: string };
    memory: { status: string };
  };
}

// ---- Session types (#896) ----

export interface Session {
  session_id: string;
  session_name: string;
  session_type: 'interactive' | 'headless' | 'background';
  command: string;
  /** Elapsed seconds since session creation (monotonic clock on sandbox) */
  created_at_secs: number;
  /** True if the ScreenRegistry has live VT100 state — attachable via orchestrate WS */
  has_screen: boolean;
}

export interface SessionsListResponse {
  agent_id: string;
  sessions: Session[];
}

export interface CreateSessionRequest {
  command?: string;
  session_name?: string;
}

export interface CreateSessionResponse {
  session_id: string;
  session_name: string;
  // #1155 / agentic-sandbox#191 — v2026.5.0 dropped the bogus `ws_url` field
  // (the path didn't actually exist) and replaced it with a self-describing
  // pair: a bare WS endpoint to dial and a pre-baked first frame to send.
  /** Bare WS endpoint to dial (host placeholder substituted by client). */
  ws_endpoint: string;
  /** Pre-baked first frame to send on the freshly-opened WS. */
  join_message: { type: 'join_session'; session_id: string; role?: 'controller' | 'observer' };
  /** @deprecated Removed in agentic-sandbox v2026.5.0; kept optional for older sandboxes. */
  ws_url?: string;
}

// ---- Loadout types (#733 #915) ----

export interface LoadoutResources {
  cpus?: number;
  memory?: string;
  disk?: string;
}

export interface LoadoutFrameworkRef {
  name: string;
  providers?: string[];
}

/** Loadout profile metadata returned by GET /api/v1/loadouts on the sandbox. */
export interface Loadout {
  name: string;
  /** Relative path used as the loadout identifier when creating a VM. */
  path: string;
  description?: string;
  category?: string;
  complexity?: string;
  resources?: LoadoutResources;
  network_mode?: string;
  ai_tools?: string[];
  frameworks?: LoadoutFrameworkRef[];
  extends?: string[];
}

export interface LoadoutsResponse {
  loadouts: Loadout[];
}

// ---- Loadout registry (compose builder) ----

export interface RegistryFramework {
  name: string;
  label: string;
  description?: string;
  reserved?: boolean;
}

export interface RegistryProvider {
  name: string;
  label: string;
  layer?: string;
}

export interface RegistryInitScript {
  name: string;
  label: string;
  description?: string;
  default?: boolean;
  layers?: string[];
}

export interface LoadoutRegistry {
  version?: string;
  frameworks: RegistryFramework[];
  providers: RegistryProvider[];
  init_scripts: RegistryInitScript[];
}

/** Body for VM creation. Mirrors the sandbox /api/v1/vms contract. */
export interface CreateVmRequest {
  name: string;
  /** Optional named profile (legacy); empty when using loadout or composition. */
  profile?: string;
  /** Loadout path (preset mode). Empty in custom mode. */
  loadout?: string;
  /** Custom composition (overrides loadout when provided). */
  composition?: {
    init?: string;
    aiwg?: {
      frameworks?: string[];
      providers?: string[];
    };
  };
  vcpus?: number;
  memory_mb?: number;
  disk_gb?: number;
  agentshare?: boolean;
  start?: boolean;
}

// ---- Task types (#907) ----

export interface SandboxTaskProgress {
  output_bytes: number;
  tool_calls: number;
  current_tool?: string;
  last_activity_at?: string;
}

export interface SandboxTask {
  id: string;
  name: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | string;
  state_message?: string;
  created_at: string;
  started_at?: string;
  state_changed_at: string;
  vm_name?: string;
  vm_ip?: string;
  exit_code?: number;
  error?: string;
  progress: SandboxTaskProgress;
}

export interface SandboxTasksResponse {
  tasks: SandboxTask[];
  total_count: number;
}

// ---- Agent routing types (#916) ----

export interface AgentFilter {
  sandbox_id?: string;
  agent_id?: string;
  agent_name?: string;
  platform?: string;
  frameworks?: string[];
  agents?: string[];
  skills?: string[];
  min_memory_gb?: number;
  max_cpu_percent?: number;
  fallback?: { strategy: 'any_with_framework' | 'any' | 'none'; retry_after_seconds?: number; max_retries?: number };
}

export interface AgentCandidate {
  sandboxId: string;
  sandboxName: string;
  agent: SandboxAgent;
  matchReason: string;
  rejected?: Array<{ agentId: string; reason: string }>;
}

export interface RoutingResult {
  selected?: AgentCandidate;
  candidates: AgentCandidate[];
  filter: AgentFilter;
}

export interface SubmitTaskRequest {
  /** YAML manifest as a string */
  manifest_yaml?: string;
  /** JSON manifest (alternative to YAML) */
  manifest?: Record<string, unknown>;
  /** Agent routing filter — selects which agent to run this task (#916) */
  agent_filter?: AgentFilter;
}

export interface SubmitTaskResponse {
  task_id: string;
  accepted: boolean;
  error?: string;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  sessions: () => request<SessionsResponse>('/api/sessions'),
  missions: () => request<MissionsResponse>('/api/missions'),
  telemetry: () => request<TelemetryResponse>('/api/telemetry'),

  // Connections (#887)
  connections: () => request<ConnectionsResponse>('/api/connections'),

  // Sandbox (#731)
  sandboxes: () => request<SandboxesResponse>('/api/sandboxes'),
  clearOfflineSandboxes: () => request<{ ok: boolean; removed: number }>('/api/sandboxes/offline', { method: 'DELETE' }),
  forgetSandbox: (id: string) => request<{ ok: boolean }>(`/api/sandboxes/${id}/forget`, { method: 'DELETE' }),
  agents: () => request<AgentsResponse>('/api/agents'),
  sandboxAgents: (id: string) => request<{ agents: SandboxAgent[] }>(`/api/sandboxes/${id}/agents`),
  sandboxLoadouts: (id: string) => request<LoadoutsResponse>(`/api/sandboxes/${id}/loadouts`),
  sandboxLoadoutRegistry: (id: string) => request<LoadoutRegistry>(`/api/sandboxes/${id}/loadout-registry`),
  // VM inventory (#930)
  sandboxVms: (id: string, opts?: { state?: string; prefix?: string }) => {
    const params = new URLSearchParams();
    if (opts?.state) params.set('state', opts.state);
    if (opts?.prefix) params.set('prefix', opts.prefix);
    const qs = params.toString();
    return request<VmsResponse>(`/api/sandboxes/${id}/vms${qs ? `?${qs}` : ''}`);
  },
  sandboxVm: (id: string, name: string) =>
    request<VmDetail>(`/api/sandboxes/${id}/vms/${encodeURIComponent(name)}`),
  sandboxAgentsFull: (id: string) =>
    request<FullAgentsResponse>(`/api/sandboxes/${id}/agents/full`),
  sandboxProvision: (id: string, body: CreateVmRequest) =>
    request<{ agent_id?: string; operation?: { id: string } }>(`/api/sandboxes/${id}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  agentAction: (sandboxId: string, agentId: string, action: 'start' | 'stop' | 'destroy' | 'reprovision') =>
    request<{ ok: boolean }>(`/api/sandboxes/${sandboxId}/agents/${agentId}/${action}`, { method: 'POST' }),

  // VM lifecycle (#1146)
  vmAction: (
    sandboxId: string,
    name: string,
    action: 'start' | 'stop' | 'restart' | 'destroy' | 'deploy-agent',
    body?: unknown,
  ) =>
    request<unknown>(`/api/sandboxes/${sandboxId}/vms/${encodeURIComponent(name)}/${action}`, {
      method: 'POST',
      ...(body !== undefined
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    }),
  deleteVm: (sandboxId: string, name: string, opts?: { force?: boolean; deleteDisk?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.force) params.set('force', 'true');
    if (opts?.deleteDisk) params.set('delete_disk', 'true');
    const qs = params.toString();
    return request<unknown>(
      `/api/sandboxes/${sandboxId}/vms/${encodeURIComponent(name)}${qs ? `?${qs}` : ''}`,
      { method: 'DELETE' },
    );
  },

  // Containers (#1146)
  sandboxContainers: (sandboxId: string, opts?: { status?: 'running' | 'stopped' | 'all' }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    const qs = params.toString();
    return request<ContainersResponse>(`/api/sandboxes/${sandboxId}/containers${qs ? `?${qs}` : ''}`);
  },
  sandboxContainer: (sandboxId: string, name: string) =>
    request<ContainerInfo>(`/api/sandboxes/${sandboxId}/containers/${encodeURIComponent(name)}`),
  createContainer: (sandboxId: string, body: CreateContainerRequest) =>
    request<ContainerInfo>(`/api/sandboxes/${sandboxId}/containers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  containerAction: (sandboxId: string, name: string, action: 'start' | 'stop') =>
    request<unknown>(
      `/api/sandboxes/${sandboxId}/containers/${encodeURIComponent(name)}/${action}`,
      { method: 'POST' },
    ),
  deleteContainer: (sandboxId: string, name: string) =>
    request<unknown>(`/api/sandboxes/${sandboxId}/containers/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  sandboxContainerImages: (sandboxId: string) =>
    request<ContainerImagesResponse>(`/api/sandboxes/${sandboxId}/container-images`),

  // Sessions (#896)
  agentSessions: (sandboxId: string, agentId: string) =>
    request<SessionsListResponse>(`/api/sandboxes/${sandboxId}/agents/${agentId}/sessions`),
  createSession: (sandboxId: string, agentId: string, body: CreateSessionRequest = {}) =>
    request<CreateSessionResponse>(`/api/sandboxes/${sandboxId}/agents/${agentId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  /** Kill a session by its session_name (the DELETE path key on the sandbox). */
  killSession: (sandboxId: string, agentId: string, sessionName: string) =>
    request<void>(`/api/sandboxes/${sandboxId}/agents/${agentId}/sessions/${encodeURIComponent(sessionName)}`, { method: 'DELETE' }),

  // Tasks (#907)
  sandboxTasks: (sandboxId: string, state?: string) =>
    request<SandboxTasksResponse>(`/api/sandboxes/${sandboxId}/tasks${state ? `?state=${encodeURIComponent(state)}` : ''}`),
  submitTask: (sandboxId: string, body: SubmitTaskRequest) =>
    request<SubmitTaskResponse>(`/api/sandboxes/${sandboxId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  getTask: (sandboxId: string, taskId: string) =>
    request<SandboxTask>(`/api/sandboxes/${sandboxId}/tasks/${taskId}`),
  cancelTask: (sandboxId: string, taskId: string) =>
    request<void>(`/api/sandboxes/${sandboxId}/tasks/${taskId}`, { method: 'DELETE' }),

  // Screen state (#913)
  sessionScreen: (sandboxId: string, sessionId: string) =>
    request<ScreenStateResponse>(`/api/sandboxes/${sandboxId}/sessions/${sessionId}/screen`),

  // Remote AIWG exec (#914)
  aiwgExec: (sandboxId: string, agentId: string, body: AiwgExecRequest) =>
    request<AiwgExecResponse>(`/api/sandboxes/${sandboxId}/agents/${agentId}/aiwg/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  // Framework update (#910)
  updateFramework: (sandboxId: string, agentId: string, frameworkName: string, version?: string) =>
    request<void>(`/api/sandboxes/${sandboxId}/agents/${agentId}/frameworks/${frameworkName}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    }),

  // Agent manifest discovery and push (#909)
  listManifests: (sandboxId: string, agentId: string, platform: string) =>
    request<ManifestListResponse>(`/api/sandboxes/${sandboxId}/agents/${agentId}/manifests/${platform}`),
  pushManifest: (sandboxId: string, agentId: string, platform: string, body: { name: string; content: string; content_hash: string }) =>
    request<{ ok: boolean }>(`/api/sandboxes/${sandboxId}/agents/${agentId}/manifests/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  // Agent routing (#916)
  routingCandidates: (filter: AgentFilter) => {
    const params = new URLSearchParams();
    if (filter.sandbox_id) params.set('sandbox_id', filter.sandbox_id);
    if (filter.agent_id) params.set('agent_id', filter.agent_id);
    if (filter.agent_name) params.set('agent_name', filter.agent_name);
    if (filter.frameworks?.length) params.set('frameworks', filter.frameworks.join(','));
    if (filter.agents?.length) params.set('agents', filter.agents.join(','));
    if (filter.skills?.length) params.set('skills', filter.skills.join(','));
    if (filter.max_cpu_percent !== undefined) params.set('max_cpu_percent', String(filter.max_cpu_percent));
    if (filter.min_memory_gb !== undefined) params.set('min_memory_gb', String(filter.min_memory_gb));
    return request<RoutingResult>(`/api/agents/candidates?${params.toString()}`);
  },

  // Agent identity (#917)
  aliasAgent: (sandboxId: string, agentId: string, name: string) =>
    request<{ ok: boolean; logicalName: string }>(`/api/sandboxes/${sandboxId}/agents/${agentId}/alias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  resolveAgent: (ref: string) =>
    request<ResolveAgentResponse>(`/api/agents/resolve/${encodeURIComponent(ref)}`),
  agentIdentities: () =>
    request<AgentIdentitiesResponse>('/api/agents/identities'),

  // HITL (#732)
  hitl: () => request<HitlResponse>('/api/hitl'),
  hitlRespond: (hitlId: string, text: string) =>
    request<{ ok: boolean }>(`/api/hitl/${hitlId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }),
  hitlDismiss: (hitlId: string) =>
    request<{ ok: boolean }>(`/api/hitl/${hitlId}/dismiss`, { method: 'POST' }),
};
