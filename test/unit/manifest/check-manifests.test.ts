import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const checker = resolve('tools/manifest/check-manifests.mjs');
let tempRoot: string | null = null;

function makeTempRoot() {
  tempRoot = mkdtempSync(join(tmpdir(), 'aiwg-check-manifests-'));
  return tempRoot;
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runChecker(root: string) {
  return spawnSync(process.execPath, [checker, root], {
    encoding: 'utf8',
  });
}

afterEach(() => {
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('check-manifests', () => {
  it('fails drift for supported directory manifests', () => {
    const root = makeTempRoot();
    mkdirSync(join(root, 'supported'), { recursive: true });
    writeFileSync(join(root, 'supported', 'actual.md'), '# Actual\n', 'utf8');
    writeJson(join(root, 'supported', 'manifest.json'), {
      schema: 'directory-file-list/v1',
      name: 'supported',
      path: 'supported',
      files: [],
      ignore: ['manifest.json'],
    });

    const result = runChecker(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Manifest drift in');
    expect(result.stdout).toContain('actual.md');
  });

  it('skips untyped legacy file-list manifests to avoid low-confidence drift failures', () => {
    const root = makeTempRoot();
    mkdirSync(join(root, 'legacy'), { recursive: true });
    writeFileSync(join(root, 'legacy', 'actual.md'), '# Actual\n', 'utf8');
    writeJson(join(root, 'legacy', 'manifest.json'), {
      name: 'legacy',
      path: 'legacy',
      files: [],
      ignore: ['manifest.json'],
    });

    const result = runChecker(root);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('Manifest drift');
  });

  it('skips manifests with nested component paths even when they have files arrays', () => {
    const root = makeTempRoot();
    mkdirSync(join(root, 'addon', 'seeds'), { recursive: true });
    writeFileSync(join(root, 'addon', 'README.md'), '# Addon\n', 'utf8');
    writeFileSync(join(root, 'addon', 'seeds', 'MEMORY.md'), '# Memory\n', 'utf8');
    writeJson(join(root, 'addon', 'manifest.json'), {
      name: 'addon',
      type: 'addon',
      files: ['README.md', 'seeds/MEMORY.md'],
    });

    const result = runChecker(root);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('Manifest drift');
  });

  it('skips unsupported manifest schemas instead of treating them as directory manifests', () => {
    const root = makeTempRoot();
    mkdirSync(join(root, 'catalog'), { recursive: true });
    writeFileSync(join(root, 'catalog', 'SKILL.md'), '# Skill\n', 'utf8');
    writeJson(join(root, 'catalog', 'manifest.json'), {
      name: 'catalog',
      type: 'skills-catalog',
      skills: [
        {
          name: 'example',
          description: 'Example skill',
          triggers: ['example'],
        },
      ],
    });

    const result = runChecker(root);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('Manifest drift');
  });

  it('does not scan generated, dependency, or hidden workspace directories', () => {
    const root = makeTempRoot();
    for (const dir of ['dist/search-index', 'node_modules/pkg', '.rlm-prep/chunks']) {
      mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(join(root, dir, 'generated.json'), '{}\n', 'utf8');
      writeJson(join(root, dir, 'manifest.json'), {
        schema: 'directory-file-list/v1',
        name: dir,
        path: dir,
        files: [],
        ignore: ['manifest.json'],
      });
    }

    execFileSync(process.execPath, [checker, root], { encoding: 'utf8' });
  });
});
