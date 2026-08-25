import {
  MISSION_API_VERSION,
  type CanonicalMission,
  type MissionDecodeResult,
  type MissionEncodeResult,
  type MissionLoss,
  type MissionSource,
  type MissionState,
  type MissionTarget,
} from './types.js';

type RecordValue = Record<string, unknown>;
const TERMINAL = new Set<MissionState>(['completed', 'failed', 'incomplete', 'cancelled']);

function object(value: unknown, label = 'Mission input'): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as RecordValue;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined;
}

function requiredId(record: RecordValue): string {
  const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata as RecordValue : {};
  const id = string(record.missionId) ?? string(record.mission_id) ?? string(record.id)
    ?? string(record.taskId) ?? string(record.task_id) ?? string(record.responseId) ?? string(metadata.id);
  if (!id) throw new Error('Mission source is missing a stable identifier.');
  return id;
}

export function normalizeMissionState(nativeState: unknown): MissionState {
  const state = String(nativeState ?? 'unknown').toLowerCase().replace(/_/g, '-');
  if (['done', 'completed', 'succeeded', 'success'].includes(state)) return 'completed';
  if (['aborted', 'cancelled', 'canceled'].includes(state)) return 'cancelled';
  if (['failed', 'error', 'rejected', 'timed-out'].includes(state)) return 'failed';
  if (['incomplete', 'budget-exhausted', 'max-iterations', 'max-tokens'].includes(state)) return 'incomplete';
  if (['running', 'in-progress', 'working', 'started', 'assigned', 'admitted', 'starting'].includes(state)) return 'running';
  if (['pending', 'submitted', 'queued', 'runnable', 'scheduled'].includes(state)) return 'pending';
  if (['blocked', 'blocked-hitl', 'input-required', 'auth-required', 'paused', 'suspended'].includes(state)) return 'blocked';
  if (['operator-review', 'operator-review-required', 'manual-review'].includes(state)) return 'operator-review';
  if (['unknown', 'disconnected', 'detached', 'unreachable'].includes(state)) return 'unknown';
  return 'unknown';
}

function knownKeysFor(source: MissionSource): Set<string> {
  const common = ['id', 'missionId', 'mission_id', 'taskId', 'task_id', 'responseId', 'title', 'goal', 'objective', 'prompt', 'completion', 'completionCriterion', 'completion_criterion', 'status', 'state', 'nativeState', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'metadata', 'spec', 'provenance', 'extensions', 'artifacts', 'output', 'partialOutput', 'error', 'checkpoint', 'cycles', 'activityLog', 'totalCost', 'runtimesUsed', 'apiVersion', 'api_version', 'schemaVersion', 'schema_version', 'kind', 'session_id', 'previous_response_id'];
  if (source === 'uhp-2026-08-11') common.push('object', 'model', 'incomplete_details', 'store', 'usage');
  return new Set(common);
}

function extensions(record: RecordValue, source: MissionSource): RecordValue {
  const explicit = record.extensions && typeof record.extensions === 'object' ? structuredClone(record.extensions as RecordValue) : {};
  if (record.metadata && typeof record.metadata === 'object') explicit.metadata = structuredClone(record.metadata);
  if (record.status && typeof record.status === 'object') explicit.nativeStatus = structuredClone(record.status);
  for (const [key, value] of Object.entries(record)) if (!knownKeysFor(source).has(key)) explicit[key] = structuredClone(value);
  return explicit;
}

function artifacts(record: RecordValue): CanonicalMission['status']['artifacts'] {
  const values = Array.isArray(record.artifacts) ? record.artifacts : [];
  return values.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const artifact = item as RecordValue;
    const id = string(artifact.id) ?? string(artifact.fileId) ?? string(artifact.file_id) ?? string(artifact.uri) ?? `artifact-${index}`;
    return [{
      id,
      kind: string(artifact.kind) ?? 'other',
      ...(string(artifact.uri) ? { uri: string(artifact.uri) } : {}),
      ...(string(artifact.sha256) ? { sha256: string(artifact.sha256) } : {}),
      ...(string(artifact.mediaType) ?? string(artifact.media_type) ? { mediaType: string(artifact.mediaType) ?? string(artifact.media_type) } : {}),
      extensions: structuredClone(artifact),
    }];
  });
}

function uhpOutputArtifacts(record: RecordValue): CanonicalMission['status']['artifacts'] {
  const found = new Map<string, CanonicalMission['status']['artifacts'][number]>();
  function visit(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const item = value as RecordValue;
    const id = string(item.file_id);
    if (id) found.set(id, { id, kind: 'uhp-file', ...(string(item.media_type) ? { mediaType: string(item.media_type) } : {}), extensions: { 'uhp.file': structuredClone(item) } });
    Object.values(item).forEach(visit);
  }
  visit(record.output);
  return [...found.values()];
}

function nativeStateFor(source: MissionSource, record: RecordValue, statusRecord: RecordValue): string {
  const explicit = string(statusRecord.state) ?? string(record.nativeState) ?? string(record.status)
    ?? string(record.state) ?? string(record.observed_state) ?? string(record.observedState) ?? string(record.nodeState);
  if (explicit) return explicit;
  if (source === 'mission-ledger' && record.checkpoint && typeof record.checkpoint === 'object') {
    const checkpoint = record.checkpoint as RecordValue;
    if (Array.isArray(checkpoint.pending) && checkpoint.pending.length) return 'running';
    if (Array.isArray(checkpoint.failed) && checkpoint.failed.length) return 'failed';
    if (Array.isArray(checkpoint.completed) && checkpoint.completed.length) return 'completed';
  }
  return 'unknown';
}

function sourceVersion(source: MissionSource, record: RecordValue): string {
  if (source === 'canonical') return string(record.apiVersion) ?? 'unknown';
  if (source === 'uhp-2026-08-11') return '2026-08-11';
  if (source === 'executor-v1') return 'executor.aiwg.io/v1';
  if (source === 'fleet-workload-v1') return 'fleet-workload/v1';
  if (source === 'graph-flow-v1') return 'graph.flow.aiwg.io/v1';
  if (source === 'activity-v1') return 'activity.aiwg.io/v1';
  return string(record.apiVersion) ?? string(record.api_version) ?? string(record.schemaVersion) ?? string(record.schema_version) ?? 'unversioned';
}

function assertSupported(version: string): void {
  const supported = new Set(['unversioned', MISSION_API_VERSION, '2026-08-11', 'executor.aiwg.io/v1', 'fleet-workload/v1', 'graph.flow.aiwg.io/v1', 'activity.aiwg.io/v1']);
  if (supported.has(version)) return;
  const major = version.match(/(?:^|\/)v(\d+)(?:$|[.-])/)?.[1];
  if (major && major !== '1') throw new Error(`Unsupported Mission source major version '${version}'; supported major is v1.`);
  throw new Error(`Unsupported Mission source version '${version}'.`);
}

export function validateCanonicalMission(value: unknown): CanonicalMission {
  const record = object(value, 'Canonical Mission');
  if (record.apiVersion !== MISSION_API_VERSION) throw new Error(`Unsupported canonical Mission version '${String(record.apiVersion)}'.`);
  if (record.kind !== 'Mission') throw new Error("Canonical Mission kind must be 'Mission'.");
  const metadata = object(record.metadata, 'Mission metadata');
  const spec = object(record.spec, 'Mission spec');
  const status = object(record.status, 'Mission status');
  const provenance = object(record.provenance, 'Mission provenance');
  if (!string(metadata.id) || !string(spec.objective) || !string(provenance.sourceContract) || !string(provenance.sourceVersion)) throw new Error('Canonical Mission is missing required identity, objective, or provenance.');
  const state = normalizeMissionState(status.state);
  if (status.state !== state) throw new Error(`Canonical Mission state '${String(status.state)}' is not normalized.`);
  if (status.terminal !== TERMINAL.has(state)) throw new Error(`Canonical Mission terminal flag contradicts state '${state}'.`);
  if (!Array.isArray(status.artifacts)) throw new Error('Canonical Mission artifacts must be an array.');
  return structuredClone(value as CanonicalMission);
}

export function decodeMission(input: unknown, source: MissionSource): MissionDecodeResult {
  const record = object(input);
  if (source === 'canonical') {
    const value = validateCanonicalMission(record);
    return { value, sourceVersion: MISSION_API_VERSION, warnings: [], preservedExtensions: structuredClone(value.extensions ?? {}), lossReport: [] };
  }
  const version = sourceVersion(source, record);
  assertSupported(version);
  const statusRecord = record.status && typeof record.status === 'object' ? record.status as RecordValue : {};
  const nativeState = nativeStateFor(source, record, statusRecord);
  const state = normalizeMissionState(nativeState);
  const objective = string(record.goal) ?? string(record.objective) ?? string(record.title) ?? string(record.prompt) ?? '(legacy mission objective unavailable)';
  const completionCriterion = string(record.completionCriterion) ?? string(record.completion_criterion) ?? string(record.completion);
  const preserved = extensions(record, source);
  const warnings: string[] = [];
  const lossReport: MissionLoss[] = [];
  if (objective.startsWith('(legacy')) warnings.push('Source did not contain a mission objective; placeholder retained.');
  if (state === 'unknown' && nativeState !== 'unknown') warnings.push(`Unknown native state '${nativeState}' preserved beside normalized unknown state.`);
  const sourceArtifacts = artifacts(record);
  if (source === 'uhp-2026-08-11') {
    const ids = new Set(sourceArtifacts.map(artifact => artifact.id));
    for (const artifact of uhpOutputArtifacts(record)) if (!ids.has(artifact.id)) sourceArtifacts.push(artifact);
  }
  const budgets = record.budgets && typeof record.budgets === 'object' ? record.budgets as CanonicalMission['spec']['budgets'] : undefined;
  const lineage = Array.isArray(record.lineage) ? record.lineage.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as RecordValue;
    return string(entry.relation) && string(entry.id) ? [{ relation: string(entry.relation)!, id: string(entry.id)! }] : [];
  }) : undefined;
  const value: CanonicalMission = {
    apiVersion: MISSION_API_VERSION,
    kind: 'Mission',
    metadata: {
      id: requiredId(record),
      ...(string(record.createdAt) ?? string(record.created_at) ? { createdAt: string(record.createdAt) ?? string(record.created_at) } : {}),
      ...(string(record.updatedAt) ?? string(record.updated_at) ? { updatedAt: string(record.updatedAt) ?? string(record.updated_at) } : {}),
      ...(string(record.previous_response_id) ? { previousId: string(record.previous_response_id) } : {}),
      ...(lineage?.length ? { lineage } : {}),
    },
    spec: { objective, ...(completionCriterion ? { completionCriterion } : {}), ...(budgets ? { budgets: structuredClone(budgets) } : {}) },
    status: {
      state,
      terminal: TERMINAL.has(state),
      nativeState,
      artifacts: sourceArtifacts,
      ...(record.output !== undefined || record.partialOutput !== undefined || record.partial_output !== undefined ? { partialOutput: structuredClone(record.partialOutput ?? record.partial_output ?? record.output) } : {}),
    },
    provenance: { sourceContract: source, sourceVersion: version, ...(source === 'a2a' || source.startsWith('uhp') ? { transport: source.split('-')[0] } : {}), sourceId: requiredId(record) },
    ...(Object.keys(preserved).length ? { extensions: { [`aiwg.source.${source}`]: preserved } } : {}),
  };
  return { value, sourceVersion: version, warnings, preservedExtensions: preserved, lossReport };
}

function projectionLosses(value: CanonicalMission, target: MissionTarget): MissionLoss[] {
  const losses: MissionLoss[] = [];
  if (value.status.verification?.length) losses.push({ path: '/status/verification', reason: `${target} has no native verification ledger`, severity: 'warning' });
  if (value.metadata.lineage?.length && !['mission-ledger', 'fleet-workload-v1', 'canonical'].includes(target)) losses.push({ path: '/metadata/lineage', reason: `${target} cannot represent full lineage`, severity: 'required' });
  if (value.spec.budgets && !['fleet-workload-v1', 'canonical'].includes(target)) losses.push({ path: '/spec/budgets', reason: `${target} cannot represent every canonical budget`, severity: 'warning' });
  return losses;
}

export function encodeMission(value: CanonicalMission, target: MissionTarget, options: { allowLoss?: boolean } = {}): MissionEncodeResult {
  const mission = validateCanonicalMission(value);
  if (target === 'canonical') return { value: mission, targetVersion: MISSION_API_VERSION, warnings: [], lossReport: [] };
  const lossReport = projectionLosses(mission, target);
  const required = lossReport.filter(loss => loss.severity === 'required');
  if (required.length && !options.allowLoss) throw new Error(`Projection to ${target} would silently lose required semantics: ${required.map(loss => loss.path).join(', ')}.`);
  const base = {
    missionId: mission.metadata.id,
    goal: mission.spec.objective,
    completionCriterion: mission.spec.completionCriterion,
    status: mission.status.nativeState ?? mission.status.state,
    artifacts: structuredClone(mission.status.artifacts),
    partialOutput: structuredClone(mission.status.partialOutput),
    lineage: structuredClone(mission.metadata.lineage ?? []),
    extensions: {
      'aiwg.mission.canonical': { apiVersion: mission.apiVersion, state: mission.status.state, lossReport },
      ...(mission.extensions ?? {}),
    },
  };
  let projected: unknown = base;
  if (target === 'mission-plan') projected = { missionId: base.missionId, goal: base.goal, completionCriterion: base.completionCriterion ?? '', cycles: [], extensions: base.extensions };
  else if (target === 'mission-ledger') projected = { ...base, activityLog: [], cycles: [], totalCost: 0, checkpoint: { completed: [], pending: [], failed: [] }, runtimesUsed: [] };
  else if (target === 'uhp-2026-08-11') projected = { id: mission.provenance.sourceId ?? mission.metadata.id, object: 'response', created_at: 0, status: base.status, model: '', output: mission.status.partialOutput ?? [], metadata: base.extensions };
  else if (target === 'a2a') projected = { id: mission.provenance.sourceId ?? mission.metadata.id, status: { state: base.status }, artifacts: base.artifacts, partialOutput: base.partialOutput, metadata: base.extensions };
  else if (target === 'graph-flow-v1') projected = { schemaVersion: 'graph.flow.aiwg.io/v1', runId: mission.metadata.id, nodeState: mission.status.state, metadata: base.extensions };
  else if (target === 'cockpit') projected = { id: mission.metadata.id, session_id: mission.metadata.id, source: mission.provenance.transport ?? mission.provenance.sourceContract, title: mission.spec.objective, completion: mission.spec.completionCriterion, status: mission.status.state, artifacts: base.artifacts, partialOutput: base.partialOutput, extensions: base.extensions };
  else if (target === 'activity-v1') projected = { event: 'mission.projected', missionId: mission.metadata.id, objective: mission.spec.objective, state: mission.status.state, metadata: base.extensions };
  else if (target === 'executor-v1') projected = { mission_id: mission.metadata.id, objective: mission.spec.objective, completion_criterion: mission.spec.completionCriterion, state: base.status, artifacts: base.artifacts, partial_output: base.partialOutput, metadata: base.extensions };
  else if (target === 'fleet-workload-v1') projected = { mission_id: mission.metadata.id, objective: mission.spec.objective, completion_criterion: mission.spec.completionCriterion, observed_state: base.status, budgets: mission.spec.budgets, artifacts: base.artifacts, partial_output: base.partialOutput, lineage: base.lineage, metadata: base.extensions };
  else if (target === 'mission-control-session') projected = { id: mission.metadata.id, objective: mission.spec.objective, status: mission.status.state, completion: mission.spec.completionCriterion, artifacts: base.artifacts, partialOutput: base.partialOutput, extensions: base.extensions };
  return { value: projected, targetVersion: target, warnings: lossReport.map(loss => `${loss.path}: ${loss.reason}`), lossReport };
}
