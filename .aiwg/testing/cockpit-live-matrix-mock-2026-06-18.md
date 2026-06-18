# Cockpit Live UAT Report
- Issue: #1621
- Executor: http://127.0.0.1:8122
- Required: yes
- Matrix required: yes
- Workload provider: codex
- Result: pass
- Started: 2026-06-18T01:37:00.476Z
- Finished: 2026-06-18T01:37:18.642Z
- agentic-sandbox-conformance report: not provided
## Evidence
- PASS executor probe: reachable at http://127.0.0.1:8122
- PASS Bridge health: Bridge reported executor http://127.0.0.1:8122
- PASS inventory posture: 4 instance(s) with normalized posture fields
- PASS session metadata: 2 session(s) reported attach metadata
- PASS task projection: 3 running task(s) reported
- PASS matrix host: codex workload via direct/native; 97 output byte(s)
- PASS matrix container: codex workload via direct/native; 97 output byte(s)
- PASS matrix vm: codex workload via managed/zellij; 97 output byte(s)
