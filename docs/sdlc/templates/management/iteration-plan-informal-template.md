# Informal Iteration Plan Template

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: System Analyst, Implementer, Test Architect
- Automation Inputs: Iteration goals, milestone dates
- Automation Outputs: `iteration-<id>-plan-informal.md` with milestone table

## 1 Key Milestones

> Provide a lightweight timeline of the iteration, including start/stop dates, demos, testing start, beta drops, or stakeholder reviews.

| Milestone | Date |
| --- | --- |
| Iteration Start | `<dd/mmm/yy>` |
| Iteration Stop | `<dd/mmm/yy>` |
| `<Milestone>` | `<dd/mmm/yy>` |

## 2 Iteration Objectives

> List objectives, tasks, or artifacts targeted in this iteration along with owners.

| Objective / Task | Assigned To |
| --- | --- |
| `Implement Use Case: <Name> (Basic + Alternate flows)` | `<Owner>` |
| `Complete <Artifact>` | `<Owner>` |
| `Detail <Use Case>` | `<Owner>` |
| `Execute regression suite` | `<Owner>` |
| `Prepare next-iteration plan` | `<Owner>` |

## Notes

- Highlight risks, dependencies, or open questions influencing the iteration.
- Reference the formal `Iteration Plan` for comprehensive scope, estimates, and evaluation criteria when available.

## Agent Notes

- Keep milestone names deterministic so other agents can parse them easily.
- Log dependency notes adjacent to the objective they affect.
- Verify the Automation Outputs entry is satisfied before signaling completion.
- Keep milestone names deterministic for automated parsing.
- Document dependencies adjacent to the related objective.
