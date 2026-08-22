export interface RuntimePosture {
  kind: string;
  isolation: 'least' | 'shared-kernel' | 'strong' | 'opaque' | 'unknown';
  label: string;
  warning?: string;
}
export interface HostDaemonStatus {
  status: 'detected' | 'available' | 'unavailable' | 'permission_denied' | 'degraded' | 'stopped' | 'unknown';
  detail?: string;
  operator_command?: string;
}
export interface TransportPosture {
  mode: string;
  trust: 'secure' | 'local' | 'compatibility' | 'degraded' | 'unknown';
  label: string;
  source: string;
  evidence?: string;
  stale?: boolean;
}
export interface ManagedDockerPosture {
  transport_mode: string;
  control_identity_present: boolean;
  control_identity_range_valid: boolean;
  workload_uid?: number;
  workload_identity_separated: boolean;
  boundary: string;
  secure_default: boolean;
  compatibility: boolean;
  fallback_reason?: string;
  requires_recreation: boolean;
  source: string;
}
export interface BootstrapTrustPosture {
  status: 'secure' | 'degraded' | 'disabled' | (string & {});
  mode: 'mtls' | 'plaintext-dev' | 'disabled' | (string & {});
  label: string;
  source: string;
  ca_provider_ref?: string;
  trust_bundle_ref?: string;
  client_identity_ref?: string;
  rotation_state?: string;
  expires_at?: string;
  trust_bundle_fresh?: boolean;
  token_store_configured?: boolean;
  missing_required_material: string[];
  recovery: string;
}
export interface LaunchContext { cwd?: string; loadout?: string; runtime_kind?: string; host?: string; selected_tier?: string; name?: string; image_ref?: string; source?: string }
export interface SessionBackend { mode: 'direct' | 'managed'; backend: string; replay?: boolean; keyframe?: boolean; drive?: boolean; observe?: boolean; available?: boolean; reason?: string }
export interface StoragePosture { persistent: boolean; delete_on_destroy: boolean; scope?: string; reason?: string }
export interface LifecyclePosture { destroy?: unknown; reconnect?: unknown; start?: unknown; stop?: unknown }
export type SandboxRuntimeKind = 'host' | 'container' | 'vm' | (string & {});
export type SandboxRuntimeProvider = 'host' | 'docker' | 'libvirt' | 'cloud-hypervisor' | (string & {});
export type SandboxRuntimeCapabilityId =
  | 'instance.checkpoint'
  | 'instance.snapshot'
  | 'instance.restore'
  | 'instance.fork'
  | 'warm_pool.manage'
  | 'device.vfio'
  | (string & {});
export interface RuntimeCapability {
  id: SandboxRuntimeCapabilityId;
  label?: string;
  description?: string;
}
export interface RuntimeCapabilityConstraint {
  capability: SandboxRuntimeCapabilityId;
  excludes?: SandboxRuntimeCapabilityId[];
  reason?: string;
}
export interface RuntimeGpuPosture {
  available?: boolean;
  assigned?: boolean;
  devices?: string[];
  reason?: string;
  authorization?: 'allowed' | 'denied' | 'unknown' | (string & {});
}
export interface RuntimeKindDescriptor {
  kind: SandboxRuntimeKind;
  label?: string;
  default_provider?: SandboxRuntimeProvider;
  providers: SandboxRuntimeProvider[];
}
export interface RuntimeProviderDescriptor {
  provider: SandboxRuntimeProvider;
  kind: SandboxRuntimeKind;
  label?: string;
  default?: boolean;
  platforms?: string[];
  architectures?: string[];
  engine?: string;
  capabilities: RuntimeCapability[];
  capability_constraints?: RuntimeCapabilityConstraint[];
  posture?: {
    host_platform?: string;
    host_architecture?: string;
    engine?: string;
    available?: boolean;
    reason?: string;
  };
}
export interface RuntimeProvidersResponse {
  default_provider?: SandboxRuntimeProvider;
  kinds: RuntimeKindDescriptor[];
  providers: RuntimeProviderDescriptor[];
}
export type RuntimeLaunchMode = 'cold' | 'restore' | 'fork' | 'warm_pool';
export interface RuntimeLaunchStrategy {
  mode: RuntimeLaunchMode;
  prefer_fast_start?: boolean;
  asset_ref?: string;
  restore_mode?: 'ondemand' | 'copy';
}
export interface RuntimeOptions {
  kind: SandboxRuntimeKind;
  provider?: SandboxRuntimeProvider;
  required_capabilities?: SandboxRuntimeCapabilityId[];
  excluded_capabilities?: SandboxRuntimeCapabilityId[];
  launch_strategy?: RuntimeLaunchStrategy;
  constraints?: {
    allow_vfio_fast_start?: boolean;
    fallback_mode?: 'fail' | 'cold';
  };
}
export interface LoadoutFastStartAsset {
  id: string;
  provider: SandboxRuntimeProvider;
  kind: 'snapshot' | 'checkpoint' | 'fork_base' | 'warm_pool' | (string & {});
  state: 'ready' | 'building' | 'degraded' | 'unavailable' | (string & {});
  capabilities: SandboxRuntimeCapabilityId[];
  reason?: string;
}
export interface ResolvedLoadoutCompatibility {
  runtime_kind: SandboxRuntimeKind;
  provider: SandboxRuntimeProvider;
  eligible: boolean;
  required_capabilities?: SandboxRuntimeCapabilityId[];
  excluded_capabilities?: SandboxRuntimeCapabilityId[];
  constraints?: RuntimeCapabilityConstraint[];
  launch_strategy?: RuntimeLaunchStrategy;
  fast_start_assets?: LoadoutFastStartAsset[];
  reason?: string;
}
export interface Instance {
  id: string;
  runtime: string;
  provider?: SandboxRuntimeProvider;
  capabilities?: RuntimeCapability[];
  capability_constraints?: RuntimeCapabilityConstraint[];
  gpu?: RuntimeGpuPosture;
  loadout: string;
  state: string;
  tenant: string;
  card_url: string;
  runtime_posture: RuntimePosture;
  host_daemon: HostDaemonStatus;
  transport: TransportPosture;
  managed_docker_posture?: ManagedDockerPosture;
  launch_context: LaunchContext;
  storage?: StoragePosture;
  lifecycle?: LifecyclePosture;
  agent_ready?: boolean;
  registered_agent_id?: string;
  session_backends: SessionBackend[];
}
export interface RunningTask { instance_id: string; task_id: string; state: string; tenant: string; runtime_posture?: RuntimePosture; transport?: TransportPosture }
// Session model mirrors the agentic-sandbox v2 SessionEntry (management/src/http/sessions.rs,
// released in v2026.7.2). Cockpit consumes the v2 objects directly — no flat-field
// translation. `id` is the Cockpit primary key, set from the v2 `session_id`; `attach_url`
// is the data-plane URL the Bridge resolves. membership/liveness are the v2 sub-objects.
export interface SessionMembership { controllers: string[]; observers: string[]; attachment_count: number }
export interface SessionLiveness { agent_connected: boolean; has_screen: boolean; replay_newest_seq?: number | null; max_client_lag: number }
export interface SessionInfo {
  id: string;
  session_id?: string;
  instance_id: string;
  agent_id?: string;
  session_name?: string;
  session_type?: string;
  session_backend?: string;
  session_class?: string;
  attach_url: string;
  pty_ws_url?: string;
  has_screen?: boolean;
  role_policy?: string;
  default_role?: string;
  membership?: SessionMembership;
  liveness?: SessionLiveness;
}
export interface Approval { id: string; instance_id: string; prompt: string; risk: string; status: string }
export interface ResponseNeeded { id: string; instance_id: string; prompt: string; source: string; status: string; attach_url?: string | null }
export interface MissionAuditEvent { event?: string; ts?: string; missionId?: string; mission_id?: string; objective?: string; [key: string]: unknown }
export interface GraphRunProjection {
  schema_version: 'graph.flow.aiwg.io/v1' | string;
  graph_id: string;
  graph_version?: string;
  run_id: string;
  replay_of_run_id?: string;
  checkpoint_id?: string;
}
export interface GraphNodeProjection {
  node_id: string;
  node_run_id?: string;
  state: string;
  runtime_binding: string;
  route_reason?: string;
  /** Pre-redacted summary only; raw route evidence is not rendered. */
  evidence_summary?: string;
  hitl_status?: string;
  cost_usd?: number;
  tokens?: number;
  duration_ms?: number;
  retry_count?: number;
  budget_remaining?: { tokens?: number; cost_usd?: number; duration_ms?: number };
  checkpoint_id?: string;
  replay_of_node_run_id?: string;
  artifacts?: Array<{ kind: string; uri: string; sha256: string }>;
}
export interface MissionProjection {
  id: string;
  session_id: string;
  source: string;
  title: string;
  completion?: string;
  status: string;
  loop?: number;
  max_iterations?: number;
  priority?: string;
  mode?: string;
  target_agent?: string;
  ralph_loop_id?: string;
  ralph_pid?: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
  instance_id?: string;
  task_id?: string;
  tenant?: string;
  risk?: string;
  terminal?: boolean;
  parent_mission_id?: string;
  workload_kind?: 'persistent-agent' | 'daemon' | 'scheduled-collector' | 'one-shot-command' | (string & {});
  desired_state?: string;
  target_id?: string;
  executor_id?: string;
  runtime_id?: string;
  runtime_session_id?: string;
  command_id?: string;
  dispatch_id?: string;
  revision?: number;
  last_seen?: string;
  health?: string;
  backpressure?: { reason: string; retryable: boolean; retry_after?: string };
  artifacts?: Array<{ kind: string; uri: string; sha256: string }>;
  exit_classification?: string;
  schedule?: string;
  graph?: GraphRunProjection;
  graph_nodes?: GraphNodeProjection[];
}
export interface MissionSession {
  id: string;
  name: string;
  state: string;
  source: string;
  created_at?: string;
  updated_at?: string;
  max_missions?: number;
  audit_count: number;
  audit_tail: MissionAuditEvent[];
  missions: MissionProjection[];
  parent_mission_id?: string;
  inventory_revision?: number;
}
export interface MissionsResponse {
  source: string;
  fetched_at: string;
  count: number;
  sessions: MissionSession[];
  missions: MissionProjection[];
}
export interface UnifiedEvent {
  id: string;
  type: string;
  source: string;
  subject: string;
  state?: string;
  severity?: string;
  ts: string;
  ref?: Record<string, string | undefined>;
}
export interface EventsSnapshot {
  source: string;
  fetched_at: string;
  count: number;
  events: UnifiedEvent[];
}
export interface InstanceCost { instance_id: string; tenant: string; input_tokens: number; output_tokens: number; usd: number }
export interface Cost { total: { input_tokens: number; output_tokens: number; usd: number }; per_instance: InstanceCost[] }
export interface Loadout {
  id: string;
  label: string;
  description?: string;
  runtimes?: string[];
  runtime_options?: RuntimeOptions;
  compatibility?: ResolvedLoadoutCompatibility[];
}
export interface ExecutorCapabilities {
  status: string;
  source?: string | null;
  host_runtime_enabled: boolean;
  runtime_providers?: RuntimeProvidersResponse;
  raw_status?: string;
  error?: string;
}
export interface McpPrincipalDiscovery {
  client_id: string;
  scopes: string[];
}
export interface McpEndpointDiscovery {
  path: string;
  methods: string[];
  transport: string;
  stateless: boolean;
  get_behavior: string;
  mcp_session_id: boolean;
}
export interface McpDiscovery {
  source?: string;
  discovery_path?: string;
  fetched_at?: string;
  enabled: boolean;
  status: 'enabled' | 'disabled' | 'degraded' | string;
  reason_code?: string | null;
  error?: string;
  endpoint: McpEndpointDiscovery;
  protocol: { latest?: string; supported?: string[] };
  auth: {
    scheme: string;
    required: boolean;
    principal_config: string;
    principals: McpPrincipalDiscovery[];
    scopes: string[];
  };
  capabilities: Record<string, unknown>;
  tools: Array<{ name: string; title?: string; description?: string } & Record<string, unknown>>;
  resources: Array<{ uri: string; name?: string; mimeType?: string; description?: string }>;
  resource_templates: Array<{ uriTemplate: string; name?: string; mimeType?: string; description?: string }>;
  errors: Array<{ http_status: number; jsonrpc_code?: number; code: string; message: string }>;
  notes: string[];
}
export interface CapabilityResult { path: string; type: string; title?: string; capability?: string; score?: number; name: string; triggers?: string[] }
export interface ContribAction { id: string; title: string; icon?: string; group?: string; source: string; trust_tier?: 'first-party' | 'sandboxed-third-party'; inject: { command: string; target?: string; needs_args?: boolean; args_hint?: string } }
export interface ContribScreen { id: string; title: string; source: string; contribution: string; trust_tier?: 'first-party' | 'sandboxed-third-party' }
export interface ContribWorkflowStep { action: string; label?: string }
export interface ContribWorkflow { id: string; title: string; description?: string; source: string; trust_tier?: 'first-party' | 'sandboxed-third-party'; steps: ContribWorkflowStep[] }
export interface ContributionsResponse { actions: ContribAction[]; screens: ContribScreen[]; workflows: ContribWorkflow[] }
export interface IndexGraphStatus { name: string; origin: string; shared: boolean; defaultBuild: boolean; location: string; built: boolean; builtAt: string | null; ageHours: number | null; entries: number | null; missing: boolean }
export interface IndexStatusResponse { graphs: IndexGraphStatus[]; orphanIndexDirs: string[]; warnings: unknown[]; summary: { total: number; built: number; missing: number; orphans: number; warnings: number } }
export interface IndexQueryResult { path: string; title?: string; type?: string; phase?: string; summary?: string; score?: number }
export interface IndexQueryResponse { results?: IndexQueryResult[]; total?: number; query?: unknown; graph?: string | null; mode?: string }
export type Role = 'controller' | 'observer' | null;
export interface LibraryAsset { name: string; type: string; kind: 'dir' | 'file'; origin: string; source_path?: string }
