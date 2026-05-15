import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadAffectedPackagesCsv,
  normalizeNpmPackageName,
  parseAffectedPackagesCsv,
  resolveAffectedPackagesSource,
  scanAffectedLockfile,
  scanAffectedManifest,
} from '../../../tools/lint/lib/affected-packages.js';

describe('affected package feed helpers', () => {
  it('normalizes scoped and unscoped npm package names', () => {
    expect(normalizeNpmPackageName('@scope', 'pkg')).toBe('@scope/pkg');
    expect(normalizeNpmPackageName('', 'pkg')).toBe('pkg');
  });

  it('dedupes duplicate npm rows and counts skipped ecosystems', () => {
    const parsed = parseAffectedPackagesCsv(`Ecosystem,Namespace,Name,Version,Published,Detected
npm,@scope,pkg,1.0.0,2026-05-12T00:00:00.000Z,2026-05-12T03:00:00.000Z
npm,@scope,pkg,1.0.0,2026-05-12T00:00:00.000Z,2026-05-12T04:00:00.000Z
npm,,plain,2.0.0,2026-05-12T00:00:00.000Z,2026-05-12T05:00:00.000Z
pypi,,other,9.9.9,2026-05-12T00:00:00.000Z,2026-05-12T06:00:00.000Z
`);

    expect(parsed.records.size).toBe(2);
    expect(parsed.duplicateRows).toBe(1);
    expect(parsed.skippedEcosystems.get('pypi')).toBe(1);

    const record = parsed.records.get('npm|@scope/pkg|1.0.0');
    expect(record?.firstDetected).toBe('2026-05-12T03:00:00.000Z');
    expect(record?.lastDetected).toBe('2026-05-12T04:00:00.000Z');
  });

  it('fails closed on malformed CSV rows', () => {
    expect(() =>
      parseAffectedPackagesCsv(`Ecosystem,Namespace,Name,Version,Published,Detected
npm,,broken,1.0.0,2026-05-12T00:00:00.000Z
`),
    ).toThrow(/row 2 has 5 column/);
  });
});

describe('affected package scanners', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'aiwg-affected-packages-'));
  const manifestPath = join(tempRoot, 'package.json');
  const lockfilePath = join(tempRoot, 'package-lock.json');

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('reports exact direct and transitive npm matches', () => {
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          dependencies: {
            'cross-stitch': '1.1.7',
            safe: '^2.0.0',
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      lockfilePath,
      JSON.stringify(
        {
          name: 'fixture',
          lockfileVersion: 3,
          packages: {
            '': { name: 'fixture', version: '1.0.0' },
            'node_modules/cross-stitch': { version: '1.1.7' },
            'node_modules/@scope/pkg': { name: '@scope/pkg', version: '3.5.3' },
          },
        },
        null,
        2,
      ),
    );

    const feed = parseAffectedPackagesCsv(`Ecosystem,Namespace,Name,Version,Published,Detected
npm,,cross-stitch,1.1.7,2026-05-11T23:52:17.867Z,2026-05-11T23:57:49.768Z
npm,@scope,pkg,3.5.3,2026-05-12T00:47:39.185Z,2026-05-12T02:14:34.224Z
`);

    const manifestResult = scanAffectedManifest(manifestPath, feed);
    const lockfileResult = scanAffectedLockfile(lockfilePath, feed);

    expect(manifestResult.matches).toHaveLength(1);
    expect(lockfileResult.matches).toHaveLength(2);
    expect(lockfileResult.matches.map((match) => match.name)).toContain('@scope/pkg');
  });
});

describe('affected package source loading', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('prefers explicit source values over defaults', () => {
    expect(resolveAffectedPackagesSource('https://example.test/feed.csv', '/tmp/feed.csv')).toBe(
      'https://example.test/feed.csv',
    );
  });

  it('loads a URL source such as a raw gist', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      text: async () =>
        'Ecosystem,Namespace,Name,Version,Published,Detected\nnpm,,cross-stitch,1.1.7,2026-05-11T23:52:17.867Z,2026-05-11T23:57:49.768Z\n',
    })) as typeof fetch;

    const payload = await loadAffectedPackagesCsv('https://gist.githubusercontent.com/example/raw/22-packages.csv');
    expect(payload.sourceLabel).toContain('gist.githubusercontent.com');
    expect(payload.text).toContain('cross-stitch');
  });
});
