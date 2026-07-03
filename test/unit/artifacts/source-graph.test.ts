import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { getGraphIndexDir } from '../../../src/artifacts/types.js';
import type { ArtifactIndex, DependencyGraph } from '../../../src/artifacts/types.js';
import { buildAiwgFortemiIndexExport } from '../../../src/artifacts/browser-export.js';

function writeFile(root: string, rel: string, body: string): void {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function readJson<T>(root: string, rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8')) as T;
}

describe('source graph index', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-source-graph-'));
    writeFile(tmpDir, 'tsconfig.json', JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
        allowJs: true,
        resolveJsonModule: true,
        baseUrl: '.',
        typeRoots: [],
        types: [],
      },
    }));
    writeFile(tmpDir, 'src/types.ts', 'export interface Thing { id: string }\n');
    writeFile(tmpDir, 'src/util.ts', 'export const value = 1;\n');
    writeFile(tmpDir, 'src/lazy.ts', 'export const lazy = true;\n');
    writeFile(tmpDir, 'src/cycle-a.ts', "import './cycle-b.js';\nexport const a = true;\n");
    writeFile(tmpDir, 'src/cycle-b.ts', "import './cycle-a.js';\nexport const b = true;\n");
    writeFile(tmpDir, 'src/styles.module.css', '.root { color: red; }\n');
    writeFile(tmpDir, 'src/data.json', '{"ok":true}\n');
    writeFile(tmpDir, 'src/cjs-helper.js', 'module.exports = { helper: true };\n');
    writeFile(tmpDir, 'src/index.ts', [
      "import type { Thing } from './types.js';",
      "import { value } from './util.js';",
      "import './styles.module.css';",
      "import data from './data.json';",
      "export { value } from './util.js';",
      "const cjs = require('./cjs-helper.js');",
      "const lazy = () => import('./lazy.js');",
      "import { defineConfig } from 'vitest/config';",
      "import fs from 'node:fs';",
      "import './missing.js';",
      "export const thing: Thing = { id: String(value + data.ok + cjs.helper + fs.existsSync('.')) };",
      "void lazy;",
    ].join('\n'));
    writeFile(tmpDir, 'vscode-extension/src/extension.ts', "import { value } from '../../src/util';\nexport { value };\n");
    writeFile(tmpDir, 'bin/aiwg.mjs', "await import('../src/index.ts');\n");
    writeFile(tmpDir, 'test/index.test.ts', "import { value } from '../src/util.js';\nvoid value;\n");
    writeFile(tmpDir, 'src/generated/ignored.ts', "import '../util.js';\n");
    writeFile(tmpDir, 'dist/ignored.js', "import '../src/util.js';\n");
    fs.mkdirSync(path.join(tmpDir, 'src', 'nested', 'node_modules', 'pkg'), { recursive: true });
    writeFile(tmpDir, 'src/nested/node_modules/pkg/ignored.ts', "import '../../util.js';\n");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function buildSourceGraph() {
    await buildIndex(tmpDir, { graph: 'source', force: true });
    const dir = getGraphIndexDir(tmpDir, 'source');
    return {
      dir,
      index: readJson<ArtifactIndex>(dir, 'metadata.json'),
      graph: readJson<DependencyGraph>(dir, 'dependencies.json'),
      diagnostics: readJson<{ unresolved: Array<{ source: string; specifier: string }>; cycles: string[][] }>(dir, 'diagnostics.json'),
    };
  }

  it('builds source nodes and TypeScript-resolved import edges', async () => {
    const { index, graph, diagnostics } = await buildSourceGraph();

    expect(index.entries['src/index.ts']).toMatchObject({
      type: 'source.file',
      phase: 'source',
      sourceRoot: 'src',
      extension: '.ts',
      language: 'typescript',
    });
    expect(index.entries['source:module:src/index']).toMatchObject({
      type: 'source.module',
      title: 'src/index',
    });
    expect(index.entries['bin/aiwg.mjs'].type).toBe('source.entrypoint');
    expect(index.entries['src/generated/ignored.ts']).toBeUndefined();
    expect(index.entries['dist/ignored.js']).toBeUndefined();
    expect(index.entries['src/nested/node_modules/pkg/ignored.ts']).toBeUndefined();

    const upstream = graph['src/index.ts'].upstream;
    expect(upstream).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'src/types.ts', type: 'imports_type', specifier: './types.js', confidence: 'exact' }),
      expect.objectContaining({ path: 'src/util.ts', type: 'imports', specifier: './util.js', confidence: 'exact' }),
      expect.objectContaining({ path: 'src/util.ts', type: 'reexports', specifier: './util.js' }),
      expect.objectContaining({ path: 'src/lazy.ts', type: 'imports_dynamic', specifier: './lazy.js', moduleSystem: 'dynamic' }),
      expect.objectContaining({ path: 'src/cjs-helper.js', type: 'requires', specifier: './cjs-helper.js', moduleSystem: 'cjs' }),
      expect.objectContaining({ path: 'src/styles.module.css', type: 'imports_asset', specifier: './styles.module.css' }),
      expect.objectContaining({ path: 'src/data.json', type: 'imports_asset', specifier: './data.json' }),
      expect.objectContaining({ path: 'source:package:vitest/config', type: 'depends_external', specifier: 'vitest/config' }),
      expect.objectContaining({ path: 'source:builtin:node:fs', type: 'depends_external', specifier: 'node:fs' }),
      expect.objectContaining({ type: 'unresolved_import', specifier: './missing.js', diagnostic: expect.stringContaining('Unable to resolve') }),
    ]));

    expect(graph['vscode-extension/src/extension.ts'].upstream).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'src/util.ts', type: 'imports', specifier: '../../src/util' }),
    ]));
    expect(graph['src/util.ts'].downstream).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'test/index.test.ts', type: 'exercised_by' }),
    ]));
    expect(graph['src/index.ts'].downstream).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'bin/aiwg.mjs', type: 'imports_dynamic' }),
    ]));
    expect(diagnostics.unresolved).toEqual([
      expect.objectContaining({ source: 'src/index.ts', specifier: './missing.js' }),
    ]);
    expect(diagnostics.cycles).toEqual(expect.arrayContaining([
      expect.arrayContaining(['src/cycle-a.ts', 'src/cycle-b.ts']),
    ]));

    const tsResolved = ts.resolveModuleName(
      './util.js',
      path.join(tmpDir, 'src/index.ts'),
      {
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        allowJs: true,
        resolveJsonModule: true,
        baseUrl: tmpDir,
      },
      ts.sys,
    ).resolvedModule?.resolvedFileName;
    expect(tsResolved ? path.relative(tmpDir, tsResolved).split(path.sep).join('/') : null).toBe('src/util.ts');
    expect(upstream).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'src/util.ts', specifier: './util.js' }),
    ]));
  });

  it('supports existing query/traversal surfaces and Fortemi source records', async () => {
    const { graph } = await buildSourceGraph();

    expect(graph['src/util.ts'].downstream.map((edge) => edge.path)).toContain('src/index.ts');
    expect(graph['src/util.ts'].downstream.filter((edge) => edge.type === 'exercised_by').map((edge) => edge.path)).toContain('test/index.test.ts');

    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      graph: 'source',
      schemaVersion: 'v2',
      generatedAt: '2026-07-03T00:00:00.000Z',
      includeSourceBody: false,
    });
    const util = exported.items.find((item) => item.source.path === 'src/util.ts');
    const index = exported.items.find((item) => item.source.path === 'src/index.ts');
    expect(util?.type).toBe('aiwg.source.file');
    expect(exported.items.find((item) => item.source.path === 'source:module:src/util')?.type).toBe('aiwg.source.module');
    expect(exported.items.find((item) => item.source.path.startsWith('source:package:vitest/config'))?.type).toBe('aiwg.source.package');
    expect(exported.items.find((item) => item.source.path.includes('source:unresolved:'))?.type).toBe('aiwg.source.unresolved');
    expect(index?.relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'unresolved_import',
        metadata: expect.objectContaining({
          specifier: './missing.js',
          diagnostic: expect.stringContaining('Unable to resolve'),
        }),
      }),
    ]));
  });

  it('keeps optional diagnostic tools non-required', () => {
    const optionalTools = ['madge', 'depcruise'];
    for (const tool of optionalTools) {
      const bin = (() => {
      try {
          return execFileSync('which', [tool], { encoding: 'utf-8' }).trim();
      } catch {
        return '';
      }
    })();
      if (!bin) {
        expect(bin).toBe('');
        continue;
      }
      const args = tool === 'madge' ? ['--json', 'src'] : ['--output-type', 'json', 'src'];
      const output = execFileSync(bin, args, { cwd: tmpDir, encoding: 'utf-8' });
      expect(() => JSON.parse(output)).not.toThrow();
    }
  });
});
