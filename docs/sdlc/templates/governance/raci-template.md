# RACI Matrix

## Scope

Define tasks and roles. Use Responsible (R), Accountable (A), Consulted (C), Informed (I).

| Task | Exec Orchestrator | Security Architect | Privacy Officer | Reliability Engineer | PM | Dev | QA |
|------|-------------------|--------------------|-----------------|----------------------|----|-----|----|
| Vision and charter | A | I | I | I | R | C | C |
| Threat model | I | A | C | I | C | R | C |
| SLO/SLI | I | C | I | A | C | R | C |
| Iteration plan | A | C | C | C | R | C | C |
| Traceability update | A | I | I | I | R | R | R |
| Release go/no-go | A | C | C | C | R | C | C |

Notes:

- Exactly one Accountable per task
- Keep Responsible roles minimal
