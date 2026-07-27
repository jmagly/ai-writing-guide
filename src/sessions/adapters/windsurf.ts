import { basename } from 'node:path';
import { z } from 'zod';
import {
  SessionContractError,
  assertSupportedSchemaMajor,
  type AuthorizedScope,
  type ImportCursor,
  type ProviderRecord,
  type SelectedSource,
  type SessionSourceAdapter,
  type SourceDescriptor,
  type SourceProbe,
} from '../contracts.js';
import { readBoundedJsonLines, type ReaderLimits } from '../readers.js';

export const WINDSURF_ADAPTER_VERSION = '1.0.0';
export const WINDSURF_TRANSCRIPT_SCHEMA_VERSION = '1.0.0';

const StepSchema = z.object({
  schema_version: z.string().optional(),
  type: z.string().min(1),
  status: z.string().min(1),
  trajectory_id: z.string().min(1).optional(),
  execution_id: z.string().min(1).optional(),
  event_id: z.string().min(1).optional(),
  timestamp: z.string().optional(),
  model_name: z.string().optional(),
  model: z.union([z.string(), z.record(z.unknown())]).optional(),
  sensitive_content_warning: z.union([z.boolean(), z.string(), z.record(z.unknown())]).optional(),
  user_input: z.record(z.unknown()).optional(),
  planner_response: z.record(z.unknown()).optional(),
  code_action: z.record(z.unknown()).optional(),
  tool_info: z.record(z.unknown()).optional(),
}).passthrough();

type Step = z.infer<typeof StepSchema>;

export class WindsurfSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'windsurf' as const;
  readonly adapterVersion = WINDSURF_ADAPTER_VERSION;
  readonly disposition = 'implemented' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['hook', 'jsonl'] as const;

  constructor(private readonly limits?: Partial<ReaderLimits>) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // Deliberately empty: hook enablement and transcript selection are explicit user actions.
  }

  async inspect(source: SelectedSource): Promise<SourceProbe> {
    const parsed = await this.readSource(source);
    return {
      sourceSchemaVersion: parsed.schemaVersion,
      consistency: 'provisional',
      operationalState: 'available',
    };
  }

  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    const parsed = await this.readSource(source);
    const start = parseCursor(cursor?.value);
    for (const record of parsed.records.slice(start)) yield record;
  }

  private async readSource(source: SelectedSource): Promise<{
    schemaVersion: string;
    records: ProviderRecord[];
  }> {
    if (source.locatorClass === 'windsurf-legacy-protobuf') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'legacy Devin Desktop/Windsurf protobuf stores are unsupported; enable post_cascade_response_with_transcript and select its JSONL output',
      );
    }
    if (source.locatorClass !== 'windsurf-cascade-hook-jsonl') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Devin Desktop (Windsurf compatibility) requires an explicitly selected post_cascade_response_with_transcript JSONL file',
      );
    }
    const input = await readBoundedJsonLines({
      selectedPath: source.locator,
      allowedRoots: source.authorizedScope.allowedRoots,
    }, { consistency: 'provisional', limits: this.limits });
    if (input.records.length === 0) {
      throw new SessionContractError('MALFORMED_SOURCE', 'Windsurf transcript is empty or malformed');
    }
    const steps = input.records.map((record) => {
      const parsed = StepSchema.safeParse(record.value);
      if (!parsed.success) {
        throw new SessionContractError('MALFORMED_SOURCE', 'Windsurf transcript step is malformed');
      }
      return { ...record, value: parsed.data };
    });
    const versions = new Set(steps.map(({ value }) =>
      value.schema_version ?? WINDSURF_TRANSCRIPT_SCHEMA_VERSION));
    if (versions.size !== 1) {
      throw new SessionContractError('SCHEMA_DRIFT', 'mixed Windsurf transcript schemas');
    }
    const schemaVersion = [...versions][0];
    assertSupportedSchemaMajor(schemaVersion);
    const trajectoryIds = new Set(steps.flatMap(({ value }) =>
      value.trajectory_id ? [value.trajectory_id] : []));
    if (trajectoryIds.size > 1) {
      throw new SessionContractError('SCHEMA_DRIFT', 'mixed Windsurf trajectory identities');
    }
    const nativeSessionId = [...trajectoryIds][0] ?? basename(source.locator, '.jsonl');
    return {
      schemaVersion,
      records: steps.map(({ value, sequence, byteOffset }) =>
        normalizeStep(value, nativeSessionId, sequence, byteOffset, source.locatorClass, schemaVersion)),
    };
  }
}

function normalizeStep(
  step: Step,
  nativeSessionId: string,
  sequence: number,
  offset: number,
  locatorClass: string,
  schemaVersion: string,
): ProviderRecord {
  const text = stepText(step);
  return {
    nativeSessionId,
    nativeEventId: step.event_id ?? (step.execution_id
      ? `${step.execution_id}:${sequence}` : `${nativeSessionId}:${sequence}`),
    sequence,
    kind: `windsurf.${step.type}`,
    role: step.type === 'user_input' ? 'user'
      : step.type === 'planner_response' ? 'assistant' : 'tool',
    occurredAt: timestamp(step.timestamp),
    text,
    rawReference: { locatorClass, offset, sequence },
    extensions: {
      status: step.status,
      trajectoryId: step.trajectory_id ?? nativeSessionId,
      executionId: step.execution_id,
      model: step.model_name ?? step.model,
      sensitiveContentWarning: step.sensitive_content_warning ?? true,
      nativeStep: step,
      provenance: {
        acquisition: 'user-enabled-post_cascade_response_with_transcript',
        product: 'Devin Desktop',
        compatibilityProviderId: 'windsurf',
        captureBoundary: 'completed-cascade-response',
        schema: schemaVersion,
        optInRequired: true,
        hookConfiguredByAiWG: false,
        credentialsInspected: false,
        environmentSecretsInspected: false,
        liveTokenCapture: false,
        completeHistoricalCapture: false,
        providerRetention: { maximumFiles: 100, evictionOrder: 'oldest-mtime' },
      },
      deletion: {
        aiwgDeletionDoesNotDeleteWindsurfTranscript: true,
        providerConversationDeletionStateUnknown: true,
      },
    },
  };
}

function stepText(step: Step): string {
  const candidate = step.type === 'user_input'
    ? step.user_input?.user_response
    : step.type === 'planner_response'
      ? step.planner_response?.response
      : step.code_action?.new_content ?? step.tool_info?.response;
  return typeof candidate === 'string' ? candidate : '';
}

function timestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new SessionContractError('AMBIGUOUS_TIMESTAMP', 'invalid Windsurf timestamp');
  }
  return date.toISOString();
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid Windsurf cursor');
  return Number(value);
}
