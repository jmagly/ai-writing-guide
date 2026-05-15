/**
 * Unit tests for aiwg execution-mode handler.
 *
 * @source @src/cli/handlers/execution-mode.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-execution-mode-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeCtx(tmpDir: string, args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['execution-mode', ...args],
    cwd: tmpDir,
    frameworkRoot: tmpDir,
  };
}

describe('executionModeHandler', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has correct id and category', async () => {
    const { executionModeHandler } = await import('../../../../src/cli/handlers/execution-mode.js');

    expect(executionModeHandler.id).toBe('execution-mode');
    expect(executionModeHandler.category).toBe('config');
  });

  it('reports standard mode when no config exists', async () => {
    const { executionModeHandler } = await import('../../../../src/cli/handlers/execution-mode.js');

    const result = await executionModeHandler.execute(makeCtx(tmpDir));

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('Current execution mode: standard');
    expect(result.message).toContain('External calls: allowed');
  });

  it('writes strict mode with a provided seed', async () => {
    const { executionModeHandler } = await import('../../../../src/cli/handlers/execution-mode.js');

    const result = await executionModeHandler.execute(makeCtx(tmpDir, ['strict', '--seed', '42']));
    const config = JSON.parse(readFileSync(join(tmpDir, '.aiwg', 'execution-mode.json'), 'utf-8'));

    expect(result.exitCode).toBe(0);
    expect(config).toMatchObject({
      version: '1',
      mode: 'strict',
      seed: '42',
      externalCalls: 'blocked',
      pinnedVersions: true,
      decisionLog: false,
    });
  });

  it('resets to standard mode without a seed', async () => {
    const { executionModeHandler } = await import('../../../../src/cli/handlers/execution-mode.js');

    await executionModeHandler.execute(makeCtx(tmpDir, ['audit', '--seed', '99']));
    const result = await executionModeHandler.execute(makeCtx(tmpDir, ['standard']));
    const config = JSON.parse(readFileSync(join(tmpDir, '.aiwg', 'execution-mode.json'), 'utf-8'));

    expect(result.exitCode).toBe(0);
    expect(config).toMatchObject({
      mode: 'standard',
      seed: null,
      externalCalls: 'allowed',
      pinnedVersions: false,
      decisionLog: false,
    });
  });
});
