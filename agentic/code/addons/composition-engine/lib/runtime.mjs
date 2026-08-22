import { createHash } from 'node:crypto';
import { validateFlowGraph } from './validator.mjs';

const RESOURCE_KEYS = ['activations', 'tokens', 'costUsd', 'timeMs'];

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${createHash('sha256').update(canonical(value)).digest('hex')}`;
}

function getPointer(root, pointer) {
  if (pointer === '' || pointer === '/') return root;
  return pointer.split('/').slice(1).reduce((value, token) => (
    value?.[token.replaceAll('~1', '/').replaceAll('~0', '~')]
  ), root);
}

function setPointer(root, pointer, replacement) {
  const tokens = pointer.split('/').slice(1).map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
  if (tokens.length === 0) return replacement;
  const output = clone(root);
  let cursor = output;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    if (!cursor[token] || typeof cursor[token] !== 'object') return output;
    cursor = cursor[token];
  }
  if (Object.prototype.hasOwnProperty.call(cursor, tokens.at(-1))) cursor[tokens.at(-1)] = replacement;
  return output;
}

function redact(value, pointers) {
  let result = clone(value);
  for (const pointer of pointers) result = setPointer(result, pointer, '[REDACTED]');
  return result;
}

function reduceValue(current, next, reducer) {
  switch (reducer) {
    case 'replace': return clone(next);
    case 'append': return [...(current ?? []), ...(Array.isArray(next) ? next : [next])];
    case 'merge': return { ...(current ?? {}), ...(next ?? {}) };
    case 'sum': return (current ?? 0) + next;
    case 'min': return current === undefined ? next : Math.min(current, next);
    case 'max': return current === undefined ? next : Math.max(current, next);
    case 'set-union': return [...new Set([...(current ?? []), ...(next ?? [])])];
    default: throw new Error(`Unsupported state reducer '${reducer}'.`);
  }
}

function defaultPredicate(predicate, context) {
  if (!predicate) return true;
  const expression = predicate.expression.trim();
  if (expression === 'true') return true;
  if (expression === 'false') return false;
  const match = expression.match(/^(state|metrics)\.([a-z][a-z0-9-]*)\s*(==|!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?|true|false)$/);
  if (!match) throw new Error(`Predicate '${expression}' requires an adapter evaluator.`);
  const [, scope, key, operator, raw] = match;
  const right = raw === 'true' ? true : raw === 'false' ? false : Number(raw);
  const left = context[scope]?.[key];
  switch (operator) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '>=': return left >= right;
    case '<=': return left <= right;
    case '>': return left > right;
    case '<': return left < right;
    default: return false;
  }
}

function usageOf(result) {
  const usage = result?.usage ?? {};
  return {
    tokens: Number(usage.tokens ?? 0),
    costUsd: Number(usage.costUsd ?? 0),
    timeMs: Number(usage.timeMs ?? 0),
  };
}

function assertUsage(usage) {
  for (const [key, value] of Object.entries(usage)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Adapter usage.${key} must be a non-negative number.`);
  }
}

function resultOutput(results, reference) {
  const [nodeId, outputName] = String(reference).split('.');
  return results[nodeId]?.outputs?.[outputName];
}

function initialState(manifest) {
  return Object.fromEntries(manifest.spec.state.fields.map((field) => [field.name, clone(field.initial)]));
}

function resourcesExceeded(realized, ceilings) {
  return RESOURCE_KEYS.find((key) => realized[key] >= ceilings[key]);
}

export class FlowGraphRuntimeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'FlowGraphRuntimeError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Execute the deterministic FlowGraph planner. The returned event stream is a
 * projection for MissionConductor (or another durable owner) to persist; this
 * module deliberately does not create a competing mission ledger.
 */
export async function executeFlowGraph(manifest, options = {}) {
  const validation = validateFlowGraph(manifest, options.validation);
  if (!validation.valid) {
    throw new FlowGraphRuntimeError('FLOW_GRAPH_INVALID', 'FlowGraph validation failed.', {
      diagnostics: validation.diagnostics,
    });
  }
  if (typeof options.invokeNode !== 'function') {
    throw new FlowGraphRuntimeError('ADAPTER_REQUIRED', 'FlowGraph execution requires invokeNode adapter function.');
  }

  const graphId = validation.normalized.identity.graphId;
  const runId = options.runId ?? `${graphId}:run`;
  const evaluatePredicate = options.evaluatePredicate ?? defaultPredicate;
  const allowedCapabilities = new Set(options.allowedCapabilities ?? manifest.spec.capabilities.map((item) => item.id));
  const allowedPermissions = new Set(options.allowedPermissions ?? manifest.spec.permissions);
  const approvedGates = new Set(options.approvedGates ?? []);
  const nodeOrder = new Map(manifest.spec.nodes.map((node, index) => [node.id, index]));
  const nodes = new Map(manifest.spec.nodes.map((node) => [node.id, node]));
  const stateFields = new Map(manifest.spec.state.fields.map((field) => [field.name, field]));
  const resume = options.resumeFrom ?? {};
  const state = { ...initialState(manifest), ...(clone(resume.state) ?? {}) };
  const results = clone(resume.results) ?? {};
  const receipts = clone(resume.receipts) ?? {};
  const completed = new Set(resume.completed ?? []);
  const failed = new Set(resume.failed ?? []);
  const skipped = new Set(resume.skipped ?? []);
  const activatedRoutes = new Set(resume.activatedRoutes ?? []);
  const events = clone(resume.events) ?? [];
  const realized = {
    activations: Number(resume.realized?.activations ?? 0),
    nodeRuns: Number(resume.realized?.nodeRuns ?? 0),
    tokens: Number(resume.realized?.tokens ?? 0),
    costUsd: Number(resume.realized?.costUsd ?? 0),
    timeMs: Number(resume.realized?.timeMs ?? 0),
    maxConcurrency: Number(resume.realized?.maxConcurrency ?? 0),
    retries: Number(resume.realized?.retries ?? 0),
  };
  const joinState = clone(resume.joins) ?? {};
  let sequence = events.length;
  let terminal;

  async function emit(type, payload = {}) {
    const event = { sequence: ++sequence, type, graphId, runId, ...clone(payload) };
    events.push(event);
    await options.onEvent?.(clone(event));
  }

  function checkpoint() {
    return {
      schemaVersion: 'composition.checkpoint.aiwg.io/v1alpha1',
      graphId,
      runId,
      state: clone(state),
      results: clone(results),
      receipts: clone(receipts),
      completed: [...completed].sort((a, b) => nodeOrder.get(a) - nodeOrder.get(b)),
      failed: [...failed].sort((a, b) => nodeOrder.get(a) - nodeOrder.get(b)),
      skipped: [...skipped].sort((a, b) => nodeOrder.get(a) - nodeOrder.get(b)),
      activatedRoutes: [...activatedRoutes].sort(),
      joins: clone(joinState),
      realized: clone(realized),
      events: clone(events),
    };
  }

  async function persist() {
    await options.saveCheckpoint?.(checkpoint());
  }

  function tracePayload(node, inputs, outputs) {
    const base = {
      inputDigest: digest(inputs),
      outputDigest: digest(outputs),
    };
    if (manifest.spec.trace.level === 'bindings') {
      return { ...base, inputNames: Object.keys(inputs).sort(), outputNames: Object.keys(outputs).sort() };
    }
    if (manifest.spec.trace.level === 'full-io') {
      return {
        ...base,
        inputs: redact(inputs, manifest.spec.trace.redact),
        outputs: redact(outputs, manifest.spec.trace.redact),
      };
    }
    return base;
  }

  function inputsFor(node) {
    return Object.fromEntries(node.inputs.map((binding) => {
      if (binding.from) return [binding.name, clone(resultOutput(results, binding.from))];
      if (binding.state) return [binding.name, clone(state[binding.state])];
      return [binding.name, clone(binding.value)];
    }));
  }

  function enforceAuthority(node) {
    const missingCapability = node.capabilities.find((id) => !allowedCapabilities.has(id));
    if (missingCapability) throw new FlowGraphRuntimeError('CAPABILITY_DENIED', `Node '${node.id}' is not authorized for capability '${missingCapability}'.`);
    const missingPermission = node.permissions.find((id) => !allowedPermissions.has(id));
    if (missingPermission) throw new FlowGraphRuntimeError('PERMISSION_DENIED', `Node '${node.id}' is not authorized for permission '${missingPermission}'.`);
    if (node.kind === 'gate' && !approvedGates.has(node.id)) {
      throw new FlowGraphRuntimeError('APPROVAL_REQUIRED', `Gate '${node.id}' has not been approved.`);
    }
  }

  function applyOutputs(node, outputs) {
    for (const binding of node.outputs) {
      if (!Object.prototype.hasOwnProperty.call(outputs, binding.name)) {
        throw new FlowGraphRuntimeError('MISSING_TYPED_OUTPUT', `Node '${node.id}' did not return output '${binding.name}'.`);
      }
      if (binding.state) {
        const field = stateFields.get(binding.state);
        state[binding.state] = reduceValue(state[binding.state], outputs[binding.name], field.reducer);
      }
    }
  }

  async function invoke(node, activationTick, iteration = 1) {
    enforceAuthority(node);
    const inputs = inputsFor(node);
    const inputSnapshot = clone(inputs);
    const nodeRunId = `${runId}:${node.id}:${activationTick}:${iteration}`;
    const invocationKey = node.idempotencyKey
      ? `${graphId}:${node.id}:${node.idempotencyKey}:${digest(inputSnapshot).slice(7, 23)}`
      : nodeRunId;
    const existing = receipts[invocationKey];
    if (existing && ['idempotent', 'exactly-once'].includes(node.sideEffectMode)) {
      await emit('node-replayed', { nodeId: node.id, nodeRunId, activation: activationTick, invocationKey });
      results[node.id] = clone(existing.result);
      completed.add(node.id);
      return existing.result;
    }

    const attempts = (node.retry?.limit ?? 0) + 1;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      await emit('node-started', {
        nodeId: node.id,
        nodeRunId,
        activation: activationTick,
        iteration,
        attempt,
        invocationKey,
        inputDigest: digest(inputSnapshot),
      });
      try {
        const raw = await options.invokeNode({
          graphId,
          runId,
          node: clone(node),
          nodeRunId,
          activationId: `${runId}:activation:${activationTick}`,
          activation: activationTick,
          iteration,
          attempt,
          invocationKey,
          inputs: inputSnapshot,
          state: clone(state),
          requestedResources: clone(node.ceilings ?? manifest.spec.ceilings),
        });
        const outputs = clone(raw?.outputs ?? {});
        const usage = usageOf(raw);
        assertUsage(usage);
        for (const key of ['tokens', 'costUsd', 'timeMs']) {
          const graphCeiling = manifest.spec.ceilings[key];
          const nodeCeiling = node.ceilings?.[key] ?? graphCeiling;
          if (usage[key] > nodeCeiling || realized[key] + usage[key] > graphCeiling) {
            throw new FlowGraphRuntimeError(
              'RESOURCE_CEILING_WOULD_EXCEED',
              `Node '${node.id}' would exceed its ${key} ceiling.`,
              { graphCeiling, nodeCeiling, realized: realized[key], attempted: usage[key] },
            );
          }
        }
        applyOutputs(node, outputs);
        realized.nodeRuns += 1;
        realized.tokens += usage.tokens;
        realized.costUsd += usage.costUsd;
        realized.timeMs += usage.timeMs;
        const result = {
          outputs,
          usage,
          ...(raw?.score === undefined ? {} : { score: raw.score }),
          ...(raw?.citations === undefined ? {} : { citations: clone(raw.citations) }),
          adapter: options.adapterId ?? 'unspecified',
          nodeRunId,
          invocationKey,
        };
        results[node.id] = result;
        completed.add(node.id);
        failed.delete(node.id);
        if (['idempotent', 'exactly-once'].includes(node.sideEffectMode)) receipts[invocationKey] = { result: clone(result) };
        await emit('node-completed', {
          nodeId: node.id,
          nodeRunId,
          activation: activationTick,
          iteration,
          attempt,
          invocationKey,
          usage,
          score: raw?.score,
          citations: clone(raw?.citations),
          ...tracePayload(node, inputSnapshot, outputs),
        });
        await persist();
        return result;
      } catch (error) {
        lastError = error;
        await emit('node-attempt-failed', {
          nodeId: node.id,
          nodeRunId,
          activation: activationTick,
          iteration,
          attempt,
          invocationKey,
          code: error?.code ?? 'ADAPTER_FAILURE',
          message: error instanceof Error ? error.message : String(error),
        });
        const retryClass = error?.code === 'TIMEOUT' ? 'timeout'
          : error?.code === 'RATE_LIMIT' ? 'rate-limit'
            : 'failure';
        if (attempt < attempts && node.retry?.on.includes(retryClass)) realized.retries += 1;
        else break;
      }
    }
    failed.add(node.id);
    completed.delete(node.id);
    throw lastError;
  }

  function predicateContext(extra = {}) {
    return {
      state: clone(state),
      results: clone(results),
      metrics: { ...clone(realized), ...extra },
    };
  }

  async function routeFrom(nodeId) {
    for (const [index, route] of manifest.spec.routes.entries()) {
      if (route.from !== nodeId) continue;
      const routeId = route.id ?? `route-${index}-${route.from}-${route.to}`;
      const active = await evaluatePredicate(route.when, predicateContext());
      if (active) activatedRoutes.add(routeId);
      await emit('route-evaluated', {
        routeId,
        edgeId: `${graphId}:route:${routeId}:${route.from}->${route.to}`,
        from: route.from,
        to: route.to,
        active: Boolean(active),
      });
    }
  }

  function phaseIndex(node) {
    if (!node.phase) return 0;
    const phases = [...new Set(manifest.spec.nodes.map((item) => item.phase).filter(Boolean))];
    return phases.indexOf(node.phase) + 1;
  }

  function incomingRoutes(nodeId) {
    return manifest.spec.routes.map((route, index) => ({ route, index })).filter(({ route }) => route.to === nodeId);
  }

  function joinFor(nodeId) {
    return manifest.spec.joins.find((join) => join.target === nodeId);
  }

  function ordinaryJoinReady(join) {
    const succeeded = join.sources.filter((id) => completed.has(id)).length;
    if (join.policy.mode === 'all') return succeeded === join.sources.length;
    if (join.policy.mode === 'quorum') return succeeded >= join.policy.quorum;
    if (join.policy.mode === 'fixed') return succeeded >= join.policy.count;
    return false;
  }

  function nodeReady(node) {
    if (completed.has(node.id) || failed.has(node.id) || skipped.has(node.id)) return false;
    const join = joinFor(node.id);
    if (join && !['lcm', 'converged', 'budget'].includes(join.policy.mode)) return ordinaryJoinReady(join);
    if (join) return false;
    if ((node.dependsOn ?? []).some((id) => !completed.has(id) && !skipped.has(id))) return false;
    const incoming = incomingRoutes(node.id);
    if (incoming.length === 0) return manifest.spec.entry.includes(node.id) || (node.dependsOn?.length ?? 0) > 0;
    return incoming.some(({ route, index }) => activatedRoutes.has(route.id ?? `route-${index}-${route.from}-${route.to}`));
  }

  async function activation(nodesToRun, tick, iteration = 1) {
    realized.activations = Math.max(realized.activations, tick);
    const parallelEligible = nodesToRun.length > 1
      && typeof options.parallelDispatch === 'function'
      && nodesToRun.every((node) => node.sideEffectMode === 'none' && (node.retry?.limit ?? 0) === 0);
    realized.maxConcurrency = Math.max(realized.maxConcurrency, parallelEligible ? nodesToRun.length : Math.min(1, nodesToRun.length));
    await emit('activation-started', {
      activation: tick,
      nodeIds: nodesToRun.map((node) => node.id),
      inputSnapshotDigests: Object.fromEntries(nodesToRun.map((node) => [node.id, digest(inputsFor(node))])),
    });
    let settled;
    if (parallelEligible) {
      const requests = nodesToRun.map((node) => {
        enforceAuthority(node);
        const inputs = inputsFor(node);
        const nodeRunId = `${runId}:${node.id}:${tick}:${iteration}`;
        return {
          graphId,
          runId,
          node: clone(node),
          nodeRunId,
          activationId: `${runId}:activation:${tick}`,
          activation: tick,
          iteration,
          attempt: 1,
          invocationKey: nodeRunId,
          inputs: clone(inputs),
          state: clone(state),
          requestedResources: clone(node.ceilings ?? manifest.spec.ceilings),
        };
      });
      for (const request of requests) {
        await emit('node-started', {
          nodeId: request.node.id,
          nodeRunId: request.nodeRunId,
          activation: tick,
          iteration,
          attempt: 1,
          invocationKey: request.invocationKey,
          inputDigest: digest(request.inputs),
          delegated: 'parallel-dispatch',
        });
      }
      try {
        const rawResults = await options.parallelDispatch(clone(requests), options.invokeNode);
        if (!Array.isArray(rawResults) || rawResults.length !== requests.length) {
          throw new FlowGraphRuntimeError('PARALLEL_RESULT_MISMATCH', 'parallelDispatch must return one ordered result per request.');
        }
        settled = [];
        for (let index = 0; index < requests.length; index += 1) {
          const request = requests[index];
          const node = nodesToRun[index];
          const raw = rawResults[index];
          const outputs = clone(raw?.outputs ?? {});
          const usage = usageOf(raw);
          assertUsage(usage);
          for (const key of ['tokens', 'costUsd', 'timeMs']) {
            const graphCeiling = manifest.spec.ceilings[key];
            const nodeCeiling = node.ceilings?.[key] ?? graphCeiling;
            if (usage[key] > nodeCeiling || realized[key] + usage[key] > graphCeiling) {
              throw new FlowGraphRuntimeError('RESOURCE_CEILING_WOULD_EXCEED', `Node '${node.id}' would exceed its ${key} ceiling.`);
            }
          }
          applyOutputs(node, outputs);
          realized.nodeRuns += 1;
          realized.tokens += usage.tokens;
          realized.costUsd += usage.costUsd;
          realized.timeMs += usage.timeMs;
          const result = {
            outputs,
            usage,
            ...(raw?.score === undefined ? {} : { score: raw.score }),
            ...(raw?.citations === undefined ? {} : { citations: clone(raw.citations) }),
            adapter: options.adapterId ?? 'unspecified',
            nodeRunId: request.nodeRunId,
            invocationKey: request.invocationKey,
          };
          results[node.id] = result;
          completed.add(node.id);
          await emit('node-completed', {
            nodeId: node.id,
            nodeRunId: request.nodeRunId,
            activation: tick,
            iteration,
            attempt: 1,
            invocationKey: request.invocationKey,
            delegated: 'parallel-dispatch',
            usage,
            score: raw?.score,
            citations: clone(raw?.citations),
            ...tracePayload(node, request.inputs, outputs),
          });
          settled.push({ node, result });
        }
        await persist();
      } catch (error) {
        settled = nodesToRun.map((node) => ({ node, error }));
      }
    } else {
      settled = [];
      for (const node of nodesToRun) {
        try {
          settled.push({ node, result: await invoke(node, tick, iteration) });
        } catch (error) {
          settled.push({ node, error });
        }
      }
    }
    for (const item of settled) {
      if (item.result) await routeFrom(item.node.id);
      else await handleFailure(item.node, item.error, tick);
    }
    await emit('activation-completed', { activation: tick, nodeIds: nodesToRun.map((node) => node.id) });
  }

  async function handleFailure(node, error, tick) {
    if (manifest.spec.failure.onNodeFailure === 'skip-optional' && node.optional === true) {
      failed.delete(node.id);
      skipped.add(node.id);
      await emit('node-skipped', { nodeId: node.id, activation: tick, reason: 'optional node failed' });
      return;
    }
    if (manifest.spec.failure.onNodeFailure === 'continue') {
      failed.delete(node.id);
      skipped.add(node.id);
      await emit('node-skipped', { nodeId: node.id, activation: tick, reason: 'failure policy continued' });
      return;
    }
    const fallbackId = node.fallback?.node;
    if (fallbackId && manifest.spec.failure.onNodeFailure === 'fallback') {
      const fallback = nodes.get(fallbackId);
      await emit('fallback-started', { nodeId: node.id, fallbackNodeId: fallbackId, activation: tick });
      await invoke(fallback, tick, 1);
      completed.add(node.id);
      return;
    }
    await emit('node-failed', {
      nodeId: node.id,
      activation: tick,
      code: error?.code ?? 'NODE_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
    if (manifest.spec.failure.onNodeFailure === 'fail' || failed.size > manifest.spec.failure.maxFailures) {
      terminal = { code: error?.code ?? 'NODE_FAILED', reason: `node '${node.id}' failed` };
    }
  }

  async function temporalJoin(join) {
    const sourceNodes = join.sources.map((id) => nodes.get(id));
    const policy = join.policy;
    const maximum = policy.mode === 'lcm'
      ? policy.periods.reduce((value, next) => {
          const gcd = (a, b) => (b ? gcd(b, a % b) : a);
          return (value * next) / gcd(value, next);
        }, 1)
      : policy.maxIterations ?? manifest.spec.ceilings.activations;
    let satisfied = false;
    let reason = 'ceiling';
    for (let iteration = 1; iteration <= maximum && !terminal; iteration += 1) {
      const tick = realized.activations + 1;
      if (tick > manifest.spec.ceilings.activations) break;
      let activeSources = sourceNodes;
      if (policy.mode === 'lcm') activeSources = sourceNodes.filter((_, index) => iteration % policy.periods[index] === 0);
      if (activeSources.length > 0) {
        for (const source of activeSources) {
          completed.delete(source.id);
          failed.delete(source.id);
        }
        await activation(activeSources, tick, iteration);
      } else {
        realized.activations = tick;
        await emit('activation-completed', { activation: tick, nodeIds: [] });
      }
      if (policy.mode === 'lcm') {
        satisfied = activeSources.length === sourceNodes.length;
        reason = satisfied ? `lcm:${maximum}` : 'period-pending';
      } else if (policy.mode === 'converged') {
        satisfied = Boolean(await evaluatePredicate(policy.predicate, predicateContext({ iteration })));
        reason = satisfied ? 'converged' : 'threshold-not-met';
      } else {
        satisfied = realized.costUsd >= policy.maxCostUsd;
        reason = satisfied ? 'budget-reached' : 'budget-available';
      }
      await emit('join-evaluated', {
        joinId: join.id,
        edgeIds: join.sources.map((source) => `${graphId}:join:${join.id}:${source}->${join.target}`),
        activation: realized.activations,
        iteration,
        policy: policy.mode,
        satisfied,
        reason,
      });
      if (satisfied) break;
      const exceeded = resourcesExceeded(realized, manifest.spec.ceilings);
      if (exceeded) break;
    }
    joinState[join.id] = { satisfied, reason, activation: realized.activations };
    if (satisfied) {
      const target = nodes.get(join.target);
      completed.delete(target.id);
      try {
        await invoke(target, realized.activations, 1);
        await routeFrom(target.id);
      } catch (error) {
        await handleFailure(target, error, realized.activations);
      }
    } else if (!terminal) {
      terminal = { code: 'JOIN_CEILING_EXHAUSTED', reason: `join '${join.id}' stopped: ${reason}` };
    }
  }

  await emit('run-started', {
    requestedResources: clone(manifest.spec.ceilings),
    adapter: options.adapterId ?? 'unspecified',
    resumed: Boolean(options.resumeFrom),
  });

  const temporal = manifest.spec.joins.filter((join) => ['lcm', 'converged', 'budget'].includes(join.policy.mode));
  const temporalSources = new Set(temporal.flatMap((join) => join.sources));
  for (const join of temporal) {
    if (join.sources.some((id) => completed.has(id)) && joinState[join.id]?.satisfied) continue;
    await temporalJoin(join);
  }

  while (!terminal) {
    const candidates = manifest.spec.nodes
      .filter((node) => !temporalSources.has(node.id) && nodeReady(node))
      .sort((left, right) => phaseIndex(left) - phaseIndex(right)
        || String(left.track ?? '').localeCompare(String(right.track ?? ''))
        || nodeOrder.get(left.id) - nodeOrder.get(right.id));
    if (candidates.length === 0) break;
    const minimumPhase = phaseIndex(candidates[0]);
    const wave = candidates.filter((node) => phaseIndex(node) === minimumPhase).slice(0, manifest.spec.ceilings.concurrency);
    const nextTick = realized.activations + 1;
    if (nextTick > manifest.spec.ceilings.activations) {
      terminal = { code: 'ACTIVATION_CEILING_EXHAUSTED', reason: 'activation ceiling exhausted' };
      break;
    }
    await activation(wave, nextTick);
    const exceeded = resourcesExceeded(realized, manifest.spec.ceilings);
    const workRemains = manifest.spec.nodes.some((node) => !completed.has(node.id) && !failed.has(node.id) && !skipped.has(node.id));
    if (exceeded && workRemains) terminal = { code: 'RESOURCE_CEILING_EXHAUSTED', reason: `${exceeded} ceiling exhausted` };
  }

  const unresolved = manifest.spec.nodes.filter((node) => !completed.has(node.id) && !failed.has(node.id) && !skipped.has(node.id));
  if (!terminal && unresolved.length > 0) {
    terminal = { code: 'NO_RUNNABLE_NODES', reason: `no runnable nodes remain: ${unresolved.map((node) => node.id).join(', ')}` };
  }

  const output = resultOutput(results, manifest.spec.output.from);
  let status = terminal ? 'failed' : 'completed';
  if (terminal && manifest.spec.failure.onNodeFailure === 'partial-synthesis') status = 'partial';
  const publicOutput = status === 'completed' && output !== undefined
    ? clone(output)
    : manifest.spec.output.mode === 'typed-terminal-failure'
      ? { code: terminal?.code ?? 'OUTPUT_UNAVAILABLE', stopReason: terminal?.reason ?? 'terminal output unavailable' }
      : status === 'partial'
        ? { partial: true, state: clone(state), stopReason: terminal.reason }
        : undefined;

  await emit('run-completed', {
    status,
    stopReason: terminal?.reason ?? 'completed',
    requestedResources: clone(manifest.spec.ceilings),
    realizedResources: clone(realized),
    outputDigest: publicOutput === undefined ? undefined : digest(publicOutput),
  });
  await persist();

  return {
    schemaVersion: 'composition.run.aiwg.io/v1alpha1',
    graphId,
    runId,
    status,
    stopReason: terminal?.reason ?? 'completed',
    output: publicOutput,
    state: clone(state),
    results: clone(results),
    requestedResources: clone(manifest.spec.ceilings),
    realizedResources: clone(realized),
    trace: events,
    checkpoint: checkpoint(),
  };
}
