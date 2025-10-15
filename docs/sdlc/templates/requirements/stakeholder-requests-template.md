# Stakeholder Requests Log Template

## Purpose

Track stakeholder needs, requests, and decisions to maintain alignment and ensure traceability across disciplines.

## Ownership & Collaboration

- Document Owner: System Analyst
- Contributor Roles: Business Process Analyst, Project Manager
- Automation Inputs: Interview transcripts, support tickets, roadmap ideas
- Automation Outputs: `stakeholder-requests.csv` populated with normalized entries

## Usage Instructions

- Log requests as they arrive, tagging priority and status.
- Reference origin (meeting, email, etc.) and link to follow-up actions.
- Review the log at each iteration planning session to update disposition.

## Table Structure

| Request ID | Stakeholder | Description | Priority | Status | Linked Artifacts | Notes/Actions |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Example Stakeholder | Short summary of the request. | High | Proposed | `docs/...` | Follow-up owner/date. |

## Status Values

- `Proposed`: Logged, awaiting triage.
- `Accepted`: Approved and documented in vision/use cases.
- `Deferred`: Postponed to later phase or release.
- `Rejected`: Will not be implemented; rationale provided.
- `Completed`: Delivered and verified.

## Agent Notes

- Maintain consistent IDs for easy cross-referencing (`SR-###`).
- Update linked artifacts to include anchors or section references when possible.
- Surface unresolved high-priority requests during status reviews.
- Verify the Automation Outputs entry is satisfied before signaling completion.
