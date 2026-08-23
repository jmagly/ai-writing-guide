# Flow Graph Capability Traceability Matrix

| Requirement | Architecture / docs | Implementation | Verification | Status / limitation |
|---|---|---|---|---|
| GRAPH-REQ-001 | graph ADR and decision guide | graph-pattern manifest | graph-pattern schema tests | Implemented; optional addon only |
| GRAPH-REQ-002 | graph-pattern README | graph schema and validator | graph-pattern invalid fixtures/tests | Implemented |
| GRAPH-REQ-003 | metadata namespace and Sandbox node wire contract | graph metadata, Mission, telemetry, observer, Cockpit | metadata/Mission/observer/Cockpit and wire-schema tests | AIWG path and cross-repo contract implemented; Sandbox pass-through remains external |
| GRAPH-REQ-004 | addon adapter guidance | graph runtime, MissionConductor, stack adapters | runtime and Mission tests | Core bindings represented; live external adapters qualification-gated |
| GRAPH-REQ-005 | ADR, profile README, and threat model | inherited Flow rules plus reducer/HITL/authority/replay checks | validator/runtime/security tests | Implemented; live adapter qualification remains external |
| GRAPH-REQ-006 | Cockpit surfaces doc | read-only bridge and Missions view | Cockpit web/bridge tests | Implemented; visual editor deferred |
| GRAPH-REQ-007 | test strategy, threat model, and release gates | dry-run/replay/conformance commands and pinned CI job | 11-case fast graph conformance plus security tests | Fast subset implemented; live Sandbox conformance external |
| GRAPH-REQ-008 | ADR, guide, release fragment | graph-pattern skill/README/scaffold and five templates | validation and discovery/docs gates | Templates validate; `graph flow profile` ranks the addon skill first |

## Issue-to-requirement map

| Issue | Requirements |
|---|---|
| #2127 | GRAPH-REQ-001, GRAPH-REQ-008 |
| #2128 | GRAPH-REQ-002, GRAPH-REQ-005 |
| #2129 | GRAPH-REQ-003 |
| #2130 | GRAPH-REQ-003, GRAPH-REQ-004, GRAPH-REQ-005 |
| #2131 | GRAPH-REQ-003, GRAPH-REQ-006 |
| #2132 | GRAPH-REQ-001, GRAPH-REQ-004, GRAPH-REQ-008 |
| #2133 | GRAPH-REQ-001–008 |
| #2134 | GRAPH-REQ-002, GRAPH-REQ-005, GRAPH-REQ-007 |
| #2135 | GRAPH-REQ-003–007 |
