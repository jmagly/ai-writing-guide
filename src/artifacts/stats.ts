/**
 * Artifact Index Statistics
 *
 * Reports index health, coverage, and distribution metrics.
 *
 * @implements #418
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/stats.test.ts
 */

import type { ArtifactIndex, GraphType, IndexStats } from './types.js';
import { GRAPH_CONFIGS, loadGlobalGraphConfigs, loadUserGraphConfigs } from './types.js';
import { loadIndexStats, loadGraphIndexFile } from './index-reader.js';
import { collectGraphIndexFiles, indexPathFor } from './index-files.js';

export interface StatsOptions {
  json?: boolean;
  graph?: GraphType;
}

export interface IndexCoverage {
  indexed: number;
  totalFiles: number;
  percentage: number;
}

/** Calculate coverage over the same current file set used by the index builder. */
async function calculateCoverage(
  cwd: string,
  stats: IndexStats,
  graphType?: GraphType,
): Promise<IndexCoverage> {
  const sourcePaths = new Set(
    (await collectGraphIndexFiles(cwd, graphType))
      .map(file => indexPathFor(cwd, file, graphType)),
  );
  const index = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', graphType);
  const indexed = index
    ? Object.keys(index.entries).filter(entryPath => sourcePaths.has(entryPath)).length
    : Math.min(stats.totalArtifacts, sourcePaths.size);
  const totalFiles = sourcePaths.size;
  return {
    indexed,
    totalFiles,
    percentage: totalFiles > 0 ? Math.round((indexed / totalFiles) * 100) : 100,
  };
}

/**
 * Show artifact index statistics
 */
export async function showStats(
  cwd: string,
  options: StatsOptions = {}
): Promise<void> {
  const { graph } = options;
  loadUserGraphConfigs(cwd);
  loadGlobalGraphConfigs();

  if (graph) {
    // Single graph mode
    const stats = loadGraphIndexFile<IndexStats>(cwd, 'stats.json', graph);
    if (!stats) {
      console.error(`Error: No artifact index found for graph '${graph}'.`);
      console.log("Run 'aiwg index build' first to create the index.");
      process.exit(1);
    }
    await renderStats(cwd, stats, options, graph);
    return;
  }

  // No graph specified: show all graphs with defaultBuild=true
  const graphTypes: GraphType[] = Object.entries(GRAPH_CONFIGS)
    .filter(([, config]) => config.defaultBuild)
    .map(([name]) => name);
  const availableGraphs: { type: GraphType; stats: IndexStats }[] = [];
  for (const g of graphTypes) {
    const s = loadGraphIndexFile<IndexStats>(cwd, 'stats.json', g);
    if (s) availableGraphs.push({ type: g, stats: s });
  }

  // Fall back to legacy root index
  if (availableGraphs.length === 0) {
    const legacyStats = loadIndexStats(cwd);
    if (!legacyStats) {
      console.error('Error: No artifact index found.');
      console.log("Run 'aiwg index build' first to create the index.");
      process.exit(1);
    }
    await renderStats(cwd, legacyStats, options);
    return;
  }

  if (options.json) {
    // JSON mode: aggregate all graphs into one response
    const combined: Record<string, unknown> = {};
    for (const { type, stats: s } of availableGraphs) {
      const coverage = await calculateCoverage(cwd, s, type);
      combined[type] = {
        ...s,
        coverage,
      };
    }
    console.log(JSON.stringify(combined, null, 2));
    return;
  }

  // Human-readable: show each graph
  for (const { type, stats: s } of availableGraphs) {
    console.log(`\n[${ type.toUpperCase() } GRAPH]`);
    await renderStats(cwd, s, { ...options, json: false }, type);
  }
}

/**
 * Render stats for a single graph (JSON or human-readable)
 */
async function renderStats(
  cwd: string,
  stats: IndexStats,
  options: StatsOptions,
  graphType?: GraphType
): Promise<void> {
  if (options.json) {
    const coverage = await calculateCoverage(cwd, stats, graphType);
    console.log(JSON.stringify({
      ...stats,
      coverage,
    }, null, 2));
    return;
  }

  // Human-readable output
  console.log('Artifact Index Statistics');
  console.log('─'.repeat(40));
  console.log(`Index version: ${stats.version}`);
  console.log(`Last built:    ${stats.builtAt}`);
  console.log(`Build time:    ${stats.buildTimeMs}ms`);
  console.log('');

  // By phase
  console.log('Artifacts by Phase:');
  const phases = Object.entries(stats.byPhase).sort((a, b) => b[1] - a[1]);
  for (const [phase, count] of phases) {
    console.log(`  ${phase.padEnd(20)} ${count} artifacts`);
  }
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(12)}`);
  console.log(`  ${'Total'.padEnd(20)} ${stats.totalArtifacts} artifacts`);
  console.log('');

  // By type
  console.log('Artifacts by Type:');
  const types = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of types) {
    console.log(`  ${type.padEnd(20)} ${count}`);
  }
  console.log('');

  // Tags
  const tagEntries = Object.entries(stats.tagDistribution).sort((a, b) => b[1] - a[1]);
  if (tagEntries.length > 0) {
    console.log('Tags (top 10):');
    const top10 = tagEntries.slice(0, 10);
    console.log(`  ${top10.map(([tag, count]) => `${tag} (${count})`).join(', ')}`);
    console.log('');
  }

  // Dependency graph
  console.log('Dependency Graph:');
  console.log(`  Total edges:        ${stats.graphMetrics.totalEdges}`);
  if (stats.graphMetrics.markdownLinkEdges !== undefined) {
    console.log(`  Markdown link edges:${String(stats.graphMetrics.markdownLinkEdges).padStart(3)}`);
  }
  if (stats.graphMetrics.canonicalEdges !== undefined) {
    console.log(`  Canonical edges:    ${stats.graphMetrics.canonicalEdges}`);
    console.log(`  Outgoing declares:  ${stats.graphMetrics.outgoingDeclarations}`);
    console.log(`  Incoming declares:  ${stats.graphMetrics.incomingDeclarations}`);
    console.log(`  Adjacency entries:  ${stats.graphMetrics.adjacencyEntries}`);
    console.log(`  Unmirrored outgoing:${String(stats.graphMetrics.unmirroredOutgoing).padStart(3)}`);
    console.log(`  Unmirrored incoming:${String(stats.graphMetrics.unmirroredIncoming).padStart(3)}`);
  }
  console.log(`  Orphaned artifacts: ${stats.graphMetrics.orphanedArtifacts}`);
  if (stats.graphMetrics.mostReferenced) {
    console.log(`  Most referenced:    ${stats.graphMetrics.mostReferenced.path} (${stats.graphMetrics.mostReferenced.count} dependents)`);
  }
  console.log('');

  // Coverage
  const coverage = await calculateCoverage(cwd, stats, graphType);
  console.log('Index Health:');
  console.log(`  Coverage: ${coverage.indexed}/${coverage.totalFiles} artifacts indexed (${coverage.percentage}%)`);
}
