import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';
import { repoAccessHandler } from '../../../../src/cli/handlers/repo-access.js';

describe('repoAccessHandler', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-repo-access-handler-'));
    projectDir = path.join(tmpDir, 'project');
    await fs.mkdir(path.join(projectDir, '.aiwg', 'ops', 'security'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'handoff'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.aiwg', 'ops', 'security', 'repo-access.manifest.yaml'),
      [
        'version: "1"',
        'repos:',
        '  - name: project',
        '    path: .',
        '    actions: [read, write, commit, push, issue-comment]',
        '  - name: handoff',
        '    path: ../handoff',
        '    actions: [read, issue-comment]',
        '',
      ].join('\n')
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function makeCtx(args: string[]): HandlerContext {
    return {
      args,
      rawArgs: ['repo-access', ...args],
      cwd: projectDir,
      frameworkRoot: projectDir,
    };
  }

  it('has command metadata', () => {
    expect(repoAccessHandler.id).toBe('repo-access');
    expect(repoAccessHandler.category).toBe('utility');
  });

  it('lists manifest entries', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await repoAccessHandler.execute(makeCtx(['list']));

    expect(result.exitCode).toBe(0);
    const output = log.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).toContain('project');
    expect(output).toContain('handoff');
  });

  it('returns zero for allowed checks', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await repoAccessHandler.execute(makeCtx(['check', '--path', '.', '--action', 'write']));

    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.map(([line]) => String(line)).join('\n')).toContain('ALLOW write');
  });

  it('returns one for denied checks', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await repoAccessHandler.execute(makeCtx(['check', '--path', '../handoff', '--action', 'write']));

    expect(result.exitCode).toBe(1);
    expect(log.mock.calls.map(([line]) => String(line)).join('\n')).toContain('DENY write');
  });

  it('explains unlisted paths without mutating state', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await repoAccessHandler.execute(makeCtx(['explain', '--path', '../other']));

    expect(result.exitCode).toBe(0);
    expect(log.mock.calls.map(([line]) => String(line)).join('\n')).toContain('Matched repo: none');
  });

  it('returns usage error for missing action', async () => {
    const result = await repoAccessHandler.execute(makeCtx(['check', '--path', '.']));

    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('--action');
  });
});
