# Iteration Plan Template

## Purpose

Define objectives, scope, tasks, and evaluation criteria for a single iteration within the delivery lifecycle.

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: System Analyst, Implementer, Test Architect
- Automation Inputs: Prioritized backlog, team capacity, dependency map
- Automation Outputs: `iteration-<id>-plan.md` detailing scope and tasks

## Completion Checklist

- Iteration objectives align with phase goals and risk priorities
- Task breakdown supports parallel agent work with clear owners
- Evaluation criteria and planned measurements documented

## Document Sections

1. **Iteration Overview**
   - Iteration ID, dates, phase, and summary objectives.
2. **Goals and Evaluation Criteria**
   - Describe business and technical goals plus acceptance criteria.
3. **Scope of Work**
   - List features, use cases, or components targeted this iteration.
4. **Task Breakdown**
   - Provide table with task IDs, descriptions, owners, dependencies, and estimates.
5. **Milestones and Deliverables**
   - Identify intermediate checkpoints and expected outputs.
6. **Resource Allocation**
   - Outline team members/agents assigned, capacity, and special skills needed.
7. **Risks and Mitigations**
   - Highlight iteration-specific risks and contingency plans.
8. **Dependencies**
   - Note upstream/downstream dependencies, external teams, or third parties.
9. **Testing and Validation Plan**
   - Summarize planned tests referencing the Iteration Test Plan.
10. **Change Control**
    - State how scope changes will be assessed and approved during the iteration.
11. **Review and Retrospective Plan**
    - Schedule iteration review, demo, and retrospective sessions.

## Agent Notes

- Keep task estimates time-boxed to enable PLAN → ACT loops (e.g., single-file or small-module scope).
- Update plan mid-iteration only when approved via change control; log decisions in `docs/sdlc/artifacts/`.
- Sync with status assessment to report progress and impediments.
- Verify the Automation Outputs entry is satisfied before signaling completion.
