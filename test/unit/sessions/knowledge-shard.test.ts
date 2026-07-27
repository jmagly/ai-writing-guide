import { describe, expect, it } from 'vitest';
import {
  convertSessionEventsToKnowledgeShard,
  SESSION_CONTRACT_VERSION,
  sha256,
  type SessionEvent,
  type SessionSource,
} from '../../../src/sessions/index.js';

const source: SessionSource = {
  contractVersion: SESSION_CONTRACT_VERSION,
  sourceId: 'source-1',
  provider: 'generic',
  providerProfile: 'fixture',
  locatorClass: 'manual-export',
  redactedLocator: '<fixture>',
  adapterVersion: '1.0.0',
  sourceSchemaVersion: '1.0.0',
  disposition: 'implemented',
  operationalState: 'available',
  consistency: 'complete',
  authorizedAt: '2026-07-27T00:00:00.000Z',
  extensions: { 'native.generic': {} },
};

function event(overrides: Partial<SessionEvent> = {}): SessionEvent {
  return {
    contractVersion: SESSION_CONTRACT_VERSION,
    eventId: 'event-1',
    sessionId: 'session-1',
    sourceId: source.sourceId,
    importRunId: 'run-1',
    nativeId: 'native-1',
    sequence: 0,
    kind: 'message',
    role: 'assistant',
    occurredAt: null,
    searchableText: 'approved redacted evidence',
    digest: sha256('approved redacted evidence'),
    rawReference: { locatorClass: 'manual-export' },
    adapterVersion: '1.0.0',
    consistency: 'complete',
    sensitivity: { classification: 'none', classes: [] },
    opaque: false,
    extensions: {},
    ...overrides,
  };
}

describe('session Knowledge Shard conversion', () => {
  it('preserves evidence identity and reports lossless conversion honestly', () => {
    const result = convertSessionEventsToKnowledgeShard(source, [event()]);
    expect(result).toMatchObject({
      target: 'knowledge-shard-v1',
      lossless: true,
      losses: [],
      records: [{
        id: 'event-1',
        content: 'approved redacted evidence',
        metadata: {
          provider: 'generic',
          sessionId: 'session-1',
          eventId: 'event-1',
          importRunId: 'run-1',
          sourceId: 'source-1',
          locatorClass: 'manual-export',
        },
      }],
    });
  });

  it('emits typed losses for fields Knowledge Shard v1 cannot represent', () => {
    const result = convertSessionEventsToKnowledgeShard(source, [event({
      rawReference: { locatorClass: 'manual-export', offset: 12, sequence: 4 },
      extensions: { 'native.generic': { thread: 't-1' } },
    })]);
    expect(result.lossless).toBe(false);
    expect(result.losses.map((loss) => loss.code)).toEqual([
      'NATIVE_EXTENSION_NOT_PORTABLE',
      'RAW_OFFSET_NOT_PORTABLE',
      'RAW_SEQUENCE_NOT_PORTABLE',
    ]);
    expect(result.losses.every((loss) => loss.eventId === 'event-1')).toBe(true);
  });
});
