/**
 * Tests for `aiwg config get|set --project` (#1006)
 *
 * Drives the cli main() entry. Same pattern as show-project.test.ts —
 * we route via `--target <path>` because vitest workers don't allow
 * process.chdir().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { main } from '../../../src/config/cli.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-getset-project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readConfig(dir: string): Record<string, unknown> {
  const raw = readFileSync(join(dir, '.aiwg', 'aiwg.config'), 'utf-8');
  return JSON.parse(raw);
}

describe('aiwg config get|set --project (#1006)', () => {
  let tmp: string;
  let logs: string[];
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = makeTmpDir();
    logs = [];
    consoleSpy = vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(typeof msg === 'string' ? msg : JSON.stringify(msg));
    });
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('set --project', () => {
    it('creates a new config when none exists, with the dotted path applied', async () => {
      await main(['set', '--project', 'delivery.mode', 'pr-required', '--target', tmp]);
      const cfg = readConfig(tmp);
      expect((cfg as { delivery?: { mode?: string } }).delivery?.mode).toBe('pr-required');
      expect(logs.join('\n')).toContain('Set --project delivery.mode = pr-required');
    });

    it('rejects an invalid enum value with a clear hint', async () => {
      await expect(
        main(['set', '--project', 'delivery.mode', 'banana', '--target', tmp]),
      ).rejects.toMatchObject({
        code: 'ERR_INVALID_VALUE',
        message: expect.stringContaining('delivery.mode'),
      });
    });

    it('coerces boolean fields from "true"/"false" strings', async () => {
      await main(['set', '--project', 'delivery.require_signed_commits', 'true', '--target', tmp]);
      const cfg = readConfig(tmp);
      expect((cfg as { delivery?: { require_signed_commits?: unknown } }).delivery?.require_signed_commits).toBe(true);
    });

    it('rejects non-boolean values for boolean fields', async () => {
      await expect(
        main(['set', '--project', 'delivery.require_ci_green', 'maybe', '--target', tmp]),
      ).rejects.toMatchObject({ code: 'ERR_INVALID_VALUE' });
    });

    it('preserves unrelated fields on partial update', async () => {
      // First write — establishes baseline shape
      await main(['set', '--project', 'delivery.mode', 'pr-required', '--target', tmp]);
      // Second write — different field
      await main(['set', '--project', 'delivery.merge_style', 'squash', '--target', tmp]);

      const cfg = readConfig(tmp);
      const delivery = (cfg as { delivery: { mode: string; merge_style: string } }).delivery;
      expect(delivery.mode).toBe('pr-required');
      expect(delivery.merge_style).toBe('squash');
    });

    it('writes nested paths like remotes.primary', async () => {
      await main(['set', '--project', 'remotes.primary', 'gitea', '--target', tmp]);
      const cfg = readConfig(tmp);
      expect((cfg as { remotes?: { primary?: string } }).remotes?.primary).toBe('gitea');
    });
  });

  describe('get --project', () => {
    it('errors when no project config exists', async () => {
      await expect(
        main(['get', '--project', 'delivery.mode', '--target', tmp]),
      ).rejects.toMatchObject({ code: 'ERR_NO_PROJECT_CONFIG' });
    });

    it('prints (not set) for an unset path', async () => {
      // Create config first so we have something to read
      await main(['set', '--project', 'delivery.mode', 'pr-required', '--target', tmp]);
      logs.length = 0;
      await main(['get', '--project', 'delivery.merge_style', '--target', tmp]);
      expect(logs.join('\n')).toContain('(not set)');
    });

    it('prints a scalar value as a plain string', async () => {
      await main(['set', '--project', 'delivery.mode', 'direct', '--target', tmp]);
      logs.length = 0;
      await main(['get', '--project', 'delivery.mode', '--target', tmp]);
      expect(logs.join('\n').trim()).toBe('direct');
    });

    it('prints an object as pretty JSON', async () => {
      await main(['set', '--project', 'delivery.mode', 'pr-required', '--target', tmp]);
      logs.length = 0;
      await main(['get', '--project', 'delivery', '--target', tmp]);
      const out = logs.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toMatchObject({ mode: 'pr-required' });
    });
  });
});
