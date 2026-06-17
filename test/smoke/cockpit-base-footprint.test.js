// Base-npm footprint guard (roctinam/aiwg#1593).
// The AIWG Cockpit (apps/cockpit/**) is an opt-in, separately-published unit. It
// MUST NOT ship inside the base `aiwg` npm package. This test fails if a future
// change to the `files` allowlist (or an .npmignore edit) ever leaks it in.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

describe('cockpit base-npm footprint guard (#1593)', () => {
  it('publishes zero apps/cockpit files in the base aiwg tarball', () => {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      encoding: 'utf8', cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024,
    });
    const files = (JSON.parse(out)[0]?.files ?? []).map((f) => f.path);
    const leaked = files.filter((f) => f.startsWith('apps/cockpit'));
    expect(leaked, `apps/cockpit must not ship in base aiwg — leaked: ${leaked.slice(0, 5).join(', ')}`).toHaveLength(0);
  }, 120000); // npm pack walks the full base tarball (~6k files) — allow headroom

  it('the published files allowlist never names apps/cockpit', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    const bad = (pkg.files ?? []).filter((f) => f.includes('apps/cockpit'));
    expect(bad, `files[] must not include apps/cockpit — found: ${bad.join(', ')}`).toHaveLength(0);
  });

  it('the opt-in cockpit package is publishable and version-locked to core', () => {
    const core = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    const cockpit = JSON.parse(readFileSync(new URL('../../apps/cockpit/package.json', import.meta.url), 'utf8'));

    expect(cockpit.name).toBe('@aiwg/cockpit');
    expect(cockpit.private).not.toBe(true);
    expect(cockpit.version).toBe(core.version);
    expect(cockpit.bin?.['aiwg-cockpit']).toBe('bridge/src/server.mjs');
    expect(cockpit.publishConfig?.access).toBe('public');
    expect(cockpit.files).toContain('bridge/');
    expect(cockpit.files).toContain('web/dist/');
  });

  it('the cockpit tarball dry-run names @aiwg/cockpit and excludes node_modules', () => {
    const npmCache = '/tmp/aiwg-npm-cache';
    mkdirSync(npmCache, { recursive: true });
    const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      encoding: 'utf8',
      cwd: new URL('../../apps/cockpit', import.meta.url),
      env: { ...process.env, npm_config_cache: npmCache },
      maxBuffer: 64 * 1024 * 1024,
    });
    const pack = JSON.parse(out)[0];
    const files = (pack?.files ?? []).map((f) => f.path);

    expect(pack?.name).toBe('@aiwg/cockpit');
    expect(files.some((f) => f.startsWith('node_modules/')), 'cockpit tarball must not contain node_modules').toBe(false);
    expect(files).toContain('bridge/src/server.mjs');
  }, 120000);
});
