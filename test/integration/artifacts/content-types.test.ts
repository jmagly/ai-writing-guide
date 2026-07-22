/**
 * Tier 2: Isolated Content-Type Cases
 *
 * Tests that specific artifact categories are correctly typed and phased
 * when indexing real AIWG content.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import type { ArtifactIndex, MetadataEntry } from '../../../src/artifacts/types.js';
import { resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = resolveProjectAiwgDir(REPO_ROOT);
const PROJECT_CORPUS_AVAILABLE = fs.existsSync(AIWG_DIR) && [
  'requirements',
  'architecture',
  'planning',
  'security',
].some(dir => fs.existsSync(path.join(AIWG_DIR, dir)));

describe('Artifact Content Type Classification (integration)', () => {
  let entries: Record<string, MetadataEntry>;
  let tmpDir: string;

  beforeAll(async () => {
    if (!PROJECT_CORPUS_AVAILABLE) return;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-content-types-'));
    fs.mkdirSync(path.join(tmpDir, '.aiwg', '.index'), { recursive: true });

    await buildIndex(REPO_ROOT, { force: true, outputDir: tmpDir });

    const indexPath = path.join(tmpDir, '.aiwg', '.index', 'metadata.json');
    const index: ArtifactIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    entries = index.entries;
  }, 30_000);

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('SDLC artifacts (.aiwg/requirements/)', () => {
    it('should type UC-* files as use-case', () => {
      if (!entries) return;
      const useCases = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/requirements/') && path.basename(p).toLowerCase().startsWith('uc-')
      );
      // We should have at least some use cases
      expect(useCases.length).toBeGreaterThan(0);
      for (const [p, entry] of useCases) {
        expect(entry.type, `${p} should be use-case`).toBe('use-case');
        // Phase may be overridden by frontmatter (e.g. "inception"), but directory-inferred
        // should default to "requirements". Accept any non-empty phase.
        expect(entry.phase, `${p} should have a phase`).toBeTruthy();
      }
    });

    it('should type NFR-* files as nfr', () => {
      if (!entries) return;
      const nfrs = Object.entries(entries).filter(
        ([p]) => path.basename(p).toLowerCase().startsWith('nfr-')
      );
      if (nfrs.length > 0) {
        for (const [p, entry] of nfrs) {
          expect(entry.type, `${p} should be nfr`).toBe('nfr');
        }
      }
    });
  });

  describe('Architecture artifacts (.aiwg/architecture/)', () => {
    it('should type ADR-* files as adr', () => {
      if (!entries) return;
      const adrs = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/architecture/') && path.basename(p).toLowerCase().startsWith('adr-')
      );
      if (adrs.length > 0) {
        for (const [p, entry] of adrs) {
          expect(entry.type, `${p} should be adr`).toBe('adr');
          expect(entry.phase, `${p} should be architecture phase`).toBe('architecture');
        }
      }
    });
  });

  describe('Testing artifacts (.aiwg/testing/)', () => {
    it('should phase testing artifacts correctly', () => {
      if (!entries) return;
      const testArtifacts = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/testing/')
      );
      if (testArtifacts.length > 0) {
        for (const [p, entry] of testArtifacts) {
          expect(entry.phase, `${p} should be testing phase`).toBe('testing');
        }
      }
    });
  });

  describe('Security artifacts (.aiwg/security/)', () => {
    it('should phase security artifacts correctly', () => {
      if (!entries) return;
      const securityArtifacts = Object.entries(entries).filter(
        ([p]) => p.startsWith('.aiwg/security/')
      );
      if (securityArtifacts.length > 0) {
        for (const [p, entry] of securityArtifacts) {
          expect(entry.phase, `${p} should be security phase`).toBe('security');
        }
      }
    });

    it('should type threat model files as threat-model', () => {
      if (!entries) return;
      const threatModels = Object.entries(entries).filter(
        ([p]) => path.basename(p).toLowerCase().includes('threat')
      );
      if (threatModels.length > 0) {
        for (const [p, entry] of threatModels) {
          expect(entry.type, `${p} should be threat-model`).toBe('threat-model');
        }
      }
    });
  });

  describe('Files without frontmatter', () => {
    it('should still index files without YAML frontmatter', () => {
      if (!entries) return;
      // Find entries that have no tags (likely no frontmatter)
      const noTags = Object.entries(entries).filter(([, e]) => e.tags.length === 0);
      // Many .aiwg/ files don't have frontmatter; they should still be indexed
      expect(noTags.length).toBeGreaterThan(0);
      for (const [p, entry] of noTags) {
        // Title should be inferred from H1 heading or filename
        expect(entry.title, `${p} should have inferred title`).not.toBe('');
      }
    });
  });

  describe('Coverage', () => {
    it('should index files from at least 8 subdirectories', () => {
      if (!entries) return;
      const dirs = new Set<string>();
      for (const p of Object.keys(entries)) {
        // Get first-level subdirectory under .aiwg/
        const parts = p.split('/');
        if (parts.length >= 2 && parts[0] === '.aiwg') {
          dirs.add(parts[1]);
        }
      }
      expect(dirs.size).toBeGreaterThanOrEqual(8);
    });
  });
});
