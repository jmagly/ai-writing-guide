# Flow Graph Capability Requirements

Parent: #2126. These identifiers are normative for the optional graph profile.

| ID | Requirement | Primary issues |
|---|---|---|
| GRAPH-REQ-001 | AIWG supports a graph Flow domain/profile without replacing Flow or other patterns. | #2127, #2132 |
| GRAPH-REQ-002 | Graph-profile specs validate statically before execution. | #2128, #2134 |
| GRAPH-REQ-003 | Graph runs have stable graph/run/node/edge identity across audit, telemetry, A2A, Sandbox, and Cockpit. | #2129, #2131, #2135 |
| GRAPH-REQ-004 | Nodes can wrap FlowCapability, FlowPlaybook, Ralph, RLM, external jobs, HITL, A2A/Sandbox, provider-native workers, and durable code. | #2130, #2132, #2135 |
| GRAPH-REQ-005 | Cycles have guards, fan-in has reducers, and side effects have idempotency policy. | #2128, #2130, #2134, #2135 |
| GRAPH-REQ-006 | Operators inspect graph/Flow state and evidence without a visual editor. | #2131, #2135 |
| GRAPH-REQ-007 | Conformance covers validation, execution, failure, replay, HITL, budgets, metadata, and Sandbox disconnects. | #2133, #2134, #2135 |
| GRAPH-REQ-008 | Guidance explains when not to use graph and compares the first-class alternatives. | #2127, #2132 |

Graph remains optional. External Sandbox terminal/evidence/resume completion is
owned by `roctinam/agentic-sandbox#780`–`#784`, the bridge by
`roctinam/agentic-sandbox-aiwg#2`, and cross-runtime conformance by
`roctinam/agentic-sandbox-conformance#4`.
