/**
 * Gitignore Helper Tests
 *
 * @source @src/config/gitignore.ts
 * @implements #553
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  AIWG_RUNTIME_PATTERNS,
  CLAUDE_SESSION_PATTERNS,
  PROVIDER_CONVENTIONAL_PATTERNS,
  ALL_RECOMMENDED_PATTERNS,
  checkGitignore,
  appendGitignore,
} from '../../../src/config/gitignore.js';

const execFileAsync = promisify(execFile);

describe('gitignore patterns', () => {
  it('should include AIWG runtime and private disclosure custody patterns', () => {
    expect(AIWG_RUNTIME_PATTERNS).toEqual([
      '.aiwg/working/',
      '.aiwg/.index/',
      '.aiwg/ralph/',
      '.aiwg/ralph-external/',
      '.aiwg/security-engineering/reviews/disclosures/',
    ]);
  });

  it('should NOT include .aiwg/ itself in any pattern list', () => {
    const all = [...AIWG_RUNTIME_PATTERNS, ...CLAUDE_SESSION_PATTERNS, ...PROVIDER_CONVENTIONAL_PATTERNS];
    expect(all).not.toContain('.aiwg/');
    expect(all).not.toContain('.aiwg');
  });

  it('should include .claude/settings.local.json in session patterns', () => {
    expect(CLAUDE_SESSION_PATTERNS).toContain('.claude/settings.local.json');
  });

  it('ALL_RECOMMENDED_PATTERNS should be union of the three lists', () => {
    expect(ALL_RECOMMENDED_PATTERNS).toEqual([
      ...AIWG_RUNTIME_PATTERNS,
      ...CLAUDE_SESSION_PATTERNS,
      ...PROVIDER_CONVENTIONAL_PATTERNS,
    ]);
  });
});

/** @implements #2106 */
describe('checkGitignore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'aiwg-gitignore-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns exists=false when no .gitignore present', async () => {
    const result = await checkGitignore(tempDir);
    expect(result.exists).toBe(false);
    expect(result.missing).toEqual(ALL_RECOMMENDED_PATTERNS);
  });

  it('returns empty missing lists when all patterns are present', async () => {
    const content = ALL_RECOMMENDED_PATTERNS.join('\n') + '\n';
    await writeFile(join(tempDir, '.gitignore'), content, 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.exists).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.missingRuntime).toHaveLength(0);
    expect(result.missingSession).toHaveLength(0);
    expect(result.missingProvider).toHaveLength(0);
  });

  it('detects missing runtime patterns', async () => {
    // Only session and provider patterns present
    const content = [...CLAUDE_SESSION_PATTERNS, ...PROVIDER_CONVENTIONAL_PATTERNS].join('\n') + '\n';
    await writeFile(join(tempDir, '.gitignore'), content, 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toEqual(AIWG_RUNTIME_PATTERNS);
    expect(result.missingSession).toHaveLength(0);
  });

  it('accepts patterns without trailing slash', async () => {
    // Write patterns without trailing slash
    const content = AIWG_RUNTIME_PATTERNS.map(p => p.replace(/\/$/, '')).join('\n');
    await writeFile(join(tempDir, '.gitignore'), content, 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toHaveLength(0);
  });

  it('accepts parent directory coverage', async () => {
    // .aiwg/ covers all .aiwg/* subdirectories
    await writeFile(join(tempDir, '.gitignore'), '.aiwg/\n', 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toHaveLength(0);
  });

  it('correctly categorises missing patterns', async () => {
    // Only AIWG runtime patterns present
    const content = AIWG_RUNTIME_PATTERNS.join('\n') + '\n';
    await writeFile(join(tempDir, '.gitignore'), content, 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toHaveLength(0);
    expect(result.missingSession).toEqual(CLAUDE_SESSION_PATTERNS);
    expect(result.missingProvider).toEqual(PROVIDER_CONVENTIONAL_PATTERNS);
  });

  it('uses Git resolved ignores for deny-by-default .aiwg worktrees', async () => {
    await execFileAsync('git', ['init', '--quiet'], { cwd: tempDir });
    await writeFile(join(tempDir, '.gitignore'), [
      '.aiwg/*',
      '!.aiwg/architecture/',
      '!.aiwg/architecture/**',
      '!.aiwg/aiwg.config',
      '',
    ].join('\n'), 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toHaveLength(0);
  });

  it('honours a negation that makes a runtime directory trackable', async () => {
    await execFileAsync('git', ['init', '--quiet'], { cwd: tempDir });
    await writeFile(join(tempDir, '.gitignore'), '.aiwg/*\n!.aiwg/working/\n', 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toContain('.aiwg/working/');
    expect(result.missingRuntime).not.toContain('.aiwg/ralph/');
  });

  it('honours .git/info/exclude', async () => {
    await execFileAsync('git', ['init', '--quiet'], { cwd: tempDir });
    await writeFile(join(tempDir, '.gitignore'), '', 'utf-8');
    await writeFile(join(tempDir, '.git', 'info', 'exclude'), `${AIWG_RUNTIME_PATTERNS.join('\n')}\n`, 'utf-8');

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toHaveLength(0);
  });

  it('honours core.excludesFile', async () => {
    await execFileAsync('git', ['init', '--quiet'], { cwd: tempDir });
    await writeFile(join(tempDir, '.gitignore'), '', 'utf-8');
    const excludesPath = join(tempDir, 'operator-excludes');
    await writeFile(excludesPath, `${AIWG_RUNTIME_PATTERNS.join('\n')}\n`, 'utf-8');
    await execFileAsync('git', ['config', 'core.excludesFile', excludesPath], { cwd: tempDir });

    const result = await checkGitignore(tempDir);
    expect(result.missingRuntime).toHaveLength(0);
  });
});

describe('appendGitignore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'aiwg-gitignore-append-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates .gitignore when it does not exist', async () => {
    const result = await appendGitignore(tempDir, AIWG_RUNTIME_PATTERNS);
    expect(result.created).toBe(true);
    expect(result.added).toEqual(AIWG_RUNTIME_PATTERNS);

    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    for (const p of AIWG_RUNTIME_PATTERNS) {
      expect(content).toContain(p);
    }
  });

  it('returns empty added when all patterns already present', async () => {
    const content = AIWG_RUNTIME_PATTERNS.join('\n') + '\n';
    await writeFile(join(tempDir, '.gitignore'), content, 'utf-8');

    const result = await appendGitignore(tempDir, AIWG_RUNTIME_PATTERNS);
    expect(result.added).toHaveLength(0);
    expect(result.alreadyPresent).toEqual(AIWG_RUNTIME_PATTERNS);
    expect(result.created).toBe(false);
  });

  it('appends only missing patterns to existing .gitignore', async () => {
    const initial = AIWG_RUNTIME_PATTERNS[0] + '\n';
    await writeFile(join(tempDir, '.gitignore'), initial, 'utf-8');

    const result = await appendGitignore(tempDir, AIWG_RUNTIME_PATTERNS);
    expect(result.added).toEqual(AIWG_RUNTIME_PATTERNS.slice(1));
    expect(result.alreadyPresent).toEqual([AIWG_RUNTIME_PATTERNS[0]]);

    const written = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(written).toContain(AIWG_RUNTIME_PATTERNS[1]);
    expect(written).toContain(AIWG_RUNTIME_PATTERNS[2]);
  });

  it('groups appended patterns with section comments', async () => {
    const result = await appendGitignore(tempDir, ALL_RECOMMENDED_PATTERNS);
    expect(result.added).toEqual(ALL_RECOMMENDED_PATTERNS);

    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('# AIWG — ignore only high-churn runtime subdirs');
    expect(content).toContain('# Claude Code local session state');
    expect(content).toContain('# Agentic provider conventional dirs');
  });

  it('handles file ending without newline', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'node_modules', 'utf-8'); // no trailing newline

    const result = await appendGitignore(tempDir, AIWG_RUNTIME_PATTERNS);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    // Should still have a separator before the block
    expect(content).toContain('\n');
    expect(result.added).toEqual(AIWG_RUNTIME_PATTERNS);
  });

  it('does not add .aiwg/ itself', async () => {
    const result = await appendGitignore(tempDir, ALL_RECOMMENDED_PATTERNS);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    // .aiwg/ itself should NOT be present — only runtime subdirs
    const lines = content.split('\n').map(l => l.trim());
    expect(lines).not.toContain('.aiwg/');
    expect(lines).not.toContain('.aiwg');
    expect(result.added).not.toContain('.aiwg/');
  });

  it('does not append redundant entries already covered by Git', async () => {
    await execFileAsync('git', ['init', '--quiet'], { cwd: tempDir });
    await mkdir(join(tempDir, '.aiwg'), { recursive: true });
    const original = '.aiwg/*\n!.aiwg/aiwg.config\n';
    await writeFile(join(tempDir, '.gitignore'), original, 'utf-8');

    const result = await appendGitignore(tempDir, AIWG_RUNTIME_PATTERNS);

    expect(result.added).toHaveLength(0);
    expect(result.alreadyPresent).toEqual(AIWG_RUNTIME_PATTERNS);
    expect(await readFile(join(tempDir, '.gitignore'), 'utf-8')).toBe(original);
  });
});
