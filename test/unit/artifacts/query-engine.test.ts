/**
 * Artifact Query Engine Tests
 *
 * @source @src/artifacts/query-engine.ts
 * @implements #416
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { queryIndex, showArtifact } from '../../../src/artifacts/query-engine.js';
import { INDEX_DIR } from '../../../src/artifacts/types.js';
import type { ArtifactIndex, MetadataEntry } from '../../../src/artifacts/types.js';

function createMockEntry(overrides: Partial<MetadataEntry> = {}): MetadataEntry {
  return {
    path: '.aiwg/requirements/UC-001.md',
    type: 'use-case',
    phase: 'requirements',
    title: 'User Login',
    tags: ['auth', 'security'],
    created: '2026-01-01T00:00:00Z',
    updated: '2026-02-01T00:00:00Z',
    checksum: 'abcdef1234567890',
    summary: 'Users can log in with email and password.',
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

describe('Artifact Query Engine', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-query-test-'));

    // Create mock index
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });

    const mockIndex: ArtifactIndex = {
      version: '1.0.0',
      builtAt: '2026-01-15T00:00:00Z',
      buildTimeMs: 50,
      entries: {
        '.aiwg/requirements/UC-001.md': createMockEntry(),
        '.aiwg/requirements/UC-002.md': createMockEntry({
          path: '.aiwg/requirements/UC-002.md',
          title: 'User Registration',
          tags: ['auth'],
          summary: 'New users can create an account.',
          updated: '2026-03-01T00:00:00Z',
        }),
        '.aiwg/architecture/adr-001.md': createMockEntry({
          path: '.aiwg/architecture/adr-001.md',
          type: 'adr',
          phase: 'architecture',
          title: 'Use JWT for Auth',
          tags: ['auth', 'architecture'],
          summary: 'Decision to use JSON Web Tokens for authentication.',
        }),
        '.aiwg/testing/tp-001.md': createMockEntry({
          path: '.aiwg/testing/tp-001.md',
          type: 'test-plan',
          phase: 'testing',
          title: 'Login Test Plan',
          tags: ['testing'],
          summary: 'Comprehensive test plan for user login functionality.',
        }),
      },
    };

    fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify(mockIndex));

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should find entries by keyword in title', async () => {
    await queryIndex(tmpDir, { text: 'Login' });
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Login');
  });

  it('should filter by type', async () => {
    await queryIndex(tmpDir, { type: 'adr' }, { json: true });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].type).toBe('adr');
  });

  it('should filter by phase', async () => {
    await queryIndex(tmpDir, { phase: 'testing' }, { json: true });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].phase).toBe('testing');
  });

  it('should filter by tags (AND logic)', async () => {
    await queryIndex(tmpDir, { tags: ['auth', 'security'] }, { json: true });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    // Only UC-001 has both auth AND security
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].path).toBe('.aiwg/requirements/UC-001.md');
  });

  it('should return all entries when no text query provided', async () => {
    await queryIndex(tmpDir, {}, { json: true });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.results).toHaveLength(4);
  });

  it('should respect limit parameter', async () => {
    await queryIndex(tmpDir, { limit: 2 }, { json: true });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.results).toHaveLength(2);
  });

  it('should output human-readable format by default', async () => {
    await queryIndex(tmpDir, { text: 'Login' });
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Results for');
    expect(output).toContain('Score');
  });

  it('should handle no results gracefully', async () => {
    await queryIndex(tmpDir, { text: 'nonexistent-xyz' });
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('No results found');
  });

  it('should exit with error when index does not exist', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-noindex-'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(queryIndex(emptyDir, {})).rejects.toThrow('process.exit');

    exitSpy.mockRestore();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('shows a skill SKILL.md by directory name without matching companion docs', async () => {
    const skillPath = '.aiwg/skills/project-status/SKILL.md';
    const helperPath = '.aiwg/skills/project-status/heuristic-fallback.md';
    fs.mkdirSync(path.join(tmpDir, '.aiwg', 'skills', 'project-status'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.aiwg', '.index', 'project'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, skillPath), '# Project Status\n');
    fs.writeFileSync(path.join(tmpDir, helperPath), '# Heuristic Fallback\n');

    const projectIndex: ArtifactIndex = {
      version: '1.0.0',
      builtAt: '2026-05-16T00:00:00Z',
      buildTimeMs: 1,
      entries: {
        [skillPath]: createMockEntry({
          path: skillPath,
          type: 'skill',
          title: 'project-status',
          summary: 'Cross-framework project status aggregator.',
        }),
        [helperPath]: createMockEntry({
          path: helperPath,
          type: 'skill',
          title: 'heuristic-fallback',
          summary: 'Companion fallback documentation.',
        }),
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, '.aiwg', '.index', 'project', 'metadata.json'),
      JSON.stringify(projectIndex),
    );

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    let output = '';
    try {
      await showArtifact(tmpDir, { typeFilter: ['skill'], name: 'project-status', graph: 'project' });
      output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
    } finally {
      stdoutSpy.mockRestore();
    }

    expect(output).toContain('# Project Status');
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Ambiguous'));
  });

  it('prefers canonical bundle agents over top-level persona mirrors for duplicate names (#1643)', async () => {
    const canonicalPath = 'agentic/code/addons/aiwg-utils/agents/aiwg-steward.md';
    const personaPath = 'agentic/code/agents/personas/aiwg-steward.md';
    fs.mkdirSync(path.join(tmpDir, path.dirname(canonicalPath)), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, path.dirname(personaPath)), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, canonicalPath), '---\nname: aiwg-steward\n---\n\n# Canonical Steward\n');
    fs.writeFileSync(path.join(tmpDir, personaPath), '---\nname: aiwg-steward\n---\n\n# Persona Steward\n');

    const indexPath = path.join(tmpDir, INDEX_DIR, 'metadata.json');
    const idx: ArtifactIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    idx.entries[canonicalPath] = createMockEntry({
      path: canonicalPath,
      type: 'agent',
      title: 'AIWG Steward',
      summary: 'Canonical steward',
    });
    idx.entries[personaPath] = createMockEntry({
      path: personaPath,
      type: 'agent',
      title: 'AIWG Steward',
      summary: 'OpenHuman persona mirror',
    });
    fs.writeFileSync(indexPath, JSON.stringify(idx));

    const prevRoot = process.env.AIWG_ROOT;
    process.env.AIWG_ROOT = tmpDir;
    try {
      await showArtifact(tmpDir, { typeFilter: ['agent'], name: 'aiwg-steward', json: true });
      const parsed = JSON.parse(consoleSpy.mock.calls.map(c => c[0]).join(''));
      expect(parsed.path).toBe(path.join(tmpDir, canonicalPath));
      expect(parsed.content).toContain('# Canonical Steward');
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Ambiguous'));
    } finally {
      if (prevRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = prevRoot;
    }
  });

  it('resolves a persona agent via the corpus fallback when not in any index (#1623 U5)', async () => {
    // An index exists (so showArtifact does not early-exit) but does NOT
    // contain the persona agent — the exact "un-indexed / stale framework
    // index" scenario where the corpus fallback is the only resolution path.
    const indexDir = path.join(tmpDir, '.aiwg', '.index', 'project');
    fs.mkdirSync(indexDir, { recursive: true });
    fs.writeFileSync(
      path.join(indexDir, 'metadata.json'),
      JSON.stringify({
        version: '1.0.0',
        builtAt: '2026-06-18T00:00:00Z',
        buildTimeMs: 1,
        entries: {
          '.aiwg/requirements/UC-001.md': createMockEntry(),
        },
      }),
    );

    // Build a minimal AIWG_ROOT corpus carrying a persona agent under the
    // flat-under-category layout `agentic/code/agents/personas/<name>.md`.
    const corpusRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-corpus-'));
    const personaDir = path.join(corpusRoot, 'agentic', 'code', 'agents', 'personas');
    fs.mkdirSync(personaDir, { recursive: true });
    fs.writeFileSync(
      path.join(personaDir, 'aiwg-writer.md'),
      '---\nname: aiwg-writer\ndescription: Documentation persona.\n---\n\n# AIWG Writer\n',
    );

    const prevRoot = process.env.AIWG_ROOT;
    process.env.AIWG_ROOT = corpusRoot;
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    let output = '';
    try {
      await showArtifact(tmpDir, { typeFilter: ['agent'], name: 'aiwg-writer', graph: 'project' });
      output = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
    } finally {
      stdoutSpy.mockRestore();
      if (prevRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = prevRoot;
      fs.rmSync(corpusRoot, { recursive: true, force: true });
    }

    expect(output).toContain('# AIWG Writer');
    expect(output).toContain('corpus-only');
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('no artifact found'),
    );
  });
});
