/**
 * RLM Agentic Tools CLI — Subcommand router for RLM support tools
 *
 * Subcommands:
 *   chunk <file>           — Split file into overlapping chunks for fanout
 *   fanout <query>         — Dispatch parallel subagent queries across chunks
 *   rlm-prep <file|dir>    — Prepare source content (chunk + index + manifest)
 *   rlm-search <query>     — Full recursive search pipeline
 *   rlm-status             — Show active task tree, progress, and cost
 *
 * These tools are designed for agentic sessions implementing the RLM pattern
 * (recursive decomposition + programmatic environment interaction). They are
 * also directly invocable by users.
 *
 * Research foundation: REF-089 (Zhang et al., 2026)
 *
 * @implements #559
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { projectAiwgPath } from '../config/project-artifacts.js';

/**
 * Resolve the effective `--parallel` / `--max-parallel` value for RLM CLI
 * commands, composing all applicable caps. Returns:
 *   { effective, source, clamped, hardCapHit }
 *
 * Precedence (smallest wins):
 *   1. `parallelism.max_parallel_subagents` from `.aiwg/aiwg.config` (#1359)
 *   2. The RLM Rule 8 hard cap of 7
 *   3. The user-supplied flag value (or hardcoded fallback when unset)
 *
 * When the user passes a value above the cap, we warn and clamp. When no
 * flag is passed, we use the resolved cap directly as the default — that is
 * the whole point of the project-level config.
 *
 * @implements #1360
 */
export async function resolveRlmParallel(
  userValue: number | undefined,
  fallbackDefault: number,
  projectDir: string = process.cwd(),
): Promise<{ effective: number; source: string; warning?: string }> {
  const RLM_HARD_CAP = 7;
  try {
    const { readAiwgConfig, resolveParallelism } = await import('../config/aiwg-config.js');
    const cfg = await readAiwgConfig(projectDir);
    if (!cfg) {
      // No config — fall back to user value or fallback default, still clamped to RLM hard cap
      const intended = userValue ?? fallbackDefault;
      if (intended > RLM_HARD_CAP) {
        return {
          effective: RLM_HARD_CAP,
          source: 'rlm-hard-cap',
          warning: `--parallel=${intended} clamped to ${RLM_HARD_CAP} (RLM Rule 8 hard cap)`,
        };
      }
      return { effective: intended, source: userValue !== undefined ? 'user-flag' : 'fallback-default' };
    }
    const resolved = resolveParallelism(cfg.parallelism, cfg.providers[0]);
    const providerCap = resolved.max_parallel_subagents;
    const effectiveCap = Math.min(providerCap, RLM_HARD_CAP);
    if (userValue === undefined) {
      // No flag — use the resolved cap as the default
      return { effective: effectiveCap, source: providerCap <= RLM_HARD_CAP ? 'provider-default' : 'rlm-hard-cap' };
    }
    if (userValue > effectiveCap) {
      const reason = providerCap < RLM_HARD_CAP
        ? `parallelism.max_parallel_subagents=${providerCap}`
        : `RLM Rule 8 hard cap of ${RLM_HARD_CAP}`;
      return {
        effective: effectiveCap,
        source: providerCap < RLM_HARD_CAP ? 'provider-cap-clamp' : 'rlm-hard-cap',
        warning: `--parallel=${userValue} clamped to ${effectiveCap} (${reason})`,
      };
    }
    return { effective: userValue, source: 'user-flag' };
  } catch {
    // Config read failed — fall back to user value or fallback default
    const intended = userValue ?? fallbackDefault;
    return { effective: Math.min(intended, RLM_HARD_CAP), source: 'fallback' };
  }
}

/**
 * Main CLI entry point for RLM agentic tool subcommands
 */
export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'chunk':
      await handleChunk(subArgs);
      break;

    case 'fanout':
      await handleFanout(subArgs);
      break;

    case 'rlm-prep':
      await handleRlmPrep(subArgs);
      break;

    case 'rlm-search':
      await handleRlmSearch(subArgs);
      break;

    case 'rlm-status':
      await handleRlmStatus(subArgs);
      break;

    case 'rlm-cache': {
      const { main: cacheMain } = await import('./cache/cli.js');
      await cacheMain(subArgs);
      break;
    }

    default:
      printUsage();
      if (subcommand) {
        throw new Error(`Unknown RLM subcommand: ${subcommand}`);
      }
      break;
  }
}

// ============================================================
// chunk
// ============================================================

async function handleChunk(args: string[]): Promise<void> {
  let file: string | undefined;
  let chunkSize = 2000;          // lines per chunk
  let overlapArg: number | undefined;  // resolved after chunkSize is known
  let format: 'json' | 'text' = 'json';
  let outputDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--size': chunkSize = parseInt(args[++i], 10); break;
      case '--overlap': overlapArg = parseInt(args[++i], 10); break;
      case '--format': format = args[++i] as 'json' | 'text'; break;
      case '--output': outputDir = args[++i]; break;
      default:
        if (!args[i].startsWith('--')) file = args[i];
    }
  }

  if (!file) {
    throw new Error('Usage: aiwg chunk <file> [--size N] [--overlap N] [--format json|text] [--output <dir>]');
  }

  // Default overlap is 5% of chunkSize, clamped to [0, chunkSize-1] so stride is always ≥ 1.
  const overlap = overlapArg !== undefined
    ? Math.min(overlapArg, chunkSize - 1)
    : Math.min(Math.floor(chunkSize * 0.05), chunkSize - 1);

  const absoluteFile = path.resolve(file);
  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`File not found: ${absoluteFile}`);
  }

  const content = fs.readFileSync(absoluteFile, 'utf-8');
  const rawLines = content.split('\n');
  // Remove trailing empty line produced by files ending with \n
  const lines = rawLines[rawLines.length - 1] === '' ? rawLines.slice(0, -1) : rawLines;
  const totalLines = lines.length;

  if (totalLines <= chunkSize) {
    const chunkFile = outputDir ? path.join(outputDir, 'chunk-0000.txt') : absoluteFile;
    const manifestFile = outputDir ? path.join(outputDir, 'manifest.json') : undefined;
    const chunks = [{ index: 0, start: 0, end: totalLines - 1, file: chunkFile, lines: totalLines }];
    const result = {
      source: absoluteFile,
      totalLines,
      chunkSize,
      overlap: 0,
      chunkDir: outputDir,
      chunks,
      message: 'File fits in a single chunk, no splitting required',
    };

    if (outputDir) {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(chunkFile, lines.join('\n'), 'utf-8');
      fs.writeFileSync(manifestFile!, JSON.stringify(result, null, 2), 'utf-8');
    }

    // File fits in one chunk — no splitting needed
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const chunkDir = outputDir ?? path.join(path.dirname(absoluteFile), `.rlm-chunks-${path.basename(absoluteFile)}`);
  fs.mkdirSync(chunkDir, { recursive: true });

  const chunks: { index: number; start: number; end: number; file: string; lines: number }[] = [];
  let chunkIndex = 0;
  let start = 0;

  while (start < totalLines) {
    const end = Math.min(start + chunkSize - 1, totalLines - 1);
    const chunkLines = lines.slice(start, end + 1);
    const chunkFile = path.join(chunkDir, `chunk-${String(chunkIndex).padStart(4, '0')}.txt`);

    fs.writeFileSync(chunkFile, chunkLines.join('\n'), 'utf-8');
    chunks.push({ index: chunkIndex, start, end, file: chunkFile, lines: chunkLines.length });

    chunkIndex++;
    // Advance with overlap: next chunk starts (chunkSize - overlap) lines ahead.
    // Clamp stride to at least 1 to prevent infinite loop when overlap >= chunkSize.
    const stride = Math.max(1, chunkSize - overlap);
    start += stride;
    if (start >= totalLines) break;
  }

  const manifest = {
    source: absoluteFile,
    totalLines,
    chunkSize,
    overlap,
    chunkDir,
    chunks,
    createdAt: new Date().toISOString(),
  };

  const manifestFile = path.join(chunkDir, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');

  if (format === 'json') {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(`Chunked ${absoluteFile} into ${chunks.length} chunks`);
    console.log(`Chunk directory: ${chunkDir}`);
    console.log(`Manifest: ${manifestFile}`);
    for (const chunk of chunks) {
      console.log(`  chunk-${String(chunk.index).padStart(4, '0')}: lines ${chunk.start}-${chunk.end} (${chunk.lines} lines)`);
    }
  }
}

// ============================================================
// fanout
// ============================================================

async function handleFanout(args: string[]): Promise<void> {
  let query: string | undefined;
  let chunksPath: string | undefined;
  let userParallel: number | undefined;
  let model = 'sonnet';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--chunks': chunksPath = args[++i]; break;
      case '--parallel':
      case '--max-parallel':
        userParallel = parseInt(args[++i], 10); break;
      case '--model': model = args[++i]; break;
      default:
        if (!args[i].startsWith('--')) query = args[i];
    }
  }

  if (!query || !chunksPath) {
    throw new Error('Usage: aiwg fanout <query> --chunks <dir|manifest.json> [--parallel N] [--model haiku|sonnet|opus]');
  }

  // #1360: Resolve --parallel against aiwg.config parallelism cap (warn + clamp).
  const resolved = await resolveRlmParallel(userParallel, 5);
  const parallel = resolved.effective;
  if (resolved.warning) console.warn(`⚠ ${resolved.warning}`);

  // Resolve manifest
  let manifestFile: string;
  const absoluteChunks = path.resolve(chunksPath);

  if (!fs.existsSync(absoluteChunks)) {
    throw new Error(`Manifest not found: ${absoluteChunks}. Run 'aiwg chunk' first.`);
  }

  if (fs.statSync(absoluteChunks).isDirectory()) {
    manifestFile = path.join(absoluteChunks, 'manifest.json');
  } else {
    manifestFile = absoluteChunks;
  }

  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Manifest not found: ${manifestFile}. Run 'aiwg chunk' first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  const chunks: { index: number; file: string }[] = manifest.chunks;

  console.log(`Fanout: "${query}" across ${chunks.length} chunks`);
  console.log(`Model: ${model}, Max parallel: ${parallel}`);
  console.log('');
  console.log('NOTE: This command produces a dispatch plan for the RLM agent to execute.');
  console.log('The RLM agent spawns subagents for each chunk using the Task tool.');
  console.log('');
  console.log('Dispatch plan:');

  // Output structured dispatch plan for the RLM agent
  const dispatchPlan = {
    query,
    model,
    maxParallel: parallel,
    totalChunks: chunks.length,
    waves: [] as { wave: number; chunks: { index: number; file: string }[] }[],
  };

  for (let i = 0; i < chunks.length; i += parallel) {
    const wave = chunks.slice(i, i + parallel);
    dispatchPlan.waves.push({ wave: Math.floor(i / parallel), chunks: wave });
  }

  console.log(JSON.stringify(dispatchPlan, null, 2));
}

// ============================================================
// rlm-prep
// ============================================================

async function handleRlmPrep(args: string[]): Promise<void> {
  let source: string | undefined;
  let outputDir: string | undefined;
  let strategy: 'semantic-boundary' | 'fixed-count' | 'adaptive' = 'adaptive';
  let chunkSize = 2000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output': outputDir = args[++i]; break;
      case '--strategy': strategy = args[++i] as typeof strategy; break;
      case '--size': chunkSize = parseInt(args[++i], 10); break;
      default:
        if (!args[i].startsWith('--')) source = args[i];
    }
  }

  if (!source) {
    throw new Error('Usage: aiwg rlm-prep <file|dir> [--output <dir>] [--strategy semantic-boundary|fixed-count|adaptive] [--size N]');
  }

  const absoluteSource = path.resolve(source);
  if (!fs.existsSync(absoluteSource)) {
    throw new Error(`Source not found: ${absoluteSource}`);
  }

  const prepDir = outputDir ?? path.join(process.cwd(), '.rlm-prep');
  fs.mkdirSync(prepDir, { recursive: true });

  const stat = fs.statSync(absoluteSource);
  const files: string[] = [];

  if (stat.isFile()) {
    files.push(absoluteSource);
  } else {
    // Recursively collect text files from directory
    collectFiles(absoluteSource, files);
  }

  console.log(`RLM Prep: ${files.length} file(s) from ${absoluteSource}`);
  console.log(`Strategy: ${strategy}, Chunk size: ${chunkSize} lines`);
  console.log(`Output: ${prepDir}`);
  console.log('');

  const index: {
    source: string;
    prepDir: string;
    strategy: string;
    chunkSize: number;
    files: { path: string; manifest: string; chunks: number }[];
    createdAt: string;
  } = {
    source: absoluteSource,
    prepDir,
    strategy,
    chunkSize,
    files: [],
    createdAt: new Date().toISOString(),
  };

  for (const file of files) {
    const relRoot = stat.isFile() ? path.dirname(absoluteSource) : absoluteSource;
    const relPath = path.relative(relRoot, file);
    const fileOutputDir = path.join(prepDir, relPath + '.chunks');
    fs.mkdirSync(fileOutputDir, { recursive: true });

    // Chunk this file
    await handleChunk([file, '--size', String(chunkSize), '--output', fileOutputDir, '--format', 'json']);

    const manifestFile = path.join(fileOutputDir, 'manifest.json');
    if (fs.existsSync(manifestFile)) {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
      index.files.push({ path: file, manifest: manifestFile, chunks: manifest.chunks.length });
      console.log(`  ✓ ${relPath || path.basename(file)}: ${manifest.chunks.length} chunk(s)`);
    }
  }

  const indexFile = path.join(prepDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf-8');
  console.log('');
  console.log(`Index written: ${indexFile}`);
  console.log(`Total files: ${index.files.length}`);
  console.log(`Total chunks: ${index.files.reduce((sum, f) => sum + f.chunks, 0)}`);
}

function collectFiles(dir: string, results: string[]): void {
  const SKIP_DIRS = new Set(['.git', 'node_modules', '.rlm-prep', '.rlm-chunks']);
  const TEXT_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.sh']);

  for (const entry of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, results);
    } else if (TEXT_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      results.push(full);
    }
  }
}

// ============================================================
// rlm-search
// ============================================================

async function handleRlmSearch(args: string[]): Promise<void> {
  let query: string | undefined;
  let sourceArg: string | undefined;
  let depth = 3;
  let userParallel: number | undefined;
  let budget = 500000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source': sourceArg = args[++i]; break;
      case '--depth': depth = parseInt(args[++i], 10); break;
      case '--parallel':
      case '--max-parallel':
        userParallel = parseInt(args[++i], 10);
        break;
      case '--budget': budget = parseInt(args[++i], 10); break;
      case '--help':
      case '-h':
        throw new Error('Usage: aiwg rlm-search <query> --source <file|dir> [--depth N] [--parallel N|--max-parallel N] [--budget N]');
      default:
        if (args[i].startsWith('--')) {
          throw new Error(`Unknown rlm-search option: ${args[i]}`);
        }
        if (!query) query = args[i];
    }
  }

  if (!query || !sourceArg) {
    throw new Error('Usage: aiwg rlm-search <query> --source <file|dir> [--depth N] [--parallel N|--max-parallel N] [--budget N]');
  }

  // #1360: Resolve --parallel against aiwg.config parallelism cap (warn + clamp).
  const resolvedParallel = await resolveRlmParallel(userParallel, 5);
  const parallel = resolvedParallel.effective;
  if (resolvedParallel.warning) console.warn(`⚠ ${resolvedParallel.warning}`);

  const absoluteSource = path.resolve(sourceArg);
  const prepDir = path.join(process.cwd(), '.rlm-prep');
  const indexFile = path.join(prepDir, 'index.json');

  console.log(`RLM Search: "${query}"`);
  console.log(`Source: ${absoluteSource}`);
  console.log(`Max depth: ${depth}, Max parallel: ${parallel}, Token budget: ${budget}`);
  console.log('');

  // Check if source is already prepped for this source. Older prep indexes may
  // have omitted single-chunk files, so validate file coverage before reuse.
  if (!isPrepIndexUsable(indexFile, absoluteSource)) {
    console.log('Source not prepped — running rlm-prep first...');
    await handleRlmPrep(['--output', prepDir, absoluteSource]);
    console.log('');
  }

  const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));

  console.log(`Search plan (${index.files.length} file(s), ${index.files.reduce((s: number, f: { chunks: number }) => s + f.chunks, 0)} chunks total):`);
  console.log('');
  console.log('Phase 1 — Fan out query across all chunks');
  console.log(`  Dispatch ${Math.ceil(index.files.reduce((s: number, f: { chunks: number }) => s + f.chunks, 0) / parallel)} wave(s) of up to ${parallel} parallel subagents`);
  console.log('  Each subagent: grep chunk for query, extract relevant passages');
  console.log('');
  console.log('Phase 2 — Synthesize results');
  console.log('  Collect all relevant passages from Phase 1');
  console.log('  If synthesis exceeds context: chunk passages and recurse (Phase 1 again)');
  console.log('  When fits in one context: produce final answer');
  console.log('');
  console.log('Execution plan (JSON for RLM agent):');

  const executionPlan = {
    query,
    source: absoluteSource,
    indexFile,
    maxDepth: depth,
    maxParallel: parallel,
    tokenBudget: budget,
    phases: [
      {
        phase: 1,
        name: 'fanout',
        files: index.files.map((f: { path: string; manifest: string; chunks: number }) => ({
          path: f.path,
          manifest: f.manifest,
          chunks: f.chunks,
        })),
      },
      {
        phase: 2,
        name: 'synthesize',
        description: 'Collect Phase 1 results, synthesize answer, recurse if needed',
      },
    ],
    estimatedSubAgents: index.files.reduce((s: number, f: { chunks: number }) => s + f.chunks, 0),
  };

  console.log(JSON.stringify(executionPlan, null, 2));
}

function isPrepIndexUsable(indexFile: string, absoluteSource: string): boolean {
  if (!fs.existsSync(indexFile)) return false;

  try {
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    if (index.source !== absoluteSource) return false;
    if (!Array.isArray(index.files)) return false;

    const stat = fs.statSync(absoluteSource);
    const expectedFiles: string[] = [];
    if (stat.isFile()) {
      expectedFiles.push(absoluteSource);
    } else {
      collectFiles(absoluteSource, expectedFiles);
    }

    if (index.files.length !== expectedFiles.length) return false;

    const indexed = new Set(index.files.map((f: { path: string }) => f.path));
    for (const file of expectedFiles) {
      if (!indexed.has(file)) return false;
    }

    for (const entry of index.files as { manifest: string; chunks: number }[]) {
      if (!fs.existsSync(entry.manifest)) return false;
      const manifest = JSON.parse(fs.readFileSync(entry.manifest, 'utf-8'));
      if (!Array.isArray(manifest.chunks) || manifest.chunks.length !== entry.chunks) return false;
      if (manifest.chunks.some((chunk: { file?: string }) => !chunk.file || !fs.existsSync(chunk.file))) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================
// rlm-status
// ============================================================

async function handleRlmStatus(args: string[]): Promise<void> {
  const showCost = args.includes('--cost');
  const showTree = args.includes('--tree');
  const asJson = args.includes('--json');

  let taskId: string | undefined;
  const taskIdIndex = args.indexOf('--task-id');
  if (taskIdIndex !== -1) taskId = args[taskIdIndex + 1];

  // Look for RLM state files
  const statePaths = [
    projectAiwgPath(process.cwd(), 'ralph', 'rlm-state.json'),
    path.join(process.cwd(), '.rlm-prep', 'index.json'),
  ];

  const stateFile = statePaths.find((p) => fs.existsSync(p));

  if (!stateFile) {
    const status = {
      status: 'idle',
      message: 'No active RLM task found. Start a task with `aiwg rlm-search` or `/rlm-query`.',
      checkedPaths: statePaths,
    };

    if (asJson) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('RLM Status: Idle');
      console.log('No active RLM task found.');
      console.log('Start a task with `aiwg rlm-search` or `/rlm-query`.');
    }
    return;
  }

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  if (asJson) {
    console.log(JSON.stringify({ stateFile, taskId, state }, null, 2));
    return;
  }

  console.log('RLM Status');
  console.log('══════════');
  console.log(`State file: ${stateFile}`);

  if (state.source) {
    console.log(`Source: ${state.source}`);
  }
  if (state.createdAt) {
    console.log(`Created: ${state.createdAt}`);
  }
  if (state.files) {
    console.log(`Files indexed: ${state.files.length}`);
    const totalChunks = state.files.reduce((s: number, f: { chunks: number }) => s + f.chunks, 0);
    console.log(`Total chunks: ${totalChunks}`);
  }

  if (showCost) {
    const costFile = projectAiwgPath(process.cwd(), 'ralph', 'rlm-cost.json');
    if (fs.existsSync(costFile)) {
      const cost = JSON.parse(fs.readFileSync(costFile, 'utf-8'));
      console.log('');
      console.log('Cost breakdown:');
      console.log(JSON.stringify(cost, null, 2));
    } else {
      console.log('');
      console.log('Cost tracking: No cost data available yet.');
    }
  }

  if (showTree && state.taskTree) {
    console.log('');
    console.log('Task tree:');
    printTaskTree(state.taskTree, 0);
  }
}

function printTaskTree(node: { id?: string; status?: string; children?: unknown[] }, depth: number): void {
  const indent = '  '.repeat(depth);
  const status = node.status ?? 'unknown';
  const icon = status === 'complete' ? '✓' : status === 'running' ? '⏳' : status === 'failed' ? '✗' : '○';
  console.log(`${indent}${icon} ${node.id ?? 'root'} [${status}]`);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      printTaskTree(child as { id?: string; status?: string; children?: unknown[] }, depth + 1);
    }
  }
}

// ============================================================
// Usage
// ============================================================

function printUsage(): void {
  console.log(`AIWG Agentic Tools — Support tools for RLM sessions

Usage: aiwg <tool> [options]

Tools:
  chunk <file>             Split a file into overlapping chunks for fanout
  fanout <query>           Dispatch parallel subagent queries across chunks
  rlm-prep <file|dir>      Prepare source content (chunk + index + manifest)
  rlm-search <query>       Full recursive search pipeline
  rlm-status               Show active RLM task tree, progress, and cost

chunk options:
  --size N                 Lines per chunk (default: 2000)
  --overlap N              Overlap lines between chunks (default: 100)
  --format json|text       Output format (default: json)
  --output <dir>           Output directory for chunks

fanout options:
  --chunks <dir|manifest>  Chunk directory or manifest.json (required)
  --parallel N             Max parallel subagents (default: 5)
  --model haiku|sonnet|opus Model tier for subagents (default: sonnet)

rlm-prep options:
  --output <dir>           Output directory (default: .rlm-prep)
  --strategy <s>           semantic-boundary | fixed-count | adaptive (default: adaptive)
  --size N                 Lines per chunk (default: 2000)

rlm-search options:
  --source <file|dir>      Source to search (required)
  --depth N                Max recursion depth (default: 3)
  --parallel N             Max parallel subagents per wave (default: 5)
  --max-parallel N         Alias for --parallel
  --budget N               Token budget (default: 500000)

rlm-status options:
  --cost                   Show cost breakdown
  --tree                   Show task tree
  --json                   Output as JSON
  --task-id <id>           Show specific task

Research foundation: REF-089 (Zhang et al., 2026)
Documentation: agentic/code/addons/rlm/README.md`);
}
