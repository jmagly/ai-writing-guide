/**
 * Unit tests for parallelism-section — context-file injector for the
 * project parallelism cap.
 *
 * @source @src/smiths/context-pipeline/parallelism-section.ts
 * @implements #1362
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  buildParallelismSection,
  replaceOrAppendParallelismBlock,
  PARALLELISM_BLOCK_START,
  PARALLELISM_BLOCK_END,
} from '../../../src/smiths/context-pipeline/parallelism-section.js';
import { emptyConfig, writeAiwgConfig } from '../../../src/config/aiwg-config.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-parallelism-section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('buildParallelismSection (#1362)', () => {
  let tmpDir: string;
  const originalEnv = process.env.AIWG_HIDE_PARALLELISM_IN_CONTEXT;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    delete process.env.AIWG_HIDE_PARALLELISM_IN_CONTEXT;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    if (originalEnv !== undefined) {
      process.env.AIWG_HIDE_PARALLELISM_IN_CONTEXT = originalEnv;
    } else {
      delete process.env.AIWG_HIDE_PARALLELISM_IN_CONTEXT;
    }
  });

  it('returns empty when no aiwg.config exists', async () => {
    const section = await buildParallelismSection(tmpDir);
    expect(section).toBe('');
  });

  it('returns empty when AIWG_HIDE_PARALLELISM_IN_CONTEXT=1 is set', async () => {
    process.env.AIWG_HIDE_PARALLELISM_IN_CONTEXT = '1';
    await writeAiwgConfig(tmpDir, emptyConfig(['claude']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toBe('');
  });

  it('includes provider-default labeling for claude', async () => {
    await writeAiwgConfig(tmpDir, emptyConfig(['claude']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('## Parallelism Cap');
    expect(section).toContain('max_parallel_subagents');
    expect(section).toContain('4 (provider default for claude)');
    expect(section).toContain('2 (provider default for claude)'); // ralph loops
  });

  it('includes provider-default labeling for codex', async () => {
    await writeAiwgConfig(tmpDir, emptyConfig(['codex']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('10 (provider default for codex)');
    expect(section).toContain('3 (provider default for codex)'); // ralph loops
  });

  it('labels operator-overridden values', async () => {
    const cfg = emptyConfig(['claude']);
    cfg.parallelism = {
      max_parallel_subagents: 8, // override (claude default is 4)
      max_parallel_ralph_loops: 2,
      max_parallel_mc_missions: 4,
    };
    await writeAiwgConfig(tmpDir, cfg);
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('8 (operator override)');
    // Non-overridden fields keep the provider-default label
    expect(section).toContain('2 (provider default for claude)');
  });

  it('includes rationale when present', async () => {
    const cfg = emptyConfig(['claude']);
    cfg.parallelism = {
      max_parallel_subagents: 4,
      max_parallel_ralph_loops: 2,
      max_parallel_mc_missions: 4,
      rationale: 'Anthropic Team plan',
    };
    await writeAiwgConfig(tmpDir, cfg);
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('*Rationale*: Anthropic Team plan');
  });

  it('wraps content in managed-block markers', async () => {
    await writeAiwgConfig(tmpDir, emptyConfig(['claude']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain(PARALLELISM_BLOCK_START);
    expect(section).toContain(PARALLELISM_BLOCK_END);
    expect(section.indexOf(PARALLELISM_BLOCK_START)).toBeLessThan(
      section.indexOf(PARALLELISM_BLOCK_END),
    );
  });

  it('includes the MIN-of-caps composition guidance', async () => {
    await writeAiwgConfig(tmpDir, emptyConfig(['claude']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('take the MIN of');
    expect(section).toContain('AIWG_CONTEXT_WINDOW');
    expect(section).toContain('framework-specific caps');
    expect(section).toContain('natural task decomposition');
    expect(section).toContain('aiwg config set --project');
  });

  it('emits the wrapper selection rubric and primary-agent responsibilities', async () => {
    await writeAiwgConfig(tmpDir, emptyConfig(['codex']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('assess whether it contains independent, bounded subtasks');
    expect(section).toContain('aiwg-model-efficiency-worker');
    expect(section).toContain('aiwg-model-coding-worker');
    expect(section).toContain('aiwg-model-reasoning-worker');
    expect(section).toContain('The primary agent retains orchestration');
    expect(section).toContain('native custom subagents');
  });

  it('documents no-delegation edge cases', async () => {
    await writeAiwgConfig(tmpDir, emptyConfig(['claude']));
    const section = await buildParallelismSection(tmpDir);
    expect(section).toContain('trivial work');
    expect(section).toContain('tightly coupled changes');
    expect(section).toContain('serial dependencies');
    expect(section).toContain('collide in shared state');
    expect(section).toContain('coordination costs');
  });

  it.each([
    ['warp', 'model selection is global/run-scoped'],
    ['hermes', 'model selection is global/run-scoped'],
    ['windsurf', 'portable subagent model selection is unsupported'],
    ['openhuman', 'wrapper roles compile to OpenHuman agent definitions'],
  ])('qualifies provider delegation for %s', async (provider, expected) => {
    await writeAiwgConfig(tmpDir, emptyConfig([provider]));
    expect(await buildParallelismSection(tmpDir)).toContain(expected);
  });
});

describe('replaceOrAppendParallelismBlock (#1362)', () => {
  const FAKE_SECTION = [
    PARALLELISM_BLOCK_START,
    '## Parallelism Cap',
    'fake',
    PARALLELISM_BLOCK_END,
    '',
  ].join('\n');

  it('appends section to content with no existing block', () => {
    const original = '# Some doc\n\nbody content';
    const result = replaceOrAppendParallelismBlock(original, FAKE_SECTION);
    expect(result).toContain('# Some doc');
    expect(result).toContain(PARALLELISM_BLOCK_START);
    expect(result.endsWith(FAKE_SECTION)).toBe(true);
  });

  it('replaces existing block in-place', () => {
    const original = `# Doc\n${PARALLELISM_BLOCK_START}\nOLD\n${PARALLELISM_BLOCK_END}\n\nrest of doc`;
    const result = replaceOrAppendParallelismBlock(original, FAKE_SECTION);
    expect(result).not.toContain('OLD');
    expect(result).toContain('fake');
    expect(result).toContain('rest of doc');
    // Block appears exactly once
    const startMatches = result.split(PARALLELISM_BLOCK_START).length - 1;
    expect(startMatches).toBe(1);
  });

  it('strips existing block when new section is empty', () => {
    const original = `# Doc\n\n${PARALLELISM_BLOCK_START}\nOLD\n${PARALLELISM_BLOCK_END}\n\nrest`;
    const result = replaceOrAppendParallelismBlock(original, '');
    expect(result).not.toContain(PARALLELISM_BLOCK_START);
    expect(result).not.toContain(PARALLELISM_BLOCK_END);
    expect(result).toContain('# Doc');
    expect(result).toContain('rest');
  });

  it('returns content unchanged when no block and section is empty', () => {
    const original = '# Doc\n\nbody';
    const result = replaceOrAppendParallelismBlock(original, '');
    expect(result).toBe(original);
  });

  it('preserves content before and after a regenerated block', () => {
    const original = `# Doc\nintro\n\n${PARALLELISM_BLOCK_START}\nOLD\n${PARALLELISM_BLOCK_END}\n\noutro`;
    const result = replaceOrAppendParallelismBlock(original, FAKE_SECTION);
    expect(result).toMatch(/^# Doc\nintro/);
    expect(result).toContain('outro');
  });
});
