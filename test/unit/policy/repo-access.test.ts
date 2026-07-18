import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  checkRepoAccess,
  findRepoEntry,
  loadRepoAccessManifest,
} from '../../../src/policy/repo-access.js';

describe('repo access manifest policy', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-repo-access-'));
    projectDir = path.join(tmpDir, 'project');
    await fs.mkdir(path.join(projectDir, '.aiwg', 'ops', 'security'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'research-papers'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.aiwg', 'ops', 'security', 'repo-access.manifest.yaml'),
      [
        'version: "1"',
        'default_policy: deny',
        'repos:',
        '  - name: project',
        '    path: .',
        '    actions: [read, write, commit, push, issue-comment]',
        '  - name: research-papers',
        '    path: ../research-papers',
        '    actions: [read, issue-comment]',
        '    notes: handoff-only',
        '',
      ].join('\n')
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('loads and validates the manifest', () => {
    const manifest = loadRepoAccessManifest(projectDir);

    expect(manifest.defaultPolicy).toBe('deny');
    expect(manifest.repos).toHaveLength(2);
    expect(manifest.repos[0].actions).toContain('write');
  });

  it('allows an explicitly permitted action', () => {
    const manifest = loadRepoAccessManifest(projectDir);

    const decision = checkRepoAccess(manifest, projectDir, 'write', projectDir);

    expect(decision.allowed).toBe(true);
    expect(decision.matchedRepo?.name).toBe('project');
  });

  it('denies a handoff-only repo action that is not listed', () => {
    const manifest = loadRepoAccessManifest(projectDir);

    const decision = checkRepoAccess(manifest, path.join(tmpDir, 'research-papers'), 'write', projectDir);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('does not allow write');
    expect(decision.matchedRepo?.name).toBe('research-papers');
  });

  it('allows handoff-only issue comments when listed', () => {
    const manifest = loadRepoAccessManifest(projectDir);

    const decision = checkRepoAccess(manifest, path.join(tmpDir, 'research-papers'), 'issue-comment', projectDir);

    expect(decision.allowed).toBe(true);
  });

  it('denies unlisted repos by default', () => {
    const manifest = loadRepoAccessManifest(projectDir);
    const unlisted = path.join(tmpDir, 'unlisted');

    const decision = checkRepoAccess(manifest, unlisted, 'commit', projectDir);

    expect(decision.allowed).toBe(false);
    expect(decision.matchedRepo).toBeNull();
    expect(decision.reason).toContain('unlisted');
  });

  it('matches nested paths to the nearest repo entry', () => {
    const manifest = loadRepoAccessManifest(projectDir);

    const entry = findRepoEntry(manifest, path.join(tmpDir, 'research-papers', 'docs', 'REF.md'), projectDir);

    expect(entry?.name).toBe('research-papers');
  });

  it('rejects invalid actions during validation', async () => {
    await fs.writeFile(
      path.join(projectDir, '.aiwg', 'ops', 'security', 'repo-access.manifest.yaml'),
      [
        'version: "1"',
        'repos:',
        '  - name: bad',
        '    path: .',
        '    actions: [teleport]',
        '',
      ].join('\n')
    );

    expect(() => loadRepoAccessManifest(projectDir)).toThrow(/Invalid repo access action/);
  });

  it('prefers canonical aiwg.config workspace members over the legacy YAML manifest', async () => {
    await fs.mkdir(path.join(projectDir, '.aiwg'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.aiwg', 'aiwg.config'),
      JSON.stringify({
        version: '1',
        providers: ['codex'],
        installed: {},
        scripts: {},
        workspace: { name: 'canonical' },
        repos: [
          {
            name: 'project',
            path: '.',
            allowed: ['read', 'issue-comment'],
          },
        ],
      }),
    );

    const manifest = loadRepoAccessManifest(projectDir);
    const decision = checkRepoAccess(manifest, projectDir, 'write', projectDir);

    expect(manifest.source).toBe('workspace-config');
    expect(manifest.workspaceName).toBe('canonical');
    expect(decision.allowed).toBe(false);
  });

  it('fails closed on a malformed canonical config instead of falling back to YAML', async () => {
    await fs.writeFile(
      path.join(projectDir, '.aiwg', 'aiwg.config'),
      '{ malformed',
    );

    expect(() => loadRepoAccessManifest(projectDir)).toThrow();
  });
});
