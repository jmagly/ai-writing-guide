/**
 * Artifact Index CLI Commands
 *
 * Provides CLI interface for artifact index operations:
 * - build: Build/rebuild the artifact index
 * - query: Search artifacts by keyword, type, phase, tags
 * - deps:  Show artifact dependency graph
 * - stats: Show index statistics
 *
 * Supports multi-graph architecture via --graph flag:
 * - framework: AIWG framework source (shared, built during `aiwg use`)
 * - project: SDLC artifacts in .aiwg/ (per-project)
 * - codebase: Source code, tests, configs (per-project)
 *
 * @implements #420 #421
 * @source @src/cli/handlers/subcommands.ts
 * @tests @test/unit/artifacts/cli.test.ts
 */

import type { GraphType } from './types.js';
import { GRAPH_CONFIGS, loadUserGraphConfigs } from './types.js';
import { SUPPORTED_VIEWS } from './corpus-views/renderers.js';

/** Parse --graph flag from args, returns undefined for "all graphs" */
function parseGraphFlag(args: string[]): GraphType | undefined {
  const idx = args.indexOf('--graph');
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  const val = args[idx + 1];
  // Load user-defined graphs so validation is complete
  loadUserGraphConfigs(process.cwd());
  if (val in GRAPH_CONFIGS) return val;
  // Corpus markdown views (#1490) are valid --graph targets for `index build`.
  if ((SUPPORTED_VIEWS as readonly string[]).includes(val)) return val;
  const validNames = [...Object.keys(GRAPH_CONFIGS), ...SUPPORTED_VIEWS].join(', ');
  console.error(`Error: Invalid graph type '${val}'. Valid: ${validNames}`);
  process.exit(1);
}

/**
 * Main index command router
 */
export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subcommandArgs = args.slice(1);

  // #1231 — intercept --help/-h before subcommand dispatch. Print the
  // same usage block as the no-args case, but framed as help (exit 0)
  // rather than as an unknown-subcommand error (exit 1).
  if (subcommand === '--help' || subcommand === '-h') {
    printIndexUsage();
    process.exit(0);
  }

  switch (subcommand) {
    case 'build':
      await handleBuild(subcommandArgs);
      break;

    case 'query':
      await handleQuery(subcommandArgs);
      break;

    case 'discover':
      await handleDiscover(subcommandArgs);
      break;

    case 'show':
      await handleShow(subcommandArgs);
      break;

    case 'deps':
      await handleDeps(subcommandArgs);
      break;

    case 'stats':
      await handleStats(subcommandArgs);
      break;

    case 'neighbors':
      await handleNeighbors(subcommandArgs);
      break;

    case 'set':
      await handleSetQuery(subcommandArgs);
      break;

    case 'watch':
      await handleWatch(subcommandArgs);
      break;

    case 'views': {
      const { main: viewsMain } = await import('./views/cli.js');
      await viewsMain(subcommandArgs);
      break;
    }

    case 'enrich': {
      const { main: enrichMain } = await import('./enrichment/cli.js');
      await enrichMain(subcommandArgs);
      break;
    }

    case 'doctor': {
      const { main: doctorMain } = await import('./audit/cli.js');
      await doctorMain(subcommandArgs);
      break;
    }

    case undefined:
      console.error('Error: Index subcommand required');
      console.log('');
      printIndexUsage();
      process.exit(1);
      break;

    default:
      console.error(`Error: Unknown index subcommand '${subcommand}'`);
      console.log('Available: build, query, discover, deps, stats, neighbors, set, watch');
      process.exit(1);
  }
}

function printIndexUsage(): void {
  console.log('Usage: aiwg index <subcommand> [options]');
  console.log('');
  console.log('Available subcommands:');
  console.log('  build      Build/rebuild the artifact index');
  console.log('  query      Search artifacts by keyword, type, phase, tags');
  console.log('  discover   Capability search across skills/agents/commands/rules (#1214)');
  console.log('  show       Print the full text of a specific skill/agent/command/rule');
  console.log('  deps       Show artifact dependency graph');
  console.log('  stats      Show index statistics');
  console.log('  neighbors  Get neighbors of a node in a graph');
  console.log('  set        Set operations (intersection, union, difference) on neighbor sets');
  console.log('  watch      Start a filesystem watcher for automatic incremental index updates');
  console.log('');
  console.log('Options:');
  console.log('  --graph <name>  Target a specific graph (framework, project, codebase, or user-defined)');
  console.log('  --all           Build all known graphs (including user-defined)');
  console.log('');
  console.log('Examples:');
  console.log('  aiwg index build');
  console.log('  aiwg index build --all');
  console.log('  aiwg index build --graph codebase --force');
  console.log('  aiwg index discover "create intake"');
  console.log('  aiwg index discover "deploy production" --limit 5 --json');
  console.log('  aiwg index discover "audit security" --type skill');
  console.log('  aiwg index show skill intake-wizard');
  console.log('  aiwg index show skill flow-deploy-to-production --json');
  console.log('  aiwg index show agent aiwg-steward');
  console.log('  aiwg index query "authentication" --type use-case');
  console.log('  aiwg index query "security rules" --graph framework --json');
  console.log('  aiwg index deps .aiwg/requirements/UC-001.md');
  console.log('  aiwg index stats --json');
  console.log('  aiwg index stats --graph project');
  console.log('  aiwg index neighbors --graph citation-network --node REF-008 --direction in --edge-type cites');
  console.log('  aiwg index set --graph citation-network --op intersection --node-a REF-008 --node-b REF-016 --direction in');
}

/**
 * Handle 'index watch' command — filesystem watcher daemon for auto-index updates.
 *
 * Modes:
 *   aiwg index watch            — start watcher (foreground)
 *   aiwg index watch --stop     — stop a running watcher
 *   aiwg index watch --status   — check watcher status
 *
 * @implements #795
 */
async function handleWatch(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: aiwg index watch [options]');
    console.log('');
    console.log('Start a filesystem watcher that triggers incremental index rebuilds');
    console.log('when .aiwg/ files change. Uses the checksum manifest (#794) for fast');
    console.log('change detection.');
    console.log('');
    console.log('Options:');
    console.log('  --stop            Stop a running watcher for this project');
    console.log('  --status          Show whether a watcher is running');
    console.log('  --debounce <ms>   Debounce window for batched updates (default: 500)');
    console.log('  --graph <name>    Graph to rebuild (default: project)');
    console.log('  --verbose         Log every detected change');
    console.log('');
    console.log('Examples:');
    console.log('  aiwg index watch');
    console.log('  aiwg index watch --verbose --debounce 1000');
    console.log('  aiwg index watch --stop');
    console.log('  aiwg index watch --status');
    return;
  }

  const cwd = process.cwd();
  const { startWatcher, stopWatcher, getRunningPid } = await import('./watcher.js');

  // --status: check if a watcher is running
  if (args.includes('--status')) {
    const pid = getRunningPid(cwd);
    if (pid) {
      console.log(`Watcher running: PID ${pid}`);
    } else {
      console.log('No watcher running for this project');
    }
    return;
  }

  // --stop: terminate a running watcher
  if (args.includes('--stop')) {
    const stopped = stopWatcher(cwd);
    if (stopped) {
      console.log('Watcher stopped');
    } else {
      console.log('No watcher running for this project');
    }
    return;
  }

  // --debounce <ms>
  let debounceMs = 500;
  const debounceIdx = args.indexOf('--debounce');
  if (debounceIdx !== -1 && debounceIdx + 1 < args.length) {
    const parsed = parseInt(args[debounceIdx + 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      debounceMs = parsed;
    }
  }

  // --graph <name>
  const graph = parseGraphFlag(args);

  const verbose = args.includes('--verbose');

  try {
    startWatcher({
      cwd,
      debounceMs,
      verbose,
      graph,
    });
    // startWatcher registers SIGINT/SIGTERM handlers; block the main thread
    // until one of them fires. setInterval keeps Node alive indefinitely.
    setInterval(() => { /* keep-alive */ }, 1 << 30);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

/**
 * Handle 'index build' command
 */
async function handleBuild(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: aiwg index build [options]');
    console.log('');
    console.log('Options:');
    console.log('  --force          Full rebuild (ignore checksums, re-index everything)');
    console.log('  --verbose        Show detailed progress during indexing');
    console.log('  --all            Build all known graphs (including user-defined)');
    console.log('  --scope <dir>    Limit scan to a specific subdirectory');
    console.log('  --graph <name>   Build a specific graph only (built-in or user-defined)');
    console.log('');
    console.log('Built-in graph names: project, codebase, framework');
    console.log('User-defined graphs: configure under index.graphs in .aiwg/config.yaml');
    console.log('');
    console.log('Default behavior (no --graph): builds all graphs with defaultBuild: true');
    console.log('  Built-in defaults: project (always), codebase (skipped if src/test/tools absent)');
    console.log('');
    console.log('Examples:');
    console.log('  aiwg index build');
    console.log('  aiwg index build --force');
    console.log('  aiwg index build --graph codebase --force');
    console.log('  aiwg index build --graph references            # user-defined graph');
    console.log('  aiwg index build --scope documentation/references');
    console.log('  aiwg index build --all');
    return;
  }

  // Dynamic import to keep the CLI router lightweight
  const { buildIndex } = await import('./index-builder.js');
  const cwd = process.cwd();

  // Validate the index config at build time (#1491) — fail fast on malformed graph defs.
  await validateIndexConfigOrExit(cwd);

  const force = args.includes('--force');
  const verbose = args.includes('--verbose');
  const all = args.includes('--all');
  const graph = parseGraphFlag(args);

  let scope: string | undefined;
  const scopeIdx = args.indexOf('--scope');
  if (scopeIdx !== -1 && scopeIdx + 1 < args.length) {
    scope = args[scopeIdx + 1];
  }

  // Load user-defined graphs
  loadUserGraphConfigs(cwd);

  let jsonBuilt = false;
  if (graph) {
    // --graph X: build the JSON graph if X is one; otherwise X may be a
    // research-corpus markdown view, rendered below.
    if (graph in GRAPH_CONFIGS) {
      await buildIndex(cwd, { force, verbose, scope, graph, explicit: true });
      jsonBuilt = true;
    }
  } else if (all) {
    // Build all known graphs — user asked for everything, but don't hard-error on missing dirs
    for (const name of Object.keys(GRAPH_CONFIGS)) {
      await buildIndex(cwd, { force, verbose, graph: name, explicit: false });
    }
    jsonBuilt = true;
  } else {
    // Default: build graphs with defaultBuild=true; skip gracefully if their dirs don't exist
    for (const [name, config] of Object.entries(GRAPH_CONFIGS)) {
      if (config.defaultBuild) {
        await buildIndex(cwd, { force, verbose, scope: name === Object.keys(GRAPH_CONFIGS)[0] ? scope : undefined, graph: name, explicit: false });
      }
    }
    jsonBuilt = true;
  }

  // Render research-corpus markdown views in the same process (#1490, Full A —
  // the native replacement for the retired corpus-index-build/build.py).
  // No-op when the project has no documentation/references/ corpus.
  const { buildCorpusViews } = await import('./corpus-views/build.js');
  const viewResults = await buildCorpusViews(cwd, { force, only: graph });
  if (viewResults.length > 0) {
    const built = viewResults.filter((r) => r.status === 'built').length;
    const skipped = viewResults.filter((r) => r.status === 'skipped').length;
    const unsupported = viewResults.filter((r) => r.status === 'unsupported').length;
    console.log('');
    console.log(`Markdown views: ${built} built, ${skipped} up to date${unsupported ? `, ${unsupported} unsupported` : ''} → indices/`);
    if (verbose || unsupported) {
      for (const r of viewResults) {
        const extra = r.status === 'unsupported' ? ` (${r.error})` : '';
        console.log(`  ${r.graph}: ${r.status} → ${r.output}${extra}`);
      }
    }
  }

  // A --graph that matched neither a JSON graph nor a rendered view is unknown.
  if (graph && !jsonBuilt && viewResults.length === 0) {
    console.error(`Unknown graph: ${graph}`);
    process.exit(1);
  }
  // Mirror build.py: an unsupported view name in the manifest fails the build.
  if (viewResults.some((r) => r.status === 'unsupported')) {
    process.exit(1);
  }
}

/**
 * Validate the project's index config (#1491) before building. Reads the
 * canonical `.aiwg/aiwg.config` index block (config.yaml fallback) and rejects
 * malformed graph defs at validate time with actionable messages.
 */
async function validateIndexConfigOrExit(cwd: string): Promise<void> {
  const { readIndexConfig, validateIndexConfig } = await import('../config/aiwg-config.js');
  const { index } = await readIndexConfig(cwd);
  if (!index) return;
  const errors = validateIndexConfig(index);
  if (errors.length > 0) {
    console.error('✗ Invalid index config (#1491):');
    for (const e of errors) console.error(`  - ${e}`);
    console.error('Fix the errors above in .aiwg/aiwg.config (or legacy .aiwg/config.yaml) and re-run.');
    process.exit(1);
  }
}

/**
 * Handle 'index query' command
 *
 * Stub — full implementation in #416
 */
async function handleQuery(args: string[]): Promise<void> {
  const { queryIndex } = await import('./query-engine.js');
  const cwd = process.cwd();

  // Parse query text (positional args before any -- flags)
  const textParts: string[] = [];
  const flags: string[] = [];
  let inFlags = false;

  for (const arg of args) {
    if (arg.startsWith('--')) {
      inFlags = true;
    }
    if (inFlags) {
      flags.push(arg);
    } else {
      textParts.push(arg);
    }
  }

  const text = textParts.join(' ') || undefined;
  const json = flags.includes('--json');

  // Parse filter flags
  let type: string | undefined;
  let phase: string | undefined;
  let tags: string | undefined;
  let updatedAfter: string | undefined;
  let limit: number | undefined;
  let pathPattern: string | undefined;

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--type' && i + 1 < flags.length) { type = flags[++i]; }
    else if (flags[i] === '--phase' && i + 1 < flags.length) { phase = flags[++i]; }
    else if (flags[i] === '--tags' && i + 1 < flags.length) { tags = flags[++i]; }
    else if (flags[i] === '--updated-after' && i + 1 < flags.length) { updatedAfter = flags[++i]; }
    else if (flags[i] === '--limit' && i + 1 < flags.length) { limit = parseInt(flags[++i], 10); }
    else if (flags[i] === '--path' && i + 1 < flags.length) { pathPattern = flags[++i]; }
  }

  const graph = parseGraphFlag(flags);

  await queryIndex(cwd, {
    text,
    type,
    phase,
    tags: tags?.split(','),
    updatedAfter,
    limit,
    path: pathPattern,
  }, { json, graph });
}

/**
 * Handle 'index deps' command
 *
 * Stub — full implementation in #417
 */
async function handleDeps(args: string[]): Promise<void> {
  const { showDeps } = await import('./dep-graph.js');
  const cwd = process.cwd();

  // First non-flag arg is the artifact path
  const artifactPath = args.find(a => !a.startsWith('--'));
  if (!artifactPath) {
    console.error('Error: Artifact path required');
    console.log('Usage: aiwg index deps <path> [--direction upstream|downstream|both] [--depth N] [--json]');
    process.exit(1);
  }

  const json = args.includes('--json');

  let direction: 'upstream' | 'downstream' | 'both' = 'both';
  const dirIdx = args.indexOf('--direction');
  if (dirIdx !== -1 && dirIdx + 1 < args.length) {
    const val = args[dirIdx + 1];
    if (val === 'upstream' || val === 'downstream' || val === 'both') {
      direction = val;
    }
  }

  let depth = 3;
  const depthIdx = args.indexOf('--depth');
  if (depthIdx !== -1 && depthIdx + 1 < args.length) {
    depth = parseInt(args[depthIdx + 1], 10);
  }

  let edgeType: string | undefined;
  const etIdx = args.indexOf('--edge-type');
  if (etIdx !== -1 && etIdx + 1 < args.length) {
    edgeType = args[etIdx + 1];
  }

  const graph = parseGraphFlag(args);

  await showDeps(cwd, artifactPath, { direction, depth, json, graph, edgeType });
}

/**
 * Handle 'index stats' command
 *
 * Stub — full implementation in #418
 */
async function handleStats(args: string[]): Promise<void> {
  const { showStats } = await import('./stats.js');
  const cwd = process.cwd();

  const json = args.includes('--json');

  const graph = parseGraphFlag(args);

  await showStats(cwd, { json, graph });
}

/**
 * Handle 'index neighbors' command
 *
 * @implements #725
 */
async function handleNeighbors(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: aiwg index neighbors --graph <name> --node <id> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --graph <name>      Graph to query (required)');
    console.log('  --node <id>         Node path or REF-XXX identifier (required)');
    console.log('  --direction <dir>   in (upstream), out (downstream), or both (default: both)');
    console.log('  --edge-type <type>  Filter by edge type (e.g., "cites", "depends-on")');
    console.log('  --json              Output as JSON');
    console.log('');
    console.log('Examples:');
    console.log('  aiwg index neighbors --graph citation-network --node REF-008 --direction in --edge-type cites');
    console.log('  aiwg index neighbors --graph project --node .aiwg/requirements/UC-001.md --json');
    return;
  }

  const { showNeighbors } = await import('./graph-query.js');
  const cwd = process.cwd();

  const graph = parseGraphFlag(args);
  if (!graph) {
    console.error('Error: --graph is required for neighbors command');
    process.exit(1);
  }

  let node: string | undefined;
  const nodeIdx = args.indexOf('--node');
  if (nodeIdx !== -1 && nodeIdx + 1 < args.length) {
    node = args[nodeIdx + 1];
  }
  if (!node) {
    // Try first positional arg
    node = args.find(a => !a.startsWith('--') && args.indexOf(a) !== args.indexOf('--graph') + 1);
  }
  if (!node) {
    console.error('Error: --node is required for neighbors command');
    process.exit(1);
  }

  let direction: 'in' | 'out' | 'both' = 'both';
  const dirIdx = args.indexOf('--direction');
  if (dirIdx !== -1 && dirIdx + 1 < args.length) {
    const val = args[dirIdx + 1];
    if (val === 'in' || val === 'out' || val === 'both') {
      direction = val;
    }
  }

  let edgeType: string | undefined;
  const etIdx = args.indexOf('--edge-type');
  if (etIdx !== -1 && etIdx + 1 < args.length) {
    edgeType = args[etIdx + 1];
  }

  const json = args.includes('--json');

  await showNeighbors(cwd, { graph, node, direction, edgeType, json });
}

/**
 * Handle 'index set' command
 *
 * @implements #725
 */
async function handleSetQuery(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: aiwg index set --graph <name> --op <operation> --node-a <id> --node-b <id> [options]');
    console.log('');
    console.log('Operations:');
    console.log('  intersection   Nodes in both neighbor sets');
    console.log('  union          Nodes in either neighbor set');
    console.log('  difference     Nodes in A but not in B');
    console.log('');
    console.log('Options:');
    console.log('  --graph <name>      Graph to query (required)');
    console.log('  --op <operation>    Set operation (required)');
    console.log('  --node-a <id>       First node (required)');
    console.log('  --node-b <id>       Second node (required)');
    console.log('  --direction <dir>   in (upstream) or out (downstream) (default: in)');
    console.log('  --edge-type <type>  Filter by edge type');
    console.log('  --json              Output as JSON');
    console.log('');
    console.log('Examples:');
    console.log('  # Papers that cited both REF-008 and REF-016');
    console.log('  aiwg index set --graph citation-network --op intersection --node-a REF-008 --node-b REF-016 --direction in');
    console.log('');
    console.log('  # Papers cited by REF-004 but not cited by REF-001');
    console.log('  aiwg index set --graph citation-network --op difference --node-a REF-004 --node-b REF-001 --direction out');
    return;
  }

  const { executeSetQuery } = await import('./graph-query.js');
  const cwd = process.cwd();

  const graph = parseGraphFlag(args);
  if (!graph) {
    console.error('Error: --graph is required for set command');
    process.exit(1);
  }

  let op: string | undefined;
  const opIdx = args.indexOf('--op');
  if (opIdx !== -1 && opIdx + 1 < args.length) {
    op = args[opIdx + 1];
  }
  if (!op || !['intersection', 'union', 'difference'].includes(op)) {
    console.error('Error: --op is required (intersection, union, difference)');
    process.exit(1);
  }

  let nodeA: string | undefined;
  const naIdx = args.indexOf('--node-a');
  if (naIdx !== -1 && naIdx + 1 < args.length) nodeA = args[naIdx + 1];

  let nodeB: string | undefined;
  const nbIdx = args.indexOf('--node-b');
  if (nbIdx !== -1 && nbIdx + 1 < args.length) nodeB = args[nbIdx + 1];

  if (!nodeA || !nodeB) {
    console.error('Error: --node-a and --node-b are required');
    process.exit(1);
  }

  let direction: 'in' | 'out' = 'in';
  const dirIdx = args.indexOf('--direction');
  if (dirIdx !== -1 && dirIdx + 1 < args.length) {
    const val = args[dirIdx + 1];
    if (val === 'in' || val === 'out') direction = val;
  }

  let edgeType: string | undefined;
  const etIdx = args.indexOf('--edge-type');
  if (etIdx !== -1 && etIdx + 1 < args.length) {
    edgeType = args[etIdx + 1];
  }

  const json = args.includes('--json');

  await executeSetQuery(cwd, {
    graph,
    op: op as 'intersection' | 'union' | 'difference',
    nodeA,
    nodeB,
    direction,
    edgeType,
    json,
  });
}

/**
 * Handle 'index discover' command — capability-search for AIWG skills,
 * agents, commands, and rules.
 *
 * Like `query` but tuned for capability lookups: ranks by trigger
 * phrase + capability description first, falls back to title/tag/path
 * matches. Defaults to AIWG artifact kinds (skill/agent/command/rule),
 * narrowable via `--type`.
 *
 * Returns a token-tight format intended for in-context agent
 * consumption — path, score, type, top trigger, capability snippet.
 *
 * @implements #1214
 */
async function handleDiscover(args: string[]): Promise<void> {
  const { discoverCapability } = await import('./query-engine.js');
  const cwd = process.cwd();

  // Parse positional phrase (everything before flags)
  const textParts: string[] = [];
  const flags: string[] = [];
  let inFlags = false;
  for (const arg of args) {
    if (arg.startsWith('--')) inFlags = true;
    if (inFlags) flags.push(arg);
    else textParts.push(arg);
  }

  const phrase = textParts.join(' ').trim();
  if (!phrase) {
    console.error('Error: aiwg index discover requires a search phrase');
    console.log('');
    console.log('Usage: aiwg index discover "<phrase>" [--type <kinds>] [--limit N] [--json] [--graph <name>]');
    console.log('');
    console.log('Examples:');
    console.log('  aiwg index discover "create intake"');
    console.log('  aiwg index discover "deploy production" --limit 5');
    console.log('  aiwg index discover "audit security" --type skill,agent');
    console.log('  aiwg index discover "intake" --json');
    process.exit(1);
  }

  // Parse flags
  let typeFilter: string[] | undefined;
  // K=5 default — see query-engine.ts comment (#1218 Wave A).
  let limit = 5;
  let json = false;

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--type' && i + 1 < flags.length) {
      typeFilter = flags[++i].split(',').map(s => s.trim()).filter(Boolean);
    } else if (flags[i] === '--limit' && i + 1 < flags.length) {
      const n = parseInt(flags[++i], 10);
      if (!Number.isNaN(n) && n > 0) limit = n;
    } else if (flags[i] === '--json') {
      json = true;
    }
  }

  const graph = parseGraphFlag(flags);

  await discoverCapability(cwd, {
    phrase,
    typeFilter,
    limit,
    json,
    graph,
  });
}

/**
 * Handle 'index show' command — print the full text of a specific
 * artifact by type and name.
 *
 * Shape (#1218):
 *   aiwg show <type> <name> [--json] [--first] [--graph <name>]
 *
 * Type is positional (not a flag) so the verb reads as
 * "show <kind> <name>". `<type>` is one of: skill, agent, command, rule.
 *
 * Companion to `discover`: where discover ranks candidates, show fetches
 * the artifact body so consumers don't need to navigate the filesystem.
 */
async function handleShow(args: string[]): Promise<void> {
  const { showArtifact } = await import('./query-engine.js');
  const cwd = process.cwd();

  const positional: string[] = [];
  const flags: string[] = [];
  let inFlags = false;
  for (const arg of args) {
    if (arg.startsWith('--')) inFlags = true;
    if (inFlags) flags.push(arg);
    else positional.push(arg);
  }

  const ALLOWED_TYPES = ['skill', 'agent', 'command', 'rule'];
  const HELP_TEXT = [
    '',
    'Usage: aiwg show <type> <name> [--json] [--first] [--graph <name>]',
    '       aiwg index show <type> <name> ...',
    '',
    'Types: skill | agent | command | rule',
    '',
    'Examples:',
    '  aiwg show skill intake-wizard',
    '  aiwg show skill flow-deploy-to-production --json',
    '  aiwg show agent aiwg-steward',
    '  aiwg show command discover',
    '',
    'Tip: use `aiwg discover "<phrase>"` first to find the right name.',
  ].join('\n');

  if (positional.length === 0) {
    console.error('Error: aiwg show requires a type and name');
    console.error(HELP_TEXT);
    process.exit(1);
  }

  // Wave A (#1218): if the first positional is a known type, treat it
  // as the type. If it's NOT a known type, fall through to single-name
  // mode — `aiwg show intake-wizard` works as long as the name is
  // unambiguous across artifact types. Multi-type matches still error
  // with the disambiguation list (existing behavior in showArtifact).
  let type: string | null = null;
  let name: string;
  const firstLower = positional[0].toLowerCase();
  if (ALLOWED_TYPES.includes(firstLower)) {
    type = firstLower;
    name = positional.slice(1).join(' ').trim();
    if (!name) {
      console.error(`Error: aiwg show ${type} requires a name`);
      console.error(HELP_TEXT);
      process.exit(1);
    }
  } else {
    // Single-name fallback. Pass to showArtifact without a type filter
    // so its existing ambiguity logic kicks in: unique match → succeed,
    // multiple matches → list candidates and exit 2 (or pick first
    // with `--first`).
    name = positional.join(' ').trim();
  }

  let json = false;
  let first = false;

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--json') {
      json = true;
    } else if (flags[i] === '--first') {
      first = true;
    }
  }

  const graph = parseGraphFlag(flags);

  await showArtifact(cwd, {
    name,
    typeFilter: type ? [type] : undefined,
    json,
    first,
    graph,
  });
}
