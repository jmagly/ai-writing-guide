import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('project memory registry (#1750)', () => {
  let tmp: string;
  let workspace: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-project-memory-'));
    workspace = path.join(tmp, 'workspace');
    await fs.mkdir(workspace, { recursive: true });
    originalHome = process.env.AIWG_PROJECT_MEMORY_HOME;
    process.env.AIWG_PROJECT_MEMORY_HOME = path.join(tmp, 'home', '.aiwg', 'projects');
  });

  afterEach(async () => {
    if (originalHome === undefined) delete process.env.AIWG_PROJECT_MEMORY_HOME;
    else process.env.AIWG_PROJECT_MEMORY_HOME = originalHome;
    const { resetStorage } = await import('../../../src/storage/index.js');
    resetStorage();
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('registers a project with private .aiwg layout and indexed metadata', async () => {
    const {
      projectMemoryIndexPath,
      projectMemoryManifestPath,
      registerProjectMemory,
    } = await import('../../../src/memory/project-registry.js');

    const entry = await registerProjectMemory({
      id: 'demo',
      name: 'demo',
      workspaceRoot: workspace,
      gitRemotes: ['git@git.integrolabs.net:roctinam/demo.git'],
    });

    expect(entry.memoryRoot).toBe(path.join(process.env.AIWG_PROJECT_MEMORY_HOME!, 'demo', '.aiwg'));
    await expect(fs.stat(path.join(entry.memoryRoot, 'aiwg.config'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(entry.memoryRoot, 'memory'))).resolves.toBeTruthy();

    const manifest = JSON.parse(await fs.readFile(projectMemoryManifestPath(), 'utf-8'));
    expect(manifest.projects[0]).toMatchObject({
      id: 'demo',
      name: 'demo',
      workspaceRoots: [workspace],
      metadata: { owner: 'roctinam', repo: 'demo' },
    });

    const index = JSON.parse(await fs.readFile(projectMemoryIndexPath(), 'utf-8'));
    expect(index.byProjectId.demo).toBe('demo');
    expect(index.byWorkspaceRoot[workspace]).toEqual(['demo']);
    expect(index.byGitRemote['git.integrolabs.net/roctinam/demo']).toEqual(['demo']);
  });

  it('looks up project memory by active workspace path and git remote', async () => {
    const { lookupProjectMemory, registerProjectMemory } = await import('../../../src/memory/project-registry.js');
    await registerProjectMemory({
      id: 'demo',
      workspaceRoot: workspace,
      gitRemotes: ['https://git.integrolabs.net/roctinam/demo.git'],
    });

    const byPath = await lookupProjectMemory({ workspaceRoot: path.join(workspace, 'nested') });
    expect(byPath.status).toBe('found');
    if (byPath.status === 'found') expect(byPath.matchedBy).toBe('workspaceRoot');

    const byRemote = await lookupProjectMemory({ gitRemote: 'git@git.integrolabs.net:roctinam/demo.git' });
    expect(byRemote.status).toBe('found');
    if (byRemote.status === 'found') expect(byRemote.matchedBy).toBe('gitRemote');
  });

  it('reports missing and ambiguous mappings', async () => {
    const { lookupProjectMemory, registerProjectMemory } = await import('../../../src/memory/project-registry.js');
    expect((await lookupProjectMemory({ workspaceRoot: workspace })).status).toBe('missing');

    await registerProjectMemory({
      id: 'one',
      workspaceRoot: workspace,
      gitRemotes: ['git@example.test:org/repo.git'],
    });
    await registerProjectMemory({
      id: 'two',
      workspaceRoot: workspace,
      gitRemotes: ['git@example.test:org/repo.git'],
    });

    expect((await lookupProjectMemory({ workspaceRoot: workspace })).status).toBe('ambiguous');
    expect((await lookupProjectMemory({ gitRemote: 'https://example.test/org/repo.git' })).status).toBe('ambiguous');
  });

  it('relocates memory roots and preserves lookup', async () => {
    const { lookupProjectMemory, registerProjectMemory, relocateProjectMemory } = await import('../../../src/memory/project-registry.js');
    const entry = await registerProjectMemory({ id: 'demo', workspaceRoot: workspace });
    await fs.writeFile(path.join(entry.memoryRoot, 'memory', 'note.md'), 'private', 'utf-8');

    const newRoot = path.join(tmp, 'elsewhere', '.aiwg');
    const relocated = await relocateProjectMemory('demo', newRoot);
    expect(relocated.memoryRoot).toBe(newRoot);
    await expect(fs.readFile(path.join(newRoot, 'memory', 'note.md'), 'utf-8')).resolves.toBe('private');

    const lookup = await lookupProjectMemory({ workspaceRoot: workspace });
    expect(lookup.status).toBe('found');
    if (lookup.status === 'found') expect(lookup.entry.memoryRoot).toBe(newRoot);
  });

  it('uses user-level memory for storage only when project-local .aiwg is absent', async () => {
    const { registerProjectMemory, resolveProjectMemoryRoot } = await import('../../../src/memory/project-registry.js');
    const { initStorage, resolveStorage, resetStorage } = await import('../../../src/storage/index.js');
    const entry = await registerProjectMemory({ id: 'demo', workspaceRoot: workspace });

    expect(await resolveProjectMemoryRoot(workspace)).toMatchObject({
      source: 'user',
      root: path.join(entry.memoryRoot, 'memory'),
    });

    await initStorage(workspace);
    const adapter = await resolveStorage('memory');
    await adapter.write('note.md', 'from-user-memory');
    await expect(fs.readFile(path.join(entry.memoryRoot, 'memory', 'note.md'), 'utf-8')).resolves.toBe('from-user-memory');

    resetStorage();
    await fs.mkdir(path.join(workspace, '.aiwg'), { recursive: true });
    expect(await resolveProjectMemoryRoot(workspace)).toMatchObject({
      source: 'project-local',
      root: path.join(workspace, '.aiwg', 'memory'),
    });
  });
});
