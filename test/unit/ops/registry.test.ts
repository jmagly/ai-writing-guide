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
