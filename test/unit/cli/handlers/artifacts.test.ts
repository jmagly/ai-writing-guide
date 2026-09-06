import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';
import { artifactsHandler } from '../../../../src/cli/handlers/artifacts.js';

function ctx(args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['artifacts', ...args],
    cwd: process.cwd(),
    frameworkRoot: process.cwd(),
    dryRun: args.includes('--dry-run'),
  };
}

describe('artifactsHandler', () => {
  it('exposes artifact-root relocation metadata', () => {
    expect(artifactsHandler.id).toBe('artifacts');
    expect(artifactsHandler.aliases).toContain('artifact');
    expect(artifactsHandler.category).toBe('index');
  });

  it('shows help', async () => {
    const result = await artifactsHandler.execute(ctx(['--help']));
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('aiwg artifacts move --to <path>');
    expect(result.message).toContain('aiwg artifacts path [--json] [--check-write]');
    expect(result.message).toContain('aiwg artifacts attach --to <existing-path>');
    expect(result.message).toContain('aiwg artifacts repair --dry-run');
  });

  it('resolves the configured external artifact root for workflow authors', async () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-artifact-path-'));
    try {
      const corpus = join(project, 'external-corpus', '.aiwg');
      mkdirSync(corpus, { recursive: true });
      writeFileSync(join(project, '.aiwg-location'), 'external-corpus/.aiwg\n');

      const result = await artifactsHandler.execute({ ...ctx(['path']), cwd: project });

      expect(result).toMatchObject({ exitCode: 0, message: corpus, rawOutput: true });
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('returns a stable JSON envelope for the resolved artifact root', async () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-artifact-path-json-'));
    try {
      const result = await artifactsHandler.execute({ ...ctx(['path', '--json']), cwd: project });

      expect(result.exitCode).toBe(0);
      expect(result.rawOutput).toBe(true);
      expect(JSON.parse(result.message ?? '{}')).toEqual({
        schema: 'aiwg.artifacts.path.v1',
        project_root: project,
        artifact_root: join(project, '.aiwg'),
        external: false,
        write_ready: true,
        write_error: null,
        local_control_files: ['AIWG.md', 'aiwg.config', 'frameworks/registry.json'],
      });
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('reports and enforces write readiness for an offline external root', async () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-artifact-offline-json-'));
    try {
      writeFileSync(join(project, '.aiwg-location'), 'offline-corpus/.aiwg\n');
      const inspect = await artifactsHandler.execute({ ...ctx(['path', '--json']), cwd: project });
      expect(JSON.parse(inspect.message ?? '{}')).toMatchObject({
        external: true,
        write_ready: false,
        local_control_files: ['AIWG.md', 'aiwg.config', 'frameworks/registry.json'],
      });
      expect(JSON.parse(inspect.message ?? '{}').write_error).toMatch(/external AIWG artifact root is unavailable/);

      const checked = await artifactsHandler.execute({ ...ctx(['path', '--check-write']), cwd: project });
      expect(checked.exitCode).toBe(1);
      expect(checked.message).toMatch(/will not fall back to repository-local \.aiwg payload/);
      expect(existsSync(join(project, '.aiwg'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('keeps workflow release and report writes in an attached corpus', async () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-artifact-workflow-'));
    try {
      const corpus = join(project, 'external-corpus', '.aiwg');
      mkdirSync(corpus, { recursive: true });
      writeFileSync(join(project, '.aiwg-location'), 'external-corpus/.aiwg\n');

      const result = await artifactsHandler.execute({ ...ctx(['path']), cwd: project });
      const artifactRoot = result.message!;
      mkdirSync(join(artifactRoot, 'releases'), { recursive: true });
      mkdirSync(join(artifactRoot, 'reports'), { recursive: true });
      writeFileSync(join(artifactRoot, 'releases', 'fixture.yaml'), 'version: 1\n');
      writeFileSync(join(artifactRoot, 'reports', 'fixture.md'), '# Report\n');

      expect(existsSync(join(corpus, 'releases', 'fixture.yaml'))).toBe(true);
      expect(existsSync(join(corpus, 'reports', 'fixture.md'))).toBe(true);
      expect(existsSync(join(project, '.aiwg', 'releases', 'fixture.yaml'))).toBe(false);
      expect(existsSync(join(project, '.aiwg', 'reports', 'fixture.md'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('requires --to for move', async () => {
    const result = await artifactsHandler.execute(ctx(['move']));
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('--to <path> is required');
  });
});
