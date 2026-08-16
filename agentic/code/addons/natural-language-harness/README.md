# Natural-Language Harness Runtime

NLAH documents keep policy readable while mapping every executable `MUST`
clause to a deterministic mechanism. Prose is never executed directly.

```bash
aiwg use natural-language-harness
aiwg harness validate path/to/NLAH.md
aiwg harness plan path/to/NLAH.md
aiwg harness ablate path/to/NLAH.md --remove verifier
```

An NLAH document must contain Stages, Roles, State Rules, Verification Rules,
Evidence Contract, Stopping Conditions, and Execution Map sections. Executable
clauses use `- MUST [clause-id]: ...`; every ID must appear exactly once in the
JSON execution map between the managed markers. Mappings may target only a
validator, script, agent, flow, or explicit manual gate.

`plan` emits mappings without executing them. `ablate` removes one named module
and reports the removed clauses and coverage delta, enabling controlled
comparisons. Ambiguous `SHOULD`/`MAY` prose is reported but never executed.
The research-evaluation fixture also names its current-flow reference and records
which semantics are preserved, newly explicit, or intentionally plan-only.
