# Flow Graph Capability Release Gates

Public documentation may describe the optional alpha profile only. It must not
claim quality, latency, reliability, or cost improvement until every blocking
gate below is supported by current evidence.

| Gate | Blocking evidence | Current state |
|---|---|---|
| Architecture | #2127 ADR and decision guide | Implemented; final audit pending |
| Schema | #2128 profile validator and invalid fixtures | Implemented; full gate pending |
| Runtime identity | #2129 end-to-end metadata | AIWG core implemented; live Sandbox evidence pending |
| Runtime projection | #2130 mixed node dispatch and restart resume | Static/core path implemented; live qualification pending |
| Sandbox | sandbox #780–#784 and bridge #2 | External blocking dependency |
| Cockpit | #2131 read-only view and UI tests | Implemented; final audit pending |
| Security | #2135 threat/control/degraded-mode artifacts | Blocked pending explicit preflight authorization |
| Conformance | #2134 fast and full suites | 11-case fast suite and pinned CI job implemented; full Sandbox gate pending |
| Evaluation | #2118 defensible evidence | Synthetic-conformance only; no product claims allowed |
| Docs/templates/site | #2132 and #2125 | Addon, five templates, safe scaffold, and discovery implemented; public site remains #2125 |

Deferred external behavior is blocking for a public “complete graph runtime”
claim, not silently waived. The optional static profile may ship with these
limitations stated in release notes.
