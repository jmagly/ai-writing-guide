import { describe, expect, it } from 'vitest';
import {
  AIWG_GRAPH_METADATA_KEY,
  extractGraphMetadata,
  graphMetadataRecord,
  isGraphExecutionMetadata,
  type GraphExecutionMetadata,
} from '../../../src/flow/graph-metadata.js';

const graph: GraphExecutionMetadata = {
  schemaVersion: 'graph.flow.aiwg.io/v1',
  graphId: 'examples/review',
  graphVersion: '1.0.0',
  runId: 'run-42',
  nodeId: 'screen',
  nodeRunId: 'run-42:screen',
  edgeId: 'start-to-screen',
};

describe('Flow graph execution metadata', () => {
  it('uses one namespaced A2A metadata envelope', () => {
    const record = graphMetadataRecord(graph);
    expect(record[AIWG_GRAPH_METADATA_KEY]).toEqual(graph);
    expect(extractGraphMetadata(record)).toEqual(graph);
  });

  it('fails closed for incomplete or spoofed identity shapes', () => {
    expect(isGraphExecutionMetadata({ ...graph, runId: '' })).toBe(false);
    expect(extractGraphMetadata({ [AIWG_GRAPH_METADATA_KEY]: { graphId: 'spoof' } })).toBeUndefined();
  });
});
