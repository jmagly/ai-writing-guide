import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const notifierPath = path.resolve(import.meta.dirname, '../../../src/update/notifier.mjs');
const source = fs.readFileSync(notifierPath, 'utf8');
const binSource = fs.readFileSync(
  path.resolve(import.meta.dirname, '../../../bin/aiwg.mjs'),
  'utf8',
);
const {
  cacheMatchesPackage,
  formatUpdateNotice,
  noticeIsRateLimited,
  notificationDisabled,
} = await import(notifierPath);

describe('update notifier remediation', () => {
  it('routes users through the canonical AIWG command', () => {
    expect(source).toContain('Update: aiwg update');
    expect(source).toContain('Then rerun your command.');
    expect(source).not.toContain('(run: npm install');
    expect(source).not.toContain('process.argv.slice');
  });

  it('formats rerun guidance without reproducing command arguments', () => {
    expect(formatUpdateNotice('2026.8.19', '2026.8.24')).toBe(
      'aiwg: update available 2026.8.19 → 2026.8.24\n' +
      'Update: aiwg update\n' +
      'Then rerun your command.\n',
    );
  });

  it.each(['stable', 'prerelease', 'edge', 'development', 'source', 'package', 'lightweight'])(
    'uses the canonical install-aware command for %s installations',
    () => {
      expect(formatUpdateNotice('2026.8.19', '2026.8.24')).toContain('Update: aiwg update\n');
    },
  );

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

  it('bootstraps before fast paths, channel handling, and startup failures', () => {
    const bootstrap = binSource.indexOf('await runUpdateNotifierBootstrap()');
    expect(bootstrap).toBeGreaterThan(-1);
    expect(bootstrap).toBeLessThan(binSource.indexOf('if (maybeHandleFastVersion'));
    expect(bootstrap).toBeLessThan(binSource.indexOf("if (args[0] === '--use-main'"));
    expect(bootstrap).toBeLessThan(binSource.indexOf('await resolveRouterPath()'));
    expect(bootstrap).toBeLessThan(binSource.indexOf('assertCanonicalInstallation({'));
    expect(binSource.match(/maybePrintNotice\(/g)).toHaveLength(1);
    expect(binSource.match(/scheduleBackgroundCheck\(/g)).toHaveLength(1);
  });

  it.each([
    'CI',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'NO_UPDATE_NOTIFIER',
    'AIWG_NO_UPDATE_CHECK',
  ])('suppresses notification when %s is enabled', (name) => {
    expect(notificationDisabled({ [name]: '1' }, true)).toBe(true);
    expect(notificationDisabled({ [name]: 'false' }, true)).toBe(false);
  });

  it('suppresses non-TTY output and allows an eligible terminal', () => {
    expect(notificationDisabled({}, false)).toBe(true);
    expect(notificationDisabled({}, true)).toBe(false);
  });

  it('rate-limits repeated notices and recovers from malformed timestamps', () => {
    const now = Date.parse('2026-08-25T12:00:00.000Z');
    const interval = 86_400_000;
    expect(noticeIsRateLimited({ lastNotifiedAt: '2026-08-25T11:00:00.000Z' }, interval, now)).toBe(true);
    expect(noticeIsRateLimited({ lastNotifiedAt: '2026-08-24T11:00:00.000Z' }, interval, now)).toBe(false);
    expect(noticeIsRateLimited({ lastNotifiedAt: 'malformed' }, interval, now)).toBe(false);
    expect(noticeIsRateLimited({}, interval, now)).toBe(false);
  });
});
