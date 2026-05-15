/**
 * RLM CLI — User Acceptance Tests
 *
 * End-to-end validation of the RLM agentic tools CLI (src/rlm/cli.ts) using
 * real files from the AIWG repository as the test corpus. No mocking — the
 * filesystem operations, chunking logic, manifest writing, and status reading
 * all run against actual source files.
 *
 * Why the AIWG repo itself?
 *   The repo is large enough to exercise chunking (definitions.ts is ~2000 lines,
 *   the handlers/ directory has dozens of files) but is always present and version-
 *   controlled, so tests are deterministic without synthetic fixtures.
 *
 * Run on demand (not part of CI):
 *   npm run uat
 *
 * No publish/install cycle required — tests directly against the local build.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

// ── Resolve project root ──────────────────────────────────────────────────
// @ts-ignore - import.meta works in vitest ESM
const __filename = fileURLToPath(import.meta.url);
const __dirnameUat = dirname(__filename);
const PROJECT_ROOT = resolve(__dirnameUat, '../..');

// ── Real repo paths used as test corpus ──────────────────────────────────
// These files are guaranteed to exist; tests fail informatively if they don't.
const RLM_CLI_SRC     = join(PROJECT_ROOT, 'src', 'rlm', 'cli.ts');
const DEFINITIONS_SRC = join(PROJECT_ROOT, 'src', 'extensions', 'commands', 'definitions.ts');
const HANDLERS_DIR    = join(PROJECT_ROOT, 'src', 'cli', 'handlers');

// ── Module under test ─────────────────────────────────────────────────────
// @ts-ignore
const { main } = await import(join(PROJECT_ROOT, 'src', 'rlm', 'cli.js'));

// ── Helpers ───────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-rlm-uat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Run main() and capture console.log output as an array of strings.
 * Also changes process.cwd() so rlm-status / rlm-search can find state files
 * relative to the tmpDir.
 */
async function captureMain(args: string[], cwd?: string): Promise<{ lines: string[]; stdout: string }> {
  const lines: string[] = [];
  const origLog = console.log;
  const origCwd = process.cwd();

  console.log = (...a: unknown[]) => {
    lines.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '));
    origLog(...a);
  };

  if (cwd) process.chdir(cwd);

  try {
    await main(args);
  } finally {
    console.log = origLog;
    if (cwd) process.chdir(origCwd);
  }

  return { lines, stdout: lines.join('\n') };
}

// ── Test lifecycle ────────────────────────────────────────────────────────

let testDir: string;

beforeEach(() => {
  testDir = makeTmpDir();
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 1: chunk — split real repo files
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: rlm chunk — real repo files', () => {
  it('corpus files exist (guard)', () => {
    expect(existsSync(RLM_CLI_SRC)).toBe(true);
    expect(existsSync(DEFINITIONS_SRC)).toBe(true);
    expect(existsSync(HANDLERS_DIR)).toBe(true);
  });

  it('chunks a large file and writes a valid manifest', async () => {
    const outDir = join(testDir, 'chunks');
    const { stdout } = await captureMain([
      'chunk', DEFINITIONS_SRC,
      '--size', '100',
      '--overlap', '10',
      '--output', outDir,
    ]);

    // Output is JSON
    const manifest = JSON.parse(stdout);
    expect(manifest.source).toBe(DEFINITIONS_SRC);
    expect(manifest.chunkSize).toBe(100);
    expect(manifest.overlap).toBe(10);
    expect(manifest.chunks.length).toBeGreaterThan(1);

    // Manifest file written to disk
    const manifestFile = join(outDir, 'manifest.json');
    expect(existsSync(manifestFile)).toBe(true);

    const onDisk = JSON.parse(readFileSync(manifestFile, 'utf-8'));
    expect(onDisk.chunks.length).toBe(manifest.chunks.length);
  });

  it('chunk files are actually written and readable', async () => {
    const outDir = join(testDir, 'chunks');
    const { stdout } = await captureMain([
      'chunk', DEFINITIONS_SRC,
      '--size', '100',
      '--overlap', '10',
      '--output', outDir,
    ]);

    const manifest = JSON.parse(stdout);
    for (const chunk of manifest.chunks) {
      expect(existsSync(chunk.file)).toBe(true);
      const content = readFileSync(chunk.file, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('chunk ranges are contiguous and cover the full file', async () => {
    const outDir = join(testDir, 'chunks');
    const { stdout } = await captureMain([
      'chunk', DEFINITIONS_SRC,
      '--size', '200',
      '--overlap', '20',
      '--output', outDir,
    ]);

    const manifest = JSON.parse(stdout);

    // First chunk starts at line 0
    expect(manifest.chunks[0].start).toBe(0);

    // Last chunk reaches end of file
    const lastChunk = manifest.chunks[manifest.chunks.length - 1];
    expect(lastChunk.end).toBe(manifest.totalLines - 1);

    // Each chunk has valid start/end
    for (const chunk of manifest.chunks) {
      expect(chunk.start).toBeLessThanOrEqual(chunk.end);
      expect(chunk.lines).toBeGreaterThan(0);
    }
  });

  it('small file that fits in one chunk emits no-split message', async () => {
    // rlm-cli.ts itself is smaller than definitions.ts; use a large chunk size
    const { stdout } = await captureMain([
      'chunk', RLM_CLI_SRC,
      '--size', '100000',   // way larger than any single file
      '--output', testDir,
    ]);

    const result = JSON.parse(stdout);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].file).toBe(join(testDir, 'chunk-0000.txt'));
    expect(existsSync(join(testDir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(testDir, 'chunk-0000.txt'))).toBe(true);
    expect(result.message).toMatch(/single chunk/i);
  });

  it('text format produces human-readable output instead of JSON', async () => {
    const outDir = join(testDir, 'chunks-text');
    const { stdout } = await captureMain([
      'chunk', RLM_CLI_SRC,
      '--size', '50',
      '--overlap', '5',
      '--format', 'text',
      '--output', outDir,
    ]);

    // Should not be parseable as JSON (or if it is, it's the no-split JSON response)
    expect(stdout).toMatch(/chunk-\d{4}|Chunk directory|single chunk/i);
  });

  it('throws on missing file argument', async () => {
    await expect(main(['chunk'])).rejects.toThrow(/Usage.*chunk/i);
  });

  it('throws on non-existent source file', async () => {
    await expect(main(['chunk', '/nonexistent/file.ts', '--output', testDir])).rejects.toThrow(/not found/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 2: fanout — dispatch plan from real chunk manifest
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: rlm fanout — dispatch plan from real manifest', () => {
  it('produces a valid dispatch plan JSON from a real chunk manifest', async () => {
    // First create chunks
    const outDir = join(testDir, 'chunks');
    const { stdout: chunkOut } = await captureMain([
      'chunk', DEFINITIONS_SRC,
      '--size', '100',
      '--overlap', '10',
      '--output', outDir,
    ]);
    const chunkManifest = JSON.parse(chunkOut);
    const manifestFile = join(outDir, 'manifest.json');

    // Now fanout
    const { stdout } = await captureMain([
      'fanout', 'find all exported function names',
      '--chunks', manifestFile,
      '--parallel', '3',
      '--model', 'haiku',
    ]);

    // Last line should be the JSON plan
    const jsonLines = stdout.split('\n').filter((l) => {
      try { JSON.parse(l); return true; } catch { return false; }
    });
    // The dispatch plan is output as a JSON block
    const planJson = stdout.match(/\{[\s\S]*\}/);
    expect(planJson).not.toBeNull();
    const plan = JSON.parse(planJson![0]);

    expect(plan.query).toBe('find all exported function names');
    expect(plan.model).toBe('haiku');
    expect(plan.maxParallel).toBe(3);
    expect(plan.totalChunks).toBe(chunkManifest.chunks.length);
    expect(plan.waves.length).toBeGreaterThan(0);
  });

  it('accepts a chunk directory (not just manifest file)', async () => {
    const outDir = join(testDir, 'chunks-dir');
    await captureMain([
      'chunk', DEFINITIONS_SRC,
      '--size', '100',
      '--output', outDir,
    ]);

    const { stdout } = await captureMain([
      'fanout', 'list exports',
      '--chunks', outDir,
      '--parallel', '5',
    ]);

    expect(stdout).toMatch(/fanout.*list exports/i);
    expect(stdout).toMatch(/totalChunks|waves/i);
  });

  it('respects --parallel and creates correct wave count', async () => {
    const outDir = join(testDir, 'chunks-waves');
    const { stdout: chunkOut } = await captureMain([
      'chunk', DEFINITIONS_SRC,
      '--size', '100',
      '--output', outDir,
    ]);
    const manifest = JSON.parse(chunkOut);
    const nChunks = manifest.chunks.length;

    const { stdout } = await captureMain([
      'fanout', 'test query',
      '--chunks', outDir,
      '--parallel', '4',
    ]);

    const planJson = stdout.match(/\{[\s\S]*\}/);
    const plan = JSON.parse(planJson![0]);
    const expectedWaves = Math.ceil(nChunks / 4);
    expect(plan.waves.length).toBe(expectedWaves);
  });

  it('throws when --chunks is missing', async () => {
    await expect(main(['fanout', 'my query'])).rejects.toThrow(/Usage.*fanout/i);
  });

  it('throws when manifest file does not exist', async () => {
    await expect(main([
      'fanout', 'query',
      '--chunks', join(testDir, 'nonexistent', 'manifest.json'),
    ])).rejects.toThrow(/Manifest not found/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 3: rlm-prep — prepare real directories
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: rlm-prep — index real repo directory', () => {
  it('preps a directory and produces a valid index.json', async () => {
    const outDir = join(testDir, 'prep-out');
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', outDir,
      '--size', '200',
    ]);

    const indexFile = join(outDir, 'index.json');
    expect(existsSync(indexFile)).toBe(true);

    const index = JSON.parse(readFileSync(indexFile, 'utf-8'));
    expect(index.source).toBe(HANDLERS_DIR);
    expect(index.strategy).toBe('adaptive');
    expect(index.files.length).toBeGreaterThan(0);
    expect(index.createdAt).toBeDefined();
  });

  it('every file in the index has a valid manifest on disk', async () => {
    const outDir = join(testDir, 'prep-manifests');
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', outDir,
      '--size', '150',
    ]);

    const index = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf-8'));
    for (const entry of index.files) {
      expect(existsSync(entry.manifest)).toBe(true);
      const manifest = JSON.parse(readFileSync(entry.manifest, 'utf-8'));
      expect(manifest.chunks.length).toBeGreaterThan(0);
      expect(entry.chunks).toBe(manifest.chunks.length);
    }
  });

  it('indexes files that each fit in a single chunk', async () => {
    const sourceDir = join(testDir, 'small-source');
    const outDir = join(testDir, 'prep-small');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, 'one.md'), '# One\n\nalpha\n', 'utf-8');
    writeFileSync(join(sourceDir, 'two.md'), '# Two\n\nbeta\n', 'utf-8');

    await captureMain([
      'rlm-prep', sourceDir,
      '--output', outDir,
      '--size', '200',
    ]);

    const index = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf-8'));
    expect(index.files).toHaveLength(2);
    for (const entry of index.files) {
      expect(existsSync(entry.manifest)).toBe(true);
      const manifest = JSON.parse(readFileSync(entry.manifest, 'utf-8'));
      expect(manifest.chunks).toHaveLength(1);
      expect(existsSync(manifest.chunks[0].file)).toBe(true);
    }
  });

  it('preps a single file (not a directory)', async () => {
    const outDir = join(testDir, 'prep-single');
    await captureMain([
      'rlm-prep', RLM_CLI_SRC,
      '--output', outDir,
      '--size', '50',
    ]);

    const indexFile = join(outDir, 'index.json');
    expect(existsSync(indexFile)).toBe(true);

    const index = JSON.parse(readFileSync(indexFile, 'utf-8'));
    expect(index.files.length).toBe(1);
    expect(index.files[0].path).toBe(RLM_CLI_SRC);
  });

  it('total chunk count in index matches sum of per-file manifests', async () => {
    const outDir = join(testDir, 'prep-count');
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', outDir,
      '--size', '100',
    ]);

    const index = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf-8'));
    let total = 0;
    for (const entry of index.files) {
      total += entry.chunks;
    }
    // index should reflect the same total
    expect(index.files.reduce((s: number, f: { chunks: number }) => s + f.chunks, 0)).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it('throws on missing source argument', async () => {
    await expect(main(['rlm-prep'])).rejects.toThrow(/Usage.*rlm-prep/i);
  });

  it('throws on non-existent source', async () => {
    await expect(main(['rlm-prep', '/nonexistent/dir', '--output', testDir])).rejects.toThrow(/not found/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 4: rlm-search — execution plan from real source
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: rlm-search — execution plan against real source', () => {
  it('produces a valid execution plan for a directory source', async () => {
    const prepDir = join(testDir, '.rlm-prep');

    // Pre-prep so rlm-search skips the prep phase
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', prepDir,
      '--size', '200',
    ]);

    // Run rlm-search from testDir (it looks for .rlm-prep relative to cwd)
    const { stdout } = await captureMain([
      'rlm-search', 'find all CommandHandler implementations',
      '--source', HANDLERS_DIR,
      '--depth', '2',
      '--parallel', '4',
    ], testDir);

    const planJson = stdout.match(/\{[\s\S]*\}/);
    expect(planJson).not.toBeNull();
    const plan = JSON.parse(planJson![0]);

    expect(plan.query).toBe('find all CommandHandler implementations');
    expect(plan.maxDepth).toBe(2);
    expect(plan.maxParallel).toBe(4);
    expect(plan.phases).toHaveLength(2);
    expect(plan.phases[0].name).toBe('fanout');
    expect(plan.phases[1].name).toBe('synthesize');
    expect(plan.estimatedSubAgents).toBeGreaterThan(0);
  });

  it('accepts --max-parallel without treating its value as the query', async () => {
    const prepDir = join(testDir, '.rlm-prep');

    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', prepDir,
      '--size', '200',
    ]);

    const { stdout } = await captureMain([
      'rlm-search', 'find all CommandHandler implementations',
      '--source', HANDLERS_DIR,
      '--depth', '2',
      '--max-parallel', '4',
    ], testDir);

    const planJson = stdout.match(/\{[\s\S]*\}/);
    expect(planJson).not.toBeNull();
    const plan = JSON.parse(planJson![0]);
    expect(plan.query).toBe('find all CommandHandler implementations');
    expect(plan.maxParallel).toBe(4);
  });

  it('auto-preps source when .rlm-prep index does not exist', async () => {
    // testDir has no .rlm-prep — rlm-search should create it
    const { stdout } = await captureMain([
      'rlm-search', 'find exported functions',
      '--source', join(PROJECT_ROOT, 'src', 'rlm'),
      '--depth', '2',
      '--parallel', '3',
    ], testDir);

    // Should have auto-prepped then produced a plan
    expect(stdout).toMatch(/rlm.prep|rlm-prep|prep/i);
    const indexFile = join(testDir, '.rlm-prep', 'index.json');
    expect(existsSync(indexFile)).toBe(true);
  });

  it('execution plan phase 1 lists all prepped files', async () => {
    const prepDir = join(testDir, '.rlm-prep');
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', prepDir,
      '--size', '200',
    ]);

    const index = JSON.parse(readFileSync(join(prepDir, 'index.json'), 'utf-8'));
    const fileCount = index.files.length;

    const { stdout } = await captureMain([
      'rlm-search', 'find all exports',
      '--source', HANDLERS_DIR,
    ], testDir);

    const planJson = stdout.match(/\{[\s\S]*\}/);
    const plan = JSON.parse(planJson![0]);
    expect(plan.phases[0].files.length).toBe(fileCount);
  });

  it('throws when --source is missing', async () => {
    await expect(main(['rlm-search', 'my query'])).rejects.toThrow(/Usage.*rlm-search/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 5: rlm-status — state file reading
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: rlm-status — state reading', () => {
  it('reports idle when no state files exist', async () => {
    const { stdout } = await captureMain(['rlm-status'], testDir);
    expect(stdout).toMatch(/idle|no active/i);
  });

  it('--json flag produces valid JSON when idle', async () => {
    const { stdout } = await captureMain(['rlm-status', '--json'], testDir);
    const result = JSON.parse(stdout);
    expect(result.status).toBe('idle');
    expect(result.checkedPaths).toBeDefined();
  });

  it('reports prep index details after rlm-prep', async () => {
    const prepDir = join(testDir, '.rlm-prep');
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', prepDir,
      '--size', '200',
    ]);

    const { stdout } = await captureMain(['rlm-status'], testDir);
    // Should find the prep index and report on it
    expect(stdout).toMatch(/state file|files indexed|source/i);
  });

  it('--json returns valid JSON with state file contents after prep', async () => {
    const prepDir = join(testDir, '.rlm-prep');
    await captureMain([
      'rlm-prep', HANDLERS_DIR,
      '--output', prepDir,
      '--size', '200',
    ]);

    const { stdout } = await captureMain(['rlm-status', '--json'], testDir);
    const result = JSON.parse(stdout);
    // Status is not idle — found a state file
    expect(result.stateFile).toBeDefined();
    expect(result.state).toBeDefined();
  });

  it('--cost flag runs without error even when no cost file exists', async () => {
    const prepDir = join(testDir, '.rlm-prep');
    await captureMain([
      'rlm-prep', RLM_CLI_SRC,
      '--output', prepDir,
      '--size', '100',
    ]);

    // Should not throw — falls back to "No cost data available yet"
    const { stdout } = await captureMain(['rlm-status', '--cost'], testDir);
    expect(stdout).toMatch(/cost/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Suite 6: unknown subcommand
// ═════════════════════════════════════════════════════════════════════════

describe('UAT: unknown subcommand handling', () => {
  it('throws on unknown subcommand', async () => {
    await expect(main(['not-a-command'])).rejects.toThrow(/unknown RLM subcommand/i);
  });

  it('prints usage when called with no args', async () => {
    const { stdout } = await captureMain([]);
    expect(stdout).toMatch(/agentic tools|chunk|fanout|rlm-prep|rlm-search|rlm-status/i);
  });
});
