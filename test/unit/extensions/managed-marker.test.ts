/**
 * Unit tests for managed-marker normalization.
 *
 * @source @src/extensions/managed-marker.ts
 * @implements #1086
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  stripManagedMarker,
  sha256OfFileNormalized,
} from '../../../src/extensions/managed-marker.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-marker-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('managed-marker', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('stripManagedMarker', () => {
    it('strips YAML-frontmatter inline marker', () => {
      const input =
        '---\n' +
        '# aiwg:managed v2026.5.0-rc.6 bundled\n' +
        'name: my-agent\n' +
        '---\n' +
        '\n' +
        '# Body\n';
      const expected =
        '---\n' +
        'name: my-agent\n' +
        '---\n' +
        '\n' +
        '# Body\n';
      expect(stripManagedMarker(input)).toBe(expected);
    });

    it('strips legacy HTML-comment-on-line-1 marker', () => {
      const input =
        '<!-- aiwg:managed v2026.5.0-rc.6 bundled -->\n' +
        '# Some heading\n' +
        '\n' +
        'body\n';
      const expected = '# Some heading\n\nbody\n';
      expect(stripManagedMarker(input)).toBe(expected);
    });

    it('returns input unchanged when no marker present', () => {
      const input = '---\nname: my-agent\n---\n\nBody.\n';
      expect(stripManagedMarker(input)).toBe(input);
    });

    it('is idempotent — second strip is a no-op', () => {
      const input =
        '---\n' +
        '# aiwg:managed v1 bundled\n' +
        'name: x\n' +
        '---\n';
      const once = stripManagedMarker(input);
      const twice = stripManagedMarker(once);
      expect(twice).toBe(once);
    });

    it('does not strip a hash-comment that is not the marker', () => {
      const input =
        '---\n' +
        '# this is not the marker\n' +
        'name: x\n' +
        '---\n';
      expect(stripManagedMarker(input)).toBe(input);
    });

    it('only strips one marker line if somehow duplicated', () => {
      // Defense in depth: even if a malformed deploy injected twice,
      // strip exactly the first marker — caller can re-call to remove
      // the rest if needed.
      const input =
        '<!-- aiwg:managed v1 bundled -->\n' +
        '<!-- aiwg:managed v2 project-local -->\n' +
        '# Body\n';
      const once = stripManagedMarker(input);
      expect(once).toBe('<!-- aiwg:managed v2 project-local -->\n# Body\n');
      // Second pass strips the second marker
      expect(stripManagedMarker(once)).toBe('# Body\n');
    });

    it('strips marker with arbitrary version + source values', () => {
      const input =
        '---\n' +
        '# aiwg:managed vunknown bundled\n' +
        'name: x\n---\n';
      expect(stripManagedMarker(input)).toBe('---\nname: x\n---\n');
    });
  });

  describe('sha256OfFileNormalized', () => {
    it('produces identical hashes for source file and deployed-with-marker counterpart', async () => {
      const sourceContent =
        '---\nname: my-agent\nmodel: opus\n---\n\nDoctrine body.\n';
      const deployedContent =
        '---\n' +
        '# aiwg:managed v2026.5.0-rc.6 bundled\n' +
        'name: my-agent\nmodel: opus\n---\n' +
        '\nDoctrine body.\n';

      const srcPath = join(tmpDir, 'source.md');
      const depPath = join(tmpDir, 'deployed.md');
      writeFileSync(srcPath, sourceContent, 'utf8');
      writeFileSync(depPath, deployedContent, 'utf8');

      const srcHash = await sha256OfFileNormalized(srcPath);
      const depHash = await sha256OfFileNormalized(depPath);
      expect(srcHash).toBe(depHash);
    });

    it('detects real drift — content edit beyond marker', async () => {
      const sourceContent = '---\nname: my-agent\n---\n\nOriginal body.\n';
      const driftedDeployedContent =
        '---\n' +
        '# aiwg:managed v1 bundled\n' +
        'name: my-agent\n---\n' +
        '\nEDITED body.\n'; // operator changed body

      const srcPath = join(tmpDir, 'source.md');
      const depPath = join(tmpDir, 'deployed.md');
      writeFileSync(srcPath, sourceContent, 'utf8');
      writeFileSync(depPath, driftedDeployedContent, 'utf8');

      const srcHash = await sha256OfFileNormalized(srcPath);
      const depHash = await sha256OfFileNormalized(depPath);
      expect(srcHash).not.toBe(depHash);
    });

    it('matches when marker has been removed (per Option A trade-off)', async () => {
      // Stripping the marker on both sides means an operator who
      // removed only the marker is NOT flagged as drift. Documented
      // trade-off; the marker is a deploy-time label, not a tamper seal.
      const sourceContent = '---\nname: my-agent\n---\n\nBody.\n';
      const deployedNoMarker = '---\nname: my-agent\n---\n\nBody.\n';

      const srcPath = join(tmpDir, 'source.md');
      const depPath = join(tmpDir, 'deployed.md');
      writeFileSync(srcPath, sourceContent, 'utf8');
      writeFileSync(depPath, deployedNoMarker, 'utf8');

      const srcHash = await sha256OfFileNormalized(srcPath);
      const depHash = await sha256OfFileNormalized(depPath);
      expect(srcHash).toBe(depHash);
    });

    it('handles legacy HTML-comment marker form', async () => {
      const sourceContent = '# Heading\n\nBody.\n';
      const deployedContent =
        '<!-- aiwg:managed v1 bundled -->\n' + '# Heading\n\nBody.\n';

      const srcPath = join(tmpDir, 'source.md');
      const depPath = join(tmpDir, 'deployed.md');
      writeFileSync(srcPath, sourceContent, 'utf8');
      writeFileSync(depPath, deployedContent, 'utf8');

      const srcHash = await sha256OfFileNormalized(srcPath);
      const depHash = await sha256OfFileNormalized(depPath);
      expect(srcHash).toBe(depHash);
    });

    it('throws on missing file (caller treats as missing)', async () => {
      await expect(
        sha256OfFileNormalized(join(tmpDir, 'nonexistent.md'))
      ).rejects.toThrow();
    });
  });
});
