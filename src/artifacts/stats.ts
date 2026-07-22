/**
 * Artifact Index Statistics
 *
 * Reports index health, coverage, and distribution metrics.
 *
 * @implements #418
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/stats.test.ts
 */

import fs from 'fs';
import path from 'path';
import type { GraphType, IndexStats } from './types.js';
import { GRAPH_CONFIGS, loadUserGraphConfigs, resolveGraphScanDir } from './types.js';
import { loadIndexStats, loadGraphIndexFile } from './index-reader.js';

export interface StatsOptions {
  json?: boolean;
  graph?: GraphType;
}

/**
 * Count total indexable files under scan directories (excluding .index/)
 */
function countArtifactFiles(cwd: string, graphType?: GraphType): number {
  const config = graphType ? GRAPH_CONFIGS[graphType] : undefined;
  const scanDirs = config
    ? config.scanDirs.map(d => resolveGraphScanDir(cwd, d))
    : [resolveGraphScanDir(cwd, '.aiwg')];
  const extensions = config?.extensions ?? ['.md', '.yaml', '.json'];

  let count = 0;

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.')) continue; // Skip .index, etc.
        walk(full);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        count++;
      }
    }
  }

  for (const dir of scanDirs) {
    walk(dir);
  }
  return count;
}

/**
 * Show artifact index statistics
 */
export async function showStats(
  cwd: string,
  options: StatsOptions = {}
): Promise<void> {
  const { graph } = options;

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
  loadUserGraphConfigs(cwd);
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
      const totalFiles = countArtifactFiles(cwd, type);
      combined[type] = {
        ...s,
        coverage: {
          indexed: s.totalArtifacts,
          totalFiles,
          percentage: totalFiles > 0 ? Math.round((s.totalArtifacts / totalFiles) * 100) : 100,
        },
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
    const totalFiles = countArtifactFiles(cwd, graphType);
    console.log(JSON.stringify({
      ...stats,
      coverage: {
        indexed: stats.totalArtifacts,
        totalFiles,
        percentage: totalFiles > 0 ? Math.round((stats.totalArtifacts / totalFiles) * 100) : 100,
      },
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
  console.log(`  Orphaned artifacts: ${stats.graphMetrics.orphanedArtifacts}`);
  if (stats.graphMetrics.mostReferenced) {
    console.log(`  Most referenced:    ${stats.graphMetrics.mostReferenced.path} (${stats.graphMetrics.mostReferenced.count} dependents)`);
  }
  console.log('');

  // Coverage
  const totalFiles = countArtifactFiles(cwd, graphType);
  const coverage = totalFiles > 0
    ? Math.round((stats.totalArtifacts / totalFiles) * 100)
    : 100;
  console.log('Index Health:');
  console.log(`  Coverage: ${stats.totalArtifacts}/${totalFiles} artifacts indexed (${coverage}%)`);
}
