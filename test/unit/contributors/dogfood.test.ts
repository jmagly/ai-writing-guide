/**
 * Dogfood Test — Discovery Against Live Source Tree
 *
 * Proves that the three reference status contributors shipped in #942 are
 * discoverable, parse cleanly, and validate against the kind: status schema.
 * Acts as a regression guard for the contributor files themselves and for
 * the registry → source-path resolution.
 *
 * @issue #942
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { discoverContributors } from '../../../src/contributors/discover.js';

const repoRoot = path.resolve(__dirname, '../../..');

describe('dogfood: live source tree status contributors', () => {
  /**
   * Build a minimal project where SDLC, media-curator, and research-complete
   * are each "in use" — populate at least one matching artifact for each
   * framework's detection globs. Discovery should find all three.
   */
  it('discovers all three reference contributors when their detection signals are present', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'aiwg-dogfood-'));
    try {
      mkdirSync(path.join(tmp, '.aiwg', 'frameworks'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.aiwg', 'frameworks', 'registry.json'),
        JSON.stringify({
          version: '1.0.0',
          created: new Date().toISOString(),
          frameworks: [
            { id: 'sdlc-complete' },
            { id: 'media-curator' },
            { id: 'research-complete' },
          ],
        })
      );

      // SDLC marker.
      mkdirSync(path.join(tmp, '.aiwg', 'requirements'), { recursive: true });
      writeFileSync(path.join(tmp, '.aiwg', 'requirements', 'UC-001.md'), '# UC-001');

      // Media-curator marker.
      mkdirSync(path.join(tmp, 'media', 'audio'), { recursive: true });
      writeFileSync(path.join(tmp, 'media', 'audio', 'sample.mp3'), '');

      // Research-complete marker.
      mkdirSync(path.join(tmp, '.aiwg', 'research', 'findings'), { recursive: true });
      writeFileSync(path.join(tmp, '.aiwg', 'research', 'findings', 'REF-001.md'), '# REF-001');

      const result = await discoverContributors('status', {
        frameworkRoot: repoRoot,
        projectRoot: tmp,
      });

      const origins = result.records.map(r => r.origin);
      expect(origins).toEqual(['sdlc-complete', 'media-curator', 'research-complete']);
      expect(result.skipped).toHaveLength(0);

      // Spot-check that each contributor's frontmatter parsed into the
      // expected domain field — proves the YAML is intact end-to-end.
      const sdlc = result.records.find(r => r.origin === 'sdlc-complete');
      expect(sdlc?.data.domain).toBe('SDLC');
      const media = result.records.find(r => r.origin === 'media-curator');
      expect(media?.data.domain).toBe('Media Library');
      const research = result.records.find(r => r.origin === 'research-complete');
      expect(research?.data.domain).toBe('Research Corpus');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('discovers all three reference research contributors', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'aiwg-dogfood-research-'));
    try {
      mkdirSync(path.join(tmp, '.aiwg', 'frameworks'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.aiwg', 'frameworks', 'registry.json'),
        JSON.stringify({
          version: '1.0.0',
          created: new Date().toISOString(),
          frameworks: [
            { id: 'sdlc-complete' },
            { id: 'research-complete' },
            { id: 'media-marketing-kit' },
          ],
        })
      );

      // SDLC marker.
      mkdirSync(path.join(tmp, '.aiwg', 'architecture'), { recursive: true });
      writeFileSync(path.join(tmp, '.aiwg', 'architecture', 'SAD.md'), '# SAD');

      // Research-complete marker.
      mkdirSync(path.join(tmp, '.aiwg', 'research', 'findings'), { recursive: true });
      writeFileSync(path.join(tmp, '.aiwg', 'research', 'findings', 'REF-001.md'), '# REF-001');

      // Marketing kit marker.
      mkdirSync(path.join(tmp, '.aiwg', 'marketing'), { recursive: true });
      writeFileSync(path.join(tmp, '.aiwg', 'marketing', 'brand-profile.md'), '# brand');

      const result = await discoverContributors('research', {
        frameworkRoot: repoRoot,
        projectRoot: tmp,
      });

      const origins = result.records.map(r => r.origin);
      expect(origins).toEqual([
        'sdlc-complete',
        'research-complete',
        'media-marketing-kit',
      ]);
      expect(result.skipped).toHaveLength(0);

      // Verify each contributor's frontmatter parsed with the kind: research
      // shape — focus_areas is the discriminator we care about most.
      for (const r of result.records) {
        const data = r.data as { focus_areas: string[]; recency_default_months?: number };
        expect(Array.isArray(data.focus_areas)).toBe(true);
        expect(data.focus_areas.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('filters out a contributor whose detection signals are absent', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'aiwg-dogfood-empty-'));
    try {
      mkdirSync(path.join(tmp, '.aiwg', 'frameworks'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.aiwg', 'frameworks', 'registry.json'),
        JSON.stringify({
          version: '1.0.0',
          created: new Date().toISOString(),
          frameworks: [{ id: 'sdlc-complete' }, { id: 'media-curator' }],
        })
      );
      // Only seed SDLC artifacts; media-curator is installed but unused.
      mkdirSync(path.join(tmp, '.aiwg', 'planning'), { recursive: true });
      writeFileSync(path.join(tmp, '.aiwg', 'planning', 'phase-plan.md'), '# phase plan');

      const result = await discoverContributors('status', {
        frameworkRoot: repoRoot,
        projectRoot: tmp,
      });

      expect(result.records.map(r => r.origin)).toEqual(['sdlc-complete']);
      // media-curator is captured as a detection-no-match skip per ADR-023.
      expect(result.skipped.map(s => s.origin)).toContain('media-curator');
      expect(result.skipped.find(s => s.origin === 'media-curator')?.reason).toBe(
        'detection-no-match'
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
