/**
 * Tests for `aiwg config get|set --project` (#1006)
 *
 * Drives the cli main() entry. Same pattern as show-project.test.ts —
 * we route via `--target <path>` because vitest workers don't allow
 * process.chdir().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
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

  describe('validate --project (#1789)', () => {
    function writeProjectConfig(issues?: Record<string, unknown>): void {
      mkdirSync(join(tmp, '.aiwg'), { recursive: true });
      writeFileSync(join(tmp, '.aiwg', 'aiwg.config'), JSON.stringify({
        version: '1',
        providers: ['codex'],
        installed: {},
        scripts: {},
        ...(issues ? { issues } : {}),
      }));
    }

    it('reports the backward-compatible fallback warning when taxonomy is absent', async () => {
      writeProjectConfig();
      await main(['validate', '--project', '--target', tmp]);
      expect(logs.join('\n')).toContain('[fallback]');
      expect(logs.join('\n')).toContain('legacy label-name behavior');
    });

    it('reports unavailable provider labels and fails without provisioning', async () => {
      writeProjectConfig({
        labels: {
          human_required: {
            name: 'hitl',
            category: 'human-interaction',
            description: 'Needs a person',
            requires_human: true,
            blocks_automation: true,
            resume_when: 'answer recorded',
          },
        },
      });

      await expect(main([
        'validate', '--project', '--target', tmp, '--provider', 'gitea',
        '--available-label', 'feature',
      ])).rejects.toMatchObject({ code: 'ERR_CONFIG_VALIDATION' });
      expect(logs.join('\n')).toContain("[unavailable] issues.labels.human_required resolves to unavailable tracker label 'hitl'");
      expect(readConfig(tmp)).toMatchObject({
        issues: { labels: { human_required: { name: 'hitl' } } },
      });
    });

    it('passes when provider-native labels are available', async () => {
      writeProjectConfig({
        labels: {
          human_required: {
            name: 'hitl',
            provider_names: { github: 'human-required' },
            category: 'human-interaction',
            description: 'Needs a person',
            requires_human: true,
            blocks_automation: true,
            resume_when: 'answer recorded',
          },
        },
      });
      await main([
        'validate', '--project', '--target', tmp, '--provider', 'github',
        '--available-label', 'human-required',
      ]);
      expect(logs.join('\n')).toContain('✓ Project config valid');
    });
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

    it('round-trips delivery identity and signing keys', async () => {
      await main(['set', '--project', 'delivery.committer.name', 'Joseph Magly', '--target', tmp]);
      await main(['set', '--project', 'delivery.committer.email', '1159087+jmagly@users.noreply.github.com', '--target', tmp]);
      await main(['set', '--project', 'delivery.signing.format', 'openpgp', '--target', tmp]);
      await main(['set', '--project', 'delivery.signing.key', '0117DAAA677A5BF2', '--target', tmp]);
      await main(['set', '--project', 'delivery.signing.enforce', 'commits', '--target', tmp]);

      const cfg = readConfig(tmp) as {
        delivery?: {
          committer?: { name?: string; email?: string };
          signing?: { format?: string; key?: string; enforce?: string };
        };
      };
      expect(cfg.delivery?.committer).toEqual({
        name: 'Joseph Magly',
        email: '1159087+jmagly@users.noreply.github.com',
      });
      expect(cfg.delivery?.signing).toMatchObject({
        format: 'openpgp',
        key: '0117DAAA677A5BF2',
        enforce: 'commits',
      });
    });

    it('round-trips tracker actor identity and validates via', async () => {
      await main(['set', '--project', 'remotes.tracker_actor.login', 'roctinam', '--target', tmp]);
      await main(['set', '--project', 'remotes.tracker_actor.via', 'tea', '--target', tmp]);
      await main(['set', '--project', 'remotes.tracker_actor.forbid_actors', 'roctibot,automation', '--target', tmp]);

      const cfg = readConfig(tmp) as {
        remotes?: { tracker_actor?: { login?: string; via?: string; forbid_actors?: string[] } };
      };
      expect(cfg.remotes?.tracker_actor).toEqual({
        login: 'roctinam',
        via: 'tea',
        forbid_actors: ['roctibot', 'automation'],
      });

      await expect(
        main(['set', '--project', 'remotes.tracker_actor.via', 'invalid-tool', '--target', tmp]),
      ).rejects.toMatchObject({
        code: 'ERR_INVALID_VALUE',
        message: expect.stringContaining('remotes.tracker_actor.via'),
      });
    });

    it('round-trips repo-maintainer local tier override and validates known tier values', async () => {
      await main(['set', '--project', 'repo_maintainer.tiers.local', 'maintainer', '--target', tmp]);

      const cfg = readConfig(tmp) as {
        repo_maintainer?: { tiers?: Record<string, string> };
      };
      expect(cfg.repo_maintainer?.tiers?.local).toBe('maintainer');

      await expect(
        main(['set', '--project', 'repo_maintainer.tiers.local', 'owner', '--target', tmp]),
      ).rejects.toMatchObject({
        code: 'ERR_INVALID_VALUE',
        message: expect.stringContaining('repo_maintainer.tiers.local'),
      });
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
