# Flow Graph Pattern

`graph-pattern` is an optional domain profile over AIWG Flow. It adds the
`graph.flow.aiwg.io/v1` `GraphPlaybook` authoring contract, then projects valid
documents into the existing `flow.aiwg.io/v1alpha1` `FlowGraph` composition
engine. It does not add a second scheduler or make graph orchestration AIWG's
default.

```bash
aiwg use graph-pattern
aiwg graph validate .aiwg/workflow/graph/my-graph/graph.yaml
aiwg graph explain .aiwg/workflow/graph/my-graph/graph.yaml
aiwg graph scaffold my-graph --template screen-fanout-synthesize
aiwg graph conformance
```

`scaffold` writes a project-local graph and state schema under
`.aiwg/workflow/graph/<graph-id>/`. It refuses to overwrite an existing path.
The three bundled fixtures are runnable templates: approval/rework demonstrates
HITL plus guarded feedback, screen/fan-out demonstrates FlowCapability + RLM +
deterministic synthesis, and sandbox/retry demonstrates an idempotent A2A
Sandbox node with retry and fallback. Nodes may also bind to FlowPlaybook,
Ralph, provider-native jobs, external jobs, or durable code; bindings describe
the adapter boundary and do not bypass Flow permissions or ceilings.

The profile adds stable graph/version/node/edge identities, runtime-binding
hints, named routes and evidence pointers, fail-closed route behavior,
checkpoint policy, bounded cycles, explicit fan-in reducers, and complete HITL
routes. Validation first projects the artifact into the shared Flow contract,
so Flow candidate, topology, binding, capability, permission, retry,
idempotency, ceiling, output, and trace rules remain authoritative.

Use the generic `composition-engine` when a typed provider-neutral Flow graph
is sufficient. Use `graph-pattern` when operators need stateful conditional
routes, guarded feedback, graph-run identity, checkpoint/replay lineage, or a
mixed-runtime graph view.

The existing optional feature named `graph` installs Graphology for artifact
index traversal. It is unrelated to Flow execution. Install this addon—not the
`graph` npm feature—for graph-pattern orchestration.

See [the decision guide](docs/decision-guide.md) and the repository
[architecture decision](../../../docs/architecture/adr-graph-as-flow-profile.md).
