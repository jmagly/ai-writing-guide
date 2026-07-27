import { createHash } from 'node:crypto';
import { basename } from 'node:path';
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
import { readBoundedText, type ReaderLimits } from '../readers.js';

export const WARP_ADAPTER_VERSION = '1.0.0';
export const WARP_MARKDOWN_SCHEMA_VERSION = '1.0.0';

interface MarkdownBlock {
  role: string;
  heading: string;
  text: string;
}

export class WarpSessionAdapter implements SessionSourceAdapter {
  readonly provider = 'warp' as const;
  readonly adapterVersion = WARP_ADAPTER_VERSION;
  readonly disposition = 'manual-only' as const;
  readonly supportedOperations = ['inspect', 'stream'] as const;
  readonly acquisitionModes = ['manual-export'] as const;

  constructor(private readonly limits?: Partial<ReaderLimits>) {}

  async *discover(_scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    // Deliberately no internal store discovery. Users select a Markdown export.
  }

  async inspect(source: SelectedSource): Promise<SourceProbe> {
    if (source.locatorClass === 'warp-internal-store'
      || source.locatorClass === 'warp-sqlite'
      || source.locatorClass === 'warp-protobuf') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Warp internal store discovery is unsupported; use /export-to-file and select the Markdown export',
      );
    }
    const parsed = await this.readSource(source);
    return {
      sourceSchemaVersion: parsed.schemaVersion,
      consistency: 'complete',
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
    if (source.locatorClass !== 'warp-markdown-export') {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Warp supports only an explicitly selected Markdown conversation export',
      );
    }
    const { value } = await readBoundedText({
      selectedPath: source.locator,
      allowedRoots: source.authorizedScope.allowedRoots,
    }, this.limits);
    const schemaVersion = declaredSchema(value);
    assertSupportedSchemaMajor(schemaVersion);
    const blocks = parseBlocks(value);
    if (blocks.length === 0) {
      throw new SessionContractError(
        'MALFORMED_SOURCE',
        'Warp Markdown export contains no recognized user or assistant conversation blocks',
      );
    }
    const stableSessionId = `manual:${createHash('sha256').update(value).digest('hex').slice(0, 32)}`;
    const lifecycleEvidence = /<!--\s*warp-lifecycle:\s*complete\s*-->/i.test(value)
      ? 'completed-at-import' : 'unknown-at-import';
    const title = /^#\s+(.+)$/m.exec(value)?.[1]?.trim();
    return {
      schemaVersion: WARP_MARKDOWN_SCHEMA_VERSION,
      records: blocks.map((block, sequence) => ({
        nativeSessionId: stableSessionId,
        nativeEventId: undefined,
        sequence,
        kind: 'message',
        role: block.role,
        occurredAt: undefined,
        text: block.text,
        rawReference: { locatorClass: source.locatorClass, sequence },
        extensions: {
          lifecycle: lifecycleEvidence,
          manualImport: true,
          title,
          heading: block.heading,
          identity: {
            nativeSessionIdKnown: false,
            nativeEventIdKnown: false,
            derivedSessionIdentity: true,
          },
          lossReport: {
            lossless: false,
            sourceFormat: 'markdown',
            unknownFields: [
              'nativeSessionId',
              'nativeEventId',
              'timestamp',
              'model',
              'toolStructure',
              'attachmentStructure',
              'tokenUsage',
              'cost',
              'workspace',
              'lineage',
            ],
            roleInference: 'heading-based',
            lifecycleEvidence,
          },
          provenance: {
            acquisition: 'user-selected-markdown-export',
            schema: schemaVersion,
            exportCommand: '/export-to-file',
            internalStoreInspected: false,
            originalFilename: basename(source.locator),
          },
          deletion: {
            aiwgDeletionDoesNotDeleteWarpConversation: true,
            exportDeletionDoesNotDeleteWarpConversation: true,
            providerDeletionStateUnknown: true,
          },
        },
      })),
    };
  }
}

function declaredSchema(value: string): string {
  const match = /<!--\s*warp-conversation-export:\s*([^\s]+)\s*-->/i.exec(value);
  if (!match) return WARP_MARKDOWN_SCHEMA_VERSION;
  const version = match[1];
  return /^\d+$/.test(version) ? `${version}.0.0` : version;
}

function parseBlocks(value: string): MarkdownBlock[] {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let current: { role: string; heading: string; lines: string[] } | undefined;
  const flush = () => {
    if (!current) return;
    const text = current.lines.join('\n').trim();
    if (text) blocks.push({ role: current.role, heading: current.heading, text });
  };
  for (const line of lines) {
    const heading = /^#{2,6}\s+(.+?)\s*$/.exec(line);
    const role = heading ? headingRole(heading[1]) : undefined;
    if (role) {
      flush();
      current = { role, heading: heading![1].trim(), lines: [] };
    } else if (current && !/^<!--\s*warp-(?:conversation-export|lifecycle):/i.test(line)) {
      current.lines.push(line);
    }
  }
  flush();
  return blocks;
}

function headingRole(heading: string): string | undefined {
  const normalized = heading.trim().toLowerCase().replace(/[:：]\s*$/, '');
  if (/^(user|you|human|prompt|query)(?:\s+\d+)?$/.test(normalized)) return 'user';
  if (/^(warp|assistant|agent|response|answer)(?:\s+\d+)?$/.test(normalized)) return 'assistant';
  return undefined;
}

function parseCursor(value?: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) throw new SessionContractError('SCHEMA_DRIFT', 'invalid Warp cursor');
  return Number(value);
}
