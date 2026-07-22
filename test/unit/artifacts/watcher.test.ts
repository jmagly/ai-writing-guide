/**
 * Artifact Watcher Tests
 *
 * Tests for watcher utility functions (PID management, duration parsing,
 * staleness checks). The actual filesystem watcher is integration-tested
 * separately to avoid flaky timing-based tests.
 *
 * @source @src/artifacts/watcher.ts
 * @issue #795
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getPidFilePath,
  getRunningPid,
  isIndexStale,
  parseDuration,
  stopWatcher,
} from '../../../src/artifacts/watcher.js';

const TEST_DIR = join(tmpdir(), `aiwg-watcher-test-${Date.now()}`);
const ARTIFACT_ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;
let previousArtifactEnv: Record<(typeof ARTIFACT_ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  previousArtifactEnv = {
    AIWG_ARTIFACTS_PATH: process.env.AIWG_ARTIFACTS_PATH,
    AIWG_PROJECT_ARTIFACTS_PATH: process.env.AIWG_PROJECT_ARTIFACTS_PATH,
    AIWG_PROJECT_AIWG_DIR: process.env.AIWG_PROJECT_AIWG_DIR,
  };
  for (const key of ARTIFACT_ENV_KEYS) delete process.env[key];
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  for (const key of ARTIFACT_ENV_KEYS) {
    const value = previousArtifactEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('parseDuration', () => {
  it('parses milliseconds', () => {
    expect(parseDuration('500')).toBe(500);
    expect(parseDuration('500ms')).toBe(500);
  });

  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30_000);
  });

  it('parses minutes', () => {
    expect(parseDuration('5m')).toBe(5 * 60 * 1000);
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000);
  });

  it('parses days', () => {
    expect(parseDuration('1d')).toBe(24 * 60 * 60 * 1000);
  });

  it('parses decimal values', () => {
    expect(parseDuration('1.5s')).toBe(1500);
  });

  it('returns null on invalid input', () => {
    expect(parseDuration('invalid')).toBeNull();
    expect(parseDuration('5x')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });
});

describe('getPidFilePath', () => {
  it('returns the expected path under .aiwg/.index/', () => {
    const p = getPidFilePath('/some/project');
    expect(p).toContain('.aiwg');
    expect(p).toContain('.index');
    expect(p).toContain('watcher.pid');
  });
});

describe('getRunningPid', () => {
  it('returns null when PID file does not exist', () => {
    expect(getRunningPid(TEST_DIR)).toBeNull();
  });

  it('returns null and cleans up a stale PID file', () => {
    // PID 1 is init on Unix; signal 0 check will succeed, but write a
    // definitely-stale PID instead (max PID range is typically < 4M)
    const pidFile = getPidFilePath(TEST_DIR);
    mkdirSync(join(TEST_DIR, '.aiwg', '.index'), { recursive: true });
    writeFileSync(pidFile, '99999999', 'utf-8');

    expect(getRunningPid(TEST_DIR)).toBeNull();
    expect(existsSync(pidFile)).toBe(false);
  });

  it('returns null for malformed PID file', () => {
    const pidFile = getPidFilePath(TEST_DIR);
    mkdirSync(join(TEST_DIR, '.aiwg', '.index'), { recursive: true });
    writeFileSync(pidFile, 'not a number', 'utf-8');
    expect(getRunningPid(TEST_DIR)).toBeNull();
  });

  it('returns current PID when PID file contains own process', () => {
    const pidFile = getPidFilePath(TEST_DIR);
    mkdirSync(join(TEST_DIR, '.aiwg', '.index'), { recursive: true });
    writeFileSync(pidFile, String(process.pid), 'utf-8');

    expect(getRunningPid(TEST_DIR)).toBe(process.pid);
  });
});

describe('stopWatcher', () => {
  it('returns false when no watcher is running', () => {
    expect(stopWatcher(TEST_DIR)).toBe(false);
  });

  it('returns false for stale PID file', () => {
    const pidFile = getPidFilePath(TEST_DIR);
    mkdirSync(join(TEST_DIR, '.aiwg', '.index'), { recursive: true });
    writeFileSync(pidFile, '99999999', 'utf-8');

    // stopWatcher should detect staleness via getRunningPid and return false
    expect(stopWatcher(TEST_DIR)).toBe(false);
  });
});

describe('isIndexStale', () => {
  it('returns true when index does not exist', () => {
    expect(isIndexStale(TEST_DIR, 5000)).toBe(true);
  });

  it('returns false when index was just written', () => {
    const indexDir = join(TEST_DIR, '.aiwg', '.index');
    mkdirSync(indexDir, { recursive: true });
    writeFileSync(join(indexDir, 'metadata.json'), '{}', 'utf-8');

    expect(isIndexStale(TEST_DIR, 60_000)).toBe(false);
  });

  it('returns true when file is older than max age', () => {
    const indexDir = join(TEST_DIR, '.aiwg', '.index');
    mkdirSync(indexDir, { recursive: true });
    const metaPath = join(indexDir, 'metadata.json');
    writeFileSync(metaPath, '{}', 'utf-8');

    // Set mtime to 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const fs = require('fs');
    fs.utimesSync(metaPath, oneHourAgo, oneHourAgo);

    // 1 minute threshold — file is 60x older
    expect(isIndexStale(TEST_DIR, 60_000)).toBe(true);
  });
});
