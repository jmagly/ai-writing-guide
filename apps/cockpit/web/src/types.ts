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
export interface LaunchContext { cwd?: string; loadout?: string; runtime_kind?: string; host?: string; selected_tier?: string; name?: string; image_ref?: string; source?: string }
export interface SessionBackend { mode: 'direct' | 'managed'; backend: string; replay?: boolean; keyframe?: boolean; drive?: boolean; observe?: boolean; available?: boolean; reason?: string }
export interface Instance {
  id: string;
  runtime: string;
  loadout: string;
  state: string;
  tenant: string;
  card_url: string;
  runtime_posture: RuntimePosture;
  host_daemon: HostDaemonStatus;
  transport: TransportPosture;
  launch_context: LaunchContext;
  agent_ready?: boolean;
  registered_agent_id?: string;
  session_backends: SessionBackend[];
}
export interface RunningTask { instance_id: string; task_id: string; state: string; tenant: string; runtime_posture?: RuntimePosture; transport?: TransportPosture }
export interface SessionInfo { id: string; instance_id: string; seq?: number; members?: number; has_controller?: boolean; attach_url: string; mode?: 'direct' | 'managed'; backend?: string; session_name?: string; sessionName?: string; session_class?: string; session_backend?: string; role_policy?: string; replay?: boolean; keyframe?: boolean; controllers?: number; observers?: number; has_screen?: boolean; hasScreen?: boolean }
export interface Approval { id: string; instance_id: string; prompt: string; risk: string; status: string }
export interface ResponseNeeded { id: string; instance_id: string; prompt: string; source: string; status: string; attach_url?: string | null }
export interface MissionAuditEvent { event?: string; ts?: string; missionId?: string; mission_id?: string; objective?: string; [key: string]: unknown }
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
export interface Loadout { id: string; label: string; description?: string; runtimes?: string[] }
export interface ExecutorCapabilities { status: string; source?: string | null; host_runtime_enabled: boolean; raw_status?: string; error?: string }
export interface CapabilityResult { path: string; type: string; title?: string; capability?: string; score?: number; name: string; triggers?: string[] }
export interface ContribAction { id: string; title: string; icon?: string; group?: string; source: string; inject: { command: string; target?: string; needs_args?: boolean; args_hint?: string } }
export interface ContribScreen { id: string; title: string; source: string; contribution: string }
export interface ContribWorkflowStep { action: string; label?: string }
export interface ContribWorkflow { id: string; title: string; description?: string; source: string; steps: ContribWorkflowStep[] }
export interface ContributionsResponse { actions: ContribAction[]; screens: ContribScreen[]; workflows: ContribWorkflow[] }
export interface IndexGraphStatus { name: string; origin: string; shared: boolean; defaultBuild: boolean; location: string; built: boolean; builtAt: string | null; ageHours: number | null; entries: number | null; missing: boolean }
export interface IndexStatusResponse { graphs: IndexGraphStatus[]; orphanIndexDirs: string[]; warnings: unknown[]; summary: { total: number; built: number; missing: number; orphans: number; warnings: number } }
export interface IndexQueryResult { path: string; title?: string; type?: string; phase?: string; summary?: string; score?: number }
export interface IndexQueryResponse { results?: IndexQueryResult[]; total?: number; query?: unknown; graph?: string | null; mode?: string }
export type Role = 'controller' | 'observer' | null;
export interface LibraryAsset { name: string; type: string; kind: 'dir' | 'file'; origin: string; source_path?: string }
