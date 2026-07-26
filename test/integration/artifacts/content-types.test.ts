/**
 * Tier 2: Isolated Content-Type Cases
 *
 * Tests that specific artifact categories are correctly typed and phased
 * from an isolated, deterministic corpus.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import type { MetadataEntry } from '../../../src/artifacts/types.js';
import {
  buildFixtureIndex,
  FIXTURE_ENTRY_PATHS,
  type BuiltFixtureIndex,
} from './fixture-corpus.js';

describe('Artifact Content Type Classification (integration)', () => {
  let entries: Record<string, MetadataEntry>;
  let fixture: BuiltFixtureIndex;

  beforeAll(async () => {
    fixture = await buildFixtureIndex();
    entries = fixture.metadata.entries;
  }, 30_000);

  afterAll(() => {
    fixture?.cleanup();
  });

  describe('SDLC artifacts (.aiwg/requirements/)', () => {
    it('should type UC-* files as use-case', () => {
      const useCases = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/requirements/') && path.basename(p).toLowerCase().startsWith('uc-')
      );
      expect(useCases).toHaveLength(1);
      for (const [p, entry] of useCases) {
        expect(entry.type, `${p} should be use-case`).toBe('use-case');
        // Phase may be overridden by frontmatter (e.g. "inception"), but directory-inferred
        // should default to "requirements". Accept any non-empty phase.
        expect(entry.phase, `${p} should have a phase`).toBeTruthy();
      }
    });

    it('should type NFR-* files as nfr', () => {
      const nfrs = Object.entries(entries).filter(
        ([p]) => path.basename(p).toLowerCase().startsWith('nfr-')
      );
      expect(nfrs).toHaveLength(1);
      for (const [p, entry] of nfrs) {
        expect(entry.type, `${p} should be nfr`).toBe('nfr');
      }
    });
  });

  describe('Architecture artifacts (.aiwg/architecture/)', () => {
    it('should type ADR-* files as adr', () => {
      const adrs = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/architecture/') && path.basename(p).toLowerCase().startsWith('adr-')
      );
      expect(adrs).toHaveLength(1);
      for (const [p, entry] of adrs) {
        expect(entry.type, `${p} should be adr`).toBe('adr');
        expect(entry.phase, `${p} should be architecture phase`).toBe('architecture');
      }
    });
  });

  describe('Testing artifacts (.aiwg/testing/)', () => {
    it('should phase testing artifacts correctly', () => {
      const testArtifacts = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/testing/')
      );
      expect(testArtifacts).toHaveLength(1);
      for (const [p, entry] of testArtifacts) {
        expect(entry.phase, `${p} should be testing phase`).toBe('testing');
      }
    });
  });

  describe('Security artifacts (.aiwg/security/)', () => {
    it('should phase security artifacts correctly', () => {
      const securityArtifacts = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/security/')
      );
      expect(securityArtifacts).toHaveLength(1);
      for (const [p, entry] of securityArtifacts) {
        expect(entry.phase, `${p} should be security phase`).toBe('security');
      }
    });

    it('should type threat model files as threat-model', () => {
      const threatModels = Object.entries(entries).filter(
        ([p]) => path.basename(p).toLowerCase().includes('threat')
      );
      expect(threatModels).toHaveLength(1);
      for (const [p, entry] of threatModels) {
        expect(entry.type, `${p} should be threat-model`).toBe('threat-model');
      }
    });
  });

  describe('Files without frontmatter', () => {
    it('should still index files without YAML frontmatter', () => {
      // Find entries that have no tags (likely no frontmatter)
      const noTags = Object.entries(entries).filter(([, e]) => e.tags.length === 0);
      expect(noTags.length).toBeGreaterThan(0);
      for (const [p, entry] of noTags) {
        // Title should be inferred from H1 heading or filename
        expect(entry.title, `${p} should have inferred title`).not.toBe('');
      }
    });
  });

  describe('Coverage', () => {
    it('should read only the explicit fixture corpus', () => {
      expect(Object.keys(entries).sort()).toEqual(FIXTURE_ENTRY_PATHS);
    });

    it('should preserve classification when the artifact root is relocated', async () => {
      const relocated = await buildFixtureIndex(true);
      try {
        expect(Object.keys(relocated.metadata.entries).sort()).toEqual(FIXTURE_ENTRY_PATHS);
        expect(relocated.metadata.entries['.aiwg/requirements/UC-login.md']?.type).toBe('use-case');
      } finally {
        relocated.cleanup();
      }
    });
  });
});
