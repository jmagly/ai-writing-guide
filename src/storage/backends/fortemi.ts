/**
 * Fortemi Storage Adapter
 *
 * Routes storage operations through Fortemi's MCP tool surface. Fortemi
 * is the first-party AIWG semantic-memory project — Rust + PostgreSQL +
 * pgvector + SKOS + W3C PROV — referenced as "Forte" in #934 and
 * confirmed as Fortemi in #961.
 *
 * Tool surface (per `.aiwg/planning/training-framework/phase-4-fortemi-review.md`):
 *   capture_knowledge  - create note (we use this for first writes)
 *   update_note        - revise existing note (we use this for re-writes)
 *   get_note           - retrieve full note (read)
 *   list_notes         - filter/paginate (list)
 *   search             - text/semantic/spatial/temporal search (query)
 *   manage_collection  - organize notes in folders (we use folder=subsystem
 *                        scope to mirror the StorageAdapter contract)
 *
 * Path semantics:
 *   note_id = `${subsystem}:${path}` — the adapter passes the
 *   subsystem-relative path; the registry-supplied `subsystem` is
 *   prepended to keep different subsystems' notes from colliding.
 *
 * Caveats:
 *   - This adapter ships with the parameter shapes documented in the
 *     planning doc, but those shapes have NOT yet been validated against
 *     a live Fortemi instance. Treat this as alpha. The
 *     `McpClientLike.callTool(name, args)` injection point lets tests
 *     stub freely; real-world parameter mismatches surface as MCP
 *     errors that bubble up to the consumer.
 *   - Delete is implemented via `update_note` with `archived: true`
 *     because Fortemi's MCP surface does not document a direct delete
 *     tool (immutability + versioning is core to the design).
 *
 * @design @.aiwg/architecture/storage-design.md (§5.6)
 * @issue #934
 * @issue #961
 * @issue #972
 */

import type {
  FortemiBackendConfig,
  StorageAdapter,
  StorageEntry,
  WriteMeta,
} from '../types.js';

/**
 * Minimal MCP client surface this adapter consumes. Tests provide a
 * stub; production wires this to `@modelcontextprotocol/sdk/client/*`
 * via `createDefaultMcpClient(serverName)`.
 */
export interface McpClientLike {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  close?(): Promise<void>;
}

/**
 * Factory that, given a server name, returns a connected MCP client.
 * The default factory uses the SDK's stdio transport and AIWG's MCP
 * registry; tests inject a stub so no subprocess is spawned.
 */
export type McpClientFactory = (serverName: string) => Promise<McpClientLike>;

export interface FortemiAdapterOptions {
  /** Subsystem this adapter is bound to. Used to scope note IDs. */
  subsystem: string;
  /** Backend config from storage.config. */
  config: FortemiBackendConfig;
  /** Optional override for tests. Defaults to the SDK-backed factory. */
  clientFactory?: McpClientFactory;
}

const DEFAULT_MCP_SERVER = 'fortemi';

export class FortemiAdapter implements StorageAdapter {
  private readonly subsystem: string;
  private readonly mcpServer: string;
  private readonly scheme: string | undefined;
  private readonly clientFactory: McpClientFactory;
  private client: McpClientLike | null = null;

  constructor(opts: FortemiAdapterOptions) {
    this.subsystem = opts.subsystem;
    this.mcpServer = opts.config.mcpServer ?? DEFAULT_MCP_SERVER;
    this.scheme = opts.config.scheme;
    this.clientFactory = opts.clientFactory ?? createDefaultMcpClient;
  }

  async init(): Promise<void> {
    if (this.client) return;
    this.client = await this.clientFactory(this.mcpServer);
  }

  async close(): Promise<void> {
    if (this.client?.close) {
      await this.client.close();
    }
    this.client = null;
  }

  private async getClient(): Promise<McpClientLike> {
    if (!this.client) await this.init();
    if (!this.client) {
      throw new Error(`storage(fortemi): MCP client unavailable for server "${this.mcpServer}"`);
    }
    return this.client;
  }

  private noteId(path: string): string {
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error('storage(fortemi): path must be a non-empty string');
    }
    if (path.includes('\0')) {
      throw new Error(`storage(fortemi): null bytes not allowed in path "${path}"`);
    }
    return `${this.subsystem}:${path}`;
  }

  async read(path: string): Promise<string | null> {
    const id = this.noteId(path);
    const client = await this.getClient();
    const result = (await client.callTool('get_note', { note_id: id })) as
      | { note?: { content?: string; revised_content?: string }; not_found?: boolean }
      | null;

    if (!result || result.not_found) return null;
    const note = result.note;
    if (!note) return null;
    return note.revised_content ?? note.content ?? null;
  }

  async write(path: string, content: string, meta?: WriteMeta): Promise<void> {
    const id = this.noteId(path);
    const client = await this.getClient();

    // Try update first; if not found, capture as new. Two calls in the
    // worst case but idempotent — Fortemi's update_note increments the
    // version rather than overwriting, which matches the Phase-4 design.
    const existing = (await client.callTool('get_note', { note_id: id })) as
      | { note?: unknown; not_found?: boolean }
      | null;

    if (existing && !existing.not_found && existing.note) {
      await client.callTool('update_note', {
        note_id: id,
        content,
        metadata: this.buildMetadata(meta),
      });
    } else {
      await client.callTool('capture_knowledge', {
        note_id: id,
        content,
        scheme: this.scheme,
        metadata: this.buildMetadata(meta),
      });
    }
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    if (typeof prefix !== 'string') {
      throw new Error('storage(fortemi): list prefix must be a string');
    }
    const client = await this.getClient();
    const subsystemPrefix = `${this.subsystem}:`;
    const fullPrefix = prefix.length === 0 ? subsystemPrefix : `${subsystemPrefix}${prefix}`;

    const result = (await client.callTool('list_notes', {
      id_prefix: fullPrefix,
      scheme: this.scheme,
    })) as { notes?: Array<{ note_id: string; size?: number; updated_at?: string }> } | null;

    const notes = result?.notes ?? [];
    return notes
      .filter((n) => typeof n.note_id === 'string' && n.note_id.startsWith(subsystemPrefix))
      .map((n) => {
        const entry: StorageEntry = {
          path: n.note_id.slice(subsystemPrefix.length),
          externalId: n.note_id,
        };
        if (typeof n.size === 'number') entry.size = n.size;
        if (typeof n.updated_at === 'string') {
          const d = new Date(n.updated_at);
          if (!Number.isNaN(d.getTime())) entry.modifiedAt = d;
        }
        return entry;
      });
  }

  async delete(path: string): Promise<void> {
    // Fortemi's MCP surface does not document a destructive delete —
    // immutability + versioning is core to the design. We mark the note
    // archived via update_note instead. This matches the storage-design
    // contract (delete is "no-op when missing"; here we just suppress
    // the note from list/read by archiving it).
    const id = this.noteId(path);
    const client = await this.getClient();
    const existing = (await client.callTool('get_note', { note_id: id })) as
      | { note?: unknown; not_found?: boolean }
      | null;
    if (!existing || existing.not_found || !existing.note) return;
    await client.callTool('update_note', {
      note_id: id,
      archived: true,
    });
  }

  async query(q: string): Promise<StorageEntry[]> {
    const client = await this.getClient();
    const subsystemPrefix = `${this.subsystem}:`;
    const result = (await client.callTool('search', {
      query: q,
      id_prefix: subsystemPrefix,
      scheme: this.scheme,
    })) as { results?: Array<{ note_id: string; score?: number }> } | null;

    const results = result?.results ?? [];
    return results
      .filter((r) => typeof r.note_id === 'string' && r.note_id.startsWith(subsystemPrefix))
      .map((r) => ({
        path: r.note_id.slice(subsystemPrefix.length),
        externalId: r.note_id,
      }));
  }

  private buildMetadata(meta: WriteMeta | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {
      subsystem: this.subsystem,
      source: 'aiwg-storage-adapter',
    };
    if (meta?.contentType) out['content_type'] = meta.contentType;
    if (meta?.frontmatter) out['frontmatter'] = meta.frontmatter;
    if (this.scheme) out['scheme'] = this.scheme;
    return out;
  }
}

/**
 * Default MCP client factory. Resolves the server config from AIWG's
 * McpServerRegistry, spawns the stdio transport, and returns a
 * connected client.
 *
 * Implemented as a lazy import so tests that inject a stub never load
 * the SDK or touch the registry.
 */
export const createDefaultMcpClient: McpClientFactory = async (serverName) => {
  const { McpServerRegistry } = await import('../../mcp/registry.js');
  const registry = new McpServerRegistry();
  const server = await registry.get(serverName);
  if (!server) {
    throw new Error(
      `storage(fortemi): MCP server "${serverName}" is not registered. ` +
        `Add it via "aiwg mcp add ${serverName} --command <cmd>" before using the fortemi backend.`
    );
  }
  if (server.type !== 'stdio') {
    throw new Error(
      `storage(fortemi): only stdio MCP servers are supported (got "${server.type}" for "${serverName}")`
    );
  }

  // Lazy import the SDK so tests that inject a stub don't pay the cost
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

  const transport = new StdioClientTransport({
    command: server.command ?? '',
    args: server.args ?? [],
    env: server.env as Record<string, string> | undefined,
  });
  const client = new Client(
    { name: 'aiwg-storage-fortemi-adapter', version: '1.0.0' },
    { capabilities: {} }
  );
  await client.connect(transport);

  return {
    async callTool(name, args) {
      return client.callTool({ name, arguments: args });
    },
    async close() {
      await client.close();
    },
  };
};
