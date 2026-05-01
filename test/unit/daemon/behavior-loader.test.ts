import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const loadModule = async () => {
  const mod = await import('../../../tools/daemon/behavior-loader.mjs');
  return mod;
};

describe('DaemonBehaviorLoader (#642)', () => {
  let tmpDir: string;
  let DaemonBehaviorLoader: any;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bl-test-'));
    const mod = await loadModule();
    DaemonBehaviorLoader = mod.DaemonBehaviorLoader;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('discover', () => {
    it('should return empty array when no behaviors exist', async () => {
      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const discovered = await loader.discover();
      expect(discovered).toEqual([]);
    });

    it('should discover .behavior.md files from addon dirs', async () => {
      const behaviorDir = join(tmpDir, 'agentic', 'code', 'addons', 'test-addon', 'behaviors');
      mkdirSync(behaviorDir, { recursive: true });
      writeFileSync(join(behaviorDir, 'test.behavior.md'), '---\nname: test\n---\n# Test');

      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const discovered = await loader.discover();
      expect(discovered).toHaveLength(1);
      expect(discovered[0].tier).toBe('addon');
      expect(discovered[0].addon).toBe('test-addon');
      expect(discovered[0].file).toBe('test.behavior.md');
    });

    it('should discover from project-local .aiwg/behaviors/', async () => {
      const behaviorDir = join(tmpDir, '.aiwg', 'behaviors');
      mkdirSync(behaviorDir, { recursive: true });
      writeFileSync(join(behaviorDir, 'custom.behavior.md'), '---\nname: custom\n---\n# Custom');

      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const discovered = await loader.discover();
      expect(discovered).toHaveLength(1);
      expect(discovered[0].tier).toBe('project');
    });

    it('should ignore non-.behavior.md files', async () => {
      const behaviorDir = join(tmpDir, 'agentic', 'code', 'addons', 'test', 'behaviors');
      mkdirSync(behaviorDir, { recursive: true });
      writeFileSync(join(behaviorDir, 'test.behavior.md'), '---\nname: test\n---');
      writeFileSync(join(behaviorDir, 'README.md'), '# readme');
      writeFileSync(join(behaviorDir, 'notes.yaml'), 'foo: bar');

      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const discovered = await loader.discover();
      expect(discovered).toHaveLength(1);
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse YAML frontmatter from .behavior.md (canonical metadata shape)', async () => {
      const file = join(tmpDir, 'test.behavior.md');
      writeFileSync(file, [
        '---',
        'name: concierge',
        'type: behavior',
        'module: tools/daemon/concierge/orchestrator.mjs',
        'metadata:',
        '  scope: daemon',
        '  triggers:',
        '    - session-start',
        '    - chat-message',
        '    - on-error',
        '---',
        '# Concierge',
      ].join('\n'));

      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const meta = await loader.parseFrontmatter(file);
      expect(meta).not.toBeNull();
      expect(meta.name).toBe('concierge');
      expect(meta.module).toBe('tools/daemon/concierge/orchestrator.mjs');
      expect(meta.metadata.scope).toBe('daemon');
      expect(meta.metadata.triggers).toEqual(['session-start', 'chat-message', 'on-error']);
    });

    it('should return null for files without frontmatter', async () => {
      const file = join(tmpDir, 'nofront.behavior.md');
      writeFileSync(file, '# Just a heading\n\nSome content');

      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const meta = await loader.parseFrontmatter(file);
      expect(meta).toBeNull();
    });

    it('should parse inline arrays', async () => {
      const file = join(tmpDir, 'inline.behavior.md');
      writeFileSync(file, '---\nname: test\nproviders: [claude-code, cursor, warp]\n---\n');

      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const meta = await loader.parseFrontmatter(file);
      expect(meta.providers).toEqual(['claude-code', 'cursor', 'warp']);
    });
  });

  describe('loadAll', () => {
    it('should skip behaviors without metadata.scope: daemon', async () => {
      const behaviorDir = join(tmpDir, 'agentic', 'code', 'addons', 'test', 'behaviors');
      mkdirSync(behaviorDir, { recursive: true });
      writeFileSync(
        join(behaviorDir, 'agent.behavior.md'),
        '---\nname: agent\nmetadata:\n  scope: agent\n---\n'
      );

      const loader = new DaemonBehaviorLoader({
        projectRoot: tmpDir,
        supervisor: {},
      });
      const active = await loader.loadAll();
      expect(active.size).toBe(0);
    });

    it('should skip behaviors without module field', async () => {
      const behaviorDir = join(tmpDir, 'agentic', 'code', 'addons', 'test', 'behaviors');
      mkdirSync(behaviorDir, { recursive: true });
      writeFileSync(
        join(behaviorDir, 'prompt-only.behavior.md'),
        '---\nname: prompt-only\nmetadata:\n  scope: daemon\n---\n'
      );

      const loader = new DaemonBehaviorLoader({
        projectRoot: tmpDir,
        supervisor: {},
      });
      const active = await loader.loadAll();
      expect(active.size).toBe(0);
    });
  });

  describe('getForTrigger', () => {
    it('should return orchestrators matching the trigger', async () => {
      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });

      // Manually inject a mock behavior
      const mockOrchestrator = {
        handleMessage: vi.fn(),
        onSessionStart: vi.fn(),
      };
      (loader as any)._active.set('mock', {
        name: 'mock',
        meta: { metadata: { triggers: ['chat-message', 'session-start'] } },
        orchestrator: mockOrchestrator,
      });

      const chatHandlers = loader.getForTrigger('chat-message');
      expect(chatHandlers).toHaveLength(1);
      expect(chatHandlers[0]).toBe(mockOrchestrator);

      const errorHandlers = loader.getForTrigger('on-error');
      expect(errorHandlers).toHaveLength(0);
    });
  });

  describe('get / has', () => {
    it('should return behavior by name', () => {
      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      const mock = { getStatus: vi.fn() };
      (loader as any)._active.set('test', { orchestrator: mock });

      expect(loader.has('test')).toBe(true);
      expect(loader.get('test')).toBe(mock);
      expect(loader.has('nonexistent')).toBe(false);
      expect(loader.get('nonexistent')).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return status summary', () => {
      const loader = new DaemonBehaviorLoader({ projectRoot: tmpDir });
      (loader as any)._active.set('concierge', {
        name: 'concierge',
        meta: {
          metadata: { triggers: ['chat-message'] },
          module: 'tools/daemon/concierge/orchestrator.mjs',
        },
        orchestrator: { getStatus: () => ({}) },
        tier: 'addon',
        path: '/some/path',
      });

      const status = loader.getStatus();
      expect(status.count).toBe(1);
      expect(status.active.concierge).toBeDefined();
      expect(status.active.concierge.triggers).toEqual(['chat-message']);
      expect(status.active.concierge.module).toBe('tools/daemon/concierge/orchestrator.mjs');
    });
  });
});
