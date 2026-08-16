---
namespace: aiwg
name: topology-lab
platforms: [all]
description: Compare orchestration topologies on one task family using integrity-gated observations and coordination metrics
---

# Orchestration Topology Lab

Use this skill when deciding whether a task should remain single-agent or use a
bounded topology. Never select a topology from agent count alone.

1. Hold the task family, scoring contract, and integrity state constant.
2. Record observations for `single-agent`, `bounded-parallel`, and
   `planner-worker`.
3. Run `aiwg topology-lab run <fixture.json>`.
4. Review quality, coordination overhead, contradiction rate, synthesis
   failure, delegation precision, cost, and activity-evidence quality.
5. Treat missing activity evidence as `NOT RUN`, never as a zero or a pass.

The result is an experimental recommendation. Production routing remains out of
scope until repeated trusted evaluations justify policy.

@implements #2042
