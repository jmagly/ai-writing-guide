# Choosing Graph, Flow, Loops, and Durable Workflows

Graph is one optional AIWG Flow profile. Choose it for explicit shared state,
conditional routing, guarded feedback, fan-in reducers, mixed runtime bindings,
or operator-visible checkpoint and route evidence. The source of truth remains
the Flow artifact and run ledger; a diagram is only a view.

| Pattern | Prefer it when | Avoid it when |
|---|---|---|
| Ralph loop | One worker improves one deliverable toward a local completion criterion | Several branches exchange typed state or need explicit joins |
| Plain Flow DAG | Dependencies are acyclic and routes are mostly unconditional | Feedback cycles or runtime route evidence are first-class |
| RLM task tree | The model should recursively decompose a large-context problem | Stable cross-runtime node and edge identity is required |
| Graph profile | Shared typed state, conditional routes, reducers, bounded cycles, and mixed adapters must be audited together | A short sequence or local loop already expresses the work |
| Durable code | Recovery semantics, long waits, transactions, and dynamic control are easier and safer in code | Portable declarative inspection is the primary requirement |
| Provider-native workflow | One provider owns execution and its native controls are sufficient | The workflow must move between providers or A2A/Sandbox runtimes |
| Airflow-style DAG | Deterministic batch tasks, schedules, and operational DAG discipline dominate | Model-driven cycles and HITL routes dominate |

## Do not use graph when

- a two- or three-step FlowPlaybook is already clear;
- a Ralph loop has one owner and one convergence criterion;
- recursive decomposition is local to an RLM node;
- the orchestration requires transactional or highly dynamic durable code;
- a provider-native workflow is intentionally provider-bound; or
- the only desired output is a visual diagram.

Graph shape does not prove reliability, quality, cost reduction, or better
answers. Those claims remain blocked until composition evaluation and graph
conformance evidence support them.

## Inherited model

The profile inherits the Flow contracts documented in
`agentic/code/addons/aiwg-utils/workflow/README.md` and
`agentic/code/addons/aiwg-utils/workflow/docs/overview.md`. The Ops framework's
domain-extension model remains the precedent: a domain adds vocabulary and
constraints without replacing the shared Flow substrate. The Composition
Engine supplies deterministic topology validation and execution projection;
MissionConductor remains the durable ledger and policy owner.
