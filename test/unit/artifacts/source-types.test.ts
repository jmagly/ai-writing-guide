/**
 * Extensible source-type registry + normalizer (#1509).
 *
 * @source @src/artifacts/corpus-tools/source-types.ts
 * @source @agentic/code/frameworks/research-complete/config/source-types.yaml
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { load as loadYaml } from 'js-yaml';
import {
  DEFAULT_SOURCE_TYPES,
  loadSourceTypeRegistry,
  normalizeSourceType,
  getSourceType,
  listSourceTypes,
} from '../../../src/artifacts/corpus-tools/source-types.js';

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const FRAMEWORK_YAML = join(repo, 'agentic/code/frameworks/research-complete/config/source-types.yaml');

describe('normalizeSourceType (#1509) — folds the 3 drifting vocabularies', () => {
  it('maps frontmatter source_type aliases (hyphen/underscore drift)', () => {
    expect(normalizeSourceType({ sourceType: 'conference_paper' })).toBe('paper');
    expect(normalizeSourceType({ sourceType: 'conference-paper' })).toBe('paper');
    expect(normalizeSourceType({ sourceType: 'journal_article' })).toBe('paper');
    expect(normalizeSourceType({ sourceType: 'codebase' })).toBe('repo');
    expect(normalizeSourceType({ sourceType: 'benchmark-repository' })).toBe('repo');
    expect(normalizeSourceType({ sourceType: 'book_chapter' })).toBe('chapter');
    expect(normalizeSourceType({ sourceType: 'announcement' })).toBe('blog');
  });

  it('maps frontmatter type aliases', () => {
    expect(normalizeSourceType({ type: 'reference' })).toBe('paper');
    expect(normalizeSourceType({ type: 'book' })).toBe('book');
  });

  it('maps the body "Source Type" field', () => {
    expect(normalizeSourceType({ bodySourceType: 'maintainer-doc' })).toBe('doc');
    expect(normalizeSourceType({ bodySourceType: 'standard' })).toBe('standard');
    expect(normalizeSourceType({ bodySourceType: 'expert-material' })).toBe('expert-material');
    expect(normalizeSourceType({ bodySourceType: 'podcast-episode' })).toBe('podcast');
    expect(normalizeSourceType({ bodySourceType: 'conference-talk' })).toBe('lecture');
  });

  it('routes doc-role values to the meta pseudo-type', () => {
    expect(normalizeSourceType({ type: 'redirect' })).toBe('meta');
    expect(normalizeSourceType({ type: 'stub' })).toBe('meta');
    expect(normalizeSourceType({ type: 'gap-note' })).toBe('meta');
  });

  it('falls back to the venue classification when no type matches', () => {
    expect(normalizeSourceType({ venue: 'NeurIPS' })).toBe('paper');
    expect(normalizeSourceType({ venue: 'arXiv' })).toBe('preprint');
    expect(normalizeSourceType({ venue: 'Blog / Web Article' })).toBe('blog');
    expect(normalizeSourceType({ venue: 'GitHub / Documentation' })).toBe('repo');
    expect(normalizeSourceType({ venue: 'RFC (IETF)' })).toBe('standard');
    expect(normalizeSourceType({ venue: 'Anthropic Research' })).toBe('blog');
  });

  it('prefers an explicit source_type over the venue fallback', () => {
    // A blog hosted at an arXiv-classified venue still respects its declared type.
    expect(normalizeSourceType({ sourceType: 'blog', venue: 'NeurIPS' })).toBe('blog');
  });

  it('returns other when nothing matches', () => {
    expect(normalizeSourceType({})).toBe('other');
    expect(normalizeSourceType({ type: 'mystery-format' })).toBe('other');
    expect(normalizeSourceType({ venue: 'Some Unmapped Venue' })).toBe('other');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalizeSourceType({ sourceType: '  Conference Paper  ' })).toBe('paper');
    expect(normalizeSourceType({ type: 'CODEBASE' })).toBe('repo');
  });
});

describe('registry accessors', () => {
  it('lists canonical types and resolves their rules', () => {
    const types = listSourceTypes();
    expect(types).toContain('paper');
    expect(types).toContain('blog');
    expect(types).toContain('repo');
    expect(types).toContain('video');
    expect(types).toContain('podcast');
    expect(getSourceType('blog')?.template).toBe('reference-web');
    expect(getSourceType('repo')?.acquisition).toBe('git-clone');
    expect(getSourceType('video')?.template).toBe('reference-media');
    expect(getSourceType('nope')).toBeNull();
  });
});

describe('corpus override', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aiwg-srctype-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('uses the built-in default when no override is present', () => {
    const reg = loadSourceTypeRegistry(root);
    expect(Object.keys(reg.types).sort()).toEqual(listSourceTypes());
  });

  it('a documentation/source-types.yaml override replaces the default registry', () => {
    const f = join(root, 'documentation', 'source-types.yaml');
    mkdirSync(join(f, '..'), { recursive: true });
    writeFileSync(
      f,
      'version: 1\ntypes:\n  podcast:\n    description: Podcast episode.\n    aliases: [podcast, episode]\n    template: reference-web\n    required_sections: [Summary]\n    citation_format: url-venue-retrieved\n    acquisition: web-snapshot\n    storage: sources/audio\n    quality_rules: anecdotal-hedging\n    default_radar_cadence: on-demand\nvenue_fallback: {}\nmeta_roles: [redirect]\n',
    );
    const reg = loadSourceTypeRegistry(root);
    expect(listSourceTypes(reg)).toEqual(['podcast']);
    expect(normalizeSourceType({ type: 'episode' }, reg)).toBe('podcast');
    // The default 'paper' alias no longer applies under the override.
    expect(normalizeSourceType({ type: 'reference' }, reg)).toBe('other');
  });
});

describe('YAML / TS-constant drift (#1509)', () => {
  it('the framework source-types.yaml matches the DEFAULT_SOURCE_TYPES constant', () => {
    const raw = loadYaml(readFileSync(FRAMEWORK_YAML, 'utf-8')) as any;
    // Same canonical type keys.
    expect(Object.keys(raw.types).sort()).toEqual(listSourceTypes());
    // Same aliases per type.
    for (const key of listSourceTypes()) {
      expect(raw.types[key].aliases).toEqual(DEFAULT_SOURCE_TYPES.types[key].aliases);
    }
    // Same venue fallback + meta roles.
    expect(raw.venue_fallback).toEqual(DEFAULT_SOURCE_TYPES.venueFallback);
    expect(raw.meta_roles).toEqual(DEFAULT_SOURCE_TYPES.metaRoles);
  });
});
