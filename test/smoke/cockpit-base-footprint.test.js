// Base-npm footprint guard (roctinam/aiwg#1593).
// The AIWG Cockpit (apps/cockpit/**) is an opt-in, separately-published unit. It
// MUST NOT ship inside the base `aiwg` npm package. This test fails if a future
// change to the `files` allowlist (or an .npmignore edit) ever leaks it in.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
});
