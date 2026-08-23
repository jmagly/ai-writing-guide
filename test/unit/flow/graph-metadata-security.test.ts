import { describe, expect, it } from 'vitest';
import { projectGraphMetadata } from '../../../src/flow/graph-metadata.js';

const metadata = {
  schemaVersion: 'graph.flow.aiwg.io/v1' as const,
  graphId: 'private/customer-workflow', graphVersion: '1.0.0', runId: 'run-private',
  nodeId: 'review', nodeRunId: 'run-private:review', edgeId: 'approve',
  checkpointId: 'checkpoint-private', replayOfRunId: 'prior-private',
  runtimeBinding: 'a2a-sandbox', nodeState: 'running' as const,
  routeReason: 'declared predicate matched',
  routeEvidence: { predicateMatched: true, evidenceField: '/review/status' },
};

describe('graph metadata security projections', () => {
  it('fails closed on invalid metadata', () => {
    expect(() => projectGraphMetadata({ ...metadata, runId: '' }, 'cockpit')).toThrow('Invalid graph execution metadata');
  });

  it('keeps declared evidence for Cockpit but removes replay lineage', () => {
    expect(projectGraphMetadata(metadata, 'cockpit')).toEqual(expect.objectContaining({
      graphId: metadata.graphId, runId: metadata.runId, routeEvidence: metadata.routeEvidence,
    }));
    expect(projectGraphMetadata(metadata, 'cockpit')).not.toHaveProperty('replayOfRunId');
  });

  it('removes execution identity and route evidence from public metadata', () => {
    const projected = projectGraphMetadata(metadata, 'public');
    expect(projected).toMatchObject({ graphVersion: '1.0.0', nodeId: 'review', nodeState: 'running' });
    for (const field of ['graphId', 'runId', 'nodeRunId', 'checkpointId', 'replayOfRunId', 'routeReason', 'routeEvidence']) {
      expect(projected).not.toHaveProperty(field);
    }
  });
});
