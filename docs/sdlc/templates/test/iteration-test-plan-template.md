# Iteration Test Plan Template

## Purpose

Detail the testing scope, approach, and logistics for a specific iteration within Construction or Transition.

## Ownership & Collaboration

- Document Owner: Test Engineer
- Contributor Roles: Test Architect, Implementer
- Automation Inputs: Iteration scope, build availability, data refresh plan
- Automation Outputs: `iteration-<id>-test-plan.md` covering sections 1–11


## Completion Checklist

- Iteration objectives and acceptance criteria captured
- Test cases mapped to implemented stories/use cases
- Environment, data, and resource needs scheduled


## Document Sections

1. **Iteration Overview**
   - Provide iteration ID, dates, objectives, and primary features.
2. **Test Scope**
   - Enumerate features, use cases, or components under test this iteration.
3. **Test Approach**
   - Outline planned test types (functional, regression, exploratory, etc.).
4. **Test Cases and Suites**
   - Reference detailed test cases or automation suites with links.
5. **Environment and Data**
   - Specify environments, configurations, and data refresh requirements.
6. **Roles and Schedule**
   - Assign responsibilities, execution windows, and handoffs.
7. **Entry Criteria**
   - Define prerequisites (code freeze, build availability, defect thresholds).
8. **Exit Criteria**
   - State completion conditions (pass rate, defect severity thresholds).
9. **Risk and Contingency Plan**
   - Identify iteration-specific risks and fallback strategies.
10. **Reporting**
    - Describe reporting cadence, dashboards, and stakeholders to inform.
11. **Open Issues**
    - Track pending items or blockers.


## Agent Notes

- Keep plan lightweight but actionable; cross-check with iteration plan to avoid scope drift.
- Coordinate with Build/Integration plan for environment scheduling.
- Update status daily during execution and feed into iteration assessment.
- Verify the Automation Outputs entry is satisfied before signaling completion.
