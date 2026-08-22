import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { validateFlowGraph } from '../../composition-engine/lib/validator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'schemas', 'graph-playbook.schema.json'), 'utf8'));
const validateSchema = new Ajv({ allErrors: true, strict: false, validateFormats: false }).compile(schema);

function diagnostic(code, pathName, message, hint, details) {
  return { code, severity: 'error', path: pathName || '/', message, ...(hint ? { hint } : {}), ...(details ? { details } : {}) };
}

function pointer(error) {
  const at = error.instancePath || '/';
  if (error.keyword === 'required') return `${at === '/' ? '' : at}/${error.params.missingProperty}`;
  if (error.keyword === 'additionalProperties') return `${at === '/' ? '' : at}/${error.params.additionalProperty}`;
  return at;
}

function strip(object, keys) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

/** Project the optional graph vocabulary into the already-validated FlowGraph substrate. */
export function projectGraphPlaybook(manifest) {
  return {
    apiVersion: 'flow.aiwg.io/v1alpha1',
    kind: 'FlowGraph',
    metadata: strip(manifest.metadata, ['graphId', 'graphVersion']),
    spec: {
      ...strip(manifest.spec, ['checkpoint', 'stateSchema']),
      nodes: manifest.spec.nodes.map((node) => strip(node, ['runtimeBinding', 'lifecycle', 'hitl'])),
      routes: manifest.spec.routes.map((route) => strip(route, ['name', 'evidenceField', 'onFailure', 'fallbackRoute'])),
    },
  };
}

function profileDiagnostics(manifest) {
  const diagnostics = [];
  const nodes = new Map(manifest.spec.nodes.map((node) => [node.id, node]));
  const routes = new Map(manifest.spec.routes.map((route) => [route.id, route]));
  const incoming = new Map(manifest.spec.nodes.map((node) => [node.id, []]));
  for (const route of manifest.spec.routes) {
    const sources = incoming.get(route.to);
    if (sources && !sources.includes(route.from)) sources.push(route.from);
  }

  for (const [index, node] of manifest.spec.nodes.entries()) {
    if (node.kind === 'gate' || node.runtimeBinding === 'hitl') {
      if (!node.hitl) diagnostics.push(diagnostic('HITL_POLICY_REQUIRED', `/spec/nodes/${index}/hitl`, `HITL node '${node.id}' requires responder, deadline, and approve/deny/timeout routes.`));
      else for (const key of ['approveRoute', 'denyRoute', 'timeoutRoute']) {
        if (!routes.has(node.hitl[key])) diagnostics.push(diagnostic('UNRESOLVED_HITL_ROUTE', `/spec/nodes/${index}/hitl/${key}`, `HITL route '${node.hitl[key]}' is not declared.`));
      }
    }
    if ((incoming.get(node.id)?.length ?? 0) > 1) {
      const join = manifest.spec.joins.find((candidate) => candidate.target === node.id);
      if (!join) diagnostics.push(diagnostic('REDUCER_REQUIRED', `/spec/nodes/${index}`, `Fan-in node '${node.id}' requires an explicit join/reducer declaration.`));
    }
  }

  for (const [index, route] of manifest.spec.routes.entries()) {
    if (route.onFailure === 'fallback' && (!route.fallbackRoute || !routes.has(route.fallbackRoute))) {
      diagnostics.push(diagnostic('FALLBACK_ROUTE_REQUIRED', `/spec/routes/${index}/fallbackRoute`, `Route '${route.id}' declares fallback without a resolvable fallbackRoute.`));
    }
  }
  return diagnostics;
}

export function validateGraphPlaybook(manifest, options = {}) {
  const schemaValid = validateSchema(manifest);
  if (!schemaValid) {
    return {
      schemaVersion: 'graph.flow.aiwg.io/v1',
      kind: 'GraphPlaybookValidationReport',
      valid: false,
      diagnostics: (validateSchema.errors ?? []).map((error) => diagnostic('GRAPH_SCHEMA_INVALID', pointer(error), error.message ?? 'Graph profile schema validation failed.', undefined, { keyword: error.keyword, params: error.params })),
    };
  }
  const projected = projectGraphPlaybook(manifest);
  const flow = validateFlowGraph(projected, options);
  const diagnostics = [
    ...flow.diagnostics.map((item) => ({ ...item, code: `FLOW_${item.code}` })),
    ...profileDiagnostics(manifest),
  ];
  const graphId = manifest.metadata.graphId;
  const valid = diagnostics.length === 0;
  return {
    schemaVersion: 'graph.flow.aiwg.io/v1',
    kind: 'GraphPlaybookValidationReport',
    valid,
    diagnostics,
    ...(valid ? {
      normalized: {
        contractVersion: 'graph.flow.aiwg.io/v1',
        kind: 'GraphPlaybookNormalized',
        identity: {
          graphId,
          graphVersion: manifest.metadata.graphVersion,
          runId: null,
          nodeIds: manifest.spec.nodes.map((node) => `${graphId}:node:${node.id}`),
          edgeIds: manifest.spec.routes.map((route) => `${graphId}:edge:${route.id}`),
        },
        profile: structuredClone(manifest),
        flow: flow.normalized,
      },
    } : {}),
  };
}

export { schema as graphPlaybookSchema };
