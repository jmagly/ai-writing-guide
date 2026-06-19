# Cockpit Live UAT Report
- Issue: #1617
- Executor: http://127.0.0.1:18232
- Required: yes
- Matrix required: no
- Workload provider: not specified
- Discovery expectation: issue-audit
- Result: pass
- Started: 2026-06-19T16:39:02.940Z
- Finished: 2026-06-19T16:39:03.765Z
- agentic-sandbox-conformance report: not provided
- Executor identity: {"version_hint":"agentic-sandbox-4cb1c90"}
## Evidence
- PASS executor probe: reachable at http://127.0.0.1:18232
- PASS executor identity: {"version_hint":"agentic-sandbox-4cb1c90"}
- PASS Bridge health: Bridge reported executor http://127.0.0.1:18232
- PASS inventory posture: 1 instance(s) with normalized posture fields
- PASS session metadata: 1 session(s) reported attach metadata
- SKIP task projection: running endpoint returned 502
- SKIP target matrix: AIWG_COCKPIT_LIVE_MATRIX_REQUIRED not set
