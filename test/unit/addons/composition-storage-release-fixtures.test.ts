import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executeFlowGraph } from '../../../agentic/code/addons/composition-engine/lib/runtime.mjs';
import { validateFlowGraph } from '../../../agentic/code/addons/composition-engine/lib/validator.mjs';

const ROOT = resolve('agentic/code/addons/composition-engine/fixtures');
const fixture = (name: string) => JSON.parse(readFileSync(resolve(ROOT, `${name}.json`), 'utf8'));

describe('executable safety reference graphs (#2192)', () => {
  it('ships validated release and migration examples through composition example discovery', () => {
    for (const name of ['release-gate', 'storage-migration-fortemi']) {
      const result = validateFlowGraph(fixture(name));
      expect(result.valid, JSON.stringify(result.diagnostics)).toBe(true);
    }
    const migration = fixture('storage-migration-fortemi');
    expect(migration.spec.nodes[0].inputs.find((input: any) => input.name === 'destinations').value).toEqual({
      primary: 'fortemi-server', advancedVariant: 'postgres-direct',
    });
  });

  it('binds PDF production to the fresh render and requires every release branch', async () => {
    const graph = fixture('release-gate');
    const first = await executeFlowGraph(graph, { runId: 'release-ok', invokeNode: releaseAdapter });
    expect(first.status).toBe('paused');
    expect(first.trace.filter((event: any) => event.type === 'node-completed').map((event: any) => event.nodeId))
      .toEqual(expect.arrayContaining(['tests', 'render-html', 'print-pdf', 'schema-inventory']));
    expect(first.trace.some((event: any) => event.type === 'run-paused' && event.nodeId === 'release')).toBe(true);
    const completed = await executeFlowGraph(graph, {
      runId: 'release-ok', resumeFrom: first.checkpoint, approvedGates: ['release'], invokeNode: releaseAdapter,
    });
    expect(completed.status).toBe('completed');
    expect(completed.output).toMatchObject({ release: true, evidence: { renderDigest: 'render-current' } });

    const stale = await executeFlowGraph(graph, {
      runId: 'release-stale',
      invokeNode: async (request: any) => releaseAdapter(request, { stalePdf: true }),
    });
    expect(stale.status).toBe('failed');
    expect(stale.trace.some((event: any) => event.type === 'node-failed' && event.nodeId === 'print-pdf')).toBe(true);

    const missing = await executeFlowGraph(graph, {
      runId: 'release-missing',
      invokeNode: async (request: any) => {
        if (request.node.id === 'schema-inventory') throw new Error('schema branch failed');
        return releaseAdapter(request);
      },
    });
    expect(missing.status).toBe('failed');
    expect(missing.trace.some((event: any) => event.type === 'node-completed' && event.nodeId === 'release')).toBe(false);
  });

  it('executes checkpointed migration, strictly drains lag, pauses for approval, and retains rollback', async () => {
    const graph = fixture('storage-migration-fortemi');
    const lag = [2, 1, 0];
    const adapter = (request: any) => migrationAdapter(request, lag);
    const first = await executeFlowGraph(graph, { runId: 'migration-ok', invokeNode: adapter });
    expect(first.status).toBe('paused');
    expect(first.state.lag).toBe(0);
    const reconciles = first.trace.filter((event: any) => event.type === 'node-completed' && event.nodeId === 'reconcile');
    expect(reconciles).toHaveLength(3);
    const completed = await executeFlowGraph(graph, {
      runId: 'migration-ok', resumeFrom: first.checkpoint, approvedGates: ['approve'], invokeNode: adapter,
    });
    expect(completed.status).toBe('completed');
    expect(completed.output).toMatchObject({ sourceRetained: true });
    expect(completed.trace).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'node-completed', nodeId: 'cutover' }),
      expect.objectContaining({ type: 'node-completed', nodeId: 'smoke' }),
      expect.objectContaining({ type: 'node-completed', nodeId: 'rollback-ready' }),
    ]));
  });

  it('fails closed on flat reconciliation, false-green parity, lost updates, and delete omission', async () => {
    const graph = fixture('storage-migration-fortemi');
    const flat = await executeFlowGraph(graph, { runId: 'flat', invokeNode: (request: any) => migrationAdapter(request, [2, 2]) });
    expect(flat.status).toBe('failed');
    expect(flat.stopReason).toContain('did not strictly decrease');
    for (const fault of ['false-green', 'lost-update', 'missing-delete'] as const) {
      const failed = await executeFlowGraph(graph, {
        runId: fault, invokeNode: (request: any) => migrationAdapter(request, [0], fault),
      });
      expect(failed.status).toBe('failed');
      expect(failed.trace.some((event: any) => event.type === 'node-completed' && event.nodeId === 'cutover')).toBe(false);
    }
    const stopped = await executeFlowGraph(graph, { operatorAction: 'stop', invokeNode: () => { throw new Error('must not run'); } });
    expect(stopped).toMatchObject({ status: 'cancelled', stopReason: 'operator requested stop' });
  });
});

async function releaseAdapter({ node, inputs }: any, fault: { stalePdf?: boolean } = {}) {
  if (node.id === 'tests' || node.id === 'schema-inventory') return { outputs: { receipt: { passed: true, digest: `${node.id}-digest` } }, usage: usage() };
  if (node.id === 'render-html') return { outputs: { render: { artifact: 'release-notes.html', sourceDigest: 'markdown-current', renderDigest: 'render-current' } }, usage: usage(), sideEffects: [{ resource: 'release-notes.html', outcome: 'written' }] };
  if (node.id === 'print-pdf') {
    const render = inputs['fresh-render'];
    if (fault.stalePdf || render.renderDigest !== 'render-current') throw new Error('stale render cannot produce PDF');
    return { outputs: { pdf: { artifact: 'release-notes.pdf', renderDigest: render.renderDigest, pdfDigest: 'pdf-current' } }, usage: usage(), sideEffects: [{ resource: 'release-notes.pdf', outcome: 'written' }] };
  }
  if (node.id === 'decision') return { outputs: { decision: { release: true, evidence: { renderDigest: inputs.pdf.renderDigest } } }, usage: usage() };
  return { outputs: {}, usage: usage() };
}

async function migrationAdapter({ node }: any, lag: number[], fault?: 'false-green' | 'lost-update' | 'missing-delete') {
  if (node.id === 'snapshot') return { outputs: { manifest: { snapshot: 's1', cursor: '10', digest: 'source-digest' } }, usage: usage() };
  if (node.id === 'parallel-copy') return { outputs: { receipt: { committed: true, idempotencyKey: 'copy-v1', checkpoint: '10' } }, usage: usage(), sideEffects: [{ resource: 'destination', outcome: 'committed' }] };
  if (node.id === 'reconcile') return { outputs: { remaining: lag.shift() ?? 0, receipt: { updates: fault === 'lost-update' ? 0 : 1, deletes: fault === 'missing-delete' ? 0 : 1, duplicates: 1 } }, usage: usage(), sideEffects: [{ resource: 'checkpoint', outcome: 'committed' }] };
  if (node.id === 'verify') {
    if (fault) throw new Error(`negative control rejected: ${fault}`);
    return { outputs: { parity: { valid: true, count: 8, digest: 'source-digest', edges: true } }, usage: usage() };
  }
  if (node.id === 'cutover') return { outputs: { 'routing-receipt': { reads: 'destination', writes: 'destination', approvalDigest: 'approved' } }, usage: usage(), sideEffects: [{ resource: 'routing', outcome: 'switched' }] };
  if (node.id === 'smoke') return { outputs: { result: { passed: true } }, usage: usage() };
  if (node.id === 'rollback-ready') return { outputs: { result: { sourceRetained: true, windowEndsAt: '2026-09-01T00:00:00.000Z' } }, usage: usage() };
  return { outputs: {}, usage: usage() };
}

function usage() { return { tokens: 1, costUsd: 0, timeMs: 1 }; }
