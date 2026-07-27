import { z } from 'zod';
import {
  SessionContractError,
  assertSupportedSchemaMajor,
  type ImportCursor,
  type ProviderRecord,
  type SelectedSource,
  type SessionSourceAdapter,
  type SourceDescriptor,
  type SourceProbe,
  type AuthorizedScope,
} from '../contracts.js';
import { readBoundedJsonLines, type ReaderLimits } from '../readers.js';

export const GENERIC_INTERCHANGE_KIND = 'aiwg.session-interchange';
export const GENERIC_ADAPTER_VERSION = '1.0.0';

const Rfc3339Schema = z.string().refine(
  (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value)),
  'timestamp must be RFC 3339 with an explicit UTC offset',
);

export const GenericInterchangeHeaderSchema = z.object({
  type: z.literal(GENERIC_INTERCHANGE_KIND),
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  product: z.string().min(1),
  productVersion: z.string().min(1),
  sourceId: z.string().min(1),
  exportedAt: Rfc3339Schema,
  consistency: z.enum(['provisional', 'consistent-snapshot', 'complete']),
  lifecycle: z.enum(['active', 'complete', 'archived']),
  workspace: z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    repository: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
  }).passthrough(),
  provenance: z.object({
    exporter: z.string().min(1),
    exporterVersion: z.string().min(1),
    sourceClass: z.string().min(1),
  }).passthrough(),
  extensions: z.record(z.unknown()).default({}),
}).passthrough();

export const GenericInterchangeEventSchema = z.object({
  type: z.literal('event'),
  sessionId: z.string().min(1),
  eventId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  kind: z.string().min(1),
  role: z.string().min(1).optional(),
  occurredAt: Rfc3339Schema.optional(),
  text: z.string(),
  lifecycle: z.enum(['active', 'complete', 'archived']),
  extensions: z.record(z.unknown()).default({}),
}).passthrough();

export type GenericInterchangeHeader = z.infer<typeof GenericInterchangeHeaderSchema>;

export class GenericSessionInterchangeAdapter implements SessionSourceAdapter {
  readonly provider = 'generic' as const;
  readonly adapterVersion = GENERIC_ADAPTER_VERSION;
  readonly disposition = 'manual-only' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['manual-export'] as const;

  constructor(private readonly limits?: Partial<ReaderLimits>) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    throw new SessionContractError(
      'UNSUPPORTED_OPERATION',
      'generic interchange does not support automatic discovery; select an exported file explicitly',
    );
  }

  async inspect(source: SelectedSource): Promise<SourceProbe> {
    const parsed = await this.readAndValidate(source);
    return {
      sourceSchemaVersion: parsed.header.schemaVersion,
      consistency: parsed.header.consistency,
      operationalState: 'available',
    };
  }

  async *stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord> {
    const parsed = await this.readAndValidate(source);
    const start = parseEventCursor(cursor?.value);
    for (const event of parsed.events.slice(start)) {
      const knownKeys = new Set([
        'type', 'sessionId', 'eventId', 'sequence', 'kind', 'role',
        'occurredAt', 'text', 'lifecycle', 'extensions',
      ]);
      const unknownFields = Object.fromEntries(
        Object.entries(event).filter(([key]) => !knownKeys.has(key)),
      );
      yield {
        nativeSessionId: event.sessionId,
        nativeEventId: event.eventId,
        sequence: event.sequence,
        kind: event.kind,
        role: event.role,
        occurredAt: event.occurredAt,
        text: event.text,
        rawReference: { locatorClass: 'generic-interchange', sequence: event.sequence },
        extensions: {
          ...event.extensions,
          unknownFields,
          lifecycle: event.lifecycle,
          workspace: parsed.header.workspace,
          provenance: parsed.header.provenance,
          product: parsed.header.product,
          productVersion: parsed.header.productVersion,
        },
      };
    }
  }

  private async readAndValidate(source: SelectedSource): Promise<{
    header: GenericInterchangeHeader;
    events: Array<z.infer<typeof GenericInterchangeEventSchema>>;
  }> {
    const result = await readBoundedJsonLines(
      {
        selectedPath: source.locator,
        allowedRoots: source.authorizedScope.allowedRoots,
      },
      { consistency: 'provisional', limits: this.limits },
    );
    if (result.incompleteTail) {
      throw new SessionContractError('TRUNCATED_SOURCE', 'generic interchange contains a truncated record');
    }
    if (result.records.length === 0) {
      throw new SessionContractError('MALFORMED_SOURCE', 'generic interchange is empty');
    }
    const header = parseHeader(result.records[0].value);
    assertSupportedSchemaMajor(header.schemaVersion);
    if (header.sourceId !== source.sourceId) {
      throw new SessionContractError('SCHEMA_DRIFT', 'selected source identity does not match interchange header');
    }
    const events = result.records.slice(1).map((record) => parseEvent(record.value));
    const eventIds = new Set<string>();
    const sessionSequences = new Set<string>();
    for (const event of events) {
      if (eventIds.has(event.eventId)) {
        throw new SessionContractError('DUPLICATE_NATIVE_ID', 'generic interchange contains a duplicate event ID');
      }
      eventIds.add(event.eventId);
      const sequenceKey = `${event.sessionId}\0${event.sequence}`;
      if (sessionSequences.has(sequenceKey)) {
        throw new SessionContractError('DUPLICATE_NATIVE_ID', 'generic interchange contains a duplicate session sequence');
      }
      sessionSequences.add(sequenceKey);
    }
    return { header, events };
  }
}

function parseHeader(value: unknown): GenericInterchangeHeader {
  const result = GenericInterchangeHeaderSchema.safeParse(value);
  if (result.success) return result.data;
  if (hasAmbiguousTimestamp(result.error)) {
    throw new SessionContractError('AMBIGUOUS_TIMESTAMP', 'generic interchange header has an ambiguous timestamp');
  }
  throw new SessionContractError(
    'MALFORMED_SOURCE',
    'input is not a declared AIWG generic session interchange',
  );
}

function parseEvent(value: unknown): z.infer<typeof GenericInterchangeEventSchema> {
  const result = GenericInterchangeEventSchema.safeParse(value);
  if (result.success) return result.data;
  if (hasAmbiguousTimestamp(result.error)) {
    throw new SessionContractError('AMBIGUOUS_TIMESTAMP', 'generic interchange event has an ambiguous timestamp');
  }
  throw new SessionContractError('MALFORMED_SOURCE', 'generic interchange event is malformed');
}

function hasAmbiguousTimestamp(error: z.ZodError): boolean {
  return error.issues.some((issue) =>
    issue.code === z.ZodIssueCode.custom
    && (issue.path.at(-1) === 'occurredAt' || issue.path.at(-1) === 'exportedAt'));
}

function parseEventCursor(value?: string): number {
  if (value === undefined || value === '') return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'generic event cursor is invalid');
  return Number(value);
}
