/**
 * Index-graph registry status + drift surface (#1624).
 *
 * The durable index-graph registry already exists — built-in graphs, module-
 * declared graphs (framework/addon `manifest.json` → `index.graphs`), and
 * operator graphs (`.aiwg/aiwg.config` → `index.graphs`) all compose into
 * `GRAPH_CONFIGS`. But there was no reliable way to answer "which durable
 * indices exist, are they built, are they fresh, and is anything drifting?"
 * `aiwg index stats` is per-graph; nothing enumerated the whole registry.
 *
 * This module is that surface. `collectIndexStatus` is a pure-ish reader (no
 * mutation beyond the unavoidable `loadUserGraphConfigs` registry population)
 * that both `aiwg index status` and the `aiwg doctor` durable-index check
 * consume. `showIndexStatus` renders it (human table or JSON).
 *
 * @implements #1624
 * @source @src/cli/handlers/subcommands.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  GRAPH_CONFIGS,
  BUILTIN_GRAPH_CONFIGS,
  getGraphIndexDir,
  getProjectIndexRoot,
  loadGlobalGraphConfigs,
  loadUserGraphConfigs,
  type GraphConfigWarning,
  type GraphType,
  type ArtifactIndex,
} from './types.js';
import {
  getFortemiCoreSyncStatus,
  type FortemiCoreSyncStatus,
} from './fortemi-core-sync.js';

export interface GraphStatus {
  /** Graph name (e.g. `framework`, `project`, or a user/module graph). */
  name: string;
  /** `builtin` (protected), `registered` (module- or operator-declared). */
  origin: 'builtin' | 'registered';
  /** Whether the graph index is shared across projects (XDG) vs project-local. */
  shared: boolean;
  /** Included in a default `aiwg index build` (no flag). */
  defaultBuild: boolean;
  /** Absolute path of the graph's index directory. */
  location: string;
  /** Whether a built `metadata.json` exists at `location`. */
  built: boolean;
  /** ISO timestamp the index was last built, or null when unbuilt/unreadable. */
  builtAt: string | null;
  /** Hours since `builtAt` (rounded), or null. */
  ageHours: number | null;
  /** Indexed entry count, or null when unbuilt. */
  entries: number | null;
  /**
   * Registered with `defaultBuild` but no built index on disk — the
   * actionable "durable index is missing / never built" drift signal.
   */
  missing: boolean;
}

export interface IndexStatusReport {
  graphs: GraphStatus[];
  /** Index dirs found under `.aiwg/.index/` that match no registered graph. */
  orphanIndexDirs: string[];
  /** Non-silent graph-config load problems (#1624). */
  warnings: GraphConfigWarning[];
  /** Opt-in Fortemi Core static-index cache status. Absent projects are quiet. */
  fortemiCore: FortemiCoreSyncStatus;
  /** Convenience roll-up for the doctor gate. */
  summary: {
    total: number;
    built: number;
    missing: number;
    orphans: number;
    warnings: number;
  };
}

function readBuiltMeta(indexDir: string): {
  builtAt: string | null;
  entries: number | null;
} {
  try {
    const metaPath = path.join(indexDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) return { builtAt: null, entries: null };
    const idx = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as ArtifactIndex;
    return {
      builtAt: typeof idx.builtAt === 'string' ? idx.builtAt : null,
      entries: idx.entries ? Object.keys(idx.entries).length : 0,
    };
  } catch {
    return { builtAt: null, entries: null };
  }
}

/**
 * Enumerate every registered graph (built-in + module + operator) with its
 * build state, freshness, and drift, plus on-disk orphan index dirs and any
 * non-silent config-load warnings.
 *
 * @param nowMs - injectable clock for deterministic tests (defaults to Date.now()).
 */
export function collectIndexStatus(
  cwd: string,
  nowMs?: number,
): IndexStatusReport {
  // Populate the registry from module + operator config, collecting warnings
  // instead of letting malformed defs vanish (#1624).
  const warnings: GraphConfigWarning[] = [];
  loadUserGraphConfigs(cwd, warnings);
  loadGlobalGraphConfigs(warnings);

  const now = nowMs ?? Date.now();
  const graphs: GraphStatus[] = [];

  for (const [name, config] of Object.entries(GRAPH_CONFIGS)) {
    const location = getGraphIndexDir(cwd, name as GraphType);
    const { builtAt, entries } = readBuiltMeta(location);
    const built = builtAt !== null || entries !== null;
    let ageHours: number | null = null;
    if (builtAt) {
      const t = Date.parse(builtAt);
      if (!Number.isNaN(t)) ageHours = Math.round((now - t) / 3_600_000);
    }
    graphs.push({
      name,
      origin: name in BUILTIN_GRAPH_CONFIGS ? 'builtin' : 'registered',
      shared: config.shared,
      defaultBuild: config.defaultBuild,
      location,
      built,
      builtAt,
      ageHours,
      entries,
      // A graph that opts into default builds but has no index on disk is a
      // missing durable index the operator probably expects to exist.
      missing: config.defaultBuild && !built,
    });
  }

  // On-disk drift: project-local index dirs (`.aiwg/.index/<name>`) that no
  // registered graph claims. The framework graph lives in XDG, not here, so
  // this scan is project-local by construction.
  const reservedIndexDirs = new Set(['fortemi-core']);
  const registeredNames = new Set(Object.keys(GRAPH_CONFIGS));
  const orphanIndexDirs: string[] = [];
  const projectIndexRoot = getProjectIndexRoot(cwd);
  try {
    for (const d of fs.readdirSync(projectIndexRoot, { withFileTypes: true })) {
      if (
        d.isDirectory() &&
        !registeredNames.has(d.name) &&
        !reservedIndexDirs.has(d.name)
      ) {
        orphanIndexDirs.push(path.join(projectIndexRoot, d.name));
      }
    }
  } catch {
    // No project index root yet — not drift.
  }

  const missing = graphs.filter((g) => g.missing).length;
  const built = graphs.filter((g) => g.built).length;

  return {
    graphs,
    orphanIndexDirs,
    warnings,
    fortemiCore: getFortemiCoreSyncStatus(cwd),
    summary: {
      total: graphs.length,
      built,
      missing,
      orphans: orphanIndexDirs.length,
      warnings: warnings.length,
    },
  };
}

/** Render `aiwg index status` (human table or JSON). */
export async function showIndexStatus(
  cwd: string,
  opts: { json?: boolean } = {},
): Promise<void> {
  const report = collectIndexStatus(cwd);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Index-graph registry status');
  console.log('');
  const rows = report.graphs
    .slice()
    .sort((a, b) =>
      a.origin === b.origin
        ? a.name.localeCompare(b.name)
        : a.origin === 'builtin'
          ? -1
          : 1,
    );
  // Column header.
  console.log(
    '  ' +
      'GRAPH'.padEnd(22) +
      'ORIGIN'.padEnd(12) +
      'STATE'.padEnd(10) +
      'ENTRIES'.padEnd(9) +
      'AGE'.padEnd(10) +
      'LOCATION',
  );
  for (const g of rows) {
    const state = g.built ? 'built' : g.missing ? 'MISSING' : 'unbuilt';
    const age =
      g.ageHours === null
        ? '—'
        : g.ageHours < 48
          ? `${g.ageHours}h`
          : `${Math.round(g.ageHours / 24)}d`;
    console.log(
      '  ' +
        g.name.padEnd(22) +
        g.origin.padEnd(12) +
        state.padEnd(10) +
        String(g.entries ?? '—').padEnd(9) +
        age.padEnd(10) +
        shortenPath(g.location, cwd),
    );
  }

  if (report.orphanIndexDirs.length > 0) {
    console.log('');
    console.log(
      `⚠ Drift — ${report.orphanIndexDirs.length} on-disk index dir(s) match no registered graph:`,
    );
    for (const d of report.orphanIndexDirs)
      console.log(`    ${shortenPath(d, cwd)}`);
    console.log(
      '    (remove the dir, or register the graph under index.graphs in .aiwg/aiwg.config)',
    );
  }

  if (report.warnings.length > 0) {
    console.log('');
    console.log(
      `⚠ ${report.warnings.length} graph-config warning(s) — these were previously dropped silently (#1624):`,
    );
    for (const w of report.warnings)
      console.log(`    [${w.source}] ${w.graph}: ${w.reason}`);
  }

  if (report.fortemiCore.optedIn) {
    console.log('');
    const state = report.fortemiCore.built
      ? report.fortemiCore.stale
        ? 'STALE'
        : 'built'
      : 'MISSING';
    console.log(
      `Fortemi Core static index: ${state} (${report.fortemiCore.itemCount ?? 0} item(s)) → ${shortenPath(report.fortemiCore.location, cwd)}`,
    );
    if (report.fortemiCore.reason)
      console.log(`    ${report.fortemiCore.reason}`);
  }

  const { missing } = report.summary;
  if (missing > 0) {
    console.log('');
    console.log(
      `⚠ ${missing} registered durable index(es) are not built. Run \`aiwg index build --all\`.`,
    );
  }

  console.log('');
  console.log(
    `${report.summary.total} graph(s): ${report.summary.built} built, ${missing} missing, ` +
      `${report.summary.orphans} orphan(s), ${report.summary.warnings} warning(s).`,
  );
}

function shortenPath(p: string, cwd: string): string {
  if (p.startsWith(cwd + path.sep)) return '.' + p.slice(cwd.length);
  const home = process.env.HOME;
  if (home && p.startsWith(home + path.sep)) return '~' + p.slice(home.length);
  return p;
}
