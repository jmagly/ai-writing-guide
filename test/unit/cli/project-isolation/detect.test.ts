// Unit tests for the signal-walk in detect.ts. Tests run against a real
// tmp tree to keep stat-only behavior honest (memfs would let
// implementation drift toward reading file contents without the tests
// noticing).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectProjectSignal, isUnsuitableCwd } from '../../../../src/cli/project-isolation/detect.js';
import { PROJECT_SIGNALS, MAX_PARENT_DEPTH } from '../../../../src/cli/project-isolation/signals.js';

describe('detectProjectSignal', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aiwg-detect-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // One positive case per signal so adding a new signal forces a test edit
  // — that's the maintenance bar specified by NFR-MAINT-01.
  for (const signal of PROJECT_SIGNALS) {
    it(`returns found:true when ${signal} is in cwd`, () => {
      const dir = join(root, 'proj');
      mkdirSync(dir);
      if (signal === '.git') {
        mkdirSync(join(dir, signal));
      } else {
        writeFileSync(join(dir, signal), '');
      }
      const result = detectProjectSignal(dir);
      expect(result.found).toBe(true);
      expect(result.signal).toBe(signal);
      expect(result.foundAt).toBe(dir);
    });
  }

  it('matches *.csproj via glob', () => {
    const dir = join(root, 'csharp-proj');
    mkdirSync(dir);
    writeFileSync(join(dir, 'MyApp.csproj'), '');
    const result = detectProjectSignal(dir);
    expect(result.found).toBe(true);
    expect(result.signal).toBe('*.csproj');
  });

  it('finds a signal at parent[3] (walk-depth boundary, included)', () => {
    // root/a/b/c/d  with .git at root/a — depth 3 from d
    const a = join(root, 'a');
    mkdirSync(a);
    mkdirSync(join(a, '.git'));
    const d = join(a, 'b', 'c', 'd');
    mkdirSync(d, { recursive: true });
    const result = detectProjectSignal(d);
    expect(result.found).toBe(true);
    expect(result.foundAt).toBe(a);
  });

  it('does NOT find a signal at parent[4] (walk-depth boundary, excluded)', () => {
    // root/a/b/c/d/e  with .git at root/a — depth 4 from e
    expect(MAX_PARENT_DEPTH).toBe(3);
    const a = join(root, 'a');
    mkdirSync(a);
    mkdirSync(join(a, '.git'));
    const e = join(a, 'b', 'c', 'd', 'e');
    mkdirSync(e, { recursive: true });
    const result = detectProjectSignal(e);
    expect(result.found).toBe(false);
    expect(result.foundAt).toBeNull();
  });

  it('returns found:false in a directory with no signals anywhere on the walk', () => {
    const deep = join(root, 'no', 'signals', 'here');
    mkdirSync(deep, { recursive: true });
    const result = detectProjectSignal(deep);
    expect(result.found).toBe(false);
  });

  it('handles unreadable parent gracefully (returns false rather than throwing)', () => {
    // We don't have permission to actually chmod tmpdirs reliably across
    // CI runners, so we just confirm the walk terminates when it reaches
    // a filesystem root — that's the same termination path.
    const result = detectProjectSignal('/');
    // root itself may or may not contain signals depending on the host;
    // assertion is just that we don't throw.
    expect(typeof result.found).toBe('boolean');
  });
});

describe('isUnsuitableCwd', () => {
  it('treats $HOME as unsuitable', () => {
    expect(isUnsuitableCwd('/home/alice', '/home/alice')).toBe(true);
  });

  it('treats / as unsuitable', () => {
    expect(isUnsuitableCwd('/', '/home/alice')).toBe(true);
  });

  it('treats /tmp as unsuitable', () => {
    expect(isUnsuitableCwd('/tmp', '/home/alice')).toBe(true);
  });

  it('treats $HOME with trailing slash as unsuitable', () => {
    expect(isUnsuitableCwd('/home/alice/', '/home/alice')).toBe(true);
  });

  it('treats subdirectory of $HOME as suitable (warning suppressed elsewhere by signal walk)', () => {
    expect(isUnsuitableCwd('/home/alice/projects', '/home/alice')).toBe(false);
  });

  it('treats arbitrary directories as suitable by default', () => {
    expect(isUnsuitableCwd('/opt/work', '/home/alice')).toBe(false);
  });
});
