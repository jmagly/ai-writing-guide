import type { JsonValue } from '../a2a/jcs.js';

/** A2A/telemetry metadata key reserved for the optional Flow graph profile. */
export const AIWG_GRAPH_METADATA_KEY = 'aiwg.flow.graph';

export type GraphNodeState =
  | 'pending'
  | 'runnable'
  | 'running'
  | 'retrying'
  | 'blocked-hitl'
  | 'skipped'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'unknown';

/** Stable identity and execution context propagated through every graph adapter. */
export interface GraphExecutionMetadata {
  schemaVersion: 'graph.flow.aiwg.io/v1';
  graphId: string;
  graphVersion: string;
  runId: string;
  nodeId: string;
  nodeRunId: string;
  edgeId?: string;
  routeName?: string;
  checkpointId?: string;
  replayOfRunId?: string;
  runtimeBinding?: string;
  nodeState?: GraphNodeState;
  routeReason?: string;
  /** Declared/redacted route evidence only; never private reasoning. */
  routeEvidence?: JsonValue;
}
export interface GraphRunIdentity {
  schemaVersion: 'graph.flow.aiwg.io/v1';
  graphId: string;
  graphVersion: string;
  runId: string;
  replayOfRunId?: string;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isGraphExecutionMetadata(value: unknown): value is GraphExecutionMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<GraphExecutionMetadata>;
  return item.schemaVersion === 'graph.flow.aiwg.io/v1'
    && nonEmpty(item.graphId)
    && nonEmpty(item.graphVersion)
    && nonEmpty(item.runId)
    && nonEmpty(item.nodeId)
    && nonEmpty(item.nodeRunId);
}

export function graphMetadataRecord(value: GraphExecutionMetadata): Record<string, JsonValue> {
  return { [AIWG_GRAPH_METADATA_KEY]: value as unknown as JsonValue };
}

export function extractGraphMetadata(metadata: Record<string, JsonValue> | undefined): GraphExecutionMetadata | undefined {
  const value = metadata?.[AIWG_GRAPH_METADATA_KEY];
  return isGraphExecutionMetadata(value) ? value : undefined;
}
