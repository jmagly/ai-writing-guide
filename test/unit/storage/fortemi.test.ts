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
import {
  FortemiAdapter,
  fortemiStableNoteId,
  resolveFortemiToolProfile,
  resolveMcpRequestHeaders,
  unwrapMcpToolResult,
  validateRemoteMcpUrl,
  type McpClientLike,
} from '../../../src/storage/backends/fortemi.js';

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

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
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

  function makeAdapter(
    opts: { subsystem?: string; scheme?: string } = {},
  ): FortemiAdapter {
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

      expect(stub.calls.map((c) => c.name)).toEqual([
        'get_note',
        'capture_knowledge',
      ]);
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
      stub.responses.push({
        name: 'get_note',
        result: { note: { content: 'old' } },
      });
      stub.responses.push({ name: 'update_note', result: { ok: true } });

      await adapter.write('foo', 'new content');

      expect(stub.calls.map((c) => c.name)).toEqual([
        'get_note',
        'update_note',
      ]);
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

  describe('source-addressed live contract (Fortemi 2026.9.1)', () => {
    const tools = [
      {
        name: 'get_note',
        inputSchema: { properties: { id: {} }, required: ['id'] },
      },
      {
        name: 'update_note',
        inputSchema: {
          properties: { id: {}, content: {}, archived: {} },
          required: ['id'],
        },
      },
      {
        name: 'list_notes',
        inputSchema: { properties: { limit: {}, offset: {} } },
      },
      {
        name: 'search',
        inputSchema: {
          properties: { action: {}, query: {}, limit: {} },
          required: ['action'],
        },
      },
      {
        name: 'upsert_external_notes',
        inputSchema: {
          properties: {
            source_namespace: {},
            items: {
              items: {
                properties: {
                  external_id: {},
                  content: {},
                  caller_stable_id: {},
                },
              },
            },
          },
        },
      },
    ];

    function currentAdapter(responses: Record<string, unknown> = {}) {
      const calls: ToolCall[] = [];
      const client: McpClientLike = {
        listTools: async () => ({ tools }),
        callTool: async (name, args) => {
          calls.push({ name, args });
          return responses[name] ?? null;
        },
      };
      return {
        calls,
        adapter: new FortemiAdapter({
          subsystem: 'kb',
          config: { type: 'fortemi' },
          clientFactory: async () => client,
        }),
      };
    }

    it('selects contracts from schemas and derives a deterministic opaque UUID', () => {
      expect(resolveFortemiToolProfile(tools)).toBe('source-addressed-v1');
      expect(fortemiStableNoteId('kb', 'a.md')).toBe(
        fortemiStableNoteId('kb', 'a.md'),
      );
      expect(fortemiStableNoteId('kb', 'a.md')).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(fortemiStableNoteId('kb', 'a.md')).not.toBe(
        fortemiStableNoteId('kb', 'b.md'),
      );
    });

    it('maps read and delete to UUID id without sending legacy note_id', async () => {
      const { adapter, calls } = currentAdapter({
        get_note: { note: { content: 'body' } },
      });
      expect(await adapter.read('a.md')).toBe('body');
      await adapter.delete('a.md');
      expect(calls[0]).toEqual({
        name: 'get_note',
        args: { id: fortemiStableNoteId('kb', 'a.md') },
      });
      expect(calls[2]).toEqual({
        name: 'update_note',
        args: {
          id: fortemiStableNoteId('kb', 'a.md'),
          archived: true,
        },
      });
    });

    it('reads Titan nested revised content and falls back to nested original content', async () => {
      const revised = currentAdapter({
        get_note: {
          note: { id: fortemiStableNoteId('kb', 'a.md') },
          original: { content: 'original body' },
          revised: { content: 'revised body' },
        },
      });
      expect(await revised.adapter.read('a.md')).toBe('revised body');

      const original = currentAdapter({
        get_note: {
          note: { id: fortemiStableNoteId('kb', 'a.md') },
          original: { content: 'original body' },
        },
      });
      expect(await original.adapter.read('a.md')).toBe('original body');
    });

    it('uses one atomic source-addressed upsert with stable identity and digest', async () => {
      const { adapter, calls } = currentAdapter();
      await adapter.write('a.md', '# body', { contentType: 'text/markdown' });
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe('upsert_external_notes');
      expect(calls[0].args).toMatchObject({
        source_namespace: 'aiwg.storage.kb',
        source_schema_version: 'aiwg.storage-entry/v1',
        policy: 'replace',
        items: [
          {
            external_id: 'a.md',
            content: '# body',
            caller_stable_id: fortemiStableNoteId('kb', 'a.md'),
            metadata: {
              subsystem: 'kb',
              aiwg_storage_path: 'a.md',
              content_type: 'text/markdown',
            },
          },
        ],
      });
      expect(calls[0].args.import_run_id).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(calls[0].args.batch_id).toBe(calls[0].args.import_run_id);
    });

    it('filters unscoped list/search results locally using source metadata', async () => {
      const { adapter, calls } = currentAdapter({
        list_notes: {
          notes: [
            {
              id: 'uuid-a',
              metadata: { subsystem: 'kb', aiwg_storage_path: 'docs/a.md' },
            },
            {
              id: 'uuid-b',
              metadata: { subsystem: 'other', aiwg_storage_path: 'docs/b.md' },
            },
          ],
        },
        search: {
          results: [
            {
              id: 'uuid-a',
              metadata: { subsystem: 'kb', aiwg_storage_path: 'docs/a.md' },
            },
            {
              id: 'uuid-b',
              metadata: { subsystem: 'other', aiwg_storage_path: 'docs/b.md' },
            },
          ],
        },
      });
      expect(await adapter.list('docs/')).toEqual([
        { path: 'docs/a.md', externalId: 'uuid-a' },
      ]);
      expect(await adapter.query('alpha')).toEqual([
        { path: 'docs/a.md', externalId: 'uuid-a' },
      ]);
      expect(calls[0]).toEqual({
        name: 'list_notes',
        args: { limit: 500, offset: 0 },
      });
      expect(calls[1]).toMatchObject({
        name: 'search',
        args: { action: 'text', query: 'alpha', limit: 50 },
      });
    });

    it('hydrates UUID-only search hits and enforces subsystem scope from get_note', async () => {
      const scopedId = '299e764d-44e4-5b14-a552-70e46d2d621b';
      const foreignId = '199e764d-44e4-5b14-a552-70e46d2d621b';
      const calls: ToolCall[] = [];
      const client: McpClientLike = {
        listTools: async () => ({ tools }),
        callTool: async (name, args) => {
          calls.push({ name, args });
          if (name === 'search') return { results: [{ id: scopedId }, { id: foreignId }] };
          if (name === 'get_note' && args.id === scopedId) {
            return { note: { id: scopedId, metadata: { subsystem: 'kb', aiwg_storage_path: 'docs/a.md' } } };
          }
          return { note: { id: foreignId, metadata: { subsystem: 'other', aiwg_storage_path: 'private.md' } } };
        },
      };
      const adapter = new FortemiAdapter({
        subsystem: 'kb', config: { type: 'fortemi' }, clientFactory: async () => client,
      });
      expect(await adapter.query('alpha')).toEqual([{ path: 'docs/a.md', externalId: scopedId }]);
      expect(calls.map(({ name }) => name)).toEqual(['search', 'get_note', 'get_note']);
    });

    it('does not hydrate malformed IDs and propagates hydration authorization errors', async () => {
      const calls: ToolCall[] = [];
      const client: McpClientLike = {
        listTools: async () => ({ tools }),
        callTool: async (name, args) => {
          calls.push({ name, args });
          if (name === 'search') {
            return { results: [{ id: 'not-a-uuid' }, { id: '299e764d-44e4-5b14-a552-70e46d2d621b' }] };
          }
          throw new Error('synthetic authorization denied');
        },
      };
      const adapter = new FortemiAdapter({
        subsystem: 'kb', config: { type: 'fortemi' }, clientFactory: async () => client,
      });
      await expect(adapter.query('alpha')).rejects.toThrow('synthetic authorization denied');
      expect(calls).toHaveLength(2);
      expect(calls[1].args.id).toBe('299e764d-44e4-5b14-a552-70e46d2d621b');
    });

    it('fails closed on an unknown schema before any tool operation', async () => {
      expect(() =>
        resolveFortemiToolProfile([
          { name: 'get_note', inputSchema: { properties: { slug: {} } } },
        ]),
      ).toThrow(/unsupported live MCP tool contract/);
    });
  });

  describe('list', () => {
    it('returns entries with subsystem prefix stripped', async () => {
      const adapter = makeAdapter({ subsystem: 'kb' });
      stub.responses.push({
        name: 'list_notes',
        result: {
          notes: [
            {
              note_id: 'kb:entities/a.md',
              size: 12,
              updated_at: '2026-04-28T12:00:00Z',
            },
            { note_id: 'kb:entities/b.md', size: 18 },
            { note_id: 'memory:other.md' }, // wrong subsystem — filtered out
          ],
        },
      });
      const entries = await adapter.list('entities/');
      expect(entries.map((e) => e.path)).toEqual([
        'entities/a.md',
        'entities/b.md',
      ]);
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
      stub.responses.push({
        name: 'get_note',
        result: { note: { content: 'x' } },
      });
      stub.responses.push({ name: 'update_note', result: { ok: true } });
      await adapter.delete('foo');
      expect(stub.calls.map((c) => c.name)).toEqual([
        'get_note',
        'update_note',
      ]);
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
      expect(results.map((r) => r.path)).toEqual([
        'concepts/foo.md',
        'entities/bar.md',
      ]);
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

  describe('authenticated remote transport configuration (#1508)', () => {
    it('resolves bearer headers from references without persisting secret values', () => {
      const headers = resolveMcpRequestHeaders(
        { headerEnv: { Authorization: 'AIWG_FORTEMI_TOKEN' } },
        { AIWG_FORTEMI_TOKEN: 'synthetic-test-token' },
      );
      expect(headers).toEqual({ Authorization: 'Bearer synthetic-test-token' });
    });

    it('fails closed when a referenced credential is unavailable', () => {
      expect(() =>
        resolveMcpRequestHeaders(
          { headerEnv: { Authorization: 'AIWG_FORTEMI_TOKEN' } },
          {},
        ),
      ).toThrow(
        /required credential environment variable "AIWG_FORTEMI_TOKEN" is not set/,
      );
    });

    it('rejects malformed environment variable references', () => {
      expect(() =>
        resolveMcpRequestHeaders(
          { headerEnv: { Authorization: '../token-file' } },
          {},
        ),
      ).toThrow(/invalid environment variable reference/);
    });

    it('requires TLS remotely while allowing loopback workstation HTTP', () => {
      expect(
        validateRemoteMcpUrl('https://memory.example.internal/mcp').protocol,
      ).toBe('https:');
      expect(validateRemoteMcpUrl('http://127.0.0.1:3100/mcp').hostname).toBe(
        '127.0.0.1',
      );
      expect(validateRemoteMcpUrl('http://[::1]:3100/mcp').hostname).toBe(
        '[::1]',
      );
      expect(() =>
        validateRemoteMcpUrl('http://memory.example.internal/mcp'),
      ).toThrow(/must use HTTPS/);
    });
  });

  describe('MCP SDK result normalization (#1508)', () => {
    it('unwraps structured tool results from the SDK envelope', () => {
      expect(
        unwrapMcpToolResult({
          content: [{ type: 'text', text: 'ignored fallback' }],
          structuredContent: { note: { content: '# imported' } },
        }),
      ).toEqual({ note: { content: '# imported' } });
    });

    it('parses JSON text results used by local workstation servers', () => {
      expect(
        unwrapMcpToolResult({
          content: [{ type: 'text', text: '{"not_found":true}' }],
        }),
      ).toEqual({ not_found: true });
    });

    it('preserves plain text as content without executing or interpolating it', () => {
      expect(
        unwrapMcpToolResult({
          content: [{ type: 'text', text: 'plain response' }],
        }),
      ).toEqual({ content: 'plain response' });
    });

    it('turns MCP error envelopes into migration failures', () => {
      expect(() =>
        unwrapMcpToolResult({
          isError: true,
          content: [{ type: 'text', text: 'not authorized' }],
        }),
      ).toThrow(/MCP tool failed: not authorized/);
    });

    it('normalizes only explicit Fortemi note-not-found problem responses', () => {
      expect(
        unwrapMcpToolResult({
          isError: true,
          content: [
            {
              type: 'text',
              text: 'API error 404: Not Found | detail: Note not found | type: https://fortemi.com/problems/not-found',
            },
          ],
        }),
      ).toEqual({ not_found: true });
      expect(() =>
        unwrapMcpToolResult({
          isError: true,
          content: [
            {
              type: 'text',
              text: 'API error 404: Not Found | detail: route missing',
            },
          ],
        }),
      ).toThrow(/MCP tool failed/);
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
