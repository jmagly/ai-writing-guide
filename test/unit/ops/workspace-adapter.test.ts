import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  OpsRegistry,
  opsWorkspaceToWorkspaceConfig,
} from '../../../src/ops/registry.js';

describe('ops general workspace adapter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) =>
      fs.rm(dir, { recursive: true, force: true })
    ));
  });

  it('maps the ops registry shape without creating a second authorization format', () => {
    const adapted = opsWorkspaceToWorkspaceConfig('infra', {
      home: '/srv/ops',
      mode: 'multi-repo',
      repos: {
        sysops: {
          path: '/srv/ops/sysops',
          remote: 'git@gitea.example:ops/sysops.git',
          extensions: ['sys'],
        },
        devops: {
          path: '/home/me/devops',
          extensions: ['dev'],
        },
      },
    }, ['read', 'issue-comment']);

    expect(adapted.workspace).toEqual({ name: 'infra', root: '/srv/ops' });
    expect(adapted.repos).toEqual([
      {
        name: 'sysops',
        path: '/srv/ops/sysops',
        allowed: ['read', 'issue-comment'],
      },
      {
        name: 'devops',
        path: '/home/me/devops',
        allowed: ['read', 'issue-comment'],
      },
    ]);
  });

  it('makes ops push honor canonical workspace push authorization', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-ops-workspace-'));
    tempDirs.push(tmpDir);
    const home = path.join(tmpDir, 'home');
    const repoPath = path.join(home, 'sysops');
    await fs.mkdir(path.join(home, '.aiwg'), { recursive: true });
    await fs.mkdir(repoPath, { recursive: true });
    await fs.writeFile(
      path.join(home, '.aiwg', 'aiwg.config'),
      JSON.stringify({
        version: '1',
        providers: ['codex'],
        installed: {},
        scripts: {},
        workspace: { name: 'infra' },
        repos: [{
          name: 'sysops',
          path: './sysops',
          allowed: ['read', 'issue-comment'],
        }],
      }),
    );

    const registry = new OpsRegistry(path.join(tmpDir, 'config'));
    await registry.save({
      apiVersion: 'aiwg.io/v1',
      kind: 'OpsRegistry',
      defaultWorkspace: 'infra',
      workspaces: {
        infra: {
          home,
          mode: 'multi-repo',
          repos: {
            sysops: {
              path: repoPath,
              remote: 'git@gitea.example:ops/sysops.git',
              extensions: ['sys'],
            },
          },
        },
      },
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await registry.pushWorkspace('infra');

    expect(log.mock.calls.map(([line]) => String(line)).join('\n'))
      .toContain('denied: workspace member does not allow push');
  });

  it('fails closed when the canonical workspace config is malformed', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-ops-workspace-invalid-'));
    tempDirs.push(tmpDir);
    const home = path.join(tmpDir, 'home');
    const repoPath = path.join(home, 'sysops');
    await fs.mkdir(path.join(home, '.aiwg'), { recursive: true });
    await fs.mkdir(repoPath, { recursive: true });
    await fs.writeFile(path.join(home, '.aiwg', 'aiwg.config'), '{ malformed');

    const registry = new OpsRegistry(path.join(tmpDir, 'config'));
    await registry.save({
      apiVersion: 'aiwg.io/v1',
      kind: 'OpsRegistry',
      defaultWorkspace: 'infra',
      workspaces: {
        infra: {
          home,
          mode: 'multi-repo',
          repos: {
            sysops: {
              path: repoPath,
              remote: 'git@gitea.example:ops/sysops.git',
              extensions: ['sys'],
            },
          },
        },
      },
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await registry.pushWorkspace('infra');

    expect(log.mock.calls.map(([line]) => String(line)).join('\n'))
      .toContain('Refusing workspace push — invalid canonical config');
  });
});
