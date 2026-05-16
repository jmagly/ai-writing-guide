/**
 * Unit tests for assertRalphParallelismCap — Ralph external loop cap
 * enforcement against parallelism.max_parallel_ralph_loops.
 *
 * @source @src/cli/handlers/ralph-launcher.ts
 * @implements #1361
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  assertRalphParallelismCap,
  saveLauncherRegistry,
  type LauncherRegistry,
} from '../../../../src/cli/handlers/ralph-launcher.js';
import { emptyConfig, writeAiwgConfig } from '../../../../src/config/aiwg-config.js';
import { AiwgError } from '../../../../src/cli/errors.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-ralph-cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Build a registry with N running loops pointing at PID 1 (init, always alive
 * on Linux/macOS). PID 1 is guaranteed alive in test environments.
 */
function registryWithRunningLoops(count: number): LauncherRegistry {
  const loops: LauncherRegistry['loops'] = {};
  for (let i = 0; i < count; i++) {
    loops[`loop-${i}`] = {
      loopId: `loop-${i}`,
      pid: process.pid, // current process — guaranteed alive during the test
      objective: `fake objective ${i}`,
      completionCriteria: 'fake',
      status: 'running',
      startedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      iteration: 0,
      maxIterations: 5,
      outputFile: '/tmp/fake-out',
      sessionStdoutFile: '/tmp/fake-stdout',
      sessionStderrFile: '/tmp/fake-stderr',
      promptFile: '/tmp/fake-prompt',
    };
  }
  return { version: '1', loops };
}

describe('assertRalphParallelismCap (#1361)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    // Pre-create the registry dir
    mkdirSync(join(tmpDir, '.aiwg', 'ralph-external'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes silently when no aiwg.config exists', async () => {
    await expect(assertRalphParallelismCap(tmpDir)).resolves.toBeUndefined();
  });

  it('passes when active count is below cap', async () => {
    const cfg = emptyConfig(['claude']); // max_parallel_ralph_loops = 2
    await writeAiwgConfig(tmpDir, cfg);
    saveLauncherRegistry(tmpDir, registryWithRunningLoops(1));
    await expect(assertRalphParallelismCap(tmpDir)).resolves.toBeUndefined();
  });

  it('throws AiwgError when active count meets cap', async () => {
    const cfg = emptyConfig(['claude']); // cap = 2
    await writeAiwgConfig(tmpDir, cfg);
    saveLauncherRegistry(tmpDir, registryWithRunningLoops(2));

    await expect(assertRalphParallelismCap(tmpDir)).rejects.toThrow(AiwgError);
    await expect(assertRalphParallelismCap(tmpDir)).rejects.toThrow(
      /Project parallelism cap reached: 2\/2/,
    );
  });

  it('throws AiwgError when active count exceeds cap', async () => {
    const cfg = emptyConfig(['claude']); // cap = 2
    await writeAiwgConfig(tmpDir, cfg);
    saveLauncherRegistry(tmpDir, registryWithRunningLoops(3));

    await expect(assertRalphParallelismCap(tmpDir)).rejects.toThrow(
      /Project parallelism cap reached: 3\/2/,
    );
  });

  it('error message includes both wait and bump hints', async () => {
    const cfg = emptyConfig(['claude']);
    await writeAiwgConfig(tmpDir, cfg);
    saveLauncherRegistry(tmpDir, registryWithRunningLoops(2));

    try {
      await assertRalphParallelismCap(tmpDir);
      expect.fail('Expected AiwgError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AiwgError);
      const aiwgErr = err as AiwgError;
      expect(aiwgErr.code).toBe('ERR_RALPH_PARALLELISM_CAP');
      expect(aiwgErr.hint).toMatch(/aiwg ralph-status/);
      expect(aiwgErr.hint).toMatch(/parallelism\.max_parallel_ralph_loops/);
    }
  });

  it('honors operator override of max_parallel_ralph_loops', async () => {
    const cfg = emptyConfig(['claude']);
    cfg.parallelism = {
      max_parallel_subagents: 4,
      max_parallel_ralph_loops: 5, // operator override
      max_parallel_mc_missions: 4,
    };
    await writeAiwgConfig(tmpDir, cfg);
    saveLauncherRegistry(tmpDir, registryWithRunningLoops(4));
    // 4 active < 5 cap → passes
    await expect(assertRalphParallelismCap(tmpDir)).resolves.toBeUndefined();
  });

  it('ignores non-running loops in count', async () => {
    const cfg = emptyConfig(['claude']); // cap = 2
    await writeAiwgConfig(tmpDir, cfg);
    const registry = registryWithRunningLoops(2);
    // Mark one as completed
    registry.loops['loop-0'].status = 'completed';
    saveLauncherRegistry(tmpDir, registry);
    // Only 1 actually running → passes
    await expect(assertRalphParallelismCap(tmpDir)).resolves.toBeUndefined();
  });

  it('ignores running entries with dead PIDs', async () => {
    const cfg = emptyConfig(['claude']); // cap = 2
    await writeAiwgConfig(tmpDir, cfg);
    const registry = registryWithRunningLoops(2);
    // High PID unlikely to exist in test env — kill(pid, 0) returns ESRCH
    registry.loops['loop-0'].pid = 2147483646; // INT_MAX - 1
    saveLauncherRegistry(tmpDir, registry);
    // Only 1 actually-alive running → passes
    await expect(assertRalphParallelismCap(tmpDir)).resolves.toBeUndefined();
  });

  it('returns silently when config is malformed', async () => {
    // Write invalid JSON
    mkdirSync(join(tmpDir, '.aiwg'), { recursive: true });
    writeFileSync(join(tmpDir, '.aiwg', 'aiwg.config'), '{ not valid json', 'utf-8');
    saveLauncherRegistry(tmpDir, registryWithRunningLoops(10));
    // Malformed config → non-fatal, no throw
    await expect(assertRalphParallelismCap(tmpDir)).resolves.toBeUndefined();
  });
});
