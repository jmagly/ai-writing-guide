import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(fs.readFileSync(path.join(addonRoot, 'schemas', 'flow-graph.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
const validateSchema = ajv.compile(schema);

const SIDE_EFFECT_RANK = {
  none: 0,
  idempotent: 1,
  'exactly-once': 2,
  'approval-required': 3,
};

function diagnostic(code, pathName, message, hint, details) {
  return {
    code,
    severity: 'error',
    path: pathName || '/',
    message,
    ...(hint ? { hint } : {}),
    ...(details ? { details } : {}),
  };
}

function pointer(error) {
  const at = error.instancePath || '/';
  if (error.keyword === 'required') return `${at === '/' ? '' : at}/${error.params.missingProperty}`;
  if (error.keyword === 'additionalProperties') return `${at === '/' ? '' : at}/${error.params.additionalProperty}`;
  return at;
}

function schemaErrorMessage(error) {
  if (error.keyword === 'const') {
    return `must be equal to constant ${JSON.stringify(error.params.allowedValue)}.`;
  }
  return error.message ?? 'Schema validation failed.';
}

function duplicates(items, key, pathName, diagnostics) {
  const seen = new Map();
  for (const [index, item] of items.entries()) {
    const value = item?.[key];
    if (seen.has(value)) {
      diagnostics.push(diagnostic(
        'DUPLICATE_IDENTIFIER',
        `${pathName}/${index}/${key}`,
        `Duplicate ${key} '${value}'.`,
        `Rename this entry; the first declaration is at ${pathName}/${seen.get(value)}.`,
      ));
    } else {
      seen.set(value, index);
    }
  }
}

function schemaTypes(value) {
  if (!value || typeof value !== 'object' || !value.type) return null;
  return new Set(Array.isArray(value.type) ? value.type : [value.type]);
}

function schemasCompatible(source, target) {
  const sourceTypes = schemaTypes(source);
  const targetTypes = schemaTypes(target);
  if (!sourceTypes || !targetTypes) return true;
  for (const type of sourceTypes) {
    if (targetTypes.has(type)) return true;
    if (type === 'integer' && targetTypes.has('number')) return true;
  }
  return false;
}

function gcd(left, right) {
  let a = left;
  let b = right;
  while (b) [a, b] = [b, a % b];
  return a;
}

function lcm(values) {
  return values.reduce((value, next) => (value * next) / gcd(value, next), 1);
}

function tarjan(nodeIds, edges) {
  const adjacency = new Map(nodeIds.map((id) => [id, []]));
  for (const edge of edges) adjacency.get(edge.from)?.push(edge.to);
  let nextIndex = 0;
  const stack = [];
  const onStack = new Set();
  const indexes = new Map();
  const lows = new Map();
  const components = [];

  function visit(id) {
    indexes.set(id, nextIndex);
    lows.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);
    for (const target of adjacency.get(id) ?? []) {
      if (!indexes.has(target)) {
        visit(target);
        lows.set(id, Math.min(lows.get(id), lows.get(target)));
      } else if (onStack.has(target)) {
        lows.set(id, Math.min(lows.get(id), indexes.get(target)));
      }
    }
    if (lows.get(id) === indexes.get(id)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== id);
      components.push(component);
    }
  }

  for (const id of nodeIds) if (!indexes.has(id)) visit(id);
  return components;
}

function readBinding(reference, nodeById) {
  const [nodeId, outputName] = String(reference).split('.');
  const node = nodeById.get(nodeId);
  const output = node?.outputs?.find((candidate) => candidate.name === outputName);
  return { nodeId, outputName, node, output };
}

function validateModeRequirements(owner, pathName, nodeById, diagnostics) {
  if (owner.sideEffectMode === 'exactly-once' && !owner.idempotencyKey) {
    diagnostics.push(diagnostic(
      'UNSAFE_SIDE_EFFECT_MODE',
      pathName,
      'exactly-once side effects require an idempotencyKey.',
      'Declare a stable idempotency key or use the idempotent mode.',
    ));
  }
  if (owner.sideEffectMode === 'approval-required') {
    const gate = owner.approvalGate && nodeById.get(owner.approvalGate);
    if (!gate || gate.kind !== 'gate') {
      diagnostics.push(diagnostic(
        'UNRESOLVED_APPROVAL_GATE',
        `${pathName}/approvalGate`,
        `Approval gate '${owner.approvalGate ?? ''}' does not resolve to a gate node.`,
        'Point approvalGate at a declared node whose kind is gate.',
      ));
    }
  }
}

function validateReducer(field, index, diagnostics) {
  const type = field.schema?.type;
  if (['sum', 'min', 'max'].includes(field.reducer) && !['integer', 'number'].includes(type)) {
    diagnostics.push(diagnostic(
      'INCOMPATIBLE_REDUCER',
      `/spec/state/fields/${index}/reducer`,
      `Reducer '${field.reducer}' requires an integer or number schema.`,
    ));
  }
  if (['append', 'set-union'].includes(field.reducer) && type !== 'array') {
    diagnostics.push(diagnostic(
      'INCOMPATIBLE_REDUCER',
      `/spec/state/fields/${index}/reducer`,
      `Reducer '${field.reducer}' requires an array schema.`,
    ));
  }
  if (field.reducer === 'merge' && type !== 'object') {
    diagnostics.push(diagnostic(
      'INCOMPATIBLE_REDUCER',
      `/spec/state/fields/${index}/reducer`,
      "Reducer 'merge' requires an object schema.",
    ));
  }
}

function semanticDiagnostics(manifest, options) {
  const diagnostics = [];
  const spec = manifest.spec;
  const nodes = spec.nodes;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const candidateById = new Map(spec.candidates.map((candidate) => [candidate.id, candidate]));
  const capabilityById = new Map(spec.capabilities.map((capability) => [capability.id, capability]));
  const stateByName = new Map(spec.state.fields.map((field) => [field.name, field]));
  const allowedPermissions = new Set(spec.permissions);

  duplicates(nodes, 'id', '/spec/nodes', diagnostics);
  duplicates(spec.candidates, 'id', '/spec/candidates', diagnostics);
  duplicates(spec.capabilities, 'id', '/spec/capabilities', diagnostics);
  duplicates(spec.state.fields, 'name', '/spec/state/fields', diagnostics);
  duplicates(spec.joins, 'id', '/spec/joins', diagnostics);
  const routesWithIds = spec.routes.filter((route) => route.id);
  duplicates(routesWithIds, 'id', '/spec/routes', diagnostics);

  for (const [index, field] of spec.state.fields.entries()) validateReducer(field, index, diagnostics);

  for (const [index, entry] of spec.entry.entries()) {
    if (!nodeById.has(entry)) {
      diagnostics.push(diagnostic(
        'UNRESOLVED_REFERENCE',
        `/spec/entry/${index}`,
        `Entry node '${entry}' is not declared.`,
        'Declare the node or remove the entry reference.',
      ));
    }
  }

  for (const [index, candidate] of spec.candidates.entries()) {
    if (options.catalogIds && !options.catalogIds.has(candidate.id)) {
      diagnostics.push(diagnostic(
        'UNRESOLVED_INDEX_REFERENCE',
        `/spec/candidates/${index}/id`,
        `Stable AIWG index reference '${candidate.id}' was not found in the supplied catalog.`,
        'Run aiwg discover/show to obtain the current stable ID, then update the authorized candidate set.',
      ));
    }
  }

  for (const [index, capability] of spec.capabilities.entries()) {
    for (const permission of capability.permissions) {
      if (!allowedPermissions.has(permission)) {
        diagnostics.push(diagnostic(
          'PERMISSION_WIDENING',
          `/spec/capabilities/${index}/permissions`,
          `Capability '${capability.id}' widens graph permission '${permission}'.`,
          'Add the permission to spec.permissions only if the graph is authorized for it.',
        ));
      }
    }
    validateModeRequirements(capability, `/spec/capabilities/${index}`, nodeById, diagnostics);
  }

  for (const [index, node] of nodes.entries()) {
    const nodePath = `/spec/nodes/${index}`;
    duplicates(node.inputs, 'name', `${nodePath}/inputs`, diagnostics);
    duplicates(node.outputs, 'name', `${nodePath}/outputs`, diagnostics);
    if (node.kind === 'gate') {
      if (node.ref) diagnostics.push(diagnostic('ILLEGAL_GATE_REFERENCE', `${nodePath}/ref`, 'Gate nodes cannot resolve an AIWG artifact reference.'));
    } else if (!node.ref) {
      diagnostics.push(diagnostic(
        'UNRESOLVED_INDEX_REFERENCE',
        `${nodePath}/ref`,
        `Node '${node.id}' requires a stable AIWG index reference.`,
        'Use aiwg discover followed by aiwg show metadata and authorize that stable ID in spec.candidates.',
      ));
    } else {
      const candidate = candidateById.get(node.ref);
      if (!candidate) {
        diagnostics.push(diagnostic(
          'UNRESOLVED_INDEX_REFERENCE',
          `${nodePath}/ref`,
          `Node '${node.id}' references '${node.ref}', which is absent from spec.candidates.`,
          'Add the stable ID to the authorized candidate set or correct the node reference.',
        ));
      } else if (candidate.kind !== node.kind) {
        diagnostics.push(diagnostic(
          'INCOMPATIBLE_REFERENCE_KIND',
          `${nodePath}/ref`,
          `Node kind '${node.kind}' is incompatible with authorized candidate kind '${candidate.kind}'.`,
        ));
      }
    }
    if (node.kind === 'function' && node.deterministic !== true) {
      diagnostics.push(diagnostic(
        'NONDETERMINISTIC_FUNCTION',
        `${nodePath}/deterministic`,
        `Function node '${node.id}' must declare deterministic: true.`,
      ));
    }

    for (const dependency of node.dependsOn ?? []) {
      if (!nodeById.has(dependency)) diagnostics.push(diagnostic('UNRESOLVED_REFERENCE', `${nodePath}/dependsOn`, `Dependency '${dependency}' is not declared.`));
    }
    if (node.fallback && !nodeById.has(node.fallback.node)) {
      diagnostics.push(diagnostic('UNRESOLVED_REFERENCE', `${nodePath}/fallback/node`, `Fallback node '${node.fallback.node}' is not declared.`));
    }
    for (const capabilityId of node.capabilities) {
      if (!capabilityById.has(capabilityId)) {
        diagnostics.push(diagnostic(
          'UNDECLARED_CAPABILITY',
          `${nodePath}/capabilities`,
          `Node '${node.id}' requests undeclared capability '${capabilityId}'.`,
        ));
      }
    }
    for (const permission of node.permissions) {
      if (!allowedPermissions.has(permission)) {
        diagnostics.push(diagnostic('PERMISSION_WIDENING', `${nodePath}/permissions`, `Node '${node.id}' widens graph permission '${permission}'.`));
      }
      const permittedByCapability = node.capabilities.some((id) => capabilityById.get(id)?.permissions.includes(permission));
      if (!permittedByCapability) {
        diagnostics.push(diagnostic(
          'PERMISSION_WIDENING',
          `${nodePath}/permissions`,
          `Node '${node.id}' requests '${permission}' without a declared capability granting it.`,
        ));
      }
    }
    const minimumMode = Math.max(0, ...node.capabilities.map((id) => SIDE_EFFECT_RANK[capabilityById.get(id)?.sideEffectMode] ?? 0));
    if (SIDE_EFFECT_RANK[node.sideEffectMode] < minimumMode) {
      diagnostics.push(diagnostic('UNSAFE_SIDE_EFFECT_MODE', `${nodePath}/sideEffectMode`, `Node '${node.id}' weakens a capability side-effect guarantee.`));
    }
    validateModeRequirements(node, nodePath, nodeById, diagnostics);
    if (node.retry?.limit > 0 && node.sideEffectMode === 'approval-required') {
      diagnostics.push(diagnostic(
        'UNSAFE_RETRY_MODE',
        `${nodePath}/retry`,
        `Node '${node.id}' cannot automatically retry approval-required side effects.`,
        'Set retry.limit to 0 or move approval into a separate gate before an idempotent operation.',
      ));
    }
    if (node.retry?.limit > 0 && node.sideEffectMode === 'exactly-once' && !node.idempotencyKey) {
      diagnostics.push(diagnostic('UNSAFE_RETRY_MODE', `${nodePath}/retry`, `Node '${node.id}' retries exactly-once work without an idempotencyKey.`));
    }
    for (const [inputIndex, input] of node.inputs.entries()) {
      if (input.from) {
        const source = readBinding(input.from, nodeById);
        if (!source.node || !source.output) {
          diagnostics.push(diagnostic(
            'UNRESOLVED_BINDING',
            `${nodePath}/inputs/${inputIndex}/from`,
            `Input binding '${input.from}' does not resolve to a declared node output.`,
          ));
        } else if (!schemasCompatible(source.output.schema, input.schema)) {
          diagnostics.push(diagnostic(
            'INCOMPATIBLE_SCHEMA',
            `${nodePath}/inputs/${inputIndex}/schema`,
            `Input '${node.id}.${input.name}' is incompatible with output '${input.from}'.`,
            'Align the source output and target input JSON Schema types.',
          ));
        }
      }
      if (input.state) {
        const field = stateByName.get(input.state);
        if (!field) diagnostics.push(diagnostic('UNRESOLVED_STATE', `${nodePath}/inputs/${inputIndex}/state`, `State field '${input.state}' is not declared.`));
        else if (!schemasCompatible(field.schema, input.schema)) diagnostics.push(diagnostic('INCOMPATIBLE_SCHEMA', `${nodePath}/inputs/${inputIndex}/schema`, `Input '${node.id}.${input.name}' is incompatible with state '${input.state}'.`));
      }
    }
    for (const [outputIndex, output] of node.outputs.entries()) {
      if (!output.state) continue;
      const field = stateByName.get(output.state);
      if (!field) diagnostics.push(diagnostic('UNRESOLVED_STATE', `${nodePath}/outputs/${outputIndex}/state`, `State field '${output.state}' is not declared.`));
      else if (!schemasCompatible(output.schema, field.schema)) diagnostics.push(diagnostic('INCOMPATIBLE_SCHEMA', `${nodePath}/outputs/${outputIndex}/schema`, `Output '${node.id}.${output.name}' is incompatible with state '${output.state}'.`));
    }
    if (node.ceilings) {
      for (const key of Object.keys(spec.ceilings)) {
        if (node.ceilings[key] > spec.ceilings[key]) diagnostics.push(diagnostic('CEILING_WIDENING', `${nodePath}/ceilings/${key}`, `Node ceiling '${key}' exceeds the graph ceiling.`));
      }
    }
  }

  for (const [index, route] of spec.routes.entries()) {
    if (!route.progress) continue;
    const field = stateByName.get(route.progress.state);
    if (!field) {
      diagnostics.push(diagnostic(
        'UNRESOLVED_PROGRESS_STATE',
        `/spec/routes/${index}/progress/state`,
        `Progress state '${route.progress.state}' is not declared.`,
      ));
    } else if (field.schema?.type !== 'integer' || field.reducer !== 'replace' || !Number.isInteger(field.initial)) {
      diagnostics.push(diagnostic(
        'INVALID_PROGRESS_MEASURE',
        `/spec/routes/${index}/progress`,
        `Progress state '${route.progress.state}' must have an integer initial value and use the replace reducer.`,
        'Use an integer state snapshot so strict decrease can be checked between cycle activations.',
      ));
    }
    if (!route.guard || !route.maxIterations) {
      diagnostics.push(diagnostic(
        'INVALID_PROGRESS_MEASURE',
        `/spec/routes/${index}/progress`,
        'A progress-guarded route also requires guard and maxIterations.',
        'Keep maxIterations as the overall safety ceiling.',
      ));
    }
  }

  const edges = [];
  for (const [index, route] of spec.routes.entries()) {
    if (!nodeById.has(route.from)) diagnostics.push(diagnostic('UNRESOLVED_REFERENCE', `/spec/routes/${index}/from`, `Route source '${route.from}' is not declared.`));
    if (!nodeById.has(route.to)) diagnostics.push(diagnostic('UNRESOLVED_REFERENCE', `/spec/routes/${index}/to`, `Route target '${route.to}' is not declared.`));
    edges.push({ from: route.from, to: route.to, route, path: `/spec/routes/${index}` });
  }
  for (const node of nodes) for (const dependency of node.dependsOn ?? []) edges.push({ from: dependency, to: node.id, route: null, path: '/spec/nodes' });

  for (const [index, join] of spec.joins.entries()) {
    const joinPath = `/spec/joins/${index}`;
    if (!nodeById.has(join.target)) diagnostics.push(diagnostic('UNRESOLVED_REFERENCE', `${joinPath}/target`, `Join target '${join.target}' is not declared.`));
    for (const source of join.sources) {
      if (!nodeById.has(source)) diagnostics.push(diagnostic('UNRESOLVED_REFERENCE', `${joinPath}/sources`, `Join source '${source}' is not declared.`));
      edges.push({ from: source, to: join.target, route: null, path: joinPath });
    }
    const policy = join.policy;
    const allowed = {
      all: [],
      quorum: ['quorum'],
      fixed: ['count'],
      lcm: ['periods'],
      converged: ['predicate', 'maxIterations'],
      budget: ['maxCostUsd'],
    }[policy.mode];
    const supplied = Object.keys(policy).filter((key) => key !== 'mode');
    if (supplied.some((key) => !allowed.includes(key)) || allowed.some((key) => policy[key] === undefined)) {
      diagnostics.push(diagnostic('IMPOSSIBLE_JOIN', `${joinPath}/policy`, `Join mode '${policy.mode}' has invalid or missing policy parameters.`, `Allowed parameters: ${allowed.join(', ') || 'none'}.`));
    }
    if (policy.mode === 'quorum' && policy.quorum > join.sources.length) diagnostics.push(diagnostic('IMPOSSIBLE_JOIN', `${joinPath}/policy/quorum`, 'Quorum exceeds the number of join sources.'));
    if (policy.mode === 'fixed' && policy.count > join.sources.length) diagnostics.push(diagnostic('IMPOSSIBLE_JOIN', `${joinPath}/policy/count`, 'Fixed count exceeds the number of join sources.'));
    if (policy.mode === 'lcm' && policy.periods) {
      if (policy.periods.length !== join.sources.length) diagnostics.push(diagnostic('IMPOSSIBLE_JOIN', `${joinPath}/policy/periods`, 'LCM joins require one period per source.'));
      else {
        const activation = lcm(policy.periods);
        if (activation > spec.ceilings.activations) diagnostics.push(diagnostic('IMPOSSIBLE_JOIN', `${joinPath}/policy/periods`, `LCM activation ${activation} exceeds the graph activation ceiling ${spec.ceilings.activations}.`));
      }
    }
    if (policy.mode === 'budget' && policy.maxCostUsd > spec.ceilings.costUsd) diagnostics.push(diagnostic('IMPOSSIBLE_JOIN', `${joinPath}/policy/maxCostUsd`, 'Budget join exceeds the graph cost ceiling.'));
  }

  const reachable = new Set(spec.entry.filter((id) => nodeById.has(id)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (reachable.has(edge.from) && !reachable.has(edge.to)) {
        reachable.add(edge.to);
        changed = true;
      }
    }
  }
  for (const [index, node] of nodes.entries()) {
    if (!reachable.has(node.id)) diagnostics.push(diagnostic('UNREACHABLE_NODE', `/spec/nodes/${index}`, `Node '${node.id}' is unreachable from spec.entry.`));
  }

  for (const component of tarjan(nodes.map((node) => node.id), edges)) {
    const members = new Set(component);
    const internal = edges.filter((edge) => members.has(edge.from) && members.has(edge.to));
    const cyclic = component.length > 1 || internal.some((edge) => edge.from === edge.to);
    if (!cyclic) continue;
    const boundedEdge = internal.find((edge) => edge.route?.guard && edge.route?.maxIterations);
    if (!boundedEdge) {
      diagnostics.push(diagnostic(
        'UNBOUNDED_CYCLE',
        internal[0]?.path ?? '/spec/routes',
        `Cycle among [${component.sort().join(', ')}] has no guarded, finite route.`,
        'Add a CEL guard and finite maxIterations to the feedback route.',
      ));
    }
  }

  const terminal = readBinding(spec.output.from, nodeById);
  if (!terminal.node || !terminal.output) diagnostics.push(diagnostic('UNRESOLVED_BINDING', '/spec/output/from', `Terminal output '${spec.output.from}' does not resolve.`));
  else if (!schemasCompatible(terminal.output.schema, spec.output.schema)) diagnostics.push(diagnostic('INCOMPATIBLE_SCHEMA', '/spec/output/schema', 'Terminal output schema is incompatible with its source binding.'));
  if (spec.output.mode === 'typed-terminal-failure' && !spec.output.failureSchema) diagnostics.push(diagnostic('MISSING_FAILURE_SCHEMA', '/spec/output/failureSchema', 'typed-terminal-failure output requires failureSchema.'));
  if (spec.output.mode !== 'typed-terminal-failure' && spec.output.failureSchema) diagnostics.push(diagnostic('ILLEGAL_OUTPUT_FIELD', '/spec/output/failureSchema', 'failureSchema is only valid with typed-terminal-failure output.'));
  if (spec.failure.onNodeFailure === 'fallback' && !nodes.some((node) => node.fallback)) diagnostics.push(diagnostic('MISSING_FALLBACK', '/spec/failure/onNodeFailure', 'Global fallback policy requires at least one node fallback.'));

  return diagnostics;
}

export function normalizeFlowGraph(manifest) {
  const graphId = manifest.metadata.namespace
    ? `${manifest.metadata.namespace}/${manifest.metadata.name}`
    : manifest.metadata.name;
  const routeEdges = manifest.spec.routes.map((route, index) => (
    route.id ?? `${graphId}:route:${route.from}->${route.to}:${index}`
  ));
  const joinEdges = manifest.spec.joins.flatMap((join) => (
    join.sources.map((source) => `${graphId}:join:${join.id}:${source}->${join.target}`)
  ));
  return {
    contractVersion: 'flow.aiwg.io/v1alpha1',
    kind: 'FlowGraphNormalized',
    source: {
      apiVersion: manifest.apiVersion,
      kind: manifest.kind,
      graphId,
    },
    identity: {
      graphId,
      runId: null,
      nodeIds: manifest.spec.nodes.map((node) => `${graphId}:${node.id}`),
      edgeIds: [...routeEdges, ...joinEdges],
    },
    graph: structuredClone(manifest),
  };
}

export function validateFlowGraph(manifest, options = {}) {
  const schemaValid = validateSchema(manifest);
  const diagnostics = schemaValid
    ? semanticDiagnostics(manifest, options)
    : (validateSchema.errors ?? []).map((error) => diagnostic(
        'SCHEMA_INVALID',
        pointer(error),
        schemaErrorMessage(error),
        error.keyword === 'additionalProperties' ? 'Remove unknown fields; v1alpha1 is closed by default.' : undefined,
        { keyword: error.keyword, params: error.params },
      ));
  const valid = diagnostics.length === 0;
  return {
    schemaVersion: 'flow.aiwg.io/v1alpha1',
    kind: 'FlowGraphValidationReport',
    valid,
    diagnostics,
    ...(valid ? { normalized: normalizeFlowGraph(manifest) } : {}),
  };
}

export { schema as flowGraphSchema };
