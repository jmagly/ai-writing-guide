/**
 * OpsRegistry Tests
 *
 * @source @src/ops/registry.ts
 * @implements #544
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { OpsRegistry } from '../../../src/ops/registry.js';

describe('OpsRegistry', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'aiwg-ops-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should return default registry when file does not exist', async () => {
      const registry = new OpsRegistry(tempDir);
      const data = await registry.load();
      expect(data.apiVersion).toBe('aiwg.io/v1');
      expect(data.kind).toBe('OpsRegistry');
      expect(data.defaultWorkspace).toBe('default');
      expect(Object.keys(data.workspaces)).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('should write ops.yaml to config directory', async () => {
      const registry = new OpsRegistry(tempDir);
      const data = await registry.load();
      await registry.save(data);

      const filePath = join(tempDir, 'ops.json');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('initWorkspace', () => {
    it('should create a multi-repo workspace with default extensions', async () => {
      const opsHome = join(tempDir, 'ops-home');
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'test-ws',
        home: opsHome,
        mode: 'multi-repo',
        extensions: ['sys', 'dev'],
        silent: true,
      });

      // Verify repos were created
      expect(existsSync(join(opsHome, 'sysops'))).toBe(true);
      expect(existsSync(join(opsHome, 'devops'))).toBe(true);

      // Verify git init
      expect(existsSync(join(opsHome, 'sysops', '.git'))).toBe(true);
      expect(existsSync(join(opsHome, 'devops', '.git'))).toBe(true);

      // Verify OpsInventory stubs
      expect(existsSync(join(opsHome, 'sysops', 'OpsInventory.yaml'))).toBe(true);
      expect(existsSync(join(opsHome, 'devops', 'OpsInventory.yaml'))).toBe(true);

      // Verify registry entry
      const data = await registry.load();
      expect(data.workspaces['test-ws']).toBeDefined();
      expect(data.workspaces['test-ws'].mode).toBe('multi-repo');
      expect(Object.keys(data.workspaces['test-ws'].repos)).toHaveLength(2);
    });

    it('should create a single-repo workspace', async () => {
      const opsHome = join(tempDir, 'ops-single');
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'single-ws',
        home: opsHome,
        mode: 'single-repo',
        extensions: ['sys', 'it', 'dev'],
        silent: true,
      });

      // Single repo should exist
      expect(existsSync(join(opsHome, 'ops'))).toBe(true);
      expect(existsSync(join(opsHome, 'ops', '.git'))).toBe(true);

      // Subdirectories should exist
      expect(existsSync(join(opsHome, 'ops', 'sysops'))).toBe(true);
      expect(existsSync(join(opsHome, 'ops', 'itops'))).toBe(true);
      expect(existsSync(join(opsHome, 'ops', 'devops'))).toBe(true);

      const data = await registry.load();
      expect(data.workspaces['single-ws'].mode).toBe('single-repo');
      expect(Object.keys(data.workspaces['single-ws'].repos)).toHaveLength(1);
    });

    it('should apply prefix to repo names', async () => {
      const opsHome = join(tempDir, 'ops-prefix');
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'prefixed',
        home: opsHome,
        mode: 'multi-repo',
        extensions: ['sys'],
        prefix: 'myorg',
        silent: true,
      });

      expect(existsSync(join(opsHome, 'myorg-sysops'))).toBe(true);
    });

    it('should reject duplicate workspace names', async () => {
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'dup-ws',
        home: join(tempDir, 'ops-dup1'),
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });

      await expect(
        registry.initWorkspace({
          name: 'dup-ws',
          home: join(tempDir, 'ops-dup2'),
          mode: 'multi-repo',
          extensions: ['sys'],
          silent: true,
        })
      ).rejects.toThrow(/already exists/);
    });

    it('should refuse to nest inside an existing ops workspace (OpsInventory.yaml marker)', async () => {
      const outer = join(tempDir, 'sysops');
      await mkdir(outer, { recursive: true });
      await writeFile(join(outer, 'OpsInventory.yaml'), 'apiVersion: aiwg.io/v1\n', 'utf-8');

      const registry = new OpsRegistry(tempDir);

      await expect(
        registry.initWorkspace({
          name: 'itops',
          home: join(outer, 'itops'),
          mode: 'multi-repo',
          extensions: ['it'],
          silent: true,
        })
      ).rejects.toThrow(/already an ops workspace/);
    });

    it('should refuse to nest more than one level deep under an ops workspace', async () => {
      const outer = join(tempDir, 'sysops');
      await mkdir(outer, { recursive: true });
      await writeFile(join(outer, 'OpsInventory.yaml'), 'apiVersion: aiwg.io/v1\n', 'utf-8');

      const registry = new OpsRegistry(tempDir);

      await expect(
        registry.initWorkspace({
          name: 'itops',
          home: join(outer, 'nested', 'itops'),
          mode: 'multi-repo',
          extensions: ['it'],
          silent: true,
        })
      ).rejects.toThrow(/Suggested location/);
    });

    it('should set first workspace as default', async () => {
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'first-ws',
        home: join(tempDir, 'ops-first'),
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });

      const data = await registry.load();
      expect(data.defaultWorkspace).toBe('first-ws');
    });
  });

  describe('switchWorkspace', () => {
    it('should switch the default workspace', async () => {
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'ws-a',
        home: join(tempDir, 'ops-a'),
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });

      await registry.initWorkspace({
        name: 'ws-b',
        home: join(tempDir, 'ops-b'),
        mode: 'multi-repo',
        extensions: ['dev'],
        silent: true,
      });

      await registry.switchWorkspace('ws-b');
      const data = await registry.load();
      expect(data.defaultWorkspace).toBe('ws-b');
    });

    it('should reject nonexistent workspace', async () => {
      const registry = new OpsRegistry(tempDir);
      await expect(registry.switchWorkspace('nonexistent')).rejects.toThrow(/not found/);
    });
  });

  describe('initWorkspace --from / adopt-existing', () => {
    it('should adopt an existing .git repo at the target path without re-initing', async () => {
      const opsHome = join(tempDir, 'home');
      const repoPath = join(opsHome, 'sysops');
      // Pre-create a fake existing git repo
      await mkdir(join(repoPath, '.git'), { recursive: true });
      await writeFile(join(repoPath, '.git', 'config'), '[core]\n\trepositoryformatversion = 0\n');

      const registry = new OpsRegistry(tempDir);
      await registry.initWorkspace({
        name: 'pre-existing',
        home: opsHome,
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });

      // .git was preserved (we wrote a marker config file; assert it still exists)
      const cfg = await readFile(join(repoPath, '.git', 'config'), 'utf-8');
      expect(cfg).toContain('repositoryformatversion');

      // OpsInventory.yaml seeded
      expect(existsSync(join(repoPath, 'OpsInventory.yaml'))).toBe(true);
    });

    it('should reject --from with multi-repo + multiple extensions', async () => {
      const registry = new OpsRegistry(tempDir);
      await expect(
        registry.initWorkspace({
          name: 'bad-from',
          home: join(tempDir, 'bad-from-home'),
          mode: 'multi-repo',
          extensions: ['sys', 'dev'],
          from: 'https://example.com/repo.git',
          silent: true,
        })
      ).rejects.toThrow(/single-repo mode or exactly one extension/);
    });

    it('should preserve an existing OpsInventory.yaml when adopting', async () => {
      const opsHome = join(tempDir, 'home2');
      const repoPath = join(opsHome, 'sysops');
      await mkdir(join(repoPath, '.git'), { recursive: true });
      await writeFile(
        join(repoPath, 'OpsInventory.yaml'),
        '# user-customized\napiVersion: aiwg.io/v1\nkind: OpsInventory\n',
        'utf-8'
      );

      const registry = new OpsRegistry(tempDir);
      await registry.initWorkspace({
        name: 'preserve',
        home: opsHome,
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });

      const content = await readFile(join(repoPath, 'OpsInventory.yaml'), 'utf-8');
      expect(content).toContain('# user-customized');
    });
  });

  describe('adoptRepo', () => {
    it('should register an existing local clone with detected remote', async () => {
      const repoPath = join(tempDir, 'sysops');
      await mkdir(repoPath, { recursive: true });
      // Real git init so `git config` works
      const { execSync } = await import('child_process');
      execSync('git init', { cwd: repoPath, stdio: 'pipe' });
      execSync('git remote add origin https://example.com/owner/sysops.git', {
        cwd: repoPath,
        stdio: 'pipe',
      });

      const registry = new OpsRegistry(tempDir);
      const result = await registry.adoptRepo(repoPath, {
        workspace: 'home',
        extensions: ['sys'],
        silent: true,
      });

      expect(result.workspace).toBe('home');
      expect(result.repoName).toBe('sysops');

      const data = await registry.load();
      const repo = data.workspaces['home'].repos['sysops'];
      expect(repo.path).toBe(repoPath);
      expect(repo.remote).toBe('https://example.com/owner/sysops.git');

      // OpsInventory.yaml was seeded since it didn't exist
      expect(existsSync(join(repoPath, 'OpsInventory.yaml'))).toBe(true);
    });

    it('should not overwrite an existing OpsInventory.yaml on adopt', async () => {
      const repoPath = join(tempDir, 'devops');
      await mkdir(repoPath, { recursive: true });
      await writeFile(
        join(repoPath, 'OpsInventory.yaml'),
        '# preserved\napiVersion: aiwg.io/v1\n',
        'utf-8'
      );

      const registry = new OpsRegistry(tempDir);
      await registry.adoptRepo(repoPath, { workspace: 'home', silent: true });

      const content = await readFile(join(repoPath, 'OpsInventory.yaml'), 'utf-8');
      expect(content).toContain('# preserved');
    });

    it('should refuse to adopt a path nested inside an already-registered repo', async () => {
      const outer = join(tempDir, 'sysops');
      const inner = join(outer, 'sub', 'devops');
      await mkdir(inner, { recursive: true });

      const registry = new OpsRegistry(tempDir);
      await registry.adoptRepo(outer, { workspace: 'home', silent: true });
      await expect(
        registry.adoptRepo(inner, { workspace: 'home', silent: true })
      ).rejects.toThrow(/nested inside registered repo/);
    });

    it('should be idempotent when adopting the same path twice', async () => {
      const repoPath = join(tempDir, 'itops');
      await mkdir(repoPath, { recursive: true });

      const registry = new OpsRegistry(tempDir);
      const a = await registry.adoptRepo(repoPath, { workspace: 'home', silent: true });
      const b = await registry.adoptRepo(repoPath, { workspace: 'home', silent: true });
      expect(a.repoName).toBe(b.repoName);

      const data = await registry.load();
      // Only one entry should exist
      expect(Object.keys(data.workspaces['home'].repos)).toEqual(['itops']);
    });
  });

  describe('discoverWorkspaces', () => {
    it('should find candidates by OpsInventory.yaml marker', async () => {
      const root = join(tempDir, 'home');
      const a = join(root, 'sysops');
      const b = join(root, 'devops');
      await mkdir(a, { recursive: true });
      await mkdir(b, { recursive: true });
      await writeFile(join(a, 'OpsInventory.yaml'), 'apiVersion: aiwg.io/v1\n', 'utf-8');
      await writeFile(join(b, 'OpsInventory.yaml'), 'apiVersion: aiwg.io/v1\n', 'utf-8');

      const registry = new OpsRegistry(tempDir);
      const found = await registry.discoverWorkspaces({ roots: [root] });

      const paths = found.map((c) => c.path).sort();
      expect(paths).toEqual([b, a].sort());
      expect(found.every((c) => c.alreadyRegistered === false)).toBe(true);
      expect(found.every((c) => c.marker === 'OpsInventory.yaml')).toBe(true);
    });

    it('should skip nested candidates (siblings only)', async () => {
      const root = join(tempDir, 'home');
      const outer = join(root, 'sysops');
      const inner = join(outer, 'devops');
      await mkdir(inner, { recursive: true });
      await writeFile(join(outer, 'OpsInventory.yaml'), '', 'utf-8');
      await writeFile(join(inner, 'OpsInventory.yaml'), '', 'utf-8');

      const registry = new OpsRegistry(tempDir);
      const found = await registry.discoverWorkspaces({ roots: [root] });

      // The walker stops descending past a hit, so inner is never even visited.
      expect(found.map((c) => c.path)).toEqual([outer]);
    });

    it('should mark already-registered candidates', async () => {
      const root = join(tempDir, 'home');
      const a = join(root, 'sysops');
      await mkdir(a, { recursive: true });
      await writeFile(join(a, 'OpsInventory.yaml'), '', 'utf-8');

      const registry = new OpsRegistry(tempDir);
      // Pre-register via initWorkspace using an explicit home pointing at an
      // unrelated subdir (so the init nesting check doesn't trip), then
      // patch the entry's path to match the discovery target.
      await registry.initWorkspace({
        name: 'pre',
        home: join(tempDir, 'pre-home'),
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });
      // Mutate the registry directly to simulate an already-registered repo.
      const data = await registry.load();
      data.workspaces['pre'].repos['sysops'] = {
        path: a,
        extensions: ['sys'],
      };
      await registry.save(data);

      const found = await registry.discoverWorkspaces({ roots: [root] });
      const hit = found.find((c) => c.path === a);
      expect(hit?.alreadyRegistered).toBe(true);
    });

    it('should respect --max-depth', async () => {
      const root = join(tempDir, 'home');
      const deep = join(root, 'l1', 'l2', 'l3', 'l4', 'sysops');
      await mkdir(deep, { recursive: true });
      await writeFile(join(deep, 'OpsInventory.yaml'), '', 'utf-8');

      const registry = new OpsRegistry(tempDir);
      const shallow = await registry.discoverWorkspaces({ roots: [root], maxDepth: 2 });
      const full = await registry.discoverWorkspaces({ roots: [root], maxDepth: 6 });
      expect(shallow).toHaveLength(0);
      expect(full).toHaveLength(1);
    });

    it('should skip node_modules and other noise dirs', async () => {
      const root = join(tempDir, 'home');
      const noise = join(root, 'node_modules', 'pkg', 'fixture');
      await mkdir(noise, { recursive: true });
      await writeFile(join(noise, 'OpsInventory.yaml'), '', 'utf-8');

      const registry = new OpsRegistry(tempDir);
      const found = await registry.discoverWorkspaces({ roots: [root], maxDepth: 6 });
      expect(found).toHaveLength(0);
    });
  });

  describe('registerDiscovered', () => {
    it('should add new candidates and skip already-registered ones', async () => {
      const root = join(tempDir, 'home');
      const a = join(root, 'sysops');
      await mkdir(a, { recursive: true });
      await writeFile(join(a, 'OpsInventory.yaml'), '', 'utf-8');

      const registry = new OpsRegistry(tempDir);
      const candidates = await registry.discoverWorkspaces({ roots: [root] });
      const result = await registry.registerDiscovered('home', candidates);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(0);

      const data = await registry.load();
      expect(data.workspaces['home']).toBeDefined();
      expect(data.workspaces['home'].repos['sysops'].path).toBe(a);
    });
  });

  describe('OpsInventory stub', () => {
    it('should contain valid YAML structure', async () => {
      const opsHome = join(tempDir, 'ops-inv');
      const registry = new OpsRegistry(tempDir);

      await registry.initWorkspace({
        name: 'inv-ws',
        home: opsHome,
        mode: 'multi-repo',
        extensions: ['sys'],
        silent: true,
      });

      const content = await readFile(join(opsHome, 'sysops', 'OpsInventory.yaml'), 'utf-8');
      expect(content).toContain('apiVersion: aiwg.io/v1');
      expect(content).toContain('kind: OpsInventory');
      expect(content).toContain('domain: sysops');
    });
  });
});
