/**
 * Artifact Index Types
 *
 * Shared TypeScript types for the artifact indexing system.
 * Used by index-builder, query-engine, dep-graph, and stats modules.
 *
 * @implements #420
 * @source @src/artifacts/cli.ts
 * @tests @test/unit/artifacts/index-builder.test.ts
 */

import fs from 'fs';
import { load as loadYaml } from 'js-yaml';

/**
 * A single indexed artifact entry
 */
export interface MetadataEntry {
  /** Relative path from project root */
  path: string;

  /** Artifact type (use-case, adr, test-plan, nfr, threat-model, etc.) */
  type: string;

  /** SDLC phase (requirements, architecture, testing, security, deployment, etc.) */
  phase: string;

  /** Title from frontmatter or first heading */
  title: string;

  /**
   * Canonical short name (#1233). For skills this is the SKILL.md
   * directory basename (e.g. `aiwg-doctor`); for agents/commands/rules
   * the filename without extension; falls back to frontmatter `name`
   * when present. Used by the scorer to floor exact-name queries to 1.0
   * so that hyphenated kernel-skill names remain searchable even when
   * the rendered title strips the hyphen.
   */
  name?: string;

  /** Tags from frontmatter */
  tags: string[];

  /** ISO timestamp — file creation or frontmatter date */
  created: string;

  /** ISO timestamp — file modification */
  updated: string;

  /** Truncated SHA-256 hex (16 chars) for change detection */
  checksum: string;

  /** Brief content summary (max 500 chars) */
  summary: string;

  /** Outbound @-mention references (paths this artifact depends on) */
  dependencies: string[];

  /** Computed: paths that reference this artifact */
  dependents: string[];

  /**
   * Trigger phrases extracted from the `## Triggers` section of skill / agent
   * descriptors. One entry per phrase, lowercased. Used by capability search
   * (#1214) to boost matches that hit a skill's declared activation phrase.
   */
  triggers?: string[];

  /**
   * Capability summary — what this artifact does, in one sentence.
   * Drawn from frontmatter `description` for skills/agents/commands/rules.
   * Used by capability search (#1214) for substring scoring above the
   * generic body summary.
   */
  capability?: string;

  /**
   * `kernel: true` from frontmatter. Marks always-loaded skills the
   * deploy pipeline routes to the platform-native skills directory
   * (#1212). Surfaced in the index for `aiwg index discover` so the
   * agent can prefer non-kernel skills when the kernel set already
   * covers a request.
   */
  kernel?: boolean;

  /**
   * Script entrypoint declaration for executable skills (#1227).
   *
   * When present, the skill has a backing script the CLI can invoke via
   * `aiwg run skill <name>`. Surfaced in `aiwg discover --json` as
   * `executable: true` + a `run_hint` so agents know to use the run
   * command instead of trying to execute the SKILL.md instructions
   * themselves.
   */
  script?: SkillScriptSpec;
}

/**
 * Skill script entrypoint declaration (#1227).
 *
 * Parsed from the optional `script:` block in a SKILL.md frontmatter. The
 * `entrypoint` is resolved relative to the skill's source directory; the
 * runtime executes from the calling project's root by default so relative
 * paths the script reads/writes resolve into the user's project, not the
 * AIWG install.
 */
export interface SkillScriptSpec {
  /** Path to the script file, relative to the skill's source directory */
  entrypoint: string;
  /** Runtime to dispatch with: node | python | python3 | bash | sh | pwsh | ruby | auto */
  runtime: string;
  /**
   * Working directory policy. Default is `project-root`: the script runs
   * from the project the CLI was invoked from, so relative paths resolve
   * into the caller's tree. `skill-dir` is rare (only for skills that
   * bundle assets they read via relative paths); `aiwg-root` is an escape
   * hatch and almost never correct.
   */
  cwd?: 'project-root' | 'skill-dir' | 'aiwg-root';
  /** Optional human-readable hint shown by `aiwg discover` and `aiwg show` */
  argsHint?: string;
}

/**
 * The master artifact index stored at .aiwg/.index/metadata.json
 */
export interface ArtifactIndex {
  /** Index format version */
  version: string;

  /** ISO timestamp of last build */
  builtAt: string;

  /** Build duration in milliseconds */
  buildTimeMs: number;

  /** All indexed entries keyed by path */
  entries: Record<string, MetadataEntry>;
}

/**
 * Tag reverse index stored at .aiwg/.index/tags.json
 */
export interface TagIndex {
  /** Tag name -> array of artifact paths */
  [tag: string]: string[];
}

/**
 * A typed edge in the dependency graph
 *
 * @implements #724
 */
export interface TypedEdge {
  /** Target artifact path */
  path: string;
  /** Relationship type (e.g., "depends-on", "cites", "cited-by", "summarizes") */
  type: string;
}

/**
 * Normalize a raw edge value to TypedEdge.
 * Handles backward compatibility: plain strings become { path, type: "depends-on" }.
 */
export function normalizeEdge(edge: string | TypedEdge): TypedEdge {
  if (typeof edge === 'string') return { path: edge, type: 'depends-on' };
  return edge;
}

/**
 * Normalize an array of raw edges to TypedEdge[].
 */
export function normalizeEdges(edges: (string | TypedEdge)[]): TypedEdge[] {
  return edges.map(normalizeEdge);
}

/**
 * Dependency graph stored at .aiwg/.index/dependencies.json
 *
 * @implements #724
 */
export interface DependencyGraph {
  /** Path -> upstream and downstream relationships */
  [path: string]: {
    /** Artifacts this one depends on (typed edges) */
    upstream: TypedEdge[];
    /** Artifacts that depend on this one (typed edges) */
    downstream: TypedEdge[];
  };
}

/**
 * Index statistics stored at .aiwg/.index/stats.json
 */
export interface IndexStats {
  /** Index format version */
  version: string;

  /** ISO timestamp of last build */
  builtAt: string;

  /** Build duration in milliseconds */
  buildTimeMs: number;

  /** Total artifact count */
  totalArtifacts: number;

  /** Counts by SDLC phase */
  byPhase: Record<string, number>;

  /** Counts by artifact type */
  byType: Record<string, number>;

  /** Tag name -> count */
  tagDistribution: Record<string, number>;

  /** Dependency graph metrics */
  graphMetrics: {
    totalEdges: number;
    orphanedArtifacts: number;
    mostReferenced: { path: string; count: number } | null;
  };
}

/**
 * Result from a query operation
 */
export interface QueryResult {
  /** The matching entry */
  entry: MetadataEntry;

  /** Relevance score (0-1) */
  score: number;
}

/**
 * Query parameters for artifact search
 */
export interface QueryParams {
  /** Keyword search term */
  text?: string;

  /** Filter by path glob pattern */
  path?: string;

  /** Filter by artifact type */
  type?: string;

  /** Filter by SDLC phase */
  phase?: string;

  /** Filter by tags (AND logic) */
  tags?: string[];

  /** Filter by modification date */
  updatedAfter?: string;

  /** Maximum results */
  limit?: number;
}

/**
 * Phase name to directory mapping
 */
export const PHASE_DIRECTORIES: Record<string, string> = {
  requirements: '.aiwg/requirements',
  architecture: '.aiwg/architecture',
  testing: '.aiwg/testing',
  security: '.aiwg/security',
  deployment: '.aiwg/deployment',
  risks: '.aiwg/risks',
  planning: '.aiwg/planning',
  intake: '.aiwg/intake',
  reports: '.aiwg/reports',
};

/**
 * Default index output directory
 */
export const INDEX_DIR = '.aiwg/.index';

/**
 * Current index format version
 */
export const INDEX_VERSION = '1.0.0';

/**
 * Built-in graph type identifiers
 *
 * @implements #421 #426
 */
export type BuiltinGraphType = 'framework' | 'project' | 'codebase';

/**
 * Any graph identifier — built-in or user-defined via .aiwg/config.yaml
 *
 * @implements #426
 */
export type GraphType = string;

/**
 * Edge extraction configuration for a graph
 *
 * @implements #722
 */
export interface EdgeExtractionConfig {
  /** Parser to use for edge extraction */
  parser: 'citation-sidecar';

  /** Edge definitions to extract */
  edges: Array<{
    /** Edge type label (e.g., "cites", "cited-by") */
    type: string;
    /** Source field path (e.g., "frontmatter.ref") */
    source: string;
    /** Target field path (e.g., "outgoing-table.inducted-ref") */
    target: string;
    /** Skip rows where the target column is empty or dash */
    skipEmpty?: boolean;
  }>;
}

/**
 * Metadata supplement configuration — merge fields from sidecar files
 *
 * @implements #723
 */
export interface MetadataSupplementConfig {
  /** Directory to scan for sidecar files */
  scanDir: string;
  /** Frontmatter field to match against (e.g., "frontmatter.ref") */
  matchOn: string;
  /** Captured group name from filenamePattern to match against */
  nodeKey: string;
  /** Fields to merge from the sidecar frontmatter into the node */
  mergeFields: string[];
}

/**
 * Graph configuration — defines what each graph indexes
 */
export interface GraphConfig {
  /** Graph type identifier */
  type: string;

  /** Directories to scan (relative to project/framework root) */
  scanDirs: string[];

  /** File extensions to index */
  extensions: string[];

  /** Whether this graph is shared across projects */
  shared: boolean;

  /** Whether to include in default `aiwg index build` (no --graph flag) */
  defaultBuild: boolean;

  /** Optional edge extraction configuration */
  edgeExtraction?: EdgeExtractionConfig;

  /**
   * Node creation strategy.
   * - 'default': read file content, parse frontmatter (standard behavior)
   * - 'filename-metadata': derive metadata from filename regex, skip content reading
   *
   * @implements #723
   */
  nodeStrategy?: 'default' | 'filename-metadata';

  /**
   * Named-capture regex for extracting metadata from filenames.
   * Only used when nodeStrategy is 'filename-metadata'.
   * Example: "REF-(?P<ref>\\d{3})-(?P<author>[^-]+)-(?P<year>\\d{4})-(?P<slug>.+)\\.pdf"
   *
   * @implements #723
   */
  filenamePattern?: string;

  /**
   * Optional sidecar files that can enrich node metadata.
   * Merges frontmatter fields from matching sidecar files into the node.
   *
   * @implements #723
   */
  metadataSupplements?: MetadataSupplementConfig[];

  /**
   * Graph storage backend for this graph.
   * - 'json' (default): zero-dep adjacency list
   * - 'graphology': rich traversal, community detection (requires npm install graphology)
   * - 'sqlite': persistent on-disk, SQL set operations (requires npm install better-sqlite3)
   *
   * @implements #727
   */
  graphBackend?: 'json' | 'graphology' | 'sqlite';

  /**
   * Optional embedding index configuration for semantic similarity queries.
   * Requires: npm install @xenova/transformers hnswlib-node
   *
   * @implements #730
   */
  embedding?: {
    /** Enable embedding index for this graph */
    enabled: boolean;
    /** Model to use (default: Xenova/all-MiniLM-L6-v2) */
    model?: string;
    /** Number of results for semantic queries (default: 10) */
    topK?: number;
    /** When to rebuild: 'content-change' | 'always' | 'never' */
    rebuildOn?: 'content-change' | 'always' | 'never';
  };
}

/**
 * Built-in graph definitions
 */
export const BUILTIN_GRAPH_CONFIGS: Record<BuiltinGraphType, GraphConfig> = {
  framework: {
    type: 'framework',
    // Includes `agentic/code/extensions` and `agentic/code/behaviors`
    // (#1221) so extension bundles (sys, net, it, sec, stream, dev) and
    // top-level behaviors (concierge, security-sentinel, ...) appear in
    // `aiwg discover` alongside frameworks and addons. `inferType()` in
    // index-builder.ts uses nearest-type-dir ancestor matching to handle
    // every nested layout (slug vs flat, frameworks/<f>/extensions/<sub>,
    // research-complete/elaboration/{agents,commands}, etc.).
    scanDirs: [
      'agentic/code/frameworks',
      'agentic/code/addons',
      'agentic/code/extensions',
      'agentic/code/agents',
      'agentic/code/behaviors',
      'docs',
    ],
    extensions: ['.md', '.yaml', '.json'],
    shared: true,
    // Not built by `aiwg index build` (no flag) — that would write to
    // the shared XDG location from any project. Freshness is guaranteed
    // by the explicit post-deploy rebuild in `useHandler` (#1212/#1214)
    // and by `aiwg index build --graph framework` for manual rebuilds.
    defaultBuild: false,
  },
  project: {
    type: 'project',
    scanDirs: ['.aiwg'],
    extensions: ['.md', '.yaml', '.json'],
    shared: false,
    defaultBuild: true,
  },
  codebase: {
    type: 'codebase',
    scanDirs: ['src', 'test', 'tools'],
    extensions: ['.ts', '.mts', '.js', '.mjs', '.json', '.yaml'],
    shared: false,
    defaultBuild: true,
  },
};

/**
 * Mutable graph configs — starts with built-ins, extended by user config
 *
 * @implements #426
 */
export const GRAPH_CONFIGS: Record<string, GraphConfig> = { ...BUILTIN_GRAPH_CONFIGS };

/**
 * Normalize metadataSupplements entries.
 *
 * Accepts the shorthand `match: "frontmatter.<field>"` and expands it to
 * `matchOn` + `nodeKey`. This lets users write the compact form in config:
 *
 *   match: frontmatter.ref
 *
 * instead of the explicit two-field form:
 *
 *   matchOn: frontmatter.ref
 *   nodeKey: ref
 *
 * @implements #738
 */
function normalizeSupplements(raw: Record<string, unknown>[]): MetadataSupplementConfig[] {
  return raw.map((entry) => {
    let matchOn = entry.matchOn as string | undefined;
    let nodeKey = entry.nodeKey as string | undefined;

    // Accept "match" shorthand: derive matchOn and nodeKey from it
    if (!matchOn && typeof entry.match === 'string') {
      matchOn = entry.match;
    }

    // Derive nodeKey from matchOn if not explicitly provided
    // e.g. "frontmatter.ref" -> nodeKey "ref"
    if (!nodeKey && matchOn) {
      nodeKey = matchOn.replace(/^frontmatter\./, '');
    }

    return {
      scanDir: entry.scanDir as string,
      matchOn: matchOn ?? '',
      nodeKey: nodeKey ?? '',
      mergeFields: Array.isArray(entry.mergeFields) ? entry.mergeFields as string[] : [],
    };
  });
}

/**
 * Parse a raw graph definition object into a GraphConfig.
 *
 * Shared between loadUserGraphConfigs and loadModuleGraphConfigs.
 */
function parseGraphDef(name: string, graphDef: Record<string, unknown>): GraphConfig | null {
  if (!Array.isArray(graphDef.scanDirs)) return null;

  return {
    type: name,
    scanDirs: graphDef.scanDirs as string[],
    extensions: Array.isArray(graphDef.extensions) ? graphDef.extensions as string[] : ['.md', '.yaml', '.json'],
    shared: graphDef.shared === true,
    defaultBuild: graphDef.defaultBuild !== false,
    edgeExtraction: graphDef.edgeExtraction as EdgeExtractionConfig | undefined,
    nodeStrategy: graphDef.nodeStrategy as GraphConfig['nodeStrategy'],
    filenamePattern: typeof graphDef.filenamePattern === 'string' ? graphDef.filenamePattern : undefined,
    metadataSupplements: Array.isArray(graphDef.metadataSupplements)
      ? normalizeSupplements(graphDef.metadataSupplements as Record<string, unknown>[])
      : undefined,
    graphBackend: typeof graphDef.graphBackend === 'string'
      ? graphDef.graphBackend as GraphConfig['graphBackend']
      : undefined,
  };
}

/**
 * Load graph configs declared in framework/addon manifest.json files.
 *
 * Reads `.aiwg/frameworks/registry.json` to find installed modules,
 * then loads each module's manifest and merges `index.graphs` declarations
 * into GRAPH_CONFIGS. Module-declared graphs cannot override built-in names.
 *
 * This runs before operator config so that .aiwg/config.yaml can override
 * module-declared graphs.
 *
 * @param cwd - Project root directory
 * @returns Names of module-declared graphs that were loaded
 *
 * @implements #726
 */
export function loadModuleGraphConfigs(cwd: string): string[] {
  const registryPath = `${cwd}/.aiwg/frameworks/registry.json`;
  const loaded: string[] = [];

  try {
    if (!fs.existsSync(registryPath)) return loaded;

    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent) as {
      frameworks?: Array<{ id: string }>;
    };

    if (!Array.isArray(registry.frameworks)) return loaded;

    // Search paths for manifest.json (framework source locations)
    const searchRoots = [
      `${cwd}/agentic/code/frameworks`,
      `${cwd}/agentic/code/addons`,
    ];

    for (const entry of registry.frameworks) {
      const id = entry.id;
      let manifestData: Record<string, unknown> | null = null;

      // Try each search root to find the manifest
      for (const root of searchRoots) {
        const manifestPath = `${root}/${id}/manifest.json`;
        if (fs.existsSync(manifestPath)) {
          try {
            manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          } catch {
            // Malformed manifest — skip
          }
          break;
        }
      }

      if (!manifestData) continue;

      // Extract index.graphs from manifest
      const indexSection = manifestData.index as Record<string, unknown> | undefined;
      if (!indexSection || typeof indexSection !== 'object') continue;

      const graphs = indexSection.graphs as Record<string, unknown> | undefined;
      if (!graphs || typeof graphs !== 'object') continue;

      for (const [name, def] of Object.entries(graphs)) {
        if (name in BUILTIN_GRAPH_CONFIGS) continue;
        // Module graphs don't override already-loaded graphs (first module wins)
        if (name in GRAPH_CONFIGS && !(name in BUILTIN_GRAPH_CONFIGS)) continue;

        const config = parseGraphDef(name, def as Record<string, unknown>);
        if (config) {
          GRAPH_CONFIGS[name] = config;
          loaded.push(name);
        }
      }
    }
  } catch {
    // Module config loading is best-effort
  }

  return loaded;
}

/**
 * Load user-defined graph configs from .aiwg/config.yaml
 *
 * Also loads module-declared graphs from installed framework manifests.
 * Module graphs are loaded first; operator config overrides them.
 * Neither can override built-in graph names.
 *
 * @param cwd - Project root directory
 * @returns Names of user-defined graphs that were loaded (includes module graphs)
 *
 * @implements #426 #726
 */
export function loadUserGraphConfigs(cwd: string): string[] {
  // Load module-declared graphs first (frameworks/addons)
  const moduleLoaded = loadModuleGraphConfigs(cwd);

  const configPath = `${cwd}/.aiwg/config.yaml`;
  const loaded: string[] = [...moduleLoaded];

  try {
    if (!fs.existsSync(configPath)) return loaded;

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = loadYaml(content) as Record<string, unknown> | null;
    if (!config || typeof config !== 'object') return loaded;

    const indexConfig = config.index as Record<string, unknown> | undefined;
    if (!indexConfig || typeof indexConfig !== 'object') return loaded;

    const graphs = indexConfig.graphs as Record<string, unknown> | undefined;
    if (!graphs || typeof graphs !== 'object') return loaded;

    for (const [name, def] of Object.entries(graphs)) {
      if (name in BUILTIN_GRAPH_CONFIGS) {
        // Cannot override built-in graph names
        continue;
      }

      const graphConfig = parseGraphDef(name, def as Record<string, unknown>);
      if (!graphConfig) continue;

      // Operator config overrides module-declared graphs (emit warning if overriding)
      if (moduleLoaded.includes(name)) {
        // Operator override of a module-declared graph
        GRAPH_CONFIGS[name] = graphConfig;
        // Already in loaded list from module phase
      } else {
        GRAPH_CONFIGS[name] = graphConfig;
        loaded.push(name);
      }
    }
  } catch {
    // Config loading is best-effort
  }

  return loaded;
}

/**
 * Get the index output directory for a given graph type
 *
 * @param cwd - Project root
 * @param graphType - Graph type
 * @returns Absolute path to the graph's index directory
 */
export function getGraphIndexDir(cwd: string, graphType: GraphType): string {
  if (graphType === 'framework') {
    // Shared across projects — XDG data directory
    const xdgData = process.env.XDG_DATA_HOME ?? `${process.env.HOME}/.local/share`;
    return `${xdgData}/aiwg/index/framework`;
  }
  return `${cwd}/.aiwg/.index/${graphType}`;
}

/**
 * Framework graph version tracking
 */
export interface FrameworkGraphVersion {
  /** AIWG version when graph was built */
  aiwg_version: string;

  /** Frameworks included in the graph */
  frameworks_installed: string[];

  /** Build timestamp */
  built_at: string;
}
