export interface Instance { id: string; runtime: string; loadout: string; state: string; tenant: string; card_url: string }
export interface RunningTask { instance_id: string; task_id: string; state: string; tenant: string }
export interface SessionInfo { id: string; instance_id: string; seq: number; members: number; has_controller: boolean; attach_url: string }
export interface Approval { id: string; instance_id: string; prompt: string; risk: string; status: string }
export interface Cost { total: { input_tokens: number; output_tokens: number; usd: number }; per_instance: unknown[] }
export interface CapabilityResult { path: string; type: string; title?: string; capability?: string; score?: number; name: string; triggers?: string[] }
export interface ContribAction { id: string; title: string; icon?: string; group?: string; source: string; inject: { command: string; target?: string; needs_args?: boolean; args_hint?: string } }
export type Role = 'controller' | 'observer' | null;
export interface LibraryAsset { name: string; type: string; kind: 'dir' | 'file'; origin: string; source_path?: string }
