/**
 * Tests for src/storage/backends/fortemi.ts
 *
 * The adapter calls a Fortemi MCP server. Tests inject a stub
 * `McpClientLike` so we don't spawn a subprocess or require a live
 * server.
 *
 * @issue #934
 * @issue #961
 * @issue #972
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FortemiAdapter, type McpClientLike } from '../../../src/storage/backends/fortemi.js';

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

class StubMcpClient implements McpClientLike {
  public calls: ToolCall[] = [];
  /** Map of (name, predicate) → response. First match wins. */
  public responses: Array<{
    name: string;
    when?: (args: Record<string, unknown>) => boolean;
    result: unknown;
  }> = [];
  public closed = false;

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.calls.push({ name, args });
    for (const r of this.responses) {
      if (r.name !== name) continue;
      if (r.when && !r.when(args)) continue;
      return r.result;
    }
    return null;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

describe('storage/backends/fortemi (#972)', () => {
  let stub: StubMcpClient;

  function makeAdapter(opts: { subsystem?: string; scheme?: string } = {}): FortemiAdapter {
    return new FortemiAdapter({
      subsystem: opts.subsystem ?? 'memory',
      config: {
        type: 'fortemi',
        mcpServer: 'fortemi',
        ...(opts.scheme !== undefined ? { scheme: opts.scheme } : {}),
      },
      clientFactory: async () => stub,
    });
  }

  beforeEach(() => {
    stub = new StubMcpClient();
  });

  describe('init / close', () => {
    it('init() acquires the MCP client lazily', async () => {
      const adapter = makeAdapter();
      // Pre-init the stub responds to read with not_found
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      await adapter.init();
      // No tool calls until an op happens
      expect(stub.calls).toHaveLength(0);

      // Now do a read — that triggers a get_note call
      await adapter.read('foo');
      expect(stub.calls).toHaveLength(1);
      expect(stub.calls[0].name).toBe('get_note');
    });

    it('close() invokes underlying client.close()', async () => {
      const adapter = makeAdapter();
      await adapter.init();
      await adapter.close();
      expect(stub.closed).toBe(true);
    });
  });

  describe('read', () => {
    it('returns null when get_note reports not_found', async () => {
      const adapter = makeAdapter();
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      expect(await adapter.read('missing')).toBeNull();
    });

    it('returns revised_content when present', async () => {
      const adapter = makeAdapter();
      stub.responses.push({
        name: 'get_note',
        result: { note: { content: 'original', revised_content: 'revised' } },
      });
      expect(await adapter.read('any')).toBe('revised');
    });

    it('falls back to content when revised_content is missing', async () => {
      const adapter = makeAdapter();
      stub.responses.push({
        name: 'get_note',
        result: { note: { content: 'just content' } },
      });
      expect(await adapter.read('any')).toBe('just content');
    });

    it('namespaces note_id by subsystem', async () => {
      const adapter = makeAdapter({ subsystem: 'kb' });
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      await adapter.read('entities/foo');
      expect(stub.calls[0].args['note_id']).toBe('kb:entities/foo');
    });
  });

  describe('write', () => {
    it('uses capture_knowledge for first write (note does not exist)', async () => {
      const adapter = makeAdapter({ scheme: 'aiwg-memory' });
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      stub.responses.push({ name: 'capture_knowledge', result: { ok: true } });

      await adapter.write('foo', '# body', { frontmatter: { tags: ['ai'] } });

      expect(stub.calls.map((c) => c.name)).toEqual(['get_note', 'capture_knowledge']);
      const captureCall = stub.calls[1];
      expect(captureCall.args['note_id']).toBe('memory:foo');
      expect(captureCall.args['content']).toBe('# body');
      expect(captureCall.args['scheme']).toBe('aiwg-memory');
      expect(captureCall.args['metadata']).toMatchObject({
        subsystem: 'memory',
        scheme: 'aiwg-memory',
        frontmatter: { tags: ['ai'] },
      });
    });

    it('uses update_note for subsequent writes (note exists)', async () => {
      const adapter = makeAdapter();
      stub.responses.push({ name: 'get_note', result: { note: { content: 'old' } } });
      stub.responses.push({ name: 'update_note', result: { ok: true } });

      await adapter.write('foo', 'new content');

      expect(stub.calls.map((c) => c.name)).toEqual(['get_note', 'update_note']);
      expect(stub.calls[1].args['note_id']).toBe('memory:foo');
      expect(stub.calls[1].args['content']).toBe('new content');
    });

    it('forwards contentType in metadata when provided', async () => {
      const adapter = makeAdapter();
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      stub.responses.push({ name: 'capture_knowledge', result: { ok: true } });
      await adapter.write('foo', 'x', { contentType: 'text/markdown' });
      const meta = stub.calls[1].args['metadata'] as Record<string, unknown>;
      expect(meta['content_type']).toBe('text/markdown');
    });
  });

  describe('list', () => {
    it('returns entries with subsystem prefix stripped', async () => {
      const adapter = makeAdapter({ subsystem: 'kb' });
      stub.responses.push({
        name: 'list_notes',
        result: {
          notes: [
            { note_id: 'kb:entities/a.md', size: 12, updated_at: '2026-04-28T12:00:00Z' },
            { note_id: 'kb:entities/b.md', size: 18 },
            { note_id: 'memory:other.md' }, // wrong subsystem — filtered out
          ],
        },
      });
      const entries = await adapter.list('entities/');
      expect(entries.map((e) => e.path)).toEqual(['entities/a.md', 'entities/b.md']);
      expect(entries[0].externalId).toBe('kb:entities/a.md');
      expect(entries[0].size).toBe(12);
      expect(entries[0].modifiedAt).toBeInstanceOf(Date);
    });

    it('list_notes called with prefixed id_prefix', async () => {
      const adapter = makeAdapter({ subsystem: 'kb' });
      stub.responses.push({ name: 'list_notes', result: { notes: [] } });
      await adapter.list('entities/');
      expect(stub.calls[0].args['id_prefix']).toBe('kb:entities/');
    });

    it('empty prefix passes the bare subsystem prefix', async () => {
      const adapter = makeAdapter({ subsystem: 'kb' });
      stub.responses.push({ name: 'list_notes', result: { notes: [] } });
      await adapter.list('');
      expect(stub.calls[0].args['id_prefix']).toBe('kb:');
    });

    it('returns [] when the server returns no notes', async () => {
      const adapter = makeAdapter();
      stub.responses.push({ name: 'list_notes', result: null });
      expect(await adapter.list('')).toEqual([]);
    });
  });

  describe('delete', () => {
    it('archives via update_note when the note exists', async () => {
      const adapter = makeAdapter();
      stub.responses.push({ name: 'get_note', result: { note: { content: 'x' } } });
      stub.responses.push({ name: 'update_note', result: { ok: true } });
      await adapter.delete('foo');
      expect(stub.calls.map((c) => c.name)).toEqual(['get_note', 'update_note']);
      expect(stub.calls[1].args['archived']).toBe(true);
    });

    it('is a no-op when the note does not exist', async () => {
      const adapter = makeAdapter();
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      await adapter.delete('nope');
      expect(stub.calls.map((c) => c.name)).toEqual(['get_note']);
    });
  });

  describe('query', () => {
    it('uses the search tool with subsystem prefix scoping', async () => {
      const adapter = makeAdapter({ subsystem: 'kb' });
      stub.responses.push({
        name: 'search',
        result: {
          results: [
            { note_id: 'kb:concepts/foo.md', score: 0.95 },
            { note_id: 'kb:entities/bar.md', score: 0.82 },
            { note_id: 'memory:other.md', score: 0.99 }, // filtered out
          ],
        },
      });
      const results = await adapter.query('something');
      expect(results.map((r) => r.path)).toEqual(['concepts/foo.md', 'entities/bar.md']);
      expect(stub.calls[0].args['query']).toBe('something');
      expect(stub.calls[0].args['id_prefix']).toBe('kb:');
    });
  });

  describe('argument validation', () => {
    it('rejects empty paths', async () => {
      const adapter = makeAdapter();
      await expect(adapter.read('')).rejects.toThrow(/non-empty string/);
      await expect(adapter.write('', 'x')).rejects.toThrow(/non-empty string/);
    });

    it('rejects paths with null bytes', async () => {
      const adapter = makeAdapter();
      await expect(adapter.read('foo\0bar')).rejects.toThrow(/null bytes/);
    });
  });

  describe('integration with resolveStorage', () => {
    it('routes through FortemiAdapter when configured (with injected stub via direct construction)', async () => {
      // We can't intercept resolveStorage's adapter factory without
      // refactoring, so this test exercises FortemiAdapter directly to
      // confirm the adapter behavior; resolveStorage routing is already
      // covered by the obsidian/logseq integration tests through the
      // same dispatch switch in createAdapter().
      const adapter = makeAdapter({ subsystem: 'memory' });
      stub.responses.push({ name: 'get_note', result: { not_found: true } });
      stub.responses.push({ name: 'capture_knowledge', result: { ok: true } });
      await adapter.write('test.md', 'content');
      expect(stub.calls[1].args['note_id']).toBe('memory:test.md');
    });
  });
});
