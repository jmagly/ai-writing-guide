/**
 * Heuristic Project-Type Inference Tests
 *
 * Covers the four detection paths from #941:
 *   - Code project (manifest + tests + git)
 *   - Docs/knowledge project (lots of .md, no manifest)
 *   - Asset project (media files dominant)
 *   - Mixed project (multiple dimensions surface)
 *
 * @source @src/contributors/heuristic.ts
 * @issue #941
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { inferProjectType } from '../../../src/contributors/heuristic.js';

class Fixture {
  readonly root: string;
  constructor() {
    this.root = mkdtempSync(path.join(tmpdir(), 'aiwg-heuristic-test-'));
  }
  cleanup() {
    rmSync(this.root, { recursive: true, force: true });
  }
  write(rel: string, content = 'x') {
    const full = path.join(this.root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  mkdir(rel: string) {
    mkdirSync(path.join(this.root, rel), { recursive: true });
  }
}

describe('inferProjectType — code project detection', () => {
  let fx: Fixture;
  beforeEach(() => { fx = new Fixture(); });
  afterEach(() => fx.cleanup());

  it('detects a JS/TS project from package.json', async () => {
    fx.write('package.json', '{}');
    fx.mkdir('test');
    fx.write('README.md', '# Project');

    const report = await inferProjectType(fx.root);

    const code = report.dimensions.find(d => d.kind === 'code');
    expect(code).toBeDefined();
    expect(code?.summary).toMatch(/JS\/TS/);
    // README + manifest + test dir = 2 of 3 strong signals (no .git here)
    expect(['high', 'medium']).toContain(code?.confidence);
  });

  it('detects a Rust project from Cargo.toml', async () => {
    fx.write('Cargo.toml', '[package]\nname = "x"\n');

    const report = await inferProjectType(fx.root);

    const code = report.dimensions.find(d => d.kind === 'code');
    expect(code?.summary).toMatch(/Rust/);
  });

  it('combines multiple manifests into a single dimension', async () => {
    fx.write('package.json', '{}');
    fx.write('pyproject.toml', '[tool.poetry]\nname = "x"\n');

    const report = await inferProjectType(fx.root);

    const code = report.dimensions.find(d => d.kind === 'code');
    expect(code?.summary).toMatch(/JS\/TS/);
    expect(code?.summary).toMatch(/Python/);
  });
});

describe('inferProjectType — docs project detection', () => {
  let fx: Fixture;
  beforeEach(() => { fx = new Fixture(); });
  afterEach(() => fx.cleanup());

  it('detects a docs project from many .md files and no manifest', async () => {
    for (let i = 0; i < 60; i++) fx.write(`docs/page-${i}.md`, `# Page ${i}`);

    const report = await inferProjectType(fx.root);

    const docs = report.dimensions.find(d => d.kind === 'docs');
    expect(docs).toBeDefined();
    expect(docs?.confidence).toBe('high');
    expect(docs?.summary).toMatch(/docs.*knowledge project/i);
    // Pure docs project should have no code dimension.
    expect(report.dimensions.find(d => d.kind === 'code')).toBeUndefined();
  });

  it('downgrades docs confidence when a code manifest is also present', async () => {
    fx.write('package.json', '{}');
    for (let i = 0; i < 20; i++) fx.write(`docs/p-${i}.md`, '# x');

    const report = await inferProjectType(fx.root);

    const docs = report.dimensions.find(d => d.kind === 'docs');
    expect(docs?.confidence).toBe('low');
    expect(docs?.summary).toMatch(/code project with docs/);
    // Both dimensions surface in mixed projects per #941 §Mixed.
    expect(report.dimensions.find(d => d.kind === 'code')).toBeDefined();
  });

  it('does not produce a docs dimension when there are < 5 markdown files', async () => {
    fx.write('README.md', '# x');
    fx.write('CHANGELOG.md', '# x');

    const report = await inferProjectType(fx.root);
    expect(report.dimensions.find(d => d.kind === 'docs')).toBeUndefined();
  });
});

describe('inferProjectType — asset project detection', () => {
  let fx: Fixture;
  beforeEach(() => { fx = new Fixture(); });
  afterEach(() => fx.cleanup());

  it('detects an asset-dominant project from many media files', async () => {
    for (let i = 0; i < 30; i++) fx.write(`audio/track-${i}.mp3`);

    const report = await inferProjectType(fx.root);

    const assets = report.dimensions.find(d => d.kind === 'assets');
    expect(assets).toBeDefined();
    expect(assets?.summary).toMatch(/30 media file/);
    expect(assets?.summary).toMatch(/audio dominant/);
  });

  it('does not flag a small number of images as an asset project', async () => {
    for (let i = 0; i < 5; i++) fx.write(`docs/img/icon-${i}.png`);
    fx.write('package.json', '{}');

    const report = await inferProjectType(fx.root);
    expect(report.dimensions.find(d => d.kind === 'assets')).toBeUndefined();
  });
});

describe('inferProjectType — empty project', () => {
  it('returns empty: true when no signals fire', async () => {
    const fx = new Fixture();
    try {
      const report = await inferProjectType(fx.root);
      expect(report.dimensions).toHaveLength(0);
      expect(report.empty).toBe(true);
      expect(report.origin).toBe('heuristic');
    } finally {
      fx.cleanup();
    }
  });
});

describe('inferProjectType — mixed project', () => {
  it('surfaces code + docs + assets dimensions on a kitchen-sink repo', async () => {
    const fx = new Fixture();
    try {
      fx.write('package.json', '{}');
      fx.mkdir('test');
      for (let i = 0; i < 60; i++) fx.write(`docs/p-${i}.md`, '# x');
      for (let i = 0; i < 30; i++) fx.write(`media/v-${i}.mp4`);

      const report = await inferProjectType(fx.root);
      const kinds = report.dimensions.map(d => d.kind);
      expect(kinds).toContain('code');
      expect(kinds).toContain('docs');
      expect(kinds).toContain('assets');
    } finally {
      fx.cleanup();
    }
  });
});
