# Composition Engine

The Composition Engine adds a typed, provider-neutral execution-graph profile
to AIWG's existing Flow metalanguage. The profile uses:

~~~yaml
apiVersion: flow.aiwg.io/v1alpha1
kind: FlowGraph
~~~

The graph profile deliberately stays under the existing **flow.aiwg.io** API
group. **FlowGraph** distinguishes it from **FlowPlaybook** without requiring a
fourth-level DNS name. It reuses Flow's explicit DAG, dependency, retry, gate,
and audit vocabulary, then adds the graph semantics that the base profile does
not provide: conditional routes, guarded cycles, typed state and reducers,
join policies, hard ceilings, graph-aware approvals, and stable identities.

## Install and validate

~~~bash
aiwg use composition-engine
aiwg composition validate path/to/graph.yaml
aiwg composition validate path/to/graph.yaml --format json
aiwg composition validate path/to/graph.yaml --catalog index-export.json --format json
aiwg composition example linear-flow
aiwg composition example linear-flow --output ./my-first-graph.json
aiwg composition run path/to/graph.yaml --adapter ./composition-adapter.mjs
~~~

Run `aiwg composition validate --help` to print the installed schema, fixture,
and example locations. `aiwg composition example` defaults to the valid
`linear-flow` starter; use `--help` to list every shipped fixture that can be
printed or copied.

The optional catalog accepts an array of stable IDs or an object containing
**artifacts[]**, **results[]**, or **candidates[]**. It proves that the
manifest's authorized candidates exist in a specific AIWG index export.
Independently, every non-gate node must resolve through **spec.candidates**;
the executor never discovers an artifact outside that authorized set.

Invalid manifests return exit code 1 and a stable
**FlowGraphValidationReport**. Invocation errors return exit code 2.

## Execute

**aiwg composition run** validates before executing and requires an explicit
adapter module. The adapter exports **invokeNode(request)** and may export
**parallelDispatch(requests, invokeNode)** and **evaluatePredicate(...)**.
This keeps provider and transport behavior outside the portable graph.

The runtime owns deterministic runnable-set planning, immutable activation
inputs, typed reducer order, routes, joins, invocation keys, and hard ceilings.
It emits an append-only event projection and checkpoint snapshots for
MissionConductor to persist; it does not replace MissionConductor's durable
ledger, provenance, cost, best-output, or checkpoint ownership.

~~~bash
aiwg composition run graph.yaml --adapter ./adapter.mjs --format json
aiwg composition run graph.yaml --adapter ./adapter.mjs \
  --run-id review-42 --checkpoint .aiwg/runs/review-42.json
aiwg composition run graph.yaml --adapter ./adapter.mjs \
  --resume .aiwg/runs/review-42.json
~~~

See [docs/runtime-operations.md](docs/runtime-operations.md) for adapter,
failure, replay, output-gate, and tracing guidance.

## Evaluate composition policies

`aiwg composition benchmark` expands a versioned benchmark manifest into raw
machine-readable records and a reproducible summary. The shipped suite holds
tasks, fixture-model settings, budgets, seeds, metrics, and thresholds fixed
while comparing single-pass, Self-Refine, parallel candidates, strict 4/5 LCM,
adaptive convergence, and budget-partial policies.

~~~bash
aiwg composition benchmark benchmarks/composition-policy-benchmark.v1.json \
  --raw-out evidence/composition-policy-benchmark-v1.raw.json \
  --summary-out evidence/composition-policy-benchmark-v1.summary.json
~~~

The included records are labeled **synthetic-conformance**. They validate
aggregation, failure handling, and reproducibility but cannot support provider
quality, cost, latency, or preference claims. See
[docs/composition-evaluation.md](docs/composition-evaluation.md) for the claim
gate and [docs/composition-evaluation-research-matrix.md](docs/composition-evaluation-research-matrix.md)
for local-corpus evidence decisions.

## Contract

The source of truth is
[schemas/flow-graph.schema.json](schemas/flow-graph.schema.json). Generated
TypeScript declarations live in
[types/flow-graph.generated.ts](types/flow-graph.generated.ts) and are
regenerated with:

~~~bash
node agentic/code/addons/composition-engine/scripts/generate-types.mjs
~~~

The strict schema covers:

- agent, skill, prompt, evaluator, tool, deterministic function, and gate nodes;
- stable AIWG index references and an authorized candidate set;
- typed input/output bindings, graph state, and explicit reducers;
- phases, tracks, dependencies, conditional routes, and guarded finite cycles;
- strict-decrease progress measures layered with finite cycle ceilings;
- all, quorum, fixed, lcm, converged, and budget joins;
- activation, token, cost, time, and concurrency ceilings;
- retry, optional-skip, fallback, failure, and partial-synthesis policies;
- declared capabilities, permissions, and four side-effect modes;
- final-only, progressive, and typed terminal-failure outputs; and
- metadata/binding/full-I/O traces with JSON-pointer redaction; and
- declared/observed scope, side-effect outcomes, and node/branch/join resource evidence.

Trace settings never request, store, or expose private chain-of-thought. They
cover execution metadata and declared input/output bindings only.

## Semantic diagnostics

Schema validation rejects malformed and unknown fields. The semantic pass also
rejects:

| Code | Condition |
|---|---|
| UNRESOLVED_INDEX_REFERENCE | node or catalog reference cannot be resolved |
| INCOMPATIBLE_SCHEMA | source, target, state, or terminal schemas conflict |
| UNREACHABLE_NODE | no path from a declared entry reaches the node |
| DUPLICATE_IDENTIFIER | node, candidate, capability, state, route, or join ID repeats |
| UNBOUNDED_CYCLE | a strongly connected component has no guarded finite feedback route |
| IMPOSSIBLE_JOIN | policy parameters, source counts, LCM, or budget cannot succeed |
| UNDECLARED_CAPABILITY | a node requests a capability absent from the graph |
| PERMISSION_WIDENING | graph, capability, and node permission scopes do not nest |
| UNSAFE_RETRY_MODE | retries can repeat approval-required or unkeyed exactly-once work |

Diagnostics include JSON-pointer paths and remediation hints where a stable
repair is known.

## Provider adapters

Successful validation produces a **flow.aiwg.io/v1alpha1**
**FlowGraphNormalized** envelope. Run reports and checkpoints use that same API
group with **FlowGraphRunReport** and **FlowGraphCheckpoint** kinds. The
normalized envelope carries the unchanged core graph plus graph, node, and edge
identities. Mission, A2A, Sandbox, Cockpit, and provider adapters consume that
same envelope and project it into their own runtime formats; provider names and
provider-specific configuration are forbidden in the core schema.

Runtime graph/run/node/edge metadata is public execution provenance. A runtime
assigns runId when execution begins; validation leaves it null.

## Fixtures

- linear-flow.json
- parallel-fanout.json
- agent-tool-flow.json
- phased-multi-track.json
- lcm-4x5.json — periods four and five synchronize at activation 20
- polyrhythmic-strict-lcm.json — the safe strict profile aligns at activation 20
- polyrhythmic-adaptive.json — the same contract may converge before its hard ceiling
- human-decision-cycle.json — check → approve/fix → recheck with strict-decrease progress and a hard iteration ceiling

See [docs/schema-evolution.md](docs/schema-evolution.md) for compatibility and
unknown-field policy, and
[docs/polyrhythmic-reasoning.md](docs/polyrhythmic-reasoning.md) for the
bounded pattern, examples, safety policy, and evidence rules.
