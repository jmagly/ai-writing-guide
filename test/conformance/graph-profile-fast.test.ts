import { describe, expect, it } from 'vitest';
import graphConformance from '../../agentic/code/addons/graph-pattern/commands/graph-conformance.mjs';
import { GRAPH_CONFORMANCE_CASES, runGraphConformance } from '../../agentic/code/addons/graph-pattern/lib/conformance.mjs';

describe('graph.flow.aiwg.io fast conformance', () => {
  it('passes every required headless fixture with machine-readable identity', async () => {
    const report = await runGraphConformance();
    expect(report.passed, JSON.stringify(report.cases.filter((item: any) => !item.passed), null, 2)).toBe(true);
    expect(report.total).toBe(GRAPH_CONFORMANCE_CASES.length);
    expect(report.cases.map((item: any) => item.name)).toEqual(GRAPH_CONFORMANCE_CASES);
    for (const item of report.cases) {
      expect(item.identity.graphId).toBeTruthy();
      expect(item.identity.nodeIds.length).toBeGreaterThan(0);
      expect(item.identity.edgeIds.length).toBeGreaterThan(0);
    }
  });

  it('exposes one-fixture CLI execution and rejects unknown fixtures', async () => {
    const selected = await graphConformance(['--fixture', 'sandbox-disconnect', '--format', 'json']);
    expect(selected.exitCode).toBe(0);
    expect(JSON.parse(selected.message)).toMatchObject({ kind: 'GraphConformanceReport', total: 1, passed: true });
    const unknown = await graphConformance(['--fixture', 'not-a-fixture']);
    expect(unknown.exitCode).toBe(2);
    expect(JSON.parse(unknown.message).code).toBe('UNKNOWN_FIXTURE');
  });
});
