/**
 * Unit tests for .gitignore self-heal in project-local bundle scaffolding.
 *
 * @source @src/extensions/project-local-gitignore.ts
 * @implements #1085
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  AIWG_GITIGNORE_SENTINEL,
  detectAiwgBlanketIgnore,
  appendAiwgSourceTrackBlock,
} from '../../../src/extensions/project-local-gitignore.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-gitignore-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('project-local-gitignore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('detectAiwgBlanketIgnore', () => {
    it('reports no .gitignore when missing', async () => {
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.gitignoreExists).toBe(false);
      expect(r.blanketIgnore).toBe(false);
    });

    it('detects .aiwg/ blanket ignore', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), 'node_modules\n.aiwg/\nbuild\n');
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.gitignoreExists).toBe(true);
      expect(r.blanketIgnore).toBe(true);
      expect(r.hasExistingNegation).toBe(false);
      expect(r.hasManagedBlock).toBe(false);
    });

    it('detects .aiwg blanket ignore (no trailing slash)', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '.aiwg\n');
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.blanketIgnore).toBe(true);
    });

    it('detects /.aiwg/ blanket ignore (path-anchored)', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '/.aiwg/\n');
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.blanketIgnore).toBe(true);
    });

    it('detects .aiwg/* blanket ignore', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '.aiwg/*\n');
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.blanketIgnore).toBe(true);
    });

    it('does NOT report blanket ignore for a specific subdirectory', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '.aiwg/working/\n.aiwg/research/\n');
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.blanketIgnore).toBe(false);
    });

    it('detects existing source-directory negation', async () => {
      writeFileSync(
        join(tmpDir, '.gitignore'),
        '.aiwg/\n!.aiwg/addons/\n',
      );
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.blanketIgnore).toBe(true);
      expect(r.hasExistingNegation).toBe(true);
    });

    it('detects existing managed block by sentinel', async () => {
      writeFileSync(
        join(tmpDir, '.gitignore'),
        `.aiwg/\n${AIWG_GITIGNORE_SENTINEL}\n!.aiwg/addons/\n`,
      );
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.hasManagedBlock).toBe(true);
    });

    it('ignores comments when classifying', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '# .aiwg/\n# this is just a comment\n');
      const r = await detectAiwgBlanketIgnore(tmpDir);
      expect(r.blanketIgnore).toBe(false);
    });
  });

  describe('appendAiwgSourceTrackBlock', () => {
    it('no-ops when .gitignore is missing', async () => {
      const r = await appendAiwgSourceTrackBlock(tmpDir);
      expect(r.added).toBe(false);
      expect(r.reason).toMatch(/no \.gitignore/);
    });

    it('no-ops when .aiwg/ is not blanket-ignored', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), 'node_modules\n.aiwg/working/\n');
      const r = await appendAiwgSourceTrackBlock(tmpDir);
      expect(r.added).toBe(false);
      expect(r.reason).toMatch(/no blanket .aiwg ignore/);
    });

    it('no-ops when operator already has !.aiwg negation', async () => {
      writeFileSync(
        join(tmpDir, '.gitignore'),
        '.aiwg/\n!.aiwg/extensions/\n',
      );
      const r = await appendAiwgSourceTrackBlock(tmpDir);
      expect(r.added).toBe(false);
      expect(r.reason).toMatch(/explicit !\.aiwg negation/);
    });

    it('appends the un-ignore block when blanket-ignored', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), 'node_modules\n.aiwg/\n');
      const r = await appendAiwgSourceTrackBlock(tmpDir);
      expect(r.added).toBe(true);

      const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
      expect(content).toContain(AIWG_GITIGNORE_SENTINEL);
      expect(content).toContain('!.aiwg/aiwg.config');
      expect(content).toContain('!.aiwg/addons/');
      expect(content).toContain('!.aiwg/extensions/');
      expect(content).toContain('!.aiwg/frameworks/');
      expect(content).toContain('!.aiwg/plugins/');
    });

    it('is idempotent — running twice does not duplicate the block', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), 'node_modules\n.aiwg/\n');
      await appendAiwgSourceTrackBlock(tmpDir);
      const r2 = await appendAiwgSourceTrackBlock(tmpDir);
      expect(r2.added).toBe(false);
      expect(r2.reason).toMatch(/block already present/);

      const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
      const sentinelCount = content.split(AIWG_GITIGNORE_SENTINEL).length - 1;
      expect(sentinelCount).toBe(1);
    });

    it('appends a trailing newline when .gitignore lacks one', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '.aiwg/'); // no trailing \n
      await appendAiwgSourceTrackBlock(tmpDir);
      const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
      // Should not produce a malformed line like ".aiwg/# AIWG..."
      expect(content).toMatch(/\.aiwg\/\n/);
    });

    it('preserves original .gitignore content', async () => {
      const original = '# my project\nnode_modules/\n.env\n.aiwg/\nbuild/\n';
      writeFileSync(join(tmpDir, '.gitignore'), original);
      await appendAiwgSourceTrackBlock(tmpDir);
      const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
      expect(content.startsWith(original)).toBe(true);
    });
  });
});
