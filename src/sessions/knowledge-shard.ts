import type { SessionEvent, SessionSource } from './contracts.js';

export type SessionShardLossCode =
  | 'NATIVE_EXTENSION_NOT_PORTABLE'
  | 'RAW_OFFSET_NOT_PORTABLE'
  | 'RAW_SEQUENCE_NOT_PORTABLE';

export interface SessionShardLoss {
  code: SessionShardLossCode;
  eventId: string;
  field: string;
  reason: string;
}

export interface SessionKnowledgeShardRecord {
  id: string;
  content: string;
  metadata: {
    provider: string;
    sessionId: string;
    eventId: string;
    importRunId: string;
    sourceId: string;
    locatorClass: string;
    role: string | null;
    occurredAt: string | null;
    sensitivity: string;
  };
}

export interface SessionKnowledgeShardConversion {
  contractVersion: '1.0.0';
  target: 'knowledge-shard-v1';
  records: SessionKnowledgeShardRecord[];
  losses: SessionShardLoss[];
  lossless: boolean;
}

export function convertSessionEventsToKnowledgeShard(
  source: SessionSource,
  events: readonly SessionEvent[],
): SessionKnowledgeShardConversion {
  const losses: SessionShardLoss[] = [];
  const records = events.map((event) => {
    if (Object.values(event.extensions).some(hasPortableValue)) {
      losses.push({
        code: 'NATIVE_EXTENSION_NOT_PORTABLE',
        eventId: event.eventId,
        field: 'extensions',
        reason: 'Knowledge Shard v1 has no canonical provider-native extension field',
      });
    }
    if (event.rawReference.offset !== undefined) {
      losses.push({
        code: 'RAW_OFFSET_NOT_PORTABLE',
        eventId: event.eventId,
        field: 'rawReference.offset',
        reason: 'Knowledge Shard v1 preserves locator class but not byte offsets',
      });
    }
    if (event.rawReference.sequence !== undefined) {
      losses.push({
        code: 'RAW_SEQUENCE_NOT_PORTABLE',
        eventId: event.eventId,
        field: 'rawReference.sequence',
        reason: 'Knowledge Shard v1 preserves event identity but not provider sequence locators',
      });
    }
    return {
      id: event.eventId,
      content: event.searchableText,
      metadata: {
        provider: source.provider,
        sessionId: event.sessionId,
        eventId: event.eventId,
        importRunId: event.importRunId,
        sourceId: event.sourceId,
        locatorClass: source.locatorClass,
        role: event.role,
        occurredAt: event.occurredAt,
        sensitivity: event.sensitivity.classification,
      },
    };
  });
  return {
    contractVersion: '1.0.0',
    target: 'knowledge-shard-v1',
    records,
    losses,
    lossless: losses.length === 0,
  };
}

function hasPortableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}
