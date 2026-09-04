import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PiSessionAdapter, type SelectedSource } from '../../../src/sessions/index.js';

const roots: string[] = [];
const fixtures = resolve('test/fixtures/sessions/pi');
const selected = (name: string): SelectedSource => ({ provider: 'pi', locator: join(fixtures, name),
  locatorClass: 'pi-session-v3-jsonl', sourceId: `pi-${name}`,
  authorizedScope: { workspaceId: 'fixture', allowedRoots: [fixtures] } });
async function collect(source: SelectedSource) { const rows = []; for await (const row of new PiSessionAdapter().stream(source)) rows.push(row); return rows; }
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe('PiSessionAdapter', () => {
  it('discovers v3 JSONL and preserves tree provenance while redacting tool output', async () => {
    const adapter = new PiSessionAdapter();
    const discovered = []; for await (const item of adapter.discover({ workspaceId: 'fixture', allowedRoots: [fixtures] })) discovered.push(item);
    expect(discovered.some(item => item.locator.endsWith('valid.jsonl'))).toBe(true);
    expect(await adapter.inspect(selected('valid.jsonl'))).toMatchObject({ sourceSchemaVersion: '3.0.0' });
    const records = await collect(selected('valid.jsonl'));
    expect(records.map(record => record.nativeEventId)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
    expect(records[2]).toMatchObject({ text: '[redacted provider content]', toolName: 'read' });
    expect(records[3]).toMatchObject({ activityBoundary: 'continuation' });
    expect(records[4].extensions).toMatchObject({ opaque: true, parentId: 'm4' });
  });
  it('fails safely for malformed, unknown, truncated, oversized, and unauthorized sources', async () => {
    await expect(collect(selected('malformed.jsonl'))).rejects.toMatchObject({ code: 'MALFORMED_SOURCE' });
    await expect(collect(selected('unknown-major.jsonl'))).rejects.toMatchObject({ code: 'UNKNOWN_SCHEMA_MAJOR' });
    const root = await mkdtemp(join(tmpdir(), 'pi-session-')); roots.push(root);
    const truncated = join(root, 'truncated.jsonl');
    await writeFile(truncated, '{"type":"session","version":3,"id":"x","timestamp":"2026-09-04T12:00:00Z","cwd":"/x"}\n{"type":');
    await expect(collect({ ...selected('valid.jsonl'), locator: truncated, authorizedScope: { workspaceId: 'x', allowedRoots: [root] } }))
      .rejects.toMatchObject({ code: 'TRUNCATED_SOURCE' });
    await expect(new PiSessionAdapter({ maxRecordBytes: 8 }).inspect(selected('valid.jsonl')))
      .rejects.toMatchObject({ code: 'RESOURCE_LIMIT_EXCEEDED' });
    await expect(new PiSessionAdapter().inspect({ ...selected('valid.jsonl'), authorizedScope: { workspaceId: 'x', allowedRoots: [root] } }))
      .rejects.toMatchObject({ code: 'SOURCE_NOT_AUTHORIZED' });
  });
});
