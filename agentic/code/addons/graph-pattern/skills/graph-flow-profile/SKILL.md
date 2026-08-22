---
name: graph-flow-profile
namespace: aiwg
description: Author, validate, explain, dry-run, and inspect optional graph.flow.aiwg.io GraphPlaybooks over the AIWG Flow runtime substrate
triggers:
  - graph flow profile
  - author a GraphPlaybook
  - guarded graph workflow
  - inspect graph run routes
platforms: [all]
---

# Graph Flow Profile

Use this skill when a workflow requires conditional routes, guarded feedback,
explicit fan-in reduction, checkpoint/replay lineage, or a mixed-runtime graph
view. Keep ordinary DAGs, local loops, task trees, provider-native workflows,
and durable code in their native patterns when graph-wide state and routing do
not add operator value.

1. Start from a fixture in `agentic/code/addons/graph-pattern/fixtures/`.
2. Keep `apiVersion: graph.flow.aiwg.io/v1` and `kind: GraphPlaybook`.
3. Narrow each node's capabilities and permissions; never inherit authority
   from an upstream node.
4. Give cycles a finite guard, fan-in nodes an explicit join/reducer,
   side-effecting retries an idempotency key, and HITL nodes complete
   approve/deny/timeout routes.
5. Run `aiwg graph validate <file> --format json`, then
   `aiwg graph explain <file> --format json` before runtime dispatch.

The validator reuses the Composition Engine's Flow validation. A valid graph
profile is therefore a valid Flow projection; the graph profile is not a
standalone runtime.
