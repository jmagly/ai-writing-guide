/**
 * Real-corpus capability discovery coverage for the Fortemi Core backend.
 *
 * The synthetic Fortemi parity tests cover adapter mechanics. This test keeps
 * a small set of stable, domain-specific queries over the real AIWG corpus so
 * regressions in framework/addon discoverability are caught before release.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { discoverCapability, showArtifact } from '../../../src/artifacts/query-engine.js';
import { syncFortemiCoreIndex } from '../../../src/artifacts/fortemi-core-sync.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const MATRIX_PATH = path.join(REPO_ROOT, 'test/fixtures/artifacts/release-discovery-matrix.json');

interface DiscoverResult {
  query: { backend?: string; graph?: string };
  results: Array<{ path: string; type: string; title: string }>;
  total: number;
}

interface DiscoveryMatrixCase {
  id: string;
  phrase: string;
  expected_path: string;
  expected_type: string;
  type_filter?: string[];
  max_rank?: number;
  expected_top_path?: string;
}

const MATRIX = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf-8')) as {
  default_limit: number;
  cases: DiscoveryMatrixCase[];
};

describe('Fortemi Core capability discovery over the real framework/addon corpus', () => {
  let tmpRoot: string;
  let corpusRoot: string;
  let originalXdgDataHome: string | undefined;
  let originalAiwgRoot: string | undefined;

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-fortemi-corpus-'));
    corpusRoot = path.join(tmpRoot, 'aiwg-root');
    fs.mkdirSync(corpusRoot, { recursive: true });
    fs.cpSync(path.join(REPO_ROOT, 'agentic'), path.join(corpusRoot, 'agentic'), {
      recursive: true,
    });
    fs.cpSync(path.join(REPO_ROOT, 'docs'), path.join(corpusRoot, 'docs'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(corpusRoot, '.aiwg', 'skills', 'project-custom-review'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(corpusRoot, '.aiwg', 'skills', 'project-custom-review', 'SKILL.md'),
      [
        '---',
        'name: project-custom-review',
        'description: Run a project-local custom review workflow',
        'triggers:',
        '  - "project custom review"',
        '  - "local review workflow"',
        '---',
        '',
        '# Project Custom Review',
        '',
        'Run the local custom review workflow for this project.',
        '',
      ].join('\n'),
    );

    originalXdgDataHome = process.env.XDG_DATA_HOME;
    originalAiwgRoot = process.env.AIWG_ROOT;
    process.env.XDG_DATA_HOME = path.join(tmpRoot, 'xdg-data');
    process.env.AIWG_ROOT = corpusRoot;

    const logSpy = viSpyConsole('log');
    const errSpy = viSpyConsole('error');
    try {
      await buildIndex(corpusRoot, { graph: 'framework', force: true, explicit: true });
      await buildIndex(corpusRoot, { graph: 'project', force: true, explicit: true });
      syncFortemiCoreIndex(corpusRoot, {
        graph: 'framework',
        repo: 'aiwg-test',
        privacy: 'private',
        generatedAt: '2026-07-03T00:00:00.000Z',
      });
      syncFortemiCoreIndex(corpusRoot, {
        graph: 'project',
        repo: 'aiwg-test',
        privacy: 'private',
        generatedAt: '2026-07-03T00:00:00.000Z',
      });
    } finally {
      logSpy.restore();
      errSpy.restore();
    }
  }, 60_000);

  afterAll(() => {
    if (originalXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = originalXdgDataHome;
    if (originalAiwgRoot === undefined) delete process.env.AIWG_ROOT;
    else process.env.AIWG_ROOT = originalAiwgRoot;
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  async function captureDiscover(
    phrase: string,
    backend: 'local' | 'fortemi-core',
    useDefaultGraph = false,
  ): Promise<DiscoverResult> {
    const captured: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => captured.push(args.map(String).join(' '));
    try {
      await discoverCapability(corpusRoot, {
        phrase,
        ...(useDefaultGraph ? {} : { graph: 'framework' as const }),
        json: true,
        limit: 5,
        typeFilter: MATRIX.cases.find((testCase) => testCase.phrase === phrase)?.type_filter,
        backend,
      });
    } finally {
      console.log = original;
    }
    return JSON.parse(captured.join('')) as DiscoverResult;
  }

  async function captureShow(name: string, typeFilter: string[]): Promise<{ path: string; content: string }> {
    const captured: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => captured.push(args.map(String).join(' '));
    try {
      await showArtifact(corpusRoot, {
        name,
        typeFilter,
        json: true,
        backend: 'fortemi-core',
      });
    } finally {
      console.log = original;
    }
    return JSON.parse(captured.join('')) as { path: string; content: string };
  }

  function normalizedPaths(result: DiscoverResult): string[] {
    return result.results.map((item) => item.path.replace(`${corpusRoot}/`, ''));
  }

  for (const testCase of MATRIX.cases) {
    it(`matches local discovery for "${testCase.phrase}"`, async () => {
      const local = await captureDiscover(testCase.phrase, 'local');
      const fortemi = await captureDiscover(testCase.phrase, 'fortemi-core', true);

      expect(local.total, `${testCase.phrase} local result count`).toBeGreaterThan(0);
      expect(local.query.backend).toBe('local');
      expect(fortemi.query.backend).toBe('fortemi-core');
      expect(fortemi.query.graph).toBe('capability-default');
      expect(fortemi.total, `${testCase.phrase} Fortemi result count`).toBeGreaterThan(0);
      expect(normalizedPaths(fortemi), `${testCase.phrase} Fortemi ordered paths`).toEqual(
        normalizedPaths(local),
      );

      const localHit = local.results.find(
        (result) =>
          result.path.includes(testCase.expected_path) &&
          result.type === testCase.expected_type,
      );
      const fortemiHit = fortemi.results.find(
        (result) =>
          result.path.includes(testCase.expected_path) &&
          result.type === testCase.expected_type,
      );
      expect(localHit, `${testCase.phrase} local expected hit`).toBeDefined();
      expect(fortemiHit, `${testCase.phrase} Fortemi expected hit`).toBeDefined();

      const maxRank = testCase.max_rank ?? MATRIX.default_limit;
      const localRank = local.results.findIndex((result) => result === localHit) + 1;
      const fortemiRank = fortemi.results.findIndex((result) => result === fortemiHit) + 1;
      expect(localRank, `${testCase.phrase} local expected rank`).toBeLessThanOrEqual(maxRank);
      expect(fortemiRank, `${testCase.phrase} Fortemi expected rank`).toBeLessThanOrEqual(maxRank);

      if (testCase.expected_top_path) {
        expect(local.results[0]?.path, `${testCase.phrase} local top result`).toContain(testCase.expected_top_path);
        expect(fortemi.results[0]?.path, `${testCase.phrase} Fortemi top result`).toContain(testCase.expected_top_path);
      }
    });
  }

  it('shows canonical framework skills from bare names on the Fortemi Core default graph', async () => {
    const docSync = await captureShow('doc-sync', ['skill']);
    expect(docSync.path).toContain('agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md');
    expect(docSync.content).toContain('name: doc-sync');

    const flowRelease = await captureShow('flow-release', ['skill']);
    expect(flowRelease.path).toContain('agentic/code/frameworks/sdlc-complete/skills/flow-release/SKILL.md');
    expect(flowRelease.content).toContain('name: flow-release');
  });

  it('discovers and shows project-local custom skills on the Fortemi Core default graph', async () => {
    const local = await captureDiscover('project custom review', 'local', true);
    const fortemi = await captureDiscover('project custom review', 'fortemi-core', true);

    expect(local.results[0]?.path).toContain('.aiwg/skills/project-custom-review/SKILL.md');
    expect(fortemi.query.graph).toBe('capability-default');
    expect(fortemi.results[0]?.path).toContain('.aiwg/skills/project-custom-review/SKILL.md');
    expect(normalizedPaths(fortemi)).toEqual(normalizedPaths(local));

    const shown = await captureShow('project-custom-review', ['skill']);
    expect(shown.path).toContain('.aiwg/skills/project-custom-review/SKILL.md');
    expect(shown.content).toContain('name: project-custom-review');
  });
});

function viSpyConsole(method: 'log' | 'error'): { restore: () => void } {
  const original = console[method];
  console[method] = () => undefined;
  return {
    restore: () => {
      console[method] = original;
    },
  };
}
