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
  results: Array<{
    path: string;
    type: string;
    name?: string;
    title: string;
    capability?: string;
    ranking?: {
      matches: Array<{
        field: string;
        match: string;
        value?: string;
        query_token_coverage?: number;
      }>;
      tie_breakers: { scope: string; scope_rank: number };
    };
  }>;
  total: number;
  diagnostics?: {
    facet_activations: Array<{
      facet: string;
      status: string;
      reason?: string;
    }>;
  };
}

interface DiscoveryMatrixCase {
  id: string;
  phrase: string;
  expected_path: string;
  expected_type: string;
  type_filter?: string[];
  max_rank?: number;
  expected_top_path?: string;
  use_default_graph?: boolean;
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
    fs.mkdirSync(
      path.join(
        corpusRoot,
        '.aiwg',
        'addons',
        'neuroframing-marketing',
        'skills',
        'custom-marketing-execution',
      ),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(
        corpusRoot,
        '.aiwg',
        'addons',
        'neuroframing-marketing',
        'skills',
        'custom-marketing-execution',
        'SKILL.md',
      ),
      [
        '---',
        'name: custom-marketing-execution',
        'description: Convert a custom marketing execution request, buyer persona, audience persona, creative brief, or content assignment into a routed execution brief.',
        'triggers:',
        '  - "custom marketing execution"',
        '  - "buyer persona marketing execution"',
        '  - "audience persona content brief"',
        '---',
        '',
        '# Custom Marketing Execution',
        '',
        'Route supplied buyer and audience context into marketing content execution.',
        '',
      ].join('\n'),
    );
    const projectLocalAssets: Array<[string, string]> = [
      ['.aiwg/extensions/local-governance/rules/local-governance.md', [
        '---', 'description: Enforce nebula project governance.', '---',
        '# Local Governance', '', 'Apply nebula project governance.',
      ].join('\n')],
      ['.aiwg/addons/local-operations/agents/local-operator.md', [
        '---', 'description: Coordinate zephyr project operations.', '---',
        '# Local Operator',
      ].join('\n')],
      ['.aiwg/addons/local-operations/commands/local-inspect.md', [
        '---', 'description: Inspect quasar project readiness.', '---',
        '# Local Inspect',
      ].join('\n')],
      ['.aiwg/frameworks/local-delivery/behaviors/local-safety.md', [
        '---', 'description: Preserve aurora project safety.', '---',
        '# Local Safety',
      ].join('\n')],
      ['.aiwg/frameworks/local-delivery/templates/provider/config.toml',
        '# Configure pulsar project provider template\nmode = "local"\n'],
      ['.aiwg/frameworks/local-delivery/runbooks/recovery-runbook.md', [
        '---', 'type: runbook', 'description: Recover the comet project service.', '---',
        '# Recovery Runbook', '', '## Procedure', '', 'Restart the service.', '',
        '## Verification', '', 'Confirm service health.',
      ].join('\n')],
      ['.aiwg/frameworks/local-delivery/flows/meteor-route.yaml', [
        'apiVersion: flow.aiwg.io/v1', 'kind: FlowPlaybook', 'metadata:',
        '  name: meteor-route', 'spec:', '  description: Orchestrate the meteor project.',
        '  steps:', '    - id: verify', '      action: run-tests',
      ].join('\n')],
      ['.aiwg/plugins/local-tools/hooks/preflight.md', [
        '---', 'description: Check eclipse project preflight.', '---',
        '# Local Preflight Hook',
      ].join('\n')],
    ];
    for (const [relativePath, content] of projectLocalAssets) {
      const fullPath = path.join(corpusRoot, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

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
    typeFilter?: string[],
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
        typeFilter: typeFilter ?? MATRIX.cases.find((testCase) => testCase.phrase === phrase)?.type_filter,
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
      const useDefaultGraph = testCase.use_default_graph ?? false;
      const local = await captureDiscover(testCase.phrase, 'local', useDefaultGraph);
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
    }, 60_000);
  }

  it('explains exact marketing-trigger dominance over generic persona identity routing (#1828)', async () => {
    const result = await captureDiscover(
      'custom marketing execution from buyer persona',
      'fortemi-core',
      true,
    );
    const top = result.results[0];

    expect(top.path).toContain(
      '.aiwg/addons/neuroframing-marketing/skills/custom-marketing-execution/SKILL.md',
    );
    expect(top.ranking?.matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: 'trigger',
        match: 'contained-phrase',
        value: 'custom marketing execution',
        query_token_coverage: 0.6,
      }),
    ]));
    expect(top.ranking?.tie_breakers).toMatchObject({
      scope: 'project',
      scope_rank: 0,
    });
    expect(result.diagnostics?.facet_activations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        facet: 'persona-identity',
        status: 'suppressed',
        reason: expect.stringContaining('marketing audience context'),
      }),
    ]));
    const customRank = result.results.findIndex(
      (item) => item.name === 'custom-marketing-execution',
    );
    const genericPersonaRanks = result.results
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.type === 'agent' && item.name?.startsWith('aiwg-'))
      .map(({ index }) => index);
    expect(customRank).toBe(0);
    expect(genericPersonaRanks.every((rank) => rank > customRank)).toBe(true);
  });

  it('shows canonical framework skills from bare names on the Fortemi Core default graph', async () => {
    const docSync = await captureShow('doc-sync', ['skill']);
    expect(docSync.path).toContain('agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md');
    expect(docSync.content).toContain('name: doc-sync');

    const flowRelease = await captureShow('flow-release', ['skill']);
    expect(flowRelease.path).toContain('agentic/code/frameworks/sdlc-complete/skills/flow-release/SKILL.md');
    expect(flowRelease.content).toContain('name: flow-release');
  });

  it('discovers project-local lifecycle commands from the built Fortemi corpus (#1863)', async () => {
    const exactCases = [
      ['new-bundle', 'new-bundle'],
      ['promote bundle', 'promote'],
    ] as const;

    for (const [phrase, expectedName] of exactCases) {
      const result = await captureDiscover(phrase, 'fortemi-core', true);
      const rank = result.results.findIndex((item) => item.name === expectedName) + 1;
      expect(rank, `${phrase} expected rank`).toBeGreaterThan(0);
      expect(rank, `${phrase} expected rank`).toBeLessThanOrEqual(3);
      expect(result.results[rank - 1]?.path).toContain(
        `agentic/code/addons/aiwg-utils/skills/${expectedName}/SKILL.md`,
      );
    }

    const lifecycle = await captureDiscover('project-local bundle', 'fortemi-core', true);
    const names = lifecycle.results.map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(['new-bundle', 'promote']));
    expect(lifecycle.results.find((item) => item.name === 'new-bundle')?.capability)
      .toContain('Scaffold a project-local');
    expect(lifecycle.results.find((item) => item.name === 'promote')?.capability)
      .toContain('Promote or graduate');
  }, 60_000);

  it('discovers the standalone plugin repository workflow (#1865)', async () => {
    for (const phrase of ['standalone plugin repository', 'publish project-local plugin']) {
      const result = await captureDiscover(phrase, 'fortemi-core', true);
      const rank = result.results.findIndex((item) => item.name === 'package-plugin') + 1;
      expect(rank, `${phrase} expected rank`).toBeGreaterThan(0);
      expect(rank, `${phrase} expected rank`).toBeLessThanOrEqual(3);
      expect(result.results[rank - 1]?.path).toContain(
        'agentic/code/addons/aiwg-utils/skills/package-plugin/SKILL.md',
      );
    }
  }, 45_000);

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

  it('discovers and shows every project-local operational asset type on the default graph', async () => {
    const cases = [
      ['nebula project governance', 'rule', '.aiwg/extensions/local-governance/rules/local-governance.md'],
      ['zephyr project operations', 'agent', '.aiwg/addons/local-operations/agents/local-operator.md'],
      ['quasar project readiness', 'command', '.aiwg/addons/local-operations/commands/local-inspect.md'],
      ['aurora project safety', 'behavior', '.aiwg/frameworks/local-delivery/behaviors/local-safety.md'],
      ['pulsar project provider template', 'template', '.aiwg/frameworks/local-delivery/templates/provider/config.toml'],
      ['comet project service', 'runbook', '.aiwg/frameworks/local-delivery/runbooks/recovery-runbook.md'],
      ['meteor project', 'flow', '.aiwg/frameworks/local-delivery/flows/meteor-route.yaml'],
      // Hooks are intentionally opt-in rather than part of broad discovery.
      ['eclipse project preflight', 'hook', '.aiwg/plugins/local-tools/hooks/preflight.md'],
    ] as const;

    for (const [phrase, type, expectedPath] of cases) {
      const local = await captureDiscover(phrase, 'local', true, [type]);
      const fortemi = await captureDiscover(phrase, 'fortemi-core', true, [type]);
      expect(local.results[0]?.path, `${type} local discovery`).toContain(expectedPath);
      expect(fortemi.results[0]?.path, `${type} Fortemi discovery`).toContain(expectedPath);
      expect(fortemi.results[0]?.type).toBe(type);
      expect(normalizedPaths(fortemi)).toEqual(normalizedPaths(local));

      const shown = await captureShow(path.basename(expectedPath).replace(/\.[^.]+$/, ''), [type]);
      expect(shown.path, `${type} Fortemi show`).toContain(expectedPath);
    }
  }, 120_000);
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
