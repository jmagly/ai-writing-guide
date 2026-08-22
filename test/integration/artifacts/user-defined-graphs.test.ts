/**
 * Integration tests: user-defined graphs via .aiwg/config.yaml
 *
 * Regression coverage for:
 *   #659 — user-defined graphs not recognized via --graph <name>
 *   #658 — defaultBuild graph skips gracefully when dirs absent
 *
 * These tests exercise the full path through cli.ts::main() →
 * parseGraphFlag() → loadUserGraphConfigs() → buildIndex(), which
 * is the path that was broken by the ESM require() bug.
 *
 * @integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { main } from '../../../src/artifacts/cli.js';
import { GRAPH_CONFIGS } from '../../../src/artifacts/types.js';

const BUILTIN_GRAPH_NAMES = ['framework', 'project', 'codebase', 'source', 'user'];

function cleanUserGraphs() {
  for (const key of Object.keys(GRAPH_CONFIGS)) {
    if (!BUILTIN_GRAPH_NAMES.includes(key)) {
      delete GRAPH_CONFIGS[key];
    }
  }
}

describe('user-defined graph CLI integration', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-udg-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    cleanUserGraphs();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('recognizes a user-defined graph via --graph <name> (#659)', async () => {
    // Set up config.yaml with a custom 'references' graph
    const aiwgDir = path.join(tmpDir, '.aiwg');
    const refsDir = path.join(tmpDir, 'documentation', 'references');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.mkdirSync(refsDir, { recursive: true });
    fs.writeFileSync(path.join(refsDir, 'overview.md'), '# Overview\n\nReference documentation.');
    fs.writeFileSync(path.join(aiwgDir, 'config.yaml'), `
index:
  graphs:
    references:
      scanDirs:
        - documentation/references
      extensions:
        - .md
      defaultBuild: false
`);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    // Before the fix this would throw: Invalid graph type 'references'. Valid: framework, project, codebase
    await expect(main(['build', '--graph', 'references'])).resolves.toBeUndefined();

    // Index output should exist at .aiwg/.index/references/
    const indexDir = path.join(tmpDir, '.aiwg', '.index', 'references');
    expect(fs.existsSync(path.join(indexDir, 'metadata.json'))).toBe(true);

    const metadata = JSON.parse(fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8'));
    const entries = Object.keys(metadata.entries);
    expect(entries.length).toBe(1);
    expect(entries[0]).toContain('overview.md');

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('rejects an unrecognized graph name with a clear error', async () => {
    const aiwgDir = path.join(tmpDir, '.aiwg');
    fs.mkdirSync(aiwgDir, { recursive: true });
    // No config.yaml — only built-ins available

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(main(['build', '--graph', 'nonexistent'])).rejects.toThrow('process.exit');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid graph type 'nonexistent'")
    );

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('skips codebase graph gracefully when src/test/tools absent (defaultBuild, #658)', async () => {
    // Only .aiwg/ present — no src/test/tools
    const aiwgDir = path.join(tmpDir, '.aiwg', 'requirements');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.writeFileSync(path.join(aiwgDir, 'UC-001.md'), '---\ntitle: Login\ntype: use-case\n---\n# UC-001');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    // Default build hits both project (succeeds) and codebase (skips)
    await expect(main(['build'])).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('codebase graph: scan directories not found')
    );
    expect(exitSpy).not.toHaveBeenCalled();

    // project graph was still built
    const projectIndex = path.join(tmpDir, '.aiwg', '.index', 'project', 'metadata.json');
    expect(fs.existsSync(projectIndex)).toBe(true);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('auto-detects a conventional Python package layout without a misleading warning (#2123)', async () => {
    const aiwgDir = path.join(tmpDir, '.aiwg');
    const packageDir = path.join(tmpDir, 'obliteratus');
    const testsDir = path.join(tmpDir, 'tests');
    const scriptsDir = path.join(tmpDir, 'scripts');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.mkdirSync(packageDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "obliteratus"\n');
    fs.writeFileSync(path.join(packageDir, '__init__.py'), '__version__ = "1.0"\n');
    fs.writeFileSync(path.join(packageDir, 'core.py'), 'def run():\n    return True\n');
    fs.writeFileSync(path.join(testsDir, 'test_core.py'), 'def test_core():\n    assert True\n');
    fs.writeFileSync(path.join(scriptsDir, 'inspect.py'), 'print("ok")\n');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(main(['build'])).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('codebase graph: scan directories not found'),
    );
    const metadataPath = path.join(tmpDir, '.aiwg', '.index', 'codebase', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const entries = Object.keys(metadata.entries);
    expect(entries).toEqual(expect.arrayContaining([
      'obliteratus/__init__.py',
      'obliteratus/core.py',
      'tests/test_core.py',
      'scripts/inspect.py',
    ]));

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('allows codebase scan roots and extensions to be replaced through graphOverrides (#2123)', async () => {
    const aiwgDir = path.join(tmpDir, '.aiwg');
    const backendDir = path.join(tmpDir, 'backend');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.mkdirSync(backendDir, { recursive: true });
    fs.writeFileSync(path.join(backendDir, 'service.py'), 'SERVICE = True\n');
    fs.writeFileSync(path.join(aiwgDir, 'aiwg.config'), JSON.stringify({
      index: {
        graphOverrides: {
          codebase: {
            scanDirs: ['backend'],
            extensions: ['.py'],
          },
        },
      },
    }));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(main(['build', '--graph', 'codebase'])).resolves.toBeUndefined();

    expect(GRAPH_CONFIGS.codebase.scanDirs).toEqual(['backend']);
    expect(GRAPH_CONFIGS.codebase.extensions).toEqual(['.py']);
    const metadata = JSON.parse(fs.readFileSync(
      path.join(tmpDir, '.aiwg', '.index', 'codebase', 'metadata.json'),
      'utf-8',
    ));
    expect(Object.keys(metadata.entries)).toEqual(['backend/service.py']);
    consoleSpy.mockRestore();
  });

  it('keeps explicit --graph codebase failure semantics when no supported roots exist (#2123)', async () => {
    fs.mkdirSync(path.join(tmpDir, '.aiwg'), { recursive: true });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(main(['build', '--graph', 'codebase'])).rejects.toThrow('process.exit');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: No scan directories found'));

    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('user-defined defaultBuild graph is included in default aiwg index build', async () => {
    const aiwgDir = path.join(tmpDir, '.aiwg');
    const docsDir = path.join(tmpDir, 'docs');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'guide.md'), '# Guide\n\nHow to use this.');
    fs.writeFileSync(path.join(aiwgDir, 'config.yaml'), `
index:
  graphs:
    docs:
      scanDirs:
        - docs
      extensions:
        - .md
      defaultBuild: true
`);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(main(['build'])).resolves.toBeUndefined();

    // docs graph should be built automatically (defaultBuild: true)
    const docsIndex = path.join(tmpDir, '.aiwg', '.index', 'docs', 'metadata.json');
    expect(fs.existsSync(docsIndex)).toBe(true);
    const metadata = JSON.parse(fs.readFileSync(docsIndex, 'utf-8'));
    expect(Object.keys(metadata.entries).length).toBe(1);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('builds lightweight corpus graphs before heavy defaultBuild graphs (#1720)', async () => {
    const aiwgDir = path.join(tmpDir, '.aiwg');
    fs.mkdirSync(aiwgDir, { recursive: true });

    for (const dir of [
      'documentation/full',
      'documentation/bibliography',
      'documentation/citations',
      'documentation/references',
    ]) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, dir, 'item.md'), `# ${dir}\n`);
    }

    fs.writeFileSync(path.join(aiwgDir, 'config.yaml'), `
index:
  graphs:
    full-content:
      scanDirs: [documentation/full]
      extensions: [.md]
      defaultBuild: true
      buildTier: heavy
    bibliography:
      scanDirs: [documentation/bibliography]
      extensions: [.md]
      defaultBuild: true
    citation-network:
      scanDirs: [documentation/citations]
      extensions: [.md]
      defaultBuild: true
    references:
      scanDirs: [documentation/references]
      extensions: [.md]
      defaultBuild: true
`);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logCalls: string[] = [];
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logCalls.push(String(message ?? ''));
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(main(['build'])).resolves.toBeUndefined();

    const outputLines = logCalls.filter((line) => line.includes('Output:'));
    const pos = (graph: string) => outputLines.findIndex((line) => line.includes(`${path.sep}${graph}`));

    expect(pos('references')).toBeGreaterThanOrEqual(0);
    expect(pos('citation-network')).toBeGreaterThan(pos('references'));
    expect(pos('bibliography')).toBeGreaterThan(pos('citation-network'));
    expect(pos('full-content')).toBeGreaterThan(pos('bibliography'));

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('syncs built graph caches in lightweight-first order (#1720)', async () => {
    const aiwgDir = path.join(tmpDir, '.aiwg');
    fs.mkdirSync(aiwgDir, { recursive: true });
    fs.writeFileSync(path.join(aiwgDir, 'config.yaml'), `
index:
  graphs:
    full-content:
      scanDirs: [documentation/full]
      defaultBuild: true
      buildTier: heavy
    references:
      scanDirs: [documentation/references]
      defaultBuild: true
    citation-network:
      scanDirs: [documentation/citations]
      defaultBuild: true
`);

    for (const graph of ['full-content', 'references', 'citation-network']) {
      const dir = path.join(tmpDir, '.aiwg', '.index', graph);
      fs.mkdirSync(dir, { recursive: true });
      const entryPath = `${graph}/item.md`;
      fs.writeFileSync(
        path.join(dir, 'metadata.json'),
        JSON.stringify({
          version: '1.0.0',
          builtAt: '2026-01-01T00:00:00.000Z',
          buildTimeMs: 1,
          entries: {
            [entryPath]: {
              path: entryPath,
              type: 'document',
              phase: 'research',
              title: graph,
              tags: [graph],
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              checksum: graph,
              summary: graph,
              dependencies: [],
              dependents: [],
            },
          },
        }),
      );
      fs.writeFileSync(path.join(dir, 'dependencies.json'), JSON.stringify({ [entryPath]: { upstream: [], downstream: [] } }));
    }

    const logCalls: string[] = [];
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logCalls.push(String(message ?? ''));
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(main(['sync', '--all', '--json', '--generated-at', '2026-01-02T00:00:00.000Z'])).resolves.toBeUndefined();

    const parsed = JSON.parse(logCalls.join('\n'));
    const graphs = parsed.manifests.map((m: { graph: string }) => m.graph);
    expect(graphs.indexOf('references')).toBeGreaterThanOrEqual(0);
    expect(graphs.indexOf('citation-network')).toBeGreaterThan(graphs.indexOf('references'));
    expect(graphs.indexOf('full-content')).toBeGreaterThan(graphs.indexOf('citation-network'));

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
