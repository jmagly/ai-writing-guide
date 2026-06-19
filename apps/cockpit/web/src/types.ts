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
export interface LaunchContext { cwd?: string; loadout?: string; runtime_kind?: string; host?: string; selected_tier?: string }
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
  session_backends: SessionBackend[];
}
export interface RunningTask { instance_id: string; task_id: string; state: string; tenant: string; runtime_posture?: RuntimePosture; transport?: TransportPosture }
export interface SessionInfo { id: string; instance_id: string; seq: number; members: number; has_controller: boolean; attach_url: string; mode?: 'direct' | 'managed'; backend?: string; role_policy?: string; replay?: boolean; keyframe?: boolean; controllers?: number; observers?: number }
export interface Approval { id: string; instance_id: string; prompt: string; risk: string; status: string }
export interface InstanceCost { instance_id: string; tenant: string; input_tokens: number; output_tokens: number; usd: number }
export interface Cost { total: { input_tokens: number; output_tokens: number; usd: number }; per_instance: InstanceCost[] }
export interface Loadout { id: string; label: string; description?: string; runtimes?: string[] }
export interface CapabilityResult { path: string; type: string; title?: string; capability?: string; score?: number; name: string; triggers?: string[] }
export interface ContribAction { id: string; title: string; icon?: string; group?: string; source: string; inject: { command: string; target?: string; needs_args?: boolean; args_hint?: string } }
export type Role = 'controller' | 'observer' | null;
export interface LibraryAsset { name: string; type: string; kind: 'dir' | 'file'; origin: string; source_path?: string }
