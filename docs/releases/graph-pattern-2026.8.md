# Optional Flow Graph Profile

AIWG adds an optional `graph-pattern` addon with the
`graph.flow.aiwg.io/v1` `GraphPlaybook` contract. It projects onto the existing
Flow composition substrate and does not change the default runtime or replace
Ralph, RLM, provider-native workflows, A2A/Sandbox, or durable code.

Install with `aiwg use graph-pattern`. The addon includes five validated
templates, a non-overwriting project-local scaffold command, deterministic
validate/explain/dry-run/replay commands, and an 11-case fast conformance gate.
Existing `aiwg features install graph` remains artifact-index traversal only.

This release makes no claim that graph orchestration improves answer quality,
latency, or cost. Public capability claims remain gated on the traceability,
conformance, Sandbox, Cockpit, and evaluation evidence tracked by #2133 and
#2134. Static site deployment remains tracked by #2125.
