import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import type { ArtifactIndex, DependencyGraph, IndexStats, MetadataEntry, TagIndex, TypedEdge } from './types.js';
import { INDEX_EXTRACTOR_VERSION, INDEX_VERSION } from './types.js';
import { writeIndexFile } from './index-reader.js';

export interface SourceGraphBuildOptions {
  cwd: string;
  outputDir: string;
  effectiveOutputCwd: string;
  verbose?: boolean;
}

type ImportKind =
  | 'imports'
  | 'imports_type'
  | 'reexports'
  | 'imports_dynamic'
  | 'requires';

interface ImportFact {
  sourcePath: string;
  specifier: string;
  kind: ImportKind;
  line: number;
  column: number;
  typeOnly: boolean;
}

interface ResolvedImport {
  fact: ImportFact;
  targetPath: string;
  targetType: SourceNodeType;
  edgeType: string;
  diagnostic?: string;
  confidence: string;
}

type SourceNodeType =
  | 'source.file'
  | 'source.module'
  | 'source.package'
  | 'source.builtin'
  | 'source.asset'
  | 'source.unresolved'
  | 'source.entrypoint';

const SOURCE_ROOTS = ['src', 'tools', 'test', 'config', 'bin', 'apps', 'vscode-extension'];
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'generated',
  'target',
  'coverage',
  '.cache',
  '.vite',
  '.turbo',
]);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const ASSET_EXTENSIONS = new Set([
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
]);
const BUILTIN_MODULES = new Set([
  'assert', 'buffer', 'child_process', 'crypto', 'events', 'fs', 'http', 'https',
  'module', 'net', 'os', 'path', 'process', 'querystring', 'stream', 'timers',
  'tls', 'tty', 'url', 'util', 'vm', 'worker_threads', 'zlib',
]);

function repoRelative(cwd: string, fullPath: string): string {
  return path.relative(cwd, fullPath).split(path.sep).join('/');
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function stableExternalPath(prefix: string, specifier: string): string {
  return `source:${prefix}:${specifier}`;
}

function moduleIdForSource(relPath: string): string {
  return `source:module:${relPath.replace(/\.[^.]+$/, '')}`;
}

function packageName(specifier: string): string {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');
}

function sourceRootFor(relPath: string): string {
  return SOURCE_ROOTS.find((root) => relPath === root || relPath.startsWith(`${root}/`)) ?? '';
}

function languageForExt(ext: string): string {
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'typescript';
  if (ext === '.tsx') return 'tsx';
  if (ext === '.jsx') return 'jsx';
  return 'javascript';
}

function moduleSystemForExt(ext: string): string {
  if (ext === '.cjs' || ext === '.cts') return 'cjs';
  return 'esm';
}

function shouldSkipDir(dirName: string, fullPath: string): boolean {
  if (EXCLUDED_DIRS.has(dirName)) return true;
  return fullPath.split(path.sep).includes('.aiwg') && fullPath.split(path.sep).includes('.index');
}

function collectSourceFiles(cwd: string): string[] {
  const results: string[] = [];
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(entry.name, fullPath)) visit(fullPath);
      } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  };

  for (const root of SOURCE_ROOTS) visit(path.join(cwd, root));
  return results.sort((a, b) => repoRelative(cwd, a).localeCompare(repoRelative(cwd, b)));
}

function parseCompilerOptions(cwd: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    return {
      allowJs: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    };
  }
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath));
  return {
    ...parsed.options,
    allowJs: true,
    resolveJsonModule: true,
    moduleResolution: parsed.options.moduleResolution ?? ts.ModuleResolutionKind.Bundler,
  };
}

function specifierNode(node: ts.Node): ts.StringLiteralLike | null {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }
  if (
    ts.isCallExpression(node) &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0])
  ) {
    const expression = node.expression;
    if (expression.kind === ts.SyntaxKind.ImportKeyword) return node.arguments[0];
    if (ts.isIdentifier(expression) && expression.text === 'require') return node.arguments[0];
  }
  return null;
}

function importKind(node: ts.Node): ImportKind | null {
  if (ts.isImportDeclaration(node)) {
    return node.importClause?.isTypeOnly ? 'imports_type' : 'imports';
  }
  if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
    return node.isTypeOnly ? 'imports_type' : 'reexports';
  }
  if (ts.isCallExpression(node)) {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) return 'imports_dynamic';
    if (ts.isIdentifier(node.expression) && node.expression.text === 'require') return 'requires';
  }
  return null;
}

function collectImports(cwd: string, filePath: string, sourceFile: ts.SourceFile): ImportFact[] {
  const facts: ImportFact[] = [];
  const visit = (node: ts.Node) => {
    const spec = specifierNode(node);
    const kind = importKind(node);
    if (spec && kind) {
      const pos = sourceFile.getLineAndCharacterOfPosition(spec.getStart(sourceFile));
      facts.push({
        sourcePath: repoRelative(cwd, filePath),
        specifier: spec.text,
        kind,
        line: pos.line + 1,
        column: pos.character + 1,
        typeOnly: kind === 'imports_type',
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return facts;
}

function tryAssetResolution(cwd: string, containingFile: string, specifier: string): string | null {
  if (!isRelativeSpecifier(specifier)) return null;
  const base = path.resolve(path.dirname(containingFile), specifier);
  const candidates = [
    base,
    ...Array.from(ASSET_EXTENSIONS).map((ext) => base + ext),
    ...Array.from(ASSET_EXTENSIONS).map((ext) => path.join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate);
      if (ASSET_EXTENSIONS.has(ext) && !CODE_EXTENSIONS.has(ext)) return repoRelative(cwd, candidate);
    }
  }
  return null;
}

function resolveImport(
  cwd: string,
  fact: ImportFact,
  compilerOptions: ts.CompilerOptions,
): ResolvedImport {
  const containingFile = path.join(cwd, fact.sourcePath);
  const specifier = fact.specifier;
  const bareBuiltin = specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier;

  if (BUILTIN_MODULES.has(bareBuiltin)) {
    return {
      fact,
      targetPath: stableExternalPath('builtin', specifier),
      targetType: 'source.builtin',
      edgeType: 'depends_external',
      confidence: 'external',
    };
  }

  const resolved = ts.resolveModuleName(specifier, containingFile, compilerOptions, ts.sys).resolvedModule;
  if (resolved?.resolvedFileName) {
    const resolvedFile = path.normalize(resolved.resolvedFileName);
    if (resolved.isExternalLibraryImport || resolvedFile.includes(`${path.sep}node_modules${path.sep}`)) {
      return {
        fact,
        targetPath: stableExternalPath('package', specifier),
        targetType: 'source.package',
        edgeType: 'depends_external',
        confidence: 'external',
      };
    }
    const rel = repoRelative(cwd, resolvedFile);
    const ext = path.extname(rel);
    if (ASSET_EXTENSIONS.has(ext) && !CODE_EXTENSIONS.has(ext)) {
      return {
        fact,
        targetPath: rel,
        targetType: 'source.asset',
        edgeType: 'imports_asset',
        confidence: 'asset',
      };
    }
    return {
      fact,
      targetPath: rel,
      targetType: 'source.file',
      edgeType: fact.kind,
      confidence: 'exact',
    };
  }

  const assetPath = tryAssetResolution(cwd, containingFile, specifier);
  if (assetPath) {
    return {
      fact,
      targetPath: assetPath,
      targetType: 'source.asset',
      edgeType: 'imports_asset',
      confidence: 'asset',
    };
  }

  if (!isRelativeSpecifier(specifier)) {
    return {
      fact,
      targetPath: stableExternalPath('package', specifier),
      targetType: 'source.package',
      edgeType: 'depends_external',
      confidence: 'external',
    };
  }

  return {
    fact,
    targetPath: stableExternalPath('unresolved', `${fact.sourcePath}:${specifier}`),
    targetType: 'source.unresolved',
    edgeType: 'unresolved_import',
    diagnostic: `Unable to resolve '${specifier}' from ${fact.sourcePath}`,
    confidence: 'unresolved',
  };
}

function sourceEntry(
  relPath: string,
  fullPath: string,
  type: SourceNodeType,
  title: string,
  summary: string,
  tags: string[],
): MetadataEntry {
  const stat = fs.existsSync(fullPath) ? fs.statSync(fullPath) : null;
  const content = stat?.isFile() ? fs.readFileSync(fullPath, 'utf-8') : relPath;
  const ext = path.extname(relPath);
  return {
    path: relPath,
    type,
    phase: 'source',
    title,
    name: relPath,
    tags,
    created: stat?.birthtime.toISOString() ?? new Date(0).toISOString(),
    updated: stat?.mtime.toISOString() ?? new Date(0).toISOString(),
    checksum: hashText(content),
    summary,
    dependencies: [],
    dependents: [],
    capability: summary,
    ...(type === 'source.file' || type === 'source.entrypoint'
      ? {
          sourceRoot: sourceRootFor(relPath),
          extension: ext,
          language: languageForExt(ext),
          moduleSystem: moduleSystemForExt(ext),
          generated: false,
          lineCount: content.split(/\r?\n/).length,
          byteCount: Buffer.byteLength(content),
        }
      : {}),
  } as MetadataEntry;
}

function virtualEntry(pathId: string, type: SourceNodeType, title: string, summary: string, tags: string[]): MetadataEntry {
  return {
    path: pathId,
    type,
    phase: 'source',
    title,
    name: title,
    tags,
    created: new Date(0).toISOString(),
    updated: new Date(0).toISOString(),
    checksum: hashText(pathId),
    summary,
    dependencies: [],
    dependents: [],
    capability: summary,
  };
}

function addEdge(graph: DependencyGraph, from: string, to: string, edge: TypedEdge): void {
  graph[from] ??= { upstream: [], downstream: [] };
  graph[to] ??= { upstream: [], downstream: [] };
  graph[from].upstream.push(edge);
  graph[to].downstream.push({ ...edge, path: from });
}

function addDownstreamFact(graph: DependencyGraph, from: string, to: string, edge: TypedEdge): void {
  graph[from] ??= { upstream: [], downstream: [] };
  graph[to] ??= { upstream: [], downstream: [] };
  graph[from].downstream.push(edge);
  graph[to].upstream.push({ ...edge, path: from });
}

function dedupeEdges(graph: DependencyGraph): void {
  for (const node of Object.values(graph)) {
    for (const direction of ['upstream', 'downstream'] as const) {
      const seen = new Set<string>();
      node[direction] = node[direction].filter((edge) => {
        const key = `${edge.type}\0${edge.path}\0${JSON.stringify(edge)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a, b) => a.path.localeCompare(b.path) || a.type.localeCompare(b.type));
    }
  }
}

function detectCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const stack: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string) => {
    if (visiting.has(node)) {
      const index = stack.indexOf(node);
      if (index >= 0) cycles.push([...stack.slice(index), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const edge of graph[node]?.upstream ?? []) {
      if (edge.type === 'depends_external' || edge.type === 'imports_asset' || edge.type === 'unresolved_import') continue;
      visit(edge.path);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of Object.keys(graph).sort()) visit(node);
  return cycles;
}

function buildStats(index: ArtifactIndex, graph: DependencyGraph): IndexStats {
  const byType: Record<string, number> = {};
  const tagDistribution: Record<string, number> = {};
  for (const entry of Object.values(index.entries)) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    for (const tag of entry.tags) tagDistribution[tag] = (tagDistribution[tag] ?? 0) + 1;
  }
  const edgeCount = Object.values(graph).reduce((sum, node) => sum + node.upstream.length, 0);
  const mostReferenced = Object.entries(graph)
    .map(([node, edges]) => ({ path: node, count: edges.downstream.length }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))[0] ?? null;
  return {
    version: INDEX_VERSION,
    extractorVersion: INDEX_EXTRACTOR_VERSION,
    builtAt: index.builtAt,
    buildTimeMs: index.buildTimeMs,
    totalArtifacts: Object.keys(index.entries).length,
    byPhase: { source: Object.keys(index.entries).length },
    byType,
    tagDistribution,
    graphMetrics: {
      totalEdges: edgeCount,
      orphanedArtifacts: Object.values(graph).filter((node) => node.upstream.length === 0 && node.downstream.length === 0).length,
      mostReferenced,
    },
  };
}

export async function buildSourceGraphIndex(options: SourceGraphBuildOptions): Promise<void> {
  const started = Date.now();
  const { cwd, outputDir, effectiveOutputCwd, verbose = false } = options;
  const compilerOptions = parseCompilerOptions(cwd);
  const files = collectSourceFiles(cwd);
  if (verbose) console.log(`  source files: ${files.length}`);
  const entries: Record<string, MetadataEntry> = {};
  const graph: DependencyGraph = {};
  const tagIndex: TagIndex = {};
  const facts: ImportFact[] = [];

  for (const fullPath of files) {
    const rel = repoRelative(cwd, fullPath);
    const type: SourceNodeType = rel.startsWith('bin/') || rel.includes('/src-tauri/') ? 'source.entrypoint' : 'source.file';
    entries[rel] = sourceEntry(rel, fullPath, type, rel, `${type === 'source.entrypoint' ? 'Entrypoint' : 'Source file'} ${rel}`, [type, sourceRootFor(rel)].filter(Boolean));
    graph[rel] = { upstream: [], downstream: [] };
    const moduleId = moduleIdForSource(rel);
    entries[moduleId] = virtualEntry(moduleId, 'source.module', rel.replace(/\.[^.]+$/, ''), `Module identity for ${rel}`, ['source.module', sourceRootFor(rel)].filter(Boolean));
    graph[moduleId] = { upstream: [], downstream: [] };
    addEdge(graph, rel, moduleId, {
      path: moduleId,
      type: 'defines_module',
      specifier: rel,
      resolved: moduleId,
      confidence: 'exact',
    } as TypedEdge);
    const sourceText = fs.readFileSync(fullPath, 'utf-8');
    const sourceFile = ts.createSourceFile(fullPath, sourceText, ts.ScriptTarget.Latest, true);
    facts.push(...collectImports(cwd, fullPath, sourceFile));
  }
  if (verbose) console.log(`  import facts: ${facts.length}`);

  const resolvedFacts = facts.map((fact) => resolveImport(cwd, fact, compilerOptions));
  if (verbose) console.log(`  resolved facts: ${resolvedFacts.length}`);
  for (const resolved of resolvedFacts) {
    if (!entries[resolved.targetPath]) {
      if (resolved.targetType === 'source.package') {
        entries[resolved.targetPath] = virtualEntry(
          resolved.targetPath,
          'source.package',
          resolved.fact.specifier,
          `External package dependency ${packageName(resolved.fact.specifier)}`,
          ['source.package', packageName(resolved.fact.specifier)],
        );
      } else if (resolved.targetType === 'source.builtin') {
        entries[resolved.targetPath] = virtualEntry(resolved.targetPath, 'source.builtin', resolved.fact.specifier, `Node builtin dependency ${resolved.fact.specifier}`, ['source.builtin']);
      } else if (resolved.targetType === 'source.unresolved') {
        entries[resolved.targetPath] = virtualEntry(resolved.targetPath, 'source.unresolved', resolved.fact.specifier, resolved.diagnostic ?? `Unresolved import ${resolved.fact.specifier}`, ['source.unresolved', 'diagnostic']);
      } else if (resolved.targetType === 'source.asset') {
        entries[resolved.targetPath] = sourceEntry(resolved.targetPath, path.join(cwd, resolved.targetPath), 'source.asset', resolved.targetPath, `Imported asset ${resolved.targetPath}`, ['source.asset']);
      } else if (resolved.targetType === 'source.file') {
        entries[resolved.targetPath] = sourceEntry(resolved.targetPath, path.join(cwd, resolved.targetPath), 'source.file', resolved.targetPath, `Resolved source file ${resolved.targetPath}`, ['source.file', sourceRootFor(resolved.targetPath)].filter(Boolean));
      }
      graph[resolved.targetPath] ??= { upstream: [], downstream: [] };
    }
    const edge = {
      path: resolved.targetPath,
      type: resolved.edgeType,
      specifier: resolved.fact.specifier,
      resolved: resolved.targetPath,
      line: resolved.fact.line,
      column: resolved.fact.column,
      moduleSystem: resolved.fact.kind === 'requires' ? 'cjs' : resolved.fact.kind === 'imports_dynamic' ? 'dynamic' : resolved.edgeType === 'imports_asset' ? 'asset' : 'esm',
      typeOnly: resolved.fact.typeOnly,
      confidence: resolved.confidence,
      ...(resolved.diagnostic ? { diagnostic: resolved.diagnostic } : {}),
    } as TypedEdge;
    addEdge(graph, resolved.fact.sourcePath, resolved.targetPath, edge);
    entries[resolved.fact.sourcePath].dependencies.push(resolved.targetPath);
    entries[resolved.targetPath].dependents.push(resolved.fact.sourcePath);
  }

  for (const [testPath, node] of Object.entries(graph)) {
    if (!/(^test\/|\.test\.|\.spec\.|\/test\/)/.test(testPath)) continue;
    for (const edge of [...node.upstream]) {
      const target = entries[edge.path];
      if (!target || target.type !== 'source.file') continue;
      addDownstreamFact(graph, edge.path, testPath, {
        path: testPath,
        type: 'exercised_by',
        specifier: (edge as TypedEdge & { specifier?: string }).specifier,
        resolved: testPath,
        confidence: 'derived',
      } as TypedEdge);
    }
  }
  if (verbose) console.log('  derived test edges complete');

  dedupeEdges(graph);
  if (verbose) console.log('  edge dedupe complete');
  for (const entry of Object.values(entries)) {
    entry.dependencies = [...new Set(entry.dependencies)].sort();
    entry.dependents = [...new Set(entry.dependents)].sort();
    for (const tag of entry.tags) {
      tagIndex[tag] ??= [];
      tagIndex[tag].push(entry.path);
    }
  }
  for (const paths of Object.values(tagIndex)) paths.sort();

  const cycles = detectCycles(graph);
  if (verbose) console.log(`  cycle diagnostics: ${cycles.length}`);
  const diagnostics = {
    unresolved: resolvedFacts
      .filter((fact) => fact.edgeType === 'unresolved_import')
      .map((fact) => ({
        source: fact.fact.sourcePath,
        specifier: fact.fact.specifier,
        target: fact.targetPath,
        line: fact.fact.line,
        column: fact.fact.column,
        diagnostic: fact.diagnostic,
      })),
    cycles,
  };

  const index: ArtifactIndex = {
    version: INDEX_VERSION,
    extractorVersion: INDEX_EXTRACTOR_VERSION,
    builtAt: new Date().toISOString(),
    buildTimeMs: Date.now() - started,
    entries,
  };

  writeIndexFile(effectiveOutputCwd, 'metadata.json', index, outputDir);
  writeIndexFile(effectiveOutputCwd, 'tags.json', tagIndex, outputDir);
  writeIndexFile(effectiveOutputCwd, 'dependencies.json', graph, outputDir);
  writeIndexFile(effectiveOutputCwd, 'diagnostics.json', diagnostics, outputDir);
  writeIndexFile(effectiveOutputCwd, 'stats.json', buildStats(index, graph), outputDir);

  if (verbose) {
    console.log(`Built source graph: ${Object.keys(entries).length} nodes, ${resolvedFacts.length} import edges, ${diagnostics.unresolved.length} unresolved`);
  }
}
