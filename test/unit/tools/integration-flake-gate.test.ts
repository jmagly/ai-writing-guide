import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_RUNS,
  main,
  parseRunCount,
  runFlakeGate,
} from '../../../tools/scripts/integration-flake-gate.mjs';

function outputBuffer() {
  let content = '';
  return {
    stream: { write: (chunk: string) => { content += chunk; } },
    read: () => content,
  };
}

function tickingClock(...values: number[]) {
  const clock = vi.fn();
  for (const value of values) clock.mockReturnValueOnce(value);
  return clock;
}

describe('integration flake gate', () => {
  it('uses fifty runs only when neither command nor environment supplies a count', () => {
    expect(parseRunCount([], {})).toBe(DEFAULT_RUNS);
    expect(DEFAULT_RUNS).toBe(50);
  });

  it('gives an explicit --runs value precedence over N', () => {
    expect(parseRunCount(['--runs', '3'], { N: 'invalid' })).toBe(3);
  });

  it('accepts a strict positive N value', () => {
    expect(parseRunCount([], { N: '12' })).toBe(12);
  });

  it.each(['0', '-1', 'nope', '2junk', '1.5', '', ' 2', '02', '9007199254740992'])(
    'rejects invalid N=%j before a gate can run',
    (value) => {
      expect(() => parseRunCount([], { N: value })).toThrow(/N must be a (safe )?positive integer/);
    },
  );

  it.each([
    { argv: ['--runs'], message: '--runs requires a positive integer value' },
    { argv: ['--runs', '0'], message: '--runs must be a positive integer' },
    { argv: ['--runs', '2junk'], message: '--runs must be a positive integer' },
    { argv: ['--runs', '2', '--runs', '3'], message: '--runs may be provided only once' },
  ])('rejects malformed command input $argv', ({ argv, message }) => {
    expect(() => parseRunCount(argv, { N: '4' })).toThrow(message);
  });

  it.each([0, -1, Number.NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an unsafe programmatic run count %s before spawning',
    (totalRuns) => {
      const spawn = vi.fn();
      expect(() => runFlakeGate({ totalRuns, spawn })).toThrow('totalRuns must be a safe positive integer');
      expect(spawn).not.toHaveBeenCalled();
    },
  );

  it('runs sequentially, invokes the exact owned lane, and reports finite statistics', () => {
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const spawn = vi.fn(() => ({ status: 0, stdout: '', stderr: '' }));
    const now = tickingClock(100, 110, 120, 130, 150, 160, 190, 200);

    const result = runFlakeGate({ totalRuns: 3, spawn, now, stdout: stdout.stream as any, stderr: stderr.stream as any });

    expect(result).toMatchObject({
      ok: true,
      status: 0,
      totalRuns: 3,
      completedRuns: 3,
      durations: [10, 20, 30],
      elapsedMs: 100,
      statistics: { min: 10, median: 20, average: 20, max: 30 },
    });
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      'npx',
      ['vitest', 'run', '--config', 'config/vitest.integration.config.js', '--reporter=dot'],
      { encoding: 'utf-8' },
    );
    expect(stdout.read()).toContain('✓ 3/3 runs passed');
    expect(stdout.read()).not.toMatch(/Infinity|NaN|undefined/);
    expect(stderr.read()).toBe('');
  });

  it('stops on the first failing child and preserves its output', () => {
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const spawn = vi.fn()
      .mockReturnValueOnce({ status: 0, stdout: 'first output', stderr: '' })
      .mockReturnValueOnce({ status: 7, stdout: 'second output', stderr: 'second error' });
    const now = tickingClock(0, 10, 20, 30, 50);

    const result = runFlakeGate({ totalRuns: 4, spawn, now, stdout: stdout.stream as any, stderr: stderr.stream as any });

    expect(result).toMatchObject({ ok: false, status: 1, completedRuns: 1, failedRun: 2, durations: [10, 20] });
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(stderr.read()).toContain('Run 2/4 FAILED');
    expect(stderr.read()).toContain('second output');
    expect(stderr.read()).toContain('second error');
    expect(stdout.read()).not.toContain('runs passed');
  });

  it('turns a thrown process error into a bounded gate failure', () => {
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const spawn = vi.fn(() => { throw new Error('spawn unavailable'); });

    const result = runFlakeGate({
      totalRuns: 2,
      spawn,
      now: tickingClock(0, 2, 5),
      stdout: stdout.stream as any,
      stderr: stderr.stream as any,
    });

    expect(result).toMatchObject({ ok: false, status: 1, completedRuns: 0, failedRun: 1 });
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(stderr.read()).toContain('process error');
    expect(stderr.read()).toContain('spawn unavailable');
  });

  it.each(['0', '-1', 'nope', '2junk'])(
    'fails closed in main for N=%j without spawning',
    (value) => {
      const stdout = outputBuffer();
      const stderr = outputBuffer();
      const spawn = vi.fn();
      const setExitCode = vi.fn();

      const result = main({
        argv: [],
        env: { N: value },
        spawn,
        stdout: stdout.stream as any,
        stderr: stderr.stream as any,
        setExitCode,
      });

      expect(result).toMatchObject({ ok: false, status: 1 });
      expect(spawn).not.toHaveBeenCalled();
      expect(setExitCode).toHaveBeenCalledExactlyOnceWith(1);
      expect(stderr.read()).toContain('must be a positive integer');
      expect(stdout.read()).toBe('');
    },
  );
});
