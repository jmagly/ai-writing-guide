import type { UhpEvent, UhpMissionEvidence, UhpResponse, UhpResponseRequest } from './types.js';
import { UHP_VERSION } from './types.js';
import { decodeMission, type MissionDecodeResult } from '../mission-protocol/index.js';

function collectArtifacts(response: UhpResponse): UhpMissionEvidence['artifacts'] {
  const artifacts = new Map<string, UhpMissionEvidence['artifacts'][number]>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (typeof object.file_id === 'string') artifacts.set(object.file_id, {
      fileId: object.file_id,
      ...(typeof object.container_id === 'string' ? { containerId: object.container_id } : {}),
      ...(typeof object.filename === 'string' ? { filename: object.filename } : {}),
      ...(typeof object.media_type === 'string' ? { mediaType: object.media_type } : {}),
      source: structuredClone(object),
    });
    for (const child of Object.values(object)) visit(child);
  };
  visit(response.output);
  return [...artifacts.values()];
}

function collectInputFiles(request: UhpResponseRequest): UhpMissionEvidence['inputFiles'] {
  const files: UhpMissionEvidence['inputFiles'] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (object.type === 'input_file') files.push({
      ...(typeof object.file_id === 'string' ? { fileId: object.file_id } : {}),
      ...(typeof object.filename === 'string' ? { filename: object.filename } : {}),
      ...(typeof object.file_data === 'string' && object.file_data.startsWith('data:') ? { mediaType: object.file_data.slice(5).split(/[;,]/, 1)[0] } : {}),
      source: structuredClone(object),
    });
    for (const child of Object.values(object)) visit(child);
  };
  visit(request.input);
  return files;
}

export function projectUhpResponseToMission(
  profile: string,
  response: UhpResponse,
  request: UhpResponseRequest = { input: '' },
  event?: UhpEvent,
): UhpMissionEvidence {
  const known = ['in_progress', 'completed', 'failed', 'incomplete', 'cancelled'].includes(response.status);
  const state = response.status === 'in_progress' ? 'running' : known ? response.status : 'unknown';
  const metadata = response.metadata ?? {};
  const artifacts = collectArtifacts(response);
  const knownKeys = new Set(['id', 'object', 'created_at', 'status', 'model', 'previous_response_id', 'output', 'error', 'incomplete_details', 'metadata', 'store', 'usage']);
  return {
    transport: 'uhp',
    protocolVersion: UHP_VERSION,
    endpointProfile: profile,
    state,
    nativeState: response.status,
    observationState: known ? 'authoritative' : 'unknown',
    responseId: response.id,
    previousResponseId: response.previous_response_id ?? request.previous_response_id,
    sessionId: metadata.session_id,
    harness: {
      requested: request.metadata?.harness_id,
      actual: metadata.harness_id,
      substitutionReason: typeof metadata.harness_substitution_reason === 'string' ? metadata.harness_substitution_reason : undefined,
    },
    model: {
      requested: request.model,
      actual: response.model,
      substitutionReason: metadata.model_substitution_reason ?? (typeof metadata.model_fallback_reason === 'string' ? metadata.model_fallback_reason : undefined),
    },
    containerId: metadata.container_id,
    eventSequence: event?.sequence_number,
    terminalEvent: event && /^response\.(?:completed|failed|incomplete|cancelled)$/.test(event.type) ? event.type : undefined,
    artifactIds: artifacts.map(artifact => artifact.fileId),
    inputFiles: collectInputFiles(request),
    artifacts,
    partialOutput: response.status !== 'completed' && Boolean(response.output?.length),
    extensions: Object.fromEntries(Object.entries(response).filter(([key]) => !knownKeys.has(key))),
    ...(known ? {} : { diagnostic: `Unknown UHP response state '${String(response.status)}'` }),
  };
}

export function unknownUhpMissionEvidence(profile: string, diagnostic: string, responseId?: string, lastSequence?: number): UhpMissionEvidence {
  return {
    transport: 'uhp', protocolVersion: UHP_VERSION, endpointProfile: profile,
    state: 'unknown', nativeState: 'unknown', observationState: 'unknown', responseId,
    harness: {}, model: {}, eventSequence: lastSequence, artifactIds: [], inputFiles: [], artifacts: [], partialOutput: false,
    extensions: {}, diagnostic,
  };
}

/** Canonical Mission adapter consumed by UHP; the legacy evidence projection remains a compatibility view. */
export function projectUhpResponseToCanonicalMission(
  profile: string,
  response: UhpResponse,
  request: UhpResponseRequest = { input: '' },
  event?: UhpEvent,
): MissionDecodeResult {
  const evidence = projectUhpResponseToMission(profile, response, request, event);
  return decodeMission({
    ...evidence,
    objective: typeof request.input === 'string' && request.input.length ? request.input : 'UHP task',
    status: evidence.nativeState,
    artifacts: evidence.artifacts.map(artifact => ({
      id: artifact.fileId,
      kind: 'uhp-file',
      ...(artifact.mediaType ? { mediaType: artifact.mediaType } : {}),
      ...((artifact.source as Record<string, unknown>).sha256 ? { sha256: (artifact.source as Record<string, unknown>).sha256 } : {}),
      extensions: { 'uhp.file': artifact.source },
    })),
  }, 'uhp-2026-08-11');
}
