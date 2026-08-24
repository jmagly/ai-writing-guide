export const MISSION_API_VERSION = 'mission.aiwg.io/v1' as const;

export type MissionState =
  | 'pending'
  | 'running'
  | 'blocked'
  | 'operator-review'
  | 'completed'
  | 'failed'
  | 'incomplete'
  | 'cancelled'
  | 'unknown';

export interface MissionArtifact {
  id: string;
  kind: string;
  uri?: string;
  sha256?: string;
  mediaType?: string;
  sizeBytes?: number;
  extensions?: Record<string, unknown>;
}

export interface CanonicalMission {
  apiVersion: typeof MISSION_API_VERSION;
  kind: 'Mission';
  metadata: {
    id: string;
    createdAt?: string;
    updatedAt?: string;
    parentId?: string;
    previousId?: string;
    lineage?: Array<{ relation: string; id: string }>;
  };
  spec: {
    objective: string;
    completionCriterion?: string;
    budgets?: { maxAttempts?: number; timeoutSeconds?: number; maxCostUsd?: number; maxTokens?: number };
  };
  status: {
    state: MissionState;
    terminal: boolean;
    nativeState?: string;
    sourceUpdatedAt?: string;
    partialOutput?: unknown;
    error?: { code?: string; message: string; retryable?: boolean };
    completion?: { satisfied: boolean; reason?: string };
    artifacts: MissionArtifact[];
    verification?: Array<{ name: string; status: 'passed' | 'failed' | 'skipped' | 'unknown'; evidence?: string }>;
  };
  provenance: {
    sourceContract: string;
    sourceVersion: string;
    transport?: string;
    sourceId?: string;
  };
  extensions?: Record<string, unknown>;
}

export interface MissionLoss {
  path: string;
  reason: string;
  severity: 'informational' | 'warning' | 'required';
}

export interface MissionDecodeResult {
  value: CanonicalMission;
  sourceVersion: string;
  warnings: string[];
  preservedExtensions: Record<string, unknown>;
  lossReport: MissionLoss[];
}

export interface MissionEncodeResult<T = unknown> {
  value: T;
  targetVersion: string;
  warnings: string[];
  lossReport: MissionLoss[];
}

export type MissionSource =
  | 'canonical'
  | 'mission-plan'
  | 'mission-ledger'
  | 'mission-control-session'
  | 'executor-v1'
  | 'fleet-workload-v1'
  | 'a2a'
  | 'uhp-2026-08-11'
  | 'graph-flow-v1'
  | 'cockpit'
  | 'activity-v1';

export type MissionTarget = Exclude<MissionSource, 'canonical'> | 'canonical';
