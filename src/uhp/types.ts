export const UHP_VERSION = '2026-08-11' as const;

export type UhpConformanceClass = 'core' | 'extended' | 'full';
export type UhpResponseStatus = 'in_progress' | 'completed' | 'failed' | 'incomplete' | 'cancelled';

export interface UhpDiscovery {
  object: 'uhp.discovery';
  protocol: 'uhp';
  versions: string[];
  default_version: string;
  conformance_class: UhpConformanceClass;
  capabilities: Record<string, boolean | undefined>;
  implementation?: Record<string, unknown>;
  [extension: string]: unknown;
}

export interface UhpHarness {
  id: string;
  object: 'harness';
  name: string;
  base: string;
  baseLabel?: string;
  defaultModel?: string;
  createdAt: number;
  [extension: string]: unknown;
}

export interface UhpModel {
  id: string;
  label?: string;
  backend?: string;
  available: boolean;
  default?: boolean;
  [extension: string]: unknown;
}

export interface UhpResponseMetadata {
  harness_id?: string;
  requested_harness_id?: string;
  session_id?: string;
  container_id?: string;
  requested_model?: string;
  model_substitution_reason?: string;
  [extension: string]: unknown;
}

export interface UhpResponse {
  id: string;
  object: 'response';
  created_at: number;
  status: UhpResponseStatus;
  model: string;
  previous_response_id?: string | null;
  output: unknown[];
  error?: UhpErrorBody | null;
  incomplete_details?: Record<string, unknown> | null;
  metadata: UhpResponseMetadata;
  usage?: Record<string, unknown> | null;
  [extension: string]: unknown;
}

export interface UhpErrorBody {
  type: string;
  code: string;
  message: string;
  param: string | null;
  detail: Record<string, unknown> | null;
}

export interface UhpResponseRequest {
  input: string | unknown[];
  model?: string;
  metadata?: Record<string, unknown> & { harness_id?: string };
  stream?: boolean;
  previous_response_id?: string;
  instructions?: string;
  store?: boolean;
  max_output_tokens?: number;
  max_step?: number;
  timeout_seconds?: number;
  tools?: unknown[];
  include?: string[];
  background?: boolean;
  [extension: string]: unknown;
}

export interface UhpEvent {
  type: string;
  sequence_number: number;
  response?: UhpResponse;
  [extension: string]: unknown;
}

export interface UhpFile {
  id: string;
  object?: 'file';
  container_id?: string;
  filename: string;
  bytes?: number;
  created_at?: number;
  [extension: string]: unknown;
}

export interface UhpLimits {
  requestTimeoutMs: number;
  inactivityTimeoutMs: number;
  maxTaskSeconds: number;
  maxUploadBytes: number;
  maxArtifactBytes: number;
  maxArtifactCount: number;
  maxRetries: number;
}

export interface UhpCredentialLocator {
  source: 'env';
  name: string;
}

export interface UhpTrustPolicy {
  allowedHosts?: string[];
  allowPrivateNetwork?: boolean;
  allowInsecureLoopback?: boolean;
  allowRedirects?: boolean;
}

export interface UhpEndpointProfile {
  endpoint: string;
  version: typeof UHP_VERSION;
  credential: UhpCredentialLocator;
  defaultHarness?: string;
  defaultModel?: string;
  trust?: UhpTrustPolicy;
  limits?: Partial<UhpLimits>;
  experimental: true;
}

export interface UhpConfig {
  enabled?: boolean;
  profiles?: Record<string, UhpEndpointProfile>;
}

export type UhpNormalizedState =
  | 'running'
  | 'completed'
  | 'failed'
  | 'incomplete'
  | 'cancelled'
  | 'unknown';

export interface UhpMissionEvidence {
  transport: 'uhp';
  protocolVersion: typeof UHP_VERSION;
  endpointProfile: string;
  state: UhpNormalizedState;
  nativeState: string;
  observationState: 'authoritative' | 'unknown';
  responseId?: string;
  previousResponseId?: string;
  sessionId?: string;
  harness: { requested?: string; actual?: string; substitutionReason?: string };
  model: { requested?: string; actual?: string; substitutionReason?: string };
  containerId?: string;
  eventSequence?: number;
  terminalEvent?: string;
  artifactIds: string[];
  inputFiles: Array<{ fileId?: string; filename?: string; mediaType?: string; source: Record<string, unknown> }>;
  artifacts: Array<{ fileId: string; containerId?: string; filename?: string; mediaType?: string; source: Record<string, unknown> }>;
  partialOutput: boolean;
  extensions: Record<string, unknown>;
  diagnostic?: string;
}
