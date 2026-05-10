/**
 * Artifact Index Builder
 *
 * Scans .aiwg/ directories, extracts metadata from artifact frontmatter,
 * computes checksums, extracts @-mention dependencies, and builds a
 * structured index at .aiwg/.index/.
 *
 * @implements #415
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/index-builder.test.ts
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { load as loadYaml } from 'js-yaml';
import type { MetadataEntry, ArtifactIndex, TagIndex, DependencyGraph, GraphType, TypedEdge, MetadataSupplementConfig } from './types.js';
import { INDEX_VERSION, INDEX_DIR, PHASE_DIRECTORIES, GRAPH_CONFIGS, loadUserGraphConfigs } from './types.js';
import { parseCitationSidecar, citationResultToEdges, buildRefToPathMap } from './citation-parser.js';
import { writeIndexFile, resolveIndexDir, loadGraphIndexFile } from './index-reader.js';
import { loadManifest, writeManifest, statMatches, makeEntry, type ChecksumManifest, type ManifestStats } from './checksum-manifest.js';

export interface BuildOptions {
  force?: boolean;
  verbose?: boolean;
  scope?: string;
  outputDir?: string; // Override index output directory (default: <cwd>/.aiwg/.index/)
  graph?: GraphType;  // Target a specific graph (default: project for backward compat)
  explicit?: boolean; // true when graph was requested via --graph flag; false for auto-selected defaultBuild graphs
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  try {
    const data = (loadYaml(match[1]) ?? {}) as Record<string, unknown>;
    return { data, body: match[2] };
  } catch {
    return { data: {}, body: content };
  }
}

/**
 * Extract @-mention references from content
 */
export function extractMentions(content: string): string[] {
  const mentions = new Set<string>();
  // Match @path/to/file.ext and @.aiwg/path patterns
  const pattern = /@(\.?aiwg\/[\w./-]+|[a-zA-Z][\w./-]+\.\w+)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    mentions.add(match[1]);
  }
  return Array.from(mentions);
}

/**
 * Extract title from content (first # heading or frontmatter title)
 */
function extractTitle(data: Record<string, unknown>, body: string): string {
  if (typeof data.title === 'string') return data.title;
  const headingMatch = body.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : 'Untitled';
}

/**
 * Extract canonical short name (#1233) used for exact-name search match.
 *
 * Priority:
 *   1. frontmatter `name:` field if present
 *   2. parent directory basename for skills/agents/commands/rules layouts
 *      (skills conventionally live in `<...>/skills/<name>/SKILL.md`)
 *   3. filename without extension as final fallback
 *
 * The result is the literal slug a user would type to find the artifact —
 * `aiwg-doctor`, `intake-wizard`, `flow-deploy-to-production` — preserving
 * hyphens so the scorer can match queries that contain them.
 */
function extractCanonicalName(data: Record<string, unknown>, relativePath: string): string {
  if (typeof data.name === 'string' && data.name.trim().length > 0) {
    return data.name.trim();
  }
  const filename = path.basename(relativePath);
  // For skill/agent/command/rule layouts: <type>s/<name>/<TYPE>.md
  const isCanonicalLayout = /^(SKILL|AGENT|COMMAND|RULE)\.md$/i.test(filename);
  if (isCanonicalLayout) {
    return path.basename(path.dirname(relativePath));
  }
  return filename.replace(/\.md$/i, '');
}

/**
 * Extract summary from content (first 500 chars of description or body)
 */
function extractSummary(data: Record<string, unknown>, body: string): string {
  if (typeof data.description === 'string') return data.description.slice(0, 500);
  // Skip headings, get first paragraph
  const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines.slice(0, 5).join(' ').slice(0, 500).trim();
}

/**
 * Determine SDLC phase from file path
 */
function inferPhase(filePath: string): string {
  for (const [phase, dir] of Object.entries(PHASE_DIRECTORIES)) {
    if (filePath.startsWith(dir)) return phase;
  }
  return 'other';
}

/**
 * Determine artifact type from frontmatter or filename.
 *
 * Path-based detection for AIWG artifact kinds (#1214) takes precedence
 * over the legacy basename heuristics so `agentic/code/.../skills/foo/SKILL.md`
 * always lands as `type: 'skill'` regardless of frontmatter.
 */
function inferType(data: Record<string, unknown>, filePath: string): string {
  if (typeof data.type === 'string') return data.type;

  // Normalize separators so matchers are cross-platform.
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(filePath, path.extname(filePath)).toLowerCase();

  // Nearest-type-dir-ancestor classification (#1221 audit).
  //
  // The AIWG corpus uses many different nesting depths for artifacts:
  //   frameworks/<f>/skills/<slug>/SKILL.md
  //   frameworks/<f>/extensions/<sub>/skills/<slug>/SKILL.md
  //   frameworks/<f>/templates/hermes/skills/<slug>/SKILL.md
  //   frameworks/<f>/elaboration/agents/<n>.md          (research-complete)
  //   addons/<a>/agents/<n>.md
  //   addons/<a>/prompts/agents/<n>.md                  (aiwg-utils)
  //   addons/<a>/skills/skills/SKILL.md                 (aiwg-utils self-skill)
  //   addons/<a>/templates/<n>.md
  //   addons/<a>/behaviors/<n>.md
  //   addons/<a>/hooks/<n>.md
  //   extensions/<e>/skills/<n>.md                      (flat — no slug dir)
  //   extensions/<e>/rules/<n>.md
  //   agentic/code/behaviors/<sub>/...                  (top-level behaviors)
  //
  // Walk the path segments from the file upward; the first segment matching
  // a known artifact-type directory determines the kind. This handles every
  // nested layout uniformly.
  const segments = normalized.split('/');
  const skipBasenames = new Set(['readme', 'rules-index', 'index']);
  if (!skipBasenames.has(basename) && filePath.match(/\.md$/i)) {
    // Look at directory segments only (exclude the file itself).
    for (let i = segments.length - 2; i >= 0; i--) {
      const seg = segments[i];
      switch (seg) {
        case 'skills': {
          // Skills come in two layouts:
          //   slug-style: skills/<slug>/SKILL.md  → file is SKILL.md
          //   flat-style: skills/<name>.md        → file is the artifact
          // Both classify as 'skill'. Slug-style is canonical for frameworks
          // and addons; flat is used by extensions.
          return 'skill';
        }
        case 'agents':
          return 'agent';
        case 'commands':
          return 'command';
        case 'rules':
          // Rules/RULES-INDEX.md is a curated index file, not a rule.
          if (basename === 'rules-index' || basename === 'index') break;
          return 'rule';
        case 'templates':
          return 'template';
        case 'behaviors':
          return 'behavior';
        case 'hooks':
          return 'hook';
      }
    }
  }

  // Legacy SDLC artifact heuristics (existing behavior preserved).
  if (basename.startsWith('uc-') || basename.includes('use-case')) return 'use-case';
  if (basename.startsWith('adr-') || basename.includes('adr')) return 'adr';
  if (basename.startsWith('tp-') || basename.includes('test-plan')) return 'test-plan';
  if (basename.startsWith('tc-') || basename.includes('test-case')) return 'test-case';
  if (basename.startsWith('tm-') || basename.includes('threat')) return 'threat-model';
  if (basename.startsWith('nfr-') || basename.includes('nfr')) return 'nfr';
  if (basename.includes('sad') || basename.includes('architecture')) return 'architecture';
  if (basename.includes('risk')) return 'risk';
  if (basename.includes('deploy')) return 'deployment';
  return 'document';
}

/**
 * Extract trigger phrases from a SKILL.md / agent body.
 *
 * Skills declare alternate activation phrases under a `## Triggers`
 * heading; the body typically lists them as bullet points. This
 * function pulls each bullet's leading phrase (the part before any
 * `→` arrow or em-dash explanation), lowercased and trimmed.
 *
 * Returns an empty array when no `## Triggers` section is found —
 * non-skill artifacts get `triggers: undefined` after this is wired.
 *
 * @implements #1214
 */
export function extractTriggers(body: string): string[] {
  // Find a `## Triggers` heading (case-insensitive). Capture the
  // section content until the next `## ` heading or end of file.
  // Note: avoid the multi-line `m` flag with `$` — `$` would match
  // every line terminator and stop capture at the first blank line.
  const sectionMatch = body.match(/(?:^|\n)##\s+Triggers\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!sectionMatch) return [];

  const section = sectionMatch[1];
  const phrases: string[] = [];

  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('-') && !line.startsWith('*') && !line.startsWith('+')) continue;
    // Strip the bullet marker, optional surrounding quotes, and split on
    // common explanation separators ("→", " — ", " - " when followed by
    // explanatory text).
    let phrase = line.replace(/^[-*+]\s+/, '').trim();
    // Drop any leading quote characters
    phrase = phrase.replace(/^["“”'`]+/, '').trim();
    // Cut at the first explanation separator
    const sepMatch = phrase.match(/^(.*?)\s*(?:→|—|--|\s-\s)/);
    if (sepMatch) phrase = sepMatch[1];
    // Strip trailing quotes / colons
    phrase = phrase.replace(/["“”'`:.]+\s*$/, '').trim();
    if (phrase.length === 0) continue;
    if (phrase.length > 200) continue; // Reject pathological lines
    phrases.push(phrase.toLowerCase());
  }

  return phrases;
}

/**
 * Extract a capability summary for a skill/agent/command/rule.
 *
 * Prefers the frontmatter `description` field (used uniformly across
 * AIWG SKILL.md / agent files). Falls back to the first non-heading
 * paragraph of the body. Capped at 240 chars so the index stays
 * token-tight when surfaced via `aiwg index discover`.
 *
 * @implements #1214
 */
export function extractCapability(data: Record<string, unknown>, body: string): string | undefined {
  if (typeof data.description === 'string' && data.description.trim().length > 0) {
    return data.description.trim().slice(0, 240);
  }
  // Fallback: first non-empty paragraph that isn't a heading.
  const stripped = body.replace(/^---\n[\s\S]*?\n---\n/, '');
  for (const block of stripped.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    return trimmed.replace(/\s+/g, ' ').slice(0, 240);
  }
  return undefined;
}

/**
 * Extract a SkillScriptSpec from skill frontmatter (#1227).
 *
 * The `script:` block is optional — only skills with a backing executable
 * declare it. Schema:
 *
 *   script:
 *     entrypoint: scripts/voice_loader.py   # required, relative to skill dir
 *     runtime: python3                       # required (node|python3|bash|...)
 *     cwd: project-root                      # optional, default project-root
 *     argsHint: "--voice <name> --input <path>"  # optional UX hint
 *
 * Returns undefined when the block is absent or malformed. Malformed
 * blocks are silently dropped — index builder logs a warning so authors
 * see it, but the artifact still indexes as a non-executable skill.
 */
export function extractSkillScript(
  data: Record<string, unknown>,
): import('./types.js').SkillScriptSpec | undefined {
  const raw = data.script;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const block = raw as Record<string, unknown>;
  const entrypoint = typeof block.entrypoint === 'string' ? block.entrypoint.trim() : '';
  const runtime = typeof block.runtime === 'string' ? block.runtime.trim() : '';
  if (!entrypoint || !runtime) return undefined;
  const cwdRaw = typeof block.cwd === 'string' ? block.cwd.trim() : 'project-root';
  const cwd: 'project-root' | 'skill-dir' | 'aiwg-root' =
    cwdRaw === 'skill-dir' || cwdRaw === 'aiwg-root' ? cwdRaw : 'project-root';
  const argsHint = typeof block.argsHint === 'string' ? block.argsHint.trim() : undefined;
  return {
    entrypoint,
    runtime,
    cwd,
    ...(argsHint ? { argsHint } : {}),
  };
}

/**
 * Compute truncated SHA-256 checksum (16 hex chars)
 */
function computeChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Convert Python-style named capture groups (?P<name>...) to JS-style (?<name>...)
 */
export function normalizeNamedCaptures(pattern: string): string {
  return pattern.replace(/\(\?P</g, '(?<');
}

/**
 * Build a MetadataEntry from filename regex captures instead of file content.
 * Used when graphConfig.nodeStrategy === 'filename-metadata'.
 *
 * @implements #723
 */
export function buildFilenameMetadataEntry(
  relativePath: string,
  fullPath: string,
  filenamePattern: string | undefined,
): MetadataEntry {
  const basename = path.basename(fullPath);
  let captures: Record<string, string> = {};

  if (filenamePattern) {
    const normalizedPattern = normalizeNamedCaptures(filenamePattern);
    const regex = new RegExp(normalizedPattern);
    const match = basename.match(regex);
    if (match?.groups) {
      captures = match.groups;
    }
  }

  const ref = captures.ref ? `REF-${captures.ref}` : '';
  const titleParts = [ref, captures.author, captures.year, captures.slug].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(' — ') : basename;

  // Use file stat for timestamps; checksum is based on filename (content not read)
  const stat = fs.statSync(fullPath);
  const checksum = createHash('sha256').update(basename).digest('hex').slice(0, 16);

  return {
    path: relativePath,
    type: captures.ref ? 'paper' : 'document',
    phase: 'other',
    title,
    tags: [],
    created: stat.birthtime.toISOString(),
    updated: stat.mtime.toISOString(),
    checksum,
    summary: '',
    dependencies: [],
    dependents: [],
    // Store captures as a non-standard field for downstream consumers
    ...(Object.keys(captures).length > 0 ? { captures } : {}),
  } as MetadataEntry;
}

/**
 * Apply metadata supplements — merge frontmatter fields from sidecar files.
 *
 * @implements #723
 */
function applyMetadataSupplements(
  entries: Record<string, MetadataEntry>,
  supplements: MetadataSupplementConfig[],
  cwd: string,
): void {
  for (const supplement of supplements) {
    const sidecarDir = path.join(cwd, supplement.scanDir);
    if (!fs.existsSync(sidecarDir)) continue;

    if (!supplement.matchOn || !supplement.nodeKey) continue;

    // Parse matchOn: "frontmatter.ref" -> field "ref"
    const matchField = supplement.matchOn.replace(/^frontmatter\./, '');

    // Build a map of sidecar files: matchField value -> frontmatter data
    const sidecarFiles = findArtifactFiles(sidecarDir, ['.md', '.yaml', '.json']);
    const sidecarMap = new Map<string, Record<string, unknown>>();

    for (const sidecarPath of sidecarFiles) {
      const content = fs.readFileSync(sidecarPath, 'utf-8');
      const { data } = parseFrontmatter(content);
      const matchValue = data[matchField];
      if (typeof matchValue === 'string') {
        sidecarMap.set(matchValue, data);
      }
    }

    // Match entries to sidecars and merge fields
    for (const entry of Object.values(entries)) {
      const entryCaptures = (entry as MetadataEntry & { captures?: Record<string, string> }).captures;
      if (!entryCaptures) continue;

      const nodeValue = entryCaptures[supplement.nodeKey];
      if (!nodeValue) continue;

      // Build the full ref ID for matching (e.g., captures.ref="008" -> "REF-008")
      const matchValue = supplement.nodeKey === 'ref' ? `REF-${nodeValue}` : nodeValue;
      const sidecarData = sidecarMap.get(matchValue);
      if (!sidecarData) continue;

      for (const field of supplement.mergeFields) {
        const value = sidecarData[field];
        if (value === undefined) continue;

        if (field === 'title' && typeof value === 'string') {
          entry.title = value;
        } else if (field === 'tags' && Array.isArray(value)) {
          entry.tags = [...new Set([...entry.tags, ...value.map(String)])];
        } else if (field === 'authors' && typeof value === 'string') {
          entry.summary = value;
        }
        // Other fields stored via captures — downstream consumers can access them
      }
    }
  }
}

/**
 * Recursively find all indexable files under a directory
 */
function findArtifactFiles(dir: string, extensions: string[] = ['.md', '.yaml', '.json']): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden dirs and .index
      if (entry.name.startsWith('.')) continue;
      results.push(...findArtifactFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Build the artifact index
 */
export async function buildIndex(
  cwd: string,
  options: BuildOptions = {}
): Promise<void> {
  const { force = false, verbose = false, scope, outputDir, graph, explicit = true } = options;
  const startTime = Date.now();

  // Ensure user-defined graphs are loaded
  loadUserGraphConfigs(cwd);

  // Determine scan directories based on graph type
  const graphConfig = graph ? GRAPH_CONFIGS[graph] : undefined;
  let scanDirs: string[];
  let fileExtensions: string[];

  if (scope) {
    // Explicit scope overrides graph config
    scanDirs = [path.join(cwd, scope)];
    fileExtensions = ['.md', '.yaml', '.json'];
  } else if (graphConfig) {
    scanDirs = graphConfig.scanDirs.map(d => path.join(cwd, d));
    fileExtensions = graphConfig.extensions;
  } else {
    // Default: scan .aiwg/ (backward compatible)
    scanDirs = [path.join(cwd, '.aiwg')];
    fileExtensions = ['.md', '.yaml', '.json'];
  }

  // Verify at least one scan directory exists
  const existingDirs = scanDirs.filter(d => fs.existsSync(d));
  if (existingDirs.length === 0) {
    // If this graph was auto-selected (defaultBuild) rather than explicitly requested via --graph,
    // skip gracefully — a docs-only repo should not be forced to have src/test/tools.
    if (graphConfig?.defaultBuild && !explicit) {
      const relDirs = scanDirs.map(d => path.relative(cwd, d)).join(', ');
      console.warn(`Warning: ${graph} graph: scan directories not found (${relDirs}), skipping`);
      return;
    }
    console.error(`Error: No scan directories found: ${scanDirs.join(', ')}`);
    console.log('Run this command from a project with the required directories.');
    process.exit(1);
  }

  // Determine output index directory
  let indexOutputDir: string;
  if (outputDir) {
    // Test/custom override — write to outputDir/.aiwg/.index/ (or graph subdir)
    indexOutputDir = graph
      ? path.join(outputDir, '.aiwg', '.index', graph)
      : path.join(outputDir, INDEX_DIR);
  } else if (graph) {
    indexOutputDir = resolveIndexDir(cwd, graph);
  } else {
    indexOutputDir = path.join(cwd, INDEX_DIR);
  }
  fs.mkdirSync(indexOutputDir, { recursive: true });
  // effectiveOutputCwd is used for backward-compat loadMetadataIndex calls
  const effectiveOutputCwd = outputDir ?? cwd;

  // Load existing index for incremental updates
  const existingIndex = force ? null : loadGraphIndexFile<ArtifactIndex>(effectiveOutputCwd, 'metadata.json', graph);
  const existingEntries = existingIndex?.entries ?? {};

  // Load checksum manifest for fast stat-based change detection (#794).
  // When --force is set we skip the manifest entirely and rebuild everything.
  const manifest: ChecksumManifest = force
    ? { version: 1, generated: '', entries: {} }
    : loadManifest(indexOutputDir);
  const nextManifestEntries: Record<string, import('./checksum-manifest.js').ManifestEntry> = {};
  const manifestStats: ManifestStats = {
    checked: 0,
    statSkipped: 0,
    checksumSkipped: 0,
    reindexed: 0,
    pruned: 0,
  };

  // Collect files from all scan directories
  const files: string[] = [];
  for (const dir of existingDirs) {
    files.push(...findArtifactFiles(dir, fileExtensions));
  }
  const entries: Record<string, MetadataEntry> = {};
  const tagIndex: TagIndex = {};
  const depGraph: DependencyGraph = {};

  let newCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  const useFilenameMetadata = graphConfig?.nodeStrategy === 'filename-metadata';

  for (const fullPath of files) {
    const relativePath = path.relative(cwd, fullPath);

    let entry: MetadataEntry;

    if (useFilenameMetadata) {
      // Filename-metadata strategy: derive metadata from filename, skip content read.
      // The checksum manifest doesn't help here (no content read to skip) but we still
      // preserve any existing manifest entry so cross-graph builds don't drop it.
      const checksum = createHash('sha256').update(path.basename(fullPath)).digest('hex').slice(0, 16);
      const existingManifestEntry = manifest.entries[relativePath];
      if (existingManifestEntry) {
        nextManifestEntries[relativePath] = existingManifestEntry;
      }

      // Skip unchanged files in incremental mode
      if (!force && existingEntries[relativePath]?.checksum === checksum) {
        entries[relativePath] = existingEntries[relativePath];
        unchangedCount++;
        if (verbose) console.log(`  unchanged: ${relativePath}`);
        continue;
      }

      entry = buildFilenameMetadataEntry(relativePath, fullPath, graphConfig?.filenamePattern);
    } else {
      // Default strategy: read content, parse frontmatter
      manifestStats.checked++;

      // Phase 1: stat-based quick filter — skip content read if mtime+size match manifest.
      // This is the fast path: unchanged files don't touch the filesystem beyond fs.statSync.
      const stat = fs.statSync(fullPath);
      const manifestEntry = manifest.entries[relativePath];

      if (!force && statMatches(stat, manifestEntry) && existingEntries[relativePath]?.checksum === manifestEntry?.checksum) {
        // Stat matches manifest AND the stored index entry references the same checksum.
        // Safe to reuse both without reading the file.
        entries[relativePath] = existingEntries[relativePath];
        nextManifestEntries[relativePath] = manifestEntry!;
        unchangedCount++;
        manifestStats.statSkipped++;
        if (verbose) console.log(`  unchanged (stat): ${relativePath}`);
        continue;
      }

      // Phase 2: content read + checksum verification for files that looked changed.
      const content = fs.readFileSync(fullPath, 'utf-8');
      const checksum = computeChecksum(content);

      // Skip unchanged files in incremental mode (checksum matched despite stat drift)
      if (!force && existingEntries[relativePath]?.checksum === checksum) {
        entries[relativePath] = existingEntries[relativePath];
        // Update manifest with current stat so Phase 1 succeeds next time.
        nextManifestEntries[relativePath] = makeEntry(checksum, stat);
        unchangedCount++;
        manifestStats.checksumSkipped++;
        if (verbose) console.log(`  unchanged (checksum): ${relativePath}`);
        continue;
      }

      manifestStats.reindexed++;
      nextManifestEntries[relativePath] = makeEntry(checksum, stat);
      const { data, body } = parseFrontmatter(content);
      const title = extractTitle(data, body);
      const phase = typeof data.phase === 'string' ? data.phase : inferPhase(relativePath);
      const type = inferType(data, relativePath);
      const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
      const summary = extractSummary(data, body);
      const dependencies = extractMentions(content);

      // Discovery metadata (#1214) — only meaningful for AIWG artifact
      // kinds. Kept undefined on other types so the index file stays
      // small for the common case.
      const isDiscoverable = type === 'skill' || type === 'agent' || type === 'command' || type === 'rule';
      const triggers = isDiscoverable ? extractTriggers(body) : undefined;
      const capability = isDiscoverable ? extractCapability(data, body) : undefined;
      const kernel =
        data.kernel === true || data.kernel === 'true' ? true : undefined;
      // Script entrypoint metadata is meaningful for skills only (#1227).
      const script = type === 'skill' ? extractSkillScript(data) : undefined;
      // Canonical short name (#1233) — used by the scorer to floor exact-name
      // queries to 1.0 so hyphenated kernel-skill names like `aiwg-doctor`
      // remain searchable even when the rendered title strips the hyphen.
      const name = isDiscoverable ? extractCanonicalName(data, relativePath) : undefined;

      entry = {
        path: relativePath,
        type,
        phase,
        title,
        tags,
        created: typeof data.created === 'string' ? data.created : stat.birthtime.toISOString(),
        updated: stat.mtime.toISOString(),
        checksum,
        summary,
        dependencies,
        dependents: [], // Computed after all entries are processed
        ...(name ? { name } : {}),
        ...(triggers && triggers.length > 0 ? { triggers } : {}),
        ...(capability ? { capability } : {}),
        ...(kernel ? { kernel } : {}),
        ...(script ? { script } : {}),
      };
    }

    entries[relativePath] = entry;

    if (existingEntries[relativePath]) {
      updatedCount++;
      if (verbose) console.log(`  updated: ${relativePath}`);
    } else {
      newCount++;
      if (verbose) console.log(`  new: ${relativePath}`);
    }
  }

  // Apply metadata supplements if configured (enriches filename-metadata nodes from sidecars)
  if (graphConfig?.metadataSupplements?.length) {
    applyMetadataSupplements(entries, graphConfig.metadataSupplements, cwd);
  }

  // Build tag reverse index
  for (const entry of Object.values(entries)) {
    for (const tag of entry.tags) {
      if (!tagIndex[tag]) tagIndex[tag] = [];
      tagIndex[tag].push(entry.path);
    }
  }

  // Build dependency graph and compute dependents
  for (const entry of Object.values(entries)) {
    if (!depGraph[entry.path]) {
      depGraph[entry.path] = { upstream: [], downstream: [] };
    }

    for (const dep of entry.dependencies) {
      // Normalize: check if referenced path exists in the index
      const normalizedDep = Object.keys(entries).find(
        p => p === dep || p.endsWith(dep)
      );
      if (normalizedDep && normalizedDep !== entry.path) {
        const upEdge: TypedEdge = { path: normalizedDep, type: 'depends-on' };
        depGraph[entry.path].upstream.push(upEdge);

        if (!depGraph[normalizedDep]) {
          depGraph[normalizedDep] = { upstream: [], downstream: [] };
        }
        const downEdge: TypedEdge = { path: entry.path, type: 'depends-on' };
        depGraph[normalizedDep].downstream.push(downEdge);

        // Also update the dependents field on the target entry
        if (entries[normalizedDep]) {
          entries[normalizedDep].dependents.push(entry.path);
        }
      }
    }
  }

  // Run citation sidecar edge extraction if configured
  if (graphConfig?.edgeExtraction?.parser === 'citation-sidecar') {
    // Build REF-XXX → path map from all entries with ref frontmatter
    const entryFrontmatter = new Map<string, Record<string, unknown>>();
    for (const entryPath of Object.keys(entries)) {
      const fullPath = path.join(cwd, entryPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data } = parseFrontmatter(content);
        entryFrontmatter.set(entryPath, data);
      }
    }
    const refToPath = buildRefToPathMap(entryFrontmatter);

    // Parse each entry as a citation sidecar and extract edges
    let citationEdgeCount = 0;
    for (const entryPath of Object.keys(entries)) {
      const fullPath = path.join(cwd, entryPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const result = parseCitationSidecar(content);
      if (!result) continue;

      const edges = citationResultToEdges(result, refToPath);

      if (!depGraph[entryPath]) {
        depGraph[entryPath] = { upstream: [], downstream: [] };
      }

      // Add upstream "cites" edges
      for (const edge of edges.upstream) {
        depGraph[entryPath].upstream.push(edge);
        // Add reciprocal downstream edge on the target
        if (!depGraph[edge.path]) {
          depGraph[edge.path] = { upstream: [], downstream: [] };
        }
        depGraph[edge.path].downstream.push({ path: entryPath, type: 'cites' });
        citationEdgeCount++;
      }

      // Add downstream "cited-by" edges
      for (const edge of edges.downstream) {
        depGraph[entryPath].downstream.push(edge);
        // Add reciprocal upstream edge on the source
        if (!depGraph[edge.path]) {
          depGraph[edge.path] = { upstream: [], downstream: [] };
        }
        depGraph[edge.path].upstream.push({ path: entryPath, type: 'cited-by' });
        citationEdgeCount++;
      }
    }

    if (verbose && citationEdgeCount > 0) {
      console.log(`  citation edges: ${citationEdgeCount}`);
    }
  }

  // Deduplicate dependents
  for (const entry of Object.values(entries)) {
    entry.dependents = [...new Set(entry.dependents)];
  }

  const buildTimeMs = Date.now() - startTime;

  // Write index files
  const index: ArtifactIndex = {
    version: INDEX_VERSION,
    builtAt: new Date().toISOString(),
    buildTimeMs,
    entries,
  };

  writeIndexFile(effectiveOutputCwd, 'metadata.json', index, indexOutputDir);
  writeIndexFile(effectiveOutputCwd, 'tags.json', tagIndex, indexOutputDir);
  writeIndexFile(effectiveOutputCwd, 'dependencies.json', depGraph, indexOutputDir);

  // Update and persist the checksum manifest for faster future builds (#794).
  // The next manifest contains entries for every file we processed this build.
  // Files that disappeared from disk are pruned; the resulting manifest is
  // written atomically.
  const nextManifest: ChecksumManifest = {
    version: 1,
    generated: new Date().toISOString(),
    entries: nextManifestEntries,
  };
  manifestStats.pruned = Object.keys(manifest.entries).length - Object.keys(nextManifestEntries).length;
  if (manifestStats.pruned < 0) manifestStats.pruned = 0;
  writeManifest(indexOutputDir, nextManifest);

  // Write stats
  const totalEdges = Object.values(depGraph).reduce(
    (sum, node) => sum + node.downstream.length, 0
  );
  const orphaned = Object.entries(depGraph).filter(
    ([, node]) => node.upstream.length === 0 && node.downstream.length === 0
  ).length;
  const mostReferenced = Object.entries(depGraph)
    .map(([p, node]) => ({ path: p, count: node.downstream.length }))
    .sort((a, b) => b.count - a.count)[0] ?? null;

  const byPhase: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const tagDist: Record<string, number> = {};

  for (const entry of Object.values(entries)) {
    byPhase[entry.phase] = (byPhase[entry.phase] || 0) + 1;
    byType[entry.type] = (byType[entry.type] || 0) + 1;
    for (const tag of entry.tags) {
      tagDist[tag] = (tagDist[tag] || 0) + 1;
    }
  }

  writeIndexFile(effectiveOutputCwd, 'stats.json', {
    version: INDEX_VERSION,
    builtAt: new Date().toISOString(),
    buildTimeMs,
    totalArtifacts: Object.keys(entries).length,
    byPhase,
    byType,
    tagDistribution: tagDist,
    graphMetrics: {
      totalEdges,
      orphanedArtifacts: orphaned,
      mostReferenced,
    },
  }, indexOutputDir);

  // Report
  const total = Object.keys(entries).length;
  console.log(`Artifact index built in ${buildTimeMs}ms`);
  console.log(`  Indexed ${newCount} new, updated ${updatedCount}, unchanged ${unchangedCount}`);
  console.log(`  Total: ${total} artifacts`);
  // Report manifest-driven change detection stats (only meaningful when !force
  // and we actually went through the content-read path for at least one file)
  if (!force && manifestStats.checked > 0) {
    const fastPath = manifestStats.statSkipped;
    const slowPath = manifestStats.checked - manifestStats.statSkipped;
    console.log(`  Change detection: ${manifestStats.checked} checked, ${fastPath} skipped via stat, ${slowPath} content-read, ${manifestStats.reindexed} re-indexed`);
    if (manifestStats.pruned > 0) {
      console.log(`  Pruned ${manifestStats.pruned} stale manifest entries (files no longer on disk)`);
    }
  }
  const displayDir = graph ? `${INDEX_DIR}/${graph}/` : `${INDEX_DIR}/`;
  console.log(`  Output: ${displayDir}`);
}
