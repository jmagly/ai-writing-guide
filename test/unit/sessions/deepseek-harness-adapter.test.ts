import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DeepSeekHarnessSessionAdapter } from '../../../src/sessions/adapters/deepseek-harness.js';

const root = resolve('test/fixtures/sessions/deepseek-harness');
const source = {
  provider: 'deepseek-harness' as const,
  locator: resolve(root, 'session.v2.jsonl'),
  locatorClass: 'deepseek-harness-session-v2-jsonl',
  sourceId: 'fixture',
  authorizedScope: { workspaceId: 'test', allowedRoots: [root] },
};

describe('DeepSeekHarnessSessionAdapter', () => {
  it('inspects and streams native v2 JSONL with conservative redaction', async () => {
    const adapter = new DeepSeekHarnessSessionAdapter();
    await expect(adapter.inspect(source)).resolves.toMatchObject({ sourceSchemaVersion: '2.0.0', operationalState: 'available' });
    const records = [];
    for await (const record of adapter.stream(source)) records.push(record);
    expect(records).toHaveLength(6);
    expect(records[1]).toMatchObject({ nativeEventId: 'dsh-session-1:1', kind: 'message.user', text: 'hello' });
    expect(records[2].text).toBe('[redacted provider content]');
    expect(records[3]).toMatchObject({ kind: 'message.assistant', text: 'hello back', model: 'deepseek/deepseek-chat-v3.1' });
    expect(records[3].text).not.toContain('private reasoning');
    expect(records[4].text).toBe('[redacted provider content]');
    expect(records[5].activityBoundary).toBe('end');
  });

  it('requires explicit authorization', async () => {
    const adapter = new DeepSeekHarnessSessionAdapter();
    await expect(async () => {
      for await (const _record of adapter.discover({ workspaceId: 'test', allowedRoots: [] })) { /* noop */ }
    }).rejects.toMatchObject({ code: 'SOURCE_NOT_AUTHORIZED' });
  });

  it('keeps retry, compaction, and future plugin payloads opaque and skips zstd', async () => {
    const adapter = new DeepSeekHarnessSessionAdapter();
    const discovered = [];
    for await (const item of adapter.discover(source.authorizedScope)) discovered.push(item.locator);
    expect(discovered.some(locator => locator.endsWith('.jsonl.zstd'))).toBe(false);
    const records = [];
    for await (const record of adapter.stream({
      ...source,
      locator: resolve(root, 'opaque-events.jsonl'),
    })) records.push(record);
    expect(records.map(record => record.kind)).toEqual([
      'deepseek-harness.assistant/attempt',
      'deepseek-harness.session/compact',
      'deepseek-harness.plugin/future',
      'deepseek-harness.turn/end',
    ]);
    expect(records.slice(0, 3).every(record => record.text === '[redacted provider content]')).toBe(true);
    expect(records.slice(0, 3).every(record => record.extensions?.opaque === true)).toBe(true);
  });

  it('rejects malformed and unknown-major session streams', async () => {
    const adapter = new DeepSeekHarnessSessionAdapter();
    for (const [name, code] of [
      ['malformed.jsonl', 'MALFORMED_SOURCE'],
      ['unknown-major.jsonl', 'UNKNOWN_SCHEMA_MAJOR'],
    ] as const) {
      const records = async () => {
        for await (const record of adapter.stream({ ...source, locator: resolve(root, name) })) {
          void record;
        }
      };
      await expect(records()).rejects.toMatchObject({ code });
    }
  });
});
