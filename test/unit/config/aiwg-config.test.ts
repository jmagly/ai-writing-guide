/**
 * Unit tests for project-level aiwg.config management
 *
 * @source @src/config/aiwg-config.ts
 * @implements #621
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import {
  emptyConfig,
  getConfigPath,
  readAiwgConfig,
  writeAiwgConfig,
  updateInstalled,
  hashManifest,
  migrateLegacyRegistry,
  resolveRemotes,
  resolveRemoteProvider,
} from '../../../src/config/aiwg-config.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-config-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('aiwg-config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── emptyConfig ────────────────────────────────────────────────────────────

  describe('emptyConfig', () => {
    it('returns a valid config with default claude provider', () => {
      const cfg = emptyConfig();
      expect(cfg.version).toBe('1');
      expect(cfg.providers).toEqual(['claude']);
      expect(cfg.installed).toEqual({});
      expect(cfg.scripts).toEqual({});
    });

    it('accepts custom providers', () => {
      const cfg = emptyConfig(['claude', 'copilot']);
      expect(cfg.providers).toEqual(['claude', 'copilot']);
    });

    it('includes $schema', () => {
      const cfg = emptyConfig();
      expect(cfg.$schema).toMatch(/aiwg\.io/);
    });
  });

  // ── getConfigPath ──────────────────────────────────────────────────────────

  describe('getConfigPath', () => {
    it('returns .aiwg/aiwg.config inside the project dir', () => {
      const p = getConfigPath('/some/project');
      expect(p).toBe(resolve('/some/project', '.aiwg', 'aiwg.config'));
    });
  });

  // ── readAiwgConfig / writeAiwgConfig ───────────────────────────────────────

  describe('readAiwgConfig', () => {
    it('returns null when config does not exist', async () => {
      const result = await readAiwgConfig(tmpDir);
      expect(result).toBeNull();
    });

    it('reads and parses a valid config', async () => {
      const cfg = emptyConfig(['claude', 'cursor']);
      await writeAiwgConfig(tmpDir, cfg);

      const read = await readAiwgConfig(tmpDir);
      expect(read).not.toBeNull();
      expect(read!.providers).toEqual(['claude', 'cursor']);
      expect(read!.version).toBe('1');
    });

    it('fills in missing optional fields for forward-compat', async () => {
      const dir = join(tmpDir, '.aiwg');
      mkdirSync(dir, { recursive: true });
      // Write minimal config without optional fields
      writeFileSync(join(dir, 'aiwg.config'), JSON.stringify({ version: '1' }));

      const read = await readAiwgConfig(tmpDir);
      expect(read!.providers).toEqual(['claude']);
      expect(read!.installed).toEqual({});
      expect(read!.scripts).toEqual({});
    });

    it('round-trips scripts intact', async () => {
      const cfg = emptyConfig();
      cfg.scripts = { deploy: 'aiwg use all', doctor: 'aiwg doctor' };
      await writeAiwgConfig(tmpDir, cfg);

      const read = await readAiwgConfig(tmpDir);
      expect(read!.scripts).toEqual({ deploy: 'aiwg use all', doctor: 'aiwg doctor' });
    });
  });

  describe('writeAiwgConfig', () => {
    it('creates .aiwg/ directory if it does not exist', async () => {
      const nested = join(tmpDir, 'subproject');
      mkdirSync(nested);

      await writeAiwgConfig(nested, emptyConfig());

      const read = await readAiwgConfig(nested);
      expect(read).not.toBeNull();
    });

    it('writes pretty-printed JSON with trailing newline', async () => {
      await writeAiwgConfig(tmpDir, emptyConfig());
      const { readFileSync } = await import('fs');
      const raw = readFileSync(getConfigPath(tmpDir), 'utf-8');
      expect(raw).toMatch(/^\{/);
      expect(raw.endsWith('\n')).toBe(true);
      // Ensure it's multi-line (pretty-printed)
      expect(raw.split('\n').length).toBeGreaterThan(3);
    });
  });

  // ── updateInstalled ────────────────────────────────────────────────────────

  describe('updateInstalled', () => {
    it('adds a new entry when none exists', () => {
      const cfg = emptyConfig();
      const updated = updateInstalled(cfg, 'sdlc', 'claude', { agents: 5, commands: 3, skills: 2, rules: 1 }, {
        version: '2026.3.4',
        source: 'bundled',
      });

      expect(updated.installed['sdlc']).toBeDefined();
      expect(updated.installed['sdlc'].version).toBe('2026.3.4');
      expect(updated.installed['sdlc'].source).toBe('bundled');
      expect(updated.installed['sdlc'].deployedTo['claude']).toEqual({ agents: 5, commands: 3, skills: 2, rules: 1 });
    });

    it('updates existing entry with new counts', () => {
      const cfg = emptyConfig();
      updateInstalled(cfg, 'sdlc', 'claude', { agents: 5, commands: 3, skills: 2, rules: 1 }, {
        version: '2026.3.4',
        source: 'bundled',
      });

      const updated = updateInstalled(cfg, 'sdlc', 'copilot', { agents: 5, commands: 3, skills: 2, rules: 1 }, {
        version: '2026.3.5',
        source: 'bundled',
      });

      expect(updated.installed['sdlc'].deployedTo['claude']).toBeDefined();
      expect(updated.installed['sdlc'].deployedTo['copilot']).toBeDefined();
      expect(updated.installed['sdlc'].version).toBe('2026.3.5');
    });

    it('stores manifestHash when provided', () => {
      const cfg = emptyConfig();
      const updated = updateInstalled(cfg, 'sdlc', 'claude', { agents: 5, commands: 3, skills: 2, rules: 1 }, {
        version: '2026.3.4',
        source: 'bundled',
        manifestHash: 'sha256:abc123',
      });

      expect(updated.installed['sdlc'].manifestHash).toBe('sha256:abc123');
    });

    it('does not overwrite manifestHash when not provided in opts', () => {
      const cfg = emptyConfig();
      updateInstalled(cfg, 'sdlc', 'claude', { agents: 5, commands: 3, skills: 2, rules: 1 }, {
        version: '2026.3.4',
        source: 'bundled',
        manifestHash: 'sha256:original',
      });

      const updated = updateInstalled(cfg, 'sdlc', 'copilot', { agents: 5, commands: 3, skills: 2, rules: 1 }, {
        version: '2026.3.5',
        source: 'bundled',
        // no manifestHash
      });

      // Should keep original since new opts didn't provide one
      expect(updated.installed['sdlc'].manifestHash).toBe('sha256:original');
    });
  });

  // ── hashManifest ───────────────────────────────────────────────────────────

  describe('hashManifest', () => {
    it('returns a sha256 hash for an existing file', async () => {
      const manifestPath = join(tmpDir, 'manifest.json');
      writeFileSync(manifestPath, '{"name":"test","version":"1.0"}');

      const hash = await hashManifest(manifestPath);
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('returns undefined for a missing file', async () => {
      const hash = await hashManifest(join(tmpDir, 'nonexistent.json'));
      expect(hash).toBeUndefined();
    });

    it('returns different hashes for different content', async () => {
      const path1 = join(tmpDir, 'a.json');
      const path2 = join(tmpDir, 'b.json');
      writeFileSync(path1, '{"version":"1"}');
      writeFileSync(path2, '{"version":"2"}');

      const h1 = await hashManifest(path1);
      const h2 = await hashManifest(path2);
      expect(h1).not.toBe(h2);
    });

    it('returns the same hash for identical content', async () => {
      const p = join(tmpDir, 'stable.json');
      writeFileSync(p, '{"version":"1"}');

      const h1 = await hashManifest(p);
      const h2 = await hashManifest(p);
      expect(h1).toBe(h2);
    });
  });

  // ── migrateLegacyRegistry ─────────────────────────────────────────────────

  describe('migrateLegacyRegistry', () => {
    it('returns config unchanged when no legacy registry exists', async () => {
      const cfg = emptyConfig();
      const result = await migrateLegacyRegistry(tmpDir, cfg);
      expect(result.installed).toEqual({});
    });

    it('migrates framework entries from legacy registry.json', async () => {
      const legacyDir = join(tmpDir, '.aiwg', 'frameworks');
      mkdirSync(legacyDir, { recursive: true });
      writeFileSync(join(legacyDir, 'registry.json'), JSON.stringify({
        frameworks: [
          { id: 'sdlc-complete', version: '2026.1.0', installed: '2026-01-15T00:00:00.000Z' },
          { id: 'media-marketing-kit', version: '2026.1.0' },
        ],
      }));

      const cfg = emptyConfig();
      const result = await migrateLegacyRegistry(tmpDir, cfg);

      expect(result.installed['sdlc']).toBeDefined();
      expect(result.installed['sdlc'].version).toBe('2026.1.0');
      expect(result.installed['sdlc'].installedAt).toBe('2026-01-15T00:00:00.000Z');
      expect(result.installed['media-marketing']).toBeDefined();
    });

    it('normalizes legacy IDs: strips -complete and -kit suffixes', async () => {
      const legacyDir = join(tmpDir, '.aiwg', 'frameworks');
      mkdirSync(legacyDir, { recursive: true });
      writeFileSync(join(legacyDir, 'registry.json'), JSON.stringify({
        frameworks: [
          { id: 'research-complete' },
          { id: 'media-marketing-kit' },
        ],
      }));

      const cfg = emptyConfig();
      const result = await migrateLegacyRegistry(tmpDir, cfg);

      expect(result.installed['research']).toBeDefined();
      expect(result.installed['media-marketing']).toBeDefined();
      expect(result.installed['research-complete']).toBeUndefined();
      expect(result.installed['media-marketing-kit']).toBeUndefined();
    });

    it('does not overwrite existing installed entries', async () => {
      const legacyDir = join(tmpDir, '.aiwg', 'frameworks');
      mkdirSync(legacyDir, { recursive: true });
      writeFileSync(join(legacyDir, 'registry.json'), JSON.stringify({
        frameworks: [{ id: 'sdlc-complete', version: '2026.1.0' }],
      }));

      const cfg = emptyConfig();
      cfg.installed['sdlc'] = {
        version: '2026.3.4',
        source: 'bundled',
        installedAt: '2026-03-01T00:00:00.000Z',
        deployedTo: {},
      };

      const result = await migrateLegacyRegistry(tmpDir, cfg);

      // Should not overwrite the existing entry
      expect(result.installed['sdlc'].version).toBe('2026.3.4');
    });
  });

  // ── resolveRemotes (#994) ──────────────────────────────────────────────────

  describe('resolveRemotes', () => {
    it('returns origin defaults when remotes is undefined', () => {
      const r = resolveRemotes(undefined);
      expect(r).toEqual({
        primary: 'origin',
        issue_tracker: 'origin',
        ci: 'origin',
        secondary: [],
      });
    });

    it('returns origin defaults for an empty block', () => {
      const r = resolveRemotes({});
      expect(r.primary).toBe('origin');
      expect(r.issue_tracker).toBe('origin');
      expect(r.ci).toBe('origin');
      expect(r.secondary).toEqual([]);
    });

    it('inherits issue_tracker and ci from primary when unset', () => {
      const r = resolveRemotes({ primary: 'gitea' });
      expect(r.primary).toBe('gitea');
      expect(r.issue_tracker).toBe('gitea');
      expect(r.ci).toBe('gitea');
    });

    it('keeps explicit issue_tracker and ci values', () => {
      const r = resolveRemotes({
        primary: 'origin',
        issue_tracker: 'gitea',
        ci: 'jenkins',
      });
      expect(r.issue_tracker).toBe('gitea');
      expect(r.ci).toBe('jenkins');
    });

    it('preserves secondary remotes', () => {
      const r = resolveRemotes({
        secondary: [
          { name: 'github', purpose: 'public-mirror', push_on_release: true },
        ],
      });
      expect(r.secondary).toHaveLength(1);
      expect(r.secondary[0]).toMatchObject({
        name: 'github',
        purpose: 'public-mirror',
        push_on_release: true,
      });
    });
  });

  // ── resolveRemoteProvider (#997) ───────────────────────────────────────────

  describe('resolveRemoteProvider', () => {
    it('returns unknown for an empty URL', () => {
      expect(resolveRemoteProvider('')).toBe('unknown');
    });

    it('detects github.com over https', () => {
      expect(resolveRemoteProvider('https://github.com/jmagly/aiwg.git')).toBe('github');
    });

    it('detects github.com over ssh', () => {
      expect(resolveRemoteProvider('git@github.com:jmagly/aiwg.git')).toBe('github');
    });

    it('detects gitlab.com', () => {
      expect(resolveRemoteProvider('https://gitlab.com/group/repo.git')).toBe('gitlab');
    });

    it('detects self-hosted gitlab', () => {
      expect(resolveRemoteProvider('https://gitlab.example.com/group/repo.git')).toBe('gitlab');
    });

    it('detects gitea by hostname substring', () => {
      expect(resolveRemoteProvider('https://gitea.example.org/owner/repo.git')).toBe('gitea');
      expect(resolveRemoteProvider('git@gitea.local:owner/repo.git')).toBe('gitea');
    });

    it('returns unknown for self-hosted instances without telling hostname', () => {
      expect(resolveRemoteProvider('https://git.example.com/owner/repo.git')).toBe('unknown');
    });

    it('does not misclassify github fork urls in a path segment', () => {
      // Path-only "github" (without being the host) should not match
      expect(resolveRemoteProvider('https://example.com/github/repo.git')).toBe('unknown');
    });
  });

  describe('readAiwgConfig with remotes block', () => {
    it('round-trips a config containing remotes', async () => {
      const cfg = emptyConfig();
      cfg.remotes = {
        primary: 'origin',
        secondary: [{ name: 'github', purpose: 'public-mirror' }],
      };
      await writeAiwgConfig(tmpDir, cfg);

      const read = await readAiwgConfig(tmpDir);
      expect(read?.remotes?.primary).toBe('origin');
      expect(read?.remotes?.secondary?.[0]?.name).toBe('github');
    });
  });
});
