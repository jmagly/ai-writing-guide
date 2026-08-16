# Orchestration Topology Lab

This experimental addon compares orchestration shapes from recorded, trusted
evaluation observations. It does not route production work and never recommends
fan-out from agent count alone.

```bash
aiwg use orchestration-topology-lab
aiwg topology-lab run agentic/code/addons/orchestration-topology-lab/fixtures/research-synthesis.json
```

Every fixture represents one task family evaluated under `single-agent`,
`bounded-parallel`, and `planner-worker`. Reports include coordination overhead,
contradiction and synthesis-failure rates, delegation precision when measurable,
budget conservation, accepted/rejected outcome profiles, cost, quality, and
activity-evidence status. Missing evidence is emitted as `NOT RUN` with a reason.

The included fixtures cover both research synthesis and code review. Outcome
profiles are deliberately descriptive; they do not enable automatic routing.

The addon depends on the integrity and provenance controls delivered by #2037
and #2039. Its recommendations are local experimental evidence, not automatic
fleet or production routing policy.
