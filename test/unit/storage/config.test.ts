/**
 * Tests for src/storage/config.ts
 *
 * @source @src/storage/config.ts
 * @issue #934
 * @issue #953
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadStorageConfig,
  validateStorageConfig,
  walkRejectingCredentials,
  resolveSubsystemRoot,
  storageConfigPath,
  FORBIDDEN_CREDENTIAL_KEYS,
} from '../../../src/storage/config.js';

describe('storage/config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'aiwg-storage-config-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadStorageConfig', () => {
    it('returns null when .aiwg/storage.config does not exist', async () => {
      const cfg = await loadStorageConfig(tempDir);
      expect(cfg).toBeNull();
    });

    it('loads and validates a minimal v1 config', async () => {
      await mkdir(join(tempDir, '.aiwg'), { recursive: true });
      await writeFile(
        storageConfigPath(tempDir),
        JSON.stringify({ version: '1' }),
        'utf-8'
      );
      const cfg = await loadStorageConfig(tempDir);
      expect(cfg).toEqual({ version: '1' });
    });

    it('loads roots and backends', async () => {
      await mkdir(join(tempDir, '.aiwg'), { recursive: true });
      await writeFile(
        storageConfigPath(tempDir),
        JSON.stringify({
          version: '1',
          roots: { research: '/mnt/archive/research' },
          backends: { activity_log: { type: 'fs' } },
          fallback: 'block',
        }),
        'utf-8'
      );
      const cfg = await loadStorageConfig(tempDir);
      expect(cfg?.roots?.research).toBe('/mnt/archive/research');
      expect(cfg?.backends?.activity_log).toEqual({ type: 'fs' });
      expect(cfg?.fallback).toBe('block');
    });

    it('throws on invalid JSON', async () => {
      await mkdir(join(tempDir, '.aiwg'), { recursive: true });
      await writeFile(storageConfigPath(tempDir), '{ not: json', 'utf-8');
      await expect(loadStorageConfig(tempDir)).rejects.toThrow(/Invalid JSON/);
    });
  });

  describe('validateStorageConfig — version', () => {
    it('rejects unknown schema version', () => {
      expect(() => validateStorageConfig({ version: '2' })).toThrow(/unsupported schema version/);
    });

    it('rejects missing version', () => {
      expect(() => validateStorageConfig({})).toThrow(/unsupported schema version/);
    });
  });

  describe('validateStorageConfig — credential rejection', () => {
    it.each(FORBIDDEN_CREDENTIAL_KEYS)(
      'rejects "%s" property at top level',
      (key) => {
        expect(() =>
          validateStorageConfig({ version: '1', [key]: 'bad' })
        ).toThrow(/forbidden credential property/);
      }
    );

    it('rejects credentials nested deep inside backends', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: {
            memory: {
              type: 'notion',
              parent: { pageId: 'abc' },
              token: 'leaked',
            },
          },
        })
      ).toThrow(/forbidden credential property "storage\.backends\.memory\.token"/);
    });

    it('rejects credentials at any nesting depth (deep arrays)', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: {
            memory: {
              type: 'notion',
              parent: { pageId: 'abc' },
              extras: [{ apiKey: 'leaked' }],
            },
          },
        })
      ).toThrow(/forbidden credential property/);
    });
  });

  describe('validateStorageConfig — backends', () => {
    it('accepts a valid notion backend', () => {
      const cfg = validateStorageConfig({
        version: '1',
        backends: { memory: { type: 'notion', parent: { pageId: 'page-123' } } },
      });
      expect(cfg.backends?.memory?.type).toBe('notion');
    });

    it('rejects notion without pageId or databaseId', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: { memory: { type: 'notion', parent: {} } },
        })
      ).toThrow(/parent must specify exactly one/);
    });

    it('rejects notion with both pageId and databaseId', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: {
            memory: { type: 'notion', parent: { pageId: 'a', databaseId: 'b' } },
          },
        })
      ).toThrow(/parent must specify exactly one/);
    });

    it('rejects an unknown subsystem key in backends', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: { not_a_subsystem: { type: 'fs' } },
        })
      ).toThrow(/not a known subsystem/);
    });

    it('rejects an unknown backend type', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: { memory: { type: 'mongo' } },
        })
      ).toThrow(/type must be one of/);
    });

    it('rejects fs override with missing required fields elsewhere', () => {
      expect(() =>
        validateStorageConfig({
          version: '1',
          backends: { memory: { type: 'obsidian' } },
        })
      ).toThrow(/vault must be a non-empty string/);
    });
  });

  describe('walkRejectingCredentials', () => {
    it('does nothing on a clean object', () => {
      expect(() => walkRejectingCredentials({ a: 1, b: { c: 2 } }, 'src', 'root')).not.toThrow();
    });

    it('throws with the full property path', () => {
      expect(() =>
        walkRejectingCredentials({ a: { b: { token: 'x' } } }, 'src', 'root')
      ).toThrow(/"root\.a\.b\.token"/);
    });
  });

  describe('resolveSubsystemRoot', () => {
    it('falls back to .aiwg/<default> when no override', () => {
      const root = resolveSubsystemRoot('memory', '/proj', null);
      expect(root).toBe('/proj/.aiwg/memory');
    });

    it('honors absolute root override', () => {
      const root = resolveSubsystemRoot('memory', '/proj', {
        version: '1',
        roots: { memory: '/mnt/memory' },
      });
      expect(root).toBe('/mnt/memory');
    });

    it('expands ~/ in root override', () => {
      const root = resolveSubsystemRoot('memory', '/proj', {
        version: '1',
        roots: { memory: '~/vault/memory' },
      });
      expect(root).toContain('vault/memory');
      expect(root.startsWith('/')).toBe(true);
    });

    it('treats relative override as relative to project root', () => {
      const root = resolveSubsystemRoot('memory', '/proj', {
        version: '1',
        roots: { memory: 'custom/memory' },
      });
      expect(root).toBe('/proj/custom/memory');
    });
  });
});
