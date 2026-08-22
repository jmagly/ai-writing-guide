# Graph Development Pattern Gap Audit

Date: 2026-08-21

Scope: `/home/roctinam/dev/aiwg`, with research corpus references from `/home/roctinam/dev/research/research-papers`
Question: what AIWG, Agentic Sandbox, and AOS gaps must be filled to support best-practice graph-system development as an optional deployment/development pattern without making graph orchestration the platform ideology?

## Executive summary

AIWG is already strong on pattern-neutral agent operations: provider-native deployment of agents/skills/rules/behaviors, project-local bundles, the core Flow/Workflow YAML metalanguage, artifact graphs, recursive fan-out, loop execution, A2A task dispatch, HITL, Cockpit operator surfaces, sandbox runtime isolation, audit policy, and optional feature installation.

The first version of this audit understated an important AIWG feature: AIWG already has a Kubernetes-style YAML Flow metalanguage (`flow.aiwg.io/v1`, with `workflow.aiwg.io/v1` accepted for compatibility). It defines capabilities, playbooks, inventories, targets, gates, roles, extensions, `depends_on` DAG edges, retry, fanout panels, audit output, and run directories. This means the correct gap is not “AIWG has no execution topology artifact.” The correct gap is: AIWG does not yet have a graph-domain profile or extension that composes with the existing Flow domain and adds the graph-specific semantics current agentic graph practice expects.

The recommended direction is not “make AIWG a graph runtime,” and it is also not “invent a parallel topology DSL.” The recommended direction is to establish a graph domain/profile on top of the existing Flow metalanguage. Graph should be one optional composition pattern over the same primitives AIWG already owns: FlowCapabilities, FlowPlaybooks, gates, fanout, capability routing, state, audit, checkpoints, HITL, cost, sandbox dispatch, and provider-native execution.

The most important gaps are:

1. No graph-domain extension/profile for `FlowPlaybook` with graph-specific state, route contracts, conditional edges, cycles, reducers, graph-run identity, and runtime bindings.
2. No static validator/linter for executable graph constraints: reachability, cycles, termination guards, fan-in reducers, node-local capability scope, HITL boundaries, retry policy, idempotency, and budget guards.
3. No graph-run data model: stable `graph_id`, `graph_version`, `run_id`, `node_id`, `node_run_id`, `edge_id`, and trace correlation across Mission, A2A, Sandbox, Cockpit, audit, and telemetry.
4. No graph-aware adapter contract that maps Flow steps and graph-profile nodes to Ralph loops, RLM task trees, Codex `/goal`, Claude workflow workers, A2A tasks, sandbox executors, or durable-code implementations.
5. No Cockpit graph/operator view for live graph runs, node states, approvals, retries, fan-out/fan-in, budgets, and evidence.
6. No graph-specific conformance/eval harness that tests routing, recovery, replay, HITL, cost, and observability without relying on “diagram looks plausible” validation.
7. No explicit decision guide for when to use plain loops, RLM, provider-native workflows, graph topology, Airflow-style DAGs, or durable-code orchestration.

## Best-practice baseline used for the audit

The current external and internal research baseline supports a pragmatic definition:

> Graph engineering for agentic runtimes is the design, implementation, and operation of explicit executable control topologies whose nodes may be deterministic code, LLM calls, tool calls, full agent loops, human checkpoints, or evaluators, and whose edges encode routing, dependency, authority, budget, recovery, and verification relationships.

This baseline comes from:

- LangGraph’s current docs and 2026 “graph engineering” retrospective: graphs are stateful agent workflows with state, nodes, edges, conditional transitions, memory, persistence, HITL, and durable execution concerns.
- AutoGen GraphFlow: directed graph execution between agents, including sequential, parallel, conditional, and looping behavior.
- Apache Airflow: mature DAG prior art for authored workflow artifacts, task dependencies, scheduling, retries, observability, metadata, and UI.
- Prefect’s directed-agentic-graph framing: graph as macro workflow control where individual nodes may contain agent loops.
- Temporal’s counterpoint: durable execution and code workflows matter because static diagrams break down when agent control is dynamic, compensation-heavy, or event-driven.
- Local research synthesis: `.aiwg/research/synthesis/graph-engineering-vs-loop-engineering-agentic-control-2026-08-17.md`.

Practical implications:

- Loops are not obsolete. A loop is often a node-local execution primitive.
- Graphs are justified when dependencies, routing, fan-out/fan-in, approvals, retries, audit, or multi-agent boundaries must be explicit.
- A graph is not just a visual diagram. It must be inspectable, versioned, executable or executable-adjacent, and traceable.
- Agent graphs are often not classic DAGs. They commonly need cycles, retries, conditional routes, dynamic fan-out, interrupts, and human pause/resume.
- Airflow is relevant as workflow-graph prior art, but AIWG needs a broader model because agentic graphs may be cyclic and model/tool calls are nondeterministic.
- Durable execution is a substrate concern. AIWG should not assume graph structure alone provides reliability.

## Current AIWG capability map

### 1. Deployment and customization substrate: strong

AIWG’s extension model already supports optional patterns well. Project-local bundles are deployed from `.aiwg/{extensions,addons,frameworks}/<name>/` and are byte-identical to upstream bundle shape, which is exactly the kind of mechanism a graph-pattern addon should use rather than hard-wiring graph into core. See [docs/project-local/overview.md](../project-local/overview.md), [src/extensions/types.ts](../../src/extensions/types.ts), and [src/extensions/manifest.ts](../../src/extensions/manifest.ts).

This is a strength. A graph pattern can be delivered as an addon/framework with schemas, templates, validators, docs, Cockpit contributions, and skills. It does not need to become the default AIWG workflow ontology.

### 2. Flow/Workflow YAML metalanguage: strong composition substrate

AIWG already has the core abstraction that this report originally implied was absent. The Flow metalanguage in [agentic/code/addons/aiwg-utils/workflow/README.md](../../agentic/code/addons/aiwg-utils/workflow/README.md) is a declarative YAML spec for composing automation work. It is universal in `aiwg-utils`, not tied to ops-complete. It recognizes `flow.aiwg.io/v1` and the compatibility spelling `workflow.aiwg.io/v1`; `Flow*` kinds are the forward names and `Workflow*` kinds remain valid.

Key existing pieces:

- `FlowCapability` / `WorkflowCapability`: reusable named verb with inputs, outputs, executor agent, idempotency, target requirements, verification, and rollback capability; see [workflow-capability.schema.json](../../agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json).
- `FlowPlaybook` / `WorkflowPlaybook`: a DAG of capability invocations with `depends_on`, input bindings, output references, retry, inline gates, and fanout; see [workflow-playbook.schema.json](../../agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json).
- `FlowGate` / `WorkflowGate`: first-class human approval or quality checkpoint; see [workflow-gate.schema.json](../../agentic/code/addons/aiwg-utils/workflow/schemas/workflow-gate.schema.json).
- `FlowExtension` / `WorkflowExtension`: domain-specific namespace and capability library registration.
- executor contract: resolve capabilities, plan the step DAG, reject cycles, bind variables and `from:` references, execute, gate, retry, audit to `.aiwg/workflow/runs/<run-id>/audit.jsonl`, and emit a report.

This is materially close to Airflow-style workflow graph practice already. The Flow docs explicitly define playbooks as DAGs, allow fanout panels, include gates, and describe per-run frozen artifacts, audit, outputs, gate responses, and reports.

The graph-pattern gap should therefore be reframed as a supplementation problem:

- add a `graph.flow.aiwg.io/v1` domain/profile, not a separate unrelated DSL;
- reuse `FlowCapability` as the node/capability contract;
- reuse `FlowPlaybook.steps[*].depends_on` as the DAG subset;
- extend with conditional route predicates, cycles with guards, reducers, richer state schemas, graph/run/node identity, and A2A/Sandbox/Cockpit projection;
- keep existing FlowPlaybooks valid and graph-optional.

### 3. Ops YAML metalanguage origin: strong domain precedent

Ops was the first domain to prove this model. [agentic/code/frameworks/ops-complete/README.md](../../agentic/code/frameworks/ops-complete/README.md) describes ops-complete as built natively on a Kubernetes-inspired YAML metalanguage, with `OpsInventory`, `OpsCapability`, `OpsPlaybook`, `OpsGate`, `OpsTarget`, `OpsSchedule`, `OpsPipeline`, and `OpsExtension`. [agentic/code/addons/aiwg-utils/workflow/docs/migration-from-ops.md](../../agentic/code/addons/aiwg-utils/workflow/docs/migration-from-ops.md) states that the workflow metalanguage is the lifted form of `ops.aiwg.io/v1`; existing ops documents continue to work via apiVersion aliasing.

This matters for graph support because ops already demonstrates the pattern AIWG should repeat: create a domain vocabulary over the shared metalanguage, not a bespoke runtime per domain.

Graph should follow the same move:

- domain namespace: `graph.flow.aiwg.io/v1` or equivalent forward spelling, with compatibility alias if needed;
- kinds/profile: `GraphPlaybook` as a constrained/enriched `FlowPlaybook`, or `FlowPlaybook` with `metadata.labels.pattern=graph`;
- domain schemas: graph state, conditional edges, reducers, route contracts, loop/cycle guards, graph observability metadata;
- executor behavior: still the shared Flow executor plus graph-profile validation/planning.

### 4. Optional feature installer: useful but currently misleading for this use case

AIWG already has an optional `graph` feature in [src/features/catalog.ts](../../src/features/catalog.ts). It installs Graphology packages and enables richer artifact traversal.

That feature is correctly named for artifact graph backends, but it is not a graph control/runtime feature. If AIWG adds graph-oriented execution topology, the name collision should be handled deliberately:

- keep `aiwg features install graph` as artifact-graph backend support; or
- rename/describe it more narrowly as `artifact-graph`; and
- introduce a separate optional `flow-graph-pattern` or `graph-flow` addon for graph-style execution composition.

Do not overload the existing Graphology feature to mean agentic graph orchestration.

### 5. Artifact/source/citation graph support: strong but not execution control

The graph backend abstraction in [src/artifacts/graph-backend.ts](../../src/artifacts/graph-backend.ts) supports nodes, directed edges, traversal, set operations, serialization, and optional `json`, `graphology`, and `sqlite` backends. This is a solid graph data structure layer.

Gap: it is not a control-flow abstraction. It has no node execution semantics, route predicates, state schema, reducers, retries, HITL boundaries, budget policy, idempotency, or run ledger.

Recommended reuse: the interface and optional backend pattern are good implementation references for a future topology store or topology visualization export. They should not be reused directly as the execution graph API without adding control semantics.

### 6. Ralph / agent-loop: strong loop primitive

The agent-loop addon defines Ralph as an iterative Execute → Verify → Learn → Iterate loop with completion criteria, max-iteration limits, state under `.aiwg/ralph/`, resume, and crash-recovery for external Al. See [agentic/code/addons/agent-loop/README.md](../../agentic/code/addons/agent-loop/README.md).

This maps cleanly to a graph node type:

- node kind: `loop`
- state: loop state/checkpoints
- termination: completion criteria or limits reached
- emissions: iteration events, gate events, final report

Correction: loops can already be referenced through FlowCapabilities and FlowPlaybooks, and `flow-agentloop-lfd-controls.playbook.yaml` shows agent-loop control work expressed as a declarative Flow. The remaining gap is graph-specific composition: loop nodes need graph-run identity, cycle guards, route contracts, and graph-level budget propagation.

### 7. RLM: strong task-tree and fan-out primitive

The RLM addon explicitly supports recursive decomposition, parallel fan-out, task trees, model tiering, quality gates, chunking strategies, and cost awareness. See [agentic/code/addons/rlm/README.md](../../agentic/code/addons/rlm/README.md).

This is the closest existing AIWG capability to graph engineering. It already talks about `node_id`, task trees, roles, model tiers, fan-out, aggregation, quality gates, and antipatterns like parallel-then-synthesize.

Correction: FlowPlaybooks now also contain a `fanout` step form, so fan-out is not limited to RLM. The remaining RLM gap is that RLM’s internal task tree is not fully projected into the Flow run ledger or a graph-profile view that Mission Control, A2A, Cockpit, and sandbox dispatch can inspect consistently.

Recommended reuse: RLM should become the first adapter target for any topology layer. A graph pattern can initially support RLM by projecting RLM task trees into a topology view without changing RLM’s internals.

### 8. Mission conductor and stack adapters: good orchestration ownership invariant

The mission conductor in [src/serve/mission-conductor.ts](../../src/serve/mission-conductor.ts) is important. It states that the conductor owns activity log, best-output selection, cost tracking, checkpoint/resume, durability, and provenance regardless of which stack runs the worker. [src/serve/stack-adapters.ts](../../src/serve/stack-adapters.ts) keeps stack-specific execution behind `runtime:<name>` adapters.

This is the right pattern-neutral foundation.

Gap: `MissionPlan` is a list of worker cycles, not a graph. `WorkerCycle` has `id`, `runtime`, `prompt`, capabilities, and `longRunning`, but no explicit Flow step binding, typed state, edge semantics, conditional routes, joins, reducers, retry policy, HITL node semantics, or graph-level validation.

Recommended direction: integrate MissionConductor with FlowPlaybook/graph-profile planning rather than inventing a separate topology planner. The conductor can remain the owner of ledger/durability/provenance while a Flow/graph planner decides what step/node is runnable next.

### 9. ExternalJobFlow: strong single-job contract, not graph

[src/jobs/types.ts](../../src/jobs/types.ts), [src/jobs/flow.ts](../../src/jobs/flow.ts), and [src/jobs/runner.ts](../../src/jobs/runner.ts) define and run a strict external job contract. The contract includes security constraints, allowed origins/accounts, approved attachment roots, completion evidence, issue claiming, idempotency keys, recovery files, locks, and verification.

This is valuable because graph execution needs exactly these safety habits.

Gap: `ExternalJobFlow` is single executor + single work item. It has no graph-level topology, node lifecycle, multi-node idempotency, fan-out/fan-in, or conditional routing. It is best treated as a single-node controlled-job adapter.

Recommended reuse: make `ExternalJobFlow` projectable as:

```yaml
node:
  kind: external-job
  runtime: codex-exec
  idempotency: existing-job-key
  evidence: external-result-url + issue-comment + verification
```

### 10. A2A + Agentic Sandbox dispatch: strong runtime substrate

[src/a2a/types.ts](../../src/a2a/types.ts) models A2A task lifecycle states and idempotent messages. [src/serve/dispatch-router.ts](../../src/serve/dispatch-router.ts) maps AIWG mission dispatch into A2A `messages:send`, with v1 fallback. [src/serve/a2a-terminal-observer.ts](../../src/serve/a2a-terminal-observer.ts) follows A2A tasks to terminal state and projects them into AIWG mission state.

The sandbox integration documented in [docs/serve-guide.md](../serve-guide.md) provides executor capabilities such as VM/container isolation, runtime capabilities, resumability, and HITL. Cockpit’s architecture places a token-gated Bridge in front of the agentic-sandbox executor, with A2A and PTY transport surfaces; see [docs/cockpit/architecture.md](../cockpit/architecture.md).

Gap: A2A messages and Mission records do not currently carry graph-level identifiers and node-level lifecycle. The terminal observer projects one task into one mission state; it does not project a graph node into a graph run. Current known sandbox gaps also matter for graph execution: exit codes are not fully plumbed, `MissionStore` is in-memory, and resumability events exist but are not emitted; see [docs/serve-guide.md](../serve-guide.md#known-gaps-as-of-sandbox-effdb43).

Recommended direction: add topology metadata as an AIWG-owned extension namespace, not as a required A2A core change:

```json
{
  "metadata": {
    "https://aiwg.io/extensions/flow-graph/v1": {
      "graph_id": "research-synthesis",
      "graph_version": "2026.08.21",
      "run_id": "run_...",
      "node_id": "evidence_review",
      "node_run_id": "nr_...",
      "edge_id": "route_after_screening"
    }
  }
}
```

### 11. HITL: strong primitive, needs topology semantics

[src/a2a/hitl.ts](../../src/a2a/hitl.ts), [src/a2a/hitl-driver.ts](../../src/a2a/hitl-driver.ts), and [docs/contracts/hitl-approval-workflow.v1.md](../contracts/hitl-approval-workflow.v1.md) define a strong HITL workflow: prompt envelope validation, responder policy, schema validation, deadlines, retries, audit, and Mission/Flow transitions.

This is already aligned with graph best practices, where human gates and interrupts must be explicit.

Gap: HITL prompts are correlated to task/context/prompt IDs, but not to graph/node/edge IDs. There is no graph-level declaration that a node is an approval node, that an edge requires approval, that a denied approval routes to a specific recovery path, or that a timeout has a topology-defined fallback.

Recommended direction: promote HITL to a topology node/edge capability:

- `node.kind: hitl-approval`
- `allowed_responders`
- `deadline`
- `response_schema`
- route outcomes: `approved`, `denied`, `expired`, `conflict`
- audit correlation: mission + flow + graph + node + prompt + task

### 12. Audit and telemetry: good foundation, missing topology dimensions

[docs/contracts/operator-decision-audit.v1.md](../contracts/operator-decision-audit.v1.md) already requires Mission, Flow, provider, sandbox task/session, issue, PR, HITL prompt, and distributed trace correlation. [src/serve/telemetry.ts](../../src/serve/telemetry.ts) tracks session, mission, iteration, gate, tokens, agent, fallback, and webhook events.

Gap: neither has first-class graph, graph version, graph run, node run, edge, route decision, reducer, checkpoint, or replay fields. Without those fields, graph execution would be hard to debug and impossible to audit at the level graph engineering requires.

Recommended direction: add topology dimensions to both event and audit schemas before building a graph UI:

- `topology.kind`: `loop | graph | task-tree | durable-code | provider-native`
- `topology.id`
- `topology.version`
- `run.id`
- `node.id`
- `node.run_id`
- `edge.id`
- `route.reason`
- `checkpoint.id`
- `replay.parent_run_id`

### 13. Cockpit: good operator shell, missing graph run surface

Cockpit already has surfaces for Home, Inventory, Running, Missions, Sessions, Approvals, Explore, Telemetry, Memory, and Actions. It displays topology in the UI sense, running work, approvals, artifact-index graph cards, and mission status. See [docs/cockpit/surfaces.md](../cockpit/surfaces.md).

Gap: Cockpit does not have an execution graph surface showing:

- graph definition and version;
- current runnable node set;
- node state: pending/running/blocked/succeeded/failed/skipped/retrying;
- active edge transitions and route predicates;
- loop nodes expanded into iterations;
- fan-out branches and join reducers;
- HITL approval nodes;
- budget/cost per node and per route;
- evidence and artifacts per node;
- replay/resume/checkpoint lineage.

Recommended direction: start with read-only projection. Do not initially build a visual graph editor. A static run viewer is higher value and lower risk than drag-and-drop orchestration.

### 14. Orchestration Topology Lab: useful eval seed, not production routing

The experimental `orchestration-topology-lab` addon compares single-agent, bounded-parallel, and planner-worker topologies from trusted evaluation observations. It explicitly does not route production work and does not recommend fan-out from agent count alone. See [agentic/code/addons/orchestration-topology-lab/README.md](../../agentic/code/addons/orchestration-topology-lab/README.md) and [agentic/code/addons/orchestration-topology-lab/manifest.json](../../agentic/code/addons/orchestration-topology-lab/manifest.json).

This is a strong seed for graph-pattern evaluation because it already treats topology choice as evidence-based rather than fashionable.

Gap: it compares coarse orchestration shapes. It does not validate executable graph specs, replay graph runs, test edge predicates, measure reducer correctness, or check policy coverage.

Recommended direction: evolve it into `topology-lab` conformance suites for graph specs:

- static validity;
- no orphan nodes;
- required start/end/failure nodes;
- cycle guard present;
- retry/backoff present where external calls exist;
- reducers defined for fan-in;
- HITL prompt paths tested;
- node-local capability scope enforced;
- replay from checkpoint tested;
- trace/audit/event shape complete.

## Gap matrix

| Gap | Severity | Current evidence | Required capability |
|---|---:|---|---|
| No graph-domain Flow profile | Critical | Flow/Workflow YAML exists and supports DAG steps, gates, retries, fanout, audit, and run directories; no graph-specific profile exists | Versioned `graph.flow.aiwg.io` profile over Flow with nodes/edges/state/routes/policies/runtime bindings |
| Existing `graph` feature means artifact traversal, not control graph | High | `graph` feature installs Graphology for artifact traversal | Naming/packaging separation between artifact graph and control topology |
| No typed graph state/reducer contract | Critical | RLM has examples; LangGraph-like shared typed state absent from core | State schema, node output schema, reducer definitions for fan-in |
| No edge/route contract beyond Flow DAG dependencies | Critical | Flow `depends_on` covers static DAG ordering; graph route predicates/cycle routes are absent | Direct edges, conditional edges, route predicates, route evidence |
| No cycle/termination guard at graph level | High | Ralph has loop limits; topology layer absent | Cycle declarations with max iterations, convergence criteria, timeout, fallback |
| Fan-out exists but lacks graph-profile reducer semantics | High | FlowPlaybook has `fanout`; RLM supports fan-out locally | General parallel branch and join/reducer semantics projected into Flow/graph runs |
| No graph-run identity in telemetry/audit/A2A | High | Existing IDs are mission/task/session/prompt-oriented | `graph_id`, `run_id`, `node_id`, `node_run_id`, `edge_id`, trace correlation |
| No topology-aware HITL | Medium-high | HITL is task/prompt oriented | Approval nodes, denial/expiry routes, graph audit correlation |
| No graph-aware Cockpit view | Medium-high | Cockpit has Missions, Running, Approvals, Explore | Read-only graph run timeline/topology/state/cost/evidence view |
| No graph execution adapter contract | High | Stack adapters map runtime primitives; conductor runs cycles | Adapter interface for loop, RLM, external job, A2A task, durable code |
| No durability semantics at topology level | Critical | Some pieces persist; sandbox docs note in-memory MissionStore gap | Topology checkpoints, resume/replay, idempotent node runs, durable run ledger |
| No graph-specific security/threat model | Medium-high | Strong general sandbox/HITL/audit posture | Node-local authority, tool scope, data boundary, prompt-injection propagation controls |
| No composition path from existing Flow/skills/commands into graph domain | Medium | Project-local bundles and FlowPlaybooks exist | Templates and adapters that wrap existing FlowCapabilities, FlowPlaybooks, skills, and commands as graph nodes/subgraphs |
| No “when not to graph” guidance | High | RLM and Ralph have local use guidance | Decision guide: loop vs RLM vs graph vs durable code vs Airflow-style DAG |
| No conformance/eval harness for graph patterns | High | topology-lab is descriptive/eval seed | Static + dynamic tests for topology correctness, replay, failure, cost, HITL |

## Recommended architecture: Graph Flow domain/profile, not graph-first core

Introduce a graph domain/profile over the existing Flow metalanguage:

```yaml
apiVersion: graph.flow.aiwg.io/v1
kind: GraphPlaybook
metadata:
  id: research-synthesis
  version: 2026.08.21
spec:
  extends:
    apiVersion: flow.aiwg.io/v1
    kind: FlowPlaybook
  state:
    schema: ./schemas/research-state.schema.json
    checkpoint: required
  nodes:
    - id: screen
      kind: deterministic-tool
      runtime: local
      input: { from: state.query }
      output_schema: ./schemas/screen-output.schema.json
      policy:
        budget: { max_tokens: 20000, max_seconds: 600 }
        tools: [rg, read]
    - id: investigate
      kind: rlm-fanout
      runtime: rlm
      reducer: merge-evidence
    - id: approve_publish
      kind: hitl-approval
      response_schema: ./schemas/approval.schema.json
  edges:
    - id: screen_to_investigate
      from: screen
      to: investigate
      when: state.screen.relevant_count > 0
    - id: investigate_to_approve
      from: investigate
      to: approve_publish
    - id: approve_to_done
      from: approve_publish
      to: done
      when: response.decision == "approved"
    - id: approve_to_rework
      from: approve_publish
      to: investigate
      when: response.decision == "revise"
      guard: { max_cycles: 2 }
```

This should be a schema/profile and validation layer first, not a new runtime first. AIWG should continue to support multiple execution patterns:

- `loop`: single recurrent agent loop, projected from Ralph/Codex `/goal`;
- `task-tree`: recursive decomposition/fan-out, projected from RLM;
- `graph`: explicit nodes and edges with conditional routes, expressed as a Flow domain/profile;
- `dag`: Airflow-style acyclic pipeline subset, already mostly covered by FlowPlaybook `depends_on`;
- `durable-code`: code owns control flow but emits topology/run metadata;
- `provider-native`: Claude Workflow, Codex `/goal`, or other native controls represented by adapter metadata.

This gives AIWG graph support while keeping graph replaceable. The shared neutral layer should be run metadata, audit dimensions, and adapter interfaces; the authored control artifact should remain Flow-compatible.

## Phased implementation plan

### Phase 0 — ADR and vocabulary

Deliverables:

- ADR: “Graph is a Flow domain/profile; Flow remains the pattern-neutral composition substrate.”
- Rename or clarify `graph` optional feature docs as artifact-graph support.
- Decision guide: when to use loop, RLM, graph, DAG, provider-native, or durable-code.
- Compatibility rule: graph pattern must not require a specific vendor runtime.

Acceptance criteria:

- No core documentation implies graph is the default architecture.
- “Graph” and “artifact graph” are unambiguous.
- Existing Ralph/RLM/Mission/Sandbox behavior remains unchanged.

### Phase 1 — Schema-only graph Flow profile

Deliverables:

- `graph.flow.aiwg.io/v1` profile schema for Flow-compatible graph playbooks.
- TypeScript types under a graph/flow domain module.
- JSON Schema/Zod validation that starts with FlowPlaybook validation and layers graph constraints.
- Examples under `docs/examples/flow/graph/` or a graph-pattern addon.
- Project-local scaffold template for `.aiwg/workflow/graph/<id>/` or equivalent Flow-owned path.

Validation rules:

- unique node/edge IDs;
- start node exists;
- terminal/failure behavior declared;
- no orphan nodes unless explicitly disabled;
- conditional edges have route names/reasons;
- cycles require termination guards;
- fan-in requires reducer;
- external-effect nodes require idempotency policy;
- HITL nodes require responder/deadline policy;
- each node declares runtime binding and capability/tool scope;
- graph version and state schema are explicit.

### Phase 2 — Adapter projection, no new execution engine

Deliverables:

- Ralph adapter: project a loop as a topology node/run.
- RLM adapter: project task tree nodes and events into topology run records.
- ExternalJobFlow adapter: project existing external jobs as single controlled nodes.
- A2A/Sandbox adapter: inject topology metadata into message metadata and mission/audit events.
- MissionConductor adapter: consume Flow/graph-profile planner output as worker cycles.

Acceptance criteria:

- Existing execution paths can emit topology run records without being rewritten.
- Topology metadata appears in telemetry and audit records.
- A single graph run can contain a Ralph node, an RLM fan-out node, an A2A sandbox node, and a HITL node.

### Phase 3 — Flow/graph run ledger and checkpoints

Deliverables:

- Durable run ledger under `.aiwg/workflow/runs/` with graph-profile dimensions, or a storage subsystem that preserves Flow run compatibility.
- Node-run state transitions: `pending`, `runnable`, `running`, `blocked`, `succeeded`, `failed`, `skipped`, `retrying`, `cancelled`.
- Checkpoint records: state snapshot digest, artifact refs, parent checkpoint, replay metadata.
- Idempotency keys per node run.
- Resume/replay command.

Acceptance criteria:

- Process restart can resume a graph run from durable state.
- Replaying a completed deterministic node reuses evidence unless explicitly invalidated.
- Operator can inspect why a node is blocked.

### Phase 4 — Cockpit read-only graph/Flow run view

Deliverables:

- Cockpit “Flow/Graph Runs” view or Missions subview.
- Node list/table first; visual graph second.
- Node state, route decisions, HITL prompts, cost, evidence, logs, and artifacts.
- Filters by graph/run/node/mission/task/prompt.

Acceptance criteria:

- Operator can answer: what is running, why, under which route, with which budget, and what evidence exists?
- UI works without graph editing.
- Existing Cockpit surfaces remain usable if topology metadata is absent.

### Phase 5 — Conformance and evals

Deliverables:

- `aiwg flow graph validate` or `aiwg graph validate`
- `aiwg flow graph dry-run` or `aiwg graph dry-run`
- `aiwg flow graph replay --from-checkpoint` or `aiwg graph replay --from-checkpoint`
- topology-lab graph conformance fixtures
- failure injection tests: node failure, edge predicate failure, HITL expiry, retry exhaustion, sandbox disconnect, duplicate idempotency key

Acceptance criteria:

- A graph-profile FlowPlaybook can fail validation before runtime.
- A graph-profile run can be audited after runtime.
- A graph pattern can be compared against loop/RLM/provider-native alternatives using evidence, not preference.

## Specific gaps in the AIWG / Agentic Sandbox / AOS ecosystem

### AIWG core

Needs:

- graph Flow profile schema;
- graph-profile validator layered on existing Flow validation;
- graph-profile run ledger fields in the Flow run ledger;
- telemetry/audit dimensions;
- adapter interfaces;
- docs and decision guide;
- project-local graph-pattern bundle scaffold.

Should avoid:

- replacing Ralph/RLM/Mission with a graph runtime;
- binding to LangGraph, AutoGen, Airflow, or Temporal;
- treating graph diagrams as authoritative evidence;
- making graph a required provider capability.

### Agentic Sandbox

Needs:

- reliable exit-code propagation;
- durable mission/task ownership sufficient for graph-node resume;
- resumability events actually emitted;
- A2A metadata pass-through for Flow/graph IDs;
- node-level sandbox runtime evidence;
- cancellation/timeout behavior that can map to graph node states;
- checkpoint/restore hooks that can be referenced from the Flow/graph run ledger.

AIWG can start by adding metadata and projections on its side, but production graph execution will remain fragile until sandbox exit codes, durable mission ownership, and resumability are solid.

### AOS / operator ecosystem

Assumption: AOS here refers to the broader agentic operating system/operator surface around AIWG, Cockpit, Agentic Sandbox, and provider-native runtimes.

Needs:

- shared Flow/graph vocabulary across CLI, Cockpit, sandbox, and providers;
- operator-visible graph run identity;
- approval inbox linked to graph-profile nodes;
- audit/export format with graph/run/node IDs;
- contribution/action model for injecting Flow/graph-aware commands;
- “safe default” policy templates for node tool scope, budget, model tier, and HITL.

## Design constraints to preserve AIWG’s broader mission

1. Graph must be optional. It should be delivered as a Flow domain/profile bundle and schema, not as the only execution model.
2. Flow must remain the pattern-neutral composition substrate. Put graph-specific terms in the graph Flow profile; use shared run metadata only where multiple patterns need the same IDs.
3. Existing primitives remain first-class. Ralph loops, RLM task trees, provider-native workflows, external jobs, and durable-code orchestration should all project into Flow/graph run metadata when used in graph mode, not be subordinated to graphs.
4. Runtime should remain adapter-based. AIWG should own IDs, policy, audit, and ledger; worker runtimes should own execution mechanism.
5. Visuals are downstream evidence, not source of truth. A graph view should render the Flow/graph run ledger, not become the only artifact.
6. Durable execution is separate from graph shape. A graph without checkpoints, idempotency, retry, and replay is not production-grade.
7. Airflow is prior art, not a template to copy blindly. AIWG should learn from DAG discipline while supporting cycles and dynamic agent behavior.
8. Avoid vendor lock-in. Official LangGraph and AutoGen docs are useful references, but AIWG should define its own minimal schema and adapters.

## Minimum viable graph-pattern capability

The smallest useful AIWG graph-pattern release should include:

- one profile schema: `graph.flow.aiwg.io/v1`;
- one CLI: `aiwg flow graph validate` or `aiwg graph validate`;
- one Flow-compatible run ledger extension;
- one read-only Cockpit run projection;
- adapters for:
  - Ralph loop as node;
  - RLM fan-out as node/subgraph;
  - A2A task as node;
  - HITL approval as node;
- at least three templates:
  - `loop-with-approval`;
  - `screen-fanout-synthesize`;
  - `sandbox-task-with-retry`;
- conformance fixtures covering success, failure, HITL denial, retry, and resume.

This avoids building a new full runtime while closing the actual gap: explicit, inspectable, versioned, auditable graph composition over AIWG’s existing Flow substrate.

## References

### Local AIWG code/docs

- [Project-local customization](../project-local/overview.md)
- [Extension type system](../../src/extensions/types.ts)
- [Bundle manifest schema](../../src/extensions/manifest.ts)
- [Flow/Workflow metalanguage README](../../agentic/code/addons/aiwg-utils/workflow/README.md)
- [Flow/Workflow overview](../../agentic/code/addons/aiwg-utils/workflow/docs/overview.md)
- [Flow migration from ops](../../agentic/code/addons/aiwg-utils/workflow/docs/migration-from-ops.md)
- [FlowPlaybook schema](../../agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json)
- [FlowCapability schema](../../agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json)
- [FlowGate schema](../../agentic/code/addons/aiwg-utils/workflow/schemas/workflow-gate.schema.json)
- [Flow playbook with gate example](../../agentic/code/addons/aiwg-utils/workflow/examples/playbook-with-gate.yaml)
- [SDLC release FlowPlaybook](../../agentic/code/frameworks/sdlc-complete/flows/flow-release.playbook.yaml)
- [Agent-loop Flow controls playbook](../../agentic/code/frameworks/sdlc-complete/flows/flow-agentloop-lfd-controls.playbook.yaml)
- [Ops complete README](../../agentic/code/frameworks/ops-complete/README.md)
- [Optional features catalog](../../src/features/catalog.ts)
- [Artifact graph backend](../../src/artifacts/graph-backend.ts)
- [RLM README](../../agentic/code/addons/rlm/README.md)
- [Agent Loop README](../../agentic/code/addons/agent-loop/README.md)
- [Mission conductor](../../src/serve/mission-conductor.ts)
- [Stack adapters](../../src/serve/stack-adapters.ts)
- [External job types](../../src/jobs/types.ts)
- [External job schema](../../src/jobs/flow.ts)
- [External job runner](../../src/jobs/runner.ts)
- [A2A protocol types](../../src/a2a/types.ts)
- [A2A dispatch router](../../src/serve/dispatch-router.ts)
- [A2A terminal observer](../../src/serve/a2a-terminal-observer.ts)
- [HITL transport helper](../../src/a2a/hitl.ts)
- [HITL driver](../../src/a2a/hitl-driver.ts)
- [HITL approval workflow contract](../contracts/hitl-approval-workflow.v1.md)
- [Operator decision audit contract](../contracts/operator-decision-audit.v1.md)
- [Serve guide / Agentic Sandbox integration](../serve-guide.md)
- [Cockpit architecture](../cockpit/architecture.md)
- [Cockpit surfaces](../cockpit/surfaces.md)
- [Orchestration Topology Lab README](../../agentic/code/addons/orchestration-topology-lab/README.md)
- [Orchestration Topology Lab manifest](../../agentic/code/addons/orchestration-topology-lab/manifest.json)

### Local research corpus

- [Graph Engineering vs Loop Engineering synthesis](../../../research/research-papers/.aiwg/research/synthesis/graph-engineering-vs-loop-engineering-agentic-control-2026-08-17.md)
- [REF-2220: LangChain/LangGraph graph engineering](../../../research/research-papers/documentation/references/REF-2220-runkle-chase-2026-graph-engineering-langgraph.md)
- [REF-2221: Loop Engineering](../../../research/research-papers/documentation/references/REF-2221-osmani-2026-loop-engineering.md)
- [REF-2228: Apache Airflow DAG workflow orchestration](../../../research/research-papers/documentation/references/REF-2228-apache-airflow-2026-dag-workflow-orchestration.md)
- [REF-2229: Prefect loops vs graphs](../../../research/research-papers/documentation/references/REF-2229-prefect-2026-loops-vs-graphs.md)
- [REF-2230: Microsoft AutoGen GraphFlow](../../../research/research-papers/documentation/references/REF-2230-microsoft-2026-autogen-graphflow.md)
- [REF-2231: Temporal fallacy of the graph](../../../research/research-papers/documentation/references/REF-2231-temporal-2025-fallacy-of-the-graph.md)
- [REF-2232: Temporal durable multi-agent systems](../../../research/research-papers/documentation/references/REF-2232-temporal-2026-durable-flexible-multi-agent-systems.md)

### Current external primary/current references checked on 2026-08-21

- LangGraph graph API: https://docs.langchain.com/oss/python/langgraph/graph-api
- LangGraph overview: https://docs.langchain.com/oss/python/langgraph/overview
- LangChain “3 Years of Graph Engineering with LangGraph”: https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph
- AutoGen GraphFlow docs: https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html
- Apache Airflow DAG docs: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
- Apache Airflow task docs: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/tasks.html
- Apache Airflow best practices: https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html
- Temporal durable execution: https://temporal.io/
- Temporal “fallacy of the graph”: https://temporal.io/blog/the-fallacy-of-the-graph-why-your-next-workflow-should-be-code-not-a-diagram
- Temporal dynamic AI agents: https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal
