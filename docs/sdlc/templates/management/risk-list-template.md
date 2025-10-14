# Risk List Template

## Purpose

Maintain a prioritized list of project risks, their status, and mitigation actions across the lifecycle.

## Ownership & Collaboration

- Document Owner: Project Manager
- Contributor Roles: Requirements Reviewer, Test Architect, Deployment Manager
- Automation Inputs: Risk workshop output, mitigation status
- Automation Outputs: `risk-list.md` sorted by exposure


## Usage Instructions

- Update at least once per iteration, or when new risks emerge.
- Align risk IDs across documents (`R-###`).
- Include residual risk assessment after mitigation.


## Table Structure

| Risk ID | Description | Impact | Likelihood | Exposure | Mitigation Strategy | Owner | Status | Residual Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Concise risk summary. | High | Medium | HxM=High | Planned mitigation steps. | Responsible person/agent. | Open | Updated after mitigation. |

## Status Values

- `Open`: Identified, mitigation pending.
- `Mitigating`: Mitigation in progress.
- `Resolved`: No longer a risk (explain why in notes).
- `Accepted`: Risk tolerated with rationale.


## Agent Notes

- Quantify impact and likelihood using agreed scales (e.g., High/Medium/Low or numeric).
- Reference related tasks, decisions, or tests with relative links.
- Review during iteration planning and status assessments to ensure visibility.
- Verify the Automation Outputs entry is satisfied before signaling completion.
