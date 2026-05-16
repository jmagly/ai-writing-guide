/**
 * Unit tests for aiwg regenerate context hook emission.
 *
 * These guard the provider-facing hook files that agents load at session
 * startup: root AIWG.md, AGENTS.md, normalized .aiwg/AIWG.md, and provider
 * twins.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

vi.mock('../../../../src/cli/ui.js', () => ({
  blank: vi.fn(),
  rule: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  dim: vi.fn(),
  dimText: vi.fn((s: string) => s),
  bold: vi.fn((s: string) => s),
  brandMark: vi.fn(() => '◆'),
}));

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-regenerate-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeCtx(tmpDir: string, args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['regenerate', ...args],
    cwd: tmpDir,
    frameworkRoot: tmpDir,
  };
}

function writeConfig(tmpDir: string, providers: string[] = ['codex']): void {
  mkdirSync(join(tmpDir, '.aiwg'), { recursive: true });
  writeFileSync(join(tmpDir, '.aiwg', 'aiwg.config'), JSON.stringify({
    version: '1',
    providers,
    installed: {
      sdlc: {
        version: '2026.5.7',
        source: 'bundled',
        installedAt: '2026-05-15T00:00:00.000Z',
        deployedTo: Object.fromEntries(
          providers.map((provider) => [provider, { agents: 1, commands: 0, skills: 1, rules: 1 }]),
        ),
      },
    },
    scripts: {},
  }, null, 2));
}

describe('regenerateHandler', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('regenerates root and normalized context hooks for codex', async () => {
    const { regenerateHandler } = await import('../../../../src/cli/handlers/regenerate.js');
    writeConfig(tmpDir, ['codex']);

    const result = await regenerateHandler.execute(makeCtx(tmpDir, ['--provider', 'codex']));
    expect(result.exitCode).toBe(0);

    for (const rel of ['AIWG.md', 'AGENTS.md', '.aiwg/AIWG.md']) {
      const content = readFileSync(join(tmpDir, rel), 'utf8');
      expect(content).toContain('## Context Finalization');
      expect(content).toContain('aiwg discover');
      expect(content).toContain('aiwg show');
      expect(content).toContain('sdlc');
    }
  });

  it('regenerates Copilot instructions as a provider-facing twin', async () => {
    const { regenerateHandler } = await import('../../../../src/cli/handlers/regenerate.js');
    writeConfig(tmpDir, ['copilot']);

    const result = await regenerateHandler.execute(makeCtx(tmpDir, ['--provider', 'copilot']));
    expect(result.exitCode).toBe(0);

    const copilotPath = join(tmpDir, '.github', 'copilot-instructions.md');
    expect(existsSync(copilotPath)).toBe(true);
    const content = readFileSync(copilotPath, 'utf8');
    expect(content).toContain('## Context Finalization');
    expect(content).toContain('decline-without-search');
    expect(content).toContain('Configured providers: copilot');
  });

  it('dry-run reports normalized and provider twin targets without writing', async () => {
    const { regenerateHandler } = await import('../../../../src/cli/handlers/regenerate.js');
    writeConfig(tmpDir, ['copilot']);

    const result = await regenerateHandler.execute(makeCtx(tmpDir, ['--provider', 'copilot', '--dry-run']));
    expect(result.exitCode).toBe(0);

    expect(existsSync(join(tmpDir, 'AIWG.md'))).toBe(false);
    expect(existsSync(join(tmpDir, 'AGENTS.md'))).toBe(false);
    expect(existsSync(join(tmpDir, '.aiwg', 'AIWG.md'))).toBe(false);
    expect(existsSync(join(tmpDir, '.github', 'copilot-instructions.md'))).toBe(false);
  });
});
