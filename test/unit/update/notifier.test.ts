import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const notifierPath = path.resolve(import.meta.dirname, '../../../src/update/notifier.mjs');
const source = fs.readFileSync(notifierPath, 'utf8');
const { cacheMatchesPackage } = await import(notifierPath);

describe('update notifier remediation', () => {
  it('routes users through the canonical AIWG command', () => {
    expect(source).toContain('(run: aiwg update)');
    expect(source).not.toContain('(run: npm install');
  });

  it('rejects a cached notice produced by a different active package', () => {
    const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-notifier-'));
    try {
      fs.writeFileSync(
        path.join(packageRoot, 'package.json'),
        JSON.stringify({ name: 'aiwg', version: '2026.7.24' }),
      );

      expect(cacheMatchesPackage({ current: '2026.7.17' }, packageRoot)).toBe(false);
      expect(cacheMatchesPackage({ current: '2026.7.24' }, packageRoot)).toBe(true);
    } finally {
      fs.rmSync(packageRoot, { recursive: true, force: true });
    }
  });
});
