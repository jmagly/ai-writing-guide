/**
 * Cargo supply-chain audit discovery routing (#1479).
 *
 * Before: `aiwg discover "cargo crate supply chain audit"` returned the
 * npm-specific skill on top (it only matched "supply chain audit"). The new
 * cargo-supply-chain-audit skill must rank ABOVE npm-supply-chain-audit for the
 * Cargo query. This builds a fixture framework index containing minimal copies
 * of both skills' discovery metadata and asserts the ranking.
 *
 * @issue #1479
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { discoverCapability } from '../../../src/artifacts/query-engine.js';

let tmpRoot: string;
let cwd: string;

function writeSkill(slug: string, description: string, triggers: string[]): void {
  const dir = path.join(cwd, 'agentic', 'code', 'frameworks', 'security-engineering', 'skills', slug);
  fs.mkdirSync(dir, { recursive: true });
  const body = [
    '---',
    'namespace: aiwg',
    `name: ${slug}`,
    'platforms: [all]',
    `description: "${description}"`,
    '---',
    '',
    `# ${slug}`,
    '',
    '## Triggers',
    '',
    ...triggers.map((t) => `- "${t}"`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'SKILL.md'), body, 'utf8');
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-cargo-disc-'));
  cwd = path.join(tmpRoot, 'project');
  fs.mkdirSync(cwd, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('cargo supply-chain audit discovery (#1479)', () => {
  it('ranks the Cargo skill above the npm skill for the Cargo query', async () => {
    // Real discovery metadata (description + triggers) from the two skills.
    writeSkill(
      'npm-supply-chain-audit',
      'Audit npm projects for Shai-Hulud-class supply-chain exposure: lifecycle scripts, Git dependency prepare hooks, publish-token exposure.',
      ['npm supply chain audit', 'Shai-Hulud', 'malicious npm package'],
    );
    writeSkill(
      'cargo-supply-chain-audit',
      'Audit Rust/Cargo crates for supply-chain exposure: crates.io metadata + checksum verification against Cargo.lock, .crate tarball provenance, build-script review, cargo audit / cargo deny / cargo vet.',
      ['cargo crate supply chain audit', 'crates.io supply chain', 'rust dependency audit', 'malicious crate'],
    );

    const prevXdg = process.env.XDG_DATA_HOME;
    const prevRoot = process.env.AIWG_ROOT;
    process.env.XDG_DATA_HOME = path.join(tmpRoot, 'xdg'); // sandbox the shared framework index
    process.env.AIWG_ROOT = cwd;
    const origLog = console.log;
    try {
      console.log = () => {};
      await buildIndex(cwd, { graph: 'framework', force: true, explicit: true });
      const captured: string[] = [];
      console.log = (...a: unknown[]) => captured.push(a.join(' '));
      await discoverCapability(cwd, { phrase: 'cargo crate supply chain audit', json: true, backend: 'local', limit: 5 });
      console.log = origLog;

      const parsed = JSON.parse(captured.join('\n'));
      const results: Array<{ path: string; score: number }> = parsed.results;
      const cargoIdx = results.findIndex((r) => r.path.endsWith('cargo-supply-chain-audit/SKILL.md'));
      const npmIdx = results.findIndex((r) => r.path.endsWith('npm-supply-chain-audit/SKILL.md'));

      expect(cargoIdx, 'cargo skill should appear in results').toBeGreaterThanOrEqual(0);
      expect(cargoIdx, 'cargo skill should rank above npm skill for the Cargo query').toBeLessThan(
        npmIdx === -1 ? Number.MAX_SAFE_INTEGER : npmIdx,
      );
      // And it should be the top hit.
      expect(results[0].path.endsWith('cargo-supply-chain-audit/SKILL.md')).toBe(true);
    } finally {
      console.log = origLog;
      if (prevXdg === undefined) delete process.env.XDG_DATA_HOME; else process.env.XDG_DATA_HOME = prevXdg;
      if (prevRoot === undefined) delete process.env.AIWG_ROOT; else process.env.AIWG_ROOT = prevRoot;
    }
  });
});
