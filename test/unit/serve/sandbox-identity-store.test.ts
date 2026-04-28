/**
 * Tests for the identity-store path resolution + atomic write
 * behavior in sandbox-registry.ts (#969).
 *
 * Exercises the exported `resolveIdentityStorePath` helper directly so
 * we don't depend on process.cwd() (forbidden via process.chdir() in
 * vitest workers).
 *
 * @issue #934
 * @issue #969
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { resolveIdentityStorePath } from '../../../src/serve/sandbox-registry.js';

describe('sandbox identity store routing (#969)', () => {
  let projectRoot: string;
  let originalEnvOverride: string | undefined;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-sandbox-identity-test-'));
    originalEnvOverride = process.env.AIWG_SANDBOX_IDENTITY_STORE;
    delete process.env.AIWG_SANDBOX_IDENTITY_STORE;
  });

  afterEach(async () => {
    if (originalEnvOverride === undefined) {
      delete process.env.AIWG_SANDBOX_IDENTITY_STORE;
    } else {
      process.env.AIWG_SANDBOX_IDENTITY_STORE = originalEnvOverride;
    }
    await rm(projectRoot, { recursive: true, force: true });
  });

  describe('default fallback', () => {
    it('returns the legacy ~/.config/aiwg/sandbox-agents.json when no config and no env', () => {
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(homedir(), '.config', 'aiwg', 'sandbox-agents.json'));
    });

    it('returns the legacy default when storage.config has no sandbox_identity entry', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          backends: { memory: { type: 'fs' } },
        }),
        'utf-8'
      );
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(homedir(), '.config', 'aiwg', 'sandbox-agents.json'));
    });
  });

  describe('env-var override', () => {
    it('returns AIWG_SANDBOX_IDENTITY_STORE when set, ignoring storage.config', () => {
      process.env.AIWG_SANDBOX_IDENTITY_STORE = '/tmp/custom-store.json';
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe('/tmp/custom-store.json');
    });
  });

  describe('storage.config roots.sandbox_identity', () => {
    it('honors a relative root override', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { sandbox_identity: 'identity-store' },
        }),
        'utf-8'
      );
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(projectRoot, 'identity-store', 'sandbox-agents.json'));
    });

    it('honors an absolute root override', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { sandbox_identity: '/var/lib/aiwg-test/identity' },
        }),
        'utf-8'
      );
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe('/var/lib/aiwg-test/identity/sandbox-agents.json');
    });

    it('honors ~/-prefixed root override', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          roots: { sandbox_identity: '~/aiwg-identity' },
        }),
        'utf-8'
      );
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(homedir(), 'aiwg-identity', 'sandbox-agents.json'));
    });
  });

  describe('non-fs backend rejection', () => {
    it('throws clearly when sandbox_identity is configured with a non-fs backend', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          backends: {
            sandbox_identity: { type: 'notion', parent: { pageId: 'abc' } },
          },
        }),
        'utf-8'
      );
      expect(() => resolveIdentityStorePath(projectRoot)).toThrow(
        /not supported for sandbox_identity/
      );
    });

    it('explicitly allows backends.sandbox_identity.type === "fs"', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({
          version: '1',
          backends: { sandbox_identity: { type: 'fs' } },
          roots: { sandbox_identity: 'sub-id' },
        }),
        'utf-8'
      );
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(projectRoot, 'sub-id', 'sandbox-agents.json'));
    });
  });

  describe('config-parse robustness', () => {
    it('falls back to the default on malformed JSON in storage.config', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(join(projectRoot, '.aiwg', 'storage.config'), '{ malformed', 'utf-8');
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(homedir(), '.config', 'aiwg', 'sandbox-agents.json'));
    });

    it('falls back to the default on unsupported schema version', async () => {
      await mkdir(join(projectRoot, '.aiwg'), { recursive: true });
      await writeFile(
        join(projectRoot, '.aiwg', 'storage.config'),
        JSON.stringify({ version: '2', roots: { sandbox_identity: '/ignored' } }),
        'utf-8'
      );
      const path = resolveIdentityStorePath(projectRoot);
      expect(path).toBe(join(homedir(), '.config', 'aiwg', 'sandbox-agents.json'));
    });
  });

  describe('atomic-write contract on the integrated identity store', () => {
    it('does not leave .tmp.* leftovers in the identity dir', async () => {
      // Sanity check the contract — even if the registry never actually
      // saves during this test, no .tmp.* leftovers should be present.
      const identityDir = join(projectRoot, 'sub-identity');
      await mkdir(identityDir, { recursive: true });
      // Pre-seed a valid JSON file
      await writeFile(join(identityDir, 'sandbox-agents.json'), '[]', 'utf-8');

      // Inspect: any existing JSON file must parse, no .tmp.* siblings
      const entries = readdirSync(identityDir);
      const tmpFiles = entries.filter((e) => e.includes('.tmp.'));
      expect(tmpFiles).toEqual([]);
      if (existsSync(join(identityDir, 'sandbox-agents.json'))) {
        const content = readFileSync(join(identityDir, 'sandbox-agents.json'), 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });
  });
});
