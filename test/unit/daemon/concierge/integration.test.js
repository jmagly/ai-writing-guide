/**
 * Integration test: DaemonBehaviorLoader discovers and activates the
 * ConciergeOrchestrator from the concierge.behavior.md definition,
 * then routes a chat message through the full pipeline.
 */
import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../../../..');

const loadBehaviorLoader = async () => {
  const mod = await import('../../../../tools/daemon/behavior-loader.mjs');
  return mod.DaemonBehaviorLoader;
};

describe('Concierge integration (#642)', () => {
  it('should discover concierge.behavior.md from daemon addon', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const loader = new DaemonBehaviorLoader({ projectRoot: PROJECT_ROOT });
    const discovered = await loader.discover();

    const concierge = discovered.find(d => d.file === 'concierge.behavior.md');
    expect(concierge, 'concierge.behavior.md not discovered').toBeDefined();
    expect(concierge.tier).toBe('addon');
    expect(concierge.addon).toBe('daemon');
  });

  it('should parse concierge frontmatter with module and triggers', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const loader = new DaemonBehaviorLoader({ projectRoot: PROJECT_ROOT });
    const discovered = await loader.discover();
    const entry = discovered.find(d => d.file === 'concierge.behavior.md');

    const meta = await loader.parseFrontmatter(entry.path);
    expect(meta.name).toBe('concierge');
    expect(meta.module).toBe('tools/daemon/concierge/orchestrator.mjs');
    // Canonical shape per #1025 — scope and triggers nest under metadata.
    expect(meta.metadata.scope).toBe('daemon');
    expect(meta.metadata.triggers).toContain('chat-message');
    expect(meta.metadata.triggers).toContain('session-start');
    expect(meta.metadata.triggers).toContain('on-error');
  });

  it('should activate concierge orchestrator via loadAll', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const mockSupervisor = {
      submit: vi.fn().mockReturnValue({ id: 'task-int-1', state: 'queued' }),
    };

    const loader = new DaemonBehaviorLoader({
      projectRoot: PROJECT_ROOT,
      supervisor: mockSupervisor,
    });

    const active = await loader.loadAll();
    expect(active.has('concierge'), 'concierge not activated').toBe(true);

    const orch = loader.get('concierge');
    expect(orch).toBeDefined();
    expect(typeof orch.handleMessage).toBe('function');
    expect(typeof orch.onSessionStart).toBe('function');
    expect(typeof orch.translateResponse).toBe('function');
    expect(typeof orch.onError).toBe('function');
    expect(typeof orch.getStatus).toBe('function');
  });

  it('should route chat-message trigger to concierge', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const mockSupervisor = {
      submit: vi.fn().mockReturnValue({ id: 'task-int-2', state: 'queued' }),
    };

    const loader = new DaemonBehaviorLoader({
      projectRoot: PROJECT_ROOT,
      supervisor: mockSupervisor,
    });
    await loader.loadAll();

    const handlers = loader.getForTrigger('chat-message');
    expect(handlers.length).toBeGreaterThanOrEqual(1);
    expect(typeof handlers[0].handleMessage).toBe('function');
  });

  it('should handle conversational message end-to-end without supervisor', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const mockSupervisor = {
      submit: vi.fn().mockReturnValue({ id: 'task-int-3', state: 'queued' }),
    };

    const loader = new DaemonBehaviorLoader({
      projectRoot: PROJECT_ROOT,
      supervisor: mockSupervisor,
    });
    await loader.loadAll();

    const orch = loader.get('concierge');
    const result = await orch.handleMessage('thanks');

    expect(result.type).toBe('response');
    expect(result.category).toBe('conversational');
    expect(result.response).toBeDefined();
    expect(mockSupervisor.submit).not.toHaveBeenCalled();
  });

  it('should dispatch maintenance message to supervisor end-to-end', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const mockSupervisor = {
      submit: vi.fn().mockReturnValue({ id: 'task-int-4', state: 'queued' }),
    };

    const loader = new DaemonBehaviorLoader({
      projectRoot: PROJECT_ROOT,
      supervisor: mockSupervisor,
    });
    await loader.loadAll();

    const orch = loader.get('concierge');
    const result = await orch.handleMessage('is aiwg up to date');

    expect(result.type).toBe('task-dispatched');
    expect(result.taskId).toBe('task-int-4');
    expect(mockSupervisor.submit).toHaveBeenCalledOnce();
  });

  it('should report behavior status via getStatus', async () => {
    const DaemonBehaviorLoader = await loadBehaviorLoader();
    const loader = new DaemonBehaviorLoader({
      projectRoot: PROJECT_ROOT,
      supervisor: { submit: vi.fn().mockReturnValue({ id: 'x' }) },
    });
    await loader.loadAll();

    const status = loader.getStatus();
    expect(status.count).toBeGreaterThanOrEqual(1);
    expect(status.active.concierge).toBeDefined();
    expect(status.active.concierge.module).toBe('tools/daemon/concierge/orchestrator.mjs');
  });
});
