import { executeFlowGraph } from '../../composition-engine/lib/runtime.mjs';
import { projectGraphPlaybook, validateGraphPlaybook } from './validator.mjs';

function invalid(report) {
  const error = new Error('GraphPlaybook validation failed.');
  error.code = 'GRAPH_PLAYBOOK_INVALID';
  error.details = { diagnostics: report.diagnostics };
  return error;
}

/** Deterministic, side-effect-free static route plan. */
export function dryRunGraphPlaybook(manifest, options = {}) {
  const validation = validateGraphPlaybook(manifest, options.validation);
  if (!validation.valid) throw invalid(validation);
  const graphId = validation.normalized.identity.graphId;
  const runId = options.runId ?? `${graphId}:dry-run`;
  const nodes = new Map(manifest.spec.nodes.map((node) => [node.id, node]));
  return {
    schemaVersion: 'graph.flow.aiwg.io/v1',
    kind: 'GraphDryRunReport',
    graphId,
    graphVersion: manifest.metadata.graphVersion,
    runId,
    sideEffectsExecuted: false,
    runnableNodeIds: [...manifest.spec.entry].sort(),
    nodes: manifest.spec.nodes.map((node) => ({
      nodeId: node.id,
      nodeRunId: `${runId}:${node.id}`,
      runtimeBinding: node.runtimeBinding,
      sideEffectMode: node.sideEffectMode,
      retryLimit: node.retry?.limit ?? 0,
      hitl: node.hitl ?? null,
    })),
    routes: manifest.spec.routes.map((route) => ({
      edgeId: route.id,
      fromNodeId: route.from,
      toNodeId: route.to,
      routeName: route.name,
      predicate: route.when ?? null,
      guard: route.guard ?? null,
      maxIterations: route.maxIterations ?? null,
      evidenceField: route.evidenceField,
      onFailure: route.onFailure,
      fallbackRoute: route.fallbackRoute ?? null,
      sourceRuntimeBinding: nodes.get(route.from)?.runtimeBinding,
      targetRuntimeBinding: nodes.get(route.to)?.runtimeBinding,
    })),
    joins: structuredClone(manifest.spec.joins),
    checkpoint: structuredClone(manifest.spec.checkpoint),
  };
}

export function assessGraphReplay(manifest, checkpoint) {
  const validation = validateGraphPlaybook(manifest);
  if (!validation.valid) throw invalid(validation);
  const graphId = validation.normalized.identity.graphId;
  const reasons = [];
  if (!checkpoint || typeof checkpoint !== 'object') reasons.push('checkpoint is not an object');
  if (checkpoint?.graphId !== graphId) reasons.push(`checkpoint graphId '${checkpoint?.graphId ?? ''}' does not match '${graphId}'`);
  if (!checkpoint?.runId) reasons.push('checkpoint runId is missing');
  if (manifest.spec.checkpoint.mode === 'none') reasons.push('GraphPlaybook checkpoint mode is none');
  if (!checkpoint?.state || !checkpoint?.events) reasons.push('checkpoint is missing state or event evidence');
  return {
    schemaVersion: 'graph.flow.aiwg.io/v1',
    kind: 'GraphReplayAssessment',
    graphId,
    sourceRunId: checkpoint?.runId ?? null,
    replayable: reasons.length === 0,
    reasons,
    resumeFrom: reasons.length ? null : structuredClone(checkpoint),
  };
}

/** Execute via the existing FlowGraph runtime while enriching every adapter call and event. */
export async function executeGraphPlaybook(manifest, options = {}) {
  const validation = validateGraphPlaybook(manifest, options.validation);
  if (!validation.valid) throw invalid(validation);
  if (typeof options.invokeNode !== 'function') throw Object.assign(new Error('Graph execution requires invokeNode.'), { code: 'ADAPTER_REQUIRED' });
  const graphId = validation.normalized.identity.graphId;
  const graphVersion = manifest.metadata.graphVersion;
  const runId = options.runId ?? `${graphId}:run`;
  const profileNodes = new Map(manifest.spec.nodes.map((node) => [node.id, node]));
  const incoming = new Map(manifest.spec.routes.map((route) => [route.to, route]));
  const metadataFor = (nodeId, nodeRunId, state) => {
    const node = profileNodes.get(nodeId);
    const route = incoming.get(nodeId);
    return {
      schemaVersion: 'graph.flow.aiwg.io/v1',
      graphId,
      graphVersion,
      runId,
      nodeId,
      nodeRunId: nodeRunId ?? `${runId}:${nodeId}`,
      ...(route ? { edgeId: route.id, routeName: route.name } : {}),
      runtimeBinding: node?.runtimeBinding,
      ...(state ? { nodeState: state } : {}),
    };
  };
  const stateForEvent = (type) => type === 'node-started' ? 'running'
    : type === 'node-completed' || type === 'node-replayed' ? 'succeeded'
      : type === 'node-skipped' ? 'skipped'
        : type.includes('failed') ? 'failed' : undefined;
  const flow = projectGraphPlaybook(manifest);
  const hitlDecisions = options.hitlDecisions ?? {};
  const approvedGates = new Set(options.approvedGates ?? []);
  for (const node of manifest.spec.nodes) {
    if (!node.hitl) continue;
    const decision = hitlDecisions[node.id];
    if (decision) approvedGates.add(node.id);
    const selectedRoute = decision === 'approve' ? node.hitl.approveRoute
      : decision === 'deny' ? node.hitl.denyRoute
        : decision === 'timeout' ? node.hitl.timeoutRoute : undefined;
    if (decision) {
      for (const routeId of [node.hitl.approveRoute, node.hitl.denyRoute, node.hitl.timeoutRoute]) {
        const route = flow.spec.routes.find((candidate) => candidate.id === routeId);
        if (route) route.when = { language: 'cel', expression: routeId === selectedRoute ? 'true' : 'false' };
      }
    }
  }
  const report = await executeFlowGraph(flow, {
    ...options,
    runId,
    approvedGates: [...approvedGates],
    invokeNode: (request) => options.invokeNode({
      ...request,
      profileNode: structuredClone(profileNodes.get(request.node.id)),
      graphMetadata: metadataFor(request.node.id, request.nodeRunId, 'running'),
    }),
    onEvent: async (event) => {
      const graphMetadata = event.nodeId ? metadataFor(event.nodeId, event.nodeRunId, stateForEvent(event.type)) : undefined;
      const graphEvent = {
        ...event,
        schemaVersion: 'graph.flow.aiwg.io/v1',
        graphId,
        graphVersion,
        ...(graphMetadata ? { graphMetadata } : {}),
        ...(event.type === 'route-evaluated' ? {
          edgeId: event.routeId,
          routeName: manifest.spec.routes.find((route) => route.id === event.routeId)?.name,
          routeReason: event.exhausted ? 'iteration ceiling exhausted'
            : event.active ? 'predicate and guard matched'
              : event.predicateMatched ? 'guard did not match' : 'predicate did not match',
          routeEvidence: {
            predicateMatched: Boolean(event.predicateMatched),
            guardMatched: Boolean(event.guardMatched),
            exhausted: Boolean(event.exhausted),
            evidenceField: manifest.spec.routes.find((route) => route.id === event.routeId)?.evidenceField ?? null,
          },
        } : {}),
      };
      await options.onGraphEvent?.(structuredClone(graphEvent));
      await options.onEvent?.(structuredClone(graphEvent));
    },
  });
  const denied = Object.entries(hitlDecisions).filter(([, decision]) => decision === 'deny').map(([nodeId]) => nodeId);
  const stopReason = denied.length && report.status === 'failed' && report.stopReason.startsWith('no runnable nodes remain')
    ? `HITL denial routed through guarded rework for node(s): ${denied.join(', ')}`
    : report.stopReason;
  return {
    ...report,
    schemaVersion: 'graph.flow.aiwg.io/v1',
    kind: 'GraphRunReport',
    graphId,
    graphVersion,
    runId,
    stopReason,
    hitlDecisions: structuredClone(hitlDecisions),
    checkpoint: {
      ...report.checkpoint,
      schemaVersion: 'graph.flow.aiwg.io/v1',
      kind: 'GraphPlaybookCheckpoint',
      graphId,
      events: report.checkpoint.events.map((event) => ({ ...event, graphId })),
    },
  };
}
