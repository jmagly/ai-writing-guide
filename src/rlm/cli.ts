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
    // File fits in one chunk — no splitting needed
    console.log(JSON.stringify({
      source: absoluteFile,
      totalLines,
      chunks: [{ index: 0, start: 0, end: totalLines - 1, lines: totalLines }],
      message: 'File fits in a single chunk, no splitting required',
    }, null, 2));
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
  let parallel = 5;
  let model = 'sonnet';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--chunks': chunksPath = args[++i]; break;
      case '--parallel': parallel = parseInt(args[++i], 10); break;
      case '--model': model = args[++i]; break;
      default:
        if (!args[i].startsWith('--')) query = args[i];
    }
  }

  if (!query || !chunksPath) {
    throw new Error('Usage: aiwg fanout <query> --chunks <dir|manifest.json> [--parallel N] [--model haiku|sonnet|opus]');
  }

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
    const relPath = path.relative(absoluteSource, file);
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
  let parallel = 5;
  let budget = 500000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source': sourceArg = args[++i]; break;
      case '--depth': depth = parseInt(args[++i], 10); break;
      case '--parallel': parallel = parseInt(args[++i], 10); break;
      case '--budget': budget = parseInt(args[++i], 10); break;
      default:
        if (!args[i].startsWith('--')) query = args[i];
    }
  }

  if (!query || !sourceArg) {
    throw new Error('Usage: aiwg rlm-search <query> --source <file|dir> [--depth N] [--parallel N] [--budget N]');
  }

  const absoluteSource = path.resolve(sourceArg);
  const prepDir = path.join(process.cwd(), '.rlm-prep');
  const indexFile = path.join(prepDir, 'index.json');

  console.log(`RLM Search: "${query}"`);
  console.log(`Source: ${absoluteSource}`);
  console.log(`Max depth: ${depth}, Max parallel: ${parallel}, Token budget: ${budget}`);
  console.log('');

  // Check if source is already prepped
  if (!fs.existsSync(indexFile)) {
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
    path.join(process.cwd(), '.aiwg', 'ralph', 'rlm-state.json'),
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
    const costFile = path.join(process.cwd(), '.aiwg', 'ralph', 'rlm-cost.json');
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
  --budget N               Token budget (default: 500000)

rlm-status options:
  --cost                   Show cost breakdown
  --tree                   Show task tree
  --json                   Output as JSON
  --task-id <id>           Show specific task

Research foundation: REF-089 (Zhang et al., 2026)
Documentation: agentic/code/addons/rlm/README.md`);
}
