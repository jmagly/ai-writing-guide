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
});
