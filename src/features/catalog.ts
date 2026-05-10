/**
 * Optional Features Catalog
 *
 * AIWG ships several runtime-optional features whose dependencies live
 * in `optionalDependencies`. This catalog is the canonical mapping
 * between **feature names** (operator vocabulary) and the **npm
 * packages** that enable them.
 *
 * Consumed by:
 *   - `aiwg features` command (status / info / install / remove)
 *   - `aiwg doctor` (Optional Features section)
 *   - Runtime error messages (when a dynamic import fails, point at
 *     `aiwg features install <name>`)
 *
 * @implements #1219
 */

export interface FeatureDefinition {
  /** Operator-facing name — the slug used in `aiwg features <name>` */
  name: string;
  /** One-line description */
  description: string;
  /** npm packages this feature requires (all must resolve for `available=true`) */
  packages: string[];
  /** Concrete capabilities this feature unlocks */
  enables: string[];
  /** Install cost / size estimate for operator awareness */
  cost: string;
}

export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    name: 'embeddings',
    description: 'Vector embeddings for `aiwg discover` (semantic search beyond the keyword scorer)',
    packages: ['@xenova/transformers', 'hnswlib-node'],
    enables: [
      'higher hit@K on natural-language queries that don\'t match trigger phrases',
      'optional dense-rerank layer when sparse top-1 is ambiguous',
    ],
    cost: '~150 MB — transformers runtime + libvips native binary, one-time download',
  },
  {
    name: 'sqlite',
    description: 'SQLite storage backend for memory / activity-log / kb subsystems',
    packages: ['better-sqlite3'],
    enables: [
      'storage.config: backend=sqlite for any subsystem',
      'transactional reads/writes against `.aiwg/storage/`',
    ],
    cost: '~5 MB — native compile via node-gyp',
  },
  {
    name: 'pty',
    description: 'PTY bridge for daemon — pass-through interactive TUIs (Claude Code, Codex, etc.)',
    packages: ['node-pty'],
    enables: [
      'aiwg daemon pty start / list / stop',
      'daemon web UI for interactive Claude/Codex/etc sessions over WebSocket',
    ],
    cost: '~2 MB — native compile via node-gyp',
  },
  {
    name: 'webserver',
    description: 'HTTP/WebSocket server for the daemon web UI and ralph-external bridge',
    packages: ['hono', '@hono/node-server', 'ws'],
    enables: [
      'aiwg daemon serve',
      'browser-based daemon UI',
      'ralph-external WebSocket dispatch',
    ],
    cost: '~3 MB — pure JS, no native deps',
  },
];

/** Quick lookup by feature name. */
export function getFeature(name: string): FeatureDefinition | null {
  return FEATURE_CATALOG.find(f => f.name === name) ?? null;
}

/** All feature names — useful for `--all` flags and CLI completion. */
export function listFeatureNames(): string[] {
  return FEATURE_CATALOG.map(f => f.name);
}

/** Reverse lookup: given a package name, which feature does it belong to? */
export function featureForPackage(pkg: string): FeatureDefinition | null {
  return FEATURE_CATALOG.find(f => f.packages.includes(pkg)) ?? null;
}
