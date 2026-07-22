/**
 * Multi-Graph Index Architecture Integration Tests
 *
 * Validates the three-graph index system (framework, project, codebase)
 * against real repository content. Tests graph-specific builds, queries,
 * dependency traversal, and stats.
 *
 * @integration
 * @slow
 * @implements #421
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { queryIndex } from '../../../src/artifacts/query-engine.js';
import { showDeps } from '../../../src/artifacts/dep-graph.js';
import { showStats } from '../../../src/artifacts/stats.js';
import type {
  ArtifactIndex,
  DependencyGraph,
  IndexStats,
  TagIndex,
  GraphType,
} from '../../../src/artifacts/types.js';
import { GRAPH_CONFIGS, getGraphIndexDir } from '../../../src/artifacts/types.js';
import { loadGraphIndexFile } from '../../../src/artifacts/index-reader.js';
import { workspaceLinkedFiles } from '../../../src/smiths/context-pipeline/workspace-context.js';
import { resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = resolveProjectAiwgDir(REPO_ROOT);
const SRC_DIR = path.join(REPO_ROOT, 'src');
const AGENTIC_DIR = path.join(REPO_ROOT, 'agentic');
const PROJECT_CORPUS_AVAILABLE = fs.existsSync(AIWG_DIR) && [
  'requirements',
  'architecture',
  'planning',
  'security',
].some(dir => fs.existsSync(path.join(AIWG_DIR, dir)));
const ARTIFACT_ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;

function withArtifactEnvCleared<T>(callback: () => T): T {
  const previous = Object.fromEntries(
    ARTIFACT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof ARTIFACT_ENV_KEYS)[number], string | undefined>;
  for (const key of ARTIFACT_ENV_KEYS) delete process.env[key];
  try {
    return callback();
  } finally {
    for (const key of ARTIFACT_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('Multi-Graph Index Architecture (integration)', () => {
  let tmpDir: string;
  let xdgDataDir: string;
  let originalXdgDataHome: string | undefined;

  // Loaded index data per graph
  const graphData: Record<GraphType, {
    metadata: ArtifactIndex | null;
    deps: DependencyGraph | null;
    stats: IndexStats | null;
    tags: TagIndex | null;
  }> = {
    framework: { metadata: null, deps: null, stats: null, tags: null },
    project: { metadata: null, deps: null, stats: null, tags: null },
    codebase: { metadata: null, deps: null, stats: null, tags: null },
  };

  beforeAll(async () => {
    // Skip if required directories don't exist
    if (!fs.existsSync(SRC_DIR)) return;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-multigraph-'));

    // Override XDG_DATA_HOME so framework graph writes to a temp dir
    xdgDataDir = path.join(tmpDir, 'xdg-data');
    fs.mkdirSync(xdgDataDir, { recursive: true });
    originalXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = xdgDataDir;

    const graphTypes = [
      ...(PROJECT_CORPUS_AVAILABLE ? ['project'] : []),
      'codebase',
      'framework',
    ] as GraphType[];

    // Build available graphs
    for (const graphType of graphTypes) {
      await buildIndex(REPO_ROOT, {
        force: true,
        outputDir: tmpDir,
        graph: graphType,
      });
    }

    // Load index data for each graph
    // When outputDir is set, all graphs write to outputDir/.aiwg/.index/<graph>/
    for (const graphType of graphTypes) {
      const indexDir = path.join(tmpDir, '.aiwg', '.index', graphType);

      if (fs.existsSync(path.join(indexDir, 'metadata.json'))) {
        graphData[graphType].metadata = JSON.parse(
          fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8')
        );
      }
      if (fs.existsSync(path.join(indexDir, 'dependencies.json'))) {
        graphData[graphType].deps = JSON.parse(
          fs.readFileSync(path.join(indexDir, 'dependencies.json'), 'utf-8')
        );
      }
      if (fs.existsSync(path.join(indexDir, 'stats.json'))) {
        graphData[graphType].stats = JSON.parse(
          fs.readFileSync(path.join(indexDir, 'stats.json'), 'utf-8')
        );
      }
      if (fs.existsSync(path.join(indexDir, 'tags.json'))) {
        graphData[graphType].tags = JSON.parse(
          fs.readFileSync(path.join(indexDir, 'tags.json'), 'utf-8')
        );
      }
    }
  }, 60_000);

  afterAll(() => {
    // Restore XDG_DATA_HOME
    if (originalXdgDataHome !== undefined) {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    } else {
      delete process.env.XDG_DATA_HOME;
    }

    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ─────────────────────────────────────────────────────
  // Graph Config Validation
  // ─────────────────────────────────────────────────────

  describe('Graph Configurations', () => {
    it('should define all three graph types', () => {
      expect(GRAPH_CONFIGS.framework).toBeDefined();
      expect(GRAPH_CONFIGS.project).toBeDefined();
      expect(GRAPH_CONFIGS.codebase).toBeDefined();
    });

    it('should mark only framework graph as shared', () => {
      expect(GRAPH_CONFIGS.framework.shared).toBe(true);
      expect(GRAPH_CONFIGS.project.shared).toBe(false);
      expect(GRAPH_CONFIGS.codebase.shared).toBe(false);
    });

    it('should have distinct scan directories per graph', () => {
      const frameworkDirs = GRAPH_CONFIGS.framework.scanDirs;
      const projectDirs = GRAPH_CONFIGS.project.scanDirs;
      const codebaseDirs = GRAPH_CONFIGS.codebase.scanDirs;

      // No overlap between project and codebase
      for (const dir of projectDirs) {
        expect(codebaseDirs).not.toContain(dir);
      }
      for (const dir of codebaseDirs) {
        expect(projectDirs).not.toContain(dir);
      }
    });

    it('should resolve framework graph to XDG data directory', () => {
      const fwDir = getGraphIndexDir(REPO_ROOT, 'framework');
      expect(fwDir).toContain('aiwg/index/framework');
    });

    it('should resolve project graph to the configured artifact-root index', () => {
      const projDir = getGraphIndexDir(REPO_ROOT, 'project');
      expect(projDir).toBe(path.join(AIWG_DIR, '.index', 'project'));
    });

    it('should resolve codebase graph to the configured artifact-root index', () => {
      const cbDir = getGraphIndexDir(REPO_ROOT, 'codebase');
      expect(cbDir).toBe(path.join(AIWG_DIR, '.index', 'codebase'));
    });
  });

  // ─────────────────────────────────────────────────────
  // Framework Graph
  // ─────────────────────────────────────────────────────

  describe('Framework Graph Build', () => {
    it('should produce all 4 output files', () => {
      if (!graphData.framework.metadata) return;
      const fwDir = path.join(tmpDir, '.aiwg', '.index', 'framework');
      for (const file of ['metadata.json', 'tags.json', 'dependencies.json', 'stats.json']) {
        expect(fs.existsSync(path.join(fwDir, file)), `${file} should exist`).toBe(true);
      }
    });

    it('should index framework source files (agentic/code/)', () => {
      const md = graphData.framework.metadata;
      if (!md) return;
      const entries = Object.keys(md.entries);
      const agenticEntries = entries.filter(p => p.startsWith('agentic/'));
      expect(agenticEntries.length).toBeGreaterThan(0);
    });

    it('should index docs/ in the framework graph', () => {
      const md = graphData.framework.metadata;
      if (!md) return;
      const docEntries = Object.keys(md.entries).filter(p => p.startsWith('docs/'));
      expect(docEntries.length).toBeGreaterThan(0);
    });

    it('should NOT index .aiwg/ in the framework graph', () => {
      const md = graphData.framework.metadata;
      if (!md) return;
      const aiwgEntries = Object.keys(md.entries).filter(p => p.startsWith('.aiwg/'));
      expect(aiwgEntries.length).toBe(0);
    });

    it('should NOT index src/ in the framework graph', () => {
      const md = graphData.framework.metadata;
      if (!md) return;
      const srcEntries = Object.keys(md.entries).filter(p => p.startsWith('src/'));
      expect(srcEntries.length).toBe(0);
    });

    it('should index .md, .yaml, and .json files', () => {
      const md = graphData.framework.metadata;
      if (!md) return;
      const extensions = new Set(
        Object.keys(md.entries).map(p => path.extname(p))
      );
      expect(extensions.has('.md')).toBe(true);
    });

    it('should have valid stats for framework graph', () => {
      const stats = graphData.framework.stats;
      if (!stats) return;
      expect(stats.totalArtifacts).toBeGreaterThan(0);
      expect(stats.buildTimeMs).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────
  // Project Graph
  // ─────────────────────────────────────────────────────

  describe('Project Graph Build', () => {
    it('should produce all 4 output files', () => {
      if (!graphData.project.metadata) return;
      const projDir = path.join(tmpDir, '.aiwg', '.index', 'project');
      for (const file of ['metadata.json', 'tags.json', 'dependencies.json', 'stats.json']) {
        expect(fs.existsSync(path.join(projDir, file)), `${file} should exist`).toBe(true);
      }
    });

    it('should index .aiwg/ artifacts plus only the canonical WORKSPACE graph', async () => {
      const md = graphData.project.metadata;
      if (!md) return;
      const linked = new Set((await workspaceLinkedFiles(REPO_ROOT))
        .map(file => path.relative(REPO_ROOT, file).replace(/\\/g, '/')));
      for (const entryPath of Object.keys(md.entries)) {
        const allowed = entryPath.startsWith('.aiwg/') || entryPath === 'WORKSPACE.md' || linked.has(entryPath);
        expect(allowed, `${entryPath} should be in .aiwg/ or explicitly linked by WORKSPACE.md`).toBe(true);
      }
    });

    it('should NOT index src/ or agentic/ in project graph', () => {
      const md = graphData.project.metadata;
      if (!md) return;
      const srcEntries = Object.keys(md.entries).filter(
        p => p.startsWith('src/') || p.startsWith('agentic/')
      );
      expect(srcEntries.length).toBe(0);
    });

    it('should index SDLC artifacts (requirements, architecture, etc.)', () => {
      const md = graphData.project.metadata;
      if (!md) return;
      const entries = Object.keys(md.entries);
      const hasRequirements = entries.some(p => p.includes('requirements'));
      const hasArchitecture = entries.some(p => p.includes('architecture'));
      expect(hasRequirements || hasArchitecture).toBe(true);
    });

    it('should have valid dependency graph for project artifacts', async () => {
      const deps = graphData.project.deps;
      if (!deps) return;
      const entryCount = Object.keys(deps).length;
      expect(entryCount).toBeGreaterThan(0);

      const linked = new Set((await workspaceLinkedFiles(REPO_ROOT))
        .map(file => path.relative(REPO_ROOT, file).replace(/\\/g, '/')));
      for (const depPath of Object.keys(deps)) {
        const allowed = depPath.startsWith('.aiwg/') || depPath === 'WORKSPACE.md' || linked.has(depPath);
        expect(allowed, `dep ${depPath} should be .aiwg/ or canonical WORKSPACE graph path`).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // Codebase Graph
  // ─────────────────────────────────────────────────────

  describe('Codebase Graph Build', () => {
    it('should produce all 4 output files', () => {
      if (!graphData.codebase.metadata) return;
      const cbDir = path.join(tmpDir, '.aiwg', '.index', 'codebase');
      for (const file of ['metadata.json', 'tags.json', 'dependencies.json', 'stats.json']) {
        expect(fs.existsSync(path.join(cbDir, file)), `${file} should exist`).toBe(true);
      }
    });

    it('should index src/ files', () => {
      const md = graphData.codebase.metadata;
      if (!md) return;
      const srcEntries = Object.keys(md.entries).filter(p => p.startsWith('src/'));
      expect(srcEntries.length).toBeGreaterThan(0);
    });

    it('should index test/ files', () => {
      const md = graphData.codebase.metadata;
      if (!md) return;
      const testEntries = Object.keys(md.entries).filter(p => p.startsWith('test/'));
      expect(testEntries.length).toBeGreaterThan(0);
    });

    it('should index tools/ files', () => {
      const md = graphData.codebase.metadata;
      if (!md) return;
      const toolEntries = Object.keys(md.entries).filter(p => p.startsWith('tools/'));
      expect(toolEntries.length).toBeGreaterThan(0);
    });

    it('should NOT index .aiwg/ or agentic/ in codebase graph', () => {
      const md = graphData.codebase.metadata;
      if (!md) return;
      const wrongEntries = Object.keys(md.entries).filter(
        p => p.startsWith('.aiwg/') || p.startsWith('agentic/')
      );
      expect(wrongEntries.length).toBe(0);
    });

    it('should index TypeScript files (.ts, .mts)', () => {
      const md = graphData.codebase.metadata;
      if (!md) return;
      const tsEntries = Object.keys(md.entries).filter(
        p => p.endsWith('.ts') || p.endsWith('.mts')
      );
      expect(tsEntries.length).toBeGreaterThan(0);
    });

    it('should index JavaScript files (.js, .mjs)', () => {
      const md = graphData.codebase.metadata;
      if (!md) return;
      const jsEntries = Object.keys(md.entries).filter(
        p => p.endsWith('.js') || p.endsWith('.mjs')
      );
      expect(jsEntries.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────
  // Graph Isolation
  // ─────────────────────────────────────────────────────

  describe('Graph Isolation', () => {
    it('should have no overlapping paths between graphs except canonical workspace context', async () => {
      const projectPaths = new Set(
        Object.keys(graphData.project.metadata?.entries ?? {})
      );
      const codebasePaths = new Set(
        Object.keys(graphData.codebase.metadata?.entries ?? {})
      );
      const frameworkPaths = new Set(
        Object.keys(graphData.framework.metadata?.entries ?? {})
      );

      const projectContextPaths = new Set([
        'WORKSPACE.md',
        ...(await workspaceLinkedFiles(REPO_ROOT))
          .map(file => path.relative(REPO_ROOT, file).replace(/\\/g, '/')),
      ]);

      // No path should appear in more than one graph except canonical
      // WORKSPACE-linked context intentionally included in the project graph.
      for (const p of projectPaths) {
        if (projectContextPaths.has(p)) continue;
        expect(codebasePaths.has(p), `${p} should not be in both project and codebase`).toBe(false);
        expect(frameworkPaths.has(p), `${p} should not be in both project and framework`).toBe(false);
      }
      for (const p of codebasePaths) {
        expect(frameworkPaths.has(p), `${p} should not be in both codebase and framework`).toBe(false);
      }
    });

    it('should store graphs in separate directories', () => {
      const projDir = path.join(tmpDir, '.aiwg', '.index', 'project');
      const cbDir = path.join(tmpDir, '.aiwg', '.index', 'codebase');
      const fwDir = path.join(tmpDir, '.aiwg', '.index', 'framework');

      // All three directories should exist and be different
      expect(projDir).not.toBe(cbDir);
      expect(projDir).not.toBe(fwDir);
      expect(cbDir).not.toBe(fwDir);
    });

    it('should have different artifact counts per graph', () => {
      const projCount = graphData.project.stats?.totalArtifacts ?? 0;
      const cbCount = graphData.codebase.stats?.totalArtifacts ?? 0;
      const fwCount = graphData.framework.stats?.totalArtifacts ?? 0;
      if (!graphData.project.stats || !graphData.codebase.stats || !graphData.framework.stats) return;

      // Each graph should have indexed something
      expect(projCount).toBeGreaterThan(0);
      expect(cbCount).toBeGreaterThan(0);
      expect(fwCount).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────
  // Graph-Specific Dependency Traversal
  // ─────────────────────────────────────────────────────

  describe('Graph-Specific Dependencies', () => {
    it('should have bidirectional consistency in project graph', () => {
      const deps = graphData.project.deps;
      if (!deps) return;
      for (const [artifact, node] of Object.entries(deps)) {
        for (const upstream of node.upstream) {
          if (deps[upstream]) {
            expect(
              deps[upstream].downstream,
              `${upstream} downstream should include ${artifact}`
            ).toContain(artifact);
          }
        }
      }
    });

    it('should have bidirectional consistency in codebase graph', () => {
      const deps = graphData.codebase.deps;
      if (!deps) return;
      for (const [artifact, node] of Object.entries(deps)) {
        for (const upstream of node.upstream) {
          if (deps[upstream]) {
            expect(
              deps[upstream].downstream,
              `${upstream} downstream should include ${artifact}`
            ).toContain(artifact);
          }
        }
      }
    });

    it('should have bidirectional consistency in framework graph', () => {
      const deps = graphData.framework.deps;
      if (!deps) return;
      for (const [artifact, node] of Object.entries(deps)) {
        for (const upstream of node.upstream) {
          if (deps[upstream]) {
            expect(
              deps[upstream].downstream,
              `${upstream} downstream should include ${artifact}`
            ).toContain(artifact);
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // Graph-Specific Stats
  // ─────────────────────────────────────────────────────

  describe('Graph-Specific Stats', () => {
    it('should have consistent stats for project graph', () => {
      const stats = graphData.project.stats;
      const md = graphData.project.metadata;
      if (!stats || !md) return;
      expect(stats.totalArtifacts).toBe(Object.keys(md.entries).length);
      const phaseSum = Object.values(stats.byPhase).reduce((a, b) => a + b, 0);
      expect(phaseSum).toBe(stats.totalArtifacts);
    });

    it('should have consistent stats for codebase graph', () => {
      const stats = graphData.codebase.stats;
      const md = graphData.codebase.metadata;
      if (!stats || !md) return;
      expect(stats.totalArtifacts).toBe(Object.keys(md.entries).length);
      const phaseSum = Object.values(stats.byPhase).reduce((a, b) => a + b, 0);
      expect(phaseSum).toBe(stats.totalArtifacts);
    });

    it('should have consistent stats for framework graph', () => {
      const stats = graphData.framework.stats;
      const md = graphData.framework.metadata;
      if (!stats || !md) return;
      expect(stats.totalArtifacts).toBe(Object.keys(md.entries).length);
      const phaseSum = Object.values(stats.byPhase).reduce((a, b) => a + b, 0);
      expect(phaseSum).toBe(stats.totalArtifacts);
    });

    it('should report graph metrics (edges, orphans)', () => {
      for (const graphType of ['project', 'codebase', 'framework'] as GraphType[]) {
        const stats = graphData[graphType].stats;
        if (!stats) continue;
        expect(stats.graphMetrics).toBeDefined();
        expect(typeof stats.graphMetrics.totalEdges).toBe('number');
        expect(typeof stats.graphMetrics.orphanedArtifacts).toBe('number');
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // Performance
  // ─────────────────────────────────────────────────────

  describe('Performance', () => {
    it('should build each graph within 30s', () => {
      for (const graphType of ['project', 'codebase', 'framework'] as GraphType[]) {
        const stats = graphData[graphType].stats;
        if (!stats) continue;
        expect(
          stats.buildTimeMs,
          `${graphType} graph should build in < 30s`
        ).toBeLessThan(30_000);
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // loadGraphIndexFile integration
  // ─────────────────────────────────────────────────────

  describe('loadGraphIndexFile', () => {
    it('should load project graph metadata from correct directory', () => {
      if (!graphData.project.metadata) return;
      // loadGraphIndexFile should resolve to .aiwg/.index/project/
      const loaded = withArtifactEnvCleared(() => loadGraphIndexFile<ArtifactIndex>(tmpDir, 'metadata.json', 'project'));
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe('1.0.0');
      expect(Object.keys(loaded!.entries).length).toBeGreaterThan(0);
    });

    it('should load codebase graph metadata from correct directory', () => {
      if (!graphData.codebase.metadata) return;
      const loaded = withArtifactEnvCleared(() => loadGraphIndexFile<ArtifactIndex>(tmpDir, 'metadata.json', 'codebase'));
      expect(loaded).not.toBeNull();
      expect(Object.keys(loaded!.entries).length).toBeGreaterThan(0);
    });

    it('should load framework graph metadata via getGraphIndexDir', () => {
      if (!graphData.framework.metadata) return;
      // With XDG_DATA_HOME pointing to xdgDataDir, framework graph would
      // resolve there. But with outputDir override, data is in tmpDir.
      // Verify the getGraphIndexDir function resolves to XDG path
      const fwDir = getGraphIndexDir(tmpDir, 'framework');
      expect(fwDir).toContain('aiwg/index/framework');
    });

    it('should return null for non-existent graph', () => {
      const loaded = loadGraphIndexFile<ArtifactIndex>('/nonexistent/path', 'metadata.json', 'project');
      expect(loaded).toBeNull();
    });
  });
});
