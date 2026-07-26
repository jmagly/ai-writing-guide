import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentSkillsAdapter } from '../../../src/skills/adapters/agent-skills.js';
import {
  importedSkillActivationError,
  main as skillsMain,
} from '../../../src/skills/cli.js';
import {
  AgentSkillImportError,
  getImportedAgentSkill,
  importAgentSkill,
  listImportedAgentSkills,
} from '../../../src/skills/importer.js';

const IMPORTED_AT = '2026-07-26T12:00:00.000Z';
const AIWG_VERSION = 'test-version';

let tempRoot: string;
let projectDir: string;
let sourcesDir: string;

function skillFrontmatter(
  name: string,
  extra = '',
  description = 'A portable test skill',
): string {
  return [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    'metadata:',
    '  fixture: "true"',
    ...(extra ? extra.trim().split('\n') : []),
    '---',
    '',
    `# ${name}`,
    '',
    'Fixture body.',
    '',
  ].join('\n');
}

function createSkill(
  name: string,
  options: {
    parent?: string;
    extraFrontmatter?: string;
    description?: string;
  } = {},
): string {
  const root = path.join(options.parent ?? sourcesDir, name);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'SKILL.md'),
    skillFrontmatter(
      name,
      options.extraFrontmatter,
      options.description,
    ),
  );
  return root;
}

function importOptions(overrides: Record<string, unknown> = {}) {
  return {
    projectDir,
    importedAt: IMPORTED_AT,
    aiwgVersion: AIWG_VERSION,
    ...overrides,
  };
}

function expectImportError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  return expect(promise).rejects.toMatchObject<Partial<AgentSkillImportError>>({
    name: 'AgentSkillImportError',
    code,
  });
}

function git(args: string[], cwd: string): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: os.devNull,
      GIT_CONFIG_NOSYSTEM: '1',
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function createGitRepository(
  skillName = 'git-skill',
): { repository: string; skillRoot: string; commit: string } {
  const repository = path.join(tempRoot, 'repository');
  fs.mkdirSync(repository);
  git(['init', '--quiet'], repository);
  git(['config', 'user.name', 'AIWG Test'], repository);
  git(['config', 'user.email', 'test@example.invalid'], repository);
  const skillRoot = createSkill(skillName, {
    parent: path.join(repository, 'skills'),
  });
  fs.mkdirSync(path.join(skillRoot, 'resources'));
  fs.writeFileSync(
    path.join(skillRoot, 'resources', 'fixture.bin'),
    Buffer.from([0, 1, 2, 255]),
  );
  git(['add', '.'], repository);
  git(['commit', '--quiet', '-m', 'fixture'], repository);
  return {
    repository,
    skillRoot,
    commit: git(['rev-parse', 'HEAD'], repository),
  };
}

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-agent-skill-import-'));
  projectDir = path.join(tempRoot, 'project');
  sourcesDir = path.join(tempRoot, 'sources');
  fs.mkdirSync(projectDir);
  fs.mkdirSync(sourcesDir);
});

afterEach(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe('secure local Agent Skills import', () => {
  it('preserves the complete source tree and exact bytes without executing scripts', async () => {
    const source = createSkill('portable-skill');
    fs.mkdirSync(path.join(source, 'resources', 'empty'), { recursive: true });
    fs.writeFileSync(
      path.join(source, 'resources', 'binary.dat'),
      Buffer.from([0, 10, 13, 255, 42]),
    );
    const sentinel = path.join(tempRoot, 'script-executed');
    const script = path.join(source, 'scripts', 'run.sh');
    fs.mkdirSync(path.dirname(script));
    fs.writeFileSync(script, `#!/bin/sh\ntouch "${sentinel}"\n`);
    fs.chmodSync(script, 0o755);

    const result = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );

    expect(result).toMatchObject({
      schemaVersion: 1,
      status: 'imported',
      dryRun: false,
      name: 'portable-skill',
      source: {
        kind: 'directory',
        locator: fs.realpathSync(source),
      },
      validationProfile: 'strict',
      trust: {
        state: 'untrusted',
        activation: 'inactive',
      },
      importedAt: IMPORTED_AT,
      aiwgVersion: AIWG_VERSION,
      fileCount: 3,
    });
    expect(result.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(fs.existsSync(sentinel)).toBe(false);
    expect(fs.readdirSync(path.join(result.managedLocation, 'resources', 'empty')))
      .toEqual([]);

    for (const relativePath of [
      'SKILL.md',
      'resources/binary.dat',
      'scripts/run.sh',
    ]) {
      expect(fs.readFileSync(path.join(result.managedLocation, relativePath)))
        .toEqual(fs.readFileSync(path.join(source, relativePath)));
    }
    expect(fs.statSync(path.join(result.managedLocation, 'scripts', 'run.sh')).mode & 0o111)
      .toBe(0);
  });

  it('supports deterministic dry-run output without creating project state', async () => {
    const source = createSkill('dry-run-skill');
    const result = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({ dryRun: true }),
    );

    expect(result).toMatchObject({
      status: 'planned',
      dryRun: true,
      name: 'dry-run-skill',
      importedAt: IMPORTED_AT,
      aiwgVersion: AIWG_VERSION,
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(fs.existsSync(path.join(projectDir, '.aiwg'))).toBe(false);
  });

  it('is idempotent for identical content and preserves the first record', async () => {
    const source = createSkill('stable-skill');
    const first = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );
    const manifestPath = path.join(
      projectDir,
      '.aiwg',
      'skills',
      'imported',
      'stable-skill',
      'manifest.json',
    );
    const firstManifest = fs.readFileSync(manifestPath);
    const firstMtime = fs.statSync(manifestPath).mtimeMs;

    const second = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({ importedAt: '2026-07-26T13:00:00.000Z' }),
    );

    expect(second.status).toBe('unchanged');
    expect(second.importedAt).toBe(first.importedAt);
    expect(fs.readFileSync(manifestPath)).toEqual(firstManifest);
    expect(fs.statSync(manifestPath).mtimeMs).toBe(firstMtime);
  });

  it('invalidates trust on managed byte drift and requires force to restore it', async () => {
    const source = createSkill('managed-drift');
    const first = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({ trust: true, activate: true }),
    );
    fs.appendFileSync(path.join(first.managedLocation, 'SKILL.md'), '\nTampered.\n');

    expect(getImportedAgentSkill(projectDir, 'managed-drift')).toMatchObject({
      trust: {
        state: 'untrusted',
        activation: 'inactive',
      },
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'AS_IMPORT_MANAGED_DRIFT' }),
      ]),
    });
    expect((await new AgentSkillsAdapter(projectDir).info('managed-drift'))?.content)
      .toBeUndefined();
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: source },
        importOptions(),
      ),
      'AS_IMPORT_MANAGED_DRIFT',
    );

    const restored = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({ force: true }),
    );
    expect(restored.status).toBe('updated');
    expect(restored.digest).toBe(first.digest);
    expect(restored.trust).toEqual({
      state: 'trusted',
      activation: 'active',
    });
    expect(fs.readFileSync(path.join(restored.managedLocation, 'SKILL.md')))
      .toEqual(fs.readFileSync(path.join(source, 'SKILL.md')));
  });

  it('requires update for same-source drift and force for source replacement', async () => {
    const source = createSkill('drift-skill');
    const initial = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );
    fs.appendFileSync(path.join(source, 'SKILL.md'), '\nChanged.\n');

    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: source },
        importOptions(),
      ),
      'AS_IMPORT_COLLISION',
    );
    expect(getImportedAgentSkill(projectDir, 'drift-skill')?.digest)
      .toBe(initial.digest);

    const updated = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({
        update: true,
        importedAt: '2026-07-26T13:00:00.000Z',
      }),
    );
    expect(updated.status).toBe('updated');
    expect(updated.digest).not.toBe(initial.digest);

    const replacementParent = path.join(tempRoot, 'replacement');
    const replacement = createSkill('drift-skill', { parent: replacementParent });
    fs.appendFileSync(path.join(replacement, 'SKILL.md'), '\nReplacement.\n');
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: replacement },
        importOptions({ update: true }),
      ),
      'AS_IMPORT_COLLISION',
    );

    const forced = await importAgentSkill(
      { kind: 'directory', path: replacement },
      importOptions({
        force: true,
        importedAt: '2026-07-26T14:00:00.000Z',
      }),
    );
    expect(forced.status).toBe('updated');
    expect(forced.source.locator).toBe(fs.realpathSync(replacement));
  });

  it('rolls back the prior managed version when atomic promotion fails', async () => {
    const source = createSkill('rollback-skill');
    const initial = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );
    const initialBytes = fs.readFileSync(
      path.join(initial.managedLocation, 'SKILL.md'),
    );
    fs.appendFileSync(path.join(source, 'SKILL.md'), '\nChanged.\n');

    const originalRename = fs.renameSync.bind(fs);
    let renameCalls = 0;
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation((
      oldPath: fs.PathLike,
      newPath: fs.PathLike,
    ) => {
      renameCalls += 1;
      if (renameCalls === 2) throw new Error('simulated promotion failure');
      originalRename(oldPath, newPath);
    });
    try {
      await expect(importAgentSkill(
        { kind: 'directory', path: source },
        importOptions({
          update: true,
          importedAt: '2026-07-26T13:00:00.000Z',
        }),
      )).rejects.toThrow('simulated promotion failure');
    } finally {
      renameSpy.mockRestore();
    }

    const restored = getImportedAgentSkill(projectDir, 'rollback-skill');
    expect(restored?.digest).toBe(initial.digest);
    expect(fs.readFileSync(path.join(restored!.managedLocation, 'SKILL.md')))
      .toEqual(initialBytes);
    const importedStore = path.join(projectDir, '.aiwg', 'skills', 'imported');
    expect(
      fs.readdirSync(importedStore)
      .filter((entry) => entry.startsWith('.rollback-skill.')),
    ).toEqual([]);
  });

  it('serializes writes and recovers an interrupted promotion before inspection', async () => {
    const source = createSkill('recovery-skill');
    const initial = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );
    const importedStore = path.join(projectDir, '.aiwg', 'skills', 'imported');
    const finalRoot = path.join(importedStore, 'recovery-skill');
    const lockPath = path.join(importedStore, '.recovery-skill.lock');

    fs.writeFileSync(lockPath, JSON.stringify({
      pid: process.pid,
      createdAt: new Date().toISOString(),
    }));
    fs.appendFileSync(path.join(source, 'SKILL.md'), '\nChanged.\n');
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: source },
        importOptions({ update: true }),
      ),
      'AS_IMPORT_BUSY',
    );
    expect(getImportedAgentSkill(projectDir, 'recovery-skill')?.digest)
      .toBe(initial.digest);

    fs.rmSync(lockPath);
    const backupRoot = path.join(importedStore, '.recovery-skill.backup-crash');
    const stagingRoot = path.join(importedStore, '.recovery-skill.staging-crash');
    fs.renameSync(finalRoot, backupRoot);
    fs.mkdirSync(stagingRoot);
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: 1_073_741_824,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));

    const recovered = getImportedAgentSkill(projectDir, 'recovery-skill');
    expect(recovered?.digest).toBe(initial.digest);
    expect(fs.existsSync(finalRoot)).toBe(true);
    expect(fs.existsSync(backupRoot)).toBe(false);
    expect(fs.existsSync(stagingRoot)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('requires explicit trust for activation and invalidates trust on digest drift', async () => {
    const source = createSkill('trusted-skill');
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: source },
        importOptions({ activate: true }),
      ),
      'AS_IMPORT_TRUST_REQUIRED',
    );
    expect(listImportedAgentSkills(projectDir)).toEqual([]);

    const trusted = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({ trust: true, activate: true }),
    );
    expect(trusted.trust).toEqual({
      state: 'trusted',
      activation: 'active',
    });

    fs.appendFileSync(path.join(source, 'SKILL.md'), '\nDigest drift.\n');
    const updated = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({
        update: true,
        importedAt: '2026-07-26T13:00:00.000Z',
      }),
    );
    expect(updated.trust).toEqual({
      state: 'untrusted',
      activation: 'inactive',
    });
  });

  it('rejects validation failures and higher-precedence collisions without partial state', async () => {
    const invalid = createSkill('invalid-skill', {
      extraFrontmatter: 'unexpected: true',
    });
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: invalid },
        importOptions(),
      ),
      'AS_IMPORT_VALIDATION',
    );

    const colliding = createSkill('collision-skill');
    const projectSkill = path.join(
      projectDir,
      '.agents',
      'skills',
      'collision-skill',
    );
    fs.mkdirSync(projectSkill, { recursive: true });
    fs.writeFileSync(
      path.join(projectSkill, 'SKILL.md'),
      skillFrontmatter('collision-skill'),
    );
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: colliding },
        importOptions(),
      ),
      'AS_IMPORT_COLLISION',
    );

    expect(listImportedAgentSkills(projectDir)).toEqual([]);
    const importedStore = path.join(projectDir, '.aiwg', 'skills', 'imported');
    if (fs.existsSync(importedStore)) {
      expect(
        fs.readdirSync(importedStore)
          .filter((entry) => !entry.startsWith('.')),
      ).toEqual([]);
    }
  });

  it('accepts mapped AIWG fields only under the compatible profile', async () => {
    const source = createSkill('compatible-skill', {
      extraFrontmatter: [
        'namespace: aiwg',
        'platforms: [all]',
      ].join('\n'),
    });
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: source },
        importOptions(),
      ),
      'AS_IMPORT_VALIDATION',
    );

    const result = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions({ profile: 'compatible' }),
    );
    expect(result.status).toBe('imported');
    expect(result.validationProfile).toBe('compatible');
  });
});

describe('import security boundaries', () => {
  it('rejects symlinks, special files, oversized files, and recursive sources', async () => {
    const symlinkSkill = createSkill('symlink-skill');
    fs.symlinkSync(
      path.join(symlinkSkill, 'SKILL.md'),
      path.join(symlinkSkill, 'linked.md'),
    );
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: symlinkSkill },
        importOptions(),
      ),
      'AS_IMPORT_SYMLINK',
    );

    const socketSkill = createSkill('socket-skill');
    const socketPath = path.join(socketSkill, 'fixture.sock');
    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });
    try {
      await expectImportError(
        importAgentSkill(
          { kind: 'directory', path: socketSkill },
          importOptions(),
        ),
        'AS_IMPORT_SPECIAL_FILE',
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    const largeSkill = createSkill('large-skill');
    fs.writeFileSync(path.join(largeSkill, 'large.bin'), Buffer.alloc(64));
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: largeSkill },
        importOptions({ limits: { maxFileBytes: 32 } }),
      ),
      'AS_IMPORT_FILE_SIZE',
    );

    const recursiveRoot = path.join(tempRoot, 'recursive-skill');
    fs.mkdirSync(recursiveRoot);
    fs.writeFileSync(
      path.join(recursiveRoot, 'SKILL.md'),
      skillFrontmatter('recursive-skill'),
    );
    await expectImportError(
      importAgentSkill(
        { kind: 'directory', path: '.' },
        {
          ...importOptions(),
          projectDir: recursiveRoot,
        },
      ),
      'AS_IMPORT_RECURSIVE_SOURCE',
    );
  });

  it('rejects unsafe Git arguments and subpaths before writing state', async () => {
    for (const subpath of ['../skill', '/absolute/skill', '.', 'a//b']) {
      await expectImportError(
        importAgentSkill(
          {
            kind: 'git',
            url: path.join(tempRoot, 'unused.git'),
            revision: 'deadbeef',
            subpath,
          },
          importOptions(),
        ),
        'AS_IMPORT_GIT_SUBPATH',
      );
    }
    await expectImportError(
      importAgentSkill(
        {
          kind: 'git',
          url: 'https://user:secret@example.invalid/repo.git',
          revision: 'deadbeef',
          subpath: 'skills/example',
        },
        importOptions(),
      ),
      'AS_IMPORT_GIT_CREDENTIALS',
    );
    await expectImportError(
      importAgentSkill(
        {
          kind: 'git',
          url: 'ext::sh -c touch /tmp/aiwg-import-should-not-run',
          revision: 'deadbeef',
          subpath: 'skills/example',
        },
        importOptions(),
      ),
      'AS_IMPORT_GIT_PROTOCOL',
    );
    await expectImportError(
      importAgentSkill(
        {
          kind: 'git',
          url: path.join(tempRoot, 'unused.git'),
          revision: 'main:refs/heads/injected',
          subpath: 'skills/example',
        },
        importOptions(),
      ),
      'AS_IMPORT_GIT_REVISION',
    );
    expect(fs.existsSync(path.join(projectDir, '.aiwg'))).toBe(false);
  });
});

describe('pinned Git Agent Skills import', () => {
  it('imports exact blobs and records the requested and resolved revisions', async () => {
    const fixture = createGitRepository();
    const result = await importAgentSkill(
      {
        kind: 'git',
        url: fixture.repository,
        revision: fixture.commit,
        subpath: 'skills/git-skill',
      },
      importOptions(),
    );

    expect(result).toMatchObject({
      status: 'imported',
      name: 'git-skill',
      source: {
        kind: 'git',
        locator: fixture.repository,
        subpath: 'skills/git-skill',
        requestedRevision: fixture.commit,
        resolvedRevision: fixture.commit,
      },
    });
    for (const relativePath of ['SKILL.md', 'resources/fixture.bin']) {
      expect(fs.readFileSync(path.join(result.managedLocation, relativePath)))
        .toEqual(fs.readFileSync(path.join(fixture.skillRoot, relativePath)));
    }
  });

  it('detects resolved revision and digest drift and updates atomically', async () => {
    const fixture = createGitRepository('git-update');
    const first = await importAgentSkill(
      {
        kind: 'git',
        url: fixture.repository,
        revision: fixture.commit,
        subpath: 'skills/git-update',
      },
      importOptions({ trust: true, activate: true }),
    );

    fs.appendFileSync(path.join(fixture.skillRoot, 'SKILL.md'), '\nUpdated.\n');
    git(['add', '.'], fixture.repository);
    git(['commit', '--quiet', '-m', 'update'], fixture.repository);
    const nextCommit = git(['rev-parse', 'HEAD'], fixture.repository);
    const source = {
      kind: 'git' as const,
      url: fixture.repository,
      revision: nextCommit,
      subpath: 'skills/git-update',
    };

    await expectImportError(
      importAgentSkill(source, importOptions()),
      'AS_IMPORT_COLLISION',
    );
    expect(getImportedAgentSkill(projectDir, 'git-update')?.digest)
      .toBe(first.digest);

    const updated = await importAgentSkill(
      source,
      importOptions({
        update: true,
        importedAt: '2026-07-26T13:00:00.000Z',
      }),
    );
    expect(updated.status).toBe('updated');
    expect(updated.source.resolvedRevision).toBe(nextCommit);
    expect(updated.digest).not.toBe(first.digest);
    expect(updated.trust).toEqual({
      state: 'untrusted',
      activation: 'inactive',
    });
  });

  it('rejects Git symlinks without executing or partially storing content', async () => {
    const fixture = createGitRepository('git-symlink');
    fs.symlinkSync(
      path.join(fixture.skillRoot, 'SKILL.md'),
      path.join(fixture.skillRoot, 'linked.md'),
    );
    git(['add', '.'], fixture.repository);
    git(['commit', '--quiet', '-m', 'symlink'], fixture.repository);
    const commit = git(['rev-parse', 'HEAD'], fixture.repository);

    await expectImportError(
      importAgentSkill(
        {
          kind: 'git',
          url: fixture.repository,
          revision: commit,
          subpath: 'skills/git-symlink',
        },
        importOptions(),
      ),
      'AS_IMPORT_SYMLINK',
    );
    expect(listImportedAgentSkills(projectDir)).toEqual([]);
  });
});

describe('managed Agent Skills registry adapter', () => {
  it('lists and inspects imports without changing existing adapter contracts', async () => {
    const source = createSkill('adapter-skill');
    const imported = await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );
    const adapter = new AgentSkillsAdapter(projectDir);

    expect(await adapter.isAvailable()).toBe(true);
    expect(await adapter.list()).toEqual([
      {
        name: 'adapter-skill',
        description: 'A portable test skill',
        source: 'agentskills',
        installed: true,
      },
    ]);
    expect(await adapter.search('portable')).toHaveLength(1);
    expect(await adapter.info('adapter-skill')).toMatchObject({
      name: 'adapter-skill',
      source: 'agentskills',
      path: path.join(imported.managedLocation, 'SKILL.md'),
      imported: {
        digest: imported.digest,
        trust: {
          state: 'untrusted',
          activation: 'inactive',
        },
      },
    });
    expect(await adapter.info('../adapter-skill')).toBeUndefined();
  });

  it('emits provenance, trust, diagnostics, and location in human and JSON dry runs', async () => {
    const source = createSkill('output-skill');
    const jsonLines: string[] = [];
    const jsonSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      jsonLines.push(args.join(' '));
    });
    await skillsMain(['import', source, '--dry-run', '--json']);
    jsonSpy.mockRestore();

    const json = JSON.parse(jsonLines.join('\n'));
    expect(json).toMatchObject({
      schemaVersion: 1,
      status: 'planned',
      dryRun: true,
      name: 'output-skill',
      source: {
        kind: 'directory',
        locator: fs.realpathSync(source),
      },
      trust: {
        state: 'untrusted',
        activation: 'inactive',
      },
      diagnostics: [],
      managedLocation: expect.stringContaining(
        `${path.sep}.aiwg${path.sep}skills${path.sep}imported${path.sep}output-skill${path.sep}source`,
      ),
    });

    const humanLines: string[] = [];
    const humanSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      humanLines.push(args.join(' '));
    });
    await skillsMain(['import', source, '--dry-run']);
    humanSpy.mockRestore();
    const human = humanLines.join('\n');
    expect(human).toContain('Agent Skill import: planned');
    expect(human).toContain(`Locator:      ${fs.realpathSync(source)}`);
    expect(human).toContain('Trust:        untrusted');
    expect(human).toContain('Activation:   inactive');
    expect(human).toContain('Managed:');
  });

  it('blocks execution of an imported skill until its exact digest is trusted and active', async () => {
    const source = createSkill('inactive-skill');
    await importAgentSkill(
      { kind: 'directory', path: source },
      importOptions(),
    );
    const adapter = new AgentSkillsAdapter(projectDir);
    const details = await adapter.info('inactive-skill');

    expect(importedSkillActivationError(details!)).toContain(
      "Imported skill 'inactive-skill' is untrusted/inactive",
    );
    expect(importedSkillActivationError({
      ...details!,
      imported: {
        ...details!.imported!,
        trust: {
          state: 'trusted',
          activation: 'active',
        },
      },
    })).toBeUndefined();
  });
});
